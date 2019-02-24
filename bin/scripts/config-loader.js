const os = require('os');
const path = require('path');
const util = require('util');
const fs = require('fs');
const child_process = require('child_process');
const readline = require('readline');
const Runtime = require('../../lib/core/Runtime.js');
const Auth = require('../../lib/core/Auth.js');
const helpers = require('../../lib/helpers.js');

const exec = util.promisify(child_process.exec);
const readdir = util.promisify(fs.readdir);
const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const device = helpers.getSystemInfo();

function interactiveSetup(){
	let cli = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	let config = Object.assign({}, Runtime.DEFAULT_CONFIG);
	let questions = [{
		text: 'Enter the Pub/Sub Service URL (default=mqtt://localhost): ',
		onEnter: (input)=>{
			if (input) config.pubsub_url = input;
		}
	},
	{
		text: 'Enter an ID to assign this device (default= uuid will be generated): ',
		onEnter: (input)=>{
			if (input) config.id = input;
		}
	},
	{
		text: 'Enter memory limit for this device (default=512 MB, max='+(device.memory_total/1000000)+' MB): ',
		onEnter: (input)=>{
			if (input) config.limit_memory = parseInt(input);
		}
	},
	{
		text: 'Should this Runtime be a Kernel Runtime? (Y/n): ',
		onEnter: (input)=>{
			input = input.toLowerCase();
			if (input === 'y') config.type = 'kernel';
			else if (input === 'n') config.type = 'regular'
		}
	}];

	return helpers.resolveSequence(questions.map((item)=>
		()=>new Promise((resolve, reject)=>{
			cli.question(item.text, (answer)=>{
				item.onEnter(answer);
				resolve(answer);
			});
		}))).then((answers)=>{
			cli.close();
			console.log('Using settings: ');
			helpers.prettyPrint(config);
			return config;
		});
}

module.exports = {
	load: function(){
		const homedir = os.homedir();
		const oneos_dir = path.join(homedir, '.oneos');
		const config_path = path.join(oneos_dir, 'config.json');
		const consensus_log_path = path.join(oneos_dir, 'consensus.log');

		return readdir(oneos_dir)
			.catch((err)=>{
				if (err.code === 'ENOENT'){
					console.log('No config found, let us create one at '+oneos_dir);
					return mkdir(oneos_dir)
						.then(()=>process.chdir(oneos_dir))
						.then(()=>interactiveSetup()
										.then((config)=>
											writeFile(config_path, JSON.stringify(config))
											.then(()=>mkdir(path.join(oneos_dir, 'keys')))
											.then(()=>Auth.keygen(path.join(oneos_dir, 'keys/'+config.id))))
						)
						.then(()=>writeFile(consensus_log_path, [Date.now(), 'initialized'].join(',')))
						.then(()=>writeFile(path.join(oneos_dir, 'package.json'), '{}'))
						.then(()=>exec('npm link oneos', { cwd: oneos_dir })
							.then((stdout, stderr)=>console.log(String(stdout)))
						)
						.then(()=>readdir(oneos_dir));
				}
				else return Promise.reject(err);
			})
			.then((files)=>{
				process.chdir(oneos_dir);
				console.log(process.cwd());
				console.log('OneOS Configuration Loaded. Starting OneOS Runtime');
				return readFile(config_path)
					.then((data)=>JSON.parse(data.toString()));
			})
	}
}