const path = require('path');
const chalk = require('chalk');
const { table, getBorderCharacters } = require('table');
const helpers = require('../helpers.js');

function tabulate(array2d){
  return table(array2d, { drawHorizontalLine: ()=>false, border: getBorderCharacters('void') });
}

function Pipe(kind, source, target){
  this.kind = kind;
  this.source = source;
  this.target = target;
}
Pipe.prototype.toString = function(){
  if (this.kind == 'in')
    return String(this.source) + ' -> ' + String(this.target);
  else
    return String(this.target) + ' <- ' + String(this.source);
}
Pipe.prototype.toQuery = function(){
  return {
    kind: this.kind,
    source: this.source.toQuery(),
    target: this.target.toQuery()
  }
}

function Channel(agent, name){
  this.agent = agent;
  this.name = name;
}
Channel.prototype.toString = function(){
  return this.agent.name+':'+this.name;
}
Channel.prototype.toQuery = function(){
  return {
    topic: this.agent.name+':'+this.name,
    agent: this.agent.name,
    name: this.name
  }
}
// Channel.prototype.pipe = function(channel){
//   let fi = this.agent.pipes.findIndex((pipe)=>(pipe.source === this && pipe.target === channel));
//   if (fi < 0){
//     console.log('Pipe Not Found, Creating One');
//     let pipe = new Pipe(this, channel);
//     this.agent.pipes.push(pipe);
//     channel.agent.pipes.push(pipe);
//     return pipe;
//   }
//   else {
//     console.log('Pipe Already Exists');
//     return this.agent.pipes[fi];
//   }
// }

// this is a "static" representation of an Agent.
function Agent(name, source, criterion) {
  this.name = name;
  this.source = source;
  // this.criterion = criterion;
  this.channels = {};
  this.pipes = [];
}
Agent.prototype.channel = function(channel){
  if (!(channel in this.channels)) this.channels[channel] = new Channel(this, channel);
  return this.channels[channel];
}
Agent.prototype.toString = function(){
  return 'Agent '+this.name+' ('+this.pipes.length+')';
}
Agent.prototype.toQuery = function(){
  return {
    name: this.name,
    source_path: this.source,
    pipes: this.pipes.map((pipe)=>pipe.toQuery())
  }
}
Agent.prototype.addPipe = function(kind, source, target){
  let fi = this.pipes.findIndex(
      (pipe)=>(pipe.kind == kind 
            && pipe.source.name === source.name 
            && pipe.target.name === target.name));
  if (fi < 0){
    console.log('Pipe Not Found, Creating One');
    let pipe = new Pipe(kind, source, target);
    this.pipes.push(pipe);
    return pipe;
  }
  else {
    console.log('Pipe Already Exists');
    return this.pipes[fi];
  }
}

function FilePath(value){
  this.path = value;
}
FilePath.prototype.toString = function(){
  return '<FilePath '+this.path+'>';
}

function Deployment(agent, criterion){
  this.agent = agent;
  this.criterion = criterion;
}
Deployment.prototype.toString = function(){
  return this.agent.toString()+' @ '+String(this.criterion);
}

