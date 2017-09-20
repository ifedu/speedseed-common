/*istanbul ignore start*/ "use strict";
exports.__esModule = true;
exports.default = /*istanbul ignore end*/ function (start, minLine, maxLine) {
    var wantForward = true, backwardExhausted = false, forwardExhausted = false, localOffset = 1;
    return function iterator() {
        if (wantForward && !forwardExhausted) {
            if (backwardExhausted) {
                localOffset++;
            }
            else {
                wantForward = false;
            }
            // Check if trying to fit beyond text length, and if not, check it fits
            // after offset location (or desired location on first iteration)
            if (start + localOffset <= maxLine) {
                return localOffset;
            }
            forwardExhausted = true;
        }
        if (!backwardExhausted) {
            if (!forwardExhausted) {
                wantForward = true;
            }
            // Check if trying to fit before text beginning, and if not, check it fits
            // before offset location
            if (minLine <= start - localOffset) {
                return -localOffset++;
            }
            backwardExhausted = true;
            return iterator();
        }
        // We tried to fit hunk before text beginning and beyond text lenght, then
        // hunk can't fit on the text. Return undefined
    };
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZW52aXJvbm1lbnRcXG5vZGVfbW9kdWxlc1xcZGlmZlxcbGliXFx1dGlsXFxkaXN0YW5jZS1pdGVyYXRvci5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZW52aXJvbm1lbnRcXG5vZGVfbW9kdWxlc1xcZGlmZlxcbGliXFx1dGlsXFxkaXN0YW5jZS1pdGVyYXRvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx5QkFBeUIsQ0FBQSxZQUFZLENBQUM7QUFFdEMsT0FBTyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7QUFFMUIsT0FBTyxDQUFDLE9BQU8sR0FBRyx1QkFBdUIsQ0FBQSxVQUFVLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTztJQUN4RSxJQUFJLFdBQVcsR0FBRyxJQUFJLEVBQ2xCLGlCQUFpQixHQUFHLEtBQUssRUFDekIsZ0JBQWdCLEdBQUcsS0FBSyxFQUN4QixXQUFXLEdBQUcsQ0FBQyxDQUFDO0lBRXBCLE1BQU0sQ0FBQztRQUNMLEVBQUUsQ0FBQyxDQUFDLFdBQVcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztZQUNyQyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RCLFdBQVcsRUFBRSxDQUFDO1lBQ2hCLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTixXQUFXLEdBQUcsS0FBSyxDQUFDO1lBQ3RCLENBQUM7WUFFRCx1RUFBdUU7WUFDdkUsaUVBQWlFO1lBQ2pFLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxXQUFXLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQztZQUNyQixDQUFDO1lBRUQsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1FBQzFCLENBQUM7UUFFRCxFQUFFLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztZQUN2QixFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztnQkFDdEIsV0FBVyxHQUFHLElBQUksQ0FBQztZQUNyQixDQUFDO1lBRUQsMEVBQTBFO1lBQzFFLHlCQUF5QjtZQUN6QixFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQ25DLE1BQU0sQ0FBQyxDQUFFLFdBQVcsRUFBRSxDQUFDO1lBQ3pCLENBQUM7WUFFRCxpQkFBaUIsR0FBRyxJQUFJLENBQUM7WUFDekIsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFFRCwwRUFBMEU7UUFDMUUsK0NBQStDO0lBQ2pELENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qaXN0YW5idWwgaWdub3JlIHN0YXJ0Ki9cInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gLyppc3RhbmJ1bCBpZ25vcmUgZW5kKi9mdW5jdGlvbiAoc3RhcnQsIG1pbkxpbmUsIG1heExpbmUpIHtcbiAgdmFyIHdhbnRGb3J3YXJkID0gdHJ1ZSxcbiAgICAgIGJhY2t3YXJkRXhoYXVzdGVkID0gZmFsc2UsXG4gICAgICBmb3J3YXJkRXhoYXVzdGVkID0gZmFsc2UsXG4gICAgICBsb2NhbE9mZnNldCA9IDE7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGl0ZXJhdG9yKCkge1xuICAgIGlmICh3YW50Rm9yd2FyZCAmJiAhZm9yd2FyZEV4aGF1c3RlZCkge1xuICAgICAgaWYgKGJhY2t3YXJkRXhoYXVzdGVkKSB7XG4gICAgICAgIGxvY2FsT2Zmc2V0Kys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3YW50Rm9yd2FyZCA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBpZiB0cnlpbmcgdG8gZml0IGJleW9uZCB0ZXh0IGxlbmd0aCwgYW5kIGlmIG5vdCwgY2hlY2sgaXQgZml0c1xuICAgICAgLy8gYWZ0ZXIgb2Zmc2V0IGxvY2F0aW9uIChvciBkZXNpcmVkIGxvY2F0aW9uIG9uIGZpcnN0IGl0ZXJhdGlvbilcbiAgICAgIGlmIChzdGFydCArIGxvY2FsT2Zmc2V0IDw9IG1heExpbmUpIHtcbiAgICAgICAgcmV0dXJuIGxvY2FsT2Zmc2V0O1xuICAgICAgfVxuXG4gICAgICBmb3J3YXJkRXhoYXVzdGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoIWJhY2t3YXJkRXhoYXVzdGVkKSB7XG4gICAgICBpZiAoIWZvcndhcmRFeGhhdXN0ZWQpIHtcbiAgICAgICAgd2FudEZvcndhcmQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBpZiB0cnlpbmcgdG8gZml0IGJlZm9yZSB0ZXh0IGJlZ2lubmluZywgYW5kIGlmIG5vdCwgY2hlY2sgaXQgZml0c1xuICAgICAgLy8gYmVmb3JlIG9mZnNldCBsb2NhdGlvblxuICAgICAgaWYgKG1pbkxpbmUgPD0gc3RhcnQgLSBsb2NhbE9mZnNldCkge1xuICAgICAgICByZXR1cm4gLSBsb2NhbE9mZnNldCsrO1xuICAgICAgfVxuXG4gICAgICBiYWNrd2FyZEV4aGF1c3RlZCA9IHRydWU7XG4gICAgICByZXR1cm4gaXRlcmF0b3IoKTtcbiAgICB9XG5cbiAgICAvLyBXZSB0cmllZCB0byBmaXQgaHVuayBiZWZvcmUgdGV4dCBiZWdpbm5pbmcgYW5kIGJleW9uZCB0ZXh0IGxlbmdodCwgdGhlblxuICAgIC8vIGh1bmsgY2FuJ3QgZml0IG9uIHRoZSB0ZXh0LiBSZXR1cm4gdW5kZWZpbmVkXG4gIH07XG59O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYklpNHVMeTR1TDNOeVl5OTFkR2xzTDJScGMzUmhibU5sTFdsMFpYSmhkRzl5TG1weklsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lJN096czdlVU5CUjJVc1ZVRkJVeXhMUVVGVUxFVkJRV2RDTEU5QlFXaENMRVZCUVhsQ0xFOUJRWHBDTEVWQlFXdERPMEZCUXk5RExFMUJRVWtzWTBGQll5eEpRVUZrTzAxQlEwRXNiMEpCUVc5Q0xFdEJRWEJDTzAxQlEwRXNiVUpCUVcxQ0xFdEJRVzVDTzAxQlEwRXNZMEZCWXl4RFFVRmtMRU5CU2pKRE96dEJRVTB2UXl4VFFVRlBMRk5CUVZNc1VVRkJWQ3hIUVVGdlFqdEJRVU42UWl4UlFVRkpMR1ZCUVdVc1EwRkJReXhuUWtGQlJDeEZRVUZ0UWp0QlFVTndReXhWUVVGSkxHbENRVUZLTEVWQlFYVkNPMEZCUTNKQ0xITkNRVVJ4UWp0UFFVRjJRaXhOUVVWUE8wRkJRMHdzYzBKQlFXTXNTMEZCWkN4RFFVUkxPMDlCUmxBN096czdRVUZFYjBNc1ZVRlRhRU1zVVVGQlVTeFhRVUZTTEVsQlFYVkNMRTlCUVhaQ0xFVkJRV2RETzBGQlEyeERMR1ZCUVU4c1YwRkJVQ3hEUVVSclF6dFBRVUZ3UXpzN1FVRkpRU3g1UWtGQmJVSXNTVUZCYmtJc1EwRmliME03UzBGQmRFTTdPMEZCWjBKQkxGRkJRVWtzUTBGQlF5eHBRa0ZCUkN4RlFVRnZRanRCUVVOMFFpeFZRVUZKTEVOQlFVTXNaMEpCUVVRc1JVRkJiVUk3UVVGRGNrSXNjMEpCUVdNc1NVRkJaQ3hEUVVSeFFqdFBRVUYyUWpzN096dEJRVVJ6UWl4VlFVOXNRaXhYUVVGWExGRkJRVkVzVjBGQlVpeEZRVUZ4UWp0QlFVTnNReXhsUVVGUExFVkJRVU1zWVVGQlJDeERRVVF5UWp0UFFVRndRenM3UVVGSlFTd3dRa0ZCYjBJc1NVRkJjRUlzUTBGWWMwSTdRVUZaZEVJc1lVRkJUeXhWUVVGUUxFTkJXbk5DTzB0QlFYaENPenM3TzBGQmFrSjVRaXhIUVVGd1FpeERRVTUzUXp0RFFVRnNReUlzSW1acGJHVWlPaUprYVhOMFlXNWpaUzFwZEdWeVlYUnZjaTVxY3lJc0luTnZkWEpqWlhORGIyNTBaVzUwSWpwYklpOHZJRWwwWlhKaGRHOXlJSFJvWVhRZ2RISmhkbVZ5YzJWeklHbHVJSFJvWlNCeVlXNW5aU0J2WmlCYmJXbHVMQ0J0WVhoZExDQnpkR1Z3Y0dsdVoxeHVMeThnWW5rZ1pHbHpkR0Z1WTJVZ1puSnZiU0JoSUdkcGRtVnVJSE4wWVhKMElIQnZjMmwwYVc5dUxpQkpMbVV1SUdadmNpQmJNQ3dnTkYwc0lIZHBkR2hjYmk4dklITjBZWEowSUc5bUlESXNJSFJvYVhNZ2QybHNiQ0JwZEdWeVlYUmxJRElzSURNc0lERXNJRFFzSURBdVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCbWRXNWpkR2x2YmloemRHRnlkQ3dnYldsdVRHbHVaU3dnYldGNFRHbHVaU2tnZTF4dUlDQnNaWFFnZDJGdWRFWnZjbmRoY21RZ1BTQjBjblZsTEZ4dUlDQWdJQ0FnWW1GamEzZGhjbVJGZUdoaGRYTjBaV1FnUFNCbVlXeHpaU3hjYmlBZ0lDQWdJR1p2Y25kaGNtUkZlR2hoZFhOMFpXUWdQU0JtWVd4elpTeGNiaUFnSUNBZ0lHeHZZMkZzVDJabWMyVjBJRDBnTVR0Y2JseHVJQ0J5WlhSMWNtNGdablZ1WTNScGIyNGdhWFJsY21GMGIzSW9LU0I3WEc0Z0lDQWdhV1lnS0hkaGJuUkdiM0ozWVhKa0lDWW1JQ0ZtYjNKM1lYSmtSWGhvWVhWemRHVmtLU0I3WEc0Z0lDQWdJQ0JwWmlBb1ltRmphM2RoY21SRmVHaGhkWE4wWldRcElIdGNiaUFnSUNBZ0lDQWdiRzlqWVd4UFptWnpaWFFyS3p0Y2JpQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhkaGJuUkdiM0ozWVhKa0lEMGdabUZzYzJVN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJRU5vWldOcklHbG1JSFJ5ZVdsdVp5QjBieUJtYVhRZ1ltVjViMjVrSUhSbGVIUWdiR1Z1WjNSb0xDQmhibVFnYVdZZ2JtOTBMQ0JqYUdWamF5QnBkQ0JtYVhSelhHNGdJQ0FnSUNBdkx5QmhablJsY2lCdlptWnpaWFFnYkc5allYUnBiMjRnS0c5eUlHUmxjMmx5WldRZ2JHOWpZWFJwYjI0Z2IyNGdabWx5YzNRZ2FYUmxjbUYwYVc5dUtWeHVJQ0FnSUNBZ2FXWWdLSE4wWVhKMElDc2diRzlqWVd4UFptWnpaWFFnUEQwZ2JXRjRUR2x1WlNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2JHOWpZV3hQWm1aelpYUTdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR1p2Y25kaGNtUkZlR2hoZFhOMFpXUWdQU0IwY25WbE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUdsbUlDZ2hZbUZqYTNkaGNtUkZlR2hoZFhOMFpXUXBJSHRjYmlBZ0lDQWdJR2xtSUNnaFptOXlkMkZ5WkVWNGFHRjFjM1JsWkNrZ2UxeHVJQ0FnSUNBZ0lDQjNZVzUwUm05eWQyRnlaQ0E5SUhSeWRXVTdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUVOb1pXTnJJR2xtSUhSeWVXbHVaeUIwYnlCbWFYUWdZbVZtYjNKbElIUmxlSFFnWW1WbmFXNXVhVzVuTENCaGJtUWdhV1lnYm05MExDQmphR1ZqYXlCcGRDQm1hWFJ6WEc0Z0lDQWdJQ0F2THlCaVpXWnZjbVVnYjJabWMyVjBJR3h2WTJGMGFXOXVYRzRnSUNBZ0lDQnBaaUFvYldsdVRHbHVaU0E4UFNCemRHRnlkQ0F0SUd4dlkyRnNUMlptYzJWMEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQXRiRzlqWVd4UFptWnpaWFFyS3p0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ1ltRmphM2RoY21SRmVHaGhkWE4wWldRZ1BTQjBjblZsTzF4dUlDQWdJQ0FnY21WMGRYSnVJR2wwWlhKaGRHOXlLQ2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeThnVjJVZ2RISnBaV1FnZEc4Z1ptbDBJR2gxYm1zZ1ltVm1iM0psSUhSbGVIUWdZbVZuYVc1dWFXNW5JR0Z1WkNCaVpYbHZibVFnZEdWNGRDQnNaVzVuYUhRc0lIUm9aVzVjYmlBZ0lDQXZMeUJvZFc1cklHTmhiaWQwSUdacGRDQnZiaUIwYUdVZ2RHVjRkQzRnVW1WMGRYSnVJSFZ1WkdWbWFXNWxaRnh1SUNCOU8xeHVmVnh1SWwxOVxuIl19