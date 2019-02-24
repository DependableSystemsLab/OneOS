import React from 'react';
import {Grid, Card, Table, List, Button, Header, Icon, Input, Image, Menu, Segment, Sidebar} from 'semantic-ui-react';

import OneOSService from '../services/OneOSService.jsx';

import styles from './terminal.css';

class ShellClient extends React.Component {
	constructor (props){
		super();
		console.log('[ShellClient] Page Initialized', props);
		this.sys = props.sys;

		this.state = {
			width: '100%'
			// lines: []
		}

		// this.userInput = React.createRef();
	}

	componentDidMount(){
		console.log('[ShellClient] Component Mounted', this.props);
		this.handler = (line)=>{
			this.setState({
				// lines: this.state.lines.concat([Buffer.from(line, 'base64').toString('utf8')])
			});
			this.refs.terminal.scrollTop = this.refs.terminal.scrollHeight;
		};

		this.sys.on('shell-output', this.handler);

		this.setState({
			// lines: this.sys.shell_output.slice()
		});

		// this.userInput.focus();
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		
	}

	componentWillUnmount(){
		this.sys.removeListener('shell-output', this.handler);
	}

	request (cmd){
		return this.sys.shellRequest(cmd)
			.then((data)=>{
				console.log('Got Response from Shell Daemon', data);
			})
	}

	onEnter (e){
		if (e.key === 'Enter'){
			return this.request(e.target.value)
				.then(()=>{
					console.log(this.userInput);
					// this.userInput.value = '';
					// e.target.value = '';
					this.userInput.value = '';
				})
		}
	}

	render (){
		return (
			<React.Fragment>
				<div ref="terminal" className='terminal-console' style={{ width: this.state.width }}>
					{
						this.sys.shell_output.map((line, index)=>{
							if (typeof line === 'string') return <p key={index}>{line}</p>
							else {
								console.log('Got Something Different!', line);
								return null;
							}
						})
					}
				</div>
				<input className='terminal-input' 
					ref={input=>{this.userInput = input; input && input.focus()}}
					onKeyUp={this.onEnter.bind(this)}/>
			</React.Fragment>
		)
	}
}

export default (props)=>(
	<OneOSService.Consumer>
	{
		(sys)=>(<ShellClient {...props} sys={sys}/>)
	}
	</OneOSService.Consumer>
)