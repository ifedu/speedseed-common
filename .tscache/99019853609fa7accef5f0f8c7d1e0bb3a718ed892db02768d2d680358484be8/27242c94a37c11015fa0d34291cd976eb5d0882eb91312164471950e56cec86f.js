'use strict';
var fs = require('fs');
var path = require('path');
var async = require('async');
var detectConflict = require('detect-conflict');
var _ = require('lodash');
var pathExists = require('path-exists');
var typedError = require('error/typed');
var binaryDiff = require('./binary-diff');
var AbortedError = typedError({
    type: 'AbortedError',
    message: 'Process aborted by user'
});
/**
 * The Conflicter is a module that can be used to detect conflict between files. Each
 * Generator file system helpers pass files through this module to make sure they don't
 * break a user file.
 *
 * When a potential conflict is detected, we prompt the user and ask them for
 * confirmation before proceeding with the actual write.
 *
 * @constructor
 * @property {Boolean} force - same as the constructor argument
 *
 * @param  {TerminalAdapter} adapter - The generator adapter
 * @param  {Boolean} force - When set to true, we won't check for conflict. (the
 *                           conflicter become a passthrough)
 */
var Conflicter = module.exports = function (adapter, force) {
    this.force = force === true;
    this.adapter = adapter;
    this.conflicts = [];
};
/**
 * Add a file to conflicter queue.
 *
 * @param {String} filepath - File destination path
 * @param {String} contents - File new contents
 * @param {Function} callback - callback to be called once we know if the user want to
 *                              proceed or not.
 */
Conflicter.prototype.checkForCollision = function (filepath, contents, callback) {
    this.conflicts.push({
        file: {
            path: path.resolve(filepath),
            contents: contents
        },
        callback: callback
    });
};
/**
 * Process the _potential conflict_ queue and ask the user to resolve conflict when they
 * occur.
 *
 * The user is presented with the following options:
 *
 *   - `Y` Yes, overwrite
 *   - `n` No, do not overwrite
 *   - `a` All, overwrite this and all others
 *   - `q` Quit, abort
 *   - `d` Diff, show the differences between the old and the new
 *   - `h` Help, show this help
 *
 * @param  {Function} cb Callback once every conflict are resolved. (note that each
 *                       file can specify it's own callback. See `#checkForCollision()`)
 */
Conflicter.prototype.resolve = function (cb) {
    cb = cb || _.noop;
    var self = this;
    var resolveConflicts = function (conflict) {
        return function (next) {
            if (!conflict) {
                next();
                return;
            }
            self.collision(conflict.file, function (status) {
                // Remove the resolved conflict from the queue
                _.pull(self.conflicts, conflict);
                conflict.callback(null, status);
                next();
            });
        };
    };
    async.series(this.conflicts.map(resolveConflicts), cb.bind(this));
};
/**
 * Check if a file conflict with the current version on the user disk.
 *
 * A basic check is done to see if the file exists, if it does:
 *
 *   1. Read its content from  `fs`
 *   2. Compare it with the provided content
 *   3. If identical, mark it as is and skip the check
 *   4. If diverged, prepare and show up the file collision menu
 *
 * @param  {Object}   file File object respecting this interface: { path, contents }
 * @param  {Function} cb Callback receiving a status string ('identical', 'create',
 *                       'skip', 'force')
 * @return {null} nothing
 */
Conflicter.prototype.collision = function (file, cb) {
    var rfilepath = path.relative(process.cwd(), file.path);
    if (!pathExists.sync(file.path)) {
        this.adapter.log.create(rfilepath);
        cb('create');
        return;
    }
    if (this.force) {
        this.adapter.log.force(rfilepath);
        cb('force');
        return;
    }
    if (detectConflict(file.path, file.contents)) {
        this.adapter.log.conflict(rfilepath);
        this._ask(file, cb);
    }
    else {
        this.adapter.log.identical(rfilepath);
        cb('identical');
    }
};
/**
 * Actual prompting logic
 * @private
 * @param {Object} file
 * @param {Function} cb
 */
