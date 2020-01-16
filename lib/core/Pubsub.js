const fs = require('fs');
const { EventEmitter } = require('events');
const { Readable, Writable } = require('stream');
const crypto = require('crypto');
const mqtt = require('mqtt');
const ipc = require('node-ipc');
const uuid = require('uuid/v4');
const chalk = require('chalk');
const helpers = require('../helpers.js');

const SERIALIZERS = {
  'default': (d)=>((d instanceof Buffer) ? d : JSON.stringify(d)),
  'json': (d)=>JSON.stringify(d),
  'text': (d)=>String(d),
  'raw': (d)=>d
}
const DESERIALIZERS = {
  'default': (data)=>
  {
    try {
        return JSON.parse(String(data));
      }
      catch (e){
        console.log('Error deserializing data of type '+(typeof data)+', '+Object.getPrototypeOf(data).constructor.name);
        return data;
      }
  },
  'json': (d)=>JSON.parse(String(d)),
  'text': (d)=>String(d),
  'raw': (d)=>d
}

/*
 * A Readable Pub/Sub stream. Pubsub topic -> Process
 * A new message (a frame) published under `topic` triggers the 'data' event,
 * with the message passed as the event data.
 * @param {Pubsub} pubsub - the Pubsub object
 * @param {string} topic - the topic to read from
 */
class InputStream extends Readable {
  // constructor (pubsub, topic, deserializer=DESERIALIZERS['raw']) {
  constructor (pubsub, topic, content_type='raw') {
    super({ objectMode: true });
    this.pubsub = pubsub;
    this.topic = topic;

    this.content_type = content_type;

    this.stat = {
      bytes: 0,
      average_throughput: 0,
      average_fpms: 0
    }

    let tracker = new helpers.realTimeAverageTracker(5000);
    let btracker = new helpers.realTimeAverageTracker(5000);

    let handler = (message, rawData)=>{
      // console.log(message, typeof message, rawData);
      // console.log(chalk.yellow(this.pubsub.id)+chalk.green(' <'+topic+'> : ')+ ' got '+(typeof message)+' '+Object.getPrototypeOf(message).constructor.name);
      // console.log(String(message));
      
      // this.push(deserializer(rawData));
      this.push(message);
      
      tracker.observe((tDelta)=>(1 / tDelta));
      btracker.observe((tDelta)=>(rawData.length / tDelta));
      this.stat.average_fpms = tracker.average;
      this.stat.average_throughput = btracker.average;
      // console.log('    ... '+chalk.yellow(this.topic)+' -> ----- '+(1000*this.stat.average_fpms)+' frames per sec   ----- '+this.stat.average_throughput+' KB/s ');
    }
    
    // pubsub.subscribe(topic, handler);
    pubsub.subscribe(topic, handler, content_type)
      .then((ref)=>{
        this.destroy = ()=>pubsub.unsubscribe(topic, ref);
      })
    // this.destroy = ()=>pubsub.unsubscribe(topic, handler);
  }

  _read (size) {
    this.stat.bytes += size;
  }
}

/*
 * A Writable Pub/Sub stream. Process -> Pubsub topic
 * A call to `.write(data)` will write to the output stream identified by `topic`.
 * @param {Pubsub} pubsub - the Pubsub object
 * @param {string} topic - the topic to write to
 */
class OutputStream extends Writable{
  // constructor (pubsub, topic, serializer=DEFAULT_SERIALIZER) {
  constructor (pubsub, topic, content_type='raw') {
    super({ objectMode: true });
    this.pubsub = pubsub;
    this.topic = topic;

    // this.serializer = serializer;
    this.content_type = content_type;

    this.stat = {
      bytes: 0,
      average_throughput: 0,
      average_fpms: 0
    }

    this._tracker = new helpers.realTimeAverageTracker(5000);
    this._btracker = new helpers.realTimeAverageTracker(5000);
  }

