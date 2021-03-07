import os

class ProdConfig:
	SECRET_KEY = os.environ.get('BYOB_APP_SECRET_KEY') or os.urandom(24)
	SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI') or 'sqlite:///database.db'
	SQLALCHEMY_TRACK_MODIFICATIONS = False

class TestConfig:
	DEBUG = True
	SECRET_KEY = 'helloworld'
	SQLALCHEMY_DATABASE_URI = 'sqlite:///test.db'
	SQLALCHEMY_TRACK_MODIFICATIONS = False
	WTF_CSRF_ENABLED = False