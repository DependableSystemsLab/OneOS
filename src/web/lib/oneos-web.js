const { EventEmitter } = require('events');
// const uuid = require('uuid/v4');

const { MqttWsClient, Sensors } = require('./oneos-web-common.js');

/** This is a browser-side runtime, restricted to running stateless and idempotent agents.
 *  It wraps a Worker object to provide a similar interface as the back-end Runtime object.
 */
class WebRuntime extends EventEmitter {
	constructor (){
		super();
		this._worker = new Worker('lib/oneos-web-runtime.js');

		this.worker.addEventListener('message', (e)=>{
			console.log('Worker Message', e.data);
		}, false);
		this.worker.postMessage('Hello World');
	}

	kill (){
		this._worker.terminate();
	}
}


function computeRuntimeScore(runtime){
	// console.log((1 - (runtime.stat.cpu + runtime.stat.agent_cpu + runtime.stat.daemon_cpu)/100) * runtime.device.cpus.reduce((x,c)=>(x+c.speed), 0));
	// console.log(3 * (runtime.limit_memory - ((runtime.stat.memory + runtime.stat.agent_memory + runtime.stat.daemon_memory)/1000000)));
	return ( (1 - (runtime.stat.cpu + runtime.stat.agent_cpu + runtime.stat.daemon_cpu)/100) * runtime.device.cpus.reduce((x,c)=>(x+c.speed), 0) + 3 * (runtime.limit_memory - ((runtime.stat.memory + runtime.stat.agent_memory + runtime.stat.daemon_memory)/1000000)) ).toFixed(0);
}

function computeTotalResource (runtimes){
	return Object.values(runtimes)
		.reduce((acc, item)=>{
			// console.log(acc, item);
			let cpu_total = (item.device.cpu_average_speed * item.device.cpus.length);
			acc.cpu.used += cpu_total * (item.stat.cpu + item.stat.agent_cpu + item.stat.daemon_cpu)/100;
			acc.cpu.total += cpu_total;
			acc.memory.used += (item.stat.memory + item.stat.agent_memory + item.stat.daemon_memory);
			acc.memory.total += (item.limit_memory * 1000000);
			return acc;
		}, {
			cpu: { used: 0, total: 0 },
			memory: { used: 0, total: 0 }
		})
}

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

// const OneOSEvents = ['runtime-updated', 'worker-updated', 'sensor-updated'];
const STAT_BUFFER_SIZE = 200;

export class OneOSWebClient extends EventEmitter {
	constructor (wss_url){
		super();
		this.pubsub = new MqttWsClient(wss_url);
		this.sensors = new Sensors();

		this.worker = null; // Experimental: WebWorker

		this.runtimes = {};
		this.agents = {};
		this.pipes = {};

		this.fs = {};
		this.codes = [];	// Codes for Quick Start (kinda like /bin)

		this.stats = {};
		this.resource = {
			cpu: { used: 0, total: 0 },
			memory: { used: 0, total: 0 }
		};
		this.shell_output = [];
		
		this.pubsub.on('ready', (socket)=>{
			console.log('MqttWsClient Connected to '+wss_url);
			// this.pubsub.publish('system/user', {

			// });
		});

		this.pubsub.subscribe('system/runtime', (message)=>{
			// console.log('Received new message '+(typeof message), message);
			if (message.verb === 'update' || message.verb === 'join'){
				this.runtimes[message.data.id] = message.data;
				this.agents = getAgents(this.runtimes);
				this.pipes = getPipes(this.runtimes);

				this.resource = computeTotalResource(this.runtimes);
				this.emit('runtime-updated', this.runtimes);
			}
			else if (message.verb === 'leave'){
				delete this.runtimes[message.data.id];
				this.agents = getAgents(this.runtimes);
				this.pipes = getPipes(this.runtimes);

				this.resource = computeTotalResource(this.runtimes);
				this.emit('runtime-updated', this.runtimes);
			}

		});
		this.pubsub.subscribe('system/stats', (message)=>{
			// console.log('Received new stat', message);
			if (!this.stats[message.id]) this.stats[message.id] = [];
			this.stats[message.id].push(message);
			if (this.stats[message.id].length > 1000) this.stats[message.id].shift();
			this.emit('stat', message);
		});

		this.pubsub.subscribe('shell-session/1/out', (message)=>{
          console.log(message);
          // message = Buffer.from(message.data, 'base64').toString('utf8');
          this.emit('shell-output', message);
          this.shell_output.push(message);
          // var resolve = queue.shift();
          // console.log('Hey '+resolve);
          // (resolve && resolve(String(message)));
        }, 'text');

        this.sensors.on('update', (sensors)=>this.emit('sensor-updated', sensors));

		this.refreshRuntimeInfo();
		// this.refreshFileSystem();

		this.readFileSystem('/code/basic')
			.then((data)=>{
				console.log('[oneos-web] Refreshed File System', data);
				this.codes = data.content;
				// this.emit('filesystem-updated', data);
				// return data;
			});
	}

