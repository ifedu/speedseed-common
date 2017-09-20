'use strict';
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var globby = require('globby');
var debug = require('debug')('yeoman:environment');
var win32 = process.platform === 'win32';
/**
 * @mixin
 * @alias env/resolver
 */
var resolver = module.exports;
/**
 * Search for generators and their sub generators.
 *
 * A generator is a `:lookup/:name/index.js` file placed inside an npm package.
 *
 * Defaults lookups are:
 *   - ./
 *   - generators/
 *   - lib/generators/
 *
 * So this index file `node_modules/generator-dummy/lib/generators/yo/index.js` would be
 * registered as `dummy:yo` generator.
 *
 * @param {function} cb - Callback called once the lookup is done. Take err as first
 *                        parameter.
 */
resolver.lookup = function (cb) {
    var generatorsModules = this.findGeneratorsIn(this.getNpmPaths());
    var patterns = [];
    this.lookups.forEach(function (lookup) {
        generatorsModules.forEach(function (modulePath) {
            patterns.push(path.join(modulePath, lookup));
        });
    });
    patterns.forEach(function (pattern) {
        globby.sync('*/index.js', { cwd: pattern }).forEach(function (filename) {
            this._tryRegistering(path.join(pattern, filename));
        }, this);
    }, this);
    if (_.isFunction(cb)) {
        return cb(null);
    }
};
/**
 * Search npm for every available generators.
 * Generators are npm packages who's name start with `generator-` and who're placed in the
 * top level `node_module` path. They can be installed globally or locally.
 *
 * @param {Array}  List of search paths
 * @return {Array} List of the generator modules path
 */
resolver.findGeneratorsIn = function (searchPaths) {
    var modules = [];
    searchPaths.forEach(function (root) {
        if (!root) {
            return;
        }
        modules = globby.sync([
            'generator-*',
            '@*/generator-*'
        ], { cwd: root }).map(function (match) {
            return path.join(root, match);
        }).concat(modules);
    });
    return modules;
};
/**
 * Try registering a Generator to this environment.
 * @private
 * @param  {String} generatorReference A generator reference, usually a file path.
 */
resolver._tryRegistering = function (generatorReference) {
    var namespace;
    var realPath = fs.realpathSync(generatorReference);
    try {
        debug('found %s, trying to register', generatorReference);
        if (realPath !== generatorReference) {
            namespace = this.namespace(generatorReference);
        }
        this.register(realPath, namespace);
    }
    catch (e) {
        console.error('Unable to register %s (Error: %s)', generatorReference, e.message);
    }
};
/**
 * Get the npm lookup directories (`node_modules/`)
 * @return {Array} lookup paths
 */
resolver.getNpmPaths = function () {
    var paths = [];
    // Add NVM prefix directory
    if (process.env.NVM_PATH) {
        paths.push(path.join(path.dirname(process.env.NVM_PATH), 'node_modules'));
    }
    // Adding global npm directories
    // We tried using npm to get the global modules path, but it haven't work out
    // because of bugs in the parseable implementation of `ls` command and mostly
    // performance issues. So, we go with our best bet for now.
    if (process.env.NODE_PATH) {
        paths = _.compact(process.env.NODE_PATH.split(path.delimiter)).concat(paths);
    }
    // global node_modules should be 4 or 2 directory up this one (most of the time)
    paths.push(path.join(__dirname, '../../../..'));
    paths.push(path.join(__dirname, '../..'));
    // adds support for generator resolving when yeoman-generator has been linked
    if (process.argv[1]) {
        paths.push(path.join(path.dirname(process.argv[1]), '../..'));
    }
    // Default paths for each system
    if (win32) {
        paths.push(path.join(process.env.APPDATA, 'npm/node_modules'));
    }
    else {
        paths.push('/usr/lib/node_modules');
        paths.push('/usr/local/lib/node_modules');
    }
    // Walk up the CWD and add `node_modules/` folder lookup on each level
    process.cwd().split(path.sep).forEach(function (part, i, parts) {
        var lookup = path.join.apply(path, parts.slice(0, i + 1).concat(['node_modules']));
        if (!win32) {
            lookup = '/' + lookup;
        }
        paths.push(lookup);
    });
    return paths.reverse();
};
/**
 * Get or create an alias.
 *
 * Alias allows the `get()` and `lookup()` methods to search in alternate
 * filepath for a given namespaces. It's used for example to map `generator-*`
 * npm package to their namespace equivalent (without the generator- prefix),
 * or to default a single namespace like `angular` to `angular:app` or
 * `angular:all`.
 *
 * Given a single argument, this method acts as a getter. When both name and
 * value are provided, acts as a setter and registers that new alias.
 *
 * If multiple alias are defined, then the replacement is recursive, replacing
 * each alias in reverse order.
 *
 * An alias can be a single String or a Regular Expression. The finding is done
 * based on .match().
 *
 * @param {String|RegExp} match
 * @param {String} value
 *
 * @example
 *
 *     env.alias(/^([a-zA-Z0-9:\*]+)$/, 'generator-$1');
 *     env.alias(/^([^:]+)$/, '$1:app');
 *     env.alias(/^([^:]+)$/, '$1:all');
 *     env.alias('foo');
 *     // => generator-foo:all
 */
