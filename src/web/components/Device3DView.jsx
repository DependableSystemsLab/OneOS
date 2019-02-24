import React from 'react';
import { Segment } from 'semantic-ui-react';
import * as d3 from 'd3';

function formatNumber(val){
	return (typeof val === 'number') ? val.toFixed(3) : 'N/A';
}

export default class Device3DView extends React.Component {
	constructor (props){
		super();
		console.log('[Device3DView] Page Initialized', props);

		this.state = {
		}
	}

	componentDidMount(){
		console.log('[Device3DView] Component Mounted', this.props);
		this.viewWidth = this.refs.viewport.parentNode.clientWidth;
		this.viewHeight = screen.height * 0.65;
		this.viewBox = '0 0 '+(this.viewWidth/10)+' '+(this.viewHeight/10);

		this.aspectRatio = screen.width / screen.height;
		if (this.aspectRatio < 1){
			this.height = 26;
			this.width = this.height * this.aspectRatio;
		}
		else {
			this.width = 26;
			this.height = this.width / this.aspectRatio;
		}

		this.geolocation = { lat: null, long: null };
		this.orientation = { alpha: null, beta: null, gamma: null };
		this.acceleration = { x: null, y: null, z: null };
		this.accelerationWithGravity = { x: null, y: null, z: null };
		this.rotationRate = { alpha: null, beta: null, gamma: null };
		this.battery = { level: null, charging: null };

		// taken from www.webondevices.com/9-javascript/apis-accessing-device-sensors/
		if (navigator.geolocation){
			navigator.geolocation.getCurrentPosition((position)=>{
				// console.log('Position', position);
				this.geolocation.lat = position.coords.latitude;
				this.geolocation.long = position.coords.longitude;
				// this.emit('update', this);
			});
		}
		if (window.DeviceOrientationEvent){
			window.addEventListener('deviceorientation', (eventData)=>{
				// console.log('Orientation', eventData);
				this.orientation.alpha = eventData.alpha || 0;
				this.orientation.beta = eventData.beta || 0;
				this.orientation.gamma = eventData.gamma || 0;
				// this.emit('update', this);
			}, true);
		}
		if (window.DeviceMotionEvent){
			window.addEventListener('devicemotion', (eventData)=>{
				// console.log('Motion', eventData);
				this.acceleration.x = eventData.acceleration.x || 0;
				this.acceleration.y = eventData.acceleration.y || 0;
				this.acceleration.z = eventData.acceleration.z || 0;
				this.accelerationWithGravity.x = eventData.accelerationIncludingGravity.x || 0;
				this.accelerationWithGravity.y = eventData.accelerationIncludingGravity.y || 0;
				this.accelerationWithGravity.z = eventData.accelerationIncludingGravity.z || 0;
				// Object.assign(this.accelerationWithGravity, eventData.accelerationIncludingGravity);
				this.rotationRate.alpha = eventData.rotationRate.alpha || 0;
				this.rotationRate.beta = eventData.rotationRate.beta || 0;
				this.rotationRate.gamma = eventData.rotationRate.gamma || 0;
				// Object.assign(this.rotationRate, eventData.rotationRate);
				// this.emit('update', this);
			}, true);
		}
		if (navigator.getBattery){
			navigator.getBattery().then((battery)=>{
				this.battery.charging = battery.charging;
				this.battery.level = battery.level;
				
				battery.addEventListener('chargingchange', ()=>{
					this.battery.charging = battery.charging;
					// this.emit('update', this);
				});
			})
		}
		this.mounted = true;
	}

	componentDidUpdate(prevProps, prevState, snapshot){
	}

	componentWillUnmount(){
	}

	render (){
		if (!this.mounted) return (<div ref='viewport'></div>)

		// let transform = 'translate(7,7) rotate('+((this.orientation.alpha-90) % 360)+' '+(this.width/2)+' '+(this.height/2)+')';
		return (
			<div ref='viewport'>
				<div style={{ position: 'absolute' }}>
					<p>Orientation = {formatNumber(this.orientation.alpha)}, {formatNumber(this.orientation.beta)}, {formatNumber(this.orientation.gamma)}</p>
					<p>Acceleration = {formatNumber(this.acceleration.x)}, {formatNumber(this.acceleration.y)}, {formatNumber(this.acceleration.z)}</p>
					<p>Rotation Rate = {formatNumber(this.rotationRate.alpha)}, {formatNumber(this.rotationRate.beta)}, {formatNumber(this.rotationRate.gamma)}</p>
				</div>
				<svg width={this.viewWidth} height={this.viewHeight} viewBox={this.viewBox}>
					<g transform={'translate('+(this.viewWidth/20+this.width/2)+','+(this.viewHeight/20+this.height/2)+')'} style={{ transformStyle: 'preserve-3d' }}>
						<rect width={this.width} height={this.height}
							style={{ fill: 'gray', stroke: 'gray',
								transform: (
									'rotateY('+(-this.orientation.gamma)+'deg) '
									+ 'rotateX('+(this.orientation.beta)+'deg) '
									+ 'rotateZ('+(this.orientation.alpha - 180)+'deg)'
									// 'rotateZ('+(this.orientation.alpha - 180)+'deg)'
									// + 'rotateX('+(this.orientation.beta)+'deg) '
									// + 'rotateY('+(-this.orientation.gamma)+'deg) '
										  ) }}/>
					</g>
				</svg>
			</div>
		)
	}
}