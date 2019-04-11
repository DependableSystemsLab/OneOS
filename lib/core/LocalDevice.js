const { Readable, Writable } = require('stream');

const VALID_CONTENT_TYPES = [
	'raw',
	'text',
	'json'
]

class Input extends Readable {
	constructor (content_type='raw'){
		if (!VALID_CONTENT_TYPES.includes(content_type)) throw new Error('Invalid content_type "'+content_type+'" for LocalDevice.Input');
		super({ objectMode: true });

		this.content_type = content_type;

		// this.fps = 5;
		this.bytes = 0;
	}

	// _read (size){
	// }
}

class Output extends Writable {
	constructor (content_type='raw'){
		if (!VALID_CONTENT_TYPES.includes(content_type)) throw new Error('Invalid content_type "'+content_type+'" for LocalDevice.Output');
		super({ objectMode: true });

		this.content_type = content_type;

		this.bytes = 0;
	}

	// _write (chunk, encoding, callback){
	// 	this.bytes += chunk.length;
	// 	callback(null);
	// }
}

module.exports = {
	Readable: Input,
	Writable: Output
};