/* Parsing and Evaluation */
// Credit:
//   The following code is a modification of the code by Mihai Bazon at:
//   http://lisperator.net/pltut/
//   
function InputStream(input) {
  var pos = 0, line = 1, col = 0;
  return {
    next  : next,
    peek  : peek,
    eof   : eof,
    croak : croak,
  };
  function next() {
    var ch = input.charAt(pos++);
    if (ch === '\n') line++, col = 0; else col++;
    return ch;
  }
  function peek() {
    return input.charAt(pos);
  }
  function eof() {
    return peek() === '';
  }
  function croak(msg) {
    throw new Error(msg + ' (' + line + ':' + col + ')');
  }
}
// token types: punc, num, str, kw, var, op
function TokenStream(input) {
  var current = null;
  var keywords = ' true false let if else while func agent ';
  return {
    next  : next,
    peek  : peek,
    eof   : eof,
    croak : input.croak
  };
  function is_keyword(x) {
    return keywords.indexOf(' ' + x + ' ') >= 0;
  }
  function is_digit(ch) {
    return /[0-9]/i.test(ch);
  }
  function is_id_start(ch) {
    return /[\.\/_A-Za-z]/i.test(ch);
  }
  function is_id(ch) {
    return is_id_start(ch) || '0123456789-+'.indexOf(ch) >= 0;
  }
  function is_op_char(ch) {
    return '+-*/^%=&|<>!:@'.indexOf(ch) >= 0;
  }
  function is_punc(ch) {
    return ',;(){}[]'.indexOf(ch) >= 0;
  }
  function is_whitespace(ch) {
    return ' \t\n'.indexOf(ch) >= 0;
  }
  function read_while(predicate) {
    var str = '';
    while (!input.eof() && predicate(input.peek()))
      str += input.next();
    // console.log('Read ['+str+']');
    return str;
  }
  function read_number() {
    var has_dot = false;
    var number = read_while(function(ch){
      if (ch == '.') {
        if (has_dot) return false;
        has_dot = true;
        return true;
      }
      return is_digit(ch);
    });
    return { type: 'num', value: parseFloat(number) };
  }
  function read_ident() {
    var id = read_while(is_id);
    return {
      type  : is_keyword(id) ? 'kw' : 'var',
      value : id
    };
  }
  function read_escaped(end) {
    var escaped = false, str = '';
    input.next();
    while (!input.eof()) {
      var ch = input.next();
      if (escaped) {
        str += ch;
        escaped = false;
      } else if (ch == '\\') {
        escaped = true;
      } else if (ch == end) {
        break;
      } else {
        str += ch;
      }
    }
    return str;
  }
  function read_string() {
    var ch = input.peek();
    return { type: 'str', value: read_escaped(ch) };
  }

  function read_line() {
    return { type: 'str', value: read_while(ch=>(ch != '\n'))};
  }

  function skip_comment() {
    read_while(function(ch){ return ch != '\n'; });
    input.next();
  }

  function read_next() {
    read_while(is_whitespace);
    if (input.eof()) return null;
    var ch = input.peek();
    // console.log('char: '+ch);
    if (ch == '#') {
      skip_comment();
      return read_next();
    }

    if (ch == '"' || ch == "'") return read_string();
    if (is_digit(ch)) return read_number();
    if (is_id_start(ch)) return read_ident();
    // if (is_special_char(ch)) return read_special();
    
    if (is_punc(ch)) return {
      type  : 'punc',
      value : input.next()
    };
    if (is_op_char(ch)) return {
      type  : 'op',
      value : read_while(is_op_char)
    };

    input.croak('Can\'t handle character: ' + ch);
  }

  function peek() {
    return current || (current = read_next());
  }

  function next() {
    var tok = current;
    current = null;
    return tok || read_next();
  }

  function eof() {
    return peek() == null;
  }
}

var FALSE = { type: 'bool', value: false };

