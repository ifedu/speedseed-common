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
var speedseed_1 = require("speedseed");
var packageNpm = require('../../package.json');
var Yo = /** @class */ (function (_super) {
    __extends(Yo, _super);
    function Yo(args, options) {
        var _this = _super.call(this, args, options) || this;
        speedseed_1.core.setYo(_this);
        speedseed_1.core.setCore(packageNpm);
        speedseed_1.core.viewVersion(packageNpm);
        return _this;
    }
    Yo.prototype.write = function () {
        this.composeWith('speedseed:install', {});
    };
    return Yo;
}(speedseed_1.Base));
exports.default = Yo;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcZ2VuZXJhdG9yc1xcYXBwXFxfaW5kZXgudHMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXGdlbmVyYXRvcnNcXGFwcFxcX2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLHVDQUFzQztBQUV0QyxJQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtBQUVoRDtJQUFnQyxzQkFBSTtJQUNoQyxZQUFZLElBQVMsRUFBRSxPQUFZO1FBQW5DLFlBQ0ksa0JBQU0sSUFBSSxFQUFFLE9BQU8sQ0FBQyxTQU12QjtRQUpHLGdCQUFJLENBQUMsS0FBSyxDQUFDLEtBQUksQ0FBQyxDQUFBO1FBRWhCLGdCQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3hCLGdCQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBOztJQUNoQyxDQUFDO0lBRUQsa0JBQUssR0FBTDtRQUNJLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUNMLFNBQUM7QUFBRCxDQUFDLEFBYkQsQ0FBZ0MsZ0JBQUksR0FhbkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCYXNlLCBjb3JlIH0gZnJvbSAnc3BlZWRzZWVkJ1xuXG5jb25zdCBwYWNrYWdlTnBtID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJylcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgWW8gZXh0ZW5kcyBCYXNlIHtcbiAgICBjb25zdHJ1Y3RvcihhcmdzOiBhbnksIG9wdGlvbnM6IGFueSkge1xuICAgICAgICBzdXBlcihhcmdzLCBvcHRpb25zKVxuXG4gICAgICAgIGNvcmUuc2V0WW8odGhpcylcblxuICAgICAgICBjb3JlLnNldENvcmUocGFja2FnZU5wbSlcbiAgICAgICAgY29yZS52aWV3VmVyc2lvbihwYWNrYWdlTnBtKVxuICAgIH1cblxuICAgIHdyaXRlKCkge1xuICAgICAgICB0aGlzLmNvbXBvc2VXaXRoKCdzcGVlZHNlZWQ6aW5zdGFsbCcsIHt9KVxuICAgIH1cbn1cbiJdfQ==