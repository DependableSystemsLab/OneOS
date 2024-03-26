if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node ClickStreamParser.js $filePath");
    process.exit();
}

var filePath = process.argv[2];

var fs = require('fs');

function parse(line) {
    try {
        process.stdout.json.write(JSON.parse(line));
    }
    catch (ex) {
        console.error('Error parsing JSON encoded clickstream: ' + line, ex);
    }
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