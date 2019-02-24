// if (process.argv.length < 3){
// 	console.log('Provide output file as argument. E.g: node dummy-memory.js proc-memory-usage.csv');
// 	process.exit();
// }
console.log(process.argv.join(', '));
// var outpath = process.argv[2];
var limit = process.argv[2] || 100;
var fps = process.argv[3] || 5;

var MB = 1000000;

// computed parameters
var delta_threshold = 0.005 * limit;
var interval = 1000 / fps;

// var fs = require('fs');
// var output = fs.createWriteStream(outpath);
var output = process.output('log');

var dummy = [];
var last_val = null;

console.log('Starting Dummy Memory at '+limit+' MB\tGC Enabled = '+(!!global.gc));
setInterval(()=>{
	var val = process.memoryUsage();
	var mb = val.rss / MB;
	var action = '';
	// var row = measure();

	var delta = limit - mb;
	var delta_is_large = delta**2 > delta_threshold**2;

	// var delta_is_large = ( !last_val || ( last_val && ((mb - last_val)**2 > delta_threshold**2 ) ));
	// console.log('Dthreshold = '+(delta_threshold)+', cur delta = '+(mb-last_val));

	if (delta_is_large){
		(global.gc && global.gc());

		if (mb < limit) {
			dummy.push(Buffer.alloc(MB, 170));
			action = 'pushed';
			// console.log('[..o] <|== Pushed');
		}
		else if (mb > limit){
			dummy.pop();
			action = 'popped';
			// console.log('[..]o ==|> Popped');
		}
		else {
			action = '';
		}

		console.log(mb + '/' + (val.heapUsed / MB) + ' MB\tAllowed= '+delta_threshold + ' MB\tDelta= '+delta.toFixed(1) +'\t'+ action);
	}
	last_val = mb;

	output.write([ 
		Date.now(), 
		val.rss, 
		val.heapTotal, 
		val.heapUsed, 
		val.external, 
		action,
		Math.abs(delta) * MB
		].join(',')+'\n');
}, interval);

process.stdin.on('data', (data)=>{
	console.log(data.toString());
	var input = data.toString().split(' ');
	if (input[0] === 'u'){
		limit += parseInt(input[1]);
		console.log('INCREMENTING LIMIT by '+input[1]+', limit is now ='+limit);
	}
	else if (input[0] === 'd'){
		limit -= parseInt(input[1]);
		console.log('DECREMENTING LIMIT by '+input[1]+', limit is now ='+limit);
	}
});