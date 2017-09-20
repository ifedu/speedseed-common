module.exports = minimatch;
minimatch.Minimatch = Minimatch;
var path = { sep: '/' };
try {
    path = require('path');
}
catch (er) { }
var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {};
var expand = require('brace-expansion');
var plTypes = {
    '!': { open: '(?:(?!(?:', close: '))[^/]*?)' },
    '?': { open: '(?:', close: ')?' },
    '+': { open: '(?:', close: ')+' },
    '*': { open: '(?:', close: ')*' },
    '@': { open: '(?:', close: ')' }
};
// any single thing other than /
// don't need to escape / when using new RegExp()
var qmark = '[^/]';
// * => any number of characters
var star = qmark + '*?';
// ** when dots are allowed.  Anything goes, except .. and .
// not (^ or / followed by one or two dots followed by $ or /),
// followed by anything, any number of times.
var twoStarDot = '(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?';
// not a ^ or / followed by a dot,
// followed by anything, any number of times.
var twoStarNoDot = '(?:(?!(?:\\\/|^)\\.).)*?';
// characters that need to be escaped in RegExp.
var reSpecials = charSet('().*{}+?[]^$\\!');
// "abc" -> { a:true, b:true, c:true }
function charSet(s) {
    return s.split('').reduce(function (set, c) {
        set[c] = true;
        return set;
    }, {});
}
// normalizes slashes.
var slashSplit = /\/+/;
minimatch.filter = filter;
function filter(pattern, options) {
    options = options || {};
    return function (p, i, list) {
        return minimatch(p, pattern, options);
    };
}
function ext(a, b) {
    a = a || {};
    b = b || {};
    var t = {};
    Object.keys(b).forEach(function (k) {
        t[k] = b[k];
    });
    Object.keys(a).forEach(function (k) {
        t[k] = a[k];
    });
    return t;
}
minimatch.defaults = function (def) {
    if (!def || !Object.keys(def).length)
        return minimatch;
    var orig = minimatch;
    var m = function minimatch(p, pattern, options) {
        return orig.minimatch(p, pattern, ext(def, options));
    };
    m.Minimatch = function Minimatch(pattern, options) {
        return new orig.Minimatch(pattern, ext(def, options));
    };
    return m;
};
Minimatch.defaults = function (def) {
    if (!def || !Object.keys(def).length)
        return Minimatch;
    return minimatch.defaults(def).Minimatch;
};
function minimatch(p, pattern, options) {
    if (typeof pattern !== 'string') {
        throw new TypeError('glob pattern string required');
    }
    if (!options)
        options = {};
    // shortcut: comments match nothing.
    if (!options.nocomment && pattern.charAt(0) === '#') {
        return false;
    }
    // "" only matches ""
    if (pattern.trim() === '')
        return p === '';
    return new Minimatch(pattern, options).match(p);
}
function Minimatch(pattern, options) {
    if (!(this instanceof Minimatch)) {
        return new Minimatch(pattern, options);
    }
    if (typeof pattern !== 'string') {
        throw new TypeError('glob pattern string required');
    }
    if (!options)
        options = {};
    pattern = pattern.trim();
    // windows support: need to use /, not \
    if (path.sep !== '/') {
        pattern = pattern.split(path.sep).join('/');
    }
    this.options = options;
    this.set = [];
    this.pattern = pattern;
    this.regexp = null;
    this.negate = false;
    this.comment = false;
    this.empty = false;
    // make the set of regexps etc.
    this.make();
}
Minimatch.prototype.debug = function () { };
Minimatch.prototype.make = make;
function make() {
    // don't do it more than once.
    if (this._made)
        return;
    var pattern = this.pattern;
    var options = this.options;
    // empty patterns and comments match nothing.
    if (!options.nocomment && pattern.charAt(0) === '#') {
        this.comment = true;
        return;
    }
    if (!pattern) {
        this.empty = true;
        return;
    }
    // step 1: figure out negation, etc.
    this.parseNegate();
    // step 2: expand braces
    var set = this.globSet = this.braceExpand();
    if (options.debug)
        this.debug = console.error;
    this.debug(this.pattern, set);
    // step 3: now we have a set, so turn each one into a series of path-portion
    // matching patterns.
    // These will be regexps, except in the case of "**", which is
    // set to the GLOBSTAR object for globstar behavior,
    // and will not contain any / characters
    set = this.globParts = set.map(function (s) {
        return s.split(slashSplit);
    });
    this.debug(this.pattern, set);
    // glob --> regexps
    set = set.map(function (s, si, set) {
        return s.map(this.parse, this);
    }, this);
    this.debug(this.pattern, set);
    // filter out everything that didn't compile properly.
    set = set.filter(function (s) {
        return s.indexOf(false) === -1;
    });
    this.debug(this.pattern, set);
    this.set = set;
}
Minimatch.prototype.parseNegate = parseNegate;
function parseNegate() {
    var pattern = this.pattern;
    var negate = false;
    var options = this.options;
    var negateOffset = 0;
    if (options.nonegate)
        return;
    for (var i = 0, l = pattern.length; i < l && pattern.charAt(i) === '!'; i++) {
        negate = !negate;
        negateOffset++;
    }
    if (negateOffset)
        this.pattern = pattern.substr(negateOffset);
    this.negate = negate;
}
// Brace expansion:
// a{b,c}d -> abd acd
// a{b,}c -> abc ac
// a{0..3}d -> a0d a1d a2d a3d
// a{b,c{d,e}f}g -> abg acdfg acefg
// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
//
// Invalid sets are not expanded.
// a{2..}b -> a{2..}b
// a{b}c -> a{b}c
minimatch.braceExpand = function (pattern, options) {
    return braceExpand(pattern, options);
};
Minimatch.prototype.braceExpand = braceExpand;
function braceExpand(pattern, options) {
    if (!options) {
        if (this instanceof Minimatch) {
            options = this.options;
        }
        else {
            options = {};
        }
    }
    pattern = typeof pattern === 'undefined'
        ? this.pattern : pattern;
    if (typeof pattern === 'undefined') {
        throw new TypeError('undefined pattern');
    }
    if (options.nobrace ||
        !pattern.match(/\{.*\}/)) {
        // shortcut. no need to expand.
        return [pattern];
    }
    return expand(pattern);
}
// parse a component of the expanded set.
// At this point, no pattern may contain "/" in it
// so we're going to return a 2d array, where each entry is the full
// pattern, split on '/', and then turned into a regular expression.
// A regexp is made at the end which joins each array with an
// escaped /, and another full one which joins each regexp with |.
//
// Following the lead of Bash 4.1, note that "**" only has special meaning
// when it is the *only* thing in a path portion.  Otherwise, any series
// of * is equivalent to a single *.  Globstar behavior is enabled by
// default, and can be disabled by setting options.noglobstar.
Minimatch.prototype.parse = parse;
var SUBPARSE = {};
function parse(pattern, isSub) {
    if (pattern.length > 1024 * 64) {
        throw new TypeError('pattern is too long');
    }
    var options = this.options;
    // shortcuts
    if (!options.noglobstar && pattern === '**')
        return GLOBSTAR;
    if (pattern === '')
        return '';
    var re = '';
    var hasMagic = !!options.nocase;
    var escaping = false;
    // ? => one single character
    var patternListStack = [];
    var negativeLists = [];
    var stateChar;
    var inClass = false;
    var reClassStart = -1;
    var classStart = -1;
    // . and .. never match anything that doesn't start with .,
    // even when options.dot is set.
    var patternStart = pattern.charAt(0) === '.' ? '' // anything
        : options.dot ? '(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))'
            : '(?!\\.)';
    var self = this;
    function clearStateChar() {
        if (stateChar) {
            // we had some state-tracking character
            // that wasn't consumed by this pass.
            switch (stateChar) {
                case '*':
                    re += star;
                    hasMagic = true;
                    break;
                case '?':
                    re += qmark;
                    hasMagic = true;
                    break;
                default:
                    re += '\\' + stateChar;
                    break;
            }
            self.debug('clearStateChar %j %j', stateChar, re);
            stateChar = false;
        }
    }
    for (var i = 0, len = pattern.length, c; (i < len) && (c = pattern.charAt(i)); i++) {
        this.debug('%s\t%s %s %j', pattern, i, re, c);
        // skip over any that are escaped.
        if (escaping && reSpecials[c]) {
            re += '\\' + c;
            escaping = false;
            continue;
        }
        switch (c) {
            case '/':
                // completely not allowed, even escaped.
                // Should already be path-split by now.
                return false;
            case '\\':
                clearStateChar();
                escaping = true;
                continue;
            // the various stateChar values
            // for the "extglob" stuff.
            case '?':
            case '*':
            case '+':
            case '@':
            case '!':
                this.debug('%s\t%s %s %j <-- stateChar', pattern, i, re, c);
                // all of those are literals inside a class, except that
                // the glob [!a] means [^a] in regexp
                if (inClass) {
                    this.debug('  in class');
                    if (c === '!' && i === classStart + 1)
                        c = '^';
                    re += c;
                    continue;
                }
                // if we already have a stateChar, then it means
                // that there was something like ** or +? in there.
                // Handle the stateChar, then proceed with this one.
                self.debug('call clearStateChar %j', stateChar);
                clearStateChar();
                stateChar = c;
                // if extglob is disabled, then +(asdf|foo) isn't a thing.
                // just clear the statechar *now*, rather than even diving into
                // the patternList stuff.
                if (options.noext)
                    clearStateChar();
                continue;
            case '(':
                if (inClass) {
                    re += '(';
                    continue;
                }
                if (!stateChar) {
                    re += '\\(';
                    continue;
                }
                patternListStack.push({
                    type: stateChar,
                    start: i - 1,
                    reStart: re.length,
                    open: plTypes[stateChar].open,
                    close: plTypes[stateChar].close
                });
                // negation is (?:(?!js)[^/]*)
                re += stateChar === '!' ? '(?:(?!(?:' : '(?:';
                this.debug('plType %j %j', stateChar, re);
                stateChar = false;
                continue;
            case ')':
                if (inClass || !patternListStack.length) {
                    re += '\\)';
                    continue;
                }
                clearStateChar();
                hasMagic = true;
                var pl = patternListStack.pop();
                // negation is (?:(?!js)[^/]*)
                // The others are (?:<pattern>)<type>
                re += pl.close;
                if (pl.type === '!') {
                    negativeLists.push(pl);
                }
                pl.reEnd = re.length;
                continue;
            case '|':
                if (inClass || !patternListStack.length || escaping) {
                    re += '\\|';
                    escaping = false;
                    continue;
                }
                clearStateChar();
                re += '|';
                continue;
            // these are mostly the same in regexp and glob
            case '[':
                // swallow any state-tracking char before the [
                clearStateChar();
                if (inClass) {
                    re += '\\' + c;
                    continue;
                }
                inClass = true;
                classStart = i;
                reClassStart = re.length;
                re += c;
                continue;
            case ']':
                //  a right bracket shall lose its special
                //  meaning and represent itself in
                //  a bracket expression if it occurs
                //  first in the list.  -- POSIX.2 2.8.3.2
                if (i === classStart + 1 || !inClass) {
                    re += '\\' + c;
                    escaping = false;
                    continue;
                }
                // handle the case where we left a class open.
                // "[z-a]" is valid, equivalent to "\[z-a\]"
                if (inClass) {
                    // split where the last [ was, make sure we don't have
                    // an invalid re. if so, re-walk the contents of the
                    // would-be class to re-translate any characters that
                    // were passed through as-is
                    // TODO: It would probably be faster to determine this
                    // without a try/catch and a new RegExp, but it's tricky
                    // to do safely.  For now, this is safe and works.
                    var cs = pattern.substring(classStart + 1, i);
                    try {
                        RegExp('[' + cs + ']');
                    }
                    catch (er) {
                        // not a valid class!
                        var sp = this.parse(cs, SUBPARSE);
                        re = re.substr(0, reClassStart) + '\\[' + sp[0] + '\\]';
                        hasMagic = hasMagic || sp[1];
                        inClass = false;
                        continue;
                    }
                }
                // finish up the class.
                hasMagic = true;
                inClass = false;
                re += c;
                continue;
            default:
                // swallow any state char that wasn't consumed
                clearStateChar();
                if (escaping) {
                    // no need
                    escaping = false;
                }
                else if (reSpecials[c]
                    && !(c === '^' && inClass)) {
                    re += '\\';
                }
                re += c;
        } // switch
    } // for
    // handle the case where we left a class open.
    // "[abc" is valid, equivalent to "\[abc"
    if (inClass) {
        // split where the last [ was, and escape it
        // this is a huge pita.  We now have to re-walk
        // the contents of the would-be class to re-translate
        // any characters that were passed through as-is
        cs = pattern.substr(classStart + 1);
        sp = this.parse(cs, SUBPARSE);
        re = re.substr(0, reClassStart) + '\\[' + sp[0];
        hasMagic = hasMagic || sp[1];
    }
    // handle the case where we had a +( thing at the *end*
    // of the pattern.
    // each pattern list stack adds 3 chars, and we need to go through
    // and escape any | chars that were passed through as-is for the regexp.
    // Go through and escape them, taking care not to double-escape any
    // | chars that were already escaped.
    for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
        var tail = re.slice(pl.reStart + pl.open.length);
        this.debug('setting tail', re, pl);
        // maybe some even number of \, then maybe 1 \, followed by a |
        tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function (_, $1, $2) {
            if (!$2) {
                // the | isn't already escaped, so escape it.
                $2 = '\\';
            }
            // need to escape all those slashes *again*, without escaping the
            // one that we need for escaping the | character.  As it works out,
            // escaping an even number of slashes can be done by simply repeating
            // it exactly after itself.  That's why this trick works.
            //
            // I am sorry that you have to see this.
            return $1 + $1 + $2 + '|';
        });
        this.debug('tail=%j\n   %s', tail, tail, pl, re);
        var t = pl.type === '*' ? star
            : pl.type === '?' ? qmark
                : '\\' + pl.type;
        hasMagic = true;
        re = re.slice(0, pl.reStart) + t + '\\(' + tail;
    }
    // handle trailing things that only matter at the very end.
    clearStateChar();
    if (escaping) {
        // trailing \\
        re += '\\\\';
    }
    // only need to apply the nodot start if the re starts with
    // something that could conceivably capture a dot
    var addPatternStart = false;
    switch (re.charAt(0)) {
        case '.':
        case '[':
        case '(': addPatternStart = true;
    }
    // Hack to work around lack of negative lookbehind in JS
    // A pattern like: *.!(x).!(y|z) needs to ensure that a name
    // like 'a.xyz.yz' doesn't match.  So, the first negative
    // lookahead, has to look ALL the way ahead, to the end of
    // the pattern.
    for (var n = negativeLists.length - 1; n > -1; n--) {
        var nl = negativeLists[n];
        var nlBefore = re.slice(0, nl.reStart);
        var nlFirst = re.slice(nl.reStart, nl.reEnd - 8);
        var nlLast = re.slice(nl.reEnd - 8, nl.reEnd);
        var nlAfter = re.slice(nl.reEnd);
        nlLast += nlAfter;
        // Handle nested stuff like *(*.js|!(*.json)), where open parens
        // mean that we should *not* include the ) in the bit that is considered
        // "after" the negated section.
        var openParensBefore = nlBefore.split('(').length - 1;
        var cleanAfter = nlAfter;
        for (i = 0; i < openParensBefore; i++) {
            cleanAfter = cleanAfter.replace(/\)[+*?]?/, '');
        }
        nlAfter = cleanAfter;
        var dollar = '';
        if (nlAfter === '' && isSub !== SUBPARSE) {
            dollar = '$';
        }
        var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast;
        re = newRe;
    }
    // if the re is not "" at this point, then we need to make sure
    // it doesn't match against an empty path part.
    // Otherwise a/* will match a/, which it should not.
    if (re !== '' && hasMagic) {
        re = '(?=.)' + re;
    }
    if (addPatternStart) {
        re = patternStart + re;
    }
    // parsing just a piece of a larger pattern.
    if (isSub === SUBPARSE) {
        return [re, hasMagic];
    }
    // skip the regexp for non-magical patterns
    // unescape anything in it, though, so that it'll be
    // an exact match against a file etc.
    if (!hasMagic) {
        return globUnescape(pattern);
    }
    var flags = options.nocase ? 'i' : '';
    try {
        var regExp = new RegExp('^' + re + '$', flags);
    }
    catch (er) {
        // If it was an invalid regular expression, then it can't match
        // anything.  This trick looks for a character after the end of
        // the string, which is of course impossible, except in multi-line
        // mode, but it's not a /m regex.
        return new RegExp('$.');
    }
    regExp._glob = pattern;
    regExp._src = re;
    return regExp;
}
minimatch.makeRe = function (pattern, options) {
    return new Minimatch(pattern, options || {}).makeRe();
};
Minimatch.prototype.makeRe = makeRe;
function makeRe() {
    if (this.regexp || this.regexp === false)
        return this.regexp;
    // at this point, this.set is a 2d array of partial
    // pattern strings, or "**".
    //
    // It's better to use .match().  This function shouldn't
    // be used, really, but it's pretty convenient sometimes,
    // when you just want to work with a regex.
    var set = this.set;
    if (!set.length) {
        this.regexp = false;
        return this.regexp;
    }
    var options = this.options;
    var twoStar = options.noglobstar ? star
        : options.dot ? twoStarDot
            : twoStarNoDot;
    var flags = options.nocase ? 'i' : '';
    var re = set.map(function (pattern) {
        return pattern.map(function (p) {
            return (p === GLOBSTAR) ? twoStar
                : (typeof p === 'string') ? regExpEscape(p)
                    : p._src;
        }).join('\\\/');
    }).join('|');
    // must match entire pattern
    // ending in a * or ** will make it less strict.
    re = '^(?:' + re + ')$';
    // can match anything, as long as it's not this.
    if (this.negate)
        re = '^(?!' + re + ').*$';
    try {
        this.regexp = new RegExp(re, flags);
    }
    catch (ex) {
        this.regexp = false;
    }
    return this.regexp;
}
minimatch.match = function (list, pattern, options) {
    options = options || {};
    var mm = new Minimatch(pattern, options);
    list = list.filter(function (f) {
        return mm.match(f);
    });
    if (mm.options.nonull && !list.length) {
        list.push(pattern);
    }
    return list;
};
Minimatch.prototype.match = match;
function match(f, partial) {
    this.debug('match', f, this.pattern);
    // short-circuit in the case of busted things.
    // comments, etc.
    if (this.comment)
        return false;
    if (this.empty)
        return f === '';
    if (f === '/' && partial)
        return true;
    var options = this.options;
    // windows: need to use /, not \
    if (path.sep !== '/') {
        f = f.split(path.sep).join('/');
    }
    // treat the test path as a set of pathparts.
    f = f.split(slashSplit);
    this.debug(this.pattern, 'split', f);
    // just ONE of the pattern sets in this.set needs to match
    // in order for it to be valid.  If negating, then just one
    // match means that we have failed.
    // Either way, return on the first hit.
    var set = this.set;
    this.debug(this.pattern, 'set', set);
    // Find the basename of the path by looking for the last non-empty segment
    var filename;
    var i;
    for (i = f.length - 1; i >= 0; i--) {
        filename = f[i];
        if (filename)
            break;
    }
    for (i = 0; i < set.length; i++) {
        var pattern = set[i];
        var file = f;
        if (options.matchBase && pattern.length === 1) {
            file = [filename];
        }
        var hit = this.matchOne(file, pattern, partial);
        if (hit) {
            if (options.flipNegate)
                return true;
            return !this.negate;
        }
    }
    // didn't get any hits.  this is success if it's a negative
    // pattern, failure otherwise.
    if (options.flipNegate)
        return false;
    return this.negate;
}
// set partial to true to test if, for example,
// "/a/b" matches the start of "/*/b/*/d"
// Partial means, if you run out of file before you run
// out of pattern, then that's fine, as long as all
// the parts match.
Minimatch.prototype.matchOne = function (file, pattern, partial) {
    var options = this.options;
    this.debug('matchOne', { 'this': this, file: file, pattern: pattern });
    this.debug('matchOne', file.length, pattern.length);
    for (var fi = 0, pi = 0, fl = file.length, pl = pattern.length; (fi < fl) && (pi < pl); fi++, pi++) {
        this.debug('matchOne loop');
        var p = pattern[pi];
        var f = file[fi];
        this.debug(pattern, p, f);
        // should be impossible.
        // some invalid regexp stuff in the set.
        if (p === false)
            return false;
        if (p === GLOBSTAR) {
            this.debug('GLOBSTAR', [pattern, p, f]);
            // "**"
            // a/**/b/**/c would match the following:
            // a/b/x/y/z/c
            // a/x/y/z/b/c
            // a/b/x/b/x/c
            // a/b/c
            // To do this, take the rest of the pattern after
            // the **, and see if it would match the file remainder.
            // If so, return success.
            // If not, the ** "swallows" a segment, and try again.
            // This is recursively awful.
            //
            // a/**/b/**/c matching a/b/x/y/z/c
            // - a matches a
            // - doublestar
            //   - matchOne(b/x/y/z/c, b/**/c)
            //     - b matches b
            //     - doublestar
            //       - matchOne(x/y/z/c, c) -> no
            //       - matchOne(y/z/c, c) -> no
            //       - matchOne(z/c, c) -> no
            //       - matchOne(c, c) yes, hit
            var fr = fi;
            var pr = pi + 1;
            if (pr === pl) {
                this.debug('** at the end');
                // a ** at the end will just swallow the rest.
                // We have found a match.
                // however, it will not swallow /.x, unless
                // options.dot is set.
                // . and .. are *never* matched by **, for explosively
                // exponential reasons.
                for (; fi < fl; fi++) {
                    if (file[fi] === '.' || file[fi] === '..' ||
                        (!options.dot && file[fi].charAt(0) === '.'))
                        return false;
                }
                return true;
            }
            // ok, let's see if we can swallow whatever we can.
            while (fr < fl) {
                var swallowee = file[fr];
                this.debug('\nglobstar while', file, fr, pattern, pr, swallowee);
                // XXX remove this slice.  Just pass the start index.
                if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
                    this.debug('globstar found match!', fr, fl, swallowee);
                    // found a match.
                    return true;
                }
                else {
                    // can't swallow "." or ".." ever.
                    // can only swallow ".foo" when explicitly asked.
                    if (swallowee === '.' || swallowee === '..' ||
                        (!options.dot && swallowee.charAt(0) === '.')) {
                        this.debug('dot detected!', file, fr, pattern, pr);
                        break;
                    }
                    // ** swallows a segment, and continue.
                    this.debug('globstar swallow a segment, and continue');
                    fr++;
                }
            }
            // no match was found.
            // However, in partial mode, we can't say this is necessarily over.
            // If there's more *pattern* left, then
            if (partial) {
                // ran out of file
                this.debug('\n>>> no match, partial?', file, fr, pattern, pr);
                if (fr === fl)
                    return true;
            }
            return false;
        }
        // something other than **
        // non-magic patterns just have to match exactly
        // patterns with magic have been turned into regexps.
        var hit;
        if (typeof p === 'string') {
            if (options.nocase) {
                hit = f.toLowerCase() === p.toLowerCase();
            }
            else {
                hit = f === p;
            }
            this.debug('string match', p, f, hit);
        }
        else {
            hit = f.match(p);
            this.debug('pattern match', p, f, hit);
        }
        if (!hit)
            return false;
    }
    // Note: ending in / means that we'll get a final ""
    // at the end of the pattern.  This can only match a
    // corresponding "" at the end of the file.
    // If the file ends in /, then it can only match a
    // a pattern that ends in /, unless the pattern just
    // doesn't have any more for it. But, a/b/ should *not*
    // match "a/b/*", even though "" matches against the
    // [^/]*? pattern, except in partial mode, where it might
    // simply not be reached yet.
    // However, a/b/ should still satisfy a/*
    // now either we fell off the end of the pattern, or we're done.
    if (fi === fl && pi === pl) {
        // ran out of pattern and filename at the same time.
        // an exact hit!
        return true;
    }
    else if (fi === fl) {
        // ran out of file, but still had pattern left.
        // this is ok if we're doing the match as part of
        // a glob fs traversal.
        return partial;
    }
    else if (pi === pl) {
        // ran out of pattern, still have file left.
        // this is only acceptable if we're on the very last
        // empty segment of a file with a trailing slash.
        // a/* should match a/b/
        var emptyFileEnd = (fi === fl - 1) && (file[fi] === '');
        return emptyFileEnd;
    }
    // should be unreachable.
    throw new Error('wtf?');
};
// replace stuff like \* with *
function globUnescape(s) {
    return s.replace(/\\(.)/g, '$1');
}
function regExpEscape(s) {
    return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxtaW5pbWF0Y2hcXG1pbmltYXRjaC5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxtaW5pbWF0Y2hcXG1pbmltYXRjaC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQTtBQUMxQixTQUFTLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtBQUUvQixJQUFJLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQTtBQUN2QixJQUFJLENBQUM7SUFDSCxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ3hCLENBQUM7QUFBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQztBQUVmLElBQUksUUFBUSxHQUFHLFNBQVMsQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFDM0QsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUE7QUFFdkMsSUFBSSxPQUFPLEdBQUc7SUFDWixHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUM7SUFDN0MsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO0lBQ2pDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtJQUNqQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxF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QUN6QixNQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ3pCLENBQUMsQ0FBQTtBQUVELCtCQUErQjtBQUMvQixzQkFBdUIsQ0FBQztJQUN0QixNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDbEMsQ0FBQztBQUVELHNCQUF1QixDQUFDO0lBQ3RCLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLDBCQUEwQixFQUFFLE1BQU0sQ0FBQyxDQUFBO0FBQ3RELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9IG1pbmltYXRjaFxubWluaW1hdGNoLk1pbmltYXRjaCA9IE1pbmltYXRjaFxuXG52YXIgcGF0aCA9IHsgc2VwOiAnLycgfVxudHJ5IHtcbiAgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxufSBjYXRjaCAoZXIpIHt9XG5cbnZhciBHTE9CU1RBUiA9IG1pbmltYXRjaC5HTE9CU1RBUiA9IE1pbmltYXRjaC5HTE9CU1RBUiA9IHt9XG52YXIgZXhwYW5kID0gcmVxdWlyZSgnYnJhY2UtZXhwYW5zaW9uJylcblxudmFyIHBsVHlwZXMgPSB7XG4gICchJzogeyBvcGVuOiAnKD86KD8hKD86JywgY2xvc2U6ICcpKVteL10qPyknfSxcbiAgJz8nOiB7IG9wZW46ICcoPzonLCBjbG9zZTogJyk/JyB9LFxuICAnKyc6IHsgb3BlbjogJyg/OicsIGNsb3NlOiAnKSsnIH0sXG4gICcqJzogeyBvcGVuOiAnKD86JywgY2xvc2U6ICcpKicgfSxcbiAgJ0AnOiB7IG9wZW46ICcoPzonLCBjbG9zZTogJyknIH1cbn1cblxuLy8gYW55IHNpbmdsZSB0aGluZyBvdGhlciB0aGFuIC9cbi8vIGRvbid0IG5lZWQgdG8gZXNjYXBlIC8gd2hlbiB1c2luZyBuZXcgUmVnRXhwKClcbnZhciBxbWFyayA9ICdbXi9dJ1xuXG4vLyAqID0+IGFueSBudW1iZXIgb2YgY2hhcmFjdGVyc1xudmFyIHN0YXIgPSBxbWFyayArICcqPydcblxuLy8gKiogd2hlbiBkb3RzIGFyZSBhbGxvd2VkLiAgQW55dGhpbmcgZ29lcywgZXhjZXB0IC4uIGFuZCAuXG4vLyBub3QgKF4gb3IgLyBmb2xsb3dlZCBieSBvbmUgb3IgdHdvIGRvdHMgZm9sbG93ZWQgYnkgJCBvciAvKSxcbi8vIGZvbGxvd2VkIGJ5IGFueXRoaW5nLCBhbnkgbnVtYmVyIG9mIHRpbWVzLlxudmFyIHR3b1N0YXJEb3QgPSAnKD86KD8hKD86XFxcXFxcL3xeKSg/OlxcXFwuezEsMn0pKCR8XFxcXFxcLykpLikqPydcblxuLy8gbm90IGEgXiBvciAvIGZvbGxvd2VkIGJ5IGEgZG90LFxuLy8gZm9sbG93ZWQgYnkgYW55dGhpbmcsIGFueSBudW1iZXIgb2YgdGltZXMuXG52YXIgdHdvU3Rhck5vRG90ID0gJyg/Oig/ISg/OlxcXFxcXC98XilcXFxcLikuKSo/J1xuXG4vLyBjaGFyYWN0ZXJzIHRoYXQgbmVlZCB0byBiZSBlc2NhcGVkIGluIFJlZ0V4cC5cbnZhciByZVNwZWNpYWxzID0gY2hhclNldCgnKCkuKnt9Kz9bXV4kXFxcXCEnKVxuXG4vLyBcImFiY1wiIC0+IHsgYTp0cnVlLCBiOnRydWUsIGM6dHJ1ZSB9XG5mdW5jdGlvbiBjaGFyU2V0IChzKSB7XG4gIHJldHVybiBzLnNwbGl0KCcnKS5yZWR1Y2UoZnVuY3Rpb24gKHNldCwgYykge1xuICAgIHNldFtjXSA9IHRydWVcbiAgICByZXR1cm4gc2V0XG4gIH0sIHt9KVxufVxuXG4vLyBub3JtYWxpemVzIHNsYXNoZXMuXG52YXIgc2xhc2hTcGxpdCA9IC9cXC8rL1xuXG5taW5pbWF0Y2guZmlsdGVyID0gZmlsdGVyXG5mdW5jdGlvbiBmaWx0ZXIgKHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgcmV0dXJuIGZ1bmN0aW9uIChwLCBpLCBsaXN0KSB7XG4gICAgcmV0dXJuIG1pbmltYXRjaChwLCBwYXR0ZXJuLCBvcHRpb25zKVxuICB9XG59XG5cbmZ1bmN0aW9uIGV4dCAoYSwgYikge1xuICBhID0gYSB8fCB7fVxuICBiID0gYiB8fCB7fVxuICB2YXIgdCA9IHt9XG4gIE9iamVjdC5rZXlzKGIpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICB0W2tdID0gYltrXVxuICB9KVxuICBPYmplY3Qua2V5cyhhKS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgdFtrXSA9IGFba11cbiAgfSlcbiAgcmV0dXJuIHRcbn1cblxubWluaW1hdGNoLmRlZmF1bHRzID0gZnVuY3Rpb24gKGRlZikge1xuICBpZiAoIWRlZiB8fCAhT2JqZWN0LmtleXMoZGVmKS5sZW5ndGgpIHJldHVybiBtaW5pbWF0Y2hcblxuICB2YXIgb3JpZyA9IG1pbmltYXRjaFxuXG4gIHZhciBtID0gZnVuY3Rpb24gbWluaW1hdGNoIChwLCBwYXR0ZXJuLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIG9yaWcubWluaW1hdGNoKHAsIHBhdHRlcm4sIGV4dChkZWYsIG9wdGlvbnMpKVxuICB9XG5cbiAgbS5NaW5pbWF0Y2ggPSBmdW5jdGlvbiBNaW5pbWF0Y2ggKHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IG9yaWcuTWluaW1hdGNoKHBhdHRlcm4sIGV4dChkZWYsIG9wdGlvbnMpKVxuICB9XG5cbiAgcmV0dXJuIG1cbn1cblxuTWluaW1hdGNoLmRlZmF1bHRzID0gZnVuY3Rpb24gKGRlZikge1xuICBpZiAoIWRlZiB8fCAhT2JqZWN0LmtleXMoZGVmKS5sZW5ndGgpIHJldHVybiBNaW5pbWF0Y2hcbiAgcmV0dXJuIG1pbmltYXRjaC5kZWZhdWx0cyhkZWYpLk1pbmltYXRjaFxufVxuXG5mdW5jdGlvbiBtaW5pbWF0Y2ggKHAsIHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiBwYXR0ZXJuICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2dsb2IgcGF0dGVybiBzdHJpbmcgcmVxdWlyZWQnKVxuICB9XG5cbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge31cblxuICAvLyBzaG9ydGN1dDogY29tbWVudHMgbWF0Y2ggbm90aGluZy5cbiAgaWYgKCFvcHRpb25zLm5vY29tbWVudCAmJiBwYXR0ZXJuLmNoYXJBdCgwKSA9PT0gJyMnKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBcIlwiIG9ubHkgbWF0Y2hlcyBcIlwiXG4gIGlmIChwYXR0ZXJuLnRyaW0oKSA9PT0gJycpIHJldHVybiBwID09PSAnJ1xuXG4gIHJldHVybiBuZXcgTWluaW1hdGNoKHBhdHRlcm4sIG9wdGlvbnMpLm1hdGNoKHApXG59XG5cbmZ1bmN0aW9uIE1pbmltYXRjaCAocGF0dGVybiwgb3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTWluaW1hdGNoKSkge1xuICAgIHJldHVybiBuZXcgTWluaW1hdGNoKHBhdHRlcm4sIG9wdGlvbnMpXG4gIH1cblxuICBpZiAodHlwZW9mIHBhdHRlcm4gIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZ2xvYiBwYXR0ZXJuIHN0cmluZyByZXF1aXJlZCcpXG4gIH1cblxuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fVxuICBwYXR0ZXJuID0gcGF0dGVybi50cmltKClcblxuICAvLyB3aW5kb3dzIHN1cHBvcnQ6IG5lZWQgdG8gdXNlIC8sIG5vdCBcXFxuICBpZiAocGF0aC5zZXAgIT09ICcvJykge1xuICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnNwbGl0KHBhdGguc2VwKS5qb2luKCcvJylcbiAgfVxuXG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnNcbiAgdGhpcy5zZXQgPSBbXVxuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuXG4gIHRoaXMucmVnZXhwID0gbnVsbFxuICB0aGlzLm5lZ2F0ZSA9IGZhbHNlXG4gIHRoaXMuY29tbWVudCA9IGZhbHNlXG4gIHRoaXMuZW1wdHkgPSBmYWxzZVxuXG4gIC8vIG1ha2UgdGhlIHNldCBvZiByZWdleHBzIGV0Yy5cbiAgdGhpcy5tYWtlKClcbn1cblxuTWluaW1hdGNoLnByb3RvdHlwZS5kZWJ1ZyA9IGZ1bmN0aW9uICgpIHt9XG5cbk1pbmltYXRjaC5wcm90b3R5cGUubWFrZSA9IG1ha2VcbmZ1bmN0aW9uIG1ha2UgKCkge1xuICAvLyBkb24ndCBkbyBpdCBtb3JlIHRoYW4gb25jZS5cbiAgaWYgKHRoaXMuX21hZGUpIHJldHVyblxuXG4gIHZhciBwYXR0ZXJuID0gdGhpcy5wYXR0ZXJuXG4gIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zXG5cbiAgLy8gZW1wdHkgcGF0dGVybnMgYW5kIGNvbW1lbnRzIG1hdGNoIG5vdGhpbmcuXG4gIGlmICghb3B0aW9ucy5ub2NvbW1lbnQgJiYgcGF0dGVybi5jaGFyQXQoMCkgPT09ICcjJykge1xuICAgIHRoaXMuY29tbWVudCA9IHRydWVcbiAgICByZXR1cm5cbiAgfVxuICBpZiAoIXBhdHRlcm4pIHtcbiAgICB0aGlzLmVtcHR5ID0gdHJ1ZVxuICAgIHJldHVyblxuICB9XG5cbiAgLy8gc3RlcCAxOiBmaWd1cmUgb3V0IG5lZ2F0aW9uLCBldGMuXG4gIHRoaXMucGFyc2VOZWdhdGUoKVxuXG4gIC8vIHN0ZXAgMjogZXhwYW5kIGJyYWNlc1xuICB2YXIgc2V0ID0gdGhpcy5nbG9iU2V0ID0gdGhpcy5icmFjZUV4cGFuZCgpXG5cbiAgaWYgKG9wdGlvbnMuZGVidWcpIHRoaXMuZGVidWcgPSBjb25zb2xlLmVycm9yXG5cbiAgdGhpcy5kZWJ1Zyh0aGlzLnBhdHRlcm4sIHNldClcblxuICAvLyBzdGVwIDM6IG5vdyB3ZSBoYXZlIGEgc2V0LCBzbyB0dXJuIGVhY2ggb25lIGludG8gYSBzZXJpZXMgb2YgcGF0aC1wb3J0aW9uXG4gIC8vIG1hdGNoaW5nIHBhdHRlcm5zLlxuICAvLyBUaGVzZSB3aWxsIGJlIHJlZ2V4cHMsIGV4Y2VwdCBpbiB0aGUgY2FzZSBvZiBcIioqXCIsIHdoaWNoIGlzXG4gIC8vIHNldCB0byB0aGUgR0xPQlNUQVIgb2JqZWN0IGZvciBnbG9ic3RhciBiZWhhdmlvcixcbiAgLy8gYW5kIHdpbGwgbm90IGNvbnRhaW4gYW55IC8gY2hhcmFjdGVyc1xuICBzZXQgPSB0aGlzLmdsb2JQYXJ0cyA9IHNldC5tYXAoZnVuY3Rpb24gKHMpIHtcbiAgICByZXR1cm4gcy5zcGxpdChzbGFzaFNwbGl0KVxuICB9KVxuXG4gIHRoaXMuZGVidWcodGhpcy5wYXR0ZXJuLCBzZXQpXG5cbiAgLy8gZ2xvYiAtLT4gcmVnZXhwc1xuICBzZXQgPSBzZXQubWFwKGZ1bmN0aW9uIChzLCBzaSwgc2V0KSB7XG4gICAgcmV0dXJuIHMubWFwKHRoaXMucGFyc2UsIHRoaXMpXG4gIH0sIHRoaXMpXG5cbiAgdGhpcy5kZWJ1Zyh0aGlzLnBhdHRlcm4sIHNldClcblxuICAvLyBmaWx0ZXIgb3V0IGV2ZXJ5dGhpbmcgdGhhdCBkaWRuJ3QgY29tcGlsZSBwcm9wZXJseS5cbiAgc2V0ID0gc2V0LmZpbHRlcihmdW5jdGlvbiAocykge1xuICAgIHJldHVybiBzLmluZGV4T2YoZmFsc2UpID09PSAtMVxuICB9KVxuXG4gIHRoaXMuZGVidWcodGhpcy5wYXR0ZXJuLCBzZXQpXG5cbiAgdGhpcy5zZXQgPSBzZXRcbn1cblxuTWluaW1hdGNoLnByb3RvdHlwZS5wYXJzZU5lZ2F0ZSA9IHBhcnNlTmVnYXRlXG5mdW5jdGlvbiBwYXJzZU5lZ2F0ZSAoKSB7XG4gIHZhciBwYXR0ZXJuID0gdGhpcy5wYXR0ZXJuXG4gIHZhciBuZWdhdGUgPSBmYWxzZVxuICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9uc1xuICB2YXIgbmVnYXRlT2Zmc2V0ID0gMFxuXG4gIGlmIChvcHRpb25zLm5vbmVnYXRlKSByZXR1cm5cblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHBhdHRlcm4ubGVuZ3RoXG4gICAgOyBpIDwgbCAmJiBwYXR0ZXJuLmNoYXJBdChpKSA9PT0gJyEnXG4gICAgOyBpKyspIHtcbiAgICBuZWdhdGUgPSAhbmVnYXRlXG4gICAgbmVnYXRlT2Zmc2V0KytcbiAgfVxuXG4gIGlmIChuZWdhdGVPZmZzZXQpIHRoaXMucGF0dGVybiA9IHBhdHRlcm4uc3Vic3RyKG5lZ2F0ZU9mZnNldClcbiAgdGhpcy5uZWdhdGUgPSBuZWdhdGVcbn1cblxuLy8gQnJhY2UgZXhwYW5zaW9uOlxuLy8gYXtiLGN9ZCAtPiBhYmQgYWNkXG4vLyBhe2IsfWMgLT4gYWJjIGFjXG4vLyBhezAuLjN9ZCAtPiBhMGQgYTFkIGEyZCBhM2Rcbi8vIGF7Yixje2QsZX1mfWcgLT4gYWJnIGFjZGZnIGFjZWZnXG4vLyBhe2IsY31ke2UsZn1nIC0+IGFiZGVnIGFjZGVnIGFiZGVnIGFiZGZnXG4vL1xuLy8gSW52YWxpZCBzZXRzIGFyZSBub3QgZXhwYW5kZWQuXG4vLyBhezIuLn1iIC0+IGF7Mi4ufWJcbi8vIGF7Yn1jIC0+IGF7Yn1jXG5taW5pbWF0Y2guYnJhY2VFeHBhbmQgPSBmdW5jdGlvbiAocGF0dGVybiwgb3B0aW9ucykge1xuICByZXR1cm4gYnJhY2VFeHBhbmQocGF0dGVybiwgb3B0aW9ucylcbn1cblxuTWluaW1hdGNoLnByb3RvdHlwZS5icmFjZUV4cGFuZCA9IGJyYWNlRXhwYW5kXG5cbmZ1bmN0aW9uIGJyYWNlRXhwYW5kIChwYXR0ZXJuLCBvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykge1xuICAgIGlmICh0aGlzIGluc3RhbmNlb2YgTWluaW1hdGNoKSB7XG4gICAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zXG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cbiAgfVxuXG4gIHBhdHRlcm4gPSB0eXBlb2YgcGF0dGVybiA9PT0gJ3VuZGVmaW5lZCdcbiAgICA/IHRoaXMucGF0dGVybiA6IHBhdHRlcm5cblxuICBpZiAodHlwZW9mIHBhdHRlcm4gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndW5kZWZpbmVkIHBhdHRlcm4nKVxuICB9XG5cbiAgaWYgKG9wdGlvbnMubm9icmFjZSB8fFxuICAgICFwYXR0ZXJuLm1hdGNoKC9cXHsuKlxcfS8pKSB7XG4gICAgLy8gc2hvcnRjdXQuIG5vIG5lZWQgdG8gZXhwYW5kLlxuICAgIHJldHVybiBbcGF0dGVybl1cbiAgfVxuXG4gIHJldHVybiBleHBhbmQocGF0dGVybilcbn1cblxuLy8gcGFyc2UgYSBjb21wb25lbnQgb2YgdGhlIGV4cGFuZGVkIHNldC5cbi8vIEF0IHRoaXMgcG9pbnQsIG5vIHBhdHRlcm4gbWF5IGNvbnRhaW4gXCIvXCIgaW4gaXRcbi8vIHNvIHdlJ3JlIGdvaW5nIHRvIHJldHVybiBhIDJkIGFycmF5LCB3aGVyZSBlYWNoIGVudHJ5IGlzIHRoZSBmdWxsXG4vLyBwYXR0ZXJuLCBzcGxpdCBvbiAnLycsIGFuZCB0aGVuIHR1cm5lZCBpbnRvIGEgcmVndWxhciBleHByZXNzaW9uLlxuLy8gQSByZWdleHAgaXMgbWFkZSBhdCB0aGUgZW5kIHdoaWNoIGpvaW5zIGVhY2ggYXJyYXkgd2l0aCBhblxuLy8gZXNjYXBlZCAvLCBhbmQgYW5vdGhlciBmdWxsIG9uZSB3aGljaCBqb2lucyBlYWNoIHJlZ2V4cCB3aXRoIHwuXG4vL1xuLy8gRm9sbG93aW5nIHRoZSBsZWFkIG9mIEJhc2ggNC4xLCBub3RlIHRoYXQgXCIqKlwiIG9ubHkgaGFzIHNwZWNpYWwgbWVhbmluZ1xuLy8gd2hlbiBpdCBpcyB0aGUgKm9ubHkqIHRoaW5nIGluIGEgcGF0aCBwb3J0aW9uLiAgT3RoZXJ3aXNlLCBhbnkgc2VyaWVzXG4vLyBvZiAqIGlzIGVxdWl2YWxlbnQgdG8gYSBzaW5nbGUgKi4gIEdsb2JzdGFyIGJlaGF2aW9yIGlzIGVuYWJsZWQgYnlcbi8vIGRlZmF1bHQsIGFuZCBjYW4gYmUgZGlzYWJsZWQgYnkgc2V0dGluZyBvcHRpb25zLm5vZ2xvYnN0YXIuXG5NaW5pbWF0Y2gucHJvdG90eXBlLnBhcnNlID0gcGFyc2VcbnZhciBTVUJQQVJTRSA9IHt9XG5mdW5jdGlvbiBwYXJzZSAocGF0dGVybiwgaXNTdWIpIHtcbiAgaWYgKHBhdHRlcm4ubGVuZ3RoID4gMTAyNCAqIDY0KSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncGF0dGVybiBpcyB0b28gbG9uZycpXG4gIH1cblxuICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9uc1xuXG4gIC8vIHNob3J0Y3V0c1xuICBpZiAoIW9wdGlvbnMubm9nbG9ic3RhciAmJiBwYXR0ZXJuID09PSAnKionKSByZXR1cm4gR0xPQlNUQVJcbiAgaWYgKHBhdHRlcm4gPT09ICcnKSByZXR1cm4gJydcblxuICB2YXIgcmUgPSAnJ1xuICB2YXIgaGFzTWFnaWMgPSAhIW9wdGlvbnMubm9jYXNlXG4gIHZhciBlc2NhcGluZyA9IGZhbHNlXG4gIC8vID8gPT4gb25lIHNpbmdsZSBjaGFyYWN0ZXJcbiAgdmFyIHBhdHRlcm5MaXN0U3RhY2sgPSBbXVxuICB2YXIgbmVnYXRpdmVMaXN0cyA9IFtdXG4gIHZhciBzdGF0ZUNoYXJcbiAgdmFyIGluQ2xhc3MgPSBmYWxzZVxuICB2YXIgcmVDbGFzc1N0YXJ0ID0gLTFcbiAgdmFyIGNsYXNzU3RhcnQgPSAtMVxuICAvLyAuIGFuZCAuLiBuZXZlciBtYXRjaCBhbnl0aGluZyB0aGF0IGRvZXNuJ3Qgc3RhcnQgd2l0aCAuLFxuICAvLyBldmVuIHdoZW4gb3B0aW9ucy5kb3QgaXMgc2V0LlxuICB2YXIgcGF0dGVyblN0YXJ0ID0gcGF0dGVybi5jaGFyQXQoMCkgPT09ICcuJyA/ICcnIC8vIGFueXRoaW5nXG4gIC8vIG5vdCAoc3RhcnQgb3IgLyBmb2xsb3dlZCBieSAuIG9yIC4uIGZvbGxvd2VkIGJ5IC8gb3IgZW5kKVxuICA6IG9wdGlvbnMuZG90ID8gJyg/ISg/Ol58XFxcXFxcLylcXFxcLnsxLDJ9KD86JHxcXFxcXFwvKSknXG4gIDogJyg/IVxcXFwuKSdcbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgZnVuY3Rpb24gY2xlYXJTdGF0ZUNoYXIgKCkge1xuICAgIGlmIChzdGF0ZUNoYXIpIHtcbiAgICAgIC8vIHdlIGhhZCBzb21lIHN0YXRlLXRyYWNraW5nIGNoYXJhY3RlclxuICAgICAgLy8gdGhhdCB3YXNuJ3QgY29uc3VtZWQgYnkgdGhpcyBwYXNzLlxuICAgICAgc3dpdGNoIChzdGF0ZUNoYXIpIHtcbiAgICAgICAgY2FzZSAnKic6XG4gICAgICAgICAgcmUgKz0gc3RhclxuICAgICAgICAgIGhhc01hZ2ljID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgICBjYXNlICc/JzpcbiAgICAgICAgICByZSArPSBxbWFya1xuICAgICAgICAgIGhhc01hZ2ljID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJlICs9ICdcXFxcJyArIHN0YXRlQ2hhclxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgc2VsZi5kZWJ1ZygnY2xlYXJTdGF0ZUNoYXIgJWogJWonLCBzdGF0ZUNoYXIsIHJlKVxuICAgICAgc3RhdGVDaGFyID0gZmFsc2VcbiAgICB9XG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGF0dGVybi5sZW5ndGgsIGNcbiAgICA7IChpIDwgbGVuKSAmJiAoYyA9IHBhdHRlcm4uY2hhckF0KGkpKVxuICAgIDsgaSsrKSB7XG4gICAgdGhpcy5kZWJ1ZygnJXNcXHQlcyAlcyAlaicsIHBhdHRlcm4sIGksIHJlLCBjKVxuXG4gICAgLy8gc2tpcCBvdmVyIGFueSB0aGF0IGFyZSBlc2NhcGVkLlxuICAgIGlmIChlc2NhcGluZyAmJiByZVNwZWNpYWxzW2NdKSB7XG4gICAgICByZSArPSAnXFxcXCcgKyBjXG4gICAgICBlc2NhcGluZyA9IGZhbHNlXG4gICAgICBjb250aW51ZVxuICAgIH1cblxuICAgIHN3aXRjaCAoYykge1xuICAgICAgY2FzZSAnLyc6XG4gICAgICAgIC8vIGNvbXBsZXRlbHkgbm90IGFsbG93ZWQsIGV2ZW4gZXNjYXBlZC5cbiAgICAgICAgLy8gU2hvdWxkIGFscmVhZHkgYmUgcGF0aC1zcGxpdCBieSBub3cuXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgICBjYXNlICdcXFxcJzpcbiAgICAgICAgY2xlYXJTdGF0ZUNoYXIoKVxuICAgICAgICBlc2NhcGluZyA9IHRydWVcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIC8vIHRoZSB2YXJpb3VzIHN0YXRlQ2hhciB2YWx1ZXNcbiAgICAgIC8vIGZvciB0aGUgXCJleHRnbG9iXCIgc3R1ZmYuXG4gICAgICBjYXNlICc/JzpcbiAgICAgIGNhc2UgJyonOlxuICAgICAgY2FzZSAnKyc6XG4gICAgICBjYXNlICdAJzpcbiAgICAgIGNhc2UgJyEnOlxuICAgICAgICB0aGlzLmRlYnVnKCclc1xcdCVzICVzICVqIDwtLSBzdGF0ZUNoYXInLCBwYXR0ZXJuLCBpLCByZSwgYylcblxuICAgICAgICAvLyBhbGwgb2YgdGhvc2UgYXJlIGxpdGVyYWxzIGluc2lkZSBhIGNsYXNzLCBleGNlcHQgdGhhdFxuICAgICAgICAvLyB0aGUgZ2xvYiBbIWFdIG1lYW5zIFteYV0gaW4gcmVnZXhwXG4gICAgICAgIGlmIChpbkNsYXNzKSB7XG4gICAgICAgICAgdGhpcy5kZWJ1ZygnICBpbiBjbGFzcycpXG4gICAgICAgICAgaWYgKGMgPT09ICchJyAmJiBpID09PSBjbGFzc1N0YXJ0ICsgMSkgYyA9ICdeJ1xuICAgICAgICAgIHJlICs9IGNcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgd2UgYWxyZWFkeSBoYXZlIGEgc3RhdGVDaGFyLCB0aGVuIGl0IG1lYW5zXG4gICAgICAgIC8vIHRoYXQgdGhlcmUgd2FzIHNvbWV0aGluZyBsaWtlICoqIG9yICs/IGluIHRoZXJlLlxuICAgICAgICAvLyBIYW5kbGUgdGhlIHN0YXRlQ2hhciwgdGhlbiBwcm9jZWVkIHdpdGggdGhpcyBvbmUuXG4gICAgICAgIHNlbGYuZGVidWcoJ2NhbGwgY2xlYXJTdGF0ZUNoYXIgJWonLCBzdGF0ZUNoYXIpXG4gICAgICAgIGNsZWFyU3RhdGVDaGFyKClcbiAgICAgICAgc3RhdGVDaGFyID0gY1xuICAgICAgICAvLyBpZiBleHRnbG9iIGlzIGRpc2FibGVkLCB0aGVuICsoYXNkZnxmb28pIGlzbid0IGEgdGhpbmcuXG4gICAgICAgIC8vIGp1c3QgY2xlYXIgdGhlIHN0YXRlY2hhciAqbm93KiwgcmF0aGVyIHRoYW4gZXZlbiBkaXZpbmcgaW50b1xuICAgICAgICAvLyB0aGUgcGF0dGVybkxpc3Qgc3R1ZmYuXG4gICAgICAgIGlmIChvcHRpb25zLm5vZXh0KSBjbGVhclN0YXRlQ2hhcigpXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlICcoJzpcbiAgICAgICAgaWYgKGluQ2xhc3MpIHtcbiAgICAgICAgICByZSArPSAnKCdcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzdGF0ZUNoYXIpIHtcbiAgICAgICAgICByZSArPSAnXFxcXCgnXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIHBhdHRlcm5MaXN0U3RhY2sucHVzaCh7XG4gICAgICAgICAgdHlwZTogc3RhdGVDaGFyLFxuICAgICAgICAgIHN0YXJ0OiBpIC0gMSxcbiAgICAgICAgICByZVN0YXJ0OiByZS5sZW5ndGgsXG4gICAgICAgICAgb3BlbjogcGxUeXBlc1tzdGF0ZUNoYXJdLm9wZW4sXG4gICAgICAgICAgY2xvc2U6IHBsVHlwZXNbc3RhdGVDaGFyXS5jbG9zZVxuICAgICAgICB9KVxuICAgICAgICAvLyBuZWdhdGlvbiBpcyAoPzooPyFqcylbXi9dKilcbiAgICAgICAgcmUgKz0gc3RhdGVDaGFyID09PSAnIScgPyAnKD86KD8hKD86JyA6ICcoPzonXG4gICAgICAgIHRoaXMuZGVidWcoJ3BsVHlwZSAlaiAlaicsIHN0YXRlQ2hhciwgcmUpXG4gICAgICAgIHN0YXRlQ2hhciA9IGZhbHNlXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlICcpJzpcbiAgICAgICAgaWYgKGluQ2xhc3MgfHwgIXBhdHRlcm5MaXN0U3RhY2subGVuZ3RoKSB7XG4gICAgICAgICAgcmUgKz0gJ1xcXFwpJ1xuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICBjbGVhclN0YXRlQ2hhcigpXG4gICAgICAgIGhhc01hZ2ljID0gdHJ1ZVxuICAgICAgICB2YXIgcGwgPSBwYXR0ZXJuTGlzdFN0YWNrLnBvcCgpXG4gICAgICAgIC8vIG5lZ2F0aW9uIGlzICg/Oig/IWpzKVteL10qKVxuICAgICAgICAvLyBUaGUgb3RoZXJzIGFyZSAoPzo8cGF0dGVybj4pPHR5cGU+XG4gICAgICAgIHJlICs9IHBsLmNsb3NlXG4gICAgICAgIGlmIChwbC50eXBlID09PSAnIScpIHtcbiAgICAgICAgICBuZWdhdGl2ZUxpc3RzLnB1c2gocGwpXG4gICAgICAgIH1cbiAgICAgICAgcGwucmVFbmQgPSByZS5sZW5ndGhcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgJ3wnOlxuICAgICAgICBpZiAoaW5DbGFzcyB8fCAhcGF0dGVybkxpc3RTdGFjay5sZW5ndGggfHwgZXNjYXBpbmcpIHtcbiAgICAgICAgICByZSArPSAnXFxcXHwnXG4gICAgICAgICAgZXNjYXBpbmcgPSBmYWxzZVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICBjbGVhclN0YXRlQ2hhcigpXG4gICAgICAgIHJlICs9ICd8J1xuICAgICAgY29udGludWVcblxuICAgICAgLy8gdGhlc2UgYXJlIG1vc3RseSB0aGUgc2FtZSBpbiByZWdleHAgYW5kIGdsb2JcbiAgICAgIGNhc2UgJ1snOlxuICAgICAgICAvLyBzd2FsbG93IGFueSBzdGF0ZS10cmFja2luZyBjaGFyIGJlZm9yZSB0aGUgW1xuICAgICAgICBjbGVhclN0YXRlQ2hhcigpXG5cbiAgICAgICAgaWYgKGluQ2xhc3MpIHtcbiAgICAgICAgICByZSArPSAnXFxcXCcgKyBjXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIGluQ2xhc3MgPSB0cnVlXG4gICAgICAgIGNsYXNzU3RhcnQgPSBpXG4gICAgICAgIHJlQ2xhc3NTdGFydCA9IHJlLmxlbmd0aFxuICAgICAgICByZSArPSBjXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlICddJzpcbiAgICAgICAgLy8gIGEgcmlnaHQgYnJhY2tldCBzaGFsbCBsb3NlIGl0cyBzcGVjaWFsXG4gICAgICAgIC8vICBtZWFuaW5nIGFuZCByZXByZXNlbnQgaXRzZWxmIGluXG4gICAgICAgIC8vICBhIGJyYWNrZXQgZXhwcmVzc2lvbiBpZiBpdCBvY2N1cnNcbiAgICAgICAgLy8gIGZpcnN0IGluIHRoZSBsaXN0LiAgLS0gUE9TSVguMiAyLjguMy4yXG4gICAgICAgIGlmIChpID09PSBjbGFzc1N0YXJ0ICsgMSB8fCAhaW5DbGFzcykge1xuICAgICAgICAgIHJlICs9ICdcXFxcJyArIGNcbiAgICAgICAgICBlc2NhcGluZyA9IGZhbHNlXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGhhbmRsZSB0aGUgY2FzZSB3aGVyZSB3ZSBsZWZ0IGEgY2xhc3Mgb3Blbi5cbiAgICAgICAgLy8gXCJbei1hXVwiIGlzIHZhbGlkLCBlcXVpdmFsZW50IHRvIFwiXFxbei1hXFxdXCJcbiAgICAgICAgaWYgKGluQ2xhc3MpIHtcbiAgICAgICAgICAvLyBzcGxpdCB3aGVyZSB0aGUgbGFzdCBbIHdhcywgbWFrZSBzdXJlIHdlIGRvbid0IGhhdmVcbiAgICAgICAgICAvLyBhbiBpbnZhbGlkIHJlLiBpZiBzbywgcmUtd2FsayB0aGUgY29udGVudHMgb2YgdGhlXG4gICAgICAgICAgLy8gd291bGQtYmUgY2xhc3MgdG8gcmUtdHJhbnNsYXRlIGFueSBjaGFyYWN0ZXJzIHRoYXRcbiAgICAgICAgICAvLyB3ZXJlIHBhc3NlZCB0aHJvdWdoIGFzLWlzXG4gICAgICAgICAgLy8gVE9ETzogSXQgd291bGQgcHJvYmFibHkgYmUgZmFzdGVyIHRvIGRldGVybWluZSB0aGlzXG4gICAgICAgICAgLy8gd2l0aG91dCBhIHRyeS9jYXRjaCBhbmQgYSBuZXcgUmVnRXhwLCBidXQgaXQncyB0cmlja3lcbiAgICAgICAgICAvLyB0byBkbyBzYWZlbHkuICBGb3Igbm93LCB0aGlzIGlzIHNhZmUgYW5kIHdvcmtzLlxuICAgICAgICAgIHZhciBjcyA9IHBhdHRlcm4uc3Vic3RyaW5nKGNsYXNzU3RhcnQgKyAxLCBpKVxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBSZWdFeHAoJ1snICsgY3MgKyAnXScpXG4gICAgICAgICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgICAgICAgIC8vIG5vdCBhIHZhbGlkIGNsYXNzIVxuICAgICAgICAgICAgdmFyIHNwID0gdGhpcy5wYXJzZShjcywgU1VCUEFSU0UpXG4gICAgICAgICAgICByZSA9IHJlLnN1YnN0cigwLCByZUNsYXNzU3RhcnQpICsgJ1xcXFxbJyArIHNwWzBdICsgJ1xcXFxdJ1xuICAgICAgICAgICAgaGFzTWFnaWMgPSBoYXNNYWdpYyB8fCBzcFsxXVxuICAgICAgICAgICAgaW5DbGFzcyA9IGZhbHNlXG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZpbmlzaCB1cCB0aGUgY2xhc3MuXG4gICAgICAgIGhhc01hZ2ljID0gdHJ1ZVxuICAgICAgICBpbkNsYXNzID0gZmFsc2VcbiAgICAgICAgcmUgKz0gY1xuICAgICAgY29udGludWVcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgLy8gc3dhbGxvdyBhbnkgc3RhdGUgY2hhciB0aGF0IHdhc24ndCBjb25zdW1lZFxuICAgICAgICBjbGVhclN0YXRlQ2hhcigpXG5cbiAgICAgICAgaWYgKGVzY2FwaW5nKSB7XG4gICAgICAgICAgLy8gbm8gbmVlZFxuICAgICAgICAgIGVzY2FwaW5nID0gZmFsc2VcbiAgICAgICAgfSBlbHNlIGlmIChyZVNwZWNpYWxzW2NdXG4gICAgICAgICAgJiYgIShjID09PSAnXicgJiYgaW5DbGFzcykpIHtcbiAgICAgICAgICByZSArPSAnXFxcXCdcbiAgICAgICAgfVxuXG4gICAgICAgIHJlICs9IGNcblxuICAgIH0gLy8gc3dpdGNoXG4gIH0gLy8gZm9yXG5cbiAgLy8gaGFuZGxlIHRoZSBjYXNlIHdoZXJlIHdlIGxlZnQgYSBjbGFzcyBvcGVuLlxuICAvLyBcIlthYmNcIiBpcyB2YWxpZCwgZXF1aXZhbGVudCB0byBcIlxcW2FiY1wiXG4gIGlmIChpbkNsYXNzKSB7XG4gICAgLy8gc3BsaXQgd2hlcmUgdGhlIGxhc3QgWyB3YXMsIGFuZCBlc2NhcGUgaXRcbiAgICAvLyB0aGlzIGlzIGEgaHVnZSBwaXRhLiAgV2Ugbm93IGhhdmUgdG8gcmUtd2Fsa1xuICAgIC8vIHRoZSBjb250ZW50cyBvZiB0aGUgd291bGQtYmUgY2xhc3MgdG8gcmUtdHJhbnNsYXRlXG4gICAgLy8gYW55IGNoYXJhY3RlcnMgdGhhdCB3ZXJlIHBhc3NlZCB0aHJvdWdoIGFzLWlzXG4gICAgY3MgPSBwYXR0ZXJuLnN1YnN0cihjbGFzc1N0YXJ0ICsgMSlcbiAgICBzcCA9IHRoaXMucGFyc2UoY3MsIFNVQlBBUlNFKVxuICAgIHJlID0gcmUuc3Vic3RyKDAsIHJlQ2xhc3NTdGFydCkgKyAnXFxcXFsnICsgc3BbMF1cbiAgICBoYXNNYWdpYyA9IGhhc01hZ2ljIHx8IHNwWzFdXG4gIH1cblxuICAvLyBoYW5kbGUgdGhlIGNhc2Ugd2hlcmUgd2UgaGFkIGEgKyggdGhpbmcgYXQgdGhlICplbmQqXG4gIC8vIG9mIHRoZSBwYXR0ZXJuLlxuICAvLyBlYWNoIHBhdHRlcm4gbGlzdCBzdGFjayBhZGRzIDMgY2hhcnMsIGFuZCB3ZSBuZWVkIHRvIGdvIHRocm91Z2hcbiAgLy8gYW5kIGVzY2FwZSBhbnkgfCBjaGFycyB0aGF0IHdlcmUgcGFzc2VkIHRocm91Z2ggYXMtaXMgZm9yIHRoZSByZWdleHAuXG4gIC8vIEdvIHRocm91Z2ggYW5kIGVzY2FwZSB0aGVtLCB0YWtpbmcgY2FyZSBub3QgdG8gZG91YmxlLWVzY2FwZSBhbnlcbiAgLy8gfCBjaGFycyB0aGF0IHdlcmUgYWxyZWFkeSBlc2NhcGVkLlxuICBmb3IgKHBsID0gcGF0dGVybkxpc3RTdGFjay5wb3AoKTsgcGw7IHBsID0gcGF0dGVybkxpc3RTdGFjay5wb3AoKSkge1xuICAgIHZhciB0YWlsID0gcmUuc2xpY2UocGwucmVTdGFydCArIHBsLm9wZW4ubGVuZ3RoKVxuICAgIHRoaXMuZGVidWcoJ3NldHRpbmcgdGFpbCcsIHJlLCBwbClcbiAgICAvLyBtYXliZSBzb21lIGV2ZW4gbnVtYmVyIG9mIFxcLCB0aGVuIG1heWJlIDEgXFwsIGZvbGxvd2VkIGJ5IGEgfFxuICAgIHRhaWwgPSB0YWlsLnJlcGxhY2UoLygoPzpcXFxcezJ9KXswLDY0fSkoXFxcXD8pXFx8L2csIGZ1bmN0aW9uIChfLCAkMSwgJDIpIHtcbiAgICAgIGlmICghJDIpIHtcbiAgICAgICAgLy8gdGhlIHwgaXNuJ3QgYWxyZWFkeSBlc2NhcGVkLCBzbyBlc2NhcGUgaXQuXG4gICAgICAgICQyID0gJ1xcXFwnXG4gICAgICB9XG5cbiAgICAgIC8vIG5lZWQgdG8gZXNjYXBlIGFsbCB0aG9zZSBzbGFzaGVzICphZ2FpbiosIHdpdGhvdXQgZXNjYXBpbmcgdGhlXG4gICAgICAvLyBvbmUgdGhhdCB3ZSBuZWVkIGZvciBlc2NhcGluZyB0aGUgfCBjaGFyYWN0ZXIuICBBcyBpdCB3b3JrcyBvdXQsXG4gICAgICAvLyBlc2NhcGluZyBhbiBldmVuIG51bWJlciBvZiBzbGFzaGVzIGNhbiBiZSBkb25lIGJ5IHNpbXBseSByZXBlYXRpbmdcbiAgICAgIC8vIGl0IGV4YWN0bHkgYWZ0ZXIgaXRzZWxmLiAgVGhhdCdzIHdoeSB0aGlzIHRyaWNrIHdvcmtzLlxuICAgICAgLy9cbiAgICAgIC8vIEkgYW0gc29ycnkgdGhhdCB5b3UgaGF2ZSB0byBzZWUgdGhpcy5cbiAgICAgIHJldHVybiAkMSArICQxICsgJDIgKyAnfCdcbiAgICB9KVxuXG4gICAgdGhpcy5kZWJ1ZygndGFpbD0lalxcbiAgICVzJywgdGFpbCwgdGFpbCwgcGwsIHJlKVxuICAgIHZhciB0ID0gcGwudHlwZSA9PT0gJyonID8gc3RhclxuICAgICAgOiBwbC50eXBlID09PSAnPycgPyBxbWFya1xuICAgICAgOiAnXFxcXCcgKyBwbC50eXBlXG5cbiAgICBoYXNNYWdpYyA9IHRydWVcbiAgICByZSA9IHJlLnNsaWNlKDAsIHBsLnJlU3RhcnQpICsgdCArICdcXFxcKCcgKyB0YWlsXG4gIH1cblxuICAvLyBoYW5kbGUgdHJhaWxpbmcgdGhpbmdzIHRoYXQgb25seSBtYXR0ZXIgYXQgdGhlIHZlcnkgZW5kLlxuICBjbGVhclN0YXRlQ2hhcigpXG4gIGlmIChlc2NhcGluZykge1xuICAgIC8vIHRyYWlsaW5nIFxcXFxcbiAgICByZSArPSAnXFxcXFxcXFwnXG4gIH1cblxuICAvLyBvbmx5IG5lZWQgdG8gYXBwbHkgdGhlIG5vZG90IHN0YXJ0IGlmIHRoZSByZSBzdGFydHMgd2l0aFxuICAvLyBzb21ldGhpbmcgdGhhdCBjb3VsZCBjb25jZWl2YWJseSBjYXB0dXJlIGEgZG90XG4gIHZhciBhZGRQYXR0ZXJuU3RhcnQgPSBmYWxzZVxuICBzd2l0Y2ggKHJlLmNoYXJBdCgwKSkge1xuICAgIGNhc2UgJy4nOlxuICAgIGNhc2UgJ1snOlxuICAgIGNhc2UgJygnOiBhZGRQYXR0ZXJuU3RhcnQgPSB0cnVlXG4gIH1cblxuICAvLyBIYWNrIHRvIHdvcmsgYXJvdW5kIGxhY2sgb2YgbmVnYXRpdmUgbG9va2JlaGluZCBpbiBKU1xuICAvLyBBIHBhdHRlcm4gbGlrZTogKi4hKHgpLiEoeXx6KSBuZWVkcyB0byBlbnN1cmUgdGhhdCBhIG5hbWVcbiAgLy8gbGlrZSAnYS54eXoueXonIGRvZXNuJ3QgbWF0Y2guICBTbywgdGhlIGZpcnN0IG5lZ2F0aXZlXG4gIC8vIGxvb2thaGVhZCwgaGFzIHRvIGxvb2sgQUxMIHRoZSB3YXkgYWhlYWQsIHRvIHRoZSBlbmQgb2ZcbiAgLy8gdGhlIHBhdHRlcm4uXG4gIGZvciAodmFyIG4gPSBuZWdhdGl2ZUxpc3RzLmxlbmd0aCAtIDE7IG4gPiAtMTsgbi0tKSB7XG4gICAgdmFyIG5sID0gbmVnYXRpdmVMaXN0c1tuXVxuXG4gICAgdmFyIG5sQmVmb3JlID0gcmUuc2xpY2UoMCwgbmwucmVTdGFydClcbiAgICB2YXIgbmxGaXJzdCA9IHJlLnNsaWNlKG5sLnJlU3RhcnQsIG5sLnJlRW5kIC0gOClcbiAgICB2YXIgbmxMYXN0ID0gcmUuc2xpY2UobmwucmVFbmQgLSA4LCBubC5yZUVuZClcbiAgICB2YXIgbmxBZnRlciA9IHJlLnNsaWNlKG5sLnJlRW5kKVxuXG4gICAgbmxMYXN0ICs9IG5sQWZ0ZXJcblxuICAgIC8vIEhhbmRsZSBuZXN0ZWQgc3R1ZmYgbGlrZSAqKCouanN8ISgqLmpzb24pKSwgd2hlcmUgb3BlbiBwYXJlbnNcbiAgICAvLyBtZWFuIHRoYXQgd2Ugc2hvdWxkICpub3QqIGluY2x1ZGUgdGhlICkgaW4gdGhlIGJpdCB0aGF0IGlzIGNvbnNpZGVyZWRcbiAgICAvLyBcImFmdGVyXCIgdGhlIG5lZ2F0ZWQgc2VjdGlvbi5cbiAgICB2YXIgb3BlblBhcmVuc0JlZm9yZSA9IG5sQmVmb3JlLnNwbGl0KCcoJykubGVuZ3RoIC0gMVxuICAgIHZhciBjbGVhbkFmdGVyID0gbmxBZnRlclxuICAgIGZvciAoaSA9IDA7IGkgPCBvcGVuUGFyZW5zQmVmb3JlOyBpKyspIHtcbiAgICAgIGNsZWFuQWZ0ZXIgPSBjbGVhbkFmdGVyLnJlcGxhY2UoL1xcKVsrKj9dPy8sICcnKVxuICAgIH1cbiAgICBubEFmdGVyID0gY2xlYW5BZnRlclxuXG4gICAgdmFyIGRvbGxhciA9ICcnXG4gICAgaWYgKG5sQWZ0ZXIgPT09ICcnICYmIGlzU3ViICE9PSBTVUJQQVJTRSkge1xuICAgICAgZG9sbGFyID0gJyQnXG4gICAgfVxuICAgIHZhciBuZXdSZSA9IG5sQmVmb3JlICsgbmxGaXJzdCArIG5sQWZ0ZXIgKyBkb2xsYXIgKyBubExhc3RcbiAgICByZSA9IG5ld1JlXG4gIH1cblxuICAvLyBpZiB0aGUgcmUgaXMgbm90IFwiXCIgYXQgdGhpcyBwb2ludCwgdGhlbiB3ZSBuZWVkIHRvIG1ha2Ugc3VyZVxuICAvLyBpdCBkb2Vzbid0IG1hdGNoIGFnYWluc3QgYW4gZW1wdHkgcGF0aCBwYXJ0LlxuICAvLyBPdGhlcndpc2UgYS8qIHdpbGwgbWF0Y2ggYS8sIHdoaWNoIGl0IHNob3VsZCBub3QuXG4gIGlmIChyZSAhPT0gJycgJiYgaGFzTWFnaWMpIHtcbiAgICByZSA9ICcoPz0uKScgKyByZVxuICB9XG5cbiAgaWYgKGFkZFBhdHRlcm5TdGFydCkge1xuICAgIHJlID0gcGF0dGVyblN0YXJ0ICsgcmVcbiAgfVxuXG4gIC8vIHBhcnNpbmcganVzdCBhIHBpZWNlIG9mIGEgbGFyZ2VyIHBhdHRlcm4uXG4gIGlmIChpc1N1YiA9PT0gU1VCUEFSU0UpIHtcbiAgICByZXR1cm4gW3JlLCBoYXNNYWdpY11cbiAgfVxuXG4gIC8vIHNraXAgdGhlIHJlZ2V4cCBmb3Igbm9uLW1hZ2ljYWwgcGF0dGVybnNcbiAgLy8gdW5lc2NhcGUgYW55dGhpbmcgaW4gaXQsIHRob3VnaCwgc28gdGhhdCBpdCdsbCBiZVxuICAvLyBhbiBleGFjdCBtYXRjaCBhZ2FpbnN0IGEgZmlsZSBldGMuXG4gIGlmICghaGFzTWFnaWMpIHtcbiAgICByZXR1cm4gZ2xvYlVuZXNjYXBlKHBhdHRlcm4pXG4gIH1cblxuICB2YXIgZmxhZ3MgPSBvcHRpb25zLm5vY2FzZSA/ICdpJyA6ICcnXG4gIHRyeSB7XG4gICAgdmFyIHJlZ0V4cCA9IG5ldyBSZWdFeHAoJ14nICsgcmUgKyAnJCcsIGZsYWdzKVxuICB9IGNhdGNoIChlcikge1xuICAgIC8vIElmIGl0IHdhcyBhbiBpbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbiwgdGhlbiBpdCBjYW4ndCBtYXRjaFxuICAgIC8vIGFueXRoaW5nLiAgVGhpcyB0cmljayBsb29rcyBmb3IgYSBjaGFyYWN0ZXIgYWZ0ZXIgdGhlIGVuZCBvZlxuICAgIC8vIHRoZSBzdHJpbmcsIHdoaWNoIGlzIG9mIGNvdXJzZSBpbXBvc3NpYmxlLCBleGNlcHQgaW4gbXVsdGktbGluZVxuICAgIC8vIG1vZGUsIGJ1dCBpdCdzIG5vdCBhIC9tIHJlZ2V4LlxuICAgIHJldHVybiBuZXcgUmVnRXhwKCckLicpXG4gIH1cblxuICByZWdFeHAuX2dsb2IgPSBwYXR0ZXJuXG4gIHJlZ0V4cC5fc3JjID0gcmVcblxuICByZXR1cm4gcmVnRXhwXG59XG5cbm1pbmltYXRjaC5tYWtlUmUgPSBmdW5jdGlvbiAocGF0dGVybiwgb3B0aW9ucykge1xuICByZXR1cm4gbmV3IE1pbmltYXRjaChwYXR0ZXJuLCBvcHRpb25zIHx8IHt9KS5tYWtlUmUoKVxufVxuXG5NaW5pbWF0Y2gucHJvdG90eXBlLm1ha2VSZSA9IG1ha2VSZVxuZnVuY3Rpb24gbWFrZVJlICgpIHtcbiAgaWYgKHRoaXMucmVnZXhwIHx8IHRoaXMucmVnZXhwID09PSBmYWxzZSkgcmV0dXJuIHRoaXMucmVnZXhwXG5cbiAgLy8gYXQgdGhpcyBwb2ludCwgdGhpcy5zZXQgaXMgYSAyZCBhcnJheSBvZiBwYXJ0aWFsXG4gIC8vIHBhdHRlcm4gc3RyaW5ncywgb3IgXCIqKlwiLlxuICAvL1xuICAvLyBJdCdzIGJldHRlciB0byB1c2UgLm1hdGNoKCkuICBUaGlzIGZ1bmN0aW9uIHNob3VsZG4ndFxuICAvLyBiZSB1c2VkLCByZWFsbHksIGJ1dCBpdCdzIHByZXR0eSBjb252ZW5pZW50IHNvbWV0aW1lcyxcbiAgLy8gd2hlbiB5b3UganVzdCB3YW50IHRvIHdvcmsgd2l0aCBhIHJlZ2V4LlxuICB2YXIgc2V0ID0gdGhpcy5zZXRcblxuICBpZiAoIXNldC5sZW5ndGgpIHtcbiAgICB0aGlzLnJlZ2V4cCA9IGZhbHNlXG4gICAgcmV0dXJuIHRoaXMucmVnZXhwXG4gIH1cbiAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnNcblxuICB2YXIgdHdvU3RhciA9IG9wdGlvbnMubm9nbG9ic3RhciA/IHN0YXJcbiAgICA6IG9wdGlvbnMuZG90ID8gdHdvU3RhckRvdFxuICAgIDogdHdvU3Rhck5vRG90XG4gIHZhciBmbGFncyA9IG9wdGlvbnMubm9jYXNlID8gJ2knIDogJydcblxuICB2YXIgcmUgPSBzZXQubWFwKGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIHBhdHRlcm4ubWFwKGZ1bmN0aW9uIChwKSB7XG4gICAgICByZXR1cm4gKHAgPT09IEdMT0JTVEFSKSA/IHR3b1N0YXJcbiAgICAgIDogKHR5cGVvZiBwID09PSAnc3RyaW5nJykgPyByZWdFeHBFc2NhcGUocClcbiAgICAgIDogcC5fc3JjXG4gICAgfSkuam9pbignXFxcXFxcLycpXG4gIH0pLmpvaW4oJ3wnKVxuXG4gIC8vIG11c3QgbWF0Y2ggZW50aXJlIHBhdHRlcm5cbiAgLy8gZW5kaW5nIGluIGEgKiBvciAqKiB3aWxsIG1ha2UgaXQgbGVzcyBzdHJpY3QuXG4gIHJlID0gJ14oPzonICsgcmUgKyAnKSQnXG5cbiAgLy8gY2FuIG1hdGNoIGFueXRoaW5nLCBhcyBsb25nIGFzIGl0J3Mgbm90IHRoaXMuXG4gIGlmICh0aGlzLm5lZ2F0ZSkgcmUgPSAnXig/IScgKyByZSArICcpLiokJ1xuXG4gIHRyeSB7XG4gICAgdGhpcy5yZWdleHAgPSBuZXcgUmVnRXhwKHJlLCBmbGFncylcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICB0aGlzLnJlZ2V4cCA9IGZhbHNlXG4gIH1cbiAgcmV0dXJuIHRoaXMucmVnZXhwXG59XG5cbm1pbmltYXRjaC5tYXRjaCA9IGZ1bmN0aW9uIChsaXN0LCBwYXR0ZXJuLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gIHZhciBtbSA9IG5ldyBNaW5pbWF0Y2gocGF0dGVybiwgb3B0aW9ucylcbiAgbGlzdCA9IGxpc3QuZmlsdGVyKGZ1bmN0aW9uIChmKSB7XG4gICAgcmV0dXJuIG1tLm1hdGNoKGYpXG4gIH0pXG4gIGlmIChtbS5vcHRpb25zLm5vbnVsbCAmJiAhbGlzdC5sZW5ndGgpIHtcbiAgICBsaXN0LnB1c2gocGF0dGVybilcbiAgfVxuICByZXR1cm4gbGlzdFxufVxuXG5NaW5pbWF0Y2gucHJvdG90eXBlLm1hdGNoID0gbWF0Y2hcbmZ1bmN0aW9uIG1hdGNoIChmLCBwYXJ0aWFsKSB7XG4gIHRoaXMuZGVidWcoJ21hdGNoJywgZiwgdGhpcy5wYXR0ZXJuKVxuICAvLyBzaG9ydC1jaXJjdWl0IGluIHRoZSBjYXNlIG9mIGJ1c3RlZCB0aGluZ3MuXG4gIC8vIGNvbW1lbnRzLCBldGMuXG4gIGlmICh0aGlzLmNvbW1lbnQpIHJldHVybiBmYWxzZVxuICBpZiAodGhpcy5lbXB0eSkgcmV0dXJuIGYgPT09ICcnXG5cbiAgaWYgKGYgPT09ICcvJyAmJiBwYXJ0aWFsKSByZXR1cm4gdHJ1ZVxuXG4gIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zXG5cbiAgLy8gd2luZG93czogbmVlZCB0byB1c2UgLywgbm90IFxcXG4gIGlmIChwYXRoLnNlcCAhPT0gJy8nKSB7XG4gICAgZiA9IGYuc3BsaXQocGF0aC5zZXApLmpvaW4oJy8nKVxuICB9XG5cbiAgLy8gdHJlYXQgdGhlIHRlc3QgcGF0aCBhcyBhIHNldCBvZiBwYXRocGFydHMuXG4gIGYgPSBmLnNwbGl0KHNsYXNoU3BsaXQpXG4gIHRoaXMuZGVidWcodGhpcy5wYXR0ZXJuLCAnc3BsaXQnLCBmKVxuXG4gIC8vIGp1c3QgT05FIG9mIHRoZSBwYXR0ZXJuIHNldHMgaW4gdGhpcy5zZXQgbmVlZHMgdG8gbWF0Y2hcbiAgLy8gaW4gb3JkZXIgZm9yIGl0IHRvIGJlIHZhbGlkLiAgSWYgbmVnYXRpbmcsIHRoZW4ganVzdCBvbmVcbiAgLy8gbWF0Y2ggbWVhbnMgdGhhdCB3ZSBoYXZlIGZhaWxlZC5cbiAgLy8gRWl0aGVyIHdheSwgcmV0dXJuIG9uIHRoZSBmaXJzdCBoaXQuXG5cbiAgdmFyIHNldCA9IHRoaXMuc2V0XG4gIHRoaXMuZGVidWcodGhpcy5wYXR0ZXJuLCAnc2V0Jywgc2V0KVxuXG4gIC8vIEZpbmQgdGhlIGJhc2VuYW1lIG9mIHRoZSBwYXRoIGJ5IGxvb2tpbmcgZm9yIHRoZSBsYXN0IG5vbi1lbXB0eSBzZWdtZW50XG4gIHZhciBmaWxlbmFtZVxuICB2YXIgaVxuICBmb3IgKGkgPSBmLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgZmlsZW5hbWUgPSBmW2ldXG4gICAgaWYgKGZpbGVuYW1lKSBicmVha1xuICB9XG5cbiAgZm9yIChpID0gMDsgaSA8IHNldC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBwYXR0ZXJuID0gc2V0W2ldXG4gICAgdmFyIGZpbGUgPSBmXG4gICAgaWYgKG9wdGlvbnMubWF0Y2hCYXNlICYmIHBhdHRlcm4ubGVuZ3RoID09PSAxKSB7XG4gICAgICBmaWxlID0gW2ZpbGVuYW1lXVxuICAgIH1cbiAgICB2YXIgaGl0ID0gdGhpcy5tYXRjaE9uZShmaWxlLCBwYXR0ZXJuLCBwYXJ0aWFsKVxuICAgIGlmIChoaXQpIHtcbiAgICAgIGlmIChvcHRpb25zLmZsaXBOZWdhdGUpIHJldHVybiB0cnVlXG4gICAgICByZXR1cm4gIXRoaXMubmVnYXRlXG4gICAgfVxuICB9XG5cbiAgLy8gZGlkbid0IGdldCBhbnkgaGl0cy4gIHRoaXMgaXMgc3VjY2VzcyBpZiBpdCdzIGEgbmVnYXRpdmVcbiAgLy8gcGF0dGVybiwgZmFpbHVyZSBvdGhlcndpc2UuXG4gIGlmIChvcHRpb25zLmZsaXBOZWdhdGUpIHJldHVybiBmYWxzZVxuICByZXR1cm4gdGhpcy5uZWdhdGVcbn1cblxuLy8gc2V0IHBhcnRpYWwgdG8gdHJ1ZSB0byB0ZXN0IGlmLCBmb3IgZXhhbXBsZSxcbi8vIFwiL2EvYlwiIG1hdGNoZXMgdGhlIHN0YXJ0IG9mIFwiLyovYi8qL2RcIlxuLy8gUGFydGlhbCBtZWFucywgaWYgeW91IHJ1biBvdXQgb2YgZmlsZSBiZWZvcmUgeW91IHJ1blxuLy8gb3V0IG9mIHBhdHRlcm4sIHRoZW4gdGhhdCdzIGZpbmUsIGFzIGxvbmcgYXMgYWxsXG4vLyB0aGUgcGFydHMgbWF0Y2guXG5NaW5pbWF0Y2gucHJvdG90eXBlLm1hdGNoT25lID0gZnVuY3Rpb24gKGZpbGUsIHBhdHRlcm4sIHBhcnRpYWwpIHtcbiAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnNcblxuICB0aGlzLmRlYnVnKCdtYXRjaE9uZScsXG4gICAgeyAndGhpcyc6IHRoaXMsIGZpbGU6IGZpbGUsIHBhdHRlcm46IHBhdHRlcm4gfSlcblxuICB0aGlzLmRlYnVnKCdtYXRjaE9uZScsIGZpbGUubGVuZ3RoLCBwYXR0ZXJuLmxlbmd0aClcblxuICBmb3IgKHZhciBmaSA9IDAsXG4gICAgICBwaSA9IDAsXG4gICAgICBmbCA9IGZpbGUubGVuZ3RoLFxuICAgICAgcGwgPSBwYXR0ZXJuLmxlbmd0aFxuICAgICAgOyAoZmkgPCBmbCkgJiYgKHBpIDwgcGwpXG4gICAgICA7IGZpKyssIHBpKyspIHtcbiAgICB0aGlzLmRlYnVnKCdtYXRjaE9uZSBsb29wJylcbiAgICB2YXIgcCA9IHBhdHRlcm5bcGldXG4gICAgdmFyIGYgPSBmaWxlW2ZpXVxuXG4gICAgdGhpcy5kZWJ1ZyhwYXR0ZXJuLCBwLCBmKVxuXG4gICAgLy8gc2hvdWxkIGJlIGltcG9zc2libGUuXG4gICAgLy8gc29tZSBpbnZhbGlkIHJlZ2V4cCBzdHVmZiBpbiB0aGUgc2V0LlxuICAgIGlmIChwID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlXG5cbiAgICBpZiAocCA9PT0gR0xPQlNUQVIpIHtcbiAgICAgIHRoaXMuZGVidWcoJ0dMT0JTVEFSJywgW3BhdHRlcm4sIHAsIGZdKVxuXG4gICAgICAvLyBcIioqXCJcbiAgICAgIC8vIGEvKiovYi8qKi9jIHdvdWxkIG1hdGNoIHRoZSBmb2xsb3dpbmc6XG4gICAgICAvLyBhL2IveC95L3ovY1xuICAgICAgLy8gYS94L3kvei9iL2NcbiAgICAgIC8vIGEvYi94L2IveC9jXG4gICAgICAvLyBhL2IvY1xuICAgICAgLy8gVG8gZG8gdGhpcywgdGFrZSB0aGUgcmVzdCBvZiB0aGUgcGF0dGVybiBhZnRlclxuICAgICAgLy8gdGhlICoqLCBhbmQgc2VlIGlmIGl0IHdvdWxkIG1hdGNoIHRoZSBmaWxlIHJlbWFpbmRlci5cbiAgICAgIC8vIElmIHNvLCByZXR1cm4gc3VjY2Vzcy5cbiAgICAgIC8vIElmIG5vdCwgdGhlICoqIFwic3dhbGxvd3NcIiBhIHNlZ21lbnQsIGFuZCB0cnkgYWdhaW4uXG4gICAgICAvLyBUaGlzIGlzIHJlY3Vyc2l2ZWx5IGF3ZnVsLlxuICAgICAgLy9cbiAgICAgIC8vIGEvKiovYi8qKi9jIG1hdGNoaW5nIGEvYi94L3kvei9jXG4gICAgICAvLyAtIGEgbWF0Y2hlcyBhXG4gICAgICAvLyAtIGRvdWJsZXN0YXJcbiAgICAgIC8vICAgLSBtYXRjaE9uZShiL3gveS96L2MsIGIvKiovYylcbiAgICAgIC8vICAgICAtIGIgbWF0Y2hlcyBiXG4gICAgICAvLyAgICAgLSBkb3VibGVzdGFyXG4gICAgICAvLyAgICAgICAtIG1hdGNoT25lKHgveS96L2MsIGMpIC0+IG5vXG4gICAgICAvLyAgICAgICAtIG1hdGNoT25lKHkvei9jLCBjKSAtPiBub1xuICAgICAgLy8gICAgICAgLSBtYXRjaE9uZSh6L2MsIGMpIC0+IG5vXG4gICAgICAvLyAgICAgICAtIG1hdGNoT25lKGMsIGMpIHllcywgaGl0XG4gICAgICB2YXIgZnIgPSBmaVxuICAgICAgdmFyIHByID0gcGkgKyAxXG4gICAgICBpZiAocHIgPT09IHBsKSB7XG4gICAgICAgIHRoaXMuZGVidWcoJyoqIGF0IHRoZSBlbmQnKVxuICAgICAgICAvLyBhICoqIGF0IHRoZSBlbmQgd2lsbCBqdXN0IHN3YWxsb3cgdGhlIHJlc3QuXG4gICAgICAgIC8vIFdlIGhhdmUgZm91bmQgYSBtYXRjaC5cbiAgICAgICAgLy8gaG93ZXZlciwgaXQgd2lsbCBub3Qgc3dhbGxvdyAvLngsIHVubGVzc1xuICAgICAgICAvLyBvcHRpb25zLmRvdCBpcyBzZXQuXG4gICAgICAgIC8vIC4gYW5kIC4uIGFyZSAqbmV2ZXIqIG1hdGNoZWQgYnkgKiosIGZvciBleHBsb3NpdmVseVxuICAgICAgICAvLyBleHBvbmVudGlhbCByZWFzb25zLlxuICAgICAgICBmb3IgKDsgZmkgPCBmbDsgZmkrKykge1xuICAgICAgICAgIGlmIChmaWxlW2ZpXSA9PT0gJy4nIHx8IGZpbGVbZmldID09PSAnLi4nIHx8XG4gICAgICAgICAgICAoIW9wdGlvbnMuZG90ICYmIGZpbGVbZmldLmNoYXJBdCgwKSA9PT0gJy4nKSkgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH1cblxuICAgICAgLy8gb2ssIGxldCdzIHNlZSBpZiB3ZSBjYW4gc3dhbGxvdyB3aGF0ZXZlciB3ZSBjYW4uXG4gICAgICB3aGlsZSAoZnIgPCBmbCkge1xuICAgICAgICB2YXIgc3dhbGxvd2VlID0gZmlsZVtmcl1cblxuICAgICAgICB0aGlzLmRlYnVnKCdcXG5nbG9ic3RhciB3aGlsZScsIGZpbGUsIGZyLCBwYXR0ZXJuLCBwciwgc3dhbGxvd2VlKVxuXG4gICAgICAgIC8vIFhYWCByZW1vdmUgdGhpcyBzbGljZS4gIEp1c3QgcGFzcyB0aGUgc3RhcnQgaW5kZXguXG4gICAgICAgIGlmICh0aGlzLm1hdGNoT25lKGZpbGUuc2xpY2UoZnIpLCBwYXR0ZXJuLnNsaWNlKHByKSwgcGFydGlhbCkpIHtcbiAgICAgICAgICB0aGlzLmRlYnVnKCdnbG9ic3RhciBmb3VuZCBtYXRjaCEnLCBmciwgZmwsIHN3YWxsb3dlZSlcbiAgICAgICAgICAvLyBmb3VuZCBhIG1hdGNoLlxuICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gY2FuJ3Qgc3dhbGxvdyBcIi5cIiBvciBcIi4uXCIgZXZlci5cbiAgICAgICAgICAvLyBjYW4gb25seSBzd2FsbG93IFwiLmZvb1wiIHdoZW4gZXhwbGljaXRseSBhc2tlZC5cbiAgICAgICAgICBpZiAoc3dhbGxvd2VlID09PSAnLicgfHwgc3dhbGxvd2VlID09PSAnLi4nIHx8XG4gICAgICAgICAgICAoIW9wdGlvbnMuZG90ICYmIHN3YWxsb3dlZS5jaGFyQXQoMCkgPT09ICcuJykpIHtcbiAgICAgICAgICAgIHRoaXMuZGVidWcoJ2RvdCBkZXRlY3RlZCEnLCBmaWxlLCBmciwgcGF0dGVybiwgcHIpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vICoqIHN3YWxsb3dzIGEgc2VnbWVudCwgYW5kIGNvbnRpbnVlLlxuICAgICAgICAgIHRoaXMuZGVidWcoJ2dsb2JzdGFyIHN3YWxsb3cgYSBzZWdtZW50LCBhbmQgY29udGludWUnKVxuICAgICAgICAgIGZyKytcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBubyBtYXRjaCB3YXMgZm91bmQuXG4gICAgICAvLyBIb3dldmVyLCBpbiBwYXJ0aWFsIG1vZGUsIHdlIGNhbid0IHNheSB0aGlzIGlzIG5lY2Vzc2FyaWx5IG92ZXIuXG4gICAgICAvLyBJZiB0aGVyZSdzIG1vcmUgKnBhdHRlcm4qIGxlZnQsIHRoZW5cbiAgICAgIGlmIChwYXJ0aWFsKSB7XG4gICAgICAgIC8vIHJhbiBvdXQgb2YgZmlsZVxuICAgICAgICB0aGlzLmRlYnVnKCdcXG4+Pj4gbm8gbWF0Y2gsIHBhcnRpYWw/JywgZmlsZSwgZnIsIHBhdHRlcm4sIHByKVxuICAgICAgICBpZiAoZnIgPT09IGZsKSByZXR1cm4gdHJ1ZVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgLy8gc29tZXRoaW5nIG90aGVyIHRoYW4gKipcbiAgICAvLyBub24tbWFnaWMgcGF0dGVybnMganVzdCBoYXZlIHRvIG1hdGNoIGV4YWN0bHlcbiAgICAvLyBwYXR0ZXJucyB3aXRoIG1hZ2ljIGhhdmUgYmVlbiB0dXJuZWQgaW50byByZWdleHBzLlxuICAgIHZhciBoaXRcbiAgICBpZiAodHlwZW9mIHAgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZiAob3B0aW9ucy5ub2Nhc2UpIHtcbiAgICAgICAgaGl0ID0gZi50b0xvd2VyQ2FzZSgpID09PSBwLnRvTG93ZXJDYXNlKClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhpdCA9IGYgPT09IHBcbiAgICAgIH1cbiAgICAgIHRoaXMuZGVidWcoJ3N0cmluZyBtYXRjaCcsIHAsIGYsIGhpdClcbiAgICB9IGVsc2Uge1xuICAgICAgaGl0ID0gZi5tYXRjaChwKVxuICAgICAgdGhpcy5kZWJ1ZygncGF0dGVybiBtYXRjaCcsIHAsIGYsIGhpdClcbiAgICB9XG5cbiAgICBpZiAoIWhpdCkgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBOb3RlOiBlbmRpbmcgaW4gLyBtZWFucyB0aGF0IHdlJ2xsIGdldCBhIGZpbmFsIFwiXCJcbiAgLy8gYXQgdGhlIGVuZCBvZiB0aGUgcGF0dGVybi4gIFRoaXMgY2FuIG9ubHkgbWF0Y2ggYVxuICAvLyBjb3JyZXNwb25kaW5nIFwiXCIgYXQgdGhlIGVuZCBvZiB0aGUgZmlsZS5cbiAgLy8gSWYgdGhlIGZpbGUgZW5kcyBpbiAvLCB0aGVuIGl0IGNhbiBvbmx5IG1hdGNoIGFcbiAgLy8gYSBwYXR0ZXJuIHRoYXQgZW5kcyBpbiAvLCB1bmxlc3MgdGhlIHBhdHRlcm4ganVzdFxuICAvLyBkb2Vzbid0IGhhdmUgYW55IG1vcmUgZm9yIGl0LiBCdXQsIGEvYi8gc2hvdWxkICpub3QqXG4gIC8vIG1hdGNoIFwiYS9iLypcIiwgZXZlbiB0aG91Z2ggXCJcIiBtYXRjaGVzIGFnYWluc3QgdGhlXG4gIC8vIFteL10qPyBwYXR0ZXJuLCBleGNlcHQgaW4gcGFydGlhbCBtb2RlLCB3aGVyZSBpdCBtaWdodFxuICAvLyBzaW1wbHkgbm90IGJlIHJlYWNoZWQgeWV0LlxuICAvLyBIb3dldmVyLCBhL2IvIHNob3VsZCBzdGlsbCBzYXRpc2Z5IGEvKlxuXG4gIC8vIG5vdyBlaXRoZXIgd2UgZmVsbCBvZmYgdGhlIGVuZCBvZiB0aGUgcGF0dGVybiwgb3Igd2UncmUgZG9uZS5cbiAgaWYgKGZpID09PSBmbCAmJiBwaSA9PT0gcGwpIHtcbiAgICAvLyByYW4gb3V0IG9mIHBhdHRlcm4gYW5kIGZpbGVuYW1lIGF0IHRoZSBzYW1lIHRpbWUuXG4gICAgLy8gYW4gZXhhY3QgaGl0IVxuICAgIHJldHVybiB0cnVlXG4gIH0gZWxzZSBpZiAoZmkgPT09IGZsKSB7XG4gICAgLy8gcmFuIG91dCBvZiBmaWxlLCBidXQgc3RpbGwgaGFkIHBhdHRlcm4gbGVmdC5cbiAgICAvLyB0aGlzIGlzIG9rIGlmIHdlJ3JlIGRvaW5nIHRoZSBtYXRjaCBhcyBwYXJ0IG9mXG4gICAgLy8gYSBnbG9iIGZzIHRyYXZlcnNhbC5cbiAgICByZXR1cm4gcGFydGlhbFxuICB9IGVsc2UgaWYgKHBpID09PSBwbCkge1xuICAgIC8vIHJhbiBvdXQgb2YgcGF0dGVybiwgc3RpbGwgaGF2ZSBmaWxlIGxlZnQuXG4gICAgLy8gdGhpcyBpcyBvbmx5IGFjY2VwdGFibGUgaWYgd2UncmUgb24gdGhlIHZlcnkgbGFzdFxuICAgIC8vIGVtcHR5IHNlZ21lbnQgb2YgYSBmaWxlIHdpdGggYSB0cmFpbGluZyBzbGFzaC5cbiAgICAvLyBhLyogc2hvdWxkIG1hdGNoIGEvYi9cbiAgICB2YXIgZW1wdHlGaWxlRW5kID0gKGZpID09PSBmbCAtIDEpICYmIChmaWxlW2ZpXSA9PT0gJycpXG4gICAgcmV0dXJuIGVtcHR5RmlsZUVuZFxuICB9XG5cbiAgLy8gc2hvdWxkIGJlIHVucmVhY2hhYmxlLlxuICB0aHJvdyBuZXcgRXJyb3IoJ3d0Zj8nKVxufVxuXG4vLyByZXBsYWNlIHN0dWZmIGxpa2UgXFwqIHdpdGggKlxuZnVuY3Rpb24gZ2xvYlVuZXNjYXBlIChzKSB7XG4gIHJldHVybiBzLnJlcGxhY2UoL1xcXFwoLikvZywgJyQxJylcbn1cblxuZnVuY3Rpb24gcmVnRXhwRXNjYXBlIChzKSB7XG4gIHJldHVybiBzLnJlcGxhY2UoL1stW1xcXXt9KCkqKz8uLFxcXFxeJHwjXFxzXS9nLCAnXFxcXCQmJylcbn1cbiJdfQ==