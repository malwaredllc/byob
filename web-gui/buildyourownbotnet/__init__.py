import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from buildyourownbotnet.config import Config

# initialize app and configure global objects
app = Flask(__name__,
            static_url_path='/assets', 
            static_folder='assets',
            template_folder='templates')

# configure app
app.config.from_object(Config)

# database
db = SQLAlchemy(app)

# hashing for passwords for user security
bcrypt = Bcrypt(app)

# login manager
login_manager = LoginManager(app)
login_manager.login_view = 'users.login'
login_manager.login_message_category = 'info'


# import models and create tables in database
from buildyourownbotnet import models
db.create_all()

# import server and client generator
from buildyourownbotnet import client, server

# import blueprints
from buildyourownbotnet.main.routes import main
from buildyourownbotnet.users.routes import users
from buildyourownbotnet.api.files.routes import files
from buildyourownbotnet.api.session.routes import session
from buildyourownbotnet.api.payload.routes import payload
from buildyourownbotnet.errors.handlers import errors

# register blueprints
app.register_blueprint(main)
app.register_blueprint(users)
app.register_blueprint(files)
app.register_blueprint(session)
app.register_blueprint(payload)
app.register_blueprint(errors)
