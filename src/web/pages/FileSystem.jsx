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

class FileSystem extends React.Component {
	constructor (props){
		super();
		console.log('[FileSystem] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			path: props.match.params.cwd,
			path_tokens: [],
			cur_file: {
				name: '',
				content: '',
				language: ''
			},
			cur_dir: []
		}
		
	}

	componentDidMount(){
		this.eventHandlers = {
			'runtime-updated': (info)=>{
				console.log('[FileSystem] Got New Runtime Info!', info);
			}
		};

		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.on(eventName, this.eventHandlers[eventName]));

		this.sys.refreshRuntimeInfo();

		this.refresh();
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		if (prevProps.match.params.cwd !== this.props.match.params.cwd){
			console.log('[FileSystem] Path Changed! '+this.props.match.params.cwd);
			this.refresh();
		}
	}

	componentWillUnmount(){
		Object.keys(this.eventHandlers)
			.forEach((eventName)=>this.sys.removeListener(eventName, this.eventHandlers[eventName]));
	}

    refresh (){
    	console.log('Refreshing...', this.props.match.params.cwd, this.props.match.url);
    	let absPath = '/'+this.props.match.params.cwd;
    	this.sys.readFileSystem(absPath)
				.then((data)=>{
					console.log(data);
					if (data.type === 'directory'){
						this.setState({
							path: absPath+(absPath ==='/' ? '':'/'),
							path_tokens: this.props.match.params.cwd.split('/'),
							cur_dir: data.content,
							cur_file: {
								name: '',
								content: '',
								language: ''
							}
						});
					}
					else if (data.type === 'file'){
						this.setState({
							path: '/'+this.props.match.params.cwd.split('/').slice(0,-1).join('/') + (absPath ==='/' ? '':'/'),
							path_tokens: this.props.match.params.cwd.split('/').slice(0,-1),
							cur_file: {
								name: data.name,
								content: data.content,
								language: data.language
							}
						});
					}
					else {
						console.log('something wrong');
					}
				})
				.catch((err)=>{
					console.log(err);
				})
    }

	updateFileName(file_name){
    	this.setState({ cur_file: Object.assign(this.state.cur_file, { name: file_name }) });
    	console.log(this.state);
    }

    updateFileContent(content){
    	this.setState({ cur_file: Object.assign(this.state.cur_file, { content: content }) });
    	console.log(this.state);
    }

    saveFile (){
    	console.log("saving file", this.props.match.url, this.state.path, this.state.cur_file.name);
    	this.sys.writeFileSystem(this.state.path, {
    		type: 'file',
    		name: this.state.cur_file.name,
    		content: this.state.cur_file.content
    	}).then((result)=>{
    		// this.props.history.push(this.state.path+this.state.cur_file.name);
    	})
    }

	render(){
		return (
			<div>
				<Header as='h3'>File System</Header>
				<Grid stackable columns={2}>
				  <Grid.Column width={4}>
				  	<List>
				  		{
				  			this.state.path === '/' ? null :
				  			<React.Fragment>
				  			<List.Item>
				  				<List.Icon name='folder' />
				  				<List.Content>
							        <List.Header href='/#/fs/'>/</List.Header>
							        <List.Description>Root</List.Description>
								</List.Content>
				  			</List.Item>
				  			<List.Item>
				  				<List.Icon name='folder' />
				  				<List.Content>
							        <List.Header href={'/#/fs/'+this.state.path_tokens.slice(0, -1).join('/')}>..</List.Header>
							        <List.Description>Parent</List.Description>
								</List.Content>
				  			</List.Item>
				  			</React.Fragment>
				  		}
				  		{
				  			this.state.cur_dir.map((item, index)=>{
				  				if (item.type === 'directory'){
				  					return (
				  						<List.Item key={index}>
									      <List.Icon name='folder' />
									      <List.Content>
									        <List.Header href={'/#/fs'+this.state.path+item.name}>{item.name}</List.Header>
									        <List.Description>{item.name}</List.Description>
									      </List.Content>
									    </List.Item>
				  					)
				  				}
				  				else if (item.type === 'file'){
				  					return (
				  						<List.Item key={index}>
			  								<List.Content floated='right'>
			  									{(canExecute(item.name) ? 
									            	<Popup trigger={
									            		<Button size='mini' color='green'
										            			icon='play'
										            		 	onClick={(e)=>this.sys.runAgent(this.state.path+item.name, ['randstr'])}>
										            	</Button>
									            	} content='Run'/> : null)}
								            	<Popup trigger={<Button icon='delete' color='red' size='mini'/>} content='Delete'/>
								            </List.Content>
								            <List.Icon name='file' />
								            <List.Content>
								              <List.Header href={'/#/fs'+this.state.path+item.name}>{item.name}</List.Header>
								              <List.Description>
								              	{item.name}
								              </List.Description>
								            </List.Content>
								          </List.Item>
				  						)
				  				}
				  			})
				  		}
					  </List>
		              
				  </Grid.Column>
				  <Grid.Column width={12}>
				  	<Button.Group floated='right'>
				  		<Button onClick={(e)=>this.saveFile()} color='blue' icon='save' content='Save'/>
						{
							canExecute(this.state.cur_file.name) ? 
							<Button onClick={(e)=>this.sys.runAgent(this.state.path+this.state.cur_file.name, ['randstr'])}
									 color='green' icon='play' content='Run'/> : null
						}
				  	</Button.Group>
				  	<Breadcrumb>
						<Breadcrumb.Section href="/#/fs/"><i className="fa fa-home"></i></Breadcrumb.Section>
						{
							this.state.path_tokens.map((token, index)=>(
								<React.Fragment key={index}>
									<Breadcrumb.Divider/>
									<Breadcrumb.Section href="/#/fs/">{token}</Breadcrumb.Section>
								</React.Fragment>
								))
						}
					</Breadcrumb>
					<Form>
						<Form.Field>
							<label>Name</label>
							<input type="text"
								value={this.state.cur_file.name}
								onChange={(e)=>this.updateFileName(e.target.value)}>
							</input>
						</Form.Field>
						<Form.Field>
							<label>Content</label>
							<AceEditor 
							 	onChange={(val)=>this.updateFileContent(val)}
								value={this.state.cur_file.content}
								mode={this.state.cur_file.language}
								theme="github"
								width="100%"></AceEditor>
						</Form.Field>
						<div className='ui three buttons'>
							<Button onClick={(e)=>this.saveFile()} color='blue' icon='save' content='Save'/>
							{
								canExecute(this.state.cur_file.name) ? 
								<Button onClick={(e)=>this.sys.runAgent(this.state.path+this.state.cur_file.name, ['randstr'])}
									 color='green' icon='play' content='Run'/> : null
							}
						</div>
					</Form>
				  </Grid.Column>
				</Grid>
				  
			</div>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<FileSystem {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)