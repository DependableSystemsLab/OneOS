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
    if (ch == '\n') line++, col = 0; else col++;
    return ch;
  }
  function peek() {
    return input.charAt(pos);
  }
  function eof() {
    return peek() == '';
  }
  function croak(msg) {
    throw new Error(msg + ' (' + line + ':' + col + ')');
  }
}
// token types: punc, num, str, kw, var, op
function TokenStream(input) {
  var current = null;
  var keywords = ' true false let if else func agent ';
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
    return /[A-Za-z]/i.test(ch);
  }
  // function is_text_start(ch) {
  //     return /[a-z0-9]/i.test(ch);
  // }
  // function is_list_start(ch) {
  //     return ch == '-';
  // }
  function is_id(ch) {
    return is_id_start(ch) || '/.?!-<>=0123456789'.indexOf(ch) >= 0;
  }

  // function is_special_char(ch) {
  //   return '+-*/^%=&|<>!.,;:(){}[]$@'.indexOf(ch) >= 0;
  // }

  function is_op_char(ch) {
    return '+-*/^%=&|<>!:@'.indexOf(ch) >= 0;
  }
  function is_punc(ch) {
    return ',;(){}[]'.indexOf(ch) >= 0;
  }
  //    function is_whitespace(ch) {
  //        return " \t\n".indexOf(ch) >= 0;
  //    }
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

  // function read_special() {
  //   return { type: 'Special', value: read_while(is_special_char) };
  // }



  //    function read_text() {
  //        return { type: "str", value: read_escaped('"') };
  //    }
  

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
  // function is_special(spec) {
  //   var tok = input.peek();
  //   return tok && tok.type == 'Special' && (!spec || (spec instanceof Array ? spec.indexOf(tok.value) > -1 : tok.value == spec)) && tok;
  // }

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
  // function skip_special(spec) {
  //   if (is_special(spec)) input.next();
  //   else input.croak('Expecting special: "' + op + '"');
  // }
  function unexpected() {
    input.croak('Unexpected token: ' + JSON.stringify(input.peek()));
  }
  function maybe_binary(left, my_prec) {
    var tok = is_op();
    // console.log('Maybe Binary - left: ',left, my_prec, tok);
    if (tok) {
      // if (tok.value == ':'){
      //   return maybe_binary({
      //     type: 'Channel',
      //     agent: left,
      //     name: maybe_binary(parse_atom(), his_prec);
      //   }, my_prec)
      // }
      // if (tok.value in PIPE_PRECEDENCE){
      //     console.log('This is a PipeExpression');
      //     var his_prec = PIPE_PRECEDENCE[tok.value];
      //     console.log(his_prec, my_prec);
      //     if (his_prec > my_prec) {
      //         input.next();
      //         return maybe_binary({
      //             type     : 'PipeExpression',
      //             operator : tok.value,
      //             left     : left,
      //             right    : maybe_binary(parse_atom(), his_prec)
      //         }, my_prec);
      //     }
      // }
      // else {
      var his_prec = PRECEDENCE[tok.value];
      if (his_prec > my_prec) {
        input.next();
        
        if (tok.value == ':'){
          return maybe_binary({
            type: 'Channel',
            agent: left,
            name: parse_varname()
            // name: maybe_binary(parse_atom(), his_prec)
          }, my_prec);
        }
        else if (tok.value == '->' || tok.value == '<-'){
          return maybe_binary({
            type: 'PipeExpression',
            kind: tok.value,
            left: left,
            right: maybe_binary(parse_atom(), his_prec)
          }, my_prec);
        }
        else {
          return maybe_binary({
            // type     : type,
            type     : tok.value == "=" ? "assign" : "binary",
            operator : tok.value,
            left     : left,
            right    : maybe_binary(parse_atom(), his_prec)
          }, my_prec);
        }
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

  function parse_call(func) {
      // return {
      //     type: "CallExpression",
      //     func: func,
      //     args: read_all(parse_as_str),
      // };

      return {
          type: "CallExpression",
          func: func,
          args: delimited("(", ")", ",", parse_expression),
      };
  }
  // function parse_call(){
  //   skip_punc('(');
  //   var func = parse_expression();
  //   var args = [];
  //   while (!input.eof()) {
  //     if (is_punc(')')) break;
  //     args.push(parse_expression());
  //   }
  //   skip_punc(')');
  //   return {
  //     type: 'CallExpression',
  //     func: func,
  //     args: args
  //   };
  // }

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

  // function parse_run() {
  //     skip_kw('run');
  //     console.log(input.peek());
  //     var a = [], first = true;
  //     while (!input.eof()) {
  //         if (first) first = false;
  //         a.push(parse_agent());
  //     }

  //     return {
  //         type : "run",
  //         agents: a
  //         // body: parse_agent()
  //     }
  // }

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

  // function parse_channel(agent) {
  //   skip_op(':');
  //   return {
  //     type: 'Channel',
  //     agent: agent,
  //     name: parse_expression()
  //   }
  // }

  // function parse_pipe(channel) {
  //   skip_op('->');
  //   return {
  //     type     : 'PipeExpression',
  //     operator : '->',
  //     source     : channel,
  //     target    : parse_expression()
  //   }
  // }

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

  function parse_atom() {
    return maybe_call(
      // ()=>maybe_quantifier(
        ()=>{
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
          if (is_kw('agent')) return parse_agent();

          var tok = input.next();
          if (tok.type == 'var' || tok.type == 'num' || tok.type == 'str')
            return tok;
          // if (tok.type == 'num')
          //   return maybe_quantifier(tok);
          //            if (tok.type == "str") return parse_paragraph();
          //            else if (tok.type == "var" || tok.type == "num") return tok;
          // if (tok.type == "str") return { type: "Text", value: tok.value };
          // if (tok.type == "var" || tok.type == "num" || tok.type == "str")
          return tok;
          unexpected();
      })
    // );
  }
  function parse_toplevel() {
    var prog = [];
    while (!input.eof()) {
      prog.push(parse_expression());
      if (!input.eof()) skip_punc('\n');
      console.log('>>> Next ------------------------------');
      //            if (!input.eof()) skip_punc(";");
    }
    return { type: 'prog', prog: prog, toplevel: true };
  }
  function parse_prog() {
    var prog = delimited('{', '}', '\n', parse_expression);
    if (prog.length == 0) return FALSE;
    if (prog.length == 1) return prog[0];
    return { type: 'prog', prog: prog };
  }
  function parse_expression() {
    // return maybe_call(function(){
    return maybe_redirect(
        // ()=>maybe_channel(
          ()=>maybe_placement(
            ()=>maybe_call(
              ()=>maybe_binary(parse_atom(), 0)
              )
          )
          // )
      );

    // return maybe_pipe(()=>
    //     maybe_placement(()=>
    //       maybe_channel(()=>
    //         maybe_binary(parse_atom(), 0)
    //       )
    //     )
    //   )
        
    // });
  }
}

/**
* accepts a ThinkTree MarkDown string
* returns an HTML string
*/
// function build(str){
// 	var ast = parse(TokenStream(InputStream(str)));
// 	console.log(ast);
// 	var globalEnv = new Environment();
// 	var result = evaluate(ast, globalEnv);
// //var result = compile(ast);
// 	return result;
// }

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
      return this.vars[name];
    }
    else return new Promise((resolve, reject)=>{
      let source_path = path.resolve(this.get('cwd'), name);
      this.api.fs.readFile(source_path, (err, data)=>{
        console.log(err, data.toString());
        if (err) reject(err);
        else resolve(new FilePath(source_path));
      })
    });
    // throw new Error('Undefined variable ' + name);
  },
  set: function(name, value) {
    var scope = this.lookup(name);
    if (!scope && this.parent)
      throw new Error('Undefined variable ' + name);
    return (scope || this).vars[name] = value;
  },
  def: function(name, value) {
    return this.vars[name] = value;
  }
  // setPubsub: function(pubsub){
  //     Environment.prototype.pubsub = pubsub;
  // }
};

