<?php

echo '<p>This is a sample page ...</p>';

die('Requested: ' . (isset($_GET['request']) ? htmlspecialchars($_GET['request']) : 'null'));
