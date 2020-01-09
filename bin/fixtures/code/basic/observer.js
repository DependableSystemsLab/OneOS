/*oneos.meta
name: Observer
description: Reads from the given video device and writes to a "video" channel
*/
var ffmpeg = require('fluent-ffmpeg');

if (process.argv.length < 3){
	console.log('Need to provide the input device as an argument.\n  e.g., observer.js /dev/video0');
	process.exit(1);
}

var videoDevice = process.argv[2];

var outStream = process.output('video');

var cmd = ffmpeg(videoDevice)
		.inputOptions(['-f v4l2', '-framerate 15', '-video_size 320x240'])
		.outputOptions(['-b 300k', '-r 15', '-f image2pipe'])
		.output(outStream)
		.noAudio()
		.on('start', function(rawcmd){
			console.log(rawcmd);
		})
		.on('end', function(){
			console.log("Stream Ended");
		})
		.run();

// optionally report memory usage
/*setInterval(function(){
	var mem = Math.round(process.memoryUsage().rss / 10000) / 100;
	console.log(mem+' MB');
}, 5000);*/