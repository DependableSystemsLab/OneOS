import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Table, Header, List, Icon, Progress, Popup } from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';
import ChannelButton from './ChannelButton.jsx';
import AgentControl from './AgentControl.jsx';
import D3Progress from '../components/D3Progress.jsx';

class AgentTable extends React.Component {
	constructor (props){
		super();
		console.log('[AgentTable] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			// runtimes: {},
			// agents: {},
			// pipes: {}
		}
	}

	componentDidMount(){
		console.log('[AgentTable] Component Mounted', this.props);
		this.eventHandlers = {
			'runtime-updated': (info)=>{
				console.log('[AgentTable] Got New Agent Info!', info);
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
  				      Agent ID
  				    </Table.HeaderCell>
              <Table.HeaderCell>
                Input Channels
              </Table.HeaderCell>
              <Table.HeaderCell>
                Output Channels
              </Table.HeaderCell>
              <Table.HeaderCell>
                Pipes
              </Table.HeaderCell>
              <Table.HeaderCell>
                Status
              </Table.HeaderCell>
  				    <Table.HeaderCell>
  				      CPU Usage
  				    </Table.HeaderCell>
  				    <Table.HeaderCell>
  				      Memory Usage
  				    </Table.HeaderCell>
              <Table.HeaderCell>
                Runtime
              </Table.HeaderCell>
      			  </Table.Row>
			    </Table.Header>
			    <Table.Body>
			    {
        		Object.values(this.sys.agents)
        			.map((agent, index)=>{
                var runtime = this.sys.runtimes[agent.runtime];
                var pipes = Object.values(this.sys.pipes).filter(pipe => (pipe.source.agent === agent.id || pipe.sink.agent === agent.id ));

                return (
          				<Table.Row key={index}>
          				  <Table.Cell>
                      {
                        agent.isDaemon ? null : <AgentControl agent={agent}/>
                      }

                      {
                        agent.isDaemon ? <Popup content="This is a Kernel Agent" trigger={<Icon name="gavel"/>} flowing/> : null
                      }
                      <NavLink to={'/monitor/agent/' + agent.id}>
          				      {agent.id}
                      </NavLink>
          				  </Table.Cell>
                    <Table.Cell>
                      {
                        agent.input
                        .map(chan => (<ChannelButton key={chan} agentId={agent.id} direction="input" channel={chan}/>))
                        .reduce((prev, curr) => [prev, ', ', curr])
                      }
                    </Table.Cell>
                    <Table.Cell>
                      {
                        agent.output
                        .map(chan => (<ChannelButton key={chan} agentId={agent.id} direction="output" channel={chan}/>))
                        .reduce((prev, curr) => [prev, ', ', curr])
                      }
                    </Table.Cell>
                    <Table.Cell>
                      {
                        pipes.map(pipe => (pipe.source.agent != agent.id ? pipe.source.agent + ":" : "") + pipe.source.channel + " -> " + (pipe.sink.agent != agent.id ? pipe.sink.agent + ":" : "") + pipe.sink.channel).join(', ')
                      }
                    </Table.Cell>
                    <Table.Cell>
                      { agent.status }
                    </Table.Cell>
          				  <Table.Cell>
          				    <D3Progress percent={agent.stat.cpu}/>
          				  	{agent.stat.cpu.toFixed(1)} %
          				  </Table.Cell>
          				  <Table.Cell>
          				  	<D3Progress percent={((agent.stat.memory / 10000) / runtime.limit_memory)}/>
          				  	{((agent.stat.memory / 10000) / runtime.limit_memory).toFixed(2) } %
          				  	({(agent.stat.memory / 1000000).toFixed(2)} / {runtime.limit_memory} MB)
          				  </Table.Cell>
          				  <Table.Cell>
                      {runtime.id}
          				  </Table.Cell>
	      			    </Table.Row>)
              })
        	}
			    </Table.Body>
          <Table.Footer>
            <Table.Row>
              <Table.HeaderCell colSpan={5}>
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
            </Table.Row>
          </Table.Footer>
			  </Table>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<AgentTable {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)