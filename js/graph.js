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
				`translate(${this.margin.left}px, ${this.margin.top}px)`)
			;

		this.xScale = d3
			.scaleLinear()
			.domain([0,60-1]) // maximum amount of data to graph
//			.domain([0,256-1]) // maximum amount of data to graph
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
			.ticks(6)
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
		if (new_data.length >= 60) {
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
