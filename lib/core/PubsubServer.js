const { EventEmitter } = require('events');
const mosca = require('mosca');
const chalk = require('chalk');

class PubsubServer extends EventEmitter {
  constructor (url, options){
    super();
    this.options = Object.assign({
      port: 1883
    }, options);
    // var self = this;
    this.mosca = new mosca.Server({ port: this.options.port });

    this.mosca.on('ready', ()=>{
      console.log('mosca Server Listening at '+this.mosca.opts.host+' on PORT '+this.mosca.opts.port);
      this.emit('ready');
    });

    this.mosca.on('clientConnected', function(client){
      console.log(chalk.cyan((new Date()).toLocaleString())+' '+chalk.blue('New client connected: ')+client.id);

    });
    this.mosca.on('published', function(packet, client){
      if (client){
        console.log(chalk.cyan((new Date()).toLocaleString())+' '+chalk.magenta('<'+packet.topic+'> ')+chalk.yellow('['+client.id+']: ') + packet.payload.toString().substr(0,140) );
      }
    });
  }

  kill () {
    return new Promise((resolve, reject)=>{
      this.mosca.close(resolve);
      this.emit('closed');
    });
  }

}

module.exports = PubsubServer;