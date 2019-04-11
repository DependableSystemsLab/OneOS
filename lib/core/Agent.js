const path = require('path');
const { EventEmitter } = require('events');
const { fork, spawn } = require('child_process');
// const ipc = require('node-ipc');
const uuid = require('uuid/v4');
const pidusage = require('pidusage');
const chalk = require('chalk');
const Pubsub = require('./Pubsub.js');
const Code = require('./Code.js');
const helpers = require('../helpers.js');

const DEBUG = true;

const CHANNELS = {
  'stats': 'system/stats',
  'snapshots': 'system/snapshots'
  // 'agent-membership': 'system/agent',
  // 'agent-broadcast': 'system/agent/bcast'
};

/*
An abstraction of a Process
*/
class Agent extends EventEmitter {
  constructor (runtime, config, options){
    super();
    // options.enableWoT
    //		this.ready = new Promise((resolve, reject)=>{
    //			this.once('ready', resolve);
    //		});
    if (!runtime) throw new Error('An Agent must have a Runtime. Signature is: class Agent(runtime, config, options)');
    this.runtime = runtime;
    this.config = Object.assign({
      id: uuid(),
      // pubsub_url: 'mqtt://localhost',
      name: 'Anonymous Agent '+helpers.randKey(),
      language: 'javascript',	// also supports python
      source: null,
      input: ['stdin'],
      output: ['stdout', 'stderr'],
      localInputDevice: [],
      localOutputDevice: [],
      pipes: []
    }, config);
    this.options = Object.assign({
      isDaemon: false,
      isOpaque: false,	// if true, the agent is an unmodified agent like a python or wasm agent.
      disableMigration: false,
      statInterval: 1000,  // report stats every x ms
      snapshotInterval: 10000,   // save every x ms
      localStdio: false,  // do not redirect I/O
      WoT: false,         // initializes Web of Things API if true
      REST: false
    }, options);

    this.pubsub = new Pubsub(this.runtime.pubsub.url, {
      id: this.config.id
    });

    this.io = {
      'stdin': this.pubsub.getInputStream(this.config.id+':stdin'),
      'stdout': this.pubsub.getOutputStream(this.config.id+':stdout'),
      'stderr': this.pubsub.getOutputStream(this.config.id+':stderr')
    };

    this.ipc = new Pubsub.IPCParent(this.pubsub, this.pubsub.id);
    // this.ipc = ipc.serve(this.config.id+'.ipc.sock', ()=>{
    //   console.log("IPC Socket Created");
    //   ipc.server.on('message', (data, socket)=>{
    //     console.log('Got new message: '+data);
    //     ipc.server.emit(socket, 'message', 'Got your message '+data);
    //   });
    //   ipc.server.on('socket.disconnected', (socket, destroyedID)=>{
    //     console.log('Connection dropped: '+destroyedID);
    //   });
    // });

    // console.log('Agent '+this.config.id+' with IPC ID '+ipc.config.id);
    // ipc.server.start();

    this.pipes = [];

    this.status = 'Initialized';
    this.stat = {
      cpu: 0,
      memory: 0
    };
    this._requests = {};	// ipc requests

    Object.keys(Agent.Operations).forEach((verb)=>{
      this.pubsub.setRequestHandler(verb, (payload, response)=>{
        return Agent.Operations[verb](this, payload, response);
      });
    });

    if (this.config.language === 'javascript'
			&& !this.options.isOpaque){
      this.config.source = Code.instrument(this.config.name, this.config.source);
      var meta = Code.readMetadata(this.config.source);
      this.config.input = this.config.input.concat(meta.input, meta.getActor);
      this.config.output = this.config.output.concat(meta.output);

      this.config.localInputDevice  = this.config.localInputDevice.concat(meta.localInputDevice);
      this.config.localOutputDevice  = this.config.localOutputDevice.concat(meta.localOutputDevice);
      // console.log(this.config.source);
    }
    else if (this.config.language === 'snapshot'){
    	this.config.source = Code.restore(this.config.source);
    	// console.log(this.config.source);
    }

    this.on('status-change', (event)=>{
    	if (event.status === 'Exited'){
        if (event.exit_code){
          console.log('Exited with Error Code '+event.exit_code);

          // For now, leave the Pubsub alive, and listen only for the 'kill' command
          // (leaving the Agent object in scope for debugging purposes)
          Object.keys(Agent.Operations).forEach((verb)=>{
            (verb !== 'kill' && this.pubsub.unsetRequestHandler(verb));
          });
        }
        else {
          setImmediate(()=>this.pubsub.kill());
        }
      }
    });

    // console.log(Date.now()+chalk.green(' Agent '+this.config.id)+' started');
  }

