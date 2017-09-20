/*
 * EJS Embedded JavaScript templates
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/
'use strict';
/**
 * @file Embedded JavaScript templating engine. {@link http://ejs.co}
 * @author Matthew Eernisse <mde@fleegix.org>
 * @author Tiancheng "Timothy" Gu <timothygu99@gmail.com>
 * @project EJS
 * @license {@link http://www.apache.org/licenses/LICENSE-2.0 Apache License, Version 2.0}
 */
/**
 * EJS internal functions.
 *
 * Technically this "module" lies in the same file as {@link module:ejs}, for
 * the sake of organization all the private functions re grouped into this
 * module.
 *
 * @module ejs-internal
 * @private
 */
/**
 * Embedded JavaScript templating engine.
 *
 * @module ejs
 * @public
 */
var fs = require('fs');
var path = require('path');
var utils = require('./utils');
var scopeOptionWarned = false;
var _VERSION_STRING = require('../package.json').version;
var _DEFAULT_DELIMITER = '%';
var _DEFAULT_LOCALS_NAME = 'locals';
var _NAME = 'ejs';
var _REGEX_STRING = '(<%%|%%>|<%=|<%-|<%_|<%#|<%|%>|-%>|_%>)';
var _OPTS = ['delimiter', 'scope', 'context', 'debug', 'compileDebug',
    'client', '_with', 'rmWhitespace', 'strict', 'filename'];
// We don't allow 'cache' option to be passed in the data obj
// for the normal `render` call, but this is where Express puts it
// so we make an exception for `renderFile`
var _OPTS_EXPRESS = _OPTS.concat('cache');
var _BOM = /^\uFEFF/;
/**
 * EJS template function cache. This can be a LRU object from lru-cache NPM
 * module. By default, it is {@link module:utils.cache}, a simple in-process
 * cache that grows continuously.
 *
 * @type {Cache}
 */
exports.cache = utils.cache;
/**
 * Custom file loader. Useful for template preprocessing or restricting access
 * to a certain part of the filesystem.
 *
 * @type {fileLoader}
 */
exports.fileLoader = fs.readFileSync;
/**
 * Name of the object containing the locals.
 *
 * This variable is overridden by {@link Options}`.localsName` if it is not
 * `undefined`.
 *
 * @type {String}
 * @public
 */
exports.localsName = _DEFAULT_LOCALS_NAME;
/**
 * Get the path to the included file from the parent file path and the
 * specified path.
 *
 * @param {String}  name     specified path
 * @param {String}  filename parent file path
 * @param {Boolean} isDir    parent file path whether is directory
 * @return {String}
 */
exports.resolveInclude = function (name, filename, isDir) {
    var dirname = path.dirname;
    var extname = path.extname;
    var resolve = path.resolve;
    var includePath = resolve(isDir ? filename : dirname(filename), name);
    var ext = extname(name);
    if (!ext) {
        includePath += '.ejs';
    }
    return includePath;
};
/**
 * Get the path to the included file by Options
 *
 * @param  {String}  path    specified path
 * @param  {Options} options compilation options
 * @return {String}
 */
