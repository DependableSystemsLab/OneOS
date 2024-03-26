const Runtime = require('./Runtime.js');

function createServer(options, connectionListener) {
    return Runtime.createServer(options, connectionListener);
}

module.exports = {
    createServer: createServer
}