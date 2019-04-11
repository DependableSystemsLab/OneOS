const { Readable } = require('../../LocalDevice.js');
const { PassThrough } = require('stream');
const ffmpeg = require('fluent-ffmpeg');

class InputStream extends Readable {
	constructor (){
		super();

		let pipe = new PassThrough();

		let cmd = ffmpeg('/dev/video0')
			.inputOptions(['-f v4l2', '-framerate 15', '-video_size 320x240'])
			.outputOptions(['-b 300k', '-r 15', '-f image2pipe'])
			.output(pipe)
			.noAudio()
			.on('start', function(rawcmd){
				console.log(rawcmd);
			})
			.on('end', function(){
				console.log("Stream Ended");
			})
			.run();

		pipe.on('data', (chunk)=>this.push(chunk));
	}

	_read (size){
		// this.bytesRead += size;
	}
}

module.exports = InputStream;