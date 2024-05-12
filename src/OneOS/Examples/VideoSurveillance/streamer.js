if (process.argv.length < 3) {
    console.error("Provide video device URI. E.g., node streamer.js /dev/t1.example.org/vid0");
    process.exit();
}

const deviceUri = process.argv[2];

const io = require('oneos/io');

const video = io.createVideoInputStream(deviceUri);
video.pipe(process.stdout.segment);