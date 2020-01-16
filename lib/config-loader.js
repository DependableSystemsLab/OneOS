const os = require('os');
const path = require('path');
const util = require('util');
const fs = require('fs');
const child_process = require('child_process');
const readline = require('readline');
const Runtime = require('./core/Runtime.js');
const Auth = require('./core/Auth.js');
const helpers = require('./helpers.js');

const exec = util.promisify(child_process.exec);
const readdir = util.promisify(fs.readdir);
const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

// hard-coded driver list - in the future, this should be loaded dynamically
const DRIVERS_AVAILABLE = {
	input: [
		'input-randbyte',
		'input-gpio-4',
		'input-video-ffmpeg'
	],
	output: [
		'output-dump',
		'output-gpio-7'
	]
}

const device = helpers.getSystemInfo();

function interactiveSetup(){
	let cli = new helpers.CLI();

	let config = Object.assign({}, Runtime.DEFAULT_CONFIG);

	let max_memory = Math.floor(device.memory_total/1000000);

	function addLocalIO(){
		let temp = {
			type: null,
			name: null,
			driver: null
		};
		return cli.askValidated('Add input or output device? (n: no / i: input / o: output): ', 'charset', 'nio')
		.then((resp)=>{
			if (resp === 'n') return null;
			else {
				temp.type = (resp === 'i' ? 'input' : 'output');

				return cli.askConfirmed('Enter a name for this device (this name will be used by a user application to access the device): ')
				.then((resp)=>{
					temp.name = resp;
				})
				.then(()=> cli.askValidated('Which driver should this device "'+temp.name+'" use?\n'+DRIVERS_AVAILABLE[temp.type].map((item, index)=> ('\t'+index+') '+item)).join('\n')+'\nselect: ', 'range', 0, DRIVERS_AVAILABLE[temp.type].length-1))
				.then((resp)=>{
					temp.driver = DRIVERS_AVAILABLE[temp.type][resp];
				})
				.then(()=> {
					console.log('Adding '+temp.type+' device "'+temp.name+'" using driver '+temp.driver);
					config.io[temp.type][temp.name] = temp.driver;
				})
				.then(()=> addLocalIO());
			}
		})
	}

	return cli.ask('Enter the Pub/Sub Service URL (default=' + config.pubsub_url + '): ')
		.then((resp)=>{
			resp = resp.trim();
			if (resp) config.pubsub_url = resp;
		})
		.then(()=> cli.ask('Enter the Backend Storage Service URL (default=' + config.store_url + '): '))
		.then((resp)=>{
			resp = resp.trim();
			if (resp) config.store_url = resp;
		})
		.then(()=> cli.ask('Enter an ID to assign this device (default= uuid will be generated): '))
		.then((resp)=>{
			resp = resp.trim();
			if (resp) config.id = resp;
		})
		.then(()=> cli.askValidated('Enter memory limit for this device (default=512 MB, max='+max_memory+' MB): ', 'range', 50, max_memory))
		.then((resp)=>{
			config.limit_memory = resp;
		})
		.then(()=> cli.askValidated('Should this Runtime be a Kernel Runtime? (y/n): ', 'yn'))
		.then((resp)=>{
			config.type = (resp === 'y' ? 'kernel' : 'regular');
		})
		.then(()=> addLocalIO())
		.then(()=>{
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
							// .then((stdout, stderr)=>console.log(String(stdout)))
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