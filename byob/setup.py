#!/usr/bin/python
# -*- coding: utf-8 -*-
# -*- coding: utf-8 -*-
'Setup (Build Your Own Botnet)'

def run():
    """ 
    Run the BYOB setup script

    """
    import os
    import sys
    import imp
    import urllib
    import logging
    import subprocess

    # debugging
    logging.basicConfig(level=logging.DEBUG, handler=logging.StreamHandler())
    __logger__ = logging.getLogger(__name__)

    # find requirements
    for __tree in os.walk('..'):
	if 'byob' not in __tree[0]:
	    continue
        elif 'requirements.txt' in __tree[2]:
            __requirements = os.path.join(__tree[0], 'requirements.txt')
            break
	else:
	    __logger__.debug('skipping {}...'.format(__tree[0]))

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

    # install requirements
    try:
        __pip_install__ = subprocess.Popen('{} install -r {}'.format(__pip_path, __requirements), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True)
        while True:
            if __pip_install__.poll():
                try:
                    __logger__.debug(__pip_install__.stdout.readline())
                except: pass
            else:
                break
    except Exception as e:
        __logger__.error(str(e))
        
        # if exception occurs, try installing each package individually
        for _ in open(__requirements, 'r').readlines():
            try:
                __pip_install__ = subprocess.Popen('{} install {}'.format(__pip_path, _), 0, None, subprocess.PIPE, subprocess.PIPE, subprocess.PIPE, shell=True)
                while True:
                    if __pip_install__.poll():
                        try:
                            __logger__.debug(__pip_install__.stdout.readline())
                        except: pass
                    else:
                        break
            except Exception as e:
                __logger__.error("Error installing package: {}".format(_))


if __name__ == '__main__':
    main()
