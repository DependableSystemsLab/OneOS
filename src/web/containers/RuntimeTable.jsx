import React from 'react';
import { NavLink } from 'react-router-dom';
import { Table, Header, List, Icon, Progress } from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';
import RuntimeBadge from '../containers/RuntimeBadge.jsx';
import AgentBadge from '../containers/AgentBadge.jsx';
import PipeBadge from '../containers/PipeBadge.jsx';
import D3Progress from '../components/D3Progress.jsx';

class RuntimeTable extends React.Component {
	constructor (props){
		super();
		console.log('[RuntimeTable] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			// runtimes: {},
			// agents: {},
			// pipes: {}
		}
	}

	componentDidMount(){
		console.log('[RuntimeTable] Component Mounted', this.props);
		this.eventHandlers = {
			'runtime-updated': (info)=>{
				console.log('[RuntimeTable] Got New Runtime Info!', info);
				this.setState({
					// runtimes: Object.assign({}, this.sys.runtimes),
					// agents: Object.assign({}, this.sys.agents),
					// pipes: Object.assign({}, this.sys.pipes)
				});
			}
		};

		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.on(eventName, this.eventHandlers[eventName]));

		this.sys.refreshRuntimeInfo();
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		
	}

	componentWillUnmount(){
		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.removeListener(eventName, this.eventHandlers[eventName]));
	}

	render (){
		return (
			<Table celled>
			    <Table.Header>
			      <Table.Row>
  				    <Table.HeaderCell>
  				      Runtime
  				    </Table.HeaderCell>
  				    <Table.HeaderCell>
  				      CPU Usage
  				    </Table.HeaderCell>
  				    <Table.HeaderCell>
  				      Memory Usage
  				    </Table.HeaderCell>
  				    <Table.HeaderCell>
  				      Score
  				    </Table.HeaderCell>
  				    <Table.HeaderCell>
  				      Agents
  				    </Table.HeaderCell>
  				    <Table.HeaderCell>
  				      Daemons
  				    </Table.HeaderCell>
  				    <Table.HeaderCell>
  				      Pipes
  				    </Table.HeaderCell>
      			  </Table.Row>
			    </Table.Header>
			    <Table.Body>
			    {
              		Object.values(this.sys.runtimes)
              			.map((runtime, index)=>(
              				<Table.Row key={index}>
              				  <Table.Cell>
              				    <Header as='h3'>{runtime.id}</Header>
              				    <RuntimeBadge runtime={runtime} verbose={true}/>
              				  </Table.Cell>
              				  <Table.Cell>
              				    <D3Progress percent={(runtime.stat.cpu + runtime.stat.agent_cpu + runtime.stat.daemon_cpu)}/>
              				  	{(runtime.stat.cpu + runtime.stat.agent_cpu + runtime.stat.daemon_cpu).toFixed(1)} %
              				  </Table.Cell>
              				  <Table.Cell>
              				  	<D3Progress percent={(((runtime.stat.memory + runtime.stat.agent_memory + runtime.stat.daemon_memory) / 10000) / runtime.limit_memory)}/>
              				  	{(((runtime.stat.memory + runtime.stat.agent_memory + runtime.stat.daemon_memory) / 10000) / runtime.limit_memory).toFixed(2) } %
              				  	({((runtime.stat.memory + runtime.stat.agent_memory + runtime.stat.daemon_memory) / 1000000).toFixed(2)} / {runtime.limit_memory} MB)
              				  </Table.Cell>
              				  <Table.Cell>
              				    {this.sys.getRuntimeScore(runtime)}
              				  </Table.Cell>
              				  <Table.Cell>
              				    <List divided>
              				    {
              				    	runtime.agents.map((agent)=>(
              				    		<List.Item key={agent.id}>
              				    		  <List.Content>
              				    		  	<AgentBadge agent={agent} 
              				    		  		onClickMore={()=>this.props.history.push('/monitor/agent/'+agent.id)}/>
              				    		  </List.Content>
              				      		</List.Item>
              				    	))
              				    }
              				    </List>
              				  </Table.Cell>
              				  <Table.Cell>
              				  	<List divided>
              				    {
              				    	runtime.daemons.map((agent)=>(
              				    		<List.Item key={agent.id}>
              				    		  <List.Content>
              				    		  	<AgentBadge agent={agent} 
              				    		  		onClickMore={()=>this.props.history.push('/monitor/agent/'+agent.id)}>
              				    		  	</AgentBadge>
              				    		  </List.Content>
              				      		</List.Item>
              				    	))
              				    }
              				    </List>
              				  </Table.Cell>
              				  <Table.Cell>
              				  	<List divided>
              				    {
              				    	runtime.pipes.map((pipe)=>(
              				    		<List.Item key={pipe.id}>
              				    		  <PipeBadge pipe={pipe}/>
              				      		</List.Item>
              				    	))
              				    }
              				    </List>
              				  </Table.Cell>
			      			</Table.Row>
              			))
              	}
			    </Table.Body>
          <Table.Footer>
            <Table.Row>
              <Table.HeaderCell>
                <h4>System</h4>
              </Table.HeaderCell>
              <Table.HeaderCell>
                {this.sys.resource.cpu.used.toFixed(0)} / {this.sys.resource.cpu.total.toFixed(0)} MHz
                ({(this.sys.resource.cpu.used*100/this.sys.resource.cpu.total).toFixed(1)} %)

                <D3Progress percent={(this.sys.resource.cpu.used*100/this.sys.resource.cpu.total)}/>
              </Table.HeaderCell>
              <Table.HeaderCell>
                {(this.sys.resource.memory.used/1e9).toFixed(3)} / {(this.sys.resource.memory.total/1e9).toFixed(3)} GB 
                ({(this.sys.resource.memory.used*100/this.sys.resource.memory.total).toFixed(1)} %)

                <D3Progress percent={(this.sys.resource.memory.used*100/this.sys.resource.memory.total)}/>
              </Table.HeaderCell>
              <Table.HeaderCell>
              </Table.HeaderCell>
              <Table.HeaderCell>
              </Table.HeaderCell>
              <Table.HeaderCell>
              </Table.HeaderCell>
              <Table.HeaderCell>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Footer>
			  </Table>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<RuntimeTable {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)