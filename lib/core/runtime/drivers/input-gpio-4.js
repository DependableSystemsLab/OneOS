const { Readable } = require('../../LocalDevice.js');
const Gpio = require('onoff').Gpio;

class InputStream extends Readable {
	constructor (){
		super();

		// let pin = new Gpio(4, 'in', 'both');
		this.pin = new Gpio(4, 'in');
		this.fps = 5;
		// pin.watch((err, value)=>this.push(value));
		setInterval(()=>{
			this.pin.read((err,val)=>this.push(err ? -1 : val));
		}, 1000/this.fps);
	}

	_read (size){
	}
}

module.exports = InputStream;