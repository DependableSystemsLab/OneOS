const os = require('os');
const fs = require('fs');
const path = require('path');
const Runtime = require('../lib/core/Runtime.js');
const Agent = require('../lib/core/Agent.js');

describe('Agent Test', function(){
	let runtime;
	let agent, pyAgent, wasmAgent;
	before(function(){
		let homedir = os.homedir();
		let config_path = path.join(homedir, '.oneos');
		console.log(config_path);

		// load or create config file
		let config;
		try {
		  config = JSON.parse(fs.readFileSync(config_path).toString());
		}
		catch (e){
		  console.log('No config file found, creating one at '+config_path);
		  config = Object.assign({}, Runtime.DEFAULT_CONFIG);
		  fs.writeFileSync(config_path, JSON.stringify(config));
		}

		runtime = new Runtime(config, {});
	})

	it('can create an Agent instance', function(done){
		agent = new Agent(runtime, {
			source: 'var c=0;setInterval(function(){ console.log("javascript: " + c++); }, 100)'
		});
		done();
	});

	it('can run', function(done){
		this.timeout(5000);
		agent.start().then(()=>setTimeout(()=>{
			agent.kill().then(done);
		}, 1500));
	});

	it('can create a Python Agent instance', function(done){
		pyAgent = new Agent(runtime, {
			language: 'python',
			source: 'import time\nc=0\nwhile True:\n    print("python: "+str(c))\n    c += 1\n    time.sleep(0.1)\n'
		});
		done();
	});

	it('can run the Python Agent', function(done){
		this.timeout(5000);
		pyAgent.start().then(()=>setTimeout(()=>{
			pyAgent.kill().then(done);
		}, 1000));
	});

	it('can create a WebAssembly Agent instance', function(done){
		let source = fs.readFileSync(path.resolve(__dirname, './input/hello-world.wasm'));
		wasmAgent = new Agent(runtime, {
			language: 'wasm',
			source: source
		});
		done();
	});

	it('can run the WebAssembly Agent', function(done){
		this.timeout(5000);
		wasmAgent.start().then(()=>setTimeout(()=>{
			wasmAgent.kill().then(done);
		}, 1000));
	});

	after(function(done){
		runtime.kill().then(()=>done());
		// agent.kill()
		// .then(()=>pyAgent.kill())
		// .then(()=>wasmAgent.kill())
		// .then(()=>done());
	});

});
