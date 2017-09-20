// Ignore warning about 'new String()'
/* eslint no-new-wrappers: 0 */
'use strict';
var os = require('os');
var fs = require('fs');
var glob = require('glob');
var shell = require('..');
var shellMethods = Object.create(shell);
// objectAssign(target_obj, source_obj1 [, source_obj2 ...])
// "Ponyfill" for Object.assign
//    objectAssign({A:1}, {b:2}, {c:3}) returns {A:1, b:2, c:3}
var objectAssign = typeof Object.assign === 'function' ?
    Object.assign :
    function objectAssign(target) {
        var sources = [].slice.call(arguments, 1);
        sources.forEach(function (source) {
            Object.keys(source).forEach(function (key) {
                target[key] = source[key];
            });
        });
        return target;
    };
exports.extend = objectAssign;
// Check if we're running under electron
var isElectron = Boolean(process.versions.electron);
// Module globals (assume no execPath by default)
var DEFAULT_CONFIG = {
    fatal: false,
    globOptions: {},
    maxdepth: 255,
    noglob: false,
    silent: false,
    verbose: false,
    execPath: null,
    bufLength: 64 * 1024,
};
var config = {
    reset: function () {
        objectAssign(this, DEFAULT_CONFIG);
        if (!isElectron) {
            this.execPath = process.execPath;
        }
    },
    resetForTesting: function () {
        this.reset();
        this.silent = true;
    },
};
config.reset();
exports.config = config;
var state = {
    error: null,
    errorCode: 0,
    currentCmd: 'shell.js',
    tempDir: null,
};
exports.state = state;
delete process.env.OLDPWD; // initially, there's no previous directory
// This is populated by calls to commonl.wrap()
var pipeMethods = [];
// Reliably test if something is any sort of javascript object
function isObject(a) {
    return typeof a === 'object' && a !== null;
}
exports.isObject = isObject;
function log() {
    /* istanbul ignore next */
    if (!config.silent) {
        console.error.apply(console, arguments);
    }
}
exports.log = log;
// Converts strings to be equivalent across all platforms. Primarily responsible
// for making sure we use '/' instead of '\' as path separators, but this may be
// expanded in the future if necessary
function convertErrorOutput(msg) {
    if (typeof msg !== 'string') {
        throw new TypeError('input must be a string');
    }
    return msg.replace(/\\/g, '/');
}
exports.convertErrorOutput = convertErrorOutput;
// Shows error message. Throws if config.fatal is true
function error(msg, _code, options) {
    // Validate input
    if (typeof msg !== 'string')
        throw new Error('msg must be a string');
    var DEFAULT_OPTIONS = {
        continue: false,
        code: 1,
        prefix: state.currentCmd + ': ',
        silent: false,
    };
    if (typeof _code === 'number' && isObject(options)) {
        options.code = _code;
    }
    else if (isObject(_code)) {
        options = _code;
    }
    else if (typeof _code === 'number') {
        options = { code: _code };
    }
    else if (typeof _code !== 'number') {
        options = {};
    }
    options = objectAssign({}, DEFAULT_OPTIONS, options);
    if (!state.errorCode)
        state.errorCode = options.code;
    var logEntry = convertErrorOutput(options.prefix + msg);
    state.error = state.error ? state.error + '\n' : '';
    state.error += logEntry;
    // Throw an error, or log the entry
    if (config.fatal)
        throw new Error(logEntry);
    if (msg.length > 0 && !options.silent)
        log(logEntry);
    if (!options.continue) {
        throw {
            msg: 'earlyExit',
            retValue: (new ShellString('', state.error, state.errorCode)),
        };
    }
}
exports.error = error;
//@
//@ ### ShellString(str)
//@
//@ Examples:
//@
//@ ```javascript
//@ var foo = ShellString('hello world');
//@ ```
//@
//@ Turns a regular string into a string-like object similar to what each
//@ command returns. This has special methods, like `.to()` and `.toEnd()`
function ShellString(stdout, stderr, code) {
    var that;
    if (stdout instanceof Array) {
        that = stdout;
        that.stdout = stdout.join('\n');
        if (stdout.length > 0)
            that.stdout += '\n';
    }
    else {
        that = new String(stdout);
        that.stdout = stdout;
    }
    that.stderr = stderr;
    that.code = code;
    // A list of all commands that can appear on the right-hand side of a pipe
    // (populated by calls to common.wrap())
    pipeMethods.forEach(function (cmd) {
        that[cmd] = shellMethods[cmd].bind(that);
    });
    return that;
}
exports.ShellString = ShellString;
// Return the home directory in a platform-agnostic way, with consideration for
// older versions of node
function getUserHome() {
    var result;
    if (os.homedir) {
        result = os.homedir(); // node 3+
    }
    else {
        result = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
    }
    return result;
}
exports.getUserHome = getUserHome;
// Returns {'alice': true, 'bob': false} when passed a string and dictionary as follows:
//   parseOptions('-a', {'a':'alice', 'b':'bob'});
// Returns {'reference': 'string-value', 'bob': false} when passed two dictionaries of the form:
//   parseOptions({'-r': 'string-value'}, {'r':'reference', 'b':'bob'});
function parseOptions(opt, map, errorOptions) {
    // Validate input
    if (typeof opt !== 'string' && !isObject(opt)) {
        throw new Error('options must be strings or key-value pairs');
    }
    else if (!isObject(map)) {
        throw new Error('parseOptions() internal error: map must be an object');
    }
    else if (errorOptions && !isObject(errorOptions)) {
        throw new Error('parseOptions() internal error: errorOptions must be object');
    }
    // All options are false by default
    var options = {};
    Object.keys(map).forEach(function (letter) {
        var optName = map[letter];
        if (optName[0] !== '!') {
            options[optName] = false;
        }
    });
    if (opt === '')
        return options; // defaults
    if (typeof opt === 'string') {
        if (opt[0] !== '-') {
            error("Options string must start with a '-'", errorOptions || {});
        }
        // e.g. chars = ['R', 'f']
        var chars = opt.slice(1).split('');
        chars.forEach(function (c) {
            if (c in map) {
                var optionName = map[c];
                if (optionName[0] === '!') {
                    options[optionName.slice(1)] = false;
                }
                else {
                    options[optionName] = true;
                }
            }
            else {
                error('option not recognized: ' + c, errorOptions || {});
            }
        });
    }
    else {
        Object.keys(opt).forEach(function (key) {
            // key is a string of the form '-r', '-d', etc.
            var c = key[1];
            if (c in map) {
                var optionName = map[c];
                options[optionName] = opt[key]; // assign the given value
            }
            else {
                error('option not recognized: ' + c, errorOptions || {});
            }
        });
    }
    return options;
}
exports.parseOptions = parseOptions;
// Expands wildcards with matching (ie. existing) file names.
// For example:
//   expand(['file*.js']) = ['file1.js', 'file2.js', ...]
//   (if the files 'file1.js', 'file2.js', etc, exist in the current dir)
function expand(list) {
    if (!Array.isArray(list)) {
        throw new TypeError('must be an array');
    }
    var expanded = [];
    list.forEach(function (listEl) {
        // Don't expand non-strings
        if (typeof listEl !== 'string') {
            expanded.push(listEl);
        }
        else {
            var ret;
            try {
                ret = glob.sync(listEl, config.globOptions);
                // if nothing matched, interpret the string literally
                ret = ret.length > 0 ? ret : [listEl];
            }
            catch (e) {
                // if glob fails, interpret the string literally
                ret = [listEl];
            }
            expanded = expanded.concat(ret);
        }
    });
    return expanded;
}
exports.expand = expand;
// Normalizes Buffer creation, using Buffer.alloc if possible.
// Also provides a good default buffer length for most use cases.
var buffer = typeof Buffer.alloc === 'function' ?
    function (len) {
        return Buffer.alloc(len || config.bufLength);
    } :
    function (len) {
        return new Buffer(len || config.bufLength);
    };
