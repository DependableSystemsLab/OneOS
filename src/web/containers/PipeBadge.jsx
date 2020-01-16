import React from 'react';
import { Segment, Button, Label, Grid, Icon, Dropdown } from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';

const COLOR_MAP = {
	Running: 'green',
	Paused: 'yellow',
	Exited: 'red'
}

class PipeBadge extends React.Component {
	constructor (props){
		super();
		console.log('[PipeBadge] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			// agents: {},
			isLoading: false
		}
	}

	componentDidMount(){
		console.log('[PipeBadge] Component Mounted', this.props);
	}

	componentDidUpdate(prevProps, prevState, snapshot){
	}

	componentWillUnmount(){
	}

	render (){
		let source = this.props.pipe.source;
		let sink = this.props.pipe.sink;

		let sourceAgent = this.sys.agents[source.agent];
		let sinkAgent = this.sys.agents[sink.agent];

		//console.log(this.sys.agents, source.agent, sink.agent);
		return (
			<Grid verticalAlign='middle'>
				<Grid.Column width={7} textAlign='right'>
					<Button compact color={ sourceAgent ? COLOR_MAP[sourceAgent.status] : 'grey' }>
						{source.agent}
					</Button>
					<Label>
						{source.channel}
					</Label>
				</Grid.Column>
				<Grid.Column width={2} textAlign='center'>
					{(1000*this.sys.pipes[this.props.pipe.id].stat.fpms).toFixed(1)} FPS
					<Dropdown trigger={<Button compact icon='arrow right' loading={this.state.isLoading}/>} icon={null}>
						<Dropdown.Menu>
							<Dropdown.Item onClick={(e)=>this.sys.destroyPipe(this.props.pipe.id).then(()=>this.setState({ isLoading: true }))}>
								<Icon name='trash'/> Destroy Pipe
							</Dropdown.Item>
						</Dropdown.Menu>
					</Dropdown>
					{(this.sys.pipes[this.props.pipe.id].stat.bytes/1000000).toFixed(1)} MB
				</Grid.Column>
				<Grid.Column width={7} textAlign='left'>
					<Label>
						{sink.channel}
					</Label>
					<Button compact color={ sinkAgent ? COLOR_MAP[sinkAgent.status] : 'grey' }>
						{sink.agent}
					</Button>
				</Grid.Column>
			</Grid>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<PipeBadge {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)