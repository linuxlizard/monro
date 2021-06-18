"use strict";

const router = "172.16.253.1";

window.onload=function() 
{
	console.log("hello, world");

	let poe_graph = new Graph(1000,200,"poe_current","#poe1");

//	const hostname = "172.16.253.1"
//	const username = "admin"
//	const password = "3wolfMOON"
//
//	let authHeaders = new Headers();
//	authHeaders.append("Authorization",
//		`Basic ${btoa(`${username}:${password}`)}`);
//
//	d3.json(`http://${hostname}/api/status/ethernet/0`, {method: "GET", headers: authHeaders, mode: 'cors'})
//	.then(function(data) {
////		poe_graph.draw(data);
//		console.log(`data=${data}`);
//	});

	const url = `/api/ethernet?router=${router}`;
	d3.json(url)
		.then(function(data) {
			console.log(`data=${data}`);
			console.table(data);
			const wan_port = data[0];

//			d3.select("#ethernet_table")
//				.select("tbody")
//				.selectAll("tr")
//				.selectAll(".poe_current")
//				.data(data);

			poe_graph.draw( Array(wan_port) );

//			const matrix = [
//			  [11975,  5871, 8916, 2868],
//			  [ 1951, 10048, 2060, 6171],
//			  [ 8010, 16145, 8090, 8045],
//			  [ 1013,   990,  940, 6907]
//			];

//			d3.select("body")
//			  .append("table")
//			  .selectAll("tr")
//			  .data(matrix)
//			  .join("tr")
//			  .selectAll("td")
////			  .data(d => d)
//			  .data( function(d) {
//			  		console.log(`d=${d}`);
//					return d;
//			  		}
//			  	)
//			  .join("td")
//			  	.text(d=>d);
		}
	);

	setInterval( function() {
		d3.json(url)
			.then(function(data) {

				const poe_current = (d) => d['poe_current'];

				// update the table
				d3.select("#ethernet_table")
					.select("tbody")
					.selectAll("tr")
					.data(data)
					.join("tr")
					.selectAll("td")
					.data( d => Object.values(d) )
					.join("td")
					.text(d=>d);

//				console.table(data);
				const wan_port = data[0];
				poe_graph.update( Array(wan_port) );
			});
		}
		, 1000
	);
}

