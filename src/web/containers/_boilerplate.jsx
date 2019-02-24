import React from 'react';
import { Segment } from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';

class OneOSComponent extends React.Component {
	constructor (props){
		super();
		console.log('[OneOSComponent] Page Initialized', props);
		this.sys = props.sys;

		this.state = {}
	}

	componentDidMount(){
		console.log('[OneOSComponent] Component Mounted', this.props);
		this.eventHandlers = {
			'runtime-updated': (info)=>{
				console.log('[OneOSComponent] Got New Runtime Info!', info);
				this.setState({});
			}
		};

		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.on(eventName, this.eventHandlers[eventName]));
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		
	}

	componentWillUnmount(){
		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.removeListener(eventName, this.eventHandlers[eventName]));
	}

	render (){
		return (
			<Segment>
			</Segment>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<OneOSComponent {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)