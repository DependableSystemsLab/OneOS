if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node SplitSentence.js $filePath");
    process.exit();
}

var filePath = process.argv[2];

var fs = require('fs');

var stream = fs.createReadStream(filePath);
//stream.pipe(process.stdout);
const counts = new Map();
var buf = '';

function wordCount(word) {
    if (!counts.get(word)) {
        counts.set(word, 0);
    }

    counts.set(word, counts.get(word) + 1);

    process.stdout.json.write({
        word: word,
        count: counts.get(word)
    });
}

function splitSentence(chunk) {
    const text = chunk.toString('utf8');
    const words = text.match(/\w+/g);

    if (buf) {
        if (text[0].match(/\w+/g) !== null) {
            words[0] = buf + words[0];
        }
        else {
            //process.stdout.segment.write(Buffer.from(buf));
            wordCount(buf);
            buf = '';
        }
    }

    if (text[text.length - 1].match(/\w+/g) !== null) {
        buf = words.pop();
    }

    for (let word of words) {
        //process.stdout.segment.write(Buffer.from(word));
        wordCount(word);
    }
}

stream.on('data', splitSentence);
stream.on('end', () => {
    if (buf) {
        wordCount(buf);
    };

    setTimeout(() => {
        process.exit();
    }, 1000);
});