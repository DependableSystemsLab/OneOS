const TRAIN_TARGETS = [
    'fare_amount',
    'total_amount'
];

class ValueList extends Array {
    push(...args) {
        super.push.apply(this, args);
        this.average = this.reduce((sum, item) => sum + item, 0) / this.length;
    }
}

const averageMap = new Map();
const pendingMap = new Map();

function calculateError(msg) {
    const errors = {};
    for (let field of TRAIN_TARGETS) {
        const key = msg.sensorId + field;

        const avgList = averageMap.get(key);
        const error = (parseFloat(msg.data[field]) - msg.predictions[field]) / avgList.average;
        errors[field] = error;
    }

    msg.errors = errors;

    process.stdout.json.write(msg);
}

function doTask(msg) {
    try {
        if ('averages' in msg) {
            for (let field of TRAIN_TARGETS) {
                const key = msg.sensorId + field;
                if (!averageMap.has(key)) {
                    averageMap.set(key, new ValueList());
                }
                const avg = averageMap.get(key);
                avg.push(msg.averages[field]);

                if (pendingMap.has(key)) {
                    pendingMap.get(key).forEach(msg => calculateError(msg));

                    pendingMap.set(key, []);
                }
            }
        }
        else if ('predictions' in msg) {
            const errors = {};
            for (let field of TRAIN_TARGETS) {
                const key = msg.sensorId + field;
                if (!averageMap.has(key)) {
                    if (!pendingMap.has(key)) {
                        pendingMap.set(key, []);
                    }
                    pendingMap.get(key).push(msg);
                    break;
                }

                const avgList = averageMap.get(key);
                const error = (parseFloat(msg.data[field]) - msg.predictions[field]) / avgList.average;
                errors[field] = error;
            }

            if (Object.keys(errors).length > 0) {
                msg.errors = errors;

                process.stdout.json.write(msg);
            }
        }
    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());