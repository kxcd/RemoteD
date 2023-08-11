<?php declare(strict_types=1);

function open_db_rd():SQLite3|array{
	global $db_file;
	try{
		$db = new SQLite3($db_file,SQLITE3_OPEN_READONLY);
	}catch(Exception $e){
		$arr['message']="Unable to open database file '$db_file'.";
		$arr['status']=1;
		return $arr;
	}
	$db->busyTimeout(2000);
	if(!$db->querySingle('SELECT count(1) FROM users')){
		$arr['message']="Error accessing remoted database...";
		$arr['status']=1;
		return $arr;
	}
	return $db;
}

function logit(string $db_file, string $user_name, string $action, string $log_message):bool{
	try{
		$db = new SQLite3($db_file,SQLITE3_OPEN_READWRITE);
	}catch(Exception $e){
		error_log("Unable to open database file $db_file for read/write.",0);
		error_log($e->message,0);
		return false;
	}
	$ip=(isset($_SERVER['HTTP_X_FORWARDED_FOR']))?$_SERVER['HTTP_X_FORWARDED_FOR']:$_SERVER['REMOTE_ADDR'];
	$db->busyTimeout(2000);
	$stmt = $db->prepare('insert into logs(log_date,user_name,ip,user_agent,action,log_message) values(:log_date,:user_name,:ip,:user_agent,:action,:log_message)');
	$stmt->bindValue(':log_date', time(), SQLITE3_INTEGER);
	$stmt->bindValue(':user_name', $user_name, SQLITE3_TEXT);
	$stmt->bindValue(':ip', $ip, SQLITE3_TEXT);
	$stmt->bindValue(':user_agent', $_SERVER['HTTP_USER_AGENT'], SQLITE3_TEXT);
	$stmt->bindValue(':action', $action, SQLITE3_TEXT);
	// Replace newlines with spaces to make the DB logs look cleaner.
	$stmt->bindValue(':log_message', preg_replace('/\n/',' ',$log_message), SQLITE3_TEXT);
	$res=$stmt->execute();
	return true;
}
