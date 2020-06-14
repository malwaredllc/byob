<?php

$query = $_GET['q'];

$resp = array(
);

$resp[] = $query . strrev($query);
$resp[] = $query . " " . mt_rand(1,99);
$resp[] = $query . " " . mt_rand(1,99);
$resp[] = $query . " " . mt_rand(1,99);
$resp[] = $query . " " . mt_rand(1,99);
$resp[] = $query . " " . mt_rand(1,99);
$resp[] = $query . " " . str_shuffle($query);

echo json_encode($resp);