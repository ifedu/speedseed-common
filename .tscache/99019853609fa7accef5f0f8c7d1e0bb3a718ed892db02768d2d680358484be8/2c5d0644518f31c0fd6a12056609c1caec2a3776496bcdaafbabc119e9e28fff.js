(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
        typeof define === 'function' && define.amd ? define(['exports'], factory) :
            (factory((global.async = global.async || {})));
}(this, (function (exports) {
    'use strict';
    function slice(arrayLike, start) {
        start = start | 0;
        var newLen = Math.max(arrayLike.length - start, 0);
        var newArr = Array(newLen);
        for (var idx = 0; idx < newLen; idx++) {
            newArr[idx] = arrayLike[start + idx];
        }
        return newArr;
    }
    var initialParams = function (fn) {
        return function () {
            var args = slice(arguments);
            var callback = args.pop();
            fn.call(this, args, callback);
        };
    };
    /**
     * Checks if `value` is the
     * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
     * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(_.noop);
     * // => true
     *
     * _.isObject(null);
     * // => false
     */
    function isObject(value) {
        var type = typeof value;
        return value != null && (type == 'object' || type == 'function');
    }
    var hasSetImmediate = typeof setImmediate === 'function' && setImmediate;
    var hasNextTick = typeof process === 'object' && typeof process.nextTick === 'function';
    function fallback(fn) {
        setTimeout(fn, 0);
    }
    function wrap(defer) {
        return function (fn /*, ...args*/) {
            var args = slice(arguments, 1);
            defer(function () {
                fn.apply(null, args);
            });
        };
    }
    var _defer;
    if (hasSetImmediate) {
        _defer = setImmediate;
    }
    else if (hasNextTick) {
        _defer = process.nextTick;
    }
    else {
        _defer = fallback;
    }
    var setImmediate$1 = wrap(_defer);
    /**
     * Take a sync function and make it async, passing its return value to a
     * callback. This is useful for plugging sync functions into a waterfall,
     * series, or other async functions. Any arguments passed to the generated
     * function will be passed to the wrapped function (except for the final
     * callback argument). Errors thrown will be passed to the callback.
     *
     * If the function passed to `asyncify` returns a Promise, that promises's
     * resolved/rejected state will be used to call the callback, rather than simply
     * the synchronous return value.
     *
     * This also means you can asyncify ES2017 `async` functions.
     *
     * @name asyncify
     * @static
     * @memberOf module:Utils
     * @method
     * @alias wrapSync
     * @category Util
     * @param {Function} func - The synchronous function, or Promise-returning
     * function to convert to an {@link AsyncFunction}.
     * @returns {AsyncFunction} An asynchronous wrapper of the `func`. To be
     * invoked with `(args..., callback)`.
     * @example
     *
     * // passing a regular synchronous function
     * async.waterfall([
     *     async.apply(fs.readFile, filename, "utf8"),
     *     async.asyncify(JSON.parse),
     *     function (data, next) {
     *         // data is the result of parsing the text.
     *         // If there was a parsing error, it would have been caught.
     *     }
     * ], callback);
     *
     * // passing a function returning a promise
     * async.waterfall([
     *     async.apply(fs.readFile, filename, "utf8"),
     *     async.asyncify(function (contents) {
     *         return db.model.create(contents);
     *     }),
     *     function (model, next) {
     *         // `model` is the instantiated model object.
     *         // If there was an error, this function would be skipped.
     *     }
     * ], callback);
     *
     * // es2017 example, though `asyncify` is not needed if your JS environment
     * // supports async functions out of the box
     * var q = async.queue(async.asyncify(async function(file) {
     *     var intermediateStep = await processFile(file);
     *     return await somePromise(intermediateStep)
     * }));
     *
     * q.push(files);
     */
    function asyncify(func) {
        return initialParams(function (args, callback) {
            var result;
            try {
                result = func.apply(this, args);
            }
            catch (e) {
                return callback(e);
            }
            // if result is Promise object
            if (isObject(result) && typeof result.then === 'function') {
                result.then(function (value) {
                    invokeCallback(callback, null, value);
                }, function (err) {
                    invokeCallback(callback, err.message ? err : new Error(err));
                });
            }
            else {
                callback(null, result);
            }
        });
    }
    function invokeCallback(callback, error, value) {
        try {
            callback(error, value);
        }
        catch (e) {
            setImmediate$1(rethrow, e);
        }
    }
    function rethrow(error) {
        throw error;
    }
    var supportsSymbol = typeof Symbol === 'function';
    function isAsync(fn) {
        return supportsSymbol && fn[Symbol.toStringTag] === 'AsyncFunction';
    }
    function wrapAsync(asyncFn) {
        return isAsync(asyncFn) ? asyncify(asyncFn) : asyncFn;
    }
    function applyEach$1(eachfn) {
        return function (fns /*, ...args*/) {
            var args = slice(arguments, 1);
            var go = initialParams(function (args, callback) {
                var that = this;
                return eachfn(fns, function (fn, cb) {
                    wrapAsync(fn).apply(that, args.concat(cb));
                }, callback);
            });
            if (args.length) {
                return go.apply(this, args);
            }
            else {
                return go;
            }
        };
    }
    /** Detect free variable `global` from Node.js. */
    var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;
    /** Detect free variable `self`. */
    var freeSelf = typeof self == 'object' && self && self.Object === Object && self;
    /** Used as a reference to the global object. */
    var root = freeGlobal || freeSelf || Function('return this')();
    /** Built-in value references. */
    var Symbol$1 = root.Symbol;
    /** Used for built-in method references. */
    var objectProto = Object.prototype;
    /** Used to check objects for own properties. */
    var hasOwnProperty = objectProto.hasOwnProperty;
    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var nativeObjectToString = objectProto.toString;
    /** Built-in value references. */
    var symToStringTag$1 = Symbol$1 ? Symbol$1.toStringTag : undefined;
    /**
     * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the raw `toStringTag`.
     */
    function getRawTag(value) {
        var isOwn = hasOwnProperty.call(value, symToStringTag$1), tag = value[symToStringTag$1];
        try {
            value[symToStringTag$1] = undefined;
            var unmasked = true;
        }
        catch (e) { }
        var result = nativeObjectToString.call(value);
        if (unmasked) {
            if (isOwn) {
                value[symToStringTag$1] = tag;
            }
            else {
                delete value[symToStringTag$1];
            }
        }
        return result;
    }
    /** Used for built-in method references. */
    var objectProto$1 = Object.prototype;
    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var nativeObjectToString$1 = objectProto$1.toString;
    /**
     * Converts `value` to a string using `Object.prototype.toString`.
     *
     * @private
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     */
    function objectToString(value) {
        return nativeObjectToString$1.call(value);
    }
    /** `Object#toString` result references. */
    var nullTag = '[object Null]';
    var undefinedTag = '[object Undefined]';
    /** Built-in value references. */
    var symToStringTag = Symbol$1 ? Symbol$1.toStringTag : undefined;
    /**
     * The base implementation of `getTag` without fallbacks for buggy environments.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */
    function baseGetTag(value) {
        if (value == null) {
            return value === undefined ? undefinedTag : nullTag;
        }
        value = Object(value);
        return (symToStringTag && symToStringTag in value)
            ? getRawTag(value)
            : objectToString(value);
    }
    /** `Object#toString` result references. */
    var asyncTag = '[object AsyncFunction]';
    var funcTag = '[object Function]';
    var genTag = '[object GeneratorFunction]';
    var proxyTag = '[object Proxy]';
    /**
     * Checks if `value` is classified as a `Function` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     *
     * _.isFunction(/abc/);
     * // => false
     */
    function isFunction(value) {
        if (!isObject(value)) {
            return false;
        }
        // The use of `Object#toString` avoids issues with the `typeof` operator
        // in Safari 9 which returns 'object' for typed arrays and other constructors.
        var tag = baseGetTag(value);
        return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
    }
    /** Used as references for various `Number` constants. */
    var MAX_SAFE_INTEGER = 9007199254740991;
    /**
     * Checks if `value` is a valid array-like length.
     *
     * **Note:** This method is loosely based on
     * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
     * @example
     *
     * _.isLength(3);
     * // => true
     *
     * _.isLength(Number.MIN_VALUE);
     * // => false
     *
     * _.isLength(Infinity);
     * // => false
     *
     * _.isLength('3');
     * // => false
     */
    function isLength(value) {
        return typeof value == 'number' &&
            value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    /**
     * Checks if `value` is array-like. A value is considered array-like if it's
     * not a function and has a `value.length` that's an integer greater than or
     * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
     * @example
     *
     * _.isArrayLike([1, 2, 3]);
     * // => true
     *
     * _.isArrayLike(document.body.children);
     * // => true
     *
     * _.isArrayLike('abc');
     * // => true
     *
     * _.isArrayLike(_.noop);
     * // => false
     */
    function isArrayLike(value) {
        return value != null && isLength(value.length) && !isFunction(value);
    }
    // A temporary value used to identify if the loop should be broken.
    // See #1064, #1293
    var breakLoop = {};
    /**
     * This method returns `undefined`.
     *
     * @static
     * @memberOf _
     * @since 2.3.0
     * @category Util
     * @example
     *
     * _.times(2, _.noop);
     * // => [undefined, undefined]
     */
    function noop() {
        // No operation performed.
    }
    function once(fn) {
        return function () {
            if (fn === null)
                return;
            var callFn = fn;
            fn = null;
            callFn.apply(this, arguments);
        };
    }
    var iteratorSymbol = typeof Symbol === 'function' && Symbol.iterator;
    var getIterator = function (coll) {
        return iteratorSymbol && coll[iteratorSymbol] && coll[iteratorSymbol]();
    };
    /**
     * The base implementation of `_.times` without support for iteratee shorthands
     * or max array length checks.
     *
     * @private
     * @param {number} n The number of times to invoke `iteratee`.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the array of results.
     */
    function baseTimes(n, iteratee) {
        var index = -1, result = Array(n);
        while (++index < n) {
            result[index] = iteratee(index);
        }
        return result;
    }
    /**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
        return value != null && typeof value == 'object';
    }
    /** `Object#toString` result references. */
    var argsTag = '[object Arguments]';
    /**
     * The base implementation of `_.isArguments`.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     */
    function baseIsArguments(value) {
        return isObjectLike(value) && baseGetTag(value) == argsTag;
    }
    /** Used for built-in method references. */
    var objectProto$3 = Object.prototype;
    /** Used to check objects for own properties. */
    var hasOwnProperty$2 = objectProto$3.hasOwnProperty;
    /** Built-in value references. */
    var propertyIsEnumerable = objectProto$3.propertyIsEnumerable;
    /**
     * Checks if `value` is likely an `arguments` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     *  else `false`.
     * @example
     *
     * _.isArguments(function() { return arguments; }());
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    var isArguments = baseIsArguments(function () { return arguments; }()) ? baseIsArguments : function (value) {
        return isObjectLike(value) && hasOwnProperty$2.call(value, 'callee') &&
            !propertyIsEnumerable.call(value, 'callee');
    };
    /**
     * Checks if `value` is classified as an `Array` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an array, else `false`.
     * @example
     *
     * _.isArray([1, 2, 3]);
     * // => true
     *
     * _.isArray(document.body.children);
     * // => false
     *
     * _.isArray('abc');
     * // => false
     *
     * _.isArray(_.noop);
     * // => false
     */
    var isArray = Array.isArray;
    /**
     * This method returns `false`.
     *
     * @static
     * @memberOf _
     * @since 4.13.0
     * @category Util
     * @returns {boolean} Returns `false`.
     * @example
     *
     * _.times(2, _.stubFalse);
     * // => [false, false]
     */
    function stubFalse() {
        return false;
    }
    /** Detect free variable `exports`. */
    var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;
    /** Detect free variable `module`. */
    var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;
    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports = freeModule && freeModule.exports === freeExports;
    /** Built-in value references. */
    var Buffer = moduleExports ? root.Buffer : undefined;
    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;
    /**
     * Checks if `value` is a buffer.
     *
     * @static
     * @memberOf _
     * @since 4.3.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
     * @example
     *
     * _.isBuffer(new Buffer(2));
     * // => true
     *
     * _.isBuffer(new Uint8Array(2));
     * // => false
     */
    var isBuffer = nativeIsBuffer || stubFalse;
    /** Used as references for various `Number` constants. */
    var MAX_SAFE_INTEGER$1 = 9007199254740991;
    /** Used to detect unsigned integer values. */
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    /**
     * Checks if `value` is a valid array-like index.
     *
     * @private
     * @param {*} value The value to check.
     * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
     * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
     */
    function isIndex(value, length) {
        length = length == null ? MAX_SAFE_INTEGER$1 : length;
        return !!length &&
            (typeof value == 'number' || reIsUint.test(value)) &&
            (value > -1 && value % 1 == 0 && value < length);
    }
    /** `Object#toString` result references. */
    var argsTag$1 = '[object Arguments]';
    var arrayTag = '[object Array]';
    var boolTag = '[object Boolean]';
    var dateTag = '[object Date]';
    var errorTag = '[object Error]';
    var funcTag$1 = '[object Function]';
    var mapTag = '[object Map]';
    var numberTag = '[object Number]';
    var objectTag = '[object Object]';
    var regexpTag = '[object RegExp]';
    var setTag = '[object Set]';
    var stringTag = '[object String]';
    var weakMapTag = '[object WeakMap]';
    var arrayBufferTag = '[object ArrayBuffer]';
    var dataViewTag = '[object DataView]';
    var float32Tag = '[object Float32Array]';
    var float64Tag = '[object Float64Array]';
    var int8Tag = '[object Int8Array]';
    var int16Tag = '[object Int16Array]';
    var int32Tag = '[object Int32Array]';
    var uint8Tag = '[object Uint8Array]';
    var uint8ClampedTag = '[object Uint8ClampedArray]';
    var uint16Tag = '[object Uint16Array]';
    var uint32Tag = '[object Uint32Array]';
    /** Used to identify `toStringTag` values of typed arrays. */
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
        typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
            typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
                typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
                    typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag$1] = typedArrayTags[arrayTag] =
        typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
            typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
                typedArrayTags[errorTag] = typedArrayTags[funcTag$1] =
                    typedArrayTags[mapTag] = typedArrayTags[numberTag] =
                        typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
                            typedArrayTags[setTag] = typedArrayTags[stringTag] =
                                typedArrayTags[weakMapTag] = false;
    /**
     * The base implementation of `_.isTypedArray` without Node.js optimizations.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
     */
    function baseIsTypedArray(value) {
        return isObjectLike(value) &&
            isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
    }
    /**
     * The base implementation of `_.unary` without support for storing metadata.
     *
     * @private
     * @param {Function} func The function to cap arguments for.
     * @returns {Function} Returns the new capped function.
     */
    function baseUnary(func) {
        return function (value) {
            return func(value);
        };
    }
    /** Detect free variable `exports`. */
    var freeExports$1 = typeof exports == 'object' && exports && !exports.nodeType && exports;
    /** Detect free variable `module`. */
    var freeModule$1 = freeExports$1 && typeof module == 'object' && module && !module.nodeType && module;
    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports$1 = freeModule$1 && freeModule$1.exports === freeExports$1;
    /** Detect free variable `process` from Node.js. */
    var freeProcess = moduleExports$1 && freeGlobal.process;
    /** Used to access faster Node.js helpers. */
    var nodeUtil = (function () {
        try {
            return freeProcess && freeProcess.binding('util');
        }
        catch (e) { }
    }());
    /* Node.js helper references. */
    var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
    /**
     * Checks if `value` is classified as a typed array.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
     * @example
     *
     * _.isTypedArray(new Uint8Array);
     * // => true
     *
     * _.isTypedArray([]);
     * // => false
     */
    var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
    /** Used for built-in method references. */
    var objectProto$2 = Object.prototype;
    /** Used to check objects for own properties. */
    var hasOwnProperty$1 = objectProto$2.hasOwnProperty;
    /**
     * Creates an array of the enumerable property names of the array-like `value`.
     *
     * @private
     * @param {*} value The value to query.
     * @param {boolean} inherited Specify returning inherited property names.
     * @returns {Array} Returns the array of property names.
     */
    function arrayLikeKeys(value, inherited) {
        var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result = skipIndexes ? baseTimes(value.length, String) : [], length = result.length;
        for (var key in value) {
            if ((inherited || hasOwnProperty$1.call(value, key)) &&
                !(skipIndexes && (
                // Safari 9 has enumerable `arguments.length` in strict mode.
                key == 'length' ||
                    // Node.js 0.10 has enumerable non-index properties on buffers.
                    (isBuff && (key == 'offset' || key == 'parent')) ||
                    // PhantomJS 2 has enumerable non-index properties on typed arrays.
                    (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
                    // Skip index properties.
                    isIndex(key, length)))) {
                result.push(key);
            }
        }
        return result;
    }
    /** Used for built-in method references. */
    var objectProto$5 = Object.prototype;
    /**
     * Checks if `value` is likely a prototype object.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
     */
    function isPrototype(value) {
        var Ctor = value && value.constructor, proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$5;
        return value === proto;
    }
    /**
     * Creates a unary function that invokes `func` with its argument transformed.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {Function} transform The argument transform.
     * @returns {Function} Returns the new function.
     */
    function overArg(func, transform) {
        return function (arg) {
            return func(transform(arg));
        };
    }
    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeKeys = overArg(Object.keys, Object);
    /** Used for built-in method references. */
    var objectProto$4 = Object.prototype;
    /** Used to check objects for own properties. */
    var hasOwnProperty$3 = objectProto$4.hasOwnProperty;
    /**
     * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     */
    function baseKeys(object) {
        if (!isPrototype(object)) {
            return nativeKeys(object);
        }
        var result = [];
        for (var key in Object(object)) {
            if (hasOwnProperty$3.call(object, key) && key != 'constructor') {
                result.push(key);
            }
        }
        return result;
    }
    /**
     * Creates an array of the own enumerable property names of `object`.
     *
     * **Note:** Non-object values are coerced to objects. See the
     * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
     * for more details.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.keys(new Foo);
     * // => ['a', 'b'] (iteration order is not guaranteed)
     *
     * _.keys('hi');
     * // => ['0', '1']
     */
    function keys(object) {
        return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }
    function createArrayIterator(coll) {
        var i = -1;
        var len = coll.length;
        return function next() {
            return ++i < len ? { value: coll[i], key: i } : null;
        };
    }
    function createES2015Iterator(iterator) {
        var i = -1;
        return function next() {
            var item = iterator.next();
            if (item.done)
                return null;
            i++;
            return { value: item.value, key: i };
        };
    }
    function createObjectIterator(obj) {
        var okeys = keys(obj);
        var i = -1;
        var len = okeys.length;
        return function next() {
            var key = okeys[++i];
            return i < len ? { value: obj[key], key: key } : null;
        };
    }
    function iterator(coll) {
        if (isArrayLike(coll)) {
            return createArrayIterator(coll);
        }
        var iterator = getIterator(coll);
        return iterator ? createES2015Iterator(iterator) : createObjectIterator(coll);
    }
    function onlyOnce(fn) {
        return function () {
            if (fn === null)
                throw new Error("Callback was already called.");
            var callFn = fn;
            fn = null;
            callFn.apply(this, arguments);
        };
    }
    function _eachOfLimit(limit) {
        return function (obj, iteratee, callback) {
            callback = once(callback || noop);
            if (limit <= 0 || !obj) {
                return callback(null);
            }
            var nextElem = iterator(obj);
            var done = false;
            var running = 0;
            function iterateeCallback(err, value) {
                running -= 1;
                if (err) {
                    done = true;
                    callback(err);
                }
                else if (value === breakLoop || (done && running <= 0)) {
                    done = true;
                    return callback(null);
                }
                else {
                    replenish();
                }
            }
            function replenish() {
                while (running < limit && !done) {
                    var elem = nextElem();
                    if (elem === null) {
                        done = true;
                        if (running <= 0) {
                            callback(null);
                        }
                        return;
                    }
                    running += 1;
                    iteratee(elem.value, elem.key, onlyOnce(iterateeCallback));
                }
            }
            replenish();
        };
    }
    /**
     * The same as [`eachOf`]{@link module:Collections.eachOf} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name eachOfLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.eachOf]{@link module:Collections.eachOf}
     * @alias forEachOfLimit
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async function to apply to each
     * item in `coll`. The `key` is the item's key, or index in the case of an
     * array.
     * Invoked with (item, key, callback).
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     */
    function eachOfLimit(coll, limit, iteratee, callback) {
        _eachOfLimit(limit)(coll, wrapAsync(iteratee), callback);
    }
    function doLimit(fn, limit) {
        return function (iterable, iteratee, callback) {
            return fn(iterable, limit, iteratee, callback);
        };
    }
    // eachOf implementation optimized for array-likes
    function eachOfArrayLike(coll, iteratee, callback) {
        callback = once(callback || noop);
        var index = 0, completed = 0, length = coll.length;
        if (length === 0) {
            callback(null);
        }
        function iteratorCallback(err, value) {
            if (err) {
                callback(err);
            }
            else if ((++completed === length) || value === breakLoop) {
                callback(null);
            }
        }
        for (; index < length; index++) {
            iteratee(coll[index], index, onlyOnce(iteratorCallback));
        }
    }
    // a generic version of eachOf which can handle array, object, and iterator cases.
    var eachOfGeneric = doLimit(eachOfLimit, Infinity);
    /**
     * Like [`each`]{@link module:Collections.each}, except that it passes the key (or index) as the second argument
     * to the iteratee.
     *
     * @name eachOf
     * @static
     * @memberOf module:Collections
     * @method
     * @alias forEachOf
     * @category Collection
     * @see [async.each]{@link module:Collections.each}
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each
     * item in `coll`.
     * The `key` is the item's key, or index in the case of an array.
     * Invoked with (item, key, callback).
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     * @example
     *
     * var obj = {dev: "/dev.json", test: "/test.json", prod: "/prod.json"};
     * var configs = {};
     *
     * async.forEachOf(obj, function (value, key, callback) {
     *     fs.readFile(__dirname + value, "utf8", function (err, data) {
     *         if (err) return callback(err);
     *         try {
     *             configs[key] = JSON.parse(data);
     *         } catch (e) {
     *             return callback(e);
     *         }
     *         callback();
     *     });
     * }, function (err) {
     *     if (err) console.error(err.message);
     *     // configs is now a map of JSON data
     *     doSomethingWith(configs);
     * });
     */
    var eachOf = function (coll, iteratee, callback) {
        var eachOfImplementation = isArrayLike(coll) ? eachOfArrayLike : eachOfGeneric;
        eachOfImplementation(coll, wrapAsync(iteratee), callback);
    };
    function doParallel(fn) {
        return function (obj, iteratee, callback) {
            return fn(eachOf, obj, wrapAsync(iteratee), callback);
        };
    }
    function _asyncMap(eachfn, arr, iteratee, callback) {
        callback = callback || noop;
        arr = arr || [];
        var results = [];
        var counter = 0;
        var _iteratee = wrapAsync(iteratee);
        eachfn(arr, function (value, _, callback) {
            var index = counter++;
            _iteratee(value, function (err, v) {
                results[index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    }
    /**
     * Produces a new collection of values by mapping each value in `coll` through
     * the `iteratee` function. The `iteratee` is called with an item from `coll`
     * and a callback for when it has finished processing. Each of these callback
     * takes 2 arguments: an `error`, and the transformed item from `coll`. If
     * `iteratee` passes an error to its callback, the main `callback` (for the
     * `map` function) is immediately called with the error.
     *
     * Note, that since this function applies the `iteratee` to each item in
     * parallel, there is no guarantee that the `iteratee` functions will complete
     * in order. However, the results array will be in the same order as the
     * original `coll`.
     *
     * If `map` is passed an Object, the results will be an Array.  The results
     * will roughly be in the order of the original Objects' keys (but this can
     * vary across JavaScript engines).
     *
     * @name map
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with the transformed item.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Results is an Array of the
     * transformed items from the `coll`. Invoked with (err, results).
     * @example
     *
     * async.map(['file1','file2','file3'], fs.stat, function(err, results) {
     *     // results is now an array of stats for each file
     * });
     */
    var map = doParallel(_asyncMap);
    /**
     * Applies the provided arguments to each function in the array, calling
     * `callback` after all functions have completed. If you only provide the first
     * argument, `fns`, then it will return a function which lets you pass in the
     * arguments as if it were a single function call. If more arguments are
     * provided, `callback` is required while `args` is still optional.
     *
     * @name applyEach
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array|Iterable|Object} fns - A collection of {@link AsyncFunction}s
     * to all call with the same arguments
     * @param {...*} [args] - any number of separate arguments to pass to the
     * function.
     * @param {Function} [callback] - the final argument should be the callback,
     * called when all functions have completed processing.
     * @returns {Function} - If only the first argument, `fns`, is provided, it will
     * return a function which lets you pass in the arguments as if it were a single
     * function call. The signature is `(..args, callback)`. If invoked with any
     * arguments, `callback` is required.
     * @example
     *
     * async.applyEach([enableSearch, updateSchema], 'bucket', callback);
     *
     * // partial application example:
     * async.each(
     *     buckets,
     *     async.applyEach([enableSearch, updateSchema]),
     *     callback
     * );
     */
    var applyEach = applyEach$1(map);
    function doParallelLimit(fn) {
        return function (obj, limit, iteratee, callback) {
            return fn(_eachOfLimit(limit), obj, wrapAsync(iteratee), callback);
        };
    }
    /**
     * The same as [`map`]{@link module:Collections.map} but runs a maximum of `limit` async operations at a time.
     *
     * @name mapLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.map]{@link module:Collections.map}
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with the transformed item.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Results is an array of the
     * transformed items from the `coll`. Invoked with (err, results).
     */
    var mapLimit = doParallelLimit(_asyncMap);
    /**
     * The same as [`map`]{@link module:Collections.map} but runs only a single async operation at a time.
     *
     * @name mapSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.map]{@link module:Collections.map}
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with the transformed item.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Results is an array of the
     * transformed items from the `coll`. Invoked with (err, results).
     */
    var mapSeries = doLimit(mapLimit, 1);
    /**
     * The same as [`applyEach`]{@link module:ControlFlow.applyEach} but runs only a single async operation at a time.
     *
     * @name applyEachSeries
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.applyEach]{@link module:ControlFlow.applyEach}
     * @category Control Flow
     * @param {Array|Iterable|Object} fns - A collection of {@link AsyncFunction}s to all
     * call with the same arguments
     * @param {...*} [args] - any number of separate arguments to pass to the
     * function.
     * @param {Function} [callback] - the final argument should be the callback,
     * called when all functions have completed processing.
     * @returns {Function} - If only the first argument is provided, it will return
     * a function which lets you pass in the arguments as if it were a single
     * function call.
     */
    var applyEachSeries = applyEach$1(mapSeries);
    /**
     * Creates a continuation function with some arguments already applied.
     *
     * Useful as a shorthand when combined with other control flow functions. Any
     * arguments passed to the returned function are added to the arguments
     * originally passed to apply.
     *
     * @name apply
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {Function} fn - The function you want to eventually apply all
     * arguments to. Invokes with (arguments...).
     * @param {...*} arguments... - Any number of arguments to automatically apply
     * when the continuation is called.
     * @returns {Function} the partially-applied function
     * @example
     *
     * // using apply
     * async.parallel([
     *     async.apply(fs.writeFile, 'testfile1', 'test1'),
     *     async.apply(fs.writeFile, 'testfile2', 'test2')
     * ]);
     *
     *
     * // the same process without using apply
     * async.parallel([
     *     function(callback) {
     *         fs.writeFile('testfile1', 'test1', callback);
     *     },
     *     function(callback) {
     *         fs.writeFile('testfile2', 'test2', callback);
     *     }
     * ]);
     *
     * // It's possible to pass any number of additional arguments when calling the
     * // continuation:
     *
     * node> var fn = async.apply(sys.puts, 'one');
     * node> fn('two', 'three');
     * one
     * two
     * three
     */
    var apply = function (fn /*, ...args*/) {
        var args = slice(arguments, 1);
        return function () {
            var callArgs = slice(arguments);
            return fn.apply(null, args.concat(callArgs));
        };
    };
    /**
     * A specialized version of `_.forEach` for arrays without support for
     * iteratee shorthands.
     *
     * @private
     * @param {Array} [array] The array to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns `array`.
     */
    function arrayEach(array, iteratee) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
            if (iteratee(array[index], index, array) === false) {
                break;
            }
        }
        return array;
    }
    /**
     * Creates a base function for methods like `_.forIn` and `_.forOwn`.
     *
     * @private
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Function} Returns the new base function.
     */
    function createBaseFor(fromRight) {
        return function (object, iteratee, keysFunc) {
            var index = -1, iterable = Object(object), props = keysFunc(object), length = props.length;
            while (length--) {
                var key = props[fromRight ? length : ++index];
                if (iteratee(iterable[key], key, iterable) === false) {
                    break;
                }
            }
            return object;
        };
    }
    /**
     * The base implementation of `baseForOwn` which iterates over `object`
     * properties returned by `keysFunc` and invokes `iteratee` for each property.
     * Iteratee functions may exit iteration early by explicitly returning `false`.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @param {Function} keysFunc The function to get the keys of `object`.
     * @returns {Object} Returns `object`.
     */
    var baseFor = createBaseFor();
    /**
     * The base implementation of `_.forOwn` without support for iteratee shorthands.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Object} Returns `object`.
     */
    function baseForOwn(object, iteratee) {
        return object && baseFor(object, iteratee, keys);
    }
    /**
     * The base implementation of `_.findIndex` and `_.findLastIndex` without
     * support for iteratee shorthands.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {Function} predicate The function invoked per iteration.
     * @param {number} fromIndex The index to search from.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function baseFindIndex(array, predicate, fromIndex, fromRight) {
        var length = array.length, index = fromIndex + (fromRight ? 1 : -1);
        while ((fromRight ? index-- : ++index < length)) {
            if (predicate(array[index], index, array)) {
                return index;
            }
        }
        return -1;
    }
    /**
     * The base implementation of `_.isNaN` without support for number objects.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
     */
    function baseIsNaN(value) {
        return value !== value;
    }
    /**
     * A specialized version of `_.indexOf` which performs strict equality
     * comparisons of values, i.e. `===`.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {*} value The value to search for.
     * @param {number} fromIndex The index to search from.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function strictIndexOf(array, value, fromIndex) {
        var index = fromIndex - 1, length = array.length;
        while (++index < length) {
            if (array[index] === value) {
                return index;
            }
        }
        return -1;
    }
    /**
     * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {*} value The value to search for.
     * @param {number} fromIndex The index to search from.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function baseIndexOf(array, value, fromIndex) {
        return value === value
            ? strictIndexOf(array, value, fromIndex)
            : baseFindIndex(array, baseIsNaN, fromIndex);
    }
    /**
     * Determines the best order for running the {@link AsyncFunction}s in `tasks`, based on
     * their requirements. Each function can optionally depend on other functions
     * being completed first, and each function is run as soon as its requirements
     * are satisfied.
     *
     * If any of the {@link AsyncFunction}s pass an error to their callback, the `auto` sequence
     * will stop. Further tasks will not execute (so any other functions depending
     * on it will not run), and the main `callback` is immediately called with the
     * error.
     *
     * {@link AsyncFunction}s also receive an object containing the results of functions which
     * have completed so far as the first argument, if they have dependencies. If a
     * task function has no dependencies, it will only be passed a callback.
     *
     * @name auto
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Object} tasks - An object. Each of its properties is either a
     * function or an array of requirements, with the {@link AsyncFunction} itself the last item
     * in the array. The object's key of a property serves as the name of the task
     * defined by that property, i.e. can be used when specifying requirements for
     * other tasks. The function receives one or two arguments:
     * * a `results` object, containing the results of the previously executed
     *   functions, only passed if the task has any dependencies,
     * * a `callback(err, result)` function, which must be called when finished,
     *   passing an `error` (which can be `null`) and the result of the function's
     *   execution.
     * @param {number} [concurrency=Infinity] - An optional `integer` for
     * determining the maximum number of tasks that can be run in parallel. By
     * default, as many as possible.
     * @param {Function} [callback] - An optional callback which is called when all
     * the tasks have been completed. It receives the `err` argument if any `tasks`
     * pass an error to their callback. Results are always returned; however, if an
     * error occurs, no further `tasks` will be performed, and the results object
     * will only contain partial results. Invoked with (err, results).
     * @returns undefined
     * @example
     *
     * async.auto({
     *     // this function will just be passed a callback
     *     readData: async.apply(fs.readFile, 'data.txt', 'utf-8'),
     *     showData: ['readData', function(results, cb) {
     *         // results.readData is the file's contents
     *         // ...
     *     }]
     * }, callback);
     *
     * async.auto({
     *     get_data: function(callback) {
     *         console.log('in get_data');
     *         // async code to get some data
     *         callback(null, 'data', 'converted to array');
     *     },
     *     make_folder: function(callback) {
     *         console.log('in make_folder');
     *         // async code to create a directory to store a file in
     *         // this is run at the same time as getting the data
     *         callback(null, 'folder');
     *     },
     *     write_file: ['get_data', 'make_folder', function(results, callback) {
     *         console.log('in write_file', JSON.stringify(results));
     *         // once there is some data and the directory exists,
     *         // write the data to a file in the directory
     *         callback(null, 'filename');
     *     }],
     *     email_link: ['write_file', function(results, callback) {
     *         console.log('in email_link', JSON.stringify(results));
     *         // once the file is written let's email a link to it...
     *         // results.write_file contains the filename returned by write_file.
     *         callback(null, {'file':results.write_file, 'email':'user@example.com'});
     *     }]
     * }, function(err, results) {
     *     console.log('err = ', err);
     *     console.log('results = ', results);
     * });
     */
    var auto = function (tasks, concurrency, callback) {
        if (typeof concurrency === 'function') {
            // concurrency is optional, shift the args.
            callback = concurrency;
            concurrency = null;
        }
        callback = once(callback || noop);
        var keys$$1 = keys(tasks);
        var numTasks = keys$$1.length;
        if (!numTasks) {
            return callback(null);
        }
        if (!concurrency) {
            concurrency = numTasks;
        }
        var results = {};
        var runningTasks = 0;
        var hasError = false;
        var listeners = Object.create(null);
        var readyTasks = [];
        // for cycle detection:
        var readyToCheck = []; // tasks that have been identified as reachable
        // without the possibility of returning to an ancestor task
        var uncheckedDependencies = {};
        baseForOwn(tasks, function (task, key) {
            if (!isArray(task)) {
                // no dependencies
                enqueueTask(key, [task]);
                readyToCheck.push(key);
                return;
            }
            var dependencies = task.slice(0, task.length - 1);
            var remainingDependencies = dependencies.length;
            if (remainingDependencies === 0) {
                enqueueTask(key, task);
                readyToCheck.push(key);
                return;
            }
            uncheckedDependencies[key] = remainingDependencies;
            arrayEach(dependencies, function (dependencyName) {
                if (!tasks[dependencyName]) {
                    throw new Error('async.auto task `' + key +
                        '` has a non-existent dependency `' +
                        dependencyName + '` in ' +
                        dependencies.join(', '));
                }
                addListener(dependencyName, function () {
                    remainingDependencies--;
                    if (remainingDependencies === 0) {
                        enqueueTask(key, task);
                    }
                });
            });
        });
        checkForDeadlocks();
        processQueue();
        function enqueueTask(key, task) {
            readyTasks.push(function () {
                runTask(key, task);
            });
        }
        function processQueue() {
            if (readyTasks.length === 0 && runningTasks === 0) {
                return callback(null, results);
            }
            while (readyTasks.length && runningTasks < concurrency) {
                var run = readyTasks.shift();
                run();
            }
        }
        function addListener(taskName, fn) {
            var taskListeners = listeners[taskName];
            if (!taskListeners) {
                taskListeners = listeners[taskName] = [];
            }
            taskListeners.push(fn);
        }
        function taskComplete(taskName) {
            var taskListeners = listeners[taskName] || [];
            arrayEach(taskListeners, function (fn) {
                fn();
            });
            processQueue();
        }
        function runTask(key, task) {
            if (hasError)
                return;
            var taskCallback = onlyOnce(function (err, result) {
                runningTasks--;
                if (arguments.length > 2) {
                    result = slice(arguments, 1);
                }
                if (err) {
                    var safeResults = {};
                    baseForOwn(results, function (val, rkey) {
                        safeResults[rkey] = val;
                    });
                    safeResults[key] = result;
                    hasError = true;
                    listeners = Object.create(null);
                    callback(err, safeResults);
                }
                else {
                    results[key] = result;
                    taskComplete(key);
                }
            });
            runningTasks++;
            var taskFn = wrapAsync(task[task.length - 1]);
            if (task.length > 1) {
                taskFn(results, taskCallback);
            }
            else {
                taskFn(taskCallback);
            }
        }
        function checkForDeadlocks() {
            // Kahn's algorithm
            // https://en.wikipedia.org/wiki/Topological_sorting#Kahn.27s_algorithm
            // http://connalle.blogspot.com/2013/10/topological-sortingkahn-algorithm.html
            var currentTask;
            var counter = 0;
            while (readyToCheck.length) {
                currentTask = readyToCheck.pop();
                counter++;
                arrayEach(getDependents(currentTask), function (dependent) {
                    if (--uncheckedDependencies[dependent] === 0) {
                        readyToCheck.push(dependent);
                    }
                });
            }
            if (counter !== numTasks) {
                throw new Error('async.auto cannot execute tasks due to a recursive dependency');
            }
        }
        function getDependents(taskName) {
            var result = [];
            baseForOwn(tasks, function (task, key) {
                if (isArray(task) && baseIndexOf(task, taskName, 0) >= 0) {
                    result.push(key);
                }
            });
            return result;
        }
    };
    /**
     * A specialized version of `_.map` for arrays without support for iteratee
     * shorthands.
     *
     * @private
     * @param {Array} [array] The array to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the new mapped array.
     */
    function arrayMap(array, iteratee) {
        var index = -1, length = array == null ? 0 : array.length, result = Array(length);
        while (++index < length) {
            result[index] = iteratee(array[index], index, array);
        }
        return result;
    }
    /** `Object#toString` result references. */
    var symbolTag = '[object Symbol]';
    /**
     * Checks if `value` is classified as a `Symbol` primitive or object.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
     * @example
     *
     * _.isSymbol(Symbol.iterator);
     * // => true
     *
     * _.isSymbol('abc');
     * // => false
     */
    function isSymbol(value) {
        return typeof value == 'symbol' ||
            (isObjectLike(value) && baseGetTag(value) == symbolTag);
    }
    /** Used as references for various `Number` constants. */
    var INFINITY = 1 / 0;
    /** Used to convert symbols to primitives and strings. */
    var symbolProto = Symbol$1 ? Symbol$1.prototype : undefined;
    var symbolToString = symbolProto ? symbolProto.toString : undefined;
    /**
     * The base implementation of `_.toString` which doesn't convert nullish
     * values to empty strings.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {string} Returns the string.
     */
    function baseToString(value) {
        // Exit early for strings to avoid a performance hit in some environments.
        if (typeof value == 'string') {
            return value;
        }
        if (isArray(value)) {
            // Recursively convert values (susceptible to call stack limits).
            return arrayMap(value, baseToString) + '';
        }
        if (isSymbol(value)) {
            return symbolToString ? symbolToString.call(value) : '';
        }
        var result = (value + '');
        return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
    }
    /**
     * The base implementation of `_.slice` without an iteratee call guard.
     *
     * @private
     * @param {Array} array The array to slice.
     * @param {number} [start=0] The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns the slice of `array`.
     */
    function baseSlice(array, start, end) {
        var index = -1, length = array.length;
        if (start < 0) {
            start = -start > length ? 0 : (length + start);
        }
        end = end > length ? length : end;
        if (end < 0) {
            end += length;
        }
        length = start > end ? 0 : ((end - start) >>> 0);
        start >>>= 0;
        var result = Array(length);
        while (++index < length) {
            result[index] = array[index + start];
        }
        return result;
    }
    /**
     * Casts `array` to a slice if it's needed.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {number} start The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns the cast slice.
     */
    function castSlice(array, start, end) {
        var length = array.length;
        end = end === undefined ? length : end;
        return (!start && end >= length) ? array : baseSlice(array, start, end);
    }
    /**
     * Used by `_.trim` and `_.trimEnd` to get the index of the last string symbol
     * that is not found in the character symbols.
     *
     * @private
     * @param {Array} strSymbols The string symbols to inspect.
     * @param {Array} chrSymbols The character symbols to find.
     * @returns {number} Returns the index of the last unmatched string symbol.
     */
    function charsEndIndex(strSymbols, chrSymbols) {
        var index = strSymbols.length;
        while (index-- && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) { }
        return index;
    }
    /**
     * Used by `_.trim` and `_.trimStart` to get the index of the first string symbol
     * that is not found in the character symbols.
     *
     * @private
     * @param {Array} strSymbols The string symbols to inspect.
     * @param {Array} chrSymbols The character symbols to find.
     * @returns {number} Returns the index of the first unmatched string symbol.
     */
    function charsStartIndex(strSymbols, chrSymbols) {
        var index = -1, length = strSymbols.length;
        while (++index < length && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) { }
        return index;
    }
    /**
     * Converts an ASCII `string` to an array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the converted array.
     */
    function asciiToArray(string) {
        return string.split('');
    }
    /** Used to compose unicode character classes. */
    var rsAstralRange = '\\ud800-\\udfff';
    var rsComboMarksRange = '\\u0300-\\u036f\\ufe20-\\ufe23';
    var rsComboSymbolsRange = '\\u20d0-\\u20f0';
    var rsVarRange = '\\ufe0e\\ufe0f';
    /** Used to compose unicode capture groups. */
    var rsZWJ = '\\u200d';
    /** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
    var reHasUnicode = RegExp('[' + rsZWJ + rsAstralRange + rsComboMarksRange + rsComboSymbolsRange + rsVarRange + ']');
    /**
     * Checks if `string` contains Unicode symbols.
     *
     * @private
     * @param {string} string The string to inspect.
     * @returns {boolean} Returns `true` if a symbol is found, else `false`.
     */
    function hasUnicode(string) {
        return reHasUnicode.test(string);
    }
    /** Used to compose unicode character classes. */
    var rsAstralRange$1 = '\\ud800-\\udfff';
    var rsComboMarksRange$1 = '\\u0300-\\u036f\\ufe20-\\ufe23';
    var rsComboSymbolsRange$1 = '\\u20d0-\\u20f0';
    var rsVarRange$1 = '\\ufe0e\\ufe0f';
    /** Used to compose unicode capture groups. */
    var rsAstral = '[' + rsAstralRange$1 + ']';
    var rsCombo = '[' + rsComboMarksRange$1 + rsComboSymbolsRange$1 + ']';
    var rsFitz = '\\ud83c[\\udffb-\\udfff]';
    var rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')';
    var rsNonAstral = '[^' + rsAstralRange$1 + ']';
    var rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}';
    var rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]';
    var rsZWJ$1 = '\\u200d';
    /** Used to compose unicode regexes. */
    var reOptMod = rsModifier + '?';
    var rsOptVar = '[' + rsVarRange$1 + ']?';
    var rsOptJoin = '(?:' + rsZWJ$1 + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*';
    var rsSeq = rsOptVar + reOptMod + rsOptJoin;
    var rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';
    /** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
    var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');
    /**
     * Converts a Unicode `string` to an array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the converted array.
     */
    function unicodeToArray(string) {
        return string.match(reUnicode) || [];
    }
    /**
     * Converts `string` to an array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the converted array.
     */
    function stringToArray(string) {
        return hasUnicode(string)
            ? unicodeToArray(string)
            : asciiToArray(string);
    }
    /**
     * Converts `value` to a string. An empty string is returned for `null`
     * and `undefined` values. The sign of `-0` is preserved.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     * @example
     *
     * _.toString(null);
     * // => ''
     *
     * _.toString(-0);
     * // => '-0'
     *
     * _.toString([1, 2, 3]);
     * // => '1,2,3'
     */
    function toString(value) {
        return value == null ? '' : baseToString(value);
    }
    /** Used to match leading and trailing whitespace. */
    var reTrim = /^\s+|\s+$/g;
    /**
     * Removes leading and trailing whitespace or specified characters from `string`.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to trim.
     * @param {string} [chars=whitespace] The characters to trim.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {string} Returns the trimmed string.
     * @example
     *
     * _.trim('  abc  ');
     * // => 'abc'
     *
     * _.trim('-_-abc-_-', '_-');
     * // => 'abc'
     *
     * _.map(['  foo  ', '  bar  '], _.trim);
     * // => ['foo', 'bar']
     */
    function trim(string, chars, guard) {
        string = toString(string);
        if (string && (guard || chars === undefined)) {
            return string.replace(reTrim, '');
        }
        if (!string || !(chars = baseToString(chars))) {
            return string;
        }
        var strSymbols = stringToArray(string), chrSymbols = stringToArray(chars), start = charsStartIndex(strSymbols, chrSymbols), end = charsEndIndex(strSymbols, chrSymbols) + 1;
        return castSlice(strSymbols, start, end).join('');
    }
    var FN_ARGS = /^(?:async\s+)?(function)?\s*[^\(]*\(\s*([^\)]*)\)/m;
    var FN_ARG_SPLIT = /,/;
    var FN_ARG = /(=.+)?(\s*)$/;
    var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    function parseParams(func) {
        func = func.toString().replace(STRIP_COMMENTS, '');
        func = func.match(FN_ARGS)[2].replace(' ', '');
        func = func ? func.split(FN_ARG_SPLIT) : [];
        func = func.map(function (arg) {
            return trim(arg.replace(FN_ARG, ''));
        });
        return func;
    }
    /**
     * A dependency-injected version of the [async.auto]{@link module:ControlFlow.auto} function. Dependent
     * tasks are specified as parameters to the function, after the usual callback
     * parameter, with the parameter names matching the names of the tasks it
     * depends on. This can provide even more readable task graphs which can be
     * easier to maintain.
     *
     * If a final callback is specified, the task results are similarly injected,
     * specified as named parameters after the initial error parameter.
     *
     * The autoInject function is purely syntactic sugar and its semantics are
     * otherwise equivalent to [async.auto]{@link module:ControlFlow.auto}.
     *
     * @name autoInject
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.auto]{@link module:ControlFlow.auto}
     * @category Control Flow
     * @param {Object} tasks - An object, each of whose properties is an {@link AsyncFunction} of
     * the form 'func([dependencies...], callback). The object's key of a property
     * serves as the name of the task defined by that property, i.e. can be used
     * when specifying requirements for other tasks.
     * * The `callback` parameter is a `callback(err, result)` which must be called
     *   when finished, passing an `error` (which can be `null`) and the result of
     *   the function's execution. The remaining parameters name other tasks on
     *   which the task is dependent, and the results from those tasks are the
     *   arguments of those parameters.
     * @param {Function} [callback] - An optional callback which is called when all
     * the tasks have been completed. It receives the `err` argument if any `tasks`
     * pass an error to their callback, and a `results` object with any completed
     * task results, similar to `auto`.
     * @example
     *
     * //  The example from `auto` can be rewritten as follows:
     * async.autoInject({
     *     get_data: function(callback) {
     *         // async code to get some data
     *         callback(null, 'data', 'converted to array');
     *     },
     *     make_folder: function(callback) {
     *         // async code to create a directory to store a file in
     *         // this is run at the same time as getting the data
     *         callback(null, 'folder');
     *     },
     *     write_file: function(get_data, make_folder, callback) {
     *         // once there is some data and the directory exists,
     *         // write the data to a file in the directory
     *         callback(null, 'filename');
     *     },
     *     email_link: function(write_file, callback) {
     *         // once the file is written let's email a link to it...
     *         // write_file contains the filename returned by write_file.
     *         callback(null, {'file':write_file, 'email':'user@example.com'});
     *     }
     * }, function(err, results) {
     *     console.log('err = ', err);
     *     console.log('email_link = ', results.email_link);
     * });
     *
     * // If you are using a JS minifier that mangles parameter names, `autoInject`
     * // will not work with plain functions, since the parameter names will be
     * // collapsed to a single letter identifier.  To work around this, you can
     * // explicitly specify the names of the parameters your task function needs
     * // in an array, similar to Angular.js dependency injection.
     *
     * // This still has an advantage over plain `auto`, since the results a task
     * // depends on are still spread into arguments.
     * async.autoInject({
     *     //...
     *     write_file: ['get_data', 'make_folder', function(get_data, make_folder, callback) {
     *         callback(null, 'filename');
     *     }],
     *     email_link: ['write_file', function(write_file, callback) {
     *         callback(null, {'file':write_file, 'email':'user@example.com'});
     *     }]
     *     //...
     * }, function(err, results) {
     *     console.log('err = ', err);
     *     console.log('email_link = ', results.email_link);
     * });
     */
    function autoInject(tasks, callback) {
        var newTasks = {};
        baseForOwn(tasks, function (taskFn, key) {
            var params;
            var fnIsAsync = isAsync(taskFn);
            var hasNoDeps = (!fnIsAsync && taskFn.length === 1) ||
                (fnIsAsync && taskFn.length === 0);
            if (isArray(taskFn)) {
                params = taskFn.slice(0, -1);
                taskFn = taskFn[taskFn.length - 1];
                newTasks[key] = params.concat(params.length > 0 ? newTask : taskFn);
            }
            else if (hasNoDeps) {
                // no dependencies, use the function as-is
                newTasks[key] = taskFn;
            }
            else {
                params = parseParams(taskFn);
                if (taskFn.length === 0 && !fnIsAsync && params.length === 0) {
                    throw new Error("autoInject task functions require explicit parameters.");
                }
                // remove callback param
                if (!fnIsAsync)
                    params.pop();
                newTasks[key] = params.concat(newTask);
            }
            function newTask(results, taskCb) {
                var newArgs = arrayMap(params, function (name) {
                    return results[name];
                });
                newArgs.push(taskCb);
                wrapAsync(taskFn).apply(null, newArgs);
            }
        });
        auto(newTasks, callback);
    }
    // Simple doubly linked list (https://en.wikipedia.org/wiki/Doubly_linked_list) implementation
    // used for queues. This implementation assumes that the node provided by the user can be modified
    // to adjust the next and last properties. We implement only the minimal functionality
    // for queue support.
    function DLL() {
        this.head = this.tail = null;
        this.length = 0;
    }
    function setInitial(dll, node) {
        dll.length = 1;
        dll.head = dll.tail = node;
    }
    DLL.prototype.removeLink = function (node) {
        if (node.prev)
            node.prev.next = node.next;
        else
            this.head = node.next;
        if (node.next)
            node.next.prev = node.prev;
        else
            this.tail = node.prev;
        node.prev = node.next = null;
        this.length -= 1;
        return node;
    };
    DLL.prototype.empty = function () {
        while (this.head)
            this.shift();
        return this;
    };
    DLL.prototype.insertAfter = function (node, newNode) {
        newNode.prev = node;
        newNode.next = node.next;
        if (node.next)
            node.next.prev = newNode;
        else
            this.tail = newNode;
        node.next = newNode;
        this.length += 1;
    };
    DLL.prototype.insertBefore = function (node, newNode) {
        newNode.prev = node.prev;
        newNode.next = node;
        if (node.prev)
            node.prev.next = newNode;
        else
            this.head = newNode;
        node.prev = newNode;
        this.length += 1;
    };
    DLL.prototype.unshift = function (node) {
        if (this.head)
            this.insertBefore(this.head, node);
        else
            setInitial(this, node);
    };
    DLL.prototype.push = function (node) {
        if (this.tail)
            this.insertAfter(this.tail, node);
        else
            setInitial(this, node);
    };
    DLL.prototype.shift = function () {
        return this.head && this.removeLink(this.head);
    };
    DLL.prototype.pop = function () {
        return this.tail && this.removeLink(this.tail);
    };
    DLL.prototype.toArray = function () {
        var arr = Array(this.length);
        var curr = this.head;
        for (var idx = 0; idx < this.length; idx++) {
            arr[idx] = curr.data;
            curr = curr.next;
        }
        return arr;
    };
    DLL.prototype.remove = function (testFn) {
        var curr = this.head;
        while (!!curr) {
            var next = curr.next;
            if (testFn(curr)) {
                this.removeLink(curr);
            }
            curr = next;
        }
        return this;
    };
    function queue(worker, concurrency, payload) {
        if (concurrency == null) {
            concurrency = 1;
        }
        else if (concurrency === 0) {
            throw new Error('Concurrency must not be zero');
        }
        var _worker = wrapAsync(worker);
        var numRunning = 0;
        var workersList = [];
        function _insert(data, insertAtFront, callback) {
            if (callback != null && typeof callback !== 'function') {
                throw new Error('task callback must be a function');
            }
            q.started = true;
            if (!isArray(data)) {
                data = [data];
            }
            if (data.length === 0 && q.idle()) {
                // call drain immediately if there are no tasks
                return setImmediate$1(function () {
                    q.drain();
                });
            }
            for (var i = 0, l = data.length; i < l; i++) {
                var item = {
                    data: data[i],
                    callback: callback || noop
                };
                if (insertAtFront) {
                    q._tasks.unshift(item);
                }
                else {
                    q._tasks.push(item);
                }
            }
            setImmediate$1(q.process);
        }
        function _next(tasks) {
            return function (err) {
                numRunning -= 1;
                for (var i = 0, l = tasks.length; i < l; i++) {
                    var task = tasks[i];
                    var index = baseIndexOf(workersList, task, 0);
                    if (index >= 0) {
                        workersList.splice(index, 1);
                    }
                    task.callback.apply(task, arguments);
                    if (err != null) {
                        q.error(err, task.data);
                    }
                }
                if (numRunning <= (q.concurrency - q.buffer)) {
                    q.unsaturated();
                }
                if (q.idle()) {
                    q.drain();
                }
                q.process();
            };
        }
        var isProcessing = false;
        var q = {
            _tasks: new DLL(),
            concurrency: concurrency,
            payload: payload,
            saturated: noop,
            unsaturated: noop,
            buffer: concurrency / 4,
            empty: noop,
            drain: noop,
            error: noop,
            started: false,
            paused: false,
            push: function (data, callback) {
                _insert(data, false, callback);
            },
            kill: function () {
                q.drain = noop;
                q._tasks.empty();
            },
            unshift: function (data, callback) {
                _insert(data, true, callback);
            },
            remove: function (testFn) {
                q._tasks.remove(testFn);
            },
            process: function () {
                // Avoid trying to start too many processing operations. This can occur
                // when callbacks resolve synchronously (#1267).
                if (isProcessing) {
                    return;
                }
                isProcessing = true;
                while (!q.paused && numRunning < q.concurrency && q._tasks.length) {
                    var tasks = [], data = [];
                    var l = q._tasks.length;
                    if (q.payload)
                        l = Math.min(l, q.payload);
                    for (var i = 0; i < l; i++) {
                        var node = q._tasks.shift();
                        tasks.push(node);
                        workersList.push(node);
                        data.push(node.data);
                    }
                    numRunning += 1;
                    if (q._tasks.length === 0) {
                        q.empty();
                    }
                    if (numRunning === q.concurrency) {
                        q.saturated();
                    }
                    var cb = onlyOnce(_next(tasks));
                    _worker(data, cb);
                }
                isProcessing = false;
            },
            length: function () {
                return q._tasks.length;
            },
            running: function () {
                return numRunning;
            },
            workersList: function () {
                return workersList;
            },
            idle: function () {
                return q._tasks.length + numRunning === 0;
            },
            pause: function () {
                q.paused = true;
            },
            resume: function () {
                if (q.paused === false) {
                    return;
                }
                q.paused = false;
                setImmediate$1(q.process);
            }
        };
        return q;
    }
    /**
     * A cargo of tasks for the worker function to complete. Cargo inherits all of
     * the same methods and event callbacks as [`queue`]{@link module:ControlFlow.queue}.
     * @typedef {Object} CargoObject
     * @memberOf module:ControlFlow
     * @property {Function} length - A function returning the number of items
     * waiting to be processed. Invoke like `cargo.length()`.
     * @property {number} payload - An `integer` for determining how many tasks
     * should be process per round. This property can be changed after a `cargo` is
     * created to alter the payload on-the-fly.
     * @property {Function} push - Adds `task` to the `queue`. The callback is
     * called once the `worker` has finished processing the task. Instead of a
     * single task, an array of `tasks` can be submitted. The respective callback is
     * used for every task in the list. Invoke like `cargo.push(task, [callback])`.
     * @property {Function} saturated - A callback that is called when the
     * `queue.length()` hits the concurrency and further tasks will be queued.
     * @property {Function} empty - A callback that is called when the last item
     * from the `queue` is given to a `worker`.
     * @property {Function} drain - A callback that is called when the last item
     * from the `queue` has returned from the `worker`.
     * @property {Function} idle - a function returning false if there are items
     * waiting or being processed, or true if not. Invoke like `cargo.idle()`.
     * @property {Function} pause - a function that pauses the processing of tasks
     * until `resume()` is called. Invoke like `cargo.pause()`.
     * @property {Function} resume - a function that resumes the processing of
     * queued tasks when the queue is paused. Invoke like `cargo.resume()`.
     * @property {Function} kill - a function that removes the `drain` callback and
     * empties remaining tasks from the queue forcing it to go idle. Invoke like `cargo.kill()`.
     */
    /**
     * Creates a `cargo` object with the specified payload. Tasks added to the
     * cargo will be processed altogether (up to the `payload` limit). If the
     * `worker` is in progress, the task is queued until it becomes available. Once
     * the `worker` has completed some tasks, each callback of those tasks is
     * called. Check out [these](https://camo.githubusercontent.com/6bbd36f4cf5b35a0f11a96dcd2e97711ffc2fb37/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130382f62626330636662302d356632392d313165322d393734662d3333393763363464633835382e676966) [animations](https://camo.githubusercontent.com/f4810e00e1c5f5f8addbe3e9f49064fd5d102699/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130312f38346339323036362d356632392d313165322d383134662d3964336430323431336266642e676966)
     * for how `cargo` and `queue` work.
     *
     * While [`queue`]{@link module:ControlFlow.queue} passes only one task to one of a group of workers
     * at a time, cargo passes an array of tasks to a single worker, repeating
     * when the worker is finished.
     *
     * @name cargo
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.queue]{@link module:ControlFlow.queue}
     * @category Control Flow
     * @param {AsyncFunction} worker - An asynchronous function for processing an array
     * of queued tasks. Invoked with `(tasks, callback)`.
     * @param {number} [payload=Infinity] - An optional `integer` for determining
     * how many tasks should be processed per round; if omitted, the default is
     * unlimited.
     * @returns {module:ControlFlow.CargoObject} A cargo object to manage the tasks. Callbacks can
     * attached as certain properties to listen for specific events during the
     * lifecycle of the cargo and inner queue.
     * @example
     *
     * // create a cargo object with payload 2
     * var cargo = async.cargo(function(tasks, callback) {
     *     for (var i=0; i<tasks.length; i++) {
     *         console.log('hello ' + tasks[i].name);
     *     }
     *     callback();
     * }, 2);
     *
     * // add some items
     * cargo.push({name: 'foo'}, function(err) {
     *     console.log('finished processing foo');
     * });
     * cargo.push({name: 'bar'}, function(err) {
     *     console.log('finished processing bar');
     * });
     * cargo.push({name: 'baz'}, function(err) {
     *     console.log('finished processing baz');
     * });
     */
    function cargo(worker, payload) {
        return queue(worker, 1, payload);
    }
    /**
     * The same as [`eachOf`]{@link module:Collections.eachOf} but runs only a single async operation at a time.
     *
     * @name eachOfSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.eachOf]{@link module:Collections.eachOf}
     * @alias forEachOfSeries
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * Invoked with (item, key, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Invoked with (err).
     */
    var eachOfSeries = doLimit(eachOfLimit, 1);
    /**
     * Reduces `coll` into a single value using an async `iteratee` to return each
     * successive step. `memo` is the initial state of the reduction. This function
     * only operates in series.
     *
     * For performance reasons, it may make sense to split a call to this function
     * into a parallel map, and then use the normal `Array.prototype.reduce` on the
     * results. This function is for situations where each step in the reduction
     * needs to be async; if you can get the data before reducing it, then it's
     * probably a good idea to do so.
     *
     * @name reduce
     * @static
     * @memberOf module:Collections
     * @method
     * @alias inject
     * @alias foldl
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {*} memo - The initial state of the reduction.
     * @param {AsyncFunction} iteratee - A function applied to each item in the
     * array to produce the next step in the reduction.
     * The `iteratee` should complete with the next state of the reduction.
     * If the iteratee complete with an error, the reduction is stopped and the
     * main `callback` is immediately called with the error.
     * Invoked with (memo, item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result is the reduced value. Invoked with
     * (err, result).
     * @example
     *
     * async.reduce([1,2,3], 0, function(memo, item, callback) {
     *     // pointless async:
     *     process.nextTick(function() {
     *         callback(null, memo + item)
     *     });
     * }, function(err, result) {
     *     // result is now equal to the last value of memo, which is 6
     * });
     */
    function reduce(coll, memo, iteratee, callback) {
        callback = once(callback || noop);
        var _iteratee = wrapAsync(iteratee);
        eachOfSeries(coll, function (x, i, callback) {
            _iteratee(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    }
    /**
     * Version of the compose function that is more natural to read. Each function
     * consumes the return value of the previous function. It is the equivalent of
     * [compose]{@link module:ControlFlow.compose} with the arguments reversed.
     *
     * Each function is executed with the `this` binding of the composed function.
     *
     * @name seq
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.compose]{@link module:ControlFlow.compose}
     * @category Control Flow
     * @param {...AsyncFunction} functions - the asynchronous functions to compose
     * @returns {Function} a function that composes the `functions` in order
     * @example
     *
     * // Requires lodash (or underscore), express3 and dresende's orm2.
     * // Part of an app, that fetches cats of the logged user.
     * // This example uses `seq` function to avoid overnesting and error
     * // handling clutter.
     * app.get('/cats', function(request, response) {
     *     var User = request.models.User;
     *     async.seq(
     *         _.bind(User.get, User),  // 'User.get' has signature (id, callback(err, data))
     *         function(user, fn) {
     *             user.getCats(fn);      // 'getCats' has signature (callback(err, data))
     *         }
     *     )(req.session.user_id, function (err, cats) {
     *         if (err) {
     *             console.error(err);
     *             response.json({ status: 'error', message: err.message });
     *         } else {
     *             response.json({ status: 'ok', message: 'Cats found', data: cats });
     *         }
     *     });
     * });
     */
    function seq() {
        var _functions = arrayMap(arguments, wrapAsync);
        return function () {
            var args = slice(arguments);
            var that = this;
            var cb = args[args.length - 1];
            if (typeof cb == 'function') {
                args.pop();
            }
            else {
                cb = noop;
            }
            reduce(_functions, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat(function (err /*, ...nextargs*/) {
                    var nextargs = slice(arguments, 1);
                    cb(err, nextargs);
                }));
            }, function (err, results) {
                cb.apply(that, [err].concat(results));
            });
        };
    }
    /**
     * Creates a function which is a composition of the passed asynchronous
     * functions. Each function consumes the return value of the function that
     * follows. Composing functions `f()`, `g()`, and `h()` would produce the result
     * of `f(g(h()))`, only this version uses callbacks to obtain the return values.
     *
     * Each function is executed with the `this` binding of the composed function.
     *
     * @name compose
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {...AsyncFunction} functions - the asynchronous functions to compose
     * @returns {Function} an asynchronous function that is the composed
     * asynchronous `functions`
     * @example
     *
     * function add1(n, callback) {
     *     setTimeout(function () {
     *         callback(null, n + 1);
     *     }, 10);
     * }
     *
     * function mul3(n, callback) {
     *     setTimeout(function () {
     *         callback(null, n * 3);
     *     }, 10);
     * }
     *
     * var add1mul3 = async.compose(mul3, add1);
     * add1mul3(4, function (err, result) {
     *     // result now equals 15
     * });
     */
    var compose = function () {
        return seq.apply(null, slice(arguments).reverse());
    };
    var _concat = Array.prototype.concat;
    /**
     * The same as [`concat`]{@link module:Collections.concat} but runs a maximum of `limit` async operations at a time.
     *
     * @name concatLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.concat]{@link module:Collections.concat}
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`,
     * which should use an array as its result. Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished, or an error occurs. Results is an array
     * containing the concatenated results of the `iteratee` function. Invoked with
     * (err, results).
     */
    var concatLimit = function (coll, limit, iteratee, callback) {
        callback = callback || noop;
        var _iteratee = wrapAsync(iteratee);
        mapLimit(coll, limit, function (val, callback) {
            _iteratee(val, function (err /*, ...args*/) {
                if (err)
                    return callback(err);
                return callback(null, slice(arguments, 1));
            });
        }, function (err, mapResults) {
            var result = [];
            for (var i = 0; i < mapResults.length; i++) {
                if (mapResults[i]) {
                    result = _concat.apply(result, mapResults[i]);
                }
            }
            return callback(err, result);
        });
    };
    /**
     * Applies `iteratee` to each item in `coll`, concatenating the results. Returns
     * the concatenated list. The `iteratee`s are called in parallel, and the
     * results are concatenated as they return. There is no guarantee that the
     * results array will be returned in the original order of `coll` passed to the
     * `iteratee` function.
     *
     * @name concat
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`,
     * which should use an array as its result. Invoked with (item, callback).
     * @param {Function} [callback(err)] - A callback which is called after all the
     * `iteratee` functions have finished, or an error occurs. Results is an array
     * containing the concatenated results of the `iteratee` function. Invoked with
     * (err, results).
     * @example
     *
     * async.concat(['dir1','dir2','dir3'], fs.readdir, function(err, files) {
     *     // files is now a list of filenames that exist in the 3 directories
     * });
     */
    var concat = doLimit(concatLimit, Infinity);
    /**
     * The same as [`concat`]{@link module:Collections.concat} but runs only a single async operation at a time.
     *
     * @name concatSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.concat]{@link module:Collections.concat}
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`.
     * The iteratee should complete with an array an array of results.
     * Invoked with (item, callback).
     * @param {Function} [callback(err)] - A callback which is called after all the
     * `iteratee` functions have finished, or an error occurs. Results is an array
     * containing the concatenated results of the `iteratee` function. Invoked with
     * (err, results).
     */
    var concatSeries = doLimit(concatLimit, 1);
    /**
     * Returns a function that when called, calls-back with the values provided.
     * Useful as the first function in a [`waterfall`]{@link module:ControlFlow.waterfall}, or for plugging values in to
     * [`auto`]{@link module:ControlFlow.auto}.
     *
     * @name constant
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {...*} arguments... - Any number of arguments to automatically invoke
     * callback with.
     * @returns {AsyncFunction} Returns a function that when invoked, automatically
     * invokes the callback with the previous given arguments.
     * @example
     *
     * async.waterfall([
     *     async.constant(42),
     *     function (value, next) {
     *         // value === 42
     *     },
     *     //...
     * ], callback);
     *
     * async.waterfall([
     *     async.constant(filename, "utf8"),
     *     fs.readFile,
     *     function (fileData, next) {
     *         //...
     *     }
     *     //...
     * ], callback);
     *
     * async.auto({
     *     hostname: async.constant("https://server.net/"),
     *     port: findFreePort,
     *     launchServer: ["hostname", "port", function (options, cb) {
     *         startServer(options, cb);
     *     }],
     *     //...
     * }, callback);
     */
    var constant = function () {
        var values = slice(arguments);
        var args = [null].concat(values);
        return function () {
            var callback = arguments[arguments.length - 1];
            return callback.apply(this, args);
        };
    };
    /**
     * This method returns the first argument it receives.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Util
     * @param {*} value Any value.
     * @returns {*} Returns `value`.
     * @example
     *
     * var object = { 'a': 1 };
     *
     * console.log(_.identity(object) === object);
     * // => true
     */
    function identity(value) {
        return value;
    }
    function _createTester(check, getResult) {
        return function (eachfn, arr, iteratee, cb) {
            cb = cb || noop;
            var testPassed = false;
            var testResult;
            eachfn(arr, function (value, _, callback) {
                iteratee(value, function (err, result) {
                    if (err) {
                        callback(err);
                    }
                    else if (check(result) && !testResult) {
                        testPassed = true;
                        testResult = getResult(true, value);
                        callback(null, breakLoop);
                    }
                    else {
                        callback();
                    }
                });
            }, function (err) {
                if (err) {
                    cb(err);
                }
                else {
                    cb(null, testPassed ? testResult : getResult(false));
                }
            });
        };
    }
    function _findGetResult(v, x) {
        return x;
    }
    /**
     * Returns the first value in `coll` that passes an async truth test. The
     * `iteratee` is applied in parallel, meaning the first iteratee to return
     * `true` will fire the detect `callback` with that result. That means the
     * result might not be the first item in the original `coll` (in terms of order)
     * that passes the test.
    
     * If order within the original `coll` is important, then look at
     * [`detectSeries`]{@link module:Collections.detectSeries}.
     *
     * @name detect
     * @static
     * @memberOf module:Collections
     * @method
     * @alias find
     * @category Collections
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
     * The iteratee must complete with a boolean value as its result.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the `iteratee` functions have finished.
     * Result will be the first item in the array that passes the truth test
     * (iteratee) or the value `undefined` if none passed. Invoked with
     * (err, result).
     * @example
     *
     * async.detect(['file1','file2','file3'], function(filePath, callback) {
     *     fs.access(filePath, function(err) {
     *         callback(null, !err)
     *     });
     * }, function(err, result) {
     *     // result now equals the first file in the list that exists
     * });
     */
    var detect = doParallel(_createTester(identity, _findGetResult));
    /**
     * The same as [`detect`]{@link module:Collections.detect} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name detectLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.detect]{@link module:Collections.detect}
     * @alias findLimit
     * @category Collections
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
     * The iteratee must complete with a boolean value as its result.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the `iteratee` functions have finished.
     * Result will be the first item in the array that passes the truth test
     * (iteratee) or the value `undefined` if none passed. Invoked with
     * (err, result).
     */
    var detectLimit = doParallelLimit(_createTester(identity, _findGetResult));
    /**
     * The same as [`detect`]{@link module:Collections.detect} but runs only a single async operation at a time.
     *
     * @name detectSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.detect]{@link module:Collections.detect}
     * @alias findSeries
     * @category Collections
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
     * The iteratee must complete with a boolean value as its result.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the `iteratee` functions have finished.
     * Result will be the first item in the array that passes the truth test
     * (iteratee) or the value `undefined` if none passed. Invoked with
     * (err, result).
     */
    var detectSeries = doLimit(detectLimit, 1);
    function consoleFunc(name) {
        return function (fn /*, ...args*/) {
            var args = slice(arguments, 1);
            args.push(function (err /*, ...args*/) {
                var args = slice(arguments, 1);
                if (typeof console === 'object') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        arrayEach(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            });
            wrapAsync(fn).apply(null, args);
        };
    }
    /**
     * Logs the result of an [`async` function]{@link AsyncFunction} to the
     * `console` using `console.dir` to display the properties of the resulting object.
     * Only works in Node.js or in browsers that support `console.dir` and
     * `console.error` (such as FF and Chrome).
     * If multiple arguments are returned from the async function,
     * `console.dir` is called on each argument in order.
     *
     * @name dir
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} function - The function you want to eventually apply
     * all arguments to.
     * @param {...*} arguments... - Any number of arguments to apply to the function.
     * @example
     *
     * // in a module
     * var hello = function(name, callback) {
     *     setTimeout(function() {
     *         callback(null, {hello: name});
     *     }, 1000);
     * };
     *
     * // in the node repl
     * node> async.dir(hello, 'world');
     * {hello: 'world'}
     */
    var dir = consoleFunc('dir');
    /**
     * The post-check version of [`during`]{@link module:ControlFlow.during}. To reflect the difference in
     * the order of operations, the arguments `test` and `fn` are switched.
     *
     * Also a version of [`doWhilst`]{@link module:ControlFlow.doWhilst} with asynchronous `test` function.
     * @name doDuring
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.during]{@link module:ControlFlow.during}
     * @category Control Flow
     * @param {AsyncFunction} fn - An async function which is called each time
     * `test` passes. Invoked with (callback).
     * @param {AsyncFunction} test - asynchronous truth test to perform before each
     * execution of `fn`. Invoked with (...args, callback), where `...args` are the
     * non-error args from the previous callback of `fn`.
     * @param {Function} [callback] - A callback which is called after the test
     * function has failed and repeated execution of `fn` has stopped. `callback`
     * will be passed an error if one occurred, otherwise `null`.
     */
    function doDuring(fn, test, callback) {
        callback = onlyOnce(callback || noop);
        var _fn = wrapAsync(fn);
        var _test = wrapAsync(test);
        function next(err /*, ...args*/) {
            if (err)
                return callback(err);
            var args = slice(arguments, 1);
            args.push(check);
            _test.apply(this, args);
        }
        function check(err, truth) {
            if (err)
                return callback(err);
            if (!truth)
                return callback(null);
            _fn(next);
        }
        check(null, true);
    }
    /**
     * The post-check version of [`whilst`]{@link module:ControlFlow.whilst}. To reflect the difference in
     * the order of operations, the arguments `test` and `iteratee` are switched.
     *
     * `doWhilst` is to `whilst` as `do while` is to `while` in plain JavaScript.
     *
     * @name doWhilst
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.whilst]{@link module:ControlFlow.whilst}
     * @category Control Flow
     * @param {AsyncFunction} iteratee - A function which is called each time `test`
     * passes. Invoked with (callback).
     * @param {Function} test - synchronous truth test to perform after each
     * execution of `iteratee`. Invoked with any non-error callback results of
     * `iteratee`.
     * @param {Function} [callback] - A callback which is called after the test
     * function has failed and repeated execution of `iteratee` has stopped.
     * `callback` will be passed an error and any arguments passed to the final
     * `iteratee`'s callback. Invoked with (err, [results]);
     */
    function doWhilst(iteratee, test, callback) {
        callback = onlyOnce(callback || noop);
        var _iteratee = wrapAsync(iteratee);
        var next = function (err /*, ...args*/) {
            if (err)
                return callback(err);
            var args = slice(arguments, 1);
            if (test.apply(this, args))
                return _iteratee(next);
            callback.apply(null, [null].concat(args));
        };
        _iteratee(next);
    }
    /**
     * Like ['doWhilst']{@link module:ControlFlow.doWhilst}, except the `test` is inverted. Note the
     * argument ordering differs from `until`.
     *
     * @name doUntil
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.doWhilst]{@link module:ControlFlow.doWhilst}
     * @category Control Flow
     * @param {AsyncFunction} iteratee - An async function which is called each time
     * `test` fails. Invoked with (callback).
     * @param {Function} test - synchronous truth test to perform after each
     * execution of `iteratee`. Invoked with any non-error callback results of
     * `iteratee`.
     * @param {Function} [callback] - A callback which is called after the test
     * function has passed and repeated execution of `iteratee` has stopped. `callback`
     * will be passed an error and any arguments passed to the final `iteratee`'s
     * callback. Invoked with (err, [results]);
     */
    function doUntil(iteratee, test, callback) {
        doWhilst(iteratee, function () {
            return !test.apply(this, arguments);
        }, callback);
    }
    /**
     * Like [`whilst`]{@link module:ControlFlow.whilst}, except the `test` is an asynchronous function that
     * is passed a callback in the form of `function (err, truth)`. If error is
     * passed to `test` or `fn`, the main callback is immediately called with the
     * value of the error.
     *
     * @name during
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.whilst]{@link module:ControlFlow.whilst}
     * @category Control Flow
     * @param {AsyncFunction} test - asynchronous truth test to perform before each
     * execution of `fn`. Invoked with (callback).
     * @param {AsyncFunction} fn - An async function which is called each time
     * `test` passes. Invoked with (callback).
     * @param {Function} [callback] - A callback which is called after the test
     * function has failed and repeated execution of `fn` has stopped. `callback`
     * will be passed an error, if one occurred, otherwise `null`.
     * @example
     *
     * var count = 0;
     *
     * async.during(
     *     function (callback) {
     *         return callback(null, count < 5);
     *     },
     *     function (callback) {
     *         count++;
     *         setTimeout(callback, 1000);
     *     },
     *     function (err) {
     *         // 5 seconds have passed
     *     }
     * );
     */
    function during(test, fn, callback) {
        callback = onlyOnce(callback || noop);
        var _fn = wrapAsync(fn);
        var _test = wrapAsync(test);
        function next(err) {
            if (err)
                return callback(err);
            _test(check);
        }
        function check(err, truth) {
            if (err)
                return callback(err);
            if (!truth)
                return callback(null);
            _fn(next);
        }
        _test(check);
    }
    function _withoutIndex(iteratee) {
        return function (value, index, callback) {
            return iteratee(value, callback);
        };
    }
    /**
     * Applies the function `iteratee` to each item in `coll`, in parallel.
     * The `iteratee` is called with an item from the list, and a callback for when
     * it has finished. If the `iteratee` passes an error to its `callback`, the
     * main `callback` (for the `each` function) is immediately called with the
     * error.
     *
     * Note, that since this function applies `iteratee` to each item in parallel,
     * there is no guarantee that the iteratee functions will complete in order.
     *
     * @name each
     * @static
     * @memberOf module:Collections
     * @method
     * @alias forEach
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to
     * each item in `coll`. Invoked with (item, callback).
     * The array index is not passed to the iteratee.
     * If you need the index, use `eachOf`.
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     * @example
     *
     * // assuming openFiles is an array of file names and saveFile is a function
     * // to save the modified contents of that file:
     *
     * async.each(openFiles, saveFile, function(err){
     *   // if any of the saves produced an error, err would equal that error
     * });
     *
     * // assuming openFiles is an array of file names
     * async.each(openFiles, function(file, callback) {
     *
     *     // Perform operation on file here.
     *     console.log('Processing file ' + file);
     *
     *     if( file.length > 32 ) {
     *       console.log('This file name is too long');
     *       callback('File name too long');
     *     } else {
     *       // Do work to process file here
     *       console.log('File processed');
     *       callback();
     *     }
     * }, function(err) {
     *     // if any of the file processing produced an error, err would equal that error
     *     if( err ) {
     *       // One of the iterations produced an error.
     *       // All processing will now stop.
     *       console.log('A file failed to process');
     *     } else {
     *       console.log('All files have been processed successfully');
     *     }
     * });
     */
    function eachLimit(coll, iteratee, callback) {
        eachOf(coll, _withoutIndex(wrapAsync(iteratee)), callback);
    }
    /**
     * The same as [`each`]{@link module:Collections.each} but runs a maximum of `limit` async operations at a time.
     *
     * @name eachLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.each]{@link module:Collections.each}
     * @alias forEachLimit
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The array index is not passed to the iteratee.
     * If you need the index, use `eachOfLimit`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     */
    function eachLimit$1(coll, limit, iteratee, callback) {
        _eachOfLimit(limit)(coll, _withoutIndex(wrapAsync(iteratee)), callback);
    }
    /**
     * The same as [`each`]{@link module:Collections.each} but runs only a single async operation at a time.
     *
     * @name eachSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.each]{@link module:Collections.each}
     * @alias forEachSeries
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each
     * item in `coll`.
     * The array index is not passed to the iteratee.
     * If you need the index, use `eachOfSeries`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     */
    var eachSeries = doLimit(eachLimit$1, 1);
    /**
     * Wrap an async function and ensure it calls its callback on a later tick of
     * the event loop.  If the function already calls its callback on a next tick,
     * no extra deferral is added. This is useful for preventing stack overflows
     * (`RangeError: Maximum call stack size exceeded`) and generally keeping
     * [Zalgo](http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony)
     * contained. ES2017 `async` functions are returned as-is -- they are immune
     * to Zalgo's corrupting influences, as they always resolve on a later tick.
     *
     * @name ensureAsync
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} fn - an async function, one that expects a node-style
     * callback as its last argument.
     * @returns {AsyncFunction} Returns a wrapped function with the exact same call
     * signature as the function passed in.
     * @example
     *
     * function sometimesAsync(arg, callback) {
     *     if (cache[arg]) {
     *         return callback(null, cache[arg]); // this would be synchronous!!
     *     } else {
     *         doSomeIO(arg, callback); // this IO would be asynchronous
     *     }
     * }
     *
     * // this has a risk of stack overflows if many results are cached in a row
     * async.mapSeries(args, sometimesAsync, done);
     *
     * // this will defer sometimesAsync's callback if necessary,
     * // preventing stack overflows
     * async.mapSeries(args, async.ensureAsync(sometimesAsync), done);
     */
    function ensureAsync(fn) {
        if (isAsync(fn))
            return fn;
        return initialParams(function (args, callback) {
            var sync = true;
            args.push(function () {
                var innerArgs = arguments;
                if (sync) {
                    setImmediate$1(function () {
                        callback.apply(null, innerArgs);
                    });
                }
                else {
                    callback.apply(null, innerArgs);
                }
            });
            fn.apply(this, args);
            sync = false;
        });
    }
    function notId(v) {
        return !v;
    }
    /**
     * Returns `true` if every element in `coll` satisfies an async test. If any
     * iteratee call returns `false`, the main `callback` is immediately called.
     *
     * @name every
     * @static
     * @memberOf module:Collections
     * @method
     * @alias all
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collection in parallel.
     * The iteratee must complete with a boolean result value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result will be either `true` or `false`
     * depending on the values of the async tests. Invoked with (err, result).
     * @example
     *
     * async.every(['file1','file2','file3'], function(filePath, callback) {
     *     fs.access(filePath, function(err) {
     *         callback(null, !err)
     *     });
     * }, function(err, result) {
     *     // if result is true then every file exists
     * });
     */
    var every = doParallel(_createTester(notId, notId));
    /**
     * The same as [`every`]{@link module:Collections.every} but runs a maximum of `limit` async operations at a time.
     *
     * @name everyLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.every]{@link module:Collections.every}
     * @alias allLimit
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collection in parallel.
     * The iteratee must complete with a boolean result value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result will be either `true` or `false`
     * depending on the values of the async tests. Invoked with (err, result).
     */
    var everyLimit = doParallelLimit(_createTester(notId, notId));
    /**
     * The same as [`every`]{@link module:Collections.every} but runs only a single async operation at a time.
     *
     * @name everySeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.every]{@link module:Collections.every}
     * @alias allSeries
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collection in series.
     * The iteratee must complete with a boolean result value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result will be either `true` or `false`
     * depending on the values of the async tests. Invoked with (err, result).
     */
    var everySeries = doLimit(everyLimit, 1);
    /**
     * The base implementation of `_.property` without support for deep paths.
     *
     * @private
     * @param {string} key The key of the property to get.
     * @returns {Function} Returns the new accessor function.
     */
    function baseProperty(key) {
        return function (object) {
            return object == null ? undefined : object[key];
        };
    }
    function filterArray(eachfn, arr, iteratee, callback) {
        var truthValues = new Array(arr.length);
        eachfn(arr, function (x, index, callback) {
            iteratee(x, function (err, v) {
                truthValues[index] = !!v;
                callback(err);
            });
        }, function (err) {
            if (err)
                return callback(err);
            var results = [];
            for (var i = 0; i < arr.length; i++) {
                if (truthValues[i])
                    results.push(arr[i]);
            }
            callback(null, results);
        });
    }
    function filterGeneric(eachfn, coll, iteratee, callback) {
        var results = [];
        eachfn(coll, function (x, index, callback) {
            iteratee(x, function (err, v) {
                if (err) {
                    callback(err);
                }
                else {
                    if (v) {
                        results.push({ index: index, value: x });
                    }
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                callback(err);
            }
            else {
                callback(null, arrayMap(results.sort(function (a, b) {
                    return a.index - b.index;
                }), baseProperty('value')));
            }
        });
    }
    function _filter(eachfn, coll, iteratee, callback) {
        var filter = isArrayLike(coll) ? filterArray : filterGeneric;
        filter(eachfn, coll, wrapAsync(iteratee), callback || noop);
    }
    /**
     * Returns a new array of all the values in `coll` which pass an async truth
     * test. This operation is performed in parallel, but the results array will be
     * in the same order as the original.
     *
     * @name filter
     * @static
     * @memberOf module:Collections
     * @method
     * @alias select
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {Function} iteratee - A truth test to apply to each item in `coll`.
     * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
     * with a boolean argument once it has completed. Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     * @example
     *
     * async.filter(['file1','file2','file3'], function(filePath, callback) {
     *     fs.access(filePath, function(err) {
     *         callback(null, !err)
     *     });
     * }, function(err, results) {
     *     // results now equals an array of the existing files
     * });
     */
    var filter = doParallel(_filter);
    /**
     * The same as [`filter`]{@link module:Collections.filter} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name filterLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.filter]{@link module:Collections.filter}
     * @alias selectLimit
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {Function} iteratee - A truth test to apply to each item in `coll`.
     * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
     * with a boolean argument once it has completed. Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     */
    var filterLimit = doParallelLimit(_filter);
    /**
     * The same as [`filter`]{@link module:Collections.filter} but runs only a single async operation at a time.
     *
     * @name filterSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.filter]{@link module:Collections.filter}
     * @alias selectSeries
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {Function} iteratee - A truth test to apply to each item in `coll`.
     * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
     * with a boolean argument once it has completed. Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results)
     */
    var filterSeries = doLimit(filterLimit, 1);
    /**
     * Calls the asynchronous function `fn` with a callback parameter that allows it
     * to call itself again, in series, indefinitely.
    
     * If an error is passed to the callback then `errback` is called with the
     * error, and execution stops, otherwise it will never be called.
     *
     * @name forever
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {AsyncFunction} fn - an async function to call repeatedly.
     * Invoked with (next).
     * @param {Function} [errback] - when `fn` passes an error to it's callback,
     * this function will be called, and execution stops. Invoked with (err).
     * @example
     *
     * async.forever(
     *     function(next) {
     *         // next is suitable for passing to things that need a callback(err [, whatever]);
     *         // it will result in this function being called again.
     *     },
     *     function(err) {
     *         // if next is called with a value in its first parameter, it will appear
     *         // in here as 'err', and execution will stop.
     *     }
     * );
     */
    function forever(fn, errback) {
        var done = onlyOnce(errback || noop);
        var task = wrapAsync(ensureAsync(fn));
        function next(err) {
            if (err)
                return done(err);
            task(next);
        }
        next();
    }
    /**
     * The same as [`groupBy`]{@link module:Collections.groupBy} but runs a maximum of `limit` async operations at a time.
     *
     * @name groupByLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.groupBy]{@link module:Collections.groupBy}
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with a `key` to group the value under.
     * Invoked with (value, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Result is an `Object` whoses
     * properties are arrays of values which returned the corresponding key.
     */
    var groupByLimit = function (coll, limit, iteratee, callback) {
        callback = callback || noop;
        var _iteratee = wrapAsync(iteratee);
        mapLimit(coll, limit, function (val, callback) {
            _iteratee(val, function (err, key) {
                if (err)
                    return callback(err);
                return callback(null, { key: key, val: val });
            });
        }, function (err, mapResults) {
            var result = {};
            // from MDN, handle object having an `hasOwnProperty` prop
            var hasOwnProperty = Object.prototype.hasOwnProperty;
            for (var i = 0; i < mapResults.length; i++) {
                if (mapResults[i]) {
                    var key = mapResults[i].key;
                    var val = mapResults[i].val;
                    if (hasOwnProperty.call(result, key)) {
                        result[key].push(val);
                    }
                    else {
                        result[key] = [val];
                    }
                }
            }
            return callback(err, result);
        });
    };
    /**
     * Returns a new object, where each value corresponds to an array of items, from
     * `coll`, that returned the corresponding key. That is, the keys of the object
     * correspond to the values passed to the `iteratee` callback.
     *
     * Note: Since this function applies the `iteratee` to each item in parallel,
     * there is no guarantee that the `iteratee` functions will complete in order.
     * However, the values for each key in the `result` will be in the same order as
     * the original `coll`. For Objects, the values will roughly be in the order of
     * the original Objects' keys (but this can vary across JavaScript engines).
     *
     * @name groupBy
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with a `key` to group the value under.
     * Invoked with (value, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Result is an `Object` whoses
     * properties are arrays of values which returned the corresponding key.
     * @example
     *
     * async.groupBy(['userId1', 'userId2', 'userId3'], function(userId, callback) {
     *     db.findById(userId, function(err, user) {
     *         if (err) return callback(err);
     *         return callback(null, user.age);
     *     });
     * }, function(err, result) {
     *     // result is object containing the userIds grouped by age
     *     // e.g. { 30: ['userId1', 'userId3'], 42: ['userId2']};
     * });
     */
    var groupBy = doLimit(groupByLimit, Infinity);
    /**
     * The same as [`groupBy`]{@link module:Collections.groupBy} but runs only a single async operation at a time.
     *
     * @name groupBySeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.groupBy]{@link module:Collections.groupBy}
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with a `key` to group the value under.
     * Invoked with (value, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Result is an `Object` whoses
     * properties are arrays of values which returned the corresponding key.
     */
    var groupBySeries = doLimit(groupByLimit, 1);
    /**
     * Logs the result of an `async` function to the `console`. Only works in
     * Node.js or in browsers that support `console.log` and `console.error` (such
     * as FF and Chrome). If multiple arguments are returned from the async
     * function, `console.log` is called on each argument in order.
     *
     * @name log
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} function - The function you want to eventually apply
     * all arguments to.
     * @param {...*} arguments... - Any number of arguments to apply to the function.
     * @example
     *
     * // in a module
     * var hello = function(name, callback) {
     *     setTimeout(function() {
     *         callback(null, 'hello ' + name);
     *     }, 1000);
     * };
     *
     * // in the node repl
     * node> async.log(hello, 'world');
     * 'hello world'
     */
    var log = consoleFunc('log');
    /**
     * The same as [`mapValues`]{@link module:Collections.mapValues} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name mapValuesLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.mapValues]{@link module:Collections.mapValues}
     * @category Collection
     * @param {Object} obj - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - A function to apply to each value and key
     * in `coll`.
     * The iteratee should complete with the transformed value as its result.
     * Invoked with (value, key, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. `result` is a new object consisting
     * of each key from `obj`, with each transformed value on the right-hand side.
     * Invoked with (err, result).
     */
    function mapValuesLimit(obj, limit, iteratee, callback) {
        callback = once(callback || noop);
        var newObj = {};
        var _iteratee = wrapAsync(iteratee);
        eachOfLimit(obj, limit, function (val, key, next) {
            _iteratee(val, key, function (err, result) {
                if (err)
                    return next(err);
                newObj[key] = result;
                next();
            });
        }, function (err) {
            callback(err, newObj);
        });
    }
    /**
     * A relative of [`map`]{@link module:Collections.map}, designed for use with objects.
     *
     * Produces a new Object by mapping each value of `obj` through the `iteratee`
     * function. The `iteratee` is called each `value` and `key` from `obj` and a
     * callback for when it has finished processing. Each of these callbacks takes
     * two arguments: an `error`, and the transformed item from `obj`. If `iteratee`
     * passes an error to its callback, the main `callback` (for the `mapValues`
     * function) is immediately called with the error.
     *
     * Note, the order of the keys in the result is not guaranteed.  The keys will
     * be roughly in the order they complete, (but this is very engine-specific)
     *
     * @name mapValues
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Object} obj - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each value and key
     * in `coll`.
     * The iteratee should complete with the transformed value as its result.
     * Invoked with (value, key, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. `result` is a new object consisting
     * of each key from `obj`, with each transformed value on the right-hand side.
     * Invoked with (err, result).
     * @example
     *
     * async.mapValues({
     *     f1: 'file1',
     *     f2: 'file2',
     *     f3: 'file3'
     * }, function (file, key, callback) {
     *   fs.stat(file, callback);
     * }, function(err, result) {
     *     // result is now a map of stats for each file, e.g.
     *     // {
     *     //     f1: [stats for file1],
     *     //     f2: [stats for file2],
     *     //     f3: [stats for file3]
     *     // }
     * });
     */
    var mapValues = doLimit(mapValuesLimit, Infinity);
    /**
     * The same as [`mapValues`]{@link module:Collections.mapValues} but runs only a single async operation at a time.
     *
     * @name mapValuesSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.mapValues]{@link module:Collections.mapValues}
     * @category Collection
     * @param {Object} obj - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each value and key
     * in `coll`.
     * The iteratee should complete with the transformed value as its result.
     * Invoked with (value, key, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. `result` is a new object consisting
     * of each key from `obj`, with each transformed value on the right-hand side.
     * Invoked with (err, result).
     */
    var mapValuesSeries = doLimit(mapValuesLimit, 1);
    function has(obj, key) {
        return key in obj;
    }
    /**
     * Caches the results of an async function. When creating a hash to store
     * function results against, the callback is omitted from the hash and an
     * optional hash function can be used.
     *
     * If no hash function is specified, the first argument is used as a hash key,
     * which may work reasonably if it is a string or a data type that converts to a
     * distinct string. Note that objects and arrays will not behave reasonably.
     * Neither will cases where the other arguments are significant. In such cases,
     * specify your own hash function.
     *
     * The cache of results is exposed as the `memo` property of the function
     * returned by `memoize`.
     *
     * @name memoize
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} fn - The async function to proxy and cache results from.
     * @param {Function} hasher - An optional function for generating a custom hash
     * for storing results. It has all the arguments applied to it apart from the
     * callback, and must be synchronous.
     * @returns {AsyncFunction} a memoized version of `fn`
     * @example
     *
     * var slow_fn = function(name, callback) {
     *     // do something
     *     callback(null, result);
     * };
     * var fn = async.memoize(slow_fn);
     *
     * // fn can now be used as if it were slow_fn
     * fn('some name', function() {
     *     // callback
     * });
     */
    function memoize(fn, hasher) {
        var memo = Object.create(null);
        var queues = Object.create(null);
        hasher = hasher || identity;
        var _fn = wrapAsync(fn);
        var memoized = initialParams(function memoized(args, callback) {
            var key = hasher.apply(null, args);
            if (has(memo, key)) {
                setImmediate$1(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (has(queues, key)) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                _fn.apply(null, args.concat(function () {
                    var args = slice(arguments);
                    memo[key] = args;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                        q[i].apply(null, args);
                    }
                }));
            }
        });
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    }
    /**
     * Calls `callback` on a later loop around the event loop. In Node.js this just
     * calls `setImmediate`.  In the browser it will use `setImmediate` if
     * available, otherwise `setTimeout(callback, 0)`, which means other higher
     * priority events may precede the execution of `callback`.
     *
     * This is used internally for browser-compatibility purposes.
     *
     * @name nextTick
     * @static
     * @memberOf module:Utils
     * @method
     * @alias setImmediate
     * @category Util
     * @param {Function} callback - The function to call on a later loop around
     * the event loop. Invoked with (args...).
     * @param {...*} args... - any number of additional arguments to pass to the
     * callback on the next tick.
     * @example
     *
     * var call_order = [];
     * async.nextTick(function() {
     *     call_order.push('two');
     *     // call_order now equals ['one','two']
     * });
     * call_order.push('one');
     *
     * async.setImmediate(function (a, b, c) {
     *     // a, b, and c equal 1, 2, and 3
     * }, 1, 2, 3);
     */
    var _defer$1;
    if (hasNextTick) {
        _defer$1 = process.nextTick;
    }
    else if (hasSetImmediate) {
        _defer$1 = setImmediate;
    }
    else {
        _defer$1 = fallback;
    }
    var nextTick = wrap(_defer$1);
    function _parallel(eachfn, tasks, callback) {
        callback = callback || noop;
        var results = isArrayLike(tasks) ? [] : {};
        eachfn(tasks, function (task, key, callback) {
            wrapAsync(task)(function (err, result) {
                if (arguments.length > 2) {
                    result = slice(arguments, 1);
                }
                results[key] = result;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    }
    /**
     * Run the `tasks` collection of functions in parallel, without waiting until
     * the previous function has completed. If any of the functions pass an error to
     * its callback, the main `callback` is immediately called with the value of the
     * error. Once the `tasks` have completed, the results are passed to the final
     * `callback` as an array.
     *
     * **Note:** `parallel` is about kicking-off I/O tasks in parallel, not about
     * parallel execution of code.  If your tasks do not use any timers or perform
     * any I/O, they will actually be executed in series.  Any synchronous setup
     * sections for each task will happen one after the other.  JavaScript remains
     * single-threaded.
     *
     * **Hint:** Use [`reflect`]{@link module:Utils.reflect} to continue the
     * execution of other tasks when a task fails.
     *
     * It is also possible to use an object instead of an array. Each property will
     * be run as a function and the results will be passed to the final `callback`
     * as an object instead of an array. This can be a more readable way of handling
     * results from {@link async.parallel}.
     *
     * @name parallel
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array|Iterable|Object} tasks - A collection of
     * [async functions]{@link AsyncFunction} to run.
     * Each async function can complete with any number of optional `result` values.
     * @param {Function} [callback] - An optional callback to run once all the
     * functions have completed successfully. This function gets a results array
     * (or object) containing all the result arguments passed to the task callbacks.
     * Invoked with (err, results).
     *
     * @example
     * async.parallel([
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ],
     * // optional callback
     * function(err, results) {
     *     // the results array will equal ['one','two'] even though
     *     // the second function had a shorter timeout.
     * });
     *
     * // an example using an object instead of an array
     * async.parallel({
     *     one: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 1);
     *         }, 200);
     *     },
     *     two: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 2);
     *         }, 100);
     *     }
     * }, function(err, results) {
     *     // results is now equals to: {one: 1, two: 2}
     * });
     */
    function parallelLimit(tasks, callback) {
        _parallel(eachOf, tasks, callback);
    }
    /**
     * The same as [`parallel`]{@link module:ControlFlow.parallel} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name parallelLimit
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.parallel]{@link module:ControlFlow.parallel}
     * @category Control Flow
     * @param {Array|Iterable|Object} tasks - A collection of
     * [async functions]{@link AsyncFunction} to run.
     * Each async function can complete with any number of optional `result` values.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {Function} [callback] - An optional callback to run once all the
     * functions have completed successfully. This function gets a results array
     * (or object) containing all the result arguments passed to the task callbacks.
     * Invoked with (err, results).
     */
    function parallelLimit$1(tasks, limit, callback) {
        _parallel(_eachOfLimit(limit), tasks, callback);
    }
    /**
     * A queue of tasks for the worker function to complete.
     * @typedef {Object} QueueObject
     * @memberOf module:ControlFlow
     * @property {Function} length - a function returning the number of items
     * waiting to be processed. Invoke with `queue.length()`.
     * @property {boolean} started - a boolean indicating whether or not any
     * items have been pushed and processed by the queue.
     * @property {Function} running - a function returning the number of items
     * currently being processed. Invoke with `queue.running()`.
     * @property {Function} workersList - a function returning the array of items
     * currently being processed. Invoke with `queue.workersList()`.
     * @property {Function} idle - a function returning false if there are items
     * waiting or being processed, or true if not. Invoke with `queue.idle()`.
     * @property {number} concurrency - an integer for determining how many `worker`
     * functions should be run in parallel. This property can be changed after a
     * `queue` is created to alter the concurrency on-the-fly.
     * @property {Function} push - add a new task to the `queue`. Calls `callback`
     * once the `worker` has finished processing the task. Instead of a single task,
     * a `tasks` array can be submitted. The respective callback is used for every
     * task in the list. Invoke with `queue.push(task, [callback])`,
     * @property {Function} unshift - add a new task to the front of the `queue`.
     * Invoke with `queue.unshift(task, [callback])`.
     * @property {Function} remove - remove items from the queue that match a test
     * function.  The test function will be passed an object with a `data` property,
     * and a `priority` property, if this is a
     * [priorityQueue]{@link module:ControlFlow.priorityQueue} object.
     * Invoked with `queue.remove(testFn)`, where `testFn` is of the form
     * `function ({data, priority}) {}` and returns a Boolean.
     * @property {Function} saturated - a callback that is called when the number of
     * running workers hits the `concurrency` limit, and further tasks will be
     * queued.
     * @property {Function} unsaturated - a callback that is called when the number
     * of running workers is less than the `concurrency` & `buffer` limits, and
     * further tasks will not be queued.
     * @property {number} buffer - A minimum threshold buffer in order to say that
     * the `queue` is `unsaturated`.
     * @property {Function} empty - a callback that is called when the last item
     * from the `queue` is given to a `worker`.
     * @property {Function} drain - a callback that is called when the last item
     * from the `queue` has returned from the `worker`.
     * @property {Function} error - a callback that is called when a task errors.
     * Has the signature `function(error, task)`.
     * @property {boolean} paused - a boolean for determining whether the queue is
     * in a paused state.
     * @property {Function} pause - a function that pauses the processing of tasks
     * until `resume()` is called. Invoke with `queue.pause()`.
     * @property {Function} resume - a function that resumes the processing of
     * queued tasks when the queue is paused. Invoke with `queue.resume()`.
     * @property {Function} kill - a function that removes the `drain` callback and
     * empties remaining tasks from the queue forcing it to go idle. No more tasks
     * should be pushed to the queue after calling this function. Invoke with `queue.kill()`.
     */
    /**
     * Creates a `queue` object with the specified `concurrency`. Tasks added to the
     * `queue` are processed in parallel (up to the `concurrency` limit). If all
     * `worker`s are in progress, the task is queued until one becomes available.
     * Once a `worker` completes a `task`, that `task`'s callback is called.
     *
     * @name queue
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {AsyncFunction} worker - An async function for processing a queued task.
     * If you want to handle errors from an individual task, pass a callback to
     * `q.push()`. Invoked with (task, callback).
     * @param {number} [concurrency=1] - An `integer` for determining how many
     * `worker` functions should be run in parallel.  If omitted, the concurrency
     * defaults to `1`.  If the concurrency is `0`, an error is thrown.
     * @returns {module:ControlFlow.QueueObject} A queue object to manage the tasks. Callbacks can
     * attached as certain properties to listen for specific events during the
     * lifecycle of the queue.
     * @example
     *
     * // create a queue object with concurrency 2
     * var q = async.queue(function(task, callback) {
     *     console.log('hello ' + task.name);
     *     callback();
     * }, 2);
     *
     * // assign a callback
     * q.drain = function() {
     *     console.log('all items have been processed');
     * };
     *
     * // add some items to the queue
     * q.push({name: 'foo'}, function(err) {
     *     console.log('finished processing foo');
     * });
     * q.push({name: 'bar'}, function (err) {
     *     console.log('finished processing bar');
     * });
     *
     * // add some items to the queue (batch-wise)
     * q.push([{name: 'baz'},{name: 'bay'},{name: 'bax'}], function(err) {
     *     console.log('finished processing item');
     * });
     *
     * // add some items to the front of the queue
     * q.unshift({name: 'bar'}, function (err) {
     *     console.log('finished processing bar');
     * });
     */
    var queue$1 = function (worker, concurrency) {
        var _worker = wrapAsync(worker);
        return queue(function (items, cb) {
            _worker(items[0], cb);
        }, concurrency, 1);
    };
    /**
     * The same as [async.queue]{@link module:ControlFlow.queue} only tasks are assigned a priority and
     * completed in ascending priority order.
     *
     * @name priorityQueue
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.queue]{@link module:ControlFlow.queue}
     * @category Control Flow
     * @param {AsyncFunction} worker - An async function for processing a queued task.
     * If you want to handle errors from an individual task, pass a callback to
     * `q.push()`.
     * Invoked with (task, callback).
     * @param {number} concurrency - An `integer` for determining how many `worker`
     * functions should be run in parallel.  If omitted, the concurrency defaults to
     * `1`.  If the concurrency is `0`, an error is thrown.
     * @returns {module:ControlFlow.QueueObject} A priorityQueue object to manage the tasks. There are two
     * differences between `queue` and `priorityQueue` objects:
     * * `push(task, priority, [callback])` - `priority` should be a number. If an
     *   array of `tasks` is given, all tasks will be assigned the same priority.
     * * The `unshift` method was removed.
     */
    var priorityQueue = function (worker, concurrency) {
        // Start with a normal queue
        var q = queue$1(worker, concurrency);
        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
            if (callback == null)
                callback = noop;
            if (typeof callback !== 'function') {
                throw new Error('task callback must be a function');
            }
            q.started = true;
            if (!isArray(data)) {
                data = [data];
            }
            if (data.length === 0) {
                // call drain immediately if there are no tasks
                return setImmediate$1(function () {
                    q.drain();
                });
            }
            priority = priority || 0;
            var nextNode = q._tasks.head;
            while (nextNode && priority >= nextNode.priority) {
                nextNode = nextNode.next;
            }
            for (var i = 0, l = data.length; i < l; i++) {
                var item = {
                    data: data[i],
                    priority: priority,
                    callback: callback
                };
                if (nextNode) {
                    q._tasks.insertBefore(nextNode, item);
                }
                else {
                    q._tasks.push(item);
                }
            }
            setImmediate$1(q.process);
        };
        // Remove unshift function
        delete q.unshift;
        return q;
    };
    /**
     * Runs the `tasks` array of functions in parallel, without waiting until the
     * previous function has completed. Once any of the `tasks` complete or pass an
     * error to its callback, the main `callback` is immediately called. It's
     * equivalent to `Promise.race()`.
     *
     * @name race
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array} tasks - An array containing [async functions]{@link AsyncFunction}
     * to run. Each function can complete with an optional `result` value.
     * @param {Function} callback - A callback to run once any of the functions have
     * completed. This function gets an error or result from the first function that
     * completed. Invoked with (err, result).
     * @returns undefined
     * @example
     *
     * async.race([
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ],
     * // main callback
     * function(err, result) {
     *     // the result will be equal to 'two' as it finishes earlier
     * });
     */
    function race(tasks, callback) {
        callback = once(callback || noop);
        if (!isArray(tasks))
            return callback(new TypeError('First argument to race must be an array of functions'));
        if (!tasks.length)
            return callback();
        for (var i = 0, l = tasks.length; i < l; i++) {
            wrapAsync(tasks[i])(callback);
        }
    }
    /**
     * Same as [`reduce`]{@link module:Collections.reduce}, only operates on `array` in reverse order.
     *
     * @name reduceRight
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.reduce]{@link module:Collections.reduce}
     * @alias foldr
     * @category Collection
     * @param {Array} array - A collection to iterate over.
     * @param {*} memo - The initial state of the reduction.
     * @param {AsyncFunction} iteratee - A function applied to each item in the
     * array to produce the next step in the reduction.
     * The `iteratee` should complete with the next state of the reduction.
     * If the iteratee complete with an error, the reduction is stopped and the
     * main `callback` is immediately called with the error.
     * Invoked with (memo, item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result is the reduced value. Invoked with
     * (err, result).
     */
    function reduceRight(array, memo, iteratee, callback) {
        var reversed = slice(array).reverse();
        reduce(reversed, memo, iteratee, callback);
    }
    /**
     * Wraps the async function in another function that always completes with a
     * result object, even when it errors.
     *
     * The result object has either the property `error` or `value`.
     *
     * @name reflect
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} fn - The async function you want to wrap
     * @returns {Function} - A function that always passes null to it's callback as
     * the error. The second argument to the callback will be an `object` with
     * either an `error` or a `value` property.
     * @example
     *
     * async.parallel([
     *     async.reflect(function(callback) {
     *         // do some stuff ...
     *         callback(null, 'one');
     *     }),
     *     async.reflect(function(callback) {
     *         // do some more stuff but error ...
     *         callback('bad stuff happened');
     *     }),
     *     async.reflect(function(callback) {
     *         // do some more stuff ...
     *         callback(null, 'two');
     *     })
     * ],
     * // optional callback
     * function(err, results) {
     *     // values
     *     // results[0].value = 'one'
     *     // results[1].error = 'bad stuff happened'
     *     // results[2].value = 'two'
     * });
     */
    function reflect(fn) {
        var _fn = wrapAsync(fn);
        return initialParams(function reflectOn(args, reflectCallback) {
            args.push(function callback(error, cbArg) {
                if (error) {
                    reflectCallback(null, { error: error });
                }
                else {
                    var value;
                    if (arguments.length <= 2) {
                        value = cbArg;
                    }
                    else {
                        value = slice(arguments, 1);
                    }
                    reflectCallback(null, { value: value });
                }
            });
            return _fn.apply(this, args);
        });
    }
    function reject$1(eachfn, arr, iteratee, callback) {
        _filter(eachfn, arr, function (value, cb) {
            iteratee(value, function (err, v) {
                cb(err, !v);
            });
        }, callback);
    }
    /**
     * The opposite of [`filter`]{@link module:Collections.filter}. Removes values that pass an `async` truth test.
     *
     * @name reject
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.filter]{@link module:Collections.filter}
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {Function} iteratee - An async truth test to apply to each item in
     * `coll`.
     * The should complete with a boolean value as its `result`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     * @example
     *
     * async.reject(['file1','file2','file3'], function(filePath, callback) {
     *     fs.access(filePath, function(err) {
     *         callback(null, !err)
     *     });
     * }, function(err, results) {
     *     // results now equals an array of missing files
     *     createFiles(results);
     * });
     */
    var reject = doParallel(reject$1);
    /**
     * A helper function that wraps an array or an object of functions with `reflect`.
     *
     * @name reflectAll
     * @static
     * @memberOf module:Utils
     * @method
     * @see [async.reflect]{@link module:Utils.reflect}
     * @category Util
     * @param {Array|Object|Iterable} tasks - The collection of
     * [async functions]{@link AsyncFunction} to wrap in `async.reflect`.
     * @returns {Array} Returns an array of async functions, each wrapped in
     * `async.reflect`
     * @example
     *
     * let tasks = [
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         // do some more stuff but error ...
     *         callback(new Error('bad stuff happened'));
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ];
     *
     * async.parallel(async.reflectAll(tasks),
     * // optional callback
     * function(err, results) {
     *     // values
     *     // results[0].value = 'one'
     *     // results[1].error = Error('bad stuff happened')
     *     // results[2].value = 'two'
     * });
     *
     * // an example using an object instead of an array
     * let tasks = {
     *     one: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     two: function(callback) {
     *         callback('two');
     *     },
     *     three: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'three');
     *         }, 100);
     *     }
     * };
     *
     * async.parallel(async.reflectAll(tasks),
     * // optional callback
     * function(err, results) {
     *     // values
     *     // results.one.value = 'one'
     *     // results.two.error = 'two'
     *     // results.three.value = 'three'
     * });
     */
    function reflectAll(tasks) {
        var results;
        if (isArray(tasks)) {
            results = arrayMap(tasks, reflect);
        }
        else {
            results = {};
            baseForOwn(tasks, function (task, key) {
                results[key] = reflect.call(this, task);
            });
        }
        return results;
    }
    /**
     * The same as [`reject`]{@link module:Collections.reject} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name rejectLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.reject]{@link module:Collections.reject}
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {Function} iteratee - An async truth test to apply to each item in
     * `coll`.
     * The should complete with a boolean value as its `result`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     */
    var rejectLimit = doParallelLimit(reject$1);
    /**
     * The same as [`reject`]{@link module:Collections.reject} but runs only a single async operation at a time.
     *
     * @name rejectSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.reject]{@link module:Collections.reject}
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {Function} iteratee - An async truth test to apply to each item in
     * `coll`.
     * The should complete with a boolean value as its `result`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     */
    var rejectSeries = doLimit(rejectLimit, 1);
    /**
     * Creates a function that returns `value`.
     *
     * @static
     * @memberOf _
     * @since 2.4.0
     * @category Util
     * @param {*} value The value to return from the new function.
     * @returns {Function} Returns the new constant function.
     * @example
     *
     * var objects = _.times(2, _.constant({ 'a': 1 }));
     *
     * console.log(objects);
     * // => [{ 'a': 1 }, { 'a': 1 }]
     *
     * console.log(objects[0] === objects[1]);
     * // => true
     */
    function constant$1(value) {
        return function () {
            return value;
        };
    }
    /**
     * Attempts to get a successful response from `task` no more than `times` times
     * before returning an error. If the task is successful, the `callback` will be
     * passed the result of the successful task. If all attempts fail, the callback
     * will be passed the error and result (if any) of the final attempt.
     *
     * @name retry
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @see [async.retryable]{@link module:ControlFlow.retryable}
     * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - Can be either an
     * object with `times` and `interval` or a number.
     * * `times` - The number of attempts to make before giving up.  The default
     *   is `5`.
     * * `interval` - The time to wait between retries, in milliseconds.  The
     *   default is `0`. The interval may also be specified as a function of the
     *   retry count (see example).
     * * `errorFilter` - An optional synchronous function that is invoked on
     *   erroneous result. If it returns `true` the retry attempts will continue;
     *   if the function returns `false` the retry flow is aborted with the current
     *   attempt's error and result being returned to the final callback.
     *   Invoked with (err).
     * * If `opts` is a number, the number specifies the number of times to retry,
     *   with the default interval of `0`.
     * @param {AsyncFunction} task - An async function to retry.
     * Invoked with (callback).
     * @param {Function} [callback] - An optional callback which is called when the
     * task has succeeded, or after the final failed attempt. It receives the `err`
     * and `result` arguments of the last attempt at completing the `task`. Invoked
     * with (err, results).
     *
     * @example
     *
     * // The `retry` function can be used as a stand-alone control flow by passing
     * // a callback, as shown below:
     *
     * // try calling apiMethod 3 times
     * async.retry(3, apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // try calling apiMethod 3 times, waiting 200 ms between each retry
     * async.retry({times: 3, interval: 200}, apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // try calling apiMethod 10 times with exponential backoff
     * // (i.e. intervals of 100, 200, 400, 800, 1600, ... milliseconds)
     * async.retry({
     *   times: 10,
     *   interval: function(retryCount) {
     *     return 50 * Math.pow(2, retryCount);
     *   }
     * }, apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // try calling apiMethod the default 5 times no delay between each retry
     * async.retry(apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // try calling apiMethod only when error condition satisfies, all other
     * // errors will abort the retry control flow and return to final callback
     * async.retry({
     *   errorFilter: function(err) {
     *     return err.message === 'Temporary error'; // only retry on a specific error
     *   }
     * }, apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // It can also be embedded within other control flow functions to retry
     * // individual methods that are not as reliable, like this:
     * async.auto({
     *     users: api.getUsers.bind(api),
     *     payments: async.retryable(3, api.getPayments.bind(api))
     * }, function(err, results) {
     *     // do something with the results
     * });
     *
     */
    function retry(opts, task, callback) {
        var DEFAULT_TIMES = 5;
        var DEFAULT_INTERVAL = 0;
        var options = {
            times: DEFAULT_TIMES,
            intervalFunc: constant$1(DEFAULT_INTERVAL)
        };
        function parseTimes(acc, t) {
            if (typeof t === 'object') {
                acc.times = +t.times || DEFAULT_TIMES;
                acc.intervalFunc = typeof t.interval === 'function' ?
                    t.interval :
                    constant$1(+t.interval || DEFAULT_INTERVAL);
                acc.errorFilter = t.errorFilter;
            }
            else if (typeof t === 'number' || typeof t === 'string') {
                acc.times = +t || DEFAULT_TIMES;
            }
            else {
                throw new Error("Invalid arguments for async.retry");
            }
        }
        if (arguments.length < 3 && typeof opts === 'function') {
            callback = task || noop;
            task = opts;
        }
        else {
            parseTimes(options, opts);
            callback = callback || noop;
        }
        if (typeof task !== 'function') {
            throw new Error("Invalid arguments for async.retry");
        }
        var _task = wrapAsync(task);
        var attempt = 1;
        function retryAttempt() {
            _task(function (err) {
                if (err && attempt++ < options.times &&
                    (typeof options.errorFilter != 'function' ||
                        options.errorFilter(err))) {
                    setTimeout(retryAttempt, options.intervalFunc(attempt));
                }
                else {
                    callback.apply(null, arguments);
                }
            });
        }
        retryAttempt();
    }
    /**
     * A close relative of [`retry`]{@link module:ControlFlow.retry}.  This method
     * wraps a task and makes it retryable, rather than immediately calling it
     * with retries.
     *
     * @name retryable
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.retry]{@link module:ControlFlow.retry}
     * @category Control Flow
     * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - optional
     * options, exactly the same as from `retry`
     * @param {AsyncFunction} task - the asynchronous function to wrap.
     * This function will be passed any arguments passed to the returned wrapper.
     * Invoked with (...args, callback).
     * @returns {AsyncFunction} The wrapped function, which when invoked, will
     * retry on an error, based on the parameters specified in `opts`.
     * This function will accept the same parameters as `task`.
     * @example
     *
     * async.auto({
     *     dep1: async.retryable(3, getFromFlakyService),
     *     process: ["dep1", async.retryable(3, function (results, cb) {
     *         maybeProcessData(results.dep1, cb);
     *     })]
     * }, callback);
     */
    var retryable = function (opts, task) {
        if (!task) {
            task = opts;
            opts = null;
        }
        var _task = wrapAsync(task);
        return initialParams(function (args, callback) {
            function taskFn(cb) {
                _task.apply(null, args.concat(cb));
            }
            if (opts)
                retry(opts, taskFn, callback);
            else
                retry(taskFn, callback);
        });
    };
    /**
     * Run the functions in the `tasks` collection in series, each one running once
     * the previous function has completed. If any functions in the series pass an
     * error to its callback, no more functions are run, and `callback` is
     * immediately called with the value of the error. Otherwise, `callback`
     * receives an array of results when `tasks` have completed.
     *
     * It is also possible to use an object instead of an array. Each property will
     * be run as a function, and the results will be passed to the final `callback`
     * as an object instead of an array. This can be a more readable way of handling
     *  results from {@link async.series}.
     *
     * **Note** that while many implementations preserve the order of object
     * properties, the [ECMAScript Language Specification](http://www.ecma-international.org/ecma-262/5.1/#sec-8.6)
     * explicitly states that
     *
     * > The mechanics and order of enumerating the properties is not specified.
     *
     * So if you rely on the order in which your series of functions are executed,
     * and want this to work on all platforms, consider using an array.
     *
     * @name series
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array|Iterable|Object} tasks - A collection containing
     * [async functions]{@link AsyncFunction} to run in series.
     * Each function can complete with any number of optional `result` values.
     * @param {Function} [callback] - An optional callback to run once all the
     * functions have completed. This function gets a results array (or object)
     * containing all the result arguments passed to the `task` callbacks. Invoked
     * with (err, result).
     * @example
     * async.series([
     *     function(callback) {
     *         // do some stuff ...
     *         callback(null, 'one');
     *     },
     *     function(callback) {
     *         // do some more stuff ...
     *         callback(null, 'two');
     *     }
     * ],
     * // optional callback
     * function(err, results) {
     *     // results is now equal to ['one', 'two']
     * });
     *
     * async.series({
     *     one: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 1);
     *         }, 200);
     *     },
     *     two: function(callback){
     *         setTimeout(function() {
     *             callback(null, 2);
     *         }, 100);
     *     }
     * }, function(err, results) {
     *     // results is now equal to: {one: 1, two: 2}
     * });
     */
    function series(tasks, callback) {
        _parallel(eachOfSeries, tasks, callback);
    }
    /**
     * Returns `true` if at least one element in the `coll` satisfies an async test.
     * If any iteratee call returns `true`, the main `callback` is immediately
     * called.
     *
     * @name some
     * @static
     * @memberOf module:Collections
     * @method
     * @alias any
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collections in parallel.
     * The iteratee should complete with a boolean `result` value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the iteratee functions have finished.
     * Result will be either `true` or `false` depending on the values of the async
     * tests. Invoked with (err, result).
     * @example
     *
     * async.some(['file1','file2','file3'], function(filePath, callback) {
     *     fs.access(filePath, function(err) {
     *         callback(null, !err)
     *     });
     * }, function(err, result) {
     *     // if result is true then at least one of the files exists
     * });
     */
    var some = doParallel(_createTester(Boolean, identity));
    /**
     * The same as [`some`]{@link module:Collections.some} but runs a maximum of `limit` async operations at a time.
     *
     * @name someLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.some]{@link module:Collections.some}
     * @alias anyLimit
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collections in parallel.
     * The iteratee should complete with a boolean `result` value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the iteratee functions have finished.
     * Result will be either `true` or `false` depending on the values of the async
     * tests. Invoked with (err, result).
     */
    var someLimit = doParallelLimit(_createTester(Boolean, identity));
    /**
     * The same as [`some`]{@link module:Collections.some} but runs only a single async operation at a time.
     *
     * @name someSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.some]{@link module:Collections.some}
     * @alias anySeries
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collections in series.
     * The iteratee should complete with a boolean `result` value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the iteratee functions have finished.
     * Result will be either `true` or `false` depending on the values of the async
     * tests. Invoked with (err, result).
     */
    var someSeries = doLimit(someLimit, 1);
    /**
     * Sorts a list by the results of running each `coll` value through an async
     * `iteratee`.
     *
     * @name sortBy
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with a value to use as the sort criteria as
     * its `result`.
     * Invoked with (item, callback).
     * @param {Function} callback - A callback which is called after all the
     * `iteratee` functions have finished, or an error occurs. Results is the items
     * from the original `coll` sorted by the values returned by the `iteratee`
     * calls. Invoked with (err, results).
     * @example
     *
     * async.sortBy(['file1','file2','file3'], function(file, callback) {
     *     fs.stat(file, function(err, stats) {
     *         callback(err, stats.mtime);
     *     });
     * }, function(err, results) {
     *     // results is now the original array of files sorted by
     *     // modified date
     * });
     *
     * // By modifying the callback parameter the
     * // sorting order can be influenced:
     *
     * // ascending order
     * async.sortBy([1,9,3,5], function(x, callback) {
     *     callback(null, x);
     * }, function(err,result) {
     *     // result callback
     * });
     *
     * // descending order
     * async.sortBy([1,9,3,5], function(x, callback) {
     *     callback(null, x*-1);    //<- x*-1 instead of x, turns the order around
     * }, function(err,result) {
     *     // result callback
     * });
     */
    function sortBy(coll, iteratee, callback) {
        var _iteratee = wrapAsync(iteratee);
        map(coll, function (x, callback) {
            _iteratee(x, function (err, criteria) {
                if (err)
                    return callback(err);
                callback(null, { value: x, criteria: criteria });
            });
        }, function (err, results) {
            if (err)
                return callback(err);
            callback(null, arrayMap(results.sort(comparator), baseProperty('value')));
        });
        function comparator(left, right) {
            var a = left.criteria, b = right.criteria;
            return a < b ? -1 : a > b ? 1 : 0;
        }
    }
    /**
     * Sets a time limit on an asynchronous function. If the function does not call
     * its callback within the specified milliseconds, it will be called with a
     * timeout error. The code property for the error object will be `'ETIMEDOUT'`.
     *
     * @name timeout
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} asyncFn - The async function to limit in time.
     * @param {number} milliseconds - The specified time limit.
     * @param {*} [info] - Any variable you want attached (`string`, `object`, etc)
     * to timeout Error for more information..
     * @returns {AsyncFunction} Returns a wrapped function that can be used with any
     * of the control flow functions.
     * Invoke this function with the same parameters as you would `asyncFunc`.
     * @example
     *
     * function myFunction(foo, callback) {
     *     doAsyncTask(foo, function(err, data) {
     *         // handle errors
     *         if (err) return callback(err);
     *
     *         // do some stuff ...
     *
     *         // return processed data
     *         return callback(null, data);
     *     });
     * }
     *
     * var wrapped = async.timeout(myFunction, 1000);
     *
     * // call `wrapped` as you would `myFunction`
     * wrapped({ bar: 'bar' }, function(err, data) {
     *     // if `myFunction` takes < 1000 ms to execute, `err`
     *     // and `data` will have their expected values
     *
     *     // else `err` will be an Error with the code 'ETIMEDOUT'
     * });
     */
    function timeout(asyncFn, milliseconds, info) {
        var fn = wrapAsync(asyncFn);
        return initialParams(function (args, callback) {
            var timedOut = false;
            var timer;
            function timeoutCallback() {
                var name = asyncFn.name || 'anonymous';
                var error = new Error('Callback function "' + name + '" timed out.');
                error.code = 'ETIMEDOUT';
                if (info) {
                    error.info = info;
                }
                timedOut = true;
                callback(error);
            }
            args.push(function () {
                if (!timedOut) {
                    callback.apply(null, arguments);
                    clearTimeout(timer);
                }
            });
            // setup timer and call original function
            timer = setTimeout(timeoutCallback, milliseconds);
            fn.apply(null, args);
        });
    }
    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeCeil = Math.ceil;
    var nativeMax = Math.max;
    /**
     * The base implementation of `_.range` and `_.rangeRight` which doesn't
     * coerce arguments.
     *
     * @private
     * @param {number} start The start of the range.
     * @param {number} end The end of the range.
     * @param {number} step The value to increment or decrement by.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Array} Returns the range of numbers.
     */
    function baseRange(start, end, step, fromRight) {
        var index = -1, length = nativeMax(nativeCeil((end - start) / (step || 1)), 0), result = Array(length);
        while (length--) {
            result[fromRight ? length : ++index] = start;
            start += step;
        }
        return result;
    }
    /**
     * The same as [times]{@link module:ControlFlow.times} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name timesLimit
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.times]{@link module:ControlFlow.times}
     * @category Control Flow
     * @param {number} count - The number of times to run the function.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - The async function to call `n` times.
     * Invoked with the iteration index and a callback: (n, next).
     * @param {Function} callback - see [async.map]{@link module:Collections.map}.
     */
    function timeLimit(count, limit, iteratee, callback) {
        var _iteratee = wrapAsync(iteratee);
        mapLimit(baseRange(0, count, 1), limit, _iteratee, callback);
    }
    /**
     * Calls the `iteratee` function `n` times, and accumulates results in the same
     * manner you would use with [map]{@link module:Collections.map}.
     *
     * @name times
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.map]{@link module:Collections.map}
     * @category Control Flow
     * @param {number} n - The number of times to run the function.
     * @param {AsyncFunction} iteratee - The async function to call `n` times.
     * Invoked with the iteration index and a callback: (n, next).
     * @param {Function} callback - see {@link module:Collections.map}.
     * @example
     *
     * // Pretend this is some complicated async factory
     * var createUser = function(id, callback) {
     *     callback(null, {
     *         id: 'user' + id
     *     });
     * };
     *
     * // generate 5 users
     * async.times(5, function(n, next) {
     *     createUser(n, function(err, user) {
     *         next(err, user);
     *     });
     * }, function(err, users) {
     *     // we should now have 5 users
     * });
     */
    var times = doLimit(timeLimit, Infinity);
    /**
     * The same as [times]{@link module:ControlFlow.times} but runs only a single async operation at a time.
     *
     * @name timesSeries
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.times]{@link module:ControlFlow.times}
     * @category Control Flow
     * @param {number} n - The number of times to run the function.
     * @param {AsyncFunction} iteratee - The async function to call `n` times.
     * Invoked with the iteration index and a callback: (n, next).
     * @param {Function} callback - see {@link module:Collections.map}.
     */
    var timesSeries = doLimit(timeLimit, 1);
    /**
     * A relative of `reduce`.  Takes an Object or Array, and iterates over each
     * element in series, each step potentially mutating an `accumulator` value.
     * The type of the accumulator defaults to the type of collection passed in.
     *
     * @name transform
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Array|Iterable|Object} coll - A collection to iterate over.
     * @param {*} [accumulator] - The initial state of the transform.  If omitted,
     * it will default to an empty Object or Array, depending on the type of `coll`
     * @param {AsyncFunction} iteratee - A function applied to each item in the
     * collection that potentially modifies the accumulator.
     * Invoked with (accumulator, item, key, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result is the transformed accumulator.
     * Invoked with (err, result).
     * @example
     *
     * async.transform([1,2,3], function(acc, item, index, callback) {
     *     // pointless async:
     *     process.nextTick(function() {
     *         acc.push(item * 2)
     *         callback(null)
     *     });
     * }, function(err, result) {
     *     // result is now equal to [2, 4, 6]
     * });
     *
     * @example
     *
     * async.transform({a: 1, b: 2, c: 3}, function (obj, val, key, callback) {
     *     setImmediate(function () {
     *         obj[key] = val * 2;
     *         callback();
     *     })
     * }, function (err, result) {
     *     // result is equal to {a: 2, b: 4, c: 6}
     * })
     */
    function transform(coll, accumulator, iteratee, callback) {
        if (arguments.length <= 3) {
            callback = iteratee;
            iteratee = accumulator;
            accumulator = isArray(coll) ? [] : {};
        }
        callback = once(callback || noop);
        var _iteratee = wrapAsync(iteratee);
        eachOf(coll, function (v, k, cb) {
            _iteratee(accumulator, v, k, cb);
        }, function (err) {
            callback(err, accumulator);
        });
    }
    /**
     * It runs each task in series but stops whenever any of the functions were
     * successful. If one of the tasks were successful, the `callback` will be
     * passed the result of the successful task. If all tasks fail, the callback
     * will be passed the error and result (if any) of the final attempt.
     *
     * @name tryEach
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array|Iterable|Object} tasks - A collection containing functions to
     * run, each function is passed a `callback(err, result)` it must call on
     * completion with an error `err` (which can be `null`) and an optional `result`
     * value.
     * @param {Function} [callback] - An optional callback which is called when one
     * of the tasks has succeeded, or all have failed. It receives the `err` and
     * `result` arguments of the last attempt at completing the `task`. Invoked with
     * (err, results).
     * @example
     * async.try([
     *     function getDataFromFirstWebsite(callback) {
     *         // Try getting the data from the first website
     *         callback(err, data);
     *     },
     *     function getDataFromSecondWebsite(callback) {
     *         // First website failed,
     *         // Try getting the data from the backup website
     *         callback(err, data);
     *     }
     * ],
     * // optional callback
     * function(err, results) {
     *     Now do something with the data.
     * });
     *
     */
    function tryEach(tasks, callback) {
        var error = null;
        var result;
        callback = callback || noop;
        eachSeries(tasks, function (task, callback) {
            wrapAsync(task)(function (err, res /*, ...args*/) {
                if (arguments.length > 2) {
                    result = slice(arguments, 1);
                }
                else {
                    result = res;
                }
                error = err;
                callback(!err);
            });
        }, function () {
            callback(error, result);
        });
    }
    /**
     * Undoes a [memoize]{@link module:Utils.memoize}d function, reverting it to the original,
     * unmemoized form. Handy for testing.
     *
     * @name unmemoize
     * @static
     * @memberOf module:Utils
     * @method
     * @see [async.memoize]{@link module:Utils.memoize}
     * @category Util
     * @param {AsyncFunction} fn - the memoized function
     * @returns {AsyncFunction} a function that calls the original unmemoized function
     */
    function unmemoize(fn) {
        return function () {
            return (fn.unmemoized || fn).apply(null, arguments);
        };
    }
    /**
     * Repeatedly call `iteratee`, while `test` returns `true`. Calls `callback` when
     * stopped, or an error occurs.
     *
     * @name whilst
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Function} test - synchronous truth test to perform before each
     * execution of `iteratee`. Invoked with ().
     * @param {AsyncFunction} iteratee - An async function which is called each time
     * `test` passes. Invoked with (callback).
     * @param {Function} [callback] - A callback which is called after the test
     * function has failed and repeated execution of `iteratee` has stopped. `callback`
     * will be passed an error and any arguments passed to the final `iteratee`'s
     * callback. Invoked with (err, [results]);
     * @returns undefined
     * @example
     *
     * var count = 0;
     * async.whilst(
     *     function() { return count < 5; },
     *     function(callback) {
     *         count++;
     *         setTimeout(function() {
     *             callback(null, count);
     *         }, 1000);
     *     },
     *     function (err, n) {
     *         // 5 seconds have passed, n = 5
     *     }
     * );
     */
    function whilst(test, iteratee, callback) {
        callback = onlyOnce(callback || noop);
        var _iteratee = wrapAsync(iteratee);
        if (!test())
            return callback(null);
        var next = function (err /*, ...args*/) {
            if (err)
                return callback(err);
            if (test())
                return _iteratee(next);
            var args = slice(arguments, 1);
            callback.apply(null, [null].concat(args));
        };
        _iteratee(next);
    }
    /**
     * Repeatedly call `iteratee` until `test` returns `true`. Calls `callback` when
     * stopped, or an error occurs. `callback` will be passed an error and any
     * arguments passed to the final `iteratee`'s callback.
     *
     * The inverse of [whilst]{@link module:ControlFlow.whilst}.
     *
     * @name until
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.whilst]{@link module:ControlFlow.whilst}
     * @category Control Flow
     * @param {Function} test - synchronous truth test to perform before each
     * execution of `iteratee`. Invoked with ().
     * @param {AsyncFunction} iteratee - An async function which is called each time
     * `test` fails. Invoked with (callback).
     * @param {Function} [callback] - A callback which is called after the test
     * function has passed and repeated execution of `iteratee` has stopped. `callback`
     * will be passed an error and any arguments passed to the final `iteratee`'s
     * callback. Invoked with (err, [results]);
     */
    function until(test, iteratee, callback) {
        whilst(function () {
            return !test.apply(this, arguments);
        }, iteratee, callback);
    }
    /**
     * Runs the `tasks` array of functions in series, each passing their results to
     * the next in the array. However, if any of the `tasks` pass an error to their
     * own callback, the next function is not executed, and the main `callback` is
     * immediately called with the error.
     *
     * @name waterfall
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array} tasks - An array of [async functions]{@link AsyncFunction}
     * to run.
     * Each function should complete with any number of `result` values.
     * The `result` values will be passed as arguments, in order, to the next task.
     * @param {Function} [callback] - An optional callback to run once all the
     * functions have completed. This will be passed the results of the last task's
     * callback. Invoked with (err, [results]).
     * @returns undefined
     * @example
     *
     * async.waterfall([
     *     function(callback) {
     *         callback(null, 'one', 'two');
     *     },
     *     function(arg1, arg2, callback) {
     *         // arg1 now equals 'one' and arg2 now equals 'two'
     *         callback(null, 'three');
     *     },
     *     function(arg1, callback) {
     *         // arg1 now equals 'three'
     *         callback(null, 'done');
     *     }
     * ], function (err, result) {
     *     // result now equals 'done'
     * });
     *
     * // Or, with named functions:
     * async.waterfall([
     *     myFirstFunction,
     *     mySecondFunction,
     *     myLastFunction,
     * ], function (err, result) {
     *     // result now equals 'done'
     * });
     * function myFirstFunction(callback) {
     *     callback(null, 'one', 'two');
     * }
     * function mySecondFunction(arg1, arg2, callback) {
     *     // arg1 now equals 'one' and arg2 now equals 'two'
     *     callback(null, 'three');
     * }
     * function myLastFunction(arg1, callback) {
     *     // arg1 now equals 'three'
     *     callback(null, 'done');
     * }
     */
    var waterfall = function (tasks, callback) {
        callback = once(callback || noop);
        if (!isArray(tasks))
            return callback(new Error('First argument to waterfall must be an array of functions'));
        if (!tasks.length)
            return callback();
        var taskIndex = 0;
        function nextTask(args) {
            var task = wrapAsync(tasks[taskIndex++]);
            args.push(onlyOnce(next));
            task.apply(null, args);
        }
        function next(err /*, ...args*/) {
            if (err || taskIndex === tasks.length) {
                return callback.apply(null, arguments);
            }
            nextTask(slice(arguments, 1));
        }
        nextTask([]);
    };
    /**
     * An "async function" in the context of Async is an asynchronous function with
     * a variable number of parameters, with the final parameter being a callback.
     * (`function (arg1, arg2, ..., callback) {}`)
     * The final callback is of the form `callback(err, results...)`, which must be
     * called once the function is completed.  The callback should be called with a
     * Error as its first argument to signal that an error occurred.
     * Otherwise, if no error occurred, it should be called with `null` as the first
     * argument, and any additional `result` arguments that may apply, to signal
     * successful completion.
     * The callback must be called exactly once, ideally on a later tick of the
     * JavaScript event loop.
     *
     * This type of function is also referred to as a "Node-style async function",
     * or a "continuation passing-style function" (CPS). Most of the methods of this
     * library are themselves CPS/Node-style async functions, or functions that
     * return CPS/Node-style async functions.
     *
     * Wherever we accept a Node-style async function, we also directly accept an
     * [ES2017 `async` function]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function}.
     * In this case, the `async` function will not be passed a final callback
     * argument, and any thrown error will be used as the `err` argument of the
     * implicit callback, and the return value will be used as the `result` value.
     * (i.e. a `rejected` of the returned Promise becomes the `err` callback
     * argument, and a `resolved` value becomes the `result`.)
     *
     * Note, due to JavaScript limitations, we can only detect native `async`
     * functions and not transpilied implementations.
     * Your environment must have `async`/`await` support for this to work.
     * (e.g. Node > v7.6, or a recent version of a modern browser).
     * If you are using `async` functions through a transpiler (e.g. Babel), you
     * must still wrap the function with [asyncify]{@link module:Utils.asyncify},
     * because the `async function` will be compiled to an ordinary function that
     * returns a promise.
     *
     * @typedef {Function} AsyncFunction
     * @static
     */
    /**
     * Async is a utility module which provides straight-forward, powerful functions
     * for working with asynchronous JavaScript. Although originally designed for
     * use with [Node.js](http://nodejs.org) and installable via
     * `npm install --save async`, it can also be used directly in the browser.
     * @module async
     * @see AsyncFunction
     */
    /**
     * A collection of `async` functions for manipulating collections, such as
     * arrays and objects.
     * @module Collections
     */
    /**
     * A collection of `async` functions for controlling the flow through a script.
     * @module ControlFlow
     */
    /**
     * A collection of `async` utility functions.
     * @module Utils
     */
    var index = {
        applyEach: applyEach,
        applyEachSeries: applyEachSeries,
        apply: apply,
        asyncify: asyncify,
        auto: auto,
        autoInject: autoInject,
        cargo: cargo,
        compose: compose,
        concat: concat,
        concatLimit: concatLimit,
        concatSeries: concatSeries,
        constant: constant,
        detect: detect,
        detectLimit: detectLimit,
        detectSeries: detectSeries,
        dir: dir,
        doDuring: doDuring,
        doUntil: doUntil,
        doWhilst: doWhilst,
        during: during,
        each: eachLimit,
        eachLimit: eachLimit$1,
        eachOf: eachOf,
        eachOfLimit: eachOfLimit,
        eachOfSeries: eachOfSeries,
        eachSeries: eachSeries,
        ensureAsync: ensureAsync,
        every: every,
        everyLimit: everyLimit,
        everySeries: everySeries,
        filter: filter,
        filterLimit: filterLimit,
        filterSeries: filterSeries,
        forever: forever,
        groupBy: groupBy,
        groupByLimit: groupByLimit,
        groupBySeries: groupBySeries,
        log: log,
        map: map,
        mapLimit: mapLimit,
        mapSeries: mapSeries,
        mapValues: mapValues,
        mapValuesLimit: mapValuesLimit,
        mapValuesSeries: mapValuesSeries,
        memoize: memoize,
        nextTick: nextTick,
        parallel: parallelLimit,
        parallelLimit: parallelLimit$1,
        priorityQueue: priorityQueue,
        queue: queue$1,
        race: race,
        reduce: reduce,
        reduceRight: reduceRight,
        reflect: reflect,
        reflectAll: reflectAll,
        reject: reject,
        rejectLimit: rejectLimit,
        rejectSeries: rejectSeries,
        retry: retry,
        retryable: retryable,
        seq: seq,
        series: series,
        setImmediate: setImmediate$1,
        some: some,
        someLimit: someLimit,
        someSeries: someSeries,
        sortBy: sortBy,
        timeout: timeout,
        times: times,
        timesLimit: timeLimit,
        timesSeries: timesSeries,
        transform: transform,
        tryEach: tryEach,
        unmemoize: unmemoize,
        until: until,
        waterfall: waterfall,
        whilst: whilst,
        // aliases
        all: every,
        any: some,
        forEach: eachLimit,
        forEachSeries: eachSeries,
        forEachLimit: eachLimit$1,
        forEachOf: eachOf,
        forEachOfSeries: eachOfSeries,
        forEachOfLimit: eachOfLimit,
        inject: reduce,
        foldl: reduce,
        foldr: reduceRight,
        select: filter,
        selectLimit: filterLimit,
        selectSeries: filterSeries,
        wrapSync: asyncify
    };
    exports['default'] = index;
    exports.applyEach = applyEach;
    exports.applyEachSeries = applyEachSeries;
    exports.apply = apply;
    exports.asyncify = asyncify;
    exports.auto = auto;
    exports.autoInject = autoInject;
    exports.cargo = cargo;
    exports.compose = compose;
    exports.concat = concat;
    exports.concatLimit = concatLimit;
    exports.concatSeries = concatSeries;
    exports.constant = constant;
    exports.detect = detect;
    exports.detectLimit = detectLimit;
    exports.detectSeries = detectSeries;
    exports.dir = dir;
    exports.doDuring = doDuring;
    exports.doUntil = doUntil;
    exports.doWhilst = doWhilst;
    exports.during = during;
    exports.each = eachLimit;
    exports.eachLimit = eachLimit$1;
    exports.eachOf = eachOf;
    exports.eachOfLimit = eachOfLimit;
    exports.eachOfSeries = eachOfSeries;
    exports.eachSeries = eachSeries;
    exports.ensureAsync = ensureAsync;
    exports.every = every;
    exports.everyLimit = everyLimit;
    exports.everySeries = everySeries;
    exports.filter = filter;
    exports.filterLimit = filterLimit;
    exports.filterSeries = filterSeries;
    exports.forever = forever;
    exports.groupBy = groupBy;
    exports.groupByLimit = groupByLimit;
    exports.groupBySeries = groupBySeries;
    exports.log = log;
    exports.map = map;
    exports.mapLimit = mapLimit;
    exports.mapSeries = mapSeries;
    exports.mapValues = mapValues;
    exports.mapValuesLimit = mapValuesLimit;
    exports.mapValuesSeries = mapValuesSeries;
    exports.memoize = memoize;
    exports.nextTick = nextTick;
    exports.parallel = parallelLimit;
    exports.parallelLimit = parallelLimit$1;
    exports.priorityQueue = priorityQueue;
    exports.queue = queue$1;
    exports.race = race;
    exports.reduce = reduce;
    exports.reduceRight = reduceRight;
    exports.reflect = reflect;
    exports.reflectAll = reflectAll;
    exports.reject = reject;
    exports.rejectLimit = rejectLimit;
    exports.rejectSeries = rejectSeries;
    exports.retry = retry;
    exports.retryable = retryable;
    exports.seq = seq;
    exports.series = series;
    exports.setImmediate = setImmediate$1;
    exports.some = some;
    exports.someLimit = someLimit;
    exports.someSeries = someSeries;
    exports.sortBy = sortBy;
    exports.timeout = timeout;
    exports.times = times;
    exports.timesLimit = timeLimit;
    exports.timesSeries = timesSeries;
    exports.transform = transform;
    exports.tryEach = tryEach;
    exports.unmemoize = unmemoize;
    exports.until = until;
    exports.waterfall = waterfall;
    exports.whilst = whilst;
    exports.all = every;
    exports.allLimit = everyLimit;
    exports.allSeries = everySeries;
    exports.any = some;
    exports.anyLimit = someLimit;
    exports.anySeries = someSeries;
    exports.find = detect;
    exports.findLimit = detectLimit;
    exports.findSeries = detectSeries;
    exports.forEach = eachLimit;
    exports.forEachSeries = eachSeries;
    exports.forEachLimit = eachLimit$1;
    exports.forEachOf = eachOf;
    exports.forEachOfSeries = eachOfSeries;
    exports.forEachOfLimit = eachOfLimit;
    exports.inject = reduce;
    exports.foldl = reduce;
    exports.foldr = reduceRight;
    exports.select = filter;
    exports.selectLimit = filterLimit;
    exports.selectSeries = filterSeries;
    exports.wrapSync = asyncify;
    Object.defineProperty(exports, '__esModule', { value: true });
})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxhc3luY1xcZGlzdFxcYXN5bmMuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xcYXN5bmNcXGRpc3RcXGFzeW5jLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsVUFBVSxNQUFNLEVBQUUsT0FBTztJQUN4QixPQUFPLE9BQU8sS0FBSyxRQUFRLElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUM7UUFDL0UsT0FBTyxNQUFNLEtBQUssVUFBVSxJQUFJLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxDQUFDO1lBQ3pFLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsVUFBVSxPQUFPO0lBQUksWUFBWSxDQUFDO0lBRTNDLGVBQWUsU0FBUyxFQUFFLEtBQUs7UUFDM0IsS0FBSyxHQUFHLEtBQUssR0FBQyxDQUFDLENBQUM7UUFDaEIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuRCxJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0IsR0FBRyxDQUFBLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLEVB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LE9BQU8sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0lBQzVCLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDO0lBQ3pCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFDO0lBQ2hDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ2xDLE9BQU8sQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0lBQ2hDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ2xDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3RCLE9BQU8sQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0lBQ2hDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ2xDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ2xDLE9BQU8sQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQzFCLE9BQU8sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQzFCLE9BQU8sQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQ2xCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQ2xCLE9BQU8sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0lBQzVCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQzlCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQzlCLE9BQU8sQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO0lBQ3hDLE9BQU8sQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO0lBQzFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQzFCLE9BQU8sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0lBQzVCLE9BQU8sQ0FBQyxRQUFRLEdBQUcsYUFBYSxDQUFDO0lBQ2pDLE9BQU8sQ0FBQyxhQUFhLEdBQUcsZUFBZSxDQUFDO0lBQ3hDLE9BQU8sQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO0lBQ3RDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ3BCLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ2xDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQzFCLE9BQU8sQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0lBQ2hDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ2xDLE9BQU8sQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3RCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQzlCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQ2xCLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxZQUFZLEdBQUcsY0FBYyxDQUFDO0lBQ3RDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ3BCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQzlCLE9BQU8sQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0lBQ2hDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQzFCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3RCLE9BQU8sQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO0lBQy9CLE9BQU8sQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ2xDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQzlCLE9BQU8sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQzFCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQzlCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3RCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQzlCLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDO0lBQ3BCLE9BQU8sQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDO0lBQzlCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFDO0lBQ2hDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDO0lBQ25CLE9BQU8sQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO0lBQzdCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDO0lBQy9CLE9BQU8sQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDO0lBQ3RCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFDO0lBQ2hDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsWUFBWSxDQUFDO0lBQ2xDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDO0lBQzVCLE9BQU8sQ0FBQyxhQUFhLEdBQUcsVUFBVSxDQUFDO0lBQ25DLE9BQU8sQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFDO0lBQ25DLE9BQU8sQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDO0lBQzNCLE9BQU8sQ0FBQyxlQUFlLEdBQUcsWUFBWSxDQUFDO0lBQ3ZDLE9BQU8sQ0FBQyxjQUFjLEdBQUcsV0FBVyxDQUFDO0lBQ3JDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDO0lBQzVCLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ2xDLE9BQU8sQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0lBRTVCLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBRTlELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcbiAgKGZhY3RvcnkoKGdsb2JhbC5hc3luYyA9IGdsb2JhbC5hc3luYyB8fCB7fSkpKTtcbn0odGhpcywgKGZ1bmN0aW9uIChleHBvcnRzKSB7ICd1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gc2xpY2UoYXJyYXlMaWtlLCBzdGFydCkge1xuICAgIHN0YXJ0ID0gc3RhcnR8MDtcbiAgICB2YXIgbmV3TGVuID0gTWF0aC5tYXgoYXJyYXlMaWtlLmxlbmd0aCAtIHN0YXJ0LCAwKTtcbiAgICB2YXIgbmV3QXJyID0gQXJyYXkobmV3TGVuKTtcbiAgICBmb3IodmFyIGlkeCA9IDA7IGlkeCA8IG5ld0xlbjsgaWR4KyspICB7XG4gICAgICAgIG5ld0FycltpZHhdID0gYXJyYXlMaWtlW3N0YXJ0ICsgaWR4XTtcbiAgICB9XG4gICAgcmV0dXJuIG5ld0Fycjtcbn1cblxudmFyIGluaXRpYWxQYXJhbXMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKC8qLi4uYXJncywgY2FsbGJhY2sqLykge1xuICAgICAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGZuLmNhbGwodGhpcywgYXJncywgY2FsbGJhY2spO1xuICAgIH07XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZVxuICogW2xhbmd1YWdlIHR5cGVdKGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy1lY21hc2NyaXB0LWxhbmd1YWdlLXR5cGVzKVxuICogb2YgYE9iamVjdGAuIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChfLm5vb3ApO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QobnVsbCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuIHZhbHVlICE9IG51bGwgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcbn1cblxudmFyIGhhc1NldEltbWVkaWF0ZSA9IHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09ICdmdW5jdGlvbicgJiYgc2V0SW1tZWRpYXRlO1xudmFyIGhhc05leHRUaWNrID0gdHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmIHR5cGVvZiBwcm9jZXNzLm5leHRUaWNrID09PSAnZnVuY3Rpb24nO1xuXG5mdW5jdGlvbiBmYWxsYmFjayhmbikge1xuICAgIHNldFRpbWVvdXQoZm4sIDApO1xufVxuXG5mdW5jdGlvbiB3cmFwKGRlZmVyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChmbi8qLCAuLi5hcmdzKi8pIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBzbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICBkZWZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmbi5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbn1cblxudmFyIF9kZWZlcjtcblxuaWYgKGhhc1NldEltbWVkaWF0ZSkge1xuICAgIF9kZWZlciA9IHNldEltbWVkaWF0ZTtcbn0gZWxzZSBpZiAoaGFzTmV4dFRpY2spIHtcbiAgICBfZGVmZXIgPSBwcm9jZXNzLm5leHRUaWNrO1xufSBlbHNlIHtcbiAgICBfZGVmZXIgPSBmYWxsYmFjaztcbn1cblxudmFyIHNldEltbWVkaWF0ZSQxID0gd3JhcChfZGVmZXIpO1xuXG4vKipcbiAqIFRha2UgYSBzeW5jIGZ1bmN0aW9uIGFuZCBtYWtlIGl0IGFzeW5jLCBwYXNzaW5nIGl0cyByZXR1cm4gdmFsdWUgdG8gYVxuICogY2FsbGJhY2suIFRoaXMgaXMgdXNlZnVsIGZvciBwbHVnZ2luZyBzeW5jIGZ1bmN0aW9ucyBpbnRvIGEgd2F0ZXJmYWxsLFxuICogc2VyaWVzLCBvciBvdGhlciBhc3luYyBmdW5jdGlvbnMuIEFueSBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBnZW5lcmF0ZWRcbiAqIGZ1bmN0aW9uIHdpbGwgYmUgcGFzc2VkIHRvIHRoZSB3cmFwcGVkIGZ1bmN0aW9uIChleGNlcHQgZm9yIHRoZSBmaW5hbFxuICogY2FsbGJhY2sgYXJndW1lbnQpLiBFcnJvcnMgdGhyb3duIHdpbGwgYmUgcGFzc2VkIHRvIHRoZSBjYWxsYmFjay5cbiAqXG4gKiBJZiB0aGUgZnVuY3Rpb24gcGFzc2VkIHRvIGBhc3luY2lmeWAgcmV0dXJucyBhIFByb21pc2UsIHRoYXQgcHJvbWlzZXMnc1xuICogcmVzb2x2ZWQvcmVqZWN0ZWQgc3RhdGUgd2lsbCBiZSB1c2VkIHRvIGNhbGwgdGhlIGNhbGxiYWNrLCByYXRoZXIgdGhhbiBzaW1wbHlcbiAqIHRoZSBzeW5jaHJvbm91cyByZXR1cm4gdmFsdWUuXG4gKlxuICogVGhpcyBhbHNvIG1lYW5zIHlvdSBjYW4gYXN5bmNpZnkgRVMyMDE3IGBhc3luY2AgZnVuY3Rpb25zLlxuICpcbiAqIEBuYW1lIGFzeW5jaWZ5XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gKiBAbWV0aG9kXG4gKiBAYWxpYXMgd3JhcFN5bmNcbiAqIEBjYXRlZ29yeSBVdGlsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIC0gVGhlIHN5bmNocm9ub3VzIGZ1bmN0aW9uLCBvciBQcm9taXNlLXJldHVybmluZ1xuICogZnVuY3Rpb24gdG8gY29udmVydCB0byBhbiB7QGxpbmsgQXN5bmNGdW5jdGlvbn0uXG4gKiBAcmV0dXJucyB7QXN5bmNGdW5jdGlvbn0gQW4gYXN5bmNocm9ub3VzIHdyYXBwZXIgb2YgdGhlIGBmdW5jYC4gVG8gYmVcbiAqIGludm9rZWQgd2l0aCBgKGFyZ3MuLi4sIGNhbGxiYWNrKWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIHBhc3NpbmcgYSByZWd1bGFyIHN5bmNocm9ub3VzIGZ1bmN0aW9uXG4gKiBhc3luYy53YXRlcmZhbGwoW1xuICogICAgIGFzeW5jLmFwcGx5KGZzLnJlYWRGaWxlLCBmaWxlbmFtZSwgXCJ1dGY4XCIpLFxuICogICAgIGFzeW5jLmFzeW5jaWZ5KEpTT04ucGFyc2UpLFxuICogICAgIGZ1bmN0aW9uIChkYXRhLCBuZXh0KSB7XG4gKiAgICAgICAgIC8vIGRhdGEgaXMgdGhlIHJlc3VsdCBvZiBwYXJzaW5nIHRoZSB0ZXh0LlxuICogICAgICAgICAvLyBJZiB0aGVyZSB3YXMgYSBwYXJzaW5nIGVycm9yLCBpdCB3b3VsZCBoYXZlIGJlZW4gY2F1Z2h0LlxuICogICAgIH1cbiAqIF0sIGNhbGxiYWNrKTtcbiAqXG4gKiAvLyBwYXNzaW5nIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgcHJvbWlzZVxuICogYXN5bmMud2F0ZXJmYWxsKFtcbiAqICAgICBhc3luYy5hcHBseShmcy5yZWFkRmlsZSwgZmlsZW5hbWUsIFwidXRmOFwiKSxcbiAqICAgICBhc3luYy5hc3luY2lmeShmdW5jdGlvbiAoY29udGVudHMpIHtcbiAqICAgICAgICAgcmV0dXJuIGRiLm1vZGVsLmNyZWF0ZShjb250ZW50cyk7XG4gKiAgICAgfSksXG4gKiAgICAgZnVuY3Rpb24gKG1vZGVsLCBuZXh0KSB7XG4gKiAgICAgICAgIC8vIGBtb2RlbGAgaXMgdGhlIGluc3RhbnRpYXRlZCBtb2RlbCBvYmplY3QuXG4gKiAgICAgICAgIC8vIElmIHRoZXJlIHdhcyBhbiBlcnJvciwgdGhpcyBmdW5jdGlvbiB3b3VsZCBiZSBza2lwcGVkLlxuICogICAgIH1cbiAqIF0sIGNhbGxiYWNrKTtcbiAqXG4gKiAvLyBlczIwMTcgZXhhbXBsZSwgdGhvdWdoIGBhc3luY2lmeWAgaXMgbm90IG5lZWRlZCBpZiB5b3VyIEpTIGVudmlyb25tZW50XG4gKiAvLyBzdXBwb3J0cyBhc3luYyBmdW5jdGlvbnMgb3V0IG9mIHRoZSBib3hcbiAqIHZhciBxID0gYXN5bmMucXVldWUoYXN5bmMuYXN5bmNpZnkoYXN5bmMgZnVuY3Rpb24oZmlsZSkge1xuICogICAgIHZhciBpbnRlcm1lZGlhdGVTdGVwID0gYXdhaXQgcHJvY2Vzc0ZpbGUoZmlsZSk7XG4gKiAgICAgcmV0dXJuIGF3YWl0IHNvbWVQcm9taXNlKGludGVybWVkaWF0ZVN0ZXApXG4gKiB9KSk7XG4gKlxuICogcS5wdXNoKGZpbGVzKTtcbiAqL1xuZnVuY3Rpb24gYXN5bmNpZnkoZnVuYykge1xuICAgIHJldHVybiBpbml0aWFsUGFyYW1zKGZ1bmN0aW9uIChhcmdzLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIHJlc3VsdCBpcyBQcm9taXNlIG9iamVjdFxuICAgICAgICBpZiAoaXNPYmplY3QocmVzdWx0KSAmJiB0eXBlb2YgcmVzdWx0LnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJlc3VsdC50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaW52b2tlQ2FsbGJhY2soY2FsbGJhY2ssIG51bGwsIHZhbHVlKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIGludm9rZUNhbGxiYWNrKGNhbGxiYWNrLCBlcnIubWVzc2FnZSA/IGVyciA6IG5ldyBFcnJvcihlcnIpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBpbnZva2VDYWxsYmFjayhjYWxsYmFjaywgZXJyb3IsIHZhbHVlKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIHZhbHVlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHNldEltbWVkaWF0ZSQxKHJldGhyb3csIGUpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcmV0aHJvdyhlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xufVxuXG52YXIgc3VwcG9ydHNTeW1ib2wgPSB0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nO1xuXG5mdW5jdGlvbiBpc0FzeW5jKGZuKSB7XG4gICAgcmV0dXJuIHN1cHBvcnRzU3ltYm9sICYmIGZuW1N5bWJvbC50b1N0cmluZ1RhZ10gPT09ICdBc3luY0Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gd3JhcEFzeW5jKGFzeW5jRm4pIHtcbiAgICByZXR1cm4gaXNBc3luYyhhc3luY0ZuKSA/IGFzeW5jaWZ5KGFzeW5jRm4pIDogYXN5bmNGbjtcbn1cblxuZnVuY3Rpb24gYXBwbHlFYWNoJDEoZWFjaGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGZucy8qLCAuLi5hcmdzKi8pIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBzbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICB2YXIgZ28gPSBpbml0aWFsUGFyYW1zKGZ1bmN0aW9uKGFyZ3MsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICByZXR1cm4gZWFjaGZuKGZucywgZnVuY3Rpb24gKGZuLCBjYikge1xuICAgICAgICAgICAgICAgIHdyYXBBc3luYyhmbikuYXBwbHkodGhhdCwgYXJncy5jb25jYXQoY2IpKTtcbiAgICAgICAgICAgIH0sIGNhbGxiYWNrKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGdvLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGdvO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBnbG9iYWxgIGZyb20gTm9kZS5qcy4gKi9cbnZhciBmcmVlR2xvYmFsID0gdHlwZW9mIGdsb2JhbCA9PSAnb2JqZWN0JyAmJiBnbG9iYWwgJiYgZ2xvYmFsLk9iamVjdCA9PT0gT2JqZWN0ICYmIGdsb2JhbDtcblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBzZWxmYC4gKi9cbnZhciBmcmVlU2VsZiA9IHR5cGVvZiBzZWxmID09ICdvYmplY3QnICYmIHNlbGYgJiYgc2VsZi5PYmplY3QgPT09IE9iamVjdCAmJiBzZWxmO1xuXG4vKiogVXNlZCBhcyBhIHJlZmVyZW5jZSB0byB0aGUgZ2xvYmFsIG9iamVjdC4gKi9cbnZhciByb290ID0gZnJlZUdsb2JhbCB8fCBmcmVlU2VsZiB8fCBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuXG4vKiogQnVpbHQtaW4gdmFsdWUgcmVmZXJlbmNlcy4gKi9cbnZhciBTeW1ib2wkMSA9IHJvb3QuU3ltYm9sO1xuXG4vKiogVXNlZCBmb3IgYnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byBjaGVjayBvYmplY3RzIGZvciBvd24gcHJvcGVydGllcy4gKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuXG4vKipcbiAqIFVzZWQgdG8gcmVzb2x2ZSB0aGVcbiAqIFtgdG9TdHJpbmdUYWdgXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy1vYmplY3QucHJvdG90eXBlLnRvc3RyaW5nKVxuICogb2YgdmFsdWVzLlxuICovXG52YXIgbmF0aXZlT2JqZWN0VG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuLyoqIEJ1aWx0LWluIHZhbHVlIHJlZmVyZW5jZXMuICovXG52YXIgc3ltVG9TdHJpbmdUYWckMSA9IFN5bWJvbCQxID8gU3ltYm9sJDEudG9TdHJpbmdUYWcgOiB1bmRlZmluZWQ7XG5cbi8qKlxuICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBiYXNlR2V0VGFnYCB3aGljaCBpZ25vcmVzIGBTeW1ib2wudG9TdHJpbmdUYWdgIHZhbHVlcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSByYXcgYHRvU3RyaW5nVGFnYC5cbiAqL1xuZnVuY3Rpb24gZ2V0UmF3VGFnKHZhbHVlKSB7XG4gIHZhciBpc093biA9IGhhc093blByb3BlcnR5LmNhbGwodmFsdWUsIHN5bVRvU3RyaW5nVGFnJDEpLFxuICAgICAgdGFnID0gdmFsdWVbc3ltVG9TdHJpbmdUYWckMV07XG5cbiAgdHJ5IHtcbiAgICB2YWx1ZVtzeW1Ub1N0cmluZ1RhZyQxXSA9IHVuZGVmaW5lZDtcbiAgICB2YXIgdW5tYXNrZWQgPSB0cnVlO1xuICB9IGNhdGNoIChlKSB7fVxuXG4gIHZhciByZXN1bHQgPSBuYXRpdmVPYmplY3RUb1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgaWYgKHVubWFza2VkKSB7XG4gICAgaWYgKGlzT3duKSB7XG4gICAgICB2YWx1ZVtzeW1Ub1N0cmluZ1RhZyQxXSA9IHRhZztcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIHZhbHVlW3N5bVRvU3RyaW5nVGFnJDFdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogVXNlZCBmb3IgYnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8kMSA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKlxuICogVXNlZCB0byByZXNvbHZlIHRoZVxuICogW2B0b1N0cmluZ1RhZ2BdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzcuMC8jc2VjLW9iamVjdC5wcm90b3R5cGUudG9zdHJpbmcpXG4gKiBvZiB2YWx1ZXMuXG4gKi9cbnZhciBuYXRpdmVPYmplY3RUb1N0cmluZyQxID0gb2JqZWN0UHJvdG8kMS50b1N0cmluZztcblxuLyoqXG4gKiBDb252ZXJ0cyBgdmFsdWVgIHRvIGEgc3RyaW5nIHVzaW5nIGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY29udmVydC5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIGNvbnZlcnRlZCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiBuYXRpdmVPYmplY3RUb1N0cmluZyQxLmNhbGwodmFsdWUpO1xufVxuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgbnVsbFRhZyA9ICdbb2JqZWN0IE51bGxdJztcbnZhciB1bmRlZmluZWRUYWcgPSAnW29iamVjdCBVbmRlZmluZWRdJztcblxuLyoqIEJ1aWx0LWluIHZhbHVlIHJlZmVyZW5jZXMuICovXG52YXIgc3ltVG9TdHJpbmdUYWcgPSBTeW1ib2wkMSA/IFN5bWJvbCQxLnRvU3RyaW5nVGFnIDogdW5kZWZpbmVkO1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBnZXRUYWdgIHdpdGhvdXQgZmFsbGJhY2tzIGZvciBidWdneSBlbnZpcm9ubWVudHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHF1ZXJ5LlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgYHRvU3RyaW5nVGFnYC5cbiAqL1xuZnVuY3Rpb24gYmFzZUdldFRhZyh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgIHJldHVybiB2YWx1ZSA9PT0gdW5kZWZpbmVkID8gdW5kZWZpbmVkVGFnIDogbnVsbFRhZztcbiAgfVxuICB2YWx1ZSA9IE9iamVjdCh2YWx1ZSk7XG4gIHJldHVybiAoc3ltVG9TdHJpbmdUYWcgJiYgc3ltVG9TdHJpbmdUYWcgaW4gdmFsdWUpXG4gICAgPyBnZXRSYXdUYWcodmFsdWUpXG4gICAgOiBvYmplY3RUb1N0cmluZyh2YWx1ZSk7XG59XG5cbi8qKiBgT2JqZWN0I3RvU3RyaW5nYCByZXN1bHQgcmVmZXJlbmNlcy4gKi9cbnZhciBhc3luY1RhZyA9ICdbb2JqZWN0IEFzeW5jRnVuY3Rpb25dJztcbnZhciBmdW5jVGFnID0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbnZhciBnZW5UYWcgPSAnW29iamVjdCBHZW5lcmF0b3JGdW5jdGlvbl0nO1xudmFyIHByb3h5VGFnID0gJ1tvYmplY3QgUHJveHldJztcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYEZ1bmN0aW9uYCBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSBmdW5jdGlvbiwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzRnVuY3Rpb24oXyk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0Z1bmN0aW9uKC9hYmMvKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKCFpc09iamVjdCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy8gVGhlIHVzZSBvZiBgT2JqZWN0I3RvU3RyaW5nYCBhdm9pZHMgaXNzdWVzIHdpdGggdGhlIGB0eXBlb2ZgIG9wZXJhdG9yXG4gIC8vIGluIFNhZmFyaSA5IHdoaWNoIHJldHVybnMgJ29iamVjdCcgZm9yIHR5cGVkIGFycmF5cyBhbmQgb3RoZXIgY29uc3RydWN0b3JzLlxuICB2YXIgdGFnID0gYmFzZUdldFRhZyh2YWx1ZSk7XG4gIHJldHVybiB0YWcgPT0gZnVuY1RhZyB8fCB0YWcgPT0gZ2VuVGFnIHx8IHRhZyA9PSBhc3luY1RhZyB8fCB0YWcgPT0gcHJveHlUYWc7XG59XG5cbi8qKiBVc2VkIGFzIHJlZmVyZW5jZXMgZm9yIHZhcmlvdXMgYE51bWJlcmAgY29uc3RhbnRzLiAqL1xudmFyIE1BWF9TQUZFX0lOVEVHRVIgPSA5MDA3MTk5MjU0NzQwOTkxO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgYXJyYXktbGlrZSBsZW5ndGguXG4gKlxuICogKipOb3RlOioqIFRoaXMgbWV0aG9kIGlzIGxvb3NlbHkgYmFzZWQgb25cbiAqIFtgVG9MZW5ndGhgXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy10b2xlbmd0aCkuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBsZW5ndGgsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0xlbmd0aCgzKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzTGVuZ3RoKE51bWJlci5NSU5fVkFMVUUpO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiBfLmlzTGVuZ3RoKEluZmluaXR5KTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc0xlbmd0aCgnMycpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNMZW5ndGgodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnbnVtYmVyJyAmJlxuICAgIHZhbHVlID4gLTEgJiYgdmFsdWUgJSAxID09IDAgJiYgdmFsdWUgPD0gTUFYX1NBRkVfSU5URUdFUjtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhcnJheS1saWtlLiBBIHZhbHVlIGlzIGNvbnNpZGVyZWQgYXJyYXktbGlrZSBpZiBpdCdzXG4gKiBub3QgYSBmdW5jdGlvbiBhbmQgaGFzIGEgYHZhbHVlLmxlbmd0aGAgdGhhdCdzIGFuIGludGVnZXIgZ3JlYXRlciB0aGFuIG9yXG4gKiBlcXVhbCB0byBgMGAgYW5kIGxlc3MgdGhhbiBvciBlcXVhbCB0byBgTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVJgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFycmF5LWxpa2UsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0FycmF5TGlrZShbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNBcnJheUxpa2UoZG9jdW1lbnQuYm9keS5jaGlsZHJlbik7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0FycmF5TGlrZSgnYWJjJyk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0FycmF5TGlrZShfLm5vb3ApO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNBcnJheUxpa2UodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlICE9IG51bGwgJiYgaXNMZW5ndGgodmFsdWUubGVuZ3RoKSAmJiAhaXNGdW5jdGlvbih2YWx1ZSk7XG59XG5cbi8vIEEgdGVtcG9yYXJ5IHZhbHVlIHVzZWQgdG8gaWRlbnRpZnkgaWYgdGhlIGxvb3Agc2hvdWxkIGJlIGJyb2tlbi5cbi8vIFNlZSAjMTA2NCwgIzEyOTNcbnZhciBicmVha0xvb3AgPSB7fTtcblxuLyoqXG4gKiBUaGlzIG1ldGhvZCByZXR1cm5zIGB1bmRlZmluZWRgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMi4zLjBcbiAqIEBjYXRlZ29yeSBVdGlsXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8udGltZXMoMiwgXy5ub29wKTtcbiAqIC8vID0+IFt1bmRlZmluZWQsIHVuZGVmaW5lZF1cbiAqL1xuZnVuY3Rpb24gbm9vcCgpIHtcbiAgLy8gTm8gb3BlcmF0aW9uIHBlcmZvcm1lZC5cbn1cblxuZnVuY3Rpb24gb25jZShmbikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChmbiA9PT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICB2YXIgY2FsbEZuID0gZm47XG4gICAgICAgIGZuID0gbnVsbDtcbiAgICAgICAgY2FsbEZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbn1cblxudmFyIGl0ZXJhdG9yU3ltYm9sID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiBTeW1ib2wuaXRlcmF0b3I7XG5cbnZhciBnZXRJdGVyYXRvciA9IGZ1bmN0aW9uIChjb2xsKSB7XG4gICAgcmV0dXJuIGl0ZXJhdG9yU3ltYm9sICYmIGNvbGxbaXRlcmF0b3JTeW1ib2xdICYmIGNvbGxbaXRlcmF0b3JTeW1ib2xdKCk7XG59O1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnRpbWVzYCB3aXRob3V0IHN1cHBvcnQgZm9yIGl0ZXJhdGVlIHNob3J0aGFuZHNcbiAqIG9yIG1heCBhcnJheSBsZW5ndGggY2hlY2tzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge251bWJlcn0gbiBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIGludm9rZSBgaXRlcmF0ZWVgLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgYXJyYXkgb2YgcmVzdWx0cy5cbiAqL1xuZnVuY3Rpb24gYmFzZVRpbWVzKG4sIGl0ZXJhdGVlKSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgcmVzdWx0ID0gQXJyYXkobik7XG5cbiAgd2hpbGUgKCsraW5kZXggPCBuKSB7XG4gICAgcmVzdWx0W2luZGV4XSA9IGl0ZXJhdGVlKGluZGV4KTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLiBBIHZhbHVlIGlzIG9iamVjdC1saWtlIGlmIGl0J3Mgbm90IGBudWxsYFxuICogYW5kIGhhcyBhIGB0eXBlb2ZgIHJlc3VsdCBvZiBcIm9iamVjdFwiLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKF8ubm9vcCk7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKG51bGwpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3RMaWtlKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jztcbn1cblxuLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCByZWZlcmVuY2VzLiAqL1xudmFyIGFyZ3NUYWcgPSAnW29iamVjdCBBcmd1bWVudHNdJztcblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5pc0FyZ3VtZW50c2AuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gYGFyZ3VtZW50c2Agb2JqZWN0LFxuICovXG5mdW5jdGlvbiBiYXNlSXNBcmd1bWVudHModmFsdWUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgYmFzZUdldFRhZyh2YWx1ZSkgPT0gYXJnc1RhZztcbn1cblxuLyoqIFVzZWQgZm9yIGJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIG9iamVjdFByb3RvJDMgPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byBjaGVjayBvYmplY3RzIGZvciBvd24gcHJvcGVydGllcy4gKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSQyID0gb2JqZWN0UHJvdG8kMy5oYXNPd25Qcm9wZXJ0eTtcblxuLyoqIEJ1aWx0LWluIHZhbHVlIHJlZmVyZW5jZXMuICovXG52YXIgcHJvcGVydHlJc0VudW1lcmFibGUgPSBvYmplY3RQcm90byQzLnByb3BlcnR5SXNFbnVtZXJhYmxlO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGxpa2VseSBhbiBgYXJndW1lbnRzYCBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gYGFyZ3VtZW50c2Agb2JqZWN0LFxuICogIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0FyZ3VtZW50cyhmdW5jdGlvbigpIHsgcmV0dXJuIGFyZ3VtZW50czsgfSgpKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzQXJndW1lbnRzKFsxLCAyLCAzXSk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG52YXIgaXNBcmd1bWVudHMgPSBiYXNlSXNBcmd1bWVudHMoZnVuY3Rpb24oKSB7IHJldHVybiBhcmd1bWVudHM7IH0oKSkgPyBiYXNlSXNBcmd1bWVudHMgOiBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBoYXNPd25Qcm9wZXJ0eSQyLmNhbGwodmFsdWUsICdjYWxsZWUnKSAmJlxuICAgICFwcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHZhbHVlLCAnY2FsbGVlJyk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYW4gYEFycmF5YCBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gYXJyYXksIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0FycmF5KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0FycmF5KGRvY3VtZW50LmJvZHkuY2hpbGRyZW4pO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiBfLmlzQXJyYXkoJ2FiYycpO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiBfLmlzQXJyYXkoXy5ub29wKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcblxuLyoqXG4gKiBUaGlzIG1ldGhvZCByZXR1cm5zIGBmYWxzZWAuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjEzLjBcbiAqIEBjYXRlZ29yeSBVdGlsXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLnRpbWVzKDIsIF8uc3R1YkZhbHNlKTtcbiAqIC8vID0+IFtmYWxzZSwgZmFsc2VdXG4gKi9cbmZ1bmN0aW9uIHN0dWJGYWxzZSgpIHtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYGV4cG9ydHNgLiAqL1xudmFyIGZyZWVFeHBvcnRzID0gdHlwZW9mIGV4cG9ydHMgPT0gJ29iamVjdCcgJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSAmJiBleHBvcnRzO1xuXG4vKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYG1vZHVsZWAuICovXG52YXIgZnJlZU1vZHVsZSA9IGZyZWVFeHBvcnRzICYmIHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUgJiYgbW9kdWxlO1xuXG4vKiogRGV0ZWN0IHRoZSBwb3B1bGFyIENvbW1vbkpTIGV4dGVuc2lvbiBgbW9kdWxlLmV4cG9ydHNgLiAqL1xudmFyIG1vZHVsZUV4cG9ydHMgPSBmcmVlTW9kdWxlICYmIGZyZWVNb2R1bGUuZXhwb3J0cyA9PT0gZnJlZUV4cG9ydHM7XG5cbi8qKiBCdWlsdC1pbiB2YWx1ZSByZWZlcmVuY2VzLiAqL1xudmFyIEJ1ZmZlciA9IG1vZHVsZUV4cG9ydHMgPyByb290LkJ1ZmZlciA6IHVuZGVmaW5lZDtcblxuLyogQnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xudmFyIG5hdGl2ZUlzQnVmZmVyID0gQnVmZmVyID8gQnVmZmVyLmlzQnVmZmVyIDogdW5kZWZpbmVkO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgYnVmZmVyLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4zLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgYnVmZmVyLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNCdWZmZXIobmV3IEJ1ZmZlcigyKSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0J1ZmZlcihuZXcgVWludDhBcnJheSgyKSk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG52YXIgaXNCdWZmZXIgPSBuYXRpdmVJc0J1ZmZlciB8fCBzdHViRmFsc2U7XG5cbi8qKiBVc2VkIGFzIHJlZmVyZW5jZXMgZm9yIHZhcmlvdXMgYE51bWJlcmAgY29uc3RhbnRzLiAqL1xudmFyIE1BWF9TQUZFX0lOVEVHRVIkMSA9IDkwMDcxOTkyNTQ3NDA5OTE7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCB1bnNpZ25lZCBpbnRlZ2VyIHZhbHVlcy4gKi9cbnZhciByZUlzVWludCA9IC9eKD86MHxbMS05XVxcZCopJC87XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBhcnJheS1saWtlIGluZGV4LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoPU1BWF9TQUZFX0lOVEVHRVJdIFRoZSB1cHBlciBib3VuZHMgb2YgYSB2YWxpZCBpbmRleC5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgaW5kZXgsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNJbmRleCh2YWx1ZSwgbGVuZ3RoKSB7XG4gIGxlbmd0aCA9IGxlbmd0aCA9PSBudWxsID8gTUFYX1NBRkVfSU5URUdFUiQxIDogbGVuZ3RoO1xuICByZXR1cm4gISFsZW5ndGggJiZcbiAgICAodHlwZW9mIHZhbHVlID09ICdudW1iZXInIHx8IHJlSXNVaW50LnRlc3QodmFsdWUpKSAmJlxuICAgICh2YWx1ZSA+IC0xICYmIHZhbHVlICUgMSA9PSAwICYmIHZhbHVlIDwgbGVuZ3RoKTtcbn1cblxuLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCByZWZlcmVuY2VzLiAqL1xudmFyIGFyZ3NUYWckMSA9ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xudmFyIGFycmF5VGFnID0gJ1tvYmplY3QgQXJyYXldJztcbnZhciBib29sVGFnID0gJ1tvYmplY3QgQm9vbGVhbl0nO1xudmFyIGRhdGVUYWcgPSAnW29iamVjdCBEYXRlXSc7XG52YXIgZXJyb3JUYWcgPSAnW29iamVjdCBFcnJvcl0nO1xudmFyIGZ1bmNUYWckMSA9ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG52YXIgbWFwVGFnID0gJ1tvYmplY3QgTWFwXSc7XG52YXIgbnVtYmVyVGFnID0gJ1tvYmplY3QgTnVtYmVyXSc7XG52YXIgb2JqZWN0VGFnID0gJ1tvYmplY3QgT2JqZWN0XSc7XG52YXIgcmVnZXhwVGFnID0gJ1tvYmplY3QgUmVnRXhwXSc7XG52YXIgc2V0VGFnID0gJ1tvYmplY3QgU2V0XSc7XG52YXIgc3RyaW5nVGFnID0gJ1tvYmplY3QgU3RyaW5nXSc7XG52YXIgd2Vha01hcFRhZyA9ICdbb2JqZWN0IFdlYWtNYXBdJztcblxudmFyIGFycmF5QnVmZmVyVGFnID0gJ1tvYmplY3QgQXJyYXlCdWZmZXJdJztcbnZhciBkYXRhVmlld1RhZyA9ICdbb2JqZWN0IERhdGFWaWV3XSc7XG52YXIgZmxvYXQzMlRhZyA9ICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nO1xudmFyIGZsb2F0NjRUYWcgPSAnW29iamVjdCBGbG9hdDY0QXJyYXldJztcbnZhciBpbnQ4VGFnID0gJ1tvYmplY3QgSW50OEFycmF5XSc7XG52YXIgaW50MTZUYWcgPSAnW29iamVjdCBJbnQxNkFycmF5XSc7XG52YXIgaW50MzJUYWcgPSAnW29iamVjdCBJbnQzMkFycmF5XSc7XG52YXIgdWludDhUYWcgPSAnW29iamVjdCBVaW50OEFycmF5XSc7XG52YXIgdWludDhDbGFtcGVkVGFnID0gJ1tvYmplY3QgVWludDhDbGFtcGVkQXJyYXldJztcbnZhciB1aW50MTZUYWcgPSAnW29iamVjdCBVaW50MTZBcnJheV0nO1xudmFyIHVpbnQzMlRhZyA9ICdbb2JqZWN0IFVpbnQzMkFycmF5XSc7XG5cbi8qKiBVc2VkIHRvIGlkZW50aWZ5IGB0b1N0cmluZ1RhZ2AgdmFsdWVzIG9mIHR5cGVkIGFycmF5cy4gKi9cbnZhciB0eXBlZEFycmF5VGFncyA9IHt9O1xudHlwZWRBcnJheVRhZ3NbZmxvYXQzMlRhZ10gPSB0eXBlZEFycmF5VGFnc1tmbG9hdDY0VGFnXSA9XG50eXBlZEFycmF5VGFnc1tpbnQ4VGFnXSA9IHR5cGVkQXJyYXlUYWdzW2ludDE2VGFnXSA9XG50eXBlZEFycmF5VGFnc1tpbnQzMlRhZ10gPSB0eXBlZEFycmF5VGFnc1t1aW50OFRhZ10gPVxudHlwZWRBcnJheVRhZ3NbdWludDhDbGFtcGVkVGFnXSA9IHR5cGVkQXJyYXlUYWdzW3VpbnQxNlRhZ10gPVxudHlwZWRBcnJheVRhZ3NbdWludDMyVGFnXSA9IHRydWU7XG50eXBlZEFycmF5VGFnc1thcmdzVGFnJDFdID0gdHlwZWRBcnJheVRhZ3NbYXJyYXlUYWddID1cbnR5cGVkQXJyYXlUYWdzW2FycmF5QnVmZmVyVGFnXSA9IHR5cGVkQXJyYXlUYWdzW2Jvb2xUYWddID1cbnR5cGVkQXJyYXlUYWdzW2RhdGFWaWV3VGFnXSA9IHR5cGVkQXJyYXlUYWdzW2RhdGVUYWddID1cbnR5cGVkQXJyYXlUYWdzW2Vycm9yVGFnXSA9IHR5cGVkQXJyYXlUYWdzW2Z1bmNUYWckMV0gPVxudHlwZWRBcnJheVRhZ3NbbWFwVGFnXSA9IHR5cGVkQXJyYXlUYWdzW251bWJlclRhZ10gPVxudHlwZWRBcnJheVRhZ3Nbb2JqZWN0VGFnXSA9IHR5cGVkQXJyYXlUYWdzW3JlZ2V4cFRhZ10gPVxudHlwZWRBcnJheVRhZ3Nbc2V0VGFnXSA9IHR5cGVkQXJyYXlUYWdzW3N0cmluZ1RhZ10gPVxudHlwZWRBcnJheVRhZ3Nbd2Vha01hcFRhZ10gPSBmYWxzZTtcblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5pc1R5cGVkQXJyYXlgIHdpdGhvdXQgTm9kZS5qcyBvcHRpbWl6YXRpb25zLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgdHlwZWQgYXJyYXksIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gYmFzZUlzVHlwZWRBcnJheSh2YWx1ZSkge1xuICByZXR1cm4gaXNPYmplY3RMaWtlKHZhbHVlKSAmJlxuICAgIGlzTGVuZ3RoKHZhbHVlLmxlbmd0aCkgJiYgISF0eXBlZEFycmF5VGFnc1tiYXNlR2V0VGFnKHZhbHVlKV07XG59XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8udW5hcnlgIHdpdGhvdXQgc3VwcG9ydCBmb3Igc3RvcmluZyBtZXRhZGF0YS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gY2FwIGFyZ3VtZW50cyBmb3IuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBjYXBwZWQgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGJhc2VVbmFyeShmdW5jKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBmdW5jKHZhbHVlKTtcbiAgfTtcbn1cblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBleHBvcnRzYC4gKi9cbnZhciBmcmVlRXhwb3J0cyQxID0gdHlwZW9mIGV4cG9ydHMgPT0gJ29iamVjdCcgJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSAmJiBleHBvcnRzO1xuXG4vKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYG1vZHVsZWAuICovXG52YXIgZnJlZU1vZHVsZSQxID0gZnJlZUV4cG9ydHMkMSAmJiB0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZSAmJiAhbW9kdWxlLm5vZGVUeXBlICYmIG1vZHVsZTtcblxuLyoqIERldGVjdCB0aGUgcG9wdWxhciBDb21tb25KUyBleHRlbnNpb24gYG1vZHVsZS5leHBvcnRzYC4gKi9cbnZhciBtb2R1bGVFeHBvcnRzJDEgPSBmcmVlTW9kdWxlJDEgJiYgZnJlZU1vZHVsZSQxLmV4cG9ydHMgPT09IGZyZWVFeHBvcnRzJDE7XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgcHJvY2Vzc2AgZnJvbSBOb2RlLmpzLiAqL1xudmFyIGZyZWVQcm9jZXNzID0gbW9kdWxlRXhwb3J0cyQxICYmIGZyZWVHbG9iYWwucHJvY2VzcztcblxuLyoqIFVzZWQgdG8gYWNjZXNzIGZhc3RlciBOb2RlLmpzIGhlbHBlcnMuICovXG52YXIgbm9kZVV0aWwgPSAoZnVuY3Rpb24oKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGZyZWVQcm9jZXNzICYmIGZyZWVQcm9jZXNzLmJpbmRpbmcoJ3V0aWwnKTtcbiAgfSBjYXRjaCAoZSkge31cbn0oKSk7XG5cbi8qIE5vZGUuanMgaGVscGVyIHJlZmVyZW5jZXMuICovXG52YXIgbm9kZUlzVHlwZWRBcnJheSA9IG5vZGVVdGlsICYmIG5vZGVVdGlsLmlzVHlwZWRBcnJheTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgdHlwZWQgYXJyYXkuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAzLjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSB0eXBlZCBhcnJheSwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzVHlwZWRBcnJheShuZXcgVWludDhBcnJheSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc1R5cGVkQXJyYXkoW10pO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudmFyIGlzVHlwZWRBcnJheSA9IG5vZGVJc1R5cGVkQXJyYXkgPyBiYXNlVW5hcnkobm9kZUlzVHlwZWRBcnJheSkgOiBiYXNlSXNUeXBlZEFycmF5O1xuXG4vKiogVXNlZCBmb3IgYnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8kMiA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKiBVc2VkIHRvIGNoZWNrIG9iamVjdHMgZm9yIG93biBwcm9wZXJ0aWVzLiAqL1xudmFyIGhhc093blByb3BlcnR5JDEgPSBvYmplY3RQcm90byQyLmhhc093blByb3BlcnR5O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gYXJyYXkgb2YgdGhlIGVudW1lcmFibGUgcHJvcGVydHkgbmFtZXMgb2YgdGhlIGFycmF5LWxpa2UgYHZhbHVlYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcXVlcnkuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGluaGVyaXRlZCBTcGVjaWZ5IHJldHVybmluZyBpbmhlcml0ZWQgcHJvcGVydHkgbmFtZXMuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzLlxuICovXG5mdW5jdGlvbiBhcnJheUxpa2VLZXlzKHZhbHVlLCBpbmhlcml0ZWQpIHtcbiAgdmFyIGlzQXJyID0gaXNBcnJheSh2YWx1ZSksXG4gICAgICBpc0FyZyA9ICFpc0FyciAmJiBpc0FyZ3VtZW50cyh2YWx1ZSksXG4gICAgICBpc0J1ZmYgPSAhaXNBcnIgJiYgIWlzQXJnICYmIGlzQnVmZmVyKHZhbHVlKSxcbiAgICAgIGlzVHlwZSA9ICFpc0FyciAmJiAhaXNBcmcgJiYgIWlzQnVmZiAmJiBpc1R5cGVkQXJyYXkodmFsdWUpLFxuICAgICAgc2tpcEluZGV4ZXMgPSBpc0FyciB8fCBpc0FyZyB8fCBpc0J1ZmYgfHwgaXNUeXBlLFxuICAgICAgcmVzdWx0ID0gc2tpcEluZGV4ZXMgPyBiYXNlVGltZXModmFsdWUubGVuZ3RoLCBTdHJpbmcpIDogW10sXG4gICAgICBsZW5ndGggPSByZXN1bHQubGVuZ3RoO1xuXG4gIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgIGlmICgoaW5oZXJpdGVkIHx8IGhhc093blByb3BlcnR5JDEuY2FsbCh2YWx1ZSwga2V5KSkgJiZcbiAgICAgICAgIShza2lwSW5kZXhlcyAmJiAoXG4gICAgICAgICAgIC8vIFNhZmFyaSA5IGhhcyBlbnVtZXJhYmxlIGBhcmd1bWVudHMubGVuZ3RoYCBpbiBzdHJpY3QgbW9kZS5cbiAgICAgICAgICAga2V5ID09ICdsZW5ndGgnIHx8XG4gICAgICAgICAgIC8vIE5vZGUuanMgMC4xMCBoYXMgZW51bWVyYWJsZSBub24taW5kZXggcHJvcGVydGllcyBvbiBidWZmZXJzLlxuICAgICAgICAgICAoaXNCdWZmICYmIChrZXkgPT0gJ29mZnNldCcgfHwga2V5ID09ICdwYXJlbnQnKSkgfHxcbiAgICAgICAgICAgLy8gUGhhbnRvbUpTIDIgaGFzIGVudW1lcmFibGUgbm9uLWluZGV4IHByb3BlcnRpZXMgb24gdHlwZWQgYXJyYXlzLlxuICAgICAgICAgICAoaXNUeXBlICYmIChrZXkgPT0gJ2J1ZmZlcicgfHwga2V5ID09ICdieXRlTGVuZ3RoJyB8fCBrZXkgPT0gJ2J5dGVPZmZzZXQnKSkgfHxcbiAgICAgICAgICAgLy8gU2tpcCBpbmRleCBwcm9wZXJ0aWVzLlxuICAgICAgICAgICBpc0luZGV4KGtleSwgbGVuZ3RoKVxuICAgICAgICApKSkge1xuICAgICAgcmVzdWx0LnB1c2goa2V5KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIFVzZWQgZm9yIGJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIG9iamVjdFByb3RvJDUgPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGxpa2VseSBhIHByb3RvdHlwZSBvYmplY3QuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSBwcm90b3R5cGUsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNQcm90b3R5cGUodmFsdWUpIHtcbiAgdmFyIEN0b3IgPSB2YWx1ZSAmJiB2YWx1ZS5jb25zdHJ1Y3RvcixcbiAgICAgIHByb3RvID0gKHR5cGVvZiBDdG9yID09ICdmdW5jdGlvbicgJiYgQ3Rvci5wcm90b3R5cGUpIHx8IG9iamVjdFByb3RvJDU7XG5cbiAgcmV0dXJuIHZhbHVlID09PSBwcm90bztcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgdW5hcnkgZnVuY3Rpb24gdGhhdCBpbnZva2VzIGBmdW5jYCB3aXRoIGl0cyBhcmd1bWVudCB0cmFuc2Zvcm1lZC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gd3JhcC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IHRyYW5zZm9ybSBUaGUgYXJndW1lbnQgdHJhbnNmb3JtLlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIG92ZXJBcmcoZnVuYywgdHJhbnNmb3JtKSB7XG4gIHJldHVybiBmdW5jdGlvbihhcmcpIHtcbiAgICByZXR1cm4gZnVuYyh0cmFuc2Zvcm0oYXJnKSk7XG4gIH07XG59XG5cbi8qIEJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cbnZhciBuYXRpdmVLZXlzID0gb3ZlckFyZyhPYmplY3Qua2V5cywgT2JqZWN0KTtcblxuLyoqIFVzZWQgZm9yIGJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIG9iamVjdFByb3RvJDQgPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byBjaGVjayBvYmplY3RzIGZvciBvd24gcHJvcGVydGllcy4gKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSQzID0gb2JqZWN0UHJvdG8kNC5oYXNPd25Qcm9wZXJ0eTtcblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5rZXlzYCB3aGljaCBkb2Vzbid0IHRyZWF0IHNwYXJzZSBhcnJheXMgYXMgZGVuc2UuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgYXJyYXkgb2YgcHJvcGVydHkgbmFtZXMuXG4gKi9cbmZ1bmN0aW9uIGJhc2VLZXlzKG9iamVjdCkge1xuICBpZiAoIWlzUHJvdG90eXBlKG9iamVjdCkpIHtcbiAgICByZXR1cm4gbmF0aXZlS2V5cyhvYmplY3QpO1xuICB9XG4gIHZhciByZXN1bHQgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIE9iamVjdChvYmplY3QpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5JDMuY2FsbChvYmplY3QsIGtleSkgJiYga2V5ICE9ICdjb25zdHJ1Y3RvcicpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGtleSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhcnJheSBvZiB0aGUgb3duIGVudW1lcmFibGUgcHJvcGVydHkgbmFtZXMgb2YgYG9iamVjdGAuXG4gKlxuICogKipOb3RlOioqIE5vbi1vYmplY3QgdmFsdWVzIGFyZSBjb2VyY2VkIHRvIG9iamVjdHMuIFNlZSB0aGVcbiAqIFtFUyBzcGVjXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy1vYmplY3Qua2V5cylcbiAqIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogQHN0YXRpY1xuICogQHNpbmNlIDAuMS4wXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IE9iamVjdFxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBhcnJheSBvZiBwcm9wZXJ0eSBuYW1lcy5cbiAqIEBleGFtcGxlXG4gKlxuICogZnVuY3Rpb24gRm9vKCkge1xuICogICB0aGlzLmEgPSAxO1xuICogICB0aGlzLmIgPSAyO1xuICogfVxuICpcbiAqIEZvby5wcm90b3R5cGUuYyA9IDM7XG4gKlxuICogXy5rZXlzKG5ldyBGb28pO1xuICogLy8gPT4gWydhJywgJ2InXSAoaXRlcmF0aW9uIG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkKVxuICpcbiAqIF8ua2V5cygnaGknKTtcbiAqIC8vID0+IFsnMCcsICcxJ11cbiAqL1xuZnVuY3Rpb24ga2V5cyhvYmplY3QpIHtcbiAgcmV0dXJuIGlzQXJyYXlMaWtlKG9iamVjdCkgPyBhcnJheUxpa2VLZXlzKG9iamVjdCkgOiBiYXNlS2V5cyhvYmplY3QpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVBcnJheUl0ZXJhdG9yKGNvbGwpIHtcbiAgICB2YXIgaSA9IC0xO1xuICAgIHZhciBsZW4gPSBjb2xsLmxlbmd0aDtcbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgcmV0dXJuICsraSA8IGxlbiA/IHt2YWx1ZTogY29sbFtpXSwga2V5OiBpfSA6IG51bGw7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVFUzIwMTVJdGVyYXRvcihpdGVyYXRvcikge1xuICAgIHZhciBpID0gLTE7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgIHZhciBpdGVtID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICBpZiAoaXRlbS5kb25lKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGkrKztcbiAgICAgICAgcmV0dXJuIHt2YWx1ZTogaXRlbS52YWx1ZSwga2V5OiBpfTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU9iamVjdEl0ZXJhdG9yKG9iaikge1xuICAgIHZhciBva2V5cyA9IGtleXMob2JqKTtcbiAgICB2YXIgaSA9IC0xO1xuICAgIHZhciBsZW4gPSBva2V5cy5sZW5ndGg7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgIHZhciBrZXkgPSBva2V5c1srK2ldO1xuICAgICAgICByZXR1cm4gaSA8IGxlbiA/IHt2YWx1ZTogb2JqW2tleV0sIGtleToga2V5fSA6IG51bGw7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gaXRlcmF0b3IoY29sbCkge1xuICAgIGlmIChpc0FycmF5TGlrZShjb2xsKSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlQXJyYXlJdGVyYXRvcihjb2xsKTtcbiAgICB9XG5cbiAgICB2YXIgaXRlcmF0b3IgPSBnZXRJdGVyYXRvcihjb2xsKTtcbiAgICByZXR1cm4gaXRlcmF0b3IgPyBjcmVhdGVFUzIwMTVJdGVyYXRvcihpdGVyYXRvcikgOiBjcmVhdGVPYmplY3RJdGVyYXRvcihjb2xsKTtcbn1cblxuZnVuY3Rpb24gb25seU9uY2UoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChmbiA9PT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGJhY2sgd2FzIGFscmVhZHkgY2FsbGVkLlwiKTtcbiAgICAgICAgdmFyIGNhbGxGbiA9IGZuO1xuICAgICAgICBmbiA9IG51bGw7XG4gICAgICAgIGNhbGxGbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIF9lYWNoT2ZMaW1pdChsaW1pdCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAob2JqLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBvbmNlKGNhbGxiYWNrIHx8IG5vb3ApO1xuICAgICAgICBpZiAobGltaXQgPD0gMCB8fCAhb2JqKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG5leHRFbGVtID0gaXRlcmF0b3Iob2JqKTtcbiAgICAgICAgdmFyIGRvbmUgPSBmYWxzZTtcbiAgICAgICAgdmFyIHJ1bm5pbmcgPSAwO1xuXG4gICAgICAgIGZ1bmN0aW9uIGl0ZXJhdGVlQ2FsbGJhY2soZXJyLCB2YWx1ZSkge1xuICAgICAgICAgICAgcnVubmluZyAtPSAxO1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh2YWx1ZSA9PT0gYnJlYWtMb29wIHx8IChkb25lICYmIHJ1bm5pbmcgPD0gMCkpIHtcbiAgICAgICAgICAgICAgICBkb25lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXBsZW5pc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlcGxlbmlzaCAoKSB7XG4gICAgICAgICAgICB3aGlsZSAocnVubmluZyA8IGxpbWl0ICYmICFkb25lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVsZW0gPSBuZXh0RWxlbSgpO1xuICAgICAgICAgICAgICAgIGlmIChlbGVtID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAocnVubmluZyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJ1bm5pbmcgKz0gMTtcbiAgICAgICAgICAgICAgICBpdGVyYXRlZShlbGVtLnZhbHVlLCBlbGVtLmtleSwgb25seU9uY2UoaXRlcmF0ZWVDYWxsYmFjaykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmVwbGVuaXNoKCk7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBUaGUgc2FtZSBhcyBbYGVhY2hPZmBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5lYWNoT2Z9IGJ1dCBydW5zIGEgbWF4aW11bSBvZiBgbGltaXRgIGFzeW5jIG9wZXJhdGlvbnMgYXQgYVxuICogdGltZS5cbiAqXG4gKiBAbmFtZSBlYWNoT2ZMaW1pdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMuZWFjaE9mXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZWFjaE9mfVxuICogQGFsaWFzIGZvckVhY2hPZkxpbWl0XG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtudW1iZXJ9IGxpbWl0IC0gVGhlIG1heGltdW0gbnVtYmVyIG9mIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEFuIGFzeW5jIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2hcbiAqIGl0ZW0gaW4gYGNvbGxgLiBUaGUgYGtleWAgaXMgdGhlIGl0ZW0ncyBrZXksIG9yIGluZGV4IGluIHRoZSBjYXNlIG9mIGFuXG4gKiBhcnJheS5cbiAqIEludm9rZWQgd2l0aCAoaXRlbSwga2V5LCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGxcbiAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gSW52b2tlZCB3aXRoIChlcnIpLlxuICovXG5mdW5jdGlvbiBlYWNoT2ZMaW1pdChjb2xsLCBsaW1pdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgX2VhY2hPZkxpbWl0KGxpbWl0KShjb2xsLCB3cmFwQXN5bmMoaXRlcmF0ZWUpLCBjYWxsYmFjayk7XG59XG5cbmZ1bmN0aW9uIGRvTGltaXQoZm4sIGxpbWl0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChpdGVyYWJsZSwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBmbihpdGVyYWJsZSwgbGltaXQsIGl0ZXJhdGVlLCBjYWxsYmFjayk7XG4gICAgfTtcbn1cblxuLy8gZWFjaE9mIGltcGxlbWVudGF0aW9uIG9wdGltaXplZCBmb3IgYXJyYXktbGlrZXNcbmZ1bmN0aW9uIGVhY2hPZkFycmF5TGlrZShjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayA9IG9uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgdmFyIGluZGV4ID0gMCxcbiAgICAgICAgY29tcGxldGVkID0gMCxcbiAgICAgICAgbGVuZ3RoID0gY29sbC5sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpdGVyYXRvckNhbGxiYWNrKGVyciwgdmFsdWUpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfSBlbHNlIGlmICgoKytjb21wbGV0ZWQgPT09IGxlbmd0aCkgfHwgdmFsdWUgPT09IGJyZWFrTG9vcCkge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgaXRlcmF0ZWUoY29sbFtpbmRleF0sIGluZGV4LCBvbmx5T25jZShpdGVyYXRvckNhbGxiYWNrKSk7XG4gICAgfVxufVxuXG4vLyBhIGdlbmVyaWMgdmVyc2lvbiBvZiBlYWNoT2Ygd2hpY2ggY2FuIGhhbmRsZSBhcnJheSwgb2JqZWN0LCBhbmQgaXRlcmF0b3IgY2FzZXMuXG52YXIgZWFjaE9mR2VuZXJpYyA9IGRvTGltaXQoZWFjaE9mTGltaXQsIEluZmluaXR5KTtcblxuLyoqXG4gKiBMaWtlIFtgZWFjaGBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5lYWNofSwgZXhjZXB0IHRoYXQgaXQgcGFzc2VzIHRoZSBrZXkgKG9yIGluZGV4KSBhcyB0aGUgc2Vjb25kIGFyZ3VtZW50XG4gKiB0byB0aGUgaXRlcmF0ZWUuXG4gKlxuICogQG5hbWUgZWFjaE9mXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAYWxpYXMgZm9yRWFjaE9mXG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHNlZSBbYXN5bmMuZWFjaF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmVhY2h9XG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoXG4gKiBpdGVtIGluIGBjb2xsYC5cbiAqIFRoZSBga2V5YCBpcyB0aGUgaXRlbSdzIGtleSwgb3IgaW5kZXggaW4gdGhlIGNhc2Ugb2YgYW4gYXJyYXkuXG4gKiBJbnZva2VkIHdpdGggKGl0ZW0sIGtleSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIEludm9rZWQgd2l0aCAoZXJyKS5cbiAqIEBleGFtcGxlXG4gKlxuICogdmFyIG9iaiA9IHtkZXY6IFwiL2Rldi5qc29uXCIsIHRlc3Q6IFwiL3Rlc3QuanNvblwiLCBwcm9kOiBcIi9wcm9kLmpzb25cIn07XG4gKiB2YXIgY29uZmlncyA9IHt9O1xuICpcbiAqIGFzeW5jLmZvckVhY2hPZihvYmosIGZ1bmN0aW9uICh2YWx1ZSwga2V5LCBjYWxsYmFjaykge1xuICogICAgIGZzLnJlYWRGaWxlKF9fZGlybmFtZSArIHZhbHVlLCBcInV0ZjhcIiwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICogICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAqICAgICAgICAgdHJ5IHtcbiAqICAgICAgICAgICAgIGNvbmZpZ3Nba2V5XSA9IEpTT04ucGFyc2UoZGF0YSk7XG4gKiAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAqICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlKTtcbiAqICAgICAgICAgfVxuICogICAgICAgICBjYWxsYmFjaygpO1xuICogICAgIH0pO1xuICogfSwgZnVuY3Rpb24gKGVycikge1xuICogICAgIGlmIChlcnIpIGNvbnNvbGUuZXJyb3IoZXJyLm1lc3NhZ2UpO1xuICogICAgIC8vIGNvbmZpZ3MgaXMgbm93IGEgbWFwIG9mIEpTT04gZGF0YVxuICogICAgIGRvU29tZXRoaW5nV2l0aChjb25maWdzKTtcbiAqIH0pO1xuICovXG52YXIgZWFjaE9mID0gZnVuY3Rpb24oY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGVhY2hPZkltcGxlbWVudGF0aW9uID0gaXNBcnJheUxpa2UoY29sbCkgPyBlYWNoT2ZBcnJheUxpa2UgOiBlYWNoT2ZHZW5lcmljO1xuICAgIGVhY2hPZkltcGxlbWVudGF0aW9uKGNvbGwsIHdyYXBBc3luYyhpdGVyYXRlZSksIGNhbGxiYWNrKTtcbn07XG5cbmZ1bmN0aW9uIGRvUGFyYWxsZWwoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKG9iaiwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBmbihlYWNoT2YsIG9iaiwgd3JhcEFzeW5jKGl0ZXJhdGVlKSwgY2FsbGJhY2spO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIF9hc3luY01hcChlYWNoZm4sIGFyciwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBub29wO1xuICAgIGFyciA9IGFyciB8fCBbXTtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIHZhciBjb3VudGVyID0gMDtcbiAgICB2YXIgX2l0ZXJhdGVlID0gd3JhcEFzeW5jKGl0ZXJhdGVlKTtcblxuICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh2YWx1ZSwgXywgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGluZGV4ID0gY291bnRlcisrO1xuICAgICAgICBfaXRlcmF0ZWUodmFsdWUsIGZ1bmN0aW9uIChlcnIsIHYpIHtcbiAgICAgICAgICAgIHJlc3VsdHNbaW5kZXhdID0gdjtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBQcm9kdWNlcyBhIG5ldyBjb2xsZWN0aW9uIG9mIHZhbHVlcyBieSBtYXBwaW5nIGVhY2ggdmFsdWUgaW4gYGNvbGxgIHRocm91Z2hcbiAqIHRoZSBgaXRlcmF0ZWVgIGZ1bmN0aW9uLiBUaGUgYGl0ZXJhdGVlYCBpcyBjYWxsZWQgd2l0aCBhbiBpdGVtIGZyb20gYGNvbGxgXG4gKiBhbmQgYSBjYWxsYmFjayBmb3Igd2hlbiBpdCBoYXMgZmluaXNoZWQgcHJvY2Vzc2luZy4gRWFjaCBvZiB0aGVzZSBjYWxsYmFja1xuICogdGFrZXMgMiBhcmd1bWVudHM6IGFuIGBlcnJvcmAsIGFuZCB0aGUgdHJhbnNmb3JtZWQgaXRlbSBmcm9tIGBjb2xsYC4gSWZcbiAqIGBpdGVyYXRlZWAgcGFzc2VzIGFuIGVycm9yIHRvIGl0cyBjYWxsYmFjaywgdGhlIG1haW4gYGNhbGxiYWNrYCAoZm9yIHRoZVxuICogYG1hcGAgZnVuY3Rpb24pIGlzIGltbWVkaWF0ZWx5IGNhbGxlZCB3aXRoIHRoZSBlcnJvci5cbiAqXG4gKiBOb3RlLCB0aGF0IHNpbmNlIHRoaXMgZnVuY3Rpb24gYXBwbGllcyB0aGUgYGl0ZXJhdGVlYCB0byBlYWNoIGl0ZW0gaW5cbiAqIHBhcmFsbGVsLCB0aGVyZSBpcyBubyBndWFyYW50ZWUgdGhhdCB0aGUgYGl0ZXJhdGVlYCBmdW5jdGlvbnMgd2lsbCBjb21wbGV0ZVxuICogaW4gb3JkZXIuIEhvd2V2ZXIsIHRoZSByZXN1bHRzIGFycmF5IHdpbGwgYmUgaW4gdGhlIHNhbWUgb3JkZXIgYXMgdGhlXG4gKiBvcmlnaW5hbCBgY29sbGAuXG4gKlxuICogSWYgYG1hcGAgaXMgcGFzc2VkIGFuIE9iamVjdCwgdGhlIHJlc3VsdHMgd2lsbCBiZSBhbiBBcnJheS4gIFRoZSByZXN1bHRzXG4gKiB3aWxsIHJvdWdobHkgYmUgaW4gdGhlIG9yZGVyIG9mIHRoZSBvcmlnaW5hbCBPYmplY3RzJyBrZXlzIChidXQgdGhpcyBjYW5cbiAqIHZhcnkgYWNyb3NzIEphdmFTY3JpcHQgZW5naW5lcykuXG4gKlxuICogQG5hbWUgbWFwXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEFuIGFzeW5jIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpblxuICogYGNvbGxgLlxuICogVGhlIGl0ZXJhdGVlIHNob3VsZCBjb21wbGV0ZSB3aXRoIHRoZSB0cmFuc2Zvcm1lZCBpdGVtLlxuICogSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGwgYGl0ZXJhdGVlYFxuICogZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gUmVzdWx0cyBpcyBhbiBBcnJheSBvZiB0aGVcbiAqIHRyYW5zZm9ybWVkIGl0ZW1zIGZyb20gdGhlIGBjb2xsYC4gSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdHMpLlxuICogQGV4YW1wbGVcbiAqXG4gKiBhc3luYy5tYXAoWydmaWxlMScsJ2ZpbGUyJywnZmlsZTMnXSwgZnMuc3RhdCwgZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gKiAgICAgLy8gcmVzdWx0cyBpcyBub3cgYW4gYXJyYXkgb2Ygc3RhdHMgZm9yIGVhY2ggZmlsZVxuICogfSk7XG4gKi9cbnZhciBtYXAgPSBkb1BhcmFsbGVsKF9hc3luY01hcCk7XG5cbi8qKlxuICogQXBwbGllcyB0aGUgcHJvdmlkZWQgYXJndW1lbnRzIHRvIGVhY2ggZnVuY3Rpb24gaW4gdGhlIGFycmF5LCBjYWxsaW5nXG4gKiBgY2FsbGJhY2tgIGFmdGVyIGFsbCBmdW5jdGlvbnMgaGF2ZSBjb21wbGV0ZWQuIElmIHlvdSBvbmx5IHByb3ZpZGUgdGhlIGZpcnN0XG4gKiBhcmd1bWVudCwgYGZuc2AsIHRoZW4gaXQgd2lsbCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCBsZXRzIHlvdSBwYXNzIGluIHRoZVxuICogYXJndW1lbnRzIGFzIGlmIGl0IHdlcmUgYSBzaW5nbGUgZnVuY3Rpb24gY2FsbC4gSWYgbW9yZSBhcmd1bWVudHMgYXJlXG4gKiBwcm92aWRlZCwgYGNhbGxiYWNrYCBpcyByZXF1aXJlZCB3aGlsZSBgYXJnc2AgaXMgc3RpbGwgb3B0aW9uYWwuXG4gKlxuICogQG5hbWUgYXBwbHlFYWNoXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gZm5zIC0gQSBjb2xsZWN0aW9uIG9mIHtAbGluayBBc3luY0Z1bmN0aW9ufXNcbiAqIHRvIGFsbCBjYWxsIHdpdGggdGhlIHNhbWUgYXJndW1lbnRzXG4gKiBAcGFyYW0gey4uLip9IFthcmdzXSAtIGFueSBudW1iZXIgb2Ygc2VwYXJhdGUgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlXG4gKiBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSB0aGUgZmluYWwgYXJndW1lbnQgc2hvdWxkIGJlIHRoZSBjYWxsYmFjayxcbiAqIGNhbGxlZCB3aGVuIGFsbCBmdW5jdGlvbnMgaGF2ZSBjb21wbGV0ZWQgcHJvY2Vzc2luZy5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gLSBJZiBvbmx5IHRoZSBmaXJzdCBhcmd1bWVudCwgYGZuc2AsIGlzIHByb3ZpZGVkLCBpdCB3aWxsXG4gKiByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCBsZXRzIHlvdSBwYXNzIGluIHRoZSBhcmd1bWVudHMgYXMgaWYgaXQgd2VyZSBhIHNpbmdsZVxuICogZnVuY3Rpb24gY2FsbC4gVGhlIHNpZ25hdHVyZSBpcyBgKC4uYXJncywgY2FsbGJhY2spYC4gSWYgaW52b2tlZCB3aXRoIGFueVxuICogYXJndW1lbnRzLCBgY2FsbGJhY2tgIGlzIHJlcXVpcmVkLlxuICogQGV4YW1wbGVcbiAqXG4gKiBhc3luYy5hcHBseUVhY2goW2VuYWJsZVNlYXJjaCwgdXBkYXRlU2NoZW1hXSwgJ2J1Y2tldCcsIGNhbGxiYWNrKTtcbiAqXG4gKiAvLyBwYXJ0aWFsIGFwcGxpY2F0aW9uIGV4YW1wbGU6XG4gKiBhc3luYy5lYWNoKFxuICogICAgIGJ1Y2tldHMsXG4gKiAgICAgYXN5bmMuYXBwbHlFYWNoKFtlbmFibGVTZWFyY2gsIHVwZGF0ZVNjaGVtYV0pLFxuICogICAgIGNhbGxiYWNrXG4gKiApO1xuICovXG52YXIgYXBwbHlFYWNoID0gYXBwbHlFYWNoJDEobWFwKTtcblxuZnVuY3Rpb24gZG9QYXJhbGxlbExpbWl0KGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChvYmosIGxpbWl0LCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGZuKF9lYWNoT2ZMaW1pdChsaW1pdCksIG9iaiwgd3JhcEFzeW5jKGl0ZXJhdGVlKSwgY2FsbGJhY2spO1xuICAgIH07XG59XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2BtYXBgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMubWFwfSBidXQgcnVucyBhIG1heGltdW0gb2YgYGxpbWl0YCBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqXG4gKiBAbmFtZSBtYXBMaW1pdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMubWFwXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMubWFwfVxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW5cbiAqIGBjb2xsYC5cbiAqIFRoZSBpdGVyYXRlZSBzaG91bGQgY29tcGxldGUgd2l0aCB0aGUgdHJhbnNmb3JtZWQgaXRlbS5cbiAqIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsIGBpdGVyYXRlZWBcbiAqIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIFJlc3VsdHMgaXMgYW4gYXJyYXkgb2YgdGhlXG4gKiB0cmFuc2Zvcm1lZCBpdGVtcyBmcm9tIHRoZSBgY29sbGAuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAqL1xudmFyIG1hcExpbWl0ID0gZG9QYXJhbGxlbExpbWl0KF9hc3luY01hcCk7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2BtYXBgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMubWFwfSBidXQgcnVucyBvbmx5IGEgc2luZ2xlIGFzeW5jIG9wZXJhdGlvbiBhdCBhIHRpbWUuXG4gKlxuICogQG5hbWUgbWFwU2VyaWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5tYXBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXB9XG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEFuIGFzeW5jIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpblxuICogYGNvbGxgLlxuICogVGhlIGl0ZXJhdGVlIHNob3VsZCBjb21wbGV0ZSB3aXRoIHRoZSB0cmFuc2Zvcm1lZCBpdGVtLlxuICogSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGwgYGl0ZXJhdGVlYFxuICogZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gUmVzdWx0cyBpcyBhbiBhcnJheSBvZiB0aGVcbiAqIHRyYW5zZm9ybWVkIGl0ZW1zIGZyb20gdGhlIGBjb2xsYC4gSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdHMpLlxuICovXG52YXIgbWFwU2VyaWVzID0gZG9MaW1pdChtYXBMaW1pdCwgMSk7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2BhcHBseUVhY2hgXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cuYXBwbHlFYWNofSBidXQgcnVucyBvbmx5IGEgc2luZ2xlIGFzeW5jIG9wZXJhdGlvbiBhdCBhIHRpbWUuXG4gKlxuICogQG5hbWUgYXBwbHlFYWNoU2VyaWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5hcHBseUVhY2hde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5hcHBseUVhY2h9XG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gZm5zIC0gQSBjb2xsZWN0aW9uIG9mIHtAbGluayBBc3luY0Z1bmN0aW9ufXMgdG8gYWxsXG4gKiBjYWxsIHdpdGggdGhlIHNhbWUgYXJndW1lbnRzXG4gKiBAcGFyYW0gey4uLip9IFthcmdzXSAtIGFueSBudW1iZXIgb2Ygc2VwYXJhdGUgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlXG4gKiBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSB0aGUgZmluYWwgYXJndW1lbnQgc2hvdWxkIGJlIHRoZSBjYWxsYmFjayxcbiAqIGNhbGxlZCB3aGVuIGFsbCBmdW5jdGlvbnMgaGF2ZSBjb21wbGV0ZWQgcHJvY2Vzc2luZy5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gLSBJZiBvbmx5IHRoZSBmaXJzdCBhcmd1bWVudCBpcyBwcm92aWRlZCwgaXQgd2lsbCByZXR1cm5cbiAqIGEgZnVuY3Rpb24gd2hpY2ggbGV0cyB5b3UgcGFzcyBpbiB0aGUgYXJndW1lbnRzIGFzIGlmIGl0IHdlcmUgYSBzaW5nbGVcbiAqIGZ1bmN0aW9uIGNhbGwuXG4gKi9cbnZhciBhcHBseUVhY2hTZXJpZXMgPSBhcHBseUVhY2gkMShtYXBTZXJpZXMpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBjb250aW51YXRpb24gZnVuY3Rpb24gd2l0aCBzb21lIGFyZ3VtZW50cyBhbHJlYWR5IGFwcGxpZWQuXG4gKlxuICogVXNlZnVsIGFzIGEgc2hvcnRoYW5kIHdoZW4gY29tYmluZWQgd2l0aCBvdGhlciBjb250cm9sIGZsb3cgZnVuY3Rpb25zLiBBbnlcbiAqIGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIHJldHVybmVkIGZ1bmN0aW9uIGFyZSBhZGRlZCB0byB0aGUgYXJndW1lbnRzXG4gKiBvcmlnaW5hbGx5IHBhc3NlZCB0byBhcHBseS5cbiAqXG4gKiBAbmFtZSBhcHBseVxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpVdGlsc1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IFV0aWxcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIC0gVGhlIGZ1bmN0aW9uIHlvdSB3YW50IHRvIGV2ZW50dWFsbHkgYXBwbHkgYWxsXG4gKiBhcmd1bWVudHMgdG8uIEludm9rZXMgd2l0aCAoYXJndW1lbnRzLi4uKS5cbiAqIEBwYXJhbSB7Li4uKn0gYXJndW1lbnRzLi4uIC0gQW55IG51bWJlciBvZiBhcmd1bWVudHMgdG8gYXV0b21hdGljYWxseSBhcHBseVxuICogd2hlbiB0aGUgY29udGludWF0aW9uIGlzIGNhbGxlZC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gdGhlIHBhcnRpYWxseS1hcHBsaWVkIGZ1bmN0aW9uXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIHVzaW5nIGFwcGx5XG4gKiBhc3luYy5wYXJhbGxlbChbXG4gKiAgICAgYXN5bmMuYXBwbHkoZnMud3JpdGVGaWxlLCAndGVzdGZpbGUxJywgJ3Rlc3QxJyksXG4gKiAgICAgYXN5bmMuYXBwbHkoZnMud3JpdGVGaWxlLCAndGVzdGZpbGUyJywgJ3Rlc3QyJylcbiAqIF0pO1xuICpcbiAqXG4gKiAvLyB0aGUgc2FtZSBwcm9jZXNzIHdpdGhvdXQgdXNpbmcgYXBwbHlcbiAqIGFzeW5jLnBhcmFsbGVsKFtcbiAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICogICAgICAgICBmcy53cml0ZUZpbGUoJ3Rlc3RmaWxlMScsICd0ZXN0MScsIGNhbGxiYWNrKTtcbiAqICAgICB9LFxuICogICAgIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIGZzLndyaXRlRmlsZSgndGVzdGZpbGUyJywgJ3Rlc3QyJywgY2FsbGJhY2spO1xuICogICAgIH1cbiAqIF0pO1xuICpcbiAqIC8vIEl0J3MgcG9zc2libGUgdG8gcGFzcyBhbnkgbnVtYmVyIG9mIGFkZGl0aW9uYWwgYXJndW1lbnRzIHdoZW4gY2FsbGluZyB0aGVcbiAqIC8vIGNvbnRpbnVhdGlvbjpcbiAqXG4gKiBub2RlPiB2YXIgZm4gPSBhc3luYy5hcHBseShzeXMucHV0cywgJ29uZScpO1xuICogbm9kZT4gZm4oJ3R3bycsICd0aHJlZScpO1xuICogb25lXG4gKiB0d29cbiAqIHRocmVlXG4gKi9cbnZhciBhcHBseSA9IGZ1bmN0aW9uKGZuLyosIC4uLmFyZ3MqLykge1xuICAgIHZhciBhcmdzID0gc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oLypjYWxsQXJncyovKSB7XG4gICAgICAgIHZhciBjYWxsQXJncyA9IHNsaWNlKGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBhcmdzLmNvbmNhdChjYWxsQXJncykpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIEEgc3BlY2lhbGl6ZWQgdmVyc2lvbiBvZiBgXy5mb3JFYWNoYCBmb3IgYXJyYXlzIHdpdGhvdXQgc3VwcG9ydCBmb3JcbiAqIGl0ZXJhdGVlIHNob3J0aGFuZHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXl9IFthcnJheV0gVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYGFycmF5YC5cbiAqL1xuZnVuY3Rpb24gYXJyYXlFYWNoKGFycmF5LCBpdGVyYXRlZSkge1xuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIGxlbmd0aCA9IGFycmF5ID09IG51bGwgPyAwIDogYXJyYXkubGVuZ3RoO1xuXG4gIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgaWYgKGl0ZXJhdGVlKGFycmF5W2luZGV4XSwgaW5kZXgsIGFycmF5KSA9PT0gZmFsc2UpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYXJyYXk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGJhc2UgZnVuY3Rpb24gZm9yIG1ldGhvZHMgbGlrZSBgXy5mb3JJbmAgYW5kIGBfLmZvck93bmAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2Zyb21SaWdodF0gU3BlY2lmeSBpdGVyYXRpbmcgZnJvbSByaWdodCB0byBsZWZ0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYmFzZSBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQmFzZUZvcihmcm9tUmlnaHQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCwgaXRlcmF0ZWUsIGtleXNGdW5jKSB7XG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGl0ZXJhYmxlID0gT2JqZWN0KG9iamVjdCksXG4gICAgICAgIHByb3BzID0ga2V5c0Z1bmMob2JqZWN0KSxcbiAgICAgICAgbGVuZ3RoID0gcHJvcHMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICB2YXIga2V5ID0gcHJvcHNbZnJvbVJpZ2h0ID8gbGVuZ3RoIDogKytpbmRleF07XG4gICAgICBpZiAoaXRlcmF0ZWUoaXRlcmFibGVba2V5XSwga2V5LCBpdGVyYWJsZSkgPT09IGZhbHNlKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0O1xuICB9O1xufVxuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBiYXNlRm9yT3duYCB3aGljaCBpdGVyYXRlcyBvdmVyIGBvYmplY3RgXG4gKiBwcm9wZXJ0aWVzIHJldHVybmVkIGJ5IGBrZXlzRnVuY2AgYW5kIGludm9rZXMgYGl0ZXJhdGVlYCBmb3IgZWFjaCBwcm9wZXJ0eS5cbiAqIEl0ZXJhdGVlIGZ1bmN0aW9ucyBtYXkgZXhpdCBpdGVyYXRpb24gZWFybHkgYnkgZXhwbGljaXRseSByZXR1cm5pbmcgYGZhbHNlYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBrZXlzRnVuYyBUaGUgZnVuY3Rpb24gdG8gZ2V0IHRoZSBrZXlzIG9mIGBvYmplY3RgLlxuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBgb2JqZWN0YC5cbiAqL1xudmFyIGJhc2VGb3IgPSBjcmVhdGVCYXNlRm9yKCk7XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uZm9yT3duYCB3aXRob3V0IHN1cHBvcnQgZm9yIGl0ZXJhdGVlIHNob3J0aGFuZHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBgb2JqZWN0YC5cbiAqL1xuZnVuY3Rpb24gYmFzZUZvck93bihvYmplY3QsIGl0ZXJhdGVlKSB7XG4gIHJldHVybiBvYmplY3QgJiYgYmFzZUZvcihvYmplY3QsIGl0ZXJhdGVlLCBrZXlzKTtcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5maW5kSW5kZXhgIGFuZCBgXy5maW5kTGFzdEluZGV4YCB3aXRob3V0XG4gKiBzdXBwb3J0IGZvciBpdGVyYXRlZSBzaG9ydGhhbmRzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaW5zcGVjdC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IHByZWRpY2F0ZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICogQHBhcmFtIHtudW1iZXJ9IGZyb21JbmRleCBUaGUgaW5kZXggdG8gc2VhcmNoIGZyb20uXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtmcm9tUmlnaHRdIFNwZWNpZnkgaXRlcmF0aW5nIGZyb20gcmlnaHQgdG8gbGVmdC5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBtYXRjaGVkIHZhbHVlLCBlbHNlIGAtMWAuXG4gKi9cbmZ1bmN0aW9uIGJhc2VGaW5kSW5kZXgoYXJyYXksIHByZWRpY2F0ZSwgZnJvbUluZGV4LCBmcm9tUmlnaHQpIHtcbiAgdmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aCxcbiAgICAgIGluZGV4ID0gZnJvbUluZGV4ICsgKGZyb21SaWdodCA/IDEgOiAtMSk7XG5cbiAgd2hpbGUgKChmcm9tUmlnaHQgPyBpbmRleC0tIDogKytpbmRleCA8IGxlbmd0aCkpIHtcbiAgICBpZiAocHJlZGljYXRlKGFycmF5W2luZGV4XSwgaW5kZXgsIGFycmF5KSkge1xuICAgICAgcmV0dXJuIGluZGV4O1xuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uaXNOYU5gIHdpdGhvdXQgc3VwcG9ydCBmb3IgbnVtYmVyIG9iamVjdHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYE5hTmAsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gYmFzZUlzTmFOKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPT0gdmFsdWU7XG59XG5cbi8qKlxuICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBfLmluZGV4T2ZgIHdoaWNoIHBlcmZvcm1zIHN0cmljdCBlcXVhbGl0eVxuICogY29tcGFyaXNvbnMgb2YgdmFsdWVzLCBpLmUuIGA9PT1gLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaW5zcGVjdC5cbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHNlYXJjaCBmb3IuXG4gKiBAcGFyYW0ge251bWJlcn0gZnJvbUluZGV4IFRoZSBpbmRleCB0byBzZWFyY2ggZnJvbS5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBtYXRjaGVkIHZhbHVlLCBlbHNlIGAtMWAuXG4gKi9cbmZ1bmN0aW9uIHN0cmljdEluZGV4T2YoYXJyYXksIHZhbHVlLCBmcm9tSW5kZXgpIHtcbiAgdmFyIGluZGV4ID0gZnJvbUluZGV4IC0gMSxcbiAgICAgIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblxuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIGlmIChhcnJheVtpbmRleF0gPT09IHZhbHVlKSB7XG4gICAgICByZXR1cm4gaW5kZXg7XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5pbmRleE9mYCB3aXRob3V0IGBmcm9tSW5kZXhgIGJvdW5kcyBjaGVja3MuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBpbnNwZWN0LlxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2VhcmNoIGZvci5cbiAqIEBwYXJhbSB7bnVtYmVyfSBmcm9tSW5kZXggVGhlIGluZGV4IHRvIHNlYXJjaCBmcm9tLlxuICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIG1hdGNoZWQgdmFsdWUsIGVsc2UgYC0xYC5cbiAqL1xuZnVuY3Rpb24gYmFzZUluZGV4T2YoYXJyYXksIHZhbHVlLCBmcm9tSW5kZXgpIHtcbiAgcmV0dXJuIHZhbHVlID09PSB2YWx1ZVxuICAgID8gc3RyaWN0SW5kZXhPZihhcnJheSwgdmFsdWUsIGZyb21JbmRleClcbiAgICA6IGJhc2VGaW5kSW5kZXgoYXJyYXksIGJhc2VJc05hTiwgZnJvbUluZGV4KTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHRoZSBiZXN0IG9yZGVyIGZvciBydW5uaW5nIHRoZSB7QGxpbmsgQXN5bmNGdW5jdGlvbn1zIGluIGB0YXNrc2AsIGJhc2VkIG9uXG4gKiB0aGVpciByZXF1aXJlbWVudHMuIEVhY2ggZnVuY3Rpb24gY2FuIG9wdGlvbmFsbHkgZGVwZW5kIG9uIG90aGVyIGZ1bmN0aW9uc1xuICogYmVpbmcgY29tcGxldGVkIGZpcnN0LCBhbmQgZWFjaCBmdW5jdGlvbiBpcyBydW4gYXMgc29vbiBhcyBpdHMgcmVxdWlyZW1lbnRzXG4gKiBhcmUgc2F0aXNmaWVkLlxuICpcbiAqIElmIGFueSBvZiB0aGUge0BsaW5rIEFzeW5jRnVuY3Rpb259cyBwYXNzIGFuIGVycm9yIHRvIHRoZWlyIGNhbGxiYWNrLCB0aGUgYGF1dG9gIHNlcXVlbmNlXG4gKiB3aWxsIHN0b3AuIEZ1cnRoZXIgdGFza3Mgd2lsbCBub3QgZXhlY3V0ZSAoc28gYW55IG90aGVyIGZ1bmN0aW9ucyBkZXBlbmRpbmdcbiAqIG9uIGl0IHdpbGwgbm90IHJ1biksIGFuZCB0aGUgbWFpbiBgY2FsbGJhY2tgIGlzIGltbWVkaWF0ZWx5IGNhbGxlZCB3aXRoIHRoZVxuICogZXJyb3IuXG4gKlxuICoge0BsaW5rIEFzeW5jRnVuY3Rpb259cyBhbHNvIHJlY2VpdmUgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHJlc3VsdHMgb2YgZnVuY3Rpb25zIHdoaWNoXG4gKiBoYXZlIGNvbXBsZXRlZCBzbyBmYXIgYXMgdGhlIGZpcnN0IGFyZ3VtZW50LCBpZiB0aGV5IGhhdmUgZGVwZW5kZW5jaWVzLiBJZiBhXG4gKiB0YXNrIGZ1bmN0aW9uIGhhcyBubyBkZXBlbmRlbmNpZXMsIGl0IHdpbGwgb25seSBiZSBwYXNzZWQgYSBjYWxsYmFjay5cbiAqXG4gKiBAbmFtZSBhdXRvXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge09iamVjdH0gdGFza3MgLSBBbiBvYmplY3QuIEVhY2ggb2YgaXRzIHByb3BlcnRpZXMgaXMgZWl0aGVyIGFcbiAqIGZ1bmN0aW9uIG9yIGFuIGFycmF5IG9mIHJlcXVpcmVtZW50cywgd2l0aCB0aGUge0BsaW5rIEFzeW5jRnVuY3Rpb259IGl0c2VsZiB0aGUgbGFzdCBpdGVtXG4gKiBpbiB0aGUgYXJyYXkuIFRoZSBvYmplY3QncyBrZXkgb2YgYSBwcm9wZXJ0eSBzZXJ2ZXMgYXMgdGhlIG5hbWUgb2YgdGhlIHRhc2tcbiAqIGRlZmluZWQgYnkgdGhhdCBwcm9wZXJ0eSwgaS5lLiBjYW4gYmUgdXNlZCB3aGVuIHNwZWNpZnlpbmcgcmVxdWlyZW1lbnRzIGZvclxuICogb3RoZXIgdGFza3MuIFRoZSBmdW5jdGlvbiByZWNlaXZlcyBvbmUgb3IgdHdvIGFyZ3VtZW50czpcbiAqICogYSBgcmVzdWx0c2Agb2JqZWN0LCBjb250YWluaW5nIHRoZSByZXN1bHRzIG9mIHRoZSBwcmV2aW91c2x5IGV4ZWN1dGVkXG4gKiAgIGZ1bmN0aW9ucywgb25seSBwYXNzZWQgaWYgdGhlIHRhc2sgaGFzIGFueSBkZXBlbmRlbmNpZXMsXG4gKiAqIGEgYGNhbGxiYWNrKGVyciwgcmVzdWx0KWAgZnVuY3Rpb24sIHdoaWNoIG11c3QgYmUgY2FsbGVkIHdoZW4gZmluaXNoZWQsXG4gKiAgIHBhc3NpbmcgYW4gYGVycm9yYCAod2hpY2ggY2FuIGJlIGBudWxsYCkgYW5kIHRoZSByZXN1bHQgb2YgdGhlIGZ1bmN0aW9uJ3NcbiAqICAgZXhlY3V0aW9uLlxuICogQHBhcmFtIHtudW1iZXJ9IFtjb25jdXJyZW5jeT1JbmZpbml0eV0gLSBBbiBvcHRpb25hbCBgaW50ZWdlcmAgZm9yXG4gKiBkZXRlcm1pbmluZyB0aGUgbWF4aW11bSBudW1iZXIgb2YgdGFza3MgdGhhdCBjYW4gYmUgcnVuIGluIHBhcmFsbGVsLiBCeVxuICogZGVmYXVsdCwgYXMgbWFueSBhcyBwb3NzaWJsZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBbiBvcHRpb25hbCBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGxcbiAqIHRoZSB0YXNrcyBoYXZlIGJlZW4gY29tcGxldGVkLiBJdCByZWNlaXZlcyB0aGUgYGVycmAgYXJndW1lbnQgaWYgYW55IGB0YXNrc2BcbiAqIHBhc3MgYW4gZXJyb3IgdG8gdGhlaXIgY2FsbGJhY2suIFJlc3VsdHMgYXJlIGFsd2F5cyByZXR1cm5lZDsgaG93ZXZlciwgaWYgYW5cbiAqIGVycm9yIG9jY3Vycywgbm8gZnVydGhlciBgdGFza3NgIHdpbGwgYmUgcGVyZm9ybWVkLCBhbmQgdGhlIHJlc3VsdHMgb2JqZWN0XG4gKiB3aWxsIG9ubHkgY29udGFpbiBwYXJ0aWFsIHJlc3VsdHMuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAqIEByZXR1cm5zIHVuZGVmaW5lZFxuICogQGV4YW1wbGVcbiAqXG4gKiBhc3luYy5hdXRvKHtcbiAqICAgICAvLyB0aGlzIGZ1bmN0aW9uIHdpbGwganVzdCBiZSBwYXNzZWQgYSBjYWxsYmFja1xuICogICAgIHJlYWREYXRhOiBhc3luYy5hcHBseShmcy5yZWFkRmlsZSwgJ2RhdGEudHh0JywgJ3V0Zi04JyksXG4gKiAgICAgc2hvd0RhdGE6IFsncmVhZERhdGEnLCBmdW5jdGlvbihyZXN1bHRzLCBjYikge1xuICogICAgICAgICAvLyByZXN1bHRzLnJlYWREYXRhIGlzIHRoZSBmaWxlJ3MgY29udGVudHNcbiAqICAgICAgICAgLy8gLi4uXG4gKiAgICAgfV1cbiAqIH0sIGNhbGxiYWNrKTtcbiAqXG4gKiBhc3luYy5hdXRvKHtcbiAqICAgICBnZXRfZGF0YTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ2luIGdldF9kYXRhJyk7XG4gKiAgICAgICAgIC8vIGFzeW5jIGNvZGUgdG8gZ2V0IHNvbWUgZGF0YVxuICogICAgICAgICBjYWxsYmFjayhudWxsLCAnZGF0YScsICdjb252ZXJ0ZWQgdG8gYXJyYXknKTtcbiAqICAgICB9LFxuICogICAgIG1ha2VfZm9sZGVyOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICogICAgICAgICBjb25zb2xlLmxvZygnaW4gbWFrZV9mb2xkZXInKTtcbiAqICAgICAgICAgLy8gYXN5bmMgY29kZSB0byBjcmVhdGUgYSBkaXJlY3RvcnkgdG8gc3RvcmUgYSBmaWxlIGluXG4gKiAgICAgICAgIC8vIHRoaXMgaXMgcnVuIGF0IHRoZSBzYW1lIHRpbWUgYXMgZ2V0dGluZyB0aGUgZGF0YVxuICogICAgICAgICBjYWxsYmFjayhudWxsLCAnZm9sZGVyJyk7XG4gKiAgICAgfSxcbiAqICAgICB3cml0ZV9maWxlOiBbJ2dldF9kYXRhJywgJ21ha2VfZm9sZGVyJywgZnVuY3Rpb24ocmVzdWx0cywgY2FsbGJhY2spIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ2luIHdyaXRlX2ZpbGUnLCBKU09OLnN0cmluZ2lmeShyZXN1bHRzKSk7XG4gKiAgICAgICAgIC8vIG9uY2UgdGhlcmUgaXMgc29tZSBkYXRhIGFuZCB0aGUgZGlyZWN0b3J5IGV4aXN0cyxcbiAqICAgICAgICAgLy8gd3JpdGUgdGhlIGRhdGEgdG8gYSBmaWxlIGluIHRoZSBkaXJlY3RvcnlcbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ2ZpbGVuYW1lJyk7XG4gKiAgICAgfV0sXG4gKiAgICAgZW1haWxfbGluazogWyd3cml0ZV9maWxlJywgZnVuY3Rpb24ocmVzdWx0cywgY2FsbGJhY2spIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coJ2luIGVtYWlsX2xpbmsnLCBKU09OLnN0cmluZ2lmeShyZXN1bHRzKSk7XG4gKiAgICAgICAgIC8vIG9uY2UgdGhlIGZpbGUgaXMgd3JpdHRlbiBsZXQncyBlbWFpbCBhIGxpbmsgdG8gaXQuLi5cbiAqICAgICAgICAgLy8gcmVzdWx0cy53cml0ZV9maWxlIGNvbnRhaW5zIHRoZSBmaWxlbmFtZSByZXR1cm5lZCBieSB3cml0ZV9maWxlLlxuICogICAgICAgICBjYWxsYmFjayhudWxsLCB7J2ZpbGUnOnJlc3VsdHMud3JpdGVfZmlsZSwgJ2VtYWlsJzondXNlckBleGFtcGxlLmNvbSd9KTtcbiAqICAgICB9XVxuICogfSwgZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gKiAgICAgY29uc29sZS5sb2coJ2VyciA9ICcsIGVycik7XG4gKiAgICAgY29uc29sZS5sb2coJ3Jlc3VsdHMgPSAnLCByZXN1bHRzKTtcbiAqIH0pO1xuICovXG52YXIgYXV0byA9IGZ1bmN0aW9uICh0YXNrcywgY29uY3VycmVuY3ksIGNhbGxiYWNrKSB7XG4gICAgaWYgKHR5cGVvZiBjb25jdXJyZW5jeSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBjb25jdXJyZW5jeSBpcyBvcHRpb25hbCwgc2hpZnQgdGhlIGFyZ3MuXG4gICAgICAgIGNhbGxiYWNrID0gY29uY3VycmVuY3k7XG4gICAgICAgIGNvbmN1cnJlbmN5ID0gbnVsbDtcbiAgICB9XG4gICAgY2FsbGJhY2sgPSBvbmNlKGNhbGxiYWNrIHx8IG5vb3ApO1xuICAgIHZhciBrZXlzJCQxID0ga2V5cyh0YXNrcyk7XG4gICAgdmFyIG51bVRhc2tzID0ga2V5cyQkMS5sZW5ndGg7XG4gICAgaWYgKCFudW1UYXNrcykge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCk7XG4gICAgfVxuICAgIGlmICghY29uY3VycmVuY3kpIHtcbiAgICAgICAgY29uY3VycmVuY3kgPSBudW1UYXNrcztcbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0cyA9IHt9O1xuICAgIHZhciBydW5uaW5nVGFza3MgPSAwO1xuICAgIHZhciBoYXNFcnJvciA9IGZhbHNlO1xuXG4gICAgdmFyIGxpc3RlbmVycyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICB2YXIgcmVhZHlUYXNrcyA9IFtdO1xuXG4gICAgLy8gZm9yIGN5Y2xlIGRldGVjdGlvbjpcbiAgICB2YXIgcmVhZHlUb0NoZWNrID0gW107IC8vIHRhc2tzIHRoYXQgaGF2ZSBiZWVuIGlkZW50aWZpZWQgYXMgcmVhY2hhYmxlXG4gICAgLy8gd2l0aG91dCB0aGUgcG9zc2liaWxpdHkgb2YgcmV0dXJuaW5nIHRvIGFuIGFuY2VzdG9yIHRhc2tcbiAgICB2YXIgdW5jaGVja2VkRGVwZW5kZW5jaWVzID0ge307XG5cbiAgICBiYXNlRm9yT3duKHRhc2tzLCBmdW5jdGlvbiAodGFzaywga2V5KSB7XG4gICAgICAgIGlmICghaXNBcnJheSh0YXNrKSkge1xuICAgICAgICAgICAgLy8gbm8gZGVwZW5kZW5jaWVzXG4gICAgICAgICAgICBlbnF1ZXVlVGFzayhrZXksIFt0YXNrXSk7XG4gICAgICAgICAgICByZWFkeVRvQ2hlY2sucHVzaChrZXkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGRlcGVuZGVuY2llcyA9IHRhc2suc2xpY2UoMCwgdGFzay5sZW5ndGggLSAxKTtcbiAgICAgICAgdmFyIHJlbWFpbmluZ0RlcGVuZGVuY2llcyA9IGRlcGVuZGVuY2llcy5sZW5ndGg7XG4gICAgICAgIGlmIChyZW1haW5pbmdEZXBlbmRlbmNpZXMgPT09IDApIHtcbiAgICAgICAgICAgIGVucXVldWVUYXNrKGtleSwgdGFzayk7XG4gICAgICAgICAgICByZWFkeVRvQ2hlY2sucHVzaChrZXkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHVuY2hlY2tlZERlcGVuZGVuY2llc1trZXldID0gcmVtYWluaW5nRGVwZW5kZW5jaWVzO1xuXG4gICAgICAgIGFycmF5RWFjaChkZXBlbmRlbmNpZXMsIGZ1bmN0aW9uIChkZXBlbmRlbmN5TmFtZSkge1xuICAgICAgICAgICAgaWYgKCF0YXNrc1tkZXBlbmRlbmN5TmFtZV0pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FzeW5jLmF1dG8gdGFzayBgJyArIGtleSArXG4gICAgICAgICAgICAgICAgICAgICdgIGhhcyBhIG5vbi1leGlzdGVudCBkZXBlbmRlbmN5IGAnICtcbiAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW5jeU5hbWUgKyAnYCBpbiAnICtcbiAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW5jaWVzLmpvaW4oJywgJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWRkTGlzdGVuZXIoZGVwZW5kZW5jeU5hbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZW1haW5pbmdEZXBlbmRlbmNpZXMtLTtcbiAgICAgICAgICAgICAgICBpZiAocmVtYWluaW5nRGVwZW5kZW5jaWVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGVucXVldWVUYXNrKGtleSwgdGFzayk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgY2hlY2tGb3JEZWFkbG9ja3MoKTtcbiAgICBwcm9jZXNzUXVldWUoKTtcblxuICAgIGZ1bmN0aW9uIGVucXVldWVUYXNrKGtleSwgdGFzaykge1xuICAgICAgICByZWFkeVRhc2tzLnB1c2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcnVuVGFzayhrZXksIHRhc2spO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcm9jZXNzUXVldWUoKSB7XG4gICAgICAgIGlmIChyZWFkeVRhc2tzLmxlbmd0aCA9PT0gMCAmJiBydW5uaW5nVGFza3MgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCByZXN1bHRzKTtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZShyZWFkeVRhc2tzLmxlbmd0aCAmJiBydW5uaW5nVGFza3MgPCBjb25jdXJyZW5jeSkge1xuICAgICAgICAgICAgdmFyIHJ1biA9IHJlYWR5VGFza3Muc2hpZnQoKTtcbiAgICAgICAgICAgIHJ1bigpO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGRMaXN0ZW5lcih0YXNrTmFtZSwgZm4pIHtcbiAgICAgICAgdmFyIHRhc2tMaXN0ZW5lcnMgPSBsaXN0ZW5lcnNbdGFza05hbWVdO1xuICAgICAgICBpZiAoIXRhc2tMaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgIHRhc2tMaXN0ZW5lcnMgPSBsaXN0ZW5lcnNbdGFza05hbWVdID0gW107XG4gICAgICAgIH1cblxuICAgICAgICB0YXNrTGlzdGVuZXJzLnB1c2goZm4pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRhc2tDb21wbGV0ZSh0YXNrTmFtZSkge1xuICAgICAgICB2YXIgdGFza0xpc3RlbmVycyA9IGxpc3RlbmVyc1t0YXNrTmFtZV0gfHwgW107XG4gICAgICAgIGFycmF5RWFjaCh0YXNrTGlzdGVuZXJzLCBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIGZuKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzUXVldWUoKTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHJ1blRhc2soa2V5LCB0YXNrKSB7XG4gICAgICAgIGlmIChoYXNFcnJvcikgcmV0dXJuO1xuXG4gICAgICAgIHZhciB0YXNrQ2FsbGJhY2sgPSBvbmx5T25jZShmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICAgICAgICAgICAgcnVubmluZ1Rhc2tzLS07XG4gICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBzbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHZhciBzYWZlUmVzdWx0cyA9IHt9O1xuICAgICAgICAgICAgICAgIGJhc2VGb3JPd24ocmVzdWx0cywgZnVuY3Rpb24odmFsLCBya2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW3JrZXldID0gdmFsO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW2tleV0gPSByZXN1bHQ7XG4gICAgICAgICAgICAgICAgaGFzRXJyb3IgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGxpc3RlbmVycyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIHNhZmVSZXN1bHRzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0c1trZXldID0gcmVzdWx0O1xuICAgICAgICAgICAgICAgIHRhc2tDb21wbGV0ZShrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBydW5uaW5nVGFza3MrKztcbiAgICAgICAgdmFyIHRhc2tGbiA9IHdyYXBBc3luYyh0YXNrW3Rhc2subGVuZ3RoIC0gMV0pO1xuICAgICAgICBpZiAodGFzay5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0YXNrRm4ocmVzdWx0cywgdGFza0NhbGxiYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRhc2tGbih0YXNrQ2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tGb3JEZWFkbG9ja3MoKSB7XG4gICAgICAgIC8vIEthaG4ncyBhbGdvcml0aG1cbiAgICAgICAgLy8gaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvVG9wb2xvZ2ljYWxfc29ydGluZyNLYWhuLjI3c19hbGdvcml0aG1cbiAgICAgICAgLy8gaHR0cDovL2Nvbm5hbGxlLmJsb2dzcG90LmNvbS8yMDEzLzEwL3RvcG9sb2dpY2FsLXNvcnRpbmdrYWhuLWFsZ29yaXRobS5odG1sXG4gICAgICAgIHZhciBjdXJyZW50VGFzaztcbiAgICAgICAgdmFyIGNvdW50ZXIgPSAwO1xuICAgICAgICB3aGlsZSAocmVhZHlUb0NoZWNrLmxlbmd0aCkge1xuICAgICAgICAgICAgY3VycmVudFRhc2sgPSByZWFkeVRvQ2hlY2sucG9wKCk7XG4gICAgICAgICAgICBjb3VudGVyKys7XG4gICAgICAgICAgICBhcnJheUVhY2goZ2V0RGVwZW5kZW50cyhjdXJyZW50VGFzayksIGZ1bmN0aW9uIChkZXBlbmRlbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoLS11bmNoZWNrZWREZXBlbmRlbmNpZXNbZGVwZW5kZW50XSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZWFkeVRvQ2hlY2sucHVzaChkZXBlbmRlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvdW50ZXIgIT09IG51bVRhc2tzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgJ2FzeW5jLmF1dG8gY2Fubm90IGV4ZWN1dGUgdGFza3MgZHVlIHRvIGEgcmVjdXJzaXZlIGRlcGVuZGVuY3knXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RGVwZW5kZW50cyh0YXNrTmFtZSkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICAgIGJhc2VGb3JPd24odGFza3MsIGZ1bmN0aW9uICh0YXNrLCBrZXkpIHtcbiAgICAgICAgICAgIGlmIChpc0FycmF5KHRhc2spICYmIGJhc2VJbmRleE9mKHRhc2ssIHRhc2tOYW1lLCAwKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBIHNwZWNpYWxpemVkIHZlcnNpb24gb2YgYF8ubWFwYCBmb3IgYXJyYXlzIHdpdGhvdXQgc3VwcG9ydCBmb3IgaXRlcmF0ZWVcbiAqIHNob3J0aGFuZHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXl9IFthcnJheV0gVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIG5ldyBtYXBwZWQgYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIGFycmF5TWFwKGFycmF5LCBpdGVyYXRlZSkge1xuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIGxlbmd0aCA9IGFycmF5ID09IG51bGwgPyAwIDogYXJyYXkubGVuZ3RoLFxuICAgICAgcmVzdWx0ID0gQXJyYXkobGVuZ3RoKTtcblxuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIHJlc3VsdFtpbmRleF0gPSBpdGVyYXRlZShhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCByZWZlcmVuY2VzLiAqL1xudmFyIHN5bWJvbFRhZyA9ICdbb2JqZWN0IFN5bWJvbF0nO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgU3ltYm9sYCBwcmltaXRpdmUgb3Igb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgc3ltYm9sLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNTeW1ib2woU3ltYm9sLml0ZXJhdG9yKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzU3ltYm9sKCdhYmMnKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzU3ltYm9sKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ3N5bWJvbCcgfHxcbiAgICAoaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBiYXNlR2V0VGFnKHZhbHVlKSA9PSBzeW1ib2xUYWcpO1xufVxuXG4vKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB2YXJpb3VzIGBOdW1iZXJgIGNvbnN0YW50cy4gKi9cbnZhciBJTkZJTklUWSA9IDEgLyAwO1xuXG4vKiogVXNlZCB0byBjb252ZXJ0IHN5bWJvbHMgdG8gcHJpbWl0aXZlcyBhbmQgc3RyaW5ncy4gKi9cbnZhciBzeW1ib2xQcm90byA9IFN5bWJvbCQxID8gU3ltYm9sJDEucHJvdG90eXBlIDogdW5kZWZpbmVkO1xudmFyIHN5bWJvbFRvU3RyaW5nID0gc3ltYm9sUHJvdG8gPyBzeW1ib2xQcm90by50b1N0cmluZyA6IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy50b1N0cmluZ2Agd2hpY2ggZG9lc24ndCBjb252ZXJ0IG51bGxpc2hcbiAqIHZhbHVlcyB0byBlbXB0eSBzdHJpbmdzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBwcm9jZXNzLlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBiYXNlVG9TdHJpbmcodmFsdWUpIHtcbiAgLy8gRXhpdCBlYXJseSBmb3Igc3RyaW5ncyB0byBhdm9pZCBhIHBlcmZvcm1hbmNlIGhpdCBpbiBzb21lIGVudmlyb25tZW50cy5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAvLyBSZWN1cnNpdmVseSBjb252ZXJ0IHZhbHVlcyAoc3VzY2VwdGlibGUgdG8gY2FsbCBzdGFjayBsaW1pdHMpLlxuICAgIHJldHVybiBhcnJheU1hcCh2YWx1ZSwgYmFzZVRvU3RyaW5nKSArICcnO1xuICB9XG4gIGlmIChpc1N5bWJvbCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gc3ltYm9sVG9TdHJpbmcgPyBzeW1ib2xUb1N0cmluZy5jYWxsKHZhbHVlKSA6ICcnO1xuICB9XG4gIHZhciByZXN1bHQgPSAodmFsdWUgKyAnJyk7XG4gIHJldHVybiAocmVzdWx0ID09ICcwJyAmJiAoMSAvIHZhbHVlKSA9PSAtSU5GSU5JVFkpID8gJy0wJyA6IHJlc3VsdDtcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5zbGljZWAgd2l0aG91dCBhbiBpdGVyYXRlZSBjYWxsIGd1YXJkLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gc2xpY2UuXG4gKiBAcGFyYW0ge251bWJlcn0gW3N0YXJ0PTBdIFRoZSBzdGFydCBwb3NpdGlvbi5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbZW5kPWFycmF5Lmxlbmd0aF0gVGhlIGVuZCBwb3NpdGlvbi5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgc2xpY2Ugb2YgYGFycmF5YC5cbiAqL1xuZnVuY3Rpb24gYmFzZVNsaWNlKGFycmF5LCBzdGFydCwgZW5kKSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IC1zdGFydCA+IGxlbmd0aCA/IDAgOiAobGVuZ3RoICsgc3RhcnQpO1xuICB9XG4gIGVuZCA9IGVuZCA+IGxlbmd0aCA/IGxlbmd0aCA6IGVuZDtcbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuZ3RoO1xuICB9XG4gIGxlbmd0aCA9IHN0YXJ0ID4gZW5kID8gMCA6ICgoZW5kIC0gc3RhcnQpID4+PiAwKTtcbiAgc3RhcnQgPj4+PSAwO1xuXG4gIHZhciByZXN1bHQgPSBBcnJheShsZW5ndGgpO1xuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIHJlc3VsdFtpbmRleF0gPSBhcnJheVtpbmRleCArIHN0YXJ0XTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIENhc3RzIGBhcnJheWAgdG8gYSBzbGljZSBpZiBpdCdzIG5lZWRlZC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGluc3BlY3QuXG4gKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgVGhlIHN0YXJ0IHBvc2l0aW9uLlxuICogQHBhcmFtIHtudW1iZXJ9IFtlbmQ9YXJyYXkubGVuZ3RoXSBUaGUgZW5kIHBvc2l0aW9uLlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBjYXN0IHNsaWNlLlxuICovXG5mdW5jdGlvbiBjYXN0U2xpY2UoYXJyYXksIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW5ndGggOiBlbmQ7XG4gIHJldHVybiAoIXN0YXJ0ICYmIGVuZCA+PSBsZW5ndGgpID8gYXJyYXkgOiBiYXNlU2xpY2UoYXJyYXksIHN0YXJ0LCBlbmQpO1xufVxuXG4vKipcbiAqIFVzZWQgYnkgYF8udHJpbWAgYW5kIGBfLnRyaW1FbmRgIHRvIGdldCB0aGUgaW5kZXggb2YgdGhlIGxhc3Qgc3RyaW5nIHN5bWJvbFxuICogdGhhdCBpcyBub3QgZm91bmQgaW4gdGhlIGNoYXJhY3RlciBzeW1ib2xzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBzdHJTeW1ib2xzIFRoZSBzdHJpbmcgc3ltYm9scyB0byBpbnNwZWN0LlxuICogQHBhcmFtIHtBcnJheX0gY2hyU3ltYm9scyBUaGUgY2hhcmFjdGVyIHN5bWJvbHMgdG8gZmluZC5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBsYXN0IHVubWF0Y2hlZCBzdHJpbmcgc3ltYm9sLlxuICovXG5mdW5jdGlvbiBjaGFyc0VuZEluZGV4KHN0clN5bWJvbHMsIGNoclN5bWJvbHMpIHtcbiAgdmFyIGluZGV4ID0gc3RyU3ltYm9scy5sZW5ndGg7XG5cbiAgd2hpbGUgKGluZGV4LS0gJiYgYmFzZUluZGV4T2YoY2hyU3ltYm9scywgc3RyU3ltYm9sc1tpbmRleF0sIDApID4gLTEpIHt9XG4gIHJldHVybiBpbmRleDtcbn1cblxuLyoqXG4gKiBVc2VkIGJ5IGBfLnRyaW1gIGFuZCBgXy50cmltU3RhcnRgIHRvIGdldCB0aGUgaW5kZXggb2YgdGhlIGZpcnN0IHN0cmluZyBzeW1ib2xcbiAqIHRoYXQgaXMgbm90IGZvdW5kIGluIHRoZSBjaGFyYWN0ZXIgc3ltYm9scy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheX0gc3RyU3ltYm9scyBUaGUgc3RyaW5nIHN5bWJvbHMgdG8gaW5zcGVjdC5cbiAqIEBwYXJhbSB7QXJyYXl9IGNoclN5bWJvbHMgVGhlIGNoYXJhY3RlciBzeW1ib2xzIHRvIGZpbmQuXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgZmlyc3QgdW5tYXRjaGVkIHN0cmluZyBzeW1ib2wuXG4gKi9cbmZ1bmN0aW9uIGNoYXJzU3RhcnRJbmRleChzdHJTeW1ib2xzLCBjaHJTeW1ib2xzKSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgbGVuZ3RoID0gc3RyU3ltYm9scy5sZW5ndGg7XG5cbiAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGggJiYgYmFzZUluZGV4T2YoY2hyU3ltYm9scywgc3RyU3ltYm9sc1tpbmRleF0sIDApID4gLTEpIHt9XG4gIHJldHVybiBpbmRleDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhbiBBU0NJSSBgc3RyaW5nYCB0byBhbiBhcnJheS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBUaGUgc3RyaW5nIHRvIGNvbnZlcnQuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGNvbnZlcnRlZCBhcnJheS5cbiAqL1xuZnVuY3Rpb24gYXNjaWlUb0FycmF5KHN0cmluZykge1xuICByZXR1cm4gc3RyaW5nLnNwbGl0KCcnKTtcbn1cblxuLyoqIFVzZWQgdG8gY29tcG9zZSB1bmljb2RlIGNoYXJhY3RlciBjbGFzc2VzLiAqL1xudmFyIHJzQXN0cmFsUmFuZ2UgPSAnXFxcXHVkODAwLVxcXFx1ZGZmZic7XG52YXIgcnNDb21ib01hcmtzUmFuZ2UgPSAnXFxcXHUwMzAwLVxcXFx1MDM2ZlxcXFx1ZmUyMC1cXFxcdWZlMjMnO1xudmFyIHJzQ29tYm9TeW1ib2xzUmFuZ2UgPSAnXFxcXHUyMGQwLVxcXFx1MjBmMCc7XG52YXIgcnNWYXJSYW5nZSA9ICdcXFxcdWZlMGVcXFxcdWZlMGYnO1xuXG4vKiogVXNlZCB0byBjb21wb3NlIHVuaWNvZGUgY2FwdHVyZSBncm91cHMuICovXG52YXIgcnNaV0ogPSAnXFxcXHUyMDBkJztcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IHN0cmluZ3Mgd2l0aCBbemVyby13aWR0aCBqb2luZXJzIG9yIGNvZGUgcG9pbnRzIGZyb20gdGhlIGFzdHJhbCBwbGFuZXNdKGh0dHA6Ly9lZXYuZWUvYmxvZy8yMDE1LzA5LzEyL2RhcmstY29ybmVycy1vZi11bmljb2RlLykuICovXG52YXIgcmVIYXNVbmljb2RlID0gUmVnRXhwKCdbJyArIHJzWldKICsgcnNBc3RyYWxSYW5nZSAgKyByc0NvbWJvTWFya3NSYW5nZSArIHJzQ29tYm9TeW1ib2xzUmFuZ2UgKyByc1ZhclJhbmdlICsgJ10nKTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHN0cmluZ2AgY29udGFpbnMgVW5pY29kZSBzeW1ib2xzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gaW5zcGVjdC5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBhIHN5bWJvbCBpcyBmb3VuZCwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBoYXNVbmljb2RlKHN0cmluZykge1xuICByZXR1cm4gcmVIYXNVbmljb2RlLnRlc3Qoc3RyaW5nKTtcbn1cblxuLyoqIFVzZWQgdG8gY29tcG9zZSB1bmljb2RlIGNoYXJhY3RlciBjbGFzc2VzLiAqL1xudmFyIHJzQXN0cmFsUmFuZ2UkMSA9ICdcXFxcdWQ4MDAtXFxcXHVkZmZmJztcbnZhciByc0NvbWJvTWFya3NSYW5nZSQxID0gJ1xcXFx1MDMwMC1cXFxcdTAzNmZcXFxcdWZlMjAtXFxcXHVmZTIzJztcbnZhciByc0NvbWJvU3ltYm9sc1JhbmdlJDEgPSAnXFxcXHUyMGQwLVxcXFx1MjBmMCc7XG52YXIgcnNWYXJSYW5nZSQxID0gJ1xcXFx1ZmUwZVxcXFx1ZmUwZic7XG5cbi8qKiBVc2VkIHRvIGNvbXBvc2UgdW5pY29kZSBjYXB0dXJlIGdyb3Vwcy4gKi9cbnZhciByc0FzdHJhbCA9ICdbJyArIHJzQXN0cmFsUmFuZ2UkMSArICddJztcbnZhciByc0NvbWJvID0gJ1snICsgcnNDb21ib01hcmtzUmFuZ2UkMSArIHJzQ29tYm9TeW1ib2xzUmFuZ2UkMSArICddJztcbnZhciByc0ZpdHogPSAnXFxcXHVkODNjW1xcXFx1ZGZmYi1cXFxcdWRmZmZdJztcbnZhciByc01vZGlmaWVyID0gJyg/OicgKyByc0NvbWJvICsgJ3wnICsgcnNGaXR6ICsgJyknO1xudmFyIHJzTm9uQXN0cmFsID0gJ1teJyArIHJzQXN0cmFsUmFuZ2UkMSArICddJztcbnZhciByc1JlZ2lvbmFsID0gJyg/OlxcXFx1ZDgzY1tcXFxcdWRkZTYtXFxcXHVkZGZmXSl7Mn0nO1xudmFyIHJzU3VyclBhaXIgPSAnW1xcXFx1ZDgwMC1cXFxcdWRiZmZdW1xcXFx1ZGMwMC1cXFxcdWRmZmZdJztcbnZhciByc1pXSiQxID0gJ1xcXFx1MjAwZCc7XG5cbi8qKiBVc2VkIHRvIGNvbXBvc2UgdW5pY29kZSByZWdleGVzLiAqL1xudmFyIHJlT3B0TW9kID0gcnNNb2RpZmllciArICc/JztcbnZhciByc09wdFZhciA9ICdbJyArIHJzVmFyUmFuZ2UkMSArICddPyc7XG52YXIgcnNPcHRKb2luID0gJyg/OicgKyByc1pXSiQxICsgJyg/OicgKyBbcnNOb25Bc3RyYWwsIHJzUmVnaW9uYWwsIHJzU3VyclBhaXJdLmpvaW4oJ3wnKSArICcpJyArIHJzT3B0VmFyICsgcmVPcHRNb2QgKyAnKSonO1xudmFyIHJzU2VxID0gcnNPcHRWYXIgKyByZU9wdE1vZCArIHJzT3B0Sm9pbjtcbnZhciByc1N5bWJvbCA9ICcoPzonICsgW3JzTm9uQXN0cmFsICsgcnNDb21ibyArICc/JywgcnNDb21ibywgcnNSZWdpb25hbCwgcnNTdXJyUGFpciwgcnNBc3RyYWxdLmpvaW4oJ3wnKSArICcpJztcblxuLyoqIFVzZWQgdG8gbWF0Y2ggW3N0cmluZyBzeW1ib2xzXShodHRwczovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC11bmljb2RlKS4gKi9cbnZhciByZVVuaWNvZGUgPSBSZWdFeHAocnNGaXR6ICsgJyg/PScgKyByc0ZpdHogKyAnKXwnICsgcnNTeW1ib2wgKyByc1NlcSwgJ2cnKTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIFVuaWNvZGUgYHN0cmluZ2AgdG8gYW4gYXJyYXkuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byBjb252ZXJ0LlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBjb252ZXJ0ZWQgYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIHVuaWNvZGVUb0FycmF5KHN0cmluZykge1xuICByZXR1cm4gc3RyaW5nLm1hdGNoKHJlVW5pY29kZSkgfHwgW107XG59XG5cbi8qKlxuICogQ29udmVydHMgYHN0cmluZ2AgdG8gYW4gYXJyYXkuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byBjb252ZXJ0LlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBjb252ZXJ0ZWQgYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIHN0cmluZ1RvQXJyYXkoc3RyaW5nKSB7XG4gIHJldHVybiBoYXNVbmljb2RlKHN0cmluZylcbiAgICA/IHVuaWNvZGVUb0FycmF5KHN0cmluZylcbiAgICA6IGFzY2lpVG9BcnJheShzdHJpbmcpO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGB2YWx1ZWAgdG8gYSBzdHJpbmcuIEFuIGVtcHR5IHN0cmluZyBpcyByZXR1cm5lZCBmb3IgYG51bGxgXG4gKiBhbmQgYHVuZGVmaW5lZGAgdmFsdWVzLiBUaGUgc2lnbiBvZiBgLTBgIGlzIHByZXNlcnZlZC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY29udmVydC5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIGNvbnZlcnRlZCBzdHJpbmcuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8udG9TdHJpbmcobnVsbCk7XG4gKiAvLyA9PiAnJ1xuICpcbiAqIF8udG9TdHJpbmcoLTApO1xuICogLy8gPT4gJy0wJ1xuICpcbiAqIF8udG9TdHJpbmcoWzEsIDIsIDNdKTtcbiAqIC8vID0+ICcxLDIsMydcbiAqL1xuZnVuY3Rpb24gdG9TdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID09IG51bGwgPyAnJyA6IGJhc2VUb1N0cmluZyh2YWx1ZSk7XG59XG5cbi8qKiBVc2VkIHRvIG1hdGNoIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHdoaXRlc3BhY2UuICovXG52YXIgcmVUcmltID0gL15cXHMrfFxccyskL2c7XG5cbi8qKlxuICogUmVtb3ZlcyBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlIG9yIHNwZWNpZmllZCBjaGFyYWN0ZXJzIGZyb20gYHN0cmluZ2AuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAzLjAuMFxuICogQGNhdGVnb3J5IFN0cmluZ1xuICogQHBhcmFtIHtzdHJpbmd9IFtzdHJpbmc9JyddIFRoZSBzdHJpbmcgdG8gdHJpbS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBbY2hhcnM9d2hpdGVzcGFjZV0gVGhlIGNoYXJhY3RlcnMgdG8gdHJpbS5cbiAqIEBwYXJhbS0ge09iamVjdH0gW2d1YXJkXSBFbmFibGVzIHVzZSBhcyBhbiBpdGVyYXRlZSBmb3IgbWV0aG9kcyBsaWtlIGBfLm1hcGAuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSB0cmltbWVkIHN0cmluZy5cbiAqIEBleGFtcGxlXG4gKlxuICogXy50cmltKCcgIGFiYyAgJyk7XG4gKiAvLyA9PiAnYWJjJ1xuICpcbiAqIF8udHJpbSgnLV8tYWJjLV8tJywgJ18tJyk7XG4gKiAvLyA9PiAnYWJjJ1xuICpcbiAqIF8ubWFwKFsnICBmb28gICcsICcgIGJhciAgJ10sIF8udHJpbSk7XG4gKiAvLyA9PiBbJ2ZvbycsICdiYXInXVxuICovXG5mdW5jdGlvbiB0cmltKHN0cmluZywgY2hhcnMsIGd1YXJkKSB7XG4gIHN0cmluZyA9IHRvU3RyaW5nKHN0cmluZyk7XG4gIGlmIChzdHJpbmcgJiYgKGd1YXJkIHx8IGNoYXJzID09PSB1bmRlZmluZWQpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKHJlVHJpbSwgJycpO1xuICB9XG4gIGlmICghc3RyaW5nIHx8ICEoY2hhcnMgPSBiYXNlVG9TdHJpbmcoY2hhcnMpKSkge1xuICAgIHJldHVybiBzdHJpbmc7XG4gIH1cbiAgdmFyIHN0clN5bWJvbHMgPSBzdHJpbmdUb0FycmF5KHN0cmluZyksXG4gICAgICBjaHJTeW1ib2xzID0gc3RyaW5nVG9BcnJheShjaGFycyksXG4gICAgICBzdGFydCA9IGNoYXJzU3RhcnRJbmRleChzdHJTeW1ib2xzLCBjaHJTeW1ib2xzKSxcbiAgICAgIGVuZCA9IGNoYXJzRW5kSW5kZXgoc3RyU3ltYm9scywgY2hyU3ltYm9scykgKyAxO1xuXG4gIHJldHVybiBjYXN0U2xpY2Uoc3RyU3ltYm9scywgc3RhcnQsIGVuZCkuam9pbignJyk7XG59XG5cbnZhciBGTl9BUkdTID0gL14oPzphc3luY1xccyspPyhmdW5jdGlvbik/XFxzKlteXFwoXSpcXChcXHMqKFteXFwpXSopXFwpL207XG52YXIgRk5fQVJHX1NQTElUID0gLywvO1xudmFyIEZOX0FSRyA9IC8oPS4rKT8oXFxzKikkLztcbnZhciBTVFJJUF9DT01NRU5UUyA9IC8oKFxcL1xcLy4qJCl8KFxcL1xcKltcXHNcXFNdKj9cXCpcXC8pKS9tZztcblxuZnVuY3Rpb24gcGFyc2VQYXJhbXMoZnVuYykge1xuICAgIGZ1bmMgPSBmdW5jLnRvU3RyaW5nKCkucmVwbGFjZShTVFJJUF9DT01NRU5UUywgJycpO1xuICAgIGZ1bmMgPSBmdW5jLm1hdGNoKEZOX0FSR1MpWzJdLnJlcGxhY2UoJyAnLCAnJyk7XG4gICAgZnVuYyA9IGZ1bmMgPyBmdW5jLnNwbGl0KEZOX0FSR19TUExJVCkgOiBbXTtcbiAgICBmdW5jID0gZnVuYy5tYXAoZnVuY3Rpb24gKGFyZyl7XG4gICAgICAgIHJldHVybiB0cmltKGFyZy5yZXBsYWNlKEZOX0FSRywgJycpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZnVuYztcbn1cblxuLyoqXG4gKiBBIGRlcGVuZGVuY3ktaW5qZWN0ZWQgdmVyc2lvbiBvZiB0aGUgW2FzeW5jLmF1dG9de0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5hdXRvfSBmdW5jdGlvbi4gRGVwZW5kZW50XG4gKiB0YXNrcyBhcmUgc3BlY2lmaWVkIGFzIHBhcmFtZXRlcnMgdG8gdGhlIGZ1bmN0aW9uLCBhZnRlciB0aGUgdXN1YWwgY2FsbGJhY2tcbiAqIHBhcmFtZXRlciwgd2l0aCB0aGUgcGFyYW1ldGVyIG5hbWVzIG1hdGNoaW5nIHRoZSBuYW1lcyBvZiB0aGUgdGFza3MgaXRcbiAqIGRlcGVuZHMgb24uIFRoaXMgY2FuIHByb3ZpZGUgZXZlbiBtb3JlIHJlYWRhYmxlIHRhc2sgZ3JhcGhzIHdoaWNoIGNhbiBiZVxuICogZWFzaWVyIHRvIG1haW50YWluLlxuICpcbiAqIElmIGEgZmluYWwgY2FsbGJhY2sgaXMgc3BlY2lmaWVkLCB0aGUgdGFzayByZXN1bHRzIGFyZSBzaW1pbGFybHkgaW5qZWN0ZWQsXG4gKiBzcGVjaWZpZWQgYXMgbmFtZWQgcGFyYW1ldGVycyBhZnRlciB0aGUgaW5pdGlhbCBlcnJvciBwYXJhbWV0ZXIuXG4gKlxuICogVGhlIGF1dG9JbmplY3QgZnVuY3Rpb24gaXMgcHVyZWx5IHN5bnRhY3RpYyBzdWdhciBhbmQgaXRzIHNlbWFudGljcyBhcmVcbiAqIG90aGVyd2lzZSBlcXVpdmFsZW50IHRvIFthc3luYy5hdXRvXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cuYXV0b30uXG4gKlxuICogQG5hbWUgYXV0b0luamVjdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMuYXV0b117QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LmF1dG99XG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge09iamVjdH0gdGFza3MgLSBBbiBvYmplY3QsIGVhY2ggb2Ygd2hvc2UgcHJvcGVydGllcyBpcyBhbiB7QGxpbmsgQXN5bmNGdW5jdGlvbn0gb2ZcbiAqIHRoZSBmb3JtICdmdW5jKFtkZXBlbmRlbmNpZXMuLi5dLCBjYWxsYmFjaykuIFRoZSBvYmplY3QncyBrZXkgb2YgYSBwcm9wZXJ0eVxuICogc2VydmVzIGFzIHRoZSBuYW1lIG9mIHRoZSB0YXNrIGRlZmluZWQgYnkgdGhhdCBwcm9wZXJ0eSwgaS5lLiBjYW4gYmUgdXNlZFxuICogd2hlbiBzcGVjaWZ5aW5nIHJlcXVpcmVtZW50cyBmb3Igb3RoZXIgdGFza3MuXG4gKiAqIFRoZSBgY2FsbGJhY2tgIHBhcmFtZXRlciBpcyBhIGBjYWxsYmFjayhlcnIsIHJlc3VsdClgIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gKiAgIHdoZW4gZmluaXNoZWQsIHBhc3NpbmcgYW4gYGVycm9yYCAod2hpY2ggY2FuIGJlIGBudWxsYCkgYW5kIHRoZSByZXN1bHQgb2ZcbiAqICAgdGhlIGZ1bmN0aW9uJ3MgZXhlY3V0aW9uLiBUaGUgcmVtYWluaW5nIHBhcmFtZXRlcnMgbmFtZSBvdGhlciB0YXNrcyBvblxuICogICB3aGljaCB0aGUgdGFzayBpcyBkZXBlbmRlbnQsIGFuZCB0aGUgcmVzdWx0cyBmcm9tIHRob3NlIHRhc2tzIGFyZSB0aGVcbiAqICAgYXJndW1lbnRzIG9mIHRob3NlIHBhcmFtZXRlcnMuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQW4gb3B0aW9uYWwgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsXG4gKiB0aGUgdGFza3MgaGF2ZSBiZWVuIGNvbXBsZXRlZC4gSXQgcmVjZWl2ZXMgdGhlIGBlcnJgIGFyZ3VtZW50IGlmIGFueSBgdGFza3NgXG4gKiBwYXNzIGFuIGVycm9yIHRvIHRoZWlyIGNhbGxiYWNrLCBhbmQgYSBgcmVzdWx0c2Agb2JqZWN0IHdpdGggYW55IGNvbXBsZXRlZFxuICogdGFzayByZXN1bHRzLCBzaW1pbGFyIHRvIGBhdXRvYC5cbiAqIEBleGFtcGxlXG4gKlxuICogLy8gIFRoZSBleGFtcGxlIGZyb20gYGF1dG9gIGNhbiBiZSByZXdyaXR0ZW4gYXMgZm9sbG93czpcbiAqIGFzeW5jLmF1dG9JbmplY3Qoe1xuICogICAgIGdldF9kYXRhOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICogICAgICAgICAvLyBhc3luYyBjb2RlIHRvIGdldCBzb21lIGRhdGFcbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ2RhdGEnLCAnY29udmVydGVkIHRvIGFycmF5Jyk7XG4gKiAgICAgfSxcbiAqICAgICBtYWtlX2ZvbGRlcjogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgLy8gYXN5bmMgY29kZSB0byBjcmVhdGUgYSBkaXJlY3RvcnkgdG8gc3RvcmUgYSBmaWxlIGluXG4gKiAgICAgICAgIC8vIHRoaXMgaXMgcnVuIGF0IHRoZSBzYW1lIHRpbWUgYXMgZ2V0dGluZyB0aGUgZGF0YVxuICogICAgICAgICBjYWxsYmFjayhudWxsLCAnZm9sZGVyJyk7XG4gKiAgICAgfSxcbiAqICAgICB3cml0ZV9maWxlOiBmdW5jdGlvbihnZXRfZGF0YSwgbWFrZV9mb2xkZXIsIGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIC8vIG9uY2UgdGhlcmUgaXMgc29tZSBkYXRhIGFuZCB0aGUgZGlyZWN0b3J5IGV4aXN0cyxcbiAqICAgICAgICAgLy8gd3JpdGUgdGhlIGRhdGEgdG8gYSBmaWxlIGluIHRoZSBkaXJlY3RvcnlcbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ2ZpbGVuYW1lJyk7XG4gKiAgICAgfSxcbiAqICAgICBlbWFpbF9saW5rOiBmdW5jdGlvbih3cml0ZV9maWxlLCBjYWxsYmFjaykge1xuICogICAgICAgICAvLyBvbmNlIHRoZSBmaWxlIGlzIHdyaXR0ZW4gbGV0J3MgZW1haWwgYSBsaW5rIHRvIGl0Li4uXG4gKiAgICAgICAgIC8vIHdyaXRlX2ZpbGUgY29udGFpbnMgdGhlIGZpbGVuYW1lIHJldHVybmVkIGJ5IHdyaXRlX2ZpbGUuXG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsIHsnZmlsZSc6d3JpdGVfZmlsZSwgJ2VtYWlsJzondXNlckBleGFtcGxlLmNvbSd9KTtcbiAqICAgICB9XG4gKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAqICAgICBjb25zb2xlLmxvZygnZXJyID0gJywgZXJyKTtcbiAqICAgICBjb25zb2xlLmxvZygnZW1haWxfbGluayA9ICcsIHJlc3VsdHMuZW1haWxfbGluayk7XG4gKiB9KTtcbiAqXG4gKiAvLyBJZiB5b3UgYXJlIHVzaW5nIGEgSlMgbWluaWZpZXIgdGhhdCBtYW5nbGVzIHBhcmFtZXRlciBuYW1lcywgYGF1dG9JbmplY3RgXG4gKiAvLyB3aWxsIG5vdCB3b3JrIHdpdGggcGxhaW4gZnVuY3Rpb25zLCBzaW5jZSB0aGUgcGFyYW1ldGVyIG5hbWVzIHdpbGwgYmVcbiAqIC8vIGNvbGxhcHNlZCB0byBhIHNpbmdsZSBsZXR0ZXIgaWRlbnRpZmllci4gIFRvIHdvcmsgYXJvdW5kIHRoaXMsIHlvdSBjYW5cbiAqIC8vIGV4cGxpY2l0bHkgc3BlY2lmeSB0aGUgbmFtZXMgb2YgdGhlIHBhcmFtZXRlcnMgeW91ciB0YXNrIGZ1bmN0aW9uIG5lZWRzXG4gKiAvLyBpbiBhbiBhcnJheSwgc2ltaWxhciB0byBBbmd1bGFyLmpzIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICpcbiAqIC8vIFRoaXMgc3RpbGwgaGFzIGFuIGFkdmFudGFnZSBvdmVyIHBsYWluIGBhdXRvYCwgc2luY2UgdGhlIHJlc3VsdHMgYSB0YXNrXG4gKiAvLyBkZXBlbmRzIG9uIGFyZSBzdGlsbCBzcHJlYWQgaW50byBhcmd1bWVudHMuXG4gKiBhc3luYy5hdXRvSW5qZWN0KHtcbiAqICAgICAvLy4uLlxuICogICAgIHdyaXRlX2ZpbGU6IFsnZ2V0X2RhdGEnLCAnbWFrZV9mb2xkZXInLCBmdW5jdGlvbihnZXRfZGF0YSwgbWFrZV9mb2xkZXIsIGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsICdmaWxlbmFtZScpO1xuICogICAgIH1dLFxuICogICAgIGVtYWlsX2xpbms6IFsnd3JpdGVfZmlsZScsIGZ1bmN0aW9uKHdyaXRlX2ZpbGUsIGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsIHsnZmlsZSc6d3JpdGVfZmlsZSwgJ2VtYWlsJzondXNlckBleGFtcGxlLmNvbSd9KTtcbiAqICAgICB9XVxuICogICAgIC8vLi4uXG4gKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAqICAgICBjb25zb2xlLmxvZygnZXJyID0gJywgZXJyKTtcbiAqICAgICBjb25zb2xlLmxvZygnZW1haWxfbGluayA9ICcsIHJlc3VsdHMuZW1haWxfbGluayk7XG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gYXV0b0luamVjdCh0YXNrcywgY2FsbGJhY2spIHtcbiAgICB2YXIgbmV3VGFza3MgPSB7fTtcblxuICAgIGJhc2VGb3JPd24odGFza3MsIGZ1bmN0aW9uICh0YXNrRm4sIGtleSkge1xuICAgICAgICB2YXIgcGFyYW1zO1xuICAgICAgICB2YXIgZm5Jc0FzeW5jID0gaXNBc3luYyh0YXNrRm4pO1xuICAgICAgICB2YXIgaGFzTm9EZXBzID1cbiAgICAgICAgICAgICghZm5Jc0FzeW5jICYmIHRhc2tGbi5sZW5ndGggPT09IDEpIHx8XG4gICAgICAgICAgICAoZm5Jc0FzeW5jICYmIHRhc2tGbi5sZW5ndGggPT09IDApO1xuXG4gICAgICAgIGlmIChpc0FycmF5KHRhc2tGbikpIHtcbiAgICAgICAgICAgIHBhcmFtcyA9IHRhc2tGbi5zbGljZSgwLCAtMSk7XG4gICAgICAgICAgICB0YXNrRm4gPSB0YXNrRm5bdGFza0ZuLmxlbmd0aCAtIDFdO1xuXG4gICAgICAgICAgICBuZXdUYXNrc1trZXldID0gcGFyYW1zLmNvbmNhdChwYXJhbXMubGVuZ3RoID4gMCA/IG5ld1Rhc2sgOiB0YXNrRm4pO1xuICAgICAgICB9IGVsc2UgaWYgKGhhc05vRGVwcykge1xuICAgICAgICAgICAgLy8gbm8gZGVwZW5kZW5jaWVzLCB1c2UgdGhlIGZ1bmN0aW9uIGFzLWlzXG4gICAgICAgICAgICBuZXdUYXNrc1trZXldID0gdGFza0ZuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFyYW1zID0gcGFyc2VQYXJhbXModGFza0ZuKTtcbiAgICAgICAgICAgIGlmICh0YXNrRm4ubGVuZ3RoID09PSAwICYmICFmbklzQXN5bmMgJiYgcGFyYW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImF1dG9JbmplY3QgdGFzayBmdW5jdGlvbnMgcmVxdWlyZSBleHBsaWNpdCBwYXJhbWV0ZXJzLlwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcmVtb3ZlIGNhbGxiYWNrIHBhcmFtXG4gICAgICAgICAgICBpZiAoIWZuSXNBc3luYykgcGFyYW1zLnBvcCgpO1xuXG4gICAgICAgICAgICBuZXdUYXNrc1trZXldID0gcGFyYW1zLmNvbmNhdChuZXdUYXNrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG5ld1Rhc2socmVzdWx0cywgdGFza0NiKSB7XG4gICAgICAgICAgICB2YXIgbmV3QXJncyA9IGFycmF5TWFwKHBhcmFtcywgZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0c1tuYW1lXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbmV3QXJncy5wdXNoKHRhc2tDYik7XG4gICAgICAgICAgICB3cmFwQXN5bmModGFza0ZuKS5hcHBseShudWxsLCBuZXdBcmdzKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgYXV0byhuZXdUYXNrcywgY2FsbGJhY2spO1xufVxuXG4vLyBTaW1wbGUgZG91Ymx5IGxpbmtlZCBsaXN0IChodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9Eb3VibHlfbGlua2VkX2xpc3QpIGltcGxlbWVudGF0aW9uXG4vLyB1c2VkIGZvciBxdWV1ZXMuIFRoaXMgaW1wbGVtZW50YXRpb24gYXNzdW1lcyB0aGF0IHRoZSBub2RlIHByb3ZpZGVkIGJ5IHRoZSB1c2VyIGNhbiBiZSBtb2RpZmllZFxuLy8gdG8gYWRqdXN0IHRoZSBuZXh0IGFuZCBsYXN0IHByb3BlcnRpZXMuIFdlIGltcGxlbWVudCBvbmx5IHRoZSBtaW5pbWFsIGZ1bmN0aW9uYWxpdHlcbi8vIGZvciBxdWV1ZSBzdXBwb3J0LlxuZnVuY3Rpb24gRExMKCkge1xuICAgIHRoaXMuaGVhZCA9IHRoaXMudGFpbCA9IG51bGw7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xufVxuXG5mdW5jdGlvbiBzZXRJbml0aWFsKGRsbCwgbm9kZSkge1xuICAgIGRsbC5sZW5ndGggPSAxO1xuICAgIGRsbC5oZWFkID0gZGxsLnRhaWwgPSBub2RlO1xufVxuXG5ETEwucHJvdG90eXBlLnJlbW92ZUxpbmsgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgaWYgKG5vZGUucHJldikgbm9kZS5wcmV2Lm5leHQgPSBub2RlLm5leHQ7XG4gICAgZWxzZSB0aGlzLmhlYWQgPSBub2RlLm5leHQ7XG4gICAgaWYgKG5vZGUubmV4dCkgbm9kZS5uZXh0LnByZXYgPSBub2RlLnByZXY7XG4gICAgZWxzZSB0aGlzLnRhaWwgPSBub2RlLnByZXY7XG5cbiAgICBub2RlLnByZXYgPSBub2RlLm5leHQgPSBudWxsO1xuICAgIHRoaXMubGVuZ3RoIC09IDE7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5ETEwucHJvdG90eXBlLmVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICAgIHdoaWxlKHRoaXMuaGVhZCkgdGhpcy5zaGlmdCgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuRExMLnByb3RvdHlwZS5pbnNlcnRBZnRlciA9IGZ1bmN0aW9uKG5vZGUsIG5ld05vZGUpIHtcbiAgICBuZXdOb2RlLnByZXYgPSBub2RlO1xuICAgIG5ld05vZGUubmV4dCA9IG5vZGUubmV4dDtcbiAgICBpZiAobm9kZS5uZXh0KSBub2RlLm5leHQucHJldiA9IG5ld05vZGU7XG4gICAgZWxzZSB0aGlzLnRhaWwgPSBuZXdOb2RlO1xuICAgIG5vZGUubmV4dCA9IG5ld05vZGU7XG4gICAgdGhpcy5sZW5ndGggKz0gMTtcbn07XG5cbkRMTC5wcm90b3R5cGUuaW5zZXJ0QmVmb3JlID0gZnVuY3Rpb24obm9kZSwgbmV3Tm9kZSkge1xuICAgIG5ld05vZGUucHJldiA9IG5vZGUucHJldjtcbiAgICBuZXdOb2RlLm5leHQgPSBub2RlO1xuICAgIGlmIChub2RlLnByZXYpIG5vZGUucHJldi5uZXh0ID0gbmV3Tm9kZTtcbiAgICBlbHNlIHRoaXMuaGVhZCA9IG5ld05vZGU7XG4gICAgbm9kZS5wcmV2ID0gbmV3Tm9kZTtcbiAgICB0aGlzLmxlbmd0aCArPSAxO1xufTtcblxuRExMLnByb3RvdHlwZS51bnNoaWZ0ID0gZnVuY3Rpb24obm9kZSkge1xuICAgIGlmICh0aGlzLmhlYWQpIHRoaXMuaW5zZXJ0QmVmb3JlKHRoaXMuaGVhZCwgbm9kZSk7XG4gICAgZWxzZSBzZXRJbml0aWFsKHRoaXMsIG5vZGUpO1xufTtcblxuRExMLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24obm9kZSkge1xuICAgIGlmICh0aGlzLnRhaWwpIHRoaXMuaW5zZXJ0QWZ0ZXIodGhpcy50YWlsLCBub2RlKTtcbiAgICBlbHNlIHNldEluaXRpYWwodGhpcywgbm9kZSk7XG59O1xuXG5ETEwucHJvdG90eXBlLnNoaWZ0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuaGVhZCAmJiB0aGlzLnJlbW92ZUxpbmsodGhpcy5oZWFkKTtcbn07XG5cbkRMTC5wcm90b3R5cGUucG9wID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudGFpbCAmJiB0aGlzLnJlbW92ZUxpbmsodGhpcy50YWlsKTtcbn07XG5cbkRMTC5wcm90b3R5cGUudG9BcnJheSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJyID0gQXJyYXkodGhpcy5sZW5ndGgpO1xuICAgIHZhciBjdXJyID0gdGhpcy5oZWFkO1xuICAgIGZvcih2YXIgaWR4ID0gMDsgaWR4IDwgdGhpcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgICAgIGFycltpZHhdID0gY3Vyci5kYXRhO1xuICAgICAgICBjdXJyID0gY3Vyci5uZXh0O1xuICAgIH1cbiAgICByZXR1cm4gYXJyO1xufTtcblxuRExMLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAodGVzdEZuKSB7XG4gICAgdmFyIGN1cnIgPSB0aGlzLmhlYWQ7XG4gICAgd2hpbGUoISFjdXJyKSB7XG4gICAgICAgIHZhciBuZXh0ID0gY3Vyci5uZXh0O1xuICAgICAgICBpZiAodGVzdEZuKGN1cnIpKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUxpbmsoY3Vycik7XG4gICAgICAgIH1cbiAgICAgICAgY3VyciA9IG5leHQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuZnVuY3Rpb24gcXVldWUod29ya2VyLCBjb25jdXJyZW5jeSwgcGF5bG9hZCkge1xuICAgIGlmIChjb25jdXJyZW5jeSA9PSBudWxsKSB7XG4gICAgICAgIGNvbmN1cnJlbmN5ID0gMTtcbiAgICB9XG4gICAgZWxzZSBpZihjb25jdXJyZW5jeSA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmN1cnJlbmN5IG11c3Qgbm90IGJlIHplcm8nKTtcbiAgICB9XG5cbiAgICB2YXIgX3dvcmtlciA9IHdyYXBBc3luYyh3b3JrZXIpO1xuICAgIHZhciBudW1SdW5uaW5nID0gMDtcbiAgICB2YXIgd29ya2Vyc0xpc3QgPSBbXTtcblxuICAgIGZ1bmN0aW9uIF9pbnNlcnQoZGF0YSwgaW5zZXJ0QXRGcm9udCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrICE9IG51bGwgJiYgdHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Rhc2sgY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcS5zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKCFpc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLmxlbmd0aCA9PT0gMCAmJiBxLmlkbGUoKSkge1xuICAgICAgICAgICAgLy8gY2FsbCBkcmFpbiBpbW1lZGlhdGVseSBpZiB0aGVyZSBhcmUgbm8gdGFza3NcbiAgICAgICAgICAgIHJldHVybiBzZXRJbW1lZGlhdGUkMShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBxLmRyYWluKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gZGF0YS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBpdGVtID0ge1xuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFbaV0sXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrIHx8IG5vb3BcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChpbnNlcnRBdEZyb250KSB7XG4gICAgICAgICAgICAgICAgcS5fdGFza3MudW5zaGlmdChpdGVtKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcS5fdGFza3MucHVzaChpdGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzZXRJbW1lZGlhdGUkMShxLnByb2Nlc3MpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9uZXh0KHRhc2tzKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgbnVtUnVubmluZyAtPSAxO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRhc2tzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciB0YXNrID0gdGFza3NbaV07XG5cbiAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBiYXNlSW5kZXhPZih3b3JrZXJzTGlzdCwgdGFzaywgMCk7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgd29ya2Vyc0xpc3Quc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0YXNrLmNhbGxiYWNrLmFwcGx5KHRhc2ssIGFyZ3VtZW50cyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZXJyICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcS5lcnJvcihlcnIsIHRhc2suZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobnVtUnVubmluZyA8PSAocS5jb25jdXJyZW5jeSAtIHEuYnVmZmVyKSApIHtcbiAgICAgICAgICAgICAgICBxLnVuc2F0dXJhdGVkKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChxLmlkbGUoKSkge1xuICAgICAgICAgICAgICAgIHEuZHJhaW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHEucHJvY2VzcygpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHZhciBpc1Byb2Nlc3NpbmcgPSBmYWxzZTtcbiAgICB2YXIgcSA9IHtcbiAgICAgICAgX3Rhc2tzOiBuZXcgRExMKCksXG4gICAgICAgIGNvbmN1cnJlbmN5OiBjb25jdXJyZW5jeSxcbiAgICAgICAgcGF5bG9hZDogcGF5bG9hZCxcbiAgICAgICAgc2F0dXJhdGVkOiBub29wLFxuICAgICAgICB1bnNhdHVyYXRlZDpub29wLFxuICAgICAgICBidWZmZXI6IGNvbmN1cnJlbmN5IC8gNCxcbiAgICAgICAgZW1wdHk6IG5vb3AsXG4gICAgICAgIGRyYWluOiBub29wLFxuICAgICAgICBlcnJvcjogbm9vcCxcbiAgICAgICAgc3RhcnRlZDogZmFsc2UsXG4gICAgICAgIHBhdXNlZDogZmFsc2UsXG4gICAgICAgIHB1c2g6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgX2luc2VydChkYXRhLCBmYWxzZSwgY2FsbGJhY2spO1xuICAgICAgICB9LFxuICAgICAgICBraWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBxLmRyYWluID0gbm9vcDtcbiAgICAgICAgICAgIHEuX3Rhc2tzLmVtcHR5KCk7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc2hpZnQ6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgX2luc2VydChkYXRhLCB0cnVlLCBjYWxsYmFjayk7XG4gICAgICAgIH0sXG4gICAgICAgIHJlbW92ZTogZnVuY3Rpb24gKHRlc3RGbikge1xuICAgICAgICAgICAgcS5fdGFza3MucmVtb3ZlKHRlc3RGbik7XG4gICAgICAgIH0sXG4gICAgICAgIHByb2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIEF2b2lkIHRyeWluZyB0byBzdGFydCB0b28gbWFueSBwcm9jZXNzaW5nIG9wZXJhdGlvbnMuIFRoaXMgY2FuIG9jY3VyXG4gICAgICAgICAgICAvLyB3aGVuIGNhbGxiYWNrcyByZXNvbHZlIHN5bmNocm9ub3VzbHkgKCMxMjY3KS5cbiAgICAgICAgICAgIGlmIChpc1Byb2Nlc3NpbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpc1Byb2Nlc3NpbmcgPSB0cnVlO1xuICAgICAgICAgICAgd2hpbGUoIXEucGF1c2VkICYmIG51bVJ1bm5pbmcgPCBxLmNvbmN1cnJlbmN5ICYmIHEuX3Rhc2tzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgdmFyIHRhc2tzID0gW10sIGRhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICB2YXIgbCA9IHEuX3Rhc2tzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpZiAocS5wYXlsb2FkKSBsID0gTWF0aC5taW4obCwgcS5wYXlsb2FkKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbm9kZSA9IHEuX3Rhc2tzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIHRhc2tzLnB1c2gobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIHdvcmtlcnNMaXN0LnB1c2gobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucHVzaChub2RlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG51bVJ1bm5pbmcgKz0gMTtcblxuICAgICAgICAgICAgICAgIGlmIChxLl90YXNrcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcS5lbXB0eSgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChudW1SdW5uaW5nID09PSBxLmNvbmN1cnJlbmN5KSB7XG4gICAgICAgICAgICAgICAgICAgIHEuc2F0dXJhdGVkKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGNiID0gb25seU9uY2UoX25leHQodGFza3MpKTtcbiAgICAgICAgICAgICAgICBfd29ya2VyKGRhdGEsIGNiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlzUHJvY2Vzc2luZyA9IGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICBsZW5ndGg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBxLl90YXNrcy5sZW5ndGg7XG4gICAgICAgIH0sXG4gICAgICAgIHJ1bm5pbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBudW1SdW5uaW5nO1xuICAgICAgICB9LFxuICAgICAgICB3b3JrZXJzTGlzdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHdvcmtlcnNMaXN0O1xuICAgICAgICB9LFxuICAgICAgICBpZGxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBxLl90YXNrcy5sZW5ndGggKyBudW1SdW5uaW5nID09PSAwO1xuICAgICAgICB9LFxuICAgICAgICBwYXVzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcS5wYXVzZWQgPSB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICByZXN1bWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChxLnBhdXNlZCA9PT0gZmFsc2UpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICBxLnBhdXNlZCA9IGZhbHNlO1xuICAgICAgICAgICAgc2V0SW1tZWRpYXRlJDEocS5wcm9jZXNzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIHE7XG59XG5cbi8qKlxuICogQSBjYXJnbyBvZiB0YXNrcyBmb3IgdGhlIHdvcmtlciBmdW5jdGlvbiB0byBjb21wbGV0ZS4gQ2FyZ28gaW5oZXJpdHMgYWxsIG9mXG4gKiB0aGUgc2FtZSBtZXRob2RzIGFuZCBldmVudCBjYWxsYmFja3MgYXMgW2BxdWV1ZWBde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5xdWV1ZX0uXG4gKiBAdHlwZWRlZiB7T2JqZWN0fSBDYXJnb09iamVjdFxuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQHByb3BlcnR5IHtGdW5jdGlvbn0gbGVuZ3RoIC0gQSBmdW5jdGlvbiByZXR1cm5pbmcgdGhlIG51bWJlciBvZiBpdGVtc1xuICogd2FpdGluZyB0byBiZSBwcm9jZXNzZWQuIEludm9rZSBsaWtlIGBjYXJnby5sZW5ndGgoKWAuXG4gKiBAcHJvcGVydHkge251bWJlcn0gcGF5bG9hZCAtIEFuIGBpbnRlZ2VyYCBmb3IgZGV0ZXJtaW5pbmcgaG93IG1hbnkgdGFza3NcbiAqIHNob3VsZCBiZSBwcm9jZXNzIHBlciByb3VuZC4gVGhpcyBwcm9wZXJ0eSBjYW4gYmUgY2hhbmdlZCBhZnRlciBhIGBjYXJnb2AgaXNcbiAqIGNyZWF0ZWQgdG8gYWx0ZXIgdGhlIHBheWxvYWQgb24tdGhlLWZseS5cbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHB1c2ggLSBBZGRzIGB0YXNrYCB0byB0aGUgYHF1ZXVlYC4gVGhlIGNhbGxiYWNrIGlzXG4gKiBjYWxsZWQgb25jZSB0aGUgYHdvcmtlcmAgaGFzIGZpbmlzaGVkIHByb2Nlc3NpbmcgdGhlIHRhc2suIEluc3RlYWQgb2YgYVxuICogc2luZ2xlIHRhc2ssIGFuIGFycmF5IG9mIGB0YXNrc2AgY2FuIGJlIHN1Ym1pdHRlZC4gVGhlIHJlc3BlY3RpdmUgY2FsbGJhY2sgaXNcbiAqIHVzZWQgZm9yIGV2ZXJ5IHRhc2sgaW4gdGhlIGxpc3QuIEludm9rZSBsaWtlIGBjYXJnby5wdXNoKHRhc2ssIFtjYWxsYmFja10pYC5cbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHNhdHVyYXRlZCAtIEEgY2FsbGJhY2sgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGVcbiAqIGBxdWV1ZS5sZW5ndGgoKWAgaGl0cyB0aGUgY29uY3VycmVuY3kgYW5kIGZ1cnRoZXIgdGFza3Mgd2lsbCBiZSBxdWV1ZWQuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBlbXB0eSAtIEEgY2FsbGJhY2sgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgbGFzdCBpdGVtXG4gKiBmcm9tIHRoZSBgcXVldWVgIGlzIGdpdmVuIHRvIGEgYHdvcmtlcmAuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBkcmFpbiAtIEEgY2FsbGJhY2sgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgbGFzdCBpdGVtXG4gKiBmcm9tIHRoZSBgcXVldWVgIGhhcyByZXR1cm5lZCBmcm9tIHRoZSBgd29ya2VyYC5cbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGlkbGUgLSBhIGZ1bmN0aW9uIHJldHVybmluZyBmYWxzZSBpZiB0aGVyZSBhcmUgaXRlbXNcbiAqIHdhaXRpbmcgb3IgYmVpbmcgcHJvY2Vzc2VkLCBvciB0cnVlIGlmIG5vdC4gSW52b2tlIGxpa2UgYGNhcmdvLmlkbGUoKWAuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBwYXVzZSAtIGEgZnVuY3Rpb24gdGhhdCBwYXVzZXMgdGhlIHByb2Nlc3Npbmcgb2YgdGFza3NcbiAqIHVudGlsIGByZXN1bWUoKWAgaXMgY2FsbGVkLiBJbnZva2UgbGlrZSBgY2FyZ28ucGF1c2UoKWAuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSByZXN1bWUgLSBhIGZ1bmN0aW9uIHRoYXQgcmVzdW1lcyB0aGUgcHJvY2Vzc2luZyBvZlxuICogcXVldWVkIHRhc2tzIHdoZW4gdGhlIHF1ZXVlIGlzIHBhdXNlZC4gSW52b2tlIGxpa2UgYGNhcmdvLnJlc3VtZSgpYC5cbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGtpbGwgLSBhIGZ1bmN0aW9uIHRoYXQgcmVtb3ZlcyB0aGUgYGRyYWluYCBjYWxsYmFjayBhbmRcbiAqIGVtcHRpZXMgcmVtYWluaW5nIHRhc2tzIGZyb20gdGhlIHF1ZXVlIGZvcmNpbmcgaXQgdG8gZ28gaWRsZS4gSW52b2tlIGxpa2UgYGNhcmdvLmtpbGwoKWAuXG4gKi9cblxuLyoqXG4gKiBDcmVhdGVzIGEgYGNhcmdvYCBvYmplY3Qgd2l0aCB0aGUgc3BlY2lmaWVkIHBheWxvYWQuIFRhc2tzIGFkZGVkIHRvIHRoZVxuICogY2FyZ28gd2lsbCBiZSBwcm9jZXNzZWQgYWx0b2dldGhlciAodXAgdG8gdGhlIGBwYXlsb2FkYCBsaW1pdCkuIElmIHRoZVxuICogYHdvcmtlcmAgaXMgaW4gcHJvZ3Jlc3MsIHRoZSB0YXNrIGlzIHF1ZXVlZCB1bnRpbCBpdCBiZWNvbWVzIGF2YWlsYWJsZS4gT25jZVxuICogdGhlIGB3b3JrZXJgIGhhcyBjb21wbGV0ZWQgc29tZSB0YXNrcywgZWFjaCBjYWxsYmFjayBvZiB0aG9zZSB0YXNrcyBpc1xuICogY2FsbGVkLiBDaGVjayBvdXQgW3RoZXNlXShodHRwczovL2NhbW8uZ2l0aHVidXNlcmNvbnRlbnQuY29tLzZiYmQzNmY0Y2Y1YjM1YTBmMTFhOTZkY2QyZTk3NzExZmZjMmZiMzcvNjg3NDc0NzA3MzNhMmYyZjY2MmU2MzZjNmY3NTY0MmU2NzY5NzQ2ODc1NjIyZTYzNmY2ZDJmNjE3MzczNjU3NDczMmYzMTM2MzczNjM4MzczMTJmMzYzODMxMzAzODJmNjI2MjYzMzA2MzY2NjIzMDJkMzU2NjMyMzkyZDMxMzE2NTMyMmQzOTM3MzQ2NjJkMzMzMzM5Mzc2MzM2MzQ2NDYzMzgzNTM4MmU2NzY5NjYpIFthbmltYXRpb25zXShodHRwczovL2NhbW8uZ2l0aHVidXNlcmNvbnRlbnQuY29tL2Y0ODEwZTAwZTFjNWY1ZjhhZGRiZTNlOWY0OTA2NGZkNWQxMDI2OTkvNjg3NDc0NzA3MzNhMmYyZjY2MmU2MzZjNmY3NTY0MmU2NzY5NzQ2ODc1NjIyZTYzNmY2ZDJmNjE3MzczNjU3NDczMmYzMTM2MzczNjM4MzczMTJmMzYzODMxMzAzMTJmMzgzNDYzMzkzMjMwMzYzNjJkMzU2NjMyMzkyZDMxMzE2NTMyMmQzODMxMzQ2NjJkMzk2NDMzNjQzMDMyMzQzMTMzNjI2NjY0MmU2NzY5NjYpXG4gKiBmb3IgaG93IGBjYXJnb2AgYW5kIGBxdWV1ZWAgd29yay5cbiAqXG4gKiBXaGlsZSBbYHF1ZXVlYF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnF1ZXVlfSBwYXNzZXMgb25seSBvbmUgdGFzayB0byBvbmUgb2YgYSBncm91cCBvZiB3b3JrZXJzXG4gKiBhdCBhIHRpbWUsIGNhcmdvIHBhc3NlcyBhbiBhcnJheSBvZiB0YXNrcyB0byBhIHNpbmdsZSB3b3JrZXIsIHJlcGVhdGluZ1xuICogd2hlbiB0aGUgd29ya2VyIGlzIGZpbmlzaGVkLlxuICpcbiAqIEBuYW1lIGNhcmdvXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5xdWV1ZV17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnF1ZXVlfVxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSB3b3JrZXIgLSBBbiBhc3luY2hyb25vdXMgZnVuY3Rpb24gZm9yIHByb2Nlc3NpbmcgYW4gYXJyYXlcbiAqIG9mIHF1ZXVlZCB0YXNrcy4gSW52b2tlZCB3aXRoIGAodGFza3MsIGNhbGxiYWNrKWAuXG4gKiBAcGFyYW0ge251bWJlcn0gW3BheWxvYWQ9SW5maW5pdHldIC0gQW4gb3B0aW9uYWwgYGludGVnZXJgIGZvciBkZXRlcm1pbmluZ1xuICogaG93IG1hbnkgdGFza3Mgc2hvdWxkIGJlIHByb2Nlc3NlZCBwZXIgcm91bmQ7IGlmIG9taXR0ZWQsIHRoZSBkZWZhdWx0IGlzXG4gKiB1bmxpbWl0ZWQuXG4gKiBAcmV0dXJucyB7bW9kdWxlOkNvbnRyb2xGbG93LkNhcmdvT2JqZWN0fSBBIGNhcmdvIG9iamVjdCB0byBtYW5hZ2UgdGhlIHRhc2tzLiBDYWxsYmFja3MgY2FuXG4gKiBhdHRhY2hlZCBhcyBjZXJ0YWluIHByb3BlcnRpZXMgdG8gbGlzdGVuIGZvciBzcGVjaWZpYyBldmVudHMgZHVyaW5nIHRoZVxuICogbGlmZWN5Y2xlIG9mIHRoZSBjYXJnbyBhbmQgaW5uZXIgcXVldWUuXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIGNyZWF0ZSBhIGNhcmdvIG9iamVjdCB3aXRoIHBheWxvYWQgMlxuICogdmFyIGNhcmdvID0gYXN5bmMuY2FyZ28oZnVuY3Rpb24odGFza3MsIGNhbGxiYWNrKSB7XG4gKiAgICAgZm9yICh2YXIgaT0wOyBpPHRhc2tzLmxlbmd0aDsgaSsrKSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdoZWxsbyAnICsgdGFza3NbaV0ubmFtZSk7XG4gKiAgICAgfVxuICogICAgIGNhbGxiYWNrKCk7XG4gKiB9LCAyKTtcbiAqXG4gKiAvLyBhZGQgc29tZSBpdGVtc1xuICogY2FyZ28ucHVzaCh7bmFtZTogJ2Zvbyd9LCBmdW5jdGlvbihlcnIpIHtcbiAqICAgICBjb25zb2xlLmxvZygnZmluaXNoZWQgcHJvY2Vzc2luZyBmb28nKTtcbiAqIH0pO1xuICogY2FyZ28ucHVzaCh7bmFtZTogJ2Jhcid9LCBmdW5jdGlvbihlcnIpIHtcbiAqICAgICBjb25zb2xlLmxvZygnZmluaXNoZWQgcHJvY2Vzc2luZyBiYXInKTtcbiAqIH0pO1xuICogY2FyZ28ucHVzaCh7bmFtZTogJ2Jheid9LCBmdW5jdGlvbihlcnIpIHtcbiAqICAgICBjb25zb2xlLmxvZygnZmluaXNoZWQgcHJvY2Vzc2luZyBiYXonKTtcbiAqIH0pO1xuICovXG5mdW5jdGlvbiBjYXJnbyh3b3JrZXIsIHBheWxvYWQpIHtcbiAgICByZXR1cm4gcXVldWUod29ya2VyLCAxLCBwYXlsb2FkKTtcbn1cblxuLyoqXG4gKiBUaGUgc2FtZSBhcyBbYGVhY2hPZmBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5lYWNoT2Z9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAqXG4gKiBAbmFtZSBlYWNoT2ZTZXJpZXNcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLmVhY2hPZl17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmVhY2hPZn1cbiAqIEBhbGlhcyBmb3JFYWNoT2ZTZXJpZXNcbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQW4gYXN5bmMgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluXG4gKiBgY29sbGAuXG4gKiBJbnZva2VkIHdpdGggKGl0ZW0sIGtleSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsIGBpdGVyYXRlZWBcbiAqIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIEludm9rZWQgd2l0aCAoZXJyKS5cbiAqL1xudmFyIGVhY2hPZlNlcmllcyA9IGRvTGltaXQoZWFjaE9mTGltaXQsIDEpO1xuXG4vKipcbiAqIFJlZHVjZXMgYGNvbGxgIGludG8gYSBzaW5nbGUgdmFsdWUgdXNpbmcgYW4gYXN5bmMgYGl0ZXJhdGVlYCB0byByZXR1cm4gZWFjaFxuICogc3VjY2Vzc2l2ZSBzdGVwLiBgbWVtb2AgaXMgdGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIHJlZHVjdGlvbi4gVGhpcyBmdW5jdGlvblxuICogb25seSBvcGVyYXRlcyBpbiBzZXJpZXMuXG4gKlxuICogRm9yIHBlcmZvcm1hbmNlIHJlYXNvbnMsIGl0IG1heSBtYWtlIHNlbnNlIHRvIHNwbGl0IGEgY2FsbCB0byB0aGlzIGZ1bmN0aW9uXG4gKiBpbnRvIGEgcGFyYWxsZWwgbWFwLCBhbmQgdGhlbiB1c2UgdGhlIG5vcm1hbCBgQXJyYXkucHJvdG90eXBlLnJlZHVjZWAgb24gdGhlXG4gKiByZXN1bHRzLiBUaGlzIGZ1bmN0aW9uIGlzIGZvciBzaXR1YXRpb25zIHdoZXJlIGVhY2ggc3RlcCBpbiB0aGUgcmVkdWN0aW9uXG4gKiBuZWVkcyB0byBiZSBhc3luYzsgaWYgeW91IGNhbiBnZXQgdGhlIGRhdGEgYmVmb3JlIHJlZHVjaW5nIGl0LCB0aGVuIGl0J3NcbiAqIHByb2JhYmx5IGEgZ29vZCBpZGVhIHRvIGRvIHNvLlxuICpcbiAqIEBuYW1lIHJlZHVjZVxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQGFsaWFzIGluamVjdFxuICogQGFsaWFzIGZvbGRsXG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHsqfSBtZW1vIC0gVGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIHJlZHVjdGlvbi5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIGFwcGxpZWQgdG8gZWFjaCBpdGVtIGluIHRoZVxuICogYXJyYXkgdG8gcHJvZHVjZSB0aGUgbmV4dCBzdGVwIGluIHRoZSByZWR1Y3Rpb24uXG4gKiBUaGUgYGl0ZXJhdGVlYCBzaG91bGQgY29tcGxldGUgd2l0aCB0aGUgbmV4dCBzdGF0ZSBvZiB0aGUgcmVkdWN0aW9uLlxuICogSWYgdGhlIGl0ZXJhdGVlIGNvbXBsZXRlIHdpdGggYW4gZXJyb3IsIHRoZSByZWR1Y3Rpb24gaXMgc3RvcHBlZCBhbmQgdGhlXG4gKiBtYWluIGBjYWxsYmFja2AgaXMgaW1tZWRpYXRlbHkgY2FsbGVkIHdpdGggdGhlIGVycm9yLlxuICogSW52b2tlZCB3aXRoIChtZW1vLCBpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC4gUmVzdWx0IGlzIHRoZSByZWR1Y2VkIHZhbHVlLiBJbnZva2VkIHdpdGhcbiAqIChlcnIsIHJlc3VsdCkuXG4gKiBAZXhhbXBsZVxuICpcbiAqIGFzeW5jLnJlZHVjZShbMSwyLDNdLCAwLCBmdW5jdGlvbihtZW1vLCBpdGVtLCBjYWxsYmFjaykge1xuICogICAgIC8vIHBvaW50bGVzcyBhc3luYzpcbiAqICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCBtZW1vICsgaXRlbSlcbiAqICAgICB9KTtcbiAqIH0sIGZ1bmN0aW9uKGVyciwgcmVzdWx0KSB7XG4gKiAgICAgLy8gcmVzdWx0IGlzIG5vdyBlcXVhbCB0byB0aGUgbGFzdCB2YWx1ZSBvZiBtZW1vLCB3aGljaCBpcyA2XG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gcmVkdWNlKGNvbGwsIG1lbW8sIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrID0gb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICB2YXIgX2l0ZXJhdGVlID0gd3JhcEFzeW5jKGl0ZXJhdGVlKTtcbiAgICBlYWNoT2ZTZXJpZXMoY29sbCwgZnVuY3Rpb24oeCwgaSwgY2FsbGJhY2spIHtcbiAgICAgICAgX2l0ZXJhdGVlKG1lbW8sIHgsIGZ1bmN0aW9uKGVyciwgdikge1xuICAgICAgICAgICAgbWVtbyA9IHY7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9KTtcbiAgICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyLCBtZW1vKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBWZXJzaW9uIG9mIHRoZSBjb21wb3NlIGZ1bmN0aW9uIHRoYXQgaXMgbW9yZSBuYXR1cmFsIHRvIHJlYWQuIEVhY2ggZnVuY3Rpb25cbiAqIGNvbnN1bWVzIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIHByZXZpb3VzIGZ1bmN0aW9uLiBJdCBpcyB0aGUgZXF1aXZhbGVudCBvZlxuICogW2NvbXBvc2Vde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5jb21wb3NlfSB3aXRoIHRoZSBhcmd1bWVudHMgcmV2ZXJzZWQuXG4gKlxuICogRWFjaCBmdW5jdGlvbiBpcyBleGVjdXRlZCB3aXRoIHRoZSBgdGhpc2AgYmluZGluZyBvZiB0aGUgY29tcG9zZWQgZnVuY3Rpb24uXG4gKlxuICogQG5hbWUgc2VxXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5jb21wb3NlXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cuY29tcG9zZX1cbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7Li4uQXN5bmNGdW5jdGlvbn0gZnVuY3Rpb25zIC0gdGhlIGFzeW5jaHJvbm91cyBmdW5jdGlvbnMgdG8gY29tcG9zZVxuICogQHJldHVybnMge0Z1bmN0aW9ufSBhIGZ1bmN0aW9uIHRoYXQgY29tcG9zZXMgdGhlIGBmdW5jdGlvbnNgIGluIG9yZGVyXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIFJlcXVpcmVzIGxvZGFzaCAob3IgdW5kZXJzY29yZSksIGV4cHJlc3MzIGFuZCBkcmVzZW5kZSdzIG9ybTIuXG4gKiAvLyBQYXJ0IG9mIGFuIGFwcCwgdGhhdCBmZXRjaGVzIGNhdHMgb2YgdGhlIGxvZ2dlZCB1c2VyLlxuICogLy8gVGhpcyBleGFtcGxlIHVzZXMgYHNlcWAgZnVuY3Rpb24gdG8gYXZvaWQgb3Zlcm5lc3RpbmcgYW5kIGVycm9yXG4gKiAvLyBoYW5kbGluZyBjbHV0dGVyLlxuICogYXBwLmdldCgnL2NhdHMnLCBmdW5jdGlvbihyZXF1ZXN0LCByZXNwb25zZSkge1xuICogICAgIHZhciBVc2VyID0gcmVxdWVzdC5tb2RlbHMuVXNlcjtcbiAqICAgICBhc3luYy5zZXEoXG4gKiAgICAgICAgIF8uYmluZChVc2VyLmdldCwgVXNlciksICAvLyAnVXNlci5nZXQnIGhhcyBzaWduYXR1cmUgKGlkLCBjYWxsYmFjayhlcnIsIGRhdGEpKVxuICogICAgICAgICBmdW5jdGlvbih1c2VyLCBmbikge1xuICogICAgICAgICAgICAgdXNlci5nZXRDYXRzKGZuKTsgICAgICAvLyAnZ2V0Q2F0cycgaGFzIHNpZ25hdHVyZSAoY2FsbGJhY2soZXJyLCBkYXRhKSlcbiAqICAgICAgICAgfVxuICogICAgICkocmVxLnNlc3Npb24udXNlcl9pZCwgZnVuY3Rpb24gKGVyciwgY2F0cykge1xuICogICAgICAgICBpZiAoZXJyKSB7XG4gKiAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gKiAgICAgICAgICAgICByZXNwb25zZS5qc29uKHsgc3RhdHVzOiAnZXJyb3InLCBtZXNzYWdlOiBlcnIubWVzc2FnZSB9KTtcbiAqICAgICAgICAgfSBlbHNlIHtcbiAqICAgICAgICAgICAgIHJlc3BvbnNlLmpzb24oeyBzdGF0dXM6ICdvaycsIG1lc3NhZ2U6ICdDYXRzIGZvdW5kJywgZGF0YTogY2F0cyB9KTtcbiAqICAgICAgICAgfVxuICogICAgIH0pO1xuICogfSk7XG4gKi9cbmZ1bmN0aW9uIHNlcSgvKi4uLmZ1bmN0aW9ucyovKSB7XG4gICAgdmFyIF9mdW5jdGlvbnMgPSBhcnJheU1hcChhcmd1bWVudHMsIHdyYXBBc3luYyk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKC8qLi4uYXJncyovKSB7XG4gICAgICAgIHZhciBhcmdzID0gc2xpY2UoYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHZhciBjYiA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcbiAgICAgICAgaWYgKHR5cGVvZiBjYiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhcmdzLnBvcCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2IgPSBub29wO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVkdWNlKF9mdW5jdGlvbnMsIGFyZ3MsIGZ1bmN0aW9uKG5ld2FyZ3MsIGZuLCBjYikge1xuICAgICAgICAgICAgZm4uYXBwbHkodGhhdCwgbmV3YXJncy5jb25jYXQoZnVuY3Rpb24oZXJyLyosIC4uLm5leHRhcmdzKi8pIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dGFyZ3MgPSBzbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgIGNiKGVyciwgbmV4dGFyZ3MpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIGNiLmFwcGx5KHRoYXQsIFtlcnJdLmNvbmNhdChyZXN1bHRzKSk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHdoaWNoIGlzIGEgY29tcG9zaXRpb24gb2YgdGhlIHBhc3NlZCBhc3luY2hyb25vdXNcbiAqIGZ1bmN0aW9ucy4gRWFjaCBmdW5jdGlvbiBjb25zdW1lcyB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiB0aGF0XG4gKiBmb2xsb3dzLiBDb21wb3NpbmcgZnVuY3Rpb25zIGBmKClgLCBgZygpYCwgYW5kIGBoKClgIHdvdWxkIHByb2R1Y2UgdGhlIHJlc3VsdFxuICogb2YgYGYoZyhoKCkpKWAsIG9ubHkgdGhpcyB2ZXJzaW9uIHVzZXMgY2FsbGJhY2tzIHRvIG9idGFpbiB0aGUgcmV0dXJuIHZhbHVlcy5cbiAqXG4gKiBFYWNoIGZ1bmN0aW9uIGlzIGV4ZWN1dGVkIHdpdGggdGhlIGB0aGlzYCBiaW5kaW5nIG9mIHRoZSBjb21wb3NlZCBmdW5jdGlvbi5cbiAqXG4gKiBAbmFtZSBjb21wb3NlXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0gey4uLkFzeW5jRnVuY3Rpb259IGZ1bmN0aW9ucyAtIHRoZSBhc3luY2hyb25vdXMgZnVuY3Rpb25zIHRvIGNvbXBvc2VcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gYW4gYXN5bmNocm9ub3VzIGZ1bmN0aW9uIHRoYXQgaXMgdGhlIGNvbXBvc2VkXG4gKiBhc3luY2hyb25vdXMgYGZ1bmN0aW9uc2BcbiAqIEBleGFtcGxlXG4gKlxuICogZnVuY3Rpb24gYWRkMShuLCBjYWxsYmFjaykge1xuICogICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCBuICsgMSk7XG4gKiAgICAgfSwgMTApO1xuICogfVxuICpcbiAqIGZ1bmN0aW9uIG11bDMobiwgY2FsbGJhY2spIHtcbiAqICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgbiAqIDMpO1xuICogICAgIH0sIDEwKTtcbiAqIH1cbiAqXG4gKiB2YXIgYWRkMW11bDMgPSBhc3luYy5jb21wb3NlKG11bDMsIGFkZDEpO1xuICogYWRkMW11bDMoNCwgZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gKiAgICAgLy8gcmVzdWx0IG5vdyBlcXVhbHMgMTVcbiAqIH0pO1xuICovXG52YXIgY29tcG9zZSA9IGZ1bmN0aW9uKC8qLi4uYXJncyovKSB7XG4gICAgcmV0dXJuIHNlcS5hcHBseShudWxsLCBzbGljZShhcmd1bWVudHMpLnJldmVyc2UoKSk7XG59O1xuXG52YXIgX2NvbmNhdCA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQ7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2Bjb25jYXRgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuY29uY2F0fSBidXQgcnVucyBhIG1heGltdW0gb2YgYGxpbWl0YCBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqXG4gKiBAbmFtZSBjb25jYXRMaW1pdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMuY29uY2F0XXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuY29uY2F0fVxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAsXG4gKiB3aGljaCBzaG91bGQgdXNlIGFuIGFycmF5IGFzIGl0cyByZXN1bHQuIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gUmVzdWx0cyBpcyBhbiBhcnJheVxuICogY29udGFpbmluZyB0aGUgY29uY2F0ZW5hdGVkIHJlc3VsdHMgb2YgdGhlIGBpdGVyYXRlZWAgZnVuY3Rpb24uIEludm9rZWQgd2l0aFxuICogKGVyciwgcmVzdWx0cykuXG4gKi9cbnZhciBjb25jYXRMaW1pdCA9IGZ1bmN0aW9uKGNvbGwsIGxpbWl0LCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IG5vb3A7XG4gICAgdmFyIF9pdGVyYXRlZSA9IHdyYXBBc3luYyhpdGVyYXRlZSk7XG4gICAgbWFwTGltaXQoY29sbCwgbGltaXQsIGZ1bmN0aW9uKHZhbCwgY2FsbGJhY2spIHtcbiAgICAgICAgX2l0ZXJhdGVlKHZhbCwgZnVuY3Rpb24oZXJyIC8qLCAuLi5hcmdzKi8pIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHNsaWNlKGFyZ3VtZW50cywgMSkpO1xuICAgICAgICB9KTtcbiAgICB9LCBmdW5jdGlvbihlcnIsIG1hcFJlc3VsdHMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1hcFJlc3VsdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChtYXBSZXN1bHRzW2ldKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gX2NvbmNhdC5hcHBseShyZXN1bHQsIG1hcFJlc3VsdHNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyciwgcmVzdWx0KTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQXBwbGllcyBgaXRlcmF0ZWVgIHRvIGVhY2ggaXRlbSBpbiBgY29sbGAsIGNvbmNhdGVuYXRpbmcgdGhlIHJlc3VsdHMuIFJldHVybnNcbiAqIHRoZSBjb25jYXRlbmF0ZWQgbGlzdC4gVGhlIGBpdGVyYXRlZWBzIGFyZSBjYWxsZWQgaW4gcGFyYWxsZWwsIGFuZCB0aGVcbiAqIHJlc3VsdHMgYXJlIGNvbmNhdGVuYXRlZCBhcyB0aGV5IHJldHVybi4gVGhlcmUgaXMgbm8gZ3VhcmFudGVlIHRoYXQgdGhlXG4gKiByZXN1bHRzIGFycmF5IHdpbGwgYmUgcmV0dXJuZWQgaW4gdGhlIG9yaWdpbmFsIG9yZGVyIG9mIGBjb2xsYCBwYXNzZWQgdG8gdGhlXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9uLlxuICpcbiAqIEBuYW1lIGNvbmNhdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAsXG4gKiB3aGljaCBzaG91bGQgdXNlIGFuIGFycmF5IGFzIGl0cyByZXN1bHQuIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrKGVycildIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBSZXN1bHRzIGlzIGFuIGFycmF5XG4gKiBjb250YWluaW5nIHRoZSBjb25jYXRlbmF0ZWQgcmVzdWx0cyBvZiB0aGUgYGl0ZXJhdGVlYCBmdW5jdGlvbi4gSW52b2tlZCB3aXRoXG4gKiAoZXJyLCByZXN1bHRzKS5cbiAqIEBleGFtcGxlXG4gKlxuICogYXN5bmMuY29uY2F0KFsnZGlyMScsJ2RpcjInLCdkaXIzJ10sIGZzLnJlYWRkaXIsIGZ1bmN0aW9uKGVyciwgZmlsZXMpIHtcbiAqICAgICAvLyBmaWxlcyBpcyBub3cgYSBsaXN0IG9mIGZpbGVuYW1lcyB0aGF0IGV4aXN0IGluIHRoZSAzIGRpcmVjdG9yaWVzXG4gKiB9KTtcbiAqL1xudmFyIGNvbmNhdCA9IGRvTGltaXQoY29uY2F0TGltaXQsIEluZmluaXR5KTtcblxuLyoqXG4gKiBUaGUgc2FtZSBhcyBbYGNvbmNhdGBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5jb25jYXR9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAqXG4gKiBAbmFtZSBjb25jYXRTZXJpZXNcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLmNvbmNhdF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmNvbmNhdH1cbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW4gYGNvbGxgLlxuICogVGhlIGl0ZXJhdGVlIHNob3VsZCBjb21wbGV0ZSB3aXRoIGFuIGFycmF5IGFuIGFycmF5IG9mIHJlc3VsdHMuXG4gKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjayhlcnIpXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gUmVzdWx0cyBpcyBhbiBhcnJheVxuICogY29udGFpbmluZyB0aGUgY29uY2F0ZW5hdGVkIHJlc3VsdHMgb2YgdGhlIGBpdGVyYXRlZWAgZnVuY3Rpb24uIEludm9rZWQgd2l0aFxuICogKGVyciwgcmVzdWx0cykuXG4gKi9cbnZhciBjb25jYXRTZXJpZXMgPSBkb0xpbWl0KGNvbmNhdExpbWl0LCAxKTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aGVuIGNhbGxlZCwgY2FsbHMtYmFjayB3aXRoIHRoZSB2YWx1ZXMgcHJvdmlkZWQuXG4gKiBVc2VmdWwgYXMgdGhlIGZpcnN0IGZ1bmN0aW9uIGluIGEgW2B3YXRlcmZhbGxgXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cud2F0ZXJmYWxsfSwgb3IgZm9yIHBsdWdnaW5nIHZhbHVlcyBpbiB0b1xuICogW2BhdXRvYF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LmF1dG99LlxuICpcbiAqIEBuYW1lIGNvbnN0YW50XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHBhcmFtIHsuLi4qfSBhcmd1bWVudHMuLi4gLSBBbnkgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBhdXRvbWF0aWNhbGx5IGludm9rZVxuICogY2FsbGJhY2sgd2l0aC5cbiAqIEByZXR1cm5zIHtBc3luY0Z1bmN0aW9ufSBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aGVuIGludm9rZWQsIGF1dG9tYXRpY2FsbHlcbiAqIGludm9rZXMgdGhlIGNhbGxiYWNrIHdpdGggdGhlIHByZXZpb3VzIGdpdmVuIGFyZ3VtZW50cy5cbiAqIEBleGFtcGxlXG4gKlxuICogYXN5bmMud2F0ZXJmYWxsKFtcbiAqICAgICBhc3luYy5jb25zdGFudCg0MiksXG4gKiAgICAgZnVuY3Rpb24gKHZhbHVlLCBuZXh0KSB7XG4gKiAgICAgICAgIC8vIHZhbHVlID09PSA0MlxuICogICAgIH0sXG4gKiAgICAgLy8uLi5cbiAqIF0sIGNhbGxiYWNrKTtcbiAqXG4gKiBhc3luYy53YXRlcmZhbGwoW1xuICogICAgIGFzeW5jLmNvbnN0YW50KGZpbGVuYW1lLCBcInV0ZjhcIiksXG4gKiAgICAgZnMucmVhZEZpbGUsXG4gKiAgICAgZnVuY3Rpb24gKGZpbGVEYXRhLCBuZXh0KSB7XG4gKiAgICAgICAgIC8vLi4uXG4gKiAgICAgfVxuICogICAgIC8vLi4uXG4gKiBdLCBjYWxsYmFjayk7XG4gKlxuICogYXN5bmMuYXV0byh7XG4gKiAgICAgaG9zdG5hbWU6IGFzeW5jLmNvbnN0YW50KFwiaHR0cHM6Ly9zZXJ2ZXIubmV0L1wiKSxcbiAqICAgICBwb3J0OiBmaW5kRnJlZVBvcnQsXG4gKiAgICAgbGF1bmNoU2VydmVyOiBbXCJob3N0bmFtZVwiLCBcInBvcnRcIiwgZnVuY3Rpb24gKG9wdGlvbnMsIGNiKSB7XG4gKiAgICAgICAgIHN0YXJ0U2VydmVyKG9wdGlvbnMsIGNiKTtcbiAqICAgICB9XSxcbiAqICAgICAvLy4uLlxuICogfSwgY2FsbGJhY2spO1xuICovXG52YXIgY29uc3RhbnQgPSBmdW5jdGlvbigvKi4uLnZhbHVlcyovKSB7XG4gICAgdmFyIHZhbHVlcyA9IHNsaWNlKGFyZ3VtZW50cyk7XG4gICAgdmFyIGFyZ3MgPSBbbnVsbF0uY29uY2F0KHZhbHVlcyk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgvKi4uLmlnbm9yZWRBcmdzLCBjYWxsYmFjayovKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV07XG4gICAgICAgIHJldHVybiBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9O1xufTtcblxuLyoqXG4gKiBUaGlzIG1ldGhvZCByZXR1cm5zIHRoZSBmaXJzdCBhcmd1bWVudCBpdCByZWNlaXZlcy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHBhcmFtIHsqfSB2YWx1ZSBBbnkgdmFsdWUuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyBgdmFsdWVgLlxuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgb2JqZWN0ID0geyAnYSc6IDEgfTtcbiAqXG4gKiBjb25zb2xlLmxvZyhfLmlkZW50aXR5KG9iamVjdCkgPT09IG9iamVjdCk7XG4gKiAvLyA9PiB0cnVlXG4gKi9cbmZ1bmN0aW9uIGlkZW50aXR5KHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gX2NyZWF0ZVRlc3RlcihjaGVjaywgZ2V0UmVzdWx0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGVhY2hmbiwgYXJyLCBpdGVyYXRlZSwgY2IpIHtcbiAgICAgICAgY2IgPSBjYiB8fCBub29wO1xuICAgICAgICB2YXIgdGVzdFBhc3NlZCA9IGZhbHNlO1xuICAgICAgICB2YXIgdGVzdFJlc3VsdDtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24odmFsdWUsIF8sIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRlZSh2YWx1ZSwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaGVjayhyZXN1bHQpICYmICF0ZXN0UmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRlc3RQYXNzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0ZXN0UmVzdWx0ID0gZ2V0UmVzdWx0KHRydWUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgYnJlYWtMb29wKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYihlcnIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYihudWxsLCB0ZXN0UGFzc2VkID8gdGVzdFJlc3VsdCA6IGdldFJlc3VsdChmYWxzZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBfZmluZEdldFJlc3VsdCh2LCB4KSB7XG4gICAgcmV0dXJuIHg7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZmlyc3QgdmFsdWUgaW4gYGNvbGxgIHRoYXQgcGFzc2VzIGFuIGFzeW5jIHRydXRoIHRlc3QuIFRoZVxuICogYGl0ZXJhdGVlYCBpcyBhcHBsaWVkIGluIHBhcmFsbGVsLCBtZWFuaW5nIHRoZSBmaXJzdCBpdGVyYXRlZSB0byByZXR1cm5cbiAqIGB0cnVlYCB3aWxsIGZpcmUgdGhlIGRldGVjdCBgY2FsbGJhY2tgIHdpdGggdGhhdCByZXN1bHQuIFRoYXQgbWVhbnMgdGhlXG4gKiByZXN1bHQgbWlnaHQgbm90IGJlIHRoZSBmaXJzdCBpdGVtIGluIHRoZSBvcmlnaW5hbCBgY29sbGAgKGluIHRlcm1zIG9mIG9yZGVyKVxuICogdGhhdCBwYXNzZXMgdGhlIHRlc3QuXG5cbiAqIElmIG9yZGVyIHdpdGhpbiB0aGUgb3JpZ2luYWwgYGNvbGxgIGlzIGltcG9ydGFudCwgdGhlbiBsb29rIGF0XG4gKiBbYGRldGVjdFNlcmllc2Bde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5kZXRlY3RTZXJpZXN9LlxuICpcbiAqIEBuYW1lIGRldGVjdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQGFsaWFzIGZpbmRcbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgdHJ1dGggdGVzdCB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW4gYGNvbGxgLlxuICogVGhlIGl0ZXJhdGVlIG11c3QgY29tcGxldGUgd2l0aCBhIGJvb2xlYW4gdmFsdWUgYXMgaXRzIHJlc3VsdC5cbiAqIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFzIHNvb24gYXMgYW55XG4gKiBpdGVyYXRlZSByZXR1cm5zIGB0cnVlYCwgb3IgYWZ0ZXIgYWxsIHRoZSBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLlxuICogUmVzdWx0IHdpbGwgYmUgdGhlIGZpcnN0IGl0ZW0gaW4gdGhlIGFycmF5IHRoYXQgcGFzc2VzIHRoZSB0cnV0aCB0ZXN0XG4gKiAoaXRlcmF0ZWUpIG9yIHRoZSB2YWx1ZSBgdW5kZWZpbmVkYCBpZiBub25lIHBhc3NlZC4gSW52b2tlZCB3aXRoXG4gKiAoZXJyLCByZXN1bHQpLlxuICogQGV4YW1wbGVcbiAqXG4gKiBhc3luYy5kZXRlY3QoWydmaWxlMScsJ2ZpbGUyJywnZmlsZTMnXSwgZnVuY3Rpb24oZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gKiAgICAgZnMuYWNjZXNzKGZpbGVQYXRoLCBmdW5jdGlvbihlcnIpIHtcbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgIWVycilcbiAqICAgICB9KTtcbiAqIH0sIGZ1bmN0aW9uKGVyciwgcmVzdWx0KSB7XG4gKiAgICAgLy8gcmVzdWx0IG5vdyBlcXVhbHMgdGhlIGZpcnN0IGZpbGUgaW4gdGhlIGxpc3QgdGhhdCBleGlzdHNcbiAqIH0pO1xuICovXG52YXIgZGV0ZWN0ID0gZG9QYXJhbGxlbChfY3JlYXRlVGVzdGVyKGlkZW50aXR5LCBfZmluZEdldFJlc3VsdCkpO1xuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFtgZGV0ZWN0YF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmRldGVjdH0gYnV0IHJ1bnMgYSBtYXhpbXVtIG9mIGBsaW1pdGAgYXN5bmMgb3BlcmF0aW9ucyBhdCBhXG4gKiB0aW1lLlxuICpcbiAqIEBuYW1lIGRldGVjdExpbWl0XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5kZXRlY3Rde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5kZXRlY3R9XG4gKiBAYWxpYXMgZmluZExpbWl0XG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIHRydXRoIHRlc3QgdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluIGBjb2xsYC5cbiAqIFRoZSBpdGVyYXRlZSBtdXN0IGNvbXBsZXRlIHdpdGggYSBib29sZWFuIHZhbHVlIGFzIGl0cyByZXN1bHQuXG4gKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhcyBzb29uIGFzIGFueVxuICogaXRlcmF0ZWUgcmV0dXJucyBgdHJ1ZWAsIG9yIGFmdGVyIGFsbCB0aGUgYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC5cbiAqIFJlc3VsdCB3aWxsIGJlIHRoZSBmaXJzdCBpdGVtIGluIHRoZSBhcnJheSB0aGF0IHBhc3NlcyB0aGUgdHJ1dGggdGVzdFxuICogKGl0ZXJhdGVlKSBvciB0aGUgdmFsdWUgYHVuZGVmaW5lZGAgaWYgbm9uZSBwYXNzZWQuIEludm9rZWQgd2l0aFxuICogKGVyciwgcmVzdWx0KS5cbiAqL1xudmFyIGRldGVjdExpbWl0ID0gZG9QYXJhbGxlbExpbWl0KF9jcmVhdGVUZXN0ZXIoaWRlbnRpdHksIF9maW5kR2V0UmVzdWx0KSk7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2BkZXRlY3RgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZGV0ZWN0fSBidXQgcnVucyBvbmx5IGEgc2luZ2xlIGFzeW5jIG9wZXJhdGlvbiBhdCBhIHRpbWUuXG4gKlxuICogQG5hbWUgZGV0ZWN0U2VyaWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5kZXRlY3Rde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5kZXRlY3R9XG4gKiBAYWxpYXMgZmluZFNlcmllc1xuICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gKiBUaGUgaXRlcmF0ZWUgbXVzdCBjb21wbGV0ZSB3aXRoIGEgYm9vbGVhbiB2YWx1ZSBhcyBpdHMgcmVzdWx0LlxuICogSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYXMgc29vbiBhcyBhbnlcbiAqIGl0ZXJhdGVlIHJldHVybnMgYHRydWVgLCBvciBhZnRlciBhbGwgdGhlIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuXG4gKiBSZXN1bHQgd2lsbCBiZSB0aGUgZmlyc3QgaXRlbSBpbiB0aGUgYXJyYXkgdGhhdCBwYXNzZXMgdGhlIHRydXRoIHRlc3RcbiAqIChpdGVyYXRlZSkgb3IgdGhlIHZhbHVlIGB1bmRlZmluZWRgIGlmIG5vbmUgcGFzc2VkLiBJbnZva2VkIHdpdGhcbiAqIChlcnIsIHJlc3VsdCkuXG4gKi9cbnZhciBkZXRlY3RTZXJpZXMgPSBkb0xpbWl0KGRldGVjdExpbWl0LCAxKTtcblxuZnVuY3Rpb24gY29uc29sZUZ1bmMobmFtZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZm4vKiwgLi4uYXJncyovKSB7XG4gICAgICAgIHZhciBhcmdzID0gc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgYXJncy5wdXNoKGZ1bmN0aW9uIChlcnIvKiwgLi4uYXJncyovKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29uc29sZS5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb25zb2xlW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGFycmF5RWFjaChhcmdzLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZVtuYW1lXSh4KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgd3JhcEFzeW5jKGZuKS5hcHBseShudWxsLCBhcmdzKTtcbiAgICB9O1xufVxuXG4vKipcbiAqIExvZ3MgdGhlIHJlc3VsdCBvZiBhbiBbYGFzeW5jYCBmdW5jdGlvbl17QGxpbmsgQXN5bmNGdW5jdGlvbn0gdG8gdGhlXG4gKiBgY29uc29sZWAgdXNpbmcgYGNvbnNvbGUuZGlyYCB0byBkaXNwbGF5IHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSByZXN1bHRpbmcgb2JqZWN0LlxuICogT25seSB3b3JrcyBpbiBOb2RlLmpzIG9yIGluIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBgY29uc29sZS5kaXJgIGFuZFxuICogYGNvbnNvbGUuZXJyb3JgIChzdWNoIGFzIEZGIGFuZCBDaHJvbWUpLlxuICogSWYgbXVsdGlwbGUgYXJndW1lbnRzIGFyZSByZXR1cm5lZCBmcm9tIHRoZSBhc3luYyBmdW5jdGlvbixcbiAqIGBjb25zb2xlLmRpcmAgaXMgY2FsbGVkIG9uIGVhY2ggYXJndW1lbnQgaW4gb3JkZXIuXG4gKlxuICogQG5hbWUgZGlyXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBmdW5jdGlvbiAtIFRoZSBmdW5jdGlvbiB5b3Ugd2FudCB0byBldmVudHVhbGx5IGFwcGx5XG4gKiBhbGwgYXJndW1lbnRzIHRvLlxuICogQHBhcmFtIHsuLi4qfSBhcmd1bWVudHMuLi4gLSBBbnkgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBhcHBseSB0byB0aGUgZnVuY3Rpb24uXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIGluIGEgbW9kdWxlXG4gKiB2YXIgaGVsbG8gPSBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaykge1xuICogICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtoZWxsbzogbmFtZX0pO1xuICogICAgIH0sIDEwMDApO1xuICogfTtcbiAqXG4gKiAvLyBpbiB0aGUgbm9kZSByZXBsXG4gKiBub2RlPiBhc3luYy5kaXIoaGVsbG8sICd3b3JsZCcpO1xuICoge2hlbGxvOiAnd29ybGQnfVxuICovXG52YXIgZGlyID0gY29uc29sZUZ1bmMoJ2RpcicpO1xuXG4vKipcbiAqIFRoZSBwb3N0LWNoZWNrIHZlcnNpb24gb2YgW2BkdXJpbmdgXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cuZHVyaW5nfS4gVG8gcmVmbGVjdCB0aGUgZGlmZmVyZW5jZSBpblxuICogdGhlIG9yZGVyIG9mIG9wZXJhdGlvbnMsIHRoZSBhcmd1bWVudHMgYHRlc3RgIGFuZCBgZm5gIGFyZSBzd2l0Y2hlZC5cbiAqXG4gKiBBbHNvIGEgdmVyc2lvbiBvZiBbYGRvV2hpbHN0YF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LmRvV2hpbHN0fSB3aXRoIGFzeW5jaHJvbm91cyBgdGVzdGAgZnVuY3Rpb24uXG4gKiBAbmFtZSBkb0R1cmluZ1xuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMuZHVyaW5nXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cuZHVyaW5nfVxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBmbiAtIEFuIGFzeW5jIGZ1bmN0aW9uIHdoaWNoIGlzIGNhbGxlZCBlYWNoIHRpbWVcbiAqIGB0ZXN0YCBwYXNzZXMuIEludm9rZWQgd2l0aCAoY2FsbGJhY2spLlxuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSB0ZXN0IC0gYXN5bmNocm9ub3VzIHRydXRoIHRlc3QgdG8gcGVyZm9ybSBiZWZvcmUgZWFjaFxuICogZXhlY3V0aW9uIG9mIGBmbmAuIEludm9rZWQgd2l0aCAoLi4uYXJncywgY2FsbGJhY2spLCB3aGVyZSBgLi4uYXJnc2AgYXJlIHRoZVxuICogbm9uLWVycm9yIGFyZ3MgZnJvbSB0aGUgcHJldmlvdXMgY2FsbGJhY2sgb2YgYGZuYC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciB0aGUgdGVzdFxuICogZnVuY3Rpb24gaGFzIGZhaWxlZCBhbmQgcmVwZWF0ZWQgZXhlY3V0aW9uIG9mIGBmbmAgaGFzIHN0b3BwZWQuIGBjYWxsYmFja2BcbiAqIHdpbGwgYmUgcGFzc2VkIGFuIGVycm9yIGlmIG9uZSBvY2N1cnJlZCwgb3RoZXJ3aXNlIGBudWxsYC5cbiAqL1xuZnVuY3Rpb24gZG9EdXJpbmcoZm4sIHRlc3QsIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBvbmx5T25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICB2YXIgX2ZuID0gd3JhcEFzeW5jKGZuKTtcbiAgICB2YXIgX3Rlc3QgPSB3cmFwQXN5bmModGVzdCk7XG5cbiAgICBmdW5jdGlvbiBuZXh0KGVyci8qLCAuLi5hcmdzKi8pIHtcbiAgICAgICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIHZhciBhcmdzID0gc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgYXJncy5wdXNoKGNoZWNrKTtcbiAgICAgICAgX3Rlc3QuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2soZXJyLCB0cnV0aCkge1xuICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgaWYgKCF0cnV0aCkgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICBfZm4obmV4dCk7XG4gICAgfVxuXG4gICAgY2hlY2sobnVsbCwgdHJ1ZSk7XG5cbn1cblxuLyoqXG4gKiBUaGUgcG9zdC1jaGVjayB2ZXJzaW9uIG9mIFtgd2hpbHN0YF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LndoaWxzdH0uIFRvIHJlZmxlY3QgdGhlIGRpZmZlcmVuY2UgaW5cbiAqIHRoZSBvcmRlciBvZiBvcGVyYXRpb25zLCB0aGUgYXJndW1lbnRzIGB0ZXN0YCBhbmQgYGl0ZXJhdGVlYCBhcmUgc3dpdGNoZWQuXG4gKlxuICogYGRvV2hpbHN0YCBpcyB0byBgd2hpbHN0YCBhcyBgZG8gd2hpbGVgIGlzIHRvIGB3aGlsZWAgaW4gcGxhaW4gSmF2YVNjcmlwdC5cbiAqXG4gKiBAbmFtZSBkb1doaWxzdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMud2hpbHN0XXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cud2hpbHN0fVxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgZnVuY3Rpb24gd2hpY2ggaXMgY2FsbGVkIGVhY2ggdGltZSBgdGVzdGBcbiAqIHBhc3Nlcy4gSW52b2tlZCB3aXRoIChjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB0ZXN0IC0gc3luY2hyb25vdXMgdHJ1dGggdGVzdCB0byBwZXJmb3JtIGFmdGVyIGVhY2hcbiAqIGV4ZWN1dGlvbiBvZiBgaXRlcmF0ZWVgLiBJbnZva2VkIHdpdGggYW55IG5vbi1lcnJvciBjYWxsYmFjayByZXN1bHRzIG9mXG4gKiBgaXRlcmF0ZWVgLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIHRoZSB0ZXN0XG4gKiBmdW5jdGlvbiBoYXMgZmFpbGVkIGFuZCByZXBlYXRlZCBleGVjdXRpb24gb2YgYGl0ZXJhdGVlYCBoYXMgc3RvcHBlZC5cbiAqIGBjYWxsYmFja2Agd2lsbCBiZSBwYXNzZWQgYW4gZXJyb3IgYW5kIGFueSBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBmaW5hbFxuICogYGl0ZXJhdGVlYCdzIGNhbGxiYWNrLiBJbnZva2VkIHdpdGggKGVyciwgW3Jlc3VsdHNdKTtcbiAqL1xuZnVuY3Rpb24gZG9XaGlsc3QoaXRlcmF0ZWUsIHRlc3QsIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBvbmx5T25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICB2YXIgX2l0ZXJhdGVlID0gd3JhcEFzeW5jKGl0ZXJhdGVlKTtcbiAgICB2YXIgbmV4dCA9IGZ1bmN0aW9uKGVyci8qLCAuLi5hcmdzKi8pIHtcbiAgICAgICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIHZhciBhcmdzID0gc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgaWYgKHRlc3QuYXBwbHkodGhpcywgYXJncykpIHJldHVybiBfaXRlcmF0ZWUobmV4dCk7XG4gICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIFtudWxsXS5jb25jYXQoYXJncykpO1xuICAgIH07XG4gICAgX2l0ZXJhdGVlKG5leHQpO1xufVxuXG4vKipcbiAqIExpa2UgWydkb1doaWxzdCdde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5kb1doaWxzdH0sIGV4Y2VwdCB0aGUgYHRlc3RgIGlzIGludmVydGVkLiBOb3RlIHRoZVxuICogYXJndW1lbnQgb3JkZXJpbmcgZGlmZmVycyBmcm9tIGB1bnRpbGAuXG4gKlxuICogQG5hbWUgZG9VbnRpbFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMuZG9XaGlsc3Rde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5kb1doaWxzdH1cbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyBmdW5jdGlvbiB3aGljaCBpcyBjYWxsZWQgZWFjaCB0aW1lXG4gKiBgdGVzdGAgZmFpbHMuIEludm9rZWQgd2l0aCAoY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gdGVzdCAtIHN5bmNocm9ub3VzIHRydXRoIHRlc3QgdG8gcGVyZm9ybSBhZnRlciBlYWNoXG4gKiBleGVjdXRpb24gb2YgYGl0ZXJhdGVlYC4gSW52b2tlZCB3aXRoIGFueSBub24tZXJyb3IgY2FsbGJhY2sgcmVzdWx0cyBvZlxuICogYGl0ZXJhdGVlYC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciB0aGUgdGVzdFxuICogZnVuY3Rpb24gaGFzIHBhc3NlZCBhbmQgcmVwZWF0ZWQgZXhlY3V0aW9uIG9mIGBpdGVyYXRlZWAgaGFzIHN0b3BwZWQuIGBjYWxsYmFja2BcbiAqIHdpbGwgYmUgcGFzc2VkIGFuIGVycm9yIGFuZCBhbnkgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgZmluYWwgYGl0ZXJhdGVlYCdzXG4gKiBjYWxsYmFjay4gSW52b2tlZCB3aXRoIChlcnIsIFtyZXN1bHRzXSk7XG4gKi9cbmZ1bmN0aW9uIGRvVW50aWwoaXRlcmF0ZWUsIHRlc3QsIGNhbGxiYWNrKSB7XG4gICAgZG9XaGlsc3QoaXRlcmF0ZWUsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gIXRlc3QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9LCBjYWxsYmFjayk7XG59XG5cbi8qKlxuICogTGlrZSBbYHdoaWxzdGBde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy53aGlsc3R9LCBleGNlcHQgdGhlIGB0ZXN0YCBpcyBhbiBhc3luY2hyb25vdXMgZnVuY3Rpb24gdGhhdFxuICogaXMgcGFzc2VkIGEgY2FsbGJhY2sgaW4gdGhlIGZvcm0gb2YgYGZ1bmN0aW9uIChlcnIsIHRydXRoKWAuIElmIGVycm9yIGlzXG4gKiBwYXNzZWQgdG8gYHRlc3RgIG9yIGBmbmAsIHRoZSBtYWluIGNhbGxiYWNrIGlzIGltbWVkaWF0ZWx5IGNhbGxlZCB3aXRoIHRoZVxuICogdmFsdWUgb2YgdGhlIGVycm9yLlxuICpcbiAqIEBuYW1lIGR1cmluZ1xuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMud2hpbHN0XXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cud2hpbHN0fVxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSB0ZXN0IC0gYXN5bmNocm9ub3VzIHRydXRoIHRlc3QgdG8gcGVyZm9ybSBiZWZvcmUgZWFjaFxuICogZXhlY3V0aW9uIG9mIGBmbmAuIEludm9rZWQgd2l0aCAoY2FsbGJhY2spLlxuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBmbiAtIEFuIGFzeW5jIGZ1bmN0aW9uIHdoaWNoIGlzIGNhbGxlZCBlYWNoIHRpbWVcbiAqIGB0ZXN0YCBwYXNzZXMuIEludm9rZWQgd2l0aCAoY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIHRoZSB0ZXN0XG4gKiBmdW5jdGlvbiBoYXMgZmFpbGVkIGFuZCByZXBlYXRlZCBleGVjdXRpb24gb2YgYGZuYCBoYXMgc3RvcHBlZC4gYGNhbGxiYWNrYFxuICogd2lsbCBiZSBwYXNzZWQgYW4gZXJyb3IsIGlmIG9uZSBvY2N1cnJlZCwgb3RoZXJ3aXNlIGBudWxsYC5cbiAqIEBleGFtcGxlXG4gKlxuICogdmFyIGNvdW50ID0gMDtcbiAqXG4gKiBhc3luYy5kdXJpbmcoXG4gKiAgICAgZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBjb3VudCA8IDUpO1xuICogICAgIH0sXG4gKiAgICAgZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIGNvdW50Kys7XG4gKiAgICAgICAgIHNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDApO1xuICogICAgIH0sXG4gKiAgICAgZnVuY3Rpb24gKGVycikge1xuICogICAgICAgICAvLyA1IHNlY29uZHMgaGF2ZSBwYXNzZWRcbiAqICAgICB9XG4gKiApO1xuICovXG5mdW5jdGlvbiBkdXJpbmcodGVzdCwgZm4sIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBvbmx5T25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICB2YXIgX2ZuID0gd3JhcEFzeW5jKGZuKTtcbiAgICB2YXIgX3Rlc3QgPSB3cmFwQXN5bmModGVzdCk7XG5cbiAgICBmdW5jdGlvbiBuZXh0KGVycikge1xuICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgX3Rlc3QoY2hlY2spO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrKGVyciwgdHJ1dGgpIHtcbiAgICAgICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIGlmICghdHJ1dGgpIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgX2ZuKG5leHQpO1xuICAgIH1cblxuICAgIF90ZXN0KGNoZWNrKTtcbn1cblxuZnVuY3Rpb24gX3dpdGhvdXRJbmRleChpdGVyYXRlZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAodmFsdWUsIGluZGV4LCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gaXRlcmF0ZWUodmFsdWUsIGNhbGxiYWNrKTtcbiAgICB9O1xufVxuXG4vKipcbiAqIEFwcGxpZXMgdGhlIGZ1bmN0aW9uIGBpdGVyYXRlZWAgdG8gZWFjaCBpdGVtIGluIGBjb2xsYCwgaW4gcGFyYWxsZWwuXG4gKiBUaGUgYGl0ZXJhdGVlYCBpcyBjYWxsZWQgd2l0aCBhbiBpdGVtIGZyb20gdGhlIGxpc3QsIGFuZCBhIGNhbGxiYWNrIGZvciB3aGVuXG4gKiBpdCBoYXMgZmluaXNoZWQuIElmIHRoZSBgaXRlcmF0ZWVgIHBhc3NlcyBhbiBlcnJvciB0byBpdHMgYGNhbGxiYWNrYCwgdGhlXG4gKiBtYWluIGBjYWxsYmFja2AgKGZvciB0aGUgYGVhY2hgIGZ1bmN0aW9uKSBpcyBpbW1lZGlhdGVseSBjYWxsZWQgd2l0aCB0aGVcbiAqIGVycm9yLlxuICpcbiAqIE5vdGUsIHRoYXQgc2luY2UgdGhpcyBmdW5jdGlvbiBhcHBsaWVzIGBpdGVyYXRlZWAgdG8gZWFjaCBpdGVtIGluIHBhcmFsbGVsLFxuICogdGhlcmUgaXMgbm8gZ3VhcmFudGVlIHRoYXQgdGhlIGl0ZXJhdGVlIGZ1bmN0aW9ucyB3aWxsIGNvbXBsZXRlIGluIG9yZGVyLlxuICpcbiAqIEBuYW1lIGVhY2hcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBhbGlhcyBmb3JFYWNoXG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEFuIGFzeW5jIGZ1bmN0aW9uIHRvIGFwcGx5IHRvXG4gKiBlYWNoIGl0ZW0gaW4gYGNvbGxgLiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIFRoZSBhcnJheSBpbmRleCBpcyBub3QgcGFzc2VkIHRvIHRoZSBpdGVyYXRlZS5cbiAqIElmIHlvdSBuZWVkIHRoZSBpbmRleCwgdXNlIGBlYWNoT2ZgLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIEludm9rZWQgd2l0aCAoZXJyKS5cbiAqIEBleGFtcGxlXG4gKlxuICogLy8gYXNzdW1pbmcgb3BlbkZpbGVzIGlzIGFuIGFycmF5IG9mIGZpbGUgbmFtZXMgYW5kIHNhdmVGaWxlIGlzIGEgZnVuY3Rpb25cbiAqIC8vIHRvIHNhdmUgdGhlIG1vZGlmaWVkIGNvbnRlbnRzIG9mIHRoYXQgZmlsZTpcbiAqXG4gKiBhc3luYy5lYWNoKG9wZW5GaWxlcywgc2F2ZUZpbGUsIGZ1bmN0aW9uKGVycil7XG4gKiAgIC8vIGlmIGFueSBvZiB0aGUgc2F2ZXMgcHJvZHVjZWQgYW4gZXJyb3IsIGVyciB3b3VsZCBlcXVhbCB0aGF0IGVycm9yXG4gKiB9KTtcbiAqXG4gKiAvLyBhc3N1bWluZyBvcGVuRmlsZXMgaXMgYW4gYXJyYXkgb2YgZmlsZSBuYW1lc1xuICogYXN5bmMuZWFjaChvcGVuRmlsZXMsIGZ1bmN0aW9uKGZpbGUsIGNhbGxiYWNrKSB7XG4gKlxuICogICAgIC8vIFBlcmZvcm0gb3BlcmF0aW9uIG9uIGZpbGUgaGVyZS5cbiAqICAgICBjb25zb2xlLmxvZygnUHJvY2Vzc2luZyBmaWxlICcgKyBmaWxlKTtcbiAqXG4gKiAgICAgaWYoIGZpbGUubGVuZ3RoID4gMzIgKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZygnVGhpcyBmaWxlIG5hbWUgaXMgdG9vIGxvbmcnKTtcbiAqICAgICAgIGNhbGxiYWNrKCdGaWxlIG5hbWUgdG9vIGxvbmcnKTtcbiAqICAgICB9IGVsc2Uge1xuICogICAgICAgLy8gRG8gd29yayB0byBwcm9jZXNzIGZpbGUgaGVyZVxuICogICAgICAgY29uc29sZS5sb2coJ0ZpbGUgcHJvY2Vzc2VkJyk7XG4gKiAgICAgICBjYWxsYmFjaygpO1xuICogICAgIH1cbiAqIH0sIGZ1bmN0aW9uKGVycikge1xuICogICAgIC8vIGlmIGFueSBvZiB0aGUgZmlsZSBwcm9jZXNzaW5nIHByb2R1Y2VkIGFuIGVycm9yLCBlcnIgd291bGQgZXF1YWwgdGhhdCBlcnJvclxuICogICAgIGlmKCBlcnIgKSB7XG4gKiAgICAgICAvLyBPbmUgb2YgdGhlIGl0ZXJhdGlvbnMgcHJvZHVjZWQgYW4gZXJyb3IuXG4gKiAgICAgICAvLyBBbGwgcHJvY2Vzc2luZyB3aWxsIG5vdyBzdG9wLlxuICogICAgICAgY29uc29sZS5sb2coJ0EgZmlsZSBmYWlsZWQgdG8gcHJvY2VzcycpO1xuICogICAgIH0gZWxzZSB7XG4gKiAgICAgICBjb25zb2xlLmxvZygnQWxsIGZpbGVzIGhhdmUgYmVlbiBwcm9jZXNzZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gKiAgICAgfVxuICogfSk7XG4gKi9cbmZ1bmN0aW9uIGVhY2hMaW1pdChjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICBlYWNoT2YoY29sbCwgX3dpdGhvdXRJbmRleCh3cmFwQXN5bmMoaXRlcmF0ZWUpKSwgY2FsbGJhY2spO1xufVxuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFtgZWFjaGBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5lYWNofSBidXQgcnVucyBhIG1heGltdW0gb2YgYGxpbWl0YCBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqXG4gKiBAbmFtZSBlYWNoTGltaXRcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLmVhY2hde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5lYWNofVxuICogQGFsaWFzIGZvckVhY2hMaW1pdFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW5cbiAqIGBjb2xsYC5cbiAqIFRoZSBhcnJheSBpbmRleCBpcyBub3QgcGFzc2VkIHRvIHRoZSBpdGVyYXRlZS5cbiAqIElmIHlvdSBuZWVkIHRoZSBpbmRleCwgdXNlIGBlYWNoT2ZMaW1pdGAuXG4gKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbFxuICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBJbnZva2VkIHdpdGggKGVycikuXG4gKi9cbmZ1bmN0aW9uIGVhY2hMaW1pdCQxKGNvbGwsIGxpbWl0LCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICBfZWFjaE9mTGltaXQobGltaXQpKGNvbGwsIF93aXRob3V0SW5kZXgod3JhcEFzeW5jKGl0ZXJhdGVlKSksIGNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBUaGUgc2FtZSBhcyBbYGVhY2hgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZWFjaH0gYnV0IHJ1bnMgb25seSBhIHNpbmdsZSBhc3luYyBvcGVyYXRpb24gYXQgYSB0aW1lLlxuICpcbiAqIEBuYW1lIGVhY2hTZXJpZXNcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLmVhY2hde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5lYWNofVxuICogQGFsaWFzIGZvckVhY2hTZXJpZXNcbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQW4gYXN5bmMgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaFxuICogaXRlbSBpbiBgY29sbGAuXG4gKiBUaGUgYXJyYXkgaW5kZXggaXMgbm90IHBhc3NlZCB0byB0aGUgaXRlcmF0ZWUuXG4gKiBJZiB5b3UgbmVlZCB0aGUgaW5kZXgsIHVzZSBgZWFjaE9mU2VyaWVzYC5cbiAqIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIEludm9rZWQgd2l0aCAoZXJyKS5cbiAqL1xudmFyIGVhY2hTZXJpZXMgPSBkb0xpbWl0KGVhY2hMaW1pdCQxLCAxKTtcblxuLyoqXG4gKiBXcmFwIGFuIGFzeW5jIGZ1bmN0aW9uIGFuZCBlbnN1cmUgaXQgY2FsbHMgaXRzIGNhbGxiYWNrIG9uIGEgbGF0ZXIgdGljayBvZlxuICogdGhlIGV2ZW50IGxvb3AuICBJZiB0aGUgZnVuY3Rpb24gYWxyZWFkeSBjYWxscyBpdHMgY2FsbGJhY2sgb24gYSBuZXh0IHRpY2ssXG4gKiBubyBleHRyYSBkZWZlcnJhbCBpcyBhZGRlZC4gVGhpcyBpcyB1c2VmdWwgZm9yIHByZXZlbnRpbmcgc3RhY2sgb3ZlcmZsb3dzXG4gKiAoYFJhbmdlRXJyb3I6IE1heGltdW0gY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkYCkgYW5kIGdlbmVyYWxseSBrZWVwaW5nXG4gKiBbWmFsZ29dKGh0dHA6Ly9ibG9nLml6cy5tZS9wb3N0LzU5MTQyNzQyMTQzL2Rlc2lnbmluZy1hcGlzLWZvci1hc3luY2hyb255KVxuICogY29udGFpbmVkLiBFUzIwMTcgYGFzeW5jYCBmdW5jdGlvbnMgYXJlIHJldHVybmVkIGFzLWlzIC0tIHRoZXkgYXJlIGltbXVuZVxuICogdG8gWmFsZ28ncyBjb3JydXB0aW5nIGluZmx1ZW5jZXMsIGFzIHRoZXkgYWx3YXlzIHJlc29sdmUgb24gYSBsYXRlciB0aWNrLlxuICpcbiAqIEBuYW1lIGVuc3VyZUFzeW5jXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBmbiAtIGFuIGFzeW5jIGZ1bmN0aW9uLCBvbmUgdGhhdCBleHBlY3RzIGEgbm9kZS1zdHlsZVxuICogY2FsbGJhY2sgYXMgaXRzIGxhc3QgYXJndW1lbnQuXG4gKiBAcmV0dXJucyB7QXN5bmNGdW5jdGlvbn0gUmV0dXJucyBhIHdyYXBwZWQgZnVuY3Rpb24gd2l0aCB0aGUgZXhhY3Qgc2FtZSBjYWxsXG4gKiBzaWduYXR1cmUgYXMgdGhlIGZ1bmN0aW9uIHBhc3NlZCBpbi5cbiAqIEBleGFtcGxlXG4gKlxuICogZnVuY3Rpb24gc29tZXRpbWVzQXN5bmMoYXJnLCBjYWxsYmFjaykge1xuICogICAgIGlmIChjYWNoZVthcmddKSB7XG4gKiAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBjYWNoZVthcmddKTsgLy8gdGhpcyB3b3VsZCBiZSBzeW5jaHJvbm91cyEhXG4gKiAgICAgfSBlbHNlIHtcbiAqICAgICAgICAgZG9Tb21lSU8oYXJnLCBjYWxsYmFjayk7IC8vIHRoaXMgSU8gd291bGQgYmUgYXN5bmNocm9ub3VzXG4gKiAgICAgfVxuICogfVxuICpcbiAqIC8vIHRoaXMgaGFzIGEgcmlzayBvZiBzdGFjayBvdmVyZmxvd3MgaWYgbWFueSByZXN1bHRzIGFyZSBjYWNoZWQgaW4gYSByb3dcbiAqIGFzeW5jLm1hcFNlcmllcyhhcmdzLCBzb21ldGltZXNBc3luYywgZG9uZSk7XG4gKlxuICogLy8gdGhpcyB3aWxsIGRlZmVyIHNvbWV0aW1lc0FzeW5jJ3MgY2FsbGJhY2sgaWYgbmVjZXNzYXJ5LFxuICogLy8gcHJldmVudGluZyBzdGFjayBvdmVyZmxvd3NcbiAqIGFzeW5jLm1hcFNlcmllcyhhcmdzLCBhc3luYy5lbnN1cmVBc3luYyhzb21ldGltZXNBc3luYyksIGRvbmUpO1xuICovXG5mdW5jdGlvbiBlbnN1cmVBc3luYyhmbikge1xuICAgIGlmIChpc0FzeW5jKGZuKSkgcmV0dXJuIGZuO1xuICAgIHJldHVybiBpbml0aWFsUGFyYW1zKGZ1bmN0aW9uIChhcmdzLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgc3luYyA9IHRydWU7XG4gICAgICAgIGFyZ3MucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaW5uZXJBcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgaWYgKHN5bmMpIHtcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUkMShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIGlubmVyQXJncyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIGlubmVyQXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBmbi5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgc3luYyA9IGZhbHNlO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBub3RJZCh2KSB7XG4gICAgcmV0dXJuICF2O1xufVxuXG4vKipcbiAqIFJldHVybnMgYHRydWVgIGlmIGV2ZXJ5IGVsZW1lbnQgaW4gYGNvbGxgIHNhdGlzZmllcyBhbiBhc3luYyB0ZXN0LiBJZiBhbnlcbiAqIGl0ZXJhdGVlIGNhbGwgcmV0dXJucyBgZmFsc2VgLCB0aGUgbWFpbiBgY2FsbGJhY2tgIGlzIGltbWVkaWF0ZWx5IGNhbGxlZC5cbiAqXG4gKiBAbmFtZSBldmVyeVxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQGFsaWFzIGFsbFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbVxuICogaW4gdGhlIGNvbGxlY3Rpb24gaW4gcGFyYWxsZWwuXG4gKiBUaGUgaXRlcmF0ZWUgbXVzdCBjb21wbGV0ZSB3aXRoIGEgYm9vbGVhbiByZXN1bHQgdmFsdWUuXG4gKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciBhbGwgdGhlXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLiBSZXN1bHQgd2lsbCBiZSBlaXRoZXIgYHRydWVgIG9yIGBmYWxzZWBcbiAqIGRlcGVuZGluZyBvbiB0aGUgdmFsdWVzIG9mIHRoZSBhc3luYyB0ZXN0cy4gSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdCkuXG4gKiBAZXhhbXBsZVxuICpcbiAqIGFzeW5jLmV2ZXJ5KFsnZmlsZTEnLCdmaWxlMicsJ2ZpbGUzJ10sIGZ1bmN0aW9uKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICogICAgIGZzLmFjY2VzcyhmaWxlUGF0aCwgZnVuY3Rpb24oZXJyKSB7XG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsICFlcnIpXG4gKiAgICAgfSk7XG4gKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIGlmIHJlc3VsdCBpcyB0cnVlIHRoZW4gZXZlcnkgZmlsZSBleGlzdHNcbiAqIH0pO1xuICovXG52YXIgZXZlcnkgPSBkb1BhcmFsbGVsKF9jcmVhdGVUZXN0ZXIobm90SWQsIG5vdElkKSk7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2BldmVyeWBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5ldmVyeX0gYnV0IHJ1bnMgYSBtYXhpbXVtIG9mIGBsaW1pdGAgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gKlxuICogQG5hbWUgZXZlcnlMaW1pdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMuZXZlcnlde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5ldmVyeX1cbiAqIEBhbGlhcyBhbGxMaW1pdFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbVxuICogaW4gdGhlIGNvbGxlY3Rpb24gaW4gcGFyYWxsZWwuXG4gKiBUaGUgaXRlcmF0ZWUgbXVzdCBjb21wbGV0ZSB3aXRoIGEgYm9vbGVhbiByZXN1bHQgdmFsdWUuXG4gKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciBhbGwgdGhlXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLiBSZXN1bHQgd2lsbCBiZSBlaXRoZXIgYHRydWVgIG9yIGBmYWxzZWBcbiAqIGRlcGVuZGluZyBvbiB0aGUgdmFsdWVzIG9mIHRoZSBhc3luYyB0ZXN0cy4gSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdCkuXG4gKi9cbnZhciBldmVyeUxpbWl0ID0gZG9QYXJhbGxlbExpbWl0KF9jcmVhdGVUZXN0ZXIobm90SWQsIG5vdElkKSk7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2BldmVyeWBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5ldmVyeX0gYnV0IHJ1bnMgb25seSBhIHNpbmdsZSBhc3luYyBvcGVyYXRpb24gYXQgYSB0aW1lLlxuICpcbiAqIEBuYW1lIGV2ZXJ5U2VyaWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5ldmVyeV17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmV2ZXJ5fVxuICogQGFsaWFzIGFsbFNlcmllc1xuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbVxuICogaW4gdGhlIGNvbGxlY3Rpb24gaW4gc2VyaWVzLlxuICogVGhlIGl0ZXJhdGVlIG11c3QgY29tcGxldGUgd2l0aCBhIGJvb2xlYW4gcmVzdWx0IHZhbHVlLlxuICogSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC4gUmVzdWx0IHdpbGwgYmUgZWl0aGVyIGB0cnVlYCBvciBgZmFsc2VgXG4gKiBkZXBlbmRpbmcgb24gdGhlIHZhbHVlcyBvZiB0aGUgYXN5bmMgdGVzdHMuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHQpLlxuICovXG52YXIgZXZlcnlTZXJpZXMgPSBkb0xpbWl0KGV2ZXJ5TGltaXQsIDEpO1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnByb3BlcnR5YCB3aXRob3V0IHN1cHBvcnQgZm9yIGRlZXAgcGF0aHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgcHJvcGVydHkgdG8gZ2V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYWNjZXNzb3IgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGJhc2VQcm9wZXJ0eShrZXkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IG9iamVjdFtrZXldO1xuICB9O1xufVxuXG5mdW5jdGlvbiBmaWx0ZXJBcnJheShlYWNoZm4sIGFyciwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHRydXRoVmFsdWVzID0gbmV3IEFycmF5KGFyci5sZW5ndGgpO1xuICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBpbmRleCwgY2FsbGJhY2spIHtcbiAgICAgICAgaXRlcmF0ZWUoeCwgZnVuY3Rpb24gKGVyciwgdikge1xuICAgICAgICAgICAgdHJ1dGhWYWx1ZXNbaW5kZXhdID0gISF2O1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0cnV0aFZhbHVlc1tpXSkgcmVzdWx0cy5wdXNoKGFycltpXSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0cyk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGZpbHRlckdlbmVyaWMoZWFjaGZuLCBjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGVhY2hmbihjb2xsLCBmdW5jdGlvbiAoeCwgaW5kZXgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGl0ZXJhdGVlKHgsIGZ1bmN0aW9uIChlcnIsIHYpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goe2luZGV4OiBpbmRleCwgdmFsdWU6IHh9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgYXJyYXlNYXAocmVzdWx0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGEuaW5kZXggLSBiLmluZGV4O1xuICAgICAgICAgICAgfSksIGJhc2VQcm9wZXJ0eSgndmFsdWUnKSkpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIF9maWx0ZXIoZWFjaGZuLCBjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgZmlsdGVyID0gaXNBcnJheUxpa2UoY29sbCkgPyBmaWx0ZXJBcnJheSA6IGZpbHRlckdlbmVyaWM7XG4gICAgZmlsdGVyKGVhY2hmbiwgY29sbCwgd3JhcEFzeW5jKGl0ZXJhdGVlKSwgY2FsbGJhY2sgfHwgbm9vcCk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhIG5ldyBhcnJheSBvZiBhbGwgdGhlIHZhbHVlcyBpbiBgY29sbGAgd2hpY2ggcGFzcyBhbiBhc3luYyB0cnV0aFxuICogdGVzdC4gVGhpcyBvcGVyYXRpb24gaXMgcGVyZm9ybWVkIGluIHBhcmFsbGVsLCBidXQgdGhlIHJlc3VsdHMgYXJyYXkgd2lsbCBiZVxuICogaW4gdGhlIHNhbWUgb3JkZXIgYXMgdGhlIG9yaWdpbmFsLlxuICpcbiAqIEBuYW1lIGZpbHRlclxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQGFsaWFzIHNlbGVjdFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gKiBUaGUgYGl0ZXJhdGVlYCBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyLCB0cnV0aFZhbHVlKWAsIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gKiB3aXRoIGEgYm9vbGVhbiBhcmd1bWVudCBvbmNlIGl0IGhhcyBjb21wbGV0ZWQuIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAqIEBleGFtcGxlXG4gKlxuICogYXN5bmMuZmlsdGVyKFsnZmlsZTEnLCdmaWxlMicsJ2ZpbGUzJ10sIGZ1bmN0aW9uKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICogICAgIGZzLmFjY2VzcyhmaWxlUGF0aCwgZnVuY3Rpb24oZXJyKSB7XG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsICFlcnIpXG4gKiAgICAgfSk7XG4gKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAqICAgICAvLyByZXN1bHRzIG5vdyBlcXVhbHMgYW4gYXJyYXkgb2YgdGhlIGV4aXN0aW5nIGZpbGVzXG4gKiB9KTtcbiAqL1xudmFyIGZpbHRlciA9IGRvUGFyYWxsZWwoX2ZpbHRlcik7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2BmaWx0ZXJgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZmlsdGVyfSBidXQgcnVucyBhIG1heGltdW0gb2YgYGxpbWl0YCBhc3luYyBvcGVyYXRpb25zIGF0IGFcbiAqIHRpbWUuXG4gKlxuICogQG5hbWUgZmlsdGVyTGltaXRcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLmZpbHRlcl17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmZpbHRlcn1cbiAqIEBhbGlhcyBzZWxlY3RMaW1pdFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gKiBUaGUgYGl0ZXJhdGVlYCBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyLCB0cnV0aFZhbHVlKWAsIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gKiB3aXRoIGEgYm9vbGVhbiBhcmd1bWVudCBvbmNlIGl0IGhhcyBjb21wbGV0ZWQuIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAqL1xudmFyIGZpbHRlckxpbWl0ID0gZG9QYXJhbGxlbExpbWl0KF9maWx0ZXIpO1xuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFtgZmlsdGVyYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmZpbHRlcn0gYnV0IHJ1bnMgb25seSBhIHNpbmdsZSBhc3luYyBvcGVyYXRpb24gYXQgYSB0aW1lLlxuICpcbiAqIEBuYW1lIGZpbHRlclNlcmllc1xuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMuZmlsdGVyXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZmlsdGVyfVxuICogQGFsaWFzIHNlbGVjdFNlcmllc1xuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gKiBUaGUgYGl0ZXJhdGVlYCBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyLCB0cnV0aFZhbHVlKWAsIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gKiB3aXRoIGEgYm9vbGVhbiBhcmd1bWVudCBvbmNlIGl0IGhhcyBjb21wbGV0ZWQuIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKVxuICovXG52YXIgZmlsdGVyU2VyaWVzID0gZG9MaW1pdChmaWx0ZXJMaW1pdCwgMSk7XG5cbi8qKlxuICogQ2FsbHMgdGhlIGFzeW5jaHJvbm91cyBmdW5jdGlvbiBgZm5gIHdpdGggYSBjYWxsYmFjayBwYXJhbWV0ZXIgdGhhdCBhbGxvd3MgaXRcbiAqIHRvIGNhbGwgaXRzZWxmIGFnYWluLCBpbiBzZXJpZXMsIGluZGVmaW5pdGVseS5cblxuICogSWYgYW4gZXJyb3IgaXMgcGFzc2VkIHRvIHRoZSBjYWxsYmFjayB0aGVuIGBlcnJiYWNrYCBpcyBjYWxsZWQgd2l0aCB0aGVcbiAqIGVycm9yLCBhbmQgZXhlY3V0aW9uIHN0b3BzLCBvdGhlcndpc2UgaXQgd2lsbCBuZXZlciBiZSBjYWxsZWQuXG4gKlxuICogQG5hbWUgZm9yZXZlclxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBmbiAtIGFuIGFzeW5jIGZ1bmN0aW9uIHRvIGNhbGwgcmVwZWF0ZWRseS5cbiAqIEludm9rZWQgd2l0aCAobmV4dCkuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZXJyYmFja10gLSB3aGVuIGBmbmAgcGFzc2VzIGFuIGVycm9yIHRvIGl0J3MgY2FsbGJhY2ssXG4gKiB0aGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkLCBhbmQgZXhlY3V0aW9uIHN0b3BzLiBJbnZva2VkIHdpdGggKGVycikuXG4gKiBAZXhhbXBsZVxuICpcbiAqIGFzeW5jLmZvcmV2ZXIoXG4gKiAgICAgZnVuY3Rpb24obmV4dCkge1xuICogICAgICAgICAvLyBuZXh0IGlzIHN1aXRhYmxlIGZvciBwYXNzaW5nIHRvIHRoaW5ncyB0aGF0IG5lZWQgYSBjYWxsYmFjayhlcnIgWywgd2hhdGV2ZXJdKTtcbiAqICAgICAgICAgLy8gaXQgd2lsbCByZXN1bHQgaW4gdGhpcyBmdW5jdGlvbiBiZWluZyBjYWxsZWQgYWdhaW4uXG4gKiAgICAgfSxcbiAqICAgICBmdW5jdGlvbihlcnIpIHtcbiAqICAgICAgICAgLy8gaWYgbmV4dCBpcyBjYWxsZWQgd2l0aCBhIHZhbHVlIGluIGl0cyBmaXJzdCBwYXJhbWV0ZXIsIGl0IHdpbGwgYXBwZWFyXG4gKiAgICAgICAgIC8vIGluIGhlcmUgYXMgJ2VycicsIGFuZCBleGVjdXRpb24gd2lsbCBzdG9wLlxuICogICAgIH1cbiAqICk7XG4gKi9cbmZ1bmN0aW9uIGZvcmV2ZXIoZm4sIGVycmJhY2spIHtcbiAgICB2YXIgZG9uZSA9IG9ubHlPbmNlKGVycmJhY2sgfHwgbm9vcCk7XG4gICAgdmFyIHRhc2sgPSB3cmFwQXN5bmMoZW5zdXJlQXN5bmMoZm4pKTtcblxuICAgIGZ1bmN0aW9uIG5leHQoZXJyKSB7XG4gICAgICAgIGlmIChlcnIpIHJldHVybiBkb25lKGVycik7XG4gICAgICAgIHRhc2sobmV4dCk7XG4gICAgfVxuICAgIG5leHQoKTtcbn1cblxuLyoqXG4gKiBUaGUgc2FtZSBhcyBbYGdyb3VwQnlgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZ3JvdXBCeX0gYnV0IHJ1bnMgYSBtYXhpbXVtIG9mIGBsaW1pdGAgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gKlxuICogQG5hbWUgZ3JvdXBCeUxpbWl0XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5ncm91cEJ5XXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZ3JvdXBCeX1cbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge251bWJlcn0gbGltaXQgLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQW4gYXN5bmMgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluXG4gKiBgY29sbGAuXG4gKiBUaGUgaXRlcmF0ZWUgc2hvdWxkIGNvbXBsZXRlIHdpdGggYSBga2V5YCB0byBncm91cCB0aGUgdmFsdWUgdW5kZXIuXG4gKiBJbnZva2VkIHdpdGggKHZhbHVlLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGwgYGl0ZXJhdGVlYFxuICogZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gUmVzdWx0IGlzIGFuIGBPYmplY3RgIHdob3Nlc1xuICogcHJvcGVydGllcyBhcmUgYXJyYXlzIG9mIHZhbHVlcyB3aGljaCByZXR1cm5lZCB0aGUgY29ycmVzcG9uZGluZyBrZXkuXG4gKi9cbnZhciBncm91cEJ5TGltaXQgPSBmdW5jdGlvbihjb2xsLCBsaW1pdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBub29wO1xuICAgIHZhciBfaXRlcmF0ZWUgPSB3cmFwQXN5bmMoaXRlcmF0ZWUpO1xuICAgIG1hcExpbWl0KGNvbGwsIGxpbWl0LCBmdW5jdGlvbih2YWwsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9pdGVyYXRlZSh2YWwsIGZ1bmN0aW9uKGVyciwga2V5KSB7XG4gICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCB7a2V5OiBrZXksIHZhbDogdmFsfSk7XG4gICAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uKGVyciwgbWFwUmVzdWx0cykge1xuICAgICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICAgIC8vIGZyb20gTUROLCBoYW5kbGUgb2JqZWN0IGhhdmluZyBhbiBgaGFzT3duUHJvcGVydHlgIHByb3BcbiAgICAgICAgdmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1hcFJlc3VsdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChtYXBSZXN1bHRzW2ldKSB7XG4gICAgICAgICAgICAgICAgdmFyIGtleSA9IG1hcFJlc3VsdHNbaV0ua2V5O1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSBtYXBSZXN1bHRzW2ldLnZhbDtcblxuICAgICAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKHJlc3VsdCwga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRba2V5XS5wdXNoKHZhbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0W2tleV0gPSBbdmFsXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgbmV3IG9iamVjdCwgd2hlcmUgZWFjaCB2YWx1ZSBjb3JyZXNwb25kcyB0byBhbiBhcnJheSBvZiBpdGVtcywgZnJvbVxuICogYGNvbGxgLCB0aGF0IHJldHVybmVkIHRoZSBjb3JyZXNwb25kaW5nIGtleS4gVGhhdCBpcywgdGhlIGtleXMgb2YgdGhlIG9iamVjdFxuICogY29ycmVzcG9uZCB0byB0aGUgdmFsdWVzIHBhc3NlZCB0byB0aGUgYGl0ZXJhdGVlYCBjYWxsYmFjay5cbiAqXG4gKiBOb3RlOiBTaW5jZSB0aGlzIGZ1bmN0aW9uIGFwcGxpZXMgdGhlIGBpdGVyYXRlZWAgdG8gZWFjaCBpdGVtIGluIHBhcmFsbGVsLFxuICogdGhlcmUgaXMgbm8gZ3VhcmFudGVlIHRoYXQgdGhlIGBpdGVyYXRlZWAgZnVuY3Rpb25zIHdpbGwgY29tcGxldGUgaW4gb3JkZXIuXG4gKiBIb3dldmVyLCB0aGUgdmFsdWVzIGZvciBlYWNoIGtleSBpbiB0aGUgYHJlc3VsdGAgd2lsbCBiZSBpbiB0aGUgc2FtZSBvcmRlciBhc1xuICogdGhlIG9yaWdpbmFsIGBjb2xsYC4gRm9yIE9iamVjdHMsIHRoZSB2YWx1ZXMgd2lsbCByb3VnaGx5IGJlIGluIHRoZSBvcmRlciBvZlxuICogdGhlIG9yaWdpbmFsIE9iamVjdHMnIGtleXMgKGJ1dCB0aGlzIGNhbiB2YXJ5IGFjcm9zcyBKYXZhU2NyaXB0IGVuZ2luZXMpLlxuICpcbiAqIEBuYW1lIGdyb3VwQnlcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQW4gYXN5bmMgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluXG4gKiBgY29sbGAuXG4gKiBUaGUgaXRlcmF0ZWUgc2hvdWxkIGNvbXBsZXRlIHdpdGggYSBga2V5YCB0byBncm91cCB0aGUgdmFsdWUgdW5kZXIuXG4gKiBJbnZva2VkIHdpdGggKHZhbHVlLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGwgYGl0ZXJhdGVlYFxuICogZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gUmVzdWx0IGlzIGFuIGBPYmplY3RgIHdob3Nlc1xuICogcHJvcGVydGllcyBhcmUgYXJyYXlzIG9mIHZhbHVlcyB3aGljaCByZXR1cm5lZCB0aGUgY29ycmVzcG9uZGluZyBrZXkuXG4gKiBAZXhhbXBsZVxuICpcbiAqIGFzeW5jLmdyb3VwQnkoWyd1c2VySWQxJywgJ3VzZXJJZDInLCAndXNlcklkMyddLCBmdW5jdGlvbih1c2VySWQsIGNhbGxiYWNrKSB7XG4gKiAgICAgZGIuZmluZEJ5SWQodXNlcklkLCBmdW5jdGlvbihlcnIsIHVzZXIpIHtcbiAqICAgICAgICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gKiAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCB1c2VyLmFnZSk7XG4gKiAgICAgfSk7XG4gKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIHJlc3VsdCBpcyBvYmplY3QgY29udGFpbmluZyB0aGUgdXNlcklkcyBncm91cGVkIGJ5IGFnZVxuICogICAgIC8vIGUuZy4geyAzMDogWyd1c2VySWQxJywgJ3VzZXJJZDMnXSwgNDI6IFsndXNlcklkMiddfTtcbiAqIH0pO1xuICovXG52YXIgZ3JvdXBCeSA9IGRvTGltaXQoZ3JvdXBCeUxpbWl0LCBJbmZpbml0eSk7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2Bncm91cEJ5YF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmdyb3VwQnl9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAqXG4gKiBAbmFtZSBncm91cEJ5U2VyaWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5ncm91cEJ5XXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZ3JvdXBCeX1cbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge251bWJlcn0gbGltaXQgLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQW4gYXN5bmMgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluXG4gKiBgY29sbGAuXG4gKiBUaGUgaXRlcmF0ZWUgc2hvdWxkIGNvbXBsZXRlIHdpdGggYSBga2V5YCB0byBncm91cCB0aGUgdmFsdWUgdW5kZXIuXG4gKiBJbnZva2VkIHdpdGggKHZhbHVlLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGwgYGl0ZXJhdGVlYFxuICogZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gUmVzdWx0IGlzIGFuIGBPYmplY3RgIHdob3Nlc1xuICogcHJvcGVydGllcyBhcmUgYXJyYXlzIG9mIHZhbHVlcyB3aGljaCByZXR1cm5lZCB0aGUgY29ycmVzcG9uZGluZyBrZXkuXG4gKi9cbnZhciBncm91cEJ5U2VyaWVzID0gZG9MaW1pdChncm91cEJ5TGltaXQsIDEpO1xuXG4vKipcbiAqIExvZ3MgdGhlIHJlc3VsdCBvZiBhbiBgYXN5bmNgIGZ1bmN0aW9uIHRvIHRoZSBgY29uc29sZWAuIE9ubHkgd29ya3MgaW5cbiAqIE5vZGUuanMgb3IgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IGBjb25zb2xlLmxvZ2AgYW5kIGBjb25zb2xlLmVycm9yYCAoc3VjaFxuICogYXMgRkYgYW5kIENocm9tZSkuIElmIG11bHRpcGxlIGFyZ3VtZW50cyBhcmUgcmV0dXJuZWQgZnJvbSB0aGUgYXN5bmNcbiAqIGZ1bmN0aW9uLCBgY29uc29sZS5sb2dgIGlzIGNhbGxlZCBvbiBlYWNoIGFyZ3VtZW50IGluIG9yZGVyLlxuICpcbiAqIEBuYW1lIGxvZ1xuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpVdGlsc1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IFV0aWxcbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gZnVuY3Rpb24gLSBUaGUgZnVuY3Rpb24geW91IHdhbnQgdG8gZXZlbnR1YWxseSBhcHBseVxuICogYWxsIGFyZ3VtZW50cyB0by5cbiAqIEBwYXJhbSB7Li4uKn0gYXJndW1lbnRzLi4uIC0gQW55IG51bWJlciBvZiBhcmd1bWVudHMgdG8gYXBwbHkgdG8gdGhlIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBpbiBhIG1vZHVsZVxuICogdmFyIGhlbGxvID0gZnVuY3Rpb24obmFtZSwgY2FsbGJhY2spIHtcbiAqICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCAnaGVsbG8gJyArIG5hbWUpO1xuICogICAgIH0sIDEwMDApO1xuICogfTtcbiAqXG4gKiAvLyBpbiB0aGUgbm9kZSByZXBsXG4gKiBub2RlPiBhc3luYy5sb2coaGVsbG8sICd3b3JsZCcpO1xuICogJ2hlbGxvIHdvcmxkJ1xuICovXG52YXIgbG9nID0gY29uc29sZUZ1bmMoJ2xvZycpO1xuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFtgbWFwVmFsdWVzYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLm1hcFZhbHVlc30gYnV0IHJ1bnMgYSBtYXhpbXVtIG9mIGBsaW1pdGAgYXN5bmMgb3BlcmF0aW9ucyBhdCBhXG4gKiB0aW1lLlxuICpcbiAqIEBuYW1lIG1hcFZhbHVlc0xpbWl0XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5tYXBWYWx1ZXNde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXBWYWx1ZXN9XG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge251bWJlcn0gbGltaXQgLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIHZhbHVlIGFuZCBrZXlcbiAqIGluIGBjb2xsYC5cbiAqIFRoZSBpdGVyYXRlZSBzaG91bGQgY29tcGxldGUgd2l0aCB0aGUgdHJhbnNmb3JtZWQgdmFsdWUgYXMgaXRzIHJlc3VsdC5cbiAqIEludm9rZWQgd2l0aCAodmFsdWUsIGtleSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsIGBpdGVyYXRlZWBcbiAqIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIGByZXN1bHRgIGlzIGEgbmV3IG9iamVjdCBjb25zaXN0aW5nXG4gKiBvZiBlYWNoIGtleSBmcm9tIGBvYmpgLCB3aXRoIGVhY2ggdHJhbnNmb3JtZWQgdmFsdWUgb24gdGhlIHJpZ2h0LWhhbmQgc2lkZS5cbiAqIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHQpLlxuICovXG5mdW5jdGlvbiBtYXBWYWx1ZXNMaW1pdChvYmosIGxpbWl0LCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayA9IG9uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgdmFyIG5ld09iaiA9IHt9O1xuICAgIHZhciBfaXRlcmF0ZWUgPSB3cmFwQXN5bmMoaXRlcmF0ZWUpO1xuICAgIGVhY2hPZkxpbWl0KG9iaiwgbGltaXQsIGZ1bmN0aW9uKHZhbCwga2V5LCBuZXh0KSB7XG4gICAgICAgIF9pdGVyYXRlZSh2YWwsIGtleSwgZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gbmV4dChlcnIpO1xuICAgICAgICAgICAgbmV3T2JqW2tleV0gPSByZXN1bHQ7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyLCBuZXdPYmopO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIEEgcmVsYXRpdmUgb2YgW2BtYXBgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMubWFwfSwgZGVzaWduZWQgZm9yIHVzZSB3aXRoIG9iamVjdHMuXG4gKlxuICogUHJvZHVjZXMgYSBuZXcgT2JqZWN0IGJ5IG1hcHBpbmcgZWFjaCB2YWx1ZSBvZiBgb2JqYCB0aHJvdWdoIHRoZSBgaXRlcmF0ZWVgXG4gKiBmdW5jdGlvbi4gVGhlIGBpdGVyYXRlZWAgaXMgY2FsbGVkIGVhY2ggYHZhbHVlYCBhbmQgYGtleWAgZnJvbSBgb2JqYCBhbmQgYVxuICogY2FsbGJhY2sgZm9yIHdoZW4gaXQgaGFzIGZpbmlzaGVkIHByb2Nlc3NpbmcuIEVhY2ggb2YgdGhlc2UgY2FsbGJhY2tzIHRha2VzXG4gKiB0d28gYXJndW1lbnRzOiBhbiBgZXJyb3JgLCBhbmQgdGhlIHRyYW5zZm9ybWVkIGl0ZW0gZnJvbSBgb2JqYC4gSWYgYGl0ZXJhdGVlYFxuICogcGFzc2VzIGFuIGVycm9yIHRvIGl0cyBjYWxsYmFjaywgdGhlIG1haW4gYGNhbGxiYWNrYCAoZm9yIHRoZSBgbWFwVmFsdWVzYFxuICogZnVuY3Rpb24pIGlzIGltbWVkaWF0ZWx5IGNhbGxlZCB3aXRoIHRoZSBlcnJvci5cbiAqXG4gKiBOb3RlLCB0aGUgb3JkZXIgb2YgdGhlIGtleXMgaW4gdGhlIHJlc3VsdCBpcyBub3QgZ3VhcmFudGVlZC4gIFRoZSBrZXlzIHdpbGxcbiAqIGJlIHJvdWdobHkgaW4gdGhlIG9yZGVyIHRoZXkgY29tcGxldGUsIChidXQgdGhpcyBpcyB2ZXJ5IGVuZ2luZS1zcGVjaWZpYylcbiAqXG4gKiBAbmFtZSBtYXBWYWx1ZXNcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2ggdmFsdWUgYW5kIGtleVxuICogaW4gYGNvbGxgLlxuICogVGhlIGl0ZXJhdGVlIHNob3VsZCBjb21wbGV0ZSB3aXRoIHRoZSB0cmFuc2Zvcm1lZCB2YWx1ZSBhcyBpdHMgcmVzdWx0LlxuICogSW52b2tlZCB3aXRoICh2YWx1ZSwga2V5LCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGwgYGl0ZXJhdGVlYFxuICogZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gYHJlc3VsdGAgaXMgYSBuZXcgb2JqZWN0IGNvbnNpc3RpbmdcbiAqIG9mIGVhY2gga2V5IGZyb20gYG9iamAsIHdpdGggZWFjaCB0cmFuc2Zvcm1lZCB2YWx1ZSBvbiB0aGUgcmlnaHQtaGFuZCBzaWRlLlxuICogSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdCkuXG4gKiBAZXhhbXBsZVxuICpcbiAqIGFzeW5jLm1hcFZhbHVlcyh7XG4gKiAgICAgZjE6ICdmaWxlMScsXG4gKiAgICAgZjI6ICdmaWxlMicsXG4gKiAgICAgZjM6ICdmaWxlMydcbiAqIH0sIGZ1bmN0aW9uIChmaWxlLCBrZXksIGNhbGxiYWNrKSB7XG4gKiAgIGZzLnN0YXQoZmlsZSwgY2FsbGJhY2spO1xuICogfSwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAqICAgICAvLyByZXN1bHQgaXMgbm93IGEgbWFwIG9mIHN0YXRzIGZvciBlYWNoIGZpbGUsIGUuZy5cbiAqICAgICAvLyB7XG4gKiAgICAgLy8gICAgIGYxOiBbc3RhdHMgZm9yIGZpbGUxXSxcbiAqICAgICAvLyAgICAgZjI6IFtzdGF0cyBmb3IgZmlsZTJdLFxuICogICAgIC8vICAgICBmMzogW3N0YXRzIGZvciBmaWxlM11cbiAqICAgICAvLyB9XG4gKiB9KTtcbiAqL1xuXG52YXIgbWFwVmFsdWVzID0gZG9MaW1pdChtYXBWYWx1ZXNMaW1pdCwgSW5maW5pdHkpO1xuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFtgbWFwVmFsdWVzYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLm1hcFZhbHVlc30gYnV0IHJ1bnMgb25seSBhIHNpbmdsZSBhc3luYyBvcGVyYXRpb24gYXQgYSB0aW1lLlxuICpcbiAqIEBuYW1lIG1hcFZhbHVlc1Nlcmllc1xuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMubWFwVmFsdWVzXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMubWFwVmFsdWVzfVxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCB2YWx1ZSBhbmQga2V5XG4gKiBpbiBgY29sbGAuXG4gKiBUaGUgaXRlcmF0ZWUgc2hvdWxkIGNvbXBsZXRlIHdpdGggdGhlIHRyYW5zZm9ybWVkIHZhbHVlIGFzIGl0cyByZXN1bHQuXG4gKiBJbnZva2VkIHdpdGggKHZhbHVlLCBrZXksIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbCBgaXRlcmF0ZWVgXG4gKiBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBgcmVzdWx0YCBpcyBhIG5ldyBvYmplY3QgY29uc2lzdGluZ1xuICogb2YgZWFjaCBrZXkgZnJvbSBgb2JqYCwgd2l0aCBlYWNoIHRyYW5zZm9ybWVkIHZhbHVlIG9uIHRoZSByaWdodC1oYW5kIHNpZGUuXG4gKiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAqL1xudmFyIG1hcFZhbHVlc1NlcmllcyA9IGRvTGltaXQobWFwVmFsdWVzTGltaXQsIDEpO1xuXG5mdW5jdGlvbiBoYXMob2JqLCBrZXkpIHtcbiAgICByZXR1cm4ga2V5IGluIG9iajtcbn1cblxuLyoqXG4gKiBDYWNoZXMgdGhlIHJlc3VsdHMgb2YgYW4gYXN5bmMgZnVuY3Rpb24uIFdoZW4gY3JlYXRpbmcgYSBoYXNoIHRvIHN0b3JlXG4gKiBmdW5jdGlvbiByZXN1bHRzIGFnYWluc3QsIHRoZSBjYWxsYmFjayBpcyBvbWl0dGVkIGZyb20gdGhlIGhhc2ggYW5kIGFuXG4gKiBvcHRpb25hbCBoYXNoIGZ1bmN0aW9uIGNhbiBiZSB1c2VkLlxuICpcbiAqIElmIG5vIGhhc2ggZnVuY3Rpb24gaXMgc3BlY2lmaWVkLCB0aGUgZmlyc3QgYXJndW1lbnQgaXMgdXNlZCBhcyBhIGhhc2gga2V5LFxuICogd2hpY2ggbWF5IHdvcmsgcmVhc29uYWJseSBpZiBpdCBpcyBhIHN0cmluZyBvciBhIGRhdGEgdHlwZSB0aGF0IGNvbnZlcnRzIHRvIGFcbiAqIGRpc3RpbmN0IHN0cmluZy4gTm90ZSB0aGF0IG9iamVjdHMgYW5kIGFycmF5cyB3aWxsIG5vdCBiZWhhdmUgcmVhc29uYWJseS5cbiAqIE5laXRoZXIgd2lsbCBjYXNlcyB3aGVyZSB0aGUgb3RoZXIgYXJndW1lbnRzIGFyZSBzaWduaWZpY2FudC4gSW4gc3VjaCBjYXNlcyxcbiAqIHNwZWNpZnkgeW91ciBvd24gaGFzaCBmdW5jdGlvbi5cbiAqXG4gKiBUaGUgY2FjaGUgb2YgcmVzdWx0cyBpcyBleHBvc2VkIGFzIHRoZSBgbWVtb2AgcHJvcGVydHkgb2YgdGhlIGZ1bmN0aW9uXG4gKiByZXR1cm5lZCBieSBgbWVtb2l6ZWAuXG4gKlxuICogQG5hbWUgbWVtb2l6ZVxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpVdGlsc1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IFV0aWxcbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gZm4gLSBUaGUgYXN5bmMgZnVuY3Rpb24gdG8gcHJveHkgYW5kIGNhY2hlIHJlc3VsdHMgZnJvbS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGhhc2hlciAtIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIGZvciBnZW5lcmF0aW5nIGEgY3VzdG9tIGhhc2hcbiAqIGZvciBzdG9yaW5nIHJlc3VsdHMuIEl0IGhhcyBhbGwgdGhlIGFyZ3VtZW50cyBhcHBsaWVkIHRvIGl0IGFwYXJ0IGZyb20gdGhlXG4gKiBjYWxsYmFjaywgYW5kIG11c3QgYmUgc3luY2hyb25vdXMuXG4gKiBAcmV0dXJucyB7QXN5bmNGdW5jdGlvbn0gYSBtZW1vaXplZCB2ZXJzaW9uIG9mIGBmbmBcbiAqIEBleGFtcGxlXG4gKlxuICogdmFyIHNsb3dfZm4gPSBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaykge1xuICogICAgIC8vIGRvIHNvbWV0aGluZ1xuICogICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gKiB9O1xuICogdmFyIGZuID0gYXN5bmMubWVtb2l6ZShzbG93X2ZuKTtcbiAqXG4gKiAvLyBmbiBjYW4gbm93IGJlIHVzZWQgYXMgaWYgaXQgd2VyZSBzbG93X2ZuXG4gKiBmbignc29tZSBuYW1lJywgZnVuY3Rpb24oKSB7XG4gKiAgICAgLy8gY2FsbGJhY2tcbiAqIH0pO1xuICovXG5mdW5jdGlvbiBtZW1vaXplKGZuLCBoYXNoZXIpIHtcbiAgICB2YXIgbWVtbyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgdmFyIHF1ZXVlcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgaGFzaGVyID0gaGFzaGVyIHx8IGlkZW50aXR5O1xuICAgIHZhciBfZm4gPSB3cmFwQXN5bmMoZm4pO1xuICAgIHZhciBtZW1vaXplZCA9IGluaXRpYWxQYXJhbXMoZnVuY3Rpb24gbWVtb2l6ZWQoYXJncywgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGtleSA9IGhhc2hlci5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgaWYgKGhhcyhtZW1vLCBrZXkpKSB7XG4gICAgICAgICAgICBzZXRJbW1lZGlhdGUkMShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBtZW1vW2tleV0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaGFzKHF1ZXVlcywga2V5KSkge1xuICAgICAgICAgICAgcXVldWVzW2tleV0ucHVzaChjYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBxdWV1ZXNba2V5XSA9IFtjYWxsYmFja107XG4gICAgICAgICAgICBfZm4uYXBwbHkobnVsbCwgYXJncy5jb25jYXQoZnVuY3Rpb24oLyphcmdzKi8pIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgbWVtb1trZXldID0gYXJncztcbiAgICAgICAgICAgICAgICB2YXIgcSA9IHF1ZXVlc1trZXldO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBxdWV1ZXNba2V5XTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHEubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHFbaV0uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgbWVtb2l6ZWQubWVtbyA9IG1lbW87XG4gICAgbWVtb2l6ZWQudW5tZW1vaXplZCA9IGZuO1xuICAgIHJldHVybiBtZW1vaXplZDtcbn1cblxuLyoqXG4gKiBDYWxscyBgY2FsbGJhY2tgIG9uIGEgbGF0ZXIgbG9vcCBhcm91bmQgdGhlIGV2ZW50IGxvb3AuIEluIE5vZGUuanMgdGhpcyBqdXN0XG4gKiBjYWxscyBgc2V0SW1tZWRpYXRlYC4gIEluIHRoZSBicm93c2VyIGl0IHdpbGwgdXNlIGBzZXRJbW1lZGlhdGVgIGlmXG4gKiBhdmFpbGFibGUsIG90aGVyd2lzZSBgc2V0VGltZW91dChjYWxsYmFjaywgMClgLCB3aGljaCBtZWFucyBvdGhlciBoaWdoZXJcbiAqIHByaW9yaXR5IGV2ZW50cyBtYXkgcHJlY2VkZSB0aGUgZXhlY3V0aW9uIG9mIGBjYWxsYmFja2AuXG4gKlxuICogVGhpcyBpcyB1c2VkIGludGVybmFsbHkgZm9yIGJyb3dzZXItY29tcGF0aWJpbGl0eSBwdXJwb3Nlcy5cbiAqXG4gKiBAbmFtZSBuZXh0VGlja1xuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpVdGlsc1xuICogQG1ldGhvZFxuICogQGFsaWFzIHNldEltbWVkaWF0ZVxuICogQGNhdGVnb3J5IFV0aWxcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgb24gYSBsYXRlciBsb29wIGFyb3VuZFxuICogdGhlIGV2ZW50IGxvb3AuIEludm9rZWQgd2l0aCAoYXJncy4uLikuXG4gKiBAcGFyYW0gey4uLip9IGFyZ3MuLi4gLSBhbnkgbnVtYmVyIG9mIGFkZGl0aW9uYWwgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlXG4gKiBjYWxsYmFjayBvbiB0aGUgbmV4dCB0aWNrLlxuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgY2FsbF9vcmRlciA9IFtdO1xuICogYXN5bmMubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gKiAgICAgY2FsbF9vcmRlci5wdXNoKCd0d28nKTtcbiAqICAgICAvLyBjYWxsX29yZGVyIG5vdyBlcXVhbHMgWydvbmUnLCd0d28nXVxuICogfSk7XG4gKiBjYWxsX29yZGVyLnB1c2goJ29uZScpO1xuICpcbiAqIGFzeW5jLnNldEltbWVkaWF0ZShmdW5jdGlvbiAoYSwgYiwgYykge1xuICogICAgIC8vIGEsIGIsIGFuZCBjIGVxdWFsIDEsIDIsIGFuZCAzXG4gKiB9LCAxLCAyLCAzKTtcbiAqL1xudmFyIF9kZWZlciQxO1xuXG5pZiAoaGFzTmV4dFRpY2spIHtcbiAgICBfZGVmZXIkMSA9IHByb2Nlc3MubmV4dFRpY2s7XG59IGVsc2UgaWYgKGhhc1NldEltbWVkaWF0ZSkge1xuICAgIF9kZWZlciQxID0gc2V0SW1tZWRpYXRlO1xufSBlbHNlIHtcbiAgICBfZGVmZXIkMSA9IGZhbGxiYWNrO1xufVxuXG52YXIgbmV4dFRpY2sgPSB3cmFwKF9kZWZlciQxKTtcblxuZnVuY3Rpb24gX3BhcmFsbGVsKGVhY2hmbiwgdGFza3MsIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBub29wO1xuICAgIHZhciByZXN1bHRzID0gaXNBcnJheUxpa2UodGFza3MpID8gW10gOiB7fTtcblxuICAgIGVhY2hmbih0YXNrcywgZnVuY3Rpb24gKHRhc2ssIGtleSwgY2FsbGJhY2spIHtcbiAgICAgICAgd3JhcEFzeW5jKHRhc2spKGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdHNba2V5XSA9IHJlc3VsdDtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBSdW4gdGhlIGB0YXNrc2AgY29sbGVjdGlvbiBvZiBmdW5jdGlvbnMgaW4gcGFyYWxsZWwsIHdpdGhvdXQgd2FpdGluZyB1bnRpbFxuICogdGhlIHByZXZpb3VzIGZ1bmN0aW9uIGhhcyBjb21wbGV0ZWQuIElmIGFueSBvZiB0aGUgZnVuY3Rpb25zIHBhc3MgYW4gZXJyb3IgdG9cbiAqIGl0cyBjYWxsYmFjaywgdGhlIG1haW4gYGNhbGxiYWNrYCBpcyBpbW1lZGlhdGVseSBjYWxsZWQgd2l0aCB0aGUgdmFsdWUgb2YgdGhlXG4gKiBlcnJvci4gT25jZSB0aGUgYHRhc2tzYCBoYXZlIGNvbXBsZXRlZCwgdGhlIHJlc3VsdHMgYXJlIHBhc3NlZCB0byB0aGUgZmluYWxcbiAqIGBjYWxsYmFja2AgYXMgYW4gYXJyYXkuXG4gKlxuICogKipOb3RlOioqIGBwYXJhbGxlbGAgaXMgYWJvdXQga2lja2luZy1vZmYgSS9PIHRhc2tzIGluIHBhcmFsbGVsLCBub3QgYWJvdXRcbiAqIHBhcmFsbGVsIGV4ZWN1dGlvbiBvZiBjb2RlLiAgSWYgeW91ciB0YXNrcyBkbyBub3QgdXNlIGFueSB0aW1lcnMgb3IgcGVyZm9ybVxuICogYW55IEkvTywgdGhleSB3aWxsIGFjdHVhbGx5IGJlIGV4ZWN1dGVkIGluIHNlcmllcy4gIEFueSBzeW5jaHJvbm91cyBzZXR1cFxuICogc2VjdGlvbnMgZm9yIGVhY2ggdGFzayB3aWxsIGhhcHBlbiBvbmUgYWZ0ZXIgdGhlIG90aGVyLiAgSmF2YVNjcmlwdCByZW1haW5zXG4gKiBzaW5nbGUtdGhyZWFkZWQuXG4gKlxuICogKipIaW50OioqIFVzZSBbYHJlZmxlY3RgXXtAbGluayBtb2R1bGU6VXRpbHMucmVmbGVjdH0gdG8gY29udGludWUgdGhlXG4gKiBleGVjdXRpb24gb2Ygb3RoZXIgdGFza3Mgd2hlbiBhIHRhc2sgZmFpbHMuXG4gKlxuICogSXQgaXMgYWxzbyBwb3NzaWJsZSB0byB1c2UgYW4gb2JqZWN0IGluc3RlYWQgb2YgYW4gYXJyYXkuIEVhY2ggcHJvcGVydHkgd2lsbFxuICogYmUgcnVuIGFzIGEgZnVuY3Rpb24gYW5kIHRoZSByZXN1bHRzIHdpbGwgYmUgcGFzc2VkIHRvIHRoZSBmaW5hbCBgY2FsbGJhY2tgXG4gKiBhcyBhbiBvYmplY3QgaW5zdGVhZCBvZiBhbiBhcnJheS4gVGhpcyBjYW4gYmUgYSBtb3JlIHJlYWRhYmxlIHdheSBvZiBoYW5kbGluZ1xuICogcmVzdWx0cyBmcm9tIHtAbGluayBhc3luYy5wYXJhbGxlbH0uXG4gKlxuICogQG5hbWUgcGFyYWxsZWxcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAqIEBtZXRob2RcbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSB0YXNrcyAtIEEgY29sbGVjdGlvbiBvZlxuICogW2FzeW5jIGZ1bmN0aW9uc117QGxpbmsgQXN5bmNGdW5jdGlvbn0gdG8gcnVuLlxuICogRWFjaCBhc3luYyBmdW5jdGlvbiBjYW4gY29tcGxldGUgd2l0aCBhbnkgbnVtYmVyIG9mIG9wdGlvbmFsIGByZXN1bHRgIHZhbHVlcy5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBbiBvcHRpb25hbCBjYWxsYmFjayB0byBydW4gb25jZSBhbGwgdGhlXG4gKiBmdW5jdGlvbnMgaGF2ZSBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LiBUaGlzIGZ1bmN0aW9uIGdldHMgYSByZXN1bHRzIGFycmF5XG4gKiAob3Igb2JqZWN0KSBjb250YWluaW5nIGFsbCB0aGUgcmVzdWx0IGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIHRhc2sgY2FsbGJhY2tzLlxuICogSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdHMpLlxuICpcbiAqIEBleGFtcGxlXG4gKiBhc3luYy5wYXJhbGxlbChbXG4gKiAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsICdvbmUnKTtcbiAqICAgICAgICAgfSwgMjAwKTtcbiAqICAgICB9LFxuICogICAgIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAndHdvJyk7XG4gKiAgICAgICAgIH0sIDEwMCk7XG4gKiAgICAgfVxuICogXSxcbiAqIC8vIG9wdGlvbmFsIGNhbGxiYWNrXG4gKiBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAqICAgICAvLyB0aGUgcmVzdWx0cyBhcnJheSB3aWxsIGVxdWFsIFsnb25lJywndHdvJ10gZXZlbiB0aG91Z2hcbiAqICAgICAvLyB0aGUgc2Vjb25kIGZ1bmN0aW9uIGhhZCBhIHNob3J0ZXIgdGltZW91dC5cbiAqIH0pO1xuICpcbiAqIC8vIGFuIGV4YW1wbGUgdXNpbmcgYW4gb2JqZWN0IGluc3RlYWQgb2YgYW4gYXJyYXlcbiAqIGFzeW5jLnBhcmFsbGVsKHtcbiAqICAgICBvbmU6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAxKTtcbiAqICAgICAgICAgfSwgMjAwKTtcbiAqICAgICB9LFxuICogICAgIHR3bzogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIDIpO1xuICogICAgICAgICB9LCAxMDApO1xuICogICAgIH1cbiAqIH0sIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICogICAgIC8vIHJlc3VsdHMgaXMgbm93IGVxdWFscyB0bzoge29uZTogMSwgdHdvOiAyfVxuICogfSk7XG4gKi9cbmZ1bmN0aW9uIHBhcmFsbGVsTGltaXQodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgX3BhcmFsbGVsKGVhY2hPZiwgdGFza3MsIGNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBUaGUgc2FtZSBhcyBbYHBhcmFsbGVsYF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnBhcmFsbGVsfSBidXQgcnVucyBhIG1heGltdW0gb2YgYGxpbWl0YCBhc3luYyBvcGVyYXRpb25zIGF0IGFcbiAqIHRpbWUuXG4gKlxuICogQG5hbWUgcGFyYWxsZWxMaW1pdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMucGFyYWxsZWxde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5wYXJhbGxlbH1cbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSB0YXNrcyAtIEEgY29sbGVjdGlvbiBvZlxuICogW2FzeW5jIGZ1bmN0aW9uc117QGxpbmsgQXN5bmNGdW5jdGlvbn0gdG8gcnVuLlxuICogRWFjaCBhc3luYyBmdW5jdGlvbiBjYW4gY29tcGxldGUgd2l0aCBhbnkgbnVtYmVyIG9mIG9wdGlvbmFsIGByZXN1bHRgIHZhbHVlcy5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBbiBvcHRpb25hbCBjYWxsYmFjayB0byBydW4gb25jZSBhbGwgdGhlXG4gKiBmdW5jdGlvbnMgaGF2ZSBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LiBUaGlzIGZ1bmN0aW9uIGdldHMgYSByZXN1bHRzIGFycmF5XG4gKiAob3Igb2JqZWN0KSBjb250YWluaW5nIGFsbCB0aGUgcmVzdWx0IGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIHRhc2sgY2FsbGJhY2tzLlxuICogSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdHMpLlxuICovXG5mdW5jdGlvbiBwYXJhbGxlbExpbWl0JDEodGFza3MsIGxpbWl0LCBjYWxsYmFjaykge1xuICAgIF9wYXJhbGxlbChfZWFjaE9mTGltaXQobGltaXQpLCB0YXNrcywgY2FsbGJhY2spO1xufVxuXG4vKipcbiAqIEEgcXVldWUgb2YgdGFza3MgZm9yIHRoZSB3b3JrZXIgZnVuY3Rpb24gdG8gY29tcGxldGUuXG4gKiBAdHlwZWRlZiB7T2JqZWN0fSBRdWV1ZU9iamVjdFxuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQHByb3BlcnR5IHtGdW5jdGlvbn0gbGVuZ3RoIC0gYSBmdW5jdGlvbiByZXR1cm5pbmcgdGhlIG51bWJlciBvZiBpdGVtc1xuICogd2FpdGluZyB0byBiZSBwcm9jZXNzZWQuIEludm9rZSB3aXRoIGBxdWV1ZS5sZW5ndGgoKWAuXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IHN0YXJ0ZWQgLSBhIGJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIG9yIG5vdCBhbnlcbiAqIGl0ZW1zIGhhdmUgYmVlbiBwdXNoZWQgYW5kIHByb2Nlc3NlZCBieSB0aGUgcXVldWUuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBydW5uaW5nIC0gYSBmdW5jdGlvbiByZXR1cm5pbmcgdGhlIG51bWJlciBvZiBpdGVtc1xuICogY3VycmVudGx5IGJlaW5nIHByb2Nlc3NlZC4gSW52b2tlIHdpdGggYHF1ZXVlLnJ1bm5pbmcoKWAuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSB3b3JrZXJzTGlzdCAtIGEgZnVuY3Rpb24gcmV0dXJuaW5nIHRoZSBhcnJheSBvZiBpdGVtc1xuICogY3VycmVudGx5IGJlaW5nIHByb2Nlc3NlZC4gSW52b2tlIHdpdGggYHF1ZXVlLndvcmtlcnNMaXN0KClgLlxuICogQHByb3BlcnR5IHtGdW5jdGlvbn0gaWRsZSAtIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGZhbHNlIGlmIHRoZXJlIGFyZSBpdGVtc1xuICogd2FpdGluZyBvciBiZWluZyBwcm9jZXNzZWQsIG9yIHRydWUgaWYgbm90LiBJbnZva2Ugd2l0aCBgcXVldWUuaWRsZSgpYC5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBjb25jdXJyZW5jeSAtIGFuIGludGVnZXIgZm9yIGRldGVybWluaW5nIGhvdyBtYW55IGB3b3JrZXJgXG4gKiBmdW5jdGlvbnMgc2hvdWxkIGJlIHJ1biBpbiBwYXJhbGxlbC4gVGhpcyBwcm9wZXJ0eSBjYW4gYmUgY2hhbmdlZCBhZnRlciBhXG4gKiBgcXVldWVgIGlzIGNyZWF0ZWQgdG8gYWx0ZXIgdGhlIGNvbmN1cnJlbmN5IG9uLXRoZS1mbHkuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBwdXNoIC0gYWRkIGEgbmV3IHRhc2sgdG8gdGhlIGBxdWV1ZWAuIENhbGxzIGBjYWxsYmFja2BcbiAqIG9uY2UgdGhlIGB3b3JrZXJgIGhhcyBmaW5pc2hlZCBwcm9jZXNzaW5nIHRoZSB0YXNrLiBJbnN0ZWFkIG9mIGEgc2luZ2xlIHRhc2ssXG4gKiBhIGB0YXNrc2AgYXJyYXkgY2FuIGJlIHN1Ym1pdHRlZC4gVGhlIHJlc3BlY3RpdmUgY2FsbGJhY2sgaXMgdXNlZCBmb3IgZXZlcnlcbiAqIHRhc2sgaW4gdGhlIGxpc3QuIEludm9rZSB3aXRoIGBxdWV1ZS5wdXNoKHRhc2ssIFtjYWxsYmFja10pYCxcbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHVuc2hpZnQgLSBhZGQgYSBuZXcgdGFzayB0byB0aGUgZnJvbnQgb2YgdGhlIGBxdWV1ZWAuXG4gKiBJbnZva2Ugd2l0aCBgcXVldWUudW5zaGlmdCh0YXNrLCBbY2FsbGJhY2tdKWAuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSByZW1vdmUgLSByZW1vdmUgaXRlbXMgZnJvbSB0aGUgcXVldWUgdGhhdCBtYXRjaCBhIHRlc3RcbiAqIGZ1bmN0aW9uLiAgVGhlIHRlc3QgZnVuY3Rpb24gd2lsbCBiZSBwYXNzZWQgYW4gb2JqZWN0IHdpdGggYSBgZGF0YWAgcHJvcGVydHksXG4gKiBhbmQgYSBgcHJpb3JpdHlgIHByb3BlcnR5LCBpZiB0aGlzIGlzIGFcbiAqIFtwcmlvcml0eVF1ZXVlXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cucHJpb3JpdHlRdWV1ZX0gb2JqZWN0LlxuICogSW52b2tlZCB3aXRoIGBxdWV1ZS5yZW1vdmUodGVzdEZuKWAsIHdoZXJlIGB0ZXN0Rm5gIGlzIG9mIHRoZSBmb3JtXG4gKiBgZnVuY3Rpb24gKHtkYXRhLCBwcmlvcml0eX0pIHt9YCBhbmQgcmV0dXJucyBhIEJvb2xlYW4uXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBzYXR1cmF0ZWQgLSBhIGNhbGxiYWNrIHRoYXQgaXMgY2FsbGVkIHdoZW4gdGhlIG51bWJlciBvZlxuICogcnVubmluZyB3b3JrZXJzIGhpdHMgdGhlIGBjb25jdXJyZW5jeWAgbGltaXQsIGFuZCBmdXJ0aGVyIHRhc2tzIHdpbGwgYmVcbiAqIHF1ZXVlZC5cbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHVuc2F0dXJhdGVkIC0gYSBjYWxsYmFjayB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSBudW1iZXJcbiAqIG9mIHJ1bm5pbmcgd29ya2VycyBpcyBsZXNzIHRoYW4gdGhlIGBjb25jdXJyZW5jeWAgJiBgYnVmZmVyYCBsaW1pdHMsIGFuZFxuICogZnVydGhlciB0YXNrcyB3aWxsIG5vdCBiZSBxdWV1ZWQuXG4gKiBAcHJvcGVydHkge251bWJlcn0gYnVmZmVyIC0gQSBtaW5pbXVtIHRocmVzaG9sZCBidWZmZXIgaW4gb3JkZXIgdG8gc2F5IHRoYXRcbiAqIHRoZSBgcXVldWVgIGlzIGB1bnNhdHVyYXRlZGAuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBlbXB0eSAtIGEgY2FsbGJhY2sgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgbGFzdCBpdGVtXG4gKiBmcm9tIHRoZSBgcXVldWVgIGlzIGdpdmVuIHRvIGEgYHdvcmtlcmAuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBkcmFpbiAtIGEgY2FsbGJhY2sgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgbGFzdCBpdGVtXG4gKiBmcm9tIHRoZSBgcXVldWVgIGhhcyByZXR1cm5lZCBmcm9tIHRoZSBgd29ya2VyYC5cbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGVycm9yIC0gYSBjYWxsYmFjayB0aGF0IGlzIGNhbGxlZCB3aGVuIGEgdGFzayBlcnJvcnMuXG4gKiBIYXMgdGhlIHNpZ25hdHVyZSBgZnVuY3Rpb24oZXJyb3IsIHRhc2spYC5cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gcGF1c2VkIC0gYSBib29sZWFuIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIHRoZSBxdWV1ZSBpc1xuICogaW4gYSBwYXVzZWQgc3RhdGUuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBwYXVzZSAtIGEgZnVuY3Rpb24gdGhhdCBwYXVzZXMgdGhlIHByb2Nlc3Npbmcgb2YgdGFza3NcbiAqIHVudGlsIGByZXN1bWUoKWAgaXMgY2FsbGVkLiBJbnZva2Ugd2l0aCBgcXVldWUucGF1c2UoKWAuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSByZXN1bWUgLSBhIGZ1bmN0aW9uIHRoYXQgcmVzdW1lcyB0aGUgcHJvY2Vzc2luZyBvZlxuICogcXVldWVkIHRhc2tzIHdoZW4gdGhlIHF1ZXVlIGlzIHBhdXNlZC4gSW52b2tlIHdpdGggYHF1ZXVlLnJlc3VtZSgpYC5cbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGtpbGwgLSBhIGZ1bmN0aW9uIHRoYXQgcmVtb3ZlcyB0aGUgYGRyYWluYCBjYWxsYmFjayBhbmRcbiAqIGVtcHRpZXMgcmVtYWluaW5nIHRhc2tzIGZyb20gdGhlIHF1ZXVlIGZvcmNpbmcgaXQgdG8gZ28gaWRsZS4gTm8gbW9yZSB0YXNrc1xuICogc2hvdWxkIGJlIHB1c2hlZCB0byB0aGUgcXVldWUgYWZ0ZXIgY2FsbGluZyB0aGlzIGZ1bmN0aW9uLiBJbnZva2Ugd2l0aCBgcXVldWUua2lsbCgpYC5cbiAqL1xuXG4vKipcbiAqIENyZWF0ZXMgYSBgcXVldWVgIG9iamVjdCB3aXRoIHRoZSBzcGVjaWZpZWQgYGNvbmN1cnJlbmN5YC4gVGFza3MgYWRkZWQgdG8gdGhlXG4gKiBgcXVldWVgIGFyZSBwcm9jZXNzZWQgaW4gcGFyYWxsZWwgKHVwIHRvIHRoZSBgY29uY3VycmVuY3lgIGxpbWl0KS4gSWYgYWxsXG4gKiBgd29ya2VyYHMgYXJlIGluIHByb2dyZXNzLCB0aGUgdGFzayBpcyBxdWV1ZWQgdW50aWwgb25lIGJlY29tZXMgYXZhaWxhYmxlLlxuICogT25jZSBhIGB3b3JrZXJgIGNvbXBsZXRlcyBhIGB0YXNrYCwgdGhhdCBgdGFza2AncyBjYWxsYmFjayBpcyBjYWxsZWQuXG4gKlxuICogQG5hbWUgcXVldWVcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAqIEBtZXRob2RcbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gd29ya2VyIC0gQW4gYXN5bmMgZnVuY3Rpb24gZm9yIHByb2Nlc3NpbmcgYSBxdWV1ZWQgdGFzay5cbiAqIElmIHlvdSB3YW50IHRvIGhhbmRsZSBlcnJvcnMgZnJvbSBhbiBpbmRpdmlkdWFsIHRhc2ssIHBhc3MgYSBjYWxsYmFjayB0b1xuICogYHEucHVzaCgpYC4gSW52b2tlZCB3aXRoICh0YXNrLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge251bWJlcn0gW2NvbmN1cnJlbmN5PTFdIC0gQW4gYGludGVnZXJgIGZvciBkZXRlcm1pbmluZyBob3cgbWFueVxuICogYHdvcmtlcmAgZnVuY3Rpb25zIHNob3VsZCBiZSBydW4gaW4gcGFyYWxsZWwuICBJZiBvbWl0dGVkLCB0aGUgY29uY3VycmVuY3lcbiAqIGRlZmF1bHRzIHRvIGAxYC4gIElmIHRoZSBjb25jdXJyZW5jeSBpcyBgMGAsIGFuIGVycm9yIGlzIHRocm93bi5cbiAqIEByZXR1cm5zIHttb2R1bGU6Q29udHJvbEZsb3cuUXVldWVPYmplY3R9IEEgcXVldWUgb2JqZWN0IHRvIG1hbmFnZSB0aGUgdGFza3MuIENhbGxiYWNrcyBjYW5cbiAqIGF0dGFjaGVkIGFzIGNlcnRhaW4gcHJvcGVydGllcyB0byBsaXN0ZW4gZm9yIHNwZWNpZmljIGV2ZW50cyBkdXJpbmcgdGhlXG4gKiBsaWZlY3ljbGUgb2YgdGhlIHF1ZXVlLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBjcmVhdGUgYSBxdWV1ZSBvYmplY3Qgd2l0aCBjb25jdXJyZW5jeSAyXG4gKiB2YXIgcSA9IGFzeW5jLnF1ZXVlKGZ1bmN0aW9uKHRhc2ssIGNhbGxiYWNrKSB7XG4gKiAgICAgY29uc29sZS5sb2coJ2hlbGxvICcgKyB0YXNrLm5hbWUpO1xuICogICAgIGNhbGxiYWNrKCk7XG4gKiB9LCAyKTtcbiAqXG4gKiAvLyBhc3NpZ24gYSBjYWxsYmFja1xuICogcS5kcmFpbiA9IGZ1bmN0aW9uKCkge1xuICogICAgIGNvbnNvbGUubG9nKCdhbGwgaXRlbXMgaGF2ZSBiZWVuIHByb2Nlc3NlZCcpO1xuICogfTtcbiAqXG4gKiAvLyBhZGQgc29tZSBpdGVtcyB0byB0aGUgcXVldWVcbiAqIHEucHVzaCh7bmFtZTogJ2Zvbyd9LCBmdW5jdGlvbihlcnIpIHtcbiAqICAgICBjb25zb2xlLmxvZygnZmluaXNoZWQgcHJvY2Vzc2luZyBmb28nKTtcbiAqIH0pO1xuICogcS5wdXNoKHtuYW1lOiAnYmFyJ30sIGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICBjb25zb2xlLmxvZygnZmluaXNoZWQgcHJvY2Vzc2luZyBiYXInKTtcbiAqIH0pO1xuICpcbiAqIC8vIGFkZCBzb21lIGl0ZW1zIHRvIHRoZSBxdWV1ZSAoYmF0Y2gtd2lzZSlcbiAqIHEucHVzaChbe25hbWU6ICdiYXonfSx7bmFtZTogJ2JheSd9LHtuYW1lOiAnYmF4J31dLCBmdW5jdGlvbihlcnIpIHtcbiAqICAgICBjb25zb2xlLmxvZygnZmluaXNoZWQgcHJvY2Vzc2luZyBpdGVtJyk7XG4gKiB9KTtcbiAqXG4gKiAvLyBhZGQgc29tZSBpdGVtcyB0byB0aGUgZnJvbnQgb2YgdGhlIHF1ZXVlXG4gKiBxLnVuc2hpZnQoe25hbWU6ICdiYXInfSwgZnVuY3Rpb24gKGVycikge1xuICogICAgIGNvbnNvbGUubG9nKCdmaW5pc2hlZCBwcm9jZXNzaW5nIGJhcicpO1xuICogfSk7XG4gKi9cbnZhciBxdWV1ZSQxID0gZnVuY3Rpb24gKHdvcmtlciwgY29uY3VycmVuY3kpIHtcbiAgICB2YXIgX3dvcmtlciA9IHdyYXBBc3luYyh3b3JrZXIpO1xuICAgIHJldHVybiBxdWV1ZShmdW5jdGlvbiAoaXRlbXMsIGNiKSB7XG4gICAgICAgIF93b3JrZXIoaXRlbXNbMF0sIGNiKTtcbiAgICB9LCBjb25jdXJyZW5jeSwgMSk7XG59O1xuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFthc3luYy5xdWV1ZV17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnF1ZXVlfSBvbmx5IHRhc2tzIGFyZSBhc3NpZ25lZCBhIHByaW9yaXR5IGFuZFxuICogY29tcGxldGVkIGluIGFzY2VuZGluZyBwcmlvcml0eSBvcmRlci5cbiAqXG4gKiBAbmFtZSBwcmlvcml0eVF1ZXVlXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5xdWV1ZV17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnF1ZXVlfVxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSB3b3JrZXIgLSBBbiBhc3luYyBmdW5jdGlvbiBmb3IgcHJvY2Vzc2luZyBhIHF1ZXVlZCB0YXNrLlxuICogSWYgeW91IHdhbnQgdG8gaGFuZGxlIGVycm9ycyBmcm9tIGFuIGluZGl2aWR1YWwgdGFzaywgcGFzcyBhIGNhbGxiYWNrIHRvXG4gKiBgcS5wdXNoKClgLlxuICogSW52b2tlZCB3aXRoICh0YXNrLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge251bWJlcn0gY29uY3VycmVuY3kgLSBBbiBgaW50ZWdlcmAgZm9yIGRldGVybWluaW5nIGhvdyBtYW55IGB3b3JrZXJgXG4gKiBmdW5jdGlvbnMgc2hvdWxkIGJlIHJ1biBpbiBwYXJhbGxlbC4gIElmIG9taXR0ZWQsIHRoZSBjb25jdXJyZW5jeSBkZWZhdWx0cyB0b1xuICogYDFgLiAgSWYgdGhlIGNvbmN1cnJlbmN5IGlzIGAwYCwgYW4gZXJyb3IgaXMgdGhyb3duLlxuICogQHJldHVybnMge21vZHVsZTpDb250cm9sRmxvdy5RdWV1ZU9iamVjdH0gQSBwcmlvcml0eVF1ZXVlIG9iamVjdCB0byBtYW5hZ2UgdGhlIHRhc2tzLiBUaGVyZSBhcmUgdHdvXG4gKiBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBxdWV1ZWAgYW5kIGBwcmlvcml0eVF1ZXVlYCBvYmplY3RzOlxuICogKiBgcHVzaCh0YXNrLCBwcmlvcml0eSwgW2NhbGxiYWNrXSlgIC0gYHByaW9yaXR5YCBzaG91bGQgYmUgYSBudW1iZXIuIElmIGFuXG4gKiAgIGFycmF5IG9mIGB0YXNrc2AgaXMgZ2l2ZW4sIGFsbCB0YXNrcyB3aWxsIGJlIGFzc2lnbmVkIHRoZSBzYW1lIHByaW9yaXR5LlxuICogKiBUaGUgYHVuc2hpZnRgIG1ldGhvZCB3YXMgcmVtb3ZlZC5cbiAqL1xudmFyIHByaW9yaXR5UXVldWUgPSBmdW5jdGlvbih3b3JrZXIsIGNvbmN1cnJlbmN5KSB7XG4gICAgLy8gU3RhcnQgd2l0aCBhIG5vcm1hbCBxdWV1ZVxuICAgIHZhciBxID0gcXVldWUkMSh3b3JrZXIsIGNvbmN1cnJlbmN5KTtcblxuICAgIC8vIE92ZXJyaWRlIHB1c2ggdG8gYWNjZXB0IHNlY29uZCBwYXJhbWV0ZXIgcmVwcmVzZW50aW5nIHByaW9yaXR5XG4gICAgcS5wdXNoID0gZnVuY3Rpb24oZGF0YSwgcHJpb3JpdHksIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChjYWxsYmFjayA9PSBudWxsKSBjYWxsYmFjayA9IG5vb3A7XG4gICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndGFzayBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgfVxuICAgICAgICBxLnN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICBpZiAoIWlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBjYWxsIGRyYWluIGltbWVkaWF0ZWx5IGlmIHRoZXJlIGFyZSBubyB0YXNrc1xuICAgICAgICAgICAgcmV0dXJuIHNldEltbWVkaWF0ZSQxKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHEuZHJhaW4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJpb3JpdHkgPSBwcmlvcml0eSB8fCAwO1xuICAgICAgICB2YXIgbmV4dE5vZGUgPSBxLl90YXNrcy5oZWFkO1xuICAgICAgICB3aGlsZSAobmV4dE5vZGUgJiYgcHJpb3JpdHkgPj0gbmV4dE5vZGUucHJpb3JpdHkpIHtcbiAgICAgICAgICAgIG5leHROb2RlID0gbmV4dE5vZGUubmV4dDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gZGF0YS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBpdGVtID0ge1xuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFbaV0sXG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6IHByaW9yaXR5LFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKG5leHROb2RlKSB7XG4gICAgICAgICAgICAgICAgcS5fdGFza3MuaW5zZXJ0QmVmb3JlKG5leHROb2RlLCBpdGVtKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcS5fdGFza3MucHVzaChpdGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzZXRJbW1lZGlhdGUkMShxLnByb2Nlc3MpO1xuICAgIH07XG5cbiAgICAvLyBSZW1vdmUgdW5zaGlmdCBmdW5jdGlvblxuICAgIGRlbGV0ZSBxLnVuc2hpZnQ7XG5cbiAgICByZXR1cm4gcTtcbn07XG5cbi8qKlxuICogUnVucyB0aGUgYHRhc2tzYCBhcnJheSBvZiBmdW5jdGlvbnMgaW4gcGFyYWxsZWwsIHdpdGhvdXQgd2FpdGluZyB1bnRpbCB0aGVcbiAqIHByZXZpb3VzIGZ1bmN0aW9uIGhhcyBjb21wbGV0ZWQuIE9uY2UgYW55IG9mIHRoZSBgdGFza3NgIGNvbXBsZXRlIG9yIHBhc3MgYW5cbiAqIGVycm9yIHRvIGl0cyBjYWxsYmFjaywgdGhlIG1haW4gYGNhbGxiYWNrYCBpcyBpbW1lZGlhdGVseSBjYWxsZWQuIEl0J3NcbiAqIGVxdWl2YWxlbnQgdG8gYFByb21pc2UucmFjZSgpYC5cbiAqXG4gKiBAbmFtZSByYWNlXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge0FycmF5fSB0YXNrcyAtIEFuIGFycmF5IGNvbnRhaW5pbmcgW2FzeW5jIGZ1bmN0aW9uc117QGxpbmsgQXN5bmNGdW5jdGlvbn1cbiAqIHRvIHJ1bi4gRWFjaCBmdW5jdGlvbiBjYW4gY29tcGxldGUgd2l0aCBhbiBvcHRpb25hbCBgcmVzdWx0YCB2YWx1ZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQSBjYWxsYmFjayB0byBydW4gb25jZSBhbnkgb2YgdGhlIGZ1bmN0aW9ucyBoYXZlXG4gKiBjb21wbGV0ZWQuIFRoaXMgZnVuY3Rpb24gZ2V0cyBhbiBlcnJvciBvciByZXN1bHQgZnJvbSB0aGUgZmlyc3QgZnVuY3Rpb24gdGhhdFxuICogY29tcGxldGVkLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAqIEByZXR1cm5zIHVuZGVmaW5lZFxuICogQGV4YW1wbGVcbiAqXG4gKiBhc3luYy5yYWNlKFtcbiAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ29uZScpO1xuICogICAgICAgICB9LCAyMDApO1xuICogICAgIH0sXG4gKiAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsICd0d28nKTtcbiAqICAgICAgICAgfSwgMTAwKTtcbiAqICAgICB9XG4gKiBdLFxuICogLy8gbWFpbiBjYWxsYmFja1xuICogZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAqICAgICAvLyB0aGUgcmVzdWx0IHdpbGwgYmUgZXF1YWwgdG8gJ3R3bycgYXMgaXQgZmluaXNoZXMgZWFybGllclxuICogfSk7XG4gKi9cbmZ1bmN0aW9uIHJhY2UodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBvbmNlKGNhbGxiYWNrIHx8IG5vb3ApO1xuICAgIGlmICghaXNBcnJheSh0YXNrcykpIHJldHVybiBjYWxsYmFjayhuZXcgVHlwZUVycm9yKCdGaXJzdCBhcmd1bWVudCB0byByYWNlIG11c3QgYmUgYW4gYXJyYXkgb2YgZnVuY3Rpb25zJykpO1xuICAgIGlmICghdGFza3MubGVuZ3RoKSByZXR1cm4gY2FsbGJhY2soKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRhc2tzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB3cmFwQXN5bmModGFza3NbaV0pKGNhbGxiYWNrKTtcbiAgICB9XG59XG5cbi8qKlxuICogU2FtZSBhcyBbYHJlZHVjZWBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5yZWR1Y2V9LCBvbmx5IG9wZXJhdGVzIG9uIGBhcnJheWAgaW4gcmV2ZXJzZSBvcmRlci5cbiAqXG4gKiBAbmFtZSByZWR1Y2VSaWdodFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMucmVkdWNlXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMucmVkdWNlfVxuICogQGFsaWFzIGZvbGRyXG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHsqfSBtZW1vIC0gVGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIHJlZHVjdGlvbi5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIGFwcGxpZWQgdG8gZWFjaCBpdGVtIGluIHRoZVxuICogYXJyYXkgdG8gcHJvZHVjZSB0aGUgbmV4dCBzdGVwIGluIHRoZSByZWR1Y3Rpb24uXG4gKiBUaGUgYGl0ZXJhdGVlYCBzaG91bGQgY29tcGxldGUgd2l0aCB0aGUgbmV4dCBzdGF0ZSBvZiB0aGUgcmVkdWN0aW9uLlxuICogSWYgdGhlIGl0ZXJhdGVlIGNvbXBsZXRlIHdpdGggYW4gZXJyb3IsIHRoZSByZWR1Y3Rpb24gaXMgc3RvcHBlZCBhbmQgdGhlXG4gKiBtYWluIGBjYWxsYmFja2AgaXMgaW1tZWRpYXRlbHkgY2FsbGVkIHdpdGggdGhlIGVycm9yLlxuICogSW52b2tlZCB3aXRoIChtZW1vLCBpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC4gUmVzdWx0IGlzIHRoZSByZWR1Y2VkIHZhbHVlLiBJbnZva2VkIHdpdGhcbiAqIChlcnIsIHJlc3VsdCkuXG4gKi9cbmZ1bmN0aW9uIHJlZHVjZVJpZ2h0IChhcnJheSwgbWVtbywgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJldmVyc2VkID0gc2xpY2UoYXJyYXkpLnJldmVyc2UoKTtcbiAgICByZWR1Y2UocmV2ZXJzZWQsIG1lbW8sIGl0ZXJhdGVlLCBjYWxsYmFjayk7XG59XG5cbi8qKlxuICogV3JhcHMgdGhlIGFzeW5jIGZ1bmN0aW9uIGluIGFub3RoZXIgZnVuY3Rpb24gdGhhdCBhbHdheXMgY29tcGxldGVzIHdpdGggYVxuICogcmVzdWx0IG9iamVjdCwgZXZlbiB3aGVuIGl0IGVycm9ycy5cbiAqXG4gKiBUaGUgcmVzdWx0IG9iamVjdCBoYXMgZWl0aGVyIHRoZSBwcm9wZXJ0eSBgZXJyb3JgIG9yIGB2YWx1ZWAuXG4gKlxuICogQG5hbWUgcmVmbGVjdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpVdGlsc1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IFV0aWxcbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gZm4gLSBUaGUgYXN5bmMgZnVuY3Rpb24geW91IHdhbnQgdG8gd3JhcFxuICogQHJldHVybnMge0Z1bmN0aW9ufSAtIEEgZnVuY3Rpb24gdGhhdCBhbHdheXMgcGFzc2VzIG51bGwgdG8gaXQncyBjYWxsYmFjayBhc1xuICogdGhlIGVycm9yLiBUaGUgc2Vjb25kIGFyZ3VtZW50IHRvIHRoZSBjYWxsYmFjayB3aWxsIGJlIGFuIGBvYmplY3RgIHdpdGhcbiAqIGVpdGhlciBhbiBgZXJyb3JgIG9yIGEgYHZhbHVlYCBwcm9wZXJ0eS5cbiAqIEBleGFtcGxlXG4gKlxuICogYXN5bmMucGFyYWxsZWwoW1xuICogICAgIGFzeW5jLnJlZmxlY3QoZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgLy8gZG8gc29tZSBzdHVmZiAuLi5cbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ29uZScpO1xuICogICAgIH0pLFxuICogICAgIGFzeW5jLnJlZmxlY3QoZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgLy8gZG8gc29tZSBtb3JlIHN0dWZmIGJ1dCBlcnJvciAuLi5cbiAqICAgICAgICAgY2FsbGJhY2soJ2JhZCBzdHVmZiBoYXBwZW5lZCcpO1xuICogICAgIH0pLFxuICogICAgIGFzeW5jLnJlZmxlY3QoZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgLy8gZG8gc29tZSBtb3JlIHN0dWZmIC4uLlxuICogICAgICAgICBjYWxsYmFjayhudWxsLCAndHdvJyk7XG4gKiAgICAgfSlcbiAqIF0sXG4gKiAvLyBvcHRpb25hbCBjYWxsYmFja1xuICogZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gKiAgICAgLy8gdmFsdWVzXG4gKiAgICAgLy8gcmVzdWx0c1swXS52YWx1ZSA9ICdvbmUnXG4gKiAgICAgLy8gcmVzdWx0c1sxXS5lcnJvciA9ICdiYWQgc3R1ZmYgaGFwcGVuZWQnXG4gKiAgICAgLy8gcmVzdWx0c1syXS52YWx1ZSA9ICd0d28nXG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gcmVmbGVjdChmbikge1xuICAgIHZhciBfZm4gPSB3cmFwQXN5bmMoZm4pO1xuICAgIHJldHVybiBpbml0aWFsUGFyYW1zKGZ1bmN0aW9uIHJlZmxlY3RPbihhcmdzLCByZWZsZWN0Q2FsbGJhY2spIHtcbiAgICAgICAgYXJncy5wdXNoKGZ1bmN0aW9uIGNhbGxiYWNrKGVycm9yLCBjYkFyZykge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmVmbGVjdENhbGxiYWNrKG51bGwsIHsgZXJyb3I6IGVycm9yIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPD0gMikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGNiQXJnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVmbGVjdENhbGxiYWNrKG51bGwsIHsgdmFsdWU6IHZhbHVlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gX2ZuLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiByZWplY3QkMShlYWNoZm4sIGFyciwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgX2ZpbHRlcihlYWNoZm4sIGFyciwgZnVuY3Rpb24odmFsdWUsIGNiKSB7XG4gICAgICAgIGl0ZXJhdGVlKHZhbHVlLCBmdW5jdGlvbihlcnIsIHYpIHtcbiAgICAgICAgICAgIGNiKGVyciwgIXYpO1xuICAgICAgICB9KTtcbiAgICB9LCBjYWxsYmFjayk7XG59XG5cbi8qKlxuICogVGhlIG9wcG9zaXRlIG9mIFtgZmlsdGVyYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmZpbHRlcn0uIFJlbW92ZXMgdmFsdWVzIHRoYXQgcGFzcyBhbiBgYXN5bmNgIHRydXRoIHRlc3QuXG4gKlxuICogQG5hbWUgcmVqZWN0XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5maWx0ZXJde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5maWx0ZXJ9XG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpblxuICogYGNvbGxgLlxuICogVGhlIHNob3VsZCBjb21wbGV0ZSB3aXRoIGEgYm9vbGVhbiB2YWx1ZSBhcyBpdHMgYHJlc3VsdGAuXG4gKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciBhbGwgdGhlXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0cykuXG4gKiBAZXhhbXBsZVxuICpcbiAqIGFzeW5jLnJlamVjdChbJ2ZpbGUxJywnZmlsZTInLCdmaWxlMyddLCBmdW5jdGlvbihmaWxlUGF0aCwgY2FsbGJhY2spIHtcbiAqICAgICBmcy5hY2Nlc3MoZmlsZVBhdGgsIGZ1bmN0aW9uKGVycikge1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCAhZXJyKVxuICogICAgIH0pO1xuICogfSwgZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gKiAgICAgLy8gcmVzdWx0cyBub3cgZXF1YWxzIGFuIGFycmF5IG9mIG1pc3NpbmcgZmlsZXNcbiAqICAgICBjcmVhdGVGaWxlcyhyZXN1bHRzKTtcbiAqIH0pO1xuICovXG52YXIgcmVqZWN0ID0gZG9QYXJhbGxlbChyZWplY3QkMSk7XG5cbi8qKlxuICogQSBoZWxwZXIgZnVuY3Rpb24gdGhhdCB3cmFwcyBhbiBhcnJheSBvciBhbiBvYmplY3Qgb2YgZnVuY3Rpb25zIHdpdGggYHJlZmxlY3RgLlxuICpcbiAqIEBuYW1lIHJlZmxlY3RBbGxcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6VXRpbHNcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLnJlZmxlY3Rde0BsaW5rIG1vZHVsZTpVdGlscy5yZWZsZWN0fVxuICogQGNhdGVnb3J5IFV0aWxcbiAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fEl0ZXJhYmxlfSB0YXNrcyAtIFRoZSBjb2xsZWN0aW9uIG9mXG4gKiBbYXN5bmMgZnVuY3Rpb25zXXtAbGluayBBc3luY0Z1bmN0aW9ufSB0byB3cmFwIGluIGBhc3luYy5yZWZsZWN0YC5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhbiBhcnJheSBvZiBhc3luYyBmdW5jdGlvbnMsIGVhY2ggd3JhcHBlZCBpblxuICogYGFzeW5jLnJlZmxlY3RgXG4gKiBAZXhhbXBsZVxuICpcbiAqIGxldCB0YXNrcyA9IFtcbiAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ29uZScpO1xuICogICAgICAgICB9LCAyMDApO1xuICogICAgIH0sXG4gKiAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgLy8gZG8gc29tZSBtb3JlIHN0dWZmIGJ1dCBlcnJvciAuLi5cbiAqICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKCdiYWQgc3R1ZmYgaGFwcGVuZWQnKSk7XG4gKiAgICAgfSxcbiAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ3R3bycpO1xuICogICAgICAgICB9LCAxMDApO1xuICogICAgIH1cbiAqIF07XG4gKlxuICogYXN5bmMucGFyYWxsZWwoYXN5bmMucmVmbGVjdEFsbCh0YXNrcyksXG4gKiAvLyBvcHRpb25hbCBjYWxsYmFja1xuICogZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gKiAgICAgLy8gdmFsdWVzXG4gKiAgICAgLy8gcmVzdWx0c1swXS52YWx1ZSA9ICdvbmUnXG4gKiAgICAgLy8gcmVzdWx0c1sxXS5lcnJvciA9IEVycm9yKCdiYWQgc3R1ZmYgaGFwcGVuZWQnKVxuICogICAgIC8vIHJlc3VsdHNbMl0udmFsdWUgPSAndHdvJ1xuICogfSk7XG4gKlxuICogLy8gYW4gZXhhbXBsZSB1c2luZyBhbiBvYmplY3QgaW5zdGVhZCBvZiBhbiBhcnJheVxuICogbGV0IHRhc2tzID0ge1xuICogICAgIG9uZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsICdvbmUnKTtcbiAqICAgICAgICAgfSwgMjAwKTtcbiAqICAgICB9LFxuICogICAgIHR3bzogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgY2FsbGJhY2soJ3R3bycpO1xuICogICAgIH0sXG4gKiAgICAgdGhyZWU6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAndGhyZWUnKTtcbiAqICAgICAgICAgfSwgMTAwKTtcbiAqICAgICB9XG4gKiB9O1xuICpcbiAqIGFzeW5jLnBhcmFsbGVsKGFzeW5jLnJlZmxlY3RBbGwodGFza3MpLFxuICogLy8gb3B0aW9uYWwgY2FsbGJhY2tcbiAqIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICogICAgIC8vIHZhbHVlc1xuICogICAgIC8vIHJlc3VsdHMub25lLnZhbHVlID0gJ29uZSdcbiAqICAgICAvLyByZXN1bHRzLnR3by5lcnJvciA9ICd0d28nXG4gKiAgICAgLy8gcmVzdWx0cy50aHJlZS52YWx1ZSA9ICd0aHJlZSdcbiAqIH0pO1xuICovXG5mdW5jdGlvbiByZWZsZWN0QWxsKHRhc2tzKSB7XG4gICAgdmFyIHJlc3VsdHM7XG4gICAgaWYgKGlzQXJyYXkodGFza3MpKSB7XG4gICAgICAgIHJlc3VsdHMgPSBhcnJheU1hcCh0YXNrcywgcmVmbGVjdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0cyA9IHt9O1xuICAgICAgICBiYXNlRm9yT3duKHRhc2tzLCBmdW5jdGlvbih0YXNrLCBrZXkpIHtcbiAgICAgICAgICAgIHJlc3VsdHNba2V5XSA9IHJlZmxlY3QuY2FsbCh0aGlzLCB0YXNrKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xufVxuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFtgcmVqZWN0YF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLnJlamVjdH0gYnV0IHJ1bnMgYSBtYXhpbXVtIG9mIGBsaW1pdGAgYXN5bmMgb3BlcmF0aW9ucyBhdCBhXG4gKiB0aW1lLlxuICpcbiAqIEBuYW1lIHJlamVjdExpbWl0XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5yZWplY3Rde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5yZWplY3R9XG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtudW1iZXJ9IGxpbWl0IC0gVGhlIG1heGltdW0gbnVtYmVyIG9mIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpblxuICogYGNvbGxgLlxuICogVGhlIHNob3VsZCBjb21wbGV0ZSB3aXRoIGEgYm9vbGVhbiB2YWx1ZSBhcyBpdHMgYHJlc3VsdGAuXG4gKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciBhbGwgdGhlXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0cykuXG4gKi9cbnZhciByZWplY3RMaW1pdCA9IGRvUGFyYWxsZWxMaW1pdChyZWplY3QkMSk7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2ByZWplY3RgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMucmVqZWN0fSBidXQgcnVucyBvbmx5IGEgc2luZ2xlIGFzeW5jIG9wZXJhdGlvbiBhdCBhIHRpbWUuXG4gKlxuICogQG5hbWUgcmVqZWN0U2VyaWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5yZWplY3Rde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5yZWplY3R9XG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpblxuICogYGNvbGxgLlxuICogVGhlIHNob3VsZCBjb21wbGV0ZSB3aXRoIGEgYm9vbGVhbiB2YWx1ZSBhcyBpdHMgYHJlc3VsdGAuXG4gKiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciBhbGwgdGhlXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0cykuXG4gKi9cbnZhciByZWplY3RTZXJpZXMgPSBkb0xpbWl0KHJlamVjdExpbWl0LCAxKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGB2YWx1ZWAuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAyLjQuMFxuICogQGNhdGVnb3J5IFV0aWxcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHJldHVybiBmcm9tIHRoZSBuZXcgZnVuY3Rpb24uXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBjb25zdGFudCBmdW5jdGlvbi5cbiAqIEBleGFtcGxlXG4gKlxuICogdmFyIG9iamVjdHMgPSBfLnRpbWVzKDIsIF8uY29uc3RhbnQoeyAnYSc6IDEgfSkpO1xuICpcbiAqIGNvbnNvbGUubG9nKG9iamVjdHMpO1xuICogLy8gPT4gW3sgJ2EnOiAxIH0sIHsgJ2EnOiAxIH1dXG4gKlxuICogY29uc29sZS5sb2cob2JqZWN0c1swXSA9PT0gb2JqZWN0c1sxXSk7XG4gKiAvLyA9PiB0cnVlXG4gKi9cbmZ1bmN0aW9uIGNvbnN0YW50JDEodmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcbn1cblxuLyoqXG4gKiBBdHRlbXB0cyB0byBnZXQgYSBzdWNjZXNzZnVsIHJlc3BvbnNlIGZyb20gYHRhc2tgIG5vIG1vcmUgdGhhbiBgdGltZXNgIHRpbWVzXG4gKiBiZWZvcmUgcmV0dXJuaW5nIGFuIGVycm9yLiBJZiB0aGUgdGFzayBpcyBzdWNjZXNzZnVsLCB0aGUgYGNhbGxiYWNrYCB3aWxsIGJlXG4gKiBwYXNzZWQgdGhlIHJlc3VsdCBvZiB0aGUgc3VjY2Vzc2Z1bCB0YXNrLiBJZiBhbGwgYXR0ZW1wdHMgZmFpbCwgdGhlIGNhbGxiYWNrXG4gKiB3aWxsIGJlIHBhc3NlZCB0aGUgZXJyb3IgYW5kIHJlc3VsdCAoaWYgYW55KSBvZiB0aGUgZmluYWwgYXR0ZW1wdC5cbiAqXG4gKiBAbmFtZSByZXRyeVxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHNlZSBbYXN5bmMucmV0cnlhYmxlXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cucmV0cnlhYmxlfVxuICogQHBhcmFtIHtPYmplY3R8bnVtYmVyfSBbb3B0cyA9IHt0aW1lczogNSwgaW50ZXJ2YWw6IDB9fCA1XSAtIENhbiBiZSBlaXRoZXIgYW5cbiAqIG9iamVjdCB3aXRoIGB0aW1lc2AgYW5kIGBpbnRlcnZhbGAgb3IgYSBudW1iZXIuXG4gKiAqIGB0aW1lc2AgLSBUaGUgbnVtYmVyIG9mIGF0dGVtcHRzIHRvIG1ha2UgYmVmb3JlIGdpdmluZyB1cC4gIFRoZSBkZWZhdWx0XG4gKiAgIGlzIGA1YC5cbiAqICogYGludGVydmFsYCAtIFRoZSB0aW1lIHRvIHdhaXQgYmV0d2VlbiByZXRyaWVzLCBpbiBtaWxsaXNlY29uZHMuICBUaGVcbiAqICAgZGVmYXVsdCBpcyBgMGAuIFRoZSBpbnRlcnZhbCBtYXkgYWxzbyBiZSBzcGVjaWZpZWQgYXMgYSBmdW5jdGlvbiBvZiB0aGVcbiAqICAgcmV0cnkgY291bnQgKHNlZSBleGFtcGxlKS5cbiAqICogYGVycm9yRmlsdGVyYCAtIEFuIG9wdGlvbmFsIHN5bmNocm9ub3VzIGZ1bmN0aW9uIHRoYXQgaXMgaW52b2tlZCBvblxuICogICBlcnJvbmVvdXMgcmVzdWx0LiBJZiBpdCByZXR1cm5zIGB0cnVlYCB0aGUgcmV0cnkgYXR0ZW1wdHMgd2lsbCBjb250aW51ZTtcbiAqICAgaWYgdGhlIGZ1bmN0aW9uIHJldHVybnMgYGZhbHNlYCB0aGUgcmV0cnkgZmxvdyBpcyBhYm9ydGVkIHdpdGggdGhlIGN1cnJlbnRcbiAqICAgYXR0ZW1wdCdzIGVycm9yIGFuZCByZXN1bHQgYmVpbmcgcmV0dXJuZWQgdG8gdGhlIGZpbmFsIGNhbGxiYWNrLlxuICogICBJbnZva2VkIHdpdGggKGVycikuXG4gKiAqIElmIGBvcHRzYCBpcyBhIG51bWJlciwgdGhlIG51bWJlciBzcGVjaWZpZXMgdGhlIG51bWJlciBvZiB0aW1lcyB0byByZXRyeSxcbiAqICAgd2l0aCB0aGUgZGVmYXVsdCBpbnRlcnZhbCBvZiBgMGAuXG4gKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IHRhc2sgLSBBbiBhc3luYyBmdW5jdGlvbiB0byByZXRyeS5cbiAqIEludm9rZWQgd2l0aCAoY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEFuIG9wdGlvbmFsIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIHRoZVxuICogdGFzayBoYXMgc3VjY2VlZGVkLCBvciBhZnRlciB0aGUgZmluYWwgZmFpbGVkIGF0dGVtcHQuIEl0IHJlY2VpdmVzIHRoZSBgZXJyYFxuICogYW5kIGByZXN1bHRgIGFyZ3VtZW50cyBvZiB0aGUgbGFzdCBhdHRlbXB0IGF0IGNvbXBsZXRpbmcgdGhlIGB0YXNrYC4gSW52b2tlZFxuICogd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIFRoZSBgcmV0cnlgIGZ1bmN0aW9uIGNhbiBiZSB1c2VkIGFzIGEgc3RhbmQtYWxvbmUgY29udHJvbCBmbG93IGJ5IHBhc3NpbmdcbiAqIC8vIGEgY2FsbGJhY2ssIGFzIHNob3duIGJlbG93OlxuICpcbiAqIC8vIHRyeSBjYWxsaW5nIGFwaU1ldGhvZCAzIHRpbWVzXG4gKiBhc3luYy5yZXRyeSgzLCBhcGlNZXRob2QsIGZ1bmN0aW9uKGVyciwgcmVzdWx0KSB7XG4gKiAgICAgLy8gZG8gc29tZXRoaW5nIHdpdGggdGhlIHJlc3VsdFxuICogfSk7XG4gKlxuICogLy8gdHJ5IGNhbGxpbmcgYXBpTWV0aG9kIDMgdGltZXMsIHdhaXRpbmcgMjAwIG1zIGJldHdlZW4gZWFjaCByZXRyeVxuICogYXN5bmMucmV0cnkoe3RpbWVzOiAzLCBpbnRlcnZhbDogMjAwfSwgYXBpTWV0aG9kLCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIGRvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRcbiAqIH0pO1xuICpcbiAqIC8vIHRyeSBjYWxsaW5nIGFwaU1ldGhvZCAxMCB0aW1lcyB3aXRoIGV4cG9uZW50aWFsIGJhY2tvZmZcbiAqIC8vIChpLmUuIGludGVydmFscyBvZiAxMDAsIDIwMCwgNDAwLCA4MDAsIDE2MDAsIC4uLiBtaWxsaXNlY29uZHMpXG4gKiBhc3luYy5yZXRyeSh7XG4gKiAgIHRpbWVzOiAxMCxcbiAqICAgaW50ZXJ2YWw6IGZ1bmN0aW9uKHJldHJ5Q291bnQpIHtcbiAqICAgICByZXR1cm4gNTAgKiBNYXRoLnBvdygyLCByZXRyeUNvdW50KTtcbiAqICAgfVxuICogfSwgYXBpTWV0aG9kLCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIGRvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRcbiAqIH0pO1xuICpcbiAqIC8vIHRyeSBjYWxsaW5nIGFwaU1ldGhvZCB0aGUgZGVmYXVsdCA1IHRpbWVzIG5vIGRlbGF5IGJldHdlZW4gZWFjaCByZXRyeVxuICogYXN5bmMucmV0cnkoYXBpTWV0aG9kLCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIGRvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRcbiAqIH0pO1xuICpcbiAqIC8vIHRyeSBjYWxsaW5nIGFwaU1ldGhvZCBvbmx5IHdoZW4gZXJyb3IgY29uZGl0aW9uIHNhdGlzZmllcywgYWxsIG90aGVyXG4gKiAvLyBlcnJvcnMgd2lsbCBhYm9ydCB0aGUgcmV0cnkgY29udHJvbCBmbG93IGFuZCByZXR1cm4gdG8gZmluYWwgY2FsbGJhY2tcbiAqIGFzeW5jLnJldHJ5KHtcbiAqICAgZXJyb3JGaWx0ZXI6IGZ1bmN0aW9uKGVycikge1xuICogICAgIHJldHVybiBlcnIubWVzc2FnZSA9PT0gJ1RlbXBvcmFyeSBlcnJvcic7IC8vIG9ubHkgcmV0cnkgb24gYSBzcGVjaWZpYyBlcnJvclxuICogICB9XG4gKiB9LCBhcGlNZXRob2QsIGZ1bmN0aW9uKGVyciwgcmVzdWx0KSB7XG4gKiAgICAgLy8gZG8gc29tZXRoaW5nIHdpdGggdGhlIHJlc3VsdFxuICogfSk7XG4gKlxuICogLy8gSXQgY2FuIGFsc28gYmUgZW1iZWRkZWQgd2l0aGluIG90aGVyIGNvbnRyb2wgZmxvdyBmdW5jdGlvbnMgdG8gcmV0cnlcbiAqIC8vIGluZGl2aWR1YWwgbWV0aG9kcyB0aGF0IGFyZSBub3QgYXMgcmVsaWFibGUsIGxpa2UgdGhpczpcbiAqIGFzeW5jLmF1dG8oe1xuICogICAgIHVzZXJzOiBhcGkuZ2V0VXNlcnMuYmluZChhcGkpLFxuICogICAgIHBheW1lbnRzOiBhc3luYy5yZXRyeWFibGUoMywgYXBpLmdldFBheW1lbnRzLmJpbmQoYXBpKSlcbiAqIH0sIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICogICAgIC8vIGRvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRzXG4gKiB9KTtcbiAqXG4gKi9cbmZ1bmN0aW9uIHJldHJ5KG9wdHMsIHRhc2ssIGNhbGxiYWNrKSB7XG4gICAgdmFyIERFRkFVTFRfVElNRVMgPSA1O1xuICAgIHZhciBERUZBVUxUX0lOVEVSVkFMID0gMDtcblxuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICB0aW1lczogREVGQVVMVF9USU1FUyxcbiAgICAgICAgaW50ZXJ2YWxGdW5jOiBjb25zdGFudCQxKERFRkFVTFRfSU5URVJWQUwpXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHBhcnNlVGltZXMoYWNjLCB0KSB7XG4gICAgICAgIGlmICh0eXBlb2YgdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGFjYy50aW1lcyA9ICt0LnRpbWVzIHx8IERFRkFVTFRfVElNRVM7XG5cbiAgICAgICAgICAgIGFjYy5pbnRlcnZhbEZ1bmMgPSB0eXBlb2YgdC5pbnRlcnZhbCA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgICAgICAgICAgdC5pbnRlcnZhbCA6XG4gICAgICAgICAgICAgICAgY29uc3RhbnQkMSgrdC5pbnRlcnZhbCB8fCBERUZBVUxUX0lOVEVSVkFMKTtcblxuICAgICAgICAgICAgYWNjLmVycm9yRmlsdGVyID0gdC5lcnJvckZpbHRlcjtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdCA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBhY2MudGltZXMgPSArdCB8fCBERUZBVUxUX1RJTUVTO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBhcmd1bWVudHMgZm9yIGFzeW5jLnJldHJ5XCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzICYmIHR5cGVvZiBvcHRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGFzayB8fCBub29wO1xuICAgICAgICB0YXNrID0gb3B0cztcbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXJzZVRpbWVzKG9wdGlvbnMsIG9wdHMpO1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IG5vb3A7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB0YXNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgYXJndW1lbnRzIGZvciBhc3luYy5yZXRyeVwiKTtcbiAgICB9XG5cbiAgICB2YXIgX3Rhc2sgPSB3cmFwQXN5bmModGFzayk7XG5cbiAgICB2YXIgYXR0ZW1wdCA9IDE7XG4gICAgZnVuY3Rpb24gcmV0cnlBdHRlbXB0KCkge1xuICAgICAgICBfdGFzayhmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIgJiYgYXR0ZW1wdCsrIDwgb3B0aW9ucy50aW1lcyAmJlxuICAgICAgICAgICAgICAgICh0eXBlb2Ygb3B0aW9ucy5lcnJvckZpbHRlciAhPSAnZnVuY3Rpb24nIHx8XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZXJyb3JGaWx0ZXIoZXJyKSkpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHJldHJ5QXR0ZW1wdCwgb3B0aW9ucy5pbnRlcnZhbEZ1bmMoYXR0ZW1wdCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZXRyeUF0dGVtcHQoKTtcbn1cblxuLyoqXG4gKiBBIGNsb3NlIHJlbGF0aXZlIG9mIFtgcmV0cnlgXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cucmV0cnl9LiAgVGhpcyBtZXRob2RcbiAqIHdyYXBzIGEgdGFzayBhbmQgbWFrZXMgaXQgcmV0cnlhYmxlLCByYXRoZXIgdGhhbiBpbW1lZGlhdGVseSBjYWxsaW5nIGl0XG4gKiB3aXRoIHJldHJpZXMuXG4gKlxuICogQG5hbWUgcmV0cnlhYmxlXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5yZXRyeV17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnJldHJ5fVxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHtPYmplY3R8bnVtYmVyfSBbb3B0cyA9IHt0aW1lczogNSwgaW50ZXJ2YWw6IDB9fCA1XSAtIG9wdGlvbmFsXG4gKiBvcHRpb25zLCBleGFjdGx5IHRoZSBzYW1lIGFzIGZyb20gYHJldHJ5YFxuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSB0YXNrIC0gdGhlIGFzeW5jaHJvbm91cyBmdW5jdGlvbiB0byB3cmFwLlxuICogVGhpcyBmdW5jdGlvbiB3aWxsIGJlIHBhc3NlZCBhbnkgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgcmV0dXJuZWQgd3JhcHBlci5cbiAqIEludm9rZWQgd2l0aCAoLi4uYXJncywgY2FsbGJhY2spLlxuICogQHJldHVybnMge0FzeW5jRnVuY3Rpb259IFRoZSB3cmFwcGVkIGZ1bmN0aW9uLCB3aGljaCB3aGVuIGludm9rZWQsIHdpbGxcbiAqIHJldHJ5IG9uIGFuIGVycm9yLCBiYXNlZCBvbiB0aGUgcGFyYW1ldGVycyBzcGVjaWZpZWQgaW4gYG9wdHNgLlxuICogVGhpcyBmdW5jdGlvbiB3aWxsIGFjY2VwdCB0aGUgc2FtZSBwYXJhbWV0ZXJzIGFzIGB0YXNrYC5cbiAqIEBleGFtcGxlXG4gKlxuICogYXN5bmMuYXV0byh7XG4gKiAgICAgZGVwMTogYXN5bmMucmV0cnlhYmxlKDMsIGdldEZyb21GbGFreVNlcnZpY2UpLFxuICogICAgIHByb2Nlc3M6IFtcImRlcDFcIiwgYXN5bmMucmV0cnlhYmxlKDMsIGZ1bmN0aW9uIChyZXN1bHRzLCBjYikge1xuICogICAgICAgICBtYXliZVByb2Nlc3NEYXRhKHJlc3VsdHMuZGVwMSwgY2IpO1xuICogICAgIH0pXVxuICogfSwgY2FsbGJhY2spO1xuICovXG52YXIgcmV0cnlhYmxlID0gZnVuY3Rpb24gKG9wdHMsIHRhc2spIHtcbiAgICBpZiAoIXRhc2spIHtcbiAgICAgICAgdGFzayA9IG9wdHM7XG4gICAgICAgIG9wdHMgPSBudWxsO1xuICAgIH1cbiAgICB2YXIgX3Rhc2sgPSB3cmFwQXN5bmModGFzayk7XG4gICAgcmV0dXJuIGluaXRpYWxQYXJhbXMoZnVuY3Rpb24gKGFyZ3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGZ1bmN0aW9uIHRhc2tGbihjYikge1xuICAgICAgICAgICAgX3Rhc2suYXBwbHkobnVsbCwgYXJncy5jb25jYXQoY2IpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRzKSByZXRyeShvcHRzLCB0YXNrRm4sIGNhbGxiYWNrKTtcbiAgICAgICAgZWxzZSByZXRyeSh0YXNrRm4sIGNhbGxiYWNrKTtcblxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBSdW4gdGhlIGZ1bmN0aW9ucyBpbiB0aGUgYHRhc2tzYCBjb2xsZWN0aW9uIGluIHNlcmllcywgZWFjaCBvbmUgcnVubmluZyBvbmNlXG4gKiB0aGUgcHJldmlvdXMgZnVuY3Rpb24gaGFzIGNvbXBsZXRlZC4gSWYgYW55IGZ1bmN0aW9ucyBpbiB0aGUgc2VyaWVzIHBhc3MgYW5cbiAqIGVycm9yIHRvIGl0cyBjYWxsYmFjaywgbm8gbW9yZSBmdW5jdGlvbnMgYXJlIHJ1biwgYW5kIGBjYWxsYmFja2AgaXNcbiAqIGltbWVkaWF0ZWx5IGNhbGxlZCB3aXRoIHRoZSB2YWx1ZSBvZiB0aGUgZXJyb3IuIE90aGVyd2lzZSwgYGNhbGxiYWNrYFxuICogcmVjZWl2ZXMgYW4gYXJyYXkgb2YgcmVzdWx0cyB3aGVuIGB0YXNrc2AgaGF2ZSBjb21wbGV0ZWQuXG4gKlxuICogSXQgaXMgYWxzbyBwb3NzaWJsZSB0byB1c2UgYW4gb2JqZWN0IGluc3RlYWQgb2YgYW4gYXJyYXkuIEVhY2ggcHJvcGVydHkgd2lsbFxuICogYmUgcnVuIGFzIGEgZnVuY3Rpb24sIGFuZCB0aGUgcmVzdWx0cyB3aWxsIGJlIHBhc3NlZCB0byB0aGUgZmluYWwgYGNhbGxiYWNrYFxuICogYXMgYW4gb2JqZWN0IGluc3RlYWQgb2YgYW4gYXJyYXkuIFRoaXMgY2FuIGJlIGEgbW9yZSByZWFkYWJsZSB3YXkgb2YgaGFuZGxpbmdcbiAqICByZXN1bHRzIGZyb20ge0BsaW5rIGFzeW5jLnNlcmllc30uXG4gKlxuICogKipOb3RlKiogdGhhdCB3aGlsZSBtYW55IGltcGxlbWVudGF0aW9ucyBwcmVzZXJ2ZSB0aGUgb3JkZXIgb2Ygb2JqZWN0XG4gKiBwcm9wZXJ0aWVzLCB0aGUgW0VDTUFTY3JpcHQgTGFuZ3VhZ2UgU3BlY2lmaWNhdGlvbl0oaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzUuMS8jc2VjLTguNilcbiAqIGV4cGxpY2l0bHkgc3RhdGVzIHRoYXRcbiAqXG4gKiA+IFRoZSBtZWNoYW5pY3MgYW5kIG9yZGVyIG9mIGVudW1lcmF0aW5nIHRoZSBwcm9wZXJ0aWVzIGlzIG5vdCBzcGVjaWZpZWQuXG4gKlxuICogU28gaWYgeW91IHJlbHkgb24gdGhlIG9yZGVyIGluIHdoaWNoIHlvdXIgc2VyaWVzIG9mIGZ1bmN0aW9ucyBhcmUgZXhlY3V0ZWQsXG4gKiBhbmQgd2FudCB0aGlzIHRvIHdvcmsgb24gYWxsIHBsYXRmb3JtcywgY29uc2lkZXIgdXNpbmcgYW4gYXJyYXkuXG4gKlxuICogQG5hbWUgc2VyaWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gdGFza3MgLSBBIGNvbGxlY3Rpb24gY29udGFpbmluZ1xuICogW2FzeW5jIGZ1bmN0aW9uc117QGxpbmsgQXN5bmNGdW5jdGlvbn0gdG8gcnVuIGluIHNlcmllcy5cbiAqIEVhY2ggZnVuY3Rpb24gY2FuIGNvbXBsZXRlIHdpdGggYW55IG51bWJlciBvZiBvcHRpb25hbCBgcmVzdWx0YCB2YWx1ZXMuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQW4gb3B0aW9uYWwgY2FsbGJhY2sgdG8gcnVuIG9uY2UgYWxsIHRoZVxuICogZnVuY3Rpb25zIGhhdmUgY29tcGxldGVkLiBUaGlzIGZ1bmN0aW9uIGdldHMgYSByZXN1bHRzIGFycmF5IChvciBvYmplY3QpXG4gKiBjb250YWluaW5nIGFsbCB0aGUgcmVzdWx0IGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIGB0YXNrYCBjYWxsYmFja3MuIEludm9rZWRcbiAqIHdpdGggKGVyciwgcmVzdWx0KS5cbiAqIEBleGFtcGxlXG4gKiBhc3luYy5zZXJpZXMoW1xuICogICAgIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIC8vIGRvIHNvbWUgc3R1ZmYgLi4uXG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsICdvbmUnKTtcbiAqICAgICB9LFxuICogICAgIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIC8vIGRvIHNvbWUgbW9yZSBzdHVmZiAuLi5cbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ3R3bycpO1xuICogICAgIH1cbiAqIF0sXG4gKiAvLyBvcHRpb25hbCBjYWxsYmFja1xuICogZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gKiAgICAgLy8gcmVzdWx0cyBpcyBub3cgZXF1YWwgdG8gWydvbmUnLCAndHdvJ11cbiAqIH0pO1xuICpcbiAqIGFzeW5jLnNlcmllcyh7XG4gKiAgICAgb25lOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgMSk7XG4gKiAgICAgICAgIH0sIDIwMCk7XG4gKiAgICAgfSxcbiAqICAgICB0d286IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIDIpO1xuICogICAgICAgICB9LCAxMDApO1xuICogICAgIH1cbiAqIH0sIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICogICAgIC8vIHJlc3VsdHMgaXMgbm93IGVxdWFsIHRvOiB7b25lOiAxLCB0d286IDJ9XG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gc2VyaWVzKHRhc2tzLCBjYWxsYmFjaykge1xuICAgIF9wYXJhbGxlbChlYWNoT2ZTZXJpZXMsIHRhc2tzLCBjYWxsYmFjayk7XG59XG5cbi8qKlxuICogUmV0dXJucyBgdHJ1ZWAgaWYgYXQgbGVhc3Qgb25lIGVsZW1lbnQgaW4gdGhlIGBjb2xsYCBzYXRpc2ZpZXMgYW4gYXN5bmMgdGVzdC5cbiAqIElmIGFueSBpdGVyYXRlZSBjYWxsIHJldHVybnMgYHRydWVgLCB0aGUgbWFpbiBgY2FsbGJhY2tgIGlzIGltbWVkaWF0ZWx5XG4gKiBjYWxsZWQuXG4gKlxuICogQG5hbWUgc29tZVxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQGFsaWFzIGFueVxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbVxuICogaW4gdGhlIGNvbGxlY3Rpb25zIGluIHBhcmFsbGVsLlxuICogVGhlIGl0ZXJhdGVlIHNob3VsZCBjb21wbGV0ZSB3aXRoIGEgYm9vbGVhbiBgcmVzdWx0YCB2YWx1ZS5cbiAqIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFzIHNvb24gYXMgYW55XG4gKiBpdGVyYXRlZSByZXR1cm5zIGB0cnVlYCwgb3IgYWZ0ZXIgYWxsIHRoZSBpdGVyYXRlZSBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC5cbiAqIFJlc3VsdCB3aWxsIGJlIGVpdGhlciBgdHJ1ZWAgb3IgYGZhbHNlYCBkZXBlbmRpbmcgb24gdGhlIHZhbHVlcyBvZiB0aGUgYXN5bmNcbiAqIHRlc3RzLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAqIEBleGFtcGxlXG4gKlxuICogYXN5bmMuc29tZShbJ2ZpbGUxJywnZmlsZTInLCdmaWxlMyddLCBmdW5jdGlvbihmaWxlUGF0aCwgY2FsbGJhY2spIHtcbiAqICAgICBmcy5hY2Nlc3MoZmlsZVBhdGgsIGZ1bmN0aW9uKGVycikge1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCAhZXJyKVxuICogICAgIH0pO1xuICogfSwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAqICAgICAvLyBpZiByZXN1bHQgaXMgdHJ1ZSB0aGVuIGF0IGxlYXN0IG9uZSBvZiB0aGUgZmlsZXMgZXhpc3RzXG4gKiB9KTtcbiAqL1xudmFyIHNvbWUgPSBkb1BhcmFsbGVsKF9jcmVhdGVUZXN0ZXIoQm9vbGVhbiwgaWRlbnRpdHkpKTtcblxuLyoqXG4gKiBUaGUgc2FtZSBhcyBbYHNvbWVgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuc29tZX0gYnV0IHJ1bnMgYSBtYXhpbXVtIG9mIGBsaW1pdGAgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gKlxuICogQG5hbWUgc29tZUxpbWl0XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5zb21lXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuc29tZX1cbiAqIEBhbGlhcyBhbnlMaW1pdFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbVxuICogaW4gdGhlIGNvbGxlY3Rpb25zIGluIHBhcmFsbGVsLlxuICogVGhlIGl0ZXJhdGVlIHNob3VsZCBjb21wbGV0ZSB3aXRoIGEgYm9vbGVhbiBgcmVzdWx0YCB2YWx1ZS5cbiAqIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFzIHNvb24gYXMgYW55XG4gKiBpdGVyYXRlZSByZXR1cm5zIGB0cnVlYCwgb3IgYWZ0ZXIgYWxsIHRoZSBpdGVyYXRlZSBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC5cbiAqIFJlc3VsdCB3aWxsIGJlIGVpdGhlciBgdHJ1ZWAgb3IgYGZhbHNlYCBkZXBlbmRpbmcgb24gdGhlIHZhbHVlcyBvZiB0aGUgYXN5bmNcbiAqIHRlc3RzLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAqL1xudmFyIHNvbWVMaW1pdCA9IGRvUGFyYWxsZWxMaW1pdChfY3JlYXRlVGVzdGVyKEJvb2xlYW4sIGlkZW50aXR5KSk7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2Bzb21lYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLnNvbWV9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAqXG4gKiBAbmFtZSBzb21lU2VyaWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5zb21lXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuc29tZX1cbiAqIEBhbGlhcyBhbnlTZXJpZXNcbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQW4gYXN5bmMgdHJ1dGggdGVzdCB0byBhcHBseSB0byBlYWNoIGl0ZW1cbiAqIGluIHRoZSBjb2xsZWN0aW9ucyBpbiBzZXJpZXMuXG4gKiBUaGUgaXRlcmF0ZWUgc2hvdWxkIGNvbXBsZXRlIHdpdGggYSBib29sZWFuIGByZXN1bHRgIHZhbHVlLlxuICogSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYXMgc29vbiBhcyBhbnlcbiAqIGl0ZXJhdGVlIHJldHVybnMgYHRydWVgLCBvciBhZnRlciBhbGwgdGhlIGl0ZXJhdGVlIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLlxuICogUmVzdWx0IHdpbGwgYmUgZWl0aGVyIGB0cnVlYCBvciBgZmFsc2VgIGRlcGVuZGluZyBvbiB0aGUgdmFsdWVzIG9mIHRoZSBhc3luY1xuICogdGVzdHMuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHQpLlxuICovXG52YXIgc29tZVNlcmllcyA9IGRvTGltaXQoc29tZUxpbWl0LCAxKTtcblxuLyoqXG4gKiBTb3J0cyBhIGxpc3QgYnkgdGhlIHJlc3VsdHMgb2YgcnVubmluZyBlYWNoIGBjb2xsYCB2YWx1ZSB0aHJvdWdoIGFuIGFzeW5jXG4gKiBgaXRlcmF0ZWVgLlxuICpcbiAqIEBuYW1lIHNvcnRCeVxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW5cbiAqIGBjb2xsYC5cbiAqIFRoZSBpdGVyYXRlZSBzaG91bGQgY29tcGxldGUgd2l0aCBhIHZhbHVlIHRvIHVzZSBhcyB0aGUgc29ydCBjcml0ZXJpYSBhc1xuICogaXRzIGByZXN1bHRgLlxuICogSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gUmVzdWx0cyBpcyB0aGUgaXRlbXNcbiAqIGZyb20gdGhlIG9yaWdpbmFsIGBjb2xsYCBzb3J0ZWQgYnkgdGhlIHZhbHVlcyByZXR1cm5lZCBieSB0aGUgYGl0ZXJhdGVlYFxuICogY2FsbHMuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAqIEBleGFtcGxlXG4gKlxuICogYXN5bmMuc29ydEJ5KFsnZmlsZTEnLCdmaWxlMicsJ2ZpbGUzJ10sIGZ1bmN0aW9uKGZpbGUsIGNhbGxiYWNrKSB7XG4gKiAgICAgZnMuc3RhdChmaWxlLCBmdW5jdGlvbihlcnIsIHN0YXRzKSB7XG4gKiAgICAgICAgIGNhbGxiYWNrKGVyciwgc3RhdHMubXRpbWUpO1xuICogICAgIH0pO1xuICogfSwgZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gKiAgICAgLy8gcmVzdWx0cyBpcyBub3cgdGhlIG9yaWdpbmFsIGFycmF5IG9mIGZpbGVzIHNvcnRlZCBieVxuICogICAgIC8vIG1vZGlmaWVkIGRhdGVcbiAqIH0pO1xuICpcbiAqIC8vIEJ5IG1vZGlmeWluZyB0aGUgY2FsbGJhY2sgcGFyYW1ldGVyIHRoZVxuICogLy8gc29ydGluZyBvcmRlciBjYW4gYmUgaW5mbHVlbmNlZDpcbiAqXG4gKiAvLyBhc2NlbmRpbmcgb3JkZXJcbiAqIGFzeW5jLnNvcnRCeShbMSw5LDMsNV0sIGZ1bmN0aW9uKHgsIGNhbGxiYWNrKSB7XG4gKiAgICAgY2FsbGJhY2sobnVsbCwgeCk7XG4gKiB9LCBmdW5jdGlvbihlcnIscmVzdWx0KSB7XG4gKiAgICAgLy8gcmVzdWx0IGNhbGxiYWNrXG4gKiB9KTtcbiAqXG4gKiAvLyBkZXNjZW5kaW5nIG9yZGVyXG4gKiBhc3luYy5zb3J0QnkoWzEsOSwzLDVdLCBmdW5jdGlvbih4LCBjYWxsYmFjaykge1xuICogICAgIGNhbGxiYWNrKG51bGwsIHgqLTEpOyAgICAvLzwtIHgqLTEgaW5zdGVhZCBvZiB4LCB0dXJucyB0aGUgb3JkZXIgYXJvdW5kXG4gKiB9LCBmdW5jdGlvbihlcnIscmVzdWx0KSB7XG4gKiAgICAgLy8gcmVzdWx0IGNhbGxiYWNrXG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gc29ydEJ5IChjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgX2l0ZXJhdGVlID0gd3JhcEFzeW5jKGl0ZXJhdGVlKTtcbiAgICBtYXAoY29sbCwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9pdGVyYXRlZSh4LCBmdW5jdGlvbiAoZXJyLCBjcml0ZXJpYSkge1xuICAgICAgICAgICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7dmFsdWU6IHgsIGNyaXRlcmlhOiBjcml0ZXJpYX0pO1xuICAgICAgICB9KTtcbiAgICB9LCBmdW5jdGlvbiAoZXJyLCByZXN1bHRzKSB7XG4gICAgICAgIGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICBjYWxsYmFjayhudWxsLCBhcnJheU1hcChyZXN1bHRzLnNvcnQoY29tcGFyYXRvciksIGJhc2VQcm9wZXJ0eSgndmFsdWUnKSkpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gY29tcGFyYXRvcihsZWZ0LCByaWdodCkge1xuICAgICAgICB2YXIgYSA9IGxlZnQuY3JpdGVyaWEsIGIgPSByaWdodC5jcml0ZXJpYTtcbiAgICAgICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwO1xuICAgIH1cbn1cblxuLyoqXG4gKiBTZXRzIGEgdGltZSBsaW1pdCBvbiBhbiBhc3luY2hyb25vdXMgZnVuY3Rpb24uIElmIHRoZSBmdW5jdGlvbiBkb2VzIG5vdCBjYWxsXG4gKiBpdHMgY2FsbGJhY2sgd2l0aGluIHRoZSBzcGVjaWZpZWQgbWlsbGlzZWNvbmRzLCBpdCB3aWxsIGJlIGNhbGxlZCB3aXRoIGFcbiAqIHRpbWVvdXQgZXJyb3IuIFRoZSBjb2RlIHByb3BlcnR5IGZvciB0aGUgZXJyb3Igb2JqZWN0IHdpbGwgYmUgYCdFVElNRURPVVQnYC5cbiAqXG4gKiBAbmFtZSB0aW1lb3V0XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBhc3luY0ZuIC0gVGhlIGFzeW5jIGZ1bmN0aW9uIHRvIGxpbWl0IGluIHRpbWUuXG4gKiBAcGFyYW0ge251bWJlcn0gbWlsbGlzZWNvbmRzIC0gVGhlIHNwZWNpZmllZCB0aW1lIGxpbWl0LlxuICogQHBhcmFtIHsqfSBbaW5mb10gLSBBbnkgdmFyaWFibGUgeW91IHdhbnQgYXR0YWNoZWQgKGBzdHJpbmdgLCBgb2JqZWN0YCwgZXRjKVxuICogdG8gdGltZW91dCBFcnJvciBmb3IgbW9yZSBpbmZvcm1hdGlvbi4uXG4gKiBAcmV0dXJucyB7QXN5bmNGdW5jdGlvbn0gUmV0dXJucyBhIHdyYXBwZWQgZnVuY3Rpb24gdGhhdCBjYW4gYmUgdXNlZCB3aXRoIGFueVxuICogb2YgdGhlIGNvbnRyb2wgZmxvdyBmdW5jdGlvbnMuXG4gKiBJbnZva2UgdGhpcyBmdW5jdGlvbiB3aXRoIHRoZSBzYW1lIHBhcmFtZXRlcnMgYXMgeW91IHdvdWxkIGBhc3luY0Z1bmNgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBmdW5jdGlvbiBteUZ1bmN0aW9uKGZvbywgY2FsbGJhY2spIHtcbiAqICAgICBkb0FzeW5jVGFzayhmb28sIGZ1bmN0aW9uKGVyciwgZGF0YSkge1xuICogICAgICAgICAvLyBoYW5kbGUgZXJyb3JzXG4gKiAgICAgICAgIGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICpcbiAqICAgICAgICAgLy8gZG8gc29tZSBzdHVmZiAuLi5cbiAqXG4gKiAgICAgICAgIC8vIHJldHVybiBwcm9jZXNzZWQgZGF0YVxuICogICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgZGF0YSk7XG4gKiAgICAgfSk7XG4gKiB9XG4gKlxuICogdmFyIHdyYXBwZWQgPSBhc3luYy50aW1lb3V0KG15RnVuY3Rpb24sIDEwMDApO1xuICpcbiAqIC8vIGNhbGwgYHdyYXBwZWRgIGFzIHlvdSB3b3VsZCBgbXlGdW5jdGlvbmBcbiAqIHdyYXBwZWQoeyBiYXI6ICdiYXInIH0sIGZ1bmN0aW9uKGVyciwgZGF0YSkge1xuICogICAgIC8vIGlmIGBteUZ1bmN0aW9uYCB0YWtlcyA8IDEwMDAgbXMgdG8gZXhlY3V0ZSwgYGVycmBcbiAqICAgICAvLyBhbmQgYGRhdGFgIHdpbGwgaGF2ZSB0aGVpciBleHBlY3RlZCB2YWx1ZXNcbiAqXG4gKiAgICAgLy8gZWxzZSBgZXJyYCB3aWxsIGJlIGFuIEVycm9yIHdpdGggdGhlIGNvZGUgJ0VUSU1FRE9VVCdcbiAqIH0pO1xuICovXG5mdW5jdGlvbiB0aW1lb3V0KGFzeW5jRm4sIG1pbGxpc2Vjb25kcywgaW5mbykge1xuICAgIHZhciBmbiA9IHdyYXBBc3luYyhhc3luY0ZuKTtcblxuICAgIHJldHVybiBpbml0aWFsUGFyYW1zKGZ1bmN0aW9uIChhcmdzLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgdGltZWRPdXQgPSBmYWxzZTtcbiAgICAgICAgdmFyIHRpbWVyO1xuXG4gICAgICAgIGZ1bmN0aW9uIHRpbWVvdXRDYWxsYmFjaygpIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0gYXN5bmNGbi5uYW1lIHx8ICdhbm9ueW1vdXMnO1xuICAgICAgICAgICAgdmFyIGVycm9yICA9IG5ldyBFcnJvcignQ2FsbGJhY2sgZnVuY3Rpb24gXCInICsgbmFtZSArICdcIiB0aW1lZCBvdXQuJyk7XG4gICAgICAgICAgICBlcnJvci5jb2RlID0gJ0VUSU1FRE9VVCc7XG4gICAgICAgICAgICBpZiAoaW5mbykge1xuICAgICAgICAgICAgICAgIGVycm9yLmluZm8gPSBpbmZvO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGltZWRPdXQgPSB0cnVlO1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXJncy5wdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghdGltZWRPdXQpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHNldHVwIHRpbWVyIGFuZCBjYWxsIG9yaWdpbmFsIGZ1bmN0aW9uXG4gICAgICAgIHRpbWVyID0gc2V0VGltZW91dCh0aW1lb3V0Q2FsbGJhY2ssIG1pbGxpc2Vjb25kcyk7XG4gICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgIH0pO1xufVxuXG4vKiBCdWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcyBmb3IgdGhvc2Ugd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMuICovXG52YXIgbmF0aXZlQ2VpbCA9IE1hdGguY2VpbDtcbnZhciBuYXRpdmVNYXggPSBNYXRoLm1heDtcblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5yYW5nZWAgYW5kIGBfLnJhbmdlUmlnaHRgIHdoaWNoIGRvZXNuJ3RcbiAqIGNvZXJjZSBhcmd1bWVudHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydCBUaGUgc3RhcnQgb2YgdGhlIHJhbmdlLlxuICogQHBhcmFtIHtudW1iZXJ9IGVuZCBUaGUgZW5kIG9mIHRoZSByYW5nZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBzdGVwIFRoZSB2YWx1ZSB0byBpbmNyZW1lbnQgb3IgZGVjcmVtZW50IGJ5LlxuICogQHBhcmFtIHtib29sZWFufSBbZnJvbVJpZ2h0XSBTcGVjaWZ5IGl0ZXJhdGluZyBmcm9tIHJpZ2h0IHRvIGxlZnQuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIHJhbmdlIG9mIG51bWJlcnMuXG4gKi9cbmZ1bmN0aW9uIGJhc2VSYW5nZShzdGFydCwgZW5kLCBzdGVwLCBmcm9tUmlnaHQpIHtcbiAgdmFyIGluZGV4ID0gLTEsXG4gICAgICBsZW5ndGggPSBuYXRpdmVNYXgobmF0aXZlQ2VpbCgoZW5kIC0gc3RhcnQpIC8gKHN0ZXAgfHwgMSkpLCAwKSxcbiAgICAgIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG5cbiAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgcmVzdWx0W2Zyb21SaWdodCA/IGxlbmd0aCA6ICsraW5kZXhdID0gc3RhcnQ7XG4gICAgc3RhcnQgKz0gc3RlcDtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFt0aW1lc117QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnRpbWVzfSBidXQgcnVucyBhIG1heGltdW0gb2YgYGxpbWl0YCBhc3luYyBvcGVyYXRpb25zIGF0IGFcbiAqIHRpbWUuXG4gKlxuICogQG5hbWUgdGltZXNMaW1pdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMudGltZXNde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy50aW1lc31cbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7bnVtYmVyfSBjb3VudCAtIFRoZSBudW1iZXIgb2YgdGltZXMgdG8gcnVuIHRoZSBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBUaGUgYXN5bmMgZnVuY3Rpb24gdG8gY2FsbCBgbmAgdGltZXMuXG4gKiBJbnZva2VkIHdpdGggdGhlIGl0ZXJhdGlvbiBpbmRleCBhbmQgYSBjYWxsYmFjazogKG4sIG5leHQpLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBzZWUgW2FzeW5jLm1hcF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLm1hcH0uXG4gKi9cbmZ1bmN0aW9uIHRpbWVMaW1pdChjb3VudCwgbGltaXQsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgIHZhciBfaXRlcmF0ZWUgPSB3cmFwQXN5bmMoaXRlcmF0ZWUpO1xuICAgIG1hcExpbWl0KGJhc2VSYW5nZSgwLCBjb3VudCwgMSksIGxpbWl0LCBfaXRlcmF0ZWUsIGNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBDYWxscyB0aGUgYGl0ZXJhdGVlYCBmdW5jdGlvbiBgbmAgdGltZXMsIGFuZCBhY2N1bXVsYXRlcyByZXN1bHRzIGluIHRoZSBzYW1lXG4gKiBtYW5uZXIgeW91IHdvdWxkIHVzZSB3aXRoIFttYXBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXB9LlxuICpcbiAqIEBuYW1lIHRpbWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5tYXBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXB9XG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge251bWJlcn0gbiAtIFRoZSBudW1iZXIgb2YgdGltZXMgdG8gcnVuIHRoZSBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBUaGUgYXN5bmMgZnVuY3Rpb24gdG8gY2FsbCBgbmAgdGltZXMuXG4gKiBJbnZva2VkIHdpdGggdGhlIGl0ZXJhdGlvbiBpbmRleCBhbmQgYSBjYWxsYmFjazogKG4sIG5leHQpLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBzZWUge0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXB9LlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBQcmV0ZW5kIHRoaXMgaXMgc29tZSBjb21wbGljYXRlZCBhc3luYyBmYWN0b3J5XG4gKiB2YXIgY3JlYXRlVXNlciA9IGZ1bmN0aW9uKGlkLCBjYWxsYmFjaykge1xuICogICAgIGNhbGxiYWNrKG51bGwsIHtcbiAqICAgICAgICAgaWQ6ICd1c2VyJyArIGlkXG4gKiAgICAgfSk7XG4gKiB9O1xuICpcbiAqIC8vIGdlbmVyYXRlIDUgdXNlcnNcbiAqIGFzeW5jLnRpbWVzKDUsIGZ1bmN0aW9uKG4sIG5leHQpIHtcbiAqICAgICBjcmVhdGVVc2VyKG4sIGZ1bmN0aW9uKGVyciwgdXNlcikge1xuICogICAgICAgICBuZXh0KGVyciwgdXNlcik7XG4gKiAgICAgfSk7XG4gKiB9LCBmdW5jdGlvbihlcnIsIHVzZXJzKSB7XG4gKiAgICAgLy8gd2Ugc2hvdWxkIG5vdyBoYXZlIDUgdXNlcnNcbiAqIH0pO1xuICovXG52YXIgdGltZXMgPSBkb0xpbWl0KHRpbWVMaW1pdCwgSW5maW5pdHkpO1xuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFt0aW1lc117QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnRpbWVzfSBidXQgcnVucyBvbmx5IGEgc2luZ2xlIGFzeW5jIG9wZXJhdGlvbiBhdCBhIHRpbWUuXG4gKlxuICogQG5hbWUgdGltZXNTZXJpZXNcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLnRpbWVzXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cudGltZXN9XG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge251bWJlcn0gbiAtIFRoZSBudW1iZXIgb2YgdGltZXMgdG8gcnVuIHRoZSBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBUaGUgYXN5bmMgZnVuY3Rpb24gdG8gY2FsbCBgbmAgdGltZXMuXG4gKiBJbnZva2VkIHdpdGggdGhlIGl0ZXJhdGlvbiBpbmRleCBhbmQgYSBjYWxsYmFjazogKG4sIG5leHQpLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBzZWUge0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXB9LlxuICovXG52YXIgdGltZXNTZXJpZXMgPSBkb0xpbWl0KHRpbWVMaW1pdCwgMSk7XG5cbi8qKlxuICogQSByZWxhdGl2ZSBvZiBgcmVkdWNlYC4gIFRha2VzIGFuIE9iamVjdCBvciBBcnJheSwgYW5kIGl0ZXJhdGVzIG92ZXIgZWFjaFxuICogZWxlbWVudCBpbiBzZXJpZXMsIGVhY2ggc3RlcCBwb3RlbnRpYWxseSBtdXRhdGluZyBhbiBgYWNjdW11bGF0b3JgIHZhbHVlLlxuICogVGhlIHR5cGUgb2YgdGhlIGFjY3VtdWxhdG9yIGRlZmF1bHRzIHRvIHRoZSB0eXBlIG9mIGNvbGxlY3Rpb24gcGFzc2VkIGluLlxuICpcbiAqIEBuYW1lIHRyYW5zZm9ybVxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7Kn0gW2FjY3VtdWxhdG9yXSAtIFRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZSB0cmFuc2Zvcm0uICBJZiBvbWl0dGVkLFxuICogaXQgd2lsbCBkZWZhdWx0IHRvIGFuIGVtcHR5IE9iamVjdCBvciBBcnJheSwgZGVwZW5kaW5nIG9uIHRoZSB0eXBlIG9mIGBjb2xsYFxuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgZnVuY3Rpb24gYXBwbGllZCB0byBlYWNoIGl0ZW0gaW4gdGhlXG4gKiBjb2xsZWN0aW9uIHRoYXQgcG90ZW50aWFsbHkgbW9kaWZpZXMgdGhlIGFjY3VtdWxhdG9yLlxuICogSW52b2tlZCB3aXRoIChhY2N1bXVsYXRvciwgaXRlbSwga2V5LCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC4gUmVzdWx0IGlzIHRoZSB0cmFuc2Zvcm1lZCBhY2N1bXVsYXRvci5cbiAqIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHQpLlxuICogQGV4YW1wbGVcbiAqXG4gKiBhc3luYy50cmFuc2Zvcm0oWzEsMiwzXSwgZnVuY3Rpb24oYWNjLCBpdGVtLCBpbmRleCwgY2FsbGJhY2spIHtcbiAqICAgICAvLyBwb2ludGxlc3MgYXN5bmM6XG4gKiAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAqICAgICAgICAgYWNjLnB1c2goaXRlbSAqIDIpXG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwpXG4gKiAgICAgfSk7XG4gKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIHJlc3VsdCBpcyBub3cgZXF1YWwgdG8gWzIsIDQsIDZdXG4gKiB9KTtcbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGFzeW5jLnRyYW5zZm9ybSh7YTogMSwgYjogMiwgYzogM30sIGZ1bmN0aW9uIChvYmosIHZhbCwga2V5LCBjYWxsYmFjaykge1xuICogICAgIHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG4gKiAgICAgICAgIG9ialtrZXldID0gdmFsICogMjtcbiAqICAgICAgICAgY2FsbGJhY2soKTtcbiAqICAgICB9KVxuICogfSwgZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gKiAgICAgLy8gcmVzdWx0IGlzIGVxdWFsIHRvIHthOiAyLCBiOiA0LCBjOiA2fVxuICogfSlcbiAqL1xuZnVuY3Rpb24gdHJhbnNmb3JtIChjb2xsLCBhY2N1bXVsYXRvciwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPD0gMykge1xuICAgICAgICBjYWxsYmFjayA9IGl0ZXJhdGVlO1xuICAgICAgICBpdGVyYXRlZSA9IGFjY3VtdWxhdG9yO1xuICAgICAgICBhY2N1bXVsYXRvciA9IGlzQXJyYXkoY29sbCkgPyBbXSA6IHt9O1xuICAgIH1cbiAgICBjYWxsYmFjayA9IG9uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgdmFyIF9pdGVyYXRlZSA9IHdyYXBBc3luYyhpdGVyYXRlZSk7XG5cbiAgICBlYWNoT2YoY29sbCwgZnVuY3Rpb24odiwgaywgY2IpIHtcbiAgICAgICAgX2l0ZXJhdGVlKGFjY3VtdWxhdG9yLCB2LCBrLCBjYik7XG4gICAgfSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIGNhbGxiYWNrKGVyciwgYWNjdW11bGF0b3IpO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIEl0IHJ1bnMgZWFjaCB0YXNrIGluIHNlcmllcyBidXQgc3RvcHMgd2hlbmV2ZXIgYW55IG9mIHRoZSBmdW5jdGlvbnMgd2VyZVxuICogc3VjY2Vzc2Z1bC4gSWYgb25lIG9mIHRoZSB0YXNrcyB3ZXJlIHN1Y2Nlc3NmdWwsIHRoZSBgY2FsbGJhY2tgIHdpbGwgYmVcbiAqIHBhc3NlZCB0aGUgcmVzdWx0IG9mIHRoZSBzdWNjZXNzZnVsIHRhc2suIElmIGFsbCB0YXNrcyBmYWlsLCB0aGUgY2FsbGJhY2tcbiAqIHdpbGwgYmUgcGFzc2VkIHRoZSBlcnJvciBhbmQgcmVzdWx0IChpZiBhbnkpIG9mIHRoZSBmaW5hbCBhdHRlbXB0LlxuICpcbiAqIEBuYW1lIHRyeUVhY2hcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAqIEBtZXRob2RcbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSB0YXNrcyAtIEEgY29sbGVjdGlvbiBjb250YWluaW5nIGZ1bmN0aW9ucyB0b1xuICogcnVuLCBlYWNoIGZ1bmN0aW9uIGlzIHBhc3NlZCBhIGBjYWxsYmFjayhlcnIsIHJlc3VsdClgIGl0IG11c3QgY2FsbCBvblxuICogY29tcGxldGlvbiB3aXRoIGFuIGVycm9yIGBlcnJgICh3aGljaCBjYW4gYmUgYG51bGxgKSBhbmQgYW4gb3B0aW9uYWwgYHJlc3VsdGBcbiAqIHZhbHVlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEFuIG9wdGlvbmFsIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIG9uZVxuICogb2YgdGhlIHRhc2tzIGhhcyBzdWNjZWVkZWQsIG9yIGFsbCBoYXZlIGZhaWxlZC4gSXQgcmVjZWl2ZXMgdGhlIGBlcnJgIGFuZFxuICogYHJlc3VsdGAgYXJndW1lbnRzIG9mIHRoZSBsYXN0IGF0dGVtcHQgYXQgY29tcGxldGluZyB0aGUgYHRhc2tgLiBJbnZva2VkIHdpdGhcbiAqIChlcnIsIHJlc3VsdHMpLlxuICogQGV4YW1wbGVcbiAqIGFzeW5jLnRyeShbXG4gKiAgICAgZnVuY3Rpb24gZ2V0RGF0YUZyb21GaXJzdFdlYnNpdGUoY2FsbGJhY2spIHtcbiAqICAgICAgICAgLy8gVHJ5IGdldHRpbmcgdGhlIGRhdGEgZnJvbSB0aGUgZmlyc3Qgd2Vic2l0ZVxuICogICAgICAgICBjYWxsYmFjayhlcnIsIGRhdGEpO1xuICogICAgIH0sXG4gKiAgICAgZnVuY3Rpb24gZ2V0RGF0YUZyb21TZWNvbmRXZWJzaXRlKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIC8vIEZpcnN0IHdlYnNpdGUgZmFpbGVkLFxuICogICAgICAgICAvLyBUcnkgZ2V0dGluZyB0aGUgZGF0YSBmcm9tIHRoZSBiYWNrdXAgd2Vic2l0ZVxuICogICAgICAgICBjYWxsYmFjayhlcnIsIGRhdGEpO1xuICogICAgIH1cbiAqIF0sXG4gKiAvLyBvcHRpb25hbCBjYWxsYmFja1xuICogZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gKiAgICAgTm93IGRvIHNvbWV0aGluZyB3aXRoIHRoZSBkYXRhLlxuICogfSk7XG4gKlxuICovXG5mdW5jdGlvbiB0cnlFYWNoKHRhc2tzLCBjYWxsYmFjaykge1xuICAgIHZhciBlcnJvciA9IG51bGw7XG4gICAgdmFyIHJlc3VsdDtcbiAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IG5vb3A7XG4gICAgZWFjaFNlcmllcyh0YXNrcywgZnVuY3Rpb24odGFzaywgY2FsbGJhY2spIHtcbiAgICAgICAgd3JhcEFzeW5jKHRhc2spKGZ1bmN0aW9uIChlcnIsIHJlcy8qLCAuLi5hcmdzKi8pIHtcbiAgICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVycm9yID0gZXJyO1xuICAgICAgICAgICAgY2FsbGJhY2soIWVycik7XG4gICAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIHJlc3VsdCk7XG4gICAgfSk7XG59XG5cbi8qKlxuICogVW5kb2VzIGEgW21lbW9pemVde0BsaW5rIG1vZHVsZTpVdGlscy5tZW1vaXplfWQgZnVuY3Rpb24sIHJldmVydGluZyBpdCB0byB0aGUgb3JpZ2luYWwsXG4gKiB1bm1lbW9pemVkIGZvcm0uIEhhbmR5IGZvciB0ZXN0aW5nLlxuICpcbiAqIEBuYW1lIHVubWVtb2l6ZVxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpVdGlsc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMubWVtb2l6ZV17QGxpbmsgbW9kdWxlOlV0aWxzLm1lbW9pemV9XG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHBhcmFtIHtBc3luY0Z1bmN0aW9ufSBmbiAtIHRoZSBtZW1vaXplZCBmdW5jdGlvblxuICogQHJldHVybnMge0FzeW5jRnVuY3Rpb259IGEgZnVuY3Rpb24gdGhhdCBjYWxscyB0aGUgb3JpZ2luYWwgdW5tZW1vaXplZCBmdW5jdGlvblxuICovXG5mdW5jdGlvbiB1bm1lbW9pemUoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gKGZuLnVubWVtb2l6ZWQgfHwgZm4pLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBSZXBlYXRlZGx5IGNhbGwgYGl0ZXJhdGVlYCwgd2hpbGUgYHRlc3RgIHJldHVybnMgYHRydWVgLiBDYWxscyBgY2FsbGJhY2tgIHdoZW5cbiAqIHN0b3BwZWQsIG9yIGFuIGVycm9yIG9jY3Vycy5cbiAqXG4gKiBAbmFtZSB3aGlsc3RcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAqIEBtZXRob2RcbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHRlc3QgLSBzeW5jaHJvbm91cyB0cnV0aCB0ZXN0IHRvIHBlcmZvcm0gYmVmb3JlIGVhY2hcbiAqIGV4ZWN1dGlvbiBvZiBgaXRlcmF0ZWVgLiBJbnZva2VkIHdpdGggKCkuXG4gKiBAcGFyYW0ge0FzeW5jRnVuY3Rpb259IGl0ZXJhdGVlIC0gQW4gYXN5bmMgZnVuY3Rpb24gd2hpY2ggaXMgY2FsbGVkIGVhY2ggdGltZVxuICogYHRlc3RgIHBhc3Nlcy4gSW52b2tlZCB3aXRoIChjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgdGhlIHRlc3RcbiAqIGZ1bmN0aW9uIGhhcyBmYWlsZWQgYW5kIHJlcGVhdGVkIGV4ZWN1dGlvbiBvZiBgaXRlcmF0ZWVgIGhhcyBzdG9wcGVkLiBgY2FsbGJhY2tgXG4gKiB3aWxsIGJlIHBhc3NlZCBhbiBlcnJvciBhbmQgYW55IGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIGZpbmFsIGBpdGVyYXRlZWAnc1xuICogY2FsbGJhY2suIEludm9rZWQgd2l0aCAoZXJyLCBbcmVzdWx0c10pO1xuICogQHJldHVybnMgdW5kZWZpbmVkXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBjb3VudCA9IDA7XG4gKiBhc3luYy53aGlsc3QoXG4gKiAgICAgZnVuY3Rpb24oKSB7IHJldHVybiBjb3VudCA8IDU7IH0sXG4gKiAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgY291bnQrKztcbiAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGNvdW50KTtcbiAqICAgICAgICAgfSwgMTAwMCk7XG4gKiAgICAgfSxcbiAqICAgICBmdW5jdGlvbiAoZXJyLCBuKSB7XG4gKiAgICAgICAgIC8vIDUgc2Vjb25kcyBoYXZlIHBhc3NlZCwgbiA9IDVcbiAqICAgICB9XG4gKiApO1xuICovXG5mdW5jdGlvbiB3aGlsc3QodGVzdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBvbmx5T25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICB2YXIgX2l0ZXJhdGVlID0gd3JhcEFzeW5jKGl0ZXJhdGVlKTtcbiAgICBpZiAoIXRlc3QoKSkgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgIHZhciBuZXh0ID0gZnVuY3Rpb24oZXJyLyosIC4uLmFyZ3MqLykge1xuICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgaWYgKHRlc3QoKSkgcmV0dXJuIF9pdGVyYXRlZShuZXh0KTtcbiAgICAgICAgdmFyIGFyZ3MgPSBzbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBbbnVsbF0uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuICAgIF9pdGVyYXRlZShuZXh0KTtcbn1cblxuLyoqXG4gKiBSZXBlYXRlZGx5IGNhbGwgYGl0ZXJhdGVlYCB1bnRpbCBgdGVzdGAgcmV0dXJucyBgdHJ1ZWAuIENhbGxzIGBjYWxsYmFja2Agd2hlblxuICogc3RvcHBlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBgY2FsbGJhY2tgIHdpbGwgYmUgcGFzc2VkIGFuIGVycm9yIGFuZCBhbnlcbiAqIGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIGZpbmFsIGBpdGVyYXRlZWAncyBjYWxsYmFjay5cbiAqXG4gKiBUaGUgaW52ZXJzZSBvZiBbd2hpbHN0XXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cud2hpbHN0fS5cbiAqXG4gKiBAbmFtZSB1bnRpbFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMud2hpbHN0XXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cud2hpbHN0fVxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHtGdW5jdGlvbn0gdGVzdCAtIHN5bmNocm9ub3VzIHRydXRoIHRlc3QgdG8gcGVyZm9ybSBiZWZvcmUgZWFjaFxuICogZXhlY3V0aW9uIG9mIGBpdGVyYXRlZWAuIEludm9rZWQgd2l0aCAoKS5cbiAqIEBwYXJhbSB7QXN5bmNGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBbiBhc3luYyBmdW5jdGlvbiB3aGljaCBpcyBjYWxsZWQgZWFjaCB0aW1lXG4gKiBgdGVzdGAgZmFpbHMuIEludm9rZWQgd2l0aCAoY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIHRoZSB0ZXN0XG4gKiBmdW5jdGlvbiBoYXMgcGFzc2VkIGFuZCByZXBlYXRlZCBleGVjdXRpb24gb2YgYGl0ZXJhdGVlYCBoYXMgc3RvcHBlZC4gYGNhbGxiYWNrYFxuICogd2lsbCBiZSBwYXNzZWQgYW4gZXJyb3IgYW5kIGFueSBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBmaW5hbCBgaXRlcmF0ZWVgJ3NcbiAqIGNhbGxiYWNrLiBJbnZva2VkIHdpdGggKGVyciwgW3Jlc3VsdHNdKTtcbiAqL1xuZnVuY3Rpb24gdW50aWwodGVzdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgd2hpbHN0KGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gIXRlc3QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9LCBpdGVyYXRlZSwgY2FsbGJhY2spO1xufVxuXG4vKipcbiAqIFJ1bnMgdGhlIGB0YXNrc2AgYXJyYXkgb2YgZnVuY3Rpb25zIGluIHNlcmllcywgZWFjaCBwYXNzaW5nIHRoZWlyIHJlc3VsdHMgdG9cbiAqIHRoZSBuZXh0IGluIHRoZSBhcnJheS4gSG93ZXZlciwgaWYgYW55IG9mIHRoZSBgdGFza3NgIHBhc3MgYW4gZXJyb3IgdG8gdGhlaXJcbiAqIG93biBjYWxsYmFjaywgdGhlIG5leHQgZnVuY3Rpb24gaXMgbm90IGV4ZWN1dGVkLCBhbmQgdGhlIG1haW4gYGNhbGxiYWNrYCBpc1xuICogaW1tZWRpYXRlbHkgY2FsbGVkIHdpdGggdGhlIGVycm9yLlxuICpcbiAqIEBuYW1lIHdhdGVyZmFsbFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHtBcnJheX0gdGFza3MgLSBBbiBhcnJheSBvZiBbYXN5bmMgZnVuY3Rpb25zXXtAbGluayBBc3luY0Z1bmN0aW9ufVxuICogdG8gcnVuLlxuICogRWFjaCBmdW5jdGlvbiBzaG91bGQgY29tcGxldGUgd2l0aCBhbnkgbnVtYmVyIG9mIGByZXN1bHRgIHZhbHVlcy5cbiAqIFRoZSBgcmVzdWx0YCB2YWx1ZXMgd2lsbCBiZSBwYXNzZWQgYXMgYXJndW1lbnRzLCBpbiBvcmRlciwgdG8gdGhlIG5leHQgdGFzay5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBbiBvcHRpb25hbCBjYWxsYmFjayB0byBydW4gb25jZSBhbGwgdGhlXG4gKiBmdW5jdGlvbnMgaGF2ZSBjb21wbGV0ZWQuIFRoaXMgd2lsbCBiZSBwYXNzZWQgdGhlIHJlc3VsdHMgb2YgdGhlIGxhc3QgdGFzaydzXG4gKiBjYWxsYmFjay4gSW52b2tlZCB3aXRoIChlcnIsIFtyZXN1bHRzXSkuXG4gKiBAcmV0dXJucyB1bmRlZmluZWRcbiAqIEBleGFtcGxlXG4gKlxuICogYXN5bmMud2F0ZXJmYWxsKFtcbiAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCAnb25lJywgJ3R3bycpO1xuICogICAgIH0sXG4gKiAgICAgZnVuY3Rpb24oYXJnMSwgYXJnMiwgY2FsbGJhY2spIHtcbiAqICAgICAgICAgLy8gYXJnMSBub3cgZXF1YWxzICdvbmUnIGFuZCBhcmcyIG5vdyBlcXVhbHMgJ3R3bydcbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ3RocmVlJyk7XG4gKiAgICAgfSxcbiAqICAgICBmdW5jdGlvbihhcmcxLCBjYWxsYmFjaykge1xuICogICAgICAgICAvLyBhcmcxIG5vdyBlcXVhbHMgJ3RocmVlJ1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCAnZG9uZScpO1xuICogICAgIH1cbiAqIF0sIGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIHJlc3VsdCBub3cgZXF1YWxzICdkb25lJ1xuICogfSk7XG4gKlxuICogLy8gT3IsIHdpdGggbmFtZWQgZnVuY3Rpb25zOlxuICogYXN5bmMud2F0ZXJmYWxsKFtcbiAqICAgICBteUZpcnN0RnVuY3Rpb24sXG4gKiAgICAgbXlTZWNvbmRGdW5jdGlvbixcbiAqICAgICBteUxhc3RGdW5jdGlvbixcbiAqIF0sIGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIHJlc3VsdCBub3cgZXF1YWxzICdkb25lJ1xuICogfSk7XG4gKiBmdW5jdGlvbiBteUZpcnN0RnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICBjYWxsYmFjayhudWxsLCAnb25lJywgJ3R3bycpO1xuICogfVxuICogZnVuY3Rpb24gbXlTZWNvbmRGdW5jdGlvbihhcmcxLCBhcmcyLCBjYWxsYmFjaykge1xuICogICAgIC8vIGFyZzEgbm93IGVxdWFscyAnb25lJyBhbmQgYXJnMiBub3cgZXF1YWxzICd0d28nXG4gKiAgICAgY2FsbGJhY2sobnVsbCwgJ3RocmVlJyk7XG4gKiB9XG4gKiBmdW5jdGlvbiBteUxhc3RGdW5jdGlvbihhcmcxLCBjYWxsYmFjaykge1xuICogICAgIC8vIGFyZzEgbm93IGVxdWFscyAndGhyZWUnXG4gKiAgICAgY2FsbGJhY2sobnVsbCwgJ2RvbmUnKTtcbiAqIH1cbiAqL1xudmFyIHdhdGVyZmFsbCA9IGZ1bmN0aW9uKHRhc2tzLCBjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrID0gb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICBpZiAoIWlzQXJyYXkodGFza3MpKSByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdGaXJzdCBhcmd1bWVudCB0byB3YXRlcmZhbGwgbXVzdCBiZSBhbiBhcnJheSBvZiBmdW5jdGlvbnMnKSk7XG4gICAgaWYgKCF0YXNrcy5sZW5ndGgpIHJldHVybiBjYWxsYmFjaygpO1xuICAgIHZhciB0YXNrSW5kZXggPSAwO1xuXG4gICAgZnVuY3Rpb24gbmV4dFRhc2soYXJncykge1xuICAgICAgICB2YXIgdGFzayA9IHdyYXBBc3luYyh0YXNrc1t0YXNrSW5kZXgrK10pO1xuICAgICAgICBhcmdzLnB1c2gob25seU9uY2UobmV4dCkpO1xuICAgICAgICB0YXNrLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5leHQoZXJyLyosIC4uLmFyZ3MqLykge1xuICAgICAgICBpZiAoZXJyIHx8IHRhc2tJbmRleCA9PT0gdGFza3MubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgICAgICBuZXh0VGFzayhzbGljZShhcmd1bWVudHMsIDEpKTtcbiAgICB9XG5cbiAgICBuZXh0VGFzayhbXSk7XG59O1xuXG4vKipcbiAqIEFuIFwiYXN5bmMgZnVuY3Rpb25cIiBpbiB0aGUgY29udGV4dCBvZiBBc3luYyBpcyBhbiBhc3luY2hyb25vdXMgZnVuY3Rpb24gd2l0aFxuICogYSB2YXJpYWJsZSBudW1iZXIgb2YgcGFyYW1ldGVycywgd2l0aCB0aGUgZmluYWwgcGFyYW1ldGVyIGJlaW5nIGEgY2FsbGJhY2suXG4gKiAoYGZ1bmN0aW9uIChhcmcxLCBhcmcyLCAuLi4sIGNhbGxiYWNrKSB7fWApXG4gKiBUaGUgZmluYWwgY2FsbGJhY2sgaXMgb2YgdGhlIGZvcm0gYGNhbGxiYWNrKGVyciwgcmVzdWx0cy4uLilgLCB3aGljaCBtdXN0IGJlXG4gKiBjYWxsZWQgb25jZSB0aGUgZnVuY3Rpb24gaXMgY29tcGxldGVkLiAgVGhlIGNhbGxiYWNrIHNob3VsZCBiZSBjYWxsZWQgd2l0aCBhXG4gKiBFcnJvciBhcyBpdHMgZmlyc3QgYXJndW1lbnQgdG8gc2lnbmFsIHRoYXQgYW4gZXJyb3Igb2NjdXJyZWQuXG4gKiBPdGhlcndpc2UsIGlmIG5vIGVycm9yIG9jY3VycmVkLCBpdCBzaG91bGQgYmUgY2FsbGVkIHdpdGggYG51bGxgIGFzIHRoZSBmaXJzdFxuICogYXJndW1lbnQsIGFuZCBhbnkgYWRkaXRpb25hbCBgcmVzdWx0YCBhcmd1bWVudHMgdGhhdCBtYXkgYXBwbHksIHRvIHNpZ25hbFxuICogc3VjY2Vzc2Z1bCBjb21wbGV0aW9uLlxuICogVGhlIGNhbGxiYWNrIG11c3QgYmUgY2FsbGVkIGV4YWN0bHkgb25jZSwgaWRlYWxseSBvbiBhIGxhdGVyIHRpY2sgb2YgdGhlXG4gKiBKYXZhU2NyaXB0IGV2ZW50IGxvb3AuXG4gKlxuICogVGhpcyB0eXBlIG9mIGZ1bmN0aW9uIGlzIGFsc28gcmVmZXJyZWQgdG8gYXMgYSBcIk5vZGUtc3R5bGUgYXN5bmMgZnVuY3Rpb25cIixcbiAqIG9yIGEgXCJjb250aW51YXRpb24gcGFzc2luZy1zdHlsZSBmdW5jdGlvblwiIChDUFMpLiBNb3N0IG9mIHRoZSBtZXRob2RzIG9mIHRoaXNcbiAqIGxpYnJhcnkgYXJlIHRoZW1zZWx2ZXMgQ1BTL05vZGUtc3R5bGUgYXN5bmMgZnVuY3Rpb25zLCBvciBmdW5jdGlvbnMgdGhhdFxuICogcmV0dXJuIENQUy9Ob2RlLXN0eWxlIGFzeW5jIGZ1bmN0aW9ucy5cbiAqXG4gKiBXaGVyZXZlciB3ZSBhY2NlcHQgYSBOb2RlLXN0eWxlIGFzeW5jIGZ1bmN0aW9uLCB3ZSBhbHNvIGRpcmVjdGx5IGFjY2VwdCBhblxuICogW0VTMjAxNyBgYXN5bmNgIGZ1bmN0aW9uXXtAbGluayBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9TdGF0ZW1lbnRzL2FzeW5jX2Z1bmN0aW9ufS5cbiAqIEluIHRoaXMgY2FzZSwgdGhlIGBhc3luY2AgZnVuY3Rpb24gd2lsbCBub3QgYmUgcGFzc2VkIGEgZmluYWwgY2FsbGJhY2tcbiAqIGFyZ3VtZW50LCBhbmQgYW55IHRocm93biBlcnJvciB3aWxsIGJlIHVzZWQgYXMgdGhlIGBlcnJgIGFyZ3VtZW50IG9mIHRoZVxuICogaW1wbGljaXQgY2FsbGJhY2ssIGFuZCB0aGUgcmV0dXJuIHZhbHVlIHdpbGwgYmUgdXNlZCBhcyB0aGUgYHJlc3VsdGAgdmFsdWUuXG4gKiAoaS5lLiBhIGByZWplY3RlZGAgb2YgdGhlIHJldHVybmVkIFByb21pc2UgYmVjb21lcyB0aGUgYGVycmAgY2FsbGJhY2tcbiAqIGFyZ3VtZW50LCBhbmQgYSBgcmVzb2x2ZWRgIHZhbHVlIGJlY29tZXMgdGhlIGByZXN1bHRgLilcbiAqXG4gKiBOb3RlLCBkdWUgdG8gSmF2YVNjcmlwdCBsaW1pdGF0aW9ucywgd2UgY2FuIG9ubHkgZGV0ZWN0IG5hdGl2ZSBgYXN5bmNgXG4gKiBmdW5jdGlvbnMgYW5kIG5vdCB0cmFuc3BpbGllZCBpbXBsZW1lbnRhdGlvbnMuXG4gKiBZb3VyIGVudmlyb25tZW50IG11c3QgaGF2ZSBgYXN5bmNgL2Bhd2FpdGAgc3VwcG9ydCBmb3IgdGhpcyB0byB3b3JrLlxuICogKGUuZy4gTm9kZSA+IHY3LjYsIG9yIGEgcmVjZW50IHZlcnNpb24gb2YgYSBtb2Rlcm4gYnJvd3NlcikuXG4gKiBJZiB5b3UgYXJlIHVzaW5nIGBhc3luY2AgZnVuY3Rpb25zIHRocm91Z2ggYSB0cmFuc3BpbGVyIChlLmcuIEJhYmVsKSwgeW91XG4gKiBtdXN0IHN0aWxsIHdyYXAgdGhlIGZ1bmN0aW9uIHdpdGggW2FzeW5jaWZ5XXtAbGluayBtb2R1bGU6VXRpbHMuYXN5bmNpZnl9LFxuICogYmVjYXVzZSB0aGUgYGFzeW5jIGZ1bmN0aW9uYCB3aWxsIGJlIGNvbXBpbGVkIHRvIGFuIG9yZGluYXJ5IGZ1bmN0aW9uIHRoYXRcbiAqIHJldHVybnMgYSBwcm9taXNlLlxuICpcbiAqIEB0eXBlZGVmIHtGdW5jdGlvbn0gQXN5bmNGdW5jdGlvblxuICogQHN0YXRpY1xuICovXG5cbi8qKlxuICogQXN5bmMgaXMgYSB1dGlsaXR5IG1vZHVsZSB3aGljaCBwcm92aWRlcyBzdHJhaWdodC1mb3J3YXJkLCBwb3dlcmZ1bCBmdW5jdGlvbnNcbiAqIGZvciB3b3JraW5nIHdpdGggYXN5bmNocm9ub3VzIEphdmFTY3JpcHQuIEFsdGhvdWdoIG9yaWdpbmFsbHkgZGVzaWduZWQgZm9yXG4gKiB1c2Ugd2l0aCBbTm9kZS5qc10oaHR0cDovL25vZGVqcy5vcmcpIGFuZCBpbnN0YWxsYWJsZSB2aWFcbiAqIGBucG0gaW5zdGFsbCAtLXNhdmUgYXN5bmNgLCBpdCBjYW4gYWxzbyBiZSB1c2VkIGRpcmVjdGx5IGluIHRoZSBicm93c2VyLlxuICogQG1vZHVsZSBhc3luY1xuICogQHNlZSBBc3luY0Z1bmN0aW9uXG4gKi9cblxuXG4vKipcbiAqIEEgY29sbGVjdGlvbiBvZiBgYXN5bmNgIGZ1bmN0aW9ucyBmb3IgbWFuaXB1bGF0aW5nIGNvbGxlY3Rpb25zLCBzdWNoIGFzXG4gKiBhcnJheXMgYW5kIG9iamVjdHMuXG4gKiBAbW9kdWxlIENvbGxlY3Rpb25zXG4gKi9cblxuLyoqXG4gKiBBIGNvbGxlY3Rpb24gb2YgYGFzeW5jYCBmdW5jdGlvbnMgZm9yIGNvbnRyb2xsaW5nIHRoZSBmbG93IHRocm91Z2ggYSBzY3JpcHQuXG4gKiBAbW9kdWxlIENvbnRyb2xGbG93XG4gKi9cblxuLyoqXG4gKiBBIGNvbGxlY3Rpb24gb2YgYGFzeW5jYCB1dGlsaXR5IGZ1bmN0aW9ucy5cbiAqIEBtb2R1bGUgVXRpbHNcbiAqL1xuXG52YXIgaW5kZXggPSB7XG4gICAgYXBwbHlFYWNoOiBhcHBseUVhY2gsXG4gICAgYXBwbHlFYWNoU2VyaWVzOiBhcHBseUVhY2hTZXJpZXMsXG4gICAgYXBwbHk6IGFwcGx5LFxuICAgIGFzeW5jaWZ5OiBhc3luY2lmeSxcbiAgICBhdXRvOiBhdXRvLFxuICAgIGF1dG9JbmplY3Q6IGF1dG9JbmplY3QsXG4gICAgY2FyZ286IGNhcmdvLFxuICAgIGNvbXBvc2U6IGNvbXBvc2UsXG4gICAgY29uY2F0OiBjb25jYXQsXG4gICAgY29uY2F0TGltaXQ6IGNvbmNhdExpbWl0LFxuICAgIGNvbmNhdFNlcmllczogY29uY2F0U2VyaWVzLFxuICAgIGNvbnN0YW50OiBjb25zdGFudCxcbiAgICBkZXRlY3Q6IGRldGVjdCxcbiAgICBkZXRlY3RMaW1pdDogZGV0ZWN0TGltaXQsXG4gICAgZGV0ZWN0U2VyaWVzOiBkZXRlY3RTZXJpZXMsXG4gICAgZGlyOiBkaXIsXG4gICAgZG9EdXJpbmc6IGRvRHVyaW5nLFxuICAgIGRvVW50aWw6IGRvVW50aWwsXG4gICAgZG9XaGlsc3Q6IGRvV2hpbHN0LFxuICAgIGR1cmluZzogZHVyaW5nLFxuICAgIGVhY2g6IGVhY2hMaW1pdCxcbiAgICBlYWNoTGltaXQ6IGVhY2hMaW1pdCQxLFxuICAgIGVhY2hPZjogZWFjaE9mLFxuICAgIGVhY2hPZkxpbWl0OiBlYWNoT2ZMaW1pdCxcbiAgICBlYWNoT2ZTZXJpZXM6IGVhY2hPZlNlcmllcyxcbiAgICBlYWNoU2VyaWVzOiBlYWNoU2VyaWVzLFxuICAgIGVuc3VyZUFzeW5jOiBlbnN1cmVBc3luYyxcbiAgICBldmVyeTogZXZlcnksXG4gICAgZXZlcnlMaW1pdDogZXZlcnlMaW1pdCxcbiAgICBldmVyeVNlcmllczogZXZlcnlTZXJpZXMsXG4gICAgZmlsdGVyOiBmaWx0ZXIsXG4gICAgZmlsdGVyTGltaXQ6IGZpbHRlckxpbWl0LFxuICAgIGZpbHRlclNlcmllczogZmlsdGVyU2VyaWVzLFxuICAgIGZvcmV2ZXI6IGZvcmV2ZXIsXG4gICAgZ3JvdXBCeTogZ3JvdXBCeSxcbiAgICBncm91cEJ5TGltaXQ6IGdyb3VwQnlMaW1pdCxcbiAgICBncm91cEJ5U2VyaWVzOiBncm91cEJ5U2VyaWVzLFxuICAgIGxvZzogbG9nLFxuICAgIG1hcDogbWFwLFxuICAgIG1hcExpbWl0OiBtYXBMaW1pdCxcbiAgICBtYXBTZXJpZXM6IG1hcFNlcmllcyxcbiAgICBtYXBWYWx1ZXM6IG1hcFZhbHVlcyxcbiAgICBtYXBWYWx1ZXNMaW1pdDogbWFwVmFsdWVzTGltaXQsXG4gICAgbWFwVmFsdWVzU2VyaWVzOiBtYXBWYWx1ZXNTZXJpZXMsXG4gICAgbWVtb2l6ZTogbWVtb2l6ZSxcbiAgICBuZXh0VGljazogbmV4dFRpY2ssXG4gICAgcGFyYWxsZWw6IHBhcmFsbGVsTGltaXQsXG4gICAgcGFyYWxsZWxMaW1pdDogcGFyYWxsZWxMaW1pdCQxLFxuICAgIHByaW9yaXR5UXVldWU6IHByaW9yaXR5UXVldWUsXG4gICAgcXVldWU6IHF1ZXVlJDEsXG4gICAgcmFjZTogcmFjZSxcbiAgICByZWR1Y2U6IHJlZHVjZSxcbiAgICByZWR1Y2VSaWdodDogcmVkdWNlUmlnaHQsXG4gICAgcmVmbGVjdDogcmVmbGVjdCxcbiAgICByZWZsZWN0QWxsOiByZWZsZWN0QWxsLFxuICAgIHJlamVjdDogcmVqZWN0LFxuICAgIHJlamVjdExpbWl0OiByZWplY3RMaW1pdCxcbiAgICByZWplY3RTZXJpZXM6IHJlamVjdFNlcmllcyxcbiAgICByZXRyeTogcmV0cnksXG4gICAgcmV0cnlhYmxlOiByZXRyeWFibGUsXG4gICAgc2VxOiBzZXEsXG4gICAgc2VyaWVzOiBzZXJpZXMsXG4gICAgc2V0SW1tZWRpYXRlOiBzZXRJbW1lZGlhdGUkMSxcbiAgICBzb21lOiBzb21lLFxuICAgIHNvbWVMaW1pdDogc29tZUxpbWl0LFxuICAgIHNvbWVTZXJpZXM6IHNvbWVTZXJpZXMsXG4gICAgc29ydEJ5OiBzb3J0QnksXG4gICAgdGltZW91dDogdGltZW91dCxcbiAgICB0aW1lczogdGltZXMsXG4gICAgdGltZXNMaW1pdDogdGltZUxpbWl0LFxuICAgIHRpbWVzU2VyaWVzOiB0aW1lc1NlcmllcyxcbiAgICB0cmFuc2Zvcm06IHRyYW5zZm9ybSxcbiAgICB0cnlFYWNoOiB0cnlFYWNoLFxuICAgIHVubWVtb2l6ZTogdW5tZW1vaXplLFxuICAgIHVudGlsOiB1bnRpbCxcbiAgICB3YXRlcmZhbGw6IHdhdGVyZmFsbCxcbiAgICB3aGlsc3Q6IHdoaWxzdCxcblxuICAgIC8vIGFsaWFzZXNcbiAgICBhbGw6IGV2ZXJ5LFxuICAgIGFueTogc29tZSxcbiAgICBmb3JFYWNoOiBlYWNoTGltaXQsXG4gICAgZm9yRWFjaFNlcmllczogZWFjaFNlcmllcyxcbiAgICBmb3JFYWNoTGltaXQ6IGVhY2hMaW1pdCQxLFxuICAgIGZvckVhY2hPZjogZWFjaE9mLFxuICAgIGZvckVhY2hPZlNlcmllczogZWFjaE9mU2VyaWVzLFxuICAgIGZvckVhY2hPZkxpbWl0OiBlYWNoT2ZMaW1pdCxcbiAgICBpbmplY3Q6IHJlZHVjZSxcbiAgICBmb2xkbDogcmVkdWNlLFxuICAgIGZvbGRyOiByZWR1Y2VSaWdodCxcbiAgICBzZWxlY3Q6IGZpbHRlcixcbiAgICBzZWxlY3RMaW1pdDogZmlsdGVyTGltaXQsXG4gICAgc2VsZWN0U2VyaWVzOiBmaWx0ZXJTZXJpZXMsXG4gICAgd3JhcFN5bmM6IGFzeW5jaWZ5XG59O1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBpbmRleDtcbmV4cG9ydHMuYXBwbHlFYWNoID0gYXBwbHlFYWNoO1xuZXhwb3J0cy5hcHBseUVhY2hTZXJpZXMgPSBhcHBseUVhY2hTZXJpZXM7XG5leHBvcnRzLmFwcGx5ID0gYXBwbHk7XG5leHBvcnRzLmFzeW5jaWZ5ID0gYXN5bmNpZnk7XG5leHBvcnRzLmF1dG8gPSBhdXRvO1xuZXhwb3J0cy5hdXRvSW5qZWN0ID0gYXV0b0luamVjdDtcbmV4cG9ydHMuY2FyZ28gPSBjYXJnbztcbmV4cG9ydHMuY29tcG9zZSA9IGNvbXBvc2U7XG5leHBvcnRzLmNvbmNhdCA9IGNvbmNhdDtcbmV4cG9ydHMuY29uY2F0TGltaXQgPSBjb25jYXRMaW1pdDtcbmV4cG9ydHMuY29uY2F0U2VyaWVzID0gY29uY2F0U2VyaWVzO1xuZXhwb3J0cy5jb25zdGFudCA9IGNvbnN0YW50O1xuZXhwb3J0cy5kZXRlY3QgPSBkZXRlY3Q7XG5leHBvcnRzLmRldGVjdExpbWl0ID0gZGV0ZWN0TGltaXQ7XG5leHBvcnRzLmRldGVjdFNlcmllcyA9IGRldGVjdFNlcmllcztcbmV4cG9ydHMuZGlyID0gZGlyO1xuZXhwb3J0cy5kb0R1cmluZyA9IGRvRHVyaW5nO1xuZXhwb3J0cy5kb1VudGlsID0gZG9VbnRpbDtcbmV4cG9ydHMuZG9XaGlsc3QgPSBkb1doaWxzdDtcbmV4cG9ydHMuZHVyaW5nID0gZHVyaW5nO1xuZXhwb3J0cy5lYWNoID0gZWFjaExpbWl0O1xuZXhwb3J0cy5lYWNoTGltaXQgPSBlYWNoTGltaXQkMTtcbmV4cG9ydHMuZWFjaE9mID0gZWFjaE9mO1xuZXhwb3J0cy5lYWNoT2ZMaW1pdCA9IGVhY2hPZkxpbWl0O1xuZXhwb3J0cy5lYWNoT2ZTZXJpZXMgPSBlYWNoT2ZTZXJpZXM7XG5leHBvcnRzLmVhY2hTZXJpZXMgPSBlYWNoU2VyaWVzO1xuZXhwb3J0cy5lbnN1cmVBc3luYyA9IGVuc3VyZUFzeW5jO1xuZXhwb3J0cy5ldmVyeSA9IGV2ZXJ5O1xuZXhwb3J0cy5ldmVyeUxpbWl0ID0gZXZlcnlMaW1pdDtcbmV4cG9ydHMuZXZlcnlTZXJpZXMgPSBldmVyeVNlcmllcztcbmV4cG9ydHMuZmlsdGVyID0gZmlsdGVyO1xuZXhwb3J0cy5maWx0ZXJMaW1pdCA9IGZpbHRlckxpbWl0O1xuZXhwb3J0cy5maWx0ZXJTZXJpZXMgPSBmaWx0ZXJTZXJpZXM7XG5leHBvcnRzLmZvcmV2ZXIgPSBmb3JldmVyO1xuZXhwb3J0cy5ncm91cEJ5ID0gZ3JvdXBCeTtcbmV4cG9ydHMuZ3JvdXBCeUxpbWl0ID0gZ3JvdXBCeUxpbWl0O1xuZXhwb3J0cy5ncm91cEJ5U2VyaWVzID0gZ3JvdXBCeVNlcmllcztcbmV4cG9ydHMubG9nID0gbG9nO1xuZXhwb3J0cy5tYXAgPSBtYXA7XG5leHBvcnRzLm1hcExpbWl0ID0gbWFwTGltaXQ7XG5leHBvcnRzLm1hcFNlcmllcyA9IG1hcFNlcmllcztcbmV4cG9ydHMubWFwVmFsdWVzID0gbWFwVmFsdWVzO1xuZXhwb3J0cy5tYXBWYWx1ZXNMaW1pdCA9IG1hcFZhbHVlc0xpbWl0O1xuZXhwb3J0cy5tYXBWYWx1ZXNTZXJpZXMgPSBtYXBWYWx1ZXNTZXJpZXM7XG5leHBvcnRzLm1lbW9pemUgPSBtZW1vaXplO1xuZXhwb3J0cy5uZXh0VGljayA9IG5leHRUaWNrO1xuZXhwb3J0cy5wYXJhbGxlbCA9IHBhcmFsbGVsTGltaXQ7XG5leHBvcnRzLnBhcmFsbGVsTGltaXQgPSBwYXJhbGxlbExpbWl0JDE7XG5leHBvcnRzLnByaW9yaXR5UXVldWUgPSBwcmlvcml0eVF1ZXVlO1xuZXhwb3J0cy5xdWV1ZSA9IHF1ZXVlJDE7XG5leHBvcnRzLnJhY2UgPSByYWNlO1xuZXhwb3J0cy5yZWR1Y2UgPSByZWR1Y2U7XG5leHBvcnRzLnJlZHVjZVJpZ2h0ID0gcmVkdWNlUmlnaHQ7XG5leHBvcnRzLnJlZmxlY3QgPSByZWZsZWN0O1xuZXhwb3J0cy5yZWZsZWN0QWxsID0gcmVmbGVjdEFsbDtcbmV4cG9ydHMucmVqZWN0ID0gcmVqZWN0O1xuZXhwb3J0cy5yZWplY3RMaW1pdCA9IHJlamVjdExpbWl0O1xuZXhwb3J0cy5yZWplY3RTZXJpZXMgPSByZWplY3RTZXJpZXM7XG5leHBvcnRzLnJldHJ5ID0gcmV0cnk7XG5leHBvcnRzLnJldHJ5YWJsZSA9IHJldHJ5YWJsZTtcbmV4cG9ydHMuc2VxID0gc2VxO1xuZXhwb3J0cy5zZXJpZXMgPSBzZXJpZXM7XG5leHBvcnRzLnNldEltbWVkaWF0ZSA9IHNldEltbWVkaWF0ZSQxO1xuZXhwb3J0cy5zb21lID0gc29tZTtcbmV4cG9ydHMuc29tZUxpbWl0ID0gc29tZUxpbWl0O1xuZXhwb3J0cy5zb21lU2VyaWVzID0gc29tZVNlcmllcztcbmV4cG9ydHMuc29ydEJ5ID0gc29ydEJ5O1xuZXhwb3J0cy50aW1lb3V0ID0gdGltZW91dDtcbmV4cG9ydHMudGltZXMgPSB0aW1lcztcbmV4cG9ydHMudGltZXNMaW1pdCA9IHRpbWVMaW1pdDtcbmV4cG9ydHMudGltZXNTZXJpZXMgPSB0aW1lc1NlcmllcztcbmV4cG9ydHMudHJhbnNmb3JtID0gdHJhbnNmb3JtO1xuZXhwb3J0cy50cnlFYWNoID0gdHJ5RWFjaDtcbmV4cG9ydHMudW5tZW1vaXplID0gdW5tZW1vaXplO1xuZXhwb3J0cy51bnRpbCA9IHVudGlsO1xuZXhwb3J0cy53YXRlcmZhbGwgPSB3YXRlcmZhbGw7XG5leHBvcnRzLndoaWxzdCA9IHdoaWxzdDtcbmV4cG9ydHMuYWxsID0gZXZlcnk7XG5leHBvcnRzLmFsbExpbWl0ID0gZXZlcnlMaW1pdDtcbmV4cG9ydHMuYWxsU2VyaWVzID0gZXZlcnlTZXJpZXM7XG5leHBvcnRzLmFueSA9IHNvbWU7XG5leHBvcnRzLmFueUxpbWl0ID0gc29tZUxpbWl0O1xuZXhwb3J0cy5hbnlTZXJpZXMgPSBzb21lU2VyaWVzO1xuZXhwb3J0cy5maW5kID0gZGV0ZWN0O1xuZXhwb3J0cy5maW5kTGltaXQgPSBkZXRlY3RMaW1pdDtcbmV4cG9ydHMuZmluZFNlcmllcyA9IGRldGVjdFNlcmllcztcbmV4cG9ydHMuZm9yRWFjaCA9IGVhY2hMaW1pdDtcbmV4cG9ydHMuZm9yRWFjaFNlcmllcyA9IGVhY2hTZXJpZXM7XG5leHBvcnRzLmZvckVhY2hMaW1pdCA9IGVhY2hMaW1pdCQxO1xuZXhwb3J0cy5mb3JFYWNoT2YgPSBlYWNoT2Y7XG5leHBvcnRzLmZvckVhY2hPZlNlcmllcyA9IGVhY2hPZlNlcmllcztcbmV4cG9ydHMuZm9yRWFjaE9mTGltaXQgPSBlYWNoT2ZMaW1pdDtcbmV4cG9ydHMuaW5qZWN0ID0gcmVkdWNlO1xuZXhwb3J0cy5mb2xkbCA9IHJlZHVjZTtcbmV4cG9ydHMuZm9sZHIgPSByZWR1Y2VSaWdodDtcbmV4cG9ydHMuc2VsZWN0ID0gZmlsdGVyO1xuZXhwb3J0cy5zZWxlY3RMaW1pdCA9IGZpbHRlckxpbWl0O1xuZXhwb3J0cy5zZWxlY3RTZXJpZXMgPSBmaWx0ZXJTZXJpZXM7XG5leHBvcnRzLndyYXBTeW5jID0gYXN5bmNpZnk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKSk7XG4iXX0=