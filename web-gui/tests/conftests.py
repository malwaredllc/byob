import uuid
import pytest
from datetime import datetime
from buildyourownbotnet import db, bcrypt
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

@pytest.fixture(scope='module')
def new_session(new_user):
    uid = str(uuid.uuid4())
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
    return session