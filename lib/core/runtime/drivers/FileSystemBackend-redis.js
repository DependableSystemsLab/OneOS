const uuid = require('uuid/v4');
const chalk = require('chalk');
const Store = require('../../Store.js');

const FILESYSTEM_KEY = 'oneos-fs-index';

class GFS {
  constructor(redisUrl) {
    this.url = redisUrl || 'redis://localhost';
    this.store = new Store(this.url);
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
    }).catch(function(err){
      // console.log(err);
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
    console.log(chalk.cyan('[Redis Backend]')+' readdir '+path);
    this.store.get(FILESYSTEM_KEY)
      .then((value)=>{
        console.log(chalk.cyan('[Redis Backend]')+' Returning value ');
        console.log(value);
        let result = Object.keys(value).map((key)=>{
          if (typeof value[key] === 'object') return { type: 'directory', name: key };
          else return { type: 'file', name: key };
        });
        callback(null, result);
      }, (error)=>{
        console.log(chalk.red('[Redis Backend]')+' ERROR Returning value ');
        console.log('Error from Redis');
        console.log(error);
        callback(error);
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
    this.store.get(FILESYSTEM_KEY)
      .then((value)=>{
        if (path in value) callback(new Error(path+' already exists'));
        else {
          let update = Object.assign({}, value);
          update[path] = {};
          return this.store.set(FILESYSTEM_KEY, update);
        }
      }).then((result)=>{
        callback(null);
      }).catch((error)=>{
        console.log(chalk.red('[Redis Backend]')+' ERROR Returning value ');
        callback(error);
      });
  }
}

module.exports = {
  connect: (redisUrl)=>new GFS(redisUrl)
};