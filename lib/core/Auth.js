const fs = require('fs');
const util = require('util');
const readline = require('readline');
const crypto = require('crypto');

const writeFile = util.promisify(fs.writeFile);
const generateKeyPair = util.promisify(crypto.generateKeyPair);

function keygen(outFileName){
	return generateKeyPair('rsa', {
		modulusLength: 4096,
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem'
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem',
			cipher: 'aes-256-cbc',
			passphrase: ''
		}
	}).then((keypair)=>(outFileName ? Promise.all([
		writeFile(outFileName+'.public', keypair.publicKey).then(()=>console.log('Created public key at '+outFileName+'.public')),
		writeFile(outFileName+'.private', keypair.privateKey).then(()=>console.log('Created private key at '+outFileName+'.private'))
	]).then(()=>keypair) : keypair));
}

function encrypt(cleartext, key, privateKey=false){
	if (!(cleartext instanceof Buffer)) cleartext = Buffer.from(String(cleartext));
	return (privateKey ? crypto.privateEncrypt(key, cleartext) : crypto.publicEncrypt(key, cleartext)).toString('base64');
}

function decrypt(ciphertext, key, privateKey=false){
	if (!(ciphertext instanceof Buffer)) ciphertext = Buffer.from(String(ciphertext), 'base64');
	return String(privateKey ? crypto.privateDecrypt(key, ciphertext) : crypto.publicDecrypt(key, ciphertext));
}

function sign(data, privateKey){
	let signed = crypto.createSign('SHA256');
	signed.update(data);
	return signed.sign(privateKey, 'base64');
}

function verify(data, signature, publicKey){
	let verified = crypto.createVerify('SHA256');
	verified.update(data);
	return verified.verify(publicKey, signature, 'base64');
}

function symEncrypt(cleartext, secret){
	let cipher = crypto.createCipher('aes192', secret, crypto.randomBytes(32));
	return cipher.update(cleartext).toString('base64') + cipher.final('base64');
}

function symDecrypt(ciphertext, secret){
	let decipher = crypto.createDecipher('aes192', secret);
	return decipher.update(ciphertext, 'base64', 'utf8') + decipher.final('utf8');
}

function hmac(data, secret){
	let hmacObj = crypto.createHmac('sha256', secret);
	hmacObj.update(data);
	return hmacObj.digest('base64');
}

module.exports = {
	keygen: keygen,
	encrypt: encrypt,
	decrypt: decrypt,
	sign: sign,
	verify: verify,
	symEncrypt: symEncrypt,
	symDecrypt: symDecrypt,
	hmac: hmac
}