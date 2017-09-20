'use strict';
var util = require('util');
var fs = require('fs');
var path = require('path');
var events = require('events');
var chalk = require('chalk');
var _ = require('lodash');
var GroupedQueue = require('grouped-queue');
var escapeStrRe = require('escape-string-regexp');
var untildify = require('untildify');
var memFs = require('mem-fs');
var debug = require('debug')('yeoman:environment');
var Store = require('./store');
var resolver = require('./resolver');
var TerminalAdapter = require('./adapter');
/**
 * `Environment` object is responsible of handling the lifecyle and bootstrap
 * of generators in a specific environment (your app).
 *
 * It provides a high-level API to create and run generators, as well as further
 * tuning where and how a generator is resolved.
 *
 * An environment is created using a list of `arguments` and a Hash of
 * `options`. Usually, this is the list of arguments you get back from your CLI
 * options parser.
 *
 * An optional adapter can be passed to provide interaction in non-CLI environment
 * (e.g. IDE plugins), otherwise a `TerminalAdapter` is instantiated by default
 *
 * @constructor
 * @mixes env/resolver
 * @param {String|Array} args
 * @param {Object} opts
 * @param {TerminalAdapter} [adaper] - A TerminalAdapter instance or another object
 *                                     implementing this adapter interface. This is how
 *                                     you'd interface Yeoman with a GUI or an editor.
 */
var Environment = module.exports = function Environment(args, opts, adapter) {
    events.EventEmitter.call(this);
    args = args || [];
    this.arguments = Array.isArray(args) ? args : args.split(' ');
    this.options = opts || {};
    this.adapter = adapter || new TerminalAdapter();
    this.cwd = this.options.cwd || process.cwd();
    this.store = new Store();
    this.runLoop = new GroupedQueue(Environment.queues);
    this.sharedFs = memFs.create();
    // Each composed generator might set listeners on these shared resources. Let's make sure
    // Node won't complain about event listeners leaks.
    this.runLoop.setMaxListeners(0);
    this.sharedFs.setMaxListeners(0);
    this.lookups = ['.', 'generators', 'lib/generators'];
    this.aliases = [];
    this.alias(/^([^:]+)$/, '$1:app');
};
util.inherits(Environment, events.EventEmitter);
_.extend(Environment.prototype, resolver);
Environment.queues = [
    'initializing',
    'prompting',
    'configuring',
    'default',
    'writing',
    'conflicts',
    'install',
    'end'
];
/**
 * Error handler taking `err` instance of Error.
 *
 * The `error` event is emitted with the error object, if no `error` listener
 * is registered, then we throw the error.
 *
 * @param  {Object} err
 * @return {Error}  err
 */
Environment.prototype.error = function error(err) {
    err = err instanceof Error ? err : new Error(err);
    if (!this.emit('error', err)) {
        throw err;
    }
    return err;
};
/**
 * Outputs the general help and usage. Optionally, if generators have been
 * registered, the list of available generators is also displayed.
 *
 * @param {String} name
 */
Environment.prototype.help = function help(name) {
    name = name || 'init';
    var out = [
        'Usage: :binary: GENERATOR [args] [options]',
        '',
        'General options:',
        '  --help       # Print generator\'s options and usage',
        '  -f, --force  # Overwrite files that already exist',
        '',
        'Please choose a generator below.',
        ''
    ];
    var ns = this.namespaces();
    var groups = {};
    ns.forEach(function (namespace) {
        var base = namespace.split(':')[0];
        if (!groups[base]) {
            groups[base] = [];
        }
        groups[base].push(namespace);
    });
    Object.keys(groups).sort().forEach(function (key) {
        var group = groups[key];
        if (group.length >= 1) {
            out.push('', key.charAt(0).toUpperCase() + key.slice(1));
        }
        groups[key].forEach(function (ns) {
            out.push('  ' + ns);
        });
    });
    return out.join('\n').replace(/:binary:/g, name);
};
/**
 * Registers a specific `generator` to this environment. This generator is stored under
 * provided namespace, or a default namespace format if none if available.
 *
 * @param  {String} name      - Filepath to the a generator or a npm package name
 * @param  {String} namespace - Namespace under which register the generator (optional)
 * @return {String} namespace - Namespace assigned to the registered generator
 */
Environment.prototype.register = function register(name, namespace) {
    if (!_.isString(name)) {
        return this.error(new Error('You must provide a generator name to register.'));
    }
    var modulePath = this.resolveModulePath(name);
    namespace = namespace || this.namespace(modulePath);
    if (!namespace) {
        return this.error(new Error('Unable to determine namespace.'));
    }
    this.store.add(namespace, modulePath);
    debug('Registered %s (%s)', namespace, modulePath);
    return this;
};
/**
 * Register a stubbed generator to this environment. This method allow to register raw
 * functions under the provided namespace. `registerStub` will enforce the function passed
 * to extend the Base generator automatically.
 *
 * @param  {Function} Generator - A Generator constructor or a simple function
 * @param  {String}   namespace - Namespace under which register the generator
 * @return {this}
 */
Environment.prototype.registerStub = function registerStub(Generator, namespace) {
    if (!_.isFunction(Generator)) {
        return this.error(new Error('You must provide a stub function to register.'));
    }
    if (!_.isString(namespace)) {
        return this.error(new Error('You must provide a namespace to register.'));
    }
    this.store.add(namespace, Generator);
    return this;
};
/**
 * Returns the list of registered namespace.
 * @return {Array}
 */
Environment.prototype.namespaces = function namespaces() {
    return this.store.namespaces();
};
/**
 * Returns stored generators meta
 * @return {Object}
 */
Environment.prototype.getGeneratorsMeta = function getGeneratorsMeta() {
    return this.store.getGeneratorsMeta();
};
/**
 * Get registered generators names
 *
 * @return {Array}
 */
Environment.prototype.getGeneratorNames = function getGeneratorNames() {
    return _.uniq(Object.keys(this.getGeneratorsMeta()).map(Environment.namespaceToName));
};
/**
 * Get a single generator from the registered list of generators. The lookup is
 * based on generator's namespace, "walking up" the namespaces until a matching
 * is found. Eg. if an `angular:common` namespace is registered, and we try to
 * get `angular:common:all` then we get `angular:common` as a fallback (unless
 * an `angular:common:all` generator is registered).
 *
 * @param  {String} namespaceOrPath
 * @return {Generator|null} - the generator registered under the namespace
 */
Environment.prototype.get = function get(namespaceOrPath) {
    // Stop the recursive search if nothing is left
    if (!namespaceOrPath) {
        return;
    }
    var namespace = namespaceOrPath;
    // Legacy yeoman-generator `#hookFor()` function is passing the generator path as part
    // of the namespace. If we find a path delimiter in the namespace, then ignore the
    // last part of the namespace.
    var parts = namespaceOrPath.split(':');
    var maybePath = _.last(parts);
    if (parts.length > 1 && /[\/\\]/.test(maybePath)) {
        parts.pop();
        // We also want to remove the drive letter on windows
        if (maybePath.indexOf('\\') >= 0 && _.last(parts).length === 1) {
            parts.pop();
        }
        namespace = parts.join(':');
    }
    return this.store.get(namespace) ||
        this.store.get(this.alias(namespace)) ||
        // namespace is empty if namespaceOrPath contains a win32 absolute path of the form 'C:\path\to\generator'.
        // for this reason we pass namespaceOrPath to the getByPath function.
        this.getByPath(namespaceOrPath);
};
/**
 * Get a generator by path instead of namespace.
 * @param  {String} path
 * @return {Generator|null} - the generator found at the location
 */
