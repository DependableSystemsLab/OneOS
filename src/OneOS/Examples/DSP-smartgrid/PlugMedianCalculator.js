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
}

class RunningMedianCalculator {
    constructor() {
        this.lowerQueue = new PriorityQueue((x, y) => Math.sign(y - x));
        this.upperQueue = new PriorityQueue();
        this.upperQueue.add(Infinity);
        this.lowerQueue.add(-Infinity);
    }

    getMedian(num) {
        //adding the number to proper heap
        if (num >= this.upperQueue.peek()) this.upperQueue.add(num);
        else this.lowerQueue.add(num);
        this.balance();

        //returning the median
        if (this.upperQueue.size() == this.lowerQueue.size())
            return (this.upperQueue.peek() + this.lowerQueue.peek()) / 2;
        else if (this.upperQueue.size() > this.lowerQueue.size())
            return this.upperQueue.peek();
        else
            return this.lowerQueue.peek();
    }

    balance() {
        //balancing the heaps
        if (this.upperQueue.size() - this.lowerQueue.size() == 2)
            this.lowerQueue.add(this.upperQueue.poll());
        else if (this.lowerQueue.size() - this.upperQueue.size() == 2)
            this.upperQueue.add(this.lowerQueue.poll());
    }

    remove(value) {
        if (this.upperQueue.contains(value)) {
            this.upperQueue.remove(value);
        } else {
            this.lowerQueue.remove(value);
        }
        this.balance();
    }
}

const runningMedians = new Map();
const lastUpdatedTsMap = new Map();

function getKey(msg) {
    return msg.houseId + ':' + msg.householdId + ':' + msg.plugId;
}

process.stdin.json.on('data', msg => {
    const key = getKey(msg);

    if (!runningMedians.has(key)) {
        runningMedians.set(key, new RunningMedianCalculator());
        lastUpdatedTsMap.set(key, 0);
    }
    const medianCalc = runningMedians.get(key);
    const lastUpdatedTs = lastUpdatedTsMap.get(key);

    if (msg.slidingWindowAction === 'Add') {
        const median = medianCalc.getMedian(msg.value);
        if (lastUpdatedTs < msg.timestamp) {
            lastUpdatedTsMap.set(key, msg.timestamp);
            process.stdout.json.write({
                key: key,
                timestamp: msg.timestamp,
                plugMedianLoad: median
            });
        }
    }
    else {
        medianCalc.remove(msg.value);
    }
});
process.stdin.json.on('end', () => process.exit());