if ((process.argv.length < 3) || (process.argv.length < 4)) {
    console.log("You must specify the number of samples and test session name:");
    console.log('  e.g.:    node '+path.basename(__filename)+' 100 test1');
    process.exit(1);
}

var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var pidusage = require('pidusage');
var chalk = require('chalk');
// var things = require('../../lib/things.js');
var Runtime = require('../../lib/core/Runtime.js');
var Agent = require('../../lib/core/Agent.js');
var helpers = require('../../lib/helpers.js');


var NUM_RUNS = parseInt(process.argv[2]);
var SESSION = process.argv[3];
var BASE_DIR = path.resolve(__dirname, './input');
// var RESULT_DIR = path.resolve(__dirname, './output');
var CODES = [
	'octane-navier-stokes',
	'octane-splay',
	'factorial'
]

var result = {};

function runCode(code_name, source, mode){
	return new Promise((resolve, reject)=>{

		var stats = [], started = null, elapsed = null;

		var agent_id = code_name+'.'+helpers.randKey();
		var config = {}, options = {};
		switch (mode){
			case 'raw':
				options.disableMigration = true;
				break;
			case 'instrumented':
				break;
			case 'restore':
				config.language = 'snapshot';
				break;
		}

		var agent = new Agent(Runtime.createDummy(), Object.assign({
		    id: agent_id,
		    name: code_name,
		    source: source,
		    language: 'javascript',
		    pipes: []
		  }, config), Object.assign({
		    localStdio: true,
		    snapshotInterval: null
		  }, options));

		agent.on('stat-update', (stat)=>{
			// console.log(stat);
			if (!started) started = Date.now();
			stats.push(stat);
		});

		agent.on('status-change', (event)=>{
			if (event.status === 'Exited'){
				elapsed = Date.now() - started;
				stats.forEach(function(item, index, list){
					list[index].t = item.timestamp - stats[0].timestamp;
				});
				resolve({
					log: stats,
					elapsed: elapsed
				});

				console.log(chalk.red('Exited ')+event.exit_code+' | signal = '+event.signal);
			}
		});

		agent.start({});
	});
}

function runTest(codes){
	if (codes.length === 0) return Promise.resolve(true);
	var code_name = codes[0];
	console.log('\n'+chalk.green('Testing ')+code_name);
	result[code_name] = {};
	// var code = path.join(BASE_DIR, code_name+'.inst.js');

	var code_raw = path.join(BASE_DIR, 'raw-'+code_name+'.js');
	// var code_inst = path.join(BASE_DIR, code_name+'.exec.inst.js');
	var code_snap = path.join(BASE_DIR, code_name+'.snap.json');

	var source = fs.readFileSync(code_raw).toString();
	var snapshot = JSON.parse(fs.readFileSync(code_snap).toString());

	return helpers.repeatAsync(()=>(runCode(code_name, source, 'raw')), NUM_RUNS)
		.then((results)=>{
			result[code_name].raw = results
			result[code_name].raw_stats = helpers.getStatistics(results.map(function(item){ return item.elapsed }), 95);
		})
		.then(()=>helpers.repeatAsync(()=>(runCode(code_name, source, 'instrumented')), NUM_RUNS))
		.then((results)=>{
			result[code_name].inst = results
			result[code_name].inst_stats = helpers.getStatistics(results.map(function(item){ return item.elapsed }), 95);
		})
		.then(()=>helpers.repeatAsync(()=>(runCode(code_name, snapshot, 'restore')), NUM_RUNS))
		.then((results)=>{
			result[code_name].rest = results
			result[code_name].rest_stats = helpers.getStatistics(results.map(function(item){ return item.elapsed }), 95);

			// finished 1 program
			var inst_ratio = Math.round(1000 * result[code_name].inst_stats.mean / result[code_name].raw_stats.mean) / 10;
			var rest_ratio = Math.round(1000 * result[code_name].rest_stats.mean / result[code_name].raw_stats.mean) / 10;
			
			console.log('   '+chalk.yellow(code_name)+' :');
			console.log('     '+chalk.red('Raw')+' : '+result[code_name].raw_stats.mean+' ± '+result[code_name].raw_stats.confidence);
			console.log('     '+chalk.red("Instr'ed")+' : '+result[code_name].inst_stats.mean+' ± '+result[code_name].inst_stats.confidence+'    '+chalk.red(inst_ratio+' %'));
			console.log('     '+chalk.red('Restored')+' : '+result[code_name].rest_stats.mean+' ± '+result[code_name].rest_stats.confidence+'    '+chalk.red(rest_ratio+' %'));

			return runTest(codes.slice(1));
		})

	// return serialExecute(code_raw, NUM_RUNS)
	// 	.then(function(results){
	// 		result[code_name].raw = results
	// 		result[code_name].raw_stats = helpers.analyzeArray(results.map(function(item){ return item.elapsed }), 95);
	// 	})
	// 	.then(function(){
	// 		return serialExecute(code_inst, NUM_RUNS)
	// 	})
	// 	.then(function(results){
	// 		result[code_name].inst = results
	// 		result[code_name].inst_stats = helpers.analyzeArray(results.map(function(item){ return item.elapsed }), 95);
	// 	})
	// 	.then(function(){
	// 		return serialExecute(code_rest, NUM_RUNS)
	// 	})
	// 	.then(function(results){
	// 		result[code_name].rest = results
	// 		result[code_name].rest_stats = helpers.analyzeArray(results.map(function(item){ return item.elapsed }), 95);

	// 		var inst_ratio = Math.round(1000 * result[code_name].inst_stats.mean / result[code_name].raw_stats.mean) / 10;
	// 		var rest_ratio = Math.round(1000 * result[code_name].rest_stats.mean / result[code_name].raw_stats.mean) / 10;
			
	// 		console.log('   '+chalk.yellow(code_name)+' :');
	// 		console.log('     '+chalk.red('Raw')+' : '+result[code_name].raw_stats.mean+' ± '+result[code_name].raw_stats.confidence);
	// 		console.log('     '+chalk.red("Instr'ed")+' : '+result[code_name].inst_stats.mean+' ± '+result[code_name].inst_stats.confidence+'    '+chalk.red(inst_ratio+' %'));
	// 		console.log('     '+chalk.red('Restored')+' : '+result[code_name].rest_stats.mean+' ± '+result[code_name].rest_stats.confidence+'    '+chalk.red(rest_ratio+' %'));

	// 		return runTest(codes.slice(1));
	// 	})	
}

