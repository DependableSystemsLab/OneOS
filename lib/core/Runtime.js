const os = require('os');
const path = require('path');
const fs = require('fs');
const util = require('util');
const { EventEmitter } = require('events');
const ipc = require('node-ipc');
const uuid = require('uuid/v4');
const pidusage = require('pidusage');
const chalk = require('chalk');
const Pubsub = require('./Pubsub.js');
const Agent = require('./Agent.js');
// const Logger = require('./Logger.js');
const helpers = require('../helpers.js');

const readFile = util.promisify(fs.readFile);

// these channels should not collide with user-space channels
const CHANNELS = {
  'membership': 'system/runtime',
  'broadcast': 'system/runtime/bcast',
  'stats': 'system/stats'
  // 'agent-membership': 'system/agent',
  // 'agent-broadcast': 'system/agent/bcast'
};

const INIT_CODE_DIRECTORY = path.resolve(__dirname, './runtime/init');
const INIT_AGENTS = {
  'file-system': path.join(INIT_CODE_DIRECTORY, 'file-system-daemon.js'),
  // 'io-device': path.join(INIT_CODE_DIRECTORY, 'io-device-daemon.js'),
  // 'network': path.join(INIT_CODE_DIRECTORY, 'network-daemon.js'),
  'scheduler': path.join(INIT_CODE_DIRECTORY, 'scheduler-daemon.js'),
  'shell': path.join(INIT_CODE_DIRECTORY, 'shell-daemon.js'),
  'www': path.join(INIT_CODE_DIRECTORY, 'www-daemon.js')
};

/*
Runtime Daemon Process runtime stages:

0.0 Load Configuration - Read specified settings from the user home directory (we assume 1 runtime per user)
0.1 System Assessment - Check available I/O, disk, memory, CPU, platform, MAC address, GPS, etc. (Collecting metadata about the underlying system)
1.0 Membership Registration - Announce its activity to a specified common channel and also receive an update from all other runtimes (or load from persistent memory)
2.0 Bootloader Check
3.0 Idle state - Waits for an instruction from the Kernel Agent. Can act as described below in the Runtime Kernel API.

"init" API:

0.0 Start FS Manager
0.0 Start Device I/O Manager
0.1 Start Network Manager
0.2 Start Shell - shell spawns a daemon process dedicated to a shell session. The shell client is started with the 'oneos' command.
0.3 Start Display Server (www)

TODO: Make Runtime object Singleton within the process. This is needed to correctly assess the resource usage.
*/
class Runtime extends EventEmitter {
  constructor (config, options){
    super();
    if (typeof config === 'string'){
      this.config = this.load_config(config);
    }
    else if (typeof config === 'object'){
      this.config = config;
    }
    this.options = Object.assign({
      statInterval: 5000
    }, options);

    //set id of the ipc singleton
    // ipc.config.silent = true;
    // ipc.config.logDepth=5;
    // ipc.config.id = 'oneos-runtime';
    console.log('Runtime '+this.config.id+' with IPC ID '+ipc.config.id);

    this.device = null;
    this.interpreters = {
    	'javascript': 'node v10.14.2',
    	'wasm': 'node v10.14.2',
    	'python3': 'python3 v3.5.2'
    }

    this.pubsub = new Pubsub(config.pubsub_url, {
      id: config.id
    });

    this.stat = {
      cpu: 0,
      memory: 0
    };

    this.runtimes = {};

    this.daemons = {};
    this.agents = {};	// currently running agents
    
    this.pipes = {}; // currently hosting pipes

    this.shared = {};

    this.on('agent-update', (agent)=>{
    	// console.log(chalk.cyan('Agent Updated! ')+agent.id);
    	this.report_status();
    })

    this.ready = new Promise((resolve, reject)=>{
      this.start().then(resolve, reject);
      // this.emit('started');

      // record stats at regular interval
      this.timer = setInterval(()=>{
        pidusage(process.pid, (err, stat)=>{
          if (err){
            console.log(chalk.red('ERROR ')+'trying to read resource usage');
          }
          else {
          	this.stat = Object.assign(this.stat, stat);
          	this.stat.daemon_memory = Object.values(this.daemons).reduce((sum, agent)=>(sum + agent.stat.memory), 0);
          	this.stat.agent_memory = Object.values(this.agents).reduce((sum, agent)=>(sum + agent.stat.memory), 0);

            this.stat.daemon_cpu = Object.values(this.daemons).reduce((sum, agent)=>(sum + agent.stat.cpu), 0);
            this.stat.agent_cpu = Object.values(this.agents).reduce((sum, agent)=>(sum + agent.stat.cpu), 0);
            // console.log(chalk.red('Runtime '+this.config.id)+'\t' + (stat.cpu).toFixed(1)+' %\t'+(stat.memory/1e6).toFixed(2)+' MB');
          }
          this.pubsub.publish(CHANNELS.stats, this.getStats());
          this.report_status();
        });
      }, this.options.statInterval);
    });

    // optionally, start a web server for viewing this device
  }

