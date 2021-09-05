'use strict';

function client_list(data)
{
	console.log(`client_list=${data}`);
	console.table(data['data']);
}

window.onload=function() 
{
	console.log("hello wifi.js");

	// get the analytics from our server which gets them from the router
	let target = new URL(document.URL);

	const json_path = target.origin + "/api/status/wlan/clients" + target.search;
	console.log(`json_path=${json_path}`);

	d3.json(json_path)
		.then(client_list)
		.catch( error => {
			console.warn(`json_path=${json_path} error=${error}`);
		});

}


