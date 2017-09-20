'use strict';
var assert = require('assert');
var _ = require('lodash');
/**
 * Storage instances handle a json file where Generator authors can store data.
 *
 * `Base` instantiate the storage as `config` by default.
 *
 * @constructor
 * @param {String} name       The name of the new storage (this is a namespace)
 * @param {mem-fs-editor} fs  A mem-fs editor instance
 * @param {String} configPath The filepath used as a storage.
 *
 * @example
 * var MyGenerator = yeoman.base.extend({
 *   config: function() {
 *     this.config.set('coffeescript', false);
 *   }
 * });
 */
var Storage = module.exports = function (name, fs, configPath) {
    assert(name, 'A name parameter is required to create a storage');
    assert(configPath, 'A config filepath is required to create a storage');
    this.path = configPath;
    this.name = name;
    this.fs = fs;
    this.existed = Object.keys(this._store()).length > 0;
};
/**
 * Return the current store as JSON object
 * @private
 * @return {Object} the store content
 */
Storage.prototype._store = function () {
    return this.fs.readJSON(this.path, {})[this.name] || {};
};
/**
 * Persist a configuration to disk
 * @param {Object} val - current configuration values
 */
Storage.prototype._persist = function (val) {
    var fullStore = this.fs.readJSON(this.path, {});
    fullStore[this.name] = val;
    this.fs.write(this.path, JSON.stringify(fullStore, null, '  '));
};
/**
 * Save a new object of values
 * @return {null}
 */
Storage.prototype.save = function () {
    this._persist(this._store());
};
/**
 * Get a stored value
 * @param  {String} key  The key under which the value is stored.
 * @return {*}           The stored value. Any JSON valid type could be returned
 */
Storage.prototype.get = function (key) {
    return this._store()[key];
};
/**
 * Get all the stored values
 * @return {Object}  key-value object
 */
Storage.prototype.getAll = function () {
    return _.cloneDeep(this._store());
};
/**
 * Assign a key to a value and schedule a save.
 * @param {String} key  The key under which the value is stored
 * @param {*} val  Any valid JSON type value (String, Number, Array, Object).
 * @return {*} val  Whatever was passed in as val.
 */
Storage.prototype.set = function (key, val) {
    assert(!_.isFunction(val), 'Storage value can\'t be a function');
    var store = this._store();
    if (_.isObject(key)) {
        val = _.extend(store, key);
    }
    else {
        store[key] = val;
    }
    this._persist(store);
    return val;
};
/**
 * Delete a key from the store and schedule a save.
 * @param  {String} key  The key under which the value is stored.
 * @return {null}
 */
Storage.prototype.delete = function (key) {
    var store = this._store();
    delete store[key];
    this._persist(store);
};
/**
 * Setup the store with defaults value and schedule a save.
 * If keys already exist, the initial value is kept.
 * @param  {Object} defaults  Key-value object to store.
 * @return {*} val  Returns the merged options.
 */
