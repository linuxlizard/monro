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
			right: 10,
			bottom: 50,
			left: 100 };

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
//			.domain(d3.extent(data,x))
			.domain([0,256-1]) // maximum amount of data to graph
//			.domain([0,data.length-1])
			.range([0, this.width - this.margin.left - this.margin.right])
			;

		const yScale = d3
			.scaleLinear()
			.domain(d3.extent(data, this.y))
			.range([this.height - this.margin.top - this.margin.bottom, 0])
			.nice()
			;

		const lineGenerator = d3.line()
			.x((d,i) => this.xScale(i))
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
			;
		const xAxis = this.bounds.append("g")
			.call(xAxisGenerator)
			.style("transform", `translateY(${this.height - this.margin.bottom - this.margin.top}px)`)
			;

		const yAxisGenerator = d3.axisLeft()
			.scale(yScale)
			.tickFormat(d3.format("~s"))
			;
		const yAxis = this.bounds.append("g")
			.attr("class", "yaxis")
			.call(yAxisGenerator)
			;
	} // end draw()

	update(data) 
	{
		// grab just the last row of data
		const row = data[data.length-1];

		console.log(d3.extent(data, this.y));

		// need to rescale for the new data
		const new_yScale = d3
			.scaleLinear()
			.domain(d3.extent(data, this.y))
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

		// get the current data, add newest sample
		let new_data = this.line.datum();
//				let new_data = d.datum();
		if (new_data.length >= 256) {
			new_data.shift();
		}
		new_data.push(row);

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
