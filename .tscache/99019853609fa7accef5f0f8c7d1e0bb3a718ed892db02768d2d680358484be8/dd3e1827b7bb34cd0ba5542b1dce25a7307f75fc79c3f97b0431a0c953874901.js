var common = require('./common');
var _cd = require('./cd');
var path = require('path');
common.register('dirs', _dirs, {
    wrapOutput: false,
});
common.register('pushd', _pushd, {
    wrapOutput: false,
});
common.register('popd', _popd, {
    wrapOutput: false,
});
// Pushd/popd/dirs internals
var _dirStack = [];
function _isStackIndex(index) {
    return (/^[\-+]\d+$/).test(index);
}
function _parseStackIndex(index) {
    if (_isStackIndex(index)) {
        if (Math.abs(index) < _dirStack.length + 1) {
            return (/^-/).test(index) ? Number(index) - 1 : Number(index);
        }
        common.error(index + ': directory stack index out of range');
    }
    else {
        common.error(index + ': invalid number');
    }
}
function _actualDirStack() {
    return [process.cwd()].concat(_dirStack);
}
//@
//@ ### pushd([options,] [dir | '-N' | '+N'])
//@
//@ Available options:
//@
//@ + `-n`: Suppresses the normal change of directory when adding directories to the stack, so that only the stack is manipulated.
//@
//@ Arguments:
//@
//@ + `dir`: Makes the current working directory be the top of the stack, and then executes the equivalent of `cd dir`.
//@ + `+N`: Brings the Nth directory (counting from the left of the list printed by dirs, starting with zero) to the top of the list by rotating the stack.
//@ + `-N`: Brings the Nth directory (counting from the right of the list printed by dirs, starting with zero) to the top of the list by rotating the stack.
//@
//@ Examples:
//@
//@ ```javascript
//@ // process.cwd() === '/usr'
//@ pushd('/etc'); // Returns /etc /usr
//@ pushd('+1');   // Returns /usr /etc
//@ ```
//@
//@ Save the current directory on the top of the directory stack and then cd to `dir`. With no arguments, pushd exchanges the top two directories. Returns an array of paths in the stack.
function _pushd(options, dir) {
    if (_isStackIndex(options)) {
        dir = options;
        options = '';
    }
    options = common.parseOptions(options, {
        'n': 'no-cd',
    });
    var dirs = _actualDirStack();
    if (dir === '+0') {
        return dirs; // +0 is a noop
    }
    else if (!dir) {
        if (dirs.length > 1) {
            dirs = dirs.splice(1, 1).concat(dirs);
        }
        else {
            return common.error('no other directory');
        }
    }
    else if (_isStackIndex(dir)) {
        var n = _parseStackIndex(dir);
        dirs = dirs.slice(n).concat(dirs.slice(0, n));
    }
    else {
        if (options['no-cd']) {
            dirs.splice(1, 0, dir);
        }
        else {
            dirs.unshift(dir);
        }
    }
    if (options['no-cd']) {
        dirs = dirs.slice(1);
    }
    else {
        dir = path.resolve(dirs.shift());
        _cd('', dir);
    }
    _dirStack = dirs;
    return _dirs('');
}
exports.pushd = _pushd;
//@
//@ ### popd([options,] ['-N' | '+N'])
//@
//@ Available options:
//@
//@ + `-n`: Suppresses the normal change of directory when removing directories from the stack, so that only the stack is manipulated.
//@
//@ Arguments:
//@
//@ + `+N`: Removes the Nth directory (counting from the left of the list printed by dirs), starting with zero.
//@ + `-N`: Removes the Nth directory (counting from the right of the list printed by dirs), starting with zero.
//@
//@ Examples:
//@
//@ ```javascript
//@ echo(process.cwd()); // '/usr'
//@ pushd('/etc');       // '/etc /usr'
//@ echo(process.cwd()); // '/etc'
//@ popd();              // '/usr'
//@ echo(process.cwd()); // '/usr'
//@ ```
//@
//@ When no arguments are given, popd removes the top directory from the stack and performs a cd to the new top directory. The elements are numbered from 0 starting at the first directory listed with dirs; i.e., popd is equivalent to popd +0. Returns an array of paths in the stack.
function _popd(options, index) {
    if (_isStackIndex(options)) {
        index = options;
        options = '';
    }
    options = common.parseOptions(options, {
        'n': 'no-cd',
    });
    if (!_dirStack.length) {
        return common.error('directory stack empty');
    }
    index = _parseStackIndex(index || '+0');
    if (options['no-cd'] || index > 0 || _dirStack.length + index === 0) {
        index = index > 0 ? index - 1 : index;
        _dirStack.splice(index, 1);
    }
    else {
        var dir = path.resolve(_dirStack.shift());
        _cd('', dir);
    }
    return _dirs('');
}
exports.popd = _popd;
//@
//@ ### dirs([options | '+N' | '-N'])
//@
//@ Available options:
//@
//@ + `-c`: Clears the directory stack by deleting all of the elements.
//@
//@ Arguments:
//@
//@ + `+N`: Displays the Nth directory (counting from the left of the list printed by dirs when invoked without options), starting with zero.
//@ + `-N`: Displays the Nth directory (counting from the right of the list printed by dirs when invoked without options), starting with zero.
//@
//@ Display the list of currently remembered directories. Returns an array of paths in the stack, or a single path if +N or -N was specified.
//@
//@ See also: pushd, popd
function _dirs(options, index) {
    if (_isStackIndex(options)) {
        index = options;
        options = '';
    }
    options = common.parseOptions(options, {
        'c': 'clear',
    });
    if (options.clear) {
        _dirStack = [];
        return _dirStack;
    }
    var stack = _actualDirStack();
    if (index) {
        index = _parseStackIndex(index);
        if (index < 0) {
            index = stack.length + index;
        }
        common.log(stack[index]);
        return stack[index];
    }
    common.log(stack.join(' '));
    return stack;
}
exports.dirs = _dirs;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXGRpcnMuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xcc2hlbGxqc1xcc3JjXFxkaXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqQyxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDMUIsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRTNCLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRTtJQUM3QixVQUFVLEVBQUUsS0FBSztDQUNsQixDQUFDLENBQUM7QUFDSCxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUU7SUFDL0IsVUFBVSxFQUFFLEtBQUs7Q0FDbEIsQ0FBQyxDQUFDO0FBQ0gsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFO0lBQzdCLFVBQVUsRUFBRSxLQUFLO0NBQ2xCLENBQUMsQ0FBQztBQUVILDRCQUE0QjtBQUM1QixJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFFbkIsdUJBQXVCLEtBQUs7SUFDMUIsTUFBTSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3BDLENBQUM7QUFFRCwwQkFBMEIsS0FBSztJQUM3QixFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLEVBQUUs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LEtBQUssR0FBRyxPQUFPLENBQUM7UUFDaEIsT0FBTyxHQUFHLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFFRCxPQUFPLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUU7UUFDckMsR0FBRyxFQUFFLE9BQU87S0FDYixDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNsQixTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ2YsTUFBTSxDQUFDLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBRUQsSUFBSSxLQUFLLEdBQUcsZUFBZSxFQUFFLENBQUM7SUFFOUIsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNWLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVoQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNkLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUMvQixDQUFDO1FBRUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6QixNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUU1QixNQUFNLENBQUMsS0FBSyxDQUFDO0FBQ2YsQ0FBQztBQUNELE9BQU8sQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGNvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG52YXIgX2NkID0gcmVxdWlyZSgnLi9jZCcpO1xudmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbmNvbW1vbi5yZWdpc3RlcignZGlycycsIF9kaXJzLCB7XG4gIHdyYXBPdXRwdXQ6IGZhbHNlLFxufSk7XG5jb21tb24ucmVnaXN0ZXIoJ3B1c2hkJywgX3B1c2hkLCB7XG4gIHdyYXBPdXRwdXQ6IGZhbHNlLFxufSk7XG5jb21tb24ucmVnaXN0ZXIoJ3BvcGQnLCBfcG9wZCwge1xuICB3cmFwT3V0cHV0OiBmYWxzZSxcbn0pO1xuXG4vLyBQdXNoZC9wb3BkL2RpcnMgaW50ZXJuYWxzXG52YXIgX2RpclN0YWNrID0gW107XG5cbmZ1bmN0aW9uIF9pc1N0YWNrSW5kZXgoaW5kZXgpIHtcbiAgcmV0dXJuICgvXltcXC0rXVxcZCskLykudGVzdChpbmRleCk7XG59XG5cbmZ1bmN0aW9uIF9wYXJzZVN0YWNrSW5kZXgoaW5kZXgpIHtcbiAgaWYgKF9pc1N0YWNrSW5kZXgoaW5kZXgpKSB7XG4gICAgaWYgKE1hdGguYWJzKGluZGV4KSA8IF9kaXJTdGFjay5sZW5ndGggKyAxKSB7IC8vICsxIGZvciBwd2RcbiAgICAgIHJldHVybiAoL14tLykudGVzdChpbmRleCkgPyBOdW1iZXIoaW5kZXgpIC0gMSA6IE51bWJlcihpbmRleCk7XG4gICAgfVxuICAgIGNvbW1vbi5lcnJvcihpbmRleCArICc6IGRpcmVjdG9yeSBzdGFjayBpbmRleCBvdXQgb2YgcmFuZ2UnKTtcbiAgfSBlbHNlIHtcbiAgICBjb21tb24uZXJyb3IoaW5kZXggKyAnOiBpbnZhbGlkIG51bWJlcicpO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9hY3R1YWxEaXJTdGFjaygpIHtcbiAgcmV0dXJuIFtwcm9jZXNzLmN3ZCgpXS5jb25jYXQoX2RpclN0YWNrKTtcbn1cblxuLy9AXG4vL0AgIyMjIHB1c2hkKFtvcHRpb25zLF0gW2RpciB8ICctTicgfCAnK04nXSlcbi8vQFxuLy9AIEF2YWlsYWJsZSBvcHRpb25zOlxuLy9AXG4vL0AgKyBgLW5gOiBTdXBwcmVzc2VzIHRoZSBub3JtYWwgY2hhbmdlIG9mIGRpcmVjdG9yeSB3aGVuIGFkZGluZyBkaXJlY3RvcmllcyB0byB0aGUgc3RhY2ssIHNvIHRoYXQgb25seSB0aGUgc3RhY2sgaXMgbWFuaXB1bGF0ZWQuXG4vL0Bcbi8vQCBBcmd1bWVudHM6XG4vL0Bcbi8vQCArIGBkaXJgOiBNYWtlcyB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeSBiZSB0aGUgdG9wIG9mIHRoZSBzdGFjaywgYW5kIHRoZW4gZXhlY3V0ZXMgdGhlIGVxdWl2YWxlbnQgb2YgYGNkIGRpcmAuXG4vL0AgKyBgK05gOiBCcmluZ3MgdGhlIE50aCBkaXJlY3RvcnkgKGNvdW50aW5nIGZyb20gdGhlIGxlZnQgb2YgdGhlIGxpc3QgcHJpbnRlZCBieSBkaXJzLCBzdGFydGluZyB3aXRoIHplcm8pIHRvIHRoZSB0b3Agb2YgdGhlIGxpc3QgYnkgcm90YXRpbmcgdGhlIHN0YWNrLlxuLy9AICsgYC1OYDogQnJpbmdzIHRoZSBOdGggZGlyZWN0b3J5IChjb3VudGluZyBmcm9tIHRoZSByaWdodCBvZiB0aGUgbGlzdCBwcmludGVkIGJ5IGRpcnMsIHN0YXJ0aW5nIHdpdGggemVybykgdG8gdGhlIHRvcCBvZiB0aGUgbGlzdCBieSByb3RhdGluZyB0aGUgc3RhY2suXG4vL0Bcbi8vQCBFeGFtcGxlczpcbi8vQFxuLy9AIGBgYGphdmFzY3JpcHRcbi8vQCAvLyBwcm9jZXNzLmN3ZCgpID09PSAnL3Vzcidcbi8vQCBwdXNoZCgnL2V0YycpOyAvLyBSZXR1cm5zIC9ldGMgL3VzclxuLy9AIHB1c2hkKCcrMScpOyAgIC8vIFJldHVybnMgL3VzciAvZXRjXG4vL0AgYGBgXG4vL0Bcbi8vQCBTYXZlIHRoZSBjdXJyZW50IGRpcmVjdG9yeSBvbiB0aGUgdG9wIG9mIHRoZSBkaXJlY3Rvcnkgc3RhY2sgYW5kIHRoZW4gY2QgdG8gYGRpcmAuIFdpdGggbm8gYXJndW1lbnRzLCBwdXNoZCBleGNoYW5nZXMgdGhlIHRvcCB0d28gZGlyZWN0b3JpZXMuIFJldHVybnMgYW4gYXJyYXkgb2YgcGF0aHMgaW4gdGhlIHN0YWNrLlxuZnVuY3Rpb24gX3B1c2hkKG9wdGlvbnMsIGRpcikge1xuICBpZiAoX2lzU3RhY2tJbmRleChvcHRpb25zKSkge1xuICAgIGRpciA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9ICcnO1xuICB9XG5cbiAgb3B0aW9ucyA9IGNvbW1vbi5wYXJzZU9wdGlvbnMob3B0aW9ucywge1xuICAgICduJzogJ25vLWNkJyxcbiAgfSk7XG5cbiAgdmFyIGRpcnMgPSBfYWN0dWFsRGlyU3RhY2soKTtcblxuICBpZiAoZGlyID09PSAnKzAnKSB7XG4gICAgcmV0dXJuIGRpcnM7IC8vICswIGlzIGEgbm9vcFxuICB9IGVsc2UgaWYgKCFkaXIpIHtcbiAgICBpZiAoZGlycy5sZW5ndGggPiAxKSB7XG4gICAgICBkaXJzID0gZGlycy5zcGxpY2UoMSwgMSkuY29uY2F0KGRpcnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY29tbW9uLmVycm9yKCdubyBvdGhlciBkaXJlY3RvcnknKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoX2lzU3RhY2tJbmRleChkaXIpKSB7XG4gICAgdmFyIG4gPSBfcGFyc2VTdGFja0luZGV4KGRpcik7XG4gICAgZGlycyA9IGRpcnMuc2xpY2UobikuY29uY2F0KGRpcnMuc2xpY2UoMCwgbikpO1xuICB9IGVsc2Uge1xuICAgIGlmIChvcHRpb25zWyduby1jZCddKSB7XG4gICAgICBkaXJzLnNwbGljZSgxLCAwLCBkaXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkaXJzLnVuc2hpZnQoZGlyKTtcbiAgICB9XG4gIH1cblxuICBpZiAob3B0aW9uc1snbm8tY2QnXSkge1xuICAgIGRpcnMgPSBkaXJzLnNsaWNlKDEpO1xuICB9IGVsc2Uge1xuICAgIGRpciA9IHBhdGgucmVzb2x2ZShkaXJzLnNoaWZ0KCkpO1xuICAgIF9jZCgnJywgZGlyKTtcbiAgfVxuXG4gIF9kaXJTdGFjayA9IGRpcnM7XG4gIHJldHVybiBfZGlycygnJyk7XG59XG5leHBvcnRzLnB1c2hkID0gX3B1c2hkO1xuXG4vL0Bcbi8vQCAjIyMgcG9wZChbb3B0aW9ucyxdIFsnLU4nIHwgJytOJ10pXG4vL0Bcbi8vQCBBdmFpbGFibGUgb3B0aW9uczpcbi8vQFxuLy9AICsgYC1uYDogU3VwcHJlc3NlcyB0aGUgbm9ybWFsIGNoYW5nZSBvZiBkaXJlY3Rvcnkgd2hlbiByZW1vdmluZyBkaXJlY3RvcmllcyBmcm9tIHRoZSBzdGFjaywgc28gdGhhdCBvbmx5IHRoZSBzdGFjayBpcyBtYW5pcHVsYXRlZC5cbi8vQFxuLy9AIEFyZ3VtZW50czpcbi8vQFxuLy9AICsgYCtOYDogUmVtb3ZlcyB0aGUgTnRoIGRpcmVjdG9yeSAoY291bnRpbmcgZnJvbSB0aGUgbGVmdCBvZiB0aGUgbGlzdCBwcmludGVkIGJ5IGRpcnMpLCBzdGFydGluZyB3aXRoIHplcm8uXG4vL0AgKyBgLU5gOiBSZW1vdmVzIHRoZSBOdGggZGlyZWN0b3J5IChjb3VudGluZyBmcm9tIHRoZSByaWdodCBvZiB0aGUgbGlzdCBwcmludGVkIGJ5IGRpcnMpLCBzdGFydGluZyB3aXRoIHplcm8uXG4vL0Bcbi8vQCBFeGFtcGxlczpcbi8vQFxuLy9AIGBgYGphdmFzY3JpcHRcbi8vQCBlY2hvKHByb2Nlc3MuY3dkKCkpOyAvLyAnL3Vzcidcbi8vQCBwdXNoZCgnL2V0YycpOyAgICAgICAvLyAnL2V0YyAvdXNyJ1xuLy9AIGVjaG8ocHJvY2Vzcy5jd2QoKSk7IC8vICcvZXRjJ1xuLy9AIHBvcGQoKTsgICAgICAgICAgICAgIC8vICcvdXNyJ1xuLy9AIGVjaG8ocHJvY2Vzcy5jd2QoKSk7IC8vICcvdXNyJ1xuLy9AIGBgYFxuLy9AXG4vL0AgV2hlbiBubyBhcmd1bWVudHMgYXJlIGdpdmVuLCBwb3BkIHJlbW92ZXMgdGhlIHRvcCBkaXJlY3RvcnkgZnJvbSB0aGUgc3RhY2sgYW5kIHBlcmZvcm1zIGEgY2QgdG8gdGhlIG5ldyB0b3AgZGlyZWN0b3J5LiBUaGUgZWxlbWVudHMgYXJlIG51bWJlcmVkIGZyb20gMCBzdGFydGluZyBhdCB0aGUgZmlyc3QgZGlyZWN0b3J5IGxpc3RlZCB3aXRoIGRpcnM7IGkuZS4sIHBvcGQgaXMgZXF1aXZhbGVudCB0byBwb3BkICswLiBSZXR1cm5zIGFuIGFycmF5IG9mIHBhdGhzIGluIHRoZSBzdGFjay5cbmZ1bmN0aW9uIF9wb3BkKG9wdGlvbnMsIGluZGV4KSB7XG4gIGlmIChfaXNTdGFja0luZGV4KG9wdGlvbnMpKSB7XG4gICAgaW5kZXggPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSAnJztcbiAgfVxuXG4gIG9wdGlvbnMgPSBjb21tb24ucGFyc2VPcHRpb25zKG9wdGlvbnMsIHtcbiAgICAnbic6ICduby1jZCcsXG4gIH0pO1xuXG4gIGlmICghX2RpclN0YWNrLmxlbmd0aCkge1xuICAgIHJldHVybiBjb21tb24uZXJyb3IoJ2RpcmVjdG9yeSBzdGFjayBlbXB0eScpO1xuICB9XG5cbiAgaW5kZXggPSBfcGFyc2VTdGFja0luZGV4KGluZGV4IHx8ICcrMCcpO1xuXG4gIGlmIChvcHRpb25zWyduby1jZCddIHx8IGluZGV4ID4gMCB8fCBfZGlyU3RhY2subGVuZ3RoICsgaW5kZXggPT09IDApIHtcbiAgICBpbmRleCA9IGluZGV4ID4gMCA/IGluZGV4IC0gMSA6IGluZGV4O1xuICAgIF9kaXJTdGFjay5zcGxpY2UoaW5kZXgsIDEpO1xuICB9IGVsc2Uge1xuICAgIHZhciBkaXIgPSBwYXRoLnJlc29sdmUoX2RpclN0YWNrLnNoaWZ0KCkpO1xuICAgIF9jZCgnJywgZGlyKTtcbiAgfVxuXG4gIHJldHVybiBfZGlycygnJyk7XG59XG5leHBvcnRzLnBvcGQgPSBfcG9wZDtcblxuLy9AXG4vL0AgIyMjIGRpcnMoW29wdGlvbnMgfCAnK04nIHwgJy1OJ10pXG4vL0Bcbi8vQCBBdmFpbGFibGUgb3B0aW9uczpcbi8vQFxuLy9AICsgYC1jYDogQ2xlYXJzIHRoZSBkaXJlY3Rvcnkgc3RhY2sgYnkgZGVsZXRpbmcgYWxsIG9mIHRoZSBlbGVtZW50cy5cbi8vQFxuLy9AIEFyZ3VtZW50czpcbi8vQFxuLy9AICsgYCtOYDogRGlzcGxheXMgdGhlIE50aCBkaXJlY3RvcnkgKGNvdW50aW5nIGZyb20gdGhlIGxlZnQgb2YgdGhlIGxpc3QgcHJpbnRlZCBieSBkaXJzIHdoZW4gaW52b2tlZCB3aXRob3V0IG9wdGlvbnMpLCBzdGFydGluZyB3aXRoIHplcm8uXG4vL0AgKyBgLU5gOiBEaXNwbGF5cyB0aGUgTnRoIGRpcmVjdG9yeSAoY291bnRpbmcgZnJvbSB0aGUgcmlnaHQgb2YgdGhlIGxpc3QgcHJpbnRlZCBieSBkaXJzIHdoZW4gaW52b2tlZCB3aXRob3V0IG9wdGlvbnMpLCBzdGFydGluZyB3aXRoIHplcm8uXG4vL0Bcbi8vQCBEaXNwbGF5IHRoZSBsaXN0IG9mIGN1cnJlbnRseSByZW1lbWJlcmVkIGRpcmVjdG9yaWVzLiBSZXR1cm5zIGFuIGFycmF5IG9mIHBhdGhzIGluIHRoZSBzdGFjaywgb3IgYSBzaW5nbGUgcGF0aCBpZiArTiBvciAtTiB3YXMgc3BlY2lmaWVkLlxuLy9AXG4vL0AgU2VlIGFsc286IHB1c2hkLCBwb3BkXG5mdW5jdGlvbiBfZGlycyhvcHRpb25zLCBpbmRleCkge1xuICBpZiAoX2lzU3RhY2tJbmRleChvcHRpb25zKSkge1xuICAgIGluZGV4ID0gb3B0aW9ucztcbiAgICBvcHRpb25zID0gJyc7XG4gIH1cblxuICBvcHRpb25zID0gY29tbW9uLnBhcnNlT3B0aW9ucyhvcHRpb25zLCB7XG4gICAgJ2MnOiAnY2xlYXInLFxuICB9KTtcblxuICBpZiAob3B0aW9ucy5jbGVhcikge1xuICAgIF9kaXJTdGFjayA9IFtdO1xuICAgIHJldHVybiBfZGlyU3RhY2s7XG4gIH1cblxuICB2YXIgc3RhY2sgPSBfYWN0dWFsRGlyU3RhY2soKTtcblxuICBpZiAoaW5kZXgpIHtcbiAgICBpbmRleCA9IF9wYXJzZVN0YWNrSW5kZXgoaW5kZXgpO1xuXG4gICAgaWYgKGluZGV4IDwgMCkge1xuICAgICAgaW5kZXggPSBzdGFjay5sZW5ndGggKyBpbmRleDtcbiAgICB9XG5cbiAgICBjb21tb24ubG9nKHN0YWNrW2luZGV4XSk7XG4gICAgcmV0dXJuIHN0YWNrW2luZGV4XTtcbiAgfVxuXG4gIGNvbW1vbi5sb2coc3RhY2suam9pbignICcpKTtcblxuICByZXR1cm4gc3RhY2s7XG59XG5leHBvcnRzLmRpcnMgPSBfZGlycztcbiJdfQ==