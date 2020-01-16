import React from 'react';
import {Grid, Card, Table, List, Header, Icon, Statistic, Divider} from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';
import Device3DView from '../components/Device3DView.jsx';
import D3Progress from '../components/D3Progress.jsx';
import RuntimeBadge from '../containers/RuntimeBadge.jsx';
import AgentBadge from '../containers/AgentBadge.jsx';

// import Logo from '../assets/jungabyte_logo_dark.png';

function getBatteryIcon(level){
	if (level > 0.95) return <Icon name='battery four'/>;
	else if (level > 0.70) return <Icon name='battery three'/>;
	else if (level > 0.45) return <Icon name='battery two' />;
	else if (level > 0.20) return <Icon name='battery one' />;
	else if (level > 0.05) return <Icon name='battery zero'/>;
}

class Home extends React.Component {
	constructor (props){
		super();
		console.log('[Home] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			// runtimes: {}
		}
		
	}

	componentDidMount(){
		this.eventHandlers = {
			'runtime-updated': (info)=>{
				console.log('[Home] Got New Runtime Info!', info);
				this.setState({
					// 'runtimes': Object.assign({}, this.sys.runtimes)
				});
			},
			'sensor-updated': (sensors)=>{
				console.log('[Home] Sensor Updated', sensors);
				this.setState({});
			}
		};

		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.on(eventName, this.eventHandlers[eventName]));

