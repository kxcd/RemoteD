


function setHeight(data){
	if(!checkResponse(data))return;
	const heightElem = document.querySelector('p.height a');
	heightElem.innerHTML=data.result;
}

function getHeight(){
	const payload = new URLSearchParams('getblockcount');
	fetch('main.php',{method: "POST",body: payload})
	.then(res=>res.json())
	.then(data=>setHeight(data))
	//.then(data=>console.log(data))
	.catch(e=>console.log(e));
}


function addHeightTimer(){
	getHeight();
	// Timer in milliseconds.
	var x = setInterval(getHeight,10000);

}

function checkResponse(data){
	// The API did not respond in any meaningful way, the session probably died.
	if(data.id===undefined){
		location.replace('../');
		return false;
	// The API did respond, but the dashd is trying to tell us something went wrong.
	}else if(data.result===null){
		console.log(data.error);
		return false;
	}else return true;
}

function setBalances(data){
	if(!checkResponse(data))return;
	document.querySelector('p.balance span').innerHTML=data.result.mine.trusted;
	document.querySelector('p.balance span.cj').innerHTML=data.result.mine.coinjoin;
}


function getBalances(){
	const payload = new URLSearchParams('getbalances');
	fetch('main.php',{method: "POST",body: payload})
		.then(res=>res.json())
		.then(data=>setBalances(data))
		.catch(e=>console.log(e));
}

function addBalancesTimer(){
	getBalances();
	var x = setInterval(getBalances,10000);
}

function greetings(user_name){
	document.querySelector('p span').innerHTML=user_name;
}

// Kills it quicker than waiting on RPC call to return from dashd.
function areWeLoggedIn(){
	const payload = new URLSearchParams('dummy');
	fetch('main.php',{method: "POST",body: payload})
		.then(res=>res.json())
		.then(data=>{if(data.status!=0)location.replace('../');else greetings(data.user_name);})
		//.then(data=>{console.log(data);})
		.catch(e=>console.log(e));
}


function setTransactions(data){
	if(!checkResponse(data))return;
	// Assoc array of emoji entities, access with emojis['name'];
	const emojis={privatesend:'&#128373;',send:'&#128316;',receive:'&#128317;',mined:'&#9935;',unconfirmed:'&#10067;',ISLock:'&#x2705;',chainLocked:'&#128279;',mixingTX:'&#x267B;'};
	const tbody = document.querySelector('table.transactions tbody');
	tbody.innerHTML="";
	// Group transactions into an array.
	let transactions=new Map;
	data.result.slice().reverse().forEach(tx => {
		if(transactions.get(tx.txid)===undefined)
			transactions.set(tx.txid,{time:tx.time,amount:tx.amount,fee:tx.fee,address:tx.address,category:tx.category,confirmations:tx.confirmations,confirmations:tx.confirmations,chainlock:tx.chainlock});
		else{
			var tmp=transactions.get(tx.txid);
			tmp.amount+=tx.amount;
			tmp.fee??=tx.fee;
			tmp.time??=tx.time;
			tmp.category??=tx.category;
			tmp.confirmations??=tx.confirmations;
			tmp.chainlock??=tx.chainlock;
			transactions.set(tx.txid,tmp);
		}
		if(transactions.size===10)return;		// We have enough.
	});
	console.log(transactions);
	data.result.slice().reverse().forEach(tx => {
		//console.log(tx.confirmations);return;
		const tr = document.createElement('tr');
		const tdStatus = document.createElement('td');
		//console.log(tx.generated);
		if(tx.chainlock===true){
			tdStatus.innerHTML=emojis['chainLocked'];
			tdStatus.setAttribute('title','Chainlocked');
		}else if(tx.instantlock===true){
			tdStatus.innerHTML=emojis['ISLock'];
			tdStatus.setAttribute('title','InstantSend Locked');
		}else{
			tdStatus.innerHTML=emojis['unconfirmed'];
			tdStatus.setAttribute('title','Unconfirmed, '+tx.confirmations+' confirmations');
		}
		const tdDate = document.createElement('td');
		tdDate.innerText=new Date(tx.time*1000).toLocaleString();// .toISOString();
		const tdType = document.createElement('td');
		switch(tx.category){
			case 'generate':
				tdType.innerHTML=emojis['mined'];
				tdType.setAttribute('title','Mined');
				break;
			case 'immature':
				tdType.innerHTML=emojis['mined'];
				tdType.setAttribute('title','Mined, '+101-tx.confirmations+' confirmations until mature');
				break;
			case 'send':
				tdType.innerHTML=emojis['send'];
				tdType.setAttribute('title','Sent');
				break;
			case 'receive':
				tdType.innerHTML=emojis['receive'];
				tdType.setAttribute('title','Received');
				break;
			case 'coinjoin':
				tdType.innerHTML=emojis['privatesend'];
				tdType.setAttribute('title','PrivateSend');
				break;
			default:
				tdType.innerText=tx.category;
		}
		
		const tdAddr = document.createElement('td');
		const txLink = document.createElement('a');
		if(tx.address===undefined)
			txLink.innerText='OP_RETURN';
		else
			txLink.innerText=tx.address;
		txLink.setAttribute('href','https://chainz.cryptoid.info/dash/tx.dws?'+tx.txid+'.htm');
		tdAddr.append(txLink);
		const tdAmount = document.createElement('td');
		var amount=tx.amount;
		if(tx.category==='send'||tx.category==='coinjoin')
			amount+=tx.fee;
		tdAmount.innerText=amount.toFixed(8);
		if(amount<0)
			tdAmount.setAttribute('class','negative');
		if(amount>0)
			tdAmount.setAttribute('class','positive');
		tr.append(tdStatus,tdDate,tdType,tdAddr,tdAmount);
		tbody.append(tr);
	});
}


