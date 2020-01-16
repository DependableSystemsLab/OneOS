import React from 'react';
import { Dropdown, Button, Icon, Label, Popup, Grid } from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';

class AgentControl extends React.Component {
	constructor (props){
		super();
		console.log('[AgentControl] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			migrateTo: ''
		}
	}

	componentDidMount(){
		console.log('[AgentControl] Component Mounted', this.props);
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		
	}

	componentWillUnmount(){
	}

	render (){
		return (
			<Button.Group size="mini">
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
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<AgentControl {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)
