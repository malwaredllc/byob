import os
import pytest
import shutil
import base64
from datetime import datetime
from buildyourownbotnet.core.dao import file_dao
from ..conftest import app_client, new_user, login, cleanup


def test_api_file_add(app_client, new_user, new_session):
    """
    Given an authenticated user and a session,
    when a POST request is sent to /api/file/add endpoint with valid parameters,
    check that the file metadata is stored in the database correctly.
    """
    login(app_client, new_user.username, 'test_password')
    with open('./buildyourownbotnet/assets/images/crying-cat.jpg', 'rb') as fp:
        raw_img_data = fp.read()
    b64_data = base64.b64encode(raw_img_data)
    b64_session = base64.b64encode(new_session.public_ip.encode())
    file_metadata = {
                'data': b64_data,
                'type': 'jpg',
                'owner': new_user.username,
                'module': 'upload',
                'session': b64_session,
                'filename': 'crying-cat.jpg'
    }
    res = app_client.post('/api/file/add', data = file_metadata)
    
    # check request was successful
    assert res.status_code == 200

    # check file metadata was added to database correctly
    user_files = file_dao.get_user_files(new_user.id)
    assert len(user_files) == 1
    user_file = user_files[0]
    assert user_file.filename == file_metadata['filename']
    assert user_file.module == file_metadata['module']
    assert user_file.owner == file_metadata['owner']
    assert user_file.session == base64.b64decode(file_metadata['session'])
    assert (datetime.utcnow() - user_file.created).seconds <= 30

    # check file was stored in filesystem correctly
    user_dir = os.path.join('./buildyourownbotnet/output/', new_user.username)
    files_dir = os.path.join(user_dir, 'files')
    user_files = os.listdir(files_dir)
    assert len(user_files) != 0
    assert file_metadata['filename'] in user_files

    # cleanup
    os.remove(os.path.join(files_dir, file_metadata['filename']))
