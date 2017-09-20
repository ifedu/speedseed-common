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
        define(['./rx'], function (Rx, exports) {
            return factory(root, exports, Rx);
        });
    }
    else if (typeof module === 'object' && module && module.exports === freeExports) {
        module.exports = factory(root, module.exports, require('./rx'));
    }
    else {
        root.Rx = factory(root, {}, root.Rx);
    }
}.call(this, function (root, exp, Rx, undefined) {
    // References
    var Observable = Rx.Observable, observableProto = Observable.prototype, BinaryDisposable = Rx.BinaryDisposable, AnonymousObservable = Rx.AnonymousObservable, AbstractObserver = Rx.internals.AbstractObserver, disposableEmpty = Rx.Disposable.empty, helpers = Rx.helpers, defaultComparer = helpers.defaultComparer, identity = helpers.identity, defaultSubComparer = helpers.defaultSubComparer, isFunction = helpers.isFunction, isPromise = helpers.isPromise, isArrayLike = helpers.isArrayLike, isIterable = helpers.isIterable, inherits = Rx.internals.inherits, observableFromPromise = Observable.fromPromise, observableFrom = Observable.from, bindCallback = Rx.internals.bindCallback, EmptyError = Rx.EmptyError, ObservableBase = Rx.ObservableBase, ArgumentOutOfRangeError = Rx.ArgumentOutOfRangeError;
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
    var ExtremaByObservable = (function (__super__) {
        inherits(ExtremaByObservable, __super__);
        function ExtremaByObservable(source, k, c) {
            this.source = source;
            this._k = k;
            this._c = c;
            __super__.call(this);
        }
        ExtremaByObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new ExtremaByObserver(o, this._k, this._c));
        };
        return ExtremaByObservable;
    }(ObservableBase));
    var ExtremaByObserver = (function (__super__) {
        inherits(ExtremaByObserver, __super__);
        function ExtremaByObserver(o, k, c) {
            this._o = o;
            this._k = k;
            this._c = c;
            this._v = null;
            this._hv = false;
            this._l = [];
            __super__.call(this);
        }
        ExtremaByObserver.prototype.next = function (x) {
            var key = tryCatch(this._k)(x);
            if (key === errorObj) {
                return this._o.onError(key.e);
            }
            var comparison = 0;
            if (!this._hv) {
                this._hv = true;
                this._v = key;
            }
            else {
                comparison = tryCatch(this._c)(key, this._v);
                if (comparison === errorObj) {
                    return this._o.onError(comparison.e);
                }
            }
            if (comparison > 0) {
                this._v = key;
                this._l = [];
            }
            if (comparison >= 0) {
                this._l.push(x);
            }
        };
        ExtremaByObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        ExtremaByObserver.prototype.completed = function () {
            this._o.onNext(this._l);
            this._o.onCompleted();
        };
        return ExtremaByObserver;
    }(AbstractObserver));
    function firstOnly(x) {
        if (x.length === 0) {
            throw new EmptyError();
        }
        return x[0];
    }
    var ReduceObservable = (function (__super__) {
        inherits(ReduceObservable, __super__);
        function ReduceObservable(source, accumulator, hasSeed, seed) {
            this.source = source;
            this.accumulator = accumulator;
            this.hasSeed = hasSeed;
            this.seed = seed;
            __super__.call(this);
        }
        ReduceObservable.prototype.subscribeCore = function (observer) {
            return this.source.subscribe(new ReduceObserver(observer, this));
        };
        return ReduceObservable;
    }(ObservableBase));
    var ReduceObserver = (function (__super__) {
        inherits(ReduceObserver, __super__);
        function ReduceObserver(o, parent) {
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
        ReduceObserver.prototype.next = function (x) {
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
            this._i++;
        };
        ReduceObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        ReduceObserver.prototype.completed = function () {
            this._hv && this._o.onNext(this._a);
            !this._hv && this._hs && this._o.onNext(this._s);
            !this._hv && !this._hs && this._o.onError(new EmptyError());
            this._o.onCompleted();
        };
        return ReduceObserver;
    }(AbstractObserver));
    /**
    * Applies an accumulator function over an observable sequence, returning the result of the aggregation as a single element in the result sequence. The specified seed value is used as the initial accumulator value.
    * For aggregation behavior with incremental intermediate results, see Observable.scan.
    * @param {Function} accumulator An accumulator function to be invoked on each element.
    * @param {Any} [seed] The initial accumulator value.
    * @returns {Observable} An observable sequence containing a single element with the final accumulator value.
    */
    observableProto.reduce = function () {
        var hasSeed = false, seed, accumulator = arguments[0];
        if (arguments.length === 2) {
            hasSeed = true;
            seed = arguments[1];
        }
        return new ReduceObservable(this, accumulator, hasSeed, seed);
    };
    var SomeObservable = (function (__super__) {
        inherits(SomeObservable, __super__);
        function SomeObservable(source, fn) {
            this.source = source;
            this._fn = fn;
            __super__.call(this);
        }
        SomeObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new SomeObserver(o, this._fn, this.source));
        };
        return SomeObservable;
    }(ObservableBase));
    var SomeObserver = (function (__super__) {
        inherits(SomeObserver, __super__);
        function SomeObserver(o, fn, s) {
            this._o = o;
            this._fn = fn;
            this._s = s;
            this._i = 0;
            __super__.call(this);
        }
        SomeObserver.prototype.next = function (x) {
            var result = tryCatch(this._fn)(x, this._i++, this._s);
            if (result === errorObj) {
                return this._o.onError(result.e);
            }
            if (Boolean(result)) {
                this._o.onNext(true);
                this._o.onCompleted();
            }
        };
        SomeObserver.prototype.error = function (e) { this._o.onError(e); };
        SomeObserver.prototype.completed = function () {
            this._o.onNext(false);
            this._o.onCompleted();
        };
        return SomeObserver;
    }(AbstractObserver));
    /**
     * Determines whether any element of an observable sequence satisfies a condition if present, else if any items are in the sequence.
     * @param {Function} [predicate] A function to test each element for a condition.
     * @returns {Observable} An observable sequence containing a single element determining whether any elements in the source sequence pass the test in the specified predicate if given, else if any items are in the sequence.
     */
    observableProto.some = function (predicate, thisArg) {
        var fn = bindCallback(predicate, thisArg, 3);
        return new SomeObservable(this, fn);
    };
    var IsEmptyObservable = (function (__super__) {
        inherits(IsEmptyObservable, __super__);
        function IsEmptyObservable(source) {
            this.source = source;
            __super__.call(this);
        }
        IsEmptyObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new IsEmptyObserver(o));
        };
        return IsEmptyObservable;
    }(ObservableBase));
    var IsEmptyObserver = (function (__super__) {
        inherits(IsEmptyObserver, __super__);
        function IsEmptyObserver(o) {
            this._o = o;
            __super__.call(this);
        }
        IsEmptyObserver.prototype.next = function () {
            this._o.onNext(false);
            this._o.onCompleted();
        };
        IsEmptyObserver.prototype.error = function (e) { this._o.onError(e); };
        IsEmptyObserver.prototype.completed = function () {
            this._o.onNext(true);
            this._o.onCompleted();
        };
        return IsEmptyObserver;
    }(AbstractObserver));
    /**
     * Determines whether an observable sequence is empty.
     * @returns {Observable} An observable sequence containing a single element determining whether the source sequence is empty.
     */
    observableProto.isEmpty = function () {
        return new IsEmptyObservable(this);
    };
    var EveryObservable = (function (__super__) {
        inherits(EveryObservable, __super__);
        function EveryObservable(source, fn) {
            this.source = source;
            this._fn = fn;
            __super__.call(this);
        }
        EveryObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new EveryObserver(o, this._fn, this.source));
        };
        return EveryObservable;
    }(ObservableBase));
    var EveryObserver = (function (__super__) {
        inherits(EveryObserver, __super__);
        function EveryObserver(o, fn, s) {
            this._o = o;
            this._fn = fn;
            this._s = s;
            this._i = 0;
            __super__.call(this);
        }
        EveryObserver.prototype.next = function (x) {
            var result = tryCatch(this._fn)(x, this._i++, this._s);
            if (result === errorObj) {
                return this._o.onError(result.e);
            }
            if (!Boolean(result)) {
                this._o.onNext(false);
                this._o.onCompleted();
            }
        };
        EveryObserver.prototype.error = function (e) { this._o.onError(e); };
        EveryObserver.prototype.completed = function () {
            this._o.onNext(true);
            this._o.onCompleted();
        };
        return EveryObserver;
    }(AbstractObserver));
    /**
     * Determines whether all elements of an observable sequence satisfy a condition.
     * @param {Function} [predicate] A function to test each element for a condition.
     * @param {Any} [thisArg] Object to use as this when executing callback.
     * @returns {Observable} An observable sequence containing a single element determining whether all elements in the source sequence pass the test in the specified predicate.
     */
    observableProto.every = function (predicate, thisArg) {
        var fn = bindCallback(predicate, thisArg, 3);
        return new EveryObservable(this, fn);
    };
    var IncludesObservable = (function (__super__) {
        inherits(IncludesObservable, __super__);
        function IncludesObservable(source, elem, idx) {
            var n = +idx || 0;
            Math.abs(n) === Infinity && (n = 0);
            this.source = source;
            this._elem = elem;
            this._n = n;
            __super__.call(this);
        }
        IncludesObservable.prototype.subscribeCore = function (o) {
            if (this._n < 0) {
                o.onNext(false);
                o.onCompleted();
                return disposableEmpty;
            }
            return this.source.subscribe(new IncludesObserver(o, this._elem, this._n));
        };
        return IncludesObservable;
    }(ObservableBase));
    var IncludesObserver = (function (__super__) {
        inherits(IncludesObserver, __super__);
        function IncludesObserver(o, elem, n) {
            this._o = o;
            this._elem = elem;
            this._n = n;
            this._i = 0;
            __super__.call(this);
        }
        function comparer(a, b) {
            return (a === 0 && b === 0) || (a === b || (isNaN(a) && isNaN(b)));
        }
        IncludesObserver.prototype.next = function (x) {
            if (this._i++ >= this._n && comparer(x, this._elem)) {
                this._o.onNext(true);
                this._o.onCompleted();
            }
        };
        IncludesObserver.prototype.error = function (e) { this._o.onError(e); };
        IncludesObserver.prototype.completed = function () { this._o.onNext(false); this._o.onCompleted(); };
        return IncludesObserver;
    }(AbstractObserver));
    /**
     * Determines whether an observable sequence includes a specified element with an optional equality comparer.
     * @param searchElement The value to locate in the source sequence.
     * @param {Number} [fromIndex] An equality comparer to compare elements.
     * @returns {Observable} An observable sequence containing a single element determining whether the source sequence includes an element that has the specified value from the given index.
     */
    observableProto.includes = function (searchElement, fromIndex) {
        return new IncludesObservable(this, searchElement, fromIndex);
    };
    var CountObservable = (function (__super__) {
        inherits(CountObservable, __super__);
        function CountObservable(source, fn) {
            this.source = source;
            this._fn = fn;
            __super__.call(this);
        }
        CountObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new CountObserver(o, this._fn, this.source));
        };
        return CountObservable;
    }(ObservableBase));
    var CountObserver = (function (__super__) {
        inherits(CountObserver, __super__);
        function CountObserver(o, fn, s) {
            this._o = o;
            this._fn = fn;
            this._s = s;
            this._i = 0;
            this._c = 0;
            __super__.call(this);
        }
        CountObserver.prototype.next = function (x) {
            if (this._fn) {
                var result = tryCatch(this._fn)(x, this._i++, this._s);
                if (result === errorObj) {
                    return this._o.onError(result.e);
                }
                Boolean(result) && (this._c++);
            }
            else {
                this._c++;
            }
        };
        CountObserver.prototype.error = function (e) { this._o.onError(e); };
        CountObserver.prototype.completed = function () {
            this._o.onNext(this._c);
            this._o.onCompleted();
        };
        return CountObserver;
    }(AbstractObserver));
    /**
     * Returns an observable sequence containing a value that represents how many elements in the specified observable sequence satisfy a condition if provided, else the count of items.
     * @example
     * res = source.count();
     * res = source.count(function (x) { return x > 3; });
     * @param {Function} [predicate]A function to test each element for a condition.
     * @param {Any} [thisArg] Object to use as this when executing callback.
     * @returns {Observable} An observable sequence containing a single element with a number that represents how many elements in the input sequence satisfy the condition in the predicate function if provided, else the count of items in the sequence.
     */
    observableProto.count = function (predicate, thisArg) {
        var fn = bindCallback(predicate, thisArg, 3);
        return new CountObservable(this, fn);
    };
    var IndexOfObservable = (function (__super__) {
        inherits(IndexOfObservable, __super__);
        function IndexOfObservable(source, e, n) {
            this.source = source;
            this._e = e;
            this._n = n;
            __super__.call(this);
        }
        IndexOfObservable.prototype.subscribeCore = function (o) {
            if (this._n < 0) {
                o.onNext(-1);
                o.onCompleted();
                return disposableEmpty;
            }
            return this.source.subscribe(new IndexOfObserver(o, this._e, this._n));
        };
        return IndexOfObservable;
    }(ObservableBase));
    var IndexOfObserver = (function (__super__) {
        inherits(IndexOfObserver, __super__);
        function IndexOfObserver(o, e, n) {
            this._o = o;
            this._e = e;
            this._n = n;
            this._i = 0;
            __super__.call(this);
        }
        IndexOfObserver.prototype.next = function (x) {
            if (this._i >= this._n && x === this._e) {
                this._o.onNext(this._i);
                this._o.onCompleted();
            }
            this._i++;
        };
        IndexOfObserver.prototype.error = function (e) { this._o.onError(e); };
        IndexOfObserver.prototype.completed = function () { this._o.onNext(-1); this._o.onCompleted(); };
        return IndexOfObserver;
    }(AbstractObserver));
    /**
     * Returns the first index at which a given element can be found in the observable sequence, or -1 if it is not present.
     * @param {Any} searchElement Element to locate in the array.
     * @param {Number} [fromIndex] The index to start the search.  If not specified, defaults to 0.
     * @returns {Observable} And observable sequence containing the first index at which a given element can be found in the observable sequence, or -1 if it is not present.
     */
    observableProto.indexOf = function (searchElement, fromIndex) {
        var n = +fromIndex || 0;
        Math.abs(n) === Infinity && (n = 0);
        return new IndexOfObservable(this, searchElement, n);
    };
    var SumObservable = (function (__super__) {
        inherits(SumObservable, __super__);
        function SumObservable(source, fn) {
            this.source = source;
            this._fn = fn;
            __super__.call(this);
        }
        SumObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new SumObserver(o, this._fn, this.source));
        };
        return SumObservable;
    }(ObservableBase));
    var SumObserver = (function (__super__) {
        inherits(SumObserver, __super__);
        function SumObserver(o, fn, s) {
            this._o = o;
            this._fn = fn;
            this._s = s;
            this._i = 0;
            this._c = 0;
            __super__.call(this);
        }
        SumObserver.prototype.next = function (x) {
            if (this._fn) {
                var result = tryCatch(this._fn)(x, this._i++, this._s);
                if (result === errorObj) {
                    return this._o.onError(result.e);
                }
                this._c += result;
            }
            else {
                this._c += x;
            }
        };
        SumObserver.prototype.error = function (e) { this._o.onError(e); };
        SumObserver.prototype.completed = function () {
            this._o.onNext(this._c);
            this._o.onCompleted();
        };
        return SumObserver;
    }(AbstractObserver));
    /**
     * Computes the sum of a sequence of values that are obtained by invoking an optional transform function on each element of the input sequence, else if not specified computes the sum on each item in the sequence.
     * @param {Function} [selector] A transform function to apply to each element.
     * @param {Any} [thisArg] Object to use as this when executing callback.
     * @returns {Observable} An observable sequence containing a single element with the sum of the values in the source sequence.
     */
    observableProto.sum = function (keySelector, thisArg) {
        var fn = bindCallback(keySelector, thisArg, 3);
        return new SumObservable(this, fn);
    };
    /**
     * Returns the elements in an observable sequence with the minimum key value according to the specified comparer.
     * @example
     * var res = source.minBy(function (x) { return x.value; });
     * var res = source.minBy(function (x) { return x.value; }, function (x, y) { return x - y; });
     * @param {Function} keySelector Key selector function.
     * @param {Function} [comparer] Comparer used to compare key values.
     * @returns {Observable} An observable sequence containing a list of zero or more elements that have a minimum key value.
     */
    observableProto.minBy = function (keySelector, comparer) {
        comparer || (comparer = defaultSubComparer);
        return new ExtremaByObservable(this, keySelector, function (x, y) { return comparer(x, y) * -1; });
    };
    /**
     * Returns the minimum element in an observable sequence according to the optional comparer else a default greater than less than check.
     * @example
     * var res = source.min();
     * var res = source.min(function (x, y) { return x.value - y.value; });
     * @param {Function} [comparer] Comparer used to compare elements.
     * @returns {Observable} An observable sequence containing a single element with the minimum element in the source sequence.
     */
    observableProto.min = function (comparer) {
        return this.minBy(identity, comparer).map(firstOnly);
    };
    /**
     * Returns the elements in an observable sequence with the maximum  key value according to the specified comparer.
     * @example
     * var res = source.maxBy(function (x) { return x.value; });
     * var res = source.maxBy(function (x) { return x.value; }, function (x, y) { return x - y;; });
     * @param {Function} keySelector Key selector function.
     * @param {Function} [comparer]  Comparer used to compare key values.
     * @returns {Observable} An observable sequence containing a list of zero or more elements that have a maximum key value.
     */
    observableProto.maxBy = function (keySelector, comparer) {
        comparer || (comparer = defaultSubComparer);
        return new ExtremaByObservable(this, keySelector, comparer);
    };
    /**
     * Returns the maximum value in an observable sequence according to the specified comparer.
     * @example
     * var res = source.max();
     * var res = source.max(function (x, y) { return x.value - y.value; });
     * @param {Function} [comparer] Comparer used to compare elements.
     * @returns {Observable} An observable sequence containing a single element with the maximum element in the source sequence.
     */
    observableProto.max = function (comparer) {
        return this.maxBy(identity, comparer).map(firstOnly);
    };
    var AverageObservable = (function (__super__) {
        inherits(AverageObservable, __super__);
        function AverageObservable(source, fn) {
            this.source = source;
            this._fn = fn;
            __super__.call(this);
        }
        AverageObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new AverageObserver(o, this._fn, this.source));
        };
        return AverageObservable;
    }(ObservableBase));
    var AverageObserver = (function (__super__) {
        inherits(AverageObserver, __super__);
        function AverageObserver(o, fn, s) {
            this._o = o;
            this._fn = fn;
            this._s = s;
            this._c = 0;
            this._t = 0;
            __super__.call(this);
        }
        AverageObserver.prototype.next = function (x) {
            if (this._fn) {
                var r = tryCatch(this._fn)(x, this._c++, this._s);
                if (r === errorObj) {
                    return this._o.onError(r.e);
                }
                this._t += r;
            }
            else {
                this._c++;
                this._t += x;
            }
        };
        AverageObserver.prototype.error = function (e) { this._o.onError(e); };
        AverageObserver.prototype.completed = function () {
            if (this._c === 0) {
                return this._o.onError(new EmptyError());
            }
            this._o.onNext(this._t / this._c);
            this._o.onCompleted();
        };
        return AverageObserver;
    }(AbstractObserver));
    /**
     * Computes the average of an observable sequence of values that are in the sequence or obtained by invoking a transform function on each element of the input sequence if present.
     * @param {Function} [selector] A transform function to apply to each element.
     * @param {Any} [thisArg] Object to use as this when executing callback.
     * @returns {Observable} An observable sequence containing a single element with the average of the sequence of values.
     */
    observableProto.average = function (keySelector, thisArg) {
        var source = this, fn;
        if (isFunction(keySelector)) {
            fn = bindCallback(keySelector, thisArg, 3);
        }
        return new AverageObservable(source, fn);
    };
    /**
     *  Determines whether two sequences are equal by comparing the elements pairwise using a specified equality comparer.
     *
     * @example
     * var res = res = source.sequenceEqual([1,2,3]);
     * var res = res = source.sequenceEqual([{ value: 42 }], function (x, y) { return x.value === y.value; });
     * 3 - res = source.sequenceEqual(Rx.Observable.returnValue(42));
     * 4 - res = source.sequenceEqual(Rx.Observable.returnValue({ value: 42 }), function (x, y) { return x.value === y.value; });
     * @param {Observable} second Second observable sequence or array to compare.
     * @param {Function} [comparer] Comparer used to compare elements of both sequences.
     * @returns {Observable} An observable sequence that contains a single element which indicates whether both sequences are of equal length and their corresponding elements are equal according to the specified equality comparer.
     */
    observableProto.sequenceEqual = function (second, comparer) {
        var first = this;
        comparer || (comparer = defaultComparer);
        return new AnonymousObservable(function (o) {
            var donel = false, doner = false, ql = [], qr = [];
            var subscription1 = first.subscribe(function (x) {
                if (qr.length > 0) {
                    var v = qr.shift();
                    var equal = tryCatch(comparer)(v, x);
                    if (equal === errorObj) {
                        return o.onError(equal.e);
                    }
                    if (!equal) {
                        o.onNext(false);
                        o.onCompleted();
                    }
                }
                else if (doner) {
                    o.onNext(false);
                    o.onCompleted();
                }
                else {
                    ql.push(x);
                }
            }, function (e) { o.onError(e); }, function () {
                donel = true;
                if (ql.length === 0) {
                    if (qr.length > 0) {
                        o.onNext(false);
                        o.onCompleted();
                    }
                    else if (doner) {
                        o.onNext(true);
                        o.onCompleted();
                    }
                }
            });
            (isArrayLike(second) || isIterable(second)) && (second = observableFrom(second));
            isPromise(second) && (second = observableFromPromise(second));
            var subscription2 = second.subscribe(function (x) {
                if (ql.length > 0) {
                    var v = ql.shift();
                    var equal = tryCatch(comparer)(v, x);
                    if (equal === errorObj) {
                        return o.onError(equal.e);
                    }
                    if (!equal) {
                        o.onNext(false);
                        o.onCompleted();
                    }
                }
                else if (donel) {
                    o.onNext(false);
                    o.onCompleted();
                }
                else {
                    qr.push(x);
                }
            }, function (e) { o.onError(e); }, function () {
                doner = true;
                if (qr.length === 0) {
                    if (ql.length > 0) {
                        o.onNext(false);
                        o.onCompleted();
                    }
                    else if (donel) {
                        o.onNext(true);
                        o.onCompleted();
                    }
                }
            });
            return new BinaryDisposable(subscription1, subscription2);
        }, first);
    };
    var ElementAtObservable = (function (__super__) {
        inherits(ElementAtObservable, __super__);
        function ElementAtObservable(source, i, d) {
            this.source = source;
            this._i = i;
            this._d = d;
            __super__.call(this);
        }
        ElementAtObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new ElementAtObserver(o, this._i, this._d));
        };
        return ElementAtObservable;
    }(ObservableBase));
    var ElementAtObserver = (function (__super__) {
        inherits(ElementAtObserver, __super__);
        function ElementAtObserver(o, i, d) {
            this._o = o;
            this._i = i;
            this._d = d;
            __super__.call(this);
        }
        ElementAtObserver.prototype.next = function (x) {
            if (this._i-- === 0) {
                this._o.onNext(x);
                this._o.onCompleted();
            }
        };
        ElementAtObserver.prototype.error = function (e) { this._o.onError(e); };
        ElementAtObserver.prototype.completed = function () {
            if (this._d === undefined) {
                this._o.onError(new ArgumentOutOfRangeError());
            }
            else {
                this._o.onNext(this._d);
                this._o.onCompleted();
            }
        };
        return ElementAtObserver;
    }(AbstractObserver));
    /**
     * Returns the element at a specified index in a sequence or default value if not found.
     * @param {Number} index The zero-based index of the element to retrieve.
     * @param {Any} [defaultValue] The default value to use if elementAt does not find a value.
     * @returns {Observable} An observable sequence that produces the element at the specified position in the source sequence.
     */
    observableProto.elementAt = function (index, defaultValue) {
        if (index < 0) {
            throw new ArgumentOutOfRangeError();
        }
        return new ElementAtObservable(this, index, defaultValue);
    };
    var SingleObserver = (function (__super__) {
        inherits(SingleObserver, __super__);
        function SingleObserver(o, obj, s) {
            this._o = o;
            this._obj = obj;
            this._s = s;
            this._i = 0;
            this._hv = false;
            this._v = null;
            __super__.call(this);
        }
        SingleObserver.prototype.next = function (x) {
            var shouldYield = false;
            if (this._obj.predicate) {
                var res = tryCatch(this._obj.predicate)(x, this._i++, this._s);
                if (res === errorObj) {
                    return this._o.onError(res.e);
                }
                Boolean(res) && (shouldYield = true);
            }
            else if (!this._obj.predicate) {
                shouldYield = true;
            }
            if (shouldYield) {
                if (this._hv) {
                    return this._o.onError(new Error('Sequence contains more than one matching element'));
                }
                this._hv = true;
                this._v = x;
            }
        };
        SingleObserver.prototype.error = function (e) { this._o.onError(e); };
        SingleObserver.prototype.completed = function () {
            if (this._hv) {
                this._o.onNext(this._v);
                this._o.onCompleted();
            }
            else if (this._obj.defaultValue === undefined) {
                this._o.onError(new EmptyError());
            }
            else {
                this._o.onNext(this._obj.defaultValue);
                this._o.onCompleted();
            }
        };
        return SingleObserver;
    }(AbstractObserver));
    /**
     * Returns the only element of an observable sequence that satisfies the condition in the optional predicate, and reports an exception if there is not exactly one element in the observable sequence.
     * @returns {Observable} Sequence containing the single element in the observable sequence that satisfies the condition in the predicate.
     */
    observableProto.single = function (predicate, thisArg) {
        var obj = {}, source = this;
        if (typeof arguments[0] === 'object') {
            obj = arguments[0];
        }
        else {
            obj = {
                predicate: arguments[0],
                thisArg: arguments[1],
                defaultValue: arguments[2]
            };
        }
        if (isFunction(obj.predicate)) {
            var fn = obj.predicate;
            obj.predicate = bindCallback(fn, obj.thisArg, 3);
        }
        return new AnonymousObservable(function (o) {
            return source.subscribe(new SingleObserver(o, obj, source));
        }, source);
    };
    var FirstObservable = (function (__super__) {
        inherits(FirstObservable, __super__);
        function FirstObservable(source, obj) {
            this.source = source;
            this._obj = obj;
            __super__.call(this);
        }
        FirstObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new FirstObserver(o, this._obj, this.source));
        };
        return FirstObservable;
    }(ObservableBase));
    var FirstObserver = (function (__super__) {
        inherits(FirstObserver, __super__);
        function FirstObserver(o, obj, s) {
            this._o = o;
            this._obj = obj;
            this._s = s;
            this._i = 0;
            __super__.call(this);
        }
        FirstObserver.prototype.next = function (x) {
            if (this._obj.predicate) {
                var res = tryCatch(this._obj.predicate)(x, this._i++, this._s);
                if (res === errorObj) {
                    return this._o.onError(res.e);
                }
                if (Boolean(res)) {
                    this._o.onNext(x);
                    this._o.onCompleted();
                }
            }
            else if (!this._obj.predicate) {
                this._o.onNext(x);
                this._o.onCompleted();
            }
        };
        FirstObserver.prototype.error = function (e) { this._o.onError(e); };
        FirstObserver.prototype.completed = function () {
            if (this._obj.defaultValue === undefined) {
                this._o.onError(new EmptyError());
            }
            else {
                this._o.onNext(this._obj.defaultValue);
                this._o.onCompleted();
            }
        };
        return FirstObserver;
    }(AbstractObserver));
    /**
     * Returns the first element of an observable sequence that satisfies the condition in the predicate if present else the first item in the sequence.
     * @returns {Observable} Sequence containing the first element in the observable sequence that satisfies the condition in the predicate if provided, else the first item in the sequence.
     */
    observableProto.first = function () {
        var obj = {}, source = this;
        if (typeof arguments[0] === 'object') {
            obj = arguments[0];
        }
        else {
            obj = {
                predicate: arguments[0],
                thisArg: arguments[1],
                defaultValue: arguments[2]
            };
        }
        if (isFunction(obj.predicate)) {
            var fn = obj.predicate;
            obj.predicate = bindCallback(fn, obj.thisArg, 3);
        }
        return new FirstObservable(this, obj);
    };
    var LastObservable = (function (__super__) {
        inherits(LastObservable, __super__);
        function LastObservable(source, obj) {
            this.source = source;
            this._obj = obj;
            __super__.call(this);
        }
        LastObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new LastObserver(o, this._obj, this.source));
        };
        return LastObservable;
    }(ObservableBase));
    var LastObserver = (function (__super__) {
        inherits(LastObserver, __super__);
        function LastObserver(o, obj, s) {
            this._o = o;
            this._obj = obj;
            this._s = s;
            this._i = 0;
            this._hv = false;
            this._v = null;
            __super__.call(this);
        }
        LastObserver.prototype.next = function (x) {
            var shouldYield = false;
            if (this._obj.predicate) {
                var res = tryCatch(this._obj.predicate)(x, this._i++, this._s);
                if (res === errorObj) {
                    return this._o.onError(res.e);
                }
                Boolean(res) && (shouldYield = true);
            }
            else if (!this._obj.predicate) {
                shouldYield = true;
            }
            if (shouldYield) {
                this._hv = true;
                this._v = x;
            }
        };
        LastObserver.prototype.error = function (e) { this._o.onError(e); };
        LastObserver.prototype.completed = function () {
            if (this._hv) {
                this._o.onNext(this._v);
                this._o.onCompleted();
            }
            else if (this._obj.defaultValue === undefined) {
                this._o.onError(new EmptyError());
            }
            else {
                this._o.onNext(this._obj.defaultValue);
                this._o.onCompleted();
            }
        };
        return LastObserver;
    }(AbstractObserver));
    /**
     * Returns the last element of an observable sequence that satisfies the condition in the predicate if specified, else the last element.
     * @returns {Observable} Sequence containing the last element in the observable sequence that satisfies the condition in the predicate.
     */
    observableProto.last = function () {
        var obj = {}, source = this;
        if (typeof arguments[0] === 'object') {
            obj = arguments[0];
        }
        else {
            obj = {
                predicate: arguments[0],
                thisArg: arguments[1],
                defaultValue: arguments[2]
            };
        }
        if (isFunction(obj.predicate)) {
            var fn = obj.predicate;
            obj.predicate = bindCallback(fn, obj.thisArg, 3);
        }
        return new LastObservable(this, obj);
    };
    var FindValueObserver = (function (__super__) {
        inherits(FindValueObserver, __super__);
        function FindValueObserver(observer, source, callback, yieldIndex) {
            this._o = observer;
            this._s = source;
            this._cb = callback;
            this._y = yieldIndex;
            this._i = 0;
            __super__.call(this);
        }
        FindValueObserver.prototype.next = function (x) {
            var shouldRun = tryCatch(this._cb)(x, this._i, this._s);
            if (shouldRun === errorObj) {
                return this._o.onError(shouldRun.e);
            }
            if (shouldRun) {
                this._o.onNext(this._y ? this._i : x);
                this._o.onCompleted();
            }
            else {
                this._i++;
            }
        };
        FindValueObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        FindValueObserver.prototype.completed = function () {
            this._y && this._o.onNext(-1);
            this._o.onCompleted();
        };
        return FindValueObserver;
    }(AbstractObserver));
    function findValue(source, predicate, thisArg, yieldIndex) {
        var callback = bindCallback(predicate, thisArg, 3);
        return new AnonymousObservable(function (o) {
            return source.subscribe(new FindValueObserver(o, source, callback, yieldIndex));
        }, source);
    }
    /**
     * Searches for an element that matches the conditions defined by the specified predicate, and returns the first occurrence within the entire Observable sequence.
     * @param {Function} predicate The predicate that defines the conditions of the element to search for.
     * @param {Any} [thisArg] Object to use as `this` when executing the predicate.
     * @returns {Observable} An Observable sequence with the first element that matches the conditions defined by the specified predicate, if found; otherwise, undefined.
     */
    observableProto.find = function (predicate, thisArg) {
        return findValue(this, predicate, thisArg, false);
    };
    /**
     * Searches for an element that matches the conditions defined by the specified predicate, and returns
     * an Observable sequence with the zero-based index of the first occurrence within the entire Observable sequence.
     * @param {Function} predicate The predicate that defines the conditions of the element to search for.
     * @param {Any} [thisArg] Object to use as `this` when executing the predicate.
     * @returns {Observable} An Observable sequence with the zero-based index of the first occurrence of an element that matches the conditions defined by match, if found; otherwise, –1.
    */
    observableProto.findIndex = function (predicate, thisArg) {
        return findValue(this, predicate, thisArg, true);
    };
    var ToSetObservable = (function (__super__) {
        inherits(ToSetObservable, __super__);
        function ToSetObservable(source) {
            this.source = source;
            __super__.call(this);
        }
        ToSetObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new ToSetObserver(o));
        };
        return ToSetObservable;
    }(ObservableBase));
    var ToSetObserver = (function (__super__) {
        inherits(ToSetObserver, __super__);
        function ToSetObserver(o) {
            this._o = o;
            this._s = new root.Set();
            __super__.call(this);
        }
        ToSetObserver.prototype.next = function (x) {
            this._s.add(x);
        };
        ToSetObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        ToSetObserver.prototype.completed = function () {
            this._o.onNext(this._s);
            this._o.onCompleted();
        };
        return ToSetObserver;
    }(AbstractObserver));
    /**
     * Converts the observable sequence to a Set if it exists.
     * @returns {Observable} An observable sequence with a single value of a Set containing the values from the observable sequence.
     */
    observableProto.toSet = function () {
        if (typeof root.Set === 'undefined') {
            throw new TypeError();
        }
        return new ToSetObservable(this);
    };
    var ToMapObservable = (function (__super__) {
        inherits(ToMapObservable, __super__);
        function ToMapObservable(source, k, e) {
            this.source = source;
            this._k = k;
            this._e = e;
            __super__.call(this);
        }
        ToMapObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new ToMapObserver(o, this._k, this._e));
        };
        return ToMapObservable;
    }(ObservableBase));
    var ToMapObserver = (function (__super__) {
        inherits(ToMapObserver, __super__);
        function ToMapObserver(o, k, e) {
            this._o = o;
            this._k = k;
            this._e = e;
            this._m = new root.Map();
            __super__.call(this);
        }
        ToMapObserver.prototype.next = function (x) {
            var key = tryCatch(this._k)(x);
            if (key === errorObj) {
                return this._o.onError(key.e);
            }
            var elem = x;
            if (this._e) {
                elem = tryCatch(this._e)(x);
                if (elem === errorObj) {
                    return this._o.onError(elem.e);
                }
            }
            this._m.set(key, elem);
        };
        ToMapObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        ToMapObserver.prototype.completed = function () {
            this._o.onNext(this._m);
            this._o.onCompleted();
        };
        return ToMapObserver;
    }(AbstractObserver));
    /**
    * Converts the observable sequence to a Map if it exists.
    * @param {Function} keySelector A function which produces the key for the Map.
    * @param {Function} [elementSelector] An optional function which produces the element for the Map. If not present, defaults to the value from the observable sequence.
    * @returns {Observable} An observable sequence with a single value of a Map containing the values from the observable sequence.
    */
    observableProto.toMap = function (keySelector, elementSelector) {
        if (typeof root.Map === 'undefined') {
            throw new TypeError();
        }
        return new ToMapObservable(this, keySelector, elementSelector);
    };
    var SliceObservable = (function (__super__) {
        inherits(SliceObservable, __super__);
        function SliceObservable(source, b, e) {
            this.source = source;
            this._b = b;
            this._e = e;
            __super__.call(this);
        }
        SliceObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new SliceObserver(o, this._b, this._e));
        };
        return SliceObservable;
    }(ObservableBase));
    var SliceObserver = (function (__super__) {
        inherits(SliceObserver, __super__);
        function SliceObserver(o, b, e) {
            this._o = o;
            this._b = b;
            this._e = e;
            this._i = 0;
            __super__.call(this);
        }
        SliceObserver.prototype.next = function (x) {
            if (this._i >= this._b) {
                if (this._e === this._i) {
                    this._o.onCompleted();
                }
                else {
                    this._o.onNext(x);
                }
            }
            this._i++;
        };
        SliceObserver.prototype.error = function (e) { this._o.onError(e); };
        SliceObserver.prototype.completed = function () { this._o.onCompleted(); };
        return SliceObserver;
    }(AbstractObserver));
    /*
    * The slice() method returns a shallow copy of a portion of an Observable into a new Observable object.
    * Unlike the array version, this does not support negative numbers for being or end.
    * @param {Number} [begin] Zero-based index at which to begin extraction. If omitted, this will default to zero.
    * @param {Number} [end] Zero-based index at which to end extraction. slice extracts up to but not including end.
    * If omitted, this will emit the rest of the Observable object.
    * @returns {Observable} A shallow copy of a portion of an Observable into a new Observable object.
    */
    observableProto.slice = function (begin, end) {
        var start = begin || 0;
        if (start < 0) {
            throw new Rx.ArgumentOutOfRangeError();
        }
        if (typeof end === 'number' && end < start) {
            throw new Rx.ArgumentOutOfRangeError();
        }
        return new SliceObservable(this, start, end);
    };
    var LastIndexOfObservable = (function (__super__) {
        inherits(LastIndexOfObservable, __super__);
        function LastIndexOfObservable(source, e, n) {
            this.source = source;
            this._e = e;
            this._n = n;
            __super__.call(this);
        }
        LastIndexOfObservable.prototype.subscribeCore = function (o) {
            if (this._n < 0) {
                o.onNext(-1);
                o.onCompleted();
                return disposableEmpty;
            }
            return this.source.subscribe(new LastIndexOfObserver(o, this._e, this._n));
        };
        return LastIndexOfObservable;
    }(ObservableBase));
    var LastIndexOfObserver = (function (__super__) {
        inherits(LastIndexOfObserver, __super__);
        function LastIndexOfObserver(o, e, n) {
            this._o = o;
            this._e = e;
            this._n = n;
            this._v = 0;
            this._hv = false;
            this._i = 0;
            __super__.call(this);
        }
        LastIndexOfObserver.prototype.next = function (x) {
            if (this._i >= this._n && x === this._e) {
                this._hv = true;
                this._v = this._i;
            }
            this._i++;
        };
        LastIndexOfObserver.prototype.error = function (e) { this._o.onError(e); };
        LastIndexOfObserver.prototype.completed = function () {
            if (this._hv) {
                this._o.onNext(this._v);
            }
            else {
                this._o.onNext(-1);
            }
            this._o.onCompleted();
        };
        return LastIndexOfObserver;
    }(AbstractObserver));
    /**
     * Returns the last index at which a given element can be found in the observable sequence, or -1 if it is not present.
     * @param {Any} searchElement Element to locate in the array.
     * @param {Number} [fromIndex] The index to start the search.  If not specified, defaults to 0.
     * @returns {Observable} And observable sequence containing the last index at which a given element can be found in the observable sequence, or -1 if it is not present.
     */
    observableProto.lastIndexOf = function (searchElement, fromIndex) {
        var n = +fromIndex || 0;
        Math.abs(n) === Infinity && (n = 0);
        return new LastIndexOfObservable(this, searchElement, n);
    };
    return Rx;
}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccnguYWdncmVnYXRlcy5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccnguYWdncmVnYXRlcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSw2R0FBNkc7QUFFN0csQ0FBQztBQUFBLENBQUMsVUFBVSxPQUFPO0lBQ2pCLElBQUksV0FBVyxHQUFHO1FBQ2hCLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLFFBQVEsRUFBRSxJQUFJO0tBQ2YsQ0FBQztJQUVGLHFCQUFxQixLQUFLO1FBQ3hCLE1BQU0sQ0FBQyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDM0QsQ0FBQztJQUVELElBQUksV0FBVyxHQUFHLENBQUMsV0FBVyxDQUFDLE9BQU8sT0FBTyxDQUFDLElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDakcsSUFBSSxVQUFVLEdBQUcsQ0FBQyxXQUFXLENBQUMsT0FBTyxNQUFNLENBQUMsSUFBSSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQztJQUM1RixJQUFJLFVBQVUsR0FBRyxXQUFXLENBQUMsV0FBVyxJQUFJLFVBQVUsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLElBQUksTUFBTSxDQUFDLENBQUM7SUFDaEcsSUFBSSxRQUFRLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FB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S0FBSyxHQUFHLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNFLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUc7WUFDeEMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzFCLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTixJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLENBQUM7WUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3hCLENBQUMsQ0FBQztRQUVGLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQztJQUM3QixDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0lBRXJCOzs7OztPQUtHO0lBQ0gsZUFBZSxDQUFDLFdBQVcsR0FBRyxVQUFTLGFBQWEsRUFBRSxTQUFTO1FBQzdELElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUMsQ0FBQztJQUVGLE1BQU0sQ0FBQyxFQUFFLENBQUM7QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQsIEFsbCByaWdodHMgcmVzZXJ2ZWQuIFNlZSBMaWNlbnNlLnR4dCBpbiB0aGUgcHJvamVjdCByb290IGZvciBsaWNlbnNlIGluZm9ybWF0aW9uLlxuXG47KGZ1bmN0aW9uIChmYWN0b3J5KSB7XG4gIHZhciBvYmplY3RUeXBlcyA9IHtcbiAgICAnZnVuY3Rpb24nOiB0cnVlLFxuICAgICdvYmplY3QnOiB0cnVlXG4gIH07XG5cbiAgZnVuY3Rpb24gY2hlY2tHbG9iYWwodmFsdWUpIHtcbiAgICByZXR1cm4gKHZhbHVlICYmIHZhbHVlLk9iamVjdCA9PT0gT2JqZWN0KSA/IHZhbHVlIDogbnVsbDtcbiAgfVxuXG4gIHZhciBmcmVlRXhwb3J0cyA9IChvYmplY3RUeXBlc1t0eXBlb2YgZXhwb3J0c10gJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSkgPyBleHBvcnRzIDogbnVsbDtcbiAgdmFyIGZyZWVNb2R1bGUgPSAob2JqZWN0VHlwZXNbdHlwZW9mIG1vZHVsZV0gJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUpID8gbW9kdWxlIDogbnVsbDtcbiAgdmFyIGZyZWVHbG9iYWwgPSBjaGVja0dsb2JhbChmcmVlRXhwb3J0cyAmJiBmcmVlTW9kdWxlICYmIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIGdsb2JhbCk7XG4gIHZhciBmcmVlU2VsZiA9IGNoZWNrR2xvYmFsKG9iamVjdFR5cGVzW3R5cGVvZiBzZWxmXSAmJiBzZWxmKTtcbiAgdmFyIGZyZWVXaW5kb3cgPSBjaGVja0dsb2JhbChvYmplY3RUeXBlc1t0eXBlb2Ygd2luZG93XSAmJiB3aW5kb3cpO1xuICB2YXIgbW9kdWxlRXhwb3J0cyA9IChmcmVlTW9kdWxlICYmIGZyZWVNb2R1bGUuZXhwb3J0cyA9PT0gZnJlZUV4cG9ydHMpID8gZnJlZUV4cG9ydHMgOiBudWxsO1xuICB2YXIgdGhpc0dsb2JhbCA9IGNoZWNrR2xvYmFsKG9iamVjdFR5cGVzW3R5cGVvZiB0aGlzXSAmJiB0aGlzKTtcbiAgdmFyIHJvb3QgPSBmcmVlR2xvYmFsIHx8ICgoZnJlZVdpbmRvdyAhPT0gKHRoaXNHbG9iYWwgJiYgdGhpc0dsb2JhbC53aW5kb3cpKSAmJiBmcmVlV2luZG93KSB8fCBmcmVlU2VsZiB8fCB0aGlzR2xvYmFsIHx8IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG5cbiAgLy8gQmVjYXVzZSBvZiBidWlsZCBvcHRpbWl6ZXJzXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoWycuL3J4J10sIGZ1bmN0aW9uIChSeCwgZXhwb3J0cykge1xuICAgICAgcmV0dXJuIGZhY3Rvcnkocm9vdCwgZXhwb3J0cywgUngpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZSAmJiBtb2R1bGUuZXhwb3J0cyA9PT0gZnJlZUV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnkocm9vdCwgbW9kdWxlLmV4cG9ydHMsIHJlcXVpcmUoJy4vcngnKSk7XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5SeCA9IGZhY3Rvcnkocm9vdCwge30sIHJvb3QuUngpO1xuICB9XG59LmNhbGwodGhpcywgZnVuY3Rpb24gKHJvb3QsIGV4cCwgUngsIHVuZGVmaW5lZCkge1xuXG4gIC8vIFJlZmVyZW5jZXNcbiAgdmFyIE9ic2VydmFibGUgPSBSeC5PYnNlcnZhYmxlLFxuICAgIG9ic2VydmFibGVQcm90byA9IE9ic2VydmFibGUucHJvdG90eXBlLFxuICAgIEJpbmFyeURpc3Bvc2FibGUgPSBSeC5CaW5hcnlEaXNwb3NhYmxlLFxuICAgIEFub255bW91c09ic2VydmFibGUgPSBSeC5Bbm9ueW1vdXNPYnNlcnZhYmxlLFxuICAgIEFic3RyYWN0T2JzZXJ2ZXIgPSBSeC5pbnRlcm5hbHMuQWJzdHJhY3RPYnNlcnZlcixcbiAgICBkaXNwb3NhYmxlRW1wdHkgPSBSeC5EaXNwb3NhYmxlLmVtcHR5LFxuICAgIGhlbHBlcnMgPSBSeC5oZWxwZXJzLFxuICAgIGRlZmF1bHRDb21wYXJlciA9IGhlbHBlcnMuZGVmYXVsdENvbXBhcmVyLFxuICAgIGlkZW50aXR5ID0gaGVscGVycy5pZGVudGl0eSxcbiAgICBkZWZhdWx0U3ViQ29tcGFyZXIgPSBoZWxwZXJzLmRlZmF1bHRTdWJDb21wYXJlcixcbiAgICBpc0Z1bmN0aW9uID0gaGVscGVycy5pc0Z1bmN0aW9uLFxuICAgIGlzUHJvbWlzZSA9IGhlbHBlcnMuaXNQcm9taXNlLFxuICAgIGlzQXJyYXlMaWtlID0gaGVscGVycy5pc0FycmF5TGlrZSxcbiAgICBpc0l0ZXJhYmxlID0gaGVscGVycy5pc0l0ZXJhYmxlLFxuICAgIGluaGVyaXRzID0gUnguaW50ZXJuYWxzLmluaGVyaXRzLFxuICAgIG9ic2VydmFibGVGcm9tUHJvbWlzZSA9IE9ic2VydmFibGUuZnJvbVByb21pc2UsXG4gICAgb2JzZXJ2YWJsZUZyb20gPSBPYnNlcnZhYmxlLmZyb20sXG4gICAgYmluZENhbGxiYWNrID0gUnguaW50ZXJuYWxzLmJpbmRDYWxsYmFjayxcbiAgICBFbXB0eUVycm9yID0gUnguRW1wdHlFcnJvcixcbiAgICBPYnNlcnZhYmxlQmFzZSA9IFJ4Lk9ic2VydmFibGVCYXNlLFxuICAgIEFyZ3VtZW50T3V0T2ZSYW5nZUVycm9yID0gUnguQXJndW1lbnRPdXRPZlJhbmdlRXJyb3I7XG5cbiAgdmFyIGVycm9yT2JqID0ge2U6IHt9fTtcbiAgXG4gIGZ1bmN0aW9uIHRyeUNhdGNoZXJHZW4odHJ5Q2F0Y2hUYXJnZXQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gdHJ5Q2F0Y2hlcigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB0cnlDYXRjaFRhcmdldC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBlcnJvck9iai5lID0gZTtcbiAgICAgICAgcmV0dXJuIGVycm9yT2JqO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICB2YXIgdHJ5Q2F0Y2ggPSBSeC5pbnRlcm5hbHMudHJ5Q2F0Y2ggPSBmdW5jdGlvbiB0cnlDYXRjaChmbikge1xuICAgIGlmICghaXNGdW5jdGlvbihmbikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcignZm4gbXVzdCBiZSBhIGZ1bmN0aW9uJyk7IH1cbiAgICByZXR1cm4gdHJ5Q2F0Y2hlckdlbihmbik7XG4gIH07XG5cbiAgZnVuY3Rpb24gdGhyb3dlcihlKSB7XG4gICAgdGhyb3cgZTtcbiAgfVxuXG4gIHZhciBFeHRyZW1hQnlPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhFeHRyZW1hQnlPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIEV4dHJlbWFCeU9ic2VydmFibGUoc291cmNlLCBrLCBjKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMuX2sgPSBrO1xuICAgICAgdGhpcy5fYyA9IGM7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBFeHRyZW1hQnlPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IEV4dHJlbWFCeU9ic2VydmVyKG8sIHRoaXMuX2ssIHRoaXMuX2MpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEV4dHJlbWFCeU9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgRXh0cmVtYUJ5T2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEV4dHJlbWFCeU9ic2VydmVyLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIEV4dHJlbWFCeU9ic2VydmVyKG8sIGssIGMpIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fayA9IGs7XG4gICAgICB0aGlzLl9jID0gYztcbiAgICAgIHRoaXMuX3YgPSBudWxsO1xuICAgICAgdGhpcy5faHYgPSBmYWxzZTtcbiAgICAgIHRoaXMuX2wgPSBbXTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIEV4dHJlbWFCeU9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgIHZhciBrZXkgPSB0cnlDYXRjaCh0aGlzLl9rKSh4KTtcbiAgICAgIGlmIChrZXkgPT09IGVycm9yT2JqKSB7IHJldHVybiB0aGlzLl9vLm9uRXJyb3Ioa2V5LmUpOyB9XG4gICAgICB2YXIgY29tcGFyaXNvbiA9IDA7XG4gICAgICBpZiAoIXRoaXMuX2h2KSB7XG4gICAgICAgIHRoaXMuX2h2ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fdiA9IGtleTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBhcmlzb24gPSB0cnlDYXRjaCh0aGlzLl9jKShrZXksIHRoaXMuX3YpO1xuICAgICAgICBpZiAoY29tcGFyaXNvbiA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuX28ub25FcnJvcihjb21wYXJpc29uLmUpOyB9XG4gICAgICB9XG4gICAgICBpZiAoY29tcGFyaXNvbiA+IDApIHtcbiAgICAgICAgdGhpcy5fdiA9IGtleTtcbiAgICAgICAgdGhpcy5fbCA9IFtdO1xuICAgICAgfVxuICAgICAgaWYgKGNvbXBhcmlzb24gPj0gMCkgeyB0aGlzLl9sLnB1c2goeCk7IH1cbiAgICB9O1xuXG4gICAgRXh0cmVtYUJ5T2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuX28ub25FcnJvcihlKTtcbiAgICB9O1xuXG4gICAgRXh0cmVtYUJ5T2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuX28ub25OZXh0KHRoaXMuX2wpO1xuICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gRXh0cmVtYUJ5T2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIGZ1bmN0aW9uIGZpcnN0T25seSh4KSB7XG4gICAgaWYgKHgubGVuZ3RoID09PSAwKSB7IHRocm93IG5ldyBFbXB0eUVycm9yKCk7IH1cbiAgICByZXR1cm4geFswXTtcbiAgfVxuXG4gIHZhciBSZWR1Y2VPYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFJlZHVjZU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gUmVkdWNlT2JzZXJ2YWJsZShzb3VyY2UsIGFjY3VtdWxhdG9yLCBoYXNTZWVkLCBzZWVkKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMuYWNjdW11bGF0b3IgPSBhY2N1bXVsYXRvcjtcbiAgICAgIHRoaXMuaGFzU2VlZCA9IGhhc1NlZWQ7XG4gICAgICB0aGlzLnNlZWQgPSBzZWVkO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgUmVkdWNlT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG5ldyBSZWR1Y2VPYnNlcnZlcihvYnNlcnZlcix0aGlzKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBSZWR1Y2VPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIFJlZHVjZU9ic2VydmVyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhSZWR1Y2VPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBSZWR1Y2VPYnNlcnZlcihvLCBwYXJlbnQpIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fcCA9IHBhcmVudDtcbiAgICAgIHRoaXMuX2ZuID0gcGFyZW50LmFjY3VtdWxhdG9yO1xuICAgICAgdGhpcy5faHMgPSBwYXJlbnQuaGFzU2VlZDtcbiAgICAgIHRoaXMuX3MgPSBwYXJlbnQuc2VlZDtcbiAgICAgIHRoaXMuX2hhID0gZmFsc2U7XG4gICAgICB0aGlzLl9hID0gbnVsbDtcbiAgICAgIHRoaXMuX2h2ID0gZmFsc2U7XG4gICAgICB0aGlzLl9pID0gMDtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFJlZHVjZU9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICF0aGlzLl9odiAmJiAodGhpcy5faHYgPSB0cnVlKTtcbiAgICAgIGlmICh0aGlzLl9oYSkge1xuICAgICAgICB0aGlzLl9hID0gdHJ5Q2F0Y2godGhpcy5fZm4pKHRoaXMuX2EsIHgsIHRoaXMuX2ksIHRoaXMuX3ApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fYSA9IHRoaXMuX2hzID8gdHJ5Q2F0Y2godGhpcy5fZm4pKHRoaXMuX3MsIHgsIHRoaXMuX2ksIHRoaXMuX3ApIDogeDtcbiAgICAgICAgdGhpcy5faGEgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuX2EgPT09IGVycm9yT2JqKSB7IHJldHVybiB0aGlzLl9vLm9uRXJyb3IodGhpcy5fYS5lKTsgfVxuICAgICAgdGhpcy5faSsrO1xuICAgIH07XG5cbiAgICBSZWR1Y2VPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgdGhpcy5fby5vbkVycm9yKGUpO1xuICAgIH07XG5cbiAgICBSZWR1Y2VPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5faHYgJiYgdGhpcy5fby5vbk5leHQodGhpcy5fYSk7XG4gICAgICAhdGhpcy5faHYgJiYgdGhpcy5faHMgJiYgdGhpcy5fby5vbk5leHQodGhpcy5fcyk7XG4gICAgICAhdGhpcy5faHYgJiYgIXRoaXMuX2hzICYmIHRoaXMuX28ub25FcnJvcihuZXcgRW1wdHlFcnJvcigpKTtcbiAgICAgIHRoaXMuX28ub25Db21wbGV0ZWQoKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFJlZHVjZU9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgKiBBcHBsaWVzIGFuIGFjY3VtdWxhdG9yIGZ1bmN0aW9uIG92ZXIgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSwgcmV0dXJuaW5nIHRoZSByZXN1bHQgb2YgdGhlIGFnZ3JlZ2F0aW9uIGFzIGEgc2luZ2xlIGVsZW1lbnQgaW4gdGhlIHJlc3VsdCBzZXF1ZW5jZS4gVGhlIHNwZWNpZmllZCBzZWVkIHZhbHVlIGlzIHVzZWQgYXMgdGhlIGluaXRpYWwgYWNjdW11bGF0b3IgdmFsdWUuXG4gICogRm9yIGFnZ3JlZ2F0aW9uIGJlaGF2aW9yIHdpdGggaW5jcmVtZW50YWwgaW50ZXJtZWRpYXRlIHJlc3VsdHMsIHNlZSBPYnNlcnZhYmxlLnNjYW4uXG4gICogQHBhcmFtIHtGdW5jdGlvbn0gYWNjdW11bGF0b3IgQW4gYWNjdW11bGF0b3IgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCBvbiBlYWNoIGVsZW1lbnQuXG4gICogQHBhcmFtIHtBbnl9IFtzZWVkXSBUaGUgaW5pdGlhbCBhY2N1bXVsYXRvciB2YWx1ZS5cbiAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBjb250YWluaW5nIGEgc2luZ2xlIGVsZW1lbnQgd2l0aCB0aGUgZmluYWwgYWNjdW11bGF0b3IgdmFsdWUuXG4gICovXG4gIG9ic2VydmFibGVQcm90by5yZWR1Y2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGhhc1NlZWQgPSBmYWxzZSwgc2VlZCwgYWNjdW11bGF0b3IgPSBhcmd1bWVudHNbMF07XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICAgIGhhc1NlZWQgPSB0cnVlO1xuICAgICAgc2VlZCA9IGFyZ3VtZW50c1sxXTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBSZWR1Y2VPYnNlcnZhYmxlKHRoaXMsIGFjY3VtdWxhdG9yLCBoYXNTZWVkLCBzZWVkKTtcbiAgfTtcblxuICB2YXIgU29tZU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFNvbWVPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFNvbWVPYnNlcnZhYmxlKHNvdXJjZSwgZm4pIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5fZm4gPSBmbjtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFNvbWVPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IFNvbWVPYnNlcnZlcihvLCB0aGlzLl9mbiwgdGhpcy5zb3VyY2UpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFNvbWVPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIFNvbWVPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoU29tZU9ic2VydmVyLCBfX3N1cGVyX18pO1xuXG4gICAgZnVuY3Rpb24gU29tZU9ic2VydmVyKG8sIGZuLCBzKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX2ZuID0gZm47XG4gICAgICB0aGlzLl9zID0gcztcbiAgICAgIHRoaXMuX2kgPSAwO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgU29tZU9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgIHZhciByZXN1bHQgPSB0cnlDYXRjaCh0aGlzLl9mbikoeCwgdGhpcy5faSsrLCB0aGlzLl9zKTtcbiAgICAgIGlmIChyZXN1bHQgPT09IGVycm9yT2JqKSB7IHJldHVybiB0aGlzLl9vLm9uRXJyb3IocmVzdWx0LmUpOyB9XG4gICAgICBpZiAoQm9vbGVhbihyZXN1bHQpKSB7XG4gICAgICAgIHRoaXMuX28ub25OZXh0KHRydWUpO1xuICAgICAgICB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBTb21lT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHsgdGhpcy5fby5vbkVycm9yKGUpOyB9O1xuICAgIFNvbWVPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5fby5vbk5leHQoZmFsc2UpO1xuICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gU29tZU9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIGFueSBlbGVtZW50IG9mIGFuIG9ic2VydmFibGUgc2VxdWVuY2Ugc2F0aXNmaWVzIGEgY29uZGl0aW9uIGlmIHByZXNlbnQsIGVsc2UgaWYgYW55IGl0ZW1zIGFyZSBpbiB0aGUgc2VxdWVuY2UuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtwcmVkaWNhdGVdIEEgZnVuY3Rpb24gdG8gdGVzdCBlYWNoIGVsZW1lbnQgZm9yIGEgY29uZGl0aW9uLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBjb250YWluaW5nIGEgc2luZ2xlIGVsZW1lbnQgZGV0ZXJtaW5pbmcgd2hldGhlciBhbnkgZWxlbWVudHMgaW4gdGhlIHNvdXJjZSBzZXF1ZW5jZSBwYXNzIHRoZSB0ZXN0IGluIHRoZSBzcGVjaWZpZWQgcHJlZGljYXRlIGlmIGdpdmVuLCBlbHNlIGlmIGFueSBpdGVtcyBhcmUgaW4gdGhlIHNlcXVlbmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnNvbWUgPSBmdW5jdGlvbiAocHJlZGljYXRlLCB0aGlzQXJnKSB7XG4gICAgdmFyIGZuID0gYmluZENhbGxiYWNrKHByZWRpY2F0ZSwgdGhpc0FyZywgMyk7XG4gICAgcmV0dXJuIG5ldyBTb21lT2JzZXJ2YWJsZSh0aGlzLCBmbik7XG4gIH07XG5cbiAgdmFyIElzRW1wdHlPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhJc0VtcHR5T2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBJc0VtcHR5T2JzZXJ2YWJsZShzb3VyY2UpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgSXNFbXB0eU9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgSXNFbXB0eU9ic2VydmVyKG8pKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIElzRW1wdHlPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIElzRW1wdHlPYnNlcnZlciA9IChmdW5jdGlvbihfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhJc0VtcHR5T2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gSXNFbXB0eU9ic2VydmVyKG8pIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgSXNFbXB0eU9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5fby5vbk5leHQoZmFsc2UpO1xuICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgIH07XG4gICAgSXNFbXB0eU9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7IHRoaXMuX28ub25FcnJvcihlKTsgfTtcbiAgICBJc0VtcHR5T2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuX28ub25OZXh0KHRydWUpO1xuICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gSXNFbXB0eU9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgaXMgZW1wdHkuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGNvbnRhaW5pbmcgYSBzaW5nbGUgZWxlbWVudCBkZXRlcm1pbmluZyB3aGV0aGVyIHRoZSBzb3VyY2Ugc2VxdWVuY2UgaXMgZW1wdHkuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uaXNFbXB0eSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IElzRW1wdHlPYnNlcnZhYmxlKHRoaXMpO1xuICB9O1xuXG4gIHZhciBFdmVyeU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEV2ZXJ5T2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBFdmVyeU9ic2VydmFibGUoc291cmNlLCBmbikge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9mbiA9IGZuO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgRXZlcnlPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IEV2ZXJ5T2JzZXJ2ZXIobywgdGhpcy5fZm4sIHRoaXMuc291cmNlKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBFdmVyeU9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgRXZlcnlPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoRXZlcnlPYnNlcnZlciwgX19zdXBlcl9fKTtcblxuICAgIGZ1bmN0aW9uIEV2ZXJ5T2JzZXJ2ZXIobywgZm4sIHMpIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fZm4gPSBmbjtcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgdGhpcy5faSA9IDA7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBFdmVyeU9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgIHZhciByZXN1bHQgPSB0cnlDYXRjaCh0aGlzLl9mbikoeCwgdGhpcy5faSsrLCB0aGlzLl9zKTtcbiAgICAgIGlmIChyZXN1bHQgPT09IGVycm9yT2JqKSB7IHJldHVybiB0aGlzLl9vLm9uRXJyb3IocmVzdWx0LmUpOyB9XG4gICAgICBpZiAoIUJvb2xlYW4ocmVzdWx0KSkge1xuICAgICAgICB0aGlzLl9vLm9uTmV4dChmYWxzZSk7XG4gICAgICAgIHRoaXMuX28ub25Db21wbGV0ZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIEV2ZXJ5T2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHsgdGhpcy5fby5vbkVycm9yKGUpOyB9O1xuICAgIEV2ZXJ5T2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuX28ub25OZXh0KHRydWUpO1xuICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gRXZlcnlPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hldGhlciBhbGwgZWxlbWVudHMgb2YgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBzYXRpc2Z5IGEgY29uZGl0aW9uLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcHJlZGljYXRlXSBBIGZ1bmN0aW9uIHRvIHRlc3QgZWFjaCBlbGVtZW50IGZvciBhIGNvbmRpdGlvbi5cbiAgICogQHBhcmFtIHtBbnl9IFt0aGlzQXJnXSBPYmplY3QgdG8gdXNlIGFzIHRoaXMgd2hlbiBleGVjdXRpbmcgY2FsbGJhY2suXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGNvbnRhaW5pbmcgYSBzaW5nbGUgZWxlbWVudCBkZXRlcm1pbmluZyB3aGV0aGVyIGFsbCBlbGVtZW50cyBpbiB0aGUgc291cmNlIHNlcXVlbmNlIHBhc3MgdGhlIHRlc3QgaW4gdGhlIHNwZWNpZmllZCBwcmVkaWNhdGUuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uZXZlcnkgPSBmdW5jdGlvbiAocHJlZGljYXRlLCB0aGlzQXJnKSB7XG4gICAgdmFyIGZuID0gYmluZENhbGxiYWNrKHByZWRpY2F0ZSwgdGhpc0FyZywgMyk7XG4gICAgcmV0dXJuIG5ldyBFdmVyeU9ic2VydmFibGUodGhpcywgZm4pO1xuICB9O1xuXG4gIHZhciBJbmNsdWRlc09ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEluY2x1ZGVzT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBJbmNsdWRlc09ic2VydmFibGUoc291cmNlLCBlbGVtLCBpZHgpIHtcbiAgICAgIHZhciBuID0gK2lkeCB8fCAwO1xuICAgICAgTWF0aC5hYnMobikgPT09IEluZmluaXR5ICYmIChuID0gMCk7XG5cbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5fZWxlbSA9IGVsZW07XG4gICAgICB0aGlzLl9uID0gbjtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIEluY2x1ZGVzT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICBpZiAodGhpcy5fbiA8IDApIHtcbiAgICAgICAgby5vbk5leHQoZmFsc2UpO1xuICAgICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IEluY2x1ZGVzT2JzZXJ2ZXIobywgdGhpcy5fZWxlbSwgdGhpcy5fbikpO1xuICAgIH07XG5cbiAgICByZXR1cm4gSW5jbHVkZXNPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIEluY2x1ZGVzT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEluY2x1ZGVzT2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gSW5jbHVkZXNPYnNlcnZlcihvLCBlbGVtLCBuKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX2VsZW0gPSBlbGVtO1xuICAgICAgdGhpcy5fbiA9IG47XG4gICAgICB0aGlzLl9pID0gMDtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbXBhcmVyKGEsIGIpIHtcbiAgICAgIHJldHVybiAoYSA9PT0gMCAmJiBiID09PSAwKSB8fCAoYSA9PT0gYiB8fCAoaXNOYU4oYSkgJiYgaXNOYU4oYikpKTtcbiAgICB9XG5cbiAgICBJbmNsdWRlc09ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgIGlmICh0aGlzLl9pKysgPj0gdGhpcy5fbiAmJiBjb21wYXJlcih4LCB0aGlzLl9lbGVtKSkge1xuICAgICAgICB0aGlzLl9vLm9uTmV4dCh0cnVlKTtcbiAgICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgICAgfVxuICAgIH07XG4gICAgSW5jbHVkZXNPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyB0aGlzLl9vLm9uRXJyb3IoZSk7IH07XG4gICAgSW5jbHVkZXNPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkgeyB0aGlzLl9vLm9uTmV4dChmYWxzZSk7IHRoaXMuX28ub25Db21wbGV0ZWQoKTsgfTtcblxuICAgIHJldHVybiBJbmNsdWRlc09ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgaW5jbHVkZXMgYSBzcGVjaWZpZWQgZWxlbWVudCB3aXRoIGFuIG9wdGlvbmFsIGVxdWFsaXR5IGNvbXBhcmVyLlxuICAgKiBAcGFyYW0gc2VhcmNoRWxlbWVudCBUaGUgdmFsdWUgdG8gbG9jYXRlIGluIHRoZSBzb3VyY2Ugc2VxdWVuY2UuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbZnJvbUluZGV4XSBBbiBlcXVhbGl0eSBjb21wYXJlciB0byBjb21wYXJlIGVsZW1lbnRzLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBjb250YWluaW5nIGEgc2luZ2xlIGVsZW1lbnQgZGV0ZXJtaW5pbmcgd2hldGhlciB0aGUgc291cmNlIHNlcXVlbmNlIGluY2x1ZGVzIGFuIGVsZW1lbnQgdGhhdCBoYXMgdGhlIHNwZWNpZmllZCB2YWx1ZSBmcm9tIHRoZSBnaXZlbiBpbmRleC5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5pbmNsdWRlcyA9IGZ1bmN0aW9uIChzZWFyY2hFbGVtZW50LCBmcm9tSW5kZXgpIHtcbiAgICByZXR1cm4gbmV3IEluY2x1ZGVzT2JzZXJ2YWJsZSh0aGlzLCBzZWFyY2hFbGVtZW50LCBmcm9tSW5kZXgpO1xuICB9O1xuXG4gIHZhciBDb3VudE9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKENvdW50T2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBDb3VudE9ic2VydmFibGUoc291cmNlLCBmbikge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9mbiA9IGZuO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgQ291bnRPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IENvdW50T2JzZXJ2ZXIobywgdGhpcy5fZm4sIHRoaXMuc291cmNlKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBDb3VudE9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgQ291bnRPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoQ291bnRPYnNlcnZlciwgX19zdXBlcl9fKTtcblxuICAgIGZ1bmN0aW9uIENvdW50T2JzZXJ2ZXIobywgZm4sIHMpIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fZm4gPSBmbjtcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgdGhpcy5faSA9IDA7XG4gICAgICB0aGlzLl9jID0gMDtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIENvdW50T2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgaWYgKHRoaXMuX2ZuKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSB0cnlDYXRjaCh0aGlzLl9mbikoeCwgdGhpcy5faSsrLCB0aGlzLl9zKTtcbiAgICAgICAgaWYgKHJlc3VsdCA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuX28ub25FcnJvcihyZXN1bHQuZSk7IH1cbiAgICAgICAgQm9vbGVhbihyZXN1bHQpICYmICh0aGlzLl9jKyspO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fYysrO1xuICAgICAgfVxuICAgIH07XG4gICAgQ291bnRPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyB0aGlzLl9vLm9uRXJyb3IoZSk7IH07XG4gICAgQ291bnRPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5fby5vbk5leHQodGhpcy5fYyk7XG4gICAgICB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIHJldHVybiBDb3VudE9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogUmV0dXJucyBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGNvbnRhaW5pbmcgYSB2YWx1ZSB0aGF0IHJlcHJlc2VudHMgaG93IG1hbnkgZWxlbWVudHMgaW4gdGhlIHNwZWNpZmllZCBvYnNlcnZhYmxlIHNlcXVlbmNlIHNhdGlzZnkgYSBjb25kaXRpb24gaWYgcHJvdmlkZWQsIGVsc2UgdGhlIGNvdW50IG9mIGl0ZW1zLlxuICAgKiBAZXhhbXBsZVxuICAgKiByZXMgPSBzb3VyY2UuY291bnQoKTtcbiAgICogcmVzID0gc291cmNlLmNvdW50KGZ1bmN0aW9uICh4KSB7IHJldHVybiB4ID4gMzsgfSk7XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtwcmVkaWNhdGVdQSBmdW5jdGlvbiB0byB0ZXN0IGVhY2ggZWxlbWVudCBmb3IgYSBjb25kaXRpb24uXG4gICAqIEBwYXJhbSB7QW55fSBbdGhpc0FyZ10gT2JqZWN0IHRvIHVzZSBhcyB0aGlzIHdoZW4gZXhlY3V0aW5nIGNhbGxiYWNrLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBjb250YWluaW5nIGEgc2luZ2xlIGVsZW1lbnQgd2l0aCBhIG51bWJlciB0aGF0IHJlcHJlc2VudHMgaG93IG1hbnkgZWxlbWVudHMgaW4gdGhlIGlucHV0IHNlcXVlbmNlIHNhdGlzZnkgdGhlIGNvbmRpdGlvbiBpbiB0aGUgcHJlZGljYXRlIGZ1bmN0aW9uIGlmIHByb3ZpZGVkLCBlbHNlIHRoZSBjb3VudCBvZiBpdGVtcyBpbiB0aGUgc2VxdWVuY2UuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uY291bnQgPSBmdW5jdGlvbiAocHJlZGljYXRlLCB0aGlzQXJnKSB7XG4gICAgdmFyIGZuID0gYmluZENhbGxiYWNrKHByZWRpY2F0ZSwgdGhpc0FyZywgMyk7XG4gICAgcmV0dXJuIG5ldyBDb3VudE9ic2VydmFibGUodGhpcywgZm4pO1xuICB9O1xuXG4gIHZhciBJbmRleE9mT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoSW5kZXhPZk9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gSW5kZXhPZk9ic2VydmFibGUoc291cmNlLCBlLCBuKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMuX2UgPSBlO1xuICAgICAgdGhpcy5fbiA9IG47XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBJbmRleE9mT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICBpZiAodGhpcy5fbiA8IDApIHtcbiAgICAgICAgby5vbk5leHQoLTEpO1xuICAgICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IEluZGV4T2ZPYnNlcnZlcihvLCB0aGlzLl9lLCB0aGlzLl9uKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBJbmRleE9mT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIHZhciBJbmRleE9mT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEluZGV4T2ZPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBJbmRleE9mT2JzZXJ2ZXIobywgZSwgbikge1xuICAgICAgdGhpcy5fbyA9IG87XG4gICAgICB0aGlzLl9lID0gZTtcbiAgICAgIHRoaXMuX24gPSBuO1xuICAgICAgdGhpcy5faSA9IDA7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBJbmRleE9mT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgaWYgKHRoaXMuX2kgPj0gdGhpcy5fbiAmJiB4ID09PSB0aGlzLl9lKSB7XG4gICAgICAgIHRoaXMuX28ub25OZXh0KHRoaXMuX2kpO1xuICAgICAgICB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgICB9XG4gICAgICB0aGlzLl9pKys7XG4gICAgfTtcbiAgICBJbmRleE9mT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHsgdGhpcy5fby5vbkVycm9yKGUpOyB9O1xuICAgIEluZGV4T2ZPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkgeyB0aGlzLl9vLm9uTmV4dCgtMSk7IHRoaXMuX28ub25Db21wbGV0ZWQoKTsgfTtcblxuICAgIHJldHVybiBJbmRleE9mT2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBmaXJzdCBpbmRleCBhdCB3aGljaCBhIGdpdmVuIGVsZW1lbnQgY2FuIGJlIGZvdW5kIGluIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlLCBvciAtMSBpZiBpdCBpcyBub3QgcHJlc2VudC5cbiAgICogQHBhcmFtIHtBbnl9IHNlYXJjaEVsZW1lbnQgRWxlbWVudCB0byBsb2NhdGUgaW4gdGhlIGFycmF5LlxuICAgKiBAcGFyYW0ge051bWJlcn0gW2Zyb21JbmRleF0gVGhlIGluZGV4IHRvIHN0YXJ0IHRoZSBzZWFyY2guICBJZiBub3Qgc3BlY2lmaWVkLCBkZWZhdWx0cyB0byAwLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW5kIG9ic2VydmFibGUgc2VxdWVuY2UgY29udGFpbmluZyB0aGUgZmlyc3QgaW5kZXggYXQgd2hpY2ggYSBnaXZlbiBlbGVtZW50IGNhbiBiZSBmb3VuZCBpbiB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSwgb3IgLTEgaWYgaXQgaXMgbm90IHByZXNlbnQuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uaW5kZXhPZiA9IGZ1bmN0aW9uKHNlYXJjaEVsZW1lbnQsIGZyb21JbmRleCkge1xuICAgIHZhciBuID0gK2Zyb21JbmRleCB8fCAwO1xuICAgIE1hdGguYWJzKG4pID09PSBJbmZpbml0eSAmJiAobiA9IDApO1xuICAgIHJldHVybiBuZXcgSW5kZXhPZk9ic2VydmFibGUodGhpcywgc2VhcmNoRWxlbWVudCwgbik7XG4gIH07XG5cbiAgdmFyIFN1bU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFN1bU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gU3VtT2JzZXJ2YWJsZShzb3VyY2UsIGZuKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMuX2ZuID0gZm47XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBTdW1PYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IFN1bU9ic2VydmVyKG8sIHRoaXMuX2ZuLCB0aGlzLnNvdXJjZSkpO1xuICAgIH07XG5cbiAgICByZXR1cm4gU3VtT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIHZhciBTdW1PYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoU3VtT2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG5cbiAgICBmdW5jdGlvbiBTdW1PYnNlcnZlcihvLCBmbiwgcykge1xuICAgICAgdGhpcy5fbyA9IG87XG4gICAgICB0aGlzLl9mbiA9IGZuO1xuICAgICAgdGhpcy5fcyA9IHM7XG4gICAgICB0aGlzLl9pID0gMDtcbiAgICAgIHRoaXMuX2MgPSAwO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgU3VtT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgaWYgKHRoaXMuX2ZuKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSB0cnlDYXRjaCh0aGlzLl9mbikoeCwgdGhpcy5faSsrLCB0aGlzLl9zKTtcbiAgICAgICAgaWYgKHJlc3VsdCA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuX28ub25FcnJvcihyZXN1bHQuZSk7IH1cbiAgICAgICAgdGhpcy5fYyArPSByZXN1bHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9jICs9IHg7XG4gICAgICB9XG4gICAgfTtcbiAgICBTdW1PYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyB0aGlzLl9vLm9uRXJyb3IoZSk7IH07XG4gICAgU3VtT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuX28ub25OZXh0KHRoaXMuX2MpO1xuICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gU3VtT2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAgKiBDb21wdXRlcyB0aGUgc3VtIG9mIGEgc2VxdWVuY2Ugb2YgdmFsdWVzIHRoYXQgYXJlIG9idGFpbmVkIGJ5IGludm9raW5nIGFuIG9wdGlvbmFsIHRyYW5zZm9ybSBmdW5jdGlvbiBvbiBlYWNoIGVsZW1lbnQgb2YgdGhlIGlucHV0IHNlcXVlbmNlLCBlbHNlIGlmIG5vdCBzcGVjaWZpZWQgY29tcHV0ZXMgdGhlIHN1bSBvbiBlYWNoIGl0ZW0gaW4gdGhlIHNlcXVlbmNlLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbc2VsZWN0b3JdIEEgdHJhbnNmb3JtIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2ggZWxlbWVudC5cbiAgICogQHBhcmFtIHtBbnl9IFt0aGlzQXJnXSBPYmplY3QgdG8gdXNlIGFzIHRoaXMgd2hlbiBleGVjdXRpbmcgY2FsbGJhY2suXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGNvbnRhaW5pbmcgYSBzaW5nbGUgZWxlbWVudCB3aXRoIHRoZSBzdW0gb2YgdGhlIHZhbHVlcyBpbiB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnN1bSA9IGZ1bmN0aW9uIChrZXlTZWxlY3RvciwgdGhpc0FyZykge1xuICAgIHZhciBmbiA9IGJpbmRDYWxsYmFjayhrZXlTZWxlY3RvciwgdGhpc0FyZywgMyk7XG4gICAgcmV0dXJuIG5ldyBTdW1PYnNlcnZhYmxlKHRoaXMsIGZuKTtcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZWxlbWVudHMgaW4gYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB3aXRoIHRoZSBtaW5pbXVtIGtleSB2YWx1ZSBhY2NvcmRpbmcgdG8gdGhlIHNwZWNpZmllZCBjb21wYXJlci5cbiAgICogQGV4YW1wbGVcbiAgICogdmFyIHJlcyA9IHNvdXJjZS5taW5CeShmdW5jdGlvbiAoeCkgeyByZXR1cm4geC52YWx1ZTsgfSk7XG4gICAqIHZhciByZXMgPSBzb3VyY2UubWluQnkoZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHgudmFsdWU7IH0sIGZ1bmN0aW9uICh4LCB5KSB7IHJldHVybiB4IC0geTsgfSk7XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGtleVNlbGVjdG9yIEtleSBzZWxlY3RvciBmdW5jdGlvbi5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbXBhcmVyXSBDb21wYXJlciB1c2VkIHRvIGNvbXBhcmUga2V5IHZhbHVlcy5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgY29udGFpbmluZyBhIGxpc3Qgb2YgemVybyBvciBtb3JlIGVsZW1lbnRzIHRoYXQgaGF2ZSBhIG1pbmltdW0ga2V5IHZhbHVlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLm1pbkJ5ID0gZnVuY3Rpb24gKGtleVNlbGVjdG9yLCBjb21wYXJlcikge1xuICAgIGNvbXBhcmVyIHx8IChjb21wYXJlciA9IGRlZmF1bHRTdWJDb21wYXJlcik7XG4gICAgcmV0dXJuIG5ldyBFeHRyZW1hQnlPYnNlcnZhYmxlKHRoaXMsIGtleVNlbGVjdG9yLCBmdW5jdGlvbiAoeCwgeSkgeyByZXR1cm4gY29tcGFyZXIoeCwgeSkgKiAtMTsgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIG1pbmltdW0gZWxlbWVudCBpbiBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGFjY29yZGluZyB0byB0aGUgb3B0aW9uYWwgY29tcGFyZXIgZWxzZSBhIGRlZmF1bHQgZ3JlYXRlciB0aGFuIGxlc3MgdGhhbiBjaGVjay5cbiAgICogQGV4YW1wbGVcbiAgICogdmFyIHJlcyA9IHNvdXJjZS5taW4oKTtcbiAgICogdmFyIHJlcyA9IHNvdXJjZS5taW4oZnVuY3Rpb24gKHgsIHkpIHsgcmV0dXJuIHgudmFsdWUgLSB5LnZhbHVlOyB9KTtcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbXBhcmVyXSBDb21wYXJlciB1c2VkIHRvIGNvbXBhcmUgZWxlbWVudHMuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGNvbnRhaW5pbmcgYSBzaW5nbGUgZWxlbWVudCB3aXRoIHRoZSBtaW5pbXVtIGVsZW1lbnQgaW4gdGhlIHNvdXJjZSBzZXF1ZW5jZS5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5taW4gPSBmdW5jdGlvbiAoY29tcGFyZXIpIHtcbiAgICByZXR1cm4gdGhpcy5taW5CeShpZGVudGl0eSwgY29tcGFyZXIpLm1hcChmaXJzdE9ubHkpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBlbGVtZW50cyBpbiBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdpdGggdGhlIG1heGltdW0gIGtleSB2YWx1ZSBhY2NvcmRpbmcgdG8gdGhlIHNwZWNpZmllZCBjb21wYXJlci5cbiAgICogQGV4YW1wbGVcbiAgICogdmFyIHJlcyA9IHNvdXJjZS5tYXhCeShmdW5jdGlvbiAoeCkgeyByZXR1cm4geC52YWx1ZTsgfSk7XG4gICAqIHZhciByZXMgPSBzb3VyY2UubWF4QnkoZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHgudmFsdWU7IH0sIGZ1bmN0aW9uICh4LCB5KSB7IHJldHVybiB4IC0geTs7IH0pO1xuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBrZXlTZWxlY3RvciBLZXkgc2VsZWN0b3IgZnVuY3Rpb24uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb21wYXJlcl0gIENvbXBhcmVyIHVzZWQgdG8gY29tcGFyZSBrZXkgdmFsdWVzLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBjb250YWluaW5nIGEgbGlzdCBvZiB6ZXJvIG9yIG1vcmUgZWxlbWVudHMgdGhhdCBoYXZlIGEgbWF4aW11bSBrZXkgdmFsdWUuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8ubWF4QnkgPSBmdW5jdGlvbiAoa2V5U2VsZWN0b3IsIGNvbXBhcmVyKSB7XG4gICAgY29tcGFyZXIgfHwgKGNvbXBhcmVyID0gZGVmYXVsdFN1YkNvbXBhcmVyKTtcbiAgICByZXR1cm4gbmV3IEV4dHJlbWFCeU9ic2VydmFibGUodGhpcywga2V5U2VsZWN0b3IsIGNvbXBhcmVyKTtcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgbWF4aW11bSB2YWx1ZSBpbiBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGFjY29yZGluZyB0byB0aGUgc3BlY2lmaWVkIGNvbXBhcmVyLlxuICAgKiBAZXhhbXBsZVxuICAgKiB2YXIgcmVzID0gc291cmNlLm1heCgpO1xuICAgKiB2YXIgcmVzID0gc291cmNlLm1heChmdW5jdGlvbiAoeCwgeSkgeyByZXR1cm4geC52YWx1ZSAtIHkudmFsdWU7IH0pO1xuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29tcGFyZXJdIENvbXBhcmVyIHVzZWQgdG8gY29tcGFyZSBlbGVtZW50cy5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgY29udGFpbmluZyBhIHNpbmdsZSBlbGVtZW50IHdpdGggdGhlIG1heGltdW0gZWxlbWVudCBpbiB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLm1heCA9IGZ1bmN0aW9uIChjb21wYXJlcikge1xuICAgIHJldHVybiB0aGlzLm1heEJ5KGlkZW50aXR5LCBjb21wYXJlcikubWFwKGZpcnN0T25seSk7XG4gIH07XG5cbiAgdmFyIEF2ZXJhZ2VPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhBdmVyYWdlT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBBdmVyYWdlT2JzZXJ2YWJsZShzb3VyY2UsIGZuKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMuX2ZuID0gZm47XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBBdmVyYWdlT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG5ldyBBdmVyYWdlT2JzZXJ2ZXIobywgdGhpcy5fZm4sIHRoaXMuc291cmNlKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBBdmVyYWdlT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIHZhciBBdmVyYWdlT2JzZXJ2ZXIgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoQXZlcmFnZU9ic2VydmVyLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIEF2ZXJhZ2VPYnNlcnZlcihvLCBmbiwgcykge1xuICAgICAgdGhpcy5fbyA9IG87XG4gICAgICB0aGlzLl9mbiA9IGZuO1xuICAgICAgdGhpcy5fcyA9IHM7XG4gICAgICB0aGlzLl9jID0gMDtcbiAgICAgIHRoaXMuX3QgPSAwO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgQXZlcmFnZU9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgIGlmKHRoaXMuX2ZuKSB7XG4gICAgICAgIHZhciByID0gdHJ5Q2F0Y2godGhpcy5fZm4pKHgsIHRoaXMuX2MrKywgdGhpcy5fcyk7XG4gICAgICAgIGlmIChyID09PSBlcnJvck9iaikgeyByZXR1cm4gdGhpcy5fby5vbkVycm9yKHIuZSk7IH1cbiAgICAgICAgdGhpcy5fdCArPSByO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fYysrO1xuICAgICAgICB0aGlzLl90ICs9IHg7XG4gICAgICB9XG4gICAgfTtcbiAgICBBdmVyYWdlT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHsgdGhpcy5fby5vbkVycm9yKGUpOyB9O1xuICAgIEF2ZXJhZ2VPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHRoaXMuX2MgPT09IDApIHsgcmV0dXJuIHRoaXMuX28ub25FcnJvcihuZXcgRW1wdHlFcnJvcigpKTsgfVxuICAgICAgdGhpcy5fby5vbk5leHQodGhpcy5fdCAvIHRoaXMuX2MpO1xuICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gQXZlcmFnZU9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogQ29tcHV0ZXMgdGhlIGF2ZXJhZ2Ugb2YgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBvZiB2YWx1ZXMgdGhhdCBhcmUgaW4gdGhlIHNlcXVlbmNlIG9yIG9idGFpbmVkIGJ5IGludm9raW5nIGEgdHJhbnNmb3JtIGZ1bmN0aW9uIG9uIGVhY2ggZWxlbWVudCBvZiB0aGUgaW5wdXQgc2VxdWVuY2UgaWYgcHJlc2VudC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW3NlbGVjdG9yXSBBIHRyYW5zZm9ybSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGVsZW1lbnQuXG4gICAqIEBwYXJhbSB7QW55fSBbdGhpc0FyZ10gT2JqZWN0IHRvIHVzZSBhcyB0aGlzIHdoZW4gZXhlY3V0aW5nIGNhbGxiYWNrLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBjb250YWluaW5nIGEgc2luZ2xlIGVsZW1lbnQgd2l0aCB0aGUgYXZlcmFnZSBvZiB0aGUgc2VxdWVuY2Ugb2YgdmFsdWVzLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmF2ZXJhZ2UgPSBmdW5jdGlvbiAoa2V5U2VsZWN0b3IsIHRoaXNBcmcpIHtcbiAgICB2YXIgc291cmNlID0gdGhpcywgZm47XG4gICAgaWYgKGlzRnVuY3Rpb24oa2V5U2VsZWN0b3IpKSB7XG4gICAgICBmbiA9IGJpbmRDYWxsYmFjayhrZXlTZWxlY3RvciwgdGhpc0FyZywgMyk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgQXZlcmFnZU9ic2VydmFibGUoc291cmNlLCBmbik7XG4gIH07XG5cbiAgLyoqXG4gICAqICBEZXRlcm1pbmVzIHdoZXRoZXIgdHdvIHNlcXVlbmNlcyBhcmUgZXF1YWwgYnkgY29tcGFyaW5nIHRoZSBlbGVtZW50cyBwYWlyd2lzZSB1c2luZyBhIHNwZWNpZmllZCBlcXVhbGl0eSBjb21wYXJlci5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogdmFyIHJlcyA9IHJlcyA9IHNvdXJjZS5zZXF1ZW5jZUVxdWFsKFsxLDIsM10pO1xuICAgKiB2YXIgcmVzID0gcmVzID0gc291cmNlLnNlcXVlbmNlRXF1YWwoW3sgdmFsdWU6IDQyIH1dLCBmdW5jdGlvbiAoeCwgeSkgeyByZXR1cm4geC52YWx1ZSA9PT0geS52YWx1ZTsgfSk7XG4gICAqIDMgLSByZXMgPSBzb3VyY2Uuc2VxdWVuY2VFcXVhbChSeC5PYnNlcnZhYmxlLnJldHVyblZhbHVlKDQyKSk7XG4gICAqIDQgLSByZXMgPSBzb3VyY2Uuc2VxdWVuY2VFcXVhbChSeC5PYnNlcnZhYmxlLnJldHVyblZhbHVlKHsgdmFsdWU6IDQyIH0pLCBmdW5jdGlvbiAoeCwgeSkgeyByZXR1cm4geC52YWx1ZSA9PT0geS52YWx1ZTsgfSk7XG4gICAqIEBwYXJhbSB7T2JzZXJ2YWJsZX0gc2Vjb25kIFNlY29uZCBvYnNlcnZhYmxlIHNlcXVlbmNlIG9yIGFycmF5IHRvIGNvbXBhcmUuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb21wYXJlcl0gQ29tcGFyZXIgdXNlZCB0byBjb21wYXJlIGVsZW1lbnRzIG9mIGJvdGggc2VxdWVuY2VzLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGNvbnRhaW5zIGEgc2luZ2xlIGVsZW1lbnQgd2hpY2ggaW5kaWNhdGVzIHdoZXRoZXIgYm90aCBzZXF1ZW5jZXMgYXJlIG9mIGVxdWFsIGxlbmd0aCBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBlbGVtZW50cyBhcmUgZXF1YWwgYWNjb3JkaW5nIHRvIHRoZSBzcGVjaWZpZWQgZXF1YWxpdHkgY29tcGFyZXIuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uc2VxdWVuY2VFcXVhbCA9IGZ1bmN0aW9uIChzZWNvbmQsIGNvbXBhcmVyKSB7XG4gICAgdmFyIGZpcnN0ID0gdGhpcztcbiAgICBjb21wYXJlciB8fCAoY29tcGFyZXIgPSBkZWZhdWx0Q29tcGFyZXIpO1xuICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbiAobykge1xuICAgICAgdmFyIGRvbmVsID0gZmFsc2UsIGRvbmVyID0gZmFsc2UsIHFsID0gW10sIHFyID0gW107XG4gICAgICB2YXIgc3Vic2NyaXB0aW9uMSA9IGZpcnN0LnN1YnNjcmliZShmdW5jdGlvbiAoeCkge1xuICAgICAgICBpZiAocXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciB2ID0gcXIuc2hpZnQoKTtcbiAgICAgICAgICB2YXIgZXF1YWwgPSB0cnlDYXRjaChjb21wYXJlcikodiwgeCk7XG4gICAgICAgICAgaWYgKGVxdWFsID09PSBlcnJvck9iaikgeyByZXR1cm4gby5vbkVycm9yKGVxdWFsLmUpOyB9XG4gICAgICAgICAgaWYgKCFlcXVhbCkge1xuICAgICAgICAgICAgby5vbk5leHQoZmFsc2UpO1xuICAgICAgICAgICAgby5vbkNvbXBsZXRlZCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChkb25lcikge1xuICAgICAgICAgIG8ub25OZXh0KGZhbHNlKTtcbiAgICAgICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcWwucHVzaCh4KTtcbiAgICAgICAgfVxuICAgICAgfSwgZnVuY3Rpb24oZSkgeyBvLm9uRXJyb3IoZSk7IH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZG9uZWwgPSB0cnVlO1xuICAgICAgICBpZiAocWwubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgaWYgKHFyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG8ub25OZXh0KGZhbHNlKTtcbiAgICAgICAgICAgIG8ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGRvbmVyKSB7XG4gICAgICAgICAgICBvLm9uTmV4dCh0cnVlKTtcbiAgICAgICAgICAgIG8ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAoaXNBcnJheUxpa2Uoc2Vjb25kKSB8fCBpc0l0ZXJhYmxlKHNlY29uZCkpICYmIChzZWNvbmQgPSBvYnNlcnZhYmxlRnJvbShzZWNvbmQpKTtcbiAgICAgIGlzUHJvbWlzZShzZWNvbmQpICYmIChzZWNvbmQgPSBvYnNlcnZhYmxlRnJvbVByb21pc2Uoc2Vjb25kKSk7XG4gICAgICB2YXIgc3Vic2NyaXB0aW9uMiA9IHNlY29uZC5zdWJzY3JpYmUoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgaWYgKHFsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgdiA9IHFsLnNoaWZ0KCk7XG4gICAgICAgICAgdmFyIGVxdWFsID0gdHJ5Q2F0Y2goY29tcGFyZXIpKHYsIHgpO1xuICAgICAgICAgIGlmIChlcXVhbCA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIG8ub25FcnJvcihlcXVhbC5lKTsgfVxuICAgICAgICAgIGlmICghZXF1YWwpIHtcbiAgICAgICAgICAgIG8ub25OZXh0KGZhbHNlKTtcbiAgICAgICAgICAgIG8ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZG9uZWwpIHtcbiAgICAgICAgICBvLm9uTmV4dChmYWxzZSk7XG4gICAgICAgICAgby5vbkNvbXBsZXRlZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHFyLnB1c2goeCk7XG4gICAgICAgIH1cbiAgICAgIH0sIGZ1bmN0aW9uKGUpIHsgby5vbkVycm9yKGUpOyB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRvbmVyID0gdHJ1ZTtcbiAgICAgICAgaWYgKHFyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGlmIChxbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBvLm9uTmV4dChmYWxzZSk7XG4gICAgICAgICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChkb25lbCkge1xuICAgICAgICAgICAgby5vbk5leHQodHJ1ZSk7XG4gICAgICAgICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBuZXcgQmluYXJ5RGlzcG9zYWJsZShzdWJzY3JpcHRpb24xLCBzdWJzY3JpcHRpb24yKTtcbiAgICB9LCBmaXJzdCk7XG4gIH07XG5cbiAgdmFyIEVsZW1lbnRBdE9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEVsZW1lbnRBdE9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gRWxlbWVudEF0T2JzZXJ2YWJsZShzb3VyY2UsIGksIGQpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5faSA9IGk7XG4gICAgICB0aGlzLl9kID0gZDtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIEVsZW1lbnRBdE9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgRWxlbWVudEF0T2JzZXJ2ZXIobywgdGhpcy5faSwgdGhpcy5fZCkpO1xuICAgIH07XG5cbiAgICByZXR1cm4gRWxlbWVudEF0T2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIHZhciBFbGVtZW50QXRPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoRWxlbWVudEF0T2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG5cbiAgICBmdW5jdGlvbiBFbGVtZW50QXRPYnNlcnZlcihvLCBpLCBkKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX2kgPSBpO1xuICAgICAgdGhpcy5fZCA9IGQ7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBFbGVtZW50QXRPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICBpZiAodGhpcy5faS0tID09PSAwKSB7XG4gICAgICAgIHRoaXMuX28ub25OZXh0KHgpO1xuICAgICAgICB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBFbGVtZW50QXRPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyB0aGlzLl9vLm9uRXJyb3IoZSk7IH07XG4gICAgRWxlbWVudEF0T2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICh0aGlzLl9kID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fby5vbkVycm9yKG5ldyBBcmd1bWVudE91dE9mUmFuZ2VFcnJvcigpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX28ub25OZXh0KHRoaXMuX2QpO1xuICAgICAgICB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBFbGVtZW50QXRPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGVsZW1lbnQgYXQgYSBzcGVjaWZpZWQgaW5kZXggaW4gYSBzZXF1ZW5jZSBvciBkZWZhdWx0IHZhbHVlIGlmIG5vdCBmb3VuZC5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4IFRoZSB6ZXJvLWJhc2VkIGluZGV4IG9mIHRoZSBlbGVtZW50IHRvIHJldHJpZXZlLlxuICAgKiBAcGFyYW0ge0FueX0gW2RlZmF1bHRWYWx1ZV0gVGhlIGRlZmF1bHQgdmFsdWUgdG8gdXNlIGlmIGVsZW1lbnRBdCBkb2VzIG5vdCBmaW5kIGEgdmFsdWUuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgcHJvZHVjZXMgdGhlIGVsZW1lbnQgYXQgdGhlIHNwZWNpZmllZCBwb3NpdGlvbiBpbiB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmVsZW1lbnRBdCA9ICBmdW5jdGlvbiAoaW5kZXgsIGRlZmF1bHRWYWx1ZSkge1xuICAgIGlmIChpbmRleCA8IDApIHsgdGhyb3cgbmV3IEFyZ3VtZW50T3V0T2ZSYW5nZUVycm9yKCk7IH1cbiAgICByZXR1cm4gbmV3IEVsZW1lbnRBdE9ic2VydmFibGUodGhpcywgaW5kZXgsIGRlZmF1bHRWYWx1ZSk7XG4gIH07XG5cbiAgdmFyIFNpbmdsZU9ic2VydmVyID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFNpbmdsZU9ic2VydmVyLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFNpbmdsZU9ic2VydmVyKG8sIG9iaiwgcykge1xuICAgICAgdGhpcy5fbyA9IG87XG4gICAgICB0aGlzLl9vYmogPSBvYmo7XG4gICAgICB0aGlzLl9zID0gcztcbiAgICAgIHRoaXMuX2kgPSAwO1xuICAgICAgdGhpcy5faHYgPSBmYWxzZTtcbiAgICAgIHRoaXMuX3YgPSBudWxsO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgU2luZ2xlT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgdmFyIHNob3VsZFlpZWxkID0gZmFsc2U7XG4gICAgICBpZiAodGhpcy5fb2JqLnByZWRpY2F0ZSkge1xuICAgICAgICB2YXIgcmVzID0gdHJ5Q2F0Y2godGhpcy5fb2JqLnByZWRpY2F0ZSkoeCwgdGhpcy5faSsrLCB0aGlzLl9zKTtcbiAgICAgICAgaWYgKHJlcyA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuX28ub25FcnJvcihyZXMuZSk7IH1cbiAgICAgICAgQm9vbGVhbihyZXMpICYmIChzaG91bGRZaWVsZCA9IHRydWUpO1xuICAgICAgfSBlbHNlIGlmICghdGhpcy5fb2JqLnByZWRpY2F0ZSkge1xuICAgICAgICBzaG91bGRZaWVsZCA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoc2hvdWxkWWllbGQpIHtcbiAgICAgICAgaWYgKHRoaXMuX2h2KSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX28ub25FcnJvcihuZXcgRXJyb3IoJ1NlcXVlbmNlIGNvbnRhaW5zIG1vcmUgdGhhbiBvbmUgbWF0Y2hpbmcgZWxlbWVudCcpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9odiA9IHRydWU7XG4gICAgICAgIHRoaXMuX3YgPSB4O1xuICAgICAgfVxuICAgIH07XG4gICAgU2luZ2xlT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHsgdGhpcy5fby5vbkVycm9yKGUpOyB9O1xuICAgIFNpbmdsZU9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAodGhpcy5faHYpIHtcbiAgICAgICAgdGhpcy5fby5vbk5leHQodGhpcy5fdik7XG4gICAgICAgIHRoaXMuX28ub25Db21wbGV0ZWQoKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuX29iai5kZWZhdWx0VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9vLm9uRXJyb3IobmV3IEVtcHR5RXJyb3IoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9vLm9uTmV4dCh0aGlzLl9vYmouZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gU2luZ2xlT2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBvbmx5IGVsZW1lbnQgb2YgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IHNhdGlzZmllcyB0aGUgY29uZGl0aW9uIGluIHRoZSBvcHRpb25hbCBwcmVkaWNhdGUsIGFuZCByZXBvcnRzIGFuIGV4Y2VwdGlvbiBpZiB0aGVyZSBpcyBub3QgZXhhY3RseSBvbmUgZWxlbWVudCBpbiB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gU2VxdWVuY2UgY29udGFpbmluZyB0aGUgc2luZ2xlIGVsZW1lbnQgaW4gdGhlIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBzYXRpc2ZpZXMgdGhlIGNvbmRpdGlvbiBpbiB0aGUgcHJlZGljYXRlLlxuICAgICAqL1xuICAgIG9ic2VydmFibGVQcm90by5zaW5nbGUgPSBmdW5jdGlvbiAocHJlZGljYXRlLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgb2JqID0ge30sIHNvdXJjZSA9IHRoaXM7XG4gICAgICBpZiAodHlwZW9mIGFyZ3VtZW50c1swXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgb2JqID0gYXJndW1lbnRzWzBdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgIHByZWRpY2F0ZTogYXJndW1lbnRzWzBdLFxuICAgICAgICAgIHRoaXNBcmc6IGFyZ3VtZW50c1sxXSxcbiAgICAgICAgICBkZWZhdWx0VmFsdWU6IGFyZ3VtZW50c1syXVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKGlzRnVuY3Rpb24gKG9iai5wcmVkaWNhdGUpKSB7XG4gICAgICAgIHZhciBmbiA9IG9iai5wcmVkaWNhdGU7XG4gICAgICAgIG9iai5wcmVkaWNhdGUgPSBiaW5kQ2FsbGJhY2soZm4sIG9iai50aGlzQXJnLCAzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbiAobykge1xuICAgICAgICByZXR1cm4gc291cmNlLnN1YnNjcmliZShuZXcgU2luZ2xlT2JzZXJ2ZXIobywgb2JqLCBzb3VyY2UpKTtcbiAgICAgIH0sIHNvdXJjZSk7XG4gICAgfTtcblxuICB2YXIgRmlyc3RPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhGaXJzdE9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gRmlyc3RPYnNlcnZhYmxlKHNvdXJjZSwgb2JqKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMuX29iaiA9IG9iajtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIEZpcnN0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG5ldyBGaXJzdE9ic2VydmVyKG8sIHRoaXMuX29iaiwgdGhpcy5zb3VyY2UpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEZpcnN0T2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIHZhciBGaXJzdE9ic2VydmVyID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEZpcnN0T2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gRmlyc3RPYnNlcnZlcihvLCBvYmosIHMpIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fb2JqID0gb2JqO1xuICAgICAgdGhpcy5fcyA9IHM7XG4gICAgICB0aGlzLl9pID0gMDtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIEZpcnN0T2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgaWYgKHRoaXMuX29iai5wcmVkaWNhdGUpIHtcbiAgICAgICAgdmFyIHJlcyA9IHRyeUNhdGNoKHRoaXMuX29iai5wcmVkaWNhdGUpKHgsIHRoaXMuX2krKywgdGhpcy5fcyk7XG4gICAgICAgIGlmIChyZXMgPT09IGVycm9yT2JqKSB7IHJldHVybiB0aGlzLl9vLm9uRXJyb3IocmVzLmUpOyB9XG4gICAgICAgIGlmIChCb29sZWFuKHJlcykpIHtcbiAgICAgICAgICB0aGlzLl9vLm9uTmV4dCh4KTtcbiAgICAgICAgICB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMuX29iai5wcmVkaWNhdGUpIHtcbiAgICAgICAgdGhpcy5fby5vbk5leHQoeCk7XG4gICAgICAgIHRoaXMuX28ub25Db21wbGV0ZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIEZpcnN0T2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHsgdGhpcy5fby5vbkVycm9yKGUpOyB9O1xuICAgIEZpcnN0T2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICh0aGlzLl9vYmouZGVmYXVsdFZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fby5vbkVycm9yKG5ldyBFbXB0eUVycm9yKCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fby5vbk5leHQodGhpcy5fb2JqLmRlZmF1bHRWYWx1ZSk7XG4gICAgICAgIHRoaXMuX28ub25Db21wbGV0ZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIEZpcnN0T2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBmaXJzdCBlbGVtZW50IG9mIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBzYXRpc2ZpZXMgdGhlIGNvbmRpdGlvbiBpbiB0aGUgcHJlZGljYXRlIGlmIHByZXNlbnQgZWxzZSB0aGUgZmlyc3QgaXRlbSBpbiB0aGUgc2VxdWVuY2UuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBTZXF1ZW5jZSBjb250YWluaW5nIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgc2F0aXNmaWVzIHRoZSBjb25kaXRpb24gaW4gdGhlIHByZWRpY2F0ZSBpZiBwcm92aWRlZCwgZWxzZSB0aGUgZmlyc3QgaXRlbSBpbiB0aGUgc2VxdWVuY2UuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uZmlyc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9iaiA9IHt9LCBzb3VyY2UgPSB0aGlzO1xuICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdID09PSAnb2JqZWN0Jykge1xuICAgICAgb2JqID0gYXJndW1lbnRzWzBdO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmogPSB7XG4gICAgICAgIHByZWRpY2F0ZTogYXJndW1lbnRzWzBdLFxuICAgICAgICB0aGlzQXJnOiBhcmd1bWVudHNbMV0sXG4gICAgICAgIGRlZmF1bHRWYWx1ZTogYXJndW1lbnRzWzJdXG4gICAgICB9O1xuICAgIH1cbiAgICBpZiAoaXNGdW5jdGlvbiAob2JqLnByZWRpY2F0ZSkpIHtcbiAgICAgIHZhciBmbiA9IG9iai5wcmVkaWNhdGU7XG4gICAgICBvYmoucHJlZGljYXRlID0gYmluZENhbGxiYWNrKGZuLCBvYmoudGhpc0FyZywgMyk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgRmlyc3RPYnNlcnZhYmxlKHRoaXMsIG9iaik7XG4gIH07XG5cbiAgdmFyIExhc3RPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhMYXN0T2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBMYXN0T2JzZXJ2YWJsZShzb3VyY2UsIG9iaikge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9vYmogPSBvYmo7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBMYXN0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG5ldyBMYXN0T2JzZXJ2ZXIobywgdGhpcy5fb2JqLCB0aGlzLnNvdXJjZSkpO1xuICAgIH07XG5cbiAgICByZXR1cm4gTGFzdE9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgTGFzdE9ic2VydmVyID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKExhc3RPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBMYXN0T2JzZXJ2ZXIobywgb2JqLCBzKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX29iaiA9IG9iajtcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgdGhpcy5faSA9IDA7XG4gICAgICB0aGlzLl9odiA9IGZhbHNlO1xuICAgICAgdGhpcy5fdiA9IG51bGw7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBMYXN0T2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgdmFyIHNob3VsZFlpZWxkID0gZmFsc2U7XG4gICAgICBpZiAodGhpcy5fb2JqLnByZWRpY2F0ZSkge1xuICAgICAgICB2YXIgcmVzID0gdHJ5Q2F0Y2godGhpcy5fb2JqLnByZWRpY2F0ZSkoeCwgdGhpcy5faSsrLCB0aGlzLl9zKTtcbiAgICAgICAgaWYgKHJlcyA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuX28ub25FcnJvcihyZXMuZSk7IH1cbiAgICAgICAgQm9vbGVhbihyZXMpICYmIChzaG91bGRZaWVsZCA9IHRydWUpO1xuICAgICAgfSBlbHNlIGlmICghdGhpcy5fb2JqLnByZWRpY2F0ZSkge1xuICAgICAgICBzaG91bGRZaWVsZCA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoc2hvdWxkWWllbGQpIHtcbiAgICAgICAgdGhpcy5faHYgPSB0cnVlO1xuICAgICAgICB0aGlzLl92ID0geDtcbiAgICAgIH1cbiAgICB9O1xuICAgIExhc3RPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyB0aGlzLl9vLm9uRXJyb3IoZSk7IH07XG4gICAgTGFzdE9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAodGhpcy5faHYpIHtcbiAgICAgICAgdGhpcy5fby5vbk5leHQodGhpcy5fdik7XG4gICAgICAgIHRoaXMuX28ub25Db21wbGV0ZWQoKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuX29iai5kZWZhdWx0VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9vLm9uRXJyb3IobmV3IEVtcHR5RXJyb3IoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9vLm9uTmV4dCh0aGlzLl9vYmouZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gTGFzdE9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgbGFzdCBlbGVtZW50IG9mIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBzYXRpc2ZpZXMgdGhlIGNvbmRpdGlvbiBpbiB0aGUgcHJlZGljYXRlIGlmIHNwZWNpZmllZCwgZWxzZSB0aGUgbGFzdCBlbGVtZW50LlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gU2VxdWVuY2UgY29udGFpbmluZyB0aGUgbGFzdCBlbGVtZW50IGluIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgc2F0aXNmaWVzIHRoZSBjb25kaXRpb24gaW4gdGhlIHByZWRpY2F0ZS5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5sYXN0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvYmogPSB7fSwgc291cmNlID0gdGhpcztcbiAgICBpZiAodHlwZW9mIGFyZ3VtZW50c1swXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIG9iaiA9IGFyZ3VtZW50c1swXTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqID0ge1xuICAgICAgICBwcmVkaWNhdGU6IGFyZ3VtZW50c1swXSxcbiAgICAgICAgdGhpc0FyZzogYXJndW1lbnRzWzFdLFxuICAgICAgICBkZWZhdWx0VmFsdWU6IGFyZ3VtZW50c1syXVxuICAgICAgfTtcbiAgICB9XG4gICAgaWYgKGlzRnVuY3Rpb24gKG9iai5wcmVkaWNhdGUpKSB7XG4gICAgICB2YXIgZm4gPSBvYmoucHJlZGljYXRlO1xuICAgICAgb2JqLnByZWRpY2F0ZSA9IGJpbmRDYWxsYmFjayhmbiwgb2JqLnRoaXNBcmcsIDMpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IExhc3RPYnNlcnZhYmxlKHRoaXMsIG9iaik7XG4gIH07XG5cbiAgdmFyIEZpbmRWYWx1ZU9ic2VydmVyID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEZpbmRWYWx1ZU9ic2VydmVyLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIEZpbmRWYWx1ZU9ic2VydmVyKG9ic2VydmVyLCBzb3VyY2UsIGNhbGxiYWNrLCB5aWVsZEluZGV4KSB7XG4gICAgICB0aGlzLl9vID0gb2JzZXJ2ZXI7XG4gICAgICB0aGlzLl9zID0gc291cmNlO1xuICAgICAgdGhpcy5fY2IgPSBjYWxsYmFjaztcbiAgICAgIHRoaXMuX3kgPSB5aWVsZEluZGV4O1xuICAgICAgdGhpcy5faSA9IDA7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBGaW5kVmFsdWVPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICB2YXIgc2hvdWxkUnVuID0gdHJ5Q2F0Y2godGhpcy5fY2IpKHgsIHRoaXMuX2ksIHRoaXMuX3MpO1xuICAgICAgaWYgKHNob3VsZFJ1biA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuX28ub25FcnJvcihzaG91bGRSdW4uZSk7IH1cbiAgICAgIGlmIChzaG91bGRSdW4pIHtcbiAgICAgICAgdGhpcy5fby5vbk5leHQodGhpcy5feSA/IHRoaXMuX2kgOiB4KTtcbiAgICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5faSsrO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBGaW5kVmFsdWVPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgdGhpcy5fby5vbkVycm9yKGUpO1xuICAgIH07XG5cbiAgICBGaW5kVmFsdWVPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5feSAmJiB0aGlzLl9vLm9uTmV4dCgtMSk7XG4gICAgICB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIHJldHVybiBGaW5kVmFsdWVPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgZnVuY3Rpb24gZmluZFZhbHVlIChzb3VyY2UsIHByZWRpY2F0ZSwgdGhpc0FyZywgeWllbGRJbmRleCkge1xuICAgIHZhciBjYWxsYmFjayA9IGJpbmRDYWxsYmFjayhwcmVkaWNhdGUsIHRoaXNBcmcsIDMpO1xuICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHNvdXJjZS5zdWJzY3JpYmUobmV3IEZpbmRWYWx1ZU9ic2VydmVyKG8sIHNvdXJjZSwgY2FsbGJhY2ssIHlpZWxkSW5kZXgpKTtcbiAgICB9LCBzb3VyY2UpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlYXJjaGVzIGZvciBhbiBlbGVtZW50IHRoYXQgbWF0Y2hlcyB0aGUgY29uZGl0aW9ucyBkZWZpbmVkIGJ5IHRoZSBzcGVjaWZpZWQgcHJlZGljYXRlLCBhbmQgcmV0dXJucyB0aGUgZmlyc3Qgb2NjdXJyZW5jZSB3aXRoaW4gdGhlIGVudGlyZSBPYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBwcmVkaWNhdGUgVGhlIHByZWRpY2F0ZSB0aGF0IGRlZmluZXMgdGhlIGNvbmRpdGlvbnMgb2YgdGhlIGVsZW1lbnQgdG8gc2VhcmNoIGZvci5cbiAgICogQHBhcmFtIHtBbnl9IFt0aGlzQXJnXSBPYmplY3QgdG8gdXNlIGFzIGB0aGlzYCB3aGVuIGV4ZWN1dGluZyB0aGUgcHJlZGljYXRlLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gT2JzZXJ2YWJsZSBzZXF1ZW5jZSB3aXRoIHRoZSBmaXJzdCBlbGVtZW50IHRoYXQgbWF0Y2hlcyB0aGUgY29uZGl0aW9ucyBkZWZpbmVkIGJ5IHRoZSBzcGVjaWZpZWQgcHJlZGljYXRlLCBpZiBmb3VuZDsgb3RoZXJ3aXNlLCB1bmRlZmluZWQuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uZmluZCA9IGZ1bmN0aW9uIChwcmVkaWNhdGUsIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gZmluZFZhbHVlKHRoaXMsIHByZWRpY2F0ZSwgdGhpc0FyZywgZmFsc2UpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZWFyY2hlcyBmb3IgYW4gZWxlbWVudCB0aGF0IG1hdGNoZXMgdGhlIGNvbmRpdGlvbnMgZGVmaW5lZCBieSB0aGUgc3BlY2lmaWVkIHByZWRpY2F0ZSwgYW5kIHJldHVybnNcbiAgICogYW4gT2JzZXJ2YWJsZSBzZXF1ZW5jZSB3aXRoIHRoZSB6ZXJvLWJhc2VkIGluZGV4IG9mIHRoZSBmaXJzdCBvY2N1cnJlbmNlIHdpdGhpbiB0aGUgZW50aXJlIE9ic2VydmFibGUgc2VxdWVuY2UuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IHByZWRpY2F0ZSBUaGUgcHJlZGljYXRlIHRoYXQgZGVmaW5lcyB0aGUgY29uZGl0aW9ucyBvZiB0aGUgZWxlbWVudCB0byBzZWFyY2ggZm9yLlxuICAgKiBAcGFyYW0ge0FueX0gW3RoaXNBcmddIE9iamVjdCB0byB1c2UgYXMgYHRoaXNgIHdoZW4gZXhlY3V0aW5nIHRoZSBwcmVkaWNhdGUuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBPYnNlcnZhYmxlIHNlcXVlbmNlIHdpdGggdGhlIHplcm8tYmFzZWQgaW5kZXggb2YgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYW4gZWxlbWVudCB0aGF0IG1hdGNoZXMgdGhlIGNvbmRpdGlvbnMgZGVmaW5lZCBieSBtYXRjaCwgaWYgZm91bmQ7IG90aGVyd2lzZSwg4oCTMS5cbiAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmZpbmRJbmRleCA9IGZ1bmN0aW9uIChwcmVkaWNhdGUsIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gZmluZFZhbHVlKHRoaXMsIHByZWRpY2F0ZSwgdGhpc0FyZywgdHJ1ZSk7XG4gIH07XG5cbiAgdmFyIFRvU2V0T2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoVG9TZXRPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFRvU2V0T2JzZXJ2YWJsZShzb3VyY2UpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgVG9TZXRPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IFRvU2V0T2JzZXJ2ZXIobykpO1xuICAgIH07XG5cbiAgICByZXR1cm4gVG9TZXRPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIFRvU2V0T2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFRvU2V0T2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gVG9TZXRPYnNlcnZlcihvKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX3MgPSBuZXcgcm9vdC5TZXQoKTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFRvU2V0T2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgdGhpcy5fcy5hZGQoeCk7XG4gICAgfTtcblxuICAgIFRvU2V0T2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuX28ub25FcnJvcihlKTtcbiAgICB9O1xuXG4gICAgVG9TZXRPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5fby5vbk5leHQodGhpcy5fcyk7XG4gICAgICB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIHJldHVybiBUb1NldE9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogQ29udmVydHMgdGhlIG9ic2VydmFibGUgc2VxdWVuY2UgdG8gYSBTZXQgaWYgaXQgZXhpc3RzLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB3aXRoIGEgc2luZ2xlIHZhbHVlIG9mIGEgU2V0IGNvbnRhaW5pbmcgdGhlIHZhbHVlcyBmcm9tIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnRvU2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0eXBlb2Ygcm9vdC5TZXQgPT09ICd1bmRlZmluZWQnKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoKTsgfVxuICAgIHJldHVybiBuZXcgVG9TZXRPYnNlcnZhYmxlKHRoaXMpO1xuICB9O1xuXG4gIHZhciBUb01hcE9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFRvTWFwT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBUb01hcE9ic2VydmFibGUoc291cmNlLCBrLCBlKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMuX2sgPSBrO1xuICAgICAgdGhpcy5fZSA9IGU7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBUb01hcE9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgVG9NYXBPYnNlcnZlcihvLCB0aGlzLl9rLCB0aGlzLl9lKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBUb01hcE9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgVG9NYXBPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoVG9NYXBPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBUb01hcE9ic2VydmVyKG8sIGssIGUpIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fayA9IGs7XG4gICAgICB0aGlzLl9lID0gZTtcbiAgICAgIHRoaXMuX20gPSBuZXcgcm9vdC5NYXAoKTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFRvTWFwT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgdmFyIGtleSA9IHRyeUNhdGNoKHRoaXMuX2spKHgpO1xuICAgICAgaWYgKGtleSA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuX28ub25FcnJvcihrZXkuZSk7IH1cbiAgICAgIHZhciBlbGVtID0geDtcbiAgICAgIGlmICh0aGlzLl9lKSB7XG4gICAgICAgIGVsZW0gPSB0cnlDYXRjaCh0aGlzLl9lKSh4KTtcbiAgICAgICAgaWYgKGVsZW0gPT09IGVycm9yT2JqKSB7IHJldHVybiB0aGlzLl9vLm9uRXJyb3IoZWxlbS5lKTsgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLl9tLnNldChrZXksIGVsZW0pO1xuICAgIH07XG5cbiAgICBUb01hcE9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICB0aGlzLl9vLm9uRXJyb3IoZSk7XG4gICAgfTtcblxuICAgIFRvTWFwT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuX28ub25OZXh0KHRoaXMuX20pO1xuICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gVG9NYXBPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgLyoqXG4gICogQ29udmVydHMgdGhlIG9ic2VydmFibGUgc2VxdWVuY2UgdG8gYSBNYXAgaWYgaXQgZXhpc3RzLlxuICAqIEBwYXJhbSB7RnVuY3Rpb259IGtleVNlbGVjdG9yIEEgZnVuY3Rpb24gd2hpY2ggcHJvZHVjZXMgdGhlIGtleSBmb3IgdGhlIE1hcC5cbiAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZWxlbWVudFNlbGVjdG9yXSBBbiBvcHRpb25hbCBmdW5jdGlvbiB3aGljaCBwcm9kdWNlcyB0aGUgZWxlbWVudCBmb3IgdGhlIE1hcC4gSWYgbm90IHByZXNlbnQsIGRlZmF1bHRzIHRvIHRoZSB2YWx1ZSBmcm9tIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdpdGggYSBzaW5nbGUgdmFsdWUgb2YgYSBNYXAgY29udGFpbmluZyB0aGUgdmFsdWVzIGZyb20gdGhlIG9ic2VydmFibGUgc2VxdWVuY2UuXG4gICovXG4gIG9ic2VydmFibGVQcm90by50b01hcCA9IGZ1bmN0aW9uIChrZXlTZWxlY3RvciwgZWxlbWVudFNlbGVjdG9yKSB7XG4gICAgaWYgKHR5cGVvZiByb290Lk1hcCA9PT0gJ3VuZGVmaW5lZCcpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcigpOyB9XG4gICAgcmV0dXJuIG5ldyBUb01hcE9ic2VydmFibGUodGhpcywga2V5U2VsZWN0b3IsIGVsZW1lbnRTZWxlY3Rvcik7XG4gIH07XG5cbiAgdmFyIFNsaWNlT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoU2xpY2VPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFNsaWNlT2JzZXJ2YWJsZShzb3VyY2UsIGIsIGUpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5fYiA9IGI7XG4gICAgICB0aGlzLl9lID0gZTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFNsaWNlT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG5ldyBTbGljZU9ic2VydmVyKG8sIHRoaXMuX2IsIHRoaXMuX2UpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFNsaWNlT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIHZhciBTbGljZU9ic2VydmVyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhTbGljZU9ic2VydmVyLCBfX3N1cGVyX18pO1xuXG4gICAgZnVuY3Rpb24gU2xpY2VPYnNlcnZlcihvLCBiLCBlKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX2IgPSBiO1xuICAgICAgdGhpcy5fZSA9IGU7XG4gICAgICB0aGlzLl9pID0gMDtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFNsaWNlT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgaWYgKHRoaXMuX2kgPj0gdGhpcy5fYikge1xuICAgICAgICBpZiAodGhpcy5fZSA9PT0gdGhpcy5faSkge1xuICAgICAgICAgIHRoaXMuX28ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9vLm9uTmV4dCh4KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5faSsrO1xuICAgIH07XG4gICAgU2xpY2VPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyB0aGlzLl9vLm9uRXJyb3IoZSk7IH07XG4gICAgU2xpY2VPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkgeyB0aGlzLl9vLm9uQ29tcGxldGVkKCk7IH07XG5cbiAgICByZXR1cm4gU2xpY2VPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgLypcbiAgKiBUaGUgc2xpY2UoKSBtZXRob2QgcmV0dXJucyBhIHNoYWxsb3cgY29weSBvZiBhIHBvcnRpb24gb2YgYW4gT2JzZXJ2YWJsZSBpbnRvIGEgbmV3IE9ic2VydmFibGUgb2JqZWN0LlxuICAqIFVubGlrZSB0aGUgYXJyYXkgdmVyc2lvbiwgdGhpcyBkb2VzIG5vdCBzdXBwb3J0IG5lZ2F0aXZlIG51bWJlcnMgZm9yIGJlaW5nIG9yIGVuZC5cbiAgKiBAcGFyYW0ge051bWJlcn0gW2JlZ2luXSBaZXJvLWJhc2VkIGluZGV4IGF0IHdoaWNoIHRvIGJlZ2luIGV4dHJhY3Rpb24uIElmIG9taXR0ZWQsIHRoaXMgd2lsbCBkZWZhdWx0IHRvIHplcm8uXG4gICogQHBhcmFtIHtOdW1iZXJ9IFtlbmRdIFplcm8tYmFzZWQgaW5kZXggYXQgd2hpY2ggdG8gZW5kIGV4dHJhY3Rpb24uIHNsaWNlIGV4dHJhY3RzIHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIGVuZC5cbiAgKiBJZiBvbWl0dGVkLCB0aGlzIHdpbGwgZW1pdCB0aGUgcmVzdCBvZiB0aGUgT2JzZXJ2YWJsZSBvYmplY3QuXG4gICogQHJldHVybnMge09ic2VydmFibGV9IEEgc2hhbGxvdyBjb3B5IG9mIGEgcG9ydGlvbiBvZiBhbiBPYnNlcnZhYmxlIGludG8gYSBuZXcgT2JzZXJ2YWJsZSBvYmplY3QuXG4gICovXG4gIG9ic2VydmFibGVQcm90by5zbGljZSA9IGZ1bmN0aW9uIChiZWdpbiwgZW5kKSB7XG4gICAgdmFyIHN0YXJ0ID0gYmVnaW4gfHwgMDtcbiAgICBpZiAoc3RhcnQgPCAwKSB7IHRocm93IG5ldyBSeC5Bcmd1bWVudE91dE9mUmFuZ2VFcnJvcigpOyB9XG4gICAgaWYgKHR5cGVvZiBlbmQgPT09ICdudW1iZXInICYmIGVuZCA8IHN0YXJ0KSB7XG4gICAgICB0aHJvdyBuZXcgUnguQXJndW1lbnRPdXRPZlJhbmdlRXJyb3IoKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBTbGljZU9ic2VydmFibGUodGhpcywgc3RhcnQsIGVuZCk7XG4gIH07XG5cbiAgdmFyIExhc3RJbmRleE9mT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoTGFzdEluZGV4T2ZPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIExhc3RJbmRleE9mT2JzZXJ2YWJsZShzb3VyY2UsIGUsIG4pIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5fZSA9IGU7XG4gICAgICB0aGlzLl9uID0gbjtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIExhc3RJbmRleE9mT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICBpZiAodGhpcy5fbiA8IDApIHtcbiAgICAgICAgby5vbk5leHQoLTEpO1xuICAgICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IExhc3RJbmRleE9mT2JzZXJ2ZXIobywgdGhpcy5fZSwgdGhpcy5fbikpO1xuICAgIH07XG5cbiAgICByZXR1cm4gTGFzdEluZGV4T2ZPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIExhc3RJbmRleE9mT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKExhc3RJbmRleE9mT2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gTGFzdEluZGV4T2ZPYnNlcnZlcihvLCBlLCBuKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX2UgPSBlO1xuICAgICAgdGhpcy5fbiA9IG47XG4gICAgICB0aGlzLl92ID0gMDtcbiAgICAgIHRoaXMuX2h2ID0gZmFsc2U7XG4gICAgICB0aGlzLl9pID0gMDtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIExhc3RJbmRleE9mT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgaWYgKHRoaXMuX2kgPj0gdGhpcy5fbiAmJiB4ID09PSB0aGlzLl9lKSB7XG4gICAgICAgIHRoaXMuX2h2ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fdiA9IHRoaXMuX2k7XG4gICAgICB9XG4gICAgICB0aGlzLl9pKys7XG4gICAgfTtcbiAgICBMYXN0SW5kZXhPZk9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7IHRoaXMuX28ub25FcnJvcihlKTsgfTtcbiAgICBMYXN0SW5kZXhPZk9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAodGhpcy5faHYpIHtcbiAgICAgICAgdGhpcy5fby5vbk5leHQodGhpcy5fdik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9vLm9uTmV4dCgtMSk7XG4gICAgICB9XG4gICAgICB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIHJldHVybiBMYXN0SW5kZXhPZk9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgbGFzdCBpbmRleCBhdCB3aGljaCBhIGdpdmVuIGVsZW1lbnQgY2FuIGJlIGZvdW5kIGluIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlLCBvciAtMSBpZiBpdCBpcyBub3QgcHJlc2VudC5cbiAgICogQHBhcmFtIHtBbnl9IHNlYXJjaEVsZW1lbnQgRWxlbWVudCB0byBsb2NhdGUgaW4gdGhlIGFycmF5LlxuICAgKiBAcGFyYW0ge051bWJlcn0gW2Zyb21JbmRleF0gVGhlIGluZGV4IHRvIHN0YXJ0IHRoZSBzZWFyY2guICBJZiBub3Qgc3BlY2lmaWVkLCBkZWZhdWx0cyB0byAwLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW5kIG9ic2VydmFibGUgc2VxdWVuY2UgY29udGFpbmluZyB0aGUgbGFzdCBpbmRleCBhdCB3aGljaCBhIGdpdmVuIGVsZW1lbnQgY2FuIGJlIGZvdW5kIGluIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlLCBvciAtMSBpZiBpdCBpcyBub3QgcHJlc2VudC5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uKHNlYXJjaEVsZW1lbnQsIGZyb21JbmRleCkge1xuICAgIHZhciBuID0gK2Zyb21JbmRleCB8fCAwO1xuICAgIE1hdGguYWJzKG4pID09PSBJbmZpbml0eSAmJiAobiA9IDApO1xuICAgIHJldHVybiBuZXcgTGFzdEluZGV4T2ZPYnNlcnZhYmxlKHRoaXMsIHNlYXJjaEVsZW1lbnQsIG4pO1xuICB9O1xuXG4gIHJldHVybiBSeDtcbn0pKTtcbiJdfQ==