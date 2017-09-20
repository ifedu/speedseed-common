var path = require('path');
var common = require('./common');
common.register('pwd', _pwd, {
    allowGlobbing: false,
});
//@
//@ ### pwd()
//@ Returns the current directory.
function _pwd() {
    var pwd = path.resolve(process.cwd());
    return pwd;
}
module.exports = _pwd;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXHB3ZC5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXHB3ZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDM0IsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRWpDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRTtJQUMzQixhQUFhLEVBQUUsS0FBSztDQUNyQixDQUFDLENBQUM7QUFFSCxHQUFHO0FBQ0gsYUFBYTtBQUNiLGtDQUFrQztBQUNsQztJQUNFLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDdEMsTUFBTSxDQUFDLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFDRCxNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbInZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIGNvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG5cbmNvbW1vbi5yZWdpc3RlcigncHdkJywgX3B3ZCwge1xuICBhbGxvd0dsb2JiaW5nOiBmYWxzZSxcbn0pO1xuXG4vL0Bcbi8vQCAjIyMgcHdkKClcbi8vQCBSZXR1cm5zIHRoZSBjdXJyZW50IGRpcmVjdG9yeS5cbmZ1bmN0aW9uIF9wd2QoKSB7XG4gIHZhciBwd2QgPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSk7XG4gIHJldHVybiBwd2Q7XG59XG5tb2R1bGUuZXhwb3J0cyA9IF9wd2Q7XG4iXX0=