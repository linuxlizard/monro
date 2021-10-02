'use strict';

function get_radio_num(radio_name)
{
	const match = radio_name.match( /([0-9]+)$/g );
	console.log(`${radio_name} ${match}`);
	return match;
}

function csv_path(radio_num)
{
	const target = new URL(document.URL);

	return target.origin + "/api/wlan/analytics/radio?router=" + target.searchParams.get('router') + "&radio=" + radio_num.toString();
}

class BarChart 
{
	constructor(width, height, key, select) 
	{
		this.width = width;
		this.height = height;
		this.key = key;
		this.select = select;

		this.margin = {
			top: 10,
			right: 20,
			bottom: 50,
			left: 10 };

	}

	// https://observablehq.com/@d3/zoomable-bar-chart
	draw(data) {

		const yAxis = g => g
			.attr("transform", `translate(${this.margin.left},0)`)
			.call(d3.axisLeft(y))
			.call(g => g.select(".domain").remove())
//		console.log(`yAxis=${yAxis}`);

		const xAxis = g => g
			.attr("transform", `translate(0,${this.height - this.margin.bottom})`)
			.call(d3.axisBottom(x).tickSizeOuter(0))
//		console.log(`xAxis=${xAxis}`);
//
		const y = d3
			.scaleLog()
//			.scaleLinear()
			.domain([1, d3.max(data)])
//			.domain([0, d3.max(data)])
			.range([this.height - this.margin.bottom, this.margin.top])
			.nice()
			;
//		console.log(`y=${y}`);

		data.forEach( d => console.log(`${d} ${d+1} ${Math.log(d+1)} ${y(d+1)}`) );

//		console.log(`${y(0)}`);
//		console.log(`${y(1)}`);
//		console.log(`${y(2)}`);
//		console.log(`${y(3)}`);
//		console.log(`${y(4)}`);

		const x = d3.scaleBand()
			.domain([0,1,2,3,4,5,6,7,8,9,10,11])
			.range([this.margin.left, this.width - this.margin.right])
			.padding(0.1)
			;
//		console.log(`x=${x}`);
//		console.log(`${x(0)}`);
//		console.log(`${x(1)}`);
//		console.log(`${x(2)}`);
//		console.log(`${x(3)}`);
//		console.log(`${x(4)}`);

		this.wrapper = d3
			.select(this.select)
			.append("svg")
				.attr("width", this.width)
				.attr("height", this.height)
//		console.log(`wrapper=${this.wrapper}`);

		this.wrapper.append("g")
				.attr("class", "bars")
				.attr("fill", "steelblue")
			.selectAll("rect")
			.data(data)
			.join("rect")
				.attr("x", function(d,idx) { 
//						console.log(`x d=${d} idx=${idx} ${x(idx)}`);
						return x(idx);
						})
				.attr("y", function(d,idx) {
						console.log(`y d=${d} idx=${idx} ${y(d+1)}`);
						return y(d+1)
						})
				.attr("height", function(d,i,b,c) {
//					console.log(`height d=${d} i=${i}`);
					return y(0+1) - y(d+1);
					})
//				.attr("height", d => y(0) - y(d.value))
				.attr("width", x.bandwidth());

		this.wrapper.append("g")
			.attr("class", "x-axis")
			.call(xAxis);

		this.wrapper.append("g")
			.attr("class", "y-axis")
	}
}

window.onload=function() 
{
	console.log("hello wifi.js");

	const height = 200;
	let width = d3.select("#tx_packets.graph").node().clientWidth - 100;
	console.log(`width=${width}`);

	// get the analytics from our server which gets them from the router
	let target = new URL(document.URL);

	let tx_packets_graph = new GraphDate(width, height,"tx_packets","#tx_packets");
	let tx_bytes_graph = new GraphDate(width, height,"tx_bytes","#tx_bytes");

	let rx_packets_graph = new GraphDate(width, height,"rx_packets","#rx_packets");
	let rx_bytes_graph = new GraphDate(width, height,"rx_bytes","#rx_bytes");

	let tx_rate_graph = new GraphDate(width, height,"tx_rate","#tx_rate");
	let rx_rate_graph = new GraphDate(width, height,"rx_rate","#rx_rate");


	width = d3.select("#tx_mcs_buckets.graph").node().clientWidth - 10;

	let tx_mcs_buckets_graph = new BarChart(width, height,"11AC","#tx_mcs_buckets");
	let rx_mcs_buckets_graph = new BarChart(width, height,"11AC","#rx_mcs_buckets");

	const json_path = target.origin + "/api/status/wlan/analytics" + target.search;
	console.log(`json_path=${json_path}`);

	d3.json(json_path)
		.then(function(data) {
			const tx_mcs = data.data.radio[0].MCS.tx;
			const rx_mcs = data.data.radio[0].MCS.rx;
			console.log(tx_mcs);
			tx_mcs_buckets_graph.draw(tx_mcs["11AC"]);
			rx_mcs_buckets_graph.draw(rx_mcs["11AC"]);
		})
//		.catch( error => {
//			console.warn(`json_path=${json_path} error=${error}`);
//		});

	console.log(`csv_path=${csv_path(0)}`);

	const radio_name = target.searchParams.get('radio');
//	const rnum = get_radio_num(radio_name);

	d3.csv(csv_path(get_radio_num(radio_name)))
	.then(function(data) {
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

	});

	const btn = d3.select("#mcs_rx_buckets_button");
	btn.on("click", function(datum, index, nodes) {
			console.log({datum, index, nodes});
			if (this.textContent == "Linear") {
				this.textContent = "Log";
			}
			else {
				this.textContent = "Linear";
			}
		});

	console.log(`btn=${btn}`);
}


