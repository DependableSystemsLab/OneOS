const { EventEmitter } = require('events');
const path = require('path');
const chalk = require('chalk');
const _ = require('lodash');
const Pubsub = require('./Pubsub.js');
const Runtime = require('./Runtime.js');
const Agent = require('./Agent.js');
const getFSClient = require('./FileSystem.js').connect;
const helpers = require('../helpers.js');

const CHANNELS = {
  'stats': 'system/stats',
  'snapshots': 'system/snapshots'
};

function getAgents (runtimes){
  let agents = {};
  Object.values(runtimes)
    .forEach((runtime)=>{
      runtime.agents.forEach((agent)=>{
        agents[agent.id] = agent;
      });
      runtime.daemons.forEach((agent)=>{
        agents[agent.id] = agent;
      });
    });
  return agents;
}

function getPipes (runtimes){
  let pipes = {};
  Object.values(runtimes)
    .forEach((runtime)=>{
      runtime.pipes.forEach((pipe)=>{
        pipes[pipe.id] = pipe;
      });
    });
  return pipes;
}

class Contract {
  constructor (){

  }
}

class AgentDeployment {
  constructor (agent, criterion){
    this.agent = agent;
    this.criterion = criterion;
  }
  summary (){
    return {
      agent: this.agent,
      criterion: this.criterion
    }
  }

  getId(){
    return this.agent.name;
  }
}

class PipeDeployment {
  constructor (source, sink){
    this.source = source;
    this.sink = sink;
  }

  getId(){
    return (source+'-'+sink);
  }
}


class Scheduler extends EventEmitter {
  constructor (pubsub_url){
    super();

    this.pubsub = new Pubsub(pubsub_url || process.oneos.pubsub_url, {
      id: 'SA/scheduler'
    });
    this.options = {
      checkInterval: 5000
    };

    this.fs = getFSClient(this.pubsub.url);
    this.systemAPI = process.api || null;
    // console.log(chalk.blue('Scheduler initializing')+' Process API : ', process.api);

    this.deployments = {};

    this.runtimes = {};
    this.agents = {};
    this.pipes = {};

    this.snapshots = {};

    // without setImmediate this ipcRequest will block
    setImmediate(()=>{
    	this.systemAPI.getAllRuntimes()
	    	.then((runtimes)=>{ 
	    		// console.log('My Runtime Is: ', host);
	    		// this.runtimes[host.id] = host; 
	    	  this.runtimes = Object.assign(this.runtimes, runtimes);
        })
	    	.catch((err)=>{
	    		console.log(err);
	    	})
    });

    this.stats = {
    	'Runtime': {},
    	'Agent': {}
    }

    this.pubsub.subscribe(Runtime.CHANNELS.membership, (message)=>{
      // console.log(Date.now()+chalk.yellow(' Scheduler ')+'new message on Runtime membership channel');
      // console.log(message);
      this.runtimes[message.publisher] = message.data;
      this.agents = getAgents(this.runtimes);
      this.pipes = getPipes(this.runtimes);

      if (message.verb === 'leave') this.runtimes[message.publisher].status = 'dead';
      else this.runtimes[message.publisher].status = 'live';
    });

    this.pubsub.subscribe(CHANNELS.stats, (message)=>{
    	if (!this.stats[message.type][message.id]) this.stats[message.type][message.id] = [];
    	else if (this.stats[message.type][message.id].length > 99) this.stats[message.type][message.id].shift();
    	message.timestamp = Date.now();
    	this.stats[message.type][message.id].push(message);
    	// console.log(chalk.yellow('Scheduler received Stat: ')+message.id);
    	// console.log(this.stats);
    });

    this.pubsub.subscribe(CHANNELS.snapshots, (message)=>{
      this.snapshots[message.agent_id] = message.snapshot;
    });

    Object.keys(Scheduler.API).forEach((verb)=>{
    	// console.log(Date.now()+chalk.yellow(' Scheduler ')+'Listening to '+verb);
      this.pubsub.setRequestHandler(verb, (payload, response)=>{
        return Scheduler.API[verb](this, payload, response);
      });
    });

    this.timer = setInterval(()=>{
      
      this.invokeLoadBalancer()
        .then(()=>this.checkContracts())

    }, this.options.checkInterval * (Math.random() + 0.5) );
  }

