'use strict';
function posix(path) {
    return path.charAt(0) === '/';
}
function win32(path) {
    // https://github.com/nodejs/node/blob/b3fcc245fb25539909ef1d5eaa01dbf92e168633/lib/path.js#L56
    var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
    var result = splitDeviceRe.exec(path);
    var device = result[1] || '';
    var isUnc = Boolean(device && device.charAt(1) !== ':');
    // UNC paths are always absolute
    return Boolean(result[2] || isUnc);
}
module.exports = process.platform === 'win32' ? win32 : posix;
module.exports.posix = posix;
module.exports.win32 = win32;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxwYXRoLWlzLWFic29sdXRlXFxpbmRleC5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxwYXRoLWlzLWFic29sdXRlXFxpbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7QUFFYixlQUFlLElBQUk7SUFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDO0FBQy9CLENBQUM7QUFFRCxlQUFlLElBQUk7SUFDbEIsK0ZBQStGO0lBQy9GLElBQUksYUFBYSxHQUFHLG9FQUFvRSxDQUFDO0lBQ3pGLElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEMsSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM3QixJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7SUFFeEQsZ0NBQWdDO0lBQ2hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDO0FBQ3BDLENBQUM7QUFFRCxNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUM7QUFDOUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBQzdCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gcG9zaXgocGF0aCkge1xuXHRyZXR1cm4gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbn1cblxuZnVuY3Rpb24gd2luMzIocGF0aCkge1xuXHQvLyBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvYmxvYi9iM2ZjYzI0NWZiMjU1Mzk5MDllZjFkNWVhYTAxZGJmOTJlMTY4NjMzL2xpYi9wYXRoLmpzI0w1NlxuXHR2YXIgc3BsaXREZXZpY2VSZSA9IC9eKFthLXpBLVpdOnxbXFxcXFxcL117Mn1bXlxcXFxcXC9dK1tcXFxcXFwvXStbXlxcXFxcXC9dKyk/KFtcXFxcXFwvXSk/KFtcXHNcXFNdKj8pJC87XG5cdHZhciByZXN1bHQgPSBzcGxpdERldmljZVJlLmV4ZWMocGF0aCk7XG5cdHZhciBkZXZpY2UgPSByZXN1bHRbMV0gfHwgJyc7XG5cdHZhciBpc1VuYyA9IEJvb2xlYW4oZGV2aWNlICYmIGRldmljZS5jaGFyQXQoMSkgIT09ICc6Jyk7XG5cblx0Ly8gVU5DIHBhdGhzIGFyZSBhbHdheXMgYWJzb2x1dGVcblx0cmV0dXJuIEJvb2xlYW4ocmVzdWx0WzJdIHx8IGlzVW5jKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInID8gd2luMzIgOiBwb3NpeDtcbm1vZHVsZS5leHBvcnRzLnBvc2l4ID0gcG9zaXg7XG5tb2R1bGUuZXhwb3J0cy53aW4zMiA9IHdpbjMyO1xuIl19