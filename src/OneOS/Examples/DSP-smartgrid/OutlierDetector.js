class PriorityQueue {
    constructor(comparator) {
        this.queue = [];
        this.comparator = comparator || ((x, y) => Math.sign(x - y));
    }

    add(val) {
        this.queue.push(val);
        this.bubbleUp();
    }

    bubbleUp() {
        let index = this.queue.length - 1;
        while (index > 0) {
            let element = this.queue[index];
            let parentIdx = Math.floor((index - 1) / 2);
            let parent = this.queue[parentIdx];
            if (this.comparator(parent, element) <= 0) break;
            this.queue[index] = parent;
            this.queue[parentIdx] = element;
            index = parentIdx;
        }
    }

    poll() {
        const min = this.queue[0];
        const end = this.queue.pop();
        if (this.queue.length > 0) {
            this.queue[0] = end;
            this.sinkDown();
        }
        return min;
    }

    peek() {
        return this.queue[0];
    }

    sinkDown() {
        let index = 0;
        const length = this.queue.length;
        const element = this.queue[0];
        while (true) {
            let leftChildIdx = 2 * index + 1;
            let rightChildIdx = 2 * index + 2;
            let leftChild, rightChild;
            let swap = null;

            if (leftChildIdx < length) {
                leftChild = this.queue[leftChildIdx];
                if (this.comparator(leftChild, element) < 0) {
                    swap = leftChildIdx;
                }
            }
            if (rightChildIdx < length) {
                rightChild = this.queue[rightChildIdx];
                if (
                    (swap === null && (this.comparator(rightChild, element) < 0)) ||
                    (swap !== null && (this.comparator(rightChild, leftChild) < 0))
                ) {
                    swap = rightChildIdx;
                }
            }
            if (swap === null) break;
            this.queue[index] = this.queue[swap];
            this.queue[swap] = element;
            index = swap;
        }
    }

    remove(element) {
        const length = this.queue.length;
        for (let i = 0; i < length; i++) {
            if (this.queue[i] !== element) continue;
            const end = this.queue.pop();
            if (i === length - 1) break;
            this.queue[i] = end;
            this.bubbleUp();
            this.sinkDown();
            return;
        }
    }

    contains(element) {
        return this.queue.includes(element);
    }

    size() {
        return this.queue.length;
    }

    isEmpty() {
        return this.queue.length === 0;
    }
}

class OutlierTracker {
    constructor() {
        this.completeSet = new Set();
        this.outlierSet = new Set();
    }

    addMember(key) {
        this.completeSet.add(key);
    }

    addOutlier(key) {
        this.outlierSet.add(key);
    }

    removeOutlier(key) {
        this.outlierSet.delete(key);
    }

    isOutlier(key) {
        return this.outlierSet.has(key);
    }

    isMember(key) {
        return this.completeSet.has(key);
    }

    getCurrentPercentage() {
        return (this.outlierSet.size * 1.0) / (this.completeSet.size);
    }
}

class FixedMap {
    constructor(maxCapacity) {
        this.maxCapacity = maxCapacity;
        this.map = new Map();
    }

    has(key) {
        return this.map.has(key);
    }

    get(key) {
        return this.map.get(key);
    }

    set(key, val) {
        this.map.set(key, val);
        this.removeEldest();
    }

    removeEldest() {
        if (this.map.size > this.maxCapacity) {
            const first = this.map.keys().next();
            this.map.delete(first.value);
        }
    }
}

const globalMedianBacklog = new FixedMap(300);
const outliers = new Map();
const unprocessedMessages = new PriorityQueue((x, y) => (x.timestamp - y.timestamp));

function processPerPlugMedianTuple(msg) {
    const houseId = msg.key.split(':')[0];

    if (globalMedianBacklog.has(msg.timestamp)) {
        if (!outliers.has(msg.houseId)) {
            outliers.set(msg.houseId, new OutlierTracker());
        }
        const tracker = outliers.get(msg.houseId);

        if (!tracker.isMember(msg.key)) {
            tracker.addMember(msg.key);
        }

        const globalMedian = globalMedianBacklog.get(msg.timestamp);
        if (globalMedian < msg.plugMedianLoad) { // outlier
            if (!tracker.isOutlier(msg.key)) {
                tracker.addOutlier(msg.key);

                process.stdout.json.write({
                    slidingWindowStart: msg.timestamp - 24 * 60 * 60,
                    slidingWindowEnd: msg.timestamp,
                    houseId: houseId,
                    outlierPercentage: tracker.getCurrentPercentage()
                });
            }
        } else {
            if (tracker.isOutlier(msg.key)) {
                tracker.removeOutlier(msg.key);
                //emit

                process.stdout.json.write({
                    slidingWindowStart: msg.timestamp - 24 * 60 * 60,
                    slidingWindowEnd: msg.timestamp,
                    houseId: houseId,
                    outlierPercentage: tracker.getCurrentPercentage()
                });
            }
        }
    }
    else {
        unprocessedMessages.add(msg);
    }
}

process.stdin.json.on('data', msg => {
    // unlike Storm, we cannot access information about the upstream component in OneOS (which is topology-agnostic)
    // so we simply need to determine the source based on the message format

    const component = 'globalMedianLoad' in msg ? 'GlobalMedian' : 'PlugMedian';

    if (component === 'GlobalMedian') {

        globalMedianBacklog.set(msg.timestamp, msg.globalMedianLoad);

        // ordered based on the timestamps
        while (!unprocessedMessages.isEmpty() &&
            unprocessedMessages.peek().timestamp === msg.timestamp) {
            const perPlugMedianTuple = unprocessedMessages.poll();
            processPerPlugMedianTuple(perPlugMedianTuple);
        }
    }
    else {
        processPerPlugMedianTuple(msg);
    }
});
process.stdin.json.on('end', () => process.exit());