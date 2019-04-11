if (process.argv.length < 2){
	console.log('Provide driver name');
	process.exit(1);
}

const driver = process.argv[2];
const OutputStream = require('oneos/lib/core/runtime/drivers/' + driver +'.js');

const outStream = new OutputStream();
const inStream = process.input('in', outStream.content_type);

inStream.pipe(outStream);