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
    var Scheduler = Rx.Scheduler, ScheduledItem = Rx.internals.ScheduledItem, SchedulePeriodicRecursive = Rx.internals.SchedulePeriodicRecursive, PriorityQueue = Rx.internals.PriorityQueue, inherits = Rx.internals.inherits, defaultSubComparer = Rx.helpers.defaultSubComparer, notImplemented = Rx.helpers.notImplemented;
    /** Provides a set of extension methods for virtual time scheduling. */
    var VirtualTimeScheduler = Rx.VirtualTimeScheduler = (function (__super__) {
        inherits(VirtualTimeScheduler, __super__);
        /**
         * Creates a new virtual time scheduler with the specified initial clock value and absolute time comparer.
         *
         * @constructor
         * @param {Number} initialClock Initial value for the clock.
         * @param {Function} comparer Comparer to determine causality of events based on absolute time.
         */
        function VirtualTimeScheduler(initialClock, comparer) {
            this.clock = initialClock;
            this.comparer = comparer;
            this.isEnabled = false;
            this.queue = new PriorityQueue(1024);
            __super__.call(this);
        }
        var VirtualTimeSchedulerPrototype = VirtualTimeScheduler.prototype;
        VirtualTimeSchedulerPrototype.now = function () {
            return this.toAbsoluteTime(this.clock);
        };
        VirtualTimeSchedulerPrototype.schedule = function (state, action) {
            return this.scheduleAbsolute(state, this.clock, action);
        };
        VirtualTimeSchedulerPrototype.scheduleFuture = function (state, dueTime, action) {
            var dt = dueTime instanceof Date ?
                this.toRelativeTime(dueTime - this.now()) :
                this.toRelativeTime(dueTime);
            return this.scheduleRelative(state, dt, action);
        };
        /**
         * Adds a relative time value to an absolute time value.
         * @param {Number} absolute Absolute virtual time value.
         * @param {Number} relative Relative virtual time value to add.
         * @return {Number} Resulting absolute virtual time sum value.
         */
        VirtualTimeSchedulerPrototype.add = notImplemented;
        /**
         * Converts an absolute time to a number
         * @param {Any} The absolute time.
         * @returns {Number} The absolute time in ms
         */
        VirtualTimeSchedulerPrototype.toAbsoluteTime = notImplemented;
        /**
         * Converts the TimeSpan value to a relative virtual time value.
         * @param {Number} timeSpan TimeSpan value to convert.
         * @return {Number} Corresponding relative virtual time value.
         */
        VirtualTimeSchedulerPrototype.toRelativeTime = notImplemented;
        /**
         * Schedules a periodic piece of work by dynamically discovering the scheduler's capabilities. The periodic task will be emulated using recursive scheduling.
         * @param {Mixed} state Initial state passed to the action upon the first iteration.
         * @param {Number} period Period for running the work periodically.
         * @param {Function} action Action to be executed, potentially updating the state.
         * @returns {Disposable} The disposable object used to cancel the scheduled recurring action (best effort).
         */
        VirtualTimeSchedulerPrototype.schedulePeriodic = function (state, period, action) {
            var s = new SchedulePeriodicRecursive(this, state, period, action);
            return s.start();
        };
        /**
         * Schedules an action to be executed after dueTime.
         * @param {Mixed} state State passed to the action to be executed.
         * @param {Number} dueTime Relative time after which to execute the action.
         * @param {Function} action Action to be executed.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        VirtualTimeSchedulerPrototype.scheduleRelative = function (state, dueTime, action) {
            var runAt = this.add(this.clock, dueTime);
            return this.scheduleAbsolute(state, runAt, action);
        };
        /**
         * Starts the virtual time scheduler.
         */
        VirtualTimeSchedulerPrototype.start = function () {
            if (!this.isEnabled) {
                this.isEnabled = true;
                do {
                    var next = this.getNext();
                    if (next !== null) {
                        this.comparer(next.dueTime, this.clock) > 0 && (this.clock = next.dueTime);
                        next.invoke();
                    }
                    else {
                        this.isEnabled = false;
                    }
                } while (this.isEnabled);
            }
        };
        /**
         * Stops the virtual time scheduler.
         */
        VirtualTimeSchedulerPrototype.stop = function () {
            this.isEnabled = false;
        };
        /**
         * Advances the scheduler's clock to the specified time, running all work till that point.
         * @param {Number} time Absolute time to advance the scheduler's clock to.
         */
        VirtualTimeSchedulerPrototype.advanceTo = function (time) {
            var dueToClock = this.comparer(this.clock, time);
            if (this.comparer(this.clock, time) > 0) {
                throw new ArgumentOutOfRangeError();
            }
            if (dueToClock === 0) {
                return;
            }
            if (!this.isEnabled) {
                this.isEnabled = true;
                do {
                    var next = this.getNext();
                    if (next !== null && this.comparer(next.dueTime, time) <= 0) {
                        this.comparer(next.dueTime, this.clock) > 0 && (this.clock = next.dueTime);
                        next.invoke();
                    }
                    else {
                        this.isEnabled = false;
                    }
                } while (this.isEnabled);
                this.clock = time;
            }
        };
        /**
         * Advances the scheduler's clock by the specified relative time, running all work scheduled for that timespan.
         * @param {Number} time Relative time to advance the scheduler's clock by.
         */
        VirtualTimeSchedulerPrototype.advanceBy = function (time) {
            var dt = this.add(this.clock, time), dueToClock = this.comparer(this.clock, dt);
            if (dueToClock > 0) {
                throw new ArgumentOutOfRangeError();
            }
            if (dueToClock === 0) {
                return;
            }
            this.advanceTo(dt);
        };
        /**
         * Advances the scheduler's clock by the specified relative time.
         * @param {Number} time Relative time to advance the scheduler's clock by.
         */
        VirtualTimeSchedulerPrototype.sleep = function (time) {
            var dt = this.add(this.clock, time);
            if (this.comparer(this.clock, dt) >= 0) {
                throw new ArgumentOutOfRangeError();
            }
            this.clock = dt;
        };
        /**
         * Gets the next scheduled item to be executed.
         * @returns {ScheduledItem} The next scheduled item.
         */
        VirtualTimeSchedulerPrototype.getNext = function () {
            while (this.queue.length > 0) {
                var next = this.queue.peek();
                if (next.isCancelled()) {
                    this.queue.dequeue();
                }
                else {
                    return next;
                }
            }
            return null;
        };
        /**
         * Schedules an action to be executed at dueTime.
         * @param {Mixed} state State passed to the action to be executed.
         * @param {Number} dueTime Absolute time at which to execute the action.
         * @param {Function} action Action to be executed.
         * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
         */
        VirtualTimeSchedulerPrototype.scheduleAbsolute = function (state, dueTime, action) {
            var self = this;
            function run(scheduler, state1) {
                self.queue.remove(si);
                return action(scheduler, state1);
            }
            var si = new ScheduledItem(this, state, run, dueTime, this.comparer);
            this.queue.enqueue(si);
            return si.disposable;
        };
        return VirtualTimeScheduler;
    }(Scheduler));
    /** Provides a virtual time scheduler that uses Date for absolute time and number for relative time. */
    Rx.HistoricalScheduler = (function (__super__) {
        inherits(HistoricalScheduler, __super__);
        /**
         * Creates a new historical scheduler with the specified initial clock value.
         * @constructor
         * @param {Number} initialClock Initial value for the clock.
         * @param {Function} comparer Comparer to determine causality of events based on absolute time.
         */
        function HistoricalScheduler(initialClock, comparer) {
            var clock = initialClock == null ? 0 : initialClock;
            var cmp = comparer || defaultSubComparer;
            __super__.call(this, clock, cmp);
        }
        var HistoricalSchedulerProto = HistoricalScheduler.prototype;
        /**
         * Adds a relative time value to an absolute time value.
         * @param {Number} absolute Absolute virtual time value.
         * @param {Number} relative Relative virtual time value to add.
         * @return {Number} Resulting absolute virtual time sum value.
         */
        HistoricalSchedulerProto.add = function (absolute, relative) {
            return absolute + relative;
        };
        HistoricalSchedulerProto.toAbsoluteTime = function (absolute) {
            return new Date(absolute).getTime();
        };
        /**
         * Converts the TimeSpan value to a relative virtual time value.
         * @memberOf HistoricalScheduler
         * @param {Number} timeSpan TimeSpan value to convert.
         * @return {Number} Corresponding relative virtual time value.
         */
        HistoricalSchedulerProto.toRelativeTime = function (timeSpan) {
            return timeSpan;
        };
        return HistoricalScheduler;
    }(Rx.VirtualTimeScheduler));
    return Rx;
}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyeFxcZGlzdFxccngudmlydHVhbHRpbWUuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xccnhcXGRpc3RcXHJ4LnZpcnR1YWx0aW1lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDZHQUE2RztBQUU3RyxDQUFDO0FBQUEsQ0FBQyxVQUFVLE9BQU87SUFDakIsSUFBSSxXQUFXLEdBQUc7UUFDaEIsVUFBVSxFQUFFLElBQUk7UUFDaEIsUUFBUSxFQUFFLElBQUk7S0FDZixDQUFDO0lBRUYscUJBQXFCLEtBQUs7UUFDeEIsTUFBTSxDQUFDLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQztJQUMzRCxDQUFDO0lBRUQsSUFBSSxXQUFXLEdBQUcsQ0FBQyxXQUFXLENBQUMsT0FBTyxPQUFPLENBQUMsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsT0FBTyxHQUFHLElBQUksQ0FBQztJQUNqRyxJQUFJLFVBQVUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQzVGLElBQUksVUFBVSxHQUFHLFdBQVcsQ0FBQyxXQUFXLElBQUksVUFBVSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsSUFBSSxNQUFNLENBQUMsQ0FBQztJQUNoRyxJQUFJLFFBQVEsR0FBRyxXQUFXLENBQUMsV0FBVyxD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UUFBUTtZQUNqRCxJQUFJLEtBQUssR0FBRyxZQUFZLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxZQUFZLENBQUM7WUFDcEQsSUFBSSxHQUFHLEdBQUcsUUFBUSxJQUFJLGtCQUFrQixDQUFDO1lBQ3pDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNuQyxDQUFDO1FBRUQsSUFBSSx3QkFBd0IsR0FBRyxtQkFBbUIsQ0FBQyxTQUFTLENBQUM7UUFFN0Q7Ozs7O1dBS0c7UUFDSCx3QkFBd0IsQ0FBQyxHQUFHLEdBQUcsVUFBVSxRQUFRLEVBQUUsUUFBUTtZQUN6RCxNQUFNLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUM3QixDQUFDLENBQUM7UUFFRix3QkFBd0IsQ0FBQyxjQUFjLEdBQUcsVUFBVSxRQUFRO1lBQzFELE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN0QyxDQUFDLENBQUM7UUFFRjs7Ozs7V0FLRztRQUNILHdCQUF3QixDQUFDLGNBQWMsR0FBRyxVQUFVLFFBQVE7WUFDMUQsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNsQixDQUFDLENBQUM7UUFFRixNQUFNLENBQUMsbUJBQW1CLENBQUM7SUFDN0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7SUFFNUIsTUFBTSxDQUFDLEVBQUUsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCwgQWxsIHJpZ2h0cyByZXNlcnZlZC4gU2VlIExpY2Vuc2UudHh0IGluIHRoZSBwcm9qZWN0IHJvb3QgZm9yIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG5cbjsoZnVuY3Rpb24gKGZhY3RvcnkpIHtcbiAgdmFyIG9iamVjdFR5cGVzID0ge1xuICAgICdmdW5jdGlvbic6IHRydWUsXG4gICAgJ29iamVjdCc6IHRydWVcbiAgfTtcblxuICBmdW5jdGlvbiBjaGVja0dsb2JhbCh2YWx1ZSkge1xuICAgIHJldHVybiAodmFsdWUgJiYgdmFsdWUuT2JqZWN0ID09PSBPYmplY3QpID8gdmFsdWUgOiBudWxsO1xuICB9XG5cbiAgdmFyIGZyZWVFeHBvcnRzID0gKG9iamVjdFR5cGVzW3R5cGVvZiBleHBvcnRzXSAmJiBleHBvcnRzICYmICFleHBvcnRzLm5vZGVUeXBlKSA/IGV4cG9ydHMgOiBudWxsO1xuICB2YXIgZnJlZU1vZHVsZSA9IChvYmplY3RUeXBlc1t0eXBlb2YgbW9kdWxlXSAmJiBtb2R1bGUgJiYgIW1vZHVsZS5ub2RlVHlwZSkgPyBtb2R1bGUgOiBudWxsO1xuICB2YXIgZnJlZUdsb2JhbCA9IGNoZWNrR2xvYmFsKGZyZWVFeHBvcnRzICYmIGZyZWVNb2R1bGUgJiYgdHlwZW9mIGdsb2JhbCA9PT0gJ29iamVjdCcgJiYgZ2xvYmFsKTtcbiAgdmFyIGZyZWVTZWxmID0gY2hlY2tHbG9iYWwob2JqZWN0VHlwZXNbdHlwZW9mIHNlbGZdICYmIHNlbGYpO1xuICB2YXIgZnJlZVdpbmRvdyA9IGNoZWNrR2xvYmFsKG9iamVjdFR5cGVzW3R5cGVvZiB3aW5kb3ddICYmIHdpbmRvdyk7XG4gIHZhciBtb2R1bGVFeHBvcnRzID0gKGZyZWVNb2R1bGUgJiYgZnJlZU1vZHVsZS5leHBvcnRzID09PSBmcmVlRXhwb3J0cykgPyBmcmVlRXhwb3J0cyA6IG51bGw7XG4gIHZhciB0aGlzR2xvYmFsID0gY2hlY2tHbG9iYWwob2JqZWN0VHlwZXNbdHlwZW9mIHRoaXNdICYmIHRoaXMpO1xuICB2YXIgcm9vdCA9IGZyZWVHbG9iYWwgfHwgKChmcmVlV2luZG93ICE9PSAodGhpc0dsb2JhbCAmJiB0aGlzR2xvYmFsLndpbmRvdykpICYmIGZyZWVXaW5kb3cpIHx8IGZyZWVTZWxmIHx8IHRoaXNHbG9iYWwgfHwgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblxuICAvLyBCZWNhdXNlIG9mIGJ1aWxkIG9wdGltaXplcnNcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShbJy4vcngnXSwgZnVuY3Rpb24gKFJ4LCBleHBvcnRzKSB7XG4gICAgICByZXR1cm4gZmFjdG9yeShyb290LCBleHBvcnRzLCBSeCk7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlICYmIG1vZHVsZS5leHBvcnRzID09PSBmcmVlRXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyb290LCBtb2R1bGUuZXhwb3J0cywgcmVxdWlyZSgnLi9yeCcpKTtcbiAgfSBlbHNlIHtcbiAgICByb290LlJ4ID0gZmFjdG9yeShyb290LCB7fSwgcm9vdC5SeCk7XG4gIH1cbn0uY2FsbCh0aGlzLCBmdW5jdGlvbiAocm9vdCwgZXhwLCBSeCwgdW5kZWZpbmVkKSB7XG5cbiAgLy8gQWxpYXNlc1xuICB2YXIgU2NoZWR1bGVyID0gUnguU2NoZWR1bGVyLFxuICAgIFNjaGVkdWxlZEl0ZW0gPSBSeC5pbnRlcm5hbHMuU2NoZWR1bGVkSXRlbSxcbiAgICBTY2hlZHVsZVBlcmlvZGljUmVjdXJzaXZlICA9IFJ4LmludGVybmFscy5TY2hlZHVsZVBlcmlvZGljUmVjdXJzaXZlLFxuICAgIFByaW9yaXR5UXVldWUgPSBSeC5pbnRlcm5hbHMuUHJpb3JpdHlRdWV1ZSxcbiAgICBpbmhlcml0cyA9IFJ4LmludGVybmFscy5pbmhlcml0cyxcbiAgICBkZWZhdWx0U3ViQ29tcGFyZXIgPSBSeC5oZWxwZXJzLmRlZmF1bHRTdWJDb21wYXJlcixcbiAgICBub3RJbXBsZW1lbnRlZCA9IFJ4LmhlbHBlcnMubm90SW1wbGVtZW50ZWQ7XG5cbiAgLyoqIFByb3ZpZGVzIGEgc2V0IG9mIGV4dGVuc2lvbiBtZXRob2RzIGZvciB2aXJ0dWFsIHRpbWUgc2NoZWR1bGluZy4gKi9cbiAgdmFyIFZpcnR1YWxUaW1lU2NoZWR1bGVyID0gUnguVmlydHVhbFRpbWVTY2hlZHVsZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKFZpcnR1YWxUaW1lU2NoZWR1bGVyLCBfX3N1cGVyX18pO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyB2aXJ0dWFsIHRpbWUgc2NoZWR1bGVyIHdpdGggdGhlIHNwZWNpZmllZCBpbml0aWFsIGNsb2NrIHZhbHVlIGFuZCBhYnNvbHV0ZSB0aW1lIGNvbXBhcmVyLlxuICAgICAqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGluaXRpYWxDbG9jayBJbml0aWFsIHZhbHVlIGZvciB0aGUgY2xvY2suXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY29tcGFyZXIgQ29tcGFyZXIgdG8gZGV0ZXJtaW5lIGNhdXNhbGl0eSBvZiBldmVudHMgYmFzZWQgb24gYWJzb2x1dGUgdGltZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBWaXJ0dWFsVGltZVNjaGVkdWxlcihpbml0aWFsQ2xvY2ssIGNvbXBhcmVyKSB7XG4gICAgICB0aGlzLmNsb2NrID0gaW5pdGlhbENsb2NrO1xuICAgICAgdGhpcy5jb21wYXJlciA9IGNvbXBhcmVyO1xuICAgICAgdGhpcy5pc0VuYWJsZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMucXVldWUgPSBuZXcgUHJpb3JpdHlRdWV1ZSgxMDI0KTtcbiAgICAgIF9fc3VwZXJfXy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIHZhciBWaXJ0dWFsVGltZVNjaGVkdWxlclByb3RvdHlwZSA9IFZpcnR1YWxUaW1lU2NoZWR1bGVyLnByb3RvdHlwZTtcblxuICAgIFZpcnR1YWxUaW1lU2NoZWR1bGVyUHJvdG90eXBlLm5vdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB0aGlzLnRvQWJzb2x1dGVUaW1lKHRoaXMuY2xvY2spO1xuICAgIH07XG5cbiAgICBWaXJ0dWFsVGltZVNjaGVkdWxlclByb3RvdHlwZS5zY2hlZHVsZSA9IGZ1bmN0aW9uIChzdGF0ZSwgYWN0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5zY2hlZHVsZUFic29sdXRlKHN0YXRlLCB0aGlzLmNsb2NrLCBhY3Rpb24pO1xuICAgIH07XG5cbiAgICBWaXJ0dWFsVGltZVNjaGVkdWxlclByb3RvdHlwZS5zY2hlZHVsZUZ1dHVyZSA9IGZ1bmN0aW9uIChzdGF0ZSwgZHVlVGltZSwgYWN0aW9uKSB7XG4gICAgICB2YXIgZHQgPSBkdWVUaW1lIGluc3RhbmNlb2YgRGF0ZSA/XG4gICAgICAgIHRoaXMudG9SZWxhdGl2ZVRpbWUoZHVlVGltZSAtIHRoaXMubm93KCkpIDpcbiAgICAgICAgdGhpcy50b1JlbGF0aXZlVGltZShkdWVUaW1lKTtcblxuICAgICAgcmV0dXJuIHRoaXMuc2NoZWR1bGVSZWxhdGl2ZShzdGF0ZSwgZHQsIGFjdGlvbik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSByZWxhdGl2ZSB0aW1lIHZhbHVlIHRvIGFuIGFic29sdXRlIHRpbWUgdmFsdWUuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGFic29sdXRlIEFic29sdXRlIHZpcnR1YWwgdGltZSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gcmVsYXRpdmUgUmVsYXRpdmUgdmlydHVhbCB0aW1lIHZhbHVlIHRvIGFkZC5cbiAgICAgKiBAcmV0dXJuIHtOdW1iZXJ9IFJlc3VsdGluZyBhYnNvbHV0ZSB2aXJ0dWFsIHRpbWUgc3VtIHZhbHVlLlxuICAgICAqL1xuICAgIFZpcnR1YWxUaW1lU2NoZWR1bGVyUHJvdG90eXBlLmFkZCA9IG5vdEltcGxlbWVudGVkO1xuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgYW4gYWJzb2x1dGUgdGltZSB0byBhIG51bWJlclxuICAgICAqIEBwYXJhbSB7QW55fSBUaGUgYWJzb2x1dGUgdGltZS5cbiAgICAgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgYWJzb2x1dGUgdGltZSBpbiBtc1xuICAgICAqL1xuICAgIFZpcnR1YWxUaW1lU2NoZWR1bGVyUHJvdG90eXBlLnRvQWJzb2x1dGVUaW1lID0gbm90SW1wbGVtZW50ZWQ7XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0aGUgVGltZVNwYW4gdmFsdWUgdG8gYSByZWxhdGl2ZSB2aXJ0dWFsIHRpbWUgdmFsdWUuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHRpbWVTcGFuIFRpbWVTcGFuIHZhbHVlIHRvIGNvbnZlcnQuXG4gICAgICogQHJldHVybiB7TnVtYmVyfSBDb3JyZXNwb25kaW5nIHJlbGF0aXZlIHZpcnR1YWwgdGltZSB2YWx1ZS5cbiAgICAgKi9cbiAgICBWaXJ0dWFsVGltZVNjaGVkdWxlclByb3RvdHlwZS50b1JlbGF0aXZlVGltZSA9IG5vdEltcGxlbWVudGVkO1xuXG4gICAgLyoqXG4gICAgICogU2NoZWR1bGVzIGEgcGVyaW9kaWMgcGllY2Ugb2Ygd29yayBieSBkeW5hbWljYWxseSBkaXNjb3ZlcmluZyB0aGUgc2NoZWR1bGVyJ3MgY2FwYWJpbGl0aWVzLiBUaGUgcGVyaW9kaWMgdGFzayB3aWxsIGJlIGVtdWxhdGVkIHVzaW5nIHJlY3Vyc2l2ZSBzY2hlZHVsaW5nLlxuICAgICAqIEBwYXJhbSB7TWl4ZWR9IHN0YXRlIEluaXRpYWwgc3RhdGUgcGFzc2VkIHRvIHRoZSBhY3Rpb24gdXBvbiB0aGUgZmlyc3QgaXRlcmF0aW9uLlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBwZXJpb2QgUGVyaW9kIGZvciBydW5uaW5nIHRoZSB3b3JrIHBlcmlvZGljYWxseS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBhY3Rpb24gQWN0aW9uIHRvIGJlIGV4ZWN1dGVkLCBwb3RlbnRpYWxseSB1cGRhdGluZyB0aGUgc3RhdGUuXG4gICAgICogQHJldHVybnMge0Rpc3Bvc2FibGV9IFRoZSBkaXNwb3NhYmxlIG9iamVjdCB1c2VkIHRvIGNhbmNlbCB0aGUgc2NoZWR1bGVkIHJlY3VycmluZyBhY3Rpb24gKGJlc3QgZWZmb3J0KS5cbiAgICAgKi9cbiAgICBWaXJ0dWFsVGltZVNjaGVkdWxlclByb3RvdHlwZS5zY2hlZHVsZVBlcmlvZGljID0gZnVuY3Rpb24gKHN0YXRlLCBwZXJpb2QsIGFjdGlvbikge1xuICAgICAgdmFyIHMgPSBuZXcgU2NoZWR1bGVQZXJpb2RpY1JlY3Vyc2l2ZSh0aGlzLCBzdGF0ZSwgcGVyaW9kLCBhY3Rpb24pO1xuICAgICAgcmV0dXJuIHMuc3RhcnQoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2NoZWR1bGVzIGFuIGFjdGlvbiB0byBiZSBleGVjdXRlZCBhZnRlciBkdWVUaW1lLlxuICAgICAqIEBwYXJhbSB7TWl4ZWR9IHN0YXRlIFN0YXRlIHBhc3NlZCB0byB0aGUgYWN0aW9uIHRvIGJlIGV4ZWN1dGVkLlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBkdWVUaW1lIFJlbGF0aXZlIHRpbWUgYWZ0ZXIgd2hpY2ggdG8gZXhlY3V0ZSB0aGUgYWN0aW9uLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGFjdGlvbiBBY3Rpb24gdG8gYmUgZXhlY3V0ZWQuXG4gICAgICogQHJldHVybnMge0Rpc3Bvc2FibGV9IFRoZSBkaXNwb3NhYmxlIG9iamVjdCB1c2VkIHRvIGNhbmNlbCB0aGUgc2NoZWR1bGVkIGFjdGlvbiAoYmVzdCBlZmZvcnQpLlxuICAgICAqL1xuICAgIFZpcnR1YWxUaW1lU2NoZWR1bGVyUHJvdG90eXBlLnNjaGVkdWxlUmVsYXRpdmUgPSBmdW5jdGlvbiAoc3RhdGUsIGR1ZVRpbWUsIGFjdGlvbikge1xuICAgICAgdmFyIHJ1bkF0ID0gdGhpcy5hZGQodGhpcy5jbG9jaywgZHVlVGltZSk7XG4gICAgICByZXR1cm4gdGhpcy5zY2hlZHVsZUFic29sdXRlKHN0YXRlLCBydW5BdCwgYWN0aW9uKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU3RhcnRzIHRoZSB2aXJ0dWFsIHRpbWUgc2NoZWR1bGVyLlxuICAgICAqL1xuICAgIFZpcnR1YWxUaW1lU2NoZWR1bGVyUHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCF0aGlzLmlzRW5hYmxlZCkge1xuICAgICAgICB0aGlzLmlzRW5hYmxlZCA9IHRydWU7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICB2YXIgbmV4dCA9IHRoaXMuZ2V0TmV4dCgpO1xuICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLmNvbXBhcmVyKG5leHQuZHVlVGltZSwgdGhpcy5jbG9jaykgPiAwICYmICh0aGlzLmNsb2NrID0gbmV4dC5kdWVUaW1lKTtcbiAgICAgICAgICAgIG5leHQuaW52b2tlKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaXNFbmFibGVkID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICh0aGlzLmlzRW5hYmxlZCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFN0b3BzIHRoZSB2aXJ0dWFsIHRpbWUgc2NoZWR1bGVyLlxuICAgICAqL1xuICAgIFZpcnR1YWxUaW1lU2NoZWR1bGVyUHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLmlzRW5hYmxlZCA9IGZhbHNlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBZHZhbmNlcyB0aGUgc2NoZWR1bGVyJ3MgY2xvY2sgdG8gdGhlIHNwZWNpZmllZCB0aW1lLCBydW5uaW5nIGFsbCB3b3JrIHRpbGwgdGhhdCBwb2ludC5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdGltZSBBYnNvbHV0ZSB0aW1lIHRvIGFkdmFuY2UgdGhlIHNjaGVkdWxlcidzIGNsb2NrIHRvLlxuICAgICAqL1xuICAgIFZpcnR1YWxUaW1lU2NoZWR1bGVyUHJvdG90eXBlLmFkdmFuY2VUbyA9IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgICB2YXIgZHVlVG9DbG9jayA9IHRoaXMuY29tcGFyZXIodGhpcy5jbG9jaywgdGltZSk7XG4gICAgICBpZiAodGhpcy5jb21wYXJlcih0aGlzLmNsb2NrLCB0aW1lKSA+IDApIHsgdGhyb3cgbmV3IEFyZ3VtZW50T3V0T2ZSYW5nZUVycm9yKCk7IH1cbiAgICAgIGlmIChkdWVUb0Nsb2NrID09PSAwKSB7IHJldHVybjsgfVxuICAgICAgaWYgKCF0aGlzLmlzRW5hYmxlZCkge1xuICAgICAgICB0aGlzLmlzRW5hYmxlZCA9IHRydWU7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICB2YXIgbmV4dCA9IHRoaXMuZ2V0TmV4dCgpO1xuICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIHRoaXMuY29tcGFyZXIobmV4dC5kdWVUaW1lLCB0aW1lKSA8PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmNvbXBhcmVyKG5leHQuZHVlVGltZSwgdGhpcy5jbG9jaykgPiAwICYmICh0aGlzLmNsb2NrID0gbmV4dC5kdWVUaW1lKTtcbiAgICAgICAgICAgIG5leHQuaW52b2tlKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaXNFbmFibGVkID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICh0aGlzLmlzRW5hYmxlZCk7XG4gICAgICAgIHRoaXMuY2xvY2sgPSB0aW1lO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBZHZhbmNlcyB0aGUgc2NoZWR1bGVyJ3MgY2xvY2sgYnkgdGhlIHNwZWNpZmllZCByZWxhdGl2ZSB0aW1lLCBydW5uaW5nIGFsbCB3b3JrIHNjaGVkdWxlZCBmb3IgdGhhdCB0aW1lc3Bhbi5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdGltZSBSZWxhdGl2ZSB0aW1lIHRvIGFkdmFuY2UgdGhlIHNjaGVkdWxlcidzIGNsb2NrIGJ5LlxuICAgICAqL1xuICAgIFZpcnR1YWxUaW1lU2NoZWR1bGVyUHJvdG90eXBlLmFkdmFuY2VCeSA9IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgICB2YXIgZHQgPSB0aGlzLmFkZCh0aGlzLmNsb2NrLCB0aW1lKSxcbiAgICAgICAgICBkdWVUb0Nsb2NrID0gdGhpcy5jb21wYXJlcih0aGlzLmNsb2NrLCBkdCk7XG4gICAgICBpZiAoZHVlVG9DbG9jayA+IDApIHsgdGhyb3cgbmV3IEFyZ3VtZW50T3V0T2ZSYW5nZUVycm9yKCk7IH1cbiAgICAgIGlmIChkdWVUb0Nsb2NrID09PSAwKSB7ICByZXR1cm47IH1cblxuICAgICAgdGhpcy5hZHZhbmNlVG8oZHQpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBZHZhbmNlcyB0aGUgc2NoZWR1bGVyJ3MgY2xvY2sgYnkgdGhlIHNwZWNpZmllZCByZWxhdGl2ZSB0aW1lLlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIFJlbGF0aXZlIHRpbWUgdG8gYWR2YW5jZSB0aGUgc2NoZWR1bGVyJ3MgY2xvY2sgYnkuXG4gICAgICovXG4gICAgVmlydHVhbFRpbWVTY2hlZHVsZXJQcm90b3R5cGUuc2xlZXAgPSBmdW5jdGlvbiAodGltZSkge1xuICAgICAgdmFyIGR0ID0gdGhpcy5hZGQodGhpcy5jbG9jaywgdGltZSk7XG4gICAgICBpZiAodGhpcy5jb21wYXJlcih0aGlzLmNsb2NrLCBkdCkgPj0gMCkgeyB0aHJvdyBuZXcgQXJndW1lbnRPdXRPZlJhbmdlRXJyb3IoKTsgfVxuXG4gICAgICB0aGlzLmNsb2NrID0gZHQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIG5leHQgc2NoZWR1bGVkIGl0ZW0gdG8gYmUgZXhlY3V0ZWQuXG4gICAgICogQHJldHVybnMge1NjaGVkdWxlZEl0ZW19IFRoZSBuZXh0IHNjaGVkdWxlZCBpdGVtLlxuICAgICAqL1xuICAgIFZpcnR1YWxUaW1lU2NoZWR1bGVyUHJvdG90eXBlLmdldE5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB3aGlsZSAodGhpcy5xdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBuZXh0ID0gdGhpcy5xdWV1ZS5wZWVrKCk7XG4gICAgICAgIGlmIChuZXh0LmlzQ2FuY2VsbGVkKCkpIHtcbiAgICAgICAgICB0aGlzLnF1ZXVlLmRlcXVldWUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gbmV4dDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNjaGVkdWxlcyBhbiBhY3Rpb24gdG8gYmUgZXhlY3V0ZWQgYXQgZHVlVGltZS5cbiAgICAgKiBAcGFyYW0ge01peGVkfSBzdGF0ZSBTdGF0ZSBwYXNzZWQgdG8gdGhlIGFjdGlvbiB0byBiZSBleGVjdXRlZC5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZHVlVGltZSBBYnNvbHV0ZSB0aW1lIGF0IHdoaWNoIHRvIGV4ZWN1dGUgdGhlIGFjdGlvbi5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBhY3Rpb24gQWN0aW9uIHRvIGJlIGV4ZWN1dGVkLlxuICAgICAqIEByZXR1cm5zIHtEaXNwb3NhYmxlfSBUaGUgZGlzcG9zYWJsZSBvYmplY3QgdXNlZCB0byBjYW5jZWwgdGhlIHNjaGVkdWxlZCBhY3Rpb24gKGJlc3QgZWZmb3J0KS5cbiAgICAgKi9cbiAgICBWaXJ0dWFsVGltZVNjaGVkdWxlclByb3RvdHlwZS5zY2hlZHVsZUFic29sdXRlID0gZnVuY3Rpb24gKHN0YXRlLCBkdWVUaW1lLCBhY3Rpb24pIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgZnVuY3Rpb24gcnVuKHNjaGVkdWxlciwgc3RhdGUxKSB7XG4gICAgICAgIHNlbGYucXVldWUucmVtb3ZlKHNpKTtcbiAgICAgICAgcmV0dXJuIGFjdGlvbihzY2hlZHVsZXIsIHN0YXRlMSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBzaSA9IG5ldyBTY2hlZHVsZWRJdGVtKHRoaXMsIHN0YXRlLCBydW4sIGR1ZVRpbWUsIHRoaXMuY29tcGFyZXIpO1xuICAgICAgdGhpcy5xdWV1ZS5lbnF1ZXVlKHNpKTtcblxuICAgICAgcmV0dXJuIHNpLmRpc3Bvc2FibGU7XG4gICAgfTtcblxuICAgIHJldHVybiBWaXJ0dWFsVGltZVNjaGVkdWxlcjtcbiAgfShTY2hlZHVsZXIpKTtcblxuICAvKiogUHJvdmlkZXMgYSB2aXJ0dWFsIHRpbWUgc2NoZWR1bGVyIHRoYXQgdXNlcyBEYXRlIGZvciBhYnNvbHV0ZSB0aW1lIGFuZCBudW1iZXIgZm9yIHJlbGF0aXZlIHRpbWUuICovXG4gIFJ4Lkhpc3RvcmljYWxTY2hlZHVsZXIgPSAoZnVuY3Rpb24gKF9fc3VwZXJfXykge1xuICAgIGluaGVyaXRzKEhpc3RvcmljYWxTY2hlZHVsZXIsIF9fc3VwZXJfXyk7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IGhpc3RvcmljYWwgc2NoZWR1bGVyIHdpdGggdGhlIHNwZWNpZmllZCBpbml0aWFsIGNsb2NrIHZhbHVlLlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBpbml0aWFsQ2xvY2sgSW5pdGlhbCB2YWx1ZSBmb3IgdGhlIGNsb2NrLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbXBhcmVyIENvbXBhcmVyIHRvIGRldGVybWluZSBjYXVzYWxpdHkgb2YgZXZlbnRzIGJhc2VkIG9uIGFic29sdXRlIHRpbWUuXG4gICAgICovXG4gICAgZnVuY3Rpb24gSGlzdG9yaWNhbFNjaGVkdWxlcihpbml0aWFsQ2xvY2ssIGNvbXBhcmVyKSB7XG4gICAgICB2YXIgY2xvY2sgPSBpbml0aWFsQ2xvY2sgPT0gbnVsbCA/IDAgOiBpbml0aWFsQ2xvY2s7XG4gICAgICB2YXIgY21wID0gY29tcGFyZXIgfHwgZGVmYXVsdFN1YkNvbXBhcmVyO1xuICAgICAgX19zdXBlcl9fLmNhbGwodGhpcywgY2xvY2ssIGNtcCk7XG4gICAgfVxuXG4gICAgdmFyIEhpc3RvcmljYWxTY2hlZHVsZXJQcm90byA9IEhpc3RvcmljYWxTY2hlZHVsZXIucHJvdG90eXBlO1xuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIHJlbGF0aXZlIHRpbWUgdmFsdWUgdG8gYW4gYWJzb2x1dGUgdGltZSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gYWJzb2x1dGUgQWJzb2x1dGUgdmlydHVhbCB0aW1lIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSByZWxhdGl2ZSBSZWxhdGl2ZSB2aXJ0dWFsIHRpbWUgdmFsdWUgdG8gYWRkLlxuICAgICAqIEByZXR1cm4ge051bWJlcn0gUmVzdWx0aW5nIGFic29sdXRlIHZpcnR1YWwgdGltZSBzdW0gdmFsdWUuXG4gICAgICovXG4gICAgSGlzdG9yaWNhbFNjaGVkdWxlclByb3RvLmFkZCA9IGZ1bmN0aW9uIChhYnNvbHV0ZSwgcmVsYXRpdmUpIHtcbiAgICAgIHJldHVybiBhYnNvbHV0ZSArIHJlbGF0aXZlO1xuICAgIH07XG5cbiAgICBIaXN0b3JpY2FsU2NoZWR1bGVyUHJvdG8udG9BYnNvbHV0ZVRpbWUgPSBmdW5jdGlvbiAoYWJzb2x1dGUpIHtcbiAgICAgIHJldHVybiBuZXcgRGF0ZShhYnNvbHV0ZSkuZ2V0VGltZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0aGUgVGltZVNwYW4gdmFsdWUgdG8gYSByZWxhdGl2ZSB2aXJ0dWFsIHRpbWUgdmFsdWUuXG4gICAgICogQG1lbWJlck9mIEhpc3RvcmljYWxTY2hlZHVsZXJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdGltZVNwYW4gVGltZVNwYW4gdmFsdWUgdG8gY29udmVydC5cbiAgICAgKiBAcmV0dXJuIHtOdW1iZXJ9IENvcnJlc3BvbmRpbmcgcmVsYXRpdmUgdmlydHVhbCB0aW1lIHZhbHVlLlxuICAgICAqL1xuICAgIEhpc3RvcmljYWxTY2hlZHVsZXJQcm90by50b1JlbGF0aXZlVGltZSA9IGZ1bmN0aW9uICh0aW1lU3Bhbikge1xuICAgICAgcmV0dXJuIHRpbWVTcGFuO1xuICAgIH07XG5cbiAgICByZXR1cm4gSGlzdG9yaWNhbFNjaGVkdWxlcjtcbiAgfShSeC5WaXJ0dWFsVGltZVNjaGVkdWxlcikpO1xuXG4gIHJldHVybiBSeDtcbn0pKTtcbiJdfQ==