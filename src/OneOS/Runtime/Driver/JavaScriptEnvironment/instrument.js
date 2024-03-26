if (process.argv.length < 6) {
    console.log('provide input file, output file, agent URI, virtual CWD');
    process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];
const agentUri = process.argv[4];
const agentCwd = process.argv[5];

const fs = require('fs');
const path = require('path');
const Code = require('./Code.js');

let source = fs.readFileSync(inputPath, 'utf8');

let instrumented = Code.instrument(source, {
    uri: agentUri,
    filename: path.basename(outputPath),
    cwd: agentCwd
});

fs.writeFileSync(outputPath, instrumented, 'utf8');