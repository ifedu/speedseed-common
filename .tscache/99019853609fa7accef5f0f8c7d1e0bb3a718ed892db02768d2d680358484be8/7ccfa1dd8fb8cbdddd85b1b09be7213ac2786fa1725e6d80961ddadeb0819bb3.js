var fs = require('fs');
var path = require('path');
var common = require('./common');
common.register('cp', _cp, {
    cmdOptions: {
        'f': '!no_force',
        'n': 'no_force',
        'u': 'update',
        'R': 'recursive',
        'r': 'recursive',
        'L': 'followsymlink',
        'P': 'noFollowsymlink',
    },
    wrapOutput: false,
});
// Buffered file copy, synchronous
// (Using readFileSync() + writeFileSync() could easily cause a memory overflow
//  with large files)
function copyFileSync(srcFile, destFile, options) {
    if (!fs.existsSync(srcFile)) {
        common.error('copyFileSync: no such file or directory: ' + srcFile);
    }
    var isWindows = process.platform === 'win32';
    // Check the mtimes of the files if the '-u' flag is provided
    try {
        if (options.update && fs.statSync(srcFile).mtime < fs.statSync(destFile).mtime) {
            return;
        }
    }
    catch (e) {
        // If we're here, destFile probably doesn't exist, so just do a normal copy
    }
    if (fs.lstatSync(srcFile).isSymbolicLink() && !options.followsymlink) {
        try {
            fs.lstatSync(destFile);
            common.unlinkSync(destFile); // re-link it
        }
        catch (e) {
            // it doesn't exist, so no work needs to be done
        }
        var symlinkFull = fs.readlinkSync(srcFile);
        fs.symlinkSync(symlinkFull, destFile, isWindows ? 'junction' : null);
    }
    else {
        var buf = common.buffer();
        var bufLength = buf.length;
        var bytesRead = bufLength;
        var pos = 0;
        var fdr = null;
        var fdw = null;
        try {
            fdr = fs.openSync(srcFile, 'r');
        }
        catch (e) {
            /* istanbul ignore next */
            common.error('copyFileSync: could not read src file (' + srcFile + ')');
        }
        try {
            fdw = fs.openSync(destFile, 'w');
        }
        catch (e) {
            /* istanbul ignore next */
            common.error('copyFileSync: could not write to dest file (code=' + e.code + '):' + destFile);
        }
        while (bytesRead === bufLength) {
            bytesRead = fs.readSync(fdr, buf, 0, bufLength, pos);
            fs.writeSync(fdw, buf, 0, bytesRead);
            pos += bytesRead;
        }
        fs.closeSync(fdr);
        fs.closeSync(fdw);
        fs.chmodSync(destFile, fs.statSync(srcFile).mode);
    }
}
// Recursively copies 'sourceDir' into 'destDir'
// Adapted from https://github.com/ryanmcgrath/wrench-js
//
// Copyright (c) 2010 Ryan McGrath
// Copyright (c) 2012 Artur Adib
//
// Licensed under the MIT License
// http://www.opensource.org/licenses/mit-license.php
function cpdirSyncRecursive(sourceDir, destDir, currentDepth, opts) {
    if (!opts)
        opts = {};
    // Ensure there is not a run away recursive copy
    if (currentDepth >= common.config.maxdepth)
        return;
    currentDepth++;
    var isWindows = process.platform === 'win32';
    // Create the directory where all our junk is moving to; read the mode of the
    // source directory and mirror it
    try {
        var checkDir = fs.statSync(sourceDir);
        fs.mkdirSync(destDir, checkDir.mode);
    }
    catch (e) {
        // if the directory already exists, that's okay
        if (e.code !== 'EEXIST')
            throw e;
    }
    var files = fs.readdirSync(sourceDir);
    for (var i = 0; i < files.length; i++) {
        var srcFile = sourceDir + '/' + files[i];
        var destFile = destDir + '/' + files[i];
        var srcFileStat = fs.lstatSync(srcFile);
        var symlinkFull;
        if (opts.followsymlink) {
            if (cpcheckcycle(sourceDir, srcFile)) {
                // Cycle link found.
                console.error('Cycle link found.');
                symlinkFull = fs.readlinkSync(srcFile);
                fs.symlinkSync(symlinkFull, destFile, isWindows ? 'junction' : null);
                continue;
            }
        }
        if (srcFileStat.isDirectory()) {
            /* recursion this thing right on back. */
            cpdirSyncRecursive(srcFile, destFile, currentDepth, opts);
        }
        else if (srcFileStat.isSymbolicLink() && !opts.followsymlink) {
            symlinkFull = fs.readlinkSync(srcFile);
            try {
                fs.lstatSync(destFile);
                common.unlinkSync(destFile); // re-link it
            }
            catch (e) {
                // it doesn't exist, so no work needs to be done
            }
            fs.symlinkSync(symlinkFull, destFile, isWindows ? 'junction' : null);
        }
        else if (srcFileStat.isSymbolicLink() && opts.followsymlink) {
            srcFileStat = fs.statSync(srcFile);
            if (srcFileStat.isDirectory()) {
                cpdirSyncRecursive(srcFile, destFile, currentDepth, opts);
            }
            else {
                copyFileSync(srcFile, destFile, opts);
            }
        }
        else {
            /* At this point, we've hit a file actually worth copying... so copy it on over. */
            if (fs.existsSync(destFile) && opts.no_force) {
                common.log('skipping existing file: ' + files[i]);
            }
            else {
                copyFileSync(srcFile, destFile, opts);
            }
        }
    } // for files
} // cpdirSyncRecursive
// Checks if cureent file was created recently
function checkRecentCreated(sources, index) {
    var lookedSource = sources[index];
    return sources.slice(0, index).some(function (src) {
        return path.basename(src) === path.basename(lookedSource);
    });
}
function cpcheckcycle(sourceDir, srcFile) {
    var srcFileStat = fs.lstatSync(srcFile);
    if (srcFileStat.isSymbolicLink()) {
        // Do cycle check. For example:
        //   $ mkdir -p 1/2/3/4
        //   $ cd  1/2/3/4
        //   $ ln -s ../../3 link
        //   $ cd ../../../..
        //   $ cp -RL 1 copy
        var cyclecheck = fs.statSync(srcFile);
        if (cyclecheck.isDirectory()) {
            var sourcerealpath = fs.realpathSync(sourceDir);
            var symlinkrealpath = fs.realpathSync(srcFile);
            var re = new RegExp(symlinkrealpath);
            if (re.test(sourcerealpath)) {
                return true;
            }
        }
    }
    return false;
}
//@
//@ ### cp([options,] source [, source ...], dest)
//@ ### cp([options,] source_array, dest)
//@ Available options:
//@
//@ + `-f`: force (default behavior)
//@ + `-n`: no-clobber
//@ + `-u`: only copy if source is newer than dest
//@ + `-r`, `-R`: recursive
//@ + `-L`: follow symlinks
//@ + `-P`: don't follow symlinks
//@
//@ Examples:
//@
//@ ```javascript
//@ cp('file1', 'dir1');
//@ cp('-R', 'path/to/dir/', '~/newCopy/');
//@ cp('-Rf', '/tmp/*', '/usr/local/*', '/home/tmp');
//@ cp('-Rf', ['/tmp/*', '/usr/local/*'], '/home/tmp'); // same as above
//@ ```
//@
//@ Copies files.
function _cp(options, sources, dest) {
    // If we're missing -R, it actually implies -L (unless -P is explicit)
    if (options.followsymlink) {
        options.noFollowsymlink = false;
    }
    if (!options.recursive && !options.noFollowsymlink) {
        options.followsymlink = true;
    }
    // Get sources, dest
    if (arguments.length < 3) {
        common.error('missing <source> and/or <dest>');
    }
    else {
        sources = [].slice.call(arguments, 1, arguments.length - 1);
        dest = arguments[arguments.length - 1];
    }
    var destExists = fs.existsSync(dest);
    var destStat = destExists && fs.statSync(dest);
    // Dest is not existing dir, but multiple sources given
    if ((!destExists || !destStat.isDirectory()) && sources.length > 1) {
        common.error('dest is not a directory (too many sources)');
    }
    // Dest is an existing file, but -n is given
    if (destExists && destStat.isFile() && options.no_force) {
        return new common.ShellString('', '', 0);
    }
    sources.forEach(function (src, srcIndex) {
        if (!fs.existsSync(src)) {
            if (src === '')
                src = "''"; // if src was empty string, display empty string
            common.error('no such file or directory: ' + src, { continue: true });
            return; // skip file
        }
        var srcStat = fs.statSync(src);
        if (!options.noFollowsymlink && srcStat.isDirectory()) {
            if (!options.recursive) {
                // Non-Recursive
                common.error("omitting directory '" + src + "'", { continue: true });
            }
            else {
                // Recursive
                // 'cp /a/source dest' should create 'source' in 'dest'
                var newDest = (destStat && destStat.isDirectory()) ?
                    path.join(dest, path.basename(src)) :
                    dest;
                try {
                    fs.statSync(path.dirname(dest));
                    cpdirSyncRecursive(src, newDest, 0, { no_force: options.no_force, followsymlink: options.followsymlink });
                }
                catch (e) {
                    /* istanbul ignore next */
                    common.error("cannot create directory '" + dest + "': No such file or directory");
                }
            }
        }
        else {
            // If here, src is a file
            // When copying to '/path/dir':
            //    thisDest = '/path/dir/file1'
            var thisDest = dest;
            if (destStat && destStat.isDirectory()) {
                thisDest = path.normalize(dest + '/' + path.basename(src));
            }
            var thisDestExists = fs.existsSync(thisDest);
            if (thisDestExists && checkRecentCreated(sources, srcIndex)) {
                // cannot overwrite file created recently in current execution, but we want to continue copying other files
                if (!options.no_force) {
                    common.error("will not overwrite just-created '" + thisDest + "' with '" + src + "'", { continue: true });
                }
                return;
            }
            if (thisDestExists && options.no_force) {
                return; // skip file
            }
            if (path.relative(src, thisDest) === '') {
                // a file cannot be copied to itself, but we want to continue copying other files
                common.error("'" + thisDest + "' and '" + src + "' are the same file", { continue: true });
                return;
            }
            copyFileSync(src, thisDest, options);
        }
    }); // forEach(src)
    return new common.ShellString('', common.state.error, common.state.errorCode);
}
module.exports = _cp;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXGNwLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXHNoZWxsanNcXHNyY1xcY3AuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3ZCLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMzQixJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLFVBQVUsRUFBRTtRQUNWLEdBQUcsRUFBRSxXQUFXO1FBQ2hCLEdBQUcsRUFBRSxVQUFVO1FBQ2YsR0FBRyxFQUFFLFFBQVE7UUFDYixHQUFHLEVBQUUsV0FBVztRQUNoQixHQUFHLEVBQUUsV0FBVztRQUNoQixHQUFHLEVBQUUsZUFBZTtRQUNwQixHQUFHLEVBQUUsaUJBQWlCO0tBQ3ZCO0lBQ0QsVUFBVSxFQUFFLEtBQUs7Q0FDbEIsQ0FBQyxDQUFDO0FBRUgsa0NBQWtDO0FBQ2xDLCtFQUErRTtBQUMvRSxxQkFBcUI7QUFDckIsc0JBQXNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTztJQUM5QyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsMkNBQTJDLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUVELElB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QUFJLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEYsQ0FBQztBQUNELE1BQU0sQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIGNvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG5cbmNvbW1vbi5yZWdpc3RlcignY3AnLCBfY3AsIHtcbiAgY21kT3B0aW9uczoge1xuICAgICdmJzogJyFub19mb3JjZScsXG4gICAgJ24nOiAnbm9fZm9yY2UnLFxuICAgICd1JzogJ3VwZGF0ZScsXG4gICAgJ1InOiAncmVjdXJzaXZlJyxcbiAgICAncic6ICdyZWN1cnNpdmUnLFxuICAgICdMJzogJ2ZvbGxvd3N5bWxpbmsnLFxuICAgICdQJzogJ25vRm9sbG93c3ltbGluaycsXG4gIH0sXG4gIHdyYXBPdXRwdXQ6IGZhbHNlLFxufSk7XG5cbi8vIEJ1ZmZlcmVkIGZpbGUgY29weSwgc3luY2hyb25vdXNcbi8vIChVc2luZyByZWFkRmlsZVN5bmMoKSArIHdyaXRlRmlsZVN5bmMoKSBjb3VsZCBlYXNpbHkgY2F1c2UgYSBtZW1vcnkgb3ZlcmZsb3dcbi8vICB3aXRoIGxhcmdlIGZpbGVzKVxuZnVuY3Rpb24gY29weUZpbGVTeW5jKHNyY0ZpbGUsIGRlc3RGaWxlLCBvcHRpb25zKSB7XG4gIGlmICghZnMuZXhpc3RzU3luYyhzcmNGaWxlKSkge1xuICAgIGNvbW1vbi5lcnJvcignY29weUZpbGVTeW5jOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5OiAnICsgc3JjRmlsZSk7XG4gIH1cblxuICB2YXIgaXNXaW5kb3dzID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJztcblxuICAvLyBDaGVjayB0aGUgbXRpbWVzIG9mIHRoZSBmaWxlcyBpZiB0aGUgJy11JyBmbGFnIGlzIHByb3ZpZGVkXG4gIHRyeSB7XG4gICAgaWYgKG9wdGlvbnMudXBkYXRlICYmIGZzLnN0YXRTeW5jKHNyY0ZpbGUpLm10aW1lIDwgZnMuc3RhdFN5bmMoZGVzdEZpbGUpLm10aW1lKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gSWYgd2UncmUgaGVyZSwgZGVzdEZpbGUgcHJvYmFibHkgZG9lc24ndCBleGlzdCwgc28ganVzdCBkbyBhIG5vcm1hbCBjb3B5XG4gIH1cblxuICBpZiAoZnMubHN0YXRTeW5jKHNyY0ZpbGUpLmlzU3ltYm9saWNMaW5rKCkgJiYgIW9wdGlvbnMuZm9sbG93c3ltbGluaykge1xuICAgIHRyeSB7XG4gICAgICBmcy5sc3RhdFN5bmMoZGVzdEZpbGUpO1xuICAgICAgY29tbW9uLnVubGlua1N5bmMoZGVzdEZpbGUpOyAvLyByZS1saW5rIGl0XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gaXQgZG9lc24ndCBleGlzdCwgc28gbm8gd29yayBuZWVkcyB0byBiZSBkb25lXG4gICAgfVxuXG4gICAgdmFyIHN5bWxpbmtGdWxsID0gZnMucmVhZGxpbmtTeW5jKHNyY0ZpbGUpO1xuICAgIGZzLnN5bWxpbmtTeW5jKHN5bWxpbmtGdWxsLCBkZXN0RmlsZSwgaXNXaW5kb3dzID8gJ2p1bmN0aW9uJyA6IG51bGwpO1xuICB9IGVsc2Uge1xuICAgIHZhciBidWYgPSBjb21tb24uYnVmZmVyKCk7XG4gICAgdmFyIGJ1Zkxlbmd0aCA9IGJ1Zi5sZW5ndGg7XG4gICAgdmFyIGJ5dGVzUmVhZCA9IGJ1Zkxlbmd0aDtcbiAgICB2YXIgcG9zID0gMDtcbiAgICB2YXIgZmRyID0gbnVsbDtcbiAgICB2YXIgZmR3ID0gbnVsbDtcblxuICAgIHRyeSB7XG4gICAgICBmZHIgPSBmcy5vcGVuU3luYyhzcmNGaWxlLCAncicpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICBjb21tb24uZXJyb3IoJ2NvcHlGaWxlU3luYzogY291bGQgbm90IHJlYWQgc3JjIGZpbGUgKCcgKyBzcmNGaWxlICsgJyknKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgZmR3ID0gZnMub3BlblN5bmMoZGVzdEZpbGUsICd3Jyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICAgIGNvbW1vbi5lcnJvcignY29weUZpbGVTeW5jOiBjb3VsZCBub3Qgd3JpdGUgdG8gZGVzdCBmaWxlIChjb2RlPScgKyBlLmNvZGUgKyAnKTonICsgZGVzdEZpbGUpO1xuICAgIH1cblxuICAgIHdoaWxlIChieXRlc1JlYWQgPT09IGJ1Zkxlbmd0aCkge1xuICAgICAgYnl0ZXNSZWFkID0gZnMucmVhZFN5bmMoZmRyLCBidWYsIDAsIGJ1Zkxlbmd0aCwgcG9zKTtcbiAgICAgIGZzLndyaXRlU3luYyhmZHcsIGJ1ZiwgMCwgYnl0ZXNSZWFkKTtcbiAgICAgIHBvcyArPSBieXRlc1JlYWQ7XG4gICAgfVxuXG4gICAgZnMuY2xvc2VTeW5jKGZkcik7XG4gICAgZnMuY2xvc2VTeW5jKGZkdyk7XG5cbiAgICBmcy5jaG1vZFN5bmMoZGVzdEZpbGUsIGZzLnN0YXRTeW5jKHNyY0ZpbGUpLm1vZGUpO1xuICB9XG59XG5cbi8vIFJlY3Vyc2l2ZWx5IGNvcGllcyAnc291cmNlRGlyJyBpbnRvICdkZXN0RGlyJ1xuLy8gQWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9yeWFubWNncmF0aC93cmVuY2gtanNcbi8vXG4vLyBDb3B5cmlnaHQgKGMpIDIwMTAgUnlhbiBNY0dyYXRoXG4vLyBDb3B5cmlnaHQgKGMpIDIwMTIgQXJ0dXIgQWRpYlxuLy9cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZVxuLy8gaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcbmZ1bmN0aW9uIGNwZGlyU3luY1JlY3Vyc2l2ZShzb3VyY2VEaXIsIGRlc3REaXIsIGN1cnJlbnREZXB0aCwgb3B0cykge1xuICBpZiAoIW9wdHMpIG9wdHMgPSB7fTtcblxuICAvLyBFbnN1cmUgdGhlcmUgaXMgbm90IGEgcnVuIGF3YXkgcmVjdXJzaXZlIGNvcHlcbiAgaWYgKGN1cnJlbnREZXB0aCA+PSBjb21tb24uY29uZmlnLm1heGRlcHRoKSByZXR1cm47XG4gIGN1cnJlbnREZXB0aCsrO1xuXG4gIHZhciBpc1dpbmRvd3MgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInO1xuXG4gIC8vIENyZWF0ZSB0aGUgZGlyZWN0b3J5IHdoZXJlIGFsbCBvdXIganVuayBpcyBtb3ZpbmcgdG87IHJlYWQgdGhlIG1vZGUgb2YgdGhlXG4gIC8vIHNvdXJjZSBkaXJlY3RvcnkgYW5kIG1pcnJvciBpdFxuICB0cnkge1xuICAgIHZhciBjaGVja0RpciA9IGZzLnN0YXRTeW5jKHNvdXJjZURpcik7XG4gICAgZnMubWtkaXJTeW5jKGRlc3REaXIsIGNoZWNrRGlyLm1vZGUpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gaWYgdGhlIGRpcmVjdG9yeSBhbHJlYWR5IGV4aXN0cywgdGhhdCdzIG9rYXlcbiAgICBpZiAoZS5jb2RlICE9PSAnRUVYSVNUJykgdGhyb3cgZTtcbiAgfVxuXG4gIHZhciBmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKHNvdXJjZURpcik7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWxlcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBzcmNGaWxlID0gc291cmNlRGlyICsgJy8nICsgZmlsZXNbaV07XG4gICAgdmFyIGRlc3RGaWxlID0gZGVzdERpciArICcvJyArIGZpbGVzW2ldO1xuICAgIHZhciBzcmNGaWxlU3RhdCA9IGZzLmxzdGF0U3luYyhzcmNGaWxlKTtcblxuICAgIHZhciBzeW1saW5rRnVsbDtcbiAgICBpZiAob3B0cy5mb2xsb3dzeW1saW5rKSB7XG4gICAgICBpZiAoY3BjaGVja2N5Y2xlKHNvdXJjZURpciwgc3JjRmlsZSkpIHtcbiAgICAgICAgLy8gQ3ljbGUgbGluayBmb3VuZC5cbiAgICAgICAgY29uc29sZS5lcnJvcignQ3ljbGUgbGluayBmb3VuZC4nKTtcbiAgICAgICAgc3ltbGlua0Z1bGwgPSBmcy5yZWFkbGlua1N5bmMoc3JjRmlsZSk7XG4gICAgICAgIGZzLnN5bWxpbmtTeW5jKHN5bWxpbmtGdWxsLCBkZXN0RmlsZSwgaXNXaW5kb3dzID8gJ2p1bmN0aW9uJyA6IG51bGwpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHNyY0ZpbGVTdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIC8qIHJlY3Vyc2lvbiB0aGlzIHRoaW5nIHJpZ2h0IG9uIGJhY2suICovXG4gICAgICBjcGRpclN5bmNSZWN1cnNpdmUoc3JjRmlsZSwgZGVzdEZpbGUsIGN1cnJlbnREZXB0aCwgb3B0cyk7XG4gICAgfSBlbHNlIGlmIChzcmNGaWxlU3RhdC5pc1N5bWJvbGljTGluaygpICYmICFvcHRzLmZvbGxvd3N5bWxpbmspIHtcbiAgICAgIHN5bWxpbmtGdWxsID0gZnMucmVhZGxpbmtTeW5jKHNyY0ZpbGUpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZnMubHN0YXRTeW5jKGRlc3RGaWxlKTtcbiAgICAgICAgY29tbW9uLnVubGlua1N5bmMoZGVzdEZpbGUpOyAvLyByZS1saW5rIGl0XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIGl0IGRvZXNuJ3QgZXhpc3QsIHNvIG5vIHdvcmsgbmVlZHMgdG8gYmUgZG9uZVxuICAgICAgfVxuICAgICAgZnMuc3ltbGlua1N5bmMoc3ltbGlua0Z1bGwsIGRlc3RGaWxlLCBpc1dpbmRvd3MgPyAnanVuY3Rpb24nIDogbnVsbCk7XG4gICAgfSBlbHNlIGlmIChzcmNGaWxlU3RhdC5pc1N5bWJvbGljTGluaygpICYmIG9wdHMuZm9sbG93c3ltbGluaykge1xuICAgICAgc3JjRmlsZVN0YXQgPSBmcy5zdGF0U3luYyhzcmNGaWxlKTtcbiAgICAgIGlmIChzcmNGaWxlU3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIGNwZGlyU3luY1JlY3Vyc2l2ZShzcmNGaWxlLCBkZXN0RmlsZSwgY3VycmVudERlcHRoLCBvcHRzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvcHlGaWxlU3luYyhzcmNGaWxlLCBkZXN0RmlsZSwgb3B0cyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8qIEF0IHRoaXMgcG9pbnQsIHdlJ3ZlIGhpdCBhIGZpbGUgYWN0dWFsbHkgd29ydGggY29weWluZy4uLiBzbyBjb3B5IGl0IG9uIG92ZXIuICovXG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhkZXN0RmlsZSkgJiYgb3B0cy5ub19mb3JjZSkge1xuICAgICAgICBjb21tb24ubG9nKCdza2lwcGluZyBleGlzdGluZyBmaWxlOiAnICsgZmlsZXNbaV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29weUZpbGVTeW5jKHNyY0ZpbGUsIGRlc3RGaWxlLCBvcHRzKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gLy8gZm9yIGZpbGVzXG59IC8vIGNwZGlyU3luY1JlY3Vyc2l2ZVxuXG4vLyBDaGVja3MgaWYgY3VyZWVudCBmaWxlIHdhcyBjcmVhdGVkIHJlY2VudGx5XG5mdW5jdGlvbiBjaGVja1JlY2VudENyZWF0ZWQoc291cmNlcywgaW5kZXgpIHtcbiAgdmFyIGxvb2tlZFNvdXJjZSA9IHNvdXJjZXNbaW5kZXhdO1xuICByZXR1cm4gc291cmNlcy5zbGljZSgwLCBpbmRleCkuc29tZShmdW5jdGlvbiAoc3JjKSB7XG4gICAgcmV0dXJuIHBhdGguYmFzZW5hbWUoc3JjKSA9PT0gcGF0aC5iYXNlbmFtZShsb29rZWRTb3VyY2UpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY3BjaGVja2N5Y2xlKHNvdXJjZURpciwgc3JjRmlsZSkge1xuICB2YXIgc3JjRmlsZVN0YXQgPSBmcy5sc3RhdFN5bmMoc3JjRmlsZSk7XG4gIGlmIChzcmNGaWxlU3RhdC5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgLy8gRG8gY3ljbGUgY2hlY2suIEZvciBleGFtcGxlOlxuICAgIC8vICAgJCBta2RpciAtcCAxLzIvMy80XG4gICAgLy8gICAkIGNkICAxLzIvMy80XG4gICAgLy8gICAkIGxuIC1zIC4uLy4uLzMgbGlua1xuICAgIC8vICAgJCBjZCAuLi8uLi8uLi8uLlxuICAgIC8vICAgJCBjcCAtUkwgMSBjb3B5XG4gICAgdmFyIGN5Y2xlY2hlY2sgPSBmcy5zdGF0U3luYyhzcmNGaWxlKTtcbiAgICBpZiAoY3ljbGVjaGVjay5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICB2YXIgc291cmNlcmVhbHBhdGggPSBmcy5yZWFscGF0aFN5bmMoc291cmNlRGlyKTtcbiAgICAgIHZhciBzeW1saW5rcmVhbHBhdGggPSBmcy5yZWFscGF0aFN5bmMoc3JjRmlsZSk7XG4gICAgICB2YXIgcmUgPSBuZXcgUmVnRXhwKHN5bWxpbmtyZWFscGF0aCk7XG4gICAgICBpZiAocmUudGVzdChzb3VyY2VyZWFscGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLy9AXG4vL0AgIyMjIGNwKFtvcHRpb25zLF0gc291cmNlIFssIHNvdXJjZSAuLi5dLCBkZXN0KVxuLy9AICMjIyBjcChbb3B0aW9ucyxdIHNvdXJjZV9hcnJheSwgZGVzdClcbi8vQCBBdmFpbGFibGUgb3B0aW9uczpcbi8vQFxuLy9AICsgYC1mYDogZm9yY2UgKGRlZmF1bHQgYmVoYXZpb3IpXG4vL0AgKyBgLW5gOiBuby1jbG9iYmVyXG4vL0AgKyBgLXVgOiBvbmx5IGNvcHkgaWYgc291cmNlIGlzIG5ld2VyIHRoYW4gZGVzdFxuLy9AICsgYC1yYCwgYC1SYDogcmVjdXJzaXZlXG4vL0AgKyBgLUxgOiBmb2xsb3cgc3ltbGlua3Ncbi8vQCArIGAtUGA6IGRvbid0IGZvbGxvdyBzeW1saW5rc1xuLy9AXG4vL0AgRXhhbXBsZXM6XG4vL0Bcbi8vQCBgYGBqYXZhc2NyaXB0XG4vL0AgY3AoJ2ZpbGUxJywgJ2RpcjEnKTtcbi8vQCBjcCgnLVInLCAncGF0aC90by9kaXIvJywgJ34vbmV3Q29weS8nKTtcbi8vQCBjcCgnLVJmJywgJy90bXAvKicsICcvdXNyL2xvY2FsLyonLCAnL2hvbWUvdG1wJyk7XG4vL0AgY3AoJy1SZicsIFsnL3RtcC8qJywgJy91c3IvbG9jYWwvKiddLCAnL2hvbWUvdG1wJyk7IC8vIHNhbWUgYXMgYWJvdmVcbi8vQCBgYGBcbi8vQFxuLy9AIENvcGllcyBmaWxlcy5cbmZ1bmN0aW9uIF9jcChvcHRpb25zLCBzb3VyY2VzLCBkZXN0KSB7XG4gIC8vIElmIHdlJ3JlIG1pc3NpbmcgLVIsIGl0IGFjdHVhbGx5IGltcGxpZXMgLUwgKHVubGVzcyAtUCBpcyBleHBsaWNpdClcbiAgaWYgKG9wdGlvbnMuZm9sbG93c3ltbGluaykge1xuICAgIG9wdGlvbnMubm9Gb2xsb3dzeW1saW5rID0gZmFsc2U7XG4gIH1cbiAgaWYgKCFvcHRpb25zLnJlY3Vyc2l2ZSAmJiAhb3B0aW9ucy5ub0ZvbGxvd3N5bWxpbmspIHtcbiAgICBvcHRpb25zLmZvbGxvd3N5bWxpbmsgPSB0cnVlO1xuICB9XG5cbiAgLy8gR2V0IHNvdXJjZXMsIGRlc3RcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzKSB7XG4gICAgY29tbW9uLmVycm9yKCdtaXNzaW5nIDxzb3VyY2U+IGFuZC9vciA8ZGVzdD4nKTtcbiAgfSBlbHNlIHtcbiAgICBzb3VyY2VzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEsIGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBkZXN0ID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcbiAgfVxuXG4gIHZhciBkZXN0RXhpc3RzID0gZnMuZXhpc3RzU3luYyhkZXN0KTtcbiAgdmFyIGRlc3RTdGF0ID0gZGVzdEV4aXN0cyAmJiBmcy5zdGF0U3luYyhkZXN0KTtcblxuICAvLyBEZXN0IGlzIG5vdCBleGlzdGluZyBkaXIsIGJ1dCBtdWx0aXBsZSBzb3VyY2VzIGdpdmVuXG4gIGlmICgoIWRlc3RFeGlzdHMgfHwgIWRlc3RTdGF0LmlzRGlyZWN0b3J5KCkpICYmIHNvdXJjZXMubGVuZ3RoID4gMSkge1xuICAgIGNvbW1vbi5lcnJvcignZGVzdCBpcyBub3QgYSBkaXJlY3RvcnkgKHRvbyBtYW55IHNvdXJjZXMpJyk7XG4gIH1cblxuICAvLyBEZXN0IGlzIGFuIGV4aXN0aW5nIGZpbGUsIGJ1dCAtbiBpcyBnaXZlblxuICBpZiAoZGVzdEV4aXN0cyAmJiBkZXN0U3RhdC5pc0ZpbGUoKSAmJiBvcHRpb25zLm5vX2ZvcmNlKSB7XG4gICAgcmV0dXJuIG5ldyBjb21tb24uU2hlbGxTdHJpbmcoJycsICcnLCAwKTtcbiAgfVxuXG4gIHNvdXJjZXMuZm9yRWFjaChmdW5jdGlvbiAoc3JjLCBzcmNJbmRleCkge1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhzcmMpKSB7XG4gICAgICBpZiAoc3JjID09PSAnJykgc3JjID0gXCInJ1wiOyAvLyBpZiBzcmMgd2FzIGVtcHR5IHN0cmluZywgZGlzcGxheSBlbXB0eSBzdHJpbmdcbiAgICAgIGNvbW1vbi5lcnJvcignbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeTogJyArIHNyYywgeyBjb250aW51ZTogdHJ1ZSB9KTtcbiAgICAgIHJldHVybjsgLy8gc2tpcCBmaWxlXG4gICAgfVxuICAgIHZhciBzcmNTdGF0ID0gZnMuc3RhdFN5bmMoc3JjKTtcbiAgICBpZiAoIW9wdGlvbnMubm9Gb2xsb3dzeW1saW5rICYmIHNyY1N0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgaWYgKCFvcHRpb25zLnJlY3Vyc2l2ZSkge1xuICAgICAgICAvLyBOb24tUmVjdXJzaXZlXG4gICAgICAgIGNvbW1vbi5lcnJvcihcIm9taXR0aW5nIGRpcmVjdG9yeSAnXCIgKyBzcmMgKyBcIidcIiwgeyBjb250aW51ZTogdHJ1ZSB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFJlY3Vyc2l2ZVxuICAgICAgICAvLyAnY3AgL2Evc291cmNlIGRlc3QnIHNob3VsZCBjcmVhdGUgJ3NvdXJjZScgaW4gJ2Rlc3QnXG4gICAgICAgIHZhciBuZXdEZXN0ID0gKGRlc3RTdGF0ICYmIGRlc3RTdGF0LmlzRGlyZWN0b3J5KCkpID9cbiAgICAgICAgICAgIHBhdGguam9pbihkZXN0LCBwYXRoLmJhc2VuYW1lKHNyYykpIDpcbiAgICAgICAgICAgIGRlc3Q7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmcy5zdGF0U3luYyhwYXRoLmRpcm5hbWUoZGVzdCkpO1xuICAgICAgICAgIGNwZGlyU3luY1JlY3Vyc2l2ZShzcmMsIG5ld0Rlc3QsIDAsIHsgbm9fZm9yY2U6IG9wdGlvbnMubm9fZm9yY2UsIGZvbGxvd3N5bWxpbms6IG9wdGlvbnMuZm9sbG93c3ltbGluayB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICAgICAgY29tbW9uLmVycm9yKFwiY2Fubm90IGNyZWF0ZSBkaXJlY3RvcnkgJ1wiICsgZGVzdCArIFwiJzogTm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeVwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBoZXJlLCBzcmMgaXMgYSBmaWxlXG5cbiAgICAgIC8vIFdoZW4gY29weWluZyB0byAnL3BhdGgvZGlyJzpcbiAgICAgIC8vICAgIHRoaXNEZXN0ID0gJy9wYXRoL2Rpci9maWxlMSdcbiAgICAgIHZhciB0aGlzRGVzdCA9IGRlc3Q7XG4gICAgICBpZiAoZGVzdFN0YXQgJiYgZGVzdFN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICB0aGlzRGVzdCA9IHBhdGgubm9ybWFsaXplKGRlc3QgKyAnLycgKyBwYXRoLmJhc2VuYW1lKHNyYykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgdGhpc0Rlc3RFeGlzdHMgPSBmcy5leGlzdHNTeW5jKHRoaXNEZXN0KTtcbiAgICAgIGlmICh0aGlzRGVzdEV4aXN0cyAmJiBjaGVja1JlY2VudENyZWF0ZWQoc291cmNlcywgc3JjSW5kZXgpKSB7XG4gICAgICAgIC8vIGNhbm5vdCBvdmVyd3JpdGUgZmlsZSBjcmVhdGVkIHJlY2VudGx5IGluIGN1cnJlbnQgZXhlY3V0aW9uLCBidXQgd2Ugd2FudCB0byBjb250aW51ZSBjb3B5aW5nIG90aGVyIGZpbGVzXG4gICAgICAgIGlmICghb3B0aW9ucy5ub19mb3JjZSkge1xuICAgICAgICAgIGNvbW1vbi5lcnJvcihcIndpbGwgbm90IG92ZXJ3cml0ZSBqdXN0LWNyZWF0ZWQgJ1wiICsgdGhpc0Rlc3QgKyBcIicgd2l0aCAnXCIgKyBzcmMgKyBcIidcIiwgeyBjb250aW51ZTogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzRGVzdEV4aXN0cyAmJiBvcHRpb25zLm5vX2ZvcmNlKSB7XG4gICAgICAgIHJldHVybjsgLy8gc2tpcCBmaWxlXG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLnJlbGF0aXZlKHNyYywgdGhpc0Rlc3QpID09PSAnJykge1xuICAgICAgICAvLyBhIGZpbGUgY2Fubm90IGJlIGNvcGllZCB0byBpdHNlbGYsIGJ1dCB3ZSB3YW50IHRvIGNvbnRpbnVlIGNvcHlpbmcgb3RoZXIgZmlsZXNcbiAgICAgICAgY29tbW9uLmVycm9yKFwiJ1wiICsgdGhpc0Rlc3QgKyBcIicgYW5kICdcIiArIHNyYyArIFwiJyBhcmUgdGhlIHNhbWUgZmlsZVwiLCB7IGNvbnRpbnVlOiB0cnVlIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvcHlGaWxlU3luYyhzcmMsIHRoaXNEZXN0LCBvcHRpb25zKTtcbiAgICB9XG4gIH0pOyAvLyBmb3JFYWNoKHNyYylcblxuICByZXR1cm4gbmV3IGNvbW1vbi5TaGVsbFN0cmluZygnJywgY29tbW9uLnN0YXRlLmVycm9yLCBjb21tb24uc3RhdGUuZXJyb3JDb2RlKTtcbn1cbm1vZHVsZS5leHBvcnRzID0gX2NwO1xuIl19