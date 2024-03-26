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

const dtree = new DecisionTree(TRAIN_TARGET, TRAIN_FEATURES);

function doTask(msg) {
    try {

        const dataset = msg.dataset.map(item => {
            const entry = {};
            TRAIN_FEATURES.forEach(feature => {
                entry[feature] = parseFloat(item.data[feature]);
            });
            entry[TRAIN_TARGET] = item[TRAIN_TARGET];
            return entry;
        });

        dtree.train(dataset);
    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => {

    fs.writeFile(filePath, JSON.stringify(dtree.toJSON()), err => {
        if (err) console.error(err);

        process.stdout.json.write({
            filename: filePath
        });

        setTimeout(() => {
            process.exit();
        }, 1000);
    });
});