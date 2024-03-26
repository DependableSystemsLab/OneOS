if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node CommonLogParser.js $filePath");
    process.exit();
}

var filePath = process.argv[2];

var fs = require('fs');

const NUM_FIELDS = 8;

function hashChar(cha, pow) {
    if (pow < 0) return 0;
    if (pow === 0) return cha;
    else {
        var prev = hashChar(cha, pow - 1);
        return (prev << 5) - prev;
    }
}

function hashCode(text) {
    let code = 0;
    for (let i = 0; i < text.length; i++) {
        code += hashChar(text.charCodeAt(i), text.length - (i + 1));
    }
    return code >>> 0;  // we need to do an unsigned shift
}

function parseDate(dateString) {
    const match = dateString.match(/(\d\d)\/(\w+)\/(\d\d\d\d):(\d\d):(\d\d):(\d\d) ([\+\-\d]+)/);
    const validString = `${match[2]} ${match[1]} ${match[3]} ${match[4]}:${match[5]}:${match[6]} GMT${match[7]}`;
    return new Date(validString);
}

function parseLine(line) {
    const entry = {};
    const logEntryPattern = "^(\\S+) (\\S+) (\\S+) \\[([\\w:/]+\\s[+\\-]\\d{4})\\] \"(.+?)\" (\\d{3}) (\\S+)(.*?)";
    const regex = new RegExp(logEntryPattern);

    const match = regex.exec(line);
    if (match === null || match.length - 1 !== NUM_FIELDS) {
        return null;
    }

    entry.ip = match[1];
    entry.timestamp = parseDate(match[4]);
    entry.request = match[5];
    entry.response = parseInt(match[6]);

    if (match[7] === '-') {
        entry.byte_size = 0;
    }
    else {
        entry.byte_size = parseInt(match[7]);
    }

    return entry;
}

function parse(line) {
    const entry = parseLine(line);

    if (entry === null) {
        console.error('Unable to parse log: ' + line);
        return;
    }

    const minute = new Date(entry.timestamp);
    minute.setSeconds(0);
    minute.setMilliseconds(0);
    const msgId = hashCode(entry.ip + ':' + entry.timestamp);

    entry.msgId = msgId;
    entry.timestamp_minutes = minute.getTime();

    process.stdout.json.write(entry);
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