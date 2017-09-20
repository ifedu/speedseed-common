var wrappy = require('wrappy');
var reqs = Object.create(null);
var once = require('once');
module.exports = wrappy(inflight);
function inflight(key, cb) {
    if (reqs[key]) {
        reqs[key].push(cb);
        return null;
    }
    else {
        reqs[key] = [cb];
        return makeres(key);
    }
}
function makeres(key) {
    return once(function RES() {
        var cbs = reqs[key];
        var len = cbs.length;
        var args = slice(arguments);
        // XXX It's somewhat ambiguous whether a new callback added in this
        // pass should be queued for later execution if something in the
        // list of callbacks throws, or if it should just be discarded.
        // However, it's such an edge case that it hardly matters, and either
        // choice is likely as surprising as the other.
        // As it happens, we do go ahead and schedule it for later execution.
        try {
            for (var i = 0; i < len; i++) {
                cbs[i].apply(null, args);
            }
        }
        finally {
            if (cbs.length > len) {
                // added more in the interim.
                // de-zalgo, just in case, but don't call again.
                cbs.splice(0, len);
                process.nextTick(function () {
                    RES.apply(null, args);
                });
            }
            else {
                delete reqs[key];
            }
        }
    });
}
function slice(args) {
    var length = args.length;
    var array = [];
    for (var i = 0; i < length; i++)
        array[i] = args[i];
    return array;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxpbmZsaWdodFxcaW5mbGlnaHQuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xcaW5mbGlnaHRcXGluZmxpZ2h0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUM5QixJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQzlCLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUUxQixNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUVqQyxrQkFBbUIsR0FBRyxFQUFFLEVBQUU7SUFDeEIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNkLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQTtJQUNiLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNOLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hCLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDckIsQ0FBQztBQUNILENBQUM7QUFFRCxpQkFBa0IsR0FBRztJQUNuQixNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ1YsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ25CLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUE7UUFDcEIsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRTNCLG1FQUFtRTtRQUNuRSxnRUFBZ0U7UUFDaEUsK0RBQStEO1FBQy9ELHFFQUFxRTtRQUNyRSwrQ0FBK0M7UUFDL0MscUVBQXFFO1FBQ3JFLElBQUksQ0FBQztZQUNILEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzdCLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzFCLENBQUM7UUFDSCxDQUFDO2dCQUFTLENBQUM7WUFDVCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JCLDZCQUE2QjtnQkFDN0IsZ0RBQWdEO2dCQUNoRCxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDbEIsT0FBTyxDQUFDLFFBQVEsQ0FBQztvQkFDZixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDdkIsQ0FBQyxDQUFDLENBQUE7WUFDSixDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ04sT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDbEIsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUM7QUFFRCxlQUFnQixJQUFJO0lBQ2xCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDeEIsSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFBO0lBRWQsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuRCxNQUFNLENBQUMsS0FBSyxDQUFBO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbInZhciB3cmFwcHkgPSByZXF1aXJlKCd3cmFwcHknKVxudmFyIHJlcXMgPSBPYmplY3QuY3JlYXRlKG51bGwpXG52YXIgb25jZSA9IHJlcXVpcmUoJ29uY2UnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHdyYXBweShpbmZsaWdodClcblxuZnVuY3Rpb24gaW5mbGlnaHQgKGtleSwgY2IpIHtcbiAgaWYgKHJlcXNba2V5XSkge1xuICAgIHJlcXNba2V5XS5wdXNoKGNiKVxuICAgIHJldHVybiBudWxsXG4gIH0gZWxzZSB7XG4gICAgcmVxc1trZXldID0gW2NiXVxuICAgIHJldHVybiBtYWtlcmVzKGtleSlcbiAgfVxufVxuXG5mdW5jdGlvbiBtYWtlcmVzIChrZXkpIHtcbiAgcmV0dXJuIG9uY2UoZnVuY3Rpb24gUkVTICgpIHtcbiAgICB2YXIgY2JzID0gcmVxc1trZXldXG4gICAgdmFyIGxlbiA9IGNicy5sZW5ndGhcbiAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cylcblxuICAgIC8vIFhYWCBJdCdzIHNvbWV3aGF0IGFtYmlndW91cyB3aGV0aGVyIGEgbmV3IGNhbGxiYWNrIGFkZGVkIGluIHRoaXNcbiAgICAvLyBwYXNzIHNob3VsZCBiZSBxdWV1ZWQgZm9yIGxhdGVyIGV4ZWN1dGlvbiBpZiBzb21ldGhpbmcgaW4gdGhlXG4gICAgLy8gbGlzdCBvZiBjYWxsYmFja3MgdGhyb3dzLCBvciBpZiBpdCBzaG91bGQganVzdCBiZSBkaXNjYXJkZWQuXG4gICAgLy8gSG93ZXZlciwgaXQncyBzdWNoIGFuIGVkZ2UgY2FzZSB0aGF0IGl0IGhhcmRseSBtYXR0ZXJzLCBhbmQgZWl0aGVyXG4gICAgLy8gY2hvaWNlIGlzIGxpa2VseSBhcyBzdXJwcmlzaW5nIGFzIHRoZSBvdGhlci5cbiAgICAvLyBBcyBpdCBoYXBwZW5zLCB3ZSBkbyBnbyBhaGVhZCBhbmQgc2NoZWR1bGUgaXQgZm9yIGxhdGVyIGV4ZWN1dGlvbi5cbiAgICB0cnkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjYnNbaV0uYXBwbHkobnVsbCwgYXJncylcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKGNicy5sZW5ndGggPiBsZW4pIHtcbiAgICAgICAgLy8gYWRkZWQgbW9yZSBpbiB0aGUgaW50ZXJpbS5cbiAgICAgICAgLy8gZGUtemFsZ28sIGp1c3QgaW4gY2FzZSwgYnV0IGRvbid0IGNhbGwgYWdhaW4uXG4gICAgICAgIGNicy5zcGxpY2UoMCwgbGVuKVxuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBSRVMuYXBwbHkobnVsbCwgYXJncylcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSByZXFzW2tleV1cbiAgICAgIH1cbiAgICB9XG4gIH0pXG59XG5cbmZ1bmN0aW9uIHNsaWNlIChhcmdzKSB7XG4gIHZhciBsZW5ndGggPSBhcmdzLmxlbmd0aFxuICB2YXIgYXJyYXkgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIGFycmF5W2ldID0gYXJnc1tpXVxuICByZXR1cm4gYXJyYXlcbn1cbiJdfQ==