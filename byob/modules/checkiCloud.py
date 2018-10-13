#!/usr/bin/env python

import subprocess
import urllib2
from os.path import expanduser
import os
import sys

if sys.platform is 'darwin':
    response = urllib2.urlopen("https://github.com/mas-cli/mas/releases/download/v1.4.2/mas-cli.zip")
    data = response.read()
    homeDir = expanduser("~")
    if not os.path.isdir(homeDir + "/.tmp/"):
        os.makedirs(homeDir + "/.tmp/")
    with open(homeDir + '/.tmp/mas.zip', 'wb') as f:
        f.write(data)

    try:
        run_command = subprocess.check_output(
        "unzip -o {0} -d {1}".format(homeDir + "/.tmp/mas.zip", homeDir + "/.tmp/"), shell=True)
    except subprocess.CalledProcessError:
        pass

    try:
        run_command = subprocess.check_output(
        "xattr -r -d com.apple.quarantine {0}".format(homeDir + "/.tmp/mas"), shell=True)
    except subprocess.CalledProcessError:
        pass

    try:
        run_command = subprocess.check_output(
        "{0} account".format(homeDir + "/.tmp/mas"), shell=True)
        print(run_command)
    except subprocess.CalledProcessError:
        pass
else:
    pass
