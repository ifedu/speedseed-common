var common = require('./common');
common.register('echo', _echo, {
    allowGlobbing: false,
});
//@
//@ ### echo([options,] string [, string ...])
//@ Available options:
//@
//@ + `-e`: interpret backslash escapes (default)
//@
//@ Examples:
//@
//@ ```javascript
//@ echo('hello world');
//@ var str = echo('hello world');
//@ ```
//@
//@ Prints string to stdout, and returns string with additional utility methods
//@ like `.to()`.
function _echo(opts, messages) {
    // allow strings starting with '-', see issue #20
    messages = [].slice.call(arguments, opts ? 0 : 1);
    if (messages[0] === '-e') {
        // ignore -e
        messages.shift();
    }
    console.log.apply(console, messages);
    return messages.join(' ');
}
module.exports = _echo;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXGVjaG8uanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xcc2hlbGxqc1xcc3JjXFxlY2hvLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUVqQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUU7SUFDN0IsYUFBYSxFQUFFLEtBQUs7Q0FDckIsQ0FBQyxDQUFDO0FBRUgsR0FBRztBQUNILDhDQUE4QztBQUM5QyxzQkFBc0I7QUFDdEIsR0FBRztBQUNILGlEQUFpRDtBQUNqRCxHQUFHO0FBQ0gsYUFBYTtBQUNiLEdBQUc7QUFDSCxpQkFBaUI7QUFDakIsd0JBQXdCO0FBQ3hCLGtDQUFrQztBQUNsQyxPQUFPO0FBQ1AsR0FBRztBQUNILCtFQUErRTtBQUMvRSxpQkFBaUI7QUFDakIsZUFBZSxJQUFJLEVBQUUsUUFBUTtJQUMzQixpREFBaUQ7SUFDakQsUUFBUSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBRWxELEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLFlBQVk7UUFDWixRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDbkIsQ0FBQztJQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNyQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM1QixDQUFDO0FBQ0QsTUFBTSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKTtcblxuY29tbW9uLnJlZ2lzdGVyKCdlY2hvJywgX2VjaG8sIHtcbiAgYWxsb3dHbG9iYmluZzogZmFsc2UsXG59KTtcblxuLy9AXG4vL0AgIyMjIGVjaG8oW29wdGlvbnMsXSBzdHJpbmcgWywgc3RyaW5nIC4uLl0pXG4vL0AgQXZhaWxhYmxlIG9wdGlvbnM6XG4vL0Bcbi8vQCArIGAtZWA6IGludGVycHJldCBiYWNrc2xhc2ggZXNjYXBlcyAoZGVmYXVsdClcbi8vQFxuLy9AIEV4YW1wbGVzOlxuLy9AXG4vL0AgYGBgamF2YXNjcmlwdFxuLy9AIGVjaG8oJ2hlbGxvIHdvcmxkJyk7XG4vL0AgdmFyIHN0ciA9IGVjaG8oJ2hlbGxvIHdvcmxkJyk7XG4vL0AgYGBgXG4vL0Bcbi8vQCBQcmludHMgc3RyaW5nIHRvIHN0ZG91dCwgYW5kIHJldHVybnMgc3RyaW5nIHdpdGggYWRkaXRpb25hbCB1dGlsaXR5IG1ldGhvZHNcbi8vQCBsaWtlIGAudG8oKWAuXG5mdW5jdGlvbiBfZWNobyhvcHRzLCBtZXNzYWdlcykge1xuICAvLyBhbGxvdyBzdHJpbmdzIHN0YXJ0aW5nIHdpdGggJy0nLCBzZWUgaXNzdWUgIzIwXG4gIG1lc3NhZ2VzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIG9wdHMgPyAwIDogMSk7XG5cbiAgaWYgKG1lc3NhZ2VzWzBdID09PSAnLWUnKSB7XG4gICAgLy8gaWdub3JlIC1lXG4gICAgbWVzc2FnZXMuc2hpZnQoKTtcbiAgfVxuXG4gIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIG1lc3NhZ2VzKTtcbiAgcmV0dXJuIG1lc3NhZ2VzLmpvaW4oJyAnKTtcbn1cbm1vZHVsZS5leHBvcnRzID0gX2VjaG87XG4iXX0=