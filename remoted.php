<?php declare(strict_types=1);
error_log("Loading RemoteD",0);

require_once 'functions.php';

$db_file='.remoted.db';


// This function will establish the session and store some environment variables that will be used frequently.
function establishSession(string $user_name):array{
	global $db_file;
	$arr=readDashConf();
	//  true if there was an error with reading the dash.conf file
	if(array_key_exists('status',$arr))
		return $arr;
	session_start();

	$_SESSION['db_file']=$db_file;
	$_SESSION['user_name']=$user_name;		// The logged in user name.
	$_SESSION['rpcuser']=$arr['rpcuser'];	// The dashd rpcuser.
	$_SESSION['rpcpass']=$arr['rpcpass'];
	$_SESSION['rpcport']=$arr['rpcport'];
	
	// Log the fact we have a successful login.
	error_log("User $user_name has logged in.",0);
	$res=logit($db_file,$user_name,'login','Success');
	
	return array('message'=>'Session created successfully!','status'=>0);
}

function login(SQLite3 &$db, string $password_hash):array{
	$arr=[];
	// Restrict the user data to just alphanumeric.
	$password_hash=preg_replace("/[^a-zA-Z0-9]+/", "",$password_hash);
	// This will fail in case we are being hacked or otherwise brute forced.
	if(strlen($password_hash)!=64){
		$arr['message']="password hash is of incorrect length";
		$arr['status']=1;
		return $arr;
	}

	//  password_hash is the Primary Key of the database, so it will be UNIQUE, also, the user_name has a
	//  unique key constraint on it too, so both are unique.
	$stmt = $db->prepare('SELECT user_name, password_hash FROM users where password_hash=:password_hash');
	$stmt->bindValue(':password_hash', $password_hash, SQLITE3_TEXT);
	$row = $stmt->execute()->fetchArray();

	// If the password is not found in the DB (they are unique), then error out.
	if(!$row){
		$arr=['message'=>'The password supplied was incorrect.','status'=>1];
	}else{
		$arr=establishSession($row['user_name']);
	}
	return $arr;
}

function readDashConf():array{
	$file_name='.dash.conf';
	$contents=file($file_name);
	if(!$contents){
		$arr['message']="Could not open $file_name for reading.";
		$arr['status']=1;
		return $arr;
	}
	//print_r($contents);
	foreach($contents as $line){
		$arr=explode('=',$line);
		if($arr[0]==='rpcuser')
			$rpcuser=trim($arr[1]);
		if($arr[0]==='rpcpassword')
			$rpcpass=trim($arr[1]);
		if($arr[0]==='rpcport')
			$rpcport=trim($arr[1]);
	}
	if(!$rpcuser || !$rpcpass){
		$arr['message']="Could not determine the username/password for dashd!";
		$arr['status']=1;
		return $arr;
	}
	return array("rpcuser"=>$rpcuser,"rpcpass"=>$rpcpass,"rpcport"=>$rpcport??9998);
}




if(!$_POST){
	$arr=['message'=>'Send me a POST!','status'=>1];
}else{
	foreach($_POST as $req=>$data){
		switch($req){
			case "login":
				$db=open_db_rd();
				if(is_array($db))
					$arr=$db;
				else
					$arr=login($db, $data);
				break;
			default:
				$arr=['message'=>"Request $req is not handled.",'status'=>1];
		}
	}
}

if(!isset($arr))$arr=['message'=>'There was an error.','status'=>1];
header('Content-Type: application/json');

// I am testing to see if this var is already json, if it is, just send, otherwise encode to json first.
if(!is_array($arr)){
	json_decode($arr);
	if(json_last_error()===JSON_ERROR_NONE)
		echo $arr;
	else
		echo json_encode($arr);
}else echo json_encode($arr);