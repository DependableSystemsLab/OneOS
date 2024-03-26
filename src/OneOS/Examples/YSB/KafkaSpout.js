const io = require('oneos/io');

const bootstrapServer = "10.58.0.129:9092";
const topic = 'ad-events';

const kafka = io.createKafkaInputStream(bootstrapServer, topic);
kafka.pipe(process.stdout);