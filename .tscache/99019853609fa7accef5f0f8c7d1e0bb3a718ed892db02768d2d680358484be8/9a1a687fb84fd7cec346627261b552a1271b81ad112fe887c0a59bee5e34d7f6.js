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
    // Refernces
    var inherits = Rx.internals.inherits, AbstractObserver = Rx.internals.AbstractObserver, Observable = Rx.Observable, observableProto = Observable.prototype, AnonymousObservable = Rx.AnonymousObservable, ObservableBase = Rx.ObservableBase, observableDefer = Observable.defer, observableEmpty = Observable.empty, observableNever = Observable.never, observableThrow = Observable['throw'], observableFromArray = Observable.fromArray, defaultScheduler = Rx.Scheduler['default'], SingleAssignmentDisposable = Rx.SingleAssignmentDisposable, SerialDisposable = Rx.SerialDisposable, CompositeDisposable = Rx.CompositeDisposable, BinaryDisposable = Rx.BinaryDisposable, RefCountDisposable = Rx.RefCountDisposable, Subject = Rx.Subject, addRef = Rx.internals.addRef, normalizeTime = Rx.Scheduler.normalize, helpers = Rx.helpers, isPromise = helpers.isPromise, isFunction = helpers.isFunction, isScheduler = Rx.Scheduler.isScheduler, observableFromPromise = Observable.fromPromise;
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
    var TimerObservable = (function (__super__) {
        inherits(TimerObservable, __super__);
        function TimerObservable(dt, s) {
            this._dt = dt;
            this._s = s;
            __super__.call(this);
        }
        TimerObservable.prototype.subscribeCore = function (o) {
            return this._s.scheduleFuture(o, this._dt, scheduleMethod);
        };
        function scheduleMethod(s, o) {
            o.onNext(0);
            o.onCompleted();
        }
        return TimerObservable;
    }(ObservableBase));
    function _observableTimer(dueTime, scheduler) {
        return new TimerObservable(dueTime, scheduler);
    }
    function observableTimerDateAndPeriod(dueTime, period, scheduler) {
        return new AnonymousObservable(function (observer) {
            var d = dueTime, p = normalizeTime(period);
            return scheduler.scheduleRecursiveFuture(0, d, function (count, self) {
                if (p > 0) {
                    var now = scheduler.now();
                    d = new Date(d.getTime() + p);
                    d.getTime() <= now && (d = new Date(now + p));
                }
                observer.onNext(count);
                self(count + 1, new Date(d));
            });
        });
    }
    function observableTimerTimeSpanAndPeriod(dueTime, period, scheduler) {
        return dueTime === period ?
            new AnonymousObservable(function (observer) {
                return scheduler.schedulePeriodic(0, period, function (count) {
                    observer.onNext(count);
                    return count + 1;
                });
            }) :
            observableDefer(function () {
                return observableTimerDateAndPeriod(new Date(scheduler.now() + dueTime), period, scheduler);
            });
    }
    /**
     *  Returns an observable sequence that produces a value after each period.
     *
     * @example
     *  1 - res = Rx.Observable.interval(1000);
     *  2 - res = Rx.Observable.interval(1000, Rx.Scheduler.timeout);
     *
     * @param {Number} period Period for producing the values in the resulting sequence (specified as an integer denoting milliseconds).
     * @param {Scheduler} [scheduler] Scheduler to run the timer on. If not specified, Rx.Scheduler.timeout is used.
     * @returns {Observable} An observable sequence that produces a value after each period.
     */
    var observableinterval = Observable.interval = function (period, scheduler) {
        return observableTimerTimeSpanAndPeriod(period, period, isScheduler(scheduler) ? scheduler : defaultScheduler);
    };
    /**
     *  Returns an observable sequence that produces a value after dueTime has elapsed and then after each period.
     * @param {Number} dueTime Absolute (specified as a Date object) or relative time (specified as an integer denoting milliseconds) at which to produce the first value.
     * @param {Mixed} [periodOrScheduler]  Period to produce subsequent values (specified as an integer denoting milliseconds), or the scheduler to run the timer on. If not specified, the resulting timer is not recurring.
     * @param {Scheduler} [scheduler]  Scheduler to run the timer on. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence that produces a value after due time has elapsed and then each period.
     */
    var observableTimer = Observable.timer = function (dueTime, periodOrScheduler, scheduler) {
        var period;
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        if (periodOrScheduler != null && typeof periodOrScheduler === 'number') {
            period = periodOrScheduler;
        }
        else if (isScheduler(periodOrScheduler)) {
            scheduler = periodOrScheduler;
        }
        if ((dueTime instanceof Date || typeof dueTime === 'number') && period === undefined) {
            return _observableTimer(dueTime, scheduler);
        }
        if (dueTime instanceof Date && period !== undefined) {
            return observableTimerDateAndPeriod(dueTime, periodOrScheduler, scheduler);
        }
        return observableTimerTimeSpanAndPeriod(dueTime, period, scheduler);
    };
    function observableDelayRelative(source, dueTime, scheduler) {
        return new AnonymousObservable(function (o) {
            var active = false, cancelable = new SerialDisposable(), exception = null, q = [], running = false, subscription;
            subscription = source.materialize().timestamp(scheduler).subscribe(function (notification) {
                var d, shouldRun;
                if (notification.value.kind === 'E') {
                    q = [];
                    q.push(notification);
                    exception = notification.value.error;
                    shouldRun = !running;
                }
                else {
                    q.push({ value: notification.value, timestamp: notification.timestamp + dueTime });
                    shouldRun = !active;
                    active = true;
                }
                if (shouldRun) {
                    if (exception !== null) {
                        o.onError(exception);
                    }
                    else {
                        d = new SingleAssignmentDisposable();
                        cancelable.setDisposable(d);
                        d.setDisposable(scheduler.scheduleRecursiveFuture(null, dueTime, function (_, self) {
                            var e, recurseDueTime, result, shouldRecurse;
                            if (exception !== null) {
                                return;
                            }
                            running = true;
                            do {
                                result = null;
                                if (q.length > 0 && q[0].timestamp - scheduler.now() <= 0) {
                                    result = q.shift().value;
                                }
                                if (result !== null) {
                                    result.accept(o);
                                }
                            } while (result !== null);
                            shouldRecurse = false;
                            recurseDueTime = 0;
                            if (q.length > 0) {
                                shouldRecurse = true;
                                recurseDueTime = Math.max(0, q[0].timestamp - scheduler.now());
                            }
                            else {
                                active = false;
                            }
                            e = exception;
                            running = false;
                            if (e !== null) {
                                o.onError(e);
                            }
                            else if (shouldRecurse) {
                                self(null, recurseDueTime);
                            }
                        }));
                    }
                }
            });
            return new BinaryDisposable(subscription, cancelable);
        }, source);
    }
    function observableDelayAbsolute(source, dueTime, scheduler) {
        return observableDefer(function () {
            return observableDelayRelative(source, dueTime - scheduler.now(), scheduler);
        });
    }
    function delayWithSelector(source, subscriptionDelay, delayDurationSelector) {
        var subDelay, selector;
        if (isFunction(subscriptionDelay)) {
            selector = subscriptionDelay;
        }
        else {
            subDelay = subscriptionDelay;
            selector = delayDurationSelector;
        }
        return new AnonymousObservable(function (o) {
            var delays = new CompositeDisposable(), atEnd = false, subscription = new SerialDisposable();
            function start() {
                subscription.setDisposable(source.subscribe(function (x) {
                    var delay = tryCatch(selector)(x);
                    if (delay === errorObj) {
                        return o.onError(delay.e);
                    }
                    var d = new SingleAssignmentDisposable();
                    delays.add(d);
                    d.setDisposable(delay.subscribe(function () {
                        o.onNext(x);
                        delays.remove(d);
                        done();
                    }, function (e) { o.onError(e); }, function () {
                        o.onNext(x);
                        delays.remove(d);
                        done();
                    }));
                }, function (e) { o.onError(e); }, function () {
                    atEnd = true;
                    subscription.dispose();
                    done();
                }));
            }
            function done() {
                atEnd && delays.length === 0 && o.onCompleted();
            }
            if (!subDelay) {
                start();
            }
            else {
                subscription.setDisposable(subDelay.subscribe(start, function (e) { o.onError(e); }, start));
            }
            return new BinaryDisposable(subscription, delays);
        }, source);
    }
    /**
     *  Time shifts the observable sequence by dueTime.
     *  The relative time intervals between the values are preserved.
     *
     * @param {Number} dueTime Absolute (specified as a Date object) or relative time (specified as an integer denoting milliseconds) by which to shift the observable sequence.
     * @param {Scheduler} [scheduler] Scheduler to run the delay timers on. If not specified, the timeout scheduler is used.
     * @returns {Observable} Time-shifted sequence.
     */
    observableProto.delay = function () {
        var firstArg = arguments[0];
        if (typeof firstArg === 'number' || firstArg instanceof Date) {
            var dueTime = firstArg, scheduler = arguments[1];
            isScheduler(scheduler) || (scheduler = defaultScheduler);
            return dueTime instanceof Date ?
                observableDelayAbsolute(this, dueTime, scheduler) :
                observableDelayRelative(this, dueTime, scheduler);
        }
        else if (Observable.isObservable(firstArg) || isFunction(firstArg)) {
            return delayWithSelector(this, firstArg, arguments[1]);
        }
        else {
            throw new Error('Invalid arguments');
        }
    };
    var DebounceObservable = (function (__super__) {
        inherits(DebounceObservable, __super__);
        function DebounceObservable(source, dt, s) {
            isScheduler(s) || (s = defaultScheduler);
            this.source = source;
            this._dt = dt;
            this._s = s;
            __super__.call(this);
        }
        DebounceObservable.prototype.subscribeCore = function (o) {
            var cancelable = new SerialDisposable();
            return new BinaryDisposable(this.source.subscribe(new DebounceObserver(o, this._dt, this._s, cancelable)), cancelable);
        };
        return DebounceObservable;
    }(ObservableBase));
    var DebounceObserver = (function (__super__) {
        inherits(DebounceObserver, __super__);
        function DebounceObserver(observer, dueTime, scheduler, cancelable) {
            this._o = observer;
            this._d = dueTime;
            this._scheduler = scheduler;
            this._c = cancelable;
            this._v = null;
            this._hv = false;
            this._id = 0;
            __super__.call(this);
        }
        function scheduleFuture(s, state) {
            state.self._hv && state.self._id === state.currentId && state.self._o.onNext(state.x);
            state.self._hv = false;
        }
        DebounceObserver.prototype.next = function (x) {
            this._hv = true;
            this._v = x;
            var currentId = ++this._id, d = new SingleAssignmentDisposable();
            this._c.setDisposable(d);
            d.setDisposable(this._scheduler.scheduleFuture(this, this._d, function (_, self) {
                self._hv && self._id === currentId && self._o.onNext(x);
                self._hv = false;
            }));
        };
        DebounceObserver.prototype.error = function (e) {
            this._c.dispose();
            this._o.onError(e);
            this._hv = false;
            this._id++;
        };
        DebounceObserver.prototype.completed = function () {
            this._c.dispose();
            this._hv && this._o.onNext(this._v);
            this._o.onCompleted();
            this._hv = false;
            this._id++;
        };
        return DebounceObserver;
    }(AbstractObserver));
    function debounceWithSelector(source, durationSelector) {
        return new AnonymousObservable(function (o) {
            var value, hasValue = false, cancelable = new SerialDisposable(), id = 0;
            var subscription = source.subscribe(function (x) {
                var throttle = tryCatch(durationSelector)(x);
                if (throttle === errorObj) {
                    return o.onError(throttle.e);
                }
                isPromise(throttle) && (throttle = observableFromPromise(throttle));
                hasValue = true;
                value = x;
                id++;
                var currentid = id, d = new SingleAssignmentDisposable();
                cancelable.setDisposable(d);
                d.setDisposable(throttle.subscribe(function () {
                    hasValue && id === currentid && o.onNext(value);
                    hasValue = false;
                    d.dispose();
                }, function (e) { o.onError(e); }, function () {
                    hasValue && id === currentid && o.onNext(value);
                    hasValue = false;
                    d.dispose();
                }));
            }, function (e) {
                cancelable.dispose();
                o.onError(e);
                hasValue = false;
                id++;
            }, function () {
                cancelable.dispose();
                hasValue && o.onNext(value);
                o.onCompleted();
                hasValue = false;
                id++;
            });
            return new BinaryDisposable(subscription, cancelable);
        }, source);
    }
    observableProto.debounce = function () {
        if (isFunction(arguments[0])) {
            return debounceWithSelector(this, arguments[0]);
        }
        else if (typeof arguments[0] === 'number') {
            return new DebounceObservable(this, arguments[0], arguments[1]);
        }
        else {
            throw new Error('Invalid arguments');
        }
    };
    /**
     *  Projects each element of an observable sequence into zero or more windows which are produced based on timing information.
     * @param {Number} timeSpan Length of each window (specified as an integer denoting milliseconds).
     * @param {Mixed} [timeShiftOrScheduler]  Interval between creation of consecutive windows (specified as an integer denoting milliseconds), or an optional scheduler parameter. If not specified, the time shift corresponds to the timeSpan parameter, resulting in non-overlapping adjacent windows.
     * @param {Scheduler} [scheduler]  Scheduler to run windowing timers on. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence of windows.
     */
    observableProto.windowWithTime = observableProto.windowTime = function (timeSpan, timeShiftOrScheduler, scheduler) {
        var source = this, timeShift;
        timeShiftOrScheduler == null && (timeShift = timeSpan);
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        if (typeof timeShiftOrScheduler === 'number') {
            timeShift = timeShiftOrScheduler;
        }
        else if (isScheduler(timeShiftOrScheduler)) {
            timeShift = timeSpan;
            scheduler = timeShiftOrScheduler;
        }
        return new AnonymousObservable(function (observer) {
            var groupDisposable, nextShift = timeShift, nextSpan = timeSpan, q = [], refCountDisposable, timerD = new SerialDisposable(), totalTime = 0;
            groupDisposable = new CompositeDisposable(timerD),
                refCountDisposable = new RefCountDisposable(groupDisposable);
            function createTimer() {
                var m = new SingleAssignmentDisposable(), isSpan = false, isShift = false;
                timerD.setDisposable(m);
                if (nextSpan === nextShift) {
                    isSpan = true;
                    isShift = true;
                }
                else if (nextSpan < nextShift) {
                    isSpan = true;
                }
                else {
                    isShift = true;
                }
                var newTotalTime = isSpan ? nextSpan : nextShift, ts = newTotalTime - totalTime;
                totalTime = newTotalTime;
                if (isSpan) {
                    nextSpan += timeShift;
                }
                if (isShift) {
                    nextShift += timeShift;
                }
                m.setDisposable(scheduler.scheduleFuture(null, ts, function () {
                    if (isShift) {
                        var s = new Subject();
                        q.push(s);
                        observer.onNext(addRef(s, refCountDisposable));
                    }
                    isSpan && q.shift().onCompleted();
                    createTimer();
                }));
            }
            ;
            q.push(new Subject());
            observer.onNext(addRef(q[0], refCountDisposable));
            createTimer();
            groupDisposable.add(source.subscribe(function (x) {
                for (var i = 0, len = q.length; i < len; i++) {
                    q[i].onNext(x);
                }
            }, function (e) {
                for (var i = 0, len = q.length; i < len; i++) {
                    q[i].onError(e);
                }
                observer.onError(e);
            }, function () {
                for (var i = 0, len = q.length; i < len; i++) {
                    q[i].onCompleted();
                }
                observer.onCompleted();
            }));
            return refCountDisposable;
        }, source);
    };
    /**
     *  Projects each element of an observable sequence into a window that is completed when either it's full or a given amount of time has elapsed.
     * @param {Number} timeSpan Maximum time length of a window.
     * @param {Number} count Maximum element count of a window.
     * @param {Scheduler} [scheduler]  Scheduler to run windowing timers on. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence of windows.
     */
    observableProto.windowWithTimeOrCount = observableProto.windowTimeOrCount = function (timeSpan, count, scheduler) {
        var source = this;
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return new AnonymousObservable(function (observer) {
            var timerD = new SerialDisposable(), groupDisposable = new CompositeDisposable(timerD), refCountDisposable = new RefCountDisposable(groupDisposable), n = 0, windowId = 0, s = new Subject();
            function createTimer(id) {
                var m = new SingleAssignmentDisposable();
                timerD.setDisposable(m);
                m.setDisposable(scheduler.scheduleFuture(null, timeSpan, function () {
                    if (id !== windowId) {
                        return;
                    }
                    n = 0;
                    var newId = ++windowId;
                    s.onCompleted();
                    s = new Subject();
                    observer.onNext(addRef(s, refCountDisposable));
                    createTimer(newId);
                }));
            }
            observer.onNext(addRef(s, refCountDisposable));
            createTimer(0);
            groupDisposable.add(source.subscribe(function (x) {
                var newId = 0, newWindow = false;
                s.onNext(x);
                if (++n === count) {
                    newWindow = true;
                    n = 0;
                    newId = ++windowId;
                    s.onCompleted();
                    s = new Subject();
                    observer.onNext(addRef(s, refCountDisposable));
                }
                newWindow && createTimer(newId);
            }, function (e) {
                s.onError(e);
                observer.onError(e);
            }, function () {
                s.onCompleted();
                observer.onCompleted();
            }));
            return refCountDisposable;
        }, source);
    };
    function toArray(x) { return x.toArray(); }
    /**
     *  Projects each element of an observable sequence into zero or more buffers which are produced based on timing information.
     * @param {Number} timeSpan Length of each buffer (specified as an integer denoting milliseconds).
     * @param {Mixed} [timeShiftOrScheduler]  Interval between creation of consecutive buffers (specified as an integer denoting milliseconds), or an optional scheduler parameter. If not specified, the time shift corresponds to the timeSpan parameter, resulting in non-overlapping adjacent buffers.
     * @param {Scheduler} [scheduler]  Scheduler to run buffer timers on. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence of buffers.
     */
    observableProto.bufferWithTime = observableProto.bufferTime = function (timeSpan, timeShiftOrScheduler, scheduler) {
        return this.windowWithTime(timeSpan, timeShiftOrScheduler, scheduler).flatMap(toArray);
    };
    function toArray(x) { return x.toArray(); }
    /**
     *  Projects each element of an observable sequence into a buffer that is completed when either it's full or a given amount of time has elapsed.
     * @param {Number} timeSpan Maximum time length of a buffer.
     * @param {Number} count Maximum element count of a buffer.
     * @param {Scheduler} [scheduler]  Scheduler to run bufferin timers on. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence of buffers.
     */
    observableProto.bufferWithTimeOrCount = observableProto.bufferTimeOrCount = function (timeSpan, count, scheduler) {
        return this.windowWithTimeOrCount(timeSpan, count, scheduler).flatMap(toArray);
    };
    var TimeIntervalObservable = (function (__super__) {
        inherits(TimeIntervalObservable, __super__);
        function TimeIntervalObservable(source, s) {
            this.source = source;
            this._s = s;
            __super__.call(this);
        }
        TimeIntervalObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new TimeIntervalObserver(o, this._s));
        };
        return TimeIntervalObservable;
    }(ObservableBase));
    var TimeIntervalObserver = (function (__super__) {
        inherits(TimeIntervalObserver, __super__);
        function TimeIntervalObserver(o, s) {
            this._o = o;
            this._s = s;
            this._l = s.now();
            __super__.call(this);
        }
        TimeIntervalObserver.prototype.next = function (x) {
            var now = this._s.now(), span = now - this._l;
            this._l = now;
            this._o.onNext({ value: x, interval: span });
        };
        TimeIntervalObserver.prototype.error = function (e) { this._o.onError(e); };
        TimeIntervalObserver.prototype.completed = function () { this._o.onCompleted(); };
        return TimeIntervalObserver;
    }(AbstractObserver));
    /**
     *  Records the time interval between consecutive values in an observable sequence.
     *
     * @example
     *  1 - res = source.timeInterval();
     *  2 - res = source.timeInterval(Rx.Scheduler.timeout);
     *
     * @param [scheduler]  Scheduler used to compute time intervals. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence with time interval information on values.
     */
    observableProto.timeInterval = function (scheduler) {
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return new TimeIntervalObservable(this, scheduler);
    };
    var TimestampObservable = (function (__super__) {
        inherits(TimestampObservable, __super__);
        function TimestampObservable(source, s) {
            this.source = source;
            this._s = s;
            __super__.call(this);
        }
        TimestampObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new TimestampObserver(o, this._s));
        };
        return TimestampObservable;
    }(ObservableBase));
    var TimestampObserver = (function (__super__) {
        inherits(TimestampObserver, __super__);
        function TimestampObserver(o, s) {
            this._o = o;
            this._s = s;
            __super__.call(this);
        }
        TimestampObserver.prototype.next = function (x) {
            this._o.onNext({ value: x, timestamp: this._s.now() });
        };
        TimestampObserver.prototype.error = function (e) {
            this._o.onError(e);
        };
        TimestampObserver.prototype.completed = function () {
            this._o.onCompleted();
        };
        return TimestampObserver;
    }(AbstractObserver));
    /**
     *  Records the timestamp for each value in an observable sequence.
     *
     * @example
     *  1 - res = source.timestamp(); // produces { value: x, timestamp: ts }
     *  2 - res = source.timestamp(Rx.Scheduler.default);
     *
     * @param {Scheduler} [scheduler]  Scheduler used to compute timestamps. If not specified, the default scheduler is used.
     * @returns {Observable} An observable sequence with timestamp information on values.
     */
    observableProto.timestamp = function (scheduler) {
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return new TimestampObservable(this, scheduler);
    };
    var SampleObservable = (function (__super__) {
        inherits(SampleObservable, __super__);
        function SampleObservable(source, sampler) {
            this.source = source;
            this._sampler = sampler;
            __super__.call(this);
        }
        SampleObservable.prototype.subscribeCore = function (o) {
            var state = {
                o: o,
                atEnd: false,
                value: null,
                hasValue: false,
                sourceSubscription: new SingleAssignmentDisposable()
            };
            state.sourceSubscription.setDisposable(this.source.subscribe(new SampleSourceObserver(state)));
            return new BinaryDisposable(state.sourceSubscription, this._sampler.subscribe(new SamplerObserver(state)));
        };
        return SampleObservable;
    }(ObservableBase));
    var SamplerObserver = (function (__super__) {
        inherits(SamplerObserver, __super__);
        function SamplerObserver(s) {
            this._s = s;
            __super__.call(this);
        }
        SamplerObserver.prototype._handleMessage = function () {
            if (this._s.hasValue) {
                this._s.hasValue = false;
                this._s.o.onNext(this._s.value);
            }
            this._s.atEnd && this._s.o.onCompleted();
        };
        SamplerObserver.prototype.next = function () { this._handleMessage(); };
        SamplerObserver.prototype.error = function (e) { this._s.onError(e); };
        SamplerObserver.prototype.completed = function () { this._handleMessage(); };
        return SamplerObserver;
    }(AbstractObserver));
    var SampleSourceObserver = (function (__super__) {
        inherits(SampleSourceObserver, __super__);
        function SampleSourceObserver(s) {
            this._s = s;
            __super__.call(this);
        }
        SampleSourceObserver.prototype.next = function (x) {
            this._s.hasValue = true;
            this._s.value = x;
        };
        SampleSourceObserver.prototype.error = function (e) { this._s.o.onError(e); };
        SampleSourceObserver.prototype.completed = function () {
            this._s.atEnd = true;
            this._s.sourceSubscription.dispose();
        };
        return SampleSourceObserver;
    }(AbstractObserver));
    /**
     *  Samples the observable sequence at each interval.
     *
     * @example
     *  1 - res = source.sample(sampleObservable); // Sampler tick sequence
     *  2 - res = source.sample(5000); // 5 seconds
     *  2 - res = source.sample(5000, Rx.Scheduler.timeout); // 5 seconds
     *
     * @param {Mixed} intervalOrSampler Interval at which to sample (specified as an integer denoting milliseconds) or Sampler Observable.
     * @param {Scheduler} [scheduler]  Scheduler to run the sampling timer on. If not specified, the timeout scheduler is used.
     * @returns {Observable} Sampled observable sequence.
     */
    observableProto.sample = function (intervalOrSampler, scheduler) {
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return typeof intervalOrSampler === 'number' ?
            new SampleObservable(this, observableinterval(intervalOrSampler, scheduler)) :
            new SampleObservable(this, intervalOrSampler);
    };
    var TimeoutError = Rx.TimeoutError = function (message) {
        this.message = message || 'Timeout has occurred';
        this.name = 'TimeoutError';
        Error.call(this);
    };
    TimeoutError.prototype = Object.create(Error.prototype);
    function timeoutWithSelector(source, firstTimeout, timeoutDurationSelector, other) {
        if (isFunction(firstTimeout)) {
            other = timeoutDurationSelector;
            timeoutDurationSelector = firstTimeout;
            firstTimeout = observableNever();
        }
        Observable.isObservable(other) || (other = observableThrow(new TimeoutError()));
        return new AnonymousObservable(function (o) {
            var subscription = new SerialDisposable(), timer = new SerialDisposable(), original = new SingleAssignmentDisposable();
            subscription.setDisposable(original);
            var id = 0, switched = false;
            function setTimer(timeout) {
                var myId = id, d = new SingleAssignmentDisposable();
                function timerWins() {
                    switched = (myId === id);
                    return switched;
                }
                timer.setDisposable(d);
                d.setDisposable(timeout.subscribe(function () {
                    timerWins() && subscription.setDisposable(other.subscribe(o));
                    d.dispose();
                }, function (e) {
                    timerWins() && o.onError(e);
                }, function () {
                    timerWins() && subscription.setDisposable(other.subscribe(o));
                }));
            }
            ;
            setTimer(firstTimeout);
            function oWins() {
                var res = !switched;
                if (res) {
                    id++;
                }
                return res;
            }
            original.setDisposable(source.subscribe(function (x) {
                if (oWins()) {
                    o.onNext(x);
                    var timeout = tryCatch(timeoutDurationSelector)(x);
                    if (timeout === errorObj) {
                        return o.onError(timeout.e);
                    }
                    setTimer(isPromise(timeout) ? observableFromPromise(timeout) : timeout);
                }
            }, function (e) {
                oWins() && o.onError(e);
            }, function () {
                oWins() && o.onCompleted();
            }));
            return new BinaryDisposable(subscription, timer);
        }, source);
    }
    function timeout(source, dueTime, other, scheduler) {
        if (isScheduler(other)) {
            scheduler = other;
            other = observableThrow(new TimeoutError());
        }
        if (other instanceof Error) {
            other = observableThrow(other);
        }
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        Observable.isObservable(other) || (other = observableThrow(new TimeoutError()));
        return new AnonymousObservable(function (o) {
            var id = 0, original = new SingleAssignmentDisposable(), subscription = new SerialDisposable(), switched = false, timer = new SerialDisposable();
            subscription.setDisposable(original);
            function createTimer() {
                var myId = id;
                timer.setDisposable(scheduler.scheduleFuture(null, dueTime, function () {
                    switched = id === myId;
                    if (switched) {
                        isPromise(other) && (other = observableFromPromise(other));
                        subscription.setDisposable(other.subscribe(o));
                    }
                }));
            }
            createTimer();
            original.setDisposable(source.subscribe(function (x) {
                if (!switched) {
                    id++;
                    o.onNext(x);
                    createTimer();
                }
            }, function (e) {
                if (!switched) {
                    id++;
                    o.onError(e);
                }
            }, function () {
                if (!switched) {
                    id++;
                    o.onCompleted();
                }
            }));
            return new BinaryDisposable(subscription, timer);
        }, source);
    }
    observableProto.timeout = function () {
        var firstArg = arguments[0];
        if (firstArg instanceof Date || typeof firstArg === 'number') {
            return timeout(this, firstArg, arguments[1], arguments[2]);
        }
        else if (Observable.isObservable(firstArg) || isFunction(firstArg)) {
            return timeoutWithSelector(this, firstArg, arguments[1], arguments[2]);
        }
        else {
            throw new Error('Invalid arguments');
        }
    };
    var GenerateAbsoluteObservable = (function (__super__) {
        inherits(GenerateAbsoluteObservable, __super__);
        function GenerateAbsoluteObservable(state, cndFn, itrFn, resFn, timeFn, s) {
            this._state = state;
            this._cndFn = cndFn;
            this._itrFn = itrFn;
            this._resFn = resFn;
            this._timeFn = timeFn;
            this._s = s;
            __super__.call(this);
        }
        function scheduleRecursive(state, recurse) {
            state.hasResult && state.o.onNext(state.result);
            if (state.first) {
                state.first = false;
            }
            else {
                state.newState = tryCatch(state.self._itrFn)(state.newState);
                if (state.newState === errorObj) {
                    return state.o.onError(state.newState.e);
                }
            }
            state.hasResult = tryCatch(state.self._cndFn)(state.newState);
            if (state.hasResult === errorObj) {
                return state.o.onError(state.hasResult.e);
            }
            if (state.hasResult) {
                state.result = tryCatch(state.self._resFn)(state.newState);
                if (state.result === errorObj) {
                    return state.o.onError(state.result.e);
                }
                var time = tryCatch(state.self._timeFn)(state.newState);
                if (time === errorObj) {
                    return state.o.onError(time.e);
                }
                recurse(state, time);
            }
            else {
                state.o.onCompleted();
            }
        }
        GenerateAbsoluteObservable.prototype.subscribeCore = function (o) {
            var state = {
                o: o,
                self: this,
                newState: this._state,
                first: true,
                hasResult: false
            };
            return this._s.scheduleRecursiveFuture(state, new Date(this._s.now()), scheduleRecursive);
        };
        return GenerateAbsoluteObservable;
    }(ObservableBase));
    /**
     *  GenerateAbsolutes an observable sequence by iterating a state from an initial state until the condition fails.
     *
     * @example
     *  res = source.generateWithAbsoluteTime(0,
     *      function (x) { return return true; },
     *      function (x) { return x + 1; },
     *      function (x) { return x; },
     *      function (x) { return new Date(); }
     *  });
     *
     * @param {Mixed} initialState Initial state.
     * @param {Function} condition Condition to terminate generation (upon returning false).
     * @param {Function} iterate Iteration step function.
     * @param {Function} resultSelector Selector function for results produced in the sequence.
     * @param {Function} timeSelector Time selector function to control the speed of values being produced each iteration, returning Date values.
     * @param {Scheduler} [scheduler]  Scheduler on which to run the generator loop. If not specified, the timeout scheduler is used.
     * @returns {Observable} The generated sequence.
     */
    Observable.generateWithAbsoluteTime = function (initialState, condition, iterate, resultSelector, timeSelector, scheduler) {
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return new GenerateAbsoluteObservable(initialState, condition, iterate, resultSelector, timeSelector, scheduler);
    };
    var GenerateRelativeObservable = (function (__super__) {
        inherits(GenerateRelativeObservable, __super__);
        function GenerateRelativeObservable(state, cndFn, itrFn, resFn, timeFn, s) {
            this._state = state;
            this._cndFn = cndFn;
            this._itrFn = itrFn;
            this._resFn = resFn;
            this._timeFn = timeFn;
            this._s = s;
            __super__.call(this);
        }
        function scheduleRecursive(state, recurse) {
            state.hasResult && state.o.onNext(state.result);
            if (state.first) {
                state.first = false;
            }
            else {
                state.newState = tryCatch(state.self._itrFn)(state.newState);
                if (state.newState === errorObj) {
                    return state.o.onError(state.newState.e);
                }
            }
            state.hasResult = tryCatch(state.self._cndFn)(state.newState);
            if (state.hasResult === errorObj) {
                return state.o.onError(state.hasResult.e);
            }
            if (state.hasResult) {
                state.result = tryCatch(state.self._resFn)(state.newState);
                if (state.result === errorObj) {
                    return state.o.onError(state.result.e);
                }
                var time = tryCatch(state.self._timeFn)(state.newState);
                if (time === errorObj) {
                    return state.o.onError(time.e);
                }
                recurse(state, time);
            }
            else {
                state.o.onCompleted();
            }
        }
        GenerateRelativeObservable.prototype.subscribeCore = function (o) {
            var state = {
                o: o,
                self: this,
                newState: this._state,
                first: true,
                hasResult: false
            };
            return this._s.scheduleRecursiveFuture(state, 0, scheduleRecursive);
        };
        return GenerateRelativeObservable;
    }(ObservableBase));
    /**
     *  Generates an observable sequence by iterating a state from an initial state until the condition fails.
     *
     * @example
     *  res = source.generateWithRelativeTime(0,
     *      function (x) { return return true; },
     *      function (x) { return x + 1; },
     *      function (x) { return x; },
     *      function (x) { return 500; }
     *  );
     *
     * @param {Mixed} initialState Initial state.
     * @param {Function} condition Condition to terminate generation (upon returning false).
     * @param {Function} iterate Iteration step function.
     * @param {Function} resultSelector Selector function for results produced in the sequence.
     * @param {Function} timeSelector Time selector function to control the speed of values being produced each iteration, returning integer values denoting milliseconds.
     * @param {Scheduler} [scheduler]  Scheduler on which to run the generator loop. If not specified, the timeout scheduler is used.
     * @returns {Observable} The generated sequence.
     */
    Observable.generateWithRelativeTime = function (initialState, condition, iterate, resultSelector, timeSelector, scheduler) {
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return new GenerateRelativeObservable(initialState, condition, iterate, resultSelector, timeSelector, scheduler);
    };
    var DelaySubscription = (function (__super__) {
        inherits(DelaySubscription, __super__);
        function DelaySubscription(source, dt, s) {
            this.source = source;
            this._dt = dt;
            this._s = s;
            __super__.call(this);
        }
        DelaySubscription.prototype.subscribeCore = function (o) {
            var d = new SerialDisposable();
            d.setDisposable(this._s.scheduleFuture([this.source, o, d], this._dt, scheduleMethod));
            return d;
        };
        function scheduleMethod(s, state) {
            var source = state[0], o = state[1], d = state[2];
            d.setDisposable(source.subscribe(o));
        }
        return DelaySubscription;
    }(ObservableBase));
    /**
     *  Time shifts the observable sequence by delaying the subscription with the specified relative time duration, using the specified scheduler to run timers.
     *
     * @example
     *  1 - res = source.delaySubscription(5000); // 5s
     *  2 - res = source.delaySubscription(5000, Rx.Scheduler.default); // 5 seconds
     *
     * @param {Number} dueTime Relative or absolute time shift of the subscription.
     * @param {Scheduler} [scheduler]  Scheduler to run the subscription delay timer on. If not specified, the timeout scheduler is used.
     * @returns {Observable} Time-shifted sequence.
     */
    observableProto.delaySubscription = function (dueTime, scheduler) {
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return new DelaySubscription(this, dueTime, scheduler);
    };
    var SkipLastWithTimeObservable = (function (__super__) {
        inherits(SkipLastWithTimeObservable, __super__);
        function SkipLastWithTimeObservable(source, d, s) {
            this.source = source;
            this._d = d;
            this._s = s;
            __super__.call(this);
        }
        SkipLastWithTimeObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new SkipLastWithTimeObserver(o, this));
        };
        return SkipLastWithTimeObservable;
    }(ObservableBase));
    var SkipLastWithTimeObserver = (function (__super__) {
        inherits(SkipLastWithTimeObserver, __super__);
        function SkipLastWithTimeObserver(o, p) {
            this._o = o;
            this._s = p._s;
            this._d = p._d;
            this._q = [];
            __super__.call(this);
        }
        SkipLastWithTimeObserver.prototype.next = function (x) {
            var now = this._s.now();
            this._q.push({ interval: now, value: x });
            while (this._q.length > 0 && now - this._q[0].interval >= this._d) {
                this._o.onNext(this._q.shift().value);
            }
        };
        SkipLastWithTimeObserver.prototype.error = function (e) { this._o.onError(e); };
        SkipLastWithTimeObserver.prototype.completed = function () {
            var now = this._s.now();
            while (this._q.length > 0 && now - this._q[0].interval >= this._d) {
                this._o.onNext(this._q.shift().value);
            }
            this._o.onCompleted();
        };
        return SkipLastWithTimeObserver;
    }(AbstractObserver));
    /**
     *  Skips elements for the specified duration from the end of the observable source sequence, using the specified scheduler to run timers.
     * @description
     *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
     *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
     *  result sequence. This causes elements to be delayed with duration.
     * @param {Number} duration Duration for skipping elements from the end of the sequence.
     * @param {Scheduler} [scheduler]  Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout
     * @returns {Observable} An observable sequence with the elements skipped during the specified duration from the end of the source sequence.
     */
    observableProto.skipLastWithTime = function (duration, scheduler) {
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return new SkipLastWithTimeObservable(this, duration, scheduler);
    };
    var TakeLastWithTimeObservable = (function (__super__) {
        inherits(TakeLastWithTimeObservable, __super__);
        function TakeLastWithTimeObservable(source, d, s) {
            this.source = source;
            this._d = d;
            this._s = s;
            __super__.call(this);
        }
        TakeLastWithTimeObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new TakeLastWithTimeObserver(o, this._d, this._s));
        };
        return TakeLastWithTimeObservable;
    }(ObservableBase));
    var TakeLastWithTimeObserver = (function (__super__) {
        inherits(TakeLastWithTimeObserver, __super__);
        function TakeLastWithTimeObserver(o, d, s) {
            this._o = o;
            this._d = d;
            this._s = s;
            this._q = [];
            __super__.call(this);
        }
        TakeLastWithTimeObserver.prototype.next = function (x) {
            var now = this._s.now();
            this._q.push({ interval: now, value: x });
            while (this._q.length > 0 && now - this._q[0].interval >= this._d) {
                this._q.shift();
            }
        };
        TakeLastWithTimeObserver.prototype.error = function (e) { this._o.onError(e); };
        TakeLastWithTimeObserver.prototype.completed = function () {
            var now = this._s.now();
            while (this._q.length > 0) {
                var next = this._q.shift();
                if (now - next.interval <= this._d) {
                    this._o.onNext(next.value);
                }
            }
            this._o.onCompleted();
        };
        return TakeLastWithTimeObserver;
    }(AbstractObserver));
    /**
     *  Returns elements within the specified duration from the end of the observable source sequence, using the specified schedulers to run timers and to drain the collected elements.
     * @description
     *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
     *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
     *  result sequence. This causes elements to be delayed with duration.
     * @param {Number} duration Duration for taking elements from the end of the sequence.
     * @param {Scheduler} [scheduler]  Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     * @returns {Observable} An observable sequence with the elements taken during the specified duration from the end of the source sequence.
     */
    observableProto.takeLastWithTime = function (duration, scheduler) {
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return new TakeLastWithTimeObservable(this, duration, scheduler);
    };
    /**
     *  Returns an array with the elements within the specified duration from the end of the observable source sequence, using the specified scheduler to run timers.
     * @description
     *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
     *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
     *  result sequence. This causes elements to be delayed with duration.
     * @param {Number} duration Duration for taking elements from the end of the sequence.
     * @param {Scheduler} scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     * @returns {Observable} An observable sequence containing a single array with the elements taken during the specified duration from the end of the source sequence.
     */
    observableProto.takeLastBufferWithTime = function (duration, scheduler) {
        var source = this;
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return new AnonymousObservable(function (o) {
            var q = [];
            return source.subscribe(function (x) {
                var now = scheduler.now();
                q.push({ interval: now, value: x });
                while (q.length > 0 && now - q[0].interval >= duration) {
                    q.shift();
                }
            }, function (e) { o.onError(e); }, function () {
                var now = scheduler.now(), res = [];
                while (q.length > 0) {
                    var next = q.shift();
                    now - next.interval <= duration && res.push(next.value);
                }
                o.onNext(res);
                o.onCompleted();
            });
        }, source);
    };
    var TakeWithTimeObservable = (function (__super__) {
        inherits(TakeWithTimeObservable, __super__);
        function TakeWithTimeObservable(source, d, s) {
            this.source = source;
            this._d = d;
            this._s = s;
            __super__.call(this);
        }
        function scheduleMethod(s, o) {
            o.onCompleted();
        }
        TakeWithTimeObservable.prototype.subscribeCore = function (o) {
            return new BinaryDisposable(this._s.scheduleFuture(o, this._d, scheduleMethod), this.source.subscribe(o));
        };
        return TakeWithTimeObservable;
    }(ObservableBase));
    /**
     *  Takes elements for the specified duration from the start of the observable source sequence, using the specified scheduler to run timers.
     *
     * @example
     *  1 - res = source.takeWithTime(5000,  [optional scheduler]);
     * @description
     *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
     *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
     *  result sequence. This causes elements to be delayed with duration.
     * @param {Number} duration Duration for taking elements from the start of the sequence.
     * @param {Scheduler} scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     * @returns {Observable} An observable sequence with the elements taken during the specified duration from the start of the source sequence.
     */
    observableProto.takeWithTime = function (duration, scheduler) {
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return new TakeWithTimeObservable(this, duration, scheduler);
    };
    var SkipWithTimeObservable = (function (__super__) {
        inherits(SkipWithTimeObservable, __super__);
        function SkipWithTimeObservable(source, d, s) {
            this.source = source;
            this._d = d;
            this._s = s;
            this._open = false;
            __super__.call(this);
        }
        function scheduleMethod(s, self) {
            self._open = true;
        }
        SkipWithTimeObservable.prototype.subscribeCore = function (o) {
            return new BinaryDisposable(this._s.scheduleFuture(this, this._d, scheduleMethod), this.source.subscribe(new SkipWithTimeObserver(o, this)));
        };
        return SkipWithTimeObservable;
    }(ObservableBase));
    var SkipWithTimeObserver = (function (__super__) {
        inherits(SkipWithTimeObserver, __super__);
        function SkipWithTimeObserver(o, p) {
            this._o = o;
            this._p = p;
            __super__.call(this);
        }
        SkipWithTimeObserver.prototype.next = function (x) { this._p._open && this._o.onNext(x); };
        SkipWithTimeObserver.prototype.error = function (e) { this._o.onError(e); };
        SkipWithTimeObserver.prototype.completed = function () { this._o.onCompleted(); };
        return SkipWithTimeObserver;
    }(AbstractObserver));
    /**
     *  Skips elements for the specified duration from the start of the observable source sequence, using the specified scheduler to run timers.
     * @description
     *  Specifying a zero value for duration doesn't guarantee no elements will be dropped from the start of the source sequence.
     *  This is a side-effect of the asynchrony introduced by the scheduler, where the action that causes callbacks from the source sequence to be forwarded
     *  may not execute immediately, despite the zero due time.
     *
     *  Errors produced by the source sequence are always forwarded to the result sequence, even if the error occurs before the duration.
     * @param {Number} duration Duration for skipping elements from the start of the sequence.
     * @param {Scheduler} scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     * @returns {Observable} An observable sequence with the elements skipped during the specified duration from the start of the source sequence.
     */
    observableProto.skipWithTime = function (duration, scheduler) {
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return new SkipWithTimeObservable(this, duration, scheduler);
    };
    var SkipUntilWithTimeObservable = (function (__super__) {
        inherits(SkipUntilWithTimeObservable, __super__);
        function SkipUntilWithTimeObservable(source, startTime, scheduler) {
            this.source = source;
            this._st = startTime;
            this._s = scheduler;
            __super__.call(this);
        }
        function scheduleMethod(s, state) {
            state._open = true;
        }
        SkipUntilWithTimeObservable.prototype.subscribeCore = function (o) {
            this._open = false;
            return new BinaryDisposable(this._s.scheduleFuture(this, this._st, scheduleMethod), this.source.subscribe(new SkipUntilWithTimeObserver(o, this)));
        };
        return SkipUntilWithTimeObservable;
    }(ObservableBase));
    var SkipUntilWithTimeObserver = (function (__super__) {
        inherits(SkipUntilWithTimeObserver, __super__);
        function SkipUntilWithTimeObserver(o, p) {
            this._o = o;
            this._p = p;
            __super__.call(this);
        }
        SkipUntilWithTimeObserver.prototype.next = function (x) { this._p._open && this._o.onNext(x); };
        SkipUntilWithTimeObserver.prototype.error = function (e) { this._o.onError(e); };
        SkipUntilWithTimeObserver.prototype.completed = function () { this._o.onCompleted(); };
        return SkipUntilWithTimeObserver;
    }(AbstractObserver));
    /**
     *  Skips elements from the observable source sequence until the specified start time, using the specified scheduler to run timers.
     *  Errors produced by the source sequence are always forwarded to the result sequence, even if the error occurs before the start time.
     *
     * @examples
     *  1 - res = source.skipUntilWithTime(new Date(), [scheduler]);
     *  2 - res = source.skipUntilWithTime(5000, [scheduler]);
     * @param {Date|Number} startTime Time to start taking elements from the source sequence. If this value is less than or equal to Date(), no elements will be skipped.
     * @param {Scheduler} [scheduler] Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     * @returns {Observable} An observable sequence with the elements skipped until the specified start time.
     */
    observableProto.skipUntilWithTime = function (startTime, scheduler) {
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return new SkipUntilWithTimeObservable(this, startTime, scheduler);
    };
    /**
     *  Takes elements for the specified duration until the specified end time, using the specified scheduler to run timers.
     * @param {Number | Date} endTime Time to stop taking elements from the source sequence. If this value is less than or equal to new Date(), the result stream will complete immediately.
     * @param {Scheduler} [scheduler] Scheduler to run the timer on.
     * @returns {Observable} An observable sequence with the elements taken until the specified end time.
     */
    observableProto.takeUntilWithTime = function (endTime, scheduler) {
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        var source = this;
        return new AnonymousObservable(function (o) {
            return new BinaryDisposable(scheduler.scheduleFuture(o, endTime, function (_, o) { o.onCompleted(); }), source.subscribe(o));
        }, source);
    };
    /**
     * Returns an Observable that emits only the first item emitted by the source Observable during sequential time windows of a specified duration.
     * @param {Number} windowDuration time to wait before emitting another item after emitting the last item
     * @param {Scheduler} [scheduler] the Scheduler to use internally to manage the timers that handle timeout for each item. If not provided, defaults to Scheduler.timeout.
     * @returns {Observable} An Observable that performs the throttle operation.
     */
    observableProto.throttle = function (windowDuration, scheduler) {
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        var duration = +windowDuration || 0;
        if (duration <= 0) {
            throw new RangeError('windowDuration cannot be less or equal zero.');
        }
        var source = this;
        return new AnonymousObservable(function (o) {
            var lastOnNext = 0;
            return source.subscribe(function (x) {
                var now = scheduler.now();
                if (lastOnNext === 0 || now - lastOnNext >= duration) {
                    lastOnNext = now;
                    o.onNext(x);
                }
            }, function (e) { o.onError(e); }, function () { o.onCompleted(); });
        }, source);
    };
    return Rx;
}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccngudGltZS5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccngudGltZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSw2R0FBNkc7QUFFN0csQ0FBQztBQUFBLENBQUMsVUFBVSxPQUFPO0lBQ2pCLElBQUksV0FBVyxHQUFHO1FBQ2hCLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLFFBQVEsRUFBRSxJQUFJO0tBQ2YsQ0FBQztJQUVGLHFCQUFxQixLQUFLO1FBQ3hCLE1BQU0sQ0FBQyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDM0QsQ0FBQztJQUVELElBQUksV0FBVyxHQUFHLENBQUMsV0FBVyxDQUFDLE9BQU8sT0FBTyxDQUFDLElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDakcsSUFBSSxVQUFVLEdBQUcsQ0FBQyxXQUFXLENBQUMsT0FBTyxNQUFNLENBQUMsSUFBSSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQztJQUM1RixJQUFJLFVBQVUsR0FBRyxXQUFXLENBQUMsV0FBVyxJQUFJLFVBQVUsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLElBQUksTUFBTSxDQUFDLENBQUM7SUFDaEcsSUFBSSxRQUFRLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxPQUFPLElBQUks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QUFHLEdBQUcsQ0FBQztvQkFDakIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDZCxDQUFDO1lBQ0gsQ0FBQyxFQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQ25FLENBQUM7UUFDSixDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDYixDQUFDLENBQUM7SUFFRixNQUFNLENBQUMsRUFBRSxDQUFDO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0LCBBbGwgcmlnaHRzIHJlc2VydmVkLiBTZWUgTGljZW5zZS50eHQgaW4gdGhlIHByb2plY3Qgcm9vdCBmb3IgbGljZW5zZSBpbmZvcm1hdGlvbi5cblxuOyhmdW5jdGlvbiAoZmFjdG9yeSkge1xuICB2YXIgb2JqZWN0VHlwZXMgPSB7XG4gICAgJ2Z1bmN0aW9uJzogdHJ1ZSxcbiAgICAnb2JqZWN0JzogdHJ1ZVxuICB9O1xuXG4gIGZ1bmN0aW9uIGNoZWNrR2xvYmFsKHZhbHVlKSB7XG4gICAgcmV0dXJuICh2YWx1ZSAmJiB2YWx1ZS5PYmplY3QgPT09IE9iamVjdCkgPyB2YWx1ZSA6IG51bGw7XG4gIH1cblxuICB2YXIgZnJlZUV4cG9ydHMgPSAob2JqZWN0VHlwZXNbdHlwZW9mIGV4cG9ydHNdICYmIGV4cG9ydHMgJiYgIWV4cG9ydHMubm9kZVR5cGUpID8gZXhwb3J0cyA6IG51bGw7XG4gIHZhciBmcmVlTW9kdWxlID0gKG9iamVjdFR5cGVzW3R5cGVvZiBtb2R1bGVdICYmIG1vZHVsZSAmJiAhbW9kdWxlLm5vZGVUeXBlKSA/IG1vZHVsZSA6IG51bGw7XG4gIHZhciBmcmVlR2xvYmFsID0gY2hlY2tHbG9iYWwoZnJlZUV4cG9ydHMgJiYgZnJlZU1vZHVsZSAmJiB0eXBlb2YgZ2xvYmFsID09PSAnb2JqZWN0JyAmJiBnbG9iYWwpO1xuICB2YXIgZnJlZVNlbGYgPSBjaGVja0dsb2JhbChvYmplY3RUeXBlc1t0eXBlb2Ygc2VsZl0gJiYgc2VsZik7XG4gIHZhciBmcmVlV2luZG93ID0gY2hlY2tHbG9iYWwob2JqZWN0VHlwZXNbdHlwZW9mIHdpbmRvd10gJiYgd2luZG93KTtcbiAgdmFyIG1vZHVsZUV4cG9ydHMgPSAoZnJlZU1vZHVsZSAmJiBmcmVlTW9kdWxlLmV4cG9ydHMgPT09IGZyZWVFeHBvcnRzKSA/IGZyZWVFeHBvcnRzIDogbnVsbDtcbiAgdmFyIHRoaXNHbG9iYWwgPSBjaGVja0dsb2JhbChvYmplY3RUeXBlc1t0eXBlb2YgdGhpc10gJiYgdGhpcyk7XG4gIHZhciByb290ID0gZnJlZUdsb2JhbCB8fCAoKGZyZWVXaW5kb3cgIT09ICh0aGlzR2xvYmFsICYmIHRoaXNHbG9iYWwud2luZG93KSkgJiYgZnJlZVdpbmRvdykgfHwgZnJlZVNlbGYgfHwgdGhpc0dsb2JhbCB8fCBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuXG4gIC8vIEJlY2F1c2Ugb2YgYnVpbGQgb3B0aW1pemVyc1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKFsnLi9yeCddLCBmdW5jdGlvbiAoUngsIGV4cG9ydHMpIHtcbiAgICAgIHJldHVybiBmYWN0b3J5KHJvb3QsIGV4cG9ydHMsIFJ4KTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiYgbW9kdWxlLmV4cG9ydHMgPT09IGZyZWVFeHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJvb3QsIG1vZHVsZS5leHBvcnRzLCByZXF1aXJlKCcuL3J4JykpO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuUnggPSBmYWN0b3J5KHJvb3QsIHt9LCByb290LlJ4KTtcbiAgfVxufS5jYWxsKHRoaXMsIGZ1bmN0aW9uIChyb290LCBleHAsIFJ4LCB1bmRlZmluZWQpIHtcblxuICAvLyBSZWZlcm5jZXNcbiAgdmFyIGluaGVyaXRzID0gUnguaW50ZXJuYWxzLmluaGVyaXRzLFxuICAgIEFic3RyYWN0T2JzZXJ2ZXIgPSBSeC5pbnRlcm5hbHMuQWJzdHJhY3RPYnNlcnZlcixcbiAgICBPYnNlcnZhYmxlID0gUnguT2JzZXJ2YWJsZSxcbiAgICBvYnNlcnZhYmxlUHJvdG8gPSBPYnNlcnZhYmxlLnByb3RvdHlwZSxcbiAgICBBbm9ueW1vdXNPYnNlcnZhYmxlID0gUnguQW5vbnltb3VzT2JzZXJ2YWJsZSxcbiAgICBPYnNlcnZhYmxlQmFzZSA9IFJ4Lk9ic2VydmFibGVCYXNlLFxuICAgIG9ic2VydmFibGVEZWZlciA9IE9ic2VydmFibGUuZGVmZXIsXG4gICAgb2JzZXJ2YWJsZUVtcHR5ID0gT2JzZXJ2YWJsZS5lbXB0eSxcbiAgICBvYnNlcnZhYmxlTmV2ZXIgPSBPYnNlcnZhYmxlLm5ldmVyLFxuICAgIG9ic2VydmFibGVUaHJvdyA9IE9ic2VydmFibGVbJ3Rocm93J10sXG4gICAgb2JzZXJ2YWJsZUZyb21BcnJheSA9IE9ic2VydmFibGUuZnJvbUFycmF5LFxuICAgIGRlZmF1bHRTY2hlZHVsZXIgPSBSeC5TY2hlZHVsZXJbJ2RlZmF1bHQnXSxcbiAgICBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSA9IFJ4LlNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlLFxuICAgIFNlcmlhbERpc3Bvc2FibGUgPSBSeC5TZXJpYWxEaXNwb3NhYmxlLFxuICAgIENvbXBvc2l0ZURpc3Bvc2FibGUgPSBSeC5Db21wb3NpdGVEaXNwb3NhYmxlLFxuICAgIEJpbmFyeURpc3Bvc2FibGUgPSBSeC5CaW5hcnlEaXNwb3NhYmxlLFxuICAgIFJlZkNvdW50RGlzcG9zYWJsZSA9IFJ4LlJlZkNvdW50RGlzcG9zYWJsZSxcbiAgICBTdWJqZWN0ID0gUnguU3ViamVjdCxcbiAgICBhZGRSZWYgPSBSeC5pbnRlcm5hbHMuYWRkUmVmLFxuICAgIG5vcm1hbGl6ZVRpbWUgPSBSeC5TY2hlZHVsZXIubm9ybWFsaXplLFxuICAgIGhlbHBlcnMgPSBSeC5oZWxwZXJzLFxuICAgIGlzUHJvbWlzZSA9IGhlbHBlcnMuaXNQcm9taXNlLFxuICAgIGlzRnVuY3Rpb24gPSBoZWxwZXJzLmlzRnVuY3Rpb24sXG4gICAgaXNTY2hlZHVsZXIgPSBSeC5TY2hlZHVsZXIuaXNTY2hlZHVsZXIsXG4gICAgb2JzZXJ2YWJsZUZyb21Qcm9taXNlID0gT2JzZXJ2YWJsZS5mcm9tUHJvbWlzZTtcblxuICB2YXIgZXJyb3JPYmogPSB7ZToge319O1xuICBcbiAgZnVuY3Rpb24gdHJ5Q2F0Y2hlckdlbih0cnlDYXRjaFRhcmdldCkge1xuICAgIHJldHVybiBmdW5jdGlvbiB0cnlDYXRjaGVyKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHRyeUNhdGNoVGFyZ2V0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGVycm9yT2JqLmUgPSBlO1xuICAgICAgICByZXR1cm4gZXJyb3JPYmo7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHZhciB0cnlDYXRjaCA9IFJ4LmludGVybmFscy50cnlDYXRjaCA9IGZ1bmN0aW9uIHRyeUNhdGNoKGZuKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGZuKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdmbiBtdXN0IGJlIGEgZnVuY3Rpb24nKTsgfVxuICAgIHJldHVybiB0cnlDYXRjaGVyR2VuKGZuKTtcbiAgfTtcblxuICBmdW5jdGlvbiB0aHJvd2VyKGUpIHtcbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgdmFyIFRpbWVyT2JzZXJ2YWJsZSA9IChmdW5jdGlvbihfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhUaW1lck9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gVGltZXJPYnNlcnZhYmxlKGR0LCBzKSB7XG4gICAgICB0aGlzLl9kdCA9IGR0O1xuICAgICAgdGhpcy5fcyA9IHM7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBUaW1lck9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMuX3Muc2NoZWR1bGVGdXR1cmUobywgdGhpcy5fZHQsIHNjaGVkdWxlTWV0aG9kKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gc2NoZWR1bGVNZXRob2Qocywgbykge1xuICAgICAgby5vbk5leHQoMCk7XG4gICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFRpbWVyT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIGZ1bmN0aW9uIF9vYnNlcnZhYmxlVGltZXIoZHVlVGltZSwgc2NoZWR1bGVyKSB7XG4gICAgcmV0dXJuIG5ldyBUaW1lck9ic2VydmFibGUoZHVlVGltZSwgc2NoZWR1bGVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9ic2VydmFibGVUaW1lckRhdGVBbmRQZXJpb2QoZHVlVGltZSwgcGVyaW9kLCBzY2hlZHVsZXIpIHtcbiAgICByZXR1cm4gbmV3IEFub255bW91c09ic2VydmFibGUoZnVuY3Rpb24gKG9ic2VydmVyKSB7XG4gICAgICB2YXIgZCA9IGR1ZVRpbWUsIHAgPSBub3JtYWxpemVUaW1lKHBlcmlvZCk7XG4gICAgICByZXR1cm4gc2NoZWR1bGVyLnNjaGVkdWxlUmVjdXJzaXZlRnV0dXJlKDAsIGQsIGZ1bmN0aW9uIChjb3VudCwgc2VsZikge1xuICAgICAgICBpZiAocCA+IDApIHtcbiAgICAgICAgICB2YXIgbm93ID0gc2NoZWR1bGVyLm5vdygpO1xuICAgICAgICAgIGQgPSBuZXcgRGF0ZShkLmdldFRpbWUoKSArIHApO1xuICAgICAgICAgIGQuZ2V0VGltZSgpIDw9IG5vdyAmJiAoZCA9IG5ldyBEYXRlKG5vdyArIHApKTtcbiAgICAgICAgfVxuICAgICAgICBvYnNlcnZlci5vbk5leHQoY291bnQpO1xuICAgICAgICBzZWxmKGNvdW50ICsgMSwgbmV3IERhdGUoZCkpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBvYnNlcnZhYmxlVGltZXJUaW1lU3BhbkFuZFBlcmlvZChkdWVUaW1lLCBwZXJpb2QsIHNjaGVkdWxlcikge1xuICAgIHJldHVybiBkdWVUaW1lID09PSBwZXJpb2QgP1xuICAgICAgbmV3IEFub255bW91c09ic2VydmFibGUoZnVuY3Rpb24gKG9ic2VydmVyKSB7XG4gICAgICAgIHJldHVybiBzY2hlZHVsZXIuc2NoZWR1bGVQZXJpb2RpYygwLCBwZXJpb2QsIGZ1bmN0aW9uIChjb3VudCkge1xuICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChjb3VudCk7XG4gICAgICAgICAgcmV0dXJuIGNvdW50ICsgMTtcbiAgICAgICAgfSk7XG4gICAgICB9KSA6XG4gICAgICBvYnNlcnZhYmxlRGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZVRpbWVyRGF0ZUFuZFBlcmlvZChuZXcgRGF0ZShzY2hlZHVsZXIubm93KCkgKyBkdWVUaW1lKSwgcGVyaW9kLCBzY2hlZHVsZXIpO1xuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogIFJldHVybnMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IHByb2R1Y2VzIGEgdmFsdWUgYWZ0ZXIgZWFjaCBwZXJpb2QuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqICAxIC0gcmVzID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxMDAwKTtcbiAgICogIDIgLSByZXMgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEwMDAsIFJ4LlNjaGVkdWxlci50aW1lb3V0KTtcbiAgICpcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHBlcmlvZCBQZXJpb2QgZm9yIHByb2R1Y2luZyB0aGUgdmFsdWVzIGluIHRoZSByZXN1bHRpbmcgc2VxdWVuY2UgKHNwZWNpZmllZCBhcyBhbiBpbnRlZ2VyIGRlbm90aW5nIG1pbGxpc2Vjb25kcykuXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSBTY2hlZHVsZXIgdG8gcnVuIHRoZSB0aW1lciBvbi4gSWYgbm90IHNwZWNpZmllZCwgUnguU2NoZWR1bGVyLnRpbWVvdXQgaXMgdXNlZC5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBwcm9kdWNlcyBhIHZhbHVlIGFmdGVyIGVhY2ggcGVyaW9kLlxuICAgKi9cbiAgdmFyIG9ic2VydmFibGVpbnRlcnZhbCA9IE9ic2VydmFibGUuaW50ZXJ2YWwgPSBmdW5jdGlvbiAocGVyaW9kLCBzY2hlZHVsZXIpIHtcbiAgICByZXR1cm4gb2JzZXJ2YWJsZVRpbWVyVGltZVNwYW5BbmRQZXJpb2QocGVyaW9kLCBwZXJpb2QsIGlzU2NoZWR1bGVyKHNjaGVkdWxlcikgPyBzY2hlZHVsZXIgOiBkZWZhdWx0U2NoZWR1bGVyKTtcbiAgfTtcblxuICAvKipcbiAgICogIFJldHVybnMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IHByb2R1Y2VzIGEgdmFsdWUgYWZ0ZXIgZHVlVGltZSBoYXMgZWxhcHNlZCBhbmQgdGhlbiBhZnRlciBlYWNoIHBlcmlvZC5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGR1ZVRpbWUgQWJzb2x1dGUgKHNwZWNpZmllZCBhcyBhIERhdGUgb2JqZWN0KSBvciByZWxhdGl2ZSB0aW1lIChzcGVjaWZpZWQgYXMgYW4gaW50ZWdlciBkZW5vdGluZyBtaWxsaXNlY29uZHMpIGF0IHdoaWNoIHRvIHByb2R1Y2UgdGhlIGZpcnN0IHZhbHVlLlxuICAgKiBAcGFyYW0ge01peGVkfSBbcGVyaW9kT3JTY2hlZHVsZXJdICBQZXJpb2QgdG8gcHJvZHVjZSBzdWJzZXF1ZW50IHZhbHVlcyAoc3BlY2lmaWVkIGFzIGFuIGludGVnZXIgZGVub3RpbmcgbWlsbGlzZWNvbmRzKSwgb3IgdGhlIHNjaGVkdWxlciB0byBydW4gdGhlIHRpbWVyIG9uLiBJZiBub3Qgc3BlY2lmaWVkLCB0aGUgcmVzdWx0aW5nIHRpbWVyIGlzIG5vdCByZWN1cnJpbmcuXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSAgU2NoZWR1bGVyIHRvIHJ1biB0aGUgdGltZXIgb24uIElmIG5vdCBzcGVjaWZpZWQsIHRoZSB0aW1lb3V0IHNjaGVkdWxlciBpcyB1c2VkLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IHByb2R1Y2VzIGEgdmFsdWUgYWZ0ZXIgZHVlIHRpbWUgaGFzIGVsYXBzZWQgYW5kIHRoZW4gZWFjaCBwZXJpb2QuXG4gICAqL1xuICB2YXIgb2JzZXJ2YWJsZVRpbWVyID0gT2JzZXJ2YWJsZS50aW1lciA9IGZ1bmN0aW9uIChkdWVUaW1lLCBwZXJpb2RPclNjaGVkdWxlciwgc2NoZWR1bGVyKSB7XG4gICAgdmFyIHBlcmlvZDtcbiAgICBpc1NjaGVkdWxlcihzY2hlZHVsZXIpIHx8IChzY2hlZHVsZXIgPSBkZWZhdWx0U2NoZWR1bGVyKTtcbiAgICBpZiAocGVyaW9kT3JTY2hlZHVsZXIgIT0gbnVsbCAmJiB0eXBlb2YgcGVyaW9kT3JTY2hlZHVsZXIgPT09ICdudW1iZXInKSB7XG4gICAgICBwZXJpb2QgPSBwZXJpb2RPclNjaGVkdWxlcjtcbiAgICB9IGVsc2UgaWYgKGlzU2NoZWR1bGVyKHBlcmlvZE9yU2NoZWR1bGVyKSkge1xuICAgICAgc2NoZWR1bGVyID0gcGVyaW9kT3JTY2hlZHVsZXI7XG4gICAgfVxuICAgIGlmICgoZHVlVGltZSBpbnN0YW5jZW9mIERhdGUgfHwgdHlwZW9mIGR1ZVRpbWUgPT09ICdudW1iZXInKSAmJiBwZXJpb2QgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIF9vYnNlcnZhYmxlVGltZXIoZHVlVGltZSwgc2NoZWR1bGVyKTtcbiAgICB9XG4gICAgaWYgKGR1ZVRpbWUgaW5zdGFuY2VvZiBEYXRlICYmIHBlcmlvZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZVRpbWVyRGF0ZUFuZFBlcmlvZChkdWVUaW1lLCBwZXJpb2RPclNjaGVkdWxlciwgc2NoZWR1bGVyKTtcbiAgICB9XG4gICAgcmV0dXJuIG9ic2VydmFibGVUaW1lclRpbWVTcGFuQW5kUGVyaW9kKGR1ZVRpbWUsIHBlcmlvZCwgc2NoZWR1bGVyKTtcbiAgfTtcblxuICBmdW5jdGlvbiBvYnNlcnZhYmxlRGVsYXlSZWxhdGl2ZShzb3VyY2UsIGR1ZVRpbWUsIHNjaGVkdWxlcikge1xuICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbiAobykge1xuICAgICAgdmFyIGFjdGl2ZSA9IGZhbHNlLFxuICAgICAgICBjYW5jZWxhYmxlID0gbmV3IFNlcmlhbERpc3Bvc2FibGUoKSxcbiAgICAgICAgZXhjZXB0aW9uID0gbnVsbCxcbiAgICAgICAgcSA9IFtdLFxuICAgICAgICBydW5uaW5nID0gZmFsc2UsXG4gICAgICAgIHN1YnNjcmlwdGlvbjtcbiAgICAgIHN1YnNjcmlwdGlvbiA9IHNvdXJjZS5tYXRlcmlhbGl6ZSgpLnRpbWVzdGFtcChzY2hlZHVsZXIpLnN1YnNjcmliZShmdW5jdGlvbiAobm90aWZpY2F0aW9uKSB7XG4gICAgICAgIHZhciBkLCBzaG91bGRSdW47XG4gICAgICAgIGlmIChub3RpZmljYXRpb24udmFsdWUua2luZCA9PT0gJ0UnKSB7XG4gICAgICAgICAgcSA9IFtdO1xuICAgICAgICAgIHEucHVzaChub3RpZmljYXRpb24pO1xuICAgICAgICAgIGV4Y2VwdGlvbiA9IG5vdGlmaWNhdGlvbi52YWx1ZS5lcnJvcjtcbiAgICAgICAgICBzaG91bGRSdW4gPSAhcnVubmluZztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBxLnB1c2goeyB2YWx1ZTogbm90aWZpY2F0aW9uLnZhbHVlLCB0aW1lc3RhbXA6IG5vdGlmaWNhdGlvbi50aW1lc3RhbXAgKyBkdWVUaW1lIH0pO1xuICAgICAgICAgIHNob3VsZFJ1biA9ICFhY3RpdmU7XG4gICAgICAgICAgYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2hvdWxkUnVuKSB7XG4gICAgICAgICAgaWYgKGV4Y2VwdGlvbiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgby5vbkVycm9yKGV4Y2VwdGlvbik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGQgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgICAgICAgIGNhbmNlbGFibGUuc2V0RGlzcG9zYWJsZShkKTtcbiAgICAgICAgICAgIGQuc2V0RGlzcG9zYWJsZShzY2hlZHVsZXIuc2NoZWR1bGVSZWN1cnNpdmVGdXR1cmUobnVsbCwgZHVlVGltZSwgZnVuY3Rpb24gKF8sIHNlbGYpIHtcbiAgICAgICAgICAgICAgdmFyIGUsIHJlY3Vyc2VEdWVUaW1lLCByZXN1bHQsIHNob3VsZFJlY3Vyc2U7XG4gICAgICAgICAgICAgIGlmIChleGNlcHRpb24gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcnVubmluZyA9IHRydWU7XG4gICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmIChxLmxlbmd0aCA+IDAgJiYgcVswXS50aW1lc3RhbXAgLSBzY2hlZHVsZXIubm93KCkgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcS5zaGlmdCgpLnZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQuYWNjZXB0KG8pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSB3aGlsZSAocmVzdWx0ICE9PSBudWxsKTtcbiAgICAgICAgICAgICAgc2hvdWxkUmVjdXJzZSA9IGZhbHNlO1xuICAgICAgICAgICAgICByZWN1cnNlRHVlVGltZSA9IDA7XG4gICAgICAgICAgICAgIGlmIChxLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBzaG91bGRSZWN1cnNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZWN1cnNlRHVlVGltZSA9IE1hdGgubWF4KDAsIHFbMF0udGltZXN0YW1wIC0gc2NoZWR1bGVyLm5vdygpKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlID0gZXhjZXB0aW9uO1xuICAgICAgICAgICAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgIGlmIChlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgby5vbkVycm9yKGUpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNob3VsZFJlY3Vyc2UpIHtcbiAgICAgICAgICAgICAgICBzZWxmKG51bGwsIHJlY3Vyc2VEdWVUaW1lKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gbmV3IEJpbmFyeURpc3Bvc2FibGUoc3Vic2NyaXB0aW9uLCBjYW5jZWxhYmxlKTtcbiAgICB9LCBzb3VyY2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gb2JzZXJ2YWJsZURlbGF5QWJzb2x1dGUoc291cmNlLCBkdWVUaW1lLCBzY2hlZHVsZXIpIHtcbiAgICByZXR1cm4gb2JzZXJ2YWJsZURlZmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBvYnNlcnZhYmxlRGVsYXlSZWxhdGl2ZShzb3VyY2UsIGR1ZVRpbWUgLSBzY2hlZHVsZXIubm93KCksIHNjaGVkdWxlcik7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBkZWxheVdpdGhTZWxlY3Rvcihzb3VyY2UsIHN1YnNjcmlwdGlvbkRlbGF5LCBkZWxheUR1cmF0aW9uU2VsZWN0b3IpIHtcbiAgICB2YXIgc3ViRGVsYXksIHNlbGVjdG9yO1xuICAgIGlmIChpc0Z1bmN0aW9uKHN1YnNjcmlwdGlvbkRlbGF5KSkge1xuICAgICAgc2VsZWN0b3IgPSBzdWJzY3JpcHRpb25EZWxheTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3ViRGVsYXkgPSBzdWJzY3JpcHRpb25EZWxheTtcbiAgICAgIHNlbGVjdG9yID0gZGVsYXlEdXJhdGlvblNlbGVjdG9yO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEFub255bW91c09ic2VydmFibGUoZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciBkZWxheXMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpLCBhdEVuZCA9IGZhbHNlLCBzdWJzY3JpcHRpb24gPSBuZXcgU2VyaWFsRGlzcG9zYWJsZSgpO1xuXG4gICAgICBmdW5jdGlvbiBzdGFydCgpIHtcbiAgICAgICAgc3Vic2NyaXB0aW9uLnNldERpc3Bvc2FibGUoc291cmNlLnN1YnNjcmliZShcbiAgICAgICAgICBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgdmFyIGRlbGF5ID0gdHJ5Q2F0Y2goc2VsZWN0b3IpKHgpO1xuICAgICAgICAgICAgaWYgKGRlbGF5ID09PSBlcnJvck9iaikgeyByZXR1cm4gby5vbkVycm9yKGRlbGF5LmUpOyB9XG4gICAgICAgICAgICB2YXIgZCA9IG5ldyBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSgpO1xuICAgICAgICAgICAgZGVsYXlzLmFkZChkKTtcbiAgICAgICAgICAgIGQuc2V0RGlzcG9zYWJsZShkZWxheS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBvLm9uTmV4dCh4KTtcbiAgICAgICAgICAgICAgICBkZWxheXMucmVtb3ZlKGQpO1xuICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgZnVuY3Rpb24gKGUpIHsgby5vbkVycm9yKGUpOyB9LFxuICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgby5vbk5leHQoeCk7XG4gICAgICAgICAgICAgICAgZGVsYXlzLnJlbW92ZShkKTtcbiAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICkpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZnVuY3Rpb24gKGUpIHsgby5vbkVycm9yKGUpOyB9LFxuICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGF0RW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgfVxuICAgICAgICApKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZG9uZSAoKSB7XG4gICAgICAgIGF0RW5kICYmIGRlbGF5cy5sZW5ndGggPT09IDAgJiYgby5vbkNvbXBsZXRlZCgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXN1YkRlbGF5KSB7XG4gICAgICAgIHN0YXJ0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdWJzY3JpcHRpb24uc2V0RGlzcG9zYWJsZShzdWJEZWxheS5zdWJzY3JpYmUoc3RhcnQsIGZ1bmN0aW9uIChlKSB7IG8ub25FcnJvcihlKTsgfSwgc3RhcnQpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBCaW5hcnlEaXNwb3NhYmxlKHN1YnNjcmlwdGlvbiwgZGVsYXlzKTtcbiAgICB9LCBzb3VyY2UpO1xuICB9XG5cbiAgLyoqXG4gICAqICBUaW1lIHNoaWZ0cyB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSBieSBkdWVUaW1lLlxuICAgKiAgVGhlIHJlbGF0aXZlIHRpbWUgaW50ZXJ2YWxzIGJldHdlZW4gdGhlIHZhbHVlcyBhcmUgcHJlc2VydmVkLlxuICAgKlxuICAgKiBAcGFyYW0ge051bWJlcn0gZHVlVGltZSBBYnNvbHV0ZSAoc3BlY2lmaWVkIGFzIGEgRGF0ZSBvYmplY3QpIG9yIHJlbGF0aXZlIHRpbWUgKHNwZWNpZmllZCBhcyBhbiBpbnRlZ2VyIGRlbm90aW5nIG1pbGxpc2Vjb25kcykgYnkgd2hpY2ggdG8gc2hpZnQgdGhlIG9ic2VydmFibGUgc2VxdWVuY2UuXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSBTY2hlZHVsZXIgdG8gcnVuIHRoZSBkZWxheSB0aW1lcnMgb24uIElmIG5vdCBzcGVjaWZpZWQsIHRoZSB0aW1lb3V0IHNjaGVkdWxlciBpcyB1c2VkLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gVGltZS1zaGlmdGVkIHNlcXVlbmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmRlbGF5ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBmaXJzdEFyZyA9IGFyZ3VtZW50c1swXTtcbiAgICBpZiAodHlwZW9mIGZpcnN0QXJnID09PSAnbnVtYmVyJyB8fCBmaXJzdEFyZyBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgIHZhciBkdWVUaW1lID0gZmlyc3RBcmcsIHNjaGVkdWxlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlzU2NoZWR1bGVyKHNjaGVkdWxlcikgfHwgKHNjaGVkdWxlciA9IGRlZmF1bHRTY2hlZHVsZXIpO1xuICAgICAgcmV0dXJuIGR1ZVRpbWUgaW5zdGFuY2VvZiBEYXRlID9cbiAgICAgICAgb2JzZXJ2YWJsZURlbGF5QWJzb2x1dGUodGhpcywgZHVlVGltZSwgc2NoZWR1bGVyKSA6XG4gICAgICAgIG9ic2VydmFibGVEZWxheVJlbGF0aXZlKHRoaXMsIGR1ZVRpbWUsIHNjaGVkdWxlcik7XG4gICAgfSBlbHNlIGlmIChPYnNlcnZhYmxlLmlzT2JzZXJ2YWJsZShmaXJzdEFyZykgfHwgaXNGdW5jdGlvbihmaXJzdEFyZykpIHtcbiAgICAgIHJldHVybiBkZWxheVdpdGhTZWxlY3Rvcih0aGlzLCBmaXJzdEFyZywgYXJndW1lbnRzWzFdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGFyZ3VtZW50cycpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgRGVib3VuY2VPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhEZWJvdW5jZU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gRGVib3VuY2VPYnNlcnZhYmxlKHNvdXJjZSwgZHQsIHMpIHtcbiAgICAgIGlzU2NoZWR1bGVyKHMpIHx8IChzID0gZGVmYXVsdFNjaGVkdWxlcik7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMuX2R0ID0gZHQ7XG4gICAgICB0aGlzLl9zID0gcztcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIERlYm91bmNlT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgY2FuY2VsYWJsZSA9IG5ldyBTZXJpYWxEaXNwb3NhYmxlKCk7XG4gICAgICByZXR1cm4gbmV3IEJpbmFyeURpc3Bvc2FibGUoXG4gICAgICAgIHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgRGVib3VuY2VPYnNlcnZlcihvLCB0aGlzLl9kdCwgdGhpcy5fcywgY2FuY2VsYWJsZSkpLFxuICAgICAgICBjYW5jZWxhYmxlKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIERlYm91bmNlT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIHZhciBEZWJvdW5jZU9ic2VydmVyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhEZWJvdW5jZU9ic2VydmVyLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIERlYm91bmNlT2JzZXJ2ZXIob2JzZXJ2ZXIsIGR1ZVRpbWUsIHNjaGVkdWxlciwgY2FuY2VsYWJsZSkge1xuICAgICAgdGhpcy5fbyA9IG9ic2VydmVyO1xuICAgICAgdGhpcy5fZCA9IGR1ZVRpbWU7XG4gICAgICB0aGlzLl9zY2hlZHVsZXIgPSBzY2hlZHVsZXI7XG4gICAgICB0aGlzLl9jID0gY2FuY2VsYWJsZTtcbiAgICAgIHRoaXMuX3YgPSBudWxsO1xuICAgICAgdGhpcy5faHYgPSBmYWxzZTtcbiAgICAgIHRoaXMuX2lkID0gMDtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjaGVkdWxlRnV0dXJlKHMsIHN0YXRlKSB7XG4gICAgICBzdGF0ZS5zZWxmLl9odiAmJiBzdGF0ZS5zZWxmLl9pZCA9PT0gc3RhdGUuY3VycmVudElkICYmIHN0YXRlLnNlbGYuX28ub25OZXh0KHN0YXRlLngpO1xuICAgICAgc3RhdGUuc2VsZi5faHYgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBEZWJvdW5jZU9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgIHRoaXMuX2h2ID0gdHJ1ZTtcbiAgICAgIHRoaXMuX3YgPSB4O1xuICAgICAgdmFyIGN1cnJlbnRJZCA9ICsrdGhpcy5faWQsIGQgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgIHRoaXMuX2Muc2V0RGlzcG9zYWJsZShkKTtcbiAgICAgIGQuc2V0RGlzcG9zYWJsZSh0aGlzLl9zY2hlZHVsZXIuc2NoZWR1bGVGdXR1cmUodGhpcywgdGhpcy5fZCwgZnVuY3Rpb24gKF8sIHNlbGYpIHtcbiAgICAgICAgc2VsZi5faHYgJiYgc2VsZi5faWQgPT09IGN1cnJlbnRJZCAmJiBzZWxmLl9vLm9uTmV4dCh4KTtcbiAgICAgICAgc2VsZi5faHYgPSBmYWxzZTtcbiAgICAgIH0pKTtcbiAgICB9O1xuXG4gICAgRGVib3VuY2VPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgdGhpcy5fYy5kaXNwb3NlKCk7XG4gICAgICB0aGlzLl9vLm9uRXJyb3IoZSk7XG4gICAgICB0aGlzLl9odiA9IGZhbHNlO1xuICAgICAgdGhpcy5faWQrKztcbiAgICB9O1xuXG4gICAgRGVib3VuY2VPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5fYy5kaXNwb3NlKCk7XG4gICAgICB0aGlzLl9odiAmJiB0aGlzLl9vLm9uTmV4dCh0aGlzLl92KTtcbiAgICAgIHRoaXMuX28ub25Db21wbGV0ZWQoKTtcbiAgICAgIHRoaXMuX2h2ID0gZmFsc2U7XG4gICAgICB0aGlzLl9pZCsrO1xuICAgIH07XG5cbiAgICByZXR1cm4gRGVib3VuY2VPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgZnVuY3Rpb24gZGVib3VuY2VXaXRoU2VsZWN0b3Ioc291cmNlLCBkdXJhdGlvblNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIG5ldyBBbm9ueW1vdXNPYnNlcnZhYmxlKGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgdmFsdWUsIGhhc1ZhbHVlID0gZmFsc2UsIGNhbmNlbGFibGUgPSBuZXcgU2VyaWFsRGlzcG9zYWJsZSgpLCBpZCA9IDA7XG4gICAgICB2YXIgc3Vic2NyaXB0aW9uID0gc291cmNlLnN1YnNjcmliZShcbiAgICAgICAgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICB2YXIgdGhyb3R0bGUgPSB0cnlDYXRjaChkdXJhdGlvblNlbGVjdG9yKSh4KTtcbiAgICAgICAgICBpZiAodGhyb3R0bGUgPT09IGVycm9yT2JqKSB7IHJldHVybiBvLm9uRXJyb3IodGhyb3R0bGUuZSk7IH1cblxuICAgICAgICAgIGlzUHJvbWlzZSh0aHJvdHRsZSkgJiYgKHRocm90dGxlID0gb2JzZXJ2YWJsZUZyb21Qcm9taXNlKHRocm90dGxlKSk7XG5cbiAgICAgICAgICBoYXNWYWx1ZSA9IHRydWU7XG4gICAgICAgICAgdmFsdWUgPSB4O1xuICAgICAgICAgIGlkKys7XG4gICAgICAgICAgdmFyIGN1cnJlbnRpZCA9IGlkLCBkID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG4gICAgICAgICAgY2FuY2VsYWJsZS5zZXREaXNwb3NhYmxlKGQpO1xuICAgICAgICAgIGQuc2V0RGlzcG9zYWJsZSh0aHJvdHRsZS5zdWJzY3JpYmUoXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIGhhc1ZhbHVlICYmIGlkID09PSBjdXJyZW50aWQgJiYgby5vbk5leHQodmFsdWUpO1xuICAgICAgICAgICAgICBoYXNWYWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICBkLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoZSkgeyBvLm9uRXJyb3IoZSk7IH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIGhhc1ZhbHVlICYmIGlkID09PSBjdXJyZW50aWQgJiYgby5vbk5leHQodmFsdWUpO1xuICAgICAgICAgICAgICBoYXNWYWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICBkLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBjYW5jZWxhYmxlLmRpc3Bvc2UoKTtcbiAgICAgICAgICBvLm9uRXJyb3IoZSk7XG4gICAgICAgICAgaGFzVmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICBpZCsrO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgY2FuY2VsYWJsZS5kaXNwb3NlKCk7XG4gICAgICAgICAgaGFzVmFsdWUgJiYgby5vbk5leHQodmFsdWUpO1xuICAgICAgICAgIG8ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICBoYXNWYWx1ZSA9IGZhbHNlO1xuICAgICAgICAgIGlkKys7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgICByZXR1cm4gbmV3IEJpbmFyeURpc3Bvc2FibGUoc3Vic2NyaXB0aW9uLCBjYW5jZWxhYmxlKTtcbiAgICB9LCBzb3VyY2UpO1xuICB9XG5cbiAgb2JzZXJ2YWJsZVByb3RvLmRlYm91bmNlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChpc0Z1bmN0aW9uIChhcmd1bWVudHNbMF0pKSB7XG4gICAgICByZXR1cm4gZGVib3VuY2VXaXRoU2VsZWN0b3IodGhpcywgYXJndW1lbnRzWzBdKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhcmd1bWVudHNbMF0gPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gbmV3IERlYm91bmNlT2JzZXJ2YWJsZSh0aGlzLCBhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBhcmd1bWVudHMnKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqICBQcm9qZWN0cyBlYWNoIGVsZW1lbnQgb2YgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBpbnRvIHplcm8gb3IgbW9yZSB3aW5kb3dzIHdoaWNoIGFyZSBwcm9kdWNlZCBiYXNlZCBvbiB0aW1pbmcgaW5mb3JtYXRpb24uXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lU3BhbiBMZW5ndGggb2YgZWFjaCB3aW5kb3cgKHNwZWNpZmllZCBhcyBhbiBpbnRlZ2VyIGRlbm90aW5nIG1pbGxpc2Vjb25kcykuXG4gICAqIEBwYXJhbSB7TWl4ZWR9IFt0aW1lU2hpZnRPclNjaGVkdWxlcl0gIEludGVydmFsIGJldHdlZW4gY3JlYXRpb24gb2YgY29uc2VjdXRpdmUgd2luZG93cyAoc3BlY2lmaWVkIGFzIGFuIGludGVnZXIgZGVub3RpbmcgbWlsbGlzZWNvbmRzKSwgb3IgYW4gb3B0aW9uYWwgc2NoZWR1bGVyIHBhcmFtZXRlci4gSWYgbm90IHNwZWNpZmllZCwgdGhlIHRpbWUgc2hpZnQgY29ycmVzcG9uZHMgdG8gdGhlIHRpbWVTcGFuIHBhcmFtZXRlciwgcmVzdWx0aW5nIGluIG5vbi1vdmVybGFwcGluZyBhZGphY2VudCB3aW5kb3dzLlxuICAgKiBAcGFyYW0ge1NjaGVkdWxlcn0gW3NjaGVkdWxlcl0gIFNjaGVkdWxlciB0byBydW4gd2luZG93aW5nIHRpbWVycyBvbi4gSWYgbm90IHNwZWNpZmllZCwgdGhlIHRpbWVvdXQgc2NoZWR1bGVyIGlzIHVzZWQuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIG9mIHdpbmRvd3MuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8ud2luZG93V2l0aFRpbWUgPSBvYnNlcnZhYmxlUHJvdG8ud2luZG93VGltZSA9IGZ1bmN0aW9uICh0aW1lU3BhbiwgdGltZVNoaWZ0T3JTY2hlZHVsZXIsIHNjaGVkdWxlcikge1xuICAgIHZhciBzb3VyY2UgPSB0aGlzLCB0aW1lU2hpZnQ7XG4gICAgdGltZVNoaWZ0T3JTY2hlZHVsZXIgPT0gbnVsbCAmJiAodGltZVNoaWZ0ID0gdGltZVNwYW4pO1xuICAgIGlzU2NoZWR1bGVyKHNjaGVkdWxlcikgfHwgKHNjaGVkdWxlciA9IGRlZmF1bHRTY2hlZHVsZXIpO1xuICAgIGlmICh0eXBlb2YgdGltZVNoaWZ0T3JTY2hlZHVsZXIgPT09ICdudW1iZXInKSB7XG4gICAgICB0aW1lU2hpZnQgPSB0aW1lU2hpZnRPclNjaGVkdWxlcjtcbiAgICB9IGVsc2UgaWYgKGlzU2NoZWR1bGVyKHRpbWVTaGlmdE9yU2NoZWR1bGVyKSkge1xuICAgICAgdGltZVNoaWZ0ID0gdGltZVNwYW47XG4gICAgICBzY2hlZHVsZXIgPSB0aW1lU2hpZnRPclNjaGVkdWxlcjtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBBbm9ueW1vdXNPYnNlcnZhYmxlKGZ1bmN0aW9uIChvYnNlcnZlcikge1xuICAgICAgdmFyIGdyb3VwRGlzcG9zYWJsZSxcbiAgICAgICAgbmV4dFNoaWZ0ID0gdGltZVNoaWZ0LFxuICAgICAgICBuZXh0U3BhbiA9IHRpbWVTcGFuLFxuICAgICAgICBxID0gW10sXG4gICAgICAgIHJlZkNvdW50RGlzcG9zYWJsZSxcbiAgICAgICAgdGltZXJEID0gbmV3IFNlcmlhbERpc3Bvc2FibGUoKSxcbiAgICAgICAgdG90YWxUaW1lID0gMDtcbiAgICAgICAgZ3JvdXBEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUodGltZXJEKSxcbiAgICAgICAgcmVmQ291bnREaXNwb3NhYmxlID0gbmV3IFJlZkNvdW50RGlzcG9zYWJsZShncm91cERpc3Bvc2FibGUpO1xuXG4gICAgICAgZnVuY3Rpb24gY3JlYXRlVGltZXIgKCkge1xuICAgICAgICB2YXIgbSA9IG5ldyBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSgpLFxuICAgICAgICAgIGlzU3BhbiA9IGZhbHNlLFxuICAgICAgICAgIGlzU2hpZnQgPSBmYWxzZTtcbiAgICAgICAgdGltZXJELnNldERpc3Bvc2FibGUobSk7XG4gICAgICAgIGlmIChuZXh0U3BhbiA9PT0gbmV4dFNoaWZ0KSB7XG4gICAgICAgICAgaXNTcGFuID0gdHJ1ZTtcbiAgICAgICAgICBpc1NoaWZ0ID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChuZXh0U3BhbiA8IG5leHRTaGlmdCkge1xuICAgICAgICAgICAgaXNTcGFuID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpc1NoaWZ0ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbmV3VG90YWxUaW1lID0gaXNTcGFuID8gbmV4dFNwYW4gOiBuZXh0U2hpZnQsXG4gICAgICAgICAgdHMgPSBuZXdUb3RhbFRpbWUgLSB0b3RhbFRpbWU7XG4gICAgICAgIHRvdGFsVGltZSA9IG5ld1RvdGFsVGltZTtcbiAgICAgICAgaWYgKGlzU3Bhbikge1xuICAgICAgICAgIG5leHRTcGFuICs9IHRpbWVTaGlmdDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNTaGlmdCkge1xuICAgICAgICAgIG5leHRTaGlmdCArPSB0aW1lU2hpZnQ7XG4gICAgICAgIH1cbiAgICAgICAgbS5zZXREaXNwb3NhYmxlKHNjaGVkdWxlci5zY2hlZHVsZUZ1dHVyZShudWxsLCB0cywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmIChpc1NoaWZ0KSB7XG4gICAgICAgICAgICB2YXIgcyA9IG5ldyBTdWJqZWN0KCk7XG4gICAgICAgICAgICBxLnB1c2gocyk7XG4gICAgICAgICAgICBvYnNlcnZlci5vbk5leHQoYWRkUmVmKHMsIHJlZkNvdW50RGlzcG9zYWJsZSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpc1NwYW4gJiYgcS5zaGlmdCgpLm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgY3JlYXRlVGltZXIoKTtcbiAgICAgICAgfSkpO1xuICAgICAgfTtcbiAgICAgIHEucHVzaChuZXcgU3ViamVjdCgpKTtcbiAgICAgIG9ic2VydmVyLm9uTmV4dChhZGRSZWYocVswXSwgcmVmQ291bnREaXNwb3NhYmxlKSk7XG4gICAgICBjcmVhdGVUaW1lcigpO1xuICAgICAgZ3JvdXBEaXNwb3NhYmxlLmFkZChzb3VyY2Uuc3Vic2NyaWJlKFxuICAgICAgICBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBxLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7IHFbaV0ub25OZXh0KHgpOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHEubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHsgcVtpXS5vbkVycm9yKGUpOyB9XG4gICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBxLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7IHFbaV0ub25Db21wbGV0ZWQoKTsgfVxuICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIH1cbiAgICAgICkpO1xuICAgICAgcmV0dXJuIHJlZkNvdW50RGlzcG9zYWJsZTtcbiAgICB9LCBzb3VyY2UpO1xuICB9O1xuXG4gIC8qKlxuICAgKiAgUHJvamVjdHMgZWFjaCBlbGVtZW50IG9mIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgaW50byBhIHdpbmRvdyB0aGF0IGlzIGNvbXBsZXRlZCB3aGVuIGVpdGhlciBpdCdzIGZ1bGwgb3IgYSBnaXZlbiBhbW91bnQgb2YgdGltZSBoYXMgZWxhcHNlZC5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHRpbWVTcGFuIE1heGltdW0gdGltZSBsZW5ndGggb2YgYSB3aW5kb3cuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBjb3VudCBNYXhpbXVtIGVsZW1lbnQgY291bnQgb2YgYSB3aW5kb3cuXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSAgU2NoZWR1bGVyIHRvIHJ1biB3aW5kb3dpbmcgdGltZXJzIG9uLiBJZiBub3Qgc3BlY2lmaWVkLCB0aGUgdGltZW91dCBzY2hlZHVsZXIgaXMgdXNlZC5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2Ugb2Ygd2luZG93cy5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by53aW5kb3dXaXRoVGltZU9yQ291bnQgPSBvYnNlcnZhYmxlUHJvdG8ud2luZG93VGltZU9yQ291bnQgPSBmdW5jdGlvbiAodGltZVNwYW4sIGNvdW50LCBzY2hlZHVsZXIpIHtcbiAgICB2YXIgc291cmNlID0gdGhpcztcbiAgICBpc1NjaGVkdWxlcihzY2hlZHVsZXIpIHx8IChzY2hlZHVsZXIgPSBkZWZhdWx0U2NoZWR1bGVyKTtcbiAgICByZXR1cm4gbmV3IEFub255bW91c09ic2VydmFibGUoZnVuY3Rpb24gKG9ic2VydmVyKSB7XG4gICAgICB2YXIgdGltZXJEID0gbmV3IFNlcmlhbERpc3Bvc2FibGUoKSxcbiAgICAgICAgICBncm91cERpc3Bvc2FibGUgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSh0aW1lckQpLFxuICAgICAgICAgIHJlZkNvdW50RGlzcG9zYWJsZSA9IG5ldyBSZWZDb3VudERpc3Bvc2FibGUoZ3JvdXBEaXNwb3NhYmxlKSxcbiAgICAgICAgICBuID0gMCxcbiAgICAgICAgICB3aW5kb3dJZCA9IDAsXG4gICAgICAgICAgcyA9IG5ldyBTdWJqZWN0KCk7XG5cbiAgICAgIGZ1bmN0aW9uIGNyZWF0ZVRpbWVyKGlkKSB7XG4gICAgICAgIHZhciBtID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG4gICAgICAgIHRpbWVyRC5zZXREaXNwb3NhYmxlKG0pO1xuICAgICAgICBtLnNldERpc3Bvc2FibGUoc2NoZWR1bGVyLnNjaGVkdWxlRnV0dXJlKG51bGwsIHRpbWVTcGFuLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKGlkICE9PSB3aW5kb3dJZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBuID0gMDtcbiAgICAgICAgICB2YXIgbmV3SWQgPSArK3dpbmRvd0lkO1xuICAgICAgICAgIHMub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICBzID0gbmV3IFN1YmplY3QoKTtcbiAgICAgICAgICBvYnNlcnZlci5vbk5leHQoYWRkUmVmKHMsIHJlZkNvdW50RGlzcG9zYWJsZSkpO1xuICAgICAgICAgIGNyZWF0ZVRpbWVyKG5ld0lkKTtcbiAgICAgICAgfSkpO1xuICAgICAgfVxuXG4gICAgICBvYnNlcnZlci5vbk5leHQoYWRkUmVmKHMsIHJlZkNvdW50RGlzcG9zYWJsZSkpO1xuICAgICAgY3JlYXRlVGltZXIoMCk7XG5cbiAgICAgIGdyb3VwRGlzcG9zYWJsZS5hZGQoc291cmNlLnN1YnNjcmliZShcbiAgICAgICAgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICB2YXIgbmV3SWQgPSAwLCBuZXdXaW5kb3cgPSBmYWxzZTtcbiAgICAgICAgICBzLm9uTmV4dCh4KTtcbiAgICAgICAgICBpZiAoKytuID09PSBjb3VudCkge1xuICAgICAgICAgICAgbmV3V2luZG93ID0gdHJ1ZTtcbiAgICAgICAgICAgIG4gPSAwO1xuICAgICAgICAgICAgbmV3SWQgPSArK3dpbmRvd0lkO1xuICAgICAgICAgICAgcy5vbkNvbXBsZXRlZCgpO1xuICAgICAgICAgICAgcyA9IG5ldyBTdWJqZWN0KCk7XG4gICAgICAgICAgICBvYnNlcnZlci5vbk5leHQoYWRkUmVmKHMsIHJlZkNvdW50RGlzcG9zYWJsZSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXdXaW5kb3cgJiYgY3JlYXRlVGltZXIobmV3SWQpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIHMub25FcnJvcihlKTtcbiAgICAgICAgICBvYnNlcnZlci5vbkVycm9yKGUpO1xuICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcy5vbkNvbXBsZXRlZCgpO1xuICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIH1cbiAgICAgICkpO1xuICAgICAgcmV0dXJuIHJlZkNvdW50RGlzcG9zYWJsZTtcbiAgICB9LCBzb3VyY2UpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIHRvQXJyYXkoeCkgeyByZXR1cm4geC50b0FycmF5KCk7IH1cblxuICAvKipcbiAgICogIFByb2plY3RzIGVhY2ggZWxlbWVudCBvZiBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGludG8gemVybyBvciBtb3JlIGJ1ZmZlcnMgd2hpY2ggYXJlIHByb2R1Y2VkIGJhc2VkIG9uIHRpbWluZyBpbmZvcm1hdGlvbi5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHRpbWVTcGFuIExlbmd0aCBvZiBlYWNoIGJ1ZmZlciAoc3BlY2lmaWVkIGFzIGFuIGludGVnZXIgZGVub3RpbmcgbWlsbGlzZWNvbmRzKS5cbiAgICogQHBhcmFtIHtNaXhlZH0gW3RpbWVTaGlmdE9yU2NoZWR1bGVyXSAgSW50ZXJ2YWwgYmV0d2VlbiBjcmVhdGlvbiBvZiBjb25zZWN1dGl2ZSBidWZmZXJzIChzcGVjaWZpZWQgYXMgYW4gaW50ZWdlciBkZW5vdGluZyBtaWxsaXNlY29uZHMpLCBvciBhbiBvcHRpb25hbCBzY2hlZHVsZXIgcGFyYW1ldGVyLiBJZiBub3Qgc3BlY2lmaWVkLCB0aGUgdGltZSBzaGlmdCBjb3JyZXNwb25kcyB0byB0aGUgdGltZVNwYW4gcGFyYW1ldGVyLCByZXN1bHRpbmcgaW4gbm9uLW92ZXJsYXBwaW5nIGFkamFjZW50IGJ1ZmZlcnMuXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSAgU2NoZWR1bGVyIHRvIHJ1biBidWZmZXIgdGltZXJzIG9uLiBJZiBub3Qgc3BlY2lmaWVkLCB0aGUgdGltZW91dCBzY2hlZHVsZXIgaXMgdXNlZC5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2Ugb2YgYnVmZmVycy5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5idWZmZXJXaXRoVGltZSA9IG9ic2VydmFibGVQcm90by5idWZmZXJUaW1lID0gZnVuY3Rpb24gKHRpbWVTcGFuLCB0aW1lU2hpZnRPclNjaGVkdWxlciwgc2NoZWR1bGVyKSB7XG4gICAgcmV0dXJuIHRoaXMud2luZG93V2l0aFRpbWUodGltZVNwYW4sIHRpbWVTaGlmdE9yU2NoZWR1bGVyLCBzY2hlZHVsZXIpLmZsYXRNYXAodG9BcnJheSk7XG4gIH07XG5cbiAgZnVuY3Rpb24gdG9BcnJheSh4KSB7IHJldHVybiB4LnRvQXJyYXkoKTsgfVxuXG4gIC8qKlxuICAgKiAgUHJvamVjdHMgZWFjaCBlbGVtZW50IG9mIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgaW50byBhIGJ1ZmZlciB0aGF0IGlzIGNvbXBsZXRlZCB3aGVuIGVpdGhlciBpdCdzIGZ1bGwgb3IgYSBnaXZlbiBhbW91bnQgb2YgdGltZSBoYXMgZWxhcHNlZC5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHRpbWVTcGFuIE1heGltdW0gdGltZSBsZW5ndGggb2YgYSBidWZmZXIuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBjb3VudCBNYXhpbXVtIGVsZW1lbnQgY291bnQgb2YgYSBidWZmZXIuXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSAgU2NoZWR1bGVyIHRvIHJ1biBidWZmZXJpbiB0aW1lcnMgb24uIElmIG5vdCBzcGVjaWZpZWQsIHRoZSB0aW1lb3V0IHNjaGVkdWxlciBpcyB1c2VkLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBvZiBidWZmZXJzLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmJ1ZmZlcldpdGhUaW1lT3JDb3VudCA9IG9ic2VydmFibGVQcm90by5idWZmZXJUaW1lT3JDb3VudCA9IGZ1bmN0aW9uICh0aW1lU3BhbiwgY291bnQsIHNjaGVkdWxlcikge1xuICAgIHJldHVybiB0aGlzLndpbmRvd1dpdGhUaW1lT3JDb3VudCh0aW1lU3BhbiwgY291bnQsIHNjaGVkdWxlcikuZmxhdE1hcCh0b0FycmF5KTtcbiAgfTtcblxuICB2YXIgVGltZUludGVydmFsT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoVGltZUludGVydmFsT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBUaW1lSW50ZXJ2YWxPYnNlcnZhYmxlKHNvdXJjZSwgcykge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9zID0gcztcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFRpbWVJbnRlcnZhbE9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgVGltZUludGVydmFsT2JzZXJ2ZXIobywgdGhpcy5fcykpO1xuICAgIH07XG5cbiAgICByZXR1cm4gVGltZUludGVydmFsT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIHZhciBUaW1lSW50ZXJ2YWxPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoVGltZUludGVydmFsT2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG5cbiAgICBmdW5jdGlvbiBUaW1lSW50ZXJ2YWxPYnNlcnZlcihvLCBzKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgdGhpcy5fbCA9IHMubm93KCk7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBUaW1lSW50ZXJ2YWxPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICB2YXIgbm93ID0gdGhpcy5fcy5ub3coKSwgc3BhbiA9IG5vdyAtIHRoaXMuX2w7XG4gICAgICB0aGlzLl9sID0gbm93O1xuICAgICAgdGhpcy5fby5vbk5leHQoeyB2YWx1ZTogeCwgaW50ZXJ2YWw6IHNwYW4gfSk7XG4gICAgfTtcbiAgICBUaW1lSW50ZXJ2YWxPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyB0aGlzLl9vLm9uRXJyb3IoZSk7IH07XG4gICAgVGltZUludGVydmFsT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHsgdGhpcy5fby5vbkNvbXBsZXRlZCgpOyB9O1xuXG4gICAgcmV0dXJuIFRpbWVJbnRlcnZhbE9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogIFJlY29yZHMgdGhlIHRpbWUgaW50ZXJ2YWwgYmV0d2VlbiBjb25zZWN1dGl2ZSB2YWx1ZXMgaW4gYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogIDEgLSByZXMgPSBzb3VyY2UudGltZUludGVydmFsKCk7XG4gICAqICAyIC0gcmVzID0gc291cmNlLnRpbWVJbnRlcnZhbChSeC5TY2hlZHVsZXIudGltZW91dCk7XG4gICAqXG4gICAqIEBwYXJhbSBbc2NoZWR1bGVyXSAgU2NoZWR1bGVyIHVzZWQgdG8gY29tcHV0ZSB0aW1lIGludGVydmFscy4gSWYgbm90IHNwZWNpZmllZCwgdGhlIHRpbWVvdXQgc2NoZWR1bGVyIGlzIHVzZWQuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdpdGggdGltZSBpbnRlcnZhbCBpbmZvcm1hdGlvbiBvbiB2YWx1ZXMuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8udGltZUludGVydmFsID0gZnVuY3Rpb24gKHNjaGVkdWxlcikge1xuICAgIGlzU2NoZWR1bGVyKHNjaGVkdWxlcikgfHwgKHNjaGVkdWxlciA9IGRlZmF1bHRTY2hlZHVsZXIpO1xuICAgIHJldHVybiBuZXcgVGltZUludGVydmFsT2JzZXJ2YWJsZSh0aGlzLCBzY2hlZHVsZXIpO1xuICB9O1xuXG4gIHZhciBUaW1lc3RhbXBPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhUaW1lc3RhbXBPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFRpbWVzdGFtcE9ic2VydmFibGUoc291cmNlLCBzKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgVGltZXN0YW1wT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG5ldyBUaW1lc3RhbXBPYnNlcnZlcihvLCB0aGlzLl9zKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBUaW1lc3RhbXBPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIFRpbWVzdGFtcE9ic2VydmVyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhUaW1lc3RhbXBPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBUaW1lc3RhbXBPYnNlcnZlcihvLCBzKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgVGltZXN0YW1wT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgdGhpcy5fby5vbk5leHQoeyB2YWx1ZTogeCwgdGltZXN0YW1wOiB0aGlzLl9zLm5vdygpIH0pO1xuICAgIH07XG5cbiAgICBUaW1lc3RhbXBPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgdGhpcy5fby5vbkVycm9yKGUpO1xuICAgIH07XG5cbiAgICBUaW1lc3RhbXBPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gVGltZXN0YW1wT2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAgKiAgUmVjb3JkcyB0aGUgdGltZXN0YW1wIGZvciBlYWNoIHZhbHVlIGluIGFuIG9ic2VydmFibGUgc2VxdWVuY2UuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqICAxIC0gcmVzID0gc291cmNlLnRpbWVzdGFtcCgpOyAvLyBwcm9kdWNlcyB7IHZhbHVlOiB4LCB0aW1lc3RhbXA6IHRzIH1cbiAgICogIDIgLSByZXMgPSBzb3VyY2UudGltZXN0YW1wKFJ4LlNjaGVkdWxlci5kZWZhdWx0KTtcbiAgICpcbiAgICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXJdICBTY2hlZHVsZXIgdXNlZCB0byBjb21wdXRlIHRpbWVzdGFtcHMuIElmIG5vdCBzcGVjaWZpZWQsIHRoZSBkZWZhdWx0IHNjaGVkdWxlciBpcyB1c2VkLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB3aXRoIHRpbWVzdGFtcCBpbmZvcm1hdGlvbiBvbiB2YWx1ZXMuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8udGltZXN0YW1wID0gZnVuY3Rpb24gKHNjaGVkdWxlcikge1xuICAgIGlzU2NoZWR1bGVyKHNjaGVkdWxlcikgfHwgKHNjaGVkdWxlciA9IGRlZmF1bHRTY2hlZHVsZXIpO1xuICAgIHJldHVybiBuZXcgVGltZXN0YW1wT2JzZXJ2YWJsZSh0aGlzLCBzY2hlZHVsZXIpO1xuICB9O1xuXG4gIHZhciBTYW1wbGVPYnNlcnZhYmxlID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFNhbXBsZU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gU2FtcGxlT2JzZXJ2YWJsZShzb3VyY2UsIHNhbXBsZXIpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5fc2FtcGxlciA9IHNhbXBsZXI7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBTYW1wbGVPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgICAgbzogbyxcbiAgICAgICAgYXRFbmQ6IGZhbHNlLFxuICAgICAgICB2YWx1ZTogbnVsbCxcbiAgICAgICAgaGFzVmFsdWU6IGZhbHNlLFxuICAgICAgICBzb3VyY2VTdWJzY3JpcHRpb246IG5ldyBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSgpXG4gICAgICB9O1xuXG4gICAgICBzdGF0ZS5zb3VyY2VTdWJzY3JpcHRpb24uc2V0RGlzcG9zYWJsZSh0aGlzLnNvdXJjZS5zdWJzY3JpYmUobmV3IFNhbXBsZVNvdXJjZU9ic2VydmVyKHN0YXRlKSkpO1xuICAgICAgcmV0dXJuIG5ldyBCaW5hcnlEaXNwb3NhYmxlKFxuICAgICAgICBzdGF0ZS5zb3VyY2VTdWJzY3JpcHRpb24sXG4gICAgICAgIHRoaXMuX3NhbXBsZXIuc3Vic2NyaWJlKG5ldyBTYW1wbGVyT2JzZXJ2ZXIoc3RhdGUpKVxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFNhbXBsZU9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgU2FtcGxlck9ic2VydmVyID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFNhbXBsZXJPYnNlcnZlciwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBTYW1wbGVyT2JzZXJ2ZXIocykge1xuICAgICAgdGhpcy5fcyA9IHM7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBTYW1wbGVyT2JzZXJ2ZXIucHJvdG90eXBlLl9oYW5kbGVNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHRoaXMuX3MuaGFzVmFsdWUpIHtcbiAgICAgICAgdGhpcy5fcy5oYXNWYWx1ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9zLm8ub25OZXh0KHRoaXMuX3MudmFsdWUpO1xuICAgICAgfVxuICAgICAgdGhpcy5fcy5hdEVuZCAmJiB0aGlzLl9zLm8ub25Db21wbGV0ZWQoKTtcbiAgICB9O1xuXG4gICAgU2FtcGxlck9ic2VydmVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKCkgeyB0aGlzLl9oYW5kbGVNZXNzYWdlKCk7IH07XG4gICAgU2FtcGxlck9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7IHRoaXMuX3Mub25FcnJvcihlKTsgfTtcbiAgICBTYW1wbGVyT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHsgdGhpcy5faGFuZGxlTWVzc2FnZSgpOyB9O1xuXG4gICAgcmV0dXJuIFNhbXBsZXJPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgdmFyIFNhbXBsZVNvdXJjZU9ic2VydmVyID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFNhbXBsZVNvdXJjZU9ic2VydmVyLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFNhbXBsZVNvdXJjZU9ic2VydmVyKHMpIHtcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgU2FtcGxlU291cmNlT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgdGhpcy5fcy5oYXNWYWx1ZSA9IHRydWU7XG4gICAgICB0aGlzLl9zLnZhbHVlID0geDtcbiAgICB9O1xuICAgIFNhbXBsZVNvdXJjZU9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7IHRoaXMuX3Muby5vbkVycm9yKGUpOyB9O1xuICAgIFNhbXBsZVNvdXJjZU9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLl9zLmF0RW5kID0gdHJ1ZTtcbiAgICAgIHRoaXMuX3Muc291cmNlU3Vic2NyaXB0aW9uLmRpc3Bvc2UoKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFNhbXBsZVNvdXJjZU9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogIFNhbXBsZXMgdGhlIG9ic2VydmFibGUgc2VxdWVuY2UgYXQgZWFjaCBpbnRlcnZhbC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogIDEgLSByZXMgPSBzb3VyY2Uuc2FtcGxlKHNhbXBsZU9ic2VydmFibGUpOyAvLyBTYW1wbGVyIHRpY2sgc2VxdWVuY2VcbiAgICogIDIgLSByZXMgPSBzb3VyY2Uuc2FtcGxlKDUwMDApOyAvLyA1IHNlY29uZHNcbiAgICogIDIgLSByZXMgPSBzb3VyY2Uuc2FtcGxlKDUwMDAsIFJ4LlNjaGVkdWxlci50aW1lb3V0KTsgLy8gNSBzZWNvbmRzXG4gICAqXG4gICAqIEBwYXJhbSB7TWl4ZWR9IGludGVydmFsT3JTYW1wbGVyIEludGVydmFsIGF0IHdoaWNoIHRvIHNhbXBsZSAoc3BlY2lmaWVkIGFzIGFuIGludGVnZXIgZGVub3RpbmcgbWlsbGlzZWNvbmRzKSBvciBTYW1wbGVyIE9ic2VydmFibGUuXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSAgU2NoZWR1bGVyIHRvIHJ1biB0aGUgc2FtcGxpbmcgdGltZXIgb24uIElmIG5vdCBzcGVjaWZpZWQsIHRoZSB0aW1lb3V0IHNjaGVkdWxlciBpcyB1c2VkLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gU2FtcGxlZCBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnNhbXBsZSA9IGZ1bmN0aW9uIChpbnRlcnZhbE9yU2FtcGxlciwgc2NoZWR1bGVyKSB7XG4gICAgaXNTY2hlZHVsZXIoc2NoZWR1bGVyKSB8fCAoc2NoZWR1bGVyID0gZGVmYXVsdFNjaGVkdWxlcik7XG4gICAgcmV0dXJuIHR5cGVvZiBpbnRlcnZhbE9yU2FtcGxlciA9PT0gJ251bWJlcicgP1xuICAgICAgbmV3IFNhbXBsZU9ic2VydmFibGUodGhpcywgb2JzZXJ2YWJsZWludGVydmFsKGludGVydmFsT3JTYW1wbGVyLCBzY2hlZHVsZXIpKSA6XG4gICAgICBuZXcgU2FtcGxlT2JzZXJ2YWJsZSh0aGlzLCBpbnRlcnZhbE9yU2FtcGxlcik7XG4gIH07XG5cbiAgdmFyIFRpbWVvdXRFcnJvciA9IFJ4LlRpbWVvdXRFcnJvciA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlIHx8ICdUaW1lb3V0IGhhcyBvY2N1cnJlZCc7XG4gICAgdGhpcy5uYW1lID0gJ1RpbWVvdXRFcnJvcic7XG4gICAgRXJyb3IuY2FsbCh0aGlzKTtcbiAgfTtcbiAgVGltZW91dEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcblxuICBmdW5jdGlvbiB0aW1lb3V0V2l0aFNlbGVjdG9yKHNvdXJjZSwgZmlyc3RUaW1lb3V0LCB0aW1lb3V0RHVyYXRpb25TZWxlY3Rvciwgb3RoZXIpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihmaXJzdFRpbWVvdXQpKSB7XG4gICAgICBvdGhlciA9IHRpbWVvdXREdXJhdGlvblNlbGVjdG9yO1xuICAgICAgdGltZW91dER1cmF0aW9uU2VsZWN0b3IgPSBmaXJzdFRpbWVvdXQ7XG4gICAgICBmaXJzdFRpbWVvdXQgPSBvYnNlcnZhYmxlTmV2ZXIoKTtcbiAgICB9XG4gICAgT2JzZXJ2YWJsZS5pc09ic2VydmFibGUob3RoZXIpIHx8IChvdGhlciA9IG9ic2VydmFibGVUaHJvdyhuZXcgVGltZW91dEVycm9yKCkpKTtcbiAgICByZXR1cm4gbmV3IEFub255bW91c09ic2VydmFibGUoZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciBzdWJzY3JpcHRpb24gPSBuZXcgU2VyaWFsRGlzcG9zYWJsZSgpLFxuICAgICAgICB0aW1lciA9IG5ldyBTZXJpYWxEaXNwb3NhYmxlKCksXG4gICAgICAgIG9yaWdpbmFsID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG5cbiAgICAgIHN1YnNjcmlwdGlvbi5zZXREaXNwb3NhYmxlKG9yaWdpbmFsKTtcblxuICAgICAgdmFyIGlkID0gMCwgc3dpdGNoZWQgPSBmYWxzZTtcblxuICAgICAgZnVuY3Rpb24gc2V0VGltZXIodGltZW91dCkge1xuICAgICAgICB2YXIgbXlJZCA9IGlkLCBkID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gdGltZXJXaW5zKCkge1xuICAgICAgICAgIHN3aXRjaGVkID0gKG15SWQgPT09IGlkKTtcbiAgICAgICAgICByZXR1cm4gc3dpdGNoZWQ7XG4gICAgICAgIH1cblxuICAgICAgICB0aW1lci5zZXREaXNwb3NhYmxlKGQpO1xuICAgICAgICBkLnNldERpc3Bvc2FibGUodGltZW91dC5zdWJzY3JpYmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHRpbWVyV2lucygpICYmIHN1YnNjcmlwdGlvbi5zZXREaXNwb3NhYmxlKG90aGVyLnN1YnNjcmliZShvKSk7XG4gICAgICAgICAgZC5kaXNwb3NlKCk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgdGltZXJXaW5zKCkgJiYgby5vbkVycm9yKGUpO1xuICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdGltZXJXaW5zKCkgJiYgc3Vic2NyaXB0aW9uLnNldERpc3Bvc2FibGUob3RoZXIuc3Vic2NyaWJlKG8pKTtcbiAgICAgICAgfSkpO1xuICAgICAgfTtcblxuICAgICAgc2V0VGltZXIoZmlyc3RUaW1lb3V0KTtcblxuICAgICAgZnVuY3Rpb24gb1dpbnMoKSB7XG4gICAgICAgIHZhciByZXMgPSAhc3dpdGNoZWQ7XG4gICAgICAgIGlmIChyZXMpIHsgaWQrKzsgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgfVxuXG4gICAgICBvcmlnaW5hbC5zZXREaXNwb3NhYmxlKHNvdXJjZS5zdWJzY3JpYmUoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgaWYgKG9XaW5zKCkpIHtcbiAgICAgICAgICBvLm9uTmV4dCh4KTtcbiAgICAgICAgICB2YXIgdGltZW91dCA9IHRyeUNhdGNoKHRpbWVvdXREdXJhdGlvblNlbGVjdG9yKSh4KTtcbiAgICAgICAgICBpZiAodGltZW91dCA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIG8ub25FcnJvcih0aW1lb3V0LmUpOyB9XG4gICAgICAgICAgc2V0VGltZXIoaXNQcm9taXNlKHRpbWVvdXQpID8gb2JzZXJ2YWJsZUZyb21Qcm9taXNlKHRpbWVvdXQpIDogdGltZW91dCk7XG4gICAgICAgIH1cbiAgICAgIH0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIG9XaW5zKCkgJiYgby5vbkVycm9yKGUpO1xuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICBvV2lucygpICYmIG8ub25Db21wbGV0ZWQoKTtcbiAgICAgIH0pKTtcbiAgICAgIHJldHVybiBuZXcgQmluYXJ5RGlzcG9zYWJsZShzdWJzY3JpcHRpb24sIHRpbWVyKTtcbiAgICB9LCBzb3VyY2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gdGltZW91dChzb3VyY2UsIGR1ZVRpbWUsIG90aGVyLCBzY2hlZHVsZXIpIHtcbiAgICBpZiAoaXNTY2hlZHVsZXIob3RoZXIpKSB7XG4gICAgICBzY2hlZHVsZXIgPSBvdGhlcjtcbiAgICAgIG90aGVyID0gb2JzZXJ2YWJsZVRocm93KG5ldyBUaW1lb3V0RXJyb3IoKSk7XG4gICAgfVxuICAgIGlmIChvdGhlciBpbnN0YW5jZW9mIEVycm9yKSB7IG90aGVyID0gb2JzZXJ2YWJsZVRocm93KG90aGVyKTsgfVxuICAgIGlzU2NoZWR1bGVyKHNjaGVkdWxlcikgfHwgKHNjaGVkdWxlciA9IGRlZmF1bHRTY2hlZHVsZXIpO1xuICAgIE9ic2VydmFibGUuaXNPYnNlcnZhYmxlKG90aGVyKSB8fCAob3RoZXIgPSBvYnNlcnZhYmxlVGhyb3cobmV3IFRpbWVvdXRFcnJvcigpKSk7XG4gICAgcmV0dXJuIG5ldyBBbm9ueW1vdXNPYnNlcnZhYmxlKGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgaWQgPSAwLFxuICAgICAgICBvcmlnaW5hbCA9IG5ldyBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSgpLFxuICAgICAgICBzdWJzY3JpcHRpb24gPSBuZXcgU2VyaWFsRGlzcG9zYWJsZSgpLFxuICAgICAgICBzd2l0Y2hlZCA9IGZhbHNlLFxuICAgICAgICB0aW1lciA9IG5ldyBTZXJpYWxEaXNwb3NhYmxlKCk7XG5cbiAgICAgIHN1YnNjcmlwdGlvbi5zZXREaXNwb3NhYmxlKG9yaWdpbmFsKTtcblxuICAgICAgZnVuY3Rpb24gY3JlYXRlVGltZXIoKSB7XG4gICAgICAgIHZhciBteUlkID0gaWQ7XG4gICAgICAgIHRpbWVyLnNldERpc3Bvc2FibGUoc2NoZWR1bGVyLnNjaGVkdWxlRnV0dXJlKG51bGwsIGR1ZVRpbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBzd2l0Y2hlZCA9IGlkID09PSBteUlkO1xuICAgICAgICAgIGlmIChzd2l0Y2hlZCkge1xuICAgICAgICAgICAgaXNQcm9taXNlKG90aGVyKSAmJiAob3RoZXIgPSBvYnNlcnZhYmxlRnJvbVByb21pc2Uob3RoZXIpKTtcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbi5zZXREaXNwb3NhYmxlKG90aGVyLnN1YnNjcmliZShvKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICB9XG5cbiAgICAgIGNyZWF0ZVRpbWVyKCk7XG5cbiAgICAgIG9yaWdpbmFsLnNldERpc3Bvc2FibGUoc291cmNlLnN1YnNjcmliZShmdW5jdGlvbiAoeCkge1xuICAgICAgICBpZiAoIXN3aXRjaGVkKSB7XG4gICAgICAgICAgaWQrKztcbiAgICAgICAgICBvLm9uTmV4dCh4KTtcbiAgICAgICAgICBjcmVhdGVUaW1lcigpO1xuICAgICAgICB9XG4gICAgICB9LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBpZiAoIXN3aXRjaGVkKSB7XG4gICAgICAgICAgaWQrKztcbiAgICAgICAgICBvLm9uRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFzd2l0Y2hlZCkge1xuICAgICAgICAgIGlkKys7XG4gICAgICAgICAgby5vbkNvbXBsZXRlZCgpO1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgICByZXR1cm4gbmV3IEJpbmFyeURpc3Bvc2FibGUoc3Vic2NyaXB0aW9uLCB0aW1lcik7XG4gICAgfSwgc291cmNlKTtcbiAgfVxuXG4gIG9ic2VydmFibGVQcm90by50aW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBmaXJzdEFyZyA9IGFyZ3VtZW50c1swXTtcbiAgICBpZiAoZmlyc3RBcmcgaW5zdGFuY2VvZiBEYXRlIHx8IHR5cGVvZiBmaXJzdEFyZyA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB0aW1lb3V0KHRoaXMsIGZpcnN0QXJnLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgfSBlbHNlIGlmIChPYnNlcnZhYmxlLmlzT2JzZXJ2YWJsZShmaXJzdEFyZykgfHwgaXNGdW5jdGlvbihmaXJzdEFyZykpIHtcbiAgICAgIHJldHVybiB0aW1lb3V0V2l0aFNlbGVjdG9yKHRoaXMsIGZpcnN0QXJnLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBhcmd1bWVudHMnKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIEdlbmVyYXRlQWJzb2x1dGVPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhHZW5lcmF0ZUFic29sdXRlT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBHZW5lcmF0ZUFic29sdXRlT2JzZXJ2YWJsZShzdGF0ZSwgY25kRm4sIGl0ckZuLCByZXNGbiwgdGltZUZuLCBzKSB7XG4gICAgICB0aGlzLl9zdGF0ZSA9IHN0YXRlO1xuICAgICAgdGhpcy5fY25kRm4gPSBjbmRGbjtcbiAgICAgIHRoaXMuX2l0ckZuID0gaXRyRm47XG4gICAgICB0aGlzLl9yZXNGbiA9IHJlc0ZuO1xuICAgICAgdGhpcy5fdGltZUZuID0gdGltZUZuO1xuICAgICAgdGhpcy5fcyA9IHM7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2hlZHVsZVJlY3Vyc2l2ZShzdGF0ZSwgcmVjdXJzZSkge1xuICAgICAgc3RhdGUuaGFzUmVzdWx0ICYmIHN0YXRlLm8ub25OZXh0KHN0YXRlLnJlc3VsdCk7XG5cbiAgICAgIGlmIChzdGF0ZS5maXJzdCkge1xuICAgICAgICBzdGF0ZS5maXJzdCA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUubmV3U3RhdGUgPSB0cnlDYXRjaChzdGF0ZS5zZWxmLl9pdHJGbikoc3RhdGUubmV3U3RhdGUpO1xuICAgICAgICBpZiAoc3RhdGUubmV3U3RhdGUgPT09IGVycm9yT2JqKSB7IHJldHVybiBzdGF0ZS5vLm9uRXJyb3Ioc3RhdGUubmV3U3RhdGUuZSk7IH1cbiAgICAgIH1cbiAgICAgIHN0YXRlLmhhc1Jlc3VsdCA9IHRyeUNhdGNoKHN0YXRlLnNlbGYuX2NuZEZuKShzdGF0ZS5uZXdTdGF0ZSk7XG4gICAgICBpZiAoc3RhdGUuaGFzUmVzdWx0ID09PSBlcnJvck9iaikgeyByZXR1cm4gc3RhdGUuby5vbkVycm9yKHN0YXRlLmhhc1Jlc3VsdC5lKTsgfVxuICAgICAgaWYgKHN0YXRlLmhhc1Jlc3VsdCkge1xuICAgICAgICBzdGF0ZS5yZXN1bHQgPSB0cnlDYXRjaChzdGF0ZS5zZWxmLl9yZXNGbikoc3RhdGUubmV3U3RhdGUpO1xuICAgICAgICBpZiAoc3RhdGUucmVzdWx0ID09PSBlcnJvck9iaikgeyByZXR1cm4gc3RhdGUuby5vbkVycm9yKHN0YXRlLnJlc3VsdC5lKTsgfVxuICAgICAgICB2YXIgdGltZSA9IHRyeUNhdGNoKHN0YXRlLnNlbGYuX3RpbWVGbikoc3RhdGUubmV3U3RhdGUpO1xuICAgICAgICBpZiAodGltZSA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHN0YXRlLm8ub25FcnJvcih0aW1lLmUpOyB9XG4gICAgICAgIHJlY3Vyc2Uoc3RhdGUsIHRpbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUuby5vbkNvbXBsZXRlZCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIEdlbmVyYXRlQWJzb2x1dGVPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgICAgbzogbyxcbiAgICAgICAgc2VsZjogdGhpcyxcbiAgICAgICAgbmV3U3RhdGU6IHRoaXMuX3N0YXRlLFxuICAgICAgICBmaXJzdDogdHJ1ZSxcbiAgICAgICAgaGFzUmVzdWx0OiBmYWxzZVxuICAgICAgfTtcbiAgICAgIHJldHVybiB0aGlzLl9zLnNjaGVkdWxlUmVjdXJzaXZlRnV0dXJlKHN0YXRlLCBuZXcgRGF0ZSh0aGlzLl9zLm5vdygpKSwgc2NoZWR1bGVSZWN1cnNpdmUpO1xuICAgIH07XG5cbiAgICByZXR1cm4gR2VuZXJhdGVBYnNvbHV0ZU9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICAvKipcbiAgICogIEdlbmVyYXRlQWJzb2x1dGVzIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgYnkgaXRlcmF0aW5nIGEgc3RhdGUgZnJvbSBhbiBpbml0aWFsIHN0YXRlIHVudGlsIHRoZSBjb25kaXRpb24gZmFpbHMuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqICByZXMgPSBzb3VyY2UuZ2VuZXJhdGVXaXRoQWJzb2x1dGVUaW1lKDAsXG4gICAqICAgICAgZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHJldHVybiB0cnVlOyB9LFxuICAgKiAgICAgIGZ1bmN0aW9uICh4KSB7IHJldHVybiB4ICsgMTsgfSxcbiAgICogICAgICBmdW5jdGlvbiAoeCkgeyByZXR1cm4geDsgfSxcbiAgICogICAgICBmdW5jdGlvbiAoeCkgeyByZXR1cm4gbmV3IERhdGUoKTsgfVxuICAgKiAgfSk7XG4gICAqXG4gICAqIEBwYXJhbSB7TWl4ZWR9IGluaXRpYWxTdGF0ZSBJbml0aWFsIHN0YXRlLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb25kaXRpb24gQ29uZGl0aW9uIHRvIHRlcm1pbmF0ZSBnZW5lcmF0aW9uICh1cG9uIHJldHVybmluZyBmYWxzZSkuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGUgSXRlcmF0aW9uIHN0ZXAgZnVuY3Rpb24uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IHJlc3VsdFNlbGVjdG9yIFNlbGVjdG9yIGZ1bmN0aW9uIGZvciByZXN1bHRzIHByb2R1Y2VkIGluIHRoZSBzZXF1ZW5jZS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gdGltZVNlbGVjdG9yIFRpbWUgc2VsZWN0b3IgZnVuY3Rpb24gdG8gY29udHJvbCB0aGUgc3BlZWQgb2YgdmFsdWVzIGJlaW5nIHByb2R1Y2VkIGVhY2ggaXRlcmF0aW9uLCByZXR1cm5pbmcgRGF0ZSB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSAgU2NoZWR1bGVyIG9uIHdoaWNoIHRvIHJ1biB0aGUgZ2VuZXJhdG9yIGxvb3AuIElmIG5vdCBzcGVjaWZpZWQsIHRoZSB0aW1lb3V0IHNjaGVkdWxlciBpcyB1c2VkLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gVGhlIGdlbmVyYXRlZCBzZXF1ZW5jZS5cbiAgICovXG4gIE9ic2VydmFibGUuZ2VuZXJhdGVXaXRoQWJzb2x1dGVUaW1lID0gZnVuY3Rpb24gKGluaXRpYWxTdGF0ZSwgY29uZGl0aW9uLCBpdGVyYXRlLCByZXN1bHRTZWxlY3RvciwgdGltZVNlbGVjdG9yLCBzY2hlZHVsZXIpIHtcbiAgICBpc1NjaGVkdWxlcihzY2hlZHVsZXIpIHx8IChzY2hlZHVsZXIgPSBkZWZhdWx0U2NoZWR1bGVyKTtcbiAgICByZXR1cm4gbmV3IEdlbmVyYXRlQWJzb2x1dGVPYnNlcnZhYmxlKGluaXRpYWxTdGF0ZSwgY29uZGl0aW9uLCBpdGVyYXRlLCByZXN1bHRTZWxlY3RvciwgdGltZVNlbGVjdG9yLCBzY2hlZHVsZXIpO1xuICB9O1xuXG4gIHZhciBHZW5lcmF0ZVJlbGF0aXZlT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoR2VuZXJhdGVSZWxhdGl2ZU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gR2VuZXJhdGVSZWxhdGl2ZU9ic2VydmFibGUoc3RhdGUsIGNuZEZuLCBpdHJGbiwgcmVzRm4sIHRpbWVGbiwgcykge1xuICAgICAgdGhpcy5fc3RhdGUgPSBzdGF0ZTtcbiAgICAgIHRoaXMuX2NuZEZuID0gY25kRm47XG4gICAgICB0aGlzLl9pdHJGbiA9IGl0ckZuO1xuICAgICAgdGhpcy5fcmVzRm4gPSByZXNGbjtcbiAgICAgIHRoaXMuX3RpbWVGbiA9IHRpbWVGbjtcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NoZWR1bGVSZWN1cnNpdmUoc3RhdGUsIHJlY3Vyc2UpIHtcbiAgICAgIHN0YXRlLmhhc1Jlc3VsdCAmJiBzdGF0ZS5vLm9uTmV4dChzdGF0ZS5yZXN1bHQpO1xuXG4gICAgICBpZiAoc3RhdGUuZmlyc3QpIHtcbiAgICAgICAgc3RhdGUuZmlyc3QgPSBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLm5ld1N0YXRlID0gdHJ5Q2F0Y2goc3RhdGUuc2VsZi5faXRyRm4pKHN0YXRlLm5ld1N0YXRlKTtcbiAgICAgICAgaWYgKHN0YXRlLm5ld1N0YXRlID09PSBlcnJvck9iaikgeyByZXR1cm4gc3RhdGUuby5vbkVycm9yKHN0YXRlLm5ld1N0YXRlLmUpOyB9XG4gICAgICB9XG5cbiAgICAgIHN0YXRlLmhhc1Jlc3VsdCA9IHRyeUNhdGNoKHN0YXRlLnNlbGYuX2NuZEZuKShzdGF0ZS5uZXdTdGF0ZSk7XG4gICAgICBpZiAoc3RhdGUuaGFzUmVzdWx0ID09PSBlcnJvck9iaikgeyByZXR1cm4gc3RhdGUuby5vbkVycm9yKHN0YXRlLmhhc1Jlc3VsdC5lKTsgfVxuICAgICAgaWYgKHN0YXRlLmhhc1Jlc3VsdCkge1xuICAgICAgICBzdGF0ZS5yZXN1bHQgPSB0cnlDYXRjaChzdGF0ZS5zZWxmLl9yZXNGbikoc3RhdGUubmV3U3RhdGUpO1xuICAgICAgICBpZiAoc3RhdGUucmVzdWx0ID09PSBlcnJvck9iaikgeyByZXR1cm4gc3RhdGUuby5vbkVycm9yKHN0YXRlLnJlc3VsdC5lKTsgfVxuICAgICAgICB2YXIgdGltZSA9IHRyeUNhdGNoKHN0YXRlLnNlbGYuX3RpbWVGbikoc3RhdGUubmV3U3RhdGUpO1xuICAgICAgICBpZiAodGltZSA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIHN0YXRlLm8ub25FcnJvcih0aW1lLmUpOyB9XG4gICAgICAgIHJlY3Vyc2Uoc3RhdGUsIHRpbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUuby5vbkNvbXBsZXRlZCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIEdlbmVyYXRlUmVsYXRpdmVPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgICAgbzogbyxcbiAgICAgICAgc2VsZjogdGhpcyxcbiAgICAgICAgbmV3U3RhdGU6IHRoaXMuX3N0YXRlLFxuICAgICAgICBmaXJzdDogdHJ1ZSxcbiAgICAgICAgaGFzUmVzdWx0OiBmYWxzZVxuICAgICAgfTtcbiAgICAgIHJldHVybiB0aGlzLl9zLnNjaGVkdWxlUmVjdXJzaXZlRnV0dXJlKHN0YXRlLCAwLCBzY2hlZHVsZVJlY3Vyc2l2ZSk7XG4gICAgfTtcblxuICAgIHJldHVybiBHZW5lcmF0ZVJlbGF0aXZlT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIC8qKlxuICAgKiAgR2VuZXJhdGVzIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgYnkgaXRlcmF0aW5nIGEgc3RhdGUgZnJvbSBhbiBpbml0aWFsIHN0YXRlIHVudGlsIHRoZSBjb25kaXRpb24gZmFpbHMuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqICByZXMgPSBzb3VyY2UuZ2VuZXJhdGVXaXRoUmVsYXRpdmVUaW1lKDAsXG4gICAqICAgICAgZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHJldHVybiB0cnVlOyB9LFxuICAgKiAgICAgIGZ1bmN0aW9uICh4KSB7IHJldHVybiB4ICsgMTsgfSxcbiAgICogICAgICBmdW5jdGlvbiAoeCkgeyByZXR1cm4geDsgfSxcbiAgICogICAgICBmdW5jdGlvbiAoeCkgeyByZXR1cm4gNTAwOyB9XG4gICAqICApO1xuICAgKlxuICAgKiBAcGFyYW0ge01peGVkfSBpbml0aWFsU3RhdGUgSW5pdGlhbCBzdGF0ZS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY29uZGl0aW9uIENvbmRpdGlvbiB0byB0ZXJtaW5hdGUgZ2VuZXJhdGlvbiAodXBvbiByZXR1cm5pbmcgZmFsc2UpLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlIEl0ZXJhdGlvbiBzdGVwIGZ1bmN0aW9uLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXN1bHRTZWxlY3RvciBTZWxlY3RvciBmdW5jdGlvbiBmb3IgcmVzdWx0cyBwcm9kdWNlZCBpbiB0aGUgc2VxdWVuY2UuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IHRpbWVTZWxlY3RvciBUaW1lIHNlbGVjdG9yIGZ1bmN0aW9uIHRvIGNvbnRyb2wgdGhlIHNwZWVkIG9mIHZhbHVlcyBiZWluZyBwcm9kdWNlZCBlYWNoIGl0ZXJhdGlvbiwgcmV0dXJuaW5nIGludGVnZXIgdmFsdWVzIGRlbm90aW5nIG1pbGxpc2Vjb25kcy5cbiAgICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXJdICBTY2hlZHVsZXIgb24gd2hpY2ggdG8gcnVuIHRoZSBnZW5lcmF0b3IgbG9vcC4gSWYgbm90IHNwZWNpZmllZCwgdGhlIHRpbWVvdXQgc2NoZWR1bGVyIGlzIHVzZWQuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBUaGUgZ2VuZXJhdGVkIHNlcXVlbmNlLlxuICAgKi9cbiAgT2JzZXJ2YWJsZS5nZW5lcmF0ZVdpdGhSZWxhdGl2ZVRpbWUgPSBmdW5jdGlvbiAoaW5pdGlhbFN0YXRlLCBjb25kaXRpb24sIGl0ZXJhdGUsIHJlc3VsdFNlbGVjdG9yLCB0aW1lU2VsZWN0b3IsIHNjaGVkdWxlcikge1xuICAgIGlzU2NoZWR1bGVyKHNjaGVkdWxlcikgfHwgKHNjaGVkdWxlciA9IGRlZmF1bHRTY2hlZHVsZXIpO1xuICAgIHJldHVybiBuZXcgR2VuZXJhdGVSZWxhdGl2ZU9ic2VydmFibGUoaW5pdGlhbFN0YXRlLCBjb25kaXRpb24sIGl0ZXJhdGUsIHJlc3VsdFNlbGVjdG9yLCB0aW1lU2VsZWN0b3IsIHNjaGVkdWxlcik7XG4gIH07XG5cbiAgdmFyIERlbGF5U3Vic2NyaXB0aW9uID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKERlbGF5U3Vic2NyaXB0aW9uLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIERlbGF5U3Vic2NyaXB0aW9uKHNvdXJjZSwgZHQsIHMpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5fZHQgPSBkdDtcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgRGVsYXlTdWJzY3JpcHRpb24ucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgdmFyIGQgPSBuZXcgU2VyaWFsRGlzcG9zYWJsZSgpO1xuXG4gICAgICBkLnNldERpc3Bvc2FibGUodGhpcy5fcy5zY2hlZHVsZUZ1dHVyZShbdGhpcy5zb3VyY2UsIG8sIGRdLCB0aGlzLl9kdCwgc2NoZWR1bGVNZXRob2QpKTtcblxuICAgICAgcmV0dXJuIGQ7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNjaGVkdWxlTWV0aG9kKHMsIHN0YXRlKSB7XG4gICAgICB2YXIgc291cmNlID0gc3RhdGVbMF0sIG8gPSBzdGF0ZVsxXSwgZCA9IHN0YXRlWzJdO1xuICAgICAgZC5zZXREaXNwb3NhYmxlKHNvdXJjZS5zdWJzY3JpYmUobykpO1xuICAgIH1cblxuICAgIHJldHVybiBEZWxheVN1YnNjcmlwdGlvbjtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIC8qKlxuICAgKiAgVGltZSBzaGlmdHMgdGhlIG9ic2VydmFibGUgc2VxdWVuY2UgYnkgZGVsYXlpbmcgdGhlIHN1YnNjcmlwdGlvbiB3aXRoIHRoZSBzcGVjaWZpZWQgcmVsYXRpdmUgdGltZSBkdXJhdGlvbiwgdXNpbmcgdGhlIHNwZWNpZmllZCBzY2hlZHVsZXIgdG8gcnVuIHRpbWVycy5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogIDEgLSByZXMgPSBzb3VyY2UuZGVsYXlTdWJzY3JpcHRpb24oNTAwMCk7IC8vIDVzXG4gICAqICAyIC0gcmVzID0gc291cmNlLmRlbGF5U3Vic2NyaXB0aW9uKDUwMDAsIFJ4LlNjaGVkdWxlci5kZWZhdWx0KTsgLy8gNSBzZWNvbmRzXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkdWVUaW1lIFJlbGF0aXZlIG9yIGFic29sdXRlIHRpbWUgc2hpZnQgb2YgdGhlIHN1YnNjcmlwdGlvbi5cbiAgICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXJdICBTY2hlZHVsZXIgdG8gcnVuIHRoZSBzdWJzY3JpcHRpb24gZGVsYXkgdGltZXIgb24uIElmIG5vdCBzcGVjaWZpZWQsIHRoZSB0aW1lb3V0IHNjaGVkdWxlciBpcyB1c2VkLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gVGltZS1zaGlmdGVkIHNlcXVlbmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmRlbGF5U3Vic2NyaXB0aW9uID0gZnVuY3Rpb24gKGR1ZVRpbWUsIHNjaGVkdWxlcikge1xuICAgIGlzU2NoZWR1bGVyKHNjaGVkdWxlcikgfHwgKHNjaGVkdWxlciA9IGRlZmF1bHRTY2hlZHVsZXIpO1xuICAgIHJldHVybiBuZXcgRGVsYXlTdWJzY3JpcHRpb24odGhpcywgZHVlVGltZSwgc2NoZWR1bGVyKTtcbiAgfTtcblxuICB2YXIgU2tpcExhc3RXaXRoVGltZU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFNraXBMYXN0V2l0aFRpbWVPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFNraXBMYXN0V2l0aFRpbWVPYnNlcnZhYmxlKHNvdXJjZSwgZCwgcykge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9kID0gZDtcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgU2tpcExhc3RXaXRoVGltZU9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgU2tpcExhc3RXaXRoVGltZU9ic2VydmVyKG8sIHRoaXMpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFNraXBMYXN0V2l0aFRpbWVPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIFNraXBMYXN0V2l0aFRpbWVPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoU2tpcExhc3RXaXRoVGltZU9ic2VydmVyLCBfX3N1cGVyX18pO1xuXG4gICAgZnVuY3Rpb24gU2tpcExhc3RXaXRoVGltZU9ic2VydmVyKG8sIHApIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fcyA9IHAuX3M7XG4gICAgICB0aGlzLl9kID0gcC5fZDtcbiAgICAgIHRoaXMuX3EgPSBbXTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFNraXBMYXN0V2l0aFRpbWVPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICB2YXIgbm93ID0gdGhpcy5fcy5ub3coKTtcbiAgICAgIHRoaXMuX3EucHVzaCh7IGludGVydmFsOiBub3csIHZhbHVlOiB4IH0pO1xuICAgICAgd2hpbGUgKHRoaXMuX3EubGVuZ3RoID4gMCAmJiBub3cgLSB0aGlzLl9xWzBdLmludGVydmFsID49IHRoaXMuX2QpIHtcbiAgICAgICAgdGhpcy5fby5vbk5leHQodGhpcy5fcS5zaGlmdCgpLnZhbHVlKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIFNraXBMYXN0V2l0aFRpbWVPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyB0aGlzLl9vLm9uRXJyb3IoZSk7IH07XG4gICAgU2tpcExhc3RXaXRoVGltZU9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbm93ID0gdGhpcy5fcy5ub3coKTtcbiAgICAgIHdoaWxlICh0aGlzLl9xLmxlbmd0aCA+IDAgJiYgbm93IC0gdGhpcy5fcVswXS5pbnRlcnZhbCA+PSB0aGlzLl9kKSB7XG4gICAgICAgIHRoaXMuX28ub25OZXh0KHRoaXMuX3Euc2hpZnQoKS52YWx1ZSk7XG4gICAgICB9XG4gICAgICB0aGlzLl9vLm9uQ29tcGxldGVkKCk7XG4gICAgfTtcblxuICAgIHJldHVybiBTa2lwTGFzdFdpdGhUaW1lT2JzZXJ2ZXI7XG4gIH0oQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAgKiAgU2tpcHMgZWxlbWVudHMgZm9yIHRoZSBzcGVjaWZpZWQgZHVyYXRpb24gZnJvbSB0aGUgZW5kIG9mIHRoZSBvYnNlcnZhYmxlIHNvdXJjZSBzZXF1ZW5jZSwgdXNpbmcgdGhlIHNwZWNpZmllZCBzY2hlZHVsZXIgdG8gcnVuIHRpbWVycy5cbiAgICogQGRlc2NyaXB0aW9uXG4gICAqICBUaGlzIG9wZXJhdG9yIGFjY3VtdWxhdGVzIGEgcXVldWUgd2l0aCBhIGxlbmd0aCBlbm91Z2ggdG8gc3RvcmUgZWxlbWVudHMgcmVjZWl2ZWQgZHVyaW5nIHRoZSBpbml0aWFsIGR1cmF0aW9uIHdpbmRvdy5cbiAgICogIEFzIG1vcmUgZWxlbWVudHMgYXJlIHJlY2VpdmVkLCBlbGVtZW50cyBvbGRlciB0aGFuIHRoZSBzcGVjaWZpZWQgZHVyYXRpb24gYXJlIHRha2VuIGZyb20gdGhlIHF1ZXVlIGFuZCBwcm9kdWNlZCBvbiB0aGVcbiAgICogIHJlc3VsdCBzZXF1ZW5jZS4gVGhpcyBjYXVzZXMgZWxlbWVudHMgdG8gYmUgZGVsYXllZCB3aXRoIGR1cmF0aW9uLlxuICAgKiBAcGFyYW0ge051bWJlcn0gZHVyYXRpb24gRHVyYXRpb24gZm9yIHNraXBwaW5nIGVsZW1lbnRzIGZyb20gdGhlIGVuZCBvZiB0aGUgc2VxdWVuY2UuXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSAgU2NoZWR1bGVyIHRvIHJ1biB0aGUgdGltZXIgb24uIElmIG5vdCBzcGVjaWZpZWQsIGRlZmF1bHRzIHRvIFJ4LlNjaGVkdWxlci50aW1lb3V0XG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdpdGggdGhlIGVsZW1lbnRzIHNraXBwZWQgZHVyaW5nIHRoZSBzcGVjaWZpZWQgZHVyYXRpb24gZnJvbSB0aGUgZW5kIG9mIHRoZSBzb3VyY2Ugc2VxdWVuY2UuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uc2tpcExhc3RXaXRoVGltZSA9IGZ1bmN0aW9uIChkdXJhdGlvbiwgc2NoZWR1bGVyKSB7XG4gICAgaXNTY2hlZHVsZXIoc2NoZWR1bGVyKSB8fCAoc2NoZWR1bGVyID0gZGVmYXVsdFNjaGVkdWxlcik7XG4gICAgcmV0dXJuIG5ldyBTa2lwTGFzdFdpdGhUaW1lT2JzZXJ2YWJsZSh0aGlzLCBkdXJhdGlvbiwgc2NoZWR1bGVyKTtcbiAgfTtcblxuICB2YXIgVGFrZUxhc3RXaXRoVGltZU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFRha2VMYXN0V2l0aFRpbWVPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFRha2VMYXN0V2l0aFRpbWVPYnNlcnZhYmxlKHNvdXJjZSwgZCwgcykge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9kID0gZDtcbiAgICAgIHRoaXMuX3MgPSBzO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgVGFrZUxhc3RXaXRoVGltZU9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YnNjcmliZShuZXcgVGFrZUxhc3RXaXRoVGltZU9ic2VydmVyKG8sIHRoaXMuX2QsIHRoaXMuX3MpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFRha2VMYXN0V2l0aFRpbWVPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIFRha2VMYXN0V2l0aFRpbWVPYnNlcnZlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoVGFrZUxhc3RXaXRoVGltZU9ic2VydmVyLCBfX3N1cGVyX18pO1xuXG4gICAgZnVuY3Rpb24gVGFrZUxhc3RXaXRoVGltZU9ic2VydmVyKG8sIGQsIHMpIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fZCA9IGQ7XG4gICAgICB0aGlzLl9zID0gcztcbiAgICAgIHRoaXMuX3EgPSBbXTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFRha2VMYXN0V2l0aFRpbWVPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICB2YXIgbm93ID0gdGhpcy5fcy5ub3coKTtcbiAgICAgIHRoaXMuX3EucHVzaCh7IGludGVydmFsOiBub3csIHZhbHVlOiB4IH0pO1xuICAgICAgd2hpbGUgKHRoaXMuX3EubGVuZ3RoID4gMCAmJiBub3cgLSB0aGlzLl9xWzBdLmludGVydmFsID49IHRoaXMuX2QpIHtcbiAgICAgICAgdGhpcy5fcS5zaGlmdCgpO1xuICAgICAgfVxuICAgIH07XG4gICAgVGFrZUxhc3RXaXRoVGltZU9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7IHRoaXMuX28ub25FcnJvcihlKTsgfTtcbiAgICBUYWtlTGFzdFdpdGhUaW1lT2JzZXJ2ZXIucHJvdG90eXBlLmNvbXBsZXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBub3cgPSB0aGlzLl9zLm5vdygpO1xuICAgICAgd2hpbGUgKHRoaXMuX3EubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgbmV4dCA9IHRoaXMuX3Euc2hpZnQoKTtcbiAgICAgICAgaWYgKG5vdyAtIG5leHQuaW50ZXJ2YWwgPD0gdGhpcy5fZCkgeyB0aGlzLl9vLm9uTmV4dChuZXh0LnZhbHVlKTsgfVxuICAgICAgfVxuICAgICAgdGhpcy5fby5vbkNvbXBsZXRlZCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gVGFrZUxhc3RXaXRoVGltZU9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogIFJldHVybnMgZWxlbWVudHMgd2l0aGluIHRoZSBzcGVjaWZpZWQgZHVyYXRpb24gZnJvbSB0aGUgZW5kIG9mIHRoZSBvYnNlcnZhYmxlIHNvdXJjZSBzZXF1ZW5jZSwgdXNpbmcgdGhlIHNwZWNpZmllZCBzY2hlZHVsZXJzIHRvIHJ1biB0aW1lcnMgYW5kIHRvIGRyYWluIHRoZSBjb2xsZWN0ZWQgZWxlbWVudHMuXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiAgVGhpcyBvcGVyYXRvciBhY2N1bXVsYXRlcyBhIHF1ZXVlIHdpdGggYSBsZW5ndGggZW5vdWdoIHRvIHN0b3JlIGVsZW1lbnRzIHJlY2VpdmVkIGR1cmluZyB0aGUgaW5pdGlhbCBkdXJhdGlvbiB3aW5kb3cuXG4gICAqICBBcyBtb3JlIGVsZW1lbnRzIGFyZSByZWNlaXZlZCwgZWxlbWVudHMgb2xkZXIgdGhhbiB0aGUgc3BlY2lmaWVkIGR1cmF0aW9uIGFyZSB0YWtlbiBmcm9tIHRoZSBxdWV1ZSBhbmQgcHJvZHVjZWQgb24gdGhlXG4gICAqICByZXN1bHQgc2VxdWVuY2UuIFRoaXMgY2F1c2VzIGVsZW1lbnRzIHRvIGJlIGRlbGF5ZWQgd2l0aCBkdXJhdGlvbi5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGR1cmF0aW9uIER1cmF0aW9uIGZvciB0YWtpbmcgZWxlbWVudHMgZnJvbSB0aGUgZW5kIG9mIHRoZSBzZXF1ZW5jZS5cbiAgICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXJdICBTY2hlZHVsZXIgdG8gcnVuIHRoZSB0aW1lciBvbi4gSWYgbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gUnguU2NoZWR1bGVyLnRpbWVvdXQuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdpdGggdGhlIGVsZW1lbnRzIHRha2VuIGR1cmluZyB0aGUgc3BlY2lmaWVkIGR1cmF0aW9uIGZyb20gdGhlIGVuZCBvZiB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnRha2VMYXN0V2l0aFRpbWUgPSBmdW5jdGlvbiAoZHVyYXRpb24sIHNjaGVkdWxlcikge1xuICAgIGlzU2NoZWR1bGVyKHNjaGVkdWxlcikgfHwgKHNjaGVkdWxlciA9IGRlZmF1bHRTY2hlZHVsZXIpO1xuICAgIHJldHVybiBuZXcgVGFrZUxhc3RXaXRoVGltZU9ic2VydmFibGUodGhpcywgZHVyYXRpb24sIHNjaGVkdWxlcik7XG4gIH07XG5cbiAgLyoqXG4gICAqICBSZXR1cm5zIGFuIGFycmF5IHdpdGggdGhlIGVsZW1lbnRzIHdpdGhpbiB0aGUgc3BlY2lmaWVkIGR1cmF0aW9uIGZyb20gdGhlIGVuZCBvZiB0aGUgb2JzZXJ2YWJsZSBzb3VyY2Ugc2VxdWVuY2UsIHVzaW5nIHRoZSBzcGVjaWZpZWQgc2NoZWR1bGVyIHRvIHJ1biB0aW1lcnMuXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiAgVGhpcyBvcGVyYXRvciBhY2N1bXVsYXRlcyBhIHF1ZXVlIHdpdGggYSBsZW5ndGggZW5vdWdoIHRvIHN0b3JlIGVsZW1lbnRzIHJlY2VpdmVkIGR1cmluZyB0aGUgaW5pdGlhbCBkdXJhdGlvbiB3aW5kb3cuXG4gICAqICBBcyBtb3JlIGVsZW1lbnRzIGFyZSByZWNlaXZlZCwgZWxlbWVudHMgb2xkZXIgdGhhbiB0aGUgc3BlY2lmaWVkIGR1cmF0aW9uIGFyZSB0YWtlbiBmcm9tIHRoZSBxdWV1ZSBhbmQgcHJvZHVjZWQgb24gdGhlXG4gICAqICByZXN1bHQgc2VxdWVuY2UuIFRoaXMgY2F1c2VzIGVsZW1lbnRzIHRvIGJlIGRlbGF5ZWQgd2l0aCBkdXJhdGlvbi5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGR1cmF0aW9uIER1cmF0aW9uIGZvciB0YWtpbmcgZWxlbWVudHMgZnJvbSB0aGUgZW5kIG9mIHRoZSBzZXF1ZW5jZS5cbiAgICogQHBhcmFtIHtTY2hlZHVsZXJ9IHNjaGVkdWxlciBTY2hlZHVsZXIgdG8gcnVuIHRoZSB0aW1lciBvbi4gSWYgbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gUnguU2NoZWR1bGVyLnRpbWVvdXQuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGNvbnRhaW5pbmcgYSBzaW5nbGUgYXJyYXkgd2l0aCB0aGUgZWxlbWVudHMgdGFrZW4gZHVyaW5nIHRoZSBzcGVjaWZpZWQgZHVyYXRpb24gZnJvbSB0aGUgZW5kIG9mIHRoZSBzb3VyY2Ugc2VxdWVuY2UuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8udGFrZUxhc3RCdWZmZXJXaXRoVGltZSA9IGZ1bmN0aW9uIChkdXJhdGlvbiwgc2NoZWR1bGVyKSB7XG4gICAgdmFyIHNvdXJjZSA9IHRoaXM7XG4gICAgaXNTY2hlZHVsZXIoc2NoZWR1bGVyKSB8fCAoc2NoZWR1bGVyID0gZGVmYXVsdFNjaGVkdWxlcik7XG4gICAgcmV0dXJuIG5ldyBBbm9ueW1vdXNPYnNlcnZhYmxlKGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgcSA9IFtdO1xuICAgICAgcmV0dXJuIHNvdXJjZS5zdWJzY3JpYmUoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgdmFyIG5vdyA9IHNjaGVkdWxlci5ub3coKTtcbiAgICAgICAgcS5wdXNoKHsgaW50ZXJ2YWw6IG5vdywgdmFsdWU6IHggfSk7XG4gICAgICAgIHdoaWxlIChxLmxlbmd0aCA+IDAgJiYgbm93IC0gcVswXS5pbnRlcnZhbCA+PSBkdXJhdGlvbikge1xuICAgICAgICAgIHEuc2hpZnQoKTtcbiAgICAgICAgfVxuICAgICAgfSwgZnVuY3Rpb24gKGUpIHsgby5vbkVycm9yKGUpOyB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBub3cgPSBzY2hlZHVsZXIubm93KCksIHJlcyA9IFtdO1xuICAgICAgICB3aGlsZSAocS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIG5leHQgPSBxLnNoaWZ0KCk7XG4gICAgICAgICAgbm93IC0gbmV4dC5pbnRlcnZhbCA8PSBkdXJhdGlvbiAmJiByZXMucHVzaChuZXh0LnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBvLm9uTmV4dChyZXMpO1xuICAgICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgICB9KTtcbiAgICB9LCBzb3VyY2UpO1xuICB9O1xuXG4gIHZhciBUYWtlV2l0aFRpbWVPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhUYWtlV2l0aFRpbWVPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIFRha2VXaXRoVGltZU9ic2VydmFibGUoc291cmNlLCBkLCBzKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMuX2QgPSBkO1xuICAgICAgdGhpcy5fcyA9IHM7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2hlZHVsZU1ldGhvZChzLCBvKSB7XG4gICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgfVxuXG4gICAgVGFrZVdpdGhUaW1lT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gbmV3IEJpbmFyeURpc3Bvc2FibGUoXG4gICAgICAgIHRoaXMuX3Muc2NoZWR1bGVGdXR1cmUobywgdGhpcy5fZCwgc2NoZWR1bGVNZXRob2QpLFxuICAgICAgICB0aGlzLnNvdXJjZS5zdWJzY3JpYmUobylcbiAgICAgICk7XG4gICAgfTtcblxuICAgIHJldHVybiBUYWtlV2l0aFRpbWVPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgLyoqXG4gICAqICBUYWtlcyBlbGVtZW50cyBmb3IgdGhlIHNwZWNpZmllZCBkdXJhdGlvbiBmcm9tIHRoZSBzdGFydCBvZiB0aGUgb2JzZXJ2YWJsZSBzb3VyY2Ugc2VxdWVuY2UsIHVzaW5nIHRoZSBzcGVjaWZpZWQgc2NoZWR1bGVyIHRvIHJ1biB0aW1lcnMuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqICAxIC0gcmVzID0gc291cmNlLnRha2VXaXRoVGltZSg1MDAwLCAgW29wdGlvbmFsIHNjaGVkdWxlcl0pO1xuICAgKiBAZGVzY3JpcHRpb25cbiAgICogIFRoaXMgb3BlcmF0b3IgYWNjdW11bGF0ZXMgYSBxdWV1ZSB3aXRoIGEgbGVuZ3RoIGVub3VnaCB0byBzdG9yZSBlbGVtZW50cyByZWNlaXZlZCBkdXJpbmcgdGhlIGluaXRpYWwgZHVyYXRpb24gd2luZG93LlxuICAgKiAgQXMgbW9yZSBlbGVtZW50cyBhcmUgcmVjZWl2ZWQsIGVsZW1lbnRzIG9sZGVyIHRoYW4gdGhlIHNwZWNpZmllZCBkdXJhdGlvbiBhcmUgdGFrZW4gZnJvbSB0aGUgcXVldWUgYW5kIHByb2R1Y2VkIG9uIHRoZVxuICAgKiAgcmVzdWx0IHNlcXVlbmNlLiBUaGlzIGNhdXNlcyBlbGVtZW50cyB0byBiZSBkZWxheWVkIHdpdGggZHVyYXRpb24uXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkdXJhdGlvbiBEdXJhdGlvbiBmb3IgdGFraW5nIGVsZW1lbnRzIGZyb20gdGhlIHN0YXJ0IG9mIHRoZSBzZXF1ZW5jZS5cbiAgICogQHBhcmFtIHtTY2hlZHVsZXJ9IHNjaGVkdWxlciBTY2hlZHVsZXIgdG8gcnVuIHRoZSB0aW1lciBvbi4gSWYgbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gUnguU2NoZWR1bGVyLnRpbWVvdXQuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdpdGggdGhlIGVsZW1lbnRzIHRha2VuIGR1cmluZyB0aGUgc3BlY2lmaWVkIGR1cmF0aW9uIGZyb20gdGhlIHN0YXJ0IG9mIHRoZSBzb3VyY2Ugc2VxdWVuY2UuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8udGFrZVdpdGhUaW1lID0gZnVuY3Rpb24gKGR1cmF0aW9uLCBzY2hlZHVsZXIpIHtcbiAgICBpc1NjaGVkdWxlcihzY2hlZHVsZXIpIHx8IChzY2hlZHVsZXIgPSBkZWZhdWx0U2NoZWR1bGVyKTtcbiAgICByZXR1cm4gbmV3IFRha2VXaXRoVGltZU9ic2VydmFibGUodGhpcywgZHVyYXRpb24sIHNjaGVkdWxlcik7XG4gIH07XG5cbiAgdmFyIFNraXBXaXRoVGltZU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFNraXBXaXRoVGltZU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gU2tpcFdpdGhUaW1lT2JzZXJ2YWJsZShzb3VyY2UsIGQsIHMpIHtcbiAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgICAgdGhpcy5fZCA9IGQ7XG4gICAgICB0aGlzLl9zID0gcztcbiAgICAgIHRoaXMuX29wZW4gPSBmYWxzZTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjaGVkdWxlTWV0aG9kKHMsIHNlbGYpIHtcbiAgICAgIHNlbGYuX29wZW4gPSB0cnVlO1xuICAgIH1cblxuICAgIFNraXBXaXRoVGltZU9ic2VydmFibGUucHJvdG90eXBlLnN1YnNjcmliZUNvcmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIG5ldyBCaW5hcnlEaXNwb3NhYmxlKFxuICAgICAgICB0aGlzLl9zLnNjaGVkdWxlRnV0dXJlKHRoaXMsIHRoaXMuX2QsIHNjaGVkdWxlTWV0aG9kKSxcbiAgICAgICAgdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG5ldyBTa2lwV2l0aFRpbWVPYnNlcnZlcihvLCB0aGlzKSlcbiAgICAgICk7XG4gICAgfTtcblxuICAgIHJldHVybiBTa2lwV2l0aFRpbWVPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgdmFyIFNraXBXaXRoVGltZU9ic2VydmVyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhTa2lwV2l0aFRpbWVPYnNlcnZlciwgX19zdXBlcl9fKTtcblxuICAgIGZ1bmN0aW9uIFNraXBXaXRoVGltZU9ic2VydmVyKG8sIHApIHtcbiAgICAgIHRoaXMuX28gPSBvO1xuICAgICAgdGhpcy5fcCA9IHA7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBTa2lwV2l0aFRpbWVPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7IHRoaXMuX3AuX29wZW4gJiYgdGhpcy5fby5vbk5leHQoeCk7IH07XG4gICAgU2tpcFdpdGhUaW1lT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHsgdGhpcy5fby5vbkVycm9yKGUpOyB9O1xuICAgIFNraXBXaXRoVGltZU9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7IHRoaXMuX28ub25Db21wbGV0ZWQoKTsgfTtcblxuICAgIHJldHVybiBTa2lwV2l0aFRpbWVPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cbiAgLyoqXG4gICAqICBTa2lwcyBlbGVtZW50cyBmb3IgdGhlIHNwZWNpZmllZCBkdXJhdGlvbiBmcm9tIHRoZSBzdGFydCBvZiB0aGUgb2JzZXJ2YWJsZSBzb3VyY2Ugc2VxdWVuY2UsIHVzaW5nIHRoZSBzcGVjaWZpZWQgc2NoZWR1bGVyIHRvIHJ1biB0aW1lcnMuXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiAgU3BlY2lmeWluZyBhIHplcm8gdmFsdWUgZm9yIGR1cmF0aW9uIGRvZXNuJ3QgZ3VhcmFudGVlIG5vIGVsZW1lbnRzIHdpbGwgYmUgZHJvcHBlZCBmcm9tIHRoZSBzdGFydCBvZiB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAgKiAgVGhpcyBpcyBhIHNpZGUtZWZmZWN0IG9mIHRoZSBhc3luY2hyb255IGludHJvZHVjZWQgYnkgdGhlIHNjaGVkdWxlciwgd2hlcmUgdGhlIGFjdGlvbiB0aGF0IGNhdXNlcyBjYWxsYmFja3MgZnJvbSB0aGUgc291cmNlIHNlcXVlbmNlIHRvIGJlIGZvcndhcmRlZFxuICAgKiAgbWF5IG5vdCBleGVjdXRlIGltbWVkaWF0ZWx5LCBkZXNwaXRlIHRoZSB6ZXJvIGR1ZSB0aW1lLlxuICAgKlxuICAgKiAgRXJyb3JzIHByb2R1Y2VkIGJ5IHRoZSBzb3VyY2Ugc2VxdWVuY2UgYXJlIGFsd2F5cyBmb3J3YXJkZWQgdG8gdGhlIHJlc3VsdCBzZXF1ZW5jZSwgZXZlbiBpZiB0aGUgZXJyb3Igb2NjdXJzIGJlZm9yZSB0aGUgZHVyYXRpb24uXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkdXJhdGlvbiBEdXJhdGlvbiBmb3Igc2tpcHBpbmcgZWxlbWVudHMgZnJvbSB0aGUgc3RhcnQgb2YgdGhlIHNlcXVlbmNlLlxuICAgKiBAcGFyYW0ge1NjaGVkdWxlcn0gc2NoZWR1bGVyIFNjaGVkdWxlciB0byBydW4gdGhlIHRpbWVyIG9uLiBJZiBub3Qgc3BlY2lmaWVkLCBkZWZhdWx0cyB0byBSeC5TY2hlZHVsZXIudGltZW91dC5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2Ugd2l0aCB0aGUgZWxlbWVudHMgc2tpcHBlZCBkdXJpbmcgdGhlIHNwZWNpZmllZCBkdXJhdGlvbiBmcm9tIHRoZSBzdGFydCBvZiB0aGUgc291cmNlIHNlcXVlbmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnNraXBXaXRoVGltZSA9IGZ1bmN0aW9uIChkdXJhdGlvbiwgc2NoZWR1bGVyKSB7XG4gICAgaXNTY2hlZHVsZXIoc2NoZWR1bGVyKSB8fCAoc2NoZWR1bGVyID0gZGVmYXVsdFNjaGVkdWxlcik7XG4gICAgcmV0dXJuIG5ldyBTa2lwV2l0aFRpbWVPYnNlcnZhYmxlKHRoaXMsIGR1cmF0aW9uLCBzY2hlZHVsZXIpO1xuICB9O1xuXG4gIHZhciBTa2lwVW50aWxXaXRoVGltZU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFNraXBVbnRpbFdpdGhUaW1lT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBTa2lwVW50aWxXaXRoVGltZU9ic2VydmFibGUoc291cmNlLCBzdGFydFRpbWUsIHNjaGVkdWxlcikge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9zdCA9IHN0YXJ0VGltZTtcbiAgICAgIHRoaXMuX3MgPSBzY2hlZHVsZXI7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2hlZHVsZU1ldGhvZChzLCBzdGF0ZSkge1xuICAgICAgc3RhdGUuX29wZW4gPSB0cnVlO1xuICAgIH1cblxuICAgIFNraXBVbnRpbFdpdGhUaW1lT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICB0aGlzLl9vcGVuID0gZmFsc2U7XG4gICAgICByZXR1cm4gbmV3IEJpbmFyeURpc3Bvc2FibGUoXG4gICAgICAgIHRoaXMuX3Muc2NoZWR1bGVGdXR1cmUodGhpcywgdGhpcy5fc3QsIHNjaGVkdWxlTWV0aG9kKSxcbiAgICAgICAgdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG5ldyBTa2lwVW50aWxXaXRoVGltZU9ic2VydmVyKG8sIHRoaXMpKVxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFNraXBVbnRpbFdpdGhUaW1lT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIHZhciBTa2lwVW50aWxXaXRoVGltZU9ic2VydmVyID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhTa2lwVW50aWxXaXRoVGltZU9ic2VydmVyLCBfX3N1cGVyX18pO1xuXG4gICAgZnVuY3Rpb24gU2tpcFVudGlsV2l0aFRpbWVPYnNlcnZlcihvLCBwKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX3AgPSBwO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgU2tpcFVudGlsV2l0aFRpbWVPYnNlcnZlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7IHRoaXMuX3AuX29wZW4gJiYgdGhpcy5fby5vbk5leHQoeCk7IH07XG4gICAgU2tpcFVudGlsV2l0aFRpbWVPYnNlcnZlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyB0aGlzLl9vLm9uRXJyb3IoZSk7IH07XG4gICAgU2tpcFVudGlsV2l0aFRpbWVPYnNlcnZlci5wcm90b3R5cGUuY29tcGxldGVkID0gZnVuY3Rpb24gKCkgeyB0aGlzLl9vLm9uQ29tcGxldGVkKCk7IH07XG5cbiAgICByZXR1cm4gU2tpcFVudGlsV2l0aFRpbWVPYnNlcnZlcjtcbiAgfShBYnN0cmFjdE9ic2VydmVyKSk7XG5cblxuICAvKipcbiAgICogIFNraXBzIGVsZW1lbnRzIGZyb20gdGhlIG9ic2VydmFibGUgc291cmNlIHNlcXVlbmNlIHVudGlsIHRoZSBzcGVjaWZpZWQgc3RhcnQgdGltZSwgdXNpbmcgdGhlIHNwZWNpZmllZCBzY2hlZHVsZXIgdG8gcnVuIHRpbWVycy5cbiAgICogIEVycm9ycyBwcm9kdWNlZCBieSB0aGUgc291cmNlIHNlcXVlbmNlIGFyZSBhbHdheXMgZm9yd2FyZGVkIHRvIHRoZSByZXN1bHQgc2VxdWVuY2UsIGV2ZW4gaWYgdGhlIGVycm9yIG9jY3VycyBiZWZvcmUgdGhlIHN0YXJ0IHRpbWUuXG4gICAqXG4gICAqIEBleGFtcGxlc1xuICAgKiAgMSAtIHJlcyA9IHNvdXJjZS5za2lwVW50aWxXaXRoVGltZShuZXcgRGF0ZSgpLCBbc2NoZWR1bGVyXSk7XG4gICAqICAyIC0gcmVzID0gc291cmNlLnNraXBVbnRpbFdpdGhUaW1lKDUwMDAsIFtzY2hlZHVsZXJdKTtcbiAgICogQHBhcmFtIHtEYXRlfE51bWJlcn0gc3RhcnRUaW1lIFRpbWUgdG8gc3RhcnQgdGFraW5nIGVsZW1lbnRzIGZyb20gdGhlIHNvdXJjZSBzZXF1ZW5jZS4gSWYgdGhpcyB2YWx1ZSBpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8gRGF0ZSgpLCBubyBlbGVtZW50cyB3aWxsIGJlIHNraXBwZWQuXG4gICAqIEBwYXJhbSB7U2NoZWR1bGVyfSBbc2NoZWR1bGVyXSBTY2hlZHVsZXIgdG8gcnVuIHRoZSB0aW1lciBvbi4gSWYgbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gUnguU2NoZWR1bGVyLnRpbWVvdXQuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdpdGggdGhlIGVsZW1lbnRzIHNraXBwZWQgdW50aWwgdGhlIHNwZWNpZmllZCBzdGFydCB0aW1lLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnNraXBVbnRpbFdpdGhUaW1lID0gZnVuY3Rpb24gKHN0YXJ0VGltZSwgc2NoZWR1bGVyKSB7XG4gICAgaXNTY2hlZHVsZXIoc2NoZWR1bGVyKSB8fCAoc2NoZWR1bGVyID0gZGVmYXVsdFNjaGVkdWxlcik7XG4gICAgcmV0dXJuIG5ldyBTa2lwVW50aWxXaXRoVGltZU9ic2VydmFibGUodGhpcywgc3RhcnRUaW1lLCBzY2hlZHVsZXIpO1xuICB9O1xuXG4gIC8qKlxuICAgKiAgVGFrZXMgZWxlbWVudHMgZm9yIHRoZSBzcGVjaWZpZWQgZHVyYXRpb24gdW50aWwgdGhlIHNwZWNpZmllZCBlbmQgdGltZSwgdXNpbmcgdGhlIHNwZWNpZmllZCBzY2hlZHVsZXIgdG8gcnVuIHRpbWVycy5cbiAgICogQHBhcmFtIHtOdW1iZXIgfCBEYXRlfSBlbmRUaW1lIFRpbWUgdG8gc3RvcCB0YWtpbmcgZWxlbWVudHMgZnJvbSB0aGUgc291cmNlIHNlcXVlbmNlLiBJZiB0aGlzIHZhbHVlIGlzIGxlc3MgdGhhbiBvciBlcXVhbCB0byBuZXcgRGF0ZSgpLCB0aGUgcmVzdWx0IHN0cmVhbSB3aWxsIGNvbXBsZXRlIGltbWVkaWF0ZWx5LlxuICAgKiBAcGFyYW0ge1NjaGVkdWxlcn0gW3NjaGVkdWxlcl0gU2NoZWR1bGVyIHRvIHJ1biB0aGUgdGltZXIgb24uXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdpdGggdGhlIGVsZW1lbnRzIHRha2VuIHVudGlsIHRoZSBzcGVjaWZpZWQgZW5kIHRpbWUuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8udGFrZVVudGlsV2l0aFRpbWUgPSBmdW5jdGlvbiAoZW5kVGltZSwgc2NoZWR1bGVyKSB7XG4gICAgaXNTY2hlZHVsZXIoc2NoZWR1bGVyKSB8fCAoc2NoZWR1bGVyID0gZGVmYXVsdFNjaGVkdWxlcik7XG4gICAgdmFyIHNvdXJjZSA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBBbm9ueW1vdXNPYnNlcnZhYmxlKGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gbmV3IEJpbmFyeURpc3Bvc2FibGUoXG4gICAgICAgIHNjaGVkdWxlci5zY2hlZHVsZUZ1dHVyZShvLCBlbmRUaW1lLCBmdW5jdGlvbiAoXywgbykgeyBvLm9uQ29tcGxldGVkKCk7IH0pLFxuICAgICAgICBzb3VyY2Uuc3Vic2NyaWJlKG8pKTtcbiAgICB9LCBzb3VyY2UpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIE9ic2VydmFibGUgdGhhdCBlbWl0cyBvbmx5IHRoZSBmaXJzdCBpdGVtIGVtaXR0ZWQgYnkgdGhlIHNvdXJjZSBPYnNlcnZhYmxlIGR1cmluZyBzZXF1ZW50aWFsIHRpbWUgd2luZG93cyBvZiBhIHNwZWNpZmllZCBkdXJhdGlvbi5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHdpbmRvd0R1cmF0aW9uIHRpbWUgdG8gd2FpdCBiZWZvcmUgZW1pdHRpbmcgYW5vdGhlciBpdGVtIGFmdGVyIGVtaXR0aW5nIHRoZSBsYXN0IGl0ZW1cbiAgICogQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXJdIHRoZSBTY2hlZHVsZXIgdG8gdXNlIGludGVybmFsbHkgdG8gbWFuYWdlIHRoZSB0aW1lcnMgdGhhdCBoYW5kbGUgdGltZW91dCBmb3IgZWFjaCBpdGVtLiBJZiBub3QgcHJvdmlkZWQsIGRlZmF1bHRzIHRvIFNjaGVkdWxlci50aW1lb3V0LlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gT2JzZXJ2YWJsZSB0aGF0IHBlcmZvcm1zIHRoZSB0aHJvdHRsZSBvcGVyYXRpb24uXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8udGhyb3R0bGUgPSBmdW5jdGlvbiAod2luZG93RHVyYXRpb24sIHNjaGVkdWxlcikge1xuICAgIGlzU2NoZWR1bGVyKHNjaGVkdWxlcikgfHwgKHNjaGVkdWxlciA9IGRlZmF1bHRTY2hlZHVsZXIpO1xuICAgIHZhciBkdXJhdGlvbiA9ICt3aW5kb3dEdXJhdGlvbiB8fCAwO1xuICAgIGlmIChkdXJhdGlvbiA8PSAwKSB7IHRocm93IG5ldyBSYW5nZUVycm9yKCd3aW5kb3dEdXJhdGlvbiBjYW5ub3QgYmUgbGVzcyBvciBlcXVhbCB6ZXJvLicpOyB9XG4gICAgdmFyIHNvdXJjZSA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBBbm9ueW1vdXNPYnNlcnZhYmxlKGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgbGFzdE9uTmV4dCA9IDA7XG4gICAgICByZXR1cm4gc291cmNlLnN1YnNjcmliZShcbiAgICAgICAgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICB2YXIgbm93ID0gc2NoZWR1bGVyLm5vdygpO1xuICAgICAgICAgIGlmIChsYXN0T25OZXh0ID09PSAwIHx8IG5vdyAtIGxhc3RPbk5leHQgPj0gZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGxhc3RPbk5leHQgPSBub3c7XG4gICAgICAgICAgICBvLm9uTmV4dCh4KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sZnVuY3Rpb24gKGUpIHsgby5vbkVycm9yKGUpOyB9LCBmdW5jdGlvbiAoKSB7IG8ub25Db21wbGV0ZWQoKTsgfVxuICAgICAgKTtcbiAgICB9LCBzb3VyY2UpO1xuICB9O1xuXG4gIHJldHVybiBSeDtcbn0pKTtcbiJdfQ==