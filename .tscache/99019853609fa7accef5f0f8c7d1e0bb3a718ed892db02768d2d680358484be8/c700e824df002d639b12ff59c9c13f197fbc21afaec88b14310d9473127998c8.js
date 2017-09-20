//
// ShellJS
// Unix shell commands on top of Node's API
//
// Copyright (c) 2012 Artur Adib
// http://github.com/shelljs/shelljs
//
var common = require('./src/common');
//@
//@ All commands run synchronously, unless otherwise stated.
//@ All commands accept standard bash globbing characters (`*`, `?`, etc.),
//@ compatible with the [node glob module](https://github.com/isaacs/node-glob).
//@
//@ For less-commonly used commands and features, please check out our [wiki
//@ page](https://github.com/shelljs/shelljs/wiki).
//@
// Include the docs for all the default commands
//@commands
// Load all default commands
require('./commands').forEach(function (command) {
    require('./src/' + command);
});
//@
//@ ### exit(code)
//@ Exits the current process with the given exit code.
exports.exit = process.exit;
//@include ./src/error
exports.error = require('./src/error');
//@include ./src/common
exports.ShellString = common.ShellString;
//@
//@ ### env['VAR_NAME']
//@ Object containing environment variables (both getter and setter). Shortcut
//@ to process.env.
exports.env = process.env;
//@
//@ ### Pipes
//@
//@ Examples:
//@
//@ ```javascript
//@ grep('foo', 'file1.txt', 'file2.txt').sed(/o/g, 'a').to('output.txt');
//@ echo('files with o\'s in the name:\n' + ls().grep('o'));
//@ cat('test.js').exec('node'); // pipe to exec() call
//@ ```
//@
//@ Commands can send their output to another command in a pipe-like fashion.
//@ `sed`, `grep`, `cat`, `exec`, `to`, and `toEnd` can appear on the right-hand
//@ side of a pipe. Pipes can be chained.
//@
//@ ## Configuration
//@
exports.config = common.config;
//@
//@ ### config.silent
//@
//@ Example:
//@
//@ ```javascript
//@ var sh = require('shelljs');
//@ var silentState = sh.config.silent; // save old silent state
//@ sh.config.silent = true;
//@ /* ... */
//@ sh.config.silent = silentState; // restore old silent state
//@ ```
//@
//@ Suppresses all command output if `true`, except for `echo()` calls.
//@ Default is `false`.
//@
//@ ### config.fatal
//@
//@ Example:
//@
//@ ```javascript
//@ require('shelljs/global');
//@ config.fatal = true; // or set('-e');
//@ cp('this_file_does_not_exist', '/dev/null'); // throws Error here
//@ /* more commands... */
//@ ```
//@
//@ If `true` the script will throw a Javascript error when any shell.js
//@ command encounters an error. Default is `false`. This is analogous to
//@ Bash's `set -e`
//@
//@ ### config.verbose
//@
//@ Example:
//@
//@ ```javascript
//@ config.verbose = true; // or set('-v');
//@ cd('dir/');
//@ rm('-rf', 'foo.txt', 'bar.txt');
//@ exec('echo hello');
//@ ```
//@
//@ Will print each command as follows:
//@
//@ ```
//@ cd dir/
//@ rm -rf foo.txt bar.txt
//@ exec echo hello
//@ ```
//@
//@ ### config.globOptions
//@
//@ Example:
//@
//@ ```javascript
//@ config.globOptions = {nodir: true};
//@ ```
//@
//@ Use this value for calls to `glob.sync()` instead of the default options.
//@
//@ ### config.reset()
//@
//@ Example:
//@
//@ ```javascript
//@ var shell = require('shelljs');
//@ // Make changes to shell.config, and do stuff...
//@ /* ... */
//@ shell.config.reset(); // reset to original state
//@ // Do more stuff, but with original settings
//@ /* ... */
//@ ```
//@
//@ Reset shell.config to the defaults:
//@
//@ ```javascript
//@ {
//@   fatal: false,
//@   globOptions: {},
//@   maxdepth: 255,
//@   noglob: false,
//@   silent: false,
//@   verbose: false,
//@ }
//@ ```
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzaGVsbC5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzaGVsbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxFQUFFO0FBQ0YsVUFBVTtBQUNWLDJDQUEyQztBQUMzQyxFQUFFO0FBQ0YsZ0NBQWdDO0FBQ2hDLG9DQUFvQztBQUNwQyxFQUFFO0FBRUYsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBRXJDLEdBQUc7QUFDSCw0REFBNEQ7QUFDNUQsMkVBQTJFO0FBQzNFLGdGQUFnRjtBQUNoRixHQUFHO0FBQ0gsNEVBQTRFO0FBQzVFLG1EQUFtRDtBQUNuRCxHQUFHO0FBRUgsZ0RBQWdEO0FBQ2hELFdBQVc7QUFFWCw0QkFBNEI7QUFDNUIsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLE9BQU87SUFDN0MsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQztBQUVILEdBQUc7QUFDSCxrQkFBa0I7QUFDbEIsdURBQXVEO0FBQ3ZELE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUU1QixzQkFBc0I7QUFDdEIsT0FBTyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFFdkMsdUJBQXVCO0FBQ3ZCLE9BQU8sQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQztBQUV6QyxHQUFHO0FBQ0gsdUJBQXVCO0FBQ3ZCLDhFQUE4RTtBQUM5RSxtQkFBbUI7QUFDbkIsT0FBTyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBRTFCLEdBQUc7QUFDSCxhQUFhO0FBQ2IsR0FBRztBQUNILGFBQWE7QUFDYixHQUFHO0FBQ0gsaUJBQWlCO0FBQ2pCLDBFQUEwRTtBQUMxRSw0REFBNEQ7QUFDNUQsdURBQXVEO0FBQ3ZELE9BQU87QUFDUCxHQUFHO0FBQ0gsNkVBQTZFO0FBQzdFLGdGQUFnRjtBQUNoRix5Q0FBeUM7QUFFekMsR0FBRztBQUNILG9CQUFvQjtBQUNwQixHQUFHO0FBRUgsT0FBTyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBRS9CLEdBQUc7QUFDSCxxQkFBcUI7QUFDckIsR0FBRztBQUNILFlBQVk7QUFDWixHQUFHO0FBQ0gsaUJBQWlCO0FBQ2pCLGdDQUFnQztBQUNoQyxnRUFBZ0U7QUFDaEUsNEJBQTRCO0FBQzVCLGFBQWE7QUFDYiwrREFBK0Q7QUFDL0QsT0FBTztBQUNQLEdBQUc7QUFDSCx1RUFBdUU7QUFDdkUsdUJBQXVCO0FBRXZCLEdBQUc7QUFDSCxvQkFBb0I7QUFDcEIsR0FBRztBQUNILFlBQVk7QUFDWixHQUFHO0FBQ0gsaUJBQWlCO0FBQ2pCLDhCQUE4QjtBQUM5Qix5Q0FBeUM7QUFDekMscUVBQXFFO0FBQ3JFLDBCQUEwQjtBQUMxQixPQUFPO0FBQ1AsR0FBRztBQUNILHdFQUF3RTtBQUN4RSx5RUFBeUU7QUFDekUsbUJBQW1CO0FBRW5CLEdBQUc7QUFDSCxzQkFBc0I7QUFDdEIsR0FBRztBQUNILFlBQVk7QUFDWixHQUFHO0FBQ0gsaUJBQWlCO0FBQ2pCLDJDQUEyQztBQUMzQyxlQUFlO0FBQ2Ysb0NBQW9DO0FBQ3BDLHVCQUF1QjtBQUN2QixPQUFPO0FBQ1AsR0FBRztBQUNILHVDQUF1QztBQUN2QyxHQUFHO0FBQ0gsT0FBTztBQUNQLFdBQVc7QUFDWCwwQkFBMEI7QUFDMUIsbUJBQW1CO0FBQ25CLE9BQU87QUFFUCxHQUFHO0FBQ0gsMEJBQTBCO0FBQzFCLEdBQUc7QUFDSCxZQUFZO0FBQ1osR0FBRztBQUNILGlCQUFpQjtBQUNqQix1Q0FBdUM7QUFDdkMsT0FBTztBQUNQLEdBQUc7QUFDSCw2RUFBNkU7QUFFN0UsR0FBRztBQUNILHNCQUFzQjtBQUN0QixHQUFHO0FBQ0gsWUFBWTtBQUNaLEdBQUc7QUFDSCxpQkFBaUI7QUFDakIsbUNBQW1DO0FBQ25DLG9EQUFvRDtBQUNwRCxhQUFhO0FBQ2Isb0RBQW9EO0FBQ3BELGdEQUFnRDtBQUNoRCxhQUFhO0FBQ2IsT0FBTztBQUNQLEdBQUc7QUFDSCx1Q0FBdUM7QUFDdkMsR0FBRztBQUNILGlCQUFpQjtBQUNqQixLQUFLO0FBQ0wsbUJBQW1CO0FBQ25CLHNCQUFzQjtBQUN0QixvQkFBb0I7QUFDcEIsb0JBQW9CO0FBQ3BCLG9CQUFvQjtBQUNwQixxQkFBcUI7QUFDckIsS0FBSztBQUNMLE9BQU8iLCJzb3VyY2VzQ29udGVudCI6WyIvL1xuLy8gU2hlbGxKU1xuLy8gVW5peCBzaGVsbCBjb21tYW5kcyBvbiB0b3Agb2YgTm9kZSdzIEFQSVxuLy9cbi8vIENvcHlyaWdodCAoYykgMjAxMiBBcnR1ciBBZGliXG4vLyBodHRwOi8vZ2l0aHViLmNvbS9zaGVsbGpzL3NoZWxsanNcbi8vXG5cbnZhciBjb21tb24gPSByZXF1aXJlKCcuL3NyYy9jb21tb24nKTtcblxuLy9AXG4vL0AgQWxsIGNvbW1hbmRzIHJ1biBzeW5jaHJvbm91c2x5LCB1bmxlc3Mgb3RoZXJ3aXNlIHN0YXRlZC5cbi8vQCBBbGwgY29tbWFuZHMgYWNjZXB0IHN0YW5kYXJkIGJhc2ggZ2xvYmJpbmcgY2hhcmFjdGVycyAoYCpgLCBgP2AsIGV0Yy4pLFxuLy9AIGNvbXBhdGlibGUgd2l0aCB0aGUgW25vZGUgZ2xvYiBtb2R1bGVdKGh0dHBzOi8vZ2l0aHViLmNvbS9pc2FhY3Mvbm9kZS1nbG9iKS5cbi8vQFxuLy9AIEZvciBsZXNzLWNvbW1vbmx5IHVzZWQgY29tbWFuZHMgYW5kIGZlYXR1cmVzLCBwbGVhc2UgY2hlY2sgb3V0IG91ciBbd2lraVxuLy9AIHBhZ2VdKGh0dHBzOi8vZ2l0aHViLmNvbS9zaGVsbGpzL3NoZWxsanMvd2lraSkuXG4vL0BcblxuLy8gSW5jbHVkZSB0aGUgZG9jcyBmb3IgYWxsIHRoZSBkZWZhdWx0IGNvbW1hbmRzXG4vL0Bjb21tYW5kc1xuXG4vLyBMb2FkIGFsbCBkZWZhdWx0IGNvbW1hbmRzXG5yZXF1aXJlKCcuL2NvbW1hbmRzJykuZm9yRWFjaChmdW5jdGlvbiAoY29tbWFuZCkge1xuICByZXF1aXJlKCcuL3NyYy8nICsgY29tbWFuZCk7XG59KTtcblxuLy9AXG4vL0AgIyMjIGV4aXQoY29kZSlcbi8vQCBFeGl0cyB0aGUgY3VycmVudCBwcm9jZXNzIHdpdGggdGhlIGdpdmVuIGV4aXQgY29kZS5cbmV4cG9ydHMuZXhpdCA9IHByb2Nlc3MuZXhpdDtcblxuLy9AaW5jbHVkZSAuL3NyYy9lcnJvclxuZXhwb3J0cy5lcnJvciA9IHJlcXVpcmUoJy4vc3JjL2Vycm9yJyk7XG5cbi8vQGluY2x1ZGUgLi9zcmMvY29tbW9uXG5leHBvcnRzLlNoZWxsU3RyaW5nID0gY29tbW9uLlNoZWxsU3RyaW5nO1xuXG4vL0Bcbi8vQCAjIyMgZW52WydWQVJfTkFNRSddXG4vL0AgT2JqZWN0IGNvbnRhaW5pbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzIChib3RoIGdldHRlciBhbmQgc2V0dGVyKS4gU2hvcnRjdXRcbi8vQCB0byBwcm9jZXNzLmVudi5cbmV4cG9ydHMuZW52ID0gcHJvY2Vzcy5lbnY7XG5cbi8vQFxuLy9AICMjIyBQaXBlc1xuLy9AXG4vL0AgRXhhbXBsZXM6XG4vL0Bcbi8vQCBgYGBqYXZhc2NyaXB0XG4vL0AgZ3JlcCgnZm9vJywgJ2ZpbGUxLnR4dCcsICdmaWxlMi50eHQnKS5zZWQoL28vZywgJ2EnKS50bygnb3V0cHV0LnR4dCcpO1xuLy9AIGVjaG8oJ2ZpbGVzIHdpdGggb1xcJ3MgaW4gdGhlIG5hbWU6XFxuJyArIGxzKCkuZ3JlcCgnbycpKTtcbi8vQCBjYXQoJ3Rlc3QuanMnKS5leGVjKCdub2RlJyk7IC8vIHBpcGUgdG8gZXhlYygpIGNhbGxcbi8vQCBgYGBcbi8vQFxuLy9AIENvbW1hbmRzIGNhbiBzZW5kIHRoZWlyIG91dHB1dCB0byBhbm90aGVyIGNvbW1hbmQgaW4gYSBwaXBlLWxpa2UgZmFzaGlvbi5cbi8vQCBgc2VkYCwgYGdyZXBgLCBgY2F0YCwgYGV4ZWNgLCBgdG9gLCBhbmQgYHRvRW5kYCBjYW4gYXBwZWFyIG9uIHRoZSByaWdodC1oYW5kXG4vL0Agc2lkZSBvZiBhIHBpcGUuIFBpcGVzIGNhbiBiZSBjaGFpbmVkLlxuXG4vL0Bcbi8vQCAjIyBDb25maWd1cmF0aW9uXG4vL0BcblxuZXhwb3J0cy5jb25maWcgPSBjb21tb24uY29uZmlnO1xuXG4vL0Bcbi8vQCAjIyMgY29uZmlnLnNpbGVudFxuLy9AXG4vL0AgRXhhbXBsZTpcbi8vQFxuLy9AIGBgYGphdmFzY3JpcHRcbi8vQCB2YXIgc2ggPSByZXF1aXJlKCdzaGVsbGpzJyk7XG4vL0AgdmFyIHNpbGVudFN0YXRlID0gc2guY29uZmlnLnNpbGVudDsgLy8gc2F2ZSBvbGQgc2lsZW50IHN0YXRlXG4vL0Agc2guY29uZmlnLnNpbGVudCA9IHRydWU7XG4vL0AgLyogLi4uICovXG4vL0Agc2guY29uZmlnLnNpbGVudCA9IHNpbGVudFN0YXRlOyAvLyByZXN0b3JlIG9sZCBzaWxlbnQgc3RhdGVcbi8vQCBgYGBcbi8vQFxuLy9AIFN1cHByZXNzZXMgYWxsIGNvbW1hbmQgb3V0cHV0IGlmIGB0cnVlYCwgZXhjZXB0IGZvciBgZWNobygpYCBjYWxscy5cbi8vQCBEZWZhdWx0IGlzIGBmYWxzZWAuXG5cbi8vQFxuLy9AICMjIyBjb25maWcuZmF0YWxcbi8vQFxuLy9AIEV4YW1wbGU6XG4vL0Bcbi8vQCBgYGBqYXZhc2NyaXB0XG4vL0AgcmVxdWlyZSgnc2hlbGxqcy9nbG9iYWwnKTtcbi8vQCBjb25maWcuZmF0YWwgPSB0cnVlOyAvLyBvciBzZXQoJy1lJyk7XG4vL0AgY3AoJ3RoaXNfZmlsZV9kb2VzX25vdF9leGlzdCcsICcvZGV2L251bGwnKTsgLy8gdGhyb3dzIEVycm9yIGhlcmVcbi8vQCAvKiBtb3JlIGNvbW1hbmRzLi4uICovXG4vL0AgYGBgXG4vL0Bcbi8vQCBJZiBgdHJ1ZWAgdGhlIHNjcmlwdCB3aWxsIHRocm93IGEgSmF2YXNjcmlwdCBlcnJvciB3aGVuIGFueSBzaGVsbC5qc1xuLy9AIGNvbW1hbmQgZW5jb3VudGVycyBhbiBlcnJvci4gRGVmYXVsdCBpcyBgZmFsc2VgLiBUaGlzIGlzIGFuYWxvZ291cyB0b1xuLy9AIEJhc2gncyBgc2V0IC1lYFxuXG4vL0Bcbi8vQCAjIyMgY29uZmlnLnZlcmJvc2Vcbi8vQFxuLy9AIEV4YW1wbGU6XG4vL0Bcbi8vQCBgYGBqYXZhc2NyaXB0XG4vL0AgY29uZmlnLnZlcmJvc2UgPSB0cnVlOyAvLyBvciBzZXQoJy12Jyk7XG4vL0AgY2QoJ2Rpci8nKTtcbi8vQCBybSgnLXJmJywgJ2Zvby50eHQnLCAnYmFyLnR4dCcpO1xuLy9AIGV4ZWMoJ2VjaG8gaGVsbG8nKTtcbi8vQCBgYGBcbi8vQFxuLy9AIFdpbGwgcHJpbnQgZWFjaCBjb21tYW5kIGFzIGZvbGxvd3M6XG4vL0Bcbi8vQCBgYGBcbi8vQCBjZCBkaXIvXG4vL0Agcm0gLXJmIGZvby50eHQgYmFyLnR4dFxuLy9AIGV4ZWMgZWNobyBoZWxsb1xuLy9AIGBgYFxuXG4vL0Bcbi8vQCAjIyMgY29uZmlnLmdsb2JPcHRpb25zXG4vL0Bcbi8vQCBFeGFtcGxlOlxuLy9AXG4vL0AgYGBgamF2YXNjcmlwdFxuLy9AIGNvbmZpZy5nbG9iT3B0aW9ucyA9IHtub2RpcjogdHJ1ZX07XG4vL0AgYGBgXG4vL0Bcbi8vQCBVc2UgdGhpcyB2YWx1ZSBmb3IgY2FsbHMgdG8gYGdsb2Iuc3luYygpYCBpbnN0ZWFkIG9mIHRoZSBkZWZhdWx0IG9wdGlvbnMuXG5cbi8vQFxuLy9AICMjIyBjb25maWcucmVzZXQoKVxuLy9AXG4vL0AgRXhhbXBsZTpcbi8vQFxuLy9AIGBgYGphdmFzY3JpcHRcbi8vQCB2YXIgc2hlbGwgPSByZXF1aXJlKCdzaGVsbGpzJyk7XG4vL0AgLy8gTWFrZSBjaGFuZ2VzIHRvIHNoZWxsLmNvbmZpZywgYW5kIGRvIHN0dWZmLi4uXG4vL0AgLyogLi4uICovXG4vL0Agc2hlbGwuY29uZmlnLnJlc2V0KCk7IC8vIHJlc2V0IHRvIG9yaWdpbmFsIHN0YXRlXG4vL0AgLy8gRG8gbW9yZSBzdHVmZiwgYnV0IHdpdGggb3JpZ2luYWwgc2V0dGluZ3Ncbi8vQCAvKiAuLi4gKi9cbi8vQCBgYGBcbi8vQFxuLy9AIFJlc2V0IHNoZWxsLmNvbmZpZyB0byB0aGUgZGVmYXVsdHM6XG4vL0Bcbi8vQCBgYGBqYXZhc2NyaXB0XG4vL0Age1xuLy9AICAgZmF0YWw6IGZhbHNlLFxuLy9AICAgZ2xvYk9wdGlvbnM6IHt9LFxuLy9AICAgbWF4ZGVwdGg6IDI1NSxcbi8vQCAgIG5vZ2xvYjogZmFsc2UsXG4vL0AgICBzaWxlbnQ6IGZhbHNlLFxuLy9AICAgdmVyYm9zZTogZmFsc2UsXG4vL0AgfVxuLy9AIGBgYFxuIl19