  _write (chunk, encoding, callback){
    // console.log(chunk);
    // console.log(chalk.yellow(this.pubsub.id)+chalk.red(' OutputStream <'+this.topic+'> : '));
    // console.log(String(chunk));
    
    this.pubsub
      // .publish(this.topic, this.serializer(chunk))
      .publish(this.topic, chunk, this.content_type)
      .then(
        (result)=>{
          callback(null);
              this._tracker.observe((tDelta)=>(1 / tDelta));
              this._btracker.observe((tDelta)=>(chunk.length / tDelta));
              this.stat.bytes += chunk.length;
              this.stat.average_fpms = this._tracker.average;
              this.stat.average_throughput = this._btracker.average;
              // console.log('    ... -> '+chalk.yellow(this.topic)+' ----- '+(1000*this.stat.average_fpms)+' frames per sec   ----- '+this.stat.average_throughput+' KB/s ');
        },
        (error)=> callback(error)
      );
  }
}

class Pipe {
  constructor (pubsub, source_topic, sink_topic){
    this.id = uuid();
    this.pubsub = pubsub;
    this.source = new InputStream(pubsub, source_topic);
    this.sink = new OutputStream(pubsub, sink_topic);

    // this.bytes = 0;
    // this.latency = Infinity;
    this.started_at = Date.now();

    this.source.pipe(this.sink);
  }

  summary (){
    return {
      id: this.id,
      source: this.source.topic,
      sink: this.sink.topic,
      stat: {
        bytes: this.source.stat.bytes,
        throughput: this.sink.stat.average_throughput,
        fpms: this.sink.stat.average_fpms,
        // latency: this.latency,
        // status: 'Live',
        started_at: this.started_at
      }
    }
  }

  destroy (){
    this.source.unpipe(this.sink);
    this.source.destroy();
    return this.summary();
  }
}

class Actor {
  constructor (pubsub, inbox_topic, behaviours = {}){
    this.pubsub = pubsub;
    this.inbox_topic = inbox_topic;
    this.behaviours = behaviours;
    this._requests = {};

    this.pubsub.subscribe(this.inbox_topic, (message)=>{
      if (message.verb in this.behaviours){
        let response = null;
        if (message.reply_to && message.request_id){
          response = {
            okay: (result)=>{
              this.pubsub.publish(message.reply_to, {
                sender: this.inbox_topic,
                response_id: message.request_id,
                result: 'okay',
                payload: result
              });
              console.log('....replied to '+message.reply_to);
            },
            error: (error)=>{
              console.log(this.pubsub.id+' replying to '+message.sender);
              console.log(error);
              this.pubsub.publish(message.reply_to, {
                sender: this.inbox_topic,
                response_id: message.request_id,
                result: 'error',
                payload: error.stack
              });
            }
          }
        }

        try {
          this.behaviours[message.verb](message.payload, response);
        }
        catch (error){
          if (message.reply_to && message.request_id){
            console.log(this.pubsub.id+' replying to '+message.sender);
            console.log(error);
            this.pubsub.publish(message.reply_to, {
              sender: this.inbox_topic,
              response_id: message.request_id,
              result: 'error',
              payload: error.stack
            });
          }
        }
      }
      else if (message.response_id in this._requests){
            // console.log(message, this._requests);
        clearTimeout(this._requests[message.response_id].timeout);
        if (message.result === 'okay') this._requests[message.response_id].resolve(message.payload);
        else {
          // console.log(chalk.red('['+this.id+'] request error '), message.payload);
          this._requests[message.response_id].reject(new Error(message.payload));
        };
        delete this._requests[message.response_id];
      }
      else {
        // console.log(chalk.red(this.id)+' Got unexpected message', message);
        if (message.reply_to && message.request_id){
          this.pubsub.publish(message.reply_to, {
              sender: this.inbox_topic,
              response_id: message.request_id,
              result: 'error',
              payload: 'UnexpectedMessage'
            });
        }
      }
    });
  }

  request (target_topic, verb, payload){
    // var self = this;
    return new Promise((resolve, reject)=>{
      let request_id = crypto.randomBytes(16).toString('hex');
      this._requests[request_id] = {
        resolve: resolve,
        reject: reject,
        timeout: setTimeout(()=>{
          if (request_id in this._requests){
            reject(new Error(this.pubsub.id+': PubsubRequestTimeout to '+target_topic+' {'+verb+'}'));
            delete this._requests[request_id];
          }
        }, 10000)
      };

      console.log('requesting '+target_topic+' : '+verb);

      this.pubsub.publish(target_topic, {
        sender: this.inbox_topic,
        request_id: request_id,
        reply_to: this.inbox_topic,
        verb: verb,
        payload: payload
      });

    });
  }

