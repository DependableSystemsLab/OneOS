import React from 'react';
import {Form, Button, Select} from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';

import styles from './terminal.css';

class OutputViewer extends React.Component {
	constructor (props){
		super();
		console.log('[OutputViewer] Page Initialized for '+props.agent);
		this.sys = props.sys;

		this.state = {
			channel: 'stdout',
			dataType: 'string',
			lines: [],
			imageSrc: 'data:image/png;base64,'
		}
	}

	componentDidMount(){
		console.log('[OutputViewer] Component Mounted '+this.props.agent);
		this.sys.pubsub.subscribe(this.props.agent+':'+this.state.channel, (message)=>this.updateData(message))
		.then((ref)=>{
			this.handler = ref;
		});
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		if (prevProps.agent && prevProps.agent != this.props.agent){
			console.log('[OutputViewer] Now Viewing Agent '+this.props.agent);
			if (this.handler){
				this.sys.pubsub.unsubscribe(prevProps.agent+':'+this.state.channel, this.handler);
				this.setState({
					lines: []
				});
			}
			// this.handler = (message)=>{
			// 	this.setState({
			// 		lines: this.state.lines.concat([message])
			// 	});
			// 	// console.log('[OutputViewer]', message);
			// 	this.refs.terminal.scrollTop = this.refs.terminal.scrollHeight;
			// };
			this.sys.pubsub.subscribe(this.props.agent+':'+this.state.channel, (message)=>this.updateData(message))
			.then((ref)=>{
				this.handler = ref;
			});
		}
	}

	componentWillUnmount(){
		console.log('Unmounting...')
		this.sys.pubsub.unsubscribe(this.props.agent+':'+this.state.channel, this.handler);
	}

	updateData (message){
		// console.log(message);
		if (this.state.dataType === 'string'){
			this.setState({
				// lines: this.state.lines.concat([Buffer.from(message.data, 'base64').toString('utf8')])
				lines: this.state.lines.concat([ String(message) ])
			});
			this.refs.terminal.scrollTop = this.refs.terminal.scrollHeight;
		}
		else if (this.state.dataType === 'image'){
			// console.log('[OutputViewer] '+this.props.agent+':'+this.state.channel, message);
			this.setState({
				imageSrc: 'data:image/png;base64,'+message.toString('base64')
			});
		}
	}

	setChannel (channel){
		if (this.handler){
			this.sys.pubsub.unsubscribe(this.props.agent+':'+this.state.channel, this.handler);
			this.setState({
				lines: []
			});
		}
		// this.handler = (message)=>{
		// 	this.setState({
		// 		lines: this.state.lines.concat([message])
		// 	});
		// 	// console.log('[OutputViewer]', message);
		// 	this.refs.terminal.scrollTop = this.refs.terminal.scrollHeight;
		// };
		this.sys.pubsub.subscribe(this.props.agent+':'+channel, (message)=>this.updateData(message))
		.then((ref)=>{
			this.handler = ref;
		});
		this.setState({
			channel: channel
		});
	}

	render (){
		let agent = this.sys.agents[this.props.agent];
		let channelOptions = agent ? 
			agent.output.map((ch)=>({ key: ch, value: ch, text: ch })) : [];

		let viewer;
		if (this.state.dataType === 'string'){
			viewer = (
			<div ref="terminal" className='terminal-console'>
				{
					this.state.lines.map((line, index)=>{
						return <p key={index}>{line}</p>
					})
				}
			</div>)
		}
		else if (this.state.dataType === 'image'){
			viewer = (
			<div>
				<img src={this.state.imageSrc}/>
			</div>)
		}
		else viewer = <div></div>

		return (<div>
			<Form.Group inline>
				<Select placeholder='Channel' 
						options={channelOptions}
						value={this.state.channel}
						onChange={(e, d)=>this.setChannel(d.value)}/>
				<Button.Group fluid>
					<Button icon='font' onClick={(e)=>this.setState({ dataType: 'string' })}/>
					<Button icon='image' onClick={(e)=>this.setState({ dataType: 'image' })}/>
				</Button.Group>
			</Form.Group>
			{viewer}
		</div>);
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<OutputViewer {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)