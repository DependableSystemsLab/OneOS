console.log('[DAEMON] Web Server Started');

let WebServer = require('oneos/lib/core/WebServer.js');

let server = new WebServer(process.pubsub_url);