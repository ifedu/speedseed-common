var fs = require('fs');
var core;
if (process.platform === 'win32' || global.TESTING_WINDOWS) {
    core = require('./windows.js');
}
else {
    core = require('./mode.js');
}
module.exports = isexe;
isexe.sync = sync;
function isexe(path, options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    if (!cb) {
        if (typeof Promise !== 'function') {
            throw new TypeError('callback not provided');
        }
        return new Promise(function (resolve, reject) {
            isexe(path, options || {}, function (er, is) {
                if (er) {
                    reject(er);
                }
                else {
                    resolve(is);
                }
            });
        });
    }
    core(path, options || {}, function (er, is) {
        // ignore EACCES because that just means we aren't allowed to run it
        if (er) {
            if (er.code === 'EACCES' || options && options.ignoreErrors) {
                er = null;
                is = false;
            }
        }
        cb(er, is);
    });
}
function sync(path, options) {
    // my kingdom for a filtered catch
    try {
        return core.sync(path, options || {});
    }
    catch (er) {
        if (options && options.ignoreErrors || er.code === 'EACCES') {
            return false;
        }
        else {
            throw er;
        }
    }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxpc2V4ZVxcaW5kZXguanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xcaXNleGVcXGluZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUN0QixJQUFJLElBQUksQ0FBQTtBQUNSLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxJQUFJLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBQzNELElBQUksR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUE7QUFDaEMsQ0FBQztBQUFDLElBQUksQ0FBQyxDQUFDO0lBQ04sSUFBSSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQTtBQUM3QixDQUFDO0FBRUQsTUFBTSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7QUFDdEIsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7QUFFakIsZUFBZ0IsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQy9CLEVBQUUsQ0FBQyxDQUFDLE9BQU8sT0FBTyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDbEMsRUFBRSxHQUFHLE9BQU8sQ0FBQTtRQUNaLE9BQU8sR0FBRyxFQUFFLENBQUE7SUFDZCxDQUFDO0lBRUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ1IsRUFBRSxDQUFDLENBQUMsT0FBTyxPQUFPLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNsQyxNQUFNLElBQUksU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLE9BQU8sRUFBRSxNQUFNO1lBQzFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxJQUFJLEVBQUUsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFO2dCQUN6QyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNQLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDWixDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNOLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDYixDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUE7UUFDSixDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFRCxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sSUFBSSxFQUFFLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRTtRQUN4QyxvRUFBb0U7UUFDcEUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNQLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFDNUQsRUFBRSxHQUFHLElBQUksQ0FBQTtnQkFDVCxFQUFFLEdBQUcsS0FBSyxDQUFBO1lBQ1osQ0FBQztRQUNILENBQUM7UUFDRCxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ1osQ0FBQyxDQUFDLENBQUE7QUFDSixDQUFDO0FBRUQsY0FBZSxJQUFJLEVBQUUsT0FBTztJQUMxQixrQ0FBa0M7SUFDbEMsSUFBSSxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNaLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztZQUM1RCxNQUFNLENBQUMsS0FBSyxDQUFBO1FBQ2QsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sTUFBTSxFQUFFLENBQUE7UUFDVixDQUFDO0lBQ0gsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZnMgPSByZXF1aXJlKCdmcycpXG52YXIgY29yZVxuaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicgfHwgZ2xvYmFsLlRFU1RJTkdfV0lORE9XUykge1xuICBjb3JlID0gcmVxdWlyZSgnLi93aW5kb3dzLmpzJylcbn0gZWxzZSB7XG4gIGNvcmUgPSByZXF1aXJlKCcuL21vZGUuanMnKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzZXhlXG5pc2V4ZS5zeW5jID0gc3luY1xuXG5mdW5jdGlvbiBpc2V4ZSAocGF0aCwgb3B0aW9ucywgY2IpIHtcbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBvcHRpb25zXG4gICAgb3B0aW9ucyA9IHt9XG4gIH1cblxuICBpZiAoIWNiKSB7XG4gICAgaWYgKHR5cGVvZiBQcm9taXNlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYWxsYmFjayBub3QgcHJvdmlkZWQnKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBpc2V4ZShwYXRoLCBvcHRpb25zIHx8IHt9LCBmdW5jdGlvbiAoZXIsIGlzKSB7XG4gICAgICAgIGlmIChlcikge1xuICAgICAgICAgIHJlamVjdChlcilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXNvbHZlKGlzKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBjb3JlKHBhdGgsIG9wdGlvbnMgfHwge30sIGZ1bmN0aW9uIChlciwgaXMpIHtcbiAgICAvLyBpZ25vcmUgRUFDQ0VTIGJlY2F1c2UgdGhhdCBqdXN0IG1lYW5zIHdlIGFyZW4ndCBhbGxvd2VkIHRvIHJ1biBpdFxuICAgIGlmIChlcikge1xuICAgICAgaWYgKGVyLmNvZGUgPT09ICdFQUNDRVMnIHx8IG9wdGlvbnMgJiYgb3B0aW9ucy5pZ25vcmVFcnJvcnMpIHtcbiAgICAgICAgZXIgPSBudWxsXG4gICAgICAgIGlzID0gZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gICAgY2IoZXIsIGlzKVxuICB9KVxufVxuXG5mdW5jdGlvbiBzeW5jIChwYXRoLCBvcHRpb25zKSB7XG4gIC8vIG15IGtpbmdkb20gZm9yIGEgZmlsdGVyZWQgY2F0Y2hcbiAgdHJ5IHtcbiAgICByZXR1cm4gY29yZS5zeW5jKHBhdGgsIG9wdGlvbnMgfHwge30pXG4gIH0gY2F0Y2ggKGVyKSB7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5pZ25vcmVFcnJvcnMgfHwgZXIuY29kZSA9PT0gJ0VBQ0NFUycpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlclxuICAgIH1cbiAgfVxufVxuIl19