  summary (){
    return {
      id: this.config.id,
      type: this.config.type,
      device: this.device,
      device_label: this.config.device_label,
      gps: { lat: Math.random()*160 - 80, long: Math.random()*360 - 180 },
      stat: this.stat,
      limit_memory: this.config.limit_memory,
      interpreters: this.interpreters,
      isLeader: this.isLeader(),
      daemons: Object.values(this.daemons).map((agent)=>agent.summary()),
      agents: Object.values(this.agents).map((agent)=>agent.summary()),
      pipes: Object.values(this.pipes).map((pipe)=>Object.assign({ runtime: this.config.id }, pipe.summary()))
    };
  }

  getStats (){
  	return Object.assign({
  		type: 'Runtime',
  		id: this.config.id
  	}, this.stat)
  }

  getAllRuntimes (){
    let info = {};
    info[this.config.id] = this.summary();
    Object.values(this.runtimes)
      .forEach((runtime)=>{
        info[runtime.id] = runtime;
      });
    return info;
  }

  getAllAgents (excludeDaemons=false){
  	let rinfo = this.getAllRuntimes();
    let info = {};

    Object.values(rinfo)
      .forEach((runtime)=>{
        if (!excludeDaemons){
          runtime.daemons.forEach((agent)=>{
            info[agent.id] = agent;
          });  
        }
      	runtime.agents.forEach((agent)=>{
      		info[agent.id] = agent;
      	});
      });

    return info;
  }

  // getAgents (){
  //   let rinfo = this.getAllRuntimes();
  //   let info = {};
  //   Object.values(rinfo)
  //     .forEach((runtime)=>{
  //       runtime.agents.forEach((agent)=>{
  //         info[agent.id] = Object.assign({ isDaemon: false }, agent);
  //       });
  //     });
  //   return info;
  // }

  getAllPipes (){
    let rinfo = this.getAllRuntimes();
    let info = {};

    Object.values(rinfo)
      .forEach((runtime)=>{
        runtime.pipes.forEach((pipe)=>{
          info[pipe.id] = pipe;
        });
      });

    return info;
  }

  getLiveDaemons (){
  	// console.log(chalk.magenta('---Calculating Live Daemons: '));
    return Object.values(this.daemons)
      .map((daemon)=>daemon.summary())
      .concat(
      	Object.values(this.runtimes)
          .reduce((acc, runtime)=>acc.concat(runtime.daemons), [])
        );
  }

  getDeadDaemons (){
    let live = this.getLiveDaemons();
    // console.log("Currently Live: ", live);
    return Object.keys(INIT_AGENTS).filter((key)=>(live.findIndex((item)=>(item.id === key+'-daemon')) < 0));
  }

  getPipes (){

  }

