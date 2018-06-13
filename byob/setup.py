#!/usr/bin/python
# -*- coding: utf-8 -*-
'Setup (Build Your Own Botnet)'

def main():
    """ 
    Run the BYOB setup script

    """
    import os
    import sys
    import imp
    import urllib
    import logging
    import getpass
    import subprocess

    # debugging
    logging.basicConfig(level=logging.DEBUG, handler=logging.StreamHandler())
    __logger__ = logging.getLogger(__name__)

    # find pip
    try:
        __pip_path = subprocess.check_output('where pip' if os.name == 'nt' else 'which pip', shell=True).strip().rstrip()
    except Exception as e:
        __logger__.debug("Error in pip package installer: {}".format(str(e)))

    # install pip if missing
    if not bool('__pip_path' in locals() and os.path.exists(__pip_path)):
        try:
            exec urllib.urlopen("https://bootstrap.pypa.io/get-pip.py").read() in globals()
        except Exception as e:
            __logger__.debug("Error installing pip: {}".format(str(e)))

        # restart
        os.execv(sys.executable, ['python'] + [os.path.abspath(sys.argv[0])] + sys.argv[1:])

    # find requirements
    for __tree in os.walk('..'):
        if 'byob' not in __tree[0]:
            continue
        elif 'requirements.txt' in __tree[2]:
            __requirements = os.path.join(__tree[0], 'requirements.txt')
            break

    # install requirements
    __sudo_passwd = getpass.getpass() if os.name == 'posix' else ''
    for i, _ in enumerate(open(__requirements, 'r').readlines()):
        try:
            print("Installing {}...".format(_.rstrip()))
            locals()['__pip_install_%d' % i] = subprocess.Popen('{} install {}'.format(__pip_path if os.name == 'nt' else 'sudo {}'.format(__pip_path), _.rstrip()), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True)
            if i == 0:
	        locals()['__pip_install_%d' % i].communicate(__sudo_passwd + '\n')
        except Exception as e:
            __logger__.error("Error installing package: {}".format(_))

    for x in xrange(20):
        if '__pip_install_%d' % x in locals():
            locals()['__pip_install_%d' % x].wait()

if __name__ == '__main__':
    main()
