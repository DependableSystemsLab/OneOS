console.log('Process Arguments '+process.argv.length+': ' + process.argv.join(', '));
if (process.argv.length < 3){
	console.log('Need to provide the output file name as an argument');
	process.exit(1);
}
var target = process.argv[2];

var fs = require('fs');
var ffmpeg = require('fluent-ffmpeg');

var inStream = process.input('mpeg');
var controlStream = process.input('ctrl', 'json');

controlStream.on('data', (message)=>{
	if (message.ctrl === 'START'){
		var cmd = ffmpeg(inStream)
			.noAudio()
			.output(target+'-'+Date.now()+'.mp4')
			.on('start', (rawcmd)=>console.log(rawcmd))
			.on('end', ()=>console.log('Finished Recording'))
			.run();
	}
	else {
		inStream.emit('end');	// does not actually end the stream; just signalling ffmpeg to finish
	}
});