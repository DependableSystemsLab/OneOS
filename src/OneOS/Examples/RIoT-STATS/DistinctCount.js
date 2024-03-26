const crypto = require('crypto');

const BUCKET_SIZE = 10;
const USE_MSG_FIELD_LIST = [
    'trip_time_in_secs',
    'trip_distance',
    'fare_amount',
    'surcharge',
    'mta_tax',
    'tip_amount',
    'tolls_amount',
    'total_amount'
];

const MAGIC_NUM = 0.79402;

function hashCode(text) {
    const sha = crypto.createHash('sha1');
    const hex = sha.update(text).digest();
    return hex.readInt32LE();
}

function countTrailZeroes(val) {
    if (val === 0) {
        return 31;
    } else {
        let p = 0;
        while (((val >> p) & 1) === 0) {
            p++;
        }
        return p;
    }
}

class DistinctApproxCounter {
    constructor() {
        this.numBuckets = 1 << BUCKET_SIZE;
        this.maxZeroes = Array.from({ length: this.numBuckets }).fill(0);
    }

    push(val) {
        const hashValue = hashCode(val);
        const bucketId = hashValue & (this.numBuckets - 1);

        let currMax = this.maxZeroes[bucketId];
        this.maxZeroes[bucketId] = Math.max(currMax, countTrailZeroes(hashValue >> BUCKET_SIZE));

        let sumMaxZeroes = 0;
        for (let i = 0; i < this.numBuckets; i++) {
            sumMaxZeroes += this.maxZeroes[i];
        }
        let E = MAGIC_NUM * this.numBuckets * Math.pow(2, sumMaxZeroes / this.numBuckets);
        return Math.floor(E);
    }
}

const countMap = new Map();

function doTask(msg) {
    try {
		if (USE_MSG_FIELD_LIST.includes(msg.obsType)) {
            const key = msg.sensorId + msg.obsType;
            if (!countMap.has(key)) {
                countMap.set(key, new DistinctApproxCounter());
            }
            const counter = countMap.get(key);
            const result = counter.push(msg.obsVal);

            if (result !== null) {
                msg.meta = msg.meta + ',' + msg.obsType;
                process.stdout.json.write({
                    meta: msg.meta,
                    sensorId: msg.sensorId,
                    obsType: msg.obsType,
                    count: result,
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