<?php

// get the huge tree JSON data for the demo
// #10 levels deep, #2 folders + #2 files each ... ~ #4K items :)

$path = dirname(__FILE__);

require_once("$path/Tree.php");

// huge tree data class :) just to get demo tree data
// it's a simple return based on the $parentId to know where we are
// and if it's a valid branch (also limiting to the #10 deep levels)

class HugeTree extends Tree {
    /*
     * $parentId will be the path to the folder.
     */

    public function branch($parentId = null) {
        $branch = array();
        $path = explode('.', $parentId);
        $type = array_shift($path);
        if ((!$type || ($type == 'folder')) && (count($path) <= 10)) {
            $path = implode('.', $path);
            for ($i = 0; $i < 2; $i++) {
                $branch["folder.{$path}.$i"] = "folder-$i";
            }
            for ($i = 0; $i < 2; $i++) {
                $branch["file.{$path}.$i"] = "file-$i";
            }
        }
        return $branch;
    }

    /*
     * $itemId will be the path to the file/folder.
     */

    public function itemProps($itemId) {
        $path = explode('.', $itemId);
        $type = array_shift($path);
        switch ($type) {
            case 'folder':
                return array_merge(parent::itemProps($itemId), array(
                            'inode' => true,
                            'icon' => 'folder'
                        ));
            case 'file':
                return array_merge(parent::itemProps($itemId), array(
                            'inode' => false,
                            'icon' => 'file'
                        ));
        }
        return parent::itemProps($itemId);
    }

}

$hugeTree = new HugeTree();

// what branch was requested?
$branch = isset($_GET['branch']) ? $_GET['branch'] : null;

//$hugeTree->json($branch);

// this will load the entire tree (comment above and uncomment this)
$hugeTree->json($branch, true);

// note: for large and complex tree structures
// probably the best way to do things is to return the first 2-3 levels
// starting from the requested branch instead of returning the entire tree
