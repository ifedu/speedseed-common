'use strict';
var util = require('util');
var path = require('path');
var events = require('events');
var assert = require('assert');
var _ = require('lodash');
var findUp = require('find-up');
var readPkgUp = require('read-pkg-up');
var chalk = require('chalk');
var mkdirp = require('mkdirp');
var minimist = require('minimist');
var runAsync = require('run-async');
var through = require('through2');
var userHome = require('user-home');
var FileEditor = require('mem-fs-editor');
var pathIsAbsolute = require('path-is-absolute');
var pathExists = require('path-exists');
var debug = require('debug')('yeoman:generator');
var Conflicter = require('./util/conflicter');
var Storage = require('./util/storage');
var promptSuggestion = require('./util/prompt-suggestion');
var EMPTY = '@@_YEOMAN_EMPTY_MARKER_@@';
/**
 * The `Base` class provides the common API shared by all generators.
 * It define options, arguments, file, prompt, log, API, etc.
 *
 * It mixes into its prototype all the methods found in the `actions/` mixins.
 *
 * Every generator should extend this base class.
 *
 * @constructor
 * @mixes actions/install
 * @mixes actions/spawn-command
 * @mixes actions/user
 * @mixes actions/help
 * @mixes nodejs/EventEmitter
 *
 * @param {String|Array} args
 * @param {Object} options
 *
 * @property {Object}   env         - the current Environment being run
 * @property {Object}   args        - Provide arguments at initialization
 * @property {String}   resolved    - the path to the current generator
 * @property {String}   description - Used in `--help` output
 * @property {String}   appname     - The application name
 * @property {Storage}  config      - `.yo-rc` config file manager
 * @property {Object}   fs          - An instance of {@link https://github.com/SBoudrias/mem-fs-editor Mem-fs-editor}
 * @property {Function} log         - Output content through Interface Adapter
 *
 * @example
 * const Generator = require('yeoman-generator');
 * module.exports = class extends Generator {
 *   writing() {
 *     this.fs.write(this.destinationPath('index.js'), 'const foo = 1;');
 *   }
 * };
 */
var Base = module.exports = function (args, options) {
    events.EventEmitter.call(this);
    if (!Array.isArray(args)) {
        options = args;
        args = [];
    }
    this.options = options || {};
    this._initOptions = _.clone(options);
    this._args = args || [];
    this._options = {};
    this._arguments = [];
    this._composedWith = [];
    this._transformStreams = [];
    this.option('help', {
        type: Boolean,
        alias: 'h',
        description: 'Print the generator\'s options and usage'
    });
    this.option('skip-cache', {
        type: Boolean,
        description: 'Do not remember prompt answers',
        default: false
    });
    this.option('skip-install', {
        type: Boolean,
        description: 'Do not automatically install dependencies',
        default: false
    });
    // Checks required paramaters
    assert(this.options.env, 'You must provide the environment object. Use env#create() to create a new generator.');
    assert(this.options.resolved, 'You must provide the resolved path value. Use env#create() to create a new generator.');
    this.env = this.options.env;
    this.resolved = this.options.resolved;
    // Ensure the environment support features this yeoman-generator version require.
    require('yeoman-environment').enforceUpdate(this.env);
    this.description = this.description || '';
    this.async = function () {
        return function () { };
    };
    this.fs = FileEditor.create(this.env.sharedFs);
    this.conflicter = new Conflicter(this.env.adapter, this.options.force);
    // Mirror the adapter log method on the generator.
    //
    // example:
    // this.log('foo');
    // this.log.error('bar');
    this.log = this.env.adapter.log;
    // Determine the app root
    this.contextRoot = this.env.cwd;
    var rootPath = findUp.sync('.yo-rc.json', {
        cwd: this.env.cwd
    });
    rootPath = rootPath ? path.dirname(rootPath) : this.env.cwd;
    if (rootPath !== this.env.cwd) {
        this.log([
            '',
            'Just found a `.yo-rc.json` in a parent directory.',
            'Setting the project root at: ' + rootPath
        ].join('\n'));
        this.destinationRoot(rootPath);
    }
    this.appname = this.determineAppname();
    this.config = this._getStorage();
    this._globalConfig = this._getGlobalStorage();
    // Ensure source/destination path, can be configured from subclasses
    this.sourceRoot(path.join(path.dirname(this.resolved), 'templates'));
};
util.inherits(Base, events.EventEmitter);
// Mixin the actions modules
_.extend(Base.prototype, require('./actions/install'));
_.extend(Base.prototype, require('./actions/help'));
_.extend(Base.prototype, require('./actions/spawn-command'));
Base.prototype.user = require('./actions/user');
/*
 * Prompt user to answer questions. The signature of this method is the same as {@link https://github.com/SBoudrias/Inquirer.js Inquirer.js}
 *
 * On top of the Inquirer.js API, you can provide a `{cache: true}` property for
 * every question descriptor. When set to true, Yeoman will store/fetch the
 * user's answers as defaults.
 *
 * @param  {array} questions  Array of question descriptor objects. See {@link https://github.com/SBoudrias/Inquirer.js/blob/master/README.md Documentation}
 * @return {Promise}
 */
Base.prototype.prompt = function (questions) {
    questions = promptSuggestion.prefillQuestions(this._globalConfig, questions);
    questions = promptSuggestion.prefillQuestions(this.config, questions);
    return this.env.adapter.prompt(questions).then(function (answers) {
        if (!this.options['skip-cache']) {
            promptSuggestion.storeAnswers(this._globalConfig, questions, answers, false);
            promptSuggestion.storeAnswers(this.config, questions, answers, true);
        }
        return answers;
    }.bind(this));
};
/**
 * Adds an option to the set of generator expected options, only used to
 * generate generator usage. By default, generators get all the cli options
 * parsed by nopt as a `this.options` hash object.
 *
 * ### Options:
 *
 *   - `description` Description for the option
 *   - `type` Either Boolean, String or Number
 *   - `alias` Option name alias (example `-h` and --help`)
 *   - `default` Default value
 *   - `hide` Boolean whether to hide from help
 *
 * @param {String} name
 * @param {Object} config
 */
Base.prototype.option = function (name, config) {
    config = config || {};
    // Alias default to defaults for backward compatibility.
    if ('defaults' in config) {
        config.default = config.defaults;
    }
    config.description = config.description || config.desc;
    _.defaults(config, {
        name: name,
        description: 'Description for ' + name,
        type: Boolean,
        hide: false
    });
    // Check whether boolean option is invalid (starts with no-)
    var boolOptionRegex = /^no-/;
    if (config.type === Boolean && name.match(boolOptionRegex)) {
        var simpleName = name.replace(boolOptionRegex, '');
        return this.emit('error', new Error([
            "Option name " + chalk.yellow(name) + " cannot start with " + chalk.red('no-') + "\n",
            "Option name prefixed by " + chalk.yellow('--no') + " are parsed as implicit",
            " boolean. To use " + chalk.yellow('--' + name) + " as an option, use\n",
            chalk.cyan("  this.option('" + simpleName + "', {type: Boolean})")
        ].join('')));
    }
    if (this._options[name] === null || this._options[name] === undefined) {
        this._options[name] = config;
    }
    this.parseOptions();
    return this;
};
/**
 * Adds an argument to the class and creates an attribute getter for it.
 *
 * Arguments are different from options in several aspects. The first one
 * is how they are parsed from the command line, arguments are retrieved
 * based on their position.
 *
 * Besides, arguments are used inside your code as a property (`this.argument`),
 * while options are all kept in a hash (`this.options`).
 *
 * ### Options:
 *
 *   - `description` Description for the argument
 *   - `required` Boolean whether it is required
 *   - `optional` Boolean whether it is optional
 *   - `type` String, Number, Array, or Object
 *   - `default` Default value for this argument
 *
 * @param {String} name
 * @param {Object} config
 */
Base.prototype.argument = function (name, config) {
    config = config || {};
    // Alias default to defaults for backward compatibility.
    if ('defaults' in config) {
        config.default = config.defaults;
    }
    config.description = config.description || config.desc;
    _.defaults(config, {
        name: name,
        required: config.default === null || config.default === undefined,
        type: String
    });
    this._arguments.push(config);
    this.parseOptions();
    return this;
};
Base.prototype.parseOptions = function () {
    var minimistDef = {
        string: [],
        boolean: [],
        alias: {},
        default: {}
    };
    _.each(this._options, function (option) {
        if (option.type === Boolean) {
            minimistDef.boolean.push(option.name);
            if (!('default' in option) && !option.required) {
                minimistDef.default[option.name] = EMPTY;
            }
        }
        else {
            minimistDef.string.push(option.name);
        }
        if (option.alias) {
            minimistDef.alias[option.alias] = option.name;
        }
        // Only apply default values if we don't already have a value injected from
        // the runner
        if (option.name in this._initOptions) {
            minimistDef.default[option.name] = this._initOptions[option.name];
        }
        else if (option.alias && option.alias in this._initOptions) {
            minimistDef.default[option.name] = this._initOptions[option.alias];
        }
        else if ('default' in option) {
            minimistDef.default[option.name] = option.default;
        }
    }.bind(this));
    var parsedOpts = minimist(this._args, minimistDef);
    // Parse options to the desired type
    _.each(parsedOpts, function (option, name) {
        // Manually set value as undefined if it should be.
        if (option === EMPTY) {
            parsedOpts[name] = undefined;
            return;
        }
        if (this._options[name] && option !== undefined) {
            parsedOpts[name] = this._options[name].type(option);
        }
    }.bind(this));
    // Parse positional arguments to valid options
    this._arguments.forEach(function (config, index) {
        var value;
        if (index >= parsedOpts._.length) {
            if (config.name in this._initOptions) {
                value = this._initOptions[config.name];
            }
            else if ('default' in config) {
                value = config.default;
            }
            else {
                return;
            }
        }
        else if (config.type === Array) {
            value = parsedOpts._.slice(index, parsedOpts._.length);
        }
        else {
            value = config.type(parsedOpts._[index]);
        }
        parsedOpts[config.name] = value;
    }.bind(this));
    // Make the parsed options available to the instance
    _.extend(this.options, parsedOpts);
    this.args = this.arguments = parsedOpts._;
    // Make sure required args are all present
    this.checkRequiredArgs();
};
Base.prototype.checkRequiredArgs = function () {
    // If the help option was provided, we don't want to check for required
    // arguments, since we're only going to print the help message anyway.
    if (this.options.help) {
        return;
    }
    // Bail early if it's not possible to have a missing required arg
    if (this.args.length > this._arguments.length) {
        return;
    }
    this._arguments.forEach(function (config, position) {
        // If the help option was not provided, check whether the argument was
        // required, and whether a value was provided.
        if (config.required && position >= this.args.length) {
            return this.emit('error', new Error('Did not provide required argument ' + chalk.bold(config.name) + '!'));
        }
    }, this);
};
/**
 * Runs the generator, scheduling prototype methods on a run queue. Method names
 * will determine the order each method is run. Methods without special names
 * will run in the default queue.
 *
 * Any method named `constructor` and any methods prefixed by a `_` won't be scheduled.
 *
 * You can also supply the arguments for the method to be invoked. If none are
 * provided, the same values used to initialize the invoker are used to
 * initialize the invoked.
 *
 * @param {Function} [cb]
 */
