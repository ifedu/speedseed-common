var common = require('./common');
var _tempDir = require('./tempdir');
var _pwd = require('./pwd');
var path = require('path');
var fs = require('fs');
var child = require('child_process');
var DEFAULT_MAXBUFFER_SIZE = 20 * 1024 * 1024;
common.register('exec', _exec, {
    unix: false,
    canReceivePipe: true,
    wrapOutput: false,
});
// Hack to run child_process.exec() synchronously (sync avoids callback hell)
// Uses a custom wait loop that checks for a flag file, created when the child process is done.
// (Can't do a wait loop that checks for internal Node variables/messages as
// Node is single-threaded; callbacks and other internal state changes are done in the
// event loop).
function execSync(cmd, opts, pipe) {
    if (!common.config.execPath) {
        common.error('Unable to find a path to the node binary. Please manually set config.execPath');
    }
    var tempDir = _tempDir();
    var stdoutFile = path.resolve(tempDir + '/' + common.randomFileName());
    var stderrFile = path.resolve(tempDir + '/' + common.randomFileName());
    var codeFile = path.resolve(tempDir + '/' + common.randomFileName());
    var scriptFile = path.resolve(tempDir + '/' + common.randomFileName());
    var sleepFile = path.resolve(tempDir + '/' + common.randomFileName());
    opts = common.extend({
        silent: common.config.silent,
        cwd: _pwd().toString(),
        env: process.env,
        maxBuffer: DEFAULT_MAXBUFFER_SIZE,
    }, opts);
    var previousStdoutContent = '';
    var previousStderrContent = '';
    // Echoes stdout and stderr changes from running process, if not silent
    function updateStream(streamFile) {
        if (opts.silent || !fs.existsSync(streamFile)) {
            return;
        }
        var previousStreamContent;
        var procStream;
        if (streamFile === stdoutFile) {
            previousStreamContent = previousStdoutContent;
            procStream = process.stdout;
        }
        else {
            previousStreamContent = previousStderrContent;
            procStream = process.stderr;
        }
        var streamContent = fs.readFileSync(streamFile, 'utf8');
        // No changes since last time?
        if (streamContent.length <= previousStreamContent.length) {
            return;
        }
        procStream.write(streamContent.substr(previousStreamContent.length));
        previousStreamContent = streamContent;
    }
    if (fs.existsSync(scriptFile))
        common.unlinkSync(scriptFile);
    if (fs.existsSync(stdoutFile))
        common.unlinkSync(stdoutFile);
    if (fs.existsSync(stderrFile))
        common.unlinkSync(stderrFile);
    if (fs.existsSync(codeFile))
        common.unlinkSync(codeFile);
    var execCommand = JSON.stringify(common.config.execPath) + ' ' + JSON.stringify(scriptFile);
    var script;
    opts.cwd = path.resolve(opts.cwd);
    var optString = JSON.stringify(opts);
    if (typeof child.execSync === 'function') {
        script = [
            "var child = require('child_process')",
            "  , fs = require('fs');",
            'var childProcess = child.exec(' + JSON.stringify(cmd) + ', ' + optString + ', function(err) {',
            '  var fname = ' + JSON.stringify(codeFile) + ';',
            '  if (!err) {',
            '    fs.writeFileSync(fname, "0");',
            '  } else if (err.code === undefined) {',
            '    fs.writeFileSync(fname, "1");',
            '  } else {',
            '    fs.writeFileSync(fname, err.code.toString());',
            '  }',
            '});',
            'var stdoutStream = fs.createWriteStream(' + JSON.stringify(stdoutFile) + ');',
            'var stderrStream = fs.createWriteStream(' + JSON.stringify(stderrFile) + ');',
            'childProcess.stdout.pipe(stdoutStream, {end: false});',
            'childProcess.stderr.pipe(stderrStream, {end: false});',
            'childProcess.stdout.pipe(process.stdout);',
            'childProcess.stderr.pipe(process.stderr);',
        ].join('\n') +
            (pipe ? '\nchildProcess.stdin.end(' + JSON.stringify(pipe) + ');\n' : '\n') +
            [
                'var stdoutEnded = false, stderrEnded = false;',
                'function tryClosingStdout(){ if(stdoutEnded){ stdoutStream.end(); } }',
                'function tryClosingStderr(){ if(stderrEnded){ stderrStream.end(); } }',
                "childProcess.stdout.on('end', function(){ stdoutEnded = true; tryClosingStdout(); });",
                "childProcess.stderr.on('end', function(){ stderrEnded = true; tryClosingStderr(); });",
            ].join('\n');
        fs.writeFileSync(scriptFile, script);
        if (opts.silent) {
            opts.stdio = 'ignore';
        }
        else {
            opts.stdio = [0, 1, 2];
        }
        // Welcome to the future
        try {
            child.execSync(execCommand, opts);
        }
        catch (e) {
            // Clean up immediately if we have an exception
            try {
                common.unlinkSync(scriptFile);
            }
            catch (e2) { }
            try {
                common.unlinkSync(stdoutFile);
            }
            catch (e2) { }
            try {
                common.unlinkSync(stderrFile);
            }
            catch (e2) { }
            try {
                common.unlinkSync(codeFile);
            }
            catch (e2) { }
            throw e;
        }
    }
    else {
        cmd += ' > ' + stdoutFile + ' 2> ' + stderrFile; // works on both win/unix
        script = [
            "var child = require('child_process')",
            "  , fs = require('fs');",
            'var childProcess = child.exec(' + JSON.stringify(cmd) + ', ' + optString + ', function(err) {',
            '  var fname = ' + JSON.stringify(codeFile) + ';',
            '  if (!err) {',
            '    fs.writeFileSync(fname, "0");',
            '  } else if (err.code === undefined) {',
            '    fs.writeFileSync(fname, "1");',
            '  } else {',
            '    fs.writeFileSync(fname, err.code.toString());',
            '  }',
            '});',
        ].join('\n') +
            (pipe ? '\nchildProcess.stdin.end(' + JSON.stringify(pipe) + ');\n' : '\n');
        fs.writeFileSync(scriptFile, script);
        child.exec(execCommand, opts);
        // The wait loop
        // sleepFile is used as a dummy I/O op to mitigate unnecessary CPU usage
        // (tried many I/O sync ops, writeFileSync() seems to be only one that is effective in reducing
        // CPU usage, though apparently not so much on Windows)
        while (!fs.existsSync(codeFile)) {
            updateStream(stdoutFile);
            fs.writeFileSync(sleepFile, 'a');
        }
        while (!fs.existsSync(stdoutFile)) {
            updateStream(stdoutFile);
            fs.writeFileSync(sleepFile, 'a');
        }
        while (!fs.existsSync(stderrFile)) {
            updateStream(stderrFile);
            fs.writeFileSync(sleepFile, 'a');
        }
        try {
            common.unlinkSync(sleepFile);
        }
        catch (e) { }
    }
    // At this point codeFile exists, but it's not necessarily flushed yet.
    // Keep reading it until it is.
    var code = parseInt('', 10);
    while (isNaN(code)) {
        code = parseInt(fs.readFileSync(codeFile, 'utf8'), 10);
    }
    var stdout = fs.readFileSync(stdoutFile, 'utf8');
    var stderr = fs.readFileSync(stderrFile, 'utf8');
    // No biggie if we can't erase the files now -- they're in a temp dir anyway
    try {
        common.unlinkSync(scriptFile);
    }
    catch (e) { }
    try {
        common.unlinkSync(stdoutFile);
    }
    catch (e) { }
    try {
        common.unlinkSync(stderrFile);
    }
    catch (e) { }
    try {
        common.unlinkSync(codeFile);
    }
    catch (e) { }
    if (code !== 0) {
        common.error('', code, { continue: true });
    }
    var obj = common.ShellString(stdout, stderr, code);
    return obj;
} // execSync()
// Wrapper around exec() to enable echoing output to console in real time
function execAsync(cmd, opts, pipe, callback) {
    var stdout = '';
    var stderr = '';
    opts = common.extend({
        silent: common.config.silent,
        cwd: _pwd().toString(),
        env: process.env,
        maxBuffer: DEFAULT_MAXBUFFER_SIZE,
    }, opts);
    var c = child.exec(cmd, opts, function (err) {
        if (callback) {
            if (!err) {
                callback(0, stdout, stderr);
            }
            else if (err.code === undefined) {
                // See issue #536
                callback(1, stdout, stderr);
            }
            else {
                callback(err.code, stdout, stderr);
            }
        }
    });
    if (pipe)
        c.stdin.end(pipe);
    c.stdout.on('data', function (data) {
        stdout += data;
        if (!opts.silent)
            process.stdout.write(data);
    });
    c.stderr.on('data', function (data) {
        stderr += data;
        if (!opts.silent)
            process.stderr.write(data);
    });
    return c;
}
//@
//@ ### exec(command [, options] [, callback])
//@ Available options (all `false` by default):
//@
//@ + `async`: Asynchronous execution. If a callback is provided, it will be set to
//@   `true`, regardless of the passed value.
//@ + `silent`: Do not echo program output to console.
//@ + and any option available to Node.js's
//@   [child_process.exec()](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback)
//@
//@ Examples:
//@
//@ ```javascript
//@ var version = exec('node --version', {silent:true}).stdout;
//@
//@ var child = exec('some_long_running_process', {async:true});
//@ child.stdout.on('data', function(data) {
//@   /* ... do something with data ... */
//@ });
//@
//@ exec('some_long_running_process', function(code, stdout, stderr) {
//@   console.log('Exit code:', code);
//@   console.log('Program output:', stdout);
//@   console.log('Program stderr:', stderr);
//@ });
//@ ```
//@
//@ Executes the given `command` _synchronously_, unless otherwise specified.  When in synchronous
//@ mode, this returns a ShellString (compatible with ShellJS v0.6.x, which returns an object
//@ of the form `{ code:..., stdout:... , stderr:... }`). Otherwise, this returns the child process
//@ object, and the `callback` gets the arguments `(code, stdout, stderr)`.
//@
//@ Not seeing the behavior you want? `exec()` runs everything through `sh`
//@ by default (or `cmd.exe` on Windows), which differs from `bash`. If you
//@ need bash-specific behavior, try out the `{shell: 'path/to/bash'}` option.
//@
//@ **Note:** For long-lived processes, it's best to run `exec()` asynchronously as
//@ the current synchronous implementation uses a lot of CPU. This should be getting
//@ fixed soon.
function _exec(command, options, callback) {
    options = options || {};
    if (!command)
        common.error('must specify command');
    var pipe = common.readFromPipe();
    // Callback is defined instead of options.
    if (typeof options === 'function') {
        callback = options;
        options = { async: true };
    }
    // Callback is defined with options.
    if (typeof options === 'object' && typeof callback === 'function') {
        options.async = true;
    }
    options = common.extend({
        silent: common.config.silent,
        async: false,
    }, options);
    try {
        if (options.async) {
            return execAsync(command, options, pipe, callback);
        }
        else {
            return execSync(command, options, pipe);
        }
    }
    catch (e) {
        common.error('internal error');
    }
}
module.exports = _exec;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXGV4ZWMuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xcc2hlbGxqc1xcc3JjXFxleGVjLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqQyxJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDcEMsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzVCLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMzQixJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdkIsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBRXJDLElBQUksc0JBQXNCLEdBQUcsRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7QUFFOUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFO0lBQzdCLElBQUksRUFBRSxLQUFLO0lBQ1gsY0FBYyxFQUFFLElBQUk7SUFDcEIsVUFBVSxFQUFFLEtBQUs7Q0FDbEIsQ0FBQyxDQUFDO0FBRUgsNkVBQTZFO0FBQzdFLCtGQUErRjtBQUMvRiw0RUFBNEU7QUFDNUUsc0ZBQXNGO0FBQ3RGLGVBQWU7QUFDZixrQkFBa0IsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJO0lBQy9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFR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Q0FBQyxDQUFDLE9BQU8sT0FBTyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDbEMsUUFBUSxHQUFHLE9BQU8sQ0FBQztRQUNuQixPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVELG9DQUFvQztJQUNwQyxFQUFFLENBQUMsQ0FBQyxPQUFPLE9BQU8sS0FBSyxRQUFRLElBQUksT0FBTyxRQUFRLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztRQUNsRSxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztJQUN2QixDQUFDO0lBRUQsT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDdEIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTTtRQUM1QixLQUFLLEVBQUUsS0FBSztLQUNiLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFFWixJQUFJLENBQUM7UUFDSCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNsQixNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxQyxDQUFDO0lBQ0gsQ0FBQztJQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDWCxNQUFNLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDakMsQ0FBQztBQUNILENBQUM7QUFDRCxNQUFNLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjb21tb24gPSByZXF1aXJlKCcuL2NvbW1vbicpO1xudmFyIF90ZW1wRGlyID0gcmVxdWlyZSgnLi90ZW1wZGlyJyk7XG52YXIgX3B3ZCA9IHJlcXVpcmUoJy4vcHdkJyk7XG52YXIgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG52YXIgY2hpbGQgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJyk7XG5cbnZhciBERUZBVUxUX01BWEJVRkZFUl9TSVpFID0gMjAgKiAxMDI0ICogMTAyNDtcblxuY29tbW9uLnJlZ2lzdGVyKCdleGVjJywgX2V4ZWMsIHtcbiAgdW5peDogZmFsc2UsXG4gIGNhblJlY2VpdmVQaXBlOiB0cnVlLFxuICB3cmFwT3V0cHV0OiBmYWxzZSxcbn0pO1xuXG4vLyBIYWNrIHRvIHJ1biBjaGlsZF9wcm9jZXNzLmV4ZWMoKSBzeW5jaHJvbm91c2x5IChzeW5jIGF2b2lkcyBjYWxsYmFjayBoZWxsKVxuLy8gVXNlcyBhIGN1c3RvbSB3YWl0IGxvb3AgdGhhdCBjaGVja3MgZm9yIGEgZmxhZyBmaWxlLCBjcmVhdGVkIHdoZW4gdGhlIGNoaWxkIHByb2Nlc3MgaXMgZG9uZS5cbi8vIChDYW4ndCBkbyBhIHdhaXQgbG9vcCB0aGF0IGNoZWNrcyBmb3IgaW50ZXJuYWwgTm9kZSB2YXJpYWJsZXMvbWVzc2FnZXMgYXNcbi8vIE5vZGUgaXMgc2luZ2xlLXRocmVhZGVkOyBjYWxsYmFja3MgYW5kIG90aGVyIGludGVybmFsIHN0YXRlIGNoYW5nZXMgYXJlIGRvbmUgaW4gdGhlXG4vLyBldmVudCBsb29wKS5cbmZ1bmN0aW9uIGV4ZWNTeW5jKGNtZCwgb3B0cywgcGlwZSkge1xuICBpZiAoIWNvbW1vbi5jb25maWcuZXhlY1BhdGgpIHtcbiAgICBjb21tb24uZXJyb3IoJ1VuYWJsZSB0byBmaW5kIGEgcGF0aCB0byB0aGUgbm9kZSBiaW5hcnkuIFBsZWFzZSBtYW51YWxseSBzZXQgY29uZmlnLmV4ZWNQYXRoJyk7XG4gIH1cblxuICB2YXIgdGVtcERpciA9IF90ZW1wRGlyKCk7XG4gIHZhciBzdGRvdXRGaWxlID0gcGF0aC5yZXNvbHZlKHRlbXBEaXIgKyAnLycgKyBjb21tb24ucmFuZG9tRmlsZU5hbWUoKSk7XG4gIHZhciBzdGRlcnJGaWxlID0gcGF0aC5yZXNvbHZlKHRlbXBEaXIgKyAnLycgKyBjb21tb24ucmFuZG9tRmlsZU5hbWUoKSk7XG4gIHZhciBjb2RlRmlsZSA9IHBhdGgucmVzb2x2ZSh0ZW1wRGlyICsgJy8nICsgY29tbW9uLnJhbmRvbUZpbGVOYW1lKCkpO1xuICB2YXIgc2NyaXB0RmlsZSA9IHBhdGgucmVzb2x2ZSh0ZW1wRGlyICsgJy8nICsgY29tbW9uLnJhbmRvbUZpbGVOYW1lKCkpO1xuICB2YXIgc2xlZXBGaWxlID0gcGF0aC5yZXNvbHZlKHRlbXBEaXIgKyAnLycgKyBjb21tb24ucmFuZG9tRmlsZU5hbWUoKSk7XG5cbiAgb3B0cyA9IGNvbW1vbi5leHRlbmQoe1xuICAgIHNpbGVudDogY29tbW9uLmNvbmZpZy5zaWxlbnQsXG4gICAgY3dkOiBfcHdkKCkudG9TdHJpbmcoKSxcbiAgICBlbnY6IHByb2Nlc3MuZW52LFxuICAgIG1heEJ1ZmZlcjogREVGQVVMVF9NQVhCVUZGRVJfU0laRSxcbiAgfSwgb3B0cyk7XG5cbiAgdmFyIHByZXZpb3VzU3Rkb3V0Q29udGVudCA9ICcnO1xuICB2YXIgcHJldmlvdXNTdGRlcnJDb250ZW50ID0gJyc7XG4gIC8vIEVjaG9lcyBzdGRvdXQgYW5kIHN0ZGVyciBjaGFuZ2VzIGZyb20gcnVubmluZyBwcm9jZXNzLCBpZiBub3Qgc2lsZW50XG4gIGZ1bmN0aW9uIHVwZGF0ZVN0cmVhbShzdHJlYW1GaWxlKSB7XG4gICAgaWYgKG9wdHMuc2lsZW50IHx8ICFmcy5leGlzdHNTeW5jKHN0cmVhbUZpbGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHByZXZpb3VzU3RyZWFtQ29udGVudDtcbiAgICB2YXIgcHJvY1N0cmVhbTtcbiAgICBpZiAoc3RyZWFtRmlsZSA9PT0gc3Rkb3V0RmlsZSkge1xuICAgICAgcHJldmlvdXNTdHJlYW1Db250ZW50ID0gcHJldmlvdXNTdGRvdXRDb250ZW50O1xuICAgICAgcHJvY1N0cmVhbSA9IHByb2Nlc3Muc3Rkb3V0O1xuICAgIH0gZWxzZSB7IC8vIGFzc3VtZSBzdGRlcnJcbiAgICAgIHByZXZpb3VzU3RyZWFtQ29udGVudCA9IHByZXZpb3VzU3RkZXJyQ29udGVudDtcbiAgICAgIHByb2NTdHJlYW0gPSBwcm9jZXNzLnN0ZGVycjtcbiAgICB9XG5cbiAgICB2YXIgc3RyZWFtQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhzdHJlYW1GaWxlLCAndXRmOCcpO1xuICAgIC8vIE5vIGNoYW5nZXMgc2luY2UgbGFzdCB0aW1lP1xuICAgIGlmIChzdHJlYW1Db250ZW50Lmxlbmd0aCA8PSBwcmV2aW91c1N0cmVhbUNvbnRlbnQubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcHJvY1N0cmVhbS53cml0ZShzdHJlYW1Db250ZW50LnN1YnN0cihwcmV2aW91c1N0cmVhbUNvbnRlbnQubGVuZ3RoKSk7XG4gICAgcHJldmlvdXNTdHJlYW1Db250ZW50ID0gc3RyZWFtQ29udGVudDtcbiAgfVxuXG4gIGlmIChmcy5leGlzdHNTeW5jKHNjcmlwdEZpbGUpKSBjb21tb24udW5saW5rU3luYyhzY3JpcHRGaWxlKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMoc3Rkb3V0RmlsZSkpIGNvbW1vbi51bmxpbmtTeW5jKHN0ZG91dEZpbGUpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhzdGRlcnJGaWxlKSkgY29tbW9uLnVubGlua1N5bmMoc3RkZXJyRmlsZSk7XG4gIGlmIChmcy5leGlzdHNTeW5jKGNvZGVGaWxlKSkgY29tbW9uLnVubGlua1N5bmMoY29kZUZpbGUpO1xuXG4gIHZhciBleGVjQ29tbWFuZCA9IEpTT04uc3RyaW5naWZ5KGNvbW1vbi5jb25maWcuZXhlY1BhdGgpICsgJyAnICsgSlNPTi5zdHJpbmdpZnkoc2NyaXB0RmlsZSk7XG4gIHZhciBzY3JpcHQ7XG5cbiAgb3B0cy5jd2QgPSBwYXRoLnJlc29sdmUob3B0cy5jd2QpO1xuICB2YXIgb3B0U3RyaW5nID0gSlNPTi5zdHJpbmdpZnkob3B0cyk7XG5cbiAgaWYgKHR5cGVvZiBjaGlsZC5leGVjU3luYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHNjcmlwdCA9IFtcbiAgICAgIFwidmFyIGNoaWxkID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpXCIsXG4gICAgICBcIiAgLCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XCIsXG4gICAgICAndmFyIGNoaWxkUHJvY2VzcyA9IGNoaWxkLmV4ZWMoJyArIEpTT04uc3RyaW5naWZ5KGNtZCkgKyAnLCAnICsgb3B0U3RyaW5nICsgJywgZnVuY3Rpb24oZXJyKSB7JyxcbiAgICAgICcgIHZhciBmbmFtZSA9ICcgKyBKU09OLnN0cmluZ2lmeShjb2RlRmlsZSkgKyAnOycsXG4gICAgICAnICBpZiAoIWVycikgeycsXG4gICAgICAnICAgIGZzLndyaXRlRmlsZVN5bmMoZm5hbWUsIFwiMFwiKTsnLFxuICAgICAgJyAgfSBlbHNlIGlmIChlcnIuY29kZSA9PT0gdW5kZWZpbmVkKSB7JyxcbiAgICAgICcgICAgZnMud3JpdGVGaWxlU3luYyhmbmFtZSwgXCIxXCIpOycsXG4gICAgICAnICB9IGVsc2UgeycsXG4gICAgICAnICAgIGZzLndyaXRlRmlsZVN5bmMoZm5hbWUsIGVyci5jb2RlLnRvU3RyaW5nKCkpOycsXG4gICAgICAnICB9JyxcbiAgICAgICd9KTsnLFxuICAgICAgJ3ZhciBzdGRvdXRTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbSgnICsgSlNPTi5zdHJpbmdpZnkoc3Rkb3V0RmlsZSkgKyAnKTsnLFxuICAgICAgJ3ZhciBzdGRlcnJTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbSgnICsgSlNPTi5zdHJpbmdpZnkoc3RkZXJyRmlsZSkgKyAnKTsnLFxuICAgICAgJ2NoaWxkUHJvY2Vzcy5zdGRvdXQucGlwZShzdGRvdXRTdHJlYW0sIHtlbmQ6IGZhbHNlfSk7JyxcbiAgICAgICdjaGlsZFByb2Nlc3Muc3RkZXJyLnBpcGUoc3RkZXJyU3RyZWFtLCB7ZW5kOiBmYWxzZX0pOycsXG4gICAgICAnY2hpbGRQcm9jZXNzLnN0ZG91dC5waXBlKHByb2Nlc3Muc3Rkb3V0KTsnLFxuICAgICAgJ2NoaWxkUHJvY2Vzcy5zdGRlcnIucGlwZShwcm9jZXNzLnN0ZGVycik7JyxcbiAgICBdLmpvaW4oJ1xcbicpICtcbiAgICAgIChwaXBlID8gJ1xcbmNoaWxkUHJvY2Vzcy5zdGRpbi5lbmQoJyArIEpTT04uc3RyaW5naWZ5KHBpcGUpICsgJyk7XFxuJyA6ICdcXG4nKSArXG4gICAgICBbXG4gICAgICAgICd2YXIgc3Rkb3V0RW5kZWQgPSBmYWxzZSwgc3RkZXJyRW5kZWQgPSBmYWxzZTsnLFxuICAgICAgICAnZnVuY3Rpb24gdHJ5Q2xvc2luZ1N0ZG91dCgpeyBpZihzdGRvdXRFbmRlZCl7IHN0ZG91dFN0cmVhbS5lbmQoKTsgfSB9JyxcbiAgICAgICAgJ2Z1bmN0aW9uIHRyeUNsb3NpbmdTdGRlcnIoKXsgaWYoc3RkZXJyRW5kZWQpeyBzdGRlcnJTdHJlYW0uZW5kKCk7IH0gfScsXG4gICAgICAgIFwiY2hpbGRQcm9jZXNzLnN0ZG91dC5vbignZW5kJywgZnVuY3Rpb24oKXsgc3Rkb3V0RW5kZWQgPSB0cnVlOyB0cnlDbG9zaW5nU3Rkb3V0KCk7IH0pO1wiLFxuICAgICAgICBcImNoaWxkUHJvY2Vzcy5zdGRlcnIub24oJ2VuZCcsIGZ1bmN0aW9uKCl7IHN0ZGVyckVuZGVkID0gdHJ1ZTsgdHJ5Q2xvc2luZ1N0ZGVycigpOyB9KTtcIixcbiAgICAgIF0uam9pbignXFxuJyk7XG5cbiAgICBmcy53cml0ZUZpbGVTeW5jKHNjcmlwdEZpbGUsIHNjcmlwdCk7XG5cbiAgICBpZiAob3B0cy5zaWxlbnQpIHtcbiAgICAgIG9wdHMuc3RkaW8gPSAnaWdub3JlJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0cy5zdGRpbyA9IFswLCAxLCAyXTtcbiAgICB9XG5cbiAgICAvLyBXZWxjb21lIHRvIHRoZSBmdXR1cmVcbiAgICB0cnkge1xuICAgICAgY2hpbGQuZXhlY1N5bmMoZXhlY0NvbW1hbmQsIG9wdHMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIENsZWFuIHVwIGltbWVkaWF0ZWx5IGlmIHdlIGhhdmUgYW4gZXhjZXB0aW9uXG4gICAgICB0cnkgeyBjb21tb24udW5saW5rU3luYyhzY3JpcHRGaWxlKTsgfSBjYXRjaCAoZTIpIHt9XG4gICAgICB0cnkgeyBjb21tb24udW5saW5rU3luYyhzdGRvdXRGaWxlKTsgfSBjYXRjaCAoZTIpIHt9XG4gICAgICB0cnkgeyBjb21tb24udW5saW5rU3luYyhzdGRlcnJGaWxlKTsgfSBjYXRjaCAoZTIpIHt9XG4gICAgICB0cnkgeyBjb21tb24udW5saW5rU3luYyhjb2RlRmlsZSk7IH0gY2F0Y2ggKGUyKSB7fVxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgY21kICs9ICcgPiAnICsgc3Rkb3V0RmlsZSArICcgMj4gJyArIHN0ZGVyckZpbGU7IC8vIHdvcmtzIG9uIGJvdGggd2luL3VuaXhcblxuICAgIHNjcmlwdCA9IFtcbiAgICAgIFwidmFyIGNoaWxkID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpXCIsXG4gICAgICBcIiAgLCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XCIsXG4gICAgICAndmFyIGNoaWxkUHJvY2VzcyA9IGNoaWxkLmV4ZWMoJyArIEpTT04uc3RyaW5naWZ5KGNtZCkgKyAnLCAnICsgb3B0U3RyaW5nICsgJywgZnVuY3Rpb24oZXJyKSB7JyxcbiAgICAgICcgIHZhciBmbmFtZSA9ICcgKyBKU09OLnN0cmluZ2lmeShjb2RlRmlsZSkgKyAnOycsXG4gICAgICAnICBpZiAoIWVycikgeycsXG4gICAgICAnICAgIGZzLndyaXRlRmlsZVN5bmMoZm5hbWUsIFwiMFwiKTsnLFxuICAgICAgJyAgfSBlbHNlIGlmIChlcnIuY29kZSA9PT0gdW5kZWZpbmVkKSB7JyxcbiAgICAgICcgICAgZnMud3JpdGVGaWxlU3luYyhmbmFtZSwgXCIxXCIpOycsXG4gICAgICAnICB9IGVsc2UgeycsXG4gICAgICAnICAgIGZzLndyaXRlRmlsZVN5bmMoZm5hbWUsIGVyci5jb2RlLnRvU3RyaW5nKCkpOycsXG4gICAgICAnICB9JyxcbiAgICAgICd9KTsnLFxuICAgIF0uam9pbignXFxuJykgK1xuICAgICAgKHBpcGUgPyAnXFxuY2hpbGRQcm9jZXNzLnN0ZGluLmVuZCgnICsgSlNPTi5zdHJpbmdpZnkocGlwZSkgKyAnKTtcXG4nIDogJ1xcbicpO1xuXG4gICAgZnMud3JpdGVGaWxlU3luYyhzY3JpcHRGaWxlLCBzY3JpcHQpO1xuXG4gICAgY2hpbGQuZXhlYyhleGVjQ29tbWFuZCwgb3B0cyk7XG5cbiAgICAvLyBUaGUgd2FpdCBsb29wXG4gICAgLy8gc2xlZXBGaWxlIGlzIHVzZWQgYXMgYSBkdW1teSBJL08gb3AgdG8gbWl0aWdhdGUgdW5uZWNlc3NhcnkgQ1BVIHVzYWdlXG4gICAgLy8gKHRyaWVkIG1hbnkgSS9PIHN5bmMgb3BzLCB3cml0ZUZpbGVTeW5jKCkgc2VlbXMgdG8gYmUgb25seSBvbmUgdGhhdCBpcyBlZmZlY3RpdmUgaW4gcmVkdWNpbmdcbiAgICAvLyBDUFUgdXNhZ2UsIHRob3VnaCBhcHBhcmVudGx5IG5vdCBzbyBtdWNoIG9uIFdpbmRvd3MpXG4gICAgd2hpbGUgKCFmcy5leGlzdHNTeW5jKGNvZGVGaWxlKSkgeyB1cGRhdGVTdHJlYW0oc3Rkb3V0RmlsZSk7IGZzLndyaXRlRmlsZVN5bmMoc2xlZXBGaWxlLCAnYScpOyB9XG4gICAgd2hpbGUgKCFmcy5leGlzdHNTeW5jKHN0ZG91dEZpbGUpKSB7IHVwZGF0ZVN0cmVhbShzdGRvdXRGaWxlKTsgZnMud3JpdGVGaWxlU3luYyhzbGVlcEZpbGUsICdhJyk7IH1cbiAgICB3aGlsZSAoIWZzLmV4aXN0c1N5bmMoc3RkZXJyRmlsZSkpIHsgdXBkYXRlU3RyZWFtKHN0ZGVyckZpbGUpOyBmcy53cml0ZUZpbGVTeW5jKHNsZWVwRmlsZSwgJ2EnKTsgfVxuICAgIHRyeSB7IGNvbW1vbi51bmxpbmtTeW5jKHNsZWVwRmlsZSk7IH0gY2F0Y2ggKGUpIHt9XG4gIH1cblxuICAvLyBBdCB0aGlzIHBvaW50IGNvZGVGaWxlIGV4aXN0cywgYnV0IGl0J3Mgbm90IG5lY2Vzc2FyaWx5IGZsdXNoZWQgeWV0LlxuICAvLyBLZWVwIHJlYWRpbmcgaXQgdW50aWwgaXQgaXMuXG4gIHZhciBjb2RlID0gcGFyc2VJbnQoJycsIDEwKTtcbiAgd2hpbGUgKGlzTmFOKGNvZGUpKSB7XG4gICAgY29kZSA9IHBhcnNlSW50KGZzLnJlYWRGaWxlU3luYyhjb2RlRmlsZSwgJ3V0ZjgnKSwgMTApO1xuICB9XG5cbiAgdmFyIHN0ZG91dCA9IGZzLnJlYWRGaWxlU3luYyhzdGRvdXRGaWxlLCAndXRmOCcpO1xuICB2YXIgc3RkZXJyID0gZnMucmVhZEZpbGVTeW5jKHN0ZGVyckZpbGUsICd1dGY4Jyk7XG5cbiAgLy8gTm8gYmlnZ2llIGlmIHdlIGNhbid0IGVyYXNlIHRoZSBmaWxlcyBub3cgLS0gdGhleSdyZSBpbiBhIHRlbXAgZGlyIGFueXdheVxuICB0cnkgeyBjb21tb24udW5saW5rU3luYyhzY3JpcHRGaWxlKTsgfSBjYXRjaCAoZSkge31cbiAgdHJ5IHsgY29tbW9uLnVubGlua1N5bmMoc3Rkb3V0RmlsZSk7IH0gY2F0Y2ggKGUpIHt9XG4gIHRyeSB7IGNvbW1vbi51bmxpbmtTeW5jKHN0ZGVyckZpbGUpOyB9IGNhdGNoIChlKSB7fVxuICB0cnkgeyBjb21tb24udW5saW5rU3luYyhjb2RlRmlsZSk7IH0gY2F0Y2ggKGUpIHt9XG5cbiAgaWYgKGNvZGUgIT09IDApIHtcbiAgICBjb21tb24uZXJyb3IoJycsIGNvZGUsIHsgY29udGludWU6IHRydWUgfSk7XG4gIH1cbiAgdmFyIG9iaiA9IGNvbW1vbi5TaGVsbFN0cmluZyhzdGRvdXQsIHN0ZGVyciwgY29kZSk7XG4gIHJldHVybiBvYmo7XG59IC8vIGV4ZWNTeW5jKClcblxuLy8gV3JhcHBlciBhcm91bmQgZXhlYygpIHRvIGVuYWJsZSBlY2hvaW5nIG91dHB1dCB0byBjb25zb2xlIGluIHJlYWwgdGltZVxuZnVuY3Rpb24gZXhlY0FzeW5jKGNtZCwgb3B0cywgcGlwZSwgY2FsbGJhY2spIHtcbiAgdmFyIHN0ZG91dCA9ICcnO1xuICB2YXIgc3RkZXJyID0gJyc7XG5cbiAgb3B0cyA9IGNvbW1vbi5leHRlbmQoe1xuICAgIHNpbGVudDogY29tbW9uLmNvbmZpZy5zaWxlbnQsXG4gICAgY3dkOiBfcHdkKCkudG9TdHJpbmcoKSxcbiAgICBlbnY6IHByb2Nlc3MuZW52LFxuICAgIG1heEJ1ZmZlcjogREVGQVVMVF9NQVhCVUZGRVJfU0laRSxcbiAgfSwgb3B0cyk7XG5cbiAgdmFyIGMgPSBjaGlsZC5leGVjKGNtZCwgb3B0cywgZnVuY3Rpb24gKGVycikge1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgaWYgKCFlcnIpIHtcbiAgICAgICAgY2FsbGJhY2soMCwgc3Rkb3V0LCBzdGRlcnIpO1xuICAgICAgfSBlbHNlIGlmIChlcnIuY29kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIFNlZSBpc3N1ZSAjNTM2XG4gICAgICAgIGNhbGxiYWNrKDEsIHN0ZG91dCwgc3RkZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxiYWNrKGVyci5jb2RlLCBzdGRvdXQsIHN0ZGVycik7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBpZiAocGlwZSkgYy5zdGRpbi5lbmQocGlwZSk7XG5cbiAgYy5zdGRvdXQub24oJ2RhdGEnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHN0ZG91dCArPSBkYXRhO1xuICAgIGlmICghb3B0cy5zaWxlbnQpIHByb2Nlc3Muc3Rkb3V0LndyaXRlKGRhdGEpO1xuICB9KTtcblxuICBjLnN0ZGVyci5vbignZGF0YScsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgc3RkZXJyICs9IGRhdGE7XG4gICAgaWYgKCFvcHRzLnNpbGVudCkgcHJvY2Vzcy5zdGRlcnIud3JpdGUoZGF0YSk7XG4gIH0pO1xuXG4gIHJldHVybiBjO1xufVxuXG4vL0Bcbi8vQCAjIyMgZXhlYyhjb21tYW5kIFssIG9wdGlvbnNdIFssIGNhbGxiYWNrXSlcbi8vQCBBdmFpbGFibGUgb3B0aW9ucyAoYWxsIGBmYWxzZWAgYnkgZGVmYXVsdCk6XG4vL0Bcbi8vQCArIGBhc3luY2A6IEFzeW5jaHJvbm91cyBleGVjdXRpb24uIElmIGEgY2FsbGJhY2sgaXMgcHJvdmlkZWQsIGl0IHdpbGwgYmUgc2V0IHRvXG4vL0AgICBgdHJ1ZWAsIHJlZ2FyZGxlc3Mgb2YgdGhlIHBhc3NlZCB2YWx1ZS5cbi8vQCArIGBzaWxlbnRgOiBEbyBub3QgZWNobyBwcm9ncmFtIG91dHB1dCB0byBjb25zb2xlLlxuLy9AICsgYW5kIGFueSBvcHRpb24gYXZhaWxhYmxlIHRvIE5vZGUuanMnc1xuLy9AICAgW2NoaWxkX3Byb2Nlc3MuZXhlYygpXShodHRwczovL25vZGVqcy5vcmcvYXBpL2NoaWxkX3Byb2Nlc3MuaHRtbCNjaGlsZF9wcm9jZXNzX2NoaWxkX3Byb2Nlc3NfZXhlY19jb21tYW5kX29wdGlvbnNfY2FsbGJhY2spXG4vL0Bcbi8vQCBFeGFtcGxlczpcbi8vQFxuLy9AIGBgYGphdmFzY3JpcHRcbi8vQCB2YXIgdmVyc2lvbiA9IGV4ZWMoJ25vZGUgLS12ZXJzaW9uJywge3NpbGVudDp0cnVlfSkuc3Rkb3V0O1xuLy9AXG4vL0AgdmFyIGNoaWxkID0gZXhlYygnc29tZV9sb25nX3J1bm5pbmdfcHJvY2VzcycsIHthc3luYzp0cnVlfSk7XG4vL0AgY2hpbGQuc3Rkb3V0Lm9uKCdkYXRhJywgZnVuY3Rpb24oZGF0YSkge1xuLy9AICAgLyogLi4uIGRvIHNvbWV0aGluZyB3aXRoIGRhdGEgLi4uICovXG4vL0AgfSk7XG4vL0Bcbi8vQCBleGVjKCdzb21lX2xvbmdfcnVubmluZ19wcm9jZXNzJywgZnVuY3Rpb24oY29kZSwgc3Rkb3V0LCBzdGRlcnIpIHtcbi8vQCAgIGNvbnNvbGUubG9nKCdFeGl0IGNvZGU6JywgY29kZSk7XG4vL0AgICBjb25zb2xlLmxvZygnUHJvZ3JhbSBvdXRwdXQ6Jywgc3Rkb3V0KTtcbi8vQCAgIGNvbnNvbGUubG9nKCdQcm9ncmFtIHN0ZGVycjonLCBzdGRlcnIpO1xuLy9AIH0pO1xuLy9AIGBgYFxuLy9AXG4vL0AgRXhlY3V0ZXMgdGhlIGdpdmVuIGBjb21tYW5kYCBfc3luY2hyb25vdXNseV8sIHVubGVzcyBvdGhlcndpc2Ugc3BlY2lmaWVkLiAgV2hlbiBpbiBzeW5jaHJvbm91c1xuLy9AIG1vZGUsIHRoaXMgcmV0dXJucyBhIFNoZWxsU3RyaW5nIChjb21wYXRpYmxlIHdpdGggU2hlbGxKUyB2MC42LngsIHdoaWNoIHJldHVybnMgYW4gb2JqZWN0XG4vL0Agb2YgdGhlIGZvcm0gYHsgY29kZTouLi4sIHN0ZG91dDouLi4gLCBzdGRlcnI6Li4uIH1gKS4gT3RoZXJ3aXNlLCB0aGlzIHJldHVybnMgdGhlIGNoaWxkIHByb2Nlc3Ncbi8vQCBvYmplY3QsIGFuZCB0aGUgYGNhbGxiYWNrYCBnZXRzIHRoZSBhcmd1bWVudHMgYChjb2RlLCBzdGRvdXQsIHN0ZGVycilgLlxuLy9AXG4vL0AgTm90IHNlZWluZyB0aGUgYmVoYXZpb3IgeW91IHdhbnQ/IGBleGVjKClgIHJ1bnMgZXZlcnl0aGluZyB0aHJvdWdoIGBzaGBcbi8vQCBieSBkZWZhdWx0IChvciBgY21kLmV4ZWAgb24gV2luZG93cyksIHdoaWNoIGRpZmZlcnMgZnJvbSBgYmFzaGAuIElmIHlvdVxuLy9AIG5lZWQgYmFzaC1zcGVjaWZpYyBiZWhhdmlvciwgdHJ5IG91dCB0aGUgYHtzaGVsbDogJ3BhdGgvdG8vYmFzaCd9YCBvcHRpb24uXG4vL0Bcbi8vQCAqKk5vdGU6KiogRm9yIGxvbmctbGl2ZWQgcHJvY2Vzc2VzLCBpdCdzIGJlc3QgdG8gcnVuIGBleGVjKClgIGFzeW5jaHJvbm91c2x5IGFzXG4vL0AgdGhlIGN1cnJlbnQgc3luY2hyb25vdXMgaW1wbGVtZW50YXRpb24gdXNlcyBhIGxvdCBvZiBDUFUuIFRoaXMgc2hvdWxkIGJlIGdldHRpbmdcbi8vQCBmaXhlZCBzb29uLlxuZnVuY3Rpb24gX2V4ZWMoY29tbWFuZCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGlmICghY29tbWFuZCkgY29tbW9uLmVycm9yKCdtdXN0IHNwZWNpZnkgY29tbWFuZCcpO1xuXG4gIHZhciBwaXBlID0gY29tbW9uLnJlYWRGcm9tUGlwZSgpO1xuXG4gIC8vIENhbGxiYWNrIGlzIGRlZmluZWQgaW5zdGVhZCBvZiBvcHRpb25zLlxuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IHsgYXN5bmM6IHRydWUgfTtcbiAgfVxuXG4gIC8vIENhbGxiYWNrIGlzIGRlZmluZWQgd2l0aCBvcHRpb25zLlxuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIG9wdGlvbnMuYXN5bmMgPSB0cnVlO1xuICB9XG5cbiAgb3B0aW9ucyA9IGNvbW1vbi5leHRlbmQoe1xuICAgIHNpbGVudDogY29tbW9uLmNvbmZpZy5zaWxlbnQsXG4gICAgYXN5bmM6IGZhbHNlLFxuICB9LCBvcHRpb25zKTtcblxuICB0cnkge1xuICAgIGlmIChvcHRpb25zLmFzeW5jKSB7XG4gICAgICByZXR1cm4gZXhlY0FzeW5jKGNvbW1hbmQsIG9wdGlvbnMsIHBpcGUsIGNhbGxiYWNrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGV4ZWNTeW5jKGNvbW1hbmQsIG9wdGlvbnMsIHBpcGUpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbW1vbi5lcnJvcignaW50ZXJuYWwgZXJyb3InKTtcbiAgfVxufVxubW9kdWxlLmV4cG9ydHMgPSBfZXhlYztcbiJdfQ==