function evaluate(exp, env) {
  console.log(chalk.magenta('Evaluate: '), exp);
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
    return exp.value;

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

  case 'prog':
    var val = null;
    exp.prog.forEach(function(exp){ val = evaluate(exp, env); });
    return val;

    //       case "prog":
    // //        var val = false;
    // //        exp.prog.forEach(function(exp){ val = evaluate(exp, env) });
    //         var val = '';
    //         exp.prog.forEach(function(exp){ val += evaluate(exp, env) });
    // 	val = '<section>' + val + '</section>'
    // 	if (exp.toplevel == true) val = '<html><head></head><body>' + val + '</body></html>';
    //         return val;

  case 'call':
    var func = evaluate(exp.func, env);
    return func.apply(null, exp.args.map(function(arg){
      return evaluate(arg, env);
    }));

    // case "run":
    //   console.log(env.get('run'));
    //   var runHandler = env.get('run');
    //   if (!runHandler) throw new Error('Cannot find run handler');
    //   return runHandler(exp.agents.map((arg)=>{
    //       return evaluate(arg, env);
    //   }));

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

    // return deploy;
    
  //   var agent = new Agent(exp.agent.value, path.resolve(env.get('cwd'), evaluate(exp.criterion, env)));

  //   // if (exp.agent.type != 'var')
  //   //   throw new Error('Cannot assign to ' + JSON.stringify(exp.left));
  //   env.set(exp.agent.value, agent);

  //   return function(){
  //     console.log('applying placement');
  //   }

  case 'CallExpression':
    // console.log('CallExpression', exp);
    var func = evaluate(exp.func, env);
    if (typeof func === 'function'){
      // console.log(func);
      return func.apply(null, [
        exp.args.map(function(arg){
          // console.log(arg);
          return evaluate(arg, env);
        }),
        env
      ]);
    }
    else if (func instanceof Agent){
      return env.api.requestScheduler('run', Object.assign(func.toQuery(), {
          // source_path: path.resolve(env.get('cwd'), func.source),
          args: exp.args.map((arg)=>{ 
              let val = evaluate(arg, env);
              if (typeof val === 'function') val = val();
              return val;
            })
        })).then((agent)=>agent.id);
    }
    else if (func instanceof Promise){
      return func.then((result)=>{
        console.log('Result is: ', result);
        console.log('Prototype is: ', Object.getPrototypeOf(result));
        
        if (result instanceof FilePath){
          console.log('Args are: ', exp.args);
          var extname = path.extname(result.path);
          var language = (extname === '.py')? 'python3':'javascript';
          return env.api.requestScheduler('run', {
              name: path.basename(result.path),
              source_path: result.path,
              language: language,
              args: exp.args.map((arg)=>{ 
                let val = evaluate(arg, env);
                if (typeof val === 'function') val = val();
                return val;
              }),
              pipes: []
            }).then((agent)=>agent.id);
        }
        else return Promise.reject(new Error('Cannot call '+JSON.stringify(result)+' because it is not a file'));
      })
    }
    else if (func.type === 'Unit'){
      return null;
    }
    else if (typeof func === 'number'){
      var result = [];
      for (var i = 0; i < func; i ++){
        result.push(evaluate(exp.args[0], env));
      }
      return result;
    }
    else {
      console.log(func);
      throw new Error('Cannot call '+JSON.stringify(func)+' because it is not a function');
    }

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



/* -----[ entry point for NodeJS ]----- */
/*
var globalEnv = new Environment();

globalEnv.def("time", function(func){
    try {
        console.time("time");
        return func();
    } finally {
        console.timeEnd("time");
    }
});

if (typeof process != "undefined") (function(){
    var util = require("util");
    globalEnv.def("println", function(val){
        //util.puts(val);
        console.log(val);
    });
    globalEnv.def("print", function(val){
        //util.print(val);
        //console.log(val);
        process.stdout.write(val.toString());
    });
    var code = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("readable", function(){
        var chunk = process.stdin.read();
        if (chunk) code += chunk;
    });
    process.stdin.on("end", function(){
        var ast = parse(TokenStream(InputStream(code)));
        evaluate(ast, globalEnv);
    });
})();
*/

// function build(str){
//     var ast = parse(TokenStream(InputStream(str)));
//     console.log(ast);
//     var globalEnv = new Environment();
//     var result = evaluate(ast, globalEnv);
// //var result = compile(ast);
//     return result;
// }

function compile(str) {
  return parse(TokenStream(InputStream(str)));
}

function Interpreter(runtime_api, builtins){
  if (!(this instanceof Interpreter)) return new Interpreter(runtime_api, builtins);
  this.api = runtime_api;
  this.environ = new Environment(null, this.api);
  this.builtins = Object.assign({}, Interpreter.BUILTINS, builtins);

  // add builtins to the environment
  Object.keys(this.builtins)
    .forEach((cmd)=>{
      this.environ.def(cmd, (args, env)=>this.builtins[cmd](args, env, this.api));
    });

  // initialize some environment variables
  this.environ.def('cwd', '/');

  console.log('Successfully Created an Interpreter');
}
Interpreter.BUILTINS = {
  'echo': (args)=>{
    return args;
  },
  'pwd': function (args, environ){
    return environ.get('cwd')
  },
  'cd': (args, environ)=>{
    let cwd = environ.get('cwd');
    cwd = path.join(cwd, args[0]);
    environ.set('cwd', cwd);
    return cwd;
  },
  'mkdir': (args, environ, api)=>new Promise((resolve, reject)=>{
    // console.log(chalk.yellow('[ShellServer] ')+'mkdir '+environ.get('cwd'), args);

    // passing abs_path since backend does not know the current user context (cwd)
    let abs_path = path.resolve(environ.get('cwd'), args);
    api.fs.mkdir(abs_path, (err, data)=>{
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
  'cat': ()=>{},
  'tail': ()=>{},
  'tee': ()=>{},
  'ls': (args, environ, api)=>
        new Promise((resolve, reject)=>{
          // console.log(chalk.yellow('[ShellServer] ')+'ls '+environ.get('cwd'));
          api.fs.readdir(environ.get('cwd'), (err, data)=>{
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
        }),
  'ps': (args, environ, api)=>
        // new Promise((resolve, reject)=>{
        //   if (systemAPI){
            api.getAllAgents().then((info)=>{
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
  'rs': (args, environ, api)=>
    // new Promise((resolve, reject)=>{
      // if (systemAPI){
        api.getAllRuntimes().then((info)=>{
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
  'cs': (args, environ, api)=>{
      return api.requestScheduler('get-deployments')
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
  'pipes': (args, environ, api)=>
        // new Promise((resolve, reject)=>{
        //   if (systemAPI){
            api.getAllPipes().then((info)=>{
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
  'run': function (args, environ, api){
    console.log(args);
    if (typeof args[0] == 'string'){
      let source_path = path.resolve(environ.get('cwd'), args[0]);
      return api.requestScheduler('run', {
        source_path: source_path,
        args: args.slice(1)
      }).then((agent)=>agent.id);
    }
    else if (args[0] instanceof Agent){
      // console.log(environ.get('cwd'), args[0].source);
      // let source_path = path.resolve(environ.get('cwd'), args[0].source);
      // console.log(source_path);
      return api.requestScheduler('run', {
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
  'kill': (args, environ, api)=>{
    if (args[0]) return api.requestScheduler('kill', args[0]);
    else 'Provide Agent ID'
  },
  'pause': (args, environ, api)=>{
    if (args[0]) return api.requestScheduler('pause', args[0]);
    else 'Provide Agent ID'
  },
  'resume': (args, environ, api)=>{
    if (args[0]) return api.requestScheduler('resume', args[0]);
    else 'Provide Agent ID'
  },
  'snap': (args, environ, api)=>{
    if (args[0]) return api.requestScheduler('snapshot', args[0]).then((snapshot)=>JSON.stringify(snapshot));
    else 'Provide Agent ID'
  },
  'migrate': (args, environ, api)=>{
    if (args[0] && args[1]){
      return api.requestScheduler('migrate', {
        'agent': args[0],
        'runtime': args[1]
      }).then((agent)=>agent.id);
    }
    else 'Provide which and where'
  },
  'restart': (args, environ, api)=>{
    if (args[0]) return api.requestScheduler('restart', args[0]);
    else 'Provide Agent ID'
  },

  'pipe': (args, environ, api)=>{
    if (args[0] && args[1]) return api.requestScheduler('pipe-create', {
      source: args[0],
      sink: args[1]
    }).then((pipe)=>(pipe.source+' -> '+pipe.sink));
    else 'Provide Source and Sink'
  },
  'unpipe': (args, environ, api)=>{
    if (args[0]) return api.requestScheduler('pipe-destroy', args[0]).then((pipe)=>(pipe.source+' -X-> '+pipe.sink));
    else 'Provide Pipe ID'
  },

  'withdraw': (args, environ, api)=>{
    if (args[0]) return api.requestScheduler('withdraw', args[0]).then((dep)=>(dep.agent.name+' X@ '+dep.criterion));
    else 'Provide Deployment Name'
  },

  // Some utility functions:
  'randint': (args, environ, api)=>{

  },
  'randstr': (args, environ, api)=>{
    return helpers.randKey();
  },
  'checksum': (args, environ, api)=>{
    return helpers.hash(args[0])
  }
}
Interpreter.prototype.eval = function(str){
  console.log('[Interpreter] trying to evaluate '+str);
  return Promise.resolve(evaluate(compile(str), this.environ));
}

Interpreter.compile = compile;
Interpreter.evaluate = evaluate;


module.exports = Interpreter;
// {
//   Environment: Environment,
//   compile: compile,
//   evaluate: evaluate
// };