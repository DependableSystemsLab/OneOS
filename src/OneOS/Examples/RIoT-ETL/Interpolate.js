// interpolate values from observed values

const OBSERVATION_WINDOW = 10;
const INTERPOLATE_FIELDS = [
    'trip_time_in_secs',
    'trip_distance'
];
const valueMap = {};

function doTask(msg) {
    try {
        if (INTERPOLATE_FIELDS.includes(msg.obsType)) {
            if (!valueMap[msg.sensorId]) valueMap[msg.sensorId] = {};
            if (!valueMap[msg.sensorId][msg.obsType]) valueMap[msg.sensorId][msg.obsType] = [];

            let values = [];

            // interpolate if value is null
            if (msg.obsVal === null) {
                let avg = values.reduce((agg, val, index, list) => agg + val / list.length, 0);
                msg.obsVal = avg;
            }
            else {
                values.push(msg.obsVal);
                if (values.length > OBSERVATION_WINDOW) {
                    values.shift();
                }
            }
        }

        process.stdout.json.write(msg);

    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());