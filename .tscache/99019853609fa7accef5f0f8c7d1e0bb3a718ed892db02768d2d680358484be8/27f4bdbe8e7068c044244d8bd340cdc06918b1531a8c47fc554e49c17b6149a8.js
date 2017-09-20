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
    var Observable = Rx.Observable, observableProto = Observable.prototype, AnonymousObservable = Rx.AnonymousObservable, ObservableBase = Rx.ObservableBase, Subject = Rx.Subject, AsyncSubject = Rx.AsyncSubject, Observer = Rx.Observer, ScheduledObserver = Rx.internals.ScheduledObserver, disposableCreate = Rx.Disposable.create, disposableEmpty = Rx.Disposable.empty, BinaryDisposable = Rx.BinaryDisposable, currentThreadScheduler = Rx.Scheduler.currentThread, isFunction = Rx.helpers.isFunction, inherits = Rx.internals.inherits, addProperties = Rx.internals.addProperties, checkDisposed = Rx.Disposable.checkDisposed;
    // Utilities
    function cloneArray(arr) {
        var len = arr.length, a = new Array(len);
        for (var i = 0; i < len; i++) {
            a[i] = arr[i];
        }
        return a;
    }
    var MulticastObservable = (function (__super__) {
        inherits(MulticastObservable, __super__);
        function MulticastObservable(source, fn1, fn2) {
            this.source = source;
            this._fn1 = fn1;
            this._fn2 = fn2;
            __super__.call(this);
        }
        MulticastObservable.prototype.subscribeCore = function (o) {
            var connectable = this.source.multicast(this._fn1());
            return new BinaryDisposable(this._fn2(connectable).subscribe(o), connectable.connect());
        };
        return MulticastObservable;
    }(ObservableBase));
    /**
     * Multicasts the source sequence notifications through an instantiated subject into all uses of the sequence within a selector function. Each
     * subscription to the resulting sequence causes a separate multicast invocation, exposing the sequence resulting from the selector function's
     * invocation. For specializations with fixed subject types, see Publish, PublishLast, and Replay.
     *
     * @example
     * 1 - res = source.multicast(observable);
     * 2 - res = source.multicast(function () { return new Subject(); }, function (x) { return x; });
     *
     * @param {Function|Subject} subjectOrSubjectSelector
     * Factory function to create an intermediate subject through which the source sequence's elements will be multicast to the selector function.
     * Or:
     * Subject to push source elements into.
     *
     * @param {Function} [selector] Optional selector function which can use the multicasted source sequence subject to the policies enforced by the created subject. Specified only if <paramref name="subjectOrSubjectSelector" is a factory function.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.multicast = function (subjectOrSubjectSelector, selector) {
        return isFunction(subjectOrSubjectSelector) ?
            new MulticastObservable(this, subjectOrSubjectSelector, selector) :
            new ConnectableObservable(this, subjectOrSubjectSelector);
    };
    /**
     * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence.
     * This operator is a specialization of Multicast using a regular Subject.
     *
     * @example
     * var resres = source.publish();
     * var res = source.publish(function (x) { return x; });
     *
     * @param {Function} [selector] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive all notifications of the source from the time of the subscription on.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.publish = function (selector) {
        return selector && isFunction(selector) ?
            this.multicast(function () { return new Subject(); }, selector) :
            this.multicast(new Subject());
    };
    /**
     * Returns an observable sequence that shares a single subscription to the underlying sequence.
     * This operator is a specialization of publish which creates a subscription when the number of observers goes from zero to one, then shares that subscription with all subsequent observers until the number of observers returns to zero, at which point the subscription is disposed.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence.
     */
    observableProto.share = function () {
        return this.publish().refCount();
    };
    /**
     * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence containing only the last notification.
     * This operator is a specialization of Multicast using a AsyncSubject.
     *
     * @example
     * var res = source.publishLast();
     * var res = source.publishLast(function (x) { return x; });
     *
     * @param selector [Optional] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will only receive the last notification of the source.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.publishLast = function (selector) {
        return selector && isFunction(selector) ?
            this.multicast(function () { return new AsyncSubject(); }, selector) :
            this.multicast(new AsyncSubject());
    };
    /**
     * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence and starts with initialValue.
     * This operator is a specialization of Multicast using a BehaviorSubject.
     *
     * @example
     * var res = source.publishValue(42);
     * var res = source.publishValue(function (x) { return x.select(function (y) { return y * y; }) }, 42);
     *
     * @param {Function} [selector] Optional selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive immediately receive the initial value, followed by all notifications of the source from the time of the subscription on.
     * @param {Mixed} initialValue Initial value received by observers upon subscription.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.publishValue = function (initialValueOrSelector, initialValue) {
        return arguments.length === 2 ?
            this.multicast(function () {
                return new BehaviorSubject(initialValue);
            }, initialValueOrSelector) :
            this.multicast(new BehaviorSubject(initialValueOrSelector));
    };
    /**
     * Returns an observable sequence that shares a single subscription to the underlying sequence and starts with an initialValue.
     * This operator is a specialization of publishValue which creates a subscription when the number of observers goes from zero to one, then shares that subscription with all subsequent observers until the number of observers returns to zero, at which point the subscription is disposed.
     * @param {Mixed} initialValue Initial value received by observers upon subscription.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence.
     */
    observableProto.shareValue = function (initialValue) {
        return this.publishValue(initialValue).refCount();
    };
    /**
     * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence replaying notifications subject to a maximum time length for the replay buffer.
     * This operator is a specialization of Multicast using a ReplaySubject.
     *
     * @example
     * var res = source.replay(null, 3);
     * var res = source.replay(null, 3, 500);
     * var res = source.replay(null, 3, 500, scheduler);
     * var res = source.replay(function (x) { return x.take(6).repeat(); }, 3, 500, scheduler);
     *
     * @param selector [Optional] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive all the notifications of the source subject to the specified replay buffer trimming policy.
     * @param bufferSize [Optional] Maximum element count of the replay buffer.
     * @param windowSize [Optional] Maximum time length of the replay buffer.
     * @param scheduler [Optional] Scheduler where connected observers within the selector function will be invoked on.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.replay = function (selector, bufferSize, windowSize, scheduler) {
        return selector && isFunction(selector) ?
            this.multicast(function () { return new ReplaySubject(bufferSize, windowSize, scheduler); }, selector) :
            this.multicast(new ReplaySubject(bufferSize, windowSize, scheduler));
    };
    /**
     * Returns an observable sequence that shares a single subscription to the underlying sequence replaying notifications subject to a maximum time length for the replay buffer.
     * This operator is a specialization of replay which creates a subscription when the number of observers goes from zero to one, then shares that subscription with all subsequent observers until the number of observers returns to zero, at which point the subscription is disposed.
     *
     * @example
     * var res = source.shareReplay(3);
     * var res = source.shareReplay(3, 500);
     * var res = source.shareReplay(3, 500, scheduler);
     *
  
     * @param bufferSize [Optional] Maximum element count of the replay buffer.
     * @param window [Optional] Maximum time length of the replay buffer.
     * @param scheduler [Optional] Scheduler where connected observers within the selector function will be invoked on.
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence.
     */
    observableProto.shareReplay = function (bufferSize, windowSize, scheduler) {
        return this.replay(null, bufferSize, windowSize, scheduler).refCount();
    };
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
     *  Represents a value that changes over time.
     *  Observers can subscribe to the subject to receive the last (or initial) value and all subsequent notifications.
     */
    var BehaviorSubject = Rx.BehaviorSubject = (function (__super__) {
        inherits(BehaviorSubject, __super__);
        function BehaviorSubject(value) {
            __super__.call(this);
            this.value = value;
            this.observers = [];
            this.isDisposed = false;
            this.isStopped = false;
            this.hasError = false;
        }
        addProperties(BehaviorSubject.prototype, Observer.prototype, {
            _subscribe: function (o) {
                checkDisposed(this);
                if (!this.isStopped) {
                    this.observers.push(o);
                    o.onNext(this.value);
                    return new InnerSubscription(this, o);
                }
                if (this.hasError) {
                    o.onError(this.error);
                }
                else {
                    o.onCompleted();
                }
                return disposableEmpty;
            },
            /**
             * Gets the current value or throws an exception.
             * Value is frozen after onCompleted is called.
             * After onError is called always throws the specified exception.
             * An exception is always thrown after dispose is called.
             * @returns {Mixed} The initial value passed to the constructor until onNext is called; after which, the last value passed to onNext.
             */
            getValue: function () {
                checkDisposed(this);
                if (this.hasError) {
                    thrower(this.error);
                }
                return this.value;
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
                if (this.isStopped) {
                    return;
                }
                this.isStopped = true;
                for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
                    os[i].onCompleted();
                }
                this.observers.length = 0;
            },
            /**
             * Notifies all subscribed observers about the exception.
             * @param {Mixed} error The exception to send to all observers.
             */
            onError: function (error) {
                checkDisposed(this);
                if (this.isStopped) {
                    return;
                }
                this.isStopped = true;
                this.hasError = true;
                this.error = error;
                for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
                    os[i].onError(error);
                }
                this.observers.length = 0;
            },
            /**
             * Notifies all subscribed observers about the arrival of the specified element in the sequence.
             * @param {Mixed} value The value to send to all observers.
             */
            onNext: function (value) {
                checkDisposed(this);
                if (this.isStopped) {
                    return;
                }
                this.value = value;
                for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
                    os[i].onNext(value);
                }
            },
            /**
             * Unsubscribe all observers and release resources.
             */
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
                this.value = null;
                this.error = null;
            }
        });
        return BehaviorSubject;
    }(Observable));
    /**
     * Represents an object that is both an observable sequence as well as an observer.
     * Each notification is broadcasted to all subscribed and future observers, subject to buffer trimming policies.
     */
    var ReplaySubject = Rx.ReplaySubject = (function (__super__) {
        var maxSafeInteger = Math.pow(2, 53) - 1;
        function createRemovableDisposable(subject, observer) {
            return disposableCreate(function () {
                observer.dispose();
                !subject.isDisposed && subject.observers.splice(subject.observers.indexOf(observer), 1);
            });
        }
        inherits(ReplaySubject, __super__);
        /**
         *  Initializes a new instance of the ReplaySubject class with the specified buffer size, window size and scheduler.
         *  @param {Number} [bufferSize] Maximum element count of the replay buffer.
         *  @param {Number} [windowSize] Maximum time length of the replay buffer.
         *  @param {Scheduler} [scheduler] Scheduler the observers are invoked on.
         */
        function ReplaySubject(bufferSize, windowSize, scheduler) {
            this.bufferSize = bufferSize == null ? maxSafeInteger : bufferSize;
            this.windowSize = windowSize == null ? maxSafeInteger : windowSize;
            this.scheduler = scheduler || currentThreadScheduler;
            this.q = [];
            this.observers = [];
            this.isStopped = false;
            this.isDisposed = false;
            this.hasError = false;
            this.error = null;
            __super__.call(this);
        }
        addProperties(ReplaySubject.prototype, Observer.prototype, {
            _subscribe: function (o) {
                checkDisposed(this);
                var so = new ScheduledObserver(this.scheduler, o), subscription = createRemovableDisposable(this, so);
                this._trim(this.scheduler.now());
                this.observers.push(so);
                for (var i = 0, len = this.q.length; i < len; i++) {
                    so.onNext(this.q[i].value);
                }
                if (this.hasError) {
                    so.onError(this.error);
                }
                else if (this.isStopped) {
                    so.onCompleted();
                }
                so.ensureActive();
                return subscription;
            },
            /**
             * Indicates whether the subject has observers subscribed to it.
             * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
             */
            hasObservers: function () { checkDisposed(this); return this.observers.length > 0; },
            _trim: function (now) {
                while (this.q.length > this.bufferSize) {
                    this.q.shift();
                }
                while (this.q.length > 0 && (now - this.q[0].interval) > this.windowSize) {
                    this.q.shift();
                }
            },
            /**
             * Notifies all subscribed observers about the arrival of the specified element in the sequence.
             * @param {Mixed} value The value to send to all observers.
             */
            onNext: function (value) {
                checkDisposed(this);
                if (this.isStopped) {
                    return;
                }
                var now = this.scheduler.now();
                this.q.push({ interval: now, value: value });
                this._trim(now);
                for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
                    var observer = os[i];
                    observer.onNext(value);
                    observer.ensureActive();
                }
            },
            /**
             * Notifies all subscribed observers about the exception.
             * @param {Mixed} error The exception to send to all observers.
             */
            onError: function (error) {
                checkDisposed(this);
                if (this.isStopped) {
                    return;
                }
                this.isStopped = true;
                this.error = error;
                this.hasError = true;
                var now = this.scheduler.now();
                this._trim(now);
                for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
                    var observer = os[i];
                    observer.onError(error);
                    observer.ensureActive();
                }
                this.observers.length = 0;
            },
            /**
             * Notifies all subscribed observers about the end of the sequence.
             */
            onCompleted: function () {
                checkDisposed(this);
                if (this.isStopped) {
                    return;
                }
                this.isStopped = true;
                var now = this.scheduler.now();
                this._trim(now);
                for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
                    var observer = os[i];
                    observer.onCompleted();
                    observer.ensureActive();
                }
                this.observers.length = 0;
            },
            /**
             * Unsubscribe all observers and release resources.
             */
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
            }
        });
        return ReplaySubject;
    }(Observable));
    var RefCountObservable = (function (__super__) {
        inherits(RefCountObservable, __super__);
        function RefCountObservable(source) {
            this.source = source;
            this._count = 0;
            this._connectableSubscription = null;
            __super__.call(this);
        }
        RefCountObservable.prototype.subscribeCore = function (o) {
            var subscription = this.source.subscribe(o);
            ++this._count === 1 && (this._connectableSubscription = this.source.connect());
            return new RefCountDisposable(this, subscription);
        };
        function RefCountDisposable(p, s) {
            this._p = p;
            this._s = s;
            this.isDisposed = false;
        }
        RefCountDisposable.prototype.dispose = function () {
            if (!this.isDisposed) {
                this.isDisposed = true;
                this._s.dispose();
                --this._p._count === 0 && this._p._connectableSubscription.dispose();
            }
        };
        return RefCountObservable;
    }(ObservableBase));
    var ConnectableObservable = Rx.ConnectableObservable = (function (__super__) {
        inherits(ConnectableObservable, __super__);
        function ConnectableObservable(source, subject) {
            this.source = source;
            this._connection = null;
            this._source = source.asObservable();
            this._subject = subject;
            __super__.call(this);
        }
        function ConnectDisposable(parent, subscription) {
            this._p = parent;
            this._s = subscription;
        }
        ConnectDisposable.prototype.dispose = function () {
            if (this._s) {
                this._s.dispose();
                this._s = null;
                this._p._connection = null;
            }
        };
        ConnectableObservable.prototype.connect = function () {
            if (!this._connection) {
                if (this._subject.isStopped) {
                    return disposableEmpty;
                }
                var subscription = this._source.subscribe(this._subject);
                this._connection = new ConnectDisposable(this, subscription);
            }
            return this._connection;
        };
        ConnectableObservable.prototype._subscribe = function (o) {
            return this._subject.subscribe(o);
        };
        ConnectableObservable.prototype.refCount = function () {
            return new RefCountObservable(this);
        };
        return ConnectableObservable;
    }(Observable));
    /**
     * Returns an observable sequence that shares a single subscription to the underlying sequence. This observable sequence
     * can be resubscribed to, even if all prior subscriptions have ended. (unlike `.publish().refCount()`)
     * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source.
     */
    observableProto.singleInstance = function () {
        var source = this, hasObservable = false, observable;
        function getObservable() {
            if (!hasObservable) {
                hasObservable = true;
                observable = source['finally'](function () { hasObservable = false; }).publish().refCount();
            }
            return observable;
        }
        return new AnonymousObservable(function (o) {
            return getObservable().subscribe(o);
        });
    };
    return Rx;
}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccnguYmluZGluZy5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccnguYmluZGluZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSw2R0FBNkc7QUFFN0csQ0FBQztBQUFBLENBQUMsVUFBVSxPQUFPO0lBQ2pCLElBQUksV0FBVyxHQUFHO1FBQ2hCLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLFFBQVEsRUFBRSxJQUFJO0tBQ2YsQ0FBQztJQUVGLHFCQUFxQixLQUFLO1FBQ3hCLE1BQU0sQ0FBQyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDM0QsQ0FBQztJQUVELElBQUksV0FBVyxHQUFHLENBQUMsV0FBVyxDQUFDLE9BQU8sT0FBTyxDQUFDLElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDakcsSUFBSSxVQUFVLEdBQUcsQ0FBQyxXQUFXLENBQUMsT0FBTyxNQUFNLENBQUMsSUFBSSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQztJQUM1RixJQUFJLFVBQVUsR0FBRyxXQUFXLENBQUMsV0FBVyxJQUFJLFVBQVUsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLElBQUksTUFBTSxDQUFDLENBQUM7SUFDaEcsSUFBSSxRQUFRLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxPQUFP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LENBQUM7WUFDdEQsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLENBQUMsQ0FBQztRQUVGLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUc7WUFDekMsTUFBTSxDQUFDLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDO1FBRUYsTUFBTSxDQUFDLHFCQUFxQixDQUFDO0lBQy9CLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBRWY7Ozs7T0FJRztJQUNILGVBQWUsQ0FBQyxjQUFjLEdBQUc7UUFDL0IsSUFBSSxNQUFNLEdBQUcsSUFBSSxFQUFFLGFBQWEsR0FBRyxLQUFLLEVBQUUsVUFBVSxDQUFDO1FBRXJEO1lBQ0UsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUNuQixhQUFhLEdBQUcsSUFBSSxDQUFDO2dCQUNyQixVQUFVLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLGNBQWEsYUFBYSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzdGLENBQUM7WUFDRCxNQUFNLENBQUMsVUFBVSxDQUFDO1FBQ3BCLENBQUM7UUFFRCxNQUFNLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxVQUFTLENBQUM7WUFDdkMsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztJQUVGLE1BQU0sQ0FBQyxFQUFFLENBQUM7QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQsIEFsbCByaWdodHMgcmVzZXJ2ZWQuIFNlZSBMaWNlbnNlLnR4dCBpbiB0aGUgcHJvamVjdCByb290IGZvciBsaWNlbnNlIGluZm9ybWF0aW9uLlxuXG47KGZ1bmN0aW9uIChmYWN0b3J5KSB7XG4gIHZhciBvYmplY3RUeXBlcyA9IHtcbiAgICAnZnVuY3Rpb24nOiB0cnVlLFxuICAgICdvYmplY3QnOiB0cnVlXG4gIH07XG5cbiAgZnVuY3Rpb24gY2hlY2tHbG9iYWwodmFsdWUpIHtcbiAgICByZXR1cm4gKHZhbHVlICYmIHZhbHVlLk9iamVjdCA9PT0gT2JqZWN0KSA/IHZhbHVlIDogbnVsbDtcbiAgfVxuXG4gIHZhciBmcmVlRXhwb3J0cyA9IChvYmplY3RUeXBlc1t0eXBlb2YgZXhwb3J0c10gJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSkgPyBleHBvcnRzIDogbnVsbDtcbiAgdmFyIGZyZWVNb2R1bGUgPSAob2JqZWN0VHlwZXNbdHlwZW9mIG1vZHVsZV0gJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUpID8gbW9kdWxlIDogbnVsbDtcbiAgdmFyIGZyZWVHbG9iYWwgPSBjaGVja0dsb2JhbChmcmVlRXhwb3J0cyAmJiBmcmVlTW9kdWxlICYmIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIGdsb2JhbCk7XG4gIHZhciBmcmVlU2VsZiA9IGNoZWNrR2xvYmFsKG9iamVjdFR5cGVzW3R5cGVvZiBzZWxmXSAmJiBzZWxmKTtcbiAgdmFyIGZyZWVXaW5kb3cgPSBjaGVja0dsb2JhbChvYmplY3RUeXBlc1t0eXBlb2Ygd2luZG93XSAmJiB3aW5kb3cpO1xuICB2YXIgbW9kdWxlRXhwb3J0cyA9IChmcmVlTW9kdWxlICYmIGZyZWVNb2R1bGUuZXhwb3J0cyA9PT0gZnJlZUV4cG9ydHMpID8gZnJlZUV4cG9ydHMgOiBudWxsO1xuICB2YXIgdGhpc0dsb2JhbCA9IGNoZWNrR2xvYmFsKG9iamVjdFR5cGVzW3R5cGVvZiB0aGlzXSAmJiB0aGlzKTtcbiAgdmFyIHJvb3QgPSBmcmVlR2xvYmFsIHx8ICgoZnJlZVdpbmRvdyAhPT0gKHRoaXNHbG9iYWwgJiYgdGhpc0dsb2JhbC53aW5kb3cpKSAmJiBmcmVlV2luZG93KSB8fCBmcmVlU2VsZiB8fCB0aGlzR2xvYmFsIHx8IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG5cbiAgLy8gQmVjYXVzZSBvZiBidWlsZCBvcHRpbWl6ZXJzXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoWycuL3J4J10sIGZ1bmN0aW9uIChSeCwgZXhwb3J0cykge1xuICAgICAgcmV0dXJuIGZhY3Rvcnkocm9vdCwgZXhwb3J0cywgUngpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZSAmJiBtb2R1bGUuZXhwb3J0cyA9PT0gZnJlZUV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnkocm9vdCwgbW9kdWxlLmV4cG9ydHMsIHJlcXVpcmUoJy4vcngnKSk7XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5SeCA9IGZhY3Rvcnkocm9vdCwge30sIHJvb3QuUngpO1xuICB9XG59LmNhbGwodGhpcywgZnVuY3Rpb24gKHJvb3QsIGV4cCwgUngsIHVuZGVmaW5lZCkge1xuXG4gIHZhciBPYnNlcnZhYmxlID0gUnguT2JzZXJ2YWJsZSxcbiAgICBvYnNlcnZhYmxlUHJvdG8gPSBPYnNlcnZhYmxlLnByb3RvdHlwZSxcbiAgICBBbm9ueW1vdXNPYnNlcnZhYmxlID0gUnguQW5vbnltb3VzT2JzZXJ2YWJsZSxcbiAgICBPYnNlcnZhYmxlQmFzZSA9IFJ4Lk9ic2VydmFibGVCYXNlLFxuICAgIFN1YmplY3QgPSBSeC5TdWJqZWN0LFxuICAgIEFzeW5jU3ViamVjdCA9IFJ4LkFzeW5jU3ViamVjdCxcbiAgICBPYnNlcnZlciA9IFJ4Lk9ic2VydmVyLFxuICAgIFNjaGVkdWxlZE9ic2VydmVyID0gUnguaW50ZXJuYWxzLlNjaGVkdWxlZE9ic2VydmVyLFxuICAgIGRpc3Bvc2FibGVDcmVhdGUgPSBSeC5EaXNwb3NhYmxlLmNyZWF0ZSxcbiAgICBkaXNwb3NhYmxlRW1wdHkgPSBSeC5EaXNwb3NhYmxlLmVtcHR5LFxuICAgIEJpbmFyeURpc3Bvc2FibGUgPSBSeC5CaW5hcnlEaXNwb3NhYmxlLFxuICAgIGN1cnJlbnRUaHJlYWRTY2hlZHVsZXIgPSBSeC5TY2hlZHVsZXIuY3VycmVudFRocmVhZCxcbiAgICBpc0Z1bmN0aW9uID0gUnguaGVscGVycy5pc0Z1bmN0aW9uLFxuICAgIGluaGVyaXRzID0gUnguaW50ZXJuYWxzLmluaGVyaXRzLFxuICAgIGFkZFByb3BlcnRpZXMgPSBSeC5pbnRlcm5hbHMuYWRkUHJvcGVydGllcyxcbiAgICBjaGVja0Rpc3Bvc2VkID0gUnguRGlzcG9zYWJsZS5jaGVja0Rpc3Bvc2VkO1xuXG4gIC8vIFV0aWxpdGllc1xuICBmdW5jdGlvbiBjbG9uZUFycmF5KGFycikge1xuICAgIHZhciBsZW4gPSBhcnIubGVuZ3RoLCBhID0gbmV3IEFycmF5KGxlbik7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7IGFbaV0gPSBhcnJbaV07IH1cbiAgICByZXR1cm4gYTtcbiAgfVxuXG4gIHZhciBNdWx0aWNhc3RPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhNdWx0aWNhc3RPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIE11bHRpY2FzdE9ic2VydmFibGUoc291cmNlLCBmbjEsIGZuMikge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9mbjEgPSBmbjE7XG4gICAgICB0aGlzLl9mbjIgPSBmbjI7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBNdWx0aWNhc3RPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHZhciBjb25uZWN0YWJsZSA9IHRoaXMuc291cmNlLm11bHRpY2FzdCh0aGlzLl9mbjEoKSk7XG4gICAgICByZXR1cm4gbmV3IEJpbmFyeURpc3Bvc2FibGUodGhpcy5fZm4yKGNvbm5lY3RhYmxlKS5zdWJzY3JpYmUobyksIGNvbm5lY3RhYmxlLmNvbm5lY3QoKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBNdWx0aWNhc3RPYnNlcnZhYmxlO1xuICB9KE9ic2VydmFibGVCYXNlKSk7XG5cbiAgLyoqXG4gICAqIE11bHRpY2FzdHMgdGhlIHNvdXJjZSBzZXF1ZW5jZSBub3RpZmljYXRpb25zIHRocm91Z2ggYW4gaW5zdGFudGlhdGVkIHN1YmplY3QgaW50byBhbGwgdXNlcyBvZiB0aGUgc2VxdWVuY2Ugd2l0aGluIGEgc2VsZWN0b3IgZnVuY3Rpb24uIEVhY2hcbiAgICogc3Vic2NyaXB0aW9uIHRvIHRoZSByZXN1bHRpbmcgc2VxdWVuY2UgY2F1c2VzIGEgc2VwYXJhdGUgbXVsdGljYXN0IGludm9jYXRpb24sIGV4cG9zaW5nIHRoZSBzZXF1ZW5jZSByZXN1bHRpbmcgZnJvbSB0aGUgc2VsZWN0b3IgZnVuY3Rpb24nc1xuICAgKiBpbnZvY2F0aW9uLiBGb3Igc3BlY2lhbGl6YXRpb25zIHdpdGggZml4ZWQgc3ViamVjdCB0eXBlcywgc2VlIFB1Ymxpc2gsIFB1Ymxpc2hMYXN0LCBhbmQgUmVwbGF5LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiAxIC0gcmVzID0gc291cmNlLm11bHRpY2FzdChvYnNlcnZhYmxlKTtcbiAgICogMiAtIHJlcyA9IHNvdXJjZS5tdWx0aWNhc3QoZnVuY3Rpb24gKCkgeyByZXR1cm4gbmV3IFN1YmplY3QoKTsgfSwgZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHg7IH0pO1xuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufFN1YmplY3R9IHN1YmplY3RPclN1YmplY3RTZWxlY3RvclxuICAgKiBGYWN0b3J5IGZ1bmN0aW9uIHRvIGNyZWF0ZSBhbiBpbnRlcm1lZGlhdGUgc3ViamVjdCB0aHJvdWdoIHdoaWNoIHRoZSBzb3VyY2Ugc2VxdWVuY2UncyBlbGVtZW50cyB3aWxsIGJlIG11bHRpY2FzdCB0byB0aGUgc2VsZWN0b3IgZnVuY3Rpb24uXG4gICAqIE9yOlxuICAgKiBTdWJqZWN0IHRvIHB1c2ggc291cmNlIGVsZW1lbnRzIGludG8uXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtzZWxlY3Rvcl0gT3B0aW9uYWwgc2VsZWN0b3IgZnVuY3Rpb24gd2hpY2ggY2FuIHVzZSB0aGUgbXVsdGljYXN0ZWQgc291cmNlIHNlcXVlbmNlIHN1YmplY3QgdG8gdGhlIHBvbGljaWVzIGVuZm9yY2VkIGJ5IHRoZSBjcmVhdGVkIHN1YmplY3QuIFNwZWNpZmllZCBvbmx5IGlmIDxwYXJhbXJlZiBuYW1lPVwic3ViamVjdE9yU3ViamVjdFNlbGVjdG9yXCIgaXMgYSBmYWN0b3J5IGZ1bmN0aW9uLlxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGNvbnRhaW5zIHRoZSBlbGVtZW50cyBvZiBhIHNlcXVlbmNlIHByb2R1Y2VkIGJ5IG11bHRpY2FzdGluZyB0aGUgc291cmNlIHNlcXVlbmNlIHdpdGhpbiBhIHNlbGVjdG9yIGZ1bmN0aW9uLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLm11bHRpY2FzdCA9IGZ1bmN0aW9uIChzdWJqZWN0T3JTdWJqZWN0U2VsZWN0b3IsIHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGlzRnVuY3Rpb24oc3ViamVjdE9yU3ViamVjdFNlbGVjdG9yKSA/XG4gICAgICBuZXcgTXVsdGljYXN0T2JzZXJ2YWJsZSh0aGlzLCBzdWJqZWN0T3JTdWJqZWN0U2VsZWN0b3IsIHNlbGVjdG9yKSA6XG4gICAgICBuZXcgQ29ubmVjdGFibGVPYnNlcnZhYmxlKHRoaXMsIHN1YmplY3RPclN1YmplY3RTZWxlY3Rvcik7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGlzIHRoZSByZXN1bHQgb2YgaW52b2tpbmcgdGhlIHNlbGVjdG9yIG9uIGEgY29ubmVjdGFibGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IHNoYXJlcyBhIHNpbmdsZSBzdWJzY3JpcHRpb24gdG8gdGhlIHVuZGVybHlpbmcgc2VxdWVuY2UuXG4gICAqIFRoaXMgb3BlcmF0b3IgaXMgYSBzcGVjaWFsaXphdGlvbiBvZiBNdWx0aWNhc3QgdXNpbmcgYSByZWd1bGFyIFN1YmplY3QuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHZhciByZXNyZXMgPSBzb3VyY2UucHVibGlzaCgpO1xuICAgKiB2YXIgcmVzID0gc291cmNlLnB1Ymxpc2goZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHg7IH0pO1xuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbc2VsZWN0b3JdIFNlbGVjdG9yIGZ1bmN0aW9uIHdoaWNoIGNhbiB1c2UgdGhlIG11bHRpY2FzdGVkIHNvdXJjZSBzZXF1ZW5jZSBhcyBtYW55IHRpbWVzIGFzIG5lZWRlZCwgd2l0aG91dCBjYXVzaW5nIG11bHRpcGxlIHN1YnNjcmlwdGlvbnMgdG8gdGhlIHNvdXJjZSBzZXF1ZW5jZS4gU3Vic2NyaWJlcnMgdG8gdGhlIGdpdmVuIHNvdXJjZSB3aWxsIHJlY2VpdmUgYWxsIG5vdGlmaWNhdGlvbnMgb2YgdGhlIHNvdXJjZSBmcm9tIHRoZSB0aW1lIG9mIHRoZSBzdWJzY3JpcHRpb24gb24uXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgY29udGFpbnMgdGhlIGVsZW1lbnRzIG9mIGEgc2VxdWVuY2UgcHJvZHVjZWQgYnkgbXVsdGljYXN0aW5nIHRoZSBzb3VyY2Ugc2VxdWVuY2Ugd2l0aGluIGEgc2VsZWN0b3IgZnVuY3Rpb24uXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8ucHVibGlzaCA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJldHVybiBzZWxlY3RvciAmJiBpc0Z1bmN0aW9uKHNlbGVjdG9yKSA/XG4gICAgICB0aGlzLm11bHRpY2FzdChmdW5jdGlvbiAoKSB7IHJldHVybiBuZXcgU3ViamVjdCgpOyB9LCBzZWxlY3RvcikgOlxuICAgICAgdGhpcy5tdWx0aWNhc3QobmV3IFN1YmplY3QoKSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IHNoYXJlcyBhIHNpbmdsZSBzdWJzY3JpcHRpb24gdG8gdGhlIHVuZGVybHlpbmcgc2VxdWVuY2UuXG4gICAqIFRoaXMgb3BlcmF0b3IgaXMgYSBzcGVjaWFsaXphdGlvbiBvZiBwdWJsaXNoIHdoaWNoIGNyZWF0ZXMgYSBzdWJzY3JpcHRpb24gd2hlbiB0aGUgbnVtYmVyIG9mIG9ic2VydmVycyBnb2VzIGZyb20gemVybyB0byBvbmUsIHRoZW4gc2hhcmVzIHRoYXQgc3Vic2NyaXB0aW9uIHdpdGggYWxsIHN1YnNlcXVlbnQgb2JzZXJ2ZXJzIHVudGlsIHRoZSBudW1iZXIgb2Ygb2JzZXJ2ZXJzIHJldHVybnMgdG8gemVybywgYXQgd2hpY2ggcG9pbnQgdGhlIHN1YnNjcmlwdGlvbiBpcyBkaXNwb3NlZC5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBjb250YWlucyB0aGUgZWxlbWVudHMgb2YgYSBzZXF1ZW5jZSBwcm9kdWNlZCBieSBtdWx0aWNhc3RpbmcgdGhlIHNvdXJjZSBzZXF1ZW5jZS5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5zaGFyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5wdWJsaXNoKCkucmVmQ291bnQoKTtcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgaXMgdGhlIHJlc3VsdCBvZiBpbnZva2luZyB0aGUgc2VsZWN0b3Igb24gYSBjb25uZWN0YWJsZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgc2hhcmVzIGEgc2luZ2xlIHN1YnNjcmlwdGlvbiB0byB0aGUgdW5kZXJseWluZyBzZXF1ZW5jZSBjb250YWluaW5nIG9ubHkgdGhlIGxhc3Qgbm90aWZpY2F0aW9uLlxuICAgKiBUaGlzIG9wZXJhdG9yIGlzIGEgc3BlY2lhbGl6YXRpb24gb2YgTXVsdGljYXN0IHVzaW5nIGEgQXN5bmNTdWJqZWN0LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiB2YXIgcmVzID0gc291cmNlLnB1Ymxpc2hMYXN0KCk7XG4gICAqIHZhciByZXMgPSBzb3VyY2UucHVibGlzaExhc3QoZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHg7IH0pO1xuICAgKlxuICAgKiBAcGFyYW0gc2VsZWN0b3IgW09wdGlvbmFsXSBTZWxlY3RvciBmdW5jdGlvbiB3aGljaCBjYW4gdXNlIHRoZSBtdWx0aWNhc3RlZCBzb3VyY2Ugc2VxdWVuY2UgYXMgbWFueSB0aW1lcyBhcyBuZWVkZWQsIHdpdGhvdXQgY2F1c2luZyBtdWx0aXBsZSBzdWJzY3JpcHRpb25zIHRvIHRoZSBzb3VyY2Ugc2VxdWVuY2UuIFN1YnNjcmliZXJzIHRvIHRoZSBnaXZlbiBzb3VyY2Ugd2lsbCBvbmx5IHJlY2VpdmUgdGhlIGxhc3Qgbm90aWZpY2F0aW9uIG9mIHRoZSBzb3VyY2UuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgY29udGFpbnMgdGhlIGVsZW1lbnRzIG9mIGEgc2VxdWVuY2UgcHJvZHVjZWQgYnkgbXVsdGljYXN0aW5nIHRoZSBzb3VyY2Ugc2VxdWVuY2Ugd2l0aGluIGEgc2VsZWN0b3IgZnVuY3Rpb24uXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8ucHVibGlzaExhc3QgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gc2VsZWN0b3IgJiYgaXNGdW5jdGlvbihzZWxlY3RvcikgP1xuICAgICAgdGhpcy5tdWx0aWNhc3QoZnVuY3Rpb24gKCkgeyByZXR1cm4gbmV3IEFzeW5jU3ViamVjdCgpOyB9LCBzZWxlY3RvcikgOlxuICAgICAgdGhpcy5tdWx0aWNhc3QobmV3IEFzeW5jU3ViamVjdCgpKTtcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgaXMgdGhlIHJlc3VsdCBvZiBpbnZva2luZyB0aGUgc2VsZWN0b3Igb24gYSBjb25uZWN0YWJsZSBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgc2hhcmVzIGEgc2luZ2xlIHN1YnNjcmlwdGlvbiB0byB0aGUgdW5kZXJseWluZyBzZXF1ZW5jZSBhbmQgc3RhcnRzIHdpdGggaW5pdGlhbFZhbHVlLlxuICAgKiBUaGlzIG9wZXJhdG9yIGlzIGEgc3BlY2lhbGl6YXRpb24gb2YgTXVsdGljYXN0IHVzaW5nIGEgQmVoYXZpb3JTdWJqZWN0LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiB2YXIgcmVzID0gc291cmNlLnB1Ymxpc2hWYWx1ZSg0Mik7XG4gICAqIHZhciByZXMgPSBzb3VyY2UucHVibGlzaFZhbHVlKGZ1bmN0aW9uICh4KSB7IHJldHVybiB4LnNlbGVjdChmdW5jdGlvbiAoeSkgeyByZXR1cm4geSAqIHk7IH0pIH0sIDQyKTtcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW3NlbGVjdG9yXSBPcHRpb25hbCBzZWxlY3RvciBmdW5jdGlvbiB3aGljaCBjYW4gdXNlIHRoZSBtdWx0aWNhc3RlZCBzb3VyY2Ugc2VxdWVuY2UgYXMgbWFueSB0aW1lcyBhcyBuZWVkZWQsIHdpdGhvdXQgY2F1c2luZyBtdWx0aXBsZSBzdWJzY3JpcHRpb25zIHRvIHRoZSBzb3VyY2Ugc2VxdWVuY2UuIFN1YnNjcmliZXJzIHRvIHRoZSBnaXZlbiBzb3VyY2Ugd2lsbCByZWNlaXZlIGltbWVkaWF0ZWx5IHJlY2VpdmUgdGhlIGluaXRpYWwgdmFsdWUsIGZvbGxvd2VkIGJ5IGFsbCBub3RpZmljYXRpb25zIG9mIHRoZSBzb3VyY2UgZnJvbSB0aGUgdGltZSBvZiB0aGUgc3Vic2NyaXB0aW9uIG9uLlxuICAgKiBAcGFyYW0ge01peGVkfSBpbml0aWFsVmFsdWUgSW5pdGlhbCB2YWx1ZSByZWNlaXZlZCBieSBvYnNlcnZlcnMgdXBvbiBzdWJzY3JpcHRpb24uXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgY29udGFpbnMgdGhlIGVsZW1lbnRzIG9mIGEgc2VxdWVuY2UgcHJvZHVjZWQgYnkgbXVsdGljYXN0aW5nIHRoZSBzb3VyY2Ugc2VxdWVuY2Ugd2l0aGluIGEgc2VsZWN0b3IgZnVuY3Rpb24uXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8ucHVibGlzaFZhbHVlID0gZnVuY3Rpb24gKGluaXRpYWxWYWx1ZU9yU2VsZWN0b3IsIGluaXRpYWxWYWx1ZSkge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAyID9cbiAgICAgIHRoaXMubXVsdGljYXN0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBCZWhhdmlvclN1YmplY3QoaW5pdGlhbFZhbHVlKTtcbiAgICAgIH0sIGluaXRpYWxWYWx1ZU9yU2VsZWN0b3IpIDpcbiAgICAgIHRoaXMubXVsdGljYXN0KG5ldyBCZWhhdmlvclN1YmplY3QoaW5pdGlhbFZhbHVlT3JTZWxlY3RvcikpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBzaGFyZXMgYSBzaW5nbGUgc3Vic2NyaXB0aW9uIHRvIHRoZSB1bmRlcmx5aW5nIHNlcXVlbmNlIGFuZCBzdGFydHMgd2l0aCBhbiBpbml0aWFsVmFsdWUuXG4gICAqIFRoaXMgb3BlcmF0b3IgaXMgYSBzcGVjaWFsaXphdGlvbiBvZiBwdWJsaXNoVmFsdWUgd2hpY2ggY3JlYXRlcyBhIHN1YnNjcmlwdGlvbiB3aGVuIHRoZSBudW1iZXIgb2Ygb2JzZXJ2ZXJzIGdvZXMgZnJvbSB6ZXJvIHRvIG9uZSwgdGhlbiBzaGFyZXMgdGhhdCBzdWJzY3JpcHRpb24gd2l0aCBhbGwgc3Vic2VxdWVudCBvYnNlcnZlcnMgdW50aWwgdGhlIG51bWJlciBvZiBvYnNlcnZlcnMgcmV0dXJucyB0byB6ZXJvLCBhdCB3aGljaCBwb2ludCB0aGUgc3Vic2NyaXB0aW9uIGlzIGRpc3Bvc2VkLlxuICAgKiBAcGFyYW0ge01peGVkfSBpbml0aWFsVmFsdWUgSW5pdGlhbCB2YWx1ZSByZWNlaXZlZCBieSBvYnNlcnZlcnMgdXBvbiBzdWJzY3JpcHRpb24uXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgY29udGFpbnMgdGhlIGVsZW1lbnRzIG9mIGEgc2VxdWVuY2UgcHJvZHVjZWQgYnkgbXVsdGljYXN0aW5nIHRoZSBzb3VyY2Ugc2VxdWVuY2UuXG4gICAqL1xuICBvYnNlcnZhYmxlUHJvdG8uc2hhcmVWYWx1ZSA9IGZ1bmN0aW9uIChpbml0aWFsVmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5wdWJsaXNoVmFsdWUoaW5pdGlhbFZhbHVlKS5yZWZDb3VudCgpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBpcyB0aGUgcmVzdWx0IG9mIGludm9raW5nIHRoZSBzZWxlY3RvciBvbiBhIGNvbm5lY3RhYmxlIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBzaGFyZXMgYSBzaW5nbGUgc3Vic2NyaXB0aW9uIHRvIHRoZSB1bmRlcmx5aW5nIHNlcXVlbmNlIHJlcGxheWluZyBub3RpZmljYXRpb25zIHN1YmplY3QgdG8gYSBtYXhpbXVtIHRpbWUgbGVuZ3RoIGZvciB0aGUgcmVwbGF5IGJ1ZmZlci5cbiAgICogVGhpcyBvcGVyYXRvciBpcyBhIHNwZWNpYWxpemF0aW9uIG9mIE11bHRpY2FzdCB1c2luZyBhIFJlcGxheVN1YmplY3QuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHZhciByZXMgPSBzb3VyY2UucmVwbGF5KG51bGwsIDMpO1xuICAgKiB2YXIgcmVzID0gc291cmNlLnJlcGxheShudWxsLCAzLCA1MDApO1xuICAgKiB2YXIgcmVzID0gc291cmNlLnJlcGxheShudWxsLCAzLCA1MDAsIHNjaGVkdWxlcik7XG4gICAqIHZhciByZXMgPSBzb3VyY2UucmVwbGF5KGZ1bmN0aW9uICh4KSB7IHJldHVybiB4LnRha2UoNikucmVwZWF0KCk7IH0sIDMsIDUwMCwgc2NoZWR1bGVyKTtcbiAgICpcbiAgICogQHBhcmFtIHNlbGVjdG9yIFtPcHRpb25hbF0gU2VsZWN0b3IgZnVuY3Rpb24gd2hpY2ggY2FuIHVzZSB0aGUgbXVsdGljYXN0ZWQgc291cmNlIHNlcXVlbmNlIGFzIG1hbnkgdGltZXMgYXMgbmVlZGVkLCB3aXRob3V0IGNhdXNpbmcgbXVsdGlwbGUgc3Vic2NyaXB0aW9ucyB0byB0aGUgc291cmNlIHNlcXVlbmNlLiBTdWJzY3JpYmVycyB0byB0aGUgZ2l2ZW4gc291cmNlIHdpbGwgcmVjZWl2ZSBhbGwgdGhlIG5vdGlmaWNhdGlvbnMgb2YgdGhlIHNvdXJjZSBzdWJqZWN0IHRvIHRoZSBzcGVjaWZpZWQgcmVwbGF5IGJ1ZmZlciB0cmltbWluZyBwb2xpY3kuXG4gICAqIEBwYXJhbSBidWZmZXJTaXplIFtPcHRpb25hbF0gTWF4aW11bSBlbGVtZW50IGNvdW50IG9mIHRoZSByZXBsYXkgYnVmZmVyLlxuICAgKiBAcGFyYW0gd2luZG93U2l6ZSBbT3B0aW9uYWxdIE1heGltdW0gdGltZSBsZW5ndGggb2YgdGhlIHJlcGxheSBidWZmZXIuXG4gICAqIEBwYXJhbSBzY2hlZHVsZXIgW09wdGlvbmFsXSBTY2hlZHVsZXIgd2hlcmUgY29ubmVjdGVkIG9ic2VydmVycyB3aXRoaW4gdGhlIHNlbGVjdG9yIGZ1bmN0aW9uIHdpbGwgYmUgaW52b2tlZCBvbi5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBjb250YWlucyB0aGUgZWxlbWVudHMgb2YgYSBzZXF1ZW5jZSBwcm9kdWNlZCBieSBtdWx0aWNhc3RpbmcgdGhlIHNvdXJjZSBzZXF1ZW5jZSB3aXRoaW4gYSBzZWxlY3RvciBmdW5jdGlvbi5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5yZXBsYXkgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIGJ1ZmZlclNpemUsIHdpbmRvd1NpemUsIHNjaGVkdWxlcikge1xuICAgIHJldHVybiBzZWxlY3RvciAmJiBpc0Z1bmN0aW9uKHNlbGVjdG9yKSA/XG4gICAgICB0aGlzLm11bHRpY2FzdChmdW5jdGlvbiAoKSB7IHJldHVybiBuZXcgUmVwbGF5U3ViamVjdChidWZmZXJTaXplLCB3aW5kb3dTaXplLCBzY2hlZHVsZXIpOyB9LCBzZWxlY3RvcikgOlxuICAgICAgdGhpcy5tdWx0aWNhc3QobmV3IFJlcGxheVN1YmplY3QoYnVmZmVyU2l6ZSwgd2luZG93U2l6ZSwgc2NoZWR1bGVyKSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IHNoYXJlcyBhIHNpbmdsZSBzdWJzY3JpcHRpb24gdG8gdGhlIHVuZGVybHlpbmcgc2VxdWVuY2UgcmVwbGF5aW5nIG5vdGlmaWNhdGlvbnMgc3ViamVjdCB0byBhIG1heGltdW0gdGltZSBsZW5ndGggZm9yIHRoZSByZXBsYXkgYnVmZmVyLlxuICAgKiBUaGlzIG9wZXJhdG9yIGlzIGEgc3BlY2lhbGl6YXRpb24gb2YgcmVwbGF5IHdoaWNoIGNyZWF0ZXMgYSBzdWJzY3JpcHRpb24gd2hlbiB0aGUgbnVtYmVyIG9mIG9ic2VydmVycyBnb2VzIGZyb20gemVybyB0byBvbmUsIHRoZW4gc2hhcmVzIHRoYXQgc3Vic2NyaXB0aW9uIHdpdGggYWxsIHN1YnNlcXVlbnQgb2JzZXJ2ZXJzIHVudGlsIHRoZSBudW1iZXIgb2Ygb2JzZXJ2ZXJzIHJldHVybnMgdG8gemVybywgYXQgd2hpY2ggcG9pbnQgdGhlIHN1YnNjcmlwdGlvbiBpcyBkaXNwb3NlZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogdmFyIHJlcyA9IHNvdXJjZS5zaGFyZVJlcGxheSgzKTtcbiAgICogdmFyIHJlcyA9IHNvdXJjZS5zaGFyZVJlcGxheSgzLCA1MDApO1xuICAgKiB2YXIgcmVzID0gc291cmNlLnNoYXJlUmVwbGF5KDMsIDUwMCwgc2NoZWR1bGVyKTtcbiAgICpcblxuICAgKiBAcGFyYW0gYnVmZmVyU2l6ZSBbT3B0aW9uYWxdIE1heGltdW0gZWxlbWVudCBjb3VudCBvZiB0aGUgcmVwbGF5IGJ1ZmZlci5cbiAgICogQHBhcmFtIHdpbmRvdyBbT3B0aW9uYWxdIE1heGltdW0gdGltZSBsZW5ndGggb2YgdGhlIHJlcGxheSBidWZmZXIuXG4gICAqIEBwYXJhbSBzY2hlZHVsZXIgW09wdGlvbmFsXSBTY2hlZHVsZXIgd2hlcmUgY29ubmVjdGVkIG9ic2VydmVycyB3aXRoaW4gdGhlIHNlbGVjdG9yIGZ1bmN0aW9uIHdpbGwgYmUgaW52b2tlZCBvbi5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBjb250YWlucyB0aGUgZWxlbWVudHMgb2YgYSBzZXF1ZW5jZSBwcm9kdWNlZCBieSBtdWx0aWNhc3RpbmcgdGhlIHNvdXJjZSBzZXF1ZW5jZS5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5zaGFyZVJlcGxheSA9IGZ1bmN0aW9uIChidWZmZXJTaXplLCB3aW5kb3dTaXplLCBzY2hlZHVsZXIpIHtcbiAgICByZXR1cm4gdGhpcy5yZXBsYXkobnVsbCwgYnVmZmVyU2l6ZSwgd2luZG93U2l6ZSwgc2NoZWR1bGVyKS5yZWZDb3VudCgpO1xuICB9O1xuXG4gIHZhciBJbm5lclN1YnNjcmlwdGlvbiA9IGZ1bmN0aW9uIChzLCBvKSB7XG4gICAgdGhpcy5fcyA9IHM7XG4gICAgdGhpcy5fbyA9IG87XG4gIH07XG5cbiAgSW5uZXJTdWJzY3JpcHRpb24ucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl9zLmlzRGlzcG9zZWQgJiYgdGhpcy5fbyAhPT0gbnVsbCkge1xuICAgICAgdmFyIGlkeCA9IHRoaXMuX3Mub2JzZXJ2ZXJzLmluZGV4T2YodGhpcy5fbyk7XG4gICAgICB0aGlzLl9zLm9ic2VydmVycy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgIHRoaXMuX28gPSBudWxsO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogIFJlcHJlc2VudHMgYSB2YWx1ZSB0aGF0IGNoYW5nZXMgb3ZlciB0aW1lLlxuICAgKiAgT2JzZXJ2ZXJzIGNhbiBzdWJzY3JpYmUgdG8gdGhlIHN1YmplY3QgdG8gcmVjZWl2ZSB0aGUgbGFzdCAob3IgaW5pdGlhbCkgdmFsdWUgYW5kIGFsbCBzdWJzZXF1ZW50IG5vdGlmaWNhdGlvbnMuXG4gICAqL1xuICB2YXIgQmVoYXZpb3JTdWJqZWN0ID0gUnguQmVoYXZpb3JTdWJqZWN0ID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhCZWhhdmlvclN1YmplY3QsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gQmVoYXZpb3JTdWJqZWN0KHZhbHVlKSB7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgIHRoaXMub2JzZXJ2ZXJzID0gW107XG4gICAgICB0aGlzLmlzRGlzcG9zZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuaXNTdG9wcGVkID0gZmFsc2U7XG4gICAgICB0aGlzLmhhc0Vycm9yID0gZmFsc2U7XG4gICAgfVxuXG4gICAgYWRkUHJvcGVydGllcyhCZWhhdmlvclN1YmplY3QucHJvdG90eXBlLCBPYnNlcnZlci5wcm90b3R5cGUsIHtcbiAgICAgIF9zdWJzY3JpYmU6IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIGNoZWNrRGlzcG9zZWQodGhpcyk7XG4gICAgICAgIGlmICghdGhpcy5pc1N0b3BwZWQpIHtcbiAgICAgICAgICB0aGlzLm9ic2VydmVycy5wdXNoKG8pO1xuICAgICAgICAgIG8ub25OZXh0KHRoaXMudmFsdWUpO1xuICAgICAgICAgIHJldHVybiBuZXcgSW5uZXJTdWJzY3JpcHRpb24odGhpcywgbyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaGFzRXJyb3IpIHtcbiAgICAgICAgICBvLm9uRXJyb3IodGhpcy5lcnJvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgby5vbkNvbXBsZXRlZCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKiBHZXRzIHRoZSBjdXJyZW50IHZhbHVlIG9yIHRocm93cyBhbiBleGNlcHRpb24uXG4gICAgICAgKiBWYWx1ZSBpcyBmcm96ZW4gYWZ0ZXIgb25Db21wbGV0ZWQgaXMgY2FsbGVkLlxuICAgICAgICogQWZ0ZXIgb25FcnJvciBpcyBjYWxsZWQgYWx3YXlzIHRocm93cyB0aGUgc3BlY2lmaWVkIGV4Y2VwdGlvbi5cbiAgICAgICAqIEFuIGV4Y2VwdGlvbiBpcyBhbHdheXMgdGhyb3duIGFmdGVyIGRpc3Bvc2UgaXMgY2FsbGVkLlxuICAgICAgICogQHJldHVybnMge01peGVkfSBUaGUgaW5pdGlhbCB2YWx1ZSBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yIHVudGlsIG9uTmV4dCBpcyBjYWxsZWQ7IGFmdGVyIHdoaWNoLCB0aGUgbGFzdCB2YWx1ZSBwYXNzZWQgdG8gb25OZXh0LlxuICAgICAgICovXG4gICAgICBnZXRWYWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBjaGVja0Rpc3Bvc2VkKHRoaXMpO1xuICAgICAgICBpZiAodGhpcy5oYXNFcnJvcikgeyB0aHJvd2VyKHRoaXMuZXJyb3IpOyB9XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICAgICAgfSxcbiAgICAgIC8qKlxuICAgICAgICogSW5kaWNhdGVzIHdoZXRoZXIgdGhlIHN1YmplY3QgaGFzIG9ic2VydmVycyBzdWJzY3JpYmVkIHRvIGl0LlxuICAgICAgICogQHJldHVybnMge0Jvb2xlYW59IEluZGljYXRlcyB3aGV0aGVyIHRoZSBzdWJqZWN0IGhhcyBvYnNlcnZlcnMgc3Vic2NyaWJlZCB0byBpdC5cbiAgICAgICAqL1xuICAgICAgaGFzT2JzZXJ2ZXJzOiBmdW5jdGlvbiAoKSB7IGNoZWNrRGlzcG9zZWQodGhpcyk7IHJldHVybiB0aGlzLm9ic2VydmVycy5sZW5ndGggPiAwOyB9LFxuICAgICAgLyoqXG4gICAgICAgKiBOb3RpZmllcyBhbGwgc3Vic2NyaWJlZCBvYnNlcnZlcnMgYWJvdXQgdGhlIGVuZCBvZiB0aGUgc2VxdWVuY2UuXG4gICAgICAgKi9cbiAgICAgIG9uQ29tcGxldGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNoZWNrRGlzcG9zZWQodGhpcyk7XG4gICAgICAgIGlmICh0aGlzLmlzU3RvcHBlZCkgeyByZXR1cm47IH1cbiAgICAgICAgdGhpcy5pc1N0b3BwZWQgPSB0cnVlO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgb3MgPSBjbG9uZUFycmF5KHRoaXMub2JzZXJ2ZXJzKSwgbGVuID0gb3MubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICBvc1tpXS5vbkNvbXBsZXRlZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5vYnNlcnZlcnMubGVuZ3RoID0gMDtcbiAgICAgIH0sXG4gICAgICAvKipcbiAgICAgICAqIE5vdGlmaWVzIGFsbCBzdWJzY3JpYmVkIG9ic2VydmVycyBhYm91dCB0aGUgZXhjZXB0aW9uLlxuICAgICAgICogQHBhcmFtIHtNaXhlZH0gZXJyb3IgVGhlIGV4Y2VwdGlvbiB0byBzZW5kIHRvIGFsbCBvYnNlcnZlcnMuXG4gICAgICAgKi9cbiAgICAgIG9uRXJyb3I6IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICBjaGVja0Rpc3Bvc2VkKHRoaXMpO1xuICAgICAgICBpZiAodGhpcy5pc1N0b3BwZWQpIHsgcmV0dXJuOyB9XG4gICAgICAgIHRoaXMuaXNTdG9wcGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5oYXNFcnJvciA9IHRydWU7XG4gICAgICAgIHRoaXMuZXJyb3IgPSBlcnJvcjtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgb3MgPSBjbG9uZUFycmF5KHRoaXMub2JzZXJ2ZXJzKSwgbGVuID0gb3MubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICBvc1tpXS5vbkVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzLmxlbmd0aCA9IDA7XG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKiBOb3RpZmllcyBhbGwgc3Vic2NyaWJlZCBvYnNlcnZlcnMgYWJvdXQgdGhlIGFycml2YWwgb2YgdGhlIHNwZWNpZmllZCBlbGVtZW50IGluIHRoZSBzZXF1ZW5jZS5cbiAgICAgICAqIEBwYXJhbSB7TWl4ZWR9IHZhbHVlIFRoZSB2YWx1ZSB0byBzZW5kIHRvIGFsbCBvYnNlcnZlcnMuXG4gICAgICAgKi9cbiAgICAgIG9uTmV4dDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGNoZWNrRGlzcG9zZWQodGhpcyk7XG4gICAgICAgIGlmICh0aGlzLmlzU3RvcHBlZCkgeyByZXR1cm47IH1cbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgb3MgPSBjbG9uZUFycmF5KHRoaXMub2JzZXJ2ZXJzKSwgbGVuID0gb3MubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICBvc1tpXS5vbk5leHQodmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKiBVbnN1YnNjcmliZSBhbGwgb2JzZXJ2ZXJzIGFuZCByZWxlYXNlIHJlc291cmNlcy5cbiAgICAgICAqL1xuICAgICAgZGlzcG9zZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmlzRGlzcG9zZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLm9ic2VydmVycyA9IG51bGw7XG4gICAgICAgIHRoaXMudmFsdWUgPSBudWxsO1xuICAgICAgICB0aGlzLmVycm9yID0gbnVsbDtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBCZWhhdmlvclN1YmplY3Q7XG4gIH0oT2JzZXJ2YWJsZSkpO1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIGFuIG9iamVjdCB0aGF0IGlzIGJvdGggYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBhcyB3ZWxsIGFzIGFuIG9ic2VydmVyLlxuICAgKiBFYWNoIG5vdGlmaWNhdGlvbiBpcyBicm9hZGNhc3RlZCB0byBhbGwgc3Vic2NyaWJlZCBhbmQgZnV0dXJlIG9ic2VydmVycywgc3ViamVjdCB0byBidWZmZXIgdHJpbW1pbmcgcG9saWNpZXMuXG4gICAqL1xuICB2YXIgUmVwbGF5U3ViamVjdCA9IFJ4LlJlcGxheVN1YmplY3QgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuXG4gICAgdmFyIG1heFNhZmVJbnRlZ2VyID0gTWF0aC5wb3coMiwgNTMpIC0gMTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVJlbW92YWJsZURpc3Bvc2FibGUoc3ViamVjdCwgb2JzZXJ2ZXIpIHtcbiAgICAgIHJldHVybiBkaXNwb3NhYmxlQ3JlYXRlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb2JzZXJ2ZXIuZGlzcG9zZSgpO1xuICAgICAgICAhc3ViamVjdC5pc0Rpc3Bvc2VkICYmIHN1YmplY3Qub2JzZXJ2ZXJzLnNwbGljZShzdWJqZWN0Lm9ic2VydmVycy5pbmRleE9mKG9ic2VydmVyKSwgMSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpbmhlcml0cyhSZXBsYXlTdWJqZWN0LCBfX3N1cGVyX18pO1xuXG4gICAgLyoqXG4gICAgICogIEluaXRpYWxpemVzIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBSZXBsYXlTdWJqZWN0IGNsYXNzIHdpdGggdGhlIHNwZWNpZmllZCBidWZmZXIgc2l6ZSwgd2luZG93IHNpemUgYW5kIHNjaGVkdWxlci5cbiAgICAgKiAgQHBhcmFtIHtOdW1iZXJ9IFtidWZmZXJTaXplXSBNYXhpbXVtIGVsZW1lbnQgY291bnQgb2YgdGhlIHJlcGxheSBidWZmZXIuXG4gICAgICogIEBwYXJhbSB7TnVtYmVyfSBbd2luZG93U2l6ZV0gTWF4aW11bSB0aW1lIGxlbmd0aCBvZiB0aGUgcmVwbGF5IGJ1ZmZlci5cbiAgICAgKiAgQHBhcmFtIHtTY2hlZHVsZXJ9IFtzY2hlZHVsZXJdIFNjaGVkdWxlciB0aGUgb2JzZXJ2ZXJzIGFyZSBpbnZva2VkIG9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFJlcGxheVN1YmplY3QoYnVmZmVyU2l6ZSwgd2luZG93U2l6ZSwgc2NoZWR1bGVyKSB7XG4gICAgICB0aGlzLmJ1ZmZlclNpemUgPSBidWZmZXJTaXplID09IG51bGwgPyBtYXhTYWZlSW50ZWdlciA6IGJ1ZmZlclNpemU7XG4gICAgICB0aGlzLndpbmRvd1NpemUgPSB3aW5kb3dTaXplID09IG51bGwgPyBtYXhTYWZlSW50ZWdlciA6IHdpbmRvd1NpemU7XG4gICAgICB0aGlzLnNjaGVkdWxlciA9IHNjaGVkdWxlciB8fCBjdXJyZW50VGhyZWFkU2NoZWR1bGVyO1xuICAgICAgdGhpcy5xID0gW107XG4gICAgICB0aGlzLm9ic2VydmVycyA9IFtdO1xuICAgICAgdGhpcy5pc1N0b3BwZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuaXNEaXNwb3NlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5oYXNFcnJvciA9IGZhbHNlO1xuICAgICAgdGhpcy5lcnJvciA9IG51bGw7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBhZGRQcm9wZXJ0aWVzKFJlcGxheVN1YmplY3QucHJvdG90eXBlLCBPYnNlcnZlci5wcm90b3R5cGUsIHtcbiAgICAgIF9zdWJzY3JpYmU6IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIGNoZWNrRGlzcG9zZWQodGhpcyk7XG4gICAgICAgIHZhciBzbyA9IG5ldyBTY2hlZHVsZWRPYnNlcnZlcih0aGlzLnNjaGVkdWxlciwgbyksIHN1YnNjcmlwdGlvbiA9IGNyZWF0ZVJlbW92YWJsZURpc3Bvc2FibGUodGhpcywgc28pO1xuXG4gICAgICAgIHRoaXMuX3RyaW0odGhpcy5zY2hlZHVsZXIubm93KCkpO1xuICAgICAgICB0aGlzLm9ic2VydmVycy5wdXNoKHNvKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5xLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgc28ub25OZXh0KHRoaXMucVtpXS52YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5oYXNFcnJvcikge1xuICAgICAgICAgIHNvLm9uRXJyb3IodGhpcy5lcnJvcik7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc1N0b3BwZWQpIHtcbiAgICAgICAgICBzby5vbkNvbXBsZXRlZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgc28uZW5zdXJlQWN0aXZlKCk7XG4gICAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKiBJbmRpY2F0ZXMgd2hldGhlciB0aGUgc3ViamVjdCBoYXMgb2JzZXJ2ZXJzIHN1YnNjcmliZWQgdG8gaXQuXG4gICAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gSW5kaWNhdGVzIHdoZXRoZXIgdGhlIHN1YmplY3QgaGFzIG9ic2VydmVycyBzdWJzY3JpYmVkIHRvIGl0LlxuICAgICAgICovXG4gICAgICBoYXNPYnNlcnZlcnM6IGZ1bmN0aW9uICgpIHsgY2hlY2tEaXNwb3NlZCh0aGlzKTsgcmV0dXJuIHRoaXMub2JzZXJ2ZXJzLmxlbmd0aCA+IDA7IH0sXG4gICAgICBfdHJpbTogZnVuY3Rpb24gKG5vdykge1xuICAgICAgICB3aGlsZSAodGhpcy5xLmxlbmd0aCA+IHRoaXMuYnVmZmVyU2l6ZSkge1xuICAgICAgICAgIHRoaXMucS5zaGlmdCgpO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlICh0aGlzLnEubGVuZ3RoID4gMCAmJiAobm93IC0gdGhpcy5xWzBdLmludGVydmFsKSA+IHRoaXMud2luZG93U2l6ZSkge1xuICAgICAgICAgIHRoaXMucS5zaGlmdCgpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKiBOb3RpZmllcyBhbGwgc3Vic2NyaWJlZCBvYnNlcnZlcnMgYWJvdXQgdGhlIGFycml2YWwgb2YgdGhlIHNwZWNpZmllZCBlbGVtZW50IGluIHRoZSBzZXF1ZW5jZS5cbiAgICAgICAqIEBwYXJhbSB7TWl4ZWR9IHZhbHVlIFRoZSB2YWx1ZSB0byBzZW5kIHRvIGFsbCBvYnNlcnZlcnMuXG4gICAgICAgKi9cbiAgICAgIG9uTmV4dDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGNoZWNrRGlzcG9zZWQodGhpcyk7XG4gICAgICAgIGlmICh0aGlzLmlzU3RvcHBlZCkgeyByZXR1cm47IH1cbiAgICAgICAgdmFyIG5vdyA9IHRoaXMuc2NoZWR1bGVyLm5vdygpO1xuICAgICAgICB0aGlzLnEucHVzaCh7IGludGVydmFsOiBub3csIHZhbHVlOiB2YWx1ZSB9KTtcbiAgICAgICAgdGhpcy5fdHJpbShub3cpO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBvcyA9IGNsb25lQXJyYXkodGhpcy5vYnNlcnZlcnMpLCBsZW4gPSBvcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIHZhciBvYnNlcnZlciA9IG9zW2ldO1xuICAgICAgICAgIG9ic2VydmVyLm9uTmV4dCh2YWx1ZSk7XG4gICAgICAgICAgb2JzZXJ2ZXIuZW5zdXJlQWN0aXZlKCk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAvKipcbiAgICAgICAqIE5vdGlmaWVzIGFsbCBzdWJzY3JpYmVkIG9ic2VydmVycyBhYm91dCB0aGUgZXhjZXB0aW9uLlxuICAgICAgICogQHBhcmFtIHtNaXhlZH0gZXJyb3IgVGhlIGV4Y2VwdGlvbiB0byBzZW5kIHRvIGFsbCBvYnNlcnZlcnMuXG4gICAgICAgKi9cbiAgICAgIG9uRXJyb3I6IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICBjaGVja0Rpc3Bvc2VkKHRoaXMpO1xuICAgICAgICBpZiAodGhpcy5pc1N0b3BwZWQpIHsgcmV0dXJuOyB9XG4gICAgICAgIHRoaXMuaXNTdG9wcGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5lcnJvciA9IGVycm9yO1xuICAgICAgICB0aGlzLmhhc0Vycm9yID0gdHJ1ZTtcbiAgICAgICAgdmFyIG5vdyA9IHRoaXMuc2NoZWR1bGVyLm5vdygpO1xuICAgICAgICB0aGlzLl90cmltKG5vdyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBvcyA9IGNsb25lQXJyYXkodGhpcy5vYnNlcnZlcnMpLCBsZW4gPSBvcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIHZhciBvYnNlcnZlciA9IG9zW2ldO1xuICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyb3IpO1xuICAgICAgICAgIG9ic2VydmVyLmVuc3VyZUFjdGl2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzLmxlbmd0aCA9IDA7XG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKiBOb3RpZmllcyBhbGwgc3Vic2NyaWJlZCBvYnNlcnZlcnMgYWJvdXQgdGhlIGVuZCBvZiB0aGUgc2VxdWVuY2UuXG4gICAgICAgKi9cbiAgICAgIG9uQ29tcGxldGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNoZWNrRGlzcG9zZWQodGhpcyk7XG4gICAgICAgIGlmICh0aGlzLmlzU3RvcHBlZCkgeyByZXR1cm47IH1cbiAgICAgICAgdGhpcy5pc1N0b3BwZWQgPSB0cnVlO1xuICAgICAgICB2YXIgbm93ID0gdGhpcy5zY2hlZHVsZXIubm93KCk7XG4gICAgICAgIHRoaXMuX3RyaW0obm93KTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG9zID0gY2xvbmVBcnJheSh0aGlzLm9ic2VydmVycyksIGxlbiA9IG9zLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgdmFyIG9ic2VydmVyID0gb3NbaV07XG4gICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICBvYnNlcnZlci5lbnN1cmVBY3RpdmUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9ic2VydmVycy5sZW5ndGggPSAwO1xuICAgICAgfSxcbiAgICAgIC8qKlxuICAgICAgICogVW5zdWJzY3JpYmUgYWxsIG9ic2VydmVycyBhbmQgcmVsZWFzZSByZXNvdXJjZXMuXG4gICAgICAgKi9cbiAgICAgIGRpc3Bvc2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5pc0Rpc3Bvc2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5vYnNlcnZlcnMgPSBudWxsO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIFJlcGxheVN1YmplY3Q7XG4gIH0oT2JzZXJ2YWJsZSkpO1xuXG4gIHZhciBSZWZDb3VudE9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFJlZkNvdW50T2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBSZWZDb3VudE9ic2VydmFibGUoc291cmNlKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRoaXMuX2NvdW50ID0gMDtcbiAgICAgIHRoaXMuX2Nvbm5lY3RhYmxlU3Vic2NyaXB0aW9uID0gbnVsbDtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFJlZkNvdW50T2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgc3Vic2NyaXB0aW9uID0gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG8pO1xuICAgICAgKyt0aGlzLl9jb3VudCA9PT0gMSAmJiAodGhpcy5fY29ubmVjdGFibGVTdWJzY3JpcHRpb24gPSB0aGlzLnNvdXJjZS5jb25uZWN0KCkpO1xuICAgICAgcmV0dXJuIG5ldyBSZWZDb3VudERpc3Bvc2FibGUodGhpcywgc3Vic2NyaXB0aW9uKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gUmVmQ291bnREaXNwb3NhYmxlKHAsIHMpIHtcbiAgICAgIHRoaXMuX3AgPSBwO1xuICAgICAgdGhpcy5fcyA9IHM7XG4gICAgICB0aGlzLmlzRGlzcG9zZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBSZWZDb3VudERpc3Bvc2FibGUucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoIXRoaXMuaXNEaXNwb3NlZCkge1xuICAgICAgICB0aGlzLmlzRGlzcG9zZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLl9zLmRpc3Bvc2UoKTtcbiAgICAgICAgLS10aGlzLl9wLl9jb3VudCA9PT0gMCAmJiB0aGlzLl9wLl9jb25uZWN0YWJsZVN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBSZWZDb3VudE9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgQ29ubmVjdGFibGVPYnNlcnZhYmxlID0gUnguQ29ubmVjdGFibGVPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhDb25uZWN0YWJsZU9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gQ29ubmVjdGFibGVPYnNlcnZhYmxlKHNvdXJjZSwgc3ViamVjdCkge1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLl9jb25uZWN0aW9uID0gbnVsbDtcbiAgICAgIHRoaXMuX3NvdXJjZSA9IHNvdXJjZS5hc09ic2VydmFibGUoKTtcbiAgICAgIHRoaXMuX3N1YmplY3QgPSBzdWJqZWN0O1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gQ29ubmVjdERpc3Bvc2FibGUocGFyZW50LCBzdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMuX3AgPSBwYXJlbnQ7XG4gICAgICB0aGlzLl9zID0gc3Vic2NyaXB0aW9uO1xuICAgIH1cblxuICAgIENvbm5lY3REaXNwb3NhYmxlLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHRoaXMuX3MpIHtcbiAgICAgICAgdGhpcy5fcy5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMuX3MgPSBudWxsO1xuICAgICAgICB0aGlzLl9wLl9jb25uZWN0aW9uID0gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgQ29ubmVjdGFibGVPYnNlcnZhYmxlLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCF0aGlzLl9jb25uZWN0aW9uKSB7XG4gICAgICAgIGlmICh0aGlzLl9zdWJqZWN0LmlzU3RvcHBlZCkge1xuICAgICAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN1YnNjcmlwdGlvbiA9IHRoaXMuX3NvdXJjZS5zdWJzY3JpYmUodGhpcy5fc3ViamVjdCk7XG4gICAgICAgIHRoaXMuX2Nvbm5lY3Rpb24gPSBuZXcgQ29ubmVjdERpc3Bvc2FibGUodGhpcywgc3Vic2NyaXB0aW9uKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLl9jb25uZWN0aW9uO1xuICAgIH07XG5cbiAgICBDb25uZWN0YWJsZU9ic2VydmFibGUucHJvdG90eXBlLl9zdWJzY3JpYmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMuX3N1YmplY3Quc3Vic2NyaWJlKG8pO1xuICAgIH07XG5cbiAgICBDb25uZWN0YWJsZU9ic2VydmFibGUucHJvdG90eXBlLnJlZkNvdW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5ldyBSZWZDb3VudE9ic2VydmFibGUodGhpcyk7XG4gICAgfTtcblxuICAgIHJldHVybiBDb25uZWN0YWJsZU9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZSkpO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBzaGFyZXMgYSBzaW5nbGUgc3Vic2NyaXB0aW9uIHRvIHRoZSB1bmRlcmx5aW5nIHNlcXVlbmNlLiBUaGlzIG9ic2VydmFibGUgc2VxdWVuY2VcbiAgICogY2FuIGJlIHJlc3Vic2NyaWJlZCB0bywgZXZlbiBpZiBhbGwgcHJpb3Igc3Vic2NyaXB0aW9ucyBoYXZlIGVuZGVkLiAodW5saWtlIGAucHVibGlzaCgpLnJlZkNvdW50KClgKVxuICAgKiBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGNvbnRhaW5zIHRoZSBlbGVtZW50cyBvZiBhIHNlcXVlbmNlIHByb2R1Y2VkIGJ5IG11bHRpY2FzdGluZyB0aGUgc291cmNlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnNpbmdsZUluc3RhbmNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNvdXJjZSA9IHRoaXMsIGhhc09ic2VydmFibGUgPSBmYWxzZSwgb2JzZXJ2YWJsZTtcblxuICAgIGZ1bmN0aW9uIGdldE9ic2VydmFibGUoKSB7XG4gICAgICBpZiAoIWhhc09ic2VydmFibGUpIHtcbiAgICAgICAgaGFzT2JzZXJ2YWJsZSA9IHRydWU7XG4gICAgICAgIG9ic2VydmFibGUgPSBzb3VyY2VbJ2ZpbmFsbHknXShmdW5jdGlvbigpIHsgaGFzT2JzZXJ2YWJsZSA9IGZhbHNlOyB9KS5wdWJsaXNoKCkucmVmQ291bnQoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYnNlcnZhYmxlO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbihvKSB7XG4gICAgICByZXR1cm4gZ2V0T2JzZXJ2YWJsZSgpLnN1YnNjcmliZShvKTtcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gUng7XG59KSk7XG4iXX0=