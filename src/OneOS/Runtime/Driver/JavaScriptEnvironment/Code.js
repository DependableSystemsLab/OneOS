const esprima = require('esprima');
const escodegen = require('escodegen');
const jsBeautify = require('js-beautify').js_beautify;

// Helpers
const ID_CHARSET = 'abcdefghijklmnopqrstuvwxyz';
function randstr(length = 8) {
    return Array.from({ length: length }, item => ID_CHARSET[Math.floor(Math.random() * ID_CHARSET.length)]).join('');
}

// These greek letter prefixes are used to prevent conflicting names with user code.
// This is purely based on the assumption that there is a very low probability of these
// characters being used by the application developer. A more robust implementation should
// dynamically choose names for namespacing.
// var LIB_ALIAS = 'λ';
const SCOPE_PREFIX = 'Σ';			// prefix for Scope identifiers
const PROPERTY_PREFIX = 'τ';		// prefix for injected properties
const ANONYMOUS_PREFIX = 'α';		// prefix for anonymous functions

class LexicalScope {
    constructor(func_name, parent = null) {
        this.func_name = func_name;
        this.parent = parent;

        this.params = [];
        this.hoisted = [];
        this.refs = {};
        this.createsObjects = false;
    }

    id() {
        return this.parent ? `${this.parent.id()}_${this.func_name}` : SCOPE_PREFIX;
    }

    addReferences(astNode) {
        // First scan the body to find variable and function declarations.
        // JavaScript lexical scoping behaviour if variable, function, param has the same name is thus:
        //   0. if there is a reference in the parent scope, it refers to that.
        //   1. if there is a parameter, the reference first refers to the parameter
        //   2. if there are variable declarations (var foo), the reference refers to the variable
        //   3. if there are hoisted functions, this overwrites the reference
        //   --- upto 3. the references are updated prior to execution. 4. is applied sequentially during runtime
        //   4. if the declared identifier is assigned a value, from that line onwards the reference refers to the variable

        let body;
        if (astNode.type == 'Program') {
            body = astNode.body;
        }
        else if (astNode.type == 'FunctionDeclaration' || astNode.type == 'FunctionExpression') {
            body = astNode.body.body;

            astNode.params.forEach((item) => {
                this.params.push(item.name);
                this.refs[item.name] = item;
            });
        }
        else if (astNode.type == 'ArrowFunctionExpression') {
            body = astNode.body.type == 'BlockStatement' ? astNode.body.body : [ astNode.body ];

            astNode.params.forEach((item) => {
                this.params.push(item.name);
                this.refs[item.name] = item;
            });
        }
        else return;

        body.forEach((node) => {
            if (node.type === 'VariableDeclaration') {
                node.declarations.forEach(item => {
                    this.refs[item.id.name] = item;
                });
            }
            else if (node.type === 'FunctionDeclaration') {
                this.hoisted.push(node.id.name);
                this.refs[node.id.name] = node;
            }
            // TODO: also handle variable declarations inside If/For/While statements
        });
    }

    // Wraps the given AST node with the .label() function so that
    // the object is added to the scope during run-time.
    // Additionally, marks this lexical scope as "createsObjects" so that
    // we do not prune the scope during optimization pass
    registerCreatedObject(node) {
        let replace = esprima.parse(`${this.id()}.label()`).body[0].expression;
        replace.arguments.push(node);

        this.createsObjects = true;

        return replace;
    }
}

