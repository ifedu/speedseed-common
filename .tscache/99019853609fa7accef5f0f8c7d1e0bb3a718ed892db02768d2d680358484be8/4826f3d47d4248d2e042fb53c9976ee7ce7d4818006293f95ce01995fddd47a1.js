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
        define(['./rx.virtualtime', 'exports'], function (Rx, exports) {
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
    // Defaults
    var Observer = Rx.Observer, Observable = Rx.Observable, Notification = Rx.Notification, VirtualTimeScheduler = Rx.VirtualTimeScheduler, Disposable = Rx.Disposable, disposableEmpty = Disposable.empty, disposableCreate = Disposable.create, CompositeDisposable = Rx.CompositeDisposable, inherits = Rx.internals.inherits, defaultComparer = Rx.internals.isEqual;
    function OnNextPredicate(predicate) {
        this.predicate = predicate;
    }
    OnNextPredicate.prototype.equals = function (other) {
        if (other === this) {
            return true;
        }
        if (other == null) {
            return false;
        }
        if (other.kind !== 'N') {
            return false;
        }
        return this.predicate(other.value);
    };
    function OnErrorPredicate(predicate) {
        this.predicate = predicate;
    }
    OnErrorPredicate.prototype.equals = function (other) {
        if (other === this) {
            return true;
        }
        if (other == null) {
            return false;
        }
        if (other.kind !== 'E') {
            return false;
        }
        return this.predicate(other.error);
    };
    var ReactiveTest = Rx.ReactiveTest = {
        /** Default virtual time used for creation of observable sequences in unit tests. */
        created: 100,
        /** Default virtual time used to subscribe to observable sequences in unit tests. */
        subscribed: 200,
        /** Default virtual time used to dispose subscriptions in unit tests. */
        disposed: 1000,
        /**
         * Factory method for an OnNext notification record at a given time with a given value or a predicate function.
         *
         * 1 - ReactiveTest.onNext(200, 42);
         * 2 - ReactiveTest.onNext(200, function (x) { return x.length == 2; });
         *
         * @param ticks Recorded virtual time the OnNext notification occurs.
         * @param value Recorded value stored in the OnNext notification or a predicate.
         * @return Recorded OnNext notification.
         */
        onNext: function (ticks, value) {
            return typeof value === 'function' ?
                new Recorded(ticks, new OnNextPredicate(value)) :
                new Recorded(ticks, Notification.createOnNext(value));
        },
        /**
         * Factory method for an OnError notification record at a given time with a given error.
         *
         * 1 - ReactiveTest.onNext(200, new Error('error'));
         * 2 - ReactiveTest.onNext(200, function (e) { return e.message === 'error'; });
         *
         * @param ticks Recorded virtual time the OnError notification occurs.
         * @param exception Recorded exception stored in the OnError notification.
         * @return Recorded OnError notification.
         */
        onError: function (ticks, error) {
            return typeof error === 'function' ?
                new Recorded(ticks, new OnErrorPredicate(error)) :
                new Recorded(ticks, Notification.createOnError(error));
        },
        /**
         * Factory method for an OnCompleted notification record at a given time.
         *
         * @param ticks Recorded virtual time the OnCompleted notification occurs.
         * @return Recorded OnCompleted notification.
         */
        onCompleted: function (ticks) {
            return new Recorded(ticks, Notification.createOnCompleted());
        },
        /**
         * Factory method for a subscription record based on a given subscription and disposal time.
         *
         * @param start Virtual time indicating when the subscription was created.
         * @param end Virtual time indicating when the subscription was disposed.
         * @return Subscription object.
         */
        subscribe: function (start, end) {
            return new Subscription(start, end);
        }
    };
    /**
     * Creates a new object recording the production of the specified value at the given virtual time.
     *
     * @constructor
     * @param {Number} time Virtual time the value was produced on.
     * @param {Mixed} value Value that was produced.
     * @param {Function} comparer An optional comparer.
     */
    var Recorded = Rx.Recorded = function (time, value, comparer) {
        this.time = time;
        this.value = value;
        this.comparer = comparer || defaultComparer;
    };
    /**
     * Checks whether the given recorded object is equal to the current instance.
     *
     * @param {Recorded} other Recorded object to check for equality.
     * @returns {Boolean} true if both objects are equal; false otherwise.
     */
    Recorded.prototype.equals = function (other) {
        return this.time === other.time && this.comparer(this.value, other.value);
    };
    /**
     * Returns a string representation of the current Recorded value.
     *
     * @returns {String} String representation of the current Recorded value.
     */
    Recorded.prototype.toString = function () {
        return this.value.toString() + '@' + this.time;
    };
    /**
     * Creates a new subscription object with the given virtual subscription and unsubscription time.
     *
     * @constructor
     * @param {Number} subscribe Virtual time at which the subscription occurred.
     * @param {Number} unsubscribe Virtual time at which the unsubscription occurred.
     */
    var Subscription = Rx.Subscription = function (start, end) {
        this.subscribe = start;
        this.unsubscribe = end || Number.MAX_VALUE;
    };
    /**
     * Checks whether the given subscription is equal to the current instance.
     * @param other Subscription object to check for equality.
     * @returns {Boolean} true if both objects are equal; false otherwise.
     */
    Subscription.prototype.equals = function (other) {
        return this.subscribe === other.subscribe && this.unsubscribe === other.unsubscribe;
    };
    /**
     * Returns a string representation of the current Subscription value.
     * @returns {String} String representation of the current Subscription value.
     */
    Subscription.prototype.toString = function () {
        return '(' + this.subscribe + ', ' + (this.unsubscribe === Number.MAX_VALUE ? 'Infinite' : this.unsubscribe) + ')';
    };
    var MockDisposable = Rx.MockDisposable = function (scheduler) {
        this.scheduler = scheduler;
        this.disposes = [];
        this.disposes.push(this.scheduler.clock);
    };
    MockDisposable.prototype.dispose = function () {
        this.disposes.push(this.scheduler.clock);
    };
    var MockObserver = (function (__super__) {
        inherits(MockObserver, __super__);
        function MockObserver(scheduler) {
            __super__.call(this);
            this.scheduler = scheduler;
            this.messages = [];
        }
        var MockObserverPrototype = MockObserver.prototype;
        MockObserverPrototype.onNext = function (value) {
            this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnNext(value)));
        };
        MockObserverPrototype.onError = function (e) {
            this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnError(e)));
        };
        MockObserverPrototype.onCompleted = function () {
            this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnCompleted()));
        };
        return MockObserver;
    })(Observer);
    function MockPromise(scheduler, messages) {
        var self = this;
        this.scheduler = scheduler;
        this.messages = messages;
        this.subscriptions = [];
        this.observers = [];
        for (var i = 0, len = this.messages.length; i < len; i++) {
            var message = this.messages[i], notification = message.value;
            (function (innerNotification) {
                scheduler.scheduleAbsolute(null, message.time, function () {
                    var obs = self.observers.slice(0);
                    for (var j = 0, jLen = obs.length; j < jLen; j++) {
                        innerNotification.accept(obs[j]);
                    }
                    return disposableEmpty;
                });
            })(notification);
        }
    }
    MockPromise.prototype.then = function (onResolved, onRejected) {
        var self = this;
        this.subscriptions.push(new Subscription(this.scheduler.clock));
        var index = this.subscriptions.length - 1;
        var newPromise;
        var observer = Rx.Observer.create(function (x) {
            var retValue = onResolved(x);
            if (retValue && typeof retValue.then === 'function') {
                newPromise = retValue;
            }
            else {
                var ticks = self.scheduler.clock;
                newPromise = new MockPromise(self.scheduler, [Rx.ReactiveTest.onNext(ticks, undefined), Rx.ReactiveTest.onCompleted(ticks)]);
            }
            var idx = self.observers.indexOf(observer);
            self.observers.splice(idx, 1);
            self.subscriptions[index] = new Subscription(self.subscriptions[index].subscribe, self.scheduler.clock);
        }, function (err) {
            onRejected(err);
            var idx = self.observers.indexOf(observer);
            self.observers.splice(idx, 1);
            self.subscriptions[index] = new Subscription(self.subscriptions[index].subscribe, self.scheduler.clock);
        });
        this.observers.push(observer);
        return newPromise || new MockPromise(this.scheduler, this.messages);
    };
    var HotObservable = (function (__super__) {
        inherits(HotObservable, __super__);
        function HotObservable(scheduler, messages) {
            __super__.call(this);
            var message, notification, observable = this;
            this.scheduler = scheduler;
            this.messages = messages;
            this.subscriptions = [];
            this.observers = [];
            for (var i = 0, len = this.messages.length; i < len; i++) {
                message = this.messages[i];
                notification = message.value;
                (function (innerNotification) {
                    scheduler.scheduleAbsolute(null, message.time, function () {
                        var obs = observable.observers.slice(0);
                        for (var j = 0, jLen = obs.length; j < jLen; j++) {
                            innerNotification.accept(obs[j]);
                        }
                        return disposableEmpty;
                    });
                })(notification);
            }
        }
        HotObservable.prototype._subscribe = function (o) {
            var observable = this;
            this.observers.push(o);
            this.subscriptions.push(new Subscription(this.scheduler.clock));
            var index = this.subscriptions.length - 1;
            return disposableCreate(function () {
                var idx = observable.observers.indexOf(o);
                observable.observers.splice(idx, 1);
                observable.subscriptions[index] = new Subscription(observable.subscriptions[index].subscribe, observable.scheduler.clock);
            });
        };
        return HotObservable;
    })(Observable);
    var ColdObservable = (function (__super__) {
        inherits(ColdObservable, __super__);
        function ColdObservable(scheduler, messages) {
            __super__.call(this);
            this.scheduler = scheduler;
            this.messages = messages;
            this.subscriptions = [];
        }
        ColdObservable.prototype._subscribe = function (o) {
            var message, notification, observable = this;
            this.subscriptions.push(new Subscription(this.scheduler.clock));
            var index = this.subscriptions.length - 1;
            var d = new CompositeDisposable();
            for (var i = 0, len = this.messages.length; i < len; i++) {
                message = this.messages[i];
                notification = message.value;
                (function (innerNotification) {
                    d.add(observable.scheduler.scheduleRelative(null, message.time, function () {
                        innerNotification.accept(o);
                        return disposableEmpty;
                    }));
                })(notification);
            }
            return disposableCreate(function () {
                observable.subscriptions[index] = new Subscription(observable.subscriptions[index].subscribe, observable.scheduler.clock);
                d.dispose();
            });
        };
        return ColdObservable;
    })(Observable);
    /** Virtual time scheduler used for testing applications and libraries built using Reactive Extensions. */
    Rx.TestScheduler = (function (__super__) {
        inherits(TestScheduler, __super__);
        function baseComparer(x, y) {
            return x > y ? 1 : (x < y ? -1 : 0);
        }
        function TestScheduler() {
            __super__.call(this, 0, baseComparer);
        }
        /**
         * Schedules an action to be executed at the specified virtual time.
         *
         * @param state State passed to the action to be executed.
         * @param dueTime Absolute virtual time at which to execute the action.
         * @param action Action to be executed.
         * @return Disposable object used to cancel the scheduled action (best effort).
         */
        TestScheduler.prototype.scheduleAbsolute = function (state, dueTime, action) {
            dueTime <= this.clock && (dueTime = this.clock + 1);
            return __super__.prototype.scheduleAbsolute.call(this, state, dueTime, action);
        };
        /**
         * Adds a relative virtual time to an absolute virtual time value.
         *
         * @param absolute Absolute virtual time value.
         * @param relative Relative virtual time value to add.
         * @return Resulting absolute virtual time sum value.
         */
        TestScheduler.prototype.add = function (absolute, relative) {
            return absolute + relative;
        };
        /**
         * Converts the absolute virtual time value to a DateTimeOffset value.
         *
         * @param absolute Absolute virtual time value to convert.
         * @return Corresponding DateTimeOffset value.
         */
        TestScheduler.prototype.toAbsoluteTime = function (absolute) {
            return new Date(absolute).getTime();
        };
        /**
         * Converts the TimeSpan value to a relative virtual time value.
         *
         * @param timeSpan TimeSpan value to convert.
         * @return Corresponding relative virtual time value.
         */
        TestScheduler.prototype.toRelativeTime = function (timeSpan) {
            return timeSpan;
        };
        /**
         * Starts the test scheduler and uses the specified virtual times to invoke the factory function, subscribe to the resulting sequence, and dispose the subscription.
         *
         * @param create Factory method to create an observable sequence.
         * @param created Virtual time at which to invoke the factory to create an observable sequence.
         * @param subscribed Virtual time at which to subscribe to the created observable sequence.
         * @param disposed Virtual time at which to dispose the subscription.
         * @return Observer with timestamped recordings of notification messages that were received during the virtual time window when the subscription to the source sequence was active.
         */
        TestScheduler.prototype.startScheduler = function (createFn, settings) {
            settings || (settings = {});
            settings.created == null && (settings.created = ReactiveTest.created);
            settings.subscribed == null && (settings.subscribed = ReactiveTest.subscribed);
            settings.disposed == null && (settings.disposed = ReactiveTest.disposed);
            var observer = this.createObserver(), source, subscription;
            this.scheduleAbsolute(null, settings.created, function () {
                source = createFn();
                return disposableEmpty;
            });
            this.scheduleAbsolute(null, settings.subscribed, function () {
                subscription = source.subscribe(observer);
                return disposableEmpty;
            });
            this.scheduleAbsolute(null, settings.disposed, function () {
                subscription.dispose();
                return disposableEmpty;
            });
            this.start();
            return observer;
        };
        /**
         * Creates a hot observable using the specified timestamped notification messages either as an array or arguments.
         * @param messages Notifications to surface through the created sequence at their specified absolute virtual times.
         * @return Hot observable sequence that can be used to assert the timing of subscriptions and notifications.
         */
        TestScheduler.prototype.createHotObservable = function () {
            var len = arguments.length, args;
            if (Array.isArray(arguments[0])) {
                args = arguments[0];
            }
            else {
                args = new Array(len);
                for (var i = 0; i < len; i++) {
                    args[i] = arguments[i];
                }
            }
            return new HotObservable(this, args);
        };
        /**
         * Creates a cold observable using the specified timestamped notification messages either as an array or arguments.
         * @param messages Notifications to surface through the created sequence at their specified virtual time offsets from the sequence subscription time.
         * @return Cold observable sequence that can be used to assert the timing of subscriptions and notifications.
         */
        TestScheduler.prototype.createColdObservable = function () {
            var len = arguments.length, args;
            if (Array.isArray(arguments[0])) {
                args = arguments[0];
            }
            else {
                args = new Array(len);
                for (var i = 0; i < len; i++) {
                    args[i] = arguments[i];
                }
            }
            return new ColdObservable(this, args);
        };
        /**
         * Creates a resolved promise with the given value and ticks
         * @param {Number} ticks The absolute time of the resolution.
         * @param {Any} value The value to yield at the given tick.
         * @returns {MockPromise} A mock Promise which fulfills with the given value.
         */
        TestScheduler.prototype.createResolvedPromise = function (ticks, value) {
            return new MockPromise(this, [Rx.ReactiveTest.onNext(ticks, value), Rx.ReactiveTest.onCompleted(ticks)]);
        };
        /**
         * Creates a rejected promise with the given reason and ticks
         * @param {Number} ticks The absolute time of the resolution.
         * @param {Any} reason The reason for rejection to yield at the given tick.
         * @returns {MockPromise} A mock Promise which rejects with the given reason.
         */
        TestScheduler.prototype.createRejectedPromise = function (ticks, reason) {
            return new MockPromise(this, [Rx.ReactiveTest.onError(ticks, reason)]);
        };
        /**
         * Creates an observer that records received notification messages and timestamps those.
         * @return Observer that can be used to assert the timing of received notifications.
         */
        TestScheduler.prototype.createObserver = function () {
            return new MockObserver(this);
        };
        return TestScheduler;
    })(VirtualTimeScheduler);
    return Rx;
}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccngudGVzdGluZy5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccngudGVzdGluZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSw2R0FBNkc7QUFFN0csQ0FBQztBQUFBLENBQUMsVUFBVSxPQUFPO0lBQ2pCLElBQUksV0FBVyxHQUFHO1FBQ2hCLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLFFBQVEsRUFBRSxJQUFJO0tBQ2YsQ0FBQztJQUVGLHFCQUFxQixLQUFLO1FBQ3hCLE1BQU0sQ0FBQyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDM0QsQ0FBQztJQUVELElBQUksV0FBVyxHQUFHLENBQUMsV0FBVyxDQUFDLE9BQU8sT0FBTyxDQUFDLElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDakcsSUFBSSxVQUFVLEdBQUcsQ0FBQyxXQUFXLENBQUMsT0FBTyxNQUFNLENBQUMsSUFBSSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQztJQUM1RixJQUFJLFVBQVUsR0FBRyxXQUFXLENBQUMsV0FBVyxJQUFJLFVBQVUsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLElBQUksTUFBTSxDQUFDLENBQUM7SUFDaEcsSUFBSSxRQUFRLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxPQUFP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LENBQUM7UUFFRixNQUFNLENBQUMsYUFBYSxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFFekIsTUFBTSxDQUFDLEVBQUUsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCwgQWxsIHJpZ2h0cyByZXNlcnZlZC4gU2VlIExpY2Vuc2UudHh0IGluIHRoZSBwcm9qZWN0IHJvb3QgZm9yIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG5cbjsoZnVuY3Rpb24gKGZhY3RvcnkpIHtcbiAgdmFyIG9iamVjdFR5cGVzID0ge1xuICAgICdmdW5jdGlvbic6IHRydWUsXG4gICAgJ29iamVjdCc6IHRydWVcbiAgfTtcblxuICBmdW5jdGlvbiBjaGVja0dsb2JhbCh2YWx1ZSkge1xuICAgIHJldHVybiAodmFsdWUgJiYgdmFsdWUuT2JqZWN0ID09PSBPYmplY3QpID8gdmFsdWUgOiBudWxsO1xuICB9XG5cbiAgdmFyIGZyZWVFeHBvcnRzID0gKG9iamVjdFR5cGVzW3R5cGVvZiBleHBvcnRzXSAmJiBleHBvcnRzICYmICFleHBvcnRzLm5vZGVUeXBlKSA/IGV4cG9ydHMgOiBudWxsO1xuICB2YXIgZnJlZU1vZHVsZSA9IChvYmplY3RUeXBlc1t0eXBlb2YgbW9kdWxlXSAmJiBtb2R1bGUgJiYgIW1vZHVsZS5ub2RlVHlwZSkgPyBtb2R1bGUgOiBudWxsO1xuICB2YXIgZnJlZUdsb2JhbCA9IGNoZWNrR2xvYmFsKGZyZWVFeHBvcnRzICYmIGZyZWVNb2R1bGUgJiYgdHlwZW9mIGdsb2JhbCA9PT0gJ29iamVjdCcgJiYgZ2xvYmFsKTtcbiAgdmFyIGZyZWVTZWxmID0gY2hlY2tHbG9iYWwob2JqZWN0VHlwZXNbdHlwZW9mIHNlbGZdICYmIHNlbGYpO1xuICB2YXIgZnJlZVdpbmRvdyA9IGNoZWNrR2xvYmFsKG9iamVjdFR5cGVzW3R5cGVvZiB3aW5kb3ddICYmIHdpbmRvdyk7XG4gIHZhciBtb2R1bGVFeHBvcnRzID0gKGZyZWVNb2R1bGUgJiYgZnJlZU1vZHVsZS5leHBvcnRzID09PSBmcmVlRXhwb3J0cykgPyBmcmVlRXhwb3J0cyA6IG51bGw7XG4gIHZhciB0aGlzR2xvYmFsID0gY2hlY2tHbG9iYWwob2JqZWN0VHlwZXNbdHlwZW9mIHRoaXNdICYmIHRoaXMpO1xuICB2YXIgcm9vdCA9IGZyZWVHbG9iYWwgfHwgKChmcmVlV2luZG93ICE9PSAodGhpc0dsb2JhbCAmJiB0aGlzR2xvYmFsLndpbmRvdykpICYmIGZyZWVXaW5kb3cpIHx8IGZyZWVTZWxmIHx8IHRoaXNHbG9iYWwgfHwgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblxuICAvLyBCZWNhdXNlIG9mIGJ1aWxkIG9wdGltaXplcnNcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShbJy4vcngudmlydHVhbHRpbWUnLCAnZXhwb3J0cyddLCBmdW5jdGlvbiAoUngsIGV4cG9ydHMpIHtcbiAgICAgIHJvb3QuUnggPSBmYWN0b3J5KHJvb3QsIGV4cG9ydHMsIFJ4KTtcbiAgICAgIHJldHVybiByb290LlJ4O1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZSAmJiBtb2R1bGUuZXhwb3J0cyA9PT0gZnJlZUV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnkocm9vdCwgbW9kdWxlLmV4cG9ydHMsIHJlcXVpcmUoJy4vcngnKSk7XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5SeCA9IGZhY3Rvcnkocm9vdCwge30sIHJvb3QuUngpO1xuICB9XG59LmNhbGwodGhpcywgZnVuY3Rpb24gKHJvb3QsIGV4cCwgUngsIHVuZGVmaW5lZCkge1xuXG4gIC8vIERlZmF1bHRzXG4gIHZhciBPYnNlcnZlciA9IFJ4Lk9ic2VydmVyLFxuICAgIE9ic2VydmFibGUgPSBSeC5PYnNlcnZhYmxlLFxuICAgIE5vdGlmaWNhdGlvbiA9IFJ4Lk5vdGlmaWNhdGlvbixcbiAgICBWaXJ0dWFsVGltZVNjaGVkdWxlciA9IFJ4LlZpcnR1YWxUaW1lU2NoZWR1bGVyLFxuICAgIERpc3Bvc2FibGUgPSBSeC5EaXNwb3NhYmxlLFxuICAgIGRpc3Bvc2FibGVFbXB0eSA9IERpc3Bvc2FibGUuZW1wdHksXG4gICAgZGlzcG9zYWJsZUNyZWF0ZSA9IERpc3Bvc2FibGUuY3JlYXRlLFxuICAgIENvbXBvc2l0ZURpc3Bvc2FibGUgPSBSeC5Db21wb3NpdGVEaXNwb3NhYmxlLFxuICAgIGluaGVyaXRzID0gUnguaW50ZXJuYWxzLmluaGVyaXRzLFxuICAgIGRlZmF1bHRDb21wYXJlciA9IFJ4LmludGVybmFscy5pc0VxdWFsO1xuXG5mdW5jdGlvbiBPbk5leHRQcmVkaWNhdGUocHJlZGljYXRlKSB7XG4gICAgdGhpcy5wcmVkaWNhdGUgPSBwcmVkaWNhdGU7XG59XG5cbk9uTmV4dFByZWRpY2F0ZS5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKG90aGVyKSB7XG4gIGlmIChvdGhlciA9PT0gdGhpcykgeyByZXR1cm4gdHJ1ZTsgfVxuICBpZiAob3RoZXIgPT0gbnVsbCkgeyByZXR1cm4gZmFsc2U7IH1cbiAgaWYgKG90aGVyLmtpbmQgIT09ICdOJykgeyByZXR1cm4gZmFsc2U7IH1cbiAgcmV0dXJuIHRoaXMucHJlZGljYXRlKG90aGVyLnZhbHVlKTtcbn07XG5cbmZ1bmN0aW9uIE9uRXJyb3JQcmVkaWNhdGUocHJlZGljYXRlKSB7XG4gIHRoaXMucHJlZGljYXRlID0gcHJlZGljYXRlO1xufVxuXG5PbkVycm9yUHJlZGljYXRlLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgaWYgKG90aGVyID09PSB0aGlzKSB7IHJldHVybiB0cnVlOyB9XG4gIGlmIChvdGhlciA9PSBudWxsKSB7IHJldHVybiBmYWxzZTsgfVxuICBpZiAob3RoZXIua2luZCAhPT0gJ0UnKSB7IHJldHVybiBmYWxzZTsgfVxuICByZXR1cm4gdGhpcy5wcmVkaWNhdGUob3RoZXIuZXJyb3IpO1xufTtcblxudmFyIFJlYWN0aXZlVGVzdCA9IFJ4LlJlYWN0aXZlVGVzdCA9IHtcbiAgLyoqIERlZmF1bHQgdmlydHVhbCB0aW1lIHVzZWQgZm9yIGNyZWF0aW9uIG9mIG9ic2VydmFibGUgc2VxdWVuY2VzIGluIHVuaXQgdGVzdHMuICovXG4gIGNyZWF0ZWQ6IDEwMCxcbiAgLyoqIERlZmF1bHQgdmlydHVhbCB0aW1lIHVzZWQgdG8gc3Vic2NyaWJlIHRvIG9ic2VydmFibGUgc2VxdWVuY2VzIGluIHVuaXQgdGVzdHMuICovXG4gIHN1YnNjcmliZWQ6IDIwMCxcbiAgLyoqIERlZmF1bHQgdmlydHVhbCB0aW1lIHVzZWQgdG8gZGlzcG9zZSBzdWJzY3JpcHRpb25zIGluIHVuaXQgdGVzdHMuICovXG4gIGRpc3Bvc2VkOiAxMDAwLFxuXG4gIC8qKlxuICAgKiBGYWN0b3J5IG1ldGhvZCBmb3IgYW4gT25OZXh0IG5vdGlmaWNhdGlvbiByZWNvcmQgYXQgYSBnaXZlbiB0aW1lIHdpdGggYSBnaXZlbiB2YWx1ZSBvciBhIHByZWRpY2F0ZSBmdW5jdGlvbi5cbiAgICpcbiAgICogMSAtIFJlYWN0aXZlVGVzdC5vbk5leHQoMjAwLCA0Mik7XG4gICAqIDIgLSBSZWFjdGl2ZVRlc3Qub25OZXh0KDIwMCwgZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHgubGVuZ3RoID09IDI7IH0pO1xuICAgKlxuICAgKiBAcGFyYW0gdGlja3MgUmVjb3JkZWQgdmlydHVhbCB0aW1lIHRoZSBPbk5leHQgbm90aWZpY2F0aW9uIG9jY3Vycy5cbiAgICogQHBhcmFtIHZhbHVlIFJlY29yZGVkIHZhbHVlIHN0b3JlZCBpbiB0aGUgT25OZXh0IG5vdGlmaWNhdGlvbiBvciBhIHByZWRpY2F0ZS5cbiAgICogQHJldHVybiBSZWNvcmRlZCBPbk5leHQgbm90aWZpY2F0aW9uLlxuICAgKi9cbiAgb25OZXh0OiBmdW5jdGlvbiAodGlja3MsIHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICBuZXcgUmVjb3JkZWQodGlja3MsIG5ldyBPbk5leHRQcmVkaWNhdGUodmFsdWUpKSA6XG4gICAgICBuZXcgUmVjb3JkZWQodGlja3MsIE5vdGlmaWNhdGlvbi5jcmVhdGVPbk5leHQodmFsdWUpKTtcbiAgfSxcbiAgLyoqXG4gICAqIEZhY3RvcnkgbWV0aG9kIGZvciBhbiBPbkVycm9yIG5vdGlmaWNhdGlvbiByZWNvcmQgYXQgYSBnaXZlbiB0aW1lIHdpdGggYSBnaXZlbiBlcnJvci5cbiAgICpcbiAgICogMSAtIFJlYWN0aXZlVGVzdC5vbk5leHQoMjAwLCBuZXcgRXJyb3IoJ2Vycm9yJykpO1xuICAgKiAyIC0gUmVhY3RpdmVUZXN0Lm9uTmV4dCgyMDAsIGZ1bmN0aW9uIChlKSB7IHJldHVybiBlLm1lc3NhZ2UgPT09ICdlcnJvcic7IH0pO1xuICAgKlxuICAgKiBAcGFyYW0gdGlja3MgUmVjb3JkZWQgdmlydHVhbCB0aW1lIHRoZSBPbkVycm9yIG5vdGlmaWNhdGlvbiBvY2N1cnMuXG4gICAqIEBwYXJhbSBleGNlcHRpb24gUmVjb3JkZWQgZXhjZXB0aW9uIHN0b3JlZCBpbiB0aGUgT25FcnJvciBub3RpZmljYXRpb24uXG4gICAqIEByZXR1cm4gUmVjb3JkZWQgT25FcnJvciBub3RpZmljYXRpb24uXG4gICAqL1xuICBvbkVycm9yOiBmdW5jdGlvbiAodGlja3MsIGVycm9yKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBlcnJvciA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICBuZXcgUmVjb3JkZWQodGlja3MsIG5ldyBPbkVycm9yUHJlZGljYXRlKGVycm9yKSkgOlxuICAgICAgbmV3IFJlY29yZGVkKHRpY2tzLCBOb3RpZmljYXRpb24uY3JlYXRlT25FcnJvcihlcnJvcikpO1xuICB9LFxuICAvKipcbiAgICogRmFjdG9yeSBtZXRob2QgZm9yIGFuIE9uQ29tcGxldGVkIG5vdGlmaWNhdGlvbiByZWNvcmQgYXQgYSBnaXZlbiB0aW1lLlxuICAgKlxuICAgKiBAcGFyYW0gdGlja3MgUmVjb3JkZWQgdmlydHVhbCB0aW1lIHRoZSBPbkNvbXBsZXRlZCBub3RpZmljYXRpb24gb2NjdXJzLlxuICAgKiBAcmV0dXJuIFJlY29yZGVkIE9uQ29tcGxldGVkIG5vdGlmaWNhdGlvbi5cbiAgICovXG4gIG9uQ29tcGxldGVkOiBmdW5jdGlvbiAodGlja3MpIHtcbiAgICByZXR1cm4gbmV3IFJlY29yZGVkKHRpY2tzLCBOb3RpZmljYXRpb24uY3JlYXRlT25Db21wbGV0ZWQoKSk7XG4gIH0sXG4gIC8qKlxuICAgKiBGYWN0b3J5IG1ldGhvZCBmb3IgYSBzdWJzY3JpcHRpb24gcmVjb3JkIGJhc2VkIG9uIGEgZ2l2ZW4gc3Vic2NyaXB0aW9uIGFuZCBkaXNwb3NhbCB0aW1lLlxuICAgKlxuICAgKiBAcGFyYW0gc3RhcnQgVmlydHVhbCB0aW1lIGluZGljYXRpbmcgd2hlbiB0aGUgc3Vic2NyaXB0aW9uIHdhcyBjcmVhdGVkLlxuICAgKiBAcGFyYW0gZW5kIFZpcnR1YWwgdGltZSBpbmRpY2F0aW5nIHdoZW4gdGhlIHN1YnNjcmlwdGlvbiB3YXMgZGlzcG9zZWQuXG4gICAqIEByZXR1cm4gU3Vic2NyaXB0aW9uIG9iamVjdC5cbiAgICovXG4gIHN1YnNjcmliZTogZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gbmV3IFN1YnNjcmlwdGlvbihzdGFydCwgZW5kKTtcbiAgfVxufTtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBvYmplY3QgcmVjb3JkaW5nIHRoZSBwcm9kdWN0aW9uIG9mIHRoZSBzcGVjaWZpZWQgdmFsdWUgYXQgdGhlIGdpdmVuIHZpcnR1YWwgdGltZS5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIFZpcnR1YWwgdGltZSB0aGUgdmFsdWUgd2FzIHByb2R1Y2VkIG9uLlxuICAgKiBAcGFyYW0ge01peGVkfSB2YWx1ZSBWYWx1ZSB0aGF0IHdhcyBwcm9kdWNlZC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY29tcGFyZXIgQW4gb3B0aW9uYWwgY29tcGFyZXIuXG4gICAqL1xuICB2YXIgUmVjb3JkZWQgPSBSeC5SZWNvcmRlZCA9IGZ1bmN0aW9uICh0aW1lLCB2YWx1ZSwgY29tcGFyZXIpIHtcbiAgICB0aGlzLnRpbWUgPSB0aW1lO1xuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB0aGlzLmNvbXBhcmVyID0gY29tcGFyZXIgfHwgZGVmYXVsdENvbXBhcmVyO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgZ2l2ZW4gcmVjb3JkZWQgb2JqZWN0IGlzIGVxdWFsIHRvIHRoZSBjdXJyZW50IGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0ge1JlY29yZGVkfSBvdGhlciBSZWNvcmRlZCBvYmplY3QgdG8gY2hlY2sgZm9yIGVxdWFsaXR5LlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gdHJ1ZSBpZiBib3RoIG9iamVjdHMgYXJlIGVxdWFsOyBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICBSZWNvcmRlZC5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgcmV0dXJuIHRoaXMudGltZSA9PT0gb3RoZXIudGltZSAmJiB0aGlzLmNvbXBhcmVyKHRoaXMudmFsdWUsIG90aGVyLnZhbHVlKTtcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgY3VycmVudCBSZWNvcmRlZCB2YWx1ZS5cbiAgICpcbiAgICogQHJldHVybnMge1N0cmluZ30gU3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjdXJyZW50IFJlY29yZGVkIHZhbHVlLlxuICAgKi9cbiAgUmVjb3JkZWQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlLnRvU3RyaW5nKCkgKyAnQCcgKyB0aGlzLnRpbWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgc3Vic2NyaXB0aW9uIG9iamVjdCB3aXRoIHRoZSBnaXZlbiB2aXJ0dWFsIHN1YnNjcmlwdGlvbiBhbmQgdW5zdWJzY3JpcHRpb24gdGltZS5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBzdWJzY3JpYmUgVmlydHVhbCB0aW1lIGF0IHdoaWNoIHRoZSBzdWJzY3JpcHRpb24gb2NjdXJyZWQuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB1bnN1YnNjcmliZSBWaXJ0dWFsIHRpbWUgYXQgd2hpY2ggdGhlIHVuc3Vic2NyaXB0aW9uIG9jY3VycmVkLlxuICAgKi9cbiAgdmFyIFN1YnNjcmlwdGlvbiA9IFJ4LlN1YnNjcmlwdGlvbiA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gICAgdGhpcy5zdWJzY3JpYmUgPSBzdGFydDtcbiAgICB0aGlzLnVuc3Vic2NyaWJlID0gZW5kIHx8IE51bWJlci5NQVhfVkFMVUU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIHRoZSBnaXZlbiBzdWJzY3JpcHRpb24gaXMgZXF1YWwgdG8gdGhlIGN1cnJlbnQgaW5zdGFuY2UuXG4gICAqIEBwYXJhbSBvdGhlciBTdWJzY3JpcHRpb24gb2JqZWN0IHRvIGNoZWNrIGZvciBlcXVhbGl0eS5cbiAgICogQHJldHVybnMge0Jvb2xlYW59IHRydWUgaWYgYm90aCBvYmplY3RzIGFyZSBlcXVhbDsgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgU3Vic2NyaXB0aW9uLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICByZXR1cm4gdGhpcy5zdWJzY3JpYmUgPT09IG90aGVyLnN1YnNjcmliZSAmJiB0aGlzLnVuc3Vic2NyaWJlID09PSBvdGhlci51bnN1YnNjcmliZTtcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgY3VycmVudCBTdWJzY3JpcHRpb24gdmFsdWUuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IFN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgY3VycmVudCBTdWJzY3JpcHRpb24gdmFsdWUuXG4gICAqL1xuICBTdWJzY3JpcHRpb24ucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAnKCcgKyB0aGlzLnN1YnNjcmliZSArICcsICcgKyAodGhpcy51bnN1YnNjcmliZSA9PT0gTnVtYmVyLk1BWF9WQUxVRSA/ICdJbmZpbml0ZScgOiB0aGlzLnVuc3Vic2NyaWJlKSArICcpJztcbiAgfTtcblxuICB2YXIgTW9ja0Rpc3Bvc2FibGUgPSBSeC5Nb2NrRGlzcG9zYWJsZSA9IGZ1bmN0aW9uIChzY2hlZHVsZXIpIHtcbiAgICB0aGlzLnNjaGVkdWxlciA9IHNjaGVkdWxlcjtcbiAgICB0aGlzLmRpc3Bvc2VzID0gW107XG4gICAgdGhpcy5kaXNwb3Nlcy5wdXNoKHRoaXMuc2NoZWR1bGVyLmNsb2NrKTtcbiAgfTtcblxuICBNb2NrRGlzcG9zYWJsZS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3Bvc2VzLnB1c2godGhpcy5zY2hlZHVsZXIuY2xvY2spO1xuICB9O1xuXG4gIHZhciBNb2NrT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKE1vY2tPYnNlcnZlciwgX19zdXBlcl9fKTtcblxuICAgIGZ1bmN0aW9uIE1vY2tPYnNlcnZlcihzY2hlZHVsZXIpIHtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgICAgdGhpcy5zY2hlZHVsZXIgPSBzY2hlZHVsZXI7XG4gICAgICB0aGlzLm1lc3NhZ2VzID0gW107XG4gICAgfVxuXG4gICAgdmFyIE1vY2tPYnNlcnZlclByb3RvdHlwZSA9IE1vY2tPYnNlcnZlci5wcm90b3R5cGU7XG5cbiAgICBNb2NrT2JzZXJ2ZXJQcm90b3R5cGUub25OZXh0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB0aGlzLm1lc3NhZ2VzLnB1c2gobmV3IFJlY29yZGVkKHRoaXMuc2NoZWR1bGVyLmNsb2NrLCBOb3RpZmljYXRpb24uY3JlYXRlT25OZXh0KHZhbHVlKSkpO1xuICAgIH07XG5cbiAgICBNb2NrT2JzZXJ2ZXJQcm90b3R5cGUub25FcnJvciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICB0aGlzLm1lc3NhZ2VzLnB1c2gobmV3IFJlY29yZGVkKHRoaXMuc2NoZWR1bGVyLmNsb2NrLCBOb3RpZmljYXRpb24uY3JlYXRlT25FcnJvcihlKSkpO1xuICAgIH07XG5cbiAgICBNb2NrT2JzZXJ2ZXJQcm90b3R5cGUub25Db21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLm1lc3NhZ2VzLnB1c2gobmV3IFJlY29yZGVkKHRoaXMuc2NoZWR1bGVyLmNsb2NrLCBOb3RpZmljYXRpb24uY3JlYXRlT25Db21wbGV0ZWQoKSkpO1xuICAgIH07XG5cbiAgICByZXR1cm4gTW9ja09ic2VydmVyO1xuICB9KShPYnNlcnZlcik7XG5cbiAgZnVuY3Rpb24gTW9ja1Byb21pc2Uoc2NoZWR1bGVyLCBtZXNzYWdlcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLnNjaGVkdWxlciA9IHNjaGVkdWxlcjtcbiAgICB0aGlzLm1lc3NhZ2VzID0gbWVzc2FnZXM7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zID0gW107XG4gICAgdGhpcy5vYnNlcnZlcnMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5tZXNzYWdlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIG1lc3NhZ2UgPSB0aGlzLm1lc3NhZ2VzW2ldLFxuICAgICAgICAgIG5vdGlmaWNhdGlvbiA9IG1lc3NhZ2UudmFsdWU7XG4gICAgICAoZnVuY3Rpb24gKGlubmVyTm90aWZpY2F0aW9uKSB7XG4gICAgICAgIHNjaGVkdWxlci5zY2hlZHVsZUFic29sdXRlKG51bGwsIG1lc3NhZ2UudGltZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBvYnMgPSBzZWxmLm9ic2VydmVycy5zbGljZSgwKTtcblxuICAgICAgICAgIGZvciAodmFyIGogPSAwLCBqTGVuID0gb2JzLmxlbmd0aDsgaiA8IGpMZW47IGorKykge1xuICAgICAgICAgICAgaW5uZXJOb3RpZmljYXRpb24uYWNjZXB0KG9ic1tqXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgICAgIH0pO1xuICAgICAgfSkobm90aWZpY2F0aW9uKTtcbiAgICB9XG4gIH1cblxuICBNb2NrUHJvbWlzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uIChvblJlc29sdmVkLCBvblJlamVjdGVkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2gobmV3IFN1YnNjcmlwdGlvbih0aGlzLnNjaGVkdWxlci5jbG9jaykpO1xuICAgIHZhciBpbmRleCA9IHRoaXMuc3Vic2NyaXB0aW9ucy5sZW5ndGggLSAxO1xuXG4gICAgdmFyIG5ld1Byb21pc2U7XG5cbiAgICB2YXIgb2JzZXJ2ZXIgPSBSeC5PYnNlcnZlci5jcmVhdGUoXG4gICAgICBmdW5jdGlvbiAoeCkge1xuICAgICAgICB2YXIgcmV0VmFsdWUgPSBvblJlc29sdmVkKHgpO1xuICAgICAgICBpZiAocmV0VmFsdWUgJiYgdHlwZW9mIHJldFZhbHVlLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBuZXdQcm9taXNlID0gcmV0VmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIHRpY2tzID0gc2VsZi5zY2hlZHVsZXIuY2xvY2s7XG4gICAgICAgICAgbmV3UHJvbWlzZSA9IG5ldyBNb2NrUHJvbWlzZShzZWxmLnNjaGVkdWxlciwgW1J4LlJlYWN0aXZlVGVzdC5vbk5leHQodGlja3MsIHVuZGVmaW5lZCksIFJ4LlJlYWN0aXZlVGVzdC5vbkNvbXBsZXRlZCh0aWNrcyldKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaWR4ID0gc2VsZi5vYnNlcnZlcnMuaW5kZXhPZihvYnNlcnZlcik7XG4gICAgICAgIHNlbGYub2JzZXJ2ZXJzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICBzZWxmLnN1YnNjcmlwdGlvbnNbaW5kZXhdID0gbmV3IFN1YnNjcmlwdGlvbihzZWxmLnN1YnNjcmlwdGlvbnNbaW5kZXhdLnN1YnNjcmliZSwgc2VsZi5zY2hlZHVsZXIuY2xvY2spO1xuICAgICAgfSxcbiAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgb25SZWplY3RlZChlcnIpO1xuICAgICAgICB2YXIgaWR4ID0gc2VsZi5vYnNlcnZlcnMuaW5kZXhPZihvYnNlcnZlcik7XG4gICAgICAgIHNlbGYub2JzZXJ2ZXJzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICBzZWxmLnN1YnNjcmlwdGlvbnNbaW5kZXhdID0gbmV3IFN1YnNjcmlwdGlvbihzZWxmLnN1YnNjcmlwdGlvbnNbaW5kZXhdLnN1YnNjcmliZSwgc2VsZi5zY2hlZHVsZXIuY2xvY2spO1xuICAgICAgfVxuICAgICk7XG4gICAgdGhpcy5vYnNlcnZlcnMucHVzaChvYnNlcnZlcik7XG5cbiAgICByZXR1cm4gbmV3UHJvbWlzZSB8fCBuZXcgTW9ja1Byb21pc2UodGhpcy5zY2hlZHVsZXIsIHRoaXMubWVzc2FnZXMpO1xuICB9O1xuXG4gIHZhciBIb3RPYnNlcnZhYmxlID0gKGZ1bmN0aW9uIChfX3N1cGVyX18pIHtcbiAgICBpbmhlcml0cyhIb3RPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuXG4gICAgZnVuY3Rpb24gSG90T2JzZXJ2YWJsZShzY2hlZHVsZXIsIG1lc3NhZ2VzKSB7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICAgIHZhciBtZXNzYWdlLCBub3RpZmljYXRpb24sIG9ic2VydmFibGUgPSB0aGlzO1xuICAgICAgdGhpcy5zY2hlZHVsZXIgPSBzY2hlZHVsZXI7XG4gICAgICB0aGlzLm1lc3NhZ2VzID0gbWVzc2FnZXM7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMgPSBbXTtcbiAgICAgIHRoaXMub2JzZXJ2ZXJzID0gW107XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5tZXNzYWdlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBtZXNzYWdlID0gdGhpcy5tZXNzYWdlc1tpXTtcbiAgICAgICAgbm90aWZpY2F0aW9uID0gbWVzc2FnZS52YWx1ZTtcbiAgICAgICAgKGZ1bmN0aW9uIChpbm5lck5vdGlmaWNhdGlvbikge1xuICAgICAgICAgIHNjaGVkdWxlci5zY2hlZHVsZUFic29sdXRlKG51bGwsIG1lc3NhZ2UudGltZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG9icyA9IG9ic2VydmFibGUub2JzZXJ2ZXJzLnNsaWNlKDApO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMCwgakxlbiA9IG9icy5sZW5ndGg7IGogPCBqTGVuOyBqKyspIHtcbiAgICAgICAgICAgICAgaW5uZXJOb3RpZmljYXRpb24uYWNjZXB0KG9ic1tqXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZGlzcG9zYWJsZUVtcHR5O1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KShub3RpZmljYXRpb24pO1xuICAgICAgfVxuICAgIH1cblxuICAgIEhvdE9ic2VydmFibGUucHJvdG90eXBlLl9zdWJzY3JpYmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgdmFyIG9ic2VydmFibGUgPSB0aGlzO1xuICAgICAgdGhpcy5vYnNlcnZlcnMucHVzaChvKTtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKG5ldyBTdWJzY3JpcHRpb24odGhpcy5zY2hlZHVsZXIuY2xvY2spKTtcbiAgICAgIHZhciBpbmRleCA9IHRoaXMuc3Vic2NyaXB0aW9ucy5sZW5ndGggLSAxO1xuICAgICAgcmV0dXJuIGRpc3Bvc2FibGVDcmVhdGUoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaWR4ID0gb2JzZXJ2YWJsZS5vYnNlcnZlcnMuaW5kZXhPZihvKTtcbiAgICAgICAgb2JzZXJ2YWJsZS5vYnNlcnZlcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIG9ic2VydmFibGUuc3Vic2NyaXB0aW9uc1tpbmRleF0gPSBuZXcgU3Vic2NyaXB0aW9uKG9ic2VydmFibGUuc3Vic2NyaXB0aW9uc1tpbmRleF0uc3Vic2NyaWJlLCBvYnNlcnZhYmxlLnNjaGVkdWxlci5jbG9jayk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEhvdE9ic2VydmFibGU7XG4gIH0pKE9ic2VydmFibGUpO1xuXG4gIHZhciBDb2xkT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoQ29sZE9ic2VydmFibGUsIF9fc3VwZXJfXyk7XG5cbiAgICBmdW5jdGlvbiBDb2xkT2JzZXJ2YWJsZShzY2hlZHVsZXIsIG1lc3NhZ2VzKSB7XG4gICAgICBfX3N1cGVyX18uY2FsbCh0aGlzKTtcbiAgICAgIHRoaXMuc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICAgICAgdGhpcy5tZXNzYWdlcyA9IG1lc3NhZ2VzO1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb25zID0gW107XG4gICAgfVxuXG4gICAgQ29sZE9ic2VydmFibGUucHJvdG90eXBlLl9zdWJzY3JpYmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgdmFyIG1lc3NhZ2UsIG5vdGlmaWNhdGlvbiwgb2JzZXJ2YWJsZSA9IHRoaXM7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaChuZXcgU3Vic2NyaXB0aW9uKHRoaXMuc2NoZWR1bGVyLmNsb2NrKSk7XG4gICAgICB2YXIgaW5kZXggPSB0aGlzLnN1YnNjcmlwdGlvbnMubGVuZ3RoIC0gMTtcbiAgICAgIHZhciBkID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLm1lc3NhZ2VzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIG1lc3NhZ2UgPSB0aGlzLm1lc3NhZ2VzW2ldO1xuICAgICAgICBub3RpZmljYXRpb24gPSBtZXNzYWdlLnZhbHVlO1xuICAgICAgICAoZnVuY3Rpb24gKGlubmVyTm90aWZpY2F0aW9uKSB7XG4gICAgICAgICAgZC5hZGQob2JzZXJ2YWJsZS5zY2hlZHVsZXIuc2NoZWR1bGVSZWxhdGl2ZShudWxsLCBtZXNzYWdlLnRpbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlubmVyTm90aWZpY2F0aW9uLmFjY2VwdChvKTtcbiAgICAgICAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9KShub3RpZmljYXRpb24pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRpc3Bvc2FibGVDcmVhdGUoZnVuY3Rpb24gKCkge1xuICAgICAgICBvYnNlcnZhYmxlLnN1YnNjcmlwdGlvbnNbaW5kZXhdID0gbmV3IFN1YnNjcmlwdGlvbihvYnNlcnZhYmxlLnN1YnNjcmlwdGlvbnNbaW5kZXhdLnN1YnNjcmliZSwgb2JzZXJ2YWJsZS5zY2hlZHVsZXIuY2xvY2spO1xuICAgICAgICBkLmRpc3Bvc2UoKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gQ29sZE9ic2VydmFibGU7XG4gIH0pKE9ic2VydmFibGUpO1xuXG4gIC8qKiBWaXJ0dWFsIHRpbWUgc2NoZWR1bGVyIHVzZWQgZm9yIHRlc3RpbmcgYXBwbGljYXRpb25zIGFuZCBsaWJyYXJpZXMgYnVpbHQgdXNpbmcgUmVhY3RpdmUgRXh0ZW5zaW9ucy4gKi9cbiAgUnguVGVzdFNjaGVkdWxlciA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoVGVzdFNjaGVkdWxlciwgX19zdXBlcl9fKTtcblxuICAgIGZ1bmN0aW9uIGJhc2VDb21wYXJlcih4LCB5KSB7XG4gICAgICByZXR1cm4geCA+IHkgPyAxIDogKHggPCB5ID8gLTEgOiAwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBUZXN0U2NoZWR1bGVyKCkge1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcywgMCwgYmFzZUNvbXBhcmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTY2hlZHVsZXMgYW4gYWN0aW9uIHRvIGJlIGV4ZWN1dGVkIGF0IHRoZSBzcGVjaWZpZWQgdmlydHVhbCB0aW1lLlxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXRlIFN0YXRlIHBhc3NlZCB0byB0aGUgYWN0aW9uIHRvIGJlIGV4ZWN1dGVkLlxuICAgICAqIEBwYXJhbSBkdWVUaW1lIEFic29sdXRlIHZpcnR1YWwgdGltZSBhdCB3aGljaCB0byBleGVjdXRlIHRoZSBhY3Rpb24uXG4gICAgICogQHBhcmFtIGFjdGlvbiBBY3Rpb24gdG8gYmUgZXhlY3V0ZWQuXG4gICAgICogQHJldHVybiBEaXNwb3NhYmxlIG9iamVjdCB1c2VkIHRvIGNhbmNlbCB0aGUgc2NoZWR1bGVkIGFjdGlvbiAoYmVzdCBlZmZvcnQpLlxuICAgICAqL1xuICAgIFRlc3RTY2hlZHVsZXIucHJvdG90eXBlLnNjaGVkdWxlQWJzb2x1dGUgPSBmdW5jdGlvbiAoc3RhdGUsIGR1ZVRpbWUsIGFjdGlvbikge1xuICAgICAgZHVlVGltZSA8PSB0aGlzLmNsb2NrICYmIChkdWVUaW1lID0gdGhpcy5jbG9jayArIDEpO1xuICAgICAgcmV0dXJuIF9fc3VwZXJfXy5wcm90b3R5cGUuc2NoZWR1bGVBYnNvbHV0ZS5jYWxsKHRoaXMsIHN0YXRlLCBkdWVUaW1lLCBhY3Rpb24pO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQWRkcyBhIHJlbGF0aXZlIHZpcnR1YWwgdGltZSB0byBhbiBhYnNvbHV0ZSB2aXJ0dWFsIHRpbWUgdmFsdWUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYWJzb2x1dGUgQWJzb2x1dGUgdmlydHVhbCB0aW1lIHZhbHVlLlxuICAgICAqIEBwYXJhbSByZWxhdGl2ZSBSZWxhdGl2ZSB2aXJ0dWFsIHRpbWUgdmFsdWUgdG8gYWRkLlxuICAgICAqIEByZXR1cm4gUmVzdWx0aW5nIGFic29sdXRlIHZpcnR1YWwgdGltZSBzdW0gdmFsdWUuXG4gICAgICovXG4gICAgVGVzdFNjaGVkdWxlci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKGFic29sdXRlLCByZWxhdGl2ZSkge1xuICAgICAgcmV0dXJuIGFic29sdXRlICsgcmVsYXRpdmU7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0aGUgYWJzb2x1dGUgdmlydHVhbCB0aW1lIHZhbHVlIHRvIGEgRGF0ZVRpbWVPZmZzZXQgdmFsdWUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYWJzb2x1dGUgQWJzb2x1dGUgdmlydHVhbCB0aW1lIHZhbHVlIHRvIGNvbnZlcnQuXG4gICAgICogQHJldHVybiBDb3JyZXNwb25kaW5nIERhdGVUaW1lT2Zmc2V0IHZhbHVlLlxuICAgICAqL1xuICAgIFRlc3RTY2hlZHVsZXIucHJvdG90eXBlLnRvQWJzb2x1dGVUaW1lID0gZnVuY3Rpb24gKGFic29sdXRlKSB7XG4gICAgICByZXR1cm4gbmV3IERhdGUoYWJzb2x1dGUpLmdldFRpbWUoKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRoZSBUaW1lU3BhbiB2YWx1ZSB0byBhIHJlbGF0aXZlIHZpcnR1YWwgdGltZSB2YWx1ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0aW1lU3BhbiBUaW1lU3BhbiB2YWx1ZSB0byBjb252ZXJ0LlxuICAgICAqIEByZXR1cm4gQ29ycmVzcG9uZGluZyByZWxhdGl2ZSB2aXJ0dWFsIHRpbWUgdmFsdWUuXG4gICAgICovXG4gICAgVGVzdFNjaGVkdWxlci5wcm90b3R5cGUudG9SZWxhdGl2ZVRpbWUgPSBmdW5jdGlvbiAodGltZVNwYW4pIHtcbiAgICAgIHJldHVybiB0aW1lU3BhbjtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFN0YXJ0cyB0aGUgdGVzdCBzY2hlZHVsZXIgYW5kIHVzZXMgdGhlIHNwZWNpZmllZCB2aXJ0dWFsIHRpbWVzIHRvIGludm9rZSB0aGUgZmFjdG9yeSBmdW5jdGlvbiwgc3Vic2NyaWJlIHRvIHRoZSByZXN1bHRpbmcgc2VxdWVuY2UsIGFuZCBkaXNwb3NlIHRoZSBzdWJzY3JpcHRpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY3JlYXRlIEZhY3RvcnkgbWV0aG9kIHRvIGNyZWF0ZSBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgICAqIEBwYXJhbSBjcmVhdGVkIFZpcnR1YWwgdGltZSBhdCB3aGljaCB0byBpbnZva2UgdGhlIGZhY3RvcnkgdG8gY3JlYXRlIGFuIG9ic2VydmFibGUgc2VxdWVuY2UuXG4gICAgICogQHBhcmFtIHN1YnNjcmliZWQgVmlydHVhbCB0aW1lIGF0IHdoaWNoIHRvIHN1YnNjcmliZSB0byB0aGUgY3JlYXRlZCBvYnNlcnZhYmxlIHNlcXVlbmNlLlxuICAgICAqIEBwYXJhbSBkaXNwb3NlZCBWaXJ0dWFsIHRpbWUgYXQgd2hpY2ggdG8gZGlzcG9zZSB0aGUgc3Vic2NyaXB0aW9uLlxuICAgICAqIEByZXR1cm4gT2JzZXJ2ZXIgd2l0aCB0aW1lc3RhbXBlZCByZWNvcmRpbmdzIG9mIG5vdGlmaWNhdGlvbiBtZXNzYWdlcyB0aGF0IHdlcmUgcmVjZWl2ZWQgZHVyaW5nIHRoZSB2aXJ0dWFsIHRpbWUgd2luZG93IHdoZW4gdGhlIHN1YnNjcmlwdGlvbiB0byB0aGUgc291cmNlIHNlcXVlbmNlIHdhcyBhY3RpdmUuXG4gICAgICovXG4gICAgVGVzdFNjaGVkdWxlci5wcm90b3R5cGUuc3RhcnRTY2hlZHVsZXIgPSBmdW5jdGlvbiAoY3JlYXRlRm4sIHNldHRpbmdzKSB7XG4gICAgICBzZXR0aW5ncyB8fCAoc2V0dGluZ3MgPSB7fSk7XG4gICAgICBzZXR0aW5ncy5jcmVhdGVkID09IG51bGwgJiYgKHNldHRpbmdzLmNyZWF0ZWQgPSBSZWFjdGl2ZVRlc3QuY3JlYXRlZCk7XG4gICAgICBzZXR0aW5ncy5zdWJzY3JpYmVkID09IG51bGwgJiYgKHNldHRpbmdzLnN1YnNjcmliZWQgPSBSZWFjdGl2ZVRlc3Quc3Vic2NyaWJlZCk7XG4gICAgICBzZXR0aW5ncy5kaXNwb3NlZCA9PSBudWxsICYmIChzZXR0aW5ncy5kaXNwb3NlZCA9IFJlYWN0aXZlVGVzdC5kaXNwb3NlZCk7XG5cbiAgICAgIHZhciBvYnNlcnZlciA9IHRoaXMuY3JlYXRlT2JzZXJ2ZXIoKSwgc291cmNlLCBzdWJzY3JpcHRpb247XG5cbiAgICAgIHRoaXMuc2NoZWR1bGVBYnNvbHV0ZShudWxsLCBzZXR0aW5ncy5jcmVhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNvdXJjZSA9IGNyZWF0ZUZuKCk7XG4gICAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zY2hlZHVsZUFic29sdXRlKG51bGwsIHNldHRpbmdzLnN1YnNjcmliZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc3Vic2NyaXB0aW9uID0gc291cmNlLnN1YnNjcmliZShvYnNlcnZlcik7XG4gICAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zY2hlZHVsZUFic29sdXRlKG51bGwsIHNldHRpbmdzLmRpc3Bvc2VkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgIHJldHVybiBkaXNwb3NhYmxlRW1wdHk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zdGFydCgpO1xuXG4gICAgICByZXR1cm4gb2JzZXJ2ZXI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBob3Qgb2JzZXJ2YWJsZSB1c2luZyB0aGUgc3BlY2lmaWVkIHRpbWVzdGFtcGVkIG5vdGlmaWNhdGlvbiBtZXNzYWdlcyBlaXRoZXIgYXMgYW4gYXJyYXkgb3IgYXJndW1lbnRzLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlcyBOb3RpZmljYXRpb25zIHRvIHN1cmZhY2UgdGhyb3VnaCB0aGUgY3JlYXRlZCBzZXF1ZW5jZSBhdCB0aGVpciBzcGVjaWZpZWQgYWJzb2x1dGUgdmlydHVhbCB0aW1lcy5cbiAgICAgKiBAcmV0dXJuIEhvdCBvYnNlcnZhYmxlIHNlcXVlbmNlIHRoYXQgY2FuIGJlIHVzZWQgdG8gYXNzZXJ0IHRoZSB0aW1pbmcgb2Ygc3Vic2NyaXB0aW9ucyBhbmQgbm90aWZpY2F0aW9ucy5cbiAgICAgKi9cbiAgICBUZXN0U2NoZWR1bGVyLnByb3RvdHlwZS5jcmVhdGVIb3RPYnNlcnZhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3M7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgIGFyZ3MgPSBhcmd1bWVudHNbMF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbik7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHsgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTsgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBIb3RPYnNlcnZhYmxlKHRoaXMsIGFyZ3MpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgY29sZCBvYnNlcnZhYmxlIHVzaW5nIHRoZSBzcGVjaWZpZWQgdGltZXN0YW1wZWQgbm90aWZpY2F0aW9uIG1lc3NhZ2VzIGVpdGhlciBhcyBhbiBhcnJheSBvciBhcmd1bWVudHMuXG4gICAgICogQHBhcmFtIG1lc3NhZ2VzIE5vdGlmaWNhdGlvbnMgdG8gc3VyZmFjZSB0aHJvdWdoIHRoZSBjcmVhdGVkIHNlcXVlbmNlIGF0IHRoZWlyIHNwZWNpZmllZCB2aXJ0dWFsIHRpbWUgb2Zmc2V0cyBmcm9tIHRoZSBzZXF1ZW5jZSBzdWJzY3JpcHRpb24gdGltZS5cbiAgICAgKiBAcmV0dXJuIENvbGQgb2JzZXJ2YWJsZSBzZXF1ZW5jZSB0aGF0IGNhbiBiZSB1c2VkIHRvIGFzc2VydCB0aGUgdGltaW5nIG9mIHN1YnNjcmlwdGlvbnMgYW5kIG5vdGlmaWNhdGlvbnMuXG4gICAgICovXG4gICAgVGVzdFNjaGVkdWxlci5wcm90b3R5cGUuY3JlYXRlQ29sZE9ic2VydmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncztcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGFyZ3VtZW50c1swXSkpIHtcbiAgICAgICAgYXJncyA9IGFyZ3VtZW50c1swXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykgeyBhcmdzW2ldID0gYXJndW1lbnRzW2ldOyB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IENvbGRPYnNlcnZhYmxlKHRoaXMsIGFyZ3MpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgcmVzb2x2ZWQgcHJvbWlzZSB3aXRoIHRoZSBnaXZlbiB2YWx1ZSBhbmQgdGlja3NcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdGlja3MgVGhlIGFic29sdXRlIHRpbWUgb2YgdGhlIHJlc29sdXRpb24uXG4gICAgICogQHBhcmFtIHtBbnl9IHZhbHVlIFRoZSB2YWx1ZSB0byB5aWVsZCBhdCB0aGUgZ2l2ZW4gdGljay5cbiAgICAgKiBAcmV0dXJucyB7TW9ja1Byb21pc2V9IEEgbW9jayBQcm9taXNlIHdoaWNoIGZ1bGZpbGxzIHdpdGggdGhlIGdpdmVuIHZhbHVlLlxuICAgICAqL1xuICAgIFRlc3RTY2hlZHVsZXIucHJvdG90eXBlLmNyZWF0ZVJlc29sdmVkUHJvbWlzZSA9IGZ1bmN0aW9uICh0aWNrcywgdmFsdWUpIHtcbiAgICAgIHJldHVybiBuZXcgTW9ja1Byb21pc2UodGhpcywgW1J4LlJlYWN0aXZlVGVzdC5vbk5leHQodGlja3MsIHZhbHVlKSwgUnguUmVhY3RpdmVUZXN0Lm9uQ29tcGxldGVkKHRpY2tzKV0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgcmVqZWN0ZWQgcHJvbWlzZSB3aXRoIHRoZSBnaXZlbiByZWFzb24gYW5kIHRpY2tzXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHRpY2tzIFRoZSBhYnNvbHV0ZSB0aW1lIG9mIHRoZSByZXNvbHV0aW9uLlxuICAgICAqIEBwYXJhbSB7QW55fSByZWFzb24gVGhlIHJlYXNvbiBmb3IgcmVqZWN0aW9uIHRvIHlpZWxkIGF0IHRoZSBnaXZlbiB0aWNrLlxuICAgICAqIEByZXR1cm5zIHtNb2NrUHJvbWlzZX0gQSBtb2NrIFByb21pc2Ugd2hpY2ggcmVqZWN0cyB3aXRoIHRoZSBnaXZlbiByZWFzb24uXG4gICAgICovXG4gICAgVGVzdFNjaGVkdWxlci5wcm90b3R5cGUuY3JlYXRlUmVqZWN0ZWRQcm9taXNlID0gZnVuY3Rpb24gKHRpY2tzLCByZWFzb24pIHtcbiAgICAgIHJldHVybiBuZXcgTW9ja1Byb21pc2UodGhpcywgW1J4LlJlYWN0aXZlVGVzdC5vbkVycm9yKHRpY2tzLCByZWFzb24pXSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gb2JzZXJ2ZXIgdGhhdCByZWNvcmRzIHJlY2VpdmVkIG5vdGlmaWNhdGlvbiBtZXNzYWdlcyBhbmQgdGltZXN0YW1wcyB0aG9zZS5cbiAgICAgKiBAcmV0dXJuIE9ic2VydmVyIHRoYXQgY2FuIGJlIHVzZWQgdG8gYXNzZXJ0IHRoZSB0aW1pbmcgb2YgcmVjZWl2ZWQgbm90aWZpY2F0aW9ucy5cbiAgICAgKi9cbiAgICBUZXN0U2NoZWR1bGVyLnByb3RvdHlwZS5jcmVhdGVPYnNlcnZlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuZXcgTW9ja09ic2VydmVyKHRoaXMpO1xuICAgIH07XG5cbiAgICByZXR1cm4gVGVzdFNjaGVkdWxlcjtcbiAgfSkoVmlydHVhbFRpbWVTY2hlZHVsZXIpO1xuXG4gIHJldHVybiBSeDtcbn0pKTtcbiJdfQ==