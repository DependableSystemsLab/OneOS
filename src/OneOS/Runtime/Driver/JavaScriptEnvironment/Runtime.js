/* Represents the host Runtime */
const fs = require('fs');
const net = require('net');
const stream = require('stream');
const events = require('events');

// Helpers
const ID_CHARSET = 'abcdefghijklmnopqrstuvwxyz';
function randstr(length = 8) {
    return Array.from({ length: length }, item => ID_CHARSET[Math.floor(Math.random() * ID_CHARSET.length)]).join('');
}

const PROPERTY_PREFIX = 'τ';		// prefix for injected properties

class MessageStream extends stream.Duplex {
    constructor(inputByteStream, outputByteStream) {
        super();
        if (inputByteStream) this.setInputStream(inputByteStream);
        if (outputByteStream) this.setOutputStream(outputByteStream);
    }

    setInputStream(inputByteStream) {
        this.input = inputByteStream;
        this._bindInput();
    }

    setOutputStream(outputByteStream) {
        this.output = outputByteStream;
    }

    _bindInput() {
        let header = Buffer.alloc(4);
        let headerRead = 0;
        let frame = null;
        let frameCursor = 0;

        this.input.on('data', chunk => {
            let bytesRead = chunk.length;
            let cursor = 0;
            while (cursor < bytesRead) {
                while (frame === null) {
                    header[headerRead] = chunk[cursor];
                    headerRead++;
                    cursor++;
                    if (headerRead === 4) {
                        frame = Buffer.alloc(header.readInt32LE());
                        frameCursor = 0;
                        headerRead = 0;
                    }
                    if (cursor >= bytesRead) break;
                }
                if (cursor >= bytesRead) break;

                let frameBytesLeft = frame.length - frameCursor;
                let bytesLeft = bytesRead - cursor;

                if (frameBytesLeft <= bytesLeft) {
                    chunk.copy(frame, frameCursor, cursor, cursor + frameBytesLeft);
                    this.push(frame);

                    cursor += frameBytesLeft;
                    frame = null;
                }
                else {
                    chunk.copy(frame, frameCursor, cursor, cursor + bytesLeft);
                    cursor += bytesLeft;
                    frameCursor += bytesLeft;
                }
            }
        });

        this.input.on('end', () => {
            if (frame !== null) this.push(frame);
            this.push(null);
        });
    }

    _read(size) {
        // do nothing, we assume that the input is in flowing mode
    }

    _write(payload, encoding, callback) {
        let header = Buffer.from([0, 0, 0, 0]);
        header.writeInt32LE(payload.length, 0);
        this.output.write(Buffer.concat([header, payload]), encoding, callback);
    }
}

class JsonStream extends stream.Duplex {
    constructor(inputByteStream, outputByteStream) {
        super({
            readableObjectMode: true,
            writableObjectMode: true
        });

        if (inputByteStream) this.setInputStream(inputByteStream);
        if (outputByteStream) this.setOutputStream(outputByteStream);
    }

    setInputStream(inputByteStream) {
        this.input = inputByteStream;
        this._bindInput();
    }

    setOutputStream(outputByteStream) {
        this.output = outputByteStream;
    }

    /*_bindInput() {
        let depth = 0;
        let line = '';
        this.input.on('data', chunk => {
            let data = String(chunk);
            for (let i = 0; i < data.length; i++) {
                line += data[i];
                if (data[i] == '{') {
                    depth += 1;
                }
                else if (data[i] == '}') {
                    depth -= 1;
                    if (depth === 0) {
                        this.push(JSON.parse(line));
                        line = '';
                    }
                }
            }
        });

        this.input.on('end', () => {
            if (line) {
                this.push(JSON.parse(line));
            }
            this.push(null);
        });
    }*/

