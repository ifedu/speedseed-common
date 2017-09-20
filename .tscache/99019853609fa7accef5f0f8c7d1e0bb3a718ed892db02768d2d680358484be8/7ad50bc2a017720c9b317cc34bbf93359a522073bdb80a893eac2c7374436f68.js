'use strict';
var assert = require('assert');
var _ = require('lodash');
var dargs = require('dargs');
var async = require('async');
var chalk = require('chalk');
/**
 * @mixin
 * @alias actions/install
 */
var install = module.exports;
/**
 * Combine package manager cmd line arguments and run the `install` command.
 *
 * During the `install` step, every command will be scheduled to run once, on the
 * run loop. (So don't combine the callback with `this.async()`)
 *
 * @param {String} installer Which package manager to use
 * @param {String|Array} [paths] Packages to install. Use an empty string for `npm install`
 * @param {Object} [options] Options to pass to `dargs` as arguments
 * @param {Function} [cb]
 * @param {Object} [spawnOptions] Options to pass `child_process.spawn`. ref
 *                                https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
 */
install.runInstall = function (installer, paths, options, cb, spawnOptions) {
    if (!cb && _.isFunction(options)) {
        cb = options;
        options = {};
    }
    options = options || {};
    spawnOptions = spawnOptions || {};
    cb = cb || function () { };
    paths = Array.isArray(paths) ? paths : (paths && paths.split(' ')) || [];
    var args = ['install'].concat(paths).concat(dargs(options));
    // Yarn uses the `add` command to specifically add a package to a project.
    if (installer === 'yarn' && paths.length > 0) {
        args[0] = 'add';
    }
    // Only for npm, use a minimum cache of one day
    if (installer === 'npm') {
        args = args.concat(['--cache-min', 24 * 60 * 60]);
    }
    // Return early if we're skipping installation.
    if (this.options.skipInstall) {
        cb();
        return this;
    }
    this.env.runLoop.add('install', function (done) {
        this.emit(installer + 'Install', paths);
        this.spawnCommand(installer, args, spawnOptions)
            .on('error', function (err) {
            console.log(chalk.red('Could not finish installation. \n') +
                'Please install ' + installer + ' with ' +
                chalk.yellow('npm install -g ' + installer) + ' and try again.');
            cb(err);
        })
            .on('exit', function (err) {
            this.emit(installer + 'Install:end', paths);
            cb(err);
            done();
        }.bind(this));
    }.bind(this), { once: installer + ' ' + args.join(' '), run: false });
    return this;
};
/**
 * Runs `npm` and `bower`, in sequence, in the generated directory and prints a
 * message to let the user know.
 *
 * @example
 * this.installDependencies({
 *   bower: true,
 *   npm: true,
 *   callback: function () {
 *     console.log('Everything is ready!');
 *   }
 * });
 *
 * @param {Object} [options]
 * @param {Boolean} [options.npm=true] - whether to run `npm install`
 * @param {Boolean} [options.bower=true] - whether to run `bower install`
 * @param {Boolean} [options.yarn=false] - whether to run `yarn install`
 * @param {Boolean} [options.skipMessage=false] - whether to log the used commands
 * @param {Function} [options.callback] - call once all commands have run
 */
