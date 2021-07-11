/* davep@mbuf.com 20210605 ; dynamic graph in d3 */
'use strict';

class Graph {
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
			left: 60 };

	}

	draw(data) {
		console.log(data);

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
				`translate(${this.margin.left}px, ${this.margin.top}px)`
			);

		this.xScale = d3
			.scaleLinear()
//			.domain([0,256-1]) // maximum amount of data to graph
			.domain([0,data.length-1])
			.range([0, this.width - this.margin.left - this.margin.right])
			;

		// XXX fiddling with date scale
		this.x = (d) => d["timestamp"];
		this.xScale = d3.
			scaleTime()
			.domain([this.x(data[0]), this.x(data[data.length-1])])
			.range([0,data.length-1])
			.nice()
			;

		const yScale = d3
			.scaleLinear()
			.domain(d3.extent(data, this.y))
			.range([this.height - this.margin.top - this.margin.bottom, 0])
			.nice()
			;

		const lineGenerator = d3.line()
			// timestamp xScale/xAccessor
			.x((d,i) => this.xScale(this.x(d)))
//			.x((d,i) => this.xScale(i))
			.y(d => yScale(this.y(d)))
			;

		this.line = this.bounds.append("path")
			.datum(data)
			.attr("d", lineGenerator)
			.attr("fill", "none")
			.attr("stroke", "#af9358")
			.attr("stroke-width", 2)

		// axes
		const xAxisGenerator = d3.axisBottom()
			.scale(this.xScale)
			.ticks(18)
			;

		const xAxis = this.bounds.append("g")
			.call(xAxisGenerator)
			.style("transform", `translateY(${this.height - this.margin.bottom - this.margin.top}px)`)
			;

		xAxis.append("text")
			.attr("x", this.width - 400)
			.attr("y", -4)
			.attr("font-weight", "bold")
			.attr("text-anchor", "end")
			.attr("fill", "black")
			.text("hello, world")
			;

		// https://stackoverflow.com/questions/11189284/d3-axis-labeling#11194968
//		this.bounds.append("text")
//			.attr("class", "y label")
//			.attr("text-anchor", "end")
//			.attr("y", -6)
//			.attr("dy", ".75em")
//			.attr("transform", "rotate(-90)")
//			.text("life expectancy (years)");

		const yAxisGenerator = d3.axisLeft()
			.scale(yScale)
			.tickFormat(d3.format("~s"))
			;
		const yAxis = this.bounds.append("g")
			.attr("class", "yaxis")
			.call(yAxisGenerator)
			;

		// "Fullstack Data Visualization with D3"
		// https://www.newline.co/fullstack-d3
		yAxis.append("text")
			.attr("x", 10 ) // -this.height / 2)
			.attr("y", 10 ) //, -this.margin.left + 10)
			.attr("fill", "black")
			.style("font-size", "1.4em")
			.style("transform", "rotate(-90deg)")
			.style("text-anchor", "middle")
			.text("Relative humidity")
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

		console.log(d3.extent(new_data, this.y));

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
