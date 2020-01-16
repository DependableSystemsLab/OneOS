import { EventEmitter } from 'events';
import React from 'react';

const context = React.createContext();
// const service = new DashboardService();

class AppStateService extends EventEmitter {
	constructor (){
		super();
		this.channelsViewing = [ '' ];
	}
}

const service = new AppStateService();

const ServiceContext = {
	Provider: (props)=>(<context.Provider value={service}>{props.children}</context.Provider>),
	Consumer: context.Consumer
}

export default ServiceContext;