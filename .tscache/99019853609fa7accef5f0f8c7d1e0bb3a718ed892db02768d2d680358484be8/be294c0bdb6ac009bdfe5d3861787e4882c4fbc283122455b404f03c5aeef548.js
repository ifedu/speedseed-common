/*istanbul ignore start*/ "use strict";
exports.__esModule = true;
exports.convertChangesToDMP = convertChangesToDMP;
// See: http://code.google.com/p/google-diff-match-patch/wiki/API
function convertChangesToDMP(changes) {
    var ret = [], change = void 0 /*istanbul ignore end*/, operation = void 0 /*istanbul ignore end*/;
    for (var i = 0; i < changes.length; i++) {
        change = changes[i];
        if (change.added) {
            operation = 1;
        }
        else if (change.removed) {
            operation = -1;
        }
        else {
            operation = 0;
        }
        ret.push([operation, change.value]);
    }
    return ret;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZW52aXJvbm1lbnRcXG5vZGVfbW9kdWxlc1xcZGlmZlxcbGliXFxjb252ZXJ0XFxkbXAuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xceWVvbWFuLWVudmlyb25tZW50XFxub2RlX21vZHVsZXNcXGRpZmZcXGxpYlxcY29udmVydFxcZG1wLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHlCQUF5QixDQUFBLFlBQVksQ0FBQztBQUV0QyxPQUFPLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztBQUMxQixPQUFPLENBQXlCLG1CQUFtQixHQUFHLG1CQUFtQixDQUFDO0FBQzFFLGlFQUFpRTtBQUNqRSw2QkFBNkIsT0FBTztJQUNsQyxJQUFJLEdBQUcsR0FBRyxFQUFFLEVBQ1IsTUFBTSxHQUE0QixLQUFLLENBQUMsQ0FBQyx1QkFBdUIsRUFDaEUsU0FBUyxHQUE0QixLQUFLLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQztJQUN4RSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN4QyxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDaEIsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMxQixTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDakIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNoQixDQUFDO1FBRUQsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQztBQUNiLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKmlzdGFuYnVsIGlnbm9yZSBzdGFydCovXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLiAvKmlzdGFuYnVsIGlnbm9yZSBlbmQqL2NvbnZlcnRDaGFuZ2VzVG9ETVAgPSBjb252ZXJ0Q2hhbmdlc1RvRE1QO1xuLy8gU2VlOiBodHRwOi8vY29kZS5nb29nbGUuY29tL3AvZ29vZ2xlLWRpZmYtbWF0Y2gtcGF0Y2gvd2lraS9BUElcbmZ1bmN0aW9uIGNvbnZlcnRDaGFuZ2VzVG9ETVAoY2hhbmdlcykge1xuICB2YXIgcmV0ID0gW10sXG4gICAgICBjaGFuZ2UgPSAvKmlzdGFuYnVsIGlnbm9yZSBzdGFydCovdm9pZCAwIC8qaXN0YW5idWwgaWdub3JlIGVuZCovLFxuICAgICAgb3BlcmF0aW9uID0gLyppc3RhbmJ1bCBpZ25vcmUgc3RhcnQqL3ZvaWQgMCAvKmlzdGFuYnVsIGlnbm9yZSBlbmQqLztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGFuZ2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgY2hhbmdlID0gY2hhbmdlc1tpXTtcbiAgICBpZiAoY2hhbmdlLmFkZGVkKSB7XG4gICAgICBvcGVyYXRpb24gPSAxO1xuICAgIH0gZWxzZSBpZiAoY2hhbmdlLnJlbW92ZWQpIHtcbiAgICAgIG9wZXJhdGlvbiA9IC0xO1xuICAgIH0gZWxzZSB7XG4gICAgICBvcGVyYXRpb24gPSAwO1xuICAgIH1cblxuICAgIHJldC5wdXNoKFtvcGVyYXRpb24sIGNoYW5nZS52YWx1ZV0pO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSWk0dUx5NHVMM055WXk5amIyNTJaWEowTDJSdGNDNXFjeUpkTENKdVlXMWxjeUk2VzEwc0ltMWhjSEJwYm1keklqb2lPenM3WjBOQlEyZENPenRCUVVGVUxGTkJRVk1zYlVKQlFWUXNRMEZCTmtJc1QwRkJOMElzUlVGQmMwTTdRVUZETTBNc1RVRkJTU3hOUVVGTkxFVkJRVTQ3VFVGRFFTeG5SVUZFU2p0TlFVVkpMRzFGUVVaS0xFTkJSREpETzBGQlNUTkRMRTlCUVVzc1NVRkJTU3hKUVVGSkxFTkJRVW9zUlVGQlR5eEpRVUZKTEZGQlFWRXNUVUZCVWl4RlFVRm5RaXhIUVVGd1F5eEZRVUY1UXp0QlFVTjJReXhoUVVGVExGRkJRVkVzUTBGQlVpeERRVUZVTEVOQlJIVkRPMEZCUlhaRExGRkJRVWtzVDBGQlR5eExRVUZRTEVWQlFXTTdRVUZEYUVJc2EwSkJRVmtzUTBGQldpeERRVVJuUWp0TFFVRnNRaXhOUVVWUExFbEJRVWtzVDBGQlR5eFBRVUZRTEVWQlFXZENPMEZCUTNwQ0xHdENRVUZaTEVOQlFVTXNRMEZCUkN4RFFVUmhPMHRCUVhCQ0xFMUJSVUU3UVVGRFRDeHJRa0ZCV1N4RFFVRmFMRU5CUkVzN1MwRkdRVHM3UVVGTlVDeFJRVUZKTEVsQlFVb3NRMEZCVXl4RFFVRkRMRk5CUVVRc1JVRkJXU3hQUVVGUExFdEJRVkFzUTBGQmNrSXNSVUZXZFVNN1IwRkJla003UVVGWlFTeFRRVUZQTEVkQlFWQXNRMEZvUWpKRE8wTkJRWFJESWl3aVptbHNaU0k2SW1SdGNDNXFjeUlzSW5OdmRYSmpaWE5EYjI1MFpXNTBJanBiSWk4dklGTmxaVG9nYUhSMGNEb3ZMMk52WkdVdVoyOXZaMnhsTG1OdmJTOXdMMmR2YjJkc1pTMWthV1ptTFcxaGRHTm9MWEJoZEdOb0wzZHBhMmt2UVZCSlhHNWxlSEJ2Y25RZ1puVnVZM1JwYjI0Z1kyOXVkbVZ5ZEVOb1lXNW5aWE5VYjBSTlVDaGphR0Z1WjJWektTQjdYRzRnSUd4bGRDQnlaWFFnUFNCYlhTeGNiaUFnSUNBZ0lHTm9ZVzVuWlN4Y2JpQWdJQ0FnSUc5d1pYSmhkR2x2Ymp0Y2JpQWdabTl5SUNoc1pYUWdhU0E5SURBN0lHa2dQQ0JqYUdGdVoyVnpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnWTJoaGJtZGxJRDBnWTJoaGJtZGxjMXRwWFR0Y2JpQWdJQ0JwWmlBb1kyaGhibWRsTG1Ga1pHVmtLU0I3WEc0Z0lDQWdJQ0J2Y0dWeVlYUnBiMjRnUFNBeE8xeHVJQ0FnSUgwZ1pXeHpaU0JwWmlBb1kyaGhibWRsTG5KbGJXOTJaV1FwSUh0Y2JpQWdJQ0FnSUc5d1pYSmhkR2x2YmlBOUlDMHhPMXh1SUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNCdmNHVnlZWFJwYjI0Z1BTQXdPMXh1SUNBZ0lIMWNibHh1SUNBZ0lISmxkQzV3ZFhOb0tGdHZjR1Z5WVhScGIyNHNJR05vWVc1blpTNTJZV3gxWlYwcE8xeHVJQ0I5WEc0Z0lISmxkSFZ5YmlCeVpYUTdYRzU5WEc0aVhYMD1cbiJdfQ==