'use strict';

window.onload=function() 
{
	console.log("hello apstats.js");

	// get the apstats from our server which gets them from the router
	let target = new URL(document.URL);
	const path = target.origin + "/api/apstats" + target.search;

	console.log(`path=${path}`);

	const height = 200;
	const width = d3.select(".container").node().clientWidth - 50;

	let tx_packets_graph = new Graph(width, height,"tx_packets","#tx_packets");
	let tx_bytes_graph = new Graph(width, height, "tx_bytes","#tx_bytes");

	let rx_packets_graph = new Graph(width, height, "rx_packets","#rx_packets");
	let rx_bytes_graph = new Graph(width, height,"rx_bytes","#rx_bytes");

	let tx_rate_graph = new Graph(width, height, "tx_rate", "#tx_rate_graph");
	let rx_rate_graph = new Graph(width, height, "rx_rate", "#rx_rate_graph");

	d3.csv(path)
	.then(function(data) {
		console.log(data);

		// convert timestamp to JavaScript Date object; incoming timestamps are in seconds 
		// but Date wants milliseconds
		data.forEach(function(value,idx,arr) {
			arr[idx]["timestamp"] = new Date(Number(value["timestamp"])*1000)
		});

		tx_packets_graph.draw(data);
		tx_bytes_graph.draw(data);
		rx_packets_graph.draw(data);
		rx_bytes_graph.draw(data);

		tx_rate_graph.draw(data);
		rx_rate_graph.draw(data);
	})
	.catch( error => {
		console.warn(`path=${path} error=${error}`);
	});
}

