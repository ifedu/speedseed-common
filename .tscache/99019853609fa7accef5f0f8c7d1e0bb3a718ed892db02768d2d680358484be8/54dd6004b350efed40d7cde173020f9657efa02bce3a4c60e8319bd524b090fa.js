// Approach:
//
// 1. Get the minimatch set
// 2. For each pattern in the set, PROCESS(pattern, false)
// 3. Store matches per-set, then uniq them
//
// PROCESS(pattern, inGlobStar)
// Get the first [n] items from pattern that are all strings
// Join these together.  This is PREFIX.
//   If there is no more remaining, then stat(PREFIX) and
//   add to matches if it succeeds.  END.
//
// If inGlobStar and PREFIX is symlink and points to dir
//   set ENTRIES = []
// else readdir(PREFIX) as ENTRIES
//   If fail, END
//
// with ENTRIES
//   If pattern[n] is GLOBSTAR
//     // handle the case where the globstar match is empty
//     // by pruning it out, and testing the resulting pattern
//     PROCESS(pattern[0..n] + pattern[n+1 .. $], false)
//     // handle other cases.
//     for ENTRY in ENTRIES (not dotfiles)
//       // attach globstar + tail onto the entry
//       // Mark that this entry is a globstar match
//       PROCESS(pattern[0..n] + ENTRY + pattern[n .. $], true)
//
//   else // not globstar
//     for ENTRY in ENTRIES (not dotfiles, unless pattern[n] is dot)
//       Test ENTRY against pattern[n]
//       If fails, continue
//       If passes, PROCESS(pattern[0..n] + item + pattern[n+1 .. $])
//
// Caveat:
//   Cache all stats and readdirs results to minimize syscall.  Since all
//   we ever care about is existence and directory-ness, we can just keep
//   `true` for files, and [children,...] for directories, or `false` for
//   things that don't exist.
module.exports = glob;
var fs = require('fs');
var rp = require('fs.realpath');
var minimatch = require('minimatch');
var Minimatch = minimatch.Minimatch;
var inherits = require('inherits');
var EE = require('events').EventEmitter;
var path = require('path');
var assert = require('assert');
var isAbsolute = require('path-is-absolute');
var globSync = require('./sync.js');
var common = require('./common.js');
var alphasort = common.alphasort;
var alphasorti = common.alphasorti;
var setopts = common.setopts;
var ownProp = common.ownProp;
var inflight = require('inflight');
var util = require('util');
var childrenIgnored = common.childrenIgnored;
var isIgnored = common.isIgnored;
var once = require('once');
function glob(pattern, options, cb) {
    if (typeof options === 'function')
        cb = options, options = {};
    if (!options)
        options = {};
    if (options.sync) {
        if (cb)
            throw new TypeError('callback provided to sync glob');
        return globSync(pattern, options);
    }
    return new Glob(pattern, options, cb);
}
glob.sync = globSync;
var GlobSync = glob.GlobSync = globSync.GlobSync;
// old api surface
glob.glob = glob;
function extend(origin, add) {
    if (add === null || typeof add !== 'object') {
        return origin;
    }
    var keys = Object.keys(add);
    var i = keys.length;
    while (i--) {
        origin[keys[i]] = add[keys[i]];
    }
    return origin;
}
glob.hasMagic = function (pattern, options_) {
    var options = extend({}, options_);
    options.noprocess = true;
    var g = new Glob(pattern, options);
    var set = g.minimatch.set;
    if (!pattern)
        return false;
    if (set.length > 1)
        return true;
    for (var j = 0; j < set[0].length; j++) {
        if (typeof set[0][j] !== 'string')
            return true;
    }
    return false;
};
glob.Glob = Glob;
inherits(Glob, EE);
function Glob(pattern, options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = null;
    }
    if (options && options.sync) {
        if (cb)
            throw new TypeError('callback provided to sync glob');
        return new GlobSync(pattern, options);
    }
    if (!(this instanceof Glob))
        return new Glob(pattern, options, cb);
    setopts(this, pattern, options);
    this._didRealPath = false;
    // process each pattern in the minimatch set
    var n = this.minimatch.set.length;
    // The matches are stored as {<filename>: true,...} so that
    // duplicates are automagically pruned.
    // Later, we do an Object.keys() on these.
    // Keep them as a list so we can fill in when nonull is set.
    this.matches = new Array(n);
    if (typeof cb === 'function') {
        cb = once(cb);
        this.on('error', cb);
        this.on('end', function (matches) {
            cb(null, matches);
        });
    }
    var self = this;
    this._processing = 0;
    this._emitQueue = [];
    this._processQueue = [];
    this.paused = false;
    if (this.noprocess)
        return this;
    if (n === 0)
        return done();
    var sync = true;
    for (var i = 0; i < n; i++) {
        this._process(this.minimatch.set[i], i, false, done);
    }
    sync = false;
    function done() {
        --self._processing;
        if (self._processing <= 0) {
            if (sync) {
                process.nextTick(function () {
                    self._finish();
                });
            }
            else {
                self._finish();
            }
        }
    }
}
Glob.prototype._finish = function () {
    assert(this instanceof Glob);
    if (this.aborted)
        return;
    if (this.realpath && !this._didRealpath)
        return this._realpath();
    common.finish(this);
    this.emit('end', this.found);
};
Glob.prototype._realpath = function () {
    if (this._didRealpath)
        return;
    this._didRealpath = true;
    var n = this.matches.length;
    if (n === 0)
        return this._finish();
    var self = this;
    for (var i = 0; i < this.matches.length; i++)
        this._realpathSet(i, next);
    function next() {
        if (--n === 0)
            self._finish();
    }
};
Glob.prototype._realpathSet = function (index, cb) {
    var matchset = this.matches[index];
    if (!matchset)
        return cb();
    var found = Object.keys(matchset);
    var self = this;
    var n = found.length;
    if (n === 0)
        return cb();
    var set = this.matches[index] = Object.create(null);
    found.forEach(function (p, i) {
        // If there's a problem with the stat, then it means that
        // one or more of the links in the realpath couldn't be
        // resolved.  just return the abs value in that case.
        p = self._makeAbs(p);
        rp.realpath(p, self.realpathCache, function (er, real) {
            if (!er)
                set[real] = true;
            else if (er.syscall === 'stat')
                set[p] = true;
            else
                self.emit('error', er); // srsly wtf right here
            if (--n === 0) {
                self.matches[index] = set;
                cb();
            }
        });
    });
};
Glob.prototype._mark = function (p) {
    return common.mark(this, p);
};
Glob.prototype._makeAbs = function (f) {
    return common.makeAbs(this, f);
};
Glob.prototype.abort = function () {
    this.aborted = true;
    this.emit('abort');
};
Glob.prototype.pause = function () {
    if (!this.paused) {
        this.paused = true;
        this.emit('pause');
    }
};
Glob.prototype.resume = function () {
    if (this.paused) {
        this.emit('resume');
        this.paused = false;
        if (this._emitQueue.length) {
            var eq = this._emitQueue.slice(0);
            this._emitQueue.length = 0;
            for (var i = 0; i < eq.length; i++) {
                var e = eq[i];
                this._emitMatch(e[0], e[1]);
            }
        }
        if (this._processQueue.length) {
            var pq = this._processQueue.slice(0);
            this._processQueue.length = 0;
            for (var i = 0; i < pq.length; i++) {
                var p = pq[i];
                this._processing--;
                this._process(p[0], p[1], p[2], p[3]);
            }
        }
    }
};
Glob.prototype._process = function (pattern, index, inGlobStar, cb) {
    assert(this instanceof Glob);
    assert(typeof cb === 'function');
    if (this.aborted)
        return;
    this._processing++;
    if (this.paused) {
        this._processQueue.push([pattern, index, inGlobStar, cb]);
        return;
    }
    //console.error('PROCESS %d', this._processing, pattern)
    // Get the first [n] parts of pattern that are all strings.
    var n = 0;
    while (typeof pattern[n] === 'string') {
        n++;
    }
    // now n is the index of the first one that is *not* a string.
    // see if there's anything else
    var prefix;
    switch (n) {
        // if not, then this is rather simple
        case pattern.length:
            this._processSimple(pattern.join('/'), index, cb);
            return;
        case 0:
            // pattern *starts* with some non-trivial item.
            // going to readdir(cwd), but not include the prefix in matches.
            prefix = null;
            break;
        default:
            // pattern has some string bits in the front.
            // whatever it starts with, whether that's 'absolute' like /foo/bar,
            // or 'relative' like '../baz'
            prefix = pattern.slice(0, n).join('/');
            break;
    }
    var remain = pattern.slice(n);
    // get the list of entries.
    var read;
    if (prefix === null)
        read = '.';
    else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
        if (!prefix || !isAbsolute(prefix))
            prefix = '/' + prefix;
        read = prefix;
    }
    else
        read = prefix;
    var abs = this._makeAbs(read);
    //if ignored, skip _processing
    if (childrenIgnored(this, read))
        return cb();
    var isGlobStar = remain[0] === minimatch.GLOBSTAR;
    if (isGlobStar)
        this._processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb);
    else
        this._processReaddir(prefix, read, abs, remain, index, inGlobStar, cb);
};
Glob.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar, cb) {
    var self = this;
    this._readdir(abs, inGlobStar, function (er, entries) {
        return self._processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb);
    });
};
Glob.prototype._processReaddir2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {
    // if the abs isn't a dir, then nothing can match!
    if (!entries)
        return cb();
    // It will only match dot entries if it starts with a dot, or if
    // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
    var pn = remain[0];
    var negate = !!this.minimatch.negate;
    var rawGlob = pn._glob;
    var dotOk = this.dot || rawGlob.charAt(0) === '.';
    var matchedEntries = [];
    for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (e.charAt(0) !== '.' || dotOk) {
            var m;
            if (negate && !prefix) {
                m = !e.match(pn);
            }
            else {
                m = e.match(pn);
            }
            if (m)
                matchedEntries.push(e);
        }
    }
    //console.error('prd2', prefix, entries, remain[0]._glob, matchedEntries)
    var len = matchedEntries.length;
    // If there are no matched entries, then nothing matches.
    if (len === 0)
        return cb();
    // if this is the last remaining pattern bit, then no need for
    // an additional stat *unless* the user has specified mark or
    // stat explicitly.  We know they exist, since readdir returned
    // them.
    if (remain.length === 1 && !this.mark && !this.stat) {
        if (!this.matches[index])
            this.matches[index] = Object.create(null);
        for (var i = 0; i < len; i++) {
            var e = matchedEntries[i];
            if (prefix) {
                if (prefix !== '/')
                    e = prefix + '/' + e;
                else
                    e = prefix + e;
            }
            if (e.charAt(0) === '/' && !this.nomount) {
                e = path.join(this.root, e);
            }
            this._emitMatch(index, e);
        }
        // This was the last one, and no stats were needed
        return cb();
    }
    // now test all matched entries as stand-ins for that part
    // of the pattern.
    remain.shift();
    for (var i = 0; i < len; i++) {
        var e = matchedEntries[i];
        var newPattern;
        if (prefix) {
            if (prefix !== '/')
                e = prefix + '/' + e;
            else
                e = prefix + e;
        }
        this._process([e].concat(remain), index, inGlobStar, cb);
    }
    cb();
};
Glob.prototype._emitMatch = function (index, e) {
    if (this.aborted)
        return;
    if (isIgnored(this, e))
        return;
    if (this.paused) {
        this._emitQueue.push([index, e]);
        return;
    }
    var abs = isAbsolute(e) ? e : this._makeAbs(e);
    if (this.mark)
        e = this._mark(e);
    if (this.absolute)
        e = abs;
    if (this.matches[index][e])
        return;
    if (this.nodir) {
        var c = this.cache[abs];
        if (c === 'DIR' || Array.isArray(c))
            return;
    }
    this.matches[index][e] = true;
    var st = this.statCache[abs];
    if (st)
        this.emit('stat', e, st);
    this.emit('match', e);
};
Glob.prototype._readdirInGlobStar = function (abs, cb) {
    if (this.aborted)
        return;
    // follow all symlinked directories forever
    // just proceed as if this is a non-globstar situation
    if (this.follow)
        return this._readdir(abs, false, cb);
    var lstatkey = 'lstat\0' + abs;
    var self = this;
    var lstatcb = inflight(lstatkey, lstatcb_);
    if (lstatcb)
        fs.lstat(abs, lstatcb);
    function lstatcb_(er, lstat) {
        if (er && er.code === 'ENOENT')
            return cb();
        var isSym = lstat && lstat.isSymbolicLink();
        self.symlinks[abs] = isSym;
        // If it's not a symlink or a dir, then it's definitely a regular file.
        // don't bother doing a readdir in that case.
        if (!isSym && lstat && !lstat.isDirectory()) {
            self.cache[abs] = 'FILE';
            cb();
        }
        else
            self._readdir(abs, false, cb);
    }
};
Glob.prototype._readdir = function (abs, inGlobStar, cb) {
    if (this.aborted)
        return;
    cb = inflight('readdir\0' + abs + '\0' + inGlobStar, cb);
    if (!cb)
        return;
    //console.error('RD %j %j', +inGlobStar, abs)
    if (inGlobStar && !ownProp(this.symlinks, abs))
        return this._readdirInGlobStar(abs, cb);
    if (ownProp(this.cache, abs)) {
        var c = this.cache[abs];
        if (!c || c === 'FILE')
            return cb();
        if (Array.isArray(c))
            return cb(null, c);
    }
    var self = this;
    fs.readdir(abs, readdirCb(this, abs, cb));
};
function readdirCb(self, abs, cb) {
    return function (er, entries) {
        if (er)
            self._readdirError(abs, er, cb);
        else
            self._readdirEntries(abs, entries, cb);
    };
}
Glob.prototype._readdirEntries = function (abs, entries, cb) {
    if (this.aborted)
        return;
    // if we haven't asked to stat everything, then just
    // assume that everything in there exists, so we can avoid
    // having to stat it a second time.
    if (!this.mark && !this.stat) {
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            if (abs === '/')
                e = abs + e;
            else
                e = abs + '/' + e;
            this.cache[e] = true;
        }
    }
    this.cache[abs] = entries;
    return cb(null, entries);
};
Glob.prototype._readdirError = function (f, er, cb) {
    if (this.aborted)
        return;
    // handle errors, and cache the information
    switch (er.code) {
        case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
        case 'ENOTDIR':// totally normal. means it *does* exist.
            var abs = this._makeAbs(f);
            this.cache[abs] = 'FILE';
            if (abs === this.cwdAbs) {
                var error = new Error(er.code + ' invalid cwd ' + this.cwd);
                error.path = this.cwd;
                error.code = er.code;
                this.emit('error', error);
                this.abort();
            }
            break;
        case 'ENOENT': // not terribly unusual
        case 'ELOOP':
        case 'ENAMETOOLONG':
        case 'UNKNOWN':
            this.cache[this._makeAbs(f)] = false;
            break;
        default:// some unusual error.  Treat as failure.
            this.cache[this._makeAbs(f)] = false;
            if (this.strict) {
                this.emit('error', er);
                // If the error is handled, then we abort
                // if not, we threw out of here
                this.abort();
            }
            if (!this.silent)
                console.error('glob error', er);
            break;
    }
    return cb();
};
Glob.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar, cb) {
    var self = this;
    this._readdir(abs, inGlobStar, function (er, entries) {
        self._processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb);
    });
};
Glob.prototype._processGlobStar2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {
    //console.error('pgs2', prefix, remain[0], entries)
    // no entries means not a dir, so it can never have matches
    // foo.txt/** doesn't match foo.txt
    if (!entries)
        return cb();
    // test without the globstar, and with every child both below
    // and replacing the globstar.
    var remainWithoutGlobStar = remain.slice(1);
    var gspref = prefix ? [prefix] : [];
    var noGlobStar = gspref.concat(remainWithoutGlobStar);
    // the noGlobStar pattern exits the inGlobStar state
    this._process(noGlobStar, index, false, cb);
    var isSym = this.symlinks[abs];
    var len = entries.length;
    // If it's a symlink, and we're in a globstar, then stop
    if (isSym && inGlobStar)
        return cb();
    for (var i = 0; i < len; i++) {
        var e = entries[i];
        if (e.charAt(0) === '.' && !this.dot)
            continue;
        // these two cases enter the inGlobStar state
        var instead = gspref.concat(entries[i], remainWithoutGlobStar);
        this._process(instead, index, true, cb);
        var below = gspref.concat(entries[i], remain);
        this._process(below, index, true, cb);
    }
    cb();
};
Glob.prototype._processSimple = function (prefix, index, cb) {
    // XXX review this.  Shouldn't it be doing the mounting etc
    // before doing stat?  kinda weird?
    var self = this;
    this._stat(prefix, function (er, exists) {
        self._processSimple2(prefix, index, er, exists, cb);
    });
};
Glob.prototype._processSimple2 = function (prefix, index, er, exists, cb) {
    //console.error('ps2', prefix, exists)
    if (!this.matches[index])
        this.matches[index] = Object.create(null);
    // If it doesn't exist, then just mark the lack of results
    if (!exists)
        return cb();
    if (prefix && isAbsolute(prefix) && !this.nomount) {
        var trail = /[\/\\]$/.test(prefix);
        if (prefix.charAt(0) === '/') {
            prefix = path.join(this.root, prefix);
        }
        else {
            prefix = path.resolve(this.root, prefix);
            if (trail)
                prefix += '/';
        }
    }
    if (process.platform === 'win32')
        prefix = prefix.replace(/\\/g, '/');
    // Mark this as a match
    this._emitMatch(index, prefix);
    cb();
};
// Returns either 'DIR', 'FILE', or false
Glob.prototype._stat = function (f, cb) {
    var abs = this._makeAbs(f);
    var needDir = f.slice(-1) === '/';
    if (f.length > this.maxLength)
        return cb();
    if (!this.stat && ownProp(this.cache, abs)) {
        var c = this.cache[abs];
        if (Array.isArray(c))
            c = 'DIR';
        // It exists, but maybe not how we need it
        if (!needDir || c === 'DIR')
            return cb(null, c);
        if (needDir && c === 'FILE')
            return cb();
        // otherwise we have to stat, because maybe c=true
        // if we know it exists, but not what it is.
    }
    var exists;
    var stat = this.statCache[abs];
    if (stat !== undefined) {
        if (stat === false)
            return cb(null, stat);
        else {
            var type = stat.isDirectory() ? 'DIR' : 'FILE';
            if (needDir && type === 'FILE')
                return cb();
            else
                return cb(null, type, stat);
        }
    }
    var self = this;
    var statcb = inflight('stat\0' + abs, lstatcb_);
    if (statcb)
        fs.lstat(abs, statcb);
    function lstatcb_(er, lstat) {
        if (lstat && lstat.isSymbolicLink()) {
            // If it's a symlink, then treat it as the target, unless
            // the target does not exist, then treat it as a file.
            return fs.stat(abs, function (er, stat) {
                if (er)
                    self._stat2(f, abs, null, lstat, cb);
                else
                    self._stat2(f, abs, er, stat, cb);
            });
        }
        else {
            self._stat2(f, abs, er, lstat, cb);
        }
    }
};
Glob.prototype._stat2 = function (f, abs, er, stat, cb) {
    if (er && (er.code === 'ENOENT' || er.code === 'ENOTDIR')) {
        this.statCache[abs] = false;
        return cb();
    }
    var needDir = f.slice(-1) === '/';
    this.statCache[abs] = stat;
    if (abs.slice(-1) === '/' && stat && !stat.isDirectory())
        return cb(null, false, stat);
    var c = true;
    if (stat)
        c = stat.isDirectory() ? 'DIR' : 'FILE';
    this.cache[abs] = this.cache[abs] || c;
    if (needDir && c === 'FILE')
        return cb();
    return cb(null, c, stat);
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxnbG9iXFxnbG9iLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXGdsb2JcXGdsb2IuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWTtBQUNaLEVBQUU7QUFDRiwyQkFBMkI7QUFDM0IsMERBQTBEO0FBQzFELDJDQUEyQztBQUMzQyxFQUFFO0FBQ0YsK0JBQStCO0FBQy9CLDREQUE0RDtBQUM1RCx3Q0FBd0M7QUFDeEMseURBQXlEO0FBQ3pELHlDQUF5QztBQUN6QyxFQUFFO0FBQ0Ysd0RBQXdEO0FBQ3hELHFCQUFxQjtBQUNyQixrQ0FBa0M7QUFDbEMsaUJBQWlCO0FBQ2pCLEVBQUU7QUFDRixlQUFlO0FBQ2YsOEJBQThCO0FBQzlCLDJEQUEyRDtBQUMzRCw4REFBOEQ7QUFDOUQsd0RBQXdEO0FBQ3hELDZCQUE2QjtBQUM3QiwwQ0FBMEM7QUFDMUMsaURBQWlEO0FBQ2pELG9EQUFvRDtBQUNwRCwrREFBK0Q7QUFDL0QsRUFBRTtBQUNGLHlCQUF5QjtBQUN6QixvRUFBb0U7QUFDcEUsc0NBQXNDO0FBQ3RDLDJCQUEyQjtBQUMzQixxRUFBcUU7QUFDckUsRUFBRTtBQUNGLFVBQVU7QUFDVix5RUFBeUU7QUFDekUseUVBQXlFO0FBQ3pFLHlFQUF5RTtBQUN6RSw2QkFBNkI7QUFFN0IsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUE7QUFFckIsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3RCLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUMvQixJQUFJ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QUMsQ0FBQyxDQUFDLENBQUM7UUFDMUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUE7UUFDM0IsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUE7SUFDakMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUE7SUFFMUIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDdkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBRTlCLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQTtJQUNaLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNQLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsS0FBSyxHQUFHLE1BQU0sQ0FBQTtJQUN6QyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBRXRDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssTUFBTSxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQTtJQUViLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUMxQixDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBBcHByb2FjaDpcbi8vXG4vLyAxLiBHZXQgdGhlIG1pbmltYXRjaCBzZXRcbi8vIDIuIEZvciBlYWNoIHBhdHRlcm4gaW4gdGhlIHNldCwgUFJPQ0VTUyhwYXR0ZXJuLCBmYWxzZSlcbi8vIDMuIFN0b3JlIG1hdGNoZXMgcGVyLXNldCwgdGhlbiB1bmlxIHRoZW1cbi8vXG4vLyBQUk9DRVNTKHBhdHRlcm4sIGluR2xvYlN0YXIpXG4vLyBHZXQgdGhlIGZpcnN0IFtuXSBpdGVtcyBmcm9tIHBhdHRlcm4gdGhhdCBhcmUgYWxsIHN0cmluZ3Ncbi8vIEpvaW4gdGhlc2UgdG9nZXRoZXIuICBUaGlzIGlzIFBSRUZJWC5cbi8vICAgSWYgdGhlcmUgaXMgbm8gbW9yZSByZW1haW5pbmcsIHRoZW4gc3RhdChQUkVGSVgpIGFuZFxuLy8gICBhZGQgdG8gbWF0Y2hlcyBpZiBpdCBzdWNjZWVkcy4gIEVORC5cbi8vXG4vLyBJZiBpbkdsb2JTdGFyIGFuZCBQUkVGSVggaXMgc3ltbGluayBhbmQgcG9pbnRzIHRvIGRpclxuLy8gICBzZXQgRU5UUklFUyA9IFtdXG4vLyBlbHNlIHJlYWRkaXIoUFJFRklYKSBhcyBFTlRSSUVTXG4vLyAgIElmIGZhaWwsIEVORFxuLy9cbi8vIHdpdGggRU5UUklFU1xuLy8gICBJZiBwYXR0ZXJuW25dIGlzIEdMT0JTVEFSXG4vLyAgICAgLy8gaGFuZGxlIHRoZSBjYXNlIHdoZXJlIHRoZSBnbG9ic3RhciBtYXRjaCBpcyBlbXB0eVxuLy8gICAgIC8vIGJ5IHBydW5pbmcgaXQgb3V0LCBhbmQgdGVzdGluZyB0aGUgcmVzdWx0aW5nIHBhdHRlcm5cbi8vICAgICBQUk9DRVNTKHBhdHRlcm5bMC4ubl0gKyBwYXR0ZXJuW24rMSAuLiAkXSwgZmFsc2UpXG4vLyAgICAgLy8gaGFuZGxlIG90aGVyIGNhc2VzLlxuLy8gICAgIGZvciBFTlRSWSBpbiBFTlRSSUVTIChub3QgZG90ZmlsZXMpXG4vLyAgICAgICAvLyBhdHRhY2ggZ2xvYnN0YXIgKyB0YWlsIG9udG8gdGhlIGVudHJ5XG4vLyAgICAgICAvLyBNYXJrIHRoYXQgdGhpcyBlbnRyeSBpcyBhIGdsb2JzdGFyIG1hdGNoXG4vLyAgICAgICBQUk9DRVNTKHBhdHRlcm5bMC4ubl0gKyBFTlRSWSArIHBhdHRlcm5bbiAuLiAkXSwgdHJ1ZSlcbi8vXG4vLyAgIGVsc2UgLy8gbm90IGdsb2JzdGFyXG4vLyAgICAgZm9yIEVOVFJZIGluIEVOVFJJRVMgKG5vdCBkb3RmaWxlcywgdW5sZXNzIHBhdHRlcm5bbl0gaXMgZG90KVxuLy8gICAgICAgVGVzdCBFTlRSWSBhZ2FpbnN0IHBhdHRlcm5bbl1cbi8vICAgICAgIElmIGZhaWxzLCBjb250aW51ZVxuLy8gICAgICAgSWYgcGFzc2VzLCBQUk9DRVNTKHBhdHRlcm5bMC4ubl0gKyBpdGVtICsgcGF0dGVybltuKzEgLi4gJF0pXG4vL1xuLy8gQ2F2ZWF0OlxuLy8gICBDYWNoZSBhbGwgc3RhdHMgYW5kIHJlYWRkaXJzIHJlc3VsdHMgdG8gbWluaW1pemUgc3lzY2FsbC4gIFNpbmNlIGFsbFxuLy8gICB3ZSBldmVyIGNhcmUgYWJvdXQgaXMgZXhpc3RlbmNlIGFuZCBkaXJlY3RvcnktbmVzcywgd2UgY2FuIGp1c3Qga2VlcFxuLy8gICBgdHJ1ZWAgZm9yIGZpbGVzLCBhbmQgW2NoaWxkcmVuLC4uLl0gZm9yIGRpcmVjdG9yaWVzLCBvciBgZmFsc2VgIGZvclxuLy8gICB0aGluZ3MgdGhhdCBkb24ndCBleGlzdC5cblxubW9kdWxlLmV4cG9ydHMgPSBnbG9iXG5cbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJylcbnZhciBycCA9IHJlcXVpcmUoJ2ZzLnJlYWxwYXRoJylcbnZhciBtaW5pbWF0Y2ggPSByZXF1aXJlKCdtaW5pbWF0Y2gnKVxudmFyIE1pbmltYXRjaCA9IG1pbmltYXRjaC5NaW5pbWF0Y2hcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJylcbnZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlclxudmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJylcbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxudmFyIGlzQWJzb2x1dGUgPSByZXF1aXJlKCdwYXRoLWlzLWFic29sdXRlJylcbnZhciBnbG9iU3luYyA9IHJlcXVpcmUoJy4vc3luYy5qcycpXG52YXIgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24uanMnKVxudmFyIGFscGhhc29ydCA9IGNvbW1vbi5hbHBoYXNvcnRcbnZhciBhbHBoYXNvcnRpID0gY29tbW9uLmFscGhhc29ydGlcbnZhciBzZXRvcHRzID0gY29tbW9uLnNldG9wdHNcbnZhciBvd25Qcm9wID0gY29tbW9uLm93blByb3BcbnZhciBpbmZsaWdodCA9IHJlcXVpcmUoJ2luZmxpZ2h0JylcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpXG52YXIgY2hpbGRyZW5JZ25vcmVkID0gY29tbW9uLmNoaWxkcmVuSWdub3JlZFxudmFyIGlzSWdub3JlZCA9IGNvbW1vbi5pc0lnbm9yZWRcblxudmFyIG9uY2UgPSByZXF1aXJlKCdvbmNlJylcblxuZnVuY3Rpb24gZ2xvYiAocGF0dGVybiwgb3B0aW9ucywgY2IpIHtcbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSBjYiA9IG9wdGlvbnMsIG9wdGlvbnMgPSB7fVxuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fVxuXG4gIGlmIChvcHRpb25zLnN5bmMpIHtcbiAgICBpZiAoY2IpXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYWxsYmFjayBwcm92aWRlZCB0byBzeW5jIGdsb2InKVxuICAgIHJldHVybiBnbG9iU3luYyhwYXR0ZXJuLCBvcHRpb25zKVxuICB9XG5cbiAgcmV0dXJuIG5ldyBHbG9iKHBhdHRlcm4sIG9wdGlvbnMsIGNiKVxufVxuXG5nbG9iLnN5bmMgPSBnbG9iU3luY1xudmFyIEdsb2JTeW5jID0gZ2xvYi5HbG9iU3luYyA9IGdsb2JTeW5jLkdsb2JTeW5jXG5cbi8vIG9sZCBhcGkgc3VyZmFjZVxuZ2xvYi5nbG9iID0gZ2xvYlxuXG5mdW5jdGlvbiBleHRlbmQgKG9yaWdpbiwgYWRkKSB7XG4gIGlmIChhZGQgPT09IG51bGwgfHwgdHlwZW9mIGFkZCAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gb3JpZ2luXG4gIH1cblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZClcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aFxuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dXG4gIH1cbiAgcmV0dXJuIG9yaWdpblxufVxuXG5nbG9iLmhhc01hZ2ljID0gZnVuY3Rpb24gKHBhdHRlcm4sIG9wdGlvbnNfKSB7XG4gIHZhciBvcHRpb25zID0gZXh0ZW5kKHt9LCBvcHRpb25zXylcbiAgb3B0aW9ucy5ub3Byb2Nlc3MgPSB0cnVlXG5cbiAgdmFyIGcgPSBuZXcgR2xvYihwYXR0ZXJuLCBvcHRpb25zKVxuICB2YXIgc2V0ID0gZy5taW5pbWF0Y2guc2V0XG5cbiAgaWYgKCFwYXR0ZXJuKVxuICAgIHJldHVybiBmYWxzZVxuXG4gIGlmIChzZXQubGVuZ3RoID4gMSlcbiAgICByZXR1cm4gdHJ1ZVxuXG4gIGZvciAodmFyIGogPSAwOyBqIDwgc2V0WzBdLmxlbmd0aDsgaisrKSB7XG4gICAgaWYgKHR5cGVvZiBzZXRbMF1bal0gIT09ICdzdHJpbmcnKVxuICAgICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufVxuXG5nbG9iLkdsb2IgPSBHbG9iXG5pbmhlcml0cyhHbG9iLCBFRSlcbmZ1bmN0aW9uIEdsb2IgKHBhdHRlcm4sIG9wdGlvbnMsIGNiKSB7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gb3B0aW9uc1xuICAgIG9wdGlvbnMgPSBudWxsXG4gIH1cblxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnN5bmMpIHtcbiAgICBpZiAoY2IpXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYWxsYmFjayBwcm92aWRlZCB0byBzeW5jIGdsb2InKVxuICAgIHJldHVybiBuZXcgR2xvYlN5bmMocGF0dGVybiwgb3B0aW9ucylcbiAgfVxuXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBHbG9iKSlcbiAgICByZXR1cm4gbmV3IEdsb2IocGF0dGVybiwgb3B0aW9ucywgY2IpXG5cbiAgc2V0b3B0cyh0aGlzLCBwYXR0ZXJuLCBvcHRpb25zKVxuICB0aGlzLl9kaWRSZWFsUGF0aCA9IGZhbHNlXG5cbiAgLy8gcHJvY2VzcyBlYWNoIHBhdHRlcm4gaW4gdGhlIG1pbmltYXRjaCBzZXRcbiAgdmFyIG4gPSB0aGlzLm1pbmltYXRjaC5zZXQubGVuZ3RoXG5cbiAgLy8gVGhlIG1hdGNoZXMgYXJlIHN0b3JlZCBhcyB7PGZpbGVuYW1lPjogdHJ1ZSwuLi59IHNvIHRoYXRcbiAgLy8gZHVwbGljYXRlcyBhcmUgYXV0b21hZ2ljYWxseSBwcnVuZWQuXG4gIC8vIExhdGVyLCB3ZSBkbyBhbiBPYmplY3Qua2V5cygpIG9uIHRoZXNlLlxuICAvLyBLZWVwIHRoZW0gYXMgYSBsaXN0IHNvIHdlIGNhbiBmaWxsIGluIHdoZW4gbm9udWxsIGlzIHNldC5cbiAgdGhpcy5tYXRjaGVzID0gbmV3IEFycmF5KG4pXG5cbiAgaWYgKHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gb25jZShjYilcbiAgICB0aGlzLm9uKCdlcnJvcicsIGNiKVxuICAgIHRoaXMub24oJ2VuZCcsIGZ1bmN0aW9uIChtYXRjaGVzKSB7XG4gICAgICBjYihudWxsLCBtYXRjaGVzKVxuICAgIH0pXG4gIH1cblxuICB2YXIgc2VsZiA9IHRoaXNcbiAgdGhpcy5fcHJvY2Vzc2luZyA9IDBcblxuICB0aGlzLl9lbWl0UXVldWUgPSBbXVxuICB0aGlzLl9wcm9jZXNzUXVldWUgPSBbXVxuICB0aGlzLnBhdXNlZCA9IGZhbHNlXG5cbiAgaWYgKHRoaXMubm9wcm9jZXNzKVxuICAgIHJldHVybiB0aGlzXG5cbiAgaWYgKG4gPT09IDApXG4gICAgcmV0dXJuIGRvbmUoKVxuXG4gIHZhciBzeW5jID0gdHJ1ZVxuICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkgKyspIHtcbiAgICB0aGlzLl9wcm9jZXNzKHRoaXMubWluaW1hdGNoLnNldFtpXSwgaSwgZmFsc2UsIGRvbmUpXG4gIH1cbiAgc3luYyA9IGZhbHNlXG5cbiAgZnVuY3Rpb24gZG9uZSAoKSB7XG4gICAgLS1zZWxmLl9wcm9jZXNzaW5nXG4gICAgaWYgKHNlbGYuX3Byb2Nlc3NpbmcgPD0gMCkge1xuICAgICAgaWYgKHN5bmMpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgc2VsZi5fZmluaXNoKClcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuX2ZpbmlzaCgpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLl9maW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gIGFzc2VydCh0aGlzIGluc3RhbmNlb2YgR2xvYilcbiAgaWYgKHRoaXMuYWJvcnRlZClcbiAgICByZXR1cm5cblxuICBpZiAodGhpcy5yZWFscGF0aCAmJiAhdGhpcy5fZGlkUmVhbHBhdGgpXG4gICAgcmV0dXJuIHRoaXMuX3JlYWxwYXRoKClcblxuICBjb21tb24uZmluaXNoKHRoaXMpXG4gIHRoaXMuZW1pdCgnZW5kJywgdGhpcy5mb3VuZClcbn1cblxuR2xvYi5wcm90b3R5cGUuX3JlYWxwYXRoID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5fZGlkUmVhbHBhdGgpXG4gICAgcmV0dXJuXG5cbiAgdGhpcy5fZGlkUmVhbHBhdGggPSB0cnVlXG5cbiAgdmFyIG4gPSB0aGlzLm1hdGNoZXMubGVuZ3RoXG4gIGlmIChuID09PSAwKVxuICAgIHJldHVybiB0aGlzLl9maW5pc2goKVxuXG4gIHZhciBzZWxmID0gdGhpc1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubWF0Y2hlcy5sZW5ndGg7IGkrKylcbiAgICB0aGlzLl9yZWFscGF0aFNldChpLCBuZXh0KVxuXG4gIGZ1bmN0aW9uIG5leHQgKCkge1xuICAgIGlmICgtLW4gPT09IDApXG4gICAgICBzZWxmLl9maW5pc2goKVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLl9yZWFscGF0aFNldCA9IGZ1bmN0aW9uIChpbmRleCwgY2IpIHtcbiAgdmFyIG1hdGNoc2V0ID0gdGhpcy5tYXRjaGVzW2luZGV4XVxuICBpZiAoIW1hdGNoc2V0KVxuICAgIHJldHVybiBjYigpXG5cbiAgdmFyIGZvdW5kID0gT2JqZWN0LmtleXMobWF0Y2hzZXQpXG4gIHZhciBzZWxmID0gdGhpc1xuICB2YXIgbiA9IGZvdW5kLmxlbmd0aFxuXG4gIGlmIChuID09PSAwKVxuICAgIHJldHVybiBjYigpXG5cbiAgdmFyIHNldCA9IHRoaXMubWF0Y2hlc1tpbmRleF0gPSBPYmplY3QuY3JlYXRlKG51bGwpXG4gIGZvdW5kLmZvckVhY2goZnVuY3Rpb24gKHAsIGkpIHtcbiAgICAvLyBJZiB0aGVyZSdzIGEgcHJvYmxlbSB3aXRoIHRoZSBzdGF0LCB0aGVuIGl0IG1lYW5zIHRoYXRcbiAgICAvLyBvbmUgb3IgbW9yZSBvZiB0aGUgbGlua3MgaW4gdGhlIHJlYWxwYXRoIGNvdWxkbid0IGJlXG4gICAgLy8gcmVzb2x2ZWQuICBqdXN0IHJldHVybiB0aGUgYWJzIHZhbHVlIGluIHRoYXQgY2FzZS5cbiAgICBwID0gc2VsZi5fbWFrZUFicyhwKVxuICAgIHJwLnJlYWxwYXRoKHAsIHNlbGYucmVhbHBhdGhDYWNoZSwgZnVuY3Rpb24gKGVyLCByZWFsKSB7XG4gICAgICBpZiAoIWVyKVxuICAgICAgICBzZXRbcmVhbF0gPSB0cnVlXG4gICAgICBlbHNlIGlmIChlci5zeXNjYWxsID09PSAnc3RhdCcpXG4gICAgICAgIHNldFtwXSA9IHRydWVcbiAgICAgIGVsc2VcbiAgICAgICAgc2VsZi5lbWl0KCdlcnJvcicsIGVyKSAvLyBzcnNseSB3dGYgcmlnaHQgaGVyZVxuXG4gICAgICBpZiAoLS1uID09PSAwKSB7XG4gICAgICAgIHNlbGYubWF0Y2hlc1tpbmRleF0gPSBzZXRcbiAgICAgICAgY2IoKVxuICAgICAgfVxuICAgIH0pXG4gIH0pXG59XG5cbkdsb2IucHJvdG90eXBlLl9tYXJrID0gZnVuY3Rpb24gKHApIHtcbiAgcmV0dXJuIGNvbW1vbi5tYXJrKHRoaXMsIHApXG59XG5cbkdsb2IucHJvdG90eXBlLl9tYWtlQWJzID0gZnVuY3Rpb24gKGYpIHtcbiAgcmV0dXJuIGNvbW1vbi5tYWtlQWJzKHRoaXMsIGYpXG59XG5cbkdsb2IucHJvdG90eXBlLmFib3J0ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFib3J0ZWQgPSB0cnVlXG4gIHRoaXMuZW1pdCgnYWJvcnQnKVxufVxuXG5HbG9iLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCF0aGlzLnBhdXNlZCkge1xuICAgIHRoaXMucGF1c2VkID0gdHJ1ZVxuICAgIHRoaXMuZW1pdCgncGF1c2UnKVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgdGhpcy5lbWl0KCdyZXN1bWUnKVxuICAgIHRoaXMucGF1c2VkID0gZmFsc2VcbiAgICBpZiAodGhpcy5fZW1pdFF1ZXVlLmxlbmd0aCkge1xuICAgICAgdmFyIGVxID0gdGhpcy5fZW1pdFF1ZXVlLnNsaWNlKDApXG4gICAgICB0aGlzLl9lbWl0UXVldWUubGVuZ3RoID0gMFxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlcS5sZW5ndGg7IGkgKyspIHtcbiAgICAgICAgdmFyIGUgPSBlcVtpXVxuICAgICAgICB0aGlzLl9lbWl0TWF0Y2goZVswXSwgZVsxXSlcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMuX3Byb2Nlc3NRdWV1ZS5sZW5ndGgpIHtcbiAgICAgIHZhciBwcSA9IHRoaXMuX3Byb2Nlc3NRdWV1ZS5zbGljZSgwKVxuICAgICAgdGhpcy5fcHJvY2Vzc1F1ZXVlLmxlbmd0aCA9IDBcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHEubGVuZ3RoOyBpICsrKSB7XG4gICAgICAgIHZhciBwID0gcHFbaV1cbiAgICAgICAgdGhpcy5fcHJvY2Vzc2luZy0tXG4gICAgICAgIHRoaXMuX3Byb2Nlc3MocFswXSwgcFsxXSwgcFsyXSwgcFszXSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuR2xvYi5wcm90b3R5cGUuX3Byb2Nlc3MgPSBmdW5jdGlvbiAocGF0dGVybiwgaW5kZXgsIGluR2xvYlN0YXIsIGNiKSB7XG4gIGFzc2VydCh0aGlzIGluc3RhbmNlb2YgR2xvYilcbiAgYXNzZXJ0KHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJylcblxuICBpZiAodGhpcy5hYm9ydGVkKVxuICAgIHJldHVyblxuXG4gIHRoaXMuX3Byb2Nlc3NpbmcrK1xuICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICB0aGlzLl9wcm9jZXNzUXVldWUucHVzaChbcGF0dGVybiwgaW5kZXgsIGluR2xvYlN0YXIsIGNiXSlcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vY29uc29sZS5lcnJvcignUFJPQ0VTUyAlZCcsIHRoaXMuX3Byb2Nlc3NpbmcsIHBhdHRlcm4pXG5cbiAgLy8gR2V0IHRoZSBmaXJzdCBbbl0gcGFydHMgb2YgcGF0dGVybiB0aGF0IGFyZSBhbGwgc3RyaW5ncy5cbiAgdmFyIG4gPSAwXG4gIHdoaWxlICh0eXBlb2YgcGF0dGVybltuXSA9PT0gJ3N0cmluZycpIHtcbiAgICBuICsrXG4gIH1cbiAgLy8gbm93IG4gaXMgdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBvbmUgdGhhdCBpcyAqbm90KiBhIHN0cmluZy5cblxuICAvLyBzZWUgaWYgdGhlcmUncyBhbnl0aGluZyBlbHNlXG4gIHZhciBwcmVmaXhcbiAgc3dpdGNoIChuKSB7XG4gICAgLy8gaWYgbm90LCB0aGVuIHRoaXMgaXMgcmF0aGVyIHNpbXBsZVxuICAgIGNhc2UgcGF0dGVybi5sZW5ndGg6XG4gICAgICB0aGlzLl9wcm9jZXNzU2ltcGxlKHBhdHRlcm4uam9pbignLycpLCBpbmRleCwgY2IpXG4gICAgICByZXR1cm5cblxuICAgIGNhc2UgMDpcbiAgICAgIC8vIHBhdHRlcm4gKnN0YXJ0cyogd2l0aCBzb21lIG5vbi10cml2aWFsIGl0ZW0uXG4gICAgICAvLyBnb2luZyB0byByZWFkZGlyKGN3ZCksIGJ1dCBub3QgaW5jbHVkZSB0aGUgcHJlZml4IGluIG1hdGNoZXMuXG4gICAgICBwcmVmaXggPSBudWxsXG4gICAgICBicmVha1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIC8vIHBhdHRlcm4gaGFzIHNvbWUgc3RyaW5nIGJpdHMgaW4gdGhlIGZyb250LlxuICAgICAgLy8gd2hhdGV2ZXIgaXQgc3RhcnRzIHdpdGgsIHdoZXRoZXIgdGhhdCdzICdhYnNvbHV0ZScgbGlrZSAvZm9vL2JhcixcbiAgICAgIC8vIG9yICdyZWxhdGl2ZScgbGlrZSAnLi4vYmF6J1xuICAgICAgcHJlZml4ID0gcGF0dGVybi5zbGljZSgwLCBuKS5qb2luKCcvJylcbiAgICAgIGJyZWFrXG4gIH1cblxuICB2YXIgcmVtYWluID0gcGF0dGVybi5zbGljZShuKVxuXG4gIC8vIGdldCB0aGUgbGlzdCBvZiBlbnRyaWVzLlxuICB2YXIgcmVhZFxuICBpZiAocHJlZml4ID09PSBudWxsKVxuICAgIHJlYWQgPSAnLidcbiAgZWxzZSBpZiAoaXNBYnNvbHV0ZShwcmVmaXgpIHx8IGlzQWJzb2x1dGUocGF0dGVybi5qb2luKCcvJykpKSB7XG4gICAgaWYgKCFwcmVmaXggfHwgIWlzQWJzb2x1dGUocHJlZml4KSlcbiAgICAgIHByZWZpeCA9ICcvJyArIHByZWZpeFxuICAgIHJlYWQgPSBwcmVmaXhcbiAgfSBlbHNlXG4gICAgcmVhZCA9IHByZWZpeFxuXG4gIHZhciBhYnMgPSB0aGlzLl9tYWtlQWJzKHJlYWQpXG5cbiAgLy9pZiBpZ25vcmVkLCBza2lwIF9wcm9jZXNzaW5nXG4gIGlmIChjaGlsZHJlbklnbm9yZWQodGhpcywgcmVhZCkpXG4gICAgcmV0dXJuIGNiKClcblxuICB2YXIgaXNHbG9iU3RhciA9IHJlbWFpblswXSA9PT0gbWluaW1hdGNoLkdMT0JTVEFSXG4gIGlmIChpc0dsb2JTdGFyKVxuICAgIHRoaXMuX3Byb2Nlc3NHbG9iU3RhcihwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgY2IpXG4gIGVsc2VcbiAgICB0aGlzLl9wcm9jZXNzUmVhZGRpcihwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgY2IpXG59XG5cbkdsb2IucHJvdG90eXBlLl9wcm9jZXNzUmVhZGRpciA9IGZ1bmN0aW9uIChwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHRoaXMuX3JlYWRkaXIoYWJzLCBpbkdsb2JTdGFyLCBmdW5jdGlvbiAoZXIsIGVudHJpZXMpIHtcbiAgICByZXR1cm4gc2VsZi5fcHJvY2Vzc1JlYWRkaXIyKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyLCBlbnRyaWVzLCBjYilcbiAgfSlcbn1cblxuR2xvYi5wcm90b3R5cGUuX3Byb2Nlc3NSZWFkZGlyMiA9IGZ1bmN0aW9uIChwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgZW50cmllcywgY2IpIHtcblxuICAvLyBpZiB0aGUgYWJzIGlzbid0IGEgZGlyLCB0aGVuIG5vdGhpbmcgY2FuIG1hdGNoIVxuICBpZiAoIWVudHJpZXMpXG4gICAgcmV0dXJuIGNiKClcblxuICAvLyBJdCB3aWxsIG9ubHkgbWF0Y2ggZG90IGVudHJpZXMgaWYgaXQgc3RhcnRzIHdpdGggYSBkb3QsIG9yIGlmXG4gIC8vIGRvdCBpcyBzZXQuICBTdHVmZiBsaWtlIEAoLmZvb3wuYmFyKSBpc24ndCBhbGxvd2VkLlxuICB2YXIgcG4gPSByZW1haW5bMF1cbiAgdmFyIG5lZ2F0ZSA9ICEhdGhpcy5taW5pbWF0Y2gubmVnYXRlXG4gIHZhciByYXdHbG9iID0gcG4uX2dsb2JcbiAgdmFyIGRvdE9rID0gdGhpcy5kb3QgfHwgcmF3R2xvYi5jaGFyQXQoMCkgPT09ICcuJ1xuXG4gIHZhciBtYXRjaGVkRW50cmllcyA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZW50cmllcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBlID0gZW50cmllc1tpXVxuICAgIGlmIChlLmNoYXJBdCgwKSAhPT0gJy4nIHx8IGRvdE9rKSB7XG4gICAgICB2YXIgbVxuICAgICAgaWYgKG5lZ2F0ZSAmJiAhcHJlZml4KSB7XG4gICAgICAgIG0gPSAhZS5tYXRjaChwbilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG0gPSBlLm1hdGNoKHBuKVxuICAgICAgfVxuICAgICAgaWYgKG0pXG4gICAgICAgIG1hdGNoZWRFbnRyaWVzLnB1c2goZSlcbiAgICB9XG4gIH1cblxuICAvL2NvbnNvbGUuZXJyb3IoJ3ByZDInLCBwcmVmaXgsIGVudHJpZXMsIHJlbWFpblswXS5fZ2xvYiwgbWF0Y2hlZEVudHJpZXMpXG5cbiAgdmFyIGxlbiA9IG1hdGNoZWRFbnRyaWVzLmxlbmd0aFxuICAvLyBJZiB0aGVyZSBhcmUgbm8gbWF0Y2hlZCBlbnRyaWVzLCB0aGVuIG5vdGhpbmcgbWF0Y2hlcy5cbiAgaWYgKGxlbiA9PT0gMClcbiAgICByZXR1cm4gY2IoKVxuXG4gIC8vIGlmIHRoaXMgaXMgdGhlIGxhc3QgcmVtYWluaW5nIHBhdHRlcm4gYml0LCB0aGVuIG5vIG5lZWQgZm9yXG4gIC8vIGFuIGFkZGl0aW9uYWwgc3RhdCAqdW5sZXNzKiB0aGUgdXNlciBoYXMgc3BlY2lmaWVkIG1hcmsgb3JcbiAgLy8gc3RhdCBleHBsaWNpdGx5LiAgV2Uga25vdyB0aGV5IGV4aXN0LCBzaW5jZSByZWFkZGlyIHJldHVybmVkXG4gIC8vIHRoZW0uXG5cbiAgaWYgKHJlbWFpbi5sZW5ndGggPT09IDEgJiYgIXRoaXMubWFyayAmJiAhdGhpcy5zdGF0KSB7XG4gICAgaWYgKCF0aGlzLm1hdGNoZXNbaW5kZXhdKVxuICAgICAgdGhpcy5tYXRjaGVzW2luZGV4XSA9IE9iamVjdC5jcmVhdGUobnVsbClcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICsrKSB7XG4gICAgICB2YXIgZSA9IG1hdGNoZWRFbnRyaWVzW2ldXG4gICAgICBpZiAocHJlZml4KSB7XG4gICAgICAgIGlmIChwcmVmaXggIT09ICcvJylcbiAgICAgICAgICBlID0gcHJlZml4ICsgJy8nICsgZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgZSA9IHByZWZpeCArIGVcbiAgICAgIH1cblxuICAgICAgaWYgKGUuY2hhckF0KDApID09PSAnLycgJiYgIXRoaXMubm9tb3VudCkge1xuICAgICAgICBlID0gcGF0aC5qb2luKHRoaXMucm9vdCwgZSlcbiAgICAgIH1cbiAgICAgIHRoaXMuX2VtaXRNYXRjaChpbmRleCwgZSlcbiAgICB9XG4gICAgLy8gVGhpcyB3YXMgdGhlIGxhc3Qgb25lLCBhbmQgbm8gc3RhdHMgd2VyZSBuZWVkZWRcbiAgICByZXR1cm4gY2IoKVxuICB9XG5cbiAgLy8gbm93IHRlc3QgYWxsIG1hdGNoZWQgZW50cmllcyBhcyBzdGFuZC1pbnMgZm9yIHRoYXQgcGFydFxuICAvLyBvZiB0aGUgcGF0dGVybi5cbiAgcmVtYWluLnNoaWZ0KClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKyspIHtcbiAgICB2YXIgZSA9IG1hdGNoZWRFbnRyaWVzW2ldXG4gICAgdmFyIG5ld1BhdHRlcm5cbiAgICBpZiAocHJlZml4KSB7XG4gICAgICBpZiAocHJlZml4ICE9PSAnLycpXG4gICAgICAgIGUgPSBwcmVmaXggKyAnLycgKyBlXG4gICAgICBlbHNlXG4gICAgICAgIGUgPSBwcmVmaXggKyBlXG4gICAgfVxuICAgIHRoaXMuX3Byb2Nlc3MoW2VdLmNvbmNhdChyZW1haW4pLCBpbmRleCwgaW5HbG9iU3RhciwgY2IpXG4gIH1cbiAgY2IoKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fZW1pdE1hdGNoID0gZnVuY3Rpb24gKGluZGV4LCBlKSB7XG4gIGlmICh0aGlzLmFib3J0ZWQpXG4gICAgcmV0dXJuXG5cbiAgaWYgKGlzSWdub3JlZCh0aGlzLCBlKSlcbiAgICByZXR1cm5cblxuICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICB0aGlzLl9lbWl0UXVldWUucHVzaChbaW5kZXgsIGVdKVxuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGFicyA9IGlzQWJzb2x1dGUoZSkgPyBlIDogdGhpcy5fbWFrZUFicyhlKVxuXG4gIGlmICh0aGlzLm1hcmspXG4gICAgZSA9IHRoaXMuX21hcmsoZSlcblxuICBpZiAodGhpcy5hYnNvbHV0ZSlcbiAgICBlID0gYWJzXG5cbiAgaWYgKHRoaXMubWF0Y2hlc1tpbmRleF1bZV0pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHRoaXMubm9kaXIpIHtcbiAgICB2YXIgYyA9IHRoaXMuY2FjaGVbYWJzXVxuICAgIGlmIChjID09PSAnRElSJyB8fCBBcnJheS5pc0FycmF5KGMpKVxuICAgICAgcmV0dXJuXG4gIH1cblxuICB0aGlzLm1hdGNoZXNbaW5kZXhdW2VdID0gdHJ1ZVxuXG4gIHZhciBzdCA9IHRoaXMuc3RhdENhY2hlW2Fic11cbiAgaWYgKHN0KVxuICAgIHRoaXMuZW1pdCgnc3RhdCcsIGUsIHN0KVxuXG4gIHRoaXMuZW1pdCgnbWF0Y2gnLCBlKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcmVhZGRpckluR2xvYlN0YXIgPSBmdW5jdGlvbiAoYWJzLCBjYikge1xuICBpZiAodGhpcy5hYm9ydGVkKVxuICAgIHJldHVyblxuXG4gIC8vIGZvbGxvdyBhbGwgc3ltbGlua2VkIGRpcmVjdG9yaWVzIGZvcmV2ZXJcbiAgLy8ganVzdCBwcm9jZWVkIGFzIGlmIHRoaXMgaXMgYSBub24tZ2xvYnN0YXIgc2l0dWF0aW9uXG4gIGlmICh0aGlzLmZvbGxvdylcbiAgICByZXR1cm4gdGhpcy5fcmVhZGRpcihhYnMsIGZhbHNlLCBjYilcblxuICB2YXIgbHN0YXRrZXkgPSAnbHN0YXRcXDAnICsgYWJzXG4gIHZhciBzZWxmID0gdGhpc1xuICB2YXIgbHN0YXRjYiA9IGluZmxpZ2h0KGxzdGF0a2V5LCBsc3RhdGNiXylcblxuICBpZiAobHN0YXRjYilcbiAgICBmcy5sc3RhdChhYnMsIGxzdGF0Y2IpXG5cbiAgZnVuY3Rpb24gbHN0YXRjYl8gKGVyLCBsc3RhdCkge1xuICAgIGlmIChlciAmJiBlci5jb2RlID09PSAnRU5PRU5UJylcbiAgICAgIHJldHVybiBjYigpXG5cbiAgICB2YXIgaXNTeW0gPSBsc3RhdCAmJiBsc3RhdC5pc1N5bWJvbGljTGluaygpXG4gICAgc2VsZi5zeW1saW5rc1thYnNdID0gaXNTeW1cblxuICAgIC8vIElmIGl0J3Mgbm90IGEgc3ltbGluayBvciBhIGRpciwgdGhlbiBpdCdzIGRlZmluaXRlbHkgYSByZWd1bGFyIGZpbGUuXG4gICAgLy8gZG9uJ3QgYm90aGVyIGRvaW5nIGEgcmVhZGRpciBpbiB0aGF0IGNhc2UuXG4gICAgaWYgKCFpc1N5bSAmJiBsc3RhdCAmJiAhbHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgc2VsZi5jYWNoZVthYnNdID0gJ0ZJTEUnXG4gICAgICBjYigpXG4gICAgfSBlbHNlXG4gICAgICBzZWxmLl9yZWFkZGlyKGFicywgZmFsc2UsIGNiKVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLl9yZWFkZGlyID0gZnVuY3Rpb24gKGFicywgaW5HbG9iU3RhciwgY2IpIHtcbiAgaWYgKHRoaXMuYWJvcnRlZClcbiAgICByZXR1cm5cblxuICBjYiA9IGluZmxpZ2h0KCdyZWFkZGlyXFwwJythYnMrJ1xcMCcraW5HbG9iU3RhciwgY2IpXG4gIGlmICghY2IpXG4gICAgcmV0dXJuXG5cbiAgLy9jb25zb2xlLmVycm9yKCdSRCAlaiAlaicsICtpbkdsb2JTdGFyLCBhYnMpXG4gIGlmIChpbkdsb2JTdGFyICYmICFvd25Qcm9wKHRoaXMuc3ltbGlua3MsIGFicykpXG4gICAgcmV0dXJuIHRoaXMuX3JlYWRkaXJJbkdsb2JTdGFyKGFicywgY2IpXG5cbiAgaWYgKG93blByb3AodGhpcy5jYWNoZSwgYWJzKSkge1xuICAgIHZhciBjID0gdGhpcy5jYWNoZVthYnNdXG4gICAgaWYgKCFjIHx8IGMgPT09ICdGSUxFJylcbiAgICAgIHJldHVybiBjYigpXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShjKSlcbiAgICAgIHJldHVybiBjYihudWxsLCBjKVxuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gIGZzLnJlYWRkaXIoYWJzLCByZWFkZGlyQ2IodGhpcywgYWJzLCBjYikpXG59XG5cbmZ1bmN0aW9uIHJlYWRkaXJDYiAoc2VsZiwgYWJzLCBjYikge1xuICByZXR1cm4gZnVuY3Rpb24gKGVyLCBlbnRyaWVzKSB7XG4gICAgaWYgKGVyKVxuICAgICAgc2VsZi5fcmVhZGRpckVycm9yKGFicywgZXIsIGNiKVxuICAgIGVsc2VcbiAgICAgIHNlbGYuX3JlYWRkaXJFbnRyaWVzKGFicywgZW50cmllcywgY2IpXG4gIH1cbn1cblxuR2xvYi5wcm90b3R5cGUuX3JlYWRkaXJFbnRyaWVzID0gZnVuY3Rpb24gKGFicywgZW50cmllcywgY2IpIHtcbiAgaWYgKHRoaXMuYWJvcnRlZClcbiAgICByZXR1cm5cblxuICAvLyBpZiB3ZSBoYXZlbid0IGFza2VkIHRvIHN0YXQgZXZlcnl0aGluZywgdGhlbiBqdXN0XG4gIC8vIGFzc3VtZSB0aGF0IGV2ZXJ5dGhpbmcgaW4gdGhlcmUgZXhpc3RzLCBzbyB3ZSBjYW4gYXZvaWRcbiAgLy8gaGF2aW5nIHRvIHN0YXQgaXQgYSBzZWNvbmQgdGltZS5cbiAgaWYgKCF0aGlzLm1hcmsgJiYgIXRoaXMuc3RhdCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW50cmllcy5sZW5ndGg7IGkgKyspIHtcbiAgICAgIHZhciBlID0gZW50cmllc1tpXVxuICAgICAgaWYgKGFicyA9PT0gJy8nKVxuICAgICAgICBlID0gYWJzICsgZVxuICAgICAgZWxzZVxuICAgICAgICBlID0gYWJzICsgJy8nICsgZVxuICAgICAgdGhpcy5jYWNoZVtlXSA9IHRydWVcbiAgICB9XG4gIH1cblxuICB0aGlzLmNhY2hlW2Fic10gPSBlbnRyaWVzXG4gIHJldHVybiBjYihudWxsLCBlbnRyaWVzKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcmVhZGRpckVycm9yID0gZnVuY3Rpb24gKGYsIGVyLCBjYikge1xuICBpZiAodGhpcy5hYm9ydGVkKVxuICAgIHJldHVyblxuXG4gIC8vIGhhbmRsZSBlcnJvcnMsIGFuZCBjYWNoZSB0aGUgaW5mb3JtYXRpb25cbiAgc3dpdGNoIChlci5jb2RlKSB7XG4gICAgY2FzZSAnRU5PVFNVUCc6IC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9pc2FhY3Mvbm9kZS1nbG9iL2lzc3Vlcy8yMDVcbiAgICBjYXNlICdFTk9URElSJzogLy8gdG90YWxseSBub3JtYWwuIG1lYW5zIGl0ICpkb2VzKiBleGlzdC5cbiAgICAgIHZhciBhYnMgPSB0aGlzLl9tYWtlQWJzKGYpXG4gICAgICB0aGlzLmNhY2hlW2Fic10gPSAnRklMRSdcbiAgICAgIGlmIChhYnMgPT09IHRoaXMuY3dkQWJzKSB7XG4gICAgICAgIHZhciBlcnJvciA9IG5ldyBFcnJvcihlci5jb2RlICsgJyBpbnZhbGlkIGN3ZCAnICsgdGhpcy5jd2QpXG4gICAgICAgIGVycm9yLnBhdGggPSB0aGlzLmN3ZFxuICAgICAgICBlcnJvci5jb2RlID0gZXIuY29kZVxuICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyb3IpXG4gICAgICAgIHRoaXMuYWJvcnQoKVxuICAgICAgfVxuICAgICAgYnJlYWtcblxuICAgIGNhc2UgJ0VOT0VOVCc6IC8vIG5vdCB0ZXJyaWJseSB1bnVzdWFsXG4gICAgY2FzZSAnRUxPT1AnOlxuICAgIGNhc2UgJ0VOQU1FVE9PTE9ORyc6XG4gICAgY2FzZSAnVU5LTk9XTic6XG4gICAgICB0aGlzLmNhY2hlW3RoaXMuX21ha2VBYnMoZildID0gZmFsc2VcbiAgICAgIGJyZWFrXG5cbiAgICBkZWZhdWx0OiAvLyBzb21lIHVudXN1YWwgZXJyb3IuICBUcmVhdCBhcyBmYWlsdXJlLlxuICAgICAgdGhpcy5jYWNoZVt0aGlzLl9tYWtlQWJzKGYpXSA9IGZhbHNlXG4gICAgICBpZiAodGhpcy5zdHJpY3QpIHtcbiAgICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVyKVxuICAgICAgICAvLyBJZiB0aGUgZXJyb3IgaXMgaGFuZGxlZCwgdGhlbiB3ZSBhYm9ydFxuICAgICAgICAvLyBpZiBub3QsIHdlIHRocmV3IG91dCBvZiBoZXJlXG4gICAgICAgIHRoaXMuYWJvcnQoKVxuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLnNpbGVudClcbiAgICAgICAgY29uc29sZS5lcnJvcignZ2xvYiBlcnJvcicsIGVyKVxuICAgICAgYnJlYWtcbiAgfVxuXG4gIHJldHVybiBjYigpXG59XG5cbkdsb2IucHJvdG90eXBlLl9wcm9jZXNzR2xvYlN0YXIgPSBmdW5jdGlvbiAocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIsIGNiKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuICB0aGlzLl9yZWFkZGlyKGFicywgaW5HbG9iU3RhciwgZnVuY3Rpb24gKGVyLCBlbnRyaWVzKSB7XG4gICAgc2VsZi5fcHJvY2Vzc0dsb2JTdGFyMihwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgZW50cmllcywgY2IpXG4gIH0pXG59XG5cblxuR2xvYi5wcm90b3R5cGUuX3Byb2Nlc3NHbG9iU3RhcjIgPSBmdW5jdGlvbiAocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIsIGVudHJpZXMsIGNiKSB7XG4gIC8vY29uc29sZS5lcnJvcigncGdzMicsIHByZWZpeCwgcmVtYWluWzBdLCBlbnRyaWVzKVxuXG4gIC8vIG5vIGVudHJpZXMgbWVhbnMgbm90IGEgZGlyLCBzbyBpdCBjYW4gbmV2ZXIgaGF2ZSBtYXRjaGVzXG4gIC8vIGZvby50eHQvKiogZG9lc24ndCBtYXRjaCBmb28udHh0XG4gIGlmICghZW50cmllcylcbiAgICByZXR1cm4gY2IoKVxuXG4gIC8vIHRlc3Qgd2l0aG91dCB0aGUgZ2xvYnN0YXIsIGFuZCB3aXRoIGV2ZXJ5IGNoaWxkIGJvdGggYmVsb3dcbiAgLy8gYW5kIHJlcGxhY2luZyB0aGUgZ2xvYnN0YXIuXG4gIHZhciByZW1haW5XaXRob3V0R2xvYlN0YXIgPSByZW1haW4uc2xpY2UoMSlcbiAgdmFyIGdzcHJlZiA9IHByZWZpeCA/IFsgcHJlZml4IF0gOiBbXVxuICB2YXIgbm9HbG9iU3RhciA9IGdzcHJlZi5jb25jYXQocmVtYWluV2l0aG91dEdsb2JTdGFyKVxuXG4gIC8vIHRoZSBub0dsb2JTdGFyIHBhdHRlcm4gZXhpdHMgdGhlIGluR2xvYlN0YXIgc3RhdGVcbiAgdGhpcy5fcHJvY2Vzcyhub0dsb2JTdGFyLCBpbmRleCwgZmFsc2UsIGNiKVxuXG4gIHZhciBpc1N5bSA9IHRoaXMuc3ltbGlua3NbYWJzXVxuICB2YXIgbGVuID0gZW50cmllcy5sZW5ndGhcblxuICAvLyBJZiBpdCdzIGEgc3ltbGluaywgYW5kIHdlJ3JlIGluIGEgZ2xvYnN0YXIsIHRoZW4gc3RvcFxuICBpZiAoaXNTeW0gJiYgaW5HbG9iU3RhcilcbiAgICByZXR1cm4gY2IoKVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICB2YXIgZSA9IGVudHJpZXNbaV1cbiAgICBpZiAoZS5jaGFyQXQoMCkgPT09ICcuJyAmJiAhdGhpcy5kb3QpXG4gICAgICBjb250aW51ZVxuXG4gICAgLy8gdGhlc2UgdHdvIGNhc2VzIGVudGVyIHRoZSBpbkdsb2JTdGFyIHN0YXRlXG4gICAgdmFyIGluc3RlYWQgPSBnc3ByZWYuY29uY2F0KGVudHJpZXNbaV0sIHJlbWFpbldpdGhvdXRHbG9iU3RhcilcbiAgICB0aGlzLl9wcm9jZXNzKGluc3RlYWQsIGluZGV4LCB0cnVlLCBjYilcblxuICAgIHZhciBiZWxvdyA9IGdzcHJlZi5jb25jYXQoZW50cmllc1tpXSwgcmVtYWluKVxuICAgIHRoaXMuX3Byb2Nlc3MoYmVsb3csIGluZGV4LCB0cnVlLCBjYilcbiAgfVxuXG4gIGNiKClcbn1cblxuR2xvYi5wcm90b3R5cGUuX3Byb2Nlc3NTaW1wbGUgPSBmdW5jdGlvbiAocHJlZml4LCBpbmRleCwgY2IpIHtcbiAgLy8gWFhYIHJldmlldyB0aGlzLiAgU2hvdWxkbid0IGl0IGJlIGRvaW5nIHRoZSBtb3VudGluZyBldGNcbiAgLy8gYmVmb3JlIGRvaW5nIHN0YXQ/ICBraW5kYSB3ZWlyZD9cbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHRoaXMuX3N0YXQocHJlZml4LCBmdW5jdGlvbiAoZXIsIGV4aXN0cykge1xuICAgIHNlbGYuX3Byb2Nlc3NTaW1wbGUyKHByZWZpeCwgaW5kZXgsIGVyLCBleGlzdHMsIGNiKVxuICB9KVxufVxuR2xvYi5wcm90b3R5cGUuX3Byb2Nlc3NTaW1wbGUyID0gZnVuY3Rpb24gKHByZWZpeCwgaW5kZXgsIGVyLCBleGlzdHMsIGNiKSB7XG5cbiAgLy9jb25zb2xlLmVycm9yKCdwczInLCBwcmVmaXgsIGV4aXN0cylcblxuICBpZiAoIXRoaXMubWF0Y2hlc1tpbmRleF0pXG4gICAgdGhpcy5tYXRjaGVzW2luZGV4XSA9IE9iamVjdC5jcmVhdGUobnVsbClcblxuICAvLyBJZiBpdCBkb2Vzbid0IGV4aXN0LCB0aGVuIGp1c3QgbWFyayB0aGUgbGFjayBvZiByZXN1bHRzXG4gIGlmICghZXhpc3RzKVxuICAgIHJldHVybiBjYigpXG5cbiAgaWYgKHByZWZpeCAmJiBpc0Fic29sdXRlKHByZWZpeCkgJiYgIXRoaXMubm9tb3VudCkge1xuICAgIHZhciB0cmFpbCA9IC9bXFwvXFxcXF0kLy50ZXN0KHByZWZpeClcbiAgICBpZiAocHJlZml4LmNoYXJBdCgwKSA9PT0gJy8nKSB7XG4gICAgICBwcmVmaXggPSBwYXRoLmpvaW4odGhpcy5yb290LCBwcmVmaXgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHByZWZpeCA9IHBhdGgucmVzb2x2ZSh0aGlzLnJvb3QsIHByZWZpeClcbiAgICAgIGlmICh0cmFpbClcbiAgICAgICAgcHJlZml4ICs9ICcvJ1xuICAgIH1cbiAgfVxuXG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKVxuICAgIHByZWZpeCA9IHByZWZpeC5yZXBsYWNlKC9cXFxcL2csICcvJylcblxuICAvLyBNYXJrIHRoaXMgYXMgYSBtYXRjaFxuICB0aGlzLl9lbWl0TWF0Y2goaW5kZXgsIHByZWZpeClcbiAgY2IoKVxufVxuXG4vLyBSZXR1cm5zIGVpdGhlciAnRElSJywgJ0ZJTEUnLCBvciBmYWxzZVxuR2xvYi5wcm90b3R5cGUuX3N0YXQgPSBmdW5jdGlvbiAoZiwgY2IpIHtcbiAgdmFyIGFicyA9IHRoaXMuX21ha2VBYnMoZilcbiAgdmFyIG5lZWREaXIgPSBmLnNsaWNlKC0xKSA9PT0gJy8nXG5cbiAgaWYgKGYubGVuZ3RoID4gdGhpcy5tYXhMZW5ndGgpXG4gICAgcmV0dXJuIGNiKClcblxuICBpZiAoIXRoaXMuc3RhdCAmJiBvd25Qcm9wKHRoaXMuY2FjaGUsIGFicykpIHtcbiAgICB2YXIgYyA9IHRoaXMuY2FjaGVbYWJzXVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYykpXG4gICAgICBjID0gJ0RJUidcblxuICAgIC8vIEl0IGV4aXN0cywgYnV0IG1heWJlIG5vdCBob3cgd2UgbmVlZCBpdFxuICAgIGlmICghbmVlZERpciB8fCBjID09PSAnRElSJylcbiAgICAgIHJldHVybiBjYihudWxsLCBjKVxuXG4gICAgaWYgKG5lZWREaXIgJiYgYyA9PT0gJ0ZJTEUnKVxuICAgICAgcmV0dXJuIGNiKClcblxuICAgIC8vIG90aGVyd2lzZSB3ZSBoYXZlIHRvIHN0YXQsIGJlY2F1c2UgbWF5YmUgYz10cnVlXG4gICAgLy8gaWYgd2Uga25vdyBpdCBleGlzdHMsIGJ1dCBub3Qgd2hhdCBpdCBpcy5cbiAgfVxuXG4gIHZhciBleGlzdHNcbiAgdmFyIHN0YXQgPSB0aGlzLnN0YXRDYWNoZVthYnNdXG4gIGlmIChzdGF0ICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoc3RhdCA9PT0gZmFsc2UpXG4gICAgICByZXR1cm4gY2IobnVsbCwgc3RhdClcbiAgICBlbHNlIHtcbiAgICAgIHZhciB0eXBlID0gc3RhdC5pc0RpcmVjdG9yeSgpID8gJ0RJUicgOiAnRklMRSdcbiAgICAgIGlmIChuZWVkRGlyICYmIHR5cGUgPT09ICdGSUxFJylcbiAgICAgICAgcmV0dXJuIGNiKClcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIGNiKG51bGwsIHR5cGUsIHN0YXQpXG4gICAgfVxuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHZhciBzdGF0Y2IgPSBpbmZsaWdodCgnc3RhdFxcMCcgKyBhYnMsIGxzdGF0Y2JfKVxuICBpZiAoc3RhdGNiKVxuICAgIGZzLmxzdGF0KGFicywgc3RhdGNiKVxuXG4gIGZ1bmN0aW9uIGxzdGF0Y2JfIChlciwgbHN0YXQpIHtcbiAgICBpZiAobHN0YXQgJiYgbHN0YXQuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgLy8gSWYgaXQncyBhIHN5bWxpbmssIHRoZW4gdHJlYXQgaXQgYXMgdGhlIHRhcmdldCwgdW5sZXNzXG4gICAgICAvLyB0aGUgdGFyZ2V0IGRvZXMgbm90IGV4aXN0LCB0aGVuIHRyZWF0IGl0IGFzIGEgZmlsZS5cbiAgICAgIHJldHVybiBmcy5zdGF0KGFicywgZnVuY3Rpb24gKGVyLCBzdGF0KSB7XG4gICAgICAgIGlmIChlcilcbiAgICAgICAgICBzZWxmLl9zdGF0MihmLCBhYnMsIG51bGwsIGxzdGF0LCBjYilcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNlbGYuX3N0YXQyKGYsIGFicywgZXIsIHN0YXQsIGNiKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5fc3RhdDIoZiwgYWJzLCBlciwgbHN0YXQsIGNiKVxuICAgIH1cbiAgfVxufVxuXG5HbG9iLnByb3RvdHlwZS5fc3RhdDIgPSBmdW5jdGlvbiAoZiwgYWJzLCBlciwgc3RhdCwgY2IpIHtcbiAgaWYgKGVyICYmIChlci5jb2RlID09PSAnRU5PRU5UJyB8fCBlci5jb2RlID09PSAnRU5PVERJUicpKSB7XG4gICAgdGhpcy5zdGF0Q2FjaGVbYWJzXSA9IGZhbHNlXG4gICAgcmV0dXJuIGNiKClcbiAgfVxuXG4gIHZhciBuZWVkRGlyID0gZi5zbGljZSgtMSkgPT09ICcvJ1xuICB0aGlzLnN0YXRDYWNoZVthYnNdID0gc3RhdFxuXG4gIGlmIChhYnMuc2xpY2UoLTEpID09PSAnLycgJiYgc3RhdCAmJiAhc3RhdC5pc0RpcmVjdG9yeSgpKVxuICAgIHJldHVybiBjYihudWxsLCBmYWxzZSwgc3RhdClcblxuICB2YXIgYyA9IHRydWVcbiAgaWYgKHN0YXQpXG4gICAgYyA9IHN0YXQuaXNEaXJlY3RvcnkoKSA/ICdESVInIDogJ0ZJTEUnXG4gIHRoaXMuY2FjaGVbYWJzXSA9IHRoaXMuY2FjaGVbYWJzXSB8fCBjXG5cbiAgaWYgKG5lZWREaXIgJiYgYyA9PT0gJ0ZJTEUnKVxuICAgIHJldHVybiBjYigpXG5cbiAgcmV0dXJuIGNiKG51bGwsIGMsIHN0YXQpXG59XG4iXX0=