function parse(input) {
  var PRECEDENCE = {
    '=': 1,
    '||': 2,
    '&&': 3,
    '<': 7, '>': 7, '<=': 7, '>=': 7, '==': 7, '!=': 7,
    '+': 10, '-': 10,
    '*': 20, '/': 20, '%': 20,
    '->': 30, '<-': 30,
    ':': 50
  };
  // const PIPE_PRECEDENCE = {
  //   '->': 30,
  //   '|': 25
  // };

  const REDIRECTS = {
    '>': ['stdout', 'write'],
    '<': ['stdin', 'write'],
    '>>': ['stdout', 'append'],
    '<<': ['stdin', 'append']
  }

  return parse_toplevel();
  function is_punc(ch) {
    var tok = input.peek();
    return tok && tok.type == 'punc' && (!ch || tok.value == ch) && tok;
  }
  function is_kw(kw) {
    var tok = input.peek();
    return tok && tok.type == 'kw' && (!kw || tok.value == kw) && tok;
  }
  function is_var() {
    var tok = input.peek();
    return tok && tok.type == 'var' && tok;
  }
  function is_op(op) {
    var tok = input.peek();
    return tok && tok.type == 'op' && (!op || (op instanceof Array ? op.indexOf(tok.value)>-1 : tok.value == op)) && tok;
  }

  function skip_punc(ch) {
    // console.log(input.peek());
    if (is_punc(ch)) input.next();
    else input.croak('Expecting punctuation: "' + ch + '" but got "' + JSON.stringify(input.peek()) + '"');
  }
  function skip_kw(kw) {
    if (is_kw(kw)) input.next();
    else input.croak('Expecting keyword: "' + kw + '"');
  }
  function skip_op(op) {
    if (is_op(op)) input.next();
    else input.croak('Expecting operator: "' + op + '"');
  }
  function unexpected() {
    input.croak('Unexpected token: ' + JSON.stringify(input.peek()));
  }
  function maybe_binary(left, my_prec) {
    var tok = is_op();
    // console.log('Maybe Binary - left: ',left, my_prec, tok);
    if (tok) {
      var his_prec = PRECEDENCE[tok.value];
      if (his_prec > my_prec) {
        input.next();
        var right = maybe_binary(parse_atom(), his_prec);
        var binary = {
          type: tok.value == '=' ? 'assign':'binary',
          operator: tok.value,
          left: left,
          right: right
        };
        return maybe_binary(binary, my_prec);
      }
      // }
    }
    return left;
  }
  function delimited(start, stop, separator, parser) {
    var a = [], first = true;
    skip_punc(start);
    while (!input.eof()) {
      if (is_punc(stop)) break;
      if (first) first = false; else skip_punc(separator);
      if (is_punc(stop)) break;
      a.push(parser());
    }
    skip_punc(stop);
    return a;
  }
  function read_all(parser) { // jks
    var a = [];
    while (!input.eof()) {
      a.push(parser());
    }
    return a;
  }
  function parse_call(){
    // skip_punc('(');
    var func = input.next();
    var args = [];
    console.log(input.peek());
    while (!input.eof()) {
      if (is_op()) break;
      // args.push(input.next().value);
      args.push(parse_argument());
    }
    // skip_punc(')');
    return {
      type: 'CallExpression',
      func: func,
      args: args
    };
  }

  function parse_as_str() {
    var tok = input.next();
    return {
      type: 'str',
      value: String(tok.value)
    };
  }
  function parse_varname() {
    var name = input.next();
    if (name.type != 'var') input.croak('Expecting variable name');
    return name.value;
  }

  function parse_let() {
    skip_kw('let');
    var name = parse_varname();
    skip_op('=');
    return {
      type: 'VariableBinding',
      name: name,
      value: parse_expression()
    }
  }

  function parse_if() {
    skip_kw('if');
    var cond = parse_expression();
    if (!is_punc('{')) skip_kw('then');
    var then = parse_expression();
    var ret = {
      type: 'if',
      cond: cond,
      then: then,
    };
    if (is_kw('else')) {
      input.next();
      ret.else = parse_expression();
    }
    return ret;
  }

  function parse_lambda() {
    return {
      type: 'lambda',
      vars: delimited('(', ')', ',', parse_varname),
      body: parse_expression()
    };
  }
  function parse_bool() {
    return {
      type  : 'bool',
      value : input.next().value == 'true'
    };
  }

  function parse_agent() {
    skip_kw('agent');
    var name = parse_varname();
    skip_op('=');
    var source = input.next();
    return {
      type : 'AgentExpression',
      name: name,
      source: source.value
    };
  }

  function parse_placement(agent) {
    skip_op('@');
    return {
        type: "PlacementExpression",
        agent: agent,
        criterion: parse_expression()
    };
  }

  function parse_redirect(source) {
    var tok = input.peek();
    skip_op(tok.value);
    return {
      type: 'Redirect',
      source: source,
      target: parse_expression()
    }
  }

  // function maybe_channel(expr) {
  //   expr = expr();
  //   return is_op(':') ? parse_channel(expr) : expr;
  // }

  function maybe_placement(expr) {
    expr = expr();
    return is_op('@') ? parse_placement(expr) : expr;
  }

  // function maybe_pipe(expr) {
  //   expr = expr();
  //   return is_op('->') ? parse_pipe(expr) : expr;
  // }

  function maybe_redirect(expr) {
    expr = expr();
    return is_op(Object.keys(REDIRECTS)) ? parse_redirect(expr) : expr;
  }

  function maybe_call(expr) {
      expr = expr();
      // return parse_call(expr);
      // return is_var() ? parse_call(expr) : expr;
      return is_punc("(") ? parse_call(expr) : expr;
  }

  function maybe_quantifier(expr) {
    // console.log(expr);
    expr = expr();
    if (expr.type === 'num' && is_var()){
      return {
        type: 'Quantifier',
        quantity: expr.value,
        unit: parse_varname()
      };
    }
    return expr;
  }

  function parse_argument() {
    if (is_punc("(")) {
        input.next();
        var exp = parse_expression();
        skip_punc(")");
        return exp;
    }
    var tok = input.next();
    if (tok.type === 'num') return tok;
    if (tok.type === 'str' || tok.type === 'kw' || tok.type === 'var') return {
      type: 'str',
      value: tok.value
    }
    unexpected();
  }

  function parse_atom() {
    // return maybe_call(
    //   // ()=>maybe_quantifier(
    //     ()=>{
          if (is_punc("(")) {
              input.next();
              var exp = parse_expression();
              skip_punc(")");
              return exp;
          }
          // console.log('token: '+JSON.stringify(input.peek()));
          
          // if (is_punc("{")) return parse_prog();
          // if (is_kw('run')) return parse_run();
          if (is_kw('let')) return parse_let();
          if (is_kw('if')) return parse_if();
          if (is_kw('true') || is_kw('false')) return parse_bool();
          // if (is_kw('lambda') || is_kw('λ')) {
          //   input.next();
          //   return parse_lambda();
          // }
          // if (is_kw('agent')) return parse_agent();
          if (is_var()) return parse_call();

          var tok = input.next();
          if (tok.type == 'num' || tok.type == 'str') return tok;
          // if (tok.type == 'num')
          //   return maybe_quantifier(tok);
          //            if (tok.type == "str") return parse_paragraph();
          //            else if (tok.type == "var" || tok.type == "num") return tok;
          // if (tok.type == "str") return { type: "Text", value: tok.value };
          // if (tok.type == "var" || tok.type == "num" || tok.type == "str")
          // return tok;
          unexpected();
      // })
    // );
  }
  function parse_toplevel() {
    var prog = [];
    while (!input.eof()) {
      prog.push(parse_expression());
      if (!input.eof()) skip_punc(';');
      console.log('>>> Next ------------------------------');
      //            if (!input.eof()) skip_punc(";");
    }
    return { type: 'Program', body: prog, toplevel: true };
  }
  function parse_prog() {
    var prog = delimited('{', '}', '\n', parse_expression);
    if (prog.length == 0) return FALSE;
    if (prog.length == 1) return prog[0];
    return { type: 'Program', body: prog };
  }
  function parse_expression() {
    return maybe_binary(parse_atom(), 0);
  }
}

