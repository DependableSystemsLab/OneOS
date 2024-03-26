const WINDOW_SIZE = 10;

let totalReceived = 0;
let lastCounts = [];

process.stdin.json.on('data', msg => {
    if (lastCounts.length === WINDOW_SIZE) {
        lastCounts.shift();
    }

    lastCounts.push(msg);
    totalReceived++;

    if (totalReceived % 10 === 0) {
        console.log("Received " + totalReceived + " messages -- last 10: [ " + lastCounts.map(item => item.count).join(', ') + " ]");
    }
});
process.stdin.json.on('end', () => process.exit());