    _bindInput() {
        let frameBuffer = Buffer.alloc(131072);
        let depth = 0;
        let frameCursor = 0;
        let chunkStart = 0;
        let chunkSize = 0;

        this.input.on('data', buffer => {
            for (let i = 0; i < buffer.length; i++) {
                if (buffer[i] == 0x7B) {
                    if (depth == 0) {
                        frameCursor = 0;
                        chunkStart = i;
                    }
                    depth += 1;
                }
                else if (buffer[i] == 0x7D) {
                    depth -= 1;
                    if (depth == 0) {
                        chunkSize = i - chunkStart + 1;
                        buffer.copy(frameBuffer, frameCursor, chunkStart, i + 1);
                        frameCursor += chunkSize;

                        // frame is ready, emit payload
                        let frame = frameBuffer.subarray(0, frameCursor);
                        this.push(JSON.parse(String(frame)));
                        //this.bytesRead += frame.length;
                    }
                }
            }

            if (depth > 0) {
                chunkSize = buffer.length - chunkStart;
                buffer.copy(frameBuffer, frameCursor, chunkStart, buffer.length);
                frameCursor += chunkSize;

                chunkStart = 0;
            }
        });

        this.input.on('end', () => {
            if (frameCursor > 0) this.push(JSON.parse(String(frameBuffer.subarray(0, frameCursor))));
            this.push(null);
        });
    }

    _read(size) {
        // do nothing, we assume that the input is in flowing mode
    }

    _write(payload, encoding, callback) {
        this.output.write(JSON.stringify(payload), callback);
    }
}

// We use a Duplex stream because using a Writable stream
// over the TCP abstraction makes it difficult to perform
// the initial handshake with the Runtime (Readable stream is okay).
// We rely on the Runtime to send a "Ready" message
// after we send it a connection request message
class DirectPipe extends stream.Duplex {
    constructor(type, mode, format = 'raw') {
        super({
            readableObjectMode: format === 'json'
        });

        this.type = type;
        this.mode = mode;
        this.format = format;

        this.connected = new Promise((resolve, reject) => {
            this.__resolve = resolve;
            this.__reject = reject;
        });

        if (this.mode === 'read') {
            if (this.format === 'segment') {
                // IO streams (e.g., video) expect segments over the TCP stream
                this.__receive = this.createSegmentedReceiver();
            }
            else if (this.format === 'json') {
                this.__receive = this.createJsonReceiver();
            }
            else if (this.format === 'mjpeg') {
                this.__receive = this.createMjpegReceiver();
            }
            else {
                this.__receive = data => {
                    this.push(data);
                    //this.bytesRead += data.length;
                };
            }

            this.bytesRead = 0;
        }
    }

    createSegmentedReceiver() {
        let cursor = 0;
        let frame = null;
        let header = Buffer.alloc(4);
        let headerRead = 0;
        let frameCursor = 0;

        const receive = (data) => {
            cursor = 0;

            while (cursor < data.length) {
                // if we don't have a frame set, we are reading a new frame
                while (frame == null) {
                    header[headerRead] = data[cursor];
                    headerRead++;
                    cursor++;
                    if (headerRead == 4) {
                        frame = Buffer.alloc(header.readInt32LE(0));
                        frameCursor = 0;
                        headerRead = 0;
                    }
                    if (cursor >= data.length) break;
                }
                if (cursor >= data.length) break;

                let frameBytesLeft = frame.length - frameCursor;
                let bytesLeft = data.length - cursor;

                // if the bytes left in the frame are less than or equal to
                // bytes left to read in the current read, we can read the whole frame
                if (frameBytesLeft <= bytesLeft) {
                    data.copy(frame, frameCursor, cursor, cursor + frameBytesLeft);
                    // flush the frame
                    this.push(frame);
                    //this.bytesRead += frame.length;

                    cursor += frameBytesLeft;   // advance the cursor
                    frame = null;               // clear the frame
                }
                else {
                    // if the bytes left in the frame is larger than the remaining bytes,
                    // read what is remaining and add to the frame
                    data.copy(frame, frameCursor, cursor, cursor + bytesLeft);

                    cursor += bytesLeft;        // advance the cursor
                    frameCursor += bytesLeft;   // advance the frame cursor
                }
            }
        }

        return receive;
    }