function Environment(parent, system_api) {
  this.vars = Object.create(parent ? parent.vars : null);
  this.parent = parent;

  this.api = parent ? parent.api : (system_api || null);
}
Environment.prototype = {
  extend: function() {
    return new Environment(this);
  },
  lookup: function(name) {
    var scope = this;
    while (scope) {
      if (Object.prototype.hasOwnProperty.call(scope.vars, name))
        return scope;
      scope = scope.parent;
    }
  },
  get: function(name) {
    if (name in this.vars){
      return Promise.resolve(this.vars[name]);
    }
    else return new Promise((resolve, reject)=>{
      this.get('cwd')
        .then((cwd)=>{
          let source_path = path.resolve(cwd, name);
          this.api.fs.readFile(source_path, (err, data)=>{
            console.log(err, String(data));
            if (err) reject(err);
            else resolve(new FilePath(source_path));
          })
        })
    });
    // throw new Error('Undefined variable ' + name);
  },
  set: function(name, value) {
    var scope = this.lookup(name);
    if (!scope && this.parent)
      throw new Error('Undefined variable ' + name);
    return Promise.resolve( (scope || this).vars[name] = value );
  },
  def: function(name, value) {
    return Promise.resolve( this.vars[name] = value );
  }
  // setPubsub: function(pubsub){
  //     Environment.prototype.pubsub = pubsub;
  // }
};

