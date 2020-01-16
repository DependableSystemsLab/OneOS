import React from 'react';
import {Form, Button, Select, Image, Segment} from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';

import styles from './terminal.css';

class OutputViewer extends React.Component {
	constructor (props){
		super();
		console.log('[OutputViewer] Page Initialized for '+props.agent);
		this.sys = props.sys;
		this.allChannels = this.sys.channels;
		console.log('[OutputViewer] All Channels ', this.allChannels);

		this.state = {
			channel: props.channel,
			dataType: 'string',
			lines: [],
			imageSrc: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAQAAAD8fJRsAAAAEklEQVR42mNsqGfAChhHJdABAI2tDAEwAsbiAAAAAElFTkSuQmCC'
		}
	}

	componentDidMount(){
		console.log('[OutputViewer] Component Mounted '+this.props.agent);
		this.allChannels = this.sys.channels;

		if (this.state.channel){
			this.sys.pubsub.subscribe(this.state.channel, message => this.updateData(message))
			.then((ref)=>{
				this.handler = ref;
			});	
		}
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		this.allChannels = this.sys.channels;

		if (prevProps.channel != this.props.channel){
			console.log('[OutputViewer] Now Viewing Channel '+this.props.channel);
			if (this.handler){
				this.sys.pubsub.unsubscribe(prevProps.channel, this.handler);
				this.setState({
					lines: []
				});
			}

			this.setState({
				channel: this.props.channel
			});
			// this.handler = (message)=>{
			// 	this.setState({
			// 		lines: this.state.lines.concat([message])
			// 	});
			// 	// console.log('[OutputViewer]', message);
			// 	this.refs.terminal.scrollTop = this.refs.terminal.scrollHeight;
			// };
			//if (this.state.channel){
				this.sys.pubsub.subscribe(this.props.channel, message => this.updateData(message))
				.then((ref)=>{
					this.handler = ref;
				});
			//}
		}
	}

	componentWillUnmount(){
		console.log('[OutputViewer] Unmounting...')
		//this.sys.pubsub.unsubscribe(this.props.agent+':'+this.state.channel, this.handler);
		if (this.handler){
			this.sys.pubsub.unsubscribe(this.state.channel, this.handler);
		}
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
		else if (this.state.dataType === 'json'){
			this.setState({
				// lines: this.state.lines.concat([Buffer.from(message.data, 'base64').toString('utf8')])
				lines: this.state.lines.concat([ JSON.stringify(message) ])
			});
			this.refs.terminal.scrollTop = this.refs.terminal.scrollHeight;
		}
		else if (this.state.dataType === 'image'){
			// console.log('[OutputViewer] '+this.props.agent+':'+this.state.channel, message);
			this.setState({
				imageSrc: 'data:image/png;base64,' + message.toString('base64')
			});
		}
	}

	setChannel (channel){
		if (this.handler){
			// this.sys.pubsub.unsubscribe(this.props.agent+':'+this.state.channel, this.handler);
			this.sys.pubsub.unsubscribe(this.state.channel, this.handler);
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
		/*this.sys.pubsub.subscribe(this.props.agent+':'+channel, (message)=>this.updateData(message))
		.then((ref)=>{
			this.handler = ref;
		});
		this.setState({
			channel: channel
		});*/
		this.sys.pubsub.subscribe(channel, message => this.updateData(message))
		.then(ref => {
			this.handler = ref;
		});
		this.setState({
			channel: channel
		});
	}

	render (){
		let agent = this.sys.agents[this.props.agent];
		let channelOptions = agent ? 
			agent.output.map((ch)=>({ key: ch, value: ch, text: ch })) : this.allChannels.map(ch => ({ key: ch.uri, value: ch.uri, text: ch.uri }));

		let viewer;
		if (this.state.dataType === 'string' || this.state.dataType === 'json'){
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
				<Image src={this.state.imageSrc} fluid/>
			</div>)
		}
		else viewer = <div></div>

		return (<Segment>
			<Form>
				<Form.Group widths={2} inline>
					<Form.Field>
						<Select placeholder='Channel' 
								options={channelOptions}
								value={this.state.channel}
								onChange={(e, d)=>this.setChannel(d.value)}/>
					</Form.Field>
					<Form.Field>
						<Button.Group fluid>
							<Button icon='font' onClick={(e)=>this.setState({ dataType: 'string' })} active={this.state.dataType === 'string'}/>
							<Button icon='js' onClick={(e)=>this.setState({ dataType: 'json' })} active={this.state.dataType === 'json'}/>
							<Button icon='image' onClick={(e)=>this.setState({ dataType: 'image' })} active={this.state.dataType === 'image'}/>
						</Button.Group>
					</Form.Field>
				</Form.Group>
			</Form>
			{viewer}
		</Segment>);
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<OutputViewer {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)