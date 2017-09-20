'use strict';
var path = require('path');
var loadJsonFile = require('load-json-file');
var pathType = require('path-type');
module.exports = function (fp, opts) {
    if (typeof fp !== 'string') {
        opts = fp;
        fp = '.';
    }
    opts = opts || {};
    return pathType.dir(fp)
        .then(function (isDir) {
        if (isDir) {
            fp = path.join(fp, 'package.json');
        }
        return loadJsonFile(fp);
    })
        .then(function (x) {
        if (opts.normalize !== false) {
            require('normalize-package-data')(x);
        }
        return x;
    });
};
module.exports.sync = function (fp, opts) {
    if (typeof fp !== 'string') {
        opts = fp;
        fp = '.';
    }
    opts = opts || {};
    fp = pathType.dirSync(fp) ? path.join(fp, 'package.json') : fp;
    var x = loadJsonFile.sync(fp);
    if (opts.normalize !== false) {
        require('normalize-package-data')(x);
    }
    return x;
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyZWFkLXBrZ1xcaW5kZXguanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xccmVhZC1wa2dcXGluZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQztBQUNiLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixJQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUMvQyxJQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFdEMsTUFBTSxDQUFDLE9BQU8sR0FBRyxVQUFDLEVBQUUsRUFBRSxJQUFJO0lBQ3pCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDNUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNWLEVBQUUsR0FBRyxHQUFHLENBQUM7SUFDVixDQUFDO0lBRUQsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFFbEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1NBQ3JCLElBQUksQ0FBQyxVQUFBLEtBQUs7UUFDVixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1gsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFFRCxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pCLENBQUMsQ0FBQztTQUNELElBQUksQ0FBQyxVQUFBLENBQUM7UUFDTixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDOUIsT0FBTyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEMsQ0FBQztRQUVELE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDVixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLFVBQUMsRUFBRSxFQUFFLElBQUk7SUFDOUIsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztRQUM1QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ1YsRUFBRSxHQUFHLEdBQUcsQ0FBQztJQUNWLENBQUM7SUFFRCxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUNsQixFQUFFLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUM7SUFFL0QsSUFBTSxDQUFDLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUVoQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDOUIsT0FBTyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVELE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuY29uc3QgbG9hZEpzb25GaWxlID0gcmVxdWlyZSgnbG9hZC1qc29uLWZpbGUnKTtcbmNvbnN0IHBhdGhUeXBlID0gcmVxdWlyZSgncGF0aC10eXBlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKGZwLCBvcHRzKSA9PiB7XG5cdGlmICh0eXBlb2YgZnAgIT09ICdzdHJpbmcnKSB7XG5cdFx0b3B0cyA9IGZwO1xuXHRcdGZwID0gJy4nO1xuXHR9XG5cblx0b3B0cyA9IG9wdHMgfHwge307XG5cblx0cmV0dXJuIHBhdGhUeXBlLmRpcihmcClcblx0XHQudGhlbihpc0RpciA9PiB7XG5cdFx0XHRpZiAoaXNEaXIpIHtcblx0XHRcdFx0ZnAgPSBwYXRoLmpvaW4oZnAsICdwYWNrYWdlLmpzb24nKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGxvYWRKc29uRmlsZShmcCk7XG5cdFx0fSlcblx0XHQudGhlbih4ID0+IHtcblx0XHRcdGlmIChvcHRzLm5vcm1hbGl6ZSAhPT0gZmFsc2UpIHtcblx0XHRcdFx0cmVxdWlyZSgnbm9ybWFsaXplLXBhY2thZ2UtZGF0YScpKHgpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4geDtcblx0XHR9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnN5bmMgPSAoZnAsIG9wdHMpID0+IHtcblx0aWYgKHR5cGVvZiBmcCAhPT0gJ3N0cmluZycpIHtcblx0XHRvcHRzID0gZnA7XG5cdFx0ZnAgPSAnLic7XG5cdH1cblxuXHRvcHRzID0gb3B0cyB8fCB7fTtcblx0ZnAgPSBwYXRoVHlwZS5kaXJTeW5jKGZwKSA/IHBhdGguam9pbihmcCwgJ3BhY2thZ2UuanNvbicpIDogZnA7XG5cblx0Y29uc3QgeCA9IGxvYWRKc29uRmlsZS5zeW5jKGZwKTtcblxuXHRpZiAob3B0cy5ub3JtYWxpemUgIT09IGZhbHNlKSB7XG5cdFx0cmVxdWlyZSgnbm9ybWFsaXplLXBhY2thZ2UtZGF0YScpKHgpO1xuXHR9XG5cblx0cmV0dXJuIHg7XG59O1xuIl19