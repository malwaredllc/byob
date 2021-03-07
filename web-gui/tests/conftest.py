import pytest
from hashlib import md5
from random import getrandbits
from datetime import datetime
from flask import current_app
from buildyourownbotnet import db, bcrypt
from buildyourownbotnet.models import User, Payload, Session, Task, ExfiltratedFile

@pytest.fixture(scope='function')
def app_client():
	with current_app.test_client() as client:
		yield client
	cleanup()

@pytest.fixture(scope='function')
def new_user():
	test_username = 'test_user'
	user = User.query.filter_by(username=test_username).first()
	if not user:
		hashed_password = bcrypt.generate_password_hash('test_password').decode('utf-8')
		user = User(username=test_username, password=hashed_password)
		db.session.add(user)
		db.session.commit()
	yield user
	cleanup()

@pytest.fixture(scope='function')
def new_session(new_user):
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
	db.session.add(session)
	db.session.commit()
	yield session
	cleanup()

def cleanup():
    """
    Helper function for cleaning up database after tests.
    """
    User.query.delete()
    Session.query.delete()
    Task.query.delete()
    ExfiltratedFile.query.delete()
    db.session.commit()