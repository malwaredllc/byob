
import pytest
from buildyourownbotnet import app, db, bcrypt
from buildyourownbotnet.models import User, Session, Payload

@pytest.fixture(scope='module')
def new_user():
    test_username = 'test_user'
    hashed_password = bcrypt.generate_password_hash('test_password').decode('utf-8')
    user = User(username=test_username, password=hashed_password)
    return user

def test_new_user_with_fixture(new_user):
    """
    Given a new user,
    when a new user is created, 
    then check the username and hashed password are defined correctly.
    """
    assert new_user.username == 'test_user'
    assert new_user.password != 'test_password'

def test_new_session():
    """
    Given a new user,
    when a new user is created and a new session is added for that usesr,
    then check the session is associated with that only that user correctly.
    """
    pass