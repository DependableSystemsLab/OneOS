/*oneos.meta
name: Observer
*/
var ffmpeg = require('fluent-ffmpeg');

var outStream = process.output('webcam');

var cmd = ffmpeg('/dev/video0')
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

setInterval(function(){
	var mem = Math.round(process.memoryUsage().rss / 10000) / 100;
	console.log(mem+' MB');
}, 5000);