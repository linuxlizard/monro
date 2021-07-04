window.onload=function() 
{
	console.log("hello apstats.js");

	// get the apstats from our server which gets them from the router
	let target = new URL(document.URL);
	const path = target.origin + "/api/apstats" + target.search;

	console.log(`path=${path}`);

	d3.csv(path)
	.then(function(data) {
		console.log(data);
	});
}