  isLeader (){
  	// console.log(chalk.yellow('Runtime '+this.config.id)+' is leader');
    let sorted = [this.config.id].concat(Object.keys(this.runtimes)).sort();
    // console.log(sorted, this.runtimes);
    return (sorted[0] === this.config.id);
  }

  start (){
    console.log(Date.now()+chalk.green(' Runtime '+this.config.id)+' started');
    return Promise.resolve()
      .then(()=>this.assess_system())
      .then(()=>this.init_network())
      .then(()=>this.join_network())
    // below: only for debug
      .then(()=>{
        // wait to receive some messages for now (to make sure daemon info is up to date)
        return new Promise((resolve, reject)=>setTimeout(resolve, 1000));
      })
      .then(()=>this.check_daemons());
  }

  load_config (file_path){
    // console.log(Date.now()+chalk.yellow(' Runtime ')+'loading config ...');

  }

  assess_system (){
    // console.log(Date.now()+chalk.yellow(' Runtime ')+'assessing the system ...');
		
    // system info
    this.device = helpers.getSystemInfo();
    // helpers.prettyPrint(this.device);

    // io info

    // available interpreters
    
    this.gps = {
      lat: Math.random()*180 - 90,
      long: Math.random()*360 - 180
    }

    return Promise.resolve();
  }

  init_network (){
    Object.keys(Runtime.Operations)
	    .forEach((verb)=>{
	      this.pubsub.setRequestHandler(verb, (payload, response)=>Runtime.Operations[verb](this, payload, response));
	    });

    this.pubsub.subscribe(this.config.id+':members', (message)=>{
      // console.log(Date.now()+chalk.yellow(' Runtime ')+'received private message '+String(message));
      if (message.verb === 'update_info'){
        this.runtimes[message.publisher] = message.data;
      }
      // console.log(Date.now()+chalk.yellow(' Runtime ')+'runtimes:  '+Object.keys(this.runtimes).join(', '));
    });

    this.pubsub.subscribe(CHANNELS.membership, (message)=>{
      // console.log(Date.now()+chalk.yellow(' Runtime ')+'new message on membership channel');
      if (message.publisher !== this.config.id){
      	if (message.verb === 'update'){
      		// console.log(Date.now()+chalk.yellow(' Runtime ')+'runtime '+message.publisher+' reporting', message);
      		this.runtimes[message.publisher] = message.data;
      	}
        else if (message.verb === 'join'){
          console.log(Date.now()+chalk.yellow(' Runtime ')+'new runtime '+message.publisher+' joined network');
          this.runtimes[message.publisher] = message.data;

          this.pubsub.publish(message.publisher+':members', {
            publisher: this.config.id,
            verb: 'update_info',
            data: this.summary()
          });
        }
        else if (message.verb === 'leave'){
          console.log(Date.now()+chalk.yellow(' Runtime ')+'runtime '+message.publisher+' left network');
          delete this.runtimes[message.publisher];

          // reach consensus and recover daemons
          this.check_daemons();
        }
        else {
        }
        // console.log(Date.now()+chalk.yellow(' Runtime ')+'runtimes:  '+Object.keys(this.runtimes).join(', '));
      }
    });

    // console.log(Date.now()+chalk.yellow(' Runtime ')+'initialized network listeners');
    return Promise.resolve();
  }

  join_network (){
    // console.log(Date.now()+chalk.yellow(' Runtime ')+'joining the network ...');
    return this.pubsub.publish(CHANNELS.membership, {
      publisher: this.config.id,
      verb: 'join',
      data: this.summary()
    })
    .then(()=>{
      console.log(Date.now()+chalk.yellow(' Runtime ')+'joined the network!');
    });
  }

  leave_network (){
    return this.pubsub.publish(CHANNELS.membership, {
      publisher: this.config.id,
      verb: 'leave',
      data: this.summary()
    })
    .then(()=>{
      // console.log(Date.now()+chalk.yellow(' Runtime ')+'politely left the network!');
    });
  }

