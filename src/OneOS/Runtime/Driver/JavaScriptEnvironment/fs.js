const Runtime = require('./Runtime.js');

function readFile(path, callback) {
    Runtime.readFile(path).then(data => {
        callback(null, data);
    }).catch(err => callback(err));
}

function writeFile(path, content, callback) {
    Runtime.writeFile(path, content).then(data => {
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