function instrumentNode(node, scope) {
    //console.log('Instrumenting ' + node.type + ' in ' + (scope ? scope.id() : SCOPE_PREFIX));
    if (instrumentNode.Handlers[node.type]) {
        return instrumentNode.Handlers[node.type](node, scope);
    }
    return node;
}
instrumentNode.Handlers = {
    Program: (node, scope) => {
        scope = new LexicalScope(null, null);
        scope.addReferences(node);

        node.body.forEach((child, index, list) => {
            list[index] = instrumentNode(child, scope);
        });

        let injections = [];
        let refs = '{' + Object.keys(scope.refs).map(item => `${item}:${item}`).join(',') + '}';

        if (scope.hoisted.length > 0) injections.push(`${SCOPE_PREFIX}.hoist(${scope.hoisted.join(',')})`);
        injections.push(`${SCOPE_PREFIX}.extractor = () => [{}, ${refs} ]`);

        let inject = esprima.parse(injections.join(';')).body;
        node.body.unshift.apply(node.body, inject);

        return node;
    },
    ExpressionStatement: (node, scope) => {
        node.expression = instrumentNode(node.expression, scope);

        return node;
    },
    FunctionDeclaration: (node, scope) => {
        let func_scope = new LexicalScope(node.id.name, scope);
        func_scope.addReferences(node);

        if (node.body.type == 'BlockStatement') {
            node.body.body.forEach((child, index, list) => {
                list[index] = instrumentNode(child, func_scope);
            });

            let injections = [];
            let params = '{' + func_scope.params.map(item => `${item}:${item}`).join(',') + '}';
            let refs = '{' + Object.keys(func_scope.refs).map(item => `${item}:${item}`).join(',') + '}';
            let hoisted = func_scope.hoisted.length > 0 ? `.hoist(${func_scope.hoisted.join(',')})` : '';

            if (func_scope.params.length != 0 || Object.keys(func_scope.refs).length != 0 || func_scope.hoisted.length != 0 || func_scope.createsObjects) {
                injections.push(`let ${func_scope.id()} = ${scope.id()}.scope(this, () => [ ${params}, ${refs} ])${hoisted}`);
            }

            let inject = esprima.parse(injections.join(';')).body;
            node.body.body.unshift.apply(node.body.body, inject);
        }
        // if arrow function
        else {
            node.body = instrumentNode(node.body, scope);
        }

        return node;
    },
    FunctionExpression: (node, scope) => {
        // If function is anonymous, assign some name. We need the name for migration
        if (node.id === null) {
            node.id = esprima.parse(ANONYMOUS_PREFIX + randstr(4)).body[0].expression;
        }

        instrumentNode.Handlers.FunctionDeclaration(node, scope);

        /*let replace = esprima.parse(`${scope.id()}.label()`).body[0].expression;
        replace.arguments.push(node);*/
        let replace = scope.registerCreatedObject(node);

        return replace;
    },
    ArrowFunctionExpression: (node, scope) => {
        // If function is anonymous, assign some name. We need the name for migration
        if (node.id === null) {
            node.id = esprima.parse(ANONYMOUS_PREFIX + randstr(4)).body[0].expression;
        }

        instrumentNode.Handlers.FunctionDeclaration(node, scope);

        /*let replace = esprima.parse(`${scope.id()}.label()`).body[0].expression;
        replace.arguments.push(node);*/
        let replace = scope.registerCreatedObject(node);

        return replace;
    },
    ForStatement: (node, scope) => {

        // if body is not a block, force it to be a block
        // so that we can inject code into the body
        if (node.body.type !== 'BlockStatement') {
            var block = esprima.parse('{}').body[0];
            block.body.push(node.body);
            node.body = block;
        }

        node.body.body.forEach((child, index, list) => {
            list[index] = instrumentNode(child, scope);
        });

        return node;
    },
    ForInStatement: (node, scope) => {
        // if body is not a block, force it to be a block
        // so that we can inject code into the body
        if (node.body.type !== 'BlockStatement') {
            var block = esprima.parse('{}').body[0];
            block.body.push(node.body);
            node.body = block;
        }

        node.body.body.forEach((child, index, list) => {
            list[index] = instrumentNode(child, scope);
        });

        return node;
    },
    IfStatement: (node, scope) => {
        // if body is not a block, force it to be a block
        // so that we can inject code into the body
        if (node.consequent.type !== 'BlockStatement') {
            var block = esprima.parse('{}').body[0];
            block.body.push(node.consequent);
            node.consequent = block;
        }

        node.consequent.body.forEach((child, index, list) => {
            list[index] = instrumentNode(child, scope);
        });

        if (node.alternate) {
            if (node.alternate.type == 'IfStatement') {
                node.alternate = instrumentNode(node.alternate, scope);
            }
            else {
                // if body is not a block, force it to be a block
                // so that we can inject code into the body
                if (node.alternate.type !== 'BlockStatement') {
                    var block = esprima.parse('{}').body[0];
                    block.body.push(node.alternate);
                    node.alternate = block;
                }

                node.alternate.body.forEach((child, index, list) => {
                    list[index] = instrumentNode(child, scope);
                });
            }
        }

        return node;
    },
    VariableDeclaration: (node, scope) => {
        node.declarations.forEach((child, index, list) => {
            list[index] = instrumentNode(child, scope);
        });

        return node;
    },
    VariableDeclarator: (node, scope) => {
        if (node.init) node.init = instrumentNode(node.init, scope);

        return node;
    },
    AssignmentExpression: (node, scope) => {
        node.right = instrumentNode(node.right, scope);

        return node;
    },
    CallExpression: (node, scope) => {

        node.arguments.forEach((child, index, list) => {
            list[index] = instrumentNode(child, scope);
        });

        if (node.callee.type == 'Identifier') {
            if (['setInterval', 'setTimeout', 'setImmediate', 'clearInterval', 'clearTimeout', 'clearImmediate', 'require'].indexOf(node.callee.name) > -1) {
                let replace = esprima.parse(`${SCOPE_PREFIX}.${node.callee.name}`).body[0].expression;
                node.callee = replace;
            }
        }
        else if (node.callee.type === 'MemberExpression') {
            // TODO: the following assumes that the 'fs' module is assigned to the variable 'fs',
            //       which is a fragile assumption. We should dynamically track the call invocation
            if (node.callee.object.type === 'Identifier' && node.callee.object.name === 'fs'
                && node.callee.property.type === 'Identifier' && ['createReadStream', 'createWriteStream'].includes(node.callee.property.name)) {
                /*let replace = esprima.parse(`${scope.id()}.label()`).body[0].expression;
                replace.arguments.push(node);*/
                let replace = scope.registerCreatedObject(node);

                return replace;
            }

            // TODO: we also need to .label() objects that are created by native functions such as Buffer.from()
            //
        }
        else if (node.callee.type === 'FunctionExpression' || node.callee.type === 'ArrowFunctionExpression') {
            node.callee = instrumentNode(node.callee, scope);
        }
        else if (node.callee.type === 'CallExpression') {
            node.callee = instrumentNode(node.callee, scope);
        }

        return node;
    },
    ObjectExpression: (node, scope) => {
        node.properties.forEach((child, index, list) => {
            list[index] = instrumentNode(child, scope);
        });

        /*let replace = esprima.parse(`${scope.id()}.label()`).body[0].expression;
        replace.arguments.push(node);*/
        let replace = scope.registerCreatedObject(node);

        return replace;
    },
    ArrayExpression: (node, scope) => {
        node.elements.forEach((child, index, list) => {
            list[index] = instrumentNode(child, scope);
        });

        /*let replace = esprima.parse(`${scope.id()}.label()`).body[0].expression;
        replace.arguments.push(node);*/
        let replace = scope.registerCreatedObject(node);

        return replace;
    }
}

