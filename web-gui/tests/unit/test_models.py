
import pytest
from buildyourownbotnet.models import User

@pytest.fixture(scope='module')
def new_user():
    user = User(username='test_user', password='test_password')
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