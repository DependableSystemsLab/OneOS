if (process.argv.length < 2){
	console.log('Provide driver name');
	process.exit(1);
}

const driver = process.argv[2];
const InputStream = require('oneos/lib/core/runtime/drivers/' + driver +'.js');

const inStream = new InputStream();
const outStream = process.output('out', inStream.content_type);

inStream.pipe(outStream);