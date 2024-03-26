if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node BeijingTaxiTraceParser.js $filePath");
    process.exit();
}

var filePath = process.argv[2];

var fs = require('fs');

const ID_FIELD = 0;
const TIMESTAMP_FIELD = 1;
const VALUE_FIELD = 2;
const PROPERTY_FIELD = 3;
const PLUG_ID_FIELD = 4;
const HOUSEHOLD_ID_FIELD = 5;
const HOUSE_ID_FIELD = 6;

function parse(line) {
    const fields = line.split(",");

    if (fields.length !== 7) return;

    const values = {
        id: fields[ID_FIELD],
        timestamp: parseInt(fields[TIMESTAMP_FIELD]),
        value: parseFloat(fields[VALUE_FIELD]),
        property: parseInt(fields[PROPERTY_FIELD]),
        plugId: fields[PLUG_ID_FIELD],
        householdId: fields[HOUSEHOLD_ID_FIELD],
        houseId: fields[HOUSE_ID_FIELD]
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