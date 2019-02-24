import React from 'react';
import {List, Button, Card, Container, Dropdown, Search, TransitionablePortal, 
	Header, Icon, Popup, Image, Menu, Segment, Sidebar, Label, Responsive, Divider} from 'semantic-ui-react';
import { Route, Link, NavLink } from 'react-router-dom';

import AuthService from '../services/AuthService.jsx';
import OneOSService from '../services/OneOSService.jsx';

import ShellClient from '../containers/ShellClient.jsx';

import LogoImage from '../assets/jungabyte_logo_dark.png';

const Logo = <Image size='mini' src={LogoImage} style={{ marginRight: '1.5em' }} />

function getBatteryIcon(level){
	if (level > 0.95) return <Icon name='battery four'/>;
	else if (level > 0.70) return <Icon name='battery three'/>;
	else if (level > 0.45) return <Icon name='battery two' />;
	else if (level > 0.20) return <Icon name='battery one' />;
	else if (level > 0.05) return <Icon name='battery zero'/>;
}

class Base extends React.Component {
	constructor(props){
		super();
		this.state = { 
			visible: false,
			leftNavOpen: false,
			rightNavOpen: false,
			portalOpen: false,
			portalMinimized: false
		}
		console.log('[Base] Page Initialized', props);
		// props should contain:
		//   - history (for navigation)
		//   - auth (for authenticating with server)
		//   - sys (OneOS web client)
		this.sys = props.sys;

		// if (!props.auth.session.username){
		// 	props.history.push('/login');
		// }

		// this.onLogout = function(){
		// 	console.log('[Base] logout event emitted by AuthService')
		// 	props.history.push('/login');
		// }
	}

	componentDidMount(){
		this.eventHandlers = {
			'runtime-updated': (info)=>{
				console.log('[Base] Got New Runtime Info!', info);
				this.setState({});
			},
			'sensor-updated': (sensors)=>{
				console.log(sensors);
				this.setState({});
			},
			'worker-updated': (worker)=>{
				this.setState({});
			}
		};

		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.on(eventName, this.eventHandlers[eventName]));

		this.sys.refreshRuntimeInfo();