// serializers
// if asReference = true, it will serialize it as a "reference" object, if it's a non-primitive object
// if asReference = false, it will serialize the value of the object.
function makeSerializable(item, asReference) {
    return makeSerializable[typeof item](item, asReference);
}
makeSerializable['boolean'] = item => item;
makeSerializable['number'] = item => item;
makeSerializable['string'] = item => item;
makeSerializable['undefined'] = item => ({ type: 'undefined' });
makeSerializable['function'] = (item, asReference) => (asReference ? { type: 'reference', value: item[PROPERTY_PREFIX + 'uri'] } : {
    type: 'Function',
    value: item.toString()
});
makeSerializable['object'] = (item, asReference) => {
    if (item === null) return null;

    // We should not have to check for item[PROPERTY_PREFIX + 'uri']
    // as the referenced object should already have that property.
    // However, there are corner cases when some objects are created inside
    // a function that is not instrumented by OneOS, in which case this
    // property will be missing. In that case, we need to serialize the full
    // object as if they were created by OneOS. This should actually be addressed
    // by instrumenting the unsupported function, because this can lead to
    // duplication of the object.
    if (asReference && item[PROPERTY_PREFIX + 'uri']) {
        return { type: 'reference', value: item[PROPERTY_PREFIX + 'uri'] };
    }

    // For now, if it's a "require"d object, require it on the target node instead of migrating object.
    // This will fail if the required object was modified after.
    if (item[PROPERTY_PREFIX + 'import']) {
        return { type: 'import', value: item[PROPERTY_PREFIX + 'import'] }
    }

    if (item.constructor && makeSerializable[item.constructor.name]) {
        return makeSerializable[item.constructor.name](item);
    }

    let serialized = {
        type: item.constructor.name,
        value: {}
    };

    Object.keys(item).forEach(key => {
        if (key[0] !== PROPERTY_PREFIX) serialized.value[key] = makeSerializable(item[key], true);
    });

    return serialized;
};
makeSerializable['Array'] = (item) => ({
    type: 'Array',
    value: item.map(elem => makeSerializable(elem, true))
});
makeSerializable['Buffer'] = (item) => ({
    type: 'Buffer',
    value: item.toString('base64')
});
makeSerializable['DirectPipe'] = (item) => ({
    type: 'oneos.DirectPipe',
    value: item[PROPERTY_PREFIX + 'data']()
});

