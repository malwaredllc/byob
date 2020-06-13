<?php
/*
	Sample Processing of Register form via ajax
	Page: extra-register.html
*/

# Response Data Array
$resp = array();

// Fields Submitted
$name       = $_POST["name"];
$phone      = $_POST["phone"];
$birthdate  = $_POST["birthdate"];
$username   = $_POST["username"];
$email      = $_POST["email"];
$password   = $_POST["password"];

// This array of data is returned for demo purpose, see assets/js/neon-register.js
$resp['submitted_data'] = $_POST;

echo json_encode($resp);