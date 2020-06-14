from flask import Blueprint, render_template


errors = Blueprint('errors', __name__)


@errors.app_errorhandler(404)
def error_404(error):
	return render_template("404.html"), 404


@errors.app_errorhandler(403)
def error_403(error):
	return render_template("403.html"), 403


@errors.app_errorhandler(400)
def error_400(error):
	return render_template("400.html"), 400


@errors.app_errorhandler(500)
def error_500(error):
	return render_template("500.html"), 500