Base.prototype.run = function (cb) {
    cb = cb || function () { };
    var self = this;
    this._running = true;
    this.emit('run');
    var methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
    var validMethods = methods.filter(methodIsValid);
    assert(validMethods.length, 'This Generator is empty. Add at least one method for it to run.');
    this.env.runLoop.once('end', function () {
        this.emit('end');
        cb();
    }.bind(this));
    // Ensure a prototype method is a candidate run by default
    function methodIsValid(name) {
        return name.charAt(0) !== '_' && name !== 'constructor';
    }
    function addMethod(method, methodName, queueName) {
        queueName = queueName || 'default';
        debug('Queueing ' + methodName + ' in ' + queueName);
        self.env.runLoop.add(queueName, function (completed) {
            debug('Running ' + methodName);
            self.emit('method:' + methodName);
            runAsync(function () {
                self.async = function () {
                    return this.async();
                }.bind(this);
                return method.apply(self, self.args);
            })().then(completed).catch(function (err) {
                debug('An error occured while running ' + methodName, err);
                // Ensure we emit the error event outside the promise context so it won't be
                // swallowed when there's no listeners.
                setImmediate(function () {
                    self.emit('error', err);
                    cb(err);
                });
            });
        });
    }
    function addInQueue(name) {
        var item = Object.getPrototypeOf(self)[name];
        var queueName = self.env.runLoop.queueNames.indexOf(name) === -1 ? null : name;
        // Name points to a function; run it!
        if (_.isFunction(item)) {
            return addMethod(item, name, queueName);
        }
        // Not a queue hash; stop
        if (!queueName) {
            return;
        }
        // Run each queue items
        _.each(item, function (method, methodName) {
            if (!_.isFunction(method) || !methodIsValid(methodName)) {
                return;
            }
            addMethod(method, methodName, queueName);
        });
    }
    validMethods.forEach(addInQueue);
    var writeFiles = function () {
        this.env.runLoop.add('conflicts', this._writeFiles.bind(this), {
            once: 'write memory fs to disk'
        });
    }.bind(this);
    this.env.sharedFs.on('change', writeFiles);
    writeFiles();
    // Add the default conflicts handling
    this.env.runLoop.add('conflicts', function (done) {
        this.conflicter.resolve(function (err) {
            if (err) {
                this.emit('error', err);
            }
            done();
        }.bind(this));
    }.bind(this));
    _.invokeMap(this._composedWith, 'run');
    return this;
};
/**
 * Compose this generator with another one.
 * @param  {String} namespace  The generator namespace to compose with
 * @param  {Object} options    The options passed to the Generator
 * @param  {Object} [settings] Settings hash on the composition relation
 * @param  {string} [settings.local]        Path to a locally stored generator
 * @param  {String} [settings.link="weak"]  If "strong", the composition will occured
 *                                          even when the composition is initialized by
 *                                          the end user
 * @return {this}
 *
 * @example <caption>Using a peerDependency generator</caption>
 * this.composeWith('bootstrap', { sass: true });
 *
 * @example <caption>Using a direct dependency generator</caption>
 * this.composeWith(require.resolve('generator-bootstrap/app/main.js'), { sass: true });
 */
Base.prototype.composeWith = function (modulePath, options) {
    var generator;
    options = options || {};
    // Pass down the default options so they're correclty mirrored down the chain.
    options = _.extend({
        skipInstall: this.options.skipInstall,
        'skip-install': this.options.skipInstall,
        skipCache: this.options.skipCache,
        'skip-cache': this.options.skipCache
    }, options);
    try {
        var Generator = require(modulePath); // eslint-disable-line import/no-dynamic-require
        Generator.resolved = require.resolve(modulePath);
        Generator.namespace = this.env.namespace(modulePath);
        generator = this.env.instantiate(Generator, {
            options: options,
            arguments: options.arguments
        });
    }
    catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            generator = this.env.create(modulePath, {
                options: options,
                arguments: options.arguments
            });
        }
        else {
            throw err;
        }
    }
    if (this._running) {
        generator.run();
    }
    else {
        this._composedWith.push(generator);
    }
    return this;
};
/**
 * Determine the root generator name (the one who's extending Base).
 * @return {String} The name of the root generator
 */
Base.prototype.rootGeneratorName = function () {
    var pkg = readPkgUp.sync({ cwd: this.resolved }).pkg;
    return pkg ? pkg.name : '*';
};
/**
 * Determine the root generator version (the one who's extending Base).
 * @return {String} The version of the root generator
 */
Base.prototype.rootGeneratorVersion = function () {
    var pkg = readPkgUp.sync({ cwd: this.resolved }).pkg;
    return pkg ? pkg.version : '0.0.0';
};
/**
 * Return a storage instance.
 * @return {Storage} Generator storage
 * @private
 */
Base.prototype._getStorage = function () {
    var storePath = path.join(this.destinationRoot(), '.yo-rc.json');
    return new Storage(this.rootGeneratorName(), this.fs, storePath);
};
/**
 * Setup a globalConfig storage instance.
 * @return {Storage} Global config storage
 * @private
 */
Base.prototype._getGlobalStorage = function () {
    var storePath = path.join(userHome, '.yo-rc-global.json');
    var storeName = util.format('%s:%s', this.rootGeneratorName(), this.rootGeneratorVersion());
    return new Storage(storeName, this.fs, storePath);
};
/**
 * Change the generator destination root directory.
 * This path is used to find storage, when using a file system helper method (like
 * `this.write` and `this.copy`)
 * @param  {String} rootPath new destination root path
 * @return {String}          destination root path
 */
Base.prototype.destinationRoot = function (rootPath) {
    if (_.isString(rootPath)) {
        this._destinationRoot = path.resolve(rootPath);
        if (!pathExists.sync(rootPath)) {
            mkdirp.sync(rootPath);
        }
        process.chdir(rootPath);
        this.env.cwd = rootPath;
        // Reset the storage
        this.config = this._getStorage();
    }
    return this._destinationRoot || this.env.cwd;
};
/**
 * Change the generator source root directory.
 * This path is used by multiples file system methods like (`this.read` and `this.copy`)
 * @param  {String} rootPath new source root path
 * @return {String}          source root path
 */
Base.prototype.sourceRoot = function (rootPath) {
    if (_.isString(rootPath)) {
        this._sourceRoot = path.resolve(rootPath);
    }
    return this._sourceRoot;
};
/**
 * Join a path to the source root.
 * @param  {...String} path
 * @return {String}    joined path
 */
Base.prototype.templatePath = function () {
    var filepath = path.join.apply(path, arguments);
    if (!pathIsAbsolute(filepath)) {
        filepath = path.join(this.sourceRoot(), filepath);
    }
    return filepath;
};
/**
 * Join a path to the destination root.
 * @param  {...String} path
 * @return {String}    joined path
 */
Base.prototype.destinationPath = function () {
    var filepath = path.join.apply(path, arguments);
    if (!pathIsAbsolute(filepath)) {
        filepath = path.join(this.destinationRoot(), filepath);
    }
    return filepath;
};
/**
 * Determines the name of the application.
 *
 * First checks for name in bower.json.
 * Then checks for name in package.json.
 * Finally defaults to the name of the current directory.
 * @return {String} The name of the application
 */
Base.prototype.determineAppname = function () {
    var appname = this.fs.readJSON(this.destinationPath('bower.json'), {}).name;
    if (!appname) {
        appname = this.fs.readJSON(this.destinationPath('package.json'), {}).name;
    }
    if (!appname) {
        appname = path.basename(this.destinationRoot());
    }
    return appname.replace(/[^\w\s]+?/g, ' ');
};
/**
 * Add a transform stream to the commit stream.
 *
 * Most usually, these transform stream will be Gulp plugins.
 *
 * @param  {stream.Transform|stream.Transform[]} stream An array of Transform stream
 * or a single one.
 * @return {this}
 */
Base.prototype.registerTransformStream = function (streams) {
    assert(streams, 'expected to receive a transform stream as parameter');
    if (!_.isArray(streams)) {
        streams = [streams];
    }
    this._transformStreams = this._transformStreams.concat(streams);
    return this;
};
/**
 * Write memory fs file to disk and logging results
 * @param {Function} done - callback once files are written
 */
Base.prototype._writeFiles = function (done) {
    var self = this;
    var conflictChecker = through.obj(function (file, enc, cb) {
        var stream = this;
        // If the file has no state requiring action, move on
        if (file.state === null) {
            return cb();
        }
        // Config file should not be processed by the conflicter. Just pass through
        var filename = path.basename(file.path);
        if (filename === '.yo-rc.json' || filename === '.yo-rc-global.json') {
            this.push(file);
            return cb();
        }
        self.conflicter.checkForCollision(file.path, file.contents, function (err, status) {
            if (err) {
                cb(err);
                return;
            }
            if (status === 'skip') {
                delete file.state;
            }
            else {
                stream.push(file);
            }
            cb();
        });
        self.conflicter.resolve();
    });
    var transformStreams = this._transformStreams.concat([conflictChecker]);
    this.fs.commit(transformStreams, function () {
        done();
    });
};
/**
 * Extend the Generator class to create a new one inherithing the base one. This
 * method is useful if your environment do not suport the ES6 classes.
 * @param  {Object} protoProps  Prototype properties (available on the instances)
 * @param  {Object} staticProps Static properties (available on the contructor)
 * @return {Object}             New sub class
 * @example
 * var Generator = require('yeoman-generator');
 * module.exports = Generator.extend({
 *   writing: function () {}
 *   // ...
 * });
 */
