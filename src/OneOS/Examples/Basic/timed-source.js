if (process.argv.length < 5) {
    console.log('Provide input file, read interval, and chunk size to read.');
    console.log('  e.g., node timed-source.js test-input 500 16384');
    process.exit(1);
}

const inputPath = process.argv[2];
const readInterval = parseInt(process.argv[3]);
const chunkSize = parseInt(process.argv[4]);

const fs = require('fs');

const stream = fs.createReadStream(inputPath);

setInterval(() => {
    if (stream.readable) {
        const data = stream.read(chunkSize);
        if (data) {
            process.stdout.write(data);
        }
    }
    else {
        process.exit();
    }
}, readInterval);