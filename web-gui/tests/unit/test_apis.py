import pytest
from hashlib import md5
from datetime import datetime
from random import getrandbits
from buildyourownbotnet.server import SessionThread
from buildyourownbotnet.models import Session
from ..conftest import app_client, new_user, login, cleanup


def test_api_session_new(app_client, new_user):
    """
    Given a user,
    when a POST request is sent to /api/session/new endpoint with valid session parameters,
    check that the session metadata is correctly stored in the database and the metadata is returned as JSON.
    """
    uid = md5(bytes(getrandbits(10))).hexdigest()
    session_dict = {
			"id": 1,
			"online": True,
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
    res = app_client.post('/api/session/new', json=session_dict)
    assert res.status_code == 200

    session_metadata = res.json
    assert isinstance(session_metadata, dict)
    for key, val in session_dict.items():
        assert session_metadata.get(key) == val
    cleanup()

def test_api_session_remove(app_client, new_user, new_session):
    """
    Given a user and a session,
    when a POST request is sent to /api/session/remove with a valid session UID,
    check the session metadata is correctly removed from the database.
    """
    login(app_client, new_user.username, 'test_password')
    res = app_client.post('/api/session/remove', 
            data={'session_uid': new_session.uid}, 
            follow_redirects=True, 
            headers = {"Content-Type":"application/x-www-form-urlencoded"}
    )
    assert res.status_code == 200
    assert Session.query.get(new_session.uid) is None

def test_api_session_remove_invalid(app_client, new_user, new_session):
    """
    Given a user and a session,
    when a POST request is sent to /api/session/remove with invalid/missing session UID,
    check the session metadata is correctly removed from the database.
    """
    login(app_client, new_user.username, 'test_password')

    # invalid uid
    res = app_client.post('/api/session/remove', 
            data={'session_uid': '123'}, 
            follow_redirects=True, 
            headers = {"Content-Type":"application/x-www-form-urlencoded"}
    )
    assert res.status_code == 200

def test_api_session_remove_unauthenticated(app_client, new_user, new_session):
    """
    Given an unauthenticated user and a session,
    when a POST request is sent to /api/session/remove, 
    check that a HTTP 403 forbidden status is returned and the session is not removed.
    """
    res = app_client.post('/api/session/remove', 
            data={'session_uid': new_session.uid}, 
            follow_redirects=True, 
            headers = {"Content-Type":"application/x-www-form-urlencoded"}
    )
    assert res.status_code == 403
    assert Session.query.get(new_session.uid) is not None


def test_api_session_poll(app_client, new_user, new_session):
    """
    Given an authenticated user with at least 1 session,
    when a GET request is sent to /api/session/poll,
    check that any new sessions' metadata is returned in JSON format, 
    and that the sessions are marked as no longer being new in the database.
    """
    login(app_client, new_user.username, 'test_password')

    # check valid response
    res = app_client.get("/api/session/poll")
    assert res.status_code == 200

    # check correct data type returned with correct number of new sessions
    sessions_list = res.json
    assert isinstance(sessions_list, list)
    assert len(sessions_list) == 1

    # check session metadata is accurate
    session_metadata = sessions_list[0]
    for key, val in session_metadata.items():
        assert session_metadata.get(key) == val
    
    # check subsequent polls don't return the same old session
    res = app_client.get("/api/session/poll")
    assert res.status_code == 200 
    
    # check correct data type returned with correct number of new sessions
    sessions_list = res.json
    assert isinstance(sessions_list, list)
    assert len(sessions_list) == 0

