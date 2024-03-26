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
        if (USE_MSG_FIELD.includes(msg.obsType)) {

            const key = msg.sensorId + msg.obsType;
            if (!averageMap.has(key)) {
                averageMap.set(key, new BlockWindowAverage(BLOCK_COUNT_WINDOW_SIZE));
            }
            const avg = averageMap.get(key);
            const result = avg.push(msg.obsVal);

            if (result !== null) {
                msg.meta = msg.meta + ',' + msg.obsType;
                process.stdout.json.write({
                    meta: msg.meta,
                    sensorId: msg.sensorId,
                    obsType: msg.obsType,
                    average: result,
                    msgId: msg.msgId
                });
            }

        }
    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());