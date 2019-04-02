const { EventEmitter } = require('events');
const uuid = require('uuid/v4');

const SERIALIZERS = {
  'default': (d)=>((d instanceof Buffer) ? d : JSON.stringify(d)),
  // 'default': (d)=>((typeof d === 'object') ? JSON.stringify(d) : d),
  'json': (d)=>JSON.stringify(d),
  'text': (d)=>String(d),
  'buffer': (d)=>d
}
const DESERIALIZERS = {
  'default': (data)=>
  {
    try {
        return JSON.parse(String(data));
      }
      catch (e){
        // console.log('Error deserializing data of type '+(typeof data)+', '+Object.getPrototypeOf(data).constructor.name);
        return data;
      }
  },
  'json': (d)=>JSON.parse(String(d)),
  'text': (d)=>String(d),
  'buffer': (d)=>d
}

/* MqttWsClient */
export class MqttWsClient extends EventEmitter {
	constructor (wss_url, options){
		super();
		this.id = uuid();
		this.wss_url = wss_url;
		this.options = Object.assign({}, options);

		this.socket = null;

		this.subscriptions = {};

		this.ready = this.init();
	}

	init (){
		return new Promise((resolve, reject)=>{
			/* Initialize Websocket */
			this.socket = new WebSocket(this.wss_url);
			
			this.socket.onopen = ()=>{
				console.log("WebSocket to "+this.wss_url+" opened");
				this.emit('connect');
				resolve(this.socket);
				for (let topic in this.subscriptions){
					this.socket.send(JSON.stringify({ action: 'subscribe', topic: topic }));
					console.log("Subscribed to "+topic+" at "+this.wss_url);
				}
			}
			this.socket.onclose = ()=>{
				console.log("WebSocket to "+this.wss_url+" closed");
				reject(new Error('WebSocket connection closed!'));
				// if (!this.noRetryOnClose){
					setTimeout(()=>{
						this.ready = this.init();
					}, 5000);
				// }
			};
			this.socket.onerror = ()=>{
				console.log("ERROR on WebSocket to "+this.wss_url+", retrying in 5 seconds");
		//		setTimeout(function(){
		//			self.start();
		//		}, 5000);
			};
			this.socket.onmessage = (event)=>{
				var data = JSON.parse(event.data);
        // console.log(data);
				// console.log('  -> '+data.topic, data.message);
				if (data.topic in this.subscriptions){
					this.emit('msg:'+data.topic, Buffer.from(data.message, 'base64'));
					// Object.values(this.subscriptions[data.topic].handlers)
					// 	.forEach((handler)=>{
					// 		handler(data.topic, data.message);
					// 	});
					// self.subscriptions[data.topic].handler(data.topic, data.message);
					// self.subscriptions[data.topic].messages.push(data.message);
					// if (self.subscriptions[data.topic].messages.length > 200) self.subscriptions[data.topic].messages.shift();
				}
			};

		});
	}

	// potentially many objects will share this single instance to subscribe to the pubsub server,
	// so we must handle first time subscription
	subscribe (topic, handler, content_type='default'){
		return this.ready.then((socket)=>{
			if (!(topic in this.subscriptions)){
				this.subscriptions[topic] = {
					// handlers: {},
					messages: []
				}

				if (this.socket.readyState === WebSocket.OPEN){
					this.socket.send(JSON.stringify({ 
            action: 'subscribe', 
            topic: topic
            // content_type: content_type
          }));
					// console.log("Subscribed to "+topic+" - handler "+handler_id);
				}
				else {
					console.log("WebSocket is closed, cannot subscribe to ["+topic+"]");
				}
			}

      let ref = (data)=>handler(DESERIALIZERS[content_type](data));
			// this.on('msg:'+topic, handler);
      this.on('msg:'+topic, ref);
      return ref;
		});
	}

	publish (topic, message, content_type='default'){
	    return this.ready.then((socket)=>{
	    	if (socket.readyState === WebSocket.OPEN){
  				// socket.send(JSON.stringify({ action: 'publish', topic: topic, message: message }));
          socket.send(JSON.stringify({ 
            action: 'publish', 
            topic: topic,
            // content_type: content_type,
            message: btoa(SERIALIZERS[content_type](message))
          }));
  				console.log("Published "+topic, message)
  				return true;
  			}
  			else return Promise.reject(new Error('WebSocket not open, cannot publish to '+topic));
	    });
	  }

	  unsubscribe (topic, handler){
	    this.removeListener('msg:'+topic, handler);
	  }

	getActor (topic) {
	    // console.log(chalk.yellow('[Pubsub]')+' creating Actor '+topic);
	    return new Actor(this, topic);
	}
}