  setBehaviour (verb, handler) {
    // handler should have signature: function(request, response)
    // and must return a Promise that resolves to the result to send back
    this.behaviours[verb] = handler;
  }

  unsetBehaviour (verb){
    (verb in this.behaviours && delete this.behaviours[verb]);
  }

  setBehaviours (behaviours) {
    this.behaviours = behaviours;
  }

}

class Pubsub extends EventEmitter {
  constructor (url, options){
    super();
    // let self = this;
    this.id = (options && options.id) ? options.id : uuid();
    this.url = url;
    this.options = Object.assign({
    }, options);

    // this._handlers = {};
    // this._requests = {};

    this.client = mqtt.connect(this.url);
    this.ready = new Promise((resolve, reject)=>{
      this.client.on('connect', (ack)=>{
        console.log(Date.now()+chalk.green(' Pubsub '+this.id)+' connected to '+this.url);
        resolve(this.client);
      });
      this.client.on('message', (topic, data, packet)=>{
        // let message = this.options.deserializer(data);
        // this.emit('msg:'+topic, message, data);
        this.emit('msg:'+topic, data);
      });
    });
    
    this.actor = this.getActor('input');
  }

  subscribe (topic, handler, content_type='default'){
    return this.ready.then((client)=>
      new Promise((resolve, reject)=>{
        // this.on('msg:'+topic, handler);
        let ref = (data)=>handler(DESERIALIZERS[content_type](data), data);
        this.on('msg:'+topic, ref);
        client.subscribe(topic, (err)=>{
          if (err) reject(err);
          // else resolve(topic);
          else resolve(ref);
        });
      }));
  }

  publish (topic, message, content_type='default'){
    return this.ready.then((client)=>
      new Promise((resolve, reject)=>{
        client.publish(topic, SERIALIZERS[content_type](message), (err)=>{
        // client.publish(topic, this.options.serializer(message), (err)=>{
          if (err) reject(err);
          else resolve();
        });
      }));
  }

  unsubscribe (topic, handler){
    this.off('msg:'+topic, handler);
  }

  /* In addition to conventional Publish/Subscribe, we also provide a Request/Response interface */
  request (target_id, verb, payload){
    // var self = this;
    return this.actor.request(target_id+':input', verb, payload);
  }

  setRequestHandler (verb, handler) {
    // handler should have signature function(request)
    // and must return a Promise that resolves to the result to send back
    this.actor.setBehaviour(verb, handler);
  }
  unsetRequestHandler (verb) {
    this.actor.unsetBehaviour(verb);
  }

  getInputStream (topic, content_type) {
    console.log(chalk.yellow('[Pubsub]')+' creating InputStream '+topic);
    // return new InputStream(this, topic, DESERIALIZERS[content_type]);
    return new InputStream(this, topic, content_type);
  }

  getOutputStream (topic, content_type) {
    console.log(chalk.yellow('[Pubsub]')+' creating OutputStream '+topic);
    // return new OutputStream(this, topic, SERIALIZERS[content_type]);
    return new OutputStream(this, topic, content_type);
  }

  getPipe (input_topic, output_topic){
    return new Pipe(this, input_topic, output_topic);
  }

  getActor (channel, behaviours) {
    console.log(chalk.yellow('[Pubsub]')+' creating Actor '+this.id+':'+channel);
    return new Actor(this, this.id+':'+channel, behaviours);
  }

  kill (){
    return new Promise((resolve, reject)=>{
      this.client.end(()=>{
        console.log(chalk.red('[Pubsub '+this.id+'] gracefully killed'));
        resolve();
      });
    });
  }
}

//set id of the ipc singleton
ipc.config.silent = true;
ipc.config.logDepth=5;
ipc.config.id = 'oneos-runtime';

