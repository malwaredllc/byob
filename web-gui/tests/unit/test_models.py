
import pytest
import uuid
from datetime import datetime
from buildyourownbotnet import db, bcrypt
from buildyourownbotnet.models import User, Session, Payload, ExfiltratedFile


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

def test_new_user():
    """
    Given a new user,
    when a new user is created, 
    then check the username and hashed password are defined correctly.
    """
    test_username = 'test_user'
    hashed_password = bcrypt.generate_password_hash('test_password').decode('utf-8')
    new_user = User(username=test_username, password=hashed_password)
    assert new_user.username == 'test_user'
    assert new_user.password != 'test_password'

def test_new_session(new_user):
    """
    Given a new user,
    when a new session is created, 
    then check the session metadata is stored in the database correctly.
    """
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
    payload = Payload(filename='test', 
                      operating_system='linux2',
                      architecture='x32',
                      owner=new_user.username)
    assert isinstance(payload, Payload)
    assert payload.filename == 'test'
    assert payload.operating_system == 'linux2'
    assert payload.architecture == 'x32'
    assert payload.owner == new_user.username

def test_new_exfiltrated_file(new_session):
    """
    Given a new user and a new session for that user,
    when a new file is exfiltrated, 
    then check the exfiltrated file metadata is stored in the database correctly.
    """
    exfiltrated_file = ExfiltratedFile(filename='test.txt',
                                       session=new_session.uid,
                                       module='portscanner',
                                       owner=new_session.owner)
    assert exfiltrated_file.filename == 'test.txt'
    assert exfiltrated_file.session == new_session.uid
    assert exfiltrated_file.module == 'portscanner'
    assert exfiltrated_file.owner == new_session.owner