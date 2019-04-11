const { Writable } = require('../../LocalDevice.js');

class OutputStream extends Writable {
	constructor (){
		super();
	}

	_write (chunk, encoding, callback){
		this.bytes += chunk.length;
		console.log(String(chunk));
		callback(null);
	}
}

module.exports = OutputStream;

// let stream = new OutputStream();
// setInterval(()=>{
// 	stream.write(crypto.randomBytes(1));
// }, 200);