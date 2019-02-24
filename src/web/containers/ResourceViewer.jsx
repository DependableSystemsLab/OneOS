import React from 'react';
import {Grid, Card, Table, List, Button, Header, Icon, Image, Menu, Segment, Sidebar} from 'semantic-ui-react';

// import OneOSService from '../services/OneOSService.jsx';
import ResourceGraph from './ResourceGraph.jsx';

// import styles from './ResourceViewer.css';

class ResourceViewer extends React.Component {
	constructor (props){
		super();
		console.log('[ResourceViewer] Page Initialized for '+props.agents);
		// this.sys = props.sys;

		this.state = {
			view_mode: 'cpu',
			lines: []
		}
	}

	componentDidMount(){
		console.log('[ResourceViewer] Component Mounted '+this.props.agents);
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		
	}

	componentWillUnmount(){
	}

	setViewMode (mode){
		this.setState({
			view_mode: mode
		})
	}

	render (){
		return (
			<Segment>
				<Button.Group fluid>
					<Button onClick={(e)=>this.setViewMode('cpu')}
						active={this.state.view_mode==='cpu'}>CPU</Button>
					<Button.Or/>
					<Button onClick={(e)=>this.setViewMode('memory')}
						active={this.state.view_mode==='memory'}>Memory</Button>
				</Button.Group>
				<ResourceGraph resource={this.state.view_mode} agents={this.props.agents}/>
			</Segment>
		)
	}
}

export default ResourceViewer;

// export default (props)=>(
// 	<OneOSService.Consumer>
// 	{
// 		(sys)=>(<ResourceViewer {...props} sys={sys}/>)
// 	}
// 	</OneOSService.Consumer>
// )