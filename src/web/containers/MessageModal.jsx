import React from 'react';
import {Modal, Button, Select, Input, Icon, Portal, Segment, Header} from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';
import JSONInput from '../components/JSONInput.jsx';

const DEFAULT_CHANNELS = [{
	key: 'stdin',
	value: 'stdin',
	text: 'Standard Input'
}]

const MESSAGE_TYPES = [{
	key: 'string',
	value: 'string',
	text: 'String'
},{
	key: 'object',
	value: 'object',
	text: 'JSON Object'
},{
	key: 'actor',
	value: 'actor',
	text: 'Actor Message'
},{
	key: 'lambda',
	value: 'lambda',
	text: 'Lambda Call'
}];

function initObject(type){
	switch (type){
		case 'object':
			return {};
		case 'actor':
			return {
				verb: '',
				payload: {}
			};
		case 'lambda':
			return {
				verb: 'execute',
				payload: {
					lambda: '',
					args: []
				}
			};
		case 'string':
			return '';
	}
}

class MessageModal extends React.Component {
	constructor (props){
		super();
		console.log('[MessageModal] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			channel: props.channel || 'stdin',
			messageType: 'object',
			message: {}
		}
	}

	componentDidMount(){
		console.log('[MessageModal] Component Mounted', this.props);
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		
	}

	componentWillUnmount(){

	}

	changeMessageType (type){
		console.log('Trying to change type to '+type);
		switch (this.state.messageType){
			case 'object', 'actor':
				if (Object.keys(this.props.value).length > 0) return;
				break;
			case 'string':
				if (this.props.value.length > 0) return;
		}
		this.setState({
			messageType: type,
			message: initObject(type)
			// value: initObject(type)
		});
	}

	sendMessage(){
		console.log(this.state.message);
		this.sys.pubsub.publish(this.props.agent+':'+this.state.channel, this.state.message);
	}

	onEnter (e){
		if (e.key === 'Enter'){
			console.log('Publishing message '+e.target.value+' to '+this.props.agent+':'+this.state.channel)
			this.sys.pubsub.publish(this.props.agent+':'+this.state.channel, e.target.value+'\n');
			this.userInput.inputRef.value = ''; // need to use "inputRef" because we're using semantic ui Input
		}
	}

	render (){
		let agent = this.sys.agents[this.props.agent];
		let channelOptions = agent ? 
			agent.input.map((ch)=>({ key: ch, value: ch, text: ch })) : [];
			// agent.channels.filter((ch)=>(ch.type==='input'))
			// 	.map((ch)=>({ key: ch.name, value: ch.name, text: ch.name })) : [];
			// channelOptions = channelOptions.concat([{ key: 'inbox', value: 'inbox', text: 'inbox' }]);

		return (
			<Portal trigger={this.props.trigger}>
				<Segment style={{ left: '30%', position: 'fixed', top: '10%', maxHeight: '80%', zIndex: 1500, overflow: 'auto' }}>
					<Header>
						<Icon name='send'/> {this.props.agent + ':' + this.state.channel}
					</Header>
					<Select placeholder='Channel' 
						options={channelOptions}
						value={this.state.channel}
						onChange={(e, d)=>this.setState({ channel: d.value })}/>

					<Select placeholder='Type' 
						options={MESSAGE_TYPES}
						value={this.state.messageType}
						onChange={(e, d)=>this.changeMessageType(d.value)}/>
					
					<JSONInput value={this.state.message} onChange={(e)=>this.setState({ message: e.value })}/>
					<Button fluid icon='send' content='Send' onClick={(e)=>this.sendMessage()}/>
				</Segment>
            </Portal>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<MessageModal {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)

// <Button.Group>
// 	<Button>JSON</Button>
// 	<Button.Or/>
// 	<Button>String</Button>
// 	<Button.Or/>
// 	<Button>OneOS</Button>
// </Button.Group>

// <Input action='send' placeholder='Message...'
// 						ref={input=>{this.userInput = input; input && input.focus()}}
// 						onChange={(e)=>this.setState({ message: e.target.value })}
// 						onKeyUp={this.onEnter.bind(this)}/>

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