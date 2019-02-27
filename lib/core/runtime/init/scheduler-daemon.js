console.log('[DAEMON] Scheduler Started');

let Scheduler = require('oneos/lib/core/Scheduler.js');

let scheduler = new Scheduler(process.oneos.pubsub_url);