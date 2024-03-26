if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node reader.js $filePath");
    process.exit();
}

var filePath = process.argv[2];

var fs = require('fs');

var stream = fs.createReadStream(filePath);
stream.pipe(process.stdout);
stream.on('end', () => process.exit());