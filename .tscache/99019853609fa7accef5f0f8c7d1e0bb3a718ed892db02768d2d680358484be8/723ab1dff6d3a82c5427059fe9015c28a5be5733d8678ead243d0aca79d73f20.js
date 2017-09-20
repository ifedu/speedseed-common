/*istanbul ignore start*/ 'use strict';
exports.__esModule = true;
exports.cssDiff = undefined;
exports.diffCss = diffCss;
var /*istanbul ignore start*/ _base = require('./base') /*istanbul ignore end*/;
/*istanbul ignore start*/
var _base2 = _interopRequireDefault(_base);
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/*istanbul ignore end*/ var cssDiff = exports.cssDiff = new _base2.default() /*istanbul ignore end*/;
cssDiff.tokenize = function (value) {
    return value.split(/([{}:;,]|\s+)/);
};
function diffCss(oldStr, newStr, callback) {
    return cssDiff.diff(oldStr, newStr, callback);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZW52aXJvbm1lbnRcXG5vZGVfbW9kdWxlc1xcZGlmZlxcbGliXFxkaWZmXFxjc3MuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xceWVvbWFuLWVudmlyb25tZW50XFxub2RlX21vZHVsZXNcXGRpZmZcXGxpYlxcZGlmZlxcY3NzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHlCQUF5QixDQUFBLFlBQVksQ0FBQztBQUV0QyxPQUFPLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztBQUMxQixPQUFPLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztBQUM1QixPQUFPLENBQXlCLE9BQU8sR0FBRyxPQUFPLENBQUM7QUFFbEQsSUFBSSx5QkFBeUIsQ0FBQSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLHVCQUF1QixDQUFDO0FBRS9FLHlCQUF5QjtBQUN6QixJQUFJLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUUzQyxnQ0FBZ0MsR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBRS9GLHVCQUF1QixDQUFBLElBQUksT0FBTyxHQUE0QixPQUFPLENBQXlCLE9BQU8sR0FBRyxJQUE2QixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUM7QUFDOUssT0FBTyxDQUFDLFFBQVEsR0FBRyxVQUFVLEtBQUs7SUFDaEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFDO0FBRUYsaUJBQWlCLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUTtJQUN2QyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ2hELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKmlzdGFuYnVsIGlnbm9yZSBzdGFydCovJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0cy5jc3NEaWZmID0gdW5kZWZpbmVkO1xuZXhwb3J0cy4gLyppc3RhbmJ1bCBpZ25vcmUgZW5kKi9kaWZmQ3NzID0gZGlmZkNzcztcblxudmFyIC8qaXN0YW5idWwgaWdub3JlIHN0YXJ0Ki9fYmFzZSA9IHJlcXVpcmUoJy4vYmFzZScpIC8qaXN0YW5idWwgaWdub3JlIGVuZCovO1xuXG4vKmlzdGFuYnVsIGlnbm9yZSBzdGFydCovXG52YXIgX2Jhc2UyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfYmFzZSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbi8qaXN0YW5idWwgaWdub3JlIGVuZCovdmFyIGNzc0RpZmYgPSAvKmlzdGFuYnVsIGlnbm9yZSBzdGFydCovZXhwb3J0cy4gLyppc3RhbmJ1bCBpZ25vcmUgZW5kKi9jc3NEaWZmID0gbmV3IC8qaXN0YW5idWwgaWdub3JlIHN0YXJ0Ki9fYmFzZTIuZGVmYXVsdCgpIC8qaXN0YW5idWwgaWdub3JlIGVuZCovO1xuY3NzRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUuc3BsaXQoLyhbe306OyxdfFxccyspLyk7XG59O1xuXG5mdW5jdGlvbiBkaWZmQ3NzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykge1xuICByZXR1cm4gY3NzRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSWk0dUx5NHVMM055WXk5a2FXWm1MMk56Y3k1cWN5SmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaU96czdPMmREUVU5blFqczdRVUZRYUVJN096czdPenM3ZFVKQlJVOHNTVUZCVFN3MlJVRkJWU3h4UlVGQlZqdEJRVU5pTEZGQlFWRXNVVUZCVWl4SFFVRnRRaXhWUVVGVExFdEJRVlFzUlVGQlowSTdRVUZEYWtNc1UwRkJUeXhOUVVGTkxFdEJRVTRzUTBGQldTeGxRVUZhTEVOQlFWQXNRMEZFYVVNN1EwRkJhRUk3TzBGQlNWb3NVMEZCVXl4UFFVRlVMRU5CUVdsQ0xFMUJRV3BDTEVWQlFYbENMRTFCUVhwQ0xFVkJRV2xETEZGQlFXcERMRVZCUVRKRE8wRkJRVVVzVTBGQlR5eFJRVUZSTEVsQlFWSXNRMEZCWVN4TlFVRmlMRVZCUVhGQ0xFMUJRWEpDTEVWQlFUWkNMRkZCUVRkQ0xFTkJRVkFzUTBGQlJqdERRVUV6UXlJc0ltWnBiR1VpT2lKamMzTXVhbk1pTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lKcGJYQnZjblFnUkdsbVppQm1jbTl0SUNjdUwySmhjMlVuTzF4dVhHNWxlSEJ2Y25RZ1kyOXVjM1FnWTNOelJHbG1aaUE5SUc1bGR5QkVhV1ptS0NrN1hHNWpjM05FYVdabUxuUnZhMlZ1YVhwbElEMGdablZ1WTNScGIyNG9kbUZzZFdVcElIdGNiaUFnY21WMGRYSnVJSFpoYkhWbExuTndiR2wwS0M4b1czdDlPanNzWFh4Y1hITXJLUzhwTzF4dWZUdGNibHh1Wlhod2IzSjBJR1oxYm1OMGFXOXVJR1JwWm1aRGMzTW9iMnhrVTNSeUxDQnVaWGRUZEhJc0lHTmhiR3hpWVdOcktTQjdJSEpsZEhWeWJpQmpjM05FYVdabUxtUnBabVlvYjJ4a1UzUnlMQ0J1WlhkVGRISXNJR05oYkd4aVlXTnJLVHNnZlZ4dUlsMTlcbiJdfQ==