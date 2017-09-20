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
    // Aliases
    var Observable = Rx.Observable, observableProto = Observable.prototype, ObservableBase = Rx.ObservableBase, AbstractObserver = Rx.internals.AbstractObserver, FlatMapObservable = Rx.FlatMapObservable, observableConcat = Observable.concat, observableDefer = Observable.defer, observableEmpty = Observable.empty, disposableEmpty = Rx.Disposable.empty, CompositeDisposable = Rx.CompositeDisposable, SerialDisposable = Rx.SerialDisposable, SingleAssignmentDisposable = Rx.SingleAssignmentDisposable, Enumerable = Rx.internals.Enumerable, enumerableOf = Enumerable.of, currentThreadScheduler = Rx.Scheduler.currentThread, AsyncSubject = Rx.AsyncSubject, Observer = Rx.Observer, inherits = Rx.internals.inherits, addProperties = Rx.internals.addProperties, helpers = Rx.helpers, noop = helpers.noop, isPromise = helpers.isPromise, isFunction = helpers.isFunction, isIterable = Rx.helpers.isIterable, isArrayLike = Rx.helpers.isArrayLike, isScheduler = Rx.Scheduler.isScheduler, observableFromPromise = Observable.fromPromise;
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
    var WhileEnumerable = (function (__super__) {
        inherits(WhileEnumerable, __super__);
        function WhileEnumerable(c, s) {
            this.c = c;
            this.s = s;
        }
        WhileEnumerable.prototype[$iterator$] = function () {
            var self = this;
            return {
                next: function () {
                    return self.c() ?
                        { done: false, value: self.s } :
                        { done: true, value: void 0 };
                }
            };
        };
        return WhileEnumerable;
    }(Enumerable));
    function enumerableWhile(condition, source) {
        return new WhileEnumerable(condition, source);
    }
    /**
    *  Returns an observable sequence that is the result of invoking the selector on the source sequence, without sharing subscriptions.
    *  This operator allows for a fluent style of writing queries that use the same sequence multiple times.
    *
    * @param {Function} selector Selector function which can use the source sequence as many times as needed, without sharing subscriptions to the source sequence.
    * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
    */
    observableProto.letBind = observableProto['let'] = function (func) {
        return func(this);
    };
    /**
    *  Determines whether an observable collection contains values.
    *
    * @example
    *  1 - res = Rx.Observable.if(condition, obs1);
    *  2 - res = Rx.Observable.if(condition, obs1, obs2);
    *  3 - res = Rx.Observable.if(condition, obs1, scheduler);
    * @param {Function} condition The condition which determines if the thenSource or elseSource will be run.
    * @param {Observable} thenSource The observable sequence or Promise that will be run if the condition function returns true.
    * @param {Observable} [elseSource] The observable sequence or Promise that will be run if the condition function returns false. If this is not provided, it defaults to Rx.Observabe.Empty with the specified scheduler.
    * @returns {Observable} An observable sequence which is either the thenSource or elseSource.
    */
    Observable['if'] = function (condition, thenSource, elseSourceOrScheduler) {
        return observableDefer(function () {
            elseSourceOrScheduler || (elseSourceOrScheduler = observableEmpty());
            isPromise(thenSource) && (thenSource = observableFromPromise(thenSource));
            isPromise(elseSourceOrScheduler) && (elseSourceOrScheduler = observableFromPromise(elseSourceOrScheduler));
            // Assume a scheduler for empty only
            typeof elseSourceOrScheduler.now === 'function' && (elseSourceOrScheduler = observableEmpty(elseSourceOrScheduler));
            return condition() ? thenSource : elseSourceOrScheduler;
        });
    };
    /**
    *  Concatenates the observable sequences obtained by running the specified result selector for each element in source.
    * There is an alias for this method called 'forIn' for browsers <IE9
    * @param {Array} sources An array of values to turn into an observable sequence.
    * @param {Function} resultSelector A function to apply to each item in the sources array to turn it into an observable sequence.
    * @returns {Observable} An observable sequence from the concatenated observable sequences.
    */
    Observable['for'] = Observable.forIn = function (sources, resultSelector, thisArg) {
        return enumerableOf(sources, resultSelector, thisArg).concat();
    };
    /**
    *  Repeats source as long as condition holds emulating a while loop.
    * There is an alias for this method called 'whileDo' for browsers <IE9
    *
    * @param {Function} condition The condition which determines if the source will be repeated.
    * @param {Observable} source The observable sequence that will be run if the condition function returns true.
    * @returns {Observable} An observable sequence which is repeated as long as the condition holds.
    */
    var observableWhileDo = Observable['while'] = Observable.whileDo = function (condition, source) {
        isPromise(source) && (source = observableFromPromise(source));
        return enumerableWhile(condition, source).concat();
    };
    /**
    *  Repeats source as long as condition holds emulating a do while loop.
    *
    * @param {Function} condition The condition which determines if the source will be repeated.
    * @param {Observable} source The observable sequence that will be run if the condition function returns true.
    * @returns {Observable} An observable sequence which is repeated as long as the condition holds.
    */
    observableProto.doWhile = function (condition) {
        return observableConcat([this, observableWhileDo(condition, this)]);
    };
    /**
    *  Uses selector to determine which source in sources to use.
    * @param {Function} selector The function which extracts the value for to test in a case statement.
    * @param {Array} sources A object which has keys which correspond to the case statement labels.
    * @param {Observable} [elseSource] The observable sequence or Promise that will be run if the sources are not matched. If this is not provided, it defaults to Rx.Observabe.empty with the specified scheduler.
    *
    * @returns {Observable} An observable sequence which is determined by a case statement.
    */
    Observable['case'] = function (selector, sources, defaultSourceOrScheduler) {
        return observableDefer(function () {
            isPromise(defaultSourceOrScheduler) && (defaultSourceOrScheduler = observableFromPromise(defaultSourceOrScheduler));
            defaultSourceOrScheduler || (defaultSourceOrScheduler = observableEmpty());
            isScheduler(defaultSourceOrScheduler) && (defaultSourceOrScheduler = observableEmpty(defaultSourceOrScheduler));
            var result = sources[selector()];
            isPromise(result) && (result = observableFromPromise(result));
            return result || defaultSourceOrScheduler;
        });
    };
    var ExpandObservable = (function (__super__) {
        inherits(ExpandObservable, __super__);
        function ExpandObservable(source, fn, scheduler) {
            this.source = source;
            this._fn = fn;
            this._scheduler = scheduler;
            __super__.call(this);
        }
        function scheduleRecursive(args, recurse) {
            var state = args[0], self = args[1];
            var work;
            if (state.q.length > 0) {
                work = state.q.shift();
            }
            else {
                state.isAcquired = false;
                return;
            }
            var m1 = new SingleAssignmentDisposable();
            state.d.add(m1);
            m1.setDisposable(work.subscribe(new ExpandObserver(state, self, m1)));
            recurse([state, self]);
        }
        ExpandObservable.prototype._ensureActive = function (state) {
            var isOwner = false;
            if (state.q.length > 0) {
                isOwner = !state.isAcquired;
                state.isAcquired = true;
            }
            isOwner && state.m.setDisposable(this._scheduler.scheduleRecursive([state, this], scheduleRecursive));
        };
        ExpandObservable.prototype.subscribeCore = function (o) {
            var m = new SerialDisposable(), d = new CompositeDisposable(m), state = {
                q: [],
                m: m,
                d: d,
                activeCount: 0,
                isAcquired: false,
                o: o
            };
            state.q.push(this.source);
            state.activeCount++;
            this._ensureActive(state);
            return d;
        };
        return ExpandObservable;
    }(ObservableBase));
    var ExpandObserver = (function (__super__) {
        inherits(ExpandObserver, __super__);
        function ExpandObserver(state, parent, m1) {
            this._s = state;
            this._p = parent;
            this._m1 = m1;
            __super__.call(this);
        }
        ExpandObserver.prototype.next = function (x) {
            this._s.o.onNext(x);
            var result = tryCatch(this._p._fn)(x);
            if (result === errorObj) {
                return this._s.o.onError(result.e);
            }
            this._s.q.push(result);
            this._s.activeCount++;
            this._p._ensureActive(this._s);
        };
        ExpandObserver.prototype.error = function (e) {
            this._s.o.onError(e);
        };
        ExpandObserver.prototype.completed = function () {
            this._s.d.remove(this._m1);
            this._s.activeCount--;
            this._s.activeCount === 0 && this._s.o.onCompleted();
        };
        return ExpandObserver;
    }(AbstractObserver));
    /**
    *  Expands an observable sequence by recursively invoking selector.
    *
    * @param {Function} selector Selector function to invoke for each produced element, resulting in another sequence to which the selector will be invoked recursively again.
    * @param {Scheduler} [scheduler] Scheduler on which to perform the expansion. If not provided, this defaults to the current thread scheduler.
    * @returns {Observable} An observable sequence containing all the elements produced by the recursive expansion.
    */
    observableProto.expand = function (selector, scheduler) {
        isScheduler(scheduler) || (scheduler = currentThreadScheduler);
        return new ExpandObservable(this, selector, scheduler);
    };
    function argumentsToArray() {
        var len = arguments.length, args = new Array(len);
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
        }
        return args;
    }
    var ForkJoinObservable = (function (__super__) {
        inherits(ForkJoinObservable, __super__);
        function ForkJoinObservable(sources, cb) {
            this._sources = sources;
            this._cb = cb;
            __super__.call(this);
        }
        ForkJoinObservable.prototype.subscribeCore = function (o) {
            if (this._sources.length === 0) {
                o.onCompleted();
                return disposableEmpty;
            }
            var count = this._sources.length;
            var state = {
                finished: false,
                hasResults: new Array(count),
                hasCompleted: new Array(count),
                results: new Array(count)
            };
            var subscriptions = new CompositeDisposable();
            for (var i = 0, len = this._sources.length; i < len; i++) {
                var source = this._sources[i];
                isPromise(source) && (source = observableFromPromise(source));
                subscriptions.add(source.subscribe(new ForkJoinObserver(o, state, i, this._cb, subscriptions)));
            }
            return subscriptions;
        };
        return ForkJoinObservable;
    }(ObservableBase));
    var ForkJoinObserver = (function (__super__) {
        inherits(ForkJoinObserver, __super__);
        function ForkJoinObserver(o, s, i, cb, subs) {
            this._o = o;
            this._s = s;
            this._i = i;
            this._cb = cb;
            this._subs = subs;
            __super__.call(this);
        }
        ForkJoinObserver.prototype.next = function (x) {
            if (!this._s.finished) {
                this._s.hasResults[this._i] = true;
                this._s.results[this._i] = x;
            }
        };
        ForkJoinObserver.prototype.error = function (e) {
            this._s.finished = true;
            this._o.onError(e);
            this._subs.dispose();
        };
        ForkJoinObserver.prototype.completed = function () {
            if (!this._s.finished) {
                if (!this._s.hasResults[this._i]) {
                    return this._o.onCompleted();
                }
                this._s.hasCompleted[this._i] = true;
                for (var i = 0; i < this._s.results.length; i++) {
                    if (!this._s.hasCompleted[i]) {
                        return;
                    }
                }
                this._s.finished = true;
                var res = tryCatch(this._cb).apply(null, this._s.results);
                if (res === errorObj) {
                    return this._o.onError(res.e);
                }
                this._o.onNext(res);
                this._o.onCompleted();
            }
        };
        return ForkJoinObserver;
    }(AbstractObserver));
    /**
    *  Runs all observable sequences in parallel and collect their last elements.
    *
    * @example
    *  1 - res = Rx.Observable.forkJoin([obs1, obs2]);
    *  1 - res = Rx.Observable.forkJoin(obs1, obs2, ...);
    * @returns {Observable} An observable sequence with an array collecting the last elements of all the input sequences.
    */
    Observable.forkJoin = function () {
        var len = arguments.length, args = new Array(len);
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
        }
        var resultSelector = isFunction(args[len - 1]) ? args.pop() : argumentsToArray;
        Array.isArray(args[0]) && (args = args[0]);
        return new ForkJoinObservable(args, resultSelector);
    };
    /**
    *  Runs two observable sequences in parallel and combines their last elemenets.
    * @param {Observable} second Second observable sequence.
    * @param {Function} resultSelector Result selector function to invoke with the last elements of both sequences.
    * @returns {Observable} An observable sequence with the result of calling the selector function with the last elements of both input sequences.
    */
    observableProto.forkJoin = function () {
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
        return Observable.forkJoin.apply(null, args);
    };
    /**
     * Comonadic bind operator.
     * @param {Function} selector A transform function to apply to each element.
     * @param {Object} scheduler Scheduler used to execute the operation. If not specified, defaults to the ImmediateScheduler.
     * @returns {Observable} An observable sequence which results from the comonadic bind operation.
     */
    observableProto.manySelect = observableProto.extend = function (selector, scheduler) {
        isScheduler(scheduler) || (scheduler = Rx.Scheduler.immediate);
        var source = this;
        return observableDefer(function () {
            var chain;
            return source
                .map(function (x) {
                var curr = new ChainObservable(x);
                chain && chain.onNext(x);
                chain = curr;
                return curr;
            })
                .tap(noop, function (e) { chain && chain.onError(e); }, function () { chain && chain.onCompleted(); })
                .observeOn(scheduler)
                .map(selector);
        }, source);
    };
    var ChainObservable = (function (__super__) {
        inherits(ChainObservable, __super__);
        function ChainObservable(head) {
            __super__.call(this);
            this.head = head;
            this.tail = new AsyncSubject();
        }
        addProperties(ChainObservable.prototype, Observer, {
            _subscribe: function (o) {
                var g = new CompositeDisposable();
                g.add(currentThreadScheduler.schedule(this, function (_, self) {
                    o.onNext(self.head);
                    g.add(self.tail.mergeAll().subscribe(o));
                }));
                return g;
            },
            onCompleted: function () {
                this.onNext(Observable.empty());
            },
            onError: function (e) {
                this.onNext(Observable['throw'](e));
            },
            onNext: function (v) {
                this.tail.onNext(v);
                this.tail.onCompleted();
            }
        });
        return ChainObservable;
    }(Observable));
    var SwitchFirstObservable = (function (__super__) {
        inherits(SwitchFirstObservable, __super__);
        function SwitchFirstObservable(source) {
            this.source = source;
            __super__.call(this);
        }
        SwitchFirstObservable.prototype.subscribeCore = function (o) {
            var m = new SingleAssignmentDisposable(), g = new CompositeDisposable(), state = {
                hasCurrent: false,
                isStopped: false,
                o: o,
                g: g
            };
            g.add(m);
            m.setDisposable(this.source.subscribe(new SwitchFirstObserver(state)));
            return g;
        };
        return SwitchFirstObservable;
    }(ObservableBase));
    var SwitchFirstObserver = (function (__super__) {
        inherits(SwitchFirstObserver, __super__);
        function SwitchFirstObserver(state) {
            this._s = state;
            __super__.call(this);
        }
        SwitchFirstObserver.prototype.next = function (x) {
            if (!this._s.hasCurrent) {
                this._s.hasCurrent = true;
                isPromise(x) && (x = observableFromPromise(x));
                var inner = new SingleAssignmentDisposable();
                this._s.g.add(inner);
                inner.setDisposable(x.subscribe(new InnerObserver(this._s, inner)));
            }
        };
        SwitchFirstObserver.prototype.error = function (e) {
            this._s.o.onError(e);
        };
        SwitchFirstObserver.prototype.completed = function () {
            this._s.isStopped = true;
            !this._s.hasCurrent && this._s.g.length === 1 && this._s.o.onCompleted();
        };
        inherits(InnerObserver, __super__);
        function InnerObserver(state, inner) {
            this._s = state;
            this._i = inner;
            __super__.call(this);
        }
        InnerObserver.prototype.next = function (x) { this._s.o.onNext(x); };
        InnerObserver.prototype.error = function (e) { this._s.o.onError(e); };
        InnerObserver.prototype.completed = function () {
            this._s.g.remove(this._i);
            this._s.hasCurrent = false;
            this._s.isStopped && this._s.g.length === 1 && this._s.o.onCompleted();
        };
        return SwitchFirstObserver;
    }(AbstractObserver));
    /**
     * Performs a exclusive waiting for the first to finish before subscribing to another observable.
     * Observables that come in between subscriptions will be dropped on the floor.
     * @returns {Observable} A exclusive observable with only the results that happen when subscribed.
     */
    observableProto.switchFirst = function () {
        return new SwitchFirstObservable(this);
    };
    observableProto.flatMapFirst = observableProto.exhaustMap = function (selector, resultSelector, thisArg) {
        return new FlatMapObservable(this, selector, resultSelector, thisArg).switchFirst();
    };
    observableProto.flatMapWithMaxConcurrent = observableProto.flatMapMaxConcurrent = function (limit, selector, resultSelector, thisArg) {
        return new FlatMapObservable(this, selector, resultSelector, thisArg).merge(limit);
    };
    return Rx;
}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccnguZXhwZXJpbWVudGFsLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXHJ4XFxkaXN0XFxyeC5leHBlcmltZW50YWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsNkdBQTZHO0FBRTdHLENBQUM7QUFBQSxDQUFDLFVBQVUsT0FBTztJQUNqQixJQUFJLFdBQVcsR0FBRztRQUNoQixVQUFVLEVBQUUsSUFBSTtRQUNoQixRQUFRLEVBQUUsSUFBSTtLQUNmLENBQUM7SUFFRixxQkFBcUIsS0FBSztRQUN4QixNQUFNLENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQzNELENBQUM7SUFFRCxJQUFJLFdBQVcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPLE9BQU8sQ0FBQyxJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQ2pHLElBQUksVUFBVSxHQUFHLENBQUMsV0FBVyxDQUFDLE9BQU8sTUFBTSxDQUFDLElBQUksTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDNUYsSUFBSSxVQUFVLEdBQUcsV0FBVyxDQUFDLFdBQVcsSUFBSSxVQUFVLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxJQUFJLE1BQU0sQ0FBQyxDQUFDO0lBQ2hHLElBQUksUUFBUSxHQUFHLFdBQVcsQ0FBQyxXQUFX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QkFBb0IsR0FBRyxVQUFTLEtBQUssRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLE9BQU87UUFDL0gsTUFBTSxDQUFDLElBQUksaUJBQWlCLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3ZGLENBQUMsQ0FBQztJQUVBLE1BQU0sQ0FBQyxFQUFFLENBQUM7QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQsIEFsbCByaWdodHMgcmVzZXJ2ZWQuIFNlZSBMaWNlbnNlLnR4dCBpbiB0aGUgcHJvamVjdCByb290IGZvciBsaWNlbnNlIGluZm9ybWF0aW9uLlxuXG47KGZ1bmN0aW9uIChmYWN0b3J5KSB7XG4gIHZhciBvYmplY3RUeXBlcyA9IHtcbiAgICAnZnVuY3Rpb24nOiB0cnVlLFxuICAgICdvYmplY3QnOiB0cnVlXG4gIH07XG5cbiAgZnVuY3Rpb24gY2hlY2tHbG9iYWwodmFsdWUpIHtcbiAgICByZXR1cm4gKHZhbHVlICYmIHZhbHVlLk9iamVjdCA9PT0gT2JqZWN0KSA/IHZhbHVlIDogbnVsbDtcbiAgfVxuXG4gIHZhciBmcmVlRXhwb3J0cyA9IChvYmplY3RUeXBlc1t0eXBlb2YgZXhwb3J0c10gJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSkgPyBleHBvcnRzIDogbnVsbDtcbiAgdmFyIGZyZWVNb2R1bGUgPSAob2JqZWN0VHlwZXNbdHlwZW9mIG1vZHVsZV0gJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUpID8gbW9kdWxlIDogbnVsbDtcbiAgdmFyIGZyZWVHbG9iYWwgPSBjaGVja0dsb2JhbChmcmVlRXhwb3J0cyAmJiBmcmVlTW9kdWxlICYmIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIGdsb2JhbCk7XG4gIHZhciBmcmVlU2VsZiA9IGNoZWNrR2xvYmFsKG9iamVjdFR5cGVzW3R5cGVvZiBzZWxmXSAmJiBzZWxmKTtcbiAgdmFyIGZyZWVXaW5kb3cgPSBjaGVja0dsb2JhbChvYmplY3RUeXBlc1t0eXBlb2Ygd2luZG93XSAmJiB3aW5kb3cpO1xuICB2YXIgbW9kdWxlRXhwb3J0cyA9IChmcmVlTW9kdWxlICYmIGZyZWVNb2R1bGUuZXhwb3J0cyA9PT0gZnJlZUV4cG9ydHMpID8gZnJlZUV4cG9ydHMgOiBudWxsO1xuICB2YXIgdGhpc0dsb2JhbCA9IGNoZWNrR2xvYmFsKG9iamVjdFR5cGVzW3R5cGVvZiB0aGlzXSAmJiB0aGlzKTtcbiAgdmFyIHJvb3QgPSBmcmVlR2xvYmFsIHx8ICgoZnJlZVdpbmRvdyAhPT0gKHRoaXNHbG9iYWwgJiYgdGhpc0dsb2JhbC53aW5kb3cpKSAmJiBmcmVlV2luZG93KSB8fCBmcmVlU2VsZiB8fCB0aGlzR2xvYmFsIHx8IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG5cbiAgLy8gQmVjYXVzZSBvZiBidWlsZCBvcHRpbWl6ZXJzXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoWycuL3J4J10sIGZ1bmN0aW9uIChSeCwgZXhwb3J0cykge1xuICAgICAgcmV0dXJuIGZhY3Rvcnkocm9vdCwgZXhwb3J0cywgUngpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZSAmJiBtb2R1bGUuZXhwb3J0cyA9PT0gZnJlZUV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnkocm9vdCwgbW9kdWxlLmV4cG9ydHMsIHJlcXVpcmUoJy4vcngnKSk7XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5SeCA9IGZhY3Rvcnkocm9vdCwge30sIHJvb3QuUngpO1xuICB9XG59LmNhbGwodGhpcywgZnVuY3Rpb24gKHJvb3QsIGV4cCwgUngsIHVuZGVmaW5lZCkge1xuXG4gIC8vIEFsaWFzZXNcbiAgdmFyIE9ic2VydmFibGUgPSBSeC5PYnNlcnZhYmxlLFxuICAgIG9ic2VydmFibGVQcm90byA9IE9ic2VydmFibGUucHJvdG90eXBlLFxuICAgIE9ic2VydmFibGVCYXNlID0gUnguT2JzZXJ2YWJsZUJhc2UsXG4gICAgQWJzdHJhY3RPYnNlcnZlciA9IFJ4LmludGVybmFscy5BYnN0cmFjdE9ic2VydmVyLFxuICAgIEZsYXRNYXBPYnNlcnZhYmxlID0gUnguRmxhdE1hcE9ic2VydmFibGUsXG4gICAgb2JzZXJ2YWJsZUNvbmNhdCA9IE9ic2VydmFibGUuY29uY2F0LFxuICAgIG9ic2VydmFibGVEZWZlciA9IE9ic2VydmFibGUuZGVmZXIsXG4gICAgb2JzZXJ2YWJsZUVtcHR5ID0gT2JzZXJ2YWJsZS5lbXB0eSxcbiAgICBkaXNwb3NhYmxlRW1wdHkgPSBSeC5EaXNwb3NhYmxlLmVtcHR5LFxuICAgIENvbXBvc2l0ZURpc3Bvc2FibGUgPSBSeC5Db21wb3NpdGVEaXNwb3NhYmxlLFxuICAgIFNlcmlhbERpc3Bvc2FibGUgPSBSeC5TZXJpYWxEaXNwb3NhYmxlLFxuICAgIFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlID0gUnguU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUsXG4gICAgRW51bWVyYWJsZSA9IFJ4LmludGVybmFscy5FbnVtZXJhYmxlLFxuICAgIGVudW1lcmFibGVPZiA9IEVudW1lcmFibGUub2YsXG4gICAgY3VycmVudFRocmVhZFNjaGVkdWxlciA9IFJ4LlNjaGVkdWxlci5jdXJyZW50VGhyZWFkLFxuICAgIEFzeW5jU3ViamVjdCA9IFJ4LkFzeW5jU3ViamVjdCxcbiAgICBPYnNlcnZlciA9IFJ4Lk9ic2VydmVyLFxuICAgIGluaGVyaXRzID0gUnguaW50ZXJuYWxzLmluaGVyaXRzLFxuICAgIGFkZFByb3BlcnRpZXMgPSBSeC5pbnRlcm5hbHMuYWRkUHJvcGVydGllcyxcbiAgICBoZWxwZXJzID0gUnguaGVscGVycyxcbiAgICBub29wID0gaGVscGVycy5ub29wLFxuICAgIGlzUHJvbWlzZSA9IGhlbHBlcnMuaXNQcm9taXNlLFxuICAgIGlzRnVuY3Rpb24gPSBoZWxwZXJzLmlzRnVuY3Rpb24sXG4gICAgaXNJdGVyYWJsZSA9IFJ4LmhlbHBlcnMuaXNJdGVyYWJsZSxcbiAgICBpc0FycmF5TGlrZSA9IFJ4LmhlbHBlcnMuaXNBcnJheUxpa2UsXG4gICAgaXNTY2hlZHVsZXIgPSBSeC5TY2hlZHVsZXIuaXNTY2hlZHVsZXIsXG4gICAgb2JzZXJ2YWJsZUZyb21Qcm9taXNlID0gT2JzZXJ2YWJsZS5mcm9tUHJvbWlzZTtcblxuICB2YXIgZXJyb3JPYmogPSB7ZToge319O1xuICBcbiAgZnVuY3Rpb24gdHJ5Q2F0Y2hlckdlbih0cnlDYXRjaFRhcmdldCkge1xuICAgIHJldHVybiBmdW5jdGlvbiB0cnlDYXRjaGVyKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHRyeUNhdGNoVGFyZ2V0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGVycm9yT2JqLmUgPSBlO1xuICAgICAgICByZXR1cm4gZXJyb3JPYmo7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHZhciB0cnlDYXRjaCA9IFJ4LmludGVybmFscy50cnlDYXRjaCA9IGZ1bmN0aW9uIHRyeUNhdGNoKGZuKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGZuKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdmbiBtdXN0IGJlIGEgZnVuY3Rpb24nKTsgfVxuICAgIHJldHVybiB0cnlDYXRjaGVyR2VuKGZuKTtcbiAgfTtcblxuICBmdW5jdGlvbiB0aHJvd2VyKGUpIHtcbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgLy8gU2hpbSBpbiBpdGVyYXRvciBzdXBwb3J0XG4gIHZhciAkaXRlcmF0b3IkID0gKHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgU3ltYm9sLml0ZXJhdG9yKSB8fFxuICAgICdfZXM2c2hpbV9pdGVyYXRvcl8nO1xuICAvLyBCdWcgZm9yIG1vemlsbGEgdmVyc2lvblxuICBpZiAocm9vdC5TZXQgJiYgdHlwZW9mIG5ldyByb290LlNldCgpWydAQGl0ZXJhdG9yJ10gPT09ICdmdW5jdGlvbicpIHtcbiAgICAkaXRlcmF0b3IkID0gJ0BAaXRlcmF0b3InO1xuICB9XG5cbiAgdmFyIGRvbmVFbnVtZXJhdG9yID0gUnguZG9uZUVudW1lcmF0b3IgPSB7IGRvbmU6IHRydWUsIHZhbHVlOiB1bmRlZmluZWQgfTtcblxuICB2YXIgaXNJdGVyYWJsZSA9IFJ4LmhlbHBlcnMuaXNJdGVyYWJsZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgcmV0dXJuIG8gJiYgb1skaXRlcmF0b3IkXSAhPT0gdW5kZWZpbmVkO1xuICB9O1xuXG4gIHZhciBpc0FycmF5TGlrZSA9IFJ4LmhlbHBlcnMuaXNBcnJheUxpa2UgPSBmdW5jdGlvbiAobykge1xuICAgIHJldHVybiBvICYmIG8ubGVuZ3RoICE9PSB1bmRlZmluZWQ7XG4gIH07XG5cbiAgUnguaGVscGVycy5pdGVyYXRvciA9ICRpdGVyYXRvciQ7XG5cbiAgdmFyIFdoaWxlRW51bWVyYWJsZSA9IChmdW5jdGlvbihfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhXaGlsZUVudW1lcmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gV2hpbGVFbnVtZXJhYmxlKGMsIHMpIHtcbiAgICAgIHRoaXMuYyA9IGM7XG4gICAgICB0aGlzLnMgPSBzO1xuICAgIH1cbiAgICBXaGlsZUVudW1lcmFibGUucHJvdG90eXBlWyRpdGVyYXRvciRdID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBzZWxmLmMoKSA/XG4gICAgICAgICAgIHsgZG9uZTogZmFsc2UsIHZhbHVlOiBzZWxmLnMgfSA6XG4gICAgICAgICAgIHsgZG9uZTogdHJ1ZSwgdmFsdWU6IHZvaWQgMCB9O1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH07XG4gICAgcmV0dXJuIFdoaWxlRW51bWVyYWJsZTtcbiAgfShFbnVtZXJhYmxlKSk7XG4gIFxuICBmdW5jdGlvbiBlbnVtZXJhYmxlV2hpbGUoY29uZGl0aW9uLCBzb3VyY2UpIHtcbiAgICByZXR1cm4gbmV3IFdoaWxlRW51bWVyYWJsZShjb25kaXRpb24sIHNvdXJjZSk7XG4gIH0gIFxuXG4gICAvKipcbiAgICogIFJldHVybnMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGlzIHRoZSByZXN1bHQgb2YgaW52b2tpbmcgdGhlIHNlbGVjdG9yIG9uIHRoZSBzb3VyY2Ugc2VxdWVuY2UsIHdpdGhvdXQgc2hhcmluZyBzdWJzY3JpcHRpb25zLlxuICAgKiAgVGhpcyBvcGVyYXRvciBhbGxvd3MgZm9yIGEgZmx1ZW50IHN0eWxlIG9mIHdyaXRpbmcgcXVlcmllcyB0aGF0IHVzZSB0aGUgc2FtZSBzZXF1ZW5jZSBtdWx0aXBsZSB0aW1lcy5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gc2VsZWN0b3IgU2VsZWN0b3IgZnVuY3Rpb24gd2hpY2ggY2FuIHVzZSB0aGUgc291cmNlIHNlcXVlbmNlIGFzIG1hbnkgdGltZXMgYXMgbmVlZGVkLCB3aXRob3V0IHNoYXJpbmcgc3Vic2NyaXB0aW9ucyB0byB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGNvbnRhaW5zIHRoZSBlbGVtZW50cyBvZiBhIHNlcXVlbmNlIHByb2R1Y2VkIGJ5IG11bHRpY2FzdGluZyB0aGUgc291cmNlIHNlcXVlbmNlIHdpdGhpbiBhIHNlbGVjdG9yIGZ1bmN0aW9uLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmxldEJpbmQgPSBvYnNlcnZhYmxlUHJvdG9bJ2xldCddID0gZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuYyh0aGlzKTtcbiAgfTtcblxuICAgLyoqXG4gICAqICBEZXRlcm1pbmVzIHdoZXRoZXIgYW4gb2JzZXJ2YWJsZSBjb2xsZWN0aW9uIGNvbnRhaW5zIHZhbHVlcy4gXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqICAxIC0gcmVzID0gUnguT2JzZXJ2YWJsZS5pZihjb25kaXRpb24sIG9iczEpO1xuICAgKiAgMiAtIHJlcyA9IFJ4Lk9ic2VydmFibGUuaWYoY29uZGl0aW9uLCBvYnMxLCBvYnMyKTtcbiAgICogIDMgLSByZXMgPSBSeC5PYnNlcnZhYmxlLmlmKGNvbmRpdGlvbiwgb2JzMSwgc2NoZWR1bGVyKTtcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY29uZGl0aW9uIFRoZSBjb25kaXRpb24gd2hpY2ggZGV0ZXJtaW5lcyBpZiB0aGUgdGhlblNvdXJjZSBvciBlbHNlU291cmNlIHdpbGwgYmUgcnVuLlxuICAgKiBAcGFyYW0ge09ic2VydmFibGV9IHRoZW5Tb3VyY2UgVGhlIG9ic2VydmFibGUgc2VxdWVuY2Ugb3IgUHJvbWlzZSB0aGF0IHdpbGwgYmUgcnVuIGlmIHRoZSBjb25kaXRpb24gZnVuY3Rpb24gcmV0dXJucyB0cnVlLlxuICAgKiBAcGFyYW0ge09ic2VydmFibGV9IFtlbHNlU291cmNlXSBUaGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSBvciBQcm9taXNlIHRoYXQgd2lsbCBiZSBydW4gaWYgdGhlIGNvbmRpdGlvbiBmdW5jdGlvbiByZXR1cm5zIGZhbHNlLiBJZiB0aGlzIGlzIG5vdCBwcm92aWRlZCwgaXQgZGVmYXVsdHMgdG8gUnguT2JzZXJ2YWJlLkVtcHR5IHdpdGggdGhlIHNwZWNpZmllZCBzY2hlZHVsZXIuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdoaWNoIGlzIGVpdGhlciB0aGUgdGhlblNvdXJjZSBvciBlbHNlU291cmNlLlxuICAgKi9cbiAgT2JzZXJ2YWJsZVsnaWYnXSA9IGZ1bmN0aW9uIChjb25kaXRpb24sIHRoZW5Tb3VyY2UsIGVsc2VTb3VyY2VPclNjaGVkdWxlcikge1xuICAgIHJldHVybiBvYnNlcnZhYmxlRGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgZWxzZVNvdXJjZU9yU2NoZWR1bGVyIHx8IChlbHNlU291cmNlT3JTY2hlZHVsZXIgPSBvYnNlcnZhYmxlRW1wdHkoKSk7XG5cbiAgICAgIGlzUHJvbWlzZSh0aGVuU291cmNlKSAmJiAodGhlblNvdXJjZSA9IG9ic2VydmFibGVGcm9tUHJvbWlzZSh0aGVuU291cmNlKSk7XG4gICAgICBpc1Byb21pc2UoZWxzZVNvdXJjZU9yU2NoZWR1bGVyKSAmJiAoZWxzZVNvdXJjZU9yU2NoZWR1bGVyID0gb2JzZXJ2YWJsZUZyb21Qcm9taXNlKGVsc2VTb3VyY2VPclNjaGVkdWxlcikpO1xuXG4gICAgICAvLyBBc3N1bWUgYSBzY2hlZHVsZXIgZm9yIGVtcHR5IG9ubHlcbiAgICAgIHR5cGVvZiBlbHNlU291cmNlT3JTY2hlZHVsZXIubm93ID09PSAnZnVuY3Rpb24nICYmIChlbHNlU291cmNlT3JTY2hlZHVsZXIgPSBvYnNlcnZhYmxlRW1wdHkoZWxzZVNvdXJjZU9yU2NoZWR1bGVyKSk7XG4gICAgICByZXR1cm4gY29uZGl0aW9uKCkgPyB0aGVuU291cmNlIDogZWxzZVNvdXJjZU9yU2NoZWR1bGVyO1xuICAgIH0pO1xuICB9O1xuXG4gICAvKipcbiAgICogIENvbmNhdGVuYXRlcyB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZXMgb2J0YWluZWQgYnkgcnVubmluZyB0aGUgc3BlY2lmaWVkIHJlc3VsdCBzZWxlY3RvciBmb3IgZWFjaCBlbGVtZW50IGluIHNvdXJjZS5cbiAgICogVGhlcmUgaXMgYW4gYWxpYXMgZm9yIHRoaXMgbWV0aG9kIGNhbGxlZCAnZm9ySW4nIGZvciBicm93c2VycyA8SUU5XG4gICAqIEBwYXJhbSB7QXJyYXl9IHNvdXJjZXMgQW4gYXJyYXkgb2YgdmFsdWVzIHRvIHR1cm4gaW50byBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXN1bHRTZWxlY3RvciBBIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiB0aGUgc291cmNlcyBhcnJheSB0byB0dXJuIGl0IGludG8gYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgZnJvbSB0aGUgY29uY2F0ZW5hdGVkIG9ic2VydmFibGUgc2VxdWVuY2VzLlxuICAgKi9cbiAgT2JzZXJ2YWJsZVsnZm9yJ10gPSBPYnNlcnZhYmxlLmZvckluID0gZnVuY3Rpb24gKHNvdXJjZXMsIHJlc3VsdFNlbGVjdG9yLCB0aGlzQXJnKSB7XG4gICAgcmV0dXJuIGVudW1lcmFibGVPZihzb3VyY2VzLCByZXN1bHRTZWxlY3RvciwgdGhpc0FyZykuY29uY2F0KCk7XG4gIH07XG5cbiAgIC8qKlxuICAgKiAgUmVwZWF0cyBzb3VyY2UgYXMgbG9uZyBhcyBjb25kaXRpb24gaG9sZHMgZW11bGF0aW5nIGEgd2hpbGUgbG9vcC5cbiAgICogVGhlcmUgaXMgYW4gYWxpYXMgZm9yIHRoaXMgbWV0aG9kIGNhbGxlZCAnd2hpbGVEbycgZm9yIGJyb3dzZXJzIDxJRTlcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY29uZGl0aW9uIFRoZSBjb25kaXRpb24gd2hpY2ggZGV0ZXJtaW5lcyBpZiB0aGUgc291cmNlIHdpbGwgYmUgcmVwZWF0ZWQuXG4gICAqIEBwYXJhbSB7T2JzZXJ2YWJsZX0gc291cmNlIFRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgd2lsbCBiZSBydW4gaWYgdGhlIGNvbmRpdGlvbiBmdW5jdGlvbiByZXR1cm5zIHRydWUuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdoaWNoIGlzIHJlcGVhdGVkIGFzIGxvbmcgYXMgdGhlIGNvbmRpdGlvbiBob2xkcy5cbiAgICovXG4gIHZhciBvYnNlcnZhYmxlV2hpbGVEbyA9IE9ic2VydmFibGVbJ3doaWxlJ10gPSBPYnNlcnZhYmxlLndoaWxlRG8gPSBmdW5jdGlvbiAoY29uZGl0aW9uLCBzb3VyY2UpIHtcbiAgICBpc1Byb21pc2Uoc291cmNlKSAmJiAoc291cmNlID0gb2JzZXJ2YWJsZUZyb21Qcm9taXNlKHNvdXJjZSkpO1xuICAgIHJldHVybiBlbnVtZXJhYmxlV2hpbGUoY29uZGl0aW9uLCBzb3VyY2UpLmNvbmNhdCgpO1xuICB9O1xuXG4gICAvKipcbiAgICogIFJlcGVhdHMgc291cmNlIGFzIGxvbmcgYXMgY29uZGl0aW9uIGhvbGRzIGVtdWxhdGluZyBhIGRvIHdoaWxlIGxvb3AuXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbmRpdGlvbiBUaGUgY29uZGl0aW9uIHdoaWNoIGRldGVybWluZXMgaWYgdGhlIHNvdXJjZSB3aWxsIGJlIHJlcGVhdGVkLlxuICAgKiBAcGFyYW0ge09ic2VydmFibGV9IHNvdXJjZSBUaGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IHdpbGwgYmUgcnVuIGlmIHRoZSBjb25kaXRpb24gZnVuY3Rpb24gcmV0dXJucyB0cnVlLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB3aGljaCBpcyByZXBlYXRlZCBhcyBsb25nIGFzIHRoZSBjb25kaXRpb24gaG9sZHMuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uZG9XaGlsZSA9IGZ1bmN0aW9uIChjb25kaXRpb24pIHtcbiAgICByZXR1cm4gb2JzZXJ2YWJsZUNvbmNhdChbdGhpcywgb2JzZXJ2YWJsZVdoaWxlRG8oY29uZGl0aW9uLCB0aGlzKV0pO1xuICB9O1xuXG4gICAvKipcbiAgICogIFVzZXMgc2VsZWN0b3IgdG8gZGV0ZXJtaW5lIHdoaWNoIHNvdXJjZSBpbiBzb3VyY2VzIHRvIHVzZS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gc2VsZWN0b3IgVGhlIGZ1bmN0aW9uIHdoaWNoIGV4dHJhY3RzIHRoZSB2YWx1ZSBmb3IgdG8gdGVzdCBpbiBhIGNhc2Ugc3RhdGVtZW50LlxuICAgKiBAcGFyYW0ge0FycmF5fSBzb3VyY2VzIEEgb2JqZWN0IHdoaWNoIGhhcyBrZXlzIHdoaWNoIGNvcnJlc3BvbmQgdG8gdGhlIGNhc2Ugc3RhdGVtZW50IGxhYmVscy5cbiAgICogQHBhcmFtIHtPYnNlcnZhYmxlfSBbZWxzZVNvdXJjZV0gVGhlIG9ic2VydmFibGUgc2VxdWVuY2Ugb3IgUHJvbWlzZSB0aGF0IHdpbGwgYmUgcnVuIGlmIHRoZSBzb3VyY2VzIGFyZSBub3QgbWF0Y2hlZC4gSWYgdGhpcyBpcyBub3QgcHJvdmlkZWQsIGl0IGRlZmF1bHRzIHRvIFJ4Lk9ic2VydmFiZS5lbXB0eSB3aXRoIHRoZSBzcGVjaWZpZWQgc2NoZWR1bGVyLlxuICAgKlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB3aGljaCBpcyBkZXRlcm1pbmVkIGJ5IGEgY2FzZSBzdGF0ZW1lbnQuXG4gICAqL1xuICBPYnNlcnZhYmxlWydjYXNlJ10gPSBmdW5jdGlvbiAoc2VsZWN0b3IsIHNvdXJjZXMsIGRlZmF1bHRTb3VyY2VPclNjaGVkdWxlcikge1xuICAgIHJldHVybiBvYnNlcnZhYmxlRGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgaXNQcm9taXNlKGRlZmF1bHRTb3VyY2VPclNjaGVkdWxlcikgJiYgKGRlZmF1bHRTb3VyY2VPclNjaGVkdWxlciA9IG9ic2VydmFibGVGcm9tUHJvbWlzZShkZWZhdWx0U291cmNlT3JTY2hlZHVsZXIpKTtcbiAgICAgIGRlZmF1bHRTb3VyY2VPclNjaGVkdWxlciB8fCAoZGVmYXVsdFNvdXJjZU9yU2NoZWR1bGVyID0gb2JzZXJ2YWJsZUVtcHR5KCkpO1xuXG4gICAgICBpc1NjaGVkdWxlcihkZWZhdWx0U291cmNlT3JTY2hlZHVsZXIpICYmIChkZWZhdWx0U291cmNlT3JTY2hlZHVsZXIgPSBvYnNlcnZhYmxlRW1wdHkoZGVmYXVsdFNvdXJjZU9yU2NoZWR1bGVyKSk7XG5cbiAgICAgIHZhciByZXN1bHQgPSBzb3VyY2VzW3NlbGVjdG9yKCldO1xuICAgICAgaXNQcm9taXNlKHJlc3VsdCkgJiYgKHJlc3VsdCA9IG9ic2VydmFibGVGcm9tUHJvbWlzZShyZXN1bHQpKTtcblxuICAgICAgcmV0dXJuIHJlc3VsdCB8fCBkZWZhdWx0U291cmNlT3JTY2hlZHVsZXI7XG4gICAgfSk7XG4gIH07XG5cbiAgdmFyIEV4cGFuZE9ic2VydmFibGUgPSAoZnVuY3Rpb24oX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoRXhwYW5kT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBFeHBhbmRPYnNlcnZhYmxlKHNvdXJjZSwgZm4sIHNjaGVkdWxlcikge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9mbiA9IGZuO1xuICAgICAgdGhpcy5fc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NoZWR1bGVSZWN1cnNpdmUoYXJncywgcmVjdXJzZSkge1xuICAgICAgdmFyIHN0YXRlID0gYXJnc1swXSwgc2VsZiA9IGFyZ3NbMV07XG4gICAgICB2YXIgd29yaztcbiAgICAgIGlmIChzdGF0ZS5xLmxlbmd0aCA+IDApIHtcbiAgICAgICAgd29yayA9IHN0YXRlLnEuc2hpZnQoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLmlzQWNxdWlyZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIG0xID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG4gICAgICBzdGF0ZS5kLmFkZChtMSk7XG4gICAgICBtMS5zZXREaXNwb3NhYmxlKHdvcmsuc3Vic2NyaWJlKG5ldyBFeHBhbmRPYnNlcnZlcihzdGF0ZSwgc2VsZiwgbTEpKSk7XG4gICAgICByZWN1cnNlKFtzdGF0ZSwgc2VsZl0pO1xuICAgIH1cblxuICAgIEV4cGFuZE9ic2VydmFibGUucHJvdG90eXBlLl9lbnN1cmVBY3RpdmUgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgIHZhciBpc093bmVyID0gZmFsc2U7XG4gICAgICBpZiAoc3RhdGUucS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGlzT3duZXIgPSAhc3RhdGUuaXNBY3F1aXJlZDtcbiAgICAgICAgc3RhdGUuaXNBY3F1aXJlZCA9IHRydWU7XG4gICAgICB9XG4gICAgICBpc093bmVyICYmIHN0YXRlLm0uc2V0RGlzcG9zYWJsZSh0aGlzLl9zY2hlZHVsZXIuc2NoZWR1bGVSZWN1cnNpdmUoW3N0YXRlLCB0aGlzXSwgc2NoZWR1bGVSZWN1cnNpdmUpKTtcbiAgICB9O1xuXG4gICAgRXhwYW5kT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgbSA9IG5ldyBTZXJpYWxEaXNwb3NhYmxlKCksXG4gICAgICAgIGQgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZShtKSxcbiAgICAgICAgc3RhdGUgPSB7XG4gICAgICAgICAgcTogW10sXG4gICAgICAgICAgbTogbSxcbiAgICAgICAgICBkOiBkLFxuICAgICAgICAgIGFjdGl2ZUNvdW50OiAwLFxuICAgICAgICAgIGlzQWNxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIG86IG9cbiAgICAgICAgfTtcblxuICAgICAgc3RhdGUucS5wdXNoKHRoaXMuc291cmNlKTtcbiAgICAgIHN0YXRlLmFjdGl2ZUNvdW50Kys7XG4gICAgICB0aGlzLl9lbnN1cmVBY3RpdmUoc3RhdGUpO1xuICAgICAgcmV0dXJuIGQ7XG4gICAgfTtcblxuICAgIHJldHVybiBFeHBhbmRPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIEV4cGFuZE9ic2VydmVyID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEV4cGFuZE9ic2VydmVyLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIEV4cGFuZE9ic2VydmVyKHN0YXRlLCBwYXJlbnQsIG0xKSB7XG4gICAgICB0aGlzLl9zID0gc3RhdGU7XG4gICAgICB0aGlzLl9wID0gcGFyZW50O1xuICAgICAgdGhpcy5fbTEgPSBtMTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIEV4cGFuZE9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgIHRoaXMuX3Muby5vbk5leHQoeCk7XG4gICAgICB2YXIgcmVzdWx0ID0gdHJ5Q2F0Y2godGhpcy5fcC5fZm4pKHgpO1xuICAgICAgaWYgKHJlc3VsdCA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHRoaXMuX3Muby5vbkVycm9yKHJlc3VsdC5lKTsgfVxuICAgICAgdGhpcy5fcy5xLnB1c2gocmVzdWx0KTtcbiAgICAgIHRoaXMuX3MuYWN0aXZlQ291bnQrKztcbiAgICAgIHRoaXMuX3AuX2Vuc3VyZUFjdGl2ZSh0aGlzLl9zKTtcbiAgICB9O1xuXG4gICAgRXhwYW5kT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuX3Muby5vbkVycm9yKGUpO1xuICAgIH07XG5cbiAgICBFeHBhbmRPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5fcy5kLnJlbW92ZSh0aGlzLl9tMSk7XG4gICAgICB0aGlzLl9zLmFjdGl2ZUNvdW50LS07XG4gICAgICB0aGlzLl9zLmFjdGl2ZUNvdW50ID09PSAwICYmIHRoaXMuX3Muby5vbkNvbXBsZXRlZCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gRXhwYW5kT2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gICAvKipcbiAgICogIEV4cGFuZHMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBieSByZWN1cnNpdmVseSBpbnZva2luZyBzZWxlY3Rvci5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gc2VsZWN0b3IgU2VsZWN0b3IgZnVuY3Rpb24gdG8gaW52b2tlIGZvciBlYWNoIHByb2R1Y2VkIGVsZW1lbnQsIHJlc3VsdGluZyBpbiBhbm90aGVyIHNlcXVlbmNlIHRvIHdoaWNoIHRoZSBzZWxlY3RvciB3aWxsIGJlIGludm9rZWQgcmVjdXJzaXZlbHkgYWdhaW4uXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSBTY2hlZHVsZXIgb24gd2hpY2ggdG8gcGVyZm9ybSB0aGUgZXhwYW5zaW9uLiBJZiBub3QgcHJvdmlkZWQsIHRoaXMgZGVmYXVsdHMgdG8gdGhlIGN1cnJlbnQgdGhyZWFkIHNjaGVkdWxlci5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgY29udGFpbmluZyBhbGwgdGhlIGVsZW1lbnRzIHByb2R1Y2VkIGJ5IHRoZSByZWN1cnNpdmUgZXhwYW5zaW9uLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmV4cGFuZCA9IGZ1bmN0aW9uIChzZWxlY3Rvciwgc2NoZWR1bGVyKSB7XG4gICAgaXNTY2hlZHVsZXIoc2NoZWR1bGVyKSB8fCAoc2NoZWR1bGVyID0gY3VycmVudFRocmVhZFNjaGVkdWxlcik7XG4gICAgcmV0dXJuIG5ldyBFeHBhbmRPYnNlcnZhYmxlKHRoaXMsIHNlbGVjdG9yLCBzY2hlZHVsZXIpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIGFyZ3VtZW50c1RvQXJyYXkoKSB7XG4gICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBuZXcgQXJyYXkobGVuKTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHsgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTsgfVxuICAgIHJldHVybiBhcmdzO1xuICB9XG5cbiAgdmFyIEZvcmtKb2luT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoRm9ya0pvaW5PYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIEZvcmtKb2luT2JzZXJ2YWJsZShzb3VyY2VzLCBjYikge1xuICAgICAgdGhpcy5fc291cmNlcyA9IHNvdXJjZXM7XG4gICAgICB0aGlzLl9jYiA9IGNiO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgRm9ya0pvaW5PYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIGlmICh0aGlzLl9zb3VyY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjb3VudCA9IHRoaXMuX3NvdXJjZXMubGVuZ3RoO1xuICAgICAgdmFyIHN0YXRlID0ge1xuICAgICAgICBmaW5pc2hlZDogZmFsc2UsXG4gICAgICAgIGhhc1Jlc3VsdHM6IG5ldyBBcnJheShjb3VudCksXG4gICAgICAgIGhhc0NvbXBsZXRlZDogbmV3IEFycmF5KGNvdW50KSxcbiAgICAgICAgcmVzdWx0czogbmV3IEFycmF5KGNvdW50KVxuICAgICAgfTtcblxuICAgICAgdmFyIHN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IHRoaXMuX3NvdXJjZXNbaV07XG4gICAgICAgIGlzUHJvbWlzZShzb3VyY2UpICYmIChzb3VyY2UgPSBvYnNlcnZhYmxlRnJvbVByb21pc2Uoc291cmNlKSk7XG4gICAgICAgIHN1YnNjcmlwdGlvbnMuYWRkKHNvdXJjZS5zdWJzY3JpYmUobmV3IEZvcmtKb2luT2JzZXJ2ZXIobywgc3RhdGUsIGksIHRoaXMuX2NiLCBzdWJzY3JpcHRpb25zKSkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc3Vic2NyaXB0aW9ucztcbiAgICB9O1xuXG4gICAgcmV0dXJuIEZvcmtKb2luT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIHZhciBGb3JrSm9pbk9ic2VydmVyID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEZvcmtKb2luT2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gRm9ya0pvaW5PYnNlcnZlcihvLCBzLCBpLCBjYiwgc3Vicykge1xuICAgICAgdGhpcy5fbyA9IG87XG4gICAgICB0aGlzLl9zID0gcztcbiAgICAgIHRoaXMuX2kgPSBpO1xuICAgICAgdGhpcy5fY2IgPSBjYjtcbiAgICAgIHRoaXMuX3N1YnMgPSBzdWJzO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgRm9ya0pvaW5PYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICBpZiAoIXRoaXMuX3MuZmluaXNoZWQpIHtcbiAgICAgICAgdGhpcy5fcy5oYXNSZXN1bHRzW3RoaXMuX2ldID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fcy5yZXN1bHRzW3RoaXMuX2ldID0geDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgRm9ya0pvaW5PYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgdGhpcy5fcy5maW5pc2hlZCA9IHRydWU7XG4gICAgICB0aGlzLl9vLm9uRXJyb3IoZSk7XG4gICAgICB0aGlzLl9zdWJzLmRpc3Bvc2UoKTtcbiAgICB9O1xuXG4gICAgRm9ya0pvaW5PYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCF0aGlzLl9zLmZpbmlzaGVkKSB7XG4gICAgICAgIGlmICghdGhpcy5fcy5oYXNSZXN1bHRzW3RoaXMuX2ldKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX28ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zLmhhc0NvbXBsZXRlZFt0aGlzLl9pXSA9IHRydWU7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fcy5yZXN1bHRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKCF0aGlzLl9zLmhhc0NvbXBsZXRlZFtpXSkgeyByZXR1cm47IH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zLmZpbmlzaGVkID0gdHJ1ZTtcblxuICAgICAgICB2YXIgcmVzID0gdHJ5Q2F0Y2godGhpcy5fY2IpLmFwcGx5KG51bGwsIHRoaXMuX3MucmVzdWx0cyk7XG4gICAgICAgIGlmIChyZXMgPT09IGVycm9yT2JqKSB7IHJldHVybiB0aGlzLl9vLm9uRXJyb3IocmVzLmUpOyB9XG5cbiAgICAgICAgdGhpcy5fby5vbk5leHQocmVzKTtcbiAgICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gRm9ya0pvaW5PYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgIC8qKlxuICAgKiAgUnVucyBhbGwgb2JzZXJ2YWJsZSBzZXF1ZW5jZXMgaW4gcGFyYWxsZWwgYW5kIGNvbGxlY3QgdGhlaXIgbGFzdCBlbGVtZW50cy5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogIDEgLSByZXMgPSBSeC5PYnNlcnZhYmxlLmZvcmtKb2luKFtvYnMxLCBvYnMyXSk7XG4gICAqICAxIC0gcmVzID0gUnguT2JzZXJ2YWJsZS5mb3JrSm9pbihvYnMxLCBvYnMyLCAuLi4pO1xuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB3aXRoIGFuIGFycmF5IGNvbGxlY3RpbmcgdGhlIGxhc3QgZWxlbWVudHMgb2YgYWxsIHRoZSBpbnB1dCBzZXF1ZW5jZXMuXG4gICAqL1xuICBPYnNlcnZhYmxlLmZvcmtKb2luID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gbmV3IEFycmF5KGxlbik7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7IGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07IH1cbiAgICB2YXIgcmVzdWx0U2VsZWN0b3IgPSBpc0Z1bmN0aW9uKGFyZ3NbbGVuIC0gMV0pID8gYXJncy5wb3AoKSA6IGFyZ3VtZW50c1RvQXJyYXk7XG4gICAgQXJyYXkuaXNBcnJheShhcmdzWzBdKSAmJiAoYXJncyA9IGFyZ3NbMF0pO1xuICAgIHJldHVybiBuZXcgRm9ya0pvaW5PYnNlcnZhYmxlKGFyZ3MsIHJlc3VsdFNlbGVjdG9yKTtcbiAgfTtcblxuICAgLyoqXG4gICAqICBSdW5zIHR3byBvYnNlcnZhYmxlIHNlcXVlbmNlcyBpbiBwYXJhbGxlbCBhbmQgY29tYmluZXMgdGhlaXIgbGFzdCBlbGVtZW5ldHMuXG4gICAqIEBwYXJhbSB7T2JzZXJ2YWJsZX0gc2Vjb25kIFNlY29uZCBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXN1bHRTZWxlY3RvciBSZXN1bHQgc2VsZWN0b3IgZnVuY3Rpb24gdG8gaW52b2tlIHdpdGggdGhlIGxhc3QgZWxlbWVudHMgb2YgYm90aCBzZXF1ZW5jZXMuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdpdGggdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBzZWxlY3RvciBmdW5jdGlvbiB3aXRoIHRoZSBsYXN0IGVsZW1lbnRzIG9mIGJvdGggaW5wdXQgc2VxdWVuY2VzLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmZvcmtKb2luID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gbmV3IEFycmF5KGxlbik7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7IGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07IH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheShhcmdzWzBdKSkge1xuICAgICAgYXJnc1swXS51bnNoaWZ0KHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcmdzLnVuc2hpZnQodGhpcyk7XG4gICAgfVxuICAgIHJldHVybiBPYnNlcnZhYmxlLmZvcmtKb2luLmFwcGx5KG51bGwsIGFyZ3MpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb21vbmFkaWMgYmluZCBvcGVyYXRvci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gc2VsZWN0b3IgQSB0cmFuc2Zvcm0gZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCBlbGVtZW50LlxuICAgKiBAcGFyYW0ge09iamVjdH0gc2NoZWR1bGVyIFNjaGVkdWxlciB1c2VkIHRvIGV4ZWN1dGUgdGhlIG9wZXJhdGlvbi4gSWYgbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gdGhlIEltbWVkaWF0ZVNjaGVkdWxlci5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2Ugd2hpY2ggcmVzdWx0cyBmcm9tIHRoZSBjb21vbmFkaWMgYmluZCBvcGVyYXRpb24uXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8ubWFueVNlbGVjdCA9IG9ic2VydmFibGVQcm90by5leHRlbmQgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIHNjaGVkdWxlcikge1xuICAgIGlzU2NoZWR1bGVyKHNjaGVkdWxlcikgfHwgKHNjaGVkdWxlciA9IFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpO1xuICAgIHZhciBzb3VyY2UgPSB0aGlzO1xuICAgIHJldHVybiBvYnNlcnZhYmxlRGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNoYWluO1xuXG4gICAgICByZXR1cm4gc291cmNlXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICB2YXIgY3VyciA9IG5ldyBDaGFpbk9ic2VydmFibGUoeCk7XG5cbiAgICAgICAgICBjaGFpbiAmJiBjaGFpbi5vbk5leHQoeCk7XG4gICAgICAgICAgY2hhaW4gPSBjdXJyO1xuXG4gICAgICAgICAgcmV0dXJuIGN1cnI7XG4gICAgICAgIH0pXG4gICAgICAgIC50YXAoXG4gICAgICAgICAgbm9vcCxcbiAgICAgICAgICBmdW5jdGlvbiAoZSkgeyBjaGFpbiAmJiBjaGFpbi5vbkVycm9yKGUpOyB9LFxuICAgICAgICAgIGZ1bmN0aW9uICgpIHsgY2hhaW4gJiYgY2hhaW4ub25Db21wbGV0ZWQoKTsgfVxuICAgICAgICApXG4gICAgICAgIC5vYnNlcnZlT24oc2NoZWR1bGVyKVxuICAgICAgICAubWFwKHNlbGVjdG9yKTtcbiAgICB9LCBzb3VyY2UpO1xuICB9O1xuXG4gIHZhciBDaGFpbk9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKENoYWluT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBDaGFpbk9ic2VydmFibGUoaGVhZCkge1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgICB0aGlzLmhlYWQgPSBoZWFkO1xuICAgICAgdGhpcy50YWlsID0gbmV3IEFzeW5jU3ViamVjdCgpO1xuICAgIH1cblxuICAgIGFkZFByb3BlcnRpZXMoQ2hhaW5PYnNlcnZhYmxlLnByb3RvdHlwZSwgT2JzZXJ2ZXIsIHtcbiAgICAgIF9zdWJzY3JpYmU6IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHZhciBnID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICAgICAgZy5hZGQoY3VycmVudFRocmVhZFNjaGVkdWxlci5zY2hlZHVsZSh0aGlzLCBmdW5jdGlvbiAoXywgc2VsZikge1xuICAgICAgICAgIG8ub25OZXh0KHNlbGYuaGVhZCk7XG4gICAgICAgICAgZy5hZGQoc2VsZi50YWlsLm1lcmdlQWxsKCkuc3Vic2NyaWJlKG8pKTtcbiAgICAgICAgfSkpO1xuXG4gICAgICAgIHJldHVybiBnO1xuICAgICAgfSxcbiAgICAgIG9uQ29tcGxldGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMub25OZXh0KE9ic2VydmFibGUuZW1wdHkoKSk7XG4gICAgICB9LFxuICAgICAgb25FcnJvcjogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgdGhpcy5vbk5leHQoT2JzZXJ2YWJsZVsndGhyb3cnXShlKSk7XG4gICAgICB9LFxuICAgICAgb25OZXh0OiBmdW5jdGlvbiAodikge1xuICAgICAgICB0aGlzLnRhaWwub25OZXh0KHYpO1xuICAgICAgICB0aGlzLnRhaWwub25Db21wbGV0ZWQoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBDaGFpbk9ic2VydmFibGU7XG5cbiAgfShPYnNlcnZhYmxlKSk7XG5cbiAgdmFyIFN3aXRjaEZpcnN0T2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoU3dpdGNoRmlyc3RPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFN3aXRjaEZpcnN0T2JzZXJ2YWJsZShzb3VyY2UpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgU3dpdGNoRmlyc3RPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciBtID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCksXG4gICAgICAgIGcgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpLFxuICAgICAgICBzdGF0ZSA9IHtcbiAgICAgICAgICBoYXNDdXJyZW50OiBmYWxzZSxcbiAgICAgICAgICBpc1N0b3BwZWQ6IGZhbHNlLFxuICAgICAgICAgIG86IG8sXG4gICAgICAgICAgZzogZ1xuICAgICAgICB9O1xuXG4gICAgICBnLmFkZChtKTtcbiAgICAgIG0uc2V0RGlzcG9zYWJsZSh0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IFN3aXRjaEZpcnN0T2JzZXJ2ZXIoc3RhdGUpKSk7XG4gICAgICByZXR1cm4gZztcbiAgICB9O1xuXG4gICAgcmV0dXJuIFN3aXRjaEZpcnN0T2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIHZhciBTd2l0Y2hGaXJzdE9ic2VydmVyID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFN3aXRjaEZpcnN0T2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gU3dpdGNoRmlyc3RPYnNlcnZlcihzdGF0ZSkge1xuICAgICAgdGhpcy5fcyA9IHN0YXRlO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgU3dpdGNoRmlyc3RPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICBpZiAoIXRoaXMuX3MuaGFzQ3VycmVudCkge1xuICAgICAgICB0aGlzLl9zLmhhc0N1cnJlbnQgPSB0cnVlO1xuICAgICAgICBpc1Byb21pc2UoeCkgJiYgKHggPSBvYnNlcnZhYmxlRnJvbVByb21pc2UoeCkpO1xuICAgICAgICB2YXIgaW5uZXIgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgICAgdGhpcy5fcy5nLmFkZChpbm5lcik7XG4gICAgICAgIGlubmVyLnNldERpc3Bvc2FibGUoeC5zdWJzY3JpYmUobmV3IElubmVyT2JzZXJ2ZXIodGhpcy5fcywgaW5uZXIpKSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIFN3aXRjaEZpcnN0T2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuX3Muby5vbkVycm9yKGUpO1xuICAgIH07XG5cbiAgICBTd2l0Y2hGaXJzdE9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLl9zLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICAhdGhpcy5fcy5oYXNDdXJyZW50ICYmIHRoaXMuX3MuZy5sZW5ndGggPT09IDEgJiYgdGhpcy5fcy5vLm9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIGluaGVyaXRzKElubmVyT2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gSW5uZXJPYnNlcnZlcihzdGF0ZSwgaW5uZXIpIHtcbiAgICAgIHRoaXMuX3MgPSBzdGF0ZTtcbiAgICAgIHRoaXMuX2kgPSBpbm5lcjtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkgeyB0aGlzLl9zLm8ub25OZXh0KHgpOyB9O1xuICAgIElubmVyT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHsgdGhpcy5fcy5vLm9uRXJyb3IoZSk7IH07XG4gICAgSW5uZXJPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5fcy5nLnJlbW92ZSh0aGlzLl9pKTtcbiAgICAgIHRoaXMuX3MuaGFzQ3VycmVudCA9IGZhbHNlO1xuICAgICAgdGhpcy5fcy5pc1N0b3BwZWQgJiYgdGhpcy5fcy5nLmxlbmd0aCA9PT0gMSAmJiB0aGlzLl9zLm8ub25Db21wbGV0ZWQoKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFN3aXRjaEZpcnN0T2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAgKiBQZXJmb3JtcyBhIGV4Y2x1c2l2ZSB3YWl0aW5nIGZvciB0aGUgZmlyc3QgdG8gZmluaXNoIGJlZm9yZSBzdWJzY3JpYmluZyB0byBhbm90aGVyIG9ic2VydmFibGUuXG4gICAqIE9ic2VydmFibGVzIHRoYXQgY29tZSBpbiBiZXR3ZWVuIHN1YnNjcmlwdGlvbnMgd2lsbCBiZSBkcm9wcGVkIG9uIHRoZSBmbG9vci5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEEgZXhjbHVzaXZlIG9ic2VydmFibGUgd2l0aCBvbmx5IHRoZSByZXN1bHRzIHRoYXQgaGFwcGVuIHdoZW4gc3Vic2NyaWJlZC5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5zd2l0Y2hGaXJzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IFN3aXRjaEZpcnN0T2JzZXJ2YWJsZSh0aGlzKTtcbiAgfTtcblxub2JzZXJ2YWJsZVByb3RvLmZsYXRNYXBGaXJzdCA9IG9ic2VydmFibGVQcm90by5leGhhdXN0TWFwID0gZnVuY3Rpb24oc2VsZWN0b3IsIHJlc3VsdFNlbGVjdG9yLCB0aGlzQXJnKSB7XG4gICAgcmV0dXJuIG5ldyBGbGF0TWFwT2JzZXJ2YWJsZSh0aGlzLCBzZWxlY3RvciwgcmVzdWx0U2VsZWN0b3IsIHRoaXNBcmcpLnN3aXRjaEZpcnN0KCk7XG59O1xuXG5vYnNlcnZhYmxlUHJvdG8uZmxhdE1hcFdpdGhNYXhDb25jdXJyZW50ID0gb2JzZXJ2YWJsZVByb3RvLmZsYXRNYXBNYXhDb25jdXJyZW50ID0gZnVuY3Rpb24obGltaXQsIHNlbGVjdG9yLCByZXN1bHRTZWxlY3RvciwgdGhpc0FyZykge1xuICAgIHJldHVybiBuZXcgRmxhdE1hcE9ic2VydmFibGUodGhpcywgc2VsZWN0b3IsIHJlc3VsdFNlbGVjdG9yLCB0aGlzQXJnKS5tZXJnZShsaW1pdCk7XG59O1xuXG4gIHJldHVybiBSeDtcbn0pKTtcbiJdfQ==