  report_status (){
  	return this.pubsub.publish(CHANNELS.membership, {
      publisher: this.config.id,
      verb: 'update',
      data: this.summary()
    })
    .then(()=>{
      // console.log(Date.now()+chalk.yellow(' Runtime ')+'reported updated status');
    });
  }

  check_daemons (){
    if (this.isLeader()){
      return Promise.all(
        // Object.keys(INIT_AGENTS).map((key)=>{
        this.getDeadDaemons().map((key)=>{
          return readFile(INIT_AGENTS[key])
            .then((source)=>{
              // console.log(source);
              this.daemons[key] = new Agent(this, {
                // pubsub_url: this.pubsub.url,
                id: key+'-daemon',
                name: key,
                source: source.toString()
              }, {
                isDaemon: true,
                isOpaque: false,
                disableMigration: true,
                // localStdio: true
              });
              return this.daemons[key].start();
            }).catch((e)=>{
            	throw e;
            });
        })
      );	
    }
    return true;
  }

  kill (){
    // this.leave_network()
    // close pubsub and store connection
		
    // Kill the daemons
    return this.leave_network()
      .then(()=>
        Promise.all(
          Object.values(this.daemons).map((daemon)=>{
            return daemon.kill();
          }))
      )
      .then(()=>this.pubsub.kill());
  }
}

Runtime.DEFAULT_CONFIG = {
  'pubsub_url': 'mqtt://localhost',
  // 'filesystem_url': 'mongodb://localhost:27017/things-js-fs',
  'store_url': 'redis://localhost',
  'id': uuid(),
  'type': 'kernel',	// standard, external, etc.
  //	'channels': {
  //		'membership': 'system/membership',
  //	},
  'limit_memory': 512,
  'device_label': 'raspberry-pi3',
  'tags': []
};

// They should all return a Promise
Runtime.Operations = {
  'start_agent': (self, payload, response)=>{
    // get the code from fs (using local fs for debugging)
    // let codePath = path.join(path.resolve(__dirname, './runtime/examples'), payload);
    // console.log('Starting Agent '+payload.name);
    // return readFile(codePath)
    // 	.then((source)=>{
    		let agent_id = payload.name+'.'+helpers.randKey();
    		let agent = new Agent(self, {
		        // pubsub_url: self.pubsub.url,
		        id: agent_id,
		        name: payload.name,
		        source: payload.source,
		        language: payload.language,
            pipes: payload.pipes
		      }, {
		        // enableMigration: true
		      });
        
        payload.pipes.forEach((pipe)=>{
          console.log('Got Pipe: ', pipe);
        });

		    self.agents[agent_id] = agent;

		    agent.on('status-change', (event)=>{
		    	if (event.call === 'kill'){
		    		delete self.agents[agent_id];
		    	}
		    	else if (event.call === 'migrate'){
		    		// self.agents[agent.id] = agent;	// agent is a proxy object, not an Agent
		    		// console.log(chalk.magenta('Agent '+agent.id+' Migrated'));
		    		delete self.agents[agent_id];
		    	}
		    	else {
		    		agent.status = event.status;
		    	}
		    	self.emit('agent-update', agent);
		    });

		    return agent.start(payload.start_options)
          .then(()=>{
            response.okay({
              id: agent_id,
              filename: payload.name,
              source: payload.source,
              runtime: self.config.id
            });
  		    	// return {
  		    	// 	id: agent_id,
  		    	// 	filename: payload.name,
  		    	// 	source: payload.source,
  		    	// 	runtime: self.config.id
  		    	// }
  		    });
    	// });
  },
  'restore_agent': (self, payload, response)=>{
  	let agent_id = payload.agent_id;
  	// console.log('[RUNTIME] Restoring Agent '+payload.agent_id);
  	let agent = new Agent(self, {
        // pubsub_url: self.pubsub.url,
        id: agent_id,
        name: payload.name,
        language: 'snapshot',
        source: payload.snapshot
      }, {
        // enableMigration: true
      });
    self.agents[agent_id] = agent;

    agent.on('status-change', (event)=>{
    	if (event.call === 'kill'){
    		delete self.agents[agent_id];
    	}
    	else if (event.call === 'migrate'){
    		// self.agents[agent.id] = agent;	// agent is a proxy object, not an Agent
    		// console.log(chalk.magenta('Agent '+agent.id+' Migrated'));
    		delete self.agents[agent_id];
    	}
    	else {
    		agent.status = event.status;
    	}
    	self.emit('agent-update', agent);
    });

    return agent.start().then(()=>{
      if (response){
        response.okay({
          id: agent_id,
          source: source,
          runtime: self.runtime.config.id
        });
      }

    	// return {
    	// 	id: agent_id,
    	// 	source: source,
    	// 	runtime: self.runtime.config.id
    	// }
    });
  },

  'start_pipe': (self, payload, response)=>{
    let pipe = self.pubsub.getPipe(payload.source, payload.sink); // currently, a pipe shares the socket with the runtime. (this should be revised)
    console.log(pipe.source.topic+' -> '+pipe.sink.topic);
    self.pipes[pipe.id] = pipe;
    response.okay(Object.assign({ runtime: self.config.id }, pipe.summary()));
    // return Promise.resolve( Object.assign({ runtime: self.config.id }, pipe.summary()) );
  },
  'kill_pipe': (self, payload, response)=>{
    console.log(self.pipes[payload].source.topic+' -> '+self.pipes[payload].sink.topic);
    if (payload in self.pipes){
      var result = self.pipes[payload].destroy();
      delete self.pipes[payload];
      response.okay(Object.assign({ runtime: self.config.id }, result));
      // return Promise.resolve(Object.assign({ runtime: self.config.id }, result));
    }
    else {
      response.error(new Error('Could not find Pipe '+payload));
      // return Promise.reject(new Error('Could not find Pipe '+payload));
    }
  }
};

