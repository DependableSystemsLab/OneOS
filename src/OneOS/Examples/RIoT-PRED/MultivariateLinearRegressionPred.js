if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node MultivariateLinearRegressionPred.js $filePath");
    process.exit();
}

const filePath = process.argv[2];

const fs = require('fs');
const MLR = require('ml-regression-multivariate-linear');

const TRAIN_FEATURES = [
    'trip_time_in_secs',
    'trip_distance'
];

const TRAIN_TARGETS = [
    'fare_amount',
    'total_amount'
];

let model = null;
let unprocessed = [];
let inputEnded = false;

fs.readFile(filePath, (err, data) => {
    if (err) {
        console.error(err);
        process.exit(1);
        return;
    }
    let modelData = JSON.parse(String(data));
    model = MLR.load(modelData);

    for (let msg of unprocessed) {
        predict(msg);
    }
    unprocessed = [];

    if (inputEnded) process.exit();
});

function predict(msg) {
    const input = TRAIN_FEATURES.map((field) => parseFloat(msg.data[field]));

    const result = model.predict(input);
    const predictions = {};
    for (let i = 0; i < result.length; i++) {
        predictions[TRAIN_TARGETS[i]] = result[i];
    }
    msg.predictions = predictions;

    process.stdout.json.write(msg);
}

function doTask(msg) {
    try {
        if (model === null) {
            unprocessed.push(msg);
        }
        else {
            predict(msg);
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