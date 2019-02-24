import React from 'react';
import { Dropdown, Button, Icon, Label, Popup, Grid } from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';
import MessageModal from './MessageModal.jsx';
import PipeModal from './PipeModal.jsx';

const COLOR_MAP = {
	Running: 'green',
	Paused: 'yellow',
	Exited: 'red'
}

class AgentBadge extends React.Component {
	constructor (props){
		super();
		console.log('[AgentBadge] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			migrateTo: ''
		}
	}

	componentDidMount(){
		console.log('[AgentBadge] Component Mounted', this.props);
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		
	}

	componentWillUnmount(){
	}

	render (){
		return (
			<Dropdown trigger={
					<Popup trigger={
						<Button as='div' labelPosition='right' size='small' compact>
							<Button color={COLOR_MAP[this.props.agent.status]} compact>
								{this.props.agent.isDaemon ? <Label inverted circular floating color='black'>D</Label> : null}
								{this.props.agent.id}
							</Button>
							<Label as='a' basic color={COLOR_MAP[this.props.agent.status]} pointing='left'>
								{this.props.agent.stat.cpu.toFixed(0)} %
							</Label>
							<Label as='a' basic color={COLOR_MAP[this.props.agent.status]} pointing='left'>
								{(this.props.agent.stat.memory/1000000).toFixed(0)} MB
							</Label>
						</Button>
					} flowing>
						<Grid divided columns='equal'>
							<Grid.Column textAlign='center' verticalAlign='middle'>
								{
									this.props.agent.input
									.map((channel, index)=>(
										<Label key={index}>
											<Icon name='arrow right'/> {channel}
										</Label>
									))
								}
							</Grid.Column>
							<Grid.Column textAlign='center' verticalAlign='middle'>
								{
									this.props.agent.output
									.map((channel, index)=>(
										<Label key={index}>
											{channel} <Icon name='arrow right'/>
										</Label>
									))
								}
							</Grid.Column>
						</Grid>
					</Popup>
				} pointing='top left' icon={null}>
				<Dropdown.Menu>
					{
						this.props.agent.isMigratable ?
						<Dropdown.Item>
							<Button.Group>
								{
									this.props.agent.status === 'Running' ?
									<Popup content='Pause' trigger={
										<Button icon='pause' color='yellow'
											onClick={(e)=>this.sys.pauseAgent(this.props.agent.id)}/>
									}/> : null
								}
								{
									this.props.agent.status === 'Paused' ?
									<Popup content='Resume' trigger={
										<Button icon='play' color='green'
											onClick={(e)=>this.sys.resumeAgent(this.props.agent.id)}/>
									}/> : null
								}
								{
									this.props.agent.status !== 'Exited' ?
									<Popup content='Kill' trigger={
										<Button icon='stop' color='red'
											onClick={(e)=>this.sys.killAgent(this.props.agent.id)}/>
									}/> : null
								}
								{
									this.props.agent.status !== 'Exited' ?
									<Dropdown trigger={
										<Popup content='Migrate' trigger={
											<Button icon='eject' color='purple'/>
											}/>
										} icon={null} direction='right'>
										<Dropdown.Menu>
											{
												Object.keys(this.sys.runtimes)
												.filter((id)=>(id !== this.props.agent.runtime))
												.map((id, index)=>(
													<Dropdown.Item key={index}
														text={id}
														onClick={(e)=>this.sys.migrateAgent(this.props.agent.id, id)}/>
												))
											}
										</Dropdown.Menu>
									</Dropdown> : null
								}
							</Button.Group>
						</Dropdown.Item> : null
					}
					<MessageModal trigger={
							<Dropdown.Item>
								<Icon name='send'/> Send Message
							</Dropdown.Item>
						} agent={this.props.agent.id}/>
					<PipeModal trigger={
							<Dropdown.Item>
								<Icon name='upload'/> Pipe Out
							</Dropdown.Item>
						} sourceAgent={this.props.agent.id} sourceChannel={'stdout'}/>
					<PipeModal trigger={
							<Dropdown.Item>
								<Icon name='download'/> Pipe In
							</Dropdown.Item>
						} sinkAgent={this.props.agent.id} sinkChannel={'stdin'}/>
					{
						this.props.onClickMore ? 
						(<Dropdown.Item onClick={(e)=>this.props.onClickMore()}>
							<Icon name='window maximize outline'/> See more
						</Dropdown.Item>) : null
					}
				</Dropdown.Menu>
			</Dropdown>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<AgentBadge {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)