  selectPlacement (agent, predicate) {
  	console.log('Selecting Placement for '+agent);
  	let minimum = 100;
  	console.log('There are '+Object.values(this.runtimes).length+' runtimes');

    let runtimes = Object.values(this.runtimes)
                    .filter((runtime)=>(runtime.status==='live'));

    if (predicate && typeof predicate === 'function'){
      runtimes = runtimes.filter(predicate);
    }

    runtimes = runtimes.map(Runtime.score).sort((a,b)=>(b.score-a.score));

    // let runtimes = Runtime.score(this.runtimes);

    // if (predicate && typeof predicate === 'function'){
    //   runtimes = runtimes.filter(predicate);
    // }
    

  	// let runtimes = Object.values(this.runtimes)
  	//   .map((runtime)=>{
  	//   	console.log('inspecting ', runtime);
  	  	
  	//   	// let agents = runtime.agents.map((agent)=>{
  	//   	// 	let last = this.stats.Agent[agent.id][this.stats.Agent[agent.id].length-1];
  	//   	// 	return {
  	//   	// 		id: agent.id,
  	//   	// 		memory: last.memory,
  	//   	// 		cpu: last.cpu
  	//   	// 	}
  	//   	// });
  	//   	// let agent_memory = agents.reduce((acc,agent)=>acc+agent.memory, 0) / 1000000;
  	//   	// let last = this.stats.Runtime[runtime.id][this.stats.Runtime[runtime.id].length-1];
  	  	
  	//   	return {
  	//   		id: runtime.id,
  	//   		num_agents: runtime.agents.length,
  	//   		memory: runtime.limit_memory - ((runtime.stat.memory + runtime.stat.daemon_memory + runtime.stat.agent_memory) / 1000000),
  	//   		cpu: runtime.cpu
  	//   	}
  	//   }).sort((a,b)=>{
  	//   	// return a.num_agents - b.num_agents;
  	//   	return b.memory - a.memory;
  	//   });
  	console.log("These are the runtimes");
  	console.log(runtimes);

  	let table = [['Runtime ID', '# of Agents', 'Memory', 'CPU']];
  	table = table.concat(runtimes.map((info)=>[ info.id, info.num_agents, info.memory, info.cpu ]))
  	console.log(helpers.tabulate(table));

  	console.log('Selected ',runtimes[0]);
  	return runtimes[0].id;
  }

  getPipeHostRuntime (pipe_id){
    return Object.values(this.runtimes)
      .reduce((found, runtime)=>(found ? found : 
        runtime.pipes
          .reduce((f2, pipe)=>(f2 ? f2 :
            (pipe.id === pipe_id ? runtime.id : null)), null)
          ), null)
  }

  invokeLoadBalancer (){
    console.log('Checking runtime load');
    let scores = Object.values(this.runtimes)
                    .filter((runtime)=>(runtime.status==='live'))
                    .map(Runtime.score).sort((a,b)=>(b.score-a.score));

    // let scores = Runtime.score(this.runtimes);

    let stat = helpers.getStatistics(scores.map((item)=>item.score));
    console.log(stat);
    
    scores.forEach((item, i, list)=>{
      list[i].deviation = Math.sqrt((item.score - stat.mean)**2) / stat.stdev;
    });

    console.log(scores);
    let stressed = scores.filter((item)=>((item.cpu + item.memory > 1.6) && item.deviation > 1.3 && item.score < stat.mean)).sort((a,b)=>(a.score - b.score));
    console.log('These nodes are surely stressed!', stressed);

    // pick the runtime with the worst score
    // if all the nodes are within 1 standard deviation, no nodes are recognized as "under stress"
    if (stressed.length > 0){
      // pick an agent to move
      let agents = [].concat(this.runtimes[stressed[0].id].agents, this.runtimes[stressed[0].id].daemons)
                    .filter((a)=>(a.isMigratable))
                    .sort((a, b)=>(Agent.score(b, this.runtimes) - Agent.score(a, this.runtimes)));
      console.log(agents);
      
      // we can pick an agent
      if (agents.length > 0){
        console.log('Going to migrate '+agents[0].id);
        let runtime = this.selectPlacement(agents[0].id);
        return this.pubsub.request(agents[0].id, 'migrate', runtime)
          .then(()=>({ action: 'migrate', args: [ agents[0].id, runtime ] }));
      }
      console.log('------------------------------- Adjusting...');
      // console.log(this.runtimes[stressed[0].id].agents, this.runtimes[stressed[0].id].daemons);
      // console.log(Agent.score(this.agents))
      // let agent = this.runtimes[stressed[0].id].agents;
    }
    return Promise.resolve(null);
  }

