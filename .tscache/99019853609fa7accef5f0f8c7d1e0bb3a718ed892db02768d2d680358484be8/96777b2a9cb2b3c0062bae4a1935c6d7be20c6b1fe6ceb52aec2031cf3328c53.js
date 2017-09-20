var common = require('./common');
var fs = require('fs');
common.register('rm', _rm, {
    cmdOptions: {
        'f': 'force',
        'r': 'recursive',
        'R': 'recursive',
    },
});
// Recursively removes 'dir'
// Adapted from https://github.com/ryanmcgrath/wrench-js
//
// Copyright (c) 2010 Ryan McGrath
// Copyright (c) 2012 Artur Adib
//
// Licensed under the MIT License
// http://www.opensource.org/licenses/mit-license.php
function rmdirSyncRecursive(dir, force, fromSymlink) {
    var files;
    files = fs.readdirSync(dir);
    // Loop through and delete everything in the sub-tree after checking it
    for (var i = 0; i < files.length; i++) {
        var file = dir + '/' + files[i];
        var currFile = fs.lstatSync(file);
        if (currFile.isDirectory()) {
            rmdirSyncRecursive(file, force);
        }
        else {
            if (force || isWriteable(file)) {
                try {
                    common.unlinkSync(file);
                }
                catch (e) {
                    /* istanbul ignore next */
                    common.error('could not remove file (code ' + e.code + '): ' + file, {
                        continue: true,
                    });
                }
            }
        }
    }
    // if was directory was referenced through a symbolic link,
    // the contents should be removed, but not the directory itself
    if (fromSymlink)
        return;
    // Now that we know everything in the sub-tree has been deleted, we can delete the main directory.
    // Huzzah for the shopkeep.
    var result;
    try {
        // Retry on windows, sometimes it takes a little time before all the files in the directory are gone
        var start = Date.now();
        // TODO: replace this with a finite loop
        for (;;) {
            try {
                result = fs.rmdirSync(dir);
                if (fs.existsSync(dir))
                    throw { code: 'EAGAIN' };
                break;
            }
            catch (er) {
                /* istanbul ignore next */
                // In addition to error codes, also check if the directory still exists and loop again if true
                if (process.platform === 'win32' && (er.code === 'ENOTEMPTY' || er.code === 'EBUSY' || er.code === 'EPERM' || er.code === 'EAGAIN')) {
                    if (Date.now() - start > 1000)
                        throw er;
                }
                else if (er.code === 'ENOENT') {
                    // Directory did not exist, deletion was successful
                    break;
                }
                else {
                    throw er;
                }
            }
        }
    }
    catch (e) {
        common.error('could not remove directory (code ' + e.code + '): ' + dir, { continue: true });
    }
    return result;
} // rmdirSyncRecursive
// Hack to determine if file has write permissions for current user
// Avoids having to check user, group, etc, but it's probably slow
function isWriteable(file) {
    var writePermission = true;
    try {
        var __fd = fs.openSync(file, 'a');
        fs.closeSync(__fd);
    }
    catch (e) {
        writePermission = false;
    }
    return writePermission;
}
function handleFile(file, options) {
    if (options.force || isWriteable(file)) {
        // -f was passed, or file is writable, so it can be removed
        common.unlinkSync(file);
    }
    else {
        common.error('permission denied: ' + file, { continue: true });
    }
}
function handleDirectory(file, options) {
    if (options.recursive) {
        // -r was passed, so directory can be removed
        rmdirSyncRecursive(file, options.force);
    }
    else {
        common.error('path is a directory', { continue: true });
    }
}
function handleSymbolicLink(file, options) {
    var stats;
    try {
        stats = fs.statSync(file);
    }
    catch (e) {
        // symlink is broken, so remove the symlink itself
        common.unlinkSync(file);
        return;
    }
    if (stats.isFile()) {
        common.unlinkSync(file);
    }
    else if (stats.isDirectory()) {
        if (file[file.length - 1] === '/') {
            // trailing separator, so remove the contents, not the link
            if (options.recursive) {
                // -r was passed, so directory can be removed
                var fromSymlink = true;
                rmdirSyncRecursive(file, options.force, fromSymlink);
            }
            else {
                common.error('path is a directory', { continue: true });
            }
        }
        else {
            // no trailing separator, so remove the link
            common.unlinkSync(file);
        }
    }
}
function handleFIFO(file) {
    common.unlinkSync(file);
}
//@
//@ ### rm([options,] file [, file ...])
//@ ### rm([options,] file_array)
//@ Available options:
//@
//@ + `-f`: force
//@ + `-r, -R`: recursive
//@
//@ Examples:
//@
//@ ```javascript
//@ rm('-rf', '/tmp/*');
//@ rm('some_file.txt', 'another_file.txt');
//@ rm(['some_file.txt', 'another_file.txt']); // same as above
//@ ```
//@
//@ Removes files.
function _rm(options, files) {
    if (!files)
        common.error('no paths given');
    // Convert to array
    files = [].slice.call(arguments, 1);
    files.forEach(function (file) {
        var lstats;
        try {
            var filepath = (file[file.length - 1] === '/')
                ? file.slice(0, -1) // remove the '/' so lstatSync can detect symlinks
                : file;
            lstats = fs.lstatSync(filepath); // test for existence
        }
        catch (e) {
            // Path does not exist, no force flag given
            if (!options.force) {
                common.error('no such file or directory: ' + file, { continue: true });
            }
            return; // skip file
        }
        // If here, path exists
        if (lstats.isFile()) {
            handleFile(file, options);
        }
        else if (lstats.isDirectory()) {
            handleDirectory(file, options);
        }
        else if (lstats.isSymbolicLink()) {
            handleSymbolicLink(file, options);
        }
        else if (lstats.isFIFO()) {
            handleFIFO(file);
        }
    }); // forEach(file)
    return '';
} // rm
module.exports = _rm;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXHJtLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXHNoZWxsanNcXHNyY1xccm0uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUV2QixNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7SUFDekIsVUFBVSxFQUFFO1FBQ1YsR0FBRyxFQUFFLE9BQU87UUFDWixHQUFHLEVBQUUsV0FBVztRQUNoQixHQUFHLEVBQUUsV0FBVztLQUNqQjtDQUNGLENBQUMsQ0FBQztBQUVILDRCQUE0QjtBQUM1Qix3REFBd0Q7QUFDeEQsRUFBRTtBQUNGLGtDQUFrQztBQUNsQyxnQ0FBZ0M7QUFDaEMsRUFBRTtBQUNGLGlDQUFpQztBQUNqQyxxREFBcUQ7QUFDckQsNEJBQTRCLEdBQUcsRUFBRSxLQUFLLEVBQUUsV0FBVztJQUNqRCxJQUFJLEtBQUssQ0FBQztJQUVWLEtBQUssR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRTVCLHVFQUF1RTtJQUN2RSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN0QyxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoQyxJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDM0Isa0JBQWtCLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixJQUFJLENBQUM7b0JBQ0gsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDMUIsQ0FBQztnQkFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNYLDBCQUEwQjtvQkFDMUIsTUFBTSxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLEtBQUssR0FBRyxJQUFJLEVBQUU7d0JBQ25FLFFBQVEsRUFBRSxJQUFJO3FCQUNmLENBQUMsQ0FBQztnQkFDTCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDO0lBRUQsMkRBQTJEO0lBQzNELCtEQUErRDtJQUMvRCxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUM7UUFBQyxNQUFNLENBQUM7SUFFeEIsa0dBQWtHO0lBQ2xHLDJCQUEyQjtJQUUzQixJQUFJLE1BQU0sQ0FBQztJQUNYLElBQUksQ0FBQztRQUNILG9HQUFvRztRQUNwRyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFdkIsd0NBQXdDO1FBQ3hDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNSLElBQUksQ0FBQztnQkFDSCxNQUFNLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDM0IsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDO2dCQUNqRCxLQUFLLENBQUM7WUFDUixDQUFDO1lBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDWiwwQkFBMEI7Z0JBQzFCLDhGQUE4RjtnQkFDOUYsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLE9BQU8sSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLE9BQU8sSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7d0JBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzFDLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDaEMsbURBQW1EO29CQUNuRCxLQUFLLENBQUM7Z0JBQ1IsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDTixNQUFNLEVBQUUsQ0FBQztnQkFDWCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDO0lBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNYLE1BQU0sQ0FBQyxLQUFLLENBQUMsbUNBQW1DLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxLQUFLLEdBQUcsR0FBRyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDL0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDLHFCQUFxQjtBQUV2QixtRUFBbUU7QUFDbkUsa0VBQWtFO0FBQ2xFLHFCQUFxQixJQUFJO0lBQ3ZCLElBQUksZUFBZSxHQUFHLElBQUksQ0FBQztJQUMzQixJQUFJLENBQUM7UUFDSCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ1gsZUFBZSxHQUFHLEtBQUssQ0FBQztJQUMxQixDQUFDO0lBRUQsTUFBTSxDQUFDLGVBQWUsQ0FBQztBQUN6QixDQUFDO0FBRUQsb0JBQW9CLElBQUksRUFBRSxPQUFPO0lBQy9CLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QywyREFBMkQ7UUFDM0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDTixNQUFNLENBQUMsS0FBSyxDQUFDLHFCQUFxQixHQUFHLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7QUFDSCxDQUFDO0FBRUQseUJBQXlCLElBQUksRUFBRSxPQUFPO0lBQ3BDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLDZDQUE2QztRQUM3QyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNOLE1BQU0sQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUMxRCxDQUFDO0FBQ0gsQ0FBQztBQUVELDRCQUE0QixJQUFJLEVBQUUsT0FBTztJQUN2QyxJQUFJLEtBQUssQ0FBQztJQUNWLElBQUksQ0FBQztRQUNILEtBQUssR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ1gsa0RBQWtEO1FBQ2xELE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEIsTUFBTSxDQUFDO0lBQ1QsQ0FBQztJQUVELEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNsQywyREFBMkQ7WUFDM0QsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RCLDZDQUE2QztnQkFDN0MsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDO2dCQUN2QixrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztZQUN2RCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ04sTUFBTSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzFELENBQUM7UUFDSCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTiw0Q0FBNEM7WUFDNUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQixDQUFDO0lBQ0gsQ0FBQztBQUNILENBQUM7QUFFRCxvQkFBb0IsSUFBSTtJQUN0QixNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzFCLENBQUM7QUFFRCxHQUFHO0FBQ0gsd0NBQXdDO0FBQ3hDLGlDQUFpQztBQUNqQyxzQkFBc0I7QUFDdEIsR0FBRztBQUNILGlCQUFpQjtBQUNqQix5QkFBeUI7QUFDekIsR0FBRztBQUNILGFBQWE7QUFDYixHQUFHO0FBQ0gsaUJBQWlCO0FBQ2pCLHdCQUF3QjtBQUN4Qiw0Q0FBNEM7QUFDNUMsK0RBQStEO0FBQy9ELE9BQU87QUFDUCxHQUFHO0FBQ0gsa0JBQWtCO0FBQ2xCLGFBQWEsT0FBTyxFQUFFLEtBQUs7SUFDekIsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFFM0MsbUJBQW1CO0lBQ25CLEtBQUssR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFcEMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLElBQUk7UUFDMUIsSUFBSSxNQUFNLENBQUM7UUFDWCxJQUFJLENBQUM7WUFDSCxJQUFJLFFBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQztrQkFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrREFBa0Q7a0JBQ3BFLElBQUksQ0FBQztZQUNULE1BQU0sR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMscUJBQXFCO1FBQ3hELENBQUM7UUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1gsMkNBQTJDO1lBQzNDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ25CLE1BQU0sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEdBQUcsSUFBSSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDekUsQ0FBQztZQUNELE1BQU0sQ0FBQyxDQUFDLFlBQVk7UUFDdEIsQ0FBQztRQUVELHVCQUF1QjtRQUN2QixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ25DLGtCQUFrQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDM0IsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25CLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQjtJQUNwQixNQUFNLENBQUMsRUFBRSxDQUFDO0FBQ1osQ0FBQyxDQUFDLEtBQUs7QUFDUCxNQUFNLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjb21tb24gPSByZXF1aXJlKCcuL2NvbW1vbicpO1xudmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcblxuY29tbW9uLnJlZ2lzdGVyKCdybScsIF9ybSwge1xuICBjbWRPcHRpb25zOiB7XG4gICAgJ2YnOiAnZm9yY2UnLFxuICAgICdyJzogJ3JlY3Vyc2l2ZScsXG4gICAgJ1InOiAncmVjdXJzaXZlJyxcbiAgfSxcbn0pO1xuXG4vLyBSZWN1cnNpdmVseSByZW1vdmVzICdkaXInXG4vLyBBZGFwdGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL3J5YW5tY2dyYXRoL3dyZW5jaC1qc1xuLy9cbi8vIENvcHlyaWdodCAoYykgMjAxMCBSeWFuIE1jR3JhdGhcbi8vIENvcHlyaWdodCAoYykgMjAxMiBBcnR1ciBBZGliXG4vL1xuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlXG4vLyBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocFxuZnVuY3Rpb24gcm1kaXJTeW5jUmVjdXJzaXZlKGRpciwgZm9yY2UsIGZyb21TeW1saW5rKSB7XG4gIHZhciBmaWxlcztcblxuICBmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKGRpcik7XG5cbiAgLy8gTG9vcCB0aHJvdWdoIGFuZCBkZWxldGUgZXZlcnl0aGluZyBpbiB0aGUgc3ViLXRyZWUgYWZ0ZXIgY2hlY2tpbmcgaXRcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWxlcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBmaWxlID0gZGlyICsgJy8nICsgZmlsZXNbaV07XG4gICAgdmFyIGN1cnJGaWxlID0gZnMubHN0YXRTeW5jKGZpbGUpO1xuXG4gICAgaWYgKGN1cnJGaWxlLmlzRGlyZWN0b3J5KCkpIHsgLy8gUmVjdXJzaXZlIGZ1bmN0aW9uIGJhY2sgdG8gdGhlIGJlZ2lubmluZ1xuICAgICAgcm1kaXJTeW5jUmVjdXJzaXZlKGZpbGUsIGZvcmNlKTtcbiAgICB9IGVsc2UgeyAvLyBBc3N1bWUgaXQncyBhIGZpbGUgLSBwZXJoYXBzIGEgdHJ5L2NhdGNoIGJlbG9uZ3MgaGVyZT9cbiAgICAgIGlmIChmb3JjZSB8fCBpc1dyaXRlYWJsZShmaWxlKSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbW1vbi51bmxpbmtTeW5jKGZpbGUpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICAgICAgICBjb21tb24uZXJyb3IoJ2NvdWxkIG5vdCByZW1vdmUgZmlsZSAoY29kZSAnICsgZS5jb2RlICsgJyk6ICcgKyBmaWxlLCB7XG4gICAgICAgICAgICBjb250aW51ZTogdHJ1ZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHdhcyBkaXJlY3Rvcnkgd2FzIHJlZmVyZW5jZWQgdGhyb3VnaCBhIHN5bWJvbGljIGxpbmssXG4gIC8vIHRoZSBjb250ZW50cyBzaG91bGQgYmUgcmVtb3ZlZCwgYnV0IG5vdCB0aGUgZGlyZWN0b3J5IGl0c2VsZlxuICBpZiAoZnJvbVN5bWxpbmspIHJldHVybjtcblxuICAvLyBOb3cgdGhhdCB3ZSBrbm93IGV2ZXJ5dGhpbmcgaW4gdGhlIHN1Yi10cmVlIGhhcyBiZWVuIGRlbGV0ZWQsIHdlIGNhbiBkZWxldGUgdGhlIG1haW4gZGlyZWN0b3J5LlxuICAvLyBIdXp6YWggZm9yIHRoZSBzaG9wa2VlcC5cblxuICB2YXIgcmVzdWx0O1xuICB0cnkge1xuICAgIC8vIFJldHJ5IG9uIHdpbmRvd3MsIHNvbWV0aW1lcyBpdCB0YWtlcyBhIGxpdHRsZSB0aW1lIGJlZm9yZSBhbGwgdGhlIGZpbGVzIGluIHRoZSBkaXJlY3RvcnkgYXJlIGdvbmVcbiAgICB2YXIgc3RhcnQgPSBEYXRlLm5vdygpO1xuXG4gICAgLy8gVE9ETzogcmVwbGFjZSB0aGlzIHdpdGggYSBmaW5pdGUgbG9vcFxuICAgIGZvciAoOzspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGZzLnJtZGlyU3luYyhkaXIpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhkaXIpKSB0aHJvdyB7IGNvZGU6ICdFQUdBSU4nIH07XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICAgICAgLy8gSW4gYWRkaXRpb24gdG8gZXJyb3IgY29kZXMsIGFsc28gY2hlY2sgaWYgdGhlIGRpcmVjdG9yeSBzdGlsbCBleGlzdHMgYW5kIGxvb3AgYWdhaW4gaWYgdHJ1ZVxuICAgICAgICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJyAmJiAoZXIuY29kZSA9PT0gJ0VOT1RFTVBUWScgfHwgZXIuY29kZSA9PT0gJ0VCVVNZJyB8fCBlci5jb2RlID09PSAnRVBFUk0nIHx8IGVyLmNvZGUgPT09ICdFQUdBSU4nKSkge1xuICAgICAgICAgIGlmIChEYXRlLm5vdygpIC0gc3RhcnQgPiAxMDAwKSB0aHJvdyBlcjtcbiAgICAgICAgfSBlbHNlIGlmIChlci5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgIC8vIERpcmVjdG9yeSBkaWQgbm90IGV4aXN0LCBkZWxldGlvbiB3YXMgc3VjY2Vzc2Z1bFxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IGVyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgY29tbW9uLmVycm9yKCdjb3VsZCBub3QgcmVtb3ZlIGRpcmVjdG9yeSAoY29kZSAnICsgZS5jb2RlICsgJyk6ICcgKyBkaXIsIHsgY29udGludWU6IHRydWUgfSk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufSAvLyBybWRpclN5bmNSZWN1cnNpdmVcblxuLy8gSGFjayB0byBkZXRlcm1pbmUgaWYgZmlsZSBoYXMgd3JpdGUgcGVybWlzc2lvbnMgZm9yIGN1cnJlbnQgdXNlclxuLy8gQXZvaWRzIGhhdmluZyB0byBjaGVjayB1c2VyLCBncm91cCwgZXRjLCBidXQgaXQncyBwcm9iYWJseSBzbG93XG5mdW5jdGlvbiBpc1dyaXRlYWJsZShmaWxlKSB7XG4gIHZhciB3cml0ZVBlcm1pc3Npb24gPSB0cnVlO1xuICB0cnkge1xuICAgIHZhciBfX2ZkID0gZnMub3BlblN5bmMoZmlsZSwgJ2EnKTtcbiAgICBmcy5jbG9zZVN5bmMoX19mZCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB3cml0ZVBlcm1pc3Npb24gPSBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB3cml0ZVBlcm1pc3Npb247XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUZpbGUoZmlsZSwgb3B0aW9ucykge1xuICBpZiAob3B0aW9ucy5mb3JjZSB8fCBpc1dyaXRlYWJsZShmaWxlKSkge1xuICAgIC8vIC1mIHdhcyBwYXNzZWQsIG9yIGZpbGUgaXMgd3JpdGFibGUsIHNvIGl0IGNhbiBiZSByZW1vdmVkXG4gICAgY29tbW9uLnVubGlua1N5bmMoZmlsZSk7XG4gIH0gZWxzZSB7XG4gICAgY29tbW9uLmVycm9yKCdwZXJtaXNzaW9uIGRlbmllZDogJyArIGZpbGUsIHsgY29udGludWU6IHRydWUgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRGlyZWN0b3J5KGZpbGUsIG9wdGlvbnMpIHtcbiAgaWYgKG9wdGlvbnMucmVjdXJzaXZlKSB7XG4gICAgLy8gLXIgd2FzIHBhc3NlZCwgc28gZGlyZWN0b3J5IGNhbiBiZSByZW1vdmVkXG4gICAgcm1kaXJTeW5jUmVjdXJzaXZlKGZpbGUsIG9wdGlvbnMuZm9yY2UpO1xuICB9IGVsc2Uge1xuICAgIGNvbW1vbi5lcnJvcigncGF0aCBpcyBhIGRpcmVjdG9yeScsIHsgY29udGludWU6IHRydWUgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlU3ltYm9saWNMaW5rKGZpbGUsIG9wdGlvbnMpIHtcbiAgdmFyIHN0YXRzO1xuICB0cnkge1xuICAgIHN0YXRzID0gZnMuc3RhdFN5bmMoZmlsZSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBzeW1saW5rIGlzIGJyb2tlbiwgc28gcmVtb3ZlIHRoZSBzeW1saW5rIGl0c2VsZlxuICAgIGNvbW1vbi51bmxpbmtTeW5jKGZpbGUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgIGNvbW1vbi51bmxpbmtTeW5jKGZpbGUpO1xuICB9IGVsc2UgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcbiAgICBpZiAoZmlsZVtmaWxlLmxlbmd0aCAtIDFdID09PSAnLycpIHtcbiAgICAgIC8vIHRyYWlsaW5nIHNlcGFyYXRvciwgc28gcmVtb3ZlIHRoZSBjb250ZW50cywgbm90IHRoZSBsaW5rXG4gICAgICBpZiAob3B0aW9ucy5yZWN1cnNpdmUpIHtcbiAgICAgICAgLy8gLXIgd2FzIHBhc3NlZCwgc28gZGlyZWN0b3J5IGNhbiBiZSByZW1vdmVkXG4gICAgICAgIHZhciBmcm9tU3ltbGluayA9IHRydWU7XG4gICAgICAgIHJtZGlyU3luY1JlY3Vyc2l2ZShmaWxlLCBvcHRpb25zLmZvcmNlLCBmcm9tU3ltbGluayk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21tb24uZXJyb3IoJ3BhdGggaXMgYSBkaXJlY3RvcnknLCB7IGNvbnRpbnVlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBubyB0cmFpbGluZyBzZXBhcmF0b3IsIHNvIHJlbW92ZSB0aGUgbGlua1xuICAgICAgY29tbW9uLnVubGlua1N5bmMoZmlsZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUZJRk8oZmlsZSkge1xuICBjb21tb24udW5saW5rU3luYyhmaWxlKTtcbn1cblxuLy9AXG4vL0AgIyMjIHJtKFtvcHRpb25zLF0gZmlsZSBbLCBmaWxlIC4uLl0pXG4vL0AgIyMjIHJtKFtvcHRpb25zLF0gZmlsZV9hcnJheSlcbi8vQCBBdmFpbGFibGUgb3B0aW9uczpcbi8vQFxuLy9AICsgYC1mYDogZm9yY2Vcbi8vQCArIGAtciwgLVJgOiByZWN1cnNpdmVcbi8vQFxuLy9AIEV4YW1wbGVzOlxuLy9AXG4vL0AgYGBgamF2YXNjcmlwdFxuLy9AIHJtKCctcmYnLCAnL3RtcC8qJyk7XG4vL0Agcm0oJ3NvbWVfZmlsZS50eHQnLCAnYW5vdGhlcl9maWxlLnR4dCcpO1xuLy9AIHJtKFsnc29tZV9maWxlLnR4dCcsICdhbm90aGVyX2ZpbGUudHh0J10pOyAvLyBzYW1lIGFzIGFib3ZlXG4vL0AgYGBgXG4vL0Bcbi8vQCBSZW1vdmVzIGZpbGVzLlxuZnVuY3Rpb24gX3JtKG9wdGlvbnMsIGZpbGVzKSB7XG4gIGlmICghZmlsZXMpIGNvbW1vbi5lcnJvcignbm8gcGF0aHMgZ2l2ZW4nKTtcblxuICAvLyBDb252ZXJ0IHRvIGFycmF5XG4gIGZpbGVzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gIGZpbGVzLmZvckVhY2goZnVuY3Rpb24gKGZpbGUpIHtcbiAgICB2YXIgbHN0YXRzO1xuICAgIHRyeSB7XG4gICAgICB2YXIgZmlsZXBhdGggPSAoZmlsZVtmaWxlLmxlbmd0aCAtIDFdID09PSAnLycpXG4gICAgICAgID8gZmlsZS5zbGljZSgwLCAtMSkgLy8gcmVtb3ZlIHRoZSAnLycgc28gbHN0YXRTeW5jIGNhbiBkZXRlY3Qgc3ltbGlua3NcbiAgICAgICAgOiBmaWxlO1xuICAgICAgbHN0YXRzID0gZnMubHN0YXRTeW5jKGZpbGVwYXRoKTsgLy8gdGVzdCBmb3IgZXhpc3RlbmNlXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gUGF0aCBkb2VzIG5vdCBleGlzdCwgbm8gZm9yY2UgZmxhZyBnaXZlblxuICAgICAgaWYgKCFvcHRpb25zLmZvcmNlKSB7XG4gICAgICAgIGNvbW1vbi5lcnJvcignbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeTogJyArIGZpbGUsIHsgY29udGludWU6IHRydWUgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm47IC8vIHNraXAgZmlsZVxuICAgIH1cblxuICAgIC8vIElmIGhlcmUsIHBhdGggZXhpc3RzXG4gICAgaWYgKGxzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgaGFuZGxlRmlsZShmaWxlLCBvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKGxzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBoYW5kbGVEaXJlY3RvcnkoZmlsZSwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmIChsc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgaGFuZGxlU3ltYm9saWNMaW5rKGZpbGUsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAobHN0YXRzLmlzRklGTygpKSB7XG4gICAgICBoYW5kbGVGSUZPKGZpbGUpO1xuICAgIH1cbiAgfSk7IC8vIGZvckVhY2goZmlsZSlcbiAgcmV0dXJuICcnO1xufSAvLyBybVxubW9kdWxlLmV4cG9ydHMgPSBfcm07XG4iXX0=