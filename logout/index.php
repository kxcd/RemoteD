<?php declare(strict_types=1);
require_once '../functions.php';
session_start();
if(isset($_SESSION['db_file']))
	logit('../'.$_SESSION['db_file'],$_SESSION['user_name'],'logout','logout');
session_unset();
session_destroy();
header('Location: ../');
