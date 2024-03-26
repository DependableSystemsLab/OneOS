if (process.argv.length < 3) {
	console.error('Need to provide the output file prefix as an argument.\n  e.g., recorder.js video');
	process.exit(1);
}

const prefix = process.argv[2];

const fs = require('fs');

/* configurable variables */
const videoDuration = 10000;
const fileRotation = 5;
/* end of configurable variables */

let currentFileIndex = 0;
let frames = [];

function saveFile() {
	let fileName = prefix + '-' + currentFileIndex + '.mp4';
	fs.writeFile(fileName, Buffer.concat(frames), err => {
		if (err) console.error(err);
	});

	currentFileIndex = (currentFileIndex + 1) % fileRotation;
	frames = [];
}

process.stdin.segment.on('data', function (frame) {
	frames.push(frame);
});

process.stdin.segment.on('end', () => process.exit());

setInterval(saveFile, videoDuration);