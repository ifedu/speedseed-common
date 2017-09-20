var path = require('path');
var fs = require('fs');
var common = require('./common');
var glob = require('glob');
var globPatternRecursive = path.sep + '**';
common.register('ls', _ls, {
    cmdOptions: {
        'R': 'recursive',
        'A': 'all',
        'L': 'link',
        'a': 'all_deprecated',
        'd': 'directory',
        'l': 'long',
    },
});
//@
//@ ### ls([options,] [path, ...])
//@ ### ls([options,] path_array)
//@ Available options:
//@
//@ + `-R`: recursive
//@ + `-A`: all files (include files beginning with `.`, except for `.` and `..`)
//@ + `-L`: follow symlinks
//@ + `-d`: list directories themselves, not their contents
//@ + `-l`: list objects representing each file, each with fields containing `ls
//@         -l` output fields. See
//@         [fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)
//@         for more info
//@
//@ Examples:
//@
//@ ```javascript
//@ ls('projs/*.js');
//@ ls('-R', '/users/me', '/tmp');
//@ ls('-R', ['/users/me', '/tmp']); // same as above
//@ ls('-l', 'file.txt'); // { name: 'file.txt', mode: 33188, nlink: 1, ...}
//@ ```
//@
//@ Returns array of files in the given path, or in current directory if no path provided.
function _ls(options, paths) {
    if (options.all_deprecated) {
        // We won't support the -a option as it's hard to image why it's useful
        // (it includes '.' and '..' in addition to '.*' files)
        // For backwards compatibility we'll dump a deprecated message and proceed as before
        common.log('ls: Option -a is deprecated. Use -A instead');
        options.all = true;
    }
    if (!paths) {
        paths = ['.'];
    }
    else {
        paths = [].slice.call(arguments, 1);
    }
    var list = [];
    function pushFile(abs, relName, stat) {
        if (process.platform === 'win32') {
            relName = relName.replace(/\\/g, '/');
        }
        if (options.long) {
            stat = stat || (options.link ? fs.statSync(abs) : fs.lstatSync(abs));
            list.push(addLsAttributes(relName, stat));
        }
        else {
            // list.push(path.relative(rel || '.', file));
            list.push(relName);
        }
    }
    paths.forEach(function (p) {
        var stat;
        try {
            stat = options.link ? fs.statSync(p) : fs.lstatSync(p);
        }
        catch (e) {
            common.error('no such file or directory: ' + p, 2, { continue: true });
            return;
        }
        // If the stat succeeded
        if (stat.isDirectory() && !options.directory) {
            if (options.recursive) {
                // use glob, because it's simple
                glob.sync(p + globPatternRecursive, { dot: options.all, follow: options.link })
                    .forEach(function (item) {
                    // Glob pattern returns the directory itself and needs to be filtered out.
                    if (path.relative(p, item)) {
                        pushFile(item, path.relative(p, item));
                    }
                });
            }
            else if (options.all) {
                // use fs.readdirSync, because it's fast
                fs.readdirSync(p).forEach(function (item) {
                    pushFile(path.join(p, item), item);
                });
            }
            else {
                // use fs.readdirSync and then filter out secret files
                fs.readdirSync(p).forEach(function (item) {
                    if (item[0] !== '.') {
                        pushFile(path.join(p, item), item);
                    }
                });
            }
        }
        else {
            pushFile(p, p, stat);
        }
    });
    // Add methods, to make this more compatible with ShellStrings
    return list;
}
function addLsAttributes(pathName, stats) {
    // Note: this object will contain more information than .toString() returns
    stats.name = pathName;
    stats.toString = function () {
        // Return a string resembling unix's `ls -l` format
        return [this.mode, this.nlink, this.uid, this.gid, this.size, this.mtime, this.name].join(' ');
    };
    return stats;
}
module.exports = _ls;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXGxzLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXHNoZWxsanNcXHNyY1xcbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNCLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN2QixJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakMsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRTNCLElBQUksb0JBQW9CLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUM7QUFFM0MsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLFVBQVUsRUFBRTtRQUNWLEdBQUcsRUFBRSxXQUFXO1FBQ2hCLEdBQUcsRUFBRSxLQUFLO1FBQ1YsR0FBRyxFQUFFLE1BQU07UUFDWCxHQUFHLEVBQUUsZ0JBQWdCO1FBQ3JCLEdBQUcsRUFBRSxXQUFXO1FBQ2hCLEdBQUcsRUFBRSxNQUFNO0tBQ1o7Q0FDRixDQUFDLENBQUM7QUFFSCxHQUFHO0FBQ0gsa0NBQWtDO0FBQ2xDLGlDQUFpQztBQUNqQyxzQkFBc0I7QUFDdEIsR0FBRztBQUNILHFCQUFxQjtBQUNyQixpRkFBaUY7QUFDakYsMkJBQTJCO0FBQzNCLDJEQUEyRDtBQUMzRCxnRkFBZ0Y7QUFDaEYsa0NBQWtDO0FBQ2xDLHdFQUF3RTtBQUN4RSx5QkFBeUI7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LEtBQUssQ0FBQyxRQUFRLEdBQUc7UUFDZixtREFBbUQ7UUFDbkQsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqRyxDQUFDLENBQUM7SUFDRixNQUFNLENBQUMsS0FBSyxDQUFDO0FBQ2YsQ0FBQztBQUVELE1BQU0sQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsidmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgZnMgPSByZXF1aXJlKCdmcycpO1xudmFyIGNvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG52YXIgZ2xvYiA9IHJlcXVpcmUoJ2dsb2InKTtcblxudmFyIGdsb2JQYXR0ZXJuUmVjdXJzaXZlID0gcGF0aC5zZXAgKyAnKionO1xuXG5jb21tb24ucmVnaXN0ZXIoJ2xzJywgX2xzLCB7XG4gIGNtZE9wdGlvbnM6IHtcbiAgICAnUic6ICdyZWN1cnNpdmUnLFxuICAgICdBJzogJ2FsbCcsXG4gICAgJ0wnOiAnbGluaycsXG4gICAgJ2EnOiAnYWxsX2RlcHJlY2F0ZWQnLFxuICAgICdkJzogJ2RpcmVjdG9yeScsXG4gICAgJ2wnOiAnbG9uZycsXG4gIH0sXG59KTtcblxuLy9AXG4vL0AgIyMjIGxzKFtvcHRpb25zLF0gW3BhdGgsIC4uLl0pXG4vL0AgIyMjIGxzKFtvcHRpb25zLF0gcGF0aF9hcnJheSlcbi8vQCBBdmFpbGFibGUgb3B0aW9uczpcbi8vQFxuLy9AICsgYC1SYDogcmVjdXJzaXZlXG4vL0AgKyBgLUFgOiBhbGwgZmlsZXMgKGluY2x1ZGUgZmlsZXMgYmVnaW5uaW5nIHdpdGggYC5gLCBleGNlcHQgZm9yIGAuYCBhbmQgYC4uYClcbi8vQCArIGAtTGA6IGZvbGxvdyBzeW1saW5rc1xuLy9AICsgYC1kYDogbGlzdCBkaXJlY3RvcmllcyB0aGVtc2VsdmVzLCBub3QgdGhlaXIgY29udGVudHNcbi8vQCArIGAtbGA6IGxpc3Qgb2JqZWN0cyByZXByZXNlbnRpbmcgZWFjaCBmaWxlLCBlYWNoIHdpdGggZmllbGRzIGNvbnRhaW5pbmcgYGxzXG4vL0AgICAgICAgICAtbGAgb3V0cHV0IGZpZWxkcy4gU2VlXG4vL0AgICAgICAgICBbZnMuU3RhdHNdKGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvZnMuaHRtbCNmc19jbGFzc19mc19zdGF0cylcbi8vQCAgICAgICAgIGZvciBtb3JlIGluZm9cbi8vQFxuLy9AIEV4YW1wbGVzOlxuLy9AXG4vL0AgYGBgamF2YXNjcmlwdFxuLy9AIGxzKCdwcm9qcy8qLmpzJyk7XG4vL0AgbHMoJy1SJywgJy91c2Vycy9tZScsICcvdG1wJyk7XG4vL0AgbHMoJy1SJywgWycvdXNlcnMvbWUnLCAnL3RtcCddKTsgLy8gc2FtZSBhcyBhYm92ZVxuLy9AIGxzKCctbCcsICdmaWxlLnR4dCcpOyAvLyB7IG5hbWU6ICdmaWxlLnR4dCcsIG1vZGU6IDMzMTg4LCBubGluazogMSwgLi4ufVxuLy9AIGBgYFxuLy9AXG4vL0AgUmV0dXJucyBhcnJheSBvZiBmaWxlcyBpbiB0aGUgZ2l2ZW4gcGF0aCwgb3IgaW4gY3VycmVudCBkaXJlY3RvcnkgaWYgbm8gcGF0aCBwcm92aWRlZC5cbmZ1bmN0aW9uIF9scyhvcHRpb25zLCBwYXRocykge1xuICBpZiAob3B0aW9ucy5hbGxfZGVwcmVjYXRlZCkge1xuICAgIC8vIFdlIHdvbid0IHN1cHBvcnQgdGhlIC1hIG9wdGlvbiBhcyBpdCdzIGhhcmQgdG8gaW1hZ2Ugd2h5IGl0J3MgdXNlZnVsXG4gICAgLy8gKGl0IGluY2x1ZGVzICcuJyBhbmQgJy4uJyBpbiBhZGRpdGlvbiB0byAnLionIGZpbGVzKVxuICAgIC8vIEZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSB3ZSdsbCBkdW1wIGEgZGVwcmVjYXRlZCBtZXNzYWdlIGFuZCBwcm9jZWVkIGFzIGJlZm9yZVxuICAgIGNvbW1vbi5sb2coJ2xzOiBPcHRpb24gLWEgaXMgZGVwcmVjYXRlZC4gVXNlIC1BIGluc3RlYWQnKTtcbiAgICBvcHRpb25zLmFsbCA9IHRydWU7XG4gIH1cblxuICBpZiAoIXBhdGhzKSB7XG4gICAgcGF0aHMgPSBbJy4nXTtcbiAgfSBlbHNlIHtcbiAgICBwYXRocyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgfVxuXG4gIHZhciBsaXN0ID0gW107XG5cbiAgZnVuY3Rpb24gcHVzaEZpbGUoYWJzLCByZWxOYW1lLCBzdGF0KSB7XG4gICAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICAgIHJlbE5hbWUgPSByZWxOYW1lLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubG9uZykge1xuICAgICAgc3RhdCA9IHN0YXQgfHwgKG9wdGlvbnMubGluayA/IGZzLnN0YXRTeW5jKGFicykgOiBmcy5sc3RhdFN5bmMoYWJzKSk7XG4gICAgICBsaXN0LnB1c2goYWRkTHNBdHRyaWJ1dGVzKHJlbE5hbWUsIHN0YXQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbGlzdC5wdXNoKHBhdGgucmVsYXRpdmUocmVsIHx8ICcuJywgZmlsZSkpO1xuICAgICAgbGlzdC5wdXNoKHJlbE5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHBhdGhzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICB2YXIgc3RhdDtcblxuICAgIHRyeSB7XG4gICAgICBzdGF0ID0gb3B0aW9ucy5saW5rID8gZnMuc3RhdFN5bmMocCkgOiBmcy5sc3RhdFN5bmMocCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29tbW9uLmVycm9yKCdubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5OiAnICsgcCwgMiwgeyBjb250aW51ZTogdHJ1ZSB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgc3RhdCBzdWNjZWVkZWRcbiAgICBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpICYmICFvcHRpb25zLmRpcmVjdG9yeSkge1xuICAgICAgaWYgKG9wdGlvbnMucmVjdXJzaXZlKSB7XG4gICAgICAgIC8vIHVzZSBnbG9iLCBiZWNhdXNlIGl0J3Mgc2ltcGxlXG4gICAgICAgIGdsb2Iuc3luYyhwICsgZ2xvYlBhdHRlcm5SZWN1cnNpdmUsIHsgZG90OiBvcHRpb25zLmFsbCwgZm9sbG93OiBvcHRpb25zLmxpbmsgfSlcbiAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgLy8gR2xvYiBwYXR0ZXJuIHJldHVybnMgdGhlIGRpcmVjdG9yeSBpdHNlbGYgYW5kIG5lZWRzIHRvIGJlIGZpbHRlcmVkIG91dC5cbiAgICAgICAgICAgIGlmIChwYXRoLnJlbGF0aXZlKHAsIGl0ZW0pKSB7XG4gICAgICAgICAgICAgIHB1c2hGaWxlKGl0ZW0sIHBhdGgucmVsYXRpdmUocCwgaXRlbSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChvcHRpb25zLmFsbCkge1xuICAgICAgICAvLyB1c2UgZnMucmVhZGRpclN5bmMsIGJlY2F1c2UgaXQncyBmYXN0XG4gICAgICAgIGZzLnJlYWRkaXJTeW5jKHApLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICBwdXNoRmlsZShwYXRoLmpvaW4ocCwgaXRlbSksIGl0ZW0pO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHVzZSBmcy5yZWFkZGlyU3luYyBhbmQgdGhlbiBmaWx0ZXIgb3V0IHNlY3JldCBmaWxlc1xuICAgICAgICBmcy5yZWFkZGlyU3luYyhwKS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgaWYgKGl0ZW1bMF0gIT09ICcuJykge1xuICAgICAgICAgICAgcHVzaEZpbGUocGF0aC5qb2luKHAsIGl0ZW0pLCBpdGVtKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwdXNoRmlsZShwLCBwLCBzdGF0KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEFkZCBtZXRob2RzLCB0byBtYWtlIHRoaXMgbW9yZSBjb21wYXRpYmxlIHdpdGggU2hlbGxTdHJpbmdzXG4gIHJldHVybiBsaXN0O1xufVxuXG5mdW5jdGlvbiBhZGRMc0F0dHJpYnV0ZXMocGF0aE5hbWUsIHN0YXRzKSB7XG4gIC8vIE5vdGU6IHRoaXMgb2JqZWN0IHdpbGwgY29udGFpbiBtb3JlIGluZm9ybWF0aW9uIHRoYW4gLnRvU3RyaW5nKCkgcmV0dXJuc1xuICBzdGF0cy5uYW1lID0gcGF0aE5hbWU7XG4gIHN0YXRzLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIFJldHVybiBhIHN0cmluZyByZXNlbWJsaW5nIHVuaXgncyBgbHMgLWxgIGZvcm1hdFxuICAgIHJldHVybiBbdGhpcy5tb2RlLCB0aGlzLm5saW5rLCB0aGlzLnVpZCwgdGhpcy5naWQsIHRoaXMuc2l6ZSwgdGhpcy5tdGltZSwgdGhpcy5uYW1lXS5qb2luKCcgJyk7XG4gIH07XG4gIHJldHVybiBzdGF0cztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBfbHM7XG4iXX0=