Runtime.CHANNELS = CHANNELS;

class DummyRuntime {
  constructor (config, options){
    this.config = Object.assign({
      'pubsub_url': 'mqtt://localhost',
      'store_url': 'redis://localhost',
      'id': uuid(),
      'type': 'kernel',
      'limit_memory': 512,
      'device_label': 'raspberry-pi3',
      'tags': []
    }, config);
    this.pubsub = {
      url: 'mqtt://localhost'
    }
  }
}
Runtime.createDummy = ()=>new DummyRuntime();

/**
 * Function for evaluating the "goodness" of a Runtime to 
 * run an Agent. 
 */
Runtime.score = function(runtime){
  console.log(((runtime.stat.memory + runtime.stat.daemon_memory + runtime.stat.agent_memory) / 1000000) +' / '+ runtime.limit_memory);
      
  let summary = {
    id: runtime.id,
    clock: runtime.device.cpus.reduce((acc, item)=>(acc + item.speed), 0) / runtime.device.cpus.length,
    memory_limit: runtime.limit_memory,
    cpu: (runtime.stat.cpu + runtime.stat.daemon_cpu + runtime.stat.agent_cpu) / 100,
    memory: ((runtime.stat.memory + runtime.stat.daemon_memory + runtime.stat.agent_memory) / 1000000) / runtime.limit_memory
  }

  var score = (summary.clock * (1 - summary.cpu)) + (summary.memory_limit * (1 - summary.memory)) * 3;
  summary.score = score;

  return summary;
}

Runtime.getVector = function(runtime){
  return [
    runtime.device.cpus.reduce((acc, item)=>(acc + item.speed), 0) / runtime.device.cpus.length,
    runtime.limit_memory,
    (runtime.stat.cpu + runtime.stat.daemon_cpu + runtime.stat.agent_cpu) / 100,
    ((runtime.stat.memory + runtime.stat.daemon_memory + runtime.stat.agent_memory) / 1000000) / runtime.limit_memory
  ]
}

module.exports = Runtime;