Conflicter.prototype._ask = function (file, cb) {
    var rfilepath = path.relative(process.cwd(), file.path);
    var prompt = {
        name: 'action',
        type: 'expand',
        message: 'Overwrite ' + rfilepath + '?',
        choices: [{
                key: 'y',
                name: 'overwrite',
                value: 'write'
            }, {
                key: 'n',
                name: 'do not overwrite',
                value: 'skip'
            }, {
                key: 'a',
                name: 'overwrite this and all others',
                value: 'force'
            }, {
                key: 'x',
                name: 'abort',
                value: 'abort'
            }]
    };
    // Only offer diff option for files
    if (fs.statSync(file.path).isFile()) {
        prompt.choices.push({
            key: 'd',
            name: 'show the differences between the old and the new',
            value: 'diff'
        });
    }
    this.adapter.prompt([prompt], function (result) {
        if (result.action === 'abort') {
            this.adapter.log.writeln('Aborting ...');
            throw new AbortedError();
        }
        if (result.action === 'diff') {
            if (binaryDiff.isBinary(file.path, file.contents)) {
                this.adapter.log.writeln(binaryDiff.diff(file.path, file.contents));
            }
            else {
                var existing = fs.readFileSync(file.path);
                this.adapter.diff(existing.toString(), (file.contents || '').toString());
            }
            return this._ask(file, cb);
        }
        if (result.action === 'force') {
            this.force = true;
        }
        if (result.action === 'write') {
            result.action = 'force';
        }
        this.adapter.log[result.action](rfilepath);
        return cb(result.action);
    }.bind(this));
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZ2VuZXJhdG9yXFxsaWJcXHV0aWxcXGNvbmZsaWN0ZXIuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xceWVvbWFuLWdlbmVyYXRvclxcbGliXFx1dGlsXFxjb25mbGljdGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQztBQUNiLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN2QixJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDM0IsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzdCLElBQUksY0FBYyxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ2hELElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMxQixJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDeEMsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3hDLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUUxQyxJQUFJLFlBQVksR0FBRyxVQUFVLENBQUM7SUFDNUIsSUFBSSxFQUFFLGNBQWM7SUFDcEIsT0FBTyxFQUFFLHlCQUF5QjtDQUNuQyxDQUFDLENBQUM7QUFFSDs7Ozs7Ozs7Ozs7Ozs7R0FjRztBQUNILElBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEdBQUcsVUFBVSxPQUFPLEVBQUUsS0FBSztJ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QyxNQUFNLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQztZQUM5QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNwQixDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDO1FBQzFCLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG52YXIgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciBhc3luYyA9IHJlcXVpcmUoJ2FzeW5jJyk7XG52YXIgZGV0ZWN0Q29uZmxpY3QgPSByZXF1aXJlKCdkZXRlY3QtY29uZmxpY3QnKTtcbnZhciBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG52YXIgcGF0aEV4aXN0cyA9IHJlcXVpcmUoJ3BhdGgtZXhpc3RzJyk7XG52YXIgdHlwZWRFcnJvciA9IHJlcXVpcmUoJ2Vycm9yL3R5cGVkJyk7XG52YXIgYmluYXJ5RGlmZiA9IHJlcXVpcmUoJy4vYmluYXJ5LWRpZmYnKTtcblxudmFyIEFib3J0ZWRFcnJvciA9IHR5cGVkRXJyb3Ioe1xuICB0eXBlOiAnQWJvcnRlZEVycm9yJyxcbiAgbWVzc2FnZTogJ1Byb2Nlc3MgYWJvcnRlZCBieSB1c2VyJ1xufSk7XG5cbi8qKlxuICogVGhlIENvbmZsaWN0ZXIgaXMgYSBtb2R1bGUgdGhhdCBjYW4gYmUgdXNlZCB0byBkZXRlY3QgY29uZmxpY3QgYmV0d2VlbiBmaWxlcy4gRWFjaFxuICogR2VuZXJhdG9yIGZpbGUgc3lzdGVtIGhlbHBlcnMgcGFzcyBmaWxlcyB0aHJvdWdoIHRoaXMgbW9kdWxlIHRvIG1ha2Ugc3VyZSB0aGV5IGRvbid0XG4gKiBicmVhayBhIHVzZXIgZmlsZS5cbiAqXG4gKiBXaGVuIGEgcG90ZW50aWFsIGNvbmZsaWN0IGlzIGRldGVjdGVkLCB3ZSBwcm9tcHQgdGhlIHVzZXIgYW5kIGFzayB0aGVtIGZvclxuICogY29uZmlybWF0aW9uIGJlZm9yZSBwcm9jZWVkaW5nIHdpdGggdGhlIGFjdHVhbCB3cml0ZS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gZm9yY2UgLSBzYW1lIGFzIHRoZSBjb25zdHJ1Y3RvciBhcmd1bWVudFxuICpcbiAqIEBwYXJhbSAge1Rlcm1pbmFsQWRhcHRlcn0gYWRhcHRlciAtIFRoZSBnZW5lcmF0b3IgYWRhcHRlclxuICogQHBhcmFtICB7Qm9vbGVhbn0gZm9yY2UgLSBXaGVuIHNldCB0byB0cnVlLCB3ZSB3b24ndCBjaGVjayBmb3IgY29uZmxpY3QuICh0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmxpY3RlciBiZWNvbWUgYSBwYXNzdGhyb3VnaClcbiAqL1xudmFyIENvbmZsaWN0ZXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhZGFwdGVyLCBmb3JjZSkge1xuICB0aGlzLmZvcmNlID0gZm9yY2UgPT09IHRydWU7XG4gIHRoaXMuYWRhcHRlciA9IGFkYXB0ZXI7XG4gIHRoaXMuY29uZmxpY3RzID0gW107XG59O1xuXG4vKipcbiAqIEFkZCBhIGZpbGUgdG8gY29uZmxpY3RlciBxdWV1ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmlsZXBhdGggLSBGaWxlIGRlc3RpbmF0aW9uIHBhdGhcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb250ZW50cyAtIEZpbGUgbmV3IGNvbnRlbnRzXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCBvbmNlIHdlIGtub3cgaWYgdGhlIHVzZXIgd2FudCB0b1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZWVkIG9yIG5vdC5cbiAqL1xuQ29uZmxpY3Rlci5wcm90b3R5cGUuY2hlY2tGb3JDb2xsaXNpb24gPSBmdW5jdGlvbiAoZmlsZXBhdGgsIGNvbnRlbnRzLCBjYWxsYmFjaykge1xuICB0aGlzLmNvbmZsaWN0cy5wdXNoKHtcbiAgICBmaWxlOiB7XG4gICAgICBwYXRoOiBwYXRoLnJlc29sdmUoZmlsZXBhdGgpLFxuICAgICAgY29udGVudHM6IGNvbnRlbnRzXG4gICAgfSxcbiAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgfSk7XG59O1xuXG4vKipcbiAqIFByb2Nlc3MgdGhlIF9wb3RlbnRpYWwgY29uZmxpY3RfIHF1ZXVlIGFuZCBhc2sgdGhlIHVzZXIgdG8gcmVzb2x2ZSBjb25mbGljdCB3aGVuIHRoZXlcbiAqIG9jY3VyLlxuICpcbiAqIFRoZSB1c2VyIGlzIHByZXNlbnRlZCB3aXRoIHRoZSBmb2xsb3dpbmcgb3B0aW9uczpcbiAqXG4gKiAgIC0gYFlgIFllcywgb3ZlcndyaXRlXG4gKiAgIC0gYG5gIE5vLCBkbyBub3Qgb3ZlcndyaXRlXG4gKiAgIC0gYGFgIEFsbCwgb3ZlcndyaXRlIHRoaXMgYW5kIGFsbCBvdGhlcnNcbiAqICAgLSBgcWAgUXVpdCwgYWJvcnRcbiAqICAgLSBgZGAgRGlmZiwgc2hvdyB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiB0aGUgb2xkIGFuZCB0aGUgbmV3XG4gKiAgIC0gYGhgIEhlbHAsIHNob3cgdGhpcyBoZWxwXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGNiIENhbGxiYWNrIG9uY2UgZXZlcnkgY29uZmxpY3QgYXJlIHJlc29sdmVkLiAobm90ZSB0aGF0IGVhY2hcbiAqICAgICAgICAgICAgICAgICAgICAgICBmaWxlIGNhbiBzcGVjaWZ5IGl0J3Mgb3duIGNhbGxiYWNrLiBTZWUgYCNjaGVja0ZvckNvbGxpc2lvbigpYClcbiAqL1xuQ29uZmxpY3Rlci5wcm90b3R5cGUucmVzb2x2ZSA9IGZ1bmN0aW9uIChjYikge1xuICBjYiA9IGNiIHx8IF8ubm9vcDtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciByZXNvbHZlQ29uZmxpY3RzID0gZnVuY3Rpb24gKGNvbmZsaWN0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChuZXh0KSB7XG4gICAgICBpZiAoIWNvbmZsaWN0KSB7XG4gICAgICAgIG5leHQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBzZWxmLmNvbGxpc2lvbihjb25mbGljdC5maWxlLCBmdW5jdGlvbiAoc3RhdHVzKSB7XG4gICAgICAgIC8vIFJlbW92ZSB0aGUgcmVzb2x2ZWQgY29uZmxpY3QgZnJvbSB0aGUgcXVldWVcbiAgICAgICAgXy5wdWxsKHNlbGYuY29uZmxpY3RzLCBjb25mbGljdCk7XG4gICAgICAgIGNvbmZsaWN0LmNhbGxiYWNrKG51bGwsIHN0YXR1cyk7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH07XG5cbiAgYXN5bmMuc2VyaWVzKHRoaXMuY29uZmxpY3RzLm1hcChyZXNvbHZlQ29uZmxpY3RzKSwgY2IuYmluZCh0aGlzKSk7XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIGEgZmlsZSBjb25mbGljdCB3aXRoIHRoZSBjdXJyZW50IHZlcnNpb24gb24gdGhlIHVzZXIgZGlzay5cbiAqXG4gKiBBIGJhc2ljIGNoZWNrIGlzIGRvbmUgdG8gc2VlIGlmIHRoZSBmaWxlIGV4aXN0cywgaWYgaXQgZG9lczpcbiAqXG4gKiAgIDEuIFJlYWQgaXRzIGNvbnRlbnQgZnJvbSAgYGZzYFxuICogICAyLiBDb21wYXJlIGl0IHdpdGggdGhlIHByb3ZpZGVkIGNvbnRlbnRcbiAqICAgMy4gSWYgaWRlbnRpY2FsLCBtYXJrIGl0IGFzIGlzIGFuZCBza2lwIHRoZSBjaGVja1xuICogICA0LiBJZiBkaXZlcmdlZCwgcHJlcGFyZSBhbmQgc2hvdyB1cCB0aGUgZmlsZSBjb2xsaXNpb24gbWVudVxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gICBmaWxlIEZpbGUgb2JqZWN0IHJlc3BlY3RpbmcgdGhpcyBpbnRlcmZhY2U6IHsgcGF0aCwgY29udGVudHMgfVxuICogQHBhcmFtICB7RnVuY3Rpb259IGNiIENhbGxiYWNrIHJlY2VpdmluZyBhIHN0YXR1cyBzdHJpbmcgKCdpZGVudGljYWwnLCAnY3JlYXRlJyxcbiAqICAgICAgICAgICAgICAgICAgICAgICAnc2tpcCcsICdmb3JjZScpXG4gKiBAcmV0dXJuIHtudWxsfSBub3RoaW5nXG4gKi9cbkNvbmZsaWN0ZXIucHJvdG90eXBlLmNvbGxpc2lvbiA9IGZ1bmN0aW9uIChmaWxlLCBjYikge1xuICB2YXIgcmZpbGVwYXRoID0gcGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlLnBhdGgpO1xuXG4gIGlmICghcGF0aEV4aXN0cy5zeW5jKGZpbGUucGF0aCkpIHtcbiAgICB0aGlzLmFkYXB0ZXIubG9nLmNyZWF0ZShyZmlsZXBhdGgpO1xuICAgIGNiKCdjcmVhdGUnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodGhpcy5mb3JjZSkge1xuICAgIHRoaXMuYWRhcHRlci5sb2cuZm9yY2UocmZpbGVwYXRoKTtcbiAgICBjYignZm9yY2UnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoZGV0ZWN0Q29uZmxpY3QoZmlsZS5wYXRoLCBmaWxlLmNvbnRlbnRzKSkge1xuICAgIHRoaXMuYWRhcHRlci5sb2cuY29uZmxpY3QocmZpbGVwYXRoKTtcbiAgICB0aGlzLl9hc2soZmlsZSwgY2IpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuYWRhcHRlci5sb2cuaWRlbnRpY2FsKHJmaWxlcGF0aCk7XG4gICAgY2IoJ2lkZW50aWNhbCcpO1xuICB9XG59O1xuXG4vKipcbiAqIEFjdHVhbCBwcm9tcHRpbmcgbG9naWNcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gZmlsZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2JcbiAqL1xuQ29uZmxpY3Rlci5wcm90b3R5cGUuX2FzayA9IGZ1bmN0aW9uIChmaWxlLCBjYikge1xuICB2YXIgcmZpbGVwYXRoID0gcGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlLnBhdGgpO1xuICB2YXIgcHJvbXB0ID0ge1xuICAgIG5hbWU6ICdhY3Rpb24nLFxuICAgIHR5cGU6ICdleHBhbmQnLFxuICAgIG1lc3NhZ2U6ICdPdmVyd3JpdGUgJyArIHJmaWxlcGF0aCArICc/JyxcbiAgICBjaG9pY2VzOiBbe1xuICAgICAga2V5OiAneScsXG4gICAgICBuYW1lOiAnb3ZlcndyaXRlJyxcbiAgICAgIHZhbHVlOiAnd3JpdGUnXG4gICAgfSwge1xuICAgICAga2V5OiAnbicsXG4gICAgICBuYW1lOiAnZG8gbm90IG92ZXJ3cml0ZScsXG4gICAgICB2YWx1ZTogJ3NraXAnXG4gICAgfSwge1xuICAgICAga2V5OiAnYScsXG4gICAgICBuYW1lOiAnb3ZlcndyaXRlIHRoaXMgYW5kIGFsbCBvdGhlcnMnLFxuICAgICAgdmFsdWU6ICdmb3JjZSdcbiAgICB9LCB7XG4gICAgICBrZXk6ICd4JyxcbiAgICAgIG5hbWU6ICdhYm9ydCcsXG4gICAgICB2YWx1ZTogJ2Fib3J0J1xuICAgIH1dXG4gIH07XG5cbiAgLy8gT25seSBvZmZlciBkaWZmIG9wdGlvbiBmb3IgZmlsZXNcbiAgaWYgKGZzLnN0YXRTeW5jKGZpbGUucGF0aCkuaXNGaWxlKCkpIHtcbiAgICBwcm9tcHQuY2hvaWNlcy5wdXNoKHtcbiAgICAgIGtleTogJ2QnLFxuICAgICAgbmFtZTogJ3Nob3cgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gdGhlIG9sZCBhbmQgdGhlIG5ldycsXG4gICAgICB2YWx1ZTogJ2RpZmYnXG4gICAgfSk7XG4gIH1cblxuICB0aGlzLmFkYXB0ZXIucHJvbXB0KFtwcm9tcHRdLCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgaWYgKHJlc3VsdC5hY3Rpb24gPT09ICdhYm9ydCcpIHtcbiAgICAgIHRoaXMuYWRhcHRlci5sb2cud3JpdGVsbignQWJvcnRpbmcgLi4uJyk7XG4gICAgICB0aHJvdyBuZXcgQWJvcnRlZEVycm9yKCk7XG4gICAgfVxuXG4gICAgaWYgKHJlc3VsdC5hY3Rpb24gPT09ICdkaWZmJykge1xuICAgICAgaWYgKGJpbmFyeURpZmYuaXNCaW5hcnkoZmlsZS5wYXRoLCBmaWxlLmNvbnRlbnRzKSkge1xuICAgICAgICB0aGlzLmFkYXB0ZXIubG9nLndyaXRlbG4oYmluYXJ5RGlmZi5kaWZmKGZpbGUucGF0aCwgZmlsZS5jb250ZW50cykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGV4aXN0aW5nID0gZnMucmVhZEZpbGVTeW5jKGZpbGUucGF0aCk7XG4gICAgICAgIHRoaXMuYWRhcHRlci5kaWZmKGV4aXN0aW5nLnRvU3RyaW5nKCksIChmaWxlLmNvbnRlbnRzIHx8ICcnKS50b1N0cmluZygpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuX2FzayhmaWxlLCBjYik7XG4gICAgfVxuXG4gICAgaWYgKHJlc3VsdC5hY3Rpb24gPT09ICdmb3JjZScpIHtcbiAgICAgIHRoaXMuZm9yY2UgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmIChyZXN1bHQuYWN0aW9uID09PSAnd3JpdGUnKSB7XG4gICAgICByZXN1bHQuYWN0aW9uID0gJ2ZvcmNlJztcbiAgICB9XG5cbiAgICB0aGlzLmFkYXB0ZXIubG9nW3Jlc3VsdC5hY3Rpb25dKHJmaWxlcGF0aCk7XG4gICAgcmV0dXJuIGNiKHJlc3VsdC5hY3Rpb24pO1xuICB9LmJpbmQodGhpcykpO1xufTtcbiJdfQ==