function evaluate(exp, env) {
  console.log(chalk.magenta('Evaluate: '));
  console.log(exp);
  switch (exp.type) {
  // case 'Text':
  // 	return ('<p>' + exp.value + '</p>');
  // case 'Heading':
  // 	return ('<h'+exp.level+'>' + exp.value + '</h'+exp.level+'>');
  // case 'VerticalSpace':
  // 	return ('<div style="height: ' + exp.value + 'em"></div>');
  // case 'UnorderedList':
  // 	return ('<li>' + exp.value + '</li>');
  case 'num':
  case 'str':
  case 'bool':
    return Promise.resolve(exp.value);

  case 'var':
    return env.get(exp.value);

  case 'Quantifier':
    return (exp.quantity * env.get(exp.unit));

  case 'VariableBinding':
    // if (exp.left.type != 'var')
      // throw new Error('Cannot bind to ' + JSON.stringify(exp.left));
    env.set(exp.name, evaluate(exp.value, env));
    return { type: 'Unit' }

  case 'Redirect':
    return {
      type: exp.type
    }

  case 'assign':
    if (exp.left.type != 'var')
      throw new Error('Cannot assign to ' + JSON.stringify(exp.left));
    return env.set(exp.left.value, evaluate(exp.right, env));

  case 'binary':
    return apply_op(exp.operator,
      evaluate(exp.left, env),
      evaluate(exp.right, env));

  case 'lambda':
    return make_lambda(env, exp);

  case 'if':
    var cond = evaluate(exp.cond, env);
    if (cond !== false) return evaluate(exp.then, env);
    return exp.else ? evaluate(exp.else, env) : false;

  case 'Program':
    return helpers.resolveSequence(exp.body.map((exp)=>()=>evaluate(exp, env)))
      .then((results)=>results[results.length-1]);

  case 'AgentExpression':
    var agent = new Agent(exp.name, path.resolve(env.get('cwd'), exp.source));
    env.set(exp.name, agent);
    return agent;
    // console.log(env.get('AgentProxy'));
    // var AgentProxy = env.get('AgentProxy');
    // if (!AgentProxy) throw new Error('Cannot find AgentProxy object');
    // return new AgentProxy(exp.value);

  case 'Channel':
    var agent = env.get(exp.agent.value);
    // var name = evaluate(exp.name, env);

    return agent.channel(exp.name);

  case 'PipeExpression':
    console.log('evaluating PipeExpression ');
    console.log(exp);

    let left = evaluate(exp.left, env);
    if (left instanceof Agent) left = left.channel((exp.kind == '->') ? 'stdout' : 'stdin');
    else if (!(left instanceof Channel)) throw new Error('Pipe Source should be a Channel, got '+JSON.stringify(left));
    
    let right = evaluate(exp.right, env);
    if (right instanceof Agent) right = right.channel((exp.kind == '->') ? 'stdin' : 'stdout');
    else if (!(right instanceof Channel)) throw new Error('Pipe Target should be a Channel, got '+JSON.stringify(right));

    let pipe;
    if (exp.kind == '->'){
      pipe = right.agent.addPipe('in', left, right);
      left.agent.addPipe('out', left, left);  // quick hack for debug

    }
    else {
      pipe = right.agent.addPipe('out', right, left);
      left.agent.addPipe('in', left, left);  // quick hack for debug
    }

    return pipe;

    // return function(){
    //   console.log('Connecting '+source+' -> '+target);
    // }

  case 'PlacementExpression':
    console.log(chalk.yellow('evaluating PlacementExpression'));
    console.log(exp, env);
    
    var agent = evaluate(exp.agent, env);
    if (!(agent instanceof Agent)) throw new Error('Left side of PlacementExpression should be an Agent');

    if (exp.criterion.type === 'op' && exp.criterion.value === '*'){
      var criterion = '*';
    }
    else {
      var criterion = evaluate(exp.criterion, env);  
    }
    var deploy = new Deployment(agent, criterion);

    return env.api.requestScheduler('deploy', {
      agent: deploy.agent,
      criterion: deploy.criterion
    });

  case 'CallExpression':
    // console.log('CallExpression', exp);
    return evaluate(exp.func, env)
      .then((func)=>{
        if (typeof func === 'function'){
          return Promise.all(exp.args.map((arg)=>evaluate(arg, env)))
            .then((args)=>func.apply(null, [args, env]));
        }
        else if (func instanceof FilePath){
          console.log('Args are: ', exp.args);
          var extname = path.extname(func.path);
          var language = (extname === '.py')? 'python3':'javascript';
          return Promise.all(exp.args.map((arg)=>evaluate(arg, env)))
            .then((args)=>env.api.requestScheduler('run', {
              name: path.basename(func.path),
              source_path: func.path,
              language: language,
              args: args,
              pipes: []
            }))
            .then((agent)=>agent.id);
        }
        else {
          console.log(func);
          return Promise.reject(new Error('Cannot call '+ (typeof func) + ' ' + Object.getPrototypeOf(func).constructor.name + ' ' + JSON.stringify(func)));
        }
      });

  default:
    throw new Error('I don\'t know how to evaluate ' + exp.type + ' ' + exp.value);
  }
}

