'use strict';
function escapeArgument(arg, quote) {
    // Convert to string
    arg = '' + arg;
    // If we are not going to quote the argument,
    // escape shell metacharacters, including double and single quotes:
    if (!quote) {
        arg = arg.replace(/([()%!^<>&|;,"'\s])/g, '^$1');
    }
    else {
        // Sequence of backslashes followed by a double quote:
        // double up all the backslashes and escape the double quote
        arg = arg.replace(/(\\*)"/g, '$1$1\\"');
        // Sequence of backslashes followed by the end of the string
        // (which will become a double quote later):
        // double up all the backslashes
        arg = arg.replace(/(\\*)$/, '$1$1');
        // All other backslashes occur literally
        // Quote the whole thing:
        arg = '"' + arg + '"';
    }
    return arg;
}
module.exports = escapeArgument;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxjcm9zcy1zcGF3blxcbGliXFx1dGlsXFxlc2NhcGVBcmd1bWVudC5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxjcm9zcy1zcGF3blxcbGliXFx1dGlsXFxlc2NhcGVBcmd1bWVudC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7QUFFYix3QkFBd0IsR0FBRyxFQUFFLEtBQUs7SUFDOUIsb0JBQW9CO0lBQ3BCLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDO0lBRWYsNkNBQTZDO0lBQzdDLG1FQUFtRTtJQUNuRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDVCxHQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDSixzREFBc0Q7UUFDdEQsNERBQTREO1FBQzVELEdBQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUV4Qyw0REFBNEQ7UUFDNUQsNENBQTRDO1FBQzVDLGdDQUFnQztRQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFcEMsd0NBQXdDO1FBRXhDLHlCQUF5QjtRQUN6QixHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUM7SUFDMUIsQ0FBQztJQUVELE1BQU0sQ0FBQyxHQUFHLENBQUM7QUFDZixDQUFDO0FBRUQsTUFBTSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGVzY2FwZUFyZ3VtZW50KGFyZywgcXVvdGUpIHtcbiAgICAvLyBDb252ZXJ0IHRvIHN0cmluZ1xuICAgIGFyZyA9ICcnICsgYXJnO1xuXG4gICAgLy8gSWYgd2UgYXJlIG5vdCBnb2luZyB0byBxdW90ZSB0aGUgYXJndW1lbnQsXG4gICAgLy8gZXNjYXBlIHNoZWxsIG1ldGFjaGFyYWN0ZXJzLCBpbmNsdWRpbmcgZG91YmxlIGFuZCBzaW5nbGUgcXVvdGVzOlxuICAgIGlmICghcXVvdGUpIHtcbiAgICAgICAgYXJnID0gYXJnLnJlcGxhY2UoLyhbKCklIV48PiZ8OyxcIidcXHNdKS9nLCAnXiQxJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gU2VxdWVuY2Ugb2YgYmFja3NsYXNoZXMgZm9sbG93ZWQgYnkgYSBkb3VibGUgcXVvdGU6XG4gICAgICAgIC8vIGRvdWJsZSB1cCBhbGwgdGhlIGJhY2tzbGFzaGVzIGFuZCBlc2NhcGUgdGhlIGRvdWJsZSBxdW90ZVxuICAgICAgICBhcmcgPSBhcmcucmVwbGFjZSgvKFxcXFwqKVwiL2csICckMSQxXFxcXFwiJyk7XG5cbiAgICAgICAgLy8gU2VxdWVuY2Ugb2YgYmFja3NsYXNoZXMgZm9sbG93ZWQgYnkgdGhlIGVuZCBvZiB0aGUgc3RyaW5nXG4gICAgICAgIC8vICh3aGljaCB3aWxsIGJlY29tZSBhIGRvdWJsZSBxdW90ZSBsYXRlcik6XG4gICAgICAgIC8vIGRvdWJsZSB1cCBhbGwgdGhlIGJhY2tzbGFzaGVzXG4gICAgICAgIGFyZyA9IGFyZy5yZXBsYWNlKC8oXFxcXCopJC8sICckMSQxJyk7XG5cbiAgICAgICAgLy8gQWxsIG90aGVyIGJhY2tzbGFzaGVzIG9jY3VyIGxpdGVyYWxseVxuXG4gICAgICAgIC8vIFF1b3RlIHRoZSB3aG9sZSB0aGluZzpcbiAgICAgICAgYXJnID0gJ1wiJyArIGFyZyArICdcIic7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFyZztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBlc2NhcGVBcmd1bWVudDtcbiJdfQ==