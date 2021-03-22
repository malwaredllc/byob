import os
import pytest
import shutil
from hashlib import md5
from random import getrandbits
from datetime import datetime
from buildyourownbotnet import create_app
from buildyourownbotnet.models import db, bcrypt, User, Payload, Session, Task, ExfiltratedFile

OUTPUT_DIR = os.path.abspath('buildyourownbotnet/output')

@pytest.fixture(scope='function')
def app_client():
	app = create_app(test=True)
	with app.app_context():
		with app.test_client() as client:
			yield client
		cleanup()

@pytest.fixture(scope='function')
def new_user():
	test_username = 'test_user'
	user = User.query.filter_by(username=test_username).first()

	# create user in database
	if not user:
		hashed_password = bcrypt.generate_password_hash('test_password').decode('utf-8')
		user = User(username=test_username, password=hashed_password)
		db.session.add(user)
		db.session.commit()

	# create user directory
	user_dir = os.path.join(OUTPUT_DIR, user.username)
	if not os.path.exists(user_dir):
		os.makedirs(user_dir)

	# create user src directory
	src_dir = os.path.join(user_dir, 'src')
	if not os.path.exists(src_dir):
		os.makedirs(src_dir)

	# create user exfiltrated files directory
	files_dir = os.path.join(user_dir, 'files')
	if not os.path.exists(files_dir):
		os.makedirs(files_dir)

	print(src_dir)
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
	# clean up database
	User.query.delete()
	Session.query.delete()
	Task.query.delete()
	Payload.query.delete()
	ExfiltratedFile.query.delete()
	db.session.commit()


def login(client, username, password):
    return client.post('/login', 
            data=dict(
                username=username,
                password=password
            ), 
            follow_redirects=True, 
            headers = {"Content-Type":"application/x-www-form-urlencoded"}
    )

def logout(client):
    return client.get('/logout', follow_redirects=True)