    createJsonReceiver() {
        let frameBuffer = Buffer.alloc(131072);
        let depth = 0;
        let frameCursor = 0;
        let chunkStart = 0;
        let chunkSize = 0;

        const receive = (buffer) => {
            for (let i = 0; i < buffer.length; i++) {
                if (buffer[i] == 0x7B) {
                    if (depth == 0) {
                        frameCursor = 0;
                        chunkStart = i;
                    }
                    depth += 1;
                }
                else if (buffer[i] == 0x7D) {
                    depth -= 1;
                    if (depth == 0) {
                        chunkSize = i - chunkStart + 1;
                        buffer.copy(frameBuffer, frameCursor, chunkStart, i + 1);
                        frameCursor += chunkSize;

                        // frame is ready, emit payload
                        let frame = frameBuffer.subarray(0, frameCursor);
                        this.push(JSON.parse(String(frame)));
                        //this.bytesRead += frame.length;
                    }
                }
            }

            if (depth > 0) {
                chunkSize = buffer.length - chunkStart;
                buffer.copy(frameBuffer, frameCursor, chunkStart, buffer.length);
                frameCursor += chunkSize;

                chunkStart = 0;
            }
        }

        return receive;
    }

    createMjpegReceiver() {
        let frameBuffer = Buffer.alloc(131072);
        let frameCursor = 0;
        let pieceStart = -1;

        const receive = (buffer) => {
            // Process the chunk to find JPEG frames
            let pieceSize = 0;

            for (let i = 0; i < buffer.length - 1; i++) {
                if (pieceStart < 0 && buffer[i] === 0xFF && buffer[i + 1] === 0xD8) {
                    // Start of JPEG
                    frameCursor = 0;
                    pieceStart = i;
                }
                else if (pieceStart >= 0 && buffer[i] === 0xFF && buffer[i + 1] === 0xD9) {
                    // End of JPEG
                    pieceSize = i + 2 - pieceStart;
                    buffer.copy(frameBuffer, frameCursor, pieceStart, i + 2);
                    frameCursor += pieceSize;

                    // frame is ready, emit payload
                    const frame = Buffer.alloc(frameCursor);
                    frameBuffer.copy(frame, 0, 0, frameCursor);
                    // this.frames.push(frame);
                    this.push(frame);

                    // this.stopWatch.count();
                    // console.log(this.stopWatch.rate);

                    pieceStart = -1;
                }
            }

            if (pieceStart >= 0) {
                pieceSize = buffer.length - pieceStart;
                buffer.copy(frameBuffer, frameCursor, pieceStart, buffer.length);
                frameCursor += pieceSize;

                pieceStart = 0;
            }
        }

        return receive;
    }

    connect(host) {
        let tokens = host.split(':');
        let client = net.createConnection({ host: tokens[0], port: parseInt(tokens[1]) }, () => {
            client.write(`5;${this.type};${tokens[2]}`, 'utf8'); // '5' is a DirectPipeConnectionRequest
        });
        client.on('data', data => {
            if (this.mode === 'read') {
                this.__receive(data);
            }
            else {
                this.__resolve(client);
            }
        });
        client.on('end', () => this.push(null));

        this.on('unpipe', () => {
            // TODO: use another reliable way to determine
            //       upstream pipe drain, rather than relying on a timeout
            setTimeout(() => {
                client.end();
                client.destroy();
            }, 1000);
        });

        /*this.on('finish', () => {
            console.log(`Pipe ${host} Finished`);
        });

        this.on('drain', () => {
            console.log(`Pipe ${host} Drained`);
        });*/
    }

