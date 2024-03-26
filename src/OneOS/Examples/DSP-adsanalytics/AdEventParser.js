if (process.argv.length < 4) {
    console.log("Provide file path and stream type. E.g., node AdEventParser.js $filePath clicks|impressions");
    process.exit();
}

const filePath = process.argv[2];
const streamType = process.argv[3];

if (streamType !== 'clicks' && streamType !== 'impressions') {
    console.log("Invalid stream type - it should be either 'clicks' or 'impressions', but got (" + streamType + ")");
    process.exit(1);
}

const fs = require('fs');

const CLICKS = 0;
const VIEWS = 1;
const DISPLAY_URL = 2;
const AD_ID = 3;
const ADVERTISER_ID = 4;
const DEPTH = 5;
const POSITION = 6;
const QUERY_ID = 7;
const KEYWORD_ID = 8;
const TITLE_ID = 9;
const DESC_ID = 10;
const USER_ID = 11;

function parse(line) {
    const record = line.split('\t');

    if (record.length !== 12) return;

    const numEvents = streamType === 'clicks' ? record[CLICKS] : record[VIEWS];

    const event = {
        eventType: streamType === 'clicks' ? 'click' : 'impression',
        displayUrl: record[DISPLAY_URL],
        queryId: record[QUERY_ID],
        adId: record[AD_ID],
        userId: record[USER_ID],
        advertiserId: record[ADVERTISER_ID],
        keywordId: record[KEYWORD_ID],
        titleId: record[TITLE_ID],
        descriptionId: record[DESC_ID],
        depth: record[DEPTH],
        position: record[POSITION]
    }

    for (let i = 0; i < numEvents; i++) {
        process.stdout.json.write(event);
    }
}

var stream = fs.createReadStream(filePath);
//stream.pipe(process.stdout);
var buf = '';
stream.on('data', chunk => {
    const text = chunk.toString('utf8');
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') {
            parse(buf);
            buf = '';
        }
        else {
            buf += text[i];
        }
    }
});
stream.on('end', () => {
    if (buf) {
        parse(buf);
        buf = '';
    };

    setTimeout(() => {
        process.exit();
    }, 1000);
});