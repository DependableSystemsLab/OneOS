console.log('[DAEMON] File System Started');

let FSDaemon = require('oneos/lib/core/FileSystem.js').Broker;

let daemon = new FSDaemon(process.pubsub_url, 'mongodb://localhost:27017/oneos-fs');