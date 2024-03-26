if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node SenMLParse.js $filePath");
    process.exit();
}

var filePath = process.argv[2];

var fs = require('fs');

// parse an incoming stream of raw data into SenML
const ID_FIELD = 'taxi_identifier';
const META_FIELDS = [
    'pickup_datetime',
    'timestamp',
    'pickup_longitude',
    'pickup_latitude',
    'dropoff_longitude',
    'dropoff_latitude',
    'payment_type'
];
const OBSERVABLES = [
    'hack_license',
    'trip_time_in_secs',
    'trip_distance',
    'fare_amount',
    'surcharge',
    'mta_tax',
    'tip_amount',
    'tolls_amount',
    'total_amount'
];

const BATCH_SIZE = 20;
const WRITE_INTERVAL = 200;

const queue = [];
let readFinished = false;

const timer = setInterval(() => {

    if (queue.length >= BATCH_SIZE) {
        const batch = queue.splice(0, BATCH_SIZE);
        process.stdout.json.write({
            msgId: 1,
            dataset: batch
        });

        return;
    }

    if (readFinished) {
        if (queue.length > 0) {
            process.stdout.json.write({
                msgId: 1,
                dataset: queue
            });
        }
        else {
            clearInterval(timer);
            process.exit();
        }
    }

}, WRITE_INTERVAL);

function doTask(json) {
    try {
        let baseTime = json.payload['bt'] || 0;
        let baseUnit = json.payload['bu'];
        let baseName = json.payload['bn'];
        let jsonArr = json.payload['e'];

        let v, n, u, t;
        let mapKeyValues = {};
        mapKeyValues['timestamp'] = baseTime;

        for (let j = 0; j < jsonArr.length; j++) {
            let jsonObject = jsonArr[j];

            v = jsonObject['v'] || jsonObject['sv'];
            t = jsonObject['t'] || 0;
            t += baseTime;

            // if name does not exist, consider base name
            n = jsonObject['n'] || baseName;
            u = jsonObject['u'] || baseUnit;

            mapKeyValues[n] = v;
        }

        let metadata = META_FIELDS.map(field => mapKeyValues[field]).join(',');

        let data = OBSERVABLES.reduce((acc, field) => {
            acc[field] = mapKeyValues[field];
            return acc;
        }, {});

        queue.push({
            sensorId: mapKeyValues[ID_FIELD],
            meta: metadata,
            data: data
        });
    }
    catch (err) {
        console.error(err);
    }
}

function parse(line) {
    const payload = JSON.parse(line.split(',').slice(1).join(','));
    doTask({
        msgId: 1,
        payload: payload
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

    readFinished = true;
});