'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var pLimit = require('p-limit');
var EndError = /** @class */ (function (_super) {
    __extends(EndError, _super);
    function EndError(value) {
        var _this = _super.call(this) || this;
        _this.value = value;
        return _this;
    }
    return EndError;
}(Error));
// the input can also be a promise, so we `Promise.all()` them both
var finder = function (el) { return Promise.all(el).then(function (val) { return val[1] === true && Promise.reject(new EndError(val[0])); }); };
module.exports = function (iterable, tester, opts) {
    opts = Object.assign({
        concurrency: Infinity,
        preserveOrder: true
    }, opts);
    var limit = pLimit(opts.concurrency);
    // start all the promises concurrently with optional limit
    var items = Array.from(iterable).map(function (el) { return [el, limit(function () { return Promise.resolve(el).then(tester); })]; });
    // check the promises either serially or concurrently
    var checkLimit = pLimit(opts.preserveOrder ? 1 : Infinity);
    return Promise.all(items.map(function (el) { return checkLimit(function () { return finder(el); }); }))
        .then(function () { })
        .catch(function (err) { return err instanceof EndError ? err.value : Promise.reject(err); });
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxwLWxvY2F0ZVxcaW5kZXguanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xccC1sb2NhdGVcXGluZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7QUFDYixJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFFbEM7SUFBdUIsNEJBQUs7SUFDM0Isa0JBQVksS0FBSztRQUFqQixZQUNDLGlCQUFPLFNBRVA7UUFEQSxLQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQzs7SUFDcEIsQ0FBQztJQUNGLGVBQUM7QUFBRCxDQUFDLEFBTEQsQ0FBdUIsS0FBSyxHQUszQjtBQUVELG1FQUFtRTtBQUNuRSxJQUFNLE1BQU0sR0FBRyxVQUFBLEVBQUUsSUFBSSxPQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQXZELENBQXVELENBQUMsRUFBcEYsQ0FBb0YsQ0FBQztBQUUxRyxNQUFNLENBQUMsT0FBTyxHQUFHLFVBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxJQUFJO0lBQ3ZDLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ3BCLFdBQVcsRUFBRSxRQUFRO1FBQ3JCLGFBQWEsRUFBRSxJQUFJO0tBQ25CLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFVCxJQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBRXZDLDBEQUEwRDtJQUMxRCxJQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxjQUFNLE9BQUEsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQWhDLENBQWdDLENBQUMsQ0FBQyxFQUFuRCxDQUFtRCxDQUFDLENBQUM7SUFFbEcscURBQXFEO0lBQ3JELElBQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQztJQUU3RCxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQUEsRUFBRSxJQUFJLE9BQUEsVUFBVSxDQUFDLGNBQU0sT0FBQSxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQVYsQ0FBVSxDQUFDLEVBQTVCLENBQTRCLENBQUMsQ0FBQztTQUMvRCxJQUFJLENBQUMsY0FBTyxDQUFDLENBQUM7U0FDZCxLQUFLLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxHQUFHLFlBQVksUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBekQsQ0FBeUQsQ0FBQyxDQUFDO0FBQzNFLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbmNvbnN0IHBMaW1pdCA9IHJlcXVpcmUoJ3AtbGltaXQnKTtcblxuY2xhc3MgRW5kRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG5cdGNvbnN0cnVjdG9yKHZhbHVlKSB7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLnZhbHVlID0gdmFsdWU7XG5cdH1cbn1cblxuLy8gdGhlIGlucHV0IGNhbiBhbHNvIGJlIGEgcHJvbWlzZSwgc28gd2UgYFByb21pc2UuYWxsKClgIHRoZW0gYm90aFxuY29uc3QgZmluZGVyID0gZWwgPT4gUHJvbWlzZS5hbGwoZWwpLnRoZW4odmFsID0+IHZhbFsxXSA9PT0gdHJ1ZSAmJiBQcm9taXNlLnJlamVjdChuZXcgRW5kRXJyb3IodmFsWzBdKSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChpdGVyYWJsZSwgdGVzdGVyLCBvcHRzKSA9PiB7XG5cdG9wdHMgPSBPYmplY3QuYXNzaWduKHtcblx0XHRjb25jdXJyZW5jeTogSW5maW5pdHksXG5cdFx0cHJlc2VydmVPcmRlcjogdHJ1ZVxuXHR9LCBvcHRzKTtcblxuXHRjb25zdCBsaW1pdCA9IHBMaW1pdChvcHRzLmNvbmN1cnJlbmN5KTtcblxuXHQvLyBzdGFydCBhbGwgdGhlIHByb21pc2VzIGNvbmN1cnJlbnRseSB3aXRoIG9wdGlvbmFsIGxpbWl0XG5cdGNvbnN0IGl0ZW1zID0gQXJyYXkuZnJvbShpdGVyYWJsZSkubWFwKGVsID0+IFtlbCwgbGltaXQoKCkgPT4gUHJvbWlzZS5yZXNvbHZlKGVsKS50aGVuKHRlc3RlcikpXSk7XG5cblx0Ly8gY2hlY2sgdGhlIHByb21pc2VzIGVpdGhlciBzZXJpYWxseSBvciBjb25jdXJyZW50bHlcblx0Y29uc3QgY2hlY2tMaW1pdCA9IHBMaW1pdChvcHRzLnByZXNlcnZlT3JkZXIgPyAxIDogSW5maW5pdHkpO1xuXG5cdHJldHVybiBQcm9taXNlLmFsbChpdGVtcy5tYXAoZWwgPT4gY2hlY2tMaW1pdCgoKSA9PiBmaW5kZXIoZWwpKSkpXG5cdFx0LnRoZW4oKCkgPT4ge30pXG5cdFx0LmNhdGNoKGVyciA9PiBlcnIgaW5zdGFuY2VvZiBFbmRFcnJvciA/IGVyci52YWx1ZSA6IFByb21pc2UucmVqZWN0KGVycikpO1xufTtcbiJdfQ==