// deserializers
function makeCode(item) {
    return makeCode[typeof item](item);
}
makeCode['boolean'] = item => item;
makeCode['number'] = item => item;
makeCode['string'] = item => `'${item}'`;
makeCode['object'] = (item) => {
    if (item === null) return null;
    if (makeCode[item.type]) {
        return makeCode[item.type](item);
    }

    throw new Error('Cannot make code for an object of type ' + item.type);
}
makeCode['Array'] = (item) => {
    return `[ ${item.value.map(elem => makeCode(elem)).join(', ')} ]`;
}
makeCode['Object'] = (item) => `{ ${Object.keys(item.value).map(key => `"${key}": ` + makeCode(item.value[key])).join(', ')} }`;
makeCode['Function'] = (item) => item.value;
makeCode['Buffer'] = (item) => `Buffer.from('${item.value}', 'base64')`;
makeCode['reference'] = (item) => `${SCOPE_PREFIX}.getObject('${item.value}')`;
makeCode['import'] = (item) => `${SCOPE_PREFIX}.require('${item.value}')`;
makeCode['oneos.DirectPipe'] = (item) => `${SCOPE_PREFIX}.${item.value.init}('${item.value.path}', ${item.value.bytesRead})`;

// Timer objects
class Timer {
    constructor(callback, timedelta, timer_id) {
        this.id = (timer_id || randstr());
        this.callback = callback;
        this.timedelta = timedelta || 0;
        this.ref = null;
        // this.created_at = Date.now();
        this.called_at = undefined;
        this.cleared_at = undefined;
        this.stopped_at = undefined;
    }

    getSerializable() {
        return {
            id: this.id,
            callback_uri: this.callback[PROPERTY_PREFIX + 'uri'],
            timedelta: this.timedelta,
            called_at: this.called_at,
            cleared_at: this.cleared_at,
            stopped_at: this.stopped_at
        }
    }
}
Timer.restoreCode = (obj) => {
    let callback = SCOPE_PREFIX + '.getObject("' + obj.callback_uri + '")';
    if (obj.type === 'Timeout') {
        return SCOPE_PREFIX + '.setTimeout(' + callback + ', ' + (obj.stopped_at - obj.called_at) + ', "' + obj.id + '");';
    }
    else if (obj.type === 'Interval') {
        var remaining = obj.timedelta - (obj.stopped_at - (obj.cleared_at || obj.called_at));
        return SCOPE_PREFIX + '.restoreInterval(' + callback + ', ' + obj.timedelta + ', "' + obj.id + '", ' + remaining + ');';
    }
    else if (obj.type === 'Immediate') {
        return SCOPE_PREFIX + '.setImmediate(' + callback + ', "' + obj.id + '");';
    }
};

class IntervalTimer extends Timer {
    constructor(callback, timedelta, timer_id) {
        super(callback, timedelta, timer_id);
    }

    getSerializable() {
        return Object.assign(super.getSerializable(), { type: 'Interval' });
    }

    start() {
        const self = this;
        this.called_at = Date.now();
        this.ref = setInterval(function (){
            self.callback.call(this)
            self.cleared_at = Date.now();
        }, this.timedelta);
    }

    pause() {
        clearInterval(this.ref);
        this.ref = null;
        this.stopped_at = Date.now();
        this.remaining = this.timedelta - (this.stopped_at - (this.cleared_at || this.called_at));
    }

    resume() {
        const self = this;
        if (this.remaining) {
            this.called_at = Date.now();
            this.ref = setTimeout(function () {
                self.callback.call(this);
                self.cleared_at = Date.now();

                self.ref = setInterval(function () {
                    self.callback.call(this);
                    self.cleared_at = Date.now();
                }, self.timedelta);
            }, this.remaining);
        }
        else {
            this.start();
        }
    }
}