  checkContracts (){
    console.log('Checking Contracts....');
    let runtimeIds = Object.keys(this.runtimes);
    let actions = [];
    let fsOps = [];

    Object.values(this.deployments)
      .forEach((dep)=>{
        helpers.prettyPrint(dep);
        if (dep.criterion === '*'){
          let running = Object.values(this.agents).filter((agent)=>(agent.name === dep.agent.name));
          if (running.length !== runtimeIds){
            fsOps.push([ dep.agent.name, dep.agent.source ]);
            _.difference(runtimeIds, running.map((agent)=>agent.runtime))
              .forEach((runtime)=>actions.push({ action: 'run', runtime: runtime, agent: dep.agent.name }))
          }
        }
      });

    if (actions.length === 0) return Promise.resolve(null);

    console.log('There are '+actions.length+' actions to be applied...');
    console.log(actions);
    return Promise.resolve()
      .then(()=>{
        if (fsOps.length > 0){
          return Promise.all(
            fsOps.map((args)=>
              new Promise((resolve, reject)=>{
                this.fs.readFile(args[1], (err, content)=>{
                  if (err) reject(err);
                  else resolve([ 
                    args[0], 
                    (path.extname(args[1]) === '.py' ? 'python3' : 'javascript'), 
                    content.toString() 
                    ]);
                });
              }))
            ).then((sources)=>{
              return sources.reduce((acc, args)=>{ 
                acc[args[0]] = {
                  language: args[1],
                  source: args[2]
                };
                return acc;
              }, {});
            });
        }
        else return {};
      })
      .then((files)=>
        Promise.all(
            actions.map((item)=>{
              console.log(files[item.agent]);
              switch (item.action){
                case 'run':
                  return this.pubsub.request(item.runtime, 'start_agent', {
                    name: item.agent,
                    source: files[item.agent].source,
                    required_memory: 100,
                    language: files[item.agent].language,
                    pipes: [],
                    start_options: {
                      args: []
                    }
                  });
                
                default:

                  break;
              }
            })
          )
      )
      .then((result)=>{
        console.log(result.length+' Actions Applied after Checking the Contracts');
      })
  }

}

