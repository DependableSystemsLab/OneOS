const counts = new Map();

process.stdin.json.on('data', msg => {
    const statusCode = msg.response;

    if (!counts.has(statusCode)) {
        counts.set(statusCode, 0);
    }

    counts.set(statusCode, counts.get(statusCode) + 1);

    process.stdout.json.write({
        response: statusCode,
        count: counts.get(statusCode)
    });
});
process.stdin.json.on('end', () => process.exit());