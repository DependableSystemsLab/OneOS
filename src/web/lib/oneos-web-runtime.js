/** This file is served as a static file and is not part of the bundle.
 *  All imports here should consider the static directory as the root,
 *  and assume that this is a separate browser-side process. (WebWorker)
 *  All reference to "window" should be replaced with "self"
 */
import { MqttWsClient, randKey } from './oneos-web-common.js';
import uuid from 'uuid/v4';
import UAParser from 'ua-parser-js';

// console.log(MqttWsClient);

self.addEventListener('message', (e)=>{
	switch (e.data.verb){
		case 'kill':
			leave_network().then(()=>self.close());
			break;
		default:
			self.postMessage({
				error: 'UnknownVerb'
			})
			break;
	}
	// self.postMessage(e.data);
}, false);

const uagent = (new UAParser()).getResult();

const CHANNELS = {
  'membership': 'system/runtime',
  'broadcast': 'system/runtime/bcast',
  'stats': 'system/stats'
};
const wss_url = 'wss://'+self.location.hostname+':'+self.location.port+'/pubsub';

const config = {
  // 'pubsub_url': 'mqtt://localhost',
  // 'filesystem_url': 'mongodb://localhost:27017/things-js-fs',
  // 'store_url': 'redis://localhost',
  'id': uuid().substr(0,8),
  'type': 'web-worker',	// standard, external, etc.
  //	'channels': {
  //		'membership': 'system/membership',
  //	},
  'limit_memory': 256,
  'device_label': 'web-chrome'
};
const options = {
  statInterval: 5000
};

const Operations = {
  'start_agent': (payload)=>{
    // get the code from fs (using local fs for debugging)
    // let codePath = path.join(path.resolve(__dirname, './runtime/examples'), payload);
    // console.log('Starting Agent '+payload.name);
    // return readFile(codePath)
    // 	.then((source)=>{
    		let agent_id = payload.name+'.'+randKey();

    		agents[agent_id] = {
    			id: agent_id,
    			name: payload.name,
    			source: payload.source,
    			language: payload.language,
    			pipes: payload.pipes,
    			stat: {
    				cpu: 0,
    				memory: 0
    			},
    			input: [],
    			output: []
    		};

    		// let agent = new Agent(self, {
		    //     // pubsub_url: self.pubsub.url,
		    //     id: agent_id,
		    //     name: payload.name,
		    //     source: payload.source,
		    //     language: payload.language,
      //       	// pipes: payload.pipes
		    //   }, {
		    //     // enableMigration: true
		    //   });

		    // agents[agent_id] = agent;

		    // agent.on('status-change', (event)=>{
		    // 	if (event.call === 'kill'){
		    // 		delete agents[agent_id];
		    // 	}
		    // 	else if (event.call === 'migrate'){
		    // 		// self.agents[agent.id] = agent;	// agent is a proxy object, not an Agent
		    // 		// console.log(chalk.magenta('Agent '+agent.id+' Migrated'));
		    // 		delete agents[agent_id];
		    // 	}
		    // 	else {
		    // 		agent.status = event.status;
		    // 	}
		    // 	// self.emit('agent-update', agent);
		    // });

		    // return agent.start(payload.start_options).then(()=>{
		    	// return {
		    	// 	id: agent_id,
		    	// 	filename: payload.name,
		    	// 	source: payload.source,
		    	// 	runtime: self.config.id
		    	// }
		    // });
		    return Promise.resolve({
		    		id: agent_id,
		    		filename: payload.name,
		    		source: payload.source,
		    		runtime: config.id
		    	});
    	// });
  },
  'restore_agent': (payload)=>{
  	let agent_id = payload.agent_id;
  	// console.log('[RUNTIME] Restoring Agent '+payload.agent_id);
  	// let agent = new Agent(self, {
   //      // pubsub_url: self.pubsub.url,
   //      id: agent_id,
   //      name: payload.name,
   //      language: 'snapshot',
   //      source: payload.snapshot
   //    }, {
   //      // enableMigration: true
   //    });
   //  agents[agent_id] = agent;

   //  agent.on('status-change', (event)=>{
   //  	if (event.call === 'kill'){
   //  		delete agents[agent_id];
   //  	}
   //  	else if (event.call === 'migrate'){
   //  		// self.agents[agent.id] = agent;	// agent is a proxy object, not an Agent
   //  		// console.log(chalk.magenta('Agent '+agent.id+' Migrated'));
   //  		delete agents[agent_id];
   //  	}
   //  	else {
   //  		agent.status = event.status;
   //  	}
   //  	// self.emit('agent-update', agent);
   //  });

    // return agent.start().then(()=>{
    // 	return {
    // 		id: agent_id,
    // 		source: source,
    // 		runtime: config.id
    // 	}
    // });
    return Promise.resolve({
    		id: agent_id,
    		source: source,
    		runtime: config.id
    	})
  }

  // 'start_pipe': (payload)=>{
  //   let pipe = self.pubsub.getPipe(payload.source, payload.sink); // currently, a pipe shares the socket with the runtime. (this should be revised)
  //   console.log(pipe.source.topic+' -> '+pipe.sink.topic);
  //   self.pipes[pipe.id] = pipe;
  //   return Promise.resolve( Object.assign({ runtime: self.config.id }, pipe.summary()) );
  // },
  // 'kill_pipe': (payload)=>{
  //   console.log(self.pipes[payload].source.topic+' -> '+self.pipes[payload].sink.topic);
  //   if (payload in self.pipes){
  //     var result = self.pipes[payload].destroy();
  //     delete self.pipes[payload];
  //     return Promise.resolve(Object.assign({ runtime: self.config.id }, result));
  //   }
  //   else return Promise.reject(new Error('Could not find Pipe '+payload));
  // }
}


