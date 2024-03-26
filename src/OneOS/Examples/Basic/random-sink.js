let mbs = 0;
let count = 0;
process.stdin.on('data', chunk => {
    count += chunk.length;
    if (Math.floor(count / 1000000) > mbs) {
        mbs++;
        console.log('received ' + mbs + ' MB until now');
    }
});

process.stdin.on('end', () => process.exit());