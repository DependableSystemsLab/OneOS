// annotate an incoming stream of objects
const fs = require('fs');

const CSV_SCHEMA_WITH_ANNOTATEDFIELDS_FILEPATH = "taxi-schema_with_annotation.csv";

const schemaData = fs.readFileSync(CSV_SCHEMA_WITH_ANNOTATEDFIELDS_FILEPATH, 'utf8').split('\n').map(line => line.trim().split(','));
let timestampField = -1;
const schemaMap = new Map();
schemaData[0].forEach((col, index) => {
    if (col === 'timestamp') {
        timestampField = index;
    }

    schemaMap.set(index, {
        name: col,
        unit: schemaData[1][index],
        type: schemaData[2][index]
    });
});

function doTask(msg) {
    try {
        const result = {};
        const vals = msg.obsVal.split(',');
        result['bt'] = vals[timestampField];
        result['e'] = [];
        for (let key of schemaMap.keys()) {
            if (key !== timestampField) {
                const meta = schemaMap.get(key);
                const elem = {
                    n: meta.name,
                    u: meta.unit
                };
                elem[meta.type] = vals[key];

                result['e'].push(elem);
            }
        }

        process.stdout.json.write({
            msgId: msg.msgId,
            meta: msg.meta,
            obsType: 'senml',
            obsVal: result
        });
    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());