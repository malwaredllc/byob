import pytest
from hashlib import md5
from random import getrandbits
from datetime import datetime
from buildyourownbotnet import app, db, bcrypt
from buildyourownbotnet.core.dao import user_dao, session_dao, task_dao, payload_dao, file_dao
from buildyourownbotnet.models import User, Payload, Session, Task, ExfiltratedFile
from ..conftest import new_user, new_session

def test_get_user_sessions(new_user):
    """
    Given a user, 
    when session_dao.get_user_sessions is called,
    check that user sessions are returned from the database correctly.
    """
    # check for valid user
    assert len(session_dao.get_user_sessions(new_user.id)) == 0

    # check for invalid user
    assert len(session_dao.get_user_sessions(-1)) == 0
    
def test_get_user_sessions_new(new_session):
    """
    Given a user,
    when the session_dao.get_user_sessions_new is called,
    check the user's new sessions are fetched and their 'new' attribute is updated to false in the database.
    """
    # get session owner (user)
    user = user_dao.get_user(username=new_session.owner)
    assert user is not None

    # get users's new sessions and test 'new' attribute has been toggled to false
    new_user_sessions = session_dao.get_user_sessions_new(user.id)
    assert len(new_user_sessions) > 0
    assert all(s.new is False for s in user.sessions)

def test_handle_session(new_user):
    """
    Given a new user,
    when a new user is created via session_dao.handle_session function,
    then check the session metadata is stored in the database correctly. 
    """
    # add test session (without uid)
    uid = md5(bytes(getrandbits(10))).hexdigest()
    input_session_dict = {
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
			"owner": new_user.username,
    }
    try:
        output_session_dict = session_dao.handle_session(input_session_dict)
    except Exception as e:
        pytest.fail("dao.handle_session exception handling new session: " + str(e))

    # check server assigned uid
    assert 'uid' in output_session_dict
    uid = output_session_dict['uid'] 

    # run tests
    session = session_dao.get_session(uid)
    assert session.owner == new_user.username
    assert session.uid == uid
    assert session.online is True
    assert (datetime.utcnow() - session.joined).seconds <= 5
    assert (datetime.utcnow() - session.last_online).seconds <= 5
    assert session.public_ip == '1.2.3.4'
    assert session.local_ip == '192.1.1.168'
    assert session.mac_address == '00:0A:95:9D:68:16'
    assert session.username == 'test_user'
    assert session.administrator is True
    assert session.platform == 'linux2'
    assert session.device == 'test_device'
    assert session.architecture == 'x32'
    assert session.longitude == 0.00
    assert session.latitude == 0.00

    # add test session (with uid)
    uid = md5(bytes(getrandbits(10))).hexdigest()
    input_session_dict = {
			"uid": uid,
			"online": True,
			"joined": datetime.utcnow(),
			"last_online": datetime.utcnow(),
			"public_ip": '5.6.7.8',
			"local_ip": '192.1.1.168',
			"mac_address": '00:0A:95:9D:68:16',
			"username": 'test_user',
			"administrator": True,
			"platform": 'linux2',
			"device": 'test_device',
			"architecture": 'x32',
			"latitude": 0.00,
			"longitude": 0.00,
			"owner": new_user.username,
    }
    try:
        output_session_dict = session_dao.handle_session(input_session_dict)
    except Exception as e:
        pytest.fail("dao.handle_session exception handling existing session: " + str(e))

    # run tests
    session = session_dao.get_session(uid)
    assert session.owner == new_user.username
    assert session.uid == uid
    assert session.online is True
    assert (datetime.utcnow() - session.joined).seconds <= 5
    assert (datetime.utcnow() - session.last_online).seconds <= 5
    assert session.public_ip == '5.6.7.8'
    assert session.local_ip == '192.1.1.168'
    assert session.mac_address == '00:0A:95:9D:68:16'
    assert session.username == 'test_user'
    assert session.administrator is True
    assert session.platform == 'linux2'
    assert session.device == 'test_device'
    assert session.architecture == 'x32'
    assert session.longitude == 0.00
    assert session.latitude == 0.00
    
