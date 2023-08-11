async function hash(string) {
	const utf8 = new TextEncoder().encode(string);
	const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray
		.map((bytes) => bytes.toString(16).padStart(2, '0'))
		.join('');
	return hashHex;
}

function updateLoginPage(data){
	if(data.status===0){
		location.replace('main');
	}else{
		document.querySelector('p#login_messages').innerHTML=data.message;
		document.querySelector('form').reset();
	}
}

function addFormEventListener(){
	let form = document.querySelector('form');
	form.addEventListener('submit',function(e){
		e.preventDefault();
		const payload = new URLSearchParams(new FormData(form));
		password=payload.get('login');
		//console.log('password: '+password);
		(async () => {
			let i=1337;		// Do it elite number of times.
			let hashedPW=password;
			while(i--){
				hashedPW=await hash(hashedPW);
			}
			return hashedPW;})
			().then(pwHash=>{
				payload.set('login',pwHash);
				//console.log('hash: '+pwHash);
				fetch('remoted.php',{method: "POST",body: payload})
					.then(res=>res.json())
					.then(data=>updateLoginPage(data))
					.catch(e=>console.log(e));
			});
	});
}


function init(){
	addFormEventListener();
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
