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
    var Observable = Rx.Observable, observableProto = Observable.prototype, AnonymousObservable = Rx.AnonymousObservable, observableThrow = Observable.throwError, observerCreate = Rx.Observer.create, SingleAssignmentDisposable = Rx.SingleAssignmentDisposable, CompositeDisposable = Rx.CompositeDisposable, AbstractObserver = Rx.internals.AbstractObserver, noop = Rx.helpers.noop, inherits = Rx.internals.inherits, isFunction = Rx.helpers.isFunction;
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
     * @constructor
     * Represents a join pattern over observable sequences.
     */
    function Pattern(patterns) {
        this.patterns = patterns;
    }
    /**
     *  Creates a pattern that matches the current plan matches and when the specified observable sequences has an available value.
     *  @param other Observable sequence to match in addition to the current pattern.
     *  @return {Pattern} Pattern object that matches when all observable sequences in the pattern have an available value.
     */
    Pattern.prototype.and = function (other) {
        return new Pattern(this.patterns.concat(other));
    };
    /**
     *  Matches when all observable sequences in the pattern (specified using a chain of and operators) have an available value and projects the values.
     *  @param {Function} selector Selector that will be invoked with available values from the source sequences, in the same order of the sequences in the pattern.
     *  @return {Plan} Plan that produces the projected values, to be fed (with other plans) to the when operator.
     */
    Pattern.prototype.thenDo = function (selector) {
        return new Plan(this, selector);
    };
    function Plan(expression, selector) {
        this.expression = expression;
        this.selector = selector;
    }
    function handleOnError(o) { return function (e) { o.onError(e); }; }
    function handleOnNext(self, observer) {
        return function onNext() {
            var result = tryCatch(self.selector).apply(self, arguments);
            if (result === errorObj) {
                return observer.onError(result.e);
            }
            observer.onNext(result);
        };
    }
    Plan.prototype.activate = function (externalSubscriptions, observer, deactivate) {
        var joinObservers = [], errHandler = handleOnError(observer);
        for (var i = 0, len = this.expression.patterns.length; i < len; i++) {
            joinObservers.push(planCreateObserver(externalSubscriptions, this.expression.patterns[i], errHandler));
        }
        var activePlan = new ActivePlan(joinObservers, handleOnNext(this, observer), function () {
            for (var j = 0, jlen = joinObservers.length; j < jlen; j++) {
                joinObservers[j].removeActivePlan(activePlan);
            }
            deactivate(activePlan);
        });
        for (i = 0, len = joinObservers.length; i < len; i++) {
            joinObservers[i].addActivePlan(activePlan);
        }
        return activePlan;
    };
    function planCreateObserver(externalSubscriptions, observable, onError) {
        var entry = externalSubscriptions.get(observable);
        if (!entry) {
            var observer = new JoinObserver(observable, onError);
            externalSubscriptions.set(observable, observer);
            return observer;
        }
        return entry;
    }
    function ActivePlan(joinObserverArray, onNext, onCompleted) {
        this.joinObserverArray = joinObserverArray;
        this.onNext = onNext;
        this.onCompleted = onCompleted;
        this.joinObservers = new Map();
        for (var i = 0, len = this.joinObserverArray.length; i < len; i++) {
            var joinObserver = this.joinObserverArray[i];
            this.joinObservers.set(joinObserver, joinObserver);
        }
    }
    ActivePlan.prototype.dequeue = function () {
        this.joinObservers.forEach(function (v) { v.queue.shift(); });
    };
    ActivePlan.prototype.match = function () {
        var i, len, hasValues = true;
        for (i = 0, len = this.joinObserverArray.length; i < len; i++) {
            if (this.joinObserverArray[i].queue.length === 0) {
                hasValues = false;
                break;
            }
        }
        if (hasValues) {
            var firstValues = [], isCompleted = false;
            for (i = 0, len = this.joinObserverArray.length; i < len; i++) {
                firstValues.push(this.joinObserverArray[i].queue[0]);
                this.joinObserverArray[i].queue[0].kind === 'C' && (isCompleted = true);
            }
            if (isCompleted) {
                this.onCompleted();
            }
            else {
                this.dequeue();
                var values = [];
                for (i = 0, len = firstValues.length; i < firstValues.length; i++) {
                    values.push(firstValues[i].value);
                }
                this.onNext.apply(this, values);
            }
        }
    };
    var JoinObserver = (function (__super__) {
        inherits(JoinObserver, __super__);
        function JoinObserver(source, onError) {
            __super__.call(this);
            this.source = source;
            this.onError = onError;
            this.queue = [];
            this.activePlans = [];
            this.subscription = new SingleAssignmentDisposable();
            this.isDisposed = false;
        }
        var JoinObserverPrototype = JoinObserver.prototype;
        JoinObserverPrototype.next = function (notification) {
            if (!this.isDisposed) {
                if (notification.kind === 'E') {
                    return this.onError(notification.error);
                }
                this.queue.push(notification);
                var activePlans = this.activePlans.slice(0);
                for (var i = 0, len = activePlans.length; i < len; i++) {
                    activePlans[i].match();
                }
            }
        };
        JoinObserverPrototype.error = noop;
        JoinObserverPrototype.completed = noop;
        JoinObserverPrototype.addActivePlan = function (activePlan) {
            this.activePlans.push(activePlan);
        };
        JoinObserverPrototype.subscribe = function () {
            this.subscription.setDisposable(this.source.materialize().subscribe(this));
        };
        JoinObserverPrototype.removeActivePlan = function (activePlan) {
            this.activePlans.splice(this.activePlans.indexOf(activePlan), 1);
            this.activePlans.length === 0 && this.dispose();
        };
        JoinObserverPrototype.dispose = function () {
            __super__.prototype.dispose.call(this);
            if (!this.isDisposed) {
                this.isDisposed = true;
                this.subscription.dispose();
            }
        };
        return JoinObserver;
    }(AbstractObserver));
    /**
     *  Creates a pattern that matches when both observable sequences have an available value.
     *
     *  @param right Observable sequence to match with the current sequence.
     *  @return {Pattern} Pattern object that matches when both observable sequences have an available value.
     */
    observableProto.and = function (right) {
        return new Pattern([this, right]);
    };
    /**
     *  Matches when the observable sequence has an available value and projects the value.
     *
     *  @param {Function} selector Selector that will be invoked for values in the source sequence.
     *  @returns {Plan} Plan that produces the projected values, to be fed (with other plans) to the when operator.
     */
    observableProto.thenDo = function (selector) {
        return new Pattern([this]).thenDo(selector);
    };
    /**
     *  Joins together the results from several patterns.
     *
     *  @param plans A series of plans (specified as an Array of as a series of arguments) created by use of the Then operator on patterns.
     *  @returns {Observable} Observable sequence with the results form matching several patterns.
     */
    Observable.when = function () {
        var len = arguments.length, plans;
        if (Array.isArray(arguments[0])) {
            plans = arguments[0];
        }
        else {
            plans = new Array(len);
            for (var i = 0; i < len; i++) {
                plans[i] = arguments[i];
            }
        }
        return new AnonymousObservable(function (o) {
            var activePlans = [], externalSubscriptions = new Map();
            var outObserver = observerCreate(function (x) { o.onNext(x); }, function (err) {
                externalSubscriptions.forEach(function (v) { v.onError(err); });
                o.onError(err);
            }, function (x) { o.onCompleted(); });
            try {
                for (var i = 0, len = plans.length; i < len; i++) {
                    activePlans.push(plans[i].activate(externalSubscriptions, outObserver, function (activePlan) {
                        var idx = activePlans.indexOf(activePlan);
                        activePlans.splice(idx, 1);
                        activePlans.length === 0 && o.onCompleted();
                    }));
                }
            }
            catch (e) {
                return observableThrow(e).subscribe(o);
            }
            var group = new CompositeDisposable();
            externalSubscriptions.forEach(function (joinObserver) {
                joinObserver.subscribe();
                group.add(joinObserver);
            });
            return group;
        });
    };
    return Rx;
}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccnguam9pbnBhdHRlcm5zLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXHJ4XFxkaXN0XFxyeC5qb2lucGF0dGVybnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsNkdBQTZHO0FBRTdHLENBQUM7QUFBQSxDQUFDLFVBQVUsT0FBTztJQUNqQixJQUFJLFdBQVcsR0FBRztRQUNoQixVQUFVLEVBQUUsSUFBSTtRQUNoQixRQUFRLEVBQUUsSUFBSTtLQUNmLENBQUM7SUFFRixxQkFBcUIsS0FBSztRQUN4QixNQUFNLENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQzNELENBQUM7SUFFRCxJQUFJLFdBQVcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPLE9BQU8sQ0FBQyxJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQ2pHLElBQUksVUFBVSxHQUFHLENBQUMsV0FBVyxDQUFDLE9BQU8sTUFBTSxDQUFDLElBQUksTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDNUYsSUFBSSxVQUFVLEdBQUcsV0FBVyxDQUFDLFdBQVcsSUFBSSxVQUFVLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxJQUFJLE1BQU0sQ0FBQyxDQUFDO0lBQ2hHLElBQUksUUFBUSxHQUFHLFdBQVcsQ0FBQyxXQUFX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QyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNqRCxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsV0FBVyxFQUFFLFVBQVUsVUFBVTt3QkFDekYsSUFBSSxHQUFHLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQzt3QkFDMUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQzNCLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDTixDQUFDO1lBQ0gsQ0FBQztZQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ1gsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekMsQ0FBQztZQUNELElBQUksS0FBSyxHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN0QyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsVUFBVSxZQUFZO2dCQUNsRCxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3pCLEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDMUIsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7SUFFRixNQUFNLENBQUMsRUFBRSxDQUFDO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0LCBBbGwgcmlnaHRzIHJlc2VydmVkLiBTZWUgTGljZW5zZS50eHQgaW4gdGhlIHByb2plY3Qgcm9vdCBmb3IgbGljZW5zZSBpbmZvcm1hdGlvbi5cblxuOyhmdW5jdGlvbiAoZmFjdG9yeSkge1xuICB2YXIgb2JqZWN0VHlwZXMgPSB7XG4gICAgJ2Z1bmN0aW9uJzogdHJ1ZSxcbiAgICAnb2JqZWN0JzogdHJ1ZVxuICB9O1xuXG4gIGZ1bmN0aW9uIGNoZWNrR2xvYmFsKHZhbHVlKSB7XG4gICAgcmV0dXJuICh2YWx1ZSAmJiB2YWx1ZS5PYmplY3QgPT09IE9iamVjdCkgPyB2YWx1ZSA6IG51bGw7XG4gIH1cblxuICB2YXIgZnJlZUV4cG9ydHMgPSAob2JqZWN0VHlwZXNbdHlwZW9mIGV4cG9ydHNdICYmIGV4cG9ydHMgJiYgIWV4cG9ydHMubm9kZVR5cGUpID8gZXhwb3J0cyA6IG51bGw7XG4gIHZhciBmcmVlTW9kdWxlID0gKG9iamVjdFR5cGVzW3R5cGVvZiBtb2R1bGVdICYmIG1vZHVsZSAmJiAhbW9kdWxlLm5vZGVUeXBlKSA/IG1vZHVsZSA6IG51bGw7XG4gIHZhciBmcmVlR2xvYmFsID0gY2hlY2tHbG9iYWwoZnJlZUV4cG9ydHMgJiYgZnJlZU1vZHVsZSAmJiB0eXBlb2YgZ2xvYmFsID09PSAnb2JqZWN0JyAmJiBnbG9iYWwpO1xuICB2YXIgZnJlZVNlbGYgPSBjaGVja0dsb2JhbChvYmplY3RUeXBlc1t0eXBlb2Ygc2VsZl0gJiYgc2VsZik7XG4gIHZhciBmcmVlV2luZG93ID0gY2hlY2tHbG9iYWwob2JqZWN0VHlwZXNbdHlwZW9mIHdpbmRvd10gJiYgd2luZG93KTtcbiAgdmFyIG1vZHVsZUV4cG9ydHMgPSAoZnJlZU1vZHVsZSAmJiBmcmVlTW9kdWxlLmV4cG9ydHMgPT09IGZyZWVFeHBvcnRzKSA/IGZyZWVFeHBvcnRzIDogbnVsbDtcbiAgdmFyIHRoaXNHbG9iYWwgPSBjaGVja0dsb2JhbChvYmplY3RUeXBlc1t0eXBlb2YgdGhpc10gJiYgdGhpcyk7XG4gIHZhciByb290ID0gZnJlZUdsb2JhbCB8fCAoKGZyZWVXaW5kb3cgIT09ICh0aGlzR2xvYmFsICYmIHRoaXNHbG9iYWwud2luZG93KSkgJiYgZnJlZVdpbmRvdykgfHwgZnJlZVNlbGYgfHwgdGhpc0dsb2JhbCB8fCBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuXG4gIC8vIEJlY2F1c2Ugb2YgYnVpbGQgb3B0aW1pemVyc1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKFsnLi9yeCddLCBmdW5jdGlvbiAoUngsIGV4cG9ydHMpIHtcbiAgICAgIHJldHVybiBmYWN0b3J5KHJvb3QsIGV4cG9ydHMsIFJ4KTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiYgbW9kdWxlLmV4cG9ydHMgPT09IGZyZWVFeHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJvb3QsIG1vZHVsZS5leHBvcnRzLCByZXF1aXJlKCcuL3J4JykpO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuUnggPSBmYWN0b3J5KHJvb3QsIHt9LCByb290LlJ4KTtcbiAgfVxufS5jYWxsKHRoaXMsIGZ1bmN0aW9uIChyb290LCBleHAsIFJ4LCB1bmRlZmluZWQpIHtcblxuICAvLyBBbGlhc2VzXG4gIHZhciBPYnNlcnZhYmxlID0gUnguT2JzZXJ2YWJsZSxcbiAgICBvYnNlcnZhYmxlUHJvdG8gPSBPYnNlcnZhYmxlLnByb3RvdHlwZSxcbiAgICBBbm9ueW1vdXNPYnNlcnZhYmxlID0gUnguQW5vbnltb3VzT2JzZXJ2YWJsZSxcbiAgICBvYnNlcnZhYmxlVGhyb3cgPSBPYnNlcnZhYmxlLnRocm93RXJyb3IsXG4gICAgb2JzZXJ2ZXJDcmVhdGUgPSBSeC5PYnNlcnZlci5jcmVhdGUsXG4gICAgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUgPSBSeC5TaW5nbGVBc3NpZ25tZW50RGlzcG9zYWJsZSxcbiAgICBDb21wb3NpdGVEaXNwb3NhYmxlID0gUnguQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgICBBYnN0cmFjdE9ic2VydmVyID0gUnguaW50ZXJuYWxzLkFic3RyYWN0T2JzZXJ2ZXIsXG4gICAgbm9vcCA9IFJ4LmhlbHBlcnMubm9vcCxcbiAgICBpbmhlcml0cyA9IFJ4LmludGVybmFscy5pbmhlcml0cyxcbiAgICBpc0Z1bmN0aW9uID0gUnguaGVscGVycy5pc0Z1bmN0aW9uO1xuXG4gIHZhciBlcnJvck9iaiA9IHtlOiB7fX07XG4gIFxuICBmdW5jdGlvbiB0cnlDYXRjaGVyR2VuKHRyeUNhdGNoVGFyZ2V0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIHRyeUNhdGNoZXIoKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gdHJ5Q2F0Y2hUYXJnZXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZXJyb3JPYmouZSA9IGU7XG4gICAgICAgIHJldHVybiBlcnJvck9iajtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgdmFyIHRyeUNhdGNoID0gUnguaW50ZXJuYWxzLnRyeUNhdGNoID0gZnVuY3Rpb24gdHJ5Q2F0Y2goZm4pIHtcbiAgICBpZiAoIWlzRnVuY3Rpb24oZm4pKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ2ZuIG11c3QgYmUgYSBmdW5jdGlvbicpOyB9XG4gICAgcmV0dXJuIHRyeUNhdGNoZXJHZW4oZm4pO1xuICB9O1xuXG4gIGZ1bmN0aW9uIHRocm93ZXIoZSkge1xuICAgIHRocm93IGU7XG4gIH1cblxuICB2YXIgTWFwID0gcm9vdC5NYXAgfHwgKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBNYXAoKSB7XG4gICAgICB0aGlzLnNpemUgPSAwO1xuICAgICAgdGhpcy5fdmFsdWVzID0gW107XG4gICAgICB0aGlzLl9rZXlzID0gW107XG4gICAgfVxuXG4gICAgTWFwLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICB2YXIgaSA9IHRoaXMuX2tleXMuaW5kZXhPZihrZXkpO1xuICAgICAgaWYgKGkgPT09IC0xKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgdGhpcy5fdmFsdWVzLnNwbGljZShpLCAxKTtcbiAgICAgIHRoaXMuX2tleXMuc3BsaWNlKGksIDEpO1xuICAgICAgdGhpcy5zaXplLS07XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgTWFwLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICB2YXIgaSA9IHRoaXMuX2tleXMuaW5kZXhPZihrZXkpO1xuICAgICAgcmV0dXJuIGkgPT09IC0xID8gdW5kZWZpbmVkIDogdGhpcy5fdmFsdWVzW2ldO1xuICAgIH07XG5cbiAgICBNYXAucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgICB2YXIgaSA9IHRoaXMuX2tleXMuaW5kZXhPZihrZXkpO1xuICAgICAgaWYgKGkgPT09IC0xKSB7XG4gICAgICAgIHRoaXMuX2tleXMucHVzaChrZXkpO1xuICAgICAgICB0aGlzLl92YWx1ZXMucHVzaCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuc2l6ZSsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fdmFsdWVzW2ldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgTWFwLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24gKGNiLCB0aGlzQXJnKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc2l6ZTsgaSsrKSB7XG4gICAgICAgIGNiLmNhbGwodGhpc0FyZywgdGhpcy5fdmFsdWVzW2ldLCB0aGlzLl9rZXlzW2ldKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIE1hcDtcbiAgfSgpKTtcblxuICAvKipcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIFJlcHJlc2VudHMgYSBqb2luIHBhdHRlcm4gb3ZlciBvYnNlcnZhYmxlIHNlcXVlbmNlcy5cbiAgICovXG4gIGZ1bmN0aW9uIFBhdHRlcm4ocGF0dGVybnMpIHtcbiAgICB0aGlzLnBhdHRlcm5zID0gcGF0dGVybnM7XG4gIH1cblxuICAvKipcbiAgICogIENyZWF0ZXMgYSBwYXR0ZXJuIHRoYXQgbWF0Y2hlcyB0aGUgY3VycmVudCBwbGFuIG1hdGNoZXMgYW5kIHdoZW4gdGhlIHNwZWNpZmllZCBvYnNlcnZhYmxlIHNlcXVlbmNlcyBoYXMgYW4gYXZhaWxhYmxlIHZhbHVlLlxuICAgKiAgQHBhcmFtIG90aGVyIE9ic2VydmFibGUgc2VxdWVuY2UgdG8gbWF0Y2ggaW4gYWRkaXRpb24gdG8gdGhlIGN1cnJlbnQgcGF0dGVybi5cbiAgICogIEByZXR1cm4ge1BhdHRlcm59IFBhdHRlcm4gb2JqZWN0IHRoYXQgbWF0Y2hlcyB3aGVuIGFsbCBvYnNlcnZhYmxlIHNlcXVlbmNlcyBpbiB0aGUgcGF0dGVybiBoYXZlIGFuIGF2YWlsYWJsZSB2YWx1ZS5cbiAgICovXG4gIFBhdHRlcm4ucHJvdG90eXBlLmFuZCA9IGZ1bmN0aW9uIChvdGhlcikge1xuICAgIHJldHVybiBuZXcgUGF0dGVybih0aGlzLnBhdHRlcm5zLmNvbmNhdChvdGhlcikpO1xuICB9O1xuXG4gIC8qKlxuICAgKiAgTWF0Y2hlcyB3aGVuIGFsbCBvYnNlcnZhYmxlIHNlcXVlbmNlcyBpbiB0aGUgcGF0dGVybiAoc3BlY2lmaWVkIHVzaW5nIGEgY2hhaW4gb2YgYW5kIG9wZXJhdG9ycykgaGF2ZSBhbiBhdmFpbGFibGUgdmFsdWUgYW5kIHByb2plY3RzIHRoZSB2YWx1ZXMuXG4gICAqICBAcGFyYW0ge0Z1bmN0aW9ufSBzZWxlY3RvciBTZWxlY3RvciB0aGF0IHdpbGwgYmUgaW52b2tlZCB3aXRoIGF2YWlsYWJsZSB2YWx1ZXMgZnJvbSB0aGUgc291cmNlIHNlcXVlbmNlcywgaW4gdGhlIHNhbWUgb3JkZXIgb2YgdGhlIHNlcXVlbmNlcyBpbiB0aGUgcGF0dGVybi5cbiAgICogIEByZXR1cm4ge1BsYW59IFBsYW4gdGhhdCBwcm9kdWNlcyB0aGUgcHJvamVjdGVkIHZhbHVlcywgdG8gYmUgZmVkICh3aXRoIG90aGVyIHBsYW5zKSB0byB0aGUgd2hlbiBvcGVyYXRvci5cbiAgICovXG4gIFBhdHRlcm4ucHJvdG90eXBlLnRoZW5EbyA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJldHVybiBuZXcgUGxhbih0aGlzLCBzZWxlY3Rvcik7XG4gIH07XG5cbiAgZnVuY3Rpb24gUGxhbihleHByZXNzaW9uLCBzZWxlY3Rvcikge1xuICAgIHRoaXMuZXhwcmVzc2lvbiA9IGV4cHJlc3Npb247XG4gICAgdGhpcy5zZWxlY3RvciA9IHNlbGVjdG9yO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlT25FcnJvcihvKSB7IHJldHVybiBmdW5jdGlvbiAoZSkgeyBvLm9uRXJyb3IoZSk7IH07IH1cbiAgZnVuY3Rpb24gaGFuZGxlT25OZXh0KHNlbGYsIG9ic2VydmVyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIG9uTmV4dCAoKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdHJ5Q2F0Y2goc2VsZi5zZWxlY3RvcikuYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcbiAgICAgIGlmIChyZXN1bHQgPT09IGVycm9yT2JqKSB7IHJldHVybiBvYnNlcnZlci5vbkVycm9yKHJlc3VsdC5lKTsgfVxuICAgICAgb2JzZXJ2ZXIub25OZXh0KHJlc3VsdCk7XG4gICAgfTtcbiAgfVxuXG4gIFBsYW4ucHJvdG90eXBlLmFjdGl2YXRlID0gZnVuY3Rpb24gKGV4dGVybmFsU3Vic2NyaXB0aW9ucywgb2JzZXJ2ZXIsIGRlYWN0aXZhdGUpIHtcbiAgICB2YXIgam9pbk9ic2VydmVycyA9IFtdLCBlcnJIYW5kbGVyID0gaGFuZGxlT25FcnJvcihvYnNlcnZlcik7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuZXhwcmVzc2lvbi5wYXR0ZXJucy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgam9pbk9ic2VydmVycy5wdXNoKHBsYW5DcmVhdGVPYnNlcnZlcihleHRlcm5hbFN1YnNjcmlwdGlvbnMsIHRoaXMuZXhwcmVzc2lvbi5wYXR0ZXJuc1tpXSwgZXJySGFuZGxlcikpO1xuICAgIH1cbiAgICB2YXIgYWN0aXZlUGxhbiA9IG5ldyBBY3RpdmVQbGFuKGpvaW5PYnNlcnZlcnMsIGhhbmRsZU9uTmV4dCh0aGlzLCBvYnNlcnZlciksIGZ1bmN0aW9uICgpIHtcbiAgICAgIGZvciAodmFyIGogPSAwLCBqbGVuID0gam9pbk9ic2VydmVycy5sZW5ndGg7IGogPCBqbGVuOyBqKyspIHtcbiAgICAgICAgam9pbk9ic2VydmVyc1tqXS5yZW1vdmVBY3RpdmVQbGFuKGFjdGl2ZVBsYW4pO1xuICAgICAgfVxuICAgICAgZGVhY3RpdmF0ZShhY3RpdmVQbGFuKTtcbiAgICB9KTtcbiAgICBmb3IgKGkgPSAwLCBsZW4gPSBqb2luT2JzZXJ2ZXJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBqb2luT2JzZXJ2ZXJzW2ldLmFkZEFjdGl2ZVBsYW4oYWN0aXZlUGxhbik7XG4gICAgfVxuICAgIHJldHVybiBhY3RpdmVQbGFuO1xuICB9O1xuXG4gIGZ1bmN0aW9uIHBsYW5DcmVhdGVPYnNlcnZlcihleHRlcm5hbFN1YnNjcmlwdGlvbnMsIG9ic2VydmFibGUsIG9uRXJyb3IpIHtcbiAgICB2YXIgZW50cnkgPSBleHRlcm5hbFN1YnNjcmlwdGlvbnMuZ2V0KG9ic2VydmFibGUpO1xuICAgIGlmICghZW50cnkpIHtcbiAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBKb2luT2JzZXJ2ZXIob2JzZXJ2YWJsZSwgb25FcnJvcik7XG4gICAgICBleHRlcm5hbFN1YnNjcmlwdGlvbnMuc2V0KG9ic2VydmFibGUsIG9ic2VydmVyKTtcbiAgICAgIHJldHVybiBvYnNlcnZlcjtcbiAgICB9XG4gICAgcmV0dXJuIGVudHJ5O1xuICB9XG5cbiAgZnVuY3Rpb24gQWN0aXZlUGxhbihqb2luT2JzZXJ2ZXJBcnJheSwgb25OZXh0LCBvbkNvbXBsZXRlZCkge1xuICAgIHRoaXMuam9pbk9ic2VydmVyQXJyYXkgPSBqb2luT2JzZXJ2ZXJBcnJheTtcbiAgICB0aGlzLm9uTmV4dCA9IG9uTmV4dDtcbiAgICB0aGlzLm9uQ29tcGxldGVkID0gb25Db21wbGV0ZWQ7XG4gICAgdGhpcy5qb2luT2JzZXJ2ZXJzID0gbmV3IE1hcCgpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLmpvaW5PYnNlcnZlckFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgam9pbk9ic2VydmVyID0gdGhpcy5qb2luT2JzZXJ2ZXJBcnJheVtpXTtcbiAgICAgIHRoaXMuam9pbk9ic2VydmVycy5zZXQoam9pbk9ic2VydmVyLCBqb2luT2JzZXJ2ZXIpO1xuICAgIH1cbiAgfVxuXG4gIEFjdGl2ZVBsYW4ucHJvdG90eXBlLmRlcXVldWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5qb2luT2JzZXJ2ZXJzLmZvckVhY2goZnVuY3Rpb24gKHYpIHsgdi5xdWV1ZS5zaGlmdCgpOyB9KTtcbiAgfTtcblxuICBBY3RpdmVQbGFuLnByb3RvdHlwZS5tYXRjaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaSwgbGVuLCBoYXNWYWx1ZXMgPSB0cnVlO1xuICAgIGZvciAoaSA9IDAsIGxlbiA9IHRoaXMuam9pbk9ic2VydmVyQXJyYXkubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLmpvaW5PYnNlcnZlckFycmF5W2ldLnF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBoYXNWYWx1ZXMgPSBmYWxzZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChoYXNWYWx1ZXMpIHtcbiAgICAgIHZhciBmaXJzdFZhbHVlcyA9IFtdLFxuICAgICAgICAgIGlzQ29tcGxldGVkID0gZmFsc2U7XG4gICAgICBmb3IgKGkgPSAwLCBsZW4gPSB0aGlzLmpvaW5PYnNlcnZlckFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGZpcnN0VmFsdWVzLnB1c2godGhpcy5qb2luT2JzZXJ2ZXJBcnJheVtpXS5xdWV1ZVswXSk7XG4gICAgICAgIHRoaXMuam9pbk9ic2VydmVyQXJyYXlbaV0ucXVldWVbMF0ua2luZCA9PT0gJ0MnICYmIChpc0NvbXBsZXRlZCA9IHRydWUpO1xuICAgICAgfVxuICAgICAgaWYgKGlzQ29tcGxldGVkKSB7XG4gICAgICAgIHRoaXMub25Db21wbGV0ZWQoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZGVxdWV1ZSgpO1xuICAgICAgICB2YXIgdmFsdWVzID0gW107XG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IGZpcnN0VmFsdWVzLmxlbmd0aDsgaSA8IGZpcnN0VmFsdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFsdWVzLnB1c2goZmlyc3RWYWx1ZXNbaV0udmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub25OZXh0LmFwcGx5KHRoaXMsIHZhbHVlcyk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHZhciBKb2luT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEpvaW5PYnNlcnZlciwgX19zdXBlcl9fKTtcblxuICAgIGZ1bmN0aW9uIEpvaW5PYnNlcnZlcihzb3VyY2UsIG9uRXJyb3IpIHtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aGlzLm9uRXJyb3IgPSBvbkVycm9yO1xuICAgICAgdGhpcy5xdWV1ZSA9IFtdO1xuICAgICAgdGhpcy5hY3RpdmVQbGFucyA9IFtdO1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb24gPSBuZXcgU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUoKTtcbiAgICAgIHRoaXMuaXNEaXNwb3NlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBKb2luT2JzZXJ2ZXJQcm90b3R5cGUgPSBKb2luT2JzZXJ2ZXIucHJvdG90eXBlO1xuXG4gICAgSm9pbk9ic2VydmVyUHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAobm90aWZpY2F0aW9uKSB7XG4gICAgICBpZiAoIXRoaXMuaXNEaXNwb3NlZCkge1xuICAgICAgICBpZiAobm90aWZpY2F0aW9uLmtpbmQgPT09ICdFJykge1xuICAgICAgICAgIHJldHVybiB0aGlzLm9uRXJyb3Iobm90aWZpY2F0aW9uLmVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnF1ZXVlLnB1c2gobm90aWZpY2F0aW9uKTtcbiAgICAgICAgdmFyIGFjdGl2ZVBsYW5zID0gdGhpcy5hY3RpdmVQbGFucy5zbGljZSgwKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFjdGl2ZVBsYW5zLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgYWN0aXZlUGxhbnNbaV0ubWF0Y2goKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBKb2luT2JzZXJ2ZXJQcm90b3R5cGUuZXJyb3IgPSBub29wO1xuICAgIEpvaW5PYnNlcnZlclByb3RvdHlwZS5jb21wbGV0ZWQgPSBub29wO1xuXG4gICAgSm9pbk9ic2VydmVyUHJvdG90eXBlLmFkZEFjdGl2ZVBsYW4gPSBmdW5jdGlvbiAoYWN0aXZlUGxhbikge1xuICAgICAgdGhpcy5hY3RpdmVQbGFucy5wdXNoKGFjdGl2ZVBsYW4pO1xuICAgIH07XG5cbiAgICBKb2luT2JzZXJ2ZXJQcm90b3R5cGUuc3Vic2NyaWJlID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb24uc2V0RGlzcG9zYWJsZSh0aGlzLnNvdXJjZS5tYXRlcmlhbGl6ZSgpLnN1YnNjcmliZSh0aGlzKSk7XG4gICAgfTtcblxuICAgIEpvaW5PYnNlcnZlclByb3RvdHlwZS5yZW1vdmVBY3RpdmVQbGFuID0gZnVuY3Rpb24gKGFjdGl2ZVBsYW4pIHtcbiAgICAgIHRoaXMuYWN0aXZlUGxhbnMuc3BsaWNlKHRoaXMuYWN0aXZlUGxhbnMuaW5kZXhPZihhY3RpdmVQbGFuKSwgMSk7XG4gICAgICB0aGlzLmFjdGl2ZVBsYW5zLmxlbmd0aCA9PT0gMCAmJiB0aGlzLmRpc3Bvc2UoKTtcbiAgICB9O1xuXG4gICAgSm9pbk9ic2VydmVyUHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBfX3N1cGVyX18ucHJvdG90eXBlLmRpc3Bvc2UuY2FsbCh0aGlzKTtcbiAgICAgIGlmICghdGhpcy5pc0Rpc3Bvc2VkKSB7XG4gICAgICAgIHRoaXMuaXNEaXNwb3NlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuc3Vic2NyaXB0aW9uLmRpc3Bvc2UoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIEpvaW5PYnNlcnZlcjtcbiAgfSAoQWJzdHJhY3RPYnNlcnZlcikpO1xuXG4gIC8qKlxuICAgKiAgQ3JlYXRlcyBhIHBhdHRlcm4gdGhhdCBtYXRjaGVzIHdoZW4gYm90aCBvYnNlcnZhYmxlIHNlcXVlbmNlcyBoYXZlIGFuIGF2YWlsYWJsZSB2YWx1ZS5cbiAgICpcbiAgICogIEBwYXJhbSByaWdodCBPYnNlcnZhYmxlIHNlcXVlbmNlIHRvIG1hdGNoIHdpdGggdGhlIGN1cnJlbnQgc2VxdWVuY2UuXG4gICAqICBAcmV0dXJuIHtQYXR0ZXJufSBQYXR0ZXJuIG9iamVjdCB0aGF0IG1hdGNoZXMgd2hlbiBib3RoIG9ic2VydmFibGUgc2VxdWVuY2VzIGhhdmUgYW4gYXZhaWxhYmxlIHZhbHVlLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLmFuZCA9IGZ1bmN0aW9uIChyaWdodCkge1xuICAgIHJldHVybiBuZXcgUGF0dGVybihbdGhpcywgcmlnaHRdKTtcbiAgfTtcblxuICAvKipcbiAgICogIE1hdGNoZXMgd2hlbiB0aGUgb2JzZXJ2YWJsZSBzZXF1ZW5jZSBoYXMgYW4gYXZhaWxhYmxlIHZhbHVlIGFuZCBwcm9qZWN0cyB0aGUgdmFsdWUuXG4gICAqXG4gICAqICBAcGFyYW0ge0Z1bmN0aW9ufSBzZWxlY3RvciBTZWxlY3RvciB0aGF0IHdpbGwgYmUgaW52b2tlZCBmb3IgdmFsdWVzIGluIHRoZSBzb3VyY2Ugc2VxdWVuY2UuXG4gICAqICBAcmV0dXJucyB7UGxhbn0gUGxhbiB0aGF0IHByb2R1Y2VzIHRoZSBwcm9qZWN0ZWQgdmFsdWVzLCB0byBiZSBmZWQgKHdpdGggb3RoZXIgcGxhbnMpIHRvIHRoZSB3aGVuIG9wZXJhdG9yLlxuICAgKi9cbiAgb2JzZXJ2YWJsZVByb3RvLnRoZW5EbyA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIHJldHVybiBuZXcgUGF0dGVybihbdGhpc10pLnRoZW5EbyhzZWxlY3Rvcik7XG4gIH07XG5cbiAgLyoqXG4gICAqICBKb2lucyB0b2dldGhlciB0aGUgcmVzdWx0cyBmcm9tIHNldmVyYWwgcGF0dGVybnMuXG4gICAqXG4gICAqICBAcGFyYW0gcGxhbnMgQSBzZXJpZXMgb2YgcGxhbnMgKHNwZWNpZmllZCBhcyBhbiBBcnJheSBvZiBhcyBhIHNlcmllcyBvZiBhcmd1bWVudHMpIGNyZWF0ZWQgYnkgdXNlIG9mIHRoZSBUaGVuIG9wZXJhdG9yIG9uIHBhdHRlcm5zLlxuICAgKiAgQHJldHVybnMge09ic2VydmFibGV9IE9ic2VydmFibGUgc2VxdWVuY2Ugd2l0aCB0aGUgcmVzdWx0cyBmb3JtIG1hdGNoaW5nIHNldmVyYWwgcGF0dGVybnMuXG4gICAqL1xuICBPYnNlcnZhYmxlLndoZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIHBsYW5zO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGFyZ3VtZW50c1swXSkpIHtcbiAgICAgIHBsYW5zID0gYXJndW1lbnRzWzBdO1xuICAgIH0gZWxzZSB7XG4gICAgICBwbGFucyA9IG5ldyBBcnJheShsZW4pO1xuICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7IHBsYW5zW2ldID0gYXJndW1lbnRzW2ldOyB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbiAobykge1xuICAgICAgdmFyIGFjdGl2ZVBsYW5zID0gW10sXG4gICAgICAgICAgZXh0ZXJuYWxTdWJzY3JpcHRpb25zID0gbmV3IE1hcCgpO1xuICAgICAgdmFyIG91dE9ic2VydmVyID0gb2JzZXJ2ZXJDcmVhdGUoXG4gICAgICAgIGZ1bmN0aW9uICh4KSB7IG8ub25OZXh0KHgpOyB9LFxuICAgICAgICBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgZXh0ZXJuYWxTdWJzY3JpcHRpb25zLmZvckVhY2goZnVuY3Rpb24gKHYpIHsgdi5vbkVycm9yKGVycik7IH0pO1xuICAgICAgICAgIG8ub25FcnJvcihlcnIpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoeCkgeyBvLm9uQ29tcGxldGVkKCk7IH1cbiAgICAgICk7XG4gICAgICB0cnkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGxhbnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICBhY3RpdmVQbGFucy5wdXNoKHBsYW5zW2ldLmFjdGl2YXRlKGV4dGVybmFsU3Vic2NyaXB0aW9ucywgb3V0T2JzZXJ2ZXIsIGZ1bmN0aW9uIChhY3RpdmVQbGFuKSB7XG4gICAgICAgICAgICB2YXIgaWR4ID0gYWN0aXZlUGxhbnMuaW5kZXhPZihhY3RpdmVQbGFuKTtcbiAgICAgICAgICAgIGFjdGl2ZVBsYW5zLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgYWN0aXZlUGxhbnMubGVuZ3RoID09PSAwICYmIG8ub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIG9ic2VydmFibGVUaHJvdyhlKS5zdWJzY3JpYmUobyk7XG4gICAgICB9XG4gICAgICB2YXIgZ3JvdXAgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICAgICAgZXh0ZXJuYWxTdWJzY3JpcHRpb25zLmZvckVhY2goZnVuY3Rpb24gKGpvaW5PYnNlcnZlcikge1xuICAgICAgICBqb2luT2JzZXJ2ZXIuc3Vic2NyaWJlKCk7XG4gICAgICAgIGdyb3VwLmFkZChqb2luT2JzZXJ2ZXIpO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBncm91cDtcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gUng7XG59KSk7XG4iXX0=