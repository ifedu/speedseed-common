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
    var Observable = Rx.Observable, ObservableBase = Rx.ObservableBase, AbstractObserver = Rx.internals.AbstractObserver, CompositeDisposable = Rx.CompositeDisposable, BinaryDisposable = Rx.BinaryDisposable, RefCountDisposable = Rx.RefCountDisposable, SingleAssignmentDisposable = Rx.SingleAssignmentDisposable, SerialDisposable = Rx.SerialDisposable, Subject = Rx.Subject, observableProto = Observable.prototype, observableEmpty = Observable.empty, observableNever = Observable.never, AnonymousObservable = Rx.AnonymousObservable, addRef = Rx.internals.addRef, inherits = Rx.internals.inherits, bindCallback = Rx.internals.bindCallback, noop = Rx.helpers.noop, isPromise = Rx.helpers.isPromise, isFunction = Rx.helpers.isFunction, observableFromPromise = Observable.fromPromise;
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
    var Map = root.Map || (function () {
        function Map() {
            this.size = 0;
            this._values = [];
            this._keys = [];
        }
        Map.prototype['delete'] = function (key) {
            var i = this._keys.indexOf(key);
            if (i === -1) {
                return false;
            }
            this._values.splice(i, 1);
            this._keys.splice(i, 1);
            this.size--;
            return true;
        };
        Map.prototype.get = function (key) {
            var i = this._keys.indexOf(key);
            return i === -1 ? undefined : this._values[i];
        };
        Map.prototype.set = function (key, value) {
            var i = this._keys.indexOf(key);
            if (i === -1) {
                this._keys.push(key);
                this._values.push(value);
                this.size++;
            }
            else {
                this._values[i] = value;
            }
            return this;
        };
        Map.prototype.forEach = function (cb, thisArg) {
            for (var i = 0; i < this.size; i++) {
                cb.call(thisArg, this._values[i], this._keys[i]);
            }
        };
        return Map;
    }());
    /**
     *  Correlates the elements of two sequences based on overlapping durations.
     *
     *  @param {Observable} right The right observable sequence to join elements for.
     *  @param {Function} leftDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the left observable sequence, used to determine overlap.
     *  @param {Function} rightDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the right observable sequence, used to determine overlap.
     *  @param {Function} resultSelector A function invoked to compute a result element for any two overlapping elements of the left and right observable sequences. The parameters passed to the function correspond with the elements from the left and right source sequences for which overlap occurs.
     *  @returns {Observable} An observable sequence that contains result elements computed from source elements that have an overlapping duration.
     */
    observableProto.join = function (right, leftDurationSelector, rightDurationSelector, resultSelector) {
        var left = this;
        return new AnonymousObservable(function (o) {
            var group = new CompositeDisposable();
            var leftDone = false, rightDone = false;
            var leftId = 0, rightId = 0;
            var leftMap = new Map(), rightMap = new Map();
            var handleError = function (e) { o.onError(e); };
            group.add(left.subscribe(function (value) {
                var id = leftId++, md = new SingleAssignmentDisposable();
                leftMap.set(id, value);
                group.add(md);
                var duration = tryCatch(leftDurationSelector)(value);
                if (duration === errorObj) {
                    return o.onError(duration.e);
                }
                md.setDisposable(duration.take(1).subscribe(noop, handleError, function () {
                    leftMap['delete'](id) && leftMap.size === 0 && leftDone && o.onCompleted();
                    group.remove(md);
                }));
                rightMap.forEach(function (v) {
                    var result = tryCatch(resultSelector)(value, v);
                    if (result === errorObj) {
                        return o.onError(result.e);
                    }
                    o.onNext(result);
                });
            }, handleError, function () {
                leftDone = true;
                (rightDone || leftMap.size === 0) && o.onCompleted();
            }));
            group.add(right.subscribe(function (value) {
                var id = rightId++, md = new SingleAssignmentDisposable();
                rightMap.set(id, value);
                group.add(md);
                var duration = tryCatch(rightDurationSelector)(value);
                if (duration === errorObj) {
                    return o.onError(duration.e);
                }
                md.setDisposable(duration.take(1).subscribe(noop, handleError, function () {
                    rightMap['delete'](id) && rightMap.size === 0 && rightDone && o.onCompleted();
                    group.remove(md);
                }));
                leftMap.forEach(function (v) {
                    var result = tryCatch(resultSelector)(v, value);
                    if (result === errorObj) {
                        return o.onError(result.e);
                    }
                    o.onNext(result);
                });
            }, handleError, function () {
                rightDone = true;
                (leftDone || rightMap.size === 0) && o.onCompleted();
            }));
            return group;
        }, left);
    };
    /**
     *  Correlates the elements of two sequences based on overlapping durations, and groups the results.
     *
     *  @param {Observable} right The right observable sequence to join elements for.
     *  @param {Function} leftDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the left observable sequence, used to determine overlap.
     *  @param {Function} rightDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the right observable sequence, used to determine overlap.
     *  @param {Function} resultSelector A function invoked to compute a result element for any element of the left sequence with overlapping elements from the right observable sequence. The first parameter passed to the function is an element of the left sequence. The second parameter passed to the function is an observable sequence with elements from the right sequence that overlap with the left sequence's element.
     *  @returns {Observable} An observable sequence that contains result elements computed from source elements that have an overlapping duration.
     */
    observableProto.groupJoin = function (right, leftDurationSelector, rightDurationSelector, resultSelector) {
        var left = this;
        return new AnonymousObservable(function (o) {
            var group = new CompositeDisposable();
            var r = new RefCountDisposable(group);
            var leftMap = new Map(), rightMap = new Map();
            var leftId = 0, rightId = 0;
            var handleError = function (e) { return function (v) { v.onError(e); }; };
            function handleError(e) { }
            ;
            group.add(left.subscribe(function (value) {
                var s = new Subject();
                var id = leftId++;
                leftMap.set(id, s);
                var result = tryCatch(resultSelector)(value, addRef(s, r));
                if (result === errorObj) {
                    leftMap.forEach(handleError(result.e));
                    return o.onError(result.e);
                }
                o.onNext(result);
                rightMap.forEach(function (v) { s.onNext(v); });
                var md = new SingleAssignmentDisposable();
                group.add(md);
                var duration = tryCatch(leftDurationSelector)(value);
                if (duration === errorObj) {
                    leftMap.forEach(handleError(duration.e));
                    return o.onError(duration.e);
                }
                md.setDisposable(duration.take(1).subscribe(noop, function (e) {
                    leftMap.forEach(handleError(e));
                    o.onError(e);
                }, function () {
                    leftMap['delete'](id) && s.onCompleted();
                    group.remove(md);
                }));
            }, function (e) {
                leftMap.forEach(handleError(e));
                o.onError(e);
            }, function () { o.onCompleted(); }));
            group.add(right.subscribe(function (value) {
                var id = rightId++;
                rightMap.set(id, value);
                var md = new SingleAssignmentDisposable();
                group.add(md);
                var duration = tryCatch(rightDurationSelector)(value);
                if (duration === errorObj) {
                    leftMap.forEach(handleError(duration.e));
                    return o.onError(duration.e);
                }
                md.setDisposable(duration.take(1).subscribe(noop, function (e) {
                    leftMap.forEach(handleError(e));
                    o.onError(e);
                }, function () {
                    rightMap['delete'](id);
                    group.remove(md);
                }));
                leftMap.forEach(function (v) { v.onNext(value); });
            }, function (e) {
                leftMap.forEach(handleError(e));
                o.onError(e);
            }));
            return r;
        }, left);
    };
    function toArray(x) { return x.toArray(); }
    /**
     *  Projects each element of an observable sequence into zero or more buffers.
     *  @param {Mixed} bufferOpeningsOrClosingSelector Observable sequence whose elements denote the creation of new windows, or, a function invoked to define the boundaries of the produced windows (a new window is started when the previous one is closed, resulting in non-overlapping windows).
     *  @param {Function} [bufferClosingSelector] A function invoked to define the closing of each produced window. If a closing selector function is specified for the first parameter, this parameter is ignored.
     *  @returns {Observable} An observable sequence of windows.
     */
    observableProto.buffer = function () {
        return this.window.apply(this, arguments)
            .flatMap(toArray);
    };
    /**
     *  Projects each element of an observable sequence into zero or more windows.
     *
     *  @param {Mixed} windowOpeningsOrClosingSelector Observable sequence whose elements denote the creation of new windows, or, a function invoked to define the boundaries of the produced windows (a new window is started when the previous one is closed, resulting in non-overlapping windows).
     *  @param {Function} [windowClosingSelector] A function invoked to define the closing of each produced window. If a closing selector function is specified for the first parameter, this parameter is ignored.
     *  @returns {Observable} An observable sequence of windows.
     */
    observableProto.window = function (windowOpeningsOrClosingSelector, windowClosingSelector) {
        if (arguments.length === 1 && typeof arguments[0] !== 'function') {
            return observableWindowWithBoundaries.call(this, windowOpeningsOrClosingSelector);
        }
        return typeof windowOpeningsOrClosingSelector === 'function' ?
            observableWindowWithClosingSelector.call(this, windowOpeningsOrClosingSelector) :
            observableWindowWithOpenings.call(this, windowOpeningsOrClosingSelector, windowClosingSelector);
    };
    function observableWindowWithOpenings(windowOpenings, windowClosingSelector) {
        return windowOpenings.groupJoin(this, windowClosingSelector, observableEmpty, function (_, win) {
            return win;
        });
    }
    function observableWindowWithBoundaries(windowBoundaries) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var win = new Subject(), d = new CompositeDisposable(), r = new RefCountDisposable(d);
            observer.onNext(addRef(win, r));
            d.add(source.subscribe(function (x) {
                win.onNext(x);
            }, function (err) {
                win.onError(err);
                observer.onError(err);
            }, function () {
                win.onCompleted();
                observer.onCompleted();
            }));
            isPromise(windowBoundaries) && (windowBoundaries = observableFromPromise(windowBoundaries));
            d.add(windowBoundaries.subscribe(function (w) {
                win.onCompleted();
                win = new Subject();
                observer.onNext(addRef(win, r));
            }, function (err) {
                win.onError(err);
                observer.onError(err);
            }, function () {
                win.onCompleted();
                observer.onCompleted();
            }));
            return r;
        }, source);
    }
    function observableWindowWithClosingSelector(windowClosingSelector) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var m = new SerialDisposable(), d = new CompositeDisposable(m), r = new RefCountDisposable(d), win = new Subject();
            observer.onNext(addRef(win, r));
            d.add(source.subscribe(function (x) {
                win.onNext(x);
            }, function (err) {
                win.onError(err);
                observer.onError(err);
            }, function () {
                win.onCompleted();
                observer.onCompleted();
            }));
            function createWindowClose() {
                var windowClose;
                try {
                    windowClose = windowClosingSelector();
                }
                catch (e) {
                    observer.onError(e);
                    return;
                }
                isPromise(windowClose) && (windowClose = observableFromPromise(windowClose));
                var m1 = new SingleAssignmentDisposable();
                m.setDisposable(m1);
                m1.setDisposable(windowClose.take(1).subscribe(noop, function (err) {
                    win.onError(err);
                    observer.onError(err);
                }, function () {
                    win.onCompleted();
                    win = new Subject();
                    observer.onNext(addRef(win, r));
                    createWindowClose();
                }));
            }
            createWindowClose();
            return r;
        }, source);
    }
    var PairwiseObservable = (function (__super__) {
        inherits(PairwiseObservable, __super__);
        function PairwiseObservable(source) {
            this.source = source;
            __super__.call(this);
        }
        PairwiseObservable.prototype.subscribeCore = function (o) {
            return this.source.subscribe(new PairwiseObserver(o));
        };
        return PairwiseObservable;
    }(ObservableBase));
    var PairwiseObserver = (function (__super__) {
        inherits(PairwiseObserver, __super__);
        function PairwiseObserver(o) {
            this._o = o;
            this._p = null;
            this._hp = false;
            __super__.call(this);
        }
        PairwiseObserver.prototype.next = function (x) {
            if (this._hp) {
                this._o.onNext([this._p, x]);
            }
            else {
                this._hp = true;
            }
            this._p = x;
        };
        PairwiseObserver.prototype.error = function (err) { this._o.onError(err); };
        PairwiseObserver.prototype.completed = function () { this._o.onCompleted(); };
        return PairwiseObserver;
    }(AbstractObserver));
    /**
     * Returns a new observable that triggers on the second and subsequent triggerings of the input observable.
     * The Nth triggering of the input observable passes the arguments from the N-1th and Nth triggering as a pair.
     * The argument passed to the N-1th triggering is held in hidden internal state until the Nth triggering occurs.
     * @returns {Observable} An observable that triggers on successive pairs of observations from the input observable as an array.
     */
    observableProto.pairwise = function () {
        return new PairwiseObservable(this);
    };
    /**
     * Returns two observables which partition the observations of the source by the given function.
     * The first will trigger observations for those values for which the predicate returns true.
     * The second will trigger observations for those values where the predicate returns false.
     * The predicate is executed once for each subscribed observer.
     * Both also propagate all error observations arising from the source and each completes
     * when the source completes.
     * @param {Function} predicate
     *    The function to determine which output Observable will trigger a particular observation.
     * @returns {Array}
     *    An array of observables. The first triggers when the predicate returns true,
     *    and the second triggers when the predicate returns false.
    */
    observableProto.partition = function (predicate, thisArg) {
        var fn = bindCallback(predicate, thisArg, 3);
        return [
            this.filter(predicate, thisArg),
            this.filter(function (x, i, o) { return !fn(x, i, o); })
        ];
    };
    /**
     *  Groups the elements of an observable sequence according to a specified key selector function and comparer and selects the resulting elements by using a specified function.
     *
     * @example
     *  var res = observable.groupBy(function (x) { return x.id; });
     *  2 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; });
     *  3 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; }, function (x) { return x.toString(); });
     * @param {Function} keySelector A function to extract the key for each element.
     * @param {Function} [elementSelector]  A function to map each source element to an element in an observable group.
     * @returns {Observable} A sequence of observable groups, each of which corresponds to a unique key value, containing all elements that share that same key value.
     */
    observableProto.groupBy = function (keySelector, elementSelector) {
        return this.groupByUntil(keySelector, elementSelector, observableNever);
    };
    /**
     *  Groups the elements of an observable sequence according to a specified key selector function.
     *  A duration selector function is used to control the lifetime of groups. When a group expires, it receives an OnCompleted notification. When a new element with the same
     *  key value as a reclaimed group occurs, the group will be reborn with a new lifetime request.
     *
     * @example
     *  var res = observable.groupByUntil(function (x) { return x.id; }, null,  function () { return Rx.Observable.never(); });
     *  2 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; },  function () { return Rx.Observable.never(); });
     *  3 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; },  function () { return Rx.Observable.never(); }, function (x) { return x.toString(); });
     * @param {Function} keySelector A function to extract the key for each element.
     * @param {Function} durationSelector A function to signal the expiration of a group.
     * @returns {Observable}
     *  A sequence of observable groups, each of which corresponds to a unique key value, containing all elements that share that same key value.
     *  If a group's lifetime expires, a new group with the same key value can be created once an element with such a key value is encoutered.
     *
     */
    observableProto.groupByUntil = function (keySelector, elementSelector, durationSelector) {
        var source = this;
        return new AnonymousObservable(function (o) {
            var map = new Map(), groupDisposable = new CompositeDisposable(), refCountDisposable = new RefCountDisposable(groupDisposable), handleError = function (e) { return function (item) { item.onError(e); }; };
            groupDisposable.add(source.subscribe(function (x) {
                var key = tryCatch(keySelector)(x);
                if (key === errorObj) {
                    map.forEach(handleError(key.e));
                    return o.onError(key.e);
                }
                var fireNewMapEntry = false, writer = map.get(key);
                if (writer === undefined) {
                    writer = new Subject();
                    map.set(key, writer);
                    fireNewMapEntry = true;
                }
                if (fireNewMapEntry) {
                    var group = new GroupedObservable(key, writer, refCountDisposable), durationGroup = new GroupedObservable(key, writer);
                    var duration = tryCatch(durationSelector)(durationGroup);
                    if (duration === errorObj) {
                        map.forEach(handleError(duration.e));
                        return o.onError(duration.e);
                    }
                    o.onNext(group);
                    var md = new SingleAssignmentDisposable();
                    groupDisposable.add(md);
                    md.setDisposable(duration.take(1).subscribe(noop, function (e) {
                        map.forEach(handleError(e));
                        o.onError(e);
                    }, function () {
                        if (map['delete'](key)) {
                            writer.onCompleted();
                        }
                        groupDisposable.remove(md);
                    }));
                }
                var element = x;
                if (isFunction(elementSelector)) {
                    element = tryCatch(elementSelector)(x);
                    if (element === errorObj) {
                        map.forEach(handleError(element.e));
                        return o.onError(element.e);
                    }
                }
                writer.onNext(element);
            }, function (e) {
                map.forEach(handleError(e));
                o.onError(e);
            }, function () {
                map.forEach(function (item) { item.onCompleted(); });
                o.onCompleted();
            }));
            return refCountDisposable;
        }, source);
    };
    var UnderlyingObservable = (function (__super__) {
        inherits(UnderlyingObservable, __super__);
        function UnderlyingObservable(m, u) {
            this._m = m;
            this._u = u;
            __super__.call(this);
        }
        UnderlyingObservable.prototype.subscribeCore = function (o) {
            return new BinaryDisposable(this._m.getDisposable(), this._u.subscribe(o));
        };
        return UnderlyingObservable;
    }(ObservableBase));
    var GroupedObservable = (function (__super__) {
        inherits(GroupedObservable, __super__);
        function GroupedObservable(key, underlyingObservable, mergedDisposable) {
            __super__.call(this);
            this.key = key;
            this.underlyingObservable = !mergedDisposable ?
                underlyingObservable :
                new UnderlyingObservable(mergedDisposable, underlyingObservable);
        }
        GroupedObservable.prototype._subscribe = function (o) {
            return this.underlyingObservable.subscribe(o);
        };
        return GroupedObservable;
    }(Observable));
    return Rx;
}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccnguY29pbmNpZGVuY2UuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xccnhcXGRpc3RcXHJ4LmNvaW5jaWRlbmNlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDZHQUE2RztBQUU3RyxDQUFDO0FBQUEsQ0FBQyxVQUFVLE9BQU87SUFDakIsSUFBSSxXQUFXLEdBQUc7UUFDaEIsVUFBVSxFQUFFLElBQUk7UUFDaEIsUUFBUSxFQUFFLElBQUk7S0FDZixDQUFDO0lBRUYscUJBQXFCLEtBQUs7UUFDeEIsTUFBTSxDQUFDLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQztJQUMzRCxDQUFDO0lBRUQsSUFBSSxXQUFXLEdBQUcsQ0FBQyxXQUFXLENBQUMsT0FBTyxPQUFPLENBQUMsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsT0FBTyxHQUFHLElBQUksQ0FBQztJQUNqRyxJQUFJLFVBQVUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQzVGLElBQUksVUFBVSxHQUFHLFdBQVcsQ0FBQyxXQUFXLElBQUksVUFBVSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsSUFBSSxNQUFNLENBQUMsQ0FBQztJQUNoRyxJQUFJLFFBQVEsR0FBRyxXQUFXLENBQUMsV0FBVyxD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dCAoYykgTWljcm9zb2Z0LCBBbGwgcmlnaHRzIHJlc2VydmVkLiBTZWUgTGljZW5zZS50eHQgaW4gdGhlIHByb2plY3Qgcm9vdCBmb3IgbGljZW5zZSBpbmZvcm1hdGlvbi5cblxuOyhmdW5jdGlvbiAoZmFjdG9yeSkge1xuICB2YXIgb2JqZWN0VHlwZXMgPSB7XG4gICAgJ2Z1bmN0aW9uJzogdHJ1ZSxcbiAgICAnb2JqZWN0JzogdHJ1ZVxuICB9O1xuXG4gIGZ1bmN0aW9uIGNoZWNrR2xvYmFsKHZhbHVlKSB7XG4gICAgcmV0dXJuICh2YWx1ZSAmJiB2YWx1ZS5PYmplY3QgPT09IE9iamVjdCkgPyB2YWx1ZSA6IG51bGw7XG4gIH1cblxuICB2YXIgZnJlZUV4cG9ydHMgPSAob2JqZWN0VHlwZXNbdHlwZW9mIGV4cG9ydHNdICYmIGV4cG9ydHMgJiYgIWV4cG9ydHMubm9kZVR5cGUpID8gZXhwb3J0cyA6IG51bGw7XG4gIHZhciBmcmVlTW9kdWxlID0gKG9iamVjdFR5cGVzW3R5cGVvZiBtb2R1bGVdICYmIG1vZHVsZSAmJiAhbW9kdWxlLm5vZGVUeXBlKSA/IG1vZHVsZSA6IG51bGw7XG4gIHZhciBmcmVlR2xvYmFsID0gY2hlY2tHbG9iYWwoZnJlZUV4cG9ydHMgJiYgZnJlZU1vZHVsZSAmJiB0eXBlb2YgZ2xvYmFsID09PSAnb2JqZWN0JyAmJiBnbG9iYWwpO1xuICB2YXIgZnJlZVNlbGYgPSBjaGVja0dsb2JhbChvYmplY3RUeXBlc1t0eXBlb2Ygc2VsZl0gJiYgc2VsZik7XG4gIHZhciBmcmVlV2luZG93ID0gY2hlY2tHbG9iYWwob2JqZWN0VHlwZXNbdHlwZW9mIHdpbmRvd10gJiYgd2luZG93KTtcbiAgdmFyIG1vZHVsZUV4cG9ydHMgPSAoZnJlZU1vZHVsZSAmJiBmcmVlTW9kdWxlLmV4cG9ydHMgPT09IGZyZWVFeHBvcnRzKSA/IGZyZWVFeHBvcnRzIDogbnVsbDtcbiAgdmFyIHRoaXNHbG9iYWwgPSBjaGVja0dsb2JhbChvYmplY3RUeXBlc1t0eXBlb2YgdGhpc10gJiYgdGhpcyk7XG4gIHZhciByb290ID0gZnJlZUdsb2JhbCB8fCAoKGZyZWVXaW5kb3cgIT09ICh0aGlzR2xvYmFsICYmIHRoaXNHbG9iYWwud2luZG93KSkgJiYgZnJlZVdpbmRvdykgfHwgZnJlZVNlbGYgfHwgdGhpc0dsb2JhbCB8fCBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuXG4gIC8vIEJlY2F1c2Ugb2YgYnVpbGQgb3B0aW1pemVyc1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKFsnLi9yeCddLCBmdW5jdGlvbiAoUngsIGV4cG9ydHMpIHtcbiAgICAgIHJldHVybiBmYWN0b3J5KHJvb3QsIGV4cG9ydHMsIFJ4KTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiYgbW9kdWxlLmV4cG9ydHMgPT09IGZyZWVFeHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJvb3QsIG1vZHVsZS5leHBvcnRzLCByZXF1aXJlKCcuL3J4JykpO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuUnggPSBmYWN0b3J5KHJvb3QsIHt9LCByb290LlJ4KTtcbiAgfVxufS5jYWxsKHRoaXMsIGZ1bmN0aW9uIChyb290LCBleHAsIFJ4LCB1bmRlZmluZWQpIHtcblxuICB2YXIgT2JzZXJ2YWJsZSA9IFJ4Lk9ic2VydmFibGUsXG4gICAgT2JzZXJ2YWJsZUJhc2UgPSBSeC5PYnNlcnZhYmxlQmFzZSxcbiAgICBBYnN0cmFjdE9ic2VydmVyID0gUnguaW50ZXJuYWxzLkFic3RyYWN0T2JzZXJ2ZXIsXG4gICAgQ29tcG9zaXRlRGlzcG9zYWJsZSA9IFJ4LkNvbXBvc2l0ZURpc3Bvc2FibGUsXG4gICAgQmluYXJ5RGlzcG9zYWJsZSA9IFJ4LkJpbmFyeURpc3Bvc2FibGUsXG4gICAgUmVmQ291bnREaXNwb3NhYmxlID0gUnguUmVmQ291bnREaXNwb3NhYmxlLFxuICAgIFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlID0gUnguU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUsXG4gICAgU2VyaWFsRGlzcG9zYWJsZSA9IFJ4LlNlcmlhbERpc3Bvc2FibGUsXG4gICAgU3ViamVjdCA9IFJ4LlN1YmplY3QsXG4gICAgb2JzZXJ2YWJsZVByb3RvID0gT2JzZXJ2YWJsZS5wcm90b3R5cGUsXG4gICAgb2JzZXJ2YWJsZUVtcHR5ID0gT2JzZXJ2YWJsZS5lbXB0eSxcbiAgICBvYnNlcnZhYmxlTmV2ZXIgPSBPYnNlcnZhYmxlLm5ldmVyLFxuICAgIEFub255bW91c09ic2VydmFibGUgPSBSeC5Bbm9ueW1vdXNPYnNlcnZhYmxlLFxuICAgIGFkZFJlZiA9IFJ4LmludGVybmFscy5hZGRSZWYsXG4gICAgaW5oZXJpdHMgPSBSeC5pbnRlcm5hbHMuaW5oZXJpdHMsXG4gICAgYmluZENhbGxiYWNrID0gUnguaW50ZXJuYWxzLmJpbmRDYWxsYmFjayxcbiAgICBub29wID0gUnguaGVscGVycy5ub29wLFxuICAgIGlzUHJvbWlzZSA9IFJ4LmhlbHBlcnMuaXNQcm9taXNlLFxuICAgIGlzRnVuY3Rpb24gPSBSeC5oZWxwZXJzLmlzRnVuY3Rpb24sXG4gICAgb2JzZXJ2YWJsZUZyb21Qcm9taXNlID0gT2JzZXJ2YWJsZS5mcm9tUHJvbWlzZTtcblxuICB2YXIgZXJyb3JPYmogPSB7ZToge319O1xuICBcbiAgZnVuY3Rpb24gdHJ5Q2F0Y2hlckdlbih0cnlDYXRjaFRhcmdldCkge1xuICAgIHJldHVybiBmdW5jdGlvbiB0cnlDYXRjaGVyKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHRyeUNhdGNoVGFyZ2V0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGVycm9yT2JqLmUgPSBlO1xuICAgICAgICByZXR1cm4gZXJyb3JPYmo7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHZhciB0cnlDYXRjaCA9IFJ4LmludGVybmFscy50cnlDYXRjaCA9IGZ1bmN0aW9uIHRyeUNhdGNoKGZuKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGZuKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdmbiBtdXN0IGJlIGEgZnVuY3Rpb24nKTsgfVxuICAgIHJldHVybiB0cnlDYXRjaGVyR2VuKGZuKTtcbiAgfTtcblxuICBmdW5jdGlvbiB0aHJvd2VyKGUpIHtcbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgdmFyIE1hcCA9IHJvb3QuTWFwIHx8IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTWFwKCkge1xuICAgICAgdGhpcy5zaXplID0gMDtcbiAgICAgIHRoaXMuX3ZhbHVlcyA9IFtdO1xuICAgICAgdGhpcy5fa2V5cyA9IFtdO1xuICAgIH1cblxuICAgIE1hcC5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgdmFyIGkgPSB0aGlzLl9rZXlzLmluZGV4T2Yoa2V5KTtcbiAgICAgIGlmIChpID09PSAtMSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgIHRoaXMuX3ZhbHVlcy5zcGxpY2UoaSwgMSk7XG4gICAgICB0aGlzLl9rZXlzLnNwbGljZShpLCAxKTtcbiAgICAgIHRoaXMuc2l6ZS0tO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIE1hcC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgdmFyIGkgPSB0aGlzLl9rZXlzLmluZGV4T2Yoa2V5KTtcbiAgICAgIHJldHVybiBpID09PSAtMSA/IHVuZGVmaW5lZCA6IHRoaXMuX3ZhbHVlc1tpXTtcbiAgICB9O1xuXG4gICAgTWFwLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgdmFyIGkgPSB0aGlzLl9rZXlzLmluZGV4T2Yoa2V5KTtcbiAgICAgIGlmIChpID09PSAtMSkge1xuICAgICAgICB0aGlzLl9rZXlzLnB1c2goa2V5KTtcbiAgICAgICAgdGhpcy5fdmFsdWVzLnB1c2godmFsdWUpO1xuICAgICAgICB0aGlzLnNpemUrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlc1tpXSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIE1hcC5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIChjYiwgdGhpc0FyZykge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNpemU7IGkrKykge1xuICAgICAgICBjYi5jYWxsKHRoaXNBcmcsIHRoaXMuX3ZhbHVlc1tpXSwgdGhpcy5fa2V5c1tpXSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBNYXA7XG4gIH0oKSk7XG5cbiAgLyoqXG4gICAqICBDb3JyZWxhdGVzIHRoZSBlbGVtZW50cyBvZiB0d28gc2VxdWVuY2VzIGJhc2VkIG9uIG92ZXJsYXBwaW5nIGR1cmF0aW9ucy5cbiAgICpcbiAgICogIEBwYXJhbSB7T2JzZXJ2YWJsZX0gcmlnaHQgVGhlIHJpZ2h0IG9ic2VydmFibGUgc2VxdWVuY2UgdG8gam9pbiBlbGVtZW50cyBmb3IuXG4gICAqICBAcGFyYW0ge0Z1bmN0aW9ufSBsZWZ0RHVyYXRpb25TZWxlY3RvciBBIGZ1bmN0aW9uIHRvIHNlbGVjdCB0aGUgZHVyYXRpb24gKGV4cHJlc3NlZCBhcyBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlKSBvZiBlYWNoIGVsZW1lbnQgb2YgdGhlIGxlZnQgb2JzZXJ2YWJsZSBzZXF1ZW5jZSwgdXNlZCB0byBkZXRlcm1pbmUgb3ZlcmxhcC5cbiAgICogIEBwYXJhbSB7RnVuY3Rpb259IHJpZ2h0RHVyYXRpb25TZWxlY3RvciBBIGZ1bmN0aW9uIHRvIHNlbGVjdCB0aGUgZHVyYXRpb24gKGV4cHJlc3NlZCBhcyBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlKSBvZiBlYWNoIGVsZW1lbnQgb2YgdGhlIHJpZ2h0IG9ic2VydmFibGUgc2VxdWVuY2UsIHVzZWQgdG8gZGV0ZXJtaW5lIG92ZXJsYXAuXG4gICAqICBAcGFyYW0ge0Z1bmN0aW9ufSByZXN1bHRTZWxlY3RvciBBIGZ1bmN0aW9uIGludm9rZWQgdG8gY29tcHV0ZSBhIHJlc3VsdCBlbGVtZW50IGZvciBhbnkgdHdvIG92ZXJsYXBwaW5nIGVsZW1lbnRzIG9mIHRoZSBsZWZ0IGFuZCByaWdodCBvYnNlcnZhYmxlIHNlcXVlbmNlcy4gVGhlIHBhcmFtZXRlcnMgcGFzc2VkIHRvIHRoZSBmdW5jdGlvbiBjb3JyZXNwb25kIHdpdGggdGhlIGVsZW1lbnRzIGZyb20gdGhlIGxlZnQgYW5kIHJpZ2h0IHNvdXJjZSBzZXF1ZW5jZXMgZm9yIHdoaWNoIG92ZXJsYXAgb2NjdXJzLlxuICAgKiAgQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBjb250YWlucyByZXN1bHQgZWxlbWVudHMgY29tcHV0ZWQgZnJvbSBzb3VyY2UgZWxlbWVudHMgdGhhdCBoYXZlIGFuIG92ZXJsYXBwaW5nIGR1cmF0aW9uLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmpvaW4gPSBmdW5jdGlvbiAocmlnaHQsIGxlZnREdXJhdGlvblNlbGVjdG9yLCByaWdodER1cmF0aW9uU2VsZWN0b3IsIHJlc3VsdFNlbGVjdG9yKSB7XG4gICAgdmFyIGxlZnQgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbiAobykge1xuICAgICAgdmFyIGdyb3VwID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICAgIHZhciBsZWZ0RG9uZSA9IGZhbHNlLCByaWdodERvbmUgPSBmYWxzZTtcbiAgICAgIHZhciBsZWZ0SWQgPSAwLCByaWdodElkID0gMDtcbiAgICAgIHZhciBsZWZ0TWFwID0gbmV3IE1hcCgpLCByaWdodE1hcCA9IG5ldyBNYXAoKTtcbiAgICAgIHZhciBoYW5kbGVFcnJvciA9IGZ1bmN0aW9uIChlKSB7IG8ub25FcnJvcihlKTsgfTtcblxuICAgICAgZ3JvdXAuYWRkKGxlZnQuc3Vic2NyaWJlKFxuICAgICAgICBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICB2YXIgaWQgPSBsZWZ0SWQrKywgbWQgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcblxuICAgICAgICAgIGxlZnRNYXAuc2V0KGlkLCB2YWx1ZSk7XG4gICAgICAgICAgZ3JvdXAuYWRkKG1kKTtcblxuICAgICAgICAgIHZhciBkdXJhdGlvbiA9IHRyeUNhdGNoKGxlZnREdXJhdGlvblNlbGVjdG9yKSh2YWx1ZSk7XG4gICAgICAgICAgaWYgKGR1cmF0aW9uID09PSBlcnJvck9iaikgeyByZXR1cm4gby5vbkVycm9yKGR1cmF0aW9uLmUpOyB9XG5cbiAgICAgICAgICBtZC5zZXREaXNwb3NhYmxlKGR1cmF0aW9uLnRha2UoMSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgbm9vcCxcbiAgICAgICAgICAgIGhhbmRsZUVycm9yLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICBsZWZ0TWFwWydkZWxldGUnXShpZCkgJiYgbGVmdE1hcC5zaXplID09PSAwICYmIGxlZnREb25lICYmIG8ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICAgICAgZ3JvdXAucmVtb3ZlKG1kKTtcbiAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgIHJpZ2h0TWFwLmZvckVhY2goZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSB0cnlDYXRjaChyZXN1bHRTZWxlY3RvcikodmFsdWUsIHYpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gZXJyb3JPYmopIHsgcmV0dXJuIG8ub25FcnJvcihyZXN1bHQuZSk7IH1cbiAgICAgICAgICAgIG8ub25OZXh0KHJlc3VsdCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZUVycm9yLFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgbGVmdERvbmUgPSB0cnVlO1xuICAgICAgICAgIChyaWdodERvbmUgfHwgbGVmdE1hcC5zaXplID09PSAwKSAmJiBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgICBncm91cC5hZGQocmlnaHQuc3Vic2NyaWJlKFxuICAgICAgICBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICB2YXIgaWQgPSByaWdodElkKyssIG1kID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG5cbiAgICAgICAgICByaWdodE1hcC5zZXQoaWQsIHZhbHVlKTtcbiAgICAgICAgICBncm91cC5hZGQobWQpO1xuXG4gICAgICAgICAgdmFyIGR1cmF0aW9uID0gdHJ5Q2F0Y2gocmlnaHREdXJhdGlvblNlbGVjdG9yKSh2YWx1ZSk7XG4gICAgICAgICAgaWYgKGR1cmF0aW9uID09PSBlcnJvck9iaikgeyByZXR1cm4gby5vbkVycm9yKGR1cmF0aW9uLmUpOyB9XG5cbiAgICAgICAgICBtZC5zZXREaXNwb3NhYmxlKGR1cmF0aW9uLnRha2UoMSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgbm9vcCxcbiAgICAgICAgICAgIGhhbmRsZUVycm9yLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICByaWdodE1hcFsnZGVsZXRlJ10oaWQpICYmIHJpZ2h0TWFwLnNpemUgPT09IDAgJiYgcmlnaHREb25lICYmIG8ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICAgICAgZ3JvdXAucmVtb3ZlKG1kKTtcbiAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgIGxlZnRNYXAuZm9yRWFjaChmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHRyeUNhdGNoKHJlc3VsdFNlbGVjdG9yKSh2LCB2YWx1ZSk7XG4gICAgICAgICAgICBpZiAocmVzdWx0ID09PSBlcnJvck9iaikgeyByZXR1cm4gby5vbkVycm9yKHJlc3VsdC5lKTsgfVxuICAgICAgICAgICAgby5vbk5leHQocmVzdWx0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlRXJyb3IsXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByaWdodERvbmUgPSB0cnVlO1xuICAgICAgICAgIChsZWZ0RG9uZSB8fCByaWdodE1hcC5zaXplID09PSAwKSAmJiBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgICAgcmV0dXJuIGdyb3VwO1xuICAgIH0sIGxlZnQpO1xuICB9O1xuXG4gIC8qKlxuICAgKiAgQ29ycmVsYXRlcyB0aGUgZWxlbWVudHMgb2YgdHdvIHNlcXVlbmNlcyBiYXNlZCBvbiBvdmVybGFwcGluZyBkdXJhdGlvbnMsIGFuZCBncm91cHMgdGhlIHJlc3VsdHMuXG4gICAqXG4gICAqICBAcGFyYW0ge09ic2VydmFibGV9IHJpZ2h0IFRoZSByaWdodCBvYnNlcnZhYmxlIHNlcXVlbmNlIHRvIGpvaW4gZWxlbWVudHMgZm9yLlxuICAgKiAgQHBhcmFtIHtGdW5jdGlvbn0gbGVmdER1cmF0aW9uU2VsZWN0b3IgQSBmdW5jdGlvbiB0byBzZWxlY3QgdGhlIGR1cmF0aW9uIChleHByZXNzZWQgYXMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSkgb2YgZWFjaCBlbGVtZW50IG9mIHRoZSBsZWZ0IG9ic2VydmFibGUgc2VxdWVuY2UsIHVzZWQgdG8gZGV0ZXJtaW5lIG92ZXJsYXAuXG4gICAqICBAcGFyYW0ge0Z1bmN0aW9ufSByaWdodER1cmF0aW9uU2VsZWN0b3IgQSBmdW5jdGlvbiB0byBzZWxlY3QgdGhlIGR1cmF0aW9uIChleHByZXNzZWQgYXMgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSkgb2YgZWFjaCBlbGVtZW50IG9mIHRoZSByaWdodCBvYnNlcnZhYmxlIHNlcXVlbmNlLCB1c2VkIHRvIGRldGVybWluZSBvdmVybGFwLlxuICAgKiAgQHBhcmFtIHtGdW5jdGlvbn0gcmVzdWx0U2VsZWN0b3IgQSBmdW5jdGlvbiBpbnZva2VkIHRvIGNvbXB1dGUgYSByZXN1bHQgZWxlbWVudCBmb3IgYW55IGVsZW1lbnQgb2YgdGhlIGxlZnQgc2VxdWVuY2Ugd2l0aCBvdmVybGFwcGluZyBlbGVtZW50cyBmcm9tIHRoZSByaWdodCBvYnNlcnZhYmxlIHNlcXVlbmNlLiBUaGUgZmlyc3QgcGFyYW1ldGVyIHBhc3NlZCB0byB0aGUgZnVuY3Rpb24gaXMgYW4gZWxlbWVudCBvZiB0aGUgbGVmdCBzZXF1ZW5jZS4gVGhlIHNlY29uZCBwYXJhbWV0ZXIgcGFzc2VkIHRvIHRoZSBmdW5jdGlvbiBpcyBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIHdpdGggZWxlbWVudHMgZnJvbSB0aGUgcmlnaHQgc2VxdWVuY2UgdGhhdCBvdmVybGFwIHdpdGggdGhlIGxlZnQgc2VxdWVuY2UncyBlbGVtZW50LlxuICAgKiAgQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2UgdGhhdCBjb250YWlucyByZXN1bHQgZWxlbWVudHMgY29tcHV0ZWQgZnJvbSBzb3VyY2UgZWxlbWVudHMgdGhhdCBoYXZlIGFuIG92ZXJsYXBwaW5nIGR1cmF0aW9uLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmdyb3VwSm9pbiA9IGZ1bmN0aW9uIChyaWdodCwgbGVmdER1cmF0aW9uU2VsZWN0b3IsIHJpZ2h0RHVyYXRpb25TZWxlY3RvciwgcmVzdWx0U2VsZWN0b3IpIHtcbiAgICB2YXIgbGVmdCA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBBbm9ueW1vdXNPYnNlcnZhYmxlKGZ1bmN0aW9uIChvKSB7XG4gICAgICB2YXIgZ3JvdXAgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICAgICAgdmFyIHIgPSBuZXcgUmVmQ291bnREaXNwb3NhYmxlKGdyb3VwKTtcbiAgICAgIHZhciBsZWZ0TWFwID0gbmV3IE1hcCgpLCByaWdodE1hcCA9IG5ldyBNYXAoKTtcbiAgICAgIHZhciBsZWZ0SWQgPSAwLCByaWdodElkID0gMDtcbiAgICAgIHZhciBoYW5kbGVFcnJvciA9IGZ1bmN0aW9uIChlKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyB2Lm9uRXJyb3IoZSk7IH07IH07XG5cbiAgICAgIGZ1bmN0aW9uIGhhbmRsZUVycm9yKGUpIHsgfTtcblxuICAgICAgZ3JvdXAuYWRkKGxlZnQuc3Vic2NyaWJlKFxuICAgICAgICBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICB2YXIgcyA9IG5ldyBTdWJqZWN0KCk7XG4gICAgICAgICAgdmFyIGlkID0gbGVmdElkKys7XG4gICAgICAgICAgbGVmdE1hcC5zZXQoaWQsIHMpO1xuXG4gICAgICAgICAgdmFyIHJlc3VsdCA9IHRyeUNhdGNoKHJlc3VsdFNlbGVjdG9yKSh2YWx1ZSwgYWRkUmVmKHMsIHIpKTtcbiAgICAgICAgICBpZiAocmVzdWx0ID09PSBlcnJvck9iaikge1xuICAgICAgICAgICAgbGVmdE1hcC5mb3JFYWNoKGhhbmRsZUVycm9yKHJlc3VsdC5lKSk7XG4gICAgICAgICAgICByZXR1cm4gby5vbkVycm9yKHJlc3VsdC5lKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgby5vbk5leHQocmVzdWx0KTtcblxuICAgICAgICAgIHJpZ2h0TWFwLmZvckVhY2goZnVuY3Rpb24gKHYpIHsgcy5vbk5leHQodik7IH0pO1xuXG4gICAgICAgICAgdmFyIG1kID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG4gICAgICAgICAgZ3JvdXAuYWRkKG1kKTtcblxuICAgICAgICAgIHZhciBkdXJhdGlvbiA9IHRyeUNhdGNoKGxlZnREdXJhdGlvblNlbGVjdG9yKSh2YWx1ZSk7XG4gICAgICAgICAgaWYgKGR1cmF0aW9uID09PSBlcnJvck9iaikge1xuICAgICAgICAgICAgbGVmdE1hcC5mb3JFYWNoKGhhbmRsZUVycm9yKGR1cmF0aW9uLmUpKTtcbiAgICAgICAgICAgIHJldHVybiBvLm9uRXJyb3IoZHVyYXRpb24uZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbWQuc2V0RGlzcG9zYWJsZShkdXJhdGlvbi50YWtlKDEpLnN1YnNjcmliZShcbiAgICAgICAgICAgIG5vb3AsXG4gICAgICAgICAgICBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICBsZWZ0TWFwLmZvckVhY2goaGFuZGxlRXJyb3IoZSkpO1xuICAgICAgICAgICAgICBvLm9uRXJyb3IoZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICBsZWZ0TWFwWydkZWxldGUnXShpZCkgJiYgcy5vbkNvbXBsZXRlZCgpO1xuICAgICAgICAgICAgICBncm91cC5yZW1vdmUobWQpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIGxlZnRNYXAuZm9yRWFjaChoYW5kbGVFcnJvcihlKSk7XG4gICAgICAgICAgby5vbkVycm9yKGUpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoKSB7IG8ub25Db21wbGV0ZWQoKTsgfSlcbiAgICAgICk7XG5cbiAgICAgIGdyb3VwLmFkZChyaWdodC5zdWJzY3JpYmUoXG4gICAgICAgIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgIHZhciBpZCA9IHJpZ2h0SWQrKztcbiAgICAgICAgICByaWdodE1hcC5zZXQoaWQsIHZhbHVlKTtcblxuICAgICAgICAgIHZhciBtZCA9IG5ldyBTaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSgpO1xuICAgICAgICAgIGdyb3VwLmFkZChtZCk7XG5cbiAgICAgICAgICB2YXIgZHVyYXRpb24gPSB0cnlDYXRjaChyaWdodER1cmF0aW9uU2VsZWN0b3IpKHZhbHVlKTtcbiAgICAgICAgICBpZiAoZHVyYXRpb24gPT09IGVycm9yT2JqKSB7XG4gICAgICAgICAgICBsZWZ0TWFwLmZvckVhY2goaGFuZGxlRXJyb3IoZHVyYXRpb24uZSkpO1xuICAgICAgICAgICAgcmV0dXJuIG8ub25FcnJvcihkdXJhdGlvbi5lKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBtZC5zZXREaXNwb3NhYmxlKGR1cmF0aW9uLnRha2UoMSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgbm9vcCxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgIGxlZnRNYXAuZm9yRWFjaChoYW5kbGVFcnJvcihlKSk7XG4gICAgICAgICAgICAgIG8ub25FcnJvcihlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJpZ2h0TWFwWydkZWxldGUnXShpZCk7XG4gICAgICAgICAgICAgIGdyb3VwLnJlbW92ZShtZCk7XG4gICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICBsZWZ0TWFwLmZvckVhY2goZnVuY3Rpb24gKHYpIHsgdi5vbk5leHQodmFsdWUpOyB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBsZWZ0TWFwLmZvckVhY2goaGFuZGxlRXJyb3IoZSkpO1xuICAgICAgICAgIG8ub25FcnJvcihlKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiByO1xuICAgIH0sIGxlZnQpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIHRvQXJyYXkoeCkgeyByZXR1cm4geC50b0FycmF5KCk7IH1cblxuICAvKipcbiAgICogIFByb2plY3RzIGVhY2ggZWxlbWVudCBvZiBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlIGludG8gemVybyBvciBtb3JlIGJ1ZmZlcnMuXG4gICAqICBAcGFyYW0ge01peGVkfSBidWZmZXJPcGVuaW5nc09yQ2xvc2luZ1NlbGVjdG9yIE9ic2VydmFibGUgc2VxdWVuY2Ugd2hvc2UgZWxlbWVudHMgZGVub3RlIHRoZSBjcmVhdGlvbiBvZiBuZXcgd2luZG93cywgb3IsIGEgZnVuY3Rpb24gaW52b2tlZCB0byBkZWZpbmUgdGhlIGJvdW5kYXJpZXMgb2YgdGhlIHByb2R1Y2VkIHdpbmRvd3MgKGEgbmV3IHdpbmRvdyBpcyBzdGFydGVkIHdoZW4gdGhlIHByZXZpb3VzIG9uZSBpcyBjbG9zZWQsIHJlc3VsdGluZyBpbiBub24tb3ZlcmxhcHBpbmcgd2luZG93cykuXG4gICAqICBAcGFyYW0ge0Z1bmN0aW9ufSBbYnVmZmVyQ2xvc2luZ1NlbGVjdG9yXSBBIGZ1bmN0aW9uIGludm9rZWQgdG8gZGVmaW5lIHRoZSBjbG9zaW5nIG9mIGVhY2ggcHJvZHVjZWQgd2luZG93LiBJZiBhIGNsb3Npbmcgc2VsZWN0b3IgZnVuY3Rpb24gaXMgc3BlY2lmaWVkIGZvciB0aGUgZmlyc3QgcGFyYW1ldGVyLCB0aGlzIHBhcmFtZXRlciBpcyBpZ25vcmVkLlxuICAgKiAgQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgc2VxdWVuY2Ugb2Ygd2luZG93cy5cbiAgICovXG4gIG9ic2VydmFibGVQcm90by5idWZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMud2luZG93LmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICAgIC5mbGF0TWFwKHRvQXJyYXkpO1xuICB9O1xuXG4gIC8qKlxuICAgKiAgUHJvamVjdHMgZWFjaCBlbGVtZW50IG9mIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgaW50byB6ZXJvIG9yIG1vcmUgd2luZG93cy5cbiAgICpcbiAgICogIEBwYXJhbSB7TWl4ZWR9IHdpbmRvd09wZW5pbmdzT3JDbG9zaW5nU2VsZWN0b3IgT2JzZXJ2YWJsZSBzZXF1ZW5jZSB3aG9zZSBlbGVtZW50cyBkZW5vdGUgdGhlIGNyZWF0aW9uIG9mIG5ldyB3aW5kb3dzLCBvciwgYSBmdW5jdGlvbiBpbnZva2VkIHRvIGRlZmluZSB0aGUgYm91bmRhcmllcyBvZiB0aGUgcHJvZHVjZWQgd2luZG93cyAoYSBuZXcgd2luZG93IGlzIHN0YXJ0ZWQgd2hlbiB0aGUgcHJldmlvdXMgb25lIGlzIGNsb3NlZCwgcmVzdWx0aW5nIGluIG5vbi1vdmVybGFwcGluZyB3aW5kb3dzKS5cbiAgICogIEBwYXJhbSB7RnVuY3Rpb259IFt3aW5kb3dDbG9zaW5nU2VsZWN0b3JdIEEgZnVuY3Rpb24gaW52b2tlZCB0byBkZWZpbmUgdGhlIGNsb3Npbmcgb2YgZWFjaCBwcm9kdWNlZCB3aW5kb3cuIElmIGEgY2xvc2luZyBzZWxlY3RvciBmdW5jdGlvbiBpcyBzcGVjaWZpZWQgZm9yIHRoZSBmaXJzdCBwYXJhbWV0ZXIsIHRoaXMgcGFyYW1ldGVyIGlzIGlnbm9yZWQuXG4gICAqICBAcmV0dXJucyB7T2JzZXJ2YWJsZX0gQW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBvZiB3aW5kb3dzLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLndpbmRvdyA9IGZ1bmN0aW9uICh3aW5kb3dPcGVuaW5nc09yQ2xvc2luZ1NlbGVjdG9yLCB3aW5kb3dDbG9zaW5nU2VsZWN0b3IpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSAmJiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZVdpbmRvd1dpdGhCb3VuZGFyaWVzLmNhbGwodGhpcywgd2luZG93T3BlbmluZ3NPckNsb3NpbmdTZWxlY3Rvcik7XG4gICAgfVxuICAgIHJldHVybiB0eXBlb2Ygd2luZG93T3BlbmluZ3NPckNsb3NpbmdTZWxlY3RvciA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICBvYnNlcnZhYmxlV2luZG93V2l0aENsb3NpbmdTZWxlY3Rvci5jYWxsKHRoaXMsIHdpbmRvd09wZW5pbmdzT3JDbG9zaW5nU2VsZWN0b3IpIDpcbiAgICAgIG9ic2VydmFibGVXaW5kb3dXaXRoT3BlbmluZ3MuY2FsbCh0aGlzLCB3aW5kb3dPcGVuaW5nc09yQ2xvc2luZ1NlbGVjdG9yLCB3aW5kb3dDbG9zaW5nU2VsZWN0b3IpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIG9ic2VydmFibGVXaW5kb3dXaXRoT3BlbmluZ3Mod2luZG93T3BlbmluZ3MsIHdpbmRvd0Nsb3NpbmdTZWxlY3Rvcikge1xuICAgIHJldHVybiB3aW5kb3dPcGVuaW5ncy5ncm91cEpvaW4odGhpcywgd2luZG93Q2xvc2luZ1NlbGVjdG9yLCBvYnNlcnZhYmxlRW1wdHksIGZ1bmN0aW9uIChfLCB3aW4pIHtcbiAgICAgIHJldHVybiB3aW47XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBvYnNlcnZhYmxlV2luZG93V2l0aEJvdW5kYXJpZXMod2luZG93Qm91bmRhcmllcykge1xuICAgIHZhciBzb3VyY2UgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbiAob2JzZXJ2ZXIpIHtcbiAgICAgIHZhciB3aW4gPSBuZXcgU3ViamVjdCgpLFxuICAgICAgICBkID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKSxcbiAgICAgICAgciA9IG5ldyBSZWZDb3VudERpc3Bvc2FibGUoZCk7XG5cbiAgICAgIG9ic2VydmVyLm9uTmV4dChhZGRSZWYod2luLCByKSk7XG5cbiAgICAgIGQuYWRkKHNvdXJjZS5zdWJzY3JpYmUoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgd2luLm9uTmV4dCh4KTtcbiAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgd2luLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlcnIpO1xuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW4ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKTtcbiAgICAgIH0pKTtcblxuICAgICAgaXNQcm9taXNlKHdpbmRvd0JvdW5kYXJpZXMpICYmICh3aW5kb3dCb3VuZGFyaWVzID0gb2JzZXJ2YWJsZUZyb21Qcm9taXNlKHdpbmRvd0JvdW5kYXJpZXMpKTtcblxuICAgICAgZC5hZGQod2luZG93Qm91bmRhcmllcy5zdWJzY3JpYmUoZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgd2luLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIHdpbiA9IG5ldyBTdWJqZWN0KCk7XG4gICAgICAgIG9ic2VydmVyLm9uTmV4dChhZGRSZWYod2luLCByKSk7XG4gICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHdpbi5vbkVycm9yKGVycik7XG4gICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2luLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKCk7XG4gICAgICB9KSk7XG5cbiAgICAgIHJldHVybiByO1xuICAgIH0sIHNvdXJjZSk7XG4gIH1cblxuICBmdW5jdGlvbiBvYnNlcnZhYmxlV2luZG93V2l0aENsb3NpbmdTZWxlY3Rvcih3aW5kb3dDbG9zaW5nU2VsZWN0b3IpIHtcbiAgICB2YXIgc291cmNlID0gdGhpcztcbiAgICByZXR1cm4gbmV3IEFub255bW91c09ic2VydmFibGUoZnVuY3Rpb24gKG9ic2VydmVyKSB7XG4gICAgICB2YXIgbSA9IG5ldyBTZXJpYWxEaXNwb3NhYmxlKCksXG4gICAgICAgIGQgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZShtKSxcbiAgICAgICAgciA9IG5ldyBSZWZDb3VudERpc3Bvc2FibGUoZCksXG4gICAgICAgIHdpbiA9IG5ldyBTdWJqZWN0KCk7XG4gICAgICBvYnNlcnZlci5vbk5leHQoYWRkUmVmKHdpbiwgcikpO1xuICAgICAgZC5hZGQoc291cmNlLnN1YnNjcmliZShmdW5jdGlvbiAoeCkge1xuICAgICAgICAgIHdpbi5vbk5leHQoeCk7XG4gICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgd2luLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICBvYnNlcnZlci5vbkVycm9yKGVycik7XG4gICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgd2luLm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKTtcbiAgICAgIH0pKTtcblxuICAgICAgZnVuY3Rpb24gY3JlYXRlV2luZG93Q2xvc2UgKCkge1xuICAgICAgICB2YXIgd2luZG93Q2xvc2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgd2luZG93Q2xvc2UgPSB3aW5kb3dDbG9zaW5nU2VsZWN0b3IoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaXNQcm9taXNlKHdpbmRvd0Nsb3NlKSAmJiAod2luZG93Q2xvc2UgPSBvYnNlcnZhYmxlRnJvbVByb21pc2Uod2luZG93Q2xvc2UpKTtcblxuICAgICAgICB2YXIgbTEgPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgICAgbS5zZXREaXNwb3NhYmxlKG0xKTtcbiAgICAgICAgbTEuc2V0RGlzcG9zYWJsZSh3aW5kb3dDbG9zZS50YWtlKDEpLnN1YnNjcmliZShub29wLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgd2luLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICBvYnNlcnZlci5vbkVycm9yKGVycik7XG4gICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB3aW4ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICB3aW4gPSBuZXcgU3ViamVjdCgpO1xuICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChhZGRSZWYod2luLCByKSk7XG4gICAgICAgICAgY3JlYXRlV2luZG93Q2xvc2UoKTtcbiAgICAgICAgfSkpO1xuICAgICAgfVxuXG4gICAgICBjcmVhdGVXaW5kb3dDbG9zZSgpO1xuICAgICAgcmV0dXJuIHI7XG4gICAgfSwgc291cmNlKTtcbiAgfVxuXG4gIHZhciBQYWlyd2lzZU9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFBhaXJ3aXNlT2JzZXJ2YWJsZSwgX19zdXBlcl9fKTtcbiAgICBmdW5jdGlvbiBQYWlyd2lzZU9ic2VydmFibGUoc291cmNlKSB7XG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFBhaXJ3aXNlT2JzZXJ2YWJsZS5wcm90b3R5cGUuc3Vic2NyaWJlQ29yZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc3Vic2NyaWJlKG5ldyBQYWlyd2lzZU9ic2VydmVyKG8pKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFBhaXJ3aXNlT2JzZXJ2YWJsZTtcbiAgfShPYnNlcnZhYmxlQmFzZSkpO1xuXG4gIHZhciBQYWlyd2lzZU9ic2VydmVyID0gKGZ1bmN0aW9uKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFBhaXJ3aXNlT2JzZXJ2ZXIsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gUGFpcndpc2VPYnNlcnZlcihvKSB7XG4gICAgICB0aGlzLl9vID0gbztcbiAgICAgIHRoaXMuX3AgPSBudWxsO1xuICAgICAgdGhpcy5faHAgPSBmYWxzZTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFBhaXJ3aXNlT2JzZXJ2ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgaWYgKHRoaXMuX2hwKSB7XG4gICAgICAgIHRoaXMuX28ub25OZXh0KFt0aGlzLl9wLCB4XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9ocCA9IHRydWU7XG4gICAgICB9XG4gICAgICB0aGlzLl9wID0geDtcbiAgICB9O1xuICAgIFBhaXJ3aXNlT2JzZXJ2ZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGVycikgeyB0aGlzLl9vLm9uRXJyb3IoZXJyKTsgfTtcbiAgICBQYWlyd2lzZU9ic2VydmVyLnByb3RvdHlwZS5jb21wbGV0ZWQgPSBmdW5jdGlvbiAoKSB7IHRoaXMuX28ub25Db21wbGV0ZWQoKTsgfTtcblxuICAgIHJldHVybiBQYWlyd2lzZU9ic2VydmVyO1xuICB9KEFic3RyYWN0T2JzZXJ2ZXIpKTtcblxuICAvKipcbiAgICogUmV0dXJucyBhIG5ldyBvYnNlcnZhYmxlIHRoYXQgdHJpZ2dlcnMgb24gdGhlIHNlY29uZCBhbmQgc3Vic2VxdWVudCB0cmlnZ2VyaW5ncyBvZiB0aGUgaW5wdXQgb2JzZXJ2YWJsZS5cbiAgICogVGhlIE50aCB0cmlnZ2VyaW5nIG9mIHRoZSBpbnB1dCBvYnNlcnZhYmxlIHBhc3NlcyB0aGUgYXJndW1lbnRzIGZyb20gdGhlIE4tMXRoIGFuZCBOdGggdHJpZ2dlcmluZyBhcyBhIHBhaXIuXG4gICAqIFRoZSBhcmd1bWVudCBwYXNzZWQgdG8gdGhlIE4tMXRoIHRyaWdnZXJpbmcgaXMgaGVsZCBpbiBoaWRkZW4gaW50ZXJuYWwgc3RhdGUgdW50aWwgdGhlIE50aCB0cmlnZ2VyaW5nIG9jY3Vycy5cbiAgICogQHJldHVybnMge09ic2VydmFibGV9IEFuIG9ic2VydmFibGUgdGhhdCB0cmlnZ2VycyBvbiBzdWNjZXNzaXZlIHBhaXJzIG9mIG9ic2VydmF0aW9ucyBmcm9tIHRoZSBpbnB1dCBvYnNlcnZhYmxlIGFzIGFuIGFycmF5LlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnBhaXJ3aXNlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgUGFpcndpc2VPYnNlcnZhYmxlKHRoaXMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHR3byBvYnNlcnZhYmxlcyB3aGljaCBwYXJ0aXRpb24gdGhlIG9ic2VydmF0aW9ucyBvZiB0aGUgc291cmNlIGJ5IHRoZSBnaXZlbiBmdW5jdGlvbi5cbiAgICogVGhlIGZpcnN0IHdpbGwgdHJpZ2dlciBvYnNlcnZhdGlvbnMgZm9yIHRob3NlIHZhbHVlcyBmb3Igd2hpY2ggdGhlIHByZWRpY2F0ZSByZXR1cm5zIHRydWUuXG4gICAqIFRoZSBzZWNvbmQgd2lsbCB0cmlnZ2VyIG9ic2VydmF0aW9ucyBmb3IgdGhvc2UgdmFsdWVzIHdoZXJlIHRoZSBwcmVkaWNhdGUgcmV0dXJucyBmYWxzZS5cbiAgICogVGhlIHByZWRpY2F0ZSBpcyBleGVjdXRlZCBvbmNlIGZvciBlYWNoIHN1YnNjcmliZWQgb2JzZXJ2ZXIuXG4gICAqIEJvdGggYWxzbyBwcm9wYWdhdGUgYWxsIGVycm9yIG9ic2VydmF0aW9ucyBhcmlzaW5nIGZyb20gdGhlIHNvdXJjZSBhbmQgZWFjaCBjb21wbGV0ZXNcbiAgICogd2hlbiB0aGUgc291cmNlIGNvbXBsZXRlcy5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gcHJlZGljYXRlXG4gICAqICAgIFRoZSBmdW5jdGlvbiB0byBkZXRlcm1pbmUgd2hpY2ggb3V0cHV0IE9ic2VydmFibGUgd2lsbCB0cmlnZ2VyIGEgcGFydGljdWxhciBvYnNlcnZhdGlvbi5cbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKiAgICBBbiBhcnJheSBvZiBvYnNlcnZhYmxlcy4gVGhlIGZpcnN0IHRyaWdnZXJzIHdoZW4gdGhlIHByZWRpY2F0ZSByZXR1cm5zIHRydWUsXG4gICAqICAgIGFuZCB0aGUgc2Vjb25kIHRyaWdnZXJzIHdoZW4gdGhlIHByZWRpY2F0ZSByZXR1cm5zIGZhbHNlLlxuICAqL1xuICBvYnNlcnZhYmxlUHJvdG8ucGFydGl0aW9uID0gZnVuY3Rpb24ocHJlZGljYXRlLCB0aGlzQXJnKSB7XG4gICAgdmFyIGZuID0gYmluZENhbGxiYWNrKHByZWRpY2F0ZSwgdGhpc0FyZywgMyk7XG4gICAgcmV0dXJuIFtcbiAgICAgIHRoaXMuZmlsdGVyKHByZWRpY2F0ZSwgdGhpc0FyZyksXG4gICAgICB0aGlzLmZpbHRlcihmdW5jdGlvbiAoeCwgaSwgbykgeyByZXR1cm4gIWZuKHgsIGksIG8pOyB9KVxuICAgIF07XG4gIH07XG5cbiAgLyoqXG4gICAqICBHcm91cHMgdGhlIGVsZW1lbnRzIG9mIGFuIG9ic2VydmFibGUgc2VxdWVuY2UgYWNjb3JkaW5nIHRvIGEgc3BlY2lmaWVkIGtleSBzZWxlY3RvciBmdW5jdGlvbiBhbmQgY29tcGFyZXIgYW5kIHNlbGVjdHMgdGhlIHJlc3VsdGluZyBlbGVtZW50cyBieSB1c2luZyBhIHNwZWNpZmllZCBmdW5jdGlvbi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogIHZhciByZXMgPSBvYnNlcnZhYmxlLmdyb3VwQnkoZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHguaWQ7IH0pO1xuICAgKiAgMiAtIG9ic2VydmFibGUuZ3JvdXBCeShmdW5jdGlvbiAoeCkgeyByZXR1cm4geC5pZDsgfSksIGZ1bmN0aW9uICh4KSB7IHJldHVybiB4Lm5hbWU7IH0pO1xuICAgKiAgMyAtIG9ic2VydmFibGUuZ3JvdXBCeShmdW5jdGlvbiAoeCkgeyByZXR1cm4geC5pZDsgfSksIGZ1bmN0aW9uICh4KSB7IHJldHVybiB4Lm5hbWU7IH0sIGZ1bmN0aW9uICh4KSB7IHJldHVybiB4LnRvU3RyaW5nKCk7IH0pO1xuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBrZXlTZWxlY3RvciBBIGZ1bmN0aW9uIHRvIGV4dHJhY3QgdGhlIGtleSBmb3IgZWFjaCBlbGVtZW50LlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZWxlbWVudFNlbGVjdG9yXSAgQSBmdW5jdGlvbiB0byBtYXAgZWFjaCBzb3VyY2UgZWxlbWVudCB0byBhbiBlbGVtZW50IGluIGFuIG9ic2VydmFibGUgZ3JvdXAuXG4gICAqIEByZXR1cm5zIHtPYnNlcnZhYmxlfSBBIHNlcXVlbmNlIG9mIG9ic2VydmFibGUgZ3JvdXBzLCBlYWNoIG9mIHdoaWNoIGNvcnJlc3BvbmRzIHRvIGEgdW5pcXVlIGtleSB2YWx1ZSwgY29udGFpbmluZyBhbGwgZWxlbWVudHMgdGhhdCBzaGFyZSB0aGF0IHNhbWUga2V5IHZhbHVlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmdyb3VwQnkgPSBmdW5jdGlvbiAoa2V5U2VsZWN0b3IsIGVsZW1lbnRTZWxlY3Rvcikge1xuICAgIHJldHVybiB0aGlzLmdyb3VwQnlVbnRpbChrZXlTZWxlY3RvciwgZWxlbWVudFNlbGVjdG9yLCBvYnNlcnZhYmxlTmV2ZXIpO1xuICB9O1xuXG4gICAgLyoqXG4gICAgICogIEdyb3VwcyB0aGUgZWxlbWVudHMgb2YgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBhY2NvcmRpbmcgdG8gYSBzcGVjaWZpZWQga2V5IHNlbGVjdG9yIGZ1bmN0aW9uLlxuICAgICAqICBBIGR1cmF0aW9uIHNlbGVjdG9yIGZ1bmN0aW9uIGlzIHVzZWQgdG8gY29udHJvbCB0aGUgbGlmZXRpbWUgb2YgZ3JvdXBzLiBXaGVuIGEgZ3JvdXAgZXhwaXJlcywgaXQgcmVjZWl2ZXMgYW4gT25Db21wbGV0ZWQgbm90aWZpY2F0aW9uLiBXaGVuIGEgbmV3IGVsZW1lbnQgd2l0aCB0aGUgc2FtZVxuICAgICAqICBrZXkgdmFsdWUgYXMgYSByZWNsYWltZWQgZ3JvdXAgb2NjdXJzLCB0aGUgZ3JvdXAgd2lsbCBiZSByZWJvcm4gd2l0aCBhIG5ldyBsaWZldGltZSByZXF1ZXN0LlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAgdmFyIHJlcyA9IG9ic2VydmFibGUuZ3JvdXBCeVVudGlsKGZ1bmN0aW9uICh4KSB7IHJldHVybiB4LmlkOyB9LCBudWxsLCAgZnVuY3Rpb24gKCkgeyByZXR1cm4gUnguT2JzZXJ2YWJsZS5uZXZlcigpOyB9KTtcbiAgICAgKiAgMiAtIG9ic2VydmFibGUuZ3JvdXBCeShmdW5jdGlvbiAoeCkgeyByZXR1cm4geC5pZDsgfSksIGZ1bmN0aW9uICh4KSB7IHJldHVybiB4Lm5hbWU7IH0sICBmdW5jdGlvbiAoKSB7IHJldHVybiBSeC5PYnNlcnZhYmxlLm5ldmVyKCk7IH0pO1xuICAgICAqICAzIC0gb2JzZXJ2YWJsZS5ncm91cEJ5KGZ1bmN0aW9uICh4KSB7IHJldHVybiB4LmlkOyB9KSwgZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHgubmFtZTsgfSwgIGZ1bmN0aW9uICgpIHsgcmV0dXJuIFJ4Lk9ic2VydmFibGUubmV2ZXIoKTsgfSwgZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHgudG9TdHJpbmcoKTsgfSk7XG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0ga2V5U2VsZWN0b3IgQSBmdW5jdGlvbiB0byBleHRyYWN0IHRoZSBrZXkgZm9yIGVhY2ggZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBkdXJhdGlvblNlbGVjdG9yIEEgZnVuY3Rpb24gdG8gc2lnbmFsIHRoZSBleHBpcmF0aW9uIG9mIGEgZ3JvdXAuXG4gICAgICogQHJldHVybnMge09ic2VydmFibGV9XG4gICAgICogIEEgc2VxdWVuY2Ugb2Ygb2JzZXJ2YWJsZSBncm91cHMsIGVhY2ggb2Ygd2hpY2ggY29ycmVzcG9uZHMgdG8gYSB1bmlxdWUga2V5IHZhbHVlLCBjb250YWluaW5nIGFsbCBlbGVtZW50cyB0aGF0IHNoYXJlIHRoYXQgc2FtZSBrZXkgdmFsdWUuXG4gICAgICogIElmIGEgZ3JvdXAncyBsaWZldGltZSBleHBpcmVzLCBhIG5ldyBncm91cCB3aXRoIHRoZSBzYW1lIGtleSB2YWx1ZSBjYW4gYmUgY3JlYXRlZCBvbmNlIGFuIGVsZW1lbnQgd2l0aCBzdWNoIGEga2V5IHZhbHVlIGlzIGVuY291dGVyZWQuXG4gICAgICpcbiAgICAgKi9cbiAgICBvYnNlcnZhYmxlUHJvdG8uZ3JvdXBCeVVudGlsID0gZnVuY3Rpb24gKGtleVNlbGVjdG9yLCBlbGVtZW50U2VsZWN0b3IsIGR1cmF0aW9uU2VsZWN0b3IpIHtcbiAgICAgIHZhciBzb3VyY2UgPSB0aGlzO1xuICAgICAgcmV0dXJuIG5ldyBBbm9ueW1vdXNPYnNlcnZhYmxlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHZhciBtYXAgPSBuZXcgTWFwKCksXG4gICAgICAgICAgZ3JvdXBEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKSxcbiAgICAgICAgICByZWZDb3VudERpc3Bvc2FibGUgPSBuZXcgUmVmQ291bnREaXNwb3NhYmxlKGdyb3VwRGlzcG9zYWJsZSksXG4gICAgICAgICAgaGFuZGxlRXJyb3IgPSBmdW5jdGlvbiAoZSkgeyByZXR1cm4gZnVuY3Rpb24gKGl0ZW0pIHsgaXRlbS5vbkVycm9yKGUpOyB9OyB9O1xuXG4gICAgICAgIGdyb3VwRGlzcG9zYWJsZS5hZGQoXG4gICAgICAgICAgc291cmNlLnN1YnNjcmliZShmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgdmFyIGtleSA9IHRyeUNhdGNoKGtleVNlbGVjdG9yKSh4KTtcbiAgICAgICAgICAgIGlmIChrZXkgPT09IGVycm9yT2JqKSB7XG4gICAgICAgICAgICAgIG1hcC5mb3JFYWNoKGhhbmRsZUVycm9yKGtleS5lKSk7XG4gICAgICAgICAgICAgIHJldHVybiBvLm9uRXJyb3Ioa2V5LmUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZmlyZU5ld01hcEVudHJ5ID0gZmFsc2UsIHdyaXRlciA9IG1hcC5nZXQoa2V5KTtcbiAgICAgICAgICAgIGlmICh3cml0ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICB3cml0ZXIgPSBuZXcgU3ViamVjdCgpO1xuICAgICAgICAgICAgICBtYXAuc2V0KGtleSwgd3JpdGVyKTtcbiAgICAgICAgICAgICAgZmlyZU5ld01hcEVudHJ5ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZpcmVOZXdNYXBFbnRyeSkge1xuICAgICAgICAgICAgICB2YXIgZ3JvdXAgPSBuZXcgR3JvdXBlZE9ic2VydmFibGUoa2V5LCB3cml0ZXIsIHJlZkNvdW50RGlzcG9zYWJsZSksXG4gICAgICAgICAgICAgICAgZHVyYXRpb25Hcm91cCA9IG5ldyBHcm91cGVkT2JzZXJ2YWJsZShrZXksIHdyaXRlcik7XG4gICAgICAgICAgICAgIHZhciBkdXJhdGlvbiA9IHRyeUNhdGNoKGR1cmF0aW9uU2VsZWN0b3IpKGR1cmF0aW9uR3JvdXApO1xuICAgICAgICAgICAgICBpZiAoZHVyYXRpb24gPT09IGVycm9yT2JqKSB7XG4gICAgICAgICAgICAgICAgbWFwLmZvckVhY2goaGFuZGxlRXJyb3IoZHVyYXRpb24uZSkpO1xuICAgICAgICAgICAgICAgIHJldHVybiBvLm9uRXJyb3IoZHVyYXRpb24uZSk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBvLm9uTmV4dChncm91cCk7XG5cbiAgICAgICAgICAgICAgdmFyIG1kID0gbmV3IFNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlKCk7XG4gICAgICAgICAgICAgIGdyb3VwRGlzcG9zYWJsZS5hZGQobWQpO1xuXG4gICAgICAgICAgICAgIG1kLnNldERpc3Bvc2FibGUoZHVyYXRpb24udGFrZSgxKS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgbm9vcCxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgbWFwLmZvckVhY2goaGFuZGxlRXJyb3IoZSkpO1xuICAgICAgICAgICAgICAgICAgby5vbkVycm9yKGUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgaWYgKG1hcFsnZGVsZXRlJ10oa2V5KSkgeyB3cml0ZXIub25Db21wbGV0ZWQoKTsgfVxuICAgICAgICAgICAgICAgICAgZ3JvdXBEaXNwb3NhYmxlLnJlbW92ZShtZCk7XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IHg7XG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihlbGVtZW50U2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgIGVsZW1lbnQgPSB0cnlDYXRjaChlbGVtZW50U2VsZWN0b3IpKHgpO1xuICAgICAgICAgICAgICBpZiAoZWxlbWVudCA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgICAgICAgICBtYXAuZm9yRWFjaChoYW5kbGVFcnJvcihlbGVtZW50LmUpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gby5vbkVycm9yKGVsZW1lbnQuZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd3JpdGVyLm9uTmV4dChlbGVtZW50KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBtYXAuZm9yRWFjaChoYW5kbGVFcnJvcihlKSk7XG4gICAgICAgICAgby5vbkVycm9yKGUpO1xuICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgbWFwLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHsgaXRlbS5vbkNvbXBsZXRlZCgpOyB9KTtcbiAgICAgICAgICBvLm9uQ29tcGxldGVkKCk7XG4gICAgICAgIH0pKTtcblxuICAgICAgcmV0dXJuIHJlZkNvdW50RGlzcG9zYWJsZTtcbiAgICB9LCBzb3VyY2UpO1xuICB9O1xuXG4gIHZhciBVbmRlcmx5aW5nT2JzZXJ2YWJsZSA9IChmdW5jdGlvbiAoX19zdXBlcl9fKSB7XG4gICAgaW5oZXJpdHMoVW5kZXJseWluZ09ic2VydmFibGUsIF9fc3VwZXJfXyk7XG4gICAgZnVuY3Rpb24gVW5kZXJseWluZ09ic2VydmFibGUobSwgdSkge1xuICAgICAgdGhpcy5fbSA9IG07XG4gICAgICB0aGlzLl91ID0gdTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIFVuZGVybHlpbmdPYnNlcnZhYmxlLnByb3RvdHlwZS5zdWJzY3JpYmVDb3JlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiBuZXcgQmluYXJ5RGlzcG9zYWJsZSh0aGlzLl9tLmdldERpc3Bvc2FibGUoKSwgdGhpcy5fdS5zdWJzY3JpYmUobykpO1xuICAgIH07XG5cbiAgICByZXR1cm4gVW5kZXJseWluZ09ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZUJhc2UpKTtcblxuICB2YXIgR3JvdXBlZE9ic2VydmFibGUgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEdyb3VwZWRPYnNlcnZhYmxlLCBfX3N1cGVyX18pO1xuICAgIGZ1bmN0aW9uIEdyb3VwZWRPYnNlcnZhYmxlKGtleSwgdW5kZXJseWluZ09ic2VydmFibGUsIG1lcmdlZERpc3Bvc2FibGUpIHtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgICAgdGhpcy5rZXkgPSBrZXk7XG4gICAgICB0aGlzLnVuZGVybHlpbmdPYnNlcnZhYmxlID0gIW1lcmdlZERpc3Bvc2FibGUgP1xuICAgICAgICB1bmRlcmx5aW5nT2JzZXJ2YWJsZSA6XG4gICAgICAgIG5ldyBVbmRlcmx5aW5nT2JzZXJ2YWJsZShtZXJnZWREaXNwb3NhYmxlLCB1bmRlcmx5aW5nT2JzZXJ2YWJsZSk7XG4gICAgfVxuXG4gICAgR3JvdXBlZE9ic2VydmFibGUucHJvdG90eXBlLl9zdWJzY3JpYmUgPSBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHRoaXMudW5kZXJseWluZ09ic2VydmFibGUuc3Vic2NyaWJlKG8pO1xuICAgIH07XG5cbiAgICByZXR1cm4gR3JvdXBlZE9ic2VydmFibGU7XG4gIH0oT2JzZXJ2YWJsZSkpO1xuXG4gIHJldHVybiBSeDtcbn0pKTtcbiJdfQ==