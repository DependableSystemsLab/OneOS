import React from 'react';
import { Segment } from 'semantic-ui-react';

export default class OneOSComponent extends React.Component {
	constructor (props){
		super();
		console.log('[OneOSComponent] Page Initialized', props);

		this.state = {
		}
	}

	componentDidMount(){
		console.log('[OneOSComponent] Component Mounted', this.props);
	}

	componentDidUpdate(prevProps, prevState, snapshot){
	}

	componentWillUnmount(){
	}

	render (){
		return (
			<Segment>
			</Segment>
		)
	}
}