class TimeoutTimer extends Timer {
    constructor(callback, timedelta, timer_id) {
        super(callback, timedelta, timer_id);
    }

    getSerializable() {
        return Object.assign(super.getSerializable(), { type: 'Timeout' });
    }

    start() {
        const self = this;
        this.called_at = Date.now();
        this.ref = setTimeout(function () {
            self.callback.call(this)
            self.cleared_at = Date.now();
            (self.onClear && self.onClear());
        }, this.timedelta);
    }

    pause() {
        clearTimeout(this.ref);
        this.ref = null;
        this.stopped_at = Date.now();
        this.remaining = this.timedelta - (this.stopped_at - (this.cleared_at || this.called_at));
    }

    resume() {
        const self = this;
        if (this.remaining) {
            this.called_at = Date.now();
            this.ref = setTimeout(function () {
                self.callback.call(this);
                self.cleared_at = Date.now();
                (self.onClear && self.onClear());
            }, this.remaining);
        }
        else {
            this.start();
        }
    }
}

class ImmediateTimer extends Timer {
    constructor(callback, timer_id) {
        super(callback, 0, timer_id);
    }

    getSerializable() {
        return Object.assign(super.getSerializable(), { type: 'Immediate' });
    }

    start() {
        const self = this;
        this.called_at = Date.now();
        this.ref = setImmediate(function () {
            self.callback.call(this)
            self.cleared_at = Date.now();
            (self.onClear && self.onClear());
        });
    }

    pause() {
        clearImmediate(this.ref);
        this.ref = null;
        this.stopped_at = Date.now();
    }

    resume() {
        this.start();
    }
}

class Scope {
    constructor(thisRef, parent, extractor) {
        this.id = randstr(4);
        this.uri = parent ? `${parent.uri}/${this.id}` : SCOPE_PREFIX;
        this.parent = parent;
        this.extractor = extractor;
        this.objects = {};
        this.hoisted = [];
    }

    capture() {
        if (this._captureInProgress) return;
        this._captureInProgress = true;

        this.tree = {
            uri: this.uri,
            params: {},
            refs: {},
            objects: {},
            hoisted: Array.from(this.hoisted),
            children: {}
        }

        let extract = this.extractor();
        let params = extract[0];
        let refs = extract[1];

        Object.keys(params).forEach(name => {
            this.tree.params[name] = makeSerializable(params[name], true);
            this.captureObject(params[name]);
        });

        Object.keys(refs).forEach(name => {
            this.tree.refs[name] = makeSerializable(refs[name], true);
            this.captureObject(refs[name]);
        });

        Object.keys(this.objects).forEach(name => {
            this.tree.objects[name] = makeSerializable(this.objects[name], false);
        });

        if (this.parent) {
            this.parent.capture();
            this.parent.tree.children[this.id] = this.tree;
        }

        this._captureInProgress = false;

        return this.tree;
    }

    captureObject(obj) {
        if (obj === null || obj instanceof Scope) return;

        if (typeof obj === 'function' && obj[PROPERTY_PREFIX + 'scope'] !== this) {
            // TODO: remove the following IF condition -- every object should have a "scope" property
            if (obj[PROPERTY_PREFIX + 'scope']) {
                obj[PROPERTY_PREFIX + 'scope'].capture();
            }
        }
        else if (typeof obj === 'object' && obj[PROPERTY_PREFIX + 'scope'] !== this) {
            // TODO: remove the following IF condition -- every object should have a "scope" property
            if (obj[PROPERTY_PREFIX + 'scope']) {
                obj[PROPERTY_PREFIX + 'scope'].capture();
            }

            Object.values(obj).forEach(child => this.captureObject(child));
        }
    }

    /* functions called by instrumented code */
    scope(thisRef, extractor) {
        return new Scope(thisRef, this, extractor);
    }

    restore(id, thisRef, extractor) {
        var child = new Scope(thisRef, this, extractor);
        child.id = id;
        child.uri = this.uri + '/' + id;
        // "sticks" the child scope to make it reachable from root
        if (!this.restored) this.restored = {};
        this.restored[id] = child;

        return child;
    }

