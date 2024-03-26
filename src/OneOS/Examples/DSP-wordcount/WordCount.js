const counts = new Map();

process.stdin.segment.on('data', chunk => {
    const word = chunk.toString('utf8');

    if (!counts.get(word)) {
        counts.set(word, 0);
    }

    counts.set(word, counts.get(word) + 1);

    process.stdout.json.write({
        word: word,
        count: counts.get(word)
    });
});
process.stdin.segment.on('end', () => process.exit());