		this.sys.refreshRuntimeInfo();
		// this.timer = setInterval(()=>{
		// 	this.setState({});
		// }, 200);
	}

	componentDidUpdate(){
		
	}

	componentWillUnmount(){
		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.removeListener(eventName, this.eventHandlers[eventName]));

		// clearInterval(this.timer);
	}

	render(){
		let cpuPercent = (this.sys.resource.cpu.used*100/this.sys.resource.cpu.total).toFixed(1) + ' %';
		let memPercent = (this.sys.resource.memory.used*100/this.sys.resource.memory.total).toFixed(1) + ' %';

		return (
			<div>
				<Grid stackable columns={2}>
					<Grid.Column width={5}>
						<Card fluid>
							<Card.Content>
								<Card.Header>System</Card.Header>
								<Divider/>
								<Statistic.Group size='mini' horizontal>
									<Statistic>
								  		<Statistic.Value>{this.sys.resource.cpu.used.toFixed(0)+' / '+this.sys.resource.cpu.total.toFixed(0)+' MHz'} <small>({cpuPercent})</small></Statistic.Value>
								  		<Statistic.Label>CPU Usage</Statistic.Label>
								  	</Statistic>
								  	<Statistic>
								  		<Statistic.Value>{(this.sys.resource.memory.used/1e9).toFixed(3)+' / '+(this.sys.resource.memory.total/1e9).toFixed(3)+' GB'} <small>({memPercent})</small></Statistic.Value>
								  		<Statistic.Label>Memory Usage</Statistic.Label>
								  	</Statistic>
							  		<Statistic>
								  		<Statistic.Value>{Object.keys(this.sys.runtimes).length}</Statistic.Value>
								  		<Statistic.Label>Runtimes in the cluster</Statistic.Label>
								  	</Statistic>
								  	<Statistic>
								  		<Statistic.Value>{Object.keys(this.sys.agents).length}</Statistic.Value>
								  		<Statistic.Label>Agents running</Statistic.Label>
								  	</Statistic>
								  </Statistic.Group>
							</Card.Content>
						</Card>
					</Grid.Column>

					<Grid.Column width={5}>
						<Card fluid>
							<Card.Content>
								<Card.Header>Cluster</Card.Header>
								<Divider/>
								<Table celled>
								  <Table.Header>
								      <Table.Row>
					  				      <Table.HeaderCell>
					  				        Node ID
					  				      </Table.HeaderCell>
					  				      <Table.HeaderCell>
					  				        Platform
					  				      </Table.HeaderCell>
					  				      <Table.HeaderCell>
					  				        Cores
					  				      </Table.HeaderCell>
					  				      <Table.HeaderCell>
						  				    CPU Usage
						  				  </Table.HeaderCell>
						  				  <Table.HeaderCell>
						  				    Memory Usage
						  				  </Table.HeaderCell>
					      			  </Table.Row>
								    </Table.Header>
								    <Table.Body>
									    {
						              		Object.values(this.sys.runtimes)
						              			.map((runtime, index)=>(
						              				<Table.Row key={index}>
          				  								<Table.Cell>
          				  									{ runtime.id }
          				  								</Table.Cell>
          				  								<Table.Cell>
          				  									{ runtime.device.arch } { runtime.device.platform }
          				  								</Table.Cell>
          				  								<Table.Cell>
          				  									{runtime.device.cpus.length} &#215; {(runtime.device.cpu_average_speed / 1000).toFixed(2)} GHz
          				  								</Table.Cell>
          				  								<Table.Cell>
							              				    <D3Progress percent={(runtime.stat.cpu + runtime.stat.agent_cpu + runtime.stat.daemon_cpu)}/>
							              				  	{(runtime.stat.cpu + runtime.stat.agent_cpu + runtime.stat.daemon_cpu).toFixed(1)} %
							              				  </Table.Cell>
							              				  <Table.Cell>
							              				  	<D3Progress percent={(((runtime.stat.memory + runtime.stat.agent_memory + runtime.stat.daemon_memory) / 10000) / runtime.limit_memory)}/>
							              				  	{((runtime.stat.memory + runtime.stat.agent_memory + runtime.stat.daemon_memory) / 1000000).toFixed(2)} / {runtime.limit_memory} MB
							              				  </Table.Cell>
          				  							</Table.Row>
						              			))
							            }
								    </Table.Body>
								</Table>
							</Card.Content>
						</Card>

						<Card fluid>
							<Card.Content>
								<Card.Header>Agents</Card.Header>
								<Divider/>
								<Table celled>
								  <Table.Header>
								      <Table.Row>
					  				      <Table.HeaderCell>
					  				        Agent ID
					  				      </Table.HeaderCell>
					  				      <Table.HeaderCell>
					  				        Node
					  				      </Table.HeaderCell>
					  				      <Table.HeaderCell>
						  				    CPU Usage
						  				  </Table.HeaderCell>
						  				  <Table.HeaderCell>
						  				    Memory Usage
						  				  </Table.HeaderCell>
					      			  </Table.Row>
								    </Table.Header>
								    <Table.Body>
									    {
						              		Object.values(this.sys.agents)
						              			.map((agent, index) => {
						              				let runtime = this.sys.runtimes[agent.runtime];

						              				return (
							              				<Table.Row key={index}>
	          				  								<Table.Cell>
	          				  									{ agent.isDaemon ?
	          				  										<Icon name="gavel"/> : null
	          				  									}

	          				  									{ agent.id }
	          				  								</Table.Cell>
	          				  								<Table.Cell>
	          				  									{ agent.runtime }
	          				  								</Table.Cell>
	          				  								<Table.Cell>
								              				    <D3Progress percent={agent.stat.cpu}/>
								              				  	{agent.stat.cpu.toFixed(1)} %
								              				  </Table.Cell>
								              				  <Table.Cell>
								              				  	<D3Progress percent={((agent.stat.memory / 10000) / runtime.limit_memory)}/>
								              				  	{(agent.stat.memory / 1000000).toFixed(2)} / {runtime.limit_memory} MB
								              				  </Table.Cell>
	          				  							</Table.Row>
							              			)
						              			})
							            }
								    </Table.Body>
								</Table>
							</Card.Content>
						</Card>
					</Grid.Column>
					{/*<Grid.Column width={6}>
						<Card fluid>
							<Card.Content>
								<Card.Header>Your Device</Card.Header>
								<Divider/>
								<Statistic.Group size='mini' horizontal>
							  		<Statistic>
								  		<Statistic.Value>{this.sys.sensors.battery.charging ? <Icon name='bolt'/> : getBatteryIcon(this.sys.sensors.battery.level)} {(100*this.sys.sensors.battery.level).toFixed(0)} %</Statistic.Value>
								  		<Statistic.Label>Battery</Statistic.Label>
								  	</Statistic>
								  	{
								  		this.sys.sensors.geolocation.lat ?
								  		(<Statistic>
									  		<Statistic.Value>{this.sys.sensors.geolocation.lat.toFixed(7)}, {this.sys.sensors.geolocation.long.toFixed(7)}</Statistic.Value>
									  		<Statistic.Label>GPS Location</Statistic.Label>
									  	</Statistic>) : null
								  	}
								  	{
								  		this.sys.sensors.acceleration.x ?
								  		(<Statistic>
									  		<Statistic.Value>{this.sys.sensors.acceleration.x.toFixed(3)}, {this.sys.sensors.acceleration.y.toFixed(3)}, {this.sys.sensors.acceleration.z.toFixed(3)}</Statistic.Value>
									  		<Statistic.Label>Acceleration</Statistic.Label>
									  	</Statistic>) : null
								  	}
									{
										this.sys.sensors.orientation.alpha ?
										(<Statistic>
									  		<Statistic.Value>{this.sys.sensors.orientation.alpha.toFixed(3)}, {this.sys.sensors.orientation.beta.toFixed(3)}, {this.sys.sensors.orientation.gamma.toFixed(3)}</Statistic.Value>
									  		<Statistic.Label>Orientation</Statistic.Label>
									  	</Statistic>) : null
									}
								    {
								    	this.sys.sensors.rotationRate.alpha ?
								    	(<Statistic>
									  		<Statistic.Value>{this.sys.sensors.rotationRate.alpha.toFixed(3)}, {this.sys.sensors.rotationRate.beta.toFixed(3)}, {this.sys.sensors.rotationRate.gamma.toFixed(3)}</Statistic.Value>
									  		<Statistic.Label>RotationRate</Statistic.Label>
									  	</Statistic>) : null
								    }
								  </Statistic.Group>
							</Card.Content>
							<Card.Content>
								<Device3DView/>
							</Card.Content>
						</Card>
					</Grid.Column>*/}
				</Grid>
			</div>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<Home {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)