    hoist(...funcs) {
        funcs.forEach(item => {
            this.hoisted.push(item.name);
            this.label(item, item.name);
        });
    }

    label(obj, assignId) {
        // need to label non-primitive objects (e.g., function, object)
        // because they can be passed around across scopes, and we need to know their origin
        // param assignId: provided when it's a restored object
        let objId = assignId || randstr();
        obj[PROPERTY_PREFIX + 'scope'] = this;  // this property is used only during run-time and not included in the snapshot
        obj[PROPERTY_PREFIX + 'uri'] = this.uri + '.' + objId;
        this.objects[objId] = obj;

        return obj;
    }
}
Scope.restoreCode = (snap) => {

    let scope_tokens = snap.uri.split('/');
    let scope_identifier = scope_tokens.join('_');

    let code = '';

    // restore hoisted functions
    snap.hoisted.forEach(key => {
        code += `${makeCode(snap.objects[key])};\n\n`;
    });

    // restore objects
    Object.keys(snap.objects).filter(key => !snap.hoisted.includes(key)).forEach(key => {
        code += `${scope_identifier}.label(${makeCode(snap.objects[key])}, '${key}');\n\n`;
    });

    // restore variables
    Object.keys(snap.refs).filter(key => !snap.hoisted.includes(key)).forEach(key => {
        code += `let ${key} = ${makeCode(snap.refs[key])};\n\n`;
    });

    // restore child scopes
    Object.keys(snap.children).forEach(key => {
        code += Scope.restoreCode(snap.children[key]) + '\n';
    });


    let params = '{ ' + Object.keys(snap.params).map(key => key + ':' + key).join(', ') + ' }';
    let refs = '{ ' + Object.keys(snap.refs).map(key => key + ':' + key).join(', ') + ' }';

    if (snap.uri === SCOPE_PREFIX) {
        let hoisted = snap.hoisted.length > 0 ? `${SCOPE_PREFIX}.hoist(${snap.hoisted.join(', ')});` : '';
        let wrapped = `${hoisted}
${SCOPE_PREFIX}.extractor = () => [{}, ${refs} ];
${code}`
        return wrapped;
    }
    else {
        let parent_scope = scope_tokens.slice(0, -1).join('_');
        let hoisted = snap.hoisted.length > 0 ? `.hoist(${snap.hoisted.join(', ')});` : '';
        let wrapped = `(function (${Object.keys(snap.params).join(', ')}){
    let ${scope_identifier} = ${parent_scope}.restore('${scope_tokens[scope_tokens.length - 1]}', this, () => [ ${params}, ${refs} ])${hoisted}
    ${code}
})(${Object.values(snap.params).map(item => makeCode(item)).join(', ')})`;

        return wrapped;
    }
};

// The main root scope object used during run-time
class RootScope extends Scope {
    constructor(local_module, metadata) {
        super(global, null, null);
        this.id = SCOPE_PREFIX;
        this._module = local_module;
        this.meta = metadata;

        this.timers = {};
    }

    pauseTimers() {
        Object.values(this.timers).forEach(timer => timer.pause());
    }

    resumeTimers() {
        Object.values(this.timers).forEach(timer => timer.resume());
    }

    snapshot() {
        this.capture();

        let snap = {
            meta: this.meta,
            tree: this.tree,
            timers: {},
            stdin: {
                listeners: {},
                segmentListeners: {},
                jsonListeners: {}
            }
        }

        Object.keys(this.timers).forEach(key => {
            snap.timers[key] = this.timers[key].getSerializable();
            this.captureObject(this.timers[key].callback);
        });

        // serialize any event listeners added to the stdin
        ['close', 'data', 'end', 'error', 'pause', 'readable', 'resume'].forEach(evt => {
            snap.stdin.listeners[evt] = process.stdin.listeners(evt)
                .filter(item => item[PROPERTY_PREFIX + 'uri'])
                .map(item => makeSerializable(item, true));

            snap.stdin.segmentListeners[evt] = process.stdin.segment.listeners(evt)
                .filter(item => item[PROPERTY_PREFIX + 'uri'])
                .map(item => makeSerializable(item, true));

            snap.stdin.jsonListeners[evt] = process.stdin.json.listeners(evt)
                .filter(item => item[PROPERTY_PREFIX + 'uri'])
                .map(item => makeSerializable(item, true));
        });

        return snap;
    }

