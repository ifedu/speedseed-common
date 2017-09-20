'use strict';
var isPromise = require('is-promise');
/**
 * Return a function that will run a function asynchronously or synchronously
 *
 * example:
 * runAsync(wrappedFunction, callback)(...args);
 *
 * @param   {Function} func  Function to run
 * @param   {Function} cb    Callback function passed the `func` returned value
 * @return  {Function(arguments)} Arguments to pass to `func`. This function will in turn
 *                                return a Promise (Node >= 0.12) or call the callbacks.
 */
var runAsync = module.exports = function (func, cb) {
    cb = cb || function () { };
    return function () {
        var async = false;
        var args = arguments;
        var promise = new Promise(function (resolve, reject) {
            var answer = func.apply({
                async: function () {
                    async = true;
                    return function (err, value) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(value);
                        }
                    };
                }
            }, Array.prototype.slice.call(args));
            if (!async) {
                if (isPromise(answer)) {
                    answer.then(resolve, reject);
                }
                else {
                    resolve(answer);
                }
            }
        });
        promise.then(cb.bind(null, null), cb);
        return promise;
    };
};
runAsync.cb = function (func, cb) {
    return runAsync(function () {
        var args = Array.prototype.slice.call(arguments);
        if (args.length === func.length - 1) {
            args.push(this.async());
        }
        return func.apply(this, args);
    }, cb);
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxydW4tYXN5bmNcXGluZGV4LmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXHJ1bi1hc3luY1xcaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDO0FBRWIsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBRXRDOzs7Ozs7Ozs7O0dBVUc7QUFFSCxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsT0FBTyxHQUFHLFVBQVUsSUFBSSxFQUFFLEVBQUU7SUFDaEQsRUFBRSxHQUFHLEVBQUUsSUFBSSxjQUFhLENBQUMsQ0FBQztJQUUxQixNQUFNLENBQUM7UUFDTCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbEIsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDO1FBRXJCLElBQUksT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsT0FBTyxFQUFFLE1BQU07WUFDakQsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztnQkFDdEIsS0FBSyxFQUFFO29CQUNMLEtBQUssR0FBRyxJQUFJLENBQUM7b0JBQ2IsTUFBTSxDQUFDLFVBQVUsR0FBRyxFQUFFLEtBQUs7d0JBQ3pCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7NEJBQ1IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNkLENBQUM7d0JBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ04sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUNqQixDQUFDO29CQUNILENBQUMsQ0FBQztnQkFDSixDQUFDO2FBQ0YsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUVyQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ1gsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdEIsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQy9CLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04sT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNsQixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUV0QyxNQUFNLENBQUMsT0FBTyxDQUFDO0lBQ2pCLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQztBQUVGLFFBQVEsQ0FBQyxFQUFFLEdBQUcsVUFBVSxJQUFJLEVBQUUsRUFBRTtJQUM5QixNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2QsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDMUIsQ0FBQztRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbnZhciBpc1Byb21pc2UgPSByZXF1aXJlKCdpcy1wcm9taXNlJyk7XG5cbi8qKlxuICogUmV0dXJuIGEgZnVuY3Rpb24gdGhhdCB3aWxsIHJ1biBhIGZ1bmN0aW9uIGFzeW5jaHJvbm91c2x5IG9yIHN5bmNocm9ub3VzbHlcbiAqXG4gKiBleGFtcGxlOlxuICogcnVuQXN5bmMod3JhcHBlZEZ1bmN0aW9uLCBjYWxsYmFjaykoLi4uYXJncyk7XG4gKlxuICogQHBhcmFtICAge0Z1bmN0aW9ufSBmdW5jICBGdW5jdGlvbiB0byBydW5cbiAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gY2IgICAgQ2FsbGJhY2sgZnVuY3Rpb24gcGFzc2VkIHRoZSBgZnVuY2AgcmV0dXJuZWQgdmFsdWVcbiAqIEByZXR1cm4gIHtGdW5jdGlvbihhcmd1bWVudHMpfSBBcmd1bWVudHMgdG8gcGFzcyB0byBgZnVuY2AuIFRoaXMgZnVuY3Rpb24gd2lsbCBpbiB0dXJuXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgUHJvbWlzZSAoTm9kZSA+PSAwLjEyKSBvciBjYWxsIHRoZSBjYWxsYmFja3MuXG4gKi9cblxudmFyIHJ1bkFzeW5jID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZnVuYywgY2IpIHtcbiAgY2IgPSBjYiB8fCBmdW5jdGlvbiAoKSB7fTtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhc3luYyA9IGZhbHNlO1xuICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgYW5zd2VyID0gZnVuYy5hcHBseSh7XG4gICAgICAgIGFzeW5jOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgYXN5bmMgPSB0cnVlO1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXJyLCB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc29sdmUodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH0sIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3MpKTtcblxuICAgICAgaWYgKCFhc3luYykge1xuICAgICAgICBpZiAoaXNQcm9taXNlKGFuc3dlcikpIHtcbiAgICAgICAgICBhbnN3ZXIudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcHJvbWlzZS50aGVuKGNiLmJpbmQobnVsbCwgbnVsbCksIGNiKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG59O1xuXG5ydW5Bc3luYy5jYiA9IGZ1bmN0aW9uIChmdW5jLCBjYikge1xuICByZXR1cm4gcnVuQXN5bmMoZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IGZ1bmMubGVuZ3RoIC0gMSkge1xuICAgICAgYXJncy5wdXNoKHRoaXMuYXN5bmMoKSk7XG4gICAgfVxuICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9LCBjYik7XG59O1xuIl19