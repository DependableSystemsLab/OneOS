if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node SplitSentence.js $filePath");
    process.exit();
}

var filePath = process.argv[2];

var fs = require('fs');

var stream = fs.createReadStream(filePath);
//stream.pipe(process.stdout);
var buf = '';
stream.on('data', chunk => {
    const text = chunk.toString('utf8');
    const words = text.match(/\w+/g);

    if (buf) {
        if (text[0].match(/\w+/g) !== null) {
            words[0] = buf + words[0];
        }
        else {
            process.stdout.segment.write(Buffer.from(buf));
            buf = '';
        }
    }

    if (text[text.length - 1].match(/\w+/g) !== null) {
        buf = words.pop();
    }

    for (let word of words) {
        process.stdout.segment.write(Buffer.from(word));
    }
});
stream.on('end', () => {
    if (buf) {
        process.stdout.segment.write(Buffer.from(buf));
    };

    setTimeout(() => {
        process.exit();
    }, 1000); 
});