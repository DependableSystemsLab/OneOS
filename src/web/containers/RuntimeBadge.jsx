import React from 'react';
import { Dropdown, Button, Icon, Label, Popup, Divider, List } from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';
import DeviceIcon from '../components/DeviceIcon.jsx';

const COLOR_MAP = {
	Running: 'green',
	Paused: 'yellow',
	Exited: 'red'
}

function RuntimeTypeIcon(props){
	switch (props.type){
		case 'kernel':
			return <Icon name="gavel"/>
		case 'standard':
			return <Icon name="hdd"/>
		case 'web-worker':
			return <Icon name="mobile alternate"/>
		default:
			return null;
	}
}

class RuntimeBadge extends React.Component {
	constructor (props){
		super();
		console.log('[RuntimeBadge] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			migrateTo: ''
		}
	}

	componentDidMount(){
		console.log('[RuntimeBadge] Component Mounted', this.props);
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		
	}

	componentWillUnmount(){
	}

	runAgent (file_name){
		this.sys.runAgentOnRuntime('code/basic/'+file_name, [], this.props.runtime.id);
	}

	render (){
		let sumMemory = (this.props.runtime.stat.memory+this.props.runtime.stat.agent_memory+this.props.runtime.stat.daemon_memory) / 1000000;
		let memPercent = (100 * sumMemory / this.props.runtime.limit_memory).toFixed(0);
		return (
			<React.Fragment>
				<Dropdown trigger={
							<Button as='div' labelPosition='right' size='small' compact fluid>
								<Button color={COLOR_MAP[this.props.runtime.status]} compact>
									<RuntimeTypeIcon type={this.props.runtime.type}/>
									<DeviceIcon deviceLabel={this.props.runtime.device_label}/>
									{this.props.runtime.id}
								</Button>
								<Label as='a' basic color={COLOR_MAP[this.props.runtime.status]} pointing='left'>
									{(this.props.runtime.stat.cpu + this.props.runtime.stat.agent_cpu + this.props.runtime.stat.daemon_cpu).toFixed(0)} %
								</Label>
								<Label as='a' basic color={COLOR_MAP[this.props.runtime.status]} pointing='left'>
									{sumMemory.toFixed(0)} MB ({memPercent} %)
								</Label>
							</Button>
					} pointing='top left' icon={null}>
					<Dropdown.Menu>
						<Dropdown.Item>
							<Dropdown trigger={
								<React.Fragment>
									<Icon name='play'/> Run
								</React.Fragment>
							} direction='right' icon={null}>
								<Dropdown.Menu>
								{
									this.sys.codes.map((item, index)=><Dropdown.Item key={index} text={item.name} onClick={(e)=>this.runAgent(item.name)}/>)
								}
								</Dropdown.Menu>
							</Dropdown>
						</Dropdown.Item>
					</Dropdown.Menu>
				</Dropdown>
				{
					this.props.verbose ?
					(<React.Fragment>
						<Divider/>
						<Label.Group tag>
							<Popup trigger={
								<Label as='a'>{this.props.runtime.device.arch} {this.props.runtime.device.platform}</Label>
							} content={this.props.runtime.device.os}/>
							<Popup trigger={
								<Label as='a'>{this.props.runtime.device.cpus.length} &#215; {(this.props.runtime.device.cpu_average_speed / 1000).toFixed(2)} GHz</Label>
							}>
								<List>
									{
										this.props.runtime.device.cpus.map((cpu, index)=>{
											return <List.Item key={index} content={cpu.model+' ('+(cpu.speed/1000).toFixed(1)+' GHz)'}/>
										})
									}
								</List>
							</Popup>
						</Label.Group>
					</React.Fragment>) : null
				}
			</React.Fragment>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<RuntimeBadge {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)