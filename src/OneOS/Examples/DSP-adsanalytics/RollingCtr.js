const WINDOW_LENGTH = 10000;
const EMIT_FREQUENCY = 2000;

const windowSlots = WINDOW_LENGTH / EMIT_FREQUENCY;

class NthLastModifiedTimeTracker {
    constructor(numTimesToTrack) {
        if (numTimesToTrack < 1) {
            throw new Error("numTimesToTrack must be greater than zero (you requested " + numTimesToTrack + ")");
        }

        this.numTimesToTrack = numTimesToTrack;
        this.lastModifiedTimesMillis = [];
        this.initLastModifiedTimesMillis();
    }

    initLastModifiedTimesMillis() {
        const now = Date.now();
        for (let i = 0; i < this.numTimesToTrack; i++) {
            this.lastModifiedTimesMillis.push(now);
        }
    }

    secondsSinceOldestModification() {
        let recent = this.lastModifiedTimesMillis[this.numTimesToTrack - 1];
        let now = Date.now();
        return Math.floor((now - recent) / 1000);
    }

    markAsModified() {
        this.lastModifiedTimesMillis.push(Date.now());
        this.lastModifiedTimesMillis.shift();
    }
}

class SlotBasedCounter {
    constructor(numSlots) {
        if (numSlots <= 0) {
            throw new Error("Number of slots must be greater than zero (you requested " + numSlots + ")");
        }
        this.map = new Map();
        this.numSlots = numSlots;
    }

    increment(key, slot) {
        if (!this.map.has(key)) {
            const slots = Array.from({ length: this.numSlots }).fill(0);
            this.map.set(key, slots);
        }

        this.map.get(key)[slot] += 1;
    }

    getCounts() {
        const counts = new Map();
        for (let key of this.map.keys()) {
            counts.set(key, this.map.get(key).reduce((sum, num) => sum + num, 0));
        }
        return counts;
    }

    wipeZeros() {
        for (let key of this.map.keys()) {
            let sum = this.map.get(key).reduce((sum, num) => sum + num, 0);
            if (sum === 0) this.map.delete(key);
        }
    }

    wipeSlot(slot) {
        for (let key of this.map.keys()) {
            this.map.get(key)[slot] = 0;
        }
    }
}

class SlidingWindowCounter {
    constructor(windowLengthInSlots) {
        if (windowLengthInSlots < 2) {
            throw new Error("Window length in slots must be at least two (you requested " + windowLengthInSlots + ")");
        }

        this.numSlots = windowLengthInSlots;
        this.counter = new SlotBasedCounter(windowLengthInSlots);

        this.headSlot = 0;
        this.tailSlot = this.slotAfter(this.headSlot);
    }

    slotAfter(slot) {
        return (slot + 1) % this.numSlots;
    }

    advanceHead() {
        this.headSlot = this.tailSlot;
        this.tailSlot = this.slotAfter(this.headSlot);
    }

    increment(key) {
        this.counter.increment(key, this.headSlot);
    }

    getCountsThenAdvanceWindow() {
        const counts = this.counter.getCounts();
        this.counter.wipeZeros();
        this.counter.wipeSlot(this.tailSlot);
        this.advanceHead();
        return counts;
    }
}

const clickCounter = new SlidingWindowCounter(windowSlots);
const impressionCounter = new SlidingWindowCounter(windowSlots);
const lastModifiedTracker = new NthLastModifiedTimeTracker(windowSlots);

let lastEmit = Date.now();

function emitCurrentWindowCounts() {
    const clickCounts = clickCounter.getCountsThenAdvanceWindow();
    const impressionCounts = impressionCounter.getCountsThenAdvanceWindow();

    const actualWindowLengthInSeconds = lastModifiedTracker.secondsSinceOldestModification();
    lastModifiedTracker.markAsModified();

    emit(clickCounts, impressionCounts, actualWindowLengthInSeconds);
}

function emit(clickCounts, impressionCounts, actualWindowLengthInSeconds) {
    for (let key of clickCounts.keys()) {
        const ids = key.split(':');
        const clicks = clickCounts.get(key);
        const impressions = impressionCounts.get(key);
        const ctr = clicks / impressions;

        process.stdout.json.write({
            queryId: ids[0],
            adId: ids[1],
            ctr: ctr,
            clicks: clicks,
            impressions: impressions,
            windowLength: actualWindowLengthInSeconds
        });
    }
}

function countObj(msg) {
    const key = msg.queryId + ':' + msg.adId;
    if (msg.eventType === 'click') {
        clickCounter.increment(key);
    }
    else if (msg.eventType === 'impression') {
        impressionCounter.increment(key);
    }
}

let count = 0;
process.stdin.json.on('data', msg => {
    count++;
    if (lastEmit + EMIT_FREQUENCY <= Date.now()) {
        emitCurrentWindowCounts();
        lastEmit = Date.now();
    }
    else {
        countObj(msg);
    }
});
process.stdin.json.on('end', () => process.exit());