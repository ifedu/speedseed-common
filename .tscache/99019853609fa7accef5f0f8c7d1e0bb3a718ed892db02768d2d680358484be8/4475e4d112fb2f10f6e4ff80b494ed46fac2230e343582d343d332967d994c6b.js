// Copyright (c) Microsoft, All rights reserved. See License.txt in the project root for license information.
;
(function (undefined) {
    var objectTypes = {
        'function': true,
        'object': true
    };
    function checkGlobal(value) {
        return (value && value.Object === Object) ? value : null;
    }
    var freeExports = (objectTypes[typeof exports] && exports && !exports.nodeType) ? exports : null;
    var freeModule = (objectTypes[typeof module] && module && !module.nodeType) ? module : null;
    var freeGlobal = checkGlobal(freeExports && freeModule && typeof global === 'object' && global);
    var freeSelf = checkGlobal(objectTypes[typeof self] && self);
    var freeWindow = checkGlobal(objectTypes[typeof window] && window);
    var moduleExports = (freeModule && freeModule.exports === freeExports) ? freeExports : null;
    var thisGlobal = checkGlobal(objectTypes[typeof this] && this);
    var root = freeGlobal || ((freeWindow !== (thisGlobal && thisGlobal.window)) && freeWindow) || freeSelf || thisGlobal || Function('return this')();
    var Rx = {
        internals: {},
        config: {
            Promise: root.Promise
        },
        helpers: {}
    };
    // Defaults
    var noop = Rx.helpers.noop = function () { }, identity = Rx.helpers.identity = function (x) { return x; }, defaultNow = Rx.helpers.defaultNow = Date.now, defaultComparer = Rx.helpers.defaultComparer = function (x, y) { return isEqual(x, y); }, defaultSubComparer = Rx.helpers.defaultSubComparer = function (x, y) { return x > y ? 1 : (x < y ? -1 : 0); }, defaultKeySerializer = Rx.helpers.defaultKeySerializer = function (x) { return x.toString(); }, defaultError = Rx.helpers.defaultError = function (err) { throw err; }, isPromise = Rx.helpers.isPromise = function (p) { return !!p && typeof p.subscribe !== 'function' && typeof p.then === 'function'; }, isFunction = Rx.helpers.isFunction = (function () {
        var isFn = function (value) {
            return typeof value == 'function' || false;
        };
        // fallback for older versions of Chrome and Safari
        if (isFn(/x/)) {
            isFn = function (value) {
                return typeof value == 'function' && toString.call(value) == '[object Function]';
            };
        }
        return isFn;
    }());
    function cloneArray(arr) { for (var a = [], i = 0, len = arr.length; i < len; i++) {
        a.push(arr[i]);
    } return a; }
    var errorObj = { e: {} };
    function tryCatcherGen(tryCatchTarget) {
        return function tryCatcher() {
            try {
                return tryCatchTarget.apply(this, arguments);
            }
            catch (e) {
                errorObj.e = e;
                return errorObj;
            }
        };
    }
    var tryCatch = Rx.internals.tryCatch = function tryCatch(fn) {
        if (!isFunction(fn)) {
            throw new TypeError('fn must be a function');
        }
        return tryCatcherGen(fn);
    };
    function thrower(e) {
        throw e;
    }
    Rx.config.longStackSupport = false;
    var hasStacks = false, stacks = tryCatch(function () { throw new Error(); })();
    hasStacks = !!stacks.e && !!stacks.e.stack;
    // All code after this point will be filtered from stack traces reported by RxJS
    var rStartingLine = captureLine(), rFileName;
    var STACK_JUMP_SEPARATOR = 'From previous event:';
    function makeStackTraceLong(error, observable) {
        // If possible, transform the error stack trace by removing Node and RxJS
        // cruft, then concatenating with the stack trace of `observable`.
        if (hasStacks &&
            observable.stack &&
            typeof error === 'object' &&
            error !== null &&
            error.stack &&
            error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1) {
            var stacks = [];
            for (var o = observable; !!o; o = o.source) {
                if (o.stack) {
                    stacks.unshift(o.stack);
                }
            }
            stacks.unshift(error.stack);
            var concatedStacks = stacks.join('\n' + STACK_JUMP_SEPARATOR + '\n');
            error.stack = filterStackString(concatedStacks);
        }
    }
    function filterStackString(stackString) {
        var lines = stackString.split('\n'), desiredLines = [];
        for (var i = 0, len = lines.length; i < len; i++) {
            var line = lines[i];
            if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
                desiredLines.push(line);
            }
        }
        return desiredLines.join('\n');
    }
    function isInternalFrame(stackLine) {
        var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);
        if (!fileNameAndLineNumber) {
            return false;
        }
        var fileName = fileNameAndLineNumber[0], lineNumber = fileNameAndLineNumber[1];
        return fileName === rFileName &&
            lineNumber >= rStartingLine &&
            lineNumber <= rEndingLine;
    }
    function isNodeFrame(stackLine) {
        return stackLine.indexOf('(module.js:') !== -1 ||
            stackLine.indexOf('(node.js:') !== -1;
    }
    function captureLine() {
        if (!hasStacks) {
            return;
        }
        try {
            throw new Error();
        }
        catch (e) {
            var lines = e.stack.split('\n');
            var firstLine = lines[0].indexOf('@') > 0 ? lines[1] : lines[2];
            var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
            if (!fileNameAndLineNumber) {
                return;
            }
            rFileName = fileNameAndLineNumber[0];
            return fileNameAndLineNumber[1];
        }
    }
    function getFileNameAndLineNumber(stackLine) {
        // Named functions: 'at functionName (filename:lineNumber:columnNumber)'
        var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
        if (attempt1) {
            return [attempt1[1], Number(attempt1[2])];
        }
        // Anonymous functions: 'at filename:lineNumber:columnNumber'
        var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
        if (attempt2) {
            return [attempt2[1], Number(attempt2[2])];
        }
        // Firefox style: 'function@filename:lineNumber or @filename:lineNumber'
        var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
        if (attempt3) {
            return [attempt3[1], Number(attempt3[2])];
        }
    }
    var EmptyError = Rx.EmptyError = function () {
        this.message = 'Sequence contains no elements.';
        Error.call(this);
    };
    EmptyError.prototype = Object.create(Error.prototype);
    EmptyError.prototype.name = 'EmptyError';
    var ObjectDisposedError = Rx.ObjectDisposedError = function () {
        this.message = 'Object has been disposed';
        Error.call(this);
    };
    ObjectDisposedError.prototype = Object.create(Error.prototype);
    ObjectDisposedError.prototype.name = 'ObjectDisposedError';
    var ArgumentOutOfRangeError = Rx.ArgumentOutOfRangeError = function () {
        this.message = 'Argument out of range';
        Error.call(this);
    };
    ArgumentOutOfRangeError.prototype = Object.create(Error.prototype);
    ArgumentOutOfRangeError.prototype.name = 'ArgumentOutOfRangeError';
    var NotSupportedError = Rx.NotSupportedError = function (message) {
        this.message = message || 'This operation is not supported';
        Error.call(this);
    };
    NotSupportedError.prototype = Object.create(Error.prototype);
    NotSupportedError.prototype.name = 'NotSupportedError';
    var NotImplementedError = Rx.NotImplementedError = function (message) {
        this.message = message || 'This operation is not implemented';
        Error.call(this);
    };
    NotImplementedError.prototype = Object.create(Error.prototype);
    NotImplementedError.prototype.name = 'NotImplementedError';
    var notImplemented = Rx.helpers.notImplemented = function () {
        throw new NotImplementedError();
    };
    var notSupported = Rx.helpers.notSupported = function () {
        throw new NotSupportedError();
    };
    // Shim in iterator support
    var $iterator$ = (typeof Symbol === 'function' && Symbol.iterator) ||
        '_es6shim_iterator_';
    // Bug for mozilla version
    if (root.Set && typeof new root.Set()['@@iterator'] === 'function') {
        $iterator$ = '@@iterator';
    }
    var doneEnumerator = Rx.doneEnumerator = { done: true, value: undefined };
    var isIterable = Rx.helpers.isIterable = function (o) {
        return o && o[$iterator$] !== undefined;
    };
    var isArrayLike = Rx.helpers.isArrayLike = function (o) {
        return o && o.length !== undefined;
    };
    Rx.helpers.iterator = $iterator$;
    var bindCallback = Rx.internals.bindCallback = function (func, thisArg, argCount) {
        if (typeof thisArg === 'undefined') {
            return func;
        }
        switch (argCount) {
            case 0:
                return function () {
                    return func.call(thisArg);
                };
            case 1:
                return function (arg) {
                    return func.call(thisArg, arg);
                };
            case 2:
                return function (value, index) {
                    return func.call(thisArg, value, index);
                };
            case 3:
                return function (value, index, collection) {
                    return func.call(thisArg, value, index, collection);
                };
        }
        return function () {
            return func.apply(thisArg, arguments);
        };
    };
    /** Used to determine if values are of the language type Object */
    var dontEnums = ['toString',
        'toLocaleString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'constructor'], dontEnumsLength = dontEnums.length;
    var argsTag = '[object Arguments]', arrayTag = '[object Array]', boolTag = '[object Boolean]', dateTag = '[object Date]', errorTag = '[object Error]', funcTag = '[object Function]', mapTag = '[object Map]', numberTag = '[object Number]', objectTag = '[object Object]', regexpTag = '[object RegExp]', setTag = '[object Set]', stringTag = '[object String]', weakMapTag = '[object WeakMap]';
    var arrayBufferTag = '[object ArrayBuffer]', float32Tag = '[object Float32Array]', float64Tag = '[object Float64Array]', int8Tag = '[object Int8Array]', int16Tag = '[object Int16Array]', int32Tag = '[object Int32Array]', uint8Tag = '[object Uint8Array]', uint8ClampedTag = '[object Uint8ClampedArray]', uint16Tag = '[object Uint16Array]', uint32Tag = '[object Uint32Array]';
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
        typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
            typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
                typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
                    typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
        typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
            typedArrayTags[dateTag] = typedArrayTags[errorTag] =
                typedArrayTags[funcTag] = typedArrayTags[mapTag] =
                    typedArrayTags[numberTag] = typedArrayTags[objectTag] =
                        typedArrayTags[regexpTag] = typedArrayTags[setTag] =
                            typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
    var objectProto = Object.prototype, hasOwnProperty = objectProto.hasOwnProperty, objToString = objectProto.toString, MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
    var keys = Object.keys || (function () {
        var hasOwnProperty = Object.prototype.hasOwnProperty, hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'), dontEnums = [
            'toString',
            'toLocaleString',
            'valueOf',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'constructor'
        ], dontEnumsLength = dontEnums.length;
        return function (obj) {
            if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
                throw new TypeError('Object.keys called on non-object');
            }
            var result = [], prop, i;
            for (prop in obj) {
                if (hasOwnProperty.call(obj, prop)) {
                    result.push(prop);
                }
            }
            if (hasDontEnumBug) {
                for (i = 0; i < dontEnumsLength; i++) {
                    if (hasOwnProperty.call(obj, dontEnums[i])) {
                        result.push(dontEnums[i]);
                    }
                }
            }
            return result;
        };
    }());
    function equalObjects(object, other, equalFunc, isLoose, stackA, stackB) {
        var objProps = keys(object), objLength = objProps.length, othProps = keys(other), othLength = othProps.length;
        if (objLength !== othLength && !isLoose) {
            return false;
        }
        var index = objLength, key;
        while (index--) {
            key = objProps[index];
            if (!(isLoose ? key in other : hasOwnProperty.call(other, key))) {
                return false;
            }
        }
        var skipCtor = isLoose;
        while (++index < objLength) {
            key = objProps[index];
            var objValue = object[key], othValue = other[key], result;
            if (!(result === undefined ? equalFunc(objValue, othValue, isLoose, stackA, stackB) : result)) {
                return false;
            }
            skipCtor || (skipCtor = key === 'constructor');
        }
        if (!skipCtor) {
            var objCtor = object.constructor, othCtor = other.constructor;
            if (objCtor !== othCtor &&
                ('constructor' in object && 'constructor' in other) &&
                !(typeof objCtor === 'function' && objCtor instanceof objCtor &&
                    typeof othCtor === 'function' && othCtor instanceof othCtor)) {
                return false;
            }
        }
        return true;
    }
    function equalByTag(object, other, tag) {
        switch (tag) {
            case boolTag:
            case dateTag:
                return +object === +other;
            case errorTag:
                return object.name === other.name && object.message === other.message;
            case numberTag:
                return (object !== +object) ?
                    other !== +other :
                    object === +other;
            case regexpTag:
            case stringTag:
                return object === (other + '');
        }
        return false;
    }
    var isObject = Rx.internals.isObject = function (value) {
        var type = typeof value;
        return !!value && (type === 'object' || type === 'function');
    };
    function isObjectLike(value) {
        return !!value && typeof value === 'object';
    }
    function isLength(value) {
        return typeof value === 'number' && value > -1 && value % 1 === 0 && value <= MAX_SAFE_INTEGER;
    }
    var isHostObject = (function () {
        try {
            Object({ 'toString': 0 } + '');
        }
        catch (e) {
            return function () { return false; };
        }
        return function (value) {
            return typeof value.toString !== 'function' && typeof (value + '') === 'string';
        };
    }());
    function isTypedArray(value) {
        return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objToString.call(value)];
    }
    var isArray = Array.isArray || function (value) {
        return isObjectLike(value) && isLength(value.length) && objToString.call(value) === arrayTag;
    };
    function arraySome(array, predicate) {
        var index = -1, length = array.length;
        while (++index < length) {
            if (predicate(array[index], index, array)) {
                return true;
            }
        }
        return false;
    }
    function equalArrays(array, other, equalFunc, isLoose, stackA, stackB) {
        var index = -1, arrLength = array.length, othLength = other.length;
        if (arrLength !== othLength && !(isLoose && othLength > arrLength)) {
            return false;
        }
        // Ignore non-index properties.
        while (++index < arrLength) {
            var arrValue = array[index], othValue = other[index], result;
            if (result !== undefined) {
                if (result) {
                    continue;
                }
                return false;
            }
            // Recursively compare arrays (susceptible to call stack limits).
            if (isLoose) {
                if (!arraySome(other, function (othValue) {
                    return arrValue === othValue || equalFunc(arrValue, othValue, isLoose, stackA, stackB);
                })) {
                    return false;
                }
            }
            else if (!(arrValue === othValue || equalFunc(arrValue, othValue, isLoose, stackA, stackB))) {
                return false;
            }
        }
        return true;
    }
    function baseIsEqualDeep(object, other, equalFunc, isLoose, stackA, stackB) {
        var objIsArr = isArray(object), othIsArr = isArray(other), objTag = arrayTag, othTag = arrayTag;
        if (!objIsArr) {
            objTag = objToString.call(object);
            if (objTag === argsTag) {
                objTag = objectTag;
            }
            else if (objTag !== objectTag) {
                objIsArr = isTypedArray(object);
            }
        }
        if (!othIsArr) {
            othTag = objToString.call(other);
            if (othTag === argsTag) {
                othTag = objectTag;
            }
        }
        var objIsObj = objTag === objectTag && !isHostObject(object), othIsObj = othTag === objectTag && !isHostObject(other), isSameTag = objTag === othTag;
        if (isSameTag && !(objIsArr || objIsObj)) {
            return equalByTag(object, other, objTag);
        }
        if (!isLoose) {
            var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'), othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');
            if (objIsWrapped || othIsWrapped) {
                return equalFunc(objIsWrapped ? object.value() : object, othIsWrapped ? other.value() : other, isLoose, stackA, stackB);
            }
        }
        if (!isSameTag) {
            return false;
        }
        // Assume cyclic values are equal.
        // For more information on detecting circular references see https://es5.github.io/#JO.
        stackA || (stackA = []);
        stackB || (stackB = []);
        var length = stackA.length;
        while (length--) {
            if (stackA[length] === object) {
                return stackB[length] === other;
            }
        }
        // Add `object` and `other` to the stack of traversed objects.
        stackA.push(object);
        stackB.push(other);
        var result = (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, isLoose, stackA, stackB);
        stackA.pop();
        stackB.pop();
        return result;
    }
    function baseIsEqual(value, other, isLoose, stackA, stackB) {
        if (value === other) {
            return true;
        }
        if (value == null || other == null || (!isObject(value) && !isObjectLike(other))) {
            return value !== value && other !== other;
        }
        return baseIsEqualDeep(value, other, baseIsEqual, isLoose, stackA, stackB);
    }
    var isEqual = Rx.internals.isEqual = function (value, other) {
        return baseIsEqual(value, other);
    };
    var hasProp = {}.hasOwnProperty, slice = Array.prototype.slice;
    var inherits = Rx.internals.inherits = function (child, parent) {
        function __() { this.constructor = child; }
        __.prototype = parent.prototype;
        child.prototype = new __();
    };
    var addProperties = Rx.internals.addProperties = function (obj) {
        for (var sources = [], i = 1, len = arguments.length; i < len; i++) {
            sources.push(arguments[i]);
        }
        for (var idx = 0, ln = sources.length; idx < ln; idx++) {
            var source = sources[idx];
            for (var prop in source) {
                obj[prop] = source[prop];
            }
        }
    };
    // Rx Utils
    var addRef = Rx.internals.addRef = function (xs, r) {
        return new AnonymousObservable(function (observer) {
            return new BinaryDisposable(r.getDisposable(), xs.subscribe(observer));
        });
    };
    function arrayInitialize(count, factory) {
        var a = new Array(count);
        for (var i = 0; i < count; i++) {
            a[i] = factory();
        }
        return a;
    }
    /**
     * Represents a group of disposable resources that are disposed together.
     * @constructor
     */
    var CompositeDisposable = Rx.CompositeDisposable = function () {
        var args = [], i, len;
        if (Array.isArray(arguments[0])) {
            args = arguments[0];
        }
        else {
            len = arguments.length;
            args = new Array(len);
            for (i = 0; i < len; i++) {
                args[i] = arguments[i];
            }
        }
        this.disposables = args;
        this.isDisposed = false;
        this.length = args.length;
    };
    var CompositeDisposablePrototype = CompositeDisposable.prototype;
    /**
     * Adds a disposable to the CompositeDisposable or disposes the disposable if the CompositeDisposable is disposed.
     * @param {Mixed} item Disposable to add.
     */
    CompositeDisposablePrototype.add = function (item) {
        if (this.isDisposed) {
            item.dispose();
        }
        else {
            this.disposables.push(item);
            this.length++;
        }
    };
    /**
     * Removes and disposes the first occurrence of a disposable from the CompositeDisposable.
     * @param {Mixed} item Disposable to remove.
     * @returns {Boolean} true if found; false otherwise.
     */
    CompositeDisposablePrototype.remove = function (item) {
        var shouldDispose = false;
        if (!this.isDisposed) {
            var idx = this.disposables.indexOf(item);
            if (idx !== -1) {
                shouldDispose = true;
                this.disposables.splice(idx, 1);
                this.length--;
                item.dispose();
            }
        }
        return shouldDispose;
    };
    /**
     *  Disposes all disposables in the group and removes them from the group.
     */
    CompositeDisposablePrototype.dispose = function () {
        if (!this.isDisposed) {
            this.isDisposed = true;
            var len = this.disposables.length, currentDisposables = new Array(len);
            for (var i = 0; i < len; i++) {
                currentDisposables[i] = this.disposables[i];
            }
            this.disposables = [];
            this.length = 0;
            for (i = 0; i < len; i++) {
                currentDisposables[i].dispose();
            }
        }
    };
    /**
     * Provides a set of static methods for creating Disposables.
     * @param {Function} dispose Action to run during the first call to dispose. The action is guaranteed to be run at most once.
     */
    var Disposable = Rx.Disposable = function (action) {
        this.isDisposed = false;
        this.action = action || noop;
    };
    /** Performs the task of cleaning up resources. */
    Disposable.prototype.dispose = function () {
        if (!this.isDisposed) {
            this.action();
            this.isDisposed = true;
        }
    };
    /**
     * Creates a disposable object that invokes the specified action when disposed.
     * @param {Function} dispose Action to run during the first call to dispose. The action is guaranteed to be run at most once.
     * @return {Disposable} The disposable object that runs the given action upon disposal.
     */
    var disposableCreate = Disposable.create = function (action) { return new Disposable(action); };
    /**
     * Gets the disposable that does nothing when disposed.
     */
    var disposableEmpty = Disposable.empty = { dispose: noop };
    /**
     * Validates whether the given object is a disposable
     * @param {Object} Object to test whether it has a dispose method
     * @returns {Boolean} true if a disposable object, else false.
     */
    var isDisposable = Disposable.isDisposable = function (d) {
        return d && isFunction(d.dispose);
    };
    var checkDisposed = Disposable.checkDisposed = function (disposable) {
        if (disposable.isDisposed) {
            throw new ObjectDisposedError();
        }
    };
    var disposableFixup = Disposable._fixup = function (result) {
        return isDisposable(result) ? result : disposableEmpty;
    };
    // Single assignment
    var SingleAssignmentDisposable = Rx.SingleAssignmentDisposable = function () {
        this.isDisposed = false;
        this.current = null;
    };
    SingleAssignmentDisposable.prototype.getDisposable = function () {
        return this.current;
    };
    SingleAssignmentDisposable.prototype.setDisposable = function (value) {
        if (this.current) {
            throw new Error('Disposable has already been assigned');
        }
        var shouldDispose = this.isDisposed;
        !shouldDispose && (this.current = value);
        shouldDispose && value && value.dispose();
    };
    SingleAssignmentDisposable.prototype.dispose = function () {
        if (!this.isDisposed) {
            this.isDisposed = true;
            var old = this.current;
            this.current = null;
            old && old.dispose();
        }
    };
    // Multiple assignment disposable
    var SerialDisposable = Rx.SerialDisposable = function () {
        this.isDisposed = false;
        this.current = null;
    };
    SerialDisposable.prototype.getDisposable = function () {
        return this.current;
    };
    SerialDisposable.prototype.setDisposable = function (value) {
        var shouldDispose = this.isDisposed;
        if (!shouldDispose) {
            var old = this.current;
            this.current = value;
        }
        old && old.dispose();
        shouldDispose && value && value.dispose();
    };
    SerialDisposable.prototype.dispose = function () {
        if (!this.isDisposed) {
            this.isDisposed = true;
            var old = this.current;
            this.current = null;
        }
        old && old.dispose();
    };
    var BinaryDisposable = Rx.BinaryDisposable = function (first, second) {
        this._first = first;
        this._second = second;
        this.isDisposed = false;
    };
    BinaryDisposable.prototype.dispose = function () {
        if (!this.isDisposed) {
            this.isDisposed = true;
            var old1 = this._first;
            this._first = null;
            old1 && old1.dispose();
            var old2 = this._second;
            this._second = null;
            old2 && old2.dispose();
        }
    };
    var NAryDisposable = Rx.NAryDisposable = function (disposables) {
        this._disposables = disposables;
        this.isDisposed = false;
    };
    NAryDisposable.prototype.dispose = function () {
        if (!this.isDisposed) {
            this.isDisposed = true;
            for (var i = 0, len = this._disposables.length; i < len; i++) {
                this._disposables[i].dispose();
            }
            this._disposables.length = 0;
        }
    };
    /**
     * Represents a disposable resource that only disposes its underlying disposable resource when all dependent disposable objects have been disposed.
     */
    var RefCountDisposable = Rx.RefCountDisposable = (function () {
        function InnerDisposable(disposable) {
            this.disposable = disposable;
            this.disposable.count++;
            this.isInnerDisposed = false;
        }
        InnerDisposable.prototype.dispose = function () {
            if (!this.disposable.isDisposed && !this.isInnerDisposed) {
                this.isInnerDisposed = true;
                this.disposable.count--;
                if (this.disposable.count === 0 && this.disposable.isPrimaryDisposed) {
                    this.disposable.isDisposed = true;
                    this.disposable.underlyingDisposable.dispose();
                }
            }
        };
        /**
         * Initializes a new instance of the RefCountDisposable with the specified disposable.
         * @constructor
         * @param {Disposable} disposable Underlying disposable.
          */
        function RefCountDisposable(disposable) {
            this.underlyingDisposable = disposable;
            this.isDisposed = false;
            this.isPrimaryDisposed = false;
            this.count = 0;
        }
        /**
         * Disposes the underlying disposable only when all dependent disposables have been disposed
         */
        RefCountDisposable.prototype.dispose = function () {
            if (!this.isDisposed && !this.isPrimaryDisposed) {
                this.isPrimaryDisposed = true;
                if (this.count === 0) {
                    this.isDisposed = true;
                    this.underlyingDisposable.dispose();
                }
            }
        };
        /**
         * Returns a dependent disposable that when disposed decreases the refcount on the underlying disposable.
         * @returns {Disposable} A dependent disposable contributing to the reference count that manages the underlying disposable's lifetime.
         */
        RefCountDisposable.prototype.getDisposable = function () {
            return this.isDisposed ? disposableEmpty : new InnerDisposable(this);
        };
        return RefCountDisposable;
    })();
    function ScheduledDisposable(scheduler, disposable) {
        this.scheduler = scheduler;
        this.disposable = disposable;
        this.isDisposed = false;
    }
    function scheduleItem(s, self) {
        if (!self.isDisposed) {
            self.isDisposed = true;
            self.disposable.dispose();
        }
    }
    ScheduledDisposable.prototype.dispose = function () {
        this.scheduler.schedule(this, scheduleItem);
    };
    var ScheduledItem = Rx.internals.ScheduledItem = function (scheduler, state, action, dueTime, comparer) {
        this.scheduler = scheduler;
        this.state = state;
        this.action = action;
        this.dueTime = dueTime;
        this.comparer = comparer || defaultSubComparer;
        this.disposable = new SingleAssignmentDisposable();
    };
    ScheduledItem.prototype.invoke = function () {
        this.disposable.setDisposable(this.invokeCore());
    };
    ScheduledItem.prototype.compareTo = function (other) {
        return this.comparer(this.dueTime, other.dueTime);
    };
    ScheduledItem.prototype.isCancelled = function () {
        return this.disposable.isDisposed;
    };
    ScheduledItem.prototype.invokeCore = function () {
        return disposableFixup(this.action(this.scheduler, this.state));
    };
    /** Provides a set of static properties to access commonly used schedulers. */
    var Scheduler = Rx.Scheduler = (function () {
        function Scheduler() { }
        /** Determines whether the given object is a scheduler */
        Scheduler.isScheduler = function (s) {
            return s instanceof Scheduler;
        };
        var schedulerProto = Scheduler.prototype;
        /**
       * Schedules an action to be executed.
       * @param state State passed to the action to be executed.
       * @param {Function} action Action to be executed.
       * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
       */
        schedulerProto.schedule = function (state, action) {
            throw new NotImplementedError();
        };
        /**
         * Schedules an action to be executed after dueTime.
         * @param state State passed to the action to be executed.
         * @param {Function} action Action to be executed.
         * @param {Number} dueTime Relative time after which to execute the action.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleFuture = function (state, dueTime, action) {
            var dt = dueTime;
            dt instanceof Date && (dt = dt - this.now());
            dt = Scheduler.normalize(dt);
            if (dt === 0) {
                return this.schedule(state, action);
            }
            return this._scheduleFuture(state, dt, action);
        };
        schedulerProto._scheduleFuture = function (state, dueTime, action) {
            throw new NotImplementedError();
        };
        /** Gets the current time according to the local machine's system clock. */
        Scheduler.now = defaultNow;
        /** Gets the current time according to the local machine's system clock. */
        Scheduler.prototype.now = defaultNow;
        /**
         * Normalizes the specified TimeSpan value to a positive value.
         * @param {Number} timeSpan The time span value to normalize.
         * @returns {Number} The specified TimeSpan value if it is zero or positive; otherwise, 0
         */
        Scheduler.normalize = function (timeSpan) {
            timeSpan < 0 && (timeSpan = 0);
            return timeSpan;
        };
        return Scheduler;
    }());
    var normalizeTime = Scheduler.normalize, isScheduler = Scheduler.isScheduler;
    (function (schedulerProto) {
        function invokeRecImmediate(scheduler, pair) {
            var state = pair[0], action = pair[1], group = new CompositeDisposable();
            action(state, innerAction);
            return group;
            function innerAction(state2) {
                var isAdded = false, isDone = false;
                var d = scheduler.schedule(state2, scheduleWork);
                if (!isDone) {
                    group.add(d);
                    isAdded = true;
                }
                function scheduleWork(_, state3) {
                    if (isAdded) {
                        group.remove(d);
                    }
                    else {
                        isDone = true;
                    }
                    action(state3, innerAction);
                    return disposableEmpty;
                }
            }
        }
        function invokeRecDate(scheduler, pair) {
            var state = pair[0], action = pair[1], group = new CompositeDisposable();
            action(state, innerAction);
            return group;
            function innerAction(state2, dueTime1) {
                var isAdded = false, isDone = false;
                var d = scheduler.scheduleFuture(state2, dueTime1, scheduleWork);
                if (!isDone) {
                    group.add(d);
                    isAdded = true;
                }
                function scheduleWork(_, state3) {
                    if (isAdded) {
                        group.remove(d);
                    }
                    else {
                        isDone = true;
                    }
                    action(state3, innerAction);
                    return disposableEmpty;
                }
            }
        }
        /**
         * Schedules an action to be executed recursively.
         * @param {Mixed} state State passed to the action to be executed.
         * @param {Function} action Action to execute recursively. The last parameter passed to the action is used to trigger recursive scheduling of the action, passing in recursive invocation state.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleRecursive = function (state, action) {
            return this.schedule([state, action], invokeRecImmediate);
        };
        /**
         * Schedules an action to be executed recursively after a specified relative or absolute due time.
         * @param {Mixed} state State passed to the action to be executed.
         * @param {Function} action Action to execute recursively. The last parameter passed to the action is used to trigger recursive scheduling of the action, passing in the recursive due time and invocation state.
         * @param {Number | Date} dueTime Relative or absolute time after which to execute the action for the first time.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleRecursiveFuture = function (state, dueTime, action) {
            return this.scheduleFuture([state, action], dueTime, invokeRecDate);
        };
    }(Scheduler.prototype));
    (function (schedulerProto) {
        /**
         * Schedules a periodic piece of work by dynamically discovering the scheduler's capabilities. The periodic task will be scheduled using window.setInterval for the base implementation.
         * @param {Mixed} state Initial state passed to the action upon the first iteration.
         * @param {Number} period Period for running the work periodically.
         * @param {Function} action Action to be executed, potentially updating the state.
         * @returns {Disposable} The disposable object used to cancel the scheduled recurring action (best effort).
         */
        schedulerProto.schedulePeriodic = function (state, period, action) {
            if (typeof root.setInterval === 'undefined') {
                throw new NotSupportedError();
            }
            period = normalizeTime(period);
            var s = state, id = root.setInterval(function () { s = action(s); }, period);
            return disposableCreate(function () { root.clearInterval(id); });
        };
    }(Scheduler.prototype));
    (function (schedulerProto) {
        /**
         * Returns a scheduler that wraps the original scheduler, adding exception handling for scheduled actions.
         * @param {Function} handler Handler that's run if an exception is caught. The exception will be rethrown if the handler returns false.
         * @returns {Scheduler} Wrapper around the original scheduler, enforcing exception handling.
         */
        schedulerProto.catchError = schedulerProto['catch'] = function (handler) {
            return new CatchScheduler(this, handler);
        };
    }(Scheduler.prototype));
    var SchedulePeriodicRecursive = Rx.internals.SchedulePeriodicRecursive = (function () {
        function createTick(self) {
            return function tick(command, recurse) {
                recurse(0, self._period);
                var state = tryCatch(self._action)(self._state);
                if (state === errorObj) {
                    self._cancel.dispose();
                    thrower(state.e);
                }
                self._state = state;
            };
        }
        function SchedulePeriodicRecursive(scheduler, state, period, action) {
            this._scheduler = scheduler;
            this._state = state;
            this._period = period;
            this._action = action;
        }
        SchedulePeriodicRecursive.prototype.start = function () {
            var d = new SingleAssignmentDisposable();
            this._cancel = d;
            d.setDisposable(this._scheduler.scheduleRecursiveFuture(0, this._period, createTick(this)));
            return d;
        };
        return SchedulePeriodicRecursive;
    }());
    /** Gets a scheduler that schedules work immediately on the current thread. */
    var ImmediateScheduler = (function (__super__) {
        inherits(ImmediateScheduler, __super__);
        function ImmediateScheduler() {
            __super__.call(this);
        }
        ImmediateScheduler.prototype.schedule = function (state, action) {
            return disposableFixup(action(this, state));
        };
        return ImmediateScheduler;
    }(Scheduler));
    var immediateScheduler = Scheduler.immediate = new ImmediateScheduler();
    /**
     * Gets a scheduler that schedules work as soon as possible on the current thread.
     */
    var CurrentThreadScheduler = (function (__super__) {
        var queue;
        function runTrampoline() {
            while (queue.length > 0) {
                var item = queue.dequeue();
                !item.isCancelled() && item.invoke();
            }
        }
        inherits(CurrentThreadScheduler, __super__);
        function CurrentThreadScheduler() {
            __super__.call(this);
        }
        CurrentThreadScheduler.prototype.schedule = function (state, action) {
            var si = new ScheduledItem(this, state, action, this.now());
            if (!queue) {
                queue = new PriorityQueue(4);
                queue.enqueue(si);
                var result = tryCatch(runTrampoline)();
                queue = null;
                if (result === errorObj) {
                    thrower(result.e);
                }
            }
            else {
                queue.enqueue(si);
            }
            return si.disposable;
        };
        CurrentThreadScheduler.prototype.scheduleRequired = function () { return !queue; };
        return CurrentThreadScheduler;
    }(Scheduler));
    var currentThreadScheduler = Scheduler.currentThread = new CurrentThreadScheduler();
    var scheduleMethod, clearMethod;
    var localTimer = (function () {
        var localSetTimeout, localClearTimeout = noop;
        if (!!root.setTimeout) {
            localSetTimeout = root.setTimeout;
            localClearTimeout = root.clearTimeout;
        }
        else if (!!root.WScript) {
            localSetTimeout = function (fn, time) {
                root.WScript.Sleep(time);
                fn();
            };
        }
        else {
            throw new NotSupportedError();
        }
        return {
            setTimeout: localSetTimeout,
            clearTimeout: localClearTimeout
        };
    }());
    var localSetTimeout = localTimer.setTimeout, localClearTimeout = localTimer.clearTimeout;
    (function () {
        var nextHandle = 1, tasksByHandle = {}, currentlyRunning = false;
        clearMethod = function (handle) {
            delete tasksByHandle[handle];
        };
        function runTask(handle) {
            if (currentlyRunning) {
                localSetTimeout(function () { runTask(handle); }, 0);
            }
            else {
                var task = tasksByHandle[handle];
                if (task) {
                    currentlyRunning = true;
                    var result = tryCatch(task)();
                    clearMethod(handle);
                    currentlyRunning = false;
                    if (result === errorObj) {
                        thrower(result.e);
                    }
                }
            }
        }
        var reNative = new RegExp('^' +
            String(toString)
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                .replace(/toString| for [^\]]+/g, '.*?') + '$');
        var setImmediate = typeof (setImmediate = freeGlobal && moduleExports && freeGlobal.setImmediate) == 'function' &&
            !reNative.test(setImmediate) && setImmediate;
        function postMessageSupported() {
            // Ensure not in a worker
            if (!root.postMessage || root.importScripts) {
                return false;
            }
            var isAsync = false, oldHandler = root.onmessage;
            // Test for async
            root.onmessage = function () { isAsync = true; };
            root.postMessage('', '*');
            root.onmessage = oldHandler;
            return isAsync;
        }
        // Use in order, setImmediate, nextTick, postMessage, MessageChannel, script readystatechanged, setTimeout
        if (isFunction(setImmediate)) {
            scheduleMethod = function (action) {
                var id = nextHandle++;
                tasksByHandle[id] = action;
                setImmediate(function () { runTask(id); });
                return id;
            };
        }
        else if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
            scheduleMethod = function (action) {
                var id = nextHandle++;
                tasksByHandle[id] = action;
                process.nextTick(function () { runTask(id); });
                return id;
            };
        }
        else if (postMessageSupported()) {
            var MSG_PREFIX = 'ms.rx.schedule' + Math.random();
            var onGlobalPostMessage = function (event) {
                // Only if we're a match to avoid any other global events
                if (typeof event.data === 'string' && event.data.substring(0, MSG_PREFIX.length) === MSG_PREFIX) {
                    runTask(event.data.substring(MSG_PREFIX.length));
                }
            };
            root.addEventListener('message', onGlobalPostMessage, false);
            scheduleMethod = function (action) {
                var id = nextHandle++;
                tasksByHandle[id] = action;
                root.postMessage(MSG_PREFIX + id, '*');
                return id;
            };
        }
        else if (!!root.MessageChannel) {
            var channel = new root.MessageChannel();
            channel.port1.onmessage = function (e) { runTask(e.data); };
            scheduleMethod = function (action) {
                var id = nextHandle++;
                tasksByHandle[id] = action;
                channel.port2.postMessage(id);
                return id;
            };
        }
        else if ('document' in root && 'onreadystatechange' in root.document.createElement('script')) {
            scheduleMethod = function (action) {
                var scriptElement = root.document.createElement('script');
                var id = nextHandle++;
                tasksByHandle[id] = action;
                scriptElement.onreadystatechange = function () {
                    runTask(id);
                    scriptElement.onreadystatechange = null;
                    scriptElement.parentNode.removeChild(scriptElement);
                    scriptElement = null;
                };
                root.document.documentElement.appendChild(scriptElement);
                return id;
            };
        }
        else {
            scheduleMethod = function (action) {
                var id = nextHandle++;
                tasksByHandle[id] = action;
                localSetTimeout(function () {
                    runTask(id);
                }, 0);
                return id;
            };
        }
    }());
    /**
     * Gets a scheduler that schedules work via a timed callback based upon platform.
     */
    var DefaultScheduler = (function (__super__) {
        inherits(DefaultScheduler, __super__);
        function DefaultScheduler() {
            __super__.call(this);
        }
        function scheduleAction(disposable, action, scheduler, state) {
            return function schedule() {
                disposable.setDisposable(Disposable._fixup(action(scheduler, state)));
            };
        }
        function ClearDisposable(id) {
            this._id = id;
            this.isDisposed = false;
        }
        ClearDisposable.prototype.dispose = function () {
            if (!this.isDisposed) {
                this.isDisposed = true;
                clearMethod(this._id);
            }
        };
        function LocalClearDisposable(id) {
            this._id = id;
            this.isDisposed = false;
        }
        LocalClearDisposable.prototype.dispose = function () {
            if (!this.isDisposed) {
                this.isDisposed = true;
                localClearTimeout(this._id);
            }
        };
        DefaultScheduler.prototype.schedule = function (state, action) {
            var disposable = new SingleAssignmentDisposable(), id = scheduleMethod(scheduleAction(disposable, action, this, state));
            return new BinaryDisposable(disposable, new ClearDisposable(id));
        };
        DefaultScheduler.prototype._scheduleFuture = function (state, dueTime, action) {
            if (dueTime === 0) {
                return this.schedule(state, action);
            }
            var disposable = new SingleAssignmentDisposable(), id = localSetTimeout(scheduleAction(disposable, action, this, state), dueTime);
            return new BinaryDisposable(disposable, new LocalClearDisposable(id));
        };
        function scheduleLongRunning(state, action, disposable) {
            return function () { action(state, disposable); };
        }
        DefaultScheduler.prototype.scheduleLongRunning = function (state, action) {
            var disposable = disposableCreate(noop);
            scheduleMethod(scheduleLongRunning(state, action, disposable));
            return disposable;
        };
        return DefaultScheduler;
    }(Scheduler));
    var defaultScheduler = Scheduler['default'] = Scheduler.async = new DefaultScheduler();
    var CatchScheduler = (function (__super__) {
        inherits(CatchScheduler, __super__);
        function CatchScheduler(scheduler, handler) {
            this._scheduler = scheduler;
            this._handler = handler;
            this._recursiveOriginal = null;
            this._recursiveWrapper = null;
            __super__.call(this);
        }
        CatchScheduler.prototype.schedule = function (state, action) {
            return this._scheduler.schedule(state, this._wrap(action));
        };
        CatchScheduler.prototype._scheduleFuture = function (state, dueTime, action) {
            return this._scheduler.schedule(state, dueTime, this._wrap(action));
        };
        CatchScheduler.prototype.now = function () { return this._scheduler.now(); };
        CatchScheduler.prototype._clone = function (scheduler) {
            return new CatchScheduler(scheduler, this._handler);
        };
        CatchScheduler.prototype._wrap = function (action) {
            var parent = this;
            return function (self, state) {
                var res = tryCatch(action)(parent._getRecursiveWrapper(self), state);
                if (res === errorObj) {
                    if (!parent._handler(res.e)) {
                        thrower(res.e);
                    }
                    return disposableEmpty;
                }
                return disposableFixup(res);
            };
        };
        CatchScheduler.prototype._getRecursiveWrapper = function (scheduler) {
            if (this._recursiveOriginal !== scheduler) {
                this._recursiveOriginal = scheduler;
                var wrapper = this._clone(scheduler);
                wrapper._recursiveOriginal = scheduler;
                wrapper._recursiveWrapper = wrapper;
                this._recursiveWrapper = wrapper;
            }
            return this._recursiveWrapper;
        };
        CatchScheduler.prototype.schedulePeriodic = function (state, period, action) {
            var self = this, failed = false, d = new SingleAssignmentDisposable();
            d.setDisposable(this._scheduler.schedulePeriodic(state, period, function (state1) {
                if (failed) {
                    return null;
                }
                var res = tryCatch(action)(state1);
                if (res === errorObj) {
                    failed = true;
                    if (!self._handler(res.e)) {
                        thrower(res.e);
                    }
                    d.dispose();
                    return null;
                }
                return res;
            }));
            return d;
        };
        return CatchScheduler;
    }(Scheduler));
    function IndexedItem(id, value) {
        this.id = id;
        this.value = value;
    }
    IndexedItem.prototype.compareTo = function (other) {
        var c = this.value.compareTo(other.value);
        c === 0 && (c = this.id - other.id);
        return c;
    };
    var PriorityQueue = Rx.internals.PriorityQueue = function (capacity) {
        this.items = new Array(capacity);
        this.length = 0;
    };
    var priorityProto = PriorityQueue.prototype;
    priorityProto.isHigherPriority = function (left, right) {
        return this.items[left].compareTo(this.items[right]) < 0;
    };
    priorityProto.percolate = function (index) {
        if (index >= this.length || index < 0) {
            return;
        }
        var parent = index - 1 >> 1;
        if (parent < 0 || parent === index) {
            return;
        }
        if (this.isHigherPriority(index, parent)) {
            var temp = this.items[index];
            this.items[index] = this.items[parent];
            this.items[parent] = temp;
            this.percolate(parent);
        }
    };
    priorityProto.heapify = function (index) {
        +index || (index = 0);
        if (index >= this.length || index < 0) {
            return;
        }
        var left = 2 * index + 1, right = 2 * index + 2, first = index;
        if (left < this.length && this.isHigherPriority(left, first)) {
            first = left;
        }
        if (right < this.length && this.isHigherPriority(right, first)) {
            first = right;
        }
        if (first !== index) {
            var temp = this.items[index];
            this.items[index] = this.items[first];
            this.items[first] = temp;
            this.heapify(first);
        }
    };
    priorityProto.peek = function () { return this.items[0].value; };
    priorityProto.removeAt = function (index) {
        this.items[index] = this.items[--this.length];
        this.items[this.length] = undefined;
        this.heapify();
    };
    priorityProto.dequeue = function () {
        var result = this.peek();
        this.removeAt(0);
        return result;
    };
    priorityProto.enqueue = function (item) {
        var index = this.length++;
        this.items[index] = new IndexedItem(PriorityQueue.count++, item);
        this.percolate(index);
    };
    priorityProto.remove = function (item) {
        for (var i = 0; i < this.length; i++) {
            if (this.items[i].value === item) {
                this.removeAt(i);
                return true;
            }
        }
        return false;
    };
    PriorityQueue.count = 0;
    /**
     *  Represents a notification to an observer.
     */
    var Notification = Rx.Notification = (function () {
        function Notification() {
        }
        Notification.prototype._accept = function (onNext, onError, onCompleted) {
            throw new NotImplementedError();
        };
        Notification.prototype._acceptObserver = function (onNext, onError, onCompleted) {
            throw new NotImplementedError();
        };
        /**
         * Invokes the delegate corresponding to the notification or the observer's method corresponding to the notification and returns the produced result.
         * @param {Function | Observer} observerOrOnNext Function to invoke for an OnNext notification or Observer to invoke the notification on..
         * @param {Function} onError Function to invoke for an OnError notification.
         * @param {Function} onCompleted Function to invoke for an OnCompleted notification.
         * @returns {Any} Result produced by the observation.
         */
        Notification.prototype.accept = function (observerOrOnNext, onError, onCompleted) {
            return observerOrOnNext && typeof observerOrOnNext === 'object' ?
                this._acceptObserver(observerOrOnNext) :
                this._accept(observerOrOnNext, onError, onCompleted);
        };
        /**
         * Returns an observable sequence with a single notification.
         *
         * @memberOf Notifications
         * @param {Scheduler} [scheduler] Scheduler to send out the notification calls on.
         * @returns {Observable} The observable sequence that surfaces the behavior of the notification upon subscription.
         */
        Notification.prototype.toObservable = function (scheduler) {
            var self = this;
            isScheduler(scheduler) || (scheduler = immediateScheduler);
            return new AnonymousObservable(function (o) {
                return scheduler.schedule(self, function (_, notification) {
                    notification._acceptObserver(o);
                    notification.kind === 'N' && o.onCompleted();
                });
            });
        };
        return Notification;
    })();
    var OnNextNotification = (function (__super__) {
        inherits(OnNextNotification, __super__);
        function OnNextNotification(value) {
            this.value = value;
            this.kind = 'N';
        }
        OnNextNotification.prototype._accept = function (onNext) {
            return onNext(this.value);
        };
        OnNextNotification.prototype._acceptObserver = function (o) {
            return o.onNext(this.value);
        };
        OnNextNotification.prototype.toString = function () {
            return 'OnNext(' + this.value + ')';
        };
        return OnNextNotification;
    }(Notification));
    var OnErrorNotification = (function (__super__) {
        inherits(OnErrorNotification, __super__);
        function OnErrorNotification(error) {
            this.error = error;
            this.kind = 'E';
        }
        OnErrorNotification.prototype._accept = function (onNext, onError) {
            return onError(this.error);
        };
        OnErrorNotification.prototype._acceptObserver = function (o) {
            return o.onError(this.error);
        };
        OnErrorNotification.prototype.toString = function () {
            return 'OnError(' + this.error + ')';
        };
        return OnErrorNotification;
    }(Notification));
    var OnCompletedNotification = (function (__super__) {
        inherits(OnCompletedNotification, __super__);
        function OnCompletedNotification() {
            this.kind = 'C';
        }
        OnCompletedNotification.prototype._accept = function (onNext, onError, onCompleted) {
            return onCompleted();
        };
        OnCompletedNotification.prototype._acceptObserver = function (o) {
            return o.onCompleted();
        };
        OnCompletedNotification.prototype.toString = function () {
            return 'OnCompleted()';
        };
        return OnCompletedNotification;
    }(Notification));
    /**
     * Creates an object that represents an OnNext notification to an observer.
     * @param {Any} value The value contained in the notification.
     * @returns {Notification} The OnNext notification containing the value.
     */
    var notificationCreateOnNext = Notification.createOnNext = function (value) {
        return new OnNextNotification(value);
    };
    /**
     * Creates an object that represents an OnError notification to an observer.
     * @param {Any} error The exception contained in the notification.
     * @returns {Notification} The OnError notification containing the exception.
     */
    var notificationCreateOnError = Notification.createOnError = function (error) {
        return new OnErrorNotification(error);
    };
    /**
     * Creates an object that represents an OnCompleted notification to an observer.
     * @returns {Notification} The OnCompleted notification.
     */
    var notificationCreateOnCompleted = Notification.createOnCompleted = function () {
        return new OnCompletedNotification();
    };
    /**
     * Supports push-style iteration over an observable sequence.
     */
    var Observer = Rx.Observer = function () { };
    /**
     *  Creates a notification callback from an observer.
     * @returns The action that forwards its input notification to the underlying observer.
     */
    Observer.prototype.toNotifier = function () {
        var observer = this;
        return function (n) { return n.accept(observer); };
    };
    /**
     *  Hides the identity of an observer.
     * @returns An observer that hides the identity of the specified observer.
     */
    Observer.prototype.asObserver = function () {
        var self = this;
        return new AnonymousObserver(function (x) { self.onNext(x); }, function (err) { self.onError(err); }, function () { self.onCompleted(); });
    };
    /**
     *  Checks access to the observer for grammar violations. This includes checking for multiple OnError or OnCompleted calls, as well as reentrancy in any of the observer methods.
     *  If a violation is detected, an Error is thrown from the offending observer method call.
     * @returns An observer that checks callbacks invocations against the observer grammar and, if the checks pass, forwards those to the specified observer.
     */
    Observer.prototype.checked = function () { return new CheckedObserver(this); };
    /**
     *  Creates an observer from the specified OnNext, along with optional OnError, and OnCompleted actions.
     * @param {Function} [onNext] Observer's OnNext action implementation.
     * @param {Function} [onError] Observer's OnError action implementation.
     * @param {Function} [onCompleted] Observer's OnCompleted action implementation.
     * @returns {Observer} The observer object implemented using the given actions.
     */
    var observerCreate = Observer.create = function (onNext, onError, onCompleted) {
        onNext || (onNext = noop);
        onError || (onError = defaultError);
        onCompleted || (onCompleted = noop);
        return new AnonymousObserver(onNext, onError, onCompleted);
    };
    /**
     *  Creates an observer from a notification callback.
     * @param {Function} handler Action that handles a notification.
     * @returns The observer object that invokes the specified handler using a notification corresponding to each message it receives.
     */
    Observer.fromNotifier = function (handler, thisArg) {
        var cb = bindCallback(handler, thisArg, 1);
        return new AnonymousObserver(function (x) {
            return cb(notificationCreateOnNext(x));
        }, function (e) {
            return cb(notificationCreateOnError(e));
        }, function () {
            return cb(notificationCreateOnCompleted());
        });
    };
    /**
     * Schedules the invocation of observer methods on the given scheduler.
     * @param {Scheduler} scheduler Scheduler to schedule observer messages on.
     * @returns {Observer} Observer whose messages are scheduled on the given scheduler.
     */
    Observer.prototype.notifyOn = function (scheduler) {
        return new ObserveOnObserver(scheduler, this);
    };
    Observer.prototype.makeSafe = function (disposable) {
        return new AnonymousSafeObserver(this._onNext, this._onError, this._onCompleted, disposable);
    };
    /**
     * Abstract base class for implementations of the Observer class.
     * This base class enforces the grammar of observers where OnError and OnCompleted are terminal messages.
     */
    var AbstractObserver = Rx.internals.AbstractObserver = (function (__super__) {
        inherits(AbstractObserver, __super__);
        /**
         * Creates a new observer in a non-stopped state.
         */
        function AbstractObserver() {
            this.isStopped = false;
        }
        // Must be implemented by other observers
        AbstractObserver.prototype.next = notImplemented;
        AbstractObserver.prototype.error = notImplemented;
        AbstractObserver.prototype.completed = notImplemented;
        /**
         * Notifies the observer of a new element in the sequence.
         * @param {Any} value Next element in the sequence.
         */
        AbstractObserver.prototype.onNext = function (value) {
            !this.isStopped && this.next(value);
        };
        /**
         * Notifies the observer that an exception has occurred.
         * @param {Any} error The error that has occurred.
         */
        AbstractObserver.prototype.onError = function (error) {
            if (!this.isStopped) {
                this.isStopped = true;
                this.error(error);
            }
        };
        /**
         * Notifies the observer of the end of the sequence.
         */
        AbstractObserver.prototype.onCompleted = function () {
            if (!this.isStopped) {
                this.isStopped = true;
                this.completed();
            }
        };
        /**
         * Disposes the observer, causing it to transition to the stopped state.
         */
        AbstractObserver.prototype.dispose = function () { this.isStopped = true; };
        AbstractObserver.prototype.fail = function (e) {
            if (!this.isStopped) {
                this.isStopped = true;
                this.error(e);
                return true;
            }
            return false;
        };
        return AbstractObserver;
    }(Observer));
    /**
     * Class to create an Observer instance from delegate-based implementations of the on* methods.
     */
    var AnonymousObserver = Rx.AnonymousObserver = (function (__super__) {
        inherits(AnonymousObserver, __super__);
        /**
         * Creates an observer from the specified OnNext, OnError, and OnCompleted actions.
         * @param {Any} onNext Observer's OnNext action implementation.
         * @param {Any} onError Observer's OnError action implementation.
         * @param {Any} onCompleted Observer's OnCompleted action implementation.
         */
        function AnonymousObserver(onNext, onError, onCompleted) {
            __super__.call(this);
            this._onNext = onNext;
            this._onError = onError;
            this._onCompleted = onCompleted;
        }
        /**
         * Calls the onNext action.
         * @param {Any} value Next element in the sequence.
         */
        AnonymousObserver.prototype.next = function (value) {
            this._onNext(value);
        };
        /**
         * Calls the onError action.
         * @param {Any} error The error that has occurred.
         */
        AnonymousObserver.prototype.error = function (error) {
            this._onError(error);
        };
        /**
         *  Calls the onCompleted action.
         */
        AnonymousObserver.prototype.completed = function () {
            this._onCompleted();
        };
        return AnonymousObserver;
    }(AbstractObserver));
    var CheckedObserver = (function (__super__) {
        inherits(CheckedObserver, __super__);
        function CheckedObserver(observer) {
            __super__.call(this);
            this._observer = observer;
            this._state = 0; // 0 - idle, 1 - busy, 2 - done
        }
        var CheckedObserverPrototype = CheckedObserver.prototype;
        CheckedObserverPrototype.onNext = function (value) {
            this.checkAccess();
            var res = tryCatch(this._observer.onNext).call(this._observer, value);
            this._state = 0;
            res === errorObj && thrower(res.e);
        };
        CheckedObserverPrototype.onError = function (err) {
            this.checkAccess();
            var res = tryCatch(this._observer.onError).call(this._observer, err);
            this._state = 2;
            res === errorObj && thrower(res.e);
        };
        CheckedObserverPrototype.onCompleted = function () {
            this.checkAccess();
            var res = tryCatch(this._observer.onCompleted).call(this._observer);
            this._state = 2;
            res === errorObj && thrower(res.e);
        };
        CheckedObserverPrototype.checkAccess = function () {
            if (this._state === 1) {
                throw new Error('Re-entrancy detected');
            }
            if (this._state === 2) {
                throw new Error('Observer completed');
            }
            if (this._state === 0) {
                this._state = 1;
            }
        };
        return CheckedObserver;
    }(Observer));
    var ScheduledObserver = Rx.internals.ScheduledObserver = (function (__super__) {
        inherits(ScheduledObserver, __super__);
        function ScheduledObserver(scheduler, observer) {
            __super__.call(this);
            this.scheduler = scheduler;
            this.observer = observer;
            this.isAcquired = false;
            this.hasFaulted = false;
            this.queue = [];
            this.disposable = new SerialDisposable();
        }
        function enqueueNext(observer, x) { return function () { observer.onNext(x); }; }
        function enqueueError(observer, e) { return function () { observer.onError(e); }; }
        function enqueueCompleted(observer) { return function () { observer.onCompleted(); }; }
        ScheduledObserver.prototype.next = function (x) {
            this.queue.push(enqueueNext(this.observer, x));
        };
        ScheduledObserver.prototype.error = function (e) {
            this.queue.push(enqueueError(this.observer, e));
        };
        ScheduledObserver.prototype.completed = function () {
            this.queue.push(enqueueCompleted(this.observer));
        };
        function scheduleMethod(state, recurse) {
            var work;
            if (state.queue.length > 0) {
                work = state.queue.shift();
            }
            else {
                state.isAcquired = false;
                return;
            }
            var res = tryCatch(work)();
            if (res === errorObj) {
                state.queue = [];
                state.hasFaulted = true;
                return thrower(res.e);
            }
            recurse(state);
        }
        ScheduledObserver.prototype.ensureActive = function () {
            var isOwner = false;
            if (!this.hasFaulted && this.queue.length > 0) {
                isOwner = !this.isAcquired;
                this.isAcquired = true;
            }
            isOwner &&
                this.disposable.setDisposable(this.scheduler.scheduleRecursive(this, scheduleMethod));
        };
        ScheduledObserver.prototype.dispose = function () {
            __super__.prototype.dispose.call(this);
            this.disposable.dispose();
        };
        return ScheduledObserver;
    }(AbstractObserver));
    var ObserveOnObserver = (function (__super__) {
        inherits(ObserveOnObserver, __super__);
        function ObserveOnObserver(scheduler, observer, cancel) {
            __super__.call(this, scheduler, observer);
            this._cancel = cancel;
        }
        ObserveOnObserver.prototype.next = function (value) {
            __super__.prototype.next.call(this, value);
            this.ensureActive();
        };
        ObserveOnObserver.prototype.error = function (e) {
            __super__.prototype.error.call(this, e);
            this.ensureActive();
        };
        ObserveOnObserver.prototype.completed = function () {
            __super__.prototype.completed.call(this);
            this.ensureActive();
        };
        ObserveOnObserver.prototype.dispose = function () {
            __super__.prototype.dispose.call(this);
            this._cancel && this._cancel.dispose();
            this._cancel = null;
        };
        return ObserveOnObserver;
    })(ScheduledObserver);
    var observableProto;
    /**
     * Represents a push-style collection.
     */
    var Observable = Rx.Observable = (function () {
        function makeSubscribe(self, subscribe) {
            return function (o) {
                var oldOnError = o.onError;
                o.onError = function (e) {
                    makeStackTraceLong(e, self);
                    oldOnError.call(o, e);
                };
                return subscribe.call(self, o);
            };
        }
        function Observable() {
            if (Rx.config.longStackSupport && hasStacks) {
                var oldSubscribe = this._subscribe;
                var e = tryCatch(thrower)(new Error()).e;
                this.stack = e.stack.substring(e.stack.indexOf('\n') + 1);
                this._subscribe = makeSubscribe(this, oldSubscribe);
            }
        }
        observableProto = Observable.prototype;
        /**
        * Determines whether the given object is an Observable
        * @param {Any} An object to determine whether it is an Observable
        * @returns {Boolean} true if an Observable, else false.
        */
        Observable.isObservable = function (o) {
            return o && isFunction(o.subscribe);
        };
        /**
         *  Subscribes an o to the observable sequence.
         *  @param {Mixed} [oOrOnNext] The object that is to receive notifications or an action to invoke for each element in the observable sequence.
         *  @param {Function} [onError] Action to invoke upon exceptional termination of the observable sequence.
         *  @param {Function} [onCompleted] Action to invoke upon graceful termination of the observable sequence.
         *  @returns {Diposable} A disposable handling the subscriptions and unsubscriptions.
         */
        observableProto.subscribe = observableProto.forEach = function (oOrOnNext, onError, onCompleted) {
            return this._subscribe(typeof oOrOnNext === 'object' ?
                oOrOnNext :
                observerCreate(oOrOnNext, onError, onCompleted));
        };
        /**
         * Subscribes to the next value in the sequence with an optional "this" argument.
         * @param {Function} onNext The function to invoke on each element in the observable sequence.
         * @param {Any} [thisArg] Object to use as this when executing callback.
         * @returns {Disposable} A disposable handling the subscriptions and unsubscriptions.
         */
        observableProto.subscribeOnNext = function (onNext, thisArg) {
            return this._subscribe(observerCreate(typeof thisArg !== 'undefined' ? function (x) { onNext.call(thisArg, x); } : onNext));
        };
        /**
         * Subscribes to an exceptional condition in the sequence with an optional "this" argument.
         * @param {Function} onError The function to invoke upon exceptional termination of the observable sequence.
         * @param {Any} [thisArg] Object to use as this when executing callback.
         * @returns {Disposable} A disposable handling the subscriptions and unsubscriptions.
         */
        observableProto.subscribeOnError = function (onError, thisArg) {
            return this._subscribe(observerCreate(null, typeof thisArg !== 'undefined' ? function (e) { onError.call(thisArg, e); } : onError));
        };
        /**
         * Subscribes to the next value in the sequence with an optional "this" argument.
         * @param {Function} onCompleted The function to invoke upon graceful termination of the observable sequence.
         * @param {Any} [thisArg] Object to use as this when executing callback.
         * @returns {Disposable} A disposable handling the subscriptions and unsubscriptions.
         */
        observableProto.subscribeOnCompleted = function (onCompleted, thisArg) {
            return this._subscribe(observerCreate(null, null, typeof thisArg !== 'undefined' ? function () { onCompleted.call(thisArg); } : onCompleted));
        };
        return Observable;
    })();
    var ObservableBase = Rx.ObservableBase = (function (__super__) {
        inherits(ObservableBase, __super__);
        function fixSubscriber(subscriber) {
            return subscriber && isFunction(subscriber.dispose) ? subscriber :
                isFunction(subscriber) ? disposableCreate(subscriber) : disposableEmpty;
        }
        function setDisposable(s, state) {
            var ado = state[0], self = state[1];
            var sub = tryCatch(self.subscribeCore).call(self, ado);
            if (sub === errorObj && !ado.fail(errorObj.e)) {
                thrower(errorObj.e);
            }
            ado.setDisposable(fixSubscriber(sub));
        }
        function ObservableBase() {
            __super__.call(this);
        }
        ObservableBase.prototype._subscribe = function (o) {
            var ado = new AutoDetachObserver(o), state = [ado, this];
            if (currentThreadScheduler.scheduleRequired()) {
                currentThreadScheduler.schedule(state, setDisposable);
            }
            else {
                setDisposable(null, state);
            }
            return ado;
        };
        ObservableBase.prototype.subscribeCore = notImplemented;
        return ObservableBase;
    }(Observable));
    var FlatMapObservable = Rx.FlatMapObservable = (function (__super__) {
        inherits(FlatMapObservable, __super__);
        function FlatMapObservable(source, selector, resultSelector, thisArg) {
            this.resultSelector = isFunction(resultSelector) ? resultSelector : null;
            this.selector = bindCallback(isFunction(selector) ? selector : function () { return selector; }, thisArg, 3);
            this.source = source;
            __super__.call(this);
        }
        FlatMapObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new InnerObserver(o, this.selector, this.resultSelector, this));
        };
        inherits(InnerObserver, AbstractObserver);
        function InnerObserver(observer, selector, resultSelector, source) {
            this.i = 0;
            this.selector = selector;
            this.resultSelector = resultSelector;
            this.source = source;
            this.o = observer;
            AbstractObserver.call(this);
        }
        InnerObserver.prototype._wrapResult = function (result, x, i) {
            return this.resultSelector ?
                result.map(function (y, i2) { return this.resultSelector(x, y, i, i2); }, this) :
                result;
        };
        InnerObserver.prototype.next = function (x) {
            var i = this.i++;
            var result = tryCatch(this.selector)(x, i, this.source);
            if (result === errorObj) {
                return this.o.onError(result.e);
            }
            isPromise(result) && (result = observableFromPromise(result));
            (isArrayLike(result) || isIterable(result)) && (result = Observable.from(result));
            this.o.onNext(this._wrapResult(result, x, i));
        };
        InnerObserver.prototype.error = function (e) { this.o.onError(e); };
        InnerObserver.prototype.completed = function () { this.o.onCompleted(); };
        return FlatMapObservable;
    }(ObservableBase));
    var Enumerable = Rx.internals.Enumerable = function () { };
    function IsDisposedDisposable(state) {
        this._s = state;
        this.isDisposed = false;
    }
    IsDisposedDisposable.prototype.dispose = function () {
        if (!this.isDisposed) {
            this.isDisposed = true;
            this._s.isDisposed = true;
        }
    };
    var ConcatEnumerableObservable = (function (__super__) {
        inherits(ConcatEnumerableObservable, __super__);
        function ConcatEnumerableObservable(sources) {
            this.sources = sources;
            __super__.call(this);
        }
        function scheduleMethod(state, recurse) {
            if (state.isDisposed) {
                return;
            }
            var currentItem = tryCatch(state.e.next).call(state.e);
            if (currentItem === errorObj) {
                return state.o.onError(currentItem.e);
            }
            if (currentItem.done) {
                return state.o.onCompleted();
            }
            // Check if promise
            var currentValue = currentItem.value;
            isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));
            var d = new SingleAssignmentDisposable();
            state.subscription.setDisposable(d);
            d.setDisposable(currentValue.subscribe(new InnerObserver(state, recurse)));
        }
        ConcatEnumerableObservable.prototype.subscribeCore = function (o) {
            var subscription = new SerialDisposable();
            var state = {
                isDisposed: false,
                o: o,
                subscription: subscription,
                e: this.sources[$iterator$]()
            };
            var cancelable = currentThreadScheduler.scheduleRecursive(state, scheduleMethod);
            return new NAryDisposable([subscription, cancelable, new IsDisposedDisposable(state)]);
        };
        function InnerObserver(state, recurse) {
            this._state = state;
            this._recurse = recurse;
            AbstractObserver.call(this);
        }
        inherits(InnerObserver, AbstractObserver);
        InnerObserver.prototype.next = function (x) { this._state.o.onNext(x); };
        InnerObserver.prototype.error = function (e) { this._state.o.onError(e); };
        InnerObserver.prototype.completed = function () { this._recurse(this._state); };
        return ConcatEnumerableObservable;
    }(ObservableBase));
    Enumerable.prototype.concat = function () {
        return new ConcatEnumerableObservable(this);
    };
    var CatchErrorObservable = (function (__super__) {
        function CatchErrorObservable(sources) {
            this.sources = sources;
            __super__.call(this);
        }
        inherits(CatchErrorObservable, __super__);
        function scheduleMethod(state, recurse) {
            if (state.isDisposed) {
                return;
            }
            var currentItem = tryCatch(state.e.next).call(state.e);
            if (currentItem === errorObj) {
                return state.o.onError(currentItem.e);
            }
            if (currentItem.done) {
                return state.lastError !== null ? state.o.onError(state.lastError) : state.o.onCompleted();
            }
            var currentValue = currentItem.value;
            isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));
            var d = new SingleAssignmentDisposable();
            state.subscription.setDisposable(d);
            d.setDisposable(currentValue.subscribe(new InnerObserver(state, recurse)));
        }
        CatchErrorObservable.prototype.subscribeCore = function (o) {
            var subscription = new SerialDisposable();
            var state = {
                isDisposed: false,
                e: this.sources[$iterator$](),
                subscription: subscription,
                lastError: null,
                o: o
            };
            var cancelable = currentThreadScheduler.scheduleRecursive(state, scheduleMethod);
            return new NAryDisposable([subscription, cancelable, new IsDisposedDisposable(state)]);
        };
        function InnerObserver(state, recurse) {
            this._state = state;
            this._recurse = recurse;
            AbstractObserver.call(this);
        }
        inherits(InnerObserver, AbstractObserver);
        InnerObserver.prototype.next = function (x) { this._state.o.onNext(x); };
        InnerObserver.prototype.error = function (e) { this._state.lastError = e; this._recurse(this._state); };
        InnerObserver.prototype.completed = function () { this._state.o.onCompleted(); };
        return CatchErrorObservable;
    }(ObservableBase));
    Enumerable.prototype.catchError = function () {
        return new CatchErrorObservable(this);
    };
    var RepeatEnumerable = (function (__super__) {
        inherits(RepeatEnumerable, __super__);
        function RepeatEnumerable(v, c) {
            this.v = v;
            this.c = c == null ? -1 : c;
        }
        RepeatEnumerable.prototype[$iterator$] = function () {
            return new RepeatEnumerator(this);
        };
        function RepeatEnumerator(p) {
            this.v = p.v;
            this.l = p.c;
        }
        RepeatEnumerator.prototype.next = function () {
            if (this.l === 0) {
                return doneEnumerator;
            }
            if (this.l > 0) {
                this.l--;
            }
            return { done: false, value: this.v };
        };
        return RepeatEnumerable;
    }(Enumerable));
    var enumerableRepeat = Enumerable.repeat = function (value, repeatCount) {
        return new RepeatEnumerable(value, repeatCount);
    };
    var OfEnumerable = (function (__super__) {
        inherits(OfEnumerable, __super__);
        function OfEnumerable(s, fn, thisArg) {
            this.s = s;
            this.fn = fn ? bindCallback(fn, thisArg, 3) : null;
        }
        OfEnumerable.prototype[$iterator$] = function () {
            return new OfEnumerator(this);
        };
        function OfEnumerator(p) {
            this.i = -1;
            this.s = p.s;
            this.l = this.s.length;
            this.fn = p.fn;
        }
        OfEnumerator.prototype.next = function () {
            return ++this.i < this.l ?
                { done: false, value: !this.fn ? this.s[this.i] : this.fn(this.s[this.i], this.i, this.s) } :
                doneEnumerator;
        };
        return OfEnumerable;
    }(Enumerable));
    var enumerableOf = Enumerable.of = function (source, selector, thisArg) {
        return new OfEnumerable(source, selector, thisArg);
    };
    var ObserveOnObservable = (function (__super__) {
        inherits(ObserveOnObservable, __super__);
        function ObserveOnObservable(source, s) {
            this.source = source;
            this._s = s;
            __super__.call(this);
        }
        ObserveOnObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new ObserveOnObserver(this._s, o));
        };
        return ObserveOnObservable;
    }(ObservableBase));
    /**
    *  Wraps the source sequence in order to run its observer callbacks on the specified scheduler.
    *
    *  This only invokes observer callbacks on a scheduler. In case the subscription and/or unsubscription actions have side-effects
    *  that require to be run on a scheduler, use subscribeOn.
    *
    *  @param {Scheduler} scheduler Scheduler to notify observers on.
    *  @returns {Observable} The source sequence whose observations happen on the specified scheduler.
    */
    observableProto.observeOn = function (scheduler) {
        return new ObserveOnObservable(this, scheduler);
    };
    var SubscribeOnObservable = (function (__super__) {
        inherits(SubscribeOnObservable, __super__);
        function SubscribeOnObservable(source, s) {
            this.source = source;
            this._s = s;
            __super__.call(this);
        }
        function scheduleMethod(scheduler, state) {
            var source = state[0], d = state[1], o = state[2];
            d.setDisposable(new ScheduledDisposable(scheduler, source.subscribe(o)));
        }
        SubscribeOnObservable.prototype.subscribeCore = function (o) {
            var m = new SingleAssignmentDisposable(), d = new SerialDisposable();
            d.setDisposable(m);
            m.setDisposable(this._s.schedule([this.source, d, o], scheduleMethod));
            return d;
        };
        return SubscribeOnObservable;
    }(ObservableBase));
    /**
    *  Wraps the source sequence in order to run its subscription and unsubscription logic on the specified scheduler. This operation is not commonly used;
    *  see the remarks section for more information on the distinction between subscribeOn and observeOn.
 
    *  This only performs the side-effects of subscription and unsubscription on the specified scheduler. In order to invoke observer
    *  callbacks on a scheduler, use observeOn.
 
    *  @param {Scheduler} scheduler Scheduler to perform subscription and unsubscription actions on.
    *  @returns {Observable} The source sequence whose subscriptions and unsubscriptions happen on the specified scheduler.
    */
    observableProto.subscribeOn = function (scheduler) {
        return new SubscribeOnObservable(this, scheduler);
    };
    var FromPromiseObservable = (function (__super__) {
        inherits(FromPromiseObservable, __super__);
        function FromPromiseObservable(p, s) {
            this._p = p;
            this._s = s;
            __super__.call(this);
        }
        function scheduleNext(s, state) {
            var o = state[0], data = state[1];
            o.onNext(data);
            o.onCompleted();
        }
        function scheduleError(s, state) {
            var o = state[0], err = state[1];
            o.onError(err);
        }
        FromPromiseObservable.prototype.subscribeCore = function (o) {
            var sad = new SingleAssignmentDisposable(), self = this, p = this._p;
            if (isFunction(p)) {
                p = tryCatch(p)();
                if (p === errorObj) {
                    o.onError(p.e);
                    return sad;
                }
            }
            p
                .then(function (data) {
                sad.setDisposable(self._s.schedule([o, data], scheduleNext));
            }, function (err) {
                sad.setDisposable(self._s.schedule([o, err], scheduleError));
            });
            return sad;
        };
        return FromPromiseObservable;
    }(ObservableBase));
    /**
    * Converts a Promise to an Observable sequence
    * @param {Promise} An ES6 Compliant promise.
    * @returns {Observable} An Observable sequence which wraps the existing promise success and failure.
    */
    var observableFromPromise = Observable.fromPromise = function (promise, scheduler) {
        scheduler || (scheduler = defaultScheduler);
        return new FromPromiseObservable(promise, scheduler);
    };
    /*
     * Converts an existing observable sequence to an ES6 Compatible Promise
     * @example
     * var promise = Rx.Observable.return(42).toPromise(RSVP.Promise);
     *
     * // With config
     * Rx.config.Promise = RSVP.Promise;
     * var promise = Rx.Observable.return(42).toPromise();
     * @param {Function} [promiseCtor] The constructor of the promise. If not provided, it looks for it in Rx.config.Promise.
     * @returns {Promise} An ES6 compatible promise with the last value from the observable sequence.
     */
    observableProto.toPromise = function (promiseCtor) {
        promiseCtor || (promiseCtor = Rx.config.Promise);
        if (!promiseCtor) {
            throw new NotSupportedError('Promise type not provided nor in Rx.config.Promise');
        }
        var source = this;
        return new promiseCtor(function (resolve, reject) {
            // No cancellation can be done
            var value;
            source.subscribe(function (v) {
                value = v;
            }, reject, function () {
                resolve(value);
            });
        });
    };
    var ToArrayObservable = (function (__super__) {
        inherits(ToArrayObservable, __super__);
        function ToArrayObservable(source) {
            this.source = source;
            __super__.call(this);
        }
        ToArrayObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new InnerObserver(o));
        };
        inherits(InnerObserver, AbstractObserver);
        function InnerObserver(o) {
            this.o = o;
            this.a = [];
            AbstractObserver.call(this);
        }
        InnerObserver.prototype.next = function (x) { this.a.push(x); };
        InnerObserver.prototype.error = function (e) { this.o.onError(e); };
        InnerObserver.prototype.completed = function () { this.o.onNext(this.a); this.o.onCompleted(); };
        return ToArrayObservable;
    }(ObservableBase));
    /**
    * Creates an array from an observable sequence.
    * @returns {Observable} An observable sequence containing a single element with a list containing all the elements of the source sequence.
    */
    observableProto.toArray = function () {
        return new ToArrayObservable(this);
    };
    /**
     *  Creates an observable sequence from a specified subscribe method implementation.
     * @example
     *  var res = Rx.Observable.create(function (observer) { return function () { } );
     *  var res = Rx.Observable.create(function (observer) { return Rx.Disposable.empty; } );
     *  var res = Rx.Observable.create(function (observer) { } );
     * @param {Function} subscribe Implementation of the resulting observable sequence's subscribe method, returning a function that will be wrapped in a Disposable.
     * @returns {Observable} The observable sequence with the specified implementation for the Subscribe method.
     */
    Observable.create = function (subscribe, parent) {
        return new AnonymousObservable(subscribe, parent);
    };
    var Defer = (function (__super__) {
        inherits(Defer, __super__);
        function Defer(factory) {
            this._f = factory;
            __super__.call(this);
        }
        Defer.prototype.subscribeCore = function (o) {
            var result = tryCatch(this._f)();
            if (result === errorObj) {
                return observableThrow(result.e).subscribe(o);
            }
            isPromise(result) && (result = observableFromPromise(result));
            return result.subscribe(o);
        };
        return Defer;
    }(ObservableBase));
    /**
     *  Returns an observable sequence that invokes the specified factory function whenever a new observer subscribes.
     *
     * @example
     *  var res = Rx.Observable.defer(function () { return Rx.Observable.fromArray([1,2,3]); });
     * @param {Function} observableFactory Observable factory function to invoke for each observer that subscribes to the resulting sequence or Promise.
     * @returns {Observable} An observable sequence whose observers trigger an invocation of the given observable factory function.
     */
    var observableDefer = Observable.defer = function (observableFactory) {
        return new Defer(observableFactory);
    };
    var EmptyObservable = (function (__super__) {
        inherits(EmptyObservable, __super__);
        function EmptyObservable(scheduler) {
            this.scheduler = scheduler;
            __super__.call(this);
        }
        EmptyObservable.prototype.subscribeCore = function (observer) {
            var sink = new EmptySink(observer, this.scheduler);
            return sink.run();
        };
        function EmptySink(observer, scheduler) {
            this.observer = observer;
            this.scheduler = scheduler;
        }
        function scheduleItem(s, state) {
            state.onCompleted();
            return disposableEmpty;
        }
        EmptySink.prototype.run = function () {
            var state = this.observer;
            return this.scheduler === immediateScheduler ?
                scheduleItem(null, state) :
                this.scheduler.schedule(state, scheduleItem);
        };
        return EmptyObservable;
    }(ObservableBase));
    var EMPTY_OBSERVABLE = new EmptyObservable(immediateScheduler);
    /**
     *  Returns an empty observable sequence, using the specified scheduler to send out the single OnCompleted message.
     *
     * @example
     *  var res = Rx.Observable.empty();
     *  var res = Rx.Observable.empty(Rx.Scheduler.timeout);
     * @param {Scheduler} [scheduler] Scheduler to send the termination call on.
     * @returns {Observable} An observable sequence with no elements.
     */
    var observableEmpty = Observable.empty = function (scheduler) {
        isScheduler(scheduler) || (scheduler = immediateScheduler);
        return scheduler === immediateScheduler ? EMPTY_OBSERVABLE : new EmptyObservable(scheduler);
    };
    var FromObservable = (function (__super__) {
        inherits(FromObservable, __super__);
        function FromObservable(iterable, fn, scheduler) {
            this._iterable = iterable;
            this._fn = fn;
            this._scheduler = scheduler;
            __super__.call(this);
        }
        function createScheduleMethod(o, it, fn) {
            return function loopRecursive(i, recurse) {
                var next = tryCatch(it.next).call(it);
                if (next === errorObj) {
                    return o.onError(next.e);
                }
                if (next.done) {
                    return o.onCompleted();
                }
                var result = next.value;
                if (isFunction(fn)) {
                    result = tryCatch(fn)(result, i);
                    if (result === errorObj) {
                        return o.onError(result.e);
                    }
                }
                o.onNext(result);
                recurse(i + 1);
            };
        }
        FromObservable.prototype.subscribeCore = function (o) {
            var list = Object(this._iterable), it = getIterable(list);
            return this._scheduler.scheduleRecursive(0, createScheduleMethod(o, it, this._fn));
        };
        return FromObservable;
    }(ObservableBase));
    var maxSafeInteger = Math.pow(2, 53) - 1;
    function StringIterable(s) {
        this._s = s;
    }
    StringIterable.prototype[$iterator$] = function () {
        return new StringIterator(this._s);
    };
    function StringIterator(s) {
        this._s = s;
        this._l = s.length;
        this._i = 0;
    }
    StringIterator.prototype[$iterator$] = function () {
        return this;
    };
    StringIterator.prototype.next = function () {
        return this._i < this._l ? { done: false, value: this._s.charAt(this._i++) } : doneEnumerator;
    };
    function ArrayIterable(a) {
        this._a = a;
    }
    ArrayIterable.prototype[$iterator$] = function () {
        return new ArrayIterator(this._a);
    };
    function ArrayIterator(a) {
        this._a = a;
        this._l = toLength(a);
        this._i = 0;
    }
    ArrayIterator.prototype[$iterator$] = function () {
        return this;
    };
    ArrayIterator.prototype.next = function () {
        return this._i < this._l ? { done: false, value: this._a[this._i++] } : doneEnumerator;
    };
    function numberIsFinite(value) {
        return typeof value === 'number' && root.isFinite(value);
    }
    function isNan(n) {
        return n !== n;
    }
    function getIterable(o) {
        var i = o[$iterator$], it;
        if (!i && typeof o === 'string') {
            it = new StringIterable(o);
            return it[$iterator$]();
        }
        if (!i && o.length !== undefined) {
            it = new ArrayIterable(o);
            return it[$iterator$]();
        }
        if (!i) {
            throw new TypeError('Object is not iterable');
        }
        return o[$iterator$]();
    }
    function sign(value) {
        var number = +value;
        if (number === 0) {
            return number;
        }
        if (isNaN(number)) {
            return number;
        }
        return number < 0 ? -1 : 1;
    }
    function toLength(o) {
        var len = +o.length;
        if (isNaN(len)) {
            return 0;
        }
        if (len === 0 || !numberIsFinite(len)) {
            return len;
        }
        len = sign(len) * Math.floor(Math.abs(len));
        if (len <= 0) {
            return 0;
        }
        if (len > maxSafeInteger) {
            return maxSafeInteger;
        }
        return len;
    }
    /**
    * This method creates a new Observable sequence from an array-like or iterable object.
    * @param {Any} arrayLike An array-like or iterable object to convert to an Observable sequence.
    * @param {Function} [mapFn] Map function to call on every element of the array.
    * @param {Any} [thisArg] The context to use calling the mapFn if provided.
    * @param {Scheduler} [scheduler] Optional scheduler to use for scheduling.  If not provided, defaults to Scheduler.currentThread.
    */
    var observableFrom = Observable.from = function (iterable, mapFn, thisArg, scheduler) {
        if (iterable == null) {
            throw new Error('iterable cannot be null.');
        }
        if (mapFn && !isFunction(mapFn)) {
            throw new Error('mapFn when provided must be a function');
        }
        if (mapFn) {
            var mapper = bindCallback(mapFn, thisArg, 2);
        }
        isScheduler(scheduler) || (scheduler = currentThreadScheduler);
        return new FromObservable(iterable, mapper, scheduler);
    };
    var FromArrayObservable = (function (__super__) {
        inherits(FromArrayObservable, __super__);
        function FromArrayObservable(args, scheduler) {
            this._args = args;
            this._scheduler = scheduler;
            __super__.call(this);
        }
        function scheduleMethod(o, args) {
            var len = args.length;
            return function loopRecursive(i, recurse) {
                if (i < len) {
                    o.onNext(args[i]);
                    recurse(i + 1);
                }
                else {
                    o.onCompleted();
                }
            };
        }
        FromArrayObservable.prototype.subscribeCore = function (o) {
            return this._scheduler.scheduleRecursive(0, scheduleMethod(o, this._args));
        };
        return FromArrayObservable;
    }(ObservableBase));
    /**
    *  Converts an array to an observable sequence, using an optional scheduler to enumerate the array.
    * @deprecated use Observable.from or Observable.of
    * @param {Scheduler} [scheduler] Scheduler to run the enumeration of the input sequence on.
    * @returns {Observable} The observable sequence whose elements are pulled from the given enumerable sequence.
    */
    var observableFromArray = Observable.fromArray = function (array, scheduler) {
        isScheduler(scheduler) || (scheduler = currentThreadScheduler);
        return new FromArrayObservable(array, scheduler);
    };
    var GenerateObservable = (function (__super__) {
        inherits(GenerateObservable, __super__);
        function GenerateObservable(state, cndFn, itrFn, resFn, s) {
            this._initialState = state;
            this._cndFn = cndFn;
            this._itrFn = itrFn;
            this._resFn = resFn;
            this._s = s;
            __super__.call(this);
        }
        function scheduleRecursive(state, recurse) {
            if (state.first) {
                state.first = false;
            }
            else {
                state.newState = tryCatch(state.self._itrFn)(state.newState);
                if (state.newState === errorObj) {
                    return state.o.onError(state.newState.e);
                }
            }
            var hasResult = tryCatch(state.self._cndFn)(state.newState);
            if (hasResult === errorObj) {
                return state.o.onError(hasResult.e);
            }
            if (hasResult) {
                var result = tryCatch(state.self._resFn)(state.newState);
                if (result === errorObj) {
                    return state.o.onError(result.e);
                }
                state.o.onNext(result);
                recurse(state);
            }
            else {
                state.o.onCompleted();
            }
        }
        GenerateObservable.prototype.subscribeCore = function (o) {
            var state = {
                o: o,
                self: this,
                first: true,
                newState: this._initialState
            };
            return this._s.scheduleRecursive(state, scheduleRecursive);
        };
        return GenerateObservable;
    }(ObservableBase));
    /**
     *  Generates an observable sequence by running a state-driven loop producing the sequence's elements, using the specified scheduler to send out observer messages.
     *
     * @example
     *  var res = Rx.Observable.generate(0, function (x) { return x < 10; }, function (x) { return x + 1; }, function (x) { return x; });
     *  var res = Rx.Observable.generate(0, function (x) { return x < 10; }, function (x) { return x + 1; }, function (x) { return x; }, Rx.Scheduler.timeout);
     * @param {Mixed} initialState Initial state.
     * @param {Function} condition Condition to terminate generation (upon returning false).
     * @param {Function} iterate Iteration step function.
     * @param {Function} resultSelector Selector function for results produced in the sequence.
     * @param {Scheduler} [scheduler] Scheduler on which to run the generator loop. If not provided, defaults to Scheduler.currentThread.
     * @returns {Observable} The generated sequence.
     */
    Observable.generate = function (initialState, condition, iterate, resultSelector, scheduler) {
        isScheduler(scheduler) || (scheduler = currentThreadScheduler);
        return new GenerateObservable(initialState, condition, iterate, resultSelector, scheduler);
    };
    var NeverObservable = (function (__super__) {
        inherits(NeverObservable, __super__);
        function NeverObservable() {
            __super__.call(this);
        }
        NeverObservable.prototype.subscribeCore = function (observer) {
            return disposableEmpty;
        };
        return NeverObservable;
    }(ObservableBase));
    var NEVER_OBSERVABLE = new NeverObservable();
    /**
     * Returns a non-terminating observable sequence, which can be used to denote an infinite duration (e.g. when using reactive joins).
     * @returns {Observable} An observable sequence whose observers will never get called.
     */
    var observableNever = Observable.never = function () {
        return NEVER_OBSERVABLE;
    };
    function observableOf(scheduler, array) {
        isScheduler(scheduler) || (scheduler = currentThreadScheduler);
        return new FromArrayObservable(array, scheduler);
    }
    /**
    *  This method creates a new Observable instance with a variable number of arguments, regardless of number or type of the arguments.
    * @returns {Observable} The observable sequence whose elements are pulled from the given arguments.
    */
    Observable.of = function () {
        var len = arguments.length, args = new Array(len);
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
        }
        return new FromArrayObservable(args, currentThreadScheduler);
    };
    /**
    *  This method creates a new Observable instance with a variable number of arguments, regardless of number or type of the arguments.
    * @param {Scheduler} scheduler A scheduler to use for scheduling the arguments.
    * @returns {Observable} The observable sequence whose elements are pulled from the given arguments.
    */
    Observable.ofWithScheduler = function (scheduler) {
        var len = arguments.length, args = new Array(len - 1);
        for (var i = 1; i < len; i++) {
            args[i - 1] = arguments[i];
        }
        return new FromArrayObservable(args, scheduler);
    };
    var PairsObservable = (function (__super__) {
        inherits(PairsObservable, __super__);
        function PairsObservable(o, scheduler) {
            this._o = o;
            this._keys = Object.keys(o);
            this._scheduler = scheduler;
            __super__.call(this);
        }
        function scheduleMethod(o, obj, keys) {
            return function loopRecursive(i, recurse) {
                if (i < keys.length) {
                    var key = keys[i];
                    o.onNext([key, obj[key]]);
                    recurse(i + 1);
                }
                else {
                    o.onCompleted();
                }
            };
        }
        PairsObservable.prototype.subscribeCore = function (o) {
            return this._scheduler.scheduleRecursive(0, scheduleMethod(o, this._o, this._keys));
        };
        return PairsObservable;
    }(ObservableBase));
    /**
     * Convert an object into an observable sequence of [key, value] pairs.
     * @param {Object} obj The object to inspect.
     * @param {Scheduler} [scheduler] Scheduler to run the enumeration of the input sequence on.
     * @returns {Observable} An observable sequence of [key, value] pairs from the object.
     */
    Observable.pairs = function (obj, scheduler) {
        scheduler || (scheduler = currentThreadScheduler);
        return new PairsObservable(obj, scheduler);
    };
    var RangeObservable = (function (__super__) {
        inherits(RangeObservable, __super__);
        function RangeObservable(start, count, scheduler) {
            this.start = start;
            this.rangeCount = count;
            this.scheduler = scheduler;
            __super__.call(this);
        }
        function loopRecursive(start, count, o) {
            return function loop(i, recurse) {
                if (i < count) {
                    o.onNext(start + i);
                    recurse(i + 1);
                }
                else {
                    o.onCompleted();
                }
            };
        }
        RangeObservable.prototype.subscribeCore = function (o) {
            return this.scheduler.scheduleRecursive(0, loopRecursive(this.start, this.rangeCount, o));
        };
        return RangeObservable;
    }(ObservableBase));
    /**
    *  Generates an observable sequence of integral numbers within a specified range, using the specified scheduler to send out observer messages.
    * @param {Number} start The value of the first integer in the sequence.
    * @param {Number} count The number of sequential integers to generate.
    * @param {Scheduler} [scheduler] Scheduler to run the generator loop on. If not specified, defaults to Scheduler.currentThread.
    * @returns {Observable} An observable sequence that contains a range of sequential integral numbers.
    */
    Observable.range = function (start, count, scheduler) {
        isScheduler(scheduler) || (scheduler = currentThreadScheduler);
        return new RangeObservable(start, count, scheduler);
    };
    var RepeatObservable = (function (__super__) {
        inherits(RepeatObservable, __super__);
        function RepeatObservable(value, repeatCount, scheduler) {
            this.value = value;
            this.repeatCount = repeatCount == null ? -1 : repeatCount;
            this.scheduler = scheduler;
            __super__.call(this);
        }
        RepeatObservable.prototype.subscribeCore = function (observer) {
            var sink = new RepeatSink(observer, this);
            return sink.run();
        };
        return RepeatObservable;
    }(ObservableBase));
    function RepeatSink(observer, parent) {
        this.observer = observer;
        this.parent = parent;
    }
    RepeatSink.prototype.run = function () {
        var observer = this.observer, value = this.parent.value;
        function loopRecursive(i, recurse) {
            if (i === -1 || i > 0) {
                observer.onNext(value);
                i > 0 && i--;
            }
            if (i === 0) {
                return observer.onCompleted();
            }
            recurse(i);
        }
        return this.parent.scheduler.scheduleRecursive(this.parent.repeatCount, loopRecursive);
    };
    /**
     *  Generates an observable sequence that repeats the given element the specified number of times, using the specified scheduler to send out observer messages.
     * @param {Mixed} value Element to repeat.
     * @param {Number} repeatCount [Optiona] Number of times to repeat the element. If not specified, repeats indefinitely.
     * @param {Scheduler} scheduler Scheduler to run the producer loop on. If not specified, defaults to Scheduler.immediate.
     * @returns {Observable} An observable sequence that repeats the given element the specified number of times.
     */
    Observable.repeat = function (value, repeatCount, scheduler) {
        isScheduler(scheduler) || (scheduler = currentThreadScheduler);
        return new RepeatObservable(value, repeatCount, scheduler);
    };
    var JustObservable = (function (__super__) {
        inherits(JustObservable, __super__);
        function JustObservable(value, scheduler) {
            this._value = value;
            this._scheduler = scheduler;
            __super__.call(this);
        }
        JustObservable.prototype.subscribeCore = function (o) {
            var state = [this._value, o];
            return this._scheduler === immediateScheduler ?
                scheduleItem(null, state) :
                this._scheduler.schedule(state, scheduleItem);
        };
        function scheduleItem(s, state) {
            var value = state[0], observer = state[1];
            observer.onNext(value);
            observer.onCompleted();
            return disposableEmpty;
        }
        return JustObservable;
    }(ObservableBase));
    /**
     *  Returns an observable sequence that contains a single element, using the specified scheduler to send out observer messages.
     *  There is an alias called 'just' or browsers <IE9.
     * @param {Mixed} value Single element in the resulting observable sequence.
     * @param {Scheduler} scheduler Scheduler to send the single element on. If not specified, defaults to Scheduler.immediate.
     * @returns {Observable} An observable sequence containing the single specified element.
     */
    var observableReturn = Observable['return'] = Observable.just = function (value, scheduler) {
        isScheduler(scheduler) || (scheduler = immediateScheduler);
        return new JustObservable(value, scheduler);
    };
    var ThrowObservable = (function (__super__) {
        inherits(ThrowObservable, __super__);
        function ThrowObservable(error, scheduler) {
            this._error = error;
            this._scheduler = scheduler;
            __super__.call(this);
        }
        ThrowObservable.prototype.subscribeCore = function (o) {
            var state = [this._error, o];
            return this._scheduler === immediateScheduler ?
                scheduleItem(null, state) :
                this._scheduler.schedule(state, scheduleItem);
        };
        function scheduleItem(s, state) {
            var e = state[0], o = state[1];
            o.onError(e);
            return disposableEmpty;
        }
        return ThrowObservable;
    }(ObservableBase));
    /**
     *  Returns an observable sequence that terminates with an exception, using the specified scheduler to send out the single onError message.
     *  There is an alias to this method called 'throwError' for browsers <IE9.
     * @param {Mixed} error An object used for the sequence's termination.
     * @param {Scheduler} scheduler Scheduler to send the exceptional termination call on. If not specified, defaults to Scheduler.immediate.
     * @returns {Observable} The observable sequence that terminates exceptionally with the specified exception object.
     */
    var observableThrow = Observable['throw'] = function (error, scheduler) {
        isScheduler(scheduler) || (scheduler = immediateScheduler);
        return new ThrowObservable(error, scheduler);
    };
    var UsingObservable = (function (__super__) {
        inherits(UsingObservable, __super__);
        function UsingObservable(resFn, obsFn) {
            this._resFn = resFn;
            this._obsFn = obsFn;
            __super__.call(this);
        }
        UsingObservable.prototype.subscribeCore = function (o) {
            var disposable = disposableEmpty;
            var resource = tryCatch(this._resFn)();
            if (resource === errorObj) {
                return new BinaryDisposable(observableThrow(resource.e).subscribe(o), disposable);
            }
            resource && (disposable = resource);
            var source = tryCatch(this._obsFn)(resource);
            if (source === errorObj) {
                return new BinaryDisposable(observableThrow(source.e).subscribe(o), disposable);
            }
            return new BinaryDisposable(source.subscribe(o), disposable);
        };
        return UsingObservable;
    }(ObservableBase));
    /**
     * Constructs an observable sequence that depends on a resource object, whose lifetime is tied to the resulting observable sequence's lifetime.
     * @param {Function} resourceFactory Factory function to obtain a resource object.
     * @param {Function} observableFactory Factory function to obtain an observable sequence that depends on the obtained resource.
     * @returns {Observable} An observable sequence whose lifetime controls the lifetime of the dependent resource object.
     */
    Observable.using = function (resourceFactory, observableFactory) {
        return new UsingObservable(resourceFactory, observableFactory);
    };
    /**
     * Propagates the observable sequence or Promise that reacts first.
     * @param {Observable} rightSource Second observable sequence or Promise.
     * @returns {Observable} {Observable} An observable sequence that surfaces either of the given sequences, whichever reacted first.
     */
    observableProto.amb = function (rightSource) {
        var leftSource = this;
        return new AnonymousObservable(function (observer) {
            var choice, leftChoice = 'L', rightChoice = 'R', leftSubscription = new SingleAssignmentDisposable(), rightSubscription = new SingleAssignmentDisposable();
            isPromise(rightSource) && (rightSource = observableFromPromise(rightSource));
            function choiceL() {
                if (!choice) {
                    choice = leftChoice;
                    rightSubscription.dispose();
                }
            }
            function choiceR() {
                if (!choice) {
                    choice = rightChoice;
                    leftSubscription.dispose();
                }
            }
            var leftSubscribe = observerCreate(function (left) {
                choiceL();
                choice === leftChoice && observer.onNext(left);
            }, function (e) {
                choiceL();
                choice === leftChoice && observer.onError(e);
            }, function () {
                choiceL();
                choice === leftChoice && observer.onCompleted();
            });
            var rightSubscribe = observerCreate(function (right) {
                choiceR();
                choice === rightChoice && observer.onNext(right);
            }, function (e) {
                choiceR();
                choice === rightChoice && observer.onError(e);
            }, function () {
                choiceR();
                choice === rightChoice && observer.onCompleted();
            });
            leftSubscription.setDisposable(leftSource.subscribe(leftSubscribe));
            rightSubscription.setDisposable(rightSource.subscribe(rightSubscribe));
            return new BinaryDisposable(leftSubscription, rightSubscription);
        });
    };
    function amb(p, c) { return p.amb(c); }
    /**
     * Propagates the observable sequence or Promise that reacts first.
     * @returns {Observable} An observable sequence that surfaces any of the given sequences, whichever reacted first.
     */
    Observable.amb = function () {
        var acc = observableNever(), items;
        if (Array.isArray(arguments[0])) {
            items = arguments[0];
        }
        else {
            var len = arguments.length;
            items = new Array(items);
            for (var i = 0; i < len; i++) {
                items[i] = arguments[i];
            }
        }
        for (var i = 0, len = items.length; i < len; i++) {
            acc = amb(acc, items[i]);
        }
        return acc;
    };
    var CatchObservable = (function (__super__) {
        inherits(CatchObservable, __super__);
        function CatchObservable(source, fn) {
            this.source = source;
            this._fn = fn;
            __super__.call(this);
        }
        CatchObservable.prototype.subscribeCore = function (o) {
            var d1 = new SingleAssignmentDisposable(), subscription = new SerialDisposable();
            subscription.setDisposable(d1);
            d1.setDisposable(this.source.subscribe(new CatchObserver(o, subscription, this._fn)));
            return subscription;
        };
        return CatchObservable;
    }(ObservableBase));
    var CatchObserver = (function (__super__) {
        inherits(CatchObserver, __super__);
        function CatchObserver(o, s, fn) {
            this._o = o;
            this._s = s;
            this._fn = fn;
            __super__.call(this);
        }
        CatchObserver.prototype.next = function (x) { this._o.onNext(x); };
        CatchObserver.prototype.completed = function () { return this._o.onCompleted(); };
        CatchObserver.prototype.error = function (e) {
            var result = tryCatch(this._fn)(e);
            if (result === errorObj) {
                return this._o.onError(result.e);
            }
            isPromise(result) && (result = observableFromPromise(result));
            var d = new SingleAssignmentDisposable();
            this._s.setDisposable(d);
            d.setDisposable(result.subscribe(this._o));
        };
        return CatchObserver;
    }(AbstractObserver));
    /**
     * Continues an observable sequence that is terminated by an exception with the next observable sequence.
     * @param {Mixed} handlerOrSecond Exception handler function that returns an observable sequence given the error that occurred in the first sequence, or a second observable sequence used to produce results when an error occurred in the first sequence.
     * @returns {Observable} An observable sequence containing the first sequence's elements, followed by the elements of the handler sequence in case an exception occurred.
     */
    observableProto['catch'] = function (handlerOrSecond) {
        return isFunction(handlerOrSecond) ? new CatchObservable(this, handlerOrSecond) : observableCatch([this, handlerOrSecond]);
    };
    /**
     * Continues an observable sequence that is terminated by an exception with the next observable sequence.
     * @param {Array | Arguments} args Arguments or an array to use as the next sequence if an error occurs.
     * @returns {Observable} An observable sequence containing elements from consecutive source sequences until a source sequence terminates successfully.
     */
    var observableCatch = Observable['catch'] = function () {
        var items;
        if (Array.isArray(arguments[0])) {
            items = arguments[0];
        }
        else {
            var len = arguments.length;
            items = new Array(len);
            for (var i = 0; i < len; i++) {
                items[i] = arguments[i];
            }
        }
        return enumerableOf(items).catchError();
    };
    /**
     * Merges the specified observable sequences into one observable sequence by using the selector function whenever any of the observable sequences or Promises produces an element.
     * This can be in the form of an argument list of observables or an array.
     *
     * @example
     * 1 - obs = observable.combineLatest(obs1, obs2, obs3, function (o1, o2, o3) { return o1 + o2 + o3; });
     * 2 - obs = observable.combineLatest([obs1, obs2, obs3], function (o1, o2, o3) { return o1 + o2 + o3; });
     * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function.
     */
    observableProto.combineLatest = function () {
        var len = arguments.length, args = new Array(len);
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
        }
        if (Array.isArray(args[0])) {
            args[0].unshift(this);
        }
        else {
            args.unshift(this);
        }
        return combineLatest.apply(this, args);
    };
    function falseFactory() { return false; }
    function argumentsToArray() {
        var len = arguments.length, args = new Array(len);
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
        }
        return args;
    }
    var CombineLatestObservable = (function (__super__) {
        inherits(CombineLatestObservable, __super__);
        function CombineLatestObservable(params, cb) {
            this._params = params;
            this._cb = cb;
            __super__.call(this);
        }
        CombineLatestObservable.prototype.subscribeCore = function (observer) {
            var len = this._params.length, subscriptions = new Array(len);
            var state = {
                hasValue: arrayInitialize(len, falseFactory),
                hasValueAll: false,
                isDone: arrayInitialize(len, falseFactory),
                values: new Array(len)
            };
            for (var i = 0; i < len; i++) {
                var source = this._params[i], sad = new SingleAssignmentDisposable();
                subscriptions[i] = sad;
                isPromise(source) && (source = observableFromPromise(source));
                sad.setDisposable(source.subscribe(new CombineLatestObserver(observer, i, this._cb, state)));
            }
            return new NAryDisposable(subscriptions);
        };
        return CombineLatestObservable;
    }(ObservableBase));
    var CombineLatestObserver = (function (__super__) {
        inherits(CombineLatestObserver, __super__);
        function CombineLatestObserver(o, i, cb, state) {
            this._o = o;
            this._i = i;
            this._cb = cb;
            this._state = state;
            __super__.call(this);
        }
        function notTheSame(i) {
            return function (x, j) {
                return j !== i;
            };
        }
        CombineLatestObserver.prototype.next = function (x) {
            this._state.values[this._i] = x;
            this._state.hasValue[this._i] = true;
            if (this._state.hasValueAll || (this._state.hasValueAll = this._state.hasValue.every(identity))) {
                var res = tryCatch(this._cb).apply(null, this._state.values);
                if (res === errorObj) {
                    return this._o.onError(res.e);
                }
                this._o.onNext(res);
            }
            else if (this._state.isDone.filter(notTheSame(this._i)).every(identity)) {
                this._o.onCompleted();
            }
        };
        CombineLatestObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        CombineLatestObserver.prototype.completed = function () {
            this._state.isDone[this._i] = true;
            this._state.isDone.every(identity) && this._o.onCompleted();
        };
        return CombineLatestObserver;
    }(AbstractObserver));
    /**
    * Merges the specified observable sequences into one observable sequence by using the selector function whenever any of the observable sequences or Promises produces an element.
    *
    * @example
    * 1 - obs = Rx.Observable.combineLatest(obs1, obs2, obs3, function (o1, o2, o3) { return o1 + o2 + o3; });
    * 2 - obs = Rx.Observable.combineLatest([obs1, obs2, obs3], function (o1, o2, o3) { return o1 + o2 + o3; });
    * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function.
    */
    var combineLatest = Observable.combineLatest = function () {
        var len = arguments.length, args = new Array(len);
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
        }
        var resultSelector = isFunction(args[len - 1]) ? args.pop() : argumentsToArray;
        Array.isArray(args[0]) && (args = args[0]);
        return new CombineLatestObservable(args, resultSelector);
    };
    /**
     * Concatenates all the observable sequences.  This takes in either an array or variable arguments to concatenate.
     * @returns {Observable} An observable sequence that contains the elements of each given sequence, in sequential order.
     */
    observableProto.concat = function () {
        for (var args = [], i = 0, len = arguments.length; i < len; i++) {
            args.push(arguments[i]);
        }
        args.unshift(this);
        return observableConcat.apply(null, args);
    };
    var ConcatObserver = (function (__super__) {
        inherits(ConcatObserver, __super__);
        function ConcatObserver(s, fn) {
            this._s = s;
            this._fn = fn;
            __super__.call(this);
        }
        ConcatObserver.prototype.next = function (x) { this._s.o.onNext(x); };
        ConcatObserver.prototype.error = function (e) { this._s.o.onError(e); };
        ConcatObserver.prototype.completed = function () { this._s.i++; this._fn(this._s); };
        return ConcatObserver;
    }(AbstractObserver));
    var ConcatObservable = (function (__super__) {
        inherits(ConcatObservable, __super__);
        function ConcatObservable(sources) {
            this._sources = sources;
            __super__.call(this);
        }
        function scheduleRecursive(state, recurse) {
            if (state.disposable.isDisposed) {
                return;
            }
            if (state.i === state.sources.length) {
                return state.o.onCompleted();
            }
            // Check if promise
            var currentValue = state.sources[state.i];
            isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));
            var d = new SingleAssignmentDisposable();
            state.subscription.setDisposable(d);
            d.setDisposable(currentValue.subscribe(new ConcatObserver(state, recurse)));
        }
        ConcatObservable.prototype.subscribeCore = function (o) {
            var subscription = new SerialDisposable();
            var disposable = disposableCreate(noop);
            var state = {
                o: o,
                i: 0,
                subscription: subscription,
                disposable: disposable,
                sources: this._sources
            };
            var cancelable = immediateScheduler.scheduleRecursive(state, scheduleRecursive);
            return new NAryDisposable([subscription, disposable, cancelable]);
        };
        return ConcatObservable;
    }(ObservableBase));
    /**
     * Concatenates all the observable sequences.
     * @param {Array | Arguments} args Arguments or an array to concat to the observable sequence.
     * @returns {Observable} An observable sequence that contains the elements of each given sequence, in sequential order.
     */
    var observableConcat = Observable.concat = function () {
        var args;
        if (Array.isArray(arguments[0])) {
            args = arguments[0];
        }
        else {
            args = new Array(arguments.length);
            for (var i = 0, len = arguments.length; i < len; i++) {
                args[i] = arguments[i];
            }
        }
        return new ConcatObservable(args);
    };
    /**
     * Concatenates an observable sequence of observable sequences.
     * @returns {Observable} An observable sequence that contains the elements of each observed inner sequence, in sequential order.
     */
    observableProto.concatAll = function () {
        return this.merge(1);
    };
    var MergeObservable = (function (__super__) {
        inherits(MergeObservable, __super__);
        function MergeObservable(source, maxConcurrent) {
            this.source = source;
            this.maxConcurrent = maxConcurrent;
            __super__.call(this);
        }
        MergeObservable.prototype.subscribeCore = function (observer) {
            var g = new CompositeDisposable();
            g.add(this.source.subscribe(new MergeObserver(observer, this.maxConcurrent, g)));
            return g;
        };
        return MergeObservable;
    }(ObservableBase));
    var MergeObserver = (function (__super__) {
        function MergeObserver(o, max, g) {
            this.o = o;
            this.max = max;
            this.g = g;
            this.done = false;
            this.q = [];
            this.activeCount = 0;
            __super__.call(this);
        }
        inherits(MergeObserver, __super__);
        MergeObserver.prototype.handleSubscribe = function (xs) {
            var sad = new SingleAssignmentDisposable();
            this.g.add(sad);
            isPromise(xs) && (xs = observableFromPromise(xs));
            sad.setDisposable(xs.subscribe(new InnerObserver(this, sad)));
        };
        MergeObserver.prototype.next = function (innerSource) {
            if (this.activeCount < this.max) {
                this.activeCount++;
                this.handleSubscribe(innerSource);
            }
            else {
                this.q.push(innerSource);
            }
        };
        MergeObserver.prototype.error = function (e) { this.o.onError(e); };
        MergeObserver.prototype.completed = function () { this.done = true; this.activeCount === 0 && this.o.onCompleted(); };
        function InnerObserver(parent, sad) {
            this.parent = parent;
            this.sad = sad;
            __super__.call(this);
        }
        inherits(InnerObserver, __super__);
        InnerObserver.prototype.next = function (x) { this.parent.o.onNext(x); };
        InnerObserver.prototype.error = function (e) { this.parent.o.onError(e); };
        InnerObserver.prototype.completed = function () {
            this.parent.g.remove(this.sad);
            if (this.parent.q.length > 0) {
                this.parent.handleSubscribe(this.parent.q.shift());
            }
            else {
                this.parent.activeCount--;
                this.parent.done && this.parent.activeCount === 0 && this.parent.o.onCompleted();
            }
        };
        return MergeObserver;
    }(AbstractObserver));
    /**
    * Merges an observable sequence of observable sequences into an observable sequence, limiting the number of concurrent subscriptions to inner sequences.
    * Or merges two observable sequences into a single observable sequence.
    * @param {Mixed} [maxConcurrentOrOther] Maximum number of inner observable sequences being subscribed to concurrently or the second observable sequence.
    * @returns {Observable} The observable sequence that merges the elements of the inner sequences.
    */
    observableProto.merge = function (maxConcurrentOrOther) {
        return typeof maxConcurrentOrOther !== 'number' ?
            observableMerge(this, maxConcurrentOrOther) :
            new MergeObservable(this, maxConcurrentOrOther);
    };
    /**
     * Merges all the observable sequences into a single observable sequence.
     * The scheduler is optional and if not specified, the immediate scheduler is used.
     * @returns {Observable} The observable sequence that merges the elements of the observable sequences.
     */
    var observableMerge = Observable.merge = function () {
        var scheduler, sources = [], i, len = arguments.length;
        if (!arguments[0]) {
            scheduler = immediateScheduler;
            for (i = 1; i < len; i++) {
                sources.push(arguments[i]);
            }
        }
        else if (isScheduler(arguments[0])) {
            scheduler = arguments[0];
            for (i = 1; i < len; i++) {
                sources.push(arguments[i]);
            }
        }
        else {
            scheduler = immediateScheduler;
            for (i = 0; i < len; i++) {
                sources.push(arguments[i]);
            }
        }
        if (Array.isArray(sources[0])) {
            sources = sources[0];
        }
        return observableOf(scheduler, sources).mergeAll();
    };
    var CompositeError = Rx.CompositeError = function (errors) {
        this.innerErrors = errors;
        this.message = 'This contains multiple errors. Check the innerErrors';
        Error.call(this);
    };
    CompositeError.prototype = Object.create(Error.prototype);
    CompositeError.prototype.name = 'CompositeError';
    var MergeDelayErrorObservable = (function (__super__) {
        inherits(MergeDelayErrorObservable, __super__);
        function MergeDelayErrorObservable(source) {
            this.source = source;
            __super__.call(this);
        }
        MergeDelayErrorObservable.prototype.subscribeCore = function (o) {
            var group = new CompositeDisposable(), m = new SingleAssignmentDisposable(), state = { isStopped: false, errors: [], o: o };
            group.add(m);
            m.setDisposable(this.source.subscribe(new MergeDelayErrorObserver(group, state)));
            return group;
        };
        return MergeDelayErrorObservable;
    }(ObservableBase));
    var MergeDelayErrorObserver = (function (__super__) {
        inherits(MergeDelayErrorObserver, __super__);
        function MergeDelayErrorObserver(group, state) {
            this._group = group;
            this._state = state;
            __super__.call(this);
        }
        function setCompletion(o, errors) {
            if (errors.length === 0) {
                o.onCompleted();
            }
            else if (errors.length === 1) {
                o.onError(errors[0]);
            }
            else {
                o.onError(new CompositeError(errors));
            }
        }
        MergeDelayErrorObserver.prototype.next = function (x) {
            var inner = new SingleAssignmentDisposable();
            this._group.add(inner);
            // Check for promises support
            isPromise(x) && (x = observableFromPromise(x));
            inner.setDisposable(x.subscribe(new InnerObserver(inner, this._group, this._state)));
        };
        MergeDelayErrorObserver.prototype.error = function (e) {
            this._state.errors.push(e);
            this._state.isStopped = true;
            this._group.length === 1 && setCompletion(this._state.o, this._state.errors);
        };
        MergeDelayErrorObserver.prototype.completed = function () {
            this._state.isStopped = true;
            this._group.length === 1 && setCompletion(this._state.o, this._state.errors);
        };
        inherits(InnerObserver, __super__);
        function InnerObserver(inner, group, state) {
            this._inner = inner;
            this._group = group;
            this._state = state;
            __super__.call(this);
        }
        InnerObserver.prototype.next = function (x) { this._state.o.onNext(x); };
        InnerObserver.prototype.error = function (e) {
            this._state.errors.push(e);
            this._group.remove(this._inner);
            this._state.isStopped && this._group.length === 1 && setCompletion(this._state.o, this._state.errors);
        };
        InnerObserver.prototype.completed = function () {
            this._group.remove(this._inner);
            this._state.isStopped && this._group.length === 1 && setCompletion(this._state.o, this._state.errors);
        };
        return MergeDelayErrorObserver;
    }(AbstractObserver));
    /**
    * Flattens an Observable that emits Observables into one Observable, in a way that allows an Observer to
    * receive all successfully emitted items from all of the source Observables without being interrupted by
    * an error notification from one of them.
    *
    * This behaves like Observable.prototype.mergeAll except that if any of the merged Observables notify of an
    * error via the Observer's onError, mergeDelayError will refrain from propagating that
    * error notification until all of the merged Observables have finished emitting items.
    * @param {Array | Arguments} args Arguments or an array to merge.
    * @returns {Observable} an Observable that emits all of the items emitted by the Observables emitted by the Observable
    */
    Observable.mergeDelayError = function () {
        var args;
        if (Array.isArray(arguments[0])) {
            args = arguments[0];
        }
        else {
            var len = arguments.length;
            args = new Array(len);
            for (var i = 0; i < len; i++) {
                args[i] = arguments[i];
            }
        }
        var source = observableOf(null, args);
        return new MergeDelayErrorObservable(source);
    };
    var MergeAllObservable = (function (__super__) {
        inherits(MergeAllObservable, __super__);
        function MergeAllObservable(source) {
            this.source = source;
            __super__.call(this);
        }
        MergeAllObservable.prototype.subscribeCore = function (o) {
            var g = new CompositeDisposable(), m = new SingleAssignmentDisposable();
            g.add(m);
            m.setDisposable(this.source.subscribe(new MergeAllObserver(o, g)));
            return g;
        };
        return MergeAllObservable;
    }(ObservableBase));
    var MergeAllObserver = (function (__super__) {
        function MergeAllObserver(o, g) {
            this.o = o;
            this.g = g;
            this.done = false;
            __super__.call(this);
        }
        inherits(MergeAllObserver, __super__);
        MergeAllObserver.prototype.next = function (innerSource) {
            var sad = new SingleAssignmentDisposable();
            this.g.add(sad);
            isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));
            sad.setDisposable(innerSource.subscribe(new InnerObserver(this, sad)));
        };
        MergeAllObserver.prototype.error = function (e) {
            this.o.onError(e);
        };
        MergeAllObserver.prototype.completed = function () {
            this.done = true;
            this.g.length === 1 && this.o.onCompleted();
        };
        function InnerObserver(parent, sad) {
            this.parent = parent;
            this.sad = sad;
            __super__.call(this);
        }
        inherits(InnerObserver, __super__);
        InnerObserver.prototype.next = function (x) {
            this.parent.o.onNext(x);
        };
        InnerObserver.prototype.error = function (e) {
            this.parent.o.onError(e);
        };
        InnerObserver.prototype.completed = function () {
            this.parent.g.remove(this.sad);
            this.parent.done && this.parent.g.length === 1 && this.parent.o.onCompleted();
        };
        return MergeAllObserver;
    }(AbstractObserver));
    /**
    * Merges an observable sequence of observable sequences into an observable sequence.
    * @returns {Observable} The observable sequence that merges the elements of the inner sequences.
    */
    observableProto.mergeAll = function () {
        return new MergeAllObservable(this);
    };
    /**
     * Continues an observable sequence that is terminated normally or by an exception with the next observable sequence.
     * @param {Observable} second Second observable sequence used to produce results after the first sequence terminates.
     * @returns {Observable} An observable sequence that concatenates the first and second sequence, even if the first sequence terminates exceptionally.
     */
    observableProto.onErrorResumeNext = function (second) {
        if (!second) {
            throw new Error('Second observable is required');
        }
        return onErrorResumeNext([this, second]);
    };
    var OnErrorResumeNextObservable = (function (__super__) {
        inherits(OnErrorResumeNextObservable, __super__);
        function OnErrorResumeNextObservable(sources) {
            this.sources = sources;
            __super__.call(this);
        }
        function scheduleMethod(state, recurse) {
            if (state.pos < state.sources.length) {
                var current = state.sources[state.pos++];
                isPromise(current) && (current = observableFromPromise(current));
                var d = new SingleAssignmentDisposable();
                state.subscription.setDisposable(d);
                d.setDisposable(current.subscribe(new OnErrorResumeNextObserver(state, recurse)));
            }
            else {
                state.o.onCompleted();
            }
        }
        OnErrorResumeNextObservable.prototype.subscribeCore = function (o) {
            var subscription = new SerialDisposable(), state = { pos: 0, subscription: subscription, o: o, sources: this.sources }, cancellable = immediateScheduler.scheduleRecursive(state, scheduleMethod);
            return new BinaryDisposable(subscription, cancellable);
        };
        return OnErrorResumeNextObservable;
    }(ObservableBase));
    var OnErrorResumeNextObserver = (function (__super__) {
        inherits(OnErrorResumeNextObserver, __super__);
        function OnErrorResumeNextObserver(state, recurse) {
            this._state = state;
            this._recurse = recurse;
            __super__.call(this);
        }
        OnErrorResumeNextObserver.prototype.next = function (x) { this._state.o.onNext(x); };
        OnErrorResumeNextObserver.prototype.error = function () { this._recurse(this._state); };
        OnErrorResumeNextObserver.prototype.completed = function () { this._recurse(this._state); };
        return OnErrorResumeNextObserver;
    }(AbstractObserver));
    /**
     * Continues an observable sequence that is terminated normally or by an exception with the next observable sequence.
     * @returns {Observable} An observable sequence that concatenates the source sequences, even if a sequence terminates exceptionally.
     */
    var onErrorResumeNext = Observable.onErrorResumeNext = function () {
        var sources = [];
        if (Array.isArray(arguments[0])) {
            sources = arguments[0];
        }
        else {
            var len = arguments.length;
            sources = new Array(len);
            for (var i = 0; i < len; i++) {
                sources[i] = arguments[i];
            }
        }
        return new OnErrorResumeNextObservable(sources);
    };
    var SkipUntilObservable = (function (__super__) {
        inherits(SkipUntilObservable, __super__);
        function SkipUntilObservable(source, other) {
            this._s = source;
            this._o = isPromise(other) ? observableFromPromise(other) : other;
            this._open = false;
            __super__.call(this);
        }
        SkipUntilObservable.prototype.subscribeCore = function (o) {
            var leftSubscription = new SingleAssignmentDisposable();
            leftSubscription.setDisposable(this._s.subscribe(new SkipUntilSourceObserver(o, this)));
            isPromise(this._o) && (this._o = observableFromPromise(this._o));
            var rightSubscription = new SingleAssignmentDisposable();
            rightSubscription.setDisposable(this._o.subscribe(new SkipUntilOtherObserver(o, this, rightSubscription)));
            return new BinaryDisposable(leftSubscription, rightSubscription);
        };
        return SkipUntilObservable;
    }(ObservableBase));
    var SkipUntilSourceObserver = (function (__super__) {
        inherits(SkipUntilSourceObserver, __super__);
        function SkipUntilSourceObserver(o, p) {
            this._o = o;
            this._p = p;
            __super__.call(this);
        }
        SkipUntilSourceObserver.prototype.next = function (x) {
            this._p._open && this._o.onNext(x);
        };
        SkipUntilSourceObserver.prototype.error = function (err) {
            this._o.onError(err);
        };
        SkipUntilSourceObserver.prototype.onCompleted = function () {
            this._p._open && this._o.onCompleted();
        };
        return SkipUntilSourceObserver;
    }(AbstractObserver));
    var SkipUntilOtherObserver = (function (__super__) {
        inherits(SkipUntilOtherObserver, __super__);
        function SkipUntilOtherObserver(o, p, r) {
            this._o = o;
            this._p = p;
            this._r = r;
            __super__.call(this);
        }
        SkipUntilOtherObserver.prototype.next = function () {
            this._p._open = true;
            this._r.dispose();
        };
        SkipUntilOtherObserver.prototype.error = function (err) {
            this._o.onError(err);
        };
        SkipUntilOtherObserver.prototype.onCompleted = function () {
            this._r.dispose();
        };
        return SkipUntilOtherObserver;
    }(AbstractObserver));
    /**
     * Returns the values from the source observable sequence only after the other observable sequence produces a value.
     * @param {Observable | Promise} other The observable sequence or Promise that triggers propagation of elements of the source sequence.
     * @returns {Observable} An observable sequence containing the elements of the source sequence starting from the point the other sequence triggered propagation.
     */
    observableProto.skipUntil = function (other) {
        return new SkipUntilObservable(this, other);
    };
    var SwitchObservable = (function (__super__) {
        inherits(SwitchObservable, __super__);
        function SwitchObservable(source) {
            this.source = source;
            __super__.call(this);
        }
        SwitchObservable.prototype.subscribeCore = function (o) {
            var inner = new SerialDisposable(), s = this.source.subscribe(new SwitchObserver(o, inner));
            return new BinaryDisposable(s, inner);
        };
        inherits(SwitchObserver, AbstractObserver);
        function SwitchObserver(o, inner) {
            this.o = o;
            this.inner = inner;
            this.stopped = false;
            this.latest = 0;
            this.hasLatest = false;
            AbstractObserver.call(this);
        }
        SwitchObserver.prototype.next = function (innerSource) {
            var d = new SingleAssignmentDisposable(), id = ++this.latest;
            this.hasLatest = true;
            this.inner.setDisposable(d);
            isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));
            d.setDisposable(innerSource.subscribe(new InnerObserver(this, id)));
        };
        SwitchObserver.prototype.error = function (e) {
            this.o.onError(e);
        };
        SwitchObserver.prototype.completed = function () {
            this.stopped = true;
            !this.hasLatest && this.o.onCompleted();
        };
        inherits(InnerObserver, AbstractObserver);
        function InnerObserver(parent, id) {
            this.parent = parent;
            this.id = id;
            AbstractObserver.call(this);
        }
        InnerObserver.prototype.next = function (x) {
            this.parent.latest === this.id && this.parent.o.onNext(x);
        };
        InnerObserver.prototype.error = function (e) {
            this.parent.latest === this.id && this.parent.o.onError(e);
        };
        InnerObserver.prototype.completed = function () {
            if (this.parent.latest === this.id) {
                this.parent.hasLatest = false;
                this.parent.stopped && this.parent.o.onCompleted();
            }
        };
        return SwitchObservable;
    }(ObservableBase));
    /**
    * Transforms an observable sequence of observable sequences into an observable sequence producing values only from the most recent observable sequence.
    * @returns {Observable} The observable sequence that at any point in time produces the elements of the most recent inner observable sequence that has been received.
    */
    observableProto['switch'] = observableProto.switchLatest = function () {
        return new SwitchObservable(this);
    };
    var TakeUntilObservable = (function (__super__) {
        inherits(TakeUntilObservable, __super__);
        function TakeUntilObservable(source, other) {
            this.source = source;
            this.other = isPromise(other) ? observableFromPromise(other) : other;
            __super__.call(this);
        }
        TakeUntilObservable.prototype.subscribeCore = function (o) {
            return new BinaryDisposable(this.source.subscribe(o), this.other.subscribe(new TakeUntilObserver(o)));
        };
        return TakeUntilObservable;
    }(ObservableBase));
    var TakeUntilObserver = (function (__super__) {
        inherits(TakeUntilObserver, __super__);
        function TakeUntilObserver(o) {
            this._o = o;
            __super__.call(this);
        }
        TakeUntilObserver.prototype.next = function () {
            this._o.onCompleted();
        };
        TakeUntilObserver.prototype.error = function (err) {
            this._o.onError(err);
        };
        TakeUntilObserver.prototype.onCompleted = noop;
        return TakeUntilObserver;
    }(AbstractObserver));
    /**
     * Returns the values from the source observable sequence until the other observable sequence produces a value.
     * @param {Observable | Promise} other Observable sequence or Promise that terminates propagation of elements of the source sequence.
     * @returns {Observable} An observable sequence containing the elements of the source sequence up to the point the other sequence interrupted further propagation.
     */
    observableProto.takeUntil = function (other) {
        return new TakeUntilObservable(this, other);
    };
    function falseFactory() { return false; }
    function argumentsToArray() {
        var len = arguments.length, args = new Array(len);
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
        }
        return args;
    }
    var WithLatestFromObservable = (function (__super__) {
        inherits(WithLatestFromObservable, __super__);
        function WithLatestFromObservable(source, sources, resultSelector) {
            this._s = source;
            this._ss = sources;
            this._cb = resultSelector;
            __super__.call(this);
        }
        WithLatestFromObservable.prototype.subscribeCore = function (o) {
            var len = this._ss.length;
            var state = {
                hasValue: arrayInitialize(len, falseFactory),
                hasValueAll: false,
                values: new Array(len)
            };
            var n = this._ss.length, subscriptions = new Array(n + 1);
            for (var i = 0; i < n; i++) {
                var other = this._ss[i], sad = new SingleAssignmentDisposable();
                isPromise(other) && (other = observableFromPromise(other));
                sad.setDisposable(other.subscribe(new WithLatestFromOtherObserver(o, i, state)));
                subscriptions[i] = sad;
            }
            var outerSad = new SingleAssignmentDisposable();
            outerSad.setDisposable(this._s.subscribe(new WithLatestFromSourceObserver(o, this._cb, state)));
            subscriptions[n] = outerSad;
            return new NAryDisposable(subscriptions);
        };
        return WithLatestFromObservable;
    }(ObservableBase));
    var WithLatestFromOtherObserver = (function (__super__) {
        inherits(WithLatestFromOtherObserver, __super__);
        function WithLatestFromOtherObserver(o, i, state) {
            this._o = o;
            this._i = i;
            this._state = state;
            __super__.call(this);
        }
        WithLatestFromOtherObserver.prototype.next = function (x) {
            this._state.values[this._i] = x;
            this._state.hasValue[this._i] = true;
            this._state.hasValueAll = this._state.hasValue.every(identity);
        };
        WithLatestFromOtherObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        WithLatestFromOtherObserver.prototype.completed = noop;
        return WithLatestFromOtherObserver;
    }(AbstractObserver));
    var WithLatestFromSourceObserver = (function (__super__) {
        inherits(WithLatestFromSourceObserver, __super__);
        function WithLatestFromSourceObserver(o, cb, state) {
            this._o = o;
            this._cb = cb;
            this._state = state;
            __super__.call(this);
        }
        WithLatestFromSourceObserver.prototype.next = function (x) {
            var allValues = [x].concat(this._state.values);
            if (!this._state.hasValueAll) {
                return;
            }
            var res = tryCatch(this._cb).apply(null, allValues);
            if (res === errorObj) {
                return this._o.onError(res.e);
            }
            this._o.onNext(res);
        };
        WithLatestFromSourceObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        WithLatestFromSourceObserver.prototype.completed = function () {
            this._o.onCompleted();
        };
        return WithLatestFromSourceObserver;
    }(AbstractObserver));
    /**
     * Merges the specified observable sequences into one observable sequence by using the selector function only when the (first) source observable sequence produces an element.
     * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function.
     */
    observableProto.withLatestFrom = function () {
        if (arguments.length === 0) {
            throw new Error('invalid arguments');
        }
        var len = arguments.length, args = new Array(len);
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
        }
        var resultSelector = isFunction(args[len - 1]) ? args.pop() : argumentsToArray;
        Array.isArray(args[0]) && (args = args[0]);
        return new WithLatestFromObservable(this, args, resultSelector);
    };
    function falseFactory() { return false; }
    function emptyArrayFactory() { return []; }
    var ZipObservable = (function (__super__) {
        inherits(ZipObservable, __super__);
        function ZipObservable(sources, resultSelector) {
            this._s = sources;
            this._cb = resultSelector;
            __super__.call(this);
        }
        ZipObservable.prototype.subscribeCore = function (observer) {
            var n = this._s.length, subscriptions = new Array(n), done = arrayInitialize(n, falseFactory), q = arrayInitialize(n, emptyArrayFactory);
            for (var i = 0; i < n; i++) {
                var source = this._s[i], sad = new SingleAssignmentDisposable();
                subscriptions[i] = sad;
                isPromise(source) && (source = observableFromPromise(source));
                sad.setDisposable(source.subscribe(new ZipObserver(observer, i, this, q, done)));
            }
            return new NAryDisposable(subscriptions);
        };
        return ZipObservable;
    }(ObservableBase));
    var ZipObserver = (function (__super__) {
        inherits(ZipObserver, __super__);
        function ZipObserver(o, i, p, q, d) {
            this._o = o;
            this._i = i;
            this._p = p;
            this._q = q;
            this._d = d;
            __super__.call(this);
        }
        function notEmpty(x) { return x.length > 0; }
        function shiftEach(x) { return x.shift(); }
        function notTheSame(i) {
            return function (x, j) {
                return j !== i;
            };
        }
        ZipObserver.prototype.next = function (x) {
            this._q[this._i].push(x);
            if (this._q.every(notEmpty)) {
                var queuedValues = this._q.map(shiftEach);
                var res = tryCatch(this._p._cb).apply(null, queuedValues);
                if (res === errorObj) {
                    return this._o.onError(res.e);
                }
                this._o.onNext(res);
            }
            else if (this._d.filter(notTheSame(this._i)).every(identity)) {
                this._o.onCompleted();
            }
        };
        ZipObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        ZipObserver.prototype.completed = function () {
            this._d[this._i] = true;
            this._d.every(identity) && this._o.onCompleted();
        };
        return ZipObserver;
    }(AbstractObserver));
    /**
     * Merges the specified observable sequences into one observable sequence by using the selector function whenever all of the observable sequences or an array have produced an element at a corresponding index.
     * The last element in the arguments must be a function to invoke for each series of elements at corresponding indexes in the args.
     * @returns {Observable} An observable sequence containing the result of combining elements of the args using the specified result selector function.
     */
    observableProto.zip = function () {
        if (arguments.length === 0) {
            throw new Error('invalid arguments');
        }
        var len = arguments.length, args = new Array(len);
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
        }
        var resultSelector = isFunction(args[len - 1]) ? args.pop() : argumentsToArray;
        Array.isArray(args[0]) && (args = args[0]);
        var parent = this;
        args.unshift(parent);
        return new ZipObservable(args, resultSelector);
    };
    /**
     * Merges the specified observable sequences into one observable sequence by using the selector function whenever all of the observable sequences have produced an element at a corresponding index.
     * @param arguments Observable sources.
     * @param {Function} resultSelector Function to invoke for each series of elements at corresponding indexes in the sources.
     * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function.
     */
    Observable.zip = function () {
        var len = arguments.length, args = new Array(len);
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
        }
        if (Array.isArray(args[0])) {
            args = isFunction(args[1]) ? args[0].concat(args[1]) : args[0];
        }
        var first = args.shift();
        return first.zip.apply(first, args);
    };
    function falseFactory() { return false; }
    function emptyArrayFactory() { return []; }
    function argumentsToArray() {
        var len = arguments.length, args = new Array(len);
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
        }
        return args;
    }
    var ZipIterableObservable = (function (__super__) {
        inherits(ZipIterableObservable, __super__);
        function ZipIterableObservable(sources, cb) {
            this.sources = sources;
            this._cb = cb;
            __super__.call(this);
        }
        ZipIterableObservable.prototype.subscribeCore = function (o) {
            var sources = this.sources, len = sources.length, subscriptions = new Array(len);
            var state = {
                q: arrayInitialize(len, emptyArrayFactory),
                done: arrayInitialize(len, falseFactory),
                cb: this._cb,
                o: o
            };
            for (var i = 0; i < len; i++) {
                (function (i) {
                    var source = sources[i], sad = new SingleAssignmentDisposable();
                    (isArrayLike(source) || isIterable(source)) && (source = observableFrom(source));
                    subscriptions[i] = sad;
                    sad.setDisposable(source.subscribe(new ZipIterableObserver(state, i)));
                }(i));
            }
            return new NAryDisposable(subscriptions);
        };
        return ZipIterableObservable;
    }(ObservableBase));
    var ZipIterableObserver = (function (__super__) {
        inherits(ZipIterableObserver, __super__);
        function ZipIterableObserver(s, i) {
            this._s = s;
            this._i = i;
            __super__.call(this);
        }
        function notEmpty(x) { return x.length > 0; }
        function shiftEach(x) { return x.shift(); }
        function notTheSame(i) {
            return function (x, j) {
                return j !== i;
            };
        }
        ZipIterableObserver.prototype.next = function (x) {
            this._s.q[this._i].push(x);
            if (this._s.q.every(notEmpty)) {
                var queuedValues = this._s.q.map(shiftEach), res = tryCatch(this._s.cb).apply(null, queuedValues);
                if (res === errorObj) {
                    return this._s.o.onError(res.e);
                }
                this._s.o.onNext(res);
            }
            else if (this._s.done.filter(notTheSame(this._i)).every(identity)) {
                this._s.o.onCompleted();
            }
        };
        ZipIterableObserver.prototype.error = function (e) { this._s.o.onError(e); };
        ZipIterableObserver.prototype.completed = function () {
            this._s.done[this._i] = true;
            this._s.done.every(identity) && this._s.o.onCompleted();
        };
        return ZipIterableObserver;
    }(AbstractObserver));
    /**
     * Merges the specified observable sequences into one observable sequence by using the selector function whenever all of the observable sequences or an array have produced an element at a corresponding index.
     * The last element in the arguments must be a function to invoke for each series of elements at corresponding indexes in the args.
     * @returns {Observable} An observable sequence containing the result of combining elements of the args using the specified result selector function.
     */
    observableProto.zipIterable = function () {
        if (arguments.length === 0) {
            throw new Error('invalid arguments');
        }
        var len = arguments.length, args = new Array(len);
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
        }
        var resultSelector = isFunction(args[len - 1]) ? args.pop() : argumentsToArray;
        var parent = this;
        args.unshift(parent);
        return new ZipIterableObservable(args, resultSelector);
    };
    function asObservable(source) {
        return function subscribe(o) { return source.subscribe(o); };
    }
    /**
     *  Hides the identity of an observable sequence.
     * @returns {Observable} An observable sequence that hides the identity of the source sequence.
     */
    observableProto.asObservable = function () {
        return new AnonymousObservable(asObservable(this), this);
    };
    function toArray(x) { return x.toArray(); }
    function notEmpty(x) { return x.length > 0; }
    /**
     *  Projects each element of an observable sequence into zero or more buffers which are produced based on element count information.
     * @param {Number} count Length of each buffer.
     * @param {Number} [skip] Number of elements to skip between creation of consecutive buffers. If not provided, defaults to the count.
     * @returns {Observable} An observable sequence of buffers.
     */
    observableProto.bufferWithCount = observableProto.bufferCount = function (count, skip) {
        typeof skip !== 'number' && (skip = count);
        return this.windowWithCount(count, skip)
            .flatMap(toArray)
            .filter(notEmpty);
    };
    var DematerializeObservable = (function (__super__) {
        inherits(DematerializeObservable, __super__);
        function DematerializeObservable(source) {
            this.source = source;
            __super__.call(this);
        }
        DematerializeObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new DematerializeObserver(o));
        };
        return DematerializeObservable;
    }(ObservableBase));
    var DematerializeObserver = (function (__super__) {
        inherits(DematerializeObserver, __super__);
        function DematerializeObserver(o) {
            this._o = o;
            __super__.call(this);
        }
        DematerializeObserver.prototype.next = function (x) { x.accept(this._o); };
        DematerializeObserver.prototype.error = function (e) { this._o.onError(e); };
        DematerializeObserver.prototype.completed = function () { this._o.onCompleted(); };
        return DematerializeObserver;
    }(AbstractObserver));
    /**
     * Dematerializes the explicit notification values of an observable sequence as implicit notifications.
     * @returns {Observable} An observable sequence exhibiting the behavior corresponding to the source sequence's notification values.
     */
    observableProto.dematerialize = function () {
        return new DematerializeObservable(this);
    };
    var DistinctUntilChangedObservable = (function (__super__) {
        inherits(DistinctUntilChangedObservable, __super__);
        function DistinctUntilChangedObservable(source, keyFn, comparer) {
            this.source = source;
            this.keyFn = keyFn;
            this.comparer = comparer;
            __super__.call(this);
        }
        DistinctUntilChangedObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new DistinctUntilChangedObserver(o, this.keyFn, this.comparer));
        };
        return DistinctUntilChangedObservable;
    }(ObservableBase));
    var DistinctUntilChangedObserver = (function (__super__) {
        inherits(DistinctUntilChangedObserver, __super__);
        function DistinctUntilChangedObserver(o, keyFn, comparer) {
            this.o = o;
            this.keyFn = keyFn;
            this.comparer = comparer;
            this.hasCurrentKey = false;
            this.currentKey = null;
            __super__.call(this);
        }
        DistinctUntilChangedObserver.prototype.next = function (x) {
            var key = x, comparerEquals;
            if (isFunction(this.keyFn)) {
                key = tryCatch(this.keyFn)(x);
                if (key === errorObj) {
                    return this.o.onError(key.e);
                }
            }
            if (this.hasCurrentKey) {
                comparerEquals = tryCatch(this.comparer)(this.currentKey, key);
                if (comparerEquals === errorObj) {
                    return this.o.onError(comparerEquals.e);
                }
            }
            if (!this.hasCurrentKey || !comparerEquals) {
                this.hasCurrentKey = true;
                this.currentKey = key;
                this.o.onNext(x);
            }
        };
        DistinctUntilChangedObserver.prototype.error = function (e) {
            this.o.onError(e);
        };
        DistinctUntilChangedObserver.prototype.completed = function () {
            this.o.onCompleted();
        };
        return DistinctUntilChangedObserver;
    }(AbstractObserver));
    /**
    *  Returns an observable sequence that contains only distinct contiguous elements according to the keyFn and the comparer.
    * @param {Function} [keyFn] A function to compute the comparison key for each element. If not provided, it projects the value.
    * @param {Function} [comparer] Equality comparer for computed key values. If not provided, defaults to an equality comparer function.
    * @returns {Observable} An observable sequence only containing the distinct contiguous elements, based on a computed key value, from the source sequence.
    */
    observableProto.distinctUntilChanged = function (keyFn, comparer) {
        comparer || (comparer = defaultComparer);
        return new DistinctUntilChangedObservable(this, keyFn, comparer);
    };
    var TapObservable = (function (__super__) {
        inherits(TapObservable, __super__);
        function TapObservable(source, observerOrOnNext, onError, onCompleted) {
            this.source = source;
            this._oN = observerOrOnNext;
            this._oE = onError;
            this._oC = onCompleted;
            __super__.call(this);
        }
        TapObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new InnerObserver(o, this));
        };
        inherits(InnerObserver, AbstractObserver);
        function InnerObserver(o, p) {
            this.o = o;
            this.t = !p._oN || isFunction(p._oN) ?
                observerCreate(p._oN || noop, p._oE || noop, p._oC || noop) :
                p._oN;
            this.isStopped = false;
            AbstractObserver.call(this);
        }
        InnerObserver.prototype.next = function (x) {
            var res = tryCatch(this.t.onNext).call(this.t, x);
            if (res === errorObj) {
                this.o.onError(res.e);
            }
            this.o.onNext(x);
        };
        InnerObserver.prototype.error = function (err) {
            var res = tryCatch(this.t.onError).call(this.t, err);
            if (res === errorObj) {
                return this.o.onError(res.e);
            }
            this.o.onError(err);
        };
        InnerObserver.prototype.completed = function () {
            var res = tryCatch(this.t.onCompleted).call(this.t);
            if (res === errorObj) {
                return this.o.onError(res.e);
            }
            this.o.onCompleted();
        };
        return TapObservable;
    }(ObservableBase));
    /**
    *  Invokes an action for each element in the observable sequence and invokes an action upon graceful or exceptional termination of the observable sequence.
    *  This method can be used for debugging, logging, etc. of query behavior by intercepting the message stream to run arbitrary actions for messages on the pipeline.
    * @param {Function | Observer} observerOrOnNext Action to invoke for each element in the observable sequence or an o.
    * @param {Function} [onError]  Action to invoke upon exceptional termination of the observable sequence. Used if only the observerOrOnNext parameter is also a function.
    * @param {Function} [onCompleted]  Action to invoke upon graceful termination of the observable sequence. Used if only the observerOrOnNext parameter is also a function.
    * @returns {Observable} The source sequence with the side-effecting behavior applied.
    */
    observableProto['do'] = observableProto.tap = observableProto.doAction = function (observerOrOnNext, onError, onCompleted) {
        return new TapObservable(this, observerOrOnNext, onError, onCompleted);
    };
    /**
    *  Invokes an action for each element in the observable sequence.
    *  This method can be used for debugging, logging, etc. of query behavior by intercepting the message stream to run arbitrary actions for messages on the pipeline.
    * @param {Function} onNext Action to invoke for each element in the observable sequence.
    * @param {Any} [thisArg] Object to use as this when executing callback.
    * @returns {Observable} The source sequence with the side-effecting behavior applied.
    */
    observableProto.doOnNext = observableProto.tapOnNext = function (onNext, thisArg) {
        return this.tap(typeof thisArg !== 'undefined' ? function (x) { onNext.call(thisArg, x); } : onNext);
    };
    /**
    *  Invokes an action upon exceptional termination of the observable sequence.
    *  This method can be used for debugging, logging, etc. of query behavior by intercepting the message stream to run arbitrary actions for messages on the pipeline.
    * @param {Function} onError Action to invoke upon exceptional termination of the observable sequence.
    * @param {Any} [thisArg] Object to use as this when executing callback.
    * @returns {Observable} The source sequence with the side-effecting behavior applied.
    */
    observableProto.doOnError = observableProto.tapOnError = function (onError, thisArg) {
        return this.tap(noop, typeof thisArg !== 'undefined' ? function (e) { onError.call(thisArg, e); } : onError);
    };
    /**
    *  Invokes an action upon graceful termination of the observable sequence.
    *  This method can be used for debugging, logging, etc. of query behavior by intercepting the message stream to run arbitrary actions for messages on the pipeline.
    * @param {Function} onCompleted Action to invoke upon graceful termination of the observable sequence.
    * @param {Any} [thisArg] Object to use as this when executing callback.
    * @returns {Observable} The source sequence with the side-effecting behavior applied.
    */
    observableProto.doOnCompleted = observableProto.tapOnCompleted = function (onCompleted, thisArg) {
        return this.tap(noop, null, typeof thisArg !== 'undefined' ? function () { onCompleted.call(thisArg); } : onCompleted);
    };
    var FinallyObservable = (function (__super__) {
        inherits(FinallyObservable, __super__);
        function FinallyObservable(source, fn, thisArg) {
            this.source = source;
            this._fn = bindCallback(fn, thisArg, 0);
            __super__.call(this);
        }
        FinallyObservable.prototype.subscribeCore = function (o) {
            var d = tryCatch(this.source.subscribe).call(this.source, o);
            if (d === errorObj) {
                this._fn();
                thrower(d.e);
            }
            return new FinallyDisposable(d, this._fn);
        };
        function FinallyDisposable(s, fn) {
            this.isDisposed = false;
            this._s = s;
            this._fn = fn;
        }
        FinallyDisposable.prototype.dispose = function () {
            if (!this.isDisposed) {
                var res = tryCatch(this._s.dispose).call(this._s);
                this._fn();
                res === errorObj && thrower(res.e);
            }
        };
        return FinallyObservable;
    }(ObservableBase));
    /**
     *  Invokes a specified action after the source observable sequence terminates gracefully or exceptionally.
     * @param {Function} finallyAction Action to invoke after the source observable sequence terminates.
     * @returns {Observable} Source sequence with the action-invoking termination behavior applied.
     */
    observableProto['finally'] = function (action, thisArg) {
        return new FinallyObservable(this, action, thisArg);
    };
    var IgnoreElementsObservable = (function (__super__) {
        inherits(IgnoreElementsObservable, __super__);
        function IgnoreElementsObservable(source) {
            this.source = source;
            __super__.call(this);
        }
        IgnoreElementsObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new InnerObserver(o));
        };
        function InnerObserver(o) {
            this.o = o;
            this.isStopped = false;
        }
        InnerObserver.prototype.onNext = noop;
        InnerObserver.prototype.onError = function (err) {
            if (!this.isStopped) {
                this.isStopped = true;
                this.o.onError(err);
            }
        };
        InnerObserver.prototype.onCompleted = function () {
            if (!this.isStopped) {
                this.isStopped = true;
                this.o.onCompleted();
            }
        };
        InnerObserver.prototype.dispose = function () { this.isStopped = true; };
        InnerObserver.prototype.fail = function (e) {
            if (!this.isStopped) {
                this.isStopped = true;
                this.observer.onError(e);
                return true;
            }
            return false;
        };
        return IgnoreElementsObservable;
    }(ObservableBase));
    /**
     *  Ignores all elements in an observable sequence leaving only the termination messages.
     * @returns {Observable} An empty observable sequence that signals termination, successful or exceptional, of the source sequence.
     */
    observableProto.ignoreElements = function () {
        return new IgnoreElementsObservable(this);
    };
    var MaterializeObservable = (function (__super__) {
        inherits(MaterializeObservable, __super__);
        function MaterializeObservable(source, fn) {
            this.source = source;
            __super__.call(this);
        }
        MaterializeObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new MaterializeObserver(o));
        };
        return MaterializeObservable;
    }(ObservableBase));
    var MaterializeObserver = (function (__super__) {
        inherits(MaterializeObserver, __super__);
        function MaterializeObserver(o) {
            this._o = o;
            __super__.call(this);
        }
        MaterializeObserver.prototype.next = function (x) { this._o.onNext(notificationCreateOnNext(x)); };
        MaterializeObserver.prototype.error = function (e) { this._o.onNext(notificationCreateOnError(e)); this._o.onCompleted(); };
        MaterializeObserver.prototype.completed = function () { this._o.onNext(notificationCreateOnCompleted()); this._o.onCompleted(); };
        return MaterializeObserver;
    }(AbstractObserver));
    /**
     *  Materializes the implicit notifications of an observable sequence as explicit notification values.
     * @returns {Observable} An observable sequence containing the materialized notification values from the source sequence.
     */
    observableProto.materialize = function () {
        return new MaterializeObservable(this);
    };
    /**
     *  Repeats the observable sequence a specified number of times. If the repeat count is not specified, the sequence repeats indefinitely.
     * @param {Number} [repeatCount]  Number of times to repeat the sequence. If not provided, repeats the sequence indefinitely.
     * @returns {Observable} The observable sequence producing the elements of the given sequence repeatedly.
     */
    observableProto.repeat = function (repeatCount) {
        return enumerableRepeat(this, repeatCount).concat();
    };
    /**
     *  Repeats the source observable sequence the specified number of times or until it successfully terminates. If the retry count is not specified, it retries indefinitely.
     *  Note if you encounter an error and want it to retry once, then you must use .retry(2);
     *
     * @example
     *  var res = retried = retry.repeat();
     *  var res = retried = retry.repeat(2);
     * @param {Number} [retryCount]  Number of times to retry the sequence. If not provided, retry the sequence indefinitely.
     * @returns {Observable} An observable sequence producing the elements of the given sequence repeatedly until it terminates successfully.
     */
    observableProto.retry = function (retryCount) {
        return enumerableRepeat(this, retryCount).catchError();
    };
    function repeat(value) {
        return {
            '@@iterator': function () {
                return {
                    next: function () {
                        return { done: false, value: value };
                    }
                };
            }
        };
    }
    var RetryWhenObservable = (function (__super__) {
        function createDisposable(state) {
            return {
                isDisposed: false,
                dispose: function () {
                    if (!this.isDisposed) {
                        this.isDisposed = true;
                        state.isDisposed = true;
                    }
                }
            };
        }
        function RetryWhenObservable(source, notifier) {
            this.source = source;
            this._notifier = notifier;
            __super__.call(this);
        }
        inherits(RetryWhenObservable, __super__);
        RetryWhenObservable.prototype.subscribeCore = function (o) {
            var exceptions = new Subject(), notifier = new Subject(), handled = this._notifier(exceptions), notificationDisposable = handled.subscribe(notifier);
            var e = this.source['@@iterator']();
            var state = { isDisposed: false }, lastError, subscription = new SerialDisposable();
            var cancelable = currentThreadScheduler.scheduleRecursive(null, function (_, recurse) {
                if (state.isDisposed) {
                    return;
                }
                var currentItem = e.next();
                if (currentItem.done) {
                    if (lastError) {
                        o.onError(lastError);
                    }
                    else {
                        o.onCompleted();
                    }
                    return;
                }
                // Check if promise
                var currentValue = currentItem.value;
                isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));
                var outer = new SingleAssignmentDisposable();
                var inner = new SingleAssignmentDisposable();
                subscription.setDisposable(new BinaryDisposable(inner, outer));
                outer.setDisposable(currentValue.subscribe(function (x) { o.onNext(x); }, function (exn) {
                    inner.setDisposable(notifier.subscribe(recurse, function (ex) {
                        o.onError(ex);
                    }, function () {
                        o.onCompleted();
                    }));
                    exceptions.onNext(exn);
                    outer.dispose();
                }, function () { o.onCompleted(); }));
            });
            return new NAryDisposable([notificationDisposable, subscription, cancelable, createDisposable(state)]);
        };
        return RetryWhenObservable;
    }(ObservableBase));
    observableProto.retryWhen = function (notifier) {
        return new RetryWhenObservable(repeat(this), notifier);
    };
    function repeat(value) {
        return {
            '@@iterator': function () {
                return {
                    next: function () {
                        return { done: false, value: value };
                    }
                };
            }
        };
    }
    var RepeatWhenObservable = (function (__super__) {
        function createDisposable(state) {
            return {
                isDisposed: false,
                dispose: function () {
                    if (!this.isDisposed) {
                        this.isDisposed = true;
                        state.isDisposed = true;
                    }
                }
            };
        }
        function RepeatWhenObservable(source, notifier) {
            this.source = source;
            this._notifier = notifier;
            __super__.call(this);
        }
        inherits(RepeatWhenObservable, __super__);
        RepeatWhenObservable.prototype.subscribeCore = function (o) {
            var completions = new Subject(), notifier = new Subject(), handled = this._notifier(completions), notificationDisposable = handled.subscribe(notifier);
            var e = this.source['@@iterator']();
            var state = { isDisposed: false }, lastError, subscription = new SerialDisposable();
            var cancelable = currentThreadScheduler.scheduleRecursive(null, function (_, recurse) {
                if (state.isDisposed) {
                    return;
                }
                var currentItem = e.next();
                if (currentItem.done) {
                    if (lastError) {
                        o.onError(lastError);
                    }
                    else {
                        o.onCompleted();
                    }
                    return;
                }
                // Check if promise
                var currentValue = currentItem.value;
                isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));
                var outer = new SingleAssignmentDisposable();
                var inner = new SingleAssignmentDisposable();
                subscription.setDisposable(new BinaryDisposable(inner, outer));
                outer.setDisposable(currentValue.subscribe(function (x) { o.onNext(x); }, function (exn) { o.onError(exn); }, function () {
                    inner.setDisposable(notifier.subscribe(recurse, function (ex) {
                        o.onError(ex);
                    }, function () {
                        o.onCompleted();
                    }));
                    completions.onNext(null);
                    outer.dispose();
                }));
            });
            return new NAryDisposable([notificationDisposable, subscription, cancelable, createDisposable(state)]);
        };
        return RepeatWhenObservable;
    }(ObservableBase));
    observableProto.repeatWhen = function (notifier) {
        return new RepeatWhenObservable(repeat(this), notifier);
    };
    var ScanObservable = (function (__super__) {
        inherits(ScanObservable, __super__);
        function ScanObservable(source, accumulator, hasSeed, seed) {
            this.source = source;
            this.accumulator = accumulator;
            this.hasSeed = hasSeed;
            this.seed = seed;
            __super__.call(this);
        }
        ScanObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new ScanObserver(o, this));
        };
        return ScanObservable;
    }(ObservableBase));
    var ScanObserver = (function (__super__) {
        inherits(ScanObserver, __super__);
        function ScanObserver(o, parent) {
            this._o = o;
            this._p = parent;
            this._fn = parent.accumulator;
            this._hs = parent.hasSeed;
            this._s = parent.seed;
            this._ha = false;
            this._a = null;
            this._hv = false;
            this._i = 0;
            __super__.call(this);
        }
        ScanObserver.prototype.next = function (x) {
            !this._hv && (this._hv = true);
            if (this._ha) {
                this._a = tryCatch(this._fn)(this._a, x, this._i, this._p);
            }
            else {
                this._a = this._hs ? tryCatch(this._fn)(this._s, x, this._i, this._p) : x;
                this._ha = true;
            }
            if (this._a === errorObj) {
                return this._o.onError(this._a.e);
            }
            this._o.onNext(this._a);
            this._i++;
        };
        ScanObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        ScanObserver.prototype.completed = function () {
            !this._hv && this._hs && this._o.onNext(this._s);
            this._o.onCompleted();
        };
        return ScanObserver;
    }(AbstractObserver));
    /**
    *  Applies an accumulator function over an observable sequence and returns each intermediate result. The optional seed value is used as the initial accumulator value.
    *  For aggregation behavior with no intermediate results, see Observable.aggregate.
    * @param {Mixed} [seed] The initial accumulator value.
    * @param {Function} accumulator An accumulator function to be invoked on each element.
    * @returns {Observable} An observable sequence containing the accumulated values.
    */
    observableProto.scan = function () {
        var hasSeed = false, seed, accumulator = arguments[0];
        if (arguments.length === 2) {
            hasSeed = true;
            seed = arguments[1];
        }
        return new ScanObservable(this, accumulator, hasSeed, seed);
    };
    var SkipLastObservable = (function (__super__) {
        inherits(SkipLastObservable, __super__);
        function SkipLastObservable(source, c) {
            this.source = source;
            this._c = c;
            __super__.call(this);
        }
        SkipLastObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new SkipLastObserver(o, this._c));
        };
        return SkipLastObservable;
    }(ObservableBase));
    var SkipLastObserver = (function (__super__) {
        inherits(SkipLastObserver, __super__);
        function SkipLastObserver(o, c) {
            this._o = o;
            this._c = c;
            this._q = [];
            __super__.call(this);
        }
        SkipLastObserver.prototype.next = function (x) {
            this._q.push(x);
            this._q.length > this._c && this._o.onNext(this._q.shift());
        };
        SkipLastObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        SkipLastObserver.prototype.completed = function () {
            this._o.onCompleted();
        };
        return SkipLastObserver;
    }(AbstractObserver));
    /**
     *  Bypasses a specified number of elements at the end of an observable sequence.
     * @description
     *  This operator accumulates a queue with a length enough to store the first `count` elements. As more elements are
     *  received, elements are taken from the front of the queue and produced on the result sequence. This causes elements to be delayed.
     * @param count Number of elements to bypass at the end of the source sequence.
     * @returns {Observable} An observable sequence containing the source sequence elements except for the bypassed ones at the end.
     */
    observableProto.skipLast = function (count) {
        if (count < 0) {
            throw new ArgumentOutOfRangeError();
        }
        return new SkipLastObservable(this, count);
    };
    /**
     *  Prepends a sequence of values to an observable sequence with an optional scheduler and an argument list of values to prepend.
     *  @example
     *  var res = source.startWith(1, 2, 3);
     *  var res = source.startWith(Rx.Scheduler.timeout, 1, 2, 3);
     * @param {Arguments} args The specified values to prepend to the observable sequence
     * @returns {Observable} The source sequence prepended with the specified values.
     */
    observableProto.startWith = function () {
        var values, scheduler, start = 0;
        if (!!arguments.length && isScheduler(arguments[0])) {
            scheduler = arguments[0];
            start = 1;
        }
        else {
            scheduler = immediateScheduler;
        }
        for (var args = [], i = start, len = arguments.length; i < len; i++) {
            args.push(arguments[i]);
        }
        return observableConcat.apply(null, [observableFromArray(args, scheduler), this]);
    };
    var TakeLastObserver = (function (__super__) {
        inherits(TakeLastObserver, __super__);
        function TakeLastObserver(o, c) {
            this._o = o;
            this._c = c;
            this._q = [];
            __super__.call(this);
        }
        TakeLastObserver.prototype.next = function (x) {
            this._q.push(x);
            this._q.length > this._c && this._q.shift();
        };
        TakeLastObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        TakeLastObserver.prototype.completed = function () {
            while (this._q.length > 0) {
                this._o.onNext(this._q.shift());
            }
            this._o.onCompleted();
        };
        return TakeLastObserver;
    }(AbstractObserver));
    /**
     *  Returns a specified number of contiguous elements from the end of an observable sequence.
     * @description
     *  This operator accumulates a buffer with a length enough to store elements count elements. Upon completion of
     *  the source sequence, this buffer is drained on the result sequence. This causes the elements to be delayed.
     * @param {Number} count Number of elements to take from the end of the source sequence.
     * @returns {Observable} An observable sequence containing the specified number of elements from the end of the source sequence.
     */
    observableProto.takeLast = function (count) {
        if (count < 0) {
            throw new ArgumentOutOfRangeError();
        }
        var source = this;
        return new AnonymousObservable(function (o) {
            return source.subscribe(new TakeLastObserver(o, count));
        }, source);
    };
    var TakeLastBufferObserver = (function (__super__) {
        inherits(TakeLastBufferObserver, __super__);
        function TakeLastBufferObserver(o, c) {
            this._o = o;
            this._c = c;
            this._q = [];
            __super__.call(this);
        }
        TakeLastBufferObserver.prototype.next = function (x) {
            this._q.push(x);
            this._q.length > this._c && this._q.shift();
        };
        TakeLastBufferObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        TakeLastBufferObserver.prototype.completed = function () {
            this._o.onNext(this._q);
            this._o.onCompleted();
        };
        return TakeLastBufferObserver;
    }(AbstractObserver));
    /**
     *  Returns an array with the specified number of contiguous elements from the end of an observable sequence.
     *
     * @description
     *  This operator accumulates a buffer with a length enough to store count elements. Upon completion of the
     *  source sequence, this buffer is produced on the result sequence.
     * @param {Number} count Number of elements to take from the end of the source sequence.
     * @returns {Observable} An observable sequence containing a single array with the specified number of elements from the end of the source sequence.
     */
    observableProto.takeLastBuffer = function (count) {
        if (count < 0) {
            throw new ArgumentOutOfRangeError();
        }
        var source = this;
        return new AnonymousObservable(function (o) {
            return source.subscribe(new TakeLastBufferObserver(o, count));
        }, source);
    };
    /**
     *  Projects each element of an observable sequence into zero or more windows which are produced based on element count information.
     * @param {Number} count Length of each window.
     * @param {Number} [skip] Number of elements to skip between creation of consecutive windows. If not specified, defaults to the count.
     * @returns {Observable} An observable sequence of windows.
     */
    observableProto.windowWithCount = observableProto.windowCount = function (count, skip) {
        var source = this;
        +count || (count = 0);
        Math.abs(count) === Infinity && (count = 0);
        if (count <= 0) {
            throw new ArgumentOutOfRangeError();
        }
        skip == null && (skip = count);
        +skip || (skip = 0);
        Math.abs(skip) === Infinity && (skip = 0);
        if (skip <= 0) {
            throw new ArgumentOutOfRangeError();
        }
        return new AnonymousObservable(function (observer) {
            var m = new SingleAssignmentDisposable(), refCountDisposable = new RefCountDisposable(m), n = 0, q = [];
            function createWindow() {
                var s = new Subject();
                q.push(s);
                observer.onNext(addRef(s, refCountDisposable));
            }
            createWindow();
            m.setDisposable(source.subscribe(function (x) {
                for (var i = 0, len = q.length; i < len; i++) {
                    q[i].onNext(x);
                }
                var c = n - count + 1;
                c >= 0 && c % skip === 0 && q.shift().onCompleted();
                ++n % skip === 0 && createWindow();
            }, function (e) {
                while (q.length > 0) {
                    q.shift().onError(e);
                }
                observer.onError(e);
            }, function () {
                while (q.length > 0) {
                    q.shift().onCompleted();
                }
                observer.onCompleted();
            }));
            return refCountDisposable;
        }, source);
    };
    observableProto.flatMapConcat = observableProto.concatMap = function (selector, resultSelector, thisArg) {
        return new FlatMapObservable(this, selector, resultSelector, thisArg).merge(1);
    };
    /**
     * Projects each notification of an observable sequence to an observable sequence and concats the resulting observable sequences into one observable sequence.
     * @param {Function} onNext A transform function to apply to each element; the second parameter of the function represents the index of the source element.
     * @param {Function} onError A transform function to apply when an error occurs in the source sequence.
     * @param {Function} onCompleted A transform function to apply when the end of the source sequence is reached.
     * @param {Any} [thisArg] An optional "this" to use to invoke each transform.
     * @returns {Observable} An observable sequence whose elements are the result of invoking the one-to-many transform function corresponding to each notification in the input sequence.
     */
    observableProto.concatMapObserver = observableProto.selectConcatObserver = function (onNext, onError, onCompleted, thisArg) {
        var source = this, onNextFunc = bindCallback(onNext, thisArg, 2), onErrorFunc = bindCallback(onError, thisArg, 1), onCompletedFunc = bindCallback(onCompleted, thisArg, 0);
        return new AnonymousObservable(function (observer) {
            var index = 0;
            return source.subscribe(function (x) {
                var result;
                try {
                    result = onNextFunc(x, index++);
                }
                catch (e) {
                    observer.onError(e);
                    return;
                }
                isPromise(result) && (result = observableFromPromise(result));
                observer.onNext(result);
            }, function (err) {
                var result;
                try {
                    result = onErrorFunc(err);
                }
                catch (e) {
                    observer.onError(e);
                    return;
                }
                isPromise(result) && (result = observableFromPromise(result));
                observer.onNext(result);
                observer.onCompleted();
            }, function () {
                var result;
                try {
                    result = onCompletedFunc();
                }
                catch (e) {
                    observer.onError(e);
                    return;
                }
                isPromise(result) && (result = observableFromPromise(result));
                observer.onNext(result);
                observer.onCompleted();
            });
        }, this).concatAll();
    };
    var DefaultIfEmptyObserver = (function (__super__) {
        inherits(DefaultIfEmptyObserver, __super__);
        function DefaultIfEmptyObserver(o, d) {
            this._o = o;
            this._d = d;
            this._f = false;
            __super__.call(this);
        }
        DefaultIfEmptyObserver.prototype.next = function (x) {
            this._f = true;
            this._o.onNext(x);
        };
        DefaultIfEmptyObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        DefaultIfEmptyObserver.prototype.completed = function () {
            !this._f && this._o.onNext(this._d);
            this._o.onCompleted();
        };
        return DefaultIfEmptyObserver;
    }(AbstractObserver));
    /**
     *  Returns the elements of the specified sequence or the specified value in a singleton sequence if the sequence is empty.
     *
     *  var res = obs = xs.defaultIfEmpty();
     *  2 - obs = xs.defaultIfEmpty(false);
     *
     * @memberOf Observable#
     * @param defaultValue The value to return if the sequence is empty. If not provided, this defaults to null.
     * @returns {Observable} An observable sequence that contains the specified default value if the source is empty; otherwise, the elements of the source itself.
     */
    observableProto.defaultIfEmpty = function (defaultValue) {
        var source = this;
        defaultValue === undefined && (defaultValue = null);
        return new AnonymousObservable(function (o) {
            return source.subscribe(new DefaultIfEmptyObserver(o, defaultValue));
        }, source);
    };
    // Swap out for Array.findIndex
    function arrayIndexOfComparer(array, item, comparer) {
        for (var i = 0, len = array.length; i < len; i++) {
            if (comparer(array[i], item)) {
                return i;
            }
        }
        return -1;
    }
    function HashSet(comparer) {
        this.comparer = comparer;
        this.set = [];
    }
    HashSet.prototype.push = function (value) {
        var retValue = arrayIndexOfComparer(this.set, value, this.comparer) === -1;
        retValue && this.set.push(value);
        return retValue;
    };
    var DistinctObservable = (function (__super__) {
        inherits(DistinctObservable, __super__);
        function DistinctObservable(source, keyFn, cmpFn) {
            this.source = source;
            this._keyFn = keyFn;
            this._cmpFn = cmpFn;
            __super__.call(this);
        }
        DistinctObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new DistinctObserver(o, this._keyFn, this._cmpFn));
        };
        return DistinctObservable;
    }(ObservableBase));
    var DistinctObserver = (function (__super__) {
        inherits(DistinctObserver, __super__);
        function DistinctObserver(o, keyFn, cmpFn) {
            this._o = o;
            this._keyFn = keyFn;
            this._h = new HashSet(cmpFn);
            __super__.call(this);
        }
        DistinctObserver.prototype.next = function (x) {
            var key = x;
            if (isFunction(this._keyFn)) {
                key = tryCatch(this._keyFn)(x);
                if (key === errorObj) {
                    return this._o.onError(key.e);
                }
            }
            this._h.push(key) && this._o.onNext(x);
        };
        DistinctObserver.prototype.error = function (e) { this._o.onError(e); };
        DistinctObserver.prototype.completed = function () { this._o.onCompleted(); };
        return DistinctObserver;
    }(AbstractObserver));
    /**
     *  Returns an observable sequence that contains only distinct elements according to the keySelector and the comparer.
     *  Usage of this operator should be considered carefully due to the maintenance of an internal lookup structure which can grow large.
     *
     * @example
     *  var res = obs = xs.distinct();
     *  2 - obs = xs.distinct(function (x) { return x.id; });
     *  2 - obs = xs.distinct(function (x) { return x.id; }, function (a,b) { return a === b; });
     * @param {Function} [keySelector]  A function to compute the comparison key for each element.
     * @param {Function} [comparer]  Used to compare items in the collection.
     * @returns {Observable} An observable sequence only containing the distinct elements, based on a computed key value, from the source sequence.
     */
    observableProto.distinct = function (keySelector, comparer) {
        comparer || (comparer = defaultComparer);
        return new DistinctObservable(this, keySelector, comparer);
    };
    var MapObservable = (function (__super__) {
        inherits(MapObservable, __super__);
        function MapObservable(source, selector, thisArg) {
            this.source = source;
            this.selector = bindCallback(selector, thisArg, 3);
            __super__.call(this);
        }
        function innerMap(selector, self) {
            return function (x, i, o) { return selector.call(this, self.selector(x, i, o), i, o); };
        }
        MapObservable.prototype.internalMap = function (selector, thisArg) {
            return new MapObservable(this.source, innerMap(selector, this), thisArg);
        };
        MapObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new InnerObserver(o, this.selector, this));
        };
        inherits(InnerObserver, AbstractObserver);
        function InnerObserver(o, selector, source) {
            this.o = o;
            this.selector = selector;
            this.source = source;
            this.i = 0;
            AbstractObserver.call(this);
        }
        InnerObserver.prototype.next = function (x) {
            var result = tryCatch(this.selector)(x, this.i++, this.source);
            if (result === errorObj) {
                return this.o.onError(result.e);
            }
            this.o.onNext(result);
        };
        InnerObserver.prototype.error = function (e) {
            this.o.onError(e);
        };
        InnerObserver.prototype.completed = function () {
            this.o.onCompleted();
        };
        return MapObservable;
    }(ObservableBase));
    /**
    * Projects each element of an observable sequence into a new form by incorporating the element's index.
    * @param {Function} selector A transform function to apply to each source element; the second parameter of the function represents the index of the source element.
    * @param {Any} [thisArg] Object to use as this when executing callback.
    * @returns {Observable} An observable sequence whose elements are the result of invoking the transform function on each element of source.
    */
    observableProto.map = observableProto.select = function (selector, thisArg) {
        var selectorFn = typeof selector === 'function' ? selector : function () { return selector; };
        return this instanceof MapObservable ?
            this.internalMap(selectorFn, thisArg) :
            new MapObservable(this, selectorFn, thisArg);
    };
    function plucker(args, len) {
        return function mapper(x) {
            var currentProp = x;
            for (var i = 0; i < len; i++) {
                var p = currentProp[args[i]];
                if (typeof p !== 'undefined') {
                    currentProp = p;
                }
                else {
                    return undefined;
                }
            }
            return currentProp;
        };
    }
    /**
     * Retrieves the value of a specified nested property from all elements in
     * the Observable sequence.
     * @param {Arguments} arguments The nested properties to pluck.
     * @returns {Observable} Returns a new Observable sequence of property values.
     */
    observableProto.pluck = function () {
        var len = arguments.length, args = new Array(len);
        if (len === 0) {
            throw new Error('List of properties cannot be empty.');
        }
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
        }
        return this.map(plucker(args, len));
    };
    /**
     * Projects each notification of an observable sequence to an observable sequence and merges the resulting observable sequences into one observable sequence.
     * @param {Function} onNext A transform function to apply to each element; the second parameter of the function represents the index of the source element.
     * @param {Function} onError A transform function to apply when an error occurs in the source sequence.
     * @param {Function} onCompleted A transform function to apply when the end of the source sequence is reached.
     * @param {Any} [thisArg] An optional "this" to use to invoke each transform.
     * @returns {Observable} An observable sequence whose elements are the result of invoking the one-to-many transform function corresponding to each notification in the input sequence.
     */
    observableProto.flatMapObserver = observableProto.selectManyObserver = function (onNext, onError, onCompleted, thisArg) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var index = 0;
            return source.subscribe(function (x) {
                var result;
                try {
                    result = onNext.call(thisArg, x, index++);
                }
                catch (e) {
                    observer.onError(e);
                    return;
                }
                isPromise(result) && (result = observableFromPromise(result));
                observer.onNext(result);
            }, function (err) {
                var result;
                try {
                    result = onError.call(thisArg, err);
                }
                catch (e) {
                    observer.onError(e);
                    return;
                }
                isPromise(result) && (result = observableFromPromise(result));
                observer.onNext(result);
                observer.onCompleted();
            }, function () {
                var result;
                try {
                    result = onCompleted.call(thisArg);
                }
                catch (e) {
                    observer.onError(e);
                    return;
                }
                isPromise(result) && (result = observableFromPromise(result));
                observer.onNext(result);
                observer.onCompleted();
            });
        }, source).mergeAll();
    };
    observableProto.flatMap = observableProto.selectMany = observableProto.mergeMap = function (selector, resultSelector, thisArg) {
        return new FlatMapObservable(this, selector, resultSelector, thisArg).mergeAll();
    };
    observableProto.flatMapLatest = observableProto.switchMap = function (selector, resultSelector, thisArg) {
        return new FlatMapObservable(this, selector, resultSelector, thisArg).switchLatest();
    };
    var SkipObservable = (function (__super__) {
        inherits(SkipObservable, __super__);
        function SkipObservable(source, count) {
            this.source = source;
            this._count = count;
            __super__.call(this);
        }
        SkipObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new SkipObserver(o, this._count));
        };
        function SkipObserver(o, c) {
            this._o = o;
            this._r = c;
            AbstractObserver.call(this);
        }
        inherits(SkipObserver, AbstractObserver);
        SkipObserver.prototype.next = function (x) {
            if (this._r <= 0) {
                this._o.onNext(x);
            }
            else {
                this._r--;
            }
        };
        SkipObserver.prototype.error = function (e) { this._o.onError(e); };
        SkipObserver.prototype.completed = function () { this._o.onCompleted(); };
        return SkipObservable;
    }(ObservableBase));
    /**
     * Bypasses a specified number of elements in an observable sequence and then returns the remaining elements.
     * @param {Number} count The number of elements to skip before returning the remaining elements.
     * @returns {Observable} An observable sequence that contains the elements that occur after the specified index in the input sequence.
     */
    observableProto.skip = function (count) {
        if (count < 0) {
            throw new ArgumentOutOfRangeError();
        }
        return new SkipObservable(this, count);
    };
    var SkipWhileObservable = (function (__super__) {
        inherits(SkipWhileObservable, __super__);
        function SkipWhileObservable(source, fn) {
            this.source = source;
            this._fn = fn;
            __super__.call(this);
        }
        SkipWhileObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new SkipWhileObserver(o, this));
        };
        return SkipWhileObservable;
    }(ObservableBase));
    var SkipWhileObserver = (function (__super__) {
        inherits(SkipWhileObserver, __super__);
        function SkipWhileObserver(o, p) {
            this._o = o;
            this._p = p;
            this._i = 0;
            this._r = false;
            __super__.call(this);
        }
        SkipWhileObserver.prototype.next = function (x) {
            if (!this._r) {
                var res = tryCatch(this._p._fn)(x, this._i++, this._p);
                if (res === errorObj) {
                    return this._o.onError(res.e);
                }
                this._r = !res;
            }
            this._r && this._o.onNext(x);
        };
        SkipWhileObserver.prototype.error = function (e) { this._o.onError(e); };
        SkipWhileObserver.prototype.completed = function () { this._o.onCompleted(); };
        return SkipWhileObserver;
    }(AbstractObserver));
    /**
     *  Bypasses elements in an observable sequence as long as a specified condition is true and then returns the remaining elements.
     *  The element's index is used in the logic of the predicate function.
     *
     *  var res = source.skipWhile(function (value) { return value < 10; });
     *  var res = source.skipWhile(function (value, index) { return value < 10 || index < 10; });
     * @param {Function} predicate A function to test each element for a condition; the second parameter of the function represents the index of the source element.
     * @param {Any} [thisArg] Object to use as this when executing callback.
     * @returns {Observable} An observable sequence that contains the elements from the input sequence starting at the first element in the linear series that does not pass the test specified by predicate.
     */
    observableProto.skipWhile = function (predicate, thisArg) {
        var fn = bindCallback(predicate, thisArg, 3);
        return new SkipWhileObservable(this, fn);
    };
    var TakeObservable = (function (__super__) {
        inherits(TakeObservable, __super__);
        function TakeObservable(source, count) {
            this.source = source;
            this._count = count;
            __super__.call(this);
        }
        TakeObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new TakeObserver(o, this._count));
        };
        function TakeObserver(o, c) {
            this._o = o;
            this._c = c;
            this._r = c;
            AbstractObserver.call(this);
        }
        inherits(TakeObserver, AbstractObserver);
        TakeObserver.prototype.next = function (x) {
            if (this._r-- > 0) {
                this._o.onNext(x);
                this._r <= 0 && this._o.onCompleted();
            }
        };
        TakeObserver.prototype.error = function (e) { this._o.onError(e); };
        TakeObserver.prototype.completed = function () { this._o.onCompleted(); };
        return TakeObservable;
    }(ObservableBase));
    /**
     *  Returns a specified number of contiguous elements from the start of an observable sequence, using the specified scheduler for the edge case of take(0).
     * @param {Number} count The number of elements to return.
     * @param {Scheduler} [scheduler] Scheduler used to produce an OnCompleted message in case <paramref name="count count</paramref> is set to 0.
     * @returns {Observable} An observable sequence that contains the specified number of elements from the start of the input sequence.
     */
    observableProto.take = function (count, scheduler) {
        if (count < 0) {
            throw new ArgumentOutOfRangeError();
        }
        if (count === 0) {
            return observableEmpty(scheduler);
        }
        return new TakeObservable(this, count);
    };
    var TakeWhileObservable = (function (__super__) {
        inherits(TakeWhileObservable, __super__);
        function TakeWhileObservable(source, fn) {
            this.source = source;
            this._fn = fn;
            __super__.call(this);
        }
        TakeWhileObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new TakeWhileObserver(o, this));
        };
        return TakeWhileObservable;
    }(ObservableBase));
    var TakeWhileObserver = (function (__super__) {
        inherits(TakeWhileObserver, __super__);
        function TakeWhileObserver(o, p) {
            this._o = o;
            this._p = p;
            this._i = 0;
            this._r = true;
            __super__.call(this);
        }
        TakeWhileObserver.prototype.next = function (x) {
            if (this._r) {
                this._r = tryCatch(this._p._fn)(x, this._i++, this._p);
                if (this._r === errorObj) {
                    return this._o.onError(this._r.e);
                }
            }
            if (this._r) {
                this._o.onNext(x);
            }
            else {
                this._o.onCompleted();
            }
        };
        TakeWhileObserver.prototype.error = function (e) { this._o.onError(e); };
        TakeWhileObserver.prototype.completed = function () { this._o.onCompleted(); };
        return TakeWhileObserver;
    }(AbstractObserver));
    /**
     *  Returns elements from an observable sequence as long as a specified condition is true.
     *  The element's index is used in the logic of the predicate function.
     * @param {Function} predicate A function to test each element for a condition; the second parameter of the function represents the index of the source element.
     * @param {Any} [thisArg] Object to use as this when executing callback.
     * @returns {Observable} An observable sequence that contains the elements from the input sequence that occur before the element at which the test no longer passes.
     */
    observableProto.takeWhile = function (predicate, thisArg) {
        var fn = bindCallback(predicate, thisArg, 3);
        return new TakeWhileObservable(this, fn);
    };
    var FilterObservable = (function (__super__) {
        inherits(FilterObservable, __super__);
        function FilterObservable(source, predicate, thisArg) {
            this.source = source;
            this.predicate = bindCallback(predicate, thisArg, 3);
            __super__.call(this);
        }
        FilterObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new InnerObserver(o, this.predicate, this));
        };
        function innerPredicate(predicate, self) {
            return function (x, i, o) { return self.predicate(x, i, o) && predicate.call(this, x, i, o); };
        }
        FilterObservable.prototype.internalFilter = function (predicate, thisArg) {
            return new FilterObservable(this.source, innerPredicate(predicate, this), thisArg);
        };
        inherits(InnerObserver, AbstractObserver);
        function InnerObserver(o, predicate, source) {
            this.o = o;
            this.predicate = predicate;
            this.source = source;
            this.i = 0;
            AbstractObserver.call(this);
        }
        InnerObserver.prototype.next = function (x) {
            var shouldYield = tryCatch(this.predicate)(x, this.i++, this.source);
            if (shouldYield === errorObj) {
                return this.o.onError(shouldYield.e);
            }
            shouldYield && this.o.onNext(x);
        };
        InnerObserver.prototype.error = function (e) {
            this.o.onError(e);
        };
        InnerObserver.prototype.completed = function () {
            this.o.onCompleted();
        };
        return FilterObservable;
    }(ObservableBase));
    /**
    *  Filters the elements of an observable sequence based on a predicate by incorporating the element's index.
    * @param {Function} predicate A function to test each source element for a condition; the second parameter of the function represents the index of the source element.
    * @param {Any} [thisArg] Object to use as this when executing callback.
    * @returns {Observable} An observable sequence that contains elements from the input sequence that satisfy the condition.
    */
    observableProto.filter = observableProto.where = function (predicate, thisArg) {
        return this instanceof FilterObservable ? this.internalFilter(predicate, thisArg) :
            new FilterObservable(this, predicate, thisArg);
    };
    var TransduceObserver = (function (__super__) {
        inherits(TransduceObserver, __super__);
        function TransduceObserver(o, xform) {
            this._o = o;
            this._xform = xform;
            __super__.call(this);
        }
        TransduceObserver.prototype.next = function (x) {
            var res = tryCatch(this._xform['@@transducer/step']).call(this._xform, this._o, x);
            if (res === errorObj) {
                this._o.onError(res.e);
            }
        };
        TransduceObserver.prototype.error = function (e) { this._o.onError(e); };
        TransduceObserver.prototype.completed = function () {
            this._xform['@@transducer/result'](this._o);
        };
        return TransduceObserver;
    }(AbstractObserver));
    function transformForObserver(o) {
        return {
            '@@transducer/init': function () {
                return o;
            },
            '@@transducer/step': function (obs, input) {
                return obs.onNext(input);
            },
            '@@transducer/result': function (obs) {
                return obs.onCompleted();
            }
        };
    }
    /**
     * Executes a transducer to transform the observable sequence
     * @param {Transducer} transducer A transducer to execute
     * @returns {Observable} An Observable sequence containing the results from the transducer.
     */
    observableProto.transduce = function (transducer) {
        var source = this;
        return new AnonymousObservable(function (o) {
            var xform = transducer(transformForObserver(o));
            return source.subscribe(new TransduceObserver(o, xform));
        }, source);
    };
    var AnonymousObservable = Rx.AnonymousObservable = (function (__super__) {
        inherits(AnonymousObservable, __super__);
        // Fix subscriber to check for undefined or function returned to decorate as Disposable
        function fixSubscriber(subscriber) {
            return subscriber && isFunction(subscriber.dispose) ? subscriber :
                isFunction(subscriber) ? disposableCreate(subscriber) : disposableEmpty;
        }
        function setDisposable(s, state) {
            var ado = state[0], self = state[1];
            var sub = tryCatch(self.__subscribe).call(self, ado);
            if (sub === errorObj && !ado.fail(errorObj.e)) {
                thrower(errorObj.e);
            }
            ado.setDisposable(fixSubscriber(sub));
        }
        function AnonymousObservable(subscribe, parent) {
            this.source = parent;
            this.__subscribe = subscribe;
            __super__.call(this);
        }
        AnonymousObservable.prototype._subscribe = function (o) {
            var ado = new AutoDetachObserver(o), state = [ado, this];
            if (currentThreadScheduler.scheduleRequired()) {
                currentThreadScheduler.schedule(state, setDisposable);
            }
            else {
                setDisposable(null, state);
            }
            return ado;
        };
        return AnonymousObservable;
    }(Observable));
    var AutoDetachObserver = (function (__super__) {
        inherits(AutoDetachObserver, __super__);
        function AutoDetachObserver(observer) {
            __super__.call(this);
            this.observer = observer;
            this.m = new SingleAssignmentDisposable();
        }
        var AutoDetachObserverPrototype = AutoDetachObserver.prototype;
        AutoDetachObserverPrototype.next = function (value) {
            var result = tryCatch(this.observer.onNext).call(this.observer, value);
            if (result === errorObj) {
                this.dispose();
                thrower(result.e);
            }
        };
        AutoDetachObserverPrototype.error = function (err) {
            var result = tryCatch(this.observer.onError).call(this.observer, err);
            this.dispose();
            result === errorObj && thrower(result.e);
        };
        AutoDetachObserverPrototype.completed = function () {
            var result = tryCatch(this.observer.onCompleted).call(this.observer);
            this.dispose();
            result === errorObj && thrower(result.e);
        };
        AutoDetachObserverPrototype.setDisposable = function (value) { this.m.setDisposable(value); };
        AutoDetachObserverPrototype.getDisposable = function () { return this.m.getDisposable(); };
        AutoDetachObserverPrototype.dispose = function () {
            __super__.prototype.dispose.call(this);
            this.m.dispose();
        };
        return AutoDetachObserver;
    }(AbstractObserver));
    var InnerSubscription = function (s, o) {
        this._s = s;
        this._o = o;
    };
    InnerSubscription.prototype.dispose = function () {
        if (!this._s.isDisposed && this._o !== null) {
            var idx = this._s.observers.indexOf(this._o);
            this._s.observers.splice(idx, 1);
            this._o = null;
        }
    };
    /**
     *  Represents an object that is both an observable sequence as well as an observer.
     *  Each notification is broadcasted to all subscribed observers.
     */
    var Subject = Rx.Subject = (function (__super__) {
        inherits(Subject, __super__);
        function Subject() {
            __super__.call(this);
            this.isDisposed = false;
            this.isStopped = false;
            this.observers = [];
            this.hasError = false;
        }
        addProperties(Subject.prototype, Observer.prototype, {
            _subscribe: function (o) {
                checkDisposed(this);
                if (!this.isStopped) {
                    this.observers.push(o);
                    return new InnerSubscription(this, o);
                }
                if (this.hasError) {
                    o.onError(this.error);
                    return disposableEmpty;
                }
                o.onCompleted();
                return disposableEmpty;
            },
            /**
             * Indicates whether the subject has observers subscribed to it.
             * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
             */
            hasObservers: function () { checkDisposed(this); return this.observers.length > 0; },
            /**
             * Notifies all subscribed observers about the end of the sequence.
             */
            onCompleted: function () {
                checkDisposed(this);
                if (!this.isStopped) {
                    this.isStopped = true;
                    for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
                        os[i].onCompleted();
                    }
                    this.observers.length = 0;
                }
            },
            /**
             * Notifies all subscribed observers about the exception.
             * @param {Mixed} error The exception to send to all observers.
             */
            onError: function (error) {
                checkDisposed(this);
                if (!this.isStopped) {
                    this.isStopped = true;
                    this.error = error;
                    this.hasError = true;
                    for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
                        os[i].onError(error);
                    }
                    this.observers.length = 0;
                }
            },
            /**
             * Notifies all subscribed observers about the arrival of the specified element in the sequence.
             * @param {Mixed} value The value to send to all observers.
             */
            onNext: function (value) {
                checkDisposed(this);
                if (!this.isStopped) {
                    for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
                        os[i].onNext(value);
                    }
                }
            },
            /**
             * Unsubscribe all observers and release resources.
             */
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
            }
        });
        /**
         * Creates a subject from the specified observer and observable.
         * @param {Observer} observer The observer used to send messages to the subject.
         * @param {Observable} observable The observable used to subscribe to messages sent from the subject.
         * @returns {Subject} Subject implemented using the given observer and observable.
         */
        Subject.create = function (observer, observable) {
            return new AnonymousSubject(observer, observable);
        };
        return Subject;
    }(Observable));
    /**
     *  Represents the result of an asynchronous operation.
     *  The last value before the OnCompleted notification, or the error received through OnError, is sent to all subscribed observers.
     */
    var AsyncSubject = Rx.AsyncSubject = (function (__super__) {
        inherits(AsyncSubject, __super__);
        /**
         * Creates a subject that can only receive one value and that value is cached for all future observations.
         * @constructor
         */
        function AsyncSubject() {
            __super__.call(this);
            this.isDisposed = false;
            this.isStopped = false;
            this.hasValue = false;
            this.observers = [];
            this.hasError = false;
        }
        addProperties(AsyncSubject.prototype, Observer.prototype, {
            _subscribe: function (o) {
                checkDisposed(this);
                if (!this.isStopped) {
                    this.observers.push(o);
                    return new InnerSubscription(this, o);
                }
                if (this.hasError) {
                    o.onError(this.error);
                }
                else if (this.hasValue) {
                    o.onNext(this.value);
                    o.onCompleted();
                }
                else {
                    o.onCompleted();
                }
                return disposableEmpty;
            },
            /**
             * Indicates whether the subject has observers subscribed to it.
             * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
             */
            hasObservers: function () { checkDisposed(this); return this.observers.length > 0; },
            /**
             * Notifies all subscribed observers about the end of the sequence, also causing the last received value to be sent out (if any).
             */
            onCompleted: function () {
                var i, len;
                checkDisposed(this);
                if (!this.isStopped) {
                    this.isStopped = true;
                    var os = cloneArray(this.observers), len = os.length;
                    if (this.hasValue) {
                        for (i = 0; i < len; i++) {
                            var o = os[i];
                            o.onNext(this.value);
                            o.onCompleted();
                        }
                    }
                    else {
                        for (i = 0; i < len; i++) {
                            os[i].onCompleted();
                        }
                    }
                    this.observers.length = 0;
                }
            },
            /**
             * Notifies all subscribed observers about the error.
             * @param {Mixed} error The Error to send to all observers.
             */
            onError: function (error) {
                checkDisposed(this);
                if (!this.isStopped) {
                    this.isStopped = true;
                    this.hasError = true;
                    this.error = error;
                    for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
                        os[i].onError(error);
                    }
                    this.observers.length = 0;
                }
            },
            /**
             * Sends a value to the subject. The last value received before successful termination will be sent to all subscribed and future observers.
             * @param {Mixed} value The value to store in the subject.
             */
            onNext: function (value) {
                checkDisposed(this);
                if (this.isStopped) {
                    return;
                }
                this.value = value;
                this.hasValue = true;
            },
            /**
             * Unsubscribe all observers and release resources.
             */
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
                this.error = null;
                this.value = null;
            }
        });
        return AsyncSubject;
    }(Observable));
    var AnonymousSubject = Rx.AnonymousSubject = (function (__super__) {
        inherits(AnonymousSubject, __super__);
        function AnonymousSubject(observer, observable) {
            this.observer = observer;
            this.observable = observable;
            __super__.call(this);
        }
        addProperties(AnonymousSubject.prototype, Observer.prototype, {
            _subscribe: function (o) {
                return this.observable.subscribe(o);
            },
            onCompleted: function () {
                this.observer.onCompleted();
            },
            onError: function (error) {
                this.observer.onError(error);
            },
            onNext: function (value) {
                this.observer.onNext(value);
            }
        });
        return AnonymousSubject;
    }(Observable));
    if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
        root.Rx = Rx;
        define(function () {
            return Rx;
        });
    }
    else if (freeExports && freeModule) {
        // in Node.js or RingoJS
        if (moduleExports) {
            (freeModule.exports = Rx).Rx = Rx;
        }
        else {
            freeExports.Rx = Rx;
        }
    }
    else {
        // in a browser or Rhino
        root.Rx = Rx;
    }
    // All code before this point will be filtered from stack traces.
    var rEndingLine = captureLine();
}.call(this));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccnguanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xccnhcXGRpc3RcXHJ4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDZHQUE2RztBQUU3RyxDQUFDO0FBQUEsQ0FBQyxVQUFVLFNBQVM7SUFFbkIsSUFBSSxXQUFXLEdBQUc7UUFDaEIsVUFBVSxFQUFFLElBQUk7UUFDaEIsUUFBUSxFQUFFLElBQUk7S0FDZixDQUFDO0lBRUYscUJBQXFCLEtBQUs7UUFDeEIsTUFBTSxDQUFDLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQztJQUMzRCxDQUFDO0lBRUQsSUFBSSxXQUFXLEdBQUcsQ0FBQyxXQUFXLENBQUMsT0FBTyxPQUFPLENBQUMsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsT0FBTyxHQUFHLElBQUksQ0FBQztJQUNqRyxJQUFJLFVBQVUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQzVGLElBQUksVUFBVSxHQUFHLFdBQVcsQ0FBQyxXQUFXLElBQUksVUFBVSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsSUFBSSxNQUFNLENBQUMsQ0FBQztJQUNoRyxJQUFJLFFBQVEsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUks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Q0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBRWIsTUFBTSxDQUFDO1lBQ0wsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUNaLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQztRQUNyQyx3QkFBd0I7UUFDeEIsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUNsQixDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNwQyxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixXQUFXLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUN0QixDQUFDO0lBQ0gsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVELGlFQUFpRTtJQUNqRSxJQUFJLFdBQVcsR0FBRyxXQUFXLEVBQUUsQ0FBQztBQUVsQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCwgQWxsIHJpZ2h0cyByZXNlcnZlZC4gU2VlIExpY2Vuc2UudHh0IGluIHRoZSBwcm9qZWN0IHJvb3QgZm9yIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG5cbjsoZnVuY3Rpb24gKHVuZGVmaW5lZCkge1xuXG4gIHZhciBvYmplY3RUeXBlcyA9IHtcbiAgICAnZnVuY3Rpb24nOiB0cnVlLFxuICAgICdvYmplY3QnOiB0cnVlXG4gIH07XG5cbiAgZnVuY3Rpb24gY2hlY2tHbG9iYWwodmFsdWUpIHtcbiAgICByZXR1cm4gKHZhbHVlICYmIHZhbHVlLk9iamVjdCA9PT0gT2JqZWN0KSA/IHZhbHVlIDogbnVsbDtcbiAgfVxuXG4gIHZhciBmcmVlRXhwb3J0cyA9IChvYmplY3RUeXBlc1t0eXBlb2YgZXhwb3J0c10gJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSkgPyBleHBvcnRzIDogbnVsbDtcbiAgdmFyIGZyZWVNb2R1bGUgPSAob2JqZWN0VHlwZXNbdHlwZW9mIG1vZHVsZV0gJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUpID8gbW9kdWxlIDogbnVsbDtcbiAgdmFyIGZyZWVHbG9iYWwgPSBjaGVja0dsb2JhbChmcmVlRXhwb3J0cyAmJiBmcmVlTW9kdWxlICYmIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIGdsb2JhbCk7XG4gIHZhciBmcmVlU2VsZiA9IGNoZWNrR2xvYmFsKG9iamVjdFR5cGVzW3R5cGVvZiBzZWxmXSAmJiBzZWxmKTtcbiAgdmFyIGZyZWVXaW5kb3cgPSBjaGVja0dsb2JhbChvYmplY3RUeXBlc1t0eXBlb2Ygd2luZG93XSAmJiB3aW5kb3cpO1xuICB2YXIgbW9kdWxlRXhwb3J0cyA9IChmcmVlTW9kdWxlICYmIGZyZWVNb2R1bGUuZXhwb3J0cyA9PT0gZnJlZUV4cG9ydHMpID8gZnJlZUV4cG9ydHMgOiBudWxsO1xuICB2YXIgdGhpc0dsb2JhbCA9IGNoZWNrR2xvYmFsKG9iamVjdFR5cGVzW3R5cGVvZiB0aGlzXSAmJiB0aGlzKTtcbiAgdmFyIHJvb3QgPSBmcmVlR2xvYmFsIHx8ICgoZnJlZVdpbmRvdyAhPT0gKHRoaXNHbG9iYWwgJiYgdGhpc0dsb2JhbC53aW5kb3cpKSAmJiBmcmVlV2luZG93KSB8fCBmcmVlU2VsZiB8fCB0aGlzR2xvYmFsIHx8IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG5cbiAgdmFyIFJ4ID0ge1xuICAgIGludGVybmFsczoge30sXG4gICAgY29uZmlnOiB7XG4gICAgICBQcm9taXNlOiByb290LlByb21pc2VcbiAgICB9LFxuICAgIGhlbHBlcnM6IHsgfVxuICB9O1xuXG4gIC8vIERlZmF1bHRzXG4gIHZhciBub29wID0gUnguaGVscGVycy5ub29wID0gZnVuY3Rpb24gKCkgeyB9LFxuICAgIGlkZW50aXR5ID0gUnguaGVscGVycy5pZGVudGl0eSA9IGZ1bmN0aW9uICh4KSB7IHJldHVybiB4OyB9LFxuICAgIGRlZmF1bHROb3cgPSBSeC5oZWxwZXJzLmRlZmF1bHROb3cgPSBEYXRlLm5vdyxcbiAgICBkZWZhdWx0Q29tcGFyZXIgPSBSeC5oZWxwZXJzLmRlZmF1bHRDb21wYXJlciA9IGZ1bmN0aW9uICh4LCB5KSB7IHJldHVybiBpc0VxdWFsKHgsIHkpOyB9LFxuICAgIGRlZmF1bHRTdWJDb21wYXJlciA9IFJ4LmhlbHBlcnMuZGVmYXVsdFN1YkNvbXBhcmVyID0gZnVuY3Rpb24gKHgsIHkpIHsgcmV0dXJuIHggPiB5ID8gMSA6ICh4IDwgeSA/IC0xIDogMCk7IH0sXG4gICAgZGVmYXVsdEtleVNlcmlhbGl6ZXIgPSBSeC5oZWxwZXJzLmRlZmF1bHRLZXlTZXJpYWxpemVyID0gZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHgudG9TdHJpbmcoKTsgfSxcbiAgICBkZWZhdWx0RXJyb3IgPSBSeC5oZWxwZXJzLmRlZmF1bHRFcnJvciA9IGZ1bmN0aW9uIChlcnIpIHsgdGhyb3cgZXJyOyB9LFxuICAgIGlzUHJvbWlzZSA9IFJ4LmhlbHBlcnMuaXNQcm9taXNlID0gZnVuY3Rpb24gKHApIHsgcmV0dXJuICEhcCAmJiB0eXBlb2YgcC5zdWJzY3JpYmUgIT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHAudGhlbiA9PT0gJ2Z1bmN0aW9uJzsgfSxcbiAgICBpc0Z1bmN0aW9uID0gUnguaGVscGVycy5pc0Z1bmN0aW9uID0gKGZ1bmN0aW9uICgpIHtcblxuICAgICAgdmFyIGlzRm4gPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnZnVuY3Rpb24nIHx8IGZhbHNlO1xuICAgICAgfTtcblxuICAgICAgLy8gZmFsbGJhY2sgZm9yIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpXG4gICAgICBpZiAoaXNGbigveC8pKSB7XG4gICAgICAgIGlzRm4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ2Z1bmN0aW9uJyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaXNGbjtcbiAgICB9KCkpO1xuXG4gIGZ1bmN0aW9uIGNsb25lQXJyYXkoYXJyKSB7IGZvcih2YXIgYSA9IFtdLCBpID0gMCwgbGVuID0gYXJyLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7IGEucHVzaChhcnJbaV0pOyB9IHJldHVybiBhO31cblxuICB2YXIgZXJyb3JPYmogPSB7ZToge319O1xuICBcbiAgZnVuY3Rpb24gdHJ5Q2F0Y2hlckdlbih0cnlDYXRjaFRhcmdldCkge1xuICAgIHJldHVybiBmdW5jdGlvbiB0cnlDYXRjaGVyKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHRyeUNhdGNoVGFyZ2V0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGVycm9yT2JqLmUgPSBlO1xuICAgICAgICByZXR1cm4gZXJyb3JPYmo7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHZhciB0cnlDYXRjaCA9IFJ4LmludGVybmFscy50cnlDYXRjaCA9IGZ1bmN0aW9uIHRyeUNhdGNoKGZuKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGZuKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdmbiBtdXN0IGJlIGEgZnVuY3Rpb24nKTsgfVxuICAgIHJldHVybiB0cnlDYXRjaGVyR2VuKGZuKTtcbiAgfTtcblxuICBmdW5jdGlvbiB0aHJvd2VyKGUpIHtcbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgUnguY29uZmlnLmxvbmdTdGFja1N1cHBvcnQgPSBmYWxzZTtcbiAgdmFyIGhhc1N0YWNrcyA9IGZhbHNlLCBzdGFja3MgPSB0cnlDYXRjaChmdW5jdGlvbiAoKSB7IHRocm93IG5ldyBFcnJvcigpOyB9KSgpO1xuICBoYXNTdGFja3MgPSAhIXN0YWNrcy5lICYmICEhc3RhY2tzLmUuc3RhY2s7XG5cbiAgLy8gQWxsIGNvZGUgYWZ0ZXIgdGhpcyBwb2ludCB3aWxsIGJlIGZpbHRlcmVkIGZyb20gc3RhY2sgdHJhY2VzIHJlcG9ydGVkIGJ5IFJ4SlNcbiAgdmFyIHJTdGFydGluZ0xpbmUgPSBjYXB0dXJlTGluZSgpLCByRmlsZU5hbWU7XG5cbiAgdmFyIFNUQUNLX0pVTVBfU0VQQVJBVE9SID0gJ0Zyb20gcHJldmlvdXMgZXZlbnQ6JztcblxuICBmdW5jdGlvbiBtYWtlU3RhY2tUcmFjZUxvbmcoZXJyb3IsIG9ic2VydmFibGUpIHtcbiAgICAvLyBJZiBwb3NzaWJsZSwgdHJhbnNmb3JtIHRoZSBlcnJvciBzdGFjayB0cmFjZSBieSByZW1vdmluZyBOb2RlIGFuZCBSeEpTXG4gICAgLy8gY3J1ZnQsIHRoZW4gY29uY2F0ZW5hdGluZyB3aXRoIHRoZSBzdGFjayB0cmFjZSBvZiBgb2JzZXJ2YWJsZWAuXG4gICAgaWYgKGhhc1N0YWNrcyAmJlxuICAgICAgICBvYnNlcnZhYmxlLnN0YWNrICYmXG4gICAgICAgIHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgZXJyb3IgIT09IG51bGwgJiZcbiAgICAgICAgZXJyb3Iuc3RhY2sgJiZcbiAgICAgICAgZXJyb3Iuc3RhY2suaW5kZXhPZihTVEFDS19KVU1QX1NFUEFSQVRPUikgPT09IC0xXG4gICAgKSB7XG4gICAgICB2YXIgc3RhY2tzID0gW107XG4gICAgICBmb3IgKHZhciBvID0gb2JzZXJ2YWJsZTsgISFvOyBvID0gby5zb3VyY2UpIHtcbiAgICAgICAgaWYgKG8uc3RhY2spIHtcbiAgICAgICAgICBzdGFja3MudW5zaGlmdChvLnN0YWNrKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc3RhY2tzLnVuc2hpZnQoZXJyb3Iuc3RhY2spO1xuXG4gICAgICB2YXIgY29uY2F0ZWRTdGFja3MgPSBzdGFja3Muam9pbignXFxuJyArIFNUQUNLX0pVTVBfU0VQQVJBVE9SICsgJ1xcbicpO1xuICAgICAgZXJyb3Iuc3RhY2sgPSBmaWx0ZXJTdGFja1N0cmluZyhjb25jYXRlZFN0YWNrcyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsdGVyU3RhY2tTdHJpbmcoc3RhY2tTdHJpbmcpIHtcbiAgICB2YXIgbGluZXMgPSBzdGFja1N0cmluZy5zcGxpdCgnXFxuJyksIGRlc2lyZWRMaW5lcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBsaW5lcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIGxpbmUgPSBsaW5lc1tpXTtcblxuICAgICAgaWYgKCFpc0ludGVybmFsRnJhbWUobGluZSkgJiYgIWlzTm9kZUZyYW1lKGxpbmUpICYmIGxpbmUpIHtcbiAgICAgICAgZGVzaXJlZExpbmVzLnB1c2gobGluZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZXNpcmVkTGluZXMuam9pbignXFxuJyk7XG4gIH1cblxuICBmdW5jdGlvbiBpc0ludGVybmFsRnJhbWUoc3RhY2tMaW5lKSB7XG4gICAgdmFyIGZpbGVOYW1lQW5kTGluZU51bWJlciA9IGdldEZpbGVOYW1lQW5kTGluZU51bWJlcihzdGFja0xpbmUpO1xuICAgIGlmICghZmlsZU5hbWVBbmRMaW5lTnVtYmVyKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciBmaWxlTmFtZSA9IGZpbGVOYW1lQW5kTGluZU51bWJlclswXSwgbGluZU51bWJlciA9IGZpbGVOYW1lQW5kTGluZU51bWJlclsxXTtcblxuICAgIHJldHVybiBmaWxlTmFtZSA9PT0gckZpbGVOYW1lICYmXG4gICAgICBsaW5lTnVtYmVyID49IHJTdGFydGluZ0xpbmUgJiZcbiAgICAgIGxpbmVOdW1iZXIgPD0gckVuZGluZ0xpbmU7XG4gIH1cblxuICBmdW5jdGlvbiBpc05vZGVGcmFtZShzdGFja0xpbmUpIHtcbiAgICByZXR1cm4gc3RhY2tMaW5lLmluZGV4T2YoJyhtb2R1bGUuanM6JykgIT09IC0xIHx8XG4gICAgICBzdGFja0xpbmUuaW5kZXhPZignKG5vZGUuanM6JykgIT09IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gY2FwdHVyZUxpbmUoKSB7XG4gICAgaWYgKCFoYXNTdGFja3MpIHsgcmV0dXJuOyB9XG5cbiAgICB0cnkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdmFyIGxpbmVzID0gZS5zdGFjay5zcGxpdCgnXFxuJyk7XG4gICAgICB2YXIgZmlyc3RMaW5lID0gbGluZXNbMF0uaW5kZXhPZignQCcpID4gMCA/IGxpbmVzWzFdIDogbGluZXNbMl07XG4gICAgICB2YXIgZmlsZU5hbWVBbmRMaW5lTnVtYmVyID0gZ2V0RmlsZU5hbWVBbmRMaW5lTnVtYmVyKGZpcnN0TGluZSk7XG4gICAgICBpZiAoIWZpbGVOYW1lQW5kTGluZU51bWJlcikgeyByZXR1cm47IH1cblxuICAgICAgckZpbGVOYW1lID0gZmlsZU5hbWVBbmRMaW5lTnVtYmVyWzBdO1xuICAgICAgcmV0dXJuIGZpbGVOYW1lQW5kTGluZU51bWJlclsxXTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRGaWxlTmFtZUFuZExpbmVOdW1iZXIoc3RhY2tMaW5lKSB7XG4gICAgLy8gTmFtZWQgZnVuY3Rpb25zOiAnYXQgZnVuY3Rpb25OYW1lIChmaWxlbmFtZTpsaW5lTnVtYmVyOmNvbHVtbk51bWJlciknXG4gICAgdmFyIGF0dGVtcHQxID0gL2F0IC4rIFxcKCguKyk6KFxcZCspOig/OlxcZCspXFwpJC8uZXhlYyhzdGFja0xpbmUpO1xuICAgIGlmIChhdHRlbXB0MSkgeyByZXR1cm4gW2F0dGVtcHQxWzFdLCBOdW1iZXIoYXR0ZW1wdDFbMl0pXTsgfVxuXG4gICAgLy8gQW5vbnltb3VzIGZ1bmN0aW9uczogJ2F0IGZpbGVuYW1lOmxpbmVOdW1iZXI6Y29sdW1uTnVtYmVyJ1xuICAgIHZhciBhdHRlbXB0MiA9IC9hdCAoW14gXSspOihcXGQrKTooPzpcXGQrKSQvLmV4ZWMoc3RhY2tMaW5lKTtcbiAgICBpZiAoYXR0ZW1wdDIpIHsgcmV0dXJuIFthdHRlbXB0MlsxXSwgTnVtYmVyKGF0dGVtcHQyWzJdKV07IH1cblxuICAgIC8vIEZpcmVmb3ggc3R5bGU6ICdmdW5jdGlvbkBmaWxlbmFtZTpsaW5lTnVtYmVyIG9yIEBmaWxlbmFtZTpsaW5lTnVtYmVyJ1xuICAgIHZhciBhdHRlbXB0MyA9IC8uKkAoLispOihcXGQrKSQvLmV4ZWMoc3RhY2tMaW5lKTtcbiAgICBpZiAoYXR0ZW1wdDMpIHsgcmV0dXJuIFthdHRlbXB0M1sxXSwgTnVtYmVyKGF0dGVtcHQzWzJdKV07IH1cbiAgfVxuXG4gIHZhciBFbXB0eUVycm9yID0gUnguRW1wdHlFcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubWVzc2FnZSA9ICdTZXF1ZW5jZSBjb250YWlucyBubyBlbGVtZW50cy4nO1xuICAgIEVycm9yLmNhbGwodGhpcyk7XG4gIH07XG4gIEVtcHR5RXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuICBFbXB0eUVycm9yLnByb3RvdHlwZS5uYW1lID0gJ0VtcHR5RXJyb3InO1xuXG4gIHZhciBPYmplY3REaXNwb3NlZEVycm9yID0gUnguT2JqZWN0RGlzcG9zZWRFcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubWVzc2FnZSA9ICdPYmplY3QgaGFzIGJlZW4gZGlzcG9zZWQnO1xuICAgIEVycm9yLmNhbGwodGhpcyk7XG4gIH07XG4gIE9iamVjdERpc3Bvc2VkRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuICBPYmplY3REaXNwb3NlZEVycm9yLnByb3RvdHlwZS5uYW1lID0gJ09iamVjdERpc3Bvc2VkRXJyb3InO1xuXG4gIHZhciBBcmd1bWVudE91dE9mUmFuZ2VFcnJvciA9IFJ4LkFyZ3VtZW50T3V0T2ZSYW5nZUVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubWVzc2FnZSA9ICdBcmd1bWVudCBvdXQgb2YgcmFuZ2UnO1xuICAgIEVycm9yLmNhbGwodGhpcyk7XG4gIH07XG4gIEFyZ3VtZW50T3V0T2ZSYW5nZUVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbiAgQXJndW1lbnRPdXRPZlJhbmdlRXJyb3IucHJvdG90eXBlLm5hbWUgPSAnQXJndW1lbnRPdXRPZlJhbmdlRXJyb3InO1xuXG4gIHZhciBOb3RTdXBwb3J0ZWRFcnJvciA9IFJ4Lk5vdFN1cHBvcnRlZEVycm9yID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlIHx8ICdUaGlzIG9wZXJhdGlvbiBpcyBub3Qgc3VwcG9ydGVkJztcbiAgICBFcnJvci5jYWxsKHRoaXMpO1xuICB9O1xuICBOb3RTdXBwb3J0ZWRFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG4gIE5vdFN1cHBvcnRlZEVycm9yLnByb3RvdHlwZS5uYW1lID0gJ05vdFN1cHBvcnRlZEVycm9yJztcblxuICB2YXIgTm90SW1wbGVtZW50ZWRFcnJvciA9IFJ4Lk5vdEltcGxlbWVudGVkRXJyb3IgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2UgfHwgJ1RoaXMgb3BlcmF0aW9uIGlzIG5vdCBpbXBsZW1lbnRlZCc7XG4gICAgRXJyb3IuY2FsbCh0aGlzKTtcbiAgfTtcbiAgTm90SW1wbGVtZW50ZWRFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG4gIE5vdEltcGxlbWVudGVkRXJyb3IucHJvdG90eXBlLm5hbWUgPSAnTm90SW1wbGVtZW50ZWRFcnJvcic7XG5cbiAgdmFyIG5vdEltcGxlbWVudGVkID0gUnguaGVscGVycy5ub3RJbXBsZW1lbnRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcigpO1xuICB9O1xuXG4gIHZhciBub3RTdXBwb3J0ZWQgPSBSeC5oZWxwZXJzLm5vdFN1cHBvcnRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aHJvdyBuZXcgTm90U3VwcG9ydGVkRXJyb3IoKTtcbiAgfTtcblxuICAvLyBTaGltIGluIGl0ZXJhdG9yIHN1cHBvcnRcbiAgdmFyICRpdGVyYXRvciQgPSAodHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiBTeW1ib2wuaXRlcmF0b3IpIHx8XG4gICAgJ19lczZzaGltX2l0ZXJhdG9yXyc7XG4gIC8vIEJ1ZyBmb3IgbW96aWxsYSB2ZXJzaW9uXG4gIGlmIChyb290LlNldCAmJiB0eXBlb2YgbmV3IHJvb3QuU2V0KClbJ0BAaXRlcmF0b3InXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICRpdGVyYXRvciQgPSAnQEBpdGVyYXRvcic7XG4gIH1cblxuICB2YXIgZG9uZUVudW1lcmF0b3IgPSBSeC5kb25lRW51bWVyYXRvciA9IHsgZG9uZTogdHJ1ZSwgdmFsdWU6IHVuZGVmaW5lZCB9O1xuXG4gIHZhciBpc0l0ZXJhYmxlID0gUnguaGVscGVycy5pc0l0ZXJhYmxlID0gZnVuY3Rpb24gKG8pIHtcbiAgICByZXR1cm4gbyAmJiBvWyRpdGVyYXRvciRdICE9PSB1bmRlZmluZWQ7XG4gIH07XG5cbiAgdmFyIGlzQXJyYXlMaWtlID0gUnguaGVscGVycy5pc0FycmF5TGlrZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgcmV0dXJuIG8gJiYgby5sZW5ndGggIT09IHVuZGVmaW5lZDtcbiAgfTtcblxuICBSeC5oZWxwZXJzLml0ZXJhdG9yID0gJGl0ZXJhdG9yJDtcblxuICB2YXIgYmluZENhbGxiYWNrID0gUnguaW50ZXJuYWxzLmJpbmRDYWxsYmFjayA9IGZ1bmN0aW9uIChmdW5jLCB0aGlzQXJnLCBhcmdDb3VudCkge1xuICAgIGlmICh0eXBlb2YgdGhpc0FyZyA9PT0gJ3VuZGVmaW5lZCcpIHsgcmV0dXJuIGZ1bmM7IH1cbiAgICBzd2l0Y2goYXJnQ291bnQpIHtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpc0FyZylcbiAgICAgICAgfTtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGFyZykge1xuICAgICAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpc0FyZywgYXJnKTtcbiAgICAgICAgfTtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpc0FyZywgdmFsdWUsIGluZGV4KTtcbiAgICAgICAgfTtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpc0FyZywgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH07XG5cbiAgLyoqIFVzZWQgdG8gZGV0ZXJtaW5lIGlmIHZhbHVlcyBhcmUgb2YgdGhlIGxhbmd1YWdlIHR5cGUgT2JqZWN0ICovXG4gIHZhciBkb250RW51bXMgPSBbJ3RvU3RyaW5nJyxcbiAgICAndG9Mb2NhbGVTdHJpbmcnLFxuICAgICd2YWx1ZU9mJyxcbiAgICAnaGFzT3duUHJvcGVydHknLFxuICAgICdpc1Byb3RvdHlwZU9mJyxcbiAgICAncHJvcGVydHlJc0VudW1lcmFibGUnLFxuICAgICdjb25zdHJ1Y3RvciddLFxuICBkb250RW51bXNMZW5ndGggPSBkb250RW51bXMubGVuZ3RoO1xuXG52YXIgYXJnc1RhZyA9ICdbb2JqZWN0IEFyZ3VtZW50c10nLFxuICAgIGFycmF5VGFnID0gJ1tvYmplY3QgQXJyYXldJyxcbiAgICBib29sVGFnID0gJ1tvYmplY3QgQm9vbGVhbl0nLFxuICAgIGRhdGVUYWcgPSAnW29iamVjdCBEYXRlXScsXG4gICAgZXJyb3JUYWcgPSAnW29iamVjdCBFcnJvcl0nLFxuICAgIGZ1bmNUYWcgPSAnW29iamVjdCBGdW5jdGlvbl0nLFxuICAgIG1hcFRhZyA9ICdbb2JqZWN0IE1hcF0nLFxuICAgIG51bWJlclRhZyA9ICdbb2JqZWN0IE51bWJlcl0nLFxuICAgIG9iamVjdFRhZyA9ICdbb2JqZWN0IE9iamVjdF0nLFxuICAgIHJlZ2V4cFRhZyA9ICdbb2JqZWN0IFJlZ0V4cF0nLFxuICAgIHNldFRhZyA9ICdbb2JqZWN0IFNldF0nLFxuICAgIHN0cmluZ1RhZyA9ICdbb2JqZWN0IFN0cmluZ10nLFxuICAgIHdlYWtNYXBUYWcgPSAnW29iamVjdCBXZWFrTWFwXSc7XG5cbnZhciBhcnJheUJ1ZmZlclRhZyA9ICdbb2JqZWN0IEFycmF5QnVmZmVyXScsXG4gICAgZmxvYXQzMlRhZyA9ICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nLFxuICAgIGZsb2F0NjRUYWcgPSAnW29iamVjdCBGbG9hdDY0QXJyYXldJyxcbiAgICBpbnQ4VGFnID0gJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgaW50MTZUYWcgPSAnW29iamVjdCBJbnQxNkFycmF5XScsXG4gICAgaW50MzJUYWcgPSAnW29iamVjdCBJbnQzMkFycmF5XScsXG4gICAgdWludDhUYWcgPSAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgdWludDhDbGFtcGVkVGFnID0gJ1tvYmplY3QgVWludDhDbGFtcGVkQXJyYXldJyxcbiAgICB1aW50MTZUYWcgPSAnW29iamVjdCBVaW50MTZBcnJheV0nLFxuICAgIHVpbnQzMlRhZyA9ICdbb2JqZWN0IFVpbnQzMkFycmF5XSc7XG5cbnZhciB0eXBlZEFycmF5VGFncyA9IHt9O1xudHlwZWRBcnJheVRhZ3NbZmxvYXQzMlRhZ10gPSB0eXBlZEFycmF5VGFnc1tmbG9hdDY0VGFnXSA9XG50eXBlZEFycmF5VGFnc1tpbnQ4VGFnXSA9IHR5cGVkQXJyYXlUYWdzW2ludDE2VGFnXSA9XG50eXBlZEFycmF5VGFnc1tpbnQzMlRhZ10gPSB0eXBlZEFycmF5VGFnc1t1aW50OFRhZ10gPVxudHlwZWRBcnJheVRhZ3NbdWludDhDbGFtcGVkVGFnXSA9IHR5cGVkQXJyYXlUYWdzW3VpbnQxNlRhZ10gPVxudHlwZWRBcnJheVRhZ3NbdWludDMyVGFnXSA9IHRydWU7XG50eXBlZEFycmF5VGFnc1thcmdzVGFnXSA9IHR5cGVkQXJyYXlUYWdzW2FycmF5VGFnXSA9XG50eXBlZEFycmF5VGFnc1thcnJheUJ1ZmZlclRhZ10gPSB0eXBlZEFycmF5VGFnc1tib29sVGFnXSA9XG50eXBlZEFycmF5VGFnc1tkYXRlVGFnXSA9IHR5cGVkQXJyYXlUYWdzW2Vycm9yVGFnXSA9XG50eXBlZEFycmF5VGFnc1tmdW5jVGFnXSA9IHR5cGVkQXJyYXlUYWdzW21hcFRhZ10gPVxudHlwZWRBcnJheVRhZ3NbbnVtYmVyVGFnXSA9IHR5cGVkQXJyYXlUYWdzW29iamVjdFRhZ10gPVxudHlwZWRBcnJheVRhZ3NbcmVnZXhwVGFnXSA9IHR5cGVkQXJyYXlUYWdzW3NldFRhZ10gPVxudHlwZWRBcnJheVRhZ3Nbc3RyaW5nVGFnXSA9IHR5cGVkQXJyYXlUYWdzW3dlYWtNYXBUYWddID0gZmFsc2U7XG5cbnZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGUsXG4gICAgaGFzT3duUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eSxcbiAgICBvYmpUb1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nLFxuICAgIE1BWF9TQUZFX0lOVEVHRVIgPSBNYXRoLnBvdygyLCA1MykgLSAxO1xuXG52YXIga2V5cyA9IE9iamVjdC5rZXlzIHx8IChmdW5jdGlvbigpIHtcbiAgICB2YXIgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuICAgICAgICBoYXNEb250RW51bUJ1ZyA9ICEoeyB0b1N0cmluZzogbnVsbCB9KS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgndG9TdHJpbmcnKSxcbiAgICAgICAgZG9udEVudW1zID0gW1xuICAgICAgICAgICd0b1N0cmluZycsXG4gICAgICAgICAgJ3RvTG9jYWxlU3RyaW5nJyxcbiAgICAgICAgICAndmFsdWVPZicsXG4gICAgICAgICAgJ2hhc093blByb3BlcnR5JyxcbiAgICAgICAgICAnaXNQcm90b3R5cGVPZicsXG4gICAgICAgICAgJ3Byb3BlcnR5SXNFbnVtZXJhYmxlJyxcbiAgICAgICAgICAnY29uc3RydWN0b3InXG4gICAgICAgIF0sXG4gICAgICAgIGRvbnRFbnVtc0xlbmd0aCA9IGRvbnRFbnVtcy5sZW5ndGg7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICBpZiAodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcgJiYgKHR5cGVvZiBvYmogIT09ICdmdW5jdGlvbicgfHwgb2JqID09PSBudWxsKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3Qua2V5cyBjYWxsZWQgb24gbm9uLW9iamVjdCcpO1xuICAgICAgfVxuXG4gICAgICB2YXIgcmVzdWx0ID0gW10sIHByb3AsIGk7XG5cbiAgICAgIGZvciAocHJvcCBpbiBvYmopIHtcbiAgICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHByb3ApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChoYXNEb250RW51bUJ1Zykge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZG9udEVudW1zTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGRvbnRFbnVtc1tpXSkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGRvbnRFbnVtc1tpXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH0oKSk7XG5cbmZ1bmN0aW9uIGVxdWFsT2JqZWN0cyhvYmplY3QsIG90aGVyLCBlcXVhbEZ1bmMsIGlzTG9vc2UsIHN0YWNrQSwgc3RhY2tCKSB7XG4gIHZhciBvYmpQcm9wcyA9IGtleXMob2JqZWN0KSxcbiAgICAgIG9iakxlbmd0aCA9IG9ialByb3BzLmxlbmd0aCxcbiAgICAgIG90aFByb3BzID0ga2V5cyhvdGhlciksXG4gICAgICBvdGhMZW5ndGggPSBvdGhQcm9wcy5sZW5ndGg7XG5cbiAgaWYgKG9iakxlbmd0aCAhPT0gb3RoTGVuZ3RoICYmICFpc0xvb3NlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZhciBpbmRleCA9IG9iakxlbmd0aCwga2V5O1xuICB3aGlsZSAoaW5kZXgtLSkge1xuICAgIGtleSA9IG9ialByb3BzW2luZGV4XTtcbiAgICBpZiAoIShpc0xvb3NlID8ga2V5IGluIG90aGVyIDogaGFzT3duUHJvcGVydHkuY2FsbChvdGhlciwga2V5KSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgdmFyIHNraXBDdG9yID0gaXNMb29zZTtcbiAgd2hpbGUgKCsraW5kZXggPCBvYmpMZW5ndGgpIHtcbiAgICBrZXkgPSBvYmpQcm9wc1tpbmRleF07XG4gICAgdmFyIG9ialZhbHVlID0gb2JqZWN0W2tleV0sXG4gICAgICAgIG90aFZhbHVlID0gb3RoZXJba2V5XSxcbiAgICAgICAgcmVzdWx0O1xuXG4gICAgaWYgKCEocmVzdWx0ID09PSB1bmRlZmluZWQgPyBlcXVhbEZ1bmMob2JqVmFsdWUsIG90aFZhbHVlLCBpc0xvb3NlLCBzdGFja0EsIHN0YWNrQikgOiByZXN1bHQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHNraXBDdG9yIHx8IChza2lwQ3RvciA9IGtleSA9PT0gJ2NvbnN0cnVjdG9yJyk7XG4gIH1cbiAgaWYgKCFza2lwQ3Rvcikge1xuICAgIHZhciBvYmpDdG9yID0gb2JqZWN0LmNvbnN0cnVjdG9yLFxuICAgICAgICBvdGhDdG9yID0gb3RoZXIuY29uc3RydWN0b3I7XG5cbiAgICBpZiAob2JqQ3RvciAhPT0gb3RoQ3RvciAmJlxuICAgICAgICAoJ2NvbnN0cnVjdG9yJyBpbiBvYmplY3QgJiYgJ2NvbnN0cnVjdG9yJyBpbiBvdGhlcikgJiZcbiAgICAgICAgISh0eXBlb2Ygb2JqQ3RvciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmpDdG9yIGluc3RhbmNlb2Ygb2JqQ3RvciAmJlxuICAgICAgICAgIHR5cGVvZiBvdGhDdG9yID09PSAnZnVuY3Rpb24nICYmIG90aEN0b3IgaW5zdGFuY2VvZiBvdGhDdG9yKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZXF1YWxCeVRhZyhvYmplY3QsIG90aGVyLCB0YWcpIHtcbiAgc3dpdGNoICh0YWcpIHtcbiAgICBjYXNlIGJvb2xUYWc6XG4gICAgY2FzZSBkYXRlVGFnOlxuICAgICAgcmV0dXJuICtvYmplY3QgPT09ICtvdGhlcjtcblxuICAgIGNhc2UgZXJyb3JUYWc6XG4gICAgICByZXR1cm4gb2JqZWN0Lm5hbWUgPT09IG90aGVyLm5hbWUgJiYgb2JqZWN0Lm1lc3NhZ2UgPT09IG90aGVyLm1lc3NhZ2U7XG5cbiAgICBjYXNlIG51bWJlclRhZzpcbiAgICAgIHJldHVybiAob2JqZWN0ICE9PSArb2JqZWN0KSA/XG4gICAgICAgIG90aGVyICE9PSArb3RoZXIgOlxuICAgICAgICBvYmplY3QgPT09ICtvdGhlcjtcblxuICAgIGNhc2UgcmVnZXhwVGFnOlxuICAgIGNhc2Ugc3RyaW5nVGFnOlxuICAgICAgcmV0dXJuIG9iamVjdCA9PT0gKG90aGVyICsgJycpO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxudmFyIGlzT2JqZWN0ID0gUnguaW50ZXJuYWxzLmlzT2JqZWN0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09PSAnb2JqZWN0JyB8fCB0eXBlID09PSAnZnVuY3Rpb24nKTtcbn07XG5cbmZ1bmN0aW9uIGlzT2JqZWN0TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gISF2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnO1xufVxuXG5mdW5jdGlvbiBpc0xlbmd0aCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiB2YWx1ZSA+IC0xICYmIHZhbHVlICUgMSA9PT0gMCAmJiB2YWx1ZSA8PSBNQVhfU0FGRV9JTlRFR0VSO1xufVxuXG52YXIgaXNIb3N0T2JqZWN0ID0gKGZ1bmN0aW9uKCkge1xuICB0cnkge1xuICAgIE9iamVjdCh7ICd0b1N0cmluZyc6IDAgfSArICcnKTtcbiAgfSBjYXRjaChlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkgeyByZXR1cm4gZmFsc2U7IH07XG4gIH1cbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZS50b1N0cmluZyAhPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgKHZhbHVlICsgJycpID09PSAnc3RyaW5nJztcbiAgfTtcbn0oKSk7XG5cbmZ1bmN0aW9uIGlzVHlwZWRBcnJheSh2YWx1ZSkge1xuICByZXR1cm4gaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBpc0xlbmd0aCh2YWx1ZS5sZW5ndGgpICYmICEhdHlwZWRBcnJheVRhZ3Nbb2JqVG9TdHJpbmcuY2FsbCh2YWx1ZSldO1xufVxuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgaXNMZW5ndGgodmFsdWUubGVuZ3RoKSAmJiBvYmpUb1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gYXJyYXlUYWc7XG59O1xuXG5mdW5jdGlvbiBhcnJheVNvbWUgKGFycmF5LCBwcmVkaWNhdGUpIHtcbiAgdmFyIGluZGV4ID0gLTEsXG4gICAgICBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG5cbiAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICBpZiAocHJlZGljYXRlKGFycmF5W2luZGV4XSwgaW5kZXgsIGFycmF5KSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gZXF1YWxBcnJheXMoYXJyYXksIG90aGVyLCBlcXVhbEZ1bmMsIGlzTG9vc2UsIHN0YWNrQSwgc3RhY2tCKSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgYXJyTGVuZ3RoID0gYXJyYXkubGVuZ3RoLFxuICAgICAgb3RoTGVuZ3RoID0gb3RoZXIubGVuZ3RoO1xuXG4gIGlmIChhcnJMZW5ndGggIT09IG90aExlbmd0aCAmJiAhKGlzTG9vc2UgJiYgb3RoTGVuZ3RoID4gYXJyTGVuZ3RoKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvLyBJZ25vcmUgbm9uLWluZGV4IHByb3BlcnRpZXMuXG4gIHdoaWxlICgrK2luZGV4IDwgYXJyTGVuZ3RoKSB7XG4gICAgdmFyIGFyclZhbHVlID0gYXJyYXlbaW5kZXhdLFxuICAgICAgICBvdGhWYWx1ZSA9IG90aGVyW2luZGV4XSxcbiAgICAgICAgcmVzdWx0O1xuXG4gICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBSZWN1cnNpdmVseSBjb21wYXJlIGFycmF5cyAoc3VzY2VwdGlibGUgdG8gY2FsbCBzdGFjayBsaW1pdHMpLlxuICAgIGlmIChpc0xvb3NlKSB7XG4gICAgICBpZiAoIWFycmF5U29tZShvdGhlciwgZnVuY3Rpb24ob3RoVmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBhcnJWYWx1ZSA9PT0gb3RoVmFsdWUgfHwgZXF1YWxGdW5jKGFyclZhbHVlLCBvdGhWYWx1ZSwgaXNMb29zZSwgc3RhY2tBLCBzdGFja0IpO1xuICAgICAgICAgIH0pKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCEoYXJyVmFsdWUgPT09IG90aFZhbHVlIHx8IGVxdWFsRnVuYyhhcnJWYWx1ZSwgb3RoVmFsdWUsIGlzTG9vc2UsIHN0YWNrQSwgc3RhY2tCKSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGJhc2VJc0VxdWFsRGVlcChvYmplY3QsIG90aGVyLCBlcXVhbEZ1bmMsIGlzTG9vc2UsIHN0YWNrQSwgc3RhY2tCKSB7XG4gIHZhciBvYmpJc0FyciA9IGlzQXJyYXkob2JqZWN0KSxcbiAgICAgIG90aElzQXJyID0gaXNBcnJheShvdGhlciksXG4gICAgICBvYmpUYWcgPSBhcnJheVRhZyxcbiAgICAgIG90aFRhZyA9IGFycmF5VGFnO1xuXG4gIGlmICghb2JqSXNBcnIpIHtcbiAgICBvYmpUYWcgPSBvYmpUb1N0cmluZy5jYWxsKG9iamVjdCk7XG4gICAgaWYgKG9ialRhZyA9PT0gYXJnc1RhZykge1xuICAgICAgb2JqVGFnID0gb2JqZWN0VGFnO1xuICAgIH0gZWxzZSBpZiAob2JqVGFnICE9PSBvYmplY3RUYWcpIHtcbiAgICAgIG9iaklzQXJyID0gaXNUeXBlZEFycmF5KG9iamVjdCk7XG4gICAgfVxuICB9XG4gIGlmICghb3RoSXNBcnIpIHtcbiAgICBvdGhUYWcgPSBvYmpUb1N0cmluZy5jYWxsKG90aGVyKTtcbiAgICBpZiAob3RoVGFnID09PSBhcmdzVGFnKSB7XG4gICAgICBvdGhUYWcgPSBvYmplY3RUYWc7XG4gICAgfVxuICB9XG4gIHZhciBvYmpJc09iaiA9IG9ialRhZyA9PT0gb2JqZWN0VGFnICYmICFpc0hvc3RPYmplY3Qob2JqZWN0KSxcbiAgICAgIG90aElzT2JqID0gb3RoVGFnID09PSBvYmplY3RUYWcgJiYgIWlzSG9zdE9iamVjdChvdGhlciksXG4gICAgICBpc1NhbWVUYWcgPSBvYmpUYWcgPT09IG90aFRhZztcblxuICBpZiAoaXNTYW1lVGFnICYmICEob2JqSXNBcnIgfHwgb2JqSXNPYmopKSB7XG4gICAgcmV0dXJuIGVxdWFsQnlUYWcob2JqZWN0LCBvdGhlciwgb2JqVGFnKTtcbiAgfVxuICBpZiAoIWlzTG9vc2UpIHtcbiAgICB2YXIgb2JqSXNXcmFwcGVkID0gb2JqSXNPYmogJiYgaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsICdfX3dyYXBwZWRfXycpLFxuICAgICAgICBvdGhJc1dyYXBwZWQgPSBvdGhJc09iaiAmJiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG90aGVyLCAnX193cmFwcGVkX18nKTtcblxuICAgIGlmIChvYmpJc1dyYXBwZWQgfHwgb3RoSXNXcmFwcGVkKSB7XG4gICAgICByZXR1cm4gZXF1YWxGdW5jKG9iaklzV3JhcHBlZCA/IG9iamVjdC52YWx1ZSgpIDogb2JqZWN0LCBvdGhJc1dyYXBwZWQgPyBvdGhlci52YWx1ZSgpIDogb3RoZXIsIGlzTG9vc2UsIHN0YWNrQSwgc3RhY2tCKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFpc1NhbWVUYWcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy8gQXNzdW1lIGN5Y2xpYyB2YWx1ZXMgYXJlIGVxdWFsLlxuICAvLyBGb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBkZXRlY3RpbmcgY2lyY3VsYXIgcmVmZXJlbmNlcyBzZWUgaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyNKTy5cbiAgc3RhY2tBIHx8IChzdGFja0EgPSBbXSk7XG4gIHN0YWNrQiB8fCAoc3RhY2tCID0gW10pO1xuXG4gIHZhciBsZW5ndGggPSBzdGFja0EubGVuZ3RoO1xuICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICBpZiAoc3RhY2tBW2xlbmd0aF0gPT09IG9iamVjdCkge1xuICAgICAgcmV0dXJuIHN0YWNrQltsZW5ndGhdID09PSBvdGhlcjtcbiAgICB9XG4gIH1cbiAgLy8gQWRkIGBvYmplY3RgIGFuZCBgb3RoZXJgIHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgc3RhY2tBLnB1c2gob2JqZWN0KTtcbiAgc3RhY2tCLnB1c2gob3RoZXIpO1xuXG4gIHZhciByZXN1bHQgPSAob2JqSXNBcnIgPyBlcXVhbEFycmF5cyA6IGVxdWFsT2JqZWN0cykob2JqZWN0LCBvdGhlciwgZXF1YWxGdW5jLCBpc0xvb3NlLCBzdGFja0EsIHN0YWNrQik7XG5cbiAgc3RhY2tBLnBvcCgpO1xuICBzdGFja0IucG9wKCk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gYmFzZUlzRXF1YWwodmFsdWUsIG90aGVyLCBpc0xvb3NlLCBzdGFja0EsIHN0YWNrQikge1xuICBpZiAodmFsdWUgPT09IG90aGVyKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKHZhbHVlID09IG51bGwgfHwgb3RoZXIgPT0gbnVsbCB8fCAoIWlzT2JqZWN0KHZhbHVlKSAmJiAhaXNPYmplY3RMaWtlKG90aGVyKSkpIHtcbiAgICByZXR1cm4gdmFsdWUgIT09IHZhbHVlICYmIG90aGVyICE9PSBvdGhlcjtcbiAgfVxuICByZXR1cm4gYmFzZUlzRXF1YWxEZWVwKHZhbHVlLCBvdGhlciwgYmFzZUlzRXF1YWwsIGlzTG9vc2UsIHN0YWNrQSwgc3RhY2tCKTtcbn1cblxudmFyIGlzRXF1YWwgPSBSeC5pbnRlcm5hbHMuaXNFcXVhbCA9IGZ1bmN0aW9uICh2YWx1ZSwgb3RoZXIpIHtcbiAgcmV0dXJuIGJhc2VJc0VxdWFsKHZhbHVlLCBvdGhlcik7XG59O1xuXG4gIHZhciBoYXNQcm9wID0ge30uaGFzT3duUHJvcGVydHksXG4gICAgICBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuICB2YXIgaW5oZXJpdHMgPSBSeC5pbnRlcm5hbHMuaW5oZXJpdHMgPSBmdW5jdGlvbiAoY2hpbGQsIHBhcmVudCkge1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gY2hpbGQ7IH1cbiAgICBfXy5wcm90b3R5cGUgPSBwYXJlbnQucHJvdG90eXBlO1xuICAgIGNoaWxkLnByb3RvdHlwZSA9IG5ldyBfXygpO1xuICB9O1xuXG4gIHZhciBhZGRQcm9wZXJ0aWVzID0gUnguaW50ZXJuYWxzLmFkZFByb3BlcnRpZXMgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgZm9yKHZhciBzb3VyY2VzID0gW10sIGkgPSAxLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHsgc291cmNlcy5wdXNoKGFyZ3VtZW50c1tpXSk7IH1cbiAgICBmb3IgKHZhciBpZHggPSAwLCBsbiA9IHNvdXJjZXMubGVuZ3RoOyBpZHggPCBsbjsgaWR4KyspIHtcbiAgICAgIHZhciBzb3VyY2UgPSBzb3VyY2VzW2lkeF07XG4gICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vIFJ4IFV0aWxzXG4gIHZhciBhZGRSZWYgPSBSeC5pbnRlcm5hbHMuYWRkUmVmID0gZnVuY3Rpb24gKHhzLCByKSB7XG4gICAgcmV0dXJuIG5ldyBBbm9ueW1vdXNPYnNlcnZhYmxlKGZ1bmN0aW9uIChvYnNlcnZlcikge1xuICAgICAgcmV0dXJuIG5ldyBCaW5hcnlEaXNwb3NhYmxlKHIuZ2V0RGlzcG9zYWJsZSgpLCB4cy5zdWJzY3JpYmUob2JzZXJ2ZXIpKTtcbiAgICB9KTtcbiAgfTtcblxuICBmdW5jdGlvbiBhcnJheUluaXRpYWxpemUoY291bnQsIGZhY3RvcnkpIHtcbiAgICB2YXIgYSA9IG5ldyBBcnJheShjb3VudCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICBhW2ldID0gZmFjdG9yeSgpO1xuICAgIH1cbiAgICByZXR1cm4gYTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIGEgZ3JvdXAgb2YgZGlzcG9zYWJsZSByZXNvdXJjZXMgdGhhdCBhcmUgZGlzcG9zZWQgdG9nZXRoZXIuXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgdmFyIENvbXBvc2l0ZURpc3Bvc2FibGUgPSBSeC5Db21wb3NpdGVEaXNwb3NhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmdzID0gW10sIGksIGxlbjtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhcmd1bWVudHNbMF0pKSB7XG4gICAgICBhcmdzID0gYXJndW1lbnRzWzBdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4pO1xuICAgICAgZm9yKGkgPSAwOyBpIDwgbGVuOyBpKyspIHsgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTsgfVxuICAgIH1cbiAgICB0aGlzLmRpc3Bvc2FibGVzID0gYXJncztcbiAgICB0aGlzLmlzRGlzcG9zZWQgPSBmYWxzZTtcbiAgICB0aGlzLmxlbmd0aCA9IGFyZ3MubGVuZ3RoO1xuICB9O1xuXG4gIHZhciBDb21wb3NpdGVEaXNwb3NhYmxlUHJvdG90eXBlID0gQ29tcG9zaXRlRGlzcG9zYWJsZS5wcm90b3R5cGU7XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBkaXNwb3NhYmxlIHRvIHRoZSBDb21wb3NpdGVEaXNwb3NhYmxlIG9yIGRpc3Bvc2VzIHRoZSBkaXNwb3NhYmxlIGlmIHRoZSBDb21wb3NpdGVEaXNwb3NhYmxlIGlzIGRpc3Bvc2VkLlxuICAgKiBAcGFyYW0ge01peGVkfSBpdGVtIERpc3Bvc2FibGUgdG8gYWRkLlxuICAgKi9cbiAgQ29tcG9zaXRlRGlzcG9zYWJsZVByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgIGlmICh0aGlzLmlzRGlzcG9zZWQpIHtcbiAgICAgIGl0ZW0uZGlzcG9zZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRpc3Bvc2FibGVzLnB1c2goaXRlbSk7XG4gICAgICB0aGlzLmxlbmd0aCsrO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogUmVtb3ZlcyBhbmQgZGlzcG9zZXMgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYSBkaXNwb3NhYmxlIGZyb20gdGhlIENvbXBvc2l0ZURpc3Bvc2FibGUuXG4gICAqIEBwYXJhbSB7TWl4ZWR9IGl0ZW0gRGlzcG9zYWJsZSB0byByZW1vdmUuXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSB0cnVlIGlmIGZvdW5kOyBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICBDb21wb3NpdGVEaXNwb3NhYmxlUHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgdmFyIHNob3VsZERpc3Bvc2UgPSBmYWxzZTtcbiAgICBpZiAoIXRoaXMuaXNEaXNwb3NlZCkge1xuICAgICAgdmFyIGlkeCA9IHRoaXMuZGlzcG9zYWJsZXMuaW5kZXhPZihpdGVtKTtcbiAgICAgIGlmIChpZHggIT09IC0xKSB7XG4gICAgICAgIHNob3VsZERpc3Bvc2UgPSB0cnVlO1xuICAgICAgICB0aGlzLmRpc3Bvc2FibGVzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICB0aGlzLmxlbmd0aC0tO1xuICAgICAgICBpdGVtLmRpc3Bvc2UoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNob3VsZERpc3Bvc2U7XG4gIH07XG5cbiAgLyoqXG4gICAqICBEaXNwb3NlcyBhbGwgZGlzcG9zYWJsZXMgaW4gdGhlIGdyb3VwIGFuZCByZW1vdmVzIHRoZW0gZnJvbSB0aGUgZ3JvdXAuXG4gICAqL1xuICBDb21wb3NpdGVEaXNwb3NhYmxlUHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmlzRGlzcG9zZWQpIHtcbiAgICAgIHRoaXMuaXNEaXNwb3NlZCA9IHRydWU7XG4gICAgICB2YXIgbGVuID0gdGhpcy5kaXNwb3NhYmxlcy5sZW5ndGgsIGN1cnJlbnREaXNwb3NhYmxlcyA9IG5ldyBBcnJheShsZW4pO1xuICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7IGN1cnJlbnREaXNwb3NhYmxlc1tpXSA9IHRoaXMuZGlzcG9zYWJsZXNbaV07IH1cbiAgICAgIHRoaXMuZGlzcG9zYWJsZXMgPSBbXTtcbiAgICAgIHRoaXMubGVuZ3RoID0gMDtcblxuICAgICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGN1cnJlbnREaXNwb3NhYmxlc1tpXS5kaXNwb3NlKCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBQcm92aWRlcyBhIHNldCBvZiBzdGF0aWMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgRGlzcG9zYWJsZXMuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGRpc3Bvc2UgQWN0aW9uIHRvIHJ1biBkdXJpbmcgdGhlIGZpcnN0IGNhbGwgdG8gZGlzcG9zZS4gVGhlIGFjdGlvbiBpcyBndWFyYW50ZWVkIHRvIGJlIHJ1biBhdCBtb3N0IG9uY2UuXG4gICAqL1xuICB2YXIgRGlzcG9zYWJsZSA9IFJ4LkRpc3Bvc2FibGUgPSBmdW5jdGlvbiAoYWN0aW9uKSB7XG4gICAgdGhpcy5pc0Rpc3Bvc2VkID0gZmFsc2U7XG4gICAgdGhpcy5hY3Rpb24gPSBhY3Rpb24gfHwgbm9vcDtcbiAgfTtcblxuICAvKiogUGVyZm9ybXMgdGhlIHRhc2sgb2YgY2xlYW5pbmcgdXAgcmVzb3VyY2VzLiAqL1xuICBEaXNwb3NhYmxlLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5pc0Rpc3Bvc2VkKSB7XG4gICAgICB0aGlzLmFjdGlvbigpO1xuICAgICAgdGhpcy5pc0Rpc3Bvc2VkID0gdHJ1ZTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBkaXNwb3NhYmxlIG9iamVjdCB0aGF0IGludm9rZXMgdGhlIHNwZWNpZmllZCBhY3Rpb24gd2hlbiBkaXNwb3NlZC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZGlzcG9zZSBBY3Rpb24gdG8gcnVuIGR1cmluZyB0aGUgZmlyc3QgY2FsbCB0byBkaXNwb3NlLiBUaGUgYWN0aW9uIGlzIGd1YXJhbnRlZWQgdG8gYmUgcnVuIGF0IG1vc3Qgb25jZS5cbiAgICogQHJldHVybiB7RGlzcG9zYWJsZX0gVGhlIGRpc3Bvc2FibGUgb2JqZWN0IHRoYXQgcnVucyB0aGUgZ2l2ZW4gYWN0aW9uIHVwb24gZGlzcG9zYWwuXG4gICAqL1xuICB2YXIgZGlzcG9zYWJsZUNyZWF0ZSA9IERpc3Bvc2FibGUuY3JlYXRlID0gZnVuY3Rpb24gKGFjdGlvbikgeyByZXR1cm4gbmV3IERpc3Bvc2FibGUoYWN0aW9uKTsgfTtcblxuICAvKipcbiAgICogR2V0cyB0aGUgZGlzcG9zYWJsZSB0aGF0IGRvZXMgbm90aGluZyB3aGVuIGRpc3Bvc2VkLlxuICAgKi9cbiAgdmFyIGRpc3Bvc2FibGVFbXB0eSA9IERpc3Bvc2FibGUuZW1wdHkgPSB7IGRpc3Bvc2U6IG5vb3AgfTtcblxuICAvKipcbiAgICogVmFsaWRhdGVzIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIGRpc3Bvc2FibGVcbiAgICogQHBhcmFtIHtPYmplY3R9IE9iamVjdCB0byB0ZXN0IHdoZXRoZXIgaXQgaGFzIGEgZGlzcG9zZSBtZXRob2RcbiAgICogQHJldHVybnMge0Jvb2xlYW59IHRydWUgaWYgYSBkaXNwb3NhYmxlIG9iamVjdCwgZWxzZSBmYWxzZS5cbiAgICovXG4gIHZhciBpc0Rpc3Bvc2FibGUgPSBEaXNwb3NhYmxlLmlzRGlzcG9zYWJsZSA9IGZ1bmN0aW9uIChkKSB7XG4gICAgcmV0dXJuIGQgJiYgaXNGdW5jdGlvbihkLmRpc3Bvc2UpO1xuICB9O1xuXG4gIHZhciBjaGVja0Rpc3Bvc2VkID0gRGlzcG9zYWJsZS5jaGVja0Rpc3Bvc2VkID0gZnVuY3Rpb24gKGRpc3Bvc2FibGUpIHtcbiAgICBpZiAoZGlzcG9zYWJsZS5pc0Rpc3Bvc2VkKSB7IHRocm93IG5ldyBPYmplY3REaXNwb3NlZEVycm9yKCk7IH1cbiAgfTtcblxuICB2YXIgZGlzcG9zYWJsZUZpeHVwID0gRGlzcG9zYWJsZS5fZml4dXAgPSBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgcmV0dXJuIGlzRGlzcG9zYWJsZShyZXN1bHQpID8gcmVzdWx0IDogZGlzcG9zYWJsZUVtcHR5O1xuICB9O1xuXG4gIC8vIFNpbmdsZSBhc3NpZ25tZW50XG4gIHZhciBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSA9IFJ4LlNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaXNEaXNwb3NlZCA9IGZhbHNlO1xuICAgIHRoaXMuY3VycmVudCA9IG51bGw7XG4gIH07XG4gIFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlLnByb3RvdHlwZS5nZXREaXNwb3NhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnQ7XG4gIH07XG4gIFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlLnByb3RvdHlwZS5zZXREaXNwb3NhYmxlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgaWYgKHRoaXMuY3VycmVudCkgeyB0aHJvdyBuZXcgRXJyb3IoJ0Rpc3Bvc2FibGUgaGFzIGFscmVhZHkgYmVlbiBhc3NpZ25lZCcpOyB9XG4gICAgdmFyIHNob3VsZERpc3Bvc2UgPSB0aGlzLmlzRGlzcG9zZWQ7XG4gICAgIXNob3VsZERpc3Bvc2UgJiYgKHRoaXMuY3VycmVudCA9IHZhbHVlKTtcbiAgICBzaG91bGREaXNwb3NlICYmIHZhbHVlICYmIHZhbHVlLmRpc3Bvc2UoKTtcbiAgfTtcbiAgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmlzRGlzcG9zZWQpIHtcbiAgICAgIHRoaXMuaXNEaXNwb3NlZCA9IHRydWU7XG4gICAgICB2YXIgb2xkID0gdGhpcy5jdXJyZW50O1xuICAgICAgdGhpcy5jdXJyZW50ID0gbnVsbDtcbiAgICAgIG9sZCAmJiBvbGQuZGlzcG9zZSgpO1xuICAgIH1cbiAgfTtcblxuICAvLyBNdWx0aXBsZSBhc3NpZ25tZW50IGRpc3Bvc2FibGVcbiAgdmFyIFNlcmlhbERpc3Bvc2FibGUgPSBSeC5TZXJpYWxEaXNwb3NhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaXNEaXNwb3NlZCA9IGZhbHNlO1xuICAgIHRoaXMuY3VycmVudCA9IG51bGw7XG4gIH07XG4gIFNlcmlhbERpc3Bvc2FibGUucHJvdG90eXBlLmdldERpc3Bvc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudDtcbiAgfTtcbiAgU2VyaWFsRGlzcG9zYWJsZS5wcm90b3R5cGUuc2V0RGlzcG9zYWJsZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBzaG91bGREaXNwb3NlID0gdGhpcy5pc0Rpc3Bvc2VkO1xuICAgIGlmICghc2hvdWxkRGlzcG9zZSkge1xuICAgICAgdmFyIG9sZCA9IHRoaXMuY3VycmVudDtcbiAgICAgIHRoaXMuY3VycmVudCA9IHZhbHVlO1xuICAgIH1cbiAgICBvbGQgJiYgb2xkLmRpc3Bvc2UoKTtcbiAgICBzaG91bGREaXNwb3NlICYmIHZhbHVlICYmIHZhbHVlLmRpc3Bvc2UoKTtcbiAgfTtcbiAgU2VyaWFsRGlzcG9zYWJsZS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuaXNEaXNwb3NlZCkge1xuICAgICAgdGhpcy5pc0Rpc3Bvc2VkID0gdHJ1ZTtcbiAgICAgIHZhciBvbGQgPSB0aGlzLmN1cnJlbnQ7XG4gICAgICB0aGlzLmN1cnJlbnQgPSBudWxsO1xuICAgIH1cbiAgICBvbGQgJiYgb2xkLmRpc3Bvc2UoKTtcbiAgfTtcblxuICB2YXIgQmluYXJ5RGlzcG9zYWJsZSA9IFJ4LkJpbmFyeURpc3Bvc2FibGUgPSBmdW5jdGlvbiAoZmlyc3QsIHNlY29uZCkge1xuICAgIHRoaXMuX2ZpcnN0ID0gZmlyc3Q7XG4gICAgdGhpcy5fc2Vjb25kID0gc2Vjb25kO1xuICAgIHRoaXMuaXNEaXNwb3NlZCA9IGZhbHNlO1xuICB9O1xuXG4gIEJpbmFyeURpc3Bvc2FibGUucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmlzRGlzcG9zZWQpIHtcbiAgICAgIHRoaXMuaXNEaXNwb3NlZCA9IHRydWU7XG4gICAgICB2YXIgb2xkMSA9IHRoaXMuX2ZpcnN0O1xuICAgICAgdGhpcy5fZmlyc3QgPSBudWxsO1xuICAgICAgb2xkMSAmJiBvbGQxLmRpc3Bvc2UoKTtcbiAgICAgIHZhciBvbGQyID0gdGhpcy5fc2Vjb25kO1xuICAgICAgdGhpcy5fc2Vjb25kID0gbnVsbDtcbiAgICAgIG9sZDIgJiYgb2xkMi5kaXNwb3NlKCk7XG4gICAgfVxuICB9O1xuXG4gIHZhciBOQXJ5RGlzcG9zYWJsZSA9IFJ4Lk5BcnlEaXNwb3NhYmxlID0gZnVuY3Rpb24gKGRpc3Bvc2FibGVzKSB7XG4gICAgdGhpcy5fZGlzcG9zYWJsZXMgPSBkaXNwb3NhYmxlcztcbiAgICB0aGlzLmlzRGlzcG9zZWQgPSBmYWxzZTtcbiAgfTtcblxuICBOQXJ5RGlzcG9zYWJsZS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuaXNEaXNwb3NlZCkge1xuICAgICAgdGhpcy5pc0Rpc3Bvc2VkID0gdHJ1ZTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLl9kaXNwb3NhYmxlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB0aGlzLl9kaXNwb3NhYmxlc1tpXS5kaXNwb3NlKCk7XG4gICAgICB9XG4gICAgICB0aGlzLl9kaXNwb3NhYmxlcy5sZW5ndGggPSAwO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogUmVwcmVzZW50cyBhIGRpc3Bvc2FibGUgcmVzb3VyY2UgdGhhdCBvbmx5IGRpc3Bvc2VzIGl0cyB1bmRlcmx5aW5nIGRpc3Bvc2FibGUgcmVzb3VyY2Ugd2hlbiBhbGwgZGVwZW5kZW50IGRpc3Bvc2FibGUgb2JqZWN0cyBoYXZlIGJlZW4gZGlzcG9zZWQuXG4gICAqL1xuICB2YXIgUmVmQ291bnREaXNwb3NhYmxlID0gUnguUmVmQ291bnREaXNwb3NhYmxlID0gKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIElubmVyRGlzcG9zYWJsZShkaXNwb3NhYmxlKSB7XG4gICAgICB0aGlzLmRpc3Bvc2FibGUgPSBkaXNwb3NhYmxlO1xuICAgICAgdGhpcy5kaXNwb3NhYmxlLmNvdW50Kys7XG4gICAgICB0aGlzLmlzSW5uZXJEaXNwb3NlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIElubmVyRGlzcG9zYWJsZS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghdGhpcy5kaXNwb3NhYmxlLmlzRGlzcG9zZWQgJiYgIXRoaXMuaXNJbm5lckRpc3Bvc2VkKSB7XG4gICAgICAgIHRoaXMuaXNJbm5lckRpc3Bvc2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlLmNvdW50LS07XG4gICAgICAgIGlmICh0aGlzLmRpc3Bvc2FibGUuY291bnQgPT09IDAgJiYgdGhpcy5kaXNwb3NhYmxlLmlzUHJpbWFyeURpc3Bvc2VkKSB7XG4gICAgICAgICAgdGhpcy5kaXNwb3NhYmxlLmlzRGlzcG9zZWQgPSB0cnVlO1xuICAgICAgICAgIHRoaXMuZGlzcG9zYWJsZS51bmRlcmx5aW5nRGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlIFJlZkNvdW50RGlzcG9zYWJsZSB3aXRoIHRoZSBzcGVjaWZpZWQgZGlzcG9zYWJsZS5cbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0ge0Rpc3Bvc2FibGV9IGRpc3Bvc2FibGUgVW5kZXJseWluZyBkaXNwb3NhYmxlLlxuICAgICAgKi9cbiAgICBmdW5jdGlvbiBSZWZDb3VudERpc3Bvc2FibGUoZGlzcG9zYWJsZSkge1xuICAgICAgdGhpcy51bmRlcmx5aW5nRGlzcG9zYWJsZSA9IGRpc3Bvc2FibGU7XG4gICAgICB0aGlzLmlzRGlzcG9zZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuaXNQcmltYXJ5RGlzcG9zZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuY291bnQgPSAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERpc3Bvc2VzIHRoZSB1bmRlcmx5aW5nIGRpc3Bvc2FibGUgb25seSB3aGVuIGFsbCBkZXBlbmRlbnQgZGlzcG9zYWJsZXMgaGF2ZSBiZWVuIGRpc3Bvc2VkXG4gICAgICovXG4gICAgUmVmQ291bnREaXNwb3NhYmxlLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCF0aGlzLmlzRGlzcG9zZWQgJiYgIXRoaXMuaXNQcmltYXJ5RGlzcG9zZWQpIHtcbiAgICAgICAgdGhpcy5pc1ByaW1hcnlEaXNwb3NlZCA9IHRydWU7XG4gICAgICAgIGlmICh0aGlzLmNvdW50ID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5pc0Rpc3Bvc2VkID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLnVuZGVybHlpbmdEaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgZGVwZW5kZW50IGRpc3Bvc2FibGUgdGhhdCB3aGVuIGRpc3Bvc2VkIGRlY3JlYXNlcyB0aGUgcmVmY291bnQgb24gdGhlIHVuZGVybHlpbmcgZGlzcG9zYWJsZS5cbiAgICAgKiBAcmV0dXJucyB7RGlzcG9zYWJsZX0gQSBkZXBlbmRlbnQgZGlzcG9zYWJsZSBjb250cmlidXRpbmcgdG8gdGhlIHJlZmVyZW5jZSBjb3VudCB0aGF0IG1hbmFnZXMgdGhlIHVuZGVybHlpbmcgZGlzcG9zYWJsZSdzIGxpZmV0aW1lLlxuICAgICAqL1xuICAgIFJlZkNvdW50RGlzcG9zYWJsZS5wcm90b3R5cGUuZ2V0RGlzcG9zYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB0aGlzLmlzRGlzcG9zZWQgPyBkaXNwb3NhYmxlRW1wdHkgOiBuZXcgSW5uZXJEaXNwb3NhYmxlKHRoaXMpO1xuICAgIH07XG5cbiAgICByZXR1cm4gUmVmQ291bnREaXNwb3NhYmxlO1xuICB9KSgpO1xuXG4gIGZ1bmN0aW9uIFNjaGVkdWxlZERpc3Bvc2FibGUoc2NoZWR1bGVyLCBkaXNwb3NhYmxlKSB7XG4gICAgdGhpcy5zY2hlZHVsZXIgPSBzY2hlZHVsZXI7XG4gICAgdGhpcy5kaXNwb3NhYmxlID0gZGlzcG9zYWJsZTtcbiAgICB0aGlzLmlzRGlzcG9zZWQgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNjaGVkdWxlSXRlbShzLCBzZWxmKSB7XG4gICAgaWYgKCFzZWxmLmlzRGlzcG9zZWQpIHtcbiAgICAgIHNlbGYuaXNEaXNwb3NlZCA9IHRydWU7XG4gICAgICBzZWxmLmRpc3Bvc2FibGUuZGlzcG9zZSgpO1xuICAgIH1cbiAgfVxuXG4gIFNjaGVkdWxlZERpc3Bvc2FibGUucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zY2hlZHVsZXIuc2NoZWR1bGUodGhpcywgc2NoZWR1bGVJdGVtKTtcbiAgfTtcblxuICB2YXIgU2NoZWR1bGVkSXRlbSA9IFJ4LmludGVybmFscy5TY2hlZHVsZWRJdGVtID0gZnVuY3Rpb24gKHNjaGVkdWxlciwgc3RhdGUsIGFjdGlvbiwgZHVlVGltZSwgY29tcGFyZXIpIHtcbiAgICB0aGlzLnNjaGVkdWxlciA9IHNjaGVkdWxlcjtcbiAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gICAgdGhpcy5hY3Rpb24gPSBhY3Rpb247XG4gICAgdGhpcy5kdWVUaW1lID0gZHVlVGltZTtcbiAgICB0aGlzLmNvbXBhcmVyID0gY29tcGFyZXIgfHwgZGVmYXVsdFN1YkNvbXBhcmVyO1xuICAgIHRoaXMuZGlzcG9zYWJsZSA9IG5ldyBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSgpO1xuICB9O1xuXG4gIFNjaGVkdWxlZEl0ZW0ucHJvdG90eXBlLmludm9rZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3Bvc2FibGUuc2V0RGlzcG9zYWJsZSh0aGlzLmludm9rZUNvcmUoKSk7XG4gIH07XG5cbiAgU2NoZWR1bGVkSXRlbS5wcm90b3R5cGUuY29tcGFyZVRvID0gZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgcmV0dXJuIHRoaXMuY29tcGFyZXIodGhpcy5kdWVUaW1lLCBvdGhlci5kdWVUaW1lKTtcbiAgfTtcblxuICBTY2hlZHVsZWRJdGVtLnByb3RvdHlwZS5pc0NhbmNlbGxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwb3NhYmxlLmlzRGlzcG9zZWQ7XG4gIH07XG5cbiAgU2NoZWR1bGVkSXRlbS5wcm90b3R5cGUuaW52b2tlQ29yZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZGlzcG9zYWJsZUZpeHVwKHRoaXMuYWN0aW9uKHRoaXMuc2NoZWR1bGVyLCB0aGlzLnN0YXRlKSk7XG4gIH07XG5cbiAgLyoqIFByb3ZpZGVzIGEgc2V0IG9mIHN0YXRpYyBwcm9wZXJ0aWVzIHRvIGFjY2VzcyBjb21tb25seSB1c2VkIHNjaGVkdWxlcnMuICovXG4gIHZhciBTY2hlZHVsZXIgPSBSeC5TY2hlZHVsZXIgPSAoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gU2NoZWR1bGVyKCkgeyB9XG5cbiAgICAvKiogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBnaXZlbiBvYmplY3QgaXMgYSBzY2hlZHVsZXIgKi9cbiAgICBTY2hlZHVsZXIuaXNTY2hlZHVsZXIgPSBmdW5jdGlvbiAocykge1xuICAgICAgcmV0dXJuIHMgaW5zdGFuY2VvZiBTY2hlZHVsZXI7XG4gICAgfTtcblxuICAgIHZhciBzY2hlZHVsZXJQcm90byA9IFNjaGVkdWxlci5wcm90b3R5cGU7XG5cbiAgICAvKipcbiAgICogU2NoZWR1bGVzIGFuIGFjdGlvbiB0byBiZSBleGVjdXRlZC5cbiAgICogQHBhcmFtIHN0YXRlIFN0YXRlIHBhc3NlZCB0byB0aGUgYWN0aW9uIHRvIGJlIGV4ZWN1dGVkLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBhY3Rpb24gQWN0aW9uIHRvIGJlIGV4ZWN1dGVkLlxuICAgKiBAcmV0dXJucyB7RGlzcG9zYWJsZX0gVGhlIGRpc3Bvc2FibGUgb2JqZWN0IHVzZWQgdG8gY2FuY2VsIHRoZSBzY2hlZHVsZWQgYWN0aW9uIChiZXN0IGVmZm9ydCkuXG4gICAqL1xuICAgIHNjaGVkdWxlclByb3RvLnNjaGVkdWxlID0gZnVuY3Rpb24gKHN0YXRlLCBhY3Rpb24pIHtcbiAgICAgIHRocm93IG5ldyBOb3RJbXBsZW1lbnRlZEVycm9yKCk7XG4gICAgfTtcblxuICAvKipcbiAgICogU2NoZWR1bGVzIGFuIGFjdGlvbiB0byBiZSBleGVjdXRlZCBhZnRlciBkdWVUaW1lLlxuICAgKiBAcGFyYW0gc3RhdGUgU3RhdGUgcGFzc2VkIHRvIHRoZSBhY3Rpb24gdG8gYmUgZXhlY3V0ZWQuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGFjdGlvbiBBY3Rpb24gdG8gYmUgZXhlY3V0ZWQuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkdWVUaW1lIFJlbGF0aXZlIHRpbWUgYWZ0ZXIgd2hpY2ggdG8gZXhlY3V0ZSB0aGUgYWN0aW9uLlxuICAgKiBAcmV0dXJucyB7RGlzcG9zYWJsZX0gVGhlIGRpc3Bvc2FibGUgb2JqZWN0IHVzZWQgdG8gY2FuY2VsIHRoZSBzY2hlZHVsZWQgYWN0aW9uIChiZXN0IGVmZm9ydCkuXG4gICAqL1xuICAgIHNjaGVkdWxlclByb3RvLnNjaGVkdWxlRnV0dXJlID0gZnVuY3Rpb24gKHN0YXRlLCBkdWVUaW1lLCBhY3Rpb24pIHtcbiAgICAgIHZhciBkdCA9IGR1ZVRpbWU7XG4gICAgICBkdCBpbnN0YW5jZW9mIERhdGUgJiYgKGR0ID0gZHQgLSB0aGlzLm5vdygpKTtcbiAgICAgIGR0ID0gU2NoZWR1bGVyLm5vcm1hbGl6ZShkdCk7XG5cbiAgICAgIGlmIChkdCA9PT0gMCkgeyByZXR1cm4gdGhpcy5zY2hlZHVsZShzdGF0ZSwgYWN0aW9uKTsgfVxuXG4gICAgICByZXR1cm4gdGhpcy5fc2NoZWR1bGVGdXR1cmUoc3RhdGUsIGR0LCBhY3Rpb24pO1xuICAgIH07XG5cbiAgICBzY2hlZHVsZXJQcm90by5fc2NoZWR1bGVGdXR1cmUgPSBmdW5jdGlvbiAoc3RhdGUsIGR1ZVRpbWUsIGFjdGlvbikge1xuICAgICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoKTtcbiAgICB9O1xuXG4gICAgLyoqIEdldHMgdGhlIGN1cnJlbnQgdGltZSBhY2NvcmRpbmcgdG8gdGhlIGxvY2FsIG1hY2hpbmUncyBzeXN0ZW0gY2xvY2suICovXG4gICAgU2NoZWR1bGVyLm5vdyA9IGRlZmF1bHROb3c7XG5cbiAgICAvKiogR2V0cyB0aGUgY3VycmVudCB0aW1lIGFjY29yZGluZyB0byB0aGUgbG9jYWwgbWFjaGluZSdzIHN5c3RlbSBjbG9jay4gKi9cbiAgICBTY2hlZHVsZXIucHJvdG90eXBlLm5vdyA9IGRlZmF1bHROb3c7XG5cbiAgICAvKipcbiAgICAgKiBOb3JtYWxpemVzIHRoZSBzcGVjaWZpZWQgVGltZVNwYW4gdmFsdWUgdG8gYSBwb3NpdGl2ZSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdGltZVNwYW4gVGhlIHRpbWUgc3BhbiB2YWx1ZSB0byBub3JtYWxpemUuXG4gICAgICogQHJldHVybnMge051bWJlcn0gVGhlIHNwZWNpZmllZCBUaW1lU3BhbiB2YWx1ZSBpZiBpdCBpcyB6ZXJvIG9yIHBvc2l0aXZlOyBvdGhlcndpc2UsIDBcbiAgICAgKi9cbiAgICBTY2hlZHVsZXIubm9ybWFsaXplID0gZnVuY3Rpb24gKHRpbWVTcGFuKSB7XG4gICAgICB0aW1lU3BhbiA8IDAgJiYgKHRpbWVTcGFuID0gMCk7XG4gICAgICByZXR1cm4gdGltZVNwYW47XG4gICAgfTtcblxuICAgIHJldHVybiBTY2hlZHVsZXI7XG4gIH0oKSk7XG5cbiAgdmFyIG5vcm1hbGl6ZVRpbWUgPSBTY2hlZHVsZXIubm9ybWFsaXplLCBpc1NjaGVkdWxlciA9IFNjaGVkdWxlci5pc1NjaGVkdWxlcjtcblxuICAoZnVuY3Rpb24gKHNjaGVkdWxlclByb3RvKSB7XG5cbiAgICBmdW5jdGlvbiBpbnZva2VSZWNJbW1lZGlhdGUoc2NoZWR1bGVyLCBwYWlyKSB7XG4gICAgICB2YXIgc3RhdGUgPSBwYWlyWzBdLCBhY3Rpb24gPSBwYWlyWzFdLCBncm91cCA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG4gICAgICBhY3Rpb24oc3RhdGUsIGlubmVyQWN0aW9uKTtcbiAgICAgIHJldHVybiBncm91cDtcblxuICAgICAgZnVuY3Rpb24gaW5uZXJBY3Rpb24oc3RhdGUyKSB7XG4gICAgICAgIHZhciBpc0FkZGVkID0gZmFsc2UsIGlzRG9uZSA9IGZhbHNlO1xuXG4gICAgICAgIHZhciBkID0gc2NoZWR1bGVyLnNjaGVkdWxlKHN0YXRlMiwgc2NoZWR1bGVXb3JrKTtcbiAgICAgICAgaWYgKCFpc0RvbmUpIHtcbiAgICAgICAgICBncm91cC5hZGQoZCk7XG4gICAgICAgICAgaXNBZGRlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzY2hlZHVsZVdvcmsoXywgc3RhdGUzKSB7XG4gICAgICAgICAgaWYgKGlzQWRkZWQpIHtcbiAgICAgICAgICAgIGdyb3VwLnJlbW92ZShkKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaXNEb25lID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYWN0aW9uKHN0YXRlMywgaW5uZXJBY3Rpb24pO1xuICAgICAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnZva2VSZWNEYXRlKHNjaGVkdWxlciwgcGFpcikge1xuICAgICAgdmFyIHN0YXRlID0gcGFpclswXSwgYWN0aW9uID0gcGFpclsxXSwgZ3JvdXAgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICAgICAgYWN0aW9uKHN0YXRlLCBpbm5lckFjdGlvbik7XG4gICAgICByZXR1cm4gZ3JvdXA7XG5cbiAgICAgIGZ1bmN0aW9uIGlubmVyQWN0aW9uKHN0YXRlMiwgZHVlVGltZTEpIHtcbiAgICAgICAgdmFyIGlzQWRkZWQgPSBmYWxzZSwgaXNEb25lID0gZmFsc2U7XG5cbiAgICAgICAgdmFyIGQgPSBzY2hlZHVsZXIuc2NoZWR1bGVGdXR1cmUoc3RhdGUyLCBkdWVUaW1lMSwgc2NoZWR1bGVXb3JrKTtcbiAgICAgICAgaWYgKCFpc0RvbmUpIHtcbiAgICAgICAgICBncm91cC5hZGQoZCk7XG4gICAgICAgICAgaXNBZGRlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzY2hlZHVsZVdvcmsoXywgc3RhdGUzKSB7XG4gICAgICAgICAgaWYgKGlzQWRkZWQpIHtcbiAgICAgICAgICAgIGdyb3VwLnJlbW92ZShkKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaXNEb25lID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYWN0aW9uKHN0YXRlMywgaW5uZXJBY3Rpb24pO1xuICAgICAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTY2hlZHVsZXMgYW4gYWN0aW9uIHRvIGJlIGV4ZWN1dGVkIHJlY3Vyc2l2ZWx5LlxuICAgICAqIEBwYXJhbSB7TWl4ZWR9IHN0YXRlIFN0YXRlIHBhc3NlZCB0byB0aGUgYWN0aW9uIHRvIGJlIGV4ZWN1dGVkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGFjdGlvbiBBY3Rpb24gdG8gZXhlY3V0ZSByZWN1cnNpdmVseS4gVGhlIGxhc3QgcGFyYW1ldGVyIHBhc3NlZCB0byB0aGUgYWN0aW9uIGlzIHVzZWQgdG8gdHJpZ2dlciByZWN1cnNpdmUgc2NoZWR1bGluZyBvZiB0aGUgYWN0aW9uLCBwYXNzaW5nIGluIHJlY3Vyc2l2ZSBpbnZvY2F0aW9uIHN0YXRlLlxuICAgICAqIEByZXR1cm5zIHtEaXNwb3NhYmxlfSBUaGUgZGlzcG9zYWJsZSBvYmplY3QgdXNlZCB0byBjYW5jZWwgdGhlIHNjaGVkdWxlZCBhY3Rpb24gKGJlc3QgZWZmb3J0KS5cbiAgICAgKi9cbiAgICBzY2hlZHVsZXJQcm90by5zY2hlZHVsZVJlY3Vyc2l2ZSA9IGZ1bmN0aW9uIChzdGF0ZSwgYWN0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5zY2hlZHVsZShbc3RhdGUsIGFjdGlvbl0sIGludm9rZVJlY0ltbWVkaWF0ZSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNjaGVkdWxlcyBhbiBhY3Rpb24gdG8gYmUgZXhlY3V0ZWQgcmVjdXJzaXZlbHkgYWZ0ZXIgYSBzcGVjaWZpZWQgcmVsYXRpdmUgb3IgYWJzb2x1dGUgZHVlIHRpbWUuXG4gICAgICogQHBhcmFtIHtNaXhlZH0gc3RhdGUgU3RhdGUgcGFzc2VkIHRvIHRoZSBhY3Rpb24gdG8gYmUgZXhlY3V0ZWQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gYWN0aW9uIEFjdGlvbiB0byBleGVjdXRlIHJlY3Vyc2l2ZWx5LiBUaGUgbGFzdCBwYXJhbWV0ZXIgcGFzc2VkIHRvIHRoZSBhY3Rpb24gaXMgdXNlZCB0byB0cmlnZ2VyIHJlY3Vyc2l2ZSBzY2hlZHVsaW5nIG9mIHRoZSBhY3Rpb24sIHBhc3NpbmcgaW4gdGhlIHJlY3Vyc2l2ZSBkdWUgdGltZSBhbmQgaW52b2NhdGlvbiBzdGF0ZS5cbiAgICAgKiBAcGFyYW0ge051bWJlciB8IERhdGV9IGR1ZVRpbWUgUmVsYXRpdmUgb3IgYWJzb2x1dGUgdGltZSBhZnRlciB3aGljaCB0byBleGVjdXRlIHRoZSBhY3Rpb24gZm9yIHRoZSBmaXJzdCB0aW1lLlxuICAgICAqIEByZXR1cm5zIHtEaXNwb3NhYmxlfSBUaGUgZGlzcG9zYWJsZSBvYmplY3QgdXNlZCB0byBjYW5jZWwgdGhlIHNjaGVkdWxlZCBhY3Rpb24gKGJlc3QgZWZmb3J0KS5cbiAgICAgKi9cbiAgICBzY2hlZHVsZXJQcm90by5zY2hlZHVsZVJlY3Vyc2l2ZUZ1dHVyZSA9IGZ1bmN0aW9uIChzdGF0ZSwgZHVlVGltZSwgYWN0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5zY2hlZHVsZUZ1dHVyZShbc3RhdGUsIGFjdGlvbl0sIGR1ZVRpbWUsIGludm9rZVJlY0RhdGUpO1xuICAgIH07XG5cbiAgfShTY2hlZHVsZXIucHJvdG90eXBlKSk7XG5cbiAgKGZ1bmN0aW9uIChzY2hlZHVsZXJQcm90bykge1xuXG4gICAgLyoqXG4gICAgICogU2NoZWR1bGVzIGEgcGVyaW9kaWMgcGllY2Ugb2Ygd29yayBieSBkeW5hbWljYWxseSBkaXNjb3ZlcmluZyB0aGUgc2NoZWR1bGVyJ3MgY2FwYWJpbGl0aWVzLiBUaGUgcGVyaW9kaWMgdGFzayB3aWxsIGJlIHNjaGVkdWxlZCB1c2luZyB3aW5kb3cuc2V0SW50ZXJ2YWwgZm9yIHRoZSBiYXNlIGltcGxlbWVudGF0aW9uLlxuICAgICAqIEBwYXJhbSB7TWl4ZWR9IHN0YXRlIEluaXRpYWwgc3RhdGUgcGFzc2VkIHRvIHRoZSBhY3Rpb24gdXBvbiB0aGUgZmlyc3QgaXRlcmF0aW9uLlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBwZXJpb2QgUGVyaW9kIGZvciBydW5uaW5nIHRoZSB3b3JrIHBlcmlvZGljYWxseS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBhY3Rpb24gQWN0aW9uIHRvIGJlIGV4ZWN1dGVkLCBwb3RlbnRpYWxseSB1cGRhdGluZyB0aGUgc3RhdGUuXG4gICAgICogQHJldHVybnMge0Rpc3Bvc2FibGV9IFRoZSBkaXNwb3NhYmxlIG9iamVjdCB1c2VkIHRvIGNhbmNlbCB0aGUgc2NoZWR1bGVkIHJlY3VycmluZyBhY3Rpb24gKGJlc3QgZWZmb3J0KS5cbiAgICAgKi9cbiAgICBzY2hlZHVsZXJQcm90by5zY2hlZHVsZVBlcmlvZGljID0gZnVuY3Rpb24oc3RhdGUsIHBlcmlvZCwgYWN0aW9uKSB7XG4gICAgICBpZiAodHlwZW9mIHJvb3Quc2V0SW50ZXJ2YWwgPT09ICd1bmRlZmluZWQnKSB7IHRocm93IG5ldyBOb3RTdXBwb3J0ZWRFcnJvcigpOyB9XG4gICAgICBwZXJpb2QgPSBub3JtYWxpemVUaW1lKHBlcmlvZCk7XG4gICAgICB2YXIgcyA9IHN0YXRlLCBpZCA9IHJvb3Quc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkgeyBzID0gYWN0aW9uKHMpOyB9LCBwZXJpb2QpO1xuICAgICAgcmV0dXJuIGRpc3Bvc2FibGVDcmVhdGUoZnVuY3Rpb24gKCkgeyByb290LmNsZWFySW50ZXJ2YWwoaWQpOyB9KTtcbiAgICB9O1xuXG4gIH0oU2NoZWR1bGVyLnByb3RvdHlwZSkpO1xuXG4gIChmdW5jdGlvbiAoc2NoZWR1bGVyUHJvdG8pIHtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc2NoZWR1bGVyIHRoYXQgd3JhcHMgdGhlIG9yaWdpbmFsIHNjaGVkdWxlciwgYWRkaW5nIGV4Y2VwdGlvbiBoYW5kbGluZyBmb3Igc2NoZWR1bGVkIGFjdGlvbnMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gaGFuZGxlciBIYW5kbGVyIHRoYXQncyBydW4gaWYgYW4gZXhjZXB0aW9uIGlzIGNhdWdodC4gVGhlIGV4Y2VwdGlvbiB3aWxsIGJlIHJldGhyb3duIGlmIHRoZSBoYW5kbGVyIHJldHVybnMgZmFsc2UuXG4gICAgICogQHJldHVybnMge1NjaGVkdWxlcn0gV3JhcHBlciBhcm91bmQgdGhlIG9yaWdpbmFsIHNjaGVkdWxlciwgZW5mb3JjaW5nIGV4Y2VwdGlvbiBoYW5kbGluZy5cbiAgICAgKi9cbiAgICBzY2hlZHVsZXJQcm90by5jYXRjaEVycm9yID0gc2NoZWR1bGVyUHJvdG9bJ2NhdGNoJ10gPSBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgcmV0dXJuIG5ldyBDYXRjaFNjaGVkdWxlcih0aGlzLCBoYW5kbGVyKTtcbiAgICB9O1xuICB9KFNjaGVkdWxlci5wcm90b3R5cGUpKTtcblxuICB2YXIgU2NoZWR1bGVQZXJpb2RpY1JlY3Vyc2l2ZSA9IFJ4LmludGVybmFscy5TY2hlZHVsZVBlcmlvZGljUmVjdXJzaXZlID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBjcmVhdGVUaWNrKHNlbGYpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiB0aWNrKGNvbW1hbmQsIHJlY3Vyc2UpIHtcbiAgICAgICAgcmVjdXJzZSgwLCBzZWxmLl9wZXJpb2QpO1xuICAgICAgICB2YXIgc3RhdGUgPSB0cnlDYXRjaChzZWxmLl9hY3Rpb24pKHNlbGYuX3N0YXRlKTtcbiAgICAgICAgaWYgKHN0YXRlID09PSBlcnJvck9iaikge1xuICAgICAgICAgIHNlbGYuX2NhbmNlbC5kaXNwb3NlKCk7XG4gICAgICAgICAgdGhyb3dlcihzdGF0ZS5lKTtcbiAgICAgICAgfVxuICAgICAgICBzZWxmLl9zdGF0ZSA9IHN0YXRlO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBTY2hlZHVsZVBlcmlvZGljUmVjdXJzaXZlKHNjaGVkdWxlciwgc3RhdGUsIHBlcmlvZCwgYWN0aW9uKSB7XG4gICAgICB0aGlzLl9zY2hlZHVsZXIgPSBzY2hlZHVsZXI7XG4gICAgICB0aGlzLl9zdGF0ZSA9IHN0YXRlO1xuICAgICAgdGhpcy5fcGVyaW9kID0gcGVyaW9kO1xuICAgICAgdGhpcy5fYWN0aW9uID0gYWN0aW9uO1xuICAgIH1cblxuICAgIFNjaGVkdWxlUGVyaW9kaWNSZWN1cnNpdmUucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGQgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgIHRoaXMuX2NhbmNlbCA9IGQ7XG4gICAgICBkLnNldERpc3Bvc2FibGUodGhpcy5fc2NoZWR1bGVyLnNjaGVkdWxlUmVjdXJzaXZlRnV0dXJlKDAsIHRoaXMuX3BlcmlvZCwgY3JlYXRlVGljayh0aGlzKSkpO1xuXG4gICAgICByZXR1cm4gZDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFNjaGVkdWxlUGVyaW9kaWNSZWN1cnNpdmU7XG4gIH0oKSk7XG5cbiAgLyoqIEdldHMgYSBzY2hlZHVsZXIgdGhhdCBzY2hlZHVsZXMgd29yayBpbW1lZGlhdGVseSBvbiB0aGUgY3VycmVudCB0aHJlYWQuICovXG4gICB2YXIgSW1tZWRpYXRlU2NoZWR1bGVyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhJbW1lZGlhdGVTY2hlZHVsZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gSW1tZWRpYXRlU2NoZWR1bGVyKCkge1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgSW1tZWRpYXRlU2NoZWR1bGVyLnByb3RvdHlwZS5zY2hlZHVsZSA9IGZ1bmN0aW9uIChzdGF0ZSwgYWN0aW9uKSB7XG4gICAgICByZXR1cm4gZGlzcG9zYWJsZUZpeHVwKGFjdGlvbih0aGlzLCBzdGF0ZSkpO1xuICAgIH07XG5cbiAgICByZXR1cm4gSW1tZWRpYXRlU2NoZWR1bGVyO1xuICB9KFNjaGVkdWxlcikpO1xuXG4gIHZhciBpbW1lZGlhdGVTY2hlZHVsZXIgPSBTY2hlZHVsZXIuaW1tZWRpYXRlID0gbmV3IEltbWVkaWF0ZVNjaGVkdWxlcigpO1xuXG4gIC8qKlxuICAgKiBHZXRzIGEgc2NoZWR1bGVyIHRoYXQgc2NoZWR1bGVzIHdvcmsgYXMgc29vbiBhcyBwb3NzaWJsZSBvbiB0aGUgY3VycmVudCB0aHJlYWQuXG4gICAqL1xuICB2YXIgQ3VycmVudFRocmVhZFNjaGVkdWxlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgdmFyIHF1ZXVlO1xuXG4gICAgZnVuY3Rpb24gcnVuVHJhbXBvbGluZSAoKSB7XG4gICAgICB3aGlsZSAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgaXRlbSA9IHF1ZXVlLmRlcXVldWUoKTtcbiAgICAgICAgIWl0ZW0uaXNDYW5jZWxsZWQoKSAmJiBpdGVtLmludm9rZSgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGluaGVyaXRzKEN1cnJlbnRUaHJlYWRTY2hlZHVsZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gQ3VycmVudFRocmVhZFNjaGVkdWxlcigpIHtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIEN1cnJlbnRUaHJlYWRTY2hlZHVsZXIucHJvdG90eXBlLnNjaGVkdWxlID0gZnVuY3Rpb24gKHN0YXRlLCBhY3Rpb24pIHtcbiAgICAgIHZhciBzaSA9IG5ldyBTY2hlZHVsZWRJdGVtKHRoaXMsIHN0YXRlLCBhY3Rpb24sIHRoaXMubm93KCkpO1xuXG4gICAgICBpZiAoIXF1ZXVlKSB7XG4gICAgICAgIHF1ZXVlID0gbmV3IFByaW9yaXR5UXVldWUoNCk7XG4gICAgICAgIHF1ZXVlLmVucXVldWUoc2kpO1xuXG4gICAgICAgIHZhciByZXN1bHQgPSB0cnlDYXRjaChydW5UcmFtcG9saW5lKSgpO1xuICAgICAgICBxdWV1ZSA9IG51bGw7XG4gICAgICAgIGlmIChyZXN1bHQgPT09IGVycm9yT2JqKSB7IHRocm93ZXIocmVzdWx0LmUpOyB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZS5lbnF1ZXVlKHNpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzaS5kaXNwb3NhYmxlO1xuICAgIH07XG5cbiAgICBDdXJyZW50VGhyZWFkU2NoZWR1bGVyLnByb3RvdHlwZS5zY2hlZHVsZVJlcXVpcmVkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gIXF1ZXVlOyB9O1xuXG4gICAgcmV0dXJuIEN1cnJlbnRUaHJlYWRTY2hlZHVsZXI7XG4gIH0oU2NoZWR1bGVyKSk7XG5cbiAgdmFyIGN1cnJlbnRUaHJlYWRTY2hlZHVsZXIgPSBTY2hlZHVsZXIuY3VycmVudFRocmVhZCA9IG5ldyBDdXJyZW50VGhyZWFkU2NoZWR1bGVyKCk7XG5cbiAgdmFyIHNjaGVkdWxlTWV0aG9kLCBjbGVhck1ldGhvZDtcblxuICB2YXIgbG9jYWxUaW1lciA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGxvY2FsU2V0VGltZW91dCwgbG9jYWxDbGVhclRpbWVvdXQgPSBub29wO1xuICAgIGlmICghIXJvb3Quc2V0VGltZW91dCkge1xuICAgICAgbG9jYWxTZXRUaW1lb3V0ID0gcm9vdC5zZXRUaW1lb3V0O1xuICAgICAgbG9jYWxDbGVhclRpbWVvdXQgPSByb290LmNsZWFyVGltZW91dDtcbiAgICB9IGVsc2UgaWYgKCEhcm9vdC5XU2NyaXB0KSB7XG4gICAgICBsb2NhbFNldFRpbWVvdXQgPSBmdW5jdGlvbiAoZm4sIHRpbWUpIHtcbiAgICAgICAgcm9vdC5XU2NyaXB0LlNsZWVwKHRpbWUpO1xuICAgICAgICBmbigpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IE5vdFN1cHBvcnRlZEVycm9yKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHNldFRpbWVvdXQ6IGxvY2FsU2V0VGltZW91dCxcbiAgICAgIGNsZWFyVGltZW91dDogbG9jYWxDbGVhclRpbWVvdXRcbiAgICB9O1xuICB9KCkpO1xuICB2YXIgbG9jYWxTZXRUaW1lb3V0ID0gbG9jYWxUaW1lci5zZXRUaW1lb3V0LFxuICAgIGxvY2FsQ2xlYXJUaW1lb3V0ID0gbG9jYWxUaW1lci5jbGVhclRpbWVvdXQ7XG5cbiAgKGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBuZXh0SGFuZGxlID0gMSwgdGFza3NCeUhhbmRsZSA9IHt9LCBjdXJyZW50bHlSdW5uaW5nID0gZmFsc2U7XG5cbiAgICBjbGVhck1ldGhvZCA9IGZ1bmN0aW9uIChoYW5kbGUpIHtcbiAgICAgIGRlbGV0ZSB0YXNrc0J5SGFuZGxlW2hhbmRsZV07XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHJ1blRhc2soaGFuZGxlKSB7XG4gICAgICBpZiAoY3VycmVudGx5UnVubmluZykge1xuICAgICAgICBsb2NhbFNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyBydW5UYXNrKGhhbmRsZSk7IH0sIDApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRhc2sgPSB0YXNrc0J5SGFuZGxlW2hhbmRsZV07XG4gICAgICAgIGlmICh0YXNrKSB7XG4gICAgICAgICAgY3VycmVudGx5UnVubmluZyA9IHRydWU7XG4gICAgICAgICAgdmFyIHJlc3VsdCA9IHRyeUNhdGNoKHRhc2spKCk7XG4gICAgICAgICAgY2xlYXJNZXRob2QoaGFuZGxlKTtcbiAgICAgICAgICBjdXJyZW50bHlSdW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgaWYgKHJlc3VsdCA9PT0gZXJyb3JPYmopIHsgdGhyb3dlcihyZXN1bHQuZSk7IH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHZhciByZU5hdGl2ZSA9IG5ldyBSZWdFeHAoJ14nICtcbiAgICAgIFN0cmluZyh0b1N0cmluZylcbiAgICAgICAgLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCAnXFxcXCQmJylcbiAgICAgICAgLnJlcGxhY2UoL3RvU3RyaW5nfCBmb3IgW15cXF1dKy9nLCAnLio/JykgKyAnJCdcbiAgICApO1xuXG4gICAgdmFyIHNldEltbWVkaWF0ZSA9IHR5cGVvZiAoc2V0SW1tZWRpYXRlID0gZnJlZUdsb2JhbCAmJiBtb2R1bGVFeHBvcnRzICYmIGZyZWVHbG9iYWwuc2V0SW1tZWRpYXRlKSA9PSAnZnVuY3Rpb24nICYmXG4gICAgICAhcmVOYXRpdmUudGVzdChzZXRJbW1lZGlhdGUpICYmIHNldEltbWVkaWF0ZTtcblxuICAgIGZ1bmN0aW9uIHBvc3RNZXNzYWdlU3VwcG9ydGVkICgpIHtcbiAgICAgIC8vIEVuc3VyZSBub3QgaW4gYSB3b3JrZXJcbiAgICAgIGlmICghcm9vdC5wb3N0TWVzc2FnZSB8fCByb290LmltcG9ydFNjcmlwdHMpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICB2YXIgaXNBc3luYyA9IGZhbHNlLCBvbGRIYW5kbGVyID0gcm9vdC5vbm1lc3NhZ2U7XG4gICAgICAvLyBUZXN0IGZvciBhc3luY1xuICAgICAgcm9vdC5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7IGlzQXN5bmMgPSB0cnVlOyB9O1xuICAgICAgcm9vdC5wb3N0TWVzc2FnZSgnJywgJyonKTtcbiAgICAgIHJvb3Qub25tZXNzYWdlID0gb2xkSGFuZGxlcjtcblxuICAgICAgcmV0dXJuIGlzQXN5bmM7XG4gICAgfVxuXG4gICAgLy8gVXNlIGluIG9yZGVyLCBzZXRJbW1lZGlhdGUsIG5leHRUaWNrLCBwb3N0TWVzc2FnZSwgTWVzc2FnZUNoYW5uZWwsIHNjcmlwdCByZWFkeXN0YXRlY2hhbmdlZCwgc2V0VGltZW91dFxuICAgIGlmIChpc0Z1bmN0aW9uKHNldEltbWVkaWF0ZSkpIHtcbiAgICAgIHNjaGVkdWxlTWV0aG9kID0gZnVuY3Rpb24gKGFjdGlvbikge1xuICAgICAgICB2YXIgaWQgPSBuZXh0SGFuZGxlKys7XG4gICAgICAgIHRhc2tzQnlIYW5kbGVbaWRdID0gYWN0aW9uO1xuICAgICAgICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkgeyBydW5UYXNrKGlkKTsgfSk7XG5cbiAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScpIHtcbiAgICAgIHNjaGVkdWxlTWV0aG9kID0gZnVuY3Rpb24gKGFjdGlvbikge1xuICAgICAgICB2YXIgaWQgPSBuZXh0SGFuZGxlKys7XG4gICAgICAgIHRhc2tzQnlIYW5kbGVbaWRdID0gYWN0aW9uO1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uICgpIHsgcnVuVGFzayhpZCk7IH0pO1xuXG4gICAgICAgIHJldHVybiBpZDtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChwb3N0TWVzc2FnZVN1cHBvcnRlZCgpKSB7XG4gICAgICB2YXIgTVNHX1BSRUZJWCA9ICdtcy5yeC5zY2hlZHVsZScgKyBNYXRoLnJhbmRvbSgpO1xuXG4gICAgICB2YXIgb25HbG9iYWxQb3N0TWVzc2FnZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAvLyBPbmx5IGlmIHdlJ3JlIGEgbWF0Y2ggdG8gYXZvaWQgYW55IG90aGVyIGdsb2JhbCBldmVudHNcbiAgICAgICAgaWYgKHR5cGVvZiBldmVudC5kYXRhID09PSAnc3RyaW5nJyAmJiBldmVudC5kYXRhLnN1YnN0cmluZygwLCBNU0dfUFJFRklYLmxlbmd0aCkgPT09IE1TR19QUkVGSVgpIHtcbiAgICAgICAgICBydW5UYXNrKGV2ZW50LmRhdGEuc3Vic3RyaW5nKE1TR19QUkVGSVgubGVuZ3RoKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHJvb3QuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uR2xvYmFsUG9zdE1lc3NhZ2UsIGZhbHNlKTtcblxuICAgICAgc2NoZWR1bGVNZXRob2QgPSBmdW5jdGlvbiAoYWN0aW9uKSB7XG4gICAgICAgIHZhciBpZCA9IG5leHRIYW5kbGUrKztcbiAgICAgICAgdGFza3NCeUhhbmRsZVtpZF0gPSBhY3Rpb247XG4gICAgICAgIHJvb3QucG9zdE1lc3NhZ2UoTVNHX1BSRUZJWCArIGlkLCAnKicpO1xuICAgICAgICByZXR1cm4gaWQ7XG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoISFyb290Lk1lc3NhZ2VDaGFubmVsKSB7XG4gICAgICB2YXIgY2hhbm5lbCA9IG5ldyByb290Lk1lc3NhZ2VDaGFubmVsKCk7XG5cbiAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gZnVuY3Rpb24gKGUpIHsgcnVuVGFzayhlLmRhdGEpOyB9O1xuXG4gICAgICBzY2hlZHVsZU1ldGhvZCA9IGZ1bmN0aW9uIChhY3Rpb24pIHtcbiAgICAgICAgdmFyIGlkID0gbmV4dEhhbmRsZSsrO1xuICAgICAgICB0YXNrc0J5SGFuZGxlW2lkXSA9IGFjdGlvbjtcbiAgICAgICAgY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZShpZCk7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmICgnZG9jdW1lbnQnIGluIHJvb3QgJiYgJ29ucmVhZHlzdGF0ZWNoYW5nZScgaW4gcm9vdC5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKSkge1xuXG4gICAgICBzY2hlZHVsZU1ldGhvZCA9IGZ1bmN0aW9uIChhY3Rpb24pIHtcbiAgICAgICAgdmFyIHNjcmlwdEVsZW1lbnQgPSByb290LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgICB2YXIgaWQgPSBuZXh0SGFuZGxlKys7XG4gICAgICAgIHRhc2tzQnlIYW5kbGVbaWRdID0gYWN0aW9uO1xuXG4gICAgICAgIHNjcmlwdEVsZW1lbnQub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJ1blRhc2soaWQpO1xuICAgICAgICAgIHNjcmlwdEVsZW1lbnQub25yZWFkeXN0YXRlY2hhbmdlID0gbnVsbDtcbiAgICAgICAgICBzY3JpcHRFbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc2NyaXB0RWxlbWVudCk7XG4gICAgICAgICAgc2NyaXB0RWxlbWVudCA9IG51bGw7XG4gICAgICAgIH07XG4gICAgICAgIHJvb3QuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFwcGVuZENoaWxkKHNjcmlwdEVsZW1lbnQpO1xuICAgICAgICByZXR1cm4gaWQ7XG4gICAgICB9O1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHNjaGVkdWxlTWV0aG9kID0gZnVuY3Rpb24gKGFjdGlvbikge1xuICAgICAgICB2YXIgaWQgPSBuZXh0SGFuZGxlKys7XG4gICAgICAgIHRhc2tzQnlIYW5kbGVbaWRdID0gYWN0aW9uO1xuICAgICAgICBsb2NhbFNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJ1blRhc2soaWQpO1xuICAgICAgICB9LCAwKTtcblxuICAgICAgICByZXR1cm4gaWQ7XG4gICAgICB9O1xuICAgIH1cbiAgfSgpKTtcblxuICAvKipcbiAgICogR2V0cyBhIHNjaGVkdWxlciB0aGF0IHNjaGVkdWxlcyB3b3JrIHZpYSBhIHRpbWVkIGNhbGxiYWNrIGJhc2VkIHVwb24gcGxhdGZvcm0uXG4gICAqL1xuICAgdmFyIERlZmF1bHRTY2hlZHVsZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgICBpbmhlcml0cyhEZWZhdWx0U2NoZWR1bGVyLCBfX3N1cGVyX18pO1xuICAgICBmdW5jdGlvbiBEZWZhdWx0U2NoZWR1bGVyKCkge1xuICAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgICB9XG5cbiAgICAgZnVuY3Rpb24gc2NoZWR1bGVBY3Rpb24oZGlzcG9zYWJsZSwgYWN0aW9uLCBzY2hlZHVsZXIsIHN0YXRlKSB7XG4gICAgICAgcmV0dXJuIGZ1bmN0aW9uIHNjaGVkdWxlKCkge1xuICAgICAgICAgZGlzcG9zYWJsZS5zZXREaXNwb3NhYmxlKERpc3Bvc2FibGUuX2ZpeHVwKGFjdGlvbihzY2hlZHVsZXIsIHN0YXRlKSkpO1xuICAgICAgIH07XG4gICAgIH1cblxuICAgICBmdW5jdGlvbiBDbGVhckRpc3Bvc2FibGUoaWQpIHtcbiAgICAgICB0aGlzLl9pZCA9IGlkO1xuICAgICAgIHRoaXMuaXNEaXNwb3NlZCA9IGZhbHNlO1xuICAgICB9XG5cbiAgICAgQ2xlYXJEaXNwb3NhYmxlLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgIGlmICghdGhpcy5pc0Rpc3Bvc2VkKSB7XG4gICAgICAgICB0aGlzLmlzRGlzcG9zZWQgPSB0cnVlO1xuICAgICAgICAgY2xlYXJNZXRob2QodGhpcy5faWQpO1xuICAgICAgIH1cbiAgICAgfTtcblxuICAgICBmdW5jdGlvbiBMb2NhbENsZWFyRGlzcG9zYWJsZShpZCkge1xuICAgICAgIHRoaXMuX2lkID0gaWQ7XG4gICAgICAgdGhpcy5pc0Rpc3Bvc2VkID0gZmFsc2U7XG4gICAgIH1cblxuICAgICBMb2NhbENsZWFyRGlzcG9zYWJsZS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICBpZiAoIXRoaXMuaXNEaXNwb3NlZCkge1xuICAgICAgICAgdGhpcy5pc0Rpc3Bvc2VkID0gdHJ1ZTtcbiAgICAgICAgIGxvY2FsQ2xlYXJUaW1lb3V0KHRoaXMuX2lkKTtcbiAgICAgICB9XG4gICAgIH07XG5cbiAgICBEZWZhdWx0U2NoZWR1bGVyLnByb3RvdHlwZS5zY2hlZHVsZSA9IGZ1bmN0aW9uIChzdGF0ZSwgYWN0aW9uKSB7XG4gICAgICB2YXIgZGlzcG9zYWJsZSA9IG5ldyBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSgpLFxuICAgICAgICAgIGlkID0gc2NoZWR1bGVNZXRob2Qoc2NoZWR1bGVBY3Rpb24oZGlzcG9zYWJsZSwgYWN0aW9uLCB0aGlzLCBzdGF0ZSkpO1xuICAgICAgcmV0dXJuIG5ldyBCaW5hcnlEaXNwb3NhYmxlKGRpc3Bvc2FibGUsIG5ldyBDbGVhckRpc3Bvc2FibGUoaWQpKTtcbiAgICB9O1xuXG4gICAgRGVmYXVsdFNjaGVkdWxlci5wcm90b3R5cGUuX3NjaGVkdWxlRnV0dXJlID0gZnVuY3Rpb24gKHN0YXRlLCBkdWVUaW1lLCBhY3Rpb24pIHtcbiAgICAgIGlmIChkdWVUaW1lID09PSAwKSB7IHJldHVybiB0aGlzLnNjaGVkdWxlKHN0YXRlLCBhY3Rpb24pOyB9XG4gICAgICB2YXIgZGlzcG9zYWJsZSA9IG5ldyBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSgpLFxuICAgICAgICAgIGlkID0gbG9jYWxTZXRUaW1lb3V0KHNjaGVkdWxlQWN0aW9uKGRpc3Bvc2FibGUsIGFjdGlvbiwgdGhpcywgc3RhdGUpLCBkdWVUaW1lKTtcbiAgICAgIHJldHVybiBuZXcgQmluYXJ5RGlzcG9zYWJsZShkaXNwb3NhYmxlLCBuZXcgTG9jYWxDbGVhckRpc3Bvc2FibGUoaWQpKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gc2NoZWR1bGVMb25nUnVubmluZyhzdGF0ZSwgYWN0aW9uLCBkaXNwb3NhYmxlKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkgeyBhY3Rpb24oc3RhdGUsIGRpc3Bvc2FibGUpOyB9O1xuICAgIH1cblxuICAgIERlZmF1bHRTY2hlZHVsZXIucHJvdG90eXBlLnNjaGVkdWxlTG9uZ1J1bm5pbmcgPSBmdW5jdGlvbiAoc3RhdGUsIGFjdGlvbikge1xuICAgICAgdmFyIGRpc3Bvc2FibGUgPSBkaXNwb3NhYmxlQ3JlYXRlKG5vb3ApO1xuICAgICAgc2NoZWR1bGVNZXRob2Qoc2NoZWR1bGVMb25nUnVubmluZyhzdGF0ZSwgYWN0aW9uLCBkaXNwb3NhYmxlKSk7XG4gICAgICByZXR1cm4gZGlzcG9zYWJsZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIERlZmF1bHRTY2hlZHVsZXI7XG4gIH0oU2NoZWR1bGVyKSk7XG5cbiAgdmFyIGRlZmF1bHRTY2hlZHVsZXIgPSBTY2hlZHVsZXJbJ2RlZmF1bHQnXSA9IFNjaGVkdWxlci5hc3luYyA9IG5ldyBEZWZhdWx0U2NoZWR1bGVyKCk7XG5cbiAgdmFyIENhdGNoU2NoZWR1bGVyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhDYXRjaFNjaGVkdWxlciwgX19zdXBlcl9fKTtcblxuICAgIGZ1bmN0aW9uIENhdGNoU2NoZWR1bGVyKHNjaGVkdWxlciwgaGFuZGxlcikge1xuICAgICAgdGhpcy5fc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICAgICAgdGhpcy5faGFuZGxlciA9IGhhbmRsZXI7XG4gICAgICB0aGlzLl9yZWN1cnNpdmVPcmlnaW5hbCA9IG51bGw7XG4gICAgICB0aGlzLl9yZWN1cnNpdmVXcmFwcGVyID0gbnVsbDtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIENhdGNoU2NoZWR1bGVyLnByb3RvdHlwZS5zY2hlZHVsZSA9IGZ1bmN0aW9uIChzdGF0ZSwgYWN0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5fc2NoZWR1bGVyLnNjaGVkdWxlKHN0YXRlLCB0aGlzLl93cmFwKGFjdGlvbikpO1xuICAgIH07XG5cbiAgICBDYXRjaFNjaGVkdWxlci5wcm90b3R5cGUuX3NjaGVkdWxlRnV0dXJlID0gZnVuY3Rpb24gKHN0YXRlLCBkdWVUaW1lLCBhY3Rpb24pIHtcbiAgICAgIHJldHVybiB0aGlzLl9zY2hlZHVsZXIuc2NoZWR1bGUoc3RhdGUsIGR1ZVRpbWUsIHRoaXMuX3dyYXAoYWN0aW9uKSk7XG4gICAgfTtcblxuICAgIENhdGNoU2NoZWR1bGVyLnByb3RvdHlwZS5ub3cgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9zY2hlZHVsZXIubm93KCk7IH07XG5cbiAgICBDYXRjaFNjaGVkdWxlci5wcm90b3R5cGUuX2Nsb25lID0gZnVuY3Rpb24gKHNjaGVkdWxlcikge1xuICAgICAgICByZXR1cm4gbmV3IENhdGNoU2NoZWR1bGVyKHNjaGVkdWxlciwgdGhpcy5faGFuZGxlcik7XG4gICAgfTtcblxuICAgIENhdGNoU2NoZWR1bGVyLnByb3RvdHlwZS5fd3JhcCA9IGZ1bmN0aW9uIChhY3Rpb24pIHtcbiAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIChzZWxmLCBzdGF0ZSkge1xuICAgICAgICB2YXIgcmVzID0gdHJ5Q2F0Y2goYWN0aW9uKShwYXJlbnQuX2dldFJlY3Vyc2l2ZVdyYXBwZXIoc2VsZiksIHN0YXRlKTtcbiAgICAgICAgaWYgKHJlcyA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgICBpZiAoIXBhcmVudC5faGFuZGxlcihyZXMuZSkpIHsgdGhyb3dlcihyZXMuZSk7IH1cbiAgICAgICAgICByZXR1cm4gZGlzcG9zYWJsZUVtcHR5O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkaXNwb3NhYmxlRml4dXAocmVzKTtcbiAgICAgIH07XG4gICAgfTtcblxuICAgIENhdGNoU2NoZWR1bGVyLnByb3RvdHlwZS5fZ2V0UmVjdXJzaXZlV3JhcHBlciA9IGZ1bmN0aW9uIChzY2hlZHVsZXIpIHtcbiAgICAgIGlmICh0aGlzLl9yZWN1cnNpdmVPcmlnaW5hbCAhPT0gc2NoZWR1bGVyKSB7XG4gICAgICAgIHRoaXMuX3JlY3Vyc2l2ZU9yaWdpbmFsID0gc2NoZWR1bGVyO1xuICAgICAgICB2YXIgd3JhcHBlciA9IHRoaXMuX2Nsb25lKHNjaGVkdWxlcik7XG4gICAgICAgIHdyYXBwZXIuX3JlY3Vyc2l2ZU9yaWdpbmFsID0gc2NoZWR1bGVyO1xuICAgICAgICB3cmFwcGVyLl9yZWN1cnNpdmVXcmFwcGVyID0gd3JhcHBlcjtcbiAgICAgICAgdGhpcy5fcmVjdXJzaXZlV3JhcHBlciA9IHdyYXBwZXI7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fcmVjdXJzaXZlV3JhcHBlcjtcbiAgICB9O1xuXG4gICAgQ2F0Y2hTY2hlZHVsZXIucHJvdG90eXBlLnNjaGVkdWxlUGVyaW9kaWMgPSBmdW5jdGlvbiAoc3RhdGUsIHBlcmlvZCwgYWN0aW9uKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXMsIGZhaWxlZCA9IGZhbHNlLCBkID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG5cbiAgICAgIGQuc2V0RGlzcG9zYWJsZSh0aGlzLl9zY2hlZHVsZXIuc2NoZWR1bGVQZXJpb2RpYyhzdGF0ZSwgcGVyaW9kLCBmdW5jdGlvbiAoc3RhdGUxKSB7XG4gICAgICAgIGlmIChmYWlsZWQpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgdmFyIHJlcyA9IHRyeUNhdGNoKGFjdGlvbikoc3RhdGUxKTtcbiAgICAgICAgaWYgKHJlcyA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgICAgIGlmICghc2VsZi5faGFuZGxlcihyZXMuZSkpIHsgdGhyb3dlcihyZXMuZSk7IH1cbiAgICAgICAgICBkLmRpc3Bvc2UoKTtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgfSkpO1xuXG4gICAgICByZXR1cm4gZDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIENhdGNoU2NoZWR1bGVyO1xuICB9KFNjaGVkdWxlcikpO1xuXG4gIGZ1bmN0aW9uIEluZGV4ZWRJdGVtKGlkLCB2YWx1ZSkge1xuICAgIHRoaXMuaWQgPSBpZDtcbiAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gIH1cblxuICBJbmRleGVkSXRlbS5wcm90b3R5cGUuY29tcGFyZVRvID0gZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgdmFyIGMgPSB0aGlzLnZhbHVlLmNvbXBhcmVUbyhvdGhlci52YWx1ZSk7XG4gICAgYyA9PT0gMCAmJiAoYyA9IHRoaXMuaWQgLSBvdGhlci5pZCk7XG4gICAgcmV0dXJuIGM7XG4gIH07XG5cbiAgdmFyIFByaW9yaXR5UXVldWUgPSBSeC5pbnRlcm5hbHMuUHJpb3JpdHlRdWV1ZSA9IGZ1bmN0aW9uIChjYXBhY2l0eSkge1xuICAgIHRoaXMuaXRlbXMgPSBuZXcgQXJyYXkoY2FwYWNpdHkpO1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgfTtcblxuICB2YXIgcHJpb3JpdHlQcm90byA9IFByaW9yaXR5UXVldWUucHJvdG90eXBlO1xuICBwcmlvcml0eVByb3RvLmlzSGlnaGVyUHJpb3JpdHkgPSBmdW5jdGlvbiAobGVmdCwgcmlnaHQpIHtcbiAgICByZXR1cm4gdGhpcy5pdGVtc1tsZWZ0XS5jb21wYXJlVG8odGhpcy5pdGVtc1tyaWdodF0pIDwgMDtcbiAgfTtcblxuICBwcmlvcml0eVByb3RvLnBlcmNvbGF0ZSA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgIGlmIChpbmRleCA+PSB0aGlzLmxlbmd0aCB8fCBpbmRleCA8IDApIHsgcmV0dXJuOyB9XG4gICAgdmFyIHBhcmVudCA9IGluZGV4IC0gMSA+PiAxO1xuICAgIGlmIChwYXJlbnQgPCAwIHx8IHBhcmVudCA9PT0gaW5kZXgpIHsgcmV0dXJuOyB9XG4gICAgaWYgKHRoaXMuaXNIaWdoZXJQcmlvcml0eShpbmRleCwgcGFyZW50KSkge1xuICAgICAgdmFyIHRlbXAgPSB0aGlzLml0ZW1zW2luZGV4XTtcbiAgICAgIHRoaXMuaXRlbXNbaW5kZXhdID0gdGhpcy5pdGVtc1twYXJlbnRdO1xuICAgICAgdGhpcy5pdGVtc1twYXJlbnRdID0gdGVtcDtcbiAgICAgIHRoaXMucGVyY29sYXRlKHBhcmVudCk7XG4gICAgfVxuICB9O1xuXG4gIHByaW9yaXR5UHJvdG8uaGVhcGlmeSA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgICtpbmRleCB8fCAoaW5kZXggPSAwKTtcbiAgICBpZiAoaW5kZXggPj0gdGhpcy5sZW5ndGggfHwgaW5kZXggPCAwKSB7IHJldHVybjsgfVxuICAgIHZhciBsZWZ0ID0gMiAqIGluZGV4ICsgMSxcbiAgICAgICAgcmlnaHQgPSAyICogaW5kZXggKyAyLFxuICAgICAgICBmaXJzdCA9IGluZGV4O1xuICAgIGlmIChsZWZ0IDwgdGhpcy5sZW5ndGggJiYgdGhpcy5pc0hpZ2hlclByaW9yaXR5KGxlZnQsIGZpcnN0KSkge1xuICAgICAgZmlyc3QgPSBsZWZ0O1xuICAgIH1cbiAgICBpZiAocmlnaHQgPCB0aGlzLmxlbmd0aCAmJiB0aGlzLmlzSGlnaGVyUHJpb3JpdHkocmlnaHQsIGZpcnN0KSkge1xuICAgICAgZmlyc3QgPSByaWdodDtcbiAgICB9XG4gICAgaWYgKGZpcnN0ICE9PSBpbmRleCkge1xuICAgICAgdmFyIHRlbXAgPSB0aGlzLml0ZW1zW2luZGV4XTtcbiAgICAgIHRoaXMuaXRlbXNbaW5kZXhdID0gdGhpcy5pdGVtc1tmaXJzdF07XG4gICAgICB0aGlzLml0ZW1zW2ZpcnN0XSA9IHRlbXA7XG4gICAgICB0aGlzLmhlYXBpZnkoZmlyc3QpO1xuICAgIH1cbiAgfTtcblxuICBwcmlvcml0eVByb3RvLnBlZWsgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLml0ZW1zWzBdLnZhbHVlOyB9O1xuXG4gIHByaW9yaXR5UHJvdG8ucmVtb3ZlQXQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICB0aGlzLml0ZW1zW2luZGV4XSA9IHRoaXMuaXRlbXNbLS10aGlzLmxlbmd0aF07XG4gICAgdGhpcy5pdGVtc1t0aGlzLmxlbmd0aF0gPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5oZWFwaWZ5KCk7XG4gIH07XG5cbiAgcHJpb3JpdHlQcm90by5kZXF1ZXVlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXN1bHQgPSB0aGlzLnBlZWsoKTtcbiAgICB0aGlzLnJlbW92ZUF0KDApO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgcHJpb3JpdHlQcm90by5lbnF1ZXVlID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLmxlbmd0aCsrO1xuICAgIHRoaXMuaXRlbXNbaW5kZXhdID0gbmV3IEluZGV4ZWRJdGVtKFByaW9yaXR5UXVldWUuY291bnQrKywgaXRlbSk7XG4gICAgdGhpcy5wZXJjb2xhdGUoaW5kZXgpO1xuICB9O1xuXG4gIHByaW9yaXR5UHJvdG8ucmVtb3ZlID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLml0ZW1zW2ldLnZhbHVlID09PSBpdGVtKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlQXQoaSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG4gIFByaW9yaXR5UXVldWUuY291bnQgPSAwO1xuXG4gIC8qKlxuICAgKiAgUmVwcmVzZW50cyBhIG5vdGlmaWNhdGlvbiB0byBhbiBvYnNlcnZlci5cbiAgICovXG4gIHZhciBOb3RpZmljYXRpb24gPSBSeC5Ob3RpZmljYXRpb24gPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE5vdGlmaWNhdGlvbigpIHtcblxuICAgIH1cblxuICAgIE5vdGlmaWNhdGlvbi5wcm90b3R5cGUuX2FjY2VwdCA9IGZ1bmN0aW9uIChvbk5leHQsIG9uRXJyb3IsIG9uQ29tcGxldGVkKSB7XG4gICAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcigpO1xuICAgIH07XG5cbiAgICBOb3RpZmljYXRpb24ucHJvdG90eXBlLl9hY2NlcHRPYnNlcnZlciA9IGZ1bmN0aW9uIChvbk5leHQsIG9uRXJyb3IsIG9uQ29tcGxldGVkKSB7XG4gICAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcigpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbnZva2VzIHRoZSBkZWxlZ2F0ZSBjb3JyZXNwb25kaW5nIHRvIHRoZSBub3RpZmljYXRpb24gb3IgdGhlIG9ic2VydmVyJ3MgbWV0aG9kIGNvcnJlc3BvbmRpbmcgdG8gdGhlIG5vdGlmaWNhdGlvbiBhbmQgcmV0dXJucyB0aGUgcHJvZHVjZWQgcmVzdWx0LlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb24gfCBPYnNlcnZlcn0gb2JzZXJ2ZXJPck9uTmV4dCBGdW5jdGlvbiB0byBpbnZva2UgZm9yIGFuIE9uTmV4dCBub3RpZmljYXRpb24gb3IgT2JzZXJ2ZXIgdG8gaW52b2tlIHRoZSBub3RpZmljYXRpb24gb24uLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IG9uRXJyb3IgRnVuY3Rpb24gdG8gaW52b2tlIGZvciBhbiBPbkVycm9yIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvbkNvbXBsZXRlZCBGdW5jdGlvbiB0byBpbnZva2UgZm9yIGFuIE9uQ29tcGxldGVkIG5vdGlmaWNhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7QW55fSBSZXN1bHQgcHJvZHVjZWQgYnkgdGhlIG9ic2VydmF0aW9uLlxuICAgICAqL1xuICAgIE5vdGlmaWNhdGlvbi5wcm90b3R5cGUuYWNjZXB0ID0gZnVuY3Rpb24gKG9ic2VydmVyT3JPbk5leHQsIG9uRXJyb3IsIG9uQ29tcGxldGVkKSB7XG4gICAgICByZXR1cm4gb2JzZXJ2ZXJPck9uTmV4dCAmJiB0eXBlb2Ygb2JzZXJ2ZXJPck9uTmV4dCA9PT0gJ29iamVjdCcgP1xuICAgICAgICB0aGlzLl9hY2NlcHRPYnNlcnZlcihvYnNlcnZlck9yT25OZXh0KSA6XG4gICAgICAgIHRoaXMuX2FjY2VwdChvYnNlcnZlck9yT25OZXh0LCBvbkVycm9yLCBvbkNvbXBsZXRlZCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB3aXRoIGEgc2luZ2xlIG5vdGlmaWNhdGlvbi5cbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBOb3RpZmljYXRpb25zXG4gICAgICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXJdIFNjaGVkdWxlciB0byBzZW5kIG91dCB0aGUgbm90aWZpY2F0aW9uIGNhbGxzIG9uLlxuICAgICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBUaGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IHN1cmZhY2VzIHRoZSBiZWhhdmlvciBvZiB0aGUgbm90aWZpY2F0aW9uIHVwb24gc3Vic2NyaXB0aW9uLlxuICAgICAqL1xuICAgIE5vdGlmaWNhdGlvbi5wcm90b3R5cGUudG9PYnNlcnZhYmxlID0gZnVuY3Rpb24gKHNjaGVkdWxlcikge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgaXNTY2hlZHVsZXIoc2NoZWR1bGVyKSB8fCAoc2NoZWR1bGVyID0gaW1tZWRpYXRlU2NoZWR1bGVyKTtcbiAgICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbiAobykge1xuICAgICAgICByZXR1cm4gc2NoZWR1bGVyLnNjaGVkdWxlKHNlbGYsIGZ1bmN0aW9uIChfLCBub3RpZmljYXRpb24pIHtcbiAgICAgICAgICBub3RpZmljYXRpb24uX2FjY2VwdE9ic2VydmVyKG8pO1xuICAgICAgICAgIG5vdGlmaWNhdGlvbi5raW5kID09PSAnTicgJiYgby5vbkNvbXBsZXRlZCgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gTm90aWZpY2F0aW9uO1xuICB9KSgpO1xuXG4gIHZhciBPbk5leHROb3RpZmljYXRpb24gPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKE9uTmV4dE5vdGlmaWNhdGlvbiwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBPbk5leHROb3RpZmljYXRpb24odmFsdWUpIHtcbiAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgIHRoaXMua2luZCA9ICdOJztcbiAgICB9XG5cbiAgICBPbk5leHROb3RpZmljYXRpb24ucHJvdG90eXBlLl9hY2NlcHQgPSBmdW5jdGlvbiAob25OZXh0KSB7XG4gICAgICByZXR1cm4gb25OZXh0KHRoaXMudmFsdWUpO1xuICAgIH07XG5cbiAgICBPbk5leHROb3RpZmljYXRpb24ucHJvdG90eXBlLl9hY2NlcHRPYnNlcnZlciA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gby5vbk5leHQodGhpcy52YWx1ZSk7XG4gICAgfTtcblxuICAgIE9uTmV4dE5vdGlmaWNhdGlvbi5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gJ09uTmV4dCgnICsgdGhpcy52YWx1ZSArICcpJztcbiAgICB9O1xuXG4gICAgcmV0dXJuIE9uTmV4dE5vdGlmaWNhdGlvbjtcbiAgfShOb3RpZmljYXRpb24pKTtcblxuICB2YXIgT25FcnJvck5vdGlmaWNhdGlvbiA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoT25FcnJvck5vdGlmaWNhdGlvbiwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBPbkVycm9yTm90aWZpY2F0aW9uKGVycm9yKSB7XG4gICAgICB0aGlzLmVycm9yID0gZXJyb3I7XG4gICAgICB0aGlzLmtpbmQgPSAnRSc7XG4gICAgfVxuXG4gICAgT25FcnJvck5vdGlmaWNhdGlvbi5wcm90b3R5cGUuX2FjY2VwdCA9IGZ1bmN0aW9uIChvbk5leHQsIG9uRXJyb3IpIHtcbiAgICAgIHJldHVybiBvbkVycm9yKHRoaXMuZXJyb3IpO1xuICAgIH07XG5cbiAgICBPbkVycm9yTm90aWZpY2F0aW9uLnByb3RvdHlwZS5fYWNjZXB0T2JzZXJ2ZXIgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIG8ub25FcnJvcih0aGlzLmVycm9yKTtcbiAgICB9O1xuXG4gICAgT25FcnJvck5vdGlmaWNhdGlvbi5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gJ09uRXJyb3IoJyArIHRoaXMuZXJyb3IgKyAnKSc7XG4gICAgfTtcblxuICAgIHJldHVybiBPbkVycm9yTm90aWZpY2F0aW9uO1xuICB9KE5vdGlmaWNhdGlvbikpO1xuXG4gIHZhciBPbkNvbXBsZXRlZE5vdGlmaWNhdGlvbiA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoT25Db21wbGV0ZWROb3RpZmljYXRpb24sIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gT25Db21wbGV0ZWROb3RpZmljYXRpb24oKSB7XG4gICAgICB0aGlzLmtpbmQgPSAnQyc7XG4gICAgfVxuXG4gICAgT25Db21wbGV0ZWROb3RpZmljYXRpb24ucHJvdG90eXBlLl9hY2NlcHQgPSBmdW5jdGlvbiAob25OZXh0LCBvbkVycm9yLCBvbkNvbXBsZXRlZCkge1xuICAgICAgcmV0dXJuIG9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIE9uQ29tcGxldGVkTm90aWZpY2F0aW9uLnByb3RvdHlwZS5fYWNjZXB0T2JzZXJ2ZXIgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIG8ub25Db21wbGV0ZWQoKTtcbiAgICB9O1xuXG4gICAgT25Db21wbGV0ZWROb3RpZmljYXRpb24ucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuICdPbkNvbXBsZXRlZCgpJztcbiAgICB9O1xuXG4gICAgcmV0dXJuIE9uQ29tcGxldGVkTm90aWZpY2F0aW9uO1xuICB9KE5vdGlmaWNhdGlvbikpO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIG9iamVjdCB0aGF0IHJlcHJlc2VudHMgYW4gT25OZXh0IG5vdGlmaWNhdGlvbiB0byBhbiBvYnNlcnZlci5cbiAgICogQHBhcmFtIHtBbnl9IHZhbHVlIFRoZSB2YWx1ZSBjb250YWluZWQgaW4gdGhlIG5vdGlmaWNhdGlvbi5cbiAgICogQHJldHVybnMge05vdGlmaWNhdGlvbn0gVGhlIE9uTmV4dCBub3RpZmljYXRpb24gY29udGFpbmluZyB0aGUgdmFsdWUuXG4gICAqL1xuICB2YXIgbm90aWZpY2F0aW9uQ3JlYXRlT25OZXh0ID0gTm90aWZpY2F0aW9uLmNyZWF0ZU9uTmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiBuZXcgT25OZXh0Tm90aWZpY2F0aW9uKHZhbHVlKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBvYmplY3QgdGhhdCByZXByZXNlbnRzIGFuIE9uRXJyb3Igbm90aWZpY2F0aW9uIHRvIGFuIG9ic2VydmVyLlxuICAgKiBAcGFyYW0ge0FueX0gZXJyb3IgVGhlIGV4Y2VwdGlvbiBjb250YWluZWQgaW4gdGhlIG5vdGlmaWNhdGlvbi5cbiAgICogQHJldHVybnMge05vdGlmaWNhdGlvbn0gVGhlIE9uRXJyb3Igbm90aWZpY2F0aW9uIGNvbnRhaW5pbmcgdGhlIGV4Y2VwdGlvbi5cbiAgICovXG4gIHZhciBub3RpZmljYXRpb25DcmVhdGVPbkVycm9yID0gTm90aWZpY2F0aW9uLmNyZWF0ZU9uRXJyb3IgPSBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICByZXR1cm4gbmV3IE9uRXJyb3JOb3RpZmljYXRpb24oZXJyb3IpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIG9iamVjdCB0aGF0IHJlcHJlc2VudHMgYW4gT25Db21wbGV0ZWQgbm90aWZpY2F0aW9uIHRvIGFuIG9ic2VydmVyLlxuICAgKiBAcmV0dXJucyB7Tm90aWZpY2F0aW9ufSBUaGUgT25Db21wbGV0ZWQgbm90aWZpY2F0aW9uLlxuICAgKi9cbiAgdmFyIG5vdGlmaWNhdGlvbkNyZWF0ZU9uQ29tcGxldGVkID0gTm90aWZpY2F0aW9uLmNyZWF0ZU9uQ29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgT25Db21wbGV0ZWROb3RpZmljYXRpb24oKTtcbiAgfTtcblxuICAvKipcbiAgICogU3VwcG9ydHMgcHVzaC1zdHlsZSBpdGVyYXRpb24gb3ZlciBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgKi9cbiAgdmFyIE9ic2VydmVyID0gUnguT2JzZXJ2ZXIgPSBmdW5jdGlvbiAoKSB7IH07XG5cbiAgLyoqXG4gICAqICBDcmVhdGVzIGEgbm90aWZpY2F0aW9uIGNhbGxiYWNrIGZyb20gYW4gb2JzZXJ2ZXIuXG4gICAqIEByZXR1cm5zIFRoZSBhY3Rpb24gdGhhdCBmb3J3YXJkcyBpdHMgaW5wdXQgbm90aWZpY2F0aW9uIHRvIHRoZSB1bmRlcmx5aW5nIG9ic2VydmVyLlxuICAgKi9cbiAgT2JzZXJ2ZXIucHJvdG90eXBlLnRvTm90aWZpZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9ic2VydmVyID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24gKG4pIHsgcmV0dXJuIG4uYWNjZXB0KG9ic2VydmVyKTsgfTtcbiAgfTtcblxuICAvKipcbiAgICogIEhpZGVzIHRoZSBpZGVudGl0eSBvZiBhbiBvYnNlcnZlci5cbiAgICogQHJldHVybnMgQW4gb2JzZXJ2ZXIgdGhhdCBoaWRlcyB0aGUgaWRlbnRpdHkgb2YgdGhlIHNwZWNpZmllZCBvYnNlcnZlci5cbiAgICovXG4gIE9ic2VydmVyLnByb3RvdHlwZS5hc09ic2VydmVyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IEFub255bW91c09ic2VydmVyKFxuICAgICAgZnVuY3Rpb24gKHgpIHsgc2VsZi5vbk5leHQoeCk7IH0sXG4gICAgICBmdW5jdGlvbiAoZXJyKSB7IHNlbGYub25FcnJvcihlcnIpOyB9LFxuICAgICAgZnVuY3Rpb24gKCkgeyBzZWxmLm9uQ29tcGxldGVkKCk7IH0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiAgQ2hlY2tzIGFjY2VzcyB0byB0aGUgb2JzZXJ2ZXIgZm9yIGdyYW1tYXIgdmlvbGF0aW9ucy4gVGhpcyBpbmNsdWRlcyBjaGVja2luZyBmb3IgbXVsdGlwbGUgT25FcnJvciBvciBPbkNvbXBsZXRlZCBjYWxscywgYXMgd2VsbCBhcyByZWVudHJhbmN5IGluIGFueSBvZiB0aGUgb2JzZXJ2ZXIgbWV0aG9kcy5cbiAgICogIElmIGEgdmlvbGF0aW9uIGlzIGRldGVjdGVkLCBhbiBFcnJvciBpcyB0aHJvd24gZnJvbSB0aGUgb2ZmZW5kaW5nIG9ic2VydmVyIG1ldGhvZCBjYWxsLlxuICAgKiBAcmV0dXJucyBBbiBvYnNlcnZlciB0aGF0IGNoZWNrcyBjYWxsYmFja3MgaW52b2NhdGlvbnMgYWdhaW5zdCB0aGUgb2JzZXJ2ZXIgZ3JhbW1hciBhbmQsIGlmIHRoZSBjaGVja3MgcGFzcywgZm9yd2FyZHMgdGhvc2UgdG8gdGhlIHNwZWNpZmllZCBvYnNlcnZlci5cbiAgICovXG4gIE9ic2VydmVyLnByb3RvdHlwZS5jaGVja2VkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gbmV3IENoZWNrZWRPYnNlcnZlcih0aGlzKTsgfTtcblxuICAvKipcbiAgICogIENyZWF0ZXMgYW4gb2JzZXJ2ZXIgZnJvbSB0aGUgc3BlY2lmaWVkIE9uTmV4dCwgYWxvbmcgd2l0aCBvcHRpb25hbCBPbkVycm9yLCBhbmQgT25Db21wbGV0ZWQgYWN0aW9ucy5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW29uTmV4dF0gT2JzZXJ2ZXIncyBPbk5leHQgYWN0aW9uIGltcGxlbWVudGF0aW9uLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbb25FcnJvcl0gT2JzZXJ2ZXIncyBPbkVycm9yIGFjdGlvbiBpbXBsZW1lbnRhdGlvbi5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW29uQ29tcGxldGVkXSBPYnNlcnZlcidzIE9uQ29tcGxldGVkIGFjdGlvbiBpbXBsZW1lbnRhdGlvbi5cbiAgICogQHJldHVybnMge09ic2VydmVyfSBUaGUgb2JzZXJ2ZXIgb2JqZWN0IGltcGxlbWVudGVkIHVzaW5nIHRoZSBnaXZlbiBhY3Rpb25zLlxuICAgKi9cbiAgdmFyIG9ic2VydmVyQ3JlYXRlID0gT2JzZXJ2ZXIuY3JlYXRlID0gZnVuY3Rpb24gKG9uTmV4dCwgb25FcnJvciwgb25Db21wbGV0ZWQpIHtcbiAgICBvbk5leHQgfHwgKG9uTmV4dCA9IG5vb3ApO1xuICAgIG9uRXJyb3IgfHwgKG9uRXJyb3IgPSBkZWZhdWx0RXJyb3IpO1xuICAgIG9uQ29tcGxldGVkIHx8IChvbkNvbXBsZXRlZCA9IG5vb3ApO1xuICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2ZXIob25OZXh0LCBvbkVycm9yLCBvbkNvbXBsZXRlZCk7XG4gIH07XG5cbiAgLyoqXG4gICAqICBDcmVhdGVzIGFuIG9ic2VydmVyIGZyb20gYSBub3RpZmljYXRpb24gY2FsbGJhY2suXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGhhbmRsZXIgQWN0aW9uIHRoYXQgaGFuZGxlcyBhIG5vdGlmaWNhdGlvbi5cbiAgICogQHJldHVybnMgVGhlIG9ic2VydmVyIG9iamVjdCB0aGF0IGludm9rZXMgdGhlIHNwZWNpZmllZCBoYW5kbGVyIHVzaW5nIGEgbm90aWZpY2F0aW9uIGNvcnJlc3BvbmRpbmcgdG8gZWFjaCBtZXNzYWdlIGl0IHJlY2VpdmVzLlxuICAgKi9cbiAgT2JzZXJ2ZXIuZnJvbU5vdGlmaWVyID0gZnVuY3Rpb24gKGhhbmRsZXIsIHRoaXNBcmcpIHtcbiAgICB2YXIgY2IgPSBiaW5kQ2FsbGJhY2soaGFuZGxlciwgdGhpc0FyZywgMSk7XG4gICAgcmV0dXJuIG5ldyBBbm9ueW1vdXNPYnNlcnZlcihmdW5jdGlvbiAoeCkge1xuICAgICAgcmV0dXJuIGNiKG5vdGlmaWNhdGlvbkNyZWF0ZU9uTmV4dCh4KSk7XG4gICAgfSwgZnVuY3Rpb24gKGUpIHtcbiAgICAgIHJldHVybiBjYihub3RpZmljYXRpb25DcmVhdGVPbkVycm9yKGUpKTtcbiAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gY2Iobm90aWZpY2F0aW9uQ3JlYXRlT25Db21wbGV0ZWQoKSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNjaGVkdWxlcyB0aGUgaW52b2NhdGlvbiBvZiBvYnNlcnZlciBtZXRob2RzIG9uIHRoZSBnaXZlbiBzY2hlZHVsZXIuXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBzY2hlZHVsZXIgU2NoZWR1bGVyIHRvIHNjaGVkdWxlIG9ic2VydmVyIG1lc3NhZ2VzIG9uLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2ZXJ9IE9ic2VydmVyIHdob3NlIG1lc3NhZ2VzIGFyZSBzY2hlZHVsZWQgb24gdGhlIGdpdmVuIHNjaGVkdWxlci5cbiAgICovXG4gIE9ic2VydmVyLnByb3RvdHlwZS5ub3RpZnlPbiA9IGZ1bmN0aW9uIChzY2hlZHVsZXIpIHtcbiAgICByZXR1cm4gbmV3IE9ic2VydmVPbk9ic2VydmVyKHNjaGVkdWxlciwgdGhpcyk7XG4gIH07XG5cbiAgT2JzZXJ2ZXIucHJvdG90eXBlLm1ha2VTYWZlID0gZnVuY3Rpb24oZGlzcG9zYWJsZSkge1xuICAgIHJldHVybiBuZXcgQW5vbnltb3VzU2FmZU9ic2VydmVyKHRoaXMuX29uTmV4dCwgdGhpcy5fb25FcnJvciwgdGhpcy5fb25Db21wbGV0ZWQsIGRpc3Bvc2FibGUpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBYnN0cmFjdCBiYXNlIGNsYXNzIGZvciBpbXBsZW1lbnRhdGlvbnMgb2YgdGhlIE9ic2VydmVyIGNsYXNzLlxuICAgKiBUaGlzIGJhc2UgY2xhc3MgZW5mb3JjZXMgdGhlIGdyYW1tYXIgb2Ygb2JzZXJ2ZXJzIHdoZXJlIE9uRXJyb3IgYW5kIE9uQ29tcGxldGVkIGFyZSB0ZXJtaW5hbCBtZXNzYWdlcy5cbiAgICovXG4gIHZhciBBYnN0cmFjdE9ic2VydmVyID0gUnguaW50ZXJuYWxzLkFic3RyYWN0T2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEFic3RyYWN0T2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IG9ic2VydmVyIGluIGEgbm9uLXN0b3BwZWQgc3RhdGUuXG4gICAgICovXG4gICAgZnVuY3Rpb24gQWJzdHJhY3RPYnNlcnZlcigpIHtcbiAgICAgIHRoaXMuaXNTdG9wcGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gTXVzdCBiZSBpbXBsZW1lbnRlZCBieSBvdGhlciBvYnNlcnZlcnNcbiAgICBBYnN0cmFjdE9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gbm90SW1wbGVtZW50ZWQ7XG4gICAgQWJzdHJhY3RPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBub3RJbXBsZW1lbnRlZDtcbiAgICBBYnN0cmFjdE9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBub3RJbXBsZW1lbnRlZDtcblxuICAgIC8qKlxuICAgICAqIE5vdGlmaWVzIHRoZSBvYnNlcnZlciBvZiBhIG5ldyBlbGVtZW50IGluIHRoZSBzZXF1ZW5jZS5cbiAgICAgKiBAcGFyYW0ge0FueX0gdmFsdWUgTmV4dCBlbGVtZW50IGluIHRoZSBzZXF1ZW5jZS5cbiAgICAgKi9cbiAgICBBYnN0cmFjdE9ic2VydmVyLnByb3RvdHlwZS5vbk5leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICF0aGlzLmlzU3RvcHBlZCAmJiB0aGlzLm5leHQodmFsdWUpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBOb3RpZmllcyB0aGUgb2JzZXJ2ZXIgdGhhdCBhbiBleGNlcHRpb24gaGFzIG9jY3VycmVkLlxuICAgICAqIEBwYXJhbSB7QW55fSBlcnJvciBUaGUgZXJyb3IgdGhhdCBoYXMgb2NjdXJyZWQuXG4gICAgICovXG4gICAgQWJzdHJhY3RPYnNlcnZlci5wcm90b3R5cGUub25FcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgaWYgKCF0aGlzLmlzU3RvcHBlZCkge1xuICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuZXJyb3IoZXJyb3IpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBOb3RpZmllcyB0aGUgb2JzZXJ2ZXIgb2YgdGhlIGVuZCBvZiB0aGUgc2VxdWVuY2UuXG4gICAgICovXG4gICAgQWJzdHJhY3RPYnNlcnZlci5wcm90b3R5cGUub25Db21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoIXRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgIHRoaXMuaXNTdG9wcGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5jb21wbGV0ZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRGlzcG9zZXMgdGhlIG9ic2VydmVyLCBjYXVzaW5nIGl0IHRvIHRyYW5zaXRpb24gdG8gdGhlIHN0b3BwZWQgc3RhdGUuXG4gICAgICovXG4gICAgQWJzdHJhY3RPYnNlcnZlci5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHsgdGhpcy5pc1N0b3BwZWQgPSB0cnVlOyB9O1xuXG4gICAgQWJzdHJhY3RPYnNlcnZlci5wcm90b3R5cGUuZmFpbCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICBpZiAoIXRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgIHRoaXMuaXNTdG9wcGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5lcnJvcihlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEFic3RyYWN0T2JzZXJ2ZXI7XG4gIH0oT2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogQ2xhc3MgdG8gY3JlYXRlIGFuIE9ic2VydmVyIGluc3RhbmNlIGZyb20gZGVsZWdhdGUtYmFzZWQgaW1wbGVtZW50YXRpb25zIG9mIHRoZSBvbiogbWV0aG9kcy5cbiAgICovXG4gIHZhciBBbm9ueW1vdXNPYnNlcnZlciA9IFJ4LkFub255bW91c09ic2VydmVyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhBbm9ueW1vdXNPYnNlcnZlciwgX19zdXBlcl9fKTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gb2JzZXJ2ZXIgZnJvbSB0aGUgc3BlY2lmaWVkIE9uTmV4dCwgT25FcnJvciwgYW5kIE9uQ29tcGxldGVkIGFjdGlvbnMuXG4gICAgICogQHBhcmFtIHtBbnl9IG9uTmV4dCBPYnNlcnZlcidzIE9uTmV4dCBhY3Rpb24gaW1wbGVtZW50YXRpb24uXG4gICAgICogQHBhcmFtIHtBbnl9IG9uRXJyb3IgT2JzZXJ2ZXIncyBPbkVycm9yIGFjdGlvbiBpbXBsZW1lbnRhdGlvbi5cbiAgICAgKiBAcGFyYW0ge0FueX0gb25Db21wbGV0ZWQgT2JzZXJ2ZXIncyBPbkNvbXBsZXRlZCBhY3Rpb24gaW1wbGVtZW50YXRpb24uXG4gICAgICovXG4gICAgZnVuY3Rpb24gQW5vbnltb3VzT2JzZXJ2ZXIob25OZXh0LCBvbkVycm9yLCBvbkNvbXBsZXRlZCkge1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgICB0aGlzLl9vbk5leHQgPSBvbk5leHQ7XG4gICAgICB0aGlzLl9vbkVycm9yID0gb25FcnJvcjtcbiAgICAgIHRoaXMuX29uQ29tcGxldGVkID0gb25Db21wbGV0ZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbHMgdGhlIG9uTmV4dCBhY3Rpb24uXG4gICAgICogQHBhcmFtIHtBbnl9IHZhbHVlIE5leHQgZWxlbWVudCBpbiB0aGUgc2VxdWVuY2UuXG4gICAgICovXG4gICAgQW5vbnltb3VzT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHRoaXMuX29uTmV4dCh2YWx1ZSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENhbGxzIHRoZSBvbkVycm9yIGFjdGlvbi5cbiAgICAgKiBAcGFyYW0ge0FueX0gZXJyb3IgVGhlIGVycm9yIHRoYXQgaGFzIG9jY3VycmVkLlxuICAgICAqL1xuICAgIEFub255bW91c09ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnJvcik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqICBDYWxscyB0aGUgb25Db21wbGV0ZWQgYWN0aW9uLlxuICAgICAqL1xuICAgIEFub255bW91c09ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLl9vbkNvbXBsZXRlZCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gQW5vbnltb3VzT2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIHZhciBDaGVja2VkT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKENoZWNrZWRPYnNlcnZlciwgX19zdXBlcl9fKTtcblxuICAgIGZ1bmN0aW9uIENoZWNrZWRPYnNlcnZlcihvYnNlcnZlcikge1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgICB0aGlzLl9vYnNlcnZlciA9IG9ic2VydmVyO1xuICAgICAgdGhpcy5fc3RhdGUgPSAwOyAvLyAwIC0gaWRsZSwgMSAtIGJ1c3ksIDIgLSBkb25lXG4gICAgfVxuXG4gICAgdmFyIENoZWNrZWRPYnNlcnZlclByb3RvdHlwZSA9IENoZWNrZWRPYnNlcnZlci5wcm90b3R5cGU7XG5cbiAgICBDaGVja2VkT2JzZXJ2ZXJQcm90b3R5cGUub25OZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB0aGlzLmNoZWNrQWNjZXNzKCk7XG4gICAgICB2YXIgcmVzID0gdHJ5Q2F0Y2godGhpcy5fb2JzZXJ2ZXIub25OZXh0KS5jYWxsKHRoaXMuX29ic2VydmVyLCB2YWx1ZSk7XG4gICAgICB0aGlzLl9zdGF0ZSA9IDA7XG4gICAgICByZXMgPT09IGVycm9yT2JqICYmIHRocm93ZXIocmVzLmUpO1xuICAgIH07XG5cbiAgICBDaGVja2VkT2JzZXJ2ZXJQcm90b3R5cGUub25FcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgIHRoaXMuY2hlY2tBY2Nlc3MoKTtcbiAgICAgIHZhciByZXMgPSB0cnlDYXRjaCh0aGlzLl9vYnNlcnZlci5vbkVycm9yKS5jYWxsKHRoaXMuX29ic2VydmVyLCBlcnIpO1xuICAgICAgdGhpcy5fc3RhdGUgPSAyO1xuICAgICAgcmVzID09PSBlcnJvck9iaiAmJiB0aHJvd2VyKHJlcy5lKTtcbiAgICB9O1xuXG4gICAgQ2hlY2tlZE9ic2VydmVyUHJvdG90eXBlLm9uQ29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5jaGVja0FjY2VzcygpO1xuICAgICAgdmFyIHJlcyA9IHRyeUNhdGNoKHRoaXMuX29ic2VydmVyLm9uQ29tcGxldGVkKS5jYWxsKHRoaXMuX29ic2VydmVyKTtcbiAgICAgIHRoaXMuX3N0YXRlID0gMjtcbiAgICAgIHJlcyA9PT0gZXJyb3JPYmogJiYgdGhyb3dlcihyZXMuZSk7XG4gICAgfTtcblxuICAgIENoZWNrZWRPYnNlcnZlclByb3RvdHlwZS5jaGVja0FjY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICh0aGlzLl9zdGF0ZSA9PT0gMSkgeyB0aHJvdyBuZXcgRXJyb3IoJ1JlLWVudHJhbmN5IGRldGVjdGVkJyk7IH1cbiAgICAgIGlmICh0aGlzLl9zdGF0ZSA9PT0gMikgeyB0aHJvdyBuZXcgRXJyb3IoJ09ic2VydmVyIGNvbXBsZXRlZCcpOyB9XG4gICAgICBpZiAodGhpcy5fc3RhdGUgPT09IDApIHsgdGhpcy5fc3RhdGUgPSAxOyB9XG4gICAgfTtcblxuICAgIHJldHVybiBDaGVja2VkT2JzZXJ2ZXI7XG4gIH0oT2JzZXJ2ZXIpKTtcblxuICB2YXIgU2NoZWR1bGVkT2JzZXJ2ZXIgPSBSeC5pbnRlcm5hbHMuU2NoZWR1bGVkT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFNjaGVkdWxlZE9ic2VydmVyLCBfX3N1cGVyX18pO1xuXG4gICAgZnVuY3Rpb24gU2NoZWR1bGVkT2JzZXJ2ZXIoc2NoZWR1bGVyLCBvYnNlcnZlcikge1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgICB0aGlzLnNjaGVkdWxlciA9IHNjaGVkdWxlcjtcbiAgICAgIHRoaXMub2JzZXJ2ZXIgPSBvYnNlcnZlcjtcbiAgICAgIHRoaXMuaXNBY3F1aXJlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5oYXNGYXVsdGVkID0gZmFsc2U7XG4gICAgICB0aGlzLnF1ZXVlID0gW107XG4gICAgICB0aGlzLmRpc3Bvc2FibGUgPSBuZXcgU2VyaWFsRGlzcG9zYWJsZSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVucXVldWVOZXh0KG9ic2VydmVyLCB4KSB7IHJldHVybiBmdW5jdGlvbiAoKSB7IG9ic2VydmVyLm9uTmV4dCh4KTsgfTsgfVxuICAgIGZ1bmN0aW9uIGVucXVldWVFcnJvcihvYnNlcnZlciwgZSkgeyByZXR1cm4gZnVuY3Rpb24gKCkgeyBvYnNlcnZlci5vbkVycm9yKGUpOyB9OyB9XG4gICAgZnVuY3Rpb24gZW5xdWV1ZUNvbXBsZXRlZChvYnNlcnZlcikgeyByZXR1cm4gZnVuY3Rpb24gKCkgeyBvYnNlcnZlci5vbkNvbXBsZXRlZCgpOyB9OyB9XG5cbiAgICBTY2hlZHVsZWRPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICB0aGlzLnF1ZXVlLnB1c2goZW5xdWV1ZU5leHQodGhpcy5vYnNlcnZlciwgeCkpO1xuICAgIH07XG5cbiAgICBTY2hlZHVsZWRPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgdGhpcy5xdWV1ZS5wdXNoKGVucXVldWVFcnJvcih0aGlzLm9ic2VydmVyLCBlKSk7XG4gICAgfTtcblxuICAgIFNjaGVkdWxlZE9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnF1ZXVlLnB1c2goZW5xdWV1ZUNvbXBsZXRlZCh0aGlzLm9ic2VydmVyKSk7XG4gICAgfTtcblxuXG4gICAgZnVuY3Rpb24gc2NoZWR1bGVNZXRob2Qoc3RhdGUsIHJlY3Vyc2UpIHtcbiAgICAgIHZhciB3b3JrO1xuICAgICAgaWYgKHN0YXRlLnF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgd29yayA9IHN0YXRlLnF1ZXVlLnNoaWZ0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS5pc0FjcXVpcmVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciByZXMgPSB0cnlDYXRjaCh3b3JrKSgpO1xuICAgICAgaWYgKHJlcyA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgc3RhdGUucXVldWUgPSBbXTtcbiAgICAgICAgc3RhdGUuaGFzRmF1bHRlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiB0aHJvd2VyKHJlcy5lKTtcbiAgICAgIH1cbiAgICAgIHJlY3Vyc2Uoc3RhdGUpO1xuICAgIH1cblxuICAgIFNjaGVkdWxlZE9ic2VydmVyLnByb3RvdHlwZS5lbnN1cmVBY3RpdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgaXNPd25lciA9IGZhbHNlO1xuICAgICAgaWYgKCF0aGlzLmhhc0ZhdWx0ZWQgJiYgdGhpcy5xdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGlzT3duZXIgPSAhdGhpcy5pc0FjcXVpcmVkO1xuICAgICAgICB0aGlzLmlzQWNxdWlyZWQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaXNPd25lciAmJlxuICAgICAgICB0aGlzLmRpc3Bvc2FibGUuc2V0RGlzcG9zYWJsZSh0aGlzLnNjaGVkdWxlci5zY2hlZHVsZVJlY3Vyc2l2ZSh0aGlzLCBzY2hlZHVsZU1ldGhvZCkpO1xuICAgIH07XG5cbiAgICBTY2hlZHVsZWRPYnNlcnZlci5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIF9fc3VwZXJfXy5wcm90b3R5cGUuZGlzcG9zZS5jYWxsKHRoaXMpO1xuICAgICAgdGhpcy5kaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFNjaGVkdWxlZE9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICB2YXIgT2JzZXJ2ZU9uT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKE9ic2VydmVPbk9ic2VydmVyLCBfX3N1cGVyX18pO1xuXG4gICAgZnVuY3Rpb24gT2JzZXJ2ZU9uT2JzZXJ2ZXIoc2NoZWR1bGVyLCBvYnNlcnZlciwgY2FuY2VsKSB7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzLCBzY2hlZHVsZXIsIG9ic2VydmVyKTtcbiAgICAgIHRoaXMuX2NhbmNlbCA9IGNhbmNlbDtcbiAgICB9XG5cbiAgICBPYnNlcnZlT25PYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgX19zdXBlcl9fLnByb3RvdHlwZS5uZXh0LmNhbGwodGhpcywgdmFsdWUpO1xuICAgICAgdGhpcy5lbnN1cmVBY3RpdmUoKTtcbiAgICB9O1xuXG4gICAgT2JzZXJ2ZU9uT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIF9fc3VwZXJfXy5wcm90b3R5cGUuZXJyb3IuY2FsbCh0aGlzLCBlKTtcbiAgICAgIHRoaXMuZW5zdXJlQWN0aXZlKCk7XG4gICAgfTtcblxuICAgIE9ic2VydmVPbk9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBfX3N1cGVyX18ucHJvdG90eXBlLmNvbXBsZXRlZC5jYWxsKHRoaXMpO1xuICAgICAgdGhpcy5lbnN1cmVBY3RpdmUoKTtcbiAgICB9O1xuXG4gICAgT2JzZXJ2ZU9uT2JzZXJ2ZXIucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBfX3N1cGVyX18ucHJvdG90eXBlLmRpc3Bvc2UuY2FsbCh0aGlzKTtcbiAgICAgIHRoaXMuX2NhbmNlbCAmJiB0aGlzLl9jYW5jZWwuZGlzcG9zZSgpO1xuICAgICAgdGhpcy5fY2FuY2VsID0gbnVsbDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIE9ic2VydmVPbk9ic2VydmVyO1xuICB9KShTY2hlZHVsZWRPYnNlcnZlcik7XG5cbiAgdmFyIG9ic2VydmFibGVQcm90bztcblxuICAvKipcbiAgICogUmVwcmVzZW50cyBhIHB1c2gtc3R5bGUgY29sbGVjdGlvbi5cbiAgICovXG4gIHZhciBPYnNlcnZhYmxlID0gUnguT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBtYWtlU3Vic2NyaWJlKHNlbGYsIHN1YnNjcmliZSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHZhciBvbGRPbkVycm9yID0gby5vbkVycm9yO1xuICAgICAgICBvLm9uRXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIG1ha2VTdGFja1RyYWNlTG9uZyhlLCBzZWxmKTtcbiAgICAgICAgICBvbGRPbkVycm9yLmNhbGwobywgZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHN1YnNjcmliZS5jYWxsKHNlbGYsIG8pO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBPYnNlcnZhYmxlKCkge1xuICAgICAgaWYgKFJ4LmNvbmZpZy5sb25nU3RhY2tTdXBwb3J0ICYmIGhhc1N0YWNrcykge1xuICAgICAgICB2YXIgb2xkU3Vic2NyaWJlID0gdGhpcy5fc3Vic2NyaWJlO1xuICAgICAgICB2YXIgZSA9IHRyeUNhdGNoKHRocm93ZXIpKG5ldyBFcnJvcigpKS5lO1xuICAgICAgICB0aGlzLnN0YWNrID0gZS5zdGFjay5zdWJzdHJpbmcoZS5zdGFjay5pbmRleE9mKCdcXG4nKSArIDEpO1xuICAgICAgICB0aGlzLl9zdWJzY3JpYmUgPSBtYWtlU3Vic2NyaWJlKHRoaXMsIG9sZFN1YnNjcmliZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgb2JzZXJ2YWJsZVByb3RvID0gT2JzZXJ2YWJsZS5wcm90b3R5cGU7XG5cbiAgICAvKipcbiAgICAqIERldGVybWluZXMgd2hldGhlciB0aGUgZ2l2ZW4gb2JqZWN0IGlzIGFuIE9ic2VydmFibGVcbiAgICAqIEBwYXJhbSB7QW55fSBBbiBvYmplY3QgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgaXQgaXMgYW4gT2JzZXJ2YWJsZVxuICAgICogQHJldHVybnMge0Jvb2xlYW59IHRydWUgaWYgYW4gT2JzZXJ2YWJsZSwgZWxzZSBmYWxzZS5cbiAgICAqL1xuICAgIE9ic2VydmFibGUuaXNPYnNlcnZhYmxlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiBvICYmIGlzRnVuY3Rpb24oby5zdWJzY3JpYmUpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiAgU3Vic2NyaWJlcyBhbiBvIHRvIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgICAqICBAcGFyYW0ge01peGVkfSBbb09yT25OZXh0XSBUaGUgb2JqZWN0IHRoYXQgaXMgdG8gcmVjZWl2ZSBub3RpZmljYXRpb25zIG9yIGFuIGFjdGlvbiB0byBpbnZva2UgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgICAgKiAgQHBhcmFtIHtGdW5jdGlvbn0gW29uRXJyb3JdIEFjdGlvbiB0byBpbnZva2UgdXBvbiBleGNlcHRpb25hbCB0ZXJtaW5hdGlvbiBvZiB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgICAgKiAgQHBhcmFtIHtGdW5jdGlvbn0gW29uQ29tcGxldGVkXSBBY3Rpb24gdG8gaW52b2tlIHVwb24gZ3JhY2VmdWwgdGVybWluYXRpb24gb2YgdGhlIG9ic2VydmFibGUgc2VxdWVuY2UuXG4gICAgICogIEByZXR1cm5zIHtEaXBvc2FibGV9IEEgZGlzcG9zYWJsZSBoYW5kbGluZyB0aGUgc3Vic2NyaXB0aW9ucyBhbmQgdW5zdWJzY3JpcHRpb25zLlxuICAgICAqL1xuICAgIG9ic2VydmFibGVQcm90by5zdWJzY3JpYmUgPSBvYnNlcnZhYmxlUHJvdG8uZm9yRWFjaCA9IGZ1bmN0aW9uIChvT3JPbk5leHQsIG9uRXJyb3IsIG9uQ29tcGxldGVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5fc3Vic2NyaWJlKHR5cGVvZiBvT3JPbk5leHQgPT09ICdvYmplY3QnID9cbiAgICAgICAgb09yT25OZXh0IDpcbiAgICAgICAgb2JzZXJ2ZXJDcmVhdGUob09yT25OZXh0LCBvbkVycm9yLCBvbkNvbXBsZXRlZCkpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmVzIHRvIHRoZSBuZXh0IHZhbHVlIGluIHRoZSBzZXF1ZW5jZSB3aXRoIGFuIG9wdGlvbmFsIFwidGhpc1wiIGFyZ3VtZW50LlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IG9uTmV4dCBUaGUgZnVuY3Rpb24gdG8gaW52b2tlIG9uIGVhY2ggZWxlbWVudCBpbiB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgICAgKiBAcGFyYW0ge0FueX0gW3RoaXNBcmddIE9iamVjdCB0byB1c2UgYXMgdGhpcyB3aGVuIGV4ZWN1dGluZyBjYWxsYmFjay5cbiAgICAgKiBAcmV0dXJucyB7RGlzcG9zYWJsZX0gQSBkaXNwb3NhYmxlIGhhbmRsaW5nIHRoZSBzdWJzY3JpcHRpb25zIGFuZCB1bnN1YnNjcmlwdGlvbnMuXG4gICAgICovXG4gICAgb2JzZXJ2YWJsZVByb3RvLnN1YnNjcmliZU9uTmV4dCA9IGZ1bmN0aW9uIChvbk5leHQsIHRoaXNBcmcpIHtcbiAgICAgIHJldHVybiB0aGlzLl9zdWJzY3JpYmUob2JzZXJ2ZXJDcmVhdGUodHlwZW9mIHRoaXNBcmcgIT09ICd1bmRlZmluZWQnID8gZnVuY3Rpb24oeCkgeyBvbk5leHQuY2FsbCh0aGlzQXJnLCB4KTsgfSA6IG9uTmV4dCkpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmVzIHRvIGFuIGV4Y2VwdGlvbmFsIGNvbmRpdGlvbiBpbiB0aGUgc2VxdWVuY2Ugd2l0aCBhbiBvcHRpb25hbCBcInRoaXNcIiBhcmd1bWVudC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvbkVycm9yIFRoZSBmdW5jdGlvbiB0byBpbnZva2UgdXBvbiBleGNlcHRpb25hbCB0ZXJtaW5hdGlvbiBvZiB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgICAgKiBAcGFyYW0ge0FueX0gW3RoaXNBcmddIE9iamVjdCB0byB1c2UgYXMgdGhpcyB3aGVuIGV4ZWN1dGluZyBjYWxsYmFjay5cbiAgICAgKiBAcmV0dXJucyB7RGlzcG9zYWJsZX0gQSBkaXNwb3NhYmxlIGhhbmRsaW5nIHRoZSBzdWJzY3JpcHRpb25zIGFuZCB1bnN1YnNjcmlwdGlvbnMuXG4gICAgICovXG4gICAgb2JzZXJ2YWJsZVByb3RvLnN1YnNjcmliZU9uRXJyb3IgPSBmdW5jdGlvbiAob25FcnJvciwgdGhpc0FyZykge1xuICAgICAgcmV0dXJuIHRoaXMuX3N1YnNjcmliZShvYnNlcnZlckNyZWF0ZShudWxsLCB0eXBlb2YgdGhpc0FyZyAhPT0gJ3VuZGVmaW5lZCcgPyBmdW5jdGlvbihlKSB7IG9uRXJyb3IuY2FsbCh0aGlzQXJnLCBlKTsgfSA6IG9uRXJyb3IpKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlcyB0byB0aGUgbmV4dCB2YWx1ZSBpbiB0aGUgc2VxdWVuY2Ugd2l0aCBhbiBvcHRpb25hbCBcInRoaXNcIiBhcmd1bWVudC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvbkNvbXBsZXRlZCBUaGUgZnVuY3Rpb24gdG8gaW52b2tlIHVwb24gZ3JhY2VmdWwgdGVybWluYXRpb24gb2YgdGhlIG9ic2VydmFibGUgc2VxdWVuY2UuXG4gICAgICogQHBhcmFtIHtBbnl9IFt0aGlzQXJnXSBPYmplY3QgdG8gdXNlIGFzIHRoaXMgd2hlbiBleGVjdXRpbmcgY2FsbGJhY2suXG4gICAgICogQHJldHVybnMge0Rpc3Bvc2FibGV9IEEgZGlzcG9zYWJsZSBoYW5kbGluZyB0aGUgc3Vic2NyaXB0aW9ucyBhbmQgdW5zdWJzY3JpcHRpb25zLlxuICAgICAqL1xuICAgIG9ic2VydmFibGVQcm90by5zdWJzY3JpYmVPbkNvbXBsZXRlZCA9IGZ1bmN0aW9uIChvbkNvbXBsZXRlZCwgdGhpc0FyZykge1xuICAgICAgcmV0dXJuIHRoaXMuX3N1YnNjcmliZShvYnNlcnZlckNyZWF0ZShudWxsLCBudWxsLCB0eXBlb2YgdGhpc0FyZyAhPT0gJ3VuZGVmaW5lZCcgPyBmdW5jdGlvbigpIHsgb25Db21wbGV0ZWQuY2FsbCh0aGlzQXJnKTsgfSA6IG9uQ29tcGxldGVkKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBPYnNlcnZhYmxlO1xuICB9KSgpO1xuXG4gIHZhciBPYnNlcnZhYmxlQmFzZSA9IFJ4Lk9ic2VydmFibGVCYXNlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhPYnNlcnZhYmxlQmFzZSwgX19zdXBlcl9fKTtcblxuICAgIGZ1bmN0aW9uIGZpeFN1YnNjcmliZXIoc3Vic2NyaWJlcikge1xuICAgICAgcmV0dXJuIHN1YnNjcmliZXIgJiYgaXNGdW5jdGlvbihzdWJzY3JpYmVyLmRpc3Bvc2UpID8gc3Vic2NyaWJlciA6XG4gICAgICAgIGlzRnVuY3Rpb24oc3Vic2NyaWJlcikgPyBkaXNwb3NhYmxlQ3JlYXRlKHN1YnNjcmliZXIpIDogZGlzcG9zYWJsZUVtcHR5O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldERpc3Bvc2FibGUocywgc3RhdGUpIHtcbiAgICAgIHZhciBhZG8gPSBzdGF0ZVswXSwgc2VsZiA9IHN0YXRlWzFdO1xuICAgICAgdmFyIHN1YiA9IHRyeUNhdGNoKHNlbGYuc3Vic2NyaWJlQ29yZSkuY2FsbChzZWxmLCBhZG8pO1xuICAgICAgaWYgKHN1YiA9PT0gZXJyb3JPYmogJiYgIWFkby5mYWlsKGVycm9yT2JqLmUpKSB7IHRocm93ZXIoZXJyb3JPYmouZSk7IH1cbiAgICAgIGFkby5zZXREaXNwb3NhYmxlKGZpeFN1YnNjcmliZXIoc3ViKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gT2JzZXJ2YWJsZUJhc2UoKSB7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBPYnNlcnZhYmxlQmFzZS5wcm90b3R5cGUuX3N1YnNjcmliZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgYWRvID0gbmV3IEF1dG9EZXRhY2hPYnNlcnZlcihvKSwgc3RhdGUgPSBbYWRvLCB0aGlzXTtcblxuICAgICAgaWYgKGN1cnJlbnRUaHJlYWRTY2hlZHVsZXIuc2NoZWR1bGVSZXF1aXJlZCgpKSB7XG4gICAgICAgIGN1cnJlbnRUaHJlYWRTY2hlZHVsZXIuc2NoZWR1bGUoc3RhdGUsIHNldERpc3Bvc2FibGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0RGlzcG9zYWJsZShudWxsLCBzdGF0ZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYWRvO1xuICAgIH07XG5cbiAgICBPYnNlcnZhYmxlQmFzZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IG5vdEltcGxlbWVudGVkO1xuXG4gICAgcmV0dXJuIE9ic2VydmFibGVCYXNlO1xuICB9KE9ic2VydmFibGUpKTtcblxudmFyIEZsYXRNYXBPYnNlcnZhYmxlID0gUnguRmxhdE1hcE9ic2VydmFibGUgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG5cbiAgICBpbmhlcml0cyhGbGF0TWFwT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcblxuICAgIGZ1bmN0aW9uIEZsYXRNYXBPYnNlcnZhYmxlKHNvdXJjZSwgc2VsZWN0b3IsIHJlc3VsdFNlbGVjdG9yLCB0aGlzQXJnKSB7XG4gICAgICB0aGlzLnJlc3VsdFNlbGVjdG9yID0gaXNGdW5jdGlvbihyZXN1bHRTZWxlY3RvcikgPyByZXN1bHRTZWxlY3RvciA6IG51bGw7XG4gICAgICB0aGlzLnNlbGVjdG9yID0gYmluZENhbGxiYWNrKGlzRnVuY3Rpb24oc2VsZWN0b3IpID8gc2VsZWN0b3IgOiBmdW5jdGlvbigpIHsgcmV0dXJuIHNlbGVjdG9yOyB9LCB0aGlzQXJnLCAzKTtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgRmxhdE1hcE9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbihvKSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG5ldyBJbm5lck9ic2VydmVyKG8sIHRoaXMuc2VsZWN0b3IsIHRoaXMucmVzdWx0U2VsZWN0b3IsIHRoaXMpKTtcbiAgICB9O1xuXG4gICAgaW5oZXJpdHMoSW5uZXJPYnNlcnZlciwgQWJzdHJhY3RPYnNlcnZlcik7XG4gICAgZnVuY3Rpb24gSW5uZXJPYnNlcnZlcihvYnNlcnZlciwgc2VsZWN0b3IsIHJlc3VsdFNlbGVjdG9yLCBzb3VyY2UpIHtcbiAgICAgIHRoaXMuaSA9IDA7XG4gICAgICB0aGlzLnNlbGVjdG9yID0gc2VsZWN0b3I7XG4gICAgICB0aGlzLnJlc3VsdFNlbGVjdG9yID0gcmVzdWx0U2VsZWN0b3I7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMubyA9IG9ic2VydmVyO1xuICAgICAgQWJzdHJhY3RPYnNlcnZlci5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLl93cmFwUmVzdWx0ID0gZnVuY3Rpb24ocmVzdWx0LCB4LCBpKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZXN1bHRTZWxlY3RvciA/XG4gICAgICAgIHJlc3VsdC5tYXAoZnVuY3Rpb24oeSwgaTIpIHsgcmV0dXJuIHRoaXMucmVzdWx0U2VsZWN0b3IoeCwgeSwgaSwgaTIpOyB9LCB0aGlzKSA6XG4gICAgICAgIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgSW5uZXJPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIHZhciBpID0gdGhpcy5pKys7XG4gICAgICB2YXIgcmVzdWx0ID0gdHJ5Q2F0Y2godGhpcy5zZWxlY3RvcikoeCwgaSwgdGhpcy5zb3VyY2UpO1xuICAgICAgaWYgKHJlc3VsdCA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuby5vbkVycm9yKHJlc3VsdC5lKTsgfVxuXG4gICAgICBpc1Byb21pc2UocmVzdWx0KSAmJiAocmVzdWx0ID0gb2JzZXJ2YWJsZUZyb21Qcm9taXNlKHJlc3VsdCkpO1xuICAgICAgKGlzQXJyYXlMaWtlKHJlc3VsdCkgfHwgaXNJdGVyYWJsZShyZXN1bHQpKSAmJiAocmVzdWx0ID0gT2JzZXJ2YWJsZS5mcm9tKHJlc3VsdCkpO1xuICAgICAgdGhpcy5vLm9uTmV4dCh0aGlzLl93cmFwUmVzdWx0KHJlc3VsdCwgeCwgaSkpO1xuICAgIH07XG5cbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uKGUpIHsgdGhpcy5vLm9uRXJyb3IoZSk7IH07XG5cbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbigpIHsgdGhpcy5vLm9uQ29tcGxldGVkKCk7IH07XG5cbiAgICByZXR1cm4gRmxhdE1hcE9ic2VydmFibGU7XG5cbn0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgRW51bWVyYWJsZSA9IFJ4LmludGVybmFscy5FbnVtZXJhYmxlID0gZnVuY3Rpb24gKCkgeyB9O1xuXG4gIGZ1bmN0aW9uIElzRGlzcG9zZWREaXNwb3NhYmxlKHN0YXRlKSB7XG4gICAgdGhpcy5fcyA9IHN0YXRlO1xuICAgIHRoaXMuaXNEaXNwb3NlZCA9IGZhbHNlO1xuICB9XG5cbiAgSXNEaXNwb3NlZERpc3Bvc2FibGUucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmlzRGlzcG9zZWQpIHtcbiAgICAgIHRoaXMuaXNEaXNwb3NlZCA9IHRydWU7XG4gICAgICB0aGlzLl9zLmlzRGlzcG9zZWQgPSB0cnVlO1xuICAgIH1cbiAgfTtcblxuICB2YXIgQ29uY2F0RW51bWVyYWJsZU9ic2VydmFibGUgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoQ29uY2F0RW51bWVyYWJsZU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gQ29uY2F0RW51bWVyYWJsZU9ic2VydmFibGUoc291cmNlcykge1xuICAgICAgdGhpcy5zb3VyY2VzID0gc291cmNlcztcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjaGVkdWxlTWV0aG9kKHN0YXRlLCByZWN1cnNlKSB7XG4gICAgICBpZiAoc3RhdGUuaXNEaXNwb3NlZCkgeyByZXR1cm47IH1cbiAgICAgIHZhciBjdXJyZW50SXRlbSA9IHRyeUNhdGNoKHN0YXRlLmUubmV4dCkuY2FsbChzdGF0ZS5lKTtcbiAgICAgIGlmIChjdXJyZW50SXRlbSA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHN0YXRlLm8ub25FcnJvcihjdXJyZW50SXRlbS5lKTsgfVxuICAgICAgaWYgKGN1cnJlbnRJdGVtLmRvbmUpIHsgcmV0dXJuIHN0YXRlLm8ub25Db21wbGV0ZWQoKTsgfVxuXG4gICAgICAvLyBDaGVjayBpZiBwcm9taXNlXG4gICAgICB2YXIgY3VycmVudFZhbHVlID0gY3VycmVudEl0ZW0udmFsdWU7XG4gICAgICBpc1Byb21pc2UoY3VycmVudFZhbHVlKSAmJiAoY3VycmVudFZhbHVlID0gb2JzZXJ2YWJsZUZyb21Qcm9taXNlKGN1cnJlbnRWYWx1ZSkpO1xuXG4gICAgICB2YXIgZCA9IG5ldyBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSgpO1xuICAgICAgc3RhdGUuc3Vic2NyaXB0aW9uLnNldERpc3Bvc2FibGUoZCk7XG4gICAgICBkLnNldERpc3Bvc2FibGUoY3VycmVudFZhbHVlLnN1YnNjcmliZShuZXcgSW5uZXJPYnNlcnZlcihzdGF0ZSwgcmVjdXJzZSkpKTtcbiAgICB9XG5cbiAgICBDb25jYXRFbnVtZXJhYmxlT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgc3Vic2NyaXB0aW9uID0gbmV3IFNlcmlhbERpc3Bvc2FibGUoKTtcbiAgICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgICAgaXNEaXNwb3NlZDogZmFsc2UsXG4gICAgICAgIG86IG8sXG4gICAgICAgIHN1YnNjcmlwdGlvbjogc3Vic2NyaXB0aW9uLFxuICAgICAgICBlOiB0aGlzLnNvdXJjZXNbJGl0ZXJhdG9yJF0oKVxuICAgICAgfTtcblxuICAgICAgdmFyIGNhbmNlbGFibGUgPSBjdXJyZW50VGhyZWFkU2NoZWR1bGVyLnNjaGVkdWxlUmVjdXJzaXZlKHN0YXRlLCBzY2hlZHVsZU1ldGhvZCk7XG4gICAgICByZXR1cm4gbmV3IE5BcnlEaXNwb3NhYmxlKFtzdWJzY3JpcHRpb24sIGNhbmNlbGFibGUsIG5ldyBJc0Rpc3Bvc2VkRGlzcG9zYWJsZShzdGF0ZSldKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gSW5uZXJPYnNlcnZlcihzdGF0ZSwgcmVjdXJzZSkge1xuICAgICAgdGhpcy5fc3RhdGUgPSBzdGF0ZTtcbiAgICAgIHRoaXMuX3JlY3Vyc2UgPSByZWN1cnNlO1xuICAgICAgQWJzdHJhY3RPYnNlcnZlci5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGluaGVyaXRzKElubmVyT2JzZXJ2ZXIsIEFic3RyYWN0T2JzZXJ2ZXIpO1xuXG4gICAgSW5uZXJPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7IHRoaXMuX3N0YXRlLm8ub25OZXh0KHgpOyB9O1xuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHsgdGhpcy5fc3RhdGUuby5vbkVycm9yKGUpOyB9O1xuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHsgdGhpcy5fcmVjdXJzZSh0aGlzLl9zdGF0ZSk7IH07XG5cbiAgICByZXR1cm4gQ29uY2F0RW51bWVyYWJsZU9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICBFbnVtZXJhYmxlLnByb3RvdHlwZS5jb25jYXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBDb25jYXRFbnVtZXJhYmxlT2JzZXJ2YWJsZSh0aGlzKTtcbiAgfTtcblxuICB2YXIgQ2F0Y2hFcnJvck9ic2VydmFibGUgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgZnVuY3Rpb24gQ2F0Y2hFcnJvck9ic2VydmFibGUoc291cmNlcykge1xuICAgICAgdGhpcy5zb3VyY2VzID0gc291cmNlcztcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGluaGVyaXRzKENhdGNoRXJyb3JPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuXG4gICAgZnVuY3Rpb24gc2NoZWR1bGVNZXRob2Qoc3RhdGUsIHJlY3Vyc2UpIHtcbiAgICAgIGlmIChzdGF0ZS5pc0Rpc3Bvc2VkKSB7IHJldHVybjsgfVxuICAgICAgdmFyIGN1cnJlbnRJdGVtID0gdHJ5Q2F0Y2goc3RhdGUuZS5uZXh0KS5jYWxsKHN0YXRlLmUpO1xuICAgICAgaWYgKGN1cnJlbnRJdGVtID09PSBlcnJvck9iaikgeyByZXR1cm4gc3RhdGUuby5vbkVycm9yKGN1cnJlbnRJdGVtLmUpOyB9XG4gICAgICBpZiAoY3VycmVudEl0ZW0uZG9uZSkgeyByZXR1cm4gc3RhdGUubGFzdEVycm9yICE9PSBudWxsID8gc3RhdGUuby5vbkVycm9yKHN0YXRlLmxhc3RFcnJvcikgOiBzdGF0ZS5vLm9uQ29tcGxldGVkKCk7IH1cblxuICAgICAgdmFyIGN1cnJlbnRWYWx1ZSA9IGN1cnJlbnRJdGVtLnZhbHVlO1xuICAgICAgaXNQcm9taXNlKGN1cnJlbnRWYWx1ZSkgJiYgKGN1cnJlbnRWYWx1ZSA9IG9ic2VydmFibGVGcm9tUHJvbWlzZShjdXJyZW50VmFsdWUpKTtcblxuICAgICAgdmFyIGQgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgIHN0YXRlLnN1YnNjcmlwdGlvbi5zZXREaXNwb3NhYmxlKGQpO1xuICAgICAgZC5zZXREaXNwb3NhYmxlKGN1cnJlbnRWYWx1ZS5zdWJzY3JpYmUobmV3IElubmVyT2JzZXJ2ZXIoc3RhdGUsIHJlY3Vyc2UpKSk7XG4gICAgfVxuXG4gICAgQ2F0Y2hFcnJvck9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgdmFyIHN1YnNjcmlwdGlvbiA9IG5ldyBTZXJpYWxEaXNwb3NhYmxlKCk7XG4gICAgICB2YXIgc3RhdGUgPSB7XG4gICAgICAgIGlzRGlzcG9zZWQ6IGZhbHNlLFxuICAgICAgICBlOiB0aGlzLnNvdXJjZXNbJGl0ZXJhdG9yJF0oKSxcbiAgICAgICAgc3Vic2NyaXB0aW9uOiBzdWJzY3JpcHRpb24sXG4gICAgICAgIGxhc3RFcnJvcjogbnVsbCxcbiAgICAgICAgbzogb1xuICAgICAgfTtcblxuICAgICAgdmFyIGNhbmNlbGFibGUgPSBjdXJyZW50VGhyZWFkU2NoZWR1bGVyLnNjaGVkdWxlUmVjdXJzaXZlKHN0YXRlLCBzY2hlZHVsZU1ldGhvZCk7XG4gICAgICByZXR1cm4gbmV3IE5BcnlEaXNwb3NhYmxlKFtzdWJzY3JpcHRpb24sIGNhbmNlbGFibGUsIG5ldyBJc0Rpc3Bvc2VkRGlzcG9zYWJsZShzdGF0ZSldKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gSW5uZXJPYnNlcnZlcihzdGF0ZSwgcmVjdXJzZSkge1xuICAgICAgdGhpcy5fc3RhdGUgPSBzdGF0ZTtcbiAgICAgIHRoaXMuX3JlY3Vyc2UgPSByZWN1cnNlO1xuICAgICAgQWJzdHJhY3RPYnNlcnZlci5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGluaGVyaXRzKElubmVyT2JzZXJ2ZXIsIEFic3RyYWN0T2JzZXJ2ZXIpO1xuXG4gICAgSW5uZXJPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7IHRoaXMuX3N0YXRlLm8ub25OZXh0KHgpOyB9O1xuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHsgdGhpcy5fc3RhdGUubGFzdEVycm9yID0gZTsgdGhpcy5fcmVjdXJzZSh0aGlzLl9zdGF0ZSk7IH07XG4gICAgSW5uZXJPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkgeyB0aGlzLl9zdGF0ZS5vLm9uQ29tcGxldGVkKCk7IH07XG5cbiAgICByZXR1cm4gQ2F0Y2hFcnJvck9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICBFbnVtZXJhYmxlLnByb3RvdHlwZS5jYXRjaEVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgQ2F0Y2hFcnJvck9ic2VydmFibGUodGhpcyk7XG4gIH07XG5cbiAgdmFyIFJlcGVhdEVudW1lcmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFJlcGVhdEVudW1lcmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gUmVwZWF0RW51bWVyYWJsZSh2LCBjKSB7XG4gICAgICB0aGlzLnYgPSB2O1xuICAgICAgdGhpcy5jID0gYyA9PSBudWxsID8gLTEgOiBjO1xuICAgIH1cblxuICAgIFJlcGVhdEVudW1lcmFibGUucHJvdG90eXBlWyRpdGVyYXRvciRdID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5ldyBSZXBlYXRFbnVtZXJhdG9yKHRoaXMpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBSZXBlYXRFbnVtZXJhdG9yKHApIHtcbiAgICAgIHRoaXMudiA9IHAudjtcbiAgICAgIHRoaXMubCA9IHAuYztcbiAgICB9XG5cbiAgICBSZXBlYXRFbnVtZXJhdG9yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHRoaXMubCA9PT0gMCkgeyByZXR1cm4gZG9uZUVudW1lcmF0b3I7IH1cbiAgICAgIGlmICh0aGlzLmwgPiAwKSB7IHRoaXMubC0tOyB9XG4gICAgICByZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IHRoaXMudiB9O1xuICAgIH07XG5cbiAgICByZXR1cm4gUmVwZWF0RW51bWVyYWJsZTtcbiAgfShFbnVtZXJhYmxlKSk7XG5cbiAgdmFyIGVudW1lcmFibGVSZXBlYXQgPSBFbnVtZXJhYmxlLnJlcGVhdCA9IGZ1bmN0aW9uICh2YWx1ZSwgcmVwZWF0Q291bnQpIHtcbiAgICByZXR1cm4gbmV3IFJlcGVhdEVudW1lcmFibGUodmFsdWUsIHJlcGVhdENvdW50KTtcbiAgfTtcblxuICB2YXIgT2ZFbnVtZXJhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKE9mRW51bWVyYWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBPZkVudW1lcmFibGUocywgZm4sIHRoaXNBcmcpIHtcbiAgICAgIHRoaXMucyA9IHM7XG4gICAgICB0aGlzLmZuID0gZm4gPyBiaW5kQ2FsbGJhY2soZm4sIHRoaXNBcmcsIDMpIDogbnVsbDtcbiAgICB9XG4gICAgT2ZFbnVtZXJhYmxlLnByb3RvdHlwZVskaXRlcmF0b3IkXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuZXcgT2ZFbnVtZXJhdG9yKHRoaXMpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBPZkVudW1lcmF0b3IocCkge1xuICAgICAgdGhpcy5pID0gLTE7XG4gICAgICB0aGlzLnMgPSBwLnM7XG4gICAgICB0aGlzLmwgPSB0aGlzLnMubGVuZ3RoO1xuICAgICAgdGhpcy5mbiA9IHAuZm47XG4gICAgfVxuXG4gICAgT2ZFbnVtZXJhdG9yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICByZXR1cm4gKyt0aGlzLmkgPCB0aGlzLmwgP1xuICAgICAgIHsgZG9uZTogZmFsc2UsIHZhbHVlOiAhdGhpcy5mbiA/IHRoaXMuc1t0aGlzLmldIDogdGhpcy5mbih0aGlzLnNbdGhpcy5pXSwgdGhpcy5pLCB0aGlzLnMpIH0gOlxuICAgICAgIGRvbmVFbnVtZXJhdG9yO1xuICAgIH07XG5cbiAgICByZXR1cm4gT2ZFbnVtZXJhYmxlO1xuICB9KEVudW1lcmFibGUpKTtcblxuICB2YXIgZW51bWVyYWJsZU9mID0gRW51bWVyYWJsZS5vZiA9IGZ1bmN0aW9uIChzb3VyY2UsIHNlbGVjdG9yLCB0aGlzQXJnKSB7XG4gICAgcmV0dXJuIG5ldyBPZkVudW1lcmFibGUoc291cmNlLCBzZWxlY3RvciwgdGhpc0FyZyk7XG4gIH07XG5cbnZhciBPYnNlcnZlT25PYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgaW5oZXJpdHMoT2JzZXJ2ZU9uT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgZnVuY3Rpb24gT2JzZXJ2ZU9uT2JzZXJ2YWJsZShzb3VyY2UsIHMpIHtcbiAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICB0aGlzLl9zID0gcztcbiAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgfVxuXG4gIE9ic2VydmVPbk9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IE9ic2VydmVPbk9ic2VydmVyKHRoaXMuX3MsIG8pKTtcbiAgfTtcblxuICByZXR1cm4gT2JzZXJ2ZU9uT2JzZXJ2YWJsZTtcbn0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICAgLyoqXG4gICAqICBXcmFwcyB0aGUgc291cmNlIHNlcXVlbmNlIGluIG9yZGVyIHRvIHJ1biBpdHMgb2JzZXJ2ZXIgY2FsbGJhY2tzIG9uIHRoZSBzcGVjaWZpZWQgc2NoZWR1bGVyLlxuICAgKlxuICAgKiAgVGhpcyBvbmx5IGludm9rZXMgb2JzZXJ2ZXIgY2FsbGJhY2tzIG9uIGEgc2NoZWR1bGVyLiBJbiBjYXNlIHRoZSBzdWJzY3JpcHRpb24gYW5kL29yIHVuc3Vic2NyaXB0aW9uIGFjdGlvbnMgaGF2ZSBzaWRlLWVmZmVjdHNcbiAgICogIHRoYXQgcmVxdWlyZSB0byBiZSBydW4gb24gYSBzY2hlZHVsZXIsIHVzZSBzdWJzY3JpYmVPbi5cbiAgICpcbiAgICogIEBwYXJhbSB7U2NoZWR1bGVyfSBzY2hlZHVsZXIgU2NoZWR1bGVyIHRvIG5vdGlmeSBvYnNlcnZlcnMgb24uXG4gICAqICBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gVGhlIHNvdXJjZSBzZXF1ZW5jZSB3aG9zZSBvYnNlcnZhdGlvbnMgaGFwcGVuIG9uIHRoZSBzcGVjaWZpZWQgc2NoZWR1bGVyLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLm9ic2VydmVPbiA9IGZ1bmN0aW9uIChzY2hlZHVsZXIpIHtcbiAgICByZXR1cm4gbmV3IE9ic2VydmVPbk9ic2VydmFibGUodGhpcywgc2NoZWR1bGVyKTtcbiAgfTtcblxuICB2YXIgU3Vic2NyaWJlT25PYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhTdWJzY3JpYmVPbk9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gU3Vic2NyaWJlT25PYnNlcnZhYmxlKHNvdXJjZSwgcykge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9zID0gcztcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjaGVkdWxlTWV0aG9kKHNjaGVkdWxlciwgc3RhdGUpIHtcbiAgICAgIHZhciBzb3VyY2UgPSBzdGF0ZVswXSwgZCA9IHN0YXRlWzFdLCBvID0gc3RhdGVbMl07XG4gICAgICBkLnNldERpc3Bvc2FibGUobmV3IFNjaGVkdWxlZERpc3Bvc2FibGUoc2NoZWR1bGVyLCBzb3VyY2Uuc3Vic2NyaWJlKG8pKSk7XG4gICAgfVxuXG4gICAgU3Vic2NyaWJlT25PYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciBtID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCksIGQgPSBuZXcgU2VyaWFsRGlzcG9zYWJsZSgpO1xuICAgICAgZC5zZXREaXNwb3NhYmxlKG0pO1xuICAgICAgbS5zZXREaXNwb3NhYmxlKHRoaXMuX3Muc2NoZWR1bGUoW3RoaXMuc291cmNlLCBkLCBvXSwgc2NoZWR1bGVNZXRob2QpKTtcbiAgICAgIHJldHVybiBkO1xuICAgIH07XG5cbiAgICByZXR1cm4gU3Vic2NyaWJlT25PYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgIC8qKlxuICAgKiAgV3JhcHMgdGhlIHNvdXJjZSBzZXF1ZW5jZSBpbiBvcmRlciB0byBydW4gaXRzIHN1YnNjcmlwdGlvbiBhbmQgdW5zdWJzY3JpcHRpb24gbG9naWMgb24gdGhlIHNwZWNpZmllZCBzY2hlZHVsZXIuIFRoaXMgb3BlcmF0aW9uIGlzIG5vdCBjb21tb25seSB1c2VkO1xuICAgKiAgc2VlIHRoZSByZW1hcmtzIHNlY3Rpb24gZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gdGhlIGRpc3RpbmN0aW9uIGJldHdlZW4gc3Vic2NyaWJlT24gYW5kIG9ic2VydmVPbi5cblxuICAgKiAgVGhpcyBvbmx5IHBlcmZvcm1zIHRoZSBzaWRlLWVmZmVjdHMgb2Ygc3Vic2NyaXB0aW9uIGFuZCB1bnN1YnNjcmlwdGlvbiBvbiB0aGUgc3BlY2lmaWVkIHNjaGVkdWxlci4gSW4gb3JkZXIgdG8gaW52b2tlIG9ic2VydmVyXG4gICAqICBjYWxsYmFja3Mgb24gYSBzY2hlZHVsZXIsIHVzZSBvYnNlcnZlT24uXG5cbiAgICogIEBwYXJhbSB7U2NoZWR1bGVyfSBzY2hlZHVsZXIgU2NoZWR1bGVyIHRvIHBlcmZvcm0gc3Vic2NyaXB0aW9uIGFuZCB1bnN1YnNjcmlwdGlvbiBhY3Rpb25zIG9uLlxuICAgKiAgQHJldHVybnMge09ic2VydmFibGV9IFRoZSBzb3VyY2Ugc2VxdWVuY2Ugd2hvc2Ugc3Vic2NyaXB0aW9ucyBhbmQgdW5zdWJzY3JpcHRpb25zIGhhcHBlbiBvbiB0aGUgc3BlY2lmaWVkIHNjaGVkdWxlci5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5zdWJzY3JpYmVPbiA9IGZ1bmN0aW9uIChzY2hlZHVsZXIpIHtcbiAgICByZXR1cm4gbmV3IFN1YnNjcmliZU9uT2JzZXJ2YWJsZSh0aGlzLCBzY2hlZHVsZXIpO1xuICB9O1xuXG4gIHZhciBGcm9tUHJvbWlzZU9ic2VydmFibGUgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoRnJvbVByb21pc2VPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIEZyb21Qcm9taXNlT2JzZXJ2YWJsZShwLCBzKSB7XG4gICAgICB0aGlzLl9wID0gcDtcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NoZWR1bGVOZXh0KHMsIHN0YXRlKSB7XG4gICAgICB2YXIgbyA9IHN0YXRlWzBdLCBkYXRhID0gc3RhdGVbMV07XG4gICAgICBvLm9uTmV4dChkYXRhKTtcbiAgICAgIG8ub25Db21wbGV0ZWQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2hlZHVsZUVycm9yKHMsIHN0YXRlKSB7XG4gICAgICB2YXIgbyA9IHN0YXRlWzBdLCBlcnIgPSBzdGF0ZVsxXTtcbiAgICAgIG8ub25FcnJvcihlcnIpO1xuICAgIH1cblxuICAgIEZyb21Qcm9taXNlT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uKG8pIHtcbiAgICAgIHZhciBzYWQgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKSwgc2VsZiA9IHRoaXMsIHAgPSB0aGlzLl9wO1xuXG4gICAgICBpZiAoaXNGdW5jdGlvbihwKSkge1xuICAgICAgICBwID0gdHJ5Q2F0Y2gocCkoKTtcbiAgICAgICAgaWYgKHAgPT09IGVycm9yT2JqKSB7XG4gICAgICAgICAgby5vbkVycm9yKHAuZSk7XG4gICAgICAgICAgcmV0dXJuIHNhZDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgc2FkLnNldERpc3Bvc2FibGUoc2VsZi5fcy5zY2hlZHVsZShbbywgZGF0YV0sIHNjaGVkdWxlTmV4dCkpO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgc2FkLnNldERpc3Bvc2FibGUoc2VsZi5fcy5zY2hlZHVsZShbbywgZXJyXSwgc2NoZWR1bGVFcnJvcikpO1xuICAgICAgICB9KTtcblxuICAgICAgcmV0dXJuIHNhZDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEZyb21Qcm9taXNlT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIC8qKlxuICAqIENvbnZlcnRzIGEgUHJvbWlzZSB0byBhbiBPYnNlcnZhYmxlIHNlcXVlbmNlXG4gICogQHBhcmFtIHtQcm9taXNlfSBBbiBFUzYgQ29tcGxpYW50IHByb21pc2UuXG4gICogQHJldHVybnMge09ic2VydmFibGV9IEFuIE9ic2VydmFibGUgc2VxdWVuY2Ugd2hpY2ggd3JhcHMgdGhlIGV4aXN0aW5nIHByb21pc2Ugc3VjY2VzcyBhbmQgZmFpbHVyZS5cbiAgKi9cbiAgdmFyIG9ic2VydmFibGVGcm9tUHJvbWlzZSA9IE9ic2VydmFibGUuZnJvbVByb21pc2UgPSBmdW5jdGlvbiAocHJvbWlzZSwgc2NoZWR1bGVyKSB7XG4gICAgc2NoZWR1bGVyIHx8IChzY2hlZHVsZXIgPSBkZWZhdWx0U2NoZWR1bGVyKTtcbiAgICByZXR1cm4gbmV3IEZyb21Qcm9taXNlT2JzZXJ2YWJsZShwcm9taXNlLCBzY2hlZHVsZXIpO1xuICB9O1xuXG4gIC8qXG4gICAqIENvbnZlcnRzIGFuIGV4aXN0aW5nIG9ic2VydmFibGUgc2VxdWVuY2UgdG8gYW4gRVM2IENvbXBhdGlibGUgUHJvbWlzZVxuICAgKiBAZXhhbXBsZVxuICAgKiB2YXIgcHJvbWlzZSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKDQyKS50b1Byb21pc2UoUlNWUC5Qcm9taXNlKTtcbiAgICpcbiAgICogLy8gV2l0aCBjb25maWdcbiAgICogUnguY29uZmlnLlByb21pc2UgPSBSU1ZQLlByb21pc2U7XG4gICAqIHZhciBwcm9taXNlID0gUnguT2JzZXJ2YWJsZS5yZXR1cm4oNDIpLnRvUHJvbWlzZSgpO1xuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcHJvbWlzZUN0b3JdIFRoZSBjb25zdHJ1Y3RvciBvZiB0aGUgcHJvbWlzZS4gSWYgbm90IHByb3ZpZGVkLCBpdCBsb29rcyBmb3IgaXQgaW4gUnguY29uZmlnLlByb21pc2UuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBBbiBFUzYgY29tcGF0aWJsZSBwcm9taXNlIHdpdGggdGhlIGxhc3QgdmFsdWUgZnJvbSB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by50b1Byb21pc2UgPSBmdW5jdGlvbiAocHJvbWlzZUN0b3IpIHtcbiAgICBwcm9taXNlQ3RvciB8fCAocHJvbWlzZUN0b3IgPSBSeC5jb25maWcuUHJvbWlzZSk7XG4gICAgaWYgKCFwcm9taXNlQ3RvcikgeyB0aHJvdyBuZXcgTm90U3VwcG9ydGVkRXJyb3IoJ1Byb21pc2UgdHlwZSBub3QgcHJvdmlkZWQgbm9yIGluIFJ4LmNvbmZpZy5Qcm9taXNlJyk7IH1cbiAgICB2YXIgc291cmNlID0gdGhpcztcbiAgICByZXR1cm4gbmV3IHByb21pc2VDdG9yKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIC8vIE5vIGNhbmNlbGxhdGlvbiBjYW4gYmUgZG9uZVxuICAgICAgdmFyIHZhbHVlO1xuICAgICAgc291cmNlLnN1YnNjcmliZShmdW5jdGlvbiAodikge1xuICAgICAgICB2YWx1ZSA9IHY7XG4gICAgICB9LCByZWplY3QsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICB2YXIgVG9BcnJheU9ic2VydmFibGUgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoVG9BcnJheU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gVG9BcnJheU9ic2VydmFibGUoc291cmNlKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFRvQXJyYXlPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24obykge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgSW5uZXJPYnNlcnZlcihvKSk7XG4gICAgfTtcblxuICAgIGluaGVyaXRzKElubmVyT2JzZXJ2ZXIsIEFic3RyYWN0T2JzZXJ2ZXIpO1xuICAgIGZ1bmN0aW9uIElubmVyT2JzZXJ2ZXIobykge1xuICAgICAgdGhpcy5vID0gbztcbiAgICAgIHRoaXMuYSA9IFtdO1xuICAgICAgQWJzdHJhY3RPYnNlcnZlci5jYWxsKHRoaXMpO1xuICAgIH1cbiAgICBcbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHsgdGhpcy5hLnB1c2goeCk7IH07XG4gICAgSW5uZXJPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyB0aGlzLm8ub25FcnJvcihlKTsgIH07XG4gICAgSW5uZXJPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkgeyB0aGlzLm8ub25OZXh0KHRoaXMuYSk7IHRoaXMuby5vbkNvbXBsZXRlZCgpOyB9O1xuXG4gICAgcmV0dXJuIFRvQXJyYXlPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgLyoqXG4gICogQ3JlYXRlcyBhbiBhcnJheSBmcm9tIGFuIG9ic2VydmFibGUgc2VxdWVuY2UuXG4gICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgY29udGFpbmluZyBhIHNpbmdsZSBlbGVtZW50IHdpdGggYSBsaXN0IGNvbnRhaW5pbmcgYWxsIHRoZSBlbGVtZW50cyBvZiB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAqL1xuICBvYnNlcnZhYmxlUHJvdG8udG9BcnJheSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IFRvQXJyYXlPYnNlcnZhYmxlKHRoaXMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiAgQ3JlYXRlcyBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGZyb20gYSBzcGVjaWZpZWQgc3Vic2NyaWJlIG1ldGhvZCBpbXBsZW1lbnRhdGlvbi5cbiAgICogQGV4YW1wbGVcbiAgICogIHZhciByZXMgPSBSeC5PYnNlcnZhYmxlLmNyZWF0ZShmdW5jdGlvbiAob2JzZXJ2ZXIpIHsgcmV0dXJuIGZ1bmN0aW9uICgpIHsgfSApO1xuICAgKiAgdmFyIHJlcyA9IFJ4Lk9ic2VydmFibGUuY3JlYXRlKGZ1bmN0aW9uIChvYnNlcnZlcikgeyByZXR1cm4gUnguRGlzcG9zYWJsZS5lbXB0eTsgfSApO1xuICAgKiAgdmFyIHJlcyA9IFJ4Lk9ic2VydmFibGUuY3JlYXRlKGZ1bmN0aW9uIChvYnNlcnZlcikgeyB9ICk7XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IHN1YnNjcmliZSBJbXBsZW1lbnRhdGlvbiBvZiB0aGUgcmVzdWx0aW5nIG9ic2VydmFibGUgc2VxdWVuY2UncyBzdWJzY3JpYmUgbWV0aG9kLCByZXR1cm5pbmcgYSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgd3JhcHBlZCBpbiBhIERpc3Bvc2FibGUuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBUaGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSB3aXRoIHRoZSBzcGVjaWZpZWQgaW1wbGVtZW50YXRpb24gZm9yIHRoZSBTdWJzY3JpYmUgbWV0aG9kLlxuICAgKi9cbiAgT2JzZXJ2YWJsZS5jcmVhdGUgPSBmdW5jdGlvbiAoc3Vic2NyaWJlLCBwYXJlbnQpIHtcbiAgICByZXR1cm4gbmV3IEFub255bW91c09ic2VydmFibGUoc3Vic2NyaWJlLCBwYXJlbnQpO1xuICB9O1xuXG4gIHZhciBEZWZlciA9IChmdW5jdGlvbihfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhEZWZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBEZWZlcihmYWN0b3J5KSB7XG4gICAgICB0aGlzLl9mID0gZmFjdG9yeTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIERlZmVyLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciByZXN1bHQgPSB0cnlDYXRjaCh0aGlzLl9mKSgpO1xuICAgICAgaWYgKHJlc3VsdCA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIG9ic2VydmFibGVUaHJvdyhyZXN1bHQuZSkuc3Vic2NyaWJlKG8pO31cbiAgICAgIGlzUHJvbWlzZShyZXN1bHQpICYmIChyZXN1bHQgPSBvYnNlcnZhYmxlRnJvbVByb21pc2UocmVzdWx0KSk7XG4gICAgICByZXR1cm4gcmVzdWx0LnN1YnNjcmliZShvKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIERlZmVyO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgLyoqXG4gICAqICBSZXR1cm5zIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBpbnZva2VzIHRoZSBzcGVjaWZpZWQgZmFjdG9yeSBmdW5jdGlvbiB3aGVuZXZlciBhIG5ldyBvYnNlcnZlciBzdWJzY3JpYmVzLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiAgdmFyIHJlcyA9IFJ4Lk9ic2VydmFibGUuZGVmZXIoZnVuY3Rpb24gKCkgeyByZXR1cm4gUnguT2JzZXJ2YWJsZS5mcm9tQXJyYXkoWzEsMiwzXSk7IH0pO1xuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvYnNlcnZhYmxlRmFjdG9yeSBPYnNlcnZhYmxlIGZhY3RvcnkgZnVuY3Rpb24gdG8gaW52b2tlIGZvciBlYWNoIG9ic2VydmVyIHRoYXQgc3Vic2NyaWJlcyB0byB0aGUgcmVzdWx0aW5nIHNlcXVlbmNlIG9yIFByb21pc2UuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdob3NlIG9ic2VydmVycyB0cmlnZ2VyIGFuIGludm9jYXRpb24gb2YgdGhlIGdpdmVuIG9ic2VydmFibGUgZmFjdG9yeSBmdW5jdGlvbi5cbiAgICovXG4gIHZhciBvYnNlcnZhYmxlRGVmZXIgPSBPYnNlcnZhYmxlLmRlZmVyID0gZnVuY3Rpb24gKG9ic2VydmFibGVGYWN0b3J5KSB7XG4gICAgcmV0dXJuIG5ldyBEZWZlcihvYnNlcnZhYmxlRmFjdG9yeSk7XG4gIH07XG5cbiAgdmFyIEVtcHR5T2JzZXJ2YWJsZSA9IChmdW5jdGlvbihfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhFbXB0eU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gRW1wdHlPYnNlcnZhYmxlKHNjaGVkdWxlcikge1xuICAgICAgdGhpcy5zY2hlZHVsZXIgPSBzY2hlZHVsZXI7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBFbXB0eU9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAob2JzZXJ2ZXIpIHtcbiAgICAgIHZhciBzaW5rID0gbmV3IEVtcHR5U2luayhvYnNlcnZlciwgdGhpcy5zY2hlZHVsZXIpO1xuICAgICAgcmV0dXJuIHNpbmsucnVuKCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIEVtcHR5U2luayhvYnNlcnZlciwgc2NoZWR1bGVyKSB7XG4gICAgICB0aGlzLm9ic2VydmVyID0gb2JzZXJ2ZXI7XG4gICAgICB0aGlzLnNjaGVkdWxlciA9IHNjaGVkdWxlcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2hlZHVsZUl0ZW0ocywgc3RhdGUpIHtcbiAgICAgIHN0YXRlLm9uQ29tcGxldGVkKCk7XG4gICAgICByZXR1cm4gZGlzcG9zYWJsZUVtcHR5O1xuICAgIH1cblxuICAgIEVtcHR5U2luay5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHN0YXRlID0gdGhpcy5vYnNlcnZlcjtcbiAgICAgIHJldHVybiB0aGlzLnNjaGVkdWxlciA9PT0gaW1tZWRpYXRlU2NoZWR1bGVyID9cbiAgICAgICAgc2NoZWR1bGVJdGVtKG51bGwsIHN0YXRlKSA6XG4gICAgICAgIHRoaXMuc2NoZWR1bGVyLnNjaGVkdWxlKHN0YXRlLCBzY2hlZHVsZUl0ZW0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gRW1wdHlPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIEVNUFRZX09CU0VSVkFCTEUgPSBuZXcgRW1wdHlPYnNlcnZhYmxlKGltbWVkaWF0ZVNjaGVkdWxlcik7XG5cbiAgLyoqXG4gICAqICBSZXR1cm5zIGFuIGVtcHR5IG9ic2VydmFibGUgc2VxdWVuY2UsIHVzaW5nIHRoZSBzcGVjaWZpZWQgc2NoZWR1bGVyIHRvIHNlbmQgb3V0IHRoZSBzaW5nbGUgT25Db21wbGV0ZWQgbWVzc2FnZS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogIHZhciByZXMgPSBSeC5PYnNlcnZhYmxlLmVtcHR5KCk7XG4gICAqICB2YXIgcmVzID0gUnguT2JzZXJ2YWJsZS5lbXB0eShSeC5TY2hlZHVsZXIudGltZW91dCk7XG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSBTY2hlZHVsZXIgdG8gc2VuZCB0aGUgdGVybWluYXRpb24gY2FsbCBvbi5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2Ugd2l0aCBubyBlbGVtZW50cy5cbiAgICovXG4gIHZhciBvYnNlcnZhYmxlRW1wdHkgPSBPYnNlcnZhYmxlLmVtcHR5ID0gZnVuY3Rpb24gKHNjaGVkdWxlcikge1xuICAgIGlzU2NoZWR1bGVyKHNjaGVkdWxlcikgfHwgKHNjaGVkdWxlciA9IGltbWVkaWF0ZVNjaGVkdWxlcik7XG4gICAgcmV0dXJuIHNjaGVkdWxlciA9PT0gaW1tZWRpYXRlU2NoZWR1bGVyID8gRU1QVFlfT0JTRVJWQUJMRSA6IG5ldyBFbXB0eU9ic2VydmFibGUoc2NoZWR1bGVyKTtcbiAgfTtcblxuICB2YXIgRnJvbU9ic2VydmFibGUgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoRnJvbU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gRnJvbU9ic2VydmFibGUoaXRlcmFibGUsIGZuLCBzY2hlZHVsZXIpIHtcbiAgICAgIHRoaXMuX2l0ZXJhYmxlID0gaXRlcmFibGU7XG4gICAgICB0aGlzLl9mbiA9IGZuO1xuICAgICAgdGhpcy5fc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlU2NoZWR1bGVNZXRob2QobywgaXQsIGZuKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gbG9vcFJlY3Vyc2l2ZShpLCByZWN1cnNlKSB7XG4gICAgICAgIHZhciBuZXh0ID0gdHJ5Q2F0Y2goaXQubmV4dCkuY2FsbChpdCk7XG4gICAgICAgIGlmIChuZXh0ID09PSBlcnJvck9iaikgeyByZXR1cm4gby5vbkVycm9yKG5leHQuZSk7IH1cbiAgICAgICAgaWYgKG5leHQuZG9uZSkgeyByZXR1cm4gby5vbkNvbXBsZXRlZCgpOyB9XG5cbiAgICAgICAgdmFyIHJlc3VsdCA9IG5leHQudmFsdWU7XG5cbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oZm4pKSB7XG4gICAgICAgICAgcmVzdWx0ID0gdHJ5Q2F0Y2goZm4pKHJlc3VsdCwgaSk7XG4gICAgICAgICAgaWYgKHJlc3VsdCA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIG8ub25FcnJvcihyZXN1bHQuZSk7IH1cbiAgICAgICAgfVxuXG4gICAgICAgIG8ub25OZXh0KHJlc3VsdCk7XG4gICAgICAgIHJlY3Vyc2UoaSArIDEpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBGcm9tT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgbGlzdCA9IE9iamVjdCh0aGlzLl9pdGVyYWJsZSksXG4gICAgICAgICAgaXQgPSBnZXRJdGVyYWJsZShsaXN0KTtcblxuICAgICAgcmV0dXJuIHRoaXMuX3NjaGVkdWxlci5zY2hlZHVsZVJlY3Vyc2l2ZSgwLCBjcmVhdGVTY2hlZHVsZU1ldGhvZChvLCBpdCwgdGhpcy5fZm4pKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEZyb21PYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIG1heFNhZmVJbnRlZ2VyID0gTWF0aC5wb3coMiwgNTMpIC0gMTtcblxuICBmdW5jdGlvbiBTdHJpbmdJdGVyYWJsZShzKSB7XG4gICAgdGhpcy5fcyA9IHM7XG4gIH1cblxuICBTdHJpbmdJdGVyYWJsZS5wcm90b3R5cGVbJGl0ZXJhdG9yJF0gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBTdHJpbmdJdGVyYXRvcih0aGlzLl9zKTtcbiAgfTtcblxuICBmdW5jdGlvbiBTdHJpbmdJdGVyYXRvcihzKSB7XG4gICAgdGhpcy5fcyA9IHM7XG4gICAgdGhpcy5fbCA9IHMubGVuZ3RoO1xuICAgIHRoaXMuX2kgPSAwO1xuICB9XG5cbiAgU3RyaW5nSXRlcmF0b3IucHJvdG90eXBlWyRpdGVyYXRvciRdID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIFN0cmluZ0l0ZXJhdG9yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9pIDwgdGhpcy5fbCA/IHsgZG9uZTogZmFsc2UsIHZhbHVlOiB0aGlzLl9zLmNoYXJBdCh0aGlzLl9pKyspIH0gOiBkb25lRW51bWVyYXRvcjtcbiAgfTtcblxuICBmdW5jdGlvbiBBcnJheUl0ZXJhYmxlKGEpIHtcbiAgICB0aGlzLl9hID0gYTtcbiAgfVxuXG4gIEFycmF5SXRlcmFibGUucHJvdG90eXBlWyRpdGVyYXRvciRdID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgQXJyYXlJdGVyYXRvcih0aGlzLl9hKTtcbiAgfTtcblxuICBmdW5jdGlvbiBBcnJheUl0ZXJhdG9yKGEpIHtcbiAgICB0aGlzLl9hID0gYTtcbiAgICB0aGlzLl9sID0gdG9MZW5ndGgoYSk7XG4gICAgdGhpcy5faSA9IDA7XG4gIH1cblxuICBBcnJheUl0ZXJhdG9yLnByb3RvdHlwZVskaXRlcmF0b3IkXSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBBcnJheUl0ZXJhdG9yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9pIDwgdGhpcy5fbCA/IHsgZG9uZTogZmFsc2UsIHZhbHVlOiB0aGlzLl9hW3RoaXMuX2krK10gfSA6IGRvbmVFbnVtZXJhdG9yO1xuICB9O1xuXG4gIGZ1bmN0aW9uIG51bWJlcklzRmluaXRlKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgcm9vdC5pc0Zpbml0ZSh2YWx1ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBpc05hbihuKSB7XG4gICAgcmV0dXJuIG4gIT09IG47XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJdGVyYWJsZShvKSB7XG4gICAgdmFyIGkgPSBvWyRpdGVyYXRvciRdLCBpdDtcbiAgICBpZiAoIWkgJiYgdHlwZW9mIG8gPT09ICdzdHJpbmcnKSB7XG4gICAgICBpdCA9IG5ldyBTdHJpbmdJdGVyYWJsZShvKTtcbiAgICAgIHJldHVybiBpdFskaXRlcmF0b3IkXSgpO1xuICAgIH1cbiAgICBpZiAoIWkgJiYgby5sZW5ndGggIT09IHVuZGVmaW5lZCkge1xuICAgICAgaXQgPSBuZXcgQXJyYXlJdGVyYWJsZShvKTtcbiAgICAgIHJldHVybiBpdFskaXRlcmF0b3IkXSgpO1xuICAgIH1cbiAgICBpZiAoIWkpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0IGlzIG5vdCBpdGVyYWJsZScpOyB9XG4gICAgcmV0dXJuIG9bJGl0ZXJhdG9yJF0oKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNpZ24odmFsdWUpIHtcbiAgICB2YXIgbnVtYmVyID0gK3ZhbHVlO1xuICAgIGlmIChudW1iZXIgPT09IDApIHsgcmV0dXJuIG51bWJlcjsgfVxuICAgIGlmIChpc05hTihudW1iZXIpKSB7IHJldHVybiBudW1iZXI7IH1cbiAgICByZXR1cm4gbnVtYmVyIDwgMCA/IC0xIDogMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvTGVuZ3RoKG8pIHtcbiAgICB2YXIgbGVuID0gK28ubGVuZ3RoO1xuICAgIGlmIChpc05hTihsZW4pKSB7IHJldHVybiAwOyB9XG4gICAgaWYgKGxlbiA9PT0gMCB8fCAhbnVtYmVySXNGaW5pdGUobGVuKSkgeyByZXR1cm4gbGVuOyB9XG4gICAgbGVuID0gc2lnbihsZW4pICogTWF0aC5mbG9vcihNYXRoLmFicyhsZW4pKTtcbiAgICBpZiAobGVuIDw9IDApIHsgcmV0dXJuIDA7IH1cbiAgICBpZiAobGVuID4gbWF4U2FmZUludGVnZXIpIHsgcmV0dXJuIG1heFNhZmVJbnRlZ2VyOyB9XG4gICAgcmV0dXJuIGxlbjtcbiAgfVxuXG4gIC8qKlxuICAqIFRoaXMgbWV0aG9kIGNyZWF0ZXMgYSBuZXcgT2JzZXJ2YWJsZSBzZXF1ZW5jZSBmcm9tIGFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0LlxuICAqIEBwYXJhbSB7QW55fSBhcnJheUxpa2UgQW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QgdG8gY29udmVydCB0byBhbiBPYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAqIEBwYXJhbSB7RnVuY3Rpb259IFttYXBGbl0gTWFwIGZ1bmN0aW9uIHRvIGNhbGwgb24gZXZlcnkgZWxlbWVudCBvZiB0aGUgYXJyYXkuXG4gICogQHBhcmFtIHtBbnl9IFt0aGlzQXJnXSBUaGUgY29udGV4dCB0byB1c2UgY2FsbGluZyB0aGUgbWFwRm4gaWYgcHJvdmlkZWQuXG4gICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXJdIE9wdGlvbmFsIHNjaGVkdWxlciB0byB1c2UgZm9yIHNjaGVkdWxpbmcuICBJZiBub3QgcHJvdmlkZWQsIGRlZmF1bHRzIHRvIFNjaGVkdWxlci5jdXJyZW50VGhyZWFkLlxuICAqL1xuICB2YXIgb2JzZXJ2YWJsZUZyb20gPSBPYnNlcnZhYmxlLmZyb20gPSBmdW5jdGlvbiAoaXRlcmFibGUsIG1hcEZuLCB0aGlzQXJnLCBzY2hlZHVsZXIpIHtcbiAgICBpZiAoaXRlcmFibGUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpdGVyYWJsZSBjYW5ub3QgYmUgbnVsbC4nKVxuICAgIH1cbiAgICBpZiAobWFwRm4gJiYgIWlzRnVuY3Rpb24obWFwRm4pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ21hcEZuIHdoZW4gcHJvdmlkZWQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIGlmIChtYXBGbikge1xuICAgICAgdmFyIG1hcHBlciA9IGJpbmRDYWxsYmFjayhtYXBGbiwgdGhpc0FyZywgMik7XG4gICAgfVxuICAgIGlzU2NoZWR1bGVyKHNjaGVkdWxlcikgfHwgKHNjaGVkdWxlciA9IGN1cnJlbnRUaHJlYWRTY2hlZHVsZXIpO1xuICAgIHJldHVybiBuZXcgRnJvbU9ic2VydmFibGUoaXRlcmFibGUsIG1hcHBlciwgc2NoZWR1bGVyKTtcbiAgfVxuXG4gIHZhciBGcm9tQXJyYXlPYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEZyb21BcnJheU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gRnJvbUFycmF5T2JzZXJ2YWJsZShhcmdzLCBzY2hlZHVsZXIpIHtcbiAgICAgIHRoaXMuX2FyZ3MgPSBhcmdzO1xuICAgICAgdGhpcy5fc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NoZWR1bGVNZXRob2QobywgYXJncykge1xuICAgICAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGxvb3BSZWN1cnNpdmUgKGksIHJlY3Vyc2UpIHtcbiAgICAgICAgaWYgKGkgPCBsZW4pIHtcbiAgICAgICAgICBvLm9uTmV4dChhcmdzW2ldKTtcbiAgICAgICAgICByZWN1cnNlKGkgKyAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuXG4gICAgRnJvbUFycmF5T2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gdGhpcy5fc2NoZWR1bGVyLnNjaGVkdWxlUmVjdXJzaXZlKDAsIHNjaGVkdWxlTWV0aG9kKG8sIHRoaXMuX2FyZ3MpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEZyb21BcnJheU9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICAvKipcbiAgKiAgQ29udmVydHMgYW4gYXJyYXkgdG8gYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSwgdXNpbmcgYW4gb3B0aW9uYWwgc2NoZWR1bGVyIHRvIGVudW1lcmF0ZSB0aGUgYXJyYXkuXG4gICogQGRlcHJlY2F0ZWQgdXNlIE9ic2VydmFibGUuZnJvbSBvciBPYnNlcnZhYmxlLm9mXG4gICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXJdIFNjaGVkdWxlciB0byBydW4gdGhlIGVudW1lcmF0aW9uIG9mIHRoZSBpbnB1dCBzZXF1ZW5jZSBvbi5cbiAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gVGhlIG9ic2VydmFibGUgc2VxdWVuY2Ugd2hvc2UgZWxlbWVudHMgYXJlIHB1bGxlZCBmcm9tIHRoZSBnaXZlbiBlbnVtZXJhYmxlIHNlcXVlbmNlLlxuICAqL1xuICB2YXIgb2JzZXJ2YWJsZUZyb21BcnJheSA9IE9ic2VydmFibGUuZnJvbUFycmF5ID0gZnVuY3Rpb24gKGFycmF5LCBzY2hlZHVsZXIpIHtcbiAgICBpc1NjaGVkdWxlcihzY2hlZHVsZXIpIHx8IChzY2hlZHVsZXIgPSBjdXJyZW50VGhyZWFkU2NoZWR1bGVyKTtcbiAgICByZXR1cm4gbmV3IEZyb21BcnJheU9ic2VydmFibGUoYXJyYXksIHNjaGVkdWxlcilcbiAgfTtcblxuICB2YXIgR2VuZXJhdGVPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhHZW5lcmF0ZU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gR2VuZXJhdGVPYnNlcnZhYmxlKHN0YXRlLCBjbmRGbiwgaXRyRm4sIHJlc0ZuLCBzKSB7XG4gICAgICB0aGlzLl9pbml0aWFsU3RhdGUgPSBzdGF0ZTtcbiAgICAgIHRoaXMuX2NuZEZuID0gY25kRm47XG4gICAgICB0aGlzLl9pdHJGbiA9IGl0ckZuO1xuICAgICAgdGhpcy5fcmVzRm4gPSByZXNGbjtcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NoZWR1bGVSZWN1cnNpdmUoc3RhdGUsIHJlY3Vyc2UpIHtcbiAgICAgIGlmIChzdGF0ZS5maXJzdCkge1xuICAgICAgICBzdGF0ZS5maXJzdCA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUubmV3U3RhdGUgPSB0cnlDYXRjaChzdGF0ZS5zZWxmLl9pdHJGbikoc3RhdGUubmV3U3RhdGUpO1xuICAgICAgICBpZiAoc3RhdGUubmV3U3RhdGUgPT09IGVycm9yT2JqKSB7IHJldHVybiBzdGF0ZS5vLm9uRXJyb3Ioc3RhdGUubmV3U3RhdGUuZSk7IH1cbiAgICAgIH1cbiAgICAgIHZhciBoYXNSZXN1bHQgPSB0cnlDYXRjaChzdGF0ZS5zZWxmLl9jbmRGbikoc3RhdGUubmV3U3RhdGUpO1xuICAgICAgaWYgKGhhc1Jlc3VsdCA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHN0YXRlLm8ub25FcnJvcihoYXNSZXN1bHQuZSk7IH1cbiAgICAgIGlmIChoYXNSZXN1bHQpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHRyeUNhdGNoKHN0YXRlLnNlbGYuX3Jlc0ZuKShzdGF0ZS5uZXdTdGF0ZSk7XG4gICAgICAgIGlmIChyZXN1bHQgPT09IGVycm9yT2JqKSB7IHJldHVybiBzdGF0ZS5vLm9uRXJyb3IocmVzdWx0LmUpOyB9XG4gICAgICAgIHN0YXRlLm8ub25OZXh0KHJlc3VsdCk7XG4gICAgICAgIHJlY3Vyc2Uoc3RhdGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUuby5vbkNvbXBsZXRlZCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIEdlbmVyYXRlT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgc3RhdGUgPSB7XG4gICAgICAgIG86IG8sXG4gICAgICAgIHNlbGY6IHRoaXMsXG4gICAgICAgIGZpcnN0OiB0cnVlLFxuICAgICAgICBuZXdTdGF0ZTogdGhpcy5faW5pdGlhbFN0YXRlXG4gICAgICB9O1xuICAgICAgcmV0dXJuIHRoaXMuX3Muc2NoZWR1bGVSZWN1cnNpdmUoc3RhdGUsIHNjaGVkdWxlUmVjdXJzaXZlKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEdlbmVyYXRlT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIC8qKlxuICAgKiAgR2VuZXJhdGVzIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgYnkgcnVubmluZyBhIHN0YXRlLWRyaXZlbiBsb29wIHByb2R1Y2luZyB0aGUgc2VxdWVuY2UncyBlbGVtZW50cywgdXNpbmcgdGhlIHNwZWNpZmllZCBzY2hlZHVsZXIgdG8gc2VuZCBvdXQgb2JzZXJ2ZXIgbWVzc2FnZXMuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqICB2YXIgcmVzID0gUnguT2JzZXJ2YWJsZS5nZW5lcmF0ZSgwLCBmdW5jdGlvbiAoeCkgeyByZXR1cm4geCA8IDEwOyB9LCBmdW5jdGlvbiAoeCkgeyByZXR1cm4geCArIDE7IH0sIGZ1bmN0aW9uICh4KSB7IHJldHVybiB4OyB9KTtcbiAgICogIHZhciByZXMgPSBSeC5PYnNlcnZhYmxlLmdlbmVyYXRlKDAsIGZ1bmN0aW9uICh4KSB7IHJldHVybiB4IDwgMTA7IH0sIGZ1bmN0aW9uICh4KSB7IHJldHVybiB4ICsgMTsgfSwgZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHg7IH0sIFJ4LlNjaGVkdWxlci50aW1lb3V0KTtcbiAgICogQHBhcmFtIHtNaXhlZH0gaW5pdGlhbFN0YXRlIEluaXRpYWwgc3RhdGUuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbmRpdGlvbiBDb25kaXRpb24gdG8gdGVybWluYXRlIGdlbmVyYXRpb24gKHVwb24gcmV0dXJuaW5nIGZhbHNlKS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZSBJdGVyYXRpb24gc3RlcCBmdW5jdGlvbi5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gcmVzdWx0U2VsZWN0b3IgU2VsZWN0b3IgZnVuY3Rpb24gZm9yIHJlc3VsdHMgcHJvZHVjZWQgaW4gdGhlIHNlcXVlbmNlLlxuICAgKiBAcGFyYW0ge1NjaGVkdWxlcn0gW3NjaGVkdWxlcl0gU2NoZWR1bGVyIG9uIHdoaWNoIHRvIHJ1biB0aGUgZ2VuZXJhdG9yIGxvb3AuIElmIG5vdCBwcm92aWRlZCwgZGVmYXVsdHMgdG8gU2NoZWR1bGVyLmN1cnJlbnRUaHJlYWQuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBUaGUgZ2VuZXJhdGVkIHNlcXVlbmNlLlxuICAgKi9cbiAgT2JzZXJ2YWJsZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uIChpbml0aWFsU3RhdGUsIGNvbmRpdGlvbiwgaXRlcmF0ZSwgcmVzdWx0U2VsZWN0b3IsIHNjaGVkdWxlcikge1xuICAgIGlzU2NoZWR1bGVyKHNjaGVkdWxlcikgfHwgKHNjaGVkdWxlciA9IGN1cnJlbnRUaHJlYWRTY2hlZHVsZXIpO1xuICAgIHJldHVybiBuZXcgR2VuZXJhdGVPYnNlcnZhYmxlKGluaXRpYWxTdGF0ZSwgY29uZGl0aW9uLCBpdGVyYXRlLCByZXN1bHRTZWxlY3Rvciwgc2NoZWR1bGVyKTtcbiAgfTtcblxuICB2YXIgTmV2ZXJPYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKE5ldmVyT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBOZXZlck9ic2VydmFibGUoKSB7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBOZXZlck9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAob2JzZXJ2ZXIpIHtcbiAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgfTtcblxuICAgIHJldHVybiBOZXZlck9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgTkVWRVJfT0JTRVJWQUJMRSA9IG5ldyBOZXZlck9ic2VydmFibGUoKTtcblxuICAvKipcbiAgICogUmV0dXJucyBhIG5vbi10ZXJtaW5hdGluZyBvYnNlcnZhYmxlIHNlcXVlbmNlLCB3aGljaCBjYW4gYmUgdXNlZCB0byBkZW5vdGUgYW4gaW5maW5pdGUgZHVyYXRpb24gKGUuZy4gd2hlbiB1c2luZyByZWFjdGl2ZSBqb2lucykuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdob3NlIG9ic2VydmVycyB3aWxsIG5ldmVyIGdldCBjYWxsZWQuXG4gICAqL1xuICB2YXIgb2JzZXJ2YWJsZU5ldmVyID0gT2JzZXJ2YWJsZS5uZXZlciA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gTkVWRVJfT0JTRVJWQUJMRTtcbiAgfTtcblxuICBmdW5jdGlvbiBvYnNlcnZhYmxlT2YgKHNjaGVkdWxlciwgYXJyYXkpIHtcbiAgICBpc1NjaGVkdWxlcihzY2hlZHVsZXIpIHx8IChzY2hlZHVsZXIgPSBjdXJyZW50VGhyZWFkU2NoZWR1bGVyKTtcbiAgICByZXR1cm4gbmV3IEZyb21BcnJheU9ic2VydmFibGUoYXJyYXksIHNjaGVkdWxlcik7XG4gIH1cblxuICAvKipcbiAgKiAgVGhpcyBtZXRob2QgY3JlYXRlcyBhIG5ldyBPYnNlcnZhYmxlIGluc3RhbmNlIHdpdGggYSB2YXJpYWJsZSBudW1iZXIgb2YgYXJndW1lbnRzLCByZWdhcmRsZXNzIG9mIG51bWJlciBvciB0eXBlIG9mIHRoZSBhcmd1bWVudHMuXG4gICogQHJldHVybnMge09ic2VydmFibGV9IFRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHdob3NlIGVsZW1lbnRzIGFyZSBwdWxsZWQgZnJvbSB0aGUgZ2l2ZW4gYXJndW1lbnRzLlxuICAqL1xuICBPYnNlcnZhYmxlLm9mID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gbmV3IEFycmF5KGxlbik7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7IGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07IH1cbiAgICByZXR1cm4gbmV3IEZyb21BcnJheU9ic2VydmFibGUoYXJncywgY3VycmVudFRocmVhZFNjaGVkdWxlcik7XG4gIH07XG5cbiAgLyoqXG4gICogIFRoaXMgbWV0aG9kIGNyZWF0ZXMgYSBuZXcgT2JzZXJ2YWJsZSBpbnN0YW5jZSB3aXRoIGEgdmFyaWFibGUgbnVtYmVyIG9mIGFyZ3VtZW50cywgcmVnYXJkbGVzcyBvZiBudW1iZXIgb3IgdHlwZSBvZiB0aGUgYXJndW1lbnRzLlxuICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBzY2hlZHVsZXIgQSBzY2hlZHVsZXIgdG8gdXNlIGZvciBzY2hlZHVsaW5nIHRoZSBhcmd1bWVudHMuXG4gICogQHJldHVybnMge09ic2VydmFibGV9IFRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHdob3NlIGVsZW1lbnRzIGFyZSBwdWxsZWQgZnJvbSB0aGUgZ2l2ZW4gYXJndW1lbnRzLlxuICAqL1xuICBPYnNlcnZhYmxlLm9mV2l0aFNjaGVkdWxlciA9IGZ1bmN0aW9uIChzY2hlZHVsZXIpIHtcbiAgICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IodmFyIGkgPSAxOyBpIDwgbGVuOyBpKyspIHsgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07IH1cbiAgICByZXR1cm4gbmV3IEZyb21BcnJheU9ic2VydmFibGUoYXJncywgc2NoZWR1bGVyKTtcbiAgfTtcblxuICB2YXIgUGFpcnNPYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFBhaXJzT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBQYWlyc09ic2VydmFibGUobywgc2NoZWR1bGVyKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX2tleXMgPSBPYmplY3Qua2V5cyhvKTtcbiAgICAgIHRoaXMuX3NjaGVkdWxlciA9IHNjaGVkdWxlcjtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjaGVkdWxlTWV0aG9kKG8sIG9iaiwga2V5cykge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGxvb3BSZWN1cnNpdmUoaSwgcmVjdXJzZSkge1xuICAgICAgICBpZiAoaSA8IGtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgby5vbk5leHQoW2tleSwgb2JqW2tleV1dKTtcbiAgICAgICAgICByZWN1cnNlKGkgKyAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuXG4gICAgUGFpcnNPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB0aGlzLl9zY2hlZHVsZXIuc2NoZWR1bGVSZWN1cnNpdmUoMCwgc2NoZWR1bGVNZXRob2QobywgdGhpcy5fbywgdGhpcy5fa2V5cykpO1xuICAgIH07XG5cbiAgICByZXR1cm4gUGFpcnNPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYW4gb2JqZWN0IGludG8gYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBvZiBba2V5LCB2YWx1ZV0gcGFpcnMuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBpbnNwZWN0LlxuICAgKiBAcGFyYW0ge1NjaGVkdWxlcn0gW3NjaGVkdWxlcl0gU2NoZWR1bGVyIHRvIHJ1biB0aGUgZW51bWVyYXRpb24gb2YgdGhlIGlucHV0IHNlcXVlbmNlIG9uLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBvZiBba2V5LCB2YWx1ZV0gcGFpcnMgZnJvbSB0aGUgb2JqZWN0LlxuICAgKi9cbiAgT2JzZXJ2YWJsZS5wYWlycyA9IGZ1bmN0aW9uIChvYmosIHNjaGVkdWxlcikge1xuICAgIHNjaGVkdWxlciB8fCAoc2NoZWR1bGVyID0gY3VycmVudFRocmVhZFNjaGVkdWxlcik7XG4gICAgcmV0dXJuIG5ldyBQYWlyc09ic2VydmFibGUob2JqLCBzY2hlZHVsZXIpO1xuICB9O1xuXG4gICAgdmFyIFJhbmdlT2JzZXJ2YWJsZSA9IChmdW5jdGlvbihfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhSYW5nZU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gUmFuZ2VPYnNlcnZhYmxlKHN0YXJ0LCBjb3VudCwgc2NoZWR1bGVyKSB7XG4gICAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICB0aGlzLnJhbmdlQ291bnQgPSBjb3VudDtcbiAgICAgIHRoaXMuc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9vcFJlY3Vyc2l2ZShzdGFydCwgY291bnQsIG8pIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiBsb29wIChpLCByZWN1cnNlKSB7XG4gICAgICAgIGlmIChpIDwgY291bnQpIHtcbiAgICAgICAgICBvLm9uTmV4dChzdGFydCArIGkpO1xuICAgICAgICAgIHJlY3Vyc2UoaSArIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG8ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBSYW5nZU9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMuc2NoZWR1bGVyLnNjaGVkdWxlUmVjdXJzaXZlKFxuICAgICAgICAwLFxuICAgICAgICBsb29wUmVjdXJzaXZlKHRoaXMuc3RhcnQsIHRoaXMucmFuZ2VDb3VudCwgbylcbiAgICAgICk7XG4gICAgfTtcblxuICAgIHJldHVybiBSYW5nZU9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICAvKipcbiAgKiAgR2VuZXJhdGVzIGFuIG9ic2VydmFibGUgc2VxdWVuY2Ugb2YgaW50ZWdyYWwgbnVtYmVycyB3aXRoaW4gYSBzcGVjaWZpZWQgcmFuZ2UsIHVzaW5nIHRoZSBzcGVjaWZpZWQgc2NoZWR1bGVyIHRvIHNlbmQgb3V0IG9ic2VydmVyIG1lc3NhZ2VzLlxuICAqIEBwYXJhbSB7TnVtYmVyfSBzdGFydCBUaGUgdmFsdWUgb2YgdGhlIGZpcnN0IGludGVnZXIgaW4gdGhlIHNlcXVlbmNlLlxuICAqIEBwYXJhbSB7TnVtYmVyfSBjb3VudCBUaGUgbnVtYmVyIG9mIHNlcXVlbnRpYWwgaW50ZWdlcnMgdG8gZ2VuZXJhdGUuXG4gICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXJdIFNjaGVkdWxlciB0byBydW4gdGhlIGdlbmVyYXRvciBsb29wIG9uLiBJZiBub3Qgc3BlY2lmaWVkLCBkZWZhdWx0cyB0byBTY2hlZHVsZXIuY3VycmVudFRocmVhZC5cbiAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGNvbnRhaW5zIGEgcmFuZ2Ugb2Ygc2VxdWVudGlhbCBpbnRlZ3JhbCBudW1iZXJzLlxuICAqL1xuICBPYnNlcnZhYmxlLnJhbmdlID0gZnVuY3Rpb24gKHN0YXJ0LCBjb3VudCwgc2NoZWR1bGVyKSB7XG4gICAgaXNTY2hlZHVsZXIoc2NoZWR1bGVyKSB8fCAoc2NoZWR1bGVyID0gY3VycmVudFRocmVhZFNjaGVkdWxlcik7XG4gICAgcmV0dXJuIG5ldyBSYW5nZU9ic2VydmFibGUoc3RhcnQsIGNvdW50LCBzY2hlZHVsZXIpO1xuICB9O1xuXG4gIHZhciBSZXBlYXRPYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFJlcGVhdE9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gUmVwZWF0T2JzZXJ2YWJsZSh2YWx1ZSwgcmVwZWF0Q291bnQsIHNjaGVkdWxlcikge1xuICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgICAgdGhpcy5yZXBlYXRDb3VudCA9IHJlcGVhdENvdW50ID09IG51bGwgPyAtMSA6IHJlcGVhdENvdW50O1xuICAgICAgdGhpcy5zY2hlZHVsZXIgPSBzY2hlZHVsZXI7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBSZXBlYXRPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG9ic2VydmVyKSB7XG4gICAgICB2YXIgc2luayA9IG5ldyBSZXBlYXRTaW5rKG9ic2VydmVyLCB0aGlzKTtcbiAgICAgIHJldHVybiBzaW5rLnJ1bigpO1xuICAgIH07XG5cbiAgICByZXR1cm4gUmVwZWF0T2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIGZ1bmN0aW9uIFJlcGVhdFNpbmsob2JzZXJ2ZXIsIHBhcmVudCkge1xuICAgIHRoaXMub2JzZXJ2ZXIgPSBvYnNlcnZlcjtcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgfVxuXG4gIFJlcGVhdFNpbmsucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb2JzZXJ2ZXIgPSB0aGlzLm9ic2VydmVyLCB2YWx1ZSA9IHRoaXMucGFyZW50LnZhbHVlO1xuICAgIGZ1bmN0aW9uIGxvb3BSZWN1cnNpdmUoaSwgcmVjdXJzZSkge1xuICAgICAgaWYgKGkgPT09IC0xIHx8IGkgPiAwKSB7XG4gICAgICAgIG9ic2VydmVyLm9uTmV4dCh2YWx1ZSk7XG4gICAgICAgIGkgPiAwICYmIGktLTtcbiAgICAgIH1cbiAgICAgIGlmIChpID09PSAwKSB7IHJldHVybiBvYnNlcnZlci5vbkNvbXBsZXRlZCgpOyB9XG4gICAgICByZWN1cnNlKGkpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnBhcmVudC5zY2hlZHVsZXIuc2NoZWR1bGVSZWN1cnNpdmUodGhpcy5wYXJlbnQucmVwZWF0Q291bnQsIGxvb3BSZWN1cnNpdmUpO1xuICB9O1xuXG4gIC8qKlxuICAgKiAgR2VuZXJhdGVzIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCByZXBlYXRzIHRoZSBnaXZlbiBlbGVtZW50IHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHRpbWVzLCB1c2luZyB0aGUgc3BlY2lmaWVkIHNjaGVkdWxlciB0byBzZW5kIG91dCBvYnNlcnZlciBtZXNzYWdlcy5cbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWUgRWxlbWVudCB0byByZXBlYXQuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSByZXBlYXRDb3VudCBbT3B0aW9uYV0gTnVtYmVyIG9mIHRpbWVzIHRvIHJlcGVhdCB0aGUgZWxlbWVudC4gSWYgbm90IHNwZWNpZmllZCwgcmVwZWF0cyBpbmRlZmluaXRlbHkuXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBzY2hlZHVsZXIgU2NoZWR1bGVyIHRvIHJ1biB0aGUgcHJvZHVjZXIgbG9vcCBvbi4gSWYgbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gU2NoZWR1bGVyLmltbWVkaWF0ZS5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCByZXBlYXRzIHRoZSBnaXZlbiBlbGVtZW50IHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHRpbWVzLlxuICAgKi9cbiAgT2JzZXJ2YWJsZS5yZXBlYXQgPSBmdW5jdGlvbiAodmFsdWUsIHJlcGVhdENvdW50LCBzY2hlZHVsZXIpIHtcbiAgICBpc1NjaGVkdWxlcihzY2hlZHVsZXIpIHx8IChzY2hlZHVsZXIgPSBjdXJyZW50VGhyZWFkU2NoZWR1bGVyKTtcbiAgICByZXR1cm4gbmV3IFJlcGVhdE9ic2VydmFibGUodmFsdWUsIHJlcGVhdENvdW50LCBzY2hlZHVsZXIpO1xuICB9O1xuXG4gIHZhciBKdXN0T2JzZXJ2YWJsZSA9IChmdW5jdGlvbihfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhKdXN0T2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBKdXN0T2JzZXJ2YWJsZSh2YWx1ZSwgc2NoZWR1bGVyKSB7XG4gICAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xuICAgICAgdGhpcy5fc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgSnVzdE9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgdmFyIHN0YXRlID0gW3RoaXMuX3ZhbHVlLCBvXTtcbiAgICAgIHJldHVybiB0aGlzLl9zY2hlZHVsZXIgPT09IGltbWVkaWF0ZVNjaGVkdWxlciA/XG4gICAgICAgIHNjaGVkdWxlSXRlbShudWxsLCBzdGF0ZSkgOlxuICAgICAgICB0aGlzLl9zY2hlZHVsZXIuc2NoZWR1bGUoc3RhdGUsIHNjaGVkdWxlSXRlbSk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNjaGVkdWxlSXRlbShzLCBzdGF0ZSkge1xuICAgICAgdmFyIHZhbHVlID0gc3RhdGVbMF0sIG9ic2VydmVyID0gc3RhdGVbMV07XG4gICAgICBvYnNlcnZlci5vbk5leHQodmFsdWUpO1xuICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKTtcbiAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgfVxuXG4gICAgcmV0dXJuIEp1c3RPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgLyoqXG4gICAqICBSZXR1cm5zIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBjb250YWlucyBhIHNpbmdsZSBlbGVtZW50LCB1c2luZyB0aGUgc3BlY2lmaWVkIHNjaGVkdWxlciB0byBzZW5kIG91dCBvYnNlcnZlciBtZXNzYWdlcy5cbiAgICogIFRoZXJlIGlzIGFuIGFsaWFzIGNhbGxlZCAnanVzdCcgb3IgYnJvd3NlcnMgPElFOS5cbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWUgU2luZ2xlIGVsZW1lbnQgaW4gdGhlIHJlc3VsdGluZyBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgKiBAcGFyYW0ge1NjaGVkdWxlcn0gc2NoZWR1bGVyIFNjaGVkdWxlciB0byBzZW5kIHRoZSBzaW5nbGUgZWxlbWVudCBvbi4gSWYgbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gU2NoZWR1bGVyLmltbWVkaWF0ZS5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgY29udGFpbmluZyB0aGUgc2luZ2xlIHNwZWNpZmllZCBlbGVtZW50LlxuICAgKi9cbiAgdmFyIG9ic2VydmFibGVSZXR1cm4gPSBPYnNlcnZhYmxlWydyZXR1cm4nXSA9IE9ic2VydmFibGUuanVzdCA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NoZWR1bGVyKSB7XG4gICAgaXNTY2hlZHVsZXIoc2NoZWR1bGVyKSB8fCAoc2NoZWR1bGVyID0gaW1tZWRpYXRlU2NoZWR1bGVyKTtcbiAgICByZXR1cm4gbmV3IEp1c3RPYnNlcnZhYmxlKHZhbHVlLCBzY2hlZHVsZXIpO1xuICB9O1xuXG4gIHZhciBUaHJvd09ic2VydmFibGUgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoVGhyb3dPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFRocm93T2JzZXJ2YWJsZShlcnJvciwgc2NoZWR1bGVyKSB7XG4gICAgICB0aGlzLl9lcnJvciA9IGVycm9yO1xuICAgICAgdGhpcy5fc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgVGhyb3dPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciBzdGF0ZSA9IFt0aGlzLl9lcnJvciwgb107XG4gICAgICByZXR1cm4gdGhpcy5fc2NoZWR1bGVyID09PSBpbW1lZGlhdGVTY2hlZHVsZXIgP1xuICAgICAgICBzY2hlZHVsZUl0ZW0obnVsbCwgc3RhdGUpIDpcbiAgICAgICAgdGhpcy5fc2NoZWR1bGVyLnNjaGVkdWxlKHN0YXRlLCBzY2hlZHVsZUl0ZW0pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzY2hlZHVsZUl0ZW0ocywgc3RhdGUpIHtcbiAgICAgIHZhciBlID0gc3RhdGVbMF0sIG8gPSBzdGF0ZVsxXTtcbiAgICAgIG8ub25FcnJvcihlKTtcbiAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFRocm93T2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIC8qKlxuICAgKiAgUmV0dXJucyBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgdGVybWluYXRlcyB3aXRoIGFuIGV4Y2VwdGlvbiwgdXNpbmcgdGhlIHNwZWNpZmllZCBzY2hlZHVsZXIgdG8gc2VuZCBvdXQgdGhlIHNpbmdsZSBvbkVycm9yIG1lc3NhZ2UuXG4gICAqICBUaGVyZSBpcyBhbiBhbGlhcyB0byB0aGlzIG1ldGhvZCBjYWxsZWQgJ3Rocm93RXJyb3InIGZvciBicm93c2VycyA8SUU5LlxuICAgKiBAcGFyYW0ge01peGVkfSBlcnJvciBBbiBvYmplY3QgdXNlZCBmb3IgdGhlIHNlcXVlbmNlJ3MgdGVybWluYXRpb24uXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBzY2hlZHVsZXIgU2NoZWR1bGVyIHRvIHNlbmQgdGhlIGV4Y2VwdGlvbmFsIHRlcm1pbmF0aW9uIGNhbGwgb24uIElmIG5vdCBzcGVjaWZpZWQsIGRlZmF1bHRzIHRvIFNjaGVkdWxlci5pbW1lZGlhdGUuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBUaGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IHRlcm1pbmF0ZXMgZXhjZXB0aW9uYWxseSB3aXRoIHRoZSBzcGVjaWZpZWQgZXhjZXB0aW9uIG9iamVjdC5cbiAgICovXG4gIHZhciBvYnNlcnZhYmxlVGhyb3cgPSBPYnNlcnZhYmxlWyd0aHJvdyddID0gZnVuY3Rpb24gKGVycm9yLCBzY2hlZHVsZXIpIHtcbiAgICBpc1NjaGVkdWxlcihzY2hlZHVsZXIpIHx8IChzY2hlZHVsZXIgPSBpbW1lZGlhdGVTY2hlZHVsZXIpO1xuICAgIHJldHVybiBuZXcgVGhyb3dPYnNlcnZhYmxlKGVycm9yLCBzY2hlZHVsZXIpO1xuICB9O1xuXG4gIHZhciBVc2luZ09ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFVzaW5nT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBVc2luZ09ic2VydmFibGUocmVzRm4sIG9ic0ZuKSB7XG4gICAgICB0aGlzLl9yZXNGbiA9IHJlc0ZuO1xuICAgICAgdGhpcy5fb2JzRm4gPSBvYnNGbjtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFVzaW5nT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgZGlzcG9zYWJsZSA9IGRpc3Bvc2FibGVFbXB0eTtcbiAgICAgIHZhciByZXNvdXJjZSA9IHRyeUNhdGNoKHRoaXMuX3Jlc0ZuKSgpO1xuICAgICAgaWYgKHJlc291cmNlID09PSBlcnJvck9iaikge1xuICAgICAgICByZXR1cm4gbmV3IEJpbmFyeURpc3Bvc2FibGUob2JzZXJ2YWJsZVRocm93KHJlc291cmNlLmUpLnN1YnNjcmliZShvKSwgZGlzcG9zYWJsZSk7XG4gICAgICB9XG4gICAgICByZXNvdXJjZSAmJiAoZGlzcG9zYWJsZSA9IHJlc291cmNlKTtcbiAgICAgIHZhciBzb3VyY2UgPSB0cnlDYXRjaCh0aGlzLl9vYnNGbikocmVzb3VyY2UpO1xuICAgICAgaWYgKHNvdXJjZSA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgcmV0dXJuIG5ldyBCaW5hcnlEaXNwb3NhYmxlKG9ic2VydmFibGVUaHJvdyhzb3VyY2UuZSkuc3Vic2NyaWJlKG8pLCBkaXNwb3NhYmxlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgQmluYXJ5RGlzcG9zYWJsZShzb3VyY2Uuc3Vic2NyaWJlKG8pLCBkaXNwb3NhYmxlKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFVzaW5nT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBkZXBlbmRzIG9uIGEgcmVzb3VyY2Ugb2JqZWN0LCB3aG9zZSBsaWZldGltZSBpcyB0aWVkIHRvIHRoZSByZXN1bHRpbmcgb2JzZXJ2YWJsZSBzZXF1ZW5jZSdzIGxpZmV0aW1lLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXNvdXJjZUZhY3RvcnkgRmFjdG9yeSBmdW5jdGlvbiB0byBvYnRhaW4gYSByZXNvdXJjZSBvYmplY3QuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG9ic2VydmFibGVGYWN0b3J5IEZhY3RvcnkgZnVuY3Rpb24gdG8gb2J0YWluIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBkZXBlbmRzIG9uIHRoZSBvYnRhaW5lZCByZXNvdXJjZS5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2Ugd2hvc2UgbGlmZXRpbWUgY29udHJvbHMgdGhlIGxpZmV0aW1lIG9mIHRoZSBkZXBlbmRlbnQgcmVzb3VyY2Ugb2JqZWN0LlxuICAgKi9cbiAgT2JzZXJ2YWJsZS51c2luZyA9IGZ1bmN0aW9uIChyZXNvdXJjZUZhY3RvcnksIG9ic2VydmFibGVGYWN0b3J5KSB7XG4gICAgcmV0dXJuIG5ldyBVc2luZ09ic2VydmFibGUocmVzb3VyY2VGYWN0b3J5LCBvYnNlcnZhYmxlRmFjdG9yeSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFByb3BhZ2F0ZXMgdGhlIG9ic2VydmFibGUgc2VxdWVuY2Ugb3IgUHJvbWlzZSB0aGF0IHJlYWN0cyBmaXJzdC5cbiAgICogQHBhcmFtIHtPYnNlcnZhYmxlfSByaWdodFNvdXJjZSBTZWNvbmQgb2JzZXJ2YWJsZSBzZXF1ZW5jZSBvciBQcm9taXNlLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0ge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBzdXJmYWNlcyBlaXRoZXIgb2YgdGhlIGdpdmVuIHNlcXVlbmNlcywgd2hpY2hldmVyIHJlYWN0ZWQgZmlyc3QuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uYW1iID0gZnVuY3Rpb24gKHJpZ2h0U291cmNlKSB7XG4gICAgdmFyIGxlZnRTb3VyY2UgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbiAob2JzZXJ2ZXIpIHtcbiAgICAgIHZhciBjaG9pY2UsXG4gICAgICAgIGxlZnRDaG9pY2UgPSAnTCcsIHJpZ2h0Q2hvaWNlID0gJ1InLFxuICAgICAgICBsZWZ0U3Vic2NyaXB0aW9uID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCksXG4gICAgICAgIHJpZ2h0U3Vic2NyaXB0aW9uID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG5cbiAgICAgIGlzUHJvbWlzZShyaWdodFNvdXJjZSkgJiYgKHJpZ2h0U291cmNlID0gb2JzZXJ2YWJsZUZyb21Qcm9taXNlKHJpZ2h0U291cmNlKSk7XG5cbiAgICAgIGZ1bmN0aW9uIGNob2ljZUwoKSB7XG4gICAgICAgIGlmICghY2hvaWNlKSB7XG4gICAgICAgICAgY2hvaWNlID0gbGVmdENob2ljZTtcbiAgICAgICAgICByaWdodFN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gY2hvaWNlUigpIHtcbiAgICAgICAgaWYgKCFjaG9pY2UpIHtcbiAgICAgICAgICBjaG9pY2UgPSByaWdodENob2ljZTtcbiAgICAgICAgICBsZWZ0U3Vic2NyaXB0aW9uLmRpc3Bvc2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgbGVmdFN1YnNjcmliZSA9IG9ic2VydmVyQ3JlYXRlKFxuICAgICAgICBmdW5jdGlvbiAobGVmdCkge1xuICAgICAgICAgIGNob2ljZUwoKTtcbiAgICAgICAgICBjaG9pY2UgPT09IGxlZnRDaG9pY2UgJiYgb2JzZXJ2ZXIub25OZXh0KGxlZnQpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIGNob2ljZUwoKTtcbiAgICAgICAgICBjaG9pY2UgPT09IGxlZnRDaG9pY2UgJiYgb2JzZXJ2ZXIub25FcnJvcihlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNob2ljZUwoKTtcbiAgICAgICAgICBjaG9pY2UgPT09IGxlZnRDaG9pY2UgJiYgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKTtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICAgIHZhciByaWdodFN1YnNjcmliZSA9IG9ic2VydmVyQ3JlYXRlKFxuICAgICAgICBmdW5jdGlvbiAocmlnaHQpIHtcbiAgICAgICAgICBjaG9pY2VSKCk7XG4gICAgICAgICAgY2hvaWNlID09PSByaWdodENob2ljZSAmJiBvYnNlcnZlci5vbk5leHQocmlnaHQpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIGNob2ljZVIoKTtcbiAgICAgICAgICBjaG9pY2UgPT09IHJpZ2h0Q2hvaWNlICYmIG9ic2VydmVyLm9uRXJyb3IoZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBjaG9pY2VSKCk7XG4gICAgICAgICAgY2hvaWNlID09PSByaWdodENob2ljZSAmJiBvYnNlcnZlci5vbkNvbXBsZXRlZCgpO1xuICAgICAgICB9XG4gICAgICApO1xuXG4gICAgICBsZWZ0U3Vic2NyaXB0aW9uLnNldERpc3Bvc2FibGUobGVmdFNvdXJjZS5zdWJzY3JpYmUobGVmdFN1YnNjcmliZSkpO1xuICAgICAgcmlnaHRTdWJzY3JpcHRpb24uc2V0RGlzcG9zYWJsZShyaWdodFNvdXJjZS5zdWJzY3JpYmUocmlnaHRTdWJzY3JpYmUpKTtcblxuICAgICAgcmV0dXJuIG5ldyBCaW5hcnlEaXNwb3NhYmxlKGxlZnRTdWJzY3JpcHRpb24sIHJpZ2h0U3Vic2NyaXB0aW9uKTtcbiAgICB9KTtcbiAgfTtcblxuICBmdW5jdGlvbiBhbWIocCwgYykgeyByZXR1cm4gcC5hbWIoYyk7IH1cblxuICAvKipcbiAgICogUHJvcGFnYXRlcyB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSBvciBQcm9taXNlIHRoYXQgcmVhY3RzIGZpcnN0LlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IHN1cmZhY2VzIGFueSBvZiB0aGUgZ2l2ZW4gc2VxdWVuY2VzLCB3aGljaGV2ZXIgcmVhY3RlZCBmaXJzdC5cbiAgICovXG4gIE9ic2VydmFibGUuYW1iID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhY2MgPSBvYnNlcnZhYmxlTmV2ZXIoKSwgaXRlbXM7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYXJndW1lbnRzWzBdKSkge1xuICAgICAgaXRlbXMgPSBhcmd1bWVudHNbMF07XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgaXRlbXMgPSBuZXcgQXJyYXkoaXRlbXMpO1xuICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7IGl0ZW1zW2ldID0gYXJndW1lbnRzW2ldOyB9XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBpdGVtcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgYWNjID0gYW1iKGFjYywgaXRlbXNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gYWNjO1xuICB9O1xuXG4gIHZhciBDYXRjaE9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKENhdGNoT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBDYXRjaE9ic2VydmFibGUoc291cmNlLCBmbikge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9mbiA9IGZuO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgQ2F0Y2hPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciBkMSA9IG5ldyBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSgpLCBzdWJzY3JpcHRpb24gPSBuZXcgU2VyaWFsRGlzcG9zYWJsZSgpO1xuICAgICAgc3Vic2NyaXB0aW9uLnNldERpc3Bvc2FibGUoZDEpO1xuICAgICAgZDEuc2V0RGlzcG9zYWJsZSh0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IENhdGNoT2JzZXJ2ZXIobywgc3Vic2NyaXB0aW9uLCB0aGlzLl9mbikpKTtcbiAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgfTtcblxuICAgIHJldHVybiBDYXRjaE9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgQ2F0Y2hPYnNlcnZlciA9IChmdW5jdGlvbihfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhDYXRjaE9ic2VydmVyLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIENhdGNoT2JzZXJ2ZXIobywgcywgZm4pIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fcyA9IHM7XG4gICAgICB0aGlzLl9mbiA9IGZuO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgQ2F0Y2hPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7IHRoaXMuX28ub25OZXh0KHgpOyB9O1xuICAgIENhdGNoT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX28ub25Db21wbGV0ZWQoKTsgfTtcbiAgICBDYXRjaE9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdHJ5Q2F0Y2godGhpcy5fZm4pKGUpO1xuICAgICAgaWYgKHJlc3VsdCA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuX28ub25FcnJvcihyZXN1bHQuZSk7IH1cbiAgICAgIGlzUHJvbWlzZShyZXN1bHQpICYmIChyZXN1bHQgPSBvYnNlcnZhYmxlRnJvbVByb21pc2UocmVzdWx0KSk7XG5cbiAgICAgIHZhciBkID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG4gICAgICB0aGlzLl9zLnNldERpc3Bvc2FibGUoZCk7XG4gICAgICBkLnNldERpc3Bvc2FibGUocmVzdWx0LnN1YnNjcmliZSh0aGlzLl9vKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBDYXRjaE9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogQ29udGludWVzIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBpcyB0ZXJtaW5hdGVkIGJ5IGFuIGV4Y2VwdGlvbiB3aXRoIHRoZSBuZXh0IG9ic2VydmFibGUgc2VxdWVuY2UuXG4gICAqIEBwYXJhbSB7TWl4ZWR9IGhhbmRsZXJPclNlY29uZCBFeGNlcHRpb24gaGFuZGxlciBmdW5jdGlvbiB0aGF0IHJldHVybnMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBnaXZlbiB0aGUgZXJyb3IgdGhhdCBvY2N1cnJlZCBpbiB0aGUgZmlyc3Qgc2VxdWVuY2UsIG9yIGEgc2Vjb25kIG9ic2VydmFibGUgc2VxdWVuY2UgdXNlZCB0byBwcm9kdWNlIHJlc3VsdHMgd2hlbiBhbiBlcnJvciBvY2N1cnJlZCBpbiB0aGUgZmlyc3Qgc2VxdWVuY2UuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGNvbnRhaW5pbmcgdGhlIGZpcnN0IHNlcXVlbmNlJ3MgZWxlbWVudHMsIGZvbGxvd2VkIGJ5IHRoZSBlbGVtZW50cyBvZiB0aGUgaGFuZGxlciBzZXF1ZW5jZSBpbiBjYXNlIGFuIGV4Y2VwdGlvbiBvY2N1cnJlZC5cbiAgICovXG4gIG9ic2VydmFibGVQcm90b1snY2F0Y2gnXSA9IGZ1bmN0aW9uIChoYW5kbGVyT3JTZWNvbmQpIHtcbiAgICByZXR1cm4gaXNGdW5jdGlvbihoYW5kbGVyT3JTZWNvbmQpID8gbmV3IENhdGNoT2JzZXJ2YWJsZSh0aGlzLCBoYW5kbGVyT3JTZWNvbmQpIDogb2JzZXJ2YWJsZUNhdGNoKFt0aGlzLCBoYW5kbGVyT3JTZWNvbmRdKTtcbiAgfTtcblxuICAvKipcbiAgICogQ29udGludWVzIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBpcyB0ZXJtaW5hdGVkIGJ5IGFuIGV4Y2VwdGlvbiB3aXRoIHRoZSBuZXh0IG9ic2VydmFibGUgc2VxdWVuY2UuXG4gICAqIEBwYXJhbSB7QXJyYXkgfCBBcmd1bWVudHN9IGFyZ3MgQXJndW1lbnRzIG9yIGFuIGFycmF5IHRvIHVzZSBhcyB0aGUgbmV4dCBzZXF1ZW5jZSBpZiBhbiBlcnJvciBvY2N1cnMuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGNvbnRhaW5pbmcgZWxlbWVudHMgZnJvbSBjb25zZWN1dGl2ZSBzb3VyY2Ugc2VxdWVuY2VzIHVudGlsIGEgc291cmNlIHNlcXVlbmNlIHRlcm1pbmF0ZXMgc3VjY2Vzc2Z1bGx5LlxuICAgKi9cbiAgdmFyIG9ic2VydmFibGVDYXRjaCA9IE9ic2VydmFibGVbJ2NhdGNoJ10gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGl0ZW1zO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGFyZ3VtZW50c1swXSkpIHtcbiAgICAgIGl0ZW1zID0gYXJndW1lbnRzWzBdO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIGl0ZW1zID0gbmV3IEFycmF5KGxlbik7XG4gICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHsgaXRlbXNbaV0gPSBhcmd1bWVudHNbaV07IH1cbiAgICB9XG4gICAgcmV0dXJuIGVudW1lcmFibGVPZihpdGVtcykuY2F0Y2hFcnJvcigpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBNZXJnZXMgdGhlIHNwZWNpZmllZCBvYnNlcnZhYmxlIHNlcXVlbmNlcyBpbnRvIG9uZSBvYnNlcnZhYmxlIHNlcXVlbmNlIGJ5IHVzaW5nIHRoZSBzZWxlY3RvciBmdW5jdGlvbiB3aGVuZXZlciBhbnkgb2YgdGhlIG9ic2VydmFibGUgc2VxdWVuY2VzIG9yIFByb21pc2VzIHByb2R1Y2VzIGFuIGVsZW1lbnQuXG4gICAqIFRoaXMgY2FuIGJlIGluIHRoZSBmb3JtIG9mIGFuIGFyZ3VtZW50IGxpc3Qgb2Ygb2JzZXJ2YWJsZXMgb3IgYW4gYXJyYXkuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIDEgLSBvYnMgPSBvYnNlcnZhYmxlLmNvbWJpbmVMYXRlc3Qob2JzMSwgb2JzMiwgb2JzMywgZnVuY3Rpb24gKG8xLCBvMiwgbzMpIHsgcmV0dXJuIG8xICsgbzIgKyBvMzsgfSk7XG4gICAqIDIgLSBvYnMgPSBvYnNlcnZhYmxlLmNvbWJpbmVMYXRlc3QoW29iczEsIG9iczIsIG9iczNdLCBmdW5jdGlvbiAobzEsIG8yLCBvMykgeyByZXR1cm4gbzEgKyBvMiArIG8zOyB9KTtcbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgY29udGFpbmluZyB0aGUgcmVzdWx0IG9mIGNvbWJpbmluZyBlbGVtZW50cyBvZiB0aGUgc291cmNlcyB1c2luZyB0aGUgc3BlY2lmaWVkIHJlc3VsdCBzZWxlY3RvciBmdW5jdGlvbi5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5jb21iaW5lTGF0ZXN0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gbmV3IEFycmF5KGxlbik7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7IGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07IH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheShhcmdzWzBdKSkge1xuICAgICAgYXJnc1swXS51bnNoaWZ0KHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcmdzLnVuc2hpZnQodGhpcyk7XG4gICAgfVxuICAgIHJldHVybiBjb21iaW5lTGF0ZXN0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIGZhbHNlRmFjdG9yeSgpIHsgcmV0dXJuIGZhbHNlOyB9XG4gIGZ1bmN0aW9uIGFyZ3VtZW50c1RvQXJyYXkoKSB7XG4gICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBuZXcgQXJyYXkobGVuKTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHsgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTsgfVxuICAgIHJldHVybiBhcmdzO1xuICB9XG5cbiAgdmFyIENvbWJpbmVMYXRlc3RPYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKENvbWJpbmVMYXRlc3RPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIENvbWJpbmVMYXRlc3RPYnNlcnZhYmxlKHBhcmFtcywgY2IpIHtcbiAgICAgIHRoaXMuX3BhcmFtcyA9IHBhcmFtcztcbiAgICAgIHRoaXMuX2NiID0gY2I7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBDb21iaW5lTGF0ZXN0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICB2YXIgbGVuID0gdGhpcy5fcGFyYW1zLmxlbmd0aCxcbiAgICAgICAgICBzdWJzY3JpcHRpb25zID0gbmV3IEFycmF5KGxlbik7XG5cbiAgICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgICAgaGFzVmFsdWU6IGFycmF5SW5pdGlhbGl6ZShsZW4sIGZhbHNlRmFjdG9yeSksXG4gICAgICAgIGhhc1ZhbHVlQWxsOiBmYWxzZSxcbiAgICAgICAgaXNEb25lOiBhcnJheUluaXRpYWxpemUobGVuLCBmYWxzZUZhY3RvcnkpLFxuICAgICAgICB2YWx1ZXM6IG5ldyBBcnJheShsZW4pXG4gICAgICB9O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSB0aGlzLl9wYXJhbXNbaV0sIHNhZCA9IG5ldyBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSgpO1xuICAgICAgICBzdWJzY3JpcHRpb25zW2ldID0gc2FkO1xuICAgICAgICBpc1Byb21pc2Uoc291cmNlKSAmJiAoc291cmNlID0gb2JzZXJ2YWJsZUZyb21Qcm9taXNlKHNvdXJjZSkpO1xuICAgICAgICBzYWQuc2V0RGlzcG9zYWJsZShzb3VyY2Uuc3Vic2NyaWJlKG5ldyBDb21iaW5lTGF0ZXN0T2JzZXJ2ZXIob2JzZXJ2ZXIsIGksIHRoaXMuX2NiLCBzdGF0ZSkpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBOQXJ5RGlzcG9zYWJsZShzdWJzY3JpcHRpb25zKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIENvbWJpbmVMYXRlc3RPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIENvbWJpbmVMYXRlc3RPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoQ29tYmluZUxhdGVzdE9ic2VydmVyLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIENvbWJpbmVMYXRlc3RPYnNlcnZlcihvLCBpLCBjYiwgc3RhdGUpIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5faSA9IGk7XG4gICAgICB0aGlzLl9jYiA9IGNiO1xuICAgICAgdGhpcy5fc3RhdGUgPSBzdGF0ZTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5vdFRoZVNhbWUoaSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICh4LCBqKSB7XG4gICAgICAgIHJldHVybiBqICE9PSBpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBDb21iaW5lTGF0ZXN0T2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgdGhpcy5fc3RhdGUudmFsdWVzW3RoaXMuX2ldID0geDtcbiAgICAgIHRoaXMuX3N0YXRlLmhhc1ZhbHVlW3RoaXMuX2ldID0gdHJ1ZTtcbiAgICAgIGlmICh0aGlzLl9zdGF0ZS5oYXNWYWx1ZUFsbCB8fCAodGhpcy5fc3RhdGUuaGFzVmFsdWVBbGwgPSB0aGlzLl9zdGF0ZS5oYXNWYWx1ZS5ldmVyeShpZGVudGl0eSkpKSB7XG4gICAgICAgIHZhciByZXMgPSB0cnlDYXRjaCh0aGlzLl9jYikuYXBwbHkobnVsbCwgdGhpcy5fc3RhdGUudmFsdWVzKTtcbiAgICAgICAgaWYgKHJlcyA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuX28ub25FcnJvcihyZXMuZSk7IH1cbiAgICAgICAgdGhpcy5fby5vbk5leHQocmVzKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fc3RhdGUuaXNEb25lLmZpbHRlcihub3RUaGVTYW1lKHRoaXMuX2kpKS5ldmVyeShpZGVudGl0eSkpIHtcbiAgICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBDb21iaW5lTGF0ZXN0T2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuX28ub25FcnJvcihlKTtcbiAgICB9O1xuXG4gICAgQ29tYmluZUxhdGVzdE9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLl9zdGF0ZS5pc0RvbmVbdGhpcy5faV0gPSB0cnVlO1xuICAgICAgdGhpcy5fc3RhdGUuaXNEb25lLmV2ZXJ5KGlkZW50aXR5KSAmJiB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIHJldHVybiBDb21iaW5lTGF0ZXN0T2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAqIE1lcmdlcyB0aGUgc3BlY2lmaWVkIG9ic2VydmFibGUgc2VxdWVuY2VzIGludG8gb25lIG9ic2VydmFibGUgc2VxdWVuY2UgYnkgdXNpbmcgdGhlIHNlbGVjdG9yIGZ1bmN0aW9uIHdoZW5ldmVyIGFueSBvZiB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZXMgb3IgUHJvbWlzZXMgcHJvZHVjZXMgYW4gZWxlbWVudC5cbiAgKlxuICAqIEBleGFtcGxlXG4gICogMSAtIG9icyA9IFJ4Lk9ic2VydmFibGUuY29tYmluZUxhdGVzdChvYnMxLCBvYnMyLCBvYnMzLCBmdW5jdGlvbiAobzEsIG8yLCBvMykgeyByZXR1cm4gbzEgKyBvMiArIG8zOyB9KTtcbiAgKiAyIC0gb2JzID0gUnguT2JzZXJ2YWJsZS5jb21iaW5lTGF0ZXN0KFtvYnMxLCBvYnMyLCBvYnMzXSwgZnVuY3Rpb24gKG8xLCBvMiwgbzMpIHsgcmV0dXJuIG8xICsgbzIgKyBvMzsgfSk7XG4gICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgY29udGFpbmluZyB0aGUgcmVzdWx0IG9mIGNvbWJpbmluZyBlbGVtZW50cyBvZiB0aGUgc291cmNlcyB1c2luZyB0aGUgc3BlY2lmaWVkIHJlc3VsdCBzZWxlY3RvciBmdW5jdGlvbi5cbiAgKi9cbiAgdmFyIGNvbWJpbmVMYXRlc3QgPSBPYnNlcnZhYmxlLmNvbWJpbmVMYXRlc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBuZXcgQXJyYXkobGVuKTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHsgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTsgfVxuICAgIHZhciByZXN1bHRTZWxlY3RvciA9IGlzRnVuY3Rpb24oYXJnc1tsZW4gLSAxXSkgPyBhcmdzLnBvcCgpIDogYXJndW1lbnRzVG9BcnJheTtcbiAgICBBcnJheS5pc0FycmF5KGFyZ3NbMF0pICYmIChhcmdzID0gYXJnc1swXSk7XG4gICAgcmV0dXJuIG5ldyBDb21iaW5lTGF0ZXN0T2JzZXJ2YWJsZShhcmdzLCByZXN1bHRTZWxlY3Rvcik7XG4gIH07XG5cbiAgLyoqXG4gICAqIENvbmNhdGVuYXRlcyBhbGwgdGhlIG9ic2VydmFibGUgc2VxdWVuY2VzLiAgVGhpcyB0YWtlcyBpbiBlaXRoZXIgYW4gYXJyYXkgb3IgdmFyaWFibGUgYXJndW1lbnRzIHRvIGNvbmNhdGVuYXRlLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGNvbnRhaW5zIHRoZSBlbGVtZW50cyBvZiBlYWNoIGdpdmVuIHNlcXVlbmNlLCBpbiBzZXF1ZW50aWFsIG9yZGVyLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmNvbmNhdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IodmFyIGFyZ3MgPSBbXSwgaSA9IDAsIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykgeyBhcmdzLnB1c2goYXJndW1lbnRzW2ldKTsgfVxuICAgIGFyZ3MudW5zaGlmdCh0aGlzKTtcbiAgICByZXR1cm4gb2JzZXJ2YWJsZUNvbmNhdC5hcHBseShudWxsLCBhcmdzKTtcbiAgfTtcblxuICB2YXIgQ29uY2F0T2JzZXJ2ZXIgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoQ29uY2F0T2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gQ29uY2F0T2JzZXJ2ZXIocywgZm4pIHtcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgdGhpcy5fZm4gPSBmbjtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIENvbmNhdE9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHsgdGhpcy5fcy5vLm9uTmV4dCh4KTsgfTtcbiAgICBDb25jYXRPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyB0aGlzLl9zLm8ub25FcnJvcihlKTsgfTtcbiAgICBDb25jYXRPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkgeyB0aGlzLl9zLmkrKzsgdGhpcy5fZm4odGhpcy5fcyk7IH07XG5cbiAgICByZXR1cm4gQ29uY2F0T2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIHZhciBDb25jYXRPYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKENvbmNhdE9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gQ29uY2F0T2JzZXJ2YWJsZShzb3VyY2VzKSB7XG4gICAgICB0aGlzLl9zb3VyY2VzID0gc291cmNlcztcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjaGVkdWxlUmVjdXJzaXZlIChzdGF0ZSwgcmVjdXJzZSkge1xuICAgICAgaWYgKHN0YXRlLmRpc3Bvc2FibGUuaXNEaXNwb3NlZCkgeyByZXR1cm47IH1cbiAgICAgIGlmIChzdGF0ZS5pID09PSBzdGF0ZS5zb3VyY2VzLmxlbmd0aCkgeyByZXR1cm4gc3RhdGUuby5vbkNvbXBsZXRlZCgpOyB9XG5cbiAgICAgIC8vIENoZWNrIGlmIHByb21pc2VcbiAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBzdGF0ZS5zb3VyY2VzW3N0YXRlLmldO1xuICAgICAgaXNQcm9taXNlKGN1cnJlbnRWYWx1ZSkgJiYgKGN1cnJlbnRWYWx1ZSA9IG9ic2VydmFibGVGcm9tUHJvbWlzZShjdXJyZW50VmFsdWUpKTtcblxuICAgICAgdmFyIGQgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgIHN0YXRlLnN1YnNjcmlwdGlvbi5zZXREaXNwb3NhYmxlKGQpO1xuICAgICAgZC5zZXREaXNwb3NhYmxlKGN1cnJlbnRWYWx1ZS5zdWJzY3JpYmUobmV3IENvbmNhdE9ic2VydmVyKHN0YXRlLCByZWN1cnNlKSkpO1xuICAgIH1cblxuICAgIENvbmNhdE9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbihvKSB7XG4gICAgICB2YXIgc3Vic2NyaXB0aW9uID0gbmV3IFNlcmlhbERpc3Bvc2FibGUoKTtcbiAgICAgIHZhciBkaXNwb3NhYmxlID0gZGlzcG9zYWJsZUNyZWF0ZShub29wKTtcbiAgICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgICAgbzogbyxcbiAgICAgICAgaTogMCxcbiAgICAgICAgc3Vic2NyaXB0aW9uOiBzdWJzY3JpcHRpb24sXG4gICAgICAgIGRpc3Bvc2FibGU6IGRpc3Bvc2FibGUsXG4gICAgICAgIHNvdXJjZXM6IHRoaXMuX3NvdXJjZXNcbiAgICAgIH07XG5cbiAgICAgIHZhciBjYW5jZWxhYmxlID0gaW1tZWRpYXRlU2NoZWR1bGVyLnNjaGVkdWxlUmVjdXJzaXZlKHN0YXRlLCBzY2hlZHVsZVJlY3Vyc2l2ZSk7XG4gICAgICByZXR1cm4gbmV3IE5BcnlEaXNwb3NhYmxlKFtzdWJzY3JpcHRpb24sIGRpc3Bvc2FibGUsIGNhbmNlbGFibGVdKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIENvbmNhdE9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICAvKipcbiAgICogQ29uY2F0ZW5hdGVzIGFsbCB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZXMuXG4gICAqIEBwYXJhbSB7QXJyYXkgfCBBcmd1bWVudHN9IGFyZ3MgQXJndW1lbnRzIG9yIGFuIGFycmF5IHRvIGNvbmNhdCB0byB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBjb250YWlucyB0aGUgZWxlbWVudHMgb2YgZWFjaCBnaXZlbiBzZXF1ZW5jZSwgaW4gc2VxdWVudGlhbCBvcmRlci5cbiAgICovXG4gIHZhciBvYnNlcnZhYmxlQ29uY2F0ID0gT2JzZXJ2YWJsZS5jb25jYXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFyZ3M7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYXJndW1lbnRzWzBdKSkge1xuICAgICAgYXJncyA9IGFyZ3VtZW50c1swXTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKTtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykgeyBhcmdzW2ldID0gYXJndW1lbnRzW2ldOyB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgQ29uY2F0T2JzZXJ2YWJsZShhcmdzKTtcbiAgfTtcblxuICAvKipcbiAgICogQ29uY2F0ZW5hdGVzIGFuIG9ic2VydmFibGUgc2VxdWVuY2Ugb2Ygb2JzZXJ2YWJsZSBzZXF1ZW5jZXMuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgY29udGFpbnMgdGhlIGVsZW1lbnRzIG9mIGVhY2ggb2JzZXJ2ZWQgaW5uZXIgc2VxdWVuY2UsIGluIHNlcXVlbnRpYWwgb3JkZXIuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uY29uY2F0QWxsID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1lcmdlKDEpO1xuICB9O1xuXG4gIHZhciBNZXJnZU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKE1lcmdlT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcblxuICAgIGZ1bmN0aW9uIE1lcmdlT2JzZXJ2YWJsZShzb3VyY2UsIG1heENvbmN1cnJlbnQpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5tYXhDb25jdXJyZW50ID0gbWF4Q29uY3VycmVudDtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIE1lcmdlT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICB2YXIgZyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG4gICAgICBnLmFkZCh0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IE1lcmdlT2JzZXJ2ZXIob2JzZXJ2ZXIsIHRoaXMubWF4Q29uY3VycmVudCwgZykpKTtcbiAgICAgIHJldHVybiBnO1xuICAgIH07XG5cbiAgICByZXR1cm4gTWVyZ2VPYnNlcnZhYmxlO1xuXG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgTWVyZ2VPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgZnVuY3Rpb24gTWVyZ2VPYnNlcnZlcihvLCBtYXgsIGcpIHtcbiAgICAgIHRoaXMubyA9IG87XG4gICAgICB0aGlzLm1heCA9IG1heDtcbiAgICAgIHRoaXMuZyA9IGc7XG4gICAgICB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgICAgIHRoaXMucSA9IFtdO1xuICAgICAgdGhpcy5hY3RpdmVDb3VudCA9IDA7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBpbmhlcml0cyhNZXJnZU9ic2VydmVyLCBfX3N1cGVyX18pO1xuXG4gICAgTWVyZ2VPYnNlcnZlci5wcm90b3R5cGUuaGFuZGxlU3Vic2NyaWJlID0gZnVuY3Rpb24gKHhzKSB7XG4gICAgICB2YXIgc2FkID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG4gICAgICB0aGlzLmcuYWRkKHNhZCk7XG4gICAgICBpc1Byb21pc2UoeHMpICYmICh4cyA9IG9ic2VydmFibGVGcm9tUHJvbWlzZSh4cykpO1xuICAgICAgc2FkLnNldERpc3Bvc2FibGUoeHMuc3Vic2NyaWJlKG5ldyBJbm5lck9ic2VydmVyKHRoaXMsIHNhZCkpKTtcbiAgICB9O1xuXG4gICAgTWVyZ2VPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uIChpbm5lclNvdXJjZSkge1xuICAgICAgaWYodGhpcy5hY3RpdmVDb3VudCA8IHRoaXMubWF4KSB7XG4gICAgICAgIHRoaXMuYWN0aXZlQ291bnQrKztcbiAgICAgICAgdGhpcy5oYW5kbGVTdWJzY3JpYmUoaW5uZXJTb3VyY2UpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5xLnB1c2goaW5uZXJTb3VyY2UpO1xuICAgICAgfVxuICAgIH07XG4gICAgTWVyZ2VPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyB0aGlzLm8ub25FcnJvcihlKTsgfTtcbiAgICBNZXJnZU9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7IHRoaXMuZG9uZSA9IHRydWU7IHRoaXMuYWN0aXZlQ291bnQgPT09IDAgJiYgdGhpcy5vLm9uQ29tcGxldGVkKCk7IH07XG5cbiAgICBmdW5jdGlvbiBJbm5lck9ic2VydmVyKHBhcmVudCwgc2FkKSB7XG4gICAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICAgIHRoaXMuc2FkID0gc2FkO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgaW5oZXJpdHMoSW5uZXJPYnNlcnZlciwgX19zdXBlcl9fKTtcblxuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkgeyB0aGlzLnBhcmVudC5vLm9uTmV4dCh4KTsgfTtcbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7IHRoaXMucGFyZW50Lm8ub25FcnJvcihlKTsgfTtcbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnBhcmVudC5nLnJlbW92ZSh0aGlzLnNhZCk7XG4gICAgICBpZiAodGhpcy5wYXJlbnQucS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMucGFyZW50LmhhbmRsZVN1YnNjcmliZSh0aGlzLnBhcmVudC5xLnNoaWZ0KCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wYXJlbnQuYWN0aXZlQ291bnQtLTtcbiAgICAgICAgdGhpcy5wYXJlbnQuZG9uZSAmJiB0aGlzLnBhcmVudC5hY3RpdmVDb3VudCA9PT0gMCAmJiB0aGlzLnBhcmVudC5vLm9uQ29tcGxldGVkKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBNZXJnZU9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgKiBNZXJnZXMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBvZiBvYnNlcnZhYmxlIHNlcXVlbmNlcyBpbnRvIGFuIG9ic2VydmFibGUgc2VxdWVuY2UsIGxpbWl0aW5nIHRoZSBudW1iZXIgb2YgY29uY3VycmVudCBzdWJzY3JpcHRpb25zIHRvIGlubmVyIHNlcXVlbmNlcy5cbiAgKiBPciBtZXJnZXMgdHdvIG9ic2VydmFibGUgc2VxdWVuY2VzIGludG8gYSBzaW5nbGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgKiBAcGFyYW0ge01peGVkfSBbbWF4Q29uY3VycmVudE9yT3RoZXJdIE1heGltdW0gbnVtYmVyIG9mIGlubmVyIG9ic2VydmFibGUgc2VxdWVuY2VzIGJlaW5nIHN1YnNjcmliZWQgdG8gY29uY3VycmVudGx5IG9yIHRoZSBzZWNvbmQgb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gVGhlIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBtZXJnZXMgdGhlIGVsZW1lbnRzIG9mIHRoZSBpbm5lciBzZXF1ZW5jZXMuXG4gICovXG4gIG9ic2VydmFibGVQcm90by5tZXJnZSA9IGZ1bmN0aW9uIChtYXhDb25jdXJyZW50T3JPdGhlcikge1xuICAgIHJldHVybiB0eXBlb2YgbWF4Q29uY3VycmVudE9yT3RoZXIgIT09ICdudW1iZXInID9cbiAgICAgIG9ic2VydmFibGVNZXJnZSh0aGlzLCBtYXhDb25jdXJyZW50T3JPdGhlcikgOlxuICAgICAgbmV3IE1lcmdlT2JzZXJ2YWJsZSh0aGlzLCBtYXhDb25jdXJyZW50T3JPdGhlcik7XG4gIH07XG5cbiAgLyoqXG4gICAqIE1lcmdlcyBhbGwgdGhlIG9ic2VydmFibGUgc2VxdWVuY2VzIGludG8gYSBzaW5nbGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgICogVGhlIHNjaGVkdWxlciBpcyBvcHRpb25hbCBhbmQgaWYgbm90IHNwZWNpZmllZCwgdGhlIGltbWVkaWF0ZSBzY2hlZHVsZXIgaXMgdXNlZC5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IFRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgbWVyZ2VzIHRoZSBlbGVtZW50cyBvZiB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZXMuXG4gICAqL1xuICB2YXIgb2JzZXJ2YWJsZU1lcmdlID0gT2JzZXJ2YWJsZS5tZXJnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2NoZWR1bGVyLCBzb3VyY2VzID0gW10sIGksIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgaWYgKCFhcmd1bWVudHNbMF0pIHtcbiAgICAgIHNjaGVkdWxlciA9IGltbWVkaWF0ZVNjaGVkdWxlcjtcbiAgICAgIGZvcihpID0gMTsgaSA8IGxlbjsgaSsrKSB7IHNvdXJjZXMucHVzaChhcmd1bWVudHNbaV0pOyB9XG4gICAgfSBlbHNlIGlmIChpc1NjaGVkdWxlcihhcmd1bWVudHNbMF0pKSB7XG4gICAgICBzY2hlZHVsZXIgPSBhcmd1bWVudHNbMF07XG4gICAgICBmb3IoaSA9IDE7IGkgPCBsZW47IGkrKykgeyBzb3VyY2VzLnB1c2goYXJndW1lbnRzW2ldKTsgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzY2hlZHVsZXIgPSBpbW1lZGlhdGVTY2hlZHVsZXI7XG4gICAgICBmb3IoaSA9IDA7IGkgPCBsZW47IGkrKykgeyBzb3VyY2VzLnB1c2goYXJndW1lbnRzW2ldKTsgfVxuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2VzWzBdKSkge1xuICAgICAgc291cmNlcyA9IHNvdXJjZXNbMF07XG4gICAgfVxuICAgIHJldHVybiBvYnNlcnZhYmxlT2Yoc2NoZWR1bGVyLCBzb3VyY2VzKS5tZXJnZUFsbCgpO1xuICB9O1xuXG4gIHZhciBDb21wb3NpdGVFcnJvciA9IFJ4LkNvbXBvc2l0ZUVycm9yID0gZnVuY3Rpb24oZXJyb3JzKSB7XG4gICAgdGhpcy5pbm5lckVycm9ycyA9IGVycm9ycztcbiAgICB0aGlzLm1lc3NhZ2UgPSAnVGhpcyBjb250YWlucyBtdWx0aXBsZSBlcnJvcnMuIENoZWNrIHRoZSBpbm5lckVycm9ycyc7XG4gICAgRXJyb3IuY2FsbCh0aGlzKTtcbiAgfTtcbiAgQ29tcG9zaXRlRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuICBDb21wb3NpdGVFcnJvci5wcm90b3R5cGUubmFtZSA9ICdDb21wb3NpdGVFcnJvcic7XG5cbiAgdmFyIE1lcmdlRGVsYXlFcnJvck9ic2VydmFibGUgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoTWVyZ2VEZWxheUVycm9yT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBNZXJnZURlbGF5RXJyb3JPYnNlcnZhYmxlKHNvdXJjZSkge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBNZXJnZURlbGF5RXJyb3JPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciBncm91cCA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCksXG4gICAgICAgIG0gPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKSxcbiAgICAgICAgc3RhdGUgPSB7IGlzU3RvcHBlZDogZmFsc2UsIGVycm9yczogW10sIG86IG8gfTtcblxuICAgICAgZ3JvdXAuYWRkKG0pO1xuICAgICAgbS5zZXREaXNwb3NhYmxlKHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgTWVyZ2VEZWxheUVycm9yT2JzZXJ2ZXIoZ3JvdXAsIHN0YXRlKSkpO1xuXG4gICAgICByZXR1cm4gZ3JvdXA7XG4gICAgfTtcblxuICAgIHJldHVybiBNZXJnZURlbGF5RXJyb3JPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIE1lcmdlRGVsYXlFcnJvck9ic2VydmVyID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKE1lcmdlRGVsYXlFcnJvck9ic2VydmVyLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIE1lcmdlRGVsYXlFcnJvck9ic2VydmVyKGdyb3VwLCBzdGF0ZSkge1xuICAgICAgdGhpcy5fZ3JvdXAgPSBncm91cDtcbiAgICAgIHRoaXMuX3N0YXRlID0gc3RhdGU7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRDb21wbGV0aW9uKG8sIGVycm9ycykge1xuICAgICAgaWYgKGVycm9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgby5vbkNvbXBsZXRlZCgpO1xuICAgICAgfSBlbHNlIGlmIChlcnJvcnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIG8ub25FcnJvcihlcnJvcnNbMF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgby5vbkVycm9yKG5ldyBDb21wb3NpdGVFcnJvcihlcnJvcnMpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBNZXJnZURlbGF5RXJyb3JPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICB2YXIgaW5uZXIgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgIHRoaXMuX2dyb3VwLmFkZChpbm5lcik7XG5cbiAgICAgIC8vIENoZWNrIGZvciBwcm9taXNlcyBzdXBwb3J0XG4gICAgICBpc1Byb21pc2UoeCkgJiYgKHggPSBvYnNlcnZhYmxlRnJvbVByb21pc2UoeCkpO1xuICAgICAgaW5uZXIuc2V0RGlzcG9zYWJsZSh4LnN1YnNjcmliZShuZXcgSW5uZXJPYnNlcnZlcihpbm5lciwgdGhpcy5fZ3JvdXAsIHRoaXMuX3N0YXRlKSkpO1xuICAgIH07XG5cbiAgICBNZXJnZURlbGF5RXJyb3JPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgdGhpcy5fc3RhdGUuZXJyb3JzLnB1c2goZSk7XG4gICAgICB0aGlzLl9zdGF0ZS5pc1N0b3BwZWQgPSB0cnVlO1xuICAgICAgdGhpcy5fZ3JvdXAubGVuZ3RoID09PSAxICYmIHNldENvbXBsZXRpb24odGhpcy5fc3RhdGUubywgdGhpcy5fc3RhdGUuZXJyb3JzKTtcbiAgICB9O1xuXG4gICAgTWVyZ2VEZWxheUVycm9yT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuX3N0YXRlLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICB0aGlzLl9ncm91cC5sZW5ndGggPT09IDEgJiYgc2V0Q29tcGxldGlvbih0aGlzLl9zdGF0ZS5vLCB0aGlzLl9zdGF0ZS5lcnJvcnMpO1xuICAgIH07XG5cbiAgICBpbmhlcml0cyhJbm5lck9ic2VydmVyLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIElubmVyT2JzZXJ2ZXIoaW5uZXIsIGdyb3VwLCBzdGF0ZSkge1xuICAgICAgdGhpcy5faW5uZXIgPSBpbm5lcjtcbiAgICAgIHRoaXMuX2dyb3VwID0gZ3JvdXA7XG4gICAgICB0aGlzLl9zdGF0ZSA9IHN0YXRlO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgSW5uZXJPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7IHRoaXMuX3N0YXRlLm8ub25OZXh0KHgpOyB9O1xuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuX3N0YXRlLmVycm9ycy5wdXNoKGUpO1xuICAgICAgdGhpcy5fZ3JvdXAucmVtb3ZlKHRoaXMuX2lubmVyKTtcbiAgICAgIHRoaXMuX3N0YXRlLmlzU3RvcHBlZCAmJiB0aGlzLl9ncm91cC5sZW5ndGggPT09IDEgJiYgc2V0Q29tcGxldGlvbih0aGlzLl9zdGF0ZS5vLCB0aGlzLl9zdGF0ZS5lcnJvcnMpO1xuICAgIH07XG4gICAgSW5uZXJPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5fZ3JvdXAucmVtb3ZlKHRoaXMuX2lubmVyKTtcbiAgICAgIHRoaXMuX3N0YXRlLmlzU3RvcHBlZCAmJiB0aGlzLl9ncm91cC5sZW5ndGggPT09IDEgJiYgc2V0Q29tcGxldGlvbih0aGlzLl9zdGF0ZS5vLCB0aGlzLl9zdGF0ZS5lcnJvcnMpO1xuICAgIH07XG5cbiAgICByZXR1cm4gTWVyZ2VEZWxheUVycm9yT2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAqIEZsYXR0ZW5zIGFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyBPYnNlcnZhYmxlcyBpbnRvIG9uZSBPYnNlcnZhYmxlLCBpbiBhIHdheSB0aGF0IGFsbG93cyBhbiBPYnNlcnZlciB0b1xuICAqIHJlY2VpdmUgYWxsIHN1Y2Nlc3NmdWxseSBlbWl0dGVkIGl0ZW1zIGZyb20gYWxsIG9mIHRoZSBzb3VyY2UgT2JzZXJ2YWJsZXMgd2l0aG91dCBiZWluZyBpbnRlcnJ1cHRlZCBieVxuICAqIGFuIGVycm9yIG5vdGlmaWNhdGlvbiBmcm9tIG9uZSBvZiB0aGVtLlxuICAqXG4gICogVGhpcyBiZWhhdmVzIGxpa2UgT2JzZXJ2YWJsZS5wcm90b3R5cGUubWVyZ2VBbGwgZXhjZXB0IHRoYXQgaWYgYW55IG9mIHRoZSBtZXJnZWQgT2JzZXJ2YWJsZXMgbm90aWZ5IG9mIGFuXG4gICogZXJyb3IgdmlhIHRoZSBPYnNlcnZlcidzIG9uRXJyb3IsIG1lcmdlRGVsYXlFcnJvciB3aWxsIHJlZnJhaW4gZnJvbSBwcm9wYWdhdGluZyB0aGF0XG4gICogZXJyb3Igbm90aWZpY2F0aW9uIHVudGlsIGFsbCBvZiB0aGUgbWVyZ2VkIE9ic2VydmFibGVzIGhhdmUgZmluaXNoZWQgZW1pdHRpbmcgaXRlbXMuXG4gICogQHBhcmFtIHtBcnJheSB8IEFyZ3VtZW50c30gYXJncyBBcmd1bWVudHMgb3IgYW4gYXJyYXkgdG8gbWVyZ2UuXG4gICogQHJldHVybnMge09ic2VydmFibGV9IGFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyBhbGwgb2YgdGhlIGl0ZW1zIGVtaXR0ZWQgYnkgdGhlIE9ic2VydmFibGVzIGVtaXR0ZWQgYnkgdGhlIE9ic2VydmFibGVcbiAgKi9cbiAgT2JzZXJ2YWJsZS5tZXJnZURlbGF5RXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncztcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhcmd1bWVudHNbMF0pKSB7XG4gICAgICBhcmdzID0gYXJndW1lbnRzWzBdO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuKTtcbiAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykgeyBhcmdzW2ldID0gYXJndW1lbnRzW2ldOyB9XG4gICAgfVxuICAgIHZhciBzb3VyY2UgPSBvYnNlcnZhYmxlT2YobnVsbCwgYXJncyk7XG4gICAgcmV0dXJuIG5ldyBNZXJnZURlbGF5RXJyb3JPYnNlcnZhYmxlKHNvdXJjZSk7XG4gIH07XG5cbiAgdmFyIE1lcmdlQWxsT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoTWVyZ2VBbGxPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuXG4gICAgZnVuY3Rpb24gTWVyZ2VBbGxPYnNlcnZhYmxlKHNvdXJjZSkge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBNZXJnZUFsbE9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgdmFyIGcgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpLCBtID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG4gICAgICBnLmFkZChtKTtcbiAgICAgIG0uc2V0RGlzcG9zYWJsZSh0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IE1lcmdlQWxsT2JzZXJ2ZXIobywgZykpKTtcbiAgICAgIHJldHVybiBnO1xuICAgIH07XG5cbiAgICByZXR1cm4gTWVyZ2VBbGxPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIE1lcmdlQWxsT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGZ1bmN0aW9uIE1lcmdlQWxsT2JzZXJ2ZXIobywgZykge1xuICAgICAgdGhpcy5vID0gbztcbiAgICAgIHRoaXMuZyA9IGc7XG4gICAgICB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGluaGVyaXRzKE1lcmdlQWxsT2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG5cbiAgICBNZXJnZUFsbE9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oaW5uZXJTb3VyY2UpIHtcbiAgICAgIHZhciBzYWQgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgIHRoaXMuZy5hZGQoc2FkKTtcbiAgICAgIGlzUHJvbWlzZShpbm5lclNvdXJjZSkgJiYgKGlubmVyU291cmNlID0gb2JzZXJ2YWJsZUZyb21Qcm9taXNlKGlubmVyU291cmNlKSk7XG4gICAgICBzYWQuc2V0RGlzcG9zYWJsZShpbm5lclNvdXJjZS5zdWJzY3JpYmUobmV3IElubmVyT2JzZXJ2ZXIodGhpcywgc2FkKSkpO1xuICAgIH07XG5cbiAgICBNZXJnZUFsbE9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICB0aGlzLm8ub25FcnJvcihlKTtcbiAgICB9O1xuXG4gICAgTWVyZ2VBbGxPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5kb25lID0gdHJ1ZTtcbiAgICAgIHRoaXMuZy5sZW5ndGggPT09IDEgJiYgdGhpcy5vLm9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIElubmVyT2JzZXJ2ZXIocGFyZW50LCBzYWQpIHtcbiAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgICAgdGhpcy5zYWQgPSBzYWQ7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBpbmhlcml0cyhJbm5lck9ic2VydmVyLCBfX3N1cGVyX18pO1xuXG4gICAgSW5uZXJPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICB0aGlzLnBhcmVudC5vLm9uTmV4dCh4KTtcbiAgICB9O1xuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMucGFyZW50Lm8ub25FcnJvcihlKTtcbiAgICB9O1xuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMucGFyZW50LmcucmVtb3ZlKHRoaXMuc2FkKTtcbiAgICAgIHRoaXMucGFyZW50LmRvbmUgJiYgdGhpcy5wYXJlbnQuZy5sZW5ndGggPT09IDEgJiYgdGhpcy5wYXJlbnQuby5vbkNvbXBsZXRlZCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gTWVyZ2VBbGxPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgLyoqXG4gICogTWVyZ2VzIGFuIG9ic2VydmFibGUgc2VxdWVuY2Ugb2Ygb2JzZXJ2YWJsZSBzZXF1ZW5jZXMgaW50byBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBUaGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IG1lcmdlcyB0aGUgZWxlbWVudHMgb2YgdGhlIGlubmVyIHNlcXVlbmNlcy5cbiAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLm1lcmdlQWxsID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgTWVyZ2VBbGxPYnNlcnZhYmxlKHRoaXMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb250aW51ZXMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGlzIHRlcm1pbmF0ZWQgbm9ybWFsbHkgb3IgYnkgYW4gZXhjZXB0aW9uIHdpdGggdGhlIG5leHQgb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgICogQHBhcmFtIHtPYnNlcnZhYmxlfSBzZWNvbmQgU2Vjb25kIG9ic2VydmFibGUgc2VxdWVuY2UgdXNlZCB0byBwcm9kdWNlIHJlc3VsdHMgYWZ0ZXIgdGhlIGZpcnN0IHNlcXVlbmNlIHRlcm1pbmF0ZXMuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgY29uY2F0ZW5hdGVzIHRoZSBmaXJzdCBhbmQgc2Vjb25kIHNlcXVlbmNlLCBldmVuIGlmIHRoZSBmaXJzdCBzZXF1ZW5jZSB0ZXJtaW5hdGVzIGV4Y2VwdGlvbmFsbHkuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8ub25FcnJvclJlc3VtZU5leHQgPSBmdW5jdGlvbiAoc2Vjb25kKSB7XG4gICAgaWYgKCFzZWNvbmQpIHsgdGhyb3cgbmV3IEVycm9yKCdTZWNvbmQgb2JzZXJ2YWJsZSBpcyByZXF1aXJlZCcpOyB9XG4gICAgcmV0dXJuIG9uRXJyb3JSZXN1bWVOZXh0KFt0aGlzLCBzZWNvbmRdKTtcbiAgfTtcblxuICB2YXIgT25FcnJvclJlc3VtZU5leHRPYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKE9uRXJyb3JSZXN1bWVOZXh0T2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBPbkVycm9yUmVzdW1lTmV4dE9ic2VydmFibGUoc291cmNlcykge1xuICAgICAgdGhpcy5zb3VyY2VzID0gc291cmNlcztcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjaGVkdWxlTWV0aG9kKHN0YXRlLCByZWN1cnNlKSB7XG4gICAgICBpZiAoc3RhdGUucG9zIDwgc3RhdGUuc291cmNlcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSBzdGF0ZS5zb3VyY2VzW3N0YXRlLnBvcysrXTtcbiAgICAgICAgaXNQcm9taXNlKGN1cnJlbnQpICYmIChjdXJyZW50ID0gb2JzZXJ2YWJsZUZyb21Qcm9taXNlKGN1cnJlbnQpKTtcbiAgICAgICAgdmFyIGQgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgICAgc3RhdGUuc3Vic2NyaXB0aW9uLnNldERpc3Bvc2FibGUoZCk7XG4gICAgICAgIGQuc2V0RGlzcG9zYWJsZShjdXJyZW50LnN1YnNjcmliZShuZXcgT25FcnJvclJlc3VtZU5leHRPYnNlcnZlcihzdGF0ZSwgcmVjdXJzZSkpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLm8ub25Db21wbGV0ZWQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBPbkVycm9yUmVzdW1lTmV4dE9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgdmFyIHN1YnNjcmlwdGlvbiA9IG5ldyBTZXJpYWxEaXNwb3NhYmxlKCksXG4gICAgICAgICAgc3RhdGUgPSB7cG9zOiAwLCBzdWJzY3JpcHRpb246IHN1YnNjcmlwdGlvbiwgbzogbywgc291cmNlczogdGhpcy5zb3VyY2VzIH0sXG4gICAgICAgICAgY2FuY2VsbGFibGUgPSBpbW1lZGlhdGVTY2hlZHVsZXIuc2NoZWR1bGVSZWN1cnNpdmUoc3RhdGUsIHNjaGVkdWxlTWV0aG9kKTtcblxuICAgICAgcmV0dXJuIG5ldyBCaW5hcnlEaXNwb3NhYmxlKHN1YnNjcmlwdGlvbiwgY2FuY2VsbGFibGUpO1xuICAgIH07XG5cbiAgICByZXR1cm4gT25FcnJvclJlc3VtZU5leHRPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIE9uRXJyb3JSZXN1bWVOZXh0T2JzZXJ2ZXIgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoT25FcnJvclJlc3VtZU5leHRPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBPbkVycm9yUmVzdW1lTmV4dE9ic2VydmVyKHN0YXRlLCByZWN1cnNlKSB7XG4gICAgICB0aGlzLl9zdGF0ZSA9IHN0YXRlO1xuICAgICAgdGhpcy5fcmVjdXJzZSA9IHJlY3Vyc2U7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBPbkVycm9yUmVzdW1lTmV4dE9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHsgdGhpcy5fc3RhdGUuby5vbk5leHQoeCk7IH07XG4gICAgT25FcnJvclJlc3VtZU5leHRPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoKSB7IHRoaXMuX3JlY3Vyc2UodGhpcy5fc3RhdGUpOyB9O1xuICAgIE9uRXJyb3JSZXN1bWVOZXh0T2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHsgdGhpcy5fcmVjdXJzZSh0aGlzLl9zdGF0ZSk7IH07XG5cbiAgICByZXR1cm4gT25FcnJvclJlc3VtZU5leHRPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgLyoqXG4gICAqIENvbnRpbnVlcyBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgaXMgdGVybWluYXRlZCBub3JtYWxseSBvciBieSBhbiBleGNlcHRpb24gd2l0aCB0aGUgbmV4dCBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGNvbmNhdGVuYXRlcyB0aGUgc291cmNlIHNlcXVlbmNlcywgZXZlbiBpZiBhIHNlcXVlbmNlIHRlcm1pbmF0ZXMgZXhjZXB0aW9uYWxseS5cbiAgICovXG4gIHZhciBvbkVycm9yUmVzdW1lTmV4dCA9IE9ic2VydmFibGUub25FcnJvclJlc3VtZU5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNvdXJjZXMgPSBbXTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhcmd1bWVudHNbMF0pKSB7XG4gICAgICBzb3VyY2VzID0gYXJndW1lbnRzWzBdO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIHNvdXJjZXMgPSBuZXcgQXJyYXkobGVuKTtcbiAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykgeyBzb3VyY2VzW2ldID0gYXJndW1lbnRzW2ldOyB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgT25FcnJvclJlc3VtZU5leHRPYnNlcnZhYmxlKHNvdXJjZXMpO1xuICB9O1xuXG4gIHZhciBTa2lwVW50aWxPYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFNraXBVbnRpbE9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG5cbiAgICBmdW5jdGlvbiBTa2lwVW50aWxPYnNlcnZhYmxlKHNvdXJjZSwgb3RoZXIpIHtcbiAgICAgIHRoaXMuX3MgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9vID0gaXNQcm9taXNlKG90aGVyKSA/IG9ic2VydmFibGVGcm9tUHJvbWlzZShvdGhlcikgOiBvdGhlcjtcbiAgICAgIHRoaXMuX29wZW4gPSBmYWxzZTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFNraXBVbnRpbE9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbihvKSB7XG4gICAgICB2YXIgbGVmdFN1YnNjcmlwdGlvbiA9IG5ldyBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSgpO1xuICAgICAgbGVmdFN1YnNjcmlwdGlvbi5zZXREaXNwb3NhYmxlKHRoaXMuX3Muc3Vic2NyaWJlKG5ldyBTa2lwVW50aWxTb3VyY2VPYnNlcnZlcihvLCB0aGlzKSkpO1xuXG4gICAgICBpc1Byb21pc2UodGhpcy5fbykgJiYgKHRoaXMuX28gPSBvYnNlcnZhYmxlRnJvbVByb21pc2UodGhpcy5fbykpO1xuXG4gICAgICB2YXIgcmlnaHRTdWJzY3JpcHRpb24gPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgIHJpZ2h0U3Vic2NyaXB0aW9uLnNldERpc3Bvc2FibGUodGhpcy5fby5zdWJzY3JpYmUobmV3IFNraXBVbnRpbE90aGVyT2JzZXJ2ZXIobywgdGhpcywgcmlnaHRTdWJzY3JpcHRpb24pKSk7XG5cbiAgICAgIHJldHVybiBuZXcgQmluYXJ5RGlzcG9zYWJsZShsZWZ0U3Vic2NyaXB0aW9uLCByaWdodFN1YnNjcmlwdGlvbik7XG4gICAgfTtcblxuICAgIHJldHVybiBTa2lwVW50aWxPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIFNraXBVbnRpbFNvdXJjZU9ic2VydmVyID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFNraXBVbnRpbFNvdXJjZU9ic2VydmVyLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFNraXBVbnRpbFNvdXJjZU9ic2VydmVyKG8sIHApIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fcCA9IHA7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBTa2lwVW50aWxTb3VyY2VPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICB0aGlzLl9wLl9vcGVuICYmIHRoaXMuX28ub25OZXh0KHgpO1xuICAgIH07XG5cbiAgICBTa2lwVW50aWxTb3VyY2VPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICB0aGlzLl9vLm9uRXJyb3IoZXJyKTtcbiAgICB9O1xuXG4gICAgU2tpcFVudGlsU291cmNlT2JzZXJ2ZXIucHJvdG90eXBlLm9uQ29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5fcC5fb3BlbiAmJiB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIHJldHVybiBTa2lwVW50aWxTb3VyY2VPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgdmFyIFNraXBVbnRpbE90aGVyT2JzZXJ2ZXIgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoU2tpcFVudGlsT3RoZXJPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBTa2lwVW50aWxPdGhlck9ic2VydmVyKG8sIHAsIHIpIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fcCA9IHA7XG4gICAgICB0aGlzLl9yID0gcjtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFNraXBVbnRpbE90aGVyT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLl9wLl9vcGVuID0gdHJ1ZTtcbiAgICAgIHRoaXMuX3IuZGlzcG9zZSgpO1xuICAgIH07XG5cbiAgICBTa2lwVW50aWxPdGhlck9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgIHRoaXMuX28ub25FcnJvcihlcnIpO1xuICAgIH07XG5cbiAgICBTa2lwVW50aWxPdGhlck9ic2VydmVyLnByb3RvdHlwZS5vbkNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuX3IuZGlzcG9zZSgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gU2tpcFVudGlsT3RoZXJPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHZhbHVlcyBmcm9tIHRoZSBzb3VyY2Ugb2JzZXJ2YWJsZSBzZXF1ZW5jZSBvbmx5IGFmdGVyIHRoZSBvdGhlciBvYnNlcnZhYmxlIHNlcXVlbmNlIHByb2R1Y2VzIGEgdmFsdWUuXG4gICAqIEBwYXJhbSB7T2JzZXJ2YWJsZSB8IFByb21pc2V9IG90aGVyIFRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlIG9yIFByb21pc2UgdGhhdCB0cmlnZ2VycyBwcm9wYWdhdGlvbiBvZiBlbGVtZW50cyBvZiB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBjb250YWluaW5nIHRoZSBlbGVtZW50cyBvZiB0aGUgc291cmNlIHNlcXVlbmNlIHN0YXJ0aW5nIGZyb20gdGhlIHBvaW50IHRoZSBvdGhlciBzZXF1ZW5jZSB0cmlnZ2VyZWQgcHJvcGFnYXRpb24uXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uc2tpcFVudGlsID0gZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgcmV0dXJuIG5ldyBTa2lwVW50aWxPYnNlcnZhYmxlKHRoaXMsIG90aGVyKTtcbiAgfTtcblxuICB2YXIgU3dpdGNoT2JzZXJ2YWJsZSA9IChmdW5jdGlvbihfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhTd2l0Y2hPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFN3aXRjaE9ic2VydmFibGUoc291cmNlKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFN3aXRjaE9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgdmFyIGlubmVyID0gbmV3IFNlcmlhbERpc3Bvc2FibGUoKSwgcyA9IHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgU3dpdGNoT2JzZXJ2ZXIobywgaW5uZXIpKTtcbiAgICAgIHJldHVybiBuZXcgQmluYXJ5RGlzcG9zYWJsZShzLCBpbm5lcik7XG4gICAgfTtcblxuICAgIGluaGVyaXRzKFN3aXRjaE9ic2VydmVyLCBBYnN0cmFjdE9ic2VydmVyKTtcbiAgICBmdW5jdGlvbiBTd2l0Y2hPYnNlcnZlcihvLCBpbm5lcikge1xuICAgICAgdGhpcy5vID0gbztcbiAgICAgIHRoaXMuaW5uZXIgPSBpbm5lcjtcbiAgICAgIHRoaXMuc3RvcHBlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5sYXRlc3QgPSAwO1xuICAgICAgdGhpcy5oYXNMYXRlc3QgPSBmYWxzZTtcbiAgICAgIEFic3RyYWN0T2JzZXJ2ZXIuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBTd2l0Y2hPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uIChpbm5lclNvdXJjZSkge1xuICAgICAgdmFyIGQgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKSwgaWQgPSArK3RoaXMubGF0ZXN0O1xuICAgICAgdGhpcy5oYXNMYXRlc3QgPSB0cnVlO1xuICAgICAgdGhpcy5pbm5lci5zZXREaXNwb3NhYmxlKGQpO1xuICAgICAgaXNQcm9taXNlKGlubmVyU291cmNlKSAmJiAoaW5uZXJTb3VyY2UgPSBvYnNlcnZhYmxlRnJvbVByb21pc2UoaW5uZXJTb3VyY2UpKTtcbiAgICAgIGQuc2V0RGlzcG9zYWJsZShpbm5lclNvdXJjZS5zdWJzY3JpYmUobmV3IElubmVyT2JzZXJ2ZXIodGhpcywgaWQpKSk7XG4gICAgfTtcblxuICAgIFN3aXRjaE9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICB0aGlzLm8ub25FcnJvcihlKTtcbiAgICB9O1xuXG4gICAgU3dpdGNoT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuc3RvcHBlZCA9IHRydWU7XG4gICAgICAhdGhpcy5oYXNMYXRlc3QgJiYgdGhpcy5vLm9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIGluaGVyaXRzKElubmVyT2JzZXJ2ZXIsIEFic3RyYWN0T2JzZXJ2ZXIpO1xuICAgIGZ1bmN0aW9uIElubmVyT2JzZXJ2ZXIocGFyZW50LCBpZCkge1xuICAgICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICBBYnN0cmFjdE9ic2VydmVyLmNhbGwodGhpcyk7XG4gICAgfVxuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgdGhpcy5wYXJlbnQubGF0ZXN0ID09PSB0aGlzLmlkICYmIHRoaXMucGFyZW50Lm8ub25OZXh0KHgpO1xuICAgIH07XG5cbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICB0aGlzLnBhcmVudC5sYXRlc3QgPT09IHRoaXMuaWQgJiYgdGhpcy5wYXJlbnQuby5vbkVycm9yKGUpO1xuICAgIH07XG5cbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAodGhpcy5wYXJlbnQubGF0ZXN0ID09PSB0aGlzLmlkKSB7XG4gICAgICAgIHRoaXMucGFyZW50Lmhhc0xhdGVzdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnBhcmVudC5zdG9wcGVkICYmIHRoaXMucGFyZW50Lm8ub25Db21wbGV0ZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIFN3aXRjaE9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICAvKipcbiAgKiBUcmFuc2Zvcm1zIGFuIG9ic2VydmFibGUgc2VxdWVuY2Ugb2Ygb2JzZXJ2YWJsZSBzZXF1ZW5jZXMgaW50byBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHByb2R1Y2luZyB2YWx1ZXMgb25seSBmcm9tIHRoZSBtb3N0IHJlY2VudCBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBUaGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGF0IGFueSBwb2ludCBpbiB0aW1lIHByb2R1Y2VzIHRoZSBlbGVtZW50cyBvZiB0aGUgbW9zdCByZWNlbnQgaW5uZXIgb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGhhcyBiZWVuIHJlY2VpdmVkLlxuICAqL1xuICBvYnNlcnZhYmxlUHJvdG9bJ3N3aXRjaCddID0gb2JzZXJ2YWJsZVByb3RvLnN3aXRjaExhdGVzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IFN3aXRjaE9ic2VydmFibGUodGhpcyk7XG4gIH07XG5cbiAgdmFyIFRha2VVbnRpbE9ic2VydmFibGUgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoVGFrZVVudGlsT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcblxuICAgIGZ1bmN0aW9uIFRha2VVbnRpbE9ic2VydmFibGUoc291cmNlLCBvdGhlcikge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLm90aGVyID0gaXNQcm9taXNlKG90aGVyKSA/IG9ic2VydmFibGVGcm9tUHJvbWlzZShvdGhlcikgOiBvdGhlcjtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFRha2VVbnRpbE9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbihvKSB7XG4gICAgICByZXR1cm4gbmV3IEJpbmFyeURpc3Bvc2FibGUoXG4gICAgICAgIHRoaXMuc291cmNlLnN1YnNjcmliZShvKSxcbiAgICAgICAgdGhpcy5vdGhlci5zdWJzY3JpYmUobmV3IFRha2VVbnRpbE9ic2VydmVyKG8pKVxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFRha2VVbnRpbE9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgVGFrZVVudGlsT2JzZXJ2ZXIgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoVGFrZVVudGlsT2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gVGFrZVVudGlsT2JzZXJ2ZXIobykge1xuICAgICAgdGhpcy5fbyA9IG87XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBUYWtlVW50aWxPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuX28ub25Db21wbGV0ZWQoKTtcbiAgICB9O1xuXG4gICAgVGFrZVVudGlsT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgdGhpcy5fby5vbkVycm9yKGVycik7XG4gICAgfTtcblxuICAgIFRha2VVbnRpbE9ic2VydmVyLnByb3RvdHlwZS5vbkNvbXBsZXRlZCA9IG5vb3A7XG5cbiAgICByZXR1cm4gVGFrZVVudGlsT2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSB2YWx1ZXMgZnJvbSB0aGUgc291cmNlIG9ic2VydmFibGUgc2VxdWVuY2UgdW50aWwgdGhlIG90aGVyIG9ic2VydmFibGUgc2VxdWVuY2UgcHJvZHVjZXMgYSB2YWx1ZS5cbiAgICogQHBhcmFtIHtPYnNlcnZhYmxlIHwgUHJvbWlzZX0gb3RoZXIgT2JzZXJ2YWJsZSBzZXF1ZW5jZSBvciBQcm9taXNlIHRoYXQgdGVybWluYXRlcyBwcm9wYWdhdGlvbiBvZiBlbGVtZW50cyBvZiB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBjb250YWluaW5nIHRoZSBlbGVtZW50cyBvZiB0aGUgc291cmNlIHNlcXVlbmNlIHVwIHRvIHRoZSBwb2ludCB0aGUgb3RoZXIgc2VxdWVuY2UgaW50ZXJydXB0ZWQgZnVydGhlciBwcm9wYWdhdGlvbi5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by50YWtlVW50aWwgPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICByZXR1cm4gbmV3IFRha2VVbnRpbE9ic2VydmFibGUodGhpcywgb3RoZXIpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIGZhbHNlRmFjdG9yeSgpIHsgcmV0dXJuIGZhbHNlOyB9XG4gIGZ1bmN0aW9uIGFyZ3VtZW50c1RvQXJyYXkoKSB7XG4gICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBuZXcgQXJyYXkobGVuKTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHsgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTsgfVxuICAgIHJldHVybiBhcmdzO1xuICB9XG5cbiAgdmFyIFdpdGhMYXRlc3RGcm9tT2JzZXJ2YWJsZSA9IChmdW5jdGlvbihfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhXaXRoTGF0ZXN0RnJvbU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gV2l0aExhdGVzdEZyb21PYnNlcnZhYmxlKHNvdXJjZSwgc291cmNlcywgcmVzdWx0U2VsZWN0b3IpIHtcbiAgICAgIHRoaXMuX3MgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9zcyA9IHNvdXJjZXM7XG4gICAgICB0aGlzLl9jYiA9IHJlc3VsdFNlbGVjdG9yO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgV2l0aExhdGVzdEZyb21PYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciBsZW4gPSB0aGlzLl9zcy5sZW5ndGg7XG4gICAgICB2YXIgc3RhdGUgPSB7XG4gICAgICAgIGhhc1ZhbHVlOiBhcnJheUluaXRpYWxpemUobGVuLCBmYWxzZUZhY3RvcnkpLFxuICAgICAgICBoYXNWYWx1ZUFsbDogZmFsc2UsXG4gICAgICAgIHZhbHVlczogbmV3IEFycmF5KGxlbilcbiAgICAgIH07XG5cbiAgICAgIHZhciBuID0gdGhpcy5fc3MubGVuZ3RoLCBzdWJzY3JpcHRpb25zID0gbmV3IEFycmF5KG4gKyAxKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIHZhciBvdGhlciA9IHRoaXMuX3NzW2ldLCBzYWQgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgICAgaXNQcm9taXNlKG90aGVyKSAmJiAob3RoZXIgPSBvYnNlcnZhYmxlRnJvbVByb21pc2Uob3RoZXIpKTtcbiAgICAgICAgc2FkLnNldERpc3Bvc2FibGUob3RoZXIuc3Vic2NyaWJlKG5ldyBXaXRoTGF0ZXN0RnJvbU90aGVyT2JzZXJ2ZXIobywgaSwgc3RhdGUpKSk7XG4gICAgICAgIHN1YnNjcmlwdGlvbnNbaV0gPSBzYWQ7XG4gICAgICB9XG5cbiAgICAgIHZhciBvdXRlclNhZCA9IG5ldyBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSgpO1xuICAgICAgb3V0ZXJTYWQuc2V0RGlzcG9zYWJsZSh0aGlzLl9zLnN1YnNjcmliZShuZXcgV2l0aExhdGVzdEZyb21Tb3VyY2VPYnNlcnZlcihvLCB0aGlzLl9jYiwgc3RhdGUpKSk7XG4gICAgICBzdWJzY3JpcHRpb25zW25dID0gb3V0ZXJTYWQ7XG5cbiAgICAgIHJldHVybiBuZXcgTkFyeURpc3Bvc2FibGUoc3Vic2NyaXB0aW9ucyk7XG4gICAgfTtcblxuICAgIHJldHVybiBXaXRoTGF0ZXN0RnJvbU9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgV2l0aExhdGVzdEZyb21PdGhlck9ic2VydmVyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhXaXRoTGF0ZXN0RnJvbU90aGVyT2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gV2l0aExhdGVzdEZyb21PdGhlck9ic2VydmVyKG8sIGksIHN0YXRlKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX2kgPSBpO1xuICAgICAgdGhpcy5fc3RhdGUgPSBzdGF0ZTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFdpdGhMYXRlc3RGcm9tT3RoZXJPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICB0aGlzLl9zdGF0ZS52YWx1ZXNbdGhpcy5faV0gPSB4O1xuICAgICAgdGhpcy5fc3RhdGUuaGFzVmFsdWVbdGhpcy5faV0gPSB0cnVlO1xuICAgICAgdGhpcy5fc3RhdGUuaGFzVmFsdWVBbGwgPSB0aGlzLl9zdGF0ZS5oYXNWYWx1ZS5ldmVyeShpZGVudGl0eSk7XG4gICAgfTtcblxuICAgIFdpdGhMYXRlc3RGcm9tT3RoZXJPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgdGhpcy5fby5vbkVycm9yKGUpO1xuICAgIH07XG5cbiAgICBXaXRoTGF0ZXN0RnJvbU90aGVyT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IG5vb3A7XG5cbiAgICByZXR1cm4gV2l0aExhdGVzdEZyb21PdGhlck9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICB2YXIgV2l0aExhdGVzdEZyb21Tb3VyY2VPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoV2l0aExhdGVzdEZyb21Tb3VyY2VPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBXaXRoTGF0ZXN0RnJvbVNvdXJjZU9ic2VydmVyKG8sIGNiLCBzdGF0ZSkge1xuICAgICAgdGhpcy5fbyA9IG87XG4gICAgICB0aGlzLl9jYiA9IGNiO1xuICAgICAgdGhpcy5fc3RhdGUgPSBzdGF0ZTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFdpdGhMYXRlc3RGcm9tU291cmNlT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgdmFyIGFsbFZhbHVlcyA9IFt4XS5jb25jYXQodGhpcy5fc3RhdGUudmFsdWVzKTtcbiAgICAgIGlmICghdGhpcy5fc3RhdGUuaGFzVmFsdWVBbGwpIHsgcmV0dXJuOyB9XG4gICAgICB2YXIgcmVzID0gdHJ5Q2F0Y2godGhpcy5fY2IpLmFwcGx5KG51bGwsIGFsbFZhbHVlcyk7XG4gICAgICBpZiAocmVzID09PSBlcnJvck9iaikgeyByZXR1cm4gdGhpcy5fby5vbkVycm9yKHJlcy5lKTsgfVxuICAgICAgdGhpcy5fby5vbk5leHQocmVzKTtcbiAgICB9O1xuXG4gICAgV2l0aExhdGVzdEZyb21Tb3VyY2VPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgdGhpcy5fby5vbkVycm9yKGUpO1xuICAgIH07XG5cbiAgICBXaXRoTGF0ZXN0RnJvbVNvdXJjZU9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIHJldHVybiBXaXRoTGF0ZXN0RnJvbVNvdXJjZU9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogTWVyZ2VzIHRoZSBzcGVjaWZpZWQgb2JzZXJ2YWJsZSBzZXF1ZW5jZXMgaW50byBvbmUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSBieSB1c2luZyB0aGUgc2VsZWN0b3IgZnVuY3Rpb24gb25seSB3aGVuIHRoZSAoZmlyc3QpIHNvdXJjZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHByb2R1Y2VzIGFuIGVsZW1lbnQuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGNvbnRhaW5pbmcgdGhlIHJlc3VsdCBvZiBjb21iaW5pbmcgZWxlbWVudHMgb2YgdGhlIHNvdXJjZXMgdXNpbmcgdGhlIHNwZWNpZmllZCByZXN1bHQgc2VsZWN0b3IgZnVuY3Rpb24uXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8ud2l0aExhdGVzdEZyb20gPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHsgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIGFyZ3VtZW50cycpOyB9XG5cbiAgICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IG5ldyBBcnJheShsZW4pO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykgeyBhcmdzW2ldID0gYXJndW1lbnRzW2ldOyB9XG4gICAgdmFyIHJlc3VsdFNlbGVjdG9yID0gaXNGdW5jdGlvbihhcmdzW2xlbiAtIDFdKSA/IGFyZ3MucG9wKCkgOiBhcmd1bWVudHNUb0FycmF5O1xuICAgIEFycmF5LmlzQXJyYXkoYXJnc1swXSkgJiYgKGFyZ3MgPSBhcmdzWzBdKTtcblxuICAgIHJldHVybiBuZXcgV2l0aExhdGVzdEZyb21PYnNlcnZhYmxlKHRoaXMsIGFyZ3MsIHJlc3VsdFNlbGVjdG9yKTtcbiAgfTtcblxuICBmdW5jdGlvbiBmYWxzZUZhY3RvcnkoKSB7IHJldHVybiBmYWxzZTsgfVxuICBmdW5jdGlvbiBlbXB0eUFycmF5RmFjdG9yeSgpIHsgcmV0dXJuIFtdOyB9XG5cbiAgdmFyIFppcE9ic2VydmFibGUgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoWmlwT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBaaXBPYnNlcnZhYmxlKHNvdXJjZXMsIHJlc3VsdFNlbGVjdG9yKSB7XG4gICAgICB0aGlzLl9zID0gc291cmNlcztcbiAgICAgIHRoaXMuX2NiID0gcmVzdWx0U2VsZWN0b3I7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBaaXBPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24ob2JzZXJ2ZXIpIHtcbiAgICAgIHZhciBuID0gdGhpcy5fcy5sZW5ndGgsXG4gICAgICAgICAgc3Vic2NyaXB0aW9ucyA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgICBkb25lID0gYXJyYXlJbml0aWFsaXplKG4sIGZhbHNlRmFjdG9yeSksXG4gICAgICAgICAgcSA9IGFycmF5SW5pdGlhbGl6ZShuLCBlbXB0eUFycmF5RmFjdG9yeSk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSB0aGlzLl9zW2ldLCBzYWQgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgICAgc3Vic2NyaXB0aW9uc1tpXSA9IHNhZDtcbiAgICAgICAgaXNQcm9taXNlKHNvdXJjZSkgJiYgKHNvdXJjZSA9IG9ic2VydmFibGVGcm9tUHJvbWlzZShzb3VyY2UpKTtcbiAgICAgICAgc2FkLnNldERpc3Bvc2FibGUoc291cmNlLnN1YnNjcmliZShuZXcgWmlwT2JzZXJ2ZXIob2JzZXJ2ZXIsIGksIHRoaXMsIHEsIGRvbmUpKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgTkFyeURpc3Bvc2FibGUoc3Vic2NyaXB0aW9ucyk7XG4gICAgfTtcblxuICAgIHJldHVybiBaaXBPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIFppcE9ic2VydmVyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhaaXBPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBaaXBPYnNlcnZlcihvLCBpLCBwLCBxLCBkKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX2kgPSBpO1xuICAgICAgdGhpcy5fcCA9IHA7XG4gICAgICB0aGlzLl9xID0gcTtcbiAgICAgIHRoaXMuX2QgPSBkO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbm90RW1wdHkoeCkgeyByZXR1cm4geC5sZW5ndGggPiAwOyB9XG4gICAgZnVuY3Rpb24gc2hpZnRFYWNoKHgpIHsgcmV0dXJuIHguc2hpZnQoKTsgfVxuICAgIGZ1bmN0aW9uIG5vdFRoZVNhbWUoaSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICh4LCBqKSB7XG4gICAgICAgIHJldHVybiBqICE9PSBpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBaaXBPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICB0aGlzLl9xW3RoaXMuX2ldLnB1c2goeCk7XG4gICAgICBpZiAodGhpcy5fcS5ldmVyeShub3RFbXB0eSkpIHtcbiAgICAgICAgdmFyIHF1ZXVlZFZhbHVlcyA9IHRoaXMuX3EubWFwKHNoaWZ0RWFjaCk7XG4gICAgICAgIHZhciByZXMgPSB0cnlDYXRjaCh0aGlzLl9wLl9jYikuYXBwbHkobnVsbCwgcXVldWVkVmFsdWVzKTtcbiAgICAgICAgaWYgKHJlcyA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuX28ub25FcnJvcihyZXMuZSk7IH1cbiAgICAgICAgdGhpcy5fby5vbk5leHQocmVzKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fZC5maWx0ZXIobm90VGhlU2FtZSh0aGlzLl9pKSkuZXZlcnkoaWRlbnRpdHkpKSB7XG4gICAgICAgIHRoaXMuX28ub25Db21wbGV0ZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgWmlwT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuX28ub25FcnJvcihlKTtcbiAgICB9O1xuXG4gICAgWmlwT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuX2RbdGhpcy5faV0gPSB0cnVlO1xuICAgICAgdGhpcy5fZC5ldmVyeShpZGVudGl0eSkgJiYgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gWmlwT2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAgKiBNZXJnZXMgdGhlIHNwZWNpZmllZCBvYnNlcnZhYmxlIHNlcXVlbmNlcyBpbnRvIG9uZSBvYnNlcnZhYmxlIHNlcXVlbmNlIGJ5IHVzaW5nIHRoZSBzZWxlY3RvciBmdW5jdGlvbiB3aGVuZXZlciBhbGwgb2YgdGhlIG9ic2VydmFibGUgc2VxdWVuY2VzIG9yIGFuIGFycmF5IGhhdmUgcHJvZHVjZWQgYW4gZWxlbWVudCBhdCBhIGNvcnJlc3BvbmRpbmcgaW5kZXguXG4gICAqIFRoZSBsYXN0IGVsZW1lbnQgaW4gdGhlIGFyZ3VtZW50cyBtdXN0IGJlIGEgZnVuY3Rpb24gdG8gaW52b2tlIGZvciBlYWNoIHNlcmllcyBvZiBlbGVtZW50cyBhdCBjb3JyZXNwb25kaW5nIGluZGV4ZXMgaW4gdGhlIGFyZ3MuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGNvbnRhaW5pbmcgdGhlIHJlc3VsdCBvZiBjb21iaW5pbmcgZWxlbWVudHMgb2YgdGhlIGFyZ3MgdXNpbmcgdGhlIHNwZWNpZmllZCByZXN1bHQgc2VsZWN0b3IgZnVuY3Rpb24uXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uemlwID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7IHRocm93IG5ldyBFcnJvcignaW52YWxpZCBhcmd1bWVudHMnKTsgfVxuXG4gICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBuZXcgQXJyYXkobGVuKTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHsgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTsgfVxuICAgIHZhciByZXN1bHRTZWxlY3RvciA9IGlzRnVuY3Rpb24oYXJnc1tsZW4gLSAxXSkgPyBhcmdzLnBvcCgpIDogYXJndW1lbnRzVG9BcnJheTtcbiAgICBBcnJheS5pc0FycmF5KGFyZ3NbMF0pICYmIChhcmdzID0gYXJnc1swXSk7XG5cbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICBhcmdzLnVuc2hpZnQocGFyZW50KTtcblxuICAgIHJldHVybiBuZXcgWmlwT2JzZXJ2YWJsZShhcmdzLCByZXN1bHRTZWxlY3Rvcik7XG4gIH07XG5cbiAgLyoqXG4gICAqIE1lcmdlcyB0aGUgc3BlY2lmaWVkIG9ic2VydmFibGUgc2VxdWVuY2VzIGludG8gb25lIG9ic2VydmFibGUgc2VxdWVuY2UgYnkgdXNpbmcgdGhlIHNlbGVjdG9yIGZ1bmN0aW9uIHdoZW5ldmVyIGFsbCBvZiB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZXMgaGF2ZSBwcm9kdWNlZCBhbiBlbGVtZW50IGF0IGEgY29ycmVzcG9uZGluZyBpbmRleC5cbiAgICogQHBhcmFtIGFyZ3VtZW50cyBPYnNlcnZhYmxlIHNvdXJjZXMuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IHJlc3VsdFNlbGVjdG9yIEZ1bmN0aW9uIHRvIGludm9rZSBmb3IgZWFjaCBzZXJpZXMgb2YgZWxlbWVudHMgYXQgY29ycmVzcG9uZGluZyBpbmRleGVzIGluIHRoZSBzb3VyY2VzLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBjb250YWluaW5nIHRoZSByZXN1bHQgb2YgY29tYmluaW5nIGVsZW1lbnRzIG9mIHRoZSBzb3VyY2VzIHVzaW5nIHRoZSBzcGVjaWZpZWQgcmVzdWx0IHNlbGVjdG9yIGZ1bmN0aW9uLlxuICAgKi9cbiAgT2JzZXJ2YWJsZS56aXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBuZXcgQXJyYXkobGVuKTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHsgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTsgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KGFyZ3NbMF0pKSB7XG4gICAgICBhcmdzID0gaXNGdW5jdGlvbihhcmdzWzFdKSA/IGFyZ3NbMF0uY29uY2F0KGFyZ3NbMV0pIDogYXJnc1swXTtcbiAgICB9XG4gICAgdmFyIGZpcnN0ID0gYXJncy5zaGlmdCgpO1xuICAgIHJldHVybiBmaXJzdC56aXAuYXBwbHkoZmlyc3QsIGFyZ3MpO1xuICB9O1xuXG5mdW5jdGlvbiBmYWxzZUZhY3RvcnkoKSB7IHJldHVybiBmYWxzZTsgfVxuZnVuY3Rpb24gZW1wdHlBcnJheUZhY3RvcnkoKSB7IHJldHVybiBbXTsgfVxuZnVuY3Rpb24gYXJndW1lbnRzVG9BcnJheSgpIHtcbiAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBuZXcgQXJyYXkobGVuKTtcbiAgZm9yKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7IGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07IH1cbiAgcmV0dXJuIGFyZ3M7XG59XG5cbnZhciBaaXBJdGVyYWJsZU9ic2VydmFibGUgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gIGluaGVyaXRzKFppcEl0ZXJhYmxlT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgZnVuY3Rpb24gWmlwSXRlcmFibGVPYnNlcnZhYmxlKHNvdXJjZXMsIGNiKSB7XG4gICAgdGhpcy5zb3VyY2VzID0gc291cmNlcztcbiAgICB0aGlzLl9jYiA9IGNiO1xuICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICB9XG5cbiAgWmlwSXRlcmFibGVPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICB2YXIgc291cmNlcyA9IHRoaXMuc291cmNlcywgbGVuID0gc291cmNlcy5sZW5ndGgsIHN1YnNjcmlwdGlvbnMgPSBuZXcgQXJyYXkobGVuKTtcblxuICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgIHE6IGFycmF5SW5pdGlhbGl6ZShsZW4sIGVtcHR5QXJyYXlGYWN0b3J5KSxcbiAgICAgIGRvbmU6IGFycmF5SW5pdGlhbGl6ZShsZW4sIGZhbHNlRmFjdG9yeSksXG4gICAgICBjYjogdGhpcy5fY2IsXG4gICAgICBvOiBvXG4gICAgfTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIChmdW5jdGlvbiAoaSkge1xuICAgICAgICB2YXIgc291cmNlID0gc291cmNlc1tpXSwgc2FkID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG4gICAgICAgIChpc0FycmF5TGlrZShzb3VyY2UpIHx8IGlzSXRlcmFibGUoc291cmNlKSkgJiYgKHNvdXJjZSA9IG9ic2VydmFibGVGcm9tKHNvdXJjZSkpO1xuXG4gICAgICAgIHN1YnNjcmlwdGlvbnNbaV0gPSBzYWQ7XG4gICAgICAgIHNhZC5zZXREaXNwb3NhYmxlKHNvdXJjZS5zdWJzY3JpYmUobmV3IFppcEl0ZXJhYmxlT2JzZXJ2ZXIoc3RhdGUsIGkpKSk7XG4gICAgICB9KGkpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IE5BcnlEaXNwb3NhYmxlKHN1YnNjcmlwdGlvbnMpO1xuICB9O1xuXG4gIHJldHVybiBaaXBJdGVyYWJsZU9ic2VydmFibGU7XG59KE9ic2VydmFibGVCYXNlKSk7XG5cbnZhciBaaXBJdGVyYWJsZU9ic2VydmVyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgaW5oZXJpdHMoWmlwSXRlcmFibGVPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgZnVuY3Rpb24gWmlwSXRlcmFibGVPYnNlcnZlcihzLCBpKSB7XG4gICAgdGhpcy5fcyA9IHM7XG4gICAgdGhpcy5faSA9IGk7XG4gICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gIH1cblxuICBmdW5jdGlvbiBub3RFbXB0eSh4KSB7IHJldHVybiB4Lmxlbmd0aCA+IDA7IH1cbiAgZnVuY3Rpb24gc2hpZnRFYWNoKHgpIHsgcmV0dXJuIHguc2hpZnQoKTsgfVxuICBmdW5jdGlvbiBub3RUaGVTYW1lKGkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHgsIGopIHtcbiAgICAgIHJldHVybiBqICE9PSBpO1xuICAgIH07XG4gIH1cblxuICBaaXBJdGVyYWJsZU9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICB0aGlzLl9zLnFbdGhpcy5faV0ucHVzaCh4KTtcbiAgICBpZiAodGhpcy5fcy5xLmV2ZXJ5KG5vdEVtcHR5KSkge1xuICAgICAgdmFyIHF1ZXVlZFZhbHVlcyA9IHRoaXMuX3MucS5tYXAoc2hpZnRFYWNoKSxcbiAgICAgICAgICByZXMgPSB0cnlDYXRjaCh0aGlzLl9zLmNiKS5hcHBseShudWxsLCBxdWV1ZWRWYWx1ZXMpO1xuICAgICAgaWYgKHJlcyA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuX3Muby5vbkVycm9yKHJlcy5lKTsgfVxuICAgICAgdGhpcy5fcy5vLm9uTmV4dChyZXMpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5fcy5kb25lLmZpbHRlcihub3RUaGVTYW1lKHRoaXMuX2kpKS5ldmVyeShpZGVudGl0eSkpIHtcbiAgICAgIHRoaXMuX3Muby5vbkNvbXBsZXRlZCgpO1xuICAgIH1cbiAgfTtcblxuICBaaXBJdGVyYWJsZU9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7IHRoaXMuX3Muby5vbkVycm9yKGUpOyB9O1xuXG4gIFppcEl0ZXJhYmxlT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9zLmRvbmVbdGhpcy5faV0gPSB0cnVlO1xuICAgIHRoaXMuX3MuZG9uZS5ldmVyeShpZGVudGl0eSkgJiYgdGhpcy5fcy5vLm9uQ29tcGxldGVkKCk7XG4gIH07XG5cbiAgcmV0dXJuIFppcEl0ZXJhYmxlT2JzZXJ2ZXI7XG59KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuLyoqXG4gKiBNZXJnZXMgdGhlIHNwZWNpZmllZCBvYnNlcnZhYmxlIHNlcXVlbmNlcyBpbnRvIG9uZSBvYnNlcnZhYmxlIHNlcXVlbmNlIGJ5IHVzaW5nIHRoZSBzZWxlY3RvciBmdW5jdGlvbiB3aGVuZXZlciBhbGwgb2YgdGhlIG9ic2VydmFibGUgc2VxdWVuY2VzIG9yIGFuIGFycmF5IGhhdmUgcHJvZHVjZWQgYW4gZWxlbWVudCBhdCBhIGNvcnJlc3BvbmRpbmcgaW5kZXguXG4gKiBUaGUgbGFzdCBlbGVtZW50IGluIHRoZSBhcmd1bWVudHMgbXVzdCBiZSBhIGZ1bmN0aW9uIHRvIGludm9rZSBmb3IgZWFjaCBzZXJpZXMgb2YgZWxlbWVudHMgYXQgY29ycmVzcG9uZGluZyBpbmRleGVzIGluIHRoZSBhcmdzLlxuICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgY29udGFpbmluZyB0aGUgcmVzdWx0IG9mIGNvbWJpbmluZyBlbGVtZW50cyBvZiB0aGUgYXJncyB1c2luZyB0aGUgc3BlY2lmaWVkIHJlc3VsdCBzZWxlY3RvciBmdW5jdGlvbi5cbiAqL1xub2JzZXJ2YWJsZVByb3RvLnppcEl0ZXJhYmxlID0gZnVuY3Rpb24gKCkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgeyB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgYXJndW1lbnRzJyk7IH1cblxuICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IG5ldyBBcnJheShsZW4pO1xuICBmb3IodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHsgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTsgfVxuICB2YXIgcmVzdWx0U2VsZWN0b3IgPSBpc0Z1bmN0aW9uKGFyZ3NbbGVuIC0gMV0pID8gYXJncy5wb3AoKSA6IGFyZ3VtZW50c1RvQXJyYXk7XG5cbiAgdmFyIHBhcmVudCA9IHRoaXM7XG4gIGFyZ3MudW5zaGlmdChwYXJlbnQpO1xuICByZXR1cm4gbmV3IFppcEl0ZXJhYmxlT2JzZXJ2YWJsZShhcmdzLCByZXN1bHRTZWxlY3Rvcik7XG59O1xuXG4gIGZ1bmN0aW9uIGFzT2JzZXJ2YWJsZShzb3VyY2UpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gc3Vic2NyaWJlKG8pIHsgcmV0dXJuIHNvdXJjZS5zdWJzY3JpYmUobyk7IH07XG4gIH1cblxuICAvKipcbiAgICogIEhpZGVzIHRoZSBpZGVudGl0eSBvZiBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGhpZGVzIHRoZSBpZGVudGl0eSBvZiB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmFzT2JzZXJ2YWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IEFub255bW91c09ic2VydmFibGUoYXNPYnNlcnZhYmxlKHRoaXMpLCB0aGlzKTtcbiAgfTtcblxuICBmdW5jdGlvbiB0b0FycmF5KHgpIHsgcmV0dXJuIHgudG9BcnJheSgpOyB9XG4gIGZ1bmN0aW9uIG5vdEVtcHR5KHgpIHsgcmV0dXJuIHgubGVuZ3RoID4gMDsgfVxuXG4gIC8qKlxuICAgKiAgUHJvamVjdHMgZWFjaCBlbGVtZW50IG9mIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgaW50byB6ZXJvIG9yIG1vcmUgYnVmZmVycyB3aGljaCBhcmUgcHJvZHVjZWQgYmFzZWQgb24gZWxlbWVudCBjb3VudCBpbmZvcm1hdGlvbi5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGNvdW50IExlbmd0aCBvZiBlYWNoIGJ1ZmZlci5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtza2lwXSBOdW1iZXIgb2YgZWxlbWVudHMgdG8gc2tpcCBiZXR3ZWVuIGNyZWF0aW9uIG9mIGNvbnNlY3V0aXZlIGJ1ZmZlcnMuIElmIG5vdCBwcm92aWRlZCwgZGVmYXVsdHMgdG8gdGhlIGNvdW50LlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBvZiBidWZmZXJzLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmJ1ZmZlcldpdGhDb3VudCA9IG9ic2VydmFibGVQcm90by5idWZmZXJDb3VudCA9IGZ1bmN0aW9uIChjb3VudCwgc2tpcCkge1xuICAgIHR5cGVvZiBza2lwICE9PSAnbnVtYmVyJyAmJiAoc2tpcCA9IGNvdW50KTtcbiAgICByZXR1cm4gdGhpcy53aW5kb3dXaXRoQ291bnQoY291bnQsIHNraXApXG4gICAgICAuZmxhdE1hcCh0b0FycmF5KVxuICAgICAgLmZpbHRlcihub3RFbXB0eSk7XG4gIH07XG5cbiAgdmFyIERlbWF0ZXJpYWxpemVPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhEZW1hdGVyaWFsaXplT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBEZW1hdGVyaWFsaXplT2JzZXJ2YWJsZShzb3VyY2UpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgRGVtYXRlcmlhbGl6ZU9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgRGVtYXRlcmlhbGl6ZU9ic2VydmVyKG8pKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIERlbWF0ZXJpYWxpemVPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIERlbWF0ZXJpYWxpemVPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoRGVtYXRlcmlhbGl6ZU9ic2VydmVyLCBfX3N1cGVyX18pO1xuXG4gICAgZnVuY3Rpb24gRGVtYXRlcmlhbGl6ZU9ic2VydmVyKG8pIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgRGVtYXRlcmlhbGl6ZU9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHsgeC5hY2NlcHQodGhpcy5fbyk7IH07XG4gICAgRGVtYXRlcmlhbGl6ZU9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7IHRoaXMuX28ub25FcnJvcihlKTsgfTtcbiAgICBEZW1hdGVyaWFsaXplT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHsgdGhpcy5fby5vbkNvbXBsZXRlZCgpOyB9O1xuXG4gICAgcmV0dXJuIERlbWF0ZXJpYWxpemVPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgLyoqXG4gICAqIERlbWF0ZXJpYWxpemVzIHRoZSBleHBsaWNpdCBub3RpZmljYXRpb24gdmFsdWVzIG9mIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgYXMgaW1wbGljaXQgbm90aWZpY2F0aW9ucy5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgZXhoaWJpdGluZyB0aGUgYmVoYXZpb3IgY29ycmVzcG9uZGluZyB0byB0aGUgc291cmNlIHNlcXVlbmNlJ3Mgbm90aWZpY2F0aW9uIHZhbHVlcy5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5kZW1hdGVyaWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgRGVtYXRlcmlhbGl6ZU9ic2VydmFibGUodGhpcyk7XG4gIH07XG5cbiAgdmFyIERpc3RpbmN0VW50aWxDaGFuZ2VkT2JzZXJ2YWJsZSA9IChmdW5jdGlvbihfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhEaXN0aW5jdFVudGlsQ2hhbmdlZE9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gRGlzdGluY3RVbnRpbENoYW5nZWRPYnNlcnZhYmxlKHNvdXJjZSwga2V5Rm4sIGNvbXBhcmVyKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMua2V5Rm4gPSBrZXlGbjtcbiAgICAgIHRoaXMuY29tcGFyZXIgPSBjb21wYXJlcjtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIERpc3RpbmN0VW50aWxDaGFuZ2VkT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG5ldyBEaXN0aW5jdFVudGlsQ2hhbmdlZE9ic2VydmVyKG8sIHRoaXMua2V5Rm4sIHRoaXMuY29tcGFyZXIpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIERpc3RpbmN0VW50aWxDaGFuZ2VkT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIHZhciBEaXN0aW5jdFVudGlsQ2hhbmdlZE9ic2VydmVyID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKERpc3RpbmN0VW50aWxDaGFuZ2VkT2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gRGlzdGluY3RVbnRpbENoYW5nZWRPYnNlcnZlcihvLCBrZXlGbiwgY29tcGFyZXIpIHtcbiAgICAgIHRoaXMubyA9IG87XG4gICAgICB0aGlzLmtleUZuID0ga2V5Rm47XG4gICAgICB0aGlzLmNvbXBhcmVyID0gY29tcGFyZXI7XG4gICAgICB0aGlzLmhhc0N1cnJlbnRLZXkgPSBmYWxzZTtcbiAgICAgIHRoaXMuY3VycmVudEtleSA9IG51bGw7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBEaXN0aW5jdFVudGlsQ2hhbmdlZE9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgIHZhciBrZXkgPSB4LCBjb21wYXJlckVxdWFscztcbiAgICAgIGlmIChpc0Z1bmN0aW9uKHRoaXMua2V5Rm4pKSB7XG4gICAgICAgIGtleSA9IHRyeUNhdGNoKHRoaXMua2V5Rm4pKHgpO1xuICAgICAgICBpZiAoa2V5ID09PSBlcnJvck9iaikgeyByZXR1cm4gdGhpcy5vLm9uRXJyb3Ioa2V5LmUpOyB9XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5oYXNDdXJyZW50S2V5KSB7XG4gICAgICAgIGNvbXBhcmVyRXF1YWxzID0gdHJ5Q2F0Y2godGhpcy5jb21wYXJlcikodGhpcy5jdXJyZW50S2V5LCBrZXkpO1xuICAgICAgICBpZiAoY29tcGFyZXJFcXVhbHMgPT09IGVycm9yT2JqKSB7IHJldHVybiB0aGlzLm8ub25FcnJvcihjb21wYXJlckVxdWFscy5lKTsgfVxuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLmhhc0N1cnJlbnRLZXkgfHwgIWNvbXBhcmVyRXF1YWxzKSB7XG4gICAgICAgIHRoaXMuaGFzQ3VycmVudEtleSA9IHRydWU7XG4gICAgICAgIHRoaXMuY3VycmVudEtleSA9IGtleTtcbiAgICAgICAgdGhpcy5vLm9uTmV4dCh4KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIERpc3RpbmN0VW50aWxDaGFuZ2VkT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgICAgdGhpcy5vLm9uRXJyb3IoZSk7XG4gICAgfTtcbiAgICBEaXN0aW5jdFVudGlsQ2hhbmdlZE9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLm8ub25Db21wbGV0ZWQoKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIERpc3RpbmN0VW50aWxDaGFuZ2VkT2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAqICBSZXR1cm5zIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBjb250YWlucyBvbmx5IGRpc3RpbmN0IGNvbnRpZ3VvdXMgZWxlbWVudHMgYWNjb3JkaW5nIHRvIHRoZSBrZXlGbiBhbmQgdGhlIGNvbXBhcmVyLlxuICAqIEBwYXJhbSB7RnVuY3Rpb259IFtrZXlGbl0gQSBmdW5jdGlvbiB0byBjb21wdXRlIHRoZSBjb21wYXJpc29uIGtleSBmb3IgZWFjaCBlbGVtZW50LiBJZiBub3QgcHJvdmlkZWQsIGl0IHByb2plY3RzIHRoZSB2YWx1ZS5cbiAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29tcGFyZXJdIEVxdWFsaXR5IGNvbXBhcmVyIGZvciBjb21wdXRlZCBrZXkgdmFsdWVzLiBJZiBub3QgcHJvdmlkZWQsIGRlZmF1bHRzIHRvIGFuIGVxdWFsaXR5IGNvbXBhcmVyIGZ1bmN0aW9uLlxuICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIG9ubHkgY29udGFpbmluZyB0aGUgZGlzdGluY3QgY29udGlndW91cyBlbGVtZW50cywgYmFzZWQgb24gYSBjb21wdXRlZCBrZXkgdmFsdWUsIGZyb20gdGhlIHNvdXJjZSBzZXF1ZW5jZS5cbiAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmRpc3RpbmN0VW50aWxDaGFuZ2VkID0gZnVuY3Rpb24gKGtleUZuLCBjb21wYXJlcikge1xuICAgIGNvbXBhcmVyIHx8IChjb21wYXJlciA9IGRlZmF1bHRDb21wYXJlcik7XG4gICAgcmV0dXJuIG5ldyBEaXN0aW5jdFVudGlsQ2hhbmdlZE9ic2VydmFibGUodGhpcywga2V5Rm4sIGNvbXBhcmVyKTtcbiAgfTtcblxuICB2YXIgVGFwT2JzZXJ2YWJsZSA9IChmdW5jdGlvbihfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhUYXBPYnNlcnZhYmxlLF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gVGFwT2JzZXJ2YWJsZShzb3VyY2UsIG9ic2VydmVyT3JPbk5leHQsIG9uRXJyb3IsIG9uQ29tcGxldGVkKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMuX29OID0gb2JzZXJ2ZXJPck9uTmV4dDtcbiAgICAgIHRoaXMuX29FID0gb25FcnJvcjtcbiAgICAgIHRoaXMuX29DID0gb25Db21wbGV0ZWQ7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBUYXBPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24obykge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgSW5uZXJPYnNlcnZlcihvLCB0aGlzKSk7XG4gICAgfTtcblxuICAgIGluaGVyaXRzKElubmVyT2JzZXJ2ZXIsIEFic3RyYWN0T2JzZXJ2ZXIpO1xuICAgIGZ1bmN0aW9uIElubmVyT2JzZXJ2ZXIobywgcCkge1xuICAgICAgdGhpcy5vID0gbztcbiAgICAgIHRoaXMudCA9ICFwLl9vTiB8fCBpc0Z1bmN0aW9uKHAuX29OKSA/XG4gICAgICAgIG9ic2VydmVyQ3JlYXRlKHAuX29OIHx8IG5vb3AsIHAuX29FIHx8IG5vb3AsIHAuX29DIHx8IG5vb3ApIDpcbiAgICAgICAgcC5fb047XG4gICAgICB0aGlzLmlzU3RvcHBlZCA9IGZhbHNlO1xuICAgICAgQWJzdHJhY3RPYnNlcnZlci5jYWxsKHRoaXMpO1xuICAgIH1cbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oeCkge1xuICAgICAgdmFyIHJlcyA9IHRyeUNhdGNoKHRoaXMudC5vbk5leHQpLmNhbGwodGhpcy50LCB4KTtcbiAgICAgIGlmIChyZXMgPT09IGVycm9yT2JqKSB7IHRoaXMuby5vbkVycm9yKHJlcy5lKTsgfVxuICAgICAgdGhpcy5vLm9uTmV4dCh4KTtcbiAgICB9O1xuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24oZXJyKSB7XG4gICAgICB2YXIgcmVzID0gdHJ5Q2F0Y2godGhpcy50Lm9uRXJyb3IpLmNhbGwodGhpcy50LCBlcnIpO1xuICAgICAgaWYgKHJlcyA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuby5vbkVycm9yKHJlcy5lKTsgfVxuICAgICAgdGhpcy5vLm9uRXJyb3IoZXJyKTtcbiAgICB9O1xuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlcyA9IHRyeUNhdGNoKHRoaXMudC5vbkNvbXBsZXRlZCkuY2FsbCh0aGlzLnQpO1xuICAgICAgaWYgKHJlcyA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuby5vbkVycm9yKHJlcy5lKTsgfVxuICAgICAgdGhpcy5vLm9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIHJldHVybiBUYXBPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgLyoqXG4gICogIEludm9rZXMgYW4gYWN0aW9uIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIG9ic2VydmFibGUgc2VxdWVuY2UgYW5kIGludm9rZXMgYW4gYWN0aW9uIHVwb24gZ3JhY2VmdWwgb3IgZXhjZXB0aW9uYWwgdGVybWluYXRpb24gb2YgdGhlIG9ic2VydmFibGUgc2VxdWVuY2UuXG4gICogIFRoaXMgbWV0aG9kIGNhbiBiZSB1c2VkIGZvciBkZWJ1Z2dpbmcsIGxvZ2dpbmcsIGV0Yy4gb2YgcXVlcnkgYmVoYXZpb3IgYnkgaW50ZXJjZXB0aW5nIHRoZSBtZXNzYWdlIHN0cmVhbSB0byBydW4gYXJiaXRyYXJ5IGFjdGlvbnMgZm9yIG1lc3NhZ2VzIG9uIHRoZSBwaXBlbGluZS5cbiAgKiBAcGFyYW0ge0Z1bmN0aW9uIHwgT2JzZXJ2ZXJ9IG9ic2VydmVyT3JPbk5leHQgQWN0aW9uIHRvIGludm9rZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlIG9yIGFuIG8uXG4gICogQHBhcmFtIHtGdW5jdGlvbn0gW29uRXJyb3JdICBBY3Rpb24gdG8gaW52b2tlIHVwb24gZXhjZXB0aW9uYWwgdGVybWluYXRpb24gb2YgdGhlIG9ic2VydmFibGUgc2VxdWVuY2UuIFVzZWQgaWYgb25seSB0aGUgb2JzZXJ2ZXJPck9uTmV4dCBwYXJhbWV0ZXIgaXMgYWxzbyBhIGZ1bmN0aW9uLlxuICAqIEBwYXJhbSB7RnVuY3Rpb259IFtvbkNvbXBsZXRlZF0gIEFjdGlvbiB0byBpbnZva2UgdXBvbiBncmFjZWZ1bCB0ZXJtaW5hdGlvbiBvZiB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZS4gVXNlZCBpZiBvbmx5IHRoZSBvYnNlcnZlck9yT25OZXh0IHBhcmFtZXRlciBpcyBhbHNvIGEgZnVuY3Rpb24uXG4gICogQHJldHVybnMge09ic2VydmFibGV9IFRoZSBzb3VyY2Ugc2VxdWVuY2Ugd2l0aCB0aGUgc2lkZS1lZmZlY3RpbmcgYmVoYXZpb3IgYXBwbGllZC5cbiAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvWydkbyddID0gb2JzZXJ2YWJsZVByb3RvLnRhcCA9IG9ic2VydmFibGVQcm90by5kb0FjdGlvbiA9IGZ1bmN0aW9uIChvYnNlcnZlck9yT25OZXh0LCBvbkVycm9yLCBvbkNvbXBsZXRlZCkge1xuICAgIHJldHVybiBuZXcgVGFwT2JzZXJ2YWJsZSh0aGlzLCBvYnNlcnZlck9yT25OZXh0LCBvbkVycm9yLCBvbkNvbXBsZXRlZCk7XG4gIH07XG5cbiAgLyoqXG4gICogIEludm9rZXMgYW4gYWN0aW9uIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIG9ic2VydmFibGUgc2VxdWVuY2UuXG4gICogIFRoaXMgbWV0aG9kIGNhbiBiZSB1c2VkIGZvciBkZWJ1Z2dpbmcsIGxvZ2dpbmcsIGV0Yy4gb2YgcXVlcnkgYmVoYXZpb3IgYnkgaW50ZXJjZXB0aW5nIHRoZSBtZXNzYWdlIHN0cmVhbSB0byBydW4gYXJiaXRyYXJ5IGFjdGlvbnMgZm9yIG1lc3NhZ2VzIG9uIHRoZSBwaXBlbGluZS5cbiAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvbk5leHQgQWN0aW9uIHRvIGludm9rZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAqIEBwYXJhbSB7QW55fSBbdGhpc0FyZ10gT2JqZWN0IHRvIHVzZSBhcyB0aGlzIHdoZW4gZXhlY3V0aW5nIGNhbGxiYWNrLlxuICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBUaGUgc291cmNlIHNlcXVlbmNlIHdpdGggdGhlIHNpZGUtZWZmZWN0aW5nIGJlaGF2aW9yIGFwcGxpZWQuXG4gICovXG4gIG9ic2VydmFibGVQcm90by5kb09uTmV4dCA9IG9ic2VydmFibGVQcm90by50YXBPbk5leHQgPSBmdW5jdGlvbiAob25OZXh0LCB0aGlzQXJnKSB7XG4gICAgcmV0dXJuIHRoaXMudGFwKHR5cGVvZiB0aGlzQXJnICE9PSAndW5kZWZpbmVkJyA/IGZ1bmN0aW9uICh4KSB7IG9uTmV4dC5jYWxsKHRoaXNBcmcsIHgpOyB9IDogb25OZXh0KTtcbiAgfTtcblxuICAvKipcbiAgKiAgSW52b2tlcyBhbiBhY3Rpb24gdXBvbiBleGNlcHRpb25hbCB0ZXJtaW5hdGlvbiBvZiB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgKiAgVGhpcyBtZXRob2QgY2FuIGJlIHVzZWQgZm9yIGRlYnVnZ2luZywgbG9nZ2luZywgZXRjLiBvZiBxdWVyeSBiZWhhdmlvciBieSBpbnRlcmNlcHRpbmcgdGhlIG1lc3NhZ2Ugc3RyZWFtIHRvIHJ1biBhcmJpdHJhcnkgYWN0aW9ucyBmb3IgbWVzc2FnZXMgb24gdGhlIHBpcGVsaW5lLlxuICAqIEBwYXJhbSB7RnVuY3Rpb259IG9uRXJyb3IgQWN0aW9uIHRvIGludm9rZSB1cG9uIGV4Y2VwdGlvbmFsIHRlcm1pbmF0aW9uIG9mIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAqIEBwYXJhbSB7QW55fSBbdGhpc0FyZ10gT2JqZWN0IHRvIHVzZSBhcyB0aGlzIHdoZW4gZXhlY3V0aW5nIGNhbGxiYWNrLlxuICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBUaGUgc291cmNlIHNlcXVlbmNlIHdpdGggdGhlIHNpZGUtZWZmZWN0aW5nIGJlaGF2aW9yIGFwcGxpZWQuXG4gICovXG4gIG9ic2VydmFibGVQcm90by5kb09uRXJyb3IgPSBvYnNlcnZhYmxlUHJvdG8udGFwT25FcnJvciA9IGZ1bmN0aW9uIChvbkVycm9yLCB0aGlzQXJnKSB7XG4gICAgcmV0dXJuIHRoaXMudGFwKG5vb3AsIHR5cGVvZiB0aGlzQXJnICE9PSAndW5kZWZpbmVkJyA/IGZ1bmN0aW9uIChlKSB7IG9uRXJyb3IuY2FsbCh0aGlzQXJnLCBlKTsgfSA6IG9uRXJyb3IpO1xuICB9O1xuXG4gIC8qKlxuICAqICBJbnZva2VzIGFuIGFjdGlvbiB1cG9uIGdyYWNlZnVsIHRlcm1pbmF0aW9uIG9mIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAqICBUaGlzIG1ldGhvZCBjYW4gYmUgdXNlZCBmb3IgZGVidWdnaW5nLCBsb2dnaW5nLCBldGMuIG9mIHF1ZXJ5IGJlaGF2aW9yIGJ5IGludGVyY2VwdGluZyB0aGUgbWVzc2FnZSBzdHJlYW0gdG8gcnVuIGFyYml0cmFyeSBhY3Rpb25zIGZvciBtZXNzYWdlcyBvbiB0aGUgcGlwZWxpbmUuXG4gICogQHBhcmFtIHtGdW5jdGlvbn0gb25Db21wbGV0ZWQgQWN0aW9uIHRvIGludm9rZSB1cG9uIGdyYWNlZnVsIHRlcm1pbmF0aW9uIG9mIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAqIEBwYXJhbSB7QW55fSBbdGhpc0FyZ10gT2JqZWN0IHRvIHVzZSBhcyB0aGlzIHdoZW4gZXhlY3V0aW5nIGNhbGxiYWNrLlxuICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBUaGUgc291cmNlIHNlcXVlbmNlIHdpdGggdGhlIHNpZGUtZWZmZWN0aW5nIGJlaGF2aW9yIGFwcGxpZWQuXG4gICovXG4gIG9ic2VydmFibGVQcm90by5kb09uQ29tcGxldGVkID0gb2JzZXJ2YWJsZVByb3RvLnRhcE9uQ29tcGxldGVkID0gZnVuY3Rpb24gKG9uQ29tcGxldGVkLCB0aGlzQXJnKSB7XG4gICAgcmV0dXJuIHRoaXMudGFwKG5vb3AsIG51bGwsIHR5cGVvZiB0aGlzQXJnICE9PSAndW5kZWZpbmVkJyA/IGZ1bmN0aW9uICgpIHsgb25Db21wbGV0ZWQuY2FsbCh0aGlzQXJnKTsgfSA6IG9uQ29tcGxldGVkKTtcbiAgfTtcblxuICB2YXIgRmluYWxseU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEZpbmFsbHlPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIEZpbmFsbHlPYnNlcnZhYmxlKHNvdXJjZSwgZm4sIHRoaXNBcmcpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5fZm4gPSBiaW5kQ2FsbGJhY2soZm4sIHRoaXNBcmcsIDApO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgRmluYWxseU9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgdmFyIGQgPSB0cnlDYXRjaCh0aGlzLnNvdXJjZS5zdWJzY3JpYmUpLmNhbGwodGhpcy5zb3VyY2UsIG8pO1xuICAgICAgaWYgKGQgPT09IGVycm9yT2JqKSB7XG4gICAgICAgIHRoaXMuX2ZuKCk7XG4gICAgICAgIHRocm93ZXIoZC5lKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBGaW5hbGx5RGlzcG9zYWJsZShkLCB0aGlzLl9mbik7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIEZpbmFsbHlEaXNwb3NhYmxlKHMsIGZuKSB7XG4gICAgICB0aGlzLmlzRGlzcG9zZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgdGhpcy5fZm4gPSBmbjtcbiAgICB9XG4gICAgRmluYWxseURpc3Bvc2FibGUucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoIXRoaXMuaXNEaXNwb3NlZCkge1xuICAgICAgICB2YXIgcmVzID0gdHJ5Q2F0Y2godGhpcy5fcy5kaXNwb3NlKS5jYWxsKHRoaXMuX3MpO1xuICAgICAgICB0aGlzLl9mbigpO1xuICAgICAgICByZXMgPT09IGVycm9yT2JqICYmIHRocm93ZXIocmVzLmUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gRmluYWxseU9ic2VydmFibGU7XG5cbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIC8qKlxuICAgKiAgSW52b2tlcyBhIHNwZWNpZmllZCBhY3Rpb24gYWZ0ZXIgdGhlIHNvdXJjZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHRlcm1pbmF0ZXMgZ3JhY2VmdWxseSBvciBleGNlcHRpb25hbGx5LlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmaW5hbGx5QWN0aW9uIEFjdGlvbiB0byBpbnZva2UgYWZ0ZXIgdGhlIHNvdXJjZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHRlcm1pbmF0ZXMuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBTb3VyY2Ugc2VxdWVuY2Ugd2l0aCB0aGUgYWN0aW9uLWludm9raW5nIHRlcm1pbmF0aW9uIGJlaGF2aW9yIGFwcGxpZWQuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG9bJ2ZpbmFsbHknXSA9IGZ1bmN0aW9uIChhY3Rpb24sIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gbmV3IEZpbmFsbHlPYnNlcnZhYmxlKHRoaXMsIGFjdGlvbiwgdGhpc0FyZyk7XG4gIH07XG5cbiAgdmFyIElnbm9yZUVsZW1lbnRzT2JzZXJ2YWJsZSA9IChmdW5jdGlvbihfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhJZ25vcmVFbGVtZW50c09ic2VydmFibGUsIF9fc3VwZXJfXyk7XG5cbiAgICBmdW5jdGlvbiBJZ25vcmVFbGVtZW50c09ic2VydmFibGUoc291cmNlKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIElnbm9yZUVsZW1lbnRzT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG5ldyBJbm5lck9ic2VydmVyKG8pKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gSW5uZXJPYnNlcnZlcihvKSB7XG4gICAgICB0aGlzLm8gPSBvO1xuICAgICAgdGhpcy5pc1N0b3BwZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgSW5uZXJPYnNlcnZlci5wcm90b3R5cGUub25OZXh0ID0gbm9vcDtcbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5vbkVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgaWYoIXRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgIHRoaXMuaXNTdG9wcGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5vLm9uRXJyb3IoZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLm9uQ29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYoIXRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgIHRoaXMuaXNTdG9wcGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5vLm9uQ29tcGxldGVkKCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24oKSB7IHRoaXMuaXNTdG9wcGVkID0gdHJ1ZTsgfTtcbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5mYWlsID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIGlmICghdGhpcy5pc1N0b3BwZWQpIHtcbiAgICAgICAgdGhpcy5pc1N0b3BwZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLm9ic2VydmVyLm9uRXJyb3IoZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIHJldHVybiBJZ25vcmVFbGVtZW50c09ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICAvKipcbiAgICogIElnbm9yZXMgYWxsIGVsZW1lbnRzIGluIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgbGVhdmluZyBvbmx5IHRoZSB0ZXJtaW5hdGlvbiBtZXNzYWdlcy5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIGVtcHR5IG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBzaWduYWxzIHRlcm1pbmF0aW9uLCBzdWNjZXNzZnVsIG9yIGV4Y2VwdGlvbmFsLCBvZiB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmlnbm9yZUVsZW1lbnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgSWdub3JlRWxlbWVudHNPYnNlcnZhYmxlKHRoaXMpO1xuICB9O1xuXG4gIHZhciBNYXRlcmlhbGl6ZU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKE1hdGVyaWFsaXplT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBNYXRlcmlhbGl6ZU9ic2VydmFibGUoc291cmNlLCBmbikge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBNYXRlcmlhbGl6ZU9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgTWF0ZXJpYWxpemVPYnNlcnZlcihvKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBNYXRlcmlhbGl6ZU9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgTWF0ZXJpYWxpemVPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoTWF0ZXJpYWxpemVPYnNlcnZlciwgX19zdXBlcl9fKTtcblxuICAgIGZ1bmN0aW9uIE1hdGVyaWFsaXplT2JzZXJ2ZXIobykge1xuICAgICAgdGhpcy5fbyA9IG87XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBNYXRlcmlhbGl6ZU9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHsgdGhpcy5fby5vbk5leHQobm90aWZpY2F0aW9uQ3JlYXRlT25OZXh0KHgpKSB9O1xuICAgIE1hdGVyaWFsaXplT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHsgdGhpcy5fby5vbk5leHQobm90aWZpY2F0aW9uQ3JlYXRlT25FcnJvcihlKSk7IHRoaXMuX28ub25Db21wbGV0ZWQoKTsgfTtcbiAgICBNYXRlcmlhbGl6ZU9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7IHRoaXMuX28ub25OZXh0KG5vdGlmaWNhdGlvbkNyZWF0ZU9uQ29tcGxldGVkKCkpOyB0aGlzLl9vLm9uQ29tcGxldGVkKCk7IH07XG5cbiAgICByZXR1cm4gTWF0ZXJpYWxpemVPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgLyoqXG4gICAqICBNYXRlcmlhbGl6ZXMgdGhlIGltcGxpY2l0IG5vdGlmaWNhdGlvbnMgb2YgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBhcyBleHBsaWNpdCBub3RpZmljYXRpb24gdmFsdWVzLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBjb250YWluaW5nIHRoZSBtYXRlcmlhbGl6ZWQgbm90aWZpY2F0aW9uIHZhbHVlcyBmcm9tIHRoZSBzb3VyY2Ugc2VxdWVuY2UuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8ubWF0ZXJpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBNYXRlcmlhbGl6ZU9ic2VydmFibGUodGhpcyk7XG4gIH07XG5cbiAgLyoqXG4gICAqICBSZXBlYXRzIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlIGEgc3BlY2lmaWVkIG51bWJlciBvZiB0aW1lcy4gSWYgdGhlIHJlcGVhdCBjb3VudCBpcyBub3Qgc3BlY2lmaWVkLCB0aGUgc2VxdWVuY2UgcmVwZWF0cyBpbmRlZmluaXRlbHkuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbcmVwZWF0Q291bnRdICBOdW1iZXIgb2YgdGltZXMgdG8gcmVwZWF0IHRoZSBzZXF1ZW5jZS4gSWYgbm90IHByb3ZpZGVkLCByZXBlYXRzIHRoZSBzZXF1ZW5jZSBpbmRlZmluaXRlbHkuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBUaGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSBwcm9kdWNpbmcgdGhlIGVsZW1lbnRzIG9mIHRoZSBnaXZlbiBzZXF1ZW5jZSByZXBlYXRlZGx5LlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnJlcGVhdCA9IGZ1bmN0aW9uIChyZXBlYXRDb3VudCkge1xuICAgIHJldHVybiBlbnVtZXJhYmxlUmVwZWF0KHRoaXMsIHJlcGVhdENvdW50KS5jb25jYXQoKTtcbiAgfTtcblxuICAvKipcbiAgICogIFJlcGVhdHMgdGhlIHNvdXJjZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHRpbWVzIG9yIHVudGlsIGl0IHN1Y2Nlc3NmdWxseSB0ZXJtaW5hdGVzLiBJZiB0aGUgcmV0cnkgY291bnQgaXMgbm90IHNwZWNpZmllZCwgaXQgcmV0cmllcyBpbmRlZmluaXRlbHkuXG4gICAqICBOb3RlIGlmIHlvdSBlbmNvdW50ZXIgYW4gZXJyb3IgYW5kIHdhbnQgaXQgdG8gcmV0cnkgb25jZSwgdGhlbiB5b3UgbXVzdCB1c2UgLnJldHJ5KDIpO1xuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiAgdmFyIHJlcyA9IHJldHJpZWQgPSByZXRyeS5yZXBlYXQoKTtcbiAgICogIHZhciByZXMgPSByZXRyaWVkID0gcmV0cnkucmVwZWF0KDIpO1xuICAgKiBAcGFyYW0ge051bWJlcn0gW3JldHJ5Q291bnRdICBOdW1iZXIgb2YgdGltZXMgdG8gcmV0cnkgdGhlIHNlcXVlbmNlLiBJZiBub3QgcHJvdmlkZWQsIHJldHJ5IHRoZSBzZXF1ZW5jZSBpbmRlZmluaXRlbHkuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHByb2R1Y2luZyB0aGUgZWxlbWVudHMgb2YgdGhlIGdpdmVuIHNlcXVlbmNlIHJlcGVhdGVkbHkgdW50aWwgaXQgdGVybWluYXRlcyBzdWNjZXNzZnVsbHkuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8ucmV0cnkgPSBmdW5jdGlvbiAocmV0cnlDb3VudCkge1xuICAgIHJldHVybiBlbnVtZXJhYmxlUmVwZWF0KHRoaXMsIHJldHJ5Q291bnQpLmNhdGNoRXJyb3IoKTtcbiAgfTtcblxuICBmdW5jdGlvbiByZXBlYXQodmFsdWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ0BAaXRlcmF0b3InOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiB2YWx1ZSB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgdmFyIFJldHJ5V2hlbk9ic2VydmFibGUgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgZnVuY3Rpb24gY3JlYXRlRGlzcG9zYWJsZShzdGF0ZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNEaXNwb3NlZDogZmFsc2UsXG4gICAgICAgIGRpc3Bvc2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoIXRoaXMuaXNEaXNwb3NlZCkge1xuICAgICAgICAgICAgdGhpcy5pc0Rpc3Bvc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIHN0YXRlLmlzRGlzcG9zZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBSZXRyeVdoZW5PYnNlcnZhYmxlKHNvdXJjZSwgbm90aWZpZXIpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5fbm90aWZpZXIgPSBub3RpZmllcjtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGluaGVyaXRzKFJldHJ5V2hlbk9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG5cbiAgICBSZXRyeVdoZW5PYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciBleGNlcHRpb25zID0gbmV3IFN1YmplY3QoKSxcbiAgICAgICAgbm90aWZpZXIgPSBuZXcgU3ViamVjdCgpLFxuICAgICAgICBoYW5kbGVkID0gdGhpcy5fbm90aWZpZXIoZXhjZXB0aW9ucyksXG4gICAgICAgIG5vdGlmaWNhdGlvbkRpc3Bvc2FibGUgPSBoYW5kbGVkLnN1YnNjcmliZShub3RpZmllcik7XG5cbiAgICAgIHZhciBlID0gdGhpcy5zb3VyY2VbJ0BAaXRlcmF0b3InXSgpO1xuXG4gICAgICB2YXIgc3RhdGUgPSB7IGlzRGlzcG9zZWQ6IGZhbHNlIH0sXG4gICAgICAgIGxhc3RFcnJvcixcbiAgICAgICAgc3Vic2NyaXB0aW9uID0gbmV3IFNlcmlhbERpc3Bvc2FibGUoKTtcbiAgICAgIHZhciBjYW5jZWxhYmxlID0gY3VycmVudFRocmVhZFNjaGVkdWxlci5zY2hlZHVsZVJlY3Vyc2l2ZShudWxsLCBmdW5jdGlvbiAoXywgcmVjdXJzZSkge1xuICAgICAgICBpZiAoc3RhdGUuaXNEaXNwb3NlZCkgeyByZXR1cm47IH1cbiAgICAgICAgdmFyIGN1cnJlbnRJdGVtID0gZS5uZXh0KCk7XG5cbiAgICAgICAgaWYgKGN1cnJlbnRJdGVtLmRvbmUpIHtcbiAgICAgICAgICBpZiAobGFzdEVycm9yKSB7XG4gICAgICAgICAgICBvLm9uRXJyb3IobGFzdEVycm9yKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgby5vbkNvbXBsZXRlZCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBwcm9taXNlXG4gICAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBjdXJyZW50SXRlbS52YWx1ZTtcbiAgICAgICAgaXNQcm9taXNlKGN1cnJlbnRWYWx1ZSkgJiYgKGN1cnJlbnRWYWx1ZSA9IG9ic2VydmFibGVGcm9tUHJvbWlzZShjdXJyZW50VmFsdWUpKTtcblxuICAgICAgICB2YXIgb3V0ZXIgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgICAgdmFyIGlubmVyID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG4gICAgICAgIHN1YnNjcmlwdGlvbi5zZXREaXNwb3NhYmxlKG5ldyBCaW5hcnlEaXNwb3NhYmxlKGlubmVyLCBvdXRlcikpO1xuICAgICAgICBvdXRlci5zZXREaXNwb3NhYmxlKGN1cnJlbnRWYWx1ZS5zdWJzY3JpYmUoXG4gICAgICAgICAgZnVuY3Rpb24oeCkgeyBvLm9uTmV4dCh4KTsgfSxcbiAgICAgICAgICBmdW5jdGlvbiAoZXhuKSB7XG4gICAgICAgICAgICBpbm5lci5zZXREaXNwb3NhYmxlKG5vdGlmaWVyLnN1YnNjcmliZShyZWN1cnNlLCBmdW5jdGlvbihleCkge1xuICAgICAgICAgICAgICBvLm9uRXJyb3IoZXgpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIG8ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgZXhjZXB0aW9ucy5vbk5leHQoZXhuKTtcbiAgICAgICAgICAgIG91dGVyLmRpc3Bvc2UoKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGZ1bmN0aW9uKCkgeyBvLm9uQ29tcGxldGVkKCk7IH0pKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gbmV3IE5BcnlEaXNwb3NhYmxlKFtub3RpZmljYXRpb25EaXNwb3NhYmxlLCBzdWJzY3JpcHRpb24sIGNhbmNlbGFibGUsIGNyZWF0ZURpc3Bvc2FibGUoc3RhdGUpXSk7XG4gICAgfTtcblxuICAgIHJldHVybiBSZXRyeVdoZW5PYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgb2JzZXJ2YWJsZVByb3RvLnJldHJ5V2hlbiA9IGZ1bmN0aW9uIChub3RpZmllcikge1xuICAgIHJldHVybiBuZXcgUmV0cnlXaGVuT2JzZXJ2YWJsZShyZXBlYXQodGhpcyksIG5vdGlmaWVyKTtcbiAgfTtcblxuICBmdW5jdGlvbiByZXBlYXQodmFsdWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ0BAaXRlcmF0b3InOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiB2YWx1ZSB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgdmFyIFJlcGVhdFdoZW5PYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGZ1bmN0aW9uIGNyZWF0ZURpc3Bvc2FibGUoc3RhdGUpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlzRGlzcG9zZWQ6IGZhbHNlLFxuICAgICAgICBkaXNwb3NlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKCF0aGlzLmlzRGlzcG9zZWQpIHtcbiAgICAgICAgICAgIHRoaXMuaXNEaXNwb3NlZCA9IHRydWU7XG4gICAgICAgICAgICBzdGF0ZS5pc0Rpc3Bvc2VkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gUmVwZWF0V2hlbk9ic2VydmFibGUoc291cmNlLCBub3RpZmllcikge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9ub3RpZmllciA9IG5vdGlmaWVyO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgaW5oZXJpdHMoUmVwZWF0V2hlbk9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG5cbiAgICBSZXBlYXRXaGVuT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgY29tcGxldGlvbnMgPSBuZXcgU3ViamVjdCgpLFxuICAgICAgICBub3RpZmllciA9IG5ldyBTdWJqZWN0KCksXG4gICAgICAgIGhhbmRsZWQgPSB0aGlzLl9ub3RpZmllcihjb21wbGV0aW9ucyksXG4gICAgICAgIG5vdGlmaWNhdGlvbkRpc3Bvc2FibGUgPSBoYW5kbGVkLnN1YnNjcmliZShub3RpZmllcik7XG5cbiAgICAgIHZhciBlID0gdGhpcy5zb3VyY2VbJ0BAaXRlcmF0b3InXSgpO1xuXG4gICAgICB2YXIgc3RhdGUgPSB7IGlzRGlzcG9zZWQ6IGZhbHNlIH0sXG4gICAgICAgIGxhc3RFcnJvcixcbiAgICAgICAgc3Vic2NyaXB0aW9uID0gbmV3IFNlcmlhbERpc3Bvc2FibGUoKTtcbiAgICAgIHZhciBjYW5jZWxhYmxlID0gY3VycmVudFRocmVhZFNjaGVkdWxlci5zY2hlZHVsZVJlY3Vyc2l2ZShudWxsLCBmdW5jdGlvbiAoXywgcmVjdXJzZSkge1xuICAgICAgICBpZiAoc3RhdGUuaXNEaXNwb3NlZCkgeyByZXR1cm47IH1cbiAgICAgICAgdmFyIGN1cnJlbnRJdGVtID0gZS5uZXh0KCk7XG5cbiAgICAgICAgaWYgKGN1cnJlbnRJdGVtLmRvbmUpIHtcbiAgICAgICAgICBpZiAobGFzdEVycm9yKSB7XG4gICAgICAgICAgICBvLm9uRXJyb3IobGFzdEVycm9yKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgby5vbkNvbXBsZXRlZCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBwcm9taXNlXG4gICAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBjdXJyZW50SXRlbS52YWx1ZTtcbiAgICAgICAgaXNQcm9taXNlKGN1cnJlbnRWYWx1ZSkgJiYgKGN1cnJlbnRWYWx1ZSA9IG9ic2VydmFibGVGcm9tUHJvbWlzZShjdXJyZW50VmFsdWUpKTtcblxuICAgICAgICB2YXIgb3V0ZXIgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgICAgdmFyIGlubmVyID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG4gICAgICAgIHN1YnNjcmlwdGlvbi5zZXREaXNwb3NhYmxlKG5ldyBCaW5hcnlEaXNwb3NhYmxlKGlubmVyLCBvdXRlcikpO1xuICAgICAgICBvdXRlci5zZXREaXNwb3NhYmxlKGN1cnJlbnRWYWx1ZS5zdWJzY3JpYmUoXG4gICAgICAgICAgZnVuY3Rpb24oeCkgeyBvLm9uTmV4dCh4KTsgfSxcbiAgICAgICAgICBmdW5jdGlvbiAoZXhuKSB7IG8ub25FcnJvcihleG4pOyB9LFxuICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaW5uZXIuc2V0RGlzcG9zYWJsZShub3RpZmllci5zdWJzY3JpYmUocmVjdXJzZSwgZnVuY3Rpb24oZXgpIHtcbiAgICAgICAgICAgICAgby5vbkVycm9yKGV4KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIGNvbXBsZXRpb25zLm9uTmV4dChudWxsKTtcbiAgICAgICAgICAgIG91dGVyLmRpc3Bvc2UoKTtcbiAgICAgICAgICB9KSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIG5ldyBOQXJ5RGlzcG9zYWJsZShbbm90aWZpY2F0aW9uRGlzcG9zYWJsZSwgc3Vic2NyaXB0aW9uLCBjYW5jZWxhYmxlLCBjcmVhdGVEaXNwb3NhYmxlKHN0YXRlKV0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gUmVwZWF0V2hlbk9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICBvYnNlcnZhYmxlUHJvdG8ucmVwZWF0V2hlbiA9IGZ1bmN0aW9uIChub3RpZmllcikge1xuICAgIHJldHVybiBuZXcgUmVwZWF0V2hlbk9ic2VydmFibGUocmVwZWF0KHRoaXMpLCBub3RpZmllcik7XG4gIH07XG5cbiAgdmFyIFNjYW5PYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFNjYW5PYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFNjYW5PYnNlcnZhYmxlKHNvdXJjZSwgYWNjdW11bGF0b3IsIGhhc1NlZWQsIHNlZWQpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5hY2N1bXVsYXRvciA9IGFjY3VtdWxhdG9yO1xuICAgICAgdGhpcy5oYXNTZWVkID0gaGFzU2VlZDtcbiAgICAgIHRoaXMuc2VlZCA9IHNlZWQ7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBTY2FuT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uKG8pIHtcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IFNjYW5PYnNlcnZlcihvLHRoaXMpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFNjYW5PYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIFNjYW5PYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoU2Nhbk9ic2VydmVyLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFNjYW5PYnNlcnZlcihvLCBwYXJlbnQpIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fcCA9IHBhcmVudDtcbiAgICAgIHRoaXMuX2ZuID0gcGFyZW50LmFjY3VtdWxhdG9yO1xuICAgICAgdGhpcy5faHMgPSBwYXJlbnQuaGFzU2VlZDtcbiAgICAgIHRoaXMuX3MgPSBwYXJlbnQuc2VlZDtcbiAgICAgIHRoaXMuX2hhID0gZmFsc2U7XG4gICAgICB0aGlzLl9hID0gbnVsbDtcbiAgICAgIHRoaXMuX2h2ID0gZmFsc2U7XG4gICAgICB0aGlzLl9pID0gMDtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFNjYW5PYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAhdGhpcy5faHYgJiYgKHRoaXMuX2h2ID0gdHJ1ZSk7XG4gICAgICBpZiAodGhpcy5faGEpIHtcbiAgICAgICAgdGhpcy5fYSA9IHRyeUNhdGNoKHRoaXMuX2ZuKSh0aGlzLl9hLCB4LCB0aGlzLl9pLCB0aGlzLl9wKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2EgPSB0aGlzLl9ocyA/IHRyeUNhdGNoKHRoaXMuX2ZuKSh0aGlzLl9zLCB4LCB0aGlzLl9pLCB0aGlzLl9wKSA6IHg7XG4gICAgICAgIHRoaXMuX2hhID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLl9hID09PSBlcnJvck9iaikgeyByZXR1cm4gdGhpcy5fby5vbkVycm9yKHRoaXMuX2EuZSk7IH1cbiAgICAgIHRoaXMuX28ub25OZXh0KHRoaXMuX2EpO1xuICAgICAgdGhpcy5faSsrO1xuICAgIH07XG5cbiAgICBTY2FuT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuX28ub25FcnJvcihlKTtcbiAgICB9O1xuXG4gICAgU2Nhbk9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAhdGhpcy5faHYgJiYgdGhpcy5faHMgJiYgdGhpcy5fby5vbk5leHQodGhpcy5fcyk7XG4gICAgICB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIHJldHVybiBTY2FuT2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAqICBBcHBsaWVzIGFuIGFjY3VtdWxhdG9yIGZ1bmN0aW9uIG92ZXIgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBhbmQgcmV0dXJucyBlYWNoIGludGVybWVkaWF0ZSByZXN1bHQuIFRoZSBvcHRpb25hbCBzZWVkIHZhbHVlIGlzIHVzZWQgYXMgdGhlIGluaXRpYWwgYWNjdW11bGF0b3IgdmFsdWUuXG4gICogIEZvciBhZ2dyZWdhdGlvbiBiZWhhdmlvciB3aXRoIG5vIGludGVybWVkaWF0ZSByZXN1bHRzLCBzZWUgT2JzZXJ2YWJsZS5hZ2dyZWdhdGUuXG4gICogQHBhcmFtIHtNaXhlZH0gW3NlZWRdIFRoZSBpbml0aWFsIGFjY3VtdWxhdG9yIHZhbHVlLlxuICAqIEBwYXJhbSB7RnVuY3Rpb259IGFjY3VtdWxhdG9yIEFuIGFjY3VtdWxhdG9yIGZ1bmN0aW9uIHRvIGJlIGludm9rZWQgb24gZWFjaCBlbGVtZW50LlxuICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGNvbnRhaW5pbmcgdGhlIGFjY3VtdWxhdGVkIHZhbHVlcy5cbiAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnNjYW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGhhc1NlZWQgPSBmYWxzZSwgc2VlZCwgYWNjdW11bGF0b3IgPSBhcmd1bWVudHNbMF07XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICAgIGhhc1NlZWQgPSB0cnVlO1xuICAgICAgc2VlZCA9IGFyZ3VtZW50c1sxXTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBTY2FuT2JzZXJ2YWJsZSh0aGlzLCBhY2N1bXVsYXRvciwgaGFzU2VlZCwgc2VlZCk7XG4gIH07XG5cbiAgdmFyIFNraXBMYXN0T2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoU2tpcExhc3RPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFNraXBMYXN0T2JzZXJ2YWJsZShzb3VyY2UsIGMpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5fYyA9IGM7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBTa2lwTGFzdE9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgU2tpcExhc3RPYnNlcnZlcihvLCB0aGlzLl9jKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBTa2lwTGFzdE9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgU2tpcExhc3RPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoU2tpcExhc3RPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBTa2lwTGFzdE9ic2VydmVyKG8sIGMpIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fYyA9IGM7XG4gICAgICB0aGlzLl9xID0gW107XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBTa2lwTGFzdE9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgIHRoaXMuX3EucHVzaCh4KTtcbiAgICAgIHRoaXMuX3EubGVuZ3RoID4gdGhpcy5fYyAmJiB0aGlzLl9vLm9uTmV4dCh0aGlzLl9xLnNoaWZ0KCkpO1xuICAgIH07XG5cbiAgICBTa2lwTGFzdE9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICB0aGlzLl9vLm9uRXJyb3IoZSk7XG4gICAgfTtcblxuICAgIFNraXBMYXN0T2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuX28ub25Db21wbGV0ZWQoKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFNraXBMYXN0T2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAgKiAgQnlwYXNzZXMgYSBzcGVjaWZpZWQgbnVtYmVyIG9mIGVsZW1lbnRzIGF0IHRoZSBlbmQgb2YgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgICogQGRlc2NyaXB0aW9uXG4gICAqICBUaGlzIG9wZXJhdG9yIGFjY3VtdWxhdGVzIGEgcXVldWUgd2l0aCBhIGxlbmd0aCBlbm91Z2ggdG8gc3RvcmUgdGhlIGZpcnN0IGBjb3VudGAgZWxlbWVudHMuIEFzIG1vcmUgZWxlbWVudHMgYXJlXG4gICAqICByZWNlaXZlZCwgZWxlbWVudHMgYXJlIHRha2VuIGZyb20gdGhlIGZyb250IG9mIHRoZSBxdWV1ZSBhbmQgcHJvZHVjZWQgb24gdGhlIHJlc3VsdCBzZXF1ZW5jZS4gVGhpcyBjYXVzZXMgZWxlbWVudHMgdG8gYmUgZGVsYXllZC5cbiAgICogQHBhcmFtIGNvdW50IE51bWJlciBvZiBlbGVtZW50cyB0byBieXBhc3MgYXQgdGhlIGVuZCBvZiB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBjb250YWluaW5nIHRoZSBzb3VyY2Ugc2VxdWVuY2UgZWxlbWVudHMgZXhjZXB0IGZvciB0aGUgYnlwYXNzZWQgb25lcyBhdCB0aGUgZW5kLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnNraXBMYXN0ID0gZnVuY3Rpb24gKGNvdW50KSB7XG4gICAgaWYgKGNvdW50IDwgMCkgeyB0aHJvdyBuZXcgQXJndW1lbnRPdXRPZlJhbmdlRXJyb3IoKTsgfVxuICAgIHJldHVybiBuZXcgU2tpcExhc3RPYnNlcnZhYmxlKHRoaXMsIGNvdW50KTtcbiAgfTtcblxuICAvKipcbiAgICogIFByZXBlbmRzIGEgc2VxdWVuY2Ugb2YgdmFsdWVzIHRvIGFuIG9ic2VydmFibGUgc2VxdWVuY2Ugd2l0aCBhbiBvcHRpb25hbCBzY2hlZHVsZXIgYW5kIGFuIGFyZ3VtZW50IGxpc3Qgb2YgdmFsdWVzIHRvIHByZXBlbmQuXG4gICAqICBAZXhhbXBsZVxuICAgKiAgdmFyIHJlcyA9IHNvdXJjZS5zdGFydFdpdGgoMSwgMiwgMyk7XG4gICAqICB2YXIgcmVzID0gc291cmNlLnN0YXJ0V2l0aChSeC5TY2hlZHVsZXIudGltZW91dCwgMSwgMiwgMyk7XG4gICAqIEBwYXJhbSB7QXJndW1lbnRzfSBhcmdzIFRoZSBzcGVjaWZpZWQgdmFsdWVzIHRvIHByZXBlbmQgdG8gdGhlIG9ic2VydmFibGUgc2VxdWVuY2VcbiAgICogQHJldHVybnMge09ic2VydmFibGV9IFRoZSBzb3VyY2Ugc2VxdWVuY2UgcHJlcGVuZGVkIHdpdGggdGhlIHNwZWNpZmllZCB2YWx1ZXMuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uc3RhcnRXaXRoID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZXMsIHNjaGVkdWxlciwgc3RhcnQgPSAwO1xuICAgIGlmICghIWFyZ3VtZW50cy5sZW5ndGggJiYgaXNTY2hlZHVsZXIoYXJndW1lbnRzWzBdKSkge1xuICAgICAgc2NoZWR1bGVyID0gYXJndW1lbnRzWzBdO1xuICAgICAgc3RhcnQgPSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICBzY2hlZHVsZXIgPSBpbW1lZGlhdGVTY2hlZHVsZXI7XG4gICAgfVxuICAgIGZvcih2YXIgYXJncyA9IFtdLCBpID0gc3RhcnQsIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykgeyBhcmdzLnB1c2goYXJndW1lbnRzW2ldKTsgfVxuICAgIHJldHVybiBvYnNlcnZhYmxlQ29uY2F0LmFwcGx5KG51bGwsIFtvYnNlcnZhYmxlRnJvbUFycmF5KGFyZ3MsIHNjaGVkdWxlciksIHRoaXNdKTtcbiAgfTtcblxuICB2YXIgVGFrZUxhc3RPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoVGFrZUxhc3RPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBUYWtlTGFzdE9ic2VydmVyKG8sIGMpIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fYyA9IGM7XG4gICAgICB0aGlzLl9xID0gW107XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBUYWtlTGFzdE9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgIHRoaXMuX3EucHVzaCh4KTtcbiAgICAgIHRoaXMuX3EubGVuZ3RoID4gdGhpcy5fYyAmJiB0aGlzLl9xLnNoaWZ0KCk7XG4gICAgfTtcblxuICAgIFRha2VMYXN0T2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuX28ub25FcnJvcihlKTtcbiAgICB9O1xuXG4gICAgVGFrZUxhc3RPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgd2hpbGUgKHRoaXMuX3EubGVuZ3RoID4gMCkgeyB0aGlzLl9vLm9uTmV4dCh0aGlzLl9xLnNoaWZ0KCkpOyB9XG4gICAgICB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIHJldHVybiBUYWtlTGFzdE9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogIFJldHVybnMgYSBzcGVjaWZpZWQgbnVtYmVyIG9mIGNvbnRpZ3VvdXMgZWxlbWVudHMgZnJvbSB0aGUgZW5kIG9mIGFuIG9ic2VydmFibGUgc2VxdWVuY2UuXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiAgVGhpcyBvcGVyYXRvciBhY2N1bXVsYXRlcyBhIGJ1ZmZlciB3aXRoIGEgbGVuZ3RoIGVub3VnaCB0byBzdG9yZSBlbGVtZW50cyBjb3VudCBlbGVtZW50cy4gVXBvbiBjb21wbGV0aW9uIG9mXG4gICAqICB0aGUgc291cmNlIHNlcXVlbmNlLCB0aGlzIGJ1ZmZlciBpcyBkcmFpbmVkIG9uIHRoZSByZXN1bHQgc2VxdWVuY2UuIFRoaXMgY2F1c2VzIHRoZSBlbGVtZW50cyB0byBiZSBkZWxheWVkLlxuICAgKiBAcGFyYW0ge051bWJlcn0gY291bnQgTnVtYmVyIG9mIGVsZW1lbnRzIHRvIHRha2UgZnJvbSB0aGUgZW5kIG9mIHRoZSBzb3VyY2Ugc2VxdWVuY2UuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGNvbnRhaW5pbmcgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgZWxlbWVudHMgZnJvbSB0aGUgZW5kIG9mIHRoZSBzb3VyY2Ugc2VxdWVuY2UuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8udGFrZUxhc3QgPSBmdW5jdGlvbiAoY291bnQpIHtcbiAgICBpZiAoY291bnQgPCAwKSB7IHRocm93IG5ldyBBcmd1bWVudE91dE9mUmFuZ2VFcnJvcigpOyB9XG4gICAgdmFyIHNvdXJjZSA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBBbm9ueW1vdXNPYnNlcnZhYmxlKGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gc291cmNlLnN1YnNjcmliZShuZXcgVGFrZUxhc3RPYnNlcnZlcihvLCBjb3VudCkpO1xuICAgIH0sIHNvdXJjZSk7XG4gIH07XG5cbiAgdmFyIFRha2VMYXN0QnVmZmVyT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFRha2VMYXN0QnVmZmVyT2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gVGFrZUxhc3RCdWZmZXJPYnNlcnZlcihvLCBjKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX2MgPSBjO1xuICAgICAgdGhpcy5fcSA9IFtdO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgVGFrZUxhc3RCdWZmZXJPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICB0aGlzLl9xLnB1c2goeCk7XG4gICAgICB0aGlzLl9xLmxlbmd0aCA+IHRoaXMuX2MgJiYgdGhpcy5fcS5zaGlmdCgpO1xuICAgIH07XG5cbiAgICBUYWtlTGFzdEJ1ZmZlck9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICB0aGlzLl9vLm9uRXJyb3IoZSk7XG4gICAgfTtcblxuICAgIFRha2VMYXN0QnVmZmVyT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuX28ub25OZXh0KHRoaXMuX3EpO1xuICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gVGFrZUxhc3RCdWZmZXJPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgLyoqXG4gICAqICBSZXR1cm5zIGFuIGFycmF5IHdpdGggdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgY29udGlndW91cyBlbGVtZW50cyBmcm9tIHRoZSBlbmQgb2YgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqICBUaGlzIG9wZXJhdG9yIGFjY3VtdWxhdGVzIGEgYnVmZmVyIHdpdGggYSBsZW5ndGggZW5vdWdoIHRvIHN0b3JlIGNvdW50IGVsZW1lbnRzLiBVcG9uIGNvbXBsZXRpb24gb2YgdGhlXG4gICAqICBzb3VyY2Ugc2VxdWVuY2UsIHRoaXMgYnVmZmVyIGlzIHByb2R1Y2VkIG9uIHRoZSByZXN1bHQgc2VxdWVuY2UuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBjb3VudCBOdW1iZXIgb2YgZWxlbWVudHMgdG8gdGFrZSBmcm9tIHRoZSBlbmQgb2YgdGhlIHNvdXJjZSBzZXF1ZW5jZS5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgY29udGFpbmluZyBhIHNpbmdsZSBhcnJheSB3aXRoIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGVsZW1lbnRzIGZyb20gdGhlIGVuZCBvZiB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnRha2VMYXN0QnVmZmVyID0gZnVuY3Rpb24gKGNvdW50KSB7XG4gICAgaWYgKGNvdW50IDwgMCkgeyB0aHJvdyBuZXcgQXJndW1lbnRPdXRPZlJhbmdlRXJyb3IoKTsgfVxuICAgIHZhciBzb3VyY2UgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHNvdXJjZS5zdWJzY3JpYmUobmV3IFRha2VMYXN0QnVmZmVyT2JzZXJ2ZXIobywgY291bnQpKTtcbiAgICB9LCBzb3VyY2UpO1xuICB9O1xuXG4gIC8qKlxuICAgKiAgUHJvamVjdHMgZWFjaCBlbGVtZW50IG9mIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgaW50byB6ZXJvIG9yIG1vcmUgd2luZG93cyB3aGljaCBhcmUgcHJvZHVjZWQgYmFzZWQgb24gZWxlbWVudCBjb3VudCBpbmZvcm1hdGlvbi5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGNvdW50IExlbmd0aCBvZiBlYWNoIHdpbmRvdy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtza2lwXSBOdW1iZXIgb2YgZWxlbWVudHMgdG8gc2tpcCBiZXR3ZWVuIGNyZWF0aW9uIG9mIGNvbnNlY3V0aXZlIHdpbmRvd3MuIElmIG5vdCBzcGVjaWZpZWQsIGRlZmF1bHRzIHRvIHRoZSBjb3VudC5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2Ugb2Ygd2luZG93cy5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by53aW5kb3dXaXRoQ291bnQgPSBvYnNlcnZhYmxlUHJvdG8ud2luZG93Q291bnQgPSBmdW5jdGlvbiAoY291bnQsIHNraXApIHtcbiAgICB2YXIgc291cmNlID0gdGhpcztcbiAgICArY291bnQgfHwgKGNvdW50ID0gMCk7XG4gICAgTWF0aC5hYnMoY291bnQpID09PSBJbmZpbml0eSAmJiAoY291bnQgPSAwKTtcbiAgICBpZiAoY291bnQgPD0gMCkgeyB0aHJvdyBuZXcgQXJndW1lbnRPdXRPZlJhbmdlRXJyb3IoKTsgfVxuICAgIHNraXAgPT0gbnVsbCAmJiAoc2tpcCA9IGNvdW50KTtcbiAgICArc2tpcCB8fCAoc2tpcCA9IDApO1xuICAgIE1hdGguYWJzKHNraXApID09PSBJbmZpbml0eSAmJiAoc2tpcCA9IDApO1xuXG4gICAgaWYgKHNraXAgPD0gMCkgeyB0aHJvdyBuZXcgQXJndW1lbnRPdXRPZlJhbmdlRXJyb3IoKTsgfVxuICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbiAob2JzZXJ2ZXIpIHtcbiAgICAgIHZhciBtID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCksXG4gICAgICAgIHJlZkNvdW50RGlzcG9zYWJsZSA9IG5ldyBSZWZDb3VudERpc3Bvc2FibGUobSksXG4gICAgICAgIG4gPSAwLFxuICAgICAgICBxID0gW107XG5cbiAgICAgIGZ1bmN0aW9uIGNyZWF0ZVdpbmRvdyAoKSB7XG4gICAgICAgIHZhciBzID0gbmV3IFN1YmplY3QoKTtcbiAgICAgICAgcS5wdXNoKHMpO1xuICAgICAgICBvYnNlcnZlci5vbk5leHQoYWRkUmVmKHMsIHJlZkNvdW50RGlzcG9zYWJsZSkpO1xuICAgICAgfVxuXG4gICAgICBjcmVhdGVXaW5kb3coKTtcblxuICAgICAgbS5zZXREaXNwb3NhYmxlKHNvdXJjZS5zdWJzY3JpYmUoXG4gICAgICAgIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHEubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHsgcVtpXS5vbk5leHQoeCk7IH1cbiAgICAgICAgICB2YXIgYyA9IG4gLSBjb3VudCArIDE7XG4gICAgICAgICAgYyA+PSAwICYmIGMgJSBza2lwID09PSAwICYmIHEuc2hpZnQoKS5vbkNvbXBsZXRlZCgpO1xuICAgICAgICAgICsrbiAlIHNraXAgPT09IDAgJiYgY3JlYXRlV2luZG93KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgd2hpbGUgKHEubGVuZ3RoID4gMCkgeyBxLnNoaWZ0KCkub25FcnJvcihlKTsgfVxuICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB3aGlsZSAocS5sZW5ndGggPiAwKSB7IHEuc2hpZnQoKS5vbkNvbXBsZXRlZCgpOyB9XG4gICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKTtcbiAgICAgICAgfVxuICAgICAgKSk7XG4gICAgICByZXR1cm4gcmVmQ291bnREaXNwb3NhYmxlO1xuICAgIH0sIHNvdXJjZSk7XG4gIH07XG5cbm9ic2VydmFibGVQcm90by5mbGF0TWFwQ29uY2F0ID0gb2JzZXJ2YWJsZVByb3RvLmNvbmNhdE1hcCA9IGZ1bmN0aW9uKHNlbGVjdG9yLCByZXN1bHRTZWxlY3RvciwgdGhpc0FyZykge1xuICAgIHJldHVybiBuZXcgRmxhdE1hcE9ic2VydmFibGUodGhpcywgc2VsZWN0b3IsIHJlc3VsdFNlbGVjdG9yLCB0aGlzQXJnKS5tZXJnZSgxKTtcbn07XG4gIC8qKlxuICAgKiBQcm9qZWN0cyBlYWNoIG5vdGlmaWNhdGlvbiBvZiBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRvIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgYW5kIGNvbmNhdHMgdGhlIHJlc3VsdGluZyBvYnNlcnZhYmxlIHNlcXVlbmNlcyBpbnRvIG9uZSBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvbk5leHQgQSB0cmFuc2Zvcm0gZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCBlbGVtZW50OyB0aGUgc2Vjb25kIHBhcmFtZXRlciBvZiB0aGUgZnVuY3Rpb24gcmVwcmVzZW50cyB0aGUgaW5kZXggb2YgdGhlIHNvdXJjZSBlbGVtZW50LlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvbkVycm9yIEEgdHJhbnNmb3JtIGZ1bmN0aW9uIHRvIGFwcGx5IHdoZW4gYW4gZXJyb3Igb2NjdXJzIGluIHRoZSBzb3VyY2Ugc2VxdWVuY2UuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG9uQ29tcGxldGVkIEEgdHJhbnNmb3JtIGZ1bmN0aW9uIHRvIGFwcGx5IHdoZW4gdGhlIGVuZCBvZiB0aGUgc291cmNlIHNlcXVlbmNlIGlzIHJlYWNoZWQuXG4gICAqIEBwYXJhbSB7QW55fSBbdGhpc0FyZ10gQW4gb3B0aW9uYWwgXCJ0aGlzXCIgdG8gdXNlIHRvIGludm9rZSBlYWNoIHRyYW5zZm9ybS5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2Ugd2hvc2UgZWxlbWVudHMgYXJlIHRoZSByZXN1bHQgb2YgaW52b2tpbmcgdGhlIG9uZS10by1tYW55IHRyYW5zZm9ybSBmdW5jdGlvbiBjb3JyZXNwb25kaW5nIHRvIGVhY2ggbm90aWZpY2F0aW9uIGluIHRoZSBpbnB1dCBzZXF1ZW5jZS5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5jb25jYXRNYXBPYnNlcnZlciA9IG9ic2VydmFibGVQcm90by5zZWxlY3RDb25jYXRPYnNlcnZlciA9IGZ1bmN0aW9uKG9uTmV4dCwgb25FcnJvciwgb25Db21wbGV0ZWQsIHRoaXNBcmcpIHtcbiAgICB2YXIgc291cmNlID0gdGhpcyxcbiAgICAgICAgb25OZXh0RnVuYyA9IGJpbmRDYWxsYmFjayhvbk5leHQsIHRoaXNBcmcsIDIpLFxuICAgICAgICBvbkVycm9yRnVuYyA9IGJpbmRDYWxsYmFjayhvbkVycm9yLCB0aGlzQXJnLCAxKSxcbiAgICAgICAgb25Db21wbGV0ZWRGdW5jID0gYmluZENhbGxiYWNrKG9uQ29tcGxldGVkLCB0aGlzQXJnLCAwKTtcbiAgICByZXR1cm4gbmV3IEFub255bW91c09ic2VydmFibGUoZnVuY3Rpb24gKG9ic2VydmVyKSB7XG4gICAgICB2YXIgaW5kZXggPSAwO1xuICAgICAgcmV0dXJuIHNvdXJjZS5zdWJzY3JpYmUoXG4gICAgICAgIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gb25OZXh0RnVuYyh4LCBpbmRleCsrKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yKGUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpc1Byb21pc2UocmVzdWx0KSAmJiAocmVzdWx0ID0gb2JzZXJ2YWJsZUZyb21Qcm9taXNlKHJlc3VsdCkpO1xuICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChyZXN1bHQpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gb25FcnJvckZ1bmMoZXJyKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yKGUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpc1Byb21pc2UocmVzdWx0KSAmJiAocmVzdWx0ID0gb2JzZXJ2YWJsZUZyb21Qcm9taXNlKHJlc3VsdCkpO1xuICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChyZXN1bHQpO1xuICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXN1bHQgPSBvbkNvbXBsZXRlZEZ1bmMoKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yKGUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpc1Byb21pc2UocmVzdWx0KSAmJiAocmVzdWx0ID0gb2JzZXJ2YWJsZUZyb21Qcm9taXNlKHJlc3VsdCkpO1xuICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChyZXN1bHQpO1xuICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sIHRoaXMpLmNvbmNhdEFsbCgpO1xuICB9O1xuXG4gIHZhciBEZWZhdWx0SWZFbXB0eU9ic2VydmVyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhEZWZhdWx0SWZFbXB0eU9ic2VydmVyLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIERlZmF1bHRJZkVtcHR5T2JzZXJ2ZXIobywgZCkge1xuICAgICAgdGhpcy5fbyA9IG87XG4gICAgICB0aGlzLl9kID0gZDtcbiAgICAgIHRoaXMuX2YgPSBmYWxzZTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIERlZmF1bHRJZkVtcHR5T2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgdGhpcy5fZiA9IHRydWU7XG4gICAgICB0aGlzLl9vLm9uTmV4dCh4KTtcbiAgICB9O1xuXG4gICAgRGVmYXVsdElmRW1wdHlPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgdGhpcy5fby5vbkVycm9yKGUpO1xuICAgIH07XG5cbiAgICBEZWZhdWx0SWZFbXB0eU9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAhdGhpcy5fZiAmJiB0aGlzLl9vLm9uTmV4dCh0aGlzLl9kKTtcbiAgICAgIHRoaXMuX28ub25Db21wbGV0ZWQoKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIERlZmF1bHRJZkVtcHR5T2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAgKiAgUmV0dXJucyB0aGUgZWxlbWVudHMgb2YgdGhlIHNwZWNpZmllZCBzZXF1ZW5jZSBvciB0aGUgc3BlY2lmaWVkIHZhbHVlIGluIGEgc2luZ2xldG9uIHNlcXVlbmNlIGlmIHRoZSBzZXF1ZW5jZSBpcyBlbXB0eS5cbiAgICpcbiAgICogIHZhciByZXMgPSBvYnMgPSB4cy5kZWZhdWx0SWZFbXB0eSgpO1xuICAgKiAgMiAtIG9icyA9IHhzLmRlZmF1bHRJZkVtcHR5KGZhbHNlKTtcbiAgICpcbiAgICogQG1lbWJlck9mIE9ic2VydmFibGUjXG4gICAqIEBwYXJhbSBkZWZhdWx0VmFsdWUgVGhlIHZhbHVlIHRvIHJldHVybiBpZiB0aGUgc2VxdWVuY2UgaXMgZW1wdHkuIElmIG5vdCBwcm92aWRlZCwgdGhpcyBkZWZhdWx0cyB0byBudWxsLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGNvbnRhaW5zIHRoZSBzcGVjaWZpZWQgZGVmYXVsdCB2YWx1ZSBpZiB0aGUgc291cmNlIGlzIGVtcHR5OyBvdGhlcndpc2UsIHRoZSBlbGVtZW50cyBvZiB0aGUgc291cmNlIGl0c2VsZi5cbiAgICovXG4gICAgb2JzZXJ2YWJsZVByb3RvLmRlZmF1bHRJZkVtcHR5ID0gZnVuY3Rpb24gKGRlZmF1bHRWYWx1ZSkge1xuICAgICAgdmFyIHNvdXJjZSA9IHRoaXM7XG4gICAgICBkZWZhdWx0VmFsdWUgPT09IHVuZGVmaW5lZCAmJiAoZGVmYXVsdFZhbHVlID0gbnVsbCk7XG4gICAgICByZXR1cm4gbmV3IEFub255bW91c09ic2VydmFibGUoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5zdWJzY3JpYmUobmV3IERlZmF1bHRJZkVtcHR5T2JzZXJ2ZXIobywgZGVmYXVsdFZhbHVlKSk7XG4gICAgICB9LCBzb3VyY2UpO1xuICAgIH07XG5cbiAgLy8gU3dhcCBvdXQgZm9yIEFycmF5LmZpbmRJbmRleFxuICBmdW5jdGlvbiBhcnJheUluZGV4T2ZDb21wYXJlcihhcnJheSwgaXRlbSwgY29tcGFyZXIpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChjb21wYXJlcihhcnJheVtpXSwgaXRlbSkpIHsgcmV0dXJuIGk7IH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gSGFzaFNldChjb21wYXJlcikge1xuICAgIHRoaXMuY29tcGFyZXIgPSBjb21wYXJlcjtcbiAgICB0aGlzLnNldCA9IFtdO1xuICB9XG4gIEhhc2hTZXQucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciByZXRWYWx1ZSA9IGFycmF5SW5kZXhPZkNvbXBhcmVyKHRoaXMuc2V0LCB2YWx1ZSwgdGhpcy5jb21wYXJlcikgPT09IC0xO1xuICAgIHJldFZhbHVlICYmIHRoaXMuc2V0LnB1c2godmFsdWUpO1xuICAgIHJldHVybiByZXRWYWx1ZTtcbiAgfTtcblxuICB2YXIgRGlzdGluY3RPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhEaXN0aW5jdE9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gRGlzdGluY3RPYnNlcnZhYmxlKHNvdXJjZSwga2V5Rm4sIGNtcEZuKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMuX2tleUZuID0ga2V5Rm47XG4gICAgICB0aGlzLl9jbXBGbiA9IGNtcEZuO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgRGlzdGluY3RPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IERpc3RpbmN0T2JzZXJ2ZXIobywgdGhpcy5fa2V5Rm4sIHRoaXMuX2NtcEZuKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBEaXN0aW5jdE9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgRGlzdGluY3RPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoRGlzdGluY3RPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBEaXN0aW5jdE9ic2VydmVyKG8sIGtleUZuLCBjbXBGbikge1xuICAgICAgdGhpcy5fbyA9IG87XG4gICAgICB0aGlzLl9rZXlGbiA9IGtleUZuO1xuICAgICAgdGhpcy5faCA9IG5ldyBIYXNoU2V0KGNtcEZuKTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIERpc3RpbmN0T2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgdmFyIGtleSA9IHg7XG4gICAgICBpZiAoaXNGdW5jdGlvbih0aGlzLl9rZXlGbikpIHtcbiAgICAgICAga2V5ID0gdHJ5Q2F0Y2godGhpcy5fa2V5Rm4pKHgpO1xuICAgICAgICBpZiAoa2V5ID09PSBlcnJvck9iaikgeyByZXR1cm4gdGhpcy5fby5vbkVycm9yKGtleS5lKTsgfVxuICAgICAgfVxuICAgICAgdGhpcy5faC5wdXNoKGtleSkgJiYgdGhpcy5fby5vbk5leHQoeCk7XG4gICAgfTtcblxuICAgIERpc3RpbmN0T2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHsgdGhpcy5fby5vbkVycm9yKGUpOyB9O1xuICAgIERpc3RpbmN0T2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHsgdGhpcy5fby5vbkNvbXBsZXRlZCgpOyB9O1xuXG4gICAgcmV0dXJuIERpc3RpbmN0T2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAgKiAgUmV0dXJucyBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgY29udGFpbnMgb25seSBkaXN0aW5jdCBlbGVtZW50cyBhY2NvcmRpbmcgdG8gdGhlIGtleVNlbGVjdG9yIGFuZCB0aGUgY29tcGFyZXIuXG4gICAqICBVc2FnZSBvZiB0aGlzIG9wZXJhdG9yIHNob3VsZCBiZSBjb25zaWRlcmVkIGNhcmVmdWxseSBkdWUgdG8gdGhlIG1haW50ZW5hbmNlIG9mIGFuIGludGVybmFsIGxvb2t1cCBzdHJ1Y3R1cmUgd2hpY2ggY2FuIGdyb3cgbGFyZ2UuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqICB2YXIgcmVzID0gb2JzID0geHMuZGlzdGluY3QoKTtcbiAgICogIDIgLSBvYnMgPSB4cy5kaXN0aW5jdChmdW5jdGlvbiAoeCkgeyByZXR1cm4geC5pZDsgfSk7XG4gICAqICAyIC0gb2JzID0geHMuZGlzdGluY3QoZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHguaWQ7IH0sIGZ1bmN0aW9uIChhLGIpIHsgcmV0dXJuIGEgPT09IGI7IH0pO1xuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBba2V5U2VsZWN0b3JdICBBIGZ1bmN0aW9uIHRvIGNvbXB1dGUgdGhlIGNvbXBhcmlzb24ga2V5IGZvciBlYWNoIGVsZW1lbnQuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb21wYXJlcl0gIFVzZWQgdG8gY29tcGFyZSBpdGVtcyBpbiB0aGUgY29sbGVjdGlvbi5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2Ugb25seSBjb250YWluaW5nIHRoZSBkaXN0aW5jdCBlbGVtZW50cywgYmFzZWQgb24gYSBjb21wdXRlZCBrZXkgdmFsdWUsIGZyb20gdGhlIHNvdXJjZSBzZXF1ZW5jZS5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5kaXN0aW5jdCA9IGZ1bmN0aW9uIChrZXlTZWxlY3RvciwgY29tcGFyZXIpIHtcbiAgICBjb21wYXJlciB8fCAoY29tcGFyZXIgPSBkZWZhdWx0Q29tcGFyZXIpO1xuICAgIHJldHVybiBuZXcgRGlzdGluY3RPYnNlcnZhYmxlKHRoaXMsIGtleVNlbGVjdG9yLCBjb21wYXJlcik7XG4gIH07XG5cbiAgdmFyIE1hcE9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKE1hcE9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG5cbiAgICBmdW5jdGlvbiBNYXBPYnNlcnZhYmxlKHNvdXJjZSwgc2VsZWN0b3IsIHRoaXNBcmcpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5zZWxlY3RvciA9IGJpbmRDYWxsYmFjayhzZWxlY3RvciwgdGhpc0FyZywgMyk7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbm5lck1hcChzZWxlY3Rvciwgc2VsZikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICh4LCBpLCBvKSB7IHJldHVybiBzZWxlY3Rvci5jYWxsKHRoaXMsIHNlbGYuc2VsZWN0b3IoeCwgaSwgbyksIGksIG8pOyB9O1xuICAgIH1cblxuICAgIE1hcE9ic2VydmFibGUucHJvdG90eXBlLmludGVybmFsTWFwID0gZnVuY3Rpb24gKHNlbGVjdG9yLCB0aGlzQXJnKSB7XG4gICAgICByZXR1cm4gbmV3IE1hcE9ic2VydmFibGUodGhpcy5zb3VyY2UsIGlubmVyTWFwKHNlbGVjdG9yLCB0aGlzKSwgdGhpc0FyZyk7XG4gICAgfTtcblxuICAgIE1hcE9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgSW5uZXJPYnNlcnZlcihvLCB0aGlzLnNlbGVjdG9yLCB0aGlzKSk7XG4gICAgfTtcblxuICAgIGluaGVyaXRzKElubmVyT2JzZXJ2ZXIsIEFic3RyYWN0T2JzZXJ2ZXIpO1xuICAgIGZ1bmN0aW9uIElubmVyT2JzZXJ2ZXIobywgc2VsZWN0b3IsIHNvdXJjZSkge1xuICAgICAgdGhpcy5vID0gbztcbiAgICAgIHRoaXMuc2VsZWN0b3IgPSBzZWxlY3RvcjtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5pID0gMDtcbiAgICAgIEFic3RyYWN0T2JzZXJ2ZXIuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oeCkge1xuICAgICAgdmFyIHJlc3VsdCA9IHRyeUNhdGNoKHRoaXMuc2VsZWN0b3IpKHgsIHRoaXMuaSsrLCB0aGlzLnNvdXJjZSk7XG4gICAgICBpZiAocmVzdWx0ID09PSBlcnJvck9iaikgeyByZXR1cm4gdGhpcy5vLm9uRXJyb3IocmVzdWx0LmUpOyB9XG4gICAgICB0aGlzLm8ub25OZXh0KHJlc3VsdCk7XG4gICAgfTtcblxuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuby5vbkVycm9yKGUpO1xuICAgIH07XG5cbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLm8ub25Db21wbGV0ZWQoKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIE1hcE9ic2VydmFibGU7XG5cbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIC8qKlxuICAqIFByb2plY3RzIGVhY2ggZWxlbWVudCBvZiBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGludG8gYSBuZXcgZm9ybSBieSBpbmNvcnBvcmF0aW5nIHRoZSBlbGVtZW50J3MgaW5kZXguXG4gICogQHBhcmFtIHtGdW5jdGlvbn0gc2VsZWN0b3IgQSB0cmFuc2Zvcm0gZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCBzb3VyY2UgZWxlbWVudDsgdGhlIHNlY29uZCBwYXJhbWV0ZXIgb2YgdGhlIGZ1bmN0aW9uIHJlcHJlc2VudHMgdGhlIGluZGV4IG9mIHRoZSBzb3VyY2UgZWxlbWVudC5cbiAgKiBAcGFyYW0ge0FueX0gW3RoaXNBcmddIE9iamVjdCB0byB1c2UgYXMgdGhpcyB3aGVuIGV4ZWN1dGluZyBjYWxsYmFjay5cbiAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB3aG9zZSBlbGVtZW50cyBhcmUgdGhlIHJlc3VsdCBvZiBpbnZva2luZyB0aGUgdHJhbnNmb3JtIGZ1bmN0aW9uIG9uIGVhY2ggZWxlbWVudCBvZiBzb3VyY2UuXG4gICovXG4gIG9ic2VydmFibGVQcm90by5tYXAgPSBvYnNlcnZhYmxlUHJvdG8uc2VsZWN0ID0gZnVuY3Rpb24gKHNlbGVjdG9yLCB0aGlzQXJnKSB7XG4gICAgdmFyIHNlbGVjdG9yRm4gPSB0eXBlb2Ygc2VsZWN0b3IgPT09ICdmdW5jdGlvbicgPyBzZWxlY3RvciA6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHNlbGVjdG9yOyB9O1xuICAgIHJldHVybiB0aGlzIGluc3RhbmNlb2YgTWFwT2JzZXJ2YWJsZSA/XG4gICAgICB0aGlzLmludGVybmFsTWFwKHNlbGVjdG9yRm4sIHRoaXNBcmcpIDpcbiAgICAgIG5ldyBNYXBPYnNlcnZhYmxlKHRoaXMsIHNlbGVjdG9yRm4sIHRoaXNBcmcpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIHBsdWNrZXIoYXJncywgbGVuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIG1hcHBlcih4KSB7XG4gICAgICB2YXIgY3VycmVudFByb3AgPSB4O1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgcCA9IGN1cnJlbnRQcm9wW2FyZ3NbaV1dO1xuICAgICAgICBpZiAodHlwZW9mIHAgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgY3VycmVudFByb3AgPSBwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBjdXJyZW50UHJvcDtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyB0aGUgdmFsdWUgb2YgYSBzcGVjaWZpZWQgbmVzdGVkIHByb3BlcnR5IGZyb20gYWxsIGVsZW1lbnRzIGluXG4gICAqIHRoZSBPYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgKiBAcGFyYW0ge0FyZ3VtZW50c30gYXJndW1lbnRzIFRoZSBuZXN0ZWQgcHJvcGVydGllcyB0byBwbHVjay5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IFJldHVybnMgYSBuZXcgT2JzZXJ2YWJsZSBzZXF1ZW5jZSBvZiBwcm9wZXJ0eSB2YWx1ZXMuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8ucGx1Y2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBuZXcgQXJyYXkobGVuKTtcbiAgICBpZiAobGVuID09PSAwKSB7IHRocm93IG5ldyBFcnJvcignTGlzdCBvZiBwcm9wZXJ0aWVzIGNhbm5vdCBiZSBlbXB0eS4nKTsgfVxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykgeyBhcmdzW2ldID0gYXJndW1lbnRzW2ldOyB9XG4gICAgcmV0dXJuIHRoaXMubWFwKHBsdWNrZXIoYXJncywgbGVuKSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFByb2plY3RzIGVhY2ggbm90aWZpY2F0aW9uIG9mIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgdG8gYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBhbmQgbWVyZ2VzIHRoZSByZXN1bHRpbmcgb2JzZXJ2YWJsZSBzZXF1ZW5jZXMgaW50byBvbmUgb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gb25OZXh0IEEgdHJhbnNmb3JtIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2ggZWxlbWVudDsgdGhlIHNlY29uZCBwYXJhbWV0ZXIgb2YgdGhlIGZ1bmN0aW9uIHJlcHJlc2VudHMgdGhlIGluZGV4IG9mIHRoZSBzb3VyY2UgZWxlbWVudC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gb25FcnJvciBBIHRyYW5zZm9ybSBmdW5jdGlvbiB0byBhcHBseSB3aGVuIGFuIGVycm9yIG9jY3VycyBpbiB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvbkNvbXBsZXRlZCBBIHRyYW5zZm9ybSBmdW5jdGlvbiB0byBhcHBseSB3aGVuIHRoZSBlbmQgb2YgdGhlIHNvdXJjZSBzZXF1ZW5jZSBpcyByZWFjaGVkLlxuICAgKiBAcGFyYW0ge0FueX0gW3RoaXNBcmddIEFuIG9wdGlvbmFsIFwidGhpc1wiIHRvIHVzZSB0byBpbnZva2UgZWFjaCB0cmFuc2Zvcm0uXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdob3NlIGVsZW1lbnRzIGFyZSB0aGUgcmVzdWx0IG9mIGludm9raW5nIHRoZSBvbmUtdG8tbWFueSB0cmFuc2Zvcm0gZnVuY3Rpb24gY29ycmVzcG9uZGluZyB0byBlYWNoIG5vdGlmaWNhdGlvbiBpbiB0aGUgaW5wdXQgc2VxdWVuY2UuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uZmxhdE1hcE9ic2VydmVyID0gb2JzZXJ2YWJsZVByb3RvLnNlbGVjdE1hbnlPYnNlcnZlciA9IGZ1bmN0aW9uIChvbk5leHQsIG9uRXJyb3IsIG9uQ29tcGxldGVkLCB0aGlzQXJnKSB7XG4gICAgdmFyIHNvdXJjZSA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBBbm9ueW1vdXNPYnNlcnZhYmxlKGZ1bmN0aW9uIChvYnNlcnZlcikge1xuICAgICAgdmFyIGluZGV4ID0gMDtcblxuICAgICAgcmV0dXJuIHNvdXJjZS5zdWJzY3JpYmUoXG4gICAgICAgIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gb25OZXh0LmNhbGwodGhpc0FyZywgeCwgaW5kZXgrKyk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaXNQcm9taXNlKHJlc3VsdCkgJiYgKHJlc3VsdCA9IG9ic2VydmFibGVGcm9tUHJvbWlzZShyZXN1bHQpKTtcbiAgICAgICAgICBvYnNlcnZlci5vbk5leHQocmVzdWx0KTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IG9uRXJyb3IuY2FsbCh0aGlzQXJnLCBlcnIpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlzUHJvbWlzZShyZXN1bHQpICYmIChyZXN1bHQgPSBvYnNlcnZhYmxlRnJvbVByb21pc2UocmVzdWx0KSk7XG4gICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KHJlc3VsdCk7XG4gICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IG9uQ29tcGxldGVkLmNhbGwodGhpc0FyZyk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaXNQcm9taXNlKHJlc3VsdCkgJiYgKHJlc3VsdCA9IG9ic2VydmFibGVGcm9tUHJvbWlzZShyZXN1bHQpKTtcbiAgICAgICAgICBvYnNlcnZlci5vbk5leHQocmVzdWx0KTtcbiAgICAgICAgICBvYnNlcnZlci5vbkNvbXBsZXRlZCgpO1xuICAgICAgICB9KTtcbiAgICB9LCBzb3VyY2UpLm1lcmdlQWxsKCk7XG4gIH07XG5cbm9ic2VydmFibGVQcm90by5mbGF0TWFwID0gb2JzZXJ2YWJsZVByb3RvLnNlbGVjdE1hbnkgPSBvYnNlcnZhYmxlUHJvdG8ubWVyZ2VNYXAgPSBmdW5jdGlvbihzZWxlY3RvciwgcmVzdWx0U2VsZWN0b3IsIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gbmV3IEZsYXRNYXBPYnNlcnZhYmxlKHRoaXMsIHNlbGVjdG9yLCByZXN1bHRTZWxlY3RvciwgdGhpc0FyZykubWVyZ2VBbGwoKTtcbn07XG5cbm9ic2VydmFibGVQcm90by5mbGF0TWFwTGF0ZXN0ID0gb2JzZXJ2YWJsZVByb3RvLnN3aXRjaE1hcCA9IGZ1bmN0aW9uKHNlbGVjdG9yLCByZXN1bHRTZWxlY3RvciwgdGhpc0FyZykge1xuICAgIHJldHVybiBuZXcgRmxhdE1hcE9ic2VydmFibGUodGhpcywgc2VsZWN0b3IsIHJlc3VsdFNlbGVjdG9yLCB0aGlzQXJnKS5zd2l0Y2hMYXRlc3QoKTtcbn07XG5cbiAgdmFyIFNraXBPYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFNraXBPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFNraXBPYnNlcnZhYmxlKHNvdXJjZSwgY291bnQpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5fY291bnQgPSBjb3VudDtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFNraXBPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IFNraXBPYnNlcnZlcihvLCB0aGlzLl9jb3VudCkpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBTa2lwT2JzZXJ2ZXIobywgYykge1xuICAgICAgdGhpcy5fbyA9IG87XG4gICAgICB0aGlzLl9yID0gYztcbiAgICAgIEFic3RyYWN0T2JzZXJ2ZXIuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBpbmhlcml0cyhTa2lwT2JzZXJ2ZXIsIEFic3RyYWN0T2JzZXJ2ZXIpO1xuXG4gICAgU2tpcE9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgIGlmICh0aGlzLl9yIDw9IDApIHtcbiAgICAgICAgdGhpcy5fby5vbk5leHQoeCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yLS07XG4gICAgICB9XG4gICAgfTtcbiAgICBTa2lwT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24oZSkgeyB0aGlzLl9vLm9uRXJyb3IoZSk7IH07XG4gICAgU2tpcE9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbigpIHsgdGhpcy5fby5vbkNvbXBsZXRlZCgpOyB9O1xuXG4gICAgcmV0dXJuIFNraXBPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgLyoqXG4gICAqIEJ5cGFzc2VzIGEgc3BlY2lmaWVkIG51bWJlciBvZiBlbGVtZW50cyBpbiBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGFuZCB0aGVuIHJldHVybnMgdGhlIHJlbWFpbmluZyBlbGVtZW50cy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGNvdW50IFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gc2tpcCBiZWZvcmUgcmV0dXJuaW5nIHRoZSByZW1haW5pbmcgZWxlbWVudHMuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgY29udGFpbnMgdGhlIGVsZW1lbnRzIHRoYXQgb2NjdXIgYWZ0ZXIgdGhlIHNwZWNpZmllZCBpbmRleCBpbiB0aGUgaW5wdXQgc2VxdWVuY2UuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uc2tpcCA9IGZ1bmN0aW9uIChjb3VudCkge1xuICAgIGlmIChjb3VudCA8IDApIHsgdGhyb3cgbmV3IEFyZ3VtZW50T3V0T2ZSYW5nZUVycm9yKCk7IH1cbiAgICByZXR1cm4gbmV3IFNraXBPYnNlcnZhYmxlKHRoaXMsIGNvdW50KTtcbiAgfTtcblxuICB2YXIgU2tpcFdoaWxlT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoU2tpcFdoaWxlT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBTa2lwV2hpbGVPYnNlcnZhYmxlKHNvdXJjZSwgZm4pIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5fZm4gPSBmbjtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFNraXBXaGlsZU9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgU2tpcFdoaWxlT2JzZXJ2ZXIobywgdGhpcykpO1xuICAgIH07XG5cbiAgICByZXR1cm4gU2tpcFdoaWxlT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIHZhciBTa2lwV2hpbGVPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoU2tpcFdoaWxlT2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG5cbiAgICBmdW5jdGlvbiBTa2lwV2hpbGVPYnNlcnZlcihvLCBwKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX3AgPSBwO1xuICAgICAgdGhpcy5faSA9IDA7XG4gICAgICB0aGlzLl9yID0gZmFsc2U7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBTa2lwV2hpbGVPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICBpZiAoIXRoaXMuX3IpIHtcbiAgICAgICAgdmFyIHJlcyA9IHRyeUNhdGNoKHRoaXMuX3AuX2ZuKSh4LCB0aGlzLl9pKyssIHRoaXMuX3ApO1xuICAgICAgICBpZiAocmVzID09PSBlcnJvck9iaikgeyByZXR1cm4gdGhpcy5fby5vbkVycm9yKHJlcy5lKTsgfVxuICAgICAgICB0aGlzLl9yID0gIXJlcztcbiAgICAgIH1cbiAgICAgIHRoaXMuX3IgJiYgdGhpcy5fby5vbk5leHQoeCk7XG4gICAgfTtcbiAgICBTa2lwV2hpbGVPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyB0aGlzLl9vLm9uRXJyb3IoZSk7IH07XG4gICAgU2tpcFdoaWxlT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHsgdGhpcy5fby5vbkNvbXBsZXRlZCgpOyB9O1xuXG4gICAgcmV0dXJuIFNraXBXaGlsZU9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogIEJ5cGFzc2VzIGVsZW1lbnRzIGluIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgYXMgbG9uZyBhcyBhIHNwZWNpZmllZCBjb25kaXRpb24gaXMgdHJ1ZSBhbmQgdGhlbiByZXR1cm5zIHRoZSByZW1haW5pbmcgZWxlbWVudHMuXG4gICAqICBUaGUgZWxlbWVudCdzIGluZGV4IGlzIHVzZWQgaW4gdGhlIGxvZ2ljIG9mIHRoZSBwcmVkaWNhdGUgZnVuY3Rpb24uXG4gICAqXG4gICAqICB2YXIgcmVzID0gc291cmNlLnNraXBXaGlsZShmdW5jdGlvbiAodmFsdWUpIHsgcmV0dXJuIHZhbHVlIDwgMTA7IH0pO1xuICAgKiAgdmFyIHJlcyA9IHNvdXJjZS5za2lwV2hpbGUoZnVuY3Rpb24gKHZhbHVlLCBpbmRleCkgeyByZXR1cm4gdmFsdWUgPCAxMCB8fCBpbmRleCA8IDEwOyB9KTtcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gcHJlZGljYXRlIEEgZnVuY3Rpb24gdG8gdGVzdCBlYWNoIGVsZW1lbnQgZm9yIGEgY29uZGl0aW9uOyB0aGUgc2Vjb25kIHBhcmFtZXRlciBvZiB0aGUgZnVuY3Rpb24gcmVwcmVzZW50cyB0aGUgaW5kZXggb2YgdGhlIHNvdXJjZSBlbGVtZW50LlxuICAgKiBAcGFyYW0ge0FueX0gW3RoaXNBcmddIE9iamVjdCB0byB1c2UgYXMgdGhpcyB3aGVuIGV4ZWN1dGluZyBjYWxsYmFjay5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBjb250YWlucyB0aGUgZWxlbWVudHMgZnJvbSB0aGUgaW5wdXQgc2VxdWVuY2Ugc3RhcnRpbmcgYXQgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIGxpbmVhciBzZXJpZXMgdGhhdCBkb2VzIG5vdCBwYXNzIHRoZSB0ZXN0IHNwZWNpZmllZCBieSBwcmVkaWNhdGUuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uc2tpcFdoaWxlID0gZnVuY3Rpb24gKHByZWRpY2F0ZSwgdGhpc0FyZykge1xuICAgIHZhciBmbiA9IGJpbmRDYWxsYmFjayhwcmVkaWNhdGUsIHRoaXNBcmcsIDMpO1xuICAgIHJldHVybiBuZXcgU2tpcFdoaWxlT2JzZXJ2YWJsZSh0aGlzLCBmbik7XG4gIH07XG5cbiAgdmFyIFRha2VPYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFRha2VPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFRha2VPYnNlcnZhYmxlKHNvdXJjZSwgY291bnQpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5fY291bnQgPSBjb3VudDtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFRha2VPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IFRha2VPYnNlcnZlcihvLCB0aGlzLl9jb3VudCkpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBUYWtlT2JzZXJ2ZXIobywgYykge1xuICAgICAgdGhpcy5fbyA9IG87XG4gICAgICB0aGlzLl9jID0gYztcbiAgICAgIHRoaXMuX3IgPSBjO1xuICAgICAgQWJzdHJhY3RPYnNlcnZlci5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGluaGVyaXRzKFRha2VPYnNlcnZlciwgQWJzdHJhY3RPYnNlcnZlcik7XG5cbiAgICBUYWtlT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgaWYgKHRoaXMuX3ItLSA+IDApIHtcbiAgICAgICAgdGhpcy5fby5vbk5leHQoeCk7XG4gICAgICAgIHRoaXMuX3IgPD0gMCAmJiB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIFRha2VPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyB0aGlzLl9vLm9uRXJyb3IoZSk7IH07XG4gICAgVGFrZU9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7IHRoaXMuX28ub25Db21wbGV0ZWQoKTsgfTtcblxuICAgIHJldHVybiBUYWtlT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIC8qKlxuICAgKiAgUmV0dXJucyBhIHNwZWNpZmllZCBudW1iZXIgb2YgY29udGlndW91cyBlbGVtZW50cyBmcm9tIHRoZSBzdGFydCBvZiBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlLCB1c2luZyB0aGUgc3BlY2lmaWVkIHNjaGVkdWxlciBmb3IgdGhlIGVkZ2UgY2FzZSBvZiB0YWtlKDApLlxuICAgKiBAcGFyYW0ge051bWJlcn0gY291bnQgVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZXR1cm4uXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSBTY2hlZHVsZXIgdXNlZCB0byBwcm9kdWNlIGFuIE9uQ29tcGxldGVkIG1lc3NhZ2UgaW4gY2FzZSA8cGFyYW1yZWYgbmFtZT1cImNvdW50IGNvdW50PC9wYXJhbXJlZj4gaXMgc2V0IHRvIDAuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgY29udGFpbnMgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgZWxlbWVudHMgZnJvbSB0aGUgc3RhcnQgb2YgdGhlIGlucHV0IHNlcXVlbmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnRha2UgPSBmdW5jdGlvbiAoY291bnQsIHNjaGVkdWxlcikge1xuICAgIGlmIChjb3VudCA8IDApIHsgdGhyb3cgbmV3IEFyZ3VtZW50T3V0T2ZSYW5nZUVycm9yKCk7IH1cbiAgICBpZiAoY291bnQgPT09IDApIHsgcmV0dXJuIG9ic2VydmFibGVFbXB0eShzY2hlZHVsZXIpOyB9XG4gICAgcmV0dXJuIG5ldyBUYWtlT2JzZXJ2YWJsZSh0aGlzLCBjb3VudCk7XG4gIH07XG5cbiAgdmFyIFRha2VXaGlsZU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFRha2VXaGlsZU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gVGFrZVdoaWxlT2JzZXJ2YWJsZShzb3VyY2UsIGZuKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMuX2ZuID0gZm47XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBUYWtlV2hpbGVPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IFRha2VXaGlsZU9ic2VydmVyKG8sIHRoaXMpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFRha2VXaGlsZU9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgVGFrZVdoaWxlT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFRha2VXaGlsZU9ic2VydmVyLCBfX3N1cGVyX18pO1xuXG4gICAgZnVuY3Rpb24gVGFrZVdoaWxlT2JzZXJ2ZXIobywgcCkge1xuICAgICAgdGhpcy5fbyA9IG87XG4gICAgICB0aGlzLl9wID0gcDtcbiAgICAgIHRoaXMuX2kgPSAwO1xuICAgICAgdGhpcy5fciA9IHRydWU7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBUYWtlV2hpbGVPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICBpZiAodGhpcy5fcikge1xuICAgICAgICB0aGlzLl9yID0gdHJ5Q2F0Y2godGhpcy5fcC5fZm4pKHgsIHRoaXMuX2krKywgdGhpcy5fcCk7XG4gICAgICAgIGlmICh0aGlzLl9yID09PSBlcnJvck9iaikgeyByZXR1cm4gdGhpcy5fby5vbkVycm9yKHRoaXMuX3IuZSk7IH1cbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLl9yKSB7XG4gICAgICAgIHRoaXMuX28ub25OZXh0KHgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgICAgfVxuICAgIH07XG4gICAgVGFrZVdoaWxlT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHsgdGhpcy5fby5vbkVycm9yKGUpOyB9O1xuICAgIFRha2VXaGlsZU9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7IHRoaXMuX28ub25Db21wbGV0ZWQoKTsgfTtcblxuICAgIHJldHVybiBUYWtlV2hpbGVPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgLyoqXG4gICAqICBSZXR1cm5zIGVsZW1lbnRzIGZyb20gYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBhcyBsb25nIGFzIGEgc3BlY2lmaWVkIGNvbmRpdGlvbiBpcyB0cnVlLlxuICAgKiAgVGhlIGVsZW1lbnQncyBpbmRleCBpcyB1c2VkIGluIHRoZSBsb2dpYyBvZiB0aGUgcHJlZGljYXRlIGZ1bmN0aW9uLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBwcmVkaWNhdGUgQSBmdW5jdGlvbiB0byB0ZXN0IGVhY2ggZWxlbWVudCBmb3IgYSBjb25kaXRpb247IHRoZSBzZWNvbmQgcGFyYW1ldGVyIG9mIHRoZSBmdW5jdGlvbiByZXByZXNlbnRzIHRoZSBpbmRleCBvZiB0aGUgc291cmNlIGVsZW1lbnQuXG4gICAqIEBwYXJhbSB7QW55fSBbdGhpc0FyZ10gT2JqZWN0IHRvIHVzZSBhcyB0aGlzIHdoZW4gZXhlY3V0aW5nIGNhbGxiYWNrLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGNvbnRhaW5zIHRoZSBlbGVtZW50cyBmcm9tIHRoZSBpbnB1dCBzZXF1ZW5jZSB0aGF0IG9jY3VyIGJlZm9yZSB0aGUgZWxlbWVudCBhdCB3aGljaCB0aGUgdGVzdCBubyBsb25nZXIgcGFzc2VzLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnRha2VXaGlsZSA9IGZ1bmN0aW9uIChwcmVkaWNhdGUsIHRoaXNBcmcpIHtcbiAgICB2YXIgZm4gPSBiaW5kQ2FsbGJhY2socHJlZGljYXRlLCB0aGlzQXJnLCAzKTtcbiAgICByZXR1cm4gbmV3IFRha2VXaGlsZU9ic2VydmFibGUodGhpcywgZm4pO1xuICB9O1xuXG4gIHZhciBGaWx0ZXJPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhGaWx0ZXJPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuXG4gICAgZnVuY3Rpb24gRmlsdGVyT2JzZXJ2YWJsZShzb3VyY2UsIHByZWRpY2F0ZSwgdGhpc0FyZykge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLnByZWRpY2F0ZSA9IGJpbmRDYWxsYmFjayhwcmVkaWNhdGUsIHRoaXNBcmcsIDMpO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgRmlsdGVyT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG5ldyBJbm5lck9ic2VydmVyKG8sIHRoaXMucHJlZGljYXRlLCB0aGlzKSk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGlubmVyUHJlZGljYXRlKHByZWRpY2F0ZSwgc2VsZikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgsIGksIG8pIHsgcmV0dXJuIHNlbGYucHJlZGljYXRlKHgsIGksIG8pICYmIHByZWRpY2F0ZS5jYWxsKHRoaXMsIHgsIGksIG8pOyB9XG4gICAgfVxuXG4gICAgRmlsdGVyT2JzZXJ2YWJsZS5wcm90b3R5cGUuaW50ZXJuYWxGaWx0ZXIgPSBmdW5jdGlvbihwcmVkaWNhdGUsIHRoaXNBcmcpIHtcbiAgICAgIHJldHVybiBuZXcgRmlsdGVyT2JzZXJ2YWJsZSh0aGlzLnNvdXJjZSwgaW5uZXJQcmVkaWNhdGUocHJlZGljYXRlLCB0aGlzKSwgdGhpc0FyZyk7XG4gICAgfTtcblxuICAgIGluaGVyaXRzKElubmVyT2JzZXJ2ZXIsIEFic3RyYWN0T2JzZXJ2ZXIpO1xuICAgIGZ1bmN0aW9uIElubmVyT2JzZXJ2ZXIobywgcHJlZGljYXRlLCBzb3VyY2UpIHtcbiAgICAgIHRoaXMubyA9IG87XG4gICAgICB0aGlzLnByZWRpY2F0ZSA9IHByZWRpY2F0ZTtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5pID0gMDtcbiAgICAgIEFic3RyYWN0T2JzZXJ2ZXIuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oeCkge1xuICAgICAgdmFyIHNob3VsZFlpZWxkID0gdHJ5Q2F0Y2godGhpcy5wcmVkaWNhdGUpKHgsIHRoaXMuaSsrLCB0aGlzLnNvdXJjZSk7XG4gICAgICBpZiAoc2hvdWxkWWllbGQgPT09IGVycm9yT2JqKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm8ub25FcnJvcihzaG91bGRZaWVsZC5lKTtcbiAgICAgIH1cbiAgICAgIHNob3VsZFlpZWxkICYmIHRoaXMuby5vbk5leHQoeCk7XG4gICAgfTtcblxuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuby5vbkVycm9yKGUpO1xuICAgIH07XG5cbiAgICBJbm5lck9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLm8ub25Db21wbGV0ZWQoKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEZpbHRlck9ic2VydmFibGU7XG5cbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIC8qKlxuICAqICBGaWx0ZXJzIHRoZSBlbGVtZW50cyBvZiBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGJhc2VkIG9uIGEgcHJlZGljYXRlIGJ5IGluY29ycG9yYXRpbmcgdGhlIGVsZW1lbnQncyBpbmRleC5cbiAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBwcmVkaWNhdGUgQSBmdW5jdGlvbiB0byB0ZXN0IGVhY2ggc291cmNlIGVsZW1lbnQgZm9yIGEgY29uZGl0aW9uOyB0aGUgc2Vjb25kIHBhcmFtZXRlciBvZiB0aGUgZnVuY3Rpb24gcmVwcmVzZW50cyB0aGUgaW5kZXggb2YgdGhlIHNvdXJjZSBlbGVtZW50LlxuICAqIEBwYXJhbSB7QW55fSBbdGhpc0FyZ10gT2JqZWN0IHRvIHVzZSBhcyB0aGlzIHdoZW4gZXhlY3V0aW5nIGNhbGxiYWNrLlxuICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgY29udGFpbnMgZWxlbWVudHMgZnJvbSB0aGUgaW5wdXQgc2VxdWVuY2UgdGhhdCBzYXRpc2Z5IHRoZSBjb25kaXRpb24uXG4gICovXG4gIG9ic2VydmFibGVQcm90by5maWx0ZXIgPSBvYnNlcnZhYmxlUHJvdG8ud2hlcmUgPSBmdW5jdGlvbiAocHJlZGljYXRlLCB0aGlzQXJnKSB7XG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBGaWx0ZXJPYnNlcnZhYmxlID8gdGhpcy5pbnRlcm5hbEZpbHRlcihwcmVkaWNhdGUsIHRoaXNBcmcpIDpcbiAgICAgIG5ldyBGaWx0ZXJPYnNlcnZhYmxlKHRoaXMsIHByZWRpY2F0ZSwgdGhpc0FyZyk7XG4gIH07XG5cbiAgdmFyIFRyYW5zZHVjZU9ic2VydmVyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhUcmFuc2R1Y2VPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBUcmFuc2R1Y2VPYnNlcnZlcihvLCB4Zm9ybSkge1xuICAgICAgdGhpcy5fbyA9IG87XG4gICAgICB0aGlzLl94Zm9ybSA9IHhmb3JtO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgVHJhbnNkdWNlT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgdmFyIHJlcyA9IHRyeUNhdGNoKHRoaXMuX3hmb3JtWydAQHRyYW5zZHVjZXIvc3RlcCddKS5jYWxsKHRoaXMuX3hmb3JtLCB0aGlzLl9vLCB4KTtcbiAgICAgIGlmIChyZXMgPT09IGVycm9yT2JqKSB7IHRoaXMuX28ub25FcnJvcihyZXMuZSk7IH1cbiAgICB9O1xuXG4gICAgVHJhbnNkdWNlT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHsgdGhpcy5fby5vbkVycm9yKGUpOyB9O1xuXG4gICAgVHJhbnNkdWNlT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuX3hmb3JtWydAQHRyYW5zZHVjZXIvcmVzdWx0J10odGhpcy5fbyk7XG4gICAgfTtcblxuICAgIHJldHVybiBUcmFuc2R1Y2VPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgZnVuY3Rpb24gdHJhbnNmb3JtRm9yT2JzZXJ2ZXIobykge1xuICAgIHJldHVybiB7XG4gICAgICAnQEB0cmFuc2R1Y2VyL2luaXQnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG87XG4gICAgICB9LFxuICAgICAgJ0BAdHJhbnNkdWNlci9zdGVwJzogZnVuY3Rpb24ob2JzLCBpbnB1dCkge1xuICAgICAgICByZXR1cm4gb2JzLm9uTmV4dChpbnB1dCk7XG4gICAgICB9LFxuICAgICAgJ0BAdHJhbnNkdWNlci9yZXN1bHQnOiBmdW5jdGlvbihvYnMpIHtcbiAgICAgICAgcmV0dXJuIG9icy5vbkNvbXBsZXRlZCgpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRXhlY3V0ZXMgYSB0cmFuc2R1Y2VyIHRvIHRyYW5zZm9ybSB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZVxuICAgKiBAcGFyYW0ge1RyYW5zZHVjZXJ9IHRyYW5zZHVjZXIgQSB0cmFuc2R1Y2VyIHRvIGV4ZWN1dGVcbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIE9ic2VydmFibGUgc2VxdWVuY2UgY29udGFpbmluZyB0aGUgcmVzdWx0cyBmcm9tIHRoZSB0cmFuc2R1Y2VyLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnRyYW5zZHVjZSA9IGZ1bmN0aW9uKHRyYW5zZHVjZXIpIHtcbiAgICB2YXIgc291cmNlID0gdGhpcztcbiAgICByZXR1cm4gbmV3IEFub255bW91c09ic2VydmFibGUoZnVuY3Rpb24obykge1xuICAgICAgdmFyIHhmb3JtID0gdHJhbnNkdWNlcih0cmFuc2Zvcm1Gb3JPYnNlcnZlcihvKSk7XG4gICAgICByZXR1cm4gc291cmNlLnN1YnNjcmliZShuZXcgVHJhbnNkdWNlT2JzZXJ2ZXIobywgeGZvcm0pKTtcbiAgICB9LCBzb3VyY2UpO1xuICB9O1xuXG4gIHZhciBBbm9ueW1vdXNPYnNlcnZhYmxlID0gUnguQW5vbnltb3VzT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoQW5vbnltb3VzT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcblxuICAgIC8vIEZpeCBzdWJzY3JpYmVyIHRvIGNoZWNrIGZvciB1bmRlZmluZWQgb3IgZnVuY3Rpb24gcmV0dXJuZWQgdG8gZGVjb3JhdGUgYXMgRGlzcG9zYWJsZVxuICAgIGZ1bmN0aW9uIGZpeFN1YnNjcmliZXIoc3Vic2NyaWJlcikge1xuICAgICAgcmV0dXJuIHN1YnNjcmliZXIgJiYgaXNGdW5jdGlvbihzdWJzY3JpYmVyLmRpc3Bvc2UpID8gc3Vic2NyaWJlciA6XG4gICAgICAgIGlzRnVuY3Rpb24oc3Vic2NyaWJlcikgPyBkaXNwb3NhYmxlQ3JlYXRlKHN1YnNjcmliZXIpIDogZGlzcG9zYWJsZUVtcHR5O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldERpc3Bvc2FibGUocywgc3RhdGUpIHtcbiAgICAgIHZhciBhZG8gPSBzdGF0ZVswXSwgc2VsZiA9IHN0YXRlWzFdO1xuICAgICAgdmFyIHN1YiA9IHRyeUNhdGNoKHNlbGYuX19zdWJzY3JpYmUpLmNhbGwoc2VsZiwgYWRvKTtcbiAgICAgIGlmIChzdWIgPT09IGVycm9yT2JqICYmICFhZG8uZmFpbChlcnJvck9iai5lKSkgeyB0aHJvd2VyKGVycm9yT2JqLmUpOyB9XG4gICAgICBhZG8uc2V0RGlzcG9zYWJsZShmaXhTdWJzY3JpYmVyKHN1YikpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIEFub255bW91c09ic2VydmFibGUoc3Vic2NyaWJlLCBwYXJlbnQpIHtcbiAgICAgIHRoaXMuc291cmNlID0gcGFyZW50O1xuICAgICAgdGhpcy5fX3N1YnNjcmliZSA9IHN1YnNjcmliZTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIEFub255bW91c09ic2VydmFibGUucHJvdG90eXBlLl9zdWJzY3JpYmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgdmFyIGFkbyA9IG5ldyBBdXRvRGV0YWNoT2JzZXJ2ZXIobyksIHN0YXRlID0gW2FkbywgdGhpc107XG5cbiAgICAgIGlmIChjdXJyZW50VGhyZWFkU2NoZWR1bGVyLnNjaGVkdWxlUmVxdWlyZWQoKSkge1xuICAgICAgICBjdXJyZW50VGhyZWFkU2NoZWR1bGVyLnNjaGVkdWxlKHN0YXRlLCBzZXREaXNwb3NhYmxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNldERpc3Bvc2FibGUobnVsbCwgc3RhdGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFkbztcbiAgICB9O1xuXG4gICAgcmV0dXJuIEFub255bW91c09ic2VydmFibGU7XG5cbiAgfShPYnNlcnZhYmxlKSk7XG5cbiAgdmFyIEF1dG9EZXRhY2hPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoQXV0b0RldGFjaE9ic2VydmVyLCBfX3N1cGVyX18pO1xuXG4gICAgZnVuY3Rpb24gQXV0b0RldGFjaE9ic2VydmVyKG9ic2VydmVyKSB7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICAgIHRoaXMub2JzZXJ2ZXIgPSBvYnNlcnZlcjtcbiAgICAgIHRoaXMubSA9IG5ldyBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSgpO1xuICAgIH1cblxuICAgIHZhciBBdXRvRGV0YWNoT2JzZXJ2ZXJQcm90b3R5cGUgPSBBdXRvRGV0YWNoT2JzZXJ2ZXIucHJvdG90eXBlO1xuXG4gICAgQXV0b0RldGFjaE9ic2VydmVyUHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhciByZXN1bHQgPSB0cnlDYXRjaCh0aGlzLm9ic2VydmVyLm9uTmV4dCkuY2FsbCh0aGlzLm9ic2VydmVyLCB2YWx1ZSk7XG4gICAgICBpZiAocmVzdWx0ID09PSBlcnJvck9iaikge1xuICAgICAgICB0aGlzLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhyb3dlcihyZXN1bHQuZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIEF1dG9EZXRhY2hPYnNlcnZlclByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgIHZhciByZXN1bHQgPSB0cnlDYXRjaCh0aGlzLm9ic2VydmVyLm9uRXJyb3IpLmNhbGwodGhpcy5vYnNlcnZlciwgZXJyKTtcbiAgICAgIHRoaXMuZGlzcG9zZSgpO1xuICAgICAgcmVzdWx0ID09PSBlcnJvck9iaiAmJiB0aHJvd2VyKHJlc3VsdC5lKTtcbiAgICB9O1xuXG4gICAgQXV0b0RldGFjaE9ic2VydmVyUHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciByZXN1bHQgPSB0cnlDYXRjaCh0aGlzLm9ic2VydmVyLm9uQ29tcGxldGVkKS5jYWxsKHRoaXMub2JzZXJ2ZXIpO1xuICAgICAgdGhpcy5kaXNwb3NlKCk7XG4gICAgICByZXN1bHQgPT09IGVycm9yT2JqICYmIHRocm93ZXIocmVzdWx0LmUpO1xuICAgIH07XG5cbiAgICBBdXRvRGV0YWNoT2JzZXJ2ZXJQcm90b3R5cGUuc2V0RGlzcG9zYWJsZSA9IGZ1bmN0aW9uICh2YWx1ZSkgeyB0aGlzLm0uc2V0RGlzcG9zYWJsZSh2YWx1ZSk7IH07XG4gICAgQXV0b0RldGFjaE9ic2VydmVyUHJvdG90eXBlLmdldERpc3Bvc2FibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLm0uZ2V0RGlzcG9zYWJsZSgpOyB9O1xuXG4gICAgQXV0b0RldGFjaE9ic2VydmVyUHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBfX3N1cGVyX18ucHJvdG90eXBlLmRpc3Bvc2UuY2FsbCh0aGlzKTtcbiAgICAgIHRoaXMubS5kaXNwb3NlKCk7XG4gICAgfTtcblxuICAgIHJldHVybiBBdXRvRGV0YWNoT2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIHZhciBJbm5lclN1YnNjcmlwdGlvbiA9IGZ1bmN0aW9uIChzLCBvKSB7XG4gICAgdGhpcy5fcyA9IHM7XG4gICAgdGhpcy5fbyA9IG87XG4gIH07XG5cbiAgSW5uZXJTdWJzY3JpcHRpb24ucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl9zLmlzRGlzcG9zZWQgJiYgdGhpcy5fbyAhPT0gbnVsbCkge1xuICAgICAgdmFyIGlkeCA9IHRoaXMuX3Mub2JzZXJ2ZXJzLmluZGV4T2YodGhpcy5fbyk7XG4gICAgICB0aGlzLl9zLm9ic2VydmVycy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgIHRoaXMuX28gPSBudWxsO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogIFJlcHJlc2VudHMgYW4gb2JqZWN0IHRoYXQgaXMgYm90aCBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGFzIHdlbGwgYXMgYW4gb2JzZXJ2ZXIuXG4gICAqICBFYWNoIG5vdGlmaWNhdGlvbiBpcyBicm9hZGNhc3RlZCB0byBhbGwgc3Vic2NyaWJlZCBvYnNlcnZlcnMuXG4gICAqL1xuICB2YXIgU3ViamVjdCA9IFJ4LlN1YmplY3QgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFN1YmplY3QsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gU3ViamVjdCgpIHtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgICAgdGhpcy5pc0Rpc3Bvc2VkID0gZmFsc2U7XG4gICAgICB0aGlzLmlzU3RvcHBlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5vYnNlcnZlcnMgPSBbXTtcbiAgICAgIHRoaXMuaGFzRXJyb3IgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBhZGRQcm9wZXJ0aWVzKFN1YmplY3QucHJvdG90eXBlLCBPYnNlcnZlci5wcm90b3R5cGUsIHtcbiAgICAgIF9zdWJzY3JpYmU6IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIGNoZWNrRGlzcG9zZWQodGhpcyk7XG4gICAgICAgIGlmICghdGhpcy5pc1N0b3BwZWQpIHtcbiAgICAgICAgICB0aGlzLm9ic2VydmVycy5wdXNoKG8pO1xuICAgICAgICAgIHJldHVybiBuZXcgSW5uZXJTdWJzY3JpcHRpb24odGhpcywgbyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaGFzRXJyb3IpIHtcbiAgICAgICAgICBvLm9uRXJyb3IodGhpcy5lcnJvcik7XG4gICAgICAgICAgcmV0dXJuIGRpc3Bvc2FibGVFbXB0eTtcbiAgICAgICAgfVxuICAgICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKiBJbmRpY2F0ZXMgd2hldGhlciB0aGUgc3ViamVjdCBoYXMgb2JzZXJ2ZXJzIHN1YnNjcmliZWQgdG8gaXQuXG4gICAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gSW5kaWNhdGVzIHdoZXRoZXIgdGhlIHN1YmplY3QgaGFzIG9ic2VydmVycyBzdWJzY3JpYmVkIHRvIGl0LlxuICAgICAgICovXG4gICAgICBoYXNPYnNlcnZlcnM6IGZ1bmN0aW9uICgpIHsgY2hlY2tEaXNwb3NlZCh0aGlzKTsgcmV0dXJuIHRoaXMub2JzZXJ2ZXJzLmxlbmd0aCA+IDA7IH0sXG4gICAgICAvKipcbiAgICAgICAqIE5vdGlmaWVzIGFsbCBzdWJzY3JpYmVkIG9ic2VydmVycyBhYm91dCB0aGUgZW5kIG9mIHRoZSBzZXF1ZW5jZS5cbiAgICAgICAqL1xuICAgICAgb25Db21wbGV0ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2hlY2tEaXNwb3NlZCh0aGlzKTtcbiAgICAgICAgaWYgKCF0aGlzLmlzU3RvcHBlZCkge1xuICAgICAgICAgIHRoaXMuaXNTdG9wcGVkID0gdHJ1ZTtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMCwgb3MgPSBjbG9uZUFycmF5KHRoaXMub2JzZXJ2ZXJzKSwgbGVuID0gb3MubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIG9zW2ldLm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5vYnNlcnZlcnMubGVuZ3RoID0gMDtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIC8qKlxuICAgICAgICogTm90aWZpZXMgYWxsIHN1YnNjcmliZWQgb2JzZXJ2ZXJzIGFib3V0IHRoZSBleGNlcHRpb24uXG4gICAgICAgKiBAcGFyYW0ge01peGVkfSBlcnJvciBUaGUgZXhjZXB0aW9uIHRvIHNlbmQgdG8gYWxsIG9ic2VydmVycy5cbiAgICAgICAqL1xuICAgICAgb25FcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIGNoZWNrRGlzcG9zZWQodGhpcyk7XG4gICAgICAgIGlmICghdGhpcy5pc1N0b3BwZWQpIHtcbiAgICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5lcnJvciA9IGVycm9yO1xuICAgICAgICAgIHRoaXMuaGFzRXJyb3IgPSB0cnVlO1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBvcyA9IGNsb25lQXJyYXkodGhpcy5vYnNlcnZlcnMpLCBsZW4gPSBvcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgb3NbaV0ub25FcnJvcihlcnJvcik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5vYnNlcnZlcnMubGVuZ3RoID0gMDtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIC8qKlxuICAgICAgICogTm90aWZpZXMgYWxsIHN1YnNjcmliZWQgb2JzZXJ2ZXJzIGFib3V0IHRoZSBhcnJpdmFsIG9mIHRoZSBzcGVjaWZpZWQgZWxlbWVudCBpbiB0aGUgc2VxdWVuY2UuXG4gICAgICAgKiBAcGFyYW0ge01peGVkfSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2VuZCB0byBhbGwgb2JzZXJ2ZXJzLlxuICAgICAgICovXG4gICAgICBvbk5leHQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBjaGVja0Rpc3Bvc2VkKHRoaXMpO1xuICAgICAgICBpZiAoIXRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG9zID0gY2xvbmVBcnJheSh0aGlzLm9ic2VydmVycyksIGxlbiA9IG9zLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBvc1tpXS5vbk5leHQodmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIC8qKlxuICAgICAgICogVW5zdWJzY3JpYmUgYWxsIG9ic2VydmVycyBhbmQgcmVsZWFzZSByZXNvdXJjZXMuXG4gICAgICAgKi9cbiAgICAgIGRpc3Bvc2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pc0Rpc3Bvc2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5vYnNlcnZlcnMgPSBudWxsO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHN1YmplY3QgZnJvbSB0aGUgc3BlY2lmaWVkIG9ic2VydmVyIGFuZCBvYnNlcnZhYmxlLlxuICAgICAqIEBwYXJhbSB7T2JzZXJ2ZXJ9IG9ic2VydmVyIFRoZSBvYnNlcnZlciB1c2VkIHRvIHNlbmQgbWVzc2FnZXMgdG8gdGhlIHN1YmplY3QuXG4gICAgICogQHBhcmFtIHtPYnNlcnZhYmxlfSBvYnNlcnZhYmxlIFRoZSBvYnNlcnZhYmxlIHVzZWQgdG8gc3Vic2NyaWJlIHRvIG1lc3NhZ2VzIHNlbnQgZnJvbSB0aGUgc3ViamVjdC5cbiAgICAgKiBAcmV0dXJucyB7U3ViamVjdH0gU3ViamVjdCBpbXBsZW1lbnRlZCB1c2luZyB0aGUgZ2l2ZW4gb2JzZXJ2ZXIgYW5kIG9ic2VydmFibGUuXG4gICAgICovXG4gICAgU3ViamVjdC5jcmVhdGUgPSBmdW5jdGlvbiAob2JzZXJ2ZXIsIG9ic2VydmFibGUpIHtcbiAgICAgIHJldHVybiBuZXcgQW5vbnltb3VzU3ViamVjdChvYnNlcnZlciwgb2JzZXJ2YWJsZSk7XG4gICAgfTtcblxuICAgIHJldHVybiBTdWJqZWN0O1xuICB9KE9ic2VydmFibGUpKTtcblxuICAvKipcbiAgICogIFJlcHJlc2VudHMgdGhlIHJlc3VsdCBvZiBhbiBhc3luY2hyb25vdXMgb3BlcmF0aW9uLlxuICAgKiAgVGhlIGxhc3QgdmFsdWUgYmVmb3JlIHRoZSBPbkNvbXBsZXRlZCBub3RpZmljYXRpb24sIG9yIHRoZSBlcnJvciByZWNlaXZlZCB0aHJvdWdoIE9uRXJyb3IsIGlzIHNlbnQgdG8gYWxsIHN1YnNjcmliZWQgb2JzZXJ2ZXJzLlxuICAgKi9cbiAgdmFyIEFzeW5jU3ViamVjdCA9IFJ4LkFzeW5jU3ViamVjdCA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoQXN5bmNTdWJqZWN0LCBfX3N1cGVyX18pO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHN1YmplY3QgdGhhdCBjYW4gb25seSByZWNlaXZlIG9uZSB2YWx1ZSBhbmQgdGhhdCB2YWx1ZSBpcyBjYWNoZWQgZm9yIGFsbCBmdXR1cmUgb2JzZXJ2YXRpb25zLlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIEFzeW5jU3ViamVjdCgpIHtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgICAgdGhpcy5pc0Rpc3Bvc2VkID0gZmFsc2U7XG4gICAgICB0aGlzLmlzU3RvcHBlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5oYXNWYWx1ZSA9IGZhbHNlO1xuICAgICAgdGhpcy5vYnNlcnZlcnMgPSBbXTtcbiAgICAgIHRoaXMuaGFzRXJyb3IgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBhZGRQcm9wZXJ0aWVzKEFzeW5jU3ViamVjdC5wcm90b3R5cGUsIE9ic2VydmVyLnByb3RvdHlwZSwge1xuICAgICAgX3N1YnNjcmliZTogZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgY2hlY2tEaXNwb3NlZCh0aGlzKTtcblxuICAgICAgICBpZiAoIXRoaXMuaXNTdG9wcGVkKSB7XG4gICAgICAgICAgdGhpcy5vYnNlcnZlcnMucHVzaChvKTtcbiAgICAgICAgICByZXR1cm4gbmV3IElubmVyU3Vic2NyaXB0aW9uKHRoaXMsIG8pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuaGFzRXJyb3IpIHtcbiAgICAgICAgICBvLm9uRXJyb3IodGhpcy5lcnJvcik7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5oYXNWYWx1ZSkge1xuICAgICAgICAgIG8ub25OZXh0KHRoaXMudmFsdWUpO1xuICAgICAgICAgIG8ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGlzcG9zYWJsZUVtcHR5O1xuICAgICAgfSxcbiAgICAgIC8qKlxuICAgICAgICogSW5kaWNhdGVzIHdoZXRoZXIgdGhlIHN1YmplY3QgaGFzIG9ic2VydmVycyBzdWJzY3JpYmVkIHRvIGl0LlxuICAgICAgICogQHJldHVybnMge0Jvb2xlYW59IEluZGljYXRlcyB3aGV0aGVyIHRoZSBzdWJqZWN0IGhhcyBvYnNlcnZlcnMgc3Vic2NyaWJlZCB0byBpdC5cbiAgICAgICAqL1xuICAgICAgaGFzT2JzZXJ2ZXJzOiBmdW5jdGlvbiAoKSB7IGNoZWNrRGlzcG9zZWQodGhpcyk7IHJldHVybiB0aGlzLm9ic2VydmVycy5sZW5ndGggPiAwOyB9LFxuICAgICAgLyoqXG4gICAgICAgKiBOb3RpZmllcyBhbGwgc3Vic2NyaWJlZCBvYnNlcnZlcnMgYWJvdXQgdGhlIGVuZCBvZiB0aGUgc2VxdWVuY2UsIGFsc28gY2F1c2luZyB0aGUgbGFzdCByZWNlaXZlZCB2YWx1ZSB0byBiZSBzZW50IG91dCAoaWYgYW55KS5cbiAgICAgICAqL1xuICAgICAgb25Db21wbGV0ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGksIGxlbjtcbiAgICAgICAgY2hlY2tEaXNwb3NlZCh0aGlzKTtcbiAgICAgICAgaWYgKCF0aGlzLmlzU3RvcHBlZCkge1xuICAgICAgICAgIHRoaXMuaXNTdG9wcGVkID0gdHJ1ZTtcbiAgICAgICAgICB2YXIgb3MgPSBjbG9uZUFycmF5KHRoaXMub2JzZXJ2ZXJzKSwgbGVuID0gb3MubGVuZ3RoO1xuXG4gICAgICAgICAgaWYgKHRoaXMuaGFzVmFsdWUpIHtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICB2YXIgbyA9IG9zW2ldO1xuICAgICAgICAgICAgICBvLm9uTmV4dCh0aGlzLnZhbHVlKTtcbiAgICAgICAgICAgICAgby5vbkNvbXBsZXRlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgb3NbaV0ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLm9ic2VydmVycy5sZW5ndGggPSAwO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKiBOb3RpZmllcyBhbGwgc3Vic2NyaWJlZCBvYnNlcnZlcnMgYWJvdXQgdGhlIGVycm9yLlxuICAgICAgICogQHBhcmFtIHtNaXhlZH0gZXJyb3IgVGhlIEVycm9yIHRvIHNlbmQgdG8gYWxsIG9ic2VydmVycy5cbiAgICAgICAqL1xuICAgICAgb25FcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIGNoZWNrRGlzcG9zZWQodGhpcyk7XG4gICAgICAgIGlmICghdGhpcy5pc1N0b3BwZWQpIHtcbiAgICAgICAgICB0aGlzLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5oYXNFcnJvciA9IHRydWU7XG4gICAgICAgICAgdGhpcy5lcnJvciA9IGVycm9yO1xuXG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG9zID0gY2xvbmVBcnJheSh0aGlzLm9ic2VydmVycyksIGxlbiA9IG9zLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBvc1tpXS5vbkVycm9yKGVycm9yKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLm9ic2VydmVycy5sZW5ndGggPSAwO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKiBTZW5kcyBhIHZhbHVlIHRvIHRoZSBzdWJqZWN0LiBUaGUgbGFzdCB2YWx1ZSByZWNlaXZlZCBiZWZvcmUgc3VjY2Vzc2Z1bCB0ZXJtaW5hdGlvbiB3aWxsIGJlIHNlbnQgdG8gYWxsIHN1YnNjcmliZWQgYW5kIGZ1dHVyZSBvYnNlcnZlcnMuXG4gICAgICAgKiBAcGFyYW0ge01peGVkfSB2YWx1ZSBUaGUgdmFsdWUgdG8gc3RvcmUgaW4gdGhlIHN1YmplY3QuXG4gICAgICAgKi9cbiAgICAgIG9uTmV4dDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGNoZWNrRGlzcG9zZWQodGhpcyk7XG4gICAgICAgIGlmICh0aGlzLmlzU3RvcHBlZCkgeyByZXR1cm47IH1cbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgICAgICB0aGlzLmhhc1ZhbHVlID0gdHJ1ZTtcbiAgICAgIH0sXG4gICAgICAvKipcbiAgICAgICAqIFVuc3Vic2NyaWJlIGFsbCBvYnNlcnZlcnMgYW5kIHJlbGVhc2UgcmVzb3VyY2VzLlxuICAgICAgICovXG4gICAgICBkaXNwb3NlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaXNEaXNwb3NlZCA9IHRydWU7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzID0gbnVsbDtcbiAgICAgICAgdGhpcy5lcnJvciA9IG51bGw7XG4gICAgICAgIHRoaXMudmFsdWUgPSBudWxsO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIEFzeW5jU3ViamVjdDtcbiAgfShPYnNlcnZhYmxlKSk7XG5cbiAgdmFyIEFub255bW91c1N1YmplY3QgPSBSeC5Bbm9ueW1vdXNTdWJqZWN0ID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhBbm9ueW1vdXNTdWJqZWN0LCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIEFub255bW91c1N1YmplY3Qob2JzZXJ2ZXIsIG9ic2VydmFibGUpIHtcbiAgICAgIHRoaXMub2JzZXJ2ZXIgPSBvYnNlcnZlcjtcbiAgICAgIHRoaXMub2JzZXJ2YWJsZSA9IG9ic2VydmFibGU7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBhZGRQcm9wZXJ0aWVzKEFub255bW91c1N1YmplY3QucHJvdG90eXBlLCBPYnNlcnZlci5wcm90b3R5cGUsIHtcbiAgICAgIF9zdWJzY3JpYmU6IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9ic2VydmFibGUuc3Vic2NyaWJlKG8pO1xuICAgICAgfSxcbiAgICAgIG9uQ29tcGxldGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXIub25Db21wbGV0ZWQoKTtcbiAgICAgIH0sXG4gICAgICBvbkVycm9yOiBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlci5vbkVycm9yKGVycm9yKTtcbiAgICAgIH0sXG4gICAgICBvbk5leHQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLm9ic2VydmVyLm9uTmV4dCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gQW5vbnltb3VzU3ViamVjdDtcbiAgfShPYnNlcnZhYmxlKSk7XG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZGVmaW5lLmFtZCA9PSAnb2JqZWN0JyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgcm9vdC5SeCA9IFJ4O1xuXG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIFJ4O1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKGZyZWVFeHBvcnRzICYmIGZyZWVNb2R1bGUpIHtcbiAgICAvLyBpbiBOb2RlLmpzIG9yIFJpbmdvSlNcbiAgICBpZiAobW9kdWxlRXhwb3J0cykge1xuICAgICAgKGZyZWVNb2R1bGUuZXhwb3J0cyA9IFJ4KS5SeCA9IFJ4O1xuICAgIH0gZWxzZSB7XG4gICAgICBmcmVlRXhwb3J0cy5SeCA9IFJ4O1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBpbiBhIGJyb3dzZXIgb3IgUmhpbm9cbiAgICByb290LlJ4ID0gUng7XG4gIH1cblxuICAvLyBBbGwgY29kZSBiZWZvcmUgdGhpcyBwb2ludCB3aWxsIGJlIGZpbHRlcmVkIGZyb20gc3RhY2sgdHJhY2VzLlxuICB2YXIgckVuZGluZ0xpbmUgPSBjYXB0dXJlTGluZSgpO1xuXG59LmNhbGwodGhpcykpO1xuIl19