  summary (){
    return {
      id: this.config.id,
      name: this.config.name,
      runtime: this.runtime.config.id,
      isDaemon: this.options.isDaemon,
      isOpaque: this.options.isOpaque,
      isMigratable: !this.options.disableMigration,
      input: this.config.input,
      output: this.config.output,
      localInputDevice: this.config.localInputDevice,
      localOutputDevice: this.config.localOutputDevice,
      channels: [
        { name: 'stdin', type: 'input', stat: this.io.stdin.stat },
        { name: 'stdout', type: 'output', stat: this.io.stdout.stat },
        { name: 'stderr', type: 'output', stat: this.io.stderr.stat }
      ],
      status: this.status,
      gps: { lat: Math.random()*160 - 80, long: Math.random()*360 - 180 },
      stat: this.stat
    };
  }

  getStats (){
  	return Object.assign({
  		type: 'Agent',
  		id: this.config.id
  	}, this.stat)
  }

  start (options = {}){
    var self = this;
    return this.pubsub.ready.then(()=>{
    	this.stat['started_at'] = Date.now();

      if (this.config.language === 'javascript'
      	  || this.config.language === 'snapshot'){
		    console.log(chalk.red('Agent '+this.config.id+' STARTING')+' args : '+(options.args && options.args.join(', ')));
      	// console.log(this.config.source);
        
        // passing code directly as an argument causes E2BIG error. See: getconf ARG_MAX
        // so using fork and piping the code via IPC.
        
        // this.proc = spawn('node', ['-e', this.config.source], {
        //   stdio: [ process.stdin, process.stdout, process.stderr, 'ipc' ]
          // stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
          // stdio: [0,1, this.pubsub.getOutputStream('agent-'+this.config.id+':stdout')],
          // env: Object.assign({
          // 	'test': function(arg){ console.log(arg); }
          // }, process.env)
        // });

        this.proc = fork(path.join(__dirname, 'vm.js'),
          ((options && options.args) ? options.args : []),
        	// [ this.config.id ], // args not actually used, but helps when doing "ps" to find pid
        	{ 
            execArgv: ['--expose-gc'],
            stdio: (this.options.localStdio ? 'inherit' : ['pipe', 'pipe', 'pipe', 'ipc'])
        		// stdio: [ process.stdin, process.stdout, process.stderr, 'ipc' ]
	          //silent: false
	        });

        // the first ipc message from child process is simply an acknowledgement.
        // After the ack, replace the IPC message listener.
        this.proc.once('message', (init)=>{
        	this.status = 'Running';

        	// Expose "system call" API, allowing child process to request information
	        // from the current Runtime process.
	        this.proc.on('message', (message)=>{
	          // console.log(chalk.magenta('[Agent child process]:'), message);
	          if (message.verb && message.request_id){
	            if (message.verb in Agent.IPCParentAPI){
	              // console.log(chalk.magenta('  invoking IPC Parent method ')+message.verb);
	              Agent.IPCParentAPI[message.verb](this, message.payload)
	                .then((result)=>{
	                  this.proc.send({
	                    response_id: message.request_id,
	                    payload: result
	                  });
	                }, (error)=>{
                    this.proc.send({
                      response_id: message.request_id,
                      payload: 'Error in parent process while handling Agent IPC request :\n'+error.message,
                      error: true
                    });
                  })
	            }
	            else console.log('Could not understand verb '+message.verb);
	          }
	          else if (message.response_id in this._requests){
		          // console.log('Resolving IPC Request', message.payload);
		          if (message.payload.status){
		          	var cur = this.status;
		          	this.status = message.payload.status;
		          	if (cur !== this.status)
		          		this.emit('status-change', {
			  				status: this.status
			  			});
		          }
		          clearTimeout(this._requests[message.response_id].timeout);
		          this._requests[message.response_id].resolve(message.payload);
		          delete this._requests[message.response_id];
		          // console.log('... resolved IPC', this._requests);
		        }
	          else {
	            console.log(chalk.red('Could not understand child!!! Child says: '), message);
              this.emit('invalid-message', message);
	          }
	        });

	        // Running
	        this.emit('status-change', {
    				status: this.status
    			});
        });

        // Send code to child vm
        this.proc.send({
          agentID: this.config.id,
          runtimeID: this.runtime.config.id,
          pubsub_ipc: this.ipc.id,
          pubsub_url: this.pubsub.url,
    			source: this.config.source,
    			options: {
    			//	enableStats: this.options.enableStats
    			}
    		}, function(){
    	//		started = Date.now();
    		});

        // Create pipes between pubsub stream and child process I/O streams
        if (!this.options.localStdio){
          this.io.stdin.pipe(this.proc.stdin);
          this.proc.stdout.pipe(this.io.stdout);
          this.proc.stderr.pipe(this.io.stderr);  
        }

        this.config.pipes.forEach((pipe)=>{
          if (pipe.kind === 'out'){
            let target = this.pubsub.getOutputStream(pipe.target.topic);
            this.pipes.push(target);
            this.proc.stdout.pipe(target);
          }
          else if (pipe.kind === 'in'){
            let source = this.pubsub.getInputStream(pipe.source.topic);
            this.pipes.push(source);
            source.pipe(this.proc.stdin);
          }
          console.log(chalk.red('Created New '+pipe.kind+' Pipe ')+ pipe.source.topic + ' -> '+ pipe.target.topic);
        })
      
      }
      else if (this.config.language === 'python3') {
        // -u  flag for setting stdout to unbuffered mode so that the stream flows
        // -c  flag for passing in source code as input (not file path)
        this.proc = spawn('python3', ['-u', '-c', this.config.source], {
          stdio: (this.options.localStdio ? 'inherit' : 'pipe')
          // stdio: [0,1,2]
        });

        // Create pipes between pubsub stream and child process I/O streams
        if (!this.options.localStdio){
          this.io.stdin.pipe(this.proc.stdin);
          this.proc.stdout.pipe(this.io.stdout);
          this.proc.stderr.pipe(this.io.stderr);
        }
      }
      else if (this.config.language === 'wasm') {
        //				this.proc = spawn('node', ['-c', 
        this.proc = fork(path.join(__dirname, 'vm-wasm.js'), [], { 
          //silent: false
        });

        // Create pipes between pubsub stream and child process I/O streams
        // this.io.stdin.pipe(this.io.stdin);
        // this.proc.stdout.pipe(this.io.stdout);
        // this.proc.stderr.pipe(this.io.stderr);
			
        // Initialize runtime
        this.proc.send({
          source: this.config.source,
          options: {
            //	enableStats: this.options.enableStats
          }
        }, function(){
          //		started = Date.now();
        });

        this.proc.on('message', function(message){
          // ( DEBUG && console.log(chalk.yellow('Child: ')+JSON.stringify(message)) );
          if (message.error){
            self._error = message.error;
            // self.emit('error', message.error);
            console.log(message.error);
          }
          // else if (message.reply_id in self._requests){
          // 	self._requests[message.reply_id].resolve(message.payload);
          // 	delete self._requests[message.reply_id];
          // }
          else {
            // try {
            // 	MasterIPCHandler[message.ctrl](self, message.payload);	
            // }
            // catch (e){
            console.log(e);
            console.log(chalk.red('ERROR - could not understand child process'), JSON.stringify(message));
            // }
			
          }
        });
      }

      this.proc.on('close', function(exit_code, signal){
	      console.log(chalk.red('Process '+self.config.id+' stdio closed ')+exit_code);
	    });
	    this.proc.on('error', function(err){
	      console.log(chalk.red('Process '+self.config.id+' ERROR!'), err);
        this.status = 'Error';
        this.emit('status-change', {
          status: this.status,
          error: err
        });
	      // self.emit('error', err);
	    });

      this.proc.on('exit', (exit_code, signal)=>{
        console.log(chalk.red('Agent '+self.config.id+' exited ')+exit_code);

        clearInterval(this.timer);
        // clearInterval(this.snapshotTimer);

        // Remove IPC Socket
        this.ipc.destroy();

        //		ended = Date.now();
        // self.process = null;

        //		self.status = Process.Status.EXITED;
        //		elapsed = (ended - started);

        if (exit_code) console.log(self._error);

        this.status = 'Exited';
        this.emit('status-change', {
          status: this.status,
          call: 'child_process.exit',
          exit_code: exit_code,
          signal: signal
        });

        //					this.pubsub.unsubscribe(self.config.id+'/'+self.id+'/cmd')
        //						.then(function(topic){
        // console.log('unsubscribe success '+ topic);
        //						}, function(err){
        //							console.log(err);
        //						})

        //					self.emit('status-update', this.status);
        //					self.emit('finished', {
        //						exit_code: exit_code,
        //						signal: signal,
        //						error: self._error,
        //						history: self.history,
        //						elapsed: (ended - started)
        //					});
      });	


      // report_status
      // record stats at regular interval
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(()=>{
        pidusage(this.proc.pid, (err, stat)=>{
          if (err){
            console.log(chalk.red('ERROR ')+'trying to read resource usage');
          }
          else {
            this.stat = Object.assign(this.stat, stat);
            // console.log(chalk.red('Agent '+self.config.id)+'\t' + (stat.cpu).toFixed(1)+' %\t'+(stat.memory/1e6).toFixed(2)+' MB');  
          }
          this.emit('stat-update', Object.assign({},this.stat));
          this.pubsub.publish(CHANNELS.stats, this.getStats());
        });
      }, this.options.statInterval);

      // take snapshots at regular interval
      // if (!this.options.disableMigration && this.options.snapshotInterval){
      //   if (this.snapshotTimer) clearInterval(this.snapshotTimer);
      //   this.snapshotTimer = setInterval(()=>{
      //     this.snapshot()
      //       .then((snapshot)=>{
      //         console.log('TOOK SNAPSHOT', snapshot);
      //         this.pubsub.publish(CHANNELS.snapshots, snapshot);
      //       });
      //   }, this.options.snapshotInterval);
      // }

      return this;
    });
  }

