import React from 'react';
import { Icon, Button, Dropdown } from 'semantic-ui-react';

const DATA_TYPES = [
	{ key: 'object', value: 'object', text: 'Object' },
	{ key: 'array', value: 'array', text: 'Array' },
	{ key: 'string', value: 'string', text: 'String' },
	{ key: 'number', value: 'number', text: 'Number' },
	{ key: 'null', value: 'null', text: 'Null' },
];

function getType(obj){
	if (typeof obj === 'object'){
		if (obj instanceof Array) return 'array';
		else if (obj === null) return 'null';
		else return 'object';
	}
	else return typeof obj;
}

function initObject(type){
	switch (type){
		case 'object':
			return {};
		case 'array':
			return [];
		case 'string':
			return '';
		case 'number':
			return 0;
		case 'null':
			return null;
	}
}

export default class JSONInput extends React.Component {
	constructor (props){
		super();
		this.state = {
			type: getType(props.value),
			value: props.value,
			nextType: 'object',
			nextKey: ''
		}
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		if (typeof prevProps.value !== typeof this.props.value){
			console.log("Type Changed");
		}
	}

	changeType (type){
		console.log('Trying to change type to '+type);
		switch (this.state.type){
			case 'object':
				if (Object.keys(this.props.value).length > 0) return;
				break;
			case 'array':
				if (this.props.value.length > 0) return;
			case 'string':
				if (this.props.value.length > 0) return;
			case 'number':
				break;
			case 'null':
				break;
		}
		this.setState({
			type: type
			// value: initObject(type)
		});

		if (this.props.onChange) this.props.onChange({
			value: initObject(type)
		});
	}

	// setValue (value){
	// 	if (this.state.type === 'string' || this.state.type === 'number'){
	// 		// this.setState({
	// 		// 	value: value
	// 		// });
	// 		// console.log('Updated Value', value);

	// 		if (this.props.onChange) this.props.onChange({
	// 			value: value
	// 		});
	// 	}
	// }

	addProperty (){
		if (this.state.type === 'object' && this.state.nextKey){
			if (!(this.state.nextKey in this.props.value)){
				let value = Object.assign({}, this.props.value);
				value[this.state.nextKey] = initObject(this.state.nextType);

				// this.setState({
				// 	value: value
				// });
				console.log('Updated Value');

				if (this.props.onChange) this.props.onChange({
					value: value
				});
			}
		}
	}

	setProperty (key, prop){
		if (this.state.type === 'object' && key){
			if (key in this.props.value){
				let value = Object.assign({}, this.props.value);
				value[key] = prop;
				// this.setState({
				// 	value: value
				// });
				console.log('Updated Value');
				if (this.props.onChange) this.props.onChange({
					value: value
				});
			}
		}
	}

	setArrayItem (index, item){
		if (this.state.type === 'array'){
			let value = this.props.value.slice();
			value.splice(index, 1, item);
			// this.setState({
			// 	value: value
			// });
			console.log('Updated Value');
			if (this.props.onChange) this.props.onChange({
				value: value
			});
		}
	}

	addArrayItem(){
		if (this.state.type === 'array'){
			let value = this.props.value.slice();
			value.push(initObject(this.state.nextType));
			// this.setState({
			// 	value: value
			// });
			console.log('Updated Value', value);
			if (this.props.onChange) this.props.onChange({
				value: value
			});
		}
	}

	render (){
		let input;
		if (this.state.type === 'object'){
			input = (
				<div style={{ border: '1px solid #aaa', boxShadow: '0px 0px 5px #aaa' }}>
					{
						Object.keys(this.props.value)
							.map((key, index)=>(
								<div key={index}>
									<span>
										{key} :
									</span>
									<span>
										<JSONInput value={this.props.value[key]} onChange={(e)=>this.setProperty(key, e.value)}/>
									</span>
								</div>
							))
					}
					<div>
						<Dropdown placeholder='Type' selection options={DATA_TYPES} value={this.state.nextType} onChange={(e, data)=>this.setState({ nextType: data.value })}/>
						<span>
							<input type='text' value={this.state.nextKey} onChange={(e)=>this.setState({nextKey: e.target.value})}/>
						</span>
						<Button icon='add' onClick={(e)=>this.addProperty()}/>
					</div>
				</div>
			)
		}
		else if (this.state.type === 'array'){
			input = (
				<div>
					{
						this.props.value
							.map((item, index)=>(
								<JSONInput key={index} value={item} onChange={(e)=>this.setArrayItem(index, e.value)}/>
							))
					}
					<div>
						<Dropdown placeholder='Type' selection options={DATA_TYPES} value={this.state.nextType} onChange={(e, data)=>this.setState({ nextType: data.value })}/>
						<Button icon='add' onClick={(e)=>this.addArrayItem()}/>
					</div>
				</div>
			)
		}
		else if (this.state.type === 'null'){
			input = <span>NULL</span>
		}
		else if (this.state.type === 'string'){
			input = <input value={this.props.value} onChange={(e)=>this.props.onChange({ value: e.target.value })}/>
		}
		else if (this.state.type === 'number'){
			input = <input value={this.props.value} onChange={(e)=>this.props.onChange({ value: e.target.value })} type='number'/>
		}

		return (
			<div>
				<Dropdown placeholder='Type' selection options={DATA_TYPES} value={this.state.type} onChange={(e, data)=>this.changeType(data.value)}/>
				{input}
			</div>
		)
	}
}