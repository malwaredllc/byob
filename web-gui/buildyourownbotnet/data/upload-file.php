<?php

header('Content-Type: application/json');

$errors = mt_rand(0,100)%2==0; // Random response (Demo Purpose)


$resp = array(
);

# Normal Response Code
if(function_exists('http_response_code'))
	http_response_code(200);
		

# On Error
if($errors)
{
	if(function_exists('http_response_code'))
		http_response_code(400);
	
	$resp['error'] = "Couldn't upload file, reason: ~";
}

echo json_encode($resp);