Storage.prototype.defaults = function (defaults) {
    assert(_.isObject(defaults), 'Storage `defaults` method only accept objects');
    var val = _.defaults(this.getAll(), defaults);
    this.set(val);
    return val;
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZ2VuZXJhdG9yXFxsaWJcXHV0aWxcXHN0b3JhZ2UuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xceWVvbWFuLWdlbmVyYXRvclxcbGliXFx1dGlsXFxzdG9yYWdlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQztBQUNiLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQixJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFMUI7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFFSCxJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxHQUFHLFVBQVUsSUFBSSxFQUFFLEVBQUUsRUFBRSxVQUFVO0lBQzNELE1BQU0sQ0FBQyxJQUFJLEVBQUUsa0RBQWtELENBQUMsQ0FBQztJQUNqRSxNQUFNLENBQUMsVUFBVSxFQUFFLG1EQUFtRCxDQUFDLENBQUM7SUFFeEUsSUFBSSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUM7SUFDdkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDakIsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7SUFDYixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUM7QUFFRjs7OztHQUlHO0FBQ0gsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUc7SUFDekIsTUFB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Q29udGVudCI6WyIndXNlIHN0cmljdCc7XG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0Jyk7XG52YXIgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXG4vKipcbiAqIFN0b3JhZ2UgaW5zdGFuY2VzIGhhbmRsZSBhIGpzb24gZmlsZSB3aGVyZSBHZW5lcmF0b3IgYXV0aG9ycyBjYW4gc3RvcmUgZGF0YS5cbiAqXG4gKiBgQmFzZWAgaW5zdGFudGlhdGUgdGhlIHN0b3JhZ2UgYXMgYGNvbmZpZ2AgYnkgZGVmYXVsdC5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lICAgICAgIFRoZSBuYW1lIG9mIHRoZSBuZXcgc3RvcmFnZSAodGhpcyBpcyBhIG5hbWVzcGFjZSlcbiAqIEBwYXJhbSB7bWVtLWZzLWVkaXRvcn0gZnMgIEEgbWVtLWZzIGVkaXRvciBpbnN0YW5jZVxuICogQHBhcmFtIHtTdHJpbmd9IGNvbmZpZ1BhdGggVGhlIGZpbGVwYXRoIHVzZWQgYXMgYSBzdG9yYWdlLlxuICpcbiAqIEBleGFtcGxlXG4gKiB2YXIgTXlHZW5lcmF0b3IgPSB5ZW9tYW4uYmFzZS5leHRlbmQoe1xuICogICBjb25maWc6IGZ1bmN0aW9uKCkge1xuICogICAgIHRoaXMuY29uZmlnLnNldCgnY29mZmVlc2NyaXB0JywgZmFsc2UpO1xuICogICB9XG4gKiB9KTtcbiAqL1xuXG52YXIgU3RvcmFnZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG5hbWUsIGZzLCBjb25maWdQYXRoKSB7XG4gIGFzc2VydChuYW1lLCAnQSBuYW1lIHBhcmFtZXRlciBpcyByZXF1aXJlZCB0byBjcmVhdGUgYSBzdG9yYWdlJyk7XG4gIGFzc2VydChjb25maWdQYXRoLCAnQSBjb25maWcgZmlsZXBhdGggaXMgcmVxdWlyZWQgdG8gY3JlYXRlIGEgc3RvcmFnZScpO1xuXG4gIHRoaXMucGF0aCA9IGNvbmZpZ1BhdGg7XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIHRoaXMuZnMgPSBmcztcbiAgdGhpcy5leGlzdGVkID0gT2JqZWN0LmtleXModGhpcy5fc3RvcmUoKSkubGVuZ3RoID4gMDtcbn07XG5cbi8qKlxuICogUmV0dXJuIHRoZSBjdXJyZW50IHN0b3JlIGFzIEpTT04gb2JqZWN0XG4gKiBAcHJpdmF0ZVxuICogQHJldHVybiB7T2JqZWN0fSB0aGUgc3RvcmUgY29udGVudFxuICovXG5TdG9yYWdlLnByb3RvdHlwZS5fc3RvcmUgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLmZzLnJlYWRKU09OKHRoaXMucGF0aCwge30pW3RoaXMubmFtZV0gfHwge307XG59O1xuXG4vKipcbiAqIFBlcnNpc3QgYSBjb25maWd1cmF0aW9uIHRvIGRpc2tcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgLSBjdXJyZW50IGNvbmZpZ3VyYXRpb24gdmFsdWVzXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLl9wZXJzaXN0ID0gZnVuY3Rpb24gKHZhbCkge1xuICB2YXIgZnVsbFN0b3JlID0gdGhpcy5mcy5yZWFkSlNPTih0aGlzLnBhdGgsIHt9KTtcbiAgZnVsbFN0b3JlW3RoaXMubmFtZV0gPSB2YWw7XG4gIHRoaXMuZnMud3JpdGUodGhpcy5wYXRoLCBKU09OLnN0cmluZ2lmeShmdWxsU3RvcmUsIG51bGwsICcgICcpKTtcbn07XG5cbi8qKlxuICogU2F2ZSBhIG5ldyBvYmplY3Qgb2YgdmFsdWVzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuX3BlcnNpc3QodGhpcy5fc3RvcmUoKSk7XG59O1xuXG4vKipcbiAqIEdldCBhIHN0b3JlZCB2YWx1ZVxuICogQHBhcmFtICB7U3RyaW5nfSBrZXkgIFRoZSBrZXkgdW5kZXIgd2hpY2ggdGhlIHZhbHVlIGlzIHN0b3JlZC5cbiAqIEByZXR1cm4geyp9ICAgICAgICAgICBUaGUgc3RvcmVkIHZhbHVlLiBBbnkgSlNPTiB2YWxpZCB0eXBlIGNvdWxkIGJlIHJldHVybmVkXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xuICByZXR1cm4gdGhpcy5fc3RvcmUoKVtrZXldO1xufTtcblxuLyoqXG4gKiBHZXQgYWxsIHRoZSBzdG9yZWQgdmFsdWVzXG4gKiBAcmV0dXJuIHtPYmplY3R9ICBrZXktdmFsdWUgb2JqZWN0XG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuZ2V0QWxsID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gXy5jbG9uZURlZXAodGhpcy5fc3RvcmUoKSk7XG59O1xuXG4vKipcbiAqIEFzc2lnbiBhIGtleSB0byBhIHZhbHVlIGFuZCBzY2hlZHVsZSBhIHNhdmUuXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5ICBUaGUga2V5IHVuZGVyIHdoaWNoIHRoZSB2YWx1ZSBpcyBzdG9yZWRcbiAqIEBwYXJhbSB7Kn0gdmFsICBBbnkgdmFsaWQgSlNPTiB0eXBlIHZhbHVlIChTdHJpbmcsIE51bWJlciwgQXJyYXksIE9iamVjdCkuXG4gKiBAcmV0dXJuIHsqfSB2YWwgIFdoYXRldmVyIHdhcyBwYXNzZWQgaW4gYXMgdmFsLlxuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChrZXksIHZhbCkge1xuICBhc3NlcnQoIV8uaXNGdW5jdGlvbih2YWwpLCAnU3RvcmFnZSB2YWx1ZSBjYW5cXCd0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgc3RvcmUgPSB0aGlzLl9zdG9yZSgpO1xuXG4gIGlmIChfLmlzT2JqZWN0KGtleSkpIHtcbiAgICB2YWwgPSBfLmV4dGVuZChzdG9yZSwga2V5KTtcbiAgfSBlbHNlIHtcbiAgICBzdG9yZVtrZXldID0gdmFsO1xuICB9XG5cbiAgdGhpcy5fcGVyc2lzdChzdG9yZSk7XG4gIHJldHVybiB2YWw7XG59O1xuXG4vKipcbiAqIERlbGV0ZSBhIGtleSBmcm9tIHRoZSBzdG9yZSBhbmQgc2NoZWR1bGUgYSBzYXZlLlxuICogQHBhcmFtICB7U3RyaW5nfSBrZXkgIFRoZSBrZXkgdW5kZXIgd2hpY2ggdGhlIHZhbHVlIGlzIHN0b3JlZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKGtleSkge1xuICB2YXIgc3RvcmUgPSB0aGlzLl9zdG9yZSgpO1xuICBkZWxldGUgc3RvcmVba2V5XTtcbiAgdGhpcy5fcGVyc2lzdChzdG9yZSk7XG59O1xuXG4vKipcbiAqIFNldHVwIHRoZSBzdG9yZSB3aXRoIGRlZmF1bHRzIHZhbHVlIGFuZCBzY2hlZHVsZSBhIHNhdmUuXG4gKiBJZiBrZXlzIGFscmVhZHkgZXhpc3QsIHRoZSBpbml0aWFsIHZhbHVlIGlzIGtlcHQuXG4gKiBAcGFyYW0gIHtPYmplY3R9IGRlZmF1bHRzICBLZXktdmFsdWUgb2JqZWN0IHRvIHN0b3JlLlxuICogQHJldHVybiB7Kn0gdmFsICBSZXR1cm5zIHRoZSBtZXJnZWQgb3B0aW9ucy5cbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5kZWZhdWx0cyA9IGZ1bmN0aW9uIChkZWZhdWx0cykge1xuICBhc3NlcnQoXy5pc09iamVjdChkZWZhdWx0cyksICdTdG9yYWdlIGBkZWZhdWx0c2AgbWV0aG9kIG9ubHkgYWNjZXB0IG9iamVjdHMnKTtcbiAgdmFyIHZhbCA9IF8uZGVmYXVsdHModGhpcy5nZXRBbGwoKSwgZGVmYXVsdHMpO1xuICB0aGlzLnNldCh2YWwpO1xuICByZXR1cm4gdmFsO1xufTtcbiJdfQ==