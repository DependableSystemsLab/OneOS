import React from 'react';
import * as d3 from 'd3';
import { geoMercator, geoPath } from 'd3-geo';
import { Segment } from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';

const AGENT_COLORS = {
	'daemon': '#00f',
	'regular': '#f00'
}

function moveTowardsPoint(x1, y1, x2, y2, units){
	let delta = [
		x2 - x1,
		y2 - y1
	];
	delta = [
		units * delta[0] / Math.sqrt(delta[0]**2 + delta[1]**2),
		units * delta[1] / Math.sqrt(delta[0]**2 + delta[1]**2)
	]
	return [
	  x1 + delta[0],
	  y1 + delta[1]
	]
}

// function extractGraphs(agents, pipes){
// 	var traversed = {};
	
// 	var graphs = {};
// 	var nodes = {

// 	};
// 	var links = [];

// 	var curGraph = 0;
// 	pipes.forEach((pipe)=>{
// 		if (!(pipe.source in nodes)){
// 			nodes[pipe.source] = {
// 				type: 'Channel',
// 				name: pipe.source,
// 				links: []
// 			};
// 			graphs[pipe.source] = curGraph;
// 		}
// 		nodes[pipe.source].links.push(pipe.sink);
// 		if (pipe.sink )
// 	});

// 	agents.forEach((agent)=>{
// 		if (agent.id in traversed) return;
// 		traversed[agent.id] = agent;
// 		graphs[agent.id]

// 		Object.keys(agent.channels)
// 			.forEach((name)=>{
// 				if (agent.channels[name] === 'out'){

// 				}
// 			})
// 	});
// }

class AgentGraph extends React.Component {
	constructor (props){
		super();
		console.log('[AgentGraph] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			// runtimes: {},
			// agents: {},
			// pipes: {}
		}
	}

	componentDidMount(){
		console.log('[AgentGraph] Component Mounted', this.props);
		this.eventHandlers = {
			'runtime-updated': (info)=>{
				console.log('[AgentGraph] Got New Runtime Info!', info);
				this.setState({
					// runtimes: Object.assign({}, this.sys.runtimes),
					// agents: Object.assign({}, this.sys.agents),
					// pipes: Object.assign({}, this.sys.pipes)
				});
			}
		};

		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.on(eventName, this.eventHandlers[eventName]));

		this.sys.refreshRuntimeInfo();
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		
	}

	componentWillUnmount(){
		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.removeListener(eventName, this.eventHandlers[eventName]));
	}

	projection() {
		return geoMercator()
			.scale(85)
			.translate([ 800/2 , 450/2 ])
	}

	getXY (index, listLength, width, height){
		return {
			x: this.getX(index, listLength, width, height),
			y: this.getY(index, listLength, width, height)
		}
	}

	getX (index, listLength, width, height){
		return (width/2) + (height/3) * Math.cos(index * (2*Math.PI / listLength))
	}

	getY (index, listLength, width, height){
		return (height/2) + (height/3) * Math.sin(index * (2*Math.PI / listLength))
	}

	render (){
		let width = 800, height = 450;
		let agents = Object.keys(this.sys.agents);
		return (
			<Segment>
				<svg width={ width } height={ height } viewBox={"0 0 "+width+' '+height}>
					<defs>
						<marker id="arrow"
							markerUnits="strokeWidth"
							markerWidth="12"
							markerHeight="12"
							viewBox="0 0 12 12"
							refX="6"
							refY="6"
							orient="auto">
							<path d="M2,2 L10,6 L2,10 L6,6 L2,2" style={{fill: '#000'}}/>
						</marker>
					</defs>
					<g className="agents">
					{
		        		agents
		        			.map((id, index, list)=>{
		        				let agent = this.sys.agents[id];
		        				return (
		        					<g key={index} className="agent">
			        					<circle
								            cx={ this.getX(index, list.length, width, height) }
								            cy={ this.getY(index, list.length, width, height) }
								            r={ 10 }
								            fill={ agent.isDaemon ? AGENT_COLORS['daemon'] : AGENT_COLORS['regular'] }
								            className="marker"
								          />
								          <text x={ this.getX(index, list.length, width, height) }
								            	y={ this.getY(index, list.length, width, height) }>
								                {agent.id}
								          </text>
							        </g>
		        				)})
		        	}
					</g>
					<g className="pipes">
					{
						Object.values(this.sys.pipes)
							.map((pipe, index, list)=>{
								let source = this.getXY( agents.indexOf(pipe.source.agent), agents.length, width, height);
								let sink = this.getXY( agents.indexOf(pipe.sink.agent), agents.length, width, height );

								let offsetSource = moveTowardsPoint(source.x, source.y, sink.x, sink.y, 20);
								let offsetSink = moveTowardsPoint(sink.x, sink.y, source.x, source.y, 20);

								// console.log(source, offsetSource, sink, offsetSink);

								return (
								<g key={index} className="pipe">
									<line x1={offsetSource[0]} 
										y1={offsetSource[1]} 
										x2={offsetSink[0]} 
										y2={offsetSink[1]}
										style={{ stroke: '#888', 'strokeWidth': '2' }}
								        markerEnd={"url(#arrow)"}/>
								</g>
							)})
					}
					</g>
				</svg>
			</Segment>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<AgentGraph {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)