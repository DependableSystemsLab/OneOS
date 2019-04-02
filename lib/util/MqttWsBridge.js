'use strict';

var EventEmitter = require('events').EventEmitter;
var ws = require('ws');
var mqtt = require('mqtt');
var helpers = require('../helpers.js');

var DEBUG_MODE = process.env.DEBUG || true;

var MQTT_DEFAULT = { url: 'mqtt://localhost' };
var WSS_DEFAULT = { host: '0.0.0.0', port: 8000 };

// const DEFAULT_SERIALIZER = (obj)=>(obj instanceof Buffer ? 
//   JSON.stringify({ type: 'Buffer', value: obj.toString('base64') }) : 
//   JSON.stringify({ type: 'JSON', value: obj }));

const DEFAULT_SERIALIZER = (obj)=>((obj instanceof Buffer) ? obj : JSON.stringify(obj));

const DEFAULT_DESERIALIZER = (data)=>
{
  // let message = JSON.parse(data);
  // return (message.type === 'Buffer' ? 
  //     Buffer.from(message.value, 'base64') :
  //     message.value
  //   )
  try {
      return JSON.parse(data);
    }
    catch (e){
    	// console.log(e);
    	// throw e;
      return data;
    }
}

const MQTT_TO_WS_TRANSFORM = (obj)=>((obj instanceof Buffer) ? { type: 'Buffer', data: obj.toString('base64') } : obj);

// const DEFAULT_SERIALIZER = (obj)=>((obj instanceof Buffer || typeof obj === 'string') ? obj : JSON.stringify(obj));
// const DEFAULT_DESERIALIZER = (data)=>{
// 	try {
//       return JSON.parse(data);
//     }
//     catch (e){
//       // console.log('Failed to JSON.parse MQTT message because data is a '+Object.getPrototypeOf(data).constructor.name);
//       // console.log(data.toString().substring(0,30));
//       return data.toString();
//     }
// }

/** This object acts as a bridge between a MQTT service and the browser,
 *    since browsers do not natively support MQTT protocol.
 *    It creates a WebSocket server that browsers connect to and relays messages between the two.
 *    The browser should connect to this object as if it was the actual MQTT service.
 *    The browser should use the client-side MqttWsClient object to connect to it.
 */
