import React from 'react';
import * as d3 from 'd3';
import {Grid, Card, Table, List, Button, Header, Icon, Image, Menu, Segment, Sidebar} from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';

class ResourceGraph extends React.Component {
	constructor (props){
		super();
		console.log('[ResourceGraph] Page Initialized for '+props.agents);
		this.sys = props.sys;

		this.agents = props.agents;

		this.d3 = {};

		this.state = {
			channel: 'stdout',
			lines: []
		}
	}

	componentDidMount(){
		console.log('[ResourceGraph] Component Mounted '+this.props.agent);
		// this.handler = (message)=>{
		// 	this.setState({
		// 		lines: this.state.lines.concat([message])
		// 	});
		// 	// console.log('[ResourceGraph]', message);
		// 	this.refs.terminal.scrollTop = this.refs.terminal.scrollHeight;
		// };
		// this.sys.pubsub.subscribe(this.props.agent+':stdout', this.handler);

		this.eventHandlers = {
			'stat': (info)=>{
				if (this.props.agents.indexOf(info.id) > -1){
					// console.log('[ResourceGraph] Got New Stat!', info);

					if (this.d3.data[info.id]){

						this.d3.data[info.id].push(this.__getDataPoint(info));

						// this.__redraw_d3();

						// update the line
						// console.log(this.d3.data[info.id]);
						// this.d3.lines[info.id]
						// 	.datum(this.d3.data[info.id])
						// 	.attr('d', this.d3.lineFunc);
					}
					else {
						this.d3.data[info.id] = this.sys.stats[info.id].map((item)=>this.__getDataPoint(item));

						// this.__redraw_d3();

						this.d3.lines[info.id] = this.d3.graph.append('path')
							.attr('d', this.d3.lineFunc(this.d3.data[info.id]))
							.attr('stroke', this.d3.colors(this.__getOrder(info.id)))
							.attr('stroke-width', 2)
							.attr('fill', 'none');


					}

					this.__redraw_d3();

				}
				
				// this.setState({
				// 	'agent': this.sys.getAgent(this.state.id)
				// });
			}
		};

		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.on(eventName, this.eventHandlers[eventName]));

