<?php

error_reporting(E_ERROR);

// get the tree JSON data for the file system listing

$path = dirname(__FILE__);

require_once("$path/Tree.php");
require_once("$path/FsTree.php");

// we limit the access to "$path/tree"
$fsTree = new FsTree(new Fs("$path/tree"));

// what branch was requested?
$branch = isset($_GET['branch']) ? $_GET['branch'] : null;

// special case for 1k test from the demo (skip the 'sleep' thing and return faster)
if ((strpos($branch, 'a_new_File_ID') !== false) || (strpos($branch, 'a_new_Folder_ID') !== false)) {
    // burn your CPU not the server with the 1k entries ... ;))
    if (preg_match('@[0-9]+$@', $branch, $match) == 1) {
        if ((int) $match[0] > 20) {
            die('[]');
        }
    }
    sleep(1);
    die('[]');
}

if (strpos($branch, '..') !== false) {
    // path should not have a [..] inside ;-)
    $branch = 'undefined';
}

// a small delay so we can see the loading animation
// (comment it for faster return)
sleep(1);

// no cache so we can see the loading animation :)
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
header('Last-Modified: ' . gmdate('D, d M Y H:i:s') . ' GMT');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

// get the branch (1 level)
$fsTree->json($branch);

// this will get the entire tree (comment above and uncomment this)
//$fsTree->json($branch, true);
