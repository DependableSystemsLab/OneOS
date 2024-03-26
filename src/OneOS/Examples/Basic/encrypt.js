if (process.argv.length < 3) {
    console.log("Provide encryption key. E.g., node encrypt.js $secretKey");
    process.exit();
}

const crypto = require('crypto');

const algorithm = 'aes-192-cbc';
const password = process.argv[2];
// Use the async `crypto.scrypt()` instead.
const key = crypto.scryptSync(password, 'salt', 24);
// The IV is usually passed along with the ciphertext.
const iv = Buffer.alloc(16, 0); // Initialization vector.
// const iv = crypto.randomBytes(16);

const cipher = crypto.createCipheriv(algorithm, key, iv);

process.stdin.pipe(cipher).pipe(process.stdout);
process.stdin.on('end', () => process.exit());