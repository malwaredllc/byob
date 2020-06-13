<?php
/*
	Sample Processing of Forgot password form via ajax
	Page: extra-register.html
*/

# Response Data Array
$resp = array();


// Fields Submitted
$username = $_POST["username"];
$password = $_POST["password"];


// This array of data is returned for demo purpose, see assets/js/neon-forgotpassword.js
$resp['submitted_data'] = $_POST;


// Login success or invalid login data [success|invalid]
// Your code will decide if username and password are correct
$login_status = 'invalid';

if($username == 'demo' && $password == 'demo')
{
	$login_status = 'success';
}

$resp['login_status'] = $login_status;


// Login Success URL
if($login_status == 'success')
{
	// If you validate the user you may set the user cookies/sessions here
		#setcookie("logged_in", "user_id");
		#$_SESSION["logged_user"] = "user_id";
	
	// Set the redirect url after successful login
	$resp['redirect_url'] = '';
}


echo json_encode($resp);