function getTransactions(){
	const payload = new URLSearchParams('listtransactions="*",400');

	fetch('main.php',{method: "POST",body: payload})
		.then(res=>res.json())
		.then(data=>setTransactions(data))
		.catch(e=>console.log(e));
}

function addTransactionsTimer(){
	getTransactions();
	var x = setInterval(getTransactions,50000);
}

// The transaction has been attempted to the sent, update the messages with a link to it or a reason why it failed.
function handleSendTXResponse(data){
	const messages=document.querySelector('p.messages');
//	console.log(data);
	if(data.status===0){
		messages.innerHTML+='<br>&#x2705; <a href="https://chainz.cryptoid.info/dash/tx.dws?'+data.message+'.htm">'+data.message+'</a>';
	}else{
		messages.innerHTML+='<br>&#10060; '+data.message;
	}
	document.querySelector('form#send').reset();
	getTransactions();
	return;
}


function updateSendSection(payload){
	var msg='';
	if(payload.get('privatesend'))
		msg+='PrivateSend: ';
	else
		msg+='Send: ';
	msg+=payload.get('amount')+' Dash to '+payload.get('address')+'.';
	document.querySelector('p.messages').innerHTML=msg;
}

function confirmSend(payload){
	document.querySelector('p.messages').innerHTML="";
	const ps=payload.get('privatesend');
	var msg='You are about to ';
	if(ps)
		msg+='PrivateSend ';
	else
		msg+='send ';
	msg+=payload.get('amount');
	msg+=' Dash to '+payload.get('address')+'.\nPlease confirm.';
	return window.confirm(msg);
}

function addSendFormEventListener(){
	let form = document.querySelector('form#send');
	form.addEventListener('submit',function(e){
		e.preventDefault();
		const payload = new URLSearchParams(new FormData(form));
		if(!confirmSend(payload)){
			document.querySelector('form#send').reset();
			return;
		}
		updateSendSection(payload);
		fetch('main.php',{method: "POST",body: payload})
				.then(res=>res.json())
				.then(data=>handleSendTXResponse(data))
				//.then(data=>console.log(data))
				.catch(e=>console.log(e));
	});
}

function toggleCJ(req){
	const payload = new URLSearchParams();
	if(req)
		payload.set('coinjoin','start');
	else
		payload.set('coinjoin','stop');
	fetch('main.php',{method: "POST",body: payload})
		.then(res=>res.json())
		//.then(data=>updateCoinJoinStatusTable(data))
		.then(data=>console.log(data))
		.catch(e=>console.log(e));
	fetchCoinJoinStatus();
}


function setCJRounds(num){
	if(num<2||num>16)return false;
	const payload = new URLSearchParams();
	payload.set('setcoinjoinrounds',num);
	fetch('main.php',{method: "POST",body: payload})
		.then(res=>res.json())
		.then(data=>console.log(data))
		.catch(e=>console.log(e));
	// The PrivateSend balance will change depending on the number of rounds we require, so update it too.
	getBalances();
	fetchCoinJoinStatus();
}



