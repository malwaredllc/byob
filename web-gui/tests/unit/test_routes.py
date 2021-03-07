import pytest
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

def test_login_invalid(app_client, new_user):
    """
    Given a new_user,
    when a POST request is sent to the /login route with invalid credentials,
    check that a 403 forbidden HTTP status is returned.
    """
    response = login(app_client, 'test_user', 'wrong_password')
    assert response.status_code == 403


