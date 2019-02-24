/*oneos.meta
name: Reader
*/
console.log('Process Arguments '+process.argv.length+': ' + process.argv.join(', '));
if (process.argv.length < 3){
	console.log('Need to provide the source as an argument');
	process.exit(1);
}
var source = process.argv[2];
var fps = parseInt(process.argv[3]) || 1;
var type = process.argv[4] || 'bit';

setInterval(function(){
	if (type === 'bit'){
		console.log(source+' '+Math.floor(Math.random()*2));
	}
}, 1000 / fps);