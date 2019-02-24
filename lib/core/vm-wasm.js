process.once('message', function(message){
  try {
    message.source = Buffer.from(message.source.data);
    // console.log(message);
    let typedArray = new Uint8Array(message.source);
    const env = {
      __memory_base: 0,
      __table_base: 0,
      memory: new WebAssembly.Memory({
        initial: 256
      }),
      table: new WebAssembly.Table({
        initial: 256,
        element: 'anyfunc'
      }),
      // enlargeMemory: enlargeMemory,
      // getTotalMemory: getTotalMemory,
      // abortOnCannotGrowMemory: abortOnCannotGrowMemory,
      // abortStackOverflow: abortStackOverflow,
      // nullFunc_ii: nullFunc_ii,
      // nullFunc_iiii: nullFunc_iiii,
      // ___lock: ___lock,
      // ___unlock: ___unlock,
      // ___setErrNo: ___setErrNo,
      // ___syscall140: ___syscall140,
      // ___syscall146: ___syscall146,
      // ___syscall54: ___syscall54,
      // ___syscall6: ___syscall6,
      // _emscripten_memcpy_big: _emscripten_memcpy_big,
      // DYNAMICTOP_PTR: staticAlloc(4)
    };
    // console.log(typedArray);
    WebAssembly.instantiate(typedArray, {
      env: env
    }).then(result => {
      // console.log(util.inspect(result, true, 0));
      console.log(result.instance.exports._hello(5, 3));
      process.exit();
      // console.log(result.instance.exports._doubler(9));
    }).catch(e => {
      // error caught
      console.log(e);
      process.send({ error: e.stack }, function(){
        process.exit(1);
      });
    });

    if (message.options){
    }
  }
  catch (e){
    process.send({ error: e.stack }, function(){
      process.exit(1);
    });
  }
});
