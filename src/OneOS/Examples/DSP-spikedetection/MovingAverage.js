const MOVING_AVERAGE_WINDOW = 1000;

const deviceIdToStreamMap = new Map();
const deviceIdToSumOfEvents = new Map();

function movingAverage(deviceId, nextVal) {
    if (deviceIdToStreamMap.has(deviceId)) {
        const valueList = deviceIdToStreamMap.get(deviceId);
        let sum = deviceIdToSumOfEvents.get(deviceId);
        if (valueList.length > MOVING_AVERAGE_WINDOW - 1) {
            let valueToRemove = valueList.shift();
            sum -= valueToRemove;
        }
        valueList.push(nextVal);
        sum += nextVal;
        deviceIdToSumOfEvents.set(deviceId, sum);
        deviceIdToStreamMap.set(deviceId, valueList);
        return sum / valueList.length;
    }
    else {
        deviceIdToStreamMap.set(deviceId, [nextVal]);
        deviceIdToSumOfEvents.set(deviceId, nextVal);
        return nextVal;
    }
}

process.stdin.json.on('data', msg => {
    const movingAverageInstant = movingAverage(msg.deviceId, msg.value);
    process.stdout.json.write({
        deviceId: msg.deviceId,
        movingAvg: movingAverageInstant,
        value: msg.value
    });
});
process.stdin.json.on('end', () => process.exit());