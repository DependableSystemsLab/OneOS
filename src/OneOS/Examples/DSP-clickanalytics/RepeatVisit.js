const set = new Set();

process.stdin.json.on('data', msg => {
    const key = msg.url + ':' + msg.clientKey;

    if (set.has(key)) {
        process.stdout.json.write({
            clientKey: msg.clientKey,
            url: msg.url,
            unique: false
        });
    }
    else {
        set.add(key);
        process.stdout.json.write({
            clientKey: msg.clientKey,
            url: msg.url,
            unique: true
        });
    }
});
process.stdin.json.on('end', () => process.exit());