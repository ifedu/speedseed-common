"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var _1 = require("../");
var Helper = /** @class */ (function (_super) {
    __extends(Helper, _super);
    function Helper(args, options) {
        var _this = _super.call(this, args, options) || this;
        _1.core.setYo(options.core.yo);
        _this.update = options.update;
        return _this;
    }
    Helper.setOptions = function (name, value, extra, exclude) {
        return { name: name, value: value, extra: extra, exclude: exclude };
    };
    Helper.Yo = function (tpl) {
        Helper.tpl = tpl;
        return this;
    };
    Helper.prototype.paths = function () {
        _1.core.setPath(_1.core.root, './');
    };
    Helper.prototype.prompting = function () {
        if (this.update)
            return;
        var options = Helper.tpl.options;
        _1.prompter.setOptions({ options: options }, this.async());
    };
    Helper.prototype.write = function () {
        _1.core.setOptions();
        _1.files.writeFiles();
    };
    return Helper;
}(_1.Base));
exports.default = Helper;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzcGVlZHNlZWRcXHNyY1xcaGVscGVyLnRzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXHNwZWVkc2VlZFxcc3JjXFxoZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsd0JBQWlEO0FBRWpEO0lBQW9DLDBCQUFJO0lBS3BDLGdCQUFZLElBQVMsRUFBRSxPQUFZO1FBQW5DLFlBQ0ksa0JBQU0sSUFBSSxFQUFFLE9BQU8sQ0FBQyxTQUt2QjtRQUhHLE9BQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUUzQixLQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7O0lBQ2hDLENBQUM7SUFFTSxpQkFBVSxHQUFqQixVQUFrQixJQUFZLEVBQUUsS0FBYSxFQUFFLEtBQWMsRUFBRSxPQUFhO1FBQ3hFLE1BQU0sQ0FBQyxFQUFFLElBQUksTUFBQSxFQUFFLEtBQUssT0FBQSxFQUFFLEtBQUssT0FBQSxFQUFFLE9BQU8sU0FBQSxFQUFFLENBQUE7SUFDMUMsQ0FBQztJQUVNLFNBQUUsR0FBVCxVQUFVLEdBQVE7UUFDZCxNQUFNLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQTtRQUVoQixNQUFNLENBQUMsSUFBSSxDQUFBO0lBQ2YsQ0FBQztJQUVELHNCQUFLLEdBQUw7UUFDSSxPQUFJLENBQUMsT0FBTyxDQUFDLE9BQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVELDBCQUFTLEdBQVQ7UUFDSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQUMsTUFBTSxDQUFBO1FBRWYsSUFBQSw0QkFBTyxDQUFlO1FBRTlCLFdBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxPQUFPLFNBQUEsRUFBRSxFQUFRLElBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFFRCxzQkFBSyxHQUFMO1FBQ0ksT0FBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBRWpCLFFBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0lBQ0wsYUFBQztBQUFELENBQUMsQUF4Q0QsQ0FBb0MsT0FBSSxHQXdDdkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCYXNlLCBjb3JlLCBmaWxlcywgcHJvbXB0ZXIgfSBmcm9tICcuLi8nXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhlbHBlciBleHRlbmRzIEJhc2Uge1xuICAgIHN0YXRpYyB0cGw6IGFueVxuXG4gICAgdXBkYXRlOiBib29sZWFuXG5cbiAgICBjb25zdHJ1Y3RvcihhcmdzOiBhbnksIG9wdGlvbnM6IGFueSkge1xuICAgICAgICBzdXBlcihhcmdzLCBvcHRpb25zKVxuXG4gICAgICAgIGNvcmUuc2V0WW8ob3B0aW9ucy5jb3JlLnlvKVxuXG4gICAgICAgIHRoaXMudXBkYXRlID0gb3B0aW9ucy51cGRhdGVcbiAgICB9XG5cbiAgICBzdGF0aWMgc2V0T3B0aW9ucyhuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcsIGV4dHJhPzogc3RyaW5nLCBleGNsdWRlPzogYW55KSB7XG4gICAgICAgIHJldHVybiB7IG5hbWUsIHZhbHVlLCBleHRyYSwgZXhjbHVkZSB9XG4gICAgfVxuXG4gICAgc3RhdGljIFlvKHRwbDogYW55KSB7XG4gICAgICAgIEhlbHBlci50cGwgPSB0cGxcblxuICAgICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAgIHBhdGhzKCkge1xuICAgICAgICBjb3JlLnNldFBhdGgoY29yZS5yb290LCAnLi8nKVxuICAgIH1cblxuICAgIHByb21wdGluZygpIHtcbiAgICAgICAgaWYgKHRoaXMudXBkYXRlKSByZXR1cm5cblxuICAgICAgICBjb25zdCB7IG9wdGlvbnMgfSA9IEhlbHBlci50cGxcblxuICAgICAgICBwcm9tcHRlci5zZXRPcHRpb25zKHsgb3B0aW9ucyB9LCAoPGFueT50aGlzKS5hc3luYygpKVxuICAgIH1cblxuICAgIHdyaXRlKCkge1xuICAgICAgICBjb3JlLnNldE9wdGlvbnMoKVxuXG4gICAgICAgIGZpbGVzLndyaXRlRmlsZXMoKVxuICAgIH1cbn1cbiJdfQ==