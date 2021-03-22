import os
import pytest
import shutil

from hashlib import md5
from datetime import datetime
from random import getrandbits
from buildyourownbotnet.server import SessionThread
from buildyourownbotnet.models import Session
from ..conftest import app_client, new_user, login, cleanup


def test_api_payload_generate(app_client, new_user):
    """
    Given an authenticated user,
    when a POST request is sent to /api/payload/generate endpoint with valid parameters,
    check that the payload is generated correctly and metadata is stored in the database correctly.
    """
    login(app_client, new_user.username, 'test_password')
    res = app_client.post('/api/payload/generate', 
            data={'format': 'py'},
            follow_redirects=True, 
            headers = {"Content-Type":"application/x-www-form-urlencoded"}
    )
    assert res.status_code == 200
    user_dir = os.path.join('./buildyourownbotnet/output/', new_user.username)
    src_dir = os.path.join(user_dir, 'src')
    user_files = os.listdir(src_dir)

    # check if a new payload file has been created in the last 5 seconds
    for f in user_files:
        fpath = os.path.join(src_dir, f)
        ctime = datetime.fromtimestamp(os.stat(fpath).st_ctime)
        if (datetime.now() - ctime).seconds <= 10:
            break
    else:
        pytest.fail(f"No recently created payload found in {src_dir}")

    # clean up filesystem
    shutil.rmtree(user_dir)
