/* eslint no-use-before-define:0 */
// Import
var pathUtil = require('path');
var textExtensions = require('textextensions');
var binaryExtensions = require('binaryextensions');
/**
 * Is Text (Synchronous)
 * Determine whether or not a file is a text or binary file.
 * Determined by extension checks first, then if unknown extension, will fallback on encoding detection.
 * We do that as encoding detection cannot guarantee everything, especially for chars between utf8 and utf16
 * @param {?string} filename - the filename for the file/buffer if available
 * @param {?Buffer} buffer - the buffer for the file if available
 * @returns {Error|boolean}
 */
function isTextSync(filename, buffer) {
    // Prepare
    var isText = null;
    // Test extensions
    if (filename) {
        // Extract filename
        var parts = pathUtil.basename(filename).split('.').reverse();
        // Cycle extensions
        for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
            var extension = parts_1[_i];
            if (textExtensions.indexOf(extension) !== -1) {
                isText = true;
                break;
            }
            if (binaryExtensions.indexOf(extension) !== -1) {
                isText = false;
                break;
            }
        }
    }
    // Fallback to encoding if extension check was not enough
    if (buffer && isText === null) {
        isText = getEncodingSync(buffer) === 'utf8';
    }
    // Return our result
    return isText;
}
/**
 * Is Text
 * Uses `isTextSync` behind the scenes.
 * @param {?string} filename - forwarded to `isTextSync`
 * @param {?Buffer} buffer - forwarded to `isTextSync`
 * @param {Function} next - accepts arguments: (error: Error, result: Boolean)
 * @returns {nothing}
 */
function isText(filename, buffer, next) {
    var result = isTextSync(filename, buffer);
    if (result instanceof Error) {
        next(result);
    }
    else {
        next(null, result);
    }
}
/**
 * Is Binary (Synchronous)
 * Uses `isTextSync` behind the scenes.
 * @param {?string} filename - forwarded to `isTextSync`
 * @param {?Buffer} buffer - forwarded to `isTextSync`
 * @returns {Error|boolean}
 */
function isBinarySync(filename, buffer) {
    // Handle
    var result = isTextSync(filename, buffer);
    return result instanceof Error ? result : !result;
}
/**
 * Is Binary
 * Uses `isText` behind the scenes.
 * @param {?string} filename - forwarded to `isText`
 * @param {?Buffer} buffer - forwarded to `isText`
 * @param {Function} next - accepts arguments: (error: Error, result: Boolean)
 * @returns {nothing}
 */
function isBinary(filename, buffer, next) {
    // Handle
    isText(filename, buffer, function (err, result) {
        if (err)
            return next(err);
        return next(null, !result);
    });
}
/**
 * Get the encoding of a buffer.
 * We fetch a bunch chars from the start, middle and end of the buffer.
 * We check all three, as doing only start was not enough, and doing only middle was not enough, so better safe than sorry.
 * @param {Buffer} buffer
 * @param {?Object} [opts]
 * @param {?number} [opts.chunkLength = 24]
 * @param {?number} [opts.chunkBegin = 0]
 * @returns {Error|string} either an Error instance if something went wrong, or if successful "utf8" or "binary"
 */
