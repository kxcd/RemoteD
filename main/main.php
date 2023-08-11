<?php declare(strict_types=1);
require_once '../functions.php';

session_start();
if(!isset($_SESSION['user_name'])){
	error_log("Killing RemoteD",0);
	if($_POST){
		header('Content-Type: application/json');
		echo json_encode(array('message'=>'You are being logged out.','status'=>1));
	}else{
		header('Location: ../logout');
	}
	die;
}
// So we are logged in.

$db_file='../'.$_SESSION['db_file'];
$user_name=$_SESSION['user_name'];
$rpcuser=$_SESSION['rpcuser'];
$rpcpass=$_SESSION['rpcpass'];
$rpcport=$_SESSION['rpcport'];

function dashRPC(string $method,?array $data):string{
	global $rpcuser;
	global $rpcpass;
	global $rpcport;

	$url="http://127.0.0.1:{$rpcport}/";

	if($data)
		$data=json_encode(array("id"=>"mnowatch","method"=>$method,"params"=>$data));
	else
		$data=json_encode(array("id"=>"mnowatch","method"=>$method));

	$ch=curl_init($url);
	//curl_setopt($ch, CURLOPT_HEADER, 1);			// For debugging only
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);	//do not output directly, use variable
	curl_setopt($ch, CURLOPT_USERPWD, "$rpcuser:$rpcpass");
	
	curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

	$res=curl_exec($ch);
	if(is_bool($res)&&!$res){
		$err='The dashd appears to be down!';
		error_log("$err",0);
		return $err;
	}
	return $res;
}

// Return true or false if the address is a valid Dash network address.
function validateAddress(string $address):bool{
	$res=dashRPC('validateaddress',array($address));
	$res=json_decode($res);
	return $res->result->isvalid;
}

function hasFunds(float $amount, bool $privatesend):bool{
	$res=dashRPC('getbalances',null);
	$res=json_decode($res);
	if($privatesend)
		$balance=$res->result->mine->coinjoin;
	else
		$balance=$res->result->mine->trusted;
	return ($amount<$balance);
}


function sendDash(string $address, float $amount, bool $privatesend):string{
	error_log("Send Dash!",0);
	global $user_name;
	global $db_file;
	$ps=($privatesend)?'on':'off';
	// Need to prevent php from writing the number in scientific notation.
	logit($db_file,$user_name,'sendDash',"Address: $address, Amount: ".rtrim(sprintf('%.8F',$amount),'0').", PS: $ps");
	if($privatesend)
		$data=['address'=>$address,'amount'=>$amount,'use_cj'=>true];
	else
		$data=['address'=>$address,'amount'=>$amount];
	$res=dashRPC('sendtoaddress',$data);
	error_log("$res",0);
	logit($db_file,$user_name,'sendDashResult',$res);
	return $res;
}

function validateSendDash(string $address, float $amount, bool $privatesend):array{
	$arr=[];
	$arr['status']=1;	// Indicate an error state.
	if($amount<0.000006){
		$arr['message']="The amount $amount is too small to send, ie dust, try a larger amount.";
	}else if($amount>100){
		$arr['message']="The amount $amount is too large to send.";
	}else if($amount!==round($amount,8)){
		$arr['message']="The amount $amount has too many decimal places.";
	}else if(strlen($address)!==34){
		$arr['message']="The provided address '$address' is not the the correct length (34) characters long.";
	}else if(strlen($address)!==strlen(preg_replace("/[^a-zA-Z0-9]+/", "",$address))){
		$arr['message']="The provided address '$address' contains some invalid characters.";
	}else if(!validateAddress($address)){
		$arr['message']="The provided address '$address' is not a valid Dash address.";
	}else if(!hasFunds($amount,$privatesend)){
		$send=($privatesend)?'PrivateSend':'regular';
		$arr['message']="This wallet does not have the required funds to send this ".$send." transaction.";
	}else{
		// We won!  All validations have passed, so do the actual send!
		$res=sendDash($address,$amount,$privatesend);
		// Now check to see if dashd reported any errors and if not, grab the transaction hash.
		$res=json_decode($res);
		if($res->error){
			$arr['message']=$res->error->message;
		}else{
			$arr['message']=$res->result;
			$arr['status']=0;
		}
	}
	return $arr;
}

// Helper function for dealing incoming POST data.
function convertStringToTypedArray(?string $in):?array{
	if(!isset($in)||$in==="")
		return null;
	$arr=explode(',',$in);
	foreach($arr as $val){
		$converted = json_decode($val);
		$ret[] = $converted ?? $val;
	}
	return $ret;
}

if(!$_POST){
	$arr=['message'=>'Send me a POST!','status'=>1];
}else{
	if(isset($_POST['address']) && isset($_POST['amount'])){
		// We have an attempt to send some Dash!
		$arr=validateSendDash($_POST['address'], (float)$_POST['amount'], isset($_POST['privatesend']));
	}else{
		foreach($_POST as $req=>$data){
			switch($req){
				case "getblockcount":
				case "getbalances":
				case "listtransactions":
				case "getcoinjoininfo":
				case "getnetworkinfo":
				case "getblockchaininfo":
				case "getmempoolinfo":
				case "getnewaddress":
				case "coinjoin":
				case "setcoinjoinrounds":
				case "stop":
					$arr=dashRPC($req,convertStringToTypedArray($data));
					break;
				case "dummy":
					$arr=array('status'=>0,'user_name'=>$user_name);	// Yes, you are logged in.
					break;
				default:
					$arr=['message'=>"Request $req is not handled.",'status'=>1];
			}
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
