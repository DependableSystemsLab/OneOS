import React from 'react';
import { Dropdown, Button, Icon, Label, Popup, Grid, Portal, Segment, Header } from 'semantic-ui-react';

import AppStateService from '../services/AppStateService.jsx';
import PipeModal from './PipeModal.jsx';
import StreamViewer from './StreamViewer.jsx';

class ChannelButton extends React.Component {
	constructor (props){
		super();
		this.app = props.app;

		this.state = {
			migrateTo: '',
			isStreamViewOpen: false
		}
	}

	/*componentDidMount(){
		console.log('[ChannelButton] Component Mounted', this.props);
	}

	componentDidUpdate(prevProps, prevState, snapshot){
		
	}

	componentWillUnmount(){
	}*/

	viewChannelOnNewViewer(){
		this.app.channelsViewing.push(this.props.agentId + ':' + this.props.channel);
		this.app.emit('update');
	}
	viewChannelOnViewer(index){
		this.app.channelsViewing[index] = this.props.agentId + ':' + this.props.channel;
		this.app.emit('update');
	}

	render (){
		return (
			<Dropdown trigger={<a href='javascript:;'>{this.props.channel}</a>} pointing='top left' icon={null}>
				<Dropdown.Menu>
					{
						this.props.direction === 'input' ?
							<PipeModal trigger={
								<Dropdown.Item>
									<Icon name='download'/> Pipe In
								</Dropdown.Item>
							} sinkAgent={this.props.agentId} sinkChannel={this.props.channel}/>
							: <PipeModal trigger={
								<Dropdown.Item>
									<Icon name='upload'/> Pipe Out
								</Dropdown.Item>
							} sourceAgent={this.props.agentId} sourceChannel={this.props.channel}/>
					}
					<Dropdown.Item>
						<Dropdown trigger={<React.Fragment>
								<Icon name='window maximize outline'/> View Stream
							</React.Fragment>}>
							<Dropdown.Menu>
								{
									this.app.channelsViewing.map((chan, index) => (
										<Dropdown.Item key={index} onClick={(e) => this.viewChannelOnViewer(index)}>
											<Icon name='eye'/> View on { index + 1 }
										</Dropdown.Item>
									))
								}
								{
									this.app.channelsViewing.length < 4 ?
									<Dropdown.Item onClick={(e) => this.viewChannelOnNewViewer()}>
										<Icon name='add'/> Add Viewer
									</Dropdown.Item> : null
								}
							</Dropdown.Menu>
						</Dropdown>

						{/*<span>
		            		<Icon name='window maximize outline'/> View Stream
		            	</span>
						<Portal
				            closeOnTriggerClick
				            openOnTriggerClick
				            trigger={
				            	<span>
				            		<Icon name='window maximize outline'/> View Stream
				            	</span>
				            }
				            onOpen={ evt => this.setState({ isStreamViewOpen: true }) }
				            onClose={ evt => this.setState({ isStreamViewOpen: false }) }
				          >
				            <Segment
				              style={{
				                left: '40%',
				                position: 'fixed',
				                top: '50%',
				                minWidth: '400px',
				                maxWidth: '800px',
				                zIndex: 1000,
				              }}
				            >
				            	
				            </Segment>
				          </Portal>*/}
					</Dropdown.Item>
				</Dropdown.Menu>
			</Dropdown>
		)
	}
}

export default (props)=>(
	<AppStateService.Consumer>
	{
		(service)=>(<ChannelButton {...props} app={service}/>)
	}
	</AppStateService.Consumer>
)