// randomly generate data forever
const crypto = require('crypto');

const buffer = crypto.randomBytes(16384 * 8); // default highWaterMark for stdout

setInterval(() => {
    process.stdout.write(buffer);
}, 0);