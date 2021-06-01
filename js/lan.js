//  keys in /api/lan/stats
//  bps,collisions,ibps,idrops,ierrors,imcasts,in,ipackets,noproto,obps,oerrors,omcasts,opackets,out,ts,timestamp

App = {};

App.run = function() {
	d3.csv("http://localhost:8888/api/lan")
	.then(function(data) {
		console.log(data);

		const width = 1000;
		const height = 200;

//		const y = (d) => Number(d["in"]);
		const y = (d) => Number(d["bps"]);

		const margin = {
			top: 10,
			right: 10,
			bottom: 50,
			left: 100 };

		const wrapper = d3
			.select("#graph1")
			.append("svg")
				.attr("width", width)
				.attr("height", height)

		const bounds = wrapper
			.append("g")
			.style(
				"transform",
				`translate(${margin.left}px, ${margin.top}px)`
			);

		const xScale = d3
			.scaleLinear()
//			.domain(d3.extent(data,x))
			.domain([0,256-1]) // maximum amount of data to graph
//			.domain([0,data.length-1])
			.range([0, width - margin.left - margin.right])
			;

		const yScale = d3
			.scaleLinear()
			.domain(d3.extent(data, y))
			.range([height - margin.top - margin.bottom, 0])
			.nice()
			;

		const lineGenerator = d3.line()
			.x((d,i) => xScale(i))
			.y(d => yScale(y(d)))
			;

		const line = bounds.append("path")
			.datum(data)
			.attr("d", lineGenerator)
			.attr("fill", "none")
			.attr("stroke", "#af9358")
			.attr("stroke-width", 2)

		// axes
		const xAxisGenerator = d3.axisBottom()
			.scale(xScale)
			;
		const xAxis = bounds.append("g")
			.call(xAxisGenerator)
			.style("transform", `translateY(${height-margin.bottom-margin.top}px)`)
			;

		const yAxisGenerator = d3.axisLeft()
			.scale(yScale)
			.tickFormat(d3.format("~s"))
			;
		const yAxis = bounds.append("g")
			.attr("class", "yaxis")
			.call(yAxisGenerator)
			;

//		let counter = 1;

		setInterval( function() {
			console.log("updating data...");

			d3.csv("http://localhost:8888/api/lan")
			.then(function(data) {
				console.log(`margin=${margin.top},${margin.left},${margin.bottom},${margin.right}`);

				// grab just the last row of data
				const row = data[data.length-1];

				// artificial increase so I can test redrawing the y axis
//				row['bps'] = Number(row['bps']) + 10e6*counter++;

				console.log(d3.extent(data, y));

				// fetch current element & data
//				const d = d3.select("#graph")
//						.select("svg")
//						.select("g")
//						.select("path");

				// need to rescale for the new data
				const new_yScale = d3
					.scaleLinear()
					.domain(d3.extent(data, y))
					.range([height - margin.top - margin.bottom, 0])
					.nice()
					;

				const new_yAxisGenerator = d3.axisLeft()
					.scale(new_yScale)
					.tickFormat(d3.format("~s"))
					;

				d3.select("g.yaxis")
					.call(new_yAxisGenerator)
					;

				// get the current data, add newest sample
				let new_data = line.datum();
//				let new_data = d.datum();
				if (new_data.length >= 256) {
					new_data.shift();
				}
				new_data.push(row);

				// Redraw the line.
				const new_lineGenerator = d3.line()
					.x((d,i) => xScale(i))
					.y(d => new_yScale(y(d)))
					;

				line.datum(new_data)
					.attr("d", new_lineGenerator)
					;

			}) // end csv fetch callback
		} // end setInterval callback
		, 5000);  // end setInterval()
	}) // end original csv fetch callback
}

window.onload=function() 
{
	console.log("hello, world");

	App.run();

//	setInterval(run, 5000);
}

