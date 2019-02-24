/*oneos.meta
name: Hash
*/
if (!process.argv[2]){
  console.log('Need to provide file');
  process.exit(1);
}
let inFile = process.argv[2];
let algo = process.argv[3] || 'sha256';

const crypto = require('crypto');
const fs = require('oneos').fs();

fs.readFile(inFile, (err, data)=>{
	if (err) throw err;
	let hash = crypto.createHash(algo);
	hash.update(String(data));
	console.log(hash.digest('hex'));
	process.exit();
});