function getEncodingSync(buffer, opts) {
    // Prepare
    var textEncoding = 'utf8';
    var binaryEncoding = 'binary';
    // Discover
    if (opts == null) {
        // Start
        var chunkLength = 24;
        var encoding = getEncodingSync(buffer, { chunkLength: chunkLength });
        if (encoding === textEncoding) {
            // Middle
            var chunkBegin = Math.max(0, Math.floor(buffer.length / 2) - chunkLength);
            encoding = getEncodingSync(buffer, { chunkLength: chunkLength, chunkBegin: chunkBegin });
            if (encoding === textEncoding) {
                // End
                chunkBegin = Math.max(0, buffer.length - chunkLength);
                encoding = getEncodingSync(buffer, { chunkLength: chunkLength, chunkBegin: chunkBegin });
            }
        }
        // Return
        return encoding;
    }
    else {
        // Extract
        var _a = opts.chunkLength, chunkLength = _a === void 0 ? 24 : _a, _b = opts.chunkBegin, chunkBegin = _b === void 0 ? 0 : _b;
        var chunkEnd = Math.min(buffer.length, chunkBegin + chunkLength);
        var contentChunkUTF8 = buffer.toString(textEncoding, chunkBegin, chunkEnd);
        var encoding = textEncoding;
        // Detect encoding
        for (var i = 0; i < contentChunkUTF8.length; ++i) {
            var charCode = contentChunkUTF8.charCodeAt(i);
            if (charCode === 65533 || charCode <= 8) {
                // 8 and below are control characters (e.g. backspace, null, eof, etc.)
                // 65533 is the unknown character
                // console.log(charCode, contentChunkUTF8[i])
                encoding = binaryEncoding;
                break;
            }
        }
        // Return
        return encoding;
    }
}
/**
 * Get the encoding of a buffer
 * Uses `getEncodingSync` behind the scenes.
 * @param {Buffer} buffer - forwarded to `getEncodingSync`
 * @param {Object} opts - forwarded to `getEncodingSync`
 * @param {Function} next - accepts arguments: (error: Error, result: Boolean)
 * @returns {nothing}
 */
