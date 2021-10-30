import json
from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import StringField, PasswordField, SubmitField, BooleanField, SelectField, TextAreaField
from wtforms.validators import DataRequired, Length, EqualTo, ValidationError

from buildyourownbotnet.models import User


class RegistrationForm(FlaskForm):
	username = StringField('Username',
							validators=[DataRequired(), Length(max=16)])
	password = PasswordField('Password',
							validators=[DataRequired(), Length(min=8)])
	confirm_password = PasswordField('Confirm Password',
							validators=[DataRequired(), Length(min=8), EqualTo('password')])
	submit = SubmitField('Sign Up')

	def validate_email(self, email):
		if User.query.filter_by(email=email.data).first():
			raise ValidationError("That email is taken. Please choose a different one.")

	def validate_username(self, username):
		if User.query.filter_by(username=username.data).first():
			raise ValidationError("That username is taken. Please choose a different one.")


class LoginForm(FlaskForm):
	username = StringField('Username',
							validators=[DataRequired(), Length(max=16)])
	password = PasswordField('Password',
							validators=[DataRequired(), Length(min=8)])
	submit = SubmitField('Log In')


class UpdateAccountForm(FlaskForm):
	picture = FileField('Update Profile Picture', 
						validators=[FileAllowed(['jpg','png'])])
	submit = SubmitField('Update')

class ResetPasswordForm(FlaskForm):
	password = PasswordField('New Password',
							validators=[DataRequired(), Length(min=8)])
	confirm_password = PasswordField('Confirm New Password',
							validators=[DataRequired(), Length(min=8), EqualTo('password')])
	submit = SubmitField('Reset Password')

