const Runtime = require('./Runtime.js');

function readFile(path, arg2, arg3) {
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

function writeFile(path, content, arg3, arg4) {
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

function appendFile(path, content, callback) {
    Runtime.appendFile(path, content).then(data => {
        callback(null, data);
    }).catch(err => callback(err));
}

function createReadStream(path) {
    return Runtime.createReadStream(path);
}

function createWriteStream(path) {
    return Runtime.createWriteStream(path);
}

function stat(path, callback) {
    return Runtime.fsStat(path).then(data => {
        callback(null, data);
    }).catch(err => callback(err));
}

function readdir(path, options, callback) {
    return Runtime.readdir(path).then(data => {
        if (options && options.withFileTypes) {
            callback(null, data);
        }
        else {
            callback(null, data.map(item => item.name));
        }
    }).catch(err => callback(err));
}

function restoreReadStream(path, bytesRead) {
    return Runtime.createReadStream(path, bytesRead);
}

module.exports = {
    readFileSync: Runtime.readFileSync,
    writeFileSync: Runtime.writeFileSync,
    readFile: readFile,
    writeFile: writeFile,
    appendFile: appendFile,
    createReadStream: createReadStream,
    createWriteStream: createWriteStream,
    stat: stat,
    readdir: readdir,
    restoreReadStream: restoreReadStream
}