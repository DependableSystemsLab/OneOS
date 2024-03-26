const redis = require('redis');
const client = redis.createClient({
    socket: { host: '10.58.0.129', port: 6379 }
});

const connected = new Promise((resolve, reject) => client.connect().then(resolve));

const ad_to_campaign = {};

async function execute(ad_id) {
    let campaign_id = ad_to_campaign[ad_id];
    if (!campaign_id) {
        campaign_id = await client.get(ad_id);
        if (!campaign_id) return null;
        else ad_to_campaign[ad_id] = campaign_id;
    }
    return campaign_id;
}

async function doTask(json) {
    await connected;

    let campaign_id = await execute(json.ad_id);
    if (!campaign_id) return;

    let msg = Object.assign({ campaign_id }, json);

    process.stdout.json.write(msg);
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());