function getIncludePath(path, options) {
    var includePath;
    var filePath;
    var views = options.views;
    // Abs path
    if (path.charAt(0) == '/') {
        includePath = exports.resolveInclude(path.replace(/^\/*/, ''), options.root || '/', true);
    }
    else {
        // Look relative to a passed filename first
        if (options.filename) {
            filePath = exports.resolveInclude(path, options.filename);
            if (fs.existsSync(filePath)) {
                includePath = filePath;
            }
        }
        // Then look in any views directories
        if (!includePath) {
            if (Array.isArray(views) && views.some(function (v) {
                filePath = exports.resolveInclude(path, v, true);
                return fs.existsSync(filePath);
            })) {
                includePath = filePath;
            }
        }
        if (!includePath) {
            throw new Error('Could not find include include file.');
        }
    }
    return includePath;
}
/**
 * Get the template from a string or a file, either compiled on-the-fly or
 * read from cache (if enabled), and cache the template if needed.
 *
 * If `template` is not set, the file specified in `options.filename` will be
 * read.
 *
 * If `options.cache` is true, this function reads the file from
 * `options.filename` so it must be set prior to calling this function.
 *
 * @memberof module:ejs-internal
 * @param {Options} options   compilation options
 * @param {String} [template] template source
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `options.client`, either type might be returned.
 * @static
 */
function handleCache(options, template) {
    var func;
    var filename = options.filename;
    var hasTemplate = arguments.length > 1;
    if (options.cache) {
        if (!filename) {
            throw new Error('cache option requires a filename');
        }
        func = exports.cache.get(filename);
        if (func) {
            return func;
        }
        if (!hasTemplate) {
            template = fileLoader(filename).toString().replace(_BOM, '');
        }
    }
    else if (!hasTemplate) {
        // istanbul ignore if: should not happen at all
        if (!filename) {
            throw new Error('Internal EJS error: no file name or template '
                + 'provided');
        }
        template = fileLoader(filename).toString().replace(_BOM, '');
    }
    func = exports.compile(template, options);
    if (options.cache) {
        exports.cache.set(filename, func);
    }
    return func;
}
/**
 * Try calling handleCache with the given options and data and call the
 * callback with the result. If an error occurs, call the callback with
 * the error. Used by renderFile().
 *
 * @memberof module:ejs-internal
 * @param {Options} options    compilation options
 * @param {Object} data        template data
 * @param {RenderFileCallback} cb callback
 * @static
 */
function tryHandleCache(options, data, cb) {
    var result;
    try {
        result = handleCache(options)(data);
    }
    catch (err) {
        return cb(err);
    }
    return cb(null, result);
}
/**
 * fileLoader is independent
 *
 * @param {String} filePath ejs file path.
 * @return {String} The contents of the specified file.
 * @static
 */
function fileLoader(filePath) {
    return exports.fileLoader(filePath);
}
/**
 * Get the template function.
 *
 * If `options.cache` is `true`, then the template is cached.
 *
 * @memberof module:ejs-internal
 * @param {String}  path    path for the specified file
 * @param {Options} options compilation options
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `options.client`, either type might be returned
 * @static
 */
function includeFile(path, options) {
    var opts = utils.shallowCopy({}, options);
    opts.filename = getIncludePath(path, opts);
    return handleCache(opts);
}
/**
 * Get the JavaScript source of an included file.
 *
 * @memberof module:ejs-internal
 * @param {String}  path    path for the specified file
 * @param {Options} options compilation options
 * @return {Object}
 * @static
 */
function includeSource(path, options) {
    var opts = utils.shallowCopy({}, options);
    var includePath;
    var template;
    includePath = getIncludePath(path, opts);
    template = fileLoader(includePath).toString().replace(_BOM, '');
    opts.filename = includePath;
    var templ = new Template(template, opts);
    templ.generateSource();
    return {
        source: templ.source,
        filename: includePath,
        template: template
    };
}
/**
 * Re-throw the given `err` in context to the `str` of ejs, `filename`, and
 * `lineno`.
 *
 * @implements RethrowCallback
 * @memberof module:ejs-internal
 * @param {Error}  err      Error object
 * @param {String} str      EJS source
 * @param {String} filename file name of the EJS file
 * @param {String} lineno   line number of the error
 * @static
 */
function rethrow(err, str, flnm, lineno, esc) {
    var lines = str.split('\n');
    var start = Math.max(lineno - 3, 0);
    var end = Math.min(lines.length, lineno + 3);
    var filename = esc(flnm); // eslint-disable-line
    // Error context
    var context = lines.slice(start, end).map(function (line, i) {
        var curr = i + start + 1;
        return (curr == lineno ? ' >> ' : '    ')
            + curr
            + '| '
            + line;
    }).join('\n');
    // Alter exception message
    err.path = filename;
    err.message = (filename || 'ejs') + ':'
        + lineno + '\n'
        + context + '\n\n'
        + err.message;
    throw err;
}
function stripSemi(str) {
    return str.replace(/;(\s*$)/, '$1');
}
/**
 * Compile the given `str` of ejs into a template function.
 *
 * @param {String}  template EJS template
 *
 * @param {Options} opts     compilation options
 *
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `opts.client`, either type might be returned.
 * @public
 */
exports.compile = function compile(template, opts) {
    var templ;
    // v1 compat
    // 'scope' is 'context'
    // FIXME: Remove this in a future version
    if (opts && opts.scope) {
        if (!scopeOptionWarned) {
            console.warn('`scope` option is deprecated and will be removed in EJS 3');
            scopeOptionWarned = true;
        }
        if (!opts.context) {
            opts.context = opts.scope;
        }
        delete opts.scope;
    }
    templ = new Template(template, opts);
    return templ.compile();
};
/**
 * Render the given `template` of ejs.
 *
 * If you would like to include options but not data, you need to explicitly
 * call this function with `data` being an empty object or `null`.
 *
 * @param {String}   template EJS template
 * @param {Object}  [data={}] template data
 * @param {Options} [opts={}] compilation and rendering options
 * @return {String}
 * @public
 */
exports.render = function (template, d, o) {
    var data = d || {};
    var opts = o || {};
    // No options object -- if there are optiony names
    // in the data, copy them to options
    if (arguments.length == 2) {
        utils.shallowCopyFromList(opts, data, _OPTS);
    }
    return handleCache(opts, template)(data);
};
/**
 * Render an EJS file at the given `path` and callback `cb(err, str)`.
 *
 * If you would like to include options but not data, you need to explicitly
 * call this function with `data` being an empty object or `null`.
 *
 * @param {String}             path     path to the EJS file
 * @param {Object}            [data={}] template data
 * @param {Options}           [opts={}] compilation and rendering options
 * @param {RenderFileCallback} cb callback
 * @public
 */
exports.renderFile = function () {
    var filename = arguments[0];
    var cb = arguments[arguments.length - 1];
    var opts = { filename: filename };
    var data;
    if (arguments.length > 2) {
        data = arguments[1];
        // No options object -- if there are optiony names
        // in the data, copy them to options
        if (arguments.length === 3) {
            // Express 4
            if (data.settings) {
                if (data.settings['view options']) {
                    utils.shallowCopyFromList(opts, data.settings['view options'], _OPTS_EXPRESS);
                }
                if (data.settings.views) {
                    opts.views = data.settings.views;
                }
            }
            else {
                utils.shallowCopyFromList(opts, data, _OPTS_EXPRESS);
            }
        }
        else {
            // Use shallowCopy so we don't pollute passed in opts obj with new vals
            utils.shallowCopy(opts, arguments[2]);
        }
        opts.filename = filename;
    }
    else {
        data = {};
    }
    return tryHandleCache(opts, data, cb);
};
/**
 * Clear intermediate JavaScript cache. Calls {@link Cache#reset}.
 * @public
 */
exports.clearCache = function () {
    exports.cache.reset();
};
function Template(text, opts) {
    opts = opts || {};
    var options = {};
    this.templateText = text;
    this.mode = null;
    this.truncate = false;
    this.currentLine = 1;
    this.source = '';
    this.dependencies = [];
    options.client = opts.client || false;
    options.escapeFunction = opts.escape || utils.escapeXML;
    options.compileDebug = opts.compileDebug !== false;
    options.debug = !!opts.debug;
    options.filename = opts.filename;
    options.delimiter = opts.delimiter || exports.delimiter || _DEFAULT_DELIMITER;
    options.strict = opts.strict || false;
    options.context = opts.context;
    options.cache = opts.cache || false;
    options.rmWhitespace = opts.rmWhitespace;
    options.root = opts.root;
    options.localsName = opts.localsName || exports.localsName || _DEFAULT_LOCALS_NAME;
    options.views = opts.views;
    if (options.strict) {
        options._with = false;
    }
    else {
        options._with = typeof opts._with != 'undefined' ? opts._with : true;
    }
    this.opts = options;
    this.regex = this.createRegex();
}
Template.modes = {
    EVAL: 'eval',
    ESCAPED: 'escaped',
    RAW: 'raw',
    COMMENT: 'comment',
    LITERAL: 'literal'
};
Template.prototype = {
    createRegex: function () {
        var str = _REGEX_STRING;
        var delim = utils.escapeRegExpChars(this.opts.delimiter);
        str = str.replace(/%/g, delim);
        return new RegExp(str);
    },
    compile: function () {
        var src;
        var fn;
        var opts = this.opts;
        var prepended = '';
        var appended = '';
        var escapeFn = opts.escapeFunction;
        if (!this.source) {
            this.generateSource();
            prepended += '  var __output = [], __append = __output.push.bind(__output);' + '\n';
            if (opts._with !== false) {
                prepended += '  with (' + opts.localsName + ' || {}) {' + '\n';
                appended += '  }' + '\n';
            }
            appended += '  return __output.join("");' + '\n';
            this.source = prepended + this.source + appended;
        }
        if (opts.compileDebug) {
            src = 'var __line = 1' + '\n'
                + '  , __lines = ' + JSON.stringify(this.templateText) + '\n'
                + '  , __filename = ' + (opts.filename ?
                JSON.stringify(opts.filename) : 'undefined') + ';' + '\n'
                + 'try {' + '\n'
                + this.source
                + '} catch (e) {' + '\n'
                + '  rethrow(e, __lines, __filename, __line, escapeFn);' + '\n'
                + '}' + '\n';
        }
        else {
            src = this.source;
        }
        if (opts.client) {
            src = 'escapeFn = escapeFn || ' + escapeFn.toString() + ';' + '\n' + src;
            if (opts.compileDebug) {
                src = 'rethrow = rethrow || ' + rethrow.toString() + ';' + '\n' + src;
            }
        }
        if (opts.strict) {
            src = '"use strict";\n' + src;
        }
        if (opts.debug) {
            console.log(src);
        }
        try {
            fn = new Function(opts.localsName + ', escapeFn, include, rethrow', src);
        }
        catch (e) {
            // istanbul ignore else
            if (e instanceof SyntaxError) {
                if (opts.filename) {
                    e.message += ' in ' + opts.filename;
                }
                e.message += ' while compiling ejs\n\n';
                e.message += 'If the above error is not helpful, you may want to try EJS-Lint:\n';
                e.message += 'https://github.com/RyanZim/EJS-Lint';
            }
            throw e;
        }
        if (opts.client) {
            fn.dependencies = this.dependencies;
            return fn;
        }
        // Return a callable function which will execute the function
        // created by the source-code, with the passed data as locals
        // Adds a local `include` function which allows full recursive include
        var returnedFn = function (data) {
            var include = function (path, includeData) {
                var d = utils.shallowCopy({}, data);
                if (includeData) {
                    d = utils.shallowCopy(d, includeData);
                }
                return includeFile(path, opts)(d);
            };
            return fn.apply(opts.context, [data || {}, escapeFn, include, rethrow]);
        };
        returnedFn.dependencies = this.dependencies;
        return returnedFn;
    },
    generateSource: function () {
        var opts = this.opts;
        if (opts.rmWhitespace) {
            // Have to use two separate replace here as `^` and `$` operators don't
            // work well with `\r`.
            this.templateText =
                this.templateText.replace(/\r/g, '').replace(/^\s+|\s+$/gm, '');
        }
        // Slurp spaces and tabs before <%_ and after _%>
        this.templateText =
            this.templateText.replace(/[ \t]*<%_/gm, '<%_').replace(/_%>[ \t]*/gm, '_%>');
        var self = this;
        var matches = this.parseTemplateText();
        var d = this.opts.delimiter;
        if (matches && matches.length) {
            matches.forEach(function (line, index) {
                var opening;
                var closing;
                var include;
                var includeOpts;
                var includeObj;
                var includeSrc;
                // If this is an opening tag, check for closing tags
                // FIXME: May end up with some false positives here
                // Better to store modes as k/v with '<' + delimiter as key
                // Then this can simply check against the map
                if (line.indexOf('<' + d) === 0 // If it is a tag
                    && line.indexOf('<' + d + d) !== 0) {
                    closing = matches[index + 2];
                    if (!(closing == d + '>' || closing == '-' + d + '>' || closing == '_' + d + '>')) {
                        throw new Error('Could not find matching close tag for "' + line + '".');
                    }
                }
                // HACK: backward-compat `include` preprocessor directives
                if ((include = line.match(/^\s*include\s+(\S+)/))) {
                    opening = matches[index - 1];
                    // Must be in EVAL or RAW mode
                    if (opening && (opening == '<' + d || opening == '<' + d + '-' || opening == '<' + d + '_')) {
                        includeOpts = utils.shallowCopy({}, self.opts);
                        includeObj = includeSource(include[1], includeOpts);
                        if (self.opts.compileDebug) {
                            includeSrc =
                                '    ; (function(){' + '\n'
                                    + '      var __line = 1' + '\n'
                                    + '      , __lines = ' + JSON.stringify(includeObj.template) + '\n'
                                    + '      , __filename = ' + JSON.stringify(includeObj.filename) + ';' + '\n'
                                    + '      try {' + '\n'
                                    + includeObj.source
                                    + '      } catch (e) {' + '\n'
                                    + '        rethrow(e, __lines, __filename, __line, escapeFn);' + '\n'
                                    + '      }' + '\n'
                                    + '    ; }).call(this)' + '\n';
                        }
                        else {
                            includeSrc = '    ; (function(){' + '\n' + includeObj.source +
                                '    ; }).call(this)' + '\n';
                        }
                        self.source += includeSrc;
                        self.dependencies.push(exports.resolveInclude(include[1], includeOpts.filename));
                        return;
                    }
                }
                self.scanLine(line);
            });
        }
    },
    parseTemplateText: function () {
        var str = this.templateText;
        var pat = this.regex;
        var result = pat.exec(str);
        var arr = [];
        var firstPos;
        while (result) {
            firstPos = result.index;
            if (firstPos !== 0) {
                arr.push(str.substring(0, firstPos));
                str = str.slice(firstPos);
            }
            arr.push(result[0]);
            str = str.slice(result[0].length);
            result = pat.exec(str);
        }
        if (str) {
            arr.push(str);
        }
        return arr;
    },
    _addOutput: function (line) {
        if (this.truncate) {
            // Only replace single leading linebreak in the line after
            // -%> tag -- this is the single, trailing linebreak
            // after the tag that the truncation mode replaces
            // Handle Win / Unix / old Mac linebreaks -- do the \r\n
            // combo first in the regex-or
            line = line.replace(/^(?:\r\n|\r|\n)/, '');
            this.truncate = false;
        }
        else if (this.opts.rmWhitespace) {
            // rmWhitespace has already removed trailing spaces, just need
            // to remove linebreaks
            line = line.replace(/^\n/, '');
        }
        if (!line) {
            return line;
        }
        // Preserve literal slashes
        line = line.replace(/\\/g, '\\\\');
        // Convert linebreaks
        line = line.replace(/\n/g, '\\n');
        line = line.replace(/\r/g, '\\r');
        // Escape double-quotes
        // - this will be the delimiter during execution
        line = line.replace(/"/g, '\\"');
        this.source += '    ; __append("' + line + '")' + '\n';
    },
    scanLine: function (line) {
        var self = this;
        var d = this.opts.delimiter;
        var newLineCount = 0;
        newLineCount = (line.split('\n').length - 1);
        switch (line) {
            case '<' + d:
            case '<' + d + '_':
                this.mode = Template.modes.EVAL;
                break;
            case '<' + d + '=':
                this.mode = Template.modes.ESCAPED;
                break;
            case '<' + d + '-':
                this.mode = Template.modes.RAW;
                break;
            case '<' + d + '#':
                this.mode = Template.modes.COMMENT;
                break;
            case '<' + d + d:
                this.mode = Template.modes.LITERAL;
                this.source += '    ; __append("' + line.replace('<' + d + d, '<' + d) + '")' + '\n';
                break;
            case d + d + '>':
                this.mode = Template.modes.LITERAL;
                this.source += '    ; __append("' + line.replace(d + d + '>', d + '>') + '")' + '\n';
                break;
            case d + '>':
            case '-' + d + '>':
            case '_' + d + '>':
                if (this.mode == Template.modes.LITERAL) {
                    this._addOutput(line);
                }
                this.mode = null;
                this.truncate = line.indexOf('-') === 0 || line.indexOf('_') === 0;
                break;
            default:
                // In script mode, depends on type of tag
                if (this.mode) {
                    // If '//' is found without a line break, add a line break.
                    switch (this.mode) {
                        case Template.modes.EVAL:
                        case Template.modes.ESCAPED:
                        case Template.modes.RAW:
                            if (line.lastIndexOf('//') > line.lastIndexOf('\n')) {
                                line += '\n';
                            }
                    }
                    switch (this.mode) {
                        // Just executing code
                        case Template.modes.EVAL:
                            this.source += '    ; ' + line + '\n';
                            break;
                        // Exec, esc, and output
                        case Template.modes.ESCAPED:
                            this.source += '    ; __append(escapeFn(' + stripSemi(line) + '))' + '\n';
                            break;
                        // Exec and output
                        case Template.modes.RAW:
                            this.source += '    ; __append(' + stripSemi(line) + ')' + '\n';
                            break;
                        case Template.modes.COMMENT:
                            // Do nothing
                            break;
                        // Literal <%% mode, append as raw output
                        case Template.modes.LITERAL:
                            this._addOutput(line);
                            break;
                    }
                }
                else {
                    this._addOutput(line);
                }
        }
        if (self.opts.compileDebug && newLineCount) {
            this.currentLine += newLineCount;
            this.source += '    ; __line = ' + this.currentLine + '\n';
        }
    }
};
/**
 * Escape characters reserved in XML.
 *
 * This is simply an export of {@link module:utils.escapeXML}.
 *
 * If `markup` is `undefined` or `null`, the empty string is returned.
 *
 * @param {String} markup Input string
 * @return {String} Escaped string
 * @public
 * @func
 * */
exports.escapeXML = utils.escapeXML;
/**
 * Express.js support.
 *
 * This is an alias for {@link module:ejs.renderFile}, in order to support
 * Express.js out-of-the-box.
 *
 * @func
 */
exports.__express = exports.renderFile;
// Add require support
/* istanbul ignore else */
if (require.extensions) {
    require.extensions['.ejs'] = function (module, flnm) {
        var filename = flnm || /* istanbul ignore next */ module.filename;
        var options = {
            filename: filename,
            client: true
        };
        var template = fileLoader(filename).toString();
        var fn = exports.compile(template, options);
        module._compile('module.exports = ' + fn.toString() + ';', filename);
    };
}
/**
 * Version of EJS.
 *
 * @readonly
 * @type {String}
 * @public
 */
exports.VERSION = _VERSION_STRING;
/**
 * Name for detection of EJS.
 *
 * @readonly
 * @type {String}
 * @public
 */
exports.name = _NAME;
/* istanbul ignore if */
if (typeof window != 'undefined') {
    window.ejs = exports;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxlanNcXGxpYlxcZWpzLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXGVqc1xcbGliXFxlanMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7RUFnQkU7QUFFRixZQUFZLENBQUM7QUFFYjs7Ozs7O0dBTUc7QUFFSDs7Ozs7Ozs7O0dBU0c7QUFFSDs7Ozs7R0FLRztBQUVILElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN2QixJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDM0IsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBRS9CLElBQUksaUJBQWlCLEdBQUcsS0FBSyxDQUFDO0FBQzlCLElBQUksZUFBZSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN6RCxJQUFJLGtCQUFrQixHQUFHLEdBQUcsQ0FBQztBQUM3QixJQUFJLG9CQUFvQixHQUFHLFFBQVEsQ0FBQztBQUNwQyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7QUFDbEIsSUFBSSxhQUFhLEdBQUcseUNBQXlDLENBQUM7QUFDOUQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsY0FBYztJQUNuRSxRQUFRLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDM0QsNkRBQTZEO0FBQzdELGtFQUFrRTtBQUNsRSwy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QU8sTUFBTSxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDakMsTUFBTSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUM7QUFDdkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBFSlMgRW1iZWRkZWQgSmF2YVNjcmlwdCB0ZW1wbGF0ZXNcbiAqIENvcHlyaWdodCAyMTEyIE1hdHRoZXcgRWVybmlzc2UgKG1kZUBmbGVlZ2l4Lm9yZylcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAZmlsZSBFbWJlZGRlZCBKYXZhU2NyaXB0IHRlbXBsYXRpbmcgZW5naW5lLiB7QGxpbmsgaHR0cDovL2Vqcy5jb31cbiAqIEBhdXRob3IgTWF0dGhldyBFZXJuaXNzZSA8bWRlQGZsZWVnaXgub3JnPlxuICogQGF1dGhvciBUaWFuY2hlbmcgXCJUaW1vdGh5XCIgR3UgPHRpbW90aHlndTk5QGdtYWlsLmNvbT5cbiAqIEBwcm9qZWN0IEVKU1xuICogQGxpY2Vuc2Uge0BsaW5rIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjB9XG4gKi9cblxuLyoqXG4gKiBFSlMgaW50ZXJuYWwgZnVuY3Rpb25zLlxuICpcbiAqIFRlY2huaWNhbGx5IHRoaXMgXCJtb2R1bGVcIiBsaWVzIGluIHRoZSBzYW1lIGZpbGUgYXMge0BsaW5rIG1vZHVsZTplanN9LCBmb3JcbiAqIHRoZSBzYWtlIG9mIG9yZ2FuaXphdGlvbiBhbGwgdGhlIHByaXZhdGUgZnVuY3Rpb25zIHJlIGdyb3VwZWQgaW50byB0aGlzXG4gKiBtb2R1bGUuXG4gKlxuICogQG1vZHVsZSBlanMtaW50ZXJuYWxcbiAqIEBwcml2YXRlXG4gKi9cblxuLyoqXG4gKiBFbWJlZGRlZCBKYXZhU2NyaXB0IHRlbXBsYXRpbmcgZW5naW5lLlxuICpcbiAqIEBtb2R1bGUgZWpzXG4gKiBAcHVibGljXG4gKi9cblxudmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgc2NvcGVPcHRpb25XYXJuZWQgPSBmYWxzZTtcbnZhciBfVkVSU0lPTl9TVFJJTkcgPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKS52ZXJzaW9uO1xudmFyIF9ERUZBVUxUX0RFTElNSVRFUiA9ICclJztcbnZhciBfREVGQVVMVF9MT0NBTFNfTkFNRSA9ICdsb2NhbHMnO1xudmFyIF9OQU1FID0gJ2Vqcyc7XG52YXIgX1JFR0VYX1NUUklORyA9ICcoPCUlfCUlPnw8JT18PCUtfDwlX3w8JSN8PCV8JT58LSU+fF8lPiknO1xudmFyIF9PUFRTID0gWydkZWxpbWl0ZXInLCAnc2NvcGUnLCAnY29udGV4dCcsICdkZWJ1ZycsICdjb21waWxlRGVidWcnLFxuICAnY2xpZW50JywgJ193aXRoJywgJ3JtV2hpdGVzcGFjZScsICdzdHJpY3QnLCAnZmlsZW5hbWUnXTtcbi8vIFdlIGRvbid0IGFsbG93ICdjYWNoZScgb3B0aW9uIHRvIGJlIHBhc3NlZCBpbiB0aGUgZGF0YSBvYmpcbi8vIGZvciB0aGUgbm9ybWFsIGByZW5kZXJgIGNhbGwsIGJ1dCB0aGlzIGlzIHdoZXJlIEV4cHJlc3MgcHV0cyBpdFxuLy8gc28gd2UgbWFrZSBhbiBleGNlcHRpb24gZm9yIGByZW5kZXJGaWxlYFxudmFyIF9PUFRTX0VYUFJFU1MgPSBfT1BUUy5jb25jYXQoJ2NhY2hlJyk7XG52YXIgX0JPTSA9IC9eXFx1RkVGRi87XG5cbi8qKlxuICogRUpTIHRlbXBsYXRlIGZ1bmN0aW9uIGNhY2hlLiBUaGlzIGNhbiBiZSBhIExSVSBvYmplY3QgZnJvbSBscnUtY2FjaGUgTlBNXG4gKiBtb2R1bGUuIEJ5IGRlZmF1bHQsIGl0IGlzIHtAbGluayBtb2R1bGU6dXRpbHMuY2FjaGV9LCBhIHNpbXBsZSBpbi1wcm9jZXNzXG4gKiBjYWNoZSB0aGF0IGdyb3dzIGNvbnRpbnVvdXNseS5cbiAqXG4gKiBAdHlwZSB7Q2FjaGV9XG4gKi9cblxuZXhwb3J0cy5jYWNoZSA9IHV0aWxzLmNhY2hlO1xuXG4vKipcbiAqIEN1c3RvbSBmaWxlIGxvYWRlci4gVXNlZnVsIGZvciB0ZW1wbGF0ZSBwcmVwcm9jZXNzaW5nIG9yIHJlc3RyaWN0aW5nIGFjY2Vzc1xuICogdG8gYSBjZXJ0YWluIHBhcnQgb2YgdGhlIGZpbGVzeXN0ZW0uXG4gKlxuICogQHR5cGUge2ZpbGVMb2FkZXJ9XG4gKi9cblxuZXhwb3J0cy5maWxlTG9hZGVyID0gZnMucmVhZEZpbGVTeW5jO1xuXG4vKipcbiAqIE5hbWUgb2YgdGhlIG9iamVjdCBjb250YWluaW5nIHRoZSBsb2NhbHMuXG4gKlxuICogVGhpcyB2YXJpYWJsZSBpcyBvdmVycmlkZGVuIGJ5IHtAbGluayBPcHRpb25zfWAubG9jYWxzTmFtZWAgaWYgaXQgaXMgbm90XG4gKiBgdW5kZWZpbmVkYC5cbiAqXG4gKiBAdHlwZSB7U3RyaW5nfVxuICogQHB1YmxpY1xuICovXG5cbmV4cG9ydHMubG9jYWxzTmFtZSA9IF9ERUZBVUxUX0xPQ0FMU19OQU1FO1xuXG4vKipcbiAqIEdldCB0aGUgcGF0aCB0byB0aGUgaW5jbHVkZWQgZmlsZSBmcm9tIHRoZSBwYXJlbnQgZmlsZSBwYXRoIGFuZCB0aGVcbiAqIHNwZWNpZmllZCBwYXRoLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSAgbmFtZSAgICAgc3BlY2lmaWVkIHBhdGhcbiAqIEBwYXJhbSB7U3RyaW5nfSAgZmlsZW5hbWUgcGFyZW50IGZpbGUgcGF0aFxuICogQHBhcmFtIHtCb29sZWFufSBpc0RpciAgICBwYXJlbnQgZmlsZSBwYXRoIHdoZXRoZXIgaXMgZGlyZWN0b3J5XG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmV4cG9ydHMucmVzb2x2ZUluY2x1ZGUgPSBmdW5jdGlvbihuYW1lLCBmaWxlbmFtZSwgaXNEaXIpIHtcbiAgdmFyIGRpcm5hbWUgPSBwYXRoLmRpcm5hbWU7XG4gIHZhciBleHRuYW1lID0gcGF0aC5leHRuYW1lO1xuICB2YXIgcmVzb2x2ZSA9IHBhdGgucmVzb2x2ZTtcbiAgdmFyIGluY2x1ZGVQYXRoID0gcmVzb2x2ZShpc0RpciA/IGZpbGVuYW1lIDogZGlybmFtZShmaWxlbmFtZSksIG5hbWUpO1xuICB2YXIgZXh0ID0gZXh0bmFtZShuYW1lKTtcbiAgaWYgKCFleHQpIHtcbiAgICBpbmNsdWRlUGF0aCArPSAnLmVqcyc7XG4gIH1cbiAgcmV0dXJuIGluY2x1ZGVQYXRoO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHBhdGggdG8gdGhlIGluY2x1ZGVkIGZpbGUgYnkgT3B0aW9uc1xuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gIHBhdGggICAgc3BlY2lmaWVkIHBhdGhcbiAqIEBwYXJhbSAge09wdGlvbnN9IG9wdGlvbnMgY29tcGlsYXRpb24gb3B0aW9uc1xuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5mdW5jdGlvbiBnZXRJbmNsdWRlUGF0aChwYXRoLCBvcHRpb25zKSB7XG4gIHZhciBpbmNsdWRlUGF0aDtcbiAgdmFyIGZpbGVQYXRoO1xuICB2YXIgdmlld3MgPSBvcHRpb25zLnZpZXdzO1xuXG4gIC8vIEFicyBwYXRoXG4gIGlmIChwYXRoLmNoYXJBdCgwKSA9PSAnLycpIHtcbiAgICBpbmNsdWRlUGF0aCA9IGV4cG9ydHMucmVzb2x2ZUluY2x1ZGUocGF0aC5yZXBsYWNlKC9eXFwvKi8sJycpLCBvcHRpb25zLnJvb3QgfHwgJy8nLCB0cnVlKTtcbiAgfVxuICAvLyBSZWxhdGl2ZSBwYXRoc1xuICBlbHNlIHtcbiAgICAvLyBMb29rIHJlbGF0aXZlIHRvIGEgcGFzc2VkIGZpbGVuYW1lIGZpcnN0XG4gICAgaWYgKG9wdGlvbnMuZmlsZW5hbWUpIHtcbiAgICAgIGZpbGVQYXRoID0gZXhwb3J0cy5yZXNvbHZlSW5jbHVkZShwYXRoLCBvcHRpb25zLmZpbGVuYW1lKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZpbGVQYXRoKSkge1xuICAgICAgICBpbmNsdWRlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBUaGVuIGxvb2sgaW4gYW55IHZpZXdzIGRpcmVjdG9yaWVzXG4gICAgaWYgKCFpbmNsdWRlUGF0aCkge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmlld3MpICYmIHZpZXdzLnNvbWUoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgZmlsZVBhdGggPSBleHBvcnRzLnJlc29sdmVJbmNsdWRlKHBhdGgsIHYsIHRydWUpO1xuICAgICAgICByZXR1cm4gZnMuZXhpc3RzU3luYyhmaWxlUGF0aCk7XG4gICAgICB9KSkge1xuICAgICAgICBpbmNsdWRlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWluY2x1ZGVQYXRoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIGluY2x1ZGUgaW5jbHVkZSBmaWxlLicpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gaW5jbHVkZVBhdGg7XG59XG5cbi8qKlxuICogR2V0IHRoZSB0ZW1wbGF0ZSBmcm9tIGEgc3RyaW5nIG9yIGEgZmlsZSwgZWl0aGVyIGNvbXBpbGVkIG9uLXRoZS1mbHkgb3JcbiAqIHJlYWQgZnJvbSBjYWNoZSAoaWYgZW5hYmxlZCksIGFuZCBjYWNoZSB0aGUgdGVtcGxhdGUgaWYgbmVlZGVkLlxuICpcbiAqIElmIGB0ZW1wbGF0ZWAgaXMgbm90IHNldCwgdGhlIGZpbGUgc3BlY2lmaWVkIGluIGBvcHRpb25zLmZpbGVuYW1lYCB3aWxsIGJlXG4gKiByZWFkLlxuICpcbiAqIElmIGBvcHRpb25zLmNhY2hlYCBpcyB0cnVlLCB0aGlzIGZ1bmN0aW9uIHJlYWRzIHRoZSBmaWxlIGZyb21cbiAqIGBvcHRpb25zLmZpbGVuYW1lYCBzbyBpdCBtdXN0IGJlIHNldCBwcmlvciB0byBjYWxsaW5nIHRoaXMgZnVuY3Rpb24uXG4gKlxuICogQG1lbWJlcm9mIG1vZHVsZTplanMtaW50ZXJuYWxcbiAqIEBwYXJhbSB7T3B0aW9uc30gb3B0aW9ucyAgIGNvbXBpbGF0aW9uIG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbdGVtcGxhdGVdIHRlbXBsYXRlIHNvdXJjZVxuICogQHJldHVybiB7KFRlbXBsYXRlRnVuY3Rpb258Q2xpZW50RnVuY3Rpb24pfVxuICogRGVwZW5kaW5nIG9uIHRoZSB2YWx1ZSBvZiBgb3B0aW9ucy5jbGllbnRgLCBlaXRoZXIgdHlwZSBtaWdodCBiZSByZXR1cm5lZC5cbiAqIEBzdGF0aWNcbiAqL1xuXG5mdW5jdGlvbiBoYW5kbGVDYWNoZShvcHRpb25zLCB0ZW1wbGF0ZSkge1xuICB2YXIgZnVuYztcbiAgdmFyIGZpbGVuYW1lID0gb3B0aW9ucy5maWxlbmFtZTtcbiAgdmFyIGhhc1RlbXBsYXRlID0gYXJndW1lbnRzLmxlbmd0aCA+IDE7XG5cbiAgaWYgKG9wdGlvbnMuY2FjaGUpIHtcbiAgICBpZiAoIWZpbGVuYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhY2hlIG9wdGlvbiByZXF1aXJlcyBhIGZpbGVuYW1lJyk7XG4gICAgfVxuICAgIGZ1bmMgPSBleHBvcnRzLmNhY2hlLmdldChmaWxlbmFtZSk7XG4gICAgaWYgKGZ1bmMpIHtcbiAgICAgIHJldHVybiBmdW5jO1xuICAgIH1cbiAgICBpZiAoIWhhc1RlbXBsYXRlKSB7XG4gICAgICB0ZW1wbGF0ZSA9IGZpbGVMb2FkZXIoZmlsZW5hbWUpLnRvU3RyaW5nKCkucmVwbGFjZShfQk9NLCAnJyk7XG4gICAgfVxuICB9XG4gIGVsc2UgaWYgKCFoYXNUZW1wbGF0ZSkge1xuICAgIC8vIGlzdGFuYnVsIGlnbm9yZSBpZjogc2hvdWxkIG5vdCBoYXBwZW4gYXQgYWxsXG4gICAgaWYgKCFmaWxlbmFtZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnRlcm5hbCBFSlMgZXJyb3I6IG5vIGZpbGUgbmFtZSBvciB0ZW1wbGF0ZSAnXG4gICAgICAgICAgICAgICAgICAgICsgJ3Byb3ZpZGVkJyk7XG4gICAgfVxuICAgIHRlbXBsYXRlID0gZmlsZUxvYWRlcihmaWxlbmFtZSkudG9TdHJpbmcoKS5yZXBsYWNlKF9CT00sICcnKTtcbiAgfVxuICBmdW5jID0gZXhwb3J0cy5jb21waWxlKHRlbXBsYXRlLCBvcHRpb25zKTtcbiAgaWYgKG9wdGlvbnMuY2FjaGUpIHtcbiAgICBleHBvcnRzLmNhY2hlLnNldChmaWxlbmFtZSwgZnVuYyk7XG4gIH1cbiAgcmV0dXJuIGZ1bmM7XG59XG5cbi8qKlxuICogVHJ5IGNhbGxpbmcgaGFuZGxlQ2FjaGUgd2l0aCB0aGUgZ2l2ZW4gb3B0aW9ucyBhbmQgZGF0YSBhbmQgY2FsbCB0aGVcbiAqIGNhbGxiYWNrIHdpdGggdGhlIHJlc3VsdC4gSWYgYW4gZXJyb3Igb2NjdXJzLCBjYWxsIHRoZSBjYWxsYmFjayB3aXRoXG4gKiB0aGUgZXJyb3IuIFVzZWQgYnkgcmVuZGVyRmlsZSgpLlxuICpcbiAqIEBtZW1iZXJvZiBtb2R1bGU6ZWpzLWludGVybmFsXG4gKiBAcGFyYW0ge09wdGlvbnN9IG9wdGlvbnMgICAgY29tcGlsYXRpb24gb3B0aW9uc1xuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgICAgICAgIHRlbXBsYXRlIGRhdGFcbiAqIEBwYXJhbSB7UmVuZGVyRmlsZUNhbGxiYWNrfSBjYiBjYWxsYmFja1xuICogQHN0YXRpY1xuICovXG5cbmZ1bmN0aW9uIHRyeUhhbmRsZUNhY2hlKG9wdGlvbnMsIGRhdGEsIGNiKSB7XG4gIHZhciByZXN1bHQ7XG4gIHRyeSB7XG4gICAgcmVzdWx0ID0gaGFuZGxlQ2FjaGUob3B0aW9ucykoZGF0YSk7XG4gIH1cbiAgY2F0Y2ggKGVycikge1xuICAgIHJldHVybiBjYihlcnIpO1xuICB9XG4gIHJldHVybiBjYihudWxsLCByZXN1bHQpO1xufVxuXG4vKipcbiAqIGZpbGVMb2FkZXIgaXMgaW5kZXBlbmRlbnRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmlsZVBhdGggZWpzIGZpbGUgcGF0aC5cbiAqIEByZXR1cm4ge1N0cmluZ30gVGhlIGNvbnRlbnRzIG9mIHRoZSBzcGVjaWZpZWQgZmlsZS5cbiAqIEBzdGF0aWNcbiAqL1xuXG5mdW5jdGlvbiBmaWxlTG9hZGVyKGZpbGVQYXRoKXtcbiAgcmV0dXJuIGV4cG9ydHMuZmlsZUxvYWRlcihmaWxlUGF0aCk7XG59XG5cbi8qKlxuICogR2V0IHRoZSB0ZW1wbGF0ZSBmdW5jdGlvbi5cbiAqXG4gKiBJZiBgb3B0aW9ucy5jYWNoZWAgaXMgYHRydWVgLCB0aGVuIHRoZSB0ZW1wbGF0ZSBpcyBjYWNoZWQuXG4gKlxuICogQG1lbWJlcm9mIG1vZHVsZTplanMtaW50ZXJuYWxcbiAqIEBwYXJhbSB7U3RyaW5nfSAgcGF0aCAgICBwYXRoIGZvciB0aGUgc3BlY2lmaWVkIGZpbGVcbiAqIEBwYXJhbSB7T3B0aW9uc30gb3B0aW9ucyBjb21waWxhdGlvbiBvcHRpb25zXG4gKiBAcmV0dXJuIHsoVGVtcGxhdGVGdW5jdGlvbnxDbGllbnRGdW5jdGlvbil9XG4gKiBEZXBlbmRpbmcgb24gdGhlIHZhbHVlIG9mIGBvcHRpb25zLmNsaWVudGAsIGVpdGhlciB0eXBlIG1pZ2h0IGJlIHJldHVybmVkXG4gKiBAc3RhdGljXG4gKi9cblxuZnVuY3Rpb24gaW5jbHVkZUZpbGUocGF0aCwgb3B0aW9ucykge1xuICB2YXIgb3B0cyA9IHV0aWxzLnNoYWxsb3dDb3B5KHt9LCBvcHRpb25zKTtcbiAgb3B0cy5maWxlbmFtZSA9IGdldEluY2x1ZGVQYXRoKHBhdGgsIG9wdHMpO1xuICByZXR1cm4gaGFuZGxlQ2FjaGUob3B0cyk7XG59XG5cbi8qKlxuICogR2V0IHRoZSBKYXZhU2NyaXB0IHNvdXJjZSBvZiBhbiBpbmNsdWRlZCBmaWxlLlxuICpcbiAqIEBtZW1iZXJvZiBtb2R1bGU6ZWpzLWludGVybmFsXG4gKiBAcGFyYW0ge1N0cmluZ30gIHBhdGggICAgcGF0aCBmb3IgdGhlIHNwZWNpZmllZCBmaWxlXG4gKiBAcGFyYW0ge09wdGlvbnN9IG9wdGlvbnMgY29tcGlsYXRpb24gb3B0aW9uc1xuICogQHJldHVybiB7T2JqZWN0fVxuICogQHN0YXRpY1xuICovXG5cbmZ1bmN0aW9uIGluY2x1ZGVTb3VyY2UocGF0aCwgb3B0aW9ucykge1xuICB2YXIgb3B0cyA9IHV0aWxzLnNoYWxsb3dDb3B5KHt9LCBvcHRpb25zKTtcbiAgdmFyIGluY2x1ZGVQYXRoO1xuICB2YXIgdGVtcGxhdGU7XG4gIGluY2x1ZGVQYXRoID0gZ2V0SW5jbHVkZVBhdGgocGF0aCwgb3B0cyk7XG4gIHRlbXBsYXRlID0gZmlsZUxvYWRlcihpbmNsdWRlUGF0aCkudG9TdHJpbmcoKS5yZXBsYWNlKF9CT00sICcnKTtcbiAgb3B0cy5maWxlbmFtZSA9IGluY2x1ZGVQYXRoO1xuICB2YXIgdGVtcGwgPSBuZXcgVGVtcGxhdGUodGVtcGxhdGUsIG9wdHMpO1xuICB0ZW1wbC5nZW5lcmF0ZVNvdXJjZSgpO1xuICByZXR1cm4ge1xuICAgIHNvdXJjZTogdGVtcGwuc291cmNlLFxuICAgIGZpbGVuYW1lOiBpbmNsdWRlUGF0aCxcbiAgICB0ZW1wbGF0ZTogdGVtcGxhdGVcbiAgfTtcbn1cblxuLyoqXG4gKiBSZS10aHJvdyB0aGUgZ2l2ZW4gYGVycmAgaW4gY29udGV4dCB0byB0aGUgYHN0cmAgb2YgZWpzLCBgZmlsZW5hbWVgLCBhbmRcbiAqIGBsaW5lbm9gLlxuICpcbiAqIEBpbXBsZW1lbnRzIFJldGhyb3dDYWxsYmFja1xuICogQG1lbWJlcm9mIG1vZHVsZTplanMtaW50ZXJuYWxcbiAqIEBwYXJhbSB7RXJyb3J9ICBlcnIgICAgICBFcnJvciBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgICAgICBFSlMgc291cmNlXG4gKiBAcGFyYW0ge1N0cmluZ30gZmlsZW5hbWUgZmlsZSBuYW1lIG9mIHRoZSBFSlMgZmlsZVxuICogQHBhcmFtIHtTdHJpbmd9IGxpbmVubyAgIGxpbmUgbnVtYmVyIG9mIHRoZSBlcnJvclxuICogQHN0YXRpY1xuICovXG5cbmZ1bmN0aW9uIHJldGhyb3coZXJyLCBzdHIsIGZsbm0sIGxpbmVubywgZXNjKXtcbiAgdmFyIGxpbmVzID0gc3RyLnNwbGl0KCdcXG4nKTtcbiAgdmFyIHN0YXJ0ID0gTWF0aC5tYXgobGluZW5vIC0gMywgMCk7XG4gIHZhciBlbmQgPSBNYXRoLm1pbihsaW5lcy5sZW5ndGgsIGxpbmVubyArIDMpO1xuICB2YXIgZmlsZW5hbWUgPSBlc2MoZmxubSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgLy8gRXJyb3IgY29udGV4dFxuICB2YXIgY29udGV4dCA9IGxpbmVzLnNsaWNlKHN0YXJ0LCBlbmQpLm1hcChmdW5jdGlvbiAobGluZSwgaSl7XG4gICAgdmFyIGN1cnIgPSBpICsgc3RhcnQgKyAxO1xuICAgIHJldHVybiAoY3VyciA9PSBsaW5lbm8gPyAnID4+ICcgOiAnICAgICcpXG4gICAgICArIGN1cnJcbiAgICAgICsgJ3wgJ1xuICAgICAgKyBsaW5lO1xuICB9KS5qb2luKCdcXG4nKTtcblxuICAvLyBBbHRlciBleGNlcHRpb24gbWVzc2FnZVxuICBlcnIucGF0aCA9IGZpbGVuYW1lO1xuICBlcnIubWVzc2FnZSA9IChmaWxlbmFtZSB8fCAnZWpzJykgKyAnOidcbiAgICArIGxpbmVubyArICdcXG4nXG4gICAgKyBjb250ZXh0ICsgJ1xcblxcbidcbiAgICArIGVyci5tZXNzYWdlO1xuXG4gIHRocm93IGVycjtcbn1cblxuZnVuY3Rpb24gc3RyaXBTZW1pKHN0cil7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvOyhcXHMqJCkvLCAnJDEnKTtcbn1cblxuLyoqXG4gKiBDb21waWxlIHRoZSBnaXZlbiBgc3RyYCBvZiBlanMgaW50byBhIHRlbXBsYXRlIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSAgdGVtcGxhdGUgRUpTIHRlbXBsYXRlXG4gKlxuICogQHBhcmFtIHtPcHRpb25zfSBvcHRzICAgICBjb21waWxhdGlvbiBvcHRpb25zXG4gKlxuICogQHJldHVybiB7KFRlbXBsYXRlRnVuY3Rpb258Q2xpZW50RnVuY3Rpb24pfVxuICogRGVwZW5kaW5nIG9uIHRoZSB2YWx1ZSBvZiBgb3B0cy5jbGllbnRgLCBlaXRoZXIgdHlwZSBtaWdodCBiZSByZXR1cm5lZC5cbiAqIEBwdWJsaWNcbiAqL1xuXG5leHBvcnRzLmNvbXBpbGUgPSBmdW5jdGlvbiBjb21waWxlKHRlbXBsYXRlLCBvcHRzKSB7XG4gIHZhciB0ZW1wbDtcblxuICAvLyB2MSBjb21wYXRcbiAgLy8gJ3Njb3BlJyBpcyAnY29udGV4dCdcbiAgLy8gRklYTUU6IFJlbW92ZSB0aGlzIGluIGEgZnV0dXJlIHZlcnNpb25cbiAgaWYgKG9wdHMgJiYgb3B0cy5zY29wZSkge1xuICAgIGlmICghc2NvcGVPcHRpb25XYXJuZWQpe1xuICAgICAgY29uc29sZS53YXJuKCdgc2NvcGVgIG9wdGlvbiBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gRUpTIDMnKTtcbiAgICAgIHNjb3BlT3B0aW9uV2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKCFvcHRzLmNvbnRleHQpIHtcbiAgICAgIG9wdHMuY29udGV4dCA9IG9wdHMuc2NvcGU7XG4gICAgfVxuICAgIGRlbGV0ZSBvcHRzLnNjb3BlO1xuICB9XG4gIHRlbXBsID0gbmV3IFRlbXBsYXRlKHRlbXBsYXRlLCBvcHRzKTtcbiAgcmV0dXJuIHRlbXBsLmNvbXBpbGUoKTtcbn07XG5cbi8qKlxuICogUmVuZGVyIHRoZSBnaXZlbiBgdGVtcGxhdGVgIG9mIGVqcy5cbiAqXG4gKiBJZiB5b3Ugd291bGQgbGlrZSB0byBpbmNsdWRlIG9wdGlvbnMgYnV0IG5vdCBkYXRhLCB5b3UgbmVlZCB0byBleHBsaWNpdGx5XG4gKiBjYWxsIHRoaXMgZnVuY3Rpb24gd2l0aCBgZGF0YWAgYmVpbmcgYW4gZW1wdHkgb2JqZWN0IG9yIGBudWxsYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gICB0ZW1wbGF0ZSBFSlMgdGVtcGxhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSAgW2RhdGE9e31dIHRlbXBsYXRlIGRhdGFcbiAqIEBwYXJhbSB7T3B0aW9uc30gW29wdHM9e31dIGNvbXBpbGF0aW9uIGFuZCByZW5kZXJpbmcgb3B0aW9uc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQHB1YmxpY1xuICovXG5cbmV4cG9ydHMucmVuZGVyID0gZnVuY3Rpb24gKHRlbXBsYXRlLCBkLCBvKSB7XG4gIHZhciBkYXRhID0gZCB8fCB7fTtcbiAgdmFyIG9wdHMgPSBvIHx8IHt9O1xuXG4gIC8vIE5vIG9wdGlvbnMgb2JqZWN0IC0tIGlmIHRoZXJlIGFyZSBvcHRpb255IG5hbWVzXG4gIC8vIGluIHRoZSBkYXRhLCBjb3B5IHRoZW0gdG8gb3B0aW9uc1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAyKSB7XG4gICAgdXRpbHMuc2hhbGxvd0NvcHlGcm9tTGlzdChvcHRzLCBkYXRhLCBfT1BUUyk7XG4gIH1cblxuICByZXR1cm4gaGFuZGxlQ2FjaGUob3B0cywgdGVtcGxhdGUpKGRhdGEpO1xufTtcblxuLyoqXG4gKiBSZW5kZXIgYW4gRUpTIGZpbGUgYXQgdGhlIGdpdmVuIGBwYXRoYCBhbmQgY2FsbGJhY2sgYGNiKGVyciwgc3RyKWAuXG4gKlxuICogSWYgeW91IHdvdWxkIGxpa2UgdG8gaW5jbHVkZSBvcHRpb25zIGJ1dCBub3QgZGF0YSwgeW91IG5lZWQgdG8gZXhwbGljaXRseVxuICogY2FsbCB0aGlzIGZ1bmN0aW9uIHdpdGggYGRhdGFgIGJlaW5nIGFuIGVtcHR5IG9iamVjdCBvciBgbnVsbGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9ICAgICAgICAgICAgIHBhdGggICAgIHBhdGggdG8gdGhlIEVKUyBmaWxlXG4gKiBAcGFyYW0ge09iamVjdH0gICAgICAgICAgICBbZGF0YT17fV0gdGVtcGxhdGUgZGF0YVxuICogQHBhcmFtIHtPcHRpb25zfSAgICAgICAgICAgW29wdHM9e31dIGNvbXBpbGF0aW9uIGFuZCByZW5kZXJpbmcgb3B0aW9uc1xuICogQHBhcmFtIHtSZW5kZXJGaWxlQ2FsbGJhY2t9IGNiIGNhbGxiYWNrXG4gKiBAcHVibGljXG4gKi9cblxuZXhwb3J0cy5yZW5kZXJGaWxlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZmlsZW5hbWUgPSBhcmd1bWVudHNbMF07XG4gIHZhciBjYiA9IGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV07XG4gIHZhciBvcHRzID0ge2ZpbGVuYW1lOiBmaWxlbmFtZX07XG4gIHZhciBkYXRhO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgIGRhdGEgPSBhcmd1bWVudHNbMV07XG5cbiAgICAvLyBObyBvcHRpb25zIG9iamVjdCAtLSBpZiB0aGVyZSBhcmUgb3B0aW9ueSBuYW1lc1xuICAgIC8vIGluIHRoZSBkYXRhLCBjb3B5IHRoZW0gdG8gb3B0aW9uc1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzKSB7XG4gICAgICAvLyBFeHByZXNzIDRcbiAgICAgIGlmIChkYXRhLnNldHRpbmdzKSB7XG4gICAgICAgIGlmIChkYXRhLnNldHRpbmdzWyd2aWV3IG9wdGlvbnMnXSkge1xuICAgICAgICAgIHV0aWxzLnNoYWxsb3dDb3B5RnJvbUxpc3Qob3B0cywgZGF0YS5zZXR0aW5nc1sndmlldyBvcHRpb25zJ10sIF9PUFRTX0VYUFJFU1MpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLnNldHRpbmdzLnZpZXdzKSB7XG4gICAgICAgICAgb3B0cy52aWV3cyA9IGRhdGEuc2V0dGluZ3Mudmlld3M7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIEV4cHJlc3MgMyBhbmQgbG93ZXJcbiAgICAgIGVsc2Uge1xuICAgICAgICB1dGlscy5zaGFsbG93Q29weUZyb21MaXN0KG9wdHMsIGRhdGEsIF9PUFRTX0VYUFJFU1MpO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIFVzZSBzaGFsbG93Q29weSBzbyB3ZSBkb24ndCBwb2xsdXRlIHBhc3NlZCBpbiBvcHRzIG9iaiB3aXRoIG5ldyB2YWxzXG4gICAgICB1dGlscy5zaGFsbG93Q29weShvcHRzLCBhcmd1bWVudHNbMl0pO1xuICAgIH1cblxuICAgIG9wdHMuZmlsZW5hbWUgPSBmaWxlbmFtZTtcbiAgfVxuICBlbHNlIHtcbiAgICBkYXRhID0ge307XG4gIH1cblxuICByZXR1cm4gdHJ5SGFuZGxlQ2FjaGUob3B0cywgZGF0YSwgY2IpO1xufTtcblxuLyoqXG4gKiBDbGVhciBpbnRlcm1lZGlhdGUgSmF2YVNjcmlwdCBjYWNoZS4gQ2FsbHMge0BsaW5rIENhY2hlI3Jlc2V0fS5cbiAqIEBwdWJsaWNcbiAqL1xuXG5leHBvcnRzLmNsZWFyQ2FjaGUgPSBmdW5jdGlvbiAoKSB7XG4gIGV4cG9ydHMuY2FjaGUucmVzZXQoKTtcbn07XG5cbmZ1bmN0aW9uIFRlbXBsYXRlKHRleHQsIG9wdHMpIHtcbiAgb3B0cyA9IG9wdHMgfHwge307XG4gIHZhciBvcHRpb25zID0ge307XG4gIHRoaXMudGVtcGxhdGVUZXh0ID0gdGV4dDtcbiAgdGhpcy5tb2RlID0gbnVsbDtcbiAgdGhpcy50cnVuY2F0ZSA9IGZhbHNlO1xuICB0aGlzLmN1cnJlbnRMaW5lID0gMTtcbiAgdGhpcy5zb3VyY2UgPSAnJztcbiAgdGhpcy5kZXBlbmRlbmNpZXMgPSBbXTtcbiAgb3B0aW9ucy5jbGllbnQgPSBvcHRzLmNsaWVudCB8fCBmYWxzZTtcbiAgb3B0aW9ucy5lc2NhcGVGdW5jdGlvbiA9IG9wdHMuZXNjYXBlIHx8IHV0aWxzLmVzY2FwZVhNTDtcbiAgb3B0aW9ucy5jb21waWxlRGVidWcgPSBvcHRzLmNvbXBpbGVEZWJ1ZyAhPT0gZmFsc2U7XG4gIG9wdGlvbnMuZGVidWcgPSAhIW9wdHMuZGVidWc7XG4gIG9wdGlvbnMuZmlsZW5hbWUgPSBvcHRzLmZpbGVuYW1lO1xuICBvcHRpb25zLmRlbGltaXRlciA9IG9wdHMuZGVsaW1pdGVyIHx8IGV4cG9ydHMuZGVsaW1pdGVyIHx8IF9ERUZBVUxUX0RFTElNSVRFUjtcbiAgb3B0aW9ucy5zdHJpY3QgPSBvcHRzLnN0cmljdCB8fCBmYWxzZTtcbiAgb3B0aW9ucy5jb250ZXh0ID0gb3B0cy5jb250ZXh0O1xuICBvcHRpb25zLmNhY2hlID0gb3B0cy5jYWNoZSB8fCBmYWxzZTtcbiAgb3B0aW9ucy5ybVdoaXRlc3BhY2UgPSBvcHRzLnJtV2hpdGVzcGFjZTtcbiAgb3B0aW9ucy5yb290ID0gb3B0cy5yb290O1xuICBvcHRpb25zLmxvY2Fsc05hbWUgPSBvcHRzLmxvY2Fsc05hbWUgfHwgZXhwb3J0cy5sb2NhbHNOYW1lIHx8IF9ERUZBVUxUX0xPQ0FMU19OQU1FO1xuICBvcHRpb25zLnZpZXdzID0gb3B0cy52aWV3cztcblxuICBpZiAob3B0aW9ucy5zdHJpY3QpIHtcbiAgICBvcHRpb25zLl93aXRoID0gZmFsc2U7XG4gIH1cbiAgZWxzZSB7XG4gICAgb3B0aW9ucy5fd2l0aCA9IHR5cGVvZiBvcHRzLl93aXRoICE9ICd1bmRlZmluZWQnID8gb3B0cy5fd2l0aCA6IHRydWU7XG4gIH1cblxuICB0aGlzLm9wdHMgPSBvcHRpb25zO1xuXG4gIHRoaXMucmVnZXggPSB0aGlzLmNyZWF0ZVJlZ2V4KCk7XG59XG5cblRlbXBsYXRlLm1vZGVzID0ge1xuICBFVkFMOiAnZXZhbCcsXG4gIEVTQ0FQRUQ6ICdlc2NhcGVkJyxcbiAgUkFXOiAncmF3JyxcbiAgQ09NTUVOVDogJ2NvbW1lbnQnLFxuICBMSVRFUkFMOiAnbGl0ZXJhbCdcbn07XG5cblRlbXBsYXRlLnByb3RvdHlwZSA9IHtcbiAgY3JlYXRlUmVnZXg6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3RyID0gX1JFR0VYX1NUUklORztcbiAgICB2YXIgZGVsaW0gPSB1dGlscy5lc2NhcGVSZWdFeHBDaGFycyh0aGlzLm9wdHMuZGVsaW1pdGVyKTtcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvJS9nLCBkZWxpbSk7XG4gICAgcmV0dXJuIG5ldyBSZWdFeHAoc3RyKTtcbiAgfSxcblxuICBjb21waWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNyYztcbiAgICB2YXIgZm47XG4gICAgdmFyIG9wdHMgPSB0aGlzLm9wdHM7XG4gICAgdmFyIHByZXBlbmRlZCA9ICcnO1xuICAgIHZhciBhcHBlbmRlZCA9ICcnO1xuICAgIHZhciBlc2NhcGVGbiA9IG9wdHMuZXNjYXBlRnVuY3Rpb247XG5cbiAgICBpZiAoIXRoaXMuc291cmNlKSB7XG4gICAgICB0aGlzLmdlbmVyYXRlU291cmNlKCk7XG4gICAgICBwcmVwZW5kZWQgKz0gJyAgdmFyIF9fb3V0cHV0ID0gW10sIF9fYXBwZW5kID0gX19vdXRwdXQucHVzaC5iaW5kKF9fb3V0cHV0KTsnICsgJ1xcbic7XG4gICAgICBpZiAob3B0cy5fd2l0aCAhPT0gZmFsc2UpIHtcbiAgICAgICAgcHJlcGVuZGVkICs9ICAnICB3aXRoICgnICsgb3B0cy5sb2NhbHNOYW1lICsgJyB8fCB7fSkgeycgKyAnXFxuJztcbiAgICAgICAgYXBwZW5kZWQgKz0gJyAgfScgKyAnXFxuJztcbiAgICAgIH1cbiAgICAgIGFwcGVuZGVkICs9ICcgIHJldHVybiBfX291dHB1dC5qb2luKFwiXCIpOycgKyAnXFxuJztcbiAgICAgIHRoaXMuc291cmNlID0gcHJlcGVuZGVkICsgdGhpcy5zb3VyY2UgKyBhcHBlbmRlZDtcbiAgICB9XG5cbiAgICBpZiAob3B0cy5jb21waWxlRGVidWcpIHtcbiAgICAgIHNyYyA9ICd2YXIgX19saW5lID0gMScgKyAnXFxuJ1xuICAgICAgICAgICsgJyAgLCBfX2xpbmVzID0gJyArIEpTT04uc3RyaW5naWZ5KHRoaXMudGVtcGxhdGVUZXh0KSArICdcXG4nXG4gICAgICAgICAgKyAnICAsIF9fZmlsZW5hbWUgPSAnICsgKG9wdHMuZmlsZW5hbWUgP1xuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KG9wdHMuZmlsZW5hbWUpIDogJ3VuZGVmaW5lZCcpICsgJzsnICsgJ1xcbidcbiAgICAgICAgICArICd0cnkgeycgKyAnXFxuJ1xuICAgICAgICAgICsgdGhpcy5zb3VyY2VcbiAgICAgICAgICArICd9IGNhdGNoIChlKSB7JyArICdcXG4nXG4gICAgICAgICAgKyAnICByZXRocm93KGUsIF9fbGluZXMsIF9fZmlsZW5hbWUsIF9fbGluZSwgZXNjYXBlRm4pOycgKyAnXFxuJ1xuICAgICAgICAgICsgJ30nICsgJ1xcbic7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgc3JjID0gdGhpcy5zb3VyY2U7XG4gICAgfVxuXG4gICAgaWYgKG9wdHMuY2xpZW50KSB7XG4gICAgICBzcmMgPSAnZXNjYXBlRm4gPSBlc2NhcGVGbiB8fCAnICsgZXNjYXBlRm4udG9TdHJpbmcoKSArICc7JyArICdcXG4nICsgc3JjO1xuICAgICAgaWYgKG9wdHMuY29tcGlsZURlYnVnKSB7XG4gICAgICAgIHNyYyA9ICdyZXRocm93ID0gcmV0aHJvdyB8fCAnICsgcmV0aHJvdy50b1N0cmluZygpICsgJzsnICsgJ1xcbicgKyBzcmM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG9wdHMuc3RyaWN0KSB7XG4gICAgICBzcmMgPSAnXCJ1c2Ugc3RyaWN0XCI7XFxuJyArIHNyYztcbiAgICB9XG4gICAgaWYgKG9wdHMuZGVidWcpIHtcbiAgICAgIGNvbnNvbGUubG9nKHNyYyk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGZuID0gbmV3IEZ1bmN0aW9uKG9wdHMubG9jYWxzTmFtZSArICcsIGVzY2FwZUZuLCBpbmNsdWRlLCByZXRocm93Jywgc3JjKTtcbiAgICB9XG4gICAgY2F0Y2goZSkge1xuICAgICAgLy8gaXN0YW5idWwgaWdub3JlIGVsc2VcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpIHtcbiAgICAgICAgaWYgKG9wdHMuZmlsZW5hbWUpIHtcbiAgICAgICAgICBlLm1lc3NhZ2UgKz0gJyBpbiAnICsgb3B0cy5maWxlbmFtZTtcbiAgICAgICAgfVxuICAgICAgICBlLm1lc3NhZ2UgKz0gJyB3aGlsZSBjb21waWxpbmcgZWpzXFxuXFxuJztcbiAgICAgICAgZS5tZXNzYWdlICs9ICdJZiB0aGUgYWJvdmUgZXJyb3IgaXMgbm90IGhlbHBmdWwsIHlvdSBtYXkgd2FudCB0byB0cnkgRUpTLUxpbnQ6XFxuJztcbiAgICAgICAgZS5tZXNzYWdlICs9ICdodHRwczovL2dpdGh1Yi5jb20vUnlhblppbS9FSlMtTGludCc7XG4gICAgICB9XG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIGlmIChvcHRzLmNsaWVudCkge1xuICAgICAgZm4uZGVwZW5kZW5jaWVzID0gdGhpcy5kZXBlbmRlbmNpZXM7XG4gICAgICByZXR1cm4gZm47XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIGEgY2FsbGFibGUgZnVuY3Rpb24gd2hpY2ggd2lsbCBleGVjdXRlIHRoZSBmdW5jdGlvblxuICAgIC8vIGNyZWF0ZWQgYnkgdGhlIHNvdXJjZS1jb2RlLCB3aXRoIHRoZSBwYXNzZWQgZGF0YSBhcyBsb2NhbHNcbiAgICAvLyBBZGRzIGEgbG9jYWwgYGluY2x1ZGVgIGZ1bmN0aW9uIHdoaWNoIGFsbG93cyBmdWxsIHJlY3Vyc2l2ZSBpbmNsdWRlXG4gICAgdmFyIHJldHVybmVkRm4gPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgdmFyIGluY2x1ZGUgPSBmdW5jdGlvbiAocGF0aCwgaW5jbHVkZURhdGEpIHtcbiAgICAgICAgdmFyIGQgPSB1dGlscy5zaGFsbG93Q29weSh7fSwgZGF0YSk7XG4gICAgICAgIGlmIChpbmNsdWRlRGF0YSkge1xuICAgICAgICAgIGQgPSB1dGlscy5zaGFsbG93Q29weShkLCBpbmNsdWRlRGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluY2x1ZGVGaWxlKHBhdGgsIG9wdHMpKGQpO1xuICAgICAgfTtcbiAgICAgIHJldHVybiBmbi5hcHBseShvcHRzLmNvbnRleHQsIFtkYXRhIHx8IHt9LCBlc2NhcGVGbiwgaW5jbHVkZSwgcmV0aHJvd10pO1xuICAgIH07XG4gICAgcmV0dXJuZWRGbi5kZXBlbmRlbmNpZXMgPSB0aGlzLmRlcGVuZGVuY2llcztcbiAgICByZXR1cm4gcmV0dXJuZWRGbjtcbiAgfSxcblxuICBnZW5lcmF0ZVNvdXJjZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBvcHRzID0gdGhpcy5vcHRzO1xuXG4gICAgaWYgKG9wdHMucm1XaGl0ZXNwYWNlKSB7XG4gICAgICAvLyBIYXZlIHRvIHVzZSB0d28gc2VwYXJhdGUgcmVwbGFjZSBoZXJlIGFzIGBeYCBhbmQgYCRgIG9wZXJhdG9ycyBkb24ndFxuICAgICAgLy8gd29yayB3ZWxsIHdpdGggYFxccmAuXG4gICAgICB0aGlzLnRlbXBsYXRlVGV4dCA9XG4gICAgICAgIHRoaXMudGVtcGxhdGVUZXh0LnJlcGxhY2UoL1xcci9nLCAnJykucmVwbGFjZSgvXlxccyt8XFxzKyQvZ20sICcnKTtcbiAgICB9XG5cbiAgICAvLyBTbHVycCBzcGFjZXMgYW5kIHRhYnMgYmVmb3JlIDwlXyBhbmQgYWZ0ZXIgXyU+XG4gICAgdGhpcy50ZW1wbGF0ZVRleHQgPVxuICAgICAgdGhpcy50ZW1wbGF0ZVRleHQucmVwbGFjZSgvWyBcXHRdKjwlXy9nbSwgJzwlXycpLnJlcGxhY2UoL18lPlsgXFx0XSovZ20sICdfJT4nKTtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbWF0Y2hlcyA9IHRoaXMucGFyc2VUZW1wbGF0ZVRleHQoKTtcbiAgICB2YXIgZCA9IHRoaXMub3B0cy5kZWxpbWl0ZXI7XG5cbiAgICBpZiAobWF0Y2hlcyAmJiBtYXRjaGVzLmxlbmd0aCkge1xuICAgICAgbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChsaW5lLCBpbmRleCkge1xuICAgICAgICB2YXIgb3BlbmluZztcbiAgICAgICAgdmFyIGNsb3Npbmc7XG4gICAgICAgIHZhciBpbmNsdWRlO1xuICAgICAgICB2YXIgaW5jbHVkZU9wdHM7XG4gICAgICAgIHZhciBpbmNsdWRlT2JqO1xuICAgICAgICB2YXIgaW5jbHVkZVNyYztcbiAgICAgICAgLy8gSWYgdGhpcyBpcyBhbiBvcGVuaW5nIHRhZywgY2hlY2sgZm9yIGNsb3NpbmcgdGFnc1xuICAgICAgICAvLyBGSVhNRTogTWF5IGVuZCB1cCB3aXRoIHNvbWUgZmFsc2UgcG9zaXRpdmVzIGhlcmVcbiAgICAgICAgLy8gQmV0dGVyIHRvIHN0b3JlIG1vZGVzIGFzIGsvdiB3aXRoICc8JyArIGRlbGltaXRlciBhcyBrZXlcbiAgICAgICAgLy8gVGhlbiB0aGlzIGNhbiBzaW1wbHkgY2hlY2sgYWdhaW5zdCB0aGUgbWFwXG4gICAgICAgIGlmICggbGluZS5pbmRleE9mKCc8JyArIGQpID09PSAwICAgICAgICAvLyBJZiBpdCBpcyBhIHRhZ1xuICAgICAgICAgICYmIGxpbmUuaW5kZXhPZignPCcgKyBkICsgZCkgIT09IDApIHsgLy8gYW5kIGlzIG5vdCBlc2NhcGVkXG4gICAgICAgICAgY2xvc2luZyA9IG1hdGNoZXNbaW5kZXggKyAyXTtcbiAgICAgICAgICBpZiAoIShjbG9zaW5nID09IGQgKyAnPicgfHwgY2xvc2luZyA9PSAnLScgKyBkICsgJz4nIHx8IGNsb3NpbmcgPT0gJ18nICsgZCArICc+JykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgbWF0Y2hpbmcgY2xvc2UgdGFnIGZvciBcIicgKyBsaW5lICsgJ1wiLicpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBIQUNLOiBiYWNrd2FyZC1jb21wYXQgYGluY2x1ZGVgIHByZXByb2Nlc3NvciBkaXJlY3RpdmVzXG4gICAgICAgIGlmICgoaW5jbHVkZSA9IGxpbmUubWF0Y2goL15cXHMqaW5jbHVkZVxccysoXFxTKykvKSkpIHtcbiAgICAgICAgICBvcGVuaW5nID0gbWF0Y2hlc1tpbmRleCAtIDFdO1xuICAgICAgICAgIC8vIE11c3QgYmUgaW4gRVZBTCBvciBSQVcgbW9kZVxuICAgICAgICAgIGlmIChvcGVuaW5nICYmIChvcGVuaW5nID09ICc8JyArIGQgfHwgb3BlbmluZyA9PSAnPCcgKyBkICsgJy0nIHx8IG9wZW5pbmcgPT0gJzwnICsgZCArICdfJykpIHtcbiAgICAgICAgICAgIGluY2x1ZGVPcHRzID0gdXRpbHMuc2hhbGxvd0NvcHkoe30sIHNlbGYub3B0cyk7XG4gICAgICAgICAgICBpbmNsdWRlT2JqID0gaW5jbHVkZVNvdXJjZShpbmNsdWRlWzFdLCBpbmNsdWRlT3B0cyk7XG4gICAgICAgICAgICBpZiAoc2VsZi5vcHRzLmNvbXBpbGVEZWJ1Zykge1xuICAgICAgICAgICAgICBpbmNsdWRlU3JjID1cbiAgICAgICAgICAgICAgICAgICcgICAgOyAoZnVuY3Rpb24oKXsnICsgJ1xcbidcbiAgICAgICAgICAgICAgICAgICsgJyAgICAgIHZhciBfX2xpbmUgPSAxJyArICdcXG4nXG4gICAgICAgICAgICAgICAgICArICcgICAgICAsIF9fbGluZXMgPSAnICsgSlNPTi5zdHJpbmdpZnkoaW5jbHVkZU9iai50ZW1wbGF0ZSkgKyAnXFxuJ1xuICAgICAgICAgICAgICAgICAgKyAnICAgICAgLCBfX2ZpbGVuYW1lID0gJyArIEpTT04uc3RyaW5naWZ5KGluY2x1ZGVPYmouZmlsZW5hbWUpICsgJzsnICsgJ1xcbidcbiAgICAgICAgICAgICAgICAgICsgJyAgICAgIHRyeSB7JyArICdcXG4nXG4gICAgICAgICAgICAgICAgICArIGluY2x1ZGVPYmouc291cmNlXG4gICAgICAgICAgICAgICAgICArICcgICAgICB9IGNhdGNoIChlKSB7JyArICdcXG4nXG4gICAgICAgICAgICAgICAgICArICcgICAgICAgIHJldGhyb3coZSwgX19saW5lcywgX19maWxlbmFtZSwgX19saW5lLCBlc2NhcGVGbik7JyArICdcXG4nXG4gICAgICAgICAgICAgICAgICArICcgICAgICB9JyArICdcXG4nXG4gICAgICAgICAgICAgICAgICArICcgICAgOyB9KS5jYWxsKHRoaXMpJyArICdcXG4nO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgIGluY2x1ZGVTcmMgPSAnICAgIDsgKGZ1bmN0aW9uKCl7JyArICdcXG4nICsgaW5jbHVkZU9iai5zb3VyY2UgK1xuICAgICAgICAgICAgICAgICAgJyAgICA7IH0pLmNhbGwodGhpcyknICsgJ1xcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWxmLnNvdXJjZSArPSBpbmNsdWRlU3JjO1xuICAgICAgICAgICAgc2VsZi5kZXBlbmRlbmNpZXMucHVzaChleHBvcnRzLnJlc29sdmVJbmNsdWRlKGluY2x1ZGVbMV0sXG4gICAgICAgICAgICAgICAgaW5jbHVkZU9wdHMuZmlsZW5hbWUpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5zY2FuTGluZShsaW5lKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICB9LFxuXG4gIHBhcnNlVGVtcGxhdGVUZXh0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN0ciA9IHRoaXMudGVtcGxhdGVUZXh0O1xuICAgIHZhciBwYXQgPSB0aGlzLnJlZ2V4O1xuICAgIHZhciByZXN1bHQgPSBwYXQuZXhlYyhzdHIpO1xuICAgIHZhciBhcnIgPSBbXTtcbiAgICB2YXIgZmlyc3RQb3M7XG5cbiAgICB3aGlsZSAocmVzdWx0KSB7XG4gICAgICBmaXJzdFBvcyA9IHJlc3VsdC5pbmRleDtcblxuICAgICAgaWYgKGZpcnN0UG9zICE9PSAwKSB7XG4gICAgICAgIGFyci5wdXNoKHN0ci5zdWJzdHJpbmcoMCwgZmlyc3RQb3MpKTtcbiAgICAgICAgc3RyID0gc3RyLnNsaWNlKGZpcnN0UG9zKTtcbiAgICAgIH1cblxuICAgICAgYXJyLnB1c2gocmVzdWx0WzBdKTtcbiAgICAgIHN0ciA9IHN0ci5zbGljZShyZXN1bHRbMF0ubGVuZ3RoKTtcbiAgICAgIHJlc3VsdCA9IHBhdC5leGVjKHN0cik7XG4gICAgfVxuXG4gICAgaWYgKHN0cikge1xuICAgICAgYXJyLnB1c2goc3RyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJyO1xuICB9LFxuXG4gIF9hZGRPdXRwdXQ6IGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgaWYgKHRoaXMudHJ1bmNhdGUpIHtcbiAgICAgIC8vIE9ubHkgcmVwbGFjZSBzaW5nbGUgbGVhZGluZyBsaW5lYnJlYWsgaW4gdGhlIGxpbmUgYWZ0ZXJcbiAgICAgIC8vIC0lPiB0YWcgLS0gdGhpcyBpcyB0aGUgc2luZ2xlLCB0cmFpbGluZyBsaW5lYnJlYWtcbiAgICAgIC8vIGFmdGVyIHRoZSB0YWcgdGhhdCB0aGUgdHJ1bmNhdGlvbiBtb2RlIHJlcGxhY2VzXG4gICAgICAvLyBIYW5kbGUgV2luIC8gVW5peCAvIG9sZCBNYWMgbGluZWJyZWFrcyAtLSBkbyB0aGUgXFxyXFxuXG4gICAgICAvLyBjb21ibyBmaXJzdCBpbiB0aGUgcmVnZXgtb3JcbiAgICAgIGxpbmUgPSBsaW5lLnJlcGxhY2UoL14oPzpcXHJcXG58XFxyfFxcbikvLCAnJyk7XG4gICAgICB0aGlzLnRydW5jYXRlID0gZmFsc2U7XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMub3B0cy5ybVdoaXRlc3BhY2UpIHtcbiAgICAgIC8vIHJtV2hpdGVzcGFjZSBoYXMgYWxyZWFkeSByZW1vdmVkIHRyYWlsaW5nIHNwYWNlcywganVzdCBuZWVkXG4gICAgICAvLyB0byByZW1vdmUgbGluZWJyZWFrc1xuICAgICAgbGluZSA9IGxpbmUucmVwbGFjZSgvXlxcbi8sICcnKTtcbiAgICB9XG4gICAgaWYgKCFsaW5lKSB7XG4gICAgICByZXR1cm4gbGluZTtcbiAgICB9XG5cbiAgICAvLyBQcmVzZXJ2ZSBsaXRlcmFsIHNsYXNoZXNcbiAgICBsaW5lID0gbGluZS5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpO1xuXG4gICAgLy8gQ29udmVydCBsaW5lYnJlYWtzXG4gICAgbGluZSA9IGxpbmUucmVwbGFjZSgvXFxuL2csICdcXFxcbicpO1xuICAgIGxpbmUgPSBsaW5lLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKTtcblxuICAgIC8vIEVzY2FwZSBkb3VibGUtcXVvdGVzXG4gICAgLy8gLSB0aGlzIHdpbGwgYmUgdGhlIGRlbGltaXRlciBkdXJpbmcgZXhlY3V0aW9uXG4gICAgbGluZSA9IGxpbmUucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpO1xuICAgIHRoaXMuc291cmNlICs9ICcgICAgOyBfX2FwcGVuZChcIicgKyBsaW5lICsgJ1wiKScgKyAnXFxuJztcbiAgfSxcblxuICBzY2FuTGluZTogZnVuY3Rpb24gKGxpbmUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGQgPSB0aGlzLm9wdHMuZGVsaW1pdGVyO1xuICAgIHZhciBuZXdMaW5lQ291bnQgPSAwO1xuXG4gICAgbmV3TGluZUNvdW50ID0gKGxpbmUuc3BsaXQoJ1xcbicpLmxlbmd0aCAtIDEpO1xuXG4gICAgc3dpdGNoIChsaW5lKSB7XG4gICAgY2FzZSAnPCcgKyBkOlxuICAgIGNhc2UgJzwnICsgZCArICdfJzpcbiAgICAgIHRoaXMubW9kZSA9IFRlbXBsYXRlLm1vZGVzLkVWQUw7XG4gICAgICBicmVhaztcbiAgICBjYXNlICc8JyArIGQgKyAnPSc6XG4gICAgICB0aGlzLm1vZGUgPSBUZW1wbGF0ZS5tb2Rlcy5FU0NBUEVEO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnPCcgKyBkICsgJy0nOlxuICAgICAgdGhpcy5tb2RlID0gVGVtcGxhdGUubW9kZXMuUkFXO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnPCcgKyBkICsgJyMnOlxuICAgICAgdGhpcy5tb2RlID0gVGVtcGxhdGUubW9kZXMuQ09NTUVOVDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJzwnICsgZCArIGQ6XG4gICAgICB0aGlzLm1vZGUgPSBUZW1wbGF0ZS5tb2Rlcy5MSVRFUkFMO1xuICAgICAgdGhpcy5zb3VyY2UgKz0gJyAgICA7IF9fYXBwZW5kKFwiJyArIGxpbmUucmVwbGFjZSgnPCcgKyBkICsgZCwgJzwnICsgZCkgKyAnXCIpJyArICdcXG4nO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBkICsgZCArICc+JzpcbiAgICAgIHRoaXMubW9kZSA9IFRlbXBsYXRlLm1vZGVzLkxJVEVSQUw7XG4gICAgICB0aGlzLnNvdXJjZSArPSAnICAgIDsgX19hcHBlbmQoXCInICsgbGluZS5yZXBsYWNlKGQgKyBkICsgJz4nLCBkICsgJz4nKSArICdcIiknICsgJ1xcbic7XG4gICAgICBicmVhaztcbiAgICBjYXNlIGQgKyAnPic6XG4gICAgY2FzZSAnLScgKyBkICsgJz4nOlxuICAgIGNhc2UgJ18nICsgZCArICc+JzpcbiAgICAgIGlmICh0aGlzLm1vZGUgPT0gVGVtcGxhdGUubW9kZXMuTElURVJBTCkge1xuICAgICAgICB0aGlzLl9hZGRPdXRwdXQobGluZSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubW9kZSA9IG51bGw7XG4gICAgICB0aGlzLnRydW5jYXRlID0gbGluZS5pbmRleE9mKCctJykgPT09IDAgfHwgbGluZS5pbmRleE9mKCdfJykgPT09IDA7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgICAvLyBJbiBzY3JpcHQgbW9kZSwgZGVwZW5kcyBvbiB0eXBlIG9mIHRhZ1xuICAgICAgaWYgKHRoaXMubW9kZSkge1xuICAgICAgICAgIC8vIElmICcvLycgaXMgZm91bmQgd2l0aG91dCBhIGxpbmUgYnJlYWssIGFkZCBhIGxpbmUgYnJlYWsuXG4gICAgICAgIHN3aXRjaCAodGhpcy5tb2RlKSB7XG4gICAgICAgIGNhc2UgVGVtcGxhdGUubW9kZXMuRVZBTDpcbiAgICAgICAgY2FzZSBUZW1wbGF0ZS5tb2Rlcy5FU0NBUEVEOlxuICAgICAgICBjYXNlIFRlbXBsYXRlLm1vZGVzLlJBVzpcbiAgICAgICAgICBpZiAobGluZS5sYXN0SW5kZXhPZignLy8nKSA+IGxpbmUubGFzdEluZGV4T2YoJ1xcbicpKSB7XG4gICAgICAgICAgICBsaW5lICs9ICdcXG4nO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2ggKHRoaXMubW9kZSkge1xuICAgICAgICAgICAgLy8gSnVzdCBleGVjdXRpbmcgY29kZVxuICAgICAgICBjYXNlIFRlbXBsYXRlLm1vZGVzLkVWQUw6XG4gICAgICAgICAgdGhpcy5zb3VyY2UgKz0gJyAgICA7ICcgKyBsaW5lICsgJ1xcbic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAvLyBFeGVjLCBlc2MsIGFuZCBvdXRwdXRcbiAgICAgICAgY2FzZSBUZW1wbGF0ZS5tb2Rlcy5FU0NBUEVEOlxuICAgICAgICAgIHRoaXMuc291cmNlICs9ICcgICAgOyBfX2FwcGVuZChlc2NhcGVGbignICsgc3RyaXBTZW1pKGxpbmUpICsgJykpJyArICdcXG4nO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgLy8gRXhlYyBhbmQgb3V0cHV0XG4gICAgICAgIGNhc2UgVGVtcGxhdGUubW9kZXMuUkFXOlxuICAgICAgICAgIHRoaXMuc291cmNlICs9ICcgICAgOyBfX2FwcGVuZCgnICsgc3RyaXBTZW1pKGxpbmUpICsgJyknICsgJ1xcbic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgVGVtcGxhdGUubW9kZXMuQ09NTUVOVDpcbiAgICAgICAgICAgICAgLy8gRG8gbm90aGluZ1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgLy8gTGl0ZXJhbCA8JSUgbW9kZSwgYXBwZW5kIGFzIHJhdyBvdXRwdXRcbiAgICAgICAgY2FzZSBUZW1wbGF0ZS5tb2Rlcy5MSVRFUkFMOlxuICAgICAgICAgIHRoaXMuX2FkZE91dHB1dChsaW5lKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgICAvLyBJbiBzdHJpbmcgbW9kZSwganVzdCBhZGQgdGhlIG91dHB1dFxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX2FkZE91dHB1dChsaW5lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2VsZi5vcHRzLmNvbXBpbGVEZWJ1ZyAmJiBuZXdMaW5lQ291bnQpIHtcbiAgICAgIHRoaXMuY3VycmVudExpbmUgKz0gbmV3TGluZUNvdW50O1xuICAgICAgdGhpcy5zb3VyY2UgKz0gJyAgICA7IF9fbGluZSA9ICcgKyB0aGlzLmN1cnJlbnRMaW5lICsgJ1xcbic7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEVzY2FwZSBjaGFyYWN0ZXJzIHJlc2VydmVkIGluIFhNTC5cbiAqXG4gKiBUaGlzIGlzIHNpbXBseSBhbiBleHBvcnQgb2Yge0BsaW5rIG1vZHVsZTp1dGlscy5lc2NhcGVYTUx9LlxuICpcbiAqIElmIGBtYXJrdXBgIGlzIGB1bmRlZmluZWRgIG9yIGBudWxsYCwgdGhlIGVtcHR5IHN0cmluZyBpcyByZXR1cm5lZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWFya3VwIElucHV0IHN0cmluZ1xuICogQHJldHVybiB7U3RyaW5nfSBFc2NhcGVkIHN0cmluZ1xuICogQHB1YmxpY1xuICogQGZ1bmNcbiAqICovXG5leHBvcnRzLmVzY2FwZVhNTCA9IHV0aWxzLmVzY2FwZVhNTDtcblxuLyoqXG4gKiBFeHByZXNzLmpzIHN1cHBvcnQuXG4gKlxuICogVGhpcyBpcyBhbiBhbGlhcyBmb3Ige0BsaW5rIG1vZHVsZTplanMucmVuZGVyRmlsZX0sIGluIG9yZGVyIHRvIHN1cHBvcnRcbiAqIEV4cHJlc3MuanMgb3V0LW9mLXRoZS1ib3guXG4gKlxuICogQGZ1bmNcbiAqL1xuXG5leHBvcnRzLl9fZXhwcmVzcyA9IGV4cG9ydHMucmVuZGVyRmlsZTtcblxuLy8gQWRkIHJlcXVpcmUgc3VwcG9ydFxuLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbmlmIChyZXF1aXJlLmV4dGVuc2lvbnMpIHtcbiAgcmVxdWlyZS5leHRlbnNpb25zWycuZWpzJ10gPSBmdW5jdGlvbiAobW9kdWxlLCBmbG5tKSB7XG4gICAgdmFyIGZpbGVuYW1lID0gZmxubSB8fCAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyBtb2R1bGUuZmlsZW5hbWU7XG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWUsXG4gICAgICBjbGllbnQ6IHRydWVcbiAgICB9O1xuICAgIHZhciB0ZW1wbGF0ZSA9IGZpbGVMb2FkZXIoZmlsZW5hbWUpLnRvU3RyaW5nKCk7XG4gICAgdmFyIGZuID0gZXhwb3J0cy5jb21waWxlKHRlbXBsYXRlLCBvcHRpb25zKTtcbiAgICBtb2R1bGUuX2NvbXBpbGUoJ21vZHVsZS5leHBvcnRzID0gJyArIGZuLnRvU3RyaW5nKCkgKyAnOycsIGZpbGVuYW1lKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBWZXJzaW9uIG9mIEVKUy5cbiAqXG4gKiBAcmVhZG9ubHlcbiAqIEB0eXBlIHtTdHJpbmd9XG4gKiBAcHVibGljXG4gKi9cblxuZXhwb3J0cy5WRVJTSU9OID0gX1ZFUlNJT05fU1RSSU5HO1xuXG4vKipcbiAqIE5hbWUgZm9yIGRldGVjdGlvbiBvZiBFSlMuXG4gKlxuICogQHJlYWRvbmx5XG4gKiBAdHlwZSB7U3RyaW5nfVxuICogQHB1YmxpY1xuICovXG5cbmV4cG9ydHMubmFtZSA9IF9OQU1FO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbmlmICh0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnKSB7XG4gIHdpbmRvdy5lanMgPSBleHBvcnRzO1xufVxuIl19