		this.__init_d3();
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		if (prevProps.resource && prevProps.resource != this.props.resource){
			console.log('[ResourceGraph] View Mode Changed '+this.props.resource);



			this.props.agents.forEach((id)=>{
				this.d3.data[id] = this.sys.stats[id].map((item)=>this.__getDataPoint(item));	
			});

			this.__redraw_d3();

			// if (this.handler){
			// 	this.sys.pubsub.unsubscribe(prevProps.agent+':stdout', this.handler);
			// 	this.setState({
			// 		lines: []
			// 	});
			// }
			// this.handler = (message)=>{
			// 	this.setState({
			// 		lines: this.state.lines.concat([message])
			// 	});
			// 	// console.log('[ResourceGraph]', message);
			// 	this.refs.terminal.scrollTop = this.refs.terminal.scrollHeight;
			// };
			// this.sys.pubsub.subscribe(this.props.agent+':stdout', this.handler);
		}
	}

	componentWillUnmount(){
		// this.sys.pubsub.unsubscribe(this.props.agent+':stdout', this.handler);
		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.removeListener(eventName, this.eventHandlers[eventName]));
	}

	__getDataPoint(datum){
		var item = { 
			timestamp: datum.timestamp,
			value: (this.props.resource === 'cpu') ? datum.cpu : (datum.memory / 1000000)
		}
		// update maxValue here so we don't have to calculate again when rendering
		if (item.value > this.d3.maxValue) this.d3.maxValue = item.value;
		return item;
	}

	__getOrder(id){
		return this.props.agents.sort().indexOf(id);
	}

	__init_d3(){
		var svg = d3.select(this.refs.graph).append('svg')
			.attr('width', (this.props.width || this.refs.graph.parentNode.clientWidth+'px') )
			.attr('height', (this.props.height || '400px') );
		var elemBox = svg.node().getBoundingClientRect();

		var margin = { left: 50, right: 30, top: 30, bottom: 50 };
		var size = { width: elemBox.width - margin.left - margin.right, height: elemBox.height - margin.top - margin.bottom };

		var axes = svg.append('g').attr('transform', 'translate('+margin.left+', '+margin.top+')');
		var x = d3.scaleLinear().range([ 0, size.width ]);

		// if (this.engine.stats.length > 0){
		// 	x.domain([ this.engine.stats[0].timestamp, this.engine.stats[this.engine.stats.length-1].timestamp ]);
		// }
		// else {
			x.domain([ Date.now() - 1000, Date.now() ]);
		// }

		var y = d3.scaleLinear().domain([ 0, 100 ]).range([ size.height, 0 ]);
		var xAxis = d3.axisBottom(x).ticks(Math.floor(elemBox.width / 100)).tickFormat(d3.timeFormat('%H:%M:%S.%L'));
		var yAxis = d3.axisLeft(y);

		var xLine = axes.append('g').attr('transform', 'translate(0, '+size.height+')').call(xAxis);
		var yLine = axes.append('g').call(yAxis);

		var grid = svg.append('g').attr('transform', 'translate('+margin.left+', '+margin.top+')');
		
		var mouseTrack = grid.append('line')
			.attr('x1', 0)
			.attr('x2', 0)
			.attr('y1', 0)
			.attr('y2', size.height)
			.attr('style', 'stroke: rgb(220,180,180); stroke-width: 1;');
		var mouseText = grid.append('text')
			.attr('x', 0)
			.attr('y', 0);

		var mouseCursor = grid.append('line')
			.attr('x1', 0)
			.attr('x2', 0)
			.attr('y1', 0)
			.attr('y2', size.height);
		var cursorText = grid.append('text').attr('x',0).attr('y',0)

		svg.on('mousemove', ()=>{
				var mousePos = d3.mouse(grid.node());
				var timestamp = d3.timeFormat('%H:%M:%S.%L')(x.invert(mousePos[0]));
				// console.log(mousePos);
				mouseTrack.attr('x1', mousePos[0]).attr('x2', mousePos[0]);
				mouseText.attr('x', mousePos[0])
					.text(timestamp);
			});
		svg.on('mouseup', ()=>{
				var mousePos = d3.mouse(grid.node());
				this.d3.cursorAt = x.invert(mousePos[0]);
				// console.log(mousePos, Math.floor(x.invert(mousePos[0])));
				mouseCursor.attr('x1', mousePos[0]).attr('x2', mousePos[0])
					.attr('style', 'stroke: rgb(100,100,255); stroke-width: 2;');
				cursorText.attr('x', mousePos[0]).text(d3.timeFormat('%H:%M:%S.%L')(this.d3.cursorAt));
			});

		// Actual elements that will represent incoming data
		var graph = svg.append('g').attr('transform', 'translate('+margin.left+', '+margin.top+')');
		var realTimeFunc = this.d3.lineFunc = d3.line()
				.x((d, i)=>x(d.timestamp))
				.y((d, i)=>y(d.value))

		var colors = d3.scaleOrdinal(d3.schemeCategory10);

		this.d3.svg = svg;
		this.d3.elemBox = elemBox;
		this.d3.margin = margin;
		this.d3.size = size;
		this.d3.view = { from: 0, to: 0 };
		this.d3.axes = axes;
		this.d3.xScale = x;
		this.d3.yScale = y;
		this.d3.xAxis = xAxis;
		this.d3.yAxis = yAxis;
		this.d3.xLine = xLine;
		this.d3.yLine = yLine;
		this.d3.grid = grid;
		this.d3.cursor = mouseCursor;
		this.d3.cursorText = cursorText;

		this.d3.panLeft = ()=>{
			var domain = x.domain();
			var zoom = domain[1] - domain[0];
			var panStep = zoom * 0.1;
			this.d3.view.from = domain[0] - panStep;
			this.d3.view.to = this.d3.view.from + zoom;
			this.__redraw_d3()
		}
		this.d3.panRight = ()=>{
			var domain = x.domain();
			var zoom = domain[1] - domain[0];
			var panStep = zoom * 0.1;
			this.d3.view.from = domain[0] + panStep;
			this.d3.view.to = this.d3.view.from + zoom;
			this.__redraw_d3()
		}
		this.d3.zoomIn = ()=>{
			var domain = x.domain();
			var zoom = (domain[1] - domain[0]) * 0.8;
			var panStep = zoom * 0.1;
			this.d3.view.from = domain[0] + (domain[1] - domain[0] - zoom) / 2;
			this.d3.view.to = this.d3.view.from + zoom;
			this.__redraw_d3()
		}
		this.d3.zoomOut = ()=>{
			var domain = x.domain();
			var zoom = (domain[1] - domain[0]) / 0.8;
			var panStep = zoom * 0.1;
			this.d3.view.from = domain[0] - (zoom - domain[1] + domain[0]) / 2;
			this.d3.view.to = this.d3.view.from + zoom;
			this.__redraw_d3()
		}
		this.d3.resetView = ()=>{
			this.d3.view.from = 0;
			this.d3.view.to = 0;
			this.__redraw_d3()
		}

		this.d3.graph = graph;
		this.d3.colors = colors;
		this.d3.lines = {};
		this.d3.data = {};
		this.d3.maxValue = -Infinity;
		this.d3.minValue = Infinity;

		// this.props.agents.forEach((id)=>{
		// 	this.d3.data[id] = this.sys.stats[id].map((item)=>this.__getDataPoint(item));

		// 	this.d3.lines[id] = graph.append('path')
		// 		.attr('d', this.d3.lineFunc(this.d3.data[id]))
		// 		.attr('stroke', colors(index))
		// 		.attr('stroke-width', 2)
		// 		.attr('fill', 'none');
		// })

		// var procs = this.engine.getProcesses();
		// var plots = {};

		// procs.forEach((proc, index)=>{
		// 	// if (proc.status !== 'Exited'){
		// 	plots[proc.instance_id] = this.props.programs[proc.instance_id].stats.slice();

		// 	var procData = plots[proc.instance_id].map((item)=>{
		// 		return { timestamp: item.timestamp, value: item.cpu }
		// 	});

		// 	this.d3.lines[proc.instance_id] = graph.append('path')
		// 								.attr('d', this.d3.lineFunc(procData))
		// 								.attr('stroke', colors(index))
		// 								.attr('stroke-width', 2)
		// 								.attr('fill', 'none');
		// 	// }
		// });

		// this.state.plots = plots;

		// var engineData = this.state.engine_cpu = this.engine.stats.map((item)=>{
		// 	return { timestamp: item.timestamp, value: item.cpu };
		// })
		// this.state.engine_memory = this.engine.stats.map((item)=>{
		// 	// return { timestamp: item.timestamp, value: MB(item.memory.heapUsed) };
		// 	return { timestamp: item.timestamp, value: MB(item.memory.rss) };
		// })

		// var realTimeLine = this.d3.engineLine = graph.append('path')
		// 	.attr('d', realTimeFunc(engineData))
		// 	.attr('stroke', 'red')
		// 	.attr('stroke-width', 2)
		// 	.attr('fill', 'none')
			// .attr('transform', 'translate('+margin.left+', '+margin.top+')')
	}

	__redraw_d3_grid(){
		var vlines = this.d3.grid.selectAll('.grid-vline')
			.data(this.d3.xScale.ticks());

		vlines.attr('x1', (d)=>{ return this.d3.xScale(d) })
			.attr('x2', (d)=>{ return this.d3.xScale(d) });
		vlines.exit().remove();
		vlines.enter()
			.append('line')
			.attr('class', 'grid-vline')
			.attr('x1', (d)=>{ return this.d3.xScale(d) })
			.attr('x2', (d)=>{ return this.d3.xScale(d) })
			.attr('y1', 0)
			.attr('y2', this.d3.size.height)
			.attr('style', 'stroke: rgb(210,210,210); stroke-width: 1;');

		var hlines = this.d3.grid.selectAll('.grid-hline')
			.data(this.d3.yScale.ticks());

		hlines.attr('y1', (d)=>{ return this.d3.yScale(d) })
			.attr('y2', (d)=>{ return this.d3.yScale(d) });
		hlines.exit().remove();
		hlines.enter()
			.append('line')
			.attr('class', 'grid-hline')
			.attr('x1', 0)
			.attr('x2', this.d3.size.width)
			.attr('y1', (d)=>{ return this.d3.yScale(d) })
			.attr('y2', (d)=>{ return this.d3.yScale(d) })
			.attr('style', 'stroke: rgb(210,210,210); stroke-width: 1;');

		// update mouse cursor position (x domain changed, so the position needs to be updated)
		if (this.d3.cursorAt){
			var cursorAt = this.d3.xScale(this.d3.cursorAt);
			this.d3.cursor.attr('x1', cursorAt).attr('x2', cursorAt)
				.attr('style', 'stroke: rgb(100,100,255); stroke-width: 2;');
			this.d3.cursorText.attr('x', cursorAt);
		}
	}

	__redraw_d3(){
		if (this.d3.view.from === 0 || this.d3.view.to === 0){
			this.d3.xScale.domain(d3.extent(this.d3.data[this.props.agents[0]], function(d){ return d.timestamp }));
		}
		else {
			this.d3.xScale.domain([this.d3.view.from, this.d3.view.to]);
		}

		if (this.props.resource === 'cpu'){
			this.d3.yScale.domain([ 0, 100 ]);
			this.d3.yAxis.tickFormat((d)=>(d+' %'));

			// this.__redraw_d3_grid();
		}
		else if (this.props.resource === 'memory'){
			this.d3.yScale.domain([ 0, this.d3.maxValue * 1.1 ]);
			this.d3.yAxis.tickFormat((d)=>(d+' MB'));

			// this.__redraw_d3_grid();
		};

		this.__redraw_d3_grid();
		
		this.d3.xLine
			// .transition()
			// .duration(250)
			// .ease(d3.easeLinear,2)
			.call(this.d3.xAxis);
		
		this.d3.yLine
			// .transition()
			// .duration(500)
			// .ease(d3.easeLinear,2)
			.call(this.d3.yAxis);


		Object.keys(this.d3.data)
			.forEach((id)=>{
				this.d3.lines[id]
					.datum(this.d3.data[id])
					.attr('d', this.d3.lineFunc);
			});
	}

	render (){
		return (
			<Grid stackable>
				<Grid.Row>
					<Grid.Column width={10}>
						<div ref="graph"></div>
					</Grid.Column>
					<Grid.Column width={6}>
					</Grid.Column>
				</Grid.Row>
				<Grid.Row>
					<Grid.Column width={16}>
						<Button.Group fluid>
							<Button onClick={(evt)=>this.d3.panLeft()} icon='chevron left'/>
							<Button onClick={(evt)=>this.d3.zoomOut()} icon='search minus'/>
							<Button onClick={(evt)=>this.d3.resetView()} icon='undo'/>
							<Button onClick={(evt)=>this.d3.zoomIn()} icon='search plus'/>
							<Button onClick={(evt)=>this.d3.panRight()} icon='chevron right'/>
						</Button.Group>
					</Grid.Column>
				</Grid.Row>
			</Grid>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<ResourceGraph {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)