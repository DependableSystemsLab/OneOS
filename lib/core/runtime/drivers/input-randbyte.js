const { Readable } = require('../../LocalDevice.js');
const crypto = require('crypto');

class InputStream extends Readable {
	constructor (){
		super();

		this.fps = 5;

		setInterval(()=>this.push(crypto.randomBytes(1)), 1000/this.fps);
	}

	_read (size){
		// this.bytes += size;
	}
}

module.exports = InputStream;

// let stream = new InputStream();
// stream.on('data', (data)=>{
// 	console.log(data);
// })