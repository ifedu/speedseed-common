'use strict';
var shell = require('shelljs');
var githubUsername = require('github-username');
var nameCache = {};
var emailCache = {};
/**
 * @mixin
 * @alias actions/user
 */
var user = module.exports;
user.git = {};
user.github = {};
/**
 * Retrieves user's name from Git in the global scope or the project scope
 * (it'll take what Git will use in the current context)
 */
user.git.name = function () {
    var name = nameCache[process.cwd()];
    if (name) {
        return name;
    }
    if (shell.which('git')) {
        name = shell.exec('git config --get user.name', { silent: true }).stdout.trim();
        nameCache[process.cwd()] = name;
    }
    return name;
};
/**
 * Retrieves user's email from Git in the global scope or the project scope
 * (it'll take what Git will use in the current context)
 */
user.git.email = function () {
    var email = emailCache[process.cwd()];
    if (email) {
        return email;
    }
    if (shell.which('git')) {
        email = shell.exec('git config --get user.email', { silent: true }).stdout.trim();
        emailCache[process.cwd()] = email;
    }
    return email;
};
/**
 * Retrieves GitHub's username from the GitHub API.
 */
user.github.username = function (cb) {
    var promise = githubUsername(user.git.email());
    if (cb) {
        promise.then(function (val) { return cb(null, val); }, function (err) { return cb(err); });
    }
    return promise;
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZ2VuZXJhdG9yXFxsaWJcXGFjdGlvbnNcXHVzZXIuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xceWVvbWFuLWdlbmVyYXRvclxcbGliXFxhY3Rpb25zXFx1c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQztBQUNiLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUMvQixJQUFJLGNBQWMsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUVoRCxJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFDbkIsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDO0FBRXBCOzs7R0FHRztBQUNILElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFFMUIsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDZCxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztBQUVqQjs7O0dBR0c7QUFFSCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRztJQUNkLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUVwQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ1QsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM5RSxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ2xDLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUY7OztHQUdHO0FBRUgsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUc7SUFDZixJQUFJLEtBQUssR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFFdEMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNWLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkIsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDaEYsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUNwQyxDQUFDO0lBRUQsTUFBTSxDQUFDLEtBQUssQ0FBQztBQUNmLENBQUMsQ0FBQztBQUVGOztHQUVHO0FBRUgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsVUFBVSxFQUFFO0lBQ2pDLElBQUksT0FBTyxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7SUFFL0MsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNQLE9BQU8sQ0FBQyxJQUFJLENBQ1YsVUFBQSxHQUFHLElBQUksT0FBQSxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFiLENBQWEsRUFDcEIsVUFBQSxHQUFHLElBQUksT0FBQSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQVAsQ0FBTyxDQUNmLENBQUM7SUFDSixDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUNqQixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG52YXIgc2hlbGwgPSByZXF1aXJlKCdzaGVsbGpzJyk7XG52YXIgZ2l0aHViVXNlcm5hbWUgPSByZXF1aXJlKCdnaXRodWItdXNlcm5hbWUnKTtcblxudmFyIG5hbWVDYWNoZSA9IHt9O1xudmFyIGVtYWlsQ2FjaGUgPSB7fTtcblxuLyoqXG4gKiBAbWl4aW5cbiAqIEBhbGlhcyBhY3Rpb25zL3VzZXJcbiAqL1xudmFyIHVzZXIgPSBtb2R1bGUuZXhwb3J0cztcblxudXNlci5naXQgPSB7fTtcbnVzZXIuZ2l0aHViID0ge307XG5cbi8qKlxuICogUmV0cmlldmVzIHVzZXIncyBuYW1lIGZyb20gR2l0IGluIHRoZSBnbG9iYWwgc2NvcGUgb3IgdGhlIHByb2plY3Qgc2NvcGVcbiAqIChpdCdsbCB0YWtlIHdoYXQgR2l0IHdpbGwgdXNlIGluIHRoZSBjdXJyZW50IGNvbnRleHQpXG4gKi9cblxudXNlci5naXQubmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG5hbWUgPSBuYW1lQ2FjaGVbcHJvY2Vzcy5jd2QoKV07XG5cbiAgaWYgKG5hbWUpIHtcbiAgICByZXR1cm4gbmFtZTtcbiAgfVxuXG4gIGlmIChzaGVsbC53aGljaCgnZ2l0JykpIHtcbiAgICBuYW1lID0gc2hlbGwuZXhlYygnZ2l0IGNvbmZpZyAtLWdldCB1c2VyLm5hbWUnLCB7c2lsZW50OiB0cnVlfSkuc3Rkb3V0LnRyaW0oKTtcbiAgICBuYW1lQ2FjaGVbcHJvY2Vzcy5jd2QoKV0gPSBuYW1lO1xuICB9XG5cbiAgcmV0dXJuIG5hbWU7XG59O1xuXG4vKipcbiAqIFJldHJpZXZlcyB1c2VyJ3MgZW1haWwgZnJvbSBHaXQgaW4gdGhlIGdsb2JhbCBzY29wZSBvciB0aGUgcHJvamVjdCBzY29wZVxuICogKGl0J2xsIHRha2Ugd2hhdCBHaXQgd2lsbCB1c2UgaW4gdGhlIGN1cnJlbnQgY29udGV4dClcbiAqL1xuXG51c2VyLmdpdC5lbWFpbCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGVtYWlsID0gZW1haWxDYWNoZVtwcm9jZXNzLmN3ZCgpXTtcblxuICBpZiAoZW1haWwpIHtcbiAgICByZXR1cm4gZW1haWw7XG4gIH1cblxuICBpZiAoc2hlbGwud2hpY2goJ2dpdCcpKSB7XG4gICAgZW1haWwgPSBzaGVsbC5leGVjKCdnaXQgY29uZmlnIC0tZ2V0IHVzZXIuZW1haWwnLCB7c2lsZW50OiB0cnVlfSkuc3Rkb3V0LnRyaW0oKTtcbiAgICBlbWFpbENhY2hlW3Byb2Nlc3MuY3dkKCldID0gZW1haWw7XG4gIH1cblxuICByZXR1cm4gZW1haWw7XG59O1xuXG4vKipcbiAqIFJldHJpZXZlcyBHaXRIdWIncyB1c2VybmFtZSBmcm9tIHRoZSBHaXRIdWIgQVBJLlxuICovXG5cbnVzZXIuZ2l0aHViLnVzZXJuYW1lID0gZnVuY3Rpb24gKGNiKSB7XG4gIHZhciBwcm9taXNlID0gZ2l0aHViVXNlcm5hbWUodXNlci5naXQuZW1haWwoKSk7XG5cbiAgaWYgKGNiKSB7XG4gICAgcHJvbWlzZS50aGVuKFxuICAgICAgdmFsID0+IGNiKG51bGwsIHZhbCksXG4gICAgICBlcnIgPT4gY2IoZXJyKVxuICAgICk7XG4gIH1cblxuICByZXR1cm4gcHJvbWlzZTtcbn07XG4iXX0=