// Run the test
runTest(CODES)
.then(function(){

	var runs = [];
	var run_data = [];
	for (var j=0; j < CODES.length; j++) {
		(['raw', 'inst', 'rest']).forEach((type)=>{
			var means = {
				cpu: [],
				memory: []
			}
			for (var i=0; i< NUM_RUNS; i++){
				var run = result[CODES[j]][type][i].log;
				// console.log(result[CODES[j]][type]);
				
				var t_data = [ CODES[j]+' ('+type+' '+i+') ', 'timestamp', 'mean', 'stdev', 'max', 'min', '' ];
				var cpu_data = [ '', 'cpu' ];
				var mem_data = [ '', 'memory' ];

				var cpu_stats = helpers.getStatistics(run.map(function(item){ return item.cpu }), 95);
				var mem_stats = helpers.getStatistics(run.map(function(item){ return item.memory }), 95);

				cpu_data.push(cpu_stats.mean, cpu_stats.stdev, cpu_stats.max, cpu_stats.min, '' );
				mem_data.push(mem_stats.mean / 1000000, mem_stats.stdev / 1000000, mem_stats.max / 1000000, mem_stats.min / 1000000, '' );

				means.cpu.push(cpu_stats.mean);
				means.memory.push(mem_stats.mean / 1000000);

				run.forEach(function(datum){
					t_data.push(datum.t);
					cpu_data.push(datum.cpu);
					mem_data.push(datum.memory / 1000000);
				})

				run_data.push(t_data);
				run_data.push(cpu_data);
				run_data.push(mem_data);
			}

			result[CODES[j]][type+'_cpu'] = helpers.getStatistics(means.cpu, 95);
			result[CODES[j]][type+'_memory'] = helpers.getStatistics(means.memory, 95);
		})
	}
	run_data = flipArray(run_data).map(function(row){ return row.join('\t') });
	runs = runs.concat(run_data);

	runs = runs.join('\n');
	fs.writeFile('execute.'+SESSION+'.runs.csv', runs, function(err){
		if (err) throw err;
		console.log(chalk.green('--- DONE ---'));
	});

	var output = [];
	output.push( 'Code\t'+ CODES.reduce(function(acc, code){ return acc.concat([ code, code+' (inst)', code+' (rest)' ]) }, []).join('\t') );
	output.push( 'Mean\t'+ CODES.reduce(function(acc, code){ return acc.concat([ result[code].raw_stats.mean, result[code].inst_stats.mean, result[code].rest_stats.mean ]) }, []).join('\t') );
	output.push( 'Confidence Interval\t'+ CODES.reduce(function(acc, code){ return acc.concat([ result[code].raw_stats.confidence, result[code].inst_stats.confidence, result[code].rest_stats.confidence ]) }, []).join('\t') );
	output.push( 'Mean CPU\t'+ CODES.reduce(function(acc, code){ return acc.concat([ result[code].raw_cpu.mean, result[code].inst_cpu.mean, result[code].rest_cpu.mean ]) }, []).join('\t') );
	output.push( 'CPU Conf.\t'+ CODES.reduce(function(acc, code){ return acc.concat([ result[code].raw_cpu.confidence, result[code].inst_cpu.confidence, result[code].rest_cpu.confidence ]) }, []).join('\t') );
	output.push( 'Mean Memory\t'+ CODES.reduce(function(acc, code){ return acc.concat([ result[code].raw_memory.mean, result[code].inst_memory.mean, result[code].rest_memory.mean ]) }, []).join('\t') );
	output.push( 'Mem. Conf.\t'+ CODES.reduce(function(acc, code){ return acc.concat([ result[code].raw_memory.confidence, result[code].inst_memory.confidence, result[code].rest_memory.confidence ]) }, []).join('\t') );
	
	output = output.join('\n');

	fs.writeFile('execute.'+SESSION+'.csv', output, function(err){
		if (err) throw err;
		console.log(chalk.green('--- DONE ---'));
	});
})

function flipArray(array2d){
	var flipped = [];
	array2d.forEach(function(row, rowIndex, table){
		row.forEach(function(item, colIndex){
			if (flipped.length <= colIndex){
				for (var i=-1; i < colIndex - flipped.length; i++){
					flipped.push([]);
				}
			}
			if (flipped[colIndex].length <= rowIndex){
				for (var i=-1; i < rowIndex - flipped[colIndex].length; i++){
					flipped[colIndex].push(undefined);
				}
			}
			flipped[colIndex][rowIndex] = item;
		})
	});
	return flipped;
}