/*oneos.meta
name: Writer
*/
console.log('Process Arguments '+process.argv.length+': ' + process.argv.join(', '));
if (process.argv.length < 3){
	console.log('Need to provide the target as an argument');
	process.exit(1);
}
var target = process.argv[2];
var writeInterval = parseInt(process.argv[3]) * 1000 || 10000;
var buffer = [];

var path = require('path');
var fs = require('oneos').fs();

target = path.resolve('/data/', target);

process.stdin.on('data', function(data){
	console.log(Date.now() + '\t' + data.toString());
	buffer.push(data.toString());
});

setInterval(function(){
	var str = buffer.join('\n');
	buffer = [];

	fs.appendFile(target, str, function(err){
		console.log('Wrote '+str.length+' Characters to File '+target);
	});
}, writeInterval);