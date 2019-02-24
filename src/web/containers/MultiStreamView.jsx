import React from 'react';
import { Segment } from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';

class MultiStreamView extends React.Component {
	constructor (props){
		super();
		console.log('[MultiStreamView] Page Initialized', props);
		this.sys = props.sys;

		this.state = {}
	}

	componentDidMount(){
		console.log('[MultiStreamView] Component Mounted', this.props);
		this.eventHandlers = {
			'runtime-updated': (info)=>{
				console.log('[MultiStreamView] Got New Runtime Info!', info);
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
		(sys)=>(<MultiStreamView {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)