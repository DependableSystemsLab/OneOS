const DEFAULT_EMIT_FREQUENCY_IN_SECONDS = 15;
const SLICE_LENGTH = 60;
const MEASUREMENT_WORK = 0;

class AverageTracker {
    constructor() {
        this.count = 0;
        this.total = 0;
    }

    track(value) {
        this.total += value;
        this.count += 1;
    }

    retrieve() {
        return this.total / this.count;
    }

    reset() {
        this.count = 0;
        this.total = 0;
    }
}

class SummaryArchive {
    constructor(sliceLength) {
        this.sliceLength = sliceLength;
        this.data = [];
    }

    archive(value) {
        this.data.push(value);
    }

    getMedian() {
        let currentIndex = this.data.length - 1;
        let k = 1;
        let numberOfSlices = Math.floor(24 * 60 * 60 / sliceLength);
        let prev = (currentIndex + 2) - numberOfSlices * k;
        const values = [];
        while (prev > 0) {
            values.push(this.data[prev]);
            k++;
            prev = (currentIndex + 2) - numberOfSlices * k;
        }
        return (values.length > 0) ? this.getMedianInList(values) : 0.0;
    }

    getMedianInList(values) {
        values.sort((x, y) => x - y);
        const length = values.length;
        if (length % 2 == 0) {
            return (values[length / 2] + values[length / 2 + 1]) / 2;
        }
        else {
            return values[length / 2 + 1];
        }
    }
}

const emitFrequencyInSeconds = DEFAULT_EMIT_FREQUENCY_IN_SECONDS;
const trackers = new Map();
const archiveMap = new Map();
const sliceLength = SLICE_LENGTH;

let currentSliceStart = 0;
let tickCounter = 0;
let lastTick = Date.now();

function emitOutputStream() {
    for (let key of trackers.keys()) {
        let currentAvg = trackers.get(key).retrieve();
        let median = 0;

        if (archiveMap.has(key)) {
            median = archiveMap.get(key).getMedian();
        }

        let prediction = predict(currentAvg, median);
        let predictedTimestamp = currentSliceStart + 2 * sliceLength;
        process.stdout.json.write(getOutput(predictedTimestamp, key, prediction));
    }
}

function getKey(msg) {
    return msg.houseId + ':' + msg.householdId + ':' + msg.plugId;
}

function getOutput(predictedTimestamp, trackerId, prediction) {
    const segments = trackerId.split(':');
    return {
        timestamp: predictedTimestamp,
        houseId: segments[0],
        householdId: segments[1],
        plugId: segments[2],
        predictedLoad: prediction
    }
}

function getTracker(trackerId) {
    if (!trackers.has(trackerId)) {
        trackers.set(trackerId, new AverageTracker());
    }
    return trackers.get(trackerId);
}

function getSummaryArchive(trackerId) {
    if (!archiveMap.has(trackerId)) {
        archiveMap.set(trackerId, new SummaryArchive(sliceLength));
    }
    return archiveMap.get(trackerId);
}

function startSlice() {
    for (let key of trackers.keys()) {
        const tracker = getTracker(key);
        getSummaryArchive(key).archive(tracker.retrieve());
        tracker.reset();
    }
}

function predict(currentAvg, median) {
    return currentAvg + median;
}

process.stdin.json.on('data', msg => {
    if (lastTick + emitFrequencyInSeconds * 1000 <= Date.now()) {
        tickCounter = (tickCounter + 1) % 2;

        // time to emit
        if (tickCounter === 0) {
            emitOutputStream();
        }

        lastTick = Date.now();
        return;
    }

    if (msg.property === MEASUREMENT_WORK) return;

    const averageTracker = getTracker(getKey(msg));

    // Initialize the very first slice
    if (currentSliceStart === 0) {
        currentSliceStart = msg.timestamp;
    }
    // Check the slice
    // This update is within current slice.
    if ((currentSliceStart + sliceLength) >= msg.timestamp) {
        averageTracker.track(msg.value);
    }
    else {    // start a new slice
        startSlice();
        currentSliceStart = currentSliceStart + sliceLength;
        // there may be slices without any records.
        while ((currentSliceStart + sliceLength) < msg.timestamp) {
            startSlice();
            currentSliceStart = currentSliceStart + sliceLength;
        }
        averageTracker.track(msg.value);
    }
});
process.stdin.json.on('end', () => process.exit());