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
var searchGenerators_1 = require("./searchGenerators");
var Yo = /** @class */ (function (_super) {
    __extends(Yo, _super);
    function Yo(args, options) {
        var _this = _super.call(this, args, options) || this;
        var generators = new searchGenerators_1.default();
        speedseed_1.prompter.setGenerator(generators);
        return _this;
    }
    Yo.prototype.paths = function () {
        speedseed_1.core.setPath(__dirname, '../../');
    };
    Yo.prototype.prompting = function () {
        var project = speedseed_1.prompter.getProject('project');
        var template = speedseed_1.prompter.getTemplate('template');
        var templateFiles = speedseed_1.prompter.getTemplateFiles('templateFiles');
        speedseed_1.prompter.setTemplateChoices(template);
        var options = [project, template, templateFiles];
        speedseed_1.prompter.setOptions({ options: options }, this.async());
    };
    Yo.prototype.write = function () {
        speedseed_1.core.setProject();
        speedseed_1.core.setOptions();
        speedseed_1.core.callTpl({});
    };
    return Yo;
}(speedseed_1.Base));
exports.default = Yo;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcZ2VuZXJhdG9yc1xcaW5zdGFsbFxcX2luZGV4LnRzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxnZW5lcmF0b3JzXFxpbnN0YWxsXFxfaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsdUNBQWdEO0FBRWhELHVEQUFpRDtBQUVqRDtJQUFnQyxzQkFBSTtJQUNoQyxZQUFZLElBQVMsRUFBRSxPQUFZO1FBQW5DLFlBQ0ksa0JBQU0sSUFBSSxFQUFFLE9BQU8sQ0FBQyxTQUt2QjtRQUhHLElBQU0sVUFBVSxHQUFHLElBQUksMEJBQWdCLEVBQUUsQ0FBQTtRQUV6QyxvQkFBUSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQTs7SUFDckMsQ0FBQztJQUVELGtCQUFLLEdBQUw7UUFDSSxnQkFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELHNCQUFTLEdBQVQ7UUFDSSxJQUFNLE9BQU8sR0FBRyxvQkFBUSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM5QyxJQUFNLFFBQVEsR0FBRyxvQkFBUSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNqRCxJQUFNLGFBQWEsR0FBRyxvQkFBUSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRWhFLG9CQUFRLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFckMsSUFBTSxPQUFPLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBRWxELG9CQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsT0FBTyxTQUFBLEVBQUUsRUFBUSxJQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRUQsa0JBQUssR0FBTDtRQUNJLGdCQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDakIsZ0JBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUVqQixnQkFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNwQixDQUFDO0lBQ0wsU0FBQztBQUFELENBQUMsQUEvQkQsQ0FBZ0MsZ0JBQUksR0ErQm5DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQmFzZSwgY29yZSwgcHJvbXB0ZXIgfSBmcm9tICdzcGVlZHNlZWQnXG5cbmltcG9ydCBTZWFyY2hHZW5lcmF0b3JzIGZyb20gJy4vc2VhcmNoR2VuZXJhdG9ycydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgWW8gZXh0ZW5kcyBCYXNlIHtcbiAgICBjb25zdHJ1Y3RvcihhcmdzOiBhbnksIG9wdGlvbnM6IGFueSkge1xuICAgICAgICBzdXBlcihhcmdzLCBvcHRpb25zKVxuXG4gICAgICAgIGNvbnN0IGdlbmVyYXRvcnMgPSBuZXcgU2VhcmNoR2VuZXJhdG9ycygpXG5cbiAgICAgICAgcHJvbXB0ZXIuc2V0R2VuZXJhdG9yKGdlbmVyYXRvcnMpXG4gICAgfVxuXG4gICAgcGF0aHMoKSB7XG4gICAgICAgIGNvcmUuc2V0UGF0aChfX2Rpcm5hbWUsICcuLi8uLi8nKVxuICAgIH1cblxuICAgIHByb21wdGluZygpIHtcbiAgICAgICAgY29uc3QgcHJvamVjdCA9IHByb21wdGVyLmdldFByb2plY3QoJ3Byb2plY3QnKVxuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHByb21wdGVyLmdldFRlbXBsYXRlKCd0ZW1wbGF0ZScpXG4gICAgICAgIGNvbnN0IHRlbXBsYXRlRmlsZXMgPSBwcm9tcHRlci5nZXRUZW1wbGF0ZUZpbGVzKCd0ZW1wbGF0ZUZpbGVzJylcblxuICAgICAgICBwcm9tcHRlci5zZXRUZW1wbGF0ZUNob2ljZXModGVtcGxhdGUpXG5cbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtwcm9qZWN0LCB0ZW1wbGF0ZSwgdGVtcGxhdGVGaWxlc11cblxuICAgICAgICBwcm9tcHRlci5zZXRPcHRpb25zKHsgb3B0aW9ucyB9LCAoPGFueT50aGlzKS5hc3luYygpKVxuICAgIH1cblxuICAgIHdyaXRlKCkge1xuICAgICAgICBjb3JlLnNldFByb2plY3QoKVxuICAgICAgICBjb3JlLnNldE9wdGlvbnMoKVxuXG4gICAgICAgIGNvcmUuY2FsbFRwbCh7fSlcbiAgICB9XG59XG4iXX0=