    _read(size) {
        // do nothing, we assume that the input is in flowing mode
    }

    _write(payload, encoding, callback) {
        if (this.mode === 'write') {
            this.connected.then((client) => {
                client.write(payload, encoding, callback);
            });
        }
    }

    read(size) {
        const result = super.read(size);
        if (result) this.bytesRead += result.length;
        return result;
    }
}

class AgentTunnel extends MessageStream {
    constructor(sessionKey, agentUri, gatewayAddress) {
        super();
        this.uri = process.uri + '/tunnel/' + randstr();
        this.sessionKey = sessionKey;
        this.targetAgent = agentUri;
        this.messagesRead = 0;
        this.messagesWritten = 0;

        this.connected = new Promise((resolve, reject) => {
            this.__resolve = resolve;
            this.__reject = reject;
        });

        this.connect(gatewayAddress);
    }

    connect(host) {
        const tokens = host.split(':');
        const client = net.createConnection({ host: tokens[0], port: parseInt(tokens[1]) }, () => {
            client.once('data', data => {
                const resp = data.toString('utf8').split(';');
                if (resp[1] === 'OK') {
                    // begin tunneling
                    /*client.on('data', data => {
                        this.push(data);
                    });
                    client.on('end', () => this.push(null));*/
                    this.setInputStream(client);
                    this.setOutputStream(client);
                    this.__resolve(client);
                }
                else if (resp[1] === 'Redirect') {
                    client.destroy();
                    this.connect(resp[3]);
                }
                else {
                    client.destroy();
                    this.destroy(new Error(`Error creating tunnel to ${this.targetAgent}: ${resp[1]}`));
                }
            });
            client.write(`9;${this.sessionKey};${this.targetAgent}`, 'utf8'); // '9' is an AgentTunnelRequest
        });
    }

    _read(size) {
        // do nothing, we assume that the input is in flowing mode
    }

    _write(payload, encoding, callback) {
        this.connected.then((client) => {
            //client.write(payload, encoding, callback);
            super._write(this._createMessage(payload), encoding, callback);
        });
    }

    _createMessage(payload) {
        const header = Buffer.from(`${this.uri};${this.uri}/stdout;${this.messagesWritten}`);
        const frame = Buffer.alloc(4 + header.length + payload.length);

        frame.writeInt32LE(header.length, 0);
        header.copy(frame, 4, 0, header.length);
        payload.copy(frame, 4 + header.length, 0, payload.length);

        return frame;
    }

    _parseMessage(frame) {
        const headerLength = frame.readInt32LE(0);
        const payload = Buffer.alloc(frame.length - 4 - headerLength);
        frame.copy(payload, 0, 4 + headerLength, frame.length);

        return payload;
    }

    push(frame) {
        super.push(this._parseMessage(frame));
    }
}

class RpcSocket {
    constructor(inputStream, outputStream, handlers = {}) {
        this.handlers = handlers;
        this.requests = {};
        this.stream = new MessageStream(inputStream, outputStream);

        this.stream.on('data', payload => {
            let message = JSON.parse(String(payload));
            if (message.type === 'request') {
                if (this.handlers[message.method]) {
                    try {
                        let result = this.handlers[message.method].apply(null, message.arguments);
                        this.stream.write(Buffer.from(JSON.stringify(this.createResponse(message, false, result))));
                    }
                    catch (err) {
                        this.stream.write(Buffer.from(JSON.stringify(this.createResponse(message, true, err.stack))));
                    }
                }
                else {
                    this.stream.write(Buffer.from(JSON.stringify(this.createResponse(message, true, "Not a valid method"))));
                }
            }
            else if (message.type === 'response') {
                if (this.requests[message.transactionId]) {
                    if (message.hasError) {
                        this.requests[message.transactionId].reject(new Error(message.result));
                    }
                    else {
                        this.requests[message.transactionId].resolve(message.result);
                    }
                }
                else {
                    // ignore the message
                }
            }
        })
    }

