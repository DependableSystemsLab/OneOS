// filter an incoming stream of objects using a Bloom filter
const fs = require('fs');
const BloomFilter = require('bloomfilter').BloomFilter;

const MODEL_PATH = 'bloomfilter-TAXI.model';
const EXPECTED_INSERTIONS = 20000000;
const FALSE_POSITIVE_RATE = 0.01;
const AVAILABLE_FILTERS = [
    'taxi_identifier'
];

function loadBloomFilter() {
    let model = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
    let filterSize = Math.ceil(-EXPECTED_INSERTIONS * Math.log(FALSE_POSITIVE_RATE) / Math.pow(Math.log(2), 2));
    let numHashes = Math.ceil(filterSize / EXPECTED_INSERTIONS * Math.log(2));
    let bloomFilter = new BloomFilter(model, numHashes);
    return bloomFilter;
}

const bloomFilter = loadBloomFilter();

function doTask(msg) {
    try {
        if (AVAILABLE_FILTERS.includes(msg.obsType)) {
            let obsVal = parseFloat(msg.obsVal);
            if (!bloomFilter.test(obsVal)) {
                msg.obsVal = null;
            }
        }

        process.stdout.json.write(msg);

    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());