  ipcCommand(verb, payload){
  	return new Promise((resolve, reject)=>{
  		// console.log('making IPC command '+verb);
      let request_id = helpers.randKey();
      this._requests[request_id] = {
        resolve: resolve,
        reject: reject,
        timeout: setTimeout(()=>{
          if (request_id in this._requests){
            reject(new Error('IPCRequestTimeout '+request_id+' : '+verb));
            delete this._requests[request_id];
          }
        }, 10000)
      };
      // console.log('making IPC request to child...');
      this.proc.send({
        request_id: request_id,
        verb: verb,
        payload: payload
      });
    });
  }

  pause (){
  	console.log(chalk.red(this.config.id)+' Received external command PAUSE');
  	return this.ipcCommand('PAUSE');
  }

  resume (){
  	console.log(chalk.red(this.config.id)+' Received external command RESUME');
  	return this.ipcCommand('RESUME');
  }

  snapshot (){
  	console.log(chalk.red(this.config.id)+' Received external command SNAPSHOT');
  	return this.ipcCommand('SNAPSHOT')
  		.then((snapshot)=>{
  			snapshot.agent_id = this.config.id;
  			snapshot.name = this.config.name;
  			return snapshot;
  		}) // I should do this in Code.js instead and make this cleaner.
  }

  migrate (target){
    console.log(chalk.red(this.config.id)+' Received external command MIGRATE');
  	return this.snapshot()
  		.then((snapshot)=>{
  			this.proc.kill();

        // // Remove IPC Socket
        // this.ipc.destroy();

  			this.status = 'Exited';
  			
  			// return this.pubsub.request(target, 'restore_agent', snapshot)

  			// don't wait for ack; there will be two instances of the same agent.
  			return this.pubsub.publish(target+':input', {
		        sender: this.config.id,
		        verb: 'restore_agent',
		        payload: snapshot
		      });
  		})
  		.then(()=>{
  			// console.log(chalk.red('Migrated already'));
  			let agent = this.summary();
  			this.emit('status-change', {
  				status: 'Exited',
  				call: 'migrate',
  				data: agent
  			});
  			// setTimeout(()=>this.pubsub.kill(), 100);
  			return agent;
  		})
  }

