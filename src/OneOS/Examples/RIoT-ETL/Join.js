// join piecewise messages into SenML
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

const buffer = {};

function doTask(msg) {
    try {
        if (!buffer[msg.sensorId]) buffer[msg.sensorId] = { meta: msg.meta };

        let item = buffer[msg.sensorId];

        item[msg.obsType] = msg.obsVal;

        let isComplete = OBSERVABLES.reduce((agg, key) => agg && key in item, true);

        if (isComplete) {
            process.stdout.json.write({
                msgId: msg.msgId,
                meta: item.meta,
                obsType: 'joinedValue',
                obsVal: msg.sensorId + ',' + OBSERVABLES.map((key) => item[key]).join(',')
            });
        }
    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());