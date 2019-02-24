function setupTypescript() {
}
function tearDownTypescript() {
  compiler_input = null;
}
var parseErrors = [];
function runTypescript() {
  var compiler = createCompiler();
  compiler.addUnit(compiler_input, "compiler_input.ts");
  parseErrors = [];
  compiler.reTypeCheck();
  compiler.emit({
           createFile: function (fileName) { return outfile; },
           fileExists: function (path) { return false; },
           directoryExists: function (path) { return false; },
           resolvePath: function (path) { return path; }
  });
  
  if (parseErrors.length != 192 && parseErrors.length != 193) {
    throw new Error("Parse errors.");
  }
  compiler = null;
}
var outfile = {
  checksum: -412589664, 
  cumulative_checksum: 0,
  Write: function (s) { this.Verify(s); },
  WriteLine: function (s) { this.Verify(s + "\n"); },
  Close: function () {
    if (this.checksum != this.cumulative_checksum) {
      throw new Error("Wrong checksum.");
    }
    this.cumulative_checksum = 0;
  },
  Verify: function (s) {
    for(var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      this.cumulative_checksum = (this.cumulative_checksum << 1) ^ c;
    }
  }
};
var outerr = {
  checksum: 0,
  cumulative_checksum: 0,
  Write: function (s) { this.Verify(s); },
  WriteLine: function (s) { this.Verify(s + "\n"); },
  Close: function () {
    if (this.checksum != this.cumulative_checksum) {
      throw new Error("Wrong checksum.");
    }
    this.cumulative_checksum = 0;
  },
  Verify: function (s) {
    for(var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      this.cumulative_checksum = (this.cumulative_checksum << 1) ^ c;
    }
  }
};
function createCompiler() {
  var settings = new TypeScript.CompilationSettings();
  settings.codeGenTarget = TypeScript.CodeGenTarget.ES5;
  var compiler = new TypeScript.TypeScriptCompiler(
      outerr, new TypeScript.NullLogger, settings);
  compiler.setErrorCallback(function (start, len, message) { 
    parseErrors.push({ start: start, len: len, message: message }); 
  });
  compiler.parser.errorRecovery = true;
  compiler.typeCheck();
  return compiler
}

/* Required Benchmark */
var performance = {};
performance.now = function() {
  return Date.now();
};
var BM_RunFunc = runTypescript;
var BM_SetupFunc = setupTypescript;
var BM_TearDownFunc = tearDownTypescript;
var BM_Iterations = 5;
var BM_Min_Iterations = 16;
var BM_Results = [];
function BM_Start() {
    
    BM_SetupFunc();
    
        var data = { runs: 0, elapsed: 0 };
    
    var elapsed = 0;
    var start = Date.now();
    var end = null;
    var i = 0;
    function doRun(){
        console.log("Iteration : "+i);
        BM_RunFunc();
        elapsed = Date.now() - start;
        i ++;
        if (i < BM_Iterations){
            setImmediate(doRun);
        }
        else {
            if (data != null) {
                  data.runs += i;
                  data.elapsed += elapsed;
            }
            console.log("Runs: "+data.runs+"\t|\tElapsed: "+data.elapsed);
            end = Date.now();
            console.log("Total time : "+(end - start)+" ms");
            
            var usec = (data.elapsed * 1000) / data.runs;
            var rms = 0;
            BM_Results.push({ time: usec, latency: rms });
         }
    }
    setImmediate(doRun);
}
BM_Start();