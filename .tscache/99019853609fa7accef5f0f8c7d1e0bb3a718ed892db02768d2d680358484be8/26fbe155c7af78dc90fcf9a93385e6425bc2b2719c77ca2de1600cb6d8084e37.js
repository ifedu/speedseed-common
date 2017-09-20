/** @module env/log */
'use strict';
var util = require('util');
var events = require('events');
var _ = require('lodash');
var table = require('text-table');
var chalk = require('chalk');
var logSymbols = require('log-symbols');
// padding step
var step = '  ';
var padding = ' ';
// color -> status mappings
var colors = {
    skip: 'yellow',
    force: 'yellow',
    create: 'green',
    invoke: 'bold',
    conflict: 'red',
    identical: 'cyan',
    info: 'gray'
};
function pad(status) {
    var max = 'identical'.length;
    var delta = max - status.length;
    return delta ? new Array(delta + 1).join(' ') + status : status;
}
// borrowed from https://github.com/mikeal/logref/blob/master/main.js#L6-15
function formatter(msg, ctx) {
    while (msg.indexOf('%') !== -1) {
        var start = msg.indexOf('%');
        var end = msg.indexOf(' ', start);
        if (end === -1) {
            end = msg.length;
        }
        msg = msg.slice(0, start) + ctx[msg.slice(start + 1, end)] + msg.slice(end);
    }
    return msg;
}
module.exports = function logger() {
    // `this.log` is a [logref](https://github.com/mikeal/logref)
    // compatible logger, with an enhanced API.
    //
    // It also has EventEmitter like capabilities, so you can call on / emit
    // on it, namely used to increase or decrease the padding.
    //
    // All logs are done against STDERR, letting you stdout for meaningfull
    // value and redirection, should you need to generate output this way.
    //
    // Log functions take two arguments, a message and a context. For any
    // other kind of paramters, `console.error` is used, so all of the
    // console format string goodies you're used to work fine.
    //
    // - msg      - The message to show up
    // - context  - The optional context to escape the message against
    //
    // Returns the logger
    function log(msg, ctx) {
        msg = msg || '';
        if (typeof ctx === 'object' && !Array.isArray(ctx)) {
            console.error(formatter(msg, ctx));
        }
        else {
            console.error.apply(console, arguments);
        }
        return log;
    }
    _.extend(log, events.EventEmitter.prototype);
    // A simple write method, with formatted message.
    //
    // Returns the logger
    log.write = function () {
        process.stderr.write(util.format.apply(util, arguments));
        return this;
    };
    // Same as `log.write()` but automatically appends a `\n` at the end
    // of the message.
    log.writeln = function () {
        this.write.apply(this, arguments);
        this.write('\n');
        return this;
    };
    // Convenience helper to write sucess status, this simply prepends the
    // message with a gren `✔`.
    log.ok = function () {
        this.write(logSymbols.success + ' ' + util.format.apply(util, arguments) + '\n');
        return this;
    };
    log.error = function () {
        this.write(logSymbols.error + ' ' + util.format.apply(util, arguments) + '\n');
        return this;
    };
    log.on('up', function () {
        padding = padding + step;
    });
    log.on('down', function () {
        padding = padding.replace(step, '');
    });
    Object.keys(colors).forEach(function (status) {
        // Each predefined status has its logging method utility, handling
        // status color and padding before the usual `.write()`
        //
        // Example
        //
        //    this.log
        //      .write()
        //      .info('Doing something')
        //      .force('Forcing filepath %s, 'some path')
        //      .conflict('on %s' 'model.js')
        //      .write()
        //      .ok('This is ok');
        //
        // The list of status and mapping colors
        //
        //    skip       yellow
        //    force      yellow
        //    create     green
        //    invoke     bold
        //    conflict   red
        //    identical  cyan
        //    info       grey
        //
        // Returns the logger
        log[status] = function () {
            var color = colors[status];
            this.write(chalk[color](pad(status))).write(padding);
            this.write(util.format.apply(util, arguments) + '\n');
            return this;
        };
    });
    // A basic wrapper around `cli-table` package, resetting any single
    // char to empty strings, this is used for aligning options and
    // arguments without too much Math on our side.
    //
    // - opts - A list of rows or an Hash of options to pass through cli
    //          table.
    //
    // Returns the table reprensetation
    log.table = function (opts) {
        var tableData = [];
        opts = Array.isArray(opts) ? { rows: opts } : opts;
        opts.rows = opts.rows || [];
        opts.rows.forEach(function (row) {
            tableData.push(row);
        });
        return table(tableData);
    };
    return log;
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZW52aXJvbm1lbnRcXGxpYlxcdXRpbFxcbG9nLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXHllb21hbi1lbnZpcm9ubWVudFxcbGliXFx1dGlsXFxsb2cuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsc0JBQXNCO0FBQ3RCLFlBQVksQ0FBQztBQUViLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMzQixJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0IsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzFCLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUNsQyxJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0IsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBRXhDLGVBQWU7QUFDZixJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7QUFDaEIsSUFBSSxPQUFPLEdBQUcsR0FBRyxDQUFDO0FBRWxCLDJCQUEyQjtBQUMzQixJQUFJLE1BQU0sR0FBRztJQUNYLElBQUksRUFBRSxRQUFRO0lBQ2QsS0FBSyxFQUFFLFFBQVE7SUFDZixNQUFNLEVBQUUsT0FBTztJQUNmLE1BQU0sRUFBRSxNQUFNO0lBQ2QsUUFBUSxFQUFFLEtBQUs7SUFDZixTQUFTLEVBQUUsTUFBTTtJQUNqQixJQUFJLEVBQUUsTUFBTTtDQUNiLENBQUM7QUFFRixhQUFh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RUYsTUFBTSxDQUFDLEdBQUcsQ0FBQztBQUNiLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKiBAbW9kdWxlIGVudi9sb2cgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG52YXIgZXZlbnRzID0gcmVxdWlyZSgnZXZlbnRzJyk7XG52YXIgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xudmFyIHRhYmxlID0gcmVxdWlyZSgndGV4dC10YWJsZScpO1xudmFyIGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbnZhciBsb2dTeW1ib2xzID0gcmVxdWlyZSgnbG9nLXN5bWJvbHMnKTtcblxuLy8gcGFkZGluZyBzdGVwXG52YXIgc3RlcCA9ICcgICc7XG52YXIgcGFkZGluZyA9ICcgJztcblxuLy8gY29sb3IgLT4gc3RhdHVzIG1hcHBpbmdzXG52YXIgY29sb3JzID0ge1xuICBza2lwOiAneWVsbG93JyxcbiAgZm9yY2U6ICd5ZWxsb3cnLFxuICBjcmVhdGU6ICdncmVlbicsXG4gIGludm9rZTogJ2JvbGQnLFxuICBjb25mbGljdDogJ3JlZCcsXG4gIGlkZW50aWNhbDogJ2N5YW4nLFxuICBpbmZvOiAnZ3JheSdcbn07XG5cbmZ1bmN0aW9uIHBhZChzdGF0dXMpIHtcbiAgdmFyIG1heCA9ICdpZGVudGljYWwnLmxlbmd0aDtcbiAgdmFyIGRlbHRhID0gbWF4IC0gc3RhdHVzLmxlbmd0aDtcbiAgcmV0dXJuIGRlbHRhID8gbmV3IEFycmF5KGRlbHRhICsgMSkuam9pbignICcpICsgc3RhdHVzIDogc3RhdHVzO1xufVxuXG4vLyBib3Jyb3dlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9taWtlYWwvbG9ncmVmL2Jsb2IvbWFzdGVyL21haW4uanMjTDYtMTVcbmZ1bmN0aW9uIGZvcm1hdHRlcihtc2csIGN0eCkge1xuICB3aGlsZSAobXNnLmluZGV4T2YoJyUnKSAhPT0gLTEpIHtcbiAgICB2YXIgc3RhcnQgPSBtc2cuaW5kZXhPZignJScpO1xuICAgIHZhciBlbmQgPSBtc2cuaW5kZXhPZignICcsIHN0YXJ0KTtcblxuICAgIGlmIChlbmQgPT09IC0xKSB7XG4gICAgICBlbmQgPSBtc2cubGVuZ3RoO1xuICAgIH1cblxuICAgIG1zZyA9IG1zZy5zbGljZSgwLCBzdGFydCkgKyBjdHhbbXNnLnNsaWNlKHN0YXJ0ICsgMSwgZW5kKV0gKyBtc2cuc2xpY2UoZW5kKTtcbiAgfVxuXG4gIHJldHVybiBtc2c7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbG9nZ2VyKCkge1xuICAvLyBgdGhpcy5sb2dgIGlzIGEgW2xvZ3JlZl0oaHR0cHM6Ly9naXRodWIuY29tL21pa2VhbC9sb2dyZWYpXG4gIC8vIGNvbXBhdGlibGUgbG9nZ2VyLCB3aXRoIGFuIGVuaGFuY2VkIEFQSS5cbiAgLy9cbiAgLy8gSXQgYWxzbyBoYXMgRXZlbnRFbWl0dGVyIGxpa2UgY2FwYWJpbGl0aWVzLCBzbyB5b3UgY2FuIGNhbGwgb24gLyBlbWl0XG4gIC8vIG9uIGl0LCBuYW1lbHkgdXNlZCB0byBpbmNyZWFzZSBvciBkZWNyZWFzZSB0aGUgcGFkZGluZy5cbiAgLy9cbiAgLy8gQWxsIGxvZ3MgYXJlIGRvbmUgYWdhaW5zdCBTVERFUlIsIGxldHRpbmcgeW91IHN0ZG91dCBmb3IgbWVhbmluZ2Z1bGxcbiAgLy8gdmFsdWUgYW5kIHJlZGlyZWN0aW9uLCBzaG91bGQgeW91IG5lZWQgdG8gZ2VuZXJhdGUgb3V0cHV0IHRoaXMgd2F5LlxuICAvL1xuICAvLyBMb2cgZnVuY3Rpb25zIHRha2UgdHdvIGFyZ3VtZW50cywgYSBtZXNzYWdlIGFuZCBhIGNvbnRleHQuIEZvciBhbnlcbiAgLy8gb3RoZXIga2luZCBvZiBwYXJhbXRlcnMsIGBjb25zb2xlLmVycm9yYCBpcyB1c2VkLCBzbyBhbGwgb2YgdGhlXG4gIC8vIGNvbnNvbGUgZm9ybWF0IHN0cmluZyBnb29kaWVzIHlvdSdyZSB1c2VkIHRvIHdvcmsgZmluZS5cbiAgLy9cbiAgLy8gLSBtc2cgICAgICAtIFRoZSBtZXNzYWdlIHRvIHNob3cgdXBcbiAgLy8gLSBjb250ZXh0ICAtIFRoZSBvcHRpb25hbCBjb250ZXh0IHRvIGVzY2FwZSB0aGUgbWVzc2FnZSBhZ2FpbnN0XG4gIC8vXG4gIC8vIFJldHVybnMgdGhlIGxvZ2dlclxuICBmdW5jdGlvbiBsb2cobXNnLCBjdHgpIHtcbiAgICBtc2cgPSBtc2cgfHwgJyc7XG5cbiAgICBpZiAodHlwZW9mIGN0eCA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoY3R4KSkge1xuICAgICAgY29uc29sZS5lcnJvcihmb3JtYXR0ZXIobXNnLCBjdHgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvci5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIHJldHVybiBsb2c7XG4gIH1cblxuICBfLmV4dGVuZChsb2csIGV2ZW50cy5FdmVudEVtaXR0ZXIucHJvdG90eXBlKTtcblxuICAvLyBBIHNpbXBsZSB3cml0ZSBtZXRob2QsIHdpdGggZm9ybWF0dGVkIG1lc3NhZ2UuXG4gIC8vXG4gIC8vIFJldHVybnMgdGhlIGxvZ2dlclxuICBsb2cud3JpdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUodXRpbC5mb3JtYXQuYXBwbHkodXRpbCwgYXJndW1lbnRzKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLy8gU2FtZSBhcyBgbG9nLndyaXRlKClgIGJ1dCBhdXRvbWF0aWNhbGx5IGFwcGVuZHMgYSBgXFxuYCBhdCB0aGUgZW5kXG4gIC8vIG9mIHRoZSBtZXNzYWdlLlxuICBsb2cud3JpdGVsbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLndyaXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdGhpcy53cml0ZSgnXFxuJyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgaGVscGVyIHRvIHdyaXRlIHN1Y2VzcyBzdGF0dXMsIHRoaXMgc2ltcGx5IHByZXBlbmRzIHRoZVxuICAvLyBtZXNzYWdlIHdpdGggYSBncmVuIGDinJRgLlxuICBsb2cub2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy53cml0ZShsb2dTeW1ib2xzLnN1Y2Nlc3MgKyAnICcgKyB1dGlsLmZvcm1hdC5hcHBseSh1dGlsLCBhcmd1bWVudHMpICsgJ1xcbicpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIGxvZy5lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLndyaXRlKGxvZ1N5bWJvbHMuZXJyb3IgKyAnICcgKyB1dGlsLmZvcm1hdC5hcHBseSh1dGlsLCBhcmd1bWVudHMpICsgJ1xcbicpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIGxvZy5vbigndXAnLCBmdW5jdGlvbiAoKSB7XG4gICAgcGFkZGluZyA9IHBhZGRpbmcgKyBzdGVwO1xuICB9KTtcblxuICBsb2cub24oJ2Rvd24nLCBmdW5jdGlvbiAoKSB7XG4gICAgcGFkZGluZyA9IHBhZGRpbmcucmVwbGFjZShzdGVwLCAnJyk7XG4gIH0pO1xuXG4gIE9iamVjdC5rZXlzKGNvbG9ycykuZm9yRWFjaChmdW5jdGlvbiAoc3RhdHVzKSB7XG4gICAgLy8gRWFjaCBwcmVkZWZpbmVkIHN0YXR1cyBoYXMgaXRzIGxvZ2dpbmcgbWV0aG9kIHV0aWxpdHksIGhhbmRsaW5nXG4gICAgLy8gc3RhdHVzIGNvbG9yIGFuZCBwYWRkaW5nIGJlZm9yZSB0aGUgdXN1YWwgYC53cml0ZSgpYFxuICAgIC8vXG4gICAgLy8gRXhhbXBsZVxuICAgIC8vXG4gICAgLy8gICAgdGhpcy5sb2dcbiAgICAvLyAgICAgIC53cml0ZSgpXG4gICAgLy8gICAgICAuaW5mbygnRG9pbmcgc29tZXRoaW5nJylcbiAgICAvLyAgICAgIC5mb3JjZSgnRm9yY2luZyBmaWxlcGF0aCAlcywgJ3NvbWUgcGF0aCcpXG4gICAgLy8gICAgICAuY29uZmxpY3QoJ29uICVzJyAnbW9kZWwuanMnKVxuICAgIC8vICAgICAgLndyaXRlKClcbiAgICAvLyAgICAgIC5vaygnVGhpcyBpcyBvaycpO1xuICAgIC8vXG4gICAgLy8gVGhlIGxpc3Qgb2Ygc3RhdHVzIGFuZCBtYXBwaW5nIGNvbG9yc1xuICAgIC8vXG4gICAgLy8gICAgc2tpcCAgICAgICB5ZWxsb3dcbiAgICAvLyAgICBmb3JjZSAgICAgIHllbGxvd1xuICAgIC8vICAgIGNyZWF0ZSAgICAgZ3JlZW5cbiAgICAvLyAgICBpbnZva2UgICAgIGJvbGRcbiAgICAvLyAgICBjb25mbGljdCAgIHJlZFxuICAgIC8vICAgIGlkZW50aWNhbCAgY3lhblxuICAgIC8vICAgIGluZm8gICAgICAgZ3JleVxuICAgIC8vXG4gICAgLy8gUmV0dXJucyB0aGUgbG9nZ2VyXG4gICAgbG9nW3N0YXR1c10gPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgY29sb3IgPSBjb2xvcnNbc3RhdHVzXTtcbiAgICAgIHRoaXMud3JpdGUoY2hhbGtbY29sb3JdKHBhZChzdGF0dXMpKSkud3JpdGUocGFkZGluZyk7XG4gICAgICB0aGlzLndyaXRlKHV0aWwuZm9ybWF0LmFwcGx5KHV0aWwsIGFyZ3VtZW50cykgKyAnXFxuJyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICB9KTtcblxuICAvLyBBIGJhc2ljIHdyYXBwZXIgYXJvdW5kIGBjbGktdGFibGVgIHBhY2thZ2UsIHJlc2V0dGluZyBhbnkgc2luZ2xlXG4gIC8vIGNoYXIgdG8gZW1wdHkgc3RyaW5ncywgdGhpcyBpcyB1c2VkIGZvciBhbGlnbmluZyBvcHRpb25zIGFuZFxuICAvLyBhcmd1bWVudHMgd2l0aG91dCB0b28gbXVjaCBNYXRoIG9uIG91ciBzaWRlLlxuICAvL1xuICAvLyAtIG9wdHMgLSBBIGxpc3Qgb2Ygcm93cyBvciBhbiBIYXNoIG9mIG9wdGlvbnMgdG8gcGFzcyB0aHJvdWdoIGNsaVxuICAvLyAgICAgICAgICB0YWJsZS5cbiAgLy9cbiAgLy8gUmV0dXJucyB0aGUgdGFibGUgcmVwcmVuc2V0YXRpb25cbiAgbG9nLnRhYmxlID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgICB2YXIgdGFibGVEYXRhID0gW107XG5cbiAgICBvcHRzID0gQXJyYXkuaXNBcnJheShvcHRzKSA/IHsgcm93czogb3B0cyB9IDogb3B0cztcbiAgICBvcHRzLnJvd3MgPSBvcHRzLnJvd3MgfHwgW107XG5cbiAgICBvcHRzLnJvd3MuZm9yRWFjaChmdW5jdGlvbiAocm93KSB7XG4gICAgICB0YWJsZURhdGEucHVzaChyb3cpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRhYmxlKHRhYmxlRGF0YSk7XG4gIH07XG5cbiAgcmV0dXJuIGxvZztcbn07XG4iXX0=