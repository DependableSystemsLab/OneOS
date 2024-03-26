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
    //let model = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
    let filterSize = Math.ceil(-EXPECTED_INSERTIONS * Math.log(FALSE_POSITIVE_RATE) / Math.pow(Math.log(2), 2));
    let numHashes = Math.ceil(filterSize / EXPECTED_INSERTIONS * Math.log(2));
    let bloomFilter = new BloomFilter(filterSize, numHashes);
    return bloomFilter;
}

function saveBloomFilter(bloomFilter) {
    fs.writeFileSync(MODEL_PATH, JSON.stringify(Array.from(bloomFilter.buckets)), 'utf8');
}

const bloomFilter = loadBloomFilter();

function doTask(msg) {
    try {
        if (AVAILABLE_FILTERS.includes(msg.obsType)) {
            let obsVal = parseFloat(msg.obsVal);
            bloomFilter.add(obsVal);
        }
    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => {
    saveBloomFilter(bloomFilter);
    process.exit();
});