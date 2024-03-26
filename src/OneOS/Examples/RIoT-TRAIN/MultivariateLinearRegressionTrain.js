if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node MultivariateLinearRegressionTrain.js $filePath");
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

const featureData = [];
const targetData = [];

function doTask(msg) {
    try {
        for (let item of msg.dataset) {
            featureData.push(TRAIN_FEATURES.map(field => parseFloat(item.data[field])));
            targetData.push(TRAIN_TARGETS.map(field => parseFloat(item.data[field])));
        }
    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => {

    const model = new MLR(featureData, targetData);
    fs.writeFile(filePath, JSON.stringify(model.toJSON()), err => {
        if (err) console.error(err);

        process.stdout.json.write({
            filename: filePath
        });

        setTimeout(() => {
            process.exit();
        }, 1000);
    });
});