import React from 'react';
import * as d3 from 'd3';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import {Grid, Card, Table, List, Button, Header, Icon, Image, Menu, Segment, Sidebar} from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';

// import map_data from '../assets/geo/neighborhoods.js';
// import rat_data from '../assets/geo/rodents.js';
import map_data from '../assets/geo/110m.json';

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

class RuntimeMap extends React.Component {
	constructor (props){
		super();
		console.log('[RuntimeMap] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			map_data: feature(map_data, map_data.objects.countries).features,
			// runtimes: {},
			// agents: {},
			// pipes: {}
		}
		
	}

	componentDidMount(){
		this.eventHandlers = {
			'runtime-updated': (info)=>{
				console.log('[RuntimeMap] Got New Runtime Info!', info);
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
		// this.__init_d3();
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

	// __init_d3(){
	// 	var width = 700;
	// 	var height = 380;
	// 	var svg = d3.select(this.refs.map).append('svg')
	// 		.attr('width', (width || '600px') )
	// 		.attr('height', (height || '400px') );

	// 	var g = svg.append('g');

	// 	var albersProjection = d3.geoAlbers()
	// 							.scale(160000)
	// 							.rotate([71.057, 0])
	// 							.center([0, 42.313])
	// 							.translate([width/2, height/2]);

	// 	var geoPath = d3.geoPath()
	// 					.projection(albersProjection);

	// 	g.selectAll('path')
	// 		.data(map_data.features)
	// 		.enter()
	// 		.append('path')
	// 		.attr('fill', '#aaa')
	// 		.attr('d', geoPath);

	// 	var rodents = svg.append('g');

	// 	rodents.selectAll('path')
	// 		.data(rat_data.features)
	// 		.enter()
	// 		.append('path')
	// 		.attr('fill', '#900')
	// 		.attr('stroke', '#999')
	// 		.attr('d', geoPath);
	// }

	render (){
		return (
			<Segment>
				<svg width={ 800 } height={ 450 } viewBox="0 0 800 450">
					<defs>
						<marker id="arrow"
							markerUnits="strokeWidth"
							markerWidth="12"
							markerHeight="12"
							viewBox="0 0 12 12"
							refX="6"
							refY="6"
							orient="auto">
							<path d="M2,2 L10,6 L2,10 L6,6 L2,2" style={{fill: '#f44'}}/>
						</marker>
					</defs>
				        <g className="countries">
				          {
				            this.state.map_data.map((d,i) => (
				              <path
				                key={ `path-${ i }` }
				                d={ geoPath().projection(this.projection())(d) }
				                className="country"
				                fill={ `rgba(38,50,56,${1 / this.state.map_data.length * i})` }
				                stroke="#FFFFFF"
				                strokeWidth={ 0.5 }
				              />
				            ))
				          }
				        </g>
				        <g className="markers">
				        	{
				        		Object.values(this.sys.runtimes)
				        			.map((runtime, index)=>(
				        					<g key={index}>
				        					<circle
									            cx={ this.projection()([runtime.gps.long, runtime.gps.lat])[0] }
									            cy={ this.projection()([runtime.gps.long, runtime.gps.lat])[1] }
									            r={ 10 }
									            fill="#E91E63"
									            className="marker"
									          />
									          <text x={ this.projection()([runtime.gps.long, runtime.gps.lat])[0] }
									                y={ this.projection()([runtime.gps.long, runtime.gps.lat])[1] }>
									                {runtime.id}
									          </text>
									        </g>
				        				))
				        	}

				        	{
				        		Object.values(this.sys.agents)
				        			.map((agent, index)=>(
				        					<g key={index}>
				        					<circle
									            cx={ this.projection()([agent.gps.long, agent.gps.lat])[0] }
									            cy={ this.projection()([agent.gps.long, agent.gps.lat])[1] }
									            r={ 10 }
									            fill="rgb(40, 40, 240)"
									            className="marker"
									          />
									          <text x={ this.projection()([agent.gps.long, agent.gps.lat])[0] }
									                y={ this.projection()([agent.gps.long, agent.gps.lat])[1] }>
									                {agent.id}
									          </text>
									          </g>
				        				))
				        	}
				        </g>
				        <g className="pipes">
						{
							Object.values(this.sys.pipes)
								.map((pipe, index, list)=>{
									let source = this.sys.agents[pipe.source.agent];
									let sink = this.sys.agents[pipe.sink.agent];
									let sourceXY = this.projection()([source.gps.long, source.gps.lat]);
									let sinkXY = this.projection()([sink.gps.long, sink.gps.lat]);
									let offsetSource = moveTowardsPoint(sourceXY[0], sourceXY[1], sinkXY[0], sinkXY[1], 15);
									let offsetSink = moveTowardsPoint(sinkXY[0], sinkXY[1], sourceXY[0], sourceXY[1], 20);

									return (
									<g key={index} className="pipe">
										<line x1={offsetSource[0]} 
											y1={offsetSource[1]} 
											x2={offsetSink[0]} 
											y2={offsetSink[1]}
											style={{ stroke: '#f44', 'strokeWidth': '2' }}
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
		(sys)=>(<RuntimeMap {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)