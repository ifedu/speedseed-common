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
    var n = this.minimatch.set.length;
    this._processing = 0;
    this.matches = new Array(n);
    this._emitQueue = [];
    this._processQueue = [];
    this.paused = false;
    if (this.noprocess)
        return this;
    if (n === 0)
        return done();
    for (var i = 0; i < n; i++) {
        this._process(this.minimatch.set[i], i, false, done);
    }
    function done() {
        --self._processing;
        if (self._processing <= 0)
            self._finish();
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
        fs.realpath(p, self.realpathCache, function (er, real) {
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
    if (this.matches[index][e])
        return;
    if (isIgnored(this, e))
        return;
    if (this.paused) {
        this._emitQueue.push([index, e]);
        return;
    }
    var abs = this._makeAbs(e);
    if (this.nodir) {
        var c = this.cache[abs];
        if (c === 'DIR' || Array.isArray(c))
            return;
    }
    if (this.mark)
        e = this._mark(e);
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
        if (er)
            return cb();
        var isSym = lstat.isSymbolicLink();
        self.symlinks[abs] = isSym;
        // If it's not a symlink or a dir, then it's definitely a regular file.
        // don't bother doing a readdir in that case.
        if (!isSym && !lstat.isDirectory()) {
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
            this.cache[this._makeAbs(f)] = 'FILE';
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
    if (er) {
        this.statCache[abs] = false;
        return cb();
    }
    var needDir = f.slice(-1) === '/';
    this.statCache[abs] = stat;
    if (abs.slice(-1) === '/' && !stat.isDirectory())
        return cb(null, false, stat);
    var c = stat.isDirectory() ? 'DIR' : 'FILE';
    this.cache[abs] = this.cache[abs] || c;
    if (needDir && c !== 'DIR')
        return cb();
    return cb(null, c, stat);
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZW52aXJvbm1lbnRcXG5vZGVfbW9kdWxlc1xcZ2xvYlxcZ2xvYi5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZW52aXJvbm1lbnRcXG5vZGVfbW9kdWxlc1xcZ2xvYlxcZ2xvYi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZO0FBQ1osRUFBRTtBQUNGLDJCQUEyQjtBQUMzQiwwREFBMEQ7QUFDMUQsMkNBQTJDO0FBQzNDLEVBQUU7QUFDRiwrQkFBK0I7QUFDL0IsNERBQTREO0FBQzVELHdDQUF3QztBQUN4Qyx5REFBeUQ7QUFDekQseUNBQXlDO0FBQ3pDLEVBQUU7QUFDRix3REFBd0Q7QUFDeEQscUJBQXFCO0FBQ3JCLGtDQUFrQztBQUNsQyxpQkFBaUI7QUFDakIsRUFBRTtBQUNGLGVBQWU7QUFDZiw4QkFBOEI7QUFDOUIsMkRBQTJEO0FBQzNELDhEQUE4RDtBQUM5RCx3REFBd0Q7QUFDeEQsNkJBQTZCO0FBQzdCLDBDQUEwQztBQUMxQyxpREFBaUQ7QUFDakQsb0RBQW9EO0FBQ3BELCtEQUErRDtBQUMvRCxFQUFFO0FBQ0YseUJBQXlCO0FBQ3pCLG9FQUFvRTtBQUNwRSxzQ0FBc0M7QUFDdEMsMkJBQTJCO0FBQzNCLHFFQUFxRTtBQUNyRSxFQUFFO0FBQ0YsVUFBVTtBQUNWLHlFQUF5RTtBQUN6RSx5RUFBeUU7QUFDekUseUVBQXlFO0FBQ3pFLDZCQUE2QjtBQUU3QixNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQTtBQUVyQixJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFB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IHRoZSBtaW5pbWF0Y2ggc2V0XG4vLyAyLiBGb3IgZWFjaCBwYXR0ZXJuIGluIHRoZSBzZXQsIFBST0NFU1MocGF0dGVybiwgZmFsc2UpXG4vLyAzLiBTdG9yZSBtYXRjaGVzIHBlci1zZXQsIHRoZW4gdW5pcSB0aGVtXG4vL1xuLy8gUFJPQ0VTUyhwYXR0ZXJuLCBpbkdsb2JTdGFyKVxuLy8gR2V0IHRoZSBmaXJzdCBbbl0gaXRlbXMgZnJvbSBwYXR0ZXJuIHRoYXQgYXJlIGFsbCBzdHJpbmdzXG4vLyBKb2luIHRoZXNlIHRvZ2V0aGVyLiAgVGhpcyBpcyBQUkVGSVguXG4vLyAgIElmIHRoZXJlIGlzIG5vIG1vcmUgcmVtYWluaW5nLCB0aGVuIHN0YXQoUFJFRklYKSBhbmRcbi8vICAgYWRkIHRvIG1hdGNoZXMgaWYgaXQgc3VjY2VlZHMuICBFTkQuXG4vL1xuLy8gSWYgaW5HbG9iU3RhciBhbmQgUFJFRklYIGlzIHN5bWxpbmsgYW5kIHBvaW50cyB0byBkaXJcbi8vICAgc2V0IEVOVFJJRVMgPSBbXVxuLy8gZWxzZSByZWFkZGlyKFBSRUZJWCkgYXMgRU5UUklFU1xuLy8gICBJZiBmYWlsLCBFTkRcbi8vXG4vLyB3aXRoIEVOVFJJRVNcbi8vICAgSWYgcGF0dGVybltuXSBpcyBHTE9CU1RBUlxuLy8gICAgIC8vIGhhbmRsZSB0aGUgY2FzZSB3aGVyZSB0aGUgZ2xvYnN0YXIgbWF0Y2ggaXMgZW1wdHlcbi8vICAgICAvLyBieSBwcnVuaW5nIGl0IG91dCwgYW5kIHRlc3RpbmcgdGhlIHJlc3VsdGluZyBwYXR0ZXJuXG4vLyAgICAgUFJPQ0VTUyhwYXR0ZXJuWzAuLm5dICsgcGF0dGVybltuKzEgLi4gJF0sIGZhbHNlKVxuLy8gICAgIC8vIGhhbmRsZSBvdGhlciBjYXNlcy5cbi8vICAgICBmb3IgRU5UUlkgaW4gRU5UUklFUyAobm90IGRvdGZpbGVzKVxuLy8gICAgICAgLy8gYXR0YWNoIGdsb2JzdGFyICsgdGFpbCBvbnRvIHRoZSBlbnRyeVxuLy8gICAgICAgLy8gTWFyayB0aGF0IHRoaXMgZW50cnkgaXMgYSBnbG9ic3RhciBtYXRjaFxuLy8gICAgICAgUFJPQ0VTUyhwYXR0ZXJuWzAuLm5dICsgRU5UUlkgKyBwYXR0ZXJuW24gLi4gJF0sIHRydWUpXG4vL1xuLy8gICBlbHNlIC8vIG5vdCBnbG9ic3RhclxuLy8gICAgIGZvciBFTlRSWSBpbiBFTlRSSUVTIChub3QgZG90ZmlsZXMsIHVubGVzcyBwYXR0ZXJuW25dIGlzIGRvdClcbi8vICAgICAgIFRlc3QgRU5UUlkgYWdhaW5zdCBwYXR0ZXJuW25dXG4vLyAgICAgICBJZiBmYWlscywgY29udGludWVcbi8vICAgICAgIElmIHBhc3NlcywgUFJPQ0VTUyhwYXR0ZXJuWzAuLm5dICsgaXRlbSArIHBhdHRlcm5bbisxIC4uICRdKVxuLy9cbi8vIENhdmVhdDpcbi8vICAgQ2FjaGUgYWxsIHN0YXRzIGFuZCByZWFkZGlycyByZXN1bHRzIHRvIG1pbmltaXplIHN5c2NhbGwuICBTaW5jZSBhbGxcbi8vICAgd2UgZXZlciBjYXJlIGFib3V0IGlzIGV4aXN0ZW5jZSBhbmQgZGlyZWN0b3J5LW5lc3MsIHdlIGNhbiBqdXN0IGtlZXBcbi8vICAgYHRydWVgIGZvciBmaWxlcywgYW5kIFtjaGlsZHJlbiwuLi5dIGZvciBkaXJlY3Rvcmllcywgb3IgYGZhbHNlYCBmb3Jcbi8vICAgdGhpbmdzIHRoYXQgZG9uJ3QgZXhpc3QuXG5cbm1vZHVsZS5leHBvcnRzID0gZ2xvYlxuXG52YXIgZnMgPSByZXF1aXJlKCdmcycpXG52YXIgbWluaW1hdGNoID0gcmVxdWlyZSgnbWluaW1hdGNoJylcbnZhciBNaW5pbWF0Y2ggPSBtaW5pbWF0Y2guTWluaW1hdGNoXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpXG52YXIgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXJcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcbnZhciBpc0Fic29sdXRlID0gcmVxdWlyZSgncGF0aC1pcy1hYnNvbHV0ZScpXG52YXIgZ2xvYlN5bmMgPSByZXF1aXJlKCcuL3N5bmMuanMnKVxudmFyIGNvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uLmpzJylcbnZhciBhbHBoYXNvcnQgPSBjb21tb24uYWxwaGFzb3J0XG52YXIgYWxwaGFzb3J0aSA9IGNvbW1vbi5hbHBoYXNvcnRpXG52YXIgc2V0b3B0cyA9IGNvbW1vbi5zZXRvcHRzXG52YXIgb3duUHJvcCA9IGNvbW1vbi5vd25Qcm9wXG52YXIgaW5mbGlnaHQgPSByZXF1aXJlKCdpbmZsaWdodCcpXG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKVxudmFyIGNoaWxkcmVuSWdub3JlZCA9IGNvbW1vbi5jaGlsZHJlbklnbm9yZWRcbnZhciBpc0lnbm9yZWQgPSBjb21tb24uaXNJZ25vcmVkXG5cbnZhciBvbmNlID0gcmVxdWlyZSgnb25jZScpXG5cbmZ1bmN0aW9uIGdsb2IgKHBhdHRlcm4sIG9wdGlvbnMsIGNiKSB7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykgY2IgPSBvcHRpb25zLCBvcHRpb25zID0ge31cbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge31cblxuICBpZiAob3B0aW9ucy5zeW5jKSB7XG4gICAgaWYgKGNiKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2FsbGJhY2sgcHJvdmlkZWQgdG8gc3luYyBnbG9iJylcbiAgICByZXR1cm4gZ2xvYlN5bmMocGF0dGVybiwgb3B0aW9ucylcbiAgfVxuXG4gIHJldHVybiBuZXcgR2xvYihwYXR0ZXJuLCBvcHRpb25zLCBjYilcbn1cblxuZ2xvYi5zeW5jID0gZ2xvYlN5bmNcbnZhciBHbG9iU3luYyA9IGdsb2IuR2xvYlN5bmMgPSBnbG9iU3luYy5HbG9iU3luY1xuXG4vLyBvbGQgYXBpIHN1cmZhY2Vcbmdsb2IuZ2xvYiA9IGdsb2JcblxuZnVuY3Rpb24gZXh0ZW5kIChvcmlnaW4sIGFkZCkge1xuICBpZiAoYWRkID09PSBudWxsIHx8IHR5cGVvZiBhZGQgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG9yaWdpblxuICB9XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpXG4gIHZhciBpID0ga2V5cy5sZW5ndGhcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXVxuICB9XG4gIHJldHVybiBvcmlnaW5cbn1cblxuZ2xvYi5oYXNNYWdpYyA9IGZ1bmN0aW9uIChwYXR0ZXJuLCBvcHRpb25zXykge1xuICB2YXIgb3B0aW9ucyA9IGV4dGVuZCh7fSwgb3B0aW9uc18pXG4gIG9wdGlvbnMubm9wcm9jZXNzID0gdHJ1ZVxuXG4gIHZhciBnID0gbmV3IEdsb2IocGF0dGVybiwgb3B0aW9ucylcbiAgdmFyIHNldCA9IGcubWluaW1hdGNoLnNldFxuICBpZiAoc2V0Lmxlbmd0aCA+IDEpXG4gICAgcmV0dXJuIHRydWVcblxuICBmb3IgKHZhciBqID0gMDsgaiA8IHNldFswXS5sZW5ndGg7IGorKykge1xuICAgIGlmICh0eXBlb2Ygc2V0WzBdW2pdICE9PSAnc3RyaW5nJylcbiAgICAgIHJldHVybiB0cnVlXG4gIH1cblxuICByZXR1cm4gZmFsc2Vcbn1cblxuZ2xvYi5HbG9iID0gR2xvYlxuaW5oZXJpdHMoR2xvYiwgRUUpXG5mdW5jdGlvbiBHbG9iIChwYXR0ZXJuLCBvcHRpb25zLCBjYikge1xuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IG9wdGlvbnNcbiAgICBvcHRpb25zID0gbnVsbFxuICB9XG5cbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5zeW5jKSB7XG4gICAgaWYgKGNiKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2FsbGJhY2sgcHJvdmlkZWQgdG8gc3luYyBnbG9iJylcbiAgICByZXR1cm4gbmV3IEdsb2JTeW5jKHBhdHRlcm4sIG9wdGlvbnMpXG4gIH1cblxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgR2xvYikpXG4gICAgcmV0dXJuIG5ldyBHbG9iKHBhdHRlcm4sIG9wdGlvbnMsIGNiKVxuXG4gIHNldG9wdHModGhpcywgcGF0dGVybiwgb3B0aW9ucylcbiAgdGhpcy5fZGlkUmVhbFBhdGggPSBmYWxzZVxuXG4gIC8vIHByb2Nlc3MgZWFjaCBwYXR0ZXJuIGluIHRoZSBtaW5pbWF0Y2ggc2V0XG4gIHZhciBuID0gdGhpcy5taW5pbWF0Y2guc2V0Lmxlbmd0aFxuXG4gIC8vIFRoZSBtYXRjaGVzIGFyZSBzdG9yZWQgYXMgezxmaWxlbmFtZT46IHRydWUsLi4ufSBzbyB0aGF0XG4gIC8vIGR1cGxpY2F0ZXMgYXJlIGF1dG9tYWdpY2FsbHkgcHJ1bmVkLlxuICAvLyBMYXRlciwgd2UgZG8gYW4gT2JqZWN0LmtleXMoKSBvbiB0aGVzZS5cbiAgLy8gS2VlcCB0aGVtIGFzIGEgbGlzdCBzbyB3ZSBjYW4gZmlsbCBpbiB3aGVuIG5vbnVsbCBpcyBzZXQuXG4gIHRoaXMubWF0Y2hlcyA9IG5ldyBBcnJheShuKVxuXG4gIGlmICh0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IG9uY2UoY2IpXG4gICAgdGhpcy5vbignZXJyb3InLCBjYilcbiAgICB0aGlzLm9uKCdlbmQnLCBmdW5jdGlvbiAobWF0Y2hlcykge1xuICAgICAgY2IobnVsbCwgbWF0Y2hlcylcbiAgICB9KVxuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHZhciBuID0gdGhpcy5taW5pbWF0Y2guc2V0Lmxlbmd0aFxuICB0aGlzLl9wcm9jZXNzaW5nID0gMFxuICB0aGlzLm1hdGNoZXMgPSBuZXcgQXJyYXkobilcblxuICB0aGlzLl9lbWl0UXVldWUgPSBbXVxuICB0aGlzLl9wcm9jZXNzUXVldWUgPSBbXVxuICB0aGlzLnBhdXNlZCA9IGZhbHNlXG5cbiAgaWYgKHRoaXMubm9wcm9jZXNzKVxuICAgIHJldHVybiB0aGlzXG5cbiAgaWYgKG4gPT09IDApXG4gICAgcmV0dXJuIGRvbmUoKVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSArKykge1xuICAgIHRoaXMuX3Byb2Nlc3ModGhpcy5taW5pbWF0Y2guc2V0W2ldLCBpLCBmYWxzZSwgZG9uZSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGRvbmUgKCkge1xuICAgIC0tc2VsZi5fcHJvY2Vzc2luZ1xuICAgIGlmIChzZWxmLl9wcm9jZXNzaW5nIDw9IDApXG4gICAgICBzZWxmLl9maW5pc2goKVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLl9maW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gIGFzc2VydCh0aGlzIGluc3RhbmNlb2YgR2xvYilcbiAgaWYgKHRoaXMuYWJvcnRlZClcbiAgICByZXR1cm5cblxuICBpZiAodGhpcy5yZWFscGF0aCAmJiAhdGhpcy5fZGlkUmVhbHBhdGgpXG4gICAgcmV0dXJuIHRoaXMuX3JlYWxwYXRoKClcblxuICBjb21tb24uZmluaXNoKHRoaXMpXG4gIHRoaXMuZW1pdCgnZW5kJywgdGhpcy5mb3VuZClcbn1cblxuR2xvYi5wcm90b3R5cGUuX3JlYWxwYXRoID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5fZGlkUmVhbHBhdGgpXG4gICAgcmV0dXJuXG5cbiAgdGhpcy5fZGlkUmVhbHBhdGggPSB0cnVlXG5cbiAgdmFyIG4gPSB0aGlzLm1hdGNoZXMubGVuZ3RoXG4gIGlmIChuID09PSAwKVxuICAgIHJldHVybiB0aGlzLl9maW5pc2goKVxuXG4gIHZhciBzZWxmID0gdGhpc1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubWF0Y2hlcy5sZW5ndGg7IGkrKylcbiAgICB0aGlzLl9yZWFscGF0aFNldChpLCBuZXh0KVxuXG4gIGZ1bmN0aW9uIG5leHQgKCkge1xuICAgIGlmICgtLW4gPT09IDApXG4gICAgICBzZWxmLl9maW5pc2goKVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLl9yZWFscGF0aFNldCA9IGZ1bmN0aW9uIChpbmRleCwgY2IpIHtcbiAgdmFyIG1hdGNoc2V0ID0gdGhpcy5tYXRjaGVzW2luZGV4XVxuICBpZiAoIW1hdGNoc2V0KVxuICAgIHJldHVybiBjYigpXG5cbiAgdmFyIGZvdW5kID0gT2JqZWN0LmtleXMobWF0Y2hzZXQpXG4gIHZhciBzZWxmID0gdGhpc1xuICB2YXIgbiA9IGZvdW5kLmxlbmd0aFxuXG4gIGlmIChuID09PSAwKVxuICAgIHJldHVybiBjYigpXG5cbiAgdmFyIHNldCA9IHRoaXMubWF0Y2hlc1tpbmRleF0gPSBPYmplY3QuY3JlYXRlKG51bGwpXG4gIGZvdW5kLmZvckVhY2goZnVuY3Rpb24gKHAsIGkpIHtcbiAgICAvLyBJZiB0aGVyZSdzIGEgcHJvYmxlbSB3aXRoIHRoZSBzdGF0LCB0aGVuIGl0IG1lYW5zIHRoYXRcbiAgICAvLyBvbmUgb3IgbW9yZSBvZiB0aGUgbGlua3MgaW4gdGhlIHJlYWxwYXRoIGNvdWxkbid0IGJlXG4gICAgLy8gcmVzb2x2ZWQuICBqdXN0IHJldHVybiB0aGUgYWJzIHZhbHVlIGluIHRoYXQgY2FzZS5cbiAgICBwID0gc2VsZi5fbWFrZUFicyhwKVxuICAgIGZzLnJlYWxwYXRoKHAsIHNlbGYucmVhbHBhdGhDYWNoZSwgZnVuY3Rpb24gKGVyLCByZWFsKSB7XG4gICAgICBpZiAoIWVyKVxuICAgICAgICBzZXRbcmVhbF0gPSB0cnVlXG4gICAgICBlbHNlIGlmIChlci5zeXNjYWxsID09PSAnc3RhdCcpXG4gICAgICAgIHNldFtwXSA9IHRydWVcbiAgICAgIGVsc2VcbiAgICAgICAgc2VsZi5lbWl0KCdlcnJvcicsIGVyKSAvLyBzcnNseSB3dGYgcmlnaHQgaGVyZVxuXG4gICAgICBpZiAoLS1uID09PSAwKSB7XG4gICAgICAgIHNlbGYubWF0Y2hlc1tpbmRleF0gPSBzZXRcbiAgICAgICAgY2IoKVxuICAgICAgfVxuICAgIH0pXG4gIH0pXG59XG5cbkdsb2IucHJvdG90eXBlLl9tYXJrID0gZnVuY3Rpb24gKHApIHtcbiAgcmV0dXJuIGNvbW1vbi5tYXJrKHRoaXMsIHApXG59XG5cbkdsb2IucHJvdG90eXBlLl9tYWtlQWJzID0gZnVuY3Rpb24gKGYpIHtcbiAgcmV0dXJuIGNvbW1vbi5tYWtlQWJzKHRoaXMsIGYpXG59XG5cbkdsb2IucHJvdG90eXBlLmFib3J0ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFib3J0ZWQgPSB0cnVlXG4gIHRoaXMuZW1pdCgnYWJvcnQnKVxufVxuXG5HbG9iLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCF0aGlzLnBhdXNlZCkge1xuICAgIHRoaXMucGF1c2VkID0gdHJ1ZVxuICAgIHRoaXMuZW1pdCgncGF1c2UnKVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgdGhpcy5lbWl0KCdyZXN1bWUnKVxuICAgIHRoaXMucGF1c2VkID0gZmFsc2VcbiAgICBpZiAodGhpcy5fZW1pdFF1ZXVlLmxlbmd0aCkge1xuICAgICAgdmFyIGVxID0gdGhpcy5fZW1pdFF1ZXVlLnNsaWNlKDApXG4gICAgICB0aGlzLl9lbWl0UXVldWUubGVuZ3RoID0gMFxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlcS5sZW5ndGg7IGkgKyspIHtcbiAgICAgICAgdmFyIGUgPSBlcVtpXVxuICAgICAgICB0aGlzLl9lbWl0TWF0Y2goZVswXSwgZVsxXSlcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMuX3Byb2Nlc3NRdWV1ZS5sZW5ndGgpIHtcbiAgICAgIHZhciBwcSA9IHRoaXMuX3Byb2Nlc3NRdWV1ZS5zbGljZSgwKVxuICAgICAgdGhpcy5fcHJvY2Vzc1F1ZXVlLmxlbmd0aCA9IDBcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHEubGVuZ3RoOyBpICsrKSB7XG4gICAgICAgIHZhciBwID0gcHFbaV1cbiAgICAgICAgdGhpcy5fcHJvY2Vzc2luZy0tXG4gICAgICAgIHRoaXMuX3Byb2Nlc3MocFswXSwgcFsxXSwgcFsyXSwgcFszXSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuR2xvYi5wcm90b3R5cGUuX3Byb2Nlc3MgPSBmdW5jdGlvbiAocGF0dGVybiwgaW5kZXgsIGluR2xvYlN0YXIsIGNiKSB7XG4gIGFzc2VydCh0aGlzIGluc3RhbmNlb2YgR2xvYilcbiAgYXNzZXJ0KHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJylcblxuICBpZiAodGhpcy5hYm9ydGVkKVxuICAgIHJldHVyblxuXG4gIHRoaXMuX3Byb2Nlc3NpbmcrK1xuICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICB0aGlzLl9wcm9jZXNzUXVldWUucHVzaChbcGF0dGVybiwgaW5kZXgsIGluR2xvYlN0YXIsIGNiXSlcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vY29uc29sZS5lcnJvcignUFJPQ0VTUyAlZCcsIHRoaXMuX3Byb2Nlc3NpbmcsIHBhdHRlcm4pXG5cbiAgLy8gR2V0IHRoZSBmaXJzdCBbbl0gcGFydHMgb2YgcGF0dGVybiB0aGF0IGFyZSBhbGwgc3RyaW5ncy5cbiAgdmFyIG4gPSAwXG4gIHdoaWxlICh0eXBlb2YgcGF0dGVybltuXSA9PT0gJ3N0cmluZycpIHtcbiAgICBuICsrXG4gIH1cbiAgLy8gbm93IG4gaXMgdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBvbmUgdGhhdCBpcyAqbm90KiBhIHN0cmluZy5cblxuICAvLyBzZWUgaWYgdGhlcmUncyBhbnl0aGluZyBlbHNlXG4gIHZhciBwcmVmaXhcbiAgc3dpdGNoIChuKSB7XG4gICAgLy8gaWYgbm90LCB0aGVuIHRoaXMgaXMgcmF0aGVyIHNpbXBsZVxuICAgIGNhc2UgcGF0dGVybi5sZW5ndGg6XG4gICAgICB0aGlzLl9wcm9jZXNzU2ltcGxlKHBhdHRlcm4uam9pbignLycpLCBpbmRleCwgY2IpXG4gICAgICByZXR1cm5cblxuICAgIGNhc2UgMDpcbiAgICAgIC8vIHBhdHRlcm4gKnN0YXJ0cyogd2l0aCBzb21lIG5vbi10cml2aWFsIGl0ZW0uXG4gICAgICAvLyBnb2luZyB0byByZWFkZGlyKGN3ZCksIGJ1dCBub3QgaW5jbHVkZSB0aGUgcHJlZml4IGluIG1hdGNoZXMuXG4gICAgICBwcmVmaXggPSBudWxsXG4gICAgICBicmVha1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIC8vIHBhdHRlcm4gaGFzIHNvbWUgc3RyaW5nIGJpdHMgaW4gdGhlIGZyb250LlxuICAgICAgLy8gd2hhdGV2ZXIgaXQgc3RhcnRzIHdpdGgsIHdoZXRoZXIgdGhhdCdzICdhYnNvbHV0ZScgbGlrZSAvZm9vL2JhcixcbiAgICAgIC8vIG9yICdyZWxhdGl2ZScgbGlrZSAnLi4vYmF6J1xuICAgICAgcHJlZml4ID0gcGF0dGVybi5zbGljZSgwLCBuKS5qb2luKCcvJylcbiAgICAgIGJyZWFrXG4gIH1cblxuICB2YXIgcmVtYWluID0gcGF0dGVybi5zbGljZShuKVxuXG4gIC8vIGdldCB0aGUgbGlzdCBvZiBlbnRyaWVzLlxuICB2YXIgcmVhZFxuICBpZiAocHJlZml4ID09PSBudWxsKVxuICAgIHJlYWQgPSAnLidcbiAgZWxzZSBpZiAoaXNBYnNvbHV0ZShwcmVmaXgpIHx8IGlzQWJzb2x1dGUocGF0dGVybi5qb2luKCcvJykpKSB7XG4gICAgaWYgKCFwcmVmaXggfHwgIWlzQWJzb2x1dGUocHJlZml4KSlcbiAgICAgIHByZWZpeCA9ICcvJyArIHByZWZpeFxuICAgIHJlYWQgPSBwcmVmaXhcbiAgfSBlbHNlXG4gICAgcmVhZCA9IHByZWZpeFxuXG4gIHZhciBhYnMgPSB0aGlzLl9tYWtlQWJzKHJlYWQpXG5cbiAgLy9pZiBpZ25vcmVkLCBza2lwIF9wcm9jZXNzaW5nXG4gIGlmIChjaGlsZHJlbklnbm9yZWQodGhpcywgcmVhZCkpXG4gICAgcmV0dXJuIGNiKClcblxuICB2YXIgaXNHbG9iU3RhciA9IHJlbWFpblswXSA9PT0gbWluaW1hdGNoLkdMT0JTVEFSXG4gIGlmIChpc0dsb2JTdGFyKVxuICAgIHRoaXMuX3Byb2Nlc3NHbG9iU3RhcihwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgY2IpXG4gIGVsc2VcbiAgICB0aGlzLl9wcm9jZXNzUmVhZGRpcihwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgY2IpXG59XG5cbkdsb2IucHJvdG90eXBlLl9wcm9jZXNzUmVhZGRpciA9IGZ1bmN0aW9uIChwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHRoaXMuX3JlYWRkaXIoYWJzLCBpbkdsb2JTdGFyLCBmdW5jdGlvbiAoZXIsIGVudHJpZXMpIHtcbiAgICByZXR1cm4gc2VsZi5fcHJvY2Vzc1JlYWRkaXIyKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyLCBlbnRyaWVzLCBjYilcbiAgfSlcbn1cblxuR2xvYi5wcm90b3R5cGUuX3Byb2Nlc3NSZWFkZGlyMiA9IGZ1bmN0aW9uIChwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgZW50cmllcywgY2IpIHtcblxuICAvLyBpZiB0aGUgYWJzIGlzbid0IGEgZGlyLCB0aGVuIG5vdGhpbmcgY2FuIG1hdGNoIVxuICBpZiAoIWVudHJpZXMpXG4gICAgcmV0dXJuIGNiKClcblxuICAvLyBJdCB3aWxsIG9ubHkgbWF0Y2ggZG90IGVudHJpZXMgaWYgaXQgc3RhcnRzIHdpdGggYSBkb3QsIG9yIGlmXG4gIC8vIGRvdCBpcyBzZXQuICBTdHVmZiBsaWtlIEAoLmZvb3wuYmFyKSBpc24ndCBhbGxvd2VkLlxuICB2YXIgcG4gPSByZW1haW5bMF1cbiAgdmFyIG5lZ2F0ZSA9ICEhdGhpcy5taW5pbWF0Y2gubmVnYXRlXG4gIHZhciByYXdHbG9iID0gcG4uX2dsb2JcbiAgdmFyIGRvdE9rID0gdGhpcy5kb3QgfHwgcmF3R2xvYi5jaGFyQXQoMCkgPT09ICcuJ1xuXG4gIHZhciBtYXRjaGVkRW50cmllcyA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZW50cmllcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBlID0gZW50cmllc1tpXVxuICAgIGlmIChlLmNoYXJBdCgwKSAhPT0gJy4nIHx8IGRvdE9rKSB7XG4gICAgICB2YXIgbVxuICAgICAgaWYgKG5lZ2F0ZSAmJiAhcHJlZml4KSB7XG4gICAgICAgIG0gPSAhZS5tYXRjaChwbilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG0gPSBlLm1hdGNoKHBuKVxuICAgICAgfVxuICAgICAgaWYgKG0pXG4gICAgICAgIG1hdGNoZWRFbnRyaWVzLnB1c2goZSlcbiAgICB9XG4gIH1cblxuICAvL2NvbnNvbGUuZXJyb3IoJ3ByZDInLCBwcmVmaXgsIGVudHJpZXMsIHJlbWFpblswXS5fZ2xvYiwgbWF0Y2hlZEVudHJpZXMpXG5cbiAgdmFyIGxlbiA9IG1hdGNoZWRFbnRyaWVzLmxlbmd0aFxuICAvLyBJZiB0aGVyZSBhcmUgbm8gbWF0Y2hlZCBlbnRyaWVzLCB0aGVuIG5vdGhpbmcgbWF0Y2hlcy5cbiAgaWYgKGxlbiA9PT0gMClcbiAgICByZXR1cm4gY2IoKVxuXG4gIC8vIGlmIHRoaXMgaXMgdGhlIGxhc3QgcmVtYWluaW5nIHBhdHRlcm4gYml0LCB0aGVuIG5vIG5lZWQgZm9yXG4gIC8vIGFuIGFkZGl0aW9uYWwgc3RhdCAqdW5sZXNzKiB0aGUgdXNlciBoYXMgc3BlY2lmaWVkIG1hcmsgb3JcbiAgLy8gc3RhdCBleHBsaWNpdGx5LiAgV2Uga25vdyB0aGV5IGV4aXN0LCBzaW5jZSByZWFkZGlyIHJldHVybmVkXG4gIC8vIHRoZW0uXG5cbiAgaWYgKHJlbWFpbi5sZW5ndGggPT09IDEgJiYgIXRoaXMubWFyayAmJiAhdGhpcy5zdGF0KSB7XG4gICAgaWYgKCF0aGlzLm1hdGNoZXNbaW5kZXhdKVxuICAgICAgdGhpcy5tYXRjaGVzW2luZGV4XSA9IE9iamVjdC5jcmVhdGUobnVsbClcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICsrKSB7XG4gICAgICB2YXIgZSA9IG1hdGNoZWRFbnRyaWVzW2ldXG4gICAgICBpZiAocHJlZml4KSB7XG4gICAgICAgIGlmIChwcmVmaXggIT09ICcvJylcbiAgICAgICAgICBlID0gcHJlZml4ICsgJy8nICsgZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgZSA9IHByZWZpeCArIGVcbiAgICAgIH1cblxuICAgICAgaWYgKGUuY2hhckF0KDApID09PSAnLycgJiYgIXRoaXMubm9tb3VudCkge1xuICAgICAgICBlID0gcGF0aC5qb2luKHRoaXMucm9vdCwgZSlcbiAgICAgIH1cbiAgICAgIHRoaXMuX2VtaXRNYXRjaChpbmRleCwgZSlcbiAgICB9XG4gICAgLy8gVGhpcyB3YXMgdGhlIGxhc3Qgb25lLCBhbmQgbm8gc3RhdHMgd2VyZSBuZWVkZWRcbiAgICByZXR1cm4gY2IoKVxuICB9XG5cbiAgLy8gbm93IHRlc3QgYWxsIG1hdGNoZWQgZW50cmllcyBhcyBzdGFuZC1pbnMgZm9yIHRoYXQgcGFydFxuICAvLyBvZiB0aGUgcGF0dGVybi5cbiAgcmVtYWluLnNoaWZ0KClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKyspIHtcbiAgICB2YXIgZSA9IG1hdGNoZWRFbnRyaWVzW2ldXG4gICAgdmFyIG5ld1BhdHRlcm5cbiAgICBpZiAocHJlZml4KSB7XG4gICAgICBpZiAocHJlZml4ICE9PSAnLycpXG4gICAgICAgIGUgPSBwcmVmaXggKyAnLycgKyBlXG4gICAgICBlbHNlXG4gICAgICAgIGUgPSBwcmVmaXggKyBlXG4gICAgfVxuICAgIHRoaXMuX3Byb2Nlc3MoW2VdLmNvbmNhdChyZW1haW4pLCBpbmRleCwgaW5HbG9iU3RhciwgY2IpXG4gIH1cbiAgY2IoKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fZW1pdE1hdGNoID0gZnVuY3Rpb24gKGluZGV4LCBlKSB7XG4gIGlmICh0aGlzLmFib3J0ZWQpXG4gICAgcmV0dXJuXG5cbiAgaWYgKHRoaXMubWF0Y2hlc1tpbmRleF1bZV0pXG4gICAgcmV0dXJuXG5cbiAgaWYgKGlzSWdub3JlZCh0aGlzLCBlKSlcbiAgICByZXR1cm5cblxuICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICB0aGlzLl9lbWl0UXVldWUucHVzaChbaW5kZXgsIGVdKVxuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGFicyA9IHRoaXMuX21ha2VBYnMoZSlcblxuICBpZiAodGhpcy5ub2Rpcikge1xuICAgIHZhciBjID0gdGhpcy5jYWNoZVthYnNdXG4gICAgaWYgKGMgPT09ICdESVInIHx8IEFycmF5LmlzQXJyYXkoYykpXG4gICAgICByZXR1cm5cbiAgfVxuXG4gIGlmICh0aGlzLm1hcmspXG4gICAgZSA9IHRoaXMuX21hcmsoZSlcblxuICB0aGlzLm1hdGNoZXNbaW5kZXhdW2VdID0gdHJ1ZVxuXG4gIHZhciBzdCA9IHRoaXMuc3RhdENhY2hlW2Fic11cbiAgaWYgKHN0KVxuICAgIHRoaXMuZW1pdCgnc3RhdCcsIGUsIHN0KVxuXG4gIHRoaXMuZW1pdCgnbWF0Y2gnLCBlKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcmVhZGRpckluR2xvYlN0YXIgPSBmdW5jdGlvbiAoYWJzLCBjYikge1xuICBpZiAodGhpcy5hYm9ydGVkKVxuICAgIHJldHVyblxuXG4gIC8vIGZvbGxvdyBhbGwgc3ltbGlua2VkIGRpcmVjdG9yaWVzIGZvcmV2ZXJcbiAgLy8ganVzdCBwcm9jZWVkIGFzIGlmIHRoaXMgaXMgYSBub24tZ2xvYnN0YXIgc2l0dWF0aW9uXG4gIGlmICh0aGlzLmZvbGxvdylcbiAgICByZXR1cm4gdGhpcy5fcmVhZGRpcihhYnMsIGZhbHNlLCBjYilcblxuICB2YXIgbHN0YXRrZXkgPSAnbHN0YXRcXDAnICsgYWJzXG4gIHZhciBzZWxmID0gdGhpc1xuICB2YXIgbHN0YXRjYiA9IGluZmxpZ2h0KGxzdGF0a2V5LCBsc3RhdGNiXylcblxuICBpZiAobHN0YXRjYilcbiAgICBmcy5sc3RhdChhYnMsIGxzdGF0Y2IpXG5cbiAgZnVuY3Rpb24gbHN0YXRjYl8gKGVyLCBsc3RhdCkge1xuICAgIGlmIChlcilcbiAgICAgIHJldHVybiBjYigpXG5cbiAgICB2YXIgaXNTeW0gPSBsc3RhdC5pc1N5bWJvbGljTGluaygpXG4gICAgc2VsZi5zeW1saW5rc1thYnNdID0gaXNTeW1cblxuICAgIC8vIElmIGl0J3Mgbm90IGEgc3ltbGluayBvciBhIGRpciwgdGhlbiBpdCdzIGRlZmluaXRlbHkgYSByZWd1bGFyIGZpbGUuXG4gICAgLy8gZG9uJ3QgYm90aGVyIGRvaW5nIGEgcmVhZGRpciBpbiB0aGF0IGNhc2UuXG4gICAgaWYgKCFpc1N5bSAmJiAhbHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgc2VsZi5jYWNoZVthYnNdID0gJ0ZJTEUnXG4gICAgICBjYigpXG4gICAgfSBlbHNlXG4gICAgICBzZWxmLl9yZWFkZGlyKGFicywgZmFsc2UsIGNiKVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLl9yZWFkZGlyID0gZnVuY3Rpb24gKGFicywgaW5HbG9iU3RhciwgY2IpIHtcbiAgaWYgKHRoaXMuYWJvcnRlZClcbiAgICByZXR1cm5cblxuICBjYiA9IGluZmxpZ2h0KCdyZWFkZGlyXFwwJythYnMrJ1xcMCcraW5HbG9iU3RhciwgY2IpXG4gIGlmICghY2IpXG4gICAgcmV0dXJuXG5cbiAgLy9jb25zb2xlLmVycm9yKCdSRCAlaiAlaicsICtpbkdsb2JTdGFyLCBhYnMpXG4gIGlmIChpbkdsb2JTdGFyICYmICFvd25Qcm9wKHRoaXMuc3ltbGlua3MsIGFicykpXG4gICAgcmV0dXJuIHRoaXMuX3JlYWRkaXJJbkdsb2JTdGFyKGFicywgY2IpXG5cbiAgaWYgKG93blByb3AodGhpcy5jYWNoZSwgYWJzKSkge1xuICAgIHZhciBjID0gdGhpcy5jYWNoZVthYnNdXG4gICAgaWYgKCFjIHx8IGMgPT09ICdGSUxFJylcbiAgICAgIHJldHVybiBjYigpXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShjKSlcbiAgICAgIHJldHVybiBjYihudWxsLCBjKVxuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gIGZzLnJlYWRkaXIoYWJzLCByZWFkZGlyQ2IodGhpcywgYWJzLCBjYikpXG59XG5cbmZ1bmN0aW9uIHJlYWRkaXJDYiAoc2VsZiwgYWJzLCBjYikge1xuICByZXR1cm4gZnVuY3Rpb24gKGVyLCBlbnRyaWVzKSB7XG4gICAgaWYgKGVyKVxuICAgICAgc2VsZi5fcmVhZGRpckVycm9yKGFicywgZXIsIGNiKVxuICAgIGVsc2VcbiAgICAgIHNlbGYuX3JlYWRkaXJFbnRyaWVzKGFicywgZW50cmllcywgY2IpXG4gIH1cbn1cblxuR2xvYi5wcm90b3R5cGUuX3JlYWRkaXJFbnRyaWVzID0gZnVuY3Rpb24gKGFicywgZW50cmllcywgY2IpIHtcbiAgaWYgKHRoaXMuYWJvcnRlZClcbiAgICByZXR1cm5cblxuICAvLyBpZiB3ZSBoYXZlbid0IGFza2VkIHRvIHN0YXQgZXZlcnl0aGluZywgdGhlbiBqdXN0XG4gIC8vIGFzc3VtZSB0aGF0IGV2ZXJ5dGhpbmcgaW4gdGhlcmUgZXhpc3RzLCBzbyB3ZSBjYW4gYXZvaWRcbiAgLy8gaGF2aW5nIHRvIHN0YXQgaXQgYSBzZWNvbmQgdGltZS5cbiAgaWYgKCF0aGlzLm1hcmsgJiYgIXRoaXMuc3RhdCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW50cmllcy5sZW5ndGg7IGkgKyspIHtcbiAgICAgIHZhciBlID0gZW50cmllc1tpXVxuICAgICAgaWYgKGFicyA9PT0gJy8nKVxuICAgICAgICBlID0gYWJzICsgZVxuICAgICAgZWxzZVxuICAgICAgICBlID0gYWJzICsgJy8nICsgZVxuICAgICAgdGhpcy5jYWNoZVtlXSA9IHRydWVcbiAgICB9XG4gIH1cblxuICB0aGlzLmNhY2hlW2Fic10gPSBlbnRyaWVzXG4gIHJldHVybiBjYihudWxsLCBlbnRyaWVzKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcmVhZGRpckVycm9yID0gZnVuY3Rpb24gKGYsIGVyLCBjYikge1xuICBpZiAodGhpcy5hYm9ydGVkKVxuICAgIHJldHVyblxuXG4gIC8vIGhhbmRsZSBlcnJvcnMsIGFuZCBjYWNoZSB0aGUgaW5mb3JtYXRpb25cbiAgc3dpdGNoIChlci5jb2RlKSB7XG4gICAgY2FzZSAnRU5PVFNVUCc6IC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9pc2FhY3Mvbm9kZS1nbG9iL2lzc3Vlcy8yMDVcbiAgICBjYXNlICdFTk9URElSJzogLy8gdG90YWxseSBub3JtYWwuIG1lYW5zIGl0ICpkb2VzKiBleGlzdC5cbiAgICAgIHRoaXMuY2FjaGVbdGhpcy5fbWFrZUFicyhmKV0gPSAnRklMRSdcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlICdFTk9FTlQnOiAvLyBub3QgdGVycmlibHkgdW51c3VhbFxuICAgIGNhc2UgJ0VMT09QJzpcbiAgICBjYXNlICdFTkFNRVRPT0xPTkcnOlxuICAgIGNhc2UgJ1VOS05PV04nOlxuICAgICAgdGhpcy5jYWNoZVt0aGlzLl9tYWtlQWJzKGYpXSA9IGZhbHNlXG4gICAgICBicmVha1xuXG4gICAgZGVmYXVsdDogLy8gc29tZSB1bnVzdWFsIGVycm9yLiAgVHJlYXQgYXMgZmFpbHVyZS5cbiAgICAgIHRoaXMuY2FjaGVbdGhpcy5fbWFrZUFicyhmKV0gPSBmYWxzZVxuICAgICAgaWYgKHRoaXMuc3RyaWN0KSB7XG4gICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcilcbiAgICAgICAgLy8gSWYgdGhlIGVycm9yIGlzIGhhbmRsZWQsIHRoZW4gd2UgYWJvcnRcbiAgICAgICAgLy8gaWYgbm90LCB3ZSB0aHJldyBvdXQgb2YgaGVyZVxuICAgICAgICB0aGlzLmFib3J0KClcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5zaWxlbnQpXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2dsb2IgZXJyb3InLCBlcilcbiAgICAgIGJyZWFrXG4gIH1cblxuICByZXR1cm4gY2IoKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcHJvY2Vzc0dsb2JTdGFyID0gZnVuY3Rpb24gKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyLCBjYikge1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgdGhpcy5fcmVhZGRpcihhYnMsIGluR2xvYlN0YXIsIGZ1bmN0aW9uIChlciwgZW50cmllcykge1xuICAgIHNlbGYuX3Byb2Nlc3NHbG9iU3RhcjIocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIsIGVudHJpZXMsIGNiKVxuICB9KVxufVxuXG5cbkdsb2IucHJvdG90eXBlLl9wcm9jZXNzR2xvYlN0YXIyID0gZnVuY3Rpb24gKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyLCBlbnRyaWVzLCBjYikge1xuICAvL2NvbnNvbGUuZXJyb3IoJ3BnczInLCBwcmVmaXgsIHJlbWFpblswXSwgZW50cmllcylcblxuICAvLyBubyBlbnRyaWVzIG1lYW5zIG5vdCBhIGRpciwgc28gaXQgY2FuIG5ldmVyIGhhdmUgbWF0Y2hlc1xuICAvLyBmb28udHh0LyoqIGRvZXNuJ3QgbWF0Y2ggZm9vLnR4dFxuICBpZiAoIWVudHJpZXMpXG4gICAgcmV0dXJuIGNiKClcblxuICAvLyB0ZXN0IHdpdGhvdXQgdGhlIGdsb2JzdGFyLCBhbmQgd2l0aCBldmVyeSBjaGlsZCBib3RoIGJlbG93XG4gIC8vIGFuZCByZXBsYWNpbmcgdGhlIGdsb2JzdGFyLlxuICB2YXIgcmVtYWluV2l0aG91dEdsb2JTdGFyID0gcmVtYWluLnNsaWNlKDEpXG4gIHZhciBnc3ByZWYgPSBwcmVmaXggPyBbIHByZWZpeCBdIDogW11cbiAgdmFyIG5vR2xvYlN0YXIgPSBnc3ByZWYuY29uY2F0KHJlbWFpbldpdGhvdXRHbG9iU3RhcilcblxuICAvLyB0aGUgbm9HbG9iU3RhciBwYXR0ZXJuIGV4aXRzIHRoZSBpbkdsb2JTdGFyIHN0YXRlXG4gIHRoaXMuX3Byb2Nlc3Mobm9HbG9iU3RhciwgaW5kZXgsIGZhbHNlLCBjYilcblxuICB2YXIgaXNTeW0gPSB0aGlzLnN5bWxpbmtzW2Fic11cbiAgdmFyIGxlbiA9IGVudHJpZXMubGVuZ3RoXG5cbiAgLy8gSWYgaXQncyBhIHN5bWxpbmssIGFuZCB3ZSdyZSBpbiBhIGdsb2JzdGFyLCB0aGVuIHN0b3BcbiAgaWYgKGlzU3ltICYmIGluR2xvYlN0YXIpXG4gICAgcmV0dXJuIGNiKClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgdmFyIGUgPSBlbnRyaWVzW2ldXG4gICAgaWYgKGUuY2hhckF0KDApID09PSAnLicgJiYgIXRoaXMuZG90KVxuICAgICAgY29udGludWVcblxuICAgIC8vIHRoZXNlIHR3byBjYXNlcyBlbnRlciB0aGUgaW5HbG9iU3RhciBzdGF0ZVxuICAgIHZhciBpbnN0ZWFkID0gZ3NwcmVmLmNvbmNhdChlbnRyaWVzW2ldLCByZW1haW5XaXRob3V0R2xvYlN0YXIpXG4gICAgdGhpcy5fcHJvY2VzcyhpbnN0ZWFkLCBpbmRleCwgdHJ1ZSwgY2IpXG5cbiAgICB2YXIgYmVsb3cgPSBnc3ByZWYuY29uY2F0KGVudHJpZXNbaV0sIHJlbWFpbilcbiAgICB0aGlzLl9wcm9jZXNzKGJlbG93LCBpbmRleCwgdHJ1ZSwgY2IpXG4gIH1cblxuICBjYigpXG59XG5cbkdsb2IucHJvdG90eXBlLl9wcm9jZXNzU2ltcGxlID0gZnVuY3Rpb24gKHByZWZpeCwgaW5kZXgsIGNiKSB7XG4gIC8vIFhYWCByZXZpZXcgdGhpcy4gIFNob3VsZG4ndCBpdCBiZSBkb2luZyB0aGUgbW91bnRpbmcgZXRjXG4gIC8vIGJlZm9yZSBkb2luZyBzdGF0PyAga2luZGEgd2VpcmQ/XG4gIHZhciBzZWxmID0gdGhpc1xuICB0aGlzLl9zdGF0KHByZWZpeCwgZnVuY3Rpb24gKGVyLCBleGlzdHMpIHtcbiAgICBzZWxmLl9wcm9jZXNzU2ltcGxlMihwcmVmaXgsIGluZGV4LCBlciwgZXhpc3RzLCBjYilcbiAgfSlcbn1cbkdsb2IucHJvdG90eXBlLl9wcm9jZXNzU2ltcGxlMiA9IGZ1bmN0aW9uIChwcmVmaXgsIGluZGV4LCBlciwgZXhpc3RzLCBjYikge1xuXG4gIC8vY29uc29sZS5lcnJvcigncHMyJywgcHJlZml4LCBleGlzdHMpXG5cbiAgaWYgKCF0aGlzLm1hdGNoZXNbaW5kZXhdKVxuICAgIHRoaXMubWF0Y2hlc1tpbmRleF0gPSBPYmplY3QuY3JlYXRlKG51bGwpXG5cbiAgLy8gSWYgaXQgZG9lc24ndCBleGlzdCwgdGhlbiBqdXN0IG1hcmsgdGhlIGxhY2sgb2YgcmVzdWx0c1xuICBpZiAoIWV4aXN0cylcbiAgICByZXR1cm4gY2IoKVxuXG4gIGlmIChwcmVmaXggJiYgaXNBYnNvbHV0ZShwcmVmaXgpICYmICF0aGlzLm5vbW91bnQpIHtcbiAgICB2YXIgdHJhaWwgPSAvW1xcL1xcXFxdJC8udGVzdChwcmVmaXgpXG4gICAgaWYgKHByZWZpeC5jaGFyQXQoMCkgPT09ICcvJykge1xuICAgICAgcHJlZml4ID0gcGF0aC5qb2luKHRoaXMucm9vdCwgcHJlZml4KVxuICAgIH0gZWxzZSB7XG4gICAgICBwcmVmaXggPSBwYXRoLnJlc29sdmUodGhpcy5yb290LCBwcmVmaXgpXG4gICAgICBpZiAodHJhaWwpXG4gICAgICAgIHByZWZpeCArPSAnLydcbiAgICB9XG4gIH1cblxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJylcbiAgICBwcmVmaXggPSBwcmVmaXgucmVwbGFjZSgvXFxcXC9nLCAnLycpXG5cbiAgLy8gTWFyayB0aGlzIGFzIGEgbWF0Y2hcbiAgdGhpcy5fZW1pdE1hdGNoKGluZGV4LCBwcmVmaXgpXG4gIGNiKClcbn1cblxuLy8gUmV0dXJucyBlaXRoZXIgJ0RJUicsICdGSUxFJywgb3IgZmFsc2Vcbkdsb2IucHJvdG90eXBlLl9zdGF0ID0gZnVuY3Rpb24gKGYsIGNiKSB7XG4gIHZhciBhYnMgPSB0aGlzLl9tYWtlQWJzKGYpXG4gIHZhciBuZWVkRGlyID0gZi5zbGljZSgtMSkgPT09ICcvJ1xuXG4gIGlmIChmLmxlbmd0aCA+IHRoaXMubWF4TGVuZ3RoKVxuICAgIHJldHVybiBjYigpXG5cbiAgaWYgKCF0aGlzLnN0YXQgJiYgb3duUHJvcCh0aGlzLmNhY2hlLCBhYnMpKSB7XG4gICAgdmFyIGMgPSB0aGlzLmNhY2hlW2Fic11cblxuICAgIGlmIChBcnJheS5pc0FycmF5KGMpKVxuICAgICAgYyA9ICdESVInXG5cbiAgICAvLyBJdCBleGlzdHMsIGJ1dCBtYXliZSBub3QgaG93IHdlIG5lZWQgaXRcbiAgICBpZiAoIW5lZWREaXIgfHwgYyA9PT0gJ0RJUicpXG4gICAgICByZXR1cm4gY2IobnVsbCwgYylcblxuICAgIGlmIChuZWVkRGlyICYmIGMgPT09ICdGSUxFJylcbiAgICAgIHJldHVybiBjYigpXG5cbiAgICAvLyBvdGhlcndpc2Ugd2UgaGF2ZSB0byBzdGF0LCBiZWNhdXNlIG1heWJlIGM9dHJ1ZVxuICAgIC8vIGlmIHdlIGtub3cgaXQgZXhpc3RzLCBidXQgbm90IHdoYXQgaXQgaXMuXG4gIH1cblxuICB2YXIgZXhpc3RzXG4gIHZhciBzdGF0ID0gdGhpcy5zdGF0Q2FjaGVbYWJzXVxuICBpZiAoc3RhdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHN0YXQgPT09IGZhbHNlKVxuICAgICAgcmV0dXJuIGNiKG51bGwsIHN0YXQpXG4gICAgZWxzZSB7XG4gICAgICB2YXIgdHlwZSA9IHN0YXQuaXNEaXJlY3RvcnkoKSA/ICdESVInIDogJ0ZJTEUnXG4gICAgICBpZiAobmVlZERpciAmJiB0eXBlID09PSAnRklMRScpXG4gICAgICAgIHJldHVybiBjYigpXG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiBjYihudWxsLCB0eXBlLCBzdGF0KVxuICAgIH1cbiAgfVxuXG4gIHZhciBzZWxmID0gdGhpc1xuICB2YXIgc3RhdGNiID0gaW5mbGlnaHQoJ3N0YXRcXDAnICsgYWJzLCBsc3RhdGNiXylcbiAgaWYgKHN0YXRjYilcbiAgICBmcy5sc3RhdChhYnMsIHN0YXRjYilcblxuICBmdW5jdGlvbiBsc3RhdGNiXyAoZXIsIGxzdGF0KSB7XG4gICAgaWYgKGxzdGF0ICYmIGxzdGF0LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgIC8vIElmIGl0J3MgYSBzeW1saW5rLCB0aGVuIHRyZWF0IGl0IGFzIHRoZSB0YXJnZXQsIHVubGVzc1xuICAgICAgLy8gdGhlIHRhcmdldCBkb2VzIG5vdCBleGlzdCwgdGhlbiB0cmVhdCBpdCBhcyBhIGZpbGUuXG4gICAgICByZXR1cm4gZnMuc3RhdChhYnMsIGZ1bmN0aW9uIChlciwgc3RhdCkge1xuICAgICAgICBpZiAoZXIpXG4gICAgICAgICAgc2VsZi5fc3RhdDIoZiwgYWJzLCBudWxsLCBsc3RhdCwgY2IpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzZWxmLl9zdGF0MihmLCBhYnMsIGVyLCBzdGF0LCBjYilcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuX3N0YXQyKGYsIGFicywgZXIsIGxzdGF0LCBjYilcbiAgICB9XG4gIH1cbn1cblxuR2xvYi5wcm90b3R5cGUuX3N0YXQyID0gZnVuY3Rpb24gKGYsIGFicywgZXIsIHN0YXQsIGNiKSB7XG4gIGlmIChlcikge1xuICAgIHRoaXMuc3RhdENhY2hlW2Fic10gPSBmYWxzZVxuICAgIHJldHVybiBjYigpXG4gIH1cblxuICB2YXIgbmVlZERpciA9IGYuc2xpY2UoLTEpID09PSAnLydcbiAgdGhpcy5zdGF0Q2FjaGVbYWJzXSA9IHN0YXRcblxuICBpZiAoYWJzLnNsaWNlKC0xKSA9PT0gJy8nICYmICFzdGF0LmlzRGlyZWN0b3J5KCkpXG4gICAgcmV0dXJuIGNiKG51bGwsIGZhbHNlLCBzdGF0KVxuXG4gIHZhciBjID0gc3RhdC5pc0RpcmVjdG9yeSgpID8gJ0RJUicgOiAnRklMRSdcbiAgdGhpcy5jYWNoZVthYnNdID0gdGhpcy5jYWNoZVthYnNdIHx8IGNcblxuICBpZiAobmVlZERpciAmJiBjICE9PSAnRElSJylcbiAgICByZXR1cm4gY2IoKVxuXG4gIHJldHVybiBjYihudWxsLCBjLCBzdGF0KVxufVxuIl19