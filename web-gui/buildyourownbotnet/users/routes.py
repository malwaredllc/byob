import os
import json
import requests
from flask import (
	Blueprint, flash, redirect, render_template, 
	request, url_for, send_from_directory
)
from flask_login import login_user, logout_user, current_user, login_required
from buildyourownbotnet import client, c2
from buildyourownbotnet.core.dao import user_dao
from buildyourownbotnet.users.forms import RegistrationForm, LoginForm, UpdateAccountForm, ResetPasswordForm
from buildyourownbotnet.models import db, bcrypt, User, Session


# Blueprint
users = Blueprint('users', __name__)

# Globals
OUTPUT_DIR = os.path.abspath('buildyourownbotnet/output')


# Routes
@users.route("/register", methods=["GET", "POST"])
def register():
	"""Register user"""

	form = RegistrationForm()

	if form.validate_on_submit():
		# only allow 1 user on locally hosted version
		if len(User.query.all()) == 0:
			# add user to database
			hashed_password = bcrypt.generate_password_hash(form.password.data).decode('utf-8')
			user = User(username=form.username.data, password=hashed_password)
			db.session.add(user)
			db.session.commit()

			# create user directory
			user_dir = os.path.join(OUTPUT_DIR, user.username)
			if not os.path.exists(user_dir):
				os.makedirs(user_dir)

			# create user src directory
			src_dir = os.path.join(user_dir, 'src')
			if not os.path.exists(src_dir):
				os.makedirs(src_dir)

			# create user exfiltrated files directory
			files_dir = os.path.join(user_dir, 'files')
			if not os.path.exists(files_dir):
				os.makedirs(files_dir)

			# initialize c2 session storage
			c2.sessions[user.username] = {}

			# notify user and redirect to login
			flash("You have successfully registered!", 'info')
			logout_user()
			return redirect(url_for('users.login'))
		else:
			flash("User already exists on this server.", 'danger')

	return render_template("register.html", form=form, title="Register")
	

@users.route("/login", methods=['GET', 'POST'])
def login():
	"""Log user in"""
	if current_user.is_authenticated:
		return redirect(url_for('main.sessions'))

	form = LoginForm()
	if form.validate_on_submit():
		user = user_dao.get_user(username=form.username.data)
		if user and bcrypt.check_password_hash(user.password, form.password.data):
			login_user(user)
			next_page = request.args.get('next')
			return redirect(next_page) if next_page else redirect(url_for('main.sessions'))
		flash("Invalid username/password.", 'danger')
	return render_template("login.html", form=form, title="Log In"), 403


@users.route("/account", methods=['GET','POST'])
@login_required
def account():
	"""Account configuration page."""
	form = ResetPasswordForm()
	if form.validate_on_submit():

		# update user's password in the database
		user = User.query.filter_by(username=current_user.username).first()
		hashed_password = bcrypt.generate_password_hash(form.password.data).decode('utf-8')
		user.password = hashed_password
		db.session.commit()
		flash("Your password has been updated.", "success")
		db.session.commit()
	return render_template("account.html", 
							title="Account",
							form=form)


@users.route('/logout')
def logout():
	"""Log out"""
	logout_user()
	return render_template("home.html")
