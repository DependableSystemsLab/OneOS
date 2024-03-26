if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node SensorParser.js $filePath");
    process.exit();
}

var filePath = process.argv[2];

var fs = require('fs');

const DATE_FIELD = 0;
const TIME_FIELD = 1;
const EPOCH_FIELD = 2;
const MOTEID_FIELD = 3;
const TEMP_FIELD = 4;
const HUMID_FIELD = 5;
const LIGHT_FIELD = 6;
const VOLT_FIELD = 7;

const VALUE_FIELD = TEMP_FIELD;

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

function parse(line) {
    const fields = line.split(/\s+/);

    if (fields.length !== 8) return;

    let date = new Date(fields[0] + ' ' + fields[1]);

    process.stdout.json.write({
        msgId: hashCode(fields[MOTEID_FIELD] + ":" + date.toString()),
        deviceId: fields[MOTEID_FIELD],
        timestamp: date,
        value: parseFloat(fields[VALUE_FIELD])
    });
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