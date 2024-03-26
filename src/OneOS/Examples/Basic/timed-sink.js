const crypto = require('crypto');

const chunks = [];

process.stdin.on('data', chunk => {
    chunks.push(chunk);
    if (chunks.length % 100 === 0) {
        console.log('received ' + chunks.length + ' chunks');
    }
});

process.stdin.on('end', () => {
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.concat(chunks));
    const checksum = hash.digest('hex');
    console.log(checksum);
    setTimeout(() => {
        process.exit();
    }, 1000);
});