const fs = require('fs');
const path = require('path');
const url = require('url');
const { EventEmitter } = require('events');
const uuid = require('uuid/v4');
const express = require('express');
const chalk = require('chalk');
const Pubsub = require('./Pubsub.js');
const helpers = require('../helpers.js');

const FSSERVER_AGENT_ID = 'SA/file-system';

const FSSERVER_API_METHODS = {
  'readFile': (backend, payload, response)=>{
    // return new Promise((resolve, reject)=>{
      backend.readFile(payload.path, (err, data)=>{
        // if (err) reject(err);
        // else resolve(data);
        if (err) response.error(err);
        else response.okay(data);
      });
    // });
  },
  'writeFile': (backend, payload, response)=>{
    // return new Promise((resolve, reject)=>{
      backend.writeFile(payload.path, payload.data, (err)=>{
        // if (err) reject(err);
        // else resolve(null);
        if (err) response.error(err);
        else response.okay(null);
      });
    // });
  },
  'appendFile': (backend, payload, response)=>{
    // return new Promise((resolve, reject)=>{
      backend.appendFile(payload.path, payload.data, (err)=>{
        // if (err) reject(err);
        // else resolve(null);
        if (err) response.error(err);
        else response.okay(null);
      });
    // });
  },
  'readdir': (backend, payload, response)=>{
    // return new Promise((resolve, reject)=>{
      backend.readdir(payload.path, (err, data)=>{
        // console.log(err, data);
        // if (err) reject(err);
        // else resolve(data);
        if (err) response.error(err);
        else response.okay(data);
      });
    // });
  },
  'mkdir': (backend, payload, response)=>{
    // return new Promise((resolve, reject)=>{
      backend.mkdir(payload.path, (err, data)=>{
        // console.log(err, data);
        // if (err) reject(err);
        // else resolve(data);
        if (err) response.error(err);
        else response.okay(data);
      });
    // });
  }
};


const BACKENDS = ['redis', 'mongodb'];
function getBackend(backend_url){
  let backend = url.parse(backend_url);
  let type = backend.protocol.slice(0,-1);
  if (BACKENDS.indexOf(type) > -1){
    let connect = require('./runtime/drivers/FileSystemBackend-'+type+'.js').connect;
    console.log(chalk.yellow('[FSBroker] ')+' using backend '+type+' for the FileSystem');
    return connect(backend_url);
  }
  else throw new Error('Backend '+backend.protocol.slice(0,-1)+' is not supported');
}

// The File System Service Daemon is implemented as a "broker" rather than a "server"
// to introduce an additional level of indirection to enable "plugging in" the
// File System service backend
class FileSystemBroker extends EventEmitter {
  constructor (pubsub_url, backend_url){
    super();
    this.backend = getBackend(backend_url || process.oneos.store_url);
    this.pubsub = new Pubsub(pubsub_url || process.oneos.pubsub_url, {
      id: FSSERVER_AGENT_ID
    });

    Object.keys(FSSERVER_API_METHODS)
      .forEach((method)=>{
        this.pubsub.setRequestHandler(method, (payload, response)=>FSSERVER_API_METHODS[method](this.backend, payload, response));
      });
  }
}

class FileSystemClient {
  constructor (pubsub_url){
    this.pubsub = new Pubsub(pubsub_url || process.oneos.pubsub_url, {
      id: 'fs-client-'+helpers.randKey()
    });
  }

  readFile (path, arg1, arg2){
    var options, callback;
    if (typeof arg1 === 'function'){
      callback = arg1;
    }
    else if (typeof arg1 === 'object' && typeof arg2 === 'function'){
      options = arg1;
      callback = arg2;
    }
    else {
      throw 'readFile(path[,options], callback): You need to provide a callback function';
    }
    this.pubsub.request(FSSERVER_AGENT_ID, 'readFile', {
      path: path,
      options: options
    }).then((content)=>{
      callback(null, Buffer.from(content));
    }).catch((err)=>{
      // console.log('error reading file from '+path);
      console.log(err);
      callback(err);
    });
  }

  writeFile (path, data, arg1, arg2) {
  	var options, callback;
    if (typeof arg1 === 'function'){
      callback = arg1;
    }
    else if (typeof arg1 === 'object' && typeof arg2 === 'function'){
      options = arg1;
      callback = arg2;
    }
    else {
      throw 'writeFile(path, data[,options], callback): You need to provide a callback function';
    }

    this.pubsub.request(FSSERVER_AGENT_ID, 'writeFile', {
      path: path,
      data: data,
      options: options
    }).then(()=>{
      callback(null);
    }).catch((err)=>{
      // console.log('error reading file from '+path);
      console.log(err);
      callback(err);
    });
  }

  appendFile(path, data, arg1, arg2){
    var options, callback;
    if (typeof arg1 === 'function'){
      callback = arg1;
    }
    else if (typeof arg1 === 'object' && typeof arg2 === 'function'){
      options = arg1;
      callback = arg2;
    }
    else {
      throw 'appendFile(path, data[,options], callback): You need to provide a callback function';
    }

    this.pubsub.request(FSSERVER_AGENT_ID, 'appendFile', {
      path: path,
      data: data,
      options: options
    }).then(()=>{
      callback(null);
    }).catch((err)=>{
      // console.log('error reading file from '+path);
      console.log(err);
      callback(err);
    });
  }

