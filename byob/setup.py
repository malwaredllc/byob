#!/usr/bin/python
# -*- coding: utf-8 -*-
from __future__ import print_function
'Setup (Build Your Own Botnet)'

def main():
    """
    Run the BYOB setup script

    """
    import os
    import sys
    import urllib
    import logging
    import subprocess

    # debugging
    logging.basicConfig(level=logging.DEBUG)
    logger = logging.getLogger(__name__)

    # find pip
    try:
        pip_path = subprocess.check_output('where pip' if os.name == 'nt' else 'which pip', shell=True).strip().rstrip()
    except Exception as e:
        logger.debug("Error in pip package installer: {}".format(str(e)))

    # install pip if missing
    if not bool('pip_path' in locals() and os.path.exists(pip_path)) and os.name != "nt":
        try:
            # NOTE: intrct -- I think this is a bad practice (instituting execution of arbitrary remote code we don't control).
            exec(urllib.urlopen("https://bootstrap.pypa.io/get-pip.py").read(), globals())
        except Exception as e:
            logger.debug("Error installing pip: {}".format(str(e)))

        # restart
        os.execv(sys.executable, ['python'] + [os.path.abspath(sys.argv[0])] + sys.argv[1:])

    # find requirements
    for tree in os.walk('..'):
        if 'byob' not in tree[0]:
            continue
        elif 'requirements.txt' in tree[2]:
            requirements = os.path.join(tree[0], 'requirements.txt')
            break

    # install requirements
    try:
        print("Installing requirements.txt")
        if os.name != "nt":
            locals()['pip_install_1'] = subprocess.Popen('sudo --prompt=" Please enter sudo password (to install python dependencies): " {} -m pip install -r {}'.format(sys.executable, requirements), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True)
        else:
            locals()['pip_install_1'] = subprocess.Popen('{} -m pip install -r {}'.format(sys.executable, requirements), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True)           
        for line in locals()['pip_install_1'].stdout:
            print(line.decode())
            sys.stdout.flush()
    except Exception as e:
        logger.error("Error installing requirements: {}".format(e))

if __name__ == '__main__':
    main()
