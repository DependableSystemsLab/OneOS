const { Writable } = require('../../LocalDevice.js');
const Gpio = require('onoff').Gpio;

class OutputStream extends Writable {
	constructor (){
		super();

		this.pin = new Gpio(7, 'out');
	}

	_write (chunk, encoding, callback){
		// this.bytes += chunk.length;
		this.pin.write(chunk, (err)=>{
			callback(err);
		});
	}
}

module.exports = OutputStream;

// let stream = new OutputStream();
// setInterval(()=>{
// 	stream.write(crypto.randomBytes(1));
// }, 200);