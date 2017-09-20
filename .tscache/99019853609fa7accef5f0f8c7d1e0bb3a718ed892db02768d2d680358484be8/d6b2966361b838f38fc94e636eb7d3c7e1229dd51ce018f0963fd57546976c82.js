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
    var Observable = Rx.Observable, observableProto = Observable.prototype, AnonymousObservable = Rx.AnonymousObservable, AbstractObserver = Rx.internals.AbstractObserver, CompositeDisposable = Rx.CompositeDisposable, BinaryDisposable = Rx.BinaryDisposable, NAryDisposable = Rx.NAryDisposable, Notification = Rx.Notification, Subject = Rx.Subject, Observer = Rx.Observer, disposableEmpty = Rx.Disposable.empty, disposableCreate = Rx.Disposable.create, inherits = Rx.internals.inherits, addProperties = Rx.internals.addProperties, defaultScheduler = Rx.Scheduler['default'], currentThreadScheduler = Rx.Scheduler.currentThread, identity = Rx.helpers.identity, isScheduler = Rx.Scheduler.isScheduler, isFunction = Rx.helpers.isFunction, checkDisposed = Rx.Disposable.checkDisposed;
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
    /**
    * Used to pause and resume streams.
    */
    Rx.Pauser = (function (__super__) {
        inherits(Pauser, __super__);
        function Pauser() {
            __super__.call(this);
        }
        /**
         * Pauses the underlying sequence.
         */
        Pauser.prototype.pause = function () { this.onNext(false); };
        /**
        * Resumes the underlying sequence.
        */
        Pauser.prototype.resume = function () { this.onNext(true); };
        return Pauser;
    }(Subject));
    var PausableObservable = (function (__super__) {
        inherits(PausableObservable, __super__);
        function PausableObservable(source, pauser) {
            this.source = source;
            this.controller = new Subject();
            this.paused = true;
            if (pauser && pauser.subscribe) {
                this.pauser = this.controller.merge(pauser);
            }
            else {
                this.pauser = this.controller;
            }
            __super__.call(this);
        }
        PausableObservable.prototype._subscribe = function (o) {
            var conn = this.source.publish(), subscription = conn.subscribe(o), connection = disposableEmpty;
            var pausable = this.pauser.startWith(!this.paused).distinctUntilChanged().subscribe(function (b) {
                if (b) {
                    connection = conn.connect();
                }
                else {
                    connection.dispose();
                    connection = disposableEmpty;
                }
            });
            return new NAryDisposable([subscription, connection, pausable]);
        };
        PausableObservable.prototype.pause = function () {
            this.paused = true;
            this.controller.onNext(false);
        };
        PausableObservable.prototype.resume = function () {
            this.paused = false;
            this.controller.onNext(true);
        };
        return PausableObservable;
    }(Observable));
    /**
     * Pauses the underlying observable sequence based upon the observable sequence which yields true/false.
     * @example
     * var pauser = new Rx.Subject();
     * var source = Rx.Observable.interval(100).pausable(pauser);
     * @param {Observable} pauser The observable sequence used to pause the underlying sequence.
     * @returns {Observable} The observable sequence which is paused based upon the pauser.
     */
    observableProto.pausable = function (pauser) {
        return new PausableObservable(this, pauser);
    };
    function combineLatestSource(source, subject, resultSelector) {
        return new AnonymousObservable(function (o) {
            var hasValue = [false, false], hasValueAll = false, isDone = false, values = new Array(2), err;
            function next(x, i) {
                values[i] = x;
                hasValue[i] = true;
                if (hasValueAll || (hasValueAll = hasValue.every(identity))) {
                    if (err) {
                        return o.onError(err);
                    }
                    var res = tryCatch(resultSelector).apply(null, values);
                    if (res === errorObj) {
                        return o.onError(res.e);
                    }
                    o.onNext(res);
                }
                isDone && values[1] && o.onCompleted();
            }
            return new BinaryDisposable(source.subscribe(function (x) {
                next(x, 0);
            }, function (e) {
                if (values[1]) {
                    o.onError(e);
                }
                else {
                    err = e;
                }
            }, function () {
                isDone = true;
                values[1] && o.onCompleted();
            }), subject.subscribe(function (x) {
                next(x, 1);
            }, function (e) { o.onError(e); }, function () {
                isDone = true;
                next(true, 1);
            }));
        }, source);
    }
    var PausableBufferedObservable = (function (__super__) {
        inherits(PausableBufferedObservable, __super__);
        function PausableBufferedObservable(source, pauser) {
            this.source = source;
            this.controller = new Subject();
            this.paused = true;
            if (pauser && pauser.subscribe) {
                this.pauser = this.controller.merge(pauser);
            }
            else {
                this.pauser = this.controller;
            }
            __super__.call(this);
        }
        PausableBufferedObservable.prototype._subscribe = function (o) {
            var q = [], previousShouldFire;
            function drainQueue() { while (q.length > 0) {
                o.onNext(q.shift());
            } }
            var subscription = combineLatestSource(this.source, this.pauser.startWith(!this.paused).distinctUntilChanged(), function (data, shouldFire) {
                return { data: data, shouldFire: shouldFire };
            })
                .subscribe(function (results) {
                if (previousShouldFire !== undefined && results.shouldFire !== previousShouldFire) {
                    previousShouldFire = results.shouldFire;
                    // change in shouldFire
                    if (results.shouldFire) {
                        drainQueue();
                    }
                }
                else {
                    previousShouldFire = results.shouldFire;
                    // new data
                    if (results.shouldFire) {
                        o.onNext(results.data);
                    }
                    else {
                        q.push(results.data);
                    }
                }
            }, function (err) {
                drainQueue();
                o.onError(err);
            }, function () {
                drainQueue();
                o.onCompleted();
            });
            return subscription;
        };
        PausableBufferedObservable.prototype.pause = function () {
            this.paused = true;
            this.controller.onNext(false);
        };
        PausableBufferedObservable.prototype.resume = function () {
            this.paused = false;
            this.controller.onNext(true);
        };
        return PausableBufferedObservable;
    }(Observable));
    /**
     * Pauses the underlying observable sequence based upon the observable sequence which yields true/false,
     * and yields the values that were buffered while paused.
     * @example
     * var pauser = new Rx.Subject();
     * var source = Rx.Observable.interval(100).pausableBuffered(pauser);
     * @param {Observable} pauser The observable sequence used to pause the underlying sequence.
     * @returns {Observable} The observable sequence which is paused based upon the pauser.
     */
    observableProto.pausableBuffered = function (pauser) {
        return new PausableBufferedObservable(this, pauser);
    };
    var ControlledObservable = (function (__super__) {
        inherits(ControlledObservable, __super__);
        function ControlledObservable(source, enableQueue, scheduler) {
            __super__.call(this);
            this.subject = new ControlledSubject(enableQueue, scheduler);
            this.source = source.multicast(this.subject).refCount();
        }
        ControlledObservable.prototype._subscribe = function (o) {
            return this.source.subscribe(o);
        };
        ControlledObservable.prototype.request = function (numberOfItems) {
            return this.subject.request(numberOfItems == null ? -1 : numberOfItems);
        };
        return ControlledObservable;
    }(Observable));
    var ControlledSubject = (function (__super__) {
        inherits(ControlledSubject, __super__);
        function ControlledSubject(enableQueue, scheduler) {
            enableQueue == null && (enableQueue = true);
            __super__.call(this);
            this.subject = new Subject();
            this.enableQueue = enableQueue;
            this.queue = enableQueue ? [] : null;
            this.requestedCount = 0;
            this.requestedDisposable = null;
            this.error = null;
            this.hasFailed = false;
            this.hasCompleted = false;
            this.scheduler = scheduler || currentThreadScheduler;
        }
        addProperties(ControlledSubject.prototype, Observer, {
            _subscribe: function (o) {
                return this.subject.subscribe(o);
            },
            onCompleted: function () {
                this.hasCompleted = true;
                if (!this.enableQueue || this.queue.length === 0) {
                    this.subject.onCompleted();
                    this.disposeCurrentRequest();
                }
                else {
                    this.queue.push(Notification.createOnCompleted());
                }
            },
            onError: function (error) {
                this.hasFailed = true;
                this.error = error;
                if (!this.enableQueue || this.queue.length === 0) {
                    this.subject.onError(error);
                    this.disposeCurrentRequest();
                }
                else {
                    this.queue.push(Notification.createOnError(error));
                }
            },
            onNext: function (value) {
                if (this.requestedCount <= 0) {
                    this.enableQueue && this.queue.push(Notification.createOnNext(value));
                }
                else {
                    (this.requestedCount-- === 0) && this.disposeCurrentRequest();
                    this.subject.onNext(value);
                }
            },
            _processRequest: function (numberOfItems) {
                if (this.enableQueue) {
                    while (this.queue.length > 0 && (numberOfItems > 0 || this.queue[0].kind !== 'N')) {
                        var first = this.queue.shift();
                        first.accept(this.subject);
                        if (first.kind === 'N') {
                            numberOfItems--;
                        }
                        else {
                            this.disposeCurrentRequest();
                            this.queue = [];
                        }
                    }
                }
                return numberOfItems;
            },
            request: function (number) {
                this.disposeCurrentRequest();
                var self = this;
                this.requestedDisposable = this.scheduler.schedule(number, function (s, i) {
                    var remaining = self._processRequest(i);
                    var stopped = self.hasCompleted || self.hasFailed;
                    if (!stopped && remaining > 0) {
                        self.requestedCount = remaining;
                        return disposableCreate(function () {
                            self.requestedCount = 0;
                        });
                        // Scheduled item is still in progress. Return a new
                        // disposable to allow the request to be interrupted
                        // via dispose.
                    }
                });
                return this.requestedDisposable;
            },
            disposeCurrentRequest: function () {
                if (this.requestedDisposable) {
                    this.requestedDisposable.dispose();
                    this.requestedDisposable = null;
                }
            }
        });
        return ControlledSubject;
    }(Observable));
    /**
     * Attaches a controller to the observable sequence with the ability to queue.
     * @example
     * var source = Rx.Observable.interval(100).controlled();
     * source.request(3); // Reads 3 values
     * @param {bool} enableQueue truthy value to determine if values should be queued pending the next request
     * @param {Scheduler} scheduler determines how the requests will be scheduled
     * @returns {Observable} The observable sequence which only propagates values on request.
     */
    observableProto.controlled = function (enableQueue, scheduler) {
        if (enableQueue && isScheduler(enableQueue)) {
            scheduler = enableQueue;
            enableQueue = true;
        }
        if (enableQueue == null) {
            enableQueue = true;
        }
        return new ControlledObservable(this, enableQueue, scheduler);
    };
    var StopAndWaitObservable = (function (__super__) {
        inherits(StopAndWaitObservable, __super__);
        function StopAndWaitObservable(source) {
            __super__.call(this);
            this.source = source;
        }
        function scheduleMethod(s, self) {
            return self.source.request(1);
        }
        StopAndWaitObservable.prototype._subscribe = function (o) {
            this.subscription = this.source.subscribe(new StopAndWaitObserver(o, this, this.subscription));
            return new BinaryDisposable(this.subscription, defaultScheduler.schedule(this, scheduleMethod));
        };
        var StopAndWaitObserver = (function (__sub__) {
            inherits(StopAndWaitObserver, __sub__);
            function StopAndWaitObserver(observer, observable, cancel) {
                __sub__.call(this);
                this.observer = observer;
                this.observable = observable;
                this.cancel = cancel;
                this.scheduleDisposable = null;
            }
            StopAndWaitObserver.prototype.completed = function () {
                this.observer.onCompleted();
                this.dispose();
            };
            StopAndWaitObserver.prototype.error = function (error) {
                this.observer.onError(error);
                this.dispose();
            };
            function innerScheduleMethod(s, self) {
                return self.observable.source.request(1);
            }
            StopAndWaitObserver.prototype.next = function (value) {
                this.observer.onNext(value);
                this.scheduleDisposable = defaultScheduler.schedule(this, innerScheduleMethod);
            };
            StopAndWaitObserver.dispose = function () {
                this.observer = null;
                if (this.cancel) {
                    this.cancel.dispose();
                    this.cancel = null;
                }
                if (this.scheduleDisposable) {
                    this.scheduleDisposable.dispose();
                    this.scheduleDisposable = null;
                }
                __sub__.prototype.dispose.call(this);
            };
            return StopAndWaitObserver;
        }(AbstractObserver));
        return StopAndWaitObservable;
    }(Observable));
    /**
     * Attaches a stop and wait observable to the current observable.
     * @returns {Observable} A stop and wait observable.
     */
    ControlledObservable.prototype.stopAndWait = function () {
        return new StopAndWaitObservable(this);
    };
    var WindowedObservable = (function (__super__) {
        inherits(WindowedObservable, __super__);
        function WindowedObservable(source, windowSize) {
            __super__.call(this);
            this.source = source;
            this.windowSize = windowSize;
        }
        function scheduleMethod(s, self) {
            return self.source.request(self.windowSize);
        }
        WindowedObservable.prototype._subscribe = function (o) {
            this.subscription = this.source.subscribe(new WindowedObserver(o, this, this.subscription));
            return new BinaryDisposable(this.subscription, defaultScheduler.schedule(this, scheduleMethod));
        };
        var WindowedObserver = (function (__sub__) {
            inherits(WindowedObserver, __sub__);
            function WindowedObserver(observer, observable, cancel) {
                this.observer = observer;
                this.observable = observable;
                this.cancel = cancel;
                this.received = 0;
                this.scheduleDisposable = null;
                __sub__.call(this);
            }
            WindowedObserver.prototype.completed = function () {
                this.observer.onCompleted();
                this.dispose();
            };
            WindowedObserver.prototype.error = function (error) {
                this.observer.onError(error);
                this.dispose();
            };
            function innerScheduleMethod(s, self) {
                return self.observable.source.request(self.observable.windowSize);
            }
            WindowedObserver.prototype.next = function (value) {
                this.observer.onNext(value);
                this.received = ++this.received % this.observable.windowSize;
                this.received === 0 && (this.scheduleDisposable = defaultScheduler.schedule(this, innerScheduleMethod));
            };
            WindowedObserver.prototype.dispose = function () {
                this.observer = null;
                if (this.cancel) {
                    this.cancel.dispose();
                    this.cancel = null;
                }
                if (this.scheduleDisposable) {
                    this.scheduleDisposable.dispose();
                    this.scheduleDisposable = null;
                }
                __sub__.prototype.dispose.call(this);
            };
            return WindowedObserver;
        }(AbstractObserver));
        return WindowedObservable;
    }(Observable));
    /**
     * Creates a sliding windowed observable based upon the window size.
     * @param {Number} windowSize The number of items in the window
     * @returns {Observable} A windowed observable based upon the window size.
     */
    ControlledObservable.prototype.windowed = function (windowSize) {
        return new WindowedObservable(this, windowSize);
    };
    /**
     * Pipes the existing Observable sequence into a Node.js Stream.
     * @param {Stream} dest The destination Node.js stream.
     * @returns {Stream} The destination stream.
     */
    observableProto.pipe = function (dest) {
        var source = this.pausableBuffered();
        function onDrain() {
            source.resume();
        }
        dest.addListener('drain', onDrain);
        source.subscribe(function (x) {
            !dest.write(x) && source.pause();
        }, function (err) {
            dest.emit('error', err);
        }, function () {
            // Hack check because STDIO is not closable
            !dest._isStdio && dest.end();
            dest.removeListener('drain', onDrain);
        });
        source.resume();
        return dest;
    };
    return Rx;
}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccnguYmFja3ByZXNzdXJlLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXHJ4XFxkaXN0XFxyeC5iYWNrcHJlc3N1cmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsNkdBQTZHO0FBRTdHLENBQUM7QUFBQSxDQUFDLFVBQVUsT0FBTztJQUNqQixJQUFJLFdBQVcsR0FBRztRQUNoQixVQUFVLEVBQUUsSUFBSTtRQUNoQixRQUFRLEVBQUUsSUFBSTtLQUNmLENBQUM7SUFFRixxQkFBcUIsS0FBSztRQUN4QixNQUFNLENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQzNELENBQUM7SUFFRCxJQUFJLFdBQVcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPLE9BQU8sQ0FBQyxJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQ2pHLElBQUksVUFBVSxHQUFHLENBQUMsV0FBVyxDQUFDLE9BQU8sTUFBTSxDQUFDLElBQUksTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDNUYsSUFBSSxVQUFVLEdBQUcsV0FBVyxDQUFDLFdBQVcsSUFBSSxVQUFVLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxJQUFJLE1BQU0sQ0FBQyxDQUFDO0lBQ2hHLElBQUksUUFBUSxHQUFHLFdBQVcsQ0FBQyxXQUFX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LEdBQUcsVUFBVSxJQUFJO1FBQ25DLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBRXJDO1lBQ0UsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2xCLENBQUM7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVuQyxNQUFNLENBQUMsU0FBUyxDQUNkLFVBQVUsQ0FBQztZQUNULENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDbkMsQ0FBQyxFQUNELFVBQVUsR0FBRztZQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLENBQUMsRUFDRDtZQUNFLDJDQUEyQztZQUMzQyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3hDLENBQUMsQ0FBQyxDQUFDO1FBRUwsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRWhCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUM7SUFFRixNQUFNLENBQUMsRUFBRSxDQUFDO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0LCBBbGwgcmlnaHRzIHJlc2VydmVkLiBTZWUgTGljZW5zZS50eHQgaW4gdGhlIHByb2plY3Qgcm9vdCBmb3IgbGljZW5zZSBpbmZvcm1hdGlvbi5cblxuOyhmdW5jdGlvbiAoZmFjdG9yeSkge1xuICB2YXIgb2JqZWN0VHlwZXMgPSB7XG4gICAgJ2Z1bmN0aW9uJzogdHJ1ZSxcbiAgICAnb2JqZWN0JzogdHJ1ZVxuICB9O1xuXG4gIGZ1bmN0aW9uIGNoZWNrR2xvYmFsKHZhbHVlKSB7XG4gICAgcmV0dXJuICh2YWx1ZSAmJiB2YWx1ZS5PYmplY3QgPT09IE9iamVjdCkgPyB2YWx1ZSA6IG51bGw7XG4gIH1cblxuICB2YXIgZnJlZUV4cG9ydHMgPSAob2JqZWN0VHlwZXNbdHlwZW9mIGV4cG9ydHNdICYmIGV4cG9ydHMgJiYgIWV4cG9ydHMubm9kZVR5cGUpID8gZXhwb3J0cyA6IG51bGw7XG4gIHZhciBmcmVlTW9kdWxlID0gKG9iamVjdFR5cGVzW3R5cGVvZiBtb2R1bGVdICYmIG1vZHVsZSAmJiAhbW9kdWxlLm5vZGVUeXBlKSA/IG1vZHVsZSA6IG51bGw7XG4gIHZhciBmcmVlR2xvYmFsID0gY2hlY2tHbG9iYWwoZnJlZUV4cG9ydHMgJiYgZnJlZU1vZHVsZSAmJiB0eXBlb2YgZ2xvYmFsID09PSAnb2JqZWN0JyAmJiBnbG9iYWwpO1xuICB2YXIgZnJlZVNlbGYgPSBjaGVja0dsb2JhbChvYmplY3RUeXBlc1t0eXBlb2Ygc2VsZl0gJiYgc2VsZik7XG4gIHZhciBmcmVlV2luZG93ID0gY2hlY2tHbG9iYWwob2JqZWN0VHlwZXNbdHlwZW9mIHdpbmRvd10gJiYgd2luZG93KTtcbiAgdmFyIG1vZHVsZUV4cG9ydHMgPSAoZnJlZU1vZHVsZSAmJiBmcmVlTW9kdWxlLmV4cG9ydHMgPT09IGZyZWVFeHBvcnRzKSA/IGZyZWVFeHBvcnRzIDogbnVsbDtcbiAgdmFyIHRoaXNHbG9iYWwgPSBjaGVja0dsb2JhbChvYmplY3RUeXBlc1t0eXBlb2YgdGhpc10gJiYgdGhpcyk7XG4gIHZhciByb290ID0gZnJlZUdsb2JhbCB8fCAoKGZyZWVXaW5kb3cgIT09ICh0aGlzR2xvYmFsICYmIHRoaXNHbG9iYWwud2luZG93KSkgJiYgZnJlZVdpbmRvdykgfHwgZnJlZVNlbGYgfHwgdGhpc0dsb2JhbCB8fCBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuXG4gIC8vIEJlY2F1c2Ugb2YgYnVpbGQgb3B0aW1pemVyc1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKFsnLi9yeCddLCBmdW5jdGlvbiAoUngsIGV4cG9ydHMpIHtcbiAgICAgIHJldHVybiBmYWN0b3J5KHJvb3QsIGV4cG9ydHMsIFJ4KTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiYgbW9kdWxlLmV4cG9ydHMgPT09IGZyZWVFeHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJvb3QsIG1vZHVsZS5leHBvcnRzLCByZXF1aXJlKCcuL3J4JykpO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuUnggPSBmYWN0b3J5KHJvb3QsIHt9LCByb290LlJ4KTtcbiAgfVxufS5jYWxsKHRoaXMsIGZ1bmN0aW9uIChyb290LCBleHAsIFJ4LCB1bmRlZmluZWQpIHtcblxuICAvLyBSZWZlcmVuY2VzXG4gIHZhciBPYnNlcnZhYmxlID0gUnguT2JzZXJ2YWJsZSxcbiAgICBvYnNlcnZhYmxlUHJvdG8gPSBPYnNlcnZhYmxlLnByb3RvdHlwZSxcbiAgICBBbm9ueW1vdXNPYnNlcnZhYmxlID0gUnguQW5vbnltb3VzT2JzZXJ2YWJsZSxcbiAgICBBYnN0cmFjdE9ic2VydmVyID0gUnguaW50ZXJuYWxzLkFic3RyYWN0T2JzZXJ2ZXIsXG4gICAgQ29tcG9zaXRlRGlzcG9zYWJsZSA9IFJ4LkNvbXBvc2l0ZURpc3Bvc2FibGUsXG4gICAgQmluYXJ5RGlzcG9zYWJsZSA9IFJ4LkJpbmFyeURpc3Bvc2FibGUsXG4gICAgTkFyeURpc3Bvc2FibGUgPSBSeC5OQXJ5RGlzcG9zYWJsZSxcbiAgICBOb3RpZmljYXRpb24gPSBSeC5Ob3RpZmljYXRpb24sXG4gICAgU3ViamVjdCA9IFJ4LlN1YmplY3QsXG4gICAgT2JzZXJ2ZXIgPSBSeC5PYnNlcnZlcixcbiAgICBkaXNwb3NhYmxlRW1wdHkgPSBSeC5EaXNwb3NhYmxlLmVtcHR5LFxuICAgIGRpc3Bvc2FibGVDcmVhdGUgPSBSeC5EaXNwb3NhYmxlLmNyZWF0ZSxcbiAgICBpbmhlcml0cyA9IFJ4LmludGVybmFscy5pbmhlcml0cyxcbiAgICBhZGRQcm9wZXJ0aWVzID0gUnguaW50ZXJuYWxzLmFkZFByb3BlcnRpZXMsXG4gICAgZGVmYXVsdFNjaGVkdWxlciA9IFJ4LlNjaGVkdWxlclsnZGVmYXVsdCddLFxuICAgIGN1cnJlbnRUaHJlYWRTY2hlZHVsZXIgPSBSeC5TY2hlZHVsZXIuY3VycmVudFRocmVhZCxcbiAgICBpZGVudGl0eSA9IFJ4LmhlbHBlcnMuaWRlbnRpdHksXG4gICAgaXNTY2hlZHVsZXIgPSBSeC5TY2hlZHVsZXIuaXNTY2hlZHVsZXIsXG4gICAgaXNGdW5jdGlvbiA9IFJ4LmhlbHBlcnMuaXNGdW5jdGlvbixcbiAgICBjaGVja0Rpc3Bvc2VkID0gUnguRGlzcG9zYWJsZS5jaGVja0Rpc3Bvc2VkO1xuXG4gIHZhciBlcnJvck9iaiA9IHtlOiB7fX07XG4gIFxuICBmdW5jdGlvbiB0cnlDYXRjaGVyR2VuKHRyeUNhdGNoVGFyZ2V0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIHRyeUNhdGNoZXIoKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gdHJ5Q2F0Y2hUYXJnZXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZXJyb3JPYmouZSA9IGU7XG4gICAgICAgIHJldHVybiBlcnJvck9iajtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgdmFyIHRyeUNhdGNoID0gUnguaW50ZXJuYWxzLnRyeUNhdGNoID0gZnVuY3Rpb24gdHJ5Q2F0Y2goZm4pIHtcbiAgICBpZiAoIWlzRnVuY3Rpb24oZm4pKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ2ZuIG11c3QgYmUgYSBmdW5jdGlvbicpOyB9XG4gICAgcmV0dXJuIHRyeUNhdGNoZXJHZW4oZm4pO1xuICB9O1xuXG4gIGZ1bmN0aW9uIHRocm93ZXIoZSkge1xuICAgIHRocm93IGU7XG4gIH1cblxuICAvKipcbiAgKiBVc2VkIHRvIHBhdXNlIGFuZCByZXN1bWUgc3RyZWFtcy5cbiAgKi9cbiAgUnguUGF1c2VyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhQYXVzZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gUGF1c2VyKCkge1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGF1c2VzIHRoZSB1bmRlcmx5aW5nIHNlcXVlbmNlLlxuICAgICAqL1xuICAgIFBhdXNlci5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbiAoKSB7IHRoaXMub25OZXh0KGZhbHNlKTsgfTtcblxuICAgIC8qKlxuICAgICogUmVzdW1lcyB0aGUgdW5kZXJseWluZyBzZXF1ZW5jZS5cbiAgICAqL1xuICAgIFBhdXNlci5wcm90b3R5cGUucmVzdW1lID0gZnVuY3Rpb24gKCkgeyB0aGlzLm9uTmV4dCh0cnVlKTsgfTtcblxuICAgIHJldHVybiBQYXVzZXI7XG4gIH0oU3ViamVjdCkpO1xuXG4gIHZhciBQYXVzYWJsZU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFBhdXNhYmxlT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBQYXVzYWJsZU9ic2VydmFibGUoc291cmNlLCBwYXVzZXIpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5jb250cm9sbGVyID0gbmV3IFN1YmplY3QoKTtcbiAgICAgIHRoaXMucGF1c2VkID0gdHJ1ZTtcblxuICAgICAgaWYgKHBhdXNlciAmJiBwYXVzZXIuc3Vic2NyaWJlKSB7XG4gICAgICAgIHRoaXMucGF1c2VyID0gdGhpcy5jb250cm9sbGVyLm1lcmdlKHBhdXNlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnBhdXNlciA9IHRoaXMuY29udHJvbGxlcjtcbiAgICAgIH1cblxuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgUGF1c2FibGVPYnNlcnZhYmxlLnByb3RvdHlwZS5fc3Vic2NyaWJlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciBjb25uID0gdGhpcy5zb3VyY2UucHVibGlzaCgpLFxuICAgICAgICBzdWJzY3JpcHRpb24gPSBjb25uLnN1YnNjcmliZShvKSxcbiAgICAgICAgY29ubmVjdGlvbiA9IGRpc3Bvc2FibGVFbXB0eTtcblxuICAgICAgdmFyIHBhdXNhYmxlID0gdGhpcy5wYXVzZXIuc3RhcnRXaXRoKCF0aGlzLnBhdXNlZCkuZGlzdGluY3RVbnRpbENoYW5nZWQoKS5zdWJzY3JpYmUoZnVuY3Rpb24gKGIpIHtcbiAgICAgICAgaWYgKGIpIHtcbiAgICAgICAgICBjb25uZWN0aW9uID0gY29ubi5jb25uZWN0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29ubmVjdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgICAgY29ubmVjdGlvbiA9IGRpc3Bvc2FibGVFbXB0eTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBuZXcgTkFyeURpc3Bvc2FibGUoW3N1YnNjcmlwdGlvbiwgY29ubmVjdGlvbiwgcGF1c2FibGVdKTtcbiAgICB9O1xuXG4gICAgUGF1c2FibGVPYnNlcnZhYmxlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMucGF1c2VkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY29udHJvbGxlci5vbk5leHQoZmFsc2UpO1xuICAgIH07XG5cbiAgICBQYXVzYWJsZU9ic2VydmFibGUucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XG4gICAgICB0aGlzLmNvbnRyb2xsZXIub25OZXh0KHRydWUpO1xuICAgIH07XG5cbiAgICByZXR1cm4gUGF1c2FibGVPYnNlcnZhYmxlO1xuXG4gIH0oT2JzZXJ2YWJsZSkpO1xuXG4gIC8qKlxuICAgKiBQYXVzZXMgdGhlIHVuZGVybHlpbmcgb2JzZXJ2YWJsZSBzZXF1ZW5jZSBiYXNlZCB1cG9uIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHdoaWNoIHlpZWxkcyB0cnVlL2ZhbHNlLlxuICAgKiBAZXhhbXBsZVxuICAgKiB2YXIgcGF1c2VyID0gbmV3IFJ4LlN1YmplY3QoKTtcbiAgICogdmFyIHNvdXJjZSA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwKS5wYXVzYWJsZShwYXVzZXIpO1xuICAgKiBAcGFyYW0ge09ic2VydmFibGV9IHBhdXNlciBUaGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSB1c2VkIHRvIHBhdXNlIHRoZSB1bmRlcmx5aW5nIHNlcXVlbmNlLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gVGhlIG9ic2VydmFibGUgc2VxdWVuY2Ugd2hpY2ggaXMgcGF1c2VkIGJhc2VkIHVwb24gdGhlIHBhdXNlci5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5wYXVzYWJsZSA9IGZ1bmN0aW9uIChwYXVzZXIpIHtcbiAgICByZXR1cm4gbmV3IFBhdXNhYmxlT2JzZXJ2YWJsZSh0aGlzLCBwYXVzZXIpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIGNvbWJpbmVMYXRlc3RTb3VyY2Uoc291cmNlLCBzdWJqZWN0LCByZXN1bHRTZWxlY3Rvcikge1xuICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbiAobykge1xuICAgICAgdmFyIGhhc1ZhbHVlID0gW2ZhbHNlLCBmYWxzZV0sXG4gICAgICAgIGhhc1ZhbHVlQWxsID0gZmFsc2UsXG4gICAgICAgIGlzRG9uZSA9IGZhbHNlLFxuICAgICAgICB2YWx1ZXMgPSBuZXcgQXJyYXkoMiksXG4gICAgICAgIGVycjtcblxuICAgICAgZnVuY3Rpb24gbmV4dCh4LCBpKSB7XG4gICAgICAgIHZhbHVlc1tpXSA9IHg7XG4gICAgICAgIGhhc1ZhbHVlW2ldID0gdHJ1ZTtcbiAgICAgICAgaWYgKGhhc1ZhbHVlQWxsIHx8IChoYXNWYWx1ZUFsbCA9IGhhc1ZhbHVlLmV2ZXJ5KGlkZW50aXR5KSkpIHtcbiAgICAgICAgICBpZiAoZXJyKSB7IHJldHVybiBvLm9uRXJyb3IoZXJyKTsgfVxuICAgICAgICAgIHZhciByZXMgPSB0cnlDYXRjaChyZXN1bHRTZWxlY3RvcikuYXBwbHkobnVsbCwgdmFsdWVzKTtcbiAgICAgICAgICBpZiAocmVzID09PSBlcnJvck9iaikgeyByZXR1cm4gby5vbkVycm9yKHJlcy5lKTsgfVxuICAgICAgICAgIG8ub25OZXh0KHJlcyk7XG4gICAgICAgIH1cbiAgICAgICAgaXNEb25lICYmIHZhbHVlc1sxXSAmJiBvLm9uQ29tcGxldGVkKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgQmluYXJ5RGlzcG9zYWJsZShcbiAgICAgICAgc291cmNlLnN1YnNjcmliZShcbiAgICAgICAgICBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgbmV4dCh4LCAwKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBpZiAodmFsdWVzWzFdKSB7XG4gICAgICAgICAgICAgIG8ub25FcnJvcihlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGVyciA9IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpc0RvbmUgPSB0cnVlO1xuICAgICAgICAgICAgdmFsdWVzWzFdICYmIG8ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgc3ViamVjdC5zdWJzY3JpYmUoXG4gICAgICAgICAgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIG5leHQoeCwgMSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBmdW5jdGlvbiAoZSkgeyBvLm9uRXJyb3IoZSk7IH0sXG4gICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaXNEb25lID0gdHJ1ZTtcbiAgICAgICAgICAgIG5leHQodHJ1ZSwgMSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9LCBzb3VyY2UpO1xuICB9XG5cbiAgdmFyIFBhdXNhYmxlQnVmZmVyZWRPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhQYXVzYWJsZUJ1ZmZlcmVkT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBQYXVzYWJsZUJ1ZmZlcmVkT2JzZXJ2YWJsZShzb3VyY2UsIHBhdXNlcikge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLmNvbnRyb2xsZXIgPSBuZXcgU3ViamVjdCgpO1xuICAgICAgdGhpcy5wYXVzZWQgPSB0cnVlO1xuXG4gICAgICBpZiAocGF1c2VyICYmIHBhdXNlci5zdWJzY3JpYmUpIHtcbiAgICAgICAgdGhpcy5wYXVzZXIgPSB0aGlzLmNvbnRyb2xsZXIubWVyZ2UocGF1c2VyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucGF1c2VyID0gdGhpcy5jb250cm9sbGVyO1xuICAgICAgfVxuXG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBQYXVzYWJsZUJ1ZmZlcmVkT2JzZXJ2YWJsZS5wcm90b3R5cGUuX3N1YnNjcmliZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgcSA9IFtdLCBwcmV2aW91c1Nob3VsZEZpcmU7XG5cbiAgICAgIGZ1bmN0aW9uIGRyYWluUXVldWUoKSB7IHdoaWxlIChxLmxlbmd0aCA+IDApIHsgby5vbk5leHQocS5zaGlmdCgpKTsgfSB9XG5cbiAgICAgIHZhciBzdWJzY3JpcHRpb24gPVxuICAgICAgICBjb21iaW5lTGF0ZXN0U291cmNlKFxuICAgICAgICAgIHRoaXMuc291cmNlLFxuICAgICAgICAgIHRoaXMucGF1c2VyLnN0YXJ0V2l0aCghdGhpcy5wYXVzZWQpLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgICAgZnVuY3Rpb24gKGRhdGEsIHNob3VsZEZpcmUpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGRhdGE6IGRhdGEsIHNob3VsZEZpcmU6IHNob3VsZEZpcmUgfTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5zdWJzY3JpYmUoXG4gICAgICAgICAgICBmdW5jdGlvbiAocmVzdWx0cykge1xuICAgICAgICAgICAgICBpZiAocHJldmlvdXNTaG91bGRGaXJlICE9PSB1bmRlZmluZWQgJiYgcmVzdWx0cy5zaG91bGRGaXJlICE9PSBwcmV2aW91c1Nob3VsZEZpcmUpIHtcbiAgICAgICAgICAgICAgICBwcmV2aW91c1Nob3VsZEZpcmUgPSByZXN1bHRzLnNob3VsZEZpcmU7XG4gICAgICAgICAgICAgICAgLy8gY2hhbmdlIGluIHNob3VsZEZpcmVcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0cy5zaG91bGRGaXJlKSB7IGRyYWluUXVldWUoKTsgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHByZXZpb3VzU2hvdWxkRmlyZSA9IHJlc3VsdHMuc2hvdWxkRmlyZTtcbiAgICAgICAgICAgICAgICAvLyBuZXcgZGF0YVxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHRzLnNob3VsZEZpcmUpIHtcbiAgICAgICAgICAgICAgICAgIG8ub25OZXh0KHJlc3VsdHMuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHEucHVzaChyZXN1bHRzLmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgICAgICAgICAgICBvLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIGRyYWluUXVldWUoKTtcbiAgICAgICAgICAgICAgby5vbkNvbXBsZXRlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG4gICAgICByZXR1cm4gc3Vic2NyaXB0aW9uOyAgICAgIFxuICAgIH07XG5cbiAgICBQYXVzYWJsZUJ1ZmZlcmVkT2JzZXJ2YWJsZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnBhdXNlZCA9IHRydWU7XG4gICAgICB0aGlzLmNvbnRyb2xsZXIub25OZXh0KGZhbHNlKTtcbiAgICB9O1xuXG4gICAgUGF1c2FibGVCdWZmZXJlZE9ic2VydmFibGUucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XG4gICAgICB0aGlzLmNvbnRyb2xsZXIub25OZXh0KHRydWUpO1xuICAgIH07XG5cbiAgICByZXR1cm4gUGF1c2FibGVCdWZmZXJlZE9ic2VydmFibGU7XG5cbiAgfShPYnNlcnZhYmxlKSk7XG5cbiAgLyoqXG4gICAqIFBhdXNlcyB0aGUgdW5kZXJseWluZyBvYnNlcnZhYmxlIHNlcXVlbmNlIGJhc2VkIHVwb24gdGhlIG9ic2VydmFibGUgc2VxdWVuY2Ugd2hpY2ggeWllbGRzIHRydWUvZmFsc2UsXG4gICAqIGFuZCB5aWVsZHMgdGhlIHZhbHVlcyB0aGF0IHdlcmUgYnVmZmVyZWQgd2hpbGUgcGF1c2VkLlxuICAgKiBAZXhhbXBsZVxuICAgKiB2YXIgcGF1c2VyID0gbmV3IFJ4LlN1YmplY3QoKTtcbiAgICogdmFyIHNvdXJjZSA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwKS5wYXVzYWJsZUJ1ZmZlcmVkKHBhdXNlcik7XG4gICAqIEBwYXJhbSB7T2JzZXJ2YWJsZX0gcGF1c2VyIFRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHVzZWQgdG8gcGF1c2UgdGhlIHVuZGVybHlpbmcgc2VxdWVuY2UuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBUaGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSB3aGljaCBpcyBwYXVzZWQgYmFzZWQgdXBvbiB0aGUgcGF1c2VyLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnBhdXNhYmxlQnVmZmVyZWQgPSBmdW5jdGlvbiAocGF1c2VyKSB7XG4gICAgcmV0dXJuIG5ldyBQYXVzYWJsZUJ1ZmZlcmVkT2JzZXJ2YWJsZSh0aGlzLCBwYXVzZXIpO1xuICB9O1xuXG4gIHZhciBDb250cm9sbGVkT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoQ29udHJvbGxlZE9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gQ29udHJvbGxlZE9ic2VydmFibGUgKHNvdXJjZSwgZW5hYmxlUXVldWUsIHNjaGVkdWxlcikge1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgICB0aGlzLnN1YmplY3QgPSBuZXcgQ29udHJvbGxlZFN1YmplY3QoZW5hYmxlUXVldWUsIHNjaGVkdWxlcik7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZS5tdWx0aWNhc3QodGhpcy5zdWJqZWN0KS5yZWZDb3VudCgpO1xuICAgIH1cblxuICAgIENvbnRyb2xsZWRPYnNlcnZhYmxlLnByb3RvdHlwZS5fc3Vic2NyaWJlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobyk7XG4gICAgfTtcblxuICAgIENvbnRyb2xsZWRPYnNlcnZhYmxlLnByb3RvdHlwZS5yZXF1ZXN0ID0gZnVuY3Rpb24gKG51bWJlck9mSXRlbXMpIHtcbiAgICAgIHJldHVybiB0aGlzLnN1YmplY3QucmVxdWVzdChudW1iZXJPZkl0ZW1zID09IG51bGwgPyAtMSA6IG51bWJlck9mSXRlbXMpO1xuICAgIH07XG5cbiAgICByZXR1cm4gQ29udHJvbGxlZE9ic2VydmFibGU7XG5cbiAgfShPYnNlcnZhYmxlKSk7XG5cbiAgdmFyIENvbnRyb2xsZWRTdWJqZWN0ID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhDb250cm9sbGVkU3ViamVjdCwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBDb250cm9sbGVkU3ViamVjdChlbmFibGVRdWV1ZSwgc2NoZWR1bGVyKSB7XG4gICAgICBlbmFibGVRdWV1ZSA9PSBudWxsICYmIChlbmFibGVRdWV1ZSA9IHRydWUpO1xuXG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICAgIHRoaXMuc3ViamVjdCA9IG5ldyBTdWJqZWN0KCk7XG4gICAgICB0aGlzLmVuYWJsZVF1ZXVlID0gZW5hYmxlUXVldWU7XG4gICAgICB0aGlzLnF1ZXVlID0gZW5hYmxlUXVldWUgPyBbXSA6IG51bGw7XG4gICAgICB0aGlzLnJlcXVlc3RlZENvdW50ID0gMDtcbiAgICAgIHRoaXMucmVxdWVzdGVkRGlzcG9zYWJsZSA9IG51bGw7XG4gICAgICB0aGlzLmVycm9yID0gbnVsbDtcbiAgICAgIHRoaXMuaGFzRmFpbGVkID0gZmFsc2U7XG4gICAgICB0aGlzLmhhc0NvbXBsZXRlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5zY2hlZHVsZXIgPSBzY2hlZHVsZXIgfHwgY3VycmVudFRocmVhZFNjaGVkdWxlcjtcbiAgICB9XG5cbiAgICBhZGRQcm9wZXJ0aWVzKENvbnRyb2xsZWRTdWJqZWN0LnByb3RvdHlwZSwgT2JzZXJ2ZXIsIHtcbiAgICAgIF9zdWJzY3JpYmU6IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN1YmplY3Quc3Vic2NyaWJlKG8pO1xuICAgICAgfSxcbiAgICAgIG9uQ29tcGxldGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaGFzQ29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKCF0aGlzLmVuYWJsZVF1ZXVlIHx8IHRoaXMucXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5zdWJqZWN0Lm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgdGhpcy5kaXNwb3NlQ3VycmVudFJlcXVlc3QoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnF1ZXVlLnB1c2goTm90aWZpY2F0aW9uLmNyZWF0ZU9uQ29tcGxldGVkKCkpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgb25FcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIHRoaXMuaGFzRmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5lcnJvciA9IGVycm9yO1xuICAgICAgICBpZiAoIXRoaXMuZW5hYmxlUXVldWUgfHwgdGhpcy5xdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLnN1YmplY3Qub25FcnJvcihlcnJvcik7XG4gICAgICAgICAgdGhpcy5kaXNwb3NlQ3VycmVudFJlcXVlc3QoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnF1ZXVlLnB1c2goTm90aWZpY2F0aW9uLmNyZWF0ZU9uRXJyb3IoZXJyb3IpKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIG9uTmV4dDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3RlZENvdW50IDw9IDApIHtcbiAgICAgICAgICB0aGlzLmVuYWJsZVF1ZXVlICYmIHRoaXMucXVldWUucHVzaChOb3RpZmljYXRpb24uY3JlYXRlT25OZXh0KHZhbHVlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgKHRoaXMucmVxdWVzdGVkQ291bnQtLSA9PT0gMCkgJiYgdGhpcy5kaXNwb3NlQ3VycmVudFJlcXVlc3QoKTtcbiAgICAgICAgICB0aGlzLnN1YmplY3Qub25OZXh0KHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIF9wcm9jZXNzUmVxdWVzdDogZnVuY3Rpb24gKG51bWJlck9mSXRlbXMpIHtcbiAgICAgICAgaWYgKHRoaXMuZW5hYmxlUXVldWUpIHtcbiAgICAgICAgICB3aGlsZSAodGhpcy5xdWV1ZS5sZW5ndGggPiAwICYmIChudW1iZXJPZkl0ZW1zID4gMCB8fCB0aGlzLnF1ZXVlWzBdLmtpbmQgIT09ICdOJykpIHtcbiAgICAgICAgICAgIHZhciBmaXJzdCA9IHRoaXMucXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgIGZpcnN0LmFjY2VwdCh0aGlzLnN1YmplY3QpO1xuICAgICAgICAgICAgaWYgKGZpcnN0LmtpbmQgPT09ICdOJykge1xuICAgICAgICAgICAgICBudW1iZXJPZkl0ZW1zLS07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLmRpc3Bvc2VDdXJyZW50UmVxdWVzdCgpO1xuICAgICAgICAgICAgICB0aGlzLnF1ZXVlID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bWJlck9mSXRlbXM7XG4gICAgICB9LFxuICAgICAgcmVxdWVzdDogZnVuY3Rpb24gKG51bWJlcikge1xuICAgICAgICB0aGlzLmRpc3Bvc2VDdXJyZW50UmVxdWVzdCgpO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy5yZXF1ZXN0ZWREaXNwb3NhYmxlID0gdGhpcy5zY2hlZHVsZXIuc2NoZWR1bGUobnVtYmVyLFxuICAgICAgICBmdW5jdGlvbihzLCBpKSB7XG4gICAgICAgICAgdmFyIHJlbWFpbmluZyA9IHNlbGYuX3Byb2Nlc3NSZXF1ZXN0KGkpO1xuICAgICAgICAgIHZhciBzdG9wcGVkID0gc2VsZi5oYXNDb21wbGV0ZWQgfHwgc2VsZi5oYXNGYWlsZWQ7XG4gICAgICAgICAgaWYgKCFzdG9wcGVkICYmIHJlbWFpbmluZyA+IDApIHtcbiAgICAgICAgICAgIHNlbGYucmVxdWVzdGVkQ291bnQgPSByZW1haW5pbmc7XG5cbiAgICAgICAgICAgIHJldHVybiBkaXNwb3NhYmxlQ3JlYXRlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgc2VsZi5yZXF1ZXN0ZWRDb3VudCA9IDA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgLy8gU2NoZWR1bGVkIGl0ZW0gaXMgc3RpbGwgaW4gcHJvZ3Jlc3MuIFJldHVybiBhIG5ld1xuICAgICAgICAgICAgICAvLyBkaXNwb3NhYmxlIHRvIGFsbG93IHRoZSByZXF1ZXN0IHRvIGJlIGludGVycnVwdGVkXG4gICAgICAgICAgICAgIC8vIHZpYSBkaXNwb3NlLlxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMucmVxdWVzdGVkRGlzcG9zYWJsZTtcbiAgICAgIH0sXG4gICAgICBkaXNwb3NlQ3VycmVudFJlcXVlc3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMucmVxdWVzdGVkRGlzcG9zYWJsZSkge1xuICAgICAgICAgIHRoaXMucmVxdWVzdGVkRGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gICAgICAgICAgdGhpcy5yZXF1ZXN0ZWREaXNwb3NhYmxlID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIENvbnRyb2xsZWRTdWJqZWN0O1xuICB9KE9ic2VydmFibGUpKTtcblxuICAvKipcbiAgICogQXR0YWNoZXMgYSBjb250cm9sbGVyIHRvIHRoZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHdpdGggdGhlIGFiaWxpdHkgdG8gcXVldWUuXG4gICAqIEBleGFtcGxlXG4gICAqIHZhciBzb3VyY2UgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMCkuY29udHJvbGxlZCgpO1xuICAgKiBzb3VyY2UucmVxdWVzdCgzKTsgLy8gUmVhZHMgMyB2YWx1ZXNcbiAgICogQHBhcmFtIHtib29sfSBlbmFibGVRdWV1ZSB0cnV0aHkgdmFsdWUgdG8gZGV0ZXJtaW5lIGlmIHZhbHVlcyBzaG91bGQgYmUgcXVldWVkIHBlbmRpbmcgdGhlIG5leHQgcmVxdWVzdFxuICAgKiBAcGFyYW0ge1NjaGVkdWxlcn0gc2NoZWR1bGVyIGRldGVybWluZXMgaG93IHRoZSByZXF1ZXN0cyB3aWxsIGJlIHNjaGVkdWxlZFxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gVGhlIG9ic2VydmFibGUgc2VxdWVuY2Ugd2hpY2ggb25seSBwcm9wYWdhdGVzIHZhbHVlcyBvbiByZXF1ZXN0LlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmNvbnRyb2xsZWQgPSBmdW5jdGlvbiAoZW5hYmxlUXVldWUsIHNjaGVkdWxlcikge1xuXG4gICAgaWYgKGVuYWJsZVF1ZXVlICYmIGlzU2NoZWR1bGVyKGVuYWJsZVF1ZXVlKSkge1xuICAgICAgc2NoZWR1bGVyID0gZW5hYmxlUXVldWU7XG4gICAgICBlbmFibGVRdWV1ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKGVuYWJsZVF1ZXVlID09IG51bGwpIHsgIGVuYWJsZVF1ZXVlID0gdHJ1ZTsgfVxuICAgIHJldHVybiBuZXcgQ29udHJvbGxlZE9ic2VydmFibGUodGhpcywgZW5hYmxlUXVldWUsIHNjaGVkdWxlcik7XG4gIH07XG5cbiAgdmFyIFN0b3BBbmRXYWl0T2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoU3RvcEFuZFdhaXRPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFN0b3BBbmRXYWl0T2JzZXJ2YWJsZSAoc291cmNlKSB7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjaGVkdWxlTWV0aG9kKHMsIHNlbGYpIHtcbiAgICAgIHJldHVybiBzZWxmLnNvdXJjZS5yZXF1ZXN0KDEpO1xuICAgIH1cblxuICAgIFN0b3BBbmRXYWl0T2JzZXJ2YWJsZS5wcm90b3R5cGUuX3N1YnNjcmliZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbiA9IHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgU3RvcEFuZFdhaXRPYnNlcnZlcihvLCB0aGlzLCB0aGlzLnN1YnNjcmlwdGlvbikpO1xuICAgICAgcmV0dXJuIG5ldyBCaW5hcnlEaXNwb3NhYmxlKFxuICAgICAgICB0aGlzLnN1YnNjcmlwdGlvbixcbiAgICAgICAgZGVmYXVsdFNjaGVkdWxlci5zY2hlZHVsZSh0aGlzLCBzY2hlZHVsZU1ldGhvZClcbiAgICAgICk7XG4gICAgfTtcblxuICAgIHZhciBTdG9wQW5kV2FpdE9ic2VydmVyID0gKGZ1bmN0aW9uIChfX3N1Yl9fKSB7XG4gICAgICBpbmhlcml0cyhTdG9wQW5kV2FpdE9ic2VydmVyLCBfX3N1Yl9fKTtcbiAgICAgIGZ1bmN0aW9uIFN0b3BBbmRXYWl0T2JzZXJ2ZXIgKG9ic2VydmVyLCBvYnNlcnZhYmxlLCBjYW5jZWwpIHtcbiAgICAgICAgX19zdWJfXy5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLm9ic2VydmVyID0gb2JzZXJ2ZXI7XG4gICAgICAgIHRoaXMub2JzZXJ2YWJsZSA9IG9ic2VydmFibGU7XG4gICAgICAgIHRoaXMuY2FuY2VsID0gY2FuY2VsO1xuICAgICAgICB0aGlzLnNjaGVkdWxlRGlzcG9zYWJsZSA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIFN0b3BBbmRXYWl0T2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlci5vbkNvbXBsZXRlZCgpO1xuICAgICAgICB0aGlzLmRpc3Bvc2UoKTtcbiAgICAgIH07XG5cbiAgICAgIFN0b3BBbmRXYWl0T2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXIub25FcnJvcihlcnJvcik7XG4gICAgICAgIHRoaXMuZGlzcG9zZSgpO1xuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gaW5uZXJTY2hlZHVsZU1ldGhvZChzLCBzZWxmKSB7XG4gICAgICAgIHJldHVybiBzZWxmLm9ic2VydmFibGUuc291cmNlLnJlcXVlc3QoMSk7XG4gICAgICB9XG5cbiAgICAgIFN0b3BBbmRXYWl0T2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlci5vbk5leHQodmFsdWUpO1xuICAgICAgICB0aGlzLnNjaGVkdWxlRGlzcG9zYWJsZSA9IGRlZmF1bHRTY2hlZHVsZXIuc2NoZWR1bGUodGhpcywgaW5uZXJTY2hlZHVsZU1ldGhvZCk7XG4gICAgICB9O1xuXG4gICAgICBTdG9wQW5kV2FpdE9ic2VydmVyLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXIgPSBudWxsO1xuICAgICAgICBpZiAodGhpcy5jYW5jZWwpIHtcbiAgICAgICAgICB0aGlzLmNhbmNlbC5kaXNwb3NlKCk7XG4gICAgICAgICAgdGhpcy5jYW5jZWwgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnNjaGVkdWxlRGlzcG9zYWJsZSkge1xuICAgICAgICAgIHRoaXMuc2NoZWR1bGVEaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgICAgICAgICB0aGlzLnNjaGVkdWxlRGlzcG9zYWJsZSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgX19zdWJfXy5wcm90b3R5cGUuZGlzcG9zZS5jYWxsKHRoaXMpO1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIFN0b3BBbmRXYWl0T2JzZXJ2ZXI7XG4gICAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgICByZXR1cm4gU3RvcEFuZFdhaXRPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGUpKTtcblxuXG4gIC8qKlxuICAgKiBBdHRhY2hlcyBhIHN0b3AgYW5kIHdhaXQgb2JzZXJ2YWJsZSB0byB0aGUgY3VycmVudCBvYnNlcnZhYmxlLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQSBzdG9wIGFuZCB3YWl0IG9ic2VydmFibGUuXG4gICAqL1xuICBDb250cm9sbGVkT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3RvcEFuZFdhaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBTdG9wQW5kV2FpdE9ic2VydmFibGUodGhpcyk7XG4gIH07XG5cbiAgdmFyIFdpbmRvd2VkT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoV2luZG93ZWRPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFdpbmRvd2VkT2JzZXJ2YWJsZShzb3VyY2UsIHdpbmRvd1NpemUpIHtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLndpbmRvd1NpemUgPSB3aW5kb3dTaXplO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjaGVkdWxlTWV0aG9kKHMsIHNlbGYpIHtcbiAgICAgIHJldHVybiBzZWxmLnNvdXJjZS5yZXF1ZXN0KHNlbGYud2luZG93U2l6ZSk7XG4gICAgfVxuXG4gICAgV2luZG93ZWRPYnNlcnZhYmxlLnByb3RvdHlwZS5fc3Vic2NyaWJlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9uID0gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG5ldyBXaW5kb3dlZE9ic2VydmVyKG8sIHRoaXMsIHRoaXMuc3Vic2NyaXB0aW9uKSk7XG4gICAgICByZXR1cm4gbmV3IEJpbmFyeURpc3Bvc2FibGUoXG4gICAgICAgIHRoaXMuc3Vic2NyaXB0aW9uLFxuICAgICAgICBkZWZhdWx0U2NoZWR1bGVyLnNjaGVkdWxlKHRoaXMsIHNjaGVkdWxlTWV0aG9kKVxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgdmFyIFdpbmRvd2VkT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3ViX18pIHtcbiAgICAgIGluaGVyaXRzKFdpbmRvd2VkT2JzZXJ2ZXIsIF9fc3ViX18pO1xuICAgICAgZnVuY3Rpb24gV2luZG93ZWRPYnNlcnZlcihvYnNlcnZlciwgb2JzZXJ2YWJsZSwgY2FuY2VsKSB7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXIgPSBvYnNlcnZlcjtcbiAgICAgICAgdGhpcy5vYnNlcnZhYmxlID0gb2JzZXJ2YWJsZTtcbiAgICAgICAgdGhpcy5jYW5jZWwgPSBjYW5jZWw7XG4gICAgICAgIHRoaXMucmVjZWl2ZWQgPSAwO1xuICAgICAgICB0aGlzLnNjaGVkdWxlRGlzcG9zYWJsZSA9IG51bGw7XG4gICAgICAgIF9fc3ViX18uY2FsbCh0aGlzKTtcbiAgICAgIH1cblxuICAgICAgV2luZG93ZWRPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm9ic2VydmVyLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIHRoaXMuZGlzcG9zZSgpO1xuICAgICAgfTtcblxuICAgICAgV2luZG93ZWRPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlci5vbkVycm9yKGVycm9yKTtcbiAgICAgICAgdGhpcy5kaXNwb3NlKCk7XG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiBpbm5lclNjaGVkdWxlTWV0aG9kKHMsIHNlbGYpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYub2JzZXJ2YWJsZS5zb3VyY2UucmVxdWVzdChzZWxmLm9ic2VydmFibGUud2luZG93U2l6ZSk7XG4gICAgICB9XG5cbiAgICAgIFdpbmRvd2VkT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlci5vbk5leHQodmFsdWUpO1xuICAgICAgICB0aGlzLnJlY2VpdmVkID0gKyt0aGlzLnJlY2VpdmVkICUgdGhpcy5vYnNlcnZhYmxlLndpbmRvd1NpemU7XG4gICAgICAgIHRoaXMucmVjZWl2ZWQgPT09IDAgJiYgKHRoaXMuc2NoZWR1bGVEaXNwb3NhYmxlID0gZGVmYXVsdFNjaGVkdWxlci5zY2hlZHVsZSh0aGlzLCBpbm5lclNjaGVkdWxlTWV0aG9kKSk7XG4gICAgICB9O1xuXG4gICAgICBXaW5kb3dlZE9ic2VydmVyLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm9ic2VydmVyID0gbnVsbDtcbiAgICAgICAgaWYgKHRoaXMuY2FuY2VsKSB7XG4gICAgICAgICAgdGhpcy5jYW5jZWwuZGlzcG9zZSgpO1xuICAgICAgICAgIHRoaXMuY2FuY2VsID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5zY2hlZHVsZURpc3Bvc2FibGUpIHtcbiAgICAgICAgICB0aGlzLnNjaGVkdWxlRGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gICAgICAgICAgdGhpcy5zY2hlZHVsZURpc3Bvc2FibGUgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIF9fc3ViX18ucHJvdG90eXBlLmRpc3Bvc2UuY2FsbCh0aGlzKTtcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBXaW5kb3dlZE9ic2VydmVyO1xuICAgIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gICAgcmV0dXJuIFdpbmRvd2VkT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlKSk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzbGlkaW5nIHdpbmRvd2VkIG9ic2VydmFibGUgYmFzZWQgdXBvbiB0aGUgd2luZG93IHNpemUuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB3aW5kb3dTaXplIFRoZSBudW1iZXIgb2YgaXRlbXMgaW4gdGhlIHdpbmRvd1xuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQSB3aW5kb3dlZCBvYnNlcnZhYmxlIGJhc2VkIHVwb24gdGhlIHdpbmRvdyBzaXplLlxuICAgKi9cbiAgQ29udHJvbGxlZE9ic2VydmFibGUucHJvdG90eXBlLndpbmRvd2VkID0gZnVuY3Rpb24gKHdpbmRvd1NpemUpIHtcbiAgICByZXR1cm4gbmV3IFdpbmRvd2VkT2JzZXJ2YWJsZSh0aGlzLCB3aW5kb3dTaXplKTtcbiAgfTtcblxuICAvKipcbiAgICogUGlwZXMgdGhlIGV4aXN0aW5nIE9ic2VydmFibGUgc2VxdWVuY2UgaW50byBhIE5vZGUuanMgU3RyZWFtLlxuICAgKiBAcGFyYW0ge1N0cmVhbX0gZGVzdCBUaGUgZGVzdGluYXRpb24gTm9kZS5qcyBzdHJlYW0uXG4gICAqIEByZXR1cm5zIHtTdHJlYW19IFRoZSBkZXN0aW5hdGlvbiBzdHJlYW0uXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8ucGlwZSA9IGZ1bmN0aW9uIChkZXN0KSB7XG4gICAgdmFyIHNvdXJjZSA9IHRoaXMucGF1c2FibGVCdWZmZXJlZCgpO1xuXG4gICAgZnVuY3Rpb24gb25EcmFpbigpIHtcbiAgICAgIHNvdXJjZS5yZXN1bWUoKTtcbiAgICB9XG5cbiAgICBkZXN0LmFkZExpc3RlbmVyKCdkcmFpbicsIG9uRHJhaW4pO1xuXG4gICAgc291cmNlLnN1YnNjcmliZShcbiAgICAgIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICFkZXN0LndyaXRlKHgpICYmIHNvdXJjZS5wYXVzZSgpO1xuICAgICAgfSxcbiAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgZGVzdC5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICB9LFxuICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBIYWNrIGNoZWNrIGJlY2F1c2UgU1RESU8gaXMgbm90IGNsb3NhYmxlXG4gICAgICAgICFkZXN0Ll9pc1N0ZGlvICYmIGRlc3QuZW5kKCk7XG4gICAgICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2RyYWluJywgb25EcmFpbik7XG4gICAgICB9KTtcblxuICAgIHNvdXJjZS5yZXN1bWUoKTtcblxuICAgIHJldHVybiBkZXN0O1xuICB9O1xuXG4gIHJldHVybiBSeDtcbn0pKTtcbiJdfQ==