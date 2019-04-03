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
    import logging
    import subprocess

    # debugging
    logging.basicConfig(level=logging.DEBUG, handlers=[logging.StreamHandler()])
    logger = logging.getLogger(__name__)

    #urllib vomit
    if sys.version_info[0] > 2:
        from urllib.request import urlopen
        # for mainstream linux kernel we need to get opencv from the repo, else it must be compiled from source;
        # this, to prevent a segfault at runtime for resources loading cv2 package in python3
        if os.name != "nt":
            try:
                import apt
                aptcache = apt.Cache()
                if not aptcache['python3-opencv'].is_installed:
                    logger.error('Install python3-opencv before continuing:\n\n        sudo apt install python3-opencv\n')
                    sys.exit()
            except:
                #assuming then we're rhel based
                try:
                    import yum
                    yumapp = yum.YumBase()
                    rpmdb = yumapp.doPackageLists(patterns="python3-opencv")
                    if not rpmdb.installed:
                        logger.error('Install python3-opencv before continuing:\n\n        sudo yum install python3-opencv\n')
                        sys.exit()
                except:
                    logger.error('Unable to determine if python3-opencv is installed; continuing anyway.\n        If you get a cv2 import error, install python3-opencv')
    else:
        from urllib import urlopen

    # find pip
    try:
        pip_path = subprocess.check_output('where pip' if os.name == 'nt' else 'which pip', shell=True).strip().rstrip()
    except Exception as e:
        logger.debug("Error in pip package installer: {}".format(str(e)))

    # install pip if missing
    try:
        import pip
    except:
        if not bool('pip_path' in locals() and os.path.exists(pip_path)) and os.name != "nt":
            try:
                # NOTE: intrct -- I think this is a bad practice (instituting execution of arbitrary remote code we don't control).
                if os.getuid() != 0:
                    # intrct: added this exit because otherwise this just runs in an infinite loop; I still think it's a bad idea.
                    logger.error("pip is not installed or a module, so setup must run elevated (sudo)")
                    sys.exit()
                # intrct: added check for version for proper callout materials, and 
                # running as subprocess rather than internal due to potential early exits in remote code.
                if sys.version_info[0] > 2:
                    subprocess.check_call("""{} -c 'from urllib.request import urlopen; exec(urlopen("https://bootstrap.pypa.io/get-pip.py").read())'""".format(sys.executable), shell=True)
                else:
                    subprocess.check_call("""{} -c 'from urllib import urlopen; exec(urlopen("https://bootstrap.pypa.io/get-pip.py").read())'""".format(sys.executable), shell=True)
            except Exception as e:
                logger.debug("Error installing pip: {}".format(str(e)))

            # restart
            # intrct: I would like to point out a limitation that this only installs packages for the linked "python"
            #           and not the called version of python in the original runtime.
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
