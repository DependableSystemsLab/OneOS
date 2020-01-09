var jimp = require('jimp');

/* configurable variables */
var threshold = 0.10;
var buf_size = 10;
var fps = 5;
/* end of configurable variables */

var inStream = process.input('mpeg');
var outStream = process.output('diff');
var alarmStream = process.output('alarm', 'json');

var frames = [];
var frame_count = 0;

var exceeded = 0;

function detectMotion(){
	if (frames.length >= buf_size){
		var frame1 = jimp.read(frames[0]); // jimp.read returns a promise
		var frame2 = jimp.read(frames[1]);
		
		function sendDiff(vals){
			var diff = jimp.diff(vals[0], vals[1]);
			
				diff.image.getBuffer(jimp.MIME_PNG, function(err, buf){
					if (!err) outStream.write(buf);
				});
				
				if (diff.percent > threshold){
					exceeded ++;
					
					if (exceeded == 3){
						console.log(frame_count+' '+(new Date().toISOString())+" Motion Detected !!!");
						alarmStream.write({
							timestamp: Date.now(),
							message: "Motion Detected!",
							severity: "emergency"
						});
					}

				}
				else {
					exceeded = 0;
				}
		}
		
		Promise.all([frame1, frame2]).then(sendDiff); // run sendDiff when all frames are ready
	}
}

inStream.on('data', function(frame){
	if (frames.length >= buf_size) frames.shift();
	frames.push(frame);
	frame_count ++;
});

setInterval(detectMotion, 1000/fps);