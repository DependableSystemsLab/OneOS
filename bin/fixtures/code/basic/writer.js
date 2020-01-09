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
var dataDirectory = '/data/';

// import path and oneos file system
var path = require('path');
var fs = require('oneos').fs();

var buffer = [];

// get full path of the file to write to
target = path.resolve(dataDirectory, target);

// when data incoming on stdin
process.stdin.on('data', function(data){
	console.log(Date.now() + '\t' + data.toString());
	buffer.push(data.toString());
});

// write buffer content into file at regular interval
setInterval(function(){
	var str = buffer.join('\n');
	buffer = [];

	fs.appendFile(target, str, function(err){
		console.log('Wrote '+str.length+' Characters to File '+target);
	});
}, writeInterval);