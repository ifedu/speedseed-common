/*istanbul ignore start*/ 'use strict';
exports.__esModule = true;
exports.generateOptions = generateOptions;
function generateOptions(options, defaults) {
    if (typeof options === 'function') {
        defaults.callback = options;
    }
    else if (options) {
        for (var name in options) {
            /* istanbul ignore else */
            if (options.hasOwnProperty(name)) {
                defaults[name] = options[name];
            }
        }
    }
    return defaults;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZW52aXJvbm1lbnRcXG5vZGVfbW9kdWxlc1xcZGlmZlxcbGliXFx1dGlsXFxwYXJhbXMuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xceWVvbWFuLWVudmlyb25tZW50XFxub2RlX21vZHVsZXNcXGRpZmZcXGxpYlxcdXRpbFxccGFyYW1zLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHlCQUF5QixDQUFBLFlBQVksQ0FBQztBQUV0QyxPQUFPLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztBQUMxQixPQUFPLENBQXlCLGVBQWUsR0FBRyxlQUFlLENBQUM7QUFDbEUseUJBQXlCLE9BQU8sRUFBRSxRQUFRO0lBQ3hDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sT0FBTyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDbEMsUUFBUSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7SUFDOUIsQ0FBQztJQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ25CLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDekIsMEJBQTBCO1lBQzFCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pDLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUNELE1BQU0sQ0FBQyxRQUFRLENBQUM7QUFDbEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qaXN0YW5idWwgaWdub3JlIHN0YXJ0Ki8ndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLiAvKmlzdGFuYnVsIGlnbm9yZSBlbmQqL2dlbmVyYXRlT3B0aW9ucyA9IGdlbmVyYXRlT3B0aW9ucztcbmZ1bmN0aW9uIGdlbmVyYXRlT3B0aW9ucyhvcHRpb25zLCBkZWZhdWx0cykge1xuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBkZWZhdWx0cy5jYWxsYmFjayA9IG9wdGlvbnM7XG4gIH0gZWxzZSBpZiAob3B0aW9ucykge1xuICAgIGZvciAodmFyIG5hbWUgaW4gb3B0aW9ucykge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGRlZmF1bHRzW25hbWVdID0gb3B0aW9uc1tuYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlZmF1bHRzO1xufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYklpNHVMeTR1TDNOeVl5OTFkR2xzTDNCaGNtRnRjeTVxY3lKZExDSnVZVzFsY3lJNlcxMHNJbTFoY0hCcGJtZHpJam9pT3pzN1owTkJRV2RDTzBGQlFWUXNVMEZCVXl4bFFVRlVMRU5CUVhsQ0xFOUJRWHBDTEVWQlFXdERMRkZCUVd4RExFVkJRVFJETzBGQlEycEVMRTFCUVVrc1QwRkJUeXhQUVVGUUxFdEJRVzFDTEZWQlFXNUNMRVZCUVN0Q08wRkJRMnBETEdGQlFWTXNVVUZCVkN4SFFVRnZRaXhQUVVGd1FpeERRVVJwUXp0SFFVRnVReXhOUVVWUExFbEJRVWtzVDBGQlNpeEZRVUZoTzBGQlEyeENMRk5CUVVzc1NVRkJTU3hKUVVGS0xFbEJRVmtzVDBGQmFrSXNSVUZCTUVJN08wRkJSWGhDTEZWQlFVa3NVVUZCVVN4alFVRlNMRU5CUVhWQ0xFbEJRWFpDTEVOQlFVb3NSVUZCYTBNN1FVRkRhRU1zYVVKQlFWTXNTVUZCVkN4SlFVRnBRaXhSUVVGUkxFbEJRVklzUTBGQmFrSXNRMEZFWjBNN1QwRkJiRU03UzBGR1JqdEhRVVJMTzBGQlVWQXNVMEZCVHl4UlFVRlFMRU5CV0dsRU8wTkJRVFZESWl3aVptbHNaU0k2SW5CaGNtRnRjeTVxY3lJc0luTnZkWEpqWlhORGIyNTBaVzUwSWpwYkltVjRjRzl5ZENCbWRXNWpkR2x2YmlCblpXNWxjbUYwWlU5d2RHbHZibk1vYjNCMGFXOXVjeXdnWkdWbVlYVnNkSE1wSUh0Y2JpQWdhV1lnS0hSNWNHVnZaaUJ2Y0hScGIyNXpJRDA5UFNBblpuVnVZM1JwYjI0bktTQjdYRzRnSUNBZ1pHVm1ZWFZzZEhNdVkyRnNiR0poWTJzZ1BTQnZjSFJwYjI1ek8xeHVJQ0I5SUdWc2MyVWdhV1lnS0c5d2RHbHZibk1wSUh0Y2JpQWdJQ0JtYjNJZ0tHeGxkQ0J1WVcxbElHbHVJRzl3ZEdsdmJuTXBJSHRjYmlBZ0lDQWdJQzhxSUdsemRHRnVZblZzSUdsbmJtOXlaU0JsYkhObElDb3ZYRzRnSUNBZ0lDQnBaaUFvYjNCMGFXOXVjeTVvWVhOUGQyNVFjbTl3WlhKMGVTaHVZVzFsS1NrZ2UxeHVJQ0FnSUNBZ0lDQmtaV1poZFd4MGMxdHVZVzFsWFNBOUlHOXdkR2x2Ym5OYmJtRnRaVjA3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1SUNCOVhHNGdJSEpsZEhWeWJpQmtaV1poZFd4MGN6dGNibjFjYmlKZGZRPT1cbiJdfQ==