const pubsub = new MqttWsClient(wss_url);

let statTimer = null;

const device = getSystemInfo();
const interpreters = {
	'javascript': uagent.engine.name+' v'+uagent.engine.version,
	'wasm': uagent.engine.name+' v'+uagent.engine.version
}

const stat = {
  cpu: 0,
  memory: 0,
  daemon_cpu: 0,
  daemon_memory: 0,
  agent_cpu: 0,
  agent_memory: 0
};
const runtimes = {};
const daemons = {};
const agents = {};	// currently running agents
const pipes = {}; // currently hosting pipes

function getSystemInfo(){
  let info = {};

  info['hostname'] = uagent.ua;
  info['arch'] = uagent.cpu.architecture;
  info['platform'] = uagent.browser.name + ' ' + uagent.browser.version;
  info['os'] = uagent.os.name + ' version ' + uagent.os.version;
  info['cpus'] = [{ model: 'WebWorker', speed: 1000 }];
  info['cpu_average_speed'] = 1000;
  info['network'] = {};
  info['memory_total'] = config.limit_memory;
	
  return info;
}

function summary (){
	return {
	  id: config.id,
	  type: config.type,
	  device: device,
	  device_label: config.device_label,
	  gps: { lat: Math.random()*160 - 80, long: Math.random()*360 - 180 },
	  stat: stat,
	  limit_memory: config.limit_memory,
	  interpreters: interpreters,
	  isLeader: false,
	  // daemons: Object.values(daemons).map((agent)=>agent.summary()),
	  daemons: Object.values(daemons),
	  // agents: Object.values(agents).map((agent)=>agent.summary()),
	  agents: Object.values(agents),
	  // pipes: Object.values(pipes).map((pipe)=>Object.assign({ runtime: config.id }, pipe.summary()))
	  pipes: Object.values(pipes)
	};
}

function start (){
	// console.log(Date.now()+chalk.green('Web Runtime '+config.id)+' started');
	return Promise.resolve()
	  // .then(()=>this.assess_system())
	  .then(()=>init_network())
	  .then(()=>join_network())
	// below: only for debug
	  .then(()=>{
	    // wait to receive some messages for now (to make sure daemon info is up to date)
	    return new Promise((resolve, reject)=>setTimeout(resolve, 1000));
	  })
	  // .then(()=>this.check_daemons());
}