    createResponse(requestMessage, hasError, result) {
        return {
            type: 'response',
            transactionId: requestMessage.transactionId,
            hasError: hasError,
            result: result
        }
    }

    setHandler(method, func) {
        this.handlers[method] = func;
    }

    request(method, ...args) {
        return new Promise((resolve, reject) => {
            let id = randstr();
            let request = {
                type: 'request',
                transactionId: id,
                method: method,
                arguments: args
            };

            this.requests[id] = {
                resolve: result => {
                    delete this.requests[id];
                    resolve(result);
                },
                reject: err => {
                    delete this.requests[id];
                    reject(err);
                }
            };

            this.stream.write(Buffer.from(JSON.stringify(request)));
        });
    }
}

let filename;
let connected;
let rpc;

const Runtime = {
    connect: (root) => {
        if (!connected) {
            connected = new Promise((resolve, reject) => {

                filename = root.meta.filename;

                const runtimeEventEmitter = new events.EventEmitter(); // event emitter used to notify about OneOS runtime events to the user process

                const initRpc = (rpSocket, prSocket) => {
                    rpc = new RpcSocket(rpSocket, prSocket, {
                        'pause': () => {
                            root.pauseTimers();
                            return null;
                        },
                        'resume': () => {
                            root.resumeTimers();
                            return null;
                        },
                        'checkpoint': () => {
                            return root.snapshot();
                        },
                        'emitRuntimeEvent': (evtType, evtData) => {
                            runtimeEventEmitter.emit('data', {
                                type: evtType,
                                data: evtData
                            });
                            return null;
                        }
                    });
                    resolve(rpc);
                }

                // listen for control messages from the OneOS runtime via
                // UNIX socket on linux and via NamedPipes on Windows
                let rxSocket;
                let txSocket;

                let rxSocketName = process.platform === 'win32' ? `\\\\.\\pipe\\${filename}.rp.sock` : `${filename}.rp.sock`;
                let txSocketName = process.platform === 'win32' ? `\\\\.\\pipe\\${filename}.pr.sock` : `${filename}.pr.sock`;

                let rxServer = net.createServer(socket => {
                    //console.log('rp connected');
                    rxSocket = socket;

                    if (rxSocket && txSocket && !rpc) initRpc(rxSocket, txSocket);

                    socket.on('end', () => {
                        rxServer.close();
                    });
                });

                // On UNIX, there could be an existing socket with the same name,
                // if the previous owner process of the socket experienced an unclean exit (e.g., SIGKILL).
                // In that case, there would be a zombie socket, which need to be removed.
                // We check whether the socket is a zombie or not by trying to connect to it.
                rxServer.on('error', err => {
                    if (err.code === 'EADDRINUSE') {
                        let rxTempClient = new net.Socket();
                        rxTempClient.on('error', err2 => {
                            // The socket is indeed a zombie socket.
                            // Safe to remove and create a new one
                            if (err2.code === 'ECONNREFUSED') {
                                fs.unlinkSync(rxSocketName);
                                rxServer.listen(rxSocketName, () => {
                                });
                            }
                        });
                        rxTempClient.connect(rxSocketName, () => {
                            // If connection was successful, then there is an owner process.
                            // This process needs to exit
                            console.error(`Another process is already running for Agent ${root.meta.uri}`);
                            process.exit(1);
                        });
                    }
                });

                rxServer.listen(rxSocketName, () => {
                });

                let txServer = net.createServer(socket => {
                    //console.log('pr connected');
                    txSocket = socket;

                    if (rxSocket && txSocket && !rpc) initRpc(rxSocket, txSocket);

                    socket.on('end', () => {
                        txServer.close();
                    });
                });

                // On UNIX, there could be an existing socket with the same name,
                // if the previous owner process of the socket experienced an unclean exit (e.g., SIGKILL).
                // In that case, there would be a zombie socket, which need to be removed.
                // We check whether the socket is a zombie or not by trying to connect to it.
                txServer.on('error', err => {
                    if (err.code === 'EADDRINUSE') {
                        let txTempClient = new net.Socket();
                        txTempClient.on('error', err2 => {
                            // The socket is indeed a zombie socket.
                            // Safe to remove and create a new one
                            if (err2.code === 'ECONNREFUSED') {
                                fs.unlinkSync(txSocketName);
                                txServer.listen(txSocketName, () => {
                                });
                            }
                        });
                        txTempClient.connect(txSocketName, () => {
                            // If connection was successful, then there is an owner process.
                            // This process needs to exit
                            console.error(`Another process is already running for Agent ${root.meta.uri}`);
                            process.exit(1);
                        });
                    }
                });

                txServer.listen(txSocketName, () => {
                });

                // Override built-in API here, before yielding control to user program
                // - apart from the oneos/fs, oneos/net modules, we override the built-ins
                //   here to replace the evaluation context of third-party modules
                // - This works because this file (Runtime.js) is loaded before any other
                //   third-party modules, and thus is the first one to load the built-ins

                // override JSON.stringify so that oneos-instrumented properties are not
                // included in the result string
                const nativeJsonStringify = JSON.stringify;
                JSON.stringify = function (obj) {
                    return nativeJsonStringify.call(this, obj, (k, v) => ((!k || k[0] !== PROPERTY_PREFIX) ? v : undefined));
                }

                // override fs functions
                fs.readFile = function readFile(path, arg2, arg3) {
                    let encoding = 'raw', callback;
                    if (typeof arg2 === 'string') {
                        encoding = arg2;
                        callback = arg3;
                    }
                    else {
                        callback = arg2;
                    }
                    Runtime.readFile(path, encoding).then(data => {
                        callback(null, data);
                    }).catch(err => callback(err));
                }

                fs.writeFile = function writeFile(path, content, arg3, arg4) {
                    let encoding = 'raw', callback;
                    if (typeof arg3 === 'string') {
                        encoding = arg3;
                        callback = arg4;
                    }
                    else {
                        callback = arg3;
                    }
                    Runtime.writeFile(path, content, encoding).then(data => {
                        callback(null, data);
                    }).catch(err => callback(err));
                }

                fs.appendFile = function appendFile(path, content, callback) {
                    Runtime.appendFile(path, content).then(data => {
                        callback(null, data);
                    }).catch(err => callback(err));
                }

                fs.createReadStream = function createReadStream(path) {
                    return Runtime.createReadStream(path);
                }

                fs.createWriteStream = function createWriteStream(path) {
                    return Runtime.createWriteStream(path);
                }

                fs.stat = function stat(path, callback) {
                    return Runtime.fsStat(path).then(data => {
                        callback(null, data);
                    }).catch(err => callback(err));
                }

                fs.readdir = function readdir(path, options, callback) {
                    return Runtime.readdir(path).then(data => {
                        if (options && options.withFileTypes) {
                            callback(null, data);
                        }
                        else {
                            callback(null, data.map(item => item.name));
                        }
                    }).catch(err => callback(err));
                }

                // override net.Server
                const originalListen = net.Server.prototype.listen;
                net.Server.prototype.listen = function (arg1, arg2, arg3, arg4) {
                    if (typeof arg1 === 'number') {
                        rpc.request('CreateServer', arg1)
                            .then(result => {
                                originalListen.call(this, arg1, arg2, arg3, arg4);
                            });
                    }
                    else {
                        originalListen.call(this, arg1, arg2, arg3, arg4);
                    }
                }

                // augment process object
                let jsonStream = null;
                // lazily instantiate jsonStream, because we don't need it unless the user explicitly wants it
                Object.defineProperty(process.stdin, 'json', {
                    get: function () {
                        if (!jsonStream) {
                            jsonStream = new JsonStream(process.stdin);
                        }
                        else if (!jsonStream.input) {
                            jsonStream.setInputStream(process.stdin);
                        }
                        return jsonStream;
                    }
                });
                Object.defineProperty(process.stdout, 'json', {
                    get: function () {
                        if (!jsonStream) {
                            jsonStream = new JsonStream(null, process.stdout);
                        }
                        else if (!jsonStream.output) {
                            jsonStream.setOutputStream(process.stdout);
                        }
                        return jsonStream;
                    }
                });

                let messageStream = null;
                // lazily instantiate messageStream, in case we want to read segmented input (e.g., video)
                Object.defineProperty(process.stdin, 'segment', {
                    get: function () {
                        if (!messageStream) {
                            messageStream = new MessageStream(process.stdin);
                        }
                        else if (!messageStream.input) {
                            messageStream.setInputStream(process.stdin);
                        }
                        return messageStream;
                    }
                });
                Object.defineProperty(process.stdout, 'segment', {
                    get: function () {
                        if (!messageStream) {
                            messageStream = new MessageStream(null, process.stdout);
                        }
                        else if (!messageStream.output) {
                            messageStream.setOutputStream(process.stdout);
                        }
                        return messageStream;
                    }
                });

                process.uri = root.meta.uri;
                process.cwd = () => root.meta.cwd;  // this needs to be overwritten so that API such as path.resolve works as expected

                // replace localhost environment with oneos environment
                const oneosEnv = {};
                Object.keys(process.env).forEach(key => {
                    if (key.indexOf('ONEOS_') === 0) {
                        oneosEnv[key.slice(6)] = process.env[key];
                    }
                });
                process.env = oneosEnv;

                // attach oneos-specific API to the process object
                process.runtime = {
                    events: runtimeEventEmitter,
                    listAllAgents: Runtime.listAllAgents,
                    listAllPipes: Runtime.listAllPipes,
                    listAllRuntimes: Runtime.listAllRuntimes,
                    listAllSockets: Runtime.listAllSockets,
                    listAllIO: Runtime.listAllIO
                }
            });

            return connected;
        }
        else throw new Error('Runtime.connect was called more than once');
    },
    /* fs module */
    readFileSync: (path, opts) => {
        // TODO: support this function
        return fs.readFileSync(path, opts);
    },
    writeFileSync: (path, content, opts) => {
        // TODO: support this function
        return fs.writeFileSync(path, content, opts);
    },
    readFile: async (path, encoding) => {
        await connected;
        let result;
        if (encoding === 'raw') {
            result = await rpc.request('ReadFile', path);
            result = Buffer.from(result, 'base64');
        }
        else {
            result = await rpc.request('ReadTextFile', path);
        }
        return result;
    },
    writeFile: async (path, content, encoding) => {
        await connected;
        let result;
        if (encoding === 'raw') {
            result = await rpc.request('WriteFile', path, content.toString('base64'));
        }
        else {
            result = await rpc.request('WriteTextFile', path, String(content));
        }
        return result;
    },
    appendFile: async (path, content) => {
        await connected;
        let result = await rpc.request('AppendTextFile', path, String(content));
        return result;
    },
    createReadStream: (path) => {
        let stream = new DirectPipe('fs', 'read');

        (async () => {
            await connected;
            let result = await rpc.request('CreateReadStream', path);
            stream.connect(result);
        })();

        // add metadata for migration
        stream[PROPERTY_PREFIX + 'data'] = () => ({
            init: 'require("fs").restoreReadStream',
            path: path,
            bytesRead: stream.bytesRead
        });

        return stream;
    },
    createWriteStream: (path) => {
        let stream = new DirectPipe('fs', 'write');

        (async () => {
            await connected;
            let result = await rpc.request('CreateWriteStream', path);
            stream.connect(result);
        })();

        return stream;
    },
    fsStat: async (path) => {
        await connected;

        let result = await rpc.request('GetFileStatus', path);

        // need to implement at least the following for fs.stat
        // (see serve-static module) https://github.com/expressjs/serve-static/blob/master/index.js
        if (result.error) {
            let error = new Error(path + ' does not exist');
            error.code = result.error;
            throw error;
        }
        else {
            if (result.type == 'directory') {
                return {
                    isDirectory: () => true,
                    isFile: () => false
                };
            }
            else {
                // our fake fs.Stats object must have mtime, ctime, ino, and size
                // (see etag module) https://github.com/jshttp/etag/blob/master/index.js
                return {
                    isDirectory: () => false,
                    isFile: () => true,
                    size: result.size,
                    mtime: new Date(),
                    ctime: new Date(),
                    ino: Math.random() // Inode doesn't exist in OneOS
                };
            }
        }
    },
    readdir: async (path) => {
        await connected;
        let result = await rpc.request('ReadDirectory', path);
        result = Object.entries(result).map(entry => ({
            name: entry[0],
            isFile: () => entry[1] === 'file',
            isDirectory: () => entry[1] === 'directory',
            isSocket: () => entry[1] === 'socket'
        }));

        return result;
    },
    // the following are oneos/fs specific API used during migration
    restoreReadStream: (path, bytesRead) => {
        let stream = new DirectPipe('fs', 'read');
        stream.bytesRead = bytesRead;

        (async () => {
            await connected;
            let result = await rpc.request('RestoreReadStream', path, bytesRead);
            stream.connect(result);
        })();

        // add metadata for migration
        stream[PROPERTY_PREFIX + 'data'] = () => ({
            init: 'require("fs").restoreReadStream',
            path: path,
            bytesRead: stream.bytesRead
        });

        return stream;
    },
    /* net module */
    createServer: (options, connectionListener) => net.createServer(options, connectionListener),
    /* io module */
    createVideoInputStream: (path) => {
        let stream = new DirectPipe('io', 'read', 'mjpeg');

        (async () => {
            await connected;
            let result = await rpc.request('CreateVideoInputStream', path);
            stream.connect(result);
        })();

        return stream;
    },
    createKafkaInputStream: (kafkaServer, topic, options) => {
        let dataFormat = options && options.format ? options.format : 'raw';
        let batchSize = options && options.batchSize ? options.batchSize : 10000;
        let stream = new DirectPipe('io', 'read', dataFormat);

        (async () => {
            await connected;
            let result = await rpc.request('CreateKafkaInputStream', kafkaServer, topic, batchSize);
            stream.connect(result);
        })();

        return stream;
    },
    rpcRequest: async (uri, method, ...args) => {
        let result = await rpc.request('RpcRequest', uri, method, ...args);
        return result;
    },
    createAgentTunnel: (sessionKey, agentUri, gatewayAddress) => new AgentTunnel(sessionKey, agentUri, gatewayAddress || process.env.HOST_ADDRESS), // HOST_ADDRESS is provided via UserShell
    createAgentMonitorStream: (agentUri) => {
        let stream = new DirectPipe('monitor', 'read', 'segment');

        (async () => {
            await connected;
            try {
                let result = await rpc.request('CreateAgentMonitorStream', agentUri);
                stream.connect(result);
            }
            catch (err) {
                stream.destroy(err);
            }
        })();

        return stream;
    },
    /* oneos-specific */
    listAllAgents: async () => {
        return await rpc.request('ListAllAgents');
    },
    listAllPipes: async () => {
        return await rpc.request('ListAllPipes');
    },
    listAllRuntimes: async () => {
        return await rpc.request('ListAllRuntimes');
    },
    listAllSockets: async () => {
        return await rpc.request('ListAllSockets');
    },
    listAllIO: async () => {
        return await rpc.request('ListAllIOHandles');
    }
}

module.exports = Runtime;