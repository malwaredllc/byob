import os
import json
import string
import random
import requests

from threading import Thread

from buildyourownbotnet.core import database
from buildyourownbotnet import app

from flask import url_for
from flask_mail import Message

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'output')


def get_top_5_leaders():
	"""Get top 5 leaders to display on sidebar."""
	return database.get_leaders().items[:5]


def get_sessions_serialized(user_id):
	"""Return serialized list of sessions for a given user."""
	return [session.serialize() for session in database.get_sessions(user_id)]


def get_tasks_serialized(session_uid):
	"""Return serialized list of tasks for a given session."""
	tasks = database.get_tasks(session_uid)
	serialized_tasks = []
	for task in tasks:
		task = task.serialize()
		if task.get('result'):
			task['result'] = task['result'][:100]
		serialized_tasks.append(task)
	return serialized_tasks


def get_tasks_serialized_paginated(session_id, page=1):
	"""Return serialized list of tasks for a given session (paginated)."""
	tasks, pages = database.get_tasks_paginated(session_id, page=page)
	serialized_tasks = []
	for task in tasks:
		task = task.serialize()
		if task.get('result'):
			task['result'] = task['result'][:100]
		serialized_tasks.append(task)
	return serialized_tasks, pages
