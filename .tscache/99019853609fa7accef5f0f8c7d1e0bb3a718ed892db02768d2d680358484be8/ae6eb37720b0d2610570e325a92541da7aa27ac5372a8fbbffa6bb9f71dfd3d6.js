/**
 * `list` type prompt
 */
var _ = require('lodash');
var util = require('util');
var chalk = require('chalk');
var figures = require('figures');
var cliCursor = require('cli-cursor');
var runAsync = require('run-async');
var Base = require('./base');
var observe = require('../utils/events');
var Paginator = require('../utils/paginator');
/**
 * Module exports
 */
module.exports = Prompt;
/**
 * Constructor
 */
function Prompt() {
    Base.apply(this, arguments);
    if (!this.opt.choices) {
        this.throwParamError('choices');
    }
    this.firstRender = true;
    this.selected = 0;
    var def = this.opt.default;
    // Default being a Number
    if (_.isNumber(def) && def >= 0 && def < this.opt.choices.realLength) {
        this.selected = def;
    }
    // Default being a String
    if (_.isString(def)) {
        this.selected = this.opt.choices.pluck('value').indexOf(def);
    }
    // Make sure no default is set (so it won't be printed)
    this.opt.default = null;
    this.paginator = new Paginator();
}
util.inherits(Prompt, Base);
/**
 * Start the Inquiry session
 * @param  {Function} cb      Callback when prompt is done
 * @return {this}
 */
Prompt.prototype._run = function (cb) {
    this.done = cb;
    var self = this;
    var events = observe(this.rl);
    events.normalizedUpKey.takeUntil(events.line).forEach(this.onUpKey.bind(this));
    events.normalizedDownKey.takeUntil(events.line).forEach(this.onDownKey.bind(this));
    events.numberKey.takeUntil(events.line).forEach(this.onNumberKey.bind(this));
    events.line
        .take(1)
        .map(this.getCurrentValue.bind(this))
        .flatMap(function (value) {
        return runAsync(self.opt.filter)(value).catch(function (err) {
            return err;
        });
    })
        .forEach(this.onSubmit.bind(this));
    // Init the prompt
    cliCursor.hide();
    this.render();
    return this;
};
/**
 * Render the prompt to screen
 * @return {Prompt} self
 */
Prompt.prototype.render = function () {
    // Render question
    var message = this.getQuestion();
    if (this.firstRender) {
        message += chalk.dim('(Use arrow keys)');
    }
    // Render choices or answer depending on the state
    if (this.status === 'answered') {
        message += chalk.cyan(this.opt.choices.getChoice(this.selected).short);
    }
    else {
        var choicesStr = listRender(this.opt.choices, this.selected);
        var indexPosition = this.opt.choices.indexOf(this.opt.choices.getChoice(this.selected));
        message += '\n' + this.paginator.paginate(choicesStr, indexPosition, this.opt.pageSize);
    }
    this.firstRender = false;
    this.screen.render(message);
};
/**
 * When user press `enter` key
 */
Prompt.prototype.onSubmit = function (value) {
    this.status = 'answered';
    // Rerender prompt
    this.render();
    this.screen.done();
    cliCursor.show();
    this.done(value);
};
Prompt.prototype.getCurrentValue = function () {
    return this.opt.choices.getChoice(this.selected).value;
};
/**
 * When user press a key
 */
