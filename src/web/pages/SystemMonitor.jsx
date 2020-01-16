import React from 'react';
import { HashRouter as Router, Route, Switch, NavLink, browserHistory, hashHistory, Redirect } from 'react-router-dom';
import {Tab, Popup, Table, List, Button, Header, Icon, Image, Menu, Segment, Modal, Progress } from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';
import AgentBadge from '../containers/AgentBadge.jsx';
import RuntimeBadge from '../containers/RuntimeBadge.jsx';
import RuntimeMap from '../containers/RuntimeMap.jsx';
import RuntimeTable from '../containers/RuntimeTable.jsx';
import AgentTable from '../containers/AgentTable.jsx';
import AgentGraph from '../containers/AgentGraph.jsx';
import StreamViewer from '../containers/StreamViewer.jsx';
import QuickActionButton from '../containers/QuickActionButton.jsx';
import AgentMonitor from './AgentMonitor.jsx';

import Logo from '../assets/jungabyte_logo_dark.png';

const ENGINE_ICONS = {
	'undefined': '../assets/img/device-unknown-sm.png',
	'raspberry-pi3': '../assets/img/device-raspberry-pi3-sm.png',
	'raspberry-pi0': '../assets/img/device-raspberry-pi0-sm.png',
	'xeon-e3': '../assets/img/device-xeon-e3-sm.png',
	'xeon-e5': '../assets/img/device-xeon-e5-sm.png'
}

class SystemMonitor extends React.Component {
	constructor (props){
		super();
		console.log('[SystemMonitor] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			view_mode: 'table',
			// runtimes: {}
		}
		
	}

	componentDidMount(){
		this.eventHandlers = {
			'runtime-updated': (info)=>{
				console.log('[SystemMonitor] Got New Runtime Info!', info);
				this.setState({
					// 'runtimes': Object.assign({}, this.sys.runtimes)
				});
			}
		};

		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.on(eventName, this.eventHandlers[eventName]));

		this.sys.refreshRuntimeInfo();
	}

	componentDidUpdate(){
		
	}

	componentWillUnmount(){
		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.removeListener(eventName, this.eventHandlers[eventName]));
	}

	render(){
		return (
			<div>
				<Header as='h3'>
					<QuickActionButton color='blue' circular icon='ellipsis vertical' tooltip='More Actions' floated='right'/> System Monitor
				</Header>
				<Tab panes={
					[{
						menuItem: { key: 'agents', icon: 'table', content: 'Agents' },
						render: ()=>(<AgentTable history={this.props.history}/>)
					},
					{
						menuItem: { key: 'runtimes', icon: 'table', content: 'Runtimes' },
						render: ()=>(<RuntimeTable history={this.props.history}/>)
					},
					/*{
						menuItem: { key: 'map', icon: 'world', content: 'Map' },
						render: ()=>(<RuntimeMap history={this.props.history}/>)
					},*/
					{
						menuItem: { key: 'graph', icon: 'code branch', content: 'Graph' },
						render: ()=>(<AgentGraph history={this.props.history}/>)
					}]
				}/>

				<StreamViewer/>

				<Switch>
                    <Route path='/monitor/agent/:id' render={(props)=>(
                    	<Modal open={true} size='large' onClose={()=>props.history.push('/monitor')}>
                    		<Modal.Header>
                    			Agent {props.match.params.id}
                    		</Modal.Header>
                    		<Modal.Content>
                    			<AgentMonitor {...props}/>
                    		</Modal.Content>
                    	</Modal>
                    )}/>
                </Switch>
			</div>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<SystemMonitor {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)