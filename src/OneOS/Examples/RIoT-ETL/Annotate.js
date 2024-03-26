// annotate an incoming stream of objects
const fs = require('fs');

const ANNOTATION_DATA_PATH = 'taxi-metadata-fulldataset.txt';

const annotationMap = fs.readFileSync(ANNOTATION_DATA_PATH, 'utf8').split('\n').reduce((acc, line) => {
    let tokens = line.trim().split(':');
    acc[tokens[0]] = tokens[1];
    return acc;
}, {});

function doTask(msg) {
    try {
        let sensorId = msg.obsVal.split(',')[0];
        if (sensorId in annotationMap) {
            msg.obsType = 'annotatedValue';
            msg.obsVal += annotationMap[sensorId];
        }

        process.stdout.json.write(msg);

    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());