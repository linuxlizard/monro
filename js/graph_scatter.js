/* davep@mbuf.com 20211223 ; scatter garph in d3 */
'use strict';

class GraphScatter {
	// scatter graph with date/time X-Axis
	constructor(width, height, key, select) 
	{
		this.width = width;
		this.height = height;
		this.key = key;
		this.select = select;

		this.margin = {
			top: 10,
			right: 10,
			bottom: 50,
			left: 100 };

	}

	draw(data) {
//		console.log(data);

//		const y = (d) => Number(d["in"]);
		this.y = (d) => Number(d[this.key]);

		this.wrapper = d3
			.select(this.select)
			.append("svg")
				.attr("width", this.width)
				.attr("height", this.height)

		this.bounds = this.wrapper
			.append("g")
			.style(
				"transform",
				`translate(${this.margin.left}px, ${this.margin.top}px)`)
			;

		// XXX fiddling with date scale
		this.x = (d) => d["timestamp"];
		this.xScale = d3
			.scaleTime()
			.domain([this.x(data[0]), this.x(data[data.length-1])])
			.range([0,this.width-1])
			.nice()
			;

		const yScale = d3
			.scaleLinear()
			.domain(d3.extent(data, this.y))
			.range([this.height - this.margin.top - this.margin.bottom, 0])
			.nice()
			;

		
//		const lineGenerator = d3.line()
//			// timestamp xScale/xAccessor
//			.x((d,i) => this.xScale(this.x(d)))
//			.y(d => yScale(this.y(d)))
//			;

//		this.line = this.bounds.append("path")
//			.datum(data)
//			.attr("d", lineGenerator)
//			.attr("fill", "none")
//			.attr("stroke", "#af9358")
//			.attr("stroke-width", 2)

		function foo(d) {
//			console.log(d);
			return this.xScale(this.x(d));
		}
		let foo2 = foo.bind(this);


		this.bounds.append("g")
			.selectAll("circle")
			.data(data)
			.join("circle")
				.attr("cx", d => foo2(d))
//				.attr("cx", function(d) { console.log(d); return this.x(d) })
//				.attr("cx", d => this.x(d))
				.attr("cy", d => this.y(d))
				.attr("r", 2)
				.attr("stroke", "#af9358")
				;

		// axes
		const xAxisGenerator = d3
			.axisBottom()
			.scale(this.xScale)
			.ticks(12)
			.tickFormat(d3.timeFormat("%H:%M"))
			;

		const xAxis = this.bounds.append("g")
//			.style("fill", "blue")
			.call(xAxisGenerator)
			.style("transform", `translateY(${this.height - this.margin.bottom - this.margin.top}px)`)
			;

		xAxis.append("text")
			.attr("x", this.width/2)
			.attr("y", 40)
			.attr("font-weight", "bold")
			.attr("text-anchor", "end")
			.attr("font-size", "16")
			.attr("fill", "#444")
			.text(this.key)
			;

		const yAxisGenerator = d3.axisLeft()
			.scale(yScale)
			.tickFormat(d3.format("~s"))
			;
		const yAxis = this.bounds.append("g")
			.attr("class", "yaxis")
//			.style("fill", "blue")
			.call(yAxisGenerator)
			;
		yAxis.append("text")
			.attr("font-family", "sans-serif")
			.attr("font", "arial")
			.attr("x", 0)
			.attr("y", 0)
			.attr("font-size", "16")
//			.attr("transform", "translate(0,75)")
			.attr("transform", "rotate(-90,-20,60)")
			.attr("fill", "#444")
			.text(this.key.toUpperCase())
			;

		// https://observablehq.com/@d3/zoomable-area-chart
		let area = (data, x) => d3.area()
			.curve(d3.curveStepAfter)
			.x(d => x(d.date))
			.y0(y(0))
			.y1(d => y(d.value))
			(data)
		const gx = this.bounds.append("g")
			.call(xAxisGenerator, this.x);
		function zoomed(event) {
			console.log("zoomed");
			const xz = event.transform.rescaleX(this.xScale);
			path.attr("d", area(data, xz));
			gx.call(xAxisGenerator, xz);
		}
		let zoomed2 = zoomed.bind(this);

		const zoom = d3.zoom()
			.scaleExtent([1, 32])
			.extent([[this.margin.left, 0], [this.width - this.margin.right, this.height]])
			.translateExtent([[this.margin.left, -Infinity], [this.width - this.margin.right, Infinity]])
			.on("zoom", zoomed2);

		let x2 = this.x;
		this.bounds.call(zoom)
			.transition()
				.duration(750)
				.call(zoom.scaleTo, 4, [x2(Date.UTC(2001, 8, 1)), 0]);

		// Y Axis Label
		// "Fullstack Data Visualization with D3"
		// https://www.newline.co/fullstack-d3
//		yAxis.append("text")
//			.attr("x", 10 ) // -this.height / 2)
//			.attr("y", 10 ) //, -this.margin.left + 10)
//			.attr("fill", "black")
//			.style("font-size", "1.4em")
//			.style("transform", "rotate(-90deg)")
//			.style("text-anchor", "middle")
//			.text("Relative humidity")
			;

	} // end draw()

	update(data) 
	{
		// grab just the last row of data
		const row = data[data.length-1];

		// get the current data, add newest sample
		let new_data = this.line.datum();
		if (new_data.length >= 256) {
			new_data.shift();
		}
		new_data.push(row);

//		console.log(d3.extent(new_data, this.y));

		// need to rescale for the new data
		const new_yScale = d3
			.scaleLinear()
			.domain(d3.extent(new_data, this.y))
			.range([this.height - this.margin.top - this.margin.bottom, 0])
			.nice()
			;

		const new_yAxisGenerator = d3.axisLeft()
			.scale(new_yScale)
			.tickFormat(d3.format("~s"))
			;

		d3.select("g.yaxis")
			.call(new_yAxisGenerator)
			;

		// Redraw the line.
		const new_lineGenerator = d3.line()
			.x((d,i) => this.xScale(i))
			.y(d => new_yScale(this.y(d)))
			;

		this.line.datum(new_data)
			.attr("d", new_lineGenerator)
			;
	} // end update()
}

//export { Graph };