function updateCoinJoinStatusTable(data){
	if(!checkResponse(data))return;
	const cjTab = document.querySelector('table.coinjoin_status');
	cjTab.innerHTML="";
	const runningTr=document.createElement('tr');
	runningTr.innerHTML='<td>Running:</td>';
	if(data.result.running){
		runningTr.innerHTML+='<td title="Click to disable CoinJoin" onclick="toggleCJ(false);">&#x2705;</td>';
		const multisessionTr=document.createElement('tr');
		const multisessionStatus=(data.result.multisession)?'&#x2705;':'&#10060';
		multisessionTr.innerHTML='<td>Multi-sessions:</td><td title="Multi-sessions can only be enabled from dash.conf">'+multisessionStatus+'</td>';
		const maxsessionsTr=document.createElement('tr');
		maxsessionsTr.innerHTML='<td>Max sessions:</td><td>'+data.result.max_sessions+'</td>';
		const maxroundsTr=document.createElement('tr');
		var addRounds='';var subtractRounds='';
		if(data.result.max_rounds<16)
			var addRounds='<span title="Cick to increase rounds" style="cursor:pointer;" onclick="setCJRounds('+(data.result.max_rounds+1)+');"> &#10133;</span>';
		if(data.result.max_rounds>2)
			var subtractRounds='<span title="Cick to decrease rounds" style="cursor:pointer;" onclick="setCJRounds('+(data.result.max_rounds-1)+');">&#10134; </span>';
		maxroundsTr.innerHTML='<td>Max rounds:</td><td>'+subtractRounds+data.result.max_rounds+addRounds+'</td>';
		const maxamountTr=document.createElement('tr');
		maxamountTr.innerHTML='<td>Max amount:</td><td>'+data.result.max_amount+'</td>';
		const keysleftTr=document.createElement('tr');
		keysleftTr.innerHTML='<td>Keys left:</td><td>'+data.result.keys_left+'</td>';
		const numSessionsTr=document.createElement('tr');
		numSessionsTr.innerHTML='<td>Number of sessions:</td><td>'+data.result.sessions.length+'</td>';
		cjTab.append(runningTr,multisessionTr,maxsessionsTr,maxroundsTr,maxamountTr,keysleftTr,numSessionsTr);
	}else{
		runningTr.innerHTML+='<td title="Click to enable CoinJoin" onclick="toggleCJ(true);">&#10060;</td>';
		cjTab.append(runningTr);
	}
}



function fetchCoinJoinStatus(){
	const payload = new URLSearchParams('getcoinjoininfo');
	fetch('main.php',{method: "POST",body: payload})
		.then(res=>res.json())
		.then(data=>updateCoinJoinStatusTable(data))
		.catch(e=>console.log(e));
}



function addCoinJoinStatusTimer(){
	fetchCoinJoinStatus();
	var x = setInterval(fetchCoinJoinStatus,100000);
}


function handleGetNewAddressResponse(data){
	if(data.error)return;
	const addressElem = document.querySelector('pre');
//	console.log(data);
	addressElem.innerText=data.result;
}


function addGetNewAddressListener(){
	let form = document.querySelector('form#getnewaddress');
	form.addEventListener('submit',function(e){
		e.preventDefault();
		const payload = new URLSearchParams(new FormData(form));
		payload.set('getnewaddress','');
		fetch('main.php',{method: "POST",body: payload})
				.then(res=>res.json())
				.then(data=>handleGetNewAddressResponse(data))
				.catch(e=>console.log(e));
	});
}


function addPowerButtonEventListener(){
	const power=document.querySelector('div.power img');
	power.addEventListener('click',function(e){
		const payload=new URLSearchParams('stop');
		fetch('main.php',{method:"POST",body: payload})
			.then(res=>res.json())
			.then(data=>console.log(data))
			.catch(e=>console.log(e));
	});
}

// Animate the camera to show the flash when mouse is pointing at it.
function addCameraSwitcherEventListener(){
	document.querySelector('div.camera').addEventListener('mouseenter',()=>{document.querySelector('div.camera').innerHTML='&#128248;'});
	document.querySelector('div.camera').addEventListener('mouseout',()=>{document.querySelector('div.camera').innerHTML='&#128247;'});
}

function init(){
	areWeLoggedIn();
	addHeightTimer();
	addBalancesTimer();
	addTransactionsTimer();
	addSendFormEventListener();
	addCoinJoinStatusTimer();
	addGetNewAddressListener();
	addPowerButtonEventListener();
	addCameraSwitcherEventListener();
}


/*
**	Main entry.
*/

if (document.readyState === 'loading') {
	// Loading hasn't finished yet.
	document.addEventListener('DOMContentLoaded', init);
} else {
	// `DOMContentLoaded` has already fired.
	init();
}
