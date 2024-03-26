// filter an incoming stream of objects based on values
const RANGES = {
    'trip_time_in_secs': { min: 140, max: 3155 },
    'trip_distance': { min: 1.37, max: 29.86 },
    'fare_amount': { min: 6.00, max: 201.00 },
    'tip_amount': { min: 0.65, max: 38.55 },
    'tolls_amount': { min: 2.50, max: 18.00 }
}

function doTask(msg) {
    try {
        if (msg.obsType in RANGES) {
            let obsVal = parseFloat(msg.obsVal);
            if (obsVal < RANGES[msg.obsType].min || obsVal > RANGES[msg.obsType].max) {
                msg.obsVal = null;
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