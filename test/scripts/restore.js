if ((process.argv.length < 3) || (process.argv.length < 4)) {
    console.log("You must specify the number of samples and test session name:");
    console.log('  e.g.:    node '+path.basename(__filename)+' 100 test1');
    process.exit(1);
}

var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var Pubsub = require('../../lib/core/Pubsub.js');
var Code = require('../../lib/core/Code.js');
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

// Run the test
CODES.forEach(function(code_name){
	console.log('\n'+chalk.green('Testing ')+code_name);
	result[code_name] = {
		times: [],
		mean: null,
		stdev: null,
		confidence: null
	}
	var raw = fs.readFileSync(path.join(BASE_DIR, 'raw-'+code_name+'.js')).toString();
	var snapshot = JSON.parse( fs.readFileSync(path.join(BASE_DIR, code_name+'.snap.json')).toString() );

	// Measure
	for (var i=0; i < NUM_RUNS; i++){
		var measured = helpers.measureSync(()=>(Code.restore(snapshot)));
		// console.log(measured.result);
		result[code_name].times.push(measured.elapsed);
	}

	var size_before = Buffer.from(raw).length;
	var size_after = Buffer.from(measured.result).length;

	// Store result
	var stats = helpers.getStatistics(result[code_name].times, 95);
	result[code_name].mean = stats.mean;
	result[code_name].stdev = stats.stdev;
	result[code_name].confidence = stats.confidence;

	result[code_name].size_before = size_before;
	result[code_name].size_after = size_after;
	console.log('   '+chalk.yellow('Time: ')+stats.mean+' ± '+stats.confidence);
	console.log('   '+chalk.yellow('Size: ')+size_before+' -> '+size_after+'\t'+chalk.yellow(Math.round(1000*size_after/size_before)/10+' %'));
});

// Prepare output string
var output = [];
output.push( 'Code\t'+ CODES.join('\t') );
output.push( 'Mean\t'+ CODES.map(function(code_name){ return result[code_name].mean }).join('\t') );
output.push( 'Confidence Interval\t'+ CODES.map(function(code_name){ return result[code_name].confidence }).join('\t') );
output.push( 'Instrumented Size\t'+ CODES.map(function(code_name){ return result[code_name].size_before }).join('\t') );
output.push( 'Restored Size\t'+ CODES.map(function(code_name){ return result[code_name].size_after }).join('\t') );
output.push( 'Size Ratio\t'+ CODES.map(function(code_name){ return result[code_name].size_after / result[code_name].size_before }).join('\t') );

output.push( '\t' );
output.push( 'Runs\t'+ CODES.join('\t') );
for (var i=0; i < NUM_RUNS; i++){
	output.push( (1+i)+'\t'+ CODES.map(function(code_name){ return result[code_name].times[i] }).join('\t') );
}
output = output.join('\n');

fs.writeFile('restore.'+SESSION+'.csv', output, function(err){
	if (err) throw err;
	console.log(chalk.green('--- DONE ---'));
})