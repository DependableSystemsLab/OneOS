if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node DecisionTreeTrain.js $filePath");
    process.exit();
}

const filePath = process.argv[2];

const fs = require('fs');
const DecisionTree = require('decision-tree');

const TRAIN_FEATURES = [
    'trip_time_in_secs',
    'trip_distance',
    'fare_amount'
];

const TRAIN_TARGET = 'classified_class';

let dtree = null;
let unprocessed = [];
let inputEnded = false;

fs.readFile(filePath, (err, data) => {
    if (err) {
        console.error(err);
        process.exit(1);
        return;
    }
    let modelData = JSON.parse(String(data));
    dtree = new DecisionTree(modelData);

    for (let msg of unprocessed) {
        classify(msg);
    }
    unprocessed = [];

    if (inputEnded) process.exit();
});

function classify(msg) {
    const input = TRAIN_FEATURES.reduce((acc, field) => {
        acc[field] = parseFloat(msg.data[field]);
        return acc;
    }, {});

    const result = dtree.predict(input);
    msg[TRAIN_TARGET] = result;

    process.stdout.json.write(msg);
}

function doTask(msg) {
    try {
        if (dtree === null) {
            unprocessed.push(msg);
        }
        else {
            classify(msg);
        }
    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => {
    // it's possible that the stream ends before the model was loaded.
    // In that case, we expect the model to exit the program
    if (unprocessed.length === 0) {
        process.exit();
    }
    else {
        inputEnded = true;
    }
});