	refreshRuntimeInfo (){
		return new Promise((resolve, reject)=>{
			$.ajax('/api')
				.done((info)=>{
					console.log('[oneos-web] Got runtime info', info);
					this.runtimes = info;
					this.agents = getAgents(this.runtimes);
					this.pipes = getPipes(this.runtimes);

					this.resource = computeTotalResource(this.runtimes);
					resolve(info);
					this.emit('runtime-updated', info);
				})
				.fail(reject)
		})
	}

	// refreshFileSystem (){
 //    	return this.readFileSystem('/')
	// 		.then((data)=>{
	// 			console.log('[oneos-web] Refreshed File System', data);
	// 			this.fs = data;
	// 			this.emit('filesystem-updated', data);
	// 			return data;
	// 		});
 //    }

	getRuntime (runtime_id) {
		return this.runtimes[runtime_id];
	}

	getAgent (agent_id) {
		return this.agents[agent_id];
	}

	getRuntimeScore (runtime) {
		return computeRuntimeScore(runtime);
	}

	shellRequest (cmd) {
		return this.pubsub.publish('shell-session/1/in', Buffer.from(cmd+'\n'));
		// return new Promise((resolve, reject)=>{
		// 	$.ajax({
		// 		method: 'POST',
		// 		url: '/shell',
		// 		contentType: 'application/json',
		// 		dataType: 'json',
		// 		// processData: false,
		// 		data: JSON.stringify({
		// 			cmd: cmd+'\n'
		// 		})
		// 	})
		// 	.done(resolve)
		// 	.fail(reject);
		// });
	}

	runAgent (agent_path, args) {
		return this.shellRequest(agent_path+'('+args.join(',')+')');
	}

	pauseAgent (agent_id) {
		return this.shellRequest('pause("'+agent_id+'")')
	}

	resumeAgent (agent_id) {
		return this.shellRequest('resume("'+agent_id+'")')
	}

	killAgent (agent_id) {
		return this.shellRequest('kill("'+agent_id+'")')
	}

	migrateAgent (agent_id, runtime_id) {
		return this.shellRequest('migrate("'+agent_id+'", "'+runtime_id+'")')
	}

	runAgentOnRuntime (agent_path, args, runtime_id) {
		return this.shellRequest(agent_path+'('+args.join(',')+') @ '+runtime_id);
	}

	createPipe (source_topic, sink_topic){
		return this.shellRequest('pipe("'+source_topic+'", "'+sink_topic+'")');
	}

	destroyPipe (pipe_id){
		return this.shellRequest('unpipe("'+pipe_id+'")');
	}

	readFileSystem (path) {
		return new Promise((resolve, reject)=>{
			$.get('/fs'+path)
			.done(resolve)
			.fail(reject);
		});
	}

	writeFileSystem (path, data) {
		return new Promise((resolve, reject)=>{
			$.ajax({
				method: 'POST',
				url: '/fs'+path,
				contentType: 'application/json',
				dataType: 'json',
				// processData: false,
				data: JSON.stringify(data)
			})
			.done(resolve)
			.fail(reject);
		});
	}

	toggleWebRuntime (){
		if (window.Worker){
			if (this.worker){
				console.log('Turning WebWorker Off');
				// this.worker.kill();

				// this.worker.terminate();
				this.worker.postMessage({
					verb: 'kill'
				});
				this.worker = null;
			}
			else {
				console.log('Turning WebWorker On');
				this.worker = new Worker('oneosWebRuntime.js');
				// this.worker = new WebRuntime();
				this.worker.addEventListener('message', (e)=>{
					console.log('Worker Message', e.data);
				}, false);
				// this.worker.postMessage('Hello World');
			}
			this.emit('worker-updated', this.worker);
		}
		else {
			console.log('Web Worker Not Supported');
		}
	}
}