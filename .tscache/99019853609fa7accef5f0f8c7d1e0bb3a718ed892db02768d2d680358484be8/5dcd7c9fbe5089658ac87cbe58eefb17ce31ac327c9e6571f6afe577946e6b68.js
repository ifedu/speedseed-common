/**
 * `password` type prompt
 */
var util = require('util');
var chalk = require('chalk');
var Base = require('./base');
var observe = require('../utils/events');
function mask(input) {
    input = String(input);
    if (input.length === 0) {
        return '';
    }
    return new Array(input.length + 1).join('*');
}
/**
 * Module exports
 */
module.exports = Prompt;
/**
 * Constructor
 */
function Prompt() {
    return Base.apply(this, arguments);
}
util.inherits(Prompt, Base);
/**
 * Start the Inquiry session
 * @param  {Function} cb      Callback when prompt is done
 * @return {this}
 */
Prompt.prototype._run = function (cb) {
    this.done = cb;
    var events = observe(this.rl);
    // Once user confirm (enter key)
    var submit = events.line.map(this.filterInput.bind(this));
    var validation = this.handleSubmitEvents(submit);
    validation.success.forEach(this.onEnd.bind(this));
    validation.error.forEach(this.onError.bind(this));
    events.keypress.takeUntil(validation.success).forEach(this.onKeypress.bind(this));
    // Init
    this.render();
    return this;
};
/**
 * Render the prompt to screen
 * @return {Prompt} self
 */
Prompt.prototype.render = function (error) {
    var message = this.getQuestion();
    var bottomContent = '';
    if (this.status === 'answered') {
        message += chalk.cyan(mask(this.answer));
    }
    else {
        message += mask(this.rl.line || '');
    }
    if (error) {
        bottomContent = '\n' + chalk.red('>> ') + error;
    }
    this.screen.render(message, bottomContent);
};
/**
 * When user press `enter` key
 */
Prompt.prototype.filterInput = function (input) {
    if (!input) {
        return this.opt.default == null ? '' : this.opt.default;
    }
    return input;
};
Prompt.prototype.onEnd = function (state) {
    this.status = 'answered';
    this.answer = state.value;
    // Re-render prompt
    this.render();
    this.screen.done();
    this.done(state.value);
};
Prompt.prototype.onError = function (state) {
    this.render(state.isValid);
    this.rl.output.unmute();
};
/**
 * When user type
 */
