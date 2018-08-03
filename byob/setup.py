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
    logger = logging.getLogger(__name__)

    # find pip
    try:
        pip_path = subprocess.check_output('where pip' if os.name == 'nt' else 'which pip', shell=True).strip().rstrip()
    except Exception as e:
        logger.debug("Error in pip package installer: {}".format(str(e)))

    # install pip if missing
    if not bool('pip_path' in locals() and os.path.exists(pip_path)):
        try:
            exec urllib.urlopen("https://bootstrap.pypa.io/get-pip.py").read() in globals()
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
    sudo_passwd = getpass.getpass('Enter your sudo password (to install python dependencies) :') if os.name == 'posix' else ''
    for i, _ in enumerate(open(requirements, 'r').readlines()):
        try:
            print("Installing {}...".format(_.rstrip()))
            locals()['pip_install_%d' % i] = subprocess.Popen('{} install {}'.format(pip_path if os.name == 'nt' else 'sudo {}'.format(pip_path), _.rstrip()), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True)
            if i == 0:
	        locals()['pip_install_%d' % i].communicate(sudo_passwd + '\n')
        except Exception as e:
            logger.error("Error installing package: {}".format(_))

    for x in xrange(20):
        if 'pip_install_%d' % x in locals():
            locals()['pip_install_%d' % x].wait()

if __name__ == '__main__':
    main()