  restart (){
    console.log(chalk.red(this.config.id)+' Received external command RESTART');
    this.proc.kill();
    console.log(chalk.red('Killing process '+this.proc.pid));
    return this.start().then(()=>{
      return {
        id: this.config.id,
        runtime: this.runtime.config.id
      }
    })
    // return this.ipcCommand('RESUME');
  }

  kill (){
    console.log(chalk.red(this.config.id)+' Received external command KILL');
    this.proc.kill();

    // // Remove IPC Socket
    // this.ipc.destroy();

    this.status = 'Exited';

    // var killed = Promise.resolve();
    // killed.then(()=>setTimeout(()=>this.pubsub.kill(), 100)); // need to put pubsub.kill in the macro-task queue
    
    this.emit('status-change', {
    	status: 'Exited',
    	call: 'kill'
    });

    // setTimeout(()=>this.pubsub.kill(), 100);
    // return killed;
  	
    // for now, just resolve after some time to give the child process time to clean up.
    return new Promise((resolve, reject)=>setTimeout(resolve, 250));
  }

}

Agent.IPCParentAPI = {
  'getRuntime': (agent, payload)=>{
    return Promise.resolve(agent.runtime.summary());
  },
  'getAgent': (agent, payload)=>{
    return Promise.resolve(agent.summary());
  },
  // 'getAgents': (agent, payload)=>{
  //   return Promise.resolve(agent.runtime.getAgents());
  // },
  'getAllRuntimes': (agent, payload)=>{
    let info = agent.runtime.getAllRuntimes(...payload);
    return Promise.resolve(info);
  },
  'getAllAgents': (agent, payload)=>{
    let info = agent.runtime.getAllAgents(...payload);
    return Promise.resolve(info);
  },
  'getAllPipes': (agent, payload)=>{
    let info = agent.runtime.getAllPipes(...payload);
    return Promise.resolve(info);
  },
  
  // private actions
  'getLocalInputDevice': (agent, payload)=> agent.runtime.getLocalInputDevice(payload[0]),
  'getLocalOutputDevice': (agent, payload)=> agent.runtime.getLocalOutputDevice(payload[0])
};

