const USE_MSG_FIELD = [
    'trip_time_in_secs',
    'trip_distance',
    'fare_amount',
    'surcharge',
    'mta_tax',
    'tip_amount',
    'tolls_amount',
    'total_amount'
];
const BLOCK_COUNT_WINDOW_SIZE = 10;

class BlockWindowAverage {
    constructor(windowSize) {
        this.windowSize = windowSize;
        this.sum = 0;
        this.count = 0;
    }

    push(val) {
        this.sum += parseFloat(val);
        this.count += 1;
        if (this.count === this.windowSize) {
            const result = this.sum / this.count;
            this.sum = 0;
            this.count = 0;
            return result;
        }
        else return null;
    }
}

const averageMap = new Map();

function doTask(msg) {
    try {
        const averages = {};
        for (let field of USE_MSG_FIELD) {
            const key = msg.sensorId + field;
            if (!averageMap.has(key)) {
                averageMap.set(key, new BlockWindowAverage(BLOCK_COUNT_WINDOW_SIZE));
            }
            const avg = averageMap.get(key);
            const result = avg.push(Number(msg.data[field]));

            if (result !== null) {
                averages[field] = result;
            }
        }

        if (Object.keys(averages).length > 0) {
            msg.averages = averages;

            process.stdout.json.write(msg);
        }
    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());