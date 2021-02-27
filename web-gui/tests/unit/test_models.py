
import pytest
from hashlib import md5
from random import getrandbits
from datetime import datetime
from buildyourownbotnet import db, bcrypt
from buildyourownbotnet.models import User, Session, Task, Payload, ExfiltratedFile
from ..conftests import new_user, new_session


def test_new_user():
    """
    Given a new user,
    when a new user is created, 
    then check the username and hashed password are defined correctly.
    """
    test_username = 'test_user'
    hashed_password = bcrypt.generate_password_hash('test_password').decode('utf-8')
    new_user = User(id=1, username=test_username, password=hashed_password)
    assert new_user.username == 'test_user'
    assert new_user.password != 'test_password'

def test_new_session(new_user):
    """
    Given a new user,
    when a new session is created, 
    then check the session metadata is stored in the database correctly.
    """
    uid = md5(bytes(getrandbits(10))).hexdigest()
    session_dict = {
            "id": 1,
			"uid": uid,
			"online": True,
			"joined": datetime.utcnow(),
			"last_online": datetime.utcnow(),
			"public_ip": '1.2.3.4',
			"local_ip": '192.1.1.168',
			"mac_address": '00:0A:95:9D:68:16',
			"username": 'test_user',
			"administrator": True,
			"platform": 'linux2',
			"device": 'test_device',
			"architecture": 'x32',
			"latitude": 0.00,
			"longitude": 0.00,
			"owner": new_user.username
    }
    session = Session(**session_dict)
    assert isinstance(session, Session)
    assert session.id == 1
    assert session.uid == uid
    assert session.owner == new_user.username

def test_new_payload(new_user):
    """
    Given a new user,
    when a new payload is created, 
    then check the payload metadata is stored in the database correctly.
    """
    payload = Payload(id=1,
                      filename='test', 
                      operating_system='linux2',
                      architecture='x32',
                      owner=new_user.username)
    assert isinstance(payload, Payload)
    assert payload.id == 1
    assert payload.filename == 'test'
    assert payload.operating_system == 'linux2'
    assert payload.architecture == 'x32'
    assert payload.owner == new_user.username

def test_new_exfiltrated_file(new_session):
    """
    Given a session,
    when a new file is exfiltrated, 
    then check the exfiltrated file metadata is stored in the database correctly.
    """
    exfiltrated_file = ExfiltratedFile(id=1,
                                       filename='test.txt',
                                       session=new_session.uid,
                                       module='portscanner',
                                       owner=new_session.owner)
    assert isinstance(exfiltrated_file, ExfiltratedFile)
    assert exfiltrated_file.id == 1
    assert exfiltrated_file.filename == 'test.txt'
    assert exfiltrated_file.session == new_session.uid
    assert exfiltrated_file.module == 'portscanner'
    assert exfiltrated_file.owner == new_session.owner

def test_new_task(new_session):
    """
    Given a session,
    when a new task is created for that session, 
    then check the task metadata is stored in the database correctly.
    """
    task = Task(id=1,
                session=new_session.uid, 
                task='whoami', 
                issued=datetime.utcnow())
    assert isinstance(task, Task)
    assert task.id == 1
    assert task.session == new_session.uid
    assert task.task == 'whoami'
    assert (datetime.utcnow() - task.issued).seconds <= 1
    assert task.result is None
    assert task.completed is None

