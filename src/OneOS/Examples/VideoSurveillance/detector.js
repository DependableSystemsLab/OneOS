const jimp = require('jimp');

/* configurable variables */
const threshold = 0.10;
const buf_size = 10;
const fps = 5;
/* end of configurable variables */

const frames = [];
let frame_count = 0;

let exceeded = 0;

function detectMotion() {
	let frame1, frame2;

	if (frames.length >= buf_size) {
		frame1 = jimp.read(frames[0]); // jimp.read returns a promise
		frame2 = jimp.read(frames[1]);

		function sendDiff(vals) {
			let diff = jimp.diff(vals[0], vals[1]);

			diff.image.getBuffer(jimp.MIME_PNG, function (err, buf) {
				//if (!err) outStream.write(buf);
				if (err) console.error(err);
			});

			if (diff.percent > threshold) {
				exceeded++;

				if (exceeded == 3) {
					//console.log(frame_count + ' ' + (new Date().toISOString()) + " Motion Detected !!!");
					process.stdout.json.write({
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

process.stdin.segment.on('data', function (frame) {
	if (frames.length >= buf_size) frames.shift();
	frames.push(frame);
	frame_count++;
});

process.stdin.segment.on('end', () => process.exit());

setInterval(detectMotion, 1000 / fps);