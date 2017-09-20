// Copyright (c) Microsoft, All rights reserved. See License.txt in the project root for license information.
;
(function (factory) {
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
    // Because of build optimizers
    if (typeof define === 'function' && define.amd) {
        define(['./rx.binding', 'exports'], function (Rx, exports) {
            root.Rx = factory(root, exports, Rx);
            return root.Rx;
        });
    }
    else if (typeof module === 'object' && module && module.exports === freeExports) {
        module.exports = factory(root, module.exports, require('./rx'));
    }
    else {
        root.Rx = factory(root, {}, root.Rx);
    }
}.call(this, function (root, exp, Rx, undefined) {
    // Aliases
    var Observable = Rx.Observable, observableFromPromise = Observable.fromPromise, observableThrow = Observable.throwError, AnonymousObservable = Rx.AnonymousObservable, ObservableBase = Rx.ObservableBase, AsyncSubject = Rx.AsyncSubject, disposableCreate = Rx.Disposable.create, CompositeDisposable = Rx.CompositeDisposable, immediateScheduler = Rx.Scheduler.immediate, defaultScheduler = Rx.Scheduler['default'], inherits = Rx.internals.inherits, isScheduler = Rx.Scheduler.isScheduler, isPromise = Rx.helpers.isPromise, isFunction = Rx.helpers.isFunction, isIterable = Rx.helpers.isIterable, isArrayLike = Rx.helpers.isArrayLike;
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
    Observable.wrap = function (fn) {
        function createObservable() {
            return Observable.spawn.call(this, fn.apply(this, arguments));
        }
        createObservable.__generatorFunction__ = fn;
        return createObservable;
    };
    var spawn = Observable.spawn = function () {
        var gen = arguments[0], self = this, args = [];
        for (var i = 1, len = arguments.length; i < len; i++) {
            args.push(arguments[i]);
        }
        return new AnonymousObservable(function (o) {
            var g = new CompositeDisposable();
            if (isFunction(gen)) {
                gen = gen.apply(self, args);
            }
            if (!gen || !isFunction(gen.next)) {
                o.onNext(gen);
                return o.onCompleted();
            }
            function processGenerator(res) {
                var ret = tryCatch(gen.next).call(gen, res);
                if (ret === errorObj) {
                    return o.onError(ret.e);
                }
                next(ret);
            }
            processGenerator();
            function onError(err) {
                var ret = tryCatch(gen.next).call(gen, err);
                if (ret === errorObj) {
                    return o.onError(ret.e);
                }
                next(ret);
            }
            function next(ret) {
                if (ret.done) {
                    o.onNext(ret.value);
                    o.onCompleted();
                    return;
                }
                var obs = toObservable.call(self, ret.value);
                var value = null;
                var hasValue = false;
                if (Observable.isObservable(obs)) {
                    g.add(obs.subscribe(function (val) {
                        hasValue = true;
                        value = val;
                    }, onError, function () {
                        hasValue && processGenerator(value);
                    }));
                }
                else {
                    onError(new TypeError('type not supported'));
                }
            }
            return g;
        });
    };
    function toObservable(obj) {
        if (!obj) {
            return obj;
        }
        if (Observable.isObservable(obj)) {
            return obj;
        }
        if (isPromise(obj)) {
            return Observable.fromPromise(obj);
        }
        if (isGeneratorFunction(obj) || isGenerator(obj)) {
            return spawn.call(this, obj);
        }
        if (isFunction(obj)) {
            return thunkToObservable.call(this, obj);
        }
        if (isArrayLike(obj) || isIterable(obj)) {
            return arrayToObservable.call(this, obj);
        }
        if (isObject(obj)) {
            return objectToObservable.call(this, obj);
        }
        return obj;
    }
    function arrayToObservable(obj) {
        return Observable.from(obj).concatMap(function (o) {
            if (Observable.isObservable(o) || isObject(o)) {
                return toObservable.call(null, o);
            }
            else {
                return Rx.Observable.just(o);
            }
        }).toArray();
    }
    function objectToObservable(obj) {
        var results = new obj.constructor(), keys = Object.keys(obj), observables = [];
        for (var i = 0, len = keys.length; i < len; i++) {
            var key = keys[i];
            var observable = toObservable.call(this, obj[key]);
            if (observable && Observable.isObservable(observable)) {
                defer(observable, key);
            }
            else {
                results[key] = obj[key];
            }
        }
        return Observable.forkJoin.apply(Observable, observables).map(function () {
            return results;
        });
        function defer(observable, key) {
            results[key] = undefined;
            observables.push(observable.map(function (next) {
                results[key] = next;
            }));
        }
    }
    function thunkToObservable(fn) {
        var self = this;
        return new AnonymousObservable(function (o) {
            fn.call(self, function () {
                var err = arguments[0], res = arguments[1];
                if (err) {
                    return o.onError(err);
                }
                if (arguments.length > 2) {
                    var args = [];
                    for (var i = 1, len = arguments.length; i < len; i++) {
                        args.push(arguments[i]);
                    }
                    res = args;
                }
                o.onNext(res);
                o.onCompleted();
            });
        });
    }
    function isGenerator(obj) {
        return isFunction(obj.next) && isFunction(obj['throw']);
    }
    function isGeneratorFunction(obj) {
        var ctor = obj.constructor;
        if (!ctor) {
            return false;
        }
        if (ctor.name === 'GeneratorFunction' || ctor.displayName === 'GeneratorFunction') {
            return true;
        }
        return isGenerator(ctor.prototype);
    }
    function isObject(val) {
        return Object == val.constructor;
    }
    /**
     * Invokes the specified function asynchronously on the specified scheduler, surfacing the result through an observable sequence.
     *
     * @example
     * var res = Rx.Observable.start(function () { console.log('hello'); });
     * var res = Rx.Observable.start(function () { console.log('hello'); }, Rx.Scheduler.timeout);
     * var res = Rx.Observable.start(function () { this.log('hello'); }, Rx.Scheduler.timeout, console);
     *
     * @param {Function} func Function to run asynchronously.
     * @param {Scheduler} [scheduler]  Scheduler to run the function on. If not specified, defaults to Scheduler.timeout.
     * @param [context]  The context for the func parameter to be executed.  If not specified, defaults to undefined.
     * @returns {Observable} An observable sequence exposing the function's result value, or an exception.
     *
     * Remarks
     * * The function is called immediately, not during the subscription of the resulting sequence.
     * * Multiple subscriptions to the resulting sequence can observe the function's result.
     */
    Observable.start = function (func, context, scheduler) {
        return observableToAsync(func, context, scheduler)();
    };
    /**
     * Converts the function into an asynchronous function. Each invocation of the resulting asynchronous function causes an invocation of the original synchronous function on the specified scheduler.
     * @param {Function} function Function to convert to an asynchronous function.
     * @param {Scheduler} [scheduler] Scheduler to run the function on. If not specified, defaults to Scheduler.timeout.
     * @param {Mixed} [context] The context for the func parameter to be executed.  If not specified, defaults to undefined.
     * @returns {Function} Asynchronous function.
     */
    var observableToAsync = Observable.toAsync = function (func, context, scheduler) {
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return function () {
            var args = arguments, subject = new AsyncSubject();
            scheduler.schedule(null, function () {
                var result;
                try {
                    result = func.apply(context, args);
                }
                catch (e) {
                    subject.onError(e);
                    return;
                }
                subject.onNext(result);
                subject.onCompleted();
            });
            return subject.asObservable();
        };
    };
    function createCbObservable(fn, ctx, selector, args) {
        var o = new AsyncSubject();
        args.push(createCbHandler(o, ctx, selector));
        fn.apply(ctx, args);
        return o.asObservable();
    }
    function createCbHandler(o, ctx, selector) {
        return function handler() {
            var len = arguments.length, results = new Array(len);
            for (var i = 0; i < len; i++) {
                results[i] = arguments[i];
            }
            if (isFunction(selector)) {
                results = tryCatch(selector).apply(ctx, results);
                if (results === errorObj) {
                    return o.onError(results.e);
                }
                o.onNext(results);
            }
            else {
                if (results.length <= 1) {
                    o.onNext(results[0]);
                }
                else {
                    o.onNext(results);
                }
            }
            o.onCompleted();
        };
    }
    /**
     * Converts a callback function to an observable sequence.
     *
     * @param {Function} fn Function with a callback as the last parameter to convert to an Observable sequence.
     * @param {Mixed} [ctx] The context for the func parameter to be executed.  If not specified, defaults to undefined.
     * @param {Function} [selector] A selector which takes the arguments from the callback to produce a single item to yield on next.
     * @returns {Function} A function, when executed with the required parameters minus the callback, produces an Observable sequence with a single value of the arguments to the callback as an array.
     */
    Observable.fromCallback = function (fn, ctx, selector) {
        return function () {
            typeof ctx === 'undefined' && (ctx = this);
            var len = arguments.length, args = new Array(len);
            for (var i = 0; i < len; i++) {
                args[i] = arguments[i];
            }
            return createCbObservable(fn, ctx, selector, args);
        };
    };
    function createNodeObservable(fn, ctx, selector, args) {
        var o = new AsyncSubject();
        args.push(createNodeHandler(o, ctx, selector));
        fn.apply(ctx, args);
        return o.asObservable();
    }
    function createNodeHandler(o, ctx, selector) {
        return function handler() {
            var err = arguments[0];
            if (err) {
                return o.onError(err);
            }
            var len = arguments.length, results = [];
            for (var i = 1; i < len; i++) {
                results[i - 1] = arguments[i];
            }
            if (isFunction(selector)) {
                var results = tryCatch(selector).apply(ctx, results);
                if (results === errorObj) {
                    return o.onError(results.e);
                }
                o.onNext(results);
            }
            else {
                if (results.length <= 1) {
                    o.onNext(results[0]);
                }
                else {
                    o.onNext(results);
                }
            }
            o.onCompleted();
        };
    }
    /**
     * Converts a Node.js callback style function to an observable sequence.  This must be in function (err, ...) format.
     * @param {Function} fn The function to call
     * @param {Mixed} [ctx] The context for the func parameter to be executed.  If not specified, defaults to undefined.
     * @param {Function} [selector] A selector which takes the arguments from the callback minus the error to produce a single item to yield on next.
     * @returns {Function} An async function which when applied, returns an observable sequence with the callback arguments as an array.
     */
    Observable.fromNodeCallback = function (fn, ctx, selector) {
        return function () {
            typeof ctx === 'undefined' && (ctx = this);
            var len = arguments.length, args = new Array(len);
            for (var i = 0; i < len; i++) {
                args[i] = arguments[i];
            }
            return createNodeObservable(fn, ctx, selector, args);
        };
    };
    function isNodeList(el) {
        if (root.StaticNodeList) {
            // IE8 Specific
            // instanceof is slower than Object#toString, but Object#toString will not work as intended in IE8
            return el instanceof root.StaticNodeList || el instanceof root.NodeList;
        }
        else {
            return Object.prototype.toString.call(el) === '[object NodeList]';
        }
    }
    function ListenDisposable(e, n, fn) {
        this._e = e;
        this._n = n;
        this._fn = fn;
        this._e.addEventListener(this._n, this._fn, false);
        this.isDisposed = false;
    }
    ListenDisposable.prototype.dispose = function () {
        if (!this.isDisposed) {
            this._e.removeEventListener(this._n, this._fn, false);
            this.isDisposed = true;
        }
    };
    function createEventListener(el, eventName, handler) {
        var disposables = new CompositeDisposable();
        // Asume NodeList or HTMLCollection
        var elemToString = Object.prototype.toString.call(el);
        if (isNodeList(el) || elemToString === '[object HTMLCollection]') {
            for (var i = 0, len = el.length; i < len; i++) {
                disposables.add(createEventListener(el.item(i), eventName, handler));
            }
        }
        else if (el) {
            disposables.add(new ListenDisposable(el, eventName, handler));
        }
        return disposables;
    }
    /**
     * Configuration option to determine whether to use native events only
     */
    Rx.config.useNativeEvents = false;
    var EventObservable = (function (__super__) {
        inherits(EventObservable, __super__);
        function EventObservable(el, name, fn) {
            this._el = el;
            this._n = name;
            this._fn = fn;
            __super__.call(this);
        }
        function createHandler(o, fn) {
            return function handler() {
                var results = arguments[0];
                if (isFunction(fn)) {
                    results = tryCatch(fn).apply(null, arguments);
                    if (results === errorObj) {
                        return o.onError(results.e);
                    }
                }
                o.onNext(results);
            };
        }
        EventObservable.prototype.subscribeCore = function (o) {
            return createEventListener(this._el, this._n, createHandler(o, this._fn));
        };
        return EventObservable;
    }(ObservableBase));
    /**
     * Creates an observable sequence by adding an event listener to the matching DOMElement or each item in the NodeList.
     * @param {Object} element The DOMElement or NodeList to attach a listener.
     * @param {String} eventName The event name to attach the observable sequence.
     * @param {Function} [selector] A selector which takes the arguments from the event handler to produce a single item to yield on next.
     * @returns {Observable} An observable sequence of events from the specified element and the specified event.
     */
    Observable.fromEvent = function (element, eventName, selector) {
        // Node.js specific
        if (element.addListener) {
            return fromEventPattern(function (h) { element.addListener(eventName, h); }, function (h) { element.removeListener(eventName, h); }, selector);
        }
        // Use only if non-native events are allowed
        if (!Rx.config.useNativeEvents) {
            // Handles jq, Angular.js, Zepto, Marionette, Ember.js
            if (typeof element.on === 'function' && typeof element.off === 'function') {
                return fromEventPattern(function (h) { element.on(eventName, h); }, function (h) { element.off(eventName, h); }, selector);
            }
        }
        return new EventObservable(element, eventName, selector).publish().refCount();
    };
    var EventPatternObservable = (function (__super__) {
        inherits(EventPatternObservable, __super__);
        function EventPatternObservable(add, del, fn) {
            this._add = add;
            this._del = del;
            this._fn = fn;
            __super__.call(this);
        }
        function createHandler(o, fn) {
            return function handler() {
                var results = arguments[0];
                if (isFunction(fn)) {
                    results = tryCatch(fn).apply(null, arguments);
                    if (results === errorObj) {
                        return o.onError(results.e);
                    }
                }
                o.onNext(results);
            };
        }
        EventPatternObservable.prototype.subscribeCore = function (o) {
            var fn = createHandler(o, this._fn);
            var returnValue = this._add(fn);
            return new EventPatternDisposable(this._del, fn, returnValue);
        };
        function EventPatternDisposable(del, fn, ret) {
            this._del = del;
            this._fn = fn;
            this._ret = ret;
            this.isDisposed = false;
        }
        EventPatternDisposable.prototype.dispose = function () {
            if (!this.isDisposed) {
                isFunction(this._del) && this._del(this._fn, this._ret);
                this.isDisposed = true;
            }
        };
        return EventPatternObservable;
    }(ObservableBase));
    /**
     * Creates an observable sequence from an event emitter via an addHandler/removeHandler pair.
     * @param {Function} addHandler The function to add a handler to the emitter.
     * @param {Function} [removeHandler] The optional function to remove a handler from an emitter.
     * @param {Function} [selector] A selector which takes the arguments from the event handler to produce a single item to yield on next.
     * @returns {Observable} An observable sequence which wraps an event from an event emitter
     */
    var fromEventPattern = Observable.fromEventPattern = function (addHandler, removeHandler, selector) {
        return new EventPatternObservable(addHandler, removeHandler, selector).publish().refCount();
    };
    /**
     * Invokes the asynchronous function, surfacing the result through an observable sequence.
     * @param {Function} functionAsync Asynchronous function which returns a Promise to run.
     * @returns {Observable} An observable sequence exposing the function's result value, or an exception.
     */
    Observable.startAsync = function (functionAsync) {
        var promise = tryCatch(functionAsync)();
        if (promise === errorObj) {
            return observableThrow(promise.e);
        }
        return observableFromPromise(promise);
    };
    return Rx;
}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccnguYXN5bmMuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xccnhcXGRpc3RcXHJ4LmFzeW5jLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDZHQUE2RztBQUU3RyxDQUFDO0FBQUEsQ0FBQyxVQUFVLE9BQU87SUFDakIsSUFBSSxXQUFXLEdBQUc7UUFDaEIsVUFBVSxFQUFFLElBQUk7UUFDaEIsUUFBUSxFQUFFLElBQUk7S0FDZixDQUFDO0lBRUYscUJBQXFCLEtBQUs7UUFDeEIsTUFBTSxDQUFDLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQztJQUMzRCxDQUFDO0lBRUQsSUFBSSxXQUFXLEdBQUcsQ0FBQyxXQUFXLENBQUMsT0FBTyxPQUFPLENBQUMsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsT0FBTyxHQUFHLElBQUksQ0FBQztJQUNqRyxJQUFJLFVBQVUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQzVGLElBQUksVUFBVSxHQUFHLFdBQVcsQ0FBQyxXQUFXLElBQUksVUFBVSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsSUFBSSxNQUFNLENBQUMsQ0FBQztJQUNoRyxJQUFJLFFBQVEsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLE9BQU8sSUFB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LENBQUM7WUFDekIsQ0FBQztRQUNILENBQUMsQ0FBQztRQUVGLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQztJQUNoQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUVuQjs7Ozs7O09BTUc7SUFDSCxJQUFJLGdCQUFnQixHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsR0FBRyxVQUFVLFVBQVUsRUFBRSxhQUFhLEVBQUUsUUFBUTtRQUNoRyxNQUFNLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxVQUFVLEVBQUUsYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQzlGLENBQUMsQ0FBQztJQUVGOzs7O09BSUc7SUFDSCxVQUFVLENBQUMsVUFBVSxHQUFHLFVBQVUsYUFBYTtRQUM3QyxJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztRQUN4QyxFQUFFLENBQUMsQ0FBQyxPQUFPLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztZQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDeEMsQ0FBQyxDQUFDO0lBRUYsTUFBTSxDQUFDLEVBQUUsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCwgQWxsIHJpZ2h0cyByZXNlcnZlZC4gU2VlIExpY2Vuc2UudHh0IGluIHRoZSBwcm9qZWN0IHJvb3QgZm9yIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG5cbjsoZnVuY3Rpb24gKGZhY3RvcnkpIHtcbiAgdmFyIG9iamVjdFR5cGVzID0ge1xuICAgICdmdW5jdGlvbic6IHRydWUsXG4gICAgJ29iamVjdCc6IHRydWVcbiAgfTtcblxuICBmdW5jdGlvbiBjaGVja0dsb2JhbCh2YWx1ZSkge1xuICAgIHJldHVybiAodmFsdWUgJiYgdmFsdWUuT2JqZWN0ID09PSBPYmplY3QpID8gdmFsdWUgOiBudWxsO1xuICB9XG5cbiAgdmFyIGZyZWVFeHBvcnRzID0gKG9iamVjdFR5cGVzW3R5cGVvZiBleHBvcnRzXSAmJiBleHBvcnRzICYmICFleHBvcnRzLm5vZGVUeXBlKSA/IGV4cG9ydHMgOiBudWxsO1xuICB2YXIgZnJlZU1vZHVsZSA9IChvYmplY3RUeXBlc1t0eXBlb2YgbW9kdWxlXSAmJiBtb2R1bGUgJiYgIW1vZHVsZS5ub2RlVHlwZSkgPyBtb2R1bGUgOiBudWxsO1xuICB2YXIgZnJlZUdsb2JhbCA9IGNoZWNrR2xvYmFsKGZyZWVFeHBvcnRzICYmIGZyZWVNb2R1bGUgJiYgdHlwZW9mIGdsb2JhbCA9PT0gJ29iamVjdCcgJiYgZ2xvYmFsKTtcbiAgdmFyIGZyZWVTZWxmID0gY2hlY2tHbG9iYWwob2JqZWN0VHlwZXNbdHlwZW9mIHNlbGZdICYmIHNlbGYpO1xuICB2YXIgZnJlZVdpbmRvdyA9IGNoZWNrR2xvYmFsKG9iamVjdFR5cGVzW3R5cGVvZiB3aW5kb3ddICYmIHdpbmRvdyk7XG4gIHZhciBtb2R1bGVFeHBvcnRzID0gKGZyZWVNb2R1bGUgJiYgZnJlZU1vZHVsZS5leHBvcnRzID09PSBmcmVlRXhwb3J0cykgPyBmcmVlRXhwb3J0cyA6IG51bGw7XG4gIHZhciB0aGlzR2xvYmFsID0gY2hlY2tHbG9iYWwob2JqZWN0VHlwZXNbdHlwZW9mIHRoaXNdICYmIHRoaXMpO1xuICB2YXIgcm9vdCA9IGZyZWVHbG9iYWwgfHwgKChmcmVlV2luZG93ICE9PSAodGhpc0dsb2JhbCAmJiB0aGlzR2xvYmFsLndpbmRvdykpICYmIGZyZWVXaW5kb3cpIHx8IGZyZWVTZWxmIHx8IHRoaXNHbG9iYWwgfHwgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblxuICAvLyBCZWNhdXNlIG9mIGJ1aWxkIG9wdGltaXplcnNcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShbJy4vcnguYmluZGluZycsICdleHBvcnRzJ10sIGZ1bmN0aW9uIChSeCwgZXhwb3J0cykge1xuICAgICAgcm9vdC5SeCA9IGZhY3Rvcnkocm9vdCwgZXhwb3J0cywgUngpO1xuICAgICAgcmV0dXJuIHJvb3QuUng7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlICYmIG1vZHVsZS5leHBvcnRzID09PSBmcmVlRXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyb290LCBtb2R1bGUuZXhwb3J0cywgcmVxdWlyZSgnLi9yeCcpKTtcbiAgfSBlbHNlIHtcbiAgICByb290LlJ4ID0gZmFjdG9yeShyb290LCB7fSwgcm9vdC5SeCk7XG4gIH1cbn0uY2FsbCh0aGlzLCBmdW5jdGlvbiAocm9vdCwgZXhwLCBSeCwgdW5kZWZpbmVkKSB7XG5cbiAgLy8gQWxpYXNlc1xuICB2YXIgT2JzZXJ2YWJsZSA9IFJ4Lk9ic2VydmFibGUsXG4gICAgb2JzZXJ2YWJsZUZyb21Qcm9taXNlID0gT2JzZXJ2YWJsZS5mcm9tUHJvbWlzZSxcbiAgICBvYnNlcnZhYmxlVGhyb3cgPSBPYnNlcnZhYmxlLnRocm93RXJyb3IsXG4gICAgQW5vbnltb3VzT2JzZXJ2YWJsZSA9IFJ4LkFub255bW91c09ic2VydmFibGUsXG4gICAgT2JzZXJ2YWJsZUJhc2UgPSBSeC5PYnNlcnZhYmxlQmFzZSxcbiAgICBBc3luY1N1YmplY3QgPSBSeC5Bc3luY1N1YmplY3QsXG4gICAgZGlzcG9zYWJsZUNyZWF0ZSA9IFJ4LkRpc3Bvc2FibGUuY3JlYXRlLFxuICAgIENvbXBvc2l0ZURpc3Bvc2FibGUgPSBSeC5Db21wb3NpdGVEaXNwb3NhYmxlLFxuICAgIGltbWVkaWF0ZVNjaGVkdWxlciA9IFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUsXG4gICAgZGVmYXVsdFNjaGVkdWxlciA9IFJ4LlNjaGVkdWxlclsnZGVmYXVsdCddLFxuICAgIGluaGVyaXRzID0gUnguaW50ZXJuYWxzLmluaGVyaXRzLFxuICAgIGlzU2NoZWR1bGVyID0gUnguU2NoZWR1bGVyLmlzU2NoZWR1bGVyLFxuICAgIGlzUHJvbWlzZSA9IFJ4LmhlbHBlcnMuaXNQcm9taXNlLFxuICAgIGlzRnVuY3Rpb24gPSBSeC5oZWxwZXJzLmlzRnVuY3Rpb24sXG4gICAgaXNJdGVyYWJsZSA9IFJ4LmhlbHBlcnMuaXNJdGVyYWJsZSxcbiAgICBpc0FycmF5TGlrZSA9IFJ4LmhlbHBlcnMuaXNBcnJheUxpa2U7XG5cbiAgdmFyIGVycm9yT2JqID0ge2U6IHt9fTtcbiAgXG4gIGZ1bmN0aW9uIHRyeUNhdGNoZXJHZW4odHJ5Q2F0Y2hUYXJnZXQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gdHJ5Q2F0Y2hlcigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB0cnlDYXRjaFRhcmdldC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBlcnJvck9iai5lID0gZTtcbiAgICAgICAgcmV0dXJuIGVycm9yT2JqO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICB2YXIgdHJ5Q2F0Y2ggPSBSeC5pbnRlcm5hbHMudHJ5Q2F0Y2ggPSBmdW5jdGlvbiB0cnlDYXRjaChmbikge1xuICAgIGlmICghaXNGdW5jdGlvbihmbikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcignZm4gbXVzdCBiZSBhIGZ1bmN0aW9uJyk7IH1cbiAgICByZXR1cm4gdHJ5Q2F0Y2hlckdlbihmbik7XG4gIH07XG5cbiAgZnVuY3Rpb24gdGhyb3dlcihlKSB7XG4gICAgdGhyb3cgZTtcbiAgfVxuXG4gIE9ic2VydmFibGUud3JhcCA9IGZ1bmN0aW9uIChmbikge1xuICAgIGZ1bmN0aW9uIGNyZWF0ZU9ic2VydmFibGUoKSB7XG4gICAgICByZXR1cm4gT2JzZXJ2YWJsZS5zcGF3bi5jYWxsKHRoaXMsIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICAgIH1cblxuICAgIGNyZWF0ZU9ic2VydmFibGUuX19nZW5lcmF0b3JGdW5jdGlvbl9fID0gZm47XG4gICAgcmV0dXJuIGNyZWF0ZU9ic2VydmFibGU7XG4gIH07XG5cbiAgdmFyIHNwYXduID0gT2JzZXJ2YWJsZS5zcGF3biA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZ2VuID0gYXJndW1lbnRzWzBdLCBzZWxmID0gdGhpcywgYXJncyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAxLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHsgYXJncy5wdXNoKGFyZ3VtZW50c1tpXSk7IH1cblxuICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbiAobykge1xuICAgICAgdmFyIGcgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuXG4gICAgICBpZiAoaXNGdW5jdGlvbihnZW4pKSB7IGdlbiA9IGdlbi5hcHBseShzZWxmLCBhcmdzKTsgfVxuICAgICAgaWYgKCFnZW4gfHwgIWlzRnVuY3Rpb24oZ2VuLm5leHQpKSB7XG4gICAgICAgIG8ub25OZXh0KGdlbik7XG4gICAgICAgIHJldHVybiBvLm9uQ29tcGxldGVkKCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHByb2Nlc3NHZW5lcmF0b3IocmVzKSB7XG4gICAgICAgIHZhciByZXQgPSB0cnlDYXRjaChnZW4ubmV4dCkuY2FsbChnZW4sIHJlcyk7XG4gICAgICAgIGlmIChyZXQgPT09IGVycm9yT2JqKSB7IHJldHVybiBvLm9uRXJyb3IocmV0LmUpOyB9XG4gICAgICAgIG5leHQocmV0KTtcbiAgICAgIH1cblxuICAgICAgcHJvY2Vzc0dlbmVyYXRvcigpO1xuXG4gICAgICBmdW5jdGlvbiBvbkVycm9yKGVycikge1xuICAgICAgICB2YXIgcmV0ID0gdHJ5Q2F0Y2goZ2VuLm5leHQpLmNhbGwoZ2VuLCBlcnIpO1xuICAgICAgICBpZiAocmV0ID09PSBlcnJvck9iaikgeyByZXR1cm4gby5vbkVycm9yKHJldC5lKTsgfVxuICAgICAgICBuZXh0KHJldCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIG5leHQocmV0KSB7XG4gICAgICAgIGlmIChyZXQuZG9uZSkge1xuICAgICAgICAgIG8ub25OZXh0KHJldC52YWx1ZSk7XG4gICAgICAgICAgby5vbkNvbXBsZXRlZCgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgb2JzID0gdG9PYnNlcnZhYmxlLmNhbGwoc2VsZiwgcmV0LnZhbHVlKTtcbiAgICAgICAgdmFyIHZhbHVlID0gbnVsbDtcbiAgICAgICAgdmFyIGhhc1ZhbHVlID0gZmFsc2U7XG4gICAgICAgIGlmIChPYnNlcnZhYmxlLmlzT2JzZXJ2YWJsZShvYnMpKSB7XG4gICAgICAgICAgZy5hZGQob2JzLnN1YnNjcmliZShmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAgIGhhc1ZhbHVlID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsO1xuICAgICAgICAgIH0sIG9uRXJyb3IsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaGFzVmFsdWUgJiYgcHJvY2Vzc0dlbmVyYXRvcih2YWx1ZSk7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9uRXJyb3IobmV3IFR5cGVFcnJvcigndHlwZSBub3Qgc3VwcG9ydGVkJykpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBnO1xuICAgIH0pO1xuICB9O1xuXG4gIGZ1bmN0aW9uIHRvT2JzZXJ2YWJsZShvYmopIHtcbiAgICBpZiAoIW9iaikgeyByZXR1cm4gb2JqOyB9XG4gICAgaWYgKE9ic2VydmFibGUuaXNPYnNlcnZhYmxlKG9iaikpIHsgcmV0dXJuIG9iajsgfVxuICAgIGlmIChpc1Byb21pc2Uob2JqKSkgeyByZXR1cm4gT2JzZXJ2YWJsZS5mcm9tUHJvbWlzZShvYmopOyB9XG4gICAgaWYgKGlzR2VuZXJhdG9yRnVuY3Rpb24ob2JqKSB8fCBpc0dlbmVyYXRvcihvYmopKSB7IHJldHVybiBzcGF3bi5jYWxsKHRoaXMsIG9iaik7IH1cbiAgICBpZiAoaXNGdW5jdGlvbihvYmopKSB7IHJldHVybiB0aHVua1RvT2JzZXJ2YWJsZS5jYWxsKHRoaXMsIG9iaik7IH1cbiAgICBpZiAoaXNBcnJheUxpa2Uob2JqKSB8fCBpc0l0ZXJhYmxlKG9iaikpIHsgcmV0dXJuIGFycmF5VG9PYnNlcnZhYmxlLmNhbGwodGhpcywgb2JqKTsgfVxuICAgIGlmIChpc09iamVjdChvYmopKSB7cmV0dXJuIG9iamVjdFRvT2JzZXJ2YWJsZS5jYWxsKHRoaXMsIG9iaik7fVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICBmdW5jdGlvbiBhcnJheVRvT2JzZXJ2YWJsZSAob2JqKSB7XG4gICAgcmV0dXJuIE9ic2VydmFibGUuZnJvbShvYmopLmNvbmNhdE1hcChmdW5jdGlvbihvKSB7XG4gICAgICBpZihPYnNlcnZhYmxlLmlzT2JzZXJ2YWJsZShvKSB8fCBpc09iamVjdChvKSkge1xuICAgICAgICByZXR1cm4gdG9PYnNlcnZhYmxlLmNhbGwobnVsbCwgbyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5qdXN0KG8pO1xuICAgICAgfVxuICAgIH0pLnRvQXJyYXkoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9iamVjdFRvT2JzZXJ2YWJsZSAob2JqKSB7XG4gICAgdmFyIHJlc3VsdHMgPSBuZXcgb2JqLmNvbnN0cnVjdG9yKCksIGtleXMgPSBPYmplY3Qua2V5cyhvYmopLCBvYnNlcnZhYmxlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBrZXlzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgIHZhciBvYnNlcnZhYmxlID0gdG9PYnNlcnZhYmxlLmNhbGwodGhpcywgb2JqW2tleV0pO1xuXG4gICAgICBpZihvYnNlcnZhYmxlICYmIE9ic2VydmFibGUuaXNPYnNlcnZhYmxlKG9ic2VydmFibGUpKSB7XG4gICAgICAgIGRlZmVyKG9ic2VydmFibGUsIGtleSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRzW2tleV0gPSBvYmpba2V5XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gT2JzZXJ2YWJsZS5mb3JrSm9pbi5hcHBseShPYnNlcnZhYmxlLCBvYnNlcnZhYmxlcykubWFwKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfSk7XG5cblxuICAgIGZ1bmN0aW9uIGRlZmVyIChvYnNlcnZhYmxlLCBrZXkpIHtcbiAgICAgIHJlc3VsdHNba2V5XSA9IHVuZGVmaW5lZDtcbiAgICAgIG9ic2VydmFibGVzLnB1c2gob2JzZXJ2YWJsZS5tYXAoZnVuY3Rpb24gKG5leHQpIHtcbiAgICAgICAgcmVzdWx0c1trZXldID0gbmV4dDtcbiAgICAgIH0pKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB0aHVua1RvT2JzZXJ2YWJsZShmbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IEFub255bW91c09ic2VydmFibGUoZnVuY3Rpb24gKG8pIHtcbiAgICAgIGZuLmNhbGwoc2VsZiwgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZXJyID0gYXJndW1lbnRzWzBdLCByZXMgPSBhcmd1bWVudHNbMV07XG4gICAgICAgIGlmIChlcnIpIHsgcmV0dXJuIG8ub25FcnJvcihlcnIpOyB9XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgICAgICAgIHZhciBhcmdzID0gW107XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDEsIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykgeyBhcmdzLnB1c2goYXJndW1lbnRzW2ldKTsgfVxuICAgICAgICAgIHJlcyA9IGFyZ3M7XG4gICAgICAgIH1cbiAgICAgICAgby5vbk5leHQocmVzKTtcbiAgICAgICAgby5vbkNvbXBsZXRlZCgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBpc0dlbmVyYXRvcihvYmopIHtcbiAgICByZXR1cm4gaXNGdW5jdGlvbiAob2JqLm5leHQpICYmIGlzRnVuY3Rpb24gKG9ialsndGhyb3cnXSk7XG4gIH1cblxuICBmdW5jdGlvbiBpc0dlbmVyYXRvckZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBjdG9yID0gb2JqLmNvbnN0cnVjdG9yO1xuICAgIGlmICghY3RvcikgeyByZXR1cm4gZmFsc2U7IH1cbiAgICBpZiAoY3Rvci5uYW1lID09PSAnR2VuZXJhdG9yRnVuY3Rpb24nIHx8IGN0b3IuZGlzcGxheU5hbWUgPT09ICdHZW5lcmF0b3JGdW5jdGlvbicpIHsgcmV0dXJuIHRydWU7IH1cbiAgICByZXR1cm4gaXNHZW5lcmF0b3IoY3Rvci5wcm90b3R5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3QodmFsKSB7XG4gICAgcmV0dXJuIE9iamVjdCA9PSB2YWwuY29uc3RydWN0b3I7XG4gIH1cblxuICAvKipcbiAgICogSW52b2tlcyB0aGUgc3BlY2lmaWVkIGZ1bmN0aW9uIGFzeW5jaHJvbm91c2x5IG9uIHRoZSBzcGVjaWZpZWQgc2NoZWR1bGVyLCBzdXJmYWNpbmcgdGhlIHJlc3VsdCB0aHJvdWdoIGFuIG9ic2VydmFibGUgc2VxdWVuY2UuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHZhciByZXMgPSBSeC5PYnNlcnZhYmxlLnN0YXJ0KGZ1bmN0aW9uICgpIHsgY29uc29sZS5sb2coJ2hlbGxvJyk7IH0pO1xuICAgKiB2YXIgcmVzID0gUnguT2JzZXJ2YWJsZS5zdGFydChmdW5jdGlvbiAoKSB7IGNvbnNvbGUubG9nKCdoZWxsbycpOyB9LCBSeC5TY2hlZHVsZXIudGltZW91dCk7XG4gICAqIHZhciByZXMgPSBSeC5PYnNlcnZhYmxlLnN0YXJ0KGZ1bmN0aW9uICgpIHsgdGhpcy5sb2coJ2hlbGxvJyk7IH0sIFJ4LlNjaGVkdWxlci50aW1lb3V0LCBjb25zb2xlKTtcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiB0byBydW4gYXN5bmNocm9ub3VzbHkuXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSAgU2NoZWR1bGVyIHRvIHJ1biB0aGUgZnVuY3Rpb24gb24uIElmIG5vdCBzcGVjaWZpZWQsIGRlZmF1bHRzIHRvIFNjaGVkdWxlci50aW1lb3V0LlxuICAgKiBAcGFyYW0gW2NvbnRleHRdICBUaGUgY29udGV4dCBmb3IgdGhlIGZ1bmMgcGFyYW1ldGVyIHRvIGJlIGV4ZWN1dGVkLiAgSWYgbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gdW5kZWZpbmVkLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBleHBvc2luZyB0aGUgZnVuY3Rpb24ncyByZXN1bHQgdmFsdWUsIG9yIGFuIGV4Y2VwdGlvbi5cbiAgICpcbiAgICogUmVtYXJrc1xuICAgKiAqIFRoZSBmdW5jdGlvbiBpcyBjYWxsZWQgaW1tZWRpYXRlbHksIG5vdCBkdXJpbmcgdGhlIHN1YnNjcmlwdGlvbiBvZiB0aGUgcmVzdWx0aW5nIHNlcXVlbmNlLlxuICAgKiAqIE11bHRpcGxlIHN1YnNjcmlwdGlvbnMgdG8gdGhlIHJlc3VsdGluZyBzZXF1ZW5jZSBjYW4gb2JzZXJ2ZSB0aGUgZnVuY3Rpb24ncyByZXN1bHQuXG4gICAqL1xuICBPYnNlcnZhYmxlLnN0YXJ0ID0gZnVuY3Rpb24gKGZ1bmMsIGNvbnRleHQsIHNjaGVkdWxlcikge1xuICAgIHJldHVybiBvYnNlcnZhYmxlVG9Bc3luYyhmdW5jLCBjb250ZXh0LCBzY2hlZHVsZXIpKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIHRoZSBmdW5jdGlvbiBpbnRvIGFuIGFzeW5jaHJvbm91cyBmdW5jdGlvbi4gRWFjaCBpbnZvY2F0aW9uIG9mIHRoZSByZXN1bHRpbmcgYXN5bmNocm9ub3VzIGZ1bmN0aW9uIGNhdXNlcyBhbiBpbnZvY2F0aW9uIG9mIHRoZSBvcmlnaW5hbCBzeW5jaHJvbm91cyBmdW5jdGlvbiBvbiB0aGUgc3BlY2lmaWVkIHNjaGVkdWxlci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuY3Rpb24gRnVuY3Rpb24gdG8gY29udmVydCB0byBhbiBhc3luY2hyb25vdXMgZnVuY3Rpb24uXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSBTY2hlZHVsZXIgdG8gcnVuIHRoZSBmdW5jdGlvbiBvbi4gSWYgbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gU2NoZWR1bGVyLnRpbWVvdXQuXG4gICAqIEBwYXJhbSB7TWl4ZWR9IFtjb250ZXh0XSBUaGUgY29udGV4dCBmb3IgdGhlIGZ1bmMgcGFyYW1ldGVyIHRvIGJlIGV4ZWN1dGVkLiAgSWYgbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gdW5kZWZpbmVkLlxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IEFzeW5jaHJvbm91cyBmdW5jdGlvbi5cbiAgICovXG4gIHZhciBvYnNlcnZhYmxlVG9Bc3luYyA9IE9ic2VydmFibGUudG9Bc3luYyA9IGZ1bmN0aW9uIChmdW5jLCBjb250ZXh0LCBzY2hlZHVsZXIpIHtcbiAgICBpc1NjaGVkdWxlcihzY2hlZHVsZXIpIHx8IChzY2hlZHVsZXIgPSBkZWZhdWx0U2NoZWR1bGVyKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHMsXG4gICAgICAgIHN1YmplY3QgPSBuZXcgQXN5bmNTdWJqZWN0KCk7XG5cbiAgICAgIHNjaGVkdWxlci5zY2hlZHVsZShudWxsLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHN1YmplY3Qub25FcnJvcihlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3ViamVjdC5vbk5leHQocmVzdWx0KTtcbiAgICAgICAgc3ViamVjdC5vbkNvbXBsZXRlZCgpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gc3ViamVjdC5hc09ic2VydmFibGUoKTtcbiAgICB9O1xuICB9O1xuXG5mdW5jdGlvbiBjcmVhdGVDYk9ic2VydmFibGUoZm4sIGN0eCwgc2VsZWN0b3IsIGFyZ3MpIHtcbiAgdmFyIG8gPSBuZXcgQXN5bmNTdWJqZWN0KCk7XG5cbiAgYXJncy5wdXNoKGNyZWF0ZUNiSGFuZGxlcihvLCBjdHgsIHNlbGVjdG9yKSk7XG4gIGZuLmFwcGx5KGN0eCwgYXJncyk7XG5cbiAgcmV0dXJuIG8uYXNPYnNlcnZhYmxlKCk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUNiSGFuZGxlcihvLCBjdHgsIHNlbGVjdG9yKSB7XG4gIHJldHVybiBmdW5jdGlvbiBoYW5kbGVyICgpIHtcbiAgICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgcmVzdWx0cyA9IG5ldyBBcnJheShsZW4pO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykgeyByZXN1bHRzW2ldID0gYXJndW1lbnRzW2ldOyB9XG5cbiAgICBpZiAoaXNGdW5jdGlvbihzZWxlY3RvcikpIHtcbiAgICAgIHJlc3VsdHMgPSB0cnlDYXRjaChzZWxlY3RvcikuYXBwbHkoY3R4LCByZXN1bHRzKTtcbiAgICAgIGlmIChyZXN1bHRzID09PSBlcnJvck9iaikgeyByZXR1cm4gby5vbkVycm9yKHJlc3VsdHMuZSk7IH1cbiAgICAgIG8ub25OZXh0KHJlc3VsdHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAocmVzdWx0cy5sZW5ndGggPD0gMSkge1xuICAgICAgICBvLm9uTmV4dChyZXN1bHRzWzBdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG8ub25OZXh0KHJlc3VsdHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIG8ub25Db21wbGV0ZWQoKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGFuIG9ic2VydmFibGUgc2VxdWVuY2UuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gRnVuY3Rpb24gd2l0aCBhIGNhbGxiYWNrIGFzIHRoZSBsYXN0IHBhcmFtZXRlciB0byBjb252ZXJ0IHRvIGFuIE9ic2VydmFibGUgc2VxdWVuY2UuXG4gKiBAcGFyYW0ge01peGVkfSBbY3R4XSBUaGUgY29udGV4dCBmb3IgdGhlIGZ1bmMgcGFyYW1ldGVyIHRvIGJlIGV4ZWN1dGVkLiAgSWYgbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gdW5kZWZpbmVkLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3NlbGVjdG9yXSBBIHNlbGVjdG9yIHdoaWNoIHRha2VzIHRoZSBhcmd1bWVudHMgZnJvbSB0aGUgY2FsbGJhY2sgdG8gcHJvZHVjZSBhIHNpbmdsZSBpdGVtIHRvIHlpZWxkIG9uIG5leHQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IEEgZnVuY3Rpb24sIHdoZW4gZXhlY3V0ZWQgd2l0aCB0aGUgcmVxdWlyZWQgcGFyYW1ldGVycyBtaW51cyB0aGUgY2FsbGJhY2ssIHByb2R1Y2VzIGFuIE9ic2VydmFibGUgc2VxdWVuY2Ugd2l0aCBhIHNpbmdsZSB2YWx1ZSBvZiB0aGUgYXJndW1lbnRzIHRvIHRoZSBjYWxsYmFjayBhcyBhbiBhcnJheS5cbiAqL1xuT2JzZXJ2YWJsZS5mcm9tQ2FsbGJhY2sgPSBmdW5jdGlvbiAoZm4sIGN0eCwgc2VsZWN0b3IpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB0eXBlb2YgY3R4ID09PSAndW5kZWZpbmVkJyAmJiAoY3R4ID0gdGhpcyk7IFxuXG4gICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBuZXcgQXJyYXkobGVuKVxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykgeyBhcmdzW2ldID0gYXJndW1lbnRzW2ldOyB9XG4gICAgcmV0dXJuIGNyZWF0ZUNiT2JzZXJ2YWJsZShmbiwgY3R4LCBzZWxlY3RvciwgYXJncyk7XG4gIH07XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVOb2RlT2JzZXJ2YWJsZShmbiwgY3R4LCBzZWxlY3RvciwgYXJncykge1xuICB2YXIgbyA9IG5ldyBBc3luY1N1YmplY3QoKTtcblxuICBhcmdzLnB1c2goY3JlYXRlTm9kZUhhbmRsZXIobywgY3R4LCBzZWxlY3RvcikpO1xuICBmbi5hcHBseShjdHgsIGFyZ3MpO1xuXG4gIHJldHVybiBvLmFzT2JzZXJ2YWJsZSgpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVOb2RlSGFuZGxlcihvLCBjdHgsIHNlbGVjdG9yKSB7XG4gIHJldHVybiBmdW5jdGlvbiBoYW5kbGVyICgpIHtcbiAgICB2YXIgZXJyID0gYXJndW1lbnRzWzBdO1xuICAgIGlmIChlcnIpIHsgcmV0dXJuIG8ub25FcnJvcihlcnIpOyB9XG5cbiAgICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgcmVzdWx0cyA9IFtdO1xuICAgIGZvcih2YXIgaSA9IDE7IGkgPCBsZW47IGkrKykgeyByZXN1bHRzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTsgfVxuXG4gICAgaWYgKGlzRnVuY3Rpb24oc2VsZWN0b3IpKSB7XG4gICAgICB2YXIgcmVzdWx0cyA9IHRyeUNhdGNoKHNlbGVjdG9yKS5hcHBseShjdHgsIHJlc3VsdHMpO1xuICAgICAgaWYgKHJlc3VsdHMgPT09IGVycm9yT2JqKSB7IHJldHVybiBvLm9uRXJyb3IocmVzdWx0cy5lKTsgfVxuICAgICAgby5vbk5leHQocmVzdWx0cyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgIG8ub25OZXh0KHJlc3VsdHNbMF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgby5vbk5leHQocmVzdWx0cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgby5vbkNvbXBsZXRlZCgpO1xuICB9O1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGEgTm9kZS5qcyBjYWxsYmFjayBzdHlsZSBmdW5jdGlvbiB0byBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlLiAgVGhpcyBtdXN0IGJlIGluIGZ1bmN0aW9uIChlcnIsIC4uLikgZm9ybWF0LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uIHRvIGNhbGxcbiAqIEBwYXJhbSB7TWl4ZWR9IFtjdHhdIFRoZSBjb250ZXh0IGZvciB0aGUgZnVuYyBwYXJhbWV0ZXIgdG8gYmUgZXhlY3V0ZWQuICBJZiBub3Qgc3BlY2lmaWVkLCBkZWZhdWx0cyB0byB1bmRlZmluZWQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbc2VsZWN0b3JdIEEgc2VsZWN0b3Igd2hpY2ggdGFrZXMgdGhlIGFyZ3VtZW50cyBmcm9tIHRoZSBjYWxsYmFjayBtaW51cyB0aGUgZXJyb3IgdG8gcHJvZHVjZSBhIHNpbmdsZSBpdGVtIHRvIHlpZWxkIG9uIG5leHQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IEFuIGFzeW5jIGZ1bmN0aW9uIHdoaWNoIHdoZW4gYXBwbGllZCwgcmV0dXJucyBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdpdGggdGhlIGNhbGxiYWNrIGFyZ3VtZW50cyBhcyBhbiBhcnJheS5cbiAqL1xuT2JzZXJ2YWJsZS5mcm9tTm9kZUNhbGxiYWNrID0gZnVuY3Rpb24gKGZuLCBjdHgsIHNlbGVjdG9yKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdHlwZW9mIGN0eCA9PT0gJ3VuZGVmaW5lZCcgJiYgKGN0eCA9IHRoaXMpOyBcbiAgICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IG5ldyBBcnJheShsZW4pO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykgeyBhcmdzW2ldID0gYXJndW1lbnRzW2ldOyB9XG4gICAgcmV0dXJuIGNyZWF0ZU5vZGVPYnNlcnZhYmxlKGZuLCBjdHgsIHNlbGVjdG9yLCBhcmdzKTtcbiAgfTtcbn07XG5cbiAgZnVuY3Rpb24gaXNOb2RlTGlzdChlbCkge1xuICAgIGlmIChyb290LlN0YXRpY05vZGVMaXN0KSB7XG4gICAgICAvLyBJRTggU3BlY2lmaWNcbiAgICAgIC8vIGluc3RhbmNlb2YgaXMgc2xvd2VyIHRoYW4gT2JqZWN0I3RvU3RyaW5nLCBidXQgT2JqZWN0I3RvU3RyaW5nIHdpbGwgbm90IHdvcmsgYXMgaW50ZW5kZWQgaW4gSUU4XG4gICAgICByZXR1cm4gZWwgaW5zdGFuY2VvZiByb290LlN0YXRpY05vZGVMaXN0IHx8IGVsIGluc3RhbmNlb2Ygcm9vdC5Ob2RlTGlzdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChlbCkgPT09ICdbb2JqZWN0IE5vZGVMaXN0XSc7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gTGlzdGVuRGlzcG9zYWJsZShlLCBuLCBmbikge1xuICAgIHRoaXMuX2UgPSBlO1xuICAgIHRoaXMuX24gPSBuO1xuICAgIHRoaXMuX2ZuID0gZm47XG4gICAgdGhpcy5fZS5hZGRFdmVudExpc3RlbmVyKHRoaXMuX24sIHRoaXMuX2ZuLCBmYWxzZSk7XG4gICAgdGhpcy5pc0Rpc3Bvc2VkID0gZmFsc2U7XG4gIH1cbiAgTGlzdGVuRGlzcG9zYWJsZS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuaXNEaXNwb3NlZCkge1xuICAgICAgdGhpcy5fZS5yZW1vdmVFdmVudExpc3RlbmVyKHRoaXMuX24sIHRoaXMuX2ZuLCBmYWxzZSk7XG4gICAgICB0aGlzLmlzRGlzcG9zZWQgPSB0cnVlO1xuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBjcmVhdGVFdmVudExpc3RlbmVyIChlbCwgZXZlbnROYW1lLCBoYW5kbGVyKSB7XG4gICAgdmFyIGRpc3Bvc2FibGVzID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcblxuICAgIC8vIEFzdW1lIE5vZGVMaXN0IG9yIEhUTUxDb2xsZWN0aW9uXG4gICAgdmFyIGVsZW1Ub1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChlbCk7XG4gICAgaWYgKGlzTm9kZUxpc3QoZWwpIHx8IGVsZW1Ub1N0cmluZyA9PT0gJ1tvYmplY3QgSFRNTENvbGxlY3Rpb25dJykge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGVsLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGRpc3Bvc2FibGVzLmFkZChjcmVhdGVFdmVudExpc3RlbmVyKGVsLml0ZW0oaSksIGV2ZW50TmFtZSwgaGFuZGxlcikpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZWwpIHtcbiAgICAgIGRpc3Bvc2FibGVzLmFkZChuZXcgTGlzdGVuRGlzcG9zYWJsZShlbCwgZXZlbnROYW1lLCBoYW5kbGVyKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpc3Bvc2FibGVzO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyYXRpb24gb3B0aW9uIHRvIGRldGVybWluZSB3aGV0aGVyIHRvIHVzZSBuYXRpdmUgZXZlbnRzIG9ubHlcbiAgICovXG4gIFJ4LmNvbmZpZy51c2VOYXRpdmVFdmVudHMgPSBmYWxzZTtcblxuICB2YXIgRXZlbnRPYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEV2ZW50T2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBFdmVudE9ic2VydmFibGUoZWwsIG5hbWUsIGZuKSB7XG4gICAgICB0aGlzLl9lbCA9IGVsO1xuICAgICAgdGhpcy5fbiA9IG5hbWU7XG4gICAgICB0aGlzLl9mbiA9IGZuO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlSGFuZGxlcihvLCBmbikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZXIgKCkge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oZm4pKSB7XG4gICAgICAgICAgcmVzdWx0cyA9IHRyeUNhdGNoKGZuKS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgIGlmIChyZXN1bHRzID09PSBlcnJvck9iaikgeyByZXR1cm4gby5vbkVycm9yKHJlc3VsdHMuZSk7IH1cbiAgICAgICAgfVxuICAgICAgICBvLm9uTmV4dChyZXN1bHRzKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgRXZlbnRPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiBjcmVhdGVFdmVudExpc3RlbmVyKFxuICAgICAgICB0aGlzLl9lbCxcbiAgICAgICAgdGhpcy5fbixcbiAgICAgICAgY3JlYXRlSGFuZGxlcihvLCB0aGlzLl9mbikpO1xuICAgIH07XG5cbiAgICByZXR1cm4gRXZlbnRPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBieSBhZGRpbmcgYW4gZXZlbnQgbGlzdGVuZXIgdG8gdGhlIG1hdGNoaW5nIERPTUVsZW1lbnQgb3IgZWFjaCBpdGVtIGluIHRoZSBOb2RlTGlzdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgVGhlIERPTUVsZW1lbnQgb3IgTm9kZUxpc3QgdG8gYXR0YWNoIGEgbGlzdGVuZXIuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBldmVudE5hbWUgVGhlIGV2ZW50IG5hbWUgdG8gYXR0YWNoIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbc2VsZWN0b3JdIEEgc2VsZWN0b3Igd2hpY2ggdGFrZXMgdGhlIGFyZ3VtZW50cyBmcm9tIHRoZSBldmVudCBoYW5kbGVyIHRvIHByb2R1Y2UgYSBzaW5nbGUgaXRlbSB0byB5aWVsZCBvbiBuZXh0LlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBvZiBldmVudHMgZnJvbSB0aGUgc3BlY2lmaWVkIGVsZW1lbnQgYW5kIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gICAqL1xuICBPYnNlcnZhYmxlLmZyb21FdmVudCA9IGZ1bmN0aW9uIChlbGVtZW50LCBldmVudE5hbWUsIHNlbGVjdG9yKSB7XG4gICAgLy8gTm9kZS5qcyBzcGVjaWZpY1xuICAgIGlmIChlbGVtZW50LmFkZExpc3RlbmVyKSB7XG4gICAgICByZXR1cm4gZnJvbUV2ZW50UGF0dGVybihcbiAgICAgICAgZnVuY3Rpb24gKGgpIHsgZWxlbWVudC5hZGRMaXN0ZW5lcihldmVudE5hbWUsIGgpOyB9LFxuICAgICAgICBmdW5jdGlvbiAoaCkgeyBlbGVtZW50LnJlbW92ZUxpc3RlbmVyKGV2ZW50TmFtZSwgaCk7IH0sXG4gICAgICAgIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvLyBVc2Ugb25seSBpZiBub24tbmF0aXZlIGV2ZW50cyBhcmUgYWxsb3dlZFxuICAgIGlmICghUnguY29uZmlnLnVzZU5hdGl2ZUV2ZW50cykge1xuICAgICAgLy8gSGFuZGxlcyBqcSwgQW5ndWxhci5qcywgWmVwdG8sIE1hcmlvbmV0dGUsIEVtYmVyLmpzXG4gICAgICBpZiAodHlwZW9mIGVsZW1lbnQub24gPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGVsZW1lbnQub2ZmID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBmcm9tRXZlbnRQYXR0ZXJuKFxuICAgICAgICAgIGZ1bmN0aW9uIChoKSB7IGVsZW1lbnQub24oZXZlbnROYW1lLCBoKTsgfSxcbiAgICAgICAgICBmdW5jdGlvbiAoaCkgeyBlbGVtZW50Lm9mZihldmVudE5hbWUsIGgpOyB9LFxuICAgICAgICAgIHNlbGVjdG9yKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IEV2ZW50T2JzZXJ2YWJsZShlbGVtZW50LCBldmVudE5hbWUsIHNlbGVjdG9yKS5wdWJsaXNoKCkucmVmQ291bnQoKTtcbiAgfTtcblxuICB2YXIgRXZlbnRQYXR0ZXJuT2JzZXJ2YWJsZSA9IChmdW5jdGlvbihfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhFdmVudFBhdHRlcm5PYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIEV2ZW50UGF0dGVybk9ic2VydmFibGUoYWRkLCBkZWwsIGZuKSB7XG4gICAgICB0aGlzLl9hZGQgPSBhZGQ7XG4gICAgICB0aGlzLl9kZWwgPSBkZWw7XG4gICAgICB0aGlzLl9mbiA9IGZuO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlSGFuZGxlcihvLCBmbikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZXIgKCkge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oZm4pKSB7XG4gICAgICAgICAgcmVzdWx0cyA9IHRyeUNhdGNoKGZuKS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgIGlmIChyZXN1bHRzID09PSBlcnJvck9iaikgeyByZXR1cm4gby5vbkVycm9yKHJlc3VsdHMuZSk7IH1cbiAgICAgICAgfVxuICAgICAgICBvLm9uTmV4dChyZXN1bHRzKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgRXZlbnRQYXR0ZXJuT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgZm4gPSBjcmVhdGVIYW5kbGVyKG8sIHRoaXMuX2ZuKTtcbiAgICAgIHZhciByZXR1cm5WYWx1ZSA9IHRoaXMuX2FkZChmbik7XG4gICAgICByZXR1cm4gbmV3IEV2ZW50UGF0dGVybkRpc3Bvc2FibGUodGhpcy5fZGVsLCBmbiwgcmV0dXJuVmFsdWUpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBFdmVudFBhdHRlcm5EaXNwb3NhYmxlKGRlbCwgZm4sIHJldCkge1xuICAgICAgdGhpcy5fZGVsID0gZGVsO1xuICAgICAgdGhpcy5fZm4gPSBmbjtcbiAgICAgIHRoaXMuX3JldCA9IHJldDtcbiAgICAgIHRoaXMuaXNEaXNwb3NlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIEV2ZW50UGF0dGVybkRpc3Bvc2FibGUucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZighdGhpcy5pc0Rpc3Bvc2VkKSB7XG4gICAgICAgIGlzRnVuY3Rpb24odGhpcy5fZGVsKSAmJiB0aGlzLl9kZWwodGhpcy5fZm4sIHRoaXMuX3JldCk7XG4gICAgICAgIHRoaXMuaXNEaXNwb3NlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBFdmVudFBhdHRlcm5PYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBmcm9tIGFuIGV2ZW50IGVtaXR0ZXIgdmlhIGFuIGFkZEhhbmRsZXIvcmVtb3ZlSGFuZGxlciBwYWlyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBhZGRIYW5kbGVyIFRoZSBmdW5jdGlvbiB0byBhZGQgYSBoYW5kbGVyIHRvIHRoZSBlbWl0dGVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcmVtb3ZlSGFuZGxlcl0gVGhlIG9wdGlvbmFsIGZ1bmN0aW9uIHRvIHJlbW92ZSBhIGhhbmRsZXIgZnJvbSBhbiBlbWl0dGVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbc2VsZWN0b3JdIEEgc2VsZWN0b3Igd2hpY2ggdGFrZXMgdGhlIGFyZ3VtZW50cyBmcm9tIHRoZSBldmVudCBoYW5kbGVyIHRvIHByb2R1Y2UgYSBzaW5nbGUgaXRlbSB0byB5aWVsZCBvbiBuZXh0LlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB3aGljaCB3cmFwcyBhbiBldmVudCBmcm9tIGFuIGV2ZW50IGVtaXR0ZXJcbiAgICovXG4gIHZhciBmcm9tRXZlbnRQYXR0ZXJuID0gT2JzZXJ2YWJsZS5mcm9tRXZlbnRQYXR0ZXJuID0gZnVuY3Rpb24gKGFkZEhhbmRsZXIsIHJlbW92ZUhhbmRsZXIsIHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIG5ldyBFdmVudFBhdHRlcm5PYnNlcnZhYmxlKGFkZEhhbmRsZXIsIHJlbW92ZUhhbmRsZXIsIHNlbGVjdG9yKS5wdWJsaXNoKCkucmVmQ291bnQoKTtcbiAgfTtcblxuICAvKipcbiAgICogSW52b2tlcyB0aGUgYXN5bmNocm9ub3VzIGZ1bmN0aW9uLCBzdXJmYWNpbmcgdGhlIHJlc3VsdCB0aHJvdWdoIGFuIG9ic2VydmFibGUgc2VxdWVuY2UuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmN0aW9uQXN5bmMgQXN5bmNocm9ub3VzIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYSBQcm9taXNlIHRvIHJ1bi5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgZXhwb3NpbmcgdGhlIGZ1bmN0aW9uJ3MgcmVzdWx0IHZhbHVlLCBvciBhbiBleGNlcHRpb24uXG4gICAqL1xuICBPYnNlcnZhYmxlLnN0YXJ0QXN5bmMgPSBmdW5jdGlvbiAoZnVuY3Rpb25Bc3luYykge1xuICAgIHZhciBwcm9taXNlID0gdHJ5Q2F0Y2goZnVuY3Rpb25Bc3luYykoKTtcbiAgICBpZiAocHJvbWlzZSA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIG9ic2VydmFibGVUaHJvdyhwcm9taXNlLmUpOyB9XG4gICAgcmV0dXJuIG9ic2VydmFibGVGcm9tUHJvbWlzZShwcm9taXNlKTtcbiAgfTtcblxuICByZXR1cm4gUng7XG59KSk7XG4iXX0=