exports.buffer = buffer;
// Normalizes _unlinkSync() across platforms to match Unix behavior, i.e.
// file can be unlinked even if it's read-only, see https://github.com/joyent/node/issues/3006
function unlinkSync(file) {
    try {
        fs.unlinkSync(file);
    }
    catch (e) {
        // Try to override file permission
        /* istanbul ignore next */
        if (e.code === 'EPERM') {
            fs.chmodSync(file, '0666');
            fs.unlinkSync(file);
        }
        else {
            throw e;
        }
    }
}
exports.unlinkSync = unlinkSync;
// e.g. 'shelljs_a5f185d0443ca...'
function randomFileName() {
    function randomHash(count) {
        if (count === 1) {
            return parseInt(16 * Math.random(), 10).toString(16);
        }
        var hash = '';
        for (var i = 0; i < count; i++) {
            hash += randomHash(1);
        }
        return hash;
    }
    return 'shelljs_' + randomHash(20);
}
exports.randomFileName = randomFileName;
// Common wrapper for all Unix-like commands that performs glob expansion,
// command-logging, and other nice things
function wrap(cmd, fn, options) {
    options = options || {};
    if (options.canReceivePipe) {
        pipeMethods.push(cmd);
    }
    return function () {
        var retValue = null;
        state.currentCmd = cmd;
        state.error = null;
        state.errorCode = 0;
        try {
            var args = [].slice.call(arguments, 0);
            // Log the command to stderr, if appropriate
            if (config.verbose) {
                console.error.apply(console, [cmd].concat(args));
            }
            // If this is coming from a pipe, let's set the pipedValue (otherwise, set
            // it to the empty string)
            state.pipedValue = (this && typeof this.stdout === 'string') ? this.stdout : '';
            if (options.unix === false) {
                retValue = fn.apply(this, args);
            }
            else {
                if (isObject(args[0]) && args[0].constructor.name === 'Object') {
                    // a no-op, allowing the syntax `touch({'-r': file}, ...)`
                }
                else if (args.length === 0 || typeof args[0] !== 'string' || args[0].length <= 1 || args[0][0] !== '-') {
                    args.unshift(''); // only add dummy option if '-option' not already present
                }
                // flatten out arrays that are arguments, to make the syntax:
                //    `cp([file1, file2, file3], dest);`
                // equivalent to:
                //    `cp(file1, file2, file3, dest);`
                args = args.reduce(function (accum, cur) {
                    if (Array.isArray(cur)) {
                        return accum.concat(cur);
                    }
                    accum.push(cur);
                    return accum;
                }, []);
                // Convert ShellStrings (basically just String objects) to regular strings
                args = args.map(function (arg) {
                    if (isObject(arg) && arg.constructor.name === 'String') {
                        return arg.toString();
                    }
                    return arg;
                });
                // Expand the '~' if appropriate
                var homeDir = getUserHome();
                args = args.map(function (arg) {
                    if (typeof arg === 'string' && arg.slice(0, 2) === '~/' || arg === '~') {
                        return arg.replace(/^~/, homeDir);
                    }
                    return arg;
                });
                // Perform glob-expansion on all arguments after globStart, but preserve
                // the arguments before it (like regexes for sed and grep)
                if (!config.noglob && options.allowGlobbing === true) {
                    args = args.slice(0, options.globStart).concat(expand(args.slice(options.globStart)));
                }
                try {
                    // parse options if options are provided
                    if (isObject(options.cmdOptions)) {
                        args[0] = parseOptions(args[0], options.cmdOptions);
                    }
                    retValue = fn.apply(this, args);
                }
                catch (e) {
                    /* istanbul ignore else */
                    if (e.msg === 'earlyExit') {
                        retValue = e.retValue;
                    }
                    else {
                        throw e; // this is probably a bug that should be thrown up the call stack
                    }
                }
            }
        }
        catch (e) {
            /* istanbul ignore next */
            if (!state.error) {
                // If state.error hasn't been set it's an error thrown by Node, not us - probably a bug...
                console.error('ShellJS: internal error');
                console.error(e.stack || e);
                process.exit(1);
            }
            if (config.fatal)
                throw e;
        }
        if (options.wrapOutput &&
            (typeof retValue === 'string' || Array.isArray(retValue))) {
            retValue = new ShellString(retValue, state.error, state.errorCode);
        }
        state.currentCmd = 'shell.js';
        return retValue;
    };
} // wrap
exports.wrap = wrap;
// This returns all the input that is piped into the current command (or the
// empty string, if this isn't on the right-hand side of a pipe
function _readFromPipe() {
    return state.pipedValue;
}
exports.readFromPipe = _readFromPipe;
var DEFAULT_WRAP_OPTIONS = {
    allowGlobbing: true,
    canReceivePipe: false,
    cmdOptions: false,
    globStart: 1,
    pipeOnly: false,
    unix: true,
    wrapOutput: true,
    overWrite: false,
};
// Register a new ShellJS command
function _register(name, implementation, wrapOptions) {
    wrapOptions = wrapOptions || {};
    // If an option isn't specified, use the default
    wrapOptions = objectAssign({}, DEFAULT_WRAP_OPTIONS, wrapOptions);
    if (shell[name] && !wrapOptions.overWrite) {
        throw new Error('unable to overwrite `' + name + '` command');
    }
    if (wrapOptions.pipeOnly) {
        wrapOptions.canReceivePipe = true;
        shellMethods[name] = wrap(name, implementation, wrapOptions);
    }
    else {
        shell[name] = wrap(name, implementation, wrapOptions);
    }
}
exports.register = _register;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXGNvbW1vbi5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXGNvbW1vbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxzQ0FBc0M7QUFDdEMsK0JBQStCO0FBQy9CLFlBQVksQ0FBQztBQUViLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN2QixJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdkIsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNCLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUUxQixJQUFJLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBRXhDLDREQUE0RDtBQUM1RCwrQkFBK0I7QUFDL0IsK0RBQStEO0FBQy9ELElBQUksWUFBWSxHQUFHLE9BQU8sTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVO0lBQ3BELE1BQU0sQ0FBQyxNQUFNO0lBQ2Isc0JBQXNCLE1BQU07UUFDMUIsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxNQUFNO1lBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsR0FBRztnQkFDdkMsTUFBTSxDQUFD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QUFVLEVBQUUsS0FBSztJQUNqQixTQUFTLEVBQUUsQ0FBQztJQUNaLFFBQVEsRUFBRSxLQUFLO0lBQ2YsSUFBSSxFQUFFLElBQUk7SUFDVixVQUFVLEVBQUUsSUFBSTtJQUNoQixTQUFTLEVBQUUsS0FBSztDQUNqQixDQUFDO0FBRUYsaUNBQWlDO0FBQ2pDLG1CQUFtQixJQUFJLEVBQUUsY0FBYyxFQUFFLFdBQVc7SUFDbEQsV0FBVyxHQUFHLFdBQVcsSUFBSSxFQUFFLENBQUM7SUFDaEMsZ0RBQWdEO0lBQ2hELFdBQVcsR0FBRyxZQUFZLENBQUMsRUFBRSxFQUFFLG9CQUFvQixFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBRWxFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxHQUFHLFdBQVcsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN6QixXQUFXLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztRQUNsQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3hELENBQUM7QUFDSCxDQUFDO0FBQ0QsT0FBTyxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBJZ25vcmUgd2FybmluZyBhYm91dCAnbmV3IFN0cmluZygpJ1xuLyogZXNsaW50IG5vLW5ldy13cmFwcGVyczogMCAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgb3MgPSByZXF1aXJlKCdvcycpO1xudmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbnZhciBnbG9iID0gcmVxdWlyZSgnZ2xvYicpO1xudmFyIHNoZWxsID0gcmVxdWlyZSgnLi4nKTtcblxudmFyIHNoZWxsTWV0aG9kcyA9IE9iamVjdC5jcmVhdGUoc2hlbGwpO1xuXG4vLyBvYmplY3RBc3NpZ24odGFyZ2V0X29iaiwgc291cmNlX29iajEgWywgc291cmNlX29iajIgLi4uXSlcbi8vIFwiUG9ueWZpbGxcIiBmb3IgT2JqZWN0LmFzc2lnblxuLy8gICAgb2JqZWN0QXNzaWduKHtBOjF9LCB7YjoyfSwge2M6M30pIHJldHVybnMge0E6MSwgYjoyLCBjOjN9XG52YXIgb2JqZWN0QXNzaWduID0gdHlwZW9mIE9iamVjdC5hc3NpZ24gPT09ICdmdW5jdGlvbicgP1xuICBPYmplY3QuYXNzaWduIDpcbiAgZnVuY3Rpb24gb2JqZWN0QXNzaWduKHRhcmdldCkge1xuICAgIHZhciBzb3VyY2VzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHNvdXJjZXMuZm9yRWFjaChmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICBPYmplY3Qua2V5cyhzb3VyY2UpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9O1xuZXhwb3J0cy5leHRlbmQgPSBvYmplY3RBc3NpZ247XG5cbi8vIENoZWNrIGlmIHdlJ3JlIHJ1bm5pbmcgdW5kZXIgZWxlY3Ryb25cbnZhciBpc0VsZWN0cm9uID0gQm9vbGVhbihwcm9jZXNzLnZlcnNpb25zLmVsZWN0cm9uKTtcblxuLy8gTW9kdWxlIGdsb2JhbHMgKGFzc3VtZSBubyBleGVjUGF0aCBieSBkZWZhdWx0KVxudmFyIERFRkFVTFRfQ09ORklHID0ge1xuICBmYXRhbDogZmFsc2UsXG4gIGdsb2JPcHRpb25zOiB7fSxcbiAgbWF4ZGVwdGg6IDI1NSxcbiAgbm9nbG9iOiBmYWxzZSxcbiAgc2lsZW50OiBmYWxzZSxcbiAgdmVyYm9zZTogZmFsc2UsXG4gIGV4ZWNQYXRoOiBudWxsLFxuICBidWZMZW5ndGg6IDY0ICogMTAyNCwgLy8gNjRLQlxufTtcblxudmFyIGNvbmZpZyA9IHtcbiAgcmVzZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICBvYmplY3RBc3NpZ24odGhpcywgREVGQVVMVF9DT05GSUcpO1xuICAgIGlmICghaXNFbGVjdHJvbikge1xuICAgICAgdGhpcy5leGVjUGF0aCA9IHByb2Nlc3MuZXhlY1BhdGg7XG4gICAgfVxuICB9LFxuICByZXNldEZvclRlc3Rpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnJlc2V0KCk7XG4gICAgdGhpcy5zaWxlbnQgPSB0cnVlO1xuICB9LFxufTtcblxuY29uZmlnLnJlc2V0KCk7XG5leHBvcnRzLmNvbmZpZyA9IGNvbmZpZztcblxudmFyIHN0YXRlID0ge1xuICBlcnJvcjogbnVsbCxcbiAgZXJyb3JDb2RlOiAwLFxuICBjdXJyZW50Q21kOiAnc2hlbGwuanMnLFxuICB0ZW1wRGlyOiBudWxsLFxufTtcbmV4cG9ydHMuc3RhdGUgPSBzdGF0ZTtcblxuZGVsZXRlIHByb2Nlc3MuZW52Lk9MRFBXRDsgLy8gaW5pdGlhbGx5LCB0aGVyZSdzIG5vIHByZXZpb3VzIGRpcmVjdG9yeVxuXG4vLyBUaGlzIGlzIHBvcHVsYXRlZCBieSBjYWxscyB0byBjb21tb25sLndyYXAoKVxudmFyIHBpcGVNZXRob2RzID0gW107XG5cbi8vIFJlbGlhYmx5IHRlc3QgaWYgc29tZXRoaW5nIGlzIGFueSBzb3J0IG9mIGphdmFzY3JpcHQgb2JqZWN0XG5mdW5jdGlvbiBpc09iamVjdChhKSB7XG4gIHJldHVybiB0eXBlb2YgYSA9PT0gJ29iamVjdCcgJiYgYSAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gbG9nKCkge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBpZiAoIWNvbmZpZy5zaWxlbnQpIHtcbiAgICBjb25zb2xlLmVycm9yLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gIH1cbn1cbmV4cG9ydHMubG9nID0gbG9nO1xuXG4vLyBDb252ZXJ0cyBzdHJpbmdzIHRvIGJlIGVxdWl2YWxlbnQgYWNyb3NzIGFsbCBwbGF0Zm9ybXMuIFByaW1hcmlseSByZXNwb25zaWJsZVxuLy8gZm9yIG1ha2luZyBzdXJlIHdlIHVzZSAnLycgaW5zdGVhZCBvZiAnXFwnIGFzIHBhdGggc2VwYXJhdG9ycywgYnV0IHRoaXMgbWF5IGJlXG4vLyBleHBhbmRlZCBpbiB0aGUgZnV0dXJlIGlmIG5lY2Vzc2FyeVxuZnVuY3Rpb24gY29udmVydEVycm9yT3V0cHV0KG1zZykge1xuICBpZiAodHlwZW9mIG1zZyAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdpbnB1dCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gIH1cbiAgcmV0dXJuIG1zZy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG59XG5leHBvcnRzLmNvbnZlcnRFcnJvck91dHB1dCA9IGNvbnZlcnRFcnJvck91dHB1dDtcblxuLy8gU2hvd3MgZXJyb3IgbWVzc2FnZS4gVGhyb3dzIGlmIGNvbmZpZy5mYXRhbCBpcyB0cnVlXG5mdW5jdGlvbiBlcnJvcihtc2csIF9jb2RlLCBvcHRpb25zKSB7XG4gIC8vIFZhbGlkYXRlIGlucHV0XG4gIGlmICh0eXBlb2YgbXNnICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IEVycm9yKCdtc2cgbXVzdCBiZSBhIHN0cmluZycpO1xuXG4gIHZhciBERUZBVUxUX09QVElPTlMgPSB7XG4gICAgY29udGludWU6IGZhbHNlLFxuICAgIGNvZGU6IDEsXG4gICAgcHJlZml4OiBzdGF0ZS5jdXJyZW50Q21kICsgJzogJyxcbiAgICBzaWxlbnQ6IGZhbHNlLFxuICB9O1xuXG4gIGlmICh0eXBlb2YgX2NvZGUgPT09ICdudW1iZXInICYmIGlzT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5jb2RlID0gX2NvZGU7XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoX2NvZGUpKSB7IC8vIG5vICdjb2RlJ1xuICAgIG9wdGlvbnMgPSBfY29kZTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgX2NvZGUgPT09ICdudW1iZXInKSB7IC8vIG5vICdvcHRpb25zJ1xuICAgIG9wdGlvbnMgPSB7IGNvZGU6IF9jb2RlIH07XG4gIH0gZWxzZSBpZiAodHlwZW9mIF9jb2RlICE9PSAnbnVtYmVyJykgeyAvLyBvbmx5ICdtc2cnXG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIG9wdGlvbnMgPSBvYmplY3RBc3NpZ24oe30sIERFRkFVTFRfT1BUSU9OUywgb3B0aW9ucyk7XG5cbiAgaWYgKCFzdGF0ZS5lcnJvckNvZGUpIHN0YXRlLmVycm9yQ29kZSA9IG9wdGlvbnMuY29kZTtcblxuICB2YXIgbG9nRW50cnkgPSBjb252ZXJ0RXJyb3JPdXRwdXQob3B0aW9ucy5wcmVmaXggKyBtc2cpO1xuICBzdGF0ZS5lcnJvciA9IHN0YXRlLmVycm9yID8gc3RhdGUuZXJyb3IgKyAnXFxuJyA6ICcnO1xuICBzdGF0ZS5lcnJvciArPSBsb2dFbnRyeTtcblxuICAvLyBUaHJvdyBhbiBlcnJvciwgb3IgbG9nIHRoZSBlbnRyeVxuICBpZiAoY29uZmlnLmZhdGFsKSB0aHJvdyBuZXcgRXJyb3IobG9nRW50cnkpO1xuICBpZiAobXNnLmxlbmd0aCA+IDAgJiYgIW9wdGlvbnMuc2lsZW50KSBsb2cobG9nRW50cnkpO1xuXG4gIGlmICghb3B0aW9ucy5jb250aW51ZSkge1xuICAgIHRocm93IHtcbiAgICAgIG1zZzogJ2Vhcmx5RXhpdCcsXG4gICAgICByZXRWYWx1ZTogKG5ldyBTaGVsbFN0cmluZygnJywgc3RhdGUuZXJyb3IsIHN0YXRlLmVycm9yQ29kZSkpLFxuICAgIH07XG4gIH1cbn1cbmV4cG9ydHMuZXJyb3IgPSBlcnJvcjtcblxuLy9AXG4vL0AgIyMjIFNoZWxsU3RyaW5nKHN0cilcbi8vQFxuLy9AIEV4YW1wbGVzOlxuLy9AXG4vL0AgYGBgamF2YXNjcmlwdFxuLy9AIHZhciBmb28gPSBTaGVsbFN0cmluZygnaGVsbG8gd29ybGQnKTtcbi8vQCBgYGBcbi8vQFxuLy9AIFR1cm5zIGEgcmVndWxhciBzdHJpbmcgaW50byBhIHN0cmluZy1saWtlIG9iamVjdCBzaW1pbGFyIHRvIHdoYXQgZWFjaFxuLy9AIGNvbW1hbmQgcmV0dXJucy4gVGhpcyBoYXMgc3BlY2lhbCBtZXRob2RzLCBsaWtlIGAudG8oKWAgYW5kIGAudG9FbmQoKWBcbmZ1bmN0aW9uIFNoZWxsU3RyaW5nKHN0ZG91dCwgc3RkZXJyLCBjb2RlKSB7XG4gIHZhciB0aGF0O1xuICBpZiAoc3Rkb3V0IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICB0aGF0ID0gc3Rkb3V0O1xuICAgIHRoYXQuc3Rkb3V0ID0gc3Rkb3V0LmpvaW4oJ1xcbicpO1xuICAgIGlmIChzdGRvdXQubGVuZ3RoID4gMCkgdGhhdC5zdGRvdXQgKz0gJ1xcbic7XG4gIH0gZWxzZSB7XG4gICAgdGhhdCA9IG5ldyBTdHJpbmcoc3Rkb3V0KTtcbiAgICB0aGF0LnN0ZG91dCA9IHN0ZG91dDtcbiAgfVxuICB0aGF0LnN0ZGVyciA9IHN0ZGVycjtcbiAgdGhhdC5jb2RlID0gY29kZTtcbiAgLy8gQSBsaXN0IG9mIGFsbCBjb21tYW5kcyB0aGF0IGNhbiBhcHBlYXIgb24gdGhlIHJpZ2h0LWhhbmQgc2lkZSBvZiBhIHBpcGVcbiAgLy8gKHBvcHVsYXRlZCBieSBjYWxscyB0byBjb21tb24ud3JhcCgpKVxuICBwaXBlTWV0aG9kcy5mb3JFYWNoKGZ1bmN0aW9uIChjbWQpIHtcbiAgICB0aGF0W2NtZF0gPSBzaGVsbE1ldGhvZHNbY21kXS5iaW5kKHRoYXQpO1xuICB9KTtcbiAgcmV0dXJuIHRoYXQ7XG59XG5cbmV4cG9ydHMuU2hlbGxTdHJpbmcgPSBTaGVsbFN0cmluZztcblxuLy8gUmV0dXJuIHRoZSBob21lIGRpcmVjdG9yeSBpbiBhIHBsYXRmb3JtLWFnbm9zdGljIHdheSwgd2l0aCBjb25zaWRlcmF0aW9uIGZvclxuLy8gb2xkZXIgdmVyc2lvbnMgb2Ygbm9kZVxuZnVuY3Rpb24gZ2V0VXNlckhvbWUoKSB7XG4gIHZhciByZXN1bHQ7XG4gIGlmIChvcy5ob21lZGlyKSB7XG4gICAgcmVzdWx0ID0gb3MuaG9tZWRpcigpOyAvLyBub2RlIDMrXG4gIH0gZWxzZSB7XG4gICAgcmVzdWx0ID0gcHJvY2Vzcy5lbnZbKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpID8gJ1VTRVJQUk9GSUxFJyA6ICdIT01FJ107XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbmV4cG9ydHMuZ2V0VXNlckhvbWUgPSBnZXRVc2VySG9tZTtcblxuLy8gUmV0dXJucyB7J2FsaWNlJzogdHJ1ZSwgJ2JvYic6IGZhbHNlfSB3aGVuIHBhc3NlZCBhIHN0cmluZyBhbmQgZGljdGlvbmFyeSBhcyBmb2xsb3dzOlxuLy8gICBwYXJzZU9wdGlvbnMoJy1hJywgeydhJzonYWxpY2UnLCAnYic6J2JvYid9KTtcbi8vIFJldHVybnMgeydyZWZlcmVuY2UnOiAnc3RyaW5nLXZhbHVlJywgJ2JvYic6IGZhbHNlfSB3aGVuIHBhc3NlZCB0d28gZGljdGlvbmFyaWVzIG9mIHRoZSBmb3JtOlxuLy8gICBwYXJzZU9wdGlvbnMoeyctcic6ICdzdHJpbmctdmFsdWUnfSwgeydyJzoncmVmZXJlbmNlJywgJ2InOidib2InfSk7XG5mdW5jdGlvbiBwYXJzZU9wdGlvbnMob3B0LCBtYXAsIGVycm9yT3B0aW9ucykge1xuICAvLyBWYWxpZGF0ZSBpbnB1dFxuICBpZiAodHlwZW9mIG9wdCAhPT0gJ3N0cmluZycgJiYgIWlzT2JqZWN0KG9wdCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ29wdGlvbnMgbXVzdCBiZSBzdHJpbmdzIG9yIGtleS12YWx1ZSBwYWlycycpO1xuICB9IGVsc2UgaWYgKCFpc09iamVjdChtYXApKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwYXJzZU9wdGlvbnMoKSBpbnRlcm5hbCBlcnJvcjogbWFwIG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gIH0gZWxzZSBpZiAoZXJyb3JPcHRpb25zICYmICFpc09iamVjdChlcnJvck9wdGlvbnMpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwYXJzZU9wdGlvbnMoKSBpbnRlcm5hbCBlcnJvcjogZXJyb3JPcHRpb25zIG11c3QgYmUgb2JqZWN0Jyk7XG4gIH1cblxuICAvLyBBbGwgb3B0aW9ucyBhcmUgZmFsc2UgYnkgZGVmYXVsdFxuICB2YXIgb3B0aW9ucyA9IHt9O1xuICBPYmplY3Qua2V5cyhtYXApLmZvckVhY2goZnVuY3Rpb24gKGxldHRlcikge1xuICAgIHZhciBvcHROYW1lID0gbWFwW2xldHRlcl07XG4gICAgaWYgKG9wdE5hbWVbMF0gIT09ICchJykge1xuICAgICAgb3B0aW9uc1tvcHROYW1lXSA9IGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKG9wdCA9PT0gJycpIHJldHVybiBvcHRpb25zOyAvLyBkZWZhdWx0c1xuXG4gIGlmICh0eXBlb2Ygb3B0ID09PSAnc3RyaW5nJykge1xuICAgIGlmIChvcHRbMF0gIT09ICctJykge1xuICAgICAgZXJyb3IoXCJPcHRpb25zIHN0cmluZyBtdXN0IHN0YXJ0IHdpdGggYSAnLSdcIiwgZXJyb3JPcHRpb25zIHx8IHt9KTtcbiAgICB9XG5cbiAgICAvLyBlLmcuIGNoYXJzID0gWydSJywgJ2YnXVxuICAgIHZhciBjaGFycyA9IG9wdC5zbGljZSgxKS5zcGxpdCgnJyk7XG5cbiAgICBjaGFycy5mb3JFYWNoKGZ1bmN0aW9uIChjKSB7XG4gICAgICBpZiAoYyBpbiBtYXApIHtcbiAgICAgICAgdmFyIG9wdGlvbk5hbWUgPSBtYXBbY107XG4gICAgICAgIGlmIChvcHRpb25OYW1lWzBdID09PSAnIScpIHtcbiAgICAgICAgICBvcHRpb25zW29wdGlvbk5hbWUuc2xpY2UoMSldID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3B0aW9uc1tvcHRpb25OYW1lXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVycm9yKCdvcHRpb24gbm90IHJlY29nbml6ZWQ6ICcgKyBjLCBlcnJvck9wdGlvbnMgfHwge30pO1xuICAgICAgfVxuICAgIH0pO1xuICB9IGVsc2UgeyAvLyBvcHQgaXMgYW4gT2JqZWN0XG4gICAgT2JqZWN0LmtleXMob3B0KS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIC8vIGtleSBpcyBhIHN0cmluZyBvZiB0aGUgZm9ybSAnLXInLCAnLWQnLCBldGMuXG4gICAgICB2YXIgYyA9IGtleVsxXTtcbiAgICAgIGlmIChjIGluIG1hcCkge1xuICAgICAgICB2YXIgb3B0aW9uTmFtZSA9IG1hcFtjXTtcbiAgICAgICAgb3B0aW9uc1tvcHRpb25OYW1lXSA9IG9wdFtrZXldOyAvLyBhc3NpZ24gdGhlIGdpdmVuIHZhbHVlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlcnJvcignb3B0aW9uIG5vdCByZWNvZ25pemVkOiAnICsgYywgZXJyb3JPcHRpb25zIHx8IHt9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICByZXR1cm4gb3B0aW9ucztcbn1cbmV4cG9ydHMucGFyc2VPcHRpb25zID0gcGFyc2VPcHRpb25zO1xuXG4vLyBFeHBhbmRzIHdpbGRjYXJkcyB3aXRoIG1hdGNoaW5nIChpZS4gZXhpc3RpbmcpIGZpbGUgbmFtZXMuXG4vLyBGb3IgZXhhbXBsZTpcbi8vICAgZXhwYW5kKFsnZmlsZSouanMnXSkgPSBbJ2ZpbGUxLmpzJywgJ2ZpbGUyLmpzJywgLi4uXVxuLy8gICAoaWYgdGhlIGZpbGVzICdmaWxlMS5qcycsICdmaWxlMi5qcycsIGV0YywgZXhpc3QgaW4gdGhlIGN1cnJlbnQgZGlyKVxuZnVuY3Rpb24gZXhwYW5kKGxpc3QpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbXVzdCBiZSBhbiBhcnJheScpO1xuICB9XG4gIHZhciBleHBhbmRlZCA9IFtdO1xuICBsaXN0LmZvckVhY2goZnVuY3Rpb24gKGxpc3RFbCkge1xuICAgIC8vIERvbid0IGV4cGFuZCBub24tc3RyaW5nc1xuICAgIGlmICh0eXBlb2YgbGlzdEVsICE9PSAnc3RyaW5nJykge1xuICAgICAgZXhwYW5kZWQucHVzaChsaXN0RWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcmV0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0ID0gZ2xvYi5zeW5jKGxpc3RFbCwgY29uZmlnLmdsb2JPcHRpb25zKTtcbiAgICAgICAgLy8gaWYgbm90aGluZyBtYXRjaGVkLCBpbnRlcnByZXQgdGhlIHN0cmluZyBsaXRlcmFsbHlcbiAgICAgICAgcmV0ID0gcmV0Lmxlbmd0aCA+IDAgPyByZXQgOiBbbGlzdEVsXTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gaWYgZ2xvYiBmYWlscywgaW50ZXJwcmV0IHRoZSBzdHJpbmcgbGl0ZXJhbGx5XG4gICAgICAgIHJldCA9IFtsaXN0RWxdO1xuICAgICAgfVxuICAgICAgZXhwYW5kZWQgPSBleHBhbmRlZC5jb25jYXQocmV0KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZXhwYW5kZWQ7XG59XG5leHBvcnRzLmV4cGFuZCA9IGV4cGFuZDtcblxuLy8gTm9ybWFsaXplcyBCdWZmZXIgY3JlYXRpb24sIHVzaW5nIEJ1ZmZlci5hbGxvYyBpZiBwb3NzaWJsZS5cbi8vIEFsc28gcHJvdmlkZXMgYSBnb29kIGRlZmF1bHQgYnVmZmVyIGxlbmd0aCBmb3IgbW9zdCB1c2UgY2FzZXMuXG52YXIgYnVmZmVyID0gdHlwZW9mIEJ1ZmZlci5hbGxvYyA9PT0gJ2Z1bmN0aW9uJyA/XG4gIGZ1bmN0aW9uIChsZW4pIHtcbiAgICByZXR1cm4gQnVmZmVyLmFsbG9jKGxlbiB8fCBjb25maWcuYnVmTGVuZ3RoKTtcbiAgfSA6XG4gIGZ1bmN0aW9uIChsZW4pIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihsZW4gfHwgY29uZmlnLmJ1Zkxlbmd0aCk7XG4gIH07XG5leHBvcnRzLmJ1ZmZlciA9IGJ1ZmZlcjtcblxuLy8gTm9ybWFsaXplcyBfdW5saW5rU3luYygpIGFjcm9zcyBwbGF0Zm9ybXMgdG8gbWF0Y2ggVW5peCBiZWhhdmlvciwgaS5lLlxuLy8gZmlsZSBjYW4gYmUgdW5saW5rZWQgZXZlbiBpZiBpdCdzIHJlYWQtb25seSwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9pc3N1ZXMvMzAwNlxuZnVuY3Rpb24gdW5saW5rU3luYyhmaWxlKSB7XG4gIHRyeSB7XG4gICAgZnMudW5saW5rU3luYyhmaWxlKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIFRyeSB0byBvdmVycmlkZSBmaWxlIHBlcm1pc3Npb25cbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgIGlmIChlLmNvZGUgPT09ICdFUEVSTScpIHtcbiAgICAgIGZzLmNobW9kU3luYyhmaWxlLCAnMDY2NicpO1xuICAgICAgZnMudW5saW5rU3luYyhmaWxlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cbn1cbmV4cG9ydHMudW5saW5rU3luYyA9IHVubGlua1N5bmM7XG5cbi8vIGUuZy4gJ3NoZWxsanNfYTVmMTg1ZDA0NDNjYS4uLidcbmZ1bmN0aW9uIHJhbmRvbUZpbGVOYW1lKCkge1xuICBmdW5jdGlvbiByYW5kb21IYXNoKGNvdW50KSB7XG4gICAgaWYgKGNvdW50ID09PSAxKSB7XG4gICAgICByZXR1cm4gcGFyc2VJbnQoMTYgKiBNYXRoLnJhbmRvbSgpLCAxMCkudG9TdHJpbmcoMTYpO1xuICAgIH1cbiAgICB2YXIgaGFzaCA9ICcnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgaGFzaCArPSByYW5kb21IYXNoKDEpO1xuICAgIH1cbiAgICByZXR1cm4gaGFzaDtcbiAgfVxuXG4gIHJldHVybiAnc2hlbGxqc18nICsgcmFuZG9tSGFzaCgyMCk7XG59XG5leHBvcnRzLnJhbmRvbUZpbGVOYW1lID0gcmFuZG9tRmlsZU5hbWU7XG5cbi8vIENvbW1vbiB3cmFwcGVyIGZvciBhbGwgVW5peC1saWtlIGNvbW1hbmRzIHRoYXQgcGVyZm9ybXMgZ2xvYiBleHBhbnNpb24sXG4vLyBjb21tYW5kLWxvZ2dpbmcsIGFuZCBvdGhlciBuaWNlIHRoaW5nc1xuZnVuY3Rpb24gd3JhcChjbWQsIGZuLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZiAob3B0aW9ucy5jYW5SZWNlaXZlUGlwZSkge1xuICAgIHBpcGVNZXRob2RzLnB1c2goY21kKTtcbiAgfVxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXRWYWx1ZSA9IG51bGw7XG5cbiAgICBzdGF0ZS5jdXJyZW50Q21kID0gY21kO1xuICAgIHN0YXRlLmVycm9yID0gbnVsbDtcbiAgICBzdGF0ZS5lcnJvckNvZGUgPSAwO1xuXG4gICAgdHJ5IHtcbiAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXG4gICAgICAvLyBMb2cgdGhlIGNvbW1hbmQgdG8gc3RkZXJyLCBpZiBhcHByb3ByaWF0ZVxuICAgICAgaWYgKGNvbmZpZy52ZXJib3NlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IuYXBwbHkoY29uc29sZSwgW2NtZF0uY29uY2F0KGFyZ3MpKTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhpcyBpcyBjb21pbmcgZnJvbSBhIHBpcGUsIGxldCdzIHNldCB0aGUgcGlwZWRWYWx1ZSAob3RoZXJ3aXNlLCBzZXRcbiAgICAgIC8vIGl0IHRvIHRoZSBlbXB0eSBzdHJpbmcpXG4gICAgICBzdGF0ZS5waXBlZFZhbHVlID0gKHRoaXMgJiYgdHlwZW9mIHRoaXMuc3Rkb3V0ID09PSAnc3RyaW5nJykgPyB0aGlzLnN0ZG91dCA6ICcnO1xuXG4gICAgICBpZiAob3B0aW9ucy51bml4ID09PSBmYWxzZSkgeyAvLyB0aGlzIGJyYW5jaCBpcyBmb3IgZXhlYygpXG4gICAgICAgIHJldFZhbHVlID0gZm4uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9IGVsc2UgeyAvLyBhbmQgdGhpcyBicmFuY2ggaXMgZm9yIGV2ZXJ5dGhpbmcgZWxzZVxuICAgICAgICBpZiAoaXNPYmplY3QoYXJnc1swXSkgJiYgYXJnc1swXS5jb25zdHJ1Y3Rvci5uYW1lID09PSAnT2JqZWN0Jykge1xuICAgICAgICAgIC8vIGEgbm8tb3AsIGFsbG93aW5nIHRoZSBzeW50YXggYHRvdWNoKHsnLXInOiBmaWxlfSwgLi4uKWBcbiAgICAgICAgfSBlbHNlIGlmIChhcmdzLmxlbmd0aCA9PT0gMCB8fCB0eXBlb2YgYXJnc1swXSAhPT0gJ3N0cmluZycgfHwgYXJnc1swXS5sZW5ndGggPD0gMSB8fCBhcmdzWzBdWzBdICE9PSAnLScpIHtcbiAgICAgICAgICBhcmdzLnVuc2hpZnQoJycpOyAvLyBvbmx5IGFkZCBkdW1teSBvcHRpb24gaWYgJy1vcHRpb24nIG5vdCBhbHJlYWR5IHByZXNlbnRcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZsYXR0ZW4gb3V0IGFycmF5cyB0aGF0IGFyZSBhcmd1bWVudHMsIHRvIG1ha2UgdGhlIHN5bnRheDpcbiAgICAgICAgLy8gICAgYGNwKFtmaWxlMSwgZmlsZTIsIGZpbGUzXSwgZGVzdCk7YFxuICAgICAgICAvLyBlcXVpdmFsZW50IHRvOlxuICAgICAgICAvLyAgICBgY3AoZmlsZTEsIGZpbGUyLCBmaWxlMywgZGVzdCk7YFxuICAgICAgICBhcmdzID0gYXJncy5yZWR1Y2UoZnVuY3Rpb24gKGFjY3VtLCBjdXIpIHtcbiAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjdXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gYWNjdW0uY29uY2F0KGN1cik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGFjY3VtLnB1c2goY3VyKTtcbiAgICAgICAgICByZXR1cm4gYWNjdW07XG4gICAgICAgIH0sIFtdKTtcblxuICAgICAgICAvLyBDb252ZXJ0IFNoZWxsU3RyaW5ncyAoYmFzaWNhbGx5IGp1c3QgU3RyaW5nIG9iamVjdHMpIHRvIHJlZ3VsYXIgc3RyaW5nc1xuICAgICAgICBhcmdzID0gYXJncy5tYXAoZnVuY3Rpb24gKGFyZykge1xuICAgICAgICAgIGlmIChpc09iamVjdChhcmcpICYmIGFyZy5jb25zdHJ1Y3Rvci5uYW1lID09PSAnU3RyaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIGFyZy50b1N0cmluZygpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFeHBhbmQgdGhlICd+JyBpZiBhcHByb3ByaWF0ZVxuICAgICAgICB2YXIgaG9tZURpciA9IGdldFVzZXJIb21lKCk7XG4gICAgICAgIGFyZ3MgPSBhcmdzLm1hcChmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnICYmIGFyZy5zbGljZSgwLCAyKSA9PT0gJ34vJyB8fCBhcmcgPT09ICd+Jykge1xuICAgICAgICAgICAgcmV0dXJuIGFyZy5yZXBsYWNlKC9efi8sIGhvbWVEaXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQZXJmb3JtIGdsb2ItZXhwYW5zaW9uIG9uIGFsbCBhcmd1bWVudHMgYWZ0ZXIgZ2xvYlN0YXJ0LCBidXQgcHJlc2VydmVcbiAgICAgICAgLy8gdGhlIGFyZ3VtZW50cyBiZWZvcmUgaXQgKGxpa2UgcmVnZXhlcyBmb3Igc2VkIGFuZCBncmVwKVxuICAgICAgICBpZiAoIWNvbmZpZy5ub2dsb2IgJiYgb3B0aW9ucy5hbGxvd0dsb2JiaW5nID09PSB0cnVlKSB7XG4gICAgICAgICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgb3B0aW9ucy5nbG9iU3RhcnQpLmNvbmNhdChleHBhbmQoYXJncy5zbGljZShvcHRpb25zLmdsb2JTdGFydCkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gcGFyc2Ugb3B0aW9ucyBpZiBvcHRpb25zIGFyZSBwcm92aWRlZFxuICAgICAgICAgIGlmIChpc09iamVjdChvcHRpb25zLmNtZE9wdGlvbnMpKSB7XG4gICAgICAgICAgICBhcmdzWzBdID0gcGFyc2VPcHRpb25zKGFyZ3NbMF0sIG9wdGlvbnMuY21kT3B0aW9ucyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0VmFsdWUgPSBmbi5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgICAgaWYgKGUubXNnID09PSAnZWFybHlFeGl0Jykge1xuICAgICAgICAgICAgcmV0VmFsdWUgPSBlLnJldFZhbHVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBlOyAvLyB0aGlzIGlzIHByb2JhYmx5IGEgYnVnIHRoYXQgc2hvdWxkIGJlIHRocm93biB1cCB0aGUgY2FsbCBzdGFja1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICBpZiAoIXN0YXRlLmVycm9yKSB7XG4gICAgICAgIC8vIElmIHN0YXRlLmVycm9yIGhhc24ndCBiZWVuIHNldCBpdCdzIGFuIGVycm9yIHRocm93biBieSBOb2RlLCBub3QgdXMgLSBwcm9iYWJseSBhIGJ1Zy4uLlxuICAgICAgICBjb25zb2xlLmVycm9yKCdTaGVsbEpTOiBpbnRlcm5hbCBlcnJvcicpO1xuICAgICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2sgfHwgZSk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgIH1cbiAgICAgIGlmIChjb25maWcuZmF0YWwpIHRocm93IGU7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMud3JhcE91dHB1dCAmJlxuICAgICAgICAodHlwZW9mIHJldFZhbHVlID09PSAnc3RyaW5nJyB8fCBBcnJheS5pc0FycmF5KHJldFZhbHVlKSkpIHtcbiAgICAgIHJldFZhbHVlID0gbmV3IFNoZWxsU3RyaW5nKHJldFZhbHVlLCBzdGF0ZS5lcnJvciwgc3RhdGUuZXJyb3JDb2RlKTtcbiAgICB9XG5cbiAgICBzdGF0ZS5jdXJyZW50Q21kID0gJ3NoZWxsLmpzJztcbiAgICByZXR1cm4gcmV0VmFsdWU7XG4gIH07XG59IC8vIHdyYXBcbmV4cG9ydHMud3JhcCA9IHdyYXA7XG5cbi8vIFRoaXMgcmV0dXJucyBhbGwgdGhlIGlucHV0IHRoYXQgaXMgcGlwZWQgaW50byB0aGUgY3VycmVudCBjb21tYW5kIChvciB0aGVcbi8vIGVtcHR5IHN0cmluZywgaWYgdGhpcyBpc24ndCBvbiB0aGUgcmlnaHQtaGFuZCBzaWRlIG9mIGEgcGlwZVxuZnVuY3Rpb24gX3JlYWRGcm9tUGlwZSgpIHtcbiAgcmV0dXJuIHN0YXRlLnBpcGVkVmFsdWU7XG59XG5leHBvcnRzLnJlYWRGcm9tUGlwZSA9IF9yZWFkRnJvbVBpcGU7XG5cbnZhciBERUZBVUxUX1dSQVBfT1BUSU9OUyA9IHtcbiAgYWxsb3dHbG9iYmluZzogdHJ1ZSxcbiAgY2FuUmVjZWl2ZVBpcGU6IGZhbHNlLFxuICBjbWRPcHRpb25zOiBmYWxzZSxcbiAgZ2xvYlN0YXJ0OiAxLFxuICBwaXBlT25seTogZmFsc2UsXG4gIHVuaXg6IHRydWUsXG4gIHdyYXBPdXRwdXQ6IHRydWUsXG4gIG92ZXJXcml0ZTogZmFsc2UsXG59O1xuXG4vLyBSZWdpc3RlciBhIG5ldyBTaGVsbEpTIGNvbW1hbmRcbmZ1bmN0aW9uIF9yZWdpc3RlcihuYW1lLCBpbXBsZW1lbnRhdGlvbiwgd3JhcE9wdGlvbnMpIHtcbiAgd3JhcE9wdGlvbnMgPSB3cmFwT3B0aW9ucyB8fCB7fTtcbiAgLy8gSWYgYW4gb3B0aW9uIGlzbid0IHNwZWNpZmllZCwgdXNlIHRoZSBkZWZhdWx0XG4gIHdyYXBPcHRpb25zID0gb2JqZWN0QXNzaWduKHt9LCBERUZBVUxUX1dSQVBfT1BUSU9OUywgd3JhcE9wdGlvbnMpO1xuXG4gIGlmIChzaGVsbFtuYW1lXSAmJiAhd3JhcE9wdGlvbnMub3ZlcldyaXRlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1bmFibGUgdG8gb3ZlcndyaXRlIGAnICsgbmFtZSArICdgIGNvbW1hbmQnKTtcbiAgfVxuXG4gIGlmICh3cmFwT3B0aW9ucy5waXBlT25seSkge1xuICAgIHdyYXBPcHRpb25zLmNhblJlY2VpdmVQaXBlID0gdHJ1ZTtcbiAgICBzaGVsbE1ldGhvZHNbbmFtZV0gPSB3cmFwKG5hbWUsIGltcGxlbWVudGF0aW9uLCB3cmFwT3B0aW9ucyk7XG4gIH0gZWxzZSB7XG4gICAgc2hlbGxbbmFtZV0gPSB3cmFwKG5hbWUsIGltcGxlbWVudGF0aW9uLCB3cmFwT3B0aW9ucyk7XG4gIH1cbn1cbmV4cG9ydHMucmVnaXN0ZXIgPSBfcmVnaXN0ZXI7XG4iXX0=