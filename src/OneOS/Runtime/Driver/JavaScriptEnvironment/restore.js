if (process.argv.length < 4) {
    console.log('provide input file, output file');
    process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];
/*const agentUri = process.argv[4];*/

const fs = require('fs');
const path = require('path');
const Code = require('./Code.js');

let source = fs.readFileSync(inputPath, 'utf8');

let restored = Code.restore(JSON.parse(source));

fs.writeFileSync(outputPath, restored, 'utf8');