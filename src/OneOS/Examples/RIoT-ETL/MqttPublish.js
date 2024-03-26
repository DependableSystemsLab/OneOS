if (process.argv.length < 3) {
    console.log("Provide server address. E.g., node MqttPublish.js $serverAddr");
    process.exit();
}

const serverAddr = process.argv[2];

const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://' + serverAddr);
let connected = false;
const unprocessed = [];

client.on('connect', () => {
    connected = true;

    for (let msg of unprocessed) {
        publishMessage(msg);
    }
    unprocessed.splice(0, unprocessed.length);
});
client.on('error', () => {
    connected = false;
});

function publishMessage(msg) {
    client.publish('riot-etl', JSON.stringify(msg));

    process.stdout.json.write(msg);
}

function doTask(msg) {
    try {
        if (!connected) {
            unprocessed.push(msg);
        }
        else {
            publishMessage(msg);
        }
    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());