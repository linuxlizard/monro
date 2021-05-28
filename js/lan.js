//  keys in /api/lan
//  bps,collisions,ibps,idrops,ierrors,imcasts,in,ipackets,noproto,obps,oerrors,omcasts,opackets,out,ts,timestamp

App = {};

//App.update = function() {
//	console.log("updating data...");
//
//	d3.csv("http://localhost:8888/api/lan")
//	.then(function(data) {
//		const row = data[data.length-1];
//		console.log(data);
//
//		const d = d3.select("#graph")
//				.select("svg")
//				.select("g")
//				.selectAll("path");
//		console.log(d.datum());
//
//		let new_data = d.datum();
//		new_data.push(row);
//		console.log(`new_data=${new_data}`);
//
//		d.datum(new_data)
////			.join("d")
//
//	})
//}

App.run = function() {
	d3.csv("http://localhost:8888/api/lan")
	.then(function(data) {
		console.log(data);

		const width = 1000;
		const height = 200;

		let counter = 0;
		data.forEach( value => {value["counter"] = counter++;} );

		const x = (d) => d["counter"];
		const y = (d) => Number(d["bps"]);

		const margin = {
			top: 10,
			right: 10,
			bottom: 50,
			left: 50 };

		const wrapper = d3
			.select("#graph")
			.append("svg")
				.attr("width", width)
				.attr("height", height)

		const bounds = wrapper
			.append("g")
			.style(
				"transform",
				`translate(${margin.left}px, ${margin.top}px)`
			);

//		bounds.append("path").attr("d", "M 0 0 L 100 0 L 100 100 L 0 50 Z")

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
			;

//		data.forEach( d => { console.log(yScale(y(d)));
//							console.log(`d=${y(d)}`);
//							} 
//					);

		const lineGenerator = d3.line()
			.x((d,i) => xScale(i))
//			.x(d => xScale(x(d)))
			.y(d => yScale(y(d)))
			;

//		console.log(lineGenerator(data));

		const line = bounds.append("path")
			.datum(data)
			.attr("d", lineGenerator)
			.attr("fill", "none")
			.attr("stroke", "#af9358")
			.attr("stroke-width", 2)

		// axes
		const yAxisGenerator = d3.axisLeft()
			.scale(yScale)
		const yAxis = bounds.append("g")
			.call(yAxisGenerator)

//		setInterval(App.update, 5000);
		setInterval( function() {
			console.log("updating data...");

			d3.csv("http://localhost:8888/api/lan")
			.then(function(data) {
				console.log(`margin=${margin.top},${margin.left},${margin.bottom},${margin.right}`);

				const row = data[data.length-1];
				console.log(d3.extent(data, d => d['bps']));

				const d = d3.select("#graph")
						.select("svg")
						.select("g")
						.select("path");
				console.log(d.datum());

				// need to rescale for the new data
				const new_yScale = d3
					.scaleLinear()
					.domain(d3.extent(data, y))
					.range([height - margin.top - margin.bottom, 0])
					;

				let new_data = d.datum();
				if (new_data.length >= 256) {
					new_data.shift();
				}
				new_data.push(row);
//				console.log(`new_data=${new_data}`);

				// Redraw the line.
				const new_lineGenerator = d3.line()
					.x((d,i) => xScale(i))
		//			.x(d => xScale(x(d)))
					.y(d => new_yScale(y(d)))
					;

				d.datum(new_data)
					.attr("d", new_lineGenerator)

			})
			}
			, 5000
		);
	})
}

window.onload=function() 
{
	console.log("hello, world");

	App.run();

//	setInterval(run, 5000);
}

