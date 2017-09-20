"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _1 = require("../");
var path_1 = require("path");
var Core = /** @class */ (function () {
    function Core() {
        this.root = process.cwd();
    }
    Core.prototype.callTpl = function (options) {
        var tpl = "speedseed-" + this.options['template'];
        options = options || {};
        options.core = _1.core;
        this.yo.composeWith(tpl, options);
    };
    Core.prototype.getPath = function (dirname, route) {
        return path_1.resolve(dirname, route);
    };
    Core.prototype.setCore = function (packageNpm) {
        var name = packageNpm.name, version = packageNpm.version;
        var config = this.yo.config;
        config.set('coreName', name);
        config.set('coreVersion', version);
    };
    Core.prototype.setOptions = function () {
        this.options = this.yo.config.getAll();
    };
    Core.prototype.setPath = function (dirname, root) {
        var route = path_1.resolve(dirname, root);
        this.yo.sourceRoot(route);
    };
    Core.prototype.setProject = function () {
        var project = this.yo.config.get('project');
        project = project.toLowerCase().replace(/[-_ ]/g, '');
        this.yo.config.set('project', project);
    };
    Core.prototype.setYo = function (yo) {
        this.yo = yo;
    };
    Core.prototype.viewVersion = function (packageNpm) {
        var name = packageNpm.name, version = packageNpm.version;
        console.log(name + " version " + version);
    };
    return Core;
}());
exports.default = Core;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzcGVlZHNlZWRcXHNyY1xcY29yZS50cyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzcGVlZHNlZWRcXHNyY1xcY29yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHdCQUEwQjtBQUMxQiw2QkFBOEI7QUFFOUI7SUFBQTtRQUVJLFNBQUksR0FBUSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUE7SUFtRDdCLENBQUM7SUFoREcsc0JBQU8sR0FBUCxVQUFRLE9BQVk7UUFDaEIsSUFBTSxHQUFHLEdBQVcsZUFBYSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBRyxDQUFBO1FBRTNELE9BQU8sR0FBRyxPQUFPLElBQUksRUFBRSxDQUFBO1FBQ3ZCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBSSxDQUFBO1FBRW5CLElBQUksQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsc0JBQU8sR0FBUCxVQUFRLE9BQVksRUFBRSxLQUFVO1FBQzVCLE1BQU0sQ0FBQyxjQUFPLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxzQkFBTyxHQUFQLFVBQVEsVUFBZTtRQUNYLElBQUEsc0JBQUksRUFBRSw0QkFBTyxDQUFlO1FBQzVCLElBQUEsdUJBQU0sQ0FBWTtRQUUxQixNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1QixNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQseUJBQVUsR0FBVjtRQUNJLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDMUMsQ0FBQztJQUVELHNCQUFPLEdBQVAsVUFBUSxPQUFZLEVBQUUsSUFBUztRQUMzQixJQUFNLEtBQUssR0FBRyxjQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXBDLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFFRCx5QkFBVSxHQUFWO1FBQ0ksSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRTNDLE9BQU8sR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVyRCxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxvQkFBSyxHQUFMLFVBQU0sRUFBTztRQUNULElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFRCwwQkFBVyxHQUFYLFVBQVksVUFBZTtRQUNmLElBQUEsc0JBQUksRUFBRSw0QkFBTyxDQUFlO1FBRXBDLE9BQU8sQ0FBQyxHQUFHLENBQUksSUFBSSxpQkFBWSxPQUFTLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBQ0wsV0FBQztBQUFELENBQUMsQUFyREQsSUFxREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjb3JlIH0gZnJvbSAnLi4vJ1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvcmUge1xuICAgIG9wdGlvbnM6IGFueVxuICAgIHJvb3Q6IGFueSA9IHByb2Nlc3MuY3dkKClcbiAgICB5bzogYW55XG5cbiAgICBjYWxsVHBsKG9wdGlvbnM6IGFueSkge1xuICAgICAgICBjb25zdCB0cGw6IHN0cmluZyA9IGBzcGVlZHNlZWQtJHt0aGlzLm9wdGlvbnNbJ3RlbXBsYXRlJ119YFxuXG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgICAgIG9wdGlvbnMuY29yZSA9IGNvcmVcblxuICAgICAgICB0aGlzLnlvLmNvbXBvc2VXaXRoKHRwbCwgb3B0aW9ucylcbiAgICB9XG5cbiAgICBnZXRQYXRoKGRpcm5hbWU6IGFueSwgcm91dGU6IGFueSkge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZShkaXJuYW1lLCByb3V0ZSlcbiAgICB9XG5cbiAgICBzZXRDb3JlKHBhY2thZ2VOcG06IGFueSkge1xuICAgICAgICBjb25zdCB7IG5hbWUsIHZlcnNpb24gfSA9IHBhY2thZ2VOcG1cbiAgICAgICAgY29uc3QgeyBjb25maWcgfSA9IHRoaXMueW9cblxuICAgICAgICBjb25maWcuc2V0KCdjb3JlTmFtZScsIG5hbWUpXG4gICAgICAgIGNvbmZpZy5zZXQoJ2NvcmVWZXJzaW9uJywgdmVyc2lvbilcbiAgICB9XG5cbiAgICBzZXRPcHRpb25zKCkge1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSB0aGlzLnlvLmNvbmZpZy5nZXRBbGwoKVxuICAgIH1cblxuICAgIHNldFBhdGgoZGlybmFtZTogYW55LCByb290OiBhbnkpIHtcbiAgICAgICAgY29uc3Qgcm91dGUgPSByZXNvbHZlKGRpcm5hbWUsIHJvb3QpXG5cbiAgICAgICAgdGhpcy55by5zb3VyY2VSb290KHJvdXRlKVxuICAgIH1cblxuICAgIHNldFByb2plY3QoKSB7XG4gICAgICAgIGxldCBwcm9qZWN0ID0gdGhpcy55by5jb25maWcuZ2V0KCdwcm9qZWN0JylcblxuICAgICAgICBwcm9qZWN0ID0gcHJvamVjdC50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1stXyBdL2csICcnKVxuXG4gICAgICAgIHRoaXMueW8uY29uZmlnLnNldCgncHJvamVjdCcsIHByb2plY3QpXG4gICAgfVxuXG4gICAgc2V0WW8oeW86IGFueSkge1xuICAgICAgICB0aGlzLnlvID0geW9cbiAgICB9XG5cbiAgICB2aWV3VmVyc2lvbihwYWNrYWdlTnBtOiBhbnkpIHtcbiAgICAgICAgY29uc3QgeyBuYW1lLCB2ZXJzaW9uIH0gPSBwYWNrYWdlTnBtXG5cbiAgICAgICAgY29uc29sZS5sb2coYCR7bmFtZX0gdmVyc2lvbiAke3ZlcnNpb259YClcbiAgICB9XG59XG4iXX0=