import React from 'react';
import {Header, Form, Button, Select, Grid, Label} from 'semantic-ui-react';

import AppStateService from '../services/AppStateService.jsx';
import OutputViewer from './OutputViewer.jsx';

import styles from './terminal.css';

class StreamViewer extends React.Component {
	constructor (props){
		super();
		console.log('[StreamViewer] Page Initialized');
		this.app = props.app;
		//this.allPipes = Object.values(this.sys.pipes);
		//this.channels = this.sys.channels;
		//this.updateHandlers = {};

		this.state = {
			channels: this.app.channelsViewing,
			/*channel: props.channel || 'stdout',
			dataType: 'string',
			lines: [],
			imageSrc: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAQAAAD8fJRsAAAAEklEQVR42mNsqGfAChhHJdABAI2tDAEwAsbiAAAAAElFTkSuQmCC'*/
		}
	}

	componentDidMount(){
		console.log('[StreamViewer] Component Mounted '+this.state.channels.join(','));

		this.updateListener = () => {
			console.log('[StreamViewer] App State Changed');
			this.setState({
				channels: this.app.channelsViewing
			});
		};
		this.app.on('update', this.updateListener);
	}

	componentWillUnmount(){
		this.app.removeListener('update', this.updateListener);
	}

	/*pushChannel(name, dataType){
		this.setState({
			channels: this.state.channels.concat([ new Channel({ name, dataType }) ])
		});
	}*/

	render (){
		//let agent = this.sys.agents[this.props.agent];
		// let channelOptions = agent ? 
		// 	agent.output.map((ch)=>({ key: ch, value: ch, text: ch })) : [];
		//let channelOptions = this.channels.map((ch)=>({ key: ch, value: ch, text: ch }));

		return (
			<React.Fragment>
				<Header as='h4'>I/O</Header>
				<Grid>
				{
					this.state.channels.map((channel, index) => (
						<Grid.Column key={index} width={4}>
							<OutputViewer channel={channel}/>
						</Grid.Column>
					))
				}
				</Grid>
			</React.Fragment>)
	}
}

export default (props)=>(
	<AppStateService.Consumer>
	{
		(service) => (<StreamViewer {...props} app={service}/>)
	}
	</AppStateService.Consumer>
)