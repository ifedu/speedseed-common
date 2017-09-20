var common = require('./common');
var fs = require('fs');
common.register('touch', _touch, {
    cmdOptions: {
        'a': 'atime_only',
        'c': 'no_create',
        'd': 'date',
        'm': 'mtime_only',
        'r': 'reference',
    },
});
//@
//@ ### touch([options,] file [, file ...])
//@ ### touch([options,] file_array)
//@ Available options:
//@
//@ + `-a`: Change only the access time
//@ + `-c`: Do not create any files
//@ + `-m`: Change only the modification time
//@ + `-d DATE`: Parse DATE and use it instead of current time
//@ + `-r FILE`: Use FILE's times instead of current time
//@
//@ Examples:
//@
//@ ```javascript
//@ touch('source.js');
//@ touch('-c', '/path/to/some/dir/source.js');
//@ touch({ '-r': FILE }, '/path/to/some/dir/source.js');
//@ ```
//@
//@ Update the access and modification times of each FILE to the current time.
//@ A FILE argument that does not exist is created empty, unless -c is supplied.
//@ This is a partial implementation of *[touch(1)](http://linux.die.net/man/1/touch)*.
function _touch(opts, files) {
    if (!files) {
        common.error('no files given');
    }
    else if (typeof files === 'string') {
        files = [].slice.call(arguments, 1);
    }
    else {
        common.error('file arg should be a string file path or an Array of string file paths');
    }
    files.forEach(function (f) {
        touchFile(opts, f);
    });
    return '';
}
function touchFile(opts, file) {
    var stat = tryStatFile(file);
    if (stat && stat.isDirectory()) {
        // don't error just exit
        return;
    }
    // if the file doesn't already exist and the user has specified --no-create then
    // this script is finished
    if (!stat && opts.no_create) {
        return;
    }
    // open the file and then close it. this will create it if it doesn't exist but will
    // not truncate the file
    fs.closeSync(fs.openSync(file, 'a'));
    //
    // Set timestamps
    //
    // setup some defaults
    var now = new Date();
    var mtime = opts.date || now;
    var atime = opts.date || now;
    // use reference file
    if (opts.reference) {
        var refStat = tryStatFile(opts.reference);
        if (!refStat) {
            common.error('failed to get attributess of ' + opts.reference);
        }
        mtime = refStat.mtime;
        atime = refStat.atime;
    }
    else if (opts.date) {
        mtime = opts.date;
        atime = opts.date;
    }
    if (opts.atime_only && opts.mtime_only) {
        // keep the new values of mtime and atime like GNU
    }
    else if (opts.atime_only) {
        mtime = stat.mtime;
    }
    else if (opts.mtime_only) {
        atime = stat.atime;
    }
    fs.utimesSync(file, atime, mtime);
}
module.exports = _touch;
function tryStatFile(filePath) {
    try {
        return fs.statSync(filePath);
    }
    catch (e) {
        return null;
    }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXHRvdWNoLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXHNoZWxsanNcXHNyY1xcdG91Y2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUV2QixNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUU7SUFDL0IsVUFBVSxFQUFFO1FBQ1YsR0FBRyxFQUFFLFlBQVk7UUFDakIsR0FBRyxFQUFFLFdBQVc7UUFDaEIsR0FBRyxFQUFFLE1BQU07UUFDWCxHQUFHLEVBQUUsWUFBWTtRQUNqQixHQUFHLEVBQUUsV0FBVztLQUNqQjtDQUNGLENBQUMsQ0FBQztBQUVILEdBQUc7QUFDSCwyQ0FBMkM7QUFDM0Msb0NBQW9DO0FBQ3BDLHNCQUFzQjtBQUN0QixHQUFHO0FBQ0gsdUNBQXVDO0FBQ3ZDLG1DQUFtQztBQUNuQyw2Q0FBNkM7QUFDN0MsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCxHQUFHO0FBQ0gsYUFBYTtBQUNiLEdBQUc7QUFDSCxpQkFBaUI7QUFDakIsdUJBQXVCO0FBQ3ZCLCtDQUErQztBQUMvQyx5REFBeUQ7QUFDekQsT0FBTztBQUNQLEdBQUc7QUFDSCw4RUFBOEU7QUFDOUUsZ0ZBQWdGO0FBQ2hGLHVGQUF1RjtBQUN2RixnQkFBZ0IsSUFBSSxFQUFFLEtBQUs7SUFDekIsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFL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QUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNwQyxDQUFDO0FBRUQsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7QUFFeEIscUJBQXFCLFFBQVE7SUFDM0IsSUFBSSxDQUFDO1FBQ0gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKTtcbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5cbmNvbW1vbi5yZWdpc3RlcigndG91Y2gnLCBfdG91Y2gsIHtcbiAgY21kT3B0aW9uczoge1xuICAgICdhJzogJ2F0aW1lX29ubHknLFxuICAgICdjJzogJ25vX2NyZWF0ZScsXG4gICAgJ2QnOiAnZGF0ZScsXG4gICAgJ20nOiAnbXRpbWVfb25seScsXG4gICAgJ3InOiAncmVmZXJlbmNlJyxcbiAgfSxcbn0pO1xuXG4vL0Bcbi8vQCAjIyMgdG91Y2goW29wdGlvbnMsXSBmaWxlIFssIGZpbGUgLi4uXSlcbi8vQCAjIyMgdG91Y2goW29wdGlvbnMsXSBmaWxlX2FycmF5KVxuLy9AIEF2YWlsYWJsZSBvcHRpb25zOlxuLy9AXG4vL0AgKyBgLWFgOiBDaGFuZ2Ugb25seSB0aGUgYWNjZXNzIHRpbWVcbi8vQCArIGAtY2A6IERvIG5vdCBjcmVhdGUgYW55IGZpbGVzXG4vL0AgKyBgLW1gOiBDaGFuZ2Ugb25seSB0aGUgbW9kaWZpY2F0aW9uIHRpbWVcbi8vQCArIGAtZCBEQVRFYDogUGFyc2UgREFURSBhbmQgdXNlIGl0IGluc3RlYWQgb2YgY3VycmVudCB0aW1lXG4vL0AgKyBgLXIgRklMRWA6IFVzZSBGSUxFJ3MgdGltZXMgaW5zdGVhZCBvZiBjdXJyZW50IHRpbWVcbi8vQFxuLy9AIEV4YW1wbGVzOlxuLy9AXG4vL0AgYGBgamF2YXNjcmlwdFxuLy9AIHRvdWNoKCdzb3VyY2UuanMnKTtcbi8vQCB0b3VjaCgnLWMnLCAnL3BhdGgvdG8vc29tZS9kaXIvc291cmNlLmpzJyk7XG4vL0AgdG91Y2goeyAnLXInOiBGSUxFIH0sICcvcGF0aC90by9zb21lL2Rpci9zb3VyY2UuanMnKTtcbi8vQCBgYGBcbi8vQFxuLy9AIFVwZGF0ZSB0aGUgYWNjZXNzIGFuZCBtb2RpZmljYXRpb24gdGltZXMgb2YgZWFjaCBGSUxFIHRvIHRoZSBjdXJyZW50IHRpbWUuXG4vL0AgQSBGSUxFIGFyZ3VtZW50IHRoYXQgZG9lcyBub3QgZXhpc3QgaXMgY3JlYXRlZCBlbXB0eSwgdW5sZXNzIC1jIGlzIHN1cHBsaWVkLlxuLy9AIFRoaXMgaXMgYSBwYXJ0aWFsIGltcGxlbWVudGF0aW9uIG9mICpbdG91Y2goMSldKGh0dHA6Ly9saW51eC5kaWUubmV0L21hbi8xL3RvdWNoKSouXG5mdW5jdGlvbiBfdG91Y2gob3B0cywgZmlsZXMpIHtcbiAgaWYgKCFmaWxlcykge1xuICAgIGNvbW1vbi5lcnJvcignbm8gZmlsZXMgZ2l2ZW4nKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZmlsZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgZmlsZXMgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gIH0gZWxzZSB7XG4gICAgY29tbW9uLmVycm9yKCdmaWxlIGFyZyBzaG91bGQgYmUgYSBzdHJpbmcgZmlsZSBwYXRoIG9yIGFuIEFycmF5IG9mIHN0cmluZyBmaWxlIHBhdGhzJyk7XG4gIH1cblxuICBmaWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChmKSB7XG4gICAgdG91Y2hGaWxlKG9wdHMsIGYpO1xuICB9KTtcbiAgcmV0dXJuICcnO1xufVxuXG5mdW5jdGlvbiB0b3VjaEZpbGUob3B0cywgZmlsZSkge1xuICB2YXIgc3RhdCA9IHRyeVN0YXRGaWxlKGZpbGUpO1xuXG4gIGlmIChzdGF0ICYmIHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgIC8vIGRvbid0IGVycm9yIGp1c3QgZXhpdFxuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGlmIHRoZSBmaWxlIGRvZXNuJ3QgYWxyZWFkeSBleGlzdCBhbmQgdGhlIHVzZXIgaGFzIHNwZWNpZmllZCAtLW5vLWNyZWF0ZSB0aGVuXG4gIC8vIHRoaXMgc2NyaXB0IGlzIGZpbmlzaGVkXG4gIGlmICghc3RhdCAmJiBvcHRzLm5vX2NyZWF0ZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIG9wZW4gdGhlIGZpbGUgYW5kIHRoZW4gY2xvc2UgaXQuIHRoaXMgd2lsbCBjcmVhdGUgaXQgaWYgaXQgZG9lc24ndCBleGlzdCBidXQgd2lsbFxuICAvLyBub3QgdHJ1bmNhdGUgdGhlIGZpbGVcbiAgZnMuY2xvc2VTeW5jKGZzLm9wZW5TeW5jKGZpbGUsICdhJykpO1xuXG4gIC8vXG4gIC8vIFNldCB0aW1lc3RhbXBzXG4gIC8vXG5cbiAgLy8gc2V0dXAgc29tZSBkZWZhdWx0c1xuICB2YXIgbm93ID0gbmV3IERhdGUoKTtcbiAgdmFyIG10aW1lID0gb3B0cy5kYXRlIHx8IG5vdztcbiAgdmFyIGF0aW1lID0gb3B0cy5kYXRlIHx8IG5vdztcblxuICAvLyB1c2UgcmVmZXJlbmNlIGZpbGVcbiAgaWYgKG9wdHMucmVmZXJlbmNlKSB7XG4gICAgdmFyIHJlZlN0YXQgPSB0cnlTdGF0RmlsZShvcHRzLnJlZmVyZW5jZSk7XG4gICAgaWYgKCFyZWZTdGF0KSB7XG4gICAgICBjb21tb24uZXJyb3IoJ2ZhaWxlZCB0byBnZXQgYXR0cmlidXRlc3Mgb2YgJyArIG9wdHMucmVmZXJlbmNlKTtcbiAgICB9XG4gICAgbXRpbWUgPSByZWZTdGF0Lm10aW1lO1xuICAgIGF0aW1lID0gcmVmU3RhdC5hdGltZTtcbiAgfSBlbHNlIGlmIChvcHRzLmRhdGUpIHtcbiAgICBtdGltZSA9IG9wdHMuZGF0ZTtcbiAgICBhdGltZSA9IG9wdHMuZGF0ZTtcbiAgfVxuXG4gIGlmIChvcHRzLmF0aW1lX29ubHkgJiYgb3B0cy5tdGltZV9vbmx5KSB7XG4gICAgLy8ga2VlcCB0aGUgbmV3IHZhbHVlcyBvZiBtdGltZSBhbmQgYXRpbWUgbGlrZSBHTlVcbiAgfSBlbHNlIGlmIChvcHRzLmF0aW1lX29ubHkpIHtcbiAgICBtdGltZSA9IHN0YXQubXRpbWU7XG4gIH0gZWxzZSBpZiAob3B0cy5tdGltZV9vbmx5KSB7XG4gICAgYXRpbWUgPSBzdGF0LmF0aW1lO1xuICB9XG5cbiAgZnMudXRpbWVzU3luYyhmaWxlLCBhdGltZSwgbXRpbWUpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IF90b3VjaDtcblxuZnVuY3Rpb24gdHJ5U3RhdEZpbGUoZmlsZVBhdGgpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==