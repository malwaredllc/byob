import pytest
import uuid
from datetime import datetime
from buildyourownbotnet import app, db, bcrypt
from buildyourownbotnet.core import database
from buildyourownbotnet.models import User, Session


@pytest.fixture(scope='module')
def new_user():
    test_username = 'test_user'
    user = User.query.filter_by(username=test_username).first()
    if not user:
        hashed_password = bcrypt.generate_password_hash('test_password').decode('utf-8')
        user = User(username=test_username, password=hashed_password)
        db.session.add(user)
        db.session.commit()
    return user

def test_new_session(new_user):
    """
    Given a new user,
    when a new user is created and a new session is added for that usesr,
    then check the session is associated with that only that user correctly.
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
