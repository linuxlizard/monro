'use strict';

function poll_client(url, macaddr) 
{
//	d3.json
}

function csv_path()
{
	const target = new URL(document.URL);
	return target.origin + "/api/wlan/analytics/client" + target.search;
}

function json_path()
{
	const target = new URL(document.URL);
	return target.origin + "/api/status/wlan/analytics?router=" + target.searchParams.get('router');
}

function find_client(r_json, macaddr)
{
	// find client 'macaddr' in /status/wlan/analytics
	console.log(`find_client macaddr=${macaddr}`);

	r_json.clients.forEach(function(value,idx,arr) {
		console.log(`found client=${value.macaddr}`)
	});
}

window.onload=function() 
{
	console.log("hello client.js");

	const height = 200;
	const width = d3.select("#tx_packets.graph").node().clientWidth - 50;
	console.log(`width=${width}`);

	let tx_packets_graph = new GraphDate(width, height,"tx_packets","#tx_packets");
	let tx_bytes_graph = new GraphDate(width, height,"tx_bytes","#tx_bytes");

	let rx_packets_graph = new GraphDate(width, height,"rx_packets","#rx_packets");
	let rx_bytes_graph = new GraphDate(width, height,"rx_bytes","#rx_bytes");
	let rx_rssi_graph = new GraphDate(width, height,"rx_rssi","#rx_rssi");

	let retries = new GraphDate(width, height,"retries","#retries");

	let tx_rate_graph = new GraphDate(width, height,"tx_rate","#tx_rate");
	let rx_rate_graph = new GraphDate(width, height,"rx_rate","#rx_rate");

	d3.csv(csv_path())
	.then(function(data) {
//		console.table(data);

		// convert timestamp to JavaScript Date object; incoming timestamps are in seconds 
		// but Date wants milliseconds
		data.forEach(function(value,idx,arr) {
			arr[idx]["timestamp"] = new Date(Number(value["timestamp"])*1000)
		});
		console.log(data[0]["timestamp"]);

		tx_packets_graph.draw(data);
		tx_bytes_graph.draw(data);

		rx_packets_graph.draw(data);
		rx_bytes_graph.draw(data);
		rx_rssi_graph.draw(data);

		retries.draw(data);

		tx_rate_graph.draw(data);
		rx_rate_graph.draw(data);
	});

	let poll_analytics = (function(poll_url) {
		const url = poll_url;
		return function() { return poll_client(url) };
	});

	console.log(`json_path=${json_path()}`);
	d3.json(json_path()).
		then( function(j_analytics) {
//			console.table(j_analytics.data.clients);
			const target = new URL(document.URL);
			const macaddr = target.searchParams.get("macaddr");
			find_client(j_analytics['data'], macaddr);
		}
	);

//	poll_analytics()();
//	setInterval( function() { 
}

