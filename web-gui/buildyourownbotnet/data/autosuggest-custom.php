<?php


$sample_text = 'By spite about do of do allow blush Additions in conveying or collected objection in Suffer few desire wonder her object hardly nearer Abroad no chatty others my silent an Fat way appear denote who wholly narrow gay settle Companions fat add insensible everything and friendship conviction themselves Theirs months ten had add narrow own Much did had call new drew that kept Limits expect wonder law she Now has you views woman noisy match money rooms To up remark it eldest length oh passed Off because yet mistake feeling has men Consulted disposing to moonlight ye extremity Engage piqued in on coming Started earnest brother believe an exposed so Me he believing daughters if forfeited at furniture Age again and stuff downs spoke Late hour new nay able fat each sell Nor themselves age introduced frequently use unsatiable devonshire get They why quit gay cold rose deal park One same they four did ask busy Reserved opinions fat him nay position Breakfast as zealously incommode do agreeable furniture One too nay led fanny allow plate He moonlight difficult engrossed an it sportsmen Interested has all devonshire difficulty gay assistance joy Unaffected at ye of compliment alteration to Place voice no arise along to Parlors waiting so against me no Wishing calling are warrant settled was luckily Express besides it present if at an opinion visitor Unpleasant astonished an diminution up partiality Noisy an their of meant Death means up civil do an offer wound of Called square an in afraid direct Resolution diminution conviction so mr at unpleasing simplicity no No it as breakfast up conveying earnestly immediate principle Him son disposed produced humoured overcame she bachelor improved Studied however out wishing but inhabit fortune windows';
$sample_text = explode(' ', strtolower($sample_text));

$query = $_GET['q'];

$resp = array(
);

$resp[] = array(
	"value" => ucfirst(implode(" ", array_slice($sample_text, array_rand($sample_text), 5))),
	"img" => "http://lorempixel.com/40/40/?" . mt_rand(1,999),
	"desc" => ucfirst(implode(" ", array_slice($sample_text, array_rand($sample_text), 10))),
	"tokens" => array($query, str_shuffle($query))
);


$resp[] = array(
	"value" => ucfirst(implode(" ", array_slice($sample_text, array_rand($sample_text), 5))),
	"img" => "http://lorempixel.com/40/40/?" . mt_rand(1,999),
	"desc" => ucfirst(implode(" ", array_slice($sample_text, array_rand($sample_text), 10))),
	"tokens" => array($query, str_shuffle($query))
);


$resp[] = array(
	"value" => ucfirst(implode(" ", array_slice($sample_text, array_rand($sample_text), 5))),
	"img" => "http://lorempixel.com/40/40/?" . mt_rand(1,999),
	"desc" => ucfirst(implode(" ", array_slice($sample_text, array_rand($sample_text), 10))),
	"tokens" => array($query, str_shuffle($query))
);


$resp[] = array(
	"value" => ucfirst(implode(" ", array_slice($sample_text, array_rand($sample_text), 5))),
	"img" => "http://lorempixel.com/40/40/?" . mt_rand(1,999),
	"desc" => ucfirst(implode(" ", array_slice($sample_text, array_rand($sample_text), 10))),
	"tokens" => array($query, str_shuffle($query))
);


$resp[] = array(
	"value" => ucfirst(implode(" ", array_slice($sample_text, array_rand($sample_text), 5))),
	"img" => "http://lorempixel.com/40/40/?" . mt_rand(1,999),
	"desc" => ucfirst(implode(" ", array_slice($sample_text, array_rand($sample_text), 10))),
	"tokens" => array($query, str_shuffle($query))
);

echo json_encode($resp);