def test_handle_task(new_session):
    """
    Given a session,
    when the dao.handle_task method is called from a session,
    check the new task is issued a UID, an issued timestamp, 
    and the metadata is stored in the database correctly.
    """
    # 1. test new task
    input_task_dict = {
        "session": new_session.uid,
        "task": "whoami",
    }
    try:
        output_task_dict = task_dao.handle_task(input_task_dict)
    except Exception as e:
        pytest.fail("dao.handle_task exception handling new task: " + str(e))

    # run tests
    tasks = task_dao.get_session_tasks(new_session.uid)
    assert len(tasks) == 1
    task = task_dao.get_task(output_task_dict['uid'])   
    assert len(task.uid) == 32
    assert task.session == new_session.uid
    assert task.task == 'whoami'
    assert (datetime.utcnow() - task.issued).seconds <= 2
    
def test_handle_completed_task(new_session):
    """
    Given a session,
    when the dao.handle_task method is called for a completed task,
    ensure the existing task metadata is updated correctly in the database.
    """
    # issue test task
    input_task_dict = {
        "session": new_session.uid,
        "task": "whoami"
    }
    output_task_dict = task_dao.handle_task(input_task_dict)

    # complete test task
    output_task_dict['result'] = 'test_result'
    try:
        completed_task_dict = task_dao.handle_task(output_task_dict)
    except Exception as e:
        pytest.fail("dao.handle_task exception handling completed task: " + str(e))

    # run tests
    assert 'uid' in completed_task_dict
    task = task_dao.get_task(output_task_dict['uid'])
    assert task.result == 'test_result'
    assert task.completed is not None
    assert (datetime.utcnow() - task.completed).seconds <= 5

def test_handle_invalid_task():
    """
    Given a session,
    when the dao.handle_task method is called with an invalid task,
    check that there is no exception and it is handled gracefully.
    """
    try:
        invalid_task_dict = task_dao.handle_task('invalid task - not a dict')
    except Exception as e:
        pytest.fail("dao.handle_task exception handling invalid task: " + str(e))
    assert isinstance(invalid_task_dict, dict)
    assert 'result' in invalid_task_dict
    assert 'Error' in invalid_task_dict['result']
    
def test_update_session_status(new_session):
    """
    Given a session,
    when the dao.update_session_status is called,
    check that the 'online' attribute of session metadata is correctly updated in the database.
    """
    # toggle online/offline status
    prev_status = new_session.online
    new_status = False if new_session.online else True 
    session_dao.update_session_status(new_session.uid, new_status)

    # check if it was updated correctly
    session = session_dao.get_session(new_session.uid)
    assert session is not None
    assert session.online == new_status

def test_add_user_payload(new_user):
    """
    Given a user,
    when the payload_dao.add_user_payload method is called,
    check that the payload metadata is added to the database correctly.
    """
    try:
        payload = payload_dao.add_user_payload(new_user.id, 'test.py', 'nix', 'x32')
    except Exception as e:
        pytest.fail("payload_dao.add_user_payload returned exception: " + str(e))
    assert payload.owner == new_user.username
    assert payload.filename == 'test.py'
    assert payload.operating_system == 'nix'
    assert payload.architecture == 'x32'
    # cleanup
    Payload.query.delete()
    db.session.commit()

def test_get_user_payloads(new_user):
    """
    Given a user,
    when the payload_dao.get_user_payloads method is called,
    check that all user payload metadata are returned from the database correctly.
    """
    try:
        # add test payload
        new_payload = payload_dao.add_user_payload(new_user.id, 'test.py', 'nix', 'x32')
        payloads = payload_dao.get_user_payloads(new_user.id)
    except Exception as e:
        pytest.fail("payload_dao.get_user_payloads returned excpetion: " + str(e))
    assert len(payloads) != 0
    # cleanup
    Payload.query.delete()
    db.session.commit()
