import React from 'react';
import AceEditor from 'react-ace';
import {Grid, List, Breadcrumb, Form, Button, Header, Icon, Image, Menu, Segment, Sidebar, Popup} from 'semantic-ui-react';
import 'brace/mode/javascript';
import 'brace/mode/python';
import 'brace/theme/github';

import OneOSService from '../services/OneOSService.jsx';

import Logo from '../assets/jungabyte_logo_dark.png';

function canExecute(path){
	return (['.js', '.py'].indexOf(path.substr(-3)) > -1)
}

class Applications extends React.Component {
	constructor (props){
		super();
		console.log('[Applications] Page Initialized', props);
		this.sys = props.sys;

		this.state = {};
		
	}

	componentDidMount(){
		this.eventHandlers = {
			'runtime-updated': (info)=>{
				console.log('[Applications] Got New Runtime Info!', info);
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

	render(){
		return (
			<div>
				<Header as='h3'>Applications</Header>
			</div>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<Applications {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)