function apply_op(op, a, b) {
  function num(x) {
    if (typeof x != 'number')
      throw new Error('Expected number but got ' + x);
    return x;
  }
  function div(x) {
    if (num(x) == 0)
      throw new Error('Divide by zero');
    return x;
  }
  switch (op) {
  case '+': return num(a) + num(b);
  case '-': return num(a) - num(b);
  case '*': return num(a) * num(b);
  case '/': return num(a) / div(b);
  case '%': return num(a) % div(b);
  case '&&': return a !== false && b;
  case '||': return a !== false ? a : b;
  case '<': return num(a) < num(b);
  case '>': return num(a) > num(b);
  case '<=': return num(a) <= num(b);
  case '>=': return num(a) >= num(b);
  case '==': return a === b;
  case '!=': return a !== b;
  }
  throw new Error('Can\'t apply operator ' + op);
}

function make_lambda(env, exp) {
  function lambda() {
    var names = exp.vars;
    var scope = env.extend();
    for (var i = 0; i < names.length; ++i)
      scope.def(names[i], i < arguments.length ? arguments[i] : false);
    return evaluate(exp.body, scope);
  }
  return lambda;
}

function make_agents(env, exp) {

}

function compile(str) {
  return parse(TokenStream(InputStream(str)));
}

function Interpreter(runtime_api, builtins){
  if (!(this instanceof Interpreter)) return new Interpreter(runtime_api, builtins);
  // this.api = runtime_api;
  this.environ = new Environment(null, runtime_api);
  this.builtins = Object.assign({}, Interpreter.BUILTINS, builtins);

  // add builtins to the environment
  Object.keys(this.builtins)
    .forEach((cmd)=>{
      this.environ.def(cmd, this.builtins[cmd]);
      // this.environ.def(cmd, (args, env)=>this.builtins[cmd](args, env, this.api));
    });

  // initialize some environment variables
  this.environ.def('cwd', '/');

  console.log('Successfully Created an Interpreter');
}

