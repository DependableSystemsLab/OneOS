import React, { Component} from 'react';
// import {connect} from 'react-redux';
import { HashRouter as Router, Route, Switch, NavLink, browserHistory, hashHistory, Redirect } from 'react-router-dom';
// import { createHistory } from 'history';
import { Message } from 'semantic-ui-react';
import {hot} from 'react-hot-loader';

import AuthService from './services/AuthService.jsx';
import OneOSService from './services/OneOSService.jsx';

import Base from './pages/Base.jsx';
import Home from './pages/Home.jsx';
import SystemMonitor from './pages/SystemMonitor.jsx';
import FileSystem from './pages/FileSystem.jsx';
import Applications from './pages/Applications.jsx';

const wss_url = 'wss://'+window.location.hostname+':'+window.location.port+'/pubsub';

class App extends Component{
    constructor(){
        super();
    }

    render(){
        return(
        	<AuthService.Provider>
        	<OneOSService.Provider wss_url={wss_url}>
	        	<Router basename='/'>
	                <div>
	                    <Switch>
	                        <Route render={(props)=>(
	                            <Base {...props}>
	                                <Switch>
	                                    <Route path='/' exact component={Home}/>
	                                    <Route path='/monitor' component={SystemMonitor}/>
	                                    <Route path='/fs/:cwd(.*)' component={FileSystem}/>
	                                    <Route path='/apps' component={Applications}/>
	                                    <Route render={(props)=>(
	                                        <Message>
	                                            <Message.Header>Page Not Found :(</Message.Header>
	                                            <p>{props.location.pathname} is not a valid URL</p>
	                                        </Message>
	                                    )}/>
	                                </Switch>
	                            </Base>
	                        )}/>
	                    </Switch>
	                </div>
	        	</Router>
	        </OneOSService.Provider>
        	</AuthService.Provider>
        );
    }
}
// TODO: define propTypes

export default hot(module)(App);