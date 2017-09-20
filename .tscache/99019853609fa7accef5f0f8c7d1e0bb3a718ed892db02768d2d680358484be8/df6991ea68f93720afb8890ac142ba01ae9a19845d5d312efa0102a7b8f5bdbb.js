/*
 * EJS Embedded JavaScript templates
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/
/**
 * Private utility functions
 * @module utils
 * @private
 */
'use strict';
var regExpChars = /[|\\{}()[\]^$+*?.]/g;
/**
 * Escape characters reserved in regular expressions.
 *
 * If `string` is `undefined` or `null`, the empty string is returned.
 *
 * @param {String} string Input string
 * @return {String} Escaped string
 * @static
 * @private
 */
exports.escapeRegExpChars = function (string) {
    // istanbul ignore if
    if (!string) {
        return '';
    }
    return String(string).replace(regExpChars, '\\$&');
};
var _ENCODE_HTML_RULES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&#34;',
    "'": '&#39;'
};
var _MATCH_HTML = /[&<>\'"]/g;
function encode_char(c) {
    return _ENCODE_HTML_RULES[c] || c;
}
/**
 * Stringified version of constants used by {@link module:utils.escapeXML}.
 *
 * It is used in the process of generating {@link ClientFunction}s.
 *
 * @readonly
 * @type {String}
 */
var escapeFuncStr = 'var _ENCODE_HTML_RULES = {\n'
    + '      "&": "&amp;"\n'
    + '    , "<": "&lt;"\n'
    + '    , ">": "&gt;"\n'
    + '    , \'"\': "&#34;"\n'
    + '    , "\'": "&#39;"\n'
    + '    }\n'
    + '  , _MATCH_HTML = /[&<>\'"]/g;\n'
    + 'function encode_char(c) {\n'
    + '  return _ENCODE_HTML_RULES[c] || c;\n'
    + '};\n';
/**
 * Escape characters reserved in XML.
 *
 * If `markup` is `undefined` or `null`, the empty string is returned.
 *
 * @implements {EscapeCallback}
 * @param {String} markup Input string
 * @return {String} Escaped string
 * @static
 * @private
 */
exports.escapeXML = function (markup) {
    return markup == undefined
        ? ''
        : String(markup)
            .replace(_MATCH_HTML, encode_char);
};
exports.escapeXML.toString = function () {
    return Function.prototype.toString.call(this) + ';\n' + escapeFuncStr;
};
/**
 * Naive copy of properties from one object to another.
 * Does not recurse into non-scalar properties
 * Does not check to see if the property has a value before copying
 *
 * @param  {Object} to   Destination object
 * @param  {Object} from Source object
 * @return {Object}      Destination object
 * @static
 * @private
 */
exports.shallowCopy = function (to, from) {
    from = from || {};
    for (var p in from) {
        to[p] = from[p];
    }
    return to;
};
/**
 * Naive copy of a list of key names, from one object to another.
 * Only copies property if it is actually defined
 * Does not recurse into non-scalar properties
 *
 * @param  {Object} to   Destination object
 * @param  {Object} from Source object
 * @param  {Array} list List of properties to copy
 * @return {Object}      Destination object
 * @static
 * @private
 */
exports.shallowCopyFromList = function (to, from, list) {
    for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (typeof from[p] != 'undefined') {
            to[p] = from[p];
        }
    }
    return to;
};
/**
 * Simple in-process cache implementation. Does not implement limits of any
 * sort.
 *
 * @implements Cache
 * @static
 * @private
 */