// * All functions should return a Promise
// * Some of the commands are "pseudo" implementations, and should actually be written as standalone Agents
Interpreter.BUILTINS = {
  'echo': (args, environ)=>{
    return args;
  },
  'pwd': function (args, environ){
    return environ.get('cwd')
  },
  'cd': (args, environ)=>{
    return environ.get('ls')
      .then((ls)=>ls(args, environ))
      .then(()=>environ.get('cwd'))
      .then((cwd)=>environ.set('cwd', path.resolve(cwd, (args[0] || '.'))));
  },
  'mkdir': (args, environ)=>new Promise((resolve, reject)=>{
    // console.log(chalk.yellow('[ShellServer] ')+'mkdir '+environ.get('cwd'), args);

    // passing abs_path since backend does not know the current user context (cwd)
    let abs_path = path.resolve(environ.get('cwd'), args);
    environ.api.fs.mkdir(abs_path, (err, data)=>{
      // console.log(chalk.yellow('[ShellServer] ')+'backend responded ');
      // console.log(err, data, typeof data);
      // let result;
      if (err) reject(err);
      else {
        // console.log(data);
        // if (data) data = data.join('\n');
        resolve(data);
        // console.log(chalk.yellow('[ShellServer] ')+' resolved mkdir ');
        // console.log(data);
      }
    });
  }),
  'cat': (args, environ)=>
    new Promise((resolve, reject)=>{
      environ.get('cwd')
        .then((cwd)=>{
          environ.api.fs.readFile(path.resolve(cwd, (args[0] || '')), (err, data)=>{
            if (err) reject(err);
            else resolve(data);
          })
        })
    }),
  'tail': (args, environ)=>
    new Promise((resolve, reject)=>{
      environ.get('cwd')
        .then((cwd)=>{
          environ.api.fs.readFile(path.resolve(cwd, (args[0] || '')), (err, data)=>{
            if (err) reject(err);
            else resolve(Buffer.from(String(data).split('\n').slice(-10).join('\n')));
          })
        })
    }),
  'tee': ()=>{},
  'ls': (args, environ)=>
        new Promise((resolve, reject)=>{
          // console.log(chalk.yellow('[ShellServer] ')+'ls '+environ.get('cwd'));
          environ.get('cwd')
            .then((cwd)=>{
              environ.api.fs.readdir(path.resolve(cwd, (args[0] || '')), (err, data)=>{
                // console.log(chalk.yellow('[ShellServer] ')+'backend responded '+(++lsCount));
                // console.log(err, data, typeof data);
                // let result;
                if (err) reject(err);
                else {
                  // console.log(data);
                  // if (data) data = data.join('\n');
                  let output = [['Name', 'Type']];
                  if (data){
                    data.forEach((item)=>{
                      output.push([ item.name, item.type ]);
                    });
                  }
                  resolve(tabulate(output));
                  // console.log(chalk.yellow('[ShellServer] ')+' resolved ls ');
                  // console.log(data);
                }
              });
            });
        }),
  'ps': (args, environ)=>
        // new Promise((resolve, reject)=>{
        //   if (systemAPI){
            environ.api.getAllAgents().then((info)=>{
              // console.log(chalk.yellow('[ShellServer] ')+'GOT Agent INFO!');
              // console.log(info);

              let output = [['Agent ID', 'Runtime', 'CPU Usage (%)', 'Memory Usage (MB)', 'Status', 'Elapsed', 'Started At']];
              Object.values(info).forEach((rinfo)=>{
                output.push([
                  (rinfo.isDaemon ? '(D) ' : '') + rinfo.id,
                  rinfo.runtime,
                  rinfo.stat.cpu.toFixed(1)+'%',
                  (rinfo.stat.memory / 1000000).toFixed(2),
                  rinfo.status,
                  helpers.formatTime(Date.now() - rinfo.stat.started_at),
                  new Date(rinfo.stat.started_at).toLocaleString()
                ]);
              });

              let outstr = tabulate(output);

              return outstr;
            }),
        //   }
        //   else {
        //     reject(new Error('Could not find parent process! This is a zombie agent!!!'));
        //   }
        // }),
  'rs': (args, environ)=>
    // new Promise((resolve, reject)=>{
      // if (systemAPI){
        environ.api.getAllRuntimes().then((info)=>{
          // console.log(chalk.yellow('[ShellServer] ')+'GOT Runtime INFO!');
          // console.table(Object.values(info));
          // console.log(info);

          let output = [['Runtime ID', 'Agents', 'Daemons', 'Cores', 'CPU Usage (%)', 'Memory Usage (MB)', 'OS', 'Languages']];
          Object.values(info).forEach((rinfo)=>{
            console.log(rinfo);
            let memory_used = ((rinfo.stat.memory + rinfo.stat.daemon_memory + rinfo.stat.agent_memory) / 1000000);
            let cpu_used = (rinfo.stat.cpu + rinfo.stat.daemon_cpu + rinfo.stat.agent_cpu);

            output.push([
              rinfo.id + (rinfo.isLeader ? ' (Leader)' : ''),
              rinfo.agents.length,
              rinfo.daemons.length,
              rinfo.device.cpus.length,
              cpu_used.toFixed(1) + '%',
              memory_used.toFixed(1) + '/' + rinfo.limit_memory + ' (' + (100 * memory_used / rinfo.limit_memory).toFixed(1) + ' %)',
              rinfo.device.arch+' '+rinfo.device.platform,
              Object.keys(rinfo.interpreters).join(', ')
            ]);
          });
          let outstr = tabulate(output);

          // let outstr = 'Runtime ID\t\tAgents\tDevice\n';
          // outstr += Object.keys(info).map((id)=>{
          //  return id + (info[id].isLeader ? ' (Leader)': '')+'\t\t'+info[id].agents.length+'\t'+info[id].device.arch+' '+info[id].device.platform;
          // }).join('\n')
          return outstr;
          // resolve(outstr);
        }),
      // }
      // else {
      //   reject(new Error('Could not find parent process! This is a zombie agent!!!'));
      // }
    // })
  // ),
  'cs': (args, environ)=>{
      return environ.api.requestScheduler('get-deployments')
        .then((deps)=>{
          let output = [[ 'Agent', 'Agent Source', 'Criterion' ]];
          output = output.concat(deps.map((dep)=>{
            helpers.prettyPrint(dep);
              return [
                dep.agent.name,
                dep.agent.source,
                dep.criterion
              ];
            }));

          let outstr = tabulate(output);
          return outstr;
        });
  },
  'pipes': (args, environ)=>
        // new Promise((resolve, reject)=>{
        //   if (systemAPI){
            environ.api.getAllPipes().then((info)=>{
              // console.log(chalk.yellow('[ShellServer] ')+'GOT Agent INFO!');
              // console.log(info);

              let output = [['Pipe ID', 'Runtime', 'Source', 'Sink', 'Status', 'Bytes Streamed', 'Latency', 'Elapsed', 'Created At']];
              Object.values(info).forEach((rinfo)=>{
                output.push([
                  rinfo.id,
                  rinfo.runtime,
                  rinfo.source,
                  rinfo.sink,
                  rinfo.status,
                  rinfo.bytes,
                  rinfo.latency,
                  helpers.formatTime(Date.now() - rinfo.started_at),
                  new Date(rinfo.started_at).toLocaleString()
                ]);
              });

              let outstr = tabulate(output);

              return outstr;
            }),
        //   }
        //   else {
        //     reject(new Error('Could not find parent process! This is a zombie agent!!!'));
        //   }
        // }),
  'run': function (args, environ){
    console.log(args);
    if (typeof args[0] == 'string'){
      let source_path = path.resolve(environ.get('cwd'), args[0]);
      return environ.api.requestScheduler('run', {
        source_path: source_path,
        args: args.slice(1)
      }).then((agent)=>agent.id);
    }
    else if (args[0] instanceof Agent){
      // console.log(environ.get('cwd'), args[0].source);
      // let source_path = path.resolve(environ.get('cwd'), args[0].source);
      // console.log(source_path);
      return environ.api.requestScheduler('run', {
        // source_path: source_path,
        source_path: args[0].source,
        args: args.slice(1).map((arg)=>{ 
            let val = evaluate(arg, env);
            if (typeof val === 'function') val = val();
            return val;
          })
      }).then((agent)=>agent.id);
    }
    else {
      return 
    }
  },
  'kill': (args, environ)=>{
    if (args[0]) return environ.api.requestScheduler('kill', args[0]);
    else 'Provide Agent ID'
  },
  'pause': (args, environ)=>{
    if (args[0]) return environ.api.requestScheduler('pause', args[0]);
    else 'Provide Agent ID'
  },
  'resume': (args, environ)=>{
    if (args[0]) return environ.api.requestScheduler('resume', args[0]);
    else 'Provide Agent ID'
  },
  'snap': (args, environ)=>{
    if (args[0]) return environ.api.requestScheduler('snapshot', args[0]).then((snapshot)=>JSON.stringify(snapshot));
    else 'Provide Agent ID'
  },
  'migrate': (args, environ)=>{
    if (args[0] && args[1]){
      return environ.api.requestScheduler('migrate', {
        'agent': args[0],
        'runtime': args[1]
      }).then((agent)=>agent.id);
    }
    else 'Provide which and where'
  },
  'restart': (args, environ)=>{
    if (args[0]) return environ.api.requestScheduler('restart', args[0]);
    else 'Provide Agent ID'
  },

  'pipe': (args, environ)=>{
    if (args[0] && args[1]) return environ.api.requestScheduler('pipe-create', {
      source: args[0],
      sink: args[1]
    }).then((pipe)=>(pipe.source+' -> '+pipe.sink));
    else 'Provide Source and Sink'
  },
  'unpipe': (args, environ)=>{
    if (args[0]) return environ.api.requestScheduler('pipe-destroy', args[0]).then((pipe)=>(pipe.source+' -X-> '+pipe.sink));
    else 'Provide Pipe ID'
  },

  'withdraw': (args, environ)=>{
    if (args[0]) return environ.api.requestScheduler('withdraw', args[0]).then((dep)=>(dep.agent.name+' X@ '+dep.criterion));
    else 'Provide Deployment Name'
  },

  // Some utility functions:
  'randint': (args, environ)=>{
    return Promise.resolve(helpers.randInt());
  },
  'randstr': (args, environ)=>{
    return Promise.resolve(helpers.randKey());
  },
  'checksum': (args, environ)=>{
    return Promise.resolve(helpers.hash(args[0], args[1]))
  }
}
Interpreter.prototype.eval = function(str){
  console.log('[Interpreter] trying to evaluate '+str);
  return evaluate(compile(str), this.environ);
}

Interpreter.compile = compile;
Interpreter.evaluate = evaluate;


module.exports = Interpreter;
// {
//   Environment: Environment,
//   compile: compile,
//   evaluate: evaluate
// };