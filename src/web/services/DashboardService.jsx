import { EventEmitter } from 'events';
import React from 'react';

import { OneOSWebClient } from '../lib/oneos-web.js';

// const wss_url = 'ws://'+window.location.hostname+':'+window.location.port+'/pubsub';

class DashboardService extends EventEmitter {
	constructor(wss_url){
		super();

		this.sys = new OneOSWebClient(wss_url);

		this.sys.on('runtime-updated', (info)=>this.emit('sys:runtime-updated'));
	}
}

const context = React.createContext();
// const service = new DashboardService();

const DashboardContext = {
	Provider: (props)=>(<context.Provider value={new DashboardService(props.wss_url)}>{props.children}</context.Provider>),
	Consumer: context.Consumer
}

export default DashboardContext;