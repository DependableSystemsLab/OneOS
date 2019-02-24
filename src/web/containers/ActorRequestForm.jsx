import React from 'react';
import { Form } from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';

class ActorRequestForm extends React.Component {
	constructor (props){
		super();
		console.log('[ActorRequestForm] Page Initialized', props);
		this.sys = props.sys;

		this.state = {}
	}

	componentDidMount(){
		console.log('[ActorRequestForm] Component Mounted', this.props);
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		
	}

	componentWillUnmount(){
	}

	render (){
		return (
			<Form>
				<Form.Field required>
					<label>Verb</label>
					<Input placeholder='verb'/>
				</Form.Field>
			</Form>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<ActorRequestForm {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)