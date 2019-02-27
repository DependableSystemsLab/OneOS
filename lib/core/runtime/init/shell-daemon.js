console.log('[DAEMON] Shell Started');

let ShellServer = require('oneos/lib/core/Shell.js').Server;

let server = new ShellServer(process.oneos.pubsub_url);