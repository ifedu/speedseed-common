'use strict';
var escapeArgument = require('./escapeArgument');
function escapeCommand(command) {
    // Do not escape if this command is not dangerous..
    // We do this so that commands like "echo" or "ifconfig" work
    // Quoting them, will make them unaccessible
    return /^[a-z0-9_-]+$/i.test(command) ? command : escapeArgument(command, true);
}
module.exports = escapeCommand;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxjcm9zcy1zcGF3blxcbGliXFx1dGlsXFxlc2NhcGVDb21tYW5kLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXGNyb3NzLXNwYXduXFxsaWJcXHV0aWxcXGVzY2FwZUNvbW1hbmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDO0FBRWIsSUFBSSxjQUFjLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFFakQsdUJBQXVCLE9BQU87SUFDMUIsbURBQW1EO0lBQ25ELDZEQUE2RDtJQUM3RCw0Q0FBNEM7SUFDNUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxPQUFPLEdBQUcsY0FBYyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNwRixDQUFDO0FBRUQsTUFBTSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbnZhciBlc2NhcGVBcmd1bWVudCA9IHJlcXVpcmUoJy4vZXNjYXBlQXJndW1lbnQnKTtcblxuZnVuY3Rpb24gZXNjYXBlQ29tbWFuZChjb21tYW5kKSB7XG4gICAgLy8gRG8gbm90IGVzY2FwZSBpZiB0aGlzIGNvbW1hbmQgaXMgbm90IGRhbmdlcm91cy4uXG4gICAgLy8gV2UgZG8gdGhpcyBzbyB0aGF0IGNvbW1hbmRzIGxpa2UgXCJlY2hvXCIgb3IgXCJpZmNvbmZpZ1wiIHdvcmtcbiAgICAvLyBRdW90aW5nIHRoZW0sIHdpbGwgbWFrZSB0aGVtIHVuYWNjZXNzaWJsZVxuICAgIHJldHVybiAvXlthLXowLTlfLV0rJC9pLnRlc3QoY29tbWFuZCkgPyBjb21tYW5kIDogZXNjYXBlQXJndW1lbnQoY29tbWFuZCwgdHJ1ZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZXNjYXBlQ29tbWFuZDtcbiJdfQ==