exports.cache = {
    _data: {},
    set: function (key, val) {
        this._data[key] = val;
    },
    get: function (key) {
        return this._data[key];
    },
    reset: function () {
        this._data = {};
    }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxlanNcXGxpYlxcdXRpbHMuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xcZWpzXFxsaWJcXHV0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7O0VBZ0JFO0FBRUY7Ozs7R0FJRztBQUVILFlBQVksQ0FBQztBQUViLElBQUksV0FBVyxHQUFHLHFCQUFxQixDQUFDO0FBRXhDOzs7Ozs7Ozs7R0FTRztBQUNILE9BQU8sQ0FBQyxpQkFBaUIsR0FBRyxVQUFVLE1BQU07SUFDMUMscUJBQXFCO0lBQ3JCLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNaLE1BQU0sQ0FBQyxFQUFFLENBQUM7SUFDWixDQUFDO0lBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3JELENBQUMsQ0FBQztBQUVGLElBQUksa0JBQWtCLEdBQUc7SUFDdkIsR0FBRyxFQUFFLE9BQU87SUFDWixHQUFHLEVBQUUsTUFBTTtJQUNYLEdBQUcsRUFBRSxNQUFNO0lBQ1gsR0FBRyxFQUFFLE9BQU87SUFDWixHQUFHLEVBQUUsT0FBTztDQUNiLENBQUM7QUFDRixJQUFJLFdBQVcsR0FBRyxXQUFXLENBQUM7QUFFOUIscUJBQXFCLENBQUM7SUFDcEIsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQyxDQUFDO0FBRUQ7Ozs7Ozs7R0FPRztBQUVILElBQUksYUFBYSxHQUNmLDhCQUE4QjtNQUM5QixzQkFBc0I7TUFDdEIscUJBQXFCO01BQ3JCLHFCQUFxQjtNQUNyQix3QkFBd0I7TUFDeEIsdUJBQXVCO01BQ3ZCLFNBQVM7TUFDVCxrQ0FBa0M7TUFDbEMsNkJBQTZCO01BQzdCLHdDQUF3QztNQUN4QyxNQUFNLENBQUM7QUFFVDs7Ozs7Ozs7OztHQVVHO0FBRUgsT0FBTyxDQUFDLFNBQVMsR0FBRyxVQUFVLE1BQU07SUFDbEMsTUFBTSxDQUFDLE1BQU0sSUFBSSxTQUFTO1VBQ3RCLEVBQUU7VUFDRixNQUFNLENBQUMsTUFBTSxDQUFDO2FBQ1gsT0FBTyxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUM7QUFDRixPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRztJQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxhQUFhLENBQUM7QUFDeEUsQ0FBQyxDQUFDO0FBRUY7Ozs7Ozs7Ozs7R0FVRztBQUNILE9BQU8sQ0FBQyxXQUFXLEdBQUcsVUFBVSxFQUFFLEVBQUUsSUFBSTtJQUN0QyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUNsQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ25CLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsQ0FBQztJQUNELE1BQU0sQ0FBQyxFQUFFLENBQUM7QUFDWixDQUFDLENBQUM7QUFFRjs7Ozs7Ozs7Ozs7R0FXRztBQUNILE9BQU8sQ0FBQyxtQkFBbUIsR0FBRyxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSTtJQUNwRCxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNyQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEIsRUFBRSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNsQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLENBQUM7SUFDSCxDQUFDO0lBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FBQztBQUNaLENBQUMsQ0FBQztBQUVGOzs7Ozs7O0dBT0c7QUFDSCxPQUFPLENBQUMsS0FBSyxHQUFHO0lBQ2QsS0FBSyxFQUFFLEVBQUU7SUFDVCxHQUFHLEVBQUUsVUFBVSxHQUFHLEVBQUUsR0FBRztRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUN4QixDQUFDO0lBQ0QsR0FBRyxFQUFFLFVBQVUsR0FBRztRQUNoQixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBQ0QsS0FBSyxFQUFFO1FBQ0wsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7SUFDbEIsQ0FBQztDQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogRUpTIEVtYmVkZGVkIEphdmFTY3JpcHQgdGVtcGxhdGVzXG4gKiBDb3B5cmlnaHQgMjExMiBNYXR0aGV3IEVlcm5pc3NlIChtZGVAZmxlZWdpeC5vcmcpXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4qL1xuXG4vKipcbiAqIFByaXZhdGUgdXRpbGl0eSBmdW5jdGlvbnNcbiAqIEBtb2R1bGUgdXRpbHNcbiAqIEBwcml2YXRlXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVnRXhwQ2hhcnMgPSAvW3xcXFxce30oKVtcXF1eJCsqPy5dL2c7XG5cbi8qKlxuICogRXNjYXBlIGNoYXJhY3RlcnMgcmVzZXJ2ZWQgaW4gcmVndWxhciBleHByZXNzaW9ucy5cbiAqXG4gKiBJZiBgc3RyaW5nYCBpcyBgdW5kZWZpbmVkYCBvciBgbnVsbGAsIHRoZSBlbXB0eSBzdHJpbmcgaXMgcmV0dXJuZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyBJbnB1dCBzdHJpbmdcbiAqIEByZXR1cm4ge1N0cmluZ30gRXNjYXBlZCBzdHJpbmdcbiAqIEBzdGF0aWNcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydHMuZXNjYXBlUmVnRXhwQ2hhcnMgPSBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gIC8vIGlzdGFuYnVsIGlnbm9yZSBpZlxuICBpZiAoIXN0cmluZykge1xuICAgIHJldHVybiAnJztcbiAgfVxuICByZXR1cm4gU3RyaW5nKHN0cmluZykucmVwbGFjZShyZWdFeHBDaGFycywgJ1xcXFwkJicpO1xufTtcblxudmFyIF9FTkNPREVfSFRNTF9SVUxFUyA9IHtcbiAgJyYnOiAnJmFtcDsnLFxuICAnPCc6ICcmbHQ7JyxcbiAgJz4nOiAnJmd0OycsXG4gICdcIic6ICcmIzM0OycsXG4gIFwiJ1wiOiAnJiMzOTsnXG59O1xudmFyIF9NQVRDSF9IVE1MID0gL1smPD5cXCdcIl0vZztcblxuZnVuY3Rpb24gZW5jb2RlX2NoYXIoYykge1xuICByZXR1cm4gX0VOQ09ERV9IVE1MX1JVTEVTW2NdIHx8IGM7XG59XG5cbi8qKlxuICogU3RyaW5naWZpZWQgdmVyc2lvbiBvZiBjb25zdGFudHMgdXNlZCBieSB7QGxpbmsgbW9kdWxlOnV0aWxzLmVzY2FwZVhNTH0uXG4gKlxuICogSXQgaXMgdXNlZCBpbiB0aGUgcHJvY2VzcyBvZiBnZW5lcmF0aW5nIHtAbGluayBDbGllbnRGdW5jdGlvbn1zLlxuICpcbiAqIEByZWFkb25seVxuICogQHR5cGUge1N0cmluZ31cbiAqL1xuXG52YXIgZXNjYXBlRnVuY1N0ciA9XG4gICd2YXIgX0VOQ09ERV9IVE1MX1JVTEVTID0ge1xcbidcbisgJyAgICAgIFwiJlwiOiBcIiZhbXA7XCJcXG4nXG4rICcgICAgLCBcIjxcIjogXCImbHQ7XCJcXG4nXG4rICcgICAgLCBcIj5cIjogXCImZ3Q7XCJcXG4nXG4rICcgICAgLCBcXCdcIlxcJzogXCImIzM0O1wiXFxuJ1xuKyAnICAgICwgXCJcXCdcIjogXCImIzM5O1wiXFxuJ1xuKyAnICAgIH1cXG4nXG4rICcgICwgX01BVENIX0hUTUwgPSAvWyY8PlxcJ1wiXS9nO1xcbidcbisgJ2Z1bmN0aW9uIGVuY29kZV9jaGFyKGMpIHtcXG4nXG4rICcgIHJldHVybiBfRU5DT0RFX0hUTUxfUlVMRVNbY10gfHwgYztcXG4nXG4rICd9O1xcbic7XG5cbi8qKlxuICogRXNjYXBlIGNoYXJhY3RlcnMgcmVzZXJ2ZWQgaW4gWE1MLlxuICpcbiAqIElmIGBtYXJrdXBgIGlzIGB1bmRlZmluZWRgIG9yIGBudWxsYCwgdGhlIGVtcHR5IHN0cmluZyBpcyByZXR1cm5lZC5cbiAqXG4gKiBAaW1wbGVtZW50cyB7RXNjYXBlQ2FsbGJhY2t9XG4gKiBAcGFyYW0ge1N0cmluZ30gbWFya3VwIElucHV0IHN0cmluZ1xuICogQHJldHVybiB7U3RyaW5nfSBFc2NhcGVkIHN0cmluZ1xuICogQHN0YXRpY1xuICogQHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLmVzY2FwZVhNTCA9IGZ1bmN0aW9uIChtYXJrdXApIHtcbiAgcmV0dXJuIG1hcmt1cCA9PSB1bmRlZmluZWRcbiAgICA/ICcnXG4gICAgOiBTdHJpbmcobWFya3VwKVxuICAgICAgICAucmVwbGFjZShfTUFUQ0hfSFRNTCwgZW5jb2RlX2NoYXIpO1xufTtcbmV4cG9ydHMuZXNjYXBlWE1MLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gRnVuY3Rpb24ucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodGhpcykgKyAnO1xcbicgKyBlc2NhcGVGdW5jU3RyO1xufTtcblxuLyoqXG4gKiBOYWl2ZSBjb3B5IG9mIHByb3BlcnRpZXMgZnJvbSBvbmUgb2JqZWN0IHRvIGFub3RoZXIuXG4gKiBEb2VzIG5vdCByZWN1cnNlIGludG8gbm9uLXNjYWxhciBwcm9wZXJ0aWVzXG4gKiBEb2VzIG5vdCBjaGVjayB0byBzZWUgaWYgdGhlIHByb3BlcnR5IGhhcyBhIHZhbHVlIGJlZm9yZSBjb3B5aW5nXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSB0byAgIERlc3RpbmF0aW9uIG9iamVjdFxuICogQHBhcmFtICB7T2JqZWN0fSBmcm9tIFNvdXJjZSBvYmplY3RcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICBEZXN0aW5hdGlvbiBvYmplY3RcbiAqIEBzdGF0aWNcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydHMuc2hhbGxvd0NvcHkgPSBmdW5jdGlvbiAodG8sIGZyb20pIHtcbiAgZnJvbSA9IGZyb20gfHwge307XG4gIGZvciAodmFyIHAgaW4gZnJvbSkge1xuICAgIHRvW3BdID0gZnJvbVtwXTtcbiAgfVxuICByZXR1cm4gdG87XG59O1xuXG4vKipcbiAqIE5haXZlIGNvcHkgb2YgYSBsaXN0IG9mIGtleSBuYW1lcywgZnJvbSBvbmUgb2JqZWN0IHRvIGFub3RoZXIuXG4gKiBPbmx5IGNvcGllcyBwcm9wZXJ0eSBpZiBpdCBpcyBhY3R1YWxseSBkZWZpbmVkXG4gKiBEb2VzIG5vdCByZWN1cnNlIGludG8gbm9uLXNjYWxhciBwcm9wZXJ0aWVzXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSB0byAgIERlc3RpbmF0aW9uIG9iamVjdFxuICogQHBhcmFtICB7T2JqZWN0fSBmcm9tIFNvdXJjZSBvYmplY3RcbiAqIEBwYXJhbSAge0FycmF5fSBsaXN0IExpc3Qgb2YgcHJvcGVydGllcyB0byBjb3B5XG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgRGVzdGluYXRpb24gb2JqZWN0XG4gKiBAc3RhdGljXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnRzLnNoYWxsb3dDb3B5RnJvbUxpc3QgPSBmdW5jdGlvbiAodG8sIGZyb20sIGxpc3QpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHAgPSBsaXN0W2ldO1xuICAgIGlmICh0eXBlb2YgZnJvbVtwXSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgdG9bcF0gPSBmcm9tW3BdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdG87XG59O1xuXG4vKipcbiAqIFNpbXBsZSBpbi1wcm9jZXNzIGNhY2hlIGltcGxlbWVudGF0aW9uLiBEb2VzIG5vdCBpbXBsZW1lbnQgbGltaXRzIG9mIGFueVxuICogc29ydC5cbiAqXG4gKiBAaW1wbGVtZW50cyBDYWNoZVxuICogQHN0YXRpY1xuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0cy5jYWNoZSA9IHtcbiAgX2RhdGE6IHt9LFxuICBzZXQ6IGZ1bmN0aW9uIChrZXksIHZhbCkge1xuICAgIHRoaXMuX2RhdGFba2V5XSA9IHZhbDtcbiAgfSxcbiAgZ2V0OiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX2RhdGFba2V5XTtcbiAgfSxcbiAgcmVzZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9kYXRhID0ge307XG4gIH1cbn07XG4iXX0=