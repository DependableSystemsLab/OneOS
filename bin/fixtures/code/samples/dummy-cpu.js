// if (process.argv.length < 3){
// 	console.log('Provide output file as argument. E.g: node dummy-cpu.js proc-cpu-usage.csv');
// 	process.exit();
// }
console.log(process.argv.join(', '));
// var outpath = process.argv[2];
var limit = process.argv[2] || 50;
var fps = process.argv[3] || 5;

var interval = 1000 / fps;
// var waste_interval = limit / 100 * interval;

// var fs = require('fs');
// var output = fs.createWriteStream(outpath);
var output = process.output('log');

var last_call = process.hrtime();
var last_val = process.cpuUsage();

function hrtimeMS(hrtime){
	return hrtime[0] * 1e3 + hrtime[1] / 1e6;
}

function toPercent(num){
	return (100 * num).toFixed(1) + '%';
}

console.log('Starting Dummy CPU at '+limit+' %');
setInterval(()=>{
	// waste cycles
	var waste_interval = limit / 100 * interval;
	var now = Date.now();
	var tick = 0;
	while ((Date.now() - now) < waste_interval) tick ++;
	// console.log('Ticked '+tick+' times in '+waste_interval+' ms');

	var hrtimeDiff = process.hrtime(last_call);
	var cpuDiff = process.cpuUsage(last_val);

	var cpuTotal = (cpuDiff.user + cpuDiff.system) / 1e3;
	var elapsed = hrtimeMS(hrtimeDiff);

	var usage = cpuTotal / elapsed;
	// var action = '';
	console.log((cpuDiff.system/1000) + ' + ' + (cpuDiff.user/1000) + ' ms / ' + elapsed +' ms \tUsage = '+toPercent(usage)+'\tTicks = '+tick);

	output.write([ 
		Date.now(), 
		cpuDiff.user / 1000,
		cpuDiff.system / 1000,
		cpuTotal,
		elapsed,
		usage,
		tick,
		// action,
		// Math.abs(delta) * MB
		].join(',')+'\n');

	last_call = process.hrtime();
	last_val = process.cpuUsage();
}, interval);

process.stdin.on('data', (data)=>{
	console.log(data.toString());
	var input = data.toString().split(' ');
	if (input[0] === 'u'){
		limit += parseInt(input[1]);
		console.log('INCREMENTING WORKLOAD by '+input[1]+', limit is now ='+limit);
	}
	else if (input[0] === 'd'){
		limit -= parseInt(input[1]);
		console.log('DECREMENTING WORKLOAD by '+input[1]+', limit is now ='+limit);
	}
});