const VOLUME_COUNTER_WINDOW = 60;

class CircularFifoBuffer {
    constructor(size) {
        this.data = [];
        this.size = size;
    }

    isFull() {
        return this.data.length === this.size;
    }

    remove() {
        return this.data.shift();
    }

    add(val) {
        if (this.isFull()) this.remove();

        this.data.push(val);
    }
}

const buffer = new CircularFifoBuffer(VOLUME_COUNTER_WINDOW);
const counts = new Map();

process.stdin.json.on('data', msg => {
    const minute = msg.timestamp_minutes;
    if (!counts.get(minute)) {
        if (buffer.isFull()) {
            counts.delete(buffer.remove());
        }

        counts.set(minute, 0);
        buffer.add(minute);
    }

    counts.set(minute, counts.get(minute) + 1);

    process.stdout.json.write({
        timestamp_minutes: minute,
        count: counts.get(minute)
    });
});
process.stdin.json.on('end', () => process.exit());