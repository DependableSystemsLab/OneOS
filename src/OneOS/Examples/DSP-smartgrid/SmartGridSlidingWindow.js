const MEASUREMENT_WORK = 0;

class SlidingWindowEntry {
    constructor(ts, value, houseId, householdId, plugId) {
        this.timestamp = ts;
        this.value = value;
        this.houseId = houseId;
        this.householdId = householdId;
        this.plugId = plugId;
    }
}

class SlidingWindow {
    constructor(length) {
        this.window = [];
        this.tsStart = 0;
        this.tsEnd = 0;
        this.length = length;
    }

    add(entry, callback) {
        
        // very first entry in the window
        if (this.tsStart === 0) {
            this.tsStart = entry.timestamp;
        }
        // add the entry
        this.window.push(entry);
        // sliding window should be moved.
        if (entry.timestamp > this.tsEnd) {
            // update the timestamp end timestamp
            this.tsEnd = entry.timestamp;
            // now we need to remove the entries which are expired
            const newTsStart = this.tsEnd - this.length + 1;
            const removed = [];
            while (this.tsStart < newTsStart) {
                if (this.window[0].timestamp < newTsStart) {
                    removed.push(this.window.shift());
                    this.tsStart = this.window[0].timestamp;
                }
            }
            callback.remove(removed);
        }
    }
}

const window = new SlidingWindow(1 * 60 * 60);

process.stdin.json.on('data', msg => {

    if (msg.property === MEASUREMENT_WORK) return;

    const entry = new SlidingWindowEntry(msg.timestamp, msg.value, msg.houseId, msg.householdId, msg.plugId);

    window.add(entry, {
        remove: entries => {
            entries.forEach(item => {
                process.stdout.json.write(Object.assign({
                    slidingWindowAction: 'Remove'
                }, item));
            });
        }
    });

    process.stdout.json.write(Object.assign({
        slidingWindowAction: 'Add'
    }, entry));
    
});
process.stdin.json.on('end', () => process.exit());