function init_network (){
	// Object.keys(Runtime.Operations)
	//     .forEach((verb)=>{
	//       this.pubsub.setRequestHandler(verb, (payload)=>Runtime.Operations[verb](this, payload));
	//     });

	let actor = pubsub.getActor(config.id+':input');
	actor.setBehaviours(Operations);
	console.log(actor);

	pubsub.subscribe(config.id+':members', (message)=>{
	  // console.log(Date.now()+chalk.yellow(' Runtime ')+'received private message '+String(message));
	  if (message.verb === 'update_info'){
	    runtimes[message.publisher] = message.data;
	  }
	  // console.log(Date.now()+chalk.yellow(' Runtime ')+'runtimes:  '+Object.keys(this.runtimes).join(', '));
	});

	pubsub.subscribe(CHANNELS.membership, (message)=>{
	  // console.log(Date.now()+chalk.yellow(' Runtime ')+'new message on membership channel');
	  if (message.publisher !== config.id){
	  	if (message.verb === 'update'){
	  		// console.log(Date.now()+chalk.yellow(' Runtime ')+'runtime '+message.publisher+' reporting', message);
	  		runtimes[message.publisher] = message.data;
	  	}
	    else if (message.verb === 'join'){
	      // console.log(Date.now()+chalk.yellow(' Runtime ')+'new runtime '+message.publisher+' joined network');
	      runtimes[message.publisher] = message.data;

	      pubsub.publish(message.publisher+':members', {
	        publisher: config.id,
	        verb: 'update_info',
	        data: summary()
	      });
	    }
	    else if (message.verb === 'leave'){
	      // console.log(Date.now()+chalk.yellow(' Runtime ')+'runtime '+message.publisher+' left network');
	      delete runtimes[message.publisher];

	      // reach consensus and recover daemons
	      // this.check_daemons();
	    }
	    else {
	    }
	  }
	});
	return Promise.resolve();
}

function join_network (){
	// console.log(Date.now()+chalk.yellow(' Runtime ')+'joining the network ...');
	return pubsub.publish(CHANNELS.membership, {
	  publisher: config.id,
	  verb: 'join',
	  data: summary()
	})
	.then(()=>{
	  // console.log(Date.now()+chalk.yellow(' Runtime ')+'joined the network!');
	});
}

function leave_network (){
	return pubsub.publish(CHANNELS.membership, {
	  publisher: config.id,
	  verb: 'leave',
	  data: summary()
	})
	.then(()=>{
	  // console.log(Date.now()+chalk.yellow(' Runtime ')+'politely left the network!');
	});
}

function getStats (){
	return Object.assign({
		type: 'Runtime',
		id: config.id
	}, stat)
}

function report_status (){
	return pubsub.publish(CHANNELS.membership, {
	  publisher: config.id,
	  verb: 'update',
	  data: summary()
	})
	.then(()=>{
	  // console.log(Date.now()+chalk.yellow(' Runtime ')+'reported updated status');
	});
}

const ready = new Promise((resolve, reject)=>{
	start().then(resolve, reject);

	// record stats at regular interval
    statTimer = setInterval(()=>{
    	if (self.performance){
    		console.log(self.performance);
    		// stat = Object.assign(stat, data);
      //     	stat.daemon_memory = Object.values(daemons).reduce((sum, agent)=>(sum + agent.stat.memory), 0);
      //     	stat.agent_memory = Object.values(agents).reduce((sum, agent)=>(sum + agent.stat.memory), 0);

      //       stat.daemon_cpu = Object.values(daemons).reduce((sum, agent)=>(sum + agent.stat.cpu), 0);
      //       stat.agent_cpu = Object.values(agents).reduce((sum, agent)=>(sum + agent.stat.cpu), 0);
    	}
    	else {
    		console.log('Performance API not available on this browser');
    	}
        // pidusage(process.pid, (err, data)=>{
          // if (err){
          //   console.log(chalk.red('ERROR ')+'trying to read resource usage');
          // }
          // else {

          	
            // console.log(chalk.red('Runtime '+this.config.id)+'\t' + (stat.cpu).toFixed(1)+' %\t'+(stat.memory/1e6).toFixed(2)+' MB');
          // }
          // pubsub.publish(CHANNELS.stats, getStats());
          report_status();
        // });
      }, options.statInterval);
});