class Actor {
  constructor (pubsub, inbox_topic, behaviours = {}){
  	console.log('[Actor '+inbox_topic+'] Initializing ...');
    this.pubsub = pubsub;
    this.inbox_topic = inbox_topic;
    this.behaviours = behaviours;
    this._requests = {};

    this.pubsub.subscribe(this.inbox_topic, (message)=>{
    	console.log('[Actor '+this.inbox_topic+'] Got Message', message);
      if (message.verb in this.behaviours){
        this.behaviours[message.verb](message.payload)
          .then((result)=>{
            // console.log(chalk.yellow('Actor '+this.pubsub.id+':'+inbox_topic)+' did "'+message.verb+'" and got', result);
            if (message.reply_to && message.request_id){
              this.pubsub.publish(message.reply_to, {
                sender: this.inbox_topic,
                response_id: message.request_id,
                result: 'okay',
                payload: result
              });
              console.log('....replied to '+message.reply_to);
            }
          })
          .catch((error)=>{
            if (message.reply_to && message.request_id){
              console.log(this.pubsub.id+' replying to '+message.sender);
              console.log(error);
              this.pubsub.publish(message.reply_to, {
                sender: this.inbox_topic,
                response_id: message.request_id,
                result: 'error',
                payload: error.message
              });
            }
          });
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
    }).then(()=>console.log('[Actor '+this.inbox_topic+'] Subscribed to '+this.inbox_topic));
    console.log('[Actor '+this.inbox_topic+'] Initialized');
  }

  request (target_topic, verb, payload){
    // var self = this;
    return new Promise((resolve, reject)=>{
      let request_id = uuid();
      this._requests[request_id] = {
        resolve: resolve,
        reject: reject,
        timeout: setTimeout(()=>{
          if (request_id in this._requests){
            reject(new Error('PubsubRequestTimeout'));
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
    // handler should have signature function(request)
    // and must return a Promise that resolves to the result to send back
    this.behaviours[verb] = handler;
  }

  setBehaviours (behaviours) {
    this.behaviours = behaviours;
  }

}

export function randKey(length, charset){
  var text = '';
  if (!length) length = 8;
  if (!charset) charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for( var i=0; i < length; i++ ){
    	text += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return text;
}

const Battery = navigator.battery || navigator.webkitBattery || navigator.mozBattery;

export class Sensors extends EventEmitter{
  constructor(){
    super();
    this.geolocation = { lat: null, long: null };
    this.orientation = { alpha: null, beta: null, gamma: null };
    this.acceleration = { x: null, y: null, z: null };
    this.accelerationWithGravity = { x: null, y: null, z: null };
    this.rotationRate = { alpha: null, beta: null, gamma: null };
    this.battery = { level: null, charging: null };

    // taken from www.webondevices.com/9-javascript/apis-accessing-device-sensors/
    if (navigator.geolocation){
      navigator.geolocation.getCurrentPosition((position)=>{
        // console.log('Position', position);
        this.geolocation.lat = position.coords.latitude;
        this.geolocation.long = position.coords.longitude;
        this.emit('update', this);
      });
    }
    if (window.DeviceOrientationEvent){
      window.addEventListener('deviceorientation', (eventData)=>{
        // console.log('Orientation', eventData);
        this.orientation.alpha = eventData.alpha || 0;
        this.orientation.beta = eventData.beta || 0;
        this.orientation.gamma = eventData.gamma || 0;
        this.emit('update', this);
      }, true);
    }
    if (window.DeviceMotionEvent){
      window.addEventListener('devicemotion', (eventData)=>{
        // console.log('Motion', eventData);
        this.acceleration.x = eventData.acceleration.x || 0;
        this.acceleration.y = eventData.acceleration.y || 0;
        this.acceleration.z = eventData.acceleration.z || 0;
        this.accelerationWithGravity.x = eventData.accelerationIncludingGravity.x || 0;
        this.accelerationWithGravity.y = eventData.accelerationIncludingGravity.y || 0;
        this.accelerationWithGravity.z = eventData.accelerationIncludingGravity.z || 0;
        // Object.assign(this.accelerationWithGravity, eventData.accelerationIncludingGravity);
        this.rotationRate.alpha = eventData.rotationRate.alpha || 0;
        this.rotationRate.beta = eventData.rotationRate.beta || 0;
        this.rotationRate.gamma = eventData.rotationRate.gamma || 0;
        // Object.assign(this.rotationRate, eventData.rotationRate);
        this.emit('update', this);
      }, true);
    }
    if (navigator.getBattery){
      navigator.getBattery().then((battery)=>{
        this.battery.charging = battery.charging;
        this.battery.level = battery.level;
        
        battery.addEventListener('chargingchange', ()=>{
          this.battery.charging = battery.charging;
          this.emit('update', this);
        });
      })
    }
  }
}
