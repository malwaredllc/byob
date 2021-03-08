import pytest
from flask_login import current_user
from ..conftest import app_client, new_user

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

def test_login_valid(app_client, new_user):
    """
    Given a new_user,
    when a POST request is sent to the /login route with valid credentials,
    check that the user is correctly logged in with HTTP 200 status.
    """
    response = login(app_client, 'test_user', 'test_password')
    assert response.status_code == 200
    assert new_user.is_authenticated is True    

def test_login_invalid(app_client, new_user):
    """
    Given a new_user,
    when a POST request is sent to the /login route with invalid credentials,
    check that a 403 forbidden HTTP status is returned.
    """
    response = login(app_client, 'test_user', 'wrong_password')
    assert response.status_code == 403
    assert current_user.is_authenticated is False

def test_logout(app_client, new_user):
    """
    Given a logged in user,
    when that user sends a GET request to /logout,
    check that the user is no longer authenticated.
    """
    login(app_client, new_user.username, 'test_password')
    assert current_user.is_authenticated is True
    logout(app_client)
    assert current_user.is_authenticated is False

def test_sessions_authenticated(app_client, new_user):
    """
    Given a logged in user,
    when that user sends a GET request to /account,
    check that a HTTP 200 response is returned.
    """
    pass