import React from 'react';
import {Modal, Button, Select, Input, Icon, Portal, Segment, Header, Label} from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';

class PipeModal extends React.Component {
	constructor (props){
		super();
		console.log('[PipeModal] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			source_agent: props.sourceAgent,
			source_channel: props.sourceChannel,
			sink_agent: props.sinkAgent,
			sink_channel: props.sinkChannel
		}
	}

	componentDidMount(){
		console.log('[PipeModal] Component Mounted', this.props);
		// this.eventHandlers = {
		// 	'runtime-updated': (info)=>{
		// 		console.log('[OneOSComponent] Got New Runtime Info!', info);
		// 		this.setState({});
		// 	}
		// };
		// Object.keys(this.eventHandlers)
		// 	.forEach((eventName)=>this.sys.on(eventName, this.eventHandlers[eventName]));
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		
	}

	componentWillUnmount(){
		// Object.keys(this.eventHandlers)
		// 	.forEach((eventName)=>this.sys.removeListener(eventName, this.eventHandlers[eventName]));
	}

	createPipe(){
		this.sys.createPipe(this.state.source_agent+':'+this.state.source_channel, this.state.sink_agent+':'+this.state.sink_channel)
			.then(()=>this.setState({
				source_agent: this.props.sourceAgent,
				source_channel: this.props.sourceChannel,
				sink_agent: this.props.sinkAgent,
				sink_channel: this.props.sinkChannel,
			}))
	}

	render (){
		let agentOptions = Object.values(this.sys.agents).map((agent)=>{
			return { key: agent.id, value: agent.id, text: agent.id }
		});

		let outAgent = this.sys.agents[this.state.source_agent];
		let outChannels = outAgent ?
			outAgent.output.map((ch)=>{
				return { key: ch, value: ch, text: ch }
			}) : [];
			// channels.filter((ch)=>(ch.type==='output')).map((ch)=>{
			// 	return { key: ch.name, value: ch.name, text: ch.name }
			// }) : [];
		

		let inAgent = this.sys.agents[this.state.sink_agent];
		let inChannels = inAgent ? 
			inAgent.input.map((ch)=>{
				return { key: ch, value: ch, text: ch }
			}) : [];
			// channels.filter((ch)=>(ch.type==='input')).map((ch)=>{
			// 	return { key: ch.name, value: ch.name, text: ch.name }
			// }) : [];

		return (
			<Portal trigger={this.props.trigger}>
				<Segment style={{ left: '30%', position: 'fixed', top: '40%', zIndex: 1500 }}>
					<Header>
						Create Pipe from 
						<Label>{this.state.source_agent}:{this.state.source_channel}</Label> 
						to <Label>{this.state.sink_agent}:{this.state.sink_channel}</Label>
					</Header>
					<Select placeholder='From' 
						options={agentOptions}
						value={this.state.source_agent}
						onChange={(e, d)=>this.setState({ source_agent: d.value })}/>
					<Select placeholder='Channel' 
						options={outChannels}
						value={this.state.source_channel}
						onChange={(e, d)=>this.setState({ source_channel: d.value })}/>
					<Select placeholder='To' 
						options={agentOptions}
						value={this.state.sink_agent}
						onChange={(e, d)=>this.setState({ sink_agent: d.value })}/>
					<Select placeholder='Channel' 
						options={inChannels}
						value={this.state.sink_channel}
						onChange={(e, d)=>this.setState({ sink_channel: d.value })}/>
					{
						(this.state.source_agent && this.state.source_channel && 
							this.state.sink_agent && this.state.sink_channel) ?
						<Button icon='check' color='blue'
						onClick={(e)=>this.createPipe()}/>
						: null
					}
				</Segment>
            </Portal>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<PipeModal {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)

// <Modal size='tiny' trigger={this.props.trigger}>
// 				<Modal.Header><Icon name='send'/> {this.props.agent.id}:{this.state.channel}</Modal.Header>
// 				<Modal.Content>
// 					<Select placeholder='Channel' 
// 						options={this.props.agent.channels || DEFAULT_CHANNELS}
// 						value={this.state.channel}
// 						onChange={(e, d)=>this.setState({ channel: d.value })}/>
// 					<Button.Group>
// 						<Button>JSON</Button>
// 						<Button.Or/>
// 						<Button>String</Button>
// 						<Button.Or/>
// 						<Button>OneOS</Button>
// 					</Button.Group>
// 					<Input action='send' placeholder='Message...'
// 						ref={input=>{this.userInput = input; input && input.focus()}}
// 						onChange={(e)=>this.setState({ message: e.target.value })}
// 						onKeyUp={this.onEnter.bind(this)}/>
// 				</Modal.Content>
// 			</Modal>