function getEncoding(buffer, opts, next) {
    // Fetch and wrap result
    var result = getEncodingSync(buffer, opts);
    if (result instanceof Error) {
        next(result);
    }
    else {
        next(null, result);
    }
}
// Export
module.exports = { isTextSync: isTextSync, isText: isText, isBinarySync: isBinarySync, isBinary: isBinary, getEncodingSync: getEncodingSync, getEncoding: getEncoding };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxpc3RleHRvcmJpbmFyeVxcc291cmNlXFxpbmRleC5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxpc3RleHRvcmJpbmFyeVxcc291cmNlXFxpbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxtQ0FBbUM7QUFFbkMsU0FBUztBQUNULElBQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUNoQyxJQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtBQUNoRCxJQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0FBRXBEOzs7Ozs7OztHQVFHO0FBQ0gsb0JBQXFCLFFBQVEsRUFBRSxNQUFNO0lBQ3BDLFVBQVU7SUFDVixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUE7SUFFakIsa0JBQWtCO0lBQ2xCLEVBQUUsQ0FBQyxDQUFFLFFBQVMsQ0FBQyxDQUFDLENBQUM7UUFDaEIsbUJBQW1CO1FBQ25CLElBQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRTlELG1CQUFtQjtRQUNuQixHQUFHLENBQUMsQ0FBcUIsVUFBSyxFQUFMLGVBQUssRUFBTCxtQkFBSyxFQUFMLElBQUs7WUFBeEIsSUFBTSxTQUFTLGNBQUE7WUFDcEIsRUFBRSxDQUFDLENBQUUsY0FBYyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUUsQ0FBQyxD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RSxJQUFJLEVBQUUsSUFBSTtJQUN2Qyx3QkFBd0I7SUFDeEIsSUFBTSxNQUFNLEdBQUcsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUM1QyxFQUFFLENBQUMsQ0FBRSxNQUFNLFlBQVksS0FBTSxDQUFDLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDYixDQUFDO0lBQ0QsSUFBSSxDQUFDLENBQUM7UUFDTCxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ25CLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUztBQUNULE1BQU0sQ0FBQyxPQUFPLEdBQUcsRUFBQyxVQUFVLFlBQUEsRUFBRSxNQUFNLFFBQUEsRUFBRSxZQUFZLGNBQUEsRUFBRSxRQUFRLFVBQUEsRUFBRSxlQUFlLGlCQUFBLEVBQUUsV0FBVyxhQUFBLEVBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludCBuby11c2UtYmVmb3JlLWRlZmluZTowICovXG5cbi8vIEltcG9ydFxuY29uc3QgcGF0aFV0aWwgPSByZXF1aXJlKCdwYXRoJylcbmNvbnN0IHRleHRFeHRlbnNpb25zID0gcmVxdWlyZSgndGV4dGV4dGVuc2lvbnMnKVxuY29uc3QgYmluYXJ5RXh0ZW5zaW9ucyA9IHJlcXVpcmUoJ2JpbmFyeWV4dGVuc2lvbnMnKVxuXG4vKipcbiAqIElzIFRleHQgKFN5bmNocm9ub3VzKVxuICogRGV0ZXJtaW5lIHdoZXRoZXIgb3Igbm90IGEgZmlsZSBpcyBhIHRleHQgb3IgYmluYXJ5IGZpbGUuXG4gKiBEZXRlcm1pbmVkIGJ5IGV4dGVuc2lvbiBjaGVja3MgZmlyc3QsIHRoZW4gaWYgdW5rbm93biBleHRlbnNpb24sIHdpbGwgZmFsbGJhY2sgb24gZW5jb2RpbmcgZGV0ZWN0aW9uLlxuICogV2UgZG8gdGhhdCBhcyBlbmNvZGluZyBkZXRlY3Rpb24gY2Fubm90IGd1YXJhbnRlZSBldmVyeXRoaW5nLCBlc3BlY2lhbGx5IGZvciBjaGFycyBiZXR3ZWVuIHV0ZjggYW5kIHV0ZjE2XG4gKiBAcGFyYW0gez9zdHJpbmd9IGZpbGVuYW1lIC0gdGhlIGZpbGVuYW1lIGZvciB0aGUgZmlsZS9idWZmZXIgaWYgYXZhaWxhYmxlXG4gKiBAcGFyYW0gez9CdWZmZXJ9IGJ1ZmZlciAtIHRoZSBidWZmZXIgZm9yIHRoZSBmaWxlIGlmIGF2YWlsYWJsZVxuICogQHJldHVybnMge0Vycm9yfGJvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzVGV4dFN5bmMgKGZpbGVuYW1lLCBidWZmZXIpIHtcblx0Ly8gUHJlcGFyZVxuXHRsZXQgaXNUZXh0ID0gbnVsbFxuXG5cdC8vIFRlc3QgZXh0ZW5zaW9uc1xuXHRpZiAoIGZpbGVuYW1lICkge1xuXHRcdC8vIEV4dHJhY3QgZmlsZW5hbWVcblx0XHRjb25zdCBwYXJ0cyA9IHBhdGhVdGlsLmJhc2VuYW1lKGZpbGVuYW1lKS5zcGxpdCgnLicpLnJldmVyc2UoKVxuXG5cdFx0Ly8gQ3ljbGUgZXh0ZW5zaW9uc1xuXHRcdGZvciAoIGNvbnN0IGV4dGVuc2lvbiBvZiBwYXJ0cyApIHtcblx0XHRcdGlmICggdGV4dEV4dGVuc2lvbnMuaW5kZXhPZihleHRlbnNpb24pICE9PSAtMSApIHtcblx0XHRcdFx0aXNUZXh0ID0gdHJ1ZVxuXHRcdFx0XHRicmVha1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBiaW5hcnlFeHRlbnNpb25zLmluZGV4T2YoZXh0ZW5zaW9uKSAhPT0gLTEgKSB7XG5cdFx0XHRcdGlzVGV4dCA9IGZhbHNlXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gRmFsbGJhY2sgdG8gZW5jb2RpbmcgaWYgZXh0ZW5zaW9uIGNoZWNrIHdhcyBub3QgZW5vdWdoXG5cdGlmICggYnVmZmVyICYmIGlzVGV4dCA9PT0gbnVsbCApIHtcblx0XHRpc1RleHQgPSBnZXRFbmNvZGluZ1N5bmMoYnVmZmVyKSA9PT0gJ3V0ZjgnXG5cdH1cblxuXHQvLyBSZXR1cm4gb3VyIHJlc3VsdFxuXHRyZXR1cm4gaXNUZXh0XG59XG5cbi8qKlxuICogSXMgVGV4dFxuICogVXNlcyBgaXNUZXh0U3luY2AgYmVoaW5kIHRoZSBzY2VuZXMuXG4gKiBAcGFyYW0gez9zdHJpbmd9IGZpbGVuYW1lIC0gZm9yd2FyZGVkIHRvIGBpc1RleHRTeW5jYFxuICogQHBhcmFtIHs/QnVmZmVyfSBidWZmZXIgLSBmb3J3YXJkZWQgdG8gYGlzVGV4dFN5bmNgXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0IC0gYWNjZXB0cyBhcmd1bWVudHM6IChlcnJvcjogRXJyb3IsIHJlc3VsdDogQm9vbGVhbilcbiAqIEByZXR1cm5zIHtub3RoaW5nfVxuICovXG5mdW5jdGlvbiBpc1RleHQgKGZpbGVuYW1lLCBidWZmZXIsIG5leHQpIHtcblx0Y29uc3QgcmVzdWx0ID0gaXNUZXh0U3luYyhmaWxlbmFtZSwgYnVmZmVyKVxuXHRpZiAoIHJlc3VsdCBpbnN0YW5jZW9mIEVycm9yICkge1xuXHRcdG5leHQocmVzdWx0KVxuXHR9XG5cdGVsc2Uge1xuXHRcdG5leHQobnVsbCwgcmVzdWx0KVxuXHR9XG59XG5cbi8qKlxuICogSXMgQmluYXJ5IChTeW5jaHJvbm91cylcbiAqIFVzZXMgYGlzVGV4dFN5bmNgIGJlaGluZCB0aGUgc2NlbmVzLlxuICogQHBhcmFtIHs/c3RyaW5nfSBmaWxlbmFtZSAtIGZvcndhcmRlZCB0byBgaXNUZXh0U3luY2BcbiAqIEBwYXJhbSB7P0J1ZmZlcn0gYnVmZmVyIC0gZm9yd2FyZGVkIHRvIGBpc1RleHRTeW5jYFxuICogQHJldHVybnMge0Vycm9yfGJvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzQmluYXJ5U3luYyAoZmlsZW5hbWUsIGJ1ZmZlcikge1xuXHQvLyBIYW5kbGVcblx0Y29uc3QgcmVzdWx0ID0gaXNUZXh0U3luYyhmaWxlbmFtZSwgYnVmZmVyKVxuXHRyZXR1cm4gcmVzdWx0IGluc3RhbmNlb2YgRXJyb3IgPyByZXN1bHQgOiAhcmVzdWx0XG59XG5cbi8qKlxuICogSXMgQmluYXJ5XG4gKiBVc2VzIGBpc1RleHRgIGJlaGluZCB0aGUgc2NlbmVzLlxuICogQHBhcmFtIHs/c3RyaW5nfSBmaWxlbmFtZSAtIGZvcndhcmRlZCB0byBgaXNUZXh0YFxuICogQHBhcmFtIHs/QnVmZmVyfSBidWZmZXIgLSBmb3J3YXJkZWQgdG8gYGlzVGV4dGBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHQgLSBhY2NlcHRzIGFyZ3VtZW50czogKGVycm9yOiBFcnJvciwgcmVzdWx0OiBCb29sZWFuKVxuICogQHJldHVybnMge25vdGhpbmd9XG4gKi9cbmZ1bmN0aW9uIGlzQmluYXJ5IChmaWxlbmFtZSwgYnVmZmVyLCBuZXh0KSB7XG5cdC8vIEhhbmRsZVxuXHRpc1RleHQoZmlsZW5hbWUsIGJ1ZmZlciwgZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG5cdFx0aWYgKCBlcnIgKSAgcmV0dXJuIG5leHQoZXJyKVxuXHRcdHJldHVybiBuZXh0KG51bGwsICFyZXN1bHQpXG5cdH0pXG59XG5cbi8qKlxuICogR2V0IHRoZSBlbmNvZGluZyBvZiBhIGJ1ZmZlci5cbiAqIFdlIGZldGNoIGEgYnVuY2ggY2hhcnMgZnJvbSB0aGUgc3RhcnQsIG1pZGRsZSBhbmQgZW5kIG9mIHRoZSBidWZmZXIuXG4gKiBXZSBjaGVjayBhbGwgdGhyZWUsIGFzIGRvaW5nIG9ubHkgc3RhcnQgd2FzIG5vdCBlbm91Z2gsIGFuZCBkb2luZyBvbmx5IG1pZGRsZSB3YXMgbm90IGVub3VnaCwgc28gYmV0dGVyIHNhZmUgdGhhbiBzb3JyeS5cbiAqIEBwYXJhbSB7QnVmZmVyfSBidWZmZXJcbiAqIEBwYXJhbSB7P09iamVjdH0gW29wdHNdXG4gKiBAcGFyYW0gez9udW1iZXJ9IFtvcHRzLmNodW5rTGVuZ3RoID0gMjRdXG4gKiBAcGFyYW0gez9udW1iZXJ9IFtvcHRzLmNodW5rQmVnaW4gPSAwXVxuICogQHJldHVybnMge0Vycm9yfHN0cmluZ30gZWl0aGVyIGFuIEVycm9yIGluc3RhbmNlIGlmIHNvbWV0aGluZyB3ZW50IHdyb25nLCBvciBpZiBzdWNjZXNzZnVsIFwidXRmOFwiIG9yIFwiYmluYXJ5XCJcbiAqL1xuZnVuY3Rpb24gZ2V0RW5jb2RpbmdTeW5jIChidWZmZXIsIG9wdHMpIHtcblx0Ly8gUHJlcGFyZVxuXHRjb25zdCB0ZXh0RW5jb2RpbmcgPSAndXRmOCdcblx0Y29uc3QgYmluYXJ5RW5jb2RpbmcgPSAnYmluYXJ5J1xuXG5cdC8vIERpc2NvdmVyXG5cdGlmICggb3B0cyA9PSBudWxsICkge1xuXHRcdC8vIFN0YXJ0XG5cdFx0Y29uc3QgY2h1bmtMZW5ndGggPSAyNFxuXHRcdGxldCBlbmNvZGluZyA9IGdldEVuY29kaW5nU3luYyhidWZmZXIsIHtjaHVua0xlbmd0aH0pXG5cdFx0aWYgKCBlbmNvZGluZyA9PT0gdGV4dEVuY29kaW5nICkge1xuXHRcdFx0Ly8gTWlkZGxlXG5cdFx0XHRsZXQgY2h1bmtCZWdpbiA9IE1hdGgubWF4KDAsIE1hdGguZmxvb3IoYnVmZmVyLmxlbmd0aCAvIDIpIC0gY2h1bmtMZW5ndGgpXG5cdFx0XHRlbmNvZGluZyA9IGdldEVuY29kaW5nU3luYyhidWZmZXIsIHtjaHVua0xlbmd0aCwgY2h1bmtCZWdpbn0pXG5cdFx0XHRpZiAoIGVuY29kaW5nID09PSB0ZXh0RW5jb2RpbmcgKSB7XG5cdFx0XHRcdC8vIEVuZFxuXHRcdFx0XHRjaHVua0JlZ2luID0gTWF0aC5tYXgoMCwgYnVmZmVyLmxlbmd0aCAtIGNodW5rTGVuZ3RoKVxuXHRcdFx0XHRlbmNvZGluZyA9IGdldEVuY29kaW5nU3luYyhidWZmZXIsIHtjaHVua0xlbmd0aCwgY2h1bmtCZWdpbn0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuXG5cdFx0cmV0dXJuIGVuY29kaW5nXG5cdH1cblx0ZWxzZSB7XG5cdFx0Ly8gRXh0cmFjdFxuXHRcdGNvbnN0IHtjaHVua0xlbmd0aCA9IDI0LCBjaHVua0JlZ2luID0gMH0gPSBvcHRzXG5cdFx0Y29uc3QgY2h1bmtFbmQgPSBNYXRoLm1pbihidWZmZXIubGVuZ3RoLCBjaHVua0JlZ2luICsgY2h1bmtMZW5ndGgpXG5cdFx0Y29uc3QgY29udGVudENodW5rVVRGOCA9IGJ1ZmZlci50b1N0cmluZyh0ZXh0RW5jb2RpbmcsIGNodW5rQmVnaW4sIGNodW5rRW5kKVxuXHRcdGxldCBlbmNvZGluZyA9IHRleHRFbmNvZGluZ1xuXG5cdFx0Ly8gRGV0ZWN0IGVuY29kaW5nXG5cdFx0Zm9yICggbGV0IGkgPSAwOyBpIDwgY29udGVudENodW5rVVRGOC5sZW5ndGg7ICsraSApIHtcblx0XHRcdGNvbnN0IGNoYXJDb2RlID0gY29udGVudENodW5rVVRGOC5jaGFyQ29kZUF0KGkpXG5cdFx0XHRpZiAoIGNoYXJDb2RlID09PSA2NTUzMyB8fCBjaGFyQ29kZSA8PSA4ICkge1xuXHRcdFx0XHQvLyA4IGFuZCBiZWxvdyBhcmUgY29udHJvbCBjaGFyYWN0ZXJzIChlLmcuIGJhY2tzcGFjZSwgbnVsbCwgZW9mLCBldGMuKVxuXHRcdFx0XHQvLyA2NTUzMyBpcyB0aGUgdW5rbm93biBjaGFyYWN0ZXJcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coY2hhckNvZGUsIGNvbnRlbnRDaHVua1VURjhbaV0pXG5cdFx0XHRcdGVuY29kaW5nID0gYmluYXJ5RW5jb2Rpbmdcblx0XHRcdFx0YnJlYWtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBSZXR1cm5cblx0XHRyZXR1cm4gZW5jb2Rpbmdcblx0fVxufVxuXG4vKipcbiAqIEdldCB0aGUgZW5jb2Rpbmcgb2YgYSBidWZmZXJcbiAqIFVzZXMgYGdldEVuY29kaW5nU3luY2AgYmVoaW5kIHRoZSBzY2VuZXMuXG4gKiBAcGFyYW0ge0J1ZmZlcn0gYnVmZmVyIC0gZm9yd2FyZGVkIHRvIGBnZXRFbmNvZGluZ1N5bmNgXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyAtIGZvcndhcmRlZCB0byBgZ2V0RW5jb2RpbmdTeW5jYFxuICogQHBhcmFtIHtGdW5jdGlvbn0gbmV4dCAtIGFjY2VwdHMgYXJndW1lbnRzOiAoZXJyb3I6IEVycm9yLCByZXN1bHQ6IEJvb2xlYW4pXG4gKiBAcmV0dXJucyB7bm90aGluZ31cbiAqL1xuZnVuY3Rpb24gZ2V0RW5jb2RpbmcgKGJ1ZmZlciwgb3B0cywgbmV4dCkge1xuXHQvLyBGZXRjaCBhbmQgd3JhcCByZXN1bHRcblx0Y29uc3QgcmVzdWx0ID0gZ2V0RW5jb2RpbmdTeW5jKGJ1ZmZlciwgb3B0cylcblx0aWYgKCByZXN1bHQgaW5zdGFuY2VvZiBFcnJvciApIHtcblx0XHRuZXh0KHJlc3VsdClcblx0fVxuXHRlbHNlIHtcblx0XHRuZXh0KG51bGwsIHJlc3VsdClcblx0fVxufVxuXG4vLyBFeHBvcnRcbm1vZHVsZS5leHBvcnRzID0ge2lzVGV4dFN5bmMsIGlzVGV4dCwgaXNCaW5hcnlTeW5jLCBpc0JpbmFyeSwgZ2V0RW5jb2RpbmdTeW5jLCBnZXRFbmNvZGluZ31cbiJdfQ==