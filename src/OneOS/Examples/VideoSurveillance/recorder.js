if (process.argv.length < 3) {
	console.error('Need to provide the output file prefix as an argument.\n  e.g., recorder.js video');
	process.exit(1);
}

const prefix = process.argv[2];

const fs = require('fs');

/* configurable variables */
const videoDuration = 450;	// number of frames
const fileRotation = 5;
/* end of configurable variables */

let currentFileIndex = 0;
let frames = [];

// The saved output (mjpeg) file can then be converted to a playable mp4 file, e.g.:
// ffmpeg -f mjpeg -framerate 15 -i recorded-0.mjpeg -c:v libx264 -pix_fmt yuv420p recorded-0.mp4
function saveFile() {
	let fileName = prefix + '-' + currentFileIndex + '.mjpeg';
	fs.writeFile(fileName, Buffer.concat(frames), err => {
		if (err) console.error(err);
	});

	currentFileIndex = (currentFileIndex + 1) % fileRotation;
	frames = [];
}

process.stdin.segment.on('data', function (frame) {
	console.log(frame.slice(0, 8).toString('hex') + '...' + frame.slice(-8).toString('hex'));
	frames.push(frame);

	if (frames.length === videoDuration) {
		saveFile();
	}
});

process.stdin.segment.on('end', () => process.exit());

//setInterval(saveFile, videoDuration);