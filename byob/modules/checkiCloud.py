#!/usr/bin/env python
import os
import urllib
import subprocess
import util
packages = []
platforms = ['darwin']
command = True
usage = 'icloud'

description = """
Check for logged in iCloud accounts on macOS
"""

def run():
    """
    Check for logged in iCloud account on macOS
    """
    filename, _ = urllib.urlretrieve("https://github.com/mas-cli/mas/releases/download/v1.4.2/mas-cli.zip")
    util.unzip(filename)
    mas = os.path.join(os.path.dirname(filename), 'mas')
    subprocess.check_output('xattr -r -d com.apple.quarantine {}'.format(mas).split(' '))
    os.chmod(mas, 755)
    result= subprocess.check_output([mas, "account"]).rstrip()
    util.delete(mas)
    return result