Prompt.prototype.onKeypress = function () {
    this.render();
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxpbnF1aXJlclxcbGliXFxwcm9tcHRzXFxwYXNzd29yZC5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxpbnF1aXJlclxcbGliXFxwcm9tcHRzXFxwYXNzd29yZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUVILElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMzQixJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0IsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzdCLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBRXpDLGNBQWMsS0FBSztJQUNqQixLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RCLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixNQUFNLENBQUMsRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRUQ7O0dBRUc7QUFFSCxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztBQUV4Qjs7R0FFRztBQUVIO0lBQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFD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bkIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDO0FBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsVUFBVSxLQUFLO0lBQ3hDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzNCLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQzFCLENBQUMsQ0FBQztBQUVGOztHQUVHO0FBRUgsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUc7SUFDNUIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ2hCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogYHBhc3N3b3JkYCB0eXBlIHByb21wdFxuICovXG5cbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xudmFyIGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbnZhciBCYXNlID0gcmVxdWlyZSgnLi9iYXNlJyk7XG52YXIgb2JzZXJ2ZSA9IHJlcXVpcmUoJy4uL3V0aWxzL2V2ZW50cycpO1xuXG5mdW5jdGlvbiBtYXNrKGlucHV0KSB7XG4gIGlucHV0ID0gU3RyaW5nKGlucHV0KTtcbiAgaWYgKGlucHV0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIHJldHVybiBuZXcgQXJyYXkoaW5wdXQubGVuZ3RoICsgMSkuam9pbignKicpO1xufVxuXG4vKipcbiAqIE1vZHVsZSBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBQcm9tcHQ7XG5cbi8qKlxuICogQ29uc3RydWN0b3JcbiAqL1xuXG5mdW5jdGlvbiBQcm9tcHQoKSB7XG4gIHJldHVybiBCYXNlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG51dGlsLmluaGVyaXRzKFByb21wdCwgQmFzZSk7XG5cbi8qKlxuICogU3RhcnQgdGhlIElucXVpcnkgc2Vzc2lvblxuICogQHBhcmFtICB7RnVuY3Rpb259IGNiICAgICAgQ2FsbGJhY2sgd2hlbiBwcm9tcHQgaXMgZG9uZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuXG5Qcm9tcHQucHJvdG90eXBlLl9ydW4gPSBmdW5jdGlvbiAoY2IpIHtcbiAgdGhpcy5kb25lID0gY2I7XG5cbiAgdmFyIGV2ZW50cyA9IG9ic2VydmUodGhpcy5ybCk7XG5cbiAgLy8gT25jZSB1c2VyIGNvbmZpcm0gKGVudGVyIGtleSlcbiAgdmFyIHN1Ym1pdCA9IGV2ZW50cy5saW5lLm1hcCh0aGlzLmZpbHRlcklucHV0LmJpbmQodGhpcykpO1xuXG4gIHZhciB2YWxpZGF0aW9uID0gdGhpcy5oYW5kbGVTdWJtaXRFdmVudHMoc3VibWl0KTtcbiAgdmFsaWRhdGlvbi5zdWNjZXNzLmZvckVhY2godGhpcy5vbkVuZC5iaW5kKHRoaXMpKTtcbiAgdmFsaWRhdGlvbi5lcnJvci5mb3JFYWNoKHRoaXMub25FcnJvci5iaW5kKHRoaXMpKTtcblxuICBldmVudHMua2V5cHJlc3MudGFrZVVudGlsKHZhbGlkYXRpb24uc3VjY2VzcykuZm9yRWFjaCh0aGlzLm9uS2V5cHJlc3MuYmluZCh0aGlzKSk7XG5cbiAgLy8gSW5pdFxuICB0aGlzLnJlbmRlcigpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW5kZXIgdGhlIHByb21wdCB0byBzY3JlZW5cbiAqIEByZXR1cm4ge1Byb21wdH0gc2VsZlxuICovXG5cblByb21wdC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gIHZhciBtZXNzYWdlID0gdGhpcy5nZXRRdWVzdGlvbigpO1xuICB2YXIgYm90dG9tQ29udGVudCA9ICcnO1xuXG4gIGlmICh0aGlzLnN0YXR1cyA9PT0gJ2Fuc3dlcmVkJykge1xuICAgIG1lc3NhZ2UgKz0gY2hhbGsuY3lhbihtYXNrKHRoaXMuYW5zd2VyKSk7XG4gIH0gZWxzZSB7XG4gICAgbWVzc2FnZSArPSBtYXNrKHRoaXMucmwubGluZSB8fCAnJyk7XG4gIH1cblxuICBpZiAoZXJyb3IpIHtcbiAgICBib3R0b21Db250ZW50ID0gJ1xcbicgKyBjaGFsay5yZWQoJz4+ICcpICsgZXJyb3I7XG4gIH1cblxuICB0aGlzLnNjcmVlbi5yZW5kZXIobWVzc2FnZSwgYm90dG9tQ29udGVudCk7XG59O1xuXG4vKipcbiAqIFdoZW4gdXNlciBwcmVzcyBgZW50ZXJgIGtleVxuICovXG5cblByb21wdC5wcm90b3R5cGUuZmlsdGVySW5wdXQgPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgaWYgKCFpbnB1dCkge1xuICAgIHJldHVybiB0aGlzLm9wdC5kZWZhdWx0ID09IG51bGwgPyAnJyA6IHRoaXMub3B0LmRlZmF1bHQ7XG4gIH1cbiAgcmV0dXJuIGlucHV0O1xufTtcblxuUHJvbXB0LnByb3RvdHlwZS5vbkVuZCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICB0aGlzLnN0YXR1cyA9ICdhbnN3ZXJlZCc7XG4gIHRoaXMuYW5zd2VyID0gc3RhdGUudmFsdWU7XG5cbiAgLy8gUmUtcmVuZGVyIHByb21wdFxuICB0aGlzLnJlbmRlcigpO1xuXG4gIHRoaXMuc2NyZWVuLmRvbmUoKTtcbiAgdGhpcy5kb25lKHN0YXRlLnZhbHVlKTtcbn07XG5cblByb21wdC5wcm90b3R5cGUub25FcnJvciA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICB0aGlzLnJlbmRlcihzdGF0ZS5pc1ZhbGlkKTtcbiAgdGhpcy5ybC5vdXRwdXQudW5tdXRlKCk7XG59O1xuXG4vKipcbiAqIFdoZW4gdXNlciB0eXBlXG4gKi9cblxuUHJvbXB0LnByb3RvdHlwZS5vbktleXByZXNzID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnJlbmRlcigpO1xufTtcbiJdfQ==