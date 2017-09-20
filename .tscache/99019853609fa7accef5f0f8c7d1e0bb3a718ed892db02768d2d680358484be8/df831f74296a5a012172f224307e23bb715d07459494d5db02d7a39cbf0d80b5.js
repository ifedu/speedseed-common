var common = require('./common');
var fs = require('fs');
var path = require('path');
common.register('toEnd', _toEnd, {
    pipeOnly: true,
    wrapOutput: false,
});
//@
//@ ### ShellString.prototype.toEnd(file)
//@
//@ Examples:
//@
//@ ```javascript
//@ cat('input.txt').toEnd('output.txt');
//@ ```
//@
//@ Analogous to the redirect-and-append operator `>>` in Unix, but works with
//@ ShellStrings (such as those returned by `cat`, `grep`, etc).
function _toEnd(options, file) {
    if (!file)
        common.error('wrong arguments');
    if (!fs.existsSync(path.dirname(file))) {
        common.error('no such file or directory: ' + path.dirname(file));
    }
    try {
        fs.appendFileSync(file, this.stdout || this.toString(), 'utf8');
        return this;
    }
    catch (e) {
        /* istanbul ignore next */
        common.error('could not append to file (code ' + e.code + '): ' + file, { continue: true });
    }
}
module.exports = _toEnd;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXHRvRW5kLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXHNoZWxsanNcXHNyY1xcdG9FbmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN2QixJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFM0IsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFO0lBQy9CLFFBQVEsRUFBRSxJQUFJO0lBQ2QsVUFBVSxFQUFFLEtBQUs7Q0FDbEIsQ0FBQyxDQUFDO0FBRUgsR0FBRztBQUNILHlDQUF5QztBQUN6QyxHQUFHO0FBQ0gsYUFBYTtBQUNiLEdBQUc7QUFDSCxpQkFBaUI7QUFDakIseUNBQXlDO0FBQ3pDLE9BQU87QUFDUCxHQUFHO0FBQ0gsOEVBQThFO0FBQzlFLGdFQUFnRTtBQUNoRSxnQkFBZ0IsT0FBTyxFQUFFLElBQUk7SUFDM0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFFM0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkMsTUFBTSxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNYLDBCQUEwQjtRQUMxQixNQUFNLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxHQUFHLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzlGLENBQUM7QUFDSCxDQUFDO0FBQ0QsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKTtcbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG52YXIgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuY29tbW9uLnJlZ2lzdGVyKCd0b0VuZCcsIF90b0VuZCwge1xuICBwaXBlT25seTogdHJ1ZSxcbiAgd3JhcE91dHB1dDogZmFsc2UsXG59KTtcblxuLy9AXG4vL0AgIyMjIFNoZWxsU3RyaW5nLnByb3RvdHlwZS50b0VuZChmaWxlKVxuLy9AXG4vL0AgRXhhbXBsZXM6XG4vL0Bcbi8vQCBgYGBqYXZhc2NyaXB0XG4vL0AgY2F0KCdpbnB1dC50eHQnKS50b0VuZCgnb3V0cHV0LnR4dCcpO1xuLy9AIGBgYFxuLy9AXG4vL0AgQW5hbG9nb3VzIHRvIHRoZSByZWRpcmVjdC1hbmQtYXBwZW5kIG9wZXJhdG9yIGA+PmAgaW4gVW5peCwgYnV0IHdvcmtzIHdpdGhcbi8vQCBTaGVsbFN0cmluZ3MgKHN1Y2ggYXMgdGhvc2UgcmV0dXJuZWQgYnkgYGNhdGAsIGBncmVwYCwgZXRjKS5cbmZ1bmN0aW9uIF90b0VuZChvcHRpb25zLCBmaWxlKSB7XG4gIGlmICghZmlsZSkgY29tbW9uLmVycm9yKCd3cm9uZyBhcmd1bWVudHMnKTtcblxuICBpZiAoIWZzLmV4aXN0c1N5bmMocGF0aC5kaXJuYW1lKGZpbGUpKSkge1xuICAgIGNvbW1vbi5lcnJvcignbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeTogJyArIHBhdGguZGlybmFtZShmaWxlKSk7XG4gIH1cblxuICB0cnkge1xuICAgIGZzLmFwcGVuZEZpbGVTeW5jKGZpbGUsIHRoaXMuc3Rkb3V0IHx8IHRoaXMudG9TdHJpbmcoKSwgJ3V0ZjgnKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgY29tbW9uLmVycm9yKCdjb3VsZCBub3QgYXBwZW5kIHRvIGZpbGUgKGNvZGUgJyArIGUuY29kZSArICcpOiAnICsgZmlsZSwgeyBjb250aW51ZTogdHJ1ZSB9KTtcbiAgfVxufVxubW9kdWxlLmV4cG9ydHMgPSBfdG9FbmQ7XG4iXX0=