class IPCParent extends EventEmitter {
  constructor (pubsub, id){
    super();
    this.id = id;
    this.pubsub = pubsub;

    this.handlers = {};

    ipc.serve(id+'.ipc.sock', ()=>{
      console.log("IPC Socket Created for "+id);
      ipc.server.on('subscribe', (data, socket)=>{
        console.log('IPC Child '+id+' wants to subscribe to '+data.topic);
        let handler = (message)=>{
          console.log(chalk.yellow('['+id+']')+' IPCParent -> IPCChild '+chalk.magenta(data.topic));
          ipc.server.emit(socket, 'message', {
            topic: data.topic,
            message: message.toString('base64')
          });
        };
        handler.id = uuid();
        // this.handlers[handler.id] = handler;
        this.pubsub.subscribe(data.topic, handler, 'raw')
          .then((ref)=>{
            this.handlers[handler.id] = ref;
          })
      });

      ipc.server.on('publish', (data, socket)=>{
        console.log(chalk.yellow('['+id+']')+' IPCChild -> IPCParent '+chalk.magenta(data.topic));
        // console.log('Client Requested to Publish '+Object.getPrototypeOf(data).constructor.name);
        // console.log(data);
        // if (data.message.type && data.message.type === 'Buffer') data.message = Buffer.from(data.message);
        
        this.pubsub.publish(data.topic, Buffer.from(data.message, 'base64'));
      });

      ipc.server.on('unsubscribe', (data, socket)=>{
        this.pubsub.unsubscribe(data.topic, this.handlers[data.handler_id]);
      });

      ipc.server.on('socket.disconnected', (socket, destroyedID)=>{
        console.log('Connection dropped: '+destroyedID);
      });
    });
    
    console.log('Pubsub IPC Parent '+id+' with IPC ID '+ipc.config.id);
    ipc.server.start();
  }

  destroy() {
    fs.unlink(this.id+'.ipc.sock', (err)=>{
      if (err) console.log('Could not remove socket '+this.id+'.ipc.sock', err);
    });
  }
}

class IPCChild extends EventEmitter {
  constructor (id, url, options){
    super();
    console.log('Creating Pubsub IPC Child '+id);
    // let self = this;
    this.id = id;
    this.url = url;
    this.options = Object.assign({
      // serializer: DEFAULT_SERIALIZER,
      // deserializer: DEFAULT_DESERIALIZER
    }, options);

    this.ready = new Promise((resolve, reject)=>{
      ipc.connectTo('oneos-runtime', id+'.ipc.sock', ()=>{
        ipc.of['oneos-runtime'].on('connect', ()=>{
          console.log(id+' Child Connected to IPC Server');
          resolve(ipc.of['oneos-runtime']);
        });
        ipc.of['oneos-runtime'].on('disconnect', ()=>{
          console.log(id+' Child Disconnected');
        });

        ipc.of['oneos-runtime'].on('message', (data)=>{
          // console.log(id+' Got Some Data for '+data.topic+' !');
          // console.log(String(data.message));
          this.emit('msg:'+data.topic, Buffer.from(data.message, 'base64'));
        });
      });
    });
    
  }

  subscribe (topic, handler, content_type='default'){
    return this.ready.then((parent)=>{
      // this.on('msg:'+topic, handler);
      let ref = (data)=>handler(DESERIALIZERS[content_type](data), data);
      this.on('msg:'+topic, ref);
      parent.emit('subscribe', {
        topic: topic,
      });
      // return topic;
      return ref;
    });
  }

  publish (topic, message, content_type='default'){
    return this.ready.then((parent)=>{
      parent.emit('publish', {
        topic: topic,
        // message: this.options.serializer(message)
        message: Buffer.from(SERIALIZERS[content_type](message)).toString('base64')
      });
    });
  }

  unsubscribe (topic, handler){
    this.off('msg:'+topic, handler);
  }

  getInputStream (topic, content_type) {
    console.log(chalk.yellow('[Pubsub]')+' creating InputStream '+topic);
    // return new InputStream(this, topic, DESERIALIZERS[content_type]);
    return new InputStream(this, topic, content_type);
  }

  getOutputStream (topic, content_type) {
    console.log(chalk.yellow('[Pubsub]')+' creating OutputStream '+topic);
    // return new OutputStream(this, topic, SERIALIZERS[content_type]);
    return new OutputStream(this, topic, content_type);
  }

  getActor (channel, behaviours) {
    console.log(chalk.yellow('[Pubsub]')+' creating Actor '+this.id+':'+channel);
    return new Actor(this, this.id+':'+channel, behaviours);
  }
}

Pubsub.IPCParent = IPCParent;
Pubsub.IPCChild = IPCChild;
Pubsub.InputStream = InputStream;
Pubsub.OutputStream = OutputStream;
Pubsub.Actor = Actor;

module.exports = Pubsub;