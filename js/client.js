window.onload=function() 
{
	console.log("hello client.js");

	const height = 200;
	const width = d3.select("#tx_packets.graph").node().clientWidth - 50;
	console.log(`width=${width}`);

	let tx_packets_graph = new Graph(width, height,"tx_packets","#tx_packets");

	const target = new URL(document.URL);
	const path = target.origin + "/api/wlan/analytics/client" + target.search;

	d3.csv(path)
	.then(function(data) {
		console.table(data);

		// convert timestamp to JavaScript Date object; incoming timestamps are in seconds 
		// but Date wants milliseconds
		data.forEach(function(value,idx,arr) {
			arr[idx]["timestamp"] = new Date(Number(value["timestamp"])*1000)
		});

		tx_packets_graph.draw(data);

	});

}

