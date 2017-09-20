var common = require('./common');
common.register('set', _set, {
    allowGlobbing: false,
    wrapOutput: false,
});
//@
//@ ### set(options)
//@ Available options:
//@
//@ + `+/-e`: exit upon error (`config.fatal`)
//@ + `+/-v`: verbose: show all commands (`config.verbose`)
//@ + `+/-f`: disable filename expansion (globbing)
//@
//@ Examples:
//@
//@ ```javascript
//@ set('-e'); // exit upon first error
//@ set('+e'); // this undoes a "set('-e')"
//@ ```
//@
//@ Sets global configuration variables
function _set(options) {
    if (!options) {
        var args = [].slice.call(arguments, 0);
        if (args.length < 2)
            common.error('must provide an argument');
        options = args[1];
    }
    var negate = (options[0] === '+');
    if (negate) {
        options = '-' + options.slice(1); // parseOptions needs a '-' prefix
    }
    options = common.parseOptions(options, {
        'e': 'fatal',
        'v': 'verbose',
        'f': 'noglob',
    });
    if (negate) {
        Object.keys(options).forEach(function (key) {
            options[key] = !options[key];
        });
    }
    Object.keys(options).forEach(function (key) {
        // Only change the global config if `negate` is false and the option is true
        // or if `negate` is true and the option is false (aka negate !== option)
        if (negate !== options[key]) {
            common.config[key] = options[key];
        }
    });
    return;
}
module.exports = _set;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXHNldC5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxzaGVsbGpzXFxzcmNcXHNldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFO0lBQzNCLGFBQWEsRUFBRSxLQUFLO0lBQ3BCLFVBQVUsRUFBRSxLQUFLO0NBQ2xCLENBQUMsQ0FBQztBQUVILEdBQUc7QUFDSCxvQkFBb0I7QUFDcEIsc0JBQXNCO0FBQ3RCLEdBQUc7QUFDSCw4Q0FBOEM7QUFDOUMsMkRBQTJEO0FBQzNELG1EQUFtRDtBQUNuRCxHQUFHO0FBQ0gsYUFBYTtBQUNiLEdBQUc7QUFDSCxpQkFBaUI7QUFDakIsdUNBQXVDO0FBQ3ZDLDJDQUEyQztBQUMzQyxPQUFPO0FBQ1AsR0FBRztBQUNILHVDQUF1QztBQUN2QyxjQUFjLE9BQU87SUFDbkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2IsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzlELE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsQ0FBQztJQUNELElBQUksTUFBTSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0lBQ2xDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDWCxPQUFPLEdBQUcsR0FBRyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQ0FBa0M7SUFDdEUsQ0FBQztJQUNELE9BQU8sR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRTtRQUNyQyxHQUFHLEVBQUUsT0FBTztRQUNaLEdBQUcsRUFBRSxTQUFTO1FBQ2QsR0FBRyxFQUFFLFFBQVE7S0FDZCxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ1gsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHO1lBQ3hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEdBQUc7UUFDeEMsNEVBQTRFO1FBQzVFLHlFQUF5RTtRQUN6RSxFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQyxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxNQUFNLENBQUM7QUFDVCxDQUFDO0FBQ0QsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKTtcblxuY29tbW9uLnJlZ2lzdGVyKCdzZXQnLCBfc2V0LCB7XG4gIGFsbG93R2xvYmJpbmc6IGZhbHNlLFxuICB3cmFwT3V0cHV0OiBmYWxzZSxcbn0pO1xuXG4vL0Bcbi8vQCAjIyMgc2V0KG9wdGlvbnMpXG4vL0AgQXZhaWxhYmxlIG9wdGlvbnM6XG4vL0Bcbi8vQCArIGArLy1lYDogZXhpdCB1cG9uIGVycm9yIChgY29uZmlnLmZhdGFsYClcbi8vQCArIGArLy12YDogdmVyYm9zZTogc2hvdyBhbGwgY29tbWFuZHMgKGBjb25maWcudmVyYm9zZWApXG4vL0AgKyBgKy8tZmA6IGRpc2FibGUgZmlsZW5hbWUgZXhwYW5zaW9uIChnbG9iYmluZylcbi8vQFxuLy9AIEV4YW1wbGVzOlxuLy9AXG4vL0AgYGBgamF2YXNjcmlwdFxuLy9AIHNldCgnLWUnKTsgLy8gZXhpdCB1cG9uIGZpcnN0IGVycm9yXG4vL0Agc2V0KCcrZScpOyAvLyB0aGlzIHVuZG9lcyBhIFwic2V0KCctZScpXCJcbi8vQCBgYGBcbi8vQFxuLy9AIFNldHMgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gdmFyaWFibGVzXG5mdW5jdGlvbiBfc2V0KG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgaWYgKGFyZ3MubGVuZ3RoIDwgMikgY29tbW9uLmVycm9yKCdtdXN0IHByb3ZpZGUgYW4gYXJndW1lbnQnKTtcbiAgICBvcHRpb25zID0gYXJnc1sxXTtcbiAgfVxuICB2YXIgbmVnYXRlID0gKG9wdGlvbnNbMF0gPT09ICcrJyk7XG4gIGlmIChuZWdhdGUpIHtcbiAgICBvcHRpb25zID0gJy0nICsgb3B0aW9ucy5zbGljZSgxKTsgLy8gcGFyc2VPcHRpb25zIG5lZWRzIGEgJy0nIHByZWZpeFxuICB9XG4gIG9wdGlvbnMgPSBjb21tb24ucGFyc2VPcHRpb25zKG9wdGlvbnMsIHtcbiAgICAnZSc6ICdmYXRhbCcsXG4gICAgJ3YnOiAndmVyYm9zZScsXG4gICAgJ2YnOiAnbm9nbG9iJyxcbiAgfSk7XG5cbiAgaWYgKG5lZ2F0ZSkge1xuICAgIE9iamVjdC5rZXlzKG9wdGlvbnMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgb3B0aW9uc1trZXldID0gIW9wdGlvbnNba2V5XTtcbiAgICB9KTtcbiAgfVxuXG4gIE9iamVjdC5rZXlzKG9wdGlvbnMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgIC8vIE9ubHkgY2hhbmdlIHRoZSBnbG9iYWwgY29uZmlnIGlmIGBuZWdhdGVgIGlzIGZhbHNlIGFuZCB0aGUgb3B0aW9uIGlzIHRydWVcbiAgICAvLyBvciBpZiBgbmVnYXRlYCBpcyB0cnVlIGFuZCB0aGUgb3B0aW9uIGlzIGZhbHNlIChha2EgbmVnYXRlICE9PSBvcHRpb24pXG4gICAgaWYgKG5lZ2F0ZSAhPT0gb3B0aW9uc1trZXldKSB7XG4gICAgICBjb21tb24uY29uZmlnW2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuO1xufVxubW9kdWxlLmV4cG9ydHMgPSBfc2V0O1xuIl19