Base.extend = require('class-extend').extend;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZ2VuZXJhdG9yXFxsaWJcXGluZGV4LmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXHllb21hbi1nZW5lcmF0b3JcXGxpYlxcaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDO0FBQ2IsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNCLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMzQixJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0IsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9CLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMxQixJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEMsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3ZDLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QixJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0IsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ25DLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNwQyxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbEMsSUFBSSxRQUFR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TSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIGV2ZW50cyA9IHJlcXVpcmUoJ2V2ZW50cycpO1xudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpO1xudmFyIF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcbnZhciBmaW5kVXAgPSByZXF1aXJlKCdmaW5kLXVwJyk7XG52YXIgcmVhZFBrZ1VwID0gcmVxdWlyZSgncmVhZC1wa2ctdXAnKTtcbnZhciBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG52YXIgbWtkaXJwID0gcmVxdWlyZSgnbWtkaXJwJyk7XG52YXIgbWluaW1pc3QgPSByZXF1aXJlKCdtaW5pbWlzdCcpO1xudmFyIHJ1bkFzeW5jID0gcmVxdWlyZSgncnVuLWFzeW5jJyk7XG52YXIgdGhyb3VnaCA9IHJlcXVpcmUoJ3Rocm91Z2gyJyk7XG52YXIgdXNlckhvbWUgPSByZXF1aXJlKCd1c2VyLWhvbWUnKTtcbnZhciBGaWxlRWRpdG9yID0gcmVxdWlyZSgnbWVtLWZzLWVkaXRvcicpO1xudmFyIHBhdGhJc0Fic29sdXRlID0gcmVxdWlyZSgncGF0aC1pcy1hYnNvbHV0ZScpO1xudmFyIHBhdGhFeGlzdHMgPSByZXF1aXJlKCdwYXRoLWV4aXN0cycpO1xudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgneWVvbWFuOmdlbmVyYXRvcicpO1xudmFyIENvbmZsaWN0ZXIgPSByZXF1aXJlKCcuL3V0aWwvY29uZmxpY3RlcicpO1xudmFyIFN0b3JhZ2UgPSByZXF1aXJlKCcuL3V0aWwvc3RvcmFnZScpO1xudmFyIHByb21wdFN1Z2dlc3Rpb24gPSByZXF1aXJlKCcuL3V0aWwvcHJvbXB0LXN1Z2dlc3Rpb24nKTtcblxudmFyIEVNUFRZID0gJ0BAX1lFT01BTl9FTVBUWV9NQVJLRVJfQEAnO1xuXG4vKipcbiAqIFRoZSBgQmFzZWAgY2xhc3MgcHJvdmlkZXMgdGhlIGNvbW1vbiBBUEkgc2hhcmVkIGJ5IGFsbCBnZW5lcmF0b3JzLlxuICogSXQgZGVmaW5lIG9wdGlvbnMsIGFyZ3VtZW50cywgZmlsZSwgcHJvbXB0LCBsb2csIEFQSSwgZXRjLlxuICpcbiAqIEl0IG1peGVzIGludG8gaXRzIHByb3RvdHlwZSBhbGwgdGhlIG1ldGhvZHMgZm91bmQgaW4gdGhlIGBhY3Rpb25zL2AgbWl4aW5zLlxuICpcbiAqIEV2ZXJ5IGdlbmVyYXRvciBzaG91bGQgZXh0ZW5kIHRoaXMgYmFzZSBjbGFzcy5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBtaXhlcyBhY3Rpb25zL2luc3RhbGxcbiAqIEBtaXhlcyBhY3Rpb25zL3NwYXduLWNvbW1hbmRcbiAqIEBtaXhlcyBhY3Rpb25zL3VzZXJcbiAqIEBtaXhlcyBhY3Rpb25zL2hlbHBcbiAqIEBtaXhlcyBub2RlanMvRXZlbnRFbWl0dGVyXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IGFyZ3NcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKlxuICogQHByb3BlcnR5IHtPYmplY3R9ICAgZW52ICAgICAgICAgLSB0aGUgY3VycmVudCBFbnZpcm9ubWVudCBiZWluZyBydW5cbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSAgIGFyZ3MgICAgICAgIC0gUHJvdmlkZSBhcmd1bWVudHMgYXQgaW5pdGlhbGl6YXRpb25cbiAqIEBwcm9wZXJ0eSB7U3RyaW5nfSAgIHJlc29sdmVkICAgIC0gdGhlIHBhdGggdG8gdGhlIGN1cnJlbnQgZ2VuZXJhdG9yXG4gKiBAcHJvcGVydHkge1N0cmluZ30gICBkZXNjcmlwdGlvbiAtIFVzZWQgaW4gYC0taGVscGAgb3V0cHV0XG4gKiBAcHJvcGVydHkge1N0cmluZ30gICBhcHBuYW1lICAgICAtIFRoZSBhcHBsaWNhdGlvbiBuYW1lXG4gKiBAcHJvcGVydHkge1N0b3JhZ2V9ICBjb25maWcgICAgICAtIGAueW8tcmNgIGNvbmZpZyBmaWxlIG1hbmFnZXJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSAgIGZzICAgICAgICAgIC0gQW4gaW5zdGFuY2Ugb2Yge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9TQm91ZHJpYXMvbWVtLWZzLWVkaXRvciBNZW0tZnMtZWRpdG9yfVxuICogQHByb3BlcnR5IHtGdW5jdGlvbn0gbG9nICAgICAgICAgLSBPdXRwdXQgY29udGVudCB0aHJvdWdoIEludGVyZmFjZSBBZGFwdGVyXG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IEdlbmVyYXRvciA9IHJlcXVpcmUoJ3llb21hbi1nZW5lcmF0b3InKTtcbiAqIG1vZHVsZS5leHBvcnRzID0gY2xhc3MgZXh0ZW5kcyBHZW5lcmF0b3Ige1xuICogICB3cml0aW5nKCkge1xuICogICAgIHRoaXMuZnMud3JpdGUodGhpcy5kZXN0aW5hdGlvblBhdGgoJ2luZGV4LmpzJyksICdjb25zdCBmb28gPSAxOycpO1xuICogICB9XG4gKiB9O1xuICovXG5cbnZhciBCYXNlID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXJncywgb3B0aW9ucykge1xuICBldmVudHMuRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KGFyZ3MpKSB7XG4gICAgb3B0aW9ucyA9IGFyZ3M7XG4gICAgYXJncyA9IFtdO1xuICB9XG5cbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5faW5pdE9wdGlvbnMgPSBfLmNsb25lKG9wdGlvbnMpO1xuICB0aGlzLl9hcmdzID0gYXJncyB8fCBbXTtcbiAgdGhpcy5fb3B0aW9ucyA9IHt9O1xuICB0aGlzLl9hcmd1bWVudHMgPSBbXTtcbiAgdGhpcy5fY29tcG9zZWRXaXRoID0gW107XG4gIHRoaXMuX3RyYW5zZm9ybVN0cmVhbXMgPSBbXTtcblxuICB0aGlzLm9wdGlvbignaGVscCcsIHtcbiAgICB0eXBlOiBCb29sZWFuLFxuICAgIGFsaWFzOiAnaCcsXG4gICAgZGVzY3JpcHRpb246ICdQcmludCB0aGUgZ2VuZXJhdG9yXFwncyBvcHRpb25zIGFuZCB1c2FnZSdcbiAgfSk7XG5cbiAgdGhpcy5vcHRpb24oJ3NraXAtY2FjaGUnLCB7XG4gICAgdHlwZTogQm9vbGVhbixcbiAgICBkZXNjcmlwdGlvbjogJ0RvIG5vdCByZW1lbWJlciBwcm9tcHQgYW5zd2VycycsXG4gICAgZGVmYXVsdDogZmFsc2VcbiAgfSk7XG5cbiAgdGhpcy5vcHRpb24oJ3NraXAtaW5zdGFsbCcsIHtcbiAgICB0eXBlOiBCb29sZWFuLFxuICAgIGRlc2NyaXB0aW9uOiAnRG8gbm90IGF1dG9tYXRpY2FsbHkgaW5zdGFsbCBkZXBlbmRlbmNpZXMnLFxuICAgIGRlZmF1bHQ6IGZhbHNlXG4gIH0pO1xuXG4gIC8vIENoZWNrcyByZXF1aXJlZCBwYXJhbWF0ZXJzXG4gIGFzc2VydCh0aGlzLm9wdGlvbnMuZW52LCAnWW91IG11c3QgcHJvdmlkZSB0aGUgZW52aXJvbm1lbnQgb2JqZWN0LiBVc2UgZW52I2NyZWF0ZSgpIHRvIGNyZWF0ZSBhIG5ldyBnZW5lcmF0b3IuJyk7XG4gIGFzc2VydCh0aGlzLm9wdGlvbnMucmVzb2x2ZWQsICdZb3UgbXVzdCBwcm92aWRlIHRoZSByZXNvbHZlZCBwYXRoIHZhbHVlLiBVc2UgZW52I2NyZWF0ZSgpIHRvIGNyZWF0ZSBhIG5ldyBnZW5lcmF0b3IuJyk7XG4gIHRoaXMuZW52ID0gdGhpcy5vcHRpb25zLmVudjtcbiAgdGhpcy5yZXNvbHZlZCA9IHRoaXMub3B0aW9ucy5yZXNvbHZlZDtcblxuICAvLyBFbnN1cmUgdGhlIGVudmlyb25tZW50IHN1cHBvcnQgZmVhdHVyZXMgdGhpcyB5ZW9tYW4tZ2VuZXJhdG9yIHZlcnNpb24gcmVxdWlyZS5cbiAgcmVxdWlyZSgneWVvbWFuLWVudmlyb25tZW50JykuZW5mb3JjZVVwZGF0ZSh0aGlzLmVudik7XG5cbiAgdGhpcy5kZXNjcmlwdGlvbiA9IHRoaXMuZGVzY3JpcHRpb24gfHwgJyc7XG5cbiAgdGhpcy5hc3luYyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge307XG4gIH07XG5cbiAgdGhpcy5mcyA9IEZpbGVFZGl0b3IuY3JlYXRlKHRoaXMuZW52LnNoYXJlZEZzKTtcbiAgdGhpcy5jb25mbGljdGVyID0gbmV3IENvbmZsaWN0ZXIodGhpcy5lbnYuYWRhcHRlciwgdGhpcy5vcHRpb25zLmZvcmNlKTtcblxuICAvLyBNaXJyb3IgdGhlIGFkYXB0ZXIgbG9nIG1ldGhvZCBvbiB0aGUgZ2VuZXJhdG9yLlxuICAvL1xuICAvLyBleGFtcGxlOlxuICAvLyB0aGlzLmxvZygnZm9vJyk7XG4gIC8vIHRoaXMubG9nLmVycm9yKCdiYXInKTtcbiAgdGhpcy5sb2cgPSB0aGlzLmVudi5hZGFwdGVyLmxvZztcblxuICAvLyBEZXRlcm1pbmUgdGhlIGFwcCByb290XG4gIHRoaXMuY29udGV4dFJvb3QgPSB0aGlzLmVudi5jd2Q7XG5cbiAgdmFyIHJvb3RQYXRoID0gZmluZFVwLnN5bmMoJy55by1yYy5qc29uJywge1xuICAgIGN3ZDogdGhpcy5lbnYuY3dkXG4gIH0pO1xuICByb290UGF0aCA9IHJvb3RQYXRoID8gcGF0aC5kaXJuYW1lKHJvb3RQYXRoKSA6IHRoaXMuZW52LmN3ZDtcblxuICBpZiAocm9vdFBhdGggIT09IHRoaXMuZW52LmN3ZCkge1xuICAgIHRoaXMubG9nKFtcbiAgICAgICcnLFxuICAgICAgJ0p1c3QgZm91bmQgYSBgLnlvLXJjLmpzb25gIGluIGEgcGFyZW50IGRpcmVjdG9yeS4nLFxuICAgICAgJ1NldHRpbmcgdGhlIHByb2plY3Qgcm9vdCBhdDogJyArIHJvb3RQYXRoXG4gICAgXS5qb2luKCdcXG4nKSk7XG4gICAgdGhpcy5kZXN0aW5hdGlvblJvb3Qocm9vdFBhdGgpO1xuICB9XG5cbiAgdGhpcy5hcHBuYW1lID0gdGhpcy5kZXRlcm1pbmVBcHBuYW1lKCk7XG4gIHRoaXMuY29uZmlnID0gdGhpcy5fZ2V0U3RvcmFnZSgpO1xuICB0aGlzLl9nbG9iYWxDb25maWcgPSB0aGlzLl9nZXRHbG9iYWxTdG9yYWdlKCk7XG5cbiAgLy8gRW5zdXJlIHNvdXJjZS9kZXN0aW5hdGlvbiBwYXRoLCBjYW4gYmUgY29uZmlndXJlZCBmcm9tIHN1YmNsYXNzZXNcbiAgdGhpcy5zb3VyY2VSb290KHBhdGguam9pbihwYXRoLmRpcm5hbWUodGhpcy5yZXNvbHZlZCksICd0ZW1wbGF0ZXMnKSk7XG59O1xuXG51dGlsLmluaGVyaXRzKEJhc2UsIGV2ZW50cy5FdmVudEVtaXR0ZXIpO1xuXG4vLyBNaXhpbiB0aGUgYWN0aW9ucyBtb2R1bGVzXG5fLmV4dGVuZChCYXNlLnByb3RvdHlwZSwgcmVxdWlyZSgnLi9hY3Rpb25zL2luc3RhbGwnKSk7XG5fLmV4dGVuZChCYXNlLnByb3RvdHlwZSwgcmVxdWlyZSgnLi9hY3Rpb25zL2hlbHAnKSk7XG5fLmV4dGVuZChCYXNlLnByb3RvdHlwZSwgcmVxdWlyZSgnLi9hY3Rpb25zL3NwYXduLWNvbW1hbmQnKSk7XG5CYXNlLnByb3RvdHlwZS51c2VyID0gcmVxdWlyZSgnLi9hY3Rpb25zL3VzZXInKTtcblxuLypcbiAqIFByb21wdCB1c2VyIHRvIGFuc3dlciBxdWVzdGlvbnMuIFRoZSBzaWduYXR1cmUgb2YgdGhpcyBtZXRob2QgaXMgdGhlIHNhbWUgYXMge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9TQm91ZHJpYXMvSW5xdWlyZXIuanMgSW5xdWlyZXIuanN9XG4gKlxuICogT24gdG9wIG9mIHRoZSBJbnF1aXJlci5qcyBBUEksIHlvdSBjYW4gcHJvdmlkZSBhIGB7Y2FjaGU6IHRydWV9YCBwcm9wZXJ0eSBmb3JcbiAqIGV2ZXJ5IHF1ZXN0aW9uIGRlc2NyaXB0b3IuIFdoZW4gc2V0IHRvIHRydWUsIFllb21hbiB3aWxsIHN0b3JlL2ZldGNoIHRoZVxuICogdXNlcidzIGFuc3dlcnMgYXMgZGVmYXVsdHMuXG4gKlxuICogQHBhcmFtICB7YXJyYXl9IHF1ZXN0aW9ucyAgQXJyYXkgb2YgcXVlc3Rpb24gZGVzY3JpcHRvciBvYmplY3RzLiBTZWUge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9TQm91ZHJpYXMvSW5xdWlyZXIuanMvYmxvYi9tYXN0ZXIvUkVBRE1FLm1kIERvY3VtZW50YXRpb259XG4gKiBAcmV0dXJuIHtQcm9taXNlfVxuICovXG5cbkJhc2UucHJvdG90eXBlLnByb21wdCA9IGZ1bmN0aW9uIChxdWVzdGlvbnMpIHtcbiAgcXVlc3Rpb25zID0gcHJvbXB0U3VnZ2VzdGlvbi5wcmVmaWxsUXVlc3Rpb25zKHRoaXMuX2dsb2JhbENvbmZpZywgcXVlc3Rpb25zKTtcbiAgcXVlc3Rpb25zID0gcHJvbXB0U3VnZ2VzdGlvbi5wcmVmaWxsUXVlc3Rpb25zKHRoaXMuY29uZmlnLCBxdWVzdGlvbnMpO1xuXG4gIHJldHVybiB0aGlzLmVudi5hZGFwdGVyLnByb21wdChxdWVzdGlvbnMpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcnMpIHtcbiAgICBpZiAoIXRoaXMub3B0aW9uc1snc2tpcC1jYWNoZSddKSB7XG4gICAgICBwcm9tcHRTdWdnZXN0aW9uLnN0b3JlQW5zd2Vycyh0aGlzLl9nbG9iYWxDb25maWcsIHF1ZXN0aW9ucywgYW5zd2VycywgZmFsc2UpO1xuICAgICAgcHJvbXB0U3VnZ2VzdGlvbi5zdG9yZUFuc3dlcnModGhpcy5jb25maWcsIHF1ZXN0aW9ucywgYW5zd2VycywgdHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFuc3dlcnM7XG4gIH0uYmluZCh0aGlzKSk7XG59O1xuXG4vKipcbiAqIEFkZHMgYW4gb3B0aW9uIHRvIHRoZSBzZXQgb2YgZ2VuZXJhdG9yIGV4cGVjdGVkIG9wdGlvbnMsIG9ubHkgdXNlZCB0b1xuICogZ2VuZXJhdGUgZ2VuZXJhdG9yIHVzYWdlLiBCeSBkZWZhdWx0LCBnZW5lcmF0b3JzIGdldCBhbGwgdGhlIGNsaSBvcHRpb25zXG4gKiBwYXJzZWQgYnkgbm9wdCBhcyBhIGB0aGlzLm9wdGlvbnNgIGhhc2ggb2JqZWN0LlxuICpcbiAqICMjIyBPcHRpb25zOlxuICpcbiAqICAgLSBgZGVzY3JpcHRpb25gIERlc2NyaXB0aW9uIGZvciB0aGUgb3B0aW9uXG4gKiAgIC0gYHR5cGVgIEVpdGhlciBCb29sZWFuLCBTdHJpbmcgb3IgTnVtYmVyXG4gKiAgIC0gYGFsaWFzYCBPcHRpb24gbmFtZSBhbGlhcyAoZXhhbXBsZSBgLWhgIGFuZCAtLWhlbHBgKVxuICogICAtIGBkZWZhdWx0YCBEZWZhdWx0IHZhbHVlXG4gKiAgIC0gYGhpZGVgIEJvb2xlYW4gd2hldGhlciB0byBoaWRlIGZyb20gaGVscFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnXG4gKi9cblxuQmFzZS5wcm90b3R5cGUub3B0aW9uID0gZnVuY3Rpb24gKG5hbWUsIGNvbmZpZykge1xuICBjb25maWcgPSBjb25maWcgfHwge307XG5cbiAgLy8gQWxpYXMgZGVmYXVsdCB0byBkZWZhdWx0cyBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eS5cbiAgaWYgKCdkZWZhdWx0cycgaW4gY29uZmlnKSB7XG4gICAgY29uZmlnLmRlZmF1bHQgPSBjb25maWcuZGVmYXVsdHM7XG4gIH1cbiAgY29uZmlnLmRlc2NyaXB0aW9uID0gY29uZmlnLmRlc2NyaXB0aW9uIHx8IGNvbmZpZy5kZXNjO1xuXG4gIF8uZGVmYXVsdHMoY29uZmlnLCB7XG4gICAgbmFtZTogbmFtZSxcbiAgICBkZXNjcmlwdGlvbjogJ0Rlc2NyaXB0aW9uIGZvciAnICsgbmFtZSxcbiAgICB0eXBlOiBCb29sZWFuLFxuICAgIGhpZGU6IGZhbHNlXG4gIH0pO1xuXG4gIC8vIENoZWNrIHdoZXRoZXIgYm9vbGVhbiBvcHRpb24gaXMgaW52YWxpZCAoc3RhcnRzIHdpdGggbm8tKVxuICB2YXIgYm9vbE9wdGlvblJlZ2V4ID0gL15uby0vO1xuICBpZiAoY29uZmlnLnR5cGUgPT09IEJvb2xlYW4gJiYgbmFtZS5tYXRjaChib29sT3B0aW9uUmVnZXgpKSB7XG4gICAgbGV0IHNpbXBsZU5hbWUgPSBuYW1lLnJlcGxhY2UoYm9vbE9wdGlvblJlZ2V4LCAnJyk7XG4gICAgcmV0dXJuIHRoaXMuZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoW1xuICAgICAgYE9wdGlvbiBuYW1lICR7Y2hhbGsueWVsbG93KG5hbWUpfSBjYW5ub3Qgc3RhcnQgd2l0aCAke2NoYWxrLnJlZCgnbm8tJyl9XFxuYCxcbiAgICAgIGBPcHRpb24gbmFtZSBwcmVmaXhlZCBieSAke2NoYWxrLnllbGxvdygnLS1ubycpfSBhcmUgcGFyc2VkIGFzIGltcGxpY2l0YCxcbiAgICAgIGAgYm9vbGVhbi4gVG8gdXNlICR7Y2hhbGsueWVsbG93KCctLScgKyBuYW1lKX0gYXMgYW4gb3B0aW9uLCB1c2VcXG5gLFxuICAgICAgY2hhbGsuY3lhbihgICB0aGlzLm9wdGlvbignJHtzaW1wbGVOYW1lfScsIHt0eXBlOiBCb29sZWFufSlgKVxuICAgIF0uam9pbignJykpKTtcbiAgfVxuXG4gIGlmICh0aGlzLl9vcHRpb25zW25hbWVdID09PSBudWxsIHx8IHRoaXMuX29wdGlvbnNbbmFtZV0gPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX29wdGlvbnNbbmFtZV0gPSBjb25maWc7XG4gIH1cblxuICB0aGlzLnBhcnNlT3B0aW9ucygpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhbiBhcmd1bWVudCB0byB0aGUgY2xhc3MgYW5kIGNyZWF0ZXMgYW4gYXR0cmlidXRlIGdldHRlciBmb3IgaXQuXG4gKlxuICogQXJndW1lbnRzIGFyZSBkaWZmZXJlbnQgZnJvbSBvcHRpb25zIGluIHNldmVyYWwgYXNwZWN0cy4gVGhlIGZpcnN0IG9uZVxuICogaXMgaG93IHRoZXkgYXJlIHBhcnNlZCBmcm9tIHRoZSBjb21tYW5kIGxpbmUsIGFyZ3VtZW50cyBhcmUgcmV0cmlldmVkXG4gKiBiYXNlZCBvbiB0aGVpciBwb3NpdGlvbi5cbiAqXG4gKiBCZXNpZGVzLCBhcmd1bWVudHMgYXJlIHVzZWQgaW5zaWRlIHlvdXIgY29kZSBhcyBhIHByb3BlcnR5IChgdGhpcy5hcmd1bWVudGApLFxuICogd2hpbGUgb3B0aW9ucyBhcmUgYWxsIGtlcHQgaW4gYSBoYXNoIChgdGhpcy5vcHRpb25zYCkuXG4gKlxuICogIyMjIE9wdGlvbnM6XG4gKlxuICogICAtIGBkZXNjcmlwdGlvbmAgRGVzY3JpcHRpb24gZm9yIHRoZSBhcmd1bWVudFxuICogICAtIGByZXF1aXJlZGAgQm9vbGVhbiB3aGV0aGVyIGl0IGlzIHJlcXVpcmVkXG4gKiAgIC0gYG9wdGlvbmFsYCBCb29sZWFuIHdoZXRoZXIgaXQgaXMgb3B0aW9uYWxcbiAqICAgLSBgdHlwZWAgU3RyaW5nLCBOdW1iZXIsIEFycmF5LCBvciBPYmplY3RcbiAqICAgLSBgZGVmYXVsdGAgRGVmYXVsdCB2YWx1ZSBmb3IgdGhpcyBhcmd1bWVudFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnXG4gKi9cblxuQmFzZS5wcm90b3R5cGUuYXJndW1lbnQgPSBmdW5jdGlvbiAobmFtZSwgY29uZmlnKSB7XG4gIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcblxuICAvLyBBbGlhcyBkZWZhdWx0IHRvIGRlZmF1bHRzIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5LlxuICBpZiAoJ2RlZmF1bHRzJyBpbiBjb25maWcpIHtcbiAgICBjb25maWcuZGVmYXVsdCA9IGNvbmZpZy5kZWZhdWx0cztcbiAgfVxuICBjb25maWcuZGVzY3JpcHRpb24gPSBjb25maWcuZGVzY3JpcHRpb24gfHwgY29uZmlnLmRlc2M7XG5cbiAgXy5kZWZhdWx0cyhjb25maWcsIHtcbiAgICBuYW1lOiBuYW1lLFxuICAgIHJlcXVpcmVkOiBjb25maWcuZGVmYXVsdCA9PT0gbnVsbCB8fCBjb25maWcuZGVmYXVsdCA9PT0gdW5kZWZpbmVkLFxuICAgIHR5cGU6IFN0cmluZ1xuICB9KTtcblxuICB0aGlzLl9hcmd1bWVudHMucHVzaChjb25maWcpO1xuXG4gIHRoaXMucGFyc2VPcHRpb25zKCk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuQmFzZS5wcm90b3R5cGUucGFyc2VPcHRpb25zID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWluaW1pc3REZWYgPSB7XG4gICAgc3RyaW5nOiBbXSxcbiAgICBib29sZWFuOiBbXSxcbiAgICBhbGlhczoge30sXG4gICAgZGVmYXVsdDoge31cbiAgfTtcblxuICBfLmVhY2godGhpcy5fb3B0aW9ucywgZnVuY3Rpb24gKG9wdGlvbikge1xuICAgIGlmIChvcHRpb24udHlwZSA9PT0gQm9vbGVhbikge1xuICAgICAgbWluaW1pc3REZWYuYm9vbGVhbi5wdXNoKG9wdGlvbi5uYW1lKTtcbiAgICAgIGlmICghKCdkZWZhdWx0JyBpbiBvcHRpb24pICYmICFvcHRpb24ucmVxdWlyZWQpIHtcbiAgICAgICAgbWluaW1pc3REZWYuZGVmYXVsdFtvcHRpb24ubmFtZV0gPSBFTVBUWTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbWluaW1pc3REZWYuc3RyaW5nLnB1c2gob3B0aW9uLm5hbWUpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb24uYWxpYXMpIHtcbiAgICAgIG1pbmltaXN0RGVmLmFsaWFzW29wdGlvbi5hbGlhc10gPSBvcHRpb24ubmFtZTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IGFwcGx5IGRlZmF1bHQgdmFsdWVzIGlmIHdlIGRvbid0IGFscmVhZHkgaGF2ZSBhIHZhbHVlIGluamVjdGVkIGZyb21cbiAgICAvLyB0aGUgcnVubmVyXG4gICAgaWYgKG9wdGlvbi5uYW1lIGluIHRoaXMuX2luaXRPcHRpb25zKSB7XG4gICAgICBtaW5pbWlzdERlZi5kZWZhdWx0W29wdGlvbi5uYW1lXSA9IHRoaXMuX2luaXRPcHRpb25zW29wdGlvbi5uYW1lXTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbi5hbGlhcyAmJiBvcHRpb24uYWxpYXMgaW4gdGhpcy5faW5pdE9wdGlvbnMpIHtcbiAgICAgIG1pbmltaXN0RGVmLmRlZmF1bHRbb3B0aW9uLm5hbWVdID0gdGhpcy5faW5pdE9wdGlvbnNbb3B0aW9uLmFsaWFzXTtcbiAgICB9IGVsc2UgaWYgKCdkZWZhdWx0JyBpbiBvcHRpb24pIHtcbiAgICAgIG1pbmltaXN0RGVmLmRlZmF1bHRbb3B0aW9uLm5hbWVdID0gb3B0aW9uLmRlZmF1bHQ7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIHZhciBwYXJzZWRPcHRzID0gbWluaW1pc3QodGhpcy5fYXJncywgbWluaW1pc3REZWYpO1xuXG4gIC8vIFBhcnNlIG9wdGlvbnMgdG8gdGhlIGRlc2lyZWQgdHlwZVxuICBfLmVhY2gocGFyc2VkT3B0cywgZnVuY3Rpb24gKG9wdGlvbiwgbmFtZSkge1xuICAgIC8vIE1hbnVhbGx5IHNldCB2YWx1ZSBhcyB1bmRlZmluZWQgaWYgaXQgc2hvdWxkIGJlLlxuICAgIGlmIChvcHRpb24gPT09IEVNUFRZKSB7XG4gICAgICBwYXJzZWRPcHRzW25hbWVdID0gdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGhpcy5fb3B0aW9uc1tuYW1lXSAmJiBvcHRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgcGFyc2VkT3B0c1tuYW1lXSA9IHRoaXMuX29wdGlvbnNbbmFtZV0udHlwZShvcHRpb24pO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpKTtcblxuICAvLyBQYXJzZSBwb3NpdGlvbmFsIGFyZ3VtZW50cyB0byB2YWxpZCBvcHRpb25zXG4gIHRoaXMuX2FyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChjb25maWcsIGluZGV4KSB7XG4gICAgdmFyIHZhbHVlO1xuICAgIGlmIChpbmRleCA+PSBwYXJzZWRPcHRzLl8ubGVuZ3RoKSB7XG4gICAgICBpZiAoY29uZmlnLm5hbWUgaW4gdGhpcy5faW5pdE9wdGlvbnMpIHtcbiAgICAgICAgdmFsdWUgPSB0aGlzLl9pbml0T3B0aW9uc1tjb25maWcubmFtZV07XG4gICAgICB9IGVsc2UgaWYgKCdkZWZhdWx0JyBpbiBjb25maWcpIHtcbiAgICAgICAgdmFsdWUgPSBjb25maWcuZGVmYXVsdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvbmZpZy50eXBlID09PSBBcnJheSkge1xuICAgICAgdmFsdWUgPSBwYXJzZWRPcHRzLl8uc2xpY2UoaW5kZXgsIHBhcnNlZE9wdHMuXy5sZW5ndGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSA9IGNvbmZpZy50eXBlKHBhcnNlZE9wdHMuX1tpbmRleF0pO1xuICAgIH1cblxuICAgIHBhcnNlZE9wdHNbY29uZmlnLm5hbWVdID0gdmFsdWU7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgLy8gTWFrZSB0aGUgcGFyc2VkIG9wdGlvbnMgYXZhaWxhYmxlIHRvIHRoZSBpbnN0YW5jZVxuICBfLmV4dGVuZCh0aGlzLm9wdGlvbnMsIHBhcnNlZE9wdHMpO1xuICB0aGlzLmFyZ3MgPSB0aGlzLmFyZ3VtZW50cyA9IHBhcnNlZE9wdHMuXztcblxuICAvLyBNYWtlIHN1cmUgcmVxdWlyZWQgYXJncyBhcmUgYWxsIHByZXNlbnRcbiAgdGhpcy5jaGVja1JlcXVpcmVkQXJncygpO1xufTtcblxuQmFzZS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZEFyZ3MgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIElmIHRoZSBoZWxwIG9wdGlvbiB3YXMgcHJvdmlkZWQsIHdlIGRvbid0IHdhbnQgdG8gY2hlY2sgZm9yIHJlcXVpcmVkXG4gIC8vIGFyZ3VtZW50cywgc2luY2Ugd2UncmUgb25seSBnb2luZyB0byBwcmludCB0aGUgaGVscCBtZXNzYWdlIGFueXdheS5cbiAgaWYgKHRoaXMub3B0aW9ucy5oZWxwKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gQmFpbCBlYXJseSBpZiBpdCdzIG5vdCBwb3NzaWJsZSB0byBoYXZlIGEgbWlzc2luZyByZXF1aXJlZCBhcmdcbiAgaWYgKHRoaXMuYXJncy5sZW5ndGggPiB0aGlzLl9hcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGhpcy5fYXJndW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGNvbmZpZywgcG9zaXRpb24pIHtcbiAgICAvLyBJZiB0aGUgaGVscCBvcHRpb24gd2FzIG5vdCBwcm92aWRlZCwgY2hlY2sgd2hldGhlciB0aGUgYXJndW1lbnQgd2FzXG4gICAgLy8gcmVxdWlyZWQsIGFuZCB3aGV0aGVyIGEgdmFsdWUgd2FzIHByb3ZpZGVkLlxuICAgIGlmIChjb25maWcucmVxdWlyZWQgJiYgcG9zaXRpb24gPj0gdGhpcy5hcmdzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHRoaXMuZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoJ0RpZCBub3QgcHJvdmlkZSByZXF1aXJlZCBhcmd1bWVudCAnICsgY2hhbGsuYm9sZChjb25maWcubmFtZSkgKyAnIScpKTtcbiAgICB9XG4gIH0sIHRoaXMpO1xufTtcblxuLyoqXG4gKiBSdW5zIHRoZSBnZW5lcmF0b3IsIHNjaGVkdWxpbmcgcHJvdG90eXBlIG1ldGhvZHMgb24gYSBydW4gcXVldWUuIE1ldGhvZCBuYW1lc1xuICogd2lsbCBkZXRlcm1pbmUgdGhlIG9yZGVyIGVhY2ggbWV0aG9kIGlzIHJ1bi4gTWV0aG9kcyB3aXRob3V0IHNwZWNpYWwgbmFtZXNcbiAqIHdpbGwgcnVuIGluIHRoZSBkZWZhdWx0IHF1ZXVlLlxuICpcbiAqIEFueSBtZXRob2QgbmFtZWQgYGNvbnN0cnVjdG9yYCBhbmQgYW55IG1ldGhvZHMgcHJlZml4ZWQgYnkgYSBgX2Agd29uJ3QgYmUgc2NoZWR1bGVkLlxuICpcbiAqIFlvdSBjYW4gYWxzbyBzdXBwbHkgdGhlIGFyZ3VtZW50cyBmb3IgdGhlIG1ldGhvZCB0byBiZSBpbnZva2VkLiBJZiBub25lIGFyZVxuICogcHJvdmlkZWQsIHRoZSBzYW1lIHZhbHVlcyB1c2VkIHRvIGluaXRpYWxpemUgdGhlIGludm9rZXIgYXJlIHVzZWQgdG9cbiAqIGluaXRpYWxpemUgdGhlIGludm9rZWQuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICovXG5cbkJhc2UucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChjYikge1xuICBjYiA9IGNiIHx8IGZ1bmN0aW9uICgpIHt9O1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fcnVubmluZyA9IHRydWU7XG4gIHRoaXMuZW1pdCgncnVuJyk7XG5cbiAgdmFyIG1ldGhvZHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcykpO1xuICB2YXIgdmFsaWRNZXRob2RzID0gbWV0aG9kcy5maWx0ZXIobWV0aG9kSXNWYWxpZCk7XG4gIGFzc2VydCh2YWxpZE1ldGhvZHMubGVuZ3RoLCAnVGhpcyBHZW5lcmF0b3IgaXMgZW1wdHkuIEFkZCBhdCBsZWFzdCBvbmUgbWV0aG9kIGZvciBpdCB0byBydW4uJyk7XG5cbiAgdGhpcy5lbnYucnVuTG9vcC5vbmNlKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbWl0KCdlbmQnKTtcbiAgICBjYigpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIC8vIEVuc3VyZSBhIHByb3RvdHlwZSBtZXRob2QgaXMgYSBjYW5kaWRhdGUgcnVuIGJ5IGRlZmF1bHRcbiAgZnVuY3Rpb24gbWV0aG9kSXNWYWxpZChuYW1lKSB7XG4gICAgcmV0dXJuIG5hbWUuY2hhckF0KDApICE9PSAnXycgJiYgbmFtZSAhPT0gJ2NvbnN0cnVjdG9yJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZE1ldGhvZChtZXRob2QsIG1ldGhvZE5hbWUsIHF1ZXVlTmFtZSkge1xuICAgIHF1ZXVlTmFtZSA9IHF1ZXVlTmFtZSB8fCAnZGVmYXVsdCc7XG4gICAgZGVidWcoJ1F1ZXVlaW5nICcgKyBtZXRob2ROYW1lICsgJyBpbiAnICsgcXVldWVOYW1lKTtcbiAgICBzZWxmLmVudi5ydW5Mb29wLmFkZChxdWV1ZU5hbWUsIGZ1bmN0aW9uIChjb21wbGV0ZWQpIHtcbiAgICAgIGRlYnVnKCdSdW5uaW5nICcgKyBtZXRob2ROYW1lKTtcbiAgICAgIHNlbGYuZW1pdCgnbWV0aG9kOicgKyBtZXRob2ROYW1lKTtcblxuICAgICAgcnVuQXN5bmMoZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLmFzeW5jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmFzeW5jKCk7XG4gICAgICAgIH0uYmluZCh0aGlzKTtcblxuICAgICAgICByZXR1cm4gbWV0aG9kLmFwcGx5KHNlbGYsIHNlbGYuYXJncyk7XG4gICAgICB9KSgpLnRoZW4oY29tcGxldGVkKS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGRlYnVnKCdBbiBlcnJvciBvY2N1cmVkIHdoaWxlIHJ1bm5pbmcgJyArIG1ldGhvZE5hbWUsIGVycik7XG5cbiAgICAgICAgLy8gRW5zdXJlIHdlIGVtaXQgdGhlIGVycm9yIGV2ZW50IG91dHNpZGUgdGhlIHByb21pc2UgY29udGV4dCBzbyBpdCB3b24ndCBiZVxuICAgICAgICAvLyBzd2FsbG93ZWQgd2hlbiB0aGVyZSdzIG5vIGxpc3RlbmVycy5cbiAgICAgICAgc2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgICBjYihlcnIpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkSW5RdWV1ZShuYW1lKSB7XG4gICAgdmFyIGl0ZW0gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yoc2VsZilbbmFtZV07XG4gICAgdmFyIHF1ZXVlTmFtZSA9IHNlbGYuZW52LnJ1bkxvb3AucXVldWVOYW1lcy5pbmRleE9mKG5hbWUpID09PSAtMSA/IG51bGwgOiBuYW1lO1xuXG4gICAgLy8gTmFtZSBwb2ludHMgdG8gYSBmdW5jdGlvbjsgcnVuIGl0IVxuICAgIGlmIChfLmlzRnVuY3Rpb24oaXRlbSkpIHtcbiAgICAgIHJldHVybiBhZGRNZXRob2QoaXRlbSwgbmFtZSwgcXVldWVOYW1lKTtcbiAgICB9XG5cbiAgICAvLyBOb3QgYSBxdWV1ZSBoYXNoOyBzdG9wXG4gICAgaWYgKCFxdWV1ZU5hbWUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBSdW4gZWFjaCBxdWV1ZSBpdGVtc1xuICAgIF8uZWFjaChpdGVtLCBmdW5jdGlvbiAobWV0aG9kLCBtZXRob2ROYW1lKSB7XG4gICAgICBpZiAoIV8uaXNGdW5jdGlvbihtZXRob2QpIHx8ICFtZXRob2RJc1ZhbGlkKG1ldGhvZE5hbWUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgYWRkTWV0aG9kKG1ldGhvZCwgbWV0aG9kTmFtZSwgcXVldWVOYW1lKTtcbiAgICB9KTtcbiAgfVxuXG4gIHZhbGlkTWV0aG9kcy5mb3JFYWNoKGFkZEluUXVldWUpO1xuXG4gIHZhciB3cml0ZUZpbGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZW52LnJ1bkxvb3AuYWRkKCdjb25mbGljdHMnLCB0aGlzLl93cml0ZUZpbGVzLmJpbmQodGhpcyksIHtcbiAgICAgIG9uY2U6ICd3cml0ZSBtZW1vcnkgZnMgdG8gZGlzaydcbiAgICB9KTtcbiAgfS5iaW5kKHRoaXMpO1xuXG4gIHRoaXMuZW52LnNoYXJlZEZzLm9uKCdjaGFuZ2UnLCB3cml0ZUZpbGVzKTtcbiAgd3JpdGVGaWxlcygpO1xuXG4gIC8vIEFkZCB0aGUgZGVmYXVsdCBjb25mbGljdHMgaGFuZGxpbmdcbiAgdGhpcy5lbnYucnVuTG9vcC5hZGQoJ2NvbmZsaWN0cycsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgdGhpcy5jb25mbGljdGVyLnJlc29sdmUoZnVuY3Rpb24gKGVycikge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIH1cblxuICAgICAgZG9uZSgpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgXy5pbnZva2VNYXAodGhpcy5fY29tcG9zZWRXaXRoLCAncnVuJyk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDb21wb3NlIHRoaXMgZ2VuZXJhdG9yIHdpdGggYW5vdGhlciBvbmUuXG4gKiBAcGFyYW0gIHtTdHJpbmd9IG5hbWVzcGFjZSAgVGhlIGdlbmVyYXRvciBuYW1lc3BhY2UgdG8gY29tcG9zZSB3aXRoXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnMgICAgVGhlIG9wdGlvbnMgcGFzc2VkIHRvIHRoZSBHZW5lcmF0b3JcbiAqIEBwYXJhbSAge09iamVjdH0gW3NldHRpbmdzXSBTZXR0aW5ncyBoYXNoIG9uIHRoZSBjb21wb3NpdGlvbiByZWxhdGlvblxuICogQHBhcmFtICB7c3RyaW5nfSBbc2V0dGluZ3MubG9jYWxdICAgICAgICBQYXRoIHRvIGEgbG9jYWxseSBzdG9yZWQgZ2VuZXJhdG9yXG4gKiBAcGFyYW0gIHtTdHJpbmd9IFtzZXR0aW5ncy5saW5rPVwid2Vha1wiXSAgSWYgXCJzdHJvbmdcIiwgdGhlIGNvbXBvc2l0aW9uIHdpbGwgb2NjdXJlZFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVuIHdoZW4gdGhlIGNvbXBvc2l0aW9uIGlzIGluaXRpYWxpemVkIGJ5XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBlbmQgdXNlclxuICogQHJldHVybiB7dGhpc31cbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5Vc2luZyBhIHBlZXJEZXBlbmRlbmN5IGdlbmVyYXRvcjwvY2FwdGlvbj5cbiAqIHRoaXMuY29tcG9zZVdpdGgoJ2Jvb3RzdHJhcCcsIHsgc2FzczogdHJ1ZSB9KTtcbiAqXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5Vc2luZyBhIGRpcmVjdCBkZXBlbmRlbmN5IGdlbmVyYXRvcjwvY2FwdGlvbj5cbiAqIHRoaXMuY29tcG9zZVdpdGgocmVxdWlyZS5yZXNvbHZlKCdnZW5lcmF0b3ItYm9vdHN0cmFwL2FwcC9tYWluLmpzJyksIHsgc2FzczogdHJ1ZSB9KTtcbiAqL1xuXG5CYXNlLnByb3RvdHlwZS5jb21wb3NlV2l0aCA9IGZ1bmN0aW9uIChtb2R1bGVQYXRoLCBvcHRpb25zKSB7XG4gIHZhciBnZW5lcmF0b3I7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIFBhc3MgZG93biB0aGUgZGVmYXVsdCBvcHRpb25zIHNvIHRoZXkncmUgY29ycmVjbHR5IG1pcnJvcmVkIGRvd24gdGhlIGNoYWluLlxuICBvcHRpb25zID0gXy5leHRlbmQoe1xuICAgIHNraXBJbnN0YWxsOiB0aGlzLm9wdGlvbnMuc2tpcEluc3RhbGwsXG4gICAgJ3NraXAtaW5zdGFsbCc6IHRoaXMub3B0aW9ucy5za2lwSW5zdGFsbCxcbiAgICBza2lwQ2FjaGU6IHRoaXMub3B0aW9ucy5za2lwQ2FjaGUsXG4gICAgJ3NraXAtY2FjaGUnOiB0aGlzLm9wdGlvbnMuc2tpcENhY2hlXG4gIH0sIG9wdGlvbnMpO1xuXG4gIHRyeSB7XG4gICAgdmFyIEdlbmVyYXRvciA9IHJlcXVpcmUobW9kdWxlUGF0aCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgaW1wb3J0L25vLWR5bmFtaWMtcmVxdWlyZVxuICAgIEdlbmVyYXRvci5yZXNvbHZlZCA9IHJlcXVpcmUucmVzb2x2ZShtb2R1bGVQYXRoKTtcbiAgICBHZW5lcmF0b3IubmFtZXNwYWNlID0gdGhpcy5lbnYubmFtZXNwYWNlKG1vZHVsZVBhdGgpO1xuICAgIGdlbmVyYXRvciA9IHRoaXMuZW52Lmluc3RhbnRpYXRlKEdlbmVyYXRvciwge1xuICAgICAgb3B0aW9uczogb3B0aW9ucyxcbiAgICAgIGFyZ3VtZW50czogb3B0aW9ucy5hcmd1bWVudHNcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyci5jb2RlID09PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgIGdlbmVyYXRvciA9IHRoaXMuZW52LmNyZWF0ZShtb2R1bGVQYXRoLCB7XG4gICAgICAgIG9wdGlvbnM6IG9wdGlvbnMsXG4gICAgICAgIGFyZ3VtZW50czogb3B0aW9ucy5hcmd1bWVudHNcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9XG5cbiAgaWYgKHRoaXMuX3J1bm5pbmcpIHtcbiAgICBnZW5lcmF0b3IucnVuKCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fY29tcG9zZWRXaXRoLnB1c2goZ2VuZXJhdG9yKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgdGhlIHJvb3QgZ2VuZXJhdG9yIG5hbWUgKHRoZSBvbmUgd2hvJ3MgZXh0ZW5kaW5nIEJhc2UpLlxuICogQHJldHVybiB7U3RyaW5nfSBUaGUgbmFtZSBvZiB0aGUgcm9vdCBnZW5lcmF0b3JcbiAqL1xuXG5CYXNlLnByb3RvdHlwZS5yb290R2VuZXJhdG9yTmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHBrZyA9IHJlYWRQa2dVcC5zeW5jKHtjd2Q6IHRoaXMucmVzb2x2ZWR9KS5wa2c7XG4gIHJldHVybiBwa2cgPyBwa2cubmFtZSA6ICcqJztcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lIHRoZSByb290IGdlbmVyYXRvciB2ZXJzaW9uICh0aGUgb25lIHdobydzIGV4dGVuZGluZyBCYXNlKS5cbiAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHZlcnNpb24gb2YgdGhlIHJvb3QgZ2VuZXJhdG9yXG4gKi9cblxuQmFzZS5wcm90b3R5cGUucm9vdEdlbmVyYXRvclZlcnNpb24gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwa2cgPSByZWFkUGtnVXAuc3luYyh7Y3dkOiB0aGlzLnJlc29sdmVkfSkucGtnO1xuICByZXR1cm4gcGtnID8gcGtnLnZlcnNpb24gOiAnMC4wLjAnO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYSBzdG9yYWdlIGluc3RhbmNlLlxuICogQHJldHVybiB7U3RvcmFnZX0gR2VuZXJhdG9yIHN0b3JhZ2VcbiAqIEBwcml2YXRlXG4gKi9cblxuQmFzZS5wcm90b3R5cGUuX2dldFN0b3JhZ2UgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzdG9yZVBhdGggPSBwYXRoLmpvaW4odGhpcy5kZXN0aW5hdGlvblJvb3QoKSwgJy55by1yYy5qc29uJyk7XG4gIHJldHVybiBuZXcgU3RvcmFnZSh0aGlzLnJvb3RHZW5lcmF0b3JOYW1lKCksIHRoaXMuZnMsIHN0b3JlUGF0aCk7XG59O1xuXG4vKipcbiAqIFNldHVwIGEgZ2xvYmFsQ29uZmlnIHN0b3JhZ2UgaW5zdGFuY2UuXG4gKiBAcmV0dXJuIHtTdG9yYWdlfSBHbG9iYWwgY29uZmlnIHN0b3JhZ2VcbiAqIEBwcml2YXRlXG4gKi9cblxuQmFzZS5wcm90b3R5cGUuX2dldEdsb2JhbFN0b3JhZ2UgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzdG9yZVBhdGggPSBwYXRoLmpvaW4odXNlckhvbWUsICcueW8tcmMtZ2xvYmFsLmpzb24nKTtcbiAgdmFyIHN0b3JlTmFtZSA9IHV0aWwuZm9ybWF0KCclczolcycsIHRoaXMucm9vdEdlbmVyYXRvck5hbWUoKSwgdGhpcy5yb290R2VuZXJhdG9yVmVyc2lvbigpKTtcbiAgcmV0dXJuIG5ldyBTdG9yYWdlKHN0b3JlTmFtZSwgdGhpcy5mcywgc3RvcmVQYXRoKTtcbn07XG5cbi8qKlxuICogQ2hhbmdlIHRoZSBnZW5lcmF0b3IgZGVzdGluYXRpb24gcm9vdCBkaXJlY3RvcnkuXG4gKiBUaGlzIHBhdGggaXMgdXNlZCB0byBmaW5kIHN0b3JhZ2UsIHdoZW4gdXNpbmcgYSBmaWxlIHN5c3RlbSBoZWxwZXIgbWV0aG9kIChsaWtlXG4gKiBgdGhpcy53cml0ZWAgYW5kIGB0aGlzLmNvcHlgKVxuICogQHBhcmFtICB7U3RyaW5nfSByb290UGF0aCBuZXcgZGVzdGluYXRpb24gcm9vdCBwYXRoXG4gKiBAcmV0dXJuIHtTdHJpbmd9ICAgICAgICAgIGRlc3RpbmF0aW9uIHJvb3QgcGF0aFxuICovXG5cbkJhc2UucHJvdG90eXBlLmRlc3RpbmF0aW9uUm9vdCA9IGZ1bmN0aW9uIChyb290UGF0aCkge1xuICBpZiAoXy5pc1N0cmluZyhyb290UGF0aCkpIHtcbiAgICB0aGlzLl9kZXN0aW5hdGlvblJvb3QgPSBwYXRoLnJlc29sdmUocm9vdFBhdGgpO1xuXG4gICAgaWYgKCFwYXRoRXhpc3RzLnN5bmMocm9vdFBhdGgpKSB7XG4gICAgICBta2RpcnAuc3luYyhyb290UGF0aCk7XG4gICAgfVxuXG4gICAgcHJvY2Vzcy5jaGRpcihyb290UGF0aCk7XG4gICAgdGhpcy5lbnYuY3dkID0gcm9vdFBhdGg7XG5cbiAgICAvLyBSZXNldCB0aGUgc3RvcmFnZVxuICAgIHRoaXMuY29uZmlnID0gdGhpcy5fZ2V0U3RvcmFnZSgpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuX2Rlc3RpbmF0aW9uUm9vdCB8fCB0aGlzLmVudi5jd2Q7XG59O1xuXG4vKipcbiAqIENoYW5nZSB0aGUgZ2VuZXJhdG9yIHNvdXJjZSByb290IGRpcmVjdG9yeS5cbiAqIFRoaXMgcGF0aCBpcyB1c2VkIGJ5IG11bHRpcGxlcyBmaWxlIHN5c3RlbSBtZXRob2RzIGxpa2UgKGB0aGlzLnJlYWRgIGFuZCBgdGhpcy5jb3B5YClcbiAqIEBwYXJhbSAge1N0cmluZ30gcm9vdFBhdGggbmV3IHNvdXJjZSByb290IHBhdGhcbiAqIEByZXR1cm4ge1N0cmluZ30gICAgICAgICAgc291cmNlIHJvb3QgcGF0aFxuICovXG5cbkJhc2UucHJvdG90eXBlLnNvdXJjZVJvb3QgPSBmdW5jdGlvbiAocm9vdFBhdGgpIHtcbiAgaWYgKF8uaXNTdHJpbmcocm9vdFBhdGgpKSB7XG4gICAgdGhpcy5fc291cmNlUm9vdCA9IHBhdGgucmVzb2x2ZShyb290UGF0aCk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fc291cmNlUm9vdDtcbn07XG5cbi8qKlxuICogSm9pbiBhIHBhdGggdG8gdGhlIHNvdXJjZSByb290LlxuICogQHBhcmFtICB7Li4uU3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtTdHJpbmd9ICAgIGpvaW5lZCBwYXRoXG4gKi9cblxuQmFzZS5wcm90b3R5cGUudGVtcGxhdGVQYXRoID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZmlsZXBhdGggPSBwYXRoLmpvaW4uYXBwbHkocGF0aCwgYXJndW1lbnRzKTtcblxuICBpZiAoIXBhdGhJc0Fic29sdXRlKGZpbGVwYXRoKSkge1xuICAgIGZpbGVwYXRoID0gcGF0aC5qb2luKHRoaXMuc291cmNlUm9vdCgpLCBmaWxlcGF0aCk7XG4gIH1cblxuICByZXR1cm4gZmlsZXBhdGg7XG59O1xuXG4vKipcbiAqIEpvaW4gYSBwYXRoIHRvIHRoZSBkZXN0aW5hdGlvbiByb290LlxuICogQHBhcmFtICB7Li4uU3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtTdHJpbmd9ICAgIGpvaW5lZCBwYXRoXG4gKi9cblxuQmFzZS5wcm90b3R5cGUuZGVzdGluYXRpb25QYXRoID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZmlsZXBhdGggPSBwYXRoLmpvaW4uYXBwbHkocGF0aCwgYXJndW1lbnRzKTtcblxuICBpZiAoIXBhdGhJc0Fic29sdXRlKGZpbGVwYXRoKSkge1xuICAgIGZpbGVwYXRoID0gcGF0aC5qb2luKHRoaXMuZGVzdGluYXRpb25Sb290KCksIGZpbGVwYXRoKTtcbiAgfVxuXG4gIHJldHVybiBmaWxlcGF0aDtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB0aGUgbmFtZSBvZiB0aGUgYXBwbGljYXRpb24uXG4gKlxuICogRmlyc3QgY2hlY2tzIGZvciBuYW1lIGluIGJvd2VyLmpzb24uXG4gKiBUaGVuIGNoZWNrcyBmb3IgbmFtZSBpbiBwYWNrYWdlLmpzb24uXG4gKiBGaW5hbGx5IGRlZmF1bHRzIHRvIHRoZSBuYW1lIG9mIHRoZSBjdXJyZW50IGRpcmVjdG9yeS5cbiAqIEByZXR1cm4ge1N0cmluZ30gVGhlIG5hbWUgb2YgdGhlIGFwcGxpY2F0aW9uXG4gKi9cbkJhc2UucHJvdG90eXBlLmRldGVybWluZUFwcG5hbWUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBhcHBuYW1lID0gdGhpcy5mcy5yZWFkSlNPTih0aGlzLmRlc3RpbmF0aW9uUGF0aCgnYm93ZXIuanNvbicpLCB7fSkubmFtZTtcblxuICBpZiAoIWFwcG5hbWUpIHtcbiAgICBhcHBuYW1lID0gdGhpcy5mcy5yZWFkSlNPTih0aGlzLmRlc3RpbmF0aW9uUGF0aCgncGFja2FnZS5qc29uJyksIHt9KS5uYW1lO1xuICB9XG5cbiAgaWYgKCFhcHBuYW1lKSB7XG4gICAgYXBwbmFtZSA9IHBhdGguYmFzZW5hbWUodGhpcy5kZXN0aW5hdGlvblJvb3QoKSk7XG4gIH1cblxuICByZXR1cm4gYXBwbmFtZS5yZXBsYWNlKC9bXlxcd1xcc10rPy9nLCAnICcpO1xufTtcblxuLyoqXG4gKiBBZGQgYSB0cmFuc2Zvcm0gc3RyZWFtIHRvIHRoZSBjb21taXQgc3RyZWFtLlxuICpcbiAqIE1vc3QgdXN1YWxseSwgdGhlc2UgdHJhbnNmb3JtIHN0cmVhbSB3aWxsIGJlIEd1bHAgcGx1Z2lucy5cbiAqXG4gKiBAcGFyYW0gIHtzdHJlYW0uVHJhbnNmb3JtfHN0cmVhbS5UcmFuc2Zvcm1bXX0gc3RyZWFtIEFuIGFycmF5IG9mIFRyYW5zZm9ybSBzdHJlYW1cbiAqIG9yIGEgc2luZ2xlIG9uZS5cbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cbkJhc2UucHJvdG90eXBlLnJlZ2lzdGVyVHJhbnNmb3JtU3RyZWFtID0gZnVuY3Rpb24gKHN0cmVhbXMpIHtcbiAgYXNzZXJ0KHN0cmVhbXMsICdleHBlY3RlZCB0byByZWNlaXZlIGEgdHJhbnNmb3JtIHN0cmVhbSBhcyBwYXJhbWV0ZXInKTtcbiAgaWYgKCFfLmlzQXJyYXkoc3RyZWFtcykpIHtcbiAgICBzdHJlYW1zID0gW3N0cmVhbXNdO1xuICB9XG4gIHRoaXMuX3RyYW5zZm9ybVN0cmVhbXMgPSB0aGlzLl90cmFuc2Zvcm1TdHJlYW1zLmNvbmNhdChzdHJlYW1zKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFdyaXRlIG1lbW9yeSBmcyBmaWxlIHRvIGRpc2sgYW5kIGxvZ2dpbmcgcmVzdWx0c1xuICogQHBhcmFtIHtGdW5jdGlvbn0gZG9uZSAtIGNhbGxiYWNrIG9uY2UgZmlsZXMgYXJlIHdyaXR0ZW5cbiAqL1xuQmFzZS5wcm90b3R5cGUuX3dyaXRlRmlsZXMgPSBmdW5jdGlvbiAoZG9uZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIGNvbmZsaWN0Q2hlY2tlciA9IHRocm91Z2gub2JqKGZ1bmN0aW9uIChmaWxlLCBlbmMsIGNiKSB7XG4gICAgdmFyIHN0cmVhbSA9IHRoaXM7XG5cbiAgICAvLyBJZiB0aGUgZmlsZSBoYXMgbm8gc3RhdGUgcmVxdWlyaW5nIGFjdGlvbiwgbW92ZSBvblxuICAgIGlmIChmaWxlLnN0YXRlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gY2IoKTtcbiAgICB9XG5cbiAgICAvLyBDb25maWcgZmlsZSBzaG91bGQgbm90IGJlIHByb2Nlc3NlZCBieSB0aGUgY29uZmxpY3Rlci4gSnVzdCBwYXNzIHRocm91Z2hcbiAgICB2YXIgZmlsZW5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGUucGF0aCk7XG5cbiAgICBpZiAoZmlsZW5hbWUgPT09ICcueW8tcmMuanNvbicgfHwgZmlsZW5hbWUgPT09ICcueW8tcmMtZ2xvYmFsLmpzb24nKSB7XG4gICAgICB0aGlzLnB1c2goZmlsZSk7XG4gICAgICByZXR1cm4gY2IoKTtcbiAgICB9XG5cbiAgICBzZWxmLmNvbmZsaWN0ZXIuY2hlY2tGb3JDb2xsaXNpb24oZmlsZS5wYXRoLCBmaWxlLmNvbnRlbnRzLCBmdW5jdGlvbiAoZXJyLCBzdGF0dXMpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgY2IoZXJyKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoc3RhdHVzID09PSAnc2tpcCcpIHtcbiAgICAgICAgZGVsZXRlIGZpbGUuc3RhdGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHJlYW0ucHVzaChmaWxlKTtcbiAgICAgIH1cblxuICAgICAgY2IoKTtcbiAgICB9KTtcbiAgICBzZWxmLmNvbmZsaWN0ZXIucmVzb2x2ZSgpO1xuICB9KTtcblxuICB2YXIgdHJhbnNmb3JtU3RyZWFtcyA9IHRoaXMuX3RyYW5zZm9ybVN0cmVhbXMuY29uY2F0KFtjb25mbGljdENoZWNrZXJdKTtcbiAgdGhpcy5mcy5jb21taXQodHJhbnNmb3JtU3RyZWFtcywgZnVuY3Rpb24gKCkge1xuICAgIGRvbmUoKTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIEV4dGVuZCB0aGUgR2VuZXJhdG9yIGNsYXNzIHRvIGNyZWF0ZSBhIG5ldyBvbmUgaW5oZXJpdGhpbmcgdGhlIGJhc2Ugb25lLiBUaGlzXG4gKiBtZXRob2QgaXMgdXNlZnVsIGlmIHlvdXIgZW52aXJvbm1lbnQgZG8gbm90IHN1cG9ydCB0aGUgRVM2IGNsYXNzZXMuXG4gKiBAcGFyYW0gIHtPYmplY3R9IHByb3RvUHJvcHMgIFByb3RvdHlwZSBwcm9wZXJ0aWVzIChhdmFpbGFibGUgb24gdGhlIGluc3RhbmNlcylcbiAqIEBwYXJhbSAge09iamVjdH0gc3RhdGljUHJvcHMgU3RhdGljIHByb3BlcnRpZXMgKGF2YWlsYWJsZSBvbiB0aGUgY29udHJ1Y3RvcilcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICAgICAgTmV3IHN1YiBjbGFzc1xuICogQGV4YW1wbGVcbiAqIHZhciBHZW5lcmF0b3IgPSByZXF1aXJlKCd5ZW9tYW4tZ2VuZXJhdG9yJyk7XG4gKiBtb2R1bGUuZXhwb3J0cyA9IEdlbmVyYXRvci5leHRlbmQoe1xuICogICB3cml0aW5nOiBmdW5jdGlvbiAoKSB7fVxuICogICAvLyAuLi5cbiAqIH0pO1xuICovXG5CYXNlLmV4dGVuZCA9IHJlcXVpcmUoJ2NsYXNzLWV4dGVuZCcpLmV4dGVuZDtcbiJdfQ==