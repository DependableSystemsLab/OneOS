console.log('Dummy Agent Starting, args: '+process.argv.join(', '));
// var outpath = process.argv[2];
var cpu_target = process.argv[2] || 25;
var mem_target = process.argv[3] || 100;
var fps = process.argv[4] || 5;

var MB = 1000000;

var delta_threshold = 0.005 * mem_target;
var interval = 1000 / fps;
// var waste_interval = cpu_target / 100 * interval;

// var fs = require('fs');
// var output = fs.createWriteStream(outpath);
var output = process.output('log');

var buffer = [];

var last_call = process.hrtime();
var last_cpu = process.cpuUsage();
var last_mem = null;

function hrtimeMS(hrtime){
	return hrtime[0] * 1e3 + hrtime[1] / 1e6;
}

function toPercent(num){
	return (100 * num).toFixed(1) + '%';
}

console.log('Starting Dummy CPU at '+cpu_target+' %');
console.log('Starting Dummy Memory at '+mem_target+' MB\tGC Enabled = '+(!!global.gc));
setInterval(()=>{

// CPU 

	// waste cycles
	var waste_interval = cpu_target / 100 * interval;
	var now = Date.now();
	var tick = 0;
	while ((Date.now() - now) < waste_interval) tick ++;
	// console.log('Ticked '+tick+' times in '+waste_interval+' ms');

	var hrtimeDiff = process.hrtime(last_call);
	var cpuDiff = process.cpuUsage(last_cpu);

	var cpuTotal = (cpuDiff.user + cpuDiff.system) / 1e3;
	var elapsed = hrtimeMS(hrtimeDiff);

	var usage = cpuTotal / elapsed;
	// var action = '';
	console.log((cpuDiff.system/1000) + ' + ' + (cpuDiff.user/1000) + ' ms / ' + elapsed +' ms \tCPU Usage = '+toPercent(usage)+'\tTicks = '+tick);

// MEM

	var mem = process.memoryUsage();
	var mb = mem.rss / MB;
	var action = '';
	// var row = measure();

	var delta = mem_target - mb;
	var delta_is_large = delta**2 > delta_threshold**2;

	// var delta_is_large = ( !last_val || ( last_val && ((mb - last_val)**2 > delta_threshold**2 ) ));
	// console.log('Dthreshold = '+(delta_threshold)+', cur delta = '+(mb-last_val));

	if (delta_is_large){
		(global.gc && global.gc());

		if (mb < mem_target) {
			buffer.push(Buffer.alloc(MB, 170));
			action = 'pushed';
			// console.log('[..o] <|== Pushed');
		}
		else if (mb > mem_target){
			buffer.pop();
			action = 'popped';
			// console.log('[..]o ==|> Popped');
		}
		else {
			action = '';
		}

		console.log(mb + '/' + (mem.heapUsed / MB) + ' MB\tTolerance= '+delta_threshold + ' MB\tDelta= '+delta.toFixed(1) +'\t'+ action);
	}
	last_mem = mb;

	output.write([ 
		Date.now(), 
		cpuDiff.user / 1000,
		cpuDiff.system / 1000,
		cpuTotal,
		elapsed,
		usage,
		tick,
		mem.rss, 
		mem.heapTotal, 
		mem.heapUsed, 
		mem.external, 
		action,
		Math.abs(delta) * MB
		// action,
		// Math.abs(delta) * MB
		].join(',')+'\n');

	last_call = process.hrtime();
	last_cpu = process.cpuUsage();
}, interval);

process.stdin.on('data', (data)=>{
	console.log(data.toString());
	var input = data.toString().split(' ');
	if (input[0] === 'ic'){
		cpu_target += parseInt(input[1]);
		console.log('INCREMENTING CPU WORKLOAD by '+input[1]+', cpu_target is now ='+cpu_target);
	}
	else if (input[0] === 'dc'){
		cpu_target -= parseInt(input[1]);
		console.log('DECREMENTING CPU WORKLOAD by '+input[1]+', cpu_target is now ='+cpu_target);
	}
	else if (input[0] === 'im'){
		mem_target += parseInt(input[1]);
		console.log('INCREMENTING MEMORY WORKLOAD by '+input[1]+', mem_target is now ='+mem_target);
	}
	else if (input[0] === 'dm'){
		mem_target -= parseInt(input[1]);
		console.log('DECREMENTING MEMORY WORKLOAD by '+input[1]+', mem_target is now ='+mem_target);
	}
});