Environment.prototype.getByPath = function (path) {
    if (fs.existsSync(path)) {
        var namespace = this.namespace(path);
        this.register(path, namespace);
        return this.get(namespace);
    }
};
/**
 * Create is the Generator factory. It takes a namespace to lookup and optional
 * hash of options, that lets you define `arguments` and `options` to
 * instantiate the generator with.
 *
 * An error is raised on invalid namespace.
 *
 * @param {String} namespace
 * @param {Object} options
 */
Environment.prototype.create = function create(namespace, options) {
    options = options || {};
    var Generator = this.get(namespace);
    if (!_.isFunction(Generator)) {
        return this.error(new Error(chalk.red('You don\’t seem to have a generator with the name “' + namespace + '” installed.') + '\n' +
            'But help is on the way:\n\n' +
            'You can see available generators via ' +
            chalk.yellow('npm search yeoman-generator') + ' or via ' + chalk.yellow('http://yeoman.io/generators/') + '. \n' +
            'Install them with ' + chalk.yellow('npm install generator-' + namespace) + '.\n\n' +
            'To see all your installed generators run ' + chalk.yellow('yo') + ' without any arguments. ' +
            'Adding the ' + chalk.yellow('--help') + ' option will also show subgenerators. \n\n' +
            'If ' + chalk.yellow('yo') + ' cannot find the generator, run ' + chalk.yellow('yo doctor') + ' to troubleshoot your system.'));
    }
    return this.instantiate(Generator, options);
};
/**
 * Instantiate a Generator with metadatas
 *
 * @param {String}       namespace
 * @param {Object}       options
 * @param {Array|String} options.arguments  Arguments to pass the instance
 * @param {Object}       options.options    Options to pass the instance
 */
Environment.prototype.instantiate = function instantiate(Generator, options) {
    options = options || {};
    var args = options.arguments || options.args || _.clone(this.arguments);
    args = Array.isArray(args) ? args : args.split(' ');
    var opts = options.options || _.clone(this.options);
    opts.env = this;
    opts.resolved = Generator.resolved || 'unknown';
    opts.namespace = Generator.namespace;
    return new Generator(args, opts);
};
/**
 * Tries to locate and run a specific generator. The lookup is done depending
 * on the provided arguments, options and the list of registered generators.
 *
 * When the environment was unable to resolve a generator, an error is raised.
 *
 * @param {String|Array} args
 * @param {Object}       options
 * @param {Function}     done
 */
Environment.prototype.run = function run(args, options, done) {
    args = args || this.arguments;
    if (typeof options === 'function') {
        done = options;
        options = this.options;
    }
    if (typeof args === 'function') {
        done = args;
        options = this.options;
        args = this.arguments;
    }
    args = Array.isArray(args) ? args : args.split(' ');
    options = options || this.options;
    var name = args.shift();
    if (!name) {
        return this.error(new Error('Must provide at least one argument, the generator namespace to invoke.'));
    }
    var generator = this.create(name, {
        args: args,
        options: options
    });
    if (generator instanceof Error) {
        return generator;
    }
    if (options.help) {
        return console.log(generator.help());
    }
    return generator.run(done);
};
/**
 * Given a String `filepath`, tries to figure out the relative namespace.
 *
 * ### Examples:
 *
 *     this.namespace('backbone/all/index.js');
 *     // => backbone:all
 *
 *     this.namespace('generator-backbone/model');
 *     // => backbone:model
 *
 *     this.namespace('backbone.js');
 *     // => backbone
 *
 *     this.namespace('generator-mocha/backbone/model/index.js');
 *     // => mocha:backbone:model
 *
 * @param {String} filepath
 */
Environment.prototype.namespace = function namespace(filepath) {
    if (!filepath) {
        throw new Error('Missing namespace');
    }
    // cleanup extension and normalize path for differents OS
    var ns = path.normalize(filepath.replace(new RegExp(escapeStrRe(path.extname(filepath)) + '$'), ''));
    // Sort lookups by length so biggest are removed first
    var lookups = _(this.lookups.concat(['..'])).map(path.normalize).sortBy('length').value().reverse();
    // if `ns` contains a lookup dir in its path, remove it.
    ns = lookups.reduce(function (ns, lookup) {
        // only match full directory (begin with leading slash or start of input, end with trailing slash)
        lookup = new RegExp('(?:\\\\|/|^)' + escapeStrRe(lookup) + '(?=\\\\|/)', 'g');
        return ns.replace(lookup, '');
    }, ns);
    var folders = ns.split(path.sep);
    var scope = _.findLast(folders, function (folder) {
        return folder.indexOf('@') === 0;
    });
    // cleanup `ns` from unwanted parts and then normalize slashes to `:`
    ns = ns
        .replace(/(.*generator-)/, '') // remove before `generator-`
        .replace(/[\/\\](index|main)$/, '') // remove `/index` or `/main`
        .replace(/^[\/\\]+/, '') // remove leading `/`
        .replace(/[\/\\]+/g, ':'); // replace slashes by `:`
    if (scope) {
        ns = scope + '/' + ns;
    }
    debug('Resolve namespaces for %s: %s', filepath, ns);
    return ns;
};
/**
 * Resolve a module path
 * @param  {String} moduleId - Filepath or module name
 * @return {String}          - The resolved path leading to the module
 */
Environment.prototype.resolveModulePath = function resolveModulePath(moduleId) {
    if (moduleId[0] === '.') {
        moduleId = path.resolve(moduleId);
    }
    if (path.extname(moduleId) === '') {
        moduleId += path.sep;
    }
    return require.resolve(untildify(moduleId));
};
/**
 * Make sure the Environment present expected methods if an old version is
 * passed to a Generator.
 * @param  {Environment} env
 * @return {Environment} The updated env
 */
Environment.enforceUpdate = function (env) {
    if (!env.adapter) {
        env.adapter = new TerminalAdapter();
    }
    if (!env.runLoop) {
        env.runLoop = new GroupedQueue([
            'initializing',
            'prompting',
            'configuring',
            'default',
            'writing',
            'conflicts',
            'install',
            'end'
        ]);
    }
    if (!env.sharedFs) {
        env.sharedFs = memFs.create();
    }
    return env;
};
/**
 * Factory method to create an environment instance. Take same parameters as the
 * Environment constructor.
 *
 * @see This method take the same arguments as {@link Environment} constructor
 *
 * @return {Environment} a new Environment instance
 */
Environment.createEnv = function (args, opts, adapter) {
    return new Environment(args, opts, adapter);
};
/**
 * Convert a generators namespace to its name
 *
 * @param  {String} namespace
 * @return {String}
 */
Environment.namespaceToName = function (namespace) {
    return namespace.split(':')[0];
};
/**
 * Expose the utilities on the module
 * @see {@link env/util}
 */
