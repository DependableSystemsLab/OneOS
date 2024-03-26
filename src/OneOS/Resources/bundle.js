/*!
 * Vue.js v2.6.14
 * (c) 2014-2021 Evan You
 * Released under the MIT License.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (global = global || self, global.Vue = factory());
}(this, function () {
    'use strict';

    /*  */

    var emptyObject = Object.freeze({});

    // These helpers produce better VM code in JS engines due to their
    // explicitness and function inlining.
    function isUndef(v) {
        return v === undefined || v === null
    }

    function isDef(v) {
        return v !== undefined && v !== null
    }

    function isTrue(v) {
        return v === true
    }

    function isFalse(v) {
        return v === false
    }

    /**
     * Check if value is primitive.
     */
    function isPrimitive(value) {
        return (
            typeof value === 'string' ||
            typeof value === 'number' ||
            // $flow-disable-line
            typeof value === 'symbol' ||
            typeof value === 'boolean'
        )
    }

    /**
     * Quick object check - this is primarily used to tell
     * Objects from primitive values when we know the value
     * is a JSON-compliant type.
     */
    function isObject(obj) {
        return obj !== null && typeof obj === 'object'
    }

    /**
     * Get the raw type string of a value, e.g., [object Object].
     */
    var _toString = Object.prototype.toString;

    function toRawType(value) {
        return _toString.call(value).slice(8, -1)
    }

    /**
     * Strict object type check. Only returns true
     * for plain JavaScript objects.
     */
    function isPlainObject(obj) {
        return _toString.call(obj) === '[object Object]'
    }

    function isRegExp(v) {
        return _toString.call(v) === '[object RegExp]'
    }

    /**
     * Check if val is a valid array index.
     */
    function isValidArrayIndex(val) {
        var n = parseFloat(String(val));
        return n >= 0 && Math.floor(n) === n && isFinite(val)
    }

    function isPromise(val) {
        return (
            isDef(val) &&
            typeof val.then === 'function' &&
            typeof val.catch === 'function'
        )
    }

    /**
     * Convert a value to a string that is actually rendered.
     */
    function toString(val) {
        return val == null
            ? ''
            : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString)
                ? JSON.stringify(val, null, 2)
                : String(val)
    }

    /**
     * Convert an input value to a number for persistence.
     * If the conversion fails, return original string.
     */
    function toNumber(val) {
        var n = parseFloat(val);
        return isNaN(n) ? val : n
    }

    /**
     * Make a map and return a function for checking if a key
     * is in that map.
     */
    function makeMap(
        str,
        expectsLowerCase
    ) {
        var map = Object.create(null);
        var list = str.split(',');
        for (var i = 0; i < list.length; i++) {
            map[list[i]] = true;
        }
        return expectsLowerCase
            ? function (val) { return map[val.toLowerCase()]; }
            : function (val) { return map[val]; }
    }

    /**
     * Check if a tag is a built-in tag.
     */
    var isBuiltInTag = makeMap('slot,component', true);

    /**
     * Check if an attribute is a reserved attribute.
     */
    var isReservedAttribute = makeMap('key,ref,slot,slot-scope,is');

    /**
     * Remove an item from an array.
     */
    function remove(arr, item) {
        if (arr.length) {
            var index = arr.indexOf(item);
            if (index > -1) {
                return arr.splice(index, 1)
            }
        }
    }

    /**
     * Check whether an object has the property.
     */
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function hasOwn(obj, key) {
        return hasOwnProperty.call(obj, key)
    }

    /**
     * Create a cached version of a pure function.
     */
    function cached(fn) {
        var cache = Object.create(null);
        return (function cachedFn(str) {
            var hit = cache[str];
            return hit || (cache[str] = fn(str))
        })
    }

    /**
     * Camelize a hyphen-delimited string.
     */
    var camelizeRE = /-(\w)/g;
    var camelize = cached(function (str) {
        return str.replace(camelizeRE, function (_, c) { return c ? c.toUpperCase() : ''; })
    });

    /**
     * Capitalize a string.
     */
    var capitalize = cached(function (str) {
        return str.charAt(0).toUpperCase() + str.slice(1)
    });

    /**
     * Hyphenate a camelCase string.
     */
    var hyphenateRE = /\B([A-Z])/g;
    var hyphenate = cached(function (str) {
        return str.replace(hyphenateRE, '-$1').toLowerCase()
    });

    /**
     * Simple bind polyfill for environments that do not support it,
     * e.g., PhantomJS 1.x. Technically, we don't need this anymore
     * since native bind is now performant enough in most browsers.
     * But removing it would mean breaking code that was able to run in
     * PhantomJS 1.x, so this must be kept for backward compatibility.
     */

    /* istanbul ignore next */
    function polyfillBind(fn, ctx) {
        function boundFn(a) {
            var l = arguments.length;
            return l
                ? l > 1
                    ? fn.apply(ctx, arguments)
                    : fn.call(ctx, a)
                : fn.call(ctx)
        }

        boundFn._length = fn.length;
        return boundFn
    }

    function nativeBind(fn, ctx) {
        return fn.bind(ctx)
    }

    var bind = Function.prototype.bind
        ? nativeBind
        : polyfillBind;

    /**
     * Convert an Array-like object to a real Array.
     */
    function toArray(list, start) {
        start = start || 0;
        var i = list.length - start;
        var ret = new Array(i);
        while (i--) {
            ret[i] = list[i + start];
        }
        return ret
    }

    /**
     * Mix properties into target object.
     */
    function extend(to, _from) {
        for (var key in _from) {
            to[key] = _from[key];
        }
        return to
    }

    /**
     * Merge an Array of Objects into a single Object.
     */
    function toObject(arr) {
        var res = {};
        for (var i = 0; i < arr.length; i++) {
            if (arr[i]) {
                extend(res, arr[i]);
            }
        }
        return res
    }

    /* eslint-disable no-unused-vars */

    /**
     * Perform no operation.
     * Stubbing args to make Flow happy without leaving useless transpiled code
     * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/).
     */
    function noop(a, b, c) { }

    /**
     * Always return false.
     */
    var no = function (a, b, c) { return false; };

    /* eslint-enable no-unused-vars */

    /**
     * Return the same value.
     */
    var identity = function (_) { return _; };

    /**
     * Generate a string containing static keys from compiler modules.
     */
    function genStaticKeys(modules) {
        return modules.reduce(function (keys, m) {
            return keys.concat(m.staticKeys || [])
        }, []).join(',')
    }

    /**
     * Check if two values are loosely equal - that is,
     * if they are plain objects, do they have the same shape?
     */
    function looseEqual(a, b) {
        if (a === b) { return true }
        var isObjectA = isObject(a);
        var isObjectB = isObject(b);
        if (isObjectA && isObjectB) {
            try {
                var isArrayA = Array.isArray(a);
                var isArrayB = Array.isArray(b);
                if (isArrayA && isArrayB) {
                    return a.length === b.length && a.every(function (e, i) {
                        return looseEqual(e, b[i])
                    })
                } else if (a instanceof Date && b instanceof Date) {
                    return a.getTime() === b.getTime()
                } else if (!isArrayA && !isArrayB) {
                    var keysA = Object.keys(a);
                    var keysB = Object.keys(b);
                    return keysA.length === keysB.length && keysA.every(function (key) {
                        return looseEqual(a[key], b[key])
                    })
                } else {
                    /* istanbul ignore next */
                    return false
                }
            } catch (e) {
                /* istanbul ignore next */
                return false
            }
        } else if (!isObjectA && !isObjectB) {
            return String(a) === String(b)
        } else {
            return false
        }
    }

    /**
     * Return the first index at which a loosely equal value can be
     * found in the array (if value is a plain object, the array must
     * contain an object of the same shape), or -1 if it is not present.
     */
    function looseIndexOf(arr, val) {
        for (var i = 0; i < arr.length; i++) {
            if (looseEqual(arr[i], val)) { return i }
        }
        return -1
    }

    /**
     * Ensure a function is called only once.
     */
    function once(fn) {
        var called = false;
        return function () {
            if (!called) {
                called = true;
                fn.apply(this, arguments);
            }
        }
    }

    var SSR_ATTR = 'data-server-rendered';

    var ASSET_TYPES = [
        'component',
        'directive',
        'filter'
    ];

    var LIFECYCLE_HOOKS = [
        'beforeCreate',
        'created',
        'beforeMount',
        'mounted',
        'beforeUpdate',
        'updated',
        'beforeDestroy',
        'destroyed',
        'activated',
        'deactivated',
        'errorCaptured',
        'serverPrefetch'
    ];

    /*  */



    var config = ({
        /**
         * Option merge strategies (used in core/util/options)
         */
        // $flow-disable-line
        optionMergeStrategies: Object.create(null),

        /**
         * Whether to suppress warnings.
         */
        silent: false,

        /**
         * Show production mode tip message on boot?
         */
        productionTip: "development" !== 'production',

        /**
         * Whether to enable devtools
         */
        devtools: "development" !== 'production',

        /**
         * Whether to record perf
         */
        performance: false,

        /**
         * Error handler for watcher errors
         */
        errorHandler: null,

        /**
         * Warn handler for watcher warns
         */
        warnHandler: null,

        /**
         * Ignore certain custom elements
         */
        ignoredElements: [],

        /**
         * Custom user key aliases for v-on
         */
        // $flow-disable-line
        keyCodes: Object.create(null),

        /**
         * Check if a tag is reserved so that it cannot be registered as a
         * component. This is platform-dependent and may be overwritten.
         */
        isReservedTag: no,

        /**
         * Check if an attribute is reserved so that it cannot be used as a component
         * prop. This is platform-dependent and may be overwritten.
         */
        isReservedAttr: no,

        /**
         * Check if a tag is an unknown element.
         * Platform-dependent.
         */
        isUnknownElement: no,

        /**
         * Get the namespace of an element
         */
        getTagNamespace: noop,

        /**
         * Parse the real tag name for the specific platform.
         */
        parsePlatformTagName: identity,

        /**
         * Check if an attribute must be bound using property, e.g. value
         * Platform-dependent.
         */
        mustUseProp: no,

        /**
         * Perform updates asynchronously. Intended to be used by Vue Test Utils
         * This will significantly reduce performance if set to false.
         */
        async: true,

        /**
         * Exposed for legacy reasons
         */
        _lifecycleHooks: LIFECYCLE_HOOKS
    });

    /*  */

    /**
     * unicode letters used for parsing html tags, component names and property paths.
     * using https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname
     * skipping \u10000-\uEFFFF due to it freezing up PhantomJS
     */
    var unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;

    /**
     * Check if a string starts with $ or _
     */
    function isReserved(str) {
        var c = (str + '').charCodeAt(0);
        return c === 0x24 || c === 0x5F
    }

    /**
     * Define a property.
     */
    function def(obj, key, val, enumerable) {
        Object.defineProperty(obj, key, {
            value: val,
            enumerable: !!enumerable,
            writable: true,
            configurable: true
        });
    }

    /**
     * Parse simple path.
     */
    var bailRE = new RegExp(("[^" + (unicodeRegExp.source) + ".$_\\d]"));
    function parsePath(path) {
        if (bailRE.test(path)) {
            return
        }
        var segments = path.split('.');
        return function (obj) {
            for (var i = 0; i < segments.length; i++) {
                if (!obj) { return }
                obj = obj[segments[i]];
            }
            return obj
        }
    }

    /*  */

    // can we use __proto__?
    var hasProto = '__proto__' in {};

    // Browser environment sniffing
    var inBrowser = typeof window !== 'undefined';
    var inWeex = typeof WXEnvironment !== 'undefined' && !!WXEnvironment.platform;
    var weexPlatform = inWeex && WXEnvironment.platform.toLowerCase();
    var UA = inBrowser && window.navigator.userAgent.toLowerCase();
    var isIE = UA && /msie|trident/.test(UA);
    var isIE9 = UA && UA.indexOf('msie 9.0') > 0;
    var isEdge = UA && UA.indexOf('edge/') > 0;
    var isAndroid = (UA && UA.indexOf('android') > 0) || (weexPlatform === 'android');
    var isIOS = (UA && /iphone|ipad|ipod|ios/.test(UA)) || (weexPlatform === 'ios');
    var isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge;
    var isPhantomJS = UA && /phantomjs/.test(UA);
    var isFF = UA && UA.match(/firefox\/(\d+)/);

    // Firefox has a "watch" function on Object.prototype...
    var nativeWatch = ({}).watch;

    var supportsPassive = false;
    if (inBrowser) {
        try {
            var opts = {};
            Object.defineProperty(opts, 'passive', ({
                get: function get() {
                    /* istanbul ignore next */
                    supportsPassive = true;
                }
            })); // https://github.com/facebook/flow/issues/285
            window.addEventListener('test-passive', null, opts);
        } catch (e) { }
    }

    // this needs to be lazy-evaled because vue may be required before
    // vue-server-renderer can set VUE_ENV
    var _isServer;
    var isServerRendering = function () {
        if (_isServer === undefined) {
            /* istanbul ignore if */
            if (!inBrowser && !inWeex && typeof global !== 'undefined') {
                // detect presence of vue-server-renderer and avoid
                // Webpack shimming the process
                _isServer = global['process'] && global['process'].env.VUE_ENV === 'server';
            } else {
                _isServer = false;
            }
        }
        return _isServer
    };

    // detect devtools
    var devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__;

    /* istanbul ignore next */
    function isNative(Ctor) {
        return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
    }

    var hasSymbol =
        typeof Symbol !== 'undefined' && isNative(Symbol) &&
        typeof Reflect !== 'undefined' && isNative(Reflect.ownKeys);

    var _Set;
    /* istanbul ignore if */ // $flow-disable-line
    if (typeof Set !== 'undefined' && isNative(Set)) {
        // use native Set when available.
        _Set = Set;
    } else {
        // a non-standard Set polyfill that only works with primitive keys.
        _Set = /*@__PURE__*/(function () {
            function Set() {
                this.set = Object.create(null);
            }
            Set.prototype.has = function has(key) {
                return this.set[key] === true
            };
            Set.prototype.add = function add(key) {
                this.set[key] = true;
            };
            Set.prototype.clear = function clear() {
                this.set = Object.create(null);
            };

            return Set;
        }());
    }

    /*  */

    var warn = noop;
    var tip = noop;
    var generateComponentTrace = (noop); // work around flow check
    var formatComponentName = (noop);

    {
        var hasConsole = typeof console !== 'undefined';
        var classifyRE = /(?:^|[-_])(\w)/g;
        var classify = function (str) {
            return str
                .replace(classifyRE, function (c) { return c.toUpperCase(); })
                .replace(/[-_]/g, '');
        };

        warn = function (msg, vm) {
            var trace = vm ? generateComponentTrace(vm) : '';

            if (config.warnHandler) {
                config.warnHandler.call(null, msg, vm, trace);
            } else if (hasConsole && (!config.silent)) {
                console.error(("[Vue warn]: " + msg + trace));
            }
        };

        tip = function (msg, vm) {
            if (hasConsole && (!config.silent)) {
                console.warn("[Vue tip]: " + msg + (
                    vm ? generateComponentTrace(vm) : ''
                ));
            }
        };

        formatComponentName = function (vm, includeFile) {
            if (vm.$root === vm) {
                return '<Root>'
            }
            var options = typeof vm === 'function' && vm.cid != null
                ? vm.options
                : vm._isVue
                    ? vm.$options || vm.constructor.options
                    : vm;
            var name = options.name || options._componentTag;
            var file = options.__file;
            if (!name && file) {
                var match = file.match(/([^/\\]+)\.vue$/);
                name = match && match[1];
            }

            return (
                (name ? ("<" + (classify(name)) + ">") : "<Anonymous>") +
                (file && includeFile !== false ? (" at " + file) : '')
            )
        };

        var repeat = function (str, n) {
            var res = '';
            while (n) {
                if (n % 2 === 1) { res += str; }
                if (n > 1) { str += str; }
                n >>= 1;
            }
            return res
        };

        generateComponentTrace = function (vm) {
            if (vm._isVue && vm.$parent) {
                var tree = [];
                var currentRecursiveSequence = 0;
                while (vm) {
                    if (tree.length > 0) {
                        var last = tree[tree.length - 1];
                        if (last.constructor === vm.constructor) {
                            currentRecursiveSequence++;
                            vm = vm.$parent;
                            continue
                        } else if (currentRecursiveSequence > 0) {
                            tree[tree.length - 1] = [last, currentRecursiveSequence];
                            currentRecursiveSequence = 0;
                        }
                    }
                    tree.push(vm);
                    vm = vm.$parent;
                }
                return '\n\nfound in\n\n' + tree
                    .map(function (vm, i) {
                        return ("" + (i === 0 ? '---> ' : repeat(' ', 5 + i * 2)) + (Array.isArray(vm)
                            ? ((formatComponentName(vm[0])) + "... (" + (vm[1]) + " recursive calls)")
                            : formatComponentName(vm)));
                    })
                    .join('\n')
            } else {
                return ("\n\n(found in " + (formatComponentName(vm)) + ")")
            }
        };
    }

    /*  */

    var uid = 0;

    /**
     * A dep is an observable that can have multiple
     * directives subscribing to it.
     */
    var Dep = function Dep() {
        this.id = uid++;
        this.subs = [];
    };

    Dep.prototype.addSub = function addSub(sub) {
        this.subs.push(sub);
    };

    Dep.prototype.removeSub = function removeSub(sub) {
        remove(this.subs, sub);
    };

    Dep.prototype.depend = function depend() {
        if (Dep.target) {
            Dep.target.addDep(this);
        }
    };

    Dep.prototype.notify = function notify() {
        // stabilize the subscriber list first
        var subs = this.subs.slice();
        if (!config.async) {
            // subs aren't sorted in scheduler if not running async
            // we need to sort them now to make sure they fire in correct
            // order
            subs.sort(function (a, b) { return a.id - b.id; });
        }
        for (var i = 0, l = subs.length; i < l; i++) {
            subs[i].update();
        }
    };

    // The current target watcher being evaluated.
    // This is globally unique because only one watcher
    // can be evaluated at a time.
    Dep.target = null;
    var targetStack = [];

    function pushTarget(target) {
        targetStack.push(target);
        Dep.target = target;
    }

    function popTarget() {
        targetStack.pop();
        Dep.target = targetStack[targetStack.length - 1];
    }

    /*  */

    var VNode = function VNode(
        tag,
        data,
        children,
        text,
        elm,
        context,
        componentOptions,
        asyncFactory
    ) {
        this.tag = tag;
        this.data = data;
        this.children = children;
        this.text = text;
        this.elm = elm;
        this.ns = undefined;
        this.context = context;
        this.fnContext = undefined;
        this.fnOptions = undefined;
        this.fnScopeId = undefined;
        this.key = data && data.key;
        this.componentOptions = componentOptions;
        this.componentInstance = undefined;
        this.parent = undefined;
        this.raw = false;
        this.isStatic = false;
        this.isRootInsert = true;
        this.isComment = false;
        this.isCloned = false;
        this.isOnce = false;
        this.asyncFactory = asyncFactory;
        this.asyncMeta = undefined;
        this.isAsyncPlaceholder = false;
    };

    var prototypeAccessors = { child: { configurable: true } };

    // DEPRECATED: alias for componentInstance for backwards compat.
    /* istanbul ignore next */
    prototypeAccessors.child.get = function () {
        return this.componentInstance
    };

    Object.defineProperties(VNode.prototype, prototypeAccessors);

    var createEmptyVNode = function (text) {
        if (text === void 0) text = '';

        var node = new VNode();
        node.text = text;
        node.isComment = true;
        return node
    };

    function createTextVNode(val) {
        return new VNode(undefined, undefined, undefined, String(val))
    }

    // optimized shallow clone
    // used for static nodes and slot nodes because they may be reused across
    // multiple renders, cloning them avoids errors when DOM manipulations rely
    // on their elm reference.
    function cloneVNode(vnode) {
        var cloned = new VNode(
            vnode.tag,
            vnode.data,
            // #7975
            // clone children array to avoid mutating original in case of cloning
            // a child.
            vnode.children && vnode.children.slice(),
            vnode.text,
            vnode.elm,
            vnode.context,
            vnode.componentOptions,
            vnode.asyncFactory
        );
        cloned.ns = vnode.ns;
        cloned.isStatic = vnode.isStatic;
        cloned.key = vnode.key;
        cloned.isComment = vnode.isComment;
        cloned.fnContext = vnode.fnContext;
        cloned.fnOptions = vnode.fnOptions;
        cloned.fnScopeId = vnode.fnScopeId;
        cloned.asyncMeta = vnode.asyncMeta;
        cloned.isCloned = true;
        return cloned
    }

    /*
     * not type checking this file because flow doesn't play well with
     * dynamically accessing methods on Array prototype
     */

    var arrayProto = Array.prototype;
    var arrayMethods = Object.create(arrayProto);

    var methodsToPatch = [
        'push',
        'pop',
        'shift',
        'unshift',
        'splice',
        'sort',
        'reverse'
    ];

    /**
     * Intercept mutating methods and emit events
     */
    methodsToPatch.forEach(function (method) {
        // cache original method
        var original = arrayProto[method];
        def(arrayMethods, method, function mutator() {
            var args = [], len = arguments.length;
            while (len--) args[len] = arguments[len];

            var result = original.apply(this, args);
            var ob = this.__ob__;
            var inserted;
            switch (method) {
                case 'push':
                case 'unshift':
                    inserted = args;
                    break
                case 'splice':
                    inserted = args.slice(2);
                    break
            }
            if (inserted) { ob.observeArray(inserted); }
            // notify change
            ob.dep.notify();
            return result
        });
    });

    /*  */

    var arrayKeys = Object.getOwnPropertyNames(arrayMethods);

    /**
     * In some cases we may want to disable observation inside a component's
     * update computation.
     */
    var shouldObserve = true;

    function toggleObserving(value) {
        shouldObserve = value;
    }

    /**
     * Observer class that is attached to each observed
     * object. Once attached, the observer converts the target
     * object's property keys into getter/setters that
     * collect dependencies and dispatch updates.
     */
    var Observer = function Observer(value) {
        this.value = value;
        this.dep = new Dep();
        this.vmCount = 0;
        def(value, '__ob__', this);
        if (Array.isArray(value)) {
            if (hasProto) {
                protoAugment(value, arrayMethods);
            } else {
                copyAugment(value, arrayMethods, arrayKeys);
            }
            this.observeArray(value);
        } else {
            this.walk(value);
        }
    };

    /**
     * Walk through all properties and convert them into
     * getter/setters. This method should only be called when
     * value type is Object.
     */
    Observer.prototype.walk = function walk(obj) {
        var keys = Object.keys(obj);
        for (var i = 0; i < keys.length; i++) {
            defineReactive$$1(obj, keys[i]);
        }
    };

    /**
     * Observe a list of Array items.
     */
    Observer.prototype.observeArray = function observeArray(items) {
        for (var i = 0, l = items.length; i < l; i++) {
            observe(items[i]);
        }
    };

    // helpers

    /**
     * Augment a target Object or Array by intercepting
     * the prototype chain using __proto__
     */
    function protoAugment(target, src) {
        /* eslint-disable no-proto */
        target.__proto__ = src;
        /* eslint-enable no-proto */
    }

    /**
     * Augment a target Object or Array by defining
     * hidden properties.
     */
    /* istanbul ignore next */
    function copyAugment(target, src, keys) {
        for (var i = 0, l = keys.length; i < l; i++) {
            var key = keys[i];
            def(target, key, src[key]);
        }
    }

    /**
     * Attempt to create an observer instance for a value,
     * returns the new observer if successfully observed,
     * or the existing observer if the value already has one.
     */
    function observe(value, asRootData) {
        if (!isObject(value) || value instanceof VNode) {
            return
        }
        var ob;
        if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
            ob = value.__ob__;
        } else if (
            shouldObserve &&
            !isServerRendering() &&
            (Array.isArray(value) || isPlainObject(value)) &&
            Object.isExtensible(value) &&
            !value._isVue
        ) {
            ob = new Observer(value);
        }
        if (asRootData && ob) {
            ob.vmCount++;
        }
        return ob
    }

    /**
     * Define a reactive property on an Object.
     */
    function defineReactive$$1(
        obj,
        key,
        val,
        customSetter,
        shallow
    ) {
        var dep = new Dep();

        var property = Object.getOwnPropertyDescriptor(obj, key);
        if (property && property.configurable === false) {
            return
        }

        // cater for pre-defined getter/setters
        var getter = property && property.get;
        var setter = property && property.set;
        if ((!getter || setter) && arguments.length === 2) {
            val = obj[key];
        }

        var childOb = !shallow && observe(val);
        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            get: function reactiveGetter() {
                var value = getter ? getter.call(obj) : val;
                if (Dep.target) {
                    dep.depend();
                    if (childOb) {
                        childOb.dep.depend();
                        if (Array.isArray(value)) {
                            dependArray(value);
                        }
                    }
                }
                return value
            },
            set: function reactiveSetter(newVal) {
                var value = getter ? getter.call(obj) : val;
                /* eslint-disable no-self-compare */
                if (newVal === value || (newVal !== newVal && value !== value)) {
                    return
                }
                /* eslint-enable no-self-compare */
                if (customSetter) {
                    customSetter();
                }
                // #7981: for accessor properties without setter
                if (getter && !setter) { return }
                if (setter) {
                    setter.call(obj, newVal);
                } else {
                    val = newVal;
                }
                childOb = !shallow && observe(newVal);
                dep.notify();
            }
        });
    }

    /**
     * Set a property on an object. Adds the new property and
     * triggers change notification if the property doesn't
     * already exist.
     */
    function set(target, key, val) {
        if (isUndef(target) || isPrimitive(target)
        ) {
            warn(("Cannot set reactive property on undefined, null, or primitive value: " + ((target))));
        }
        if (Array.isArray(target) && isValidArrayIndex(key)) {
            target.length = Math.max(target.length, key);
            target.splice(key, 1, val);
            return val
        }
        if (key in target && !(key in Object.prototype)) {
            target[key] = val;
            return val
        }
        var ob = (target).__ob__;
        if (target._isVue || (ob && ob.vmCount)) {
            warn(
                'Avoid adding reactive properties to a Vue instance or its root $data ' +
                'at runtime - declare it upfront in the data option.'
            );
            return val
        }
        if (!ob) {
            target[key] = val;
            return val
        }
        defineReactive$$1(ob.value, key, val);
        ob.dep.notify();
        return val
    }

    /**
     * Delete a property and trigger change if necessary.
     */
    function del(target, key) {
        if (isUndef(target) || isPrimitive(target)
        ) {
            warn(("Cannot delete reactive property on undefined, null, or primitive value: " + ((target))));
        }
        if (Array.isArray(target) && isValidArrayIndex(key)) {
            target.splice(key, 1);
            return
        }
        var ob = (target).__ob__;
        if (target._isVue || (ob && ob.vmCount)) {
            warn(
                'Avoid deleting properties on a Vue instance or its root $data ' +
                '- just set it to null.'
            );
            return
        }
        if (!hasOwn(target, key)) {
            return
        }
        delete target[key];
        if (!ob) {
            return
        }
        ob.dep.notify();
    }

    /**
     * Collect dependencies on array elements when the array is touched, since
     * we cannot intercept array element access like property getters.
     */
    function dependArray(value) {
        for (var e = (void 0), i = 0, l = value.length; i < l; i++) {
            e = value[i];
            e && e.__ob__ && e.__ob__.dep.depend();
            if (Array.isArray(e)) {
                dependArray(e);
            }
        }
    }

    /*  */

    /**
     * Option overwriting strategies are functions that handle
     * how to merge a parent option value and a child option
     * value into the final value.
     */
    var strats = config.optionMergeStrategies;

    /**
     * Options with restrictions
     */
    {
        strats.el = strats.propsData = function (parent, child, vm, key) {
            if (!vm) {
                warn(
                    "option \"" + key + "\" can only be used during instance " +
                    'creation with the `new` keyword.'
                );
            }
            return defaultStrat(parent, child)
        };
    }

    /**
     * Helper that recursively merges two data objects together.
     */
    function mergeData(to, from) {
        if (!from) { return to }
        var key, toVal, fromVal;

        var keys = hasSymbol
            ? Reflect.ownKeys(from)
            : Object.keys(from);

        for (var i = 0; i < keys.length; i++) {
            key = keys[i];
            // in case the object is already observed...
            if (key === '__ob__') { continue }
            toVal = to[key];
            fromVal = from[key];
            if (!hasOwn(to, key)) {
                set(to, key, fromVal);
            } else if (
                toVal !== fromVal &&
                isPlainObject(toVal) &&
                isPlainObject(fromVal)
            ) {
                mergeData(toVal, fromVal);
            }
        }
        return to
    }

    /**
     * Data
     */
    function mergeDataOrFn(
        parentVal,
        childVal,
        vm
    ) {
        if (!vm) {
            // in a Vue.extend merge, both should be functions
            if (!childVal) {
                return parentVal
            }
            if (!parentVal) {
                return childVal
            }
            // when parentVal & childVal are both present,
            // we need to return a function that returns the
            // merged result of both functions... no need to
            // check if parentVal is a function here because
            // it has to be a function to pass previous merges.
            return function mergedDataFn() {
                return mergeData(
                    typeof childVal === 'function' ? childVal.call(this, this) : childVal,
                    typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
                )
            }
        } else {
            return function mergedInstanceDataFn() {
                // instance merge
                var instanceData = typeof childVal === 'function'
                    ? childVal.call(vm, vm)
                    : childVal;
                var defaultData = typeof parentVal === 'function'
                    ? parentVal.call(vm, vm)
                    : parentVal;
                if (instanceData) {
                    return mergeData(instanceData, defaultData)
                } else {
                    return defaultData
                }
            }
        }
    }

    strats.data = function (
        parentVal,
        childVal,
        vm
    ) {
        if (!vm) {
            if (childVal && typeof childVal !== 'function') {
                warn(
                    'The "data" option should be a function ' +
                    'that returns a per-instance value in component ' +
                    'definitions.',
                    vm
                );

                return parentVal
            }
            return mergeDataOrFn(parentVal, childVal)
        }

        return mergeDataOrFn(parentVal, childVal, vm)
    };

    /**
     * Hooks and props are merged as arrays.
     */
    function mergeHook(
        parentVal,
        childVal
    ) {
        var res = childVal
            ? parentVal
                ? parentVal.concat(childVal)
                : Array.isArray(childVal)
                    ? childVal
                    : [childVal]
            : parentVal;
        return res
            ? dedupeHooks(res)
            : res
    }

    function dedupeHooks(hooks) {
        var res = [];
        for (var i = 0; i < hooks.length; i++) {
            if (res.indexOf(hooks[i]) === -1) {
                res.push(hooks[i]);
            }
        }
        return res
    }

    LIFECYCLE_HOOKS.forEach(function (hook) {
        strats[hook] = mergeHook;
    });

    /**
     * Assets
     *
     * When a vm is present (instance creation), we need to do
     * a three-way merge between constructor options, instance
     * options and parent options.
     */
    function mergeAssets(
        parentVal,
        childVal,
        vm,
        key
    ) {
        var res = Object.create(parentVal || null);
        if (childVal) {
            assertObjectType(key, childVal, vm);
            return extend(res, childVal)
        } else {
            return res
        }
    }

    ASSET_TYPES.forEach(function (type) {
        strats[type + 's'] = mergeAssets;
    });

    /**
     * Watchers.
     *
     * Watchers hashes should not overwrite one
     * another, so we merge them as arrays.
     */
    strats.watch = function (
        parentVal,
        childVal,
        vm,
        key
    ) {
        // work around Firefox's Object.prototype.watch...
        if (parentVal === nativeWatch) { parentVal = undefined; }
        if (childVal === nativeWatch) { childVal = undefined; }
        /* istanbul ignore if */
        if (!childVal) { return Object.create(parentVal || null) }
        {
            assertObjectType(key, childVal, vm);
        }
        if (!parentVal) { return childVal }
        var ret = {};
        extend(ret, parentVal);
        for (var key$1 in childVal) {
            var parent = ret[key$1];
            var child = childVal[key$1];
            if (parent && !Array.isArray(parent)) {
                parent = [parent];
            }
            ret[key$1] = parent
                ? parent.concat(child)
                : Array.isArray(child) ? child : [child];
        }
        return ret
    };

    /**
     * Other object hashes.
     */
    strats.props =
        strats.methods =
        strats.inject =
        strats.computed = function (
            parentVal,
            childVal,
            vm,
            key
        ) {
            if (childVal && "development" !== 'production') {
                assertObjectType(key, childVal, vm);
            }
            if (!parentVal) { return childVal }
            var ret = Object.create(null);
            extend(ret, parentVal);
            if (childVal) { extend(ret, childVal); }
            return ret
        };
    strats.provide = mergeDataOrFn;

    /**
     * Default strategy.
     */
    var defaultStrat = function (parentVal, childVal) {
        return childVal === undefined
            ? parentVal
            : childVal
    };

    /**
     * Validate component names
     */
    function checkComponents(options) {
        for (var key in options.components) {
            validateComponentName(key);
        }
    }

    function validateComponentName(name) {
        if (!new RegExp(("^[a-zA-Z][\\-\\.0-9_" + (unicodeRegExp.source) + "]*$")).test(name)) {
            warn(
                'Invalid component name: "' + name + '". Component names ' +
                'should conform to valid custom element name in html5 specification.'
            );
        }
        if (isBuiltInTag(name) || config.isReservedTag(name)) {
            warn(
                'Do not use built-in or reserved HTML elements as component ' +
                'id: ' + name
            );
        }
    }

    /**
     * Ensure all props option syntax are normalized into the
     * Object-based format.
     */
    function normalizeProps(options, vm) {
        var props = options.props;
        if (!props) { return }
        var res = {};
        var i, val, name;
        if (Array.isArray(props)) {
            i = props.length;
            while (i--) {
                val = props[i];
                if (typeof val === 'string') {
                    name = camelize(val);
                    res[name] = { type: null };
                } else {
                    warn('props must be strings when using array syntax.');
                }
            }
        } else if (isPlainObject(props)) {
            for (var key in props) {
                val = props[key];
                name = camelize(key);
                res[name] = isPlainObject(val)
                    ? val
                    : { type: val };
            }
        } else {
            warn(
                "Invalid value for option \"props\": expected an Array or an Object, " +
                "but got " + (toRawType(props)) + ".",
                vm
            );
        }
        options.props = res;
    }

    /**
     * Normalize all injections into Object-based format
     */
    function normalizeInject(options, vm) {
        var inject = options.inject;
        if (!inject) { return }
        var normalized = options.inject = {};
        if (Array.isArray(inject)) {
            for (var i = 0; i < inject.length; i++) {
                normalized[inject[i]] = { from: inject[i] };
            }
        } else if (isPlainObject(inject)) {
            for (var key in inject) {
                var val = inject[key];
                normalized[key] = isPlainObject(val)
                    ? extend({ from: key }, val)
                    : { from: val };
            }
        } else {
            warn(
                "Invalid value for option \"inject\": expected an Array or an Object, " +
                "but got " + (toRawType(inject)) + ".",
                vm
            );
        }
    }

    /**
     * Normalize raw function directives into object format.
     */
    function normalizeDirectives(options) {
        var dirs = options.directives;
        if (dirs) {
            for (var key in dirs) {
                var def$$1 = dirs[key];
                if (typeof def$$1 === 'function') {
                    dirs[key] = { bind: def$$1, update: def$$1 };
                }
            }
        }
    }

    function assertObjectType(name, value, vm) {
        if (!isPlainObject(value)) {
            warn(
                "Invalid value for option \"" + name + "\": expected an Object, " +
                "but got " + (toRawType(value)) + ".",
                vm
            );
        }
    }

    /**
     * Merge two option objects into a new one.
     * Core utility used in both instantiation and inheritance.
     */
    function mergeOptions(
        parent,
        child,
        vm
    ) {
        {
            checkComponents(child);
        }

        if (typeof child === 'function') {
            child = child.options;
        }

        normalizeProps(child, vm);
        normalizeInject(child, vm);
        normalizeDirectives(child);

        // Apply extends and mixins on the child options,
        // but only if it is a raw options object that isn't
        // the result of another mergeOptions call.
        // Only merged options has the _base property.
        if (!child._base) {
            if (child.extends) {
                parent = mergeOptions(parent, child.extends, vm);
            }
            if (child.mixins) {
                for (var i = 0, l = child.mixins.length; i < l; i++) {
                    parent = mergeOptions(parent, child.mixins[i], vm);
                }
            }
        }

        var options = {};
        var key;
        for (key in parent) {
            mergeField(key);
        }
        for (key in child) {
            if (!hasOwn(parent, key)) {
                mergeField(key);
            }
        }
        function mergeField(key) {
            var strat = strats[key] || defaultStrat;
            options[key] = strat(parent[key], child[key], vm, key);
        }
        return options
    }

    /**
     * Resolve an asset.
     * This function is used because child instances need access
     * to assets defined in its ancestor chain.
     */
    function resolveAsset(
        options,
        type,
        id,
        warnMissing
    ) {
        /* istanbul ignore if */
        if (typeof id !== 'string') {
            return
        }
        var assets = options[type];
        // check local registration variations first
        if (hasOwn(assets, id)) { return assets[id] }
        var camelizedId = camelize(id);
        if (hasOwn(assets, camelizedId)) { return assets[camelizedId] }
        var PascalCaseId = capitalize(camelizedId);
        if (hasOwn(assets, PascalCaseId)) { return assets[PascalCaseId] }
        // fallback to prototype chain
        var res = assets[id] || assets[camelizedId] || assets[PascalCaseId];
        if (warnMissing && !res) {
            warn(
                'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
                options
            );
        }
        return res
    }

    /*  */



    function validateProp(
        key,
        propOptions,
        propsData,
        vm
    ) {
        var prop = propOptions[key];
        var absent = !hasOwn(propsData, key);
        var value = propsData[key];
        // boolean casting
        var booleanIndex = getTypeIndex(Boolean, prop.type);
        if (booleanIndex > -1) {
            if (absent && !hasOwn(prop, 'default')) {
                value = false;
            } else if (value === '' || value === hyphenate(key)) {
                // only cast empty string / same name to boolean if
                // boolean has higher priority
                var stringIndex = getTypeIndex(String, prop.type);
                if (stringIndex < 0 || booleanIndex < stringIndex) {
                    value = true;
                }
            }
        }
        // check default value
        if (value === undefined) {
            value = getPropDefaultValue(vm, prop, key);
            // since the default value is a fresh copy,
            // make sure to observe it.
            var prevShouldObserve = shouldObserve;
            toggleObserving(true);
            observe(value);
            toggleObserving(prevShouldObserve);
        }
        {
            assertProp(prop, key, value, vm, absent);
        }
        return value
    }

    /**
     * Get the default value of a prop.
     */
    function getPropDefaultValue(vm, prop, key) {
        // no default, return undefined
        if (!hasOwn(prop, 'default')) {
            return undefined
        }
        var def = prop.default;
        // warn against non-factory defaults for Object & Array
        if (isObject(def)) {
            warn(
                'Invalid default value for prop "' + key + '": ' +
                'Props with type Object/Array must use a factory function ' +
                'to return the default value.',
                vm
            );
        }
        // the raw prop value was also undefined from previous render,
        // return previous default value to avoid unnecessary watcher trigger
        if (vm && vm.$options.propsData &&
            vm.$options.propsData[key] === undefined &&
            vm._props[key] !== undefined
        ) {
            return vm._props[key]
        }
        // call factory function for non-Function types
        // a value is Function if its prototype is function even across different execution context
        return typeof def === 'function' && getType(prop.type) !== 'Function'
            ? def.call(vm)
            : def
    }

    /**
     * Assert whether a prop is valid.
     */
    function assertProp(
        prop,
        name,
        value,
        vm,
        absent
    ) {
        if (prop.required && absent) {
            warn(
                'Missing required prop: "' + name + '"',
                vm
            );
            return
        }
        if (value == null && !prop.required) {
            return
        }
        var type = prop.type;
        var valid = !type || type === true;
        var expectedTypes = [];
        if (type) {
            if (!Array.isArray(type)) {
                type = [type];
            }
            for (var i = 0; i < type.length && !valid; i++) {
                var assertedType = assertType(value, type[i], vm);
                expectedTypes.push(assertedType.expectedType || '');
                valid = assertedType.valid;
            }
        }

        var haveExpectedTypes = expectedTypes.some(function (t) { return t; });
        if (!valid && haveExpectedTypes) {
            warn(
                getInvalidTypeMessage(name, value, expectedTypes),
                vm
            );
            return
        }
        var validator = prop.validator;
        if (validator) {
            if (!validator(value)) {
                warn(
                    'Invalid prop: custom validator check failed for prop "' + name + '".',
                    vm
                );
            }
        }
    }

    var simpleCheckRE = /^(String|Number|Boolean|Function|Symbol|BigInt)$/;

    function assertType(value, type, vm) {
        var valid;
        var expectedType = getType(type);
        if (simpleCheckRE.test(expectedType)) {
            var t = typeof value;
            valid = t === expectedType.toLowerCase();
            // for primitive wrapper objects
            if (!valid && t === 'object') {
                valid = value instanceof type;
            }
        } else if (expectedType === 'Object') {
            valid = isPlainObject(value);
        } else if (expectedType === 'Array') {
            valid = Array.isArray(value);
        } else {
            try {
                valid = value instanceof type;
            } catch (e) {
                warn('Invalid prop type: "' + String(type) + '" is not a constructor', vm);
                valid = false;
            }
        }
        return {
            valid: valid,
            expectedType: expectedType
        }
    }

    var functionTypeCheckRE = /^\s*function (\w+)/;

    /**
     * Use function string name to check built-in types,
     * because a simple equality check will fail when running
     * across different vms / iframes.
     */
    function getType(fn) {
        var match = fn && fn.toString().match(functionTypeCheckRE);
        return match ? match[1] : ''
    }

    function isSameType(a, b) {
        return getType(a) === getType(b)
    }

    function getTypeIndex(type, expectedTypes) {
        if (!Array.isArray(expectedTypes)) {
            return isSameType(expectedTypes, type) ? 0 : -1
        }
        for (var i = 0, len = expectedTypes.length; i < len; i++) {
            if (isSameType(expectedTypes[i], type)) {
                return i
            }
        }
        return -1
    }

    function getInvalidTypeMessage(name, value, expectedTypes) {
        var message = "Invalid prop: type check failed for prop \"" + name + "\"." +
            " Expected " + (expectedTypes.map(capitalize).join(', '));
        var expectedType = expectedTypes[0];
        var receivedType = toRawType(value);
        // check if we need to specify expected value
        if (
            expectedTypes.length === 1 &&
            isExplicable(expectedType) &&
            isExplicable(typeof value) &&
            !isBoolean(expectedType, receivedType)
        ) {
            message += " with value " + (styleValue(value, expectedType));
        }
        message += ", got " + receivedType + " ";
        // check if we need to specify received value
        if (isExplicable(receivedType)) {
            message += "with value " + (styleValue(value, receivedType)) + ".";
        }
        return message
    }

    function styleValue(value, type) {
        if (type === 'String') {
            return ("\"" + value + "\"")
        } else if (type === 'Number') {
            return ("" + (Number(value)))
        } else {
            return ("" + value)
        }
    }

    var EXPLICABLE_TYPES = ['string', 'number', 'boolean'];
    function isExplicable(value) {
        return EXPLICABLE_TYPES.some(function (elem) { return value.toLowerCase() === elem; })
    }

    function isBoolean() {
        var args = [], len = arguments.length;
        while (len--) args[len] = arguments[len];

        return args.some(function (elem) { return elem.toLowerCase() === 'boolean'; })
    }

    /*  */

    function handleError(err, vm, info) {
        // Deactivate deps tracking while processing error handler to avoid possible infinite rendering.
        // See: https://github.com/vuejs/vuex/issues/1505
        pushTarget();
        try {
            if (vm) {
                var cur = vm;
                while ((cur = cur.$parent)) {
                    var hooks = cur.$options.errorCaptured;
                    if (hooks) {
                        for (var i = 0; i < hooks.length; i++) {
                            try {
                                var capture = hooks[i].call(cur, err, vm, info) === false;
                                if (capture) { return }
                            } catch (e) {
                                globalHandleError(e, cur, 'errorCaptured hook');
                            }
                        }
                    }
                }
            }
            globalHandleError(err, vm, info);
        } finally {
            popTarget();
        }
    }

    function invokeWithErrorHandling(
        handler,
        context,
        args,
        vm,
        info
    ) {
        var res;
        try {
            res = args ? handler.apply(context, args) : handler.call(context);
            if (res && !res._isVue && isPromise(res) && !res._handled) {
                res.catch(function (e) { return handleError(e, vm, info + " (Promise/async)"); });
                // issue #9511
                // avoid catch triggering multiple times when nested calls
                res._handled = true;
            }
        } catch (e) {
            handleError(e, vm, info);
        }
        return res
    }

    function globalHandleError(err, vm, info) {
        if (config.errorHandler) {
            try {
                return config.errorHandler.call(null, err, vm, info)
            } catch (e) {
                // if the user intentionally throws the original error in the handler,
                // do not log it twice
                if (e !== err) {
                    logError(e, null, 'config.errorHandler');
                }
            }
        }
        logError(err, vm, info);
    }

    function logError(err, vm, info) {
        {
            warn(("Error in " + info + ": \"" + (err.toString()) + "\""), vm);
        }
        /* istanbul ignore else */
        if ((inBrowser || inWeex) && typeof console !== 'undefined') {
            console.error(err);
        } else {
            throw err
        }
    }

    /*  */

    var isUsingMicroTask = false;

    var callbacks = [];
    var pending = false;

    function flushCallbacks() {
        pending = false;
        var copies = callbacks.slice(0);
        callbacks.length = 0;
        for (var i = 0; i < copies.length; i++) {
            copies[i]();
        }
    }

    // Here we have async deferring wrappers using microtasks.
    // In 2.5 we used (macro) tasks (in combination with microtasks).
    // However, it has subtle problems when state is changed right before repaint
    // (e.g. #6813, out-in transitions).
    // Also, using (macro) tasks in event handler would cause some weird behaviors
    // that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
    // So we now use microtasks everywhere, again.
    // A major drawback of this tradeoff is that there are some scenarios
    // where microtasks have too high a priority and fire in between supposedly
    // sequential events (e.g. #4521, #6690, which have workarounds)
    // or even between bubbling of the same event (#6566).
    var timerFunc;

    // The nextTick behavior leverages the microtask queue, which can be accessed
    // via either native Promise.then or MutationObserver.
    // MutationObserver has wider support, however it is seriously bugged in
    // UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
    // completely stops working after triggering a few times... so, if native
    // Promise is available, we will use it:
    /* istanbul ignore next, $flow-disable-line */
    if (typeof Promise !== 'undefined' && isNative(Promise)) {
        var p = Promise.resolve();
        timerFunc = function () {
            p.then(flushCallbacks);
            // In problematic UIWebViews, Promise.then doesn't completely break, but
            // it can get stuck in a weird state where callbacks are pushed into the
            // microtask queue but the queue isn't being flushed, until the browser
            // needs to do some other work, e.g. handle a timer. Therefore we can
            // "force" the microtask queue to be flushed by adding an empty timer.
            if (isIOS) { setTimeout(noop); }
        };
        isUsingMicroTask = true;
    } else if (!isIE && typeof MutationObserver !== 'undefined' && (
        isNative(MutationObserver) ||
        // PhantomJS and iOS 7.x
        MutationObserver.toString() === '[object MutationObserverConstructor]'
    )) {
        // Use MutationObserver where native Promise is not available,
        // e.g. PhantomJS, iOS7, Android 4.4
        // (#6466 MutationObserver is unreliable in IE11)
        var counter = 1;
        var observer = new MutationObserver(flushCallbacks);
        var textNode = document.createTextNode(String(counter));
        observer.observe(textNode, {
            characterData: true
        });
        timerFunc = function () {
            counter = (counter + 1) % 2;
            textNode.data = String(counter);
        };
        isUsingMicroTask = true;
    } else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
        // Fallback to setImmediate.
        // Technically it leverages the (macro) task queue,
        // but it is still a better choice than setTimeout.
        timerFunc = function () {
            setImmediate(flushCallbacks);
        };
    } else {
        // Fallback to setTimeout.
        timerFunc = function () {
            setTimeout(flushCallbacks, 0);
        };
    }

    function nextTick(cb, ctx) {
        var _resolve;
        callbacks.push(function () {
            if (cb) {
                try {
                    cb.call(ctx);
                } catch (e) {
                    handleError(e, ctx, 'nextTick');
                }
            } else if (_resolve) {
                _resolve(ctx);
            }
        });
        if (!pending) {
            pending = true;
            timerFunc();
        }
        // $flow-disable-line
        if (!cb && typeof Promise !== 'undefined') {
            return new Promise(function (resolve) {
                _resolve = resolve;
            })
        }
    }

    /*  */

    var mark;
    var measure;

    {
        var perf = inBrowser && window.performance;
        /* istanbul ignore if */
        if (
            perf &&
            perf.mark &&
            perf.measure &&
            perf.clearMarks &&
            perf.clearMeasures
        ) {
            mark = function (tag) { return perf.mark(tag); };
            measure = function (name, startTag, endTag) {
                perf.measure(name, startTag, endTag);
                perf.clearMarks(startTag);
                perf.clearMarks(endTag);
                // perf.clearMeasures(name)
            };
        }
    }

    /* not type checking this file because flow doesn't play well with Proxy */

    var initProxy;

    {
        var allowedGlobals = makeMap(
            'Infinity,undefined,NaN,isFinite,isNaN,' +
            'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
            'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,BigInt,' +
            'require' // for Webpack/Browserify
        );

        var warnNonPresent = function (target, key) {
            warn(
                "Property or method \"" + key + "\" is not defined on the instance but " +
                'referenced during render. Make sure that this property is reactive, ' +
                'either in the data option, or for class-based components, by ' +
                'initializing the property. ' +
                'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
                target
            );
        };

        var warnReservedPrefix = function (target, key) {
            warn(
                "Property \"" + key + "\" must be accessed with \"$data." + key + "\" because " +
                'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
                'prevent conflicts with Vue internals. ' +
                'See: https://vuejs.org/v2/api/#data',
                target
            );
        };

        var hasProxy =
            typeof Proxy !== 'undefined' && isNative(Proxy);

        if (hasProxy) {
            var isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact');
            config.keyCodes = new Proxy(config.keyCodes, {
                set: function set(target, key, value) {
                    if (isBuiltInModifier(key)) {
                        warn(("Avoid overwriting built-in modifier in config.keyCodes: ." + key));
                        return false
                    } else {
                        target[key] = value;
                        return true
                    }
                }
            });
        }

        var hasHandler = {
            has: function has(target, key) {
                var has = key in target;
                var isAllowed = allowedGlobals(key) ||
                    (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data));
                if (!has && !isAllowed) {
                    if (key in target.$data) { warnReservedPrefix(target, key); }
                    else { warnNonPresent(target, key); }
                }
                return has || !isAllowed
            }
        };

        var getHandler = {
            get: function get(target, key) {
                if (typeof key === 'string' && !(key in target)) {
                    if (key in target.$data) { warnReservedPrefix(target, key); }
                    else { warnNonPresent(target, key); }
                }
                return target[key]
            }
        };

        initProxy = function initProxy(vm) {
            if (hasProxy) {
                // determine which proxy handler to use
                var options = vm.$options;
                var handlers = options.render && options.render._withStripped
                    ? getHandler
                    : hasHandler;
                vm._renderProxy = new Proxy(vm, handlers);
            } else {
                vm._renderProxy = vm;
            }
        };
    }

    /*  */

    var seenObjects = new _Set();

    /**
     * Recursively traverse an object to evoke all converted
     * getters, so that every nested property inside the object
     * is collected as a "deep" dependency.
     */
    function traverse(val) {
        _traverse(val, seenObjects);
        seenObjects.clear();
    }

    function _traverse(val, seen) {
        var i, keys;
        var isA = Array.isArray(val);
        if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
            return
        }
        if (val.__ob__) {
            var depId = val.__ob__.dep.id;
            if (seen.has(depId)) {
                return
            }
            seen.add(depId);
        }
        if (isA) {
            i = val.length;
            while (i--) { _traverse(val[i], seen); }
        } else {
            keys = Object.keys(val);
            i = keys.length;
            while (i--) { _traverse(val[keys[i]], seen); }
        }
    }

    /*  */

    var normalizeEvent = cached(function (name) {
        var passive = name.charAt(0) === '&';
        name = passive ? name.slice(1) : name;
        var once$$1 = name.charAt(0) === '~'; // Prefixed last, checked first
        name = once$$1 ? name.slice(1) : name;
        var capture = name.charAt(0) === '!';
        name = capture ? name.slice(1) : name;
        return {
            name: name,
            once: once$$1,
            capture: capture,
            passive: passive
        }
    });

    function createFnInvoker(fns, vm) {
        function invoker() {
            var arguments$1 = arguments;

            var fns = invoker.fns;
            if (Array.isArray(fns)) {
                var cloned = fns.slice();
                for (var i = 0; i < cloned.length; i++) {
                    invokeWithErrorHandling(cloned[i], null, arguments$1, vm, "v-on handler");
                }
            } else {
                // return handler return value for single handlers
                return invokeWithErrorHandling(fns, null, arguments, vm, "v-on handler")
            }
        }
        invoker.fns = fns;
        return invoker
    }

    function updateListeners(
        on,
        oldOn,
        add,
        remove$$1,
        createOnceHandler,
        vm
    ) {
        var name, def$$1, cur, old, event;
        for (name in on) {
            def$$1 = cur = on[name];
            old = oldOn[name];
            event = normalizeEvent(name);
            if (isUndef(cur)) {
                warn(
                    "Invalid handler for event \"" + (event.name) + "\": got " + String(cur),
                    vm
                );
            } else if (isUndef(old)) {
                if (isUndef(cur.fns)) {
                    cur = on[name] = createFnInvoker(cur, vm);
                }
                if (isTrue(event.once)) {
                    cur = on[name] = createOnceHandler(event.name, cur, event.capture);
                }
                add(event.name, cur, event.capture, event.passive, event.params);
            } else if (cur !== old) {
                old.fns = cur;
                on[name] = old;
            }
        }
        for (name in oldOn) {
            if (isUndef(on[name])) {
                event = normalizeEvent(name);
                remove$$1(event.name, oldOn[name], event.capture);
            }
        }
    }

    /*  */

    function mergeVNodeHook(def, hookKey, hook) {
        if (def instanceof VNode) {
            def = def.data.hook || (def.data.hook = {});
        }
        var invoker;
        var oldHook = def[hookKey];

        function wrappedHook() {
            hook.apply(this, arguments);
            // important: remove merged hook to ensure it's called only once
            // and prevent memory leak
            remove(invoker.fns, wrappedHook);
        }

        if (isUndef(oldHook)) {
            // no existing hook
            invoker = createFnInvoker([wrappedHook]);
        } else {
            /* istanbul ignore if */
            if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
                // already a merged invoker
                invoker = oldHook;
                invoker.fns.push(wrappedHook);
            } else {
                // existing plain hook
                invoker = createFnInvoker([oldHook, wrappedHook]);
            }
        }

        invoker.merged = true;
        def[hookKey] = invoker;
    }

    /*  */

    function extractPropsFromVNodeData(
        data,
        Ctor,
        tag
    ) {
        // we are only extracting raw values here.
        // validation and default values are handled in the child
        // component itself.
        var propOptions = Ctor.options.props;
        if (isUndef(propOptions)) {
            return
        }
        var res = {};
        var attrs = data.attrs;
        var props = data.props;
        if (isDef(attrs) || isDef(props)) {
            for (var key in propOptions) {
                var altKey = hyphenate(key);
                {
                    var keyInLowerCase = key.toLowerCase();
                    if (
                        key !== keyInLowerCase &&
                        attrs && hasOwn(attrs, keyInLowerCase)
                    ) {
                        tip(
                            "Prop \"" + keyInLowerCase + "\" is passed to component " +
                            (formatComponentName(tag || Ctor)) + ", but the declared prop name is" +
                            " \"" + key + "\". " +
                            "Note that HTML attributes are case-insensitive and camelCased " +
                            "props need to use their kebab-case equivalents when using in-DOM " +
                            "templates. You should probably use \"" + altKey + "\" instead of \"" + key + "\"."
                        );
                    }
                }
                checkProp(res, props, key, altKey, true) ||
                    checkProp(res, attrs, key, altKey, false);
            }
        }
        return res
    }

    function checkProp(
        res,
        hash,
        key,
        altKey,
        preserve
    ) {
        if (isDef(hash)) {
            if (hasOwn(hash, key)) {
                res[key] = hash[key];
                if (!preserve) {
                    delete hash[key];
                }
                return true
            } else if (hasOwn(hash, altKey)) {
                res[key] = hash[altKey];
                if (!preserve) {
                    delete hash[altKey];
                }
                return true
            }
        }
        return false
    }

    /*  */

    // The template compiler attempts to minimize the need for normalization by
    // statically analyzing the template at compile time.
    //
    // For plain HTML markup, normalization can be completely skipped because the
    // generated render function is guaranteed to return Array<VNode>. There are
    // two cases where extra normalization is needed:

    // 1. When the children contains components - because a functional component
    // may return an Array instead of a single root. In this case, just a simple
    // normalization is needed - if any child is an Array, we flatten the whole
    // thing with Array.prototype.concat. It is guaranteed to be only 1-level deep
    // because functional components already normalize their own children.
    function simpleNormalizeChildren(children) {
        for (var i = 0; i < children.length; i++) {
            if (Array.isArray(children[i])) {
                return Array.prototype.concat.apply([], children)
            }
        }
        return children
    }

    // 2. When the children contains constructs that always generated nested Arrays,
    // e.g. <template>, <slot>, v-for, or when the children is provided by user
    // with hand-written render functions / JSX. In such cases a full normalization
    // is needed to cater to all possible types of children values.
    function normalizeChildren(children) {
        return isPrimitive(children)
            ? [createTextVNode(children)]
            : Array.isArray(children)
                ? normalizeArrayChildren(children)
                : undefined
    }

    function isTextNode(node) {
        return isDef(node) && isDef(node.text) && isFalse(node.isComment)
    }

    function normalizeArrayChildren(children, nestedIndex) {
        var res = [];
        var i, c, lastIndex, last;
        for (i = 0; i < children.length; i++) {
            c = children[i];
            if (isUndef(c) || typeof c === 'boolean') { continue }
            lastIndex = res.length - 1;
            last = res[lastIndex];
            //  nested
            if (Array.isArray(c)) {
                if (c.length > 0) {
                    c = normalizeArrayChildren(c, ((nestedIndex || '') + "_" + i));
                    // merge adjacent text nodes
                    if (isTextNode(c[0]) && isTextNode(last)) {
                        res[lastIndex] = createTextVNode(last.text + (c[0]).text);
                        c.shift();
                    }
                    res.push.apply(res, c);
                }
            } else if (isPrimitive(c)) {
                if (isTextNode(last)) {
                    // merge adjacent text nodes
                    // this is necessary for SSR hydration because text nodes are
                    // essentially merged when rendered to HTML strings
                    res[lastIndex] = createTextVNode(last.text + c);
                } else if (c !== '') {
                    // convert primitive to vnode
                    res.push(createTextVNode(c));
                }
            } else {
                if (isTextNode(c) && isTextNode(last)) {
                    // merge adjacent text nodes
                    res[lastIndex] = createTextVNode(last.text + c.text);
                } else {
                    // default key for nested array children (likely generated by v-for)
                    if (isTrue(children._isVList) &&
                        isDef(c.tag) &&
                        isUndef(c.key) &&
                        isDef(nestedIndex)) {
                        c.key = "__vlist" + nestedIndex + "_" + i + "__";
                    }
                    res.push(c);
                }
            }
        }
        return res
    }

    /*  */

    function initProvide(vm) {
        var provide = vm.$options.provide;
        if (provide) {
            vm._provided = typeof provide === 'function'
                ? provide.call(vm)
                : provide;
        }
    }

    function initInjections(vm) {
        var result = resolveInject(vm.$options.inject, vm);
        if (result) {
            toggleObserving(false);
            Object.keys(result).forEach(function (key) {
                /* istanbul ignore else */
                {
                    defineReactive$$1(vm, key, result[key], function () {
                        warn(
                            "Avoid mutating an injected value directly since the changes will be " +
                            "overwritten whenever the provided component re-renders. " +
                            "injection being mutated: \"" + key + "\"",
                            vm
                        );
                    });
                }
            });
            toggleObserving(true);
        }
    }

    function resolveInject(inject, vm) {
        if (inject) {
            // inject is :any because flow is not smart enough to figure out cached
            var result = Object.create(null);
            var keys = hasSymbol
                ? Reflect.ownKeys(inject)
                : Object.keys(inject);

            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                // #6574 in case the inject object is observed...
                if (key === '__ob__') { continue }
                var provideKey = inject[key].from;
                var source = vm;
                while (source) {
                    if (source._provided && hasOwn(source._provided, provideKey)) {
                        result[key] = source._provided[provideKey];
                        break
                    }
                    source = source.$parent;
                }
                if (!source) {
                    if ('default' in inject[key]) {
                        var provideDefault = inject[key].default;
                        result[key] = typeof provideDefault === 'function'
                            ? provideDefault.call(vm)
                            : provideDefault;
                    } else {
                        warn(("Injection \"" + key + "\" not found"), vm);
                    }
                }
            }
            return result
        }
    }

    /*  */



    /**
     * Runtime helper for resolving raw children VNodes into a slot object.
     */
    function resolveSlots(
        children,
        context
    ) {
        if (!children || !children.length) {
            return {}
        }
        var slots = {};
        for (var i = 0, l = children.length; i < l; i++) {
            var child = children[i];
            var data = child.data;
            // remove slot attribute if the node is resolved as a Vue slot node
            if (data && data.attrs && data.attrs.slot) {
                delete data.attrs.slot;
            }
            // named slots should only be respected if the vnode was rendered in the
            // same context.
            if ((child.context === context || child.fnContext === context) &&
                data && data.slot != null
            ) {
                var name = data.slot;
                var slot = (slots[name] || (slots[name] = []));
                if (child.tag === 'template') {
                    slot.push.apply(slot, child.children || []);
                } else {
                    slot.push(child);
                }
            } else {
                (slots.default || (slots.default = [])).push(child);
            }
        }
        // ignore slots that contains only whitespace
        for (var name$1 in slots) {
            if (slots[name$1].every(isWhitespace)) {
                delete slots[name$1];
            }
        }
        return slots
    }

    function isWhitespace(node) {
        return (node.isComment && !node.asyncFactory) || node.text === ' '
    }

    /*  */

    function isAsyncPlaceholder(node) {
        return node.isComment && node.asyncFactory
    }

    /*  */

    function normalizeScopedSlots(
        slots,
        normalSlots,
        prevSlots
    ) {
        var res;
        var hasNormalSlots = Object.keys(normalSlots).length > 0;
        var isStable = slots ? !!slots.$stable : !hasNormalSlots;
        var key = slots && slots.$key;
        if (!slots) {
            res = {};
        } else if (slots._normalized) {
            // fast path 1: child component re-render only, parent did not change
            return slots._normalized
        } else if (
            isStable &&
            prevSlots &&
            prevSlots !== emptyObject &&
            key === prevSlots.$key &&
            !hasNormalSlots &&
            !prevSlots.$hasNormal
        ) {
            // fast path 2: stable scoped slots w/ no normal slots to proxy,
            // only need to normalize once
            return prevSlots
        } else {
            res = {};
            for (var key$1 in slots) {
                if (slots[key$1] && key$1[0] !== '$') {
                    res[key$1] = normalizeScopedSlot(normalSlots, key$1, slots[key$1]);
                }
            }
        }
        // expose normal slots on scopedSlots
        for (var key$2 in normalSlots) {
            if (!(key$2 in res)) {
                res[key$2] = proxyNormalSlot(normalSlots, key$2);
            }
        }
        // avoriaz seems to mock a non-extensible $scopedSlots object
        // and when that is passed down this would cause an error
        if (slots && Object.isExtensible(slots)) {
            (slots)._normalized = res;
        }
        def(res, '$stable', isStable);
        def(res, '$key', key);
        def(res, '$hasNormal', hasNormalSlots);
        return res
    }

    function normalizeScopedSlot(normalSlots, key, fn) {
        var normalized = function () {
            var res = arguments.length ? fn.apply(null, arguments) : fn({});
            res = res && typeof res === 'object' && !Array.isArray(res)
                ? [res] // single vnode
                : normalizeChildren(res);
            var vnode = res && res[0];
            return res && (
                !vnode ||
                (res.length === 1 && vnode.isComment && !isAsyncPlaceholder(vnode)) // #9658, #10391
            ) ? undefined
                : res
        };
        // this is a slot using the new v-slot syntax without scope. although it is
        // compiled as a scoped slot, render fn users would expect it to be present
        // on this.$slots because the usage is semantically a normal slot.
        if (fn.proxy) {
            Object.defineProperty(normalSlots, key, {
                get: normalized,
                enumerable: true,
                configurable: true
            });
        }
        return normalized
    }

    function proxyNormalSlot(slots, key) {
        return function () { return slots[key]; }
    }

    /*  */

    /**
     * Runtime helper for rendering v-for lists.
     */
    function renderList(
        val,
        render
    ) {
        var ret, i, l, keys, key;
        if (Array.isArray(val) || typeof val === 'string') {
            ret = new Array(val.length);
            for (i = 0, l = val.length; i < l; i++) {
                ret[i] = render(val[i], i);
            }
        } else if (typeof val === 'number') {
            ret = new Array(val);
            for (i = 0; i < val; i++) {
                ret[i] = render(i + 1, i);
            }
        } else if (isObject(val)) {
            if (hasSymbol && val[Symbol.iterator]) {
                ret = [];
                var iterator = val[Symbol.iterator]();
                var result = iterator.next();
                while (!result.done) {
                    ret.push(render(result.value, ret.length));
                    result = iterator.next();
                }
            } else {
                keys = Object.keys(val);
                ret = new Array(keys.length);
                for (i = 0, l = keys.length; i < l; i++) {
                    key = keys[i];
                    ret[i] = render(val[key], key, i);
                }
            }
        }
        if (!isDef(ret)) {
            ret = [];
        }
        (ret)._isVList = true;
        return ret
    }

    /*  */

    /**
     * Runtime helper for rendering <slot>
     */
    function renderSlot(
        name,
        fallbackRender,
        props,
        bindObject
    ) {
        var scopedSlotFn = this.$scopedSlots[name];
        var nodes;
        if (scopedSlotFn) {
            // scoped slot
            props = props || {};
            if (bindObject) {
                if (!isObject(bindObject)) {
                    warn('slot v-bind without argument expects an Object', this);
                }
                props = extend(extend({}, bindObject), props);
            }
            nodes =
                scopedSlotFn(props) ||
                (typeof fallbackRender === 'function' ? fallbackRender() : fallbackRender);
        } else {
            nodes =
                this.$slots[name] ||
                (typeof fallbackRender === 'function' ? fallbackRender() : fallbackRender);
        }

        var target = props && props.slot;
        if (target) {
            return this.$createElement('template', { slot: target }, nodes)
        } else {
            return nodes
        }
    }

    /*  */

    /**
     * Runtime helper for resolving filters
     */
    function resolveFilter(id) {
        return resolveAsset(this.$options, 'filters', id, true) || identity
    }

    /*  */

    function isKeyNotMatch(expect, actual) {
        if (Array.isArray(expect)) {
            return expect.indexOf(actual) === -1
        } else {
            return expect !== actual
        }
    }

    /**
     * Runtime helper for checking keyCodes from config.
     * exposed as Vue.prototype._k
     * passing in eventKeyName as last argument separately for backwards compat
     */
    function checkKeyCodes(
        eventKeyCode,
        key,
        builtInKeyCode,
        eventKeyName,
        builtInKeyName
    ) {
        var mappedKeyCode = config.keyCodes[key] || builtInKeyCode;
        if (builtInKeyName && eventKeyName && !config.keyCodes[key]) {
            return isKeyNotMatch(builtInKeyName, eventKeyName)
        } else if (mappedKeyCode) {
            return isKeyNotMatch(mappedKeyCode, eventKeyCode)
        } else if (eventKeyName) {
            return hyphenate(eventKeyName) !== key
        }
        return eventKeyCode === undefined
    }

    /*  */

    /**
     * Runtime helper for merging v-bind="object" into a VNode's data.
     */
    function bindObjectProps(
        data,
        tag,
        value,
        asProp,
        isSync
    ) {
        if (value) {
            if (!isObject(value)) {
                warn(
                    'v-bind without argument expects an Object or Array value',
                    this
                );
            } else {
                if (Array.isArray(value)) {
                    value = toObject(value);
                }
                var hash;
                var loop = function (key) {
                    if (
                        key === 'class' ||
                        key === 'style' ||
                        isReservedAttribute(key)
                    ) {
                        hash = data;
                    } else {
                        var type = data.attrs && data.attrs.type;
                        hash = asProp || config.mustUseProp(tag, type, key)
                            ? data.domProps || (data.domProps = {})
                            : data.attrs || (data.attrs = {});
                    }
                    var camelizedKey = camelize(key);
                    var hyphenatedKey = hyphenate(key);
                    if (!(camelizedKey in hash) && !(hyphenatedKey in hash)) {
                        hash[key] = value[key];

                        if (isSync) {
                            var on = data.on || (data.on = {});
                            on[("update:" + key)] = function ($event) {
                                value[key] = $event;
                            };
                        }
                    }
                };

                for (var key in value) loop(key);
            }
        }
        return data
    }

    /*  */

    /**
     * Runtime helper for rendering static trees.
     */
    function renderStatic(
        index,
        isInFor
    ) {
        var cached = this._staticTrees || (this._staticTrees = []);
        var tree = cached[index];
        // if has already-rendered static tree and not inside v-for,
        // we can reuse the same tree.
        if (tree && !isInFor) {
            return tree
        }
        // otherwise, render a fresh tree.
        tree = cached[index] = this.$options.staticRenderFns[index].call(
            this._renderProxy,
            null,
            this // for render fns generated for functional component templates
        );
        markStatic(tree, ("__static__" + index), false);
        return tree
    }

    /**
     * Runtime helper for v-once.
     * Effectively it means marking the node as static with a unique key.
     */
    function markOnce(
        tree,
        index,
        key
    ) {
        markStatic(tree, ("__once__" + index + (key ? ("_" + key) : "")), true);
        return tree
    }

    function markStatic(
        tree,
        key,
        isOnce
    ) {
        if (Array.isArray(tree)) {
            for (var i = 0; i < tree.length; i++) {
                if (tree[i] && typeof tree[i] !== 'string') {
                    markStaticNode(tree[i], (key + "_" + i), isOnce);
                }
            }
        } else {
            markStaticNode(tree, key, isOnce);
        }
    }

    function markStaticNode(node, key, isOnce) {
        node.isStatic = true;
        node.key = key;
        node.isOnce = isOnce;
    }

    /*  */

    function bindObjectListeners(data, value) {
        if (value) {
            if (!isPlainObject(value)) {
                warn(
                    'v-on without argument expects an Object value',
                    this
                );
            } else {
                var on = data.on = data.on ? extend({}, data.on) : {};
                for (var key in value) {
                    var existing = on[key];
                    var ours = value[key];
                    on[key] = existing ? [].concat(existing, ours) : ours;
                }
            }
        }
        return data
    }

    /*  */

    function resolveScopedSlots(
        fns, // see flow/vnode
        res,
        // the following are added in 2.6
        hasDynamicKeys,
        contentHashKey
    ) {
        res = res || { $stable: !hasDynamicKeys };
        for (var i = 0; i < fns.length; i++) {
            var slot = fns[i];
            if (Array.isArray(slot)) {
                resolveScopedSlots(slot, res, hasDynamicKeys);
            } else if (slot) {
                // marker for reverse proxying v-slot without scope on this.$slots
                if (slot.proxy) {
                    slot.fn.proxy = true;
                }
                res[slot.key] = slot.fn;
            }
        }
        if (contentHashKey) {
            (res).$key = contentHashKey;
        }
        return res
    }

    /*  */

    function bindDynamicKeys(baseObj, values) {
        for (var i = 0; i < values.length; i += 2) {
            var key = values[i];
            if (typeof key === 'string' && key) {
                baseObj[values[i]] = values[i + 1];
            } else if (key !== '' && key !== null) {
                // null is a special value for explicitly removing a binding
                warn(
                    ("Invalid value for dynamic directive argument (expected string or null): " + key),
                    this
                );
            }
        }
        return baseObj
    }

    // helper to dynamically append modifier runtime markers to event names.
    // ensure only append when value is already string, otherwise it will be cast
    // to string and cause the type check to miss.
    function prependModifier(value, symbol) {
        return typeof value === 'string' ? symbol + value : value
    }

    /*  */

    function installRenderHelpers(target) {
        target._o = markOnce;
        target._n = toNumber;
        target._s = toString;
        target._l = renderList;
        target._t = renderSlot;
        target._q = looseEqual;
        target._i = looseIndexOf;
        target._m = renderStatic;
        target._f = resolveFilter;
        target._k = checkKeyCodes;
        target._b = bindObjectProps;
        target._v = createTextVNode;
        target._e = createEmptyVNode;
        target._u = resolveScopedSlots;
        target._g = bindObjectListeners;
        target._d = bindDynamicKeys;
        target._p = prependModifier;
    }

    /*  */

    function FunctionalRenderContext(
        data,
        props,
        children,
        parent,
        Ctor
    ) {
        var this$1 = this;

        var options = Ctor.options;
        // ensure the createElement function in functional components
        // gets a unique context - this is necessary for correct named slot check
        var contextVm;
        if (hasOwn(parent, '_uid')) {
            contextVm = Object.create(parent);
            // $flow-disable-line
            contextVm._original = parent;
        } else {
            // the context vm passed in is a functional context as well.
            // in this case we want to make sure we are able to get a hold to the
            // real context instance.
            contextVm = parent;
            // $flow-disable-line
            parent = parent._original;
        }
        var isCompiled = isTrue(options._compiled);
        var needNormalization = !isCompiled;

        this.data = data;
        this.props = props;
        this.children = children;
        this.parent = parent;
        this.listeners = data.on || emptyObject;
        this.injections = resolveInject(options.inject, parent);
        this.slots = function () {
            if (!this$1.$slots) {
                normalizeScopedSlots(
                    data.scopedSlots,
                    this$1.$slots = resolveSlots(children, parent)
                );
            }
            return this$1.$slots
        };

        Object.defineProperty(this, 'scopedSlots', ({
            enumerable: true,
            get: function get() {
                return normalizeScopedSlots(data.scopedSlots, this.slots())
            }
        }));

        // support for compiled functional template
        if (isCompiled) {
            // exposing $options for renderStatic()
            this.$options = options;
            // pre-resolve slots for renderSlot()
            this.$slots = this.slots();
            this.$scopedSlots = normalizeScopedSlots(data.scopedSlots, this.$slots);
        }

        if (options._scopeId) {
            this._c = function (a, b, c, d) {
                var vnode = createElement(contextVm, a, b, c, d, needNormalization);
                if (vnode && !Array.isArray(vnode)) {
                    vnode.fnScopeId = options._scopeId;
                    vnode.fnContext = parent;
                }
                return vnode
            };
        } else {
            this._c = function (a, b, c, d) { return createElement(contextVm, a, b, c, d, needNormalization); };
        }
    }

    installRenderHelpers(FunctionalRenderContext.prototype);

    function createFunctionalComponent(
        Ctor,
        propsData,
        data,
        contextVm,
        children
    ) {
        var options = Ctor.options;
        var props = {};
        var propOptions = options.props;
        if (isDef(propOptions)) {
            for (var key in propOptions) {
                props[key] = validateProp(key, propOptions, propsData || emptyObject);
            }
        } else {
            if (isDef(data.attrs)) { mergeProps(props, data.attrs); }
            if (isDef(data.props)) { mergeProps(props, data.props); }
        }

        var renderContext = new FunctionalRenderContext(
            data,
            props,
            children,
            contextVm,
            Ctor
        );

        var vnode = options.render.call(null, renderContext._c, renderContext);

        if (vnode instanceof VNode) {
            return cloneAndMarkFunctionalResult(vnode, data, renderContext.parent, options, renderContext)
        } else if (Array.isArray(vnode)) {
            var vnodes = normalizeChildren(vnode) || [];
            var res = new Array(vnodes.length);
            for (var i = 0; i < vnodes.length; i++) {
                res[i] = cloneAndMarkFunctionalResult(vnodes[i], data, renderContext.parent, options, renderContext);
            }
            return res
        }
    }

    function cloneAndMarkFunctionalResult(vnode, data, contextVm, options, renderContext) {
        // #7817 clone node before setting fnContext, otherwise if the node is reused
        // (e.g. it was from a cached normal slot) the fnContext causes named slots
        // that should not be matched to match.
        var clone = cloneVNode(vnode);
        clone.fnContext = contextVm;
        clone.fnOptions = options;
        {
            (clone.devtoolsMeta = clone.devtoolsMeta || {}).renderContext = renderContext;
        }
        if (data.slot) {
            (clone.data || (clone.data = {})).slot = data.slot;
        }
        return clone
    }

    function mergeProps(to, from) {
        for (var key in from) {
            to[camelize(key)] = from[key];
        }
    }

    /*  */

    /*  */

    /*  */

    /*  */

    // inline hooks to be invoked on component VNodes during patch
    var componentVNodeHooks = {
        init: function init(vnode, hydrating) {
            if (
                vnode.componentInstance &&
                !vnode.componentInstance._isDestroyed &&
                vnode.data.keepAlive
            ) {
                // kept-alive components, treat as a patch
                var mountedNode = vnode; // work around flow
                componentVNodeHooks.prepatch(mountedNode, mountedNode);
            } else {
                var child = vnode.componentInstance = createComponentInstanceForVnode(
                    vnode,
                    activeInstance
                );
                child.$mount(hydrating ? vnode.elm : undefined, hydrating);
            }
        },

        prepatch: function prepatch(oldVnode, vnode) {
            var options = vnode.componentOptions;
            var child = vnode.componentInstance = oldVnode.componentInstance;
            updateChildComponent(
                child,
                options.propsData, // updated props
                options.listeners, // updated listeners
                vnode, // new parent vnode
                options.children // new children
            );
        },

        insert: function insert(vnode) {
            var context = vnode.context;
            var componentInstance = vnode.componentInstance;
            if (!componentInstance._isMounted) {
                componentInstance._isMounted = true;
                callHook(componentInstance, 'mounted');
            }
            if (vnode.data.keepAlive) {
                if (context._isMounted) {
                    // vue-router#1212
                    // During updates, a kept-alive component's child components may
                    // change, so directly walking the tree here may call activated hooks
                    // on incorrect children. Instead we push them into a queue which will
                    // be processed after the whole patch process ended.
                    queueActivatedComponent(componentInstance);
                } else {
                    activateChildComponent(componentInstance, true /* direct */);
                }
            }
        },

        destroy: function destroy(vnode) {
            var componentInstance = vnode.componentInstance;
            if (!componentInstance._isDestroyed) {
                if (!vnode.data.keepAlive) {
                    componentInstance.$destroy();
                } else {
                    deactivateChildComponent(componentInstance, true /* direct */);
                }
            }
        }
    };

    var hooksToMerge = Object.keys(componentVNodeHooks);

    function createComponent(
        Ctor,
        data,
        context,
        children,
        tag
    ) {
        if (isUndef(Ctor)) {
            return
        }

        var baseCtor = context.$options._base;

        // plain options object: turn it into a constructor
        if (isObject(Ctor)) {
            Ctor = baseCtor.extend(Ctor);
        }

        // if at this stage it's not a constructor or an async component factory,
        // reject.
        if (typeof Ctor !== 'function') {
            {
                warn(("Invalid Component definition: " + (String(Ctor))), context);
            }
            return
        }

        // async component
        var asyncFactory;
        if (isUndef(Ctor.cid)) {
            asyncFactory = Ctor;
            Ctor = resolveAsyncComponent(asyncFactory, baseCtor);
            if (Ctor === undefined) {
                // return a placeholder node for async component, which is rendered
                // as a comment node but preserves all the raw information for the node.
                // the information will be used for async server-rendering and hydration.
                return createAsyncPlaceholder(
                    asyncFactory,
                    data,
                    context,
                    children,
                    tag
                )
            }
        }

        data = data || {};

        // resolve constructor options in case global mixins are applied after
        // component constructor creation
        resolveConstructorOptions(Ctor);

        // transform component v-model data into props & events
        if (isDef(data.model)) {
            transformModel(Ctor.options, data);
        }

        // extract props
        var propsData = extractPropsFromVNodeData(data, Ctor, tag);

        // functional component
        if (isTrue(Ctor.options.functional)) {
            return createFunctionalComponent(Ctor, propsData, data, context, children)
        }

        // extract listeners, since these needs to be treated as
        // child component listeners instead of DOM listeners
        var listeners = data.on;
        // replace with listeners with .native modifier
        // so it gets processed during parent component patch.
        data.on = data.nativeOn;

        if (isTrue(Ctor.options.abstract)) {
            // abstract components do not keep anything
            // other than props & listeners & slot

            // work around flow
            var slot = data.slot;
            data = {};
            if (slot) {
                data.slot = slot;
            }
        }

        // install component management hooks onto the placeholder node
        installComponentHooks(data);

        // return a placeholder vnode
        var name = Ctor.options.name || tag;
        var vnode = new VNode(
            ("vue-component-" + (Ctor.cid) + (name ? ("-" + name) : '')),
            data, undefined, undefined, undefined, context,
            { Ctor: Ctor, propsData: propsData, listeners: listeners, tag: tag, children: children },
            asyncFactory
        );

        return vnode
    }

    function createComponentInstanceForVnode(
        // we know it's MountedComponentVNode but flow doesn't
        vnode,
        // activeInstance in lifecycle state
        parent
    ) {
        var options = {
            _isComponent: true,
            _parentVnode: vnode,
            parent: parent
        };
        // check inline-template render functions
        var inlineTemplate = vnode.data.inlineTemplate;
        if (isDef(inlineTemplate)) {
            options.render = inlineTemplate.render;
            options.staticRenderFns = inlineTemplate.staticRenderFns;
        }
        return new vnode.componentOptions.Ctor(options)
    }

    function installComponentHooks(data) {
        var hooks = data.hook || (data.hook = {});
        for (var i = 0; i < hooksToMerge.length; i++) {
            var key = hooksToMerge[i];
            var existing = hooks[key];
            var toMerge = componentVNodeHooks[key];
            if (existing !== toMerge && !(existing && existing._merged)) {
                hooks[key] = existing ? mergeHook$1(toMerge, existing) : toMerge;
            }
        }
    }

    function mergeHook$1(f1, f2) {
        var merged = function (a, b) {
            // flow complains about extra args which is why we use any
            f1(a, b);
            f2(a, b);
        };
        merged._merged = true;
        return merged
    }

    // transform component v-model info (value and callback) into
    // prop and event handler respectively.
    function transformModel(options, data) {
        var prop = (options.model && options.model.prop) || 'value';
        var event = (options.model && options.model.event) || 'input'
            ; (data.attrs || (data.attrs = {}))[prop] = data.model.value;
        var on = data.on || (data.on = {});
        var existing = on[event];
        var callback = data.model.callback;
        if (isDef(existing)) {
            if (
                Array.isArray(existing)
                    ? existing.indexOf(callback) === -1
                    : existing !== callback
            ) {
                on[event] = [callback].concat(existing);
            }
        } else {
            on[event] = callback;
        }
    }

    /*  */

    var SIMPLE_NORMALIZE = 1;
    var ALWAYS_NORMALIZE = 2;

    // wrapper function for providing a more flexible interface
    // without getting yelled at by flow
    function createElement(
        context,
        tag,
        data,
        children,
        normalizationType,
        alwaysNormalize
    ) {
        if (Array.isArray(data) || isPrimitive(data)) {
            normalizationType = children;
            children = data;
            data = undefined;
        }
        if (isTrue(alwaysNormalize)) {
            normalizationType = ALWAYS_NORMALIZE;
        }
        return _createElement(context, tag, data, children, normalizationType)
    }

    function _createElement(
        context,
        tag,
        data,
        children,
        normalizationType
    ) {
        if (isDef(data) && isDef((data).__ob__)) {
            warn(
                "Avoid using observed data object as vnode data: " + (JSON.stringify(data)) + "\n" +
                'Always create fresh vnode data objects in each render!',
                context
            );
            return createEmptyVNode()
        }
        // object syntax in v-bind
        if (isDef(data) && isDef(data.is)) {
            tag = data.is;
        }
        if (!tag) {
            // in case of component :is set to falsy value
            return createEmptyVNode()
        }
        // warn against non-primitive key
        if (isDef(data) && isDef(data.key) && !isPrimitive(data.key)
        ) {
            {
                warn(
                    'Avoid using non-primitive value as key, ' +
                    'use string/number value instead.',
                    context
                );
            }
        }
        // support single function children as default scoped slot
        if (Array.isArray(children) &&
            typeof children[0] === 'function'
        ) {
            data = data || {};
            data.scopedSlots = { default: children[0] };
            children.length = 0;
        }
        if (normalizationType === ALWAYS_NORMALIZE) {
            children = normalizeChildren(children);
        } else if (normalizationType === SIMPLE_NORMALIZE) {
            children = simpleNormalizeChildren(children);
        }
        var vnode, ns;
        if (typeof tag === 'string') {
            var Ctor;
            ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag);
            if (config.isReservedTag(tag)) {
                // platform built-in elements
                if (isDef(data) && isDef(data.nativeOn) && data.tag !== 'component') {
                    warn(
                        ("The .native modifier for v-on is only valid on components but it was used on <" + tag + ">."),
                        context
                    );
                }
                vnode = new VNode(
                    config.parsePlatformTagName(tag), data, children,
                    undefined, undefined, context
                );
            } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
                // component
                vnode = createComponent(Ctor, data, context, children, tag);
            } else {
                // unknown or unlisted namespaced elements
                // check at runtime because it may get assigned a namespace when its
                // parent normalizes children
                vnode = new VNode(
                    tag, data, children,
                    undefined, undefined, context
                );
            }
        } else {
            // direct component options / constructor
            vnode = createComponent(tag, data, context, children);
        }
        if (Array.isArray(vnode)) {
            return vnode
        } else if (isDef(vnode)) {
            if (isDef(ns)) { applyNS(vnode, ns); }
            if (isDef(data)) { registerDeepBindings(data); }
            return vnode
        } else {
            return createEmptyVNode()
        }
    }

    function applyNS(vnode, ns, force) {
        vnode.ns = ns;
        if (vnode.tag === 'foreignObject') {
            // use default namespace inside foreignObject
            ns = undefined;
            force = true;
        }
        if (isDef(vnode.children)) {
            for (var i = 0, l = vnode.children.length; i < l; i++) {
                var child = vnode.children[i];
                if (isDef(child.tag) && (
                    isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
                    applyNS(child, ns, force);
                }
            }
        }
    }

    // ref #5318
    // necessary to ensure parent re-render when deep bindings like :style and
    // :class are used on slot nodes
    function registerDeepBindings(data) {
        if (isObject(data.style)) {
            traverse(data.style);
        }
        if (isObject(data.class)) {
            traverse(data.class);
        }
    }

    /*  */

    function initRender(vm) {
        vm._vnode = null; // the root of the child tree
        vm._staticTrees = null; // v-once cached trees
        var options = vm.$options;
        var parentVnode = vm.$vnode = options._parentVnode; // the placeholder node in parent tree
        var renderContext = parentVnode && parentVnode.context;
        vm.$slots = resolveSlots(options._renderChildren, renderContext);
        vm.$scopedSlots = emptyObject;
        // bind the createElement fn to this instance
        // so that we get proper render context inside it.
        // args order: tag, data, children, normalizationType, alwaysNormalize
        // internal version is used by render functions compiled from templates
        vm._c = function (a, b, c, d) { return createElement(vm, a, b, c, d, false); };
        // normalization is always applied for the public version, used in
        // user-written render functions.
        vm.$createElement = function (a, b, c, d) { return createElement(vm, a, b, c, d, true); };

        // $attrs & $listeners are exposed for easier HOC creation.
        // they need to be reactive so that HOCs using them are always updated
        var parentData = parentVnode && parentVnode.data;

        /* istanbul ignore else */
        {
            defineReactive$$1(vm, '$attrs', parentData && parentData.attrs || emptyObject, function () {
                !isUpdatingChildComponent && warn("$attrs is readonly.", vm);
            }, true);
            defineReactive$$1(vm, '$listeners', options._parentListeners || emptyObject, function () {
                !isUpdatingChildComponent && warn("$listeners is readonly.", vm);
            }, true);
        }
    }

    var currentRenderingInstance = null;

    function renderMixin(Vue) {
        // install runtime convenience helpers
        installRenderHelpers(Vue.prototype);

        Vue.prototype.$nextTick = function (fn) {
            return nextTick(fn, this)
        };

        Vue.prototype._render = function () {
            var vm = this;
            var ref = vm.$options;
            var render = ref.render;
            var _parentVnode = ref._parentVnode;

            if (_parentVnode) {
                vm.$scopedSlots = normalizeScopedSlots(
                    _parentVnode.data.scopedSlots,
                    vm.$slots,
                    vm.$scopedSlots
                );
            }

            // set parent vnode. this allows render functions to have access
            // to the data on the placeholder node.
            vm.$vnode = _parentVnode;
            // render self
            var vnode;
            try {
                // There's no need to maintain a stack because all render fns are called
                // separately from one another. Nested component's render fns are called
                // when parent component is patched.
                currentRenderingInstance = vm;
                vnode = render.call(vm._renderProxy, vm.$createElement);
            } catch (e) {
                handleError(e, vm, "render");
                // return error render result,
                // or previous vnode to prevent render error causing blank component
                /* istanbul ignore else */
                if (vm.$options.renderError) {
                    try {
                        vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e);
                    } catch (e) {
                        handleError(e, vm, "renderError");
                        vnode = vm._vnode;
                    }
                } else {
                    vnode = vm._vnode;
                }
            } finally {
                currentRenderingInstance = null;
            }
            // if the returned array contains only a single node, allow it
            if (Array.isArray(vnode) && vnode.length === 1) {
                vnode = vnode[0];
            }
            // return empty vnode in case the render function errored out
            if (!(vnode instanceof VNode)) {
                if (Array.isArray(vnode)) {
                    warn(
                        'Multiple root nodes returned from render function. Render function ' +
                        'should return a single root node.',
                        vm
                    );
                }
                vnode = createEmptyVNode();
            }
            // set parent
            vnode.parent = _parentVnode;
            return vnode
        };
    }

    /*  */

    function ensureCtor(comp, base) {
        if (
            comp.__esModule ||
            (hasSymbol && comp[Symbol.toStringTag] === 'Module')
        ) {
            comp = comp.default;
        }
        return isObject(comp)
            ? base.extend(comp)
            : comp
    }

    function createAsyncPlaceholder(
        factory,
        data,
        context,
        children,
        tag
    ) {
        var node = createEmptyVNode();
        node.asyncFactory = factory;
        node.asyncMeta = { data: data, context: context, children: children, tag: tag };
        return node
    }

    function resolveAsyncComponent(
        factory,
        baseCtor
    ) {
        if (isTrue(factory.error) && isDef(factory.errorComp)) {
            return factory.errorComp
        }

        if (isDef(factory.resolved)) {
            return factory.resolved
        }

        var owner = currentRenderingInstance;
        if (owner && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
            // already pending
            factory.owners.push(owner);
        }

        if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
            return factory.loadingComp
        }

        if (owner && !isDef(factory.owners)) {
            var owners = factory.owners = [owner];
            var sync = true;
            var timerLoading = null;
            var timerTimeout = null

                ; (owner).$on('hook:destroyed', function () { return remove(owners, owner); });

            var forceRender = function (renderCompleted) {
                for (var i = 0, l = owners.length; i < l; i++) {
                    (owners[i]).$forceUpdate();
                }

                if (renderCompleted) {
                    owners.length = 0;
                    if (timerLoading !== null) {
                        clearTimeout(timerLoading);
                        timerLoading = null;
                    }
                    if (timerTimeout !== null) {
                        clearTimeout(timerTimeout);
                        timerTimeout = null;
                    }
                }
            };

            var resolve = once(function (res) {
                // cache resolved
                factory.resolved = ensureCtor(res, baseCtor);
                // invoke callbacks only if this is not a synchronous resolve
                // (async resolves are shimmed as synchronous during SSR)
                if (!sync) {
                    forceRender(true);
                } else {
                    owners.length = 0;
                }
            });

            var reject = once(function (reason) {
                warn(
                    "Failed to resolve async component: " + (String(factory)) +
                    (reason ? ("\nReason: " + reason) : '')
                );
                if (isDef(factory.errorComp)) {
                    factory.error = true;
                    forceRender(true);
                }
            });

            var res = factory(resolve, reject);

            if (isObject(res)) {
                if (isPromise(res)) {
                    // () => Promise
                    if (isUndef(factory.resolved)) {
                        res.then(resolve, reject);
                    }
                } else if (isPromise(res.component)) {
                    res.component.then(resolve, reject);

                    if (isDef(res.error)) {
                        factory.errorComp = ensureCtor(res.error, baseCtor);
                    }

                    if (isDef(res.loading)) {
                        factory.loadingComp = ensureCtor(res.loading, baseCtor);
                        if (res.delay === 0) {
                            factory.loading = true;
                        } else {
                            timerLoading = setTimeout(function () {
                                timerLoading = null;
                                if (isUndef(factory.resolved) && isUndef(factory.error)) {
                                    factory.loading = true;
                                    forceRender(false);
                                }
                            }, res.delay || 200);
                        }
                    }

                    if (isDef(res.timeout)) {
                        timerTimeout = setTimeout(function () {
                            timerTimeout = null;
                            if (isUndef(factory.resolved)) {
                                reject(
                                    "timeout (" + (res.timeout) + "ms)"
                                );
                            }
                        }, res.timeout);
                    }
                }
            }

            sync = false;
            // return in case resolved synchronously
            return factory.loading
                ? factory.loadingComp
                : factory.resolved
        }
    }

    /*  */

    function getFirstComponentChild(children) {
        if (Array.isArray(children)) {
            for (var i = 0; i < children.length; i++) {
                var c = children[i];
                if (isDef(c) && (isDef(c.componentOptions) || isAsyncPlaceholder(c))) {
                    return c
                }
            }
        }
    }

    /*  */

    /*  */

    function initEvents(vm) {
        vm._events = Object.create(null);
        vm._hasHookEvent = false;
        // init parent attached events
        var listeners = vm.$options._parentListeners;
        if (listeners) {
            updateComponentListeners(vm, listeners);
        }
    }

    var target;

    function add(event, fn) {
        target.$on(event, fn);
    }

    function remove$1(event, fn) {
        target.$off(event, fn);
    }

    function createOnceHandler(event, fn) {
        var _target = target;
        return function onceHandler() {
            var res = fn.apply(null, arguments);
            if (res !== null) {
                _target.$off(event, onceHandler);
            }
        }
    }

    function updateComponentListeners(
        vm,
        listeners,
        oldListeners
    ) {
        target = vm;
        updateListeners(listeners, oldListeners || {}, add, remove$1, createOnceHandler, vm);
        target = undefined;
    }

    function eventsMixin(Vue) {
        var hookRE = /^hook:/;
        Vue.prototype.$on = function (event, fn) {
            var vm = this;
            if (Array.isArray(event)) {
                for (var i = 0, l = event.length; i < l; i++) {
                    vm.$on(event[i], fn);
                }
            } else {
                (vm._events[event] || (vm._events[event] = [])).push(fn);
                // optimize hook:event cost by using a boolean flag marked at registration
                // instead of a hash lookup
                if (hookRE.test(event)) {
                    vm._hasHookEvent = true;
                }
            }
            return vm
        };

        Vue.prototype.$once = function (event, fn) {
            var vm = this;
            function on() {
                vm.$off(event, on);
                fn.apply(vm, arguments);
            }
            on.fn = fn;
            vm.$on(event, on);
            return vm
        };

        Vue.prototype.$off = function (event, fn) {
            var vm = this;
            // all
            if (!arguments.length) {
                vm._events = Object.create(null);
                return vm
            }
            // array of events
            if (Array.isArray(event)) {
                for (var i$1 = 0, l = event.length; i$1 < l; i$1++) {
                    vm.$off(event[i$1], fn);
                }
                return vm
            }
            // specific event
            var cbs = vm._events[event];
            if (!cbs) {
                return vm
            }
            if (!fn) {
                vm._events[event] = null;
                return vm
            }
            // specific handler
            var cb;
            var i = cbs.length;
            while (i--) {
                cb = cbs[i];
                if (cb === fn || cb.fn === fn) {
                    cbs.splice(i, 1);
                    break
                }
            }
            return vm
        };

        Vue.prototype.$emit = function (event) {
            var vm = this;
            {
                var lowerCaseEvent = event.toLowerCase();
                if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
                    tip(
                        "Event \"" + lowerCaseEvent + "\" is emitted in component " +
                        (formatComponentName(vm)) + " but the handler is registered for \"" + event + "\". " +
                        "Note that HTML attributes are case-insensitive and you cannot use " +
                        "v-on to listen to camelCase events when using in-DOM templates. " +
                        "You should probably use \"" + (hyphenate(event)) + "\" instead of \"" + event + "\"."
                    );
                }
            }
            var cbs = vm._events[event];
            if (cbs) {
                cbs = cbs.length > 1 ? toArray(cbs) : cbs;
                var args = toArray(arguments, 1);
                var info = "event handler for \"" + event + "\"";
                for (var i = 0, l = cbs.length; i < l; i++) {
                    invokeWithErrorHandling(cbs[i], vm, args, vm, info);
                }
            }
            return vm
        };
    }

    /*  */

    var activeInstance = null;
    var isUpdatingChildComponent = false;

    function setActiveInstance(vm) {
        var prevActiveInstance = activeInstance;
        activeInstance = vm;
        return function () {
            activeInstance = prevActiveInstance;
        }
    }

    function initLifecycle(vm) {
        var options = vm.$options;

        // locate first non-abstract parent
        var parent = options.parent;
        if (parent && !options.abstract) {
            while (parent.$options.abstract && parent.$parent) {
                parent = parent.$parent;
            }
            parent.$children.push(vm);
        }

        vm.$parent = parent;
        vm.$root = parent ? parent.$root : vm;

        vm.$children = [];
        vm.$refs = {};

        vm._watcher = null;
        vm._inactive = null;
        vm._directInactive = false;
        vm._isMounted = false;
        vm._isDestroyed = false;
        vm._isBeingDestroyed = false;
    }

    function lifecycleMixin(Vue) {
        Vue.prototype._update = function (vnode, hydrating) {
            var vm = this;
            var prevEl = vm.$el;
            var prevVnode = vm._vnode;
            var restoreActiveInstance = setActiveInstance(vm);
            vm._vnode = vnode;
            // Vue.prototype.__patch__ is injected in entry points
            // based on the rendering backend used.
            if (!prevVnode) {
                // initial render
                vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */);
            } else {
                // updates
                vm.$el = vm.__patch__(prevVnode, vnode);
            }
            restoreActiveInstance();
            // update __vue__ reference
            if (prevEl) {
                prevEl.__vue__ = null;
            }
            if (vm.$el) {
                vm.$el.__vue__ = vm;
            }
            // if parent is an HOC, update its $el as well
            if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
                vm.$parent.$el = vm.$el;
            }
            // updated hook is called by the scheduler to ensure that children are
            // updated in a parent's updated hook.
        };

        Vue.prototype.$forceUpdate = function () {
            var vm = this;
            if (vm._watcher) {
                vm._watcher.update();
            }
        };

        Vue.prototype.$destroy = function () {
            var vm = this;
            if (vm._isBeingDestroyed) {
                return
            }
            callHook(vm, 'beforeDestroy');
            vm._isBeingDestroyed = true;
            // remove self from parent
            var parent = vm.$parent;
            if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
                remove(parent.$children, vm);
            }
            // teardown watchers
            if (vm._watcher) {
                vm._watcher.teardown();
            }
            var i = vm._watchers.length;
            while (i--) {
                vm._watchers[i].teardown();
            }
            // remove reference from data ob
            // frozen object may not have observer.
            if (vm._data.__ob__) {
                vm._data.__ob__.vmCount--;
            }
            // call the last hook...
            vm._isDestroyed = true;
            // invoke destroy hooks on current rendered tree
            vm.__patch__(vm._vnode, null);
            // fire destroyed hook
            callHook(vm, 'destroyed');
            // turn off all instance listeners.
            vm.$off();
            // remove __vue__ reference
            if (vm.$el) {
                vm.$el.__vue__ = null;
            }
            // release circular reference (#6759)
            if (vm.$vnode) {
                vm.$vnode.parent = null;
            }
        };
    }

    function mountComponent(
        vm,
        el,
        hydrating
    ) {
        vm.$el = el;
        if (!vm.$options.render) {
            vm.$options.render = createEmptyVNode;
            {
                /* istanbul ignore if */
                if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
                    vm.$options.el || el) {
                    warn(
                        'You are using the runtime-only build of Vue where the template ' +
                        'compiler is not available. Either pre-compile the templates into ' +
                        'render functions, or use the compiler-included build.',
                        vm
                    );
                } else {
                    warn(
                        'Failed to mount component: template or render function not defined.',
                        vm
                    );
                }
            }
        }
        callHook(vm, 'beforeMount');

        var updateComponent;
        /* istanbul ignore if */
        if (config.performance && mark) {
            updateComponent = function () {
                var name = vm._name;
                var id = vm._uid;
                var startTag = "vue-perf-start:" + id;
                var endTag = "vue-perf-end:" + id;

                mark(startTag);
                var vnode = vm._render();
                mark(endTag);
                measure(("vue " + name + " render"), startTag, endTag);

                mark(startTag);
                vm._update(vnode, hydrating);
                mark(endTag);
                measure(("vue " + name + " patch"), startTag, endTag);
            };
        } else {
            updateComponent = function () {
                vm._update(vm._render(), hydrating);
            };
        }

        // we set this to vm._watcher inside the watcher's constructor
        // since the watcher's initial patch may call $forceUpdate (e.g. inside child
        // component's mounted hook), which relies on vm._watcher being already defined
        new Watcher(vm, updateComponent, noop, {
            before: function before() {
                if (vm._isMounted && !vm._isDestroyed) {
                    callHook(vm, 'beforeUpdate');
                }
            }
        }, true /* isRenderWatcher */);
        hydrating = false;

        // manually mounted instance, call mounted on self
        // mounted is called for render-created child components in its inserted hook
        if (vm.$vnode == null) {
            vm._isMounted = true;
            callHook(vm, 'mounted');
        }
        return vm
    }

    function updateChildComponent(
        vm,
        propsData,
        listeners,
        parentVnode,
        renderChildren
    ) {
        {
            isUpdatingChildComponent = true;
        }

        // determine whether component has slot children
        // we need to do this before overwriting $options._renderChildren.

        // check if there are dynamic scopedSlots (hand-written or compiled but with
        // dynamic slot names). Static scoped slots compiled from template has the
        // "$stable" marker.
        var newScopedSlots = parentVnode.data.scopedSlots;
        var oldScopedSlots = vm.$scopedSlots;
        var hasDynamicScopedSlot = !!(
            (newScopedSlots && !newScopedSlots.$stable) ||
            (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
            (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key) ||
            (!newScopedSlots && vm.$scopedSlots.$key)
        );

        // Any static slot children from the parent may have changed during parent's
        // update. Dynamic scoped slots may also have changed. In such cases, a forced
        // update is necessary to ensure correctness.
        var needsForceUpdate = !!(
            renderChildren ||               // has new static slots
            vm.$options._renderChildren ||  // has old static slots
            hasDynamicScopedSlot
        );

        vm.$options._parentVnode = parentVnode;
        vm.$vnode = parentVnode; // update vm's placeholder node without re-render

        if (vm._vnode) { // update child tree's parent
            vm._vnode.parent = parentVnode;
        }
        vm.$options._renderChildren = renderChildren;

        // update $attrs and $listeners hash
        // these are also reactive so they may trigger child update if the child
        // used them during render
        vm.$attrs = parentVnode.data.attrs || emptyObject;
        vm.$listeners = listeners || emptyObject;

        // update props
        if (propsData && vm.$options.props) {
            toggleObserving(false);
            var props = vm._props;
            var propKeys = vm.$options._propKeys || [];
            for (var i = 0; i < propKeys.length; i++) {
                var key = propKeys[i];
                var propOptions = vm.$options.props; // wtf flow?
                props[key] = validateProp(key, propOptions, propsData, vm);
            }
            toggleObserving(true);
            // keep a copy of raw propsData
            vm.$options.propsData = propsData;
        }

        // update listeners
        listeners = listeners || emptyObject;
        var oldListeners = vm.$options._parentListeners;
        vm.$options._parentListeners = listeners;
        updateComponentListeners(vm, listeners, oldListeners);

        // resolve slots + force update if has children
        if (needsForceUpdate) {
            vm.$slots = resolveSlots(renderChildren, parentVnode.context);
            vm.$forceUpdate();
        }

        {
            isUpdatingChildComponent = false;
        }
    }

    function isInInactiveTree(vm) {
        while (vm && (vm = vm.$parent)) {
            if (vm._inactive) { return true }
        }
        return false
    }

    function activateChildComponent(vm, direct) {
        if (direct) {
            vm._directInactive = false;
            if (isInInactiveTree(vm)) {
                return
            }
        } else if (vm._directInactive) {
            return
        }
        if (vm._inactive || vm._inactive === null) {
            vm._inactive = false;
            for (var i = 0; i < vm.$children.length; i++) {
                activateChildComponent(vm.$children[i]);
            }
            callHook(vm, 'activated');
        }
    }

    function deactivateChildComponent(vm, direct) {
        if (direct) {
            vm._directInactive = true;
            if (isInInactiveTree(vm)) {
                return
            }
        }
        if (!vm._inactive) {
            vm._inactive = true;
            for (var i = 0; i < vm.$children.length; i++) {
                deactivateChildComponent(vm.$children[i]);
            }
            callHook(vm, 'deactivated');
        }
    }

    function callHook(vm, hook) {
        // #7573 disable dep collection when invoking lifecycle hooks
        pushTarget();
        var handlers = vm.$options[hook];
        var info = hook + " hook";
        if (handlers) {
            for (var i = 0, j = handlers.length; i < j; i++) {
                invokeWithErrorHandling(handlers[i], vm, null, vm, info);
            }
        }
        if (vm._hasHookEvent) {
            vm.$emit('hook:' + hook);
        }
        popTarget();
    }

    /*  */

    var MAX_UPDATE_COUNT = 100;

    var queue = [];
    var activatedChildren = [];
    var has = {};
    var circular = {};
    var waiting = false;
    var flushing = false;
    var index = 0;

    /**
     * Reset the scheduler's state.
     */
    function resetSchedulerState() {
        index = queue.length = activatedChildren.length = 0;
        has = {};
        {
            circular = {};
        }
        waiting = flushing = false;
    }

    // Async edge case #6566 requires saving the timestamp when event listeners are
    // attached. However, calling performance.now() has a perf overhead especially
    // if the page has thousands of event listeners. Instead, we take a timestamp
    // every time the scheduler flushes and use that for all event listeners
    // attached during that flush.
    var currentFlushTimestamp = 0;

    // Async edge case fix requires storing an event listener's attach timestamp.
    var getNow = Date.now;

    // Determine what event timestamp the browser is using. Annoyingly, the
    // timestamp can either be hi-res (relative to page load) or low-res
    // (relative to UNIX epoch), so in order to compare time we have to use the
    // same timestamp type when saving the flush timestamp.
    // All IE versions use low-res event timestamps, and have problematic clock
    // implementations (#9632)
    if (inBrowser && !isIE) {
        var performance = window.performance;
        if (
            performance &&
            typeof performance.now === 'function' &&
            getNow() > document.createEvent('Event').timeStamp
        ) {
            // if the event timestamp, although evaluated AFTER the Date.now(), is
            // smaller than it, it means the event is using a hi-res timestamp,
            // and we need to use the hi-res version for event listener timestamps as
            // well.
            getNow = function () { return performance.now(); };
        }
    }

    /**
     * Flush both queues and run the watchers.
     */
    function flushSchedulerQueue() {
        currentFlushTimestamp = getNow();
        flushing = true;
        var watcher, id;

        // Sort queue before flush.
        // This ensures that:
        // 1. Components are updated from parent to child. (because parent is always
        //    created before the child)
        // 2. A component's user watchers are run before its render watcher (because
        //    user watchers are created before the render watcher)
        // 3. If a component is destroyed during a parent component's watcher run,
        //    its watchers can be skipped.
        queue.sort(function (a, b) { return a.id - b.id; });

        // do not cache length because more watchers might be pushed
        // as we run existing watchers
        for (index = 0; index < queue.length; index++) {
            watcher = queue[index];
            if (watcher.before) {
                watcher.before();
            }
            id = watcher.id;
            has[id] = null;
            watcher.run();
            // in dev build, check and stop circular updates.
            if (has[id] != null) {
                circular[id] = (circular[id] || 0) + 1;
                if (circular[id] > MAX_UPDATE_COUNT) {
                    warn(
                        'You may have an infinite update loop ' + (
                            watcher.user
                                ? ("in watcher with expression \"" + (watcher.expression) + "\"")
                                : "in a component render function."
                        ),
                        watcher.vm
                    );
                    break
                }
            }
        }

        // keep copies of post queues before resetting state
        var activatedQueue = activatedChildren.slice();
        var updatedQueue = queue.slice();

        resetSchedulerState();

        // call component updated and activated hooks
        callActivatedHooks(activatedQueue);
        callUpdatedHooks(updatedQueue);

        // devtool hook
        /* istanbul ignore if */
        if (devtools && config.devtools) {
            devtools.emit('flush');
        }
    }

    function callUpdatedHooks(queue) {
        var i = queue.length;
        while (i--) {
            var watcher = queue[i];
            var vm = watcher.vm;
            if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
                callHook(vm, 'updated');
            }
        }
    }

    /**
     * Queue a kept-alive component that was activated during patch.
     * The queue will be processed after the entire tree has been patched.
     */
    function queueActivatedComponent(vm) {
        // setting _inactive to false here so that a render function can
        // rely on checking whether it's in an inactive tree (e.g. router-view)
        vm._inactive = false;
        activatedChildren.push(vm);
    }

    function callActivatedHooks(queue) {
        for (var i = 0; i < queue.length; i++) {
            queue[i]._inactive = true;
            activateChildComponent(queue[i], true /* true */);
        }
    }

    /**
     * Push a watcher into the watcher queue.
     * Jobs with duplicate IDs will be skipped unless it's
     * pushed when the queue is being flushed.
     */
    function queueWatcher(watcher) {
        var id = watcher.id;
        if (has[id] == null) {
            has[id] = true;
            if (!flushing) {
                queue.push(watcher);
            } else {
                // if already flushing, splice the watcher based on its id
                // if already past its id, it will be run next immediately.
                var i = queue.length - 1;
                while (i > index && queue[i].id > watcher.id) {
                    i--;
                }
                queue.splice(i + 1, 0, watcher);
            }
            // queue the flush
            if (!waiting) {
                waiting = true;

                if (!config.async) {
                    flushSchedulerQueue();
                    return
                }
                nextTick(flushSchedulerQueue);
            }
        }
    }

    /*  */



    var uid$2 = 0;

    /**
     * A watcher parses an expression, collects dependencies,
     * and fires callback when the expression value changes.
     * This is used for both the $watch() api and directives.
     */
    var Watcher = function Watcher(
        vm,
        expOrFn,
        cb,
        options,
        isRenderWatcher
    ) {
        this.vm = vm;
        if (isRenderWatcher) {
            vm._watcher = this;
        }
        vm._watchers.push(this);
        // options
        if (options) {
            this.deep = !!options.deep;
            this.user = !!options.user;
            this.lazy = !!options.lazy;
            this.sync = !!options.sync;
            this.before = options.before;
        } else {
            this.deep = this.user = this.lazy = this.sync = false;
        }
        this.cb = cb;
        this.id = ++uid$2; // uid for batching
        this.active = true;
        this.dirty = this.lazy; // for lazy watchers
        this.deps = [];
        this.newDeps = [];
        this.depIds = new _Set();
        this.newDepIds = new _Set();
        this.expression = expOrFn.toString();
        // parse expression for getter
        if (typeof expOrFn === 'function') {
            this.getter = expOrFn;
        } else {
            this.getter = parsePath(expOrFn);
            if (!this.getter) {
                this.getter = noop;
                warn(
                    "Failed watching path: \"" + expOrFn + "\" " +
                    'Watcher only accepts simple dot-delimited paths. ' +
                    'For full control, use a function instead.',
                    vm
                );
            }
        }
        this.value = this.lazy
            ? undefined
            : this.get();
    };

    /**
     * Evaluate the getter, and re-collect dependencies.
     */
    Watcher.prototype.get = function get() {
        pushTarget(this);
        var value;
        var vm = this.vm;
        try {
            value = this.getter.call(vm, vm);
        } catch (e) {
            if (this.user) {
                handleError(e, vm, ("getter for watcher \"" + (this.expression) + "\""));
            } else {
                throw e
            }
        } finally {
            // "touch" every property so they are all tracked as
            // dependencies for deep watching
            if (this.deep) {
                traverse(value);
            }
            popTarget();
            this.cleanupDeps();
        }
        return value
    };

    /**
     * Add a dependency to this directive.
     */
    Watcher.prototype.addDep = function addDep(dep) {
        var id = dep.id;
        if (!this.newDepIds.has(id)) {
            this.newDepIds.add(id);
            this.newDeps.push(dep);
            if (!this.depIds.has(id)) {
                dep.addSub(this);
            }
        }
    };

    /**
     * Clean up for dependency collection.
     */
    Watcher.prototype.cleanupDeps = function cleanupDeps() {
        var i = this.deps.length;
        while (i--) {
            var dep = this.deps[i];
            if (!this.newDepIds.has(dep.id)) {
                dep.removeSub(this);
            }
        }
        var tmp = this.depIds;
        this.depIds = this.newDepIds;
        this.newDepIds = tmp;
        this.newDepIds.clear();
        tmp = this.deps;
        this.deps = this.newDeps;
        this.newDeps = tmp;
        this.newDeps.length = 0;
    };

    /**
     * Subscriber interface.
     * Will be called when a dependency changes.
     */
    Watcher.prototype.update = function update() {
        /* istanbul ignore else */
        if (this.lazy) {
            this.dirty = true;
        } else if (this.sync) {
            this.run();
        } else {
            queueWatcher(this);
        }
    };

    /**
     * Scheduler job interface.
     * Will be called by the scheduler.
     */
    Watcher.prototype.run = function run() {
        if (this.active) {
            var value = this.get();
            if (
                value !== this.value ||
                // Deep watchers and watchers on Object/Arrays should fire even
                // when the value is the same, because the value may
                // have mutated.
                isObject(value) ||
                this.deep
            ) {
                // set new value
                var oldValue = this.value;
                this.value = value;
                if (this.user) {
                    var info = "callback for watcher \"" + (this.expression) + "\"";
                    invokeWithErrorHandling(this.cb, this.vm, [value, oldValue], this.vm, info);
                } else {
                    this.cb.call(this.vm, value, oldValue);
                }
            }
        }
    };

    /**
     * Evaluate the value of the watcher.
     * This only gets called for lazy watchers.
     */
    Watcher.prototype.evaluate = function evaluate() {
        this.value = this.get();
        this.dirty = false;
    };

    /**
     * Depend on all deps collected by this watcher.
     */
    Watcher.prototype.depend = function depend() {
        var i = this.deps.length;
        while (i--) {
            this.deps[i].depend();
        }
    };

    /**
     * Remove self from all dependencies' subscriber list.
     */
    Watcher.prototype.teardown = function teardown() {
        if (this.active) {
            // remove self from vm's watcher list
            // this is a somewhat expensive operation so we skip it
            // if the vm is being destroyed.
            if (!this.vm._isBeingDestroyed) {
                remove(this.vm._watchers, this);
            }
            var i = this.deps.length;
            while (i--) {
                this.deps[i].removeSub(this);
            }
            this.active = false;
        }
    };

    /*  */

    var sharedPropertyDefinition = {
        enumerable: true,
        configurable: true,
        get: noop,
        set: noop
    };

    function proxy(target, sourceKey, key) {
        sharedPropertyDefinition.get = function proxyGetter() {
            return this[sourceKey][key]
        };
        sharedPropertyDefinition.set = function proxySetter(val) {
            this[sourceKey][key] = val;
        };
        Object.defineProperty(target, key, sharedPropertyDefinition);
    }

    function initState(vm) {
        vm._watchers = [];
        var opts = vm.$options;
        if (opts.props) { initProps(vm, opts.props); }
        if (opts.methods) { initMethods(vm, opts.methods); }
        if (opts.data) {
            initData(vm);
        } else {
            observe(vm._data = {}, true /* asRootData */);
        }
        if (opts.computed) { initComputed(vm, opts.computed); }
        if (opts.watch && opts.watch !== nativeWatch) {
            initWatch(vm, opts.watch);
        }
    }

    function initProps(vm, propsOptions) {
        var propsData = vm.$options.propsData || {};
        var props = vm._props = {};
        // cache prop keys so that future props updates can iterate using Array
        // instead of dynamic object key enumeration.
        var keys = vm.$options._propKeys = [];
        var isRoot = !vm.$parent;
        // root instance props should be converted
        if (!isRoot) {
            toggleObserving(false);
        }
        var loop = function (key) {
            keys.push(key);
            var value = validateProp(key, propsOptions, propsData, vm);
            /* istanbul ignore else */
            {
                var hyphenatedKey = hyphenate(key);
                if (isReservedAttribute(hyphenatedKey) ||
                    config.isReservedAttr(hyphenatedKey)) {
                    warn(
                        ("\"" + hyphenatedKey + "\" is a reserved attribute and cannot be used as component prop."),
                        vm
                    );
                }
                defineReactive$$1(props, key, value, function () {
                    if (!isRoot && !isUpdatingChildComponent) {
                        warn(
                            "Avoid mutating a prop directly since the value will be " +
                            "overwritten whenever the parent component re-renders. " +
                            "Instead, use a data or computed property based on the prop's " +
                            "value. Prop being mutated: \"" + key + "\"",
                            vm
                        );
                    }
                });
            }
            // static props are already proxied on the component's prototype
            // during Vue.extend(). We only need to proxy props defined at
            // instantiation here.
            if (!(key in vm)) {
                proxy(vm, "_props", key);
            }
        };

        for (var key in propsOptions) loop(key);
        toggleObserving(true);
    }

    function initData(vm) {
        var data = vm.$options.data;
        data = vm._data = typeof data === 'function'
            ? getData(data, vm)
            : data || {};
        if (!isPlainObject(data)) {
            data = {};
            warn(
                'data functions should return an object:\n' +
                'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
                vm
            );
        }
        // proxy data on instance
        var keys = Object.keys(data);
        var props = vm.$options.props;
        var methods = vm.$options.methods;
        var i = keys.length;
        while (i--) {
            var key = keys[i];
            {
                if (methods && hasOwn(methods, key)) {
                    warn(
                        ("Method \"" + key + "\" has already been defined as a data property."),
                        vm
                    );
                }
            }
            if (props && hasOwn(props, key)) {
                warn(
                    "The data property \"" + key + "\" is already declared as a prop. " +
                    "Use prop default value instead.",
                    vm
                );
            } else if (!isReserved(key)) {
                proxy(vm, "_data", key);
            }
        }
        // observe data
        observe(data, true /* asRootData */);
    }

    function getData(data, vm) {
        // #7573 disable dep collection when invoking data getters
        pushTarget();
        try {
            return data.call(vm, vm)
        } catch (e) {
            handleError(e, vm, "data()");
            return {}
        } finally {
            popTarget();
        }
    }

    var computedWatcherOptions = { lazy: true };

    function initComputed(vm, computed) {
        // $flow-disable-line
        var watchers = vm._computedWatchers = Object.create(null);
        // computed properties are just getters during SSR
        var isSSR = isServerRendering();

        for (var key in computed) {
            var userDef = computed[key];
            var getter = typeof userDef === 'function' ? userDef : userDef.get;
            if (getter == null) {
                warn(
                    ("Getter is missing for computed property \"" + key + "\"."),
                    vm
                );
            }

            if (!isSSR) {
                // create internal watcher for the computed property.
                watchers[key] = new Watcher(
                    vm,
                    getter || noop,
                    noop,
                    computedWatcherOptions
                );
            }

            // component-defined computed properties are already defined on the
            // component prototype. We only need to define computed properties defined
            // at instantiation here.
            if (!(key in vm)) {
                defineComputed(vm, key, userDef);
            } else {
                if (key in vm.$data) {
                    warn(("The computed property \"" + key + "\" is already defined in data."), vm);
                } else if (vm.$options.props && key in vm.$options.props) {
                    warn(("The computed property \"" + key + "\" is already defined as a prop."), vm);
                } else if (vm.$options.methods && key in vm.$options.methods) {
                    warn(("The computed property \"" + key + "\" is already defined as a method."), vm);
                }
            }
        }
    }

    function defineComputed(
        target,
        key,
        userDef
    ) {
        var shouldCache = !isServerRendering();
        if (typeof userDef === 'function') {
            sharedPropertyDefinition.get = shouldCache
                ? createComputedGetter(key)
                : createGetterInvoker(userDef);
            sharedPropertyDefinition.set = noop;
        } else {
            sharedPropertyDefinition.get = userDef.get
                ? shouldCache && userDef.cache !== false
                    ? createComputedGetter(key)
                    : createGetterInvoker(userDef.get)
                : noop;
            sharedPropertyDefinition.set = userDef.set || noop;
        }
        if (sharedPropertyDefinition.set === noop) {
            sharedPropertyDefinition.set = function () {
                warn(
                    ("Computed property \"" + key + "\" was assigned to but it has no setter."),
                    this
                );
            };
        }
        Object.defineProperty(target, key, sharedPropertyDefinition);
    }

    function createComputedGetter(key) {
        return function computedGetter() {
            var watcher = this._computedWatchers && this._computedWatchers[key];
            if (watcher) {
                if (watcher.dirty) {
                    watcher.evaluate();
                }
                if (Dep.target) {
                    watcher.depend();
                }
                return watcher.value
            }
        }
    }

    function createGetterInvoker(fn) {
        return function computedGetter() {
            return fn.call(this, this)
        }
    }

    function initMethods(vm, methods) {
        var props = vm.$options.props;
        for (var key in methods) {
            {
                if (typeof methods[key] !== 'function') {
                    warn(
                        "Method \"" + key + "\" has type \"" + (typeof methods[key]) + "\" in the component definition. " +
                        "Did you reference the function correctly?",
                        vm
                    );
                }
                if (props && hasOwn(props, key)) {
                    warn(
                        ("Method \"" + key + "\" has already been defined as a prop."),
                        vm
                    );
                }
                if ((key in vm) && isReserved(key)) {
                    warn(
                        "Method \"" + key + "\" conflicts with an existing Vue instance method. " +
                        "Avoid defining component methods that start with _ or $."
                    );
                }
            }
            vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm);
        }
    }

    function initWatch(vm, watch) {
        for (var key in watch) {
            var handler = watch[key];
            if (Array.isArray(handler)) {
                for (var i = 0; i < handler.length; i++) {
                    createWatcher(vm, key, handler[i]);
                }
            } else {
                createWatcher(vm, key, handler);
            }
        }
    }

    function createWatcher(
        vm,
        expOrFn,
        handler,
        options
    ) {
        if (isPlainObject(handler)) {
            options = handler;
            handler = handler.handler;
        }
        if (typeof handler === 'string') {
            handler = vm[handler];
        }
        return vm.$watch(expOrFn, handler, options)
    }

    function stateMixin(Vue) {
        // flow somehow has problems with directly declared definition object
        // when using Object.defineProperty, so we have to procedurally build up
        // the object here.
        var dataDef = {};
        dataDef.get = function () { return this._data };
        var propsDef = {};
        propsDef.get = function () { return this._props };
        {
            dataDef.set = function () {
                warn(
                    'Avoid replacing instance root $data. ' +
                    'Use nested data properties instead.',
                    this
                );
            };
            propsDef.set = function () {
                warn("$props is readonly.", this);
            };
        }
        Object.defineProperty(Vue.prototype, '$data', dataDef);
        Object.defineProperty(Vue.prototype, '$props', propsDef);

        Vue.prototype.$set = set;
        Vue.prototype.$delete = del;

        Vue.prototype.$watch = function (
            expOrFn,
            cb,
            options
        ) {
            var vm = this;
            if (isPlainObject(cb)) {
                return createWatcher(vm, expOrFn, cb, options)
            }
            options = options || {};
            options.user = true;
            var watcher = new Watcher(vm, expOrFn, cb, options);
            if (options.immediate) {
                var info = "callback for immediate watcher \"" + (watcher.expression) + "\"";
                pushTarget();
                invokeWithErrorHandling(cb, vm, [watcher.value], vm, info);
                popTarget();
            }
            return function unwatchFn() {
                watcher.teardown();
            }
        };
    }

    /*  */

    var uid$3 = 0;

    function initMixin(Vue) {
        Vue.prototype._init = function (options) {
            var vm = this;
            // a uid
            vm._uid = uid$3++;

            var startTag, endTag;
            /* istanbul ignore if */
            if (config.performance && mark) {
                startTag = "vue-perf-start:" + (vm._uid);
                endTag = "vue-perf-end:" + (vm._uid);
                mark(startTag);
            }

            // a flag to avoid this being observed
            vm._isVue = true;
            // merge options
            if (options && options._isComponent) {
                // optimize internal component instantiation
                // since dynamic options merging is pretty slow, and none of the
                // internal component options needs special treatment.
                initInternalComponent(vm, options);
            } else {
                vm.$options = mergeOptions(
                    resolveConstructorOptions(vm.constructor),
                    options || {},
                    vm
                );
            }
            /* istanbul ignore else */
            {
                initProxy(vm);
            }
            // expose real self
            vm._self = vm;
            initLifecycle(vm);
            initEvents(vm);
            initRender(vm);
            callHook(vm, 'beforeCreate');
            initInjections(vm); // resolve injections before data/props
            initState(vm);
            initProvide(vm); // resolve provide after data/props
            callHook(vm, 'created');

            /* istanbul ignore if */
            if (config.performance && mark) {
                vm._name = formatComponentName(vm, false);
                mark(endTag);
                measure(("vue " + (vm._name) + " init"), startTag, endTag);
            }

            if (vm.$options.el) {
                vm.$mount(vm.$options.el);
            }
        };
    }

    function initInternalComponent(vm, options) {
        var opts = vm.$options = Object.create(vm.constructor.options);
        // doing this because it's faster than dynamic enumeration.
        var parentVnode = options._parentVnode;
        opts.parent = options.parent;
        opts._parentVnode = parentVnode;

        var vnodeComponentOptions = parentVnode.componentOptions;
        opts.propsData = vnodeComponentOptions.propsData;
        opts._parentListeners = vnodeComponentOptions.listeners;
        opts._renderChildren = vnodeComponentOptions.children;
        opts._componentTag = vnodeComponentOptions.tag;

        if (options.render) {
            opts.render = options.render;
            opts.staticRenderFns = options.staticRenderFns;
        }
    }

    function resolveConstructorOptions(Ctor) {
        var options = Ctor.options;
        if (Ctor.super) {
            var superOptions = resolveConstructorOptions(Ctor.super);
            var cachedSuperOptions = Ctor.superOptions;
            if (superOptions !== cachedSuperOptions) {
                // super option changed,
                // need to resolve new options.
                Ctor.superOptions = superOptions;
                // check if there are any late-modified/attached options (#4976)
                var modifiedOptions = resolveModifiedOptions(Ctor);
                // update base extend options
                if (modifiedOptions) {
                    extend(Ctor.extendOptions, modifiedOptions);
                }
                options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
                if (options.name) {
                    options.components[options.name] = Ctor;
                }
            }
        }
        return options
    }

    function resolveModifiedOptions(Ctor) {
        var modified;
        var latest = Ctor.options;
        var sealed = Ctor.sealedOptions;
        for (var key in latest) {
            if (latest[key] !== sealed[key]) {
                if (!modified) { modified = {}; }
                modified[key] = latest[key];
            }
        }
        return modified
    }

    function Vue(options) {
        if (!(this instanceof Vue)
        ) {
            warn('Vue is a constructor and should be called with the `new` keyword');
        }
        this._init(options);
    }

    initMixin(Vue);
    stateMixin(Vue);
    eventsMixin(Vue);
    lifecycleMixin(Vue);
    renderMixin(Vue);

    /*  */

    function initUse(Vue) {
        Vue.use = function (plugin) {
            var installedPlugins = (this._installedPlugins || (this._installedPlugins = []));
            if (installedPlugins.indexOf(plugin) > -1) {
                return this
            }

            // additional parameters
            var args = toArray(arguments, 1);
            args.unshift(this);
            if (typeof plugin.install === 'function') {
                plugin.install.apply(plugin, args);
            } else if (typeof plugin === 'function') {
                plugin.apply(null, args);
            }
            installedPlugins.push(plugin);
            return this
        };
    }

    /*  */

    function initMixin$1(Vue) {
        Vue.mixin = function (mixin) {
            this.options = mergeOptions(this.options, mixin);
            return this
        };
    }

    /*  */

    function initExtend(Vue) {
        /**
         * Each instance constructor, including Vue, has a unique
         * cid. This enables us to create wrapped "child
         * constructors" for prototypal inheritance and cache them.
         */
        Vue.cid = 0;
        var cid = 1;

        /**
         * Class inheritance
         */
        Vue.extend = function (extendOptions) {
            extendOptions = extendOptions || {};
            var Super = this;
            var SuperId = Super.cid;
            var cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
            if (cachedCtors[SuperId]) {
                return cachedCtors[SuperId]
            }

            var name = extendOptions.name || Super.options.name;
            if (name) {
                validateComponentName(name);
            }

            var Sub = function VueComponent(options) {
                this._init(options);
            };
            Sub.prototype = Object.create(Super.prototype);
            Sub.prototype.constructor = Sub;
            Sub.cid = cid++;
            Sub.options = mergeOptions(
                Super.options,
                extendOptions
            );
            Sub['super'] = Super;

            // For props and computed properties, we define the proxy getters on
            // the Vue instances at extension time, on the extended prototype. This
            // avoids Object.defineProperty calls for each instance created.
            if (Sub.options.props) {
                initProps$1(Sub);
            }
            if (Sub.options.computed) {
                initComputed$1(Sub);
            }

            // allow further extension/mixin/plugin usage
            Sub.extend = Super.extend;
            Sub.mixin = Super.mixin;
            Sub.use = Super.use;

            // create asset registers, so extended classes
            // can have their private assets too.
            ASSET_TYPES.forEach(function (type) {
                Sub[type] = Super[type];
            });
            // enable recursive self-lookup
            if (name) {
                Sub.options.components[name] = Sub;
            }

            // keep a reference to the super options at extension time.
            // later at instantiation we can check if Super's options have
            // been updated.
            Sub.superOptions = Super.options;
            Sub.extendOptions = extendOptions;
            Sub.sealedOptions = extend({}, Sub.options);

            // cache constructor
            cachedCtors[SuperId] = Sub;
            return Sub
        };
    }

    function initProps$1(Comp) {
        var props = Comp.options.props;
        for (var key in props) {
            proxy(Comp.prototype, "_props", key);
        }
    }

    function initComputed$1(Comp) {
        var computed = Comp.options.computed;
        for (var key in computed) {
            defineComputed(Comp.prototype, key, computed[key]);
        }
    }

    /*  */

    function initAssetRegisters(Vue) {
        /**
         * Create asset registration methods.
         */
        ASSET_TYPES.forEach(function (type) {
            Vue[type] = function (
                id,
                definition
            ) {
                if (!definition) {
                    return this.options[type + 's'][id]
                } else {
                    /* istanbul ignore if */
                    if (type === 'component') {
                        validateComponentName(id);
                    }
                    if (type === 'component' && isPlainObject(definition)) {
                        definition.name = definition.name || id;
                        definition = this.options._base.extend(definition);
                    }
                    if (type === 'directive' && typeof definition === 'function') {
                        definition = { bind: definition, update: definition };
                    }
                    this.options[type + 's'][id] = definition;
                    return definition
                }
            };
        });
    }

    /*  */





    function getComponentName(opts) {
        return opts && (opts.Ctor.options.name || opts.tag)
    }

    function matches(pattern, name) {
        if (Array.isArray(pattern)) {
            return pattern.indexOf(name) > -1
        } else if (typeof pattern === 'string') {
            return pattern.split(',').indexOf(name) > -1
        } else if (isRegExp(pattern)) {
            return pattern.test(name)
        }
        /* istanbul ignore next */
        return false
    }

    function pruneCache(keepAliveInstance, filter) {
        var cache = keepAliveInstance.cache;
        var keys = keepAliveInstance.keys;
        var _vnode = keepAliveInstance._vnode;
        for (var key in cache) {
            var entry = cache[key];
            if (entry) {
                var name = entry.name;
                if (name && !filter(name)) {
                    pruneCacheEntry(cache, key, keys, _vnode);
                }
            }
        }
    }

    function pruneCacheEntry(
        cache,
        key,
        keys,
        current
    ) {
        var entry = cache[key];
        if (entry && (!current || entry.tag !== current.tag)) {
            entry.componentInstance.$destroy();
        }
        cache[key] = null;
        remove(keys, key);
    }

    var patternTypes = [String, RegExp, Array];

    var KeepAlive = {
        name: 'keep-alive',
        abstract: true,

        props: {
            include: patternTypes,
            exclude: patternTypes,
            max: [String, Number]
        },

        methods: {
            cacheVNode: function cacheVNode() {
                var ref = this;
                var cache = ref.cache;
                var keys = ref.keys;
                var vnodeToCache = ref.vnodeToCache;
                var keyToCache = ref.keyToCache;
                if (vnodeToCache) {
                    var tag = vnodeToCache.tag;
                    var componentInstance = vnodeToCache.componentInstance;
                    var componentOptions = vnodeToCache.componentOptions;
                    cache[keyToCache] = {
                        name: getComponentName(componentOptions),
                        tag: tag,
                        componentInstance: componentInstance,
                    };
                    keys.push(keyToCache);
                    // prune oldest entry
                    if (this.max && keys.length > parseInt(this.max)) {
                        pruneCacheEntry(cache, keys[0], keys, this._vnode);
                    }
                    this.vnodeToCache = null;
                }
            }
        },

        created: function created() {
            this.cache = Object.create(null);
            this.keys = [];
        },

        destroyed: function destroyed() {
            for (var key in this.cache) {
                pruneCacheEntry(this.cache, key, this.keys);
            }
        },

        mounted: function mounted() {
            var this$1 = this;

            this.cacheVNode();
            this.$watch('include', function (val) {
                pruneCache(this$1, function (name) { return matches(val, name); });
            });
            this.$watch('exclude', function (val) {
                pruneCache(this$1, function (name) { return !matches(val, name); });
            });
        },

        updated: function updated() {
            this.cacheVNode();
        },

        render: function render() {
            var slot = this.$slots.default;
            var vnode = getFirstComponentChild(slot);
            var componentOptions = vnode && vnode.componentOptions;
            if (componentOptions) {
                // check pattern
                var name = getComponentName(componentOptions);
                var ref = this;
                var include = ref.include;
                var exclude = ref.exclude;
                if (
                    // not included
                    (include && (!name || !matches(include, name))) ||
                    // excluded
                    (exclude && name && matches(exclude, name))
                ) {
                    return vnode
                }

                var ref$1 = this;
                var cache = ref$1.cache;
                var keys = ref$1.keys;
                var key = vnode.key == null
                    // same constructor may get registered as different local components
                    // so cid alone is not enough (#3269)
                    ? componentOptions.Ctor.cid + (componentOptions.tag ? ("::" + (componentOptions.tag)) : '')
                    : vnode.key;
                if (cache[key]) {
                    vnode.componentInstance = cache[key].componentInstance;
                    // make current key freshest
                    remove(keys, key);
                    keys.push(key);
                } else {
                    // delay setting the cache until update
                    this.vnodeToCache = vnode;
                    this.keyToCache = key;
                }

                vnode.data.keepAlive = true;
            }
            return vnode || (slot && slot[0])
        }
    };

    var builtInComponents = {
        KeepAlive: KeepAlive
    };

    /*  */

    function initGlobalAPI(Vue) {
        // config
        var configDef = {};
        configDef.get = function () { return config; };
        {
            configDef.set = function () {
                warn(
                    'Do not replace the Vue.config object, set individual fields instead.'
                );
            };
        }
        Object.defineProperty(Vue, 'config', configDef);

        // exposed util methods.
        // NOTE: these are not considered part of the public API - avoid relying on
        // them unless you are aware of the risk.
        Vue.util = {
            warn: warn,
            extend: extend,
            mergeOptions: mergeOptions,
            defineReactive: defineReactive$$1
        };

        Vue.set = set;
        Vue.delete = del;
        Vue.nextTick = nextTick;

        // 2.6 explicit observable API
        Vue.observable = function (obj) {
            observe(obj);
            return obj
        };

        Vue.options = Object.create(null);
        ASSET_TYPES.forEach(function (type) {
            Vue.options[type + 's'] = Object.create(null);
        });

        // this is used to identify the "base" constructor to extend all plain-object
        // components with in Weex's multi-instance scenarios.
        Vue.options._base = Vue;

        extend(Vue.options.components, builtInComponents);

        initUse(Vue);
        initMixin$1(Vue);
        initExtend(Vue);
        initAssetRegisters(Vue);
    }

    initGlobalAPI(Vue);

    Object.defineProperty(Vue.prototype, '$isServer', {
        get: isServerRendering
    });

    Object.defineProperty(Vue.prototype, '$ssrContext', {
        get: function get() {
            /* istanbul ignore next */
            return this.$vnode && this.$vnode.ssrContext
        }
    });

    // expose FunctionalRenderContext for ssr runtime helper installation
    Object.defineProperty(Vue, 'FunctionalRenderContext', {
        value: FunctionalRenderContext
    });

    Vue.version = '2.6.14';

    /*  */

    // these are reserved for web because they are directly compiled away
    // during template compilation
    var isReservedAttr = makeMap('style,class');

    // attributes that should be using props for binding
    var acceptValue = makeMap('input,textarea,option,select,progress');
    var mustUseProp = function (tag, type, attr) {
        return (
            (attr === 'value' && acceptValue(tag)) && type !== 'button' ||
            (attr === 'selected' && tag === 'option') ||
            (attr === 'checked' && tag === 'input') ||
            (attr === 'muted' && tag === 'video')
        )
    };

    var isEnumeratedAttr = makeMap('contenteditable,draggable,spellcheck');

    var isValidContentEditableValue = makeMap('events,caret,typing,plaintext-only');

    var convertEnumeratedValue = function (key, value) {
        return isFalsyAttrValue(value) || value === 'false'
            ? 'false'
            // allow arbitrary string value for contenteditable
            : key === 'contenteditable' && isValidContentEditableValue(value)
                ? value
                : 'true'
    };

    var isBooleanAttr = makeMap(
        'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,' +
        'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,' +
        'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,' +
        'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,' +
        'required,reversed,scoped,seamless,selected,sortable,' +
        'truespeed,typemustmatch,visible'
    );

    var xlinkNS = 'http://www.w3.org/1999/xlink';

    var isXlink = function (name) {
        return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink'
    };

    var getXlinkProp = function (name) {
        return isXlink(name) ? name.slice(6, name.length) : ''
    };

    var isFalsyAttrValue = function (val) {
        return val == null || val === false
    };

    /*  */

    function genClassForVnode(vnode) {
        var data = vnode.data;
        var parentNode = vnode;
        var childNode = vnode;
        while (isDef(childNode.componentInstance)) {
            childNode = childNode.componentInstance._vnode;
            if (childNode && childNode.data) {
                data = mergeClassData(childNode.data, data);
            }
        }
        while (isDef(parentNode = parentNode.parent)) {
            if (parentNode && parentNode.data) {
                data = mergeClassData(data, parentNode.data);
            }
        }
        return renderClass(data.staticClass, data.class)
    }

    function mergeClassData(child, parent) {
        return {
            staticClass: concat(child.staticClass, parent.staticClass),
            class: isDef(child.class)
                ? [child.class, parent.class]
                : parent.class
        }
    }

    function renderClass(
        staticClass,
        dynamicClass
    ) {
        if (isDef(staticClass) || isDef(dynamicClass)) {
            return concat(staticClass, stringifyClass(dynamicClass))
        }
        /* istanbul ignore next */
        return ''
    }

    function concat(a, b) {
        return a ? b ? (a + ' ' + b) : a : (b || '')
    }

    function stringifyClass(value) {
        if (Array.isArray(value)) {
            return stringifyArray(value)
        }
        if (isObject(value)) {
            return stringifyObject(value)
        }
        if (typeof value === 'string') {
            return value
        }
        /* istanbul ignore next */
        return ''
    }

    function stringifyArray(value) {
        var res = '';
        var stringified;
        for (var i = 0, l = value.length; i < l; i++) {
            if (isDef(stringified = stringifyClass(value[i])) && stringified !== '') {
                if (res) { res += ' '; }
                res += stringified;
            }
        }
        return res
    }

    function stringifyObject(value) {
        var res = '';
        for (var key in value) {
            if (value[key]) {
                if (res) { res += ' '; }
                res += key;
            }
        }
        return res
    }

    /*  */

    var namespaceMap = {
        svg: 'http://www.w3.org/2000/svg',
        math: 'http://www.w3.org/1998/Math/MathML'
    };

    var isHTMLTag = makeMap(
        'html,body,base,head,link,meta,style,title,' +
        'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
        'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
        'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
        's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
        'embed,object,param,source,canvas,script,noscript,del,ins,' +
        'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
        'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
        'output,progress,select,textarea,' +
        'details,dialog,menu,menuitem,summary,' +
        'content,element,shadow,template,blockquote,iframe,tfoot'
    );

    // this map is intentionally selective, only covering SVG elements that may
    // contain child elements.
    var isSVG = makeMap(
        'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
        'foreignobject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
        'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
        true
    );

    var isPreTag = function (tag) { return tag === 'pre'; };

    var isReservedTag = function (tag) {
        return isHTMLTag(tag) || isSVG(tag)
    };

    function getTagNamespace(tag) {
        if (isSVG(tag)) {
            return 'svg'
        }
        // basic support for MathML
        // note it doesn't support other MathML elements being component roots
        if (tag === 'math') {
            return 'math'
        }
    }

    var unknownElementCache = Object.create(null);
    function isUnknownElement(tag) {
        /* istanbul ignore if */
        if (!inBrowser) {
            return true
        }
        if (isReservedTag(tag)) {
            return false
        }
        tag = tag.toLowerCase();
        /* istanbul ignore if */
        if (unknownElementCache[tag] != null) {
            return unknownElementCache[tag]
        }
        var el = document.createElement(tag);
        if (tag.indexOf('-') > -1) {
            // http://stackoverflow.com/a/28210364/1070244
            return (unknownElementCache[tag] = (
                el.constructor === window.HTMLUnknownElement ||
                el.constructor === window.HTMLElement
            ))
        } else {
            return (unknownElementCache[tag] = /HTMLUnknownElement/.test(el.toString()))
        }
    }

    var isTextInputType = makeMap('text,number,password,search,email,tel,url');

    /*  */

    /**
     * Query an element selector if it's not an element already.
     */
    function query(el) {
        if (typeof el === 'string') {
            var selected = document.querySelector(el);
            if (!selected) {
                warn(
                    'Cannot find element: ' + el
                );
                return document.createElement('div')
            }
            return selected
        } else {
            return el
        }
    }

    /*  */

    function createElement$1(tagName, vnode) {
        var elm = document.createElement(tagName);
        if (tagName !== 'select') {
            return elm
        }
        // false or null will remove the attribute but undefined will not
        if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
            elm.setAttribute('multiple', 'multiple');
        }
        return elm
    }

    function createElementNS(namespace, tagName) {
        return document.createElementNS(namespaceMap[namespace], tagName)
    }

    function createTextNode(text) {
        return document.createTextNode(text)
    }

    function createComment(text) {
        return document.createComment(text)
    }

    function insertBefore(parentNode, newNode, referenceNode) {
        parentNode.insertBefore(newNode, referenceNode);
    }

    function removeChild(node, child) {
        node.removeChild(child);
    }

    function appendChild(node, child) {
        node.appendChild(child);
    }

    function parentNode(node) {
        return node.parentNode
    }

    function nextSibling(node) {
        return node.nextSibling
    }

    function tagName(node) {
        return node.tagName
    }

    function setTextContent(node, text) {
        node.textContent = text;
    }

    function setStyleScope(node, scopeId) {
        node.setAttribute(scopeId, '');
    }

    var nodeOps = /*#__PURE__*/Object.freeze({
        createElement: createElement$1,
        createElementNS: createElementNS,
        createTextNode: createTextNode,
        createComment: createComment,
        insertBefore: insertBefore,
        removeChild: removeChild,
        appendChild: appendChild,
        parentNode: parentNode,
        nextSibling: nextSibling,
        tagName: tagName,
        setTextContent: setTextContent,
        setStyleScope: setStyleScope
    });

    /*  */

    var ref = {
        create: function create(_, vnode) {
            registerRef(vnode);
        },
        update: function update(oldVnode, vnode) {
            if (oldVnode.data.ref !== vnode.data.ref) {
                registerRef(oldVnode, true);
                registerRef(vnode);
            }
        },
        destroy: function destroy(vnode) {
            registerRef(vnode, true);
        }
    };

    function registerRef(vnode, isRemoval) {
        var key = vnode.data.ref;
        if (!isDef(key)) { return }

        var vm = vnode.context;
        var ref = vnode.componentInstance || vnode.elm;
        var refs = vm.$refs;
        if (isRemoval) {
            if (Array.isArray(refs[key])) {
                remove(refs[key], ref);
            } else if (refs[key] === ref) {
                refs[key] = undefined;
            }
        } else {
            if (vnode.data.refInFor) {
                if (!Array.isArray(refs[key])) {
                    refs[key] = [ref];
                } else if (refs[key].indexOf(ref) < 0) {
                    // $flow-disable-line
                    refs[key].push(ref);
                }
            } else {
                refs[key] = ref;
            }
        }
    }

    /**
     * Virtual DOM patching algorithm based on Snabbdom by
     * Simon Friis Vindum (@paldepind)
     * Licensed under the MIT License
     * https://github.com/paldepind/snabbdom/blob/master/LICENSE
     *
     * modified by Evan You (@yyx990803)
     *
     * Not type-checking this because this file is perf-critical and the cost
     * of making flow understand it is not worth it.
     */

    var emptyNode = new VNode('', {}, []);

    var hooks = ['create', 'activate', 'update', 'remove', 'destroy'];

    function sameVnode(a, b) {
        return (
            a.key === b.key &&
            a.asyncFactory === b.asyncFactory && (
                (
                    a.tag === b.tag &&
                    a.isComment === b.isComment &&
                    isDef(a.data) === isDef(b.data) &&
                    sameInputType(a, b)
                ) || (
                    isTrue(a.isAsyncPlaceholder) &&
                    isUndef(b.asyncFactory.error)
                )
            )
        )
    }

    function sameInputType(a, b) {
        if (a.tag !== 'input') { return true }
        var i;
        var typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type;
        var typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type;
        return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB)
    }

    function createKeyToOldIdx(children, beginIdx, endIdx) {
        var i, key;
        var map = {};
        for (i = beginIdx; i <= endIdx; ++i) {
            key = children[i].key;
            if (isDef(key)) { map[key] = i; }
        }
        return map
    }

    function createPatchFunction(backend) {
        var i, j;
        var cbs = {};

        var modules = backend.modules;
        var nodeOps = backend.nodeOps;

        for (i = 0; i < hooks.length; ++i) {
            cbs[hooks[i]] = [];
            for (j = 0; j < modules.length; ++j) {
                if (isDef(modules[j][hooks[i]])) {
                    cbs[hooks[i]].push(modules[j][hooks[i]]);
                }
            }
        }

        function emptyNodeAt(elm) {
            return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
        }

        function createRmCb(childElm, listeners) {
            function remove$$1() {
                if (--remove$$1.listeners === 0) {
                    removeNode(childElm);
                }
            }
            remove$$1.listeners = listeners;
            return remove$$1
        }

        function removeNode(el) {
            var parent = nodeOps.parentNode(el);
            // element may have already been removed due to v-html / v-text
            if (isDef(parent)) {
                nodeOps.removeChild(parent, el);
            }
        }

        function isUnknownElement$$1(vnode, inVPre) {
            return (
                !inVPre &&
                !vnode.ns &&
                !(
                    config.ignoredElements.length &&
                    config.ignoredElements.some(function (ignore) {
                        return isRegExp(ignore)
                            ? ignore.test(vnode.tag)
                            : ignore === vnode.tag
                    })
                ) &&
                config.isUnknownElement(vnode.tag)
            )
        }

        var creatingElmInVPre = 0;

        function createElm(
            vnode,
            insertedVnodeQueue,
            parentElm,
            refElm,
            nested,
            ownerArray,
            index
        ) {
            if (isDef(vnode.elm) && isDef(ownerArray)) {
                // This vnode was used in a previous render!
                // now it's used as a new node, overwriting its elm would cause
                // potential patch errors down the road when it's used as an insertion
                // reference node. Instead, we clone the node on-demand before creating
                // associated DOM element for it.
                vnode = ownerArray[index] = cloneVNode(vnode);
            }

            vnode.isRootInsert = !nested; // for transition enter check
            if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
                return
            }

            var data = vnode.data;
            var children = vnode.children;
            var tag = vnode.tag;
            if (isDef(tag)) {
                {
                    if (data && data.pre) {
                        creatingElmInVPre++;
                    }
                    if (isUnknownElement$$1(vnode, creatingElmInVPre)) {
                        warn(
                            'Unknown custom element: <' + tag + '> - did you ' +
                            'register the component correctly? For recursive components, ' +
                            'make sure to provide the "name" option.',
                            vnode.context
                        );
                    }
                }

                vnode.elm = vnode.ns
                    ? nodeOps.createElementNS(vnode.ns, tag)
                    : nodeOps.createElement(tag, vnode);
                setScope(vnode);

                /* istanbul ignore if */
                {
                    createChildren(vnode, children, insertedVnodeQueue);
                    if (isDef(data)) {
                        invokeCreateHooks(vnode, insertedVnodeQueue);
                    }
                    insert(parentElm, vnode.elm, refElm);
                }

                if (data && data.pre) {
                    creatingElmInVPre--;
                }
            } else if (isTrue(vnode.isComment)) {
                vnode.elm = nodeOps.createComment(vnode.text);
                insert(parentElm, vnode.elm, refElm);
            } else {
                vnode.elm = nodeOps.createTextNode(vnode.text);
                insert(parentElm, vnode.elm, refElm);
            }
        }

        function createComponent(vnode, insertedVnodeQueue, parentElm, refElm) {
            var i = vnode.data;
            if (isDef(i)) {
                var isReactivated = isDef(vnode.componentInstance) && i.keepAlive;
                if (isDef(i = i.hook) && isDef(i = i.init)) {
                    i(vnode, false /* hydrating */);
                }
                // after calling the init hook, if the vnode is a child component
                // it should've created a child instance and mounted it. the child
                // component also has set the placeholder vnode's elm.
                // in that case we can just return the element and be done.
                if (isDef(vnode.componentInstance)) {
                    initComponent(vnode, insertedVnodeQueue);
                    insert(parentElm, vnode.elm, refElm);
                    if (isTrue(isReactivated)) {
                        reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm);
                    }
                    return true
                }
            }
        }

        function initComponent(vnode, insertedVnodeQueue) {
            if (isDef(vnode.data.pendingInsert)) {
                insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert);
                vnode.data.pendingInsert = null;
            }
            vnode.elm = vnode.componentInstance.$el;
            if (isPatchable(vnode)) {
                invokeCreateHooks(vnode, insertedVnodeQueue);
                setScope(vnode);
            } else {
                // empty component root.
                // skip all element-related modules except for ref (#3455)
                registerRef(vnode);
                // make sure to invoke the insert hook
                insertedVnodeQueue.push(vnode);
            }
        }

        function reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm) {
            var i;
            // hack for #4339: a reactivated component with inner transition
            // does not trigger because the inner node's created hooks are not called
            // again. It's not ideal to involve module-specific logic in here but
            // there doesn't seem to be a better way to do it.
            var innerNode = vnode;
            while (innerNode.componentInstance) {
                innerNode = innerNode.componentInstance._vnode;
                if (isDef(i = innerNode.data) && isDef(i = i.transition)) {
                    for (i = 0; i < cbs.activate.length; ++i) {
                        cbs.activate[i](emptyNode, innerNode);
                    }
                    insertedVnodeQueue.push(innerNode);
                    break
                }
            }
            // unlike a newly created component,
            // a reactivated keep-alive component doesn't insert itself
            insert(parentElm, vnode.elm, refElm);
        }

        function insert(parent, elm, ref$$1) {
            if (isDef(parent)) {
                if (isDef(ref$$1)) {
                    if (nodeOps.parentNode(ref$$1) === parent) {
                        nodeOps.insertBefore(parent, elm, ref$$1);
                    }
                } else {
                    nodeOps.appendChild(parent, elm);
                }
            }
        }

        function createChildren(vnode, children, insertedVnodeQueue) {
            if (Array.isArray(children)) {
                {
                    checkDuplicateKeys(children);
                }
                for (var i = 0; i < children.length; ++i) {
                    createElm(children[i], insertedVnodeQueue, vnode.elm, null, true, children, i);
                }
            } else if (isPrimitive(vnode.text)) {
                nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)));
            }
        }

        function isPatchable(vnode) {
            while (vnode.componentInstance) {
                vnode = vnode.componentInstance._vnode;
            }
            return isDef(vnode.tag)
        }

        function invokeCreateHooks(vnode, insertedVnodeQueue) {
            for (var i$1 = 0; i$1 < cbs.create.length; ++i$1) {
                cbs.create[i$1](emptyNode, vnode);
            }
            i = vnode.data.hook; // Reuse variable
            if (isDef(i)) {
                if (isDef(i.create)) { i.create(emptyNode, vnode); }
                if (isDef(i.insert)) { insertedVnodeQueue.push(vnode); }
            }
        }

        // set scope id attribute for scoped CSS.
        // this is implemented as a special case to avoid the overhead
        // of going through the normal attribute patching process.
        function setScope(vnode) {
            var i;
            if (isDef(i = vnode.fnScopeId)) {
                nodeOps.setStyleScope(vnode.elm, i);
            } else {
                var ancestor = vnode;
                while (ancestor) {
                    if (isDef(i = ancestor.context) && isDef(i = i.$options._scopeId)) {
                        nodeOps.setStyleScope(vnode.elm, i);
                    }
                    ancestor = ancestor.parent;
                }
            }
            // for slot content they should also get the scopeId from the host instance.
            if (isDef(i = activeInstance) &&
                i !== vnode.context &&
                i !== vnode.fnContext &&
                isDef(i = i.$options._scopeId)
            ) {
                nodeOps.setStyleScope(vnode.elm, i);
            }
        }

        function addVnodes(parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
            for (; startIdx <= endIdx; ++startIdx) {
                createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx);
            }
        }

        function invokeDestroyHook(vnode) {
            var i, j;
            var data = vnode.data;
            if (isDef(data)) {
                if (isDef(i = data.hook) && isDef(i = i.destroy)) { i(vnode); }
                for (i = 0; i < cbs.destroy.length; ++i) { cbs.destroy[i](vnode); }
            }
            if (isDef(i = vnode.children)) {
                for (j = 0; j < vnode.children.length; ++j) {
                    invokeDestroyHook(vnode.children[j]);
                }
            }
        }

        function removeVnodes(vnodes, startIdx, endIdx) {
            for (; startIdx <= endIdx; ++startIdx) {
                var ch = vnodes[startIdx];
                if (isDef(ch)) {
                    if (isDef(ch.tag)) {
                        removeAndInvokeRemoveHook(ch);
                        invokeDestroyHook(ch);
                    } else { // Text node
                        removeNode(ch.elm);
                    }
                }
            }
        }

        function removeAndInvokeRemoveHook(vnode, rm) {
            if (isDef(rm) || isDef(vnode.data)) {
                var i;
                var listeners = cbs.remove.length + 1;
                if (isDef(rm)) {
                    // we have a recursively passed down rm callback
                    // increase the listeners count
                    rm.listeners += listeners;
                } else {
                    // directly removing
                    rm = createRmCb(vnode.elm, listeners);
                }
                // recursively invoke hooks on child component root node
                if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
                    removeAndInvokeRemoveHook(i, rm);
                }
                for (i = 0; i < cbs.remove.length; ++i) {
                    cbs.remove[i](vnode, rm);
                }
                if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
                    i(vnode, rm);
                } else {
                    rm();
                }
            } else {
                removeNode(vnode.elm);
            }
        }

        function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
            var oldStartIdx = 0;
            var newStartIdx = 0;
            var oldEndIdx = oldCh.length - 1;
            var oldStartVnode = oldCh[0];
            var oldEndVnode = oldCh[oldEndIdx];
            var newEndIdx = newCh.length - 1;
            var newStartVnode = newCh[0];
            var newEndVnode = newCh[newEndIdx];
            var oldKeyToIdx, idxInOld, vnodeToMove, refElm;

            // removeOnly is a special flag used only by <transition-group>
            // to ensure removed elements stay in correct relative positions
            // during leaving transitions
            var canMove = !removeOnly;

            {
                checkDuplicateKeys(newCh);
            }

            while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
                if (isUndef(oldStartVnode)) {
                    oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
                } else if (isUndef(oldEndVnode)) {
                    oldEndVnode = oldCh[--oldEndIdx];
                } else if (sameVnode(oldStartVnode, newStartVnode)) {
                    patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
                    oldStartVnode = oldCh[++oldStartIdx];
                    newStartVnode = newCh[++newStartIdx];
                } else if (sameVnode(oldEndVnode, newEndVnode)) {
                    patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
                    oldEndVnode = oldCh[--oldEndIdx];
                    newEndVnode = newCh[--newEndIdx];
                } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
                    patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
                    canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm));
                    oldStartVnode = oldCh[++oldStartIdx];
                    newEndVnode = newCh[--newEndIdx];
                } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
                    patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
                    canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
                    oldEndVnode = oldCh[--oldEndIdx];
                    newStartVnode = newCh[++newStartIdx];
                } else {
                    if (isUndef(oldKeyToIdx)) { oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx); }
                    idxInOld = isDef(newStartVnode.key)
                        ? oldKeyToIdx[newStartVnode.key]
                        : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
                    if (isUndef(idxInOld)) { // New element
                        createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
                    } else {
                        vnodeToMove = oldCh[idxInOld];
                        if (sameVnode(vnodeToMove, newStartVnode)) {
                            patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
                            oldCh[idxInOld] = undefined;
                            canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm);
                        } else {
                            // same key but different element. treat as new element
                            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
                        }
                    }
                    newStartVnode = newCh[++newStartIdx];
                }
            }
            if (oldStartIdx > oldEndIdx) {
                refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm;
                addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
            } else if (newStartIdx > newEndIdx) {
                removeVnodes(oldCh, oldStartIdx, oldEndIdx);
            }
        }

        function checkDuplicateKeys(children) {
            var seenKeys = {};
            for (var i = 0; i < children.length; i++) {
                var vnode = children[i];
                var key = vnode.key;
                if (isDef(key)) {
                    if (seenKeys[key]) {
                        warn(
                            ("Duplicate keys detected: '" + key + "'. This may cause an update error."),
                            vnode.context
                        );
                    } else {
                        seenKeys[key] = true;
                    }
                }
            }
        }

        function findIdxInOld(node, oldCh, start, end) {
            for (var i = start; i < end; i++) {
                var c = oldCh[i];
                if (isDef(c) && sameVnode(node, c)) { return i }
            }
        }

        function patchVnode(
            oldVnode,
            vnode,
            insertedVnodeQueue,
            ownerArray,
            index,
            removeOnly
        ) {
            if (oldVnode === vnode) {
                return
            }

            if (isDef(vnode.elm) && isDef(ownerArray)) {
                // clone reused vnode
                vnode = ownerArray[index] = cloneVNode(vnode);
            }

            var elm = vnode.elm = oldVnode.elm;

            if (isTrue(oldVnode.isAsyncPlaceholder)) {
                if (isDef(vnode.asyncFactory.resolved)) {
                    hydrate(oldVnode.elm, vnode, insertedVnodeQueue);
                } else {
                    vnode.isAsyncPlaceholder = true;
                }
                return
            }

            // reuse element for static trees.
            // note we only do this if the vnode is cloned -
            // if the new node is not cloned it means the render functions have been
            // reset by the hot-reload-api and we need to do a proper re-render.
            if (isTrue(vnode.isStatic) &&
                isTrue(oldVnode.isStatic) &&
                vnode.key === oldVnode.key &&
                (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
            ) {
                vnode.componentInstance = oldVnode.componentInstance;
                return
            }

            var i;
            var data = vnode.data;
            if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
                i(oldVnode, vnode);
            }

            var oldCh = oldVnode.children;
            var ch = vnode.children;
            if (isDef(data) && isPatchable(vnode)) {
                for (i = 0; i < cbs.update.length; ++i) { cbs.update[i](oldVnode, vnode); }
                if (isDef(i = data.hook) && isDef(i = i.update)) { i(oldVnode, vnode); }
            }
            if (isUndef(vnode.text)) {
                if (isDef(oldCh) && isDef(ch)) {
                    if (oldCh !== ch) { updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly); }
                } else if (isDef(ch)) {
                    {
                        checkDuplicateKeys(ch);
                    }
                    if (isDef(oldVnode.text)) { nodeOps.setTextContent(elm, ''); }
                    addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
                } else if (isDef(oldCh)) {
                    removeVnodes(oldCh, 0, oldCh.length - 1);
                } else if (isDef(oldVnode.text)) {
                    nodeOps.setTextContent(elm, '');
                }
            } else if (oldVnode.text !== vnode.text) {
                nodeOps.setTextContent(elm, vnode.text);
            }
            if (isDef(data)) {
                if (isDef(i = data.hook) && isDef(i = i.postpatch)) { i(oldVnode, vnode); }
            }
        }

        function invokeInsertHook(vnode, queue, initial) {
            // delay insert hooks for component root nodes, invoke them after the
            // element is really inserted
            if (isTrue(initial) && isDef(vnode.parent)) {
                vnode.parent.data.pendingInsert = queue;
            } else {
                for (var i = 0; i < queue.length; ++i) {
                    queue[i].data.hook.insert(queue[i]);
                }
            }
        }

        var hydrationBailed = false;
        // list of modules that can skip create hook during hydration because they
        // are already rendered on the client or has no need for initialization
        // Note: style is excluded because it relies on initial clone for future
        // deep updates (#7063).
        var isRenderedModule = makeMap('attrs,class,staticClass,staticStyle,key');

        // Note: this is a browser-only function so we can assume elms are DOM nodes.
        function hydrate(elm, vnode, insertedVnodeQueue, inVPre) {
            var i;
            var tag = vnode.tag;
            var data = vnode.data;
            var children = vnode.children;
            inVPre = inVPre || (data && data.pre);
            vnode.elm = elm;

            if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
                vnode.isAsyncPlaceholder = true;
                return true
            }
            // assert node match
            {
                if (!assertNodeMatch(elm, vnode, inVPre)) {
                    return false
                }
            }
            if (isDef(data)) {
                if (isDef(i = data.hook) && isDef(i = i.init)) { i(vnode, true /* hydrating */); }
                if (isDef(i = vnode.componentInstance)) {
                    // child component. it should have hydrated its own tree.
                    initComponent(vnode, insertedVnodeQueue);
                    return true
                }
            }
            if (isDef(tag)) {
                if (isDef(children)) {
                    // empty element, allow client to pick up and populate children
                    if (!elm.hasChildNodes()) {
                        createChildren(vnode, children, insertedVnodeQueue);
                    } else {
                        // v-html and domProps: innerHTML
                        if (isDef(i = data) && isDef(i = i.domProps) && isDef(i = i.innerHTML)) {
                            if (i !== elm.innerHTML) {
                                /* istanbul ignore if */
                                if (typeof console !== 'undefined' &&
                                    !hydrationBailed
                                ) {
                                    hydrationBailed = true;
                                    console.warn('Parent: ', elm);
                                    console.warn('server innerHTML: ', i);
                                    console.warn('client innerHTML: ', elm.innerHTML);
                                }
                                return false
                            }
                        } else {
                            // iterate and compare children lists
                            var childrenMatch = true;
                            var childNode = elm.firstChild;
                            for (var i$1 = 0; i$1 < children.length; i$1++) {
                                if (!childNode || !hydrate(childNode, children[i$1], insertedVnodeQueue, inVPre)) {
                                    childrenMatch = false;
                                    break
                                }
                                childNode = childNode.nextSibling;
                            }
                            // if childNode is not null, it means the actual childNodes list is
                            // longer than the virtual children list.
                            if (!childrenMatch || childNode) {
                                /* istanbul ignore if */
                                if (typeof console !== 'undefined' &&
                                    !hydrationBailed
                                ) {
                                    hydrationBailed = true;
                                    console.warn('Parent: ', elm);
                                    console.warn('Mismatching childNodes vs. VNodes: ', elm.childNodes, children);
                                }
                                return false
                            }
                        }
                    }
                }
                if (isDef(data)) {
                    var fullInvoke = false;
                    for (var key in data) {
                        if (!isRenderedModule(key)) {
                            fullInvoke = true;
                            invokeCreateHooks(vnode, insertedVnodeQueue);
                            break
                        }
                    }
                    if (!fullInvoke && data['class']) {
                        // ensure collecting deps for deep class bindings for future updates
                        traverse(data['class']);
                    }
                }
            } else if (elm.data !== vnode.text) {
                elm.data = vnode.text;
            }
            return true
        }

        function assertNodeMatch(node, vnode, inVPre) {
            if (isDef(vnode.tag)) {
                return vnode.tag.indexOf('vue-component') === 0 || (
                    !isUnknownElement$$1(vnode, inVPre) &&
                    vnode.tag.toLowerCase() === (node.tagName && node.tagName.toLowerCase())
                )
            } else {
                return node.nodeType === (vnode.isComment ? 8 : 3)
            }
        }

        return function patch(oldVnode, vnode, hydrating, removeOnly) {
            if (isUndef(vnode)) {
                if (isDef(oldVnode)) { invokeDestroyHook(oldVnode); }
                return
            }

            var isInitialPatch = false;
            var insertedVnodeQueue = [];

            if (isUndef(oldVnode)) {
                // empty mount (likely as component), create new root element
                isInitialPatch = true;
                createElm(vnode, insertedVnodeQueue);
            } else {
                var isRealElement = isDef(oldVnode.nodeType);
                if (!isRealElement && sameVnode(oldVnode, vnode)) {
                    // patch existing root node
                    patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly);
                } else {
                    if (isRealElement) {
                        // mounting to a real element
                        // check if this is server-rendered content and if we can perform
                        // a successful hydration.
                        if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
                            oldVnode.removeAttribute(SSR_ATTR);
                            hydrating = true;
                        }
                        if (isTrue(hydrating)) {
                            if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
                                invokeInsertHook(vnode, insertedVnodeQueue, true);
                                return oldVnode
                            } else {
                                warn(
                                    'The client-side rendered virtual DOM tree is not matching ' +
                                    'server-rendered content. This is likely caused by incorrect ' +
                                    'HTML markup, for example nesting block-level elements inside ' +
                                    '<p>, or missing <tbody>. Bailing hydration and performing ' +
                                    'full client-side render.'
                                );
                            }
                        }
                        // either not server-rendered, or hydration failed.
                        // create an empty node and replace it
                        oldVnode = emptyNodeAt(oldVnode);
                    }

                    // replacing existing element
                    var oldElm = oldVnode.elm;
                    var parentElm = nodeOps.parentNode(oldElm);

                    // create new node
                    createElm(
                        vnode,
                        insertedVnodeQueue,
                        // extremely rare edge case: do not insert if old element is in a
                        // leaving transition. Only happens when combining transition +
                        // keep-alive + HOCs. (#4590)
                        oldElm._leaveCb ? null : parentElm,
                        nodeOps.nextSibling(oldElm)
                    );

                    // update parent placeholder node element, recursively
                    if (isDef(vnode.parent)) {
                        var ancestor = vnode.parent;
                        var patchable = isPatchable(vnode);
                        while (ancestor) {
                            for (var i = 0; i < cbs.destroy.length; ++i) {
                                cbs.destroy[i](ancestor);
                            }
                            ancestor.elm = vnode.elm;
                            if (patchable) {
                                for (var i$1 = 0; i$1 < cbs.create.length; ++i$1) {
                                    cbs.create[i$1](emptyNode, ancestor);
                                }
                                // #6513
                                // invoke insert hooks that may have been merged by create hooks.
                                // e.g. for directives that uses the "inserted" hook.
                                var insert = ancestor.data.hook.insert;
                                if (insert.merged) {
                                    // start at index 1 to avoid re-invoking component mounted hook
                                    for (var i$2 = 1; i$2 < insert.fns.length; i$2++) {
                                        insert.fns[i$2]();
                                    }
                                }
                            } else {
                                registerRef(ancestor);
                            }
                            ancestor = ancestor.parent;
                        }
                    }

                    // destroy old node
                    if (isDef(parentElm)) {
                        removeVnodes([oldVnode], 0, 0);
                    } else if (isDef(oldVnode.tag)) {
                        invokeDestroyHook(oldVnode);
                    }
                }
            }

            invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch);
            return vnode.elm
        }
    }

    /*  */

    var directives = {
        create: updateDirectives,
        update: updateDirectives,
        destroy: function unbindDirectives(vnode) {
            updateDirectives(vnode, emptyNode);
        }
    };

    function updateDirectives(oldVnode, vnode) {
        if (oldVnode.data.directives || vnode.data.directives) {
            _update(oldVnode, vnode);
        }
    }

    function _update(oldVnode, vnode) {
        var isCreate = oldVnode === emptyNode;
        var isDestroy = vnode === emptyNode;
        var oldDirs = normalizeDirectives$1(oldVnode.data.directives, oldVnode.context);
        var newDirs = normalizeDirectives$1(vnode.data.directives, vnode.context);

        var dirsWithInsert = [];
        var dirsWithPostpatch = [];

        var key, oldDir, dir;
        for (key in newDirs) {
            oldDir = oldDirs[key];
            dir = newDirs[key];
            if (!oldDir) {
                // new directive, bind
                callHook$1(dir, 'bind', vnode, oldVnode);
                if (dir.def && dir.def.inserted) {
                    dirsWithInsert.push(dir);
                }
            } else {
                // existing directive, update
                dir.oldValue = oldDir.value;
                dir.oldArg = oldDir.arg;
                callHook$1(dir, 'update', vnode, oldVnode);
                if (dir.def && dir.def.componentUpdated) {
                    dirsWithPostpatch.push(dir);
                }
            }
        }

        if (dirsWithInsert.length) {
            var callInsert = function () {
                for (var i = 0; i < dirsWithInsert.length; i++) {
                    callHook$1(dirsWithInsert[i], 'inserted', vnode, oldVnode);
                }
            };
            if (isCreate) {
                mergeVNodeHook(vnode, 'insert', callInsert);
            } else {
                callInsert();
            }
        }

        if (dirsWithPostpatch.length) {
            mergeVNodeHook(vnode, 'postpatch', function () {
                for (var i = 0; i < dirsWithPostpatch.length; i++) {
                    callHook$1(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode);
                }
            });
        }

        if (!isCreate) {
            for (key in oldDirs) {
                if (!newDirs[key]) {
                    // no longer present, unbind
                    callHook$1(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy);
                }
            }
        }
    }

    var emptyModifiers = Object.create(null);

    function normalizeDirectives$1(
        dirs,
        vm
    ) {
        var res = Object.create(null);
        if (!dirs) {
            // $flow-disable-line
            return res
        }
        var i, dir;
        for (i = 0; i < dirs.length; i++) {
            dir = dirs[i];
            if (!dir.modifiers) {
                // $flow-disable-line
                dir.modifiers = emptyModifiers;
            }
            res[getRawDirName(dir)] = dir;
            dir.def = resolveAsset(vm.$options, 'directives', dir.name, true);
        }
        // $flow-disable-line
        return res
    }

    function getRawDirName(dir) {
        return dir.rawName || ((dir.name) + "." + (Object.keys(dir.modifiers || {}).join('.')))
    }

    function callHook$1(dir, hook, vnode, oldVnode, isDestroy) {
        var fn = dir.def && dir.def[hook];
        if (fn) {
            try {
                fn(vnode.elm, dir, vnode, oldVnode, isDestroy);
            } catch (e) {
                handleError(e, vnode.context, ("directive " + (dir.name) + " " + hook + " hook"));
            }
        }
    }

    var baseModules = [
        ref,
        directives
    ];

    /*  */

    function updateAttrs(oldVnode, vnode) {
        var opts = vnode.componentOptions;
        if (isDef(opts) && opts.Ctor.options.inheritAttrs === false) {
            return
        }
        if (isUndef(oldVnode.data.attrs) && isUndef(vnode.data.attrs)) {
            return
        }
        var key, cur, old;
        var elm = vnode.elm;
        var oldAttrs = oldVnode.data.attrs || {};
        var attrs = vnode.data.attrs || {};
        // clone observed objects, as the user probably wants to mutate it
        if (isDef(attrs.__ob__)) {
            attrs = vnode.data.attrs = extend({}, attrs);
        }

        for (key in attrs) {
            cur = attrs[key];
            old = oldAttrs[key];
            if (old !== cur) {
                setAttr(elm, key, cur, vnode.data.pre);
            }
        }
        // #4391: in IE9, setting type can reset value for input[type=radio]
        // #6666: IE/Edge forces progress value down to 1 before setting a max
        /* istanbul ignore if */
        if ((isIE || isEdge) && attrs.value !== oldAttrs.value) {
            setAttr(elm, 'value', attrs.value);
        }
        for (key in oldAttrs) {
            if (isUndef(attrs[key])) {
                if (isXlink(key)) {
                    elm.removeAttributeNS(xlinkNS, getXlinkProp(key));
                } else if (!isEnumeratedAttr(key)) {
                    elm.removeAttribute(key);
                }
            }
        }
    }

    function setAttr(el, key, value, isInPre) {
        if (isInPre || el.tagName.indexOf('-') > -1) {
            baseSetAttr(el, key, value);
        } else if (isBooleanAttr(key)) {
            // set attribute for blank value
            // e.g. <option disabled>Select one</option>
            if (isFalsyAttrValue(value)) {
                el.removeAttribute(key);
            } else {
                // technically allowfullscreen is a boolean attribute for <iframe>,
                // but Flash expects a value of "true" when used on <embed> tag
                value = key === 'allowfullscreen' && el.tagName === 'EMBED'
                    ? 'true'
                    : key;
                el.setAttribute(key, value);
            }
        } else if (isEnumeratedAttr(key)) {
            el.setAttribute(key, convertEnumeratedValue(key, value));
        } else if (isXlink(key)) {
            if (isFalsyAttrValue(value)) {
                el.removeAttributeNS(xlinkNS, getXlinkProp(key));
            } else {
                el.setAttributeNS(xlinkNS, key, value);
            }
        } else {
            baseSetAttr(el, key, value);
        }
    }

    function baseSetAttr(el, key, value) {
        if (isFalsyAttrValue(value)) {
            el.removeAttribute(key);
        } else {
            // #7138: IE10 & 11 fires input event when setting placeholder on
            // <textarea>... block the first input event and remove the blocker
            // immediately.
            /* istanbul ignore if */
            if (
                isIE && !isIE9 &&
                el.tagName === 'TEXTAREA' &&
                key === 'placeholder' && value !== '' && !el.__ieph
            ) {
                var blocker = function (e) {
                    e.stopImmediatePropagation();
                    el.removeEventListener('input', blocker);
                };
                el.addEventListener('input', blocker);
                // $flow-disable-line
                el.__ieph = true; /* IE placeholder patched */
            }
            el.setAttribute(key, value);
        }
    }

    var attrs = {
        create: updateAttrs,
        update: updateAttrs
    };

    /*  */

    function updateClass(oldVnode, vnode) {
        var el = vnode.elm;
        var data = vnode.data;
        var oldData = oldVnode.data;
        if (
            isUndef(data.staticClass) &&
            isUndef(data.class) && (
                isUndef(oldData) || (
                    isUndef(oldData.staticClass) &&
                    isUndef(oldData.class)
                )
            )
        ) {
            return
        }

        var cls = genClassForVnode(vnode);

        // handle transition classes
        var transitionClass = el._transitionClasses;
        if (isDef(transitionClass)) {
            cls = concat(cls, stringifyClass(transitionClass));
        }

        // set the class
        if (cls !== el._prevClass) {
            el.setAttribute('class', cls);
            el._prevClass = cls;
        }
    }

    var klass = {
        create: updateClass,
        update: updateClass
    };

    /*  */

    var validDivisionCharRE = /[\w).+\-_$\]]/;

    function parseFilters(exp) {
        var inSingle = false;
        var inDouble = false;
        var inTemplateString = false;
        var inRegex = false;
        var curly = 0;
        var square = 0;
        var paren = 0;
        var lastFilterIndex = 0;
        var c, prev, i, expression, filters;

        for (i = 0; i < exp.length; i++) {
            prev = c;
            c = exp.charCodeAt(i);
            if (inSingle) {
                if (c === 0x27 && prev !== 0x5C) { inSingle = false; }
            } else if (inDouble) {
                if (c === 0x22 && prev !== 0x5C) { inDouble = false; }
            } else if (inTemplateString) {
                if (c === 0x60 && prev !== 0x5C) { inTemplateString = false; }
            } else if (inRegex) {
                if (c === 0x2f && prev !== 0x5C) { inRegex = false; }
            } else if (
                c === 0x7C && // pipe
                exp.charCodeAt(i + 1) !== 0x7C &&
                exp.charCodeAt(i - 1) !== 0x7C &&
                !curly && !square && !paren
            ) {
                if (expression === undefined) {
                    // first filter, end of expression
                    lastFilterIndex = i + 1;
                    expression = exp.slice(0, i).trim();
                } else {
                    pushFilter();
                }
            } else {
                switch (c) {
                    case 0x22: inDouble = true; break         // "
                    case 0x27: inSingle = true; break         // '
                    case 0x60: inTemplateString = true; break // `
                    case 0x28: paren++; break                 // (
                    case 0x29: paren--; break                 // )
                    case 0x5B: square++; break                // [
                    case 0x5D: square--; break                // ]
                    case 0x7B: curly++; break                 // {
                    case 0x7D: curly--; break                 // }
                }
                if (c === 0x2f) { // /
                    var j = i - 1;
                    var p = (void 0);
                    // find first non-whitespace prev char
                    for (; j >= 0; j--) {
                        p = exp.charAt(j);
                        if (p !== ' ') { break }
                    }
                    if (!p || !validDivisionCharRE.test(p)) {
                        inRegex = true;
                    }
                }
            }
        }

        if (expression === undefined) {
            expression = exp.slice(0, i).trim();
        } else if (lastFilterIndex !== 0) {
            pushFilter();
        }

        function pushFilter() {
            (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim());
            lastFilterIndex = i + 1;
        }

        if (filters) {
            for (i = 0; i < filters.length; i++) {
                expression = wrapFilter(expression, filters[i]);
            }
        }

        return expression
    }

    function wrapFilter(exp, filter) {
        var i = filter.indexOf('(');
        if (i < 0) {
            // _f: resolveFilter
            return ("_f(\"" + filter + "\")(" + exp + ")")
        } else {
            var name = filter.slice(0, i);
            var args = filter.slice(i + 1);
            return ("_f(\"" + name + "\")(" + exp + (args !== ')' ? ',' + args : args))
        }
    }

    /*  */



    /* eslint-disable no-unused-vars */
    function baseWarn(msg, range) {
        console.error(("[Vue compiler]: " + msg));
    }
    /* eslint-enable no-unused-vars */

    function pluckModuleFunction(
        modules,
        key
    ) {
        return modules
            ? modules.map(function (m) { return m[key]; }).filter(function (_) { return _; })
            : []
    }

    function addProp(el, name, value, range, dynamic) {
        (el.props || (el.props = [])).push(rangeSetItem({ name: name, value: value, dynamic: dynamic }, range));
        el.plain = false;
    }

    function addAttr(el, name, value, range, dynamic) {
        var attrs = dynamic
            ? (el.dynamicAttrs || (el.dynamicAttrs = []))
            : (el.attrs || (el.attrs = []));
        attrs.push(rangeSetItem({ name: name, value: value, dynamic: dynamic }, range));
        el.plain = false;
    }

    // add a raw attr (use this in preTransforms)
    function addRawAttr(el, name, value, range) {
        el.attrsMap[name] = value;
        el.attrsList.push(rangeSetItem({ name: name, value: value }, range));
    }

    function addDirective(
        el,
        name,
        rawName,
        value,
        arg,
        isDynamicArg,
        modifiers,
        range
    ) {
        (el.directives || (el.directives = [])).push(rangeSetItem({
            name: name,
            rawName: rawName,
            value: value,
            arg: arg,
            isDynamicArg: isDynamicArg,
            modifiers: modifiers
        }, range));
        el.plain = false;
    }

    function prependModifierMarker(symbol, name, dynamic) {
        return dynamic
            ? ("_p(" + name + ",\"" + symbol + "\")")
            : symbol + name // mark the event as captured
    }

    function addHandler(
        el,
        name,
        value,
        modifiers,
        important,
        warn,
        range,
        dynamic
    ) {
        modifiers = modifiers || emptyObject;
        // warn prevent and passive modifier
        /* istanbul ignore if */
        if (
            warn &&
            modifiers.prevent && modifiers.passive
        ) {
            warn(
                'passive and prevent can\'t be used together. ' +
                'Passive handler can\'t prevent default event.',
                range
            );
        }

        // normalize click.right and click.middle since they don't actually fire
        // this is technically browser-specific, but at least for now browsers are
        // the only target envs that have right/middle clicks.
        if (modifiers.right) {
            if (dynamic) {
                name = "(" + name + ")==='click'?'contextmenu':(" + name + ")";
            } else if (name === 'click') {
                name = 'contextmenu';
                delete modifiers.right;
            }
        } else if (modifiers.middle) {
            if (dynamic) {
                name = "(" + name + ")==='click'?'mouseup':(" + name + ")";
            } else if (name === 'click') {
                name = 'mouseup';
            }
        }

        // check capture modifier
        if (modifiers.capture) {
            delete modifiers.capture;
            name = prependModifierMarker('!', name, dynamic);
        }
        if (modifiers.once) {
            delete modifiers.once;
            name = prependModifierMarker('~', name, dynamic);
        }
        /* istanbul ignore if */
        if (modifiers.passive) {
            delete modifiers.passive;
            name = prependModifierMarker('&', name, dynamic);
        }

        var events;
        if (modifiers.native) {
            delete modifiers.native;
            events = el.nativeEvents || (el.nativeEvents = {});
        } else {
            events = el.events || (el.events = {});
        }

        var newHandler = rangeSetItem({ value: value.trim(), dynamic: dynamic }, range);
        if (modifiers !== emptyObject) {
            newHandler.modifiers = modifiers;
        }

        var handlers = events[name];
        /* istanbul ignore if */
        if (Array.isArray(handlers)) {
            important ? handlers.unshift(newHandler) : handlers.push(newHandler);
        } else if (handlers) {
            events[name] = important ? [newHandler, handlers] : [handlers, newHandler];
        } else {
            events[name] = newHandler;
        }

        el.plain = false;
    }

    function getRawBindingAttr(
        el,
        name
    ) {
        return el.rawAttrsMap[':' + name] ||
            el.rawAttrsMap['v-bind:' + name] ||
            el.rawAttrsMap[name]
    }

    function getBindingAttr(
        el,
        name,
        getStatic
    ) {
        var dynamicValue =
            getAndRemoveAttr(el, ':' + name) ||
            getAndRemoveAttr(el, 'v-bind:' + name);
        if (dynamicValue != null) {
            return parseFilters(dynamicValue)
        } else if (getStatic !== false) {
            var staticValue = getAndRemoveAttr(el, name);
            if (staticValue != null) {
                return JSON.stringify(staticValue)
            }
        }
    }

    // note: this only removes the attr from the Array (attrsList) so that it
    // doesn't get processed by processAttrs.
    // By default it does NOT remove it from the map (attrsMap) because the map is
    // needed during codegen.
    function getAndRemoveAttr(
        el,
        name,
        removeFromMap
    ) {
        var val;
        if ((val = el.attrsMap[name]) != null) {
            var list = el.attrsList;
            for (var i = 0, l = list.length; i < l; i++) {
                if (list[i].name === name) {
                    list.splice(i, 1);
                    break
                }
            }
        }
        if (removeFromMap) {
            delete el.attrsMap[name];
        }
        return val
    }

    function getAndRemoveAttrByRegex(
        el,
        name
    ) {
        var list = el.attrsList;
        for (var i = 0, l = list.length; i < l; i++) {
            var attr = list[i];
            if (name.test(attr.name)) {
                list.splice(i, 1);
                return attr
            }
        }
    }

    function rangeSetItem(
        item,
        range
    ) {
        if (range) {
            if (range.start != null) {
                item.start = range.start;
            }
            if (range.end != null) {
                item.end = range.end;
            }
        }
        return item
    }

    /*  */

    /**
     * Cross-platform code generation for component v-model
     */
    function genComponentModel(
        el,
        value,
        modifiers
    ) {
        var ref = modifiers || {};
        var number = ref.number;
        var trim = ref.trim;

        var baseValueExpression = '$$v';
        var valueExpression = baseValueExpression;
        if (trim) {
            valueExpression =
                "(typeof " + baseValueExpression + " === 'string'" +
                "? " + baseValueExpression + ".trim()" +
                ": " + baseValueExpression + ")";
        }
        if (number) {
            valueExpression = "_n(" + valueExpression + ")";
        }
        var assignment = genAssignmentCode(value, valueExpression);

        el.model = {
            value: ("(" + value + ")"),
            expression: JSON.stringify(value),
            callback: ("function (" + baseValueExpression + ") {" + assignment + "}")
        };
    }

    /**
     * Cross-platform codegen helper for generating v-model value assignment code.
     */
    function genAssignmentCode(
        value,
        assignment
    ) {
        var res = parseModel(value);
        if (res.key === null) {
            return (value + "=" + assignment)
        } else {
            return ("$set(" + (res.exp) + ", " + (res.key) + ", " + assignment + ")")
        }
    }

    /**
     * Parse a v-model expression into a base path and a final key segment.
     * Handles both dot-path and possible square brackets.
     *
     * Possible cases:
     *
     * - test
     * - test[key]
     * - test[test1[key]]
     * - test["a"][key]
     * - xxx.test[a[a].test1[key]]
     * - test.xxx.a["asa"][test1[key]]
     *
     */

    var len, str, chr, index$1, expressionPos, expressionEndPos;



    function parseModel(val) {
        // Fix https://github.com/vuejs/vue/pull/7730
        // allow v-model="obj.val " (trailing whitespace)
        val = val.trim();
        len = val.length;

        if (val.indexOf('[') < 0 || val.lastIndexOf(']') < len - 1) {
            index$1 = val.lastIndexOf('.');
            if (index$1 > -1) {
                return {
                    exp: val.slice(0, index$1),
                    key: '"' + val.slice(index$1 + 1) + '"'
                }
            } else {
                return {
                    exp: val,
                    key: null
                }
            }
        }

        str = val;
        index$1 = expressionPos = expressionEndPos = 0;

        while (!eof()) {
            chr = next();
            /* istanbul ignore if */
            if (isStringStart(chr)) {
                parseString(chr);
            } else if (chr === 0x5B) {
                parseBracket(chr);
            }
        }

        return {
            exp: val.slice(0, expressionPos),
            key: val.slice(expressionPos + 1, expressionEndPos)
        }
    }

    function next() {
        return str.charCodeAt(++index$1)
    }

    function eof() {
        return index$1 >= len
    }

    function isStringStart(chr) {
        return chr === 0x22 || chr === 0x27
    }

    function parseBracket(chr) {
        var inBracket = 1;
        expressionPos = index$1;
        while (!eof()) {
            chr = next();
            if (isStringStart(chr)) {
                parseString(chr);
                continue
            }
            if (chr === 0x5B) { inBracket++; }
            if (chr === 0x5D) { inBracket--; }
            if (inBracket === 0) {
                expressionEndPos = index$1;
                break
            }
        }
    }

    function parseString(chr) {
        var stringQuote = chr;
        while (!eof()) {
            chr = next();
            if (chr === stringQuote) {
                break
            }
        }
    }

    /*  */

    var warn$1;

    // in some cases, the event used has to be determined at runtime
    // so we used some reserved tokens during compile.
    var RANGE_TOKEN = '__r';
    var CHECKBOX_RADIO_TOKEN = '__c';

    function model(
        el,
        dir,
        _warn
    ) {
        warn$1 = _warn;
        var value = dir.value;
        var modifiers = dir.modifiers;
        var tag = el.tag;
        var type = el.attrsMap.type;

        {
            // inputs with type="file" are read only and setting the input's
            // value will throw an error.
            if (tag === 'input' && type === 'file') {
                warn$1(
                    "<" + (el.tag) + " v-model=\"" + value + "\" type=\"file\">:\n" +
                    "File inputs are read only. Use a v-on:change listener instead.",
                    el.rawAttrsMap['v-model']
                );
            }
        }

        if (el.component) {
            genComponentModel(el, value, modifiers);
            // component v-model doesn't need extra runtime
            return false
        } else if (tag === 'select') {
            genSelect(el, value, modifiers);
        } else if (tag === 'input' && type === 'checkbox') {
            genCheckboxModel(el, value, modifiers);
        } else if (tag === 'input' && type === 'radio') {
            genRadioModel(el, value, modifiers);
        } else if (tag === 'input' || tag === 'textarea') {
            genDefaultModel(el, value, modifiers);
        } else if (!config.isReservedTag(tag)) {
            genComponentModel(el, value, modifiers);
            // component v-model doesn't need extra runtime
            return false
        } else {
            warn$1(
                "<" + (el.tag) + " v-model=\"" + value + "\">: " +
                "v-model is not supported on this element type. " +
                'If you are working with contenteditable, it\'s recommended to ' +
                'wrap a library dedicated for that purpose inside a custom component.',
                el.rawAttrsMap['v-model']
            );
        }

        // ensure runtime directive metadata
        return true
    }

    function genCheckboxModel(
        el,
        value,
        modifiers
    ) {
        var number = modifiers && modifiers.number;
        var valueBinding = getBindingAttr(el, 'value') || 'null';
        var trueValueBinding = getBindingAttr(el, 'true-value') || 'true';
        var falseValueBinding = getBindingAttr(el, 'false-value') || 'false';
        addProp(el, 'checked',
            "Array.isArray(" + value + ")" +
            "?_i(" + value + "," + valueBinding + ")>-1" + (
                trueValueBinding === 'true'
                    ? (":(" + value + ")")
                    : (":_q(" + value + "," + trueValueBinding + ")")
            )
        );
        addHandler(el, 'change',
            "var $$a=" + value + "," +
            '$$el=$event.target,' +
            "$$c=$$el.checked?(" + trueValueBinding + "):(" + falseValueBinding + ");" +
            'if(Array.isArray($$a)){' +
            "var $$v=" + (number ? '_n(' + valueBinding + ')' : valueBinding) + "," +
            '$$i=_i($$a,$$v);' +
            "if($$el.checked){$$i<0&&(" + (genAssignmentCode(value, '$$a.concat([$$v])')) + ")}" +
            "else{$$i>-1&&(" + (genAssignmentCode(value, '$$a.slice(0,$$i).concat($$a.slice($$i+1))')) + ")}" +
            "}else{" + (genAssignmentCode(value, '$$c')) + "}",
            null, true
        );
    }

    function genRadioModel(
        el,
        value,
        modifiers
    ) {
        var number = modifiers && modifiers.number;
        var valueBinding = getBindingAttr(el, 'value') || 'null';
        valueBinding = number ? ("_n(" + valueBinding + ")") : valueBinding;
        addProp(el, 'checked', ("_q(" + value + "," + valueBinding + ")"));
        addHandler(el, 'change', genAssignmentCode(value, valueBinding), null, true);
    }

    function genSelect(
        el,
        value,
        modifiers
    ) {
        var number = modifiers && modifiers.number;
        var selectedVal = "Array.prototype.filter" +
            ".call($event.target.options,function(o){return o.selected})" +
            ".map(function(o){var val = \"_value\" in o ? o._value : o.value;" +
            "return " + (number ? '_n(val)' : 'val') + "})";

        var assignment = '$event.target.multiple ? $$selectedVal : $$selectedVal[0]';
        var code = "var $$selectedVal = " + selectedVal + ";";
        code = code + " " + (genAssignmentCode(value, assignment));
        addHandler(el, 'change', code, null, true);
    }

    function genDefaultModel(
        el,
        value,
        modifiers
    ) {
        var type = el.attrsMap.type;

        // warn if v-bind:value conflicts with v-model
        // except for inputs with v-bind:type
        {
            var value$1 = el.attrsMap['v-bind:value'] || el.attrsMap[':value'];
            var typeBinding = el.attrsMap['v-bind:type'] || el.attrsMap[':type'];
            if (value$1 && !typeBinding) {
                var binding = el.attrsMap['v-bind:value'] ? 'v-bind:value' : ':value';
                warn$1(
                    binding + "=\"" + value$1 + "\" conflicts with v-model on the same element " +
                    'because the latter already expands to a value binding internally',
                    el.rawAttrsMap[binding]
                );
            }
        }

        var ref = modifiers || {};
        var lazy = ref.lazy;
        var number = ref.number;
        var trim = ref.trim;
        var needCompositionGuard = !lazy && type !== 'range';
        var event = lazy
            ? 'change'
            : type === 'range'
                ? RANGE_TOKEN
                : 'input';

        var valueExpression = '$event.target.value';
        if (trim) {
            valueExpression = "$event.target.value.trim()";
        }
        if (number) {
            valueExpression = "_n(" + valueExpression + ")";
        }

        var code = genAssignmentCode(value, valueExpression);
        if (needCompositionGuard) {
            code = "if($event.target.composing)return;" + code;
        }

        addProp(el, 'value', ("(" + value + ")"));
        addHandler(el, event, code, null, true);
        if (trim || number) {
            addHandler(el, 'blur', '$forceUpdate()');
        }
    }

    /*  */

    // normalize v-model event tokens that can only be determined at runtime.
    // it's important to place the event as the first in the array because
    // the whole point is ensuring the v-model callback gets called before
    // user-attached handlers.
    function normalizeEvents(on) {
        /* istanbul ignore if */
        if (isDef(on[RANGE_TOKEN])) {
            // IE input[type=range] only supports `change` event
            var event = isIE ? 'change' : 'input';
            on[event] = [].concat(on[RANGE_TOKEN], on[event] || []);
            delete on[RANGE_TOKEN];
        }
        // This was originally intended to fix #4521 but no longer necessary
        // after 2.5. Keeping it for backwards compat with generated code from < 2.4
        /* istanbul ignore if */
        if (isDef(on[CHECKBOX_RADIO_TOKEN])) {
            on.change = [].concat(on[CHECKBOX_RADIO_TOKEN], on.change || []);
            delete on[CHECKBOX_RADIO_TOKEN];
        }
    }

    var target$1;

    function createOnceHandler$1(event, handler, capture) {
        var _target = target$1; // save current target element in closure
        return function onceHandler() {
            var res = handler.apply(null, arguments);
            if (res !== null) {
                remove$2(event, onceHandler, capture, _target);
            }
        }
    }

    // #9446: Firefox <= 53 (in particular, ESR 52) has incorrect Event.timeStamp
    // implementation and does not fire microtasks in between event propagation, so
    // safe to exclude.
    var useMicrotaskFix = isUsingMicroTask && !(isFF && Number(isFF[1]) <= 53);

    function add$1(
        name,
        handler,
        capture,
        passive
    ) {
        // async edge case #6566: inner click event triggers patch, event handler
        // attached to outer element during patch, and triggered again. This
        // happens because browsers fire microtask ticks between event propagation.
        // the solution is simple: we save the timestamp when a handler is attached,
        // and the handler would only fire if the event passed to it was fired
        // AFTER it was attached.
        if (useMicrotaskFix) {
            var attachedTimestamp = currentFlushTimestamp;
            var original = handler;
            handler = original._wrapper = function (e) {
                if (
                    // no bubbling, should always fire.
                    // this is just a safety net in case event.timeStamp is unreliable in
                    // certain weird environments...
                    e.target === e.currentTarget ||
                    // event is fired after handler attachment
                    e.timeStamp >= attachedTimestamp ||
                    // bail for environments that have buggy event.timeStamp implementations
                    // #9462 iOS 9 bug: event.timeStamp is 0 after history.pushState
                    // #9681 QtWebEngine event.timeStamp is negative value
                    e.timeStamp <= 0 ||
                    // #9448 bail if event is fired in another document in a multi-page
                    // electron/nw.js app, since event.timeStamp will be using a different
                    // starting reference
                    e.target.ownerDocument !== document
                ) {
                    return original.apply(this, arguments)
                }
            };
        }
        target$1.addEventListener(
            name,
            handler,
            supportsPassive
                ? { capture: capture, passive: passive }
                : capture
        );
    }

    function remove$2(
        name,
        handler,
        capture,
        _target
    ) {
        (_target || target$1).removeEventListener(
            name,
            handler._wrapper || handler,
            capture
        );
    }

    function updateDOMListeners(oldVnode, vnode) {
        if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
            return
        }
        var on = vnode.data.on || {};
        var oldOn = oldVnode.data.on || {};
        target$1 = vnode.elm;
        normalizeEvents(on);
        updateListeners(on, oldOn, add$1, remove$2, createOnceHandler$1, vnode.context);
        target$1 = undefined;
    }

    var events = {
        create: updateDOMListeners,
        update: updateDOMListeners
    };

    /*  */

    var svgContainer;

    function updateDOMProps(oldVnode, vnode) {
        if (isUndef(oldVnode.data.domProps) && isUndef(vnode.data.domProps)) {
            return
        }
        var key, cur;
        var elm = vnode.elm;
        var oldProps = oldVnode.data.domProps || {};
        var props = vnode.data.domProps || {};
        // clone observed objects, as the user probably wants to mutate it
        if (isDef(props.__ob__)) {
            props = vnode.data.domProps = extend({}, props);
        }

        for (key in oldProps) {
            if (!(key in props)) {
                elm[key] = '';
            }
        }

        for (key in props) {
            cur = props[key];
            // ignore children if the node has textContent or innerHTML,
            // as these will throw away existing DOM nodes and cause removal errors
            // on subsequent patches (#3360)
            if (key === 'textContent' || key === 'innerHTML') {
                if (vnode.children) { vnode.children.length = 0; }
                if (cur === oldProps[key]) { continue }
                // #6601 work around Chrome version <= 55 bug where single textNode
                // replaced by innerHTML/textContent retains its parentNode property
                if (elm.childNodes.length === 1) {
                    elm.removeChild(elm.childNodes[0]);
                }
            }

            if (key === 'value' && elm.tagName !== 'PROGRESS') {
                // store value as _value as well since
                // non-string values will be stringified
                elm._value = cur;
                // avoid resetting cursor position when value is the same
                var strCur = isUndef(cur) ? '' : String(cur);
                if (shouldUpdateValue(elm, strCur)) {
                    elm.value = strCur;
                }
            } else if (key === 'innerHTML' && isSVG(elm.tagName) && isUndef(elm.innerHTML)) {
                // IE doesn't support innerHTML for SVG elements
                svgContainer = svgContainer || document.createElement('div');
                svgContainer.innerHTML = "<svg>" + cur + "</svg>";
                var svg = svgContainer.firstChild;
                while (elm.firstChild) {
                    elm.removeChild(elm.firstChild);
                }
                while (svg.firstChild) {
                    elm.appendChild(svg.firstChild);
                }
            } else if (
                // skip the update if old and new VDOM state is the same.
                // `value` is handled separately because the DOM value may be temporarily
                // out of sync with VDOM state due to focus, composition and modifiers.
                // This  #4521 by skipping the unnecessary `checked` update.
                cur !== oldProps[key]
            ) {
                // some property updates can throw
                // e.g. `value` on <progress> w/ non-finite value
                try {
                    elm[key] = cur;
                } catch (e) { }
            }
        }
    }

    // check platforms/web/util/attrs.js acceptValue


    function shouldUpdateValue(elm, checkVal) {
        return (!elm.composing && (
            elm.tagName === 'OPTION' ||
            isNotInFocusAndDirty(elm, checkVal) ||
            isDirtyWithModifiers(elm, checkVal)
        ))
    }

    function isNotInFocusAndDirty(elm, checkVal) {
        // return true when textbox (.number and .trim) loses focus and its value is
        // not equal to the updated value
        var notInFocus = true;
        // #6157
        // work around IE bug when accessing document.activeElement in an iframe
        try { notInFocus = document.activeElement !== elm; } catch (e) { }
        return notInFocus && elm.value !== checkVal
    }

    function isDirtyWithModifiers(elm, newVal) {
        var value = elm.value;
        var modifiers = elm._vModifiers; // injected by v-model runtime
        if (isDef(modifiers)) {
            if (modifiers.number) {
                return toNumber(value) !== toNumber(newVal)
            }
            if (modifiers.trim) {
                return value.trim() !== newVal.trim()
            }
        }
        return value !== newVal
    }

    var domProps = {
        create: updateDOMProps,
        update: updateDOMProps
    };

    /*  */

    var parseStyleText = cached(function (cssText) {
        var res = {};
        var listDelimiter = /;(?![^(]*\))/g;
        var propertyDelimiter = /:(.+)/;
        cssText.split(listDelimiter).forEach(function (item) {
            if (item) {
                var tmp = item.split(propertyDelimiter);
                tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim());
            }
        });
        return res
    });

    // merge static and dynamic style data on the same vnode
    function normalizeStyleData(data) {
        var style = normalizeStyleBinding(data.style);
        // static style is pre-processed into an object during compilation
        // and is always a fresh object, so it's safe to merge into it
        return data.staticStyle
            ? extend(data.staticStyle, style)
            : style
    }

    // normalize possible array / string values into Object
    function normalizeStyleBinding(bindingStyle) {
        if (Array.isArray(bindingStyle)) {
            return toObject(bindingStyle)
        }
        if (typeof bindingStyle === 'string') {
            return parseStyleText(bindingStyle)
        }
        return bindingStyle
    }

    /**
     * parent component style should be after child's
     * so that parent component's style could override it
     */
    function getStyle(vnode, checkChild) {
        var res = {};
        var styleData;

        if (checkChild) {
            var childNode = vnode;
            while (childNode.componentInstance) {
                childNode = childNode.componentInstance._vnode;
                if (
                    childNode && childNode.data &&
                    (styleData = normalizeStyleData(childNode.data))
                ) {
                    extend(res, styleData);
                }
            }
        }

        if ((styleData = normalizeStyleData(vnode.data))) {
            extend(res, styleData);
        }

        var parentNode = vnode;
        while ((parentNode = parentNode.parent)) {
            if (parentNode.data && (styleData = normalizeStyleData(parentNode.data))) {
                extend(res, styleData);
            }
        }
        return res
    }

    /*  */

    var cssVarRE = /^--/;
    var importantRE = /\s*!important$/;
    var setProp = function (el, name, val) {
        /* istanbul ignore if */
        if (cssVarRE.test(name)) {
            el.style.setProperty(name, val);
        } else if (importantRE.test(val)) {
            el.style.setProperty(hyphenate(name), val.replace(importantRE, ''), 'important');
        } else {
            var normalizedName = normalize(name);
            if (Array.isArray(val)) {
                // Support values array created by autoprefixer, e.g.
                // {display: ["-webkit-box", "-ms-flexbox", "flex"]}
                // Set them one by one, and the browser will only set those it can recognize
                for (var i = 0, len = val.length; i < len; i++) {
                    el.style[normalizedName] = val[i];
                }
            } else {
                el.style[normalizedName] = val;
            }
        }
    };

    var vendorNames = ['Webkit', 'Moz', 'ms'];

    var emptyStyle;
    var normalize = cached(function (prop) {
        emptyStyle = emptyStyle || document.createElement('div').style;
        prop = camelize(prop);
        if (prop !== 'filter' && (prop in emptyStyle)) {
            return prop
        }
        var capName = prop.charAt(0).toUpperCase() + prop.slice(1);
        for (var i = 0; i < vendorNames.length; i++) {
            var name = vendorNames[i] + capName;
            if (name in emptyStyle) {
                return name
            }
        }
    });

    function updateStyle(oldVnode, vnode) {
        var data = vnode.data;
        var oldData = oldVnode.data;

        if (isUndef(data.staticStyle) && isUndef(data.style) &&
            isUndef(oldData.staticStyle) && isUndef(oldData.style)
        ) {
            return
        }

        var cur, name;
        var el = vnode.elm;
        var oldStaticStyle = oldData.staticStyle;
        var oldStyleBinding = oldData.normalizedStyle || oldData.style || {};

        // if static style exists, stylebinding already merged into it when doing normalizeStyleData
        var oldStyle = oldStaticStyle || oldStyleBinding;

        var style = normalizeStyleBinding(vnode.data.style) || {};

        // store normalized style under a different key for next diff
        // make sure to clone it if it's reactive, since the user likely wants
        // to mutate it.
        vnode.data.normalizedStyle = isDef(style.__ob__)
            ? extend({}, style)
            : style;

        var newStyle = getStyle(vnode, true);

        for (name in oldStyle) {
            if (isUndef(newStyle[name])) {
                setProp(el, name, '');
            }
        }
        for (name in newStyle) {
            cur = newStyle[name];
            if (cur !== oldStyle[name]) {
                // ie9 setting to null has no effect, must use empty string
                setProp(el, name, cur == null ? '' : cur);
            }
        }
    }

    var style = {
        create: updateStyle,
        update: updateStyle
    };

    /*  */

    var whitespaceRE = /\s+/;

    /**
     * Add class with compatibility for SVG since classList is not supported on
     * SVG elements in IE
     */
    function addClass(el, cls) {
        /* istanbul ignore if */
        if (!cls || !(cls = cls.trim())) {
            return
        }

        /* istanbul ignore else */
        if (el.classList) {
            if (cls.indexOf(' ') > -1) {
                cls.split(whitespaceRE).forEach(function (c) { return el.classList.add(c); });
            } else {
                el.classList.add(cls);
            }
        } else {
            var cur = " " + (el.getAttribute('class') || '') + " ";
            if (cur.indexOf(' ' + cls + ' ') < 0) {
                el.setAttribute('class', (cur + cls).trim());
            }
        }
    }

    /**
     * Remove class with compatibility for SVG since classList is not supported on
     * SVG elements in IE
     */
    function removeClass(el, cls) {
        /* istanbul ignore if */
        if (!cls || !(cls = cls.trim())) {
            return
        }

        /* istanbul ignore else */
        if (el.classList) {
            if (cls.indexOf(' ') > -1) {
                cls.split(whitespaceRE).forEach(function (c) { return el.classList.remove(c); });
            } else {
                el.classList.remove(cls);
            }
            if (!el.classList.length) {
                el.removeAttribute('class');
            }
        } else {
            var cur = " " + (el.getAttribute('class') || '') + " ";
            var tar = ' ' + cls + ' ';
            while (cur.indexOf(tar) >= 0) {
                cur = cur.replace(tar, ' ');
            }
            cur = cur.trim();
            if (cur) {
                el.setAttribute('class', cur);
            } else {
                el.removeAttribute('class');
            }
        }
    }

    /*  */

    function resolveTransition(def$$1) {
        if (!def$$1) {
            return
        }
        /* istanbul ignore else */
        if (typeof def$$1 === 'object') {
            var res = {};
            if (def$$1.css !== false) {
                extend(res, autoCssTransition(def$$1.name || 'v'));
            }
            extend(res, def$$1);
            return res
        } else if (typeof def$$1 === 'string') {
            return autoCssTransition(def$$1)
        }
    }

    var autoCssTransition = cached(function (name) {
        return {
            enterClass: (name + "-enter"),
            enterToClass: (name + "-enter-to"),
            enterActiveClass: (name + "-enter-active"),
            leaveClass: (name + "-leave"),
            leaveToClass: (name + "-leave-to"),
            leaveActiveClass: (name + "-leave-active")
        }
    });

    var hasTransition = inBrowser && !isIE9;
    var TRANSITION = 'transition';
    var ANIMATION = 'animation';

    // Transition property/event sniffing
    var transitionProp = 'transition';
    var transitionEndEvent = 'transitionend';
    var animationProp = 'animation';
    var animationEndEvent = 'animationend';
    if (hasTransition) {
        /* istanbul ignore if */
        if (window.ontransitionend === undefined &&
            window.onwebkittransitionend !== undefined
        ) {
            transitionProp = 'WebkitTransition';
            transitionEndEvent = 'webkitTransitionEnd';
        }
        if (window.onanimationend === undefined &&
            window.onwebkitanimationend !== undefined
        ) {
            animationProp = 'WebkitAnimation';
            animationEndEvent = 'webkitAnimationEnd';
        }
    }

    // binding to window is necessary to make hot reload work in IE in strict mode
    var raf = inBrowser
        ? window.requestAnimationFrame
            ? window.requestAnimationFrame.bind(window)
            : setTimeout
        : /* istanbul ignore next */ function (fn) { return fn(); };

    function nextFrame(fn) {
        raf(function () {
            raf(fn);
        });
    }

    function addTransitionClass(el, cls) {
        var transitionClasses = el._transitionClasses || (el._transitionClasses = []);
        if (transitionClasses.indexOf(cls) < 0) {
            transitionClasses.push(cls);
            addClass(el, cls);
        }
    }

    function removeTransitionClass(el, cls) {
        if (el._transitionClasses) {
            remove(el._transitionClasses, cls);
        }
        removeClass(el, cls);
    }

    function whenTransitionEnds(
        el,
        expectedType,
        cb
    ) {
        var ref = getTransitionInfo(el, expectedType);
        var type = ref.type;
        var timeout = ref.timeout;
        var propCount = ref.propCount;
        if (!type) { return cb() }
        var event = type === TRANSITION ? transitionEndEvent : animationEndEvent;
        var ended = 0;
        var end = function () {
            el.removeEventListener(event, onEnd);
            cb();
        };
        var onEnd = function (e) {
            if (e.target === el) {
                if (++ended >= propCount) {
                    end();
                }
            }
        };
        setTimeout(function () {
            if (ended < propCount) {
                end();
            }
        }, timeout + 1);
        el.addEventListener(event, onEnd);
    }

    var transformRE = /\b(transform|all)(,|$)/;

    function getTransitionInfo(el, expectedType) {
        var styles = window.getComputedStyle(el);
        // JSDOM may return undefined for transition properties
        var transitionDelays = (styles[transitionProp + 'Delay'] || '').split(', ');
        var transitionDurations = (styles[transitionProp + 'Duration'] || '').split(', ');
        var transitionTimeout = getTimeout(transitionDelays, transitionDurations);
        var animationDelays = (styles[animationProp + 'Delay'] || '').split(', ');
        var animationDurations = (styles[animationProp + 'Duration'] || '').split(', ');
        var animationTimeout = getTimeout(animationDelays, animationDurations);

        var type;
        var timeout = 0;
        var propCount = 0;
        /* istanbul ignore if */
        if (expectedType === TRANSITION) {
            if (transitionTimeout > 0) {
                type = TRANSITION;
                timeout = transitionTimeout;
                propCount = transitionDurations.length;
            }
        } else if (expectedType === ANIMATION) {
            if (animationTimeout > 0) {
                type = ANIMATION;
                timeout = animationTimeout;
                propCount = animationDurations.length;
            }
        } else {
            timeout = Math.max(transitionTimeout, animationTimeout);
            type = timeout > 0
                ? transitionTimeout > animationTimeout
                    ? TRANSITION
                    : ANIMATION
                : null;
            propCount = type
                ? type === TRANSITION
                    ? transitionDurations.length
                    : animationDurations.length
                : 0;
        }
        var hasTransform =
            type === TRANSITION &&
            transformRE.test(styles[transitionProp + 'Property']);
        return {
            type: type,
            timeout: timeout,
            propCount: propCount,
            hasTransform: hasTransform
        }
    }

    function getTimeout(delays, durations) {
        /* istanbul ignore next */
        while (delays.length < durations.length) {
            delays = delays.concat(delays);
        }

        return Math.max.apply(null, durations.map(function (d, i) {
            return toMs(d) + toMs(delays[i])
        }))
    }

    // Old versions of Chromium (below 61.0.3163.100) formats floating pointer numbers
    // in a locale-dependent way, using a comma instead of a dot.
    // If comma is not replaced with a dot, the input will be rounded down (i.e. acting
    // as a floor function) causing unexpected behaviors
    function toMs(s) {
        return Number(s.slice(0, -1).replace(',', '.')) * 1000
    }

    /*  */

    function enter(vnode, toggleDisplay) {
        var el = vnode.elm;

        // call leave callback now
        if (isDef(el._leaveCb)) {
            el._leaveCb.cancelled = true;
            el._leaveCb();
        }

        var data = resolveTransition(vnode.data.transition);
        if (isUndef(data)) {
            return
        }

        /* istanbul ignore if */
        if (isDef(el._enterCb) || el.nodeType !== 1) {
            return
        }

        var css = data.css;
        var type = data.type;
        var enterClass = data.enterClass;
        var enterToClass = data.enterToClass;
        var enterActiveClass = data.enterActiveClass;
        var appearClass = data.appearClass;
        var appearToClass = data.appearToClass;
        var appearActiveClass = data.appearActiveClass;
        var beforeEnter = data.beforeEnter;
        var enter = data.enter;
        var afterEnter = data.afterEnter;
        var enterCancelled = data.enterCancelled;
        var beforeAppear = data.beforeAppear;
        var appear = data.appear;
        var afterAppear = data.afterAppear;
        var appearCancelled = data.appearCancelled;
        var duration = data.duration;

        // activeInstance will always be the <transition> component managing this
        // transition. One edge case to check is when the <transition> is placed
        // as the root node of a child component. In that case we need to check
        // <transition>'s parent for appear check.
        var context = activeInstance;
        var transitionNode = activeInstance.$vnode;
        while (transitionNode && transitionNode.parent) {
            context = transitionNode.context;
            transitionNode = transitionNode.parent;
        }

        var isAppear = !context._isMounted || !vnode.isRootInsert;

        if (isAppear && !appear && appear !== '') {
            return
        }

        var startClass = isAppear && appearClass
            ? appearClass
            : enterClass;
        var activeClass = isAppear && appearActiveClass
            ? appearActiveClass
            : enterActiveClass;
        var toClass = isAppear && appearToClass
            ? appearToClass
            : enterToClass;

        var beforeEnterHook = isAppear
            ? (beforeAppear || beforeEnter)
            : beforeEnter;
        var enterHook = isAppear
            ? (typeof appear === 'function' ? appear : enter)
            : enter;
        var afterEnterHook = isAppear
            ? (afterAppear || afterEnter)
            : afterEnter;
        var enterCancelledHook = isAppear
            ? (appearCancelled || enterCancelled)
            : enterCancelled;

        var explicitEnterDuration = toNumber(
            isObject(duration)
                ? duration.enter
                : duration
        );

        if (explicitEnterDuration != null) {
            checkDuration(explicitEnterDuration, 'enter', vnode);
        }

        var expectsCSS = css !== false && !isIE9;
        var userWantsControl = getHookArgumentsLength(enterHook);

        var cb = el._enterCb = once(function () {
            if (expectsCSS) {
                removeTransitionClass(el, toClass);
                removeTransitionClass(el, activeClass);
            }
            if (cb.cancelled) {
                if (expectsCSS) {
                    removeTransitionClass(el, startClass);
                }
                enterCancelledHook && enterCancelledHook(el);
            } else {
                afterEnterHook && afterEnterHook(el);
            }
            el._enterCb = null;
        });

        if (!vnode.data.show) {
            // remove pending leave element on enter by injecting an insert hook
            mergeVNodeHook(vnode, 'insert', function () {
                var parent = el.parentNode;
                var pendingNode = parent && parent._pending && parent._pending[vnode.key];
                if (pendingNode &&
                    pendingNode.tag === vnode.tag &&
                    pendingNode.elm._leaveCb
                ) {
                    pendingNode.elm._leaveCb();
                }
                enterHook && enterHook(el, cb);
            });
        }

        // start enter transition
        beforeEnterHook && beforeEnterHook(el);
        if (expectsCSS) {
            addTransitionClass(el, startClass);
            addTransitionClass(el, activeClass);
            nextFrame(function () {
                removeTransitionClass(el, startClass);
                if (!cb.cancelled) {
                    addTransitionClass(el, toClass);
                    if (!userWantsControl) {
                        if (isValidDuration(explicitEnterDuration)) {
                            setTimeout(cb, explicitEnterDuration);
                        } else {
                            whenTransitionEnds(el, type, cb);
                        }
                    }
                }
            });
        }

        if (vnode.data.show) {
            toggleDisplay && toggleDisplay();
            enterHook && enterHook(el, cb);
        }

        if (!expectsCSS && !userWantsControl) {
            cb();
        }
    }

    function leave(vnode, rm) {
        var el = vnode.elm;

        // call enter callback now
        if (isDef(el._enterCb)) {
            el._enterCb.cancelled = true;
            el._enterCb();
        }

        var data = resolveTransition(vnode.data.transition);
        if (isUndef(data) || el.nodeType !== 1) {
            return rm()
        }

        /* istanbul ignore if */
        if (isDef(el._leaveCb)) {
            return
        }

        var css = data.css;
        var type = data.type;
        var leaveClass = data.leaveClass;
        var leaveToClass = data.leaveToClass;
        var leaveActiveClass = data.leaveActiveClass;
        var beforeLeave = data.beforeLeave;
        var leave = data.leave;
        var afterLeave = data.afterLeave;
        var leaveCancelled = data.leaveCancelled;
        var delayLeave = data.delayLeave;
        var duration = data.duration;

        var expectsCSS = css !== false && !isIE9;
        var userWantsControl = getHookArgumentsLength(leave);

        var explicitLeaveDuration = toNumber(
            isObject(duration)
                ? duration.leave
                : duration
        );

        if (isDef(explicitLeaveDuration)) {
            checkDuration(explicitLeaveDuration, 'leave', vnode);
        }

        var cb = el._leaveCb = once(function () {
            if (el.parentNode && el.parentNode._pending) {
                el.parentNode._pending[vnode.key] = null;
            }
            if (expectsCSS) {
                removeTransitionClass(el, leaveToClass);
                removeTransitionClass(el, leaveActiveClass);
            }
            if (cb.cancelled) {
                if (expectsCSS) {
                    removeTransitionClass(el, leaveClass);
                }
                leaveCancelled && leaveCancelled(el);
            } else {
                rm();
                afterLeave && afterLeave(el);
            }
            el._leaveCb = null;
        });

        if (delayLeave) {
            delayLeave(performLeave);
        } else {
            performLeave();
        }

        function performLeave() {
            // the delayed leave may have already been cancelled
            if (cb.cancelled) {
                return
            }
            // record leaving element
            if (!vnode.data.show && el.parentNode) {
                (el.parentNode._pending || (el.parentNode._pending = {}))[(vnode.key)] = vnode;
            }
            beforeLeave && beforeLeave(el);
            if (expectsCSS) {
                addTransitionClass(el, leaveClass);
                addTransitionClass(el, leaveActiveClass);
                nextFrame(function () {
                    removeTransitionClass(el, leaveClass);
                    if (!cb.cancelled) {
                        addTransitionClass(el, leaveToClass);
                        if (!userWantsControl) {
                            if (isValidDuration(explicitLeaveDuration)) {
                                setTimeout(cb, explicitLeaveDuration);
                            } else {
                                whenTransitionEnds(el, type, cb);
                            }
                        }
                    }
                });
            }
            leave && leave(el, cb);
            if (!expectsCSS && !userWantsControl) {
                cb();
            }
        }
    }

    // only used in dev mode
    function checkDuration(val, name, vnode) {
        if (typeof val !== 'number') {
            warn(
                "<transition> explicit " + name + " duration is not a valid number - " +
                "got " + (JSON.stringify(val)) + ".",
                vnode.context
            );
        } else if (isNaN(val)) {
            warn(
                "<transition> explicit " + name + " duration is NaN - " +
                'the duration expression might be incorrect.',
                vnode.context
            );
        }
    }

    function isValidDuration(val) {
        return typeof val === 'number' && !isNaN(val)
    }

    /**
     * Normalize a transition hook's argument length. The hook may be:
     * - a merged hook (invoker) with the original in .fns
     * - a wrapped component method (check ._length)
     * - a plain function (.length)
     */
    function getHookArgumentsLength(fn) {
        if (isUndef(fn)) {
            return false
        }
        var invokerFns = fn.fns;
        if (isDef(invokerFns)) {
            // invoker
            return getHookArgumentsLength(
                Array.isArray(invokerFns)
                    ? invokerFns[0]
                    : invokerFns
            )
        } else {
            return (fn._length || fn.length) > 1
        }
    }

    function _enter(_, vnode) {
        if (vnode.data.show !== true) {
            enter(vnode);
        }
    }

    var transition = inBrowser ? {
        create: _enter,
        activate: _enter,
        remove: function remove$$1(vnode, rm) {
            /* istanbul ignore else */
            if (vnode.data.show !== true) {
                leave(vnode, rm);
            } else {
                rm();
            }
        }
    } : {};

    var platformModules = [
        attrs,
        klass,
        events,
        domProps,
        style,
        transition
    ];

    /*  */

    // the directive module should be applied last, after all
    // built-in modules have been applied.
    var modules = platformModules.concat(baseModules);

    var patch = createPatchFunction({ nodeOps: nodeOps, modules: modules });

    /**
     * Not type checking this file because flow doesn't like attaching
     * properties to Elements.
     */

    /* istanbul ignore if */
    if (isIE9) {
        // http://www.matts411.com/post/internet-explorer-9-oninput/
        document.addEventListener('selectionchange', function () {
            var el = document.activeElement;
            if (el && el.vmodel) {
                trigger(el, 'input');
            }
        });
    }

    var directive = {
        inserted: function inserted(el, binding, vnode, oldVnode) {
            if (vnode.tag === 'select') {
                // #6903
                if (oldVnode.elm && !oldVnode.elm._vOptions) {
                    mergeVNodeHook(vnode, 'postpatch', function () {
                        directive.componentUpdated(el, binding, vnode);
                    });
                } else {
                    setSelected(el, binding, vnode.context);
                }
                el._vOptions = [].map.call(el.options, getValue);
            } else if (vnode.tag === 'textarea' || isTextInputType(el.type)) {
                el._vModifiers = binding.modifiers;
                if (!binding.modifiers.lazy) {
                    el.addEventListener('compositionstart', onCompositionStart);
                    el.addEventListener('compositionend', onCompositionEnd);
                    // Safari < 10.2 & UIWebView doesn't fire compositionend when
                    // switching focus before confirming composition choice
                    // this also fixes the issue where some browsers e.g. iOS Chrome
                    // fires "change" instead of "input" on autocomplete.
                    el.addEventListener('change', onCompositionEnd);
                    /* istanbul ignore if */
                    if (isIE9) {
                        el.vmodel = true;
                    }
                }
            }
        },

        componentUpdated: function componentUpdated(el, binding, vnode) {
            if (vnode.tag === 'select') {
                setSelected(el, binding, vnode.context);
                // in case the options rendered by v-for have changed,
                // it's possible that the value is out-of-sync with the rendered options.
                // detect such cases and filter out values that no longer has a matching
                // option in the DOM.
                var prevOptions = el._vOptions;
                var curOptions = el._vOptions = [].map.call(el.options, getValue);
                if (curOptions.some(function (o, i) { return !looseEqual(o, prevOptions[i]); })) {
                    // trigger change event if
                    // no matching option found for at least one value
                    var needReset = el.multiple
                        ? binding.value.some(function (v) { return hasNoMatchingOption(v, curOptions); })
                        : binding.value !== binding.oldValue && hasNoMatchingOption(binding.value, curOptions);
                    if (needReset) {
                        trigger(el, 'change');
                    }
                }
            }
        }
    };

    function setSelected(el, binding, vm) {
        actuallySetSelected(el, binding, vm);
        /* istanbul ignore if */
        if (isIE || isEdge) {
            setTimeout(function () {
                actuallySetSelected(el, binding, vm);
            }, 0);
        }
    }

    function actuallySetSelected(el, binding, vm) {
        var value = binding.value;
        var isMultiple = el.multiple;
        if (isMultiple && !Array.isArray(value)) {
            warn(
                "<select multiple v-model=\"" + (binding.expression) + "\"> " +
                "expects an Array value for its binding, but got " + (Object.prototype.toString.call(value).slice(8, -1)),
                vm
            );
            return
        }
        var selected, option;
        for (var i = 0, l = el.options.length; i < l; i++) {
            option = el.options[i];
            if (isMultiple) {
                selected = looseIndexOf(value, getValue(option)) > -1;
                if (option.selected !== selected) {
                    option.selected = selected;
                }
            } else {
                if (looseEqual(getValue(option), value)) {
                    if (el.selectedIndex !== i) {
                        el.selectedIndex = i;
                    }
                    return
                }
            }
        }
        if (!isMultiple) {
            el.selectedIndex = -1;
        }
    }

    function hasNoMatchingOption(value, options) {
        return options.every(function (o) { return !looseEqual(o, value); })
    }

    function getValue(option) {
        return '_value' in option
            ? option._value
            : option.value
    }

    function onCompositionStart(e) {
        e.target.composing = true;
    }

    function onCompositionEnd(e) {
        // prevent triggering an input event for no reason
        if (!e.target.composing) { return }
        e.target.composing = false;
        trigger(e.target, 'input');
    }

    function trigger(el, type) {
        var e = document.createEvent('HTMLEvents');
        e.initEvent(type, true, true);
        el.dispatchEvent(e);
    }

    /*  */

    // recursively search for possible transition defined inside the component root
    function locateNode(vnode) {
        return vnode.componentInstance && (!vnode.data || !vnode.data.transition)
            ? locateNode(vnode.componentInstance._vnode)
            : vnode
    }

    var show = {
        bind: function bind(el, ref, vnode) {
            var value = ref.value;

            vnode = locateNode(vnode);
            var transition$$1 = vnode.data && vnode.data.transition;
            var originalDisplay = el.__vOriginalDisplay =
                el.style.display === 'none' ? '' : el.style.display;
            if (value && transition$$1) {
                vnode.data.show = true;
                enter(vnode, function () {
                    el.style.display = originalDisplay;
                });
            } else {
                el.style.display = value ? originalDisplay : 'none';
            }
        },

        update: function update(el, ref, vnode) {
            var value = ref.value;
            var oldValue = ref.oldValue;

            /* istanbul ignore if */
            if (!value === !oldValue) { return }
            vnode = locateNode(vnode);
            var transition$$1 = vnode.data && vnode.data.transition;
            if (transition$$1) {
                vnode.data.show = true;
                if (value) {
                    enter(vnode, function () {
                        el.style.display = el.__vOriginalDisplay;
                    });
                } else {
                    leave(vnode, function () {
                        el.style.display = 'none';
                    });
                }
            } else {
                el.style.display = value ? el.__vOriginalDisplay : 'none';
            }
        },

        unbind: function unbind(
            el,
            binding,
            vnode,
            oldVnode,
            isDestroy
        ) {
            if (!isDestroy) {
                el.style.display = el.__vOriginalDisplay;
            }
        }
    };

    var platformDirectives = {
        model: directive,
        show: show
    };

    /*  */

    var transitionProps = {
        name: String,
        appear: Boolean,
        css: Boolean,
        mode: String,
        type: String,
        enterClass: String,
        leaveClass: String,
        enterToClass: String,
        leaveToClass: String,
        enterActiveClass: String,
        leaveActiveClass: String,
        appearClass: String,
        appearActiveClass: String,
        appearToClass: String,
        duration: [Number, String, Object]
    };

    // in case the child is also an abstract component, e.g. <keep-alive>
    // we want to recursively retrieve the real component to be rendered
    function getRealChild(vnode) {
        var compOptions = vnode && vnode.componentOptions;
        if (compOptions && compOptions.Ctor.options.abstract) {
            return getRealChild(getFirstComponentChild(compOptions.children))
        } else {
            return vnode
        }
    }

    function extractTransitionData(comp) {
        var data = {};
        var options = comp.$options;
        // props
        for (var key in options.propsData) {
            data[key] = comp[key];
        }
        // events.
        // extract listeners and pass them directly to the transition methods
        var listeners = options._parentListeners;
        for (var key$1 in listeners) {
            data[camelize(key$1)] = listeners[key$1];
        }
        return data
    }

    function placeholder(h, rawChild) {
        if (/\d-keep-alive$/.test(rawChild.tag)) {
            return h('keep-alive', {
                props: rawChild.componentOptions.propsData
            })
        }
    }

    function hasParentTransition(vnode) {
        while ((vnode = vnode.parent)) {
            if (vnode.data.transition) {
                return true
            }
        }
    }

    function isSameChild(child, oldChild) {
        return oldChild.key === child.key && oldChild.tag === child.tag
    }

    var isNotTextNode = function (c) { return c.tag || isAsyncPlaceholder(c); };

    var isVShowDirective = function (d) { return d.name === 'show'; };

    var Transition = {
        name: 'transition',
        props: transitionProps,
        abstract: true,

        render: function render(h) {
            var this$1 = this;

            var children = this.$slots.default;
            if (!children) {
                return
            }

            // filter out text nodes (possible whitespaces)
            children = children.filter(isNotTextNode);
            /* istanbul ignore if */
            if (!children.length) {
                return
            }

            // warn multiple elements
            if (children.length > 1) {
                warn(
                    '<transition> can only be used on a single element. Use ' +
                    '<transition-group> for lists.',
                    this.$parent
                );
            }

            var mode = this.mode;

            // warn invalid mode
            if (mode && mode !== 'in-out' && mode !== 'out-in'
            ) {
                warn(
                    'invalid <transition> mode: ' + mode,
                    this.$parent
                );
            }

            var rawChild = children[0];

            // if this is a component root node and the component's
            // parent container node also has transition, skip.
            if (hasParentTransition(this.$vnode)) {
                return rawChild
            }

            // apply transition data to child
            // use getRealChild() to ignore abstract components e.g. keep-alive
            var child = getRealChild(rawChild);
            /* istanbul ignore if */
            if (!child) {
                return rawChild
            }

            if (this._leaving) {
                return placeholder(h, rawChild)
            }

            // ensure a key that is unique to the vnode type and to this transition
            // component instance. This key will be used to remove pending leaving nodes
            // during entering.
            var id = "__transition-" + (this._uid) + "-";
            child.key = child.key == null
                ? child.isComment
                    ? id + 'comment'
                    : id + child.tag
                : isPrimitive(child.key)
                    ? (String(child.key).indexOf(id) === 0 ? child.key : id + child.key)
                    : child.key;

            var data = (child.data || (child.data = {})).transition = extractTransitionData(this);
            var oldRawChild = this._vnode;
            var oldChild = getRealChild(oldRawChild);

            // mark v-show
            // so that the transition module can hand over the control to the directive
            if (child.data.directives && child.data.directives.some(isVShowDirective)) {
                child.data.show = true;
            }

            if (
                oldChild &&
                oldChild.data &&
                !isSameChild(child, oldChild) &&
                !isAsyncPlaceholder(oldChild) &&
                // #6687 component root is a comment node
                !(oldChild.componentInstance && oldChild.componentInstance._vnode.isComment)
            ) {
                // replace old child transition data with fresh one
                // important for dynamic transitions!
                var oldData = oldChild.data.transition = extend({}, data);
                // handle transition mode
                if (mode === 'out-in') {
                    // return placeholder node and queue update when leave finishes
                    this._leaving = true;
                    mergeVNodeHook(oldData, 'afterLeave', function () {
                        this$1._leaving = false;
                        this$1.$forceUpdate();
                    });
                    return placeholder(h, rawChild)
                } else if (mode === 'in-out') {
                    if (isAsyncPlaceholder(child)) {
                        return oldRawChild
                    }
                    var delayedLeave;
                    var performLeave = function () { delayedLeave(); };
                    mergeVNodeHook(data, 'afterEnter', performLeave);
                    mergeVNodeHook(data, 'enterCancelled', performLeave);
                    mergeVNodeHook(oldData, 'delayLeave', function (leave) { delayedLeave = leave; });
                }
            }

            return rawChild
        }
    };

    /*  */

    var props = extend({
        tag: String,
        moveClass: String
    }, transitionProps);

    delete props.mode;

    var TransitionGroup = {
        props: props,

        beforeMount: function beforeMount() {
            var this$1 = this;

            var update = this._update;
            this._update = function (vnode, hydrating) {
                var restoreActiveInstance = setActiveInstance(this$1);
                // force removing pass
                this$1.__patch__(
                    this$1._vnode,
                    this$1.kept,
                    false, // hydrating
                    true // removeOnly (!important, avoids unnecessary moves)
                );
                this$1._vnode = this$1.kept;
                restoreActiveInstance();
                update.call(this$1, vnode, hydrating);
            };
        },

        render: function render(h) {
            var tag = this.tag || this.$vnode.data.tag || 'span';
            var map = Object.create(null);
            var prevChildren = this.prevChildren = this.children;
            var rawChildren = this.$slots.default || [];
            var children = this.children = [];
            var transitionData = extractTransitionData(this);

            for (var i = 0; i < rawChildren.length; i++) {
                var c = rawChildren[i];
                if (c.tag) {
                    if (c.key != null && String(c.key).indexOf('__vlist') !== 0) {
                        children.push(c);
                        map[c.key] = c
                            ; (c.data || (c.data = {})).transition = transitionData;
                    } else {
                        var opts = c.componentOptions;
                        var name = opts ? (opts.Ctor.options.name || opts.tag || '') : c.tag;
                        warn(("<transition-group> children must be keyed: <" + name + ">"));
                    }
                }
            }

            if (prevChildren) {
                var kept = [];
                var removed = [];
                for (var i$1 = 0; i$1 < prevChildren.length; i$1++) {
                    var c$1 = prevChildren[i$1];
                    c$1.data.transition = transitionData;
                    c$1.data.pos = c$1.elm.getBoundingClientRect();
                    if (map[c$1.key]) {
                        kept.push(c$1);
                    } else {
                        removed.push(c$1);
                    }
                }
                this.kept = h(tag, null, kept);
                this.removed = removed;
            }

            return h(tag, null, children)
        },

        updated: function updated() {
            var children = this.prevChildren;
            var moveClass = this.moveClass || ((this.name || 'v') + '-move');
            if (!children.length || !this.hasMove(children[0].elm, moveClass)) {
                return
            }

            // we divide the work into three loops to avoid mixing DOM reads and writes
            // in each iteration - which helps prevent layout thrashing.
            children.forEach(callPendingCbs);
            children.forEach(recordPosition);
            children.forEach(applyTranslation);

            // force reflow to put everything in position
            // assign to this to avoid being removed in tree-shaking
            // $flow-disable-line
            this._reflow = document.body.offsetHeight;

            children.forEach(function (c) {
                if (c.data.moved) {
                    var el = c.elm;
                    var s = el.style;
                    addTransitionClass(el, moveClass);
                    s.transform = s.WebkitTransform = s.transitionDuration = '';
                    el.addEventListener(transitionEndEvent, el._moveCb = function cb(e) {
                        if (e && e.target !== el) {
                            return
                        }
                        if (!e || /transform$/.test(e.propertyName)) {
                            el.removeEventListener(transitionEndEvent, cb);
                            el._moveCb = null;
                            removeTransitionClass(el, moveClass);
                        }
                    });
                }
            });
        },

        methods: {
            hasMove: function hasMove(el, moveClass) {
                /* istanbul ignore if */
                if (!hasTransition) {
                    return false
                }
                /* istanbul ignore if */
                if (this._hasMove) {
                    return this._hasMove
                }
                // Detect whether an element with the move class applied has
                // CSS transitions. Since the element may be inside an entering
                // transition at this very moment, we make a clone of it and remove
                // all other transition classes applied to ensure only the move class
                // is applied.
                var clone = el.cloneNode();
                if (el._transitionClasses) {
                    el._transitionClasses.forEach(function (cls) { removeClass(clone, cls); });
                }
                addClass(clone, moveClass);
                clone.style.display = 'none';
                this.$el.appendChild(clone);
                var info = getTransitionInfo(clone);
                this.$el.removeChild(clone);
                return (this._hasMove = info.hasTransform)
            }
        }
    };

    function callPendingCbs(c) {
        /* istanbul ignore if */
        if (c.elm._moveCb) {
            c.elm._moveCb();
        }
        /* istanbul ignore if */
        if (c.elm._enterCb) {
            c.elm._enterCb();
        }
    }

    function recordPosition(c) {
        c.data.newPos = c.elm.getBoundingClientRect();
    }

    function applyTranslation(c) {
        var oldPos = c.data.pos;
        var newPos = c.data.newPos;
        var dx = oldPos.left - newPos.left;
        var dy = oldPos.top - newPos.top;
        if (dx || dy) {
            c.data.moved = true;
            var s = c.elm.style;
            s.transform = s.WebkitTransform = "translate(" + dx + "px," + dy + "px)";
            s.transitionDuration = '0s';
        }
    }

    var platformComponents = {
        Transition: Transition,
        TransitionGroup: TransitionGroup
    };

    /*  */

    // install platform specific utils
    Vue.config.mustUseProp = mustUseProp;
    Vue.config.isReservedTag = isReservedTag;
    Vue.config.isReservedAttr = isReservedAttr;
    Vue.config.getTagNamespace = getTagNamespace;
    Vue.config.isUnknownElement = isUnknownElement;

    // install platform runtime directives & components
    extend(Vue.options.directives, platformDirectives);
    extend(Vue.options.components, platformComponents);

    // install platform patch function
    Vue.prototype.__patch__ = inBrowser ? patch : noop;

    // public mount method
    Vue.prototype.$mount = function (
        el,
        hydrating
    ) {
        el = el && inBrowser ? query(el) : undefined;
        return mountComponent(this, el, hydrating)
    };

    // devtools global hook
    /* istanbul ignore next */
    if (inBrowser) {
        setTimeout(function () {
            if (config.devtools) {
                if (devtools) {
                    devtools.emit('init', Vue);
                } else {
                    console[console.info ? 'info' : 'log'](
                        'Download the Vue Devtools extension for a better development experience:\n' +
                        'https://github.com/vuejs/vue-devtools'
                    );
                }
            }
            if (config.productionTip !== false &&
                typeof console !== 'undefined'
            ) {
                console[console.info ? 'info' : 'log'](
                    "You are running Vue in development mode.\n" +
                    "Make sure to turn on production mode when deploying for production.\n" +
                    "See more tips at https://vuejs.org/guide/deployment.html"
                );
            }
        }, 0);
    }

    /*  */

    var defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;
    var regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g;

    var buildRegex = cached(function (delimiters) {
        var open = delimiters[0].replace(regexEscapeRE, '\\$&');
        var close = delimiters[1].replace(regexEscapeRE, '\\$&');
        return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
    });



    function parseText(
        text,
        delimiters
    ) {
        var tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE;
        if (!tagRE.test(text)) {
            return
        }
        var tokens = [];
        var rawTokens = [];
        var lastIndex = tagRE.lastIndex = 0;
        var match, index, tokenValue;
        while ((match = tagRE.exec(text))) {
            index = match.index;
            // push text token
            if (index > lastIndex) {
                rawTokens.push(tokenValue = text.slice(lastIndex, index));
                tokens.push(JSON.stringify(tokenValue));
            }
            // tag token
            var exp = parseFilters(match[1].trim());
            tokens.push(("_s(" + exp + ")"));
            rawTokens.push({ '@binding': exp });
            lastIndex = index + match[0].length;
        }
        if (lastIndex < text.length) {
            rawTokens.push(tokenValue = text.slice(lastIndex));
            tokens.push(JSON.stringify(tokenValue));
        }
        return {
            expression: tokens.join('+'),
            tokens: rawTokens
        }
    }

    /*  */

    function transformNode(el, options) {
        var warn = options.warn || baseWarn;
        var staticClass = getAndRemoveAttr(el, 'class');
        if (staticClass) {
            var res = parseText(staticClass, options.delimiters);
            if (res) {
                warn(
                    "class=\"" + staticClass + "\": " +
                    'Interpolation inside attributes has been removed. ' +
                    'Use v-bind or the colon shorthand instead. For example, ' +
                    'instead of <div class="{{ val }}">, use <div :class="val">.',
                    el.rawAttrsMap['class']
                );
            }
        }
        if (staticClass) {
            el.staticClass = JSON.stringify(staticClass);
        }
        var classBinding = getBindingAttr(el, 'class', false /* getStatic */);
        if (classBinding) {
            el.classBinding = classBinding;
        }
    }

    function genData(el) {
        var data = '';
        if (el.staticClass) {
            data += "staticClass:" + (el.staticClass) + ",";
        }
        if (el.classBinding) {
            data += "class:" + (el.classBinding) + ",";
        }
        return data
    }

    var klass$1 = {
        staticKeys: ['staticClass'],
        transformNode: transformNode,
        genData: genData
    };

    /*  */

    function transformNode$1(el, options) {
        var warn = options.warn || baseWarn;
        var staticStyle = getAndRemoveAttr(el, 'style');
        if (staticStyle) {
            /* istanbul ignore if */
            {
                var res = parseText(staticStyle, options.delimiters);
                if (res) {
                    warn(
                        "style=\"" + staticStyle + "\": " +
                        'Interpolation inside attributes has been removed. ' +
                        'Use v-bind or the colon shorthand instead. For example, ' +
                        'instead of <div style="{{ val }}">, use <div :style="val">.',
                        el.rawAttrsMap['style']
                    );
                }
            }
            el.staticStyle = JSON.stringify(parseStyleText(staticStyle));
        }

        var styleBinding = getBindingAttr(el, 'style', false /* getStatic */);
        if (styleBinding) {
            el.styleBinding = styleBinding;
        }
    }

    function genData$1(el) {
        var data = '';
        if (el.staticStyle) {
            data += "staticStyle:" + (el.staticStyle) + ",";
        }
        if (el.styleBinding) {
            data += "style:(" + (el.styleBinding) + "),";
        }
        return data
    }

    var style$1 = {
        staticKeys: ['staticStyle'],
        transformNode: transformNode$1,
        genData: genData$1
    };

    /*  */

    var decoder;

    var he = {
        decode: function decode(html) {
            decoder = decoder || document.createElement('div');
            decoder.innerHTML = html;
            return decoder.textContent
        }
    };

    /*  */

    var isUnaryTag = makeMap(
        'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
        'link,meta,param,source,track,wbr'
    );

    // Elements that you can, intentionally, leave open
    // (and which close themselves)
    var canBeLeftOpenTag = makeMap(
        'colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source'
    );

    // HTML5 tags https://html.spec.whatwg.org/multipage/indices.html#elements-3
    // Phrasing Content https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
    var isNonPhrasingTag = makeMap(
        'address,article,aside,base,blockquote,body,caption,col,colgroup,dd,' +
        'details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,' +
        'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,' +
        'optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,' +
        'title,tr,track'
    );

    /**
     * Not type-checking this file because it's mostly vendor code.
     */

    // Regular Expressions for parsing tags and attributes
    var attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
    var dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+?\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
    var ncname = "[a-zA-Z_][\\-\\.0-9_a-zA-Z" + (unicodeRegExp.source) + "]*";
    var qnameCapture = "((?:" + ncname + "\\:)?" + ncname + ")";
    var startTagOpen = new RegExp(("^<" + qnameCapture));
    var startTagClose = /^\s*(\/?)>/;
    var endTag = new RegExp(("^<\\/" + qnameCapture + "[^>]*>"));
    var doctype = /^<!DOCTYPE [^>]+>/i;
    // #7298: escape - to avoid being passed as HTML comment when inlined in page
    var comment = /^<!\--/;
    var conditionalComment = /^<!\[/;

    // Special Elements (can contain anything)
    var isPlainTextElement = makeMap('script,style,textarea', true);
    var reCache = {};

    var decodingMap = {
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&amp;': '&',
        '&#10;': '\n',
        '&#9;': '\t',
        '&#39;': "'"
    };
    var encodedAttr = /&(?:lt|gt|quot|amp|#39);/g;
    var encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g;

    // #5992
    var isIgnoreNewlineTag = makeMap('pre,textarea', true);
    var shouldIgnoreFirstNewline = function (tag, html) { return tag && isIgnoreNewlineTag(tag) && html[0] === '\n'; };

    function decodeAttr(value, shouldDecodeNewlines) {
        var re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr;
        return value.replace(re, function (match) { return decodingMap[match]; })
    }

    function parseHTML(html, options) {
        var stack = [];
        var expectHTML = options.expectHTML;
        var isUnaryTag$$1 = options.isUnaryTag || no;
        var canBeLeftOpenTag$$1 = options.canBeLeftOpenTag || no;
        var index = 0;
        var last, lastTag;
        while (html) {
            last = html;
            // Make sure we're not in a plaintext content element like script/style
            if (!lastTag || !isPlainTextElement(lastTag)) {
                var textEnd = html.indexOf('<');
                if (textEnd === 0) {
                    // Comment:
                    if (comment.test(html)) {
                        var commentEnd = html.indexOf('-->');

                        if (commentEnd >= 0) {
                            if (options.shouldKeepComment) {
                                options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3);
                            }
                            advance(commentEnd + 3);
                            continue
                        }
                    }

                    // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
                    if (conditionalComment.test(html)) {
                        var conditionalEnd = html.indexOf(']>');

                        if (conditionalEnd >= 0) {
                            advance(conditionalEnd + 2);
                            continue
                        }
                    }

                    // Doctype:
                    var doctypeMatch = html.match(doctype);
                    if (doctypeMatch) {
                        advance(doctypeMatch[0].length);
                        continue
                    }

                    // End tag:
                    var endTagMatch = html.match(endTag);
                    if (endTagMatch) {
                        var curIndex = index;
                        advance(endTagMatch[0].length);
                        parseEndTag(endTagMatch[1], curIndex, index);
                        continue
                    }

                    // Start tag:
                    var startTagMatch = parseStartTag();
                    if (startTagMatch) {
                        handleStartTag(startTagMatch);
                        if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
                            advance(1);
                        }
                        continue
                    }
                }

                var text = (void 0), rest = (void 0), next = (void 0);
                if (textEnd >= 0) {
                    rest = html.slice(textEnd);
                    while (
                        !endTag.test(rest) &&
                        !startTagOpen.test(rest) &&
                        !comment.test(rest) &&
                        !conditionalComment.test(rest)
                    ) {
                        // < in plain text, be forgiving and treat it as text
                        next = rest.indexOf('<', 1);
                        if (next < 0) { break }
                        textEnd += next;
                        rest = html.slice(textEnd);
                    }
                    text = html.substring(0, textEnd);
                }

                if (textEnd < 0) {
                    text = html;
                }

                if (text) {
                    advance(text.length);
                }

                if (options.chars && text) {
                    options.chars(text, index - text.length, index);
                }
            } else {
                var endTagLength = 0;
                var stackedTag = lastTag.toLowerCase();
                var reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'));
                var rest$1 = html.replace(reStackedTag, function (all, text, endTag) {
                    endTagLength = endTag.length;
                    if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
                        text = text
                            .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
                            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1');
                    }
                    if (shouldIgnoreFirstNewline(stackedTag, text)) {
                        text = text.slice(1);
                    }
                    if (options.chars) {
                        options.chars(text);
                    }
                    return ''
                });
                index += html.length - rest$1.length;
                html = rest$1;
                parseEndTag(stackedTag, index - endTagLength, index);
            }

            if (html === last) {
                options.chars && options.chars(html);
                if (!stack.length && options.warn) {
                    options.warn(("Mal-formatted tag at end of template: \"" + html + "\""), { start: index + html.length });
                }
                break
            }
        }

        // Clean up any remaining tags
        parseEndTag();

        function advance(n) {
            index += n;
            html = html.substring(n);
        }

        function parseStartTag() {
            var start = html.match(startTagOpen);
            if (start) {
                var match = {
                    tagName: start[1],
                    attrs: [],
                    start: index
                };
                advance(start[0].length);
                var end, attr;
                while (!(end = html.match(startTagClose)) && (attr = html.match(dynamicArgAttribute) || html.match(attribute))) {
                    attr.start = index;
                    advance(attr[0].length);
                    attr.end = index;
                    match.attrs.push(attr);
                }
                if (end) {
                    match.unarySlash = end[1];
                    advance(end[0].length);
                    match.end = index;
                    return match
                }
            }
        }

        function handleStartTag(match) {
            var tagName = match.tagName;
            var unarySlash = match.unarySlash;

            if (expectHTML) {
                if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
                    parseEndTag(lastTag);
                }
                if (canBeLeftOpenTag$$1(tagName) && lastTag === tagName) {
                    parseEndTag(tagName);
                }
            }

            var unary = isUnaryTag$$1(tagName) || !!unarySlash;

            var l = match.attrs.length;
            var attrs = new Array(l);
            for (var i = 0; i < l; i++) {
                var args = match.attrs[i];
                var value = args[3] || args[4] || args[5] || '';
                var shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
                    ? options.shouldDecodeNewlinesForHref
                    : options.shouldDecodeNewlines;
                attrs[i] = {
                    name: args[1],
                    value: decodeAttr(value, shouldDecodeNewlines)
                };
                if (options.outputSourceRange) {
                    attrs[i].start = args.start + args[0].match(/^\s*/).length;
                    attrs[i].end = args.end;
                }
            }

            if (!unary) {
                stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs, start: match.start, end: match.end });
                lastTag = tagName;
            }

            if (options.start) {
                options.start(tagName, attrs, unary, match.start, match.end);
            }
        }

        function parseEndTag(tagName, start, end) {
            var pos, lowerCasedTagName;
            if (start == null) { start = index; }
            if (end == null) { end = index; }

            // Find the closest opened tag of the same type
            if (tagName) {
                lowerCasedTagName = tagName.toLowerCase();
                for (pos = stack.length - 1; pos >= 0; pos--) {
                    if (stack[pos].lowerCasedTag === lowerCasedTagName) {
                        break
                    }
                }
            } else {
                // If no tag name is provided, clean shop
                pos = 0;
            }

            if (pos >= 0) {
                // Close all the open elements, up the stack
                for (var i = stack.length - 1; i >= pos; i--) {
                    if (i > pos || !tagName &&
                        options.warn
                    ) {
                        options.warn(
                            ("tag <" + (stack[i].tag) + "> has no matching end tag."),
                            { start: stack[i].start, end: stack[i].end }
                        );
                    }
                    if (options.end) {
                        options.end(stack[i].tag, start, end);
                    }
                }

                // Remove the open elements from the stack
                stack.length = pos;
                lastTag = pos && stack[pos - 1].tag;
            } else if (lowerCasedTagName === 'br') {
                if (options.start) {
                    options.start(tagName, [], true, start, end);
                }
            } else if (lowerCasedTagName === 'p') {
                if (options.start) {
                    options.start(tagName, [], false, start, end);
                }
                if (options.end) {
                    options.end(tagName, start, end);
                }
            }
        }
    }

    /*  */

    var onRE = /^@|^v-on:/;
    var dirRE = /^v-|^@|^:|^#/;
    var forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
    var forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
    var stripParensRE = /^\(|\)$/g;
    var dynamicArgRE = /^\[.*\]$/;

    var argRE = /:(.*)$/;
    var bindRE = /^:|^\.|^v-bind:/;
    var modifierRE = /\.[^.\]]+(?=[^\]]*$)/g;

    var slotRE = /^v-slot(:|$)|^#/;

    var lineBreakRE = /[\r\n]/;
    var whitespaceRE$1 = /[ \f\t\r\n]+/g;

    var invalidAttributeRE = /[\s"'<>\/=]/;

    var decodeHTMLCached = cached(he.decode);

    var emptySlotScopeToken = "_empty_";

    // configurable state
    var warn$2;
    var delimiters;
    var transforms;
    var preTransforms;
    var postTransforms;
    var platformIsPreTag;
    var platformMustUseProp;
    var platformGetTagNamespace;
    var maybeComponent;

    function createASTElement(
        tag,
        attrs,
        parent
    ) {
        return {
            type: 1,
            tag: tag,
            attrsList: attrs,
            attrsMap: makeAttrsMap(attrs),
            rawAttrsMap: {},
            parent: parent,
            children: []
        }
    }

    /**
     * Convert HTML string to AST.
     */
    function parse(
        template,
        options
    ) {
        warn$2 = options.warn || baseWarn;

        platformIsPreTag = options.isPreTag || no;
        platformMustUseProp = options.mustUseProp || no;
        platformGetTagNamespace = options.getTagNamespace || no;
        var isReservedTag = options.isReservedTag || no;
        maybeComponent = function (el) {
            return !!(
                el.component ||
                el.attrsMap[':is'] ||
                el.attrsMap['v-bind:is'] ||
                !(el.attrsMap.is ? isReservedTag(el.attrsMap.is) : isReservedTag(el.tag))
            );
        };
        transforms = pluckModuleFunction(options.modules, 'transformNode');
        preTransforms = pluckModuleFunction(options.modules, 'preTransformNode');
        postTransforms = pluckModuleFunction(options.modules, 'postTransformNode');

        delimiters = options.delimiters;

        var stack = [];
        var preserveWhitespace = options.preserveWhitespace !== false;
        var whitespaceOption = options.whitespace;
        var root;
        var currentParent;
        var inVPre = false;
        var inPre = false;
        var warned = false;

        function warnOnce(msg, range) {
            if (!warned) {
                warned = true;
                warn$2(msg, range);
            }
        }

        function closeElement(element) {
            trimEndingWhitespace(element);
            if (!inVPre && !element.processed) {
                element = processElement(element, options);
            }
            // tree management
            if (!stack.length && element !== root) {
                // allow root elements with v-if, v-else-if and v-else
                if (root.if && (element.elseif || element.else)) {
                    {
                        checkRootConstraints(element);
                    }
                    addIfCondition(root, {
                        exp: element.elseif,
                        block: element
                    });
                } else {
                    warnOnce(
                        "Component template should contain exactly one root element. " +
                        "If you are using v-if on multiple elements, " +
                        "use v-else-if to chain them instead.",
                        { start: element.start }
                    );
                }
            }
            if (currentParent && !element.forbidden) {
                if (element.elseif || element.else) {
                    processIfConditions(element, currentParent);
                } else {
                    if (element.slotScope) {
                        // scoped slot
                        // keep it in the children list so that v-else(-if) conditions can
                        // find it as the prev node.
                        var name = element.slotTarget || '"default"'
                            ; (currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = element;
                    }
                    currentParent.children.push(element);
                    element.parent = currentParent;
                }
            }

            // final children cleanup
            // filter out scoped slots
            element.children = element.children.filter(function (c) { return !(c).slotScope; });
            // remove trailing whitespace node again
            trimEndingWhitespace(element);

            // check pre state
            if (element.pre) {
                inVPre = false;
            }
            if (platformIsPreTag(element.tag)) {
                inPre = false;
            }
            // apply post-transforms
            for (var i = 0; i < postTransforms.length; i++) {
                postTransforms[i](element, options);
            }
        }

        function trimEndingWhitespace(el) {
            // remove trailing whitespace node
            if (!inPre) {
                var lastNode;
                while (
                    (lastNode = el.children[el.children.length - 1]) &&
                    lastNode.type === 3 &&
                    lastNode.text === ' '
                ) {
                    el.children.pop();
                }
            }
        }

        function checkRootConstraints(el) {
            if (el.tag === 'slot' || el.tag === 'template') {
                warnOnce(
                    "Cannot use <" + (el.tag) + "> as component root element because it may " +
                    'contain multiple nodes.',
                    { start: el.start }
                );
            }
            if (el.attrsMap.hasOwnProperty('v-for')) {
                warnOnce(
                    'Cannot use v-for on stateful component root element because ' +
                    'it renders multiple elements.',
                    el.rawAttrsMap['v-for']
                );
            }
        }

        parseHTML(template, {
            warn: warn$2,
            expectHTML: options.expectHTML,
            isUnaryTag: options.isUnaryTag,
            canBeLeftOpenTag: options.canBeLeftOpenTag,
            shouldDecodeNewlines: options.shouldDecodeNewlines,
            shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
            shouldKeepComment: options.comments,
            outputSourceRange: options.outputSourceRange,
            start: function start(tag, attrs, unary, start$1, end) {
                // check namespace.
                // inherit parent ns if there is one
                var ns = (currentParent && currentParent.ns) || platformGetTagNamespace(tag);

                // handle IE svg bug
                /* istanbul ignore if */
                if (isIE && ns === 'svg') {
                    attrs = guardIESVGBug(attrs);
                }

                var element = createASTElement(tag, attrs, currentParent);
                if (ns) {
                    element.ns = ns;
                }

                {
                    if (options.outputSourceRange) {
                        element.start = start$1;
                        element.end = end;
                        element.rawAttrsMap = element.attrsList.reduce(function (cumulated, attr) {
                            cumulated[attr.name] = attr;
                            return cumulated
                        }, {});
                    }
                    attrs.forEach(function (attr) {
                        if (invalidAttributeRE.test(attr.name)) {
                            warn$2(
                                "Invalid dynamic argument expression: attribute names cannot contain " +
                                "spaces, quotes, <, >, / or =.",
                                {
                                    start: attr.start + attr.name.indexOf("["),
                                    end: attr.start + attr.name.length
                                }
                            );
                        }
                    });
                }

                if (isForbiddenTag(element) && !isServerRendering()) {
                    element.forbidden = true;
                    warn$2(
                        'Templates should only be responsible for mapping the state to the ' +
                        'UI. Avoid placing tags with side-effects in your templates, such as ' +
                        "<" + tag + ">" + ', as they will not be parsed.',
                        { start: element.start }
                    );
                }

                // apply pre-transforms
                for (var i = 0; i < preTransforms.length; i++) {
                    element = preTransforms[i](element, options) || element;
                }

                if (!inVPre) {
                    processPre(element);
                    if (element.pre) {
                        inVPre = true;
                    }
                }
                if (platformIsPreTag(element.tag)) {
                    inPre = true;
                }
                if (inVPre) {
                    processRawAttrs(element);
                } else if (!element.processed) {
                    // structural directives
                    processFor(element);
                    processIf(element);
                    processOnce(element);
                }

                if (!root) {
                    root = element;
                    {
                        checkRootConstraints(root);
                    }
                }

                if (!unary) {
                    currentParent = element;
                    stack.push(element);
                } else {
                    closeElement(element);
                }
            },

            end: function end(tag, start, end$1) {
                var element = stack[stack.length - 1];
                // pop stack
                stack.length -= 1;
                currentParent = stack[stack.length - 1];
                if (options.outputSourceRange) {
                    element.end = end$1;
                }
                closeElement(element);
            },

            chars: function chars(text, start, end) {
                if (!currentParent) {
                    {
                        if (text === template) {
                            warnOnce(
                                'Component template requires a root element, rather than just text.',
                                { start: start }
                            );
                        } else if ((text = text.trim())) {
                            warnOnce(
                                ("text \"" + text + "\" outside root element will be ignored."),
                                { start: start }
                            );
                        }
                    }
                    return
                }
                // IE textarea placeholder bug
                /* istanbul ignore if */
                if (isIE &&
                    currentParent.tag === 'textarea' &&
                    currentParent.attrsMap.placeholder === text
                ) {
                    return
                }
                var children = currentParent.children;
                if (inPre || text.trim()) {
                    text = isTextTag(currentParent) ? text : decodeHTMLCached(text);
                } else if (!children.length) {
                    // remove the whitespace-only node right after an opening tag
                    text = '';
                } else if (whitespaceOption) {
                    if (whitespaceOption === 'condense') {
                        // in condense mode, remove the whitespace node if it contains
                        // line break, otherwise condense to a single space
                        text = lineBreakRE.test(text) ? '' : ' ';
                    } else {
                        text = ' ';
                    }
                } else {
                    text = preserveWhitespace ? ' ' : '';
                }
                if (text) {
                    if (!inPre && whitespaceOption === 'condense') {
                        // condense consecutive whitespaces into single space
                        text = text.replace(whitespaceRE$1, ' ');
                    }
                    var res;
                    var child;
                    if (!inVPre && text !== ' ' && (res = parseText(text, delimiters))) {
                        child = {
                            type: 2,
                            expression: res.expression,
                            tokens: res.tokens,
                            text: text
                        };
                    } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
                        child = {
                            type: 3,
                            text: text
                        };
                    }
                    if (child) {
                        if (options.outputSourceRange) {
                            child.start = start;
                            child.end = end;
                        }
                        children.push(child);
                    }
                }
            },
            comment: function comment(text, start, end) {
                // adding anything as a sibling to the root node is forbidden
                // comments should still be allowed, but ignored
                if (currentParent) {
                    var child = {
                        type: 3,
                        text: text,
                        isComment: true
                    };
                    if (options.outputSourceRange) {
                        child.start = start;
                        child.end = end;
                    }
                    currentParent.children.push(child);
                }
            }
        });
        return root
    }

    function processPre(el) {
        if (getAndRemoveAttr(el, 'v-pre') != null) {
            el.pre = true;
        }
    }

    function processRawAttrs(el) {
        var list = el.attrsList;
        var len = list.length;
        if (len) {
            var attrs = el.attrs = new Array(len);
            for (var i = 0; i < len; i++) {
                attrs[i] = {
                    name: list[i].name,
                    value: JSON.stringify(list[i].value)
                };
                if (list[i].start != null) {
                    attrs[i].start = list[i].start;
                    attrs[i].end = list[i].end;
                }
            }
        } else if (!el.pre) {
            // non root node in pre blocks with no attributes
            el.plain = true;
        }
    }

    function processElement(
        element,
        options
    ) {
        processKey(element);

        // determine whether this is a plain element after
        // removing structural attributes
        element.plain = (
            !element.key &&
            !element.scopedSlots &&
            !element.attrsList.length
        );

        processRef(element);
        processSlotContent(element);
        processSlotOutlet(element);
        processComponent(element);
        for (var i = 0; i < transforms.length; i++) {
            element = transforms[i](element, options) || element;
        }
        processAttrs(element);
        return element
    }

    function processKey(el) {
        var exp = getBindingAttr(el, 'key');
        if (exp) {
            {
                if (el.tag === 'template') {
                    warn$2(
                        "<template> cannot be keyed. Place the key on real elements instead.",
                        getRawBindingAttr(el, 'key')
                    );
                }
                if (el.for) {
                    var iterator = el.iterator2 || el.iterator1;
                    var parent = el.parent;
                    if (iterator && iterator === exp && parent && parent.tag === 'transition-group') {
                        warn$2(
                            "Do not use v-for index as key on <transition-group> children, " +
                            "this is the same as not using keys.",
                            getRawBindingAttr(el, 'key'),
                            true /* tip */
                        );
                    }
                }
            }
            el.key = exp;
        }
    }

    function processRef(el) {
        var ref = getBindingAttr(el, 'ref');
        if (ref) {
            el.ref = ref;
            el.refInFor = checkInFor(el);
        }
    }

    function processFor(el) {
        var exp;
        if ((exp = getAndRemoveAttr(el, 'v-for'))) {
            var res = parseFor(exp);
            if (res) {
                extend(el, res);
            } else {
                warn$2(
                    ("Invalid v-for expression: " + exp),
                    el.rawAttrsMap['v-for']
                );
            }
        }
    }



    function parseFor(exp) {
        var inMatch = exp.match(forAliasRE);
        if (!inMatch) { return }
        var res = {};
        res.for = inMatch[2].trim();
        var alias = inMatch[1].trim().replace(stripParensRE, '');
        var iteratorMatch = alias.match(forIteratorRE);
        if (iteratorMatch) {
            res.alias = alias.replace(forIteratorRE, '').trim();
            res.iterator1 = iteratorMatch[1].trim();
            if (iteratorMatch[2]) {
                res.iterator2 = iteratorMatch[2].trim();
            }
        } else {
            res.alias = alias;
        }
        return res
    }

    function processIf(el) {
        var exp = getAndRemoveAttr(el, 'v-if');
        if (exp) {
            el.if = exp;
            addIfCondition(el, {
                exp: exp,
                block: el
            });
        } else {
            if (getAndRemoveAttr(el, 'v-else') != null) {
                el.else = true;
            }
            var elseif = getAndRemoveAttr(el, 'v-else-if');
            if (elseif) {
                el.elseif = elseif;
            }
        }
    }

    function processIfConditions(el, parent) {
        var prev = findPrevElement(parent.children);
        if (prev && prev.if) {
            addIfCondition(prev, {
                exp: el.elseif,
                block: el
            });
        } else {
            warn$2(
                "v-" + (el.elseif ? ('else-if="' + el.elseif + '"') : 'else') + " " +
                "used on element <" + (el.tag) + "> without corresponding v-if.",
                el.rawAttrsMap[el.elseif ? 'v-else-if' : 'v-else']
            );
        }
    }

    function findPrevElement(children) {
        var i = children.length;
        while (i--) {
            if (children[i].type === 1) {
                return children[i]
            } else {
                if (children[i].text !== ' ') {
                    warn$2(
                        "text \"" + (children[i].text.trim()) + "\" between v-if and v-else(-if) " +
                        "will be ignored.",
                        children[i]
                    );
                }
                children.pop();
            }
        }
    }

    function addIfCondition(el, condition) {
        if (!el.ifConditions) {
            el.ifConditions = [];
        }
        el.ifConditions.push(condition);
    }

    function processOnce(el) {
        var once$$1 = getAndRemoveAttr(el, 'v-once');
        if (once$$1 != null) {
            el.once = true;
        }
    }

    // handle content being passed to a component as slot,
    // e.g. <template slot="xxx">, <div slot-scope="xxx">
    function processSlotContent(el) {
        var slotScope;
        if (el.tag === 'template') {
            slotScope = getAndRemoveAttr(el, 'scope');
            /* istanbul ignore if */
            if (slotScope) {
                warn$2(
                    "the \"scope\" attribute for scoped slots have been deprecated and " +
                    "replaced by \"slot-scope\" since 2.5. The new \"slot-scope\" attribute " +
                    "can also be used on plain elements in addition to <template> to " +
                    "denote scoped slots.",
                    el.rawAttrsMap['scope'],
                    true
                );
            }
            el.slotScope = slotScope || getAndRemoveAttr(el, 'slot-scope');
        } else if ((slotScope = getAndRemoveAttr(el, 'slot-scope'))) {
            /* istanbul ignore if */
            if (el.attrsMap['v-for']) {
                warn$2(
                    "Ambiguous combined usage of slot-scope and v-for on <" + (el.tag) + "> " +
                    "(v-for takes higher priority). Use a wrapper <template> for the " +
                    "scoped slot to make it clearer.",
                    el.rawAttrsMap['slot-scope'],
                    true
                );
            }
            el.slotScope = slotScope;
        }

        // slot="xxx"
        var slotTarget = getBindingAttr(el, 'slot');
        if (slotTarget) {
            el.slotTarget = slotTarget === '""' ? '"default"' : slotTarget;
            el.slotTargetDynamic = !!(el.attrsMap[':slot'] || el.attrsMap['v-bind:slot']);
            // preserve slot as an attribute for native shadow DOM compat
            // only for non-scoped slots.
            if (el.tag !== 'template' && !el.slotScope) {
                addAttr(el, 'slot', slotTarget, getRawBindingAttr(el, 'slot'));
            }
        }

        // 2.6 v-slot syntax
        {
            if (el.tag === 'template') {
                // v-slot on <template>
                var slotBinding = getAndRemoveAttrByRegex(el, slotRE);
                if (slotBinding) {
                    {
                        if (el.slotTarget || el.slotScope) {
                            warn$2(
                                "Unexpected mixed usage of different slot syntaxes.",
                                el
                            );
                        }
                        if (el.parent && !maybeComponent(el.parent)) {
                            warn$2(
                                "<template v-slot> can only appear at the root level inside " +
                                "the receiving component",
                                el
                            );
                        }
                    }
                    var ref = getSlotName(slotBinding);
                    var name = ref.name;
                    var dynamic = ref.dynamic;
                    el.slotTarget = name;
                    el.slotTargetDynamic = dynamic;
                    el.slotScope = slotBinding.value || emptySlotScopeToken; // force it into a scoped slot for perf
                }
            } else {
                // v-slot on component, denotes default slot
                var slotBinding$1 = getAndRemoveAttrByRegex(el, slotRE);
                if (slotBinding$1) {
                    {
                        if (!maybeComponent(el)) {
                            warn$2(
                                "v-slot can only be used on components or <template>.",
                                slotBinding$1
                            );
                        }
                        if (el.slotScope || el.slotTarget) {
                            warn$2(
                                "Unexpected mixed usage of different slot syntaxes.",
                                el
                            );
                        }
                        if (el.scopedSlots) {
                            warn$2(
                                "To avoid scope ambiguity, the default slot should also use " +
                                "<template> syntax when there are other named slots.",
                                slotBinding$1
                            );
                        }
                    }
                    // add the component's children to its default slot
                    var slots = el.scopedSlots || (el.scopedSlots = {});
                    var ref$1 = getSlotName(slotBinding$1);
                    var name$1 = ref$1.name;
                    var dynamic$1 = ref$1.dynamic;
                    var slotContainer = slots[name$1] = createASTElement('template', [], el);
                    slotContainer.slotTarget = name$1;
                    slotContainer.slotTargetDynamic = dynamic$1;
                    slotContainer.children = el.children.filter(function (c) {
                        if (!c.slotScope) {
                            c.parent = slotContainer;
                            return true
                        }
                    });
                    slotContainer.slotScope = slotBinding$1.value || emptySlotScopeToken;
                    // remove children as they are returned from scopedSlots now
                    el.children = [];
                    // mark el non-plain so data gets generated
                    el.plain = false;
                }
            }
        }
    }

    function getSlotName(binding) {
        var name = binding.name.replace(slotRE, '');
        if (!name) {
            if (binding.name[0] !== '#') {
                name = 'default';
            } else {
                warn$2(
                    "v-slot shorthand syntax requires a slot name.",
                    binding
                );
            }
        }
        return dynamicArgRE.test(name)
            // dynamic [name]
            ? { name: name.slice(1, -1), dynamic: true }
            // static name
            : { name: ("\"" + name + "\""), dynamic: false }
    }

    // handle <slot/> outlets
    function processSlotOutlet(el) {
        if (el.tag === 'slot') {
            el.slotName = getBindingAttr(el, 'name');
            if (el.key) {
                warn$2(
                    "`key` does not work on <slot> because slots are abstract outlets " +
                    "and can possibly expand into multiple elements. " +
                    "Use the key on a wrapping element instead.",
                    getRawBindingAttr(el, 'key')
                );
            }
        }
    }

    function processComponent(el) {
        var binding;
        if ((binding = getBindingAttr(el, 'is'))) {
            el.component = binding;
        }
        if (getAndRemoveAttr(el, 'inline-template') != null) {
            el.inlineTemplate = true;
        }
    }

    function processAttrs(el) {
        var list = el.attrsList;
        var i, l, name, rawName, value, modifiers, syncGen, isDynamic;
        for (i = 0, l = list.length; i < l; i++) {
            name = rawName = list[i].name;
            value = list[i].value;
            if (dirRE.test(name)) {
                // mark element as dynamic
                el.hasBindings = true;
                // modifiers
                modifiers = parseModifiers(name.replace(dirRE, ''));
                // support .foo shorthand syntax for the .prop modifier
                if (modifiers) {
                    name = name.replace(modifierRE, '');
                }
                if (bindRE.test(name)) { // v-bind
                    name = name.replace(bindRE, '');
                    value = parseFilters(value);
                    isDynamic = dynamicArgRE.test(name);
                    if (isDynamic) {
                        name = name.slice(1, -1);
                    }
                    if (
                        value.trim().length === 0
                    ) {
                        warn$2(
                            ("The value for a v-bind expression cannot be empty. Found in \"v-bind:" + name + "\"")
                        );
                    }
                    if (modifiers) {
                        if (modifiers.prop && !isDynamic) {
                            name = camelize(name);
                            if (name === 'innerHtml') { name = 'innerHTML'; }
                        }
                        if (modifiers.camel && !isDynamic) {
                            name = camelize(name);
                        }
                        if (modifiers.sync) {
                            syncGen = genAssignmentCode(value, "$event");
                            if (!isDynamic) {
                                addHandler(
                                    el,
                                    ("update:" + (camelize(name))),
                                    syncGen,
                                    null,
                                    false,
                                    warn$2,
                                    list[i]
                                );
                                if (hyphenate(name) !== camelize(name)) {
                                    addHandler(
                                        el,
                                        ("update:" + (hyphenate(name))),
                                        syncGen,
                                        null,
                                        false,
                                        warn$2,
                                        list[i]
                                    );
                                }
                            } else {
                                // handler w/ dynamic event name
                                addHandler(
                                    el,
                                    ("\"update:\"+(" + name + ")"),
                                    syncGen,
                                    null,
                                    false,
                                    warn$2,
                                    list[i],
                                    true // dynamic
                                );
                            }
                        }
                    }
                    if ((modifiers && modifiers.prop) || (
                        !el.component && platformMustUseProp(el.tag, el.attrsMap.type, name)
                    )) {
                        addProp(el, name, value, list[i], isDynamic);
                    } else {
                        addAttr(el, name, value, list[i], isDynamic);
                    }
                } else if (onRE.test(name)) { // v-on
                    name = name.replace(onRE, '');
                    isDynamic = dynamicArgRE.test(name);
                    if (isDynamic) {
                        name = name.slice(1, -1);
                    }
                    addHandler(el, name, value, modifiers, false, warn$2, list[i], isDynamic);
                } else { // normal directives
                    name = name.replace(dirRE, '');
                    // parse arg
                    var argMatch = name.match(argRE);
                    var arg = argMatch && argMatch[1];
                    isDynamic = false;
                    if (arg) {
                        name = name.slice(0, -(arg.length + 1));
                        if (dynamicArgRE.test(arg)) {
                            arg = arg.slice(1, -1);
                            isDynamic = true;
                        }
                    }
                    addDirective(el, name, rawName, value, arg, isDynamic, modifiers, list[i]);
                    if (name === 'model') {
                        checkForAliasModel(el, value);
                    }
                }
            } else {
                // literal attribute
                {
                    var res = parseText(value, delimiters);
                    if (res) {
                        warn$2(
                            name + "=\"" + value + "\": " +
                            'Interpolation inside attributes has been removed. ' +
                            'Use v-bind or the colon shorthand instead. For example, ' +
                            'instead of <div id="{{ val }}">, use <div :id="val">.',
                            list[i]
                        );
                    }
                }
                addAttr(el, name, JSON.stringify(value), list[i]);
                // #6887 firefox doesn't update muted state if set via attribute
                // even immediately after element creation
                if (!el.component &&
                    name === 'muted' &&
                    platformMustUseProp(el.tag, el.attrsMap.type, name)) {
                    addProp(el, name, 'true', list[i]);
                }
            }
        }
    }

    function checkInFor(el) {
        var parent = el;
        while (parent) {
            if (parent.for !== undefined) {
                return true
            }
            parent = parent.parent;
        }
        return false
    }

    function parseModifiers(name) {
        var match = name.match(modifierRE);
        if (match) {
            var ret = {};
            match.forEach(function (m) { ret[m.slice(1)] = true; });
            return ret
        }
    }

    function makeAttrsMap(attrs) {
        var map = {};
        for (var i = 0, l = attrs.length; i < l; i++) {
            if (
                map[attrs[i].name] && !isIE && !isEdge
            ) {
                warn$2('duplicate attribute: ' + attrs[i].name, attrs[i]);
            }
            map[attrs[i].name] = attrs[i].value;
        }
        return map
    }

    // for script (e.g. type="x/template") or style, do not decode content
    function isTextTag(el) {
        return el.tag === 'script' || el.tag === 'style'
    }

    function isForbiddenTag(el) {
        return (
            el.tag === 'style' ||
            (el.tag === 'script' && (
                !el.attrsMap.type ||
                el.attrsMap.type === 'text/javascript'
            ))
        )
    }

    var ieNSBug = /^xmlns:NS\d+/;
    var ieNSPrefix = /^NS\d+:/;

    /* istanbul ignore next */
    function guardIESVGBug(attrs) {
        var res = [];
        for (var i = 0; i < attrs.length; i++) {
            var attr = attrs[i];
            if (!ieNSBug.test(attr.name)) {
                attr.name = attr.name.replace(ieNSPrefix, '');
                res.push(attr);
            }
        }
        return res
    }

    function checkForAliasModel(el, value) {
        var _el = el;
        while (_el) {
            if (_el.for && _el.alias === value) {
                warn$2(
                    "<" + (el.tag) + " v-model=\"" + value + "\">: " +
                    "You are binding v-model directly to a v-for iteration alias. " +
                    "This will not be able to modify the v-for source array because " +
                    "writing to the alias is like modifying a function local variable. " +
                    "Consider using an array of objects and use v-model on an object property instead.",
                    el.rawAttrsMap['v-model']
                );
            }
            _el = _el.parent;
        }
    }

    /*  */

    function preTransformNode(el, options) {
        if (el.tag === 'input') {
            var map = el.attrsMap;
            if (!map['v-model']) {
                return
            }

            var typeBinding;
            if (map[':type'] || map['v-bind:type']) {
                typeBinding = getBindingAttr(el, 'type');
            }
            if (!map.type && !typeBinding && map['v-bind']) {
                typeBinding = "(" + (map['v-bind']) + ").type";
            }

            if (typeBinding) {
                var ifCondition = getAndRemoveAttr(el, 'v-if', true);
                var ifConditionExtra = ifCondition ? ("&&(" + ifCondition + ")") : "";
                var hasElse = getAndRemoveAttr(el, 'v-else', true) != null;
                var elseIfCondition = getAndRemoveAttr(el, 'v-else-if', true);
                // 1. checkbox
                var branch0 = cloneASTElement(el);
                // process for on the main node
                processFor(branch0);
                addRawAttr(branch0, 'type', 'checkbox');
                processElement(branch0, options);
                branch0.processed = true; // prevent it from double-processed
                branch0.if = "(" + typeBinding + ")==='checkbox'" + ifConditionExtra;
                addIfCondition(branch0, {
                    exp: branch0.if,
                    block: branch0
                });
                // 2. add radio else-if condition
                var branch1 = cloneASTElement(el);
                getAndRemoveAttr(branch1, 'v-for', true);
                addRawAttr(branch1, 'type', 'radio');
                processElement(branch1, options);
                addIfCondition(branch0, {
                    exp: "(" + typeBinding + ")==='radio'" + ifConditionExtra,
                    block: branch1
                });
                // 3. other
                var branch2 = cloneASTElement(el);
                getAndRemoveAttr(branch2, 'v-for', true);
                addRawAttr(branch2, ':type', typeBinding);
                processElement(branch2, options);
                addIfCondition(branch0, {
                    exp: ifCondition,
                    block: branch2
                });

                if (hasElse) {
                    branch0.else = true;
                } else if (elseIfCondition) {
                    branch0.elseif = elseIfCondition;
                }

                return branch0
            }
        }
    }

    function cloneASTElement(el) {
        return createASTElement(el.tag, el.attrsList.slice(), el.parent)
    }

    var model$1 = {
        preTransformNode: preTransformNode
    };

    var modules$1 = [
        klass$1,
        style$1,
        model$1
    ];

    /*  */

    function text(el, dir) {
        if (dir.value) {
            addProp(el, 'textContent', ("_s(" + (dir.value) + ")"), dir);
        }
    }

    /*  */

    function html(el, dir) {
        if (dir.value) {
            addProp(el, 'innerHTML', ("_s(" + (dir.value) + ")"), dir);
        }
    }

    var directives$1 = {
        model: model,
        text: text,
        html: html
    };

    /*  */

    var baseOptions = {
        expectHTML: true,
        modules: modules$1,
        directives: directives$1,
        isPreTag: isPreTag,
        isUnaryTag: isUnaryTag,
        mustUseProp: mustUseProp,
        canBeLeftOpenTag: canBeLeftOpenTag,
        isReservedTag: isReservedTag,
        getTagNamespace: getTagNamespace,
        staticKeys: genStaticKeys(modules$1)
    };

    /*  */

    var isStaticKey;
    var isPlatformReservedTag;

    var genStaticKeysCached = cached(genStaticKeys$1);

    /**
     * Goal of the optimizer: walk the generated template AST tree
     * and detect sub-trees that are purely static, i.e. parts of
     * the DOM that never needs to change.
     *
     * Once we detect these sub-trees, we can:
     *
     * 1. Hoist them into constants, so that we no longer need to
     *    create fresh nodes for them on each re-render;
     * 2. Completely skip them in the patching process.
     */
    function optimize(root, options) {
        if (!root) { return }
        isStaticKey = genStaticKeysCached(options.staticKeys || '');
        isPlatformReservedTag = options.isReservedTag || no;
        // first pass: mark all non-static nodes.
        markStatic$1(root);
        // second pass: mark static roots.
        markStaticRoots(root, false);
    }

    function genStaticKeys$1(keys) {
        return makeMap(
            'type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap' +
            (keys ? ',' + keys : '')
        )
    }

    function markStatic$1(node) {
        node.static = isStatic(node);
        if (node.type === 1) {
            // do not make component slot content static. this avoids
            // 1. components not able to mutate slot nodes
            // 2. static slot content fails for hot-reloading
            if (
                !isPlatformReservedTag(node.tag) &&
                node.tag !== 'slot' &&
                node.attrsMap['inline-template'] == null
            ) {
                return
            }
            for (var i = 0, l = node.children.length; i < l; i++) {
                var child = node.children[i];
                markStatic$1(child);
                if (!child.static) {
                    node.static = false;
                }
            }
            if (node.ifConditions) {
                for (var i$1 = 1, l$1 = node.ifConditions.length; i$1 < l$1; i$1++) {
                    var block = node.ifConditions[i$1].block;
                    markStatic$1(block);
                    if (!block.static) {
                        node.static = false;
                    }
                }
            }
        }
    }

    function markStaticRoots(node, isInFor) {
        if (node.type === 1) {
            if (node.static || node.once) {
                node.staticInFor = isInFor;
            }
            // For a node to qualify as a static root, it should have children that
            // are not just static text. Otherwise the cost of hoisting out will
            // outweigh the benefits and it's better off to just always render it fresh.
            if (node.static && node.children.length && !(
                node.children.length === 1 &&
                node.children[0].type === 3
            )) {
                node.staticRoot = true;
                return
            } else {
                node.staticRoot = false;
            }
            if (node.children) {
                for (var i = 0, l = node.children.length; i < l; i++) {
                    markStaticRoots(node.children[i], isInFor || !!node.for);
                }
            }
            if (node.ifConditions) {
                for (var i$1 = 1, l$1 = node.ifConditions.length; i$1 < l$1; i$1++) {
                    markStaticRoots(node.ifConditions[i$1].block, isInFor);
                }
            }
        }
    }

    function isStatic(node) {
        if (node.type === 2) { // expression
            return false
        }
        if (node.type === 3) { // text
            return true
        }
        return !!(node.pre || (
            !node.hasBindings && // no dynamic bindings
            !node.if && !node.for && // not v-if or v-for or v-else
            !isBuiltInTag(node.tag) && // not a built-in
            isPlatformReservedTag(node.tag) && // not a component
            !isDirectChildOfTemplateFor(node) &&
            Object.keys(node).every(isStaticKey)
        ))
    }

    function isDirectChildOfTemplateFor(node) {
        while (node.parent) {
            node = node.parent;
            if (node.tag !== 'template') {
                return false
            }
            if (node.for) {
                return true
            }
        }
        return false
    }

    /*  */

    var fnExpRE = /^([\w$_]+|\([^)]*?\))\s*=>|^function(?:\s+[\w$]+)?\s*\(/;
    var fnInvokeRE = /\([^)]*?\);*$/;
    var simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/;

    // KeyboardEvent.keyCode aliases
    var keyCodes = {
        esc: 27,
        tab: 9,
        enter: 13,
        space: 32,
        up: 38,
        left: 37,
        right: 39,
        down: 40,
        'delete': [8, 46]
    };

    // KeyboardEvent.key aliases
    var keyNames = {
        // #7880: IE11 and Edge use `Esc` for Escape key name.
        esc: ['Esc', 'Escape'],
        tab: 'Tab',
        enter: 'Enter',
        // #9112: IE11 uses `Spacebar` for Space key name.
        space: [' ', 'Spacebar'],
        // #7806: IE11 uses key names without `Arrow` prefix for arrow keys.
        up: ['Up', 'ArrowUp'],
        left: ['Left', 'ArrowLeft'],
        right: ['Right', 'ArrowRight'],
        down: ['Down', 'ArrowDown'],
        // #9112: IE11 uses `Del` for Delete key name.
        'delete': ['Backspace', 'Delete', 'Del']
    };

    // #4868: modifiers that prevent the execution of the listener
    // need to explicitly return null so that we can determine whether to remove
    // the listener for .once
    var genGuard = function (condition) { return ("if(" + condition + ")return null;"); };

    var modifierCode = {
        stop: '$event.stopPropagation();',
        prevent: '$event.preventDefault();',
        self: genGuard("$event.target !== $event.currentTarget"),
        ctrl: genGuard("!$event.ctrlKey"),
        shift: genGuard("!$event.shiftKey"),
        alt: genGuard("!$event.altKey"),
        meta: genGuard("!$event.metaKey"),
        left: genGuard("'button' in $event && $event.button !== 0"),
        middle: genGuard("'button' in $event && $event.button !== 1"),
        right: genGuard("'button' in $event && $event.button !== 2")
    };

    function genHandlers(
        events,
        isNative
    ) {
        var prefix = isNative ? 'nativeOn:' : 'on:';
        var staticHandlers = "";
        var dynamicHandlers = "";
        for (var name in events) {
            var handlerCode = genHandler(events[name]);
            if (events[name] && events[name].dynamic) {
                dynamicHandlers += name + "," + handlerCode + ",";
            } else {
                staticHandlers += "\"" + name + "\":" + handlerCode + ",";
            }
        }
        staticHandlers = "{" + (staticHandlers.slice(0, -1)) + "}";
        if (dynamicHandlers) {
            return prefix + "_d(" + staticHandlers + ",[" + (dynamicHandlers.slice(0, -1)) + "])"
        } else {
            return prefix + staticHandlers
        }
    }

    function genHandler(handler) {
        if (!handler) {
            return 'function(){}'
        }

        if (Array.isArray(handler)) {
            return ("[" + (handler.map(function (handler) { return genHandler(handler); }).join(',')) + "]")
        }

        var isMethodPath = simplePathRE.test(handler.value);
        var isFunctionExpression = fnExpRE.test(handler.value);
        var isFunctionInvocation = simplePathRE.test(handler.value.replace(fnInvokeRE, ''));

        if (!handler.modifiers) {
            if (isMethodPath || isFunctionExpression) {
                return handler.value
            }
            return ("function($event){" + (isFunctionInvocation ? ("return " + (handler.value)) : handler.value) + "}") // inline statement
        } else {
            var code = '';
            var genModifierCode = '';
            var keys = [];
            for (var key in handler.modifiers) {
                if (modifierCode[key]) {
                    genModifierCode += modifierCode[key];
                    // left/right
                    if (keyCodes[key]) {
                        keys.push(key);
                    }
                } else if (key === 'exact') {
                    var modifiers = (handler.modifiers);
                    genModifierCode += genGuard(
                        ['ctrl', 'shift', 'alt', 'meta']
                            .filter(function (keyModifier) { return !modifiers[keyModifier]; })
                            .map(function (keyModifier) { return ("$event." + keyModifier + "Key"); })
                            .join('||')
                    );
                } else {
                    keys.push(key);
                }
            }
            if (keys.length) {
                code += genKeyFilter(keys);
            }
            // Make sure modifiers like prevent and stop get executed after key filtering
            if (genModifierCode) {
                code += genModifierCode;
            }
            var handlerCode = isMethodPath
                ? ("return " + (handler.value) + ".apply(null, arguments)")
                : isFunctionExpression
                    ? ("return (" + (handler.value) + ").apply(null, arguments)")
                    : isFunctionInvocation
                        ? ("return " + (handler.value))
                        : handler.value;
            return ("function($event){" + code + handlerCode + "}")
        }
    }

    function genKeyFilter(keys) {
        return (
            // make sure the key filters only apply to KeyboardEvents
            // #9441: can't use 'keyCode' in $event because Chrome autofill fires fake
            // key events that do not have keyCode property...
            "if(!$event.type.indexOf('key')&&" +
            (keys.map(genFilterCode).join('&&')) + ")return null;"
        )
    }

    function genFilterCode(key) {
        var keyVal = parseInt(key, 10);
        if (keyVal) {
            return ("$event.keyCode!==" + keyVal)
        }
        var keyCode = keyCodes[key];
        var keyName = keyNames[key];
        return (
            "_k($event.keyCode," +
            (JSON.stringify(key)) + "," +
            (JSON.stringify(keyCode)) + "," +
            "$event.key," +
            "" + (JSON.stringify(keyName)) +
            ")"
        )
    }

    /*  */

    function on(el, dir) {
        if (dir.modifiers) {
            warn("v-on without argument does not support modifiers.");
        }
        el.wrapListeners = function (code) { return ("_g(" + code + "," + (dir.value) + ")"); };
    }

    /*  */

    function bind$1(el, dir) {
        el.wrapData = function (code) {
            return ("_b(" + code + ",'" + (el.tag) + "'," + (dir.value) + "," + (dir.modifiers && dir.modifiers.prop ? 'true' : 'false') + (dir.modifiers && dir.modifiers.sync ? ',true' : '') + ")")
        };
    }

    /*  */

    var baseDirectives = {
        on: on,
        bind: bind$1,
        cloak: noop
    };

    /*  */





    var CodegenState = function CodegenState(options) {
        this.options = options;
        this.warn = options.warn || baseWarn;
        this.transforms = pluckModuleFunction(options.modules, 'transformCode');
        this.dataGenFns = pluckModuleFunction(options.modules, 'genData');
        this.directives = extend(extend({}, baseDirectives), options.directives);
        var isReservedTag = options.isReservedTag || no;
        this.maybeComponent = function (el) { return !!el.component || !isReservedTag(el.tag); };
        this.onceId = 0;
        this.staticRenderFns = [];
        this.pre = false;
    };



    function generate(
        ast,
        options
    ) {
        var state = new CodegenState(options);
        // fix #11483, Root level <script> tags should not be rendered.
        var code = ast ? (ast.tag === 'script' ? 'null' : genElement(ast, state)) : '_c("div")';
        return {
            render: ("with(this){return " + code + "}"),
            staticRenderFns: state.staticRenderFns
        }
    }

    function genElement(el, state) {
        if (el.parent) {
            el.pre = el.pre || el.parent.pre;
        }

        if (el.staticRoot && !el.staticProcessed) {
            return genStatic(el, state)
        } else if (el.once && !el.onceProcessed) {
            return genOnce(el, state)
        } else if (el.for && !el.forProcessed) {
            return genFor(el, state)
        } else if (el.if && !el.ifProcessed) {
            return genIf(el, state)
        } else if (el.tag === 'template' && !el.slotTarget && !state.pre) {
            return genChildren(el, state) || 'void 0'
        } else if (el.tag === 'slot') {
            return genSlot(el, state)
        } else {
            // component or element
            var code;
            if (el.component) {
                code = genComponent(el.component, el, state);
            } else {
                var data;
                if (!el.plain || (el.pre && state.maybeComponent(el))) {
                    data = genData$2(el, state);
                }

                var children = el.inlineTemplate ? null : genChildren(el, state, true);
                code = "_c('" + (el.tag) + "'" + (data ? ("," + data) : '') + (children ? ("," + children) : '') + ")";
            }
            // module transforms
            for (var i = 0; i < state.transforms.length; i++) {
                code = state.transforms[i](el, code);
            }
            return code
        }
    }

    // hoist static sub-trees out
    function genStatic(el, state) {
        el.staticProcessed = true;
        // Some elements (templates) need to behave differently inside of a v-pre
        // node.  All pre nodes are static roots, so we can use this as a location to
        // wrap a state change and reset it upon exiting the pre node.
        var originalPreState = state.pre;
        if (el.pre) {
            state.pre = el.pre;
        }
        state.staticRenderFns.push(("with(this){return " + (genElement(el, state)) + "}"));
        state.pre = originalPreState;
        return ("_m(" + (state.staticRenderFns.length - 1) + (el.staticInFor ? ',true' : '') + ")")
    }

    // v-once
    function genOnce(el, state) {
        el.onceProcessed = true;
        if (el.if && !el.ifProcessed) {
            return genIf(el, state)
        } else if (el.staticInFor) {
            var key = '';
            var parent = el.parent;
            while (parent) {
                if (parent.for) {
                    key = parent.key;
                    break
                }
                parent = parent.parent;
            }
            if (!key) {
                state.warn(
                    "v-once can only be used inside v-for that is keyed. ",
                    el.rawAttrsMap['v-once']
                );
                return genElement(el, state)
            }
            return ("_o(" + (genElement(el, state)) + "," + (state.onceId++) + "," + key + ")")
        } else {
            return genStatic(el, state)
        }
    }

    function genIf(
        el,
        state,
        altGen,
        altEmpty
    ) {
        el.ifProcessed = true; // avoid recursion
        return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty)
    }

    function genIfConditions(
        conditions,
        state,
        altGen,
        altEmpty
    ) {
        if (!conditions.length) {
            return altEmpty || '_e()'
        }

        var condition = conditions.shift();
        if (condition.exp) {
            return ("(" + (condition.exp) + ")?" + (genTernaryExp(condition.block)) + ":" + (genIfConditions(conditions, state, altGen, altEmpty)))
        } else {
            return ("" + (genTernaryExp(condition.block)))
        }

        // v-if with v-once should generate code like (a)?_m(0):_m(1)
        function genTernaryExp(el) {
            return altGen
                ? altGen(el, state)
                : el.once
                    ? genOnce(el, state)
                    : genElement(el, state)
        }
    }

    function genFor(
        el,
        state,
        altGen,
        altHelper
    ) {
        var exp = el.for;
        var alias = el.alias;
        var iterator1 = el.iterator1 ? ("," + (el.iterator1)) : '';
        var iterator2 = el.iterator2 ? ("," + (el.iterator2)) : '';

        if (state.maybeComponent(el) &&
            el.tag !== 'slot' &&
            el.tag !== 'template' &&
            !el.key
        ) {
            state.warn(
                "<" + (el.tag) + " v-for=\"" + alias + " in " + exp + "\">: component lists rendered with " +
                "v-for should have explicit keys. " +
                "See https://vuejs.org/guide/list.html#key for more info.",
                el.rawAttrsMap['v-for'],
                true /* tip */
            );
        }

        el.forProcessed = true; // avoid recursion
        return (altHelper || '_l') + "((" + exp + ")," +
            "function(" + alias + iterator1 + iterator2 + "){" +
            "return " + ((altGen || genElement)(el, state)) +
            '})'
    }

    function genData$2(el, state) {
        var data = '{';

        // directives first.
        // directives may mutate the el's other properties before they are generated.
        var dirs = genDirectives(el, state);
        if (dirs) { data += dirs + ','; }

        // key
        if (el.key) {
            data += "key:" + (el.key) + ",";
        }
        // ref
        if (el.ref) {
            data += "ref:" + (el.ref) + ",";
        }
        if (el.refInFor) {
            data += "refInFor:true,";
        }
        // pre
        if (el.pre) {
            data += "pre:true,";
        }
        // record original tag name for components using "is" attribute
        if (el.component) {
            data += "tag:\"" + (el.tag) + "\",";
        }
        // module data generation functions
        for (var i = 0; i < state.dataGenFns.length; i++) {
            data += state.dataGenFns[i](el);
        }
        // attributes
        if (el.attrs) {
            data += "attrs:" + (genProps(el.attrs)) + ",";
        }
        // DOM props
        if (el.props) {
            data += "domProps:" + (genProps(el.props)) + ",";
        }
        // event handlers
        if (el.events) {
            data += (genHandlers(el.events, false)) + ",";
        }
        if (el.nativeEvents) {
            data += (genHandlers(el.nativeEvents, true)) + ",";
        }
        // slot target
        // only for non-scoped slots
        if (el.slotTarget && !el.slotScope) {
            data += "slot:" + (el.slotTarget) + ",";
        }
        // scoped slots
        if (el.scopedSlots) {
            data += (genScopedSlots(el, el.scopedSlots, state)) + ",";
        }
        // component v-model
        if (el.model) {
            data += "model:{value:" + (el.model.value) + ",callback:" + (el.model.callback) + ",expression:" + (el.model.expression) + "},";
        }
        // inline-template
        if (el.inlineTemplate) {
            var inlineTemplate = genInlineTemplate(el, state);
            if (inlineTemplate) {
                data += inlineTemplate + ",";
            }
        }
        data = data.replace(/,$/, '') + '}';
        // v-bind dynamic argument wrap
        // v-bind with dynamic arguments must be applied using the same v-bind object
        // merge helper so that class/style/mustUseProp attrs are handled correctly.
        if (el.dynamicAttrs) {
            data = "_b(" + data + ",\"" + (el.tag) + "\"," + (genProps(el.dynamicAttrs)) + ")";
        }
        // v-bind data wrap
        if (el.wrapData) {
            data = el.wrapData(data);
        }
        // v-on data wrap
        if (el.wrapListeners) {
            data = el.wrapListeners(data);
        }
        return data
    }

    function genDirectives(el, state) {
        var dirs = el.directives;
        if (!dirs) { return }
        var res = 'directives:[';
        var hasRuntime = false;
        var i, l, dir, needRuntime;
        for (i = 0, l = dirs.length; i < l; i++) {
            dir = dirs[i];
            needRuntime = true;
            var gen = state.directives[dir.name];
            if (gen) {
                // compile-time directive that manipulates AST.
                // returns true if it also needs a runtime counterpart.
                needRuntime = !!gen(el, dir, state.warn);
            }
            if (needRuntime) {
                hasRuntime = true;
                res += "{name:\"" + (dir.name) + "\",rawName:\"" + (dir.rawName) + "\"" + (dir.value ? (",value:(" + (dir.value) + "),expression:" + (JSON.stringify(dir.value))) : '') + (dir.arg ? (",arg:" + (dir.isDynamicArg ? dir.arg : ("\"" + (dir.arg) + "\""))) : '') + (dir.modifiers ? (",modifiers:" + (JSON.stringify(dir.modifiers))) : '') + "},";
            }
        }
        if (hasRuntime) {
            return res.slice(0, -1) + ']'
        }
    }

    function genInlineTemplate(el, state) {
        var ast = el.children[0];
        if (el.children.length !== 1 || ast.type !== 1) {
            state.warn(
                'Inline-template components must have exactly one child element.',
                { start: el.start }
            );
        }
        if (ast && ast.type === 1) {
            var inlineRenderFns = generate(ast, state.options);
            return ("inlineTemplate:{render:function(){" + (inlineRenderFns.render) + "},staticRenderFns:[" + (inlineRenderFns.staticRenderFns.map(function (code) { return ("function(){" + code + "}"); }).join(',')) + "]}")
        }
    }

    function genScopedSlots(
        el,
        slots,
        state
    ) {
        // by default scoped slots are considered "stable", this allows child
        // components with only scoped slots to skip forced updates from parent.
        // but in some cases we have to bail-out of this optimization
        // for example if the slot contains dynamic names, has v-if or v-for on them...
        var needsForceUpdate = el.for || Object.keys(slots).some(function (key) {
            var slot = slots[key];
            return (
                slot.slotTargetDynamic ||
                slot.if ||
                slot.for ||
                containsSlotChild(slot) // is passing down slot from parent which may be dynamic
            )
        });

        // #9534: if a component with scoped slots is inside a conditional branch,
        // it's possible for the same component to be reused but with different
        // compiled slot content. To avoid that, we generate a unique key based on
        // the generated code of all the slot contents.
        var needsKey = !!el.if;

        // OR when it is inside another scoped slot or v-for (the reactivity may be
        // disconnected due to the intermediate scope variable)
        // #9438, #9506
        // TODO: this can be further optimized by properly analyzing in-scope bindings
        // and skip force updating ones that do not actually use scope variables.
        if (!needsForceUpdate) {
            var parent = el.parent;
            while (parent) {
                if (
                    (parent.slotScope && parent.slotScope !== emptySlotScopeToken) ||
                    parent.for
                ) {
                    needsForceUpdate = true;
                    break
                }
                if (parent.if) {
                    needsKey = true;
                }
                parent = parent.parent;
            }
        }

        var generatedSlots = Object.keys(slots)
            .map(function (key) { return genScopedSlot(slots[key], state); })
            .join(',');

        return ("scopedSlots:_u([" + generatedSlots + "]" + (needsForceUpdate ? ",null,true" : "") + (!needsForceUpdate && needsKey ? (",null,false," + (hash(generatedSlots))) : "") + ")")
    }

    function hash(str) {
        var hash = 5381;
        var i = str.length;
        while (i) {
            hash = (hash * 33) ^ str.charCodeAt(--i);
        }
        return hash >>> 0
    }

    function containsSlotChild(el) {
        if (el.type === 1) {
            if (el.tag === 'slot') {
                return true
            }
            return el.children.some(containsSlotChild)
        }
        return false
    }

    function genScopedSlot(
        el,
        state
    ) {
        var isLegacySyntax = el.attrsMap['slot-scope'];
        if (el.if && !el.ifProcessed && !isLegacySyntax) {
            return genIf(el, state, genScopedSlot, "null")
        }
        if (el.for && !el.forProcessed) {
            return genFor(el, state, genScopedSlot)
        }
        var slotScope = el.slotScope === emptySlotScopeToken
            ? ""
            : String(el.slotScope);
        var fn = "function(" + slotScope + "){" +
            "return " + (el.tag === 'template'
                ? el.if && isLegacySyntax
                    ? ("(" + (el.if) + ")?" + (genChildren(el, state) || 'undefined') + ":undefined")
                    : genChildren(el, state) || 'undefined'
                : genElement(el, state)) + "}";
        // reverse proxy v-slot without scope on this.$slots
        var reverseProxy = slotScope ? "" : ",proxy:true";
        return ("{key:" + (el.slotTarget || "\"default\"") + ",fn:" + fn + reverseProxy + "}")
    }

    function genChildren(
        el,
        state,
        checkSkip,
        altGenElement,
        altGenNode
    ) {
        var children = el.children;
        if (children.length) {
            var el$1 = children[0];
            // optimize single v-for
            if (children.length === 1 &&
                el$1.for &&
                el$1.tag !== 'template' &&
                el$1.tag !== 'slot'
            ) {
                var normalizationType = checkSkip
                    ? state.maybeComponent(el$1) ? ",1" : ",0"
                    : "";
                return ("" + ((altGenElement || genElement)(el$1, state)) + normalizationType)
            }
            var normalizationType$1 = checkSkip
                ? getNormalizationType(children, state.maybeComponent)
                : 0;
            var gen = altGenNode || genNode;
            return ("[" + (children.map(function (c) { return gen(c, state); }).join(',')) + "]" + (normalizationType$1 ? ("," + normalizationType$1) : ''))
        }
    }

    // determine the normalization needed for the children array.
    // 0: no normalization needed
    // 1: simple normalization needed (possible 1-level deep nested array)
    // 2: full normalization needed
    function getNormalizationType(
        children,
        maybeComponent
    ) {
        var res = 0;
        for (var i = 0; i < children.length; i++) {
            var el = children[i];
            if (el.type !== 1) {
                continue
            }
            if (needsNormalization(el) ||
                (el.ifConditions && el.ifConditions.some(function (c) { return needsNormalization(c.block); }))) {
                res = 2;
                break
            }
            if (maybeComponent(el) ||
                (el.ifConditions && el.ifConditions.some(function (c) { return maybeComponent(c.block); }))) {
                res = 1;
            }
        }
        return res
    }

    function needsNormalization(el) {
        return el.for !== undefined || el.tag === 'template' || el.tag === 'slot'
    }

    function genNode(node, state) {
        if (node.type === 1) {
            return genElement(node, state)
        } else if (node.type === 3 && node.isComment) {
            return genComment(node)
        } else {
            return genText(node)
        }
    }

    function genText(text) {
        return ("_v(" + (text.type === 2
            ? text.expression // no need for () because already wrapped in _s()
            : transformSpecialNewlines(JSON.stringify(text.text))) + ")")
    }

    function genComment(comment) {
        return ("_e(" + (JSON.stringify(comment.text)) + ")")
    }

    function genSlot(el, state) {
        var slotName = el.slotName || '"default"';
        var children = genChildren(el, state);
        var res = "_t(" + slotName + (children ? (",function(){return " + children + "}") : '');
        var attrs = el.attrs || el.dynamicAttrs
            ? genProps((el.attrs || []).concat(el.dynamicAttrs || []).map(function (attr) {
                return ({
                    // slot props are camelized
                    name: camelize(attr.name),
                    value: attr.value,
                    dynamic: attr.dynamic
                });
            }))
            : null;
        var bind$$1 = el.attrsMap['v-bind'];
        if ((attrs || bind$$1) && !children) {
            res += ",null";
        }
        if (attrs) {
            res += "," + attrs;
        }
        if (bind$$1) {
            res += (attrs ? '' : ',null') + "," + bind$$1;
        }
        return res + ')'
    }

    // componentName is el.component, take it as argument to shun flow's pessimistic refinement
    function genComponent(
        componentName,
        el,
        state
    ) {
        var children = el.inlineTemplate ? null : genChildren(el, state, true);
        return ("_c(" + componentName + "," + (genData$2(el, state)) + (children ? ("," + children) : '') + ")")
    }

    function genProps(props) {
        var staticProps = "";
        var dynamicProps = "";
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            var value = transformSpecialNewlines(prop.value);
            if (prop.dynamic) {
                dynamicProps += (prop.name) + "," + value + ",";
            } else {
                staticProps += "\"" + (prop.name) + "\":" + value + ",";
            }
        }
        staticProps = "{" + (staticProps.slice(0, -1)) + "}";
        if (dynamicProps) {
            return ("_d(" + staticProps + ",[" + (dynamicProps.slice(0, -1)) + "])")
        } else {
            return staticProps
        }
    }

    // #3895, #4268
    function transformSpecialNewlines(text) {
        return text
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029')
    }

    /*  */



    // these keywords should not appear inside expressions, but operators like
    // typeof, instanceof and in are allowed
    var prohibitedKeywordRE = new RegExp('\\b' + (
        'do,if,for,let,new,try,var,case,else,with,await,break,catch,class,const,' +
        'super,throw,while,yield,delete,export,import,return,switch,default,' +
        'extends,finally,continue,debugger,function,arguments'
    ).split(',').join('\\b|\\b') + '\\b');

    // these unary operators should not be used as property/method names
    var unaryOperatorsRE = new RegExp('\\b' + (
        'delete,typeof,void'
    ).split(',').join('\\s*\\([^\\)]*\\)|\\b') + '\\s*\\([^\\)]*\\)');

    // strip strings in expressions
    var stripStringRE = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*\$\{|\}(?:[^`\\]|\\.)*`|`(?:[^`\\]|\\.)*`/g;

    // detect problematic expressions in a template
    function detectErrors(ast, warn) {
        if (ast) {
            checkNode(ast, warn);
        }
    }

    function checkNode(node, warn) {
        if (node.type === 1) {
            for (var name in node.attrsMap) {
                if (dirRE.test(name)) {
                    var value = node.attrsMap[name];
                    if (value) {
                        var range = node.rawAttrsMap[name];
                        if (name === 'v-for') {
                            checkFor(node, ("v-for=\"" + value + "\""), warn, range);
                        } else if (name === 'v-slot' || name[0] === '#') {
                            checkFunctionParameterExpression(value, (name + "=\"" + value + "\""), warn, range);
                        } else if (onRE.test(name)) {
                            checkEvent(value, (name + "=\"" + value + "\""), warn, range);
                        } else {
                            checkExpression(value, (name + "=\"" + value + "\""), warn, range);
                        }
                    }
                }
            }
            if (node.children) {
                for (var i = 0; i < node.children.length; i++) {
                    checkNode(node.children[i], warn);
                }
            }
        } else if (node.type === 2) {
            checkExpression(node.expression, node.text, warn, node);
        }
    }

    function checkEvent(exp, text, warn, range) {
        var stripped = exp.replace(stripStringRE, '');
        var keywordMatch = stripped.match(unaryOperatorsRE);
        if (keywordMatch && stripped.charAt(keywordMatch.index - 1) !== '$') {
            warn(
                "avoid using JavaScript unary operator as property name: " +
                "\"" + (keywordMatch[0]) + "\" in expression " + (text.trim()),
                range
            );
        }
        checkExpression(exp, text, warn, range);
    }

    function checkFor(node, text, warn, range) {
        checkExpression(node.for || '', text, warn, range);
        checkIdentifier(node.alias, 'v-for alias', text, warn, range);
        checkIdentifier(node.iterator1, 'v-for iterator', text, warn, range);
        checkIdentifier(node.iterator2, 'v-for iterator', text, warn, range);
    }

    function checkIdentifier(
        ident,
        type,
        text,
        warn,
        range
    ) {
        if (typeof ident === 'string') {
            try {
                new Function(("var " + ident + "=_"));
            } catch (e) {
                warn(("invalid " + type + " \"" + ident + "\" in expression: " + (text.trim())), range);
            }
        }
    }

    function checkExpression(exp, text, warn, range) {
        try {
            new Function(("return " + exp));
        } catch (e) {
            var keywordMatch = exp.replace(stripStringRE, '').match(prohibitedKeywordRE);
            if (keywordMatch) {
                warn(
                    "avoid using JavaScript keyword as property name: " +
                    "\"" + (keywordMatch[0]) + "\"\n  Raw expression: " + (text.trim()),
                    range
                );
            } else {
                warn(
                    "invalid expression: " + (e.message) + " in\n\n" +
                    "    " + exp + "\n\n" +
                    "  Raw expression: " + (text.trim()) + "\n",
                    range
                );
            }
        }
    }

    function checkFunctionParameterExpression(exp, text, warn, range) {
        try {
            new Function(exp, '');
        } catch (e) {
            warn(
                "invalid function parameter expression: " + (e.message) + " in\n\n" +
                "    " + exp + "\n\n" +
                "  Raw expression: " + (text.trim()) + "\n",
                range
            );
        }
    }

    /*  */

    var range = 2;

    function generateCodeFrame(
        source,
        start,
        end
    ) {
        if (start === void 0) start = 0;
        if (end === void 0) end = source.length;

        var lines = source.split(/\r?\n/);
        var count = 0;
        var res = [];
        for (var i = 0; i < lines.length; i++) {
            count += lines[i].length + 1;
            if (count >= start) {
                for (var j = i - range; j <= i + range || end > count; j++) {
                    if (j < 0 || j >= lines.length) { continue }
                    res.push(("" + (j + 1) + (repeat$1(" ", 3 - String(j + 1).length)) + "|  " + (lines[j])));
                    var lineLength = lines[j].length;
                    if (j === i) {
                        // push underline
                        var pad = start - (count - lineLength) + 1;
                        var length = end > count ? lineLength - pad : end - start;
                        res.push("   |  " + repeat$1(" ", pad) + repeat$1("^", length));
                    } else if (j > i) {
                        if (end > count) {
                            var length$1 = Math.min(end - count, lineLength);
                            res.push("   |  " + repeat$1("^", length$1));
                        }
                        count += lineLength + 1;
                    }
                }
                break
            }
        }
        return res.join('\n')
    }

    function repeat$1(str, n) {
        var result = '';
        if (n > 0) {
            while (true) { // eslint-disable-line
                if (n & 1) { result += str; }
                n >>>= 1;
                if (n <= 0) { break }
                str += str;
            }
        }
        return result
    }

    /*  */



    function createFunction(code, errors) {
        try {
            return new Function(code)
        } catch (err) {
            errors.push({ err: err, code: code });
            return noop
        }
    }

    function createCompileToFunctionFn(compile) {
        var cache = Object.create(null);

        return function compileToFunctions(
            template,
            options,
            vm
        ) {
            options = extend({}, options);
            var warn$$1 = options.warn || warn;
            delete options.warn;

            /* istanbul ignore if */
            {
                // detect possible CSP restriction
                try {
                    new Function('return 1');
                } catch (e) {
                    if (e.toString().match(/unsafe-eval|CSP/)) {
                        warn$$1(
                            'It seems you are using the standalone build of Vue.js in an ' +
                            'environment with Content Security Policy that prohibits unsafe-eval. ' +
                            'The template compiler cannot work in this environment. Consider ' +
                            'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
                            'templates into render functions.'
                        );
                    }
                }
            }

            // check cache
            var key = options.delimiters
                ? String(options.delimiters) + template
                : template;
            if (cache[key]) {
                return cache[key]
            }

            // compile
            var compiled = compile(template, options);

            // check compilation errors/tips
            {
                if (compiled.errors && compiled.errors.length) {
                    if (options.outputSourceRange) {
                        compiled.errors.forEach(function (e) {
                            warn$$1(
                                "Error compiling template:\n\n" + (e.msg) + "\n\n" +
                                generateCodeFrame(template, e.start, e.end),
                                vm
                            );
                        });
                    } else {
                        warn$$1(
                            "Error compiling template:\n\n" + template + "\n\n" +
                            compiled.errors.map(function (e) { return ("- " + e); }).join('\n') + '\n',
                            vm
                        );
                    }
                }
                if (compiled.tips && compiled.tips.length) {
                    if (options.outputSourceRange) {
                        compiled.tips.forEach(function (e) { return tip(e.msg, vm); });
                    } else {
                        compiled.tips.forEach(function (msg) { return tip(msg, vm); });
                    }
                }
            }

            // turn code into functions
            var res = {};
            var fnGenErrors = [];
            res.render = createFunction(compiled.render, fnGenErrors);
            res.staticRenderFns = compiled.staticRenderFns.map(function (code) {
                return createFunction(code, fnGenErrors)
            });

            // check function generation errors.
            // this should only happen if there is a bug in the compiler itself.
            // mostly for codegen development use
            /* istanbul ignore if */
            {
                if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
                    warn$$1(
                        "Failed to generate render function:\n\n" +
                        fnGenErrors.map(function (ref) {
                            var err = ref.err;
                            var code = ref.code;

                            return ((err.toString()) + " in\n\n" + code + "\n");
                        }).join('\n'),
                        vm
                    );
                }
            }

            return (cache[key] = res)
        }
    }

    /*  */

    function createCompilerCreator(baseCompile) {
        return function createCompiler(baseOptions) {
            function compile(
                template,
                options
            ) {
                var finalOptions = Object.create(baseOptions);
                var errors = [];
                var tips = [];

                var warn = function (msg, range, tip) {
                    (tip ? tips : errors).push(msg);
                };

                if (options) {
                    if (options.outputSourceRange) {
                        // $flow-disable-line
                        var leadingSpaceLength = template.match(/^\s*/)[0].length;

                        warn = function (msg, range, tip) {
                            var data = { msg: msg };
                            if (range) {
                                if (range.start != null) {
                                    data.start = range.start + leadingSpaceLength;
                                }
                                if (range.end != null) {
                                    data.end = range.end + leadingSpaceLength;
                                }
                            }
                            (tip ? tips : errors).push(data);
                        };
                    }
                    // merge custom modules
                    if (options.modules) {
                        finalOptions.modules =
                            (baseOptions.modules || []).concat(options.modules);
                    }
                    // merge custom directives
                    if (options.directives) {
                        finalOptions.directives = extend(
                            Object.create(baseOptions.directives || null),
                            options.directives
                        );
                    }
                    // copy other options
                    for (var key in options) {
                        if (key !== 'modules' && key !== 'directives') {
                            finalOptions[key] = options[key];
                        }
                    }
                }

                finalOptions.warn = warn;

                var compiled = baseCompile(template.trim(), finalOptions);
                {
                    detectErrors(compiled.ast, warn);
                }
                compiled.errors = errors;
                compiled.tips = tips;
                return compiled
            }

            return {
                compile: compile,
                compileToFunctions: createCompileToFunctionFn(compile)
            }
        }
    }

    /*  */

    // `createCompilerCreator` allows creating compilers that use alternative
    // parser/optimizer/codegen, e.g the SSR optimizing compiler.
    // Here we just export a default compiler using the default parts.
    var createCompiler = createCompilerCreator(function baseCompile(
        template,
        options
    ) {
        var ast = parse(template.trim(), options);
        if (options.optimize !== false) {
            optimize(ast, options);
        }
        var code = generate(ast, options);
        return {
            ast: ast,
            render: code.render,
            staticRenderFns: code.staticRenderFns
        }
    });

    /*  */

    var ref$1 = createCompiler(baseOptions);
    var compile = ref$1.compile;
    var compileToFunctions = ref$1.compileToFunctions;

    /*  */

    // check whether current browser encodes a char inside attribute values
    var div;
    function getShouldDecode(href) {
        div = div || document.createElement('div');
        div.innerHTML = href ? "<a href=\"\n\"/>" : "<div a=\"\n\"/>";
        return div.innerHTML.indexOf('&#10;') > 0
    }

    // #3663: IE encodes newlines inside attribute values while other browsers don't
    var shouldDecodeNewlines = inBrowser ? getShouldDecode(false) : false;
    // #6828: chrome encodes content in a[href]
    var shouldDecodeNewlinesForHref = inBrowser ? getShouldDecode(true) : false;

    /*  */

    var idToTemplate = cached(function (id) {
        var el = query(id);
        return el && el.innerHTML
    });

    var mount = Vue.prototype.$mount;
    Vue.prototype.$mount = function (
        el,
        hydrating
    ) {
        el = el && query(el);

        /* istanbul ignore if */
        if (el === document.body || el === document.documentElement) {
            warn(
                "Do not mount Vue to <html> or <body> - mount to normal elements instead."
            );
            return this
        }

        var options = this.$options;
        // resolve template/el and convert to render function
        if (!options.render) {
            var template = options.template;
            if (template) {
                if (typeof template === 'string') {
                    if (template.charAt(0) === '#') {
                        template = idToTemplate(template);
                        /* istanbul ignore if */
                        if (!template) {
                            warn(
                                ("Template element not found or is empty: " + (options.template)),
                                this
                            );
                        }
                    }
                } else if (template.nodeType) {
                    template = template.innerHTML;
                } else {
                    {
                        warn('invalid template option:' + template, this);
                    }
                    return this
                }
            } else if (el) {
                template = getOuterHTML(el);
            }
            if (template) {
                /* istanbul ignore if */
                if (config.performance && mark) {
                    mark('compile');
                }

                var ref = compileToFunctions(template, {
                    outputSourceRange: "development" !== 'production',
                    shouldDecodeNewlines: shouldDecodeNewlines,
                    shouldDecodeNewlinesForHref: shouldDecodeNewlinesForHref,
                    delimiters: options.delimiters,
                    comments: options.comments
                }, this);
                var render = ref.render;
                var staticRenderFns = ref.staticRenderFns;
                options.render = render;
                options.staticRenderFns = staticRenderFns;

                /* istanbul ignore if */
                if (config.performance && mark) {
                    mark('compile end');
                    measure(("vue " + (this._name) + " compile"), 'compile', 'compile end');
                }
            }
        }
        return mount.call(this, el, hydrating)
    };

    /**
     * Get outerHTML of elements, taking care
     * of SVG elements in IE as well.
     */
    function getOuterHTML(el) {
        if (el.outerHTML) {
            return el.outerHTML
        } else {
            var container = document.createElement('div');
            container.appendChild(el.cloneNode(true));
            return container.innerHTML
        }
    }

    Vue.compile = compileToFunctions;

    return Vue;

}));

// https://d3js.org v7.8.5 Copyright 2010-2023 Mike Bostock
!function (t, n) { "object" == typeof exports && "undefined" != typeof module ? n(exports) : "function" == typeof define && define.amd ? define(["exports"], n) : n((t = "undefined" != typeof globalThis ? globalThis : t || self).d3 = t.d3 || {}) }(this, (function (t) { "use strict"; function n(t, n) { return null == t || null == n ? NaN : t < n ? -1 : t > n ? 1 : t >= n ? 0 : NaN } function e(t, n) { return null == t || null == n ? NaN : n < t ? -1 : n > t ? 1 : n >= t ? 0 : NaN } function r(t) { let r, o, a; function u(t, n, e = 0, i = t.length) { if (e < i) { if (0 !== r(n, n)) return i; do { const r = e + i >>> 1; o(t[r], n) < 0 ? e = r + 1 : i = r } while (e < i) } return e } return 2 !== t.length ? (r = n, o = (e, r) => n(t(e), r), a = (n, e) => t(n) - e) : (r = t === n || t === e ? t : i, o = t, a = t), { left: u, center: function (t, n, e = 0, r = t.length) { const i = u(t, n, e, r - 1); return i > e && a(t[i - 1], n) > -a(t[i], n) ? i - 1 : i }, right: function (t, n, e = 0, i = t.length) { if (e < i) { if (0 !== r(n, n)) return i; do { const r = e + i >>> 1; o(t[r], n) <= 0 ? e = r + 1 : i = r } while (e < i) } return e } } } function i() { return 0 } function o(t) { return null === t ? NaN : +t } const a = r(n), u = a.right, c = a.left, f = r(o).center; var s = u; const l = d(y), h = d((function (t) { const n = y(t); return (t, e, r, i, o) => { n(t, e, (r <<= 2) + 0, (i <<= 2) + 0, o <<= 2), n(t, e, r + 1, i + 1, o), n(t, e, r + 2, i + 2, o), n(t, e, r + 3, i + 3, o) } })); function d(t) { return function (n, e, r = e) { if (!((e = +e) >= 0)) throw new RangeError("invalid rx"); if (!((r = +r) >= 0)) throw new RangeError("invalid ry"); let { data: i, width: o, height: a } = n; if (!((o = Math.floor(o)) >= 0)) throw new RangeError("invalid width"); if (!((a = Math.floor(void 0 !== a ? a : i.length / o)) >= 0)) throw new RangeError("invalid height"); if (!o || !a || !e && !r) return n; const u = e && t(e), c = r && t(r), f = i.slice(); return u && c ? (p(u, f, i, o, a), p(u, i, f, o, a), p(u, f, i, o, a), g(c, i, f, o, a), g(c, f, i, o, a), g(c, i, f, o, a)) : u ? (p(u, i, f, o, a), p(u, f, i, o, a), p(u, i, f, o, a)) : c && (g(c, i, f, o, a), g(c, f, i, o, a), g(c, i, f, o, a)), n } } function p(t, n, e, r, i) { for (let o = 0, a = r * i; o < a;)t(n, e, o, o += r, 1) } function g(t, n, e, r, i) { for (let o = 0, a = r * i; o < r; ++o)t(n, e, o, o + a, r) } function y(t) { const n = Math.floor(t); if (n === t) return function (t) { const n = 2 * t + 1; return (e, r, i, o, a) => { if (!((o -= a) >= i)) return; let u = t * r[i]; const c = a * t; for (let t = i, n = i + c; t < n; t += a)u += r[Math.min(o, t)]; for (let t = i, f = o; t <= f; t += a)u += r[Math.min(o, t + c)], e[t] = u / n, u -= r[Math.max(i, t - c)] } }(t); const e = t - n, r = 2 * t + 1; return (t, i, o, a, u) => { if (!((a -= u) >= o)) return; let c = n * i[o]; const f = u * n, s = f + u; for (let t = o, n = o + f; t < n; t += u)c += i[Math.min(a, t)]; for (let n = o, l = a; n <= l; n += u)c += i[Math.min(a, n + f)], t[n] = (c + e * (i[Math.max(o, n - s)] + i[Math.min(a, n + s)])) / r, c -= i[Math.max(o, n - f)] } } function v(t, n) { let e = 0; if (void 0 === n) for (let n of t) null != n && (n = +n) >= n && ++e; else { let r = -1; for (let i of t) null != (i = n(i, ++r, t)) && (i = +i) >= i && ++e } return e } function _(t) { return 0 | t.length } function b(t) { return !(t > 0) } function m(t) { return "object" != typeof t || "length" in t ? t : Array.from(t) } function x(t, n) { let e, r = 0, i = 0, o = 0; if (void 0 === n) for (let n of t) null != n && (n = +n) >= n && (e = n - i, i += e / ++r, o += e * (n - i)); else { let a = -1; for (let u of t) null != (u = n(u, ++a, t)) && (u = +u) >= u && (e = u - i, i += e / ++r, o += e * (u - i)) } if (r > 1) return o / (r - 1) } function w(t, n) { const e = x(t, n); return e ? Math.sqrt(e) : e } function M(t, n) { let e, r; if (void 0 === n) for (const n of t) null != n && (void 0 === e ? n >= n && (e = r = n) : (e > n && (e = n), r < n && (r = n))); else { let i = -1; for (let o of t) null != (o = n(o, ++i, t)) && (void 0 === e ? o >= o && (e = r = o) : (e > o && (e = o), r < o && (r = o))) } return [e, r] } class T { constructor() { this._partials = new Float64Array(32), this._n = 0 } add(t) { const n = this._partials; let e = 0; for (let r = 0; r < this._n && r < 32; r++) { const i = n[r], o = t + i, a = Math.abs(t) < Math.abs(i) ? t - (o - i) : i - (o - t); a && (n[e++] = a), t = o } return n[e] = t, this._n = e + 1, this } valueOf() { const t = this._partials; let n, e, r, i = this._n, o = 0; if (i > 0) { for (o = t[--i]; i > 0 && (n = o, e = t[--i], o = n + e, r = e - (o - n), !r);); i > 0 && (r < 0 && t[i - 1] < 0 || r > 0 && t[i - 1] > 0) && (e = 2 * r, n = o + e, e == n - o && (o = n)) } return o } } class InternMap extends Map { constructor(t, n = N) { if (super(), Object.defineProperties(this, { _intern: { value: new Map }, _key: { value: n } }), null != t) for (const [n, e] of t) this.set(n, e) } get(t) { return super.get(A(this, t)) } has(t) { return super.has(A(this, t)) } set(t, n) { return super.set(S(this, t), n) } delete(t) { return super.delete(E(this, t)) } } class InternSet extends Set { constructor(t, n = N) { if (super(), Object.defineProperties(this, { _intern: { value: new Map }, _key: { value: n } }), null != t) for (const n of t) this.add(n) } has(t) { return super.has(A(this, t)) } add(t) { return super.add(S(this, t)) } delete(t) { return super.delete(E(this, t)) } } function A({ _intern: t, _key: n }, e) { const r = n(e); return t.has(r) ? t.get(r) : e } function S({ _intern: t, _key: n }, e) { const r = n(e); return t.has(r) ? t.get(r) : (t.set(r, e), e) } function E({ _intern: t, _key: n }, e) { const r = n(e); return t.has(r) && (e = t.get(r), t.delete(r)), e } function N(t) { return null !== t && "object" == typeof t ? t.valueOf() : t } function k(t) { return t } function C(t, ...n) { return F(t, k, k, n) } function P(t, ...n) { return F(t, Array.from, k, n) } function z(t, n) { for (let e = 1, r = n.length; e < r; ++e)t = t.flatMap((t => t.pop().map((([n, e]) => [...t, n, e])))); return t } function $(t, n, ...e) { return F(t, k, n, e) } function D(t, n, ...e) { return F(t, Array.from, n, e) } function R(t) { if (1 !== t.length) throw new Error("duplicate key"); return t[0] } function F(t, n, e, r) { return function t(i, o) { if (o >= r.length) return e(i); const a = new InternMap, u = r[o++]; let c = -1; for (const t of i) { const n = u(t, ++c, i), e = a.get(n); e ? e.push(t) : a.set(n, [t]) } for (const [n, e] of a) a.set(n, t(e, o)); return n(a) }(t, 0) } function q(t, n) { return Array.from(n, (n => t[n])) } function U(t, ...n) { if ("function" != typeof t[Symbol.iterator]) throw new TypeError("values is not iterable"); t = Array.from(t); let [e] = n; if (e && 2 !== e.length || n.length > 1) { const r = Uint32Array.from(t, ((t, n) => n)); return n.length > 1 ? (n = n.map((n => t.map(n))), r.sort(((t, e) => { for (const r of n) { const n = O(r[t], r[e]); if (n) return n } }))) : (e = t.map(e), r.sort(((t, n) => O(e[t], e[n])))), q(t, r) } return t.sort(I(e)) } function I(t = n) { if (t === n) return O; if ("function" != typeof t) throw new TypeError("compare is not a function"); return (n, e) => { const r = t(n, e); return r || 0 === r ? r : (0 === t(e, e)) - (0 === t(n, n)) } } function O(t, n) { return (null == t || !(t >= t)) - (null == n || !(n >= n)) || (t < n ? -1 : t > n ? 1 : 0) } var B = Array.prototype.slice; function Y(t) { return () => t } const L = Math.sqrt(50), j = Math.sqrt(10), H = Math.sqrt(2); function X(t, n, e) { const r = (n - t) / Math.max(0, e), i = Math.floor(Math.log10(r)), o = r / Math.pow(10, i), a = o >= L ? 10 : o >= j ? 5 : o >= H ? 2 : 1; let u, c, f; return i < 0 ? (f = Math.pow(10, -i) / a, u = Math.round(t * f), c = Math.round(n * f), u / f < t && ++u, c / f > n && --c, f = -f) : (f = Math.pow(10, i) * a, u = Math.round(t / f), c = Math.round(n / f), u * f < t && ++u, c * f > n && --c), c < u && .5 <= e && e < 2 ? X(t, n, 2 * e) : [u, c, f] } function G(t, n, e) { if (!((e = +e) > 0)) return []; if ((t = +t) === (n = +n)) return [t]; const r = n < t, [i, o, a] = r ? X(n, t, e) : X(t, n, e); if (!(o >= i)) return []; const u = o - i + 1, c = new Array(u); if (r) if (a < 0) for (let t = 0; t < u; ++t)c[t] = (o - t) / -a; else for (let t = 0; t < u; ++t)c[t] = (o - t) * a; else if (a < 0) for (let t = 0; t < u; ++t)c[t] = (i + t) / -a; else for (let t = 0; t < u; ++t)c[t] = (i + t) * a; return c } function V(t, n, e) { return X(t = +t, n = +n, e = +e)[2] } function W(t, n, e) { e = +e; const r = (n = +n) < (t = +t), i = r ? V(n, t, e) : V(t, n, e); return (r ? -1 : 1) * (i < 0 ? 1 / -i : i) } function Z(t, n, e) { let r; for (; ;) { const i = V(t, n, e); if (i === r || 0 === i || !isFinite(i)) return [t, n]; i > 0 ? (t = Math.floor(t / i) * i, n = Math.ceil(n / i) * i) : i < 0 && (t = Math.ceil(t * i) / i, n = Math.floor(n * i) / i), r = i } } function K(t) { return Math.max(1, Math.ceil(Math.log(v(t)) / Math.LN2) + 1) } function Q() { var t = k, n = M, e = K; function r(r) { Array.isArray(r) || (r = Array.from(r)); var i, o, a, u = r.length, c = new Array(u); for (i = 0; i < u; ++i)c[i] = t(r[i], i, r); var f = n(c), l = f[0], h = f[1], d = e(c, l, h); if (!Array.isArray(d)) { const t = h, e = +d; if (n === M && ([l, h] = Z(l, h, e)), (d = G(l, h, e))[0] <= l && (a = V(l, h, e)), d[d.length - 1] >= h) if (t >= h && n === M) { const t = V(l, h, e); isFinite(t) && (t > 0 ? h = (Math.floor(h / t) + 1) * t : t < 0 && (h = (Math.ceil(h * -t) + 1) / -t)) } else d.pop() } for (var p = d.length, g = 0, y = p; d[g] <= l;)++g; for (; d[y - 1] > h;)--y; (g || y < p) && (d = d.slice(g, y), p = y - g); var v, _ = new Array(p + 1); for (i = 0; i <= p; ++i)(v = _[i] = []).x0 = i > 0 ? d[i - 1] : l, v.x1 = i < p ? d[i] : h; if (isFinite(a)) { if (a > 0) for (i = 0; i < u; ++i)null != (o = c[i]) && l <= o && o <= h && _[Math.min(p, Math.floor((o - l) / a))].push(r[i]); else if (a < 0) for (i = 0; i < u; ++i)if (null != (o = c[i]) && l <= o && o <= h) { const t = Math.floor((l - o) * a); _[Math.min(p, t + (d[t] <= o))].push(r[i]) } } else for (i = 0; i < u; ++i)null != (o = c[i]) && l <= o && o <= h && _[s(d, o, 0, p)].push(r[i]); return _ } return r.value = function (n) { return arguments.length ? (t = "function" == typeof n ? n : Y(n), r) : t }, r.domain = function (t) { return arguments.length ? (n = "function" == typeof t ? t : Y([t[0], t[1]]), r) : n }, r.thresholds = function (t) { return arguments.length ? (e = "function" == typeof t ? t : Y(Array.isArray(t) ? B.call(t) : t), r) : e }, r } function J(t, n) { let e; if (void 0 === n) for (const n of t) null != n && (e < n || void 0 === e && n >= n) && (e = n); else { let r = -1; for (let i of t) null != (i = n(i, ++r, t)) && (e < i || void 0 === e && i >= i) && (e = i) } return e } function tt(t, n) { let e, r = -1, i = -1; if (void 0 === n) for (const n of t) ++i, null != n && (e < n || void 0 === e && n >= n) && (e = n, r = i); else for (let o of t) null != (o = n(o, ++i, t)) && (e < o || void 0 === e && o >= o) && (e = o, r = i); return r } function nt(t, n) { let e; if (void 0 === n) for (const n of t) null != n && (e > n || void 0 === e && n >= n) && (e = n); else { let r = -1; for (let i of t) null != (i = n(i, ++r, t)) && (e > i || void 0 === e && i >= i) && (e = i) } return e } function et(t, n) { let e, r = -1, i = -1; if (void 0 === n) for (const n of t) ++i, null != n && (e > n || void 0 === e && n >= n) && (e = n, r = i); else for (let o of t) null != (o = n(o, ++i, t)) && (e > o || void 0 === e && o >= o) && (e = o, r = i); return r } function rt(t, n, e = 0, r = 1 / 0, i) { if (n = Math.floor(n), e = Math.floor(Math.max(0, e)), r = Math.floor(Math.min(t.length - 1, r)), !(e <= n && n <= r)) return t; for (i = void 0 === i ? O : I(i); r > e;) { if (r - e > 600) { const o = r - e + 1, a = n - e + 1, u = Math.log(o), c = .5 * Math.exp(2 * u / 3), f = .5 * Math.sqrt(u * c * (o - c) / o) * (a - o / 2 < 0 ? -1 : 1); rt(t, n, Math.max(e, Math.floor(n - a * c / o + f)), Math.min(r, Math.floor(n + (o - a) * c / o + f)), i) } const o = t[n]; let a = e, u = r; for (it(t, e, n), i(t[r], o) > 0 && it(t, e, r); a < u;) { for (it(t, a, u), ++a, --u; i(t[a], o) < 0;)++a; for (; i(t[u], o) > 0;)--u } 0 === i(t[e], o) ? it(t, e, u) : (++u, it(t, u, r)), u <= n && (e = u + 1), n <= u && (r = u - 1) } return t } function it(t, n, e) { const r = t[n]; t[n] = t[e], t[e] = r } function ot(t, e = n) { let r, i = !1; if (1 === e.length) { let o; for (const a of t) { const t = e(a); (i ? n(t, o) > 0 : 0 === n(t, t)) && (r = a, o = t, i = !0) } } else for (const n of t) (i ? e(n, r) > 0 : 0 === e(n, n)) && (r = n, i = !0); return r } function at(t, n, e) { if (t = Float64Array.from(function* (t, n) { if (void 0 === n) for (let n of t) null != n && (n = +n) >= n && (yield n); else { let e = -1; for (let r of t) null != (r = n(r, ++e, t)) && (r = +r) >= r && (yield r) } }(t, e)), (r = t.length) && !isNaN(n = +n)) { if (n <= 0 || r < 2) return nt(t); if (n >= 1) return J(t); var r, i = (r - 1) * n, o = Math.floor(i), a = J(rt(t, o).subarray(0, o + 1)); return a + (nt(t.subarray(o + 1)) - a) * (i - o) } } function ut(t, n, e = o) { if ((r = t.length) && !isNaN(n = +n)) { if (n <= 0 || r < 2) return +e(t[0], 0, t); if (n >= 1) return +e(t[r - 1], r - 1, t); var r, i = (r - 1) * n, a = Math.floor(i), u = +e(t[a], a, t); return u + (+e(t[a + 1], a + 1, t) - u) * (i - a) } } function ct(t, n, e = o) { if (!isNaN(n = +n)) { if (r = Float64Array.from(t, ((n, r) => o(e(t[r], r, t)))), n <= 0) return et(r); if (n >= 1) return tt(r); var r, i = Uint32Array.from(t, ((t, n) => n)), a = r.length - 1, u = Math.floor(a * n); return rt(i, u, 0, a, ((t, n) => O(r[t], r[n]))), (u = ot(i.subarray(0, u + 1), (t => r[t]))) >= 0 ? u : -1 } } function ft(t) { return Array.from(function* (t) { for (const n of t) yield* n }(t)) } function st(t, n) { return [t, n] } function lt(t, n, e) { t = +t, n = +n, e = (i = arguments.length) < 2 ? (n = t, t = 0, 1) : i < 3 ? 1 : +e; for (var r = -1, i = 0 | Math.max(0, Math.ceil((n - t) / e)), o = new Array(i); ++r < i;)o[r] = t + r * e; return o } function ht(t, e = n) { if (1 === e.length) return et(t, e); let r, i = -1, o = -1; for (const n of t) ++o, (i < 0 ? 0 === e(n, n) : e(n, r) < 0) && (r = n, i = o); return i } var dt = pt(Math.random); function pt(t) { return function (n, e = 0, r = n.length) { let i = r - (e = +e); for (; i;) { const r = t() * i-- | 0, o = n[i + e]; n[i + e] = n[r + e], n[r + e] = o } return n } } function gt(t) { if (!(i = t.length)) return []; for (var n = -1, e = nt(t, yt), r = new Array(e); ++n < e;)for (var i, o = -1, a = r[n] = new Array(i); ++o < i;)a[o] = t[o][n]; return r } function yt(t) { return t.length } function vt(t) { return t instanceof InternSet ? t : new InternSet(t) } function _t(t, n) { const e = t[Symbol.iterator](), r = new Set; for (const t of n) { const n = bt(t); if (r.has(n)) continue; let i, o; for (; ({ value: i, done: o } = e.next());) { if (o) return !1; const t = bt(i); if (r.add(t), Object.is(n, t)) break } } return !0 } function bt(t) { return null !== t && "object" == typeof t ? t.valueOf() : t } function mt(t) { return t } var xt = 1, wt = 2, Mt = 3, Tt = 4, At = 1e-6; function St(t) { return "translate(" + t + ",0)" } function Et(t) { return "translate(0," + t + ")" } function Nt(t) { return n => +t(n) } function kt(t, n) { return n = Math.max(0, t.bandwidth() - 2 * n) / 2, t.round() && (n = Math.round(n)), e => +t(e) + n } function Ct() { return !this.__axis } function Pt(t, n) { var e = [], r = null, i = null, o = 6, a = 6, u = 3, c = "undefined" != typeof window && window.devicePixelRatio > 1 ? 0 : .5, f = t === xt || t === Tt ? -1 : 1, s = t === Tt || t === wt ? "x" : "y", l = t === xt || t === Mt ? St : Et; function h(h) { var d = null == r ? n.ticks ? n.ticks.apply(n, e) : n.domain() : r, p = null == i ? n.tickFormat ? n.tickFormat.apply(n, e) : mt : i, g = Math.max(o, 0) + u, y = n.range(), v = +y[0] + c, _ = +y[y.length - 1] + c, b = (n.bandwidth ? kt : Nt)(n.copy(), c), m = h.selection ? h.selection() : h, x = m.selectAll(".domain").data([null]), w = m.selectAll(".tick").data(d, n).order(), M = w.exit(), T = w.enter().append("g").attr("class", "tick"), A = w.select("line"), S = w.select("text"); x = x.merge(x.enter().insert("path", ".tick").attr("class", "domain").attr("stroke", "currentColor")), w = w.merge(T), A = A.merge(T.append("line").attr("stroke", "currentColor").attr(s + "2", f * o)), S = S.merge(T.append("text").attr("fill", "currentColor").attr(s, f * g).attr("dy", t === xt ? "0em" : t === Mt ? "0.71em" : "0.32em")), h !== m && (x = x.transition(h), w = w.transition(h), A = A.transition(h), S = S.transition(h), M = M.transition(h).attr("opacity", At).attr("transform", (function (t) { return isFinite(t = b(t)) ? l(t + c) : this.getAttribute("transform") })), T.attr("opacity", At).attr("transform", (function (t) { var n = this.parentNode.__axis; return l((n && isFinite(n = n(t)) ? n : b(t)) + c) }))), M.remove(), x.attr("d", t === Tt || t === wt ? a ? "M" + f * a + "," + v + "H" + c + "V" + _ + "H" + f * a : "M" + c + "," + v + "V" + _ : a ? "M" + v + "," + f * a + "V" + c + "H" + _ + "V" + f * a : "M" + v + "," + c + "H" + _), w.attr("opacity", 1).attr("transform", (function (t) { return l(b(t) + c) })), A.attr(s + "2", f * o), S.attr(s, f * g).text(p), m.filter(Ct).attr("fill", "none").attr("font-size", 10).attr("font-family", "sans-serif").attr("text-anchor", t === wt ? "start" : t === Tt ? "end" : "middle"), m.each((function () { this.__axis = b })) } return h.scale = function (t) { return arguments.length ? (n = t, h) : n }, h.ticks = function () { return e = Array.from(arguments), h }, h.tickArguments = function (t) { return arguments.length ? (e = null == t ? [] : Array.from(t), h) : e.slice() }, h.tickValues = function (t) { return arguments.length ? (r = null == t ? null : Array.from(t), h) : r && r.slice() }, h.tickFormat = function (t) { return arguments.length ? (i = t, h) : i }, h.tickSize = function (t) { return arguments.length ? (o = a = +t, h) : o }, h.tickSizeInner = function (t) { return arguments.length ? (o = +t, h) : o }, h.tickSizeOuter = function (t) { return arguments.length ? (a = +t, h) : a }, h.tickPadding = function (t) { return arguments.length ? (u = +t, h) : u }, h.offset = function (t) { return arguments.length ? (c = +t, h) : c }, h } var zt = { value: () => { } }; function $t() { for (var t, n = 0, e = arguments.length, r = {}; n < e; ++n) { if (!(t = arguments[n] + "") || t in r || /[\s.]/.test(t)) throw new Error("illegal type: " + t); r[t] = [] } return new Dt(r) } function Dt(t) { this._ = t } function Rt(t, n) { for (var e, r = 0, i = t.length; r < i; ++r)if ((e = t[r]).name === n) return e.value } function Ft(t, n, e) { for (var r = 0, i = t.length; r < i; ++r)if (t[r].name === n) { t[r] = zt, t = t.slice(0, r).concat(t.slice(r + 1)); break } return null != e && t.push({ name: n, value: e }), t } Dt.prototype = $t.prototype = { constructor: Dt, on: function (t, n) { var e, r, i = this._, o = (r = i, (t + "").trim().split(/^|\s+/).map((function (t) { var n = "", e = t.indexOf("."); if (e >= 0 && (n = t.slice(e + 1), t = t.slice(0, e)), t && !r.hasOwnProperty(t)) throw new Error("unknown type: " + t); return { type: t, name: n } }))), a = -1, u = o.length; if (!(arguments.length < 2)) { if (null != n && "function" != typeof n) throw new Error("invalid callback: " + n); for (; ++a < u;)if (e = (t = o[a]).type) i[e] = Ft(i[e], t.name, n); else if (null == n) for (e in i) i[e] = Ft(i[e], t.name, null); return this } for (; ++a < u;)if ((e = (t = o[a]).type) && (e = Rt(i[e], t.name))) return e }, copy: function () { var t = {}, n = this._; for (var e in n) t[e] = n[e].slice(); return new Dt(t) }, call: function (t, n) { if ((e = arguments.length - 2) > 0) for (var e, r, i = new Array(e), o = 0; o < e; ++o)i[o] = arguments[o + 2]; if (!this._.hasOwnProperty(t)) throw new Error("unknown type: " + t); for (o = 0, e = (r = this._[t]).length; o < e; ++o)r[o].value.apply(n, i) }, apply: function (t, n, e) { if (!this._.hasOwnProperty(t)) throw new Error("unknown type: " + t); for (var r = this._[t], i = 0, o = r.length; i < o; ++i)r[i].value.apply(n, e) } }; var qt = "http://www.w3.org/1999/xhtml", Ut = { svg: "http://www.w3.org/2000/svg", xhtml: qt, xlink: "http://www.w3.org/1999/xlink", xml: "http://www.w3.org/XML/1998/namespace", xmlns: "http://www.w3.org/2000/xmlns/" }; function It(t) { var n = t += "", e = n.indexOf(":"); return e >= 0 && "xmlns" !== (n = t.slice(0, e)) && (t = t.slice(e + 1)), Ut.hasOwnProperty(n) ? { space: Ut[n], local: t } : t } function Ot(t) { return function () { var n = this.ownerDocument, e = this.namespaceURI; return e === qt && n.documentElement.namespaceURI === qt ? n.createElement(t) : n.createElementNS(e, t) } } function Bt(t) { return function () { return this.ownerDocument.createElementNS(t.space, t.local) } } function Yt(t) { var n = It(t); return (n.local ? Bt : Ot)(n) } function Lt() { } function jt(t) { return null == t ? Lt : function () { return this.querySelector(t) } } function Ht(t) { return null == t ? [] : Array.isArray(t) ? t : Array.from(t) } function Xt() { return [] } function Gt(t) { return null == t ? Xt : function () { return this.querySelectorAll(t) } } function Vt(t) { return function () { return this.matches(t) } } function Wt(t) { return function (n) { return n.matches(t) } } var Zt = Array.prototype.find; function Kt() { return this.firstElementChild } var Qt = Array.prototype.filter; function Jt() { return Array.from(this.children) } function tn(t) { return new Array(t.length) } function nn(t, n) { this.ownerDocument = t.ownerDocument, this.namespaceURI = t.namespaceURI, this._next = null, this._parent = t, this.__data__ = n } function en(t, n, e, r, i, o) { for (var a, u = 0, c = n.length, f = o.length; u < f; ++u)(a = n[u]) ? (a.__data__ = o[u], r[u] = a) : e[u] = new nn(t, o[u]); for (; u < c; ++u)(a = n[u]) && (i[u] = a) } function rn(t, n, e, r, i, o, a) { var u, c, f, s = new Map, l = n.length, h = o.length, d = new Array(l); for (u = 0; u < l; ++u)(c = n[u]) && (d[u] = f = a.call(c, c.__data__, u, n) + "", s.has(f) ? i[u] = c : s.set(f, c)); for (u = 0; u < h; ++u)f = a.call(t, o[u], u, o) + "", (c = s.get(f)) ? (r[u] = c, c.__data__ = o[u], s.delete(f)) : e[u] = new nn(t, o[u]); for (u = 0; u < l; ++u)(c = n[u]) && s.get(d[u]) === c && (i[u] = c) } function on(t) { return t.__data__ } function an(t) { return "object" == typeof t && "length" in t ? t : Array.from(t) } function un(t, n) { return t < n ? -1 : t > n ? 1 : t >= n ? 0 : NaN } function cn(t) { return function () { this.removeAttribute(t) } } function fn(t) { return function () { this.removeAttributeNS(t.space, t.local) } } function sn(t, n) { return function () { this.setAttribute(t, n) } } function ln(t, n) { return function () { this.setAttributeNS(t.space, t.local, n) } } function hn(t, n) { return function () { var e = n.apply(this, arguments); null == e ? this.removeAttribute(t) : this.setAttribute(t, e) } } function dn(t, n) { return function () { var e = n.apply(this, arguments); null == e ? this.removeAttributeNS(t.space, t.local) : this.setAttributeNS(t.space, t.local, e) } } function pn(t) { return t.ownerDocument && t.ownerDocument.defaultView || t.document && t || t.defaultView } function gn(t) { return function () { this.style.removeProperty(t) } } function yn(t, n, e) { return function () { this.style.setProperty(t, n, e) } } function vn(t, n, e) { return function () { var r = n.apply(this, arguments); null == r ? this.style.removeProperty(t) : this.style.setProperty(t, r, e) } } function _n(t, n) { return t.style.getPropertyValue(n) || pn(t).getComputedStyle(t, null).getPropertyValue(n) } function bn(t) { return function () { delete this[t] } } function mn(t, n) { return function () { this[t] = n } } function xn(t, n) { return function () { var e = n.apply(this, arguments); null == e ? delete this[t] : this[t] = e } } function wn(t) { return t.trim().split(/^|\s+/) } function Mn(t) { return t.classList || new Tn(t) } function Tn(t) { this._node = t, this._names = wn(t.getAttribute("class") || "") } function An(t, n) { for (var e = Mn(t), r = -1, i = n.length; ++r < i;)e.add(n[r]) } function Sn(t, n) { for (var e = Mn(t), r = -1, i = n.length; ++r < i;)e.remove(n[r]) } function En(t) { return function () { An(this, t) } } function Nn(t) { return function () { Sn(this, t) } } function kn(t, n) { return function () { (n.apply(this, arguments) ? An : Sn)(this, t) } } function Cn() { this.textContent = "" } function Pn(t) { return function () { this.textContent = t } } function zn(t) { return function () { var n = t.apply(this, arguments); this.textContent = null == n ? "" : n } } function $n() { this.innerHTML = "" } function Dn(t) { return function () { this.innerHTML = t } } function Rn(t) { return function () { var n = t.apply(this, arguments); this.innerHTML = null == n ? "" : n } } function Fn() { this.nextSibling && this.parentNode.appendChild(this) } function qn() { this.previousSibling && this.parentNode.insertBefore(this, this.parentNode.firstChild) } function Un() { return null } function In() { var t = this.parentNode; t && t.removeChild(this) } function On() { var t = this.cloneNode(!1), n = this.parentNode; return n ? n.insertBefore(t, this.nextSibling) : t } function Bn() { var t = this.cloneNode(!0), n = this.parentNode; return n ? n.insertBefore(t, this.nextSibling) : t } function Yn(t) { return function () { var n = this.__on; if (n) { for (var e, r = 0, i = -1, o = n.length; r < o; ++r)e = n[r], t.type && e.type !== t.type || e.name !== t.name ? n[++i] = e : this.removeEventListener(e.type, e.listener, e.options); ++i ? n.length = i : delete this.__on } } } function Ln(t, n, e) { return function () { var r, i = this.__on, o = function (t) { return function (n) { t.call(this, n, this.__data__) } }(n); if (i) for (var a = 0, u = i.length; a < u; ++a)if ((r = i[a]).type === t.type && r.name === t.name) return this.removeEventListener(r.type, r.listener, r.options), this.addEventListener(r.type, r.listener = o, r.options = e), void (r.value = n); this.addEventListener(t.type, o, e), r = { type: t.type, name: t.name, value: n, listener: o, options: e }, i ? i.push(r) : this.__on = [r] } } function jn(t, n, e) { var r = pn(t), i = r.CustomEvent; "function" == typeof i ? i = new i(n, e) : (i = r.document.createEvent("Event"), e ? (i.initEvent(n, e.bubbles, e.cancelable), i.detail = e.detail) : i.initEvent(n, !1, !1)), t.dispatchEvent(i) } function Hn(t, n) { return function () { return jn(this, t, n) } } function Xn(t, n) { return function () { return jn(this, t, n.apply(this, arguments)) } } nn.prototype = { constructor: nn, appendChild: function (t) { return this._parent.insertBefore(t, this._next) }, insertBefore: function (t, n) { return this._parent.insertBefore(t, n) }, querySelector: function (t) { return this._parent.querySelector(t) }, querySelectorAll: function (t) { return this._parent.querySelectorAll(t) } }, Tn.prototype = { add: function (t) { this._names.indexOf(t) < 0 && (this._names.push(t), this._node.setAttribute("class", this._names.join(" "))) }, remove: function (t) { var n = this._names.indexOf(t); n >= 0 && (this._names.splice(n, 1), this._node.setAttribute("class", this._names.join(" "))) }, contains: function (t) { return this._names.indexOf(t) >= 0 } }; var Gn = [null]; function Vn(t, n) { this._groups = t, this._parents = n } function Wn() { return new Vn([[document.documentElement]], Gn) } function Zn(t) { return "string" == typeof t ? new Vn([[document.querySelector(t)]], [document.documentElement]) : new Vn([[t]], Gn) } Vn.prototype = Wn.prototype = { constructor: Vn, select: function (t) { "function" != typeof t && (t = jt(t)); for (var n = this._groups, e = n.length, r = new Array(e), i = 0; i < e; ++i)for (var o, a, u = n[i], c = u.length, f = r[i] = new Array(c), s = 0; s < c; ++s)(o = u[s]) && (a = t.call(o, o.__data__, s, u)) && ("__data__" in o && (a.__data__ = o.__data__), f[s] = a); return new Vn(r, this._parents) }, selectAll: function (t) { t = "function" == typeof t ? function (t) { return function () { return Ht(t.apply(this, arguments)) } }(t) : Gt(t); for (var n = this._groups, e = n.length, r = [], i = [], o = 0; o < e; ++o)for (var a, u = n[o], c = u.length, f = 0; f < c; ++f)(a = u[f]) && (r.push(t.call(a, a.__data__, f, u)), i.push(a)); return new Vn(r, i) }, selectChild: function (t) { return this.select(null == t ? Kt : function (t) { return function () { return Zt.call(this.children, t) } }("function" == typeof t ? t : Wt(t))) }, selectChildren: function (t) { return this.selectAll(null == t ? Jt : function (t) { return function () { return Qt.call(this.children, t) } }("function" == typeof t ? t : Wt(t))) }, filter: function (t) { "function" != typeof t && (t = Vt(t)); for (var n = this._groups, e = n.length, r = new Array(e), i = 0; i < e; ++i)for (var o, a = n[i], u = a.length, c = r[i] = [], f = 0; f < u; ++f)(o = a[f]) && t.call(o, o.__data__, f, a) && c.push(o); return new Vn(r, this._parents) }, data: function (t, n) { if (!arguments.length) return Array.from(this, on); var e = n ? rn : en, r = this._parents, i = this._groups; "function" != typeof t && (t = function (t) { return function () { return t } }(t)); for (var o = i.length, a = new Array(o), u = new Array(o), c = new Array(o), f = 0; f < o; ++f) { var s = r[f], l = i[f], h = l.length, d = an(t.call(s, s && s.__data__, f, r)), p = d.length, g = u[f] = new Array(p), y = a[f] = new Array(p); e(s, l, g, y, c[f] = new Array(h), d, n); for (var v, _, b = 0, m = 0; b < p; ++b)if (v = g[b]) { for (b >= m && (m = b + 1); !(_ = y[m]) && ++m < p;); v._next = _ || null } } return (a = new Vn(a, r))._enter = u, a._exit = c, a }, enter: function () { return new Vn(this._enter || this._groups.map(tn), this._parents) }, exit: function () { return new Vn(this._exit || this._groups.map(tn), this._parents) }, join: function (t, n, e) { var r = this.enter(), i = this, o = this.exit(); return "function" == typeof t ? (r = t(r)) && (r = r.selection()) : r = r.append(t + ""), null != n && (i = n(i)) && (i = i.selection()), null == e ? o.remove() : e(o), r && i ? r.merge(i).order() : i }, merge: function (t) { for (var n = t.selection ? t.selection() : t, e = this._groups, r = n._groups, i = e.length, o = r.length, a = Math.min(i, o), u = new Array(i), c = 0; c < a; ++c)for (var f, s = e[c], l = r[c], h = s.length, d = u[c] = new Array(h), p = 0; p < h; ++p)(f = s[p] || l[p]) && (d[p] = f); for (; c < i; ++c)u[c] = e[c]; return new Vn(u, this._parents) }, selection: function () { return this }, order: function () { for (var t = this._groups, n = -1, e = t.length; ++n < e;)for (var r, i = t[n], o = i.length - 1, a = i[o]; --o >= 0;)(r = i[o]) && (a && 4 ^ r.compareDocumentPosition(a) && a.parentNode.insertBefore(r, a), a = r); return this }, sort: function (t) { function n(n, e) { return n && e ? t(n.__data__, e.__data__) : !n - !e } t || (t = un); for (var e = this._groups, r = e.length, i = new Array(r), o = 0; o < r; ++o) { for (var a, u = e[o], c = u.length, f = i[o] = new Array(c), s = 0; s < c; ++s)(a = u[s]) && (f[s] = a); f.sort(n) } return new Vn(i, this._parents).order() }, call: function () { var t = arguments[0]; return arguments[0] = this, t.apply(null, arguments), this }, nodes: function () { return Array.from(this) }, node: function () { for (var t = this._groups, n = 0, e = t.length; n < e; ++n)for (var r = t[n], i = 0, o = r.length; i < o; ++i) { var a = r[i]; if (a) return a } return null }, size: function () { let t = 0; for (const n of this) ++t; return t }, empty: function () { return !this.node() }, each: function (t) { for (var n = this._groups, e = 0, r = n.length; e < r; ++e)for (var i, o = n[e], a = 0, u = o.length; a < u; ++a)(i = o[a]) && t.call(i, i.__data__, a, o); return this }, attr: function (t, n) { var e = It(t); if (arguments.length < 2) { var r = this.node(); return e.local ? r.getAttributeNS(e.space, e.local) : r.getAttribute(e) } return this.each((null == n ? e.local ? fn : cn : "function" == typeof n ? e.local ? dn : hn : e.local ? ln : sn)(e, n)) }, style: function (t, n, e) { return arguments.length > 1 ? this.each((null == n ? gn : "function" == typeof n ? vn : yn)(t, n, null == e ? "" : e)) : _n(this.node(), t) }, property: function (t, n) { return arguments.length > 1 ? this.each((null == n ? bn : "function" == typeof n ? xn : mn)(t, n)) : this.node()[t] }, classed: function (t, n) { var e = wn(t + ""); if (arguments.length < 2) { for (var r = Mn(this.node()), i = -1, o = e.length; ++i < o;)if (!r.contains(e[i])) return !1; return !0 } return this.each(("function" == typeof n ? kn : n ? En : Nn)(e, n)) }, text: function (t) { return arguments.length ? this.each(null == t ? Cn : ("function" == typeof t ? zn : Pn)(t)) : this.node().textContent }, html: function (t) { return arguments.length ? this.each(null == t ? $n : ("function" == typeof t ? Rn : Dn)(t)) : this.node().innerHTML }, raise: function () { return this.each(Fn) }, lower: function () { return this.each(qn) }, append: function (t) { var n = "function" == typeof t ? t : Yt(t); return this.select((function () { return this.appendChild(n.apply(this, arguments)) })) }, insert: function (t, n) { var e = "function" == typeof t ? t : Yt(t), r = null == n ? Un : "function" == typeof n ? n : jt(n); return this.select((function () { return this.insertBefore(e.apply(this, arguments), r.apply(this, arguments) || null) })) }, remove: function () { return this.each(In) }, clone: function (t) { return this.select(t ? Bn : On) }, datum: function (t) { return arguments.length ? this.property("__data__", t) : this.node().__data__ }, on: function (t, n, e) { var r, i, o = function (t) { return t.trim().split(/^|\s+/).map((function (t) { var n = "", e = t.indexOf("."); return e >= 0 && (n = t.slice(e + 1), t = t.slice(0, e)), { type: t, name: n } })) }(t + ""), a = o.length; if (!(arguments.length < 2)) { for (u = n ? Ln : Yn, r = 0; r < a; ++r)this.each(u(o[r], n, e)); return this } var u = this.node().__on; if (u) for (var c, f = 0, s = u.length; f < s; ++f)for (r = 0, c = u[f]; r < a; ++r)if ((i = o[r]).type === c.type && i.name === c.name) return c.value }, dispatch: function (t, n) { return this.each(("function" == typeof n ? Xn : Hn)(t, n)) }, [Symbol.iterator]: function* () { for (var t = this._groups, n = 0, e = t.length; n < e; ++n)for (var r, i = t[n], o = 0, a = i.length; o < a; ++o)(r = i[o]) && (yield r) } }; var Kn = 0; function Qn() { return new Jn } function Jn() { this._ = "@" + (++Kn).toString(36) } function te(t) { let n; for (; n = t.sourceEvent;)t = n; return t } function ne(t, n) { if (t = te(t), void 0 === n && (n = t.currentTarget), n) { var e = n.ownerSVGElement || n; if (e.createSVGPoint) { var r = e.createSVGPoint(); return r.x = t.clientX, r.y = t.clientY, [(r = r.matrixTransform(n.getScreenCTM().inverse())).x, r.y] } if (n.getBoundingClientRect) { var i = n.getBoundingClientRect(); return [t.clientX - i.left - n.clientLeft, t.clientY - i.top - n.clientTop] } } return [t.pageX, t.pageY] } Jn.prototype = Qn.prototype = { constructor: Jn, get: function (t) { for (var n = this._; !(n in t);)if (!(t = t.parentNode)) return; return t[n] }, set: function (t, n) { return t[this._] = n }, remove: function (t) { return this._ in t && delete t[this._] }, toString: function () { return this._ } }; const ee = { passive: !1 }, re = { capture: !0, passive: !1 }; function ie(t) { t.stopImmediatePropagation() } function oe(t) { t.preventDefault(), t.stopImmediatePropagation() } function ae(t) { var n = t.document.documentElement, e = Zn(t).on("dragstart.drag", oe, re); "onselectstart" in n ? e.on("selectstart.drag", oe, re) : (n.__noselect = n.style.MozUserSelect, n.style.MozUserSelect = "none") } function ue(t, n) { var e = t.document.documentElement, r = Zn(t).on("dragstart.drag", null); n && (r.on("click.drag", oe, re), setTimeout((function () { r.on("click.drag", null) }), 0)), "onselectstart" in e ? r.on("selectstart.drag", null) : (e.style.MozUserSelect = e.__noselect, delete e.__noselect) } var ce = t => () => t; function fe(t, { sourceEvent: n, subject: e, target: r, identifier: i, active: o, x: a, y: u, dx: c, dy: f, dispatch: s }) { Object.defineProperties(this, { type: { value: t, enumerable: !0, configurable: !0 }, sourceEvent: { value: n, enumerable: !0, configurable: !0 }, subject: { value: e, enumerable: !0, configurable: !0 }, target: { value: r, enumerable: !0, configurable: !0 }, identifier: { value: i, enumerable: !0, configurable: !0 }, active: { value: o, enumerable: !0, configurable: !0 }, x: { value: a, enumerable: !0, configurable: !0 }, y: { value: u, enumerable: !0, configurable: !0 }, dx: { value: c, enumerable: !0, configurable: !0 }, dy: { value: f, enumerable: !0, configurable: !0 }, _: { value: s } }) } function se(t) { return !t.ctrlKey && !t.button } function le() { return this.parentNode } function he(t, n) { return null == n ? { x: t.x, y: t.y } : n } function de() { return navigator.maxTouchPoints || "ontouchstart" in this } function pe(t, n, e) { t.prototype = n.prototype = e, e.constructor = t } function ge(t, n) { var e = Object.create(t.prototype); for (var r in n) e[r] = n[r]; return e } function ye() { } fe.prototype.on = function () { var t = this._.on.apply(this._, arguments); return t === this._ ? this : t }; var ve = .7, _e = 1 / ve, be = "\\s*([+-]?\\d+)\\s*", me = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", xe = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", we = /^#([0-9a-f]{3,8})$/, Me = new RegExp(`^rgb\\(${be},${be},${be}\\)$`), Te = new RegExp(`^rgb\\(${xe},${xe},${xe}\\)$`), Ae = new RegExp(`^rgba\\(${be},${be},${be},${me}\\)$`), Se = new RegExp(`^rgba\\(${xe},${xe},${xe},${me}\\)$`), Ee = new RegExp(`^hsl\\(${me},${xe},${xe}\\)$`), Ne = new RegExp(`^hsla\\(${me},${xe},${xe},${me}\\)$`), ke = { aliceblue: 15792383, antiquewhite: 16444375, aqua: 65535, aquamarine: 8388564, azure: 15794175, beige: 16119260, bisque: 16770244, black: 0, blanchedalmond: 16772045, blue: 255, blueviolet: 9055202, brown: 10824234, burlywood: 14596231, cadetblue: 6266528, chartreuse: 8388352, chocolate: 13789470, coral: 16744272, cornflowerblue: 6591981, cornsilk: 16775388, crimson: 14423100, cyan: 65535, darkblue: 139, darkcyan: 35723, darkgoldenrod: 12092939, darkgray: 11119017, darkgreen: 25600, darkgrey: 11119017, darkkhaki: 12433259, darkmagenta: 9109643, darkolivegreen: 5597999, darkorange: 16747520, darkorchid: 10040012, darkred: 9109504, darksalmon: 15308410, darkseagreen: 9419919, darkslateblue: 4734347, darkslategray: 3100495, darkslategrey: 3100495, darkturquoise: 52945, darkviolet: 9699539, deeppink: 16716947, deepskyblue: 49151, dimgray: 6908265, dimgrey: 6908265, dodgerblue: 2003199, firebrick: 11674146, floralwhite: 16775920, forestgreen: 2263842, fuchsia: 16711935, gainsboro: 14474460, ghostwhite: 16316671, gold: 16766720, goldenrod: 14329120, gray: 8421504, green: 32768, greenyellow: 11403055, grey: 8421504, honeydew: 15794160, hotpink: 16738740, indianred: 13458524, indigo: 4915330, ivory: 16777200, khaki: 15787660, lavender: 15132410, lavenderblush: 16773365, lawngreen: 8190976, lemonchiffon: 16775885, lightblue: 11393254, lightcoral: 15761536, lightcyan: 14745599, lightgoldenrodyellow: 16448210, lightgray: 13882323, lightgreen: 9498256, lightgrey: 13882323, lightpink: 16758465, lightsalmon: 16752762, lightseagreen: 2142890, lightskyblue: 8900346, lightslategray: 7833753, lightslategrey: 7833753, lightsteelblue: 11584734, lightyellow: 16777184, lime: 65280, limegreen: 3329330, linen: 16445670, magenta: 16711935, maroon: 8388608, mediumaquamarine: 6737322, mediumblue: 205, mediumorchid: 12211667, mediumpurple: 9662683, mediumseagreen: 3978097, mediumslateblue: 8087790, mediumspringgreen: 64154, mediumturquoise: 4772300, mediumvioletred: 13047173, midnightblue: 1644912, mintcream: 16121850, mistyrose: 16770273, moccasin: 16770229, navajowhite: 16768685, navy: 128, oldlace: 16643558, olive: 8421376, olivedrab: 7048739, orange: 16753920, orangered: 16729344, orchid: 14315734, palegoldenrod: 15657130, palegreen: 10025880, paleturquoise: 11529966, palevioletred: 14381203, papayawhip: 16773077, peachpuff: 16767673, peru: 13468991, pink: 16761035, plum: 14524637, powderblue: 11591910, purple: 8388736, rebeccapurple: 6697881, red: 16711680, rosybrown: 12357519, royalblue: 4286945, saddlebrown: 9127187, salmon: 16416882, sandybrown: 16032864, seagreen: 3050327, seashell: 16774638, sienna: 10506797, silver: 12632256, skyblue: 8900331, slateblue: 6970061, slategray: 7372944, slategrey: 7372944, snow: 16775930, springgreen: 65407, steelblue: 4620980, tan: 13808780, teal: 32896, thistle: 14204888, tomato: 16737095, turquoise: 4251856, violet: 15631086, wheat: 16113331, white: 16777215, whitesmoke: 16119285, yellow: 16776960, yellowgreen: 10145074 }; function Ce() { return this.rgb().formatHex() } function Pe() { return this.rgb().formatRgb() } function ze(t) { var n, e; return t = (t + "").trim().toLowerCase(), (n = we.exec(t)) ? (e = n[1].length, n = parseInt(n[1], 16), 6 === e ? $e(n) : 3 === e ? new qe(n >> 8 & 15 | n >> 4 & 240, n >> 4 & 15 | 240 & n, (15 & n) << 4 | 15 & n, 1) : 8 === e ? De(n >> 24 & 255, n >> 16 & 255, n >> 8 & 255, (255 & n) / 255) : 4 === e ? De(n >> 12 & 15 | n >> 8 & 240, n >> 8 & 15 | n >> 4 & 240, n >> 4 & 15 | 240 & n, ((15 & n) << 4 | 15 & n) / 255) : null) : (n = Me.exec(t)) ? new qe(n[1], n[2], n[3], 1) : (n = Te.exec(t)) ? new qe(255 * n[1] / 100, 255 * n[2] / 100, 255 * n[3] / 100, 1) : (n = Ae.exec(t)) ? De(n[1], n[2], n[3], n[4]) : (n = Se.exec(t)) ? De(255 * n[1] / 100, 255 * n[2] / 100, 255 * n[3] / 100, n[4]) : (n = Ee.exec(t)) ? Le(n[1], n[2] / 100, n[3] / 100, 1) : (n = Ne.exec(t)) ? Le(n[1], n[2] / 100, n[3] / 100, n[4]) : ke.hasOwnProperty(t) ? $e(ke[t]) : "transparent" === t ? new qe(NaN, NaN, NaN, 0) : null } function $e(t) { return new qe(t >> 16 & 255, t >> 8 & 255, 255 & t, 1) } function De(t, n, e, r) { return r <= 0 && (t = n = e = NaN), new qe(t, n, e, r) } function Re(t) { return t instanceof ye || (t = ze(t)), t ? new qe((t = t.rgb()).r, t.g, t.b, t.opacity) : new qe } function Fe(t, n, e, r) { return 1 === arguments.length ? Re(t) : new qe(t, n, e, null == r ? 1 : r) } function qe(t, n, e, r) { this.r = +t, this.g = +n, this.b = +e, this.opacity = +r } function Ue() { return `#${Ye(this.r)}${Ye(this.g)}${Ye(this.b)}` } function Ie() { const t = Oe(this.opacity); return `${1 === t ? "rgb(" : "rgba("}${Be(this.r)}, ${Be(this.g)}, ${Be(this.b)}${1 === t ? ")" : `, ${t})`}` } function Oe(t) { return isNaN(t) ? 1 : Math.max(0, Math.min(1, t)) } function Be(t) { return Math.max(0, Math.min(255, Math.round(t) || 0)) } function Ye(t) { return ((t = Be(t)) < 16 ? "0" : "") + t.toString(16) } function Le(t, n, e, r) { return r <= 0 ? t = n = e = NaN : e <= 0 || e >= 1 ? t = n = NaN : n <= 0 && (t = NaN), new Xe(t, n, e, r) } function je(t) { if (t instanceof Xe) return new Xe(t.h, t.s, t.l, t.opacity); if (t instanceof ye || (t = ze(t)), !t) return new Xe; if (t instanceof Xe) return t; var n = (t = t.rgb()).r / 255, e = t.g / 255, r = t.b / 255, i = Math.min(n, e, r), o = Math.max(n, e, r), a = NaN, u = o - i, c = (o + i) / 2; return u ? (a = n === o ? (e - r) / u + 6 * (e < r) : e === o ? (r - n) / u + 2 : (n - e) / u + 4, u /= c < .5 ? o + i : 2 - o - i, a *= 60) : u = c > 0 && c < 1 ? 0 : a, new Xe(a, u, c, t.opacity) } function He(t, n, e, r) { return 1 === arguments.length ? je(t) : new Xe(t, n, e, null == r ? 1 : r) } function Xe(t, n, e, r) { this.h = +t, this.s = +n, this.l = +e, this.opacity = +r } function Ge(t) { return (t = (t || 0) % 360) < 0 ? t + 360 : t } function Ve(t) { return Math.max(0, Math.min(1, t || 0)) } function We(t, n, e) { return 255 * (t < 60 ? n + (e - n) * t / 60 : t < 180 ? e : t < 240 ? n + (e - n) * (240 - t) / 60 : n) } pe(ye, ze, { copy(t) { return Object.assign(new this.constructor, this, t) }, displayable() { return this.rgb().displayable() }, hex: Ce, formatHex: Ce, formatHex8: function () { return this.rgb().formatHex8() }, formatHsl: function () { return je(this).formatHsl() }, formatRgb: Pe, toString: Pe }), pe(qe, Fe, ge(ye, { brighter(t) { return t = null == t ? _e : Math.pow(_e, t), new qe(this.r * t, this.g * t, this.b * t, this.opacity) }, darker(t) { return t = null == t ? ve : Math.pow(ve, t), new qe(this.r * t, this.g * t, this.b * t, this.opacity) }, rgb() { return this }, clamp() { return new qe(Be(this.r), Be(this.g), Be(this.b), Oe(this.opacity)) }, displayable() { return -.5 <= this.r && this.r < 255.5 && -.5 <= this.g && this.g < 255.5 && -.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1 }, hex: Ue, formatHex: Ue, formatHex8: function () { return `#${Ye(this.r)}${Ye(this.g)}${Ye(this.b)}${Ye(255 * (isNaN(this.opacity) ? 1 : this.opacity))}` }, formatRgb: Ie, toString: Ie })), pe(Xe, He, ge(ye, { brighter(t) { return t = null == t ? _e : Math.pow(_e, t), new Xe(this.h, this.s, this.l * t, this.opacity) }, darker(t) { return t = null == t ? ve : Math.pow(ve, t), new Xe(this.h, this.s, this.l * t, this.opacity) }, rgb() { var t = this.h % 360 + 360 * (this.h < 0), n = isNaN(t) || isNaN(this.s) ? 0 : this.s, e = this.l, r = e + (e < .5 ? e : 1 - e) * n, i = 2 * e - r; return new qe(We(t >= 240 ? t - 240 : t + 120, i, r), We(t, i, r), We(t < 120 ? t + 240 : t - 120, i, r), this.opacity) }, clamp() { return new Xe(Ge(this.h), Ve(this.s), Ve(this.l), Oe(this.opacity)) }, displayable() { return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1 }, formatHsl() { const t = Oe(this.opacity); return `${1 === t ? "hsl(" : "hsla("}${Ge(this.h)}, ${100 * Ve(this.s)}%, ${100 * Ve(this.l)}%${1 === t ? ")" : `, ${t})`}` } })); const Ze = Math.PI / 180, Ke = 180 / Math.PI, Qe = .96422, Je = 1, tr = .82521, nr = 4 / 29, er = 6 / 29, rr = 3 * er * er, ir = er * er * er; function or(t) { if (t instanceof ur) return new ur(t.l, t.a, t.b, t.opacity); if (t instanceof pr) return gr(t); t instanceof qe || (t = Re(t)); var n, e, r = lr(t.r), i = lr(t.g), o = lr(t.b), a = cr((.2225045 * r + .7168786 * i + .0606169 * o) / Je); return r === i && i === o ? n = e = a : (n = cr((.4360747 * r + .3850649 * i + .1430804 * o) / Qe), e = cr((.0139322 * r + .0971045 * i + .7141733 * o) / tr)), new ur(116 * a - 16, 500 * (n - a), 200 * (a - e), t.opacity) } function ar(t, n, e, r) { return 1 === arguments.length ? or(t) : new ur(t, n, e, null == r ? 1 : r) } function ur(t, n, e, r) { this.l = +t, this.a = +n, this.b = +e, this.opacity = +r } function cr(t) { return t > ir ? Math.pow(t, 1 / 3) : t / rr + nr } function fr(t) { return t > er ? t * t * t : rr * (t - nr) } function sr(t) { return 255 * (t <= .0031308 ? 12.92 * t : 1.055 * Math.pow(t, 1 / 2.4) - .055) } function lr(t) { return (t /= 255) <= .04045 ? t / 12.92 : Math.pow((t + .055) / 1.055, 2.4) } function hr(t) { if (t instanceof pr) return new pr(t.h, t.c, t.l, t.opacity); if (t instanceof ur || (t = or(t)), 0 === t.a && 0 === t.b) return new pr(NaN, 0 < t.l && t.l < 100 ? 0 : NaN, t.l, t.opacity); var n = Math.atan2(t.b, t.a) * Ke; return new pr(n < 0 ? n + 360 : n, Math.sqrt(t.a * t.a + t.b * t.b), t.l, t.opacity) } function dr(t, n, e, r) { return 1 === arguments.length ? hr(t) : new pr(t, n, e, null == r ? 1 : r) } function pr(t, n, e, r) { this.h = +t, this.c = +n, this.l = +e, this.opacity = +r } function gr(t) { if (isNaN(t.h)) return new ur(t.l, 0, 0, t.opacity); var n = t.h * Ze; return new ur(t.l, Math.cos(n) * t.c, Math.sin(n) * t.c, t.opacity) } pe(ur, ar, ge(ye, { brighter(t) { return new ur(this.l + 18 * (null == t ? 1 : t), this.a, this.b, this.opacity) }, darker(t) { return new ur(this.l - 18 * (null == t ? 1 : t), this.a, this.b, this.opacity) }, rgb() { var t = (this.l + 16) / 116, n = isNaN(this.a) ? t : t + this.a / 500, e = isNaN(this.b) ? t : t - this.b / 200; return new qe(sr(3.1338561 * (n = Qe * fr(n)) - 1.6168667 * (t = Je * fr(t)) - .4906146 * (e = tr * fr(e))), sr(-.9787684 * n + 1.9161415 * t + .033454 * e), sr(.0719453 * n - .2289914 * t + 1.4052427 * e), this.opacity) } })), pe(pr, dr, ge(ye, { brighter(t) { return new pr(this.h, this.c, this.l + 18 * (null == t ? 1 : t), this.opacity) }, darker(t) { return new pr(this.h, this.c, this.l - 18 * (null == t ? 1 : t), this.opacity) }, rgb() { return gr(this).rgb() } })); var yr = -.14861, vr = 1.78277, _r = -.29227, br = -.90649, mr = 1.97294, xr = mr * br, wr = mr * vr, Mr = vr * _r - br * yr; function Tr(t, n, e, r) { return 1 === arguments.length ? function (t) { if (t instanceof Ar) return new Ar(t.h, t.s, t.l, t.opacity); t instanceof qe || (t = Re(t)); var n = t.r / 255, e = t.g / 255, r = t.b / 255, i = (Mr * r + xr * n - wr * e) / (Mr + xr - wr), o = r - i, a = (mr * (e - i) - _r * o) / br, u = Math.sqrt(a * a + o * o) / (mr * i * (1 - i)), c = u ? Math.atan2(a, o) * Ke - 120 : NaN; return new Ar(c < 0 ? c + 360 : c, u, i, t.opacity) }(t) : new Ar(t, n, e, null == r ? 1 : r) } function Ar(t, n, e, r) { this.h = +t, this.s = +n, this.l = +e, this.opacity = +r } function Sr(t, n, e, r, i) { var o = t * t, a = o * t; return ((1 - 3 * t + 3 * o - a) * n + (4 - 6 * o + 3 * a) * e + (1 + 3 * t + 3 * o - 3 * a) * r + a * i) / 6 } function Er(t) { var n = t.length - 1; return function (e) { var r = e <= 0 ? e = 0 : e >= 1 ? (e = 1, n - 1) : Math.floor(e * n), i = t[r], o = t[r + 1], a = r > 0 ? t[r - 1] : 2 * i - o, u = r < n - 1 ? t[r + 2] : 2 * o - i; return Sr((e - r / n) * n, a, i, o, u) } } function Nr(t) { var n = t.length; return function (e) { var r = Math.floor(((e %= 1) < 0 ? ++e : e) * n), i = t[(r + n - 1) % n], o = t[r % n], a = t[(r + 1) % n], u = t[(r + 2) % n]; return Sr((e - r / n) * n, i, o, a, u) } } pe(Ar, Tr, ge(ye, { brighter(t) { return t = null == t ? _e : Math.pow(_e, t), new Ar(this.h, this.s, this.l * t, this.opacity) }, darker(t) { return t = null == t ? ve : Math.pow(ve, t), new Ar(this.h, this.s, this.l * t, this.opacity) }, rgb() { var t = isNaN(this.h) ? 0 : (this.h + 120) * Ze, n = +this.l, e = isNaN(this.s) ? 0 : this.s * n * (1 - n), r = Math.cos(t), i = Math.sin(t); return new qe(255 * (n + e * (yr * r + vr * i)), 255 * (n + e * (_r * r + br * i)), 255 * (n + e * (mr * r)), this.opacity) } })); var kr = t => () => t; function Cr(t, n) { return function (e) { return t + e * n } } function Pr(t, n) { var e = n - t; return e ? Cr(t, e > 180 || e < -180 ? e - 360 * Math.round(e / 360) : e) : kr(isNaN(t) ? n : t) } function zr(t) { return 1 == (t = +t) ? $r : function (n, e) { return e - n ? function (t, n, e) { return t = Math.pow(t, e), n = Math.pow(n, e) - t, e = 1 / e, function (r) { return Math.pow(t + r * n, e) } }(n, e, t) : kr(isNaN(n) ? e : n) } } function $r(t, n) { var e = n - t; return e ? Cr(t, e) : kr(isNaN(t) ? n : t) } var Dr = function t(n) { var e = zr(n); function r(t, n) { var r = e((t = Fe(t)).r, (n = Fe(n)).r), i = e(t.g, n.g), o = e(t.b, n.b), a = $r(t.opacity, n.opacity); return function (n) { return t.r = r(n), t.g = i(n), t.b = o(n), t.opacity = a(n), t + "" } } return r.gamma = t, r }(1); function Rr(t) { return function (n) { var e, r, i = n.length, o = new Array(i), a = new Array(i), u = new Array(i); for (e = 0; e < i; ++e)r = Fe(n[e]), o[e] = r.r || 0, a[e] = r.g || 0, u[e] = r.b || 0; return o = t(o), a = t(a), u = t(u), r.opacity = 1, function (t) { return r.r = o(t), r.g = a(t), r.b = u(t), r + "" } } } var Fr = Rr(Er), qr = Rr(Nr); function Ur(t, n) { n || (n = []); var e, r = t ? Math.min(n.length, t.length) : 0, i = n.slice(); return function (o) { for (e = 0; e < r; ++e)i[e] = t[e] * (1 - o) + n[e] * o; return i } } function Ir(t) { return ArrayBuffer.isView(t) && !(t instanceof DataView) } function Or(t, n) { var e, r = n ? n.length : 0, i = t ? Math.min(r, t.length) : 0, o = new Array(i), a = new Array(r); for (e = 0; e < i; ++e)o[e] = Gr(t[e], n[e]); for (; e < r; ++e)a[e] = n[e]; return function (t) { for (e = 0; e < i; ++e)a[e] = o[e](t); return a } } function Br(t, n) { var e = new Date; return t = +t, n = +n, function (r) { return e.setTime(t * (1 - r) + n * r), e } } function Yr(t, n) { return t = +t, n = +n, function (e) { return t * (1 - e) + n * e } } function Lr(t, n) { var e, r = {}, i = {}; for (e in null !== t && "object" == typeof t || (t = {}), null !== n && "object" == typeof n || (n = {}), n) e in t ? r[e] = Gr(t[e], n[e]) : i[e] = n[e]; return function (t) { for (e in r) i[e] = r[e](t); return i } } var jr = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, Hr = new RegExp(jr.source, "g"); function Xr(t, n) { var e, r, i, o = jr.lastIndex = Hr.lastIndex = 0, a = -1, u = [], c = []; for (t += "", n += ""; (e = jr.exec(t)) && (r = Hr.exec(n));)(i = r.index) > o && (i = n.slice(o, i), u[a] ? u[a] += i : u[++a] = i), (e = e[0]) === (r = r[0]) ? u[a] ? u[a] += r : u[++a] = r : (u[++a] = null, c.push({ i: a, x: Yr(e, r) })), o = Hr.lastIndex; return o < n.length && (i = n.slice(o), u[a] ? u[a] += i : u[++a] = i), u.length < 2 ? c[0] ? function (t) { return function (n) { return t(n) + "" } }(c[0].x) : function (t) { return function () { return t } }(n) : (n = c.length, function (t) { for (var e, r = 0; r < n; ++r)u[(e = c[r]).i] = e.x(t); return u.join("") }) } function Gr(t, n) { var e, r = typeof n; return null == n || "boolean" === r ? kr(n) : ("number" === r ? Yr : "string" === r ? (e = ze(n)) ? (n = e, Dr) : Xr : n instanceof ze ? Dr : n instanceof Date ? Br : Ir(n) ? Ur : Array.isArray(n) ? Or : "function" != typeof n.valueOf && "function" != typeof n.toString || isNaN(n) ? Lr : Yr)(t, n) } function Vr(t, n) { return t = +t, n = +n, function (e) { return Math.round(t * (1 - e) + n * e) } } var Wr, Zr = 180 / Math.PI, Kr = { translateX: 0, translateY: 0, rotate: 0, skewX: 0, scaleX: 1, scaleY: 1 }; function Qr(t, n, e, r, i, o) { var a, u, c; return (a = Math.sqrt(t * t + n * n)) && (t /= a, n /= a), (c = t * e + n * r) && (e -= t * c, r -= n * c), (u = Math.sqrt(e * e + r * r)) && (e /= u, r /= u, c /= u), t * r < n * e && (t = -t, n = -n, c = -c, a = -a), { translateX: i, translateY: o, rotate: Math.atan2(n, t) * Zr, skewX: Math.atan(c) * Zr, scaleX: a, scaleY: u } } function Jr(t, n, e, r) { function i(t) { return t.length ? t.pop() + " " : "" } return function (o, a) { var u = [], c = []; return o = t(o), a = t(a), function (t, r, i, o, a, u) { if (t !== i || r !== o) { var c = a.push("translate(", null, n, null, e); u.push({ i: c - 4, x: Yr(t, i) }, { i: c - 2, x: Yr(r, o) }) } else (i || o) && a.push("translate(" + i + n + o + e) }(o.translateX, o.translateY, a.translateX, a.translateY, u, c), function (t, n, e, o) { t !== n ? (t - n > 180 ? n += 360 : n - t > 180 && (t += 360), o.push({ i: e.push(i(e) + "rotate(", null, r) - 2, x: Yr(t, n) })) : n && e.push(i(e) + "rotate(" + n + r) }(o.rotate, a.rotate, u, c), function (t, n, e, o) { t !== n ? o.push({ i: e.push(i(e) + "skewX(", null, r) - 2, x: Yr(t, n) }) : n && e.push(i(e) + "skewX(" + n + r) }(o.skewX, a.skewX, u, c), function (t, n, e, r, o, a) { if (t !== e || n !== r) { var u = o.push(i(o) + "scale(", null, ",", null, ")"); a.push({ i: u - 4, x: Yr(t, e) }, { i: u - 2, x: Yr(n, r) }) } else 1 === e && 1 === r || o.push(i(o) + "scale(" + e + "," + r + ")") }(o.scaleX, o.scaleY, a.scaleX, a.scaleY, u, c), o = a = null, function (t) { for (var n, e = -1, r = c.length; ++e < r;)u[(n = c[e]).i] = n.x(t); return u.join("") } } } var ti = Jr((function (t) { const n = new ("function" == typeof DOMMatrix ? DOMMatrix : WebKitCSSMatrix)(t + ""); return n.isIdentity ? Kr : Qr(n.a, n.b, n.c, n.d, n.e, n.f) }), "px, ", "px)", "deg)"), ni = Jr((function (t) { return null == t ? Kr : (Wr || (Wr = document.createElementNS("http://www.w3.org/2000/svg", "g")), Wr.setAttribute("transform", t), (t = Wr.transform.baseVal.consolidate()) ? Qr((t = t.matrix).a, t.b, t.c, t.d, t.e, t.f) : Kr) }), ", ", ")", ")"); function ei(t) { return ((t = Math.exp(t)) + 1 / t) / 2 } var ri = function t(n, e, r) { function i(t, i) { var o, a, u = t[0], c = t[1], f = t[2], s = i[0], l = i[1], h = i[2], d = s - u, p = l - c, g = d * d + p * p; if (g < 1e-12) a = Math.log(h / f) / n, o = function (t) { return [u + t * d, c + t * p, f * Math.exp(n * t * a)] }; else { var y = Math.sqrt(g), v = (h * h - f * f + r * g) / (2 * f * e * y), _ = (h * h - f * f - r * g) / (2 * h * e * y), b = Math.log(Math.sqrt(v * v + 1) - v), m = Math.log(Math.sqrt(_ * _ + 1) - _); a = (m - b) / n, o = function (t) { var r = t * a, i = ei(b), o = f / (e * y) * (i * function (t) { return ((t = Math.exp(2 * t)) - 1) / (t + 1) }(n * r + b) - function (t) { return ((t = Math.exp(t)) - 1 / t) / 2 }(b)); return [u + o * d, c + o * p, f * i / ei(n * r + b)] } } return o.duration = 1e3 * a * n / Math.SQRT2, o } return i.rho = function (n) { var e = Math.max(.001, +n), r = e * e; return t(e, r, r * r) }, i }(Math.SQRT2, 2, 4); function ii(t) { return function (n, e) { var r = t((n = He(n)).h, (e = He(e)).h), i = $r(n.s, e.s), o = $r(n.l, e.l), a = $r(n.opacity, e.opacity); return function (t) { return n.h = r(t), n.s = i(t), n.l = o(t), n.opacity = a(t), n + "" } } } var oi = ii(Pr), ai = ii($r); function ui(t) { return function (n, e) { var r = t((n = dr(n)).h, (e = dr(e)).h), i = $r(n.c, e.c), o = $r(n.l, e.l), a = $r(n.opacity, e.opacity); return function (t) { return n.h = r(t), n.c = i(t), n.l = o(t), n.opacity = a(t), n + "" } } } var ci = ui(Pr), fi = ui($r); function si(t) { return function n(e) { function r(n, r) { var i = t((n = Tr(n)).h, (r = Tr(r)).h), o = $r(n.s, r.s), a = $r(n.l, r.l), u = $r(n.opacity, r.opacity); return function (t) { return n.h = i(t), n.s = o(t), n.l = a(Math.pow(t, e)), n.opacity = u(t), n + "" } } return e = +e, r.gamma = n, r }(1) } var li = si(Pr), hi = si($r); function di(t, n) { void 0 === n && (n = t, t = Gr); for (var e = 0, r = n.length - 1, i = n[0], o = new Array(r < 0 ? 0 : r); e < r;)o[e] = t(i, i = n[++e]); return function (t) { var n = Math.max(0, Math.min(r - 1, Math.floor(t *= r))); return o[n](t - n) } } var pi, gi, yi = 0, vi = 0, _i = 0, bi = 1e3, mi = 0, xi = 0, wi = 0, Mi = "object" == typeof performance && performance.now ? performance : Date, Ti = "object" == typeof window && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (t) { setTimeout(t, 17) }; function Ai() { return xi || (Ti(Si), xi = Mi.now() + wi) } function Si() { xi = 0 } function Ei() { this._call = this._time = this._next = null } function Ni(t, n, e) { var r = new Ei; return r.restart(t, n, e), r } function ki() { Ai(), ++yi; for (var t, n = pi; n;)(t = xi - n._time) >= 0 && n._call.call(void 0, t), n = n._next; --yi } function Ci() { xi = (mi = Mi.now()) + wi, yi = vi = 0; try { ki() } finally { yi = 0, function () { var t, n, e = pi, r = 1 / 0; for (; e;)e._call ? (r > e._time && (r = e._time), t = e, e = e._next) : (n = e._next, e._next = null, e = t ? t._next = n : pi = n); gi = t, zi(r) }(), xi = 0 } } function Pi() { var t = Mi.now(), n = t - mi; n > bi && (wi -= n, mi = t) } function zi(t) { yi || (vi && (vi = clearTimeout(vi)), t - xi > 24 ? (t < 1 / 0 && (vi = setTimeout(Ci, t - Mi.now() - wi)), _i && (_i = clearInterval(_i))) : (_i || (mi = Mi.now(), _i = setInterval(Pi, bi)), yi = 1, Ti(Ci))) } function $i(t, n, e) { var r = new Ei; return n = null == n ? 0 : +n, r.restart((e => { r.stop(), t(e + n) }), n, e), r } Ei.prototype = Ni.prototype = { constructor: Ei, restart: function (t, n, e) { if ("function" != typeof t) throw new TypeError("callback is not a function"); e = (null == e ? Ai() : +e) + (null == n ? 0 : +n), this._next || gi === this || (gi ? gi._next = this : pi = this, gi = this), this._call = t, this._time = e, zi() }, stop: function () { this._call && (this._call = null, this._time = 1 / 0, zi()) } }; var Di = $t("start", "end", "cancel", "interrupt"), Ri = [], Fi = 0, qi = 1, Ui = 2, Ii = 3, Oi = 4, Bi = 5, Yi = 6; function Li(t, n, e, r, i, o) { var a = t.__transition; if (a) { if (e in a) return } else t.__transition = {}; !function (t, n, e) { var r, i = t.__transition; function o(t) { e.state = qi, e.timer.restart(a, e.delay, e.time), e.delay <= t && a(t - e.delay) } function a(o) { var f, s, l, h; if (e.state !== qi) return c(); for (f in i) if ((h = i[f]).name === e.name) { if (h.state === Ii) return $i(a); h.state === Oi ? (h.state = Yi, h.timer.stop(), h.on.call("interrupt", t, t.__data__, h.index, h.group), delete i[f]) : +f < n && (h.state = Yi, h.timer.stop(), h.on.call("cancel", t, t.__data__, h.index, h.group), delete i[f]) } if ($i((function () { e.state === Ii && (e.state = Oi, e.timer.restart(u, e.delay, e.time), u(o)) })), e.state = Ui, e.on.call("start", t, t.__data__, e.index, e.group), e.state === Ui) { for (e.state = Ii, r = new Array(l = e.tween.length), f = 0, s = -1; f < l; ++f)(h = e.tween[f].value.call(t, t.__data__, e.index, e.group)) && (r[++s] = h); r.length = s + 1 } } function u(n) { for (var i = n < e.duration ? e.ease.call(null, n / e.duration) : (e.timer.restart(c), e.state = Bi, 1), o = -1, a = r.length; ++o < a;)r[o].call(t, i); e.state === Bi && (e.on.call("end", t, t.__data__, e.index, e.group), c()) } function c() { for (var r in e.state = Yi, e.timer.stop(), delete i[n], i) return; delete t.__transition } i[n] = e, e.timer = Ni(o, 0, e.time) }(t, e, { name: n, index: r, group: i, on: Di, tween: Ri, time: o.time, delay: o.delay, duration: o.duration, ease: o.ease, timer: null, state: Fi }) } function ji(t, n) { var e = Xi(t, n); if (e.state > Fi) throw new Error("too late; already scheduled"); return e } function Hi(t, n) { var e = Xi(t, n); if (e.state > Ii) throw new Error("too late; already running"); return e } function Xi(t, n) { var e = t.__transition; if (!e || !(e = e[n])) throw new Error("transition not found"); return e } function Gi(t, n) { var e, r, i, o = t.__transition, a = !0; if (o) { for (i in n = null == n ? null : n + "", o) (e = o[i]).name === n ? (r = e.state > Ui && e.state < Bi, e.state = Yi, e.timer.stop(), e.on.call(r ? "interrupt" : "cancel", t, t.__data__, e.index, e.group), delete o[i]) : a = !1; a && delete t.__transition } } function Vi(t, n) { var e, r; return function () { var i = Hi(this, t), o = i.tween; if (o !== e) for (var a = 0, u = (r = e = o).length; a < u; ++a)if (r[a].name === n) { (r = r.slice()).splice(a, 1); break } i.tween = r } } function Wi(t, n, e) { var r, i; if ("function" != typeof e) throw new Error; return function () { var o = Hi(this, t), a = o.tween; if (a !== r) { i = (r = a).slice(); for (var u = { name: n, value: e }, c = 0, f = i.length; c < f; ++c)if (i[c].name === n) { i[c] = u; break } c === f && i.push(u) } o.tween = i } } function Zi(t, n, e) { var r = t._id; return t.each((function () { var t = Hi(this, r); (t.value || (t.value = {}))[n] = e.apply(this, arguments) })), function (t) { return Xi(t, r).value[n] } } function Ki(t, n) { var e; return ("number" == typeof n ? Yr : n instanceof ze ? Dr : (e = ze(n)) ? (n = e, Dr) : Xr)(t, n) } function Qi(t) { return function () { this.removeAttribute(t) } } function Ji(t) { return function () { this.removeAttributeNS(t.space, t.local) } } function to(t, n, e) { var r, i, o = e + ""; return function () { var a = this.getAttribute(t); return a === o ? null : a === r ? i : i = n(r = a, e) } } function no(t, n, e) { var r, i, o = e + ""; return function () { var a = this.getAttributeNS(t.space, t.local); return a === o ? null : a === r ? i : i = n(r = a, e) } } function eo(t, n, e) { var r, i, o; return function () { var a, u, c = e(this); if (null != c) return (a = this.getAttribute(t)) === (u = c + "") ? null : a === r && u === i ? o : (i = u, o = n(r = a, c)); this.removeAttribute(t) } } function ro(t, n, e) { var r, i, o; return function () { var a, u, c = e(this); if (null != c) return (a = this.getAttributeNS(t.space, t.local)) === (u = c + "") ? null : a === r && u === i ? o : (i = u, o = n(r = a, c)); this.removeAttributeNS(t.space, t.local) } } function io(t, n) { var e, r; function i() { var i = n.apply(this, arguments); return i !== r && (e = (r = i) && function (t, n) { return function (e) { this.setAttributeNS(t.space, t.local, n.call(this, e)) } }(t, i)), e } return i._value = n, i } function oo(t, n) { var e, r; function i() { var i = n.apply(this, arguments); return i !== r && (e = (r = i) && function (t, n) { return function (e) { this.setAttribute(t, n.call(this, e)) } }(t, i)), e } return i._value = n, i } function ao(t, n) { return function () { ji(this, t).delay = +n.apply(this, arguments) } } function uo(t, n) { return n = +n, function () { ji(this, t).delay = n } } function co(t, n) { return function () { Hi(this, t).duration = +n.apply(this, arguments) } } function fo(t, n) { return n = +n, function () { Hi(this, t).duration = n } } var so = Wn.prototype.constructor; function lo(t) { return function () { this.style.removeProperty(t) } } var ho = 0; function po(t, n, e, r) { this._groups = t, this._parents = n, this._name = e, this._id = r } function go(t) { return Wn().transition(t) } function yo() { return ++ho } var vo = Wn.prototype; po.prototype = go.prototype = { constructor: po, select: function (t) { var n = this._name, e = this._id; "function" != typeof t && (t = jt(t)); for (var r = this._groups, i = r.length, o = new Array(i), a = 0; a < i; ++a)for (var u, c, f = r[a], s = f.length, l = o[a] = new Array(s), h = 0; h < s; ++h)(u = f[h]) && (c = t.call(u, u.__data__, h, f)) && ("__data__" in u && (c.__data__ = u.__data__), l[h] = c, Li(l[h], n, e, h, l, Xi(u, e))); return new po(o, this._parents, n, e) }, selectAll: function (t) { var n = this._name, e = this._id; "function" != typeof t && (t = Gt(t)); for (var r = this._groups, i = r.length, o = [], a = [], u = 0; u < i; ++u)for (var c, f = r[u], s = f.length, l = 0; l < s; ++l)if (c = f[l]) { for (var h, d = t.call(c, c.__data__, l, f), p = Xi(c, e), g = 0, y = d.length; g < y; ++g)(h = d[g]) && Li(h, n, e, g, d, p); o.push(d), a.push(c) } return new po(o, a, n, e) }, selectChild: vo.selectChild, selectChildren: vo.selectChildren, filter: function (t) { "function" != typeof t && (t = Vt(t)); for (var n = this._groups, e = n.length, r = new Array(e), i = 0; i < e; ++i)for (var o, a = n[i], u = a.length, c = r[i] = [], f = 0; f < u; ++f)(o = a[f]) && t.call(o, o.__data__, f, a) && c.push(o); return new po(r, this._parents, this._name, this._id) }, merge: function (t) { if (t._id !== this._id) throw new Error; for (var n = this._groups, e = t._groups, r = n.length, i = e.length, o = Math.min(r, i), a = new Array(r), u = 0; u < o; ++u)for (var c, f = n[u], s = e[u], l = f.length, h = a[u] = new Array(l), d = 0; d < l; ++d)(c = f[d] || s[d]) && (h[d] = c); for (; u < r; ++u)a[u] = n[u]; return new po(a, this._parents, this._name, this._id) }, selection: function () { return new so(this._groups, this._parents) }, transition: function () { for (var t = this._name, n = this._id, e = yo(), r = this._groups, i = r.length, o = 0; o < i; ++o)for (var a, u = r[o], c = u.length, f = 0; f < c; ++f)if (a = u[f]) { var s = Xi(a, n); Li(a, t, e, f, u, { time: s.time + s.delay + s.duration, delay: 0, duration: s.duration, ease: s.ease }) } return new po(r, this._parents, t, e) }, call: vo.call, nodes: vo.nodes, node: vo.node, size: vo.size, empty: vo.empty, each: vo.each, on: function (t, n) { var e = this._id; return arguments.length < 2 ? Xi(this.node(), e).on.on(t) : this.each(function (t, n, e) { var r, i, o = function (t) { return (t + "").trim().split(/^|\s+/).every((function (t) { var n = t.indexOf("."); return n >= 0 && (t = t.slice(0, n)), !t || "start" === t })) }(n) ? ji : Hi; return function () { var a = o(this, t), u = a.on; u !== r && (i = (r = u).copy()).on(n, e), a.on = i } }(e, t, n)) }, attr: function (t, n) { var e = It(t), r = "transform" === e ? ni : Ki; return this.attrTween(t, "function" == typeof n ? (e.local ? ro : eo)(e, r, Zi(this, "attr." + t, n)) : null == n ? (e.local ? Ji : Qi)(e) : (e.local ? no : to)(e, r, n)) }, attrTween: function (t, n) { var e = "attr." + t; if (arguments.length < 2) return (e = this.tween(e)) && e._value; if (null == n) return this.tween(e, null); if ("function" != typeof n) throw new Error; var r = It(t); return this.tween(e, (r.local ? io : oo)(r, n)) }, style: function (t, n, e) { var r = "transform" == (t += "") ? ti : Ki; return null == n ? this.styleTween(t, function (t, n) { var e, r, i; return function () { var o = _n(this, t), a = (this.style.removeProperty(t), _n(this, t)); return o === a ? null : o === e && a === r ? i : i = n(e = o, r = a) } }(t, r)).on("end.style." + t, lo(t)) : "function" == typeof n ? this.styleTween(t, function (t, n, e) { var r, i, o; return function () { var a = _n(this, t), u = e(this), c = u + ""; return null == u && (this.style.removeProperty(t), c = u = _n(this, t)), a === c ? null : a === r && c === i ? o : (i = c, o = n(r = a, u)) } }(t, r, Zi(this, "style." + t, n))).each(function (t, n) { var e, r, i, o, a = "style." + n, u = "end." + a; return function () { var c = Hi(this, t), f = c.on, s = null == c.value[a] ? o || (o = lo(n)) : void 0; f === e && i === s || (r = (e = f).copy()).on(u, i = s), c.on = r } }(this._id, t)) : this.styleTween(t, function (t, n, e) { var r, i, o = e + ""; return function () { var a = _n(this, t); return a === o ? null : a === r ? i : i = n(r = a, e) } }(t, r, n), e).on("end.style." + t, null) }, styleTween: function (t, n, e) { var r = "style." + (t += ""); if (arguments.length < 2) return (r = this.tween(r)) && r._value; if (null == n) return this.tween(r, null); if ("function" != typeof n) throw new Error; return this.tween(r, function (t, n, e) { var r, i; function o() { var o = n.apply(this, arguments); return o !== i && (r = (i = o) && function (t, n, e) { return function (r) { this.style.setProperty(t, n.call(this, r), e) } }(t, o, e)), r } return o._value = n, o }(t, n, null == e ? "" : e)) }, text: function (t) { return this.tween("text", "function" == typeof t ? function (t) { return function () { var n = t(this); this.textContent = null == n ? "" : n } }(Zi(this, "text", t)) : function (t) { return function () { this.textContent = t } }(null == t ? "" : t + "")) }, textTween: function (t) { var n = "text"; if (arguments.length < 1) return (n = this.tween(n)) && n._value; if (null == t) return this.tween(n, null); if ("function" != typeof t) throw new Error; return this.tween(n, function (t) { var n, e; function r() { var r = t.apply(this, arguments); return r !== e && (n = (e = r) && function (t) { return function (n) { this.textContent = t.call(this, n) } }(r)), n } return r._value = t, r }(t)) }, remove: function () { return this.on("end.remove", function (t) { return function () { var n = this.parentNode; for (var e in this.__transition) if (+e !== t) return; n && n.removeChild(this) } }(this._id)) }, tween: function (t, n) { var e = this._id; if (t += "", arguments.length < 2) { for (var r, i = Xi(this.node(), e).tween, o = 0, a = i.length; o < a; ++o)if ((r = i[o]).name === t) return r.value; return null } return this.each((null == n ? Vi : Wi)(e, t, n)) }, delay: function (t) { var n = this._id; return arguments.length ? this.each(("function" == typeof t ? ao : uo)(n, t)) : Xi(this.node(), n).delay }, duration: function (t) { var n = this._id; return arguments.length ? this.each(("function" == typeof t ? co : fo)(n, t)) : Xi(this.node(), n).duration }, ease: function (t) { var n = this._id; return arguments.length ? this.each(function (t, n) { if ("function" != typeof n) throw new Error; return function () { Hi(this, t).ease = n } }(n, t)) : Xi(this.node(), n).ease }, easeVarying: function (t) { if ("function" != typeof t) throw new Error; return this.each(function (t, n) { return function () { var e = n.apply(this, arguments); if ("function" != typeof e) throw new Error; Hi(this, t).ease = e } }(this._id, t)) }, end: function () { var t, n, e = this, r = e._id, i = e.size(); return new Promise((function (o, a) { var u = { value: a }, c = { value: function () { 0 == --i && o() } }; e.each((function () { var e = Hi(this, r), i = e.on; i !== t && ((n = (t = i).copy())._.cancel.push(u), n._.interrupt.push(u), n._.end.push(c)), e.on = n })), 0 === i && o() })) }, [Symbol.iterator]: vo[Symbol.iterator] }; function _o(t) { return ((t *= 2) <= 1 ? t * t : --t * (2 - t) + 1) / 2 } function bo(t) { return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2 } var mo = function t(n) { function e(t) { return Math.pow(t, n) } return n = +n, e.exponent = t, e }(3), xo = function t(n) { function e(t) { return 1 - Math.pow(1 - t, n) } return n = +n, e.exponent = t, e }(3), wo = function t(n) { function e(t) { return ((t *= 2) <= 1 ? Math.pow(t, n) : 2 - Math.pow(2 - t, n)) / 2 } return n = +n, e.exponent = t, e }(3), Mo = Math.PI, To = Mo / 2; function Ao(t) { return (1 - Math.cos(Mo * t)) / 2 } function So(t) { return 1.0009775171065494 * (Math.pow(2, -10 * t) - .0009765625) } function Eo(t) { return ((t *= 2) <= 1 ? So(1 - t) : 2 - So(t - 1)) / 2 } function No(t) { return ((t *= 2) <= 1 ? 1 - Math.sqrt(1 - t * t) : Math.sqrt(1 - (t -= 2) * t) + 1) / 2 } var ko = 4 / 11, Co = 6 / 11, Po = 8 / 11, zo = 3 / 4, $o = 9 / 11, Do = 10 / 11, Ro = 15 / 16, Fo = 21 / 22, qo = 63 / 64, Uo = 1 / ko / ko; function Io(t) { return (t = +t) < ko ? Uo * t * t : t < Po ? Uo * (t -= Co) * t + zo : t < Do ? Uo * (t -= $o) * t + Ro : Uo * (t -= Fo) * t + qo } var Oo = 1.70158, Bo = function t(n) { function e(t) { return (t = +t) * t * (n * (t - 1) + t) } return n = +n, e.overshoot = t, e }(Oo), Yo = function t(n) { function e(t) { return --t * t * ((t + 1) * n + t) + 1 } return n = +n, e.overshoot = t, e }(Oo), Lo = function t(n) { function e(t) { return ((t *= 2) < 1 ? t * t * ((n + 1) * t - n) : (t -= 2) * t * ((n + 1) * t + n) + 2) / 2 } return n = +n, e.overshoot = t, e }(Oo), jo = 2 * Math.PI, Ho = function t(n, e) { var r = Math.asin(1 / (n = Math.max(1, n))) * (e /= jo); function i(t) { return n * So(- --t) * Math.sin((r - t) / e) } return i.amplitude = function (n) { return t(n, e * jo) }, i.period = function (e) { return t(n, e) }, i }(1, .3), Xo = function t(n, e) { var r = Math.asin(1 / (n = Math.max(1, n))) * (e /= jo); function i(t) { return 1 - n * So(t = +t) * Math.sin((t + r) / e) } return i.amplitude = function (n) { return t(n, e * jo) }, i.period = function (e) { return t(n, e) }, i }(1, .3), Go = function t(n, e) { var r = Math.asin(1 / (n = Math.max(1, n))) * (e /= jo); function i(t) { return ((t = 2 * t - 1) < 0 ? n * So(-t) * Math.sin((r - t) / e) : 2 - n * So(t) * Math.sin((r + t) / e)) / 2 } return i.amplitude = function (n) { return t(n, e * jo) }, i.period = function (e) { return t(n, e) }, i }(1, .3), Vo = { time: null, delay: 0, duration: 250, ease: bo }; function Wo(t, n) { for (var e; !(e = t.__transition) || !(e = e[n]);)if (!(t = t.parentNode)) throw new Error(`transition ${n} not found`); return e } Wn.prototype.interrupt = function (t) { return this.each((function () { Gi(this, t) })) }, Wn.prototype.transition = function (t) { var n, e; t instanceof po ? (n = t._id, t = t._name) : (n = yo(), (e = Vo).time = Ai(), t = null == t ? null : t + ""); for (var r = this._groups, i = r.length, o = 0; o < i; ++o)for (var a, u = r[o], c = u.length, f = 0; f < c; ++f)(a = u[f]) && Li(a, t, n, f, u, e || Wo(a, n)); return new po(r, this._parents, t, n) }; var Zo = [null]; var Ko = t => () => t; function Qo(t, { sourceEvent: n, target: e, selection: r, mode: i, dispatch: o }) { Object.defineProperties(this, { type: { value: t, enumerable: !0, configurable: !0 }, sourceEvent: { value: n, enumerable: !0, configurable: !0 }, target: { value: e, enumerable: !0, configurable: !0 }, selection: { value: r, enumerable: !0, configurable: !0 }, mode: { value: i, enumerable: !0, configurable: !0 }, _: { value: o } }) } function Jo(t) { t.preventDefault(), t.stopImmediatePropagation() } var ta = { name: "drag" }, na = { name: "space" }, ea = { name: "handle" }, ra = { name: "center" }; const { abs: ia, max: oa, min: aa } = Math; function ua(t) { return [+t[0], +t[1]] } function ca(t) { return [ua(t[0]), ua(t[1])] } var fa = { name: "x", handles: ["w", "e"].map(va), input: function (t, n) { return null == t ? null : [[+t[0], n[0][1]], [+t[1], n[1][1]]] }, output: function (t) { return t && [t[0][0], t[1][0]] } }, sa = { name: "y", handles: ["n", "s"].map(va), input: function (t, n) { return null == t ? null : [[n[0][0], +t[0]], [n[1][0], +t[1]]] }, output: function (t) { return t && [t[0][1], t[1][1]] } }, la = { name: "xy", handles: ["n", "w", "e", "s", "nw", "ne", "sw", "se"].map(va), input: function (t) { return null == t ? null : ca(t) }, output: function (t) { return t } }, ha = { overlay: "crosshair", selection: "move", n: "ns-resize", e: "ew-resize", s: "ns-resize", w: "ew-resize", nw: "nwse-resize", ne: "nesw-resize", se: "nwse-resize", sw: "nesw-resize" }, da = { e: "w", w: "e", nw: "ne", ne: "nw", se: "sw", sw: "se" }, pa = { n: "s", s: "n", nw: "sw", ne: "se", se: "ne", sw: "nw" }, ga = { overlay: 1, selection: 1, n: null, e: 1, s: null, w: -1, nw: -1, ne: 1, se: 1, sw: -1 }, ya = { overlay: 1, selection: 1, n: -1, e: null, s: 1, w: null, nw: -1, ne: -1, se: 1, sw: 1 }; function va(t) { return { type: t } } function _a(t) { return !t.ctrlKey && !t.button } function ba() { var t = this.ownerSVGElement || this; return t.hasAttribute("viewBox") ? [[(t = t.viewBox.baseVal).x, t.y], [t.x + t.width, t.y + t.height]] : [[0, 0], [t.width.baseVal.value, t.height.baseVal.value]] } function ma() { return navigator.maxTouchPoints || "ontouchstart" in this } function xa(t) { for (; !t.__brush;)if (!(t = t.parentNode)) return; return t.__brush } function wa(t) { var n, e = ba, r = _a, i = ma, o = !0, a = $t("start", "brush", "end"), u = 6; function c(n) { var e = n.property("__brush", g).selectAll(".overlay").data([va("overlay")]); e.enter().append("rect").attr("class", "overlay").attr("pointer-events", "all").attr("cursor", ha.overlay).merge(e).each((function () { var t = xa(this).extent; Zn(this).attr("x", t[0][0]).attr("y", t[0][1]).attr("width", t[1][0] - t[0][0]).attr("height", t[1][1] - t[0][1]) })), n.selectAll(".selection").data([va("selection")]).enter().append("rect").attr("class", "selection").attr("cursor", ha.selection).attr("fill", "#777").attr("fill-opacity", .3).attr("stroke", "#fff").attr("shape-rendering", "crispEdges"); var r = n.selectAll(".handle").data(t.handles, (function (t) { return t.type })); r.exit().remove(), r.enter().append("rect").attr("class", (function (t) { return "handle handle--" + t.type })).attr("cursor", (function (t) { return ha[t.type] })), n.each(f).attr("fill", "none").attr("pointer-events", "all").on("mousedown.brush", h).filter(i).on("touchstart.brush", h).on("touchmove.brush", d).on("touchend.brush touchcancel.brush", p).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)") } function f() { var t = Zn(this), n = xa(this).selection; n ? (t.selectAll(".selection").style("display", null).attr("x", n[0][0]).attr("y", n[0][1]).attr("width", n[1][0] - n[0][0]).attr("height", n[1][1] - n[0][1]), t.selectAll(".handle").style("display", null).attr("x", (function (t) { return "e" === t.type[t.type.length - 1] ? n[1][0] - u / 2 : n[0][0] - u / 2 })).attr("y", (function (t) { return "s" === t.type[0] ? n[1][1] - u / 2 : n[0][1] - u / 2 })).attr("width", (function (t) { return "n" === t.type || "s" === t.type ? n[1][0] - n[0][0] + u : u })).attr("height", (function (t) { return "e" === t.type || "w" === t.type ? n[1][1] - n[0][1] + u : u }))) : t.selectAll(".selection,.handle").style("display", "none").attr("x", null).attr("y", null).attr("width", null).attr("height", null) } function s(t, n, e) { var r = t.__brush.emitter; return !r || e && r.clean ? new l(t, n, e) : r } function l(t, n, e) { this.that = t, this.args = n, this.state = t.__brush, this.active = 0, this.clean = e } function h(e) { if ((!n || e.touches) && r.apply(this, arguments)) { var i, a, u, c, l, h, d, p, g, y, v, _ = this, b = e.target.__data__.type, m = "selection" === (o && e.metaKey ? b = "overlay" : b) ? ta : o && e.altKey ? ra : ea, x = t === sa ? null : ga[b], w = t === fa ? null : ya[b], M = xa(_), T = M.extent, A = M.selection, S = T[0][0], E = T[0][1], N = T[1][0], k = T[1][1], C = 0, P = 0, z = x && w && o && e.shiftKey, $ = Array.from(e.touches || [e], (t => { const n = t.identifier; return (t = ne(t, _)).point0 = t.slice(), t.identifier = n, t })); Gi(_); var D = s(_, arguments, !0).beforestart(); if ("overlay" === b) { A && (g = !0); const n = [$[0], $[1] || $[0]]; M.selection = A = [[i = t === sa ? S : aa(n[0][0], n[1][0]), u = t === fa ? E : aa(n[0][1], n[1][1])], [l = t === sa ? N : oa(n[0][0], n[1][0]), d = t === fa ? k : oa(n[0][1], n[1][1])]], $.length > 1 && I(e) } else i = A[0][0], u = A[0][1], l = A[1][0], d = A[1][1]; a = i, c = u, h = l, p = d; var R = Zn(_).attr("pointer-events", "none"), F = R.selectAll(".overlay").attr("cursor", ha[b]); if (e.touches) D.moved = U, D.ended = O; else { var q = Zn(e.view).on("mousemove.brush", U, !0).on("mouseup.brush", O, !0); o && q.on("keydown.brush", (function (t) { switch (t.keyCode) { case 16: z = x && w; break; case 18: m === ea && (x && (l = h - C * x, i = a + C * x), w && (d = p - P * w, u = c + P * w), m = ra, I(t)); break; case 32: m !== ea && m !== ra || (x < 0 ? l = h - C : x > 0 && (i = a - C), w < 0 ? d = p - P : w > 0 && (u = c - P), m = na, F.attr("cursor", ha.selection), I(t)); break; default: return }Jo(t) }), !0).on("keyup.brush", (function (t) { switch (t.keyCode) { case 16: z && (y = v = z = !1, I(t)); break; case 18: m === ra && (x < 0 ? l = h : x > 0 && (i = a), w < 0 ? d = p : w > 0 && (u = c), m = ea, I(t)); break; case 32: m === na && (t.altKey ? (x && (l = h - C * x, i = a + C * x), w && (d = p - P * w, u = c + P * w), m = ra) : (x < 0 ? l = h : x > 0 && (i = a), w < 0 ? d = p : w > 0 && (u = c), m = ea), F.attr("cursor", ha[b]), I(t)); break; default: return }Jo(t) }), !0), ae(e.view) } f.call(_), D.start(e, m.name) } function U(t) { for (const n of t.changedTouches || [t]) for (const t of $) t.identifier === n.identifier && (t.cur = ne(n, _)); if (z && !y && !v && 1 === $.length) { const t = $[0]; ia(t.cur[0] - t[0]) > ia(t.cur[1] - t[1]) ? v = !0 : y = !0 } for (const t of $) t.cur && (t[0] = t.cur[0], t[1] = t.cur[1]); g = !0, Jo(t), I(t) } function I(t) { const n = $[0], e = n.point0; var r; switch (C = n[0] - e[0], P = n[1] - e[1], m) { case na: case ta: x && (C = oa(S - i, aa(N - l, C)), a = i + C, h = l + C), w && (P = oa(E - u, aa(k - d, P)), c = u + P, p = d + P); break; case ea: $[1] ? (x && (a = oa(S, aa(N, $[0][0])), h = oa(S, aa(N, $[1][0])), x = 1), w && (c = oa(E, aa(k, $[0][1])), p = oa(E, aa(k, $[1][1])), w = 1)) : (x < 0 ? (C = oa(S - i, aa(N - i, C)), a = i + C, h = l) : x > 0 && (C = oa(S - l, aa(N - l, C)), a = i, h = l + C), w < 0 ? (P = oa(E - u, aa(k - u, P)), c = u + P, p = d) : w > 0 && (P = oa(E - d, aa(k - d, P)), c = u, p = d + P)); break; case ra: x && (a = oa(S, aa(N, i - C * x)), h = oa(S, aa(N, l + C * x))), w && (c = oa(E, aa(k, u - P * w)), p = oa(E, aa(k, d + P * w))) }h < a && (x *= -1, r = i, i = l, l = r, r = a, a = h, h = r, b in da && F.attr("cursor", ha[b = da[b]])), p < c && (w *= -1, r = u, u = d, d = r, r = c, c = p, p = r, b in pa && F.attr("cursor", ha[b = pa[b]])), M.selection && (A = M.selection), y && (a = A[0][0], h = A[1][0]), v && (c = A[0][1], p = A[1][1]), A[0][0] === a && A[0][1] === c && A[1][0] === h && A[1][1] === p || (M.selection = [[a, c], [h, p]], f.call(_), D.brush(t, m.name)) } function O(t) { if (function (t) { t.stopImmediatePropagation() }(t), t.touches) { if (t.touches.length) return; n && clearTimeout(n), n = setTimeout((function () { n = null }), 500) } else ue(t.view, g), q.on("keydown.brush keyup.brush mousemove.brush mouseup.brush", null); R.attr("pointer-events", "all"), F.attr("cursor", ha.overlay), M.selection && (A = M.selection), function (t) { return t[0][0] === t[1][0] || t[0][1] === t[1][1] }(A) && (M.selection = null, f.call(_)), D.end(t, m.name) } } function d(t) { s(this, arguments).moved(t) } function p(t) { s(this, arguments).ended(t) } function g() { var n = this.__brush || { selection: null }; return n.extent = ca(e.apply(this, arguments)), n.dim = t, n } return c.move = function (n, e, r) { n.tween ? n.on("start.brush", (function (t) { s(this, arguments).beforestart().start(t) })).on("interrupt.brush end.brush", (function (t) { s(this, arguments).end(t) })).tween("brush", (function () { var n = this, r = n.__brush, i = s(n, arguments), o = r.selection, a = t.input("function" == typeof e ? e.apply(this, arguments) : e, r.extent), u = Gr(o, a); function c(t) { r.selection = 1 === t && null === a ? null : u(t), f.call(n), i.brush() } return null !== o && null !== a ? c : c(1) })) : n.each((function () { var n = this, i = arguments, o = n.__brush, a = t.input("function" == typeof e ? e.apply(n, i) : e, o.extent), u = s(n, i).beforestart(); Gi(n), o.selection = null === a ? null : a, f.call(n), u.start(r).brush(r).end(r) })) }, c.clear = function (t, n) { c.move(t, null, n) }, l.prototype = { beforestart: function () { return 1 == ++this.active && (this.state.emitter = this, this.starting = !0), this }, start: function (t, n) { return this.starting ? (this.starting = !1, this.emit("start", t, n)) : this.emit("brush", t), this }, brush: function (t, n) { return this.emit("brush", t, n), this }, end: function (t, n) { return 0 == --this.active && (delete this.state.emitter, this.emit("end", t, n)), this }, emit: function (n, e, r) { var i = Zn(this.that).datum(); a.call(n, this.that, new Qo(n, { sourceEvent: e, target: c, selection: t.output(this.state.selection), mode: r, dispatch: a }), i) } }, c.extent = function (t) { return arguments.length ? (e = "function" == typeof t ? t : Ko(ca(t)), c) : e }, c.filter = function (t) { return arguments.length ? (r = "function" == typeof t ? t : Ko(!!t), c) : r }, c.touchable = function (t) { return arguments.length ? (i = "function" == typeof t ? t : Ko(!!t), c) : i }, c.handleSize = function (t) { return arguments.length ? (u = +t, c) : u }, c.keyModifiers = function (t) { return arguments.length ? (o = !!t, c) : o }, c.on = function () { var t = a.on.apply(a, arguments); return t === a ? c : t }, c } var Ma = Math.abs, Ta = Math.cos, Aa = Math.sin, Sa = Math.PI, Ea = Sa / 2, Na = 2 * Sa, ka = Math.max, Ca = 1e-12; function Pa(t, n) { return Array.from({ length: n - t }, ((n, e) => t + e)) } function za(t, n) { var e = 0, r = null, i = null, o = null; function a(a) { var u, c = a.length, f = new Array(c), s = Pa(0, c), l = new Array(c * c), h = new Array(c), d = 0; a = Float64Array.from({ length: c * c }, n ? (t, n) => a[n % c][n / c | 0] : (t, n) => a[n / c | 0][n % c]); for (let n = 0; n < c; ++n) { let e = 0; for (let r = 0; r < c; ++r)e += a[n * c + r] + t * a[r * c + n]; d += f[n] = e } u = (d = ka(0, Na - e * c) / d) ? e : Na / c; { let n = 0; r && s.sort(((t, n) => r(f[t], f[n]))); for (const e of s) { const r = n; if (t) { const t = Pa(1 + ~c, c).filter((t => t < 0 ? a[~t * c + e] : a[e * c + t])); i && t.sort(((t, n) => i(t < 0 ? -a[~t * c + e] : a[e * c + t], n < 0 ? -a[~n * c + e] : a[e * c + n]))); for (const r of t) if (r < 0) { (l[~r * c + e] || (l[~r * c + e] = { source: null, target: null })).target = { index: e, startAngle: n, endAngle: n += a[~r * c + e] * d, value: a[~r * c + e] } } else { (l[e * c + r] || (l[e * c + r] = { source: null, target: null })).source = { index: e, startAngle: n, endAngle: n += a[e * c + r] * d, value: a[e * c + r] } } h[e] = { index: e, startAngle: r, endAngle: n, value: f[e] } } else { const t = Pa(0, c).filter((t => a[e * c + t] || a[t * c + e])); i && t.sort(((t, n) => i(a[e * c + t], a[e * c + n]))); for (const r of t) { let t; if (e < r ? (t = l[e * c + r] || (l[e * c + r] = { source: null, target: null }), t.source = { index: e, startAngle: n, endAngle: n += a[e * c + r] * d, value: a[e * c + r] }) : (t = l[r * c + e] || (l[r * c + e] = { source: null, target: null }), t.target = { index: e, startAngle: n, endAngle: n += a[e * c + r] * d, value: a[e * c + r] }, e === r && (t.source = t.target)), t.source && t.target && t.source.value < t.target.value) { const n = t.source; t.source = t.target, t.target = n } } h[e] = { index: e, startAngle: r, endAngle: n, value: f[e] } } n += u } } return (l = Object.values(l)).groups = h, o ? l.sort(o) : l } return a.padAngle = function (t) { return arguments.length ? (e = ka(0, t), a) : e }, a.sortGroups = function (t) { return arguments.length ? (r = t, a) : r }, a.sortSubgroups = function (t) { return arguments.length ? (i = t, a) : i }, a.sortChords = function (t) { return arguments.length ? (null == t ? o = null : (n = t, o = function (t, e) { return n(t.source.value + t.target.value, e.source.value + e.target.value) })._ = t, a) : o && o._; var n }, a } const $a = Math.PI, Da = 2 * $a, Ra = 1e-6, Fa = Da - Ra; function qa(t) { this._ += t[0]; for (let n = 1, e = t.length; n < e; ++n)this._ += arguments[n] + t[n] } let Ua = class { constructor(t) { this._x0 = this._y0 = this._x1 = this._y1 = null, this._ = "", this._append = null == t ? qa : function (t) { let n = Math.floor(t); if (!(n >= 0)) throw new Error(`invalid digits: ${t}`); if (n > 15) return qa; const e = 10 ** n; return function (t) { this._ += t[0]; for (let n = 1, r = t.length; n < r; ++n)this._ += Math.round(arguments[n] * e) / e + t[n] } }(t) } moveTo(t, n) { this._append`M${this._x0 = this._x1 = +t},${this._y0 = this._y1 = +n}` } closePath() { null !== this._x1 && (this._x1 = this._x0, this._y1 = this._y0, this._append`Z`) } lineTo(t, n) { this._append`L${this._x1 = +t},${this._y1 = +n}` } quadraticCurveTo(t, n, e, r) { this._append`Q${+t},${+n},${this._x1 = +e},${this._y1 = +r}` } bezierCurveTo(t, n, e, r, i, o) { this._append`C${+t},${+n},${+e},${+r},${this._x1 = +i},${this._y1 = +o}` } arcTo(t, n, e, r, i) { if (t = +t, n = +n, e = +e, r = +r, (i = +i) < 0) throw new Error(`negative radius: ${i}`); let o = this._x1, a = this._y1, u = e - t, c = r - n, f = o - t, s = a - n, l = f * f + s * s; if (null === this._x1) this._append`M${this._x1 = t},${this._y1 = n}`; else if (l > Ra) if (Math.abs(s * u - c * f) > Ra && i) { let h = e - o, d = r - a, p = u * u + c * c, g = h * h + d * d, y = Math.sqrt(p), v = Math.sqrt(l), _ = i * Math.tan(($a - Math.acos((p + l - g) / (2 * y * v))) / 2), b = _ / v, m = _ / y; Math.abs(b - 1) > Ra && this._append`L${t + b * f},${n + b * s}`, this._append`A${i},${i},0,0,${+(s * h > f * d)},${this._x1 = t + m * u},${this._y1 = n + m * c}` } else this._append`L${this._x1 = t},${this._y1 = n}`; else; } arc(t, n, e, r, i, o) { if (t = +t, n = +n, o = !!o, (e = +e) < 0) throw new Error(`negative radius: ${e}`); let a = e * Math.cos(r), u = e * Math.sin(r), c = t + a, f = n + u, s = 1 ^ o, l = o ? r - i : i - r; null === this._x1 ? this._append`M${c},${f}` : (Math.abs(this._x1 - c) > Ra || Math.abs(this._y1 - f) > Ra) && this._append`L${c},${f}`, e && (l < 0 && (l = l % Da + Da), l > Fa ? this._append`A${e},${e},0,1,${s},${t - a},${n - u}A${e},${e},0,1,${s},${this._x1 = c},${this._y1 = f}` : l > Ra && this._append`A${e},${e},0,${+(l >= $a)},${s},${this._x1 = t + e * Math.cos(i)},${this._y1 = n + e * Math.sin(i)}`) } rect(t, n, e, r) { this._append`M${this._x0 = this._x1 = +t},${this._y0 = this._y1 = +n}h${e = +e}v${+r}h${-e}Z` } toString() { return this._ } }; function Ia() { return new Ua } Ia.prototype = Ua.prototype; var Oa = Array.prototype.slice; function Ba(t) { return function () { return t } } function Ya(t) { return t.source } function La(t) { return t.target } function ja(t) { return t.radius } function Ha(t) { return t.startAngle } function Xa(t) { return t.endAngle } function Ga() { return 0 } function Va() { return 10 } function Wa(t) { var n = Ya, e = La, r = ja, i = ja, o = Ha, a = Xa, u = Ga, c = null; function f() { var f, s = n.apply(this, arguments), l = e.apply(this, arguments), h = u.apply(this, arguments) / 2, d = Oa.call(arguments), p = +r.apply(this, (d[0] = s, d)), g = o.apply(this, d) - Ea, y = a.apply(this, d) - Ea, v = +i.apply(this, (d[0] = l, d)), _ = o.apply(this, d) - Ea, b = a.apply(this, d) - Ea; if (c || (c = f = Ia()), h > Ca && (Ma(y - g) > 2 * h + Ca ? y > g ? (g += h, y -= h) : (g -= h, y += h) : g = y = (g + y) / 2, Ma(b - _) > 2 * h + Ca ? b > _ ? (_ += h, b -= h) : (_ -= h, b += h) : _ = b = (_ + b) / 2), c.moveTo(p * Ta(g), p * Aa(g)), c.arc(0, 0, p, g, y), g !== _ || y !== b) if (t) { var m = v - +t.apply(this, arguments), x = (_ + b) / 2; c.quadraticCurveTo(0, 0, m * Ta(_), m * Aa(_)), c.lineTo(v * Ta(x), v * Aa(x)), c.lineTo(m * Ta(b), m * Aa(b)) } else c.quadraticCurveTo(0, 0, v * Ta(_), v * Aa(_)), c.arc(0, 0, v, _, b); if (c.quadraticCurveTo(0, 0, p * Ta(g), p * Aa(g)), c.closePath(), f) return c = null, f + "" || null } return t && (f.headRadius = function (n) { return arguments.length ? (t = "function" == typeof n ? n : Ba(+n), f) : t }), f.radius = function (t) { return arguments.length ? (r = i = "function" == typeof t ? t : Ba(+t), f) : r }, f.sourceRadius = function (t) { return arguments.length ? (r = "function" == typeof t ? t : Ba(+t), f) : r }, f.targetRadius = function (t) { return arguments.length ? (i = "function" == typeof t ? t : Ba(+t), f) : i }, f.startAngle = function (t) { return arguments.length ? (o = "function" == typeof t ? t : Ba(+t), f) : o }, f.endAngle = function (t) { return arguments.length ? (a = "function" == typeof t ? t : Ba(+t), f) : a }, f.padAngle = function (t) { return arguments.length ? (u = "function" == typeof t ? t : Ba(+t), f) : u }, f.source = function (t) { return arguments.length ? (n = t, f) : n }, f.target = function (t) { return arguments.length ? (e = t, f) : e }, f.context = function (t) { return arguments.length ? (c = null == t ? null : t, f) : c }, f } var Za = Array.prototype.slice; function Ka(t, n) { return t - n } var Qa = t => () => t; function Ja(t, n) { for (var e, r = -1, i = n.length; ++r < i;)if (e = tu(t, n[r])) return e; return 0 } function tu(t, n) { for (var e = n[0], r = n[1], i = -1, o = 0, a = t.length, u = a - 1; o < a; u = o++) { var c = t[o], f = c[0], s = c[1], l = t[u], h = l[0], d = l[1]; if (nu(c, l, n)) return 0; s > r != d > r && e < (h - f) * (r - s) / (d - s) + f && (i = -i) } return i } function nu(t, n, e) { var r, i, o, a; return function (t, n, e) { return (n[0] - t[0]) * (e[1] - t[1]) == (e[0] - t[0]) * (n[1] - t[1]) }(t, n, e) && (i = t[r = +(t[0] === n[0])], o = e[r], a = n[r], i <= o && o <= a || a <= o && o <= i) } function eu() { } var ru = [[], [[[1, 1.5], [.5, 1]]], [[[1.5, 1], [1, 1.5]]], [[[1.5, 1], [.5, 1]]], [[[1, .5], [1.5, 1]]], [[[1, 1.5], [.5, 1]], [[1, .5], [1.5, 1]]], [[[1, .5], [1, 1.5]]], [[[1, .5], [.5, 1]]], [[[.5, 1], [1, .5]]], [[[1, 1.5], [1, .5]]], [[[.5, 1], [1, .5]], [[1.5, 1], [1, 1.5]]], [[[1.5, 1], [1, .5]]], [[[.5, 1], [1.5, 1]]], [[[1, 1.5], [1.5, 1]]], [[[.5, 1], [1, 1.5]]], []]; function iu() { var t = 1, n = 1, e = K, r = u; function i(t) { var n = e(t); if (Array.isArray(n)) n = n.slice().sort(Ka); else { const e = M(t, ou); for (n = G(...Z(e[0], e[1], n), n); n[n.length - 1] >= e[1];)n.pop(); for (; n[1] < e[0];)n.shift() } return n.map((n => o(t, n))) } function o(e, i) { const o = null == i ? NaN : +i; if (isNaN(o)) throw new Error(`invalid value: ${i}`); var u = [], c = []; return function (e, r, i) { var o, u, c, f, s, l, h = new Array, d = new Array; o = u = -1, f = au(e[0], r), ru[f << 1].forEach(p); for (; ++o < t - 1;)c = f, f = au(e[o + 1], r), ru[c | f << 1].forEach(p); ru[f << 0].forEach(p); for (; ++u < n - 1;) { for (o = -1, f = au(e[u * t + t], r), s = au(e[u * t], r), ru[f << 1 | s << 2].forEach(p); ++o < t - 1;)c = f, f = au(e[u * t + t + o + 1], r), l = s, s = au(e[u * t + o + 1], r), ru[c | f << 1 | s << 2 | l << 3].forEach(p); ru[f | s << 3].forEach(p) } o = -1, s = e[u * t] >= r, ru[s << 2].forEach(p); for (; ++o < t - 1;)l = s, s = au(e[u * t + o + 1], r), ru[s << 2 | l << 3].forEach(p); function p(t) { var n, e, r = [t[0][0] + o, t[0][1] + u], c = [t[1][0] + o, t[1][1] + u], f = a(r), s = a(c); (n = d[f]) ? (e = h[s]) ? (delete d[n.end], delete h[e.start], n === e ? (n.ring.push(c), i(n.ring)) : h[n.start] = d[e.end] = { start: n.start, end: e.end, ring: n.ring.concat(e.ring) }) : (delete d[n.end], n.ring.push(c), d[n.end = s] = n) : (n = h[s]) ? (e = d[f]) ? (delete h[n.start], delete d[e.end], n === e ? (n.ring.push(c), i(n.ring)) : h[e.start] = d[n.end] = { start: e.start, end: n.end, ring: e.ring.concat(n.ring) }) : (delete h[n.start], n.ring.unshift(r), h[n.start = f] = n) : h[f] = d[s] = { start: f, end: s, ring: [r, c] } } ru[s << 3].forEach(p) }(e, o, (function (t) { r(t, e, o), function (t) { for (var n = 0, e = t.length, r = t[e - 1][1] * t[0][0] - t[e - 1][0] * t[0][1]; ++n < e;)r += t[n - 1][1] * t[n][0] - t[n - 1][0] * t[n][1]; return r }(t) > 0 ? u.push([t]) : c.push(t) })), c.forEach((function (t) { for (var n, e = 0, r = u.length; e < r; ++e)if (-1 !== Ja((n = u[e])[0], t)) return void n.push(t) })), { type: "MultiPolygon", value: i, coordinates: u } } function a(n) { return 2 * n[0] + n[1] * (t + 1) * 4 } function u(e, r, i) { e.forEach((function (e) { var o = e[0], a = e[1], u = 0 | o, c = 0 | a, f = uu(r[c * t + u]); o > 0 && o < t && u === o && (e[0] = cu(o, uu(r[c * t + u - 1]), f, i)), a > 0 && a < n && c === a && (e[1] = cu(a, uu(r[(c - 1) * t + u]), f, i)) })) } return i.contour = o, i.size = function (e) { if (!arguments.length) return [t, n]; var r = Math.floor(e[0]), o = Math.floor(e[1]); if (!(r >= 0 && o >= 0)) throw new Error("invalid size"); return t = r, n = o, i }, i.thresholds = function (t) { return arguments.length ? (e = "function" == typeof t ? t : Array.isArray(t) ? Qa(Za.call(t)) : Qa(t), i) : e }, i.smooth = function (t) { return arguments.length ? (r = t ? u : eu, i) : r === u }, i } function ou(t) { return isFinite(t) ? t : NaN } function au(t, n) { return null != t && +t >= n } function uu(t) { return null == t || isNaN(t = +t) ? -1 / 0 : t } function cu(t, n, e, r) { const i = r - n, o = e - n, a = isFinite(i) || isFinite(o) ? i / o : Math.sign(i) / Math.sign(o); return isNaN(a) ? t : t + a - .5 } function fu(t) { return t[0] } function su(t) { return t[1] } function lu() { return 1 } const hu = 134217729, du = 33306690738754706e-32; function pu(t, n, e, r, i) { let o, a, u, c, f = n[0], s = r[0], l = 0, h = 0; s > f == s > -f ? (o = f, f = n[++l]) : (o = s, s = r[++h]); let d = 0; if (l < t && h < e) for (s > f == s > -f ? (a = f + o, u = o - (a - f), f = n[++l]) : (a = s + o, u = o - (a - s), s = r[++h]), o = a, 0 !== u && (i[d++] = u); l < t && h < e;)s > f == s > -f ? (a = o + f, c = a - o, u = o - (a - c) + (f - c), f = n[++l]) : (a = o + s, c = a - o, u = o - (a - c) + (s - c), s = r[++h]), o = a, 0 !== u && (i[d++] = u); for (; l < t;)a = o + f, c = a - o, u = o - (a - c) + (f - c), f = n[++l], o = a, 0 !== u && (i[d++] = u); for (; h < e;)a = o + s, c = a - o, u = o - (a - c) + (s - c), s = r[++h], o = a, 0 !== u && (i[d++] = u); return 0 === o && 0 !== d || (i[d++] = o), d } function gu(t) { return new Float64Array(t) } const yu = 22204460492503146e-32, vu = 11093356479670487e-47, _u = gu(4), bu = gu(8), mu = gu(12), xu = gu(16), wu = gu(4); function Mu(t, n, e, r, i, o) { const a = (n - o) * (e - i), u = (t - i) * (r - o), c = a - u, f = Math.abs(a + u); return Math.abs(c) >= 33306690738754716e-32 * f ? c : -function (t, n, e, r, i, o, a) { let u, c, f, s, l, h, d, p, g, y, v, _, b, m, x, w, M, T; const A = t - i, S = e - i, E = n - o, N = r - o; m = A * N, h = hu * A, d = h - (h - A), p = A - d, h = hu * N, g = h - (h - N), y = N - g, x = p * y - (m - d * g - p * g - d * y), w = E * S, h = hu * E, d = h - (h - E), p = E - d, h = hu * S, g = h - (h - S), y = S - g, M = p * y - (w - d * g - p * g - d * y), v = x - M, l = x - v, _u[0] = x - (v + l) + (l - M), _ = m + v, l = _ - m, b = m - (_ - l) + (v - l), v = b - w, l = b - v, _u[1] = b - (v + l) + (l - w), T = _ + v, l = T - _, _u[2] = _ - (T - l) + (v - l), _u[3] = T; let k = function (t, n) { let e = n[0]; for (let r = 1; r < t; r++)e += n[r]; return e }(4, _u), C = yu * a; if (k >= C || -k >= C) return k; if (l = t - A, u = t - (A + l) + (l - i), l = e - S, f = e - (S + l) + (l - i), l = n - E, c = n - (E + l) + (l - o), l = r - N, s = r - (N + l) + (l - o), 0 === u && 0 === c && 0 === f && 0 === s) return k; if (C = vu * a + du * Math.abs(k), k += A * s + N * u - (E * f + S * c), k >= C || -k >= C) return k; m = u * N, h = hu * u, d = h - (h - u), p = u - d, h = hu * N, g = h - (h - N), y = N - g, x = p * y - (m - d * g - p * g - d * y), w = c * S, h = hu * c, d = h - (h - c), p = c - d, h = hu * S, g = h - (h - S), y = S - g, M = p * y - (w - d * g - p * g - d * y), v = x - M, l = x - v, wu[0] = x - (v + l) + (l - M), _ = m + v, l = _ - m, b = m - (_ - l) + (v - l), v = b - w, l = b - v, wu[1] = b - (v + l) + (l - w), T = _ + v, l = T - _, wu[2] = _ - (T - l) + (v - l), wu[3] = T; const P = pu(4, _u, 4, wu, bu); m = A * s, h = hu * A, d = h - (h - A), p = A - d, h = hu * s, g = h - (h - s), y = s - g, x = p * y - (m - d * g - p * g - d * y), w = E * f, h = hu * E, d = h - (h - E), p = E - d, h = hu * f, g = h - (h - f), y = f - g, M = p * y - (w - d * g - p * g - d * y), v = x - M, l = x - v, wu[0] = x - (v + l) + (l - M), _ = m + v, l = _ - m, b = m - (_ - l) + (v - l), v = b - w, l = b - v, wu[1] = b - (v + l) + (l - w), T = _ + v, l = T - _, wu[2] = _ - (T - l) + (v - l), wu[3] = T; const z = pu(P, bu, 4, wu, mu); m = u * s, h = hu * u, d = h - (h - u), p = u - d, h = hu * s, g = h - (h - s), y = s - g, x = p * y - (m - d * g - p * g - d * y), w = c * f, h = hu * c, d = h - (h - c), p = c - d, h = hu * f, g = h - (h - f), y = f - g, M = p * y - (w - d * g - p * g - d * y), v = x - M, l = x - v, wu[0] = x - (v + l) + (l - M), _ = m + v, l = _ - m, b = m - (_ - l) + (v - l), v = b - w, l = b - v, wu[1] = b - (v + l) + (l - w), T = _ + v, l = T - _, wu[2] = _ - (T - l) + (v - l), wu[3] = T; const $ = pu(z, mu, 4, wu, xu); return xu[$ - 1] }(t, n, e, r, i, o, f) } const Tu = Math.pow(2, -52), Au = new Uint32Array(512); class Su { static from(t, n = zu, e = $u) { const r = t.length, i = new Float64Array(2 * r); for (let o = 0; o < r; o++) { const r = t[o]; i[2 * o] = n(r), i[2 * o + 1] = e(r) } return new Su(i) } constructor(t) { const n = t.length >> 1; if (n > 0 && "number" != typeof t[0]) throw new Error("Expected coords to contain numbers."); this.coords = t; const e = Math.max(2 * n - 5, 0); this._triangles = new Uint32Array(3 * e), this._halfedges = new Int32Array(3 * e), this._hashSize = Math.ceil(Math.sqrt(n)), this._hullPrev = new Uint32Array(n), this._hullNext = new Uint32Array(n), this._hullTri = new Uint32Array(n), this._hullHash = new Int32Array(this._hashSize).fill(-1), this._ids = new Uint32Array(n), this._dists = new Float64Array(n), this.update() } update() { const { coords: t, _hullPrev: n, _hullNext: e, _hullTri: r, _hullHash: i } = this, o = t.length >> 1; let a = 1 / 0, u = 1 / 0, c = -1 / 0, f = -1 / 0; for (let n = 0; n < o; n++) { const e = t[2 * n], r = t[2 * n + 1]; e < a && (a = e), r < u && (u = r), e > c && (c = e), r > f && (f = r), this._ids[n] = n } const s = (a + c) / 2, l = (u + f) / 2; let h, d, p, g = 1 / 0; for (let n = 0; n < o; n++) { const e = Eu(s, l, t[2 * n], t[2 * n + 1]); e < g && (h = n, g = e) } const y = t[2 * h], v = t[2 * h + 1]; g = 1 / 0; for (let n = 0; n < o; n++) { if (n === h) continue; const e = Eu(y, v, t[2 * n], t[2 * n + 1]); e < g && e > 0 && (d = n, g = e) } let _ = t[2 * d], b = t[2 * d + 1], m = 1 / 0; for (let n = 0; n < o; n++) { if (n === h || n === d) continue; const e = ku(y, v, _, b, t[2 * n], t[2 * n + 1]); e < m && (p = n, m = e) } let x = t[2 * p], w = t[2 * p + 1]; if (m === 1 / 0) { for (let n = 0; n < o; n++)this._dists[n] = t[2 * n] - t[0] || t[2 * n + 1] - t[1]; Cu(this._ids, this._dists, 0, o - 1); const n = new Uint32Array(o); let e = 0; for (let t = 0, r = -1 / 0; t < o; t++) { const i = this._ids[t]; this._dists[i] > r && (n[e++] = i, r = this._dists[i]) } return this.hull = n.subarray(0, e), this.triangles = new Uint32Array(0), void (this.halfedges = new Uint32Array(0)) } if (Mu(y, v, _, b, x, w) < 0) { const t = d, n = _, e = b; d = p, _ = x, b = w, p = t, x = n, w = e } const M = function (t, n, e, r, i, o) { const a = e - t, u = r - n, c = i - t, f = o - n, s = a * a + u * u, l = c * c + f * f, h = .5 / (a * f - u * c), d = t + (f * s - u * l) * h, p = n + (a * l - c * s) * h; return { x: d, y: p } }(y, v, _, b, x, w); this._cx = M.x, this._cy = M.y; for (let n = 0; n < o; n++)this._dists[n] = Eu(t[2 * n], t[2 * n + 1], M.x, M.y); Cu(this._ids, this._dists, 0, o - 1), this._hullStart = h; let T = 3; e[h] = n[p] = d, e[d] = n[h] = p, e[p] = n[d] = h, r[h] = 0, r[d] = 1, r[p] = 2, i.fill(-1), i[this._hashKey(y, v)] = h, i[this._hashKey(_, b)] = d, i[this._hashKey(x, w)] = p, this.trianglesLen = 0, this._addTriangle(h, d, p, -1, -1, -1); for (let o, a, u = 0; u < this._ids.length; u++) { const c = this._ids[u], f = t[2 * c], s = t[2 * c + 1]; if (u > 0 && Math.abs(f - o) <= Tu && Math.abs(s - a) <= Tu) continue; if (o = f, a = s, c === h || c === d || c === p) continue; let l = 0; for (let t = 0, n = this._hashKey(f, s); t < this._hashSize && (l = i[(n + t) % this._hashSize], -1 === l || l === e[l]); t++); l = n[l]; let g, y = l; for (; g = e[y], Mu(f, s, t[2 * y], t[2 * y + 1], t[2 * g], t[2 * g + 1]) >= 0;)if (y = g, y === l) { y = -1; break } if (-1 === y) continue; let v = this._addTriangle(y, c, e[y], -1, -1, r[y]); r[c] = this._legalize(v + 2), r[y] = v, T++; let _ = e[y]; for (; g = e[_], Mu(f, s, t[2 * _], t[2 * _ + 1], t[2 * g], t[2 * g + 1]) < 0;)v = this._addTriangle(_, c, g, r[c], -1, r[_]), r[c] = this._legalize(v + 2), e[_] = _, T--, _ = g; if (y === l) for (; g = n[y], Mu(f, s, t[2 * g], t[2 * g + 1], t[2 * y], t[2 * y + 1]) < 0;)v = this._addTriangle(g, c, y, -1, r[y], r[g]), this._legalize(v + 2), r[g] = v, e[y] = y, T--, y = g; this._hullStart = n[c] = y, e[y] = n[_] = c, e[c] = _, i[this._hashKey(f, s)] = c, i[this._hashKey(t[2 * y], t[2 * y + 1])] = y } this.hull = new Uint32Array(T); for (let t = 0, n = this._hullStart; t < T; t++)this.hull[t] = n, n = e[n]; this.triangles = this._triangles.subarray(0, this.trianglesLen), this.halfedges = this._halfedges.subarray(0, this.trianglesLen) } _hashKey(t, n) { return Math.floor(function (t, n) { const e = t / (Math.abs(t) + Math.abs(n)); return (n > 0 ? 3 - e : 1 + e) / 4 }(t - this._cx, n - this._cy) * this._hashSize) % this._hashSize } _legalize(t) { const { _triangles: n, _halfedges: e, coords: r } = this; let i = 0, o = 0; for (; ;) { const a = e[t], u = t - t % 3; if (o = u + (t + 2) % 3, -1 === a) { if (0 === i) break; t = Au[--i]; continue } const c = a - a % 3, f = u + (t + 1) % 3, s = c + (a + 2) % 3, l = n[o], h = n[t], d = n[f], p = n[s]; if (Nu(r[2 * l], r[2 * l + 1], r[2 * h], r[2 * h + 1], r[2 * d], r[2 * d + 1], r[2 * p], r[2 * p + 1])) { n[t] = p, n[a] = l; const r = e[s]; if (-1 === r) { let n = this._hullStart; do { if (this._hullTri[n] === s) { this._hullTri[n] = t; break } n = this._hullPrev[n] } while (n !== this._hullStart) } this._link(t, r), this._link(a, e[o]), this._link(o, s); const u = c + (a + 1) % 3; i < Au.length && (Au[i++] = u) } else { if (0 === i) break; t = Au[--i] } } return o } _link(t, n) { this._halfedges[t] = n, -1 !== n && (this._halfedges[n] = t) } _addTriangle(t, n, e, r, i, o) { const a = this.trianglesLen; return this._triangles[a] = t, this._triangles[a + 1] = n, this._triangles[a + 2] = e, this._link(a, r), this._link(a + 1, i), this._link(a + 2, o), this.trianglesLen += 3, a } } function Eu(t, n, e, r) { const i = t - e, o = n - r; return i * i + o * o } function Nu(t, n, e, r, i, o, a, u) { const c = t - a, f = n - u, s = e - a, l = r - u, h = i - a, d = o - u, p = s * s + l * l, g = h * h + d * d; return c * (l * g - p * d) - f * (s * g - p * h) + (c * c + f * f) * (s * d - l * h) < 0 } function ku(t, n, e, r, i, o) { const a = e - t, u = r - n, c = i - t, f = o - n, s = a * a + u * u, l = c * c + f * f, h = .5 / (a * f - u * c), d = (f * s - u * l) * h, p = (a * l - c * s) * h; return d * d + p * p } function Cu(t, n, e, r) { if (r - e <= 20) for (let i = e + 1; i <= r; i++) { const r = t[i], o = n[r]; let a = i - 1; for (; a >= e && n[t[a]] > o;)t[a + 1] = t[a--]; t[a + 1] = r } else { let i = e + 1, o = r; Pu(t, e + r >> 1, i), n[t[e]] > n[t[r]] && Pu(t, e, r), n[t[i]] > n[t[r]] && Pu(t, i, r), n[t[e]] > n[t[i]] && Pu(t, e, i); const a = t[i], u = n[a]; for (; ;) { do { i++ } while (n[t[i]] < u); do { o-- } while (n[t[o]] > u); if (o < i) break; Pu(t, i, o) } t[e + 1] = t[o], t[o] = a, r - i + 1 >= o - e ? (Cu(t, n, i, r), Cu(t, n, e, o - 1)) : (Cu(t, n, e, o - 1), Cu(t, n, i, r)) } } function Pu(t, n, e) { const r = t[n]; t[n] = t[e], t[e] = r } function zu(t) { return t[0] } function $u(t) { return t[1] } const Du = 1e-6; class Ru { constructor() { this._x0 = this._y0 = this._x1 = this._y1 = null, this._ = "" } moveTo(t, n) { this._ += `M${this._x0 = this._x1 = +t},${this._y0 = this._y1 = +n}` } closePath() { null !== this._x1 && (this._x1 = this._x0, this._y1 = this._y0, this._ += "Z") } lineTo(t, n) { this._ += `L${this._x1 = +t},${this._y1 = +n}` } arc(t, n, e) { const r = (t = +t) + (e = +e), i = n = +n; if (e < 0) throw new Error("negative radius"); null === this._x1 ? this._ += `M${r},${i}` : (Math.abs(this._x1 - r) > Du || Math.abs(this._y1 - i) > Du) && (this._ += "L" + r + "," + i), e && (this._ += `A${e},${e},0,1,1,${t - e},${n}A${e},${e},0,1,1,${this._x1 = r},${this._y1 = i}`) } rect(t, n, e, r) { this._ += `M${this._x0 = this._x1 = +t},${this._y0 = this._y1 = +n}h${+e}v${+r}h${-e}Z` } value() { return this._ || null } } class Fu { constructor() { this._ = [] } moveTo(t, n) { this._.push([t, n]) } closePath() { this._.push(this._[0].slice()) } lineTo(t, n) { this._.push([t, n]) } value() { return this._.length ? this._ : null } } class qu { constructor(t, [n, e, r, i] = [0, 0, 960, 500]) { if (!((r = +r) >= (n = +n) && (i = +i) >= (e = +e))) throw new Error("invalid bounds"); this.delaunay = t, this._circumcenters = new Float64Array(2 * t.points.length), this.vectors = new Float64Array(2 * t.points.length), this.xmax = r, this.xmin = n, this.ymax = i, this.ymin = e, this._init() } update() { return this.delaunay.update(), this._init(), this } _init() { const { delaunay: { points: t, hull: n, triangles: e }, vectors: r } = this; let i, o; const a = this.circumcenters = this._circumcenters.subarray(0, e.length / 3 * 2); for (let r, u, c = 0, f = 0, s = e.length; c < s; c += 3, f += 2) { const s = 2 * e[c], l = 2 * e[c + 1], h = 2 * e[c + 2], d = t[s], p = t[s + 1], g = t[l], y = t[l + 1], v = t[h], _ = t[h + 1], b = g - d, m = y - p, x = v - d, w = _ - p, M = 2 * (b * w - m * x); if (Math.abs(M) < 1e-9) { if (void 0 === i) { i = o = 0; for (const e of n) i += t[2 * e], o += t[2 * e + 1]; i /= n.length, o /= n.length } const e = 1e9 * Math.sign((i - d) * w - (o - p) * x); r = (d + v) / 2 - e * w, u = (p + _) / 2 + e * x } else { const t = 1 / M, n = b * b + m * m, e = x * x + w * w; r = d + (w * n - m * e) * t, u = p + (b * e - x * n) * t } a[f] = r, a[f + 1] = u } let u, c, f, s = n[n.length - 1], l = 4 * s, h = t[2 * s], d = t[2 * s + 1]; r.fill(0); for (let e = 0; e < n.length; ++e)s = n[e], u = l, c = h, f = d, l = 4 * s, h = t[2 * s], d = t[2 * s + 1], r[u + 2] = r[l] = f - d, r[u + 3] = r[l + 1] = h - c } render(t) { const n = null == t ? t = new Ru : void 0, { delaunay: { halfedges: e, inedges: r, hull: i }, circumcenters: o, vectors: a } = this; if (i.length <= 1) return null; for (let n = 0, r = e.length; n < r; ++n) { const r = e[n]; if (r < n) continue; const i = 2 * Math.floor(n / 3), a = 2 * Math.floor(r / 3), u = o[i], c = o[i + 1], f = o[a], s = o[a + 1]; this._renderSegment(u, c, f, s, t) } let u, c = i[i.length - 1]; for (let n = 0; n < i.length; ++n) { u = c, c = i[n]; const e = 2 * Math.floor(r[c] / 3), f = o[e], s = o[e + 1], l = 4 * u, h = this._project(f, s, a[l + 2], a[l + 3]); h && this._renderSegment(f, s, h[0], h[1], t) } return n && n.value() } renderBounds(t) { const n = null == t ? t = new Ru : void 0; return t.rect(this.xmin, this.ymin, this.xmax - this.xmin, this.ymax - this.ymin), n && n.value() } renderCell(t, n) { const e = null == n ? n = new Ru : void 0, r = this._clip(t); if (null === r || !r.length) return; n.moveTo(r[0], r[1]); let i = r.length; for (; r[0] === r[i - 2] && r[1] === r[i - 1] && i > 1;)i -= 2; for (let t = 2; t < i; t += 2)r[t] === r[t - 2] && r[t + 1] === r[t - 1] || n.lineTo(r[t], r[t + 1]); return n.closePath(), e && e.value() } *cellPolygons() { const { delaunay: { points: t } } = this; for (let n = 0, e = t.length / 2; n < e; ++n) { const t = this.cellPolygon(n); t && (t.index = n, yield t) } } cellPolygon(t) { const n = new Fu; return this.renderCell(t, n), n.value() } _renderSegment(t, n, e, r, i) { let o; const a = this._regioncode(t, n), u = this._regioncode(e, r); 0 === a && 0 === u ? (i.moveTo(t, n), i.lineTo(e, r)) : (o = this._clipSegment(t, n, e, r, a, u)) && (i.moveTo(o[0], o[1]), i.lineTo(o[2], o[3])) } contains(t, n, e) { return (n = +n) == n && (e = +e) == e && this.delaunay._step(t, n, e) === t } *neighbors(t) { const n = this._clip(t); if (n) for (const e of this.delaunay.neighbors(t)) { const t = this._clip(e); if (t) t: for (let r = 0, i = n.length; r < i; r += 2)for (let o = 0, a = t.length; o < a; o += 2)if (n[r] === t[o] && n[r + 1] === t[o + 1] && n[(r + 2) % i] === t[(o + a - 2) % a] && n[(r + 3) % i] === t[(o + a - 1) % a]) { yield e; break t } } } _cell(t) { const { circumcenters: n, delaunay: { inedges: e, halfedges: r, triangles: i } } = this, o = e[t]; if (-1 === o) return null; const a = []; let u = o; do { const e = Math.floor(u / 3); if (a.push(n[2 * e], n[2 * e + 1]), u = u % 3 == 2 ? u - 2 : u + 1, i[u] !== t) break; u = r[u] } while (u !== o && -1 !== u); return a } _clip(t) { if (0 === t && 1 === this.delaunay.hull.length) return [this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax, this.xmin, this.ymin]; const n = this._cell(t); if (null === n) return null; const { vectors: e } = this, r = 4 * t; return this._simplify(e[r] || e[r + 1] ? this._clipInfinite(t, n, e[r], e[r + 1], e[r + 2], e[r + 3]) : this._clipFinite(t, n)) } _clipFinite(t, n) { const e = n.length; let r, i, o, a, u = null, c = n[e - 2], f = n[e - 1], s = this._regioncode(c, f), l = 0; for (let h = 0; h < e; h += 2)if (r = c, i = f, c = n[h], f = n[h + 1], o = s, s = this._regioncode(c, f), 0 === o && 0 === s) a = l, l = 0, u ? u.push(c, f) : u = [c, f]; else { let n, e, h, d, p; if (0 === o) { if (null === (n = this._clipSegment(r, i, c, f, o, s))) continue;[e, h, d, p] = n } else { if (null === (n = this._clipSegment(c, f, r, i, s, o))) continue;[d, p, e, h] = n, a = l, l = this._edgecode(e, h), a && l && this._edge(t, a, l, u, u.length), u ? u.push(e, h) : u = [e, h] } a = l, l = this._edgecode(d, p), a && l && this._edge(t, a, l, u, u.length), u ? u.push(d, p) : u = [d, p] } if (u) a = l, l = this._edgecode(u[0], u[1]), a && l && this._edge(t, a, l, u, u.length); else if (this.contains(t, (this.xmin + this.xmax) / 2, (this.ymin + this.ymax) / 2)) return [this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax, this.xmin, this.ymin]; return u } _clipSegment(t, n, e, r, i, o) { const a = i < o; for (a && ([t, n, e, r, i, o] = [e, r, t, n, o, i]); ;) { if (0 === i && 0 === o) return a ? [e, r, t, n] : [t, n, e, r]; if (i & o) return null; let u, c, f = i || o; 8 & f ? (u = t + (e - t) * (this.ymax - n) / (r - n), c = this.ymax) : 4 & f ? (u = t + (e - t) * (this.ymin - n) / (r - n), c = this.ymin) : 2 & f ? (c = n + (r - n) * (this.xmax - t) / (e - t), u = this.xmax) : (c = n + (r - n) * (this.xmin - t) / (e - t), u = this.xmin), i ? (t = u, n = c, i = this._regioncode(t, n)) : (e = u, r = c, o = this._regioncode(e, r)) } } _clipInfinite(t, n, e, r, i, o) { let a, u = Array.from(n); if ((a = this._project(u[0], u[1], e, r)) && u.unshift(a[0], a[1]), (a = this._project(u[u.length - 2], u[u.length - 1], i, o)) && u.push(a[0], a[1]), u = this._clipFinite(t, u)) for (let n, e = 0, r = u.length, i = this._edgecode(u[r - 2], u[r - 1]); e < r; e += 2)n = i, i = this._edgecode(u[e], u[e + 1]), n && i && (e = this._edge(t, n, i, u, e), r = u.length); else this.contains(t, (this.xmin + this.xmax) / 2, (this.ymin + this.ymax) / 2) && (u = [this.xmin, this.ymin, this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax]); return u } _edge(t, n, e, r, i) { for (; n !== e;) { let e, o; switch (n) { case 5: n = 4; continue; case 4: n = 6, e = this.xmax, o = this.ymin; break; case 6: n = 2; continue; case 2: n = 10, e = this.xmax, o = this.ymax; break; case 10: n = 8; continue; case 8: n = 9, e = this.xmin, o = this.ymax; break; case 9: n = 1; continue; case 1: n = 5, e = this.xmin, o = this.ymin }r[i] === e && r[i + 1] === o || !this.contains(t, e, o) || (r.splice(i, 0, e, o), i += 2) } return i } _project(t, n, e, r) { let i, o, a, u = 1 / 0; if (r < 0) { if (n <= this.ymin) return null; (i = (this.ymin - n) / r) < u && (a = this.ymin, o = t + (u = i) * e) } else if (r > 0) { if (n >= this.ymax) return null; (i = (this.ymax - n) / r) < u && (a = this.ymax, o = t + (u = i) * e) } if (e > 0) { if (t >= this.xmax) return null; (i = (this.xmax - t) / e) < u && (o = this.xmax, a = n + (u = i) * r) } else if (e < 0) { if (t <= this.xmin) return null; (i = (this.xmin - t) / e) < u && (o = this.xmin, a = n + (u = i) * r) } return [o, a] } _edgecode(t, n) { return (t === this.xmin ? 1 : t === this.xmax ? 2 : 0) | (n === this.ymin ? 4 : n === this.ymax ? 8 : 0) } _regioncode(t, n) { return (t < this.xmin ? 1 : t > this.xmax ? 2 : 0) | (n < this.ymin ? 4 : n > this.ymax ? 8 : 0) } _simplify(t) { if (t && t.length > 4) { for (let n = 0; n < t.length; n += 2) { const e = (n + 2) % t.length, r = (n + 4) % t.length; (t[n] === t[e] && t[e] === t[r] || t[n + 1] === t[e + 1] && t[e + 1] === t[r + 1]) && (t.splice(e, 2), n -= 2) } t.length || (t = null) } return t } } const Uu = 2 * Math.PI, Iu = Math.pow; function Ou(t) { return t[0] } function Bu(t) { return t[1] } function Yu(t, n, e) { return [t + Math.sin(t + n) * e, n + Math.cos(t - n) * e] } class Lu { static from(t, n = Ou, e = Bu, r) { return new Lu("length" in t ? function (t, n, e, r) { const i = t.length, o = new Float64Array(2 * i); for (let a = 0; a < i; ++a) { const i = t[a]; o[2 * a] = n.call(r, i, a, t), o[2 * a + 1] = e.call(r, i, a, t) } return o }(t, n, e, r) : Float64Array.from(function* (t, n, e, r) { let i = 0; for (const o of t) yield n.call(r, o, i, t), yield e.call(r, o, i, t), ++i }(t, n, e, r))) } constructor(t) { this._delaunator = new Su(t), this.inedges = new Int32Array(t.length / 2), this._hullIndex = new Int32Array(t.length / 2), this.points = this._delaunator.coords, this._init() } update() { return this._delaunator.update(), this._init(), this } _init() { const t = this._delaunator, n = this.points; if (t.hull && t.hull.length > 2 && function (t) { const { triangles: n, coords: e } = t; for (let t = 0; t < n.length; t += 3) { const r = 2 * n[t], i = 2 * n[t + 1], o = 2 * n[t + 2]; if ((e[o] - e[r]) * (e[i + 1] - e[r + 1]) - (e[i] - e[r]) * (e[o + 1] - e[r + 1]) > 1e-10) return !1 } return !0 }(t)) { this.collinear = Int32Array.from({ length: n.length / 2 }, ((t, n) => n)).sort(((t, e) => n[2 * t] - n[2 * e] || n[2 * t + 1] - n[2 * e + 1])); const t = this.collinear[0], e = this.collinear[this.collinear.length - 1], r = [n[2 * t], n[2 * t + 1], n[2 * e], n[2 * e + 1]], i = 1e-8 * Math.hypot(r[3] - r[1], r[2] - r[0]); for (let t = 0, e = n.length / 2; t < e; ++t) { const e = Yu(n[2 * t], n[2 * t + 1], i); n[2 * t] = e[0], n[2 * t + 1] = e[1] } this._delaunator = new Su(n) } else delete this.collinear; const e = this.halfedges = this._delaunator.halfedges, r = this.hull = this._delaunator.hull, i = this.triangles = this._delaunator.triangles, o = this.inedges.fill(-1), a = this._hullIndex.fill(-1); for (let t = 0, n = e.length; t < n; ++t) { const n = i[t % 3 == 2 ? t - 2 : t + 1]; -1 !== e[t] && -1 !== o[n] || (o[n] = t) } for (let t = 0, n = r.length; t < n; ++t)a[r[t]] = t; r.length <= 2 && r.length > 0 && (this.triangles = new Int32Array(3).fill(-1), this.halfedges = new Int32Array(3).fill(-1), this.triangles[0] = r[0], o[r[0]] = 1, 2 === r.length && (o[r[1]] = 0, this.triangles[1] = r[1], this.triangles[2] = r[1])) } voronoi(t) { return new qu(this, t) } *neighbors(t) { const { inedges: n, hull: e, _hullIndex: r, halfedges: i, triangles: o, collinear: a } = this; if (a) { const n = a.indexOf(t); return n > 0 && (yield a[n - 1]), void (n < a.length - 1 && (yield a[n + 1])) } const u = n[t]; if (-1 === u) return; let c = u, f = -1; do { if (yield f = o[c], c = c % 3 == 2 ? c - 2 : c + 1, o[c] !== t) return; if (c = i[c], -1 === c) { const n = e[(r[t] + 1) % e.length]; return void (n !== f && (yield n)) } } while (c !== u) } find(t, n, e = 0) { if ((t = +t) != t || (n = +n) != n) return -1; const r = e; let i; for (; (i = this._step(e, t, n)) >= 0 && i !== e && i !== r;)e = i; return i } _step(t, n, e) { const { inedges: r, hull: i, _hullIndex: o, halfedges: a, triangles: u, points: c } = this; if (-1 === r[t] || !c.length) return (t + 1) % (c.length >> 1); let f = t, s = Iu(n - c[2 * t], 2) + Iu(e - c[2 * t + 1], 2); const l = r[t]; let h = l; do { let r = u[h]; const l = Iu(n - c[2 * r], 2) + Iu(e - c[2 * r + 1], 2); if (l < s && (s = l, f = r), h = h % 3 == 2 ? h - 2 : h + 1, u[h] !== t) break; if (h = a[h], -1 === h) { if (h = i[(o[t] + 1) % i.length], h !== r && Iu(n - c[2 * h], 2) + Iu(e - c[2 * h + 1], 2) < s) return h; break } } while (h !== l); return f } render(t) { const n = null == t ? t = new Ru : void 0, { points: e, halfedges: r, triangles: i } = this; for (let n = 0, o = r.length; n < o; ++n) { const o = r[n]; if (o < n) continue; const a = 2 * i[n], u = 2 * i[o]; t.moveTo(e[a], e[a + 1]), t.lineTo(e[u], e[u + 1]) } return this.renderHull(t), n && n.value() } renderPoints(t, n) { void 0 !== n || t && "function" == typeof t.moveTo || (n = t, t = null), n = null == n ? 2 : +n; const e = null == t ? t = new Ru : void 0, { points: r } = this; for (let e = 0, i = r.length; e < i; e += 2) { const i = r[e], o = r[e + 1]; t.moveTo(i + n, o), t.arc(i, o, n, 0, Uu) } return e && e.value() } renderHull(t) { const n = null == t ? t = new Ru : void 0, { hull: e, points: r } = this, i = 2 * e[0], o = e.length; t.moveTo(r[i], r[i + 1]); for (let n = 1; n < o; ++n) { const i = 2 * e[n]; t.lineTo(r[i], r[i + 1]) } return t.closePath(), n && n.value() } hullPolygon() { const t = new Fu; return this.renderHull(t), t.value() } renderTriangle(t, n) { const e = null == n ? n = new Ru : void 0, { points: r, triangles: i } = this, o = 2 * i[t *= 3], a = 2 * i[t + 1], u = 2 * i[t + 2]; return n.moveTo(r[o], r[o + 1]), n.lineTo(r[a], r[a + 1]), n.lineTo(r[u], r[u + 1]), n.closePath(), e && e.value() } *trianglePolygons() { const { triangles: t } = this; for (let n = 0, e = t.length / 3; n < e; ++n)yield this.trianglePolygon(n) } trianglePolygon(t) { const n = new Fu; return this.renderTriangle(t, n), n.value() } } var ju = {}, Hu = {}, Xu = 34, Gu = 10, Vu = 13; function Wu(t) { return new Function("d", "return {" + t.map((function (t, n) { return JSON.stringify(t) + ": d[" + n + '] || ""' })).join(",") + "}") } function Zu(t) { var n = Object.create(null), e = []; return t.forEach((function (t) { for (var r in t) r in n || e.push(n[r] = r) })), e } function Ku(t, n) { var e = t + "", r = e.length; return r < n ? new Array(n - r + 1).join(0) + e : e } function Qu(t) { var n, e = t.getUTCHours(), r = t.getUTCMinutes(), i = t.getUTCSeconds(), o = t.getUTCMilliseconds(); return isNaN(t) ? "Invalid Date" : ((n = t.getUTCFullYear()) < 0 ? "-" + Ku(-n, 6) : n > 9999 ? "+" + Ku(n, 6) : Ku(n, 4)) + "-" + Ku(t.getUTCMonth() + 1, 2) + "-" + Ku(t.getUTCDate(), 2) + (o ? "T" + Ku(e, 2) + ":" + Ku(r, 2) + ":" + Ku(i, 2) + "." + Ku(o, 3) + "Z" : i ? "T" + Ku(e, 2) + ":" + Ku(r, 2) + ":" + Ku(i, 2) + "Z" : r || e ? "T" + Ku(e, 2) + ":" + Ku(r, 2) + "Z" : "") } function Ju(t) { var n = new RegExp('["' + t + "\n\r]"), e = t.charCodeAt(0); function r(t, n) { var r, i = [], o = t.length, a = 0, u = 0, c = o <= 0, f = !1; function s() { if (c) return Hu; if (f) return f = !1, ju; var n, r, i = a; if (t.charCodeAt(i) === Xu) { for (; a++ < o && t.charCodeAt(a) !== Xu || t.charCodeAt(++a) === Xu;); return (n = a) >= o ? c = !0 : (r = t.charCodeAt(a++)) === Gu ? f = !0 : r === Vu && (f = !0, t.charCodeAt(a) === Gu && ++a), t.slice(i + 1, n - 1).replace(/""/g, '"') } for (; a < o;) { if ((r = t.charCodeAt(n = a++)) === Gu) f = !0; else if (r === Vu) f = !0, t.charCodeAt(a) === Gu && ++a; else if (r !== e) continue; return t.slice(i, n) } return c = !0, t.slice(i, o) } for (t.charCodeAt(o - 1) === Gu && --o, t.charCodeAt(o - 1) === Vu && --o; (r = s()) !== Hu;) { for (var l = []; r !== ju && r !== Hu;)l.push(r), r = s(); n && null == (l = n(l, u++)) || i.push(l) } return i } function i(n, e) { return n.map((function (n) { return e.map((function (t) { return a(n[t]) })).join(t) })) } function o(n) { return n.map(a).join(t) } function a(t) { return null == t ? "" : t instanceof Date ? Qu(t) : n.test(t += "") ? '"' + t.replace(/"/g, '""') + '"' : t } return { parse: function (t, n) { var e, i, o = r(t, (function (t, r) { if (e) return e(t, r - 1); i = t, e = n ? function (t, n) { var e = Wu(t); return function (r, i) { return n(e(r), i, t) } }(t, n) : Wu(t) })); return o.columns = i || [], o }, parseRows: r, format: function (n, e) { return null == e && (e = Zu(n)), [e.map(a).join(t)].concat(i(n, e)).join("\n") }, formatBody: function (t, n) { return null == n && (n = Zu(t)), i(t, n).join("\n") }, formatRows: function (t) { return t.map(o).join("\n") }, formatRow: o, formatValue: a } } var tc = Ju(","), nc = tc.parse, ec = tc.parseRows, rc = tc.format, ic = tc.formatBody, oc = tc.formatRows, ac = tc.formatRow, uc = tc.formatValue, cc = Ju("\t"), fc = cc.parse, sc = cc.parseRows, lc = cc.format, hc = cc.formatBody, dc = cc.formatRows, pc = cc.formatRow, gc = cc.formatValue; const yc = new Date("2019-01-01T00:00").getHours() || new Date("2019-07-01T00:00").getHours(); function vc(t) { if (!t.ok) throw new Error(t.status + " " + t.statusText); return t.blob() } function _c(t) { if (!t.ok) throw new Error(t.status + " " + t.statusText); return t.arrayBuffer() } function bc(t) { if (!t.ok) throw new Error(t.status + " " + t.statusText); return t.text() } function mc(t, n) { return fetch(t, n).then(bc) } function xc(t) { return function (n, e, r) { return 2 === arguments.length && "function" == typeof e && (r = e, e = void 0), mc(n, e).then((function (n) { return t(n, r) })) } } var wc = xc(nc), Mc = xc(fc); function Tc(t) { if (!t.ok) throw new Error(t.status + " " + t.statusText); if (204 !== t.status && 205 !== t.status) return t.json() } function Ac(t) { return (n, e) => mc(n, e).then((n => (new DOMParser).parseFromString(n, t))) } var Sc = Ac("application/xml"), Ec = Ac("text/html"), Nc = Ac("image/svg+xml"); function kc(t, n, e, r) { if (isNaN(n) || isNaN(e)) return t; var i, o, a, u, c, f, s, l, h, d = t._root, p = { data: r }, g = t._x0, y = t._y0, v = t._x1, _ = t._y1; if (!d) return t._root = p, t; for (; d.length;)if ((f = n >= (o = (g + v) / 2)) ? g = o : v = o, (s = e >= (a = (y + _) / 2)) ? y = a : _ = a, i = d, !(d = d[l = s << 1 | f])) return i[l] = p, t; if (u = +t._x.call(null, d.data), c = +t._y.call(null, d.data), n === u && e === c) return p.next = d, i ? i[l] = p : t._root = p, t; do { i = i ? i[l] = new Array(4) : t._root = new Array(4), (f = n >= (o = (g + v) / 2)) ? g = o : v = o, (s = e >= (a = (y + _) / 2)) ? y = a : _ = a } while ((l = s << 1 | f) == (h = (c >= a) << 1 | u >= o)); return i[h] = d, i[l] = p, t } function Cc(t, n, e, r, i) { this.node = t, this.x0 = n, this.y0 = e, this.x1 = r, this.y1 = i } function Pc(t) { return t[0] } function zc(t) { return t[1] } function $c(t, n, e) { var r = new Dc(null == n ? Pc : n, null == e ? zc : e, NaN, NaN, NaN, NaN); return null == t ? r : r.addAll(t) } function Dc(t, n, e, r, i, o) { this._x = t, this._y = n, this._x0 = e, this._y0 = r, this._x1 = i, this._y1 = o, this._root = void 0 } function Rc(t) { for (var n = { data: t.data }, e = n; t = t.next;)e = e.next = { data: t.data }; return n } var Fc = $c.prototype = Dc.prototype; function qc(t) { return function () { return t } } function Uc(t) { return 1e-6 * (t() - .5) } function Ic(t) { return t.x + t.vx } function Oc(t) { return t.y + t.vy } function Bc(t) { return t.index } function Yc(t, n) { var e = t.get(n); if (!e) throw new Error("node not found: " + n); return e } Fc.copy = function () { var t, n, e = new Dc(this._x, this._y, this._x0, this._y0, this._x1, this._y1), r = this._root; if (!r) return e; if (!r.length) return e._root = Rc(r), e; for (t = [{ source: r, target: e._root = new Array(4) }]; r = t.pop();)for (var i = 0; i < 4; ++i)(n = r.source[i]) && (n.length ? t.push({ source: n, target: r.target[i] = new Array(4) }) : r.target[i] = Rc(n)); return e }, Fc.add = function (t) { const n = +this._x.call(null, t), e = +this._y.call(null, t); return kc(this.cover(n, e), n, e, t) }, Fc.addAll = function (t) { var n, e, r, i, o = t.length, a = new Array(o), u = new Array(o), c = 1 / 0, f = 1 / 0, s = -1 / 0, l = -1 / 0; for (e = 0; e < o; ++e)isNaN(r = +this._x.call(null, n = t[e])) || isNaN(i = +this._y.call(null, n)) || (a[e] = r, u[e] = i, r < c && (c = r), r > s && (s = r), i < f && (f = i), i > l && (l = i)); if (c > s || f > l) return this; for (this.cover(c, f).cover(s, l), e = 0; e < o; ++e)kc(this, a[e], u[e], t[e]); return this }, Fc.cover = function (t, n) { if (isNaN(t = +t) || isNaN(n = +n)) return this; var e = this._x0, r = this._y0, i = this._x1, o = this._y1; if (isNaN(e)) i = (e = Math.floor(t)) + 1, o = (r = Math.floor(n)) + 1; else { for (var a, u, c = i - e || 1, f = this._root; e > t || t >= i || r > n || n >= o;)switch (u = (n < r) << 1 | t < e, (a = new Array(4))[u] = f, f = a, c *= 2, u) { case 0: i = e + c, o = r + c; break; case 1: e = i - c, o = r + c; break; case 2: i = e + c, r = o - c; break; case 3: e = i - c, r = o - c }this._root && this._root.length && (this._root = f) } return this._x0 = e, this._y0 = r, this._x1 = i, this._y1 = o, this }, Fc.data = function () { var t = []; return this.visit((function (n) { if (!n.length) do { t.push(n.data) } while (n = n.next) })), t }, Fc.extent = function (t) { return arguments.length ? this.cover(+t[0][0], +t[0][1]).cover(+t[1][0], +t[1][1]) : isNaN(this._x0) ? void 0 : [[this._x0, this._y0], [this._x1, this._y1]] }, Fc.find = function (t, n, e) { var r, i, o, a, u, c, f, s = this._x0, l = this._y0, h = this._x1, d = this._y1, p = [], g = this._root; for (g && p.push(new Cc(g, s, l, h, d)), null == e ? e = 1 / 0 : (s = t - e, l = n - e, h = t + e, d = n + e, e *= e); c = p.pop();)if (!(!(g = c.node) || (i = c.x0) > h || (o = c.y0) > d || (a = c.x1) < s || (u = c.y1) < l)) if (g.length) { var y = (i + a) / 2, v = (o + u) / 2; p.push(new Cc(g[3], y, v, a, u), new Cc(g[2], i, v, y, u), new Cc(g[1], y, o, a, v), new Cc(g[0], i, o, y, v)), (f = (n >= v) << 1 | t >= y) && (c = p[p.length - 1], p[p.length - 1] = p[p.length - 1 - f], p[p.length - 1 - f] = c) } else { var _ = t - +this._x.call(null, g.data), b = n - +this._y.call(null, g.data), m = _ * _ + b * b; if (m < e) { var x = Math.sqrt(e = m); s = t - x, l = n - x, h = t + x, d = n + x, r = g.data } } return r }, Fc.remove = function (t) { if (isNaN(o = +this._x.call(null, t)) || isNaN(a = +this._y.call(null, t))) return this; var n, e, r, i, o, a, u, c, f, s, l, h, d = this._root, p = this._x0, g = this._y0, y = this._x1, v = this._y1; if (!d) return this; if (d.length) for (; ;) { if ((f = o >= (u = (p + y) / 2)) ? p = u : y = u, (s = a >= (c = (g + v) / 2)) ? g = c : v = c, n = d, !(d = d[l = s << 1 | f])) return this; if (!d.length) break; (n[l + 1 & 3] || n[l + 2 & 3] || n[l + 3 & 3]) && (e = n, h = l) } for (; d.data !== t;)if (r = d, !(d = d.next)) return this; return (i = d.next) && delete d.next, r ? (i ? r.next = i : delete r.next, this) : n ? (i ? n[l] = i : delete n[l], (d = n[0] || n[1] || n[2] || n[3]) && d === (n[3] || n[2] || n[1] || n[0]) && !d.length && (e ? e[h] = d : this._root = d), this) : (this._root = i, this) }, Fc.removeAll = function (t) { for (var n = 0, e = t.length; n < e; ++n)this.remove(t[n]); return this }, Fc.root = function () { return this._root }, Fc.size = function () { var t = 0; return this.visit((function (n) { if (!n.length) do { ++t } while (n = n.next) })), t }, Fc.visit = function (t) { var n, e, r, i, o, a, u = [], c = this._root; for (c && u.push(new Cc(c, this._x0, this._y0, this._x1, this._y1)); n = u.pop();)if (!t(c = n.node, r = n.x0, i = n.y0, o = n.x1, a = n.y1) && c.length) { var f = (r + o) / 2, s = (i + a) / 2; (e = c[3]) && u.push(new Cc(e, f, s, o, a)), (e = c[2]) && u.push(new Cc(e, r, s, f, a)), (e = c[1]) && u.push(new Cc(e, f, i, o, s)), (e = c[0]) && u.push(new Cc(e, r, i, f, s)) } return this }, Fc.visitAfter = function (t) { var n, e = [], r = []; for (this._root && e.push(new Cc(this._root, this._x0, this._y0, this._x1, this._y1)); n = e.pop();) { var i = n.node; if (i.length) { var o, a = n.x0, u = n.y0, c = n.x1, f = n.y1, s = (a + c) / 2, l = (u + f) / 2; (o = i[0]) && e.push(new Cc(o, a, u, s, l)), (o = i[1]) && e.push(new Cc(o, s, u, c, l)), (o = i[2]) && e.push(new Cc(o, a, l, s, f)), (o = i[3]) && e.push(new Cc(o, s, l, c, f)) } r.push(n) } for (; n = r.pop();)t(n.node, n.x0, n.y0, n.x1, n.y1); return this }, Fc.x = function (t) { return arguments.length ? (this._x = t, this) : this._x }, Fc.y = function (t) { return arguments.length ? (this._y = t, this) : this._y }; const Lc = 1664525, jc = 1013904223, Hc = 4294967296; function Xc(t) { return t.x } function Gc(t) { return t.y } var Vc = Math.PI * (3 - Math.sqrt(5)); function Wc(t, n) { if ((e = (t = n ? t.toExponential(n - 1) : t.toExponential()).indexOf("e")) < 0) return null; var e, r = t.slice(0, e); return [r.length > 1 ? r[0] + r.slice(2) : r, +t.slice(e + 1)] } function Zc(t) { return (t = Wc(Math.abs(t))) ? t[1] : NaN } var Kc, Qc = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i; function Jc(t) { if (!(n = Qc.exec(t))) throw new Error("invalid format: " + t); var n; return new tf({ fill: n[1], align: n[2], sign: n[3], symbol: n[4], zero: n[5], width: n[6], comma: n[7], precision: n[8] && n[8].slice(1), trim: n[9], type: n[10] }) } function tf(t) { this.fill = void 0 === t.fill ? " " : t.fill + "", this.align = void 0 === t.align ? ">" : t.align + "", this.sign = void 0 === t.sign ? "-" : t.sign + "", this.symbol = void 0 === t.symbol ? "" : t.symbol + "", this.zero = !!t.zero, this.width = void 0 === t.width ? void 0 : +t.width, this.comma = !!t.comma, this.precision = void 0 === t.precision ? void 0 : +t.precision, this.trim = !!t.trim, this.type = void 0 === t.type ? "" : t.type + "" } function nf(t, n) { var e = Wc(t, n); if (!e) return t + ""; var r = e[0], i = e[1]; return i < 0 ? "0." + new Array(-i).join("0") + r : r.length > i + 1 ? r.slice(0, i + 1) + "." + r.slice(i + 1) : r + new Array(i - r.length + 2).join("0") } Jc.prototype = tf.prototype, tf.prototype.toString = function () { return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (void 0 === this.width ? "" : Math.max(1, 0 | this.width)) + (this.comma ? "," : "") + (void 0 === this.precision ? "" : "." + Math.max(0, 0 | this.precision)) + (this.trim ? "~" : "") + this.type }; var ef = { "%": (t, n) => (100 * t).toFixed(n), b: t => Math.round(t).toString(2), c: t => t + "", d: function (t) { return Math.abs(t = Math.round(t)) >= 1e21 ? t.toLocaleString("en").replace(/,/g, "") : t.toString(10) }, e: (t, n) => t.toExponential(n), f: (t, n) => t.toFixed(n), g: (t, n) => t.toPrecision(n), o: t => Math.round(t).toString(8), p: (t, n) => nf(100 * t, n), r: nf, s: function (t, n) { var e = Wc(t, n); if (!e) return t + ""; var r = e[0], i = e[1], o = i - (Kc = 3 * Math.max(-8, Math.min(8, Math.floor(i / 3)))) + 1, a = r.length; return o === a ? r : o > a ? r + new Array(o - a + 1).join("0") : o > 0 ? r.slice(0, o) + "." + r.slice(o) : "0." + new Array(1 - o).join("0") + Wc(t, Math.max(0, n + o - 1))[0] }, X: t => Math.round(t).toString(16).toUpperCase(), x: t => Math.round(t).toString(16) }; function rf(t) { return t } var of, af = Array.prototype.map, uf = ["y", "z", "a", "f", "p", "n", "?", "m", "", "k", "M", "G", "T", "P", "E", "Z", "Y"]; function cf(t) { var n, e, r = void 0 === t.grouping || void 0 === t.thousands ? rf : (n = af.call(t.grouping, Number), e = t.thousands + "", function (t, r) { for (var i = t.length, o = [], a = 0, u = n[0], c = 0; i > 0 && u > 0 && (c + u + 1 > r && (u = Math.max(1, r - c)), o.push(t.substring(i -= u, i + u)), !((c += u + 1) > r));)u = n[a = (a + 1) % n.length]; return o.reverse().join(e) }), i = void 0 === t.currency ? "" : t.currency[0] + "", o = void 0 === t.currency ? "" : t.currency[1] + "", a = void 0 === t.decimal ? "." : t.decimal + "", u = void 0 === t.numerals ? rf : function (t) { return function (n) { return n.replace(/[0-9]/g, (function (n) { return t[+n] })) } }(af.call(t.numerals, String)), c = void 0 === t.percent ? "%" : t.percent + "", f = void 0 === t.minus ? "?" : t.minus + "", s = void 0 === t.nan ? "NaN" : t.nan + ""; function l(t) { var n = (t = Jc(t)).fill, e = t.align, l = t.sign, h = t.symbol, d = t.zero, p = t.width, g = t.comma, y = t.precision, v = t.trim, _ = t.type; "n" === _ ? (g = !0, _ = "g") : ef[_] || (void 0 === y && (y = 12), v = !0, _ = "g"), (d || "0" === n && "=" === e) && (d = !0, n = "0", e = "="); var b = "$" === h ? i : "#" === h && /[boxX]/.test(_) ? "0" + _.toLowerCase() : "", m = "$" === h ? o : /[%p]/.test(_) ? c : "", x = ef[_], w = /[defgprs%]/.test(_); function M(t) { var i, o, c, h = b, M = m; if ("c" === _) M = x(t) + M, t = ""; else { var T = (t = +t) < 0 || 1 / t < 0; if (t = isNaN(t) ? s : x(Math.abs(t), y), v && (t = function (t) { t: for (var n, e = t.length, r = 1, i = -1; r < e; ++r)switch (t[r]) { case ".": i = n = r; break; case "0": 0 === i && (i = r), n = r; break; default: if (!+t[r]) break t; i > 0 && (i = 0) }return i > 0 ? t.slice(0, i) + t.slice(n + 1) : t }(t)), T && 0 == +t && "+" !== l && (T = !1), h = (T ? "(" === l ? l : f : "-" === l || "(" === l ? "" : l) + h, M = ("s" === _ ? uf[8 + Kc / 3] : "") + M + (T && "(" === l ? ")" : ""), w) for (i = -1, o = t.length; ++i < o;)if (48 > (c = t.charCodeAt(i)) || c > 57) { M = (46 === c ? a + t.slice(i + 1) : t.slice(i)) + M, t = t.slice(0, i); break } } g && !d && (t = r(t, 1 / 0)); var A = h.length + t.length + M.length, S = A < p ? new Array(p - A + 1).join(n) : ""; switch (g && d && (t = r(S + t, S.length ? p - M.length : 1 / 0), S = ""), e) { case "<": t = h + t + M + S; break; case "=": t = h + S + t + M; break; case "^": t = S.slice(0, A = S.length >> 1) + h + t + M + S.slice(A); break; default: t = S + h + t + M }return u(t) } return y = void 0 === y ? 6 : /[gprs]/.test(_) ? Math.max(1, Math.min(21, y)) : Math.max(0, Math.min(20, y)), M.toString = function () { return t + "" }, M } return { format: l, formatPrefix: function (t, n) { var e = l(((t = Jc(t)).type = "f", t)), r = 3 * Math.max(-8, Math.min(8, Math.floor(Zc(n) / 3))), i = Math.pow(10, -r), o = uf[8 + r / 3]; return function (t) { return e(i * t) + o } } } } function ff(n) { return of = cf(n), t.format = of.format, t.formatPrefix = of.formatPrefix, of } function sf(t) { return Math.max(0, -Zc(Math.abs(t))) } function lf(t, n) { return Math.max(0, 3 * Math.max(-8, Math.min(8, Math.floor(Zc(n) / 3))) - Zc(Math.abs(t))) } function hf(t, n) { return t = Math.abs(t), n = Math.abs(n) - t, Math.max(0, Zc(n) - Zc(t)) + 1 } t.format = void 0, t.formatPrefix = void 0, ff({ thousands: ",", grouping: [3], currency: ["$", ""] }); var df = 1e-6, pf = 1e-12, gf = Math.PI, yf = gf / 2, vf = gf / 4, _f = 2 * gf, bf = 180 / gf, mf = gf / 180, xf = Math.abs, wf = Math.atan, Mf = Math.atan2, Tf = Math.cos, Af = Math.ceil, Sf = Math.exp, Ef = Math.hypot, Nf = Math.log, kf = Math.pow, Cf = Math.sin, Pf = Math.sign || function (t) { return t > 0 ? 1 : t < 0 ? -1 : 0 }, zf = Math.sqrt, $f = Math.tan; function Df(t) { return t > 1 ? 0 : t < -1 ? gf : Math.acos(t) } function Rf(t) { return t > 1 ? yf : t < -1 ? -yf : Math.asin(t) } function Ff(t) { return (t = Cf(t / 2)) * t } function qf() { } function Uf(t, n) { t && Of.hasOwnProperty(t.type) && Of[t.type](t, n) } var If = { Feature: function (t, n) { Uf(t.geometry, n) }, FeatureCollection: function (t, n) { for (var e = t.features, r = -1, i = e.length; ++r < i;)Uf(e[r].geometry, n) } }, Of = { Sphere: function (t, n) { n.sphere() }, Point: function (t, n) { t = t.coordinates, n.point(t[0], t[1], t[2]) }, MultiPoint: function (t, n) { for (var e = t.coordinates, r = -1, i = e.length; ++r < i;)t = e[r], n.point(t[0], t[1], t[2]) }, LineString: function (t, n) { Bf(t.coordinates, n, 0) }, MultiLineString: function (t, n) { for (var e = t.coordinates, r = -1, i = e.length; ++r < i;)Bf(e[r], n, 0) }, Polygon: function (t, n) { Yf(t.coordinates, n) }, MultiPolygon: function (t, n) { for (var e = t.coordinates, r = -1, i = e.length; ++r < i;)Yf(e[r], n) }, GeometryCollection: function (t, n) { for (var e = t.geometries, r = -1, i = e.length; ++r < i;)Uf(e[r], n) } }; function Bf(t, n, e) { var r, i = -1, o = t.length - e; for (n.lineStart(); ++i < o;)r = t[i], n.point(r[0], r[1], r[2]); n.lineEnd() } function Yf(t, n) { var e = -1, r = t.length; for (n.polygonStart(); ++e < r;)Bf(t[e], n, 1); n.polygonEnd() } function Lf(t, n) { t && If.hasOwnProperty(t.type) ? If[t.type](t, n) : Uf(t, n) } var jf, Hf, Xf, Gf, Vf, Wf, Zf, Kf, Qf, Jf, ts, ns, es, rs, is, os, as = new T, us = new T, cs = { point: qf, lineStart: qf, lineEnd: qf, polygonStart: function () { as = new T, cs.lineStart = fs, cs.lineEnd = ss }, polygonEnd: function () { var t = +as; us.add(t < 0 ? _f + t : t), this.lineStart = this.lineEnd = this.point = qf }, sphere: function () { us.add(_f) } }; function fs() { cs.point = ls } function ss() { hs(jf, Hf) } function ls(t, n) { cs.point = hs, jf = t, Hf = n, Xf = t *= mf, Gf = Tf(n = (n *= mf) / 2 + vf), Vf = Cf(n) } function hs(t, n) { var e = (t *= mf) - Xf, r = e >= 0 ? 1 : -1, i = r * e, o = Tf(n = (n *= mf) / 2 + vf), a = Cf(n), u = Vf * a, c = Gf * o + u * Tf(i), f = u * r * Cf(i); as.add(Mf(f, c)), Xf = t, Gf = o, Vf = a } function ds(t) { return [Mf(t[1], t[0]), Rf(t[2])] } function ps(t) { var n = t[0], e = t[1], r = Tf(e); return [r * Tf(n), r * Cf(n), Cf(e)] } function gs(t, n) { return t[0] * n[0] + t[1] * n[1] + t[2] * n[2] } function ys(t, n) { return [t[1] * n[2] - t[2] * n[1], t[2] * n[0] - t[0] * n[2], t[0] * n[1] - t[1] * n[0]] } function vs(t, n) { t[0] += n[0], t[1] += n[1], t[2] += n[2] } function _s(t, n) { return [t[0] * n, t[1] * n, t[2] * n] } function bs(t) { var n = zf(t[0] * t[0] + t[1] * t[1] + t[2] * t[2]); t[0] /= n, t[1] /= n, t[2] /= n } var ms, xs, ws, Ms, Ts, As, Ss, Es, Ns, ks, Cs, Ps, zs, $s, Ds, Rs, Fs = { point: qs, lineStart: Is, lineEnd: Os, polygonStart: function () { Fs.point = Bs, Fs.lineStart = Ys, Fs.lineEnd = Ls, rs = new T, cs.polygonStart() }, polygonEnd: function () { cs.polygonEnd(), Fs.point = qs, Fs.lineStart = Is, Fs.lineEnd = Os, as < 0 ? (Wf = -(Kf = 180), Zf = -(Qf = 90)) : rs > df ? Qf = 90 : rs < -df && (Zf = -90), os[0] = Wf, os[1] = Kf }, sphere: function () { Wf = -(Kf = 180), Zf = -(Qf = 90) } }; function qs(t, n) { is.push(os = [Wf = t, Kf = t]), n < Zf && (Zf = n), n > Qf && (Qf = n) } function Us(t, n) { var e = ps([t * mf, n * mf]); if (es) { var r = ys(es, e), i = ys([r[1], -r[0], 0], r); bs(i), i = ds(i); var o, a = t - Jf, u = a > 0 ? 1 : -1, c = i[0] * bf * u, f = xf(a) > 180; f ^ (u * Jf < c && c < u * t) ? (o = i[1] * bf) > Qf && (Qf = o) : f ^ (u * Jf < (c = (c + 360) % 360 - 180) && c < u * t) ? (o = -i[1] * bf) < Zf && (Zf = o) : (n < Zf && (Zf = n), n > Qf && (Qf = n)), f ? t < Jf ? js(Wf, t) > js(Wf, Kf) && (Kf = t) : js(t, Kf) > js(Wf, Kf) && (Wf = t) : Kf >= Wf ? (t < Wf && (Wf = t), t > Kf && (Kf = t)) : t > Jf ? js(Wf, t) > js(Wf, Kf) && (Kf = t) : js(t, Kf) > js(Wf, Kf) && (Wf = t) } else is.push(os = [Wf = t, Kf = t]); n < Zf && (Zf = n), n > Qf && (Qf = n), es = e, Jf = t } function Is() { Fs.point = Us } function Os() { os[0] = Wf, os[1] = Kf, Fs.point = qs, es = null } function Bs(t, n) { if (es) { var e = t - Jf; rs.add(xf(e) > 180 ? e + (e > 0 ? 360 : -360) : e) } else ts = t, ns = n; cs.point(t, n), Us(t, n) } function Ys() { cs.lineStart() } function Ls() { Bs(ts, ns), cs.lineEnd(), xf(rs) > df && (Wf = -(Kf = 180)), os[0] = Wf, os[1] = Kf, es = null } function js(t, n) { return (n -= t) < 0 ? n + 360 : n } function Hs(t, n) { return t[0] - n[0] } function Xs(t, n) { return t[0] <= t[1] ? t[0] <= n && n <= t[1] : n < t[0] || t[1] < n } var Gs = { sphere: qf, point: Vs, lineStart: Zs, lineEnd: Js, polygonStart: function () { Gs.lineStart = tl, Gs.lineEnd = nl }, polygonEnd: function () { Gs.lineStart = Zs, Gs.lineEnd = Js } }; function Vs(t, n) { t *= mf; var e = Tf(n *= mf); Ws(e * Tf(t), e * Cf(t), Cf(n)) } function Ws(t, n, e) { ++ms, ws += (t - ws) / ms, Ms += (n - Ms) / ms, Ts += (e - Ts) / ms } function Zs() { Gs.point = Ks } function Ks(t, n) { t *= mf; var e = Tf(n *= mf); $s = e * Tf(t), Ds = e * Cf(t), Rs = Cf(n), Gs.point = Qs, Ws($s, Ds, Rs) } function Qs(t, n) { t *= mf; var e = Tf(n *= mf), r = e * Tf(t), i = e * Cf(t), o = Cf(n), a = Mf(zf((a = Ds * o - Rs * i) * a + (a = Rs * r - $s * o) * a + (a = $s * i - Ds * r) * a), $s * r + Ds * i + Rs * o); xs += a, As += a * ($s + ($s = r)), Ss += a * (Ds + (Ds = i)), Es += a * (Rs + (Rs = o)), Ws($s, Ds, Rs) } function Js() { Gs.point = Vs } function tl() { Gs.point = el } function nl() { rl(Ps, zs), Gs.point = Vs } function el(t, n) { Ps = t, zs = n, t *= mf, n *= mf, Gs.point = rl; var e = Tf(n); $s = e * Tf(t), Ds = e * Cf(t), Rs = Cf(n), Ws($s, Ds, Rs) } function rl(t, n) { t *= mf; var e = Tf(n *= mf), r = e * Tf(t), i = e * Cf(t), o = Cf(n), a = Ds * o - Rs * i, u = Rs * r - $s * o, c = $s * i - Ds * r, f = Ef(a, u, c), s = Rf(f), l = f && -s / f; Ns.add(l * a), ks.add(l * u), Cs.add(l * c), xs += s, As += s * ($s + ($s = r)), Ss += s * (Ds + (Ds = i)), Es += s * (Rs + (Rs = o)), Ws($s, Ds, Rs) } function il(t) { return function () { return t } } function ol(t, n) { function e(e, r) { return e = t(e, r), n(e[0], e[1]) } return t.invert && n.invert && (e.invert = function (e, r) { return (e = n.invert(e, r)) && t.invert(e[0], e[1]) }), e } function al(t, n) { return xf(t) > gf && (t -= Math.round(t / _f) * _f), [t, n] } function ul(t, n, e) { return (t %= _f) ? n || e ? ol(fl(t), sl(n, e)) : fl(t) : n || e ? sl(n, e) : al } function cl(t) { return function (n, e) { return xf(n += t) > gf && (n -= Math.round(n / _f) * _f), [n, e] } } function fl(t) { var n = cl(t); return n.invert = cl(-t), n } function sl(t, n) { var e = Tf(t), r = Cf(t), i = Tf(n), o = Cf(n); function a(t, n) { var a = Tf(n), u = Tf(t) * a, c = Cf(t) * a, f = Cf(n), s = f * e + u * r; return [Mf(c * i - s * o, u * e - f * r), Rf(s * i + c * o)] } return a.invert = function (t, n) { var a = Tf(n), u = Tf(t) * a, c = Cf(t) * a, f = Cf(n), s = f * i - c * o; return [Mf(c * i + f * o, u * e + s * r), Rf(s * e - u * r)] }, a } function ll(t) { function n(n) { return (n = t(n[0] * mf, n[1] * mf))[0] *= bf, n[1] *= bf, n } return t = ul(t[0] * mf, t[1] * mf, t.length > 2 ? t[2] * mf : 0), n.invert = function (n) { return (n = t.invert(n[0] * mf, n[1] * mf))[0] *= bf, n[1] *= bf, n }, n } function hl(t, n, e, r, i, o) { if (e) { var a = Tf(n), u = Cf(n), c = r * e; null == i ? (i = n + r * _f, o = n - c / 2) : (i = dl(a, i), o = dl(a, o), (r > 0 ? i < o : i > o) && (i += r * _f)); for (var f, s = i; r > 0 ? s > o : s < o; s -= c)f = ds([a, -u * Tf(s), -u * Cf(s)]), t.point(f[0], f[1]) } } function dl(t, n) { (n = ps(n))[0] -= t, bs(n); var e = Df(-n[1]); return ((-n[2] < 0 ? -e : e) + _f - df) % _f } function pl() { var t, n = []; return { point: function (n, e, r) { t.push([n, e, r]) }, lineStart: function () { n.push(t = []) }, lineEnd: qf, rejoin: function () { n.length > 1 && n.push(n.pop().concat(n.shift())) }, result: function () { var e = n; return n = [], t = null, e } } } function gl(t, n) { return xf(t[0] - n[0]) < df && xf(t[1] - n[1]) < df } function yl(t, n, e, r) { this.x = t, this.z = n, this.o = e, this.e = r, this.v = !1, this.n = this.p = null } function vl(t, n, e, r, i) { var o, a, u = [], c = []; if (t.forEach((function (t) { if (!((n = t.length - 1) <= 0)) { var n, e, r = t[0], a = t[n]; if (gl(r, a)) { if (!r[2] && !a[2]) { for (i.lineStart(), o = 0; o < n; ++o)i.point((r = t[o])[0], r[1]); return void i.lineEnd() } a[0] += 2 * df } u.push(e = new yl(r, t, null, !0)), c.push(e.o = new yl(r, null, e, !1)), u.push(e = new yl(a, t, null, !1)), c.push(e.o = new yl(a, null, e, !0)) } })), u.length) { for (c.sort(n), _l(u), _l(c), o = 0, a = c.length; o < a; ++o)c[o].e = e = !e; for (var f, s, l = u[0]; ;) { for (var h = l, d = !0; h.v;)if ((h = h.n) === l) return; f = h.z, i.lineStart(); do { if (h.v = h.o.v = !0, h.e) { if (d) for (o = 0, a = f.length; o < a; ++o)i.point((s = f[o])[0], s[1]); else r(h.x, h.n.x, 1, i); h = h.n } else { if (d) for (f = h.p.z, o = f.length - 1; o >= 0; --o)i.point((s = f[o])[0], s[1]); else r(h.x, h.p.x, -1, i); h = h.p } f = (h = h.o).z, d = !d } while (!h.v); i.lineEnd() } } } function _l(t) { if (n = t.length) { for (var n, e, r = 0, i = t[0]; ++r < n;)i.n = e = t[r], e.p = i, i = e; i.n = e = t[0], e.p = i } } function bl(t) { return xf(t[0]) <= gf ? t[0] : Pf(t[0]) * ((xf(t[0]) + gf) % _f - gf) } function ml(t, n) { var e = bl(n), r = n[1], i = Cf(r), o = [Cf(e), -Tf(e), 0], a = 0, u = 0, c = new T; 1 === i ? r = yf + df : -1 === i && (r = -yf - df); for (var f = 0, s = t.length; f < s; ++f)if (h = (l = t[f]).length) for (var l, h, d = l[h - 1], p = bl(d), g = d[1] / 2 + vf, y = Cf(g), v = Tf(g), _ = 0; _ < h; ++_, p = m, y = w, v = M, d = b) { var b = l[_], m = bl(b), x = b[1] / 2 + vf, w = Cf(x), M = Tf(x), A = m - p, S = A >= 0 ? 1 : -1, E = S * A, N = E > gf, k = y * w; if (c.add(Mf(k * S * Cf(E), v * M + k * Tf(E))), a += N ? A + S * _f : A, N ^ p >= e ^ m >= e) { var C = ys(ps(d), ps(b)); bs(C); var P = ys(o, C); bs(P); var z = (N ^ A >= 0 ? -1 : 1) * Rf(P[2]); (r > z || r === z && (C[0] || C[1])) && (u += N ^ A >= 0 ? 1 : -1) } } return (a < -df || a < df && c < -pf) ^ 1 & u } function xl(t, n, e, r) { return function (i) { var o, a, u, c = n(i), f = pl(), s = n(f), l = !1, h = { point: d, lineStart: g, lineEnd: y, polygonStart: function () { h.point = v, h.lineStart = _, h.lineEnd = b, a = [], o = [] }, polygonEnd: function () { h.point = d, h.lineStart = g, h.lineEnd = y, a = ft(a); var t = ml(o, r); a.length ? (l || (i.polygonStart(), l = !0), vl(a, Ml, t, e, i)) : t && (l || (i.polygonStart(), l = !0), i.lineStart(), e(null, null, 1, i), i.lineEnd()), l && (i.polygonEnd(), l = !1), a = o = null }, sphere: function () { i.polygonStart(), i.lineStart(), e(null, null, 1, i), i.lineEnd(), i.polygonEnd() } }; function d(n, e) { t(n, e) && i.point(n, e) } function p(t, n) { c.point(t, n) } function g() { h.point = p, c.lineStart() } function y() { h.point = d, c.lineEnd() } function v(t, n) { u.push([t, n]), s.point(t, n) } function _() { s.lineStart(), u = [] } function b() { v(u[0][0], u[0][1]), s.lineEnd(); var t, n, e, r, c = s.clean(), h = f.result(), d = h.length; if (u.pop(), o.push(u), u = null, d) if (1 & c) { if ((n = (e = h[0]).length - 1) > 0) { for (l || (i.polygonStart(), l = !0), i.lineStart(), t = 0; t < n; ++t)i.point((r = e[t])[0], r[1]); i.lineEnd() } } else d > 1 && 2 & c && h.push(h.pop().concat(h.shift())), a.push(h.filter(wl)) } return h } } function wl(t) { return t.length > 1 } function Ml(t, n) { return ((t = t.x)[0] < 0 ? t[1] - yf - df : yf - t[1]) - ((n = n.x)[0] < 0 ? n[1] - yf - df : yf - n[1]) } al.invert = al; var Tl = xl((function () { return !0 }), (function (t) { var n, e = NaN, r = NaN, i = NaN; return { lineStart: function () { t.lineStart(), n = 1 }, point: function (o, a) { var u = o > 0 ? gf : -gf, c = xf(o - e); xf(c - gf) < df ? (t.point(e, r = (r + a) / 2 > 0 ? yf : -yf), t.point(i, r), t.lineEnd(), t.lineStart(), t.point(u, r), t.point(o, r), n = 0) : i !== u && c >= gf && (xf(e - i) < df && (e -= i * df), xf(o - u) < df && (o -= u * df), r = function (t, n, e, r) { var i, o, a = Cf(t - e); return xf(a) > df ? wf((Cf(n) * (o = Tf(r)) * Cf(e) - Cf(r) * (i = Tf(n)) * Cf(t)) / (i * o * a)) : (n + r) / 2 }(e, r, o, a), t.point(i, r), t.lineEnd(), t.lineStart(), t.point(u, r), n = 0), t.point(e = o, r = a), i = u }, lineEnd: function () { t.lineEnd(), e = r = NaN }, clean: function () { return 2 - n } } }), (function (t, n, e, r) { var i; if (null == t) i = e * yf, r.point(-gf, i), r.point(0, i), r.point(gf, i), r.point(gf, 0), r.point(gf, -i), r.point(0, -i), r.point(-gf, -i), r.point(-gf, 0), r.point(-gf, i); else if (xf(t[0] - n[0]) > df) { var o = t[0] < n[0] ? gf : -gf; i = e * o / 2, r.point(-o, i), r.point(0, i), r.point(o, i) } else r.point(n[0], n[1]) }), [-gf, -yf]); function Al(t) { var n = Tf(t), e = 6 * mf, r = n > 0, i = xf(n) > df; function o(t, e) { return Tf(t) * Tf(e) > n } function a(t, e, r) { var i = [1, 0, 0], o = ys(ps(t), ps(e)), a = gs(o, o), u = o[0], c = a - u * u; if (!c) return !r && t; var f = n * a / c, s = -n * u / c, l = ys(i, o), h = _s(i, f); vs(h, _s(o, s)); var d = l, p = gs(h, d), g = gs(d, d), y = p * p - g * (gs(h, h) - 1); if (!(y < 0)) { var v = zf(y), _ = _s(d, (-p - v) / g); if (vs(_, h), _ = ds(_), !r) return _; var b, m = t[0], x = e[0], w = t[1], M = e[1]; x < m && (b = m, m = x, x = b); var T = x - m, A = xf(T - gf) < df; if (!A && M < w && (b = w, w = M, M = b), A || T < df ? A ? w + M > 0 ^ _[1] < (xf(_[0] - m) < df ? w : M) : w <= _[1] && _[1] <= M : T > gf ^ (m <= _[0] && _[0] <= x)) { var S = _s(d, (-p + v) / g); return vs(S, h), [_, ds(S)] } } } function u(n, e) { var i = r ? t : gf - t, o = 0; return n < -i ? o |= 1 : n > i && (o |= 2), e < -i ? o |= 4 : e > i && (o |= 8), o } return xl(o, (function (t) { var n, e, c, f, s; return { lineStart: function () { f = c = !1, s = 1 }, point: function (l, h) { var d, p = [l, h], g = o(l, h), y = r ? g ? 0 : u(l, h) : g ? u(l + (l < 0 ? gf : -gf), h) : 0; if (!n && (f = c = g) && t.lineStart(), g !== c && (!(d = a(n, p)) || gl(n, d) || gl(p, d)) && (p[2] = 1), g !== c) s = 0, g ? (t.lineStart(), d = a(p, n), t.point(d[0], d[1])) : (d = a(n, p), t.point(d[0], d[1], 2), t.lineEnd()), n = d; else if (i && n && r ^ g) { var v; y & e || !(v = a(p, n, !0)) || (s = 0, r ? (t.lineStart(), t.point(v[0][0], v[0][1]), t.point(v[1][0], v[1][1]), t.lineEnd()) : (t.point(v[1][0], v[1][1]), t.lineEnd(), t.lineStart(), t.point(v[0][0], v[0][1], 3))) } !g || n && gl(n, p) || t.point(p[0], p[1]), n = p, c = g, e = y }, lineEnd: function () { c && t.lineEnd(), n = null }, clean: function () { return s | (f && c) << 1 } } }), (function (n, r, i, o) { hl(o, t, e, i, n, r) }), r ? [0, -t] : [-gf, t - gf]) } var Sl, El, Nl, kl, Cl = 1e9, Pl = -Cl; function zl(t, n, e, r) { function i(i, o) { return t <= i && i <= e && n <= o && o <= r } function o(i, o, u, f) { var s = 0, l = 0; if (null == i || (s = a(i, u)) !== (l = a(o, u)) || c(i, o) < 0 ^ u > 0) do { f.point(0 === s || 3 === s ? t : e, s > 1 ? r : n) } while ((s = (s + u + 4) % 4) !== l); else f.point(o[0], o[1]) } function a(r, i) { return xf(r[0] - t) < df ? i > 0 ? 0 : 3 : xf(r[0] - e) < df ? i > 0 ? 2 : 1 : xf(r[1] - n) < df ? i > 0 ? 1 : 0 : i > 0 ? 3 : 2 } function u(t, n) { return c(t.x, n.x) } function c(t, n) { var e = a(t, 1), r = a(n, 1); return e !== r ? e - r : 0 === e ? n[1] - t[1] : 1 === e ? t[0] - n[0] : 2 === e ? t[1] - n[1] : n[0] - t[0] } return function (a) { var c, f, s, l, h, d, p, g, y, v, _, b = a, m = pl(), x = { point: w, lineStart: function () { x.point = M, f && f.push(s = []); v = !0, y = !1, p = g = NaN }, lineEnd: function () { c && (M(l, h), d && y && m.rejoin(), c.push(m.result())); x.point = w, y && b.lineEnd() }, polygonStart: function () { b = m, c = [], f = [], _ = !0 }, polygonEnd: function () { var n = function () { for (var n = 0, e = 0, i = f.length; e < i; ++e)for (var o, a, u = f[e], c = 1, s = u.length, l = u[0], h = l[0], d = l[1]; c < s; ++c)o = h, a = d, h = (l = u[c])[0], d = l[1], a <= r ? d > r && (h - o) * (r - a) > (d - a) * (t - o) && ++n : d <= r && (h - o) * (r - a) < (d - a) * (t - o) && --n; return n }(), e = _ && n, i = (c = ft(c)).length; (e || i) && (a.polygonStart(), e && (a.lineStart(), o(null, null, 1, a), a.lineEnd()), i && vl(c, u, n, o, a), a.polygonEnd()); b = a, c = f = s = null } }; function w(t, n) { i(t, n) && b.point(t, n) } function M(o, a) { var u = i(o, a); if (f && s.push([o, a]), v) l = o, h = a, d = u, v = !1, u && (b.lineStart(), b.point(o, a)); else if (u && y) b.point(o, a); else { var c = [p = Math.max(Pl, Math.min(Cl, p)), g = Math.max(Pl, Math.min(Cl, g))], m = [o = Math.max(Pl, Math.min(Cl, o)), a = Math.max(Pl, Math.min(Cl, a))]; !function (t, n, e, r, i, o) { var a, u = t[0], c = t[1], f = 0, s = 1, l = n[0] - u, h = n[1] - c; if (a = e - u, l || !(a > 0)) { if (a /= l, l < 0) { if (a < f) return; a < s && (s = a) } else if (l > 0) { if (a > s) return; a > f && (f = a) } if (a = i - u, l || !(a < 0)) { if (a /= l, l < 0) { if (a > s) return; a > f && (f = a) } else if (l > 0) { if (a < f) return; a < s && (s = a) } if (a = r - c, h || !(a > 0)) { if (a /= h, h < 0) { if (a < f) return; a < s && (s = a) } else if (h > 0) { if (a > s) return; a > f && (f = a) } if (a = o - c, h || !(a < 0)) { if (a /= h, h < 0) { if (a > s) return; a > f && (f = a) } else if (h > 0) { if (a < f) return; a < s && (s = a) } return f > 0 && (t[0] = u + f * l, t[1] = c + f * h), s < 1 && (n[0] = u + s * l, n[1] = c + s * h), !0 } } } } }(c, m, t, n, e, r) ? u && (b.lineStart(), b.point(o, a), _ = !1) : (y || (b.lineStart(), b.point(c[0], c[1])), b.point(m[0], m[1]), u || b.lineEnd(), _ = !1) } p = o, g = a, y = u } return x } } var $l = { sphere: qf, point: qf, lineStart: function () { $l.point = Rl, $l.lineEnd = Dl }, lineEnd: qf, polygonStart: qf, polygonEnd: qf }; function Dl() { $l.point = $l.lineEnd = qf } function Rl(t, n) { El = t *= mf, Nl = Cf(n *= mf), kl = Tf(n), $l.point = Fl } function Fl(t, n) { t *= mf; var e = Cf(n *= mf), r = Tf(n), i = xf(t - El), o = Tf(i), a = r * Cf(i), u = kl * e - Nl * r * o, c = Nl * e + kl * r * o; Sl.add(Mf(zf(a * a + u * u), c)), El = t, Nl = e, kl = r } function ql(t) { return Sl = new T, Lf(t, $l), +Sl } var Ul = [null, null], Il = { type: "LineString", coordinates: Ul }; function Ol(t, n) { return Ul[0] = t, Ul[1] = n, ql(Il) } var Bl = { Feature: function (t, n) { return Ll(t.geometry, n) }, FeatureCollection: function (t, n) { for (var e = t.features, r = -1, i = e.length; ++r < i;)if (Ll(e[r].geometry, n)) return !0; return !1 } }, Yl = { Sphere: function () { return !0 }, Point: function (t, n) { return jl(t.coordinates, n) }, MultiPoint: function (t, n) { for (var e = t.coordinates, r = -1, i = e.length; ++r < i;)if (jl(e[r], n)) return !0; return !1 }, LineString: function (t, n) { return Hl(t.coordinates, n) }, MultiLineString: function (t, n) { for (var e = t.coordinates, r = -1, i = e.length; ++r < i;)if (Hl(e[r], n)) return !0; return !1 }, Polygon: function (t, n) { return Xl(t.coordinates, n) }, MultiPolygon: function (t, n) { for (var e = t.coordinates, r = -1, i = e.length; ++r < i;)if (Xl(e[r], n)) return !0; return !1 }, GeometryCollection: function (t, n) { for (var e = t.geometries, r = -1, i = e.length; ++r < i;)if (Ll(e[r], n)) return !0; return !1 } }; function Ll(t, n) { return !(!t || !Yl.hasOwnProperty(t.type)) && Yl[t.type](t, n) } function jl(t, n) { return 0 === Ol(t, n) } function Hl(t, n) { for (var e, r, i, o = 0, a = t.length; o < a; o++) { if (0 === (r = Ol(t[o], n))) return !0; if (o > 0 && (i = Ol(t[o], t[o - 1])) > 0 && e <= i && r <= i && (e + r - i) * (1 - Math.pow((e - r) / i, 2)) < pf * i) return !0; e = r } return !1 } function Xl(t, n) { return !!ml(t.map(Gl), Vl(n)) } function Gl(t) { return (t = t.map(Vl)).pop(), t } function Vl(t) { return [t[0] * mf, t[1] * mf] } function Wl(t, n, e) { var r = lt(t, n - df, e).concat(n); return function (t) { return r.map((function (n) { return [t, n] })) } } function Zl(t, n, e) { var r = lt(t, n - df, e).concat(n); return function (t) { return r.map((function (n) { return [n, t] })) } } function Kl() { var t, n, e, r, i, o, a, u, c, f, s, l, h = 10, d = h, p = 90, g = 360, y = 2.5; function v() { return { type: "MultiLineString", coordinates: _() } } function _() { return lt(Af(r / p) * p, e, p).map(s).concat(lt(Af(u / g) * g, a, g).map(l)).concat(lt(Af(n / h) * h, t, h).filter((function (t) { return xf(t % p) > df })).map(c)).concat(lt(Af(o / d) * d, i, d).filter((function (t) { return xf(t % g) > df })).map(f)) } return v.lines = function () { return _().map((function (t) { return { type: "LineString", coordinates: t } })) }, v.outline = function () { return { type: "Polygon", coordinates: [s(r).concat(l(a).slice(1), s(e).reverse().slice(1), l(u).reverse().slice(1))] } }, v.extent = function (t) { return arguments.length ? v.extentMajor(t).extentMinor(t) : v.extentMinor() }, v.extentMajor = function (t) { return arguments.length ? (r = +t[0][0], e = +t[1][0], u = +t[0][1], a = +t[1][1], r > e && (t = r, r = e, e = t), u > a && (t = u, u = a, a = t), v.precision(y)) : [[r, u], [e, a]] }, v.extentMinor = function (e) { return arguments.length ? (n = +e[0][0], t = +e[1][0], o = +e[0][1], i = +e[1][1], n > t && (e = n, n = t, t = e), o > i && (e = o, o = i, i = e), v.precision(y)) : [[n, o], [t, i]] }, v.step = function (t) { return arguments.length ? v.stepMajor(t).stepMinor(t) : v.stepMinor() }, v.stepMajor = function (t) { return arguments.length ? (p = +t[0], g = +t[1], v) : [p, g] }, v.stepMinor = function (t) { return arguments.length ? (h = +t[0], d = +t[1], v) : [h, d] }, v.precision = function (h) { return arguments.length ? (y = +h, c = Wl(o, i, 90), f = Zl(n, t, y), s = Wl(u, a, 90), l = Zl(r, e, y), v) : y }, v.extentMajor([[-180, -90 + df], [180, 90 - df]]).extentMinor([[-180, -80 - df], [180, 80 + df]]) } var Ql, Jl, th, nh, eh = t => t, rh = new T, ih = new T, oh = { point: qf, lineStart: qf, lineEnd: qf, polygonStart: function () { oh.lineStart = ah, oh.lineEnd = fh }, polygonEnd: function () { oh.lineStart = oh.lineEnd = oh.point = qf, rh.add(xf(ih)), ih = new T }, result: function () { var t = rh / 2; return rh = new T, t } }; function ah() { oh.point = uh } function uh(t, n) { oh.point = ch, Ql = th = t, Jl = nh = n } function ch(t, n) { ih.add(nh * t - th * n), th = t, nh = n } function fh() { ch(Ql, Jl) } var sh = oh, lh = 1 / 0, hh = lh, dh = -lh, ph = dh, gh = { point: function (t, n) { t < lh && (lh = t); t > dh && (dh = t); n < hh && (hh = n); n > ph && (ph = n) }, lineStart: qf, lineEnd: qf, polygonStart: qf, polygonEnd: qf, result: function () { var t = [[lh, hh], [dh, ph]]; return dh = ph = -(hh = lh = 1 / 0), t } }; var yh, vh, _h, bh, mh = gh, xh = 0, wh = 0, Mh = 0, Th = 0, Ah = 0, Sh = 0, Eh = 0, Nh = 0, kh = 0, Ch = { point: Ph, lineStart: zh, lineEnd: Rh, polygonStart: function () { Ch.lineStart = Fh, Ch.lineEnd = qh }, polygonEnd: function () { Ch.point = Ph, Ch.lineStart = zh, Ch.lineEnd = Rh }, result: function () { var t = kh ? [Eh / kh, Nh / kh] : Sh ? [Th / Sh, Ah / Sh] : Mh ? [xh / Mh, wh / Mh] : [NaN, NaN]; return xh = wh = Mh = Th = Ah = Sh = Eh = Nh = kh = 0, t } }; function Ph(t, n) { xh += t, wh += n, ++Mh } function zh() { Ch.point = $h } function $h(t, n) { Ch.point = Dh, Ph(_h = t, bh = n) } function Dh(t, n) { var e = t - _h, r = n - bh, i = zf(e * e + r * r); Th += i * (_h + t) / 2, Ah += i * (bh + n) / 2, Sh += i, Ph(_h = t, bh = n) } function Rh() { Ch.point = Ph } function Fh() { Ch.point = Uh } function qh() { Ih(yh, vh) } function Uh(t, n) { Ch.point = Ih, Ph(yh = _h = t, vh = bh = n) } function Ih(t, n) { var e = t - _h, r = n - bh, i = zf(e * e + r * r); Th += i * (_h + t) / 2, Ah += i * (bh + n) / 2, Sh += i, Eh += (i = bh * t - _h * n) * (_h + t), Nh += i * (bh + n), kh += 3 * i, Ph(_h = t, bh = n) } var Oh = Ch; function Bh(t) { this._context = t } Bh.prototype = { _radius: 4.5, pointRadius: function (t) { return this._radius = t, this }, polygonStart: function () { this._line = 0 }, polygonEnd: function () { this._line = NaN }, lineStart: function () { this._point = 0 }, lineEnd: function () { 0 === this._line && this._context.closePath(), this._point = NaN }, point: function (t, n) { switch (this._point) { case 0: this._context.moveTo(t, n), this._point = 1; break; case 1: this._context.lineTo(t, n); break; default: this._context.moveTo(t + this._radius, n), this._context.arc(t, n, this._radius, 0, _f) } }, result: qf }; var Yh, Lh, jh, Hh, Xh, Gh = new T, Vh = { point: qf, lineStart: function () { Vh.point = Wh }, lineEnd: function () { Yh && Zh(Lh, jh), Vh.point = qf }, polygonStart: function () { Yh = !0 }, polygonEnd: function () { Yh = null }, result: function () { var t = +Gh; return Gh = new T, t } }; function Wh(t, n) { Vh.point = Zh, Lh = Hh = t, jh = Xh = n } function Zh(t, n) { Hh -= t, Xh -= n, Gh.add(zf(Hh * Hh + Xh * Xh)), Hh = t, Xh = n } var Kh = Vh; let Qh, Jh, td, nd; class ed { constructor(t) { this._append = null == t ? rd : function (t) { const n = Math.floor(t); if (!(n >= 0)) throw new RangeError(`invalid digits: ${t}`); if (n > 15) return rd; if (n !== Qh) { const t = 10 ** n; Qh = n, Jh = function (n) { let e = 1; this._ += n[0]; for (const r = n.length; e < r; ++e)this._ += Math.round(arguments[e] * t) / t + n[e] } } return Jh }(t), this._radius = 4.5, this._ = "" } pointRadius(t) { return this._radius = +t, this } polygonStart() { this._line = 0 } polygonEnd() { this._line = NaN } lineStart() { this._point = 0 } lineEnd() { 0 === this._line && (this._ += "Z"), this._point = NaN } point(t, n) { switch (this._point) { case 0: this._append`M${t},${n}`, this._point = 1; break; case 1: this._append`L${t},${n}`; break; default: if (this._append`M${t},${n}`, this._radius !== td || this._append !== Jh) { const t = this._radius, n = this._; this._ = "", this._append`m0,${t}a${t},${t} 0 1,1 0,${-2 * t}a${t},${t} 0 1,1 0,${2 * t}z`, td = t, Jh = this._append, nd = this._, this._ = n } this._ += nd } } result() { const t = this._; return this._ = "", t.length ? t : null } } function rd(t) { let n = 1; this._ += t[0]; for (const e = t.length; n < e; ++n)this._ += arguments[n] + t[n] } function id(t) { return function (n) { var e = new od; for (var r in t) e[r] = t[r]; return e.stream = n, e } } function od() { } function ad(t, n, e) { var r = t.clipExtent && t.clipExtent(); return t.scale(150).translate([0, 0]), null != r && t.clipExtent(null), Lf(e, t.stream(mh)), n(mh.result()), null != r && t.clipExtent(r), t } function ud(t, n, e) { return ad(t, (function (e) { var r = n[1][0] - n[0][0], i = n[1][1] - n[0][1], o = Math.min(r / (e[1][0] - e[0][0]), i / (e[1][1] - e[0][1])), a = +n[0][0] + (r - o * (e[1][0] + e[0][0])) / 2, u = +n[0][1] + (i - o * (e[1][1] + e[0][1])) / 2; t.scale(150 * o).translate([a, u]) }), e) } function cd(t, n, e) { return ud(t, [[0, 0], n], e) } function fd(t, n, e) { return ad(t, (function (e) { var r = +n, i = r / (e[1][0] - e[0][0]), o = (r - i * (e[1][0] + e[0][0])) / 2, a = -i * e[0][1]; t.scale(150 * i).translate([o, a]) }), e) } function sd(t, n, e) { return ad(t, (function (e) { var r = +n, i = r / (e[1][1] - e[0][1]), o = -i * e[0][0], a = (r - i * (e[1][1] + e[0][1])) / 2; t.scale(150 * i).translate([o, a]) }), e) } od.prototype = { constructor: od, point: function (t, n) { this.stream.point(t, n) }, sphere: function () { this.stream.sphere() }, lineStart: function () { this.stream.lineStart() }, lineEnd: function () { this.stream.lineEnd() }, polygonStart: function () { this.stream.polygonStart() }, polygonEnd: function () { this.stream.polygonEnd() } }; var ld = 16, hd = Tf(30 * mf); function dd(t, n) { return +n ? function (t, n) { function e(r, i, o, a, u, c, f, s, l, h, d, p, g, y) { var v = f - r, _ = s - i, b = v * v + _ * _; if (b > 4 * n && g--) { var m = a + h, x = u + d, w = c + p, M = zf(m * m + x * x + w * w), T = Rf(w /= M), A = xf(xf(w) - 1) < df || xf(o - l) < df ? (o + l) / 2 : Mf(x, m), S = t(A, T), E = S[0], N = S[1], k = E - r, C = N - i, P = _ * k - v * C; (P * P / b > n || xf((v * k + _ * C) / b - .5) > .3 || a * h + u * d + c * p < hd) && (e(r, i, o, a, u, c, E, N, A, m /= M, x /= M, w, g, y), y.point(E, N), e(E, N, A, m, x, w, f, s, l, h, d, p, g, y)) } } return function (n) { var r, i, o, a, u, c, f, s, l, h, d, p, g = { point: y, lineStart: v, lineEnd: b, polygonStart: function () { n.polygonStart(), g.lineStart = m }, polygonEnd: function () { n.polygonEnd(), g.lineStart = v } }; function y(e, r) { e = t(e, r), n.point(e[0], e[1]) } function v() { s = NaN, g.point = _, n.lineStart() } function _(r, i) { var o = ps([r, i]), a = t(r, i); e(s, l, f, h, d, p, s = a[0], l = a[1], f = r, h = o[0], d = o[1], p = o[2], ld, n), n.point(s, l) } function b() { g.point = y, n.lineEnd() } function m() { v(), g.point = x, g.lineEnd = w } function x(t, n) { _(r = t, n), i = s, o = l, a = h, u = d, c = p, g.point = _ } function w() { e(s, l, f, h, d, p, i, o, r, a, u, c, ld, n), g.lineEnd = b, b() } return g } }(t, n) : function (t) { return id({ point: function (n, e) { n = t(n, e), this.stream.point(n[0], n[1]) } }) }(t) } var pd = id({ point: function (t, n) { this.stream.point(t * mf, n * mf) } }); function gd(t, n, e, r, i, o) { if (!o) return function (t, n, e, r, i) { function o(o, a) { return [n + t * (o *= r), e - t * (a *= i)] } return o.invert = function (o, a) { return [(o - n) / t * r, (e - a) / t * i] }, o }(t, n, e, r, i); var a = Tf(o), u = Cf(o), c = a * t, f = u * t, s = a / t, l = u / t, h = (u * e - a * n) / t, d = (u * n + a * e) / t; function p(t, o) { return [c * (t *= r) - f * (o *= i) + n, e - f * t - c * o] } return p.invert = function (t, n) { return [r * (s * t - l * n + h), i * (d - l * t - s * n)] }, p } function yd(t) { return vd((function () { return t }))() } function vd(t) { var n, e, r, i, o, a, u, c, f, s, l = 150, h = 480, d = 250, p = 0, g = 0, y = 0, v = 0, _ = 0, b = 0, m = 1, x = 1, w = null, M = Tl, T = null, A = eh, S = .5; function E(t) { return c(t[0] * mf, t[1] * mf) } function N(t) { return (t = c.invert(t[0], t[1])) && [t[0] * bf, t[1] * bf] } function k() { var t = gd(l, 0, 0, m, x, b).apply(null, n(p, g)), r = gd(l, h - t[0], d - t[1], m, x, b); return e = ul(y, v, _), u = ol(n, r), c = ol(e, u), a = dd(u, S), C() } function C() { return f = s = null, E } return E.stream = function (t) { return f && s === t ? f : f = pd(function (t) { return id({ point: function (n, e) { var r = t(n, e); return this.stream.point(r[0], r[1]) } }) }(e)(M(a(A(s = t))))) }, E.preclip = function (t) { return arguments.length ? (M = t, w = void 0, C()) : M }, E.postclip = function (t) { return arguments.length ? (A = t, T = r = i = o = null, C()) : A }, E.clipAngle = function (t) { return arguments.length ? (M = +t ? Al(w = t * mf) : (w = null, Tl), C()) : w * bf }, E.clipExtent = function (t) { return arguments.length ? (A = null == t ? (T = r = i = o = null, eh) : zl(T = +t[0][0], r = +t[0][1], i = +t[1][0], o = +t[1][1]), C()) : null == T ? null : [[T, r], [i, o]] }, E.scale = function (t) { return arguments.length ? (l = +t, k()) : l }, E.translate = function (t) { return arguments.length ? (h = +t[0], d = +t[1], k()) : [h, d] }, E.center = function (t) { return arguments.length ? (p = t[0] % 360 * mf, g = t[1] % 360 * mf, k()) : [p * bf, g * bf] }, E.rotate = function (t) { return arguments.length ? (y = t[0] % 360 * mf, v = t[1] % 360 * mf, _ = t.length > 2 ? t[2] % 360 * mf : 0, k()) : [y * bf, v * bf, _ * bf] }, E.angle = function (t) { return arguments.length ? (b = t % 360 * mf, k()) : b * bf }, E.reflectX = function (t) { return arguments.length ? (m = t ? -1 : 1, k()) : m < 0 }, E.reflectY = function (t) { return arguments.length ? (x = t ? -1 : 1, k()) : x < 0 }, E.precision = function (t) { return arguments.length ? (a = dd(u, S = t * t), C()) : zf(S) }, E.fitExtent = function (t, n) { return ud(E, t, n) }, E.fitSize = function (t, n) { return cd(E, t, n) }, E.fitWidth = function (t, n) { return fd(E, t, n) }, E.fitHeight = function (t, n) { return sd(E, t, n) }, function () { return n = t.apply(this, arguments), E.invert = n.invert && N, k() } } function _d(t) { var n = 0, e = gf / 3, r = vd(t), i = r(n, e); return i.parallels = function (t) { return arguments.length ? r(n = t[0] * mf, e = t[1] * mf) : [n * bf, e * bf] }, i } function bd(t, n) { var e = Cf(t), r = (e + Cf(n)) / 2; if (xf(r) < df) return function (t) { var n = Tf(t); function e(t, e) { return [t * n, Cf(e) / n] } return e.invert = function (t, e) { return [t / n, Rf(e * n)] }, e }(t); var i = 1 + e * (2 * r - e), o = zf(i) / r; function a(t, n) { var e = zf(i - 2 * r * Cf(n)) / r; return [e * Cf(t *= r), o - e * Tf(t)] } return a.invert = function (t, n) { var e = o - n, a = Mf(t, xf(e)) * Pf(e); return e * r < 0 && (a -= gf * Pf(t) * Pf(e)), [a / r, Rf((i - (t * t + e * e) * r * r) / (2 * r))] }, a } function md() { return _d(bd).scale(155.424).center([0, 33.6442]) } function xd() { return md().parallels([29.5, 45.5]).scale(1070).translate([480, 250]).rotate([96, 0]).center([-.6, 38.7]) } function wd(t) { return function (n, e) { var r = Tf(n), i = Tf(e), o = t(r * i); return o === 1 / 0 ? [2, 0] : [o * i * Cf(n), o * Cf(e)] } } function Md(t) { return function (n, e) { var r = zf(n * n + e * e), i = t(r), o = Cf(i), a = Tf(i); return [Mf(n * o, r * a), Rf(r && e * o / r)] } } var Td = wd((function (t) { return zf(2 / (1 + t)) })); Td.invert = Md((function (t) { return 2 * Rf(t / 2) })); var Ad = wd((function (t) { return (t = Df(t)) && t / Cf(t) })); function Sd(t, n) { return [t, Nf($f((yf + n) / 2))] } function Ed(t) { var n, e, r, i = yd(t), o = i.center, a = i.scale, u = i.translate, c = i.clipExtent, f = null; function s() { var o = gf * a(), u = i(ll(i.rotate()).invert([0, 0])); return c(null == f ? [[u[0] - o, u[1] - o], [u[0] + o, u[1] + o]] : t === Sd ? [[Math.max(u[0] - o, f), n], [Math.min(u[0] + o, e), r]] : [[f, Math.max(u[1] - o, n)], [e, Math.min(u[1] + o, r)]]) } return i.scale = function (t) { return arguments.length ? (a(t), s()) : a() }, i.translate = function (t) { return arguments.length ? (u(t), s()) : u() }, i.center = function (t) { return arguments.length ? (o(t), s()) : o() }, i.clipExtent = function (t) { return arguments.length ? (null == t ? f = n = e = r = null : (f = +t[0][0], n = +t[0][1], e = +t[1][0], r = +t[1][1]), s()) : null == f ? null : [[f, n], [e, r]] }, s() } function Nd(t) { return $f((yf + t) / 2) } function kd(t, n) { var e = Tf(t), r = t === n ? Cf(t) : Nf(e / Tf(n)) / Nf(Nd(n) / Nd(t)), i = e * kf(Nd(t), r) / r; if (!r) return Sd; function o(t, n) { i > 0 ? n < -yf + df && (n = -yf + df) : n > yf - df && (n = yf - df); var e = i / kf(Nd(n), r); return [e * Cf(r * t), i - e * Tf(r * t)] } return o.invert = function (t, n) { var e = i - n, o = Pf(r) * zf(t * t + e * e), a = Mf(t, xf(e)) * Pf(e); return e * r < 0 && (a -= gf * Pf(t) * Pf(e)), [a / r, 2 * wf(kf(i / o, 1 / r)) - yf] }, o } function Cd(t, n) { return [t, n] } function Pd(t, n) { var e = Tf(t), r = t === n ? Cf(t) : (e - Tf(n)) / (n - t), i = e / r + t; if (xf(r) < df) return Cd; function o(t, n) { var e = i - n, o = r * t; return [e * Cf(o), i - e * Tf(o)] } return o.invert = function (t, n) { var e = i - n, o = Mf(t, xf(e)) * Pf(e); return e * r < 0 && (o -= gf * Pf(t) * Pf(e)), [o / r, i - Pf(r) * zf(t * t + e * e)] }, o } Ad.invert = Md((function (t) { return t })), Sd.invert = function (t, n) { return [t, 2 * wf(Sf(n)) - yf] }, Cd.invert = Cd; var zd = 1.340264, $d = -.081106, Dd = 893e-6, Rd = .003796, Fd = zf(3) / 2; function qd(t, n) { var e = Rf(Fd * Cf(n)), r = e * e, i = r * r * r; return [t * Tf(e) / (Fd * (zd + 3 * $d * r + i * (7 * Dd + 9 * Rd * r))), e * (zd + $d * r + i * (Dd + Rd * r))] } function Ud(t, n) { var e = Tf(n), r = Tf(t) * e; return [e * Cf(t) / r, Cf(n) / r] } function Id(t, n) { var e = n * n, r = e * e; return [t * (.8707 - .131979 * e + r * (r * (.003971 * e - .001529 * r) - .013791)), n * (1.007226 + e * (.015085 + r * (.028874 * e - .044475 - .005916 * r)))] } function Od(t, n) { return [Tf(n) * Cf(t), Cf(n)] } function Bd(t, n) { var e = Tf(n), r = 1 + Tf(t) * e; return [e * Cf(t) / r, Cf(n) / r] } function Yd(t, n) { return [Nf($f((yf + n) / 2)), -t] } function Ld(t, n) { return t.parent === n.parent ? 1 : 2 } function jd(t, n) { return t + n.x } function Hd(t, n) { return Math.max(t, n.y) } function Xd(t) { var n = 0, e = t.children, r = e && e.length; if (r) for (; --r >= 0;)n += e[r].value; else n = 1; t.value = n } function Gd(t, n) { t instanceof Map ? (t = [void 0, t], void 0 === n && (n = Wd)) : void 0 === n && (n = Vd); for (var e, r, i, o, a, u = new Qd(t), c = [u]; e = c.pop();)if ((i = n(e.data)) && (a = (i = Array.from(i)).length)) for (e.children = i, o = a - 1; o >= 0; --o)c.push(r = i[o] = new Qd(i[o])), r.parent = e, r.depth = e.depth + 1; return u.eachBefore(Kd) } function Vd(t) { return t.children } function Wd(t) { return Array.isArray(t) ? t[1] : null } function Zd(t) { void 0 !== t.data.value && (t.value = t.data.value), t.data = t.data.data } function Kd(t) { var n = 0; do { t.height = n } while ((t = t.parent) && t.height < ++n) } function Qd(t) { this.data = t, this.depth = this.height = 0, this.parent = null } function Jd(t) { return null == t ? null : tp(t) } function tp(t) { if ("function" != typeof t) throw new Error; return t } function np() { return 0 } function ep(t) { return function () { return t } } qd.invert = function (t, n) { for (var e, r = n, i = r * r, o = i * i * i, a = 0; a < 12 && (o = (i = (r -= e = (r * (zd + $d * i + o * (Dd + Rd * i)) - n) / (zd + 3 * $d * i + o * (7 * Dd + 9 * Rd * i))) * r) * i * i, !(xf(e) < pf)); ++a); return [Fd * t * (zd + 3 * $d * i + o * (7 * Dd + 9 * Rd * i)) / Tf(r), Rf(Cf(r) / Fd)] }, Ud.invert = Md(wf), Id.invert = function (t, n) { var e, r = n, i = 25; do { var o = r * r, a = o * o; r -= e = (r * (1.007226 + o * (.015085 + a * (.028874 * o - .044475 - .005916 * a))) - n) / (1.007226 + o * (.045255 + a * (.259866 * o - .311325 - .005916 * 11 * a))) } while (xf(e) > df && --i > 0); return [t / (.8707 + (o = r * r) * (o * (o * o * o * (.003971 - .001529 * o) - .013791) - .131979)), r] }, Od.invert = Md(Rf), Bd.invert = Md((function (t) { return 2 * wf(t) })), Yd.invert = function (t, n) { return [-n, 2 * wf(Sf(t)) - yf] }, Qd.prototype = Gd.prototype = { constructor: Qd, count: function () { return this.eachAfter(Xd) }, each: function (t, n) { let e = -1; for (const r of this) t.call(n, r, ++e, this); return this }, eachAfter: function (t, n) { for (var e, r, i, o = this, a = [o], u = [], c = -1; o = a.pop();)if (u.push(o), e = o.children) for (r = 0, i = e.length; r < i; ++r)a.push(e[r]); for (; o = u.pop();)t.call(n, o, ++c, this); return this }, eachBefore: function (t, n) { for (var e, r, i = this, o = [i], a = -1; i = o.pop();)if (t.call(n, i, ++a, this), e = i.children) for (r = e.length - 1; r >= 0; --r)o.push(e[r]); return this }, find: function (t, n) { let e = -1; for (const r of this) if (t.call(n, r, ++e, this)) return r }, sum: function (t) { return this.eachAfter((function (n) { for (var e = +t(n.data) || 0, r = n.children, i = r && r.length; --i >= 0;)e += r[i].value; n.value = e })) }, sort: function (t) { return this.eachBefore((function (n) { n.children && n.children.sort(t) })) }, path: function (t) { for (var n = this, e = function (t, n) { if (t === n) return t; var e = t.ancestors(), r = n.ancestors(), i = null; t = e.pop(), n = r.pop(); for (; t === n;)i = t, t = e.pop(), n = r.pop(); return i }(n, t), r = [n]; n !== e;)n = n.parent, r.push(n); for (var i = r.length; t !== e;)r.splice(i, 0, t), t = t.parent; return r }, ancestors: function () { for (var t = this, n = [t]; t = t.parent;)n.push(t); return n }, descendants: function () { return Array.from(this) }, leaves: function () { var t = []; return this.eachBefore((function (n) { n.children || t.push(n) })), t }, links: function () { var t = this, n = []; return t.each((function (e) { e !== t && n.push({ source: e.parent, target: e }) })), n }, copy: function () { return Gd(this).eachBefore(Zd) }, [Symbol.iterator]: function* () { var t, n, e, r, i = this, o = [i]; do { for (t = o.reverse(), o = []; i = t.pop();)if (yield i, n = i.children) for (e = 0, r = n.length; e < r; ++e)o.push(n[e]) } while (o.length) } }; const rp = 1664525, ip = 1013904223, op = 4294967296; function ap() { let t = 1; return () => (t = (rp * t + ip) % op) / op } function up(t, n) { for (var e, r, i = 0, o = (t = function (t, n) { let e, r, i = t.length; for (; i;)r = n() * i-- | 0, e = t[i], t[i] = t[r], t[r] = e; return t }(Array.from(t), n)).length, a = []; i < o;)e = t[i], r && sp(r, e) ? ++i : (r = hp(a = cp(a, e)), i = 0); return r } function cp(t, n) { var e, r; if (lp(n, t)) return [n]; for (e = 0; e < t.length; ++e)if (fp(n, t[e]) && lp(dp(t[e], n), t)) return [t[e], n]; for (e = 0; e < t.length - 1; ++e)for (r = e + 1; r < t.length; ++r)if (fp(dp(t[e], t[r]), n) && fp(dp(t[e], n), t[r]) && fp(dp(t[r], n), t[e]) && lp(pp(t[e], t[r], n), t)) return [t[e], t[r], n]; throw new Error } function fp(t, n) { var e = t.r - n.r, r = n.x - t.x, i = n.y - t.y; return e < 0 || e * e < r * r + i * i } function sp(t, n) { var e = t.r - n.r + 1e-9 * Math.max(t.r, n.r, 1), r = n.x - t.x, i = n.y - t.y; return e > 0 && e * e > r * r + i * i } function lp(t, n) { for (var e = 0; e < n.length; ++e)if (!sp(t, n[e])) return !1; return !0 } function hp(t) { switch (t.length) { case 1: return function (t) { return { x: t.x, y: t.y, r: t.r } }(t[0]); case 2: return dp(t[0], t[1]); case 3: return pp(t[0], t[1], t[2]) } } function dp(t, n) { var e = t.x, r = t.y, i = t.r, o = n.x, a = n.y, u = n.r, c = o - e, f = a - r, s = u - i, l = Math.sqrt(c * c + f * f); return { x: (e + o + c / l * s) / 2, y: (r + a + f / l * s) / 2, r: (l + i + u) / 2 } } function pp(t, n, e) { var r = t.x, i = t.y, o = t.r, a = n.x, u = n.y, c = n.r, f = e.x, s = e.y, l = e.r, h = r - a, d = r - f, p = i - u, g = i - s, y = c - o, v = l - o, _ = r * r + i * i - o * o, b = _ - a * a - u * u + c * c, m = _ - f * f - s * s + l * l, x = d * p - h * g, w = (p * m - g * b) / (2 * x) - r, M = (g * y - p * v) / x, T = (d * b - h * m) / (2 * x) - i, A = (h * v - d * y) / x, S = M * M + A * A - 1, E = 2 * (o + w * M + T * A), N = w * w + T * T - o * o, k = -(Math.abs(S) > 1e-6 ? (E + Math.sqrt(E * E - 4 * S * N)) / (2 * S) : N / E); return { x: r + w + M * k, y: i + T + A * k, r: k } } function gp(t, n, e) { var r, i, o, a, u = t.x - n.x, c = t.y - n.y, f = u * u + c * c; f ? (i = n.r + e.r, i *= i, a = t.r + e.r, i > (a *= a) ? (r = (f + a - i) / (2 * f), o = Math.sqrt(Math.max(0, a / f - r * r)), e.x = t.x - r * u - o * c, e.y = t.y - r * c + o * u) : (r = (f + i - a) / (2 * f), o = Math.sqrt(Math.max(0, i / f - r * r)), e.x = n.x + r * u - o * c, e.y = n.y + r * c + o * u)) : (e.x = n.x + e.r, e.y = n.y) } function yp(t, n) { var e = t.r + n.r - 1e-6, r = n.x - t.x, i = n.y - t.y; return e > 0 && e * e > r * r + i * i } function vp(t) { var n = t._, e = t.next._, r = n.r + e.r, i = (n.x * e.r + e.x * n.r) / r, o = (n.y * e.r + e.y * n.r) / r; return i * i + o * o } function _p(t) { this._ = t, this.next = null, this.previous = null } function bp(t, n) { if (!(o = (t = function (t) { return "object" == typeof t && "length" in t ? t : Array.from(t) }(t)).length)) return 0; var e, r, i, o, a, u, c, f, s, l, h; if ((e = t[0]).x = 0, e.y = 0, !(o > 1)) return e.r; if (r = t[1], e.x = -r.r, r.x = e.r, r.y = 0, !(o > 2)) return e.r + r.r; gp(r, e, i = t[2]), e = new _p(e), r = new _p(r), i = new _p(i), e.next = i.previous = r, r.next = e.previous = i, i.next = r.previous = e; t: for (c = 3; c < o; ++c) { gp(e._, r._, i = t[c]), i = new _p(i), f = r.next, s = e.previous, l = r._.r, h = e._.r; do { if (l <= h) { if (yp(f._, i._)) { r = f, e.next = r, r.previous = e, --c; continue t } l += f._.r, f = f.next } else { if (yp(s._, i._)) { (e = s).next = r, r.previous = e, --c; continue t } h += s._.r, s = s.previous } } while (f !== s.next); for (i.previous = e, i.next = r, e.next = r.previous = r = i, a = vp(e); (i = i.next) !== r;)(u = vp(i)) < a && (e = i, a = u); r = e.next } for (e = [r._], i = r; (i = i.next) !== r;)e.push(i._); for (i = up(e, n), c = 0; c < o; ++c)(e = t[c]).x -= i.x, e.y -= i.y; return i.r } function mp(t) { return Math.sqrt(t.value) } function xp(t) { return function (n) { n.children || (n.r = Math.max(0, +t(n) || 0)) } } function wp(t, n, e) { return function (r) { if (i = r.children) { var i, o, a, u = i.length, c = t(r) * n || 0; if (c) for (o = 0; o < u; ++o)i[o].r += c; if (a = bp(i, e), c) for (o = 0; o < u; ++o)i[o].r -= c; r.r = a + c } } } function Mp(t) { return function (n) { var e = n.parent; n.r *= t, e && (n.x = e.x + t * n.x, n.y = e.y + t * n.y) } } function Tp(t) { t.x0 = Math.round(t.x0), t.y0 = Math.round(t.y0), t.x1 = Math.round(t.x1), t.y1 = Math.round(t.y1) } function Ap(t, n, e, r, i) { for (var o, a = t.children, u = -1, c = a.length, f = t.value && (r - n) / t.value; ++u < c;)(o = a[u]).y0 = e, o.y1 = i, o.x0 = n, o.x1 = n += o.value * f } var Sp = { depth: -1 }, Ep = {}, Np = {}; function kp(t) { return t.id } function Cp(t) { return t.parentId } function Pp(t) { let n = t.length; if (n < 2) return ""; for (; --n > 1 && !zp(t, n);); return t.slice(0, n) } function zp(t, n) { if ("/" === t[n]) { let e = 0; for (; n > 0 && "\\" === t[--n];)++e; if (0 == (1 & e)) return !0 } return !1 } function $p(t, n) { return t.parent === n.parent ? 1 : 2 } function Dp(t) { var n = t.children; return n ? n[0] : t.t } function Rp(t) { var n = t.children; return n ? n[n.length - 1] : t.t } function Fp(t, n, e) { var r = e / (n.i - t.i); n.c -= r, n.s += e, t.c += r, n.z += e, n.m += e } function qp(t, n, e) { return t.a.parent === n.parent ? t.a : e } function Up(t, n) { this._ = t, this.parent = null, this.children = null, this.A = null, this.a = this, this.z = 0, this.m = 0, this.c = 0, this.s = 0, this.t = null, this.i = n } function Ip(t, n, e, r, i) { for (var o, a = t.children, u = -1, c = a.length, f = t.value && (i - e) / t.value; ++u < c;)(o = a[u]).x0 = n, o.x1 = r, o.y0 = e, o.y1 = e += o.value * f } Up.prototype = Object.create(Qd.prototype); var Op = (1 + Math.sqrt(5)) / 2; function Bp(t, n, e, r, i, o) { for (var a, u, c, f, s, l, h, d, p, g, y, v = [], _ = n.children, b = 0, m = 0, x = _.length, w = n.value; b < x;) { c = i - e, f = o - r; do { s = _[m++].value } while (!s && m < x); for (l = h = s, y = s * s * (g = Math.max(f / c, c / f) / (w * t)), p = Math.max(h / y, y / l); m < x; ++m) { if (s += u = _[m].value, u < l && (l = u), u > h && (h = u), y = s * s * g, (d = Math.max(h / y, y / l)) > p) { s -= u; break } p = d } v.push(a = { value: s, dice: c < f, children: _.slice(b, m) }), a.dice ? Ap(a, e, r, i, w ? r += f * s / w : o) : Ip(a, e, r, w ? e += c * s / w : i, o), w -= s, b = m } return v } var Yp = function t(n) { function e(t, e, r, i, o) { Bp(n, t, e, r, i, o) } return e.ratio = function (n) { return t((n = +n) > 1 ? n : 1) }, e }(Op); var Lp = function t(n) { function e(t, e, r, i, o) { if ((a = t._squarify) && a.ratio === n) for (var a, u, c, f, s, l = -1, h = a.length, d = t.value; ++l < h;) { for (c = (u = a[l]).children, f = u.value = 0, s = c.length; f < s; ++f)u.value += c[f].value; u.dice ? Ap(u, e, r, i, d ? r += (o - r) * u.value / d : o) : Ip(u, e, r, d ? e += (i - e) * u.value / d : i, o), d -= u.value } else t._squarify = a = Bp(n, t, e, r, i, o), a.ratio = n } return e.ratio = function (n) { return t((n = +n) > 1 ? n : 1) }, e }(Op); function jp(t, n, e) { return (n[0] - t[0]) * (e[1] - t[1]) - (n[1] - t[1]) * (e[0] - t[0]) } function Hp(t, n) { return t[0] - n[0] || t[1] - n[1] } function Xp(t) { const n = t.length, e = [0, 1]; let r, i = 2; for (r = 2; r < n; ++r) { for (; i > 1 && jp(t[e[i - 2]], t[e[i - 1]], t[r]) <= 0;)--i; e[i++] = r } return e.slice(0, i) } var Gp = Math.random, Vp = function t(n) { function e(t, e) { return t = null == t ? 0 : +t, e = null == e ? 1 : +e, 1 === arguments.length ? (e = t, t = 0) : e -= t, function () { return n() * e + t } } return e.source = t, e }(Gp), Wp = function t(n) { function e(t, e) { return arguments.length < 2 && (e = t, t = 0), t = Math.floor(t), e = Math.floor(e) - t, function () { return Math.floor(n() * e + t) } } return e.source = t, e }(Gp), Zp = function t(n) { function e(t, e) { var r, i; return t = null == t ? 0 : +t, e = null == e ? 1 : +e, function () { var o; if (null != r) o = r, r = null; else do { r = 2 * n() - 1, o = 2 * n() - 1, i = r * r + o * o } while (!i || i > 1); return t + e * o * Math.sqrt(-2 * Math.log(i) / i) } } return e.source = t, e }(Gp), Kp = function t(n) { var e = Zp.source(n); function r() { var t = e.apply(this, arguments); return function () { return Math.exp(t()) } } return r.source = t, r }(Gp), Qp = function t(n) { function e(t) { return (t = +t) <= 0 ? () => 0 : function () { for (var e = 0, r = t; r > 1; --r)e += n(); return e + r * n() } } return e.source = t, e }(Gp), Jp = function t(n) { var e = Qp.source(n); function r(t) { if (0 == (t = +t)) return n; var r = e(t); return function () { return r() / t } } return r.source = t, r }(Gp), tg = function t(n) { function e(t) { return function () { return -Math.log1p(-n()) / t } } return e.source = t, e }(Gp), ng = function t(n) { function e(t) { if ((t = +t) < 0) throw new RangeError("invalid alpha"); return t = 1 / -t, function () { return Math.pow(1 - n(), t) } } return e.source = t, e }(Gp), eg = function t(n) { function e(t) { if ((t = +t) < 0 || t > 1) throw new RangeError("invalid p"); return function () { return Math.floor(n() + t) } } return e.source = t, e }(Gp), rg = function t(n) { function e(t) { if ((t = +t) < 0 || t > 1) throw new RangeError("invalid p"); return 0 === t ? () => 1 / 0 : 1 === t ? () => 1 : (t = Math.log1p(-t), function () { return 1 + Math.floor(Math.log1p(-n()) / t) }) } return e.source = t, e }(Gp), ig = function t(n) { var e = Zp.source(n)(); function r(t, r) { if ((t = +t) < 0) throw new RangeError("invalid k"); if (0 === t) return () => 0; if (r = null == r ? 1 : +r, 1 === t) return () => -Math.log1p(-n()) * r; var i = (t < 1 ? t + 1 : t) - 1 / 3, o = 1 / (3 * Math.sqrt(i)), a = t < 1 ? () => Math.pow(n(), 1 / t) : () => 1; return function () { do { do { var t = e(), u = 1 + o * t } while (u <= 0); u *= u * u; var c = 1 - n() } while (c >= 1 - .0331 * t * t * t * t && Math.log(c) >= .5 * t * t + i * (1 - u + Math.log(u))); return i * u * a() * r } } return r.source = t, r }(Gp), og = function t(n) { var e = ig.source(n); function r(t, n) { var r = e(t), i = e(n); return function () { var t = r(); return 0 === t ? 0 : t / (t + i()) } } return r.source = t, r }(Gp), ag = function t(n) { var e = rg.source(n), r = og.source(n); function i(t, n) { return t = +t, (n = +n) >= 1 ? () => t : n <= 0 ? () => 0 : function () { for (var i = 0, o = t, a = n; o * a > 16 && o * (1 - a) > 16;) { var u = Math.floor((o + 1) * a), c = r(u, o - u + 1)(); c <= a ? (i += u, o -= u, a = (a - c) / (1 - c)) : (o = u - 1, a /= c) } for (var f = a < .5, s = e(f ? a : 1 - a), l = s(), h = 0; l <= o; ++h)l += s(); return i + (f ? h : o - h) } } return i.source = t, i }(Gp), ug = function t(n) { function e(t, e, r) { var i; return 0 == (t = +t) ? i = t => -Math.log(t) : (t = 1 / t, i = n => Math.pow(n, t)), e = null == e ? 0 : +e, r = null == r ? 1 : +r, function () { return e + r * i(-Math.log1p(-n())) } } return e.source = t, e }(Gp), cg = function t(n) { function e(t, e) { return t = null == t ? 0 : +t, e = null == e ? 1 : +e, function () { return t + e * Math.tan(Math.PI * n()) } } return e.source = t, e }(Gp), fg = function t(n) { function e(t, e) { return t = null == t ? 0 : +t, e = null == e ? 1 : +e, function () { var r = n(); return t + e * Math.log(r / (1 - r)) } } return e.source = t, e }(Gp), sg = function t(n) { var e = ig.source(n), r = ag.source(n); function i(t) { return function () { for (var i = 0, o = t; o > 16;) { var a = Math.floor(.875 * o), u = e(a)(); if (u > o) return i + r(a - 1, o / u)(); i += a, o -= u } for (var c = -Math.log1p(-n()), f = 0; c <= o; ++f)c -= Math.log1p(-n()); return i + f } } return i.source = t, i }(Gp); const lg = 1 / 4294967296; function hg(t, n) { switch (arguments.length) { case 0: break; case 1: this.range(t); break; default: this.range(n).domain(t) }return this } function dg(t, n) { switch (arguments.length) { case 0: break; case 1: "function" == typeof t ? this.interpolator(t) : this.range(t); break; default: this.domain(t), "function" == typeof n ? this.interpolator(n) : this.range(n) }return this } const pg = Symbol("implicit"); function gg() { var t = new InternMap, n = [], e = [], r = pg; function i(i) { let o = t.get(i); if (void 0 === o) { if (r !== pg) return r; t.set(i, o = n.push(i) - 1) } return e[o % e.length] } return i.domain = function (e) { if (!arguments.length) return n.slice(); n = [], t = new InternMap; for (const r of e) t.has(r) || t.set(r, n.push(r) - 1); return i }, i.range = function (t) { return arguments.length ? (e = Array.from(t), i) : e.slice() }, i.unknown = function (t) { return arguments.length ? (r = t, i) : r }, i.copy = function () { return gg(n, e).unknown(r) }, hg.apply(i, arguments), i } function yg() { var t, n, e = gg().unknown(void 0), r = e.domain, i = e.range, o = 0, a = 1, u = !1, c = 0, f = 0, s = .5; function l() { var e = r().length, l = a < o, h = l ? a : o, d = l ? o : a; t = (d - h) / Math.max(1, e - c + 2 * f), u && (t = Math.floor(t)), h += (d - h - t * (e - c)) * s, n = t * (1 - c), u && (h = Math.round(h), n = Math.round(n)); var p = lt(e).map((function (n) { return h + t * n })); return i(l ? p.reverse() : p) } return delete e.unknown, e.domain = function (t) { return arguments.length ? (r(t), l()) : r() }, e.range = function (t) { return arguments.length ? ([o, a] = t, o = +o, a = +a, l()) : [o, a] }, e.rangeRound = function (t) { return [o, a] = t, o = +o, a = +a, u = !0, l() }, e.bandwidth = function () { return n }, e.step = function () { return t }, e.round = function (t) { return arguments.length ? (u = !!t, l()) : u }, e.padding = function (t) { return arguments.length ? (c = Math.min(1, f = +t), l()) : c }, e.paddingInner = function (t) { return arguments.length ? (c = Math.min(1, t), l()) : c }, e.paddingOuter = function (t) { return arguments.length ? (f = +t, l()) : f }, e.align = function (t) { return arguments.length ? (s = Math.max(0, Math.min(1, t)), l()) : s }, e.copy = function () { return yg(r(), [o, a]).round(u).paddingInner(c).paddingOuter(f).align(s) }, hg.apply(l(), arguments) } function vg(t) { var n = t.copy; return t.padding = t.paddingOuter, delete t.paddingInner, delete t.paddingOuter, t.copy = function () { return vg(n()) }, t } function _g(t) { return +t } var bg = [0, 1]; function mg(t) { return t } function xg(t, n) { return (n -= t = +t) ? function (e) { return (e - t) / n } : function (t) { return function () { return t } }(isNaN(n) ? NaN : .5) } function wg(t, n, e) { var r = t[0], i = t[1], o = n[0], a = n[1]; return i < r ? (r = xg(i, r), o = e(a, o)) : (r = xg(r, i), o = e(o, a)), function (t) { return o(r(t)) } } function Mg(t, n, e) { var r = Math.min(t.length, n.length) - 1, i = new Array(r), o = new Array(r), a = -1; for (t[r] < t[0] && (t = t.slice().reverse(), n = n.slice().reverse()); ++a < r;)i[a] = xg(t[a], t[a + 1]), o[a] = e(n[a], n[a + 1]); return function (n) { var e = s(t, n, 1, r) - 1; return o[e](i[e](n)) } } function Tg(t, n) { return n.domain(t.domain()).range(t.range()).interpolate(t.interpolate()).clamp(t.clamp()).unknown(t.unknown()) } function Ag() { var t, n, e, r, i, o, a = bg, u = bg, c = Gr, f = mg; function s() { var t = Math.min(a.length, u.length); return f !== mg && (f = function (t, n) { var e; return t > n && (e = t, t = n, n = e), function (e) { return Math.max(t, Math.min(n, e)) } }(a[0], a[t - 1])), r = t > 2 ? Mg : wg, i = o = null, l } function l(n) { return null == n || isNaN(n = +n) ? e : (i || (i = r(a.map(t), u, c)))(t(f(n))) } return l.invert = function (e) { return f(n((o || (o = r(u, a.map(t), Yr)))(e))) }, l.domain = function (t) { return arguments.length ? (a = Array.from(t, _g), s()) : a.slice() }, l.range = function (t) { return arguments.length ? (u = Array.from(t), s()) : u.slice() }, l.rangeRound = function (t) { return u = Array.from(t), c = Vr, s() }, l.clamp = function (t) { return arguments.length ? (f = !!t || mg, s()) : f !== mg }, l.interpolate = function (t) { return arguments.length ? (c = t, s()) : c }, l.unknown = function (t) { return arguments.length ? (e = t, l) : e }, function (e, r) { return t = e, n = r, s() } } function Sg() { return Ag()(mg, mg) } function Eg(n, e, r, i) { var o, a = W(n, e, r); switch ((i = Jc(null == i ? ",f" : i)).type) { case "s": var u = Math.max(Math.abs(n), Math.abs(e)); return null != i.precision || isNaN(o = lf(a, u)) || (i.precision = o), t.formatPrefix(i, u); case "": case "e": case "g": case "p": case "r": null != i.precision || isNaN(o = hf(a, Math.max(Math.abs(n), Math.abs(e)))) || (i.precision = o - ("e" === i.type)); break; case "f": case "%": null != i.precision || isNaN(o = sf(a)) || (i.precision = o - 2 * ("%" === i.type)) }return t.format(i) } function Ng(t) { var n = t.domain; return t.ticks = function (t) { var e = n(); return G(e[0], e[e.length - 1], null == t ? 10 : t) }, t.tickFormat = function (t, e) { var r = n(); return Eg(r[0], r[r.length - 1], null == t ? 10 : t, e) }, t.nice = function (e) { null == e && (e = 10); var r, i, o = n(), a = 0, u = o.length - 1, c = o[a], f = o[u], s = 10; for (f < c && (i = c, c = f, f = i, i = a, a = u, u = i); s-- > 0;) { if ((i = V(c, f, e)) === r) return o[a] = c, o[u] = f, n(o); if (i > 0) c = Math.floor(c / i) * i, f = Math.ceil(f / i) * i; else { if (!(i < 0)) break; c = Math.ceil(c * i) / i, f = Math.floor(f * i) / i } r = i } return t }, t } function kg(t, n) { var e, r = 0, i = (t = t.slice()).length - 1, o = t[r], a = t[i]; return a < o && (e = r, r = i, i = e, e = o, o = a, a = e), t[r] = n.floor(o), t[i] = n.ceil(a), t } function Cg(t) { return Math.log(t) } function Pg(t) { return Math.exp(t) } function zg(t) { return -Math.log(-t) } function $g(t) { return -Math.exp(-t) } function Dg(t) { return isFinite(t) ? +("1e" + t) : t < 0 ? 0 : t } function Rg(t) { return (n, e) => -t(-n, e) } function Fg(n) { const e = n(Cg, Pg), r = e.domain; let i, o, a = 10; function u() { return i = function (t) { return t === Math.E ? Math.log : 10 === t && Math.log10 || 2 === t && Math.log2 || (t = Math.log(t), n => Math.log(n) / t) }(a), o = function (t) { return 10 === t ? Dg : t === Math.E ? Math.exp : n => Math.pow(t, n) }(a), r()[0] < 0 ? (i = Rg(i), o = Rg(o), n(zg, $g)) : n(Cg, Pg), e } return e.base = function (t) { return arguments.length ? (a = +t, u()) : a }, e.domain = function (t) { return arguments.length ? (r(t), u()) : r() }, e.ticks = t => { const n = r(); let e = n[0], u = n[n.length - 1]; const c = u < e; c && ([e, u] = [u, e]); let f, s, l = i(e), h = i(u); const d = null == t ? 10 : +t; let p = []; if (!(a % 1) && h - l < d) { if (l = Math.floor(l), h = Math.ceil(h), e > 0) { for (; l <= h; ++l)for (f = 1; f < a; ++f)if (s = l < 0 ? f / o(-l) : f * o(l), !(s < e)) { if (s > u) break; p.push(s) } } else for (; l <= h; ++l)for (f = a - 1; f >= 1; --f)if (s = l > 0 ? f / o(-l) : f * o(l), !(s < e)) { if (s > u) break; p.push(s) } 2 * p.length < d && (p = G(e, u, d)) } else p = G(l, h, Math.min(h - l, d)).map(o); return c ? p.reverse() : p }, e.tickFormat = (n, r) => { if (null == n && (n = 10), null == r && (r = 10 === a ? "s" : ","), "function" != typeof r && (a % 1 || null != (r = Jc(r)).precision || (r.trim = !0), r = t.format(r)), n === 1 / 0) return r; const u = Math.max(1, a * n / e.ticks().length); return t => { let n = t / o(Math.round(i(t))); return n * a < a - .5 && (n *= a), n <= u ? r(t) : "" } }, e.nice = () => r(kg(r(), { floor: t => o(Math.floor(i(t))), ceil: t => o(Math.ceil(i(t))) })), e } function qg(t) { return function (n) { return Math.sign(n) * Math.log1p(Math.abs(n / t)) } } function Ug(t) { return function (n) { return Math.sign(n) * Math.expm1(Math.abs(n)) * t } } function Ig(t) { var n = 1, e = t(qg(n), Ug(n)); return e.constant = function (e) { return arguments.length ? t(qg(n = +e), Ug(n)) : n }, Ng(e) } function Og(t) { return function (n) { return n < 0 ? -Math.pow(-n, t) : Math.pow(n, t) } } function Bg(t) { return t < 0 ? -Math.sqrt(-t) : Math.sqrt(t) } function Yg(t) { return t < 0 ? -t * t : t * t } function Lg(t) { var n = t(mg, mg), e = 1; return n.exponent = function (n) { return arguments.length ? 1 === (e = +n) ? t(mg, mg) : .5 === e ? t(Bg, Yg) : t(Og(e), Og(1 / e)) : e }, Ng(n) } function jg() { var t = Lg(Ag()); return t.copy = function () { return Tg(t, jg()).exponent(t.exponent()) }, hg.apply(t, arguments), t } function Hg(t) { return Math.sign(t) * t * t } const Xg = new Date, Gg = new Date; function Vg(t, n, e, r) { function i(n) { return t(n = 0 === arguments.length ? new Date : new Date(+n)), n } return i.floor = n => (t(n = new Date(+n)), n), i.ceil = e => (t(e = new Date(e - 1)), n(e, 1), t(e), e), i.round = t => { const n = i(t), e = i.ceil(t); return t - n < e - t ? n : e }, i.offset = (t, e) => (n(t = new Date(+t), null == e ? 1 : Math.floor(e)), t), i.range = (e, r, o) => { const a = []; if (e = i.ceil(e), o = null == o ? 1 : Math.floor(o), !(e < r && o > 0)) return a; let u; do { a.push(u = new Date(+e)), n(e, o), t(e) } while (u < e && e < r); return a }, i.filter = e => Vg((n => { if (n >= n) for (; t(n), !e(n);)n.setTime(n - 1) }), ((t, r) => { if (t >= t) if (r < 0) for (; ++r <= 0;)for (; n(t, -1), !e(t);); else for (; --r >= 0;)for (; n(t, 1), !e(t);); })), e && (i.count = (n, r) => (Xg.setTime(+n), Gg.setTime(+r), t(Xg), t(Gg), Math.floor(e(Xg, Gg))), i.every = t => (t = Math.floor(t), isFinite(t) && t > 0 ? t > 1 ? i.filter(r ? n => r(n) % t == 0 : n => i.count(0, n) % t == 0) : i : null)), i } const Wg = Vg((() => { }), ((t, n) => { t.setTime(+t + n) }), ((t, n) => n - t)); Wg.every = t => (t = Math.floor(t), isFinite(t) && t > 0 ? t > 1 ? Vg((n => { n.setTime(Math.floor(n / t) * t) }), ((n, e) => { n.setTime(+n + e * t) }), ((n, e) => (e - n) / t)) : Wg : null); const Zg = Wg.range, Kg = 1e3, Qg = 6e4, Jg = 36e5, ty = 864e5, ny = 6048e5, ey = 2592e6, ry = 31536e6, iy = Vg((t => { t.setTime(t - t.getMilliseconds()) }), ((t, n) => { t.setTime(+t + n * Kg) }), ((t, n) => (n - t) / Kg), (t => t.getUTCSeconds())), oy = iy.range, ay = Vg((t => { t.setTime(t - t.getMilliseconds() - t.getSeconds() * Kg) }), ((t, n) => { t.setTime(+t + n * Qg) }), ((t, n) => (n - t) / Qg), (t => t.getMinutes())), uy = ay.range, cy = Vg((t => { t.setUTCSeconds(0, 0) }), ((t, n) => { t.setTime(+t + n * Qg) }), ((t, n) => (n - t) / Qg), (t => t.getUTCMinutes())), fy = cy.range, sy = Vg((t => { t.setTime(t - t.getMilliseconds() - t.getSeconds() * Kg - t.getMinutes() * Qg) }), ((t, n) => { t.setTime(+t + n * Jg) }), ((t, n) => (n - t) / Jg), (t => t.getHours())), ly = sy.range, hy = Vg((t => { t.setUTCMinutes(0, 0, 0) }), ((t, n) => { t.setTime(+t + n * Jg) }), ((t, n) => (n - t) / Jg), (t => t.getUTCHours())), dy = hy.range, py = Vg((t => t.setHours(0, 0, 0, 0)), ((t, n) => t.setDate(t.getDate() + n)), ((t, n) => (n - t - (n.getTimezoneOffset() - t.getTimezoneOffset()) * Qg) / ty), (t => t.getDate() - 1)), gy = py.range, yy = Vg((t => { t.setUTCHours(0, 0, 0, 0) }), ((t, n) => { t.setUTCDate(t.getUTCDate() + n) }), ((t, n) => (n - t) / ty), (t => t.getUTCDate() - 1)), vy = yy.range, _y = Vg((t => { t.setUTCHours(0, 0, 0, 0) }), ((t, n) => { t.setUTCDate(t.getUTCDate() + n) }), ((t, n) => (n - t) / ty), (t => Math.floor(t / ty))), by = _y.range; function my(t) { return Vg((n => { n.setDate(n.getDate() - (n.getDay() + 7 - t) % 7), n.setHours(0, 0, 0, 0) }), ((t, n) => { t.setDate(t.getDate() + 7 * n) }), ((t, n) => (n - t - (n.getTimezoneOffset() - t.getTimezoneOffset()) * Qg) / ny)) } const xy = my(0), wy = my(1), My = my(2), Ty = my(3), Ay = my(4), Sy = my(5), Ey = my(6), Ny = xy.range, ky = wy.range, Cy = My.range, Py = Ty.range, zy = Ay.range, $y = Sy.range, Dy = Ey.range; function Ry(t) { return Vg((n => { n.setUTCDate(n.getUTCDate() - (n.getUTCDay() + 7 - t) % 7), n.setUTCHours(0, 0, 0, 0) }), ((t, n) => { t.setUTCDate(t.getUTCDate() + 7 * n) }), ((t, n) => (n - t) / ny)) } const Fy = Ry(0), qy = Ry(1), Uy = Ry(2), Iy = Ry(3), Oy = Ry(4), By = Ry(5), Yy = Ry(6), Ly = Fy.range, jy = qy.range, Hy = Uy.range, Xy = Iy.range, Gy = Oy.range, Vy = By.range, Wy = Yy.range, Zy = Vg((t => { t.setDate(1), t.setHours(0, 0, 0, 0) }), ((t, n) => { t.setMonth(t.getMonth() + n) }), ((t, n) => n.getMonth() - t.getMonth() + 12 * (n.getFullYear() - t.getFullYear())), (t => t.getMonth())), Ky = Zy.range, Qy = Vg((t => { t.setUTCDate(1), t.setUTCHours(0, 0, 0, 0) }), ((t, n) => { t.setUTCMonth(t.getUTCMonth() + n) }), ((t, n) => n.getUTCMonth() - t.getUTCMonth() + 12 * (n.getUTCFullYear() - t.getUTCFullYear())), (t => t.getUTCMonth())), Jy = Qy.range, tv = Vg((t => { t.setMonth(0, 1), t.setHours(0, 0, 0, 0) }), ((t, n) => { t.setFullYear(t.getFullYear() + n) }), ((t, n) => n.getFullYear() - t.getFullYear()), (t => t.getFullYear())); tv.every = t => isFinite(t = Math.floor(t)) && t > 0 ? Vg((n => { n.setFullYear(Math.floor(n.getFullYear() / t) * t), n.setMonth(0, 1), n.setHours(0, 0, 0, 0) }), ((n, e) => { n.setFullYear(n.getFullYear() + e * t) })) : null; const nv = tv.range, ev = Vg((t => { t.setUTCMonth(0, 1), t.setUTCHours(0, 0, 0, 0) }), ((t, n) => { t.setUTCFullYear(t.getUTCFullYear() + n) }), ((t, n) => n.getUTCFullYear() - t.getUTCFullYear()), (t => t.getUTCFullYear())); ev.every = t => isFinite(t = Math.floor(t)) && t > 0 ? Vg((n => { n.setUTCFullYear(Math.floor(n.getUTCFullYear() / t) * t), n.setUTCMonth(0, 1), n.setUTCHours(0, 0, 0, 0) }), ((n, e) => { n.setUTCFullYear(n.getUTCFullYear() + e * t) })) : null; const rv = ev.range; function iv(t, n, e, i, o, a) { const u = [[iy, 1, Kg], [iy, 5, 5e3], [iy, 15, 15e3], [iy, 30, 3e4], [a, 1, Qg], [a, 5, 3e5], [a, 15, 9e5], [a, 30, 18e5], [o, 1, Jg], [o, 3, 108e5], [o, 6, 216e5], [o, 12, 432e5], [i, 1, ty], [i, 2, 1728e5], [e, 1, ny], [n, 1, ey], [n, 3, 7776e6], [t, 1, ry]]; function c(n, e, i) { const o = Math.abs(e - n) / i, a = r((([, , t]) => t)).right(u, o); if (a === u.length) return t.every(W(n / ry, e / ry, i)); if (0 === a) return Wg.every(Math.max(W(n, e, i), 1)); const [c, f] = u[o / u[a - 1][2] < u[a][2] / o ? a - 1 : a]; return c.every(f) } return [function (t, n, e) { const r = n < t; r && ([t, n] = [n, t]); const i = e && "function" == typeof e.range ? e : c(t, n, e), o = i ? i.range(t, +n + 1) : []; return r ? o.reverse() : o }, c] } const [ov, av] = iv(ev, Qy, Fy, _y, hy, cy), [uv, cv] = iv(tv, Zy, xy, py, sy, ay); function fv(t) { if (0 <= t.y && t.y < 100) { var n = new Date(-1, t.m, t.d, t.H, t.M, t.S, t.L); return n.setFullYear(t.y), n } return new Date(t.y, t.m, t.d, t.H, t.M, t.S, t.L) } function sv(t) { if (0 <= t.y && t.y < 100) { var n = new Date(Date.UTC(-1, t.m, t.d, t.H, t.M, t.S, t.L)); return n.setUTCFullYear(t.y), n } return new Date(Date.UTC(t.y, t.m, t.d, t.H, t.M, t.S, t.L)) } function lv(t, n, e) { return { y: t, m: n, d: e, H: 0, M: 0, S: 0, L: 0 } } function hv(t) { var n = t.dateTime, e = t.date, r = t.time, i = t.periods, o = t.days, a = t.shortDays, u = t.months, c = t.shortMonths, f = mv(i), s = xv(i), l = mv(o), h = xv(o), d = mv(a), p = xv(a), g = mv(u), y = xv(u), v = mv(c), _ = xv(c), b = { a: function (t) { return a[t.getDay()] }, A: function (t) { return o[t.getDay()] }, b: function (t) { return c[t.getMonth()] }, B: function (t) { return u[t.getMonth()] }, c: null, d: Yv, e: Yv, f: Gv, g: i_, G: a_, H: Lv, I: jv, j: Hv, L: Xv, m: Vv, M: Wv, p: function (t) { return i[+(t.getHours() >= 12)] }, q: function (t) { return 1 + ~~(t.getMonth() / 3) }, Q: k_, s: C_, S: Zv, u: Kv, U: Qv, V: t_, w: n_, W: e_, x: null, X: null, y: r_, Y: o_, Z: u_, "%": N_ }, m = { a: function (t) { return a[t.getUTCDay()] }, A: function (t) { return o[t.getUTCDay()] }, b: function (t) { return c[t.getUTCMonth()] }, B: function (t) { return u[t.getUTCMonth()] }, c: null, d: c_, e: c_, f: d_, g: T_, G: S_, H: f_, I: s_, j: l_, L: h_, m: p_, M: g_, p: function (t) { return i[+(t.getUTCHours() >= 12)] }, q: function (t) { return 1 + ~~(t.getUTCMonth() / 3) }, Q: k_, s: C_, S: y_, u: v_, U: __, V: m_, w: x_, W: w_, x: null, X: null, y: M_, Y: A_, Z: E_, "%": N_ }, x = { a: function (t, n, e) { var r = d.exec(n.slice(e)); return r ? (t.w = p.get(r[0].toLowerCase()), e + r[0].length) : -1 }, A: function (t, n, e) { var r = l.exec(n.slice(e)); return r ? (t.w = h.get(r[0].toLowerCase()), e + r[0].length) : -1 }, b: function (t, n, e) { var r = v.exec(n.slice(e)); return r ? (t.m = _.get(r[0].toLowerCase()), e + r[0].length) : -1 }, B: function (t, n, e) { var r = g.exec(n.slice(e)); return r ? (t.m = y.get(r[0].toLowerCase()), e + r[0].length) : -1 }, c: function (t, e, r) { return T(t, n, e, r) }, d: zv, e: zv, f: Uv, g: Nv, G: Ev, H: Dv, I: Dv, j: $v, L: qv, m: Pv, M: Rv, p: function (t, n, e) { var r = f.exec(n.slice(e)); return r ? (t.p = s.get(r[0].toLowerCase()), e + r[0].length) : -1 }, q: Cv, Q: Ov, s: Bv, S: Fv, u: Mv, U: Tv, V: Av, w: wv, W: Sv, x: function (t, n, r) { return T(t, e, n, r) }, X: function (t, n, e) { return T(t, r, n, e) }, y: Nv, Y: Ev, Z: kv, "%": Iv }; function w(t, n) { return function (e) { var r, i, o, a = [], u = -1, c = 0, f = t.length; for (e instanceof Date || (e = new Date(+e)); ++u < f;)37 === t.charCodeAt(u) && (a.push(t.slice(c, u)), null != (i = pv[r = t.charAt(++u)]) ? r = t.charAt(++u) : i = "e" === r ? " " : "0", (o = n[r]) && (r = o(e, i)), a.push(r), c = u + 1); return a.push(t.slice(c, u)), a.join("") } } function M(t, n) { return function (e) { var r, i, o = lv(1900, void 0, 1); if (T(o, t, e += "", 0) != e.length) return null; if ("Q" in o) return new Date(o.Q); if ("s" in o) return new Date(1e3 * o.s + ("L" in o ? o.L : 0)); if (n && !("Z" in o) && (o.Z = 0), "p" in o && (o.H = o.H % 12 + 12 * o.p), void 0 === o.m && (o.m = "q" in o ? o.q : 0), "V" in o) { if (o.V < 1 || o.V > 53) return null; "w" in o || (o.w = 1), "Z" in o ? (i = (r = sv(lv(o.y, 0, 1))).getUTCDay(), r = i > 4 || 0 === i ? qy.ceil(r) : qy(r), r = yy.offset(r, 7 * (o.V - 1)), o.y = r.getUTCFullYear(), o.m = r.getUTCMonth(), o.d = r.getUTCDate() + (o.w + 6) % 7) : (i = (r = fv(lv(o.y, 0, 1))).getDay(), r = i > 4 || 0 === i ? wy.ceil(r) : wy(r), r = py.offset(r, 7 * (o.V - 1)), o.y = r.getFullYear(), o.m = r.getMonth(), o.d = r.getDate() + (o.w + 6) % 7) } else ("W" in o || "U" in o) && ("w" in o || (o.w = "u" in o ? o.u % 7 : "W" in o ? 1 : 0), i = "Z" in o ? sv(lv(o.y, 0, 1)).getUTCDay() : fv(lv(o.y, 0, 1)).getDay(), o.m = 0, o.d = "W" in o ? (o.w + 6) % 7 + 7 * o.W - (i + 5) % 7 : o.w + 7 * o.U - (i + 6) % 7); return "Z" in o ? (o.H += o.Z / 100 | 0, o.M += o.Z % 100, sv(o)) : fv(o) } } function T(t, n, e, r) { for (var i, o, a = 0, u = n.length, c = e.length; a < u;) { if (r >= c) return -1; if (37 === (i = n.charCodeAt(a++))) { if (i = n.charAt(a++), !(o = x[i in pv ? n.charAt(a++) : i]) || (r = o(t, e, r)) < 0) return -1 } else if (i != e.charCodeAt(r++)) return -1 } return r } return b.x = w(e, b), b.X = w(r, b), b.c = w(n, b), m.x = w(e, m), m.X = w(r, m), m.c = w(n, m), { format: function (t) { var n = w(t += "", b); return n.toString = function () { return t }, n }, parse: function (t) { var n = M(t += "", !1); return n.toString = function () { return t }, n }, utcFormat: function (t) { var n = w(t += "", m); return n.toString = function () { return t }, n }, utcParse: function (t) { var n = M(t += "", !0); return n.toString = function () { return t }, n } } } var dv, pv = { "-": "", _: " ", 0: "0" }, gv = /^\s*\d+/, yv = /^%/, vv = /[\\^$*+?|[\]().{}]/g; function _v(t, n, e) { var r = t < 0 ? "-" : "", i = (r ? -t : t) + "", o = i.length; return r + (o < e ? new Array(e - o + 1).join(n) + i : i) } function bv(t) { return t.replace(vv, "\\$&") } function mv(t) { return new RegExp("^(?:" + t.map(bv).join("|") + ")", "i") } function xv(t) { return new Map(t.map(((t, n) => [t.toLowerCase(), n]))) } function wv(t, n, e) { var r = gv.exec(n.slice(e, e + 1)); return r ? (t.w = +r[0], e + r[0].length) : -1 } function Mv(t, n, e) { var r = gv.exec(n.slice(e, e + 1)); return r ? (t.u = +r[0], e + r[0].length) : -1 } function Tv(t, n, e) { var r = gv.exec(n.slice(e, e + 2)); return r ? (t.U = +r[0], e + r[0].length) : -1 } function Av(t, n, e) { var r = gv.exec(n.slice(e, e + 2)); return r ? (t.V = +r[0], e + r[0].length) : -1 } function Sv(t, n, e) { var r = gv.exec(n.slice(e, e + 2)); return r ? (t.W = +r[0], e + r[0].length) : -1 } function Ev(t, n, e) { var r = gv.exec(n.slice(e, e + 4)); return r ? (t.y = +r[0], e + r[0].length) : -1 } function Nv(t, n, e) { var r = gv.exec(n.slice(e, e + 2)); return r ? (t.y = +r[0] + (+r[0] > 68 ? 1900 : 2e3), e + r[0].length) : -1 } function kv(t, n, e) { var r = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(n.slice(e, e + 6)); return r ? (t.Z = r[1] ? 0 : -(r[2] + (r[3] || "00")), e + r[0].length) : -1 } function Cv(t, n, e) { var r = gv.exec(n.slice(e, e + 1)); return r ? (t.q = 3 * r[0] - 3, e + r[0].length) : -1 } function Pv(t, n, e) { var r = gv.exec(n.slice(e, e + 2)); return r ? (t.m = r[0] - 1, e + r[0].length) : -1 } function zv(t, n, e) { var r = gv.exec(n.slice(e, e + 2)); return r ? (t.d = +r[0], e + r[0].length) : -1 } function $v(t, n, e) { var r = gv.exec(n.slice(e, e + 3)); return r ? (t.m = 0, t.d = +r[0], e + r[0].length) : -1 } function Dv(t, n, e) { var r = gv.exec(n.slice(e, e + 2)); return r ? (t.H = +r[0], e + r[0].length) : -1 } function Rv(t, n, e) { var r = gv.exec(n.slice(e, e + 2)); return r ? (t.M = +r[0], e + r[0].length) : -1 } function Fv(t, n, e) { var r = gv.exec(n.slice(e, e + 2)); return r ? (t.S = +r[0], e + r[0].length) : -1 } function qv(t, n, e) { var r = gv.exec(n.slice(e, e + 3)); return r ? (t.L = +r[0], e + r[0].length) : -1 } function Uv(t, n, e) { var r = gv.exec(n.slice(e, e + 6)); return r ? (t.L = Math.floor(r[0] / 1e3), e + r[0].length) : -1 } function Iv(t, n, e) { var r = yv.exec(n.slice(e, e + 1)); return r ? e + r[0].length : -1 } function Ov(t, n, e) { var r = gv.exec(n.slice(e)); return r ? (t.Q = +r[0], e + r[0].length) : -1 } function Bv(t, n, e) { var r = gv.exec(n.slice(e)); return r ? (t.s = +r[0], e + r[0].length) : -1 } function Yv(t, n) { return _v(t.getDate(), n, 2) } function Lv(t, n) { return _v(t.getHours(), n, 2) } function jv(t, n) { return _v(t.getHours() % 12 || 12, n, 2) } function Hv(t, n) { return _v(1 + py.count(tv(t), t), n, 3) } function Xv(t, n) { return _v(t.getMilliseconds(), n, 3) } function Gv(t, n) { return Xv(t, n) + "000" } function Vv(t, n) { return _v(t.getMonth() + 1, n, 2) } function Wv(t, n) { return _v(t.getMinutes(), n, 2) } function Zv(t, n) { return _v(t.getSeconds(), n, 2) } function Kv(t) { var n = t.getDay(); return 0 === n ? 7 : n } function Qv(t, n) { return _v(xy.count(tv(t) - 1, t), n, 2) } function Jv(t) { var n = t.getDay(); return n >= 4 || 0 === n ? Ay(t) : Ay.ceil(t) } function t_(t, n) { return t = Jv(t), _v(Ay.count(tv(t), t) + (4 === tv(t).getDay()), n, 2) } function n_(t) { return t.getDay() } function e_(t, n) { return _v(wy.count(tv(t) - 1, t), n, 2) } function r_(t, n) { return _v(t.getFullYear() % 100, n, 2) } function i_(t, n) { return _v((t = Jv(t)).getFullYear() % 100, n, 2) } function o_(t, n) { return _v(t.getFullYear() % 1e4, n, 4) } function a_(t, n) { var e = t.getDay(); return _v((t = e >= 4 || 0 === e ? Ay(t) : Ay.ceil(t)).getFullYear() % 1e4, n, 4) } function u_(t) { var n = t.getTimezoneOffset(); return (n > 0 ? "-" : (n *= -1, "+")) + _v(n / 60 | 0, "0", 2) + _v(n % 60, "0", 2) } function c_(t, n) { return _v(t.getUTCDate(), n, 2) } function f_(t, n) { return _v(t.getUTCHours(), n, 2) } function s_(t, n) { return _v(t.getUTCHours() % 12 || 12, n, 2) } function l_(t, n) { return _v(1 + yy.count(ev(t), t), n, 3) } function h_(t, n) { return _v(t.getUTCMilliseconds(), n, 3) } function d_(t, n) { return h_(t, n) + "000" } function p_(t, n) { return _v(t.getUTCMonth() + 1, n, 2) } function g_(t, n) { return _v(t.getUTCMinutes(), n, 2) } function y_(t, n) { return _v(t.getUTCSeconds(), n, 2) } function v_(t) { var n = t.getUTCDay(); return 0 === n ? 7 : n } function __(t, n) { return _v(Fy.count(ev(t) - 1, t), n, 2) } function b_(t) { var n = t.getUTCDay(); return n >= 4 || 0 === n ? Oy(t) : Oy.ceil(t) } function m_(t, n) { return t = b_(t), _v(Oy.count(ev(t), t) + (4 === ev(t).getUTCDay()), n, 2) } function x_(t) { return t.getUTCDay() } function w_(t, n) { return _v(qy.count(ev(t) - 1, t), n, 2) } function M_(t, n) { return _v(t.getUTCFullYear() % 100, n, 2) } function T_(t, n) { return _v((t = b_(t)).getUTCFullYear() % 100, n, 2) } function A_(t, n) { return _v(t.getUTCFullYear() % 1e4, n, 4) } function S_(t, n) { var e = t.getUTCDay(); return _v((t = e >= 4 || 0 === e ? Oy(t) : Oy.ceil(t)).getUTCFullYear() % 1e4, n, 4) } function E_() { return "+0000" } function N_() { return "%" } function k_(t) { return +t } function C_(t) { return Math.floor(+t / 1e3) } function P_(n) { return dv = hv(n), t.timeFormat = dv.format, t.timeParse = dv.parse, t.utcFormat = dv.utcFormat, t.utcParse = dv.utcParse, dv } t.timeFormat = void 0, t.timeParse = void 0, t.utcFormat = void 0, t.utcParse = void 0, P_({ dateTime: "%x, %X", date: "%-m/%-d/%Y", time: "%-I:%M:%S %p", periods: ["AM", "PM"], days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] }); var z_ = "%Y-%m-%dT%H:%M:%S.%LZ"; var $_ = Date.prototype.toISOString ? function (t) { return t.toISOString() } : t.utcFormat(z_), D_ = $_; var R_ = +new Date("2000-01-01T00:00:00.000Z") ? function (t) { var n = new Date(t); return isNaN(n) ? null : n } : t.utcParse(z_), F_ = R_; function q_(t) { return new Date(t) } function U_(t) { return t instanceof Date ? +t : +new Date(+t) } function I_(t, n, e, r, i, o, a, u, c, f) { var s = Sg(), l = s.invert, h = s.domain, d = f(".%L"), p = f(":%S"), g = f("%I:%M"), y = f("%I %p"), v = f("%a %d"), _ = f("%b %d"), b = f("%B"), m = f("%Y"); function x(t) { return (c(t) < t ? d : u(t) < t ? p : a(t) < t ? g : o(t) < t ? y : r(t) < t ? i(t) < t ? v : _ : e(t) < t ? b : m)(t) } return s.invert = function (t) { return new Date(l(t)) }, s.domain = function (t) { return arguments.length ? h(Array.from(t, U_)) : h().map(q_) }, s.ticks = function (n) { var e = h(); return t(e[0], e[e.length - 1], null == n ? 10 : n) }, s.tickFormat = function (t, n) { return null == n ? x : f(n) }, s.nice = function (t) { var e = h(); return t && "function" == typeof t.range || (t = n(e[0], e[e.length - 1], null == t ? 10 : t)), t ? h(kg(e, t)) : s }, s.copy = function () { return Tg(s, I_(t, n, e, r, i, o, a, u, c, f)) }, s } function O_() { var t, n, e, r, i, o = 0, a = 1, u = mg, c = !1; function f(n) { return null == n || isNaN(n = +n) ? i : u(0 === e ? .5 : (n = (r(n) - t) * e, c ? Math.max(0, Math.min(1, n)) : n)) } function s(t) { return function (n) { var e, r; return arguments.length ? ([e, r] = n, u = t(e, r), f) : [u(0), u(1)] } } return f.domain = function (i) { return arguments.length ? ([o, a] = i, t = r(o = +o), n = r(a = +a), e = t === n ? 0 : 1 / (n - t), f) : [o, a] }, f.clamp = function (t) { return arguments.length ? (c = !!t, f) : c }, f.interpolator = function (t) { return arguments.length ? (u = t, f) : u }, f.range = s(Gr), f.rangeRound = s(Vr), f.unknown = function (t) { return arguments.length ? (i = t, f) : i }, function (i) { return r = i, t = i(o), n = i(a), e = t === n ? 0 : 1 / (n - t), f } } function B_(t, n) { return n.domain(t.domain()).interpolator(t.interpolator()).clamp(t.clamp()).unknown(t.unknown()) } function Y_() { var t = Lg(O_()); return t.copy = function () { return B_(t, Y_()).exponent(t.exponent()) }, dg.apply(t, arguments) } function L_() { var t, n, e, r, i, o, a, u = 0, c = .5, f = 1, s = 1, l = mg, h = !1; function d(t) { return isNaN(t = +t) ? a : (t = .5 + ((t = +o(t)) - n) * (s * t < s * n ? r : i), l(h ? Math.max(0, Math.min(1, t)) : t)) } function p(t) { return function (n) { var e, r, i; return arguments.length ? ([e, r, i] = n, l = di(t, [e, r, i]), d) : [l(0), l(.5), l(1)] } } return d.domain = function (a) { return arguments.length ? ([u, c, f] = a, t = o(u = +u), n = o(c = +c), e = o(f = +f), r = t === n ? 0 : .5 / (n - t), i = n === e ? 0 : .5 / (e - n), s = n < t ? -1 : 1, d) : [u, c, f] }, d.clamp = function (t) { return arguments.length ? (h = !!t, d) : h }, d.interpolator = function (t) { return arguments.length ? (l = t, d) : l }, d.range = p(Gr), d.rangeRound = p(Vr), d.unknown = function (t) { return arguments.length ? (a = t, d) : a }, function (a) { return o = a, t = a(u), n = a(c), e = a(f), r = t === n ? 0 : .5 / (n - t), i = n === e ? 0 : .5 / (e - n), s = n < t ? -1 : 1, d } } function j_() { var t = Lg(L_()); return t.copy = function () { return B_(t, j_()).exponent(t.exponent()) }, dg.apply(t, arguments) } function H_(t) { for (var n = t.length / 6 | 0, e = new Array(n), r = 0; r < n;)e[r] = "#" + t.slice(6 * r, 6 * ++r); return e } var X_ = H_("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf"), G_ = H_("7fc97fbeaed4fdc086ffff99386cb0f0027fbf5b17666666"), V_ = H_("1b9e77d95f027570b3e7298a66a61ee6ab02a6761d666666"), W_ = H_("a6cee31f78b4b2df8a33a02cfb9a99e31a1cfdbf6fff7f00cab2d66a3d9affff99b15928"), Z_ = H_("fbb4aeb3cde3ccebc5decbe4fed9a6ffffcce5d8bdfddaecf2f2f2"), K_ = H_("b3e2cdfdcdaccbd5e8f4cae4e6f5c9fff2aef1e2cccccccc"), Q_ = H_("e41a1c377eb84daf4a984ea3ff7f00ffff33a65628f781bf999999"), J_ = H_("66c2a5fc8d628da0cbe78ac3a6d854ffd92fe5c494b3b3b3"), tb = H_("8dd3c7ffffb3bebadafb807280b1d3fdb462b3de69fccde5d9d9d9bc80bdccebc5ffed6f"), nb = H_("4e79a7f28e2ce1575976b7b259a14fedc949af7aa1ff9da79c755fbab0ab"), eb = t => Fr(t[t.length - 1]), rb = new Array(3).concat("d8b365f5f5f55ab4ac", "a6611adfc27d80cdc1018571", "a6611adfc27df5f5f580cdc1018571", "8c510ad8b365f6e8c3c7eae55ab4ac01665e", "8c510ad8b365f6e8c3f5f5f5c7eae55ab4ac01665e", "8c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e", "8c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e", "5430058c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e003c30", "5430058c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e003c30").map(H_), ib = eb(rb), ob = new Array(3).concat("af8dc3f7f7f77fbf7b", "7b3294c2a5cfa6dba0008837", "7b3294c2a5cff7f7f7a6dba0008837", "762a83af8dc3e7d4e8d9f0d37fbf7b1b7837", "762a83af8dc3e7d4e8f7f7f7d9f0d37fbf7b1b7837", "762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b7837", "762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b7837", "40004b762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b783700441b", "40004b762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b783700441b").map(H_), ab = eb(ob), ub = new Array(3).concat("e9a3c9f7f7f7a1d76a", "d01c8bf1b6dab8e1864dac26", "d01c8bf1b6daf7f7f7b8e1864dac26", "c51b7de9a3c9fde0efe6f5d0a1d76a4d9221", "c51b7de9a3c9fde0eff7f7f7e6f5d0a1d76a4d9221", "c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221", "c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221", "8e0152c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221276419", "8e0152c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221276419").map(H_), cb = eb(ub), fb = new Array(3).concat("998ec3f7f7f7f1a340", "5e3c99b2abd2fdb863e66101", "5e3c99b2abd2f7f7f7fdb863e66101", "542788998ec3d8daebfee0b6f1a340b35806", "542788998ec3d8daebf7f7f7fee0b6f1a340b35806", "5427888073acb2abd2d8daebfee0b6fdb863e08214b35806", "5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b35806", "2d004b5427888073acb2abd2d8daebfee0b6fdb863e08214b358067f3b08", "2d004b5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b358067f3b08").map(H_), sb = eb(fb), lb = new Array(3).concat("ef8a62f7f7f767a9cf", "ca0020f4a58292c5de0571b0", "ca0020f4a582f7f7f792c5de0571b0", "b2182bef8a62fddbc7d1e5f067a9cf2166ac", "b2182bef8a62fddbc7f7f7f7d1e5f067a9cf2166ac", "b2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac", "b2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac", "67001fb2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac053061", "67001fb2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac053061").map(H_), hb = eb(lb), db = new Array(3).concat("ef8a62ffffff999999", "ca0020f4a582bababa404040", "ca0020f4a582ffffffbababa404040", "b2182bef8a62fddbc7e0e0e09999994d4d4d", "b2182bef8a62fddbc7ffffffe0e0e09999994d4d4d", "b2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d", "b2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d", "67001fb2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d1a1a1a", "67001fb2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d1a1a1a").map(H_), pb = eb(db), gb = new Array(3).concat("fc8d59ffffbf91bfdb", "d7191cfdae61abd9e92c7bb6", "d7191cfdae61ffffbfabd9e92c7bb6", "d73027fc8d59fee090e0f3f891bfdb4575b4", "d73027fc8d59fee090ffffbfe0f3f891bfdb4575b4", "d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4", "d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4", "a50026d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4313695", "a50026d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4313695").map(H_), yb = eb(gb), vb = new Array(3).concat("fc8d59ffffbf91cf60", "d7191cfdae61a6d96a1a9641", "d7191cfdae61ffffbfa6d96a1a9641", "d73027fc8d59fee08bd9ef8b91cf601a9850", "d73027fc8d59fee08bffffbfd9ef8b91cf601a9850", "d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850", "d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850", "a50026d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850006837", "a50026d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850006837").map(H_), _b = eb(vb), bb = new Array(3).concat("fc8d59ffffbf99d594", "d7191cfdae61abdda42b83ba", "d7191cfdae61ffffbfabdda42b83ba", "d53e4ffc8d59fee08be6f59899d5943288bd", "d53e4ffc8d59fee08bffffbfe6f59899d5943288bd", "d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd", "d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd", "9e0142d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd5e4fa2", "9e0142d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd5e4fa2").map(H_), mb = eb(bb), xb = new Array(3).concat("e5f5f999d8c92ca25f", "edf8fbb2e2e266c2a4238b45", "edf8fbb2e2e266c2a42ca25f006d2c", "edf8fbccece699d8c966c2a42ca25f006d2c", "edf8fbccece699d8c966c2a441ae76238b45005824", "f7fcfde5f5f9ccece699d8c966c2a441ae76238b45005824", "f7fcfde5f5f9ccece699d8c966c2a441ae76238b45006d2c00441b").map(H_), wb = eb(xb), Mb = new Array(3).concat("e0ecf49ebcda8856a7", "edf8fbb3cde38c96c688419d", "edf8fbb3cde38c96c68856a7810f7c", "edf8fbbfd3e69ebcda8c96c68856a7810f7c", "edf8fbbfd3e69ebcda8c96c68c6bb188419d6e016b", "f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d6e016b", "f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d810f7c4d004b").map(H_), Tb = eb(Mb), Ab = new Array(3).concat("e0f3dba8ddb543a2ca", "f0f9e8bae4bc7bccc42b8cbe", "f0f9e8bae4bc7bccc443a2ca0868ac", "f0f9e8ccebc5a8ddb57bccc443a2ca0868ac", "f0f9e8ccebc5a8ddb57bccc44eb3d32b8cbe08589e", "f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe08589e", "f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe0868ac084081").map(H_), Sb = eb(Ab), Eb = new Array(3).concat("fee8c8fdbb84e34a33", "fef0d9fdcc8afc8d59d7301f", "fef0d9fdcc8afc8d59e34a33b30000", "fef0d9fdd49efdbb84fc8d59e34a33b30000", "fef0d9fdd49efdbb84fc8d59ef6548d7301f990000", "fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301f990000", "fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301fb300007f0000").map(H_), Nb = eb(Eb), kb = new Array(3).concat("ece2f0a6bddb1c9099", "f6eff7bdc9e167a9cf02818a", "f6eff7bdc9e167a9cf1c9099016c59", "f6eff7d0d1e6a6bddb67a9cf1c9099016c59", "f6eff7d0d1e6a6bddb67a9cf3690c002818a016450", "fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016450", "fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016c59014636").map(H_), Cb = eb(kb), Pb = new Array(3).concat("ece7f2a6bddb2b8cbe", "f1eef6bdc9e174a9cf0570b0", "f1eef6bdc9e174a9cf2b8cbe045a8d", "f1eef6d0d1e6a6bddb74a9cf2b8cbe045a8d", "f1eef6d0d1e6a6bddb74a9cf3690c00570b0034e7b", "fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0034e7b", "fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0045a8d023858").map(H_), zb = eb(Pb), $b = new Array(3).concat("e7e1efc994c7dd1c77", "f1eef6d7b5d8df65b0ce1256", "f1eef6d7b5d8df65b0dd1c77980043", "f1eef6d4b9dac994c7df65b0dd1c77980043", "f1eef6d4b9dac994c7df65b0e7298ace125691003f", "f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125691003f", "f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125698004367001f").map(H_), Db = eb($b), Rb = new Array(3).concat("fde0ddfa9fb5c51b8a", "feebe2fbb4b9f768a1ae017e", "feebe2fbb4b9f768a1c51b8a7a0177", "feebe2fcc5c0fa9fb5f768a1c51b8a7a0177", "feebe2fcc5c0fa9fb5f768a1dd3497ae017e7a0177", "fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a0177", "fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a017749006a").map(H_), Fb = eb(Rb), qb = new Array(3).concat("edf8b17fcdbb2c7fb8", "ffffcca1dab441b6c4225ea8", "ffffcca1dab441b6c42c7fb8253494", "ffffccc7e9b47fcdbb41b6c42c7fb8253494", "ffffccc7e9b47fcdbb41b6c41d91c0225ea80c2c84", "ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea80c2c84", "ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea8253494081d58").map(H_), Ub = eb(qb), Ib = new Array(3).concat("f7fcb9addd8e31a354", "ffffccc2e69978c679238443", "ffffccc2e69978c67931a354006837", "ffffccd9f0a3addd8e78c67931a354006837", "ffffccd9f0a3addd8e78c67941ab5d238443005a32", "ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443005a32", "ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443006837004529").map(H_), Ob = eb(Ib), Bb = new Array(3).concat("fff7bcfec44fd95f0e", "ffffd4fed98efe9929cc4c02", "ffffd4fed98efe9929d95f0e993404", "ffffd4fee391fec44ffe9929d95f0e993404", "ffffd4fee391fec44ffe9929ec7014cc4c028c2d04", "ffffe5fff7bcfee391fec44ffe9929ec7014cc4c028c2d04", "ffffe5fff7bcfee391fec44ffe9929ec7014cc4c02993404662506").map(H_), Yb = eb(Bb), Lb = new Array(3).concat("ffeda0feb24cf03b20", "ffffb2fecc5cfd8d3ce31a1c", "ffffb2fecc5cfd8d3cf03b20bd0026", "ffffb2fed976feb24cfd8d3cf03b20bd0026", "ffffb2fed976feb24cfd8d3cfc4e2ae31a1cb10026", "ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cb10026", "ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cbd0026800026").map(H_), jb = eb(Lb), Hb = new Array(3).concat("deebf79ecae13182bd", "eff3ffbdd7e76baed62171b5", "eff3ffbdd7e76baed63182bd08519c", "eff3ffc6dbef9ecae16baed63182bd08519c", "eff3ffc6dbef9ecae16baed64292c62171b5084594", "f7fbffdeebf7c6dbef9ecae16baed64292c62171b5084594", "f7fbffdeebf7c6dbef9ecae16baed64292c62171b508519c08306b").map(H_), Xb = eb(Hb), Gb = new Array(3).concat("e5f5e0a1d99b31a354", "edf8e9bae4b374c476238b45", "edf8e9bae4b374c47631a354006d2c", "edf8e9c7e9c0a1d99b74c47631a354006d2c", "edf8e9c7e9c0a1d99b74c47641ab5d238b45005a32", "f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45005a32", "f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45006d2c00441b").map(H_), Vb = eb(Gb), Wb = new Array(3).concat("f0f0f0bdbdbd636363", "f7f7f7cccccc969696525252", "f7f7f7cccccc969696636363252525", "f7f7f7d9d9d9bdbdbd969696636363252525", "f7f7f7d9d9d9bdbdbd969696737373525252252525", "fffffff0f0f0d9d9d9bdbdbd969696737373525252252525", "fffffff0f0f0d9d9d9bdbdbd969696737373525252252525000000").map(H_), Zb = eb(Wb), Kb = new Array(3).concat("efedf5bcbddc756bb1", "f2f0f7cbc9e29e9ac86a51a3", "f2f0f7cbc9e29e9ac8756bb154278f", "f2f0f7dadaebbcbddc9e9ac8756bb154278f", "f2f0f7dadaebbcbddc9e9ac8807dba6a51a34a1486", "fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a34a1486", "fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a354278f3f007d").map(H_), Qb = eb(Kb), Jb = new Array(3).concat("fee0d2fc9272de2d26", "fee5d9fcae91fb6a4acb181d", "fee5d9fcae91fb6a4ade2d26a50f15", "fee5d9fcbba1fc9272fb6a4ade2d26a50f15", "fee5d9fcbba1fc9272fb6a4aef3b2ccb181d99000d", "fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181d99000d", "fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181da50f1567000d").map(H_), tm = eb(Jb), nm = new Array(3).concat("fee6cefdae6be6550d", "feeddefdbe85fd8d3cd94701", "feeddefdbe85fd8d3ce6550da63603", "feeddefdd0a2fdae6bfd8d3ce6550da63603", "feeddefdd0a2fdae6bfd8d3cf16913d948018c2d04", "fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d948018c2d04", "fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d94801a636037f2704").map(H_), em = eb(nm); var rm = hi(Tr(300, .5, 0), Tr(-240, .5, 1)), im = hi(Tr(-100, .75, .35), Tr(80, 1.5, .8)), om = hi(Tr(260, .75, .35), Tr(80, 1.5, .8)), am = Tr(); var um = Fe(), cm = Math.PI / 3, fm = 2 * Math.PI / 3; function sm(t) { var n = t.length; return function (e) { return t[Math.max(0, Math.min(n - 1, Math.floor(e * n)))] } } var lm = sm(H_("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725")), hm = sm(H_("00000401000501010601010802010902020b02020d03030f03031204041405041606051806051a07061c08071e0907200a08220b09240c09260d0a290e0b2b100b2d110c2f120d31130d34140e36150e38160f3b180f3d19103f1a10421c10441d11471e114920114b21114e22115024125325125527125829115a2a115c2c115f2d11612f116331116533106734106936106b38106c390f6e3b0f703d0f713f0f72400f74420f75440f764510774710784910784a10794c117a4e117b4f127b51127c52137c54137d56147d57157e59157e5a167e5c167f5d177f5f187f601880621980641a80651a80671b80681c816a1c816b1d816d1d816e1e81701f81721f817320817521817621817822817922827b23827c23827e24828025828125818326818426818627818827818928818b29818c29818e2a81902a81912b81932b80942c80962c80982d80992d809b2e7f9c2e7f9e2f7fa02f7fa1307ea3307ea5317ea6317da8327daa337dab337cad347cae347bb0357bb2357bb3367ab5367ab73779b83779ba3878bc3978bd3977bf3a77c03a76c23b75c43c75c53c74c73d73c83e73ca3e72cc3f71cd4071cf4070d0416fd2426fd3436ed5446dd6456cd8456cd9466bdb476adc4869de4968df4a68e04c67e24d66e34e65e44f64e55064e75263e85362e95462ea5661eb5760ec5860ed5a5fee5b5eef5d5ef05f5ef1605df2625df2645cf3655cf4675cf4695cf56b5cf66c5cf66e5cf7705cf7725cf8745cf8765cf9785df9795df97b5dfa7d5efa7f5efa815ffb835ffb8560fb8761fc8961fc8a62fc8c63fc8e64fc9065fd9266fd9467fd9668fd9869fd9a6afd9b6bfe9d6cfe9f6dfea16efea36ffea571fea772fea973feaa74feac76feae77feb078feb27afeb47bfeb67cfeb77efeb97ffebb81febd82febf84fec185fec287fec488fec68afec88cfeca8dfecc8ffecd90fecf92fed194fed395fed597fed799fed89afdda9cfddc9efddea0fde0a1fde2a3fde3a5fde5a7fde7a9fde9aafdebacfcecaefceeb0fcf0b2fcf2b4fcf4b6fcf6b8fcf7b9fcf9bbfcfbbdfcfdbf")), dm = sm(H_("00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a07220b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b09643d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545d24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711ff1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0af98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0ffcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4")), pm = sm(H_("0d088710078813078916078a19068c1b068d1d068e20068f2206902406912605912805922a05932c05942e05952f059631059733059735049837049938049a3a049a3c049b3e049c3f049c41049d43039e44039e46039f48039f4903a04b03a14c02a14e02a25002a25102a35302a35502a45601a45801a45901a55b01a55c01a65e01a66001a66100a76300a76400a76600a76700a86900a86a00a86c00a86e00a86f00a87100a87201a87401a87501a87701a87801a87a02a87b02a87d03a87e03a88004a88104a78305a78405a78606a68707a68808a68a09a58b0aa58d0ba58e0ca48f0da4910ea3920fa39410a29511a19613a19814a099159f9a169f9c179e9d189d9e199da01a9ca11b9ba21d9aa31e9aa51f99a62098a72197a82296aa2395ab2494ac2694ad2793ae2892b02991b12a90b22b8fb32c8eb42e8db52f8cb6308bb7318ab83289ba3388bb3488bc3587bd3786be3885bf3984c03a83c13b82c23c81c33d80c43e7fc5407ec6417dc7427cc8437bc9447aca457acb4679cc4778cc4977cd4a76ce4b75cf4c74d04d73d14e72d24f71d35171d45270d5536fd5546ed6556dd7566cd8576bd9586ada5a6ada5b69db5c68dc5d67dd5e66de5f65de6164df6263e06363e16462e26561e26660e3685fe4695ee56a5de56b5de66c5ce76e5be76f5ae87059e97158e97257ea7457eb7556eb7655ec7754ed7953ed7a52ee7b51ef7c51ef7e50f07f4ff0804ef1814df1834cf2844bf3854bf3874af48849f48948f58b47f58c46f68d45f68f44f79044f79143f79342f89441f89540f9973ff9983ef99a3efa9b3dfa9c3cfa9e3bfb9f3afba139fba238fca338fca537fca636fca835fca934fdab33fdac33fdae32fdaf31fdb130fdb22ffdb42ffdb52efeb72dfeb82cfeba2cfebb2bfebd2afebe2afec029fdc229fdc328fdc527fdc627fdc827fdca26fdcb26fccd25fcce25fcd025fcd225fbd324fbd524fbd724fad824fada24f9dc24f9dd25f8df25f8e125f7e225f7e425f6e626f6e826f5e926f5eb27f4ed27f3ee27f3f027f2f227f1f426f1f525f0f724f0f921")); function gm(t) { return function () { return t } } const ym = Math.abs, vm = Math.atan2, _m = Math.cos, bm = Math.max, mm = Math.min, xm = Math.sin, wm = Math.sqrt, Mm = 1e-12, Tm = Math.PI, Am = Tm / 2, Sm = 2 * Tm; function Em(t) { return t >= 1 ? Am : t <= -1 ? -Am : Math.asin(t) } function Nm(t) { let n = 3; return t.digits = function (e) { if (!arguments.length) return n; if (null == e) n = null; else { const t = Math.floor(e); if (!(t >= 0)) throw new RangeError(`invalid digits: ${e}`); n = t } return t }, () => new Ua(n) } function km(t) { return t.innerRadius } function Cm(t) { return t.outerRadius } function Pm(t) { return t.startAngle } function zm(t) { return t.endAngle } function $m(t) { return t && t.padAngle } function Dm(t, n, e, r, i, o, a) { var u = t - e, c = n - r, f = (a ? o : -o) / wm(u * u + c * c), s = f * c, l = -f * u, h = t + s, d = n + l, p = e + s, g = r + l, y = (h + p) / 2, v = (d + g) / 2, _ = p - h, b = g - d, m = _ * _ + b * b, x = i - o, w = h * g - p * d, M = (b < 0 ? -1 : 1) * wm(bm(0, x * x * m - w * w)), T = (w * b - _ * M) / m, A = (-w * _ - b * M) / m, S = (w * b + _ * M) / m, E = (-w * _ + b * M) / m, N = T - y, k = A - v, C = S - y, P = E - v; return N * N + k * k > C * C + P * P && (T = S, A = E), { cx: T, cy: A, x01: -s, y01: -l, x11: T * (i / x - 1), y11: A * (i / x - 1) } } var Rm = Array.prototype.slice; function Fm(t) { return "object" == typeof t && "length" in t ? t : Array.from(t) } function qm(t) { this._context = t } function Um(t) { return new qm(t) } function Im(t) { return t[0] } function Om(t) { return t[1] } function Bm(t, n) { var e = gm(!0), r = null, i = Um, o = null, a = Nm(u); function u(u) { var c, f, s, l = (u = Fm(u)).length, h = !1; for (null == r && (o = i(s = a())), c = 0; c <= l; ++c)!(c < l && e(f = u[c], c, u)) === h && ((h = !h) ? o.lineStart() : o.lineEnd()), h && o.point(+t(f, c, u), +n(f, c, u)); if (s) return o = null, s + "" || null } return t = "function" == typeof t ? t : void 0 === t ? Im : gm(t), n = "function" == typeof n ? n : void 0 === n ? Om : gm(n), u.x = function (n) { return arguments.length ? (t = "function" == typeof n ? n : gm(+n), u) : t }, u.y = function (t) { return arguments.length ? (n = "function" == typeof t ? t : gm(+t), u) : n }, u.defined = function (t) { return arguments.length ? (e = "function" == typeof t ? t : gm(!!t), u) : e }, u.curve = function (t) { return arguments.length ? (i = t, null != r && (o = i(r)), u) : i }, u.context = function (t) { return arguments.length ? (null == t ? r = o = null : o = i(r = t), u) : r }, u } function Ym(t, n, e) { var r = null, i = gm(!0), o = null, a = Um, u = null, c = Nm(f); function f(f) { var s, l, h, d, p, g = (f = Fm(f)).length, y = !1, v = new Array(g), _ = new Array(g); for (null == o && (u = a(p = c())), s = 0; s <= g; ++s) { if (!(s < g && i(d = f[s], s, f)) === y) if (y = !y) l = s, u.areaStart(), u.lineStart(); else { for (u.lineEnd(), u.lineStart(), h = s - 1; h >= l; --h)u.point(v[h], _[h]); u.lineEnd(), u.areaEnd() } y && (v[s] = +t(d, s, f), _[s] = +n(d, s, f), u.point(r ? +r(d, s, f) : v[s], e ? +e(d, s, f) : _[s])) } if (p) return u = null, p + "" || null } function s() { return Bm().defined(i).curve(a).context(o) } return t = "function" == typeof t ? t : void 0 === t ? Im : gm(+t), n = "function" == typeof n ? n : gm(void 0 === n ? 0 : +n), e = "function" == typeof e ? e : void 0 === e ? Om : gm(+e), f.x = function (n) { return arguments.length ? (t = "function" == typeof n ? n : gm(+n), r = null, f) : t }, f.x0 = function (n) { return arguments.length ? (t = "function" == typeof n ? n : gm(+n), f) : t }, f.x1 = function (t) { return arguments.length ? (r = null == t ? null : "function" == typeof t ? t : gm(+t), f) : r }, f.y = function (t) { return arguments.length ? (n = "function" == typeof t ? t : gm(+t), e = null, f) : n }, f.y0 = function (t) { return arguments.length ? (n = "function" == typeof t ? t : gm(+t), f) : n }, f.y1 = function (t) { return arguments.length ? (e = null == t ? null : "function" == typeof t ? t : gm(+t), f) : e }, f.lineX0 = f.lineY0 = function () { return s().x(t).y(n) }, f.lineY1 = function () { return s().x(t).y(e) }, f.lineX1 = function () { return s().x(r).y(n) }, f.defined = function (t) { return arguments.length ? (i = "function" == typeof t ? t : gm(!!t), f) : i }, f.curve = function (t) { return arguments.length ? (a = t, null != o && (u = a(o)), f) : a }, f.context = function (t) { return arguments.length ? (null == t ? o = u = null : u = a(o = t), f) : o }, f } function Lm(t, n) { return n < t ? -1 : n > t ? 1 : n >= t ? 0 : NaN } function jm(t) { return t } qm.prototype = { areaStart: function () { this._line = 0 }, areaEnd: function () { this._line = NaN }, lineStart: function () { this._point = 0 }, lineEnd: function () { (this._line || 0 !== this._line && 1 === this._point) && this._context.closePath(), this._line = 1 - this._line }, point: function (t, n) { switch (t = +t, n = +n, this._point) { case 0: this._point = 1, this._line ? this._context.lineTo(t, n) : this._context.moveTo(t, n); break; case 1: this._point = 2; default: this._context.lineTo(t, n) } } }; var Hm = Gm(Um); function Xm(t) { this._curve = t } function Gm(t) { function n(n) { return new Xm(t(n)) } return n._curve = t, n } function Vm(t) { var n = t.curve; return t.angle = t.x, delete t.x, t.radius = t.y, delete t.y, t.curve = function (t) { return arguments.length ? n(Gm(t)) : n()._curve }, t } function Wm() { return Vm(Bm().curve(Hm)) } function Zm() { var t = Ym().curve(Hm), n = t.curve, e = t.lineX0, r = t.lineX1, i = t.lineY0, o = t.lineY1; return t.angle = t.x, delete t.x, t.startAngle = t.x0, delete t.x0, t.endAngle = t.x1, delete t.x1, t.radius = t.y, delete t.y, t.innerRadius = t.y0, delete t.y0, t.outerRadius = t.y1, delete t.y1, t.lineStartAngle = function () { return Vm(e()) }, delete t.lineX0, t.lineEndAngle = function () { return Vm(r()) }, delete t.lineX1, t.lineInnerRadius = function () { return Vm(i()) }, delete t.lineY0, t.lineOuterRadius = function () { return Vm(o()) }, delete t.lineY1, t.curve = function (t) { return arguments.length ? n(Gm(t)) : n()._curve }, t } function Km(t, n) { return [(n = +n) * Math.cos(t -= Math.PI / 2), n * Math.sin(t)] } Xm.prototype = { areaStart: function () { this._curve.areaStart() }, areaEnd: function () { this._curve.areaEnd() }, lineStart: function () { this._curve.lineStart() }, lineEnd: function () { this._curve.lineEnd() }, point: function (t, n) { this._curve.point(n * Math.sin(t), n * -Math.cos(t)) } }; class Qm { constructor(t, n) { this._context = t, this._x = n } areaStart() { this._line = 0 } areaEnd() { this._line = NaN } lineStart() { this._point = 0 } lineEnd() { (this._line || 0 !== this._line && 1 === this._point) && this._context.closePath(), this._line = 1 - this._line } point(t, n) { switch (t = +t, n = +n, this._point) { case 0: this._point = 1, this._line ? this._context.lineTo(t, n) : this._context.moveTo(t, n); break; case 1: this._point = 2; default: this._x ? this._context.bezierCurveTo(this._x0 = (this._x0 + t) / 2, this._y0, this._x0, n, t, n) : this._context.bezierCurveTo(this._x0, this._y0 = (this._y0 + n) / 2, t, this._y0, t, n) }this._x0 = t, this._y0 = n } } class Jm { constructor(t) { this._context = t } lineStart() { this._point = 0 } lineEnd() { } point(t, n) { if (t = +t, n = +n, 0 === this._point) this._point = 1; else { const e = Km(this._x0, this._y0), r = Km(this._x0, this._y0 = (this._y0 + n) / 2), i = Km(t, this._y0), o = Km(t, n); this._context.moveTo(...e), this._context.bezierCurveTo(...r, ...i, ...o) } this._x0 = t, this._y0 = n } } function tx(t) { return new Qm(t, !0) } function nx(t) { return new Qm(t, !1) } function ex(t) { return new Jm(t) } function rx(t) { return t.source } function ix(t) { return t.target } function ox(t) { let n = rx, e = ix, r = Im, i = Om, o = null, a = null, u = Nm(c); function c() { let c; const f = Rm.call(arguments), s = n.apply(this, f), l = e.apply(this, f); if (null == o && (a = t(c = u())), a.lineStart(), f[0] = s, a.point(+r.apply(this, f), +i.apply(this, f)), f[0] = l, a.point(+r.apply(this, f), +i.apply(this, f)), a.lineEnd(), c) return a = null, c + "" || null } return c.source = function (t) { return arguments.length ? (n = t, c) : n }, c.target = function (t) { return arguments.length ? (e = t, c) : e }, c.x = function (t) { return arguments.length ? (r = "function" == typeof t ? t : gm(+t), c) : r }, c.y = function (t) { return arguments.length ? (i = "function" == typeof t ? t : gm(+t), c) : i }, c.context = function (n) { return arguments.length ? (null == n ? o = a = null : a = t(o = n), c) : o }, c } const ax = wm(3); var ux = { draw(t, n) { const e = .59436 * wm(n + mm(n / 28, .75)), r = e / 2, i = r * ax; t.moveTo(0, e), t.lineTo(0, -e), t.moveTo(-i, -r), t.lineTo(i, r), t.moveTo(-i, r), t.lineTo(i, -r) } }, cx = { draw(t, n) { const e = wm(n / Tm); t.moveTo(e, 0), t.arc(0, 0, e, 0, Sm) } }, fx = { draw(t, n) { const e = wm(n / 5) / 2; t.moveTo(-3 * e, -e), t.lineTo(-e, -e), t.lineTo(-e, -3 * e), t.lineTo(e, -3 * e), t.lineTo(e, -e), t.lineTo(3 * e, -e), t.lineTo(3 * e, e), t.lineTo(e, e), t.lineTo(e, 3 * e), t.lineTo(-e, 3 * e), t.lineTo(-e, e), t.lineTo(-3 * e, e), t.closePath() } }; const sx = wm(1 / 3), lx = 2 * sx; var hx = { draw(t, n) { const e = wm(n / lx), r = e * sx; t.moveTo(0, -e), t.lineTo(r, 0), t.lineTo(0, e), t.lineTo(-r, 0), t.closePath() } }, dx = { draw(t, n) { const e = .62625 * wm(n); t.moveTo(0, -e), t.lineTo(e, 0), t.lineTo(0, e), t.lineTo(-e, 0), t.closePath() } }, px = { draw(t, n) { const e = .87559 * wm(n - mm(n / 7, 2)); t.moveTo(-e, 0), t.lineTo(e, 0), t.moveTo(0, e), t.lineTo(0, -e) } }, gx = { draw(t, n) { const e = wm(n), r = -e / 2; t.rect(r, r, e, e) } }, yx = { draw(t, n) { const e = .4431 * wm(n); t.moveTo(e, e), t.lineTo(e, -e), t.lineTo(-e, -e), t.lineTo(-e, e), t.closePath() } }; const vx = xm(Tm / 10) / xm(7 * Tm / 10), _x = xm(Sm / 10) * vx, bx = -_m(Sm / 10) * vx; var mx = { draw(t, n) { const e = wm(.8908130915292852 * n), r = _x * e, i = bx * e; t.moveTo(0, -e), t.lineTo(r, i); for (let n = 1; n < 5; ++n) { const o = Sm * n / 5, a = _m(o), u = xm(o); t.lineTo(u * e, -a * e), t.lineTo(a * r - u * i, u * r + a * i) } t.closePath() } }; const xx = wm(3); var wx = { draw(t, n) { const e = -wm(n / (3 * xx)); t.moveTo(0, 2 * e), t.lineTo(-xx * e, -e), t.lineTo(xx * e, -e), t.closePath() } }; const Mx = wm(3); var Tx = { draw(t, n) { const e = .6824 * wm(n), r = e / 2, i = e * Mx / 2; t.moveTo(0, -e), t.lineTo(i, r), t.lineTo(-i, r), t.closePath() } }; const Ax = -.5, Sx = wm(3) / 2, Ex = 1 / wm(12), Nx = 3 * (Ex / 2 + 1); var kx = { draw(t, n) { const e = wm(n / Nx), r = e / 2, i = e * Ex, o = r, a = e * Ex + e, u = -o, c = a; t.moveTo(r, i), t.lineTo(o, a), t.lineTo(u, c), t.lineTo(Ax * r - Sx * i, Sx * r + Ax * i), t.lineTo(Ax * o - Sx * a, Sx * o + Ax * a), t.lineTo(Ax * u - Sx * c, Sx * u + Ax * c), t.lineTo(Ax * r + Sx * i, Ax * i - Sx * r), t.lineTo(Ax * o + Sx * a, Ax * a - Sx * o), t.lineTo(Ax * u + Sx * c, Ax * c - Sx * u), t.closePath() } }, Cx = { draw(t, n) { const e = .6189 * wm(n - mm(n / 6, 1.7)); t.moveTo(-e, -e), t.lineTo(e, e), t.moveTo(-e, e), t.lineTo(e, -e) } }; const Px = [cx, fx, hx, gx, mx, wx, kx], zx = [cx, px, Cx, Tx, ux, yx, dx]; function $x() { } function Dx(t, n, e) { t._context.bezierCurveTo((2 * t._x0 + t._x1) / 3, (2 * t._y0 + t._y1) / 3, (t._x0 + 2 * t._x1) / 3, (t._y0 + 2 * t._y1) / 3, (t._x0 + 4 * t._x1 + n) / 6, (t._y0 + 4 * t._y1 + e) / 6) } function Rx(t) { this._context = t } function Fx(t) { this._context = t } function qx(t) { this._context = t } function Ux(t, n) { this._basis = new Rx(t), this._beta = n } Rx.prototype = { areaStart: function () { this._line = 0 }, areaEnd: function () { this._line = NaN }, lineStart: function () { this._x0 = this._x1 = this._y0 = this._y1 = NaN, this._point = 0 }, lineEnd: function () { switch (this._point) { case 3: Dx(this, this._x1, this._y1); case 2: this._context.lineTo(this._x1, this._y1) }(this._line || 0 !== this._line && 1 === this._point) && this._context.closePath(), this._line = 1 - this._line }, point: function (t, n) { switch (t = +t, n = +n, this._point) { case 0: this._point = 1, this._line ? this._context.lineTo(t, n) : this._context.moveTo(t, n); break; case 1: this._point = 2; break; case 2: this._point = 3, this._context.lineTo((5 * this._x0 + this._x1) / 6, (5 * this._y0 + this._y1) / 6); default: Dx(this, t, n) }this._x0 = this._x1, this._x1 = t, this._y0 = this._y1, this._y1 = n } }, Fx.prototype = { areaStart: $x, areaEnd: $x, lineStart: function () { this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = NaN, this._point = 0 }, lineEnd: function () { switch (this._point) { case 1: this._context.moveTo(this._x2, this._y2), this._context.closePath(); break; case 2: this._context.moveTo((this._x2 + 2 * this._x3) / 3, (this._y2 + 2 * this._y3) / 3), this._context.lineTo((this._x3 + 2 * this._x2) / 3, (this._y3 + 2 * this._y2) / 3), this._context.closePath(); break; case 3: this.point(this._x2, this._y2), this.point(this._x3, this._y3), this.point(this._x4, this._y4) } }, point: function (t, n) { switch (t = +t, n = +n, this._point) { case 0: this._point = 1, this._x2 = t, this._y2 = n; break; case 1: this._point = 2, this._x3 = t, this._y3 = n; break; case 2: this._point = 3, this._x4 = t, this._y4 = n, this._context.moveTo((this._x0 + 4 * this._x1 + t) / 6, (this._y0 + 4 * this._y1 + n) / 6); break; default: Dx(this, t, n) }this._x0 = this._x1, this._x1 = t, this._y0 = this._y1, this._y1 = n } }, qx.prototype = { areaStart: function () { this._line = 0 }, areaEnd: function () { this._line = NaN }, lineStart: function () { this._x0 = this._x1 = this._y0 = this._y1 = NaN, this._point = 0 }, lineEnd: function () { (this._line || 0 !== this._line && 3 === this._point) && this._context.closePath(), this._line = 1 - this._line }, point: function (t, n) { switch (t = +t, n = +n, this._point) { case 0: this._point = 1; break; case 1: this._point = 2; break; case 2: this._point = 3; var e = (this._x0 + 4 * this._x1 + t) / 6, r = (this._y0 + 4 * this._y1 + n) / 6; this._line ? this._context.lineTo(e, r) : this._context.moveTo(e, r); break; case 3: this._point = 4; default: Dx(this, t, n) }this._x0 = this._x1, this._x1 = t, this._y0 = this._y1, this._y1 = n } }, Ux.prototype = { lineStart: function () { this._x = [], this._y = [], this._basis.lineStart() }, lineEnd: function () { var t = this._x, n = this._y, e = t.length - 1; if (e > 0) for (var r, i = t[0], o = n[0], a = t[e] - i, u = n[e] - o, c = -1; ++c <= e;)r = c / e, this._basis.point(this._beta * t[c] + (1 - this._beta) * (i + r * a), this._beta * n[c] + (1 - this._beta) * (o + r * u)); this._x = this._y = null, this._basis.lineEnd() }, point: function (t, n) { this._x.push(+t), this._y.push(+n) } }; var Ix = function t(n) { function e(t) { return 1 === n ? new Rx(t) : new Ux(t, n) } return e.beta = function (n) { return t(+n) }, e }(.85); function Ox(t, n, e) { t._context.bezierCurveTo(t._x1 + t._k * (t._x2 - t._x0), t._y1 + t._k * (t._y2 - t._y0), t._x2 + t._k * (t._x1 - n), t._y2 + t._k * (t._y1 - e), t._x2, t._y2) } function Bx(t, n) { this._context = t, this._k = (1 - n) / 6 } Bx.prototype = { areaStart: function () { this._line = 0 }, areaEnd: function () { this._line = NaN }, lineStart: function () { this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN, this._point = 0 }, lineEnd: function () { switch (this._point) { case 2: this._context.lineTo(this._x2, this._y2); break; case 3: Ox(this, this._x1, this._y1) }(this._line || 0 !== this._line && 1 === this._point) && this._context.closePath(), this._line = 1 - this._line }, point: function (t, n) { switch (t = +t, n = +n, this._point) { case 0: this._point = 1, this._line ? this._context.lineTo(t, n) : this._context.moveTo(t, n); break; case 1: this._point = 2, this._x1 = t, this._y1 = n; break; case 2: this._point = 3; default: Ox(this, t, n) }this._x0 = this._x1, this._x1 = this._x2, this._x2 = t, this._y0 = this._y1, this._y1 = this._y2, this._y2 = n } }; var Yx = function t(n) { function e(t) { return new Bx(t, n) } return e.tension = function (n) { return t(+n) }, e }(0); function Lx(t, n) { this._context = t, this._k = (1 - n) / 6 } Lx.prototype = { areaStart: $x, areaEnd: $x, lineStart: function () { this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 = this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN, this._point = 0 }, lineEnd: function () { switch (this._point) { case 1: this._context.moveTo(this._x3, this._y3), this._context.closePath(); break; case 2: this._context.lineTo(this._x3, this._y3), this._context.closePath(); break; case 3: this.point(this._x3, this._y3), this.point(this._x4, this._y4), this.point(this._x5, this._y5) } }, point: function (t, n) { switch (t = +t, n = +n, this._point) { case 0: this._point = 1, this._x3 = t, this._y3 = n; break; case 1: this._point = 2, this._context.moveTo(this._x4 = t, this._y4 = n); break; case 2: this._point = 3, this._x5 = t, this._y5 = n; break; default: Ox(this, t, n) }this._x0 = this._x1, this._x1 = this._x2, this._x2 = t, this._y0 = this._y1, this._y1 = this._y2, this._y2 = n } }; var jx = function t(n) { function e(t) { return new Lx(t, n) } return e.tension = function (n) { return t(+n) }, e }(0); function Hx(t, n) { this._context = t, this._k = (1 - n) / 6 } Hx.prototype = { areaStart: function () { this._line = 0 }, areaEnd: function () { this._line = NaN }, lineStart: function () { this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN, this._point = 0 }, lineEnd: function () { (this._line || 0 !== this._line && 3 === this._point) && this._context.closePath(), this._line = 1 - this._line }, point: function (t, n) { switch (t = +t, n = +n, this._point) { case 0: this._point = 1; break; case 1: this._point = 2; break; case 2: this._point = 3, this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2); break; case 3: this._point = 4; default: Ox(this, t, n) }this._x0 = this._x1, this._x1 = this._x2, this._x2 = t, this._y0 = this._y1, this._y1 = this._y2, this._y2 = n } }; var Xx = function t(n) { function e(t) { return new Hx(t, n) } return e.tension = function (n) { return t(+n) }, e }(0); function Gx(t, n, e) { var r = t._x1, i = t._y1, o = t._x2, a = t._y2; if (t._l01_a > Mm) { var u = 2 * t._l01_2a + 3 * t._l01_a * t._l12_a + t._l12_2a, c = 3 * t._l01_a * (t._l01_a + t._l12_a); r = (r * u - t._x0 * t._l12_2a + t._x2 * t._l01_2a) / c, i = (i * u - t._y0 * t._l12_2a + t._y2 * t._l01_2a) / c } if (t._l23_a > Mm) { var f = 2 * t._l23_2a + 3 * t._l23_a * t._l12_a + t._l12_2a, s = 3 * t._l23_a * (t._l23_a + t._l12_a); o = (o * f + t._x1 * t._l23_2a - n * t._l12_2a) / s, a = (a * f + t._y1 * t._l23_2a - e * t._l12_2a) / s } t._context.bezierCurveTo(r, i, o, a, t._x2, t._y2) } function Vx(t, n) { this._context = t, this._alpha = n } Vx.prototype = { areaStart: function () { this._line = 0 }, areaEnd: function () { this._line = NaN }, lineStart: function () { this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN, this._l01_a = this._l12_a = this._l23_a = this._l01_2a = this._l12_2a = this._l23_2a = this._point = 0 }, lineEnd: function () { switch (this._point) { case 2: this._context.lineTo(this._x2, this._y2); break; case 3: this.point(this._x2, this._y2) }(this._line || 0 !== this._line && 1 === this._point) && this._context.closePath(), this._line = 1 - this._line }, point: function (t, n) { if (t = +t, n = +n, this._point) { var e = this._x2 - t, r = this._y2 - n; this._l23_a = Math.sqrt(this._l23_2a = Math.pow(e * e + r * r, this._alpha)) } switch (this._point) { case 0: this._point = 1, this._line ? this._context.lineTo(t, n) : this._context.moveTo(t, n); break; case 1: this._point = 2; break; case 2: this._point = 3; default: Gx(this, t, n) }this._l01_a = this._l12_a, this._l12_a = this._l23_a, this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a, this._x0 = this._x1, this._x1 = this._x2, this._x2 = t, this._y0 = this._y1, this._y1 = this._y2, this._y2 = n } }; var Wx = function t(n) { function e(t) { return n ? new Vx(t, n) : new Bx(t, 0) } return e.alpha = function (n) { return t(+n) }, e }(.5); function Zx(t, n) { this._context = t, this._alpha = n } Zx.prototype = { areaStart: $x, areaEnd: $x, lineStart: function () { this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 = this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN, this._l01_a = this._l12_a = this._l23_a = this._l01_2a = this._l12_2a = this._l23_2a = this._point = 0 }, lineEnd: function () { switch (this._point) { case 1: this._context.moveTo(this._x3, this._y3), this._context.closePath(); break; case 2: this._context.lineTo(this._x3, this._y3), this._context.closePath(); break; case 3: this.point(this._x3, this._y3), this.point(this._x4, this._y4), this.point(this._x5, this._y5) } }, point: function (t, n) { if (t = +t, n = +n, this._point) { var e = this._x2 - t, r = this._y2 - n; this._l23_a = Math.sqrt(this._l23_2a = Math.pow(e * e + r * r, this._alpha)) } switch (this._point) { case 0: this._point = 1, this._x3 = t, this._y3 = n; break; case 1: this._point = 2, this._context.moveTo(this._x4 = t, this._y4 = n); break; case 2: this._point = 3, this._x5 = t, this._y5 = n; break; default: Gx(this, t, n) }this._l01_a = this._l12_a, this._l12_a = this._l23_a, this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a, this._x0 = this._x1, this._x1 = this._x2, this._x2 = t, this._y0 = this._y1, this._y1 = this._y2, this._y2 = n } }; var Kx = function t(n) { function e(t) { return n ? new Zx(t, n) : new Lx(t, 0) } return e.alpha = function (n) { return t(+n) }, e }(.5); function Qx(t, n) { this._context = t, this._alpha = n } Qx.prototype = { areaStart: function () { this._line = 0 }, areaEnd: function () { this._line = NaN }, lineStart: function () { this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN, this._l01_a = this._l12_a = this._l23_a = this._l01_2a = this._l12_2a = this._l23_2a = this._point = 0 }, lineEnd: function () { (this._line || 0 !== this._line && 3 === this._point) && this._context.closePath(), this._line = 1 - this._line }, point: function (t, n) { if (t = +t, n = +n, this._point) { var e = this._x2 - t, r = this._y2 - n; this._l23_a = Math.sqrt(this._l23_2a = Math.pow(e * e + r * r, this._alpha)) } switch (this._point) { case 0: this._point = 1; break; case 1: this._point = 2; break; case 2: this._point = 3, this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2); break; case 3: this._point = 4; default: Gx(this, t, n) }this._l01_a = this._l12_a, this._l12_a = this._l23_a, this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a, this._x0 = this._x1, this._x1 = this._x2, this._x2 = t, this._y0 = this._y1, this._y1 = this._y2, this._y2 = n } }; var Jx = function t(n) { function e(t) { return n ? new Qx(t, n) : new Hx(t, 0) } return e.alpha = function (n) { return t(+n) }, e }(.5); function tw(t) { this._context = t } function nw(t) { return t < 0 ? -1 : 1 } function ew(t, n, e) { var r = t._x1 - t._x0, i = n - t._x1, o = (t._y1 - t._y0) / (r || i < 0 && -0), a = (e - t._y1) / (i || r < 0 && -0), u = (o * i + a * r) / (r + i); return (nw(o) + nw(a)) * Math.min(Math.abs(o), Math.abs(a), .5 * Math.abs(u)) || 0 } function rw(t, n) { var e = t._x1 - t._x0; return e ? (3 * (t._y1 - t._y0) / e - n) / 2 : n } function iw(t, n, e) { var r = t._x0, i = t._y0, o = t._x1, a = t._y1, u = (o - r) / 3; t._context.bezierCurveTo(r + u, i + u * n, o - u, a - u * e, o, a) } function ow(t) { this._context = t } function aw(t) { this._context = new uw(t) } function uw(t) { this._context = t } function cw(t) { this._context = t } function fw(t) { var n, e, r = t.length - 1, i = new Array(r), o = new Array(r), a = new Array(r); for (i[0] = 0, o[0] = 2, a[0] = t[0] + 2 * t[1], n = 1; n < r - 1; ++n)i[n] = 1, o[n] = 4, a[n] = 4 * t[n] + 2 * t[n + 1]; for (i[r - 1] = 2, o[r - 1] = 7, a[r - 1] = 8 * t[r - 1] + t[r], n = 1; n < r; ++n)e = i[n] / o[n - 1], o[n] -= e, a[n] -= e * a[n - 1]; for (i[r - 1] = a[r - 1] / o[r - 1], n = r - 2; n >= 0; --n)i[n] = (a[n] - i[n + 1]) / o[n]; for (o[r - 1] = (t[r] + i[r - 1]) / 2, n = 0; n < r - 1; ++n)o[n] = 2 * t[n + 1] - i[n + 1]; return [i, o] } function sw(t, n) { this._context = t, this._t = n } function lw(t, n) { if ((i = t.length) > 1) for (var e, r, i, o = 1, a = t[n[0]], u = a.length; o < i; ++o)for (r = a, a = t[n[o]], e = 0; e < u; ++e)a[e][1] += a[e][0] = isNaN(r[e][1]) ? r[e][0] : r[e][1] } function hw(t) { for (var n = t.length, e = new Array(n); --n >= 0;)e[n] = n; return e } function dw(t, n) { return t[n] } function pw(t) { const n = []; return n.key = t, n } function gw(t) { var n = t.map(yw); return hw(t).sort((function (t, e) { return n[t] - n[e] })) } function yw(t) { for (var n, e = -1, r = 0, i = t.length, o = -1 / 0; ++e < i;)(n = +t[e][1]) > o && (o = n, r = e); return r } function vw(t) { var n = t.map(_w); return hw(t).sort((function (t, e) { return n[t] - n[e] })) } function _w(t) { for (var n, e = 0, r = -1, i = t.length; ++r < i;)(n = +t[r][1]) && (e += n); return e } tw.prototype = { areaStart: $x, areaEnd: $x, lineStart: function () { this._point = 0 }, lineEnd: function () { this._point && this._context.closePath() }, point: function (t, n) { t = +t, n = +n, this._point ? this._context.lineTo(t, n) : (this._point = 1, this._context.moveTo(t, n)) } }, ow.prototype = { areaStart: function () { this._line = 0 }, areaEnd: function () { this._line = NaN }, lineStart: function () { this._x0 = this._x1 = this._y0 = this._y1 = this._t0 = NaN, this._point = 0 }, lineEnd: function () { switch (this._point) { case 2: this._context.lineTo(this._x1, this._y1); break; case 3: iw(this, this._t0, rw(this, this._t0)) }(this._line || 0 !== this._line && 1 === this._point) && this._context.closePath(), this._line = 1 - this._line }, point: function (t, n) { var e = NaN; if (n = +n, (t = +t) !== this._x1 || n !== this._y1) { switch (this._point) { case 0: this._point = 1, this._line ? this._context.lineTo(t, n) : this._context.moveTo(t, n); break; case 1: this._point = 2; break; case 2: this._point = 3, iw(this, rw(this, e = ew(this, t, n)), e); break; default: iw(this, this._t0, e = ew(this, t, n)) }this._x0 = this._x1, this._x1 = t, this._y0 = this._y1, this._y1 = n, this._t0 = e } } }, (aw.prototype = Object.create(ow.prototype)).point = function (t, n) { ow.prototype.point.call(this, n, t) }, uw.prototype = { moveTo: function (t, n) { this._context.moveTo(n, t) }, closePath: function () { this._context.closePath() }, lineTo: function (t, n) { this._context.lineTo(n, t) }, bezierCurveTo: function (t, n, e, r, i, o) { this._context.bezierCurveTo(n, t, r, e, o, i) } }, cw.prototype = { areaStart: function () { this._line = 0 }, areaEnd: function () { this._line = NaN }, lineStart: function () { this._x = [], this._y = [] }, lineEnd: function () { var t = this._x, n = this._y, e = t.length; if (e) if (this._line ? this._context.lineTo(t[0], n[0]) : this._context.moveTo(t[0], n[0]), 2 === e) this._context.lineTo(t[1], n[1]); else for (var r = fw(t), i = fw(n), o = 0, a = 1; a < e; ++o, ++a)this._context.bezierCurveTo(r[0][o], i[0][o], r[1][o], i[1][o], t[a], n[a]); (this._line || 0 !== this._line && 1 === e) && this._context.closePath(), this._line = 1 - this._line, this._x = this._y = null }, point: function (t, n) { this._x.push(+t), this._y.push(+n) } }, sw.prototype = { areaStart: function () { this._line = 0 }, areaEnd: function () { this._line = NaN }, lineStart: function () { this._x = this._y = NaN, this._point = 0 }, lineEnd: function () { 0 < this._t && this._t < 1 && 2 === this._point && this._context.lineTo(this._x, this._y), (this._line || 0 !== this._line && 1 === this._point) && this._context.closePath(), this._line >= 0 && (this._t = 1 - this._t, this._line = 1 - this._line) }, point: function (t, n) { switch (t = +t, n = +n, this._point) { case 0: this._point = 1, this._line ? this._context.lineTo(t, n) : this._context.moveTo(t, n); break; case 1: this._point = 2; default: if (this._t <= 0) this._context.lineTo(this._x, n), this._context.lineTo(t, n); else { var e = this._x * (1 - this._t) + t * this._t; this._context.lineTo(e, this._y), this._context.lineTo(e, n) } }this._x = t, this._y = n } }; var bw = t => () => t; function mw(t, { sourceEvent: n, target: e, transform: r, dispatch: i }) { Object.defineProperties(this, { type: { value: t, enumerable: !0, configurable: !0 }, sourceEvent: { value: n, enumerable: !0, configurable: !0 }, target: { value: e, enumerable: !0, configurable: !0 }, transform: { value: r, enumerable: !0, configurable: !0 }, _: { value: i } }) } function xw(t, n, e) { this.k = t, this.x = n, this.y = e } xw.prototype = { constructor: xw, scale: function (t) { return 1 === t ? this : new xw(this.k * t, this.x, this.y) }, translate: function (t, n) { return 0 === t & 0 === n ? this : new xw(this.k, this.x + this.k * t, this.y + this.k * n) }, apply: function (t) { return [t[0] * this.k + this.x, t[1] * this.k + this.y] }, applyX: function (t) { return t * this.k + this.x }, applyY: function (t) { return t * this.k + this.y }, invert: function (t) { return [(t[0] - this.x) / this.k, (t[1] - this.y) / this.k] }, invertX: function (t) { return (t - this.x) / this.k }, invertY: function (t) { return (t - this.y) / this.k }, rescaleX: function (t) { return t.copy().domain(t.range().map(this.invertX, this).map(t.invert, t)) }, rescaleY: function (t) { return t.copy().domain(t.range().map(this.invertY, this).map(t.invert, t)) }, toString: function () { return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")" } }; var ww = new xw(1, 0, 0); function Mw(t) { for (; !t.__zoom;)if (!(t = t.parentNode)) return ww; return t.__zoom } function Tw(t) { t.stopImmediatePropagation() } function Aw(t) { t.preventDefault(), t.stopImmediatePropagation() } function Sw(t) { return !(t.ctrlKey && "wheel" !== t.type || t.button) } function Ew() { var t = this; return t instanceof SVGElement ? (t = t.ownerSVGElement || t).hasAttribute("viewBox") ? [[(t = t.viewBox.baseVal).x, t.y], [t.x + t.width, t.y + t.height]] : [[0, 0], [t.width.baseVal.value, t.height.baseVal.value]] : [[0, 0], [t.clientWidth, t.clientHeight]] } function Nw() { return this.__zoom || ww } function kw(t) { return -t.deltaY * (1 === t.deltaMode ? .05 : t.deltaMode ? 1 : .002) * (t.ctrlKey ? 10 : 1) } function Cw() { return navigator.maxTouchPoints || "ontouchstart" in this } function Pw(t, n, e) { var r = t.invertX(n[0][0]) - e[0][0], i = t.invertX(n[1][0]) - e[1][0], o = t.invertY(n[0][1]) - e[0][1], a = t.invertY(n[1][1]) - e[1][1]; return t.translate(i > r ? (r + i) / 2 : Math.min(0, r) || Math.max(0, i), a > o ? (o + a) / 2 : Math.min(0, o) || Math.max(0, a)) } Mw.prototype = xw.prototype, t.Adder = T, t.Delaunay = Lu, t.FormatSpecifier = tf, t.InternMap = InternMap, t.InternSet = InternSet, t.Node = Qd, t.Path = Ua, t.Voronoi = qu, t.ZoomTransform = xw, t.active = function (t, n) { var e, r, i = t.__transition; if (i) for (r in n = null == n ? null : n + "", i) if ((e = i[r]).state > qi && e.name === n) return new po([[t]], Zo, n, +r); return null }, t.arc = function () { var t = km, n = Cm, e = gm(0), r = null, i = Pm, o = zm, a = $m, u = null, c = Nm(f); function f() { var f, s, l = +t.apply(this, arguments), h = +n.apply(this, arguments), d = i.apply(this, arguments) - Am, p = o.apply(this, arguments) - Am, g = ym(p - d), y = p > d; if (u || (u = f = c()), h < l && (s = h, h = l, l = s), h > Mm) if (g > Sm - Mm) u.moveTo(h * _m(d), h * xm(d)), u.arc(0, 0, h, d, p, !y), l > Mm && (u.moveTo(l * _m(p), l * xm(p)), u.arc(0, 0, l, p, d, y)); else { var v, _, b = d, m = p, x = d, w = p, M = g, T = g, A = a.apply(this, arguments) / 2, S = A > Mm && (r ? +r.apply(this, arguments) : wm(l * l + h * h)), E = mm(ym(h - l) / 2, +e.apply(this, arguments)), N = E, k = E; if (S > Mm) { var C = Em(S / l * xm(A)), P = Em(S / h * xm(A)); (M -= 2 * C) > Mm ? (x += C *= y ? 1 : -1, w -= C) : (M = 0, x = w = (d + p) / 2), (T -= 2 * P) > Mm ? (b += P *= y ? 1 : -1, m -= P) : (T = 0, b = m = (d + p) / 2) } var z = h * _m(b), $ = h * xm(b), D = l * _m(w), R = l * xm(w); if (E > Mm) { var F, q = h * _m(m), U = h * xm(m), I = l * _m(x), O = l * xm(x); if (g < Tm) if (F = function (t, n, e, r, i, o, a, u) { var c = e - t, f = r - n, s = a - i, l = u - o, h = l * c - s * f; if (!(h * h < Mm)) return [t + (h = (s * (n - o) - l * (t - i)) / h) * c, n + h * f] }(z, $, I, O, q, U, D, R)) { var B = z - F[0], Y = $ - F[1], L = q - F[0], j = U - F[1], H = 1 / xm(function (t) { return t > 1 ? 0 : t < -1 ? Tm : Math.acos(t) }((B * L + Y * j) / (wm(B * B + Y * Y) * wm(L * L + j * j))) / 2), X = wm(F[0] * F[0] + F[1] * F[1]); N = mm(E, (l - X) / (H - 1)), k = mm(E, (h - X) / (H + 1)) } else N = k = 0 } T > Mm ? k > Mm ? (v = Dm(I, O, z, $, h, k, y), _ = Dm(q, U, D, R, h, k, y), u.moveTo(v.cx + v.x01, v.cy + v.y01), k < E ? u.arc(v.cx, v.cy, k, vm(v.y01, v.x01), vm(_.y01, _.x01), !y) : (u.arc(v.cx, v.cy, k, vm(v.y01, v.x01), vm(v.y11, v.x11), !y), u.arc(0, 0, h, vm(v.cy + v.y11, v.cx + v.x11), vm(_.cy + _.y11, _.cx + _.x11), !y), u.arc(_.cx, _.cy, k, vm(_.y11, _.x11), vm(_.y01, _.x01), !y))) : (u.moveTo(z, $), u.arc(0, 0, h, b, m, !y)) : u.moveTo(z, $), l > Mm && M > Mm ? N > Mm ? (v = Dm(D, R, q, U, l, -N, y), _ = Dm(z, $, I, O, l, -N, y), u.lineTo(v.cx + v.x01, v.cy + v.y01), N < E ? u.arc(v.cx, v.cy, N, vm(v.y01, v.x01), vm(_.y01, _.x01), !y) : (u.arc(v.cx, v.cy, N, vm(v.y01, v.x01), vm(v.y11, v.x11), !y), u.arc(0, 0, l, vm(v.cy + v.y11, v.cx + v.x11), vm(_.cy + _.y11, _.cx + _.x11), y), u.arc(_.cx, _.cy, N, vm(_.y11, _.x11), vm(_.y01, _.x01), !y))) : u.arc(0, 0, l, w, x, y) : u.lineTo(D, R) } else u.moveTo(0, 0); if (u.closePath(), f) return u = null, f + "" || null } return f.centroid = function () { var e = (+t.apply(this, arguments) + +n.apply(this, arguments)) / 2, r = (+i.apply(this, arguments) + +o.apply(this, arguments)) / 2 - Tm / 2; return [_m(r) * e, xm(r) * e] }, f.innerRadius = function (n) { return arguments.length ? (t = "function" == typeof n ? n : gm(+n), f) : t }, f.outerRadius = function (t) { return arguments.length ? (n = "function" == typeof t ? t : gm(+t), f) : n }, f.cornerRadius = function (t) { return arguments.length ? (e = "function" == typeof t ? t : gm(+t), f) : e }, f.padRadius = function (t) { return arguments.length ? (r = null == t ? null : "function" == typeof t ? t : gm(+t), f) : r }, f.startAngle = function (t) { return arguments.length ? (i = "function" == typeof t ? t : gm(+t), f) : i }, f.endAngle = function (t) { return arguments.length ? (o = "function" == typeof t ? t : gm(+t), f) : o }, f.padAngle = function (t) { return arguments.length ? (a = "function" == typeof t ? t : gm(+t), f) : a }, f.context = function (t) { return arguments.length ? (u = null == t ? null : t, f) : u }, f }, t.area = Ym, t.areaRadial = Zm, t.ascending = n, t.autoType = function (t) { for (var n in t) { var e, r, i = t[n].trim(); if (i) if ("true" === i) i = !0; else if ("false" === i) i = !1; else if ("NaN" === i) i = NaN; else if (isNaN(e = +i)) { if (!(r = i.match(/^([-+]\d{2})?\d{4}(-\d{2}(-\d{2})?)?(T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[-+]\d{2}:\d{2})?)?$/))) continue; yc && r[4] && !r[7] && (i = i.replace(/-/g, "/").replace(/T/, " ")), i = new Date(i) } else i = e; else i = null; t[n] = i } return t }, t.axisBottom = function (t) { return Pt(Mt, t) }, t.axisLeft = function (t) { return Pt(Tt, t) }, t.axisRight = function (t) { return Pt(wt, t) }, t.axisTop = function (t) { return Pt(xt, t) }, t.bin = Q, t.bisect = s, t.bisectCenter = f, t.bisectLeft = c, t.bisectRight = u, t.bisector = r, t.blob = function (t, n) { return fetch(t, n).then(vc) }, t.blur = function (t, n) { if (!((n = +n) >= 0)) throw new RangeError("invalid r"); let e = t.length; if (!((e = Math.floor(e)) >= 0)) throw new RangeError("invalid length"); if (!e || !n) return t; const r = y(n), i = t.slice(); return r(t, i, 0, e, 1), r(i, t, 0, e, 1), r(t, i, 0, e, 1), t }, t.blur2 = l, t.blurImage = h, t.brush = function () { return wa(la) }, t.brushSelection = function (t) { var n = t.__brush; return n ? n.dim.output(n.selection) : null }, t.brushX = function () { return wa(fa) }, t.brushY = function () { return wa(sa) }, t.buffer = function (t, n) { return fetch(t, n).then(_c) }, t.chord = function () { return za(!1, !1) }, t.chordDirected = function () { return za(!0, !1) }, t.chordTranspose = function () { return za(!1, !0) }, t.cluster = function () { var t = Ld, n = 1, e = 1, r = !1; function i(i) { var o, a = 0; i.eachAfter((function (n) { var e = n.children; e ? (n.x = function (t) { return t.reduce(jd, 0) / t.length }(e), n.y = function (t) { return 1 + t.reduce(Hd, 0) }(e)) : (n.x = o ? a += t(n, o) : 0, n.y = 0, o = n) })); var u = function (t) { for (var n; n = t.children;)t = n[0]; return t }(i), c = function (t) { for (var n; n = t.children;)t = n[n.length - 1]; return t }(i), f = u.x - t(u, c) / 2, s = c.x + t(c, u) / 2; return i.eachAfter(r ? function (t) { t.x = (t.x - i.x) * n, t.y = (i.y - t.y) * e } : function (t) { t.x = (t.x - f) / (s - f) * n, t.y = (1 - (i.y ? t.y / i.y : 1)) * e }) } return i.separation = function (n) { return arguments.length ? (t = n, i) : t }, i.size = function (t) { return arguments.length ? (r = !1, n = +t[0], e = +t[1], i) : r ? null : [n, e] }, i.nodeSize = function (t) { return arguments.length ? (r = !0, n = +t[0], e = +t[1], i) : r ? [n, e] : null }, i }, t.color = ze, t.contourDensity = function () { var t = fu, n = su, e = lu, r = 960, i = 500, o = 20, a = 2, u = 3 * o, c = r + 2 * u >> a, f = i + 2 * u >> a, s = Qa(20); function h(r) { var i = new Float32Array(c * f), s = Math.pow(2, -a), h = -1; for (const o of r) { var d = (t(o, ++h, r) + u) * s, p = (n(o, h, r) + u) * s, g = +e(o, h, r); if (g && d >= 0 && d < c && p >= 0 && p < f) { var y = Math.floor(d), v = Math.floor(p), _ = d - y - .5, b = p - v - .5; i[y + v * c] += (1 - _) * (1 - b) * g, i[y + 1 + v * c] += _ * (1 - b) * g, i[y + 1 + (v + 1) * c] += _ * b * g, i[y + (v + 1) * c] += (1 - _) * b * g } } return l({ data: i, width: c, height: f }, o * s), i } function d(t) { var n = h(t), e = s(n), r = Math.pow(2, 2 * a); return Array.isArray(e) || (e = G(Number.MIN_VALUE, J(n) / r, e)), iu().size([c, f]).thresholds(e.map((t => t * r)))(n).map(((t, n) => (t.value = +e[n], p(t)))) } function p(t) { return t.coordinates.forEach(g), t } function g(t) { t.forEach(y) } function y(t) { t.forEach(v) } function v(t) { t[0] = t[0] * Math.pow(2, a) - u, t[1] = t[1] * Math.pow(2, a) - u } function _() { return c = r + 2 * (u = 3 * o) >> a, f = i + 2 * u >> a, d } return d.contours = function (t) { var n = h(t), e = iu().size([c, f]), r = Math.pow(2, 2 * a), i = t => { t = +t; var i = p(e.contour(n, t * r)); return i.value = t, i }; return Object.defineProperty(i, "max", { get: () => J(n) / r }), i }, d.x = function (n) { return arguments.length ? (t = "function" == typeof n ? n : Qa(+n), d) : t }, d.y = function (t) { return arguments.length ? (n = "function" == typeof t ? t : Qa(+t), d) : n }, d.weight = function (t) { return arguments.length ? (e = "function" == typeof t ? t : Qa(+t), d) : e }, d.size = function (t) { if (!arguments.length) return [r, i]; var n = +t[0], e = +t[1]; if (!(n >= 0 && e >= 0)) throw new Error("invalid size"); return r = n, i = e, _() }, d.cellSize = function (t) { if (!arguments.length) return 1 << a; if (!((t = +t) >= 1)) throw new Error("invalid cell size"); return a = Math.floor(Math.log(t) / Math.LN2), _() }, d.thresholds = function (t) { return arguments.length ? (s = "function" == typeof t ? t : Array.isArray(t) ? Qa(Za.call(t)) : Qa(t), d) : s }, d.bandwidth = function (t) { if (!arguments.length) return Math.sqrt(o * (o + 1)); if (!((t = +t) >= 0)) throw new Error("invalid bandwidth"); return o = (Math.sqrt(4 * t * t + 1) - 1) / 2, _() }, d }, t.contours = iu, t.count = v, t.create = function (t) { return Zn(Yt(t).call(document.documentElement)) }, t.creator = Yt, t.cross = function (...t) { const n = "function" == typeof t[t.length - 1] && function (t) { return n => t(...n) }(t.pop()), e = (t = t.map(m)).map(_), r = t.length - 1, i = new Array(r + 1).fill(0), o = []; if (r < 0 || e.some(b)) return o; for (; ;) { o.push(i.map(((n, e) => t[e][n]))); let a = r; for (; ++i[a] === e[a];) { if (0 === a) return n ? o.map(n) : o; i[a--] = 0 } } }, t.csv = wc, t.csvFormat = rc, t.csvFormatBody = ic, t.csvFormatRow = ac, t.csvFormatRows = oc, t.csvFormatValue = uc, t.csvParse = nc, t.csvParseRows = ec, t.cubehelix = Tr, t.cumsum = function (t, n) { var e = 0, r = 0; return Float64Array.from(t, void 0 === n ? t => e += +t || 0 : i => e += +n(i, r++, t) || 0) }, t.curveBasis = function (t) { return new Rx(t) }, t.curveBasisClosed = function (t) { return new Fx(t) }, t.curveBasisOpen = function (t) { return new qx(t) }, t.curveBumpX = tx, t.curveBumpY = nx, t.curveBundle = Ix, t.curveCardinal = Yx, t.curveCardinalClosed = jx, t.curveCardinalOpen = Xx, t.curveCatmullRom = Wx, t.curveCatmullRomClosed = Kx, t.curveCatmullRomOpen = Jx, t.curveLinear = Um, t.curveLinearClosed = function (t) { return new tw(t) }, t.curveMonotoneX = function (t) { return new ow(t) }, t.curveMonotoneY = function (t) { return new aw(t) }, t.curveNatural = function (t) { return new cw(t) }, t.curveStep = function (t) { return new sw(t, .5) }, t.curveStepAfter = function (t) { return new sw(t, 1) }, t.curveStepBefore = function (t) { return new sw(t, 0) }, t.descending = e, t.deviation = w, t.difference = function (t, ...n) { t = new InternSet(t); for (const e of n) for (const n of e) t.delete(n); return t }, t.disjoint = function (t, n) { const e = n[Symbol.iterator](), r = new InternSet; for (const n of t) { if (r.has(n)) return !1; let t, i; for (; ({ value: t, done: i } = e.next()) && !i;) { if (Object.is(n, t)) return !1; r.add(t) } } return !0 }, t.dispatch = $t, t.drag = function () { var t, n, e, r, i = se, o = le, a = he, u = de, c = {}, f = $t("start", "drag", "end"), s = 0, l = 0; function h(t) { t.on("mousedown.drag", d).filter(u).on("touchstart.drag", y).on("touchmove.drag", v, ee).on("touchend.drag touchcancel.drag", _).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)") } function d(a, u) { if (!r && i.call(this, a, u)) { var c = b(this, o.call(this, a, u), a, u, "mouse"); c && (Zn(a.view).on("mousemove.drag", p, re).on("mouseup.drag", g, re), ae(a.view), ie(a), e = !1, t = a.clientX, n = a.clientY, c("start", a)) } } function p(r) { if (oe(r), !e) { var i = r.clientX - t, o = r.clientY - n; e = i * i + o * o > l } c.mouse("drag", r) } function g(t) { Zn(t.view).on("mousemove.drag mouseup.drag", null), ue(t.view, e), oe(t), c.mouse("end", t) } function y(t, n) { if (i.call(this, t, n)) { var e, r, a = t.changedTouches, u = o.call(this, t, n), c = a.length; for (e = 0; e < c; ++e)(r = b(this, u, t, n, a[e].identifier, a[e])) && (ie(t), r("start", t, a[e])) } } function v(t) { var n, e, r = t.changedTouches, i = r.length; for (n = 0; n < i; ++n)(e = c[r[n].identifier]) && (oe(t), e("drag", t, r[n])) } function _(t) { var n, e, i = t.changedTouches, o = i.length; for (r && clearTimeout(r), r = setTimeout((function () { r = null }), 500), n = 0; n < o; ++n)(e = c[i[n].identifier]) && (ie(t), e("end", t, i[n])) } function b(t, n, e, r, i, o) { var u, l, d, p = f.copy(), g = ne(o || e, n); if (null != (d = a.call(t, new fe("beforestart", { sourceEvent: e, target: h, identifier: i, active: s, x: g[0], y: g[1], dx: 0, dy: 0, dispatch: p }), r))) return u = d.x - g[0] || 0, l = d.y - g[1] || 0, function e(o, a, f) { var y, v = g; switch (o) { case "start": c[i] = e, y = s++; break; case "end": delete c[i], --s; case "drag": g = ne(f || a, n), y = s }p.call(o, t, new fe(o, { sourceEvent: a, subject: d, target: h, identifier: i, active: y, x: g[0] + u, y: g[1] + l, dx: g[0] - v[0], dy: g[1] - v[1], dispatch: p }), r) } } return h.filter = function (t) { return arguments.length ? (i = "function" == typeof t ? t : ce(!!t), h) : i }, h.container = function (t) { return arguments.length ? (o = "function" == typeof t ? t : ce(t), h) : o }, h.subject = function (t) { return arguments.length ? (a = "function" == typeof t ? t : ce(t), h) : a }, h.touchable = function (t) { return arguments.length ? (u = "function" == typeof t ? t : ce(!!t), h) : u }, h.on = function () { var t = f.on.apply(f, arguments); return t === f ? h : t }, h.clickDistance = function (t) { return arguments.length ? (l = (t = +t) * t, h) : Math.sqrt(l) }, h }, t.dragDisable = ae, t.dragEnable = ue, t.dsv = function (t, n, e, r) { 3 === arguments.length && "function" == typeof e && (r = e, e = void 0); var i = Ju(t); return mc(n, e).then((function (t) { return i.parse(t, r) })) }, t.dsvFormat = Ju, t.easeBack = Lo, t.easeBackIn = Bo, t.easeBackInOut = Lo, t.easeBackOut = Yo, t.easeBounce = Io, t.easeBounceIn = function (t) { return 1 - Io(1 - t) }, t.easeBounceInOut = function (t) { return ((t *= 2) <= 1 ? 1 - Io(1 - t) : Io(t - 1) + 1) / 2 }, t.easeBounceOut = Io, t.easeCircle = No, t.easeCircleIn = function (t) { return 1 - Math.sqrt(1 - t * t) }, t.easeCircleInOut = No, t.easeCircleOut = function (t) { return Math.sqrt(1 - --t * t) }, t.easeCubic = bo, t.easeCubicIn = function (t) { return t * t * t }, t.easeCubicInOut = bo, t.easeCubicOut = function (t) { return --t * t * t + 1 }, t.easeElastic = Xo, t.easeElasticIn = Ho, t.easeElasticInOut = Go, t.easeElasticOut = Xo, t.easeExp = Eo, t.easeExpIn = function (t) { return So(1 - +t) }, t.easeExpInOut = Eo, t.easeExpOut = function (t) { return 1 - So(t) }, t.easeLinear = t => +t, t.easePoly = wo, t.easePolyIn = mo, t.easePolyInOut = wo, t.easePolyOut = xo, t.easeQuad = _o, t.easeQuadIn = function (t) { return t * t }, t.easeQuadInOut = _o, t.easeQuadOut = function (t) { return t * (2 - t) }, t.easeSin = Ao, t.easeSinIn = function (t) { return 1 == +t ? 1 : 1 - Math.cos(t * To) }, t.easeSinInOut = Ao, t.easeSinOut = function (t) { return Math.sin(t * To) }, t.every = function (t, n) { if ("function" != typeof n) throw new TypeError("test is not a function"); let e = -1; for (const r of t) if (!n(r, ++e, t)) return !1; return !0 }, t.extent = M, t.fcumsum = function (t, n) { const e = new T; let r = -1; return Float64Array.from(t, void 0 === n ? t => e.add(+t || 0) : i => e.add(+n(i, ++r, t) || 0)) }, t.filter = function (t, n) { if ("function" != typeof n) throw new TypeError("test is not a function"); const e = []; let r = -1; for (const i of t) n(i, ++r, t) && e.push(i); return e }, t.flatGroup = function (t, ...n) { return z(P(t, ...n), n) }, t.flatRollup = function (t, n, ...e) { return z(D(t, n, ...e), e) }, t.forceCenter = function (t, n) { var e, r = 1; function i() { var i, o, a = e.length, u = 0, c = 0; for (i = 0; i < a; ++i)u += (o = e[i]).x, c += o.y; for (u = (u / a - t) * r, c = (c / a - n) * r, i = 0; i < a; ++i)(o = e[i]).x -= u, o.y -= c } return null == t && (t = 0), null == n && (n = 0), i.initialize = function (t) { e = t }, i.x = function (n) { return arguments.length ? (t = +n, i) : t }, i.y = function (t) { return arguments.length ? (n = +t, i) : n }, i.strength = function (t) { return arguments.length ? (r = +t, i) : r }, i }, t.forceCollide = function (t) { var n, e, r, i = 1, o = 1; function a() { for (var t, a, c, f, s, l, h, d = n.length, p = 0; p < o; ++p)for (a = $c(n, Ic, Oc).visitAfter(u), t = 0; t < d; ++t)c = n[t], l = e[c.index], h = l * l, f = c.x + c.vx, s = c.y + c.vy, a.visit(g); function g(t, n, e, o, a) { var u = t.data, d = t.r, p = l + d; if (!u) return n > f + p || o < f - p || e > s + p || a < s - p; if (u.index > c.index) { var g = f - u.x - u.vx, y = s - u.y - u.vy, v = g * g + y * y; v < p * p && (0 === g && (v += (g = Uc(r)) * g), 0 === y && (v += (y = Uc(r)) * y), v = (p - (v = Math.sqrt(v))) / v * i, c.vx += (g *= v) * (p = (d *= d) / (h + d)), c.vy += (y *= v) * p, u.vx -= g * (p = 1 - p), u.vy -= y * p) } } } function u(t) { if (t.data) return t.r = e[t.data.index]; for (var n = t.r = 0; n < 4; ++n)t[n] && t[n].r > t.r && (t.r = t[n].r) } function c() { if (n) { var r, i, o = n.length; for (e = new Array(o), r = 0; r < o; ++r)i = n[r], e[i.index] = +t(i, r, n) } } return "function" != typeof t && (t = qc(null == t ? 1 : +t)), a.initialize = function (t, e) { n = t, r = e, c() }, a.iterations = function (t) { return arguments.length ? (o = +t, a) : o }, a.strength = function (t) { return arguments.length ? (i = +t, a) : i }, a.radius = function (n) { return arguments.length ? (t = "function" == typeof n ? n : qc(+n), c(), a) : t }, a }, t.forceLink = function (t) { var n, e, r, i, o, a, u = Bc, c = function (t) { return 1 / Math.min(i[t.source.index], i[t.target.index]) }, f = qc(30), s = 1; function l(r) { for (var i = 0, u = t.length; i < s; ++i)for (var c, f, l, h, d, p, g, y = 0; y < u; ++y)f = (c = t[y]).source, h = (l = c.target).x + l.vx - f.x - f.vx || Uc(a), d = l.y + l.vy - f.y - f.vy || Uc(a), h *= p = ((p = Math.sqrt(h * h + d * d)) - e[y]) / p * r * n[y], d *= p, l.vx -= h * (g = o[y]), l.vy -= d * g, f.vx += h * (g = 1 - g), f.vy += d * g } function h() { if (r) { var a, c, f = r.length, s = t.length, l = new Map(r.map(((t, n) => [u(t, n, r), t]))); for (a = 0, i = new Array(f); a < s; ++a)(c = t[a]).index = a, "object" != typeof c.source && (c.source = Yc(l, c.source)), "object" != typeof c.target && (c.target = Yc(l, c.target)), i[c.source.index] = (i[c.source.index] || 0) + 1, i[c.target.index] = (i[c.target.index] || 0) + 1; for (a = 0, o = new Array(s); a < s; ++a)c = t[a], o[a] = i[c.source.index] / (i[c.source.index] + i[c.target.index]); n = new Array(s), d(), e = new Array(s), p() } } function d() { if (r) for (var e = 0, i = t.length; e < i; ++e)n[e] = +c(t[e], e, t) } function p() { if (r) for (var n = 0, i = t.length; n < i; ++n)e[n] = +f(t[n], n, t) } return null == t && (t = []), l.initialize = function (t, n) { r = t, a = n, h() }, l.links = function (n) { return arguments.length ? (t = n, h(), l) : t }, l.id = function (t) { return arguments.length ? (u = t, l) : u }, l.iterations = function (t) { return arguments.length ? (s = +t, l) : s }, l.strength = function (t) { return arguments.length ? (c = "function" == typeof t ? t : qc(+t), d(), l) : c }, l.distance = function (t) { return arguments.length ? (f = "function" == typeof t ? t : qc(+t), p(), l) : f }, l }, t.forceManyBody = function () { var t, n, e, r, i, o = qc(-30), a = 1, u = 1 / 0, c = .81; function f(e) { var i, o = t.length, a = $c(t, Xc, Gc).visitAfter(l); for (r = e, i = 0; i < o; ++i)n = t[i], a.visit(h) } function s() { if (t) { var n, e, r = t.length; for (i = new Array(r), n = 0; n < r; ++n)e = t[n], i[e.index] = +o(e, n, t) } } function l(t) { var n, e, r, o, a, u = 0, c = 0; if (t.length) { for (r = o = a = 0; a < 4; ++a)(n = t[a]) && (e = Math.abs(n.value)) && (u += n.value, c += e, r += e * n.x, o += e * n.y); t.x = r / c, t.y = o / c } else { (n = t).x = n.data.x, n.y = n.data.y; do { u += i[n.data.index] } while (n = n.next) } t.value = u } function h(t, o, f, s) { if (!t.value) return !0; var l = t.x - n.x, h = t.y - n.y, d = s - o, p = l * l + h * h; if (d * d / c < p) return p < u && (0 === l && (p += (l = Uc(e)) * l), 0 === h && (p += (h = Uc(e)) * h), p < a && (p = Math.sqrt(a * p)), n.vx += l * t.value * r / p, n.vy += h * t.value * r / p), !0; if (!(t.length || p >= u)) { (t.data !== n || t.next) && (0 === l && (p += (l = Uc(e)) * l), 0 === h && (p += (h = Uc(e)) * h), p < a && (p = Math.sqrt(a * p))); do { t.data !== n && (d = i[t.data.index] * r / p, n.vx += l * d, n.vy += h * d) } while (t = t.next) } } return f.initialize = function (n, r) { t = n, e = r, s() }, f.strength = function (t) { return arguments.length ? (o = "function" == typeof t ? t : qc(+t), s(), f) : o }, f.distanceMin = function (t) { return arguments.length ? (a = t * t, f) : Math.sqrt(a) }, f.distanceMax = function (t) { return arguments.length ? (u = t * t, f) : Math.sqrt(u) }, f.theta = function (t) { return arguments.length ? (c = t * t, f) : Math.sqrt(c) }, f }, t.forceRadial = function (t, n, e) { var r, i, o, a = qc(.1); function u(t) { for (var a = 0, u = r.length; a < u; ++a) { var c = r[a], f = c.x - n || 1e-6, s = c.y - e || 1e-6, l = Math.sqrt(f * f + s * s), h = (o[a] - l) * i[a] * t / l; c.vx += f * h, c.vy += s * h } } function c() { if (r) { var n, e = r.length; for (i = new Array(e), o = new Array(e), n = 0; n < e; ++n)o[n] = +t(r[n], n, r), i[n] = isNaN(o[n]) ? 0 : +a(r[n], n, r) } } return "function" != typeof t && (t = qc(+t)), null == n && (n = 0), null == e && (e = 0), u.initialize = function (t) { r = t, c() }, u.strength = function (t) { return arguments.length ? (a = "function" == typeof t ? t : qc(+t), c(), u) : a }, u.radius = function (n) { return arguments.length ? (t = "function" == typeof n ? n : qc(+n), c(), u) : t }, u.x = function (t) { return arguments.length ? (n = +t, u) : n }, u.y = function (t) { return arguments.length ? (e = +t, u) : e }, u }, t.forceSimulation = function (t) { var n, e = 1, r = .001, i = 1 - Math.pow(r, 1 / 300), o = 0, a = .6, u = new Map, c = Ni(l), f = $t("tick", "end"), s = function () { let t = 1; return () => (t = (Lc * t + jc) % Hc) / Hc }(); function l() { h(), f.call("tick", n), e < r && (c.stop(), f.call("end", n)) } function h(r) { var c, f, s = t.length; void 0 === r && (r = 1); for (var l = 0; l < r; ++l)for (e += (o - e) * i, u.forEach((function (t) { t(e) })), c = 0; c < s; ++c)null == (f = t[c]).fx ? f.x += f.vx *= a : (f.x = f.fx, f.vx = 0), null == f.fy ? f.y += f.vy *= a : (f.y = f.fy, f.vy = 0); return n } function d() { for (var n, e = 0, r = t.length; e < r; ++e) { if ((n = t[e]).index = e, null != n.fx && (n.x = n.fx), null != n.fy && (n.y = n.fy), isNaN(n.x) || isNaN(n.y)) { var i = 10 * Math.sqrt(.5 + e), o = e * Vc; n.x = i * Math.cos(o), n.y = i * Math.sin(o) } (isNaN(n.vx) || isNaN(n.vy)) && (n.vx = n.vy = 0) } } function p(n) { return n.initialize && n.initialize(t, s), n } return null == t && (t = []), d(), n = { tick: h, restart: function () { return c.restart(l), n }, stop: function () { return c.stop(), n }, nodes: function (e) { return arguments.length ? (t = e, d(), u.forEach(p), n) : t }, alpha: function (t) { return arguments.length ? (e = +t, n) : e }, alphaMin: function (t) { return arguments.length ? (r = +t, n) : r }, alphaDecay: function (t) { return arguments.length ? (i = +t, n) : +i }, alphaTarget: function (t) { return arguments.length ? (o = +t, n) : o }, velocityDecay: function (t) { return arguments.length ? (a = 1 - t, n) : 1 - a }, randomSource: function (t) { return arguments.length ? (s = t, u.forEach(p), n) : s }, force: function (t, e) { return arguments.length > 1 ? (null == e ? u.delete(t) : u.set(t, p(e)), n) : u.get(t) }, find: function (n, e, r) { var i, o, a, u, c, f = 0, s = t.length; for (null == r ? r = 1 / 0 : r *= r, f = 0; f < s; ++f)(a = (i = n - (u = t[f]).x) * i + (o = e - u.y) * o) < r && (c = u, r = a); return c }, on: function (t, e) { return arguments.length > 1 ? (f.on(t, e), n) : f.on(t) } } }, t.forceX = function (t) { var n, e, r, i = qc(.1); function o(t) { for (var i, o = 0, a = n.length; o < a; ++o)(i = n[o]).vx += (r[o] - i.x) * e[o] * t } function a() { if (n) { var o, a = n.length; for (e = new Array(a), r = new Array(a), o = 0; o < a; ++o)e[o] = isNaN(r[o] = +t(n[o], o, n)) ? 0 : +i(n[o], o, n) } } return "function" != typeof t && (t = qc(null == t ? 0 : +t)), o.initialize = function (t) { n = t, a() }, o.strength = function (t) { return arguments.length ? (i = "function" == typeof t ? t : qc(+t), a(), o) : i }, o.x = function (n) { return arguments.length ? (t = "function" == typeof n ? n : qc(+n), a(), o) : t }, o }, t.forceY = function (t) { var n, e, r, i = qc(.1); function o(t) { for (var i, o = 0, a = n.length; o < a; ++o)(i = n[o]).vy += (r[o] - i.y) * e[o] * t } function a() { if (n) { var o, a = n.length; for (e = new Array(a), r = new Array(a), o = 0; o < a; ++o)e[o] = isNaN(r[o] = +t(n[o], o, n)) ? 0 : +i(n[o], o, n) } } return "function" != typeof t && (t = qc(null == t ? 0 : +t)), o.initialize = function (t) { n = t, a() }, o.strength = function (t) { return arguments.length ? (i = "function" == typeof t ? t : qc(+t), a(), o) : i }, o.y = function (n) { return arguments.length ? (t = "function" == typeof n ? n : qc(+n), a(), o) : t }, o }, t.formatDefaultLocale = ff, t.formatLocale = cf, t.formatSpecifier = Jc, t.fsum = function (t, n) { const e = new T; if (void 0 === n) for (let n of t) (n = +n) && e.add(n); else { let r = -1; for (let i of t) (i = +n(i, ++r, t)) && e.add(i) } return +e }, t.geoAlbers = xd, t.geoAlbersUsa = function () { var t, n, e, r, i, o, a = xd(), u = md().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]), c = md().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]), f = { point: function (t, n) { o = [t, n] } }; function s(t) { var n = t[0], a = t[1]; return o = null, e.point(n, a), o || (r.point(n, a), o) || (i.point(n, a), o) } function l() { return t = n = null, s } return s.invert = function (t) { var n = a.scale(), e = a.translate(), r = (t[0] - e[0]) / n, i = (t[1] - e[1]) / n; return (i >= .12 && i < .234 && r >= -.425 && r < -.214 ? u : i >= .166 && i < .234 && r >= -.214 && r < -.115 ? c : a).invert(t) }, s.stream = function (e) { return t && n === e ? t : (r = [a.stream(n = e), u.stream(e), c.stream(e)], i = r.length, t = { point: function (t, n) { for (var e = -1; ++e < i;)r[e].point(t, n) }, sphere: function () { for (var t = -1; ++t < i;)r[t].sphere() }, lineStart: function () { for (var t = -1; ++t < i;)r[t].lineStart() }, lineEnd: function () { for (var t = -1; ++t < i;)r[t].lineEnd() }, polygonStart: function () { for (var t = -1; ++t < i;)r[t].polygonStart() }, polygonEnd: function () { for (var t = -1; ++t < i;)r[t].polygonEnd() } }); var r, i }, s.precision = function (t) { return arguments.length ? (a.precision(t), u.precision(t), c.precision(t), l()) : a.precision() }, s.scale = function (t) { return arguments.length ? (a.scale(t), u.scale(.35 * t), c.scale(t), s.translate(a.translate())) : a.scale() }, s.translate = function (t) { if (!arguments.length) return a.translate(); var n = a.scale(), o = +t[0], s = +t[1]; return e = a.translate(t).clipExtent([[o - .455 * n, s - .238 * n], [o + .455 * n, s + .238 * n]]).stream(f), r = u.translate([o - .307 * n, s + .201 * n]).clipExtent([[o - .425 * n + df, s + .12 * n + df], [o - .214 * n - df, s + .234 * n - df]]).stream(f), i = c.translate([o - .205 * n, s + .212 * n]).clipExtent([[o - .214 * n + df, s + .166 * n + df], [o - .115 * n - df, s + .234 * n - df]]).stream(f), l() }, s.fitExtent = function (t, n) { return ud(s, t, n) }, s.fitSize = function (t, n) { return cd(s, t, n) }, s.fitWidth = function (t, n) { return fd(s, t, n) }, s.fitHeight = function (t, n) { return sd(s, t, n) }, s.scale(1070) }, t.geoArea = function (t) { return us = new T, Lf(t, cs), 2 * us }, t.geoAzimuthalEqualArea = function () { return yd(Td).scale(124.75).clipAngle(179.999) }, t.geoAzimuthalEqualAreaRaw = Td, t.geoAzimuthalEquidistant = function () { return yd(Ad).scale(79.4188).clipAngle(179.999) }, t.geoAzimuthalEquidistantRaw = Ad, t.geoBounds = function (t) { var n, e, r, i, o, a, u; if (Qf = Kf = -(Wf = Zf = 1 / 0), is = [], Lf(t, Fs), e = is.length) { for (is.sort(Hs), n = 1, o = [r = is[0]]; n < e; ++n)Xs(r, (i = is[n])[0]) || Xs(r, i[1]) ? (js(r[0], i[1]) > js(r[0], r[1]) && (r[1] = i[1]), js(i[0], r[1]) > js(r[0], r[1]) && (r[0] = i[0])) : o.push(r = i); for (a = -1 / 0, n = 0, r = o[e = o.length - 1]; n <= e; r = i, ++n)i = o[n], (u = js(r[1], i[0])) > a && (a = u, Wf = i[0], Kf = r[1]) } return is = os = null, Wf === 1 / 0 || Zf === 1 / 0 ? [[NaN, NaN], [NaN, NaN]] : [[Wf, Zf], [Kf, Qf]] }, t.geoCentroid = function (t) { ms = xs = ws = Ms = Ts = As = Ss = Es = 0, Ns = new T, ks = new T, Cs = new T, Lf(t, Gs); var n = +Ns, e = +ks, r = +Cs, i = Ef(n, e, r); return i < pf && (n = As, e = Ss, r = Es, xs < df && (n = ws, e = Ms, r = Ts), (i = Ef(n, e, r)) < pf) ? [NaN, NaN] : [Mf(e, n) * bf, Rf(r / i) * bf] }, t.geoCircle = function () { var t, n, e = il([0, 0]), r = il(90), i = il(6), o = { point: function (e, r) { t.push(e = n(e, r)), e[0] *= bf, e[1] *= bf } }; function a() { var a = e.apply(this, arguments), u = r.apply(this, arguments) * mf, c = i.apply(this, arguments) * mf; return t = [], n = ul(-a[0] * mf, -a[1] * mf, 0).invert, hl(o, u, c, 1), a = { type: "Polygon", coordinates: [t] }, t = n = null, a } return a.center = function (t) { return arguments.length ? (e = "function" == typeof t ? t : il([+t[0], +t[1]]), a) : e }, a.radius = function (t) { return arguments.length ? (r = "function" == typeof t ? t : il(+t), a) : r }, a.precision = function (t) { return arguments.length ? (i = "function" == typeof t ? t : il(+t), a) : i }, a }, t.geoClipAntimeridian = Tl, t.geoClipCircle = Al, t.geoClipExtent = function () { var t, n, e, r = 0, i = 0, o = 960, a = 500; return e = { stream: function (e) { return t && n === e ? t : t = zl(r, i, o, a)(n = e) }, extent: function (u) { return arguments.length ? (r = +u[0][0], i = +u[0][1], o = +u[1][0], a = +u[1][1], t = n = null, e) : [[r, i], [o, a]] } } }, t.geoClipRectangle = zl, t.geoConicConformal = function () { return _d(kd).scale(109.5).parallels([30, 30]) }, t.geoConicConformalRaw = kd, t.geoConicEqualArea = md, t.geoConicEqualAreaRaw = bd, t.geoConicEquidistant = function () { return _d(Pd).scale(131.154).center([0, 13.9389]) }, t.geoConicEquidistantRaw = Pd, t.geoContains = function (t, n) { return (t && Bl.hasOwnProperty(t.type) ? Bl[t.type] : Ll)(t, n) }, t.geoDistance = Ol, t.geoEqualEarth = function () { return yd(qd).scale(177.158) }, t.geoEqualEarthRaw = qd, t.geoEquirectangular = function () { return yd(Cd).scale(152.63) }, t.geoEquirectangularRaw = Cd, t.geoGnomonic = function () { return yd(Ud).scale(144.049).clipAngle(60) }, t.geoGnomonicRaw = Ud, t.geoGraticule = Kl, t.geoGraticule10 = function () { return Kl()() }, t.geoIdentity = function () { var t, n, e, r, i, o, a, u = 1, c = 0, f = 0, s = 1, l = 1, h = 0, d = null, p = 1, g = 1, y = id({ point: function (t, n) { var e = b([t, n]); this.stream.point(e[0], e[1]) } }), v = eh; function _() { return p = u * s, g = u * l, o = a = null, b } function b(e) { var r = e[0] * p, i = e[1] * g; if (h) { var o = i * t - r * n; r = r * t + i * n, i = o } return [r + c, i + f] } return b.invert = function (e) { var r = e[0] - c, i = e[1] - f; if (h) { var o = i * t + r * n; r = r * t - i * n, i = o } return [r / p, i / g] }, b.stream = function (t) { return o && a === t ? o : o = y(v(a = t)) }, b.postclip = function (t) { return arguments.length ? (v = t, d = e = r = i = null, _()) : v }, b.clipExtent = function (t) { return arguments.length ? (v = null == t ? (d = e = r = i = null, eh) : zl(d = +t[0][0], e = +t[0][1], r = +t[1][0], i = +t[1][1]), _()) : null == d ? null : [[d, e], [r, i]] }, b.scale = function (t) { return arguments.length ? (u = +t, _()) : u }, b.translate = function (t) { return arguments.length ? (c = +t[0], f = +t[1], _()) : [c, f] }, b.angle = function (e) { return arguments.length ? (n = Cf(h = e % 360 * mf), t = Tf(h), _()) : h * bf }, b.reflectX = function (t) { return arguments.length ? (s = t ? -1 : 1, _()) : s < 0 }, b.reflectY = function (t) { return arguments.length ? (l = t ? -1 : 1, _()) : l < 0 }, b.fitExtent = function (t, n) { return ud(b, t, n) }, b.fitSize = function (t, n) { return cd(b, t, n) }, b.fitWidth = function (t, n) { return fd(b, t, n) }, b.fitHeight = function (t, n) { return sd(b, t, n) }, b }, t.geoInterpolate = function (t, n) { var e = t[0] * mf, r = t[1] * mf, i = n[0] * mf, o = n[1] * mf, a = Tf(r), u = Cf(r), c = Tf(o), f = Cf(o), s = a * Tf(e), l = a * Cf(e), h = c * Tf(i), d = c * Cf(i), p = 2 * Rf(zf(Ff(o - r) + a * c * Ff(i - e))), g = Cf(p), y = p ? function (t) { var n = Cf(t *= p) / g, e = Cf(p - t) / g, r = e * s + n * h, i = e * l + n * d, o = e * u + n * f; return [Mf(i, r) * bf, Mf(o, zf(r * r + i * i)) * bf] } : function () { return [e * bf, r * bf] }; return y.distance = p, y }, t.geoLength = ql, t.geoMercator = function () { return Ed(Sd).scale(961 / _f) }, t.geoMercatorRaw = Sd, t.geoNaturalEarth1 = function () { return yd(Id).scale(175.295) }, t.geoNaturalEarth1Raw = Id, t.geoOrthographic = function () { return yd(Od).scale(249.5).clipAngle(90 + df) }, t.geoOrthographicRaw = Od, t.geoPath = function (t, n) { let e, r, i = 3, o = 4.5; function a(t) { return t && ("function" == typeof o && r.pointRadius(+o.apply(this, arguments)), Lf(t, e(r))), r.result() } return a.area = function (t) { return Lf(t, e(sh)), sh.result() }, a.measure = function (t) { return Lf(t, e(Kh)), Kh.result() }, a.bounds = function (t) { return Lf(t, e(mh)), mh.result() }, a.centroid = function (t) { return Lf(t, e(Oh)), Oh.result() }, a.projection = function (n) { return arguments.length ? (e = null == n ? (t = null, eh) : (t = n).stream, a) : t }, a.context = function (t) { return arguments.length ? (r = null == t ? (n = null, new ed(i)) : new Bh(n = t), "function" != typeof o && r.pointRadius(o), a) : n }, a.pointRadius = function (t) { return arguments.length ? (o = "function" == typeof t ? t : (r.pointRadius(+t), +t), a) : o }, a.digits = function (t) { if (!arguments.length) return i; if (null == t) i = null; else { const n = Math.floor(t); if (!(n >= 0)) throw new RangeError(`invalid digits: ${t}`); i = n } return null === n && (r = new ed(i)), a }, a.projection(t).digits(i).context(n) }, t.geoProjection = yd, t.geoProjectionMutator = vd, t.geoRotation = ll, t.geoStereographic = function () { return yd(Bd).scale(250).clipAngle(142) }, t.geoStereographicRaw = Bd, t.geoStream = Lf, t.geoTransform = function (t) { return { stream: id(t) } }, t.geoTransverseMercator = function () { var t = Ed(Yd), n = t.center, e = t.rotate; return t.center = function (t) { return arguments.length ? n([-t[1], t[0]]) : [(t = n())[1], -t[0]] }, t.rotate = function (t) { return arguments.length ? e([t[0], t[1], t.length > 2 ? t[2] + 90 : 90]) : [(t = e())[0], t[1], t[2] - 90] }, e([0, 0, 90]).scale(159.155) }, t.geoTransverseMercatorRaw = Yd, t.gray = function (t, n) { return new ur(t, 0, 0, null == n ? 1 : n) }, t.greatest = ot, t.greatestIndex = function (t, e = n) { if (1 === e.length) return tt(t, e); let r, i = -1, o = -1; for (const n of t) ++o, (i < 0 ? 0 === e(n, n) : e(n, r) > 0) && (r = n, i = o); return i }, t.group = C, t.groupSort = function (t, e, r) { return (2 !== e.length ? U($(t, e, r), (([t, e], [r, i]) => n(e, i) || n(t, r))) : U(C(t, r), (([t, r], [i, o]) => e(r, o) || n(t, i)))).map((([t]) => t)) }, t.groups = P, t.hcl = dr, t.hierarchy = Gd, t.histogram = Q, t.hsl = He, t.html = Ec, t.image = function (t, n) { return new Promise((function (e, r) { var i = new Image; for (var o in n) i[o] = n[o]; i.onerror = r, i.onload = function () { e(i) }, i.src = t })) }, t.index = function (t, ...n) { return F(t, k, R, n) }, t.indexes = function (t, ...n) { return F(t, Array.from, R, n) }, t.interpolate = Gr, t.interpolateArray = function (t, n) { return (Ir(n) ? Ur : Or)(t, n) }, t.interpolateBasis = Er, t.interpolateBasisClosed = Nr, t.interpolateBlues = Xb, t.interpolateBrBG = ib, t.interpolateBuGn = wb, t.interpolateBuPu = Tb, t.interpolateCividis = function (t) { return t = Math.max(0, Math.min(1, t)), "rgb(" + Math.max(0, Math.min(255, Math.round(-4.54 - t * (35.34 - t * (2381.73 - t * (6402.7 - t * (7024.72 - 2710.57 * t))))))) + ", " + Math.max(0, Math.min(255, Math.round(32.49 + t * (170.73 + t * (52.82 - t * (131.46 - t * (176.58 - 67.37 * t))))))) + ", " + Math.max(0, Math.min(255, Math.round(81.24 + t * (442.36 - t * (2482.43 - t * (6167.24 - t * (6614.94 - 2475.67 * t))))))) + ")" }, t.interpolateCool = om, t.interpolateCubehelix = li, t.interpolateCubehelixDefault = rm, t.interpolateCubehelixLong = hi, t.interpolateDate = Br, t.interpolateDiscrete = function (t) { var n = t.length; return function (e) { return t[Math.max(0, Math.min(n - 1, Math.floor(e * n)))] } }, t.interpolateGnBu = Sb, t.interpolateGreens = Vb, t.interpolateGreys = Zb, t.interpolateHcl = ci, t.interpolateHclLong = fi, t.interpolateHsl = oi, t.interpolateHslLong = ai, t.interpolateHue = function (t, n) { var e = Pr(+t, +n); return function (t) { var n = e(t); return n - 360 * Math.floor(n / 360) } }, t.interpolateInferno = dm, t.interpolateLab = function (t, n) { var e = $r((t = ar(t)).l, (n = ar(n)).l), r = $r(t.a, n.a), i = $r(t.b, n.b), o = $r(t.opacity, n.opacity); return function (n) { return t.l = e(n), t.a = r(n), t.b = i(n), t.opacity = o(n), t + "" } }, t.interpolateMagma = hm, t.interpolateNumber = Yr, t.interpolateNumberArray = Ur, t.interpolateObject = Lr, t.interpolateOrRd = Nb, t.interpolateOranges = em, t.interpolatePRGn = ab, t.interpolatePiYG = cb, t.interpolatePlasma = pm, t.interpolatePuBu = zb, t.interpolatePuBuGn = Cb, t.interpolatePuOr = sb, t.interpolatePuRd = Db, t.interpolatePurples = Qb, t.interpolateRainbow = function (t) { (t < 0 || t > 1) && (t -= Math.floor(t)); var n = Math.abs(t - .5); return am.h = 360 * t - 100, am.s = 1.5 - 1.5 * n, am.l = .8 - .9 * n, am + "" }, t.interpolateRdBu = hb, t.interpolateRdGy = pb, t.interpolateRdPu = Fb, t.interpolateRdYlBu = yb, t.interpolateRdYlGn = _b, t.interpolateReds = tm, t.interpolateRgb = Dr, t.interpolateRgbBasis = Fr, t.interpolateRgbBasisClosed = qr, t.interpolateRound = Vr, t.interpolateSinebow = function (t) { var n; return t = (.5 - t) * Math.PI, um.r = 255 * (n = Math.sin(t)) * n, um.g = 255 * (n = Math.sin(t + cm)) * n, um.b = 255 * (n = Math.sin(t + fm)) * n, um + "" }, t.interpolateSpectral = mb, t.interpolateString = Xr, t.interpolateTransformCss = ti, t.interpolateTransformSvg = ni, t.interpolateTurbo = function (t) { return t = Math.max(0, Math.min(1, t)), "rgb(" + Math.max(0, Math.min(255, Math.round(34.61 + t * (1172.33 - t * (10793.56 - t * (33300.12 - t * (38394.49 - 14825.05 * t))))))) + ", " + Math.max(0, Math.min(255, Math.round(23.31 + t * (557.33 + t * (1225.33 - t * (3574.96 - t * (1073.77 + 707.56 * t))))))) + ", " + Math.max(0, Math.min(255, Math.round(27.2 + t * (3211.1 - t * (15327.97 - t * (27814 - t * (22569.18 - 6838.66 * t))))))) + ")" }, t.interpolateViridis = lm, t.interpolateWarm = im, t.interpolateYlGn = Ob, t.interpolateYlGnBu = Ub, t.interpolateYlOrBr = Yb, t.interpolateYlOrRd = jb, t.interpolateZoom = ri, t.interrupt = Gi, t.intersection = function (t, ...n) { t = new InternSet(t), n = n.map(vt); t: for (const e of t) for (const r of n) if (!r.has(e)) { t.delete(e); continue t } return t }, t.interval = function (t, n, e) { var r = new Ei, i = n; return null == n ? (r.restart(t, n, e), r) : (r._restart = r.restart, r.restart = function (t, n, e) { n = +n, e = null == e ? Ai() : +e, r._restart((function o(a) { a += i, r._restart(o, i += n, e), t(a) }), n, e) }, r.restart(t, n, e), r) }, t.isoFormat = D_, t.isoParse = F_, t.json = function (t, n) { return fetch(t, n).then(Tc) }, t.lab = ar, t.lch = function (t, n, e, r) { return 1 === arguments.length ? hr(t) : new pr(e, n, t, null == r ? 1 : r) }, t.least = function (t, e = n) { let r, i = !1; if (1 === e.length) { let o; for (const a of t) { const t = e(a); (i ? n(t, o) < 0 : 0 === n(t, t)) && (r = a, o = t, i = !0) } } else for (const n of t) (i ? e(n, r) < 0 : 0 === e(n, n)) && (r = n, i = !0); return r }, t.leastIndex = ht, t.line = Bm, t.lineRadial = Wm, t.link = ox, t.linkHorizontal = function () { return ox(tx) }, t.linkRadial = function () { const t = ox(ex); return t.angle = t.x, delete t.x, t.radius = t.y, delete t.y, t }, t.linkVertical = function () { return ox(nx) }, t.local = Qn, t.map = function (t, n) { if ("function" != typeof t[Symbol.iterator]) throw new TypeError("values is not iterable"); if ("function" != typeof n) throw new TypeError("mapper is not a function"); return Array.from(t, ((e, r) => n(e, r, t))) }, t.matcher = Vt, t.max = J, t.maxIndex = tt, t.mean = function (t, n) { let e = 0, r = 0; if (void 0 === n) for (let n of t) null != n && (n = +n) >= n && (++e, r += n); else { let i = -1; for (let o of t) null != (o = n(o, ++i, t)) && (o = +o) >= o && (++e, r += o) } if (e) return r / e }, t.median = function (t, n) { return at(t, .5, n) }, t.medianIndex = function (t, n) { return ct(t, .5, n) }, t.merge = ft, t.min = nt, t.minIndex = et, t.mode = function (t, n) { const e = new InternMap; if (void 0 === n) for (let n of t) null != n && n >= n && e.set(n, (e.get(n) || 0) + 1); else { let r = -1; for (let i of t) null != (i = n(i, ++r, t)) && i >= i && e.set(i, (e.get(i) || 0) + 1) } let r, i = 0; for (const [t, n] of e) n > i && (i = n, r = t); return r }, t.namespace = It, t.namespaces = Ut, t.nice = Z, t.now = Ai, t.pack = function () { var t = null, n = 1, e = 1, r = np; function i(i) { const o = ap(); return i.x = n / 2, i.y = e / 2, t ? i.eachBefore(xp(t)).eachAfter(wp(r, .5, o)).eachBefore(Mp(1)) : i.eachBefore(xp(mp)).eachAfter(wp(np, 1, o)).eachAfter(wp(r, i.r / Math.min(n, e), o)).eachBefore(Mp(Math.min(n, e) / (2 * i.r))), i } return i.radius = function (n) { return arguments.length ? (t = Jd(n), i) : t }, i.size = function (t) { return arguments.length ? (n = +t[0], e = +t[1], i) : [n, e] }, i.padding = function (t) { return arguments.length ? (r = "function" == typeof t ? t : ep(+t), i) : r }, i }, t.packEnclose = function (t) { return up(t, ap()) }, t.packSiblings = function (t) { return bp(t, ap()), t }, t.pairs = function (t, n = st) { const e = []; let r, i = !1; for (const o of t) i && e.push(n(r, o)), r = o, i = !0; return e }, t.partition = function () { var t = 1, n = 1, e = 0, r = !1; function i(i) { var o = i.height + 1; return i.x0 = i.y0 = e, i.x1 = t, i.y1 = n / o, i.eachBefore(function (t, n) { return function (r) { r.children && Ap(r, r.x0, t * (r.depth + 1) / n, r.x1, t * (r.depth + 2) / n); var i = r.x0, o = r.y0, a = r.x1 - e, u = r.y1 - e; a < i && (i = a = (i + a) / 2), u < o && (o = u = (o + u) / 2), r.x0 = i, r.y0 = o, r.x1 = a, r.y1 = u } }(n, o)), r && i.eachBefore(Tp), i } return i.round = function (t) { return arguments.length ? (r = !!t, i) : r }, i.size = function (e) { return arguments.length ? (t = +e[0], n = +e[1], i) : [t, n] }, i.padding = function (t) { return arguments.length ? (e = +t, i) : e }, i }, t.path = Ia, t.pathRound = function (t = 3) { return new Ua(+t) }, t.permute = q, t.pie = function () { var t = jm, n = Lm, e = null, r = gm(0), i = gm(Sm), o = gm(0); function a(a) { var u, c, f, s, l, h = (a = Fm(a)).length, d = 0, p = new Array(h), g = new Array(h), y = +r.apply(this, arguments), v = Math.min(Sm, Math.max(-Sm, i.apply(this, arguments) - y)), _ = Math.min(Math.abs(v) / h, o.apply(this, arguments)), b = _ * (v < 0 ? -1 : 1); for (u = 0; u < h; ++u)(l = g[p[u] = u] = +t(a[u], u, a)) > 0 && (d += l); for (null != n ? p.sort((function (t, e) { return n(g[t], g[e]) })) : null != e && p.sort((function (t, n) { return e(a[t], a[n]) })), u = 0, f = d ? (v - h * b) / d : 0; u < h; ++u, y = s)c = p[u], s = y + ((l = g[c]) > 0 ? l * f : 0) + b, g[c] = { data: a[c], index: u, value: l, startAngle: y, endAngle: s, padAngle: _ }; return g } return a.value = function (n) { return arguments.length ? (t = "function" == typeof n ? n : gm(+n), a) : t }, a.sortValues = function (t) { return arguments.length ? (n = t, e = null, a) : n }, a.sort = function (t) { return arguments.length ? (e = t, n = null, a) : e }, a.startAngle = function (t) { return arguments.length ? (r = "function" == typeof t ? t : gm(+t), a) : r }, a.endAngle = function (t) { return arguments.length ? (i = "function" == typeof t ? t : gm(+t), a) : i }, a.padAngle = function (t) { return arguments.length ? (o = "function" == typeof t ? t : gm(+t), a) : o }, a }, t.piecewise = di, t.pointRadial = Km, t.pointer = ne, t.pointers = function (t, n) { return t.target && (t = te(t), void 0 === n && (n = t.currentTarget), t = t.touches || [t]), Array.from(t, (t => ne(t, n))) }, t.polygonArea = function (t) { for (var n, e = -1, r = t.length, i = t[r - 1], o = 0; ++e < r;)n = i, i = t[e], o += n[1] * i[0] - n[0] * i[1]; return o / 2 }, t.polygonCentroid = function (t) { for (var n, e, r = -1, i = t.length, o = 0, a = 0, u = t[i - 1], c = 0; ++r < i;)n = u, u = t[r], c += e = n[0] * u[1] - u[0] * n[1], o += (n[0] + u[0]) * e, a += (n[1] + u[1]) * e; return [o / (c *= 3), a / c] }, t.polygonContains = function (t, n) { for (var e, r, i = t.length, o = t[i - 1], a = n[0], u = n[1], c = o[0], f = o[1], s = !1, l = 0; l < i; ++l)e = (o = t[l])[0], (r = o[1]) > u != f > u && a < (c - e) * (u - r) / (f - r) + e && (s = !s), c = e, f = r; return s }, t.polygonHull = function (t) { if ((e = t.length) < 3) return null; var n, e, r = new Array(e), i = new Array(e); for (n = 0; n < e; ++n)r[n] = [+t[n][0], +t[n][1], n]; for (r.sort(Hp), n = 0; n < e; ++n)i[n] = [r[n][0], -r[n][1]]; var o = Xp(r), a = Xp(i), u = a[0] === o[0], c = a[a.length - 1] === o[o.length - 1], f = []; for (n = o.length - 1; n >= 0; --n)f.push(t[r[o[n]][2]]); for (n = +u; n < a.length - c; ++n)f.push(t[r[a[n]][2]]); return f }, t.polygonLength = function (t) { for (var n, e, r = -1, i = t.length, o = t[i - 1], a = o[0], u = o[1], c = 0; ++r < i;)n = a, e = u, n -= a = (o = t[r])[0], e -= u = o[1], c += Math.hypot(n, e); return c }, t.precisionFixed = sf, t.precisionPrefix = lf, t.precisionRound = hf, t.quadtree = $c, t.quantile = at, t.quantileIndex = ct, t.quantileSorted = ut, t.quantize = function (t, n) { for (var e = new Array(n), r = 0; r < n; ++r)e[r] = t(r / (n - 1)); return e }, t.quickselect = rt, t.radialArea = Zm, t.radialLine = Wm, t.randomBates = Jp, t.randomBernoulli = eg, t.randomBeta = og, t.randomBinomial = ag, t.randomCauchy = cg, t.randomExponential = tg, t.randomGamma = ig, t.randomGeometric = rg, t.randomInt = Wp, t.randomIrwinHall = Qp, t.randomLcg = function (t = Math.random()) { let n = 0 | (0 <= t && t < 1 ? t / lg : Math.abs(t)); return () => (n = 1664525 * n + 1013904223 | 0, lg * (n >>> 0)) }, t.randomLogNormal = Kp, t.randomLogistic = fg, t.randomNormal = Zp, t.randomPareto = ng, t.randomPoisson = sg, t.randomUniform = Vp, t.randomWeibull = ug, t.range = lt, t.rank = function (t, e = n) { if ("function" != typeof t[Symbol.iterator]) throw new TypeError("values is not iterable"); let r = Array.from(t); const i = new Float64Array(r.length); 2 !== e.length && (r = r.map(e), e = n); const o = (t, n) => e(r[t], r[n]); let a, u; return (t = Uint32Array.from(r, ((t, n) => n))).sort(e === n ? (t, n) => O(r[t], r[n]) : I(o)), t.forEach(((t, n) => { const e = o(t, void 0 === a ? t : a); e >= 0 ? ((void 0 === a || e > 0) && (a = t, u = n), i[t] = u) : i[t] = NaN })), i }, t.reduce = function (t, n, e) { if ("function" != typeof n) throw new TypeError("reducer is not a function"); const r = t[Symbol.iterator](); let i, o, a = -1; if (arguments.length < 3) { if (({ done: i, value: e } = r.next()), i) return; ++a } for (; ({ done: i, value: o } = r.next()), !i;)e = n(e, o, ++a, t); return e }, t.reverse = function (t) { if ("function" != typeof t[Symbol.iterator]) throw new TypeError("values is not iterable"); return Array.from(t).reverse() }, t.rgb = Fe, t.ribbon = function () { return Wa() }, t.ribbonArrow = function () { return Wa(Va) }, t.rollup = $, t.rollups = D, t.scaleBand = yg, t.scaleDiverging = function t() { var n = Ng(L_()(mg)); return n.copy = function () { return B_(n, t()) }, dg.apply(n, arguments) }, t.scaleDivergingLog = function t() { var n = Fg(L_()).domain([.1, 1, 10]); return n.copy = function () { return B_(n, t()).base(n.base()) }, dg.apply(n, arguments) }, t.scaleDivergingPow = j_, t.scaleDivergingSqrt = function () { return j_.apply(null, arguments).exponent(.5) }, t.scaleDivergingSymlog = function t() { var n = Ig(L_()); return n.copy = function () { return B_(n, t()).constant(n.constant()) }, dg.apply(n, arguments) }, t.scaleIdentity = function t(n) { var e; function r(t) { return null == t || isNaN(t = +t) ? e : t } return r.invert = r, r.domain = r.range = function (t) { return arguments.length ? (n = Array.from(t, _g), r) : n.slice() }, r.unknown = function (t) { return arguments.length ? (e = t, r) : e }, r.copy = function () { return t(n).unknown(e) }, n = arguments.length ? Array.from(n, _g) : [0, 1], Ng(r) }, t.scaleImplicit = pg, t.scaleLinear = function t() { var n = Sg(); return n.copy = function () { return Tg(n, t()) }, hg.apply(n, arguments), Ng(n) }, t.scaleLog = function t() { const n = Fg(Ag()).domain([1, 10]); return n.copy = () => Tg(n, t()).base(n.base()), hg.apply(n, arguments), n }, t.scaleOrdinal = gg, t.scalePoint = function () { return vg(yg.apply(null, arguments).paddingInner(1)) }, t.scalePow = jg, t.scaleQuantile = function t() { var e, r = [], i = [], o = []; function a() { var t = 0, n = Math.max(1, i.length); for (o = new Array(n - 1); ++t < n;)o[t - 1] = ut(r, t / n); return u } function u(t) { return null == t || isNaN(t = +t) ? e : i[s(o, t)] } return u.invertExtent = function (t) { var n = i.indexOf(t); return n < 0 ? [NaN, NaN] : [n > 0 ? o[n - 1] : r[0], n < o.length ? o[n] : r[r.length - 1]] }, u.domain = function (t) { if (!arguments.length) return r.slice(); r = []; for (let n of t) null == n || isNaN(n = +n) || r.push(n); return r.sort(n), a() }, u.range = function (t) { return arguments.length ? (i = Array.from(t), a()) : i.slice() }, u.unknown = function (t) { return arguments.length ? (e = t, u) : e }, u.quantiles = function () { return o.slice() }, u.copy = function () { return t().domain(r).range(i).unknown(e) }, hg.apply(u, arguments) }, t.scaleQuantize = function t() { var n, e = 0, r = 1, i = 1, o = [.5], a = [0, 1]; function u(t) { return null != t && t <= t ? a[s(o, t, 0, i)] : n } function c() { var t = -1; for (o = new Array(i); ++t < i;)o[t] = ((t + 1) * r - (t - i) * e) / (i + 1); return u } return u.domain = function (t) { return arguments.length ? ([e, r] = t, e = +e, r = +r, c()) : [e, r] }, u.range = function (t) { return arguments.length ? (i = (a = Array.from(t)).length - 1, c()) : a.slice() }, u.invertExtent = function (t) { var n = a.indexOf(t); return n < 0 ? [NaN, NaN] : n < 1 ? [e, o[0]] : n >= i ? [o[i - 1], r] : [o[n - 1], o[n]] }, u.unknown = function (t) { return arguments.length ? (n = t, u) : u }, u.thresholds = function () { return o.slice() }, u.copy = function () { return t().domain([e, r]).range(a).unknown(n) }, hg.apply(Ng(u), arguments) }, t.scaleRadial = function t() { var n, e = Sg(), r = [0, 1], i = !1; function o(t) { var r = function (t) { return Math.sign(t) * Math.sqrt(Math.abs(t)) }(e(t)); return isNaN(r) ? n : i ? Math.round(r) : r } return o.invert = function (t) { return e.invert(Hg(t)) }, o.domain = function (t) { return arguments.length ? (e.domain(t), o) : e.domain() }, o.range = function (t) { return arguments.length ? (e.range((r = Array.from(t, _g)).map(Hg)), o) : r.slice() }, o.rangeRound = function (t) { return o.range(t).round(!0) }, o.round = function (t) { return arguments.length ? (i = !!t, o) : i }, o.clamp = function (t) { return arguments.length ? (e.clamp(t), o) : e.clamp() }, o.unknown = function (t) { return arguments.length ? (n = t, o) : n }, o.copy = function () { return t(e.domain(), r).round(i).clamp(e.clamp()).unknown(n) }, hg.apply(o, arguments), Ng(o) }, t.scaleSequential = function t() { var n = Ng(O_()(mg)); return n.copy = function () { return B_(n, t()) }, dg.apply(n, arguments) }, t.scaleSequentialLog = function t() { var n = Fg(O_()).domain([1, 10]); return n.copy = function () { return B_(n, t()).base(n.base()) }, dg.apply(n, arguments) }, t.scaleSequentialPow = Y_, t.scaleSequentialQuantile = function t() { var e = [], r = mg; function i(t) { if (null != t && !isNaN(t = +t)) return r((s(e, t, 1) - 1) / (e.length - 1)) } return i.domain = function (t) { if (!arguments.length) return e.slice(); e = []; for (let n of t) null == n || isNaN(n = +n) || e.push(n); return e.sort(n), i }, i.interpolator = function (t) { return arguments.length ? (r = t, i) : r }, i.range = function () { return e.map(((t, n) => r(n / (e.length - 1)))) }, i.quantiles = function (t) { return Array.from({ length: t + 1 }, ((n, r) => at(e, r / t))) }, i.copy = function () { return t(r).domain(e) }, dg.apply(i, arguments) }, t.scaleSequentialSqrt = function () { return Y_.apply(null, arguments).exponent(.5) }, t.scaleSequentialSymlog = function t() { var n = Ig(O_()); return n.copy = function () { return B_(n, t()).constant(n.constant()) }, dg.apply(n, arguments) }, t.scaleSqrt = function () { return jg.apply(null, arguments).exponent(.5) }, t.scaleSymlog = function t() { var n = Ig(Ag()); return n.copy = function () { return Tg(n, t()).constant(n.constant()) }, hg.apply(n, arguments) }, t.scaleThreshold = function t() { var n, e = [.5], r = [0, 1], i = 1; function o(t) { return null != t && t <= t ? r[s(e, t, 0, i)] : n } return o.domain = function (t) { return arguments.length ? (e = Array.from(t), i = Math.min(e.length, r.length - 1), o) : e.slice() }, o.range = function (t) { return arguments.length ? (r = Array.from(t), i = Math.min(e.length, r.length - 1), o) : r.slice() }, o.invertExtent = function (t) { var n = r.indexOf(t); return [e[n - 1], e[n]] }, o.unknown = function (t) { return arguments.length ? (n = t, o) : n }, o.copy = function () { return t().domain(e).range(r).unknown(n) }, hg.apply(o, arguments) }, t.scaleTime = function () { return hg.apply(I_(uv, cv, tv, Zy, xy, py, sy, ay, iy, t.timeFormat).domain([new Date(2e3, 0, 1), new Date(2e3, 0, 2)]), arguments) }, t.scaleUtc = function () { return hg.apply(I_(ov, av, ev, Qy, Fy, yy, hy, cy, iy, t.utcFormat).domain([Date.UTC(2e3, 0, 1), Date.UTC(2e3, 0, 2)]), arguments) }, t.scan = function (t, n) { const e = ht(t, n); return e < 0 ? void 0 : e }, t.schemeAccent = G_, t.schemeBlues = Hb, t.schemeBrBG = rb, t.schemeBuGn = xb, t.schemeBuPu = Mb, t.schemeCategory10 = X_, t.schemeDark2 = V_, t.schemeGnBu = Ab, t.schemeGreens = Gb, t.schemeGreys = Wb, t.schemeOrRd = Eb, t.schemeOranges = nm, t.schemePRGn = ob, t.schemePaired = W_, t.schemePastel1 = Z_, t.schemePastel2 = K_, t.schemePiYG = ub, t.schemePuBu = Pb, t.schemePuBuGn = kb, t.schemePuOr = fb, t.schemePuRd = $b, t.schemePurples = Kb, t.schemeRdBu = lb, t.schemeRdGy = db, t.schemeRdPu = Rb, t.schemeRdYlBu = gb, t.schemeRdYlGn = vb, t.schemeReds = Jb, t.schemeSet1 = Q_, t.schemeSet2 = J_, t.schemeSet3 = tb, t.schemeSpectral = bb, t.schemeTableau10 = nb, t.schemeYlGn = Ib, t.schemeYlGnBu = qb, t.schemeYlOrBr = Bb, t.schemeYlOrRd = Lb, t.select = Zn, t.selectAll = function (t) { return "string" == typeof t ? new Vn([document.querySelectorAll(t)], [document.documentElement]) : new Vn([Ht(t)], Gn) }, t.selection = Wn, t.selector = jt, t.selectorAll = Gt, t.shuffle = dt, t.shuffler = pt, t.some = function (t, n) { if ("function" != typeof n) throw new TypeError("test is not a function"); let e = -1; for (const r of t) if (n(r, ++e, t)) return !0; return !1 }, t.sort = U, t.stack = function () { var t = gm([]), n = hw, e = lw, r = dw; function i(i) { var o, a, u = Array.from(t.apply(this, arguments), pw), c = u.length, f = -1; for (const t of i) for (o = 0, ++f; o < c; ++o)(u[o][f] = [0, +r(t, u[o].key, f, i)]).data = t; for (o = 0, a = Fm(n(u)); o < c; ++o)u[a[o]].index = o; return e(u, a), u } return i.keys = function (n) { return arguments.length ? (t = "function" == typeof n ? n : gm(Array.from(n)), i) : t }, i.value = function (t) { return arguments.length ? (r = "function" == typeof t ? t : gm(+t), i) : r }, i.order = function (t) { return arguments.length ? (n = null == t ? hw : "function" == typeof t ? t : gm(Array.from(t)), i) : n }, i.offset = function (t) { return arguments.length ? (e = null == t ? lw : t, i) : e }, i }, t.stackOffsetDiverging = function (t, n) { if ((u = t.length) > 0) for (var e, r, i, o, a, u, c = 0, f = t[n[0]].length; c < f; ++c)for (o = a = 0, e = 0; e < u; ++e)(i = (r = t[n[e]][c])[1] - r[0]) > 0 ? (r[0] = o, r[1] = o += i) : i < 0 ? (r[1] = a, r[0] = a += i) : (r[0] = 0, r[1] = i) }, t.stackOffsetExpand = function (t, n) { if ((r = t.length) > 0) { for (var e, r, i, o = 0, a = t[0].length; o < a; ++o) { for (i = e = 0; e < r; ++e)i += t[e][o][1] || 0; if (i) for (e = 0; e < r; ++e)t[e][o][1] /= i } lw(t, n) } }, t.stackOffsetNone = lw, t.stackOffsetSilhouette = function (t, n) { if ((e = t.length) > 0) { for (var e, r = 0, i = t[n[0]], o = i.length; r < o; ++r) { for (var a = 0, u = 0; a < e; ++a)u += t[a][r][1] || 0; i[r][1] += i[r][0] = -u / 2 } lw(t, n) } }, t.stackOffsetWiggle = function (t, n) { if ((i = t.length) > 0 && (r = (e = t[n[0]]).length) > 0) { for (var e, r, i, o = 0, a = 1; a < r; ++a) { for (var u = 0, c = 0, f = 0; u < i; ++u) { for (var s = t[n[u]], l = s[a][1] || 0, h = (l - (s[a - 1][1] || 0)) / 2, d = 0; d < u; ++d) { var p = t[n[d]]; h += (p[a][1] || 0) - (p[a - 1][1] || 0) } c += l, f += h * l } e[a - 1][1] += e[a - 1][0] = o, c && (o -= f / c) } e[a - 1][1] += e[a - 1][0] = o, lw(t, n) } }, t.stackOrderAppearance = gw, t.stackOrderAscending = vw, t.stackOrderDescending = function (t) { return vw(t).reverse() }, t.stackOrderInsideOut = function (t) { var n, e, r = t.length, i = t.map(_w), o = gw(t), a = 0, u = 0, c = [], f = []; for (n = 0; n < r; ++n)e = o[n], a < u ? (a += i[e], c.push(e)) : (u += i[e], f.push(e)); return f.reverse().concat(c) }, t.stackOrderNone = hw, t.stackOrderReverse = function (t) { return hw(t).reverse() }, t.stratify = function () { var t, n = kp, e = Cp; function r(r) { var i, o, a, u, c, f, s, l, h = Array.from(r), d = n, p = e, g = new Map; if (null != t) { const n = h.map(((n, e) => function (t) { t = `${t}`; let n = t.length; zp(t, n - 1) && !zp(t, n - 2) && (t = t.slice(0, -1)); return "/" === t[0] ? t : `/${t}` }(t(n, e, r)))), e = n.map(Pp), i = new Set(n).add(""); for (const t of e) i.has(t) || (i.add(t), n.push(t), e.push(Pp(t)), h.push(Np)); d = (t, e) => n[e], p = (t, n) => e[n] } for (a = 0, i = h.length; a < i; ++a)o = h[a], f = h[a] = new Qd(o), null != (s = d(o, a, r)) && (s += "") && (l = f.id = s, g.set(l, g.has(l) ? Ep : f)), null != (s = p(o, a, r)) && (s += "") && (f.parent = s); for (a = 0; a < i; ++a)if (s = (f = h[a]).parent) { if (!(c = g.get(s))) throw new Error("missing: " + s); if (c === Ep) throw new Error("ambiguous: " + s); c.children ? c.children.push(f) : c.children = [f], f.parent = c } else { if (u) throw new Error("multiple roots"); u = f } if (!u) throw new Error("no root"); if (null != t) { for (; u.data === Np && 1 === u.children.length;)u = u.children[0], --i; for (let t = h.length - 1; t >= 0 && (f = h[t]).data === Np; --t)f.data = null } if (u.parent = Sp, u.eachBefore((function (t) { t.depth = t.parent.depth + 1, --i })).eachBefore(Kd), u.parent = null, i > 0) throw new Error("cycle"); return u } return r.id = function (t) { return arguments.length ? (n = Jd(t), r) : n }, r.parentId = function (t) { return arguments.length ? (e = Jd(t), r) : e }, r.path = function (n) { return arguments.length ? (t = Jd(n), r) : t }, r }, t.style = _n, t.subset = function (t, n) { return _t(n, t) }, t.sum = function (t, n) { let e = 0; if (void 0 === n) for (let n of t) (n = +n) && (e += n); else { let r = -1; for (let i of t) (i = +n(i, ++r, t)) && (e += i) } return e }, t.superset = _t, t.svg = Nc, t.symbol = function (t, n) { let e = null, r = Nm(i); function i() { let i; if (e || (e = i = r()), t.apply(this, arguments).draw(e, +n.apply(this, arguments)), i) return e = null, i + "" || null } return t = "function" == typeof t ? t : gm(t || cx), n = "function" == typeof n ? n : gm(void 0 === n ? 64 : +n), i.type = function (n) { return arguments.length ? (t = "function" == typeof n ? n : gm(n), i) : t }, i.size = function (t) { return arguments.length ? (n = "function" == typeof t ? t : gm(+t), i) : n }, i.context = function (t) { return arguments.length ? (e = null == t ? null : t, i) : e }, i }, t.symbolAsterisk = ux, t.symbolCircle = cx, t.symbolCross = fx, t.symbolDiamond = hx, t.symbolDiamond2 = dx, t.symbolPlus = px, t.symbolSquare = gx, t.symbolSquare2 = yx, t.symbolStar = mx, t.symbolTimes = Cx, t.symbolTriangle = wx, t.symbolTriangle2 = Tx, t.symbolWye = kx, t.symbolX = Cx, t.symbols = Px, t.symbolsFill = Px, t.symbolsStroke = zx, t.text = mc, t.thresholdFreedmanDiaconis = function (t, n, e) { const r = v(t), i = at(t, .75) - at(t, .25); return r && i ? Math.ceil((e - n) / (2 * i * Math.pow(r, -1 / 3))) : 1 }, t.thresholdScott = function (t, n, e) { const r = v(t), i = w(t); return r && i ? Math.ceil((e - n) * Math.cbrt(r) / (3.49 * i)) : 1 }, t.thresholdSturges = K, t.tickFormat = Eg, t.tickIncrement = V, t.tickStep = W, t.ticks = G, t.timeDay = py, t.timeDays = gy, t.timeFormatDefaultLocale = P_, t.timeFormatLocale = hv, t.timeFriday = Sy, t.timeFridays = $y, t.timeHour = sy, t.timeHours = ly, t.timeInterval = Vg, t.timeMillisecond = Wg, t.timeMilliseconds = Zg, t.timeMinute = ay, t.timeMinutes = uy, t.timeMonday = wy, t.timeMondays = ky, t.timeMonth = Zy, t.timeMonths = Ky, t.timeSaturday = Ey, t.timeSaturdays = Dy, t.timeSecond = iy, t.timeSeconds = oy, t.timeSunday = xy, t.timeSundays = Ny, t.timeThursday = Ay, t.timeThursdays = zy, t.timeTickInterval = cv, t.timeTicks = uv, t.timeTuesday = My, t.timeTuesdays = Cy, t.timeWednesday = Ty, t.timeWednesdays = Py, t.timeWeek = xy, t.timeWeeks = Ny, t.timeYear = tv, t.timeYears = nv, t.timeout = $i, t.timer = Ni, t.timerFlush = ki, t.transition = go, t.transpose = gt, t.tree = function () { var t = $p, n = 1, e = 1, r = null; function i(i) { var c = function (t) { for (var n, e, r, i, o, a = new Up(t, 0), u = [a]; n = u.pop();)if (r = n._.children) for (n.children = new Array(o = r.length), i = o - 1; i >= 0; --i)u.push(e = n.children[i] = new Up(r[i], i)), e.parent = n; return (a.parent = new Up(null, 0)).children = [a], a }(i); if (c.eachAfter(o), c.parent.m = -c.z, c.eachBefore(a), r) i.eachBefore(u); else { var f = i, s = i, l = i; i.eachBefore((function (t) { t.x < f.x && (f = t), t.x > s.x && (s = t), t.depth > l.depth && (l = t) })); var h = f === s ? 1 : t(f, s) / 2, d = h - f.x, p = n / (s.x + h + d), g = e / (l.depth || 1); i.eachBefore((function (t) { t.x = (t.x + d) * p, t.y = t.depth * g })) } return i } function o(n) { var e = n.children, r = n.parent.children, i = n.i ? r[n.i - 1] : null; if (e) { !function (t) { for (var n, e = 0, r = 0, i = t.children, o = i.length; --o >= 0;)(n = i[o]).z += e, n.m += e, e += n.s + (r += n.c) }(n); var o = (e[0].z + e[e.length - 1].z) / 2; i ? (n.z = i.z + t(n._, i._), n.m = n.z - o) : n.z = o } else i && (n.z = i.z + t(n._, i._)); n.parent.A = function (n, e, r) { if (e) { for (var i, o = n, a = n, u = e, c = o.parent.children[0], f = o.m, s = a.m, l = u.m, h = c.m; u = Rp(u), o = Dp(o), u && o;)c = Dp(c), (a = Rp(a)).a = n, (i = u.z + l - o.z - f + t(u._, o._)) > 0 && (Fp(qp(u, n, r), n, i), f += i, s += i), l += u.m, f += o.m, h += c.m, s += a.m; u && !Rp(a) && (a.t = u, a.m += l - s), o && !Dp(c) && (c.t = o, c.m += f - h, r = n) } return r }(n, i, n.parent.A || r[0]) } function a(t) { t._.x = t.z + t.parent.m, t.m += t.parent.m } function u(t) { t.x *= n, t.y = t.depth * e } return i.separation = function (n) { return arguments.length ? (t = n, i) : t }, i.size = function (t) { return arguments.length ? (r = !1, n = +t[0], e = +t[1], i) : r ? null : [n, e] }, i.nodeSize = function (t) { return arguments.length ? (r = !0, n = +t[0], e = +t[1], i) : r ? [n, e] : null }, i }, t.treemap = function () { var t = Yp, n = !1, e = 1, r = 1, i = [0], o = np, a = np, u = np, c = np, f = np; function s(t) { return t.x0 = t.y0 = 0, t.x1 = e, t.y1 = r, t.eachBefore(l), i = [0], n && t.eachBefore(Tp), t } function l(n) { var e = i[n.depth], r = n.x0 + e, s = n.y0 + e, l = n.x1 - e, h = n.y1 - e; l < r && (r = l = (r + l) / 2), h < s && (s = h = (s + h) / 2), n.x0 = r, n.y0 = s, n.x1 = l, n.y1 = h, n.children && (e = i[n.depth + 1] = o(n) / 2, r += f(n) - e, s += a(n) - e, (l -= u(n) - e) < r && (r = l = (r + l) / 2), (h -= c(n) - e) < s && (s = h = (s + h) / 2), t(n, r, s, l, h)) } return s.round = function (t) { return arguments.length ? (n = !!t, s) : n }, s.size = function (t) { return arguments.length ? (e = +t[0], r = +t[1], s) : [e, r] }, s.tile = function (n) { return arguments.length ? (t = tp(n), s) : t }, s.padding = function (t) { return arguments.length ? s.paddingInner(t).paddingOuter(t) : s.paddingInner() }, s.paddingInner = function (t) { return arguments.length ? (o = "function" == typeof t ? t : ep(+t), s) : o }, s.paddingOuter = function (t) { return arguments.length ? s.paddingTop(t).paddingRight(t).paddingBottom(t).paddingLeft(t) : s.paddingTop() }, s.paddingTop = function (t) { return arguments.length ? (a = "function" == typeof t ? t : ep(+t), s) : a }, s.paddingRight = function (t) { return arguments.length ? (u = "function" == typeof t ? t : ep(+t), s) : u }, s.paddingBottom = function (t) { return arguments.length ? (c = "function" == typeof t ? t : ep(+t), s) : c }, s.paddingLeft = function (t) { return arguments.length ? (f = "function" == typeof t ? t : ep(+t), s) : f }, s }, t.treemapBinary = function (t, n, e, r, i) { var o, a, u = t.children, c = u.length, f = new Array(c + 1); for (f[0] = a = o = 0; o < c; ++o)f[o + 1] = a += u[o].value; !function t(n, e, r, i, o, a, c) { if (n >= e - 1) { var s = u[n]; return s.x0 = i, s.y0 = o, s.x1 = a, void (s.y1 = c) } var l = f[n], h = r / 2 + l, d = n + 1, p = e - 1; for (; d < p;) { var g = d + p >>> 1; f[g] < h ? d = g + 1 : p = g } h - f[d - 1] < f[d] - h && n + 1 < d && --d; var y = f[d] - l, v = r - y; if (a - i > c - o) { var _ = r ? (i * v + a * y) / r : a; t(n, d, y, i, o, _, c), t(d, e, v, _, o, a, c) } else { var b = r ? (o * v + c * y) / r : c; t(n, d, y, i, o, a, b), t(d, e, v, i, b, a, c) } }(0, c, t.value, n, e, r, i) }, t.treemapDice = Ap, t.treemapResquarify = Lp, t.treemapSlice = Ip, t.treemapSliceDice = function (t, n, e, r, i) { (1 & t.depth ? Ip : Ap)(t, n, e, r, i) }, t.treemapSquarify = Yp, t.tsv = Mc, t.tsvFormat = lc, t.tsvFormatBody = hc, t.tsvFormatRow = pc, t.tsvFormatRows = dc, t.tsvFormatValue = gc, t.tsvParse = fc, t.tsvParseRows = sc, t.union = function (...t) { const n = new InternSet; for (const e of t) for (const t of e) n.add(t); return n }, t.unixDay = _y, t.unixDays = by, t.utcDay = yy, t.utcDays = vy, t.utcFriday = By, t.utcFridays = Vy, t.utcHour = hy, t.utcHours = dy, t.utcMillisecond = Wg, t.utcMilliseconds = Zg, t.utcMinute = cy, t.utcMinutes = fy, t.utcMonday = qy, t.utcMondays = jy, t.utcMonth = Qy, t.utcMonths = Jy, t.utcSaturday = Yy, t.utcSaturdays = Wy, t.utcSecond = iy, t.utcSeconds = oy, t.utcSunday = Fy, t.utcSundays = Ly, t.utcThursday = Oy, t.utcThursdays = Gy, t.utcTickInterval = av, t.utcTicks = ov, t.utcTuesday = Uy, t.utcTuesdays = Hy, t.utcWednesday = Iy, t.utcWednesdays = Xy, t.utcWeek = Fy, t.utcWeeks = Ly, t.utcYear = ev, t.utcYears = rv, t.variance = x, t.version = "7.8.5", t.window = pn, t.xml = Sc, t.zip = function () { return gt(arguments) }, t.zoom = function () { var t, n, e, r = Sw, i = Ew, o = Pw, a = kw, u = Cw, c = [0, 1 / 0], f = [[-1 / 0, -1 / 0], [1 / 0, 1 / 0]], s = 250, l = ri, h = $t("start", "zoom", "end"), d = 500, p = 150, g = 0, y = 10; function v(t) { t.property("__zoom", Nw).on("wheel.zoom", T, { passive: !1 }).on("mousedown.zoom", A).on("dblclick.zoom", S).filter(u).on("touchstart.zoom", E).on("touchmove.zoom", N).on("touchend.zoom touchcancel.zoom", k).style("-webkit-tap-highlight-color", "rgba(0,0,0,0)") } function _(t, n) { return (n = Math.max(c[0], Math.min(c[1], n))) === t.k ? t : new xw(n, t.x, t.y) } function b(t, n, e) { var r = n[0] - e[0] * t.k, i = n[1] - e[1] * t.k; return r === t.x && i === t.y ? t : new xw(t.k, r, i) } function m(t) { return [(+t[0][0] + +t[1][0]) / 2, (+t[0][1] + +t[1][1]) / 2] } function x(t, n, e, r) { t.on("start.zoom", (function () { w(this, arguments).event(r).start() })).on("interrupt.zoom end.zoom", (function () { w(this, arguments).event(r).end() })).tween("zoom", (function () { var t = this, o = arguments, a = w(t, o).event(r), u = i.apply(t, o), c = null == e ? m(u) : "function" == typeof e ? e.apply(t, o) : e, f = Math.max(u[1][0] - u[0][0], u[1][1] - u[0][1]), s = t.__zoom, h = "function" == typeof n ? n.apply(t, o) : n, d = l(s.invert(c).concat(f / s.k), h.invert(c).concat(f / h.k)); return function (t) { if (1 === t) t = h; else { var n = d(t), e = f / n[2]; t = new xw(e, c[0] - n[0] * e, c[1] - n[1] * e) } a.zoom(null, t) } })) } function w(t, n, e) { return !e && t.__zooming || new M(t, n) } function M(t, n) { this.that = t, this.args = n, this.active = 0, this.sourceEvent = null, this.extent = i.apply(t, n), this.taps = 0 } function T(t, ...n) { if (r.apply(this, arguments)) { var e = w(this, n).event(t), i = this.__zoom, u = Math.max(c[0], Math.min(c[1], i.k * Math.pow(2, a.apply(this, arguments)))), s = ne(t); if (e.wheel) e.mouse[0][0] === s[0] && e.mouse[0][1] === s[1] || (e.mouse[1] = i.invert(e.mouse[0] = s)), clearTimeout(e.wheel); else { if (i.k === u) return; e.mouse = [s, i.invert(s)], Gi(this), e.start() } Aw(t), e.wheel = setTimeout((function () { e.wheel = null, e.end() }), p), e.zoom("mouse", o(b(_(i, u), e.mouse[0], e.mouse[1]), e.extent, f)) } } function A(t, ...n) { if (!e && r.apply(this, arguments)) { var i = t.currentTarget, a = w(this, n, !0).event(t), u = Zn(t.view).on("mousemove.zoom", (function (t) { if (Aw(t), !a.moved) { var n = t.clientX - s, e = t.clientY - l; a.moved = n * n + e * e > g } a.event(t).zoom("mouse", o(b(a.that.__zoom, a.mouse[0] = ne(t, i), a.mouse[1]), a.extent, f)) }), !0).on("mouseup.zoom", (function (t) { u.on("mousemove.zoom mouseup.zoom", null), ue(t.view, a.moved), Aw(t), a.event(t).end() }), !0), c = ne(t, i), s = t.clientX, l = t.clientY; ae(t.view), Tw(t), a.mouse = [c, this.__zoom.invert(c)], Gi(this), a.start() } } function S(t, ...n) { if (r.apply(this, arguments)) { var e = this.__zoom, a = ne(t.changedTouches ? t.changedTouches[0] : t, this), u = e.invert(a), c = e.k * (t.shiftKey ? .5 : 2), l = o(b(_(e, c), a, u), i.apply(this, n), f); Aw(t), s > 0 ? Zn(this).transition().duration(s).call(x, l, a, t) : Zn(this).call(v.transform, l, a, t) } } function E(e, ...i) { if (r.apply(this, arguments)) { var o, a, u, c, f = e.touches, s = f.length, l = w(this, i, e.changedTouches.length === s).event(e); for (Tw(e), a = 0; a < s; ++a)c = [c = ne(u = f[a], this), this.__zoom.invert(c), u.identifier], l.touch0 ? l.touch1 || l.touch0[2] === c[2] || (l.touch1 = c, l.taps = 0) : (l.touch0 = c, o = !0, l.taps = 1 + !!t); t && (t = clearTimeout(t)), o && (l.taps < 2 && (n = c[0], t = setTimeout((function () { t = null }), d)), Gi(this), l.start()) } } function N(t, ...n) { if (this.__zooming) { var e, r, i, a, u = w(this, n).event(t), c = t.changedTouches, s = c.length; for (Aw(t), e = 0; e < s; ++e)i = ne(r = c[e], this), u.touch0 && u.touch0[2] === r.identifier ? u.touch0[0] = i : u.touch1 && u.touch1[2] === r.identifier && (u.touch1[0] = i); if (r = u.that.__zoom, u.touch1) { var l = u.touch0[0], h = u.touch0[1], d = u.touch1[0], p = u.touch1[1], g = (g = d[0] - l[0]) * g + (g = d[1] - l[1]) * g, y = (y = p[0] - h[0]) * y + (y = p[1] - h[1]) * y; r = _(r, Math.sqrt(g / y)), i = [(l[0] + d[0]) / 2, (l[1] + d[1]) / 2], a = [(h[0] + p[0]) / 2, (h[1] + p[1]) / 2] } else { if (!u.touch0) return; i = u.touch0[0], a = u.touch0[1] } u.zoom("touch", o(b(r, i, a), u.extent, f)) } } function k(t, ...r) { if (this.__zooming) { var i, o, a = w(this, r).event(t), u = t.changedTouches, c = u.length; for (Tw(t), e && clearTimeout(e), e = setTimeout((function () { e = null }), d), i = 0; i < c; ++i)o = u[i], a.touch0 && a.touch0[2] === o.identifier ? delete a.touch0 : a.touch1 && a.touch1[2] === o.identifier && delete a.touch1; if (a.touch1 && !a.touch0 && (a.touch0 = a.touch1, delete a.touch1), a.touch0) a.touch0[1] = this.__zoom.invert(a.touch0[0]); else if (a.end(), 2 === a.taps && (o = ne(o, this), Math.hypot(n[0] - o[0], n[1] - o[1]) < y)) { var f = Zn(this).on("dblclick.zoom"); f && f.apply(this, arguments) } } } return v.transform = function (t, n, e, r) { var i = t.selection ? t.selection() : t; i.property("__zoom", Nw), t !== i ? x(t, n, e, r) : i.interrupt().each((function () { w(this, arguments).event(r).start().zoom(null, "function" == typeof n ? n.apply(this, arguments) : n).end() })) }, v.scaleBy = function (t, n, e, r) { v.scaleTo(t, (function () { return this.__zoom.k * ("function" == typeof n ? n.apply(this, arguments) : n) }), e, r) }, v.scaleTo = function (t, n, e, r) { v.transform(t, (function () { var t = i.apply(this, arguments), r = this.__zoom, a = null == e ? m(t) : "function" == typeof e ? e.apply(this, arguments) : e, u = r.invert(a), c = "function" == typeof n ? n.apply(this, arguments) : n; return o(b(_(r, c), a, u), t, f) }), e, r) }, v.translateBy = function (t, n, e, r) { v.transform(t, (function () { return o(this.__zoom.translate("function" == typeof n ? n.apply(this, arguments) : n, "function" == typeof e ? e.apply(this, arguments) : e), i.apply(this, arguments), f) }), null, r) }, v.translateTo = function (t, n, e, r, a) { v.transform(t, (function () { var t = i.apply(this, arguments), a = this.__zoom, u = null == r ? m(t) : "function" == typeof r ? r.apply(this, arguments) : r; return o(ww.translate(u[0], u[1]).scale(a.k).translate("function" == typeof n ? -n.apply(this, arguments) : -n, "function" == typeof e ? -e.apply(this, arguments) : -e), t, f) }), r, a) }, M.prototype = { event: function (t) { return t && (this.sourceEvent = t), this }, start: function () { return 1 == ++this.active && (this.that.__zooming = this, this.emit("start")), this }, zoom: function (t, n) { return this.mouse && "mouse" !== t && (this.mouse[1] = n.invert(this.mouse[0])), this.touch0 && "touch" !== t && (this.touch0[1] = n.invert(this.touch0[0])), this.touch1 && "touch" !== t && (this.touch1[1] = n.invert(this.touch1[0])), this.that.__zoom = n, this.emit("zoom"), this }, end: function () { return 0 == --this.active && (delete this.that.__zooming, this.emit("end")), this }, emit: function (t) { var n = Zn(this.that).datum(); h.call(t, this.that, new mw(t, { sourceEvent: this.sourceEvent, target: v, type: t, transform: this.that.__zoom, dispatch: h }), n) } }, v.wheelDelta = function (t) { return arguments.length ? (a = "function" == typeof t ? t : bw(+t), v) : a }, v.filter = function (t) { return arguments.length ? (r = "function" == typeof t ? t : bw(!!t), v) : r }, v.touchable = function (t) { return arguments.length ? (u = "function" == typeof t ? t : bw(!!t), v) : u }, v.extent = function (t) { return arguments.length ? (i = "function" == typeof t ? t : bw([[+t[0][0], +t[0][1]], [+t[1][0], +t[1][1]]]), v) : i }, v.scaleExtent = function (t) { return arguments.length ? (c[0] = +t[0], c[1] = +t[1], v) : [c[0], c[1]] }, v.translateExtent = function (t) { return arguments.length ? (f[0][0] = +t[0][0], f[1][0] = +t[1][0], f[0][1] = +t[0][1], f[1][1] = +t[1][1], v) : [[f[0][0], f[0][1]], [f[1][0], f[1][1]]] }, v.constrain = function (t) { return arguments.length ? (o = t, v) : o }, v.duration = function (t) { return arguments.length ? (s = +t, v) : s }, v.interpolate = function (t) { return arguments.length ? (l = t, v) : l }, v.on = function () { var t = h.on.apply(h, arguments); return t === h ? v : t }, v.clickDistance = function (t) { return arguments.length ? (g = (t = +t) * t, v) : Math.sqrt(g) }, v.tapDistance = function (t) { return arguments.length ? (y = +t, v) : y }, v }, t.zoomIdentity = ww, t.zoomTransform = Mw }));