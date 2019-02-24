import React from 'react';
import { Popup, Button, Dropdown, Form, Icon } from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';

class QuickActionButton extends React.Component {
	constructor (props){
		super();
		console.log('[QuickActionButton] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			// runtimes: {},
			// agents: {},
			// pipes: {},
			codes: [],
			selected_code: null,
			selected_code_args: '',
			selected_source: null,
			selected_sink: null
		}
	}

	componentDidMount(){
		console.log('[QuickActionButton] Component Mounted', this.props);
		this.eventHandlers = {
			'runtime-updated': (info)=>{
				console.log('[RuntimeMap] Got New Runtime Info!', info);
				this.setState({
					// runtimes: Object.assign({}, this.sys.runtimes),
					// agents: Object.assign({}, this.sys.agents),
					// pipes: Object.assign({}, this.sys.pipes)
				});
			}
		};

		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.on(eventName, this.eventHandlers[eventName]));

		this.refresh()
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		
	}

	componentWillUnmount(){
		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.removeListener(eventName, this.eventHandlers[eventName]));
	}

	refresh (){
    	this.sys.readFileSystem('/code/basic')
				.then((data)=>{
					console.log(data);
					if (data.type === 'directory'){
						this.setState({
							codes: data.content.filter((item)=>(item.type==='file'))
						});
					}
					else {
						throw new Error('Expecting a directory but got '+data.type);
					}
				})
				.catch((err)=>{
					console.log(err);
				})
    }

	render (){
		return (
			<Popup trigger={
				<Dropdown trigger={
					<Button icon={this.props.icon} circular={this.props.circular} color={this.props.color}/>
				} pointing='top left'
				  icon={null}
				  closeOnBlur={false}
				  closeOnChange={false}>
					<Dropdown.Menu>
						<Dropdown.Item>
							<Form>
								<Form.Group widths='equal'>
									<Form.Field inline>
										<label>Run</label>
										<Dropdown placeholder='Agent' search selection
											options={
											this.state.codes.map((file)=>({
														key: file.name,
														value: file.name,
														text: file.name
													}))
										} 
										value={this.state.selected_code}
										onChange={(e, data)=>{this.setState({ 'selected_code': data.value })}}/>
									</Form.Field>
									<Form.Field inline>
										<input type='text' placeholder='arguments, separated by space'
											value={this.state.selected_code_args}
											onChange={(e)=>this.setState({ 'selected_code_args': e.target.value })}/>
									</Form.Field>
									<Button icon='play' color='green'
										onClick={(e)=>this.sys.runAgent('code/basic/'+this.state.selected_code, this.state.selected_code_args.split(' '))}/>
								</Form.Group>
							</Form>
						</Dropdown.Item>
						<Dropdown.Divider/>
						<Dropdown.Item>
							<Form>
								<Form.Group widths='equal'>
									<Form.Field inline>
										<label>Pipe</label>
										<Dropdown placeholder='Channel' search selection options={
											Object.values(this.sys.agents).map((agent)=>({
														key: agent.id+'-stdout',
														value: agent.id+':stdout',
														text: agent.id
													}))
										} 
										value={this.state.selected_source}
										onChange={(e, data)=>{this.setState({ 'selected_source': data.value })}}/>
									</Form.Field>
									<Icon name='right arrow'/>
									<Form.Field inline>
										<Dropdown placeholder='Channel' search selection 
											options={
											Object.values(this.sys.agents).map((agent)=>({
														key: agent.id+'-stdin',
														value: agent.id+':stdin',
														text: agent.id
													}))
										} 
										value={this.state.selected_sink}
										onChange={(e, data)=>{this.setState({ 'selected_sink': data.value })}}/>
									</Form.Field>
									<Button icon='play' color='green'
										onClick={(e)=>this.sys.createPipe(this.state.selected_source, this.state.selected_sink)}/>
								</Form.Group>
							</Form>
						</Dropdown.Item>
					</Dropdown.Menu>
				</Dropdown>
			}content={this.props.tooltip}/>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<QuickActionButton {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)