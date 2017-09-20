'use strict';
var ansiEscapes = require('ansi-escapes');
/**
 * Move cursor left by `x`
 * @param  {Readline} rl - Readline instance
 * @param  {Number}   x  - How far to go left (default to 1)
 */
exports.left = function (rl, x) {
    rl.output.write(ansiEscapes.cursorBackward(x));
};
/**
 * Move cursor right by `x`
 * @param  {Readline} rl - Readline instance
 * @param  {Number}   x  - How far to go left (default to 1)
 */
exports.right = function (rl, x) {
    rl.output.write(ansiEscapes.cursorForward(x));
};
/**
 * Move cursor up by `x`
 * @param  {Readline} rl - Readline instance
 * @param  {Number}   x  - How far to go up (default to 1)
 */
exports.up = function (rl, x) {
    rl.output.write(ansiEscapes.cursorUp(x));
};
/**
 * Move cursor down by `x`
 * @param  {Readline} rl - Readline instance
 * @param  {Number}   x  - How far to go down (default to 1)
 */
exports.down = function (rl, x) {
    rl.output.write(ansiEscapes.cursorDown(x));
};
/**
 * Clear current line
 * @param  {Readline} rl  - Readline instance
 * @param  {Number}   len - number of line to delete
 */
exports.clearLine = function (rl, len) {
    rl.output.write(ansiEscapes.eraseLines(len));
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxpbnF1aXJlclxcbGliXFx1dGlsc1xccmVhZGxpbmUuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xcaW5xdWlyZXJcXGxpYlxcdXRpbHNcXHJlYWRsaW5lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQztBQUNiLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUUxQzs7OztHQUlHO0FBRUgsT0FBTyxDQUFDLElBQUksR0FBRyxVQUFVLEVBQUUsRUFBRSxDQUFDO0lBQzVCLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUM7QUFFRjs7OztHQUlHO0FBRUgsT0FBTyxDQUFDLEtBQUssR0FBRyxVQUFVLEVBQUUsRUFBRSxDQUFDO0lBQzdCLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRCxDQUFDLENBQUM7QUFFRjs7OztHQUlHO0FBRUgsT0FBTyxDQUFDLEVBQUUsR0FBRyxVQUFVLEVBQUUsRUFBRSxDQUFDO0lBQzFCLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUM7QUFFRjs7OztHQUlHO0FBRUgsT0FBTyxDQUFDLElBQUksR0FBRyxVQUFVLEVBQUUsRUFBRSxDQUFDO0lBQzVCLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUM7QUFFRjs7OztHQUlHO0FBQ0gsT0FBTyxDQUFDLFNBQVMsR0FBRyxVQUFVLEVBQUUsRUFBRSxHQUFHO0lBQ25DLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG52YXIgYW5zaUVzY2FwZXMgPSByZXF1aXJlKCdhbnNpLWVzY2FwZXMnKTtcblxuLyoqXG4gKiBNb3ZlIGN1cnNvciBsZWZ0IGJ5IGB4YFxuICogQHBhcmFtICB7UmVhZGxpbmV9IHJsIC0gUmVhZGxpbmUgaW5zdGFuY2VcbiAqIEBwYXJhbSAge051bWJlcn0gICB4ICAtIEhvdyBmYXIgdG8gZ28gbGVmdCAoZGVmYXVsdCB0byAxKVxuICovXG5cbmV4cG9ydHMubGVmdCA9IGZ1bmN0aW9uIChybCwgeCkge1xuICBybC5vdXRwdXQud3JpdGUoYW5zaUVzY2FwZXMuY3Vyc29yQmFja3dhcmQoeCkpO1xufTtcblxuLyoqXG4gKiBNb3ZlIGN1cnNvciByaWdodCBieSBgeGBcbiAqIEBwYXJhbSAge1JlYWRsaW5lfSBybCAtIFJlYWRsaW5lIGluc3RhbmNlXG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICAgeCAgLSBIb3cgZmFyIHRvIGdvIGxlZnQgKGRlZmF1bHQgdG8gMSlcbiAqL1xuXG5leHBvcnRzLnJpZ2h0ID0gZnVuY3Rpb24gKHJsLCB4KSB7XG4gIHJsLm91dHB1dC53cml0ZShhbnNpRXNjYXBlcy5jdXJzb3JGb3J3YXJkKHgpKTtcbn07XG5cbi8qKlxuICogTW92ZSBjdXJzb3IgdXAgYnkgYHhgXG4gKiBAcGFyYW0gIHtSZWFkbGluZX0gcmwgLSBSZWFkbGluZSBpbnN0YW5jZVxuICogQHBhcmFtICB7TnVtYmVyfSAgIHggIC0gSG93IGZhciB0byBnbyB1cCAoZGVmYXVsdCB0byAxKVxuICovXG5cbmV4cG9ydHMudXAgPSBmdW5jdGlvbiAocmwsIHgpIHtcbiAgcmwub3V0cHV0LndyaXRlKGFuc2lFc2NhcGVzLmN1cnNvclVwKHgpKTtcbn07XG5cbi8qKlxuICogTW92ZSBjdXJzb3IgZG93biBieSBgeGBcbiAqIEBwYXJhbSAge1JlYWRsaW5lfSBybCAtIFJlYWRsaW5lIGluc3RhbmNlXG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICAgeCAgLSBIb3cgZmFyIHRvIGdvIGRvd24gKGRlZmF1bHQgdG8gMSlcbiAqL1xuXG5leHBvcnRzLmRvd24gPSBmdW5jdGlvbiAocmwsIHgpIHtcbiAgcmwub3V0cHV0LndyaXRlKGFuc2lFc2NhcGVzLmN1cnNvckRvd24oeCkpO1xufTtcblxuLyoqXG4gKiBDbGVhciBjdXJyZW50IGxpbmVcbiAqIEBwYXJhbSAge1JlYWRsaW5lfSBybCAgLSBSZWFkbGluZSBpbnN0YW5jZVxuICogQHBhcmFtICB7TnVtYmVyfSAgIGxlbiAtIG51bWJlciBvZiBsaW5lIHRvIGRlbGV0ZVxuICovXG5leHBvcnRzLmNsZWFyTGluZSA9IGZ1bmN0aW9uIChybCwgbGVuKSB7XG4gIHJsLm91dHB1dC53cml0ZShhbnNpRXNjYXBlcy5lcmFzZUxpbmVzKGxlbikpO1xufTtcbiJdfQ==