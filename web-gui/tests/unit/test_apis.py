import pytest
from hashlib import md5
from datetime import datetime
from random import getrandbits
from buildyourownbotnet.server import SessionThread
from ..conftest import app_client, new_user, cleanup


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
    assert isinstance(res.json, dict)
    for key, val in session_dict.items():
        assert res.json.get(key) == val
    cleanup()