Scheduler.API = {
	'run': (self, payload, response)=>{
		console.log(Date.now()+chalk.yellow(' Scheduler ')+'Received Run Command ', payload.source_path);
		return new Promise((resolve, reject)=>{
			let language = path.extname(payload.source_path) === '.py' ? 'python3' : 'javascript';
			console.log('This is '+language);

      payload.pipes.forEach((pipe)=>{
        console.log("Got Pipe: "+pipe.source.topic+' -> '+pipe.target.topic);
      });

			self.fs.readFile(payload.source_path, (err, content)=>{
				if (err) reject(err);
				else resolve({
					// name: path.basename(payload.source_path),
					name: payload.name,
          source: content.toString(),
					required_memory: 100,
					language: language,
          pipes: payload.pipes
				}); //kwargs
			})	
		}).then((kwargs)=>{
			// compute where to dispatch
			// var runtime = 'jks-xeon';
			// console.log(self.systemAPI.getAllRuntimes());
			// console.log(chalk.magenta('Selected!!!'));
			// console.log(self.selectPlacement(kwargs.name));

			let runtime = self.selectPlacement(kwargs.name);
      console.log('[Scheduler] Selected <'+runtime+'> to run ['+payload.name+']');

      kwargs.start_options = {
        args: payload.args
      };

			return self.pubsub.request(runtime, 'start_agent', kwargs).then(response.okay, response.error);
		}).catch(response.error);
	},
	'kill': (self, payload, response)=>{
		console.log(Date.now()+chalk.yellow(' Scheduler ')+'Received Kill Command ', payload);
		
    if (payload === '*'){
      return self.systemAPI.getAllAgents(true)
        .then((agents)=>Promise.all(Object.keys(agents).map((id)=>self.pubsub.request(id, 'kill'))))
        .then(response.okay, response.error);
    }
    else return self.pubsub.request(payload, 'kill').then(response.okay, response.error);
		// return Promise.resolve(payload);
	},
	'pause': (self, payload, response)=>{
		console.log(Date.now()+chalk.yellow(' Scheduler ')+'Received pause Command ', payload);
    
    if (payload === '*'){
      return self.systemAPI.getAllAgents(true)
        .then((agents)=>Promise.all(Object.keys(agents).map((id)=>self.pubsub.request(id, 'pause'))))
        .then(response.okay, response.error);
    }
    else return self.pubsub.request(payload, 'pause').then(response.okay, response.error);

		// return Promise.resolve(payload);
	},
	'resume': (self, payload, response)=>{
		console.log(Date.now()+chalk.yellow(' Scheduler ')+'Received resume Command ', payload);
		
    if (payload === '*'){
      return self.systemAPI.getAllAgents(true)
        .then((agents)=>Promise.all(Object.keys(agents).map((id)=>self.pubsub.request(id, 'resume'))))
        .then(response.okay, response.error);
    }
		return self.pubsub.request(payload, 'resume').then(response.okay, response.error);

		// return Promise.resolve(payload);
	},
	'snapshot': (self, payload, response)=>{
		console.log(Date.now()+chalk.yellow(' Scheduler ')+'Received snapshot Command ', payload);
		
		return self.pubsub.request(payload, 'snapshot').then(response.okay, response.error);

		// return Promise.resolve(payload);
	},
	'migrate': (self, payload, response)=>{
		console.log(Date.now()+chalk.yellow(' Scheduler ')+'Received migrate Command ', payload);
		
		return self.pubsub.request(payload.agent, 'migrate', payload.runtime).then(response.okay, response.error);
	},
  'restart': (self, payload, response)=>{
    console.log(Date.now()+chalk.yellow(' Scheduler ')+'Received restart Command ', payload);
    
    return self.pubsub.request(payload, 'restart').then(response.okay, response.error);

    // return Promise.resolve(payload);
  },

  'pipe-create': (self, payload, response)=>{
    console.log(Date.now()+chalk.yellow(' Scheduler ')+'Received Create Pipe Command ', payload.source+' -> '+payload.sink);

    let runtime = self.selectPlacement('arbitrary.pipe', (runtime)=>(runtime.type !== 'web-worker')); // change this call later, as this should be used for agents

    return self.pubsub.request(runtime, 'start_pipe', payload).then(response.okay, response.error);
  },
  'pipe-destroy': (self, payload, response)=>{
    console.log(Date.now()+chalk.yellow(' Scheduler ')+'Received Destroy Pipe Command ', payload);

    let runtime = self.getPipeHostRuntime(payload);
    if (!runtime){
      response.error(new Error('Could not find Pipe '+payload));
      // return Promise.reject(new Error('Could not find Pipe '+payload));
    }

    return self.pubsub.request(runtime, 'kill_pipe', payload).then(response.okay, response.error);
  },

  'deploy': (self, payload, response)=>{
    console.log(Date.now()+chalk.yellow(' Scheduler ')+'Received Deploy Command ');
    self.deployments[payload.agent.name] = new AgentDeployment(payload.agent, payload.criterion);
    response.okay(payload.agent.name);
    // return Promise.resolve(payload.agent.name);
  },
  'withdraw': (self, payload, response)=>{
    console.log(Date.now()+chalk.yellow(' Scheduler ')+'Received Withdraw Command ');
    if (payload in self.deployments){
      let dep = self.deployments[payload].summary();
      delete self.deployments[payload];
      response.okay(dep);
    }
    else response.error(new Error('Deployment Contract does not exist'));
  },

  'get-deployments': (self, payload, response)=>{
    console.log(Date.now()+chalk.yellow(' Scheduler ')+'Received Get Deployments Command ');
    response.okay(Object.values(self.deployments).map((dep)=>dep.summary()));
  }
}

module.exports = Scheduler;