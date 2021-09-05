//  keys in /api/lan/stats
//  bps,collisions,ibps,idrops,ierrors,imcasts,in,ipackets,noproto,obps,oerrors,omcasts,opackets,out,ts,timestamp

window.onload=function() 
{
	console.log("hello, world");

	let bps_graph = new Graph(1000,200,"bps","#graph1");
	let ibps_graph = new Graph(1000,200,"ibps","#graph2");
	let obps_graph = new Graph(1000,200,"obps","#graph3");

	let url = new URL(document.URL);
	const path = url.origin + "/api/lan";
	console.log(`path=${path}`);

	// XXX why did I put this code here?
//	d3.json(path)
//		.then(function(data) {
//			console.table(data["data"]);
//		})
//		.catch( error => { 
//			console.warn(`path=${path} error=${error}`);
//		});

	d3.csv("http://localhost:8888/api/lan")
	.then(function(data) {
		bps_graph.draw(data);
		ibps_graph.draw(data);
		obps_graph.draw(data);
	});

	setInterval( function() {
		d3.csv("http://localhost:8888/api/lan")
		.then(function(data) {
			bps_graph.update(data);
			ibps_graph.update(data);
			obps_graph.update(data);
		});
		}
		, 5000
	);

}

