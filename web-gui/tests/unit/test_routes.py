import os
import pytest
from flask_login import current_user
from buildyourownbotnet import c2
from buildyourownbotnet.core.dao import user_dao
from buildyourownbotnet.server import SessionThread
from buildyourownbotnet.models import db, bcrypt, User
from ..conftest import app_client, new_user, login, logout

# Main routes

def test_home(app_client):
    """
    Given an app instance,
    when a GET request is sent to /,
    check that a HTTP 200 response is returned.
    """
    response = app_client.get('/')
    assert response.status_code == 200

def test_docs(app_client):
    """
    Given an app instance,
    when a GET request is sent to /docs,
    check that a HTTP 200 response is returned.
    """
    response = app_client.get('/docs')
    assert response.status_code == 200

def test_guide(app_client):
    """
    Given an app instance,
    when a GET request is sent to /guide,
    check that a HTTP 200 response is returned.
    """
    response = app_client.get('/guide')
    assert response.status_code == 200

def test_faq(app_client):
    """
    Given an app instance,
    when a GET request is sent to /faq,
    check that a HTTP 200 response is returned.
    """
    response = app_client.get('/faq')
    assert response.status_code == 200

# Authentication

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
    when that user sends a GET request to /sessions,
    check that a HTTP 200 response is returned.
    """
    login(app_client, new_user.username, 'test_password')
    response = app_client.get('/sessions')
    assert response.status_code == 200

def test_sessions_not_authenticated(app_client, new_user):
    """
    Given an unauthenticated user (not logged in),
    when that user sends a GET request to /sessions,
    check that a HTTP 302 response is returned, redirecting the user to the login page.
    """
    response = app_client.get('/sessions')
    assert response.status_code == 302
    assert '/login' in response.location

def test_payloads_authenticated(app_client, new_user):
    """
    Given an authenticated user,
    when that user sends a GET request to /payloads,
    check that a HTTP 200 response is returned.
    """ 
    login(app_client, new_user.username, 'test_password')
    response = app_client.get('/payloads')
    assert response.status_code == 200

def test_sessions_not_authenticated(app_client, new_user):
    """
    Given an unauthenticated user (not logged in),
    when that user sends a GET request to /payloads,
    check that a HTTP 302 response is returned, redirecting the user to the login page.
    """
    response = app_client.get('/payloads')
    assert response.status_code == 302
    assert '/login' in response.location

def test_files_authenticated(app_client, new_user):
    """
    Given an authenticated user,
    when that user sends a GET request to /files,
    check that a HTTP 200 response is returned.
    """ 
    login(app_client, new_user.username, 'test_password')
    response = app_client.get('/files')
    assert response.status_code == 200

def test_files_not_authenticated(app_client, new_user):
    """
    Given an unauthenticated user (not logged in),
    when that user sends a GET request to /files,
    check that a HTTP 302 response is returned, redirecting the user to the login page.
    """
    response = app_client.get('/files')
    assert response.status_code == 302
    assert '/login' in response.location

def test_tasks_authenticated(app_client, new_user):
    """
    Given an authenticated user,
    when that user sends a GET request to /tasks,
    check that a HTTP 200 response is returned.
    """ 
    login(app_client, new_user.username, 'test_password')
    response = app_client.get('/tasks')
    assert response.status_code == 200

def test_tasks_not_authenticated(app_client, new_user):
    """
    Given an unauthenticated user (not logged in),
    when that user sends a GET request to /tasks,
    check that a HTTP 302 response is returned, redirecting the user to the login page.
    """
    response = app_client.get('/tasks')
    assert response.status_code == 302
    assert '/login' in response.location  

def test_shell_not_authenticated(app_client, new_user, new_session):
    """
    Given an authenticated user and a valid session,
    when that user sends a GET request to /shell,
    check that a HTTP 302 response is returned, redirecting the user to the login page.
    """ 
    response = app_client.get('/shell', data={'session_uid': new_session.uid})
    assert response.status_code == 302
    assert '/login' in response.location

def test_shell_authenticated_valid_session(app_client, new_user, new_session):
    """
    Given an authenticated user and a valid session,
    when that user sends a GET request to /shell,
    check that a HTTP 200 response is returned.
    """ 
    login(app_client, new_user.username, 'test_password')
    
    # create dummy session
    dummy_session = SessionThread(id=1, c2=c2, connection=None)
    dummy_session.info = dict(new_session.serialize())
    c2.sessions[new_user.username] = {new_session.uid: dummy_session}
    
    # run test
    response = app_client.get('/shell', query_string={'session_uid': new_session.uid})
    assert response.status_code == 200

def test_shell_authenticated_invalid_session(app_client, new_user):
    """
    Given an unauthenticated user (not logged in),
    when that user sends a GET request to /shell,
    check that a HTTP 302 response is returned, redirecting the user to the sessions page.
    """
    login(app_client, new_user.username, 'test_password')

     # no session uid
    response = app_client.get('/shell')
    assert response.status_code == 302
    assert '/sessions' in response.location  

    # invalid session uid
    response = app_client.get('/shell', query_string={'session_uid': 'invalid'})
    assert response.status_code == 302
    assert '/sessions' in response.location  

def test_shell_owner_no_sessions(app_client, new_user):
    """
    Given an authenticated user,
    when a GET request is sent to /shell but the user has no sessions,
    check that a HTTP 302 response is returned and they are redirected back to the /sessions page.
    """
    login(app_client, new_user.username, 'test_password')
    c2.sessions[new_user.username] =  {}
    response = app_client.get('/shell', query_string={'session_uid': 'does_not_matter'})
    assert response.status_code == 302
    assert '/sessions' in response.location  

def test_shell_wrong_session_owner(app_client, new_user, new_session):
    """
    Given an authenticated user and session,
    when a GET request is sent to /shell but the session uid belongs to a different user,
    check that a HTTP 302 response is returned and they are redirected back to the /sessions page.
    """
    login(app_client, new_user.username, 'test_password') 
    
    # create dummy session with different owner
    dummy_session = SessionThread(id=1, c2=c2, connection=None)
    dummy_session.info = dict(new_session.serialize())
    dummy_session.info['owner'] = 'someone_else'
    c2.sessions[new_user.username] = {new_session.uid: dummy_session}
       
    # run test
    response = app_client.get('/shell', query_string={'session_uid': new_session.uid})
    assert response.status_code == 302

def test_account(app_client, new_user):
    """
    Given an authenticated user,
    when a GET request is sent to /account,
    check that a HTTP 200 response is returned and they are directed to the account page.
    """
    login(app_client, new_user.username, 'test_password') 
    response = app_client.get('/account')
    assert response.status_code == 200

def test_register(app_client):
    """
    Given an application instance,
    when a POST request is sent to /register with valid form data,
    check that the user is added to the database correctly,
    the user directories are created in the filesystem properly,
    and the username is added to the c2 session hashmap properly.
    """
 
    test_username = 'test_user'
    test_password = 'test_password'
    try:
        res = app_client.post('/register', 
                data = {
                    'username': test_username,
                    'password': test_password,
                    'confirm_password': test_password 
                },
                follow_redirects=True, 
                headers = {"Content-Type":"application/x-www-form-urlencoded"})
    except Exception as e:
        pytest.fail("user_dao.add_user returned exception: " + str(e))

    # check user was created in database correctly
    user = user_dao.get_user(username=test_username)
    assert user.username == test_username
    assert bcrypt.check_password_hash(user.password, test_password)

    # check user directory created in filesystem
    user_dir = os.path.join('./buildyourownbotnet/output/', test_username)
    assert os.path.isdir(user_dir)

    # check user added to c2 session hashmap
    assert test_username in c2.sessions

    # clean up
    User.query.delete()
    db.session.commit()
