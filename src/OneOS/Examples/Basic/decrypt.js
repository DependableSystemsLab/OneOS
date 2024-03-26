if (process.argv.length < 3) {
    console.log("Provide decryption key. E.g., node decrypt.js $secretKey");
    process.exit();
}

const crypto = require('crypto');

const algorithm = 'aes-192-cbc';
const password = process.argv[2];
// Use the async `crypto.scrypt()` instead.
const key = crypto.scryptSync(password, 'salt', 24);
// The IV is usually passed along with the ciphertext.
const iv = Buffer.alloc(16, 0); // Initialization vector.
//const iv = crypto.randomBytes(16);

const decipher = crypto.createDecipheriv(algorithm, key, iv);

process.stdin.pipe(decipher).pipe(process.stdout);
process.stdin.on('end', () => process.exit());