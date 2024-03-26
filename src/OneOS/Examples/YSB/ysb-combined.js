const { v4: uuid } = require('uuid');
const redis = require('redis');
const io = require('oneos/io');

const bootstrapServer = "10.58.0.129:9092";
const topic = 'ad-events';

const kafka = io.createKafkaInputStream(bootstrapServer, topic, { format: 'json', batchSize: 50000 });
const redisClient = redis.createClient({
    socket: { host: '10.58.0.129', port: 6379 }
});
const redisConnected = new Promise((resolve, reject) => redisClient.connect().then(resolve));

const ad_to_campaign = {};

async function lookUpCampaign(ad_id) {
    let campaign_id = ad_to_campaign[ad_id];
    if (!campaign_id) {
        campaign_id = await redisClient.get(ad_id);
        if (!campaign_id) return null;
        else ad_to_campaign[ad_id] = campaign_id;
    }
    return campaign_id;
}

function hashChar(cha, pow) {
    if (pow < 0) return 0;
    if (pow === 0) return cha;
    else {
        var prev = hashChar(cha, pow - 1);
        return (prev << 5) - prev;
    }
}

function hashCode(text) {
    let code = 0;
    for (let i = 0; i < text.length; i++) {
        code += hashChar(text.charCodeAt(i), text.length - (i + 1));
    }
    return code >>> 0;  // we need to do an unsigned shift
}

class LRUHashMap extends Map {
    constructor(cacheSize) {
        super();
        this.cacheSize = cacheSize;
    }

    removeEldestEntry(eldest) {
        return size() >= cacheSize;
    }
}

class Window {
    constructor(timestamp, seenCount) {
        this.timestamp = timestamp; // string
        this.seenCount = seenCount; // long
    }

    hashCode() {
        return 31 + hashCode(this.timestamp);
    }

    toString() {
        return "{ time: " + this.timestamp + ", seen: " + this.seenCount + " }";
    }
}

class CampaignWindowPair {
    constructor(campaign, window) {
        this.campaign = campaign;   // string
        this.window = window;       // Window
    }

    hashCode() {
        return (31 + hashCode(this.campaign)) * 31 + this.window.hashCode();
    }

    toString() {
        return "{ " + this.campaign + " : " + this.window.toString() + " }";
    }
}

const time_divisor = 10000;
let processed = 0;
let lastWindowMillis = Date.now();
const campaign_windows = new LRUHashMap();
const need_flush = new Set();

function redisGetWindow(timeBucket, time_divisor) {
    return new Window(String(timeBucket * time_divisor), 0);
}

// timeBucket: long
// campaign_id: string
function getWindow(timeBucket, campaign_id) {
    let bucket_map = campaign_windows.get(timeBucket);
    if (bucket_map == null) {
        // Try to pull from redis into cache.
        let redisWindow = redisGetWindow(timeBucket, time_divisor);
        if (redisWindow != null) {
            bucket_map = new Map();
            campaign_windows.set(timeBucket, bucket_map);
            bucket_map.set(campaign_id, redisWindow);
            return redisWindow;
        }

        // Otherwise, if nothing in redis:
        bucket_map = new Map();
        campaign_windows.set(timeBucket, bucket_map);
    }

    // Bucket exists. Check the window.
    let window = bucket_map.get(campaign_id);
    if (window == null) {
        // Try to pull from redis into cache.
        let redisWindow = redisGetWindow(timeBucket, time_divisor);
        if (redisWindow != null) {
            bucket_map.set(campaign_id, redisWindow);
            return redisWindow;
        }

        // Otherwise, if nothing in redis:
        window = new Window(String(timeBucket * time_divisor), 0);
        bucket_map.set(campaign_id, redisWindow);
    }
    return window;
}

async function writeWindow(campaign, win) {
    //console.log(campaign, win);
    let windowUUIDResult = await redisClient.HMGET(campaign, win.timestamp);
    let windowUUID = windowUUIDResult[0];
    if (windowUUID == null) {
        windowUUID = uuid();
        await redisClient.HSET(campaign, win.timestamp, windowUUID);

        let windowListUUIDResult = await redisClient.HMGET(campaign, "windows");
        let windowListUUID = windowListUUIDResult[0];
        if (windowListUUID == null) {
            windowListUUID = uuid();
            await redisClient.HSET(campaign, "windows", windowListUUID);
        }
        await redisClient.LPUSH(windowListUUID, win.timestamp);
    }

    await redisClient.HINCRBY(windowUUID, "seen_count", win.seenCount);
    win.seenCount = 0;

    let now = String(Date.now());
    await redisClient.HSET(windowUUID, "time_updated", now);
    await redisClient.LPUSH("time_updated", now);
}

function flushWindows() {
    need_flush.forEach(pair => writeWindow(pair.campaign, pair.window));
    need_flush.clear();
}

const flusher = setInterval(() => {
    flushWindows();
    lastWindowMillis = Date.now();
}, 1000);

function processCampaign(campaign_id, event_time) {
    let timeBucket = Math.floor(parseInt(event_time) / time_divisor);   // need to do math floor because JS
    let window = getWindow(timeBucket, campaign_id);
    window.seenCount++;

    let newPair = new CampaignWindowPair(campaign_id, window);
    need_flush.add(newPair);
    processed++;
}

(async () => {
    await redisConnected;

    kafka.on('data', async json => {
        if (json.event_type === "view") {
            let campaign_id = await lookUpCampaign(json.ad_id);
            if (!campaign_id) return;

            processCampaign(campaign_id, json.event_time);
        }
    });

})();