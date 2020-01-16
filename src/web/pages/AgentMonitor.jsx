import React from 'react';
import { Redirect } from 'react-router-dom';
import {Card, Table, Grid, List, Button, Header, Tab, Icon,
 Image, Menu, Input, Segment, Modal, Select, Label, Loader, Dropdown} from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';
import MessageModal from '../containers/MessageModal.jsx';
import OutputViewer from '../containers/OutputViewer.jsx';
import ResourceViewer from '../containers/ResourceViewer.jsx';
import RuntimeBadge from '../containers/RuntimeBadge.jsx';

import Logo from '../assets/jungabyte_logo_dark.png';

function formatTime(ms){
  var sec = ('0'+(Math.floor(ms/1000)%60)).slice(-2);
  var min = ('0'+(Math.floor(ms/60000)%60)).slice(-2);
  var hour = ('0'+(Math.floor(ms/3600000)%24)).slice(-2);
  return hour+':'+min+':'+sec;
}

const COLOR_MAP = {
	'Running': 'green',
	'Paused': 'yellow',
	'Exited': 'red'
}

class AgentMonitor extends React.Component {
	constructor (props){
		super();
		console.log('[AgentMonitor] Page Initialized for '+props.match.params.id, props);
		this.sys = props.sys;

		this.state = {
			id: props.match.params.id,
			agent: null
		}
		
	}

	componentDidMount(){
		this.eventHandlers = {
			'runtime-updated': (info)=>{
				console.log('[AgentMonitor] Got New Agent Info!', this.sys.getAgent(this.state.id));
				this.setState({
					'agent': this.sys.getAgent(this.state.id)
				});
			}
		};

		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.on(eventName, this.eventHandlers[eventName]));

		this.sys.refreshRuntimeInfo();
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		if (this.props.match.params.id){
			if (prevProps.match.params.id != this.props.match.params.id){
				console.log('Something Changed! ', prevProps, this.props);
				this.setState({
					'id': this.props.match.params.id,
					'agent': this.sys.getAgent(this.props.match.params.id)
				});	
			}
		}
		else {
			
		}
	}

	componentWillUnmount(){
		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.removeListener(eventName, this.eventHandlers[eventName]));
	}

	onEnter (e){
		if (e.key === 'Enter'){
			console.log('Publishing message '+e.target.value+' to '+this.state.id)
			this.sys.pubsub.publish(this.state.id+':stdin', e.target.value, 'text');
			this.userInput.value = '';
		}
	}

	render(){
		if (!this.state.agent){
			return <Segment><Loader/></Segment>
			// return <Redirect to='/monitor' />
		}
		let controls = this.state.agent.isMigratable ? 
			(<div className='ui three buttons'>
			{this.state.agent.status === 'Running' ? 
				<Button basic color='yellow' onClick={(e)=>this.sys.pauseAgent(this.state.id)}>
		            Pause
		          </Button>
		        : (this.state.agent.status === 'Paused' ? 
		        	<Button basic color='green' onClick={(e)=>this.sys.resumeAgent(this.state.id)}>
		            Resume
		          </Button> : null)
			}
			{
				this.state.agent.status !== 'Exited' ?
				<Button basic color='red' onClick={(e)=>this.sys.killAgent(this.state.id)}>
		            Kill
		          </Button> : null
			}
			{
				this.state.agent.status !== 'Exited' ?
				<Dropdown trigger={
					<Button basic color='orange'>
			            Migrate
			          </Button>} icon={null}>
					<Dropdown.Menu>
						{
							Object.keys(this.sys.runtimes)
							.filter((id)=>(id !== this.state.agent.runtime))
							.map((id, index)=>(
								<Dropdown.Item key={index}
									text={id}
									onClick={(e)=>this.sys.migrateAgent(this.state.agent.id, id)}/>
							))
						}
					</Dropdown.Menu>
				</Dropdown> : null
			}
	        </div>) : null;

		return (
			<Grid stackable columns={2}>
				<Grid.Column width={8}>
					<Segment.Group>
						<Header attached='top' color={COLOR_MAP[this.state.agent.status]} inverted>
							<span className='date'>{formatTime(this.state.agent.stat.elapsed)} (since {new Date(this.state.agent.stat.started_at).toLocaleString()})</span>
						</Header>
						<Segment.Group horizontal>
							<Segment>
								<List divided>
								{
									this.state.agent.input
									.map((channel, index)=>(
										<List.Item key={index}>
              				    		  <List.Content>
              				    		  	<Icon name='arrow right'/>
											<MessageModal trigger={
												<Label as='a'>{channel}</Label>
											} agent={this.state.agent.id} channel={channel}/>
              				    		  </List.Content>
              				      		</List.Item>
									))
								}
              				    </List>
							</Segment>
							<Segment compact textAlign='center'>
								<Header size='small'>{this.state.agent.id}</Header>
								<Label>{this.state.agent.stat.cpu.toFixed(1)} %</Label>
								<Label>{(this.state.agent.stat.memory / 1000000).toFixed(1)} MB</Label>
							</Segment>
							<Segment>
								<List>
								{
									this.state.agent.output
									.map((channel, index)=>(
										<List.Item key={index}>
	              				    	  <List.Content>
											<Label as='a'>{channel}</Label>
											<Icon name='arrow right'/>
										  </List.Content>
	              				      	</List.Item>
									))
								}
								</List>
							</Segment>
						</Segment.Group>
						<Segment>
							Running on <RuntimeBadge runtime={this.sys.runtimes[this.state.agent.runtime]}/>
						</Segment>
						<Segment>
							{controls}
						</Segment>
					</Segment.Group>

					<OutputViewer channel={this.state.id + ":stdout"} />
					<input className='terminal-input'
						ref={input=>{this.userInput = input; input && input.focus()}}
						onKeyUp={this.onEnter.bind(this)}/>
					
				</Grid.Column>
				<Grid.Column width={8}>
					<ResourceViewer agents={[this.state.id]} />
				</Grid.Column>
			</Grid>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<AgentMonitor {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)