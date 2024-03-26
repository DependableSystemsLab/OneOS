let total = 0;
let uniqueCount = 0;

process.stdin.json.on('data', msg => {
    total++;
    if (msg.unique) uniqueCount++;

    process.stdout.json.write({
        total: total,
        unique: uniqueCount
    });
});
process.stdin.json.on('end', () => process.exit());