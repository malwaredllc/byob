<?php

require('json-rpc.php');

if (function_exists('xdebug_disable')) {
    xdebug_disable();
}



class MysqlDemo {
  public function query($query) {
    $link = new mysqli('localhost', 'user', 'password', 'db_name');
    if (mysqli_connect_errno()) {
        throw new Exception("MySQL Connection: " . mysqli_connect_error());
    }
    if (preg_match("/create|drop/", $query)) {
      throw new Exception("Sorry you are not allowed to execute '" .
                          $query . "'");
    }
    if (!preg_match("/^\s*(select.*from *test|insert *into *test.*|delete *from *test|update *test)\s*$/", $query)) {
      throw new Exception("Sorry you can't execute '" . $query .
                          "' you are only allowed to select, insert, delete " .
                          "or update 'test' table");
    }
    if ($res = $link->query($query)) {
      if ($res === true) {
        return true;
      }
      if ($res->num_rows > 0) {
        while ($row = $res->fetch_array(MYSQLI_NUM)) {
          $result[] = $row;
        }
        return $result;
      } else {
        return array();
      }
    } else {
      throw new Exception("MySQL Error: " . mysqli_error($link));
    }
  }
}

handle_json_rpc(new MysqlDemo());

?>
