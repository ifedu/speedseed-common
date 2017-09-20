var common = require('./common');
var fs = require('fs');
common.register('test', _test, {
    cmdOptions: {
        'b': 'block',
        'c': 'character',
        'd': 'directory',
        'e': 'exists',
        'f': 'file',
        'L': 'link',
        'p': 'pipe',
        'S': 'socket',
    },
    wrapOutput: false,
    allowGlobbing: false,
});
//@
//@ ### test(expression)
//@ Available expression primaries:
//@
//@ + `'-b', 'path'`: true if path is a block device
//@ + `'-c', 'path'`: true if path is a character device
//@ + `'-d', 'path'`: true if path is a directory
//@ + `'-e', 'path'`: true if path exists
//@ + `'-f', 'path'`: true if path is a regular file
//@ + `'-L', 'path'`: true if path is a symbolic link
//@ + `'-p', 'path'`: true if path is a pipe (FIFO)
//@ + `'-S', 'path'`: true if path is a socket
//@
//@ Examples:
//@
//@ ```javascript
//@ if (test('-d', path)) { /* do something with dir */ };
//@ if (!test('-f', path)) continue; // skip if it's a regular file
//@ ```
//@
//@ Evaluates expression using the available primaries and returns corresponding value.
function _test(options, path) {
    if (!path)
        common.error('no path given');
    var canInterpret = false;
    Object.keys(options).forEach(function (key) {
        if (options[key] === true) {
            canInterpret = true;
        }
    });
    if (!canInterpret)
        common.error('could not interpret expression');
    if (options.link) {
        try {
            return fs.lstatSync(path).isSymbolicLink();
        }
        catch (e) {
            return false;
        }
    }
    if (!fs.existsSync(path))
        return false;
    if (options.exists)
        return true;
    var stats = fs.statSync(path);
    if (options.block)
        return stats.isBlockDevice();
    if (options.character)
        return stats.isCharacterDevice();
    if (options.directory)
        return stats.isDirectory();
    if (options.file)
        return stats.isFile();
    /* istanbul ignore next */
    if (options.pipe)
        return stats.isFIFO();
    /* istanbul ignore next */
    if (options.socket)
        return stats.isSocket();
    /* istanbul ignore next */
    return false; // fallback
} // test
module.exports = _test;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXHRlc3QuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xcc2hlbGxqc1xcc3JjXFx0ZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqQyxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFdkIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFO0lBQzdCLFVBQVUsRUFBRTtRQUNWLEdBQUcsRUFBRSxPQUFPO1FBQ1osR0FBRyxFQUFFLFdBQVc7UUFDaEIsR0FBRyxFQUFFLFdBQVc7UUFDaEIsR0FBRyxFQUFFLFFBQVE7UUFDYixHQUFHLEVBQUUsTUFBTTtRQUNYLEdBQUcsRUFBRSxNQUFNO1FBQ1gsR0FBRyxFQUFFLE1BQU07UUFDWCxHQUFHLEVBQUUsUUFBUTtLQUNkO0lBQ0QsVUFBVSxFQUFFLEtBQUs7SUFDakIsYUFBYSxFQUFFLEtBQUs7Q0FDckIsQ0FBQyxDQUFDO0FBR0gsR0FBRztBQUNILHdCQUF3QjtBQUN4QixtQ0FBbUM7QUFDbkMsR0FBRztBQUNILG9EQUFvRDtBQUNwRCx3REFBd0Q7QUFDeEQsaURBQWlEO0FBQ2pELHlDQUF5QztBQUN6QyxvREFBb0Q7QUFDcEQscURBQXFEO0FBQ3JELG1EQUFtRDtBQUNuRCw4Q0FBOEM7QUFDOUMsR0FBRztBQUNILGFBQWE7QUFDYixHQUFHO0FBQ0gsaUJBQWlCO0FBQ2pCLDBEQUEwRDtBQUMxRCxtRUFBbUU7QUFDbkUsT0FBTztBQUNQLEdBQUc7QUFDSCx1RkFBdUY7QUFDdkYsZUFBZSxPQUFPLEVBQUUsSUFBSTtJQUMxQixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7SUFFekMsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDO0lBQ3pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsR0FBRztRQUN4QyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMxQixZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO1FBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0lBRWxFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pCLElBQUksQ0FBQztZQUNILE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzdDLENBQUM7UUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1gsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUNmLENBQUM7SUFDSCxDQUFDO0lBRUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUV2QyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztJQUVoQyxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRTlCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBRWhELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFFeEQsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7SUFFbEQsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7SUFFeEMsMEJBQTBCO0lBQzFCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBRXhDLDBCQUEwQjtJQUMxQixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUU1QywwQkFBMEI7SUFDMUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVc7QUFDM0IsQ0FBQyxDQUFDLE9BQU87QUFDVCxNQUFNLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjb21tb24gPSByZXF1aXJlKCcuL2NvbW1vbicpO1xudmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcblxuY29tbW9uLnJlZ2lzdGVyKCd0ZXN0JywgX3Rlc3QsIHtcbiAgY21kT3B0aW9uczoge1xuICAgICdiJzogJ2Jsb2NrJyxcbiAgICAnYyc6ICdjaGFyYWN0ZXInLFxuICAgICdkJzogJ2RpcmVjdG9yeScsXG4gICAgJ2UnOiAnZXhpc3RzJyxcbiAgICAnZic6ICdmaWxlJyxcbiAgICAnTCc6ICdsaW5rJyxcbiAgICAncCc6ICdwaXBlJyxcbiAgICAnUyc6ICdzb2NrZXQnLFxuICB9LFxuICB3cmFwT3V0cHV0OiBmYWxzZSxcbiAgYWxsb3dHbG9iYmluZzogZmFsc2UsXG59KTtcblxuXG4vL0Bcbi8vQCAjIyMgdGVzdChleHByZXNzaW9uKVxuLy9AIEF2YWlsYWJsZSBleHByZXNzaW9uIHByaW1hcmllczpcbi8vQFxuLy9AICsgYCctYicsICdwYXRoJ2A6IHRydWUgaWYgcGF0aCBpcyBhIGJsb2NrIGRldmljZVxuLy9AICsgYCctYycsICdwYXRoJ2A6IHRydWUgaWYgcGF0aCBpcyBhIGNoYXJhY3RlciBkZXZpY2Vcbi8vQCArIGAnLWQnLCAncGF0aCdgOiB0cnVlIGlmIHBhdGggaXMgYSBkaXJlY3Rvcnlcbi8vQCArIGAnLWUnLCAncGF0aCdgOiB0cnVlIGlmIHBhdGggZXhpc3RzXG4vL0AgKyBgJy1mJywgJ3BhdGgnYDogdHJ1ZSBpZiBwYXRoIGlzIGEgcmVndWxhciBmaWxlXG4vL0AgKyBgJy1MJywgJ3BhdGgnYDogdHJ1ZSBpZiBwYXRoIGlzIGEgc3ltYm9saWMgbGlua1xuLy9AICsgYCctcCcsICdwYXRoJ2A6IHRydWUgaWYgcGF0aCBpcyBhIHBpcGUgKEZJRk8pXG4vL0AgKyBgJy1TJywgJ3BhdGgnYDogdHJ1ZSBpZiBwYXRoIGlzIGEgc29ja2V0XG4vL0Bcbi8vQCBFeGFtcGxlczpcbi8vQFxuLy9AIGBgYGphdmFzY3JpcHRcbi8vQCBpZiAodGVzdCgnLWQnLCBwYXRoKSkgeyAvKiBkbyBzb21ldGhpbmcgd2l0aCBkaXIgKi8gfTtcbi8vQCBpZiAoIXRlc3QoJy1mJywgcGF0aCkpIGNvbnRpbnVlOyAvLyBza2lwIGlmIGl0J3MgYSByZWd1bGFyIGZpbGVcbi8vQCBgYGBcbi8vQFxuLy9AIEV2YWx1YXRlcyBleHByZXNzaW9uIHVzaW5nIHRoZSBhdmFpbGFibGUgcHJpbWFyaWVzIGFuZCByZXR1cm5zIGNvcnJlc3BvbmRpbmcgdmFsdWUuXG5mdW5jdGlvbiBfdGVzdChvcHRpb25zLCBwYXRoKSB7XG4gIGlmICghcGF0aCkgY29tbW9uLmVycm9yKCdubyBwYXRoIGdpdmVuJyk7XG5cbiAgdmFyIGNhbkludGVycHJldCA9IGZhbHNlO1xuICBPYmplY3Qua2V5cyhvcHRpb25zKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICBpZiAob3B0aW9uc1trZXldID09PSB0cnVlKSB7XG4gICAgICBjYW5JbnRlcnByZXQgPSB0cnVlO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKCFjYW5JbnRlcnByZXQpIGNvbW1vbi5lcnJvcignY291bGQgbm90IGludGVycHJldCBleHByZXNzaW9uJyk7XG5cbiAgaWYgKG9wdGlvbnMubGluaykge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZnMubHN0YXRTeW5jKHBhdGgpLmlzU3ltYm9saWNMaW5rKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmICghZnMuZXhpc3RzU3luYyhwYXRoKSkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChvcHRpb25zLmV4aXN0cykgcmV0dXJuIHRydWU7XG5cbiAgdmFyIHN0YXRzID0gZnMuc3RhdFN5bmMocGF0aCk7XG5cbiAgaWYgKG9wdGlvbnMuYmxvY2spIHJldHVybiBzdGF0cy5pc0Jsb2NrRGV2aWNlKCk7XG5cbiAgaWYgKG9wdGlvbnMuY2hhcmFjdGVyKSByZXR1cm4gc3RhdHMuaXNDaGFyYWN0ZXJEZXZpY2UoKTtcblxuICBpZiAob3B0aW9ucy5kaXJlY3RvcnkpIHJldHVybiBzdGF0cy5pc0RpcmVjdG9yeSgpO1xuXG4gIGlmIChvcHRpb25zLmZpbGUpIHJldHVybiBzdGF0cy5pc0ZpbGUoKTtcblxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBpZiAob3B0aW9ucy5waXBlKSByZXR1cm4gc3RhdHMuaXNGSUZPKCk7XG5cbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgaWYgKG9wdGlvbnMuc29ja2V0KSByZXR1cm4gc3RhdHMuaXNTb2NrZXQoKTtcblxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICByZXR1cm4gZmFsc2U7IC8vIGZhbGxiYWNrXG59IC8vIHRlc3Rcbm1vZHVsZS5leHBvcnRzID0gX3Rlc3Q7XG4iXX0=