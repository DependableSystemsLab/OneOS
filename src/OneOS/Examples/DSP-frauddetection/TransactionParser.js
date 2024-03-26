if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node TransactionParser.js $filePath");
    process.exit();
}

var filePath = process.argv[2];

var fs = require('fs');

function parse(line) {
    process.stdout.segment.write(Buffer.from(line));
}

var stream = fs.createReadStream(filePath);
//stream.pipe(process.stdout);
var buf = '';
stream.on('data', chunk => {
    const text = chunk.toString('utf8');
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') {
            parse(buf);
            buf = '';
        }
        else {
            buf += text[i];
        }
    }
});
stream.on('end', () => {
    if (buf) {
        parse(buf);
        buf = '';
    };

    setTimeout(() => {
        process.exit();
    }, 1000);
});