		// this.props.auth.on('logout', this.onLogout);
	}
	componentWillUnmount(){
		// this.props.auth.removeListener('logout', this.onLogout);
		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.removeListener(eventName, this.eventHandlers[eventName]));
	}

	handleButtonClick(){ 
		this.setState({ visible: !this.state.visible }) 
	}

	handleSidebarHide(){ 
		this.setState({ visible: false })
	}

	toggleLeftNav(){
		this.setState({ 
			leftNavOpen: !this.state.leftNavOpen,
			rightNavOpen: false
		});
	}
	toggleRightNav(){
		this.setState({ 
			leftNavOpen: false,
			rightNavOpen: !this.state.rightNavOpen
		});
	}
	togglePortal(){
		this.setState({
			portalOpen: !this.state.portalOpen
		});
	}

	render(){
		const { leftNavOpen, rightNavOpen } = this.state
		const contentHeight = window.innerHeight - 41;

		let cpuPercent = (this.sys.resource.cpu.used*100/this.sys.resource.cpu.total).toFixed(1) + ' %';
		let memPercent = (this.sys.resource.memory.used*100/this.sys.resource.memory.total).toFixed(1) + ' %';

		return (
			<div>
				<Menu fixed='top' inverted>
			    	<Menu.Item as='a' onClick={(e)=>this.toggleLeftNav()}>
			    		<Icon name='sidebar' />
			    	</Menu.Item>
			        <Menu.Item as='a' header onClick={(e)=>this.props.history.push('/')}>
			          OneOS
			        </Menu.Item>

			        <Menu.Menu position='right'>
			        	<Responsive as={React.Fragment} {...Responsive.onlyComputer}>
			        		<Popup trigger={
			        			<Menu.Item>
				        			<Icon name='server'/> {cpuPercent}
				        		</Menu.Item>
				        	} content={'CPU '+this.sys.resource.cpu.used.toFixed(0)+' / '+this.sys.resource.cpu.total.toFixed(0)+' MHz'}/>
				        	<Popup trigger={
			        			<Menu.Item>
				        			<Icon name='microchip'/> {memPercent}
				        		</Menu.Item>
				        	} content={'Memory '+(this.sys.resource.memory.used/1e9).toFixed(3)+' / '+(this.sys.resource.memory.total/1e9).toFixed(3)+' GB'}/>
				        	<Popup trigger={
				        		<Menu.Item>
					        		{this.sys.sensors.battery.charging ? <Icon name='bolt'/> : getBatteryIcon(this.sys.sensors.battery.level)}
					        		{(100*this.sys.sensors.battery.level).toFixed(0)} %
					        	</Menu.Item>
				        	} content={this.sys.sensors.battery.charging ? 'Charging' : 'On Battery'}/>
				        	
				        	{
				        		window.Worker ?
				        		(
				        			<Popup trigger={
						        		<Menu.Item as='a' onClick={(e)=>this.sys.toggleWebRuntime()}>
						        			<Icon name={'toggle '+(this.sys.worker ? 'on':'off')}/>
							        	</Menu.Item>
						        	} content={'Turn '+(this.sys.worker ? 'OFF':'ON')+' WebWorker'} position='bottom right'/>
				        		) : null
				        	}
					    </Responsive>
					    <Popup trigger={
			        		<Menu.Item as='a' onClick={(e)=>this.togglePortal()}>
			        		<Icon name='terminal'/>
				        	</Menu.Item>
			        	} content='Terminal' position='bottom right'/>
				        <Menu.Item as='a' onClick={(e)=>this.toggleRightNav()}>
				        	<Icon name='user circle' />
				        	{this.props.auth.session.first_name || this.props.auth.session.username}
				        </Menu.Item>
				    </Menu.Menu>
			    </Menu>

		        <Sidebar.Pushable as={Segment} style={{ marginTop: '41px' }}>
		          <Sidebar
		            as={Menu}
		            animation='push'
		            direction='left'
		            inverted
		            onHide={()=>this.handleSidebarHide()}
		            vertical
		            visible={leftNavOpen}
		          >
		            <Menu.Item as='a' onClick={(e)=>this.props.history.push('/monitor')}>
		              <Icon name='dashboard' />
		              System Monitor
		            </Menu.Item>
		            <Menu.Item as='a' onClick={(e)=>this.props.history.push('/fs/')}>
		              <Icon name='folder open' />
		              File System
		            </Menu.Item>
		            <Menu.Item as='a' onClick={(e)=>this.props.history.push('/apps/')}>
		              <Icon name='th' />
		              Applications
		            </Menu.Item>

		            <Responsive as={React.Fragment} {...Responsive.onlyMobile}>
		            	<Divider/>
		            	<Popup trigger={
		        			<Menu.Item as='a'>
			        			<Icon name='server'/> <Label>{cpuPercent}</Label> CPU Usage
			        		</Menu.Item>
			        	} content={'CPU '+this.sys.resource.cpu.used.toFixed(0)+' / '+this.sys.resource.cpu.total.toFixed(0)+' MHz'}/>
			        	<Popup trigger={
		        			<Menu.Item>
			        			<Icon name='microchip'/> <Label>{memPercent}</Label> Memory Usage
			        		</Menu.Item>
			        	} content={'Memory '+(this.sys.resource.memory.used/1e9).toFixed(3)+' / '+(this.sys.resource.memory.total/1e9).toFixed(3)+' GB'}/>
			        	<Popup trigger={
			        		<Menu.Item>
				        		{this.sys.sensors.battery.charging ? <Icon name='bolt'/> : getBatteryIcon(this.sys.sensors.battery.level)}
				        		<Label>{(100*this.sys.sensors.battery.level).toFixed(0)} %</Label> Battery Level
				        	</Menu.Item>
			        	} content={this.sys.sensors.battery.charging ? 'Charging' : 'On Battery'}/>
			        	
			        	{
			        		window.Worker ?
			        		(
			        			<Popup trigger={
					        		<Menu.Item as='a' onClick={(e)=>this.sys.toggleWebRuntime()}>
					        			<Icon name={'toggle '+(this.sys.worker ? 'on':'off')}/> 
					        			{this.sys.worker ? <Label color='green'>LIVE</Label> : <Label color='grey'>DEAD</Label>}
					        			{this.sys.worker ? 'Kill':'Start'} Web Runtime
						        	</Menu.Item>
					        	} content={'Turn '+(this.sys.worker ? 'OFF':'ON')+' WebWorker'} position='bottom right'/>
			        		) : null
			        	}
		            </Responsive>
		          </Sidebar>

		          <Sidebar
		            as={Menu}
		            animation='overlay'
		            direction='right'
		            icon='labeled'
		            inverted
		            onHide={()=>this.handleSidebarHide()}
		            vertical
		            visible={rightNavOpen}
		            width='thin'
		          >
		            <Menu.Item as='a' onClick={(e)=>this.props.history.push('/profile')}>
		            	<Icon name='user circle'/>
		            	Profile
		            </Menu.Item>
		            <Menu.Item as='a' onClick={(e)=>this.props.history.push('/setting')}>
		            	<Icon name='setting'/>
		            	Settings
		            </Menu.Item>
		            <Menu.Item as='a' onClick={(e)=>this.props.auth.logout()}>
		            	<Icon name='log out'/>
		            	Log out
		            </Menu.Item>
		          </Sidebar>

		          <Sidebar.Pusher>
		            <Segment basic style={{ minHeight: contentHeight }}>
		              {this.props.children}
		            </Segment>

		            <TransitionablePortal onClose={(e)=>this.setState({ portalOpen: false })}
		            	open={this.state.portalOpen}>
		            	<div style={{ position: 'fixed', top: this.state.portalMinimized ? '90%':'45%', left: '7%', width: '86%', zIndex: 2000 }}>
		            		<Segment raised>
		            			<Menu size='mini' inverted color='blue' borderless>
									<Menu.Item position='right' onClick={(e)=>this.setState({ portalMinimized: !this.state.portalMinimized })}>
										<Icon name={'window '+(this.state.portalMinimized ? 'maximize' : 'minimize')}/>
									</Menu.Item>
								</Menu>
								<div style={this.state.portalMinimized ? { display: 'none'} : {}}>
									<ShellClient/>
								</div>
		            		</Segment>
		            	</div>
		            </TransitionablePortal>
		          </Sidebar.Pusher>
		        </Sidebar.Pushable>

		        <Segment inverted color='grey' size='tiny'>
		        	Copyright &#169; 2018-2019 Kumseok Jung. All rights reserved.
		        </Segment>
			</div>
		)
	}
}

// export default Base;

export default (props)=>(
	<AuthService.Consumer>
	{
		(auth)=>(
			<OneOSService.Consumer>
			{
				(sys)=>(<Base {...props} auth={auth} sys={sys}/>)
			}
			</OneOSService.Consumer>
		)
	}
	</AuthService.Consumer>
)