Agent.Operations = {
  'pause': (self, payload, response)=>self.pause(payload).then(response.okay, response.error),
  'resume': (self, payload, response)=>self.resume(payload).then(response.okay, response.error),
  'kill': (self, payload, response)=>self.kill(payload).then(response.okay, response.error),
  'snapshot': (self, payload, response)=>self.snapshot(payload).then(response.okay, response.error),
  'migrate': (self, payload, response)=>self.migrate(payload).then(response.okay, response.error),
  'restart': (self, payload, response)=>self.restart(payload).then(response.okay, response.error)
};

/**
 * Function for evaluating the "goodness" of a Runtime to 
 * run an Agent. 
 */
Agent.score = function(agent, runtimes){
  return agent.stat.cpu + agent.stat.memory * 3;
  // let runtime = runtimes[agent.runtime];
  // let clock = runtime.device.cpus.reduce((acc, item)=>(acc + item.speed), 0) / runtime.device.cpus.length;
  // return (clock * (1 - agent.stat.cpu / 100)) + (runtime.limit_memory * (1 - (agent.stat.memory / 1000000) / runtime.limit_memory)) * 3;
}

// Agent.IPCMasterActions = {
// 	'snapshot': (self, kwargs) =>{
// 	}
// };

class AgentProxy extends EventEmitter{
  constructor(name){
    // console.log('Creating Agent Proxy '+name);
    super();
  }
}
Agent.Proxy = AgentProxy;

module.exports = Agent;
