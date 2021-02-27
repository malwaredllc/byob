import pytest
import uuid
from datetime import datetime
from buildyourownbotnet import app, db, bcrypt
from buildyourownbotnet.core import database
from buildyourownbotnet.models import User, Session, Task
from ..conftests import new_user, new_session

def test_handle_session(new_user):
    """
    Given a new user,
    when a new user is created via database.handle_session function,
    then check the session metadata is stored in the database correctly. 
    """
    # add test session
    uid = str(uuid.uuid4())
    input_session_dict = {
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
			"owner": new_user.username,
    }
    output_session_dict = database.handle_session(input_session_dict)

    # run tests
    session = Session.query.filter_by(uid=uid)
    assert len(session.all()) == 1
    assert session.first().owner == new_user.username
    
    # clean up
    session.delete()
    db.session.commit()

def test_handle_task(new_session):
    pass