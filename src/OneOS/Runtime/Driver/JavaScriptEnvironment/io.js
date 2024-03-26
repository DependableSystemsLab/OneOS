const Runtime = require('./Runtime.js');

module.exports = {
    createVideoInputStream: Runtime.createVideoInputStream,
    createKafkaInputStream: Runtime.createKafkaInputStream,
    rpcRequest: Runtime.rpcRequest,
    createAgentTunnel: Runtime.createAgentTunnel,
    createAgentMonitorStream: Runtime.createAgentMonitorStream
}