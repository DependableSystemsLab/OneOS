const crypto = require('crypto');
const fs = require('oneos').fs();

function hash(filePath, algo){
	return new Promise((resolve, reject)=>{
		fs.readFile(filePath, (err, data)=>{
			if (err) reject(err);
			else {
				let hashObj = crypto.createHash(algo);
				hashObj.update(String(data));
				resolve(hashObj.digest('hex'));	
			}
		});
	})
}
hash.signature = {
	name: 'hash',
	args: ['filePath', 'algorithm']
}

module.exports = hash;