Environment.util = require('./util/util');
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZW52aXJvbm1lbnRcXGxpYlxcZW52aXJvbm1lbnQuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xceWVvbWFuLWVudmlyb25tZW50XFxsaWJcXGVudmlyb25tZW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQztBQUNiLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMzQixJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdkIsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNCLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQixJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0IsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzFCLElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM1QyxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUNsRCxJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDckMsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzlCLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ25ELElBQUksS0FBSyxHQUFHLE9BQU8s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dGVudCI6WyIndXNlIHN0cmljdCc7XG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG52YXIgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciBldmVudHMgPSByZXF1aXJlKCdldmVudHMnKTtcbnZhciBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG52YXIgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xudmFyIEdyb3VwZWRRdWV1ZSA9IHJlcXVpcmUoJ2dyb3VwZWQtcXVldWUnKTtcbnZhciBlc2NhcGVTdHJSZSA9IHJlcXVpcmUoJ2VzY2FwZS1zdHJpbmctcmVnZXhwJyk7XG52YXIgdW50aWxkaWZ5ID0gcmVxdWlyZSgndW50aWxkaWZ5Jyk7XG52YXIgbWVtRnMgPSByZXF1aXJlKCdtZW0tZnMnKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ3llb21hbjplbnZpcm9ubWVudCcpO1xudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZScpO1xudmFyIHJlc29sdmVyID0gcmVxdWlyZSgnLi9yZXNvbHZlcicpO1xudmFyIFRlcm1pbmFsQWRhcHRlciA9IHJlcXVpcmUoJy4vYWRhcHRlcicpO1xuXG4vKipcbiAqIGBFbnZpcm9ubWVudGAgb2JqZWN0IGlzIHJlc3BvbnNpYmxlIG9mIGhhbmRsaW5nIHRoZSBsaWZlY3lsZSBhbmQgYm9vdHN0cmFwXG4gKiBvZiBnZW5lcmF0b3JzIGluIGEgc3BlY2lmaWMgZW52aXJvbm1lbnQgKHlvdXIgYXBwKS5cbiAqXG4gKiBJdCBwcm92aWRlcyBhIGhpZ2gtbGV2ZWwgQVBJIHRvIGNyZWF0ZSBhbmQgcnVuIGdlbmVyYXRvcnMsIGFzIHdlbGwgYXMgZnVydGhlclxuICogdHVuaW5nIHdoZXJlIGFuZCBob3cgYSBnZW5lcmF0b3IgaXMgcmVzb2x2ZWQuXG4gKlxuICogQW4gZW52aXJvbm1lbnQgaXMgY3JlYXRlZCB1c2luZyBhIGxpc3Qgb2YgYGFyZ3VtZW50c2AgYW5kIGEgSGFzaCBvZlxuICogYG9wdGlvbnNgLiBVc3VhbGx5LCB0aGlzIGlzIHRoZSBsaXN0IG9mIGFyZ3VtZW50cyB5b3UgZ2V0IGJhY2sgZnJvbSB5b3VyIENMSVxuICogb3B0aW9ucyBwYXJzZXIuXG4gKlxuICogQW4gb3B0aW9uYWwgYWRhcHRlciBjYW4gYmUgcGFzc2VkIHRvIHByb3ZpZGUgaW50ZXJhY3Rpb24gaW4gbm9uLUNMSSBlbnZpcm9ubWVudFxuICogKGUuZy4gSURFIHBsdWdpbnMpLCBvdGhlcndpc2UgYSBgVGVybWluYWxBZGFwdGVyYCBpcyBpbnN0YW50aWF0ZWQgYnkgZGVmYXVsdFxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQG1peGVzIGVudi9yZXNvbHZlclxuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IGFyZ3NcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzXG4gKiBAcGFyYW0ge1Rlcm1pbmFsQWRhcHRlcn0gW2FkYXBlcl0gLSBBIFRlcm1pbmFsQWRhcHRlciBpbnN0YW5jZSBvciBhbm90aGVyIG9iamVjdFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1wbGVtZW50aW5nIHRoaXMgYWRhcHRlciBpbnRlcmZhY2UuIFRoaXMgaXMgaG93XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5b3UnZCBpbnRlcmZhY2UgWWVvbWFuIHdpdGggYSBHVUkgb3IgYW4gZWRpdG9yLlxuICovXG5cbnZhciBFbnZpcm9ubWVudCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gRW52aXJvbm1lbnQoYXJncywgb3B0cywgYWRhcHRlcikge1xuICBldmVudHMuRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cbiAgYXJncyA9IGFyZ3MgfHwgW107XG4gIHRoaXMuYXJndW1lbnRzID0gQXJyYXkuaXNBcnJheShhcmdzKSA/IGFyZ3MgOiBhcmdzLnNwbGl0KCcgJyk7XG4gIHRoaXMub3B0aW9ucyA9IG9wdHMgfHwge307XG4gIHRoaXMuYWRhcHRlciA9IGFkYXB0ZXIgfHwgbmV3IFRlcm1pbmFsQWRhcHRlcigpO1xuICB0aGlzLmN3ZCA9IHRoaXMub3B0aW9ucy5jd2QgfHwgcHJvY2Vzcy5jd2QoKTtcbiAgdGhpcy5zdG9yZSA9IG5ldyBTdG9yZSgpO1xuXG4gIHRoaXMucnVuTG9vcCA9IG5ldyBHcm91cGVkUXVldWUoRW52aXJvbm1lbnQucXVldWVzKTtcbiAgdGhpcy5zaGFyZWRGcyA9IG1lbUZzLmNyZWF0ZSgpO1xuXG4gIC8vIEVhY2ggY29tcG9zZWQgZ2VuZXJhdG9yIG1pZ2h0IHNldCBsaXN0ZW5lcnMgb24gdGhlc2Ugc2hhcmVkIHJlc291cmNlcy4gTGV0J3MgbWFrZSBzdXJlXG4gIC8vIE5vZGUgd29uJ3QgY29tcGxhaW4gYWJvdXQgZXZlbnQgbGlzdGVuZXJzIGxlYWtzLlxuICB0aGlzLnJ1bkxvb3Auc2V0TWF4TGlzdGVuZXJzKDApO1xuICB0aGlzLnNoYXJlZEZzLnNldE1heExpc3RlbmVycygwKTtcblxuICB0aGlzLmxvb2t1cHMgPSBbJy4nLCAnZ2VuZXJhdG9ycycsICdsaWIvZ2VuZXJhdG9ycyddO1xuICB0aGlzLmFsaWFzZXMgPSBbXTtcblxuICB0aGlzLmFsaWFzKC9eKFteOl0rKSQvLCAnJDE6YXBwJyk7XG59O1xuXG51dGlsLmluaGVyaXRzKEVudmlyb25tZW50LCBldmVudHMuRXZlbnRFbWl0dGVyKTtcbl8uZXh0ZW5kKEVudmlyb25tZW50LnByb3RvdHlwZSwgcmVzb2x2ZXIpO1xuXG5FbnZpcm9ubWVudC5xdWV1ZXMgPSBbXG4gICdpbml0aWFsaXppbmcnLFxuICAncHJvbXB0aW5nJyxcbiAgJ2NvbmZpZ3VyaW5nJyxcbiAgJ2RlZmF1bHQnLFxuICAnd3JpdGluZycsXG4gICdjb25mbGljdHMnLFxuICAnaW5zdGFsbCcsXG4gICdlbmQnXG5dO1xuXG4vKipcbiAqIEVycm9yIGhhbmRsZXIgdGFraW5nIGBlcnJgIGluc3RhbmNlIG9mIEVycm9yLlxuICpcbiAqIFRoZSBgZXJyb3JgIGV2ZW50IGlzIGVtaXR0ZWQgd2l0aCB0aGUgZXJyb3Igb2JqZWN0LCBpZiBubyBgZXJyb3JgIGxpc3RlbmVyXG4gKiBpcyByZWdpc3RlcmVkLCB0aGVuIHdlIHRocm93IHRoZSBlcnJvci5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IGVyclxuICogQHJldHVybiB7RXJyb3J9ICBlcnJcbiAqL1xuXG5FbnZpcm9ubWVudC5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiBlcnJvcihlcnIpIHtcbiAgZXJyID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIgOiBuZXcgRXJyb3IoZXJyKTtcblxuICBpZiAoIXRoaXMuZW1pdCgnZXJyb3InLCBlcnIpKSB7XG4gICAgdGhyb3cgZXJyO1xuICB9XG5cbiAgcmV0dXJuIGVycjtcbn07XG5cbi8qKlxuICogT3V0cHV0cyB0aGUgZ2VuZXJhbCBoZWxwIGFuZCB1c2FnZS4gT3B0aW9uYWxseSwgaWYgZ2VuZXJhdG9ycyBoYXZlIGJlZW5cbiAqIHJlZ2lzdGVyZWQsIHRoZSBsaXN0IG9mIGF2YWlsYWJsZSBnZW5lcmF0b3JzIGlzIGFsc28gZGlzcGxheWVkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKi9cblxuRW52aXJvbm1lbnQucHJvdG90eXBlLmhlbHAgPSBmdW5jdGlvbiBoZWxwKG5hbWUpIHtcbiAgbmFtZSA9IG5hbWUgfHwgJ2luaXQnO1xuXG4gIHZhciBvdXQgPSBbXG4gICAgJ1VzYWdlOiA6YmluYXJ5OiBHRU5FUkFUT1IgW2FyZ3NdIFtvcHRpb25zXScsXG4gICAgJycsXG4gICAgJ0dlbmVyYWwgb3B0aW9uczonLFxuICAgICcgIC0taGVscCAgICAgICAjIFByaW50IGdlbmVyYXRvclxcJ3Mgb3B0aW9ucyBhbmQgdXNhZ2UnLFxuICAgICcgIC1mLCAtLWZvcmNlICAjIE92ZXJ3cml0ZSBmaWxlcyB0aGF0IGFscmVhZHkgZXhpc3QnLFxuICAgICcnLFxuICAgICdQbGVhc2UgY2hvb3NlIGEgZ2VuZXJhdG9yIGJlbG93LicsXG4gICAgJydcbiAgXTtcblxuICB2YXIgbnMgPSB0aGlzLm5hbWVzcGFjZXMoKTtcblxuICB2YXIgZ3JvdXBzID0ge307XG4gIG5zLmZvckVhY2goZnVuY3Rpb24gKG5hbWVzcGFjZSkge1xuICAgIHZhciBiYXNlID0gbmFtZXNwYWNlLnNwbGl0KCc6JylbMF07XG5cbiAgICBpZiAoIWdyb3Vwc1tiYXNlXSkge1xuICAgICAgZ3JvdXBzW2Jhc2VdID0gW107XG4gICAgfVxuXG4gICAgZ3JvdXBzW2Jhc2VdLnB1c2gobmFtZXNwYWNlKTtcbiAgfSk7XG5cbiAgT2JqZWN0LmtleXMoZ3JvdXBzKS5zb3J0KCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgdmFyIGdyb3VwID0gZ3JvdXBzW2tleV07XG5cbiAgICBpZiAoZ3JvdXAubGVuZ3RoID49IDEpIHtcbiAgICAgIG91dC5wdXNoKCcnLCBrZXkuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBrZXkuc2xpY2UoMSkpO1xuICAgIH1cblxuICAgIGdyb3Vwc1trZXldLmZvckVhY2goZnVuY3Rpb24gKG5zKSB7XG4gICAgICBvdXQucHVzaCgnICAnICsgbnMpO1xuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gb3V0LmpvaW4oJ1xcbicpLnJlcGxhY2UoLzpiaW5hcnk6L2csIG5hbWUpO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYSBzcGVjaWZpYyBgZ2VuZXJhdG9yYCB0byB0aGlzIGVudmlyb25tZW50LiBUaGlzIGdlbmVyYXRvciBpcyBzdG9yZWQgdW5kZXJcbiAqIHByb3ZpZGVkIG5hbWVzcGFjZSwgb3IgYSBkZWZhdWx0IG5hbWVzcGFjZSBmb3JtYXQgaWYgbm9uZSBpZiBhdmFpbGFibGUuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBuYW1lICAgICAgLSBGaWxlcGF0aCB0byB0aGUgYSBnZW5lcmF0b3Igb3IgYSBucG0gcGFja2FnZSBuYW1lXG4gKiBAcGFyYW0gIHtTdHJpbmd9IG5hbWVzcGFjZSAtIE5hbWVzcGFjZSB1bmRlciB3aGljaCByZWdpc3RlciB0aGUgZ2VuZXJhdG9yIChvcHRpb25hbClcbiAqIEByZXR1cm4ge1N0cmluZ30gbmFtZXNwYWNlIC0gTmFtZXNwYWNlIGFzc2lnbmVkIHRvIHRoZSByZWdpc3RlcmVkIGdlbmVyYXRvclxuICovXG5cbkVudmlyb25tZW50LnByb3RvdHlwZS5yZWdpc3RlciA9IGZ1bmN0aW9uIHJlZ2lzdGVyKG5hbWUsIG5hbWVzcGFjZSkge1xuICBpZiAoIV8uaXNTdHJpbmcobmFtZSkpIHtcbiAgICByZXR1cm4gdGhpcy5lcnJvcihuZXcgRXJyb3IoJ1lvdSBtdXN0IHByb3ZpZGUgYSBnZW5lcmF0b3IgbmFtZSB0byByZWdpc3Rlci4nKSk7XG4gIH1cblxuICB2YXIgbW9kdWxlUGF0aCA9IHRoaXMucmVzb2x2ZU1vZHVsZVBhdGgobmFtZSk7XG4gIG5hbWVzcGFjZSA9IG5hbWVzcGFjZSB8fCB0aGlzLm5hbWVzcGFjZShtb2R1bGVQYXRoKTtcblxuICBpZiAoIW5hbWVzcGFjZSkge1xuICAgIHJldHVybiB0aGlzLmVycm9yKG5ldyBFcnJvcignVW5hYmxlIHRvIGRldGVybWluZSBuYW1lc3BhY2UuJykpO1xuICB9XG5cbiAgdGhpcy5zdG9yZS5hZGQobmFtZXNwYWNlLCBtb2R1bGVQYXRoKTtcblxuICBkZWJ1ZygnUmVnaXN0ZXJlZCAlcyAoJXMpJywgbmFtZXNwYWNlLCBtb2R1bGVQYXRoKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgc3R1YmJlZCBnZW5lcmF0b3IgdG8gdGhpcyBlbnZpcm9ubWVudC4gVGhpcyBtZXRob2QgYWxsb3cgdG8gcmVnaXN0ZXIgcmF3XG4gKiBmdW5jdGlvbnMgdW5kZXIgdGhlIHByb3ZpZGVkIG5hbWVzcGFjZS4gYHJlZ2lzdGVyU3R1YmAgd2lsbCBlbmZvcmNlIHRoZSBmdW5jdGlvbiBwYXNzZWRcbiAqIHRvIGV4dGVuZCB0aGUgQmFzZSBnZW5lcmF0b3IgYXV0b21hdGljYWxseS5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gR2VuZXJhdG9yIC0gQSBHZW5lcmF0b3IgY29uc3RydWN0b3Igb3IgYSBzaW1wbGUgZnVuY3Rpb25cbiAqIEBwYXJhbSAge1N0cmluZ30gICBuYW1lc3BhY2UgLSBOYW1lc3BhY2UgdW5kZXIgd2hpY2ggcmVnaXN0ZXIgdGhlIGdlbmVyYXRvclxuICogQHJldHVybiB7dGhpc31cbiAqL1xuXG5FbnZpcm9ubWVudC5wcm90b3R5cGUucmVnaXN0ZXJTdHViID0gZnVuY3Rpb24gcmVnaXN0ZXJTdHViKEdlbmVyYXRvciwgbmFtZXNwYWNlKSB7XG4gIGlmICghXy5pc0Z1bmN0aW9uKEdlbmVyYXRvcikpIHtcbiAgICByZXR1cm4gdGhpcy5lcnJvcihuZXcgRXJyb3IoJ1lvdSBtdXN0IHByb3ZpZGUgYSBzdHViIGZ1bmN0aW9uIHRvIHJlZ2lzdGVyLicpKTtcbiAgfVxuXG4gIGlmICghXy5pc1N0cmluZyhuYW1lc3BhY2UpKSB7XG4gICAgcmV0dXJuIHRoaXMuZXJyb3IobmV3IEVycm9yKCdZb3UgbXVzdCBwcm92aWRlIGEgbmFtZXNwYWNlIHRvIHJlZ2lzdGVyLicpKTtcbiAgfVxuXG4gIHRoaXMuc3RvcmUuYWRkKG5hbWVzcGFjZSwgR2VuZXJhdG9yKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgbGlzdCBvZiByZWdpc3RlcmVkIG5hbWVzcGFjZS5cbiAqIEByZXR1cm4ge0FycmF5fVxuICovXG5cbkVudmlyb25tZW50LnByb3RvdHlwZS5uYW1lc3BhY2VzID0gZnVuY3Rpb24gbmFtZXNwYWNlcygpIHtcbiAgcmV0dXJuIHRoaXMuc3RvcmUubmFtZXNwYWNlcygpO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHN0b3JlZCBnZW5lcmF0b3JzIG1ldGFcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuXG5FbnZpcm9ubWVudC5wcm90b3R5cGUuZ2V0R2VuZXJhdG9yc01ldGEgPSBmdW5jdGlvbiBnZXRHZW5lcmF0b3JzTWV0YSgpIHtcbiAgcmV0dXJuIHRoaXMuc3RvcmUuZ2V0R2VuZXJhdG9yc01ldGEoKTtcbn07XG5cbi8qKlxuICogR2V0IHJlZ2lzdGVyZWQgZ2VuZXJhdG9ycyBuYW1lc1xuICpcbiAqIEByZXR1cm4ge0FycmF5fVxuICovXG5cbkVudmlyb25tZW50LnByb3RvdHlwZS5nZXRHZW5lcmF0b3JOYW1lcyA9IGZ1bmN0aW9uIGdldEdlbmVyYXRvck5hbWVzKCkge1xuICByZXR1cm4gXy51bmlxKE9iamVjdC5rZXlzKHRoaXMuZ2V0R2VuZXJhdG9yc01ldGEoKSkubWFwKEVudmlyb25tZW50Lm5hbWVzcGFjZVRvTmFtZSkpO1xufTtcblxuLyoqXG4gKiBHZXQgYSBzaW5nbGUgZ2VuZXJhdG9yIGZyb20gdGhlIHJlZ2lzdGVyZWQgbGlzdCBvZiBnZW5lcmF0b3JzLiBUaGUgbG9va3VwIGlzXG4gKiBiYXNlZCBvbiBnZW5lcmF0b3IncyBuYW1lc3BhY2UsIFwid2Fsa2luZyB1cFwiIHRoZSBuYW1lc3BhY2VzIHVudGlsIGEgbWF0Y2hpbmdcbiAqIGlzIGZvdW5kLiBFZy4gaWYgYW4gYGFuZ3VsYXI6Y29tbW9uYCBuYW1lc3BhY2UgaXMgcmVnaXN0ZXJlZCwgYW5kIHdlIHRyeSB0b1xuICogZ2V0IGBhbmd1bGFyOmNvbW1vbjphbGxgIHRoZW4gd2UgZ2V0IGBhbmd1bGFyOmNvbW1vbmAgYXMgYSBmYWxsYmFjayAodW5sZXNzXG4gKiBhbiBgYW5ndWxhcjpjb21tb246YWxsYCBnZW5lcmF0b3IgaXMgcmVnaXN0ZXJlZCkuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBuYW1lc3BhY2VPclBhdGhcbiAqIEByZXR1cm4ge0dlbmVyYXRvcnxudWxsfSAtIHRoZSBnZW5lcmF0b3IgcmVnaXN0ZXJlZCB1bmRlciB0aGUgbmFtZXNwYWNlXG4gKi9cblxuRW52aXJvbm1lbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldChuYW1lc3BhY2VPclBhdGgpIHtcbiAgLy8gU3RvcCB0aGUgcmVjdXJzaXZlIHNlYXJjaCBpZiBub3RoaW5nIGlzIGxlZnRcbiAgaWYgKCFuYW1lc3BhY2VPclBhdGgpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgbmFtZXNwYWNlID0gbmFtZXNwYWNlT3JQYXRoO1xuXG4gIC8vIExlZ2FjeSB5ZW9tYW4tZ2VuZXJhdG9yIGAjaG9va0ZvcigpYCBmdW5jdGlvbiBpcyBwYXNzaW5nIHRoZSBnZW5lcmF0b3IgcGF0aCBhcyBwYXJ0XG4gIC8vIG9mIHRoZSBuYW1lc3BhY2UuIElmIHdlIGZpbmQgYSBwYXRoIGRlbGltaXRlciBpbiB0aGUgbmFtZXNwYWNlLCB0aGVuIGlnbm9yZSB0aGVcbiAgLy8gbGFzdCBwYXJ0IG9mIHRoZSBuYW1lc3BhY2UuXG4gIHZhciBwYXJ0cyA9IG5hbWVzcGFjZU9yUGF0aC5zcGxpdCgnOicpO1xuICB2YXIgbWF5YmVQYXRoID0gXy5sYXN0KHBhcnRzKTtcbiAgaWYgKHBhcnRzLmxlbmd0aCA+IDEgJiYgL1tcXC9cXFxcXS8udGVzdChtYXliZVBhdGgpKSB7XG4gICAgcGFydHMucG9wKCk7XG5cbiAgICAvLyBXZSBhbHNvIHdhbnQgdG8gcmVtb3ZlIHRoZSBkcml2ZSBsZXR0ZXIgb24gd2luZG93c1xuICAgIGlmIChtYXliZVBhdGguaW5kZXhPZignXFxcXCcpID49IDAgJiYgXy5sYXN0KHBhcnRzKS5sZW5ndGggPT09IDEpIHtcbiAgICAgIHBhcnRzLnBvcCgpO1xuICAgIH1cblxuICAgIG5hbWVzcGFjZSA9IHBhcnRzLmpvaW4oJzonKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLnN0b3JlLmdldChuYW1lc3BhY2UpIHx8XG4gICAgdGhpcy5zdG9yZS5nZXQodGhpcy5hbGlhcyhuYW1lc3BhY2UpKSB8fFxuICAgIC8vIG5hbWVzcGFjZSBpcyBlbXB0eSBpZiBuYW1lc3BhY2VPclBhdGggY29udGFpbnMgYSB3aW4zMiBhYnNvbHV0ZSBwYXRoIG9mIHRoZSBmb3JtICdDOlxccGF0aFxcdG9cXGdlbmVyYXRvcicuXG4gICAgLy8gZm9yIHRoaXMgcmVhc29uIHdlIHBhc3MgbmFtZXNwYWNlT3JQYXRoIHRvIHRoZSBnZXRCeVBhdGggZnVuY3Rpb24uXG4gICAgdGhpcy5nZXRCeVBhdGgobmFtZXNwYWNlT3JQYXRoKTtcbn07XG5cbi8qKlxuICogR2V0IGEgZ2VuZXJhdG9yIGJ5IHBhdGggaW5zdGVhZCBvZiBuYW1lc3BhY2UuXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0dlbmVyYXRvcnxudWxsfSAtIHRoZSBnZW5lcmF0b3IgZm91bmQgYXQgdGhlIGxvY2F0aW9uXG4gKi9cbkVudmlyb25tZW50LnByb3RvdHlwZS5nZXRCeVBhdGggPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAoZnMuZXhpc3RzU3luYyhwYXRoKSkge1xuICAgIHZhciBuYW1lc3BhY2UgPSB0aGlzLm5hbWVzcGFjZShwYXRoKTtcbiAgICB0aGlzLnJlZ2lzdGVyKHBhdGgsIG5hbWVzcGFjZSk7XG5cbiAgICByZXR1cm4gdGhpcy5nZXQobmFtZXNwYWNlKTtcbiAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGUgaXMgdGhlIEdlbmVyYXRvciBmYWN0b3J5LiBJdCB0YWtlcyBhIG5hbWVzcGFjZSB0byBsb29rdXAgYW5kIG9wdGlvbmFsXG4gKiBoYXNoIG9mIG9wdGlvbnMsIHRoYXQgbGV0cyB5b3UgZGVmaW5lIGBhcmd1bWVudHNgIGFuZCBgb3B0aW9uc2AgdG9cbiAqIGluc3RhbnRpYXRlIHRoZSBnZW5lcmF0b3Igd2l0aC5cbiAqXG4gKiBBbiBlcnJvciBpcyByYWlzZWQgb24gaW52YWxpZCBuYW1lc3BhY2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVzcGFjZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqL1xuXG5FbnZpcm9ubWVudC5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKG5hbWVzcGFjZSwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgR2VuZXJhdG9yID0gdGhpcy5nZXQobmFtZXNwYWNlKTtcblxuICBpZiAoIV8uaXNGdW5jdGlvbihHZW5lcmF0b3IpKSB7XG4gICAgcmV0dXJuIHRoaXMuZXJyb3IoXG4gICAgICBuZXcgRXJyb3IoXG4gICAgICAgIGNoYWxrLnJlZCgnWW91IGRvblxc4oCZdCBzZWVtIHRvIGhhdmUgYSBnZW5lcmF0b3Igd2l0aCB0aGUgbmFtZSDigJwnICsgbmFtZXNwYWNlICsgJ+KAnSBpbnN0YWxsZWQuJykgKyAnXFxuJyArXG4gICAgICAgICdCdXQgaGVscCBpcyBvbiB0aGUgd2F5OlxcblxcbicgK1xuICAgICAgICAnWW91IGNhbiBzZWUgYXZhaWxhYmxlIGdlbmVyYXRvcnMgdmlhICcgK1xuICAgICAgICBjaGFsay55ZWxsb3coJ25wbSBzZWFyY2ggeWVvbWFuLWdlbmVyYXRvcicpICsgJyBvciB2aWEgJyArIGNoYWxrLnllbGxvdygnaHR0cDovL3llb21hbi5pby9nZW5lcmF0b3JzLycpICsgJy4gXFxuJyArXG4gICAgICAgICdJbnN0YWxsIHRoZW0gd2l0aCAnICsgY2hhbGsueWVsbG93KCducG0gaW5zdGFsbCBnZW5lcmF0b3ItJyArIG5hbWVzcGFjZSkgKyAnLlxcblxcbicgK1xuICAgICAgICAnVG8gc2VlIGFsbCB5b3VyIGluc3RhbGxlZCBnZW5lcmF0b3JzIHJ1biAnICsgY2hhbGsueWVsbG93KCd5bycpICsgJyB3aXRob3V0IGFueSBhcmd1bWVudHMuICcgK1xuICAgICAgICAnQWRkaW5nIHRoZSAnICsgY2hhbGsueWVsbG93KCctLWhlbHAnKSArICcgb3B0aW9uIHdpbGwgYWxzbyBzaG93IHN1YmdlbmVyYXRvcnMuIFxcblxcbicgK1xuICAgICAgICAnSWYgJyArIGNoYWxrLnllbGxvdygneW8nKSArICcgY2Fubm90IGZpbmQgdGhlIGdlbmVyYXRvciwgcnVuICcgKyBjaGFsay55ZWxsb3coJ3lvIGRvY3RvcicpICsgJyB0byB0cm91Ymxlc2hvb3QgeW91ciBzeXN0ZW0uJ1xuICAgICAgKVxuICAgICk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5pbnN0YW50aWF0ZShHZW5lcmF0b3IsIG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBJbnN0YW50aWF0ZSBhIEdlbmVyYXRvciB3aXRoIG1ldGFkYXRhc1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSAgICAgICBuYW1lc3BhY2VcbiAqIEBwYXJhbSB7T2JqZWN0fSAgICAgICBvcHRpb25zXG4gKiBAcGFyYW0ge0FycmF5fFN0cmluZ30gb3B0aW9ucy5hcmd1bWVudHMgIEFyZ3VtZW50cyB0byBwYXNzIHRoZSBpbnN0YW5jZVxuICogQHBhcmFtIHtPYmplY3R9ICAgICAgIG9wdGlvbnMub3B0aW9ucyAgICBPcHRpb25zIHRvIHBhc3MgdGhlIGluc3RhbmNlXG4gKi9cblxuRW52aXJvbm1lbnQucHJvdG90eXBlLmluc3RhbnRpYXRlID0gZnVuY3Rpb24gaW5zdGFudGlhdGUoR2VuZXJhdG9yLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHZhciBhcmdzID0gb3B0aW9ucy5hcmd1bWVudHMgfHwgb3B0aW9ucy5hcmdzIHx8IF8uY2xvbmUodGhpcy5hcmd1bWVudHMpO1xuICBhcmdzID0gQXJyYXkuaXNBcnJheShhcmdzKSA/IGFyZ3MgOiBhcmdzLnNwbGl0KCcgJyk7XG5cbiAgdmFyIG9wdHMgPSBvcHRpb25zLm9wdGlvbnMgfHwgXy5jbG9uZSh0aGlzLm9wdGlvbnMpO1xuXG4gIG9wdHMuZW52ID0gdGhpcztcbiAgb3B0cy5yZXNvbHZlZCA9IEdlbmVyYXRvci5yZXNvbHZlZCB8fCAndW5rbm93bic7XG4gIG9wdHMubmFtZXNwYWNlID0gR2VuZXJhdG9yLm5hbWVzcGFjZTtcbiAgcmV0dXJuIG5ldyBHZW5lcmF0b3IoYXJncywgb3B0cyk7XG59O1xuXG4vKipcbiAqIFRyaWVzIHRvIGxvY2F0ZSBhbmQgcnVuIGEgc3BlY2lmaWMgZ2VuZXJhdG9yLiBUaGUgbG9va3VwIGlzIGRvbmUgZGVwZW5kaW5nXG4gKiBvbiB0aGUgcHJvdmlkZWQgYXJndW1lbnRzLCBvcHRpb25zIGFuZCB0aGUgbGlzdCBvZiByZWdpc3RlcmVkIGdlbmVyYXRvcnMuXG4gKlxuICogV2hlbiB0aGUgZW52aXJvbm1lbnQgd2FzIHVuYWJsZSB0byByZXNvbHZlIGEgZ2VuZXJhdG9yLCBhbiBlcnJvciBpcyByYWlzZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IGFyZ3NcbiAqIEBwYXJhbSB7T2JqZWN0fSAgICAgICBvcHRpb25zXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSAgICAgZG9uZVxuICovXG5cbkVudmlyb25tZW50LnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiBydW4oYXJncywgb3B0aW9ucywgZG9uZSkge1xuICBhcmdzID0gYXJncyB8fCB0aGlzLmFyZ3VtZW50cztcblxuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBkb25lID0gb3B0aW9ucztcbiAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBhcmdzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgZG9uZSA9IGFyZ3M7XG4gICAgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcbiAgICBhcmdzID0gdGhpcy5hcmd1bWVudHM7XG4gIH1cblxuICBhcmdzID0gQXJyYXkuaXNBcnJheShhcmdzKSA/IGFyZ3MgOiBhcmdzLnNwbGl0KCcgJyk7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHRoaXMub3B0aW9ucztcblxuICB2YXIgbmFtZSA9IGFyZ3Muc2hpZnQoKTtcbiAgaWYgKCFuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuZXJyb3IobmV3IEVycm9yKCdNdXN0IHByb3ZpZGUgYXQgbGVhc3Qgb25lIGFyZ3VtZW50LCB0aGUgZ2VuZXJhdG9yIG5hbWVzcGFjZSB0byBpbnZva2UuJykpO1xuICB9XG5cbiAgdmFyIGdlbmVyYXRvciA9IHRoaXMuY3JlYXRlKG5hbWUsIHtcbiAgICBhcmdzOiBhcmdzLFxuICAgIG9wdGlvbnM6IG9wdGlvbnNcbiAgfSk7XG5cbiAgaWYgKGdlbmVyYXRvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgcmV0dXJuIGdlbmVyYXRvcjtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmhlbHApIHtcbiAgICByZXR1cm4gY29uc29sZS5sb2coZ2VuZXJhdG9yLmhlbHAoKSk7XG4gIH1cblxuICByZXR1cm4gZ2VuZXJhdG9yLnJ1bihkb25lKTtcbn07XG5cbi8qKlxuICogR2l2ZW4gYSBTdHJpbmcgYGZpbGVwYXRoYCwgdHJpZXMgdG8gZmlndXJlIG91dCB0aGUgcmVsYXRpdmUgbmFtZXNwYWNlLlxuICpcbiAqICMjIyBFeGFtcGxlczpcbiAqXG4gKiAgICAgdGhpcy5uYW1lc3BhY2UoJ2JhY2tib25lL2FsbC9pbmRleC5qcycpO1xuICogICAgIC8vID0+IGJhY2tib25lOmFsbFxuICpcbiAqICAgICB0aGlzLm5hbWVzcGFjZSgnZ2VuZXJhdG9yLWJhY2tib25lL21vZGVsJyk7XG4gKiAgICAgLy8gPT4gYmFja2JvbmU6bW9kZWxcbiAqXG4gKiAgICAgdGhpcy5uYW1lc3BhY2UoJ2JhY2tib25lLmpzJyk7XG4gKiAgICAgLy8gPT4gYmFja2JvbmVcbiAqXG4gKiAgICAgdGhpcy5uYW1lc3BhY2UoJ2dlbmVyYXRvci1tb2NoYS9iYWNrYm9uZS9tb2RlbC9pbmRleC5qcycpO1xuICogICAgIC8vID0+IG1vY2hhOmJhY2tib25lOm1vZGVsXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpbGVwYXRoXG4gKi9cblxuRW52aXJvbm1lbnQucHJvdG90eXBlLm5hbWVzcGFjZSA9IGZ1bmN0aW9uIG5hbWVzcGFjZShmaWxlcGF0aCkge1xuICBpZiAoIWZpbGVwYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIG5hbWVzcGFjZScpO1xuICB9XG5cbiAgLy8gY2xlYW51cCBleHRlbnNpb24gYW5kIG5vcm1hbGl6ZSBwYXRoIGZvciBkaWZmZXJlbnRzIE9TXG4gIHZhciBucyA9IHBhdGgubm9ybWFsaXplKGZpbGVwYXRoLnJlcGxhY2UobmV3IFJlZ0V4cChlc2NhcGVTdHJSZShwYXRoLmV4dG5hbWUoZmlsZXBhdGgpKSArICckJyksICcnKSk7XG5cbiAgLy8gU29ydCBsb29rdXBzIGJ5IGxlbmd0aCBzbyBiaWdnZXN0IGFyZSByZW1vdmVkIGZpcnN0XG4gIHZhciBsb29rdXBzID0gXyh0aGlzLmxvb2t1cHMuY29uY2F0KFsnLi4nXSkpLm1hcChwYXRoLm5vcm1hbGl6ZSkuc29ydEJ5KCdsZW5ndGgnKS52YWx1ZSgpLnJldmVyc2UoKTtcblxuICAvLyBpZiBgbnNgIGNvbnRhaW5zIGEgbG9va3VwIGRpciBpbiBpdHMgcGF0aCwgcmVtb3ZlIGl0LlxuICBucyA9IGxvb2t1cHMucmVkdWNlKGZ1bmN0aW9uIChucywgbG9va3VwKSB7XG4gICAgLy8gb25seSBtYXRjaCBmdWxsIGRpcmVjdG9yeSAoYmVnaW4gd2l0aCBsZWFkaW5nIHNsYXNoIG9yIHN0YXJ0IG9mIGlucHV0LCBlbmQgd2l0aCB0cmFpbGluZyBzbGFzaClcbiAgICBsb29rdXAgPSBuZXcgUmVnRXhwKCcoPzpcXFxcXFxcXHwvfF4pJyArIGVzY2FwZVN0clJlKGxvb2t1cCkgKyAnKD89XFxcXFxcXFx8LyknLCAnZycpO1xuICAgIHJldHVybiBucy5yZXBsYWNlKGxvb2t1cCwgJycpO1xuICB9LCBucyk7XG5cbiAgdmFyIGZvbGRlcnMgPSBucy5zcGxpdChwYXRoLnNlcCk7XG4gIHZhciBzY29wZSA9IF8uZmluZExhc3QoZm9sZGVycywgZnVuY3Rpb24gKGZvbGRlcikge1xuICAgIHJldHVybiBmb2xkZXIuaW5kZXhPZignQCcpID09PSAwO1xuICB9KTtcblxuICAvLyBjbGVhbnVwIGBuc2AgZnJvbSB1bndhbnRlZCBwYXJ0cyBhbmQgdGhlbiBub3JtYWxpemUgc2xhc2hlcyB0byBgOmBcbiAgbnMgPSBuc1xuICAgIC5yZXBsYWNlKC8oLipnZW5lcmF0b3ItKS8sICcnKSAvLyByZW1vdmUgYmVmb3JlIGBnZW5lcmF0b3ItYFxuICAgIC5yZXBsYWNlKC9bXFwvXFxcXF0oaW5kZXh8bWFpbikkLywgJycpIC8vIHJlbW92ZSBgL2luZGV4YCBvciBgL21haW5gXG4gICAgLnJlcGxhY2UoL15bXFwvXFxcXF0rLywgJycpIC8vIHJlbW92ZSBsZWFkaW5nIGAvYFxuICAgIC5yZXBsYWNlKC9bXFwvXFxcXF0rL2csICc6Jyk7IC8vIHJlcGxhY2Ugc2xhc2hlcyBieSBgOmBcblxuICBpZiAoc2NvcGUpIHtcbiAgICBucyA9IHNjb3BlICsgJy8nICsgbnM7XG4gIH1cblxuICBkZWJ1ZygnUmVzb2x2ZSBuYW1lc3BhY2VzIGZvciAlczogJXMnLCBmaWxlcGF0aCwgbnMpO1xuXG4gIHJldHVybiBucztcbn07XG5cbi8qKlxuICogUmVzb2x2ZSBhIG1vZHVsZSBwYXRoXG4gKiBAcGFyYW0gIHtTdHJpbmd9IG1vZHVsZUlkIC0gRmlsZXBhdGggb3IgbW9kdWxlIG5hbWVcbiAqIEByZXR1cm4ge1N0cmluZ30gICAgICAgICAgLSBUaGUgcmVzb2x2ZWQgcGF0aCBsZWFkaW5nIHRvIHRoZSBtb2R1bGVcbiAqL1xuXG5FbnZpcm9ubWVudC5wcm90b3R5cGUucmVzb2x2ZU1vZHVsZVBhdGggPSBmdW5jdGlvbiByZXNvbHZlTW9kdWxlUGF0aChtb2R1bGVJZCkge1xuICBpZiAobW9kdWxlSWRbMF0gPT09ICcuJykge1xuICAgIG1vZHVsZUlkID0gcGF0aC5yZXNvbHZlKG1vZHVsZUlkKTtcbiAgfVxuICBpZiAocGF0aC5leHRuYW1lKG1vZHVsZUlkKSA9PT0gJycpIHtcbiAgICBtb2R1bGVJZCArPSBwYXRoLnNlcDtcbiAgfVxuXG4gIHJldHVybiByZXF1aXJlLnJlc29sdmUodW50aWxkaWZ5KG1vZHVsZUlkKSk7XG59O1xuXG4vKipcbiAqIE1ha2Ugc3VyZSB0aGUgRW52aXJvbm1lbnQgcHJlc2VudCBleHBlY3RlZCBtZXRob2RzIGlmIGFuIG9sZCB2ZXJzaW9uIGlzXG4gKiBwYXNzZWQgdG8gYSBHZW5lcmF0b3IuXG4gKiBAcGFyYW0gIHtFbnZpcm9ubWVudH0gZW52XG4gKiBAcmV0dXJuIHtFbnZpcm9ubWVudH0gVGhlIHVwZGF0ZWQgZW52XG4gKi9cblxuRW52aXJvbm1lbnQuZW5mb3JjZVVwZGF0ZSA9IGZ1bmN0aW9uIChlbnYpIHtcbiAgaWYgKCFlbnYuYWRhcHRlcikge1xuICAgIGVudi5hZGFwdGVyID0gbmV3IFRlcm1pbmFsQWRhcHRlcigpO1xuICB9XG5cbiAgaWYgKCFlbnYucnVuTG9vcCkge1xuICAgIGVudi5ydW5Mb29wID0gbmV3IEdyb3VwZWRRdWV1ZShbXG4gICAgICAnaW5pdGlhbGl6aW5nJyxcbiAgICAgICdwcm9tcHRpbmcnLFxuICAgICAgJ2NvbmZpZ3VyaW5nJyxcbiAgICAgICdkZWZhdWx0JyxcbiAgICAgICd3cml0aW5nJyxcbiAgICAgICdjb25mbGljdHMnLFxuICAgICAgJ2luc3RhbGwnLFxuICAgICAgJ2VuZCdcbiAgICBdKTtcbiAgfVxuXG4gIGlmICghZW52LnNoYXJlZEZzKSB7XG4gICAgZW52LnNoYXJlZEZzID0gbWVtRnMuY3JlYXRlKCk7XG4gIH1cblxuICByZXR1cm4gZW52O1xufTtcblxuLyoqXG4gKiBGYWN0b3J5IG1ldGhvZCB0byBjcmVhdGUgYW4gZW52aXJvbm1lbnQgaW5zdGFuY2UuIFRha2Ugc2FtZSBwYXJhbWV0ZXJzIGFzIHRoZVxuICogRW52aXJvbm1lbnQgY29uc3RydWN0b3IuXG4gKlxuICogQHNlZSBUaGlzIG1ldGhvZCB0YWtlIHRoZSBzYW1lIGFyZ3VtZW50cyBhcyB7QGxpbmsgRW52aXJvbm1lbnR9IGNvbnN0cnVjdG9yXG4gKlxuICogQHJldHVybiB7RW52aXJvbm1lbnR9IGEgbmV3IEVudmlyb25tZW50IGluc3RhbmNlXG4gKi9cblxuRW52aXJvbm1lbnQuY3JlYXRlRW52ID0gZnVuY3Rpb24gKGFyZ3MsIG9wdHMsIGFkYXB0ZXIpIHtcbiAgcmV0dXJuIG5ldyBFbnZpcm9ubWVudChhcmdzLCBvcHRzLCBhZGFwdGVyKTtcbn07XG5cbi8qKlxuICogQ29udmVydCBhIGdlbmVyYXRvcnMgbmFtZXNwYWNlIHRvIGl0cyBuYW1lXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBuYW1lc3BhY2VcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXG5FbnZpcm9ubWVudC5uYW1lc3BhY2VUb05hbWUgPSBmdW5jdGlvbiAobmFtZXNwYWNlKSB7XG4gIHJldHVybiBuYW1lc3BhY2Uuc3BsaXQoJzonKVswXTtcbn07XG5cbi8qKlxuICogRXhwb3NlIHRoZSB1dGlsaXRpZXMgb24gdGhlIG1vZHVsZVxuICogQHNlZSB7QGxpbmsgZW52L3V0aWx9XG4gKi9cblxuRW52aXJvbm1lbnQudXRpbCA9IHJlcXVpcmUoJy4vdXRpbC91dGlsJyk7XG4iXX0=