install.installDependencies = function (options) {
    options = options || {};
    var commands = [];
    var msg = {
        commands: [],
        template: _.template('\n\nI\'m all done. ' +
            '<%= skipInstall ? "Just run" : "Running" %> <%= commands %> ' +
            '<%= skipInstall ? "" : "for you " %>to install the required dependencies.' +
            '<% if (!skipInstall) { %> If this fails, try running the command yourself.<% } %>\n\n')
    };
    if (_.isFunction(options)) {
        options = {
            callback: options
        };
    }
    if (options.npm !== false) {
        msg.commands.push('npm install');
        commands.push(function (cb) {
            this.npmInstall(null, null, cb);
        }.bind(this));
    }
    if (options.yarn === true) {
        msg.commands.push('yarn install');
        commands.push(function (cb) {
            this.yarnInstall(null, null, cb);
        }.bind(this));
    }
    if (options.bower !== false) {
        msg.commands.push('bower install');
        commands.push(function (cb) {
            this.bowerInstall(null, null, cb);
        }.bind(this));
    }
    assert(msg.commands.length, 'installDependencies needs at least one of `npm`, `bower` or `yarn` to run.');
    if (!options.skipMessage) {
        var tplValues = _.extend({
            skipInstall: false
        }, this.options, {
            commands: chalk.yellow.bold(msg.commands.join(' && '))
        });
        this.log(msg.template(tplValues));
    }
    async.parallel(commands, options.callback || _.noop);
};
/**
 * Receives a list of `components` and an `options` object to install through bower.
 *
 * The installation will automatically run during the run loop `install` phase.
 *
 * @param {String|Array} [cmpnt] Components to install
 * @param {Object} [options] Options to pass to `dargs` as arguments
 * @param {Function} [cb]
 * @param {Object} [spawnOptions] Options to pass `child_process.spawn`.
 */
install.bowerInstall = function (cmpnt, options, cb, spawnOptions) {
    return this.runInstall('bower', cmpnt, options, cb, spawnOptions);
};
/**
 * Receives a list of `packages` and an `options` object to install through npm.
 *
 * The installation will automatically run during the run loop `install` phase.
 *
 * @param {String|Array} [pkgs] Packages to install
 * @param {Object} [options] Options to pass to `dargs` as arguments
 * @param {Function} [cb]
 * @param {Object} [spawnOptions] Options to pass `child_process.spawn`.
 */
install.npmInstall = function (pkgs, options, cb, spawnOptions) {
    return this.runInstall('npm', pkgs, options, cb, spawnOptions);
};
/**
 * Receives a list of `packages` and an `options` object to install through npm.
 *
 * The installation will automatically run during the run loop `install` phase.
 *
 * @param {String|Array} [pkgs] Packages to install
 * @param {Object} [options] Options to pass to `dargs` as arguments
 * @param {Function} [cb]
 * @param {Object} [spawnOptions] Options to pass `child_process.spawn`.
 */
