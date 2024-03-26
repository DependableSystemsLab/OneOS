if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node BeijingTaxiTraceParser.js $filePath");
    process.exit();
}

var filePath = process.argv[2];

var fs = require('fs');

const ID_FIELD = 0;
const NID_FIELD = 1;
const DATE_FIELD = 2;
const LAT_FIELD = 3;
const LON_FIELD = 4;
const SPEED_FIELD = 5;
const DIR_FIELD = 6;

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
    const fields = line.split(",");

    if (fields.length !== 7) return;

    const dateTime = new Date(fields[DATE_FIELD]);

    const values = {
        msgId: hashCode(fields[ID_FIELD] + ":" + dateTime.toString()),
        vehicleId: fields[ID_FIELD],
        dateTime: dateTime,
        occupied: true,
        speed: parseInt(fields[SPEED_FIELD]),
        bearing: parseInt(fields[DIR_FIELD]),
        latitude: parseFloat(fields[LAT_FIELD]),
        longitude: parseFloat(fields[LON_FIELD])
    }

    process.stdout.json.write(values);
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