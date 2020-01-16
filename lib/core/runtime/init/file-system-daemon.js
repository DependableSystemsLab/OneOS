console.log('[DAEMON] File System Started');

let FSDaemon = require('oneos/lib/core/FileSystem.js').Broker;

let daemon = new FSDaemon(process.oneos.pubsub_url, process.oneos.store_url);