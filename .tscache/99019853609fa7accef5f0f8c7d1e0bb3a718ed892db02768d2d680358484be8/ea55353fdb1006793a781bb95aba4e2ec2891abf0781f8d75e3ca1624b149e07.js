var fs = require('fs');
var path = require('path');
var common = require('./common');
var _ls = require('./ls');
common.register('find', _find, {});
//@
//@ ### find(path [, path ...])
//@ ### find(path_array)
//@ Examples:
//@
//@ ```javascript
//@ find('src', 'lib');
//@ find(['src', 'lib']); // same as above
//@ find('.').filter(function(file) { return file.match(/\.js$/); });
//@ ```
//@
//@ Returns array of all files (however deep) in the given paths.
//@
//@ The main difference from `ls('-R', path)` is that the resulting file names
//@ include the base directories, e.g. `lib/resources/file1` instead of just `file1`.
function _find(options, paths) {
    if (!paths) {
        common.error('no path specified');
    }
    else if (typeof paths === 'string') {
        paths = [].slice.call(arguments, 1);
    }
    var list = [];
    function pushFile(file) {
        if (process.platform === 'win32') {
            file = file.replace(/\\/g, '/');
        }
        list.push(file);
    }
    // why not simply do ls('-R', paths)? because the output wouldn't give the base dirs
    // to get the base dir in the output, we need instead ls('-R', 'dir/*') for every directory
    paths.forEach(function (file) {
        var stat;
        try {
            stat = fs.statSync(file);
        }
        catch (e) {
            common.error('no such file or directory: ' + file);
        }
        pushFile(file);
        if (stat.isDirectory()) {
            _ls({ recursive: true, all: true }, file).forEach(function (subfile) {
                pushFile(path.join(file, subfile));
            });
        }
    });
    return list;
}
module.exports = _find;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXGZpbmQuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xcc2hlbGxqc1xcc3JjXFxmaW5kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN2QixJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDM0IsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUUxQixNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFbkMsR0FBRztBQUNILCtCQUErQjtBQUMvQix3QkFBd0I7QUFDeEIsYUFBYTtBQUNiLEdBQUc7QUFDSCxpQkFBaUI7QUFDakIsdUJBQXVCO0FBQ3ZCLDBDQUEwQztBQUMxQyxxRUFBcUU7QUFDckUsT0FBTztBQUNQLEdBQUc7QUFDSCxpRUFBaUU7QUFDakUsR0FBRztBQUNILDhFQUE4RTtBQUM5RSxxRkFBcUY7QUFDckYsZUFBZSxPQUFPLEVBQUUsS0FBSztJQUMzQixFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDWCxNQUFNLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLEtBQUssR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVELElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUVkLGtCQUFrQixJQUFJO1FBQ3BCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNqQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsQ0FBQztJQUVELG9GQUFvRjtJQUNwRiwyRkFBMkY7SUFFM0YsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLElBQUk7UUFDMUIsSUFBSSxJQUFJLENBQUM7UUFDVCxJQUFJLENBQUM7WUFDSCxJQUFJLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQixDQUFDO1FBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNYLE1BQU0sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDckQsQ0FBQztRQUVELFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVmLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdkIsR0FBRyxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsT0FBTztnQkFDakUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDckMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUNELE1BQU0sQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIGNvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG52YXIgX2xzID0gcmVxdWlyZSgnLi9scycpO1xuXG5jb21tb24ucmVnaXN0ZXIoJ2ZpbmQnLCBfZmluZCwge30pO1xuXG4vL0Bcbi8vQCAjIyMgZmluZChwYXRoIFssIHBhdGggLi4uXSlcbi8vQCAjIyMgZmluZChwYXRoX2FycmF5KVxuLy9AIEV4YW1wbGVzOlxuLy9AXG4vL0AgYGBgamF2YXNjcmlwdFxuLy9AIGZpbmQoJ3NyYycsICdsaWInKTtcbi8vQCBmaW5kKFsnc3JjJywgJ2xpYiddKTsgLy8gc2FtZSBhcyBhYm92ZVxuLy9AIGZpbmQoJy4nKS5maWx0ZXIoZnVuY3Rpb24oZmlsZSkgeyByZXR1cm4gZmlsZS5tYXRjaCgvXFwuanMkLyk7IH0pO1xuLy9AIGBgYFxuLy9AXG4vL0AgUmV0dXJucyBhcnJheSBvZiBhbGwgZmlsZXMgKGhvd2V2ZXIgZGVlcCkgaW4gdGhlIGdpdmVuIHBhdGhzLlxuLy9AXG4vL0AgVGhlIG1haW4gZGlmZmVyZW5jZSBmcm9tIGBscygnLVInLCBwYXRoKWAgaXMgdGhhdCB0aGUgcmVzdWx0aW5nIGZpbGUgbmFtZXNcbi8vQCBpbmNsdWRlIHRoZSBiYXNlIGRpcmVjdG9yaWVzLCBlLmcuIGBsaWIvcmVzb3VyY2VzL2ZpbGUxYCBpbnN0ZWFkIG9mIGp1c3QgYGZpbGUxYC5cbmZ1bmN0aW9uIF9maW5kKG9wdGlvbnMsIHBhdGhzKSB7XG4gIGlmICghcGF0aHMpIHtcbiAgICBjb21tb24uZXJyb3IoJ25vIHBhdGggc3BlY2lmaWVkJyk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHBhdGhzID09PSAnc3RyaW5nJykge1xuICAgIHBhdGhzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICB9XG5cbiAgdmFyIGxpc3QgPSBbXTtcblxuICBmdW5jdGlvbiBwdXNoRmlsZShmaWxlKSB7XG4gICAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICAgIGZpbGUgPSBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICB9XG4gICAgbGlzdC5wdXNoKGZpbGUpO1xuICB9XG5cbiAgLy8gd2h5IG5vdCBzaW1wbHkgZG8gbHMoJy1SJywgcGF0aHMpPyBiZWNhdXNlIHRoZSBvdXRwdXQgd291bGRuJ3QgZ2l2ZSB0aGUgYmFzZSBkaXJzXG4gIC8vIHRvIGdldCB0aGUgYmFzZSBkaXIgaW4gdGhlIG91dHB1dCwgd2UgbmVlZCBpbnN0ZWFkIGxzKCctUicsICdkaXIvKicpIGZvciBldmVyeSBkaXJlY3RvcnlcblxuICBwYXRocy5mb3JFYWNoKGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgdmFyIHN0YXQ7XG4gICAgdHJ5IHtcbiAgICAgIHN0YXQgPSBmcy5zdGF0U3luYyhmaWxlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb21tb24uZXJyb3IoJ25vIHN1Y2ggZmlsZSBvciBkaXJlY3Rvcnk6ICcgKyBmaWxlKTtcbiAgICB9XG5cbiAgICBwdXNoRmlsZShmaWxlKTtcblxuICAgIGlmIChzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIF9scyh7IHJlY3Vyc2l2ZTogdHJ1ZSwgYWxsOiB0cnVlIH0sIGZpbGUpLmZvckVhY2goZnVuY3Rpb24gKHN1YmZpbGUpIHtcbiAgICAgICAgcHVzaEZpbGUocGF0aC5qb2luKGZpbGUsIHN1YmZpbGUpKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGxpc3Q7XG59XG5tb2R1bGUuZXhwb3J0cyA9IF9maW5kO1xuIl19