  readdir (path, arg1, arg2){
    var options, callback;
    if (typeof arg1 === 'function'){
      callback = arg1;
    }
    else if (typeof arg1 === 'object' && typeof arg2 === 'function'){
      options = arg1;
      callback = arg2;
    }
    else {
      throw 'readdir(path[,options], callback): You need to provide a callback function';
    }

    // console.log(chalk.yellow('[FSClient] ')+'requesting broker for: readdir ');
    this.pubsub.request(FSSERVER_AGENT_ID, 'readdir', {
      path: path,
      options: options
    }).then((content)=>{
      // console.log(chalk.yellow('[FSClient] ')+'broker responded '+content, typeof content);
      // console.log(content);
      callback(null, content);
    }).catch(function(err){
      console.log(err);
      console.log(chalk.yellow('[FSClient] ')+'error making request to broker');
      callback(err);
    });
  }

  mkdir (path, arg1, arg2){
    var mode, callback;
    if (typeof arg1 === 'function'){
      callback = arg1;
    }
    else if (typeof arg1 === 'object' && typeof arg2 === 'function'){
      mode = arg1;
      callback = arg2;
    }
    else {
      throw 'mkdir(path[,mode], callback): You need to provide a callback function';
    }
    // console.log(chalk.yellow('[FSClient] ')+'requesting broker for: mkdir '+path);
    this.pubsub.request(FSSERVER_AGENT_ID, 'mkdir', {
      path: path,
      mode: mode
    }).then((content)=>{
      // console.log(chalk.yellow('[FSClient] ')+'broker responded '+content, typeof content);
      // console.log(content);
      callback(null, content);
    }).catch(function(err){
      // console.log(err);
      console.log(chalk.yellow('[FSClient] ')+'error making request to broker');
      callback(err);
    });
  }
}

const LANGUAGE_MAP = {
  '.js': 'javascript',
  '.py': 'python',
  '.wasm': 'wasm'
}

function createRouter(pubsub_url){
  var fs = new FileSystemClient(pubsub_url);

  /** FSRouter can be mounted in an express app, serving the filesystem's RESTful API at the mounted path */
  var FSRouter = express.Router();
  FSRouter.use(express.json());
  FSRouter.use(express.urlencoded({ extended: true }));
  // FSRouter.use(function(req, res, next){
  //  res.header("Access-Control-Allow-Origin", "*");
  //  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  //  next();
  // })

  FSRouter.route(':abs_path(*)')
    .get(function(req, res, next){
      console.log('[GFS] GET '+req.params.abs_path);
      fs.readdir(req.params.abs_path, (err, data)=>{
        if (err){
          console.log('[GFS] ERROR DURING GETTING ', err);
          if (err.message.indexOf('is a file') > 0){
            console.log('[GFS] Oops, this is a file! '+req.params.abs_path);
            fs.readFile(req.params.abs_path, (err2, data)=>{
              if (err2) res.status(500).json(err2);
              else {
                let ext = path.extname(req.params.abs_path);
                res.json({
                  type: 'file',
                  name: path.basename(req.params.abs_path),
                  content: data.toString(),
                  language: (ext in LANGUAGE_MAP ? LANGUAGE_MAP[ext] : 'unknown')
                })
              }
            });
          }
          else {
            res.status(500).json(err);
          }
        }
        else res.json({
          type: 'directory',
          name: path.basename(req.params.abs_path),
          content: data
        });
      });
    })
    .post(function(req, res, next){
      console.log('[GFS] POST '+req.params.abs_path);
      if (req.body.type === 'directory'){
        fs.mkdir(path.join(req.params.abs_path, req.body.name), (err)=>{
          if (err) res.status(500).json(err);
          else res.json({
            result: 'success'
          })
        });
      }
      else if (req.body.type === 'file'){
        fs.writeFile(path.join(req.params.abs_path, req.body.name), req.body.content, (err)=>{
          if (err) res.status(500).json(err);
          else res.json({
            result: 'success'
          })
        });
      }
    })
    .delete(function(req, res, next){
      console.log('[GFS] DELETE '+req.params.abs_path);
    });

    console.log(chalk.yellow('[FileSystem] ')+'Returning Router !');

  return FSRouter;
}

/** Return an express app serving the filesystem's RESTful API */
function createServer(port, db_url, onListening){
  var app = express();
  app.use('/', createRouter(db));
  app.listen(port, function(){
    console.log('GFS RESTful Server bound to port '+port);
    if (onListening) onListening();
  });
  return app;
}

module.exports = {
  // devland: {
  // 	createRouter: createRouter,
  // 	createServer: createServer
  // },
  // bootstrap: GFS.bootstrap,
  Broker: FileSystemBroker,
  Client: FileSystemClient,
  connect: function(pubsub_url){
    return new FileSystemClient(pubsub_url);
  },
  createRouter: createRouter,
  getBackend: getBackend
};