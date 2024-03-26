const { v4: uuid } = require('uuid');
const redis = require('redis');
const client = redis.createClient({
    socket: { host: '10.58.0.129', port: 6379 }
});

const connected = new Promise((resolve, reject) => client.connect().then(resolve));

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
    console.log(campaign, win);
    await connected;
    let windowUUIDResult = await client.HMGET(campaign, win.timestamp);
    let windowUUID = windowUUIDResult[0];
    if (windowUUID == null) {
        windowUUID = uuid();
        await client.HSET(campaign, win.timestamp, windowUUID);
        
        let windowListUUIDResult = await client.HMGET(campaign, "windows");
        let windowListUUID = windowListUUIDResult[0];
        if (windowListUUID == null) {
            windowListUUID = uuid();
            await client.HSET(campaign, "windows", windowListUUID);
        }
        await client.LPUSH(windowListUUID, win.timestamp);
    }

    await client.HINCRBY(windowUUID, "seen_count", win.seenCount);
    win.seenCount = 0;

    let now = String(Date.now());
    await client.HSET(windowUUID, "time_updated", now);
    await client.LPUSH("time_updated", now);
}

function flushWindows() {
    need_flush.forEach(pair => writeWindow(pair.campaign, pair.window));
    need_flush.clear();
}

const flusher = setInterval(() => {
    flushWindows();
    lastWindowMillis = Date.now();
}, 1000);

// campaign_id: string
// event_time: string
function execute(campaign_id, event_time) {
    let timeBucket = Math.floor(parseInt(event_time) / time_divisor);   // need to do math floor because JS
    let window = getWindow(timeBucket, campaign_id);
    window.seenCount++;

    let newPair = new CampaignWindowPair(campaign_id, window);
    need_flush.add(newPair);
    processed++;
}

function doTask(json) {
    execute(json.campaign_id, json.event_time);
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());