resolver.alias = function alias(match, value) {
    if (match && value) {
        this.aliases.push({
            match: match instanceof RegExp ? match : new RegExp('^' + match + '$'),
            value: value
        });
        return this;
    }
    var aliases = this.aliases.slice(0).reverse();
    return aliases.reduce(function (res, alias) {
        if (!alias.match.test(res)) {
            return res;
        }
        return res.replace(alias.match, alias.value);
    }, match);
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZW52aXJvbm1lbnRcXGxpYlxccmVzb2x2ZXIuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xceWVvbWFuLWVudmlyb25tZW50XFxsaWJcXHJlc29sdmVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQztBQUNiLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMzQixJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdkIsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzFCLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQixJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUVuRCxJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQztBQUV6Qzs7O0dBR0c7QUFDSCxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBRTlCOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUVILFFBQVEsQ0FBQyxNQUFNLEdBQUcsVUFBVSxFQUFFO0lBQzVCLElBQUksaUJBQWlCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQ2xFLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztJQUVsQixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFV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Q0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRTlDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxFQUFFLEtBQUs7UUFDeEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUNiLENBQUM7UUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDWixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG52YXIgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG52YXIgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xudmFyIGdsb2JieSA9IHJlcXVpcmUoJ2dsb2JieScpO1xudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgneWVvbWFuOmVudmlyb25tZW50Jyk7XG5cbnZhciB3aW4zMiA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMic7XG5cbi8qKlxuICogQG1peGluXG4gKiBAYWxpYXMgZW52L3Jlc29sdmVyXG4gKi9cbnZhciByZXNvbHZlciA9IG1vZHVsZS5leHBvcnRzO1xuXG4vKipcbiAqIFNlYXJjaCBmb3IgZ2VuZXJhdG9ycyBhbmQgdGhlaXIgc3ViIGdlbmVyYXRvcnMuXG4gKlxuICogQSBnZW5lcmF0b3IgaXMgYSBgOmxvb2t1cC86bmFtZS9pbmRleC5qc2AgZmlsZSBwbGFjZWQgaW5zaWRlIGFuIG5wbSBwYWNrYWdlLlxuICpcbiAqIERlZmF1bHRzIGxvb2t1cHMgYXJlOlxuICogICAtIC4vXG4gKiAgIC0gZ2VuZXJhdG9ycy9cbiAqICAgLSBsaWIvZ2VuZXJhdG9ycy9cbiAqXG4gKiBTbyB0aGlzIGluZGV4IGZpbGUgYG5vZGVfbW9kdWxlcy9nZW5lcmF0b3ItZHVtbXkvbGliL2dlbmVyYXRvcnMveW8vaW5kZXguanNgIHdvdWxkIGJlXG4gKiByZWdpc3RlcmVkIGFzIGBkdW1teTp5b2AgZ2VuZXJhdG9yLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNiIC0gQ2FsbGJhY2sgY2FsbGVkIG9uY2UgdGhlIGxvb2t1cCBpcyBkb25lLiBUYWtlIGVyciBhcyBmaXJzdFxuICogICAgICAgICAgICAgICAgICAgICAgICBwYXJhbWV0ZXIuXG4gKi9cblxucmVzb2x2ZXIubG9va3VwID0gZnVuY3Rpb24gKGNiKSB7XG4gIHZhciBnZW5lcmF0b3JzTW9kdWxlcyA9IHRoaXMuZmluZEdlbmVyYXRvcnNJbih0aGlzLmdldE5wbVBhdGhzKCkpO1xuICB2YXIgcGF0dGVybnMgPSBbXTtcblxuICB0aGlzLmxvb2t1cHMuZm9yRWFjaChmdW5jdGlvbiAobG9va3VwKSB7XG4gICAgZ2VuZXJhdG9yc01vZHVsZXMuZm9yRWFjaChmdW5jdGlvbiAobW9kdWxlUGF0aCkge1xuICAgICAgcGF0dGVybnMucHVzaChwYXRoLmpvaW4obW9kdWxlUGF0aCwgbG9va3VwKSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHBhdHRlcm5zLmZvckVhY2goZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICBnbG9iYnkuc3luYygnKi9pbmRleC5qcycsIHsgY3dkOiBwYXR0ZXJuIH0pLmZvckVhY2goZnVuY3Rpb24gKGZpbGVuYW1lKSB7XG4gICAgICB0aGlzLl90cnlSZWdpc3RlcmluZyhwYXRoLmpvaW4ocGF0dGVybiwgZmlsZW5hbWUpKTtcbiAgICB9LCB0aGlzKTtcbiAgfSwgdGhpcyk7XG5cbiAgaWYgKF8uaXNGdW5jdGlvbihjYikpIHtcbiAgICByZXR1cm4gY2IobnVsbCk7XG4gIH1cbn07XG5cbi8qKlxuICogU2VhcmNoIG5wbSBmb3IgZXZlcnkgYXZhaWxhYmxlIGdlbmVyYXRvcnMuXG4gKiBHZW5lcmF0b3JzIGFyZSBucG0gcGFja2FnZXMgd2hvJ3MgbmFtZSBzdGFydCB3aXRoIGBnZW5lcmF0b3ItYCBhbmQgd2hvJ3JlIHBsYWNlZCBpbiB0aGVcbiAqIHRvcCBsZXZlbCBgbm9kZV9tb2R1bGVgIHBhdGguIFRoZXkgY2FuIGJlIGluc3RhbGxlZCBnbG9iYWxseSBvciBsb2NhbGx5LlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9ICBMaXN0IG9mIHNlYXJjaCBwYXRoc1xuICogQHJldHVybiB7QXJyYXl9IExpc3Qgb2YgdGhlIGdlbmVyYXRvciBtb2R1bGVzIHBhdGhcbiAqL1xuXG5yZXNvbHZlci5maW5kR2VuZXJhdG9yc0luID0gZnVuY3Rpb24gKHNlYXJjaFBhdGhzKSB7XG4gIHZhciBtb2R1bGVzID0gW107XG5cbiAgc2VhcmNoUGF0aHMuZm9yRWFjaChmdW5jdGlvbiAocm9vdCkge1xuICAgIGlmICghcm9vdCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG1vZHVsZXMgPSBnbG9iYnkuc3luYyhbXG4gICAgICAnZ2VuZXJhdG9yLSonLFxuICAgICAgJ0AqL2dlbmVyYXRvci0qJ1xuICAgIF0sIHsgY3dkOiByb290IH0pLm1hcChmdW5jdGlvbiAobWF0Y2gpIHtcbiAgICAgIHJldHVybiBwYXRoLmpvaW4ocm9vdCwgbWF0Y2gpO1xuICAgIH0pLmNvbmNhdChtb2R1bGVzKTtcbiAgfSk7XG5cbiAgcmV0dXJuIG1vZHVsZXM7XG59O1xuXG4vKipcbiAqIFRyeSByZWdpc3RlcmluZyBhIEdlbmVyYXRvciB0byB0aGlzIGVudmlyb25tZW50LlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSAge1N0cmluZ30gZ2VuZXJhdG9yUmVmZXJlbmNlIEEgZ2VuZXJhdG9yIHJlZmVyZW5jZSwgdXN1YWxseSBhIGZpbGUgcGF0aC5cbiAqL1xuXG5yZXNvbHZlci5fdHJ5UmVnaXN0ZXJpbmcgPSBmdW5jdGlvbiAoZ2VuZXJhdG9yUmVmZXJlbmNlKSB7XG4gIHZhciBuYW1lc3BhY2U7XG4gIHZhciByZWFsUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhnZW5lcmF0b3JSZWZlcmVuY2UpO1xuXG4gIHRyeSB7XG4gICAgZGVidWcoJ2ZvdW5kICVzLCB0cnlpbmcgdG8gcmVnaXN0ZXInLCBnZW5lcmF0b3JSZWZlcmVuY2UpO1xuXG4gICAgaWYgKHJlYWxQYXRoICE9PSBnZW5lcmF0b3JSZWZlcmVuY2UpIHtcbiAgICAgIG5hbWVzcGFjZSA9IHRoaXMubmFtZXNwYWNlKGdlbmVyYXRvclJlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgdGhpcy5yZWdpc3RlcihyZWFsUGF0aCwgbmFtZXNwYWNlKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byByZWdpc3RlciAlcyAoRXJyb3I6ICVzKScsIGdlbmVyYXRvclJlZmVyZW5jZSwgZS5tZXNzYWdlKTtcbiAgfVxufTtcblxuLyoqXG4gKiBHZXQgdGhlIG5wbSBsb29rdXAgZGlyZWN0b3JpZXMgKGBub2RlX21vZHVsZXMvYClcbiAqIEByZXR1cm4ge0FycmF5fSBsb29rdXAgcGF0aHNcbiAqL1xucmVzb2x2ZXIuZ2V0TnBtUGF0aHMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwYXRocyA9IFtdO1xuXG4gIC8vIEFkZCBOVk0gcHJlZml4IGRpcmVjdG9yeVxuICBpZiAocHJvY2Vzcy5lbnYuTlZNX1BBVEgpIHtcbiAgICBwYXRocy5wdXNoKHBhdGguam9pbihwYXRoLmRpcm5hbWUocHJvY2Vzcy5lbnYuTlZNX1BBVEgpLCAnbm9kZV9tb2R1bGVzJykpO1xuICB9XG5cbiAgLy8gQWRkaW5nIGdsb2JhbCBucG0gZGlyZWN0b3JpZXNcbiAgLy8gV2UgdHJpZWQgdXNpbmcgbnBtIHRvIGdldCB0aGUgZ2xvYmFsIG1vZHVsZXMgcGF0aCwgYnV0IGl0IGhhdmVuJ3Qgd29yayBvdXRcbiAgLy8gYmVjYXVzZSBvZiBidWdzIGluIHRoZSBwYXJzZWFibGUgaW1wbGVtZW50YXRpb24gb2YgYGxzYCBjb21tYW5kIGFuZCBtb3N0bHlcbiAgLy8gcGVyZm9ybWFuY2UgaXNzdWVzLiBTbywgd2UgZ28gd2l0aCBvdXIgYmVzdCBiZXQgZm9yIG5vdy5cbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfUEFUSCkge1xuICAgIHBhdGhzID0gXy5jb21wYWN0KHByb2Nlc3MuZW52Lk5PREVfUEFUSC5zcGxpdChwYXRoLmRlbGltaXRlcikpLmNvbmNhdChwYXRocyk7XG4gIH1cblxuICAvLyBnbG9iYWwgbm9kZV9tb2R1bGVzIHNob3VsZCBiZSA0IG9yIDIgZGlyZWN0b3J5IHVwIHRoaXMgb25lIChtb3N0IG9mIHRoZSB0aW1lKVxuICBwYXRocy5wdXNoKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLicpKTtcbiAgcGF0aHMucHVzaChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4nKSk7XG5cbiAgLy8gYWRkcyBzdXBwb3J0IGZvciBnZW5lcmF0b3IgcmVzb2x2aW5nIHdoZW4geWVvbWFuLWdlbmVyYXRvciBoYXMgYmVlbiBsaW5rZWRcbiAgaWYgKHByb2Nlc3MuYXJndlsxXSkge1xuICAgIHBhdGhzLnB1c2gocGF0aC5qb2luKHBhdGguZGlybmFtZShwcm9jZXNzLmFyZ3ZbMV0pLCAnLi4vLi4nKSk7XG4gIH1cblxuICAvLyBEZWZhdWx0IHBhdGhzIGZvciBlYWNoIHN5c3RlbVxuICBpZiAod2luMzIpIHtcbiAgICBwYXRocy5wdXNoKHBhdGguam9pbihwcm9jZXNzLmVudi5BUFBEQVRBLCAnbnBtL25vZGVfbW9kdWxlcycpKTtcbiAgfSBlbHNlIHtcbiAgICBwYXRocy5wdXNoKCcvdXNyL2xpYi9ub2RlX21vZHVsZXMnKTtcbiAgICBwYXRocy5wdXNoKCcvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMnKTtcbiAgfVxuXG4gIC8vIFdhbGsgdXAgdGhlIENXRCBhbmQgYWRkIGBub2RlX21vZHVsZXMvYCBmb2xkZXIgbG9va3VwIG9uIGVhY2ggbGV2ZWxcbiAgcHJvY2Vzcy5jd2QoKS5zcGxpdChwYXRoLnNlcCkuZm9yRWFjaChmdW5jdGlvbiAocGFydCwgaSwgcGFydHMpIHtcbiAgICB2YXIgbG9va3VwID0gcGF0aC5qb2luLmFwcGx5KHBhdGgsIHBhcnRzLnNsaWNlKDAsIGkgKyAxKS5jb25jYXQoWydub2RlX21vZHVsZXMnXSkpO1xuXG4gICAgaWYgKCF3aW4zMikge1xuICAgICAgbG9va3VwID0gJy8nICsgbG9va3VwO1xuICAgIH1cblxuICAgIHBhdGhzLnB1c2gobG9va3VwKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHBhdGhzLnJldmVyc2UoKTtcbn07XG5cbi8qKlxuICogR2V0IG9yIGNyZWF0ZSBhbiBhbGlhcy5cbiAqXG4gKiBBbGlhcyBhbGxvd3MgdGhlIGBnZXQoKWAgYW5kIGBsb29rdXAoKWAgbWV0aG9kcyB0byBzZWFyY2ggaW4gYWx0ZXJuYXRlXG4gKiBmaWxlcGF0aCBmb3IgYSBnaXZlbiBuYW1lc3BhY2VzLiBJdCdzIHVzZWQgZm9yIGV4YW1wbGUgdG8gbWFwIGBnZW5lcmF0b3ItKmBcbiAqIG5wbSBwYWNrYWdlIHRvIHRoZWlyIG5hbWVzcGFjZSBlcXVpdmFsZW50ICh3aXRob3V0IHRoZSBnZW5lcmF0b3ItIHByZWZpeCksXG4gKiBvciB0byBkZWZhdWx0IGEgc2luZ2xlIG5hbWVzcGFjZSBsaWtlIGBhbmd1bGFyYCB0byBgYW5ndWxhcjphcHBgIG9yXG4gKiBgYW5ndWxhcjphbGxgLlxuICpcbiAqIEdpdmVuIGEgc2luZ2xlIGFyZ3VtZW50LCB0aGlzIG1ldGhvZCBhY3RzIGFzIGEgZ2V0dGVyLiBXaGVuIGJvdGggbmFtZSBhbmRcbiAqIHZhbHVlIGFyZSBwcm92aWRlZCwgYWN0cyBhcyBhIHNldHRlciBhbmQgcmVnaXN0ZXJzIHRoYXQgbmV3IGFsaWFzLlxuICpcbiAqIElmIG11bHRpcGxlIGFsaWFzIGFyZSBkZWZpbmVkLCB0aGVuIHRoZSByZXBsYWNlbWVudCBpcyByZWN1cnNpdmUsIHJlcGxhY2luZ1xuICogZWFjaCBhbGlhcyBpbiByZXZlcnNlIG9yZGVyLlxuICpcbiAqIEFuIGFsaWFzIGNhbiBiZSBhIHNpbmdsZSBTdHJpbmcgb3IgYSBSZWd1bGFyIEV4cHJlc3Npb24uIFRoZSBmaW5kaW5nIGlzIGRvbmVcbiAqIGJhc2VkIG9uIC5tYXRjaCgpLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfFJlZ0V4cH0gbWF0Y2hcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZVxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogICAgIGVudi5hbGlhcygvXihbYS16QS1aMC05OlxcKl0rKSQvLCAnZ2VuZXJhdG9yLSQxJyk7XG4gKiAgICAgZW52LmFsaWFzKC9eKFteOl0rKSQvLCAnJDE6YXBwJyk7XG4gKiAgICAgZW52LmFsaWFzKC9eKFteOl0rKSQvLCAnJDE6YWxsJyk7XG4gKiAgICAgZW52LmFsaWFzKCdmb28nKTtcbiAqICAgICAvLyA9PiBnZW5lcmF0b3ItZm9vOmFsbFxuICovXG5cbnJlc29sdmVyLmFsaWFzID0gZnVuY3Rpb24gYWxpYXMobWF0Y2gsIHZhbHVlKSB7XG4gIGlmIChtYXRjaCAmJiB2YWx1ZSkge1xuICAgIHRoaXMuYWxpYXNlcy5wdXNoKHtcbiAgICAgIG1hdGNoOiBtYXRjaCBpbnN0YW5jZW9mIFJlZ0V4cCA/IG1hdGNoIDogbmV3IFJlZ0V4cCgnXicgKyBtYXRjaCArICckJyksXG4gICAgICB2YWx1ZTogdmFsdWVcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBhbGlhc2VzID0gdGhpcy5hbGlhc2VzLnNsaWNlKDApLnJldmVyc2UoKTtcblxuICByZXR1cm4gYWxpYXNlcy5yZWR1Y2UoZnVuY3Rpb24gKHJlcywgYWxpYXMpIHtcbiAgICBpZiAoIWFsaWFzLm1hdGNoLnRlc3QocmVzKSkge1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzLnJlcGxhY2UoYWxpYXMubWF0Y2gsIGFsaWFzLnZhbHVlKTtcbiAgfSwgbWF0Y2gpO1xufTtcbiJdfQ==