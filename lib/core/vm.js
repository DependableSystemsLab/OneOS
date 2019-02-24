process.once('message', (message)=>{
  try {
    // console.log(message);
    // console.log(process.cwd());
    process.oneos = {
      agentID: message.agentID,
      pubsub_ipc: message.pubsub_ipc,
      pubsub_url: message.pubsub_url
    };
    
    (function(){
      let Module = require('module'), path = require('path');
      let m = new Module('', module.parent);
      m.filename = '';
      m.paths = Module._nodeModulePaths(path.dirname(''));
      m._compile(message.source, '');
      return m.exports;
    }());
    process.send({ status: 'Running' });

    // if (message.options){
    // }
  }
  catch (e){
    console.log(e, e.stack);
    process.send({ error: e.stack }, function(){
      process.exit(1);
    });
  }
});