    /* augmented functions to be called by user application */
    require(path) {
        let resolvedPath = path;
        if (path === 'fs' || path === 'net' || path === 'child_process') {
            resolvedPath = 'oneos/' + path;
        }

        let mod = this._module.require(resolvedPath);

        if (typeof mod === 'function' || (typeof mod === 'object' && mod !== null)) {
            mod[PROPERTY_PREFIX + 'import'] = path;
        }

        return mod;
    }

    setInterval(callback, timedelta, timer_id) {
        let timer = new IntervalTimer(callback, timedelta, timer_id);
        this.timers[timer.id] = timer;
        timer.start();
        return timer.id;
    }

    setTimeout(callback, timedelta, timer_id) {
        let timer = new TimeoutTimer(callback, timedelta, timer_id);
        this.timers[timer.id] = timer;
        timer.onClear = () => {
            delete this.timers[timer.id];
        };
        timer.start();
        return timer.id;
    }

    setImmediate(callback, timer_id) {
        let timer = new ImmediateTimer(callback, timer_id);
        this.timers[timer.id] = timer;
        timer.onClear = () => {
            delete this.timers[timer.id];
        };
        timer.start();
        return timer.id;
    }

    clearTimer(timer_id) {
        this.timers[timer_id].pause();
        delete this.timers[timer_id];
    }

    clearInterval(timer_id) {
        return this.clearTimer(timer_id);
    }

    clearTimeout(timer_id) {
        return this.clearTimer(timer_id);
    }

    clearImmediate(timer_id) {
        return this.clearTimer(timer_id);
    }

    /* additional functions to be called by user application */
    restoreInterval(callback, timedelta, timer_id, remaining) {
        let timer = new IntervalTimer(callback, timedelta, timer_id);
        this.timers[timer.id] = timer;
        timer.remaining = remaining;
        timer.resume();
        return timer.id;
    };

    getObject(uri) {
        let member = uri.split('.');
        let tokens = member[0].split('/').slice(1);
        let scope = this;

        for (let i = 0; i < tokens.length; i++) {
            scope = scope[tokens[i]];
        }

        return scope.objects[member[1]];
    };
}


// The main functions exposed to the users
function instrument(source, metadata) {
    //console.log('instrumented started for ' + metadata.uri);
    let ast = esprima.parse(source, { comment: true });

    instrumentNode(ast);

    let instrumented = escodegen.generate(ast);

    let code = `/* Instrumented by OneOS */
require('oneos').bootstrap(module, ${JSON.stringify(metadata)}, function(${SCOPE_PREFIX}){

${instrumented}

})`;

    return code;
}

function restore(snapshot) {

    let scopeCode = Scope.restoreCode(snapshot.tree);
    let timerCode = '';
    let stdinCode = '';

    Object.values(snapshot.timers).forEach(item => {
        timerCode += Timer.restoreCode(item);
    });

    Object.keys(snapshot.stdin.listeners).forEach(evt => {
        snapshot.stdin.listeners[evt].forEach(item => {
            stdinCode += `
process.stdin.on('${evt}', ${makeCode(item)});
`;
        });
    });

    Object.keys(snapshot.stdin.segmentListeners).forEach(evt => {
        snapshot.stdin.segmentListeners[evt].forEach(item => {
            stdinCode += `
process.stdin.segment.on('${evt}', ${makeCode(item)});
`;
        });
    });

    Object.keys(snapshot.stdin.jsonListeners).forEach(evt => {
        snapshot.stdin.jsonListeners[evt].forEach(item => {
            stdinCode += `
process.stdin.json.on('${evt}', ${makeCode(item)});
`;
        });
    });

    let code = `/* Restored by OneOS */
require('oneos').bootstrap(module, ${JSON.stringify(snapshot.meta)}, function(${SCOPE_PREFIX}){

${scopeCode}

${timerCode}

${stdinCode}

})`;

    return code;
}

function bootstrap(local_module, metadata, main){
    /* metadata: { uri, filename }
     * main: the instrumented user program as a function */

    // create root scope object
    let root = new RootScope(local_module, metadata);

    let runtime = require('./Runtime.js');
    runtime.connect(root).then(() => {
        main(root);
    });

    // override global methods

    //return main(root);
}

module.exports = {
    instrument: instrument,
    restore: restore,
    bootstrap: bootstrap
}