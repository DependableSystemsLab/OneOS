import React from 'react';
import { Segment } from 'semantic-ui-react';
import * as d3 from 'd3';

const d3color = d3.scaleLinear().domain([0, 100]).interpolate(d3.interpolateHcl).range([d3.rgb('#0F0'), d3.rgb('#F00')]);

export default function D3Progress (props){
	let height = props.height || '1em';
	let width = props.percent || 0;
	if (width > 100) width = 100;
	let background = props.background || '#eee';
	return (
		<div style={{ background: background, width: '100%', height: '1em', border: '1px solid #ddd' }}>
			<div style={{ background: (props.foreground || d3color(width)), width: width+'%', height: '100%' }}></div>
		</div>
	)
}