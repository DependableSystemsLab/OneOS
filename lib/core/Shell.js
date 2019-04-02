const { EventEmitter } = require('events');
const path = require('path');
const repl = require('repl');
const chalk = require('chalk');
// const { table, getBorderCharacters } = require('table');
const Pubsub = require('./Pubsub.js');
const Interpreter = require('./Interpreter.js');
const getFSClient = require('./FileSystem.js').connect;
const helpers = require('../helpers.js');
// const Agent = require('./Agent.js');

// function tabulate(array2d){
//   return table(array2d, { drawHorizontalLine: ()=>false, border: getBorderCharacters('void') });
// }

const SHELLBROKER_AGENT_ID = 'SA/shell';

class ShellServer extends EventEmitter {
  constructor (pubsub_url){
    super();
    this.pubsub = new Pubsub(process.oneos.pubsub_url, {
      id: 'shell-session/1'
    });
    this.pubsub.ready.then(()=>{
      /* Start the REPL Server instance */
      let input = this.pubsub.getInputStream('shell-session/1/in');
      let output = this.pubsub.getOutputStream('shell-session/1/out');

      // let environ = {};
      // let state = {};
      let systemAPI = Object.assign({
        fs: getFSClient(this.pubsub.url),
        requestScheduler: this.requestScheduler.bind(this)
      }, process.api || null);
      let fs = systemAPI.fs;

      let interp = new Interpreter(systemAPI, {
        'send': (args, environ, api)=>this.pubsub.publish(args[0], args[1], 'buffer'),
        // 'pipe': (args, environ, api)=>{
        //   let pipe = this.pubsub.getPipe(args[0], args[1]);
        //   console.log(pipe.input.topic+' -> '+pipe.output.topic);
        // }
      });

      // environ.setPubsub

      // // For now, we'll just define some commands. Later we'll write it as an Agent if appropriate.
      // environ.def('exit', ()=>{
      //   return 'bye';
      // });

      let shell = repl.start({
        prompt: '',
        // terminal: true,
        input: input,
        output: output,
        eval: function evalFunc(cmd, context, filename, callback){
          console.log(typeof cmd, Object.getPrototypeOf(cmd), cmd);
          console.log(chalk.red('Evaluating ')+cmd);
          try {
            // cmd = '('+cmd+')'; // just wrapping the top-level call in brackets
            // let result = Interpreter.evaluate(Interpreter.compile(cmd), environ);
            interp.eval(cmd)
              .then((result)=>callback(null, result))
              .catch((error)=>{
                // console.log(chalk.red('ERROR thrown from Interpreter'));
                // console.log(error);
                callback(null, error.message+'\n'+error.stack);
              });
          }
          catch (e){
            // callback(e);
            // console.log(chalk.red('ERROR trying to evaluate'));
            // console.log(e);
            callback(null, e.message+'\n'+e.stack);
          }
					
        },
        writer: function(value){
          console.log(chalk.magenta('ShellMaster Evaluated: '));
          // console.log(typeof value, (value ? Object.getPrototypeOf(value) : value) );
          console.log(value);
          return value;
        },
        useColors: true,
        // replMode: repl.REPL_MODE_STRICT,
        // input: inputStream,
        // output: outputStream
      });
			
      // disconnect when Shell closes
      shell.on('exit', function(){
        console.log('closed session');
      });
    });
  }

  requestScheduler (action, payload){
    console.log(chalk.cyan('Shell Daemon ') + action, payload);
    return this.pubsub.request('SA/scheduler', action, payload);
  }
}

class ShellClient extends EventEmitter {
  constructor (pubsub_url){
    super();
    let self = this;
    let queue = [];
    this.pubsub = new Pubsub(pubsub_url, {
    	// serializer: (str)=>str,
    	// deserializer: (str)=>str
    });
    this.pubsub.ready
      .then(()=>{
        // negotiate session, get session channel id
        self.pubsub.subscribe('shell-session/1/out', (message)=>{
          // console.log(message.toString());
          var resolve = queue.shift();
          // console.log('Hey '+resolve);
          // (resolve && resolve(String(message)));
          (resolve && resolve(message));
        }, 'text');
        return 'shell-session/1';
      })
      .then((channel)=>{
        /* Start the REPL Server instance */
        // let environ = {};
        // let state = {};
        let shell = repl.start({
          prompt: '> ',
          terminal: true,
          eval: function evalFunc(cmd, context, filename, callback){
            // console.log('sending '+cmd, typeof cmd, Object.getPrototypeOf(cmd), cmd);
            // self.pubsub.request(channel, 'eval', cmd)
            // 	.then((response)=>{
            // 		callback(null, response);
            // 	})
            new Promise((resolve, reject)=>{
              queue.push(resolve);
              self.pubsub.publish(channel+'/in', Buffer.from(cmd));
              // .then(()=>callback(null));
            }).then((result)=>callback(null, result));
          },
          writer: function(value){
            // console.log(typeof value, Object.getPrototypeOf(value));
            // console.log(value);
            return value;
          },
          useColors: true,
          // replMode: repl.REPL_MODE_STRICT,
          // input: inputStream,
          // output: outputStream
        });
			
        // disconnect when Shell closes
        shell.on('exit', ()=>{
          console.log('closed session');
          this.pubsub.kill();
        });
      });
  }
}
ShellClient.create = ()=>(new ShellClient());

class ShellBroker extends EventEmitter {
  constructor(pubsub_url){
    super();
    this.pubsub = new Pubsub(pubsub_url, {
      id: SHELLBROKER_AGENT_ID
    });

  }
}

module.exports = {
  Server: ShellServer,
  Client: ShellClient,
  Broker: ShellBroker
};
