if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node writer.js $filePath");
    process.exit();
}

var filePath = process.argv[2];

var fs = require('fs');

var stream = fs.createWriteStream(filePath);
process.stdin.pipe(stream);
process.stdin.on('end', () => process.exit());