install.yarnInstall = function (pkgs, options, cb, spawnOptions) {
    return this.runInstall('yarn', pkgs, options, cb, spawnOptions);
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZ2VuZXJhdG9yXFxsaWJcXGFjdGlvbnNcXGluc3RhbGwuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xceWVvbWFuLWdlbmVyYXRvclxcbGliXFxhY3Rpb25zXFxpbnN0YWxsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQztBQUNiLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQixJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDMUIsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzdCLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QixJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFN0I7OztHQUdHO0FBQ0gsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUU3Qjs7Ozs7Ozs7Ozs7O0dBWUc7QUFFSCxPQUFPLENBQUMsVUFBVSxHQUFHLFVBQVUsU0FBUyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFlBQVk7SUFDeEUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakMsRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUNiLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFDZixDQUFDO0lBRUQsT0FBTyxHQUFHLE9BQU8sSUFB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QUM7QUFDakUsQ0FBQyxDQUFDO0FBQ0Y7Ozs7Ozs7OztHQVNHO0FBRUgsT0FBTyxDQUFDLFdBQVcsR0FBRyxVQUFVLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFlBQVk7SUFDN0QsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQ2xFLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKTtcbnZhciBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG52YXIgZGFyZ3MgPSByZXF1aXJlKCdkYXJncycpO1xudmFyIGFzeW5jID0gcmVxdWlyZSgnYXN5bmMnKTtcbnZhciBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbi8qKlxuICogQG1peGluXG4gKiBAYWxpYXMgYWN0aW9ucy9pbnN0YWxsXG4gKi9cbnZhciBpbnN0YWxsID0gbW9kdWxlLmV4cG9ydHM7XG5cbi8qKlxuICogQ29tYmluZSBwYWNrYWdlIG1hbmFnZXIgY21kIGxpbmUgYXJndW1lbnRzIGFuZCBydW4gdGhlIGBpbnN0YWxsYCBjb21tYW5kLlxuICpcbiAqIER1cmluZyB0aGUgYGluc3RhbGxgIHN0ZXAsIGV2ZXJ5IGNvbW1hbmQgd2lsbCBiZSBzY2hlZHVsZWQgdG8gcnVuIG9uY2UsIG9uIHRoZVxuICogcnVuIGxvb3AuIChTbyBkb24ndCBjb21iaW5lIHRoZSBjYWxsYmFjayB3aXRoIGB0aGlzLmFzeW5jKClgKVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBpbnN0YWxsZXIgV2hpY2ggcGFja2FnZSBtYW5hZ2VyIHRvIHVzZVxuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IFtwYXRoc10gUGFja2FnZXMgdG8gaW5zdGFsbC4gVXNlIGFuIGVtcHR5IHN0cmluZyBmb3IgYG5wbSBpbnN0YWxsYFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBPcHRpb25zIHRvIHBhc3MgdG8gYGRhcmdzYCBhcyBhcmd1bWVudHNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYl1cbiAqIEBwYXJhbSB7T2JqZWN0fSBbc3Bhd25PcHRpb25zXSBPcHRpb25zIHRvIHBhc3MgYGNoaWxkX3Byb2Nlc3Muc3Bhd25gLiByZWZcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBodHRwczovL25vZGVqcy5vcmcvYXBpL2NoaWxkX3Byb2Nlc3MuaHRtbCNjaGlsZF9wcm9jZXNzX2NoaWxkX3Byb2Nlc3Nfc3Bhd25fY29tbWFuZF9hcmdzX29wdGlvbnNcbiAqL1xuXG5pbnN0YWxsLnJ1bkluc3RhbGwgPSBmdW5jdGlvbiAoaW5zdGFsbGVyLCBwYXRocywgb3B0aW9ucywgY2IsIHNwYXduT3B0aW9ucykge1xuICBpZiAoIWNiICYmIF8uaXNGdW5jdGlvbihvcHRpb25zKSkge1xuICAgIGNiID0gb3B0aW9ucztcbiAgICBvcHRpb25zID0ge307XG4gIH1cblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgc3Bhd25PcHRpb25zID0gc3Bhd25PcHRpb25zIHx8IHt9O1xuICBjYiA9IGNiIHx8IGZ1bmN0aW9uICgpIHt9O1xuICBwYXRocyA9IEFycmF5LmlzQXJyYXkocGF0aHMpID8gcGF0aHMgOiAocGF0aHMgJiYgcGF0aHMuc3BsaXQoJyAnKSkgfHwgW107XG5cbiAgdmFyIGFyZ3MgPSBbJ2luc3RhbGwnXS5jb25jYXQocGF0aHMpLmNvbmNhdChkYXJncyhvcHRpb25zKSk7XG5cbiAgLy8gWWFybiB1c2VzIHRoZSBgYWRkYCBjb21tYW5kIHRvIHNwZWNpZmljYWxseSBhZGQgYSBwYWNrYWdlIHRvIGEgcHJvamVjdC5cbiAgaWYgKGluc3RhbGxlciA9PT0gJ3lhcm4nICYmIHBhdGhzLmxlbmd0aCA+IDApIHtcbiAgICBhcmdzWzBdID0gJ2FkZCc7XG4gIH1cblxuICAvLyBPbmx5IGZvciBucG0sIHVzZSBhIG1pbmltdW0gY2FjaGUgb2Ygb25lIGRheVxuICBpZiAoaW5zdGFsbGVyID09PSAnbnBtJykge1xuICAgIGFyZ3MgPSBhcmdzLmNvbmNhdChbJy0tY2FjaGUtbWluJywgMjQgKiA2MCAqIDYwXSk7XG4gIH1cblxuICAvLyBSZXR1cm4gZWFybHkgaWYgd2UncmUgc2tpcHBpbmcgaW5zdGFsbGF0aW9uLlxuICBpZiAodGhpcy5vcHRpb25zLnNraXBJbnN0YWxsKSB7XG4gICAgY2IoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHRoaXMuZW52LnJ1bkxvb3AuYWRkKCdpbnN0YWxsJywgZnVuY3Rpb24gKGRvbmUpIHtcbiAgICB0aGlzLmVtaXQoaW5zdGFsbGVyICsgJ0luc3RhbGwnLCBwYXRocyk7XG4gICAgdGhpcy5zcGF3bkNvbW1hbmQoaW5zdGFsbGVyLCBhcmdzLCBzcGF3bk9wdGlvbnMpXG4gICAgICAub24oJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBjb25zb2xlLmxvZyhjaGFsay5yZWQoJ0NvdWxkIG5vdCBmaW5pc2ggaW5zdGFsbGF0aW9uLiBcXG4nKSArXG4gICAgICAgICAgJ1BsZWFzZSBpbnN0YWxsICcgKyBpbnN0YWxsZXIgKyAnIHdpdGggJyArXG4gICAgICAgICAgY2hhbGsueWVsbG93KCducG0gaW5zdGFsbCAtZyAnICsgaW5zdGFsbGVyKSArICcgYW5kIHRyeSBhZ2Fpbi4nXG4gICAgICAgICk7XG4gICAgICAgIGNiKGVycik7XG4gICAgICB9KVxuICAgICAgLm9uKCdleGl0JywgZnVuY3Rpb24gKGVycikge1xuICAgICAgICB0aGlzLmVtaXQoaW5zdGFsbGVyICsgJ0luc3RhbGw6ZW5kJywgcGF0aHMpO1xuICAgICAgICBjYihlcnIpO1xuICAgICAgICBkb25lKCk7XG4gICAgICB9LmJpbmQodGhpcykpO1xuICB9LmJpbmQodGhpcyksIHtvbmNlOiBpbnN0YWxsZXIgKyAnICcgKyBhcmdzLmpvaW4oJyAnKSwgcnVuOiBmYWxzZX0pO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSdW5zIGBucG1gIGFuZCBgYm93ZXJgLCBpbiBzZXF1ZW5jZSwgaW4gdGhlIGdlbmVyYXRlZCBkaXJlY3RvcnkgYW5kIHByaW50cyBhXG4gKiBtZXNzYWdlIHRvIGxldCB0aGUgdXNlciBrbm93LlxuICpcbiAqIEBleGFtcGxlXG4gKiB0aGlzLmluc3RhbGxEZXBlbmRlbmNpZXMoe1xuICogICBib3dlcjogdHJ1ZSxcbiAqICAgbnBtOiB0cnVlLFxuICogICBjYWxsYmFjazogZnVuY3Rpb24gKCkge1xuICogICAgIGNvbnNvbGUubG9nKCdFdmVyeXRoaW5nIGlzIHJlYWR5IScpO1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLm5wbT10cnVlXSAtIHdoZXRoZXIgdG8gcnVuIGBucG0gaW5zdGFsbGBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuYm93ZXI9dHJ1ZV0gLSB3aGV0aGVyIHRvIHJ1biBgYm93ZXIgaW5zdGFsbGBcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMueWFybj1mYWxzZV0gLSB3aGV0aGVyIHRvIHJ1biBgeWFybiBpbnN0YWxsYFxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5za2lwTWVzc2FnZT1mYWxzZV0gLSB3aGV0aGVyIHRvIGxvZyB0aGUgdXNlZCBjb21tYW5kc1xuICogQHBhcmFtIHtGdW5jdGlvbn0gW29wdGlvbnMuY2FsbGJhY2tdIC0gY2FsbCBvbmNlIGFsbCBjb21tYW5kcyBoYXZlIHJ1blxuICovXG5cbmluc3RhbGwuaW5zdGFsbERlcGVuZGVuY2llcyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgY29tbWFuZHMgPSBbXTtcbiAgdmFyIG1zZyA9IHtcbiAgICBjb21tYW5kczogW10sXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoJ1xcblxcbklcXCdtIGFsbCBkb25lLiAnICtcbiAgICAnPCU9IHNraXBJbnN0YWxsID8gXCJKdXN0IHJ1blwiIDogXCJSdW5uaW5nXCIgJT4gPCU9IGNvbW1hbmRzICU+ICcgK1xuICAgICc8JT0gc2tpcEluc3RhbGwgPyBcIlwiIDogXCJmb3IgeW91IFwiICU+dG8gaW5zdGFsbCB0aGUgcmVxdWlyZWQgZGVwZW5kZW5jaWVzLicgK1xuICAgICc8JSBpZiAoIXNraXBJbnN0YWxsKSB7ICU+IElmIHRoaXMgZmFpbHMsIHRyeSBydW5uaW5nIHRoZSBjb21tYW5kIHlvdXJzZWxmLjwlIH0gJT5cXG5cXG4nKVxuICB9O1xuXG4gIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucykpIHtcbiAgICBvcHRpb25zID0ge1xuICAgICAgY2FsbGJhY2s6IG9wdGlvbnNcbiAgICB9O1xuICB9XG5cbiAgaWYgKG9wdGlvbnMubnBtICE9PSBmYWxzZSkge1xuICAgIG1zZy5jb21tYW5kcy5wdXNoKCducG0gaW5zdGFsbCcpO1xuICAgIGNvbW1hbmRzLnB1c2goZnVuY3Rpb24gKGNiKSB7XG4gICAgICB0aGlzLm5wbUluc3RhbGwobnVsbCwgbnVsbCwgY2IpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gIH1cblxuICBpZiAob3B0aW9ucy55YXJuID09PSB0cnVlKSB7XG4gICAgbXNnLmNvbW1hbmRzLnB1c2goJ3lhcm4gaW5zdGFsbCcpO1xuICAgIGNvbW1hbmRzLnB1c2goZnVuY3Rpb24gKGNiKSB7XG4gICAgICB0aGlzLnlhcm5JbnN0YWxsKG51bGwsIG51bGwsIGNiKTtcbiAgICB9LmJpbmQodGhpcykpO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMuYm93ZXIgIT09IGZhbHNlKSB7XG4gICAgbXNnLmNvbW1hbmRzLnB1c2goJ2Jvd2VyIGluc3RhbGwnKTtcbiAgICBjb21tYW5kcy5wdXNoKGZ1bmN0aW9uIChjYikge1xuICAgICAgdGhpcy5ib3dlckluc3RhbGwobnVsbCwgbnVsbCwgY2IpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gIH1cblxuICBhc3NlcnQobXNnLmNvbW1hbmRzLmxlbmd0aCwgJ2luc3RhbGxEZXBlbmRlbmNpZXMgbmVlZHMgYXQgbGVhc3Qgb25lIG9mIGBucG1gLCBgYm93ZXJgIG9yIGB5YXJuYCB0byBydW4uJyk7XG5cbiAgaWYgKCFvcHRpb25zLnNraXBNZXNzYWdlKSB7XG4gICAgdmFyIHRwbFZhbHVlcyA9IF8uZXh0ZW5kKHtcbiAgICAgIHNraXBJbnN0YWxsOiBmYWxzZVxuICAgIH0sIHRoaXMub3B0aW9ucywge1xuICAgICAgY29tbWFuZHM6IGNoYWxrLnllbGxvdy5ib2xkKG1zZy5jb21tYW5kcy5qb2luKCcgJiYgJykpXG4gICAgfSk7XG4gICAgdGhpcy5sb2cobXNnLnRlbXBsYXRlKHRwbFZhbHVlcykpO1xuICB9XG5cbiAgYXN5bmMucGFyYWxsZWwoY29tbWFuZHMsIG9wdGlvbnMuY2FsbGJhY2sgfHwgXy5ub29wKTtcbn07XG5cbi8qKlxuICogUmVjZWl2ZXMgYSBsaXN0IG9mIGBjb21wb25lbnRzYCBhbmQgYW4gYG9wdGlvbnNgIG9iamVjdCB0byBpbnN0YWxsIHRocm91Z2ggYm93ZXIuXG4gKlxuICogVGhlIGluc3RhbGxhdGlvbiB3aWxsIGF1dG9tYXRpY2FsbHkgcnVuIGR1cmluZyB0aGUgcnVuIGxvb3AgYGluc3RhbGxgIHBoYXNlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBbY21wbnRdIENvbXBvbmVudHMgdG8gaW5zdGFsbFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBPcHRpb25zIHRvIHBhc3MgdG8gYGRhcmdzYCBhcyBhcmd1bWVudHNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYl1cbiAqIEBwYXJhbSB7T2JqZWN0fSBbc3Bhd25PcHRpb25zXSBPcHRpb25zIHRvIHBhc3MgYGNoaWxkX3Byb2Nlc3Muc3Bhd25gLlxuICovXG5cbmluc3RhbGwuYm93ZXJJbnN0YWxsID0gZnVuY3Rpb24gKGNtcG50LCBvcHRpb25zLCBjYiwgc3Bhd25PcHRpb25zKSB7XG4gIHJldHVybiB0aGlzLnJ1bkluc3RhbGwoJ2Jvd2VyJywgY21wbnQsIG9wdGlvbnMsIGNiLCBzcGF3bk9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBSZWNlaXZlcyBhIGxpc3Qgb2YgYHBhY2thZ2VzYCBhbmQgYW4gYG9wdGlvbnNgIG9iamVjdCB0byBpbnN0YWxsIHRocm91Z2ggbnBtLlxuICpcbiAqIFRoZSBpbnN0YWxsYXRpb24gd2lsbCBhdXRvbWF0aWNhbGx5IHJ1biBkdXJpbmcgdGhlIHJ1biBsb29wIGBpbnN0YWxsYCBwaGFzZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gW3BrZ3NdIFBhY2thZ2VzIHRvIGluc3RhbGxcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gT3B0aW9ucyB0byBwYXNzIHRvIGBkYXJnc2AgYXMgYXJndW1lbnRzXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2JdXG4gKiBAcGFyYW0ge09iamVjdH0gW3NwYXduT3B0aW9uc10gT3B0aW9ucyB0byBwYXNzIGBjaGlsZF9wcm9jZXNzLnNwYXduYC5cbiAqL1xuXG5pbnN0YWxsLm5wbUluc3RhbGwgPSBmdW5jdGlvbiAocGtncywgb3B0aW9ucywgY2IsIHNwYXduT3B0aW9ucykge1xuICByZXR1cm4gdGhpcy5ydW5JbnN0YWxsKCducG0nLCBwa2dzLCBvcHRpb25zLCBjYiwgc3Bhd25PcHRpb25zKTtcbn07XG4vKipcbiAqIFJlY2VpdmVzIGEgbGlzdCBvZiBgcGFja2FnZXNgIGFuZCBhbiBgb3B0aW9uc2Agb2JqZWN0IHRvIGluc3RhbGwgdGhyb3VnaCBucG0uXG4gKlxuICogVGhlIGluc3RhbGxhdGlvbiB3aWxsIGF1dG9tYXRpY2FsbHkgcnVuIGR1cmluZyB0aGUgcnVuIGxvb3AgYGluc3RhbGxgIHBoYXNlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBbcGtnc10gUGFja2FnZXMgdG8gaW5zdGFsbFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBPcHRpb25zIHRvIHBhc3MgdG8gYGRhcmdzYCBhcyBhcmd1bWVudHNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYl1cbiAqIEBwYXJhbSB7T2JqZWN0fSBbc3Bhd25PcHRpb25zXSBPcHRpb25zIHRvIHBhc3MgYGNoaWxkX3Byb2Nlc3Muc3Bhd25gLlxuICovXG5cbmluc3RhbGwueWFybkluc3RhbGwgPSBmdW5jdGlvbiAocGtncywgb3B0aW9ucywgY2IsIHNwYXduT3B0aW9ucykge1xuICByZXR1cm4gdGhpcy5ydW5JbnN0YWxsKCd5YXJuJywgcGtncywgb3B0aW9ucywgY2IsIHNwYXduT3B0aW9ucyk7XG59O1xuIl19