function MqttWsBridge(mqtt_url, wss_config, options){
	if (!(this instanceof MqttWsBridge)) return new MqttWsBridge(mqtt_url, wss_config);
	EventEmitter.call(this);
	var self = this;
	this.mqtt_config = { url: mqtt_url || MQTT_DEFAULT.url };
	this.wss_config = Object.assign({}, wss_config || WSS_DEFAULT);
	this.options = Object.assign({
		restricted_topics: []
	}, options);

	this.mqtt = undefined;
	this.wss = undefined;
	
	this.clients = {};
	this.subscribers = {};

	this.init();
}
MqttWsBridge.prototype = new EventEmitter();
MqttWsBridge.prototype.init = function(){
	var self = this;
	
	/* Connect to MQTT */
	self.mqtt = mqtt.connect(self.mqtt_config.url);
	self.mqtt.on('connect', function(){
		console.log('[ALERT] MQTT Connected to '+self.mqtt_config.url);
		self.emit('mqtt-ready');
	});
	self.mqtt.on('reconnect', function(){
		console.log('[MQTT] reconnecting');
	});
	self.mqtt.on('close', function(){
		console.log('[MQTT] client closed');
	});
	self.mqtt.on('end', function(){
		console.log('[MQTT] client ended');
	});
	self.mqtt.on('message', function(topic, data){
		// var data;
		// try {
		// 	data = JSON.parse(message.toString());
		// 	(DEBUG_MODE ? console.log('['+topic+'] : '+JSON.stringify(data)) : undefined);
		// }
		// catch (err){
			// console.log('[WARNING] Failed to JSON parse ['+topic+'] message, returning base64');
			// data = message.toString('base64');
			// (DEBUG_MODE ? console.log('['+topic+'] : Buffer ('+message.length+')') : undefined);
		// }
		
		// var message = DEFAULT_SERIALIZER( DEFAULT_DESERIALIZER(data) );
		// var message = data;
		console.log(typeof data+' '+Object.getPrototypeOf(data).constructor.name);
		console.log(String(data));

		// let message = DEFAULT_DESERIALIZER(data);

		// let message = JSON.parse(data);
		// message = (message.type === 'Buffer' ? 
	 //      Buffer.from(message.value, 'base64') :
	 //      message.value
	 //    )

		if (self.subscribers[topic]){
			for (var cli_uid in self.subscribers[topic]){
				if (self.subscribers[topic][cli_uid].readyState === ws.OPEN){
					self.subscribers[topic][cli_uid].send(JSON.stringify({
						topic: topic,
						// message: data
						// message: MQTT_TO_WS_TRANSFORM(message)
						message: data.toString('base64')
					}));
				}
			}
		}
		
	});
	var mqttSubscribe = function(topic){
		if (!(topic in self.subscribers)){
			self.subscribers[topic] = {};
			self.mqtt.subscribe(topic);
			console.log("[MQTT] New topic subscription : "+topic);
		}
	}
	var mqttUnsubscribe = function(topic){
		if (Object.keys(self.subscribers[topic]).length === 0){
			delete self.subscribers[topic];
			self.mqtt.unsubscribe(topic);
			console.log("[MQTT] No more subscribers for : "+topic);
		}
	}
	var mqttPublish = function(topic, data){
		console.log('[Publish] '+topic+' '+data);
		// self.mqtt.publish(topic, DEFAULT_SERIALIZER(data));
		self.mqtt.publish(topic, Buffer.from(data, 'base64'));
	}
	
	/* Start WebSocket server */
	self.wss = new ws.Server(self.wss_config);
	self.wss.on('listening', function(){
		console.log('[Bridge:wss] WebSocket Server listening on port '+self.wss.address().port);
		self.emit('wss-ready');
	})
	self.wss.on('connection', function(client, req){
		client.uid = helpers.randKey();
		var cli_data = {
			ws: client,
			ip: req.connection.remoteAddress,
			subscriptions: []
		};
		self.clients[client.uid] = cli_data;
		console.log("WebSocket client ["+client.uid+"] connected from "+cli_data.ip);
		self.emit('connection', cli_data);
		
		var handlers = {
			subscribe: function(data){
				if (self.options.restricted_topics.indexOf(data.topic) < 0 &&
						cli_data.subscriptions.indexOf(data.topic) < 0){
					mqttSubscribe(data.topic);
					cli_data.subscriptions.push(data.topic);
					self.subscribers[data.topic][client.uid] = client;
				}
			},
			unsubscribe: function(data){
				var tindex = cli_data.subscriptions.indexOf(data.topic);
				if (tindex > -1){
					delete self.subscribers[data.topic][client.uid];
					cli_data.subscriptions.splice(tindex, 1);
					mqttUnsubscribe(data.topic);
				}
			},
			publish: function(data){
				mqttPublish(data.topic, data.message);
			}
		}
		
		client.on('message', function(message){
			try {
				var data = JSON.parse(message);	
			}
			catch (error){
				console.log('[WARNING] WebSocket received string message instead of JSON : '+message);
				var data = message;
			}
			(DEBUG_MODE ? console.log('[ws:'+client.uid+'] : '+JSON.stringify(data)) : undefined);
			if (data.action in handlers){
				handlers[data.action](data);
			}
			else {
				client.send(JSON.stringify({ error: 'UnknownAction', message: 'Unrecognized action parameter.' }))
			}
		});

		client.on('error', function(err){
			console.log("MWB : [ERROR] for WebSocket client ["+client.uid+"]:");
			console.log(err);
		});
		
		client.on('close', function(){
			for (var i=0; i < cli_data.subscriptions.length; i ++){
				var topic = cli_data.subscriptions[i];
				delete self.subscribers[topic][client.uid];
				mqttUnsubscribe(topic);
			}
			delete self.clients[client.uid];
			console.log("WebSocket client ["+client.uid+"] disconnected");
		});
		
		client.send(JSON.stringify({ uid: client.uid }));
	})
	console.log('--- < mqtt-ws bridge started > ---');
	console.log('    mqtt service at : '+self.mqtt_config.url);
	console.log('    servicing WebSocket bridge at : ws://'+self.wss_config.host+':'+self.wss_config.port);
	console.log('----------------------------------');
}

module.exports = MqttWsBridge;