Prompt.prototype.onUpKey = function () {
    var len = this.opt.choices.realLength;
    this.selected = (this.selected > 0) ? this.selected - 1 : len - 1;
    this.render();
};
Prompt.prototype.onDownKey = function () {
    var len = this.opt.choices.realLength;
    this.selected = (this.selected < len - 1) ? this.selected + 1 : 0;
    this.render();
};
Prompt.prototype.onNumberKey = function (input) {
    if (input <= this.opt.choices.realLength) {
        this.selected = input - 1;
    }
    this.render();
};
/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
function listRender(choices, pointer) {
    var output = '';
    var separatorOffset = 0;
    choices.forEach(function (choice, i) {
        if (choice.type === 'separator') {
            separatorOffset++;
            output += '  ' + choice + '\n';
            return;
        }
        if (choice.disabled) {
            separatorOffset++;
            output += '  - ' + choice.name;
            output += ' (' + (_.isString(choice.disabled) ? choice.disabled : 'Disabled') + ')';
            output += '\n';
            return;
        }
        var isSelected = (i - separatorOffset === pointer);
        var line = (isSelected ? figures.pointer + ' ' : '  ') + choice.name;
        if (isSelected) {
            line = chalk.cyan(line);
        }
        output += line + ' \n';
    });
    return output.replace(/\n$/, '');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxpbnF1aXJlclxcbGliXFxwcm9tcHRzXFxsaXN0LmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXGlucXVpcmVyXFxsaWJcXHByb21wdHNcXGxpc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7QUFFSCxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDMUIsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNCLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QixJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDakMsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3RDLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNwQyxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDN0IsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDekMsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFFOUM7O0dBRUc7QUFFSCxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztBQUV4Qjs7R0FFRztBQUVIO0lBQ0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFFNUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7SUFDeEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7SUFFbEIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUM7SUFFM0IseUJBQXlCO0lBQ3pCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQztJQUN0QixDQUFDO0lBRUQseUJBQXlCO0lBQ3pCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQsdURBQXVEO0lBQ3ZELElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztJQUV4QixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7QUFDbkMsQ0FBQztBQUNELElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBRTVCOzs7O0dBSUc7QUFFSCxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxVQUFVLEVBQUU7SUFDbEMsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7SUFFZixJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7SUFFaEIsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM5QixNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDL0UsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbkYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzdFLE1BQU0sQ0FBQyxJQUFJO1NBQ1IsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNQLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNwQyxPQUFPLENBQUMsVUFBVSxLQUFLO1FBQ3RCLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO1lBQ3pELE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztTQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRXJDLGtCQUFrQjtJQUNsQixTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDakIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBRWQsTUFBTSxDQUFDLElBQUksQ0FBQztBQUNkLENBQUMsQ0FBQztBQUVGOzs7R0FHRztBQUVILE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHO0lBQ3hCLGtCQUFrQjtJQUNsQixJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFFakMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDckIsT0FBTyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsa0RBQWtEO0lBQ2xELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztRQUMvQixPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNOLElBQUksVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDN0QsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN4RixPQUFPLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBRUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7SUFFekIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDO0FBRUY7O0dBRUc7QUFFSCxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxVQUFVLEtBQUs7SUFDekMsSUFBSSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUM7SUFFekIsa0JBQWtCO0lBQ2xCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUVkLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbkIsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbkIsQ0FBQyxDQUFDO0FBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEdBQUc7SUFDakMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3pELENBQUMsQ0FBQztBQUVGOztHQUVHO0FBQ0gsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUc7SUFDekIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO0lBQ3RDLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDbEUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ2hCLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHO0lBQzNCLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztJQUN0QyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2xFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNoQixDQUFDLENBQUM7QUFFRixNQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxVQUFVLEtBQUs7SUFDNUMsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFDRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDaEIsQ0FBQyxDQUFDO0FBRUY7Ozs7R0FJRztBQUNILG9CQUFvQixPQUFPLEVBQUUsT0FBTztJQUNsQyxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7SUFDaEIsSUFBSSxlQUFlLEdBQUcsQ0FBQyxDQUFDO0lBRXhCLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxNQUFNLEVBQUUsQ0FBQztRQUNqQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDaEMsZUFBZSxFQUFFLENBQUM7WUFDbEIsTUFBTSxJQUFJLElBQUksR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDO1lBQy9CLE1BQU0sQ0FBQztRQUNULENBQUM7UUFFRCxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUNwQixlQUFlLEVBQUUsQ0FBQztZQUNsQixNQUFNLElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDL0IsTUFBTSxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLEdBQUcsR0FBRyxDQUFDO1lBQ3BGLE1BQU0sSUFBSSxJQUFJLENBQUM7WUFDZixNQUFNLENBQUM7UUFDVCxDQUFDO1FBRUQsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLEdBQUcsZUFBZSxLQUFLLE9BQU8sQ0FBQyxDQUFDO1FBQ25ELElBQUksSUFBSSxHQUFHLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDckUsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNmLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFCLENBQUM7UUFDRCxNQUFNLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQztJQUN6QixDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNuQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBgbGlzdGAgdHlwZSBwcm9tcHRcbiAqL1xuXG52YXIgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG52YXIgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xudmFyIGZpZ3VyZXMgPSByZXF1aXJlKCdmaWd1cmVzJyk7XG52YXIgY2xpQ3Vyc29yID0gcmVxdWlyZSgnY2xpLWN1cnNvcicpO1xudmFyIHJ1bkFzeW5jID0gcmVxdWlyZSgncnVuLWFzeW5jJyk7XG52YXIgQmFzZSA9IHJlcXVpcmUoJy4vYmFzZScpO1xudmFyIG9ic2VydmUgPSByZXF1aXJlKCcuLi91dGlscy9ldmVudHMnKTtcbnZhciBQYWdpbmF0b3IgPSByZXF1aXJlKCcuLi91dGlscy9wYWdpbmF0b3InKTtcblxuLyoqXG4gKiBNb2R1bGUgZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gUHJvbXB0O1xuXG4vKipcbiAqIENvbnN0cnVjdG9yXG4gKi9cblxuZnVuY3Rpb24gUHJvbXB0KCkge1xuICBCYXNlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgaWYgKCF0aGlzLm9wdC5jaG9pY2VzKSB7XG4gICAgdGhpcy50aHJvd1BhcmFtRXJyb3IoJ2Nob2ljZXMnKTtcbiAgfVxuXG4gIHRoaXMuZmlyc3RSZW5kZXIgPSB0cnVlO1xuICB0aGlzLnNlbGVjdGVkID0gMDtcblxuICB2YXIgZGVmID0gdGhpcy5vcHQuZGVmYXVsdDtcblxuICAvLyBEZWZhdWx0IGJlaW5nIGEgTnVtYmVyXG4gIGlmIChfLmlzTnVtYmVyKGRlZikgJiYgZGVmID49IDAgJiYgZGVmIDwgdGhpcy5vcHQuY2hvaWNlcy5yZWFsTGVuZ3RoKSB7XG4gICAgdGhpcy5zZWxlY3RlZCA9IGRlZjtcbiAgfVxuXG4gIC8vIERlZmF1bHQgYmVpbmcgYSBTdHJpbmdcbiAgaWYgKF8uaXNTdHJpbmcoZGVmKSkge1xuICAgIHRoaXMuc2VsZWN0ZWQgPSB0aGlzLm9wdC5jaG9pY2VzLnBsdWNrKCd2YWx1ZScpLmluZGV4T2YoZGVmKTtcbiAgfVxuXG4gIC8vIE1ha2Ugc3VyZSBubyBkZWZhdWx0IGlzIHNldCAoc28gaXQgd29uJ3QgYmUgcHJpbnRlZClcbiAgdGhpcy5vcHQuZGVmYXVsdCA9IG51bGw7XG5cbiAgdGhpcy5wYWdpbmF0b3IgPSBuZXcgUGFnaW5hdG9yKCk7XG59XG51dGlsLmluaGVyaXRzKFByb21wdCwgQmFzZSk7XG5cbi8qKlxuICogU3RhcnQgdGhlIElucXVpcnkgc2Vzc2lvblxuICogQHBhcmFtICB7RnVuY3Rpb259IGNiICAgICAgQ2FsbGJhY2sgd2hlbiBwcm9tcHQgaXMgZG9uZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuXG5Qcm9tcHQucHJvdG90eXBlLl9ydW4gPSBmdW5jdGlvbiAoY2IpIHtcbiAgdGhpcy5kb25lID0gY2I7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBldmVudHMgPSBvYnNlcnZlKHRoaXMucmwpO1xuICBldmVudHMubm9ybWFsaXplZFVwS2V5LnRha2VVbnRpbChldmVudHMubGluZSkuZm9yRWFjaCh0aGlzLm9uVXBLZXkuYmluZCh0aGlzKSk7XG4gIGV2ZW50cy5ub3JtYWxpemVkRG93bktleS50YWtlVW50aWwoZXZlbnRzLmxpbmUpLmZvckVhY2godGhpcy5vbkRvd25LZXkuYmluZCh0aGlzKSk7XG4gIGV2ZW50cy5udW1iZXJLZXkudGFrZVVudGlsKGV2ZW50cy5saW5lKS5mb3JFYWNoKHRoaXMub25OdW1iZXJLZXkuYmluZCh0aGlzKSk7XG4gIGV2ZW50cy5saW5lXG4gICAgLnRha2UoMSlcbiAgICAubWFwKHRoaXMuZ2V0Q3VycmVudFZhbHVlLmJpbmQodGhpcykpXG4gICAgLmZsYXRNYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gcnVuQXN5bmMoc2VsZi5vcHQuZmlsdGVyKSh2YWx1ZSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICByZXR1cm4gZXJyO1xuICAgICAgfSk7XG4gICAgfSlcbiAgICAuZm9yRWFjaCh0aGlzLm9uU3VibWl0LmJpbmQodGhpcykpO1xuXG4gIC8vIEluaXQgdGhlIHByb21wdFxuICBjbGlDdXJzb3IuaGlkZSgpO1xuICB0aGlzLnJlbmRlcigpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW5kZXIgdGhlIHByb21wdCB0byBzY3JlZW5cbiAqIEByZXR1cm4ge1Byb21wdH0gc2VsZlxuICovXG5cblByb21wdC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICAvLyBSZW5kZXIgcXVlc3Rpb25cbiAgdmFyIG1lc3NhZ2UgPSB0aGlzLmdldFF1ZXN0aW9uKCk7XG5cbiAgaWYgKHRoaXMuZmlyc3RSZW5kZXIpIHtcbiAgICBtZXNzYWdlICs9IGNoYWxrLmRpbSgnKFVzZSBhcnJvdyBrZXlzKScpO1xuICB9XG5cbiAgLy8gUmVuZGVyIGNob2ljZXMgb3IgYW5zd2VyIGRlcGVuZGluZyBvbiB0aGUgc3RhdGVcbiAgaWYgKHRoaXMuc3RhdHVzID09PSAnYW5zd2VyZWQnKSB7XG4gICAgbWVzc2FnZSArPSBjaGFsay5jeWFuKHRoaXMub3B0LmNob2ljZXMuZ2V0Q2hvaWNlKHRoaXMuc2VsZWN0ZWQpLnNob3J0KTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgY2hvaWNlc1N0ciA9IGxpc3RSZW5kZXIodGhpcy5vcHQuY2hvaWNlcywgdGhpcy5zZWxlY3RlZCk7XG4gICAgdmFyIGluZGV4UG9zaXRpb24gPSB0aGlzLm9wdC5jaG9pY2VzLmluZGV4T2YodGhpcy5vcHQuY2hvaWNlcy5nZXRDaG9pY2UodGhpcy5zZWxlY3RlZCkpO1xuICAgIG1lc3NhZ2UgKz0gJ1xcbicgKyB0aGlzLnBhZ2luYXRvci5wYWdpbmF0ZShjaG9pY2VzU3RyLCBpbmRleFBvc2l0aW9uLCB0aGlzLm9wdC5wYWdlU2l6ZSk7XG4gIH1cblxuICB0aGlzLmZpcnN0UmVuZGVyID0gZmFsc2U7XG5cbiAgdGhpcy5zY3JlZW4ucmVuZGVyKG1lc3NhZ2UpO1xufTtcblxuLyoqXG4gKiBXaGVuIHVzZXIgcHJlc3MgYGVudGVyYCBrZXlcbiAqL1xuXG5Qcm9tcHQucHJvdG90eXBlLm9uU3VibWl0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHRoaXMuc3RhdHVzID0gJ2Fuc3dlcmVkJztcblxuICAvLyBSZXJlbmRlciBwcm9tcHRcbiAgdGhpcy5yZW5kZXIoKTtcblxuICB0aGlzLnNjcmVlbi5kb25lKCk7XG4gIGNsaUN1cnNvci5zaG93KCk7XG4gIHRoaXMuZG9uZSh2YWx1ZSk7XG59O1xuXG5Qcm9tcHQucHJvdG90eXBlLmdldEN1cnJlbnRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMub3B0LmNob2ljZXMuZ2V0Q2hvaWNlKHRoaXMuc2VsZWN0ZWQpLnZhbHVlO1xufTtcblxuLyoqXG4gKiBXaGVuIHVzZXIgcHJlc3MgYSBrZXlcbiAqL1xuUHJvbXB0LnByb3RvdHlwZS5vblVwS2V5ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbGVuID0gdGhpcy5vcHQuY2hvaWNlcy5yZWFsTGVuZ3RoO1xuICB0aGlzLnNlbGVjdGVkID0gKHRoaXMuc2VsZWN0ZWQgPiAwKSA/IHRoaXMuc2VsZWN0ZWQgLSAxIDogbGVuIC0gMTtcbiAgdGhpcy5yZW5kZXIoKTtcbn07XG5cblByb21wdC5wcm90b3R5cGUub25Eb3duS2V5ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbGVuID0gdGhpcy5vcHQuY2hvaWNlcy5yZWFsTGVuZ3RoO1xuICB0aGlzLnNlbGVjdGVkID0gKHRoaXMuc2VsZWN0ZWQgPCBsZW4gLSAxKSA/IHRoaXMuc2VsZWN0ZWQgKyAxIDogMDtcbiAgdGhpcy5yZW5kZXIoKTtcbn07XG5cblByb21wdC5wcm90b3R5cGUub25OdW1iZXJLZXkgPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgaWYgKGlucHV0IDw9IHRoaXMub3B0LmNob2ljZXMucmVhbExlbmd0aCkge1xuICAgIHRoaXMuc2VsZWN0ZWQgPSBpbnB1dCAtIDE7XG4gIH1cbiAgdGhpcy5yZW5kZXIoKTtcbn07XG5cbi8qKlxuICogRnVuY3Rpb24gZm9yIHJlbmRlcmluZyBsaXN0IGNob2ljZXNcbiAqIEBwYXJhbSAge051bWJlcn0gcG9pbnRlciBQb3NpdGlvbiBvZiB0aGUgcG9pbnRlclxuICogQHJldHVybiB7U3RyaW5nfSAgICAgICAgIFJlbmRlcmVkIGNvbnRlbnRcbiAqL1xuZnVuY3Rpb24gbGlzdFJlbmRlcihjaG9pY2VzLCBwb2ludGVyKSB7XG4gIHZhciBvdXRwdXQgPSAnJztcbiAgdmFyIHNlcGFyYXRvck9mZnNldCA9IDA7XG5cbiAgY2hvaWNlcy5mb3JFYWNoKGZ1bmN0aW9uIChjaG9pY2UsIGkpIHtcbiAgICBpZiAoY2hvaWNlLnR5cGUgPT09ICdzZXBhcmF0b3InKSB7XG4gICAgICBzZXBhcmF0b3JPZmZzZXQrKztcbiAgICAgIG91dHB1dCArPSAnICAnICsgY2hvaWNlICsgJ1xcbic7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGNob2ljZS5kaXNhYmxlZCkge1xuICAgICAgc2VwYXJhdG9yT2Zmc2V0Kys7XG4gICAgICBvdXRwdXQgKz0gJyAgLSAnICsgY2hvaWNlLm5hbWU7XG4gICAgICBvdXRwdXQgKz0gJyAoJyArIChfLmlzU3RyaW5nKGNob2ljZS5kaXNhYmxlZCkgPyBjaG9pY2UuZGlzYWJsZWQgOiAnRGlzYWJsZWQnKSArICcpJztcbiAgICAgIG91dHB1dCArPSAnXFxuJztcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgaXNTZWxlY3RlZCA9IChpIC0gc2VwYXJhdG9yT2Zmc2V0ID09PSBwb2ludGVyKTtcbiAgICB2YXIgbGluZSA9IChpc1NlbGVjdGVkID8gZmlndXJlcy5wb2ludGVyICsgJyAnIDogJyAgJykgKyBjaG9pY2UubmFtZTtcbiAgICBpZiAoaXNTZWxlY3RlZCkge1xuICAgICAgbGluZSA9IGNoYWxrLmN5YW4obGluZSk7XG4gICAgfVxuICAgIG91dHB1dCArPSBsaW5lICsgJyBcXG4nO1xuICB9KTtcblxuICByZXR1cm4gb3V0cHV0LnJlcGxhY2UoL1xcbiQvLCAnJyk7XG59XG4iXX0=