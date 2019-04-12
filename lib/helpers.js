const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');
const util = require('util');
const child_process = require('child_process');
const chalk = require('chalk');
const { table, getBorderCharacters } = require('table');

const exec = util.promisify(child_process.exec);
const readFile = util.promisify(fs.readFile);

function requireFromString(code, filename){
  // taken from https://github.com/floatdrop/require-from-string
  filename = filename || '';
  var Module = require('module');
  var m = new Module('', module.parent);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(path.dirname(filename));
  m._compile(code, filename);
  return m.exports;
};

function randKey(length, charset){
  var text = '';
  if (!length) length = 8;
  if (!charset) charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for( var i=0; i < length; i++ ){
    	text += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return text;
}

function randInt(min=0, max=100){
  return Math.floor(Math.random() * (max-min+1)) + min;
}

function hash(content, algo='sha256'){
  var h = crypto.createHash(algo);
  h.update(content);
  return h.digest('hex');
}

function hashJSON(obj, algo='md5'){
  return hash(Object.keys(obj).sort().map(function(key){
    if (typeof obj[key] === 'object') return key+':'+hashJSON(obj[key], algo);
    else return key+':'+obj[key];
  }).join(','), algo)
}

function defer(){
  var deferred = {
    promise: null,
    resolve: null,
    reject: null
  };
  deferred.promise = new Promise(function(resolve, reject){
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

function indent(len){
  return ' '.repeat(len);
}

function tabulate(array2d){
  return table(array2d, { drawHorizontalLine: ()=>false, border: getBorderCharacters('void') });
}

function formatTime(ms){
  var sec = ('0'+(Math.floor(ms/1000)%60)).slice(-2);
  var min = ('0'+(Math.floor(ms/60000)%60)).slice(-2);
  var hour = ('0'+(Math.floor(ms/3600000)%24)).slice(-2);
  return hour+':'+min+':'+sec;
}

function measureSync(func){
  var started = Date.now();
  var result = func();
  var elapsed = Date.now() - started;
  return {
    result: result,
    elapsed: elapsed
  }
};

function prettyPrint(obj, indent, key, suffix){
  indent = indent || 0;
  let prefix = key ? chalk.yellow(key) + ' : ' : '';
  suffix = suffix || '';
  if (obj instanceof Array) {
    console.log(' '.repeat(indent) + prefix + '[');
    obj.forEach((val, index)=>{
      prettyPrint(val, indent + 2, null,(index < obj.length-1 ? ',' : ''));
    });
    console.log(' '.repeat(indent) + ']' + suffix);
  }
  else if (typeof obj === 'object' && !(obj instanceof Array)){
    console.log(' '.repeat(indent) + prefix + '{');
    Object.keys(obj).forEach((key)=>{
      prettyPrint(obj[key], indent + 2, key);
    });
    console.log(' '.repeat(indent) + '}' + suffix);
  }
  else console.log(' '.repeat(indent) + prefix + chalk.magenta(obj) + suffix);
}

function getSystemInfo(){
  let info = {};

  info['hostname'] = os.hostname();
  info['arch'] = os.arch();
  info['platform'] = os.platform();
  info['os'] = os.type() + ' release ' + os.release();
  info['cpus'] = os.cpus().map(({ model, speed, times })=>({ model, speed }));
  info['cpu_average_speed'] = info['cpus'].reduce((acc, cpu)=>(acc+cpu.speed), 0) / info['cpus'].length;
  info['network'] = os.networkInterfaces();
  info['memory_total'] = os.totalmem();
	
  return info;
}

function isEquivalent(a, b){
  if (a === b) return true

  if (typeof a === typeof b){
    if (typeof a === 'object'){
      var aProps = Object.getOwnPropertyNames(a).sort();
      var bProps = Object.getOwnPropertyNames(b).sort();
      var eq = true;
      if (aProps.length === bProps.length){
        for (var i=0; i < aProps.length; i++){
          eq = eq && (aProps[i] === bProps[i]) && isEquivalent(a[aProps[i]], b[bProps[i]])
          if (!eq) break;
        }
        return eq;
      }
      else return false
    }
    else if (typeof a === 'function'){
      var aProps = Object.keys(a).sort();
      var bProps = Object.keys(b).sort();
      var eq = (a.toString() === b.toString());
      if (aProps.length === bProps.length){
        for (var i=0; i < aProps.length; i++){
          eq = eq && (aProps[i] === bProps[i]) && isEquivalent(a[aProps[i]], b[bProps[i]])
          if (!eq) break;
        }
        return eq;
      }
      else return false
    }
    else if (typeof a === 'number' || typeof a === 'string'){
      return (a === b)
    }
  }
  else return false
}

function deepCopy(obj){
  return JSON.parse(JSON.stringify(obj));
}

function getNestedProperty(obj, tokens){
  if (tokens.length > 0){
    if (obj) return getNestedProperty(obj[tokens[0]], tokens.slice(1));
  }
  else return obj;
}

function setNestedProperty(obj, tokens, value){
	if (tokens.length > 1){
		if (obj[tokens[0]]) return setNestedProperty(obj[tokens[0]], tokens.slice(1), value);
		throw new Error('Nested objects do not exist')
	}
	else obj[tokens[0]] = value;
}

function deleteNestedProperty(obj, tokens){
	if (tokens.length > 1){
		if (obj[tokens[0]]) return deleteNestedProperty(obj[tokens[0]], tokens.slice(1));
		throw new Error('Nested objects do not exist')
	}
	else delete obj[tokens[0]];
}

function repeatAsync(promiseFactory, count){
  return (count === 0 ? 
    Promise.resolve([]) 
    : promiseFactory()
      .then((result)=>
        repeatAsync(promiseFactory, count - 1)
          .then((rest)=>
            ([result].concat(rest)))
        ));
}

function resolveSequence(list = [], results = []){
  if (list.length === 0) return Promise.resolve(results);
  else return list[0]().then((result)=>resolveSequence(list.slice(1), results.concat([result])));
}

function exponentialMovingAverage(newVal, tDelta, prevAverage, tWindow){
  let alpha = 1 - Math.exp(-tDelta/tWindow);
  return alpha*newVal + (1 - alpha)*prevAverage;
}

function realTimeAverageTracker(tWindow){
  this.tWindow = tWindow;
  this.last_seen = Date.now();
  this.average = 0;
}
realTimeAverageTracker.prototype.observe = function(value){
  let tDelta = Date.now() - this.last_seen;
  if (tDelta > 0){
    if (typeof value === 'function') value = value(tDelta);
    this.average = exponentialMovingAverage(value, tDelta, this.average, this.tWindow);
    if (isNaN(this.average)) throw new Error('Weird');
    this.last_seen += tDelta;
  }
}

const CONFIDENCE_Z = {
  '80': 1.282,
  '85': 1.440,
  '90': 1.645,
  '95': 1.960,
  '99': 2.576,
  '99.5': 2.807,
  '99.9': 3.291
}

function getStatistics(vals, conf){
  conf = conf || '95';
  var min = Infinity, max = -Infinity;
  var mean = vals.reduce(function(acc, item){ 
    if (item < min) min = item;
    if (item > max) max = item;
    return item + acc
  }, 0) / vals.length;
  var stdev = Math.sqrt( vals.reduce(function(acc, item){ return acc + Math.pow(item - mean, 2) }, 0) / vals.length );
  var confidence = CONFIDENCE_Z[conf] * stdev / Math.sqrt(vals.length);
  return {
    min: min,
    max: max,
    mean: mean,
    stdev: stdev,
    confidence: confidence
  }
}

// function to install an NPM package in the runtime directory
function installPackage(package_name){
  // sanitize argument
  if (package_name[0] === '.'
    || package_name[0] === '_'
    || /[ <>\[\]\{\}\|\\\^\t\n\r\f\v\0%]/.test(package_name)){
    return Promise.reject(new Error('Illegal package name "'+package_name+'"; could not install via NPM'));
  }

  console.log(chalk.red('Installing Package ')+package_name);

  // let cwd = process.cwd();
  let homedir = os.homedir();
  let oneos_dir = path.join(homedir, '.oneos');
  return exec('npm install '+package_name+'; npm link oneos', { cwd: oneos_dir })
    .then((result)=> console.log(result.stdout +'\n'+ result.stderr))
    .then(()=> true);
}

function checkPackage(package_name){
  let homedir = os.homedir();
  let package_file = path.join(homedir, '.oneos/package.json');
  return readFile(package_file)
    .then((data)=> {
      let info = JSON.parse(data);
      return (info.dependencies && package_name in info.dependencies);
    })
}

function ensurePackages(package_list){
  console.log('Ensuring Packages '+package_list.join(', '));
  let homedir = os.homedir();
  let oneos_dir = path.join(homedir, '.oneos');
  let package_file = path.join(homedir, '.oneos/package.json');
  return readFile(package_file)
    .then((data)=> {
      let info = JSON.parse(data);
      let actions = package_list
        .filter((package_name)=> !(info.dependencies && package_name in info.dependencies))
        .map((package_name)=> ()=> installPackage(package_name));
      return resolveSequence(actions);
    })
}


const USER_INPUT_VALIDATORS = {
  'int': {
    check: (input)=>{
      let num = parseInt(input);
      return (typeof num === 'number' && num > 0);
    },
    cast: (input)=>parseInt(input),
    message: ()=> ' ! Enter a valid integer greater than 0'
  },
  'float': {
    check: (input)=>{
      let num = parseFloat(input);
      return (typeof num === 'number' && num > 0);
    },
    cast: (input)=>parseFloat(input),
    message: ()=> ' ! Enter a valid floating-point number greater than 0'
  },
  'percent': {
    check: (input)=>{
      let num = parseFloat(input);
      return (typeof num === 'number' && num >= 0.0 && num <=1.0);
    },
    cast: (input)=>parseFloat(input),
    message: ()=> ' ! Enter a valid floating-point number between than 0 and 1'
  },
  'yn': {
    check: (input)=>{
      let lc = input.toLowerCase();
      return (lc === 'y' || lc === 'n');
    },
    cast: (input)=>input.toLowerCase(),
    message: ()=> ' ! Enter either "y" or "n"'
  },
  'charset': {
    check: (input, charset, caseSensitive=false)=> {
      return (charset.toLowerCase().indexOf(input.toLowerCase()) >= 0);
    },
    cast: (input, charset, caseSensitive=false)=> (caseSensitive ? input : input.toLowerCase()),
    message: (input, charset, caseSensitive=false)=> (' ! Enter a valid character in ['+charset+']')
  },
  'range': {
    check: (input, min, max)=>{
      let num = parseInt(input);
      return (typeof num === 'number' && num >= min && num <= max);
    },
    cast: (input)=>parseInt(input),
    message: (input, min, max)=> (' ! Enter a valid number between '+min+' and '+max)
  }
};

class CLI {
  constructor (options={}){
    this._cli = readline.createInterface({
      input: options.input || process.stdin,
      output: options.input || process.stdout
    });
  }

  ask (question){
    return new Promise((resolve, reject)=>{
      this._cli.question(question, (answer)=>{
        resolve(answer);
      });
    });
  }

  askValidated(question, validator='int', ...validatorArgs){
    return new Promise((resolve, reject)=>{
      this._cli.question(question, (answer)=>{
        if (USER_INPUT_VALIDATORS[validator].check(answer, ...validatorArgs)){
          resolve(USER_INPUT_VALIDATORS[validator].cast(answer, ...validatorArgs));
        }
        else {
          console.log(USER_INPUT_VALIDATORS[validator].message(answer, ...validatorArgs));
          this.askValidated(question, validator, ...validatorArgs).then(resolve, reject);
        }
      });
    });
  }

  askConfirmed(question){
    return this.ask(question)
      .then((resp)=> 
        this.askValidated('You entered "'+resp+'". Is this correct? (y/n): ', 'yn')
          .then((yn)=> (yn === 'y' ? resp : this.askConfirmed(question)))
      )
  }

  close (){
    this._cli.close();
  }
}

module.exports = {
  requireFromString: requireFromString,
  randKey: randKey,
  randInt: randInt,
  hash: hash,
  hashJSON: hashJSON,
  defer: defer,
  indent: indent,
  tabulate: tabulate,
  formatTime: formatTime,
  isEquivalent: isEquivalent,
  deepCopy: deepCopy,
  measureSync: measureSync,
  prettyPrint: prettyPrint,
  getSystemInfo: getSystemInfo,
  getNestedProperty: getNestedProperty,
  setNestedProperty: setNestedProperty,
  deleteNestedProperty: deleteNestedProperty,
  resolveSequence: resolveSequence,
  repeatAsync: repeatAsync,
  exponentialMovingAverage: exponentialMovingAverage,
  realTimeAverageTracker: realTimeAverageTracker,
  getStatistics: getStatistics,
  installPackage: installPackage,
  checkPackage: checkPackage,
  ensurePackages: ensurePackages,
  CLI: CLI
};
