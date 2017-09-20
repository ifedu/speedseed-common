'use strict';
var assert = require('assert');
var _ = require('lodash');
/**
 * @mixin
 * @alias util/prompt-suggestion
 */
var promptSuggestion = module.exports;
/**
 * Returns the default value for a checkbox.
 *
 * @param  {Object} question Inquirer prompt item
 * @param  {*} defaultValue  The stored default value
 * @return {*}               Default value to set
 * @private
 */
var getCheckboxDefault = function (question, defaultValue) {
    // For simplicity we uncheck all boxes and
    // use .default to set the active ones.
    _.each(question.choices, function (choice) {
        if (typeof choice === 'object') {
            choice.checked = false;
        }
    });
    return defaultValue;
};
/**
 * Returns the default value for a list.
 *
 * @param  {Object} question    Inquirer prompt item
 * @param  {*} defaultValue     The stored default value
 * @return {*}                  Default value to set
 * @private
 */
var getListDefault = function (question, defaultValue) {
    var choiceValues = _.map(question.choices, function (choice) {
        if (typeof choice === 'object') {
            return choice.value;
        }
        return choice;
    });
    return choiceValues.indexOf(defaultValue);
};
/**
 * Return true if the answer should be store in
 * the global store, otherwise false.
 *
 * @param  {Object}       question Inquirer prompt item
 * @param  {String|Array} answer   The inquirer answer
 * @param  {Boolean}      storeAll Should store default values
 * @return {Boolean}               Answer to be stored
 * @private
 */
var storeListAnswer = function (question, answer, storeAll) {
    var choiceValues = _.map(question.choices, function (choice) {
        if (Object.prototype.hasOwnProperty.call(choice, 'value')) {
            return choice.value;
        }
        return choice;
    });
    var choiceIndex = choiceValues.indexOf(answer);
    // Check if answer is not equal to default value
    if (storeAll || question.default !== choiceIndex) {
        return true;
    }
    return false;
};
/**
 * Return true if the answer should be store in
 * the global store, otherwise false.
 *
 * @param  {Object}       question Inquirer prompt item
 * @param  {String|Array} answer   The inquirer answer
 * @param  {Boolean}      storeAll Should store default values
 * @return {Boolean}               Answer to be stored
 * @private
 */
var storeAnswer = function (question, answer, storeAll) {
    // Check if answer is not equal to default value or is undefined
    if (answer !== undefined && (storeAll || question.default !== answer)) {
        return true;
    }
    return false;
};
/**
 * Prefill the defaults with values from the global store.
 *
 * @param  {Store}        store     `.yo-rc-global` global config
 * @param  {Array|Object} questions Original prompt questions
 * @return {Array}                  Prompt questions array with prefilled values.
 */
promptSuggestion.prefillQuestions = function (store, questions) {
    assert(store, 'A store parameter is required');
    assert(questions, 'A questions parameter is required');
    var promptValues = store.get('promptValues') || {};
    if (!Array.isArray(questions)) {
        questions = [questions];
    }
    questions = questions.map(_.clone);
    // Write user defaults back to prompt
    return questions.map(function (question) {
        if (question.store !== true) {
            return question;
        }
        var storedValue = promptValues[question.name];
        if (storedValue === undefined) {
            return question;
        }
        // Override prompt default with the user's default
        switch (question.type) {
            case 'rawlist':
            case 'expand':
                question.default = getListDefault(question, storedValue);
                break;
            case 'checkbox':
                question.default = getCheckboxDefault(question, storedValue);
                break;
            default:
                question.default = storedValue;
                break;
        }
        return question;
    });
};
/**
 * Store the answers in the global store.
 *
 * @param  {Store}        store     `.yo-rc-global` global config
 * @param  {Array|Object} questions Original prompt questions
 * @param  {Object}       answers   The inquirer answers
 * @param  {Boolean}      storeAll  Should store default values
 */
promptSuggestion.storeAnswers = function (store, questions, answers, storeAll) {
    assert(store, 'A store parameter is required');
    assert(answers, 'A answers parameter is required');
    assert(questions, 'A questions parameter is required');
    assert.ok(_.isObject(answers), 'answers must be a object');
    storeAll = storeAll || false;
    var promptValues = store.get('promptValues') || {};
    if (!Array.isArray(questions)) {
        questions = [questions];
    }
    _.each(questions, function (question) {
        if (question.store !== true) {
            return;
        }
        var saveAnswer;
        var key = question.name;
        var answer = answers[key];
        switch (question.type) {
            case 'rawlist':
            case 'expand':
                saveAnswer = storeListAnswer(question, answer, storeAll);
                break;
            default:
                saveAnswer = storeAnswer(question, answer, storeAll);
                break;
        }
        if (saveAnswer) {
            promptValues[key] = answer;
        }
    });
    if (Object.keys(promptValues).length) {
        store.set('promptValues', promptValues);
    }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFx5ZW9tYW4tZ2VuZXJhdG9yXFxsaWJcXHV0aWxcXHByb21wdC1zdWdnZXN0aW9uLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXHllb21hbi1nZW5lcmF0b3JcXGxpYlxcdXRpbFxccHJvbXB0LXN1Z2dlc3Rpb24uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDO0FBQ2IsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9CLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUUxQjs7O0dBR0c7QUFDSCxJQUFJLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFFdEM7Ozs7Ozs7R0FPRztBQUNILElBQUksa0JBQWtCLEdBQUcsVUFBVSxRQUFRLEVBQUUsWUFBWTtJQUN2RCwwQ0FBMEM7SUFDMUMsdUNBQXVDO0lBQ3ZDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxVQUFVLE1BQU07UUFDdkMsRUFBRSxDQUFDLENBQUMsT0FBTyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztZQUMvQixNQUFNLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztRQUN6QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLENBQUMsWUFBWSxDQUFDO0FBQ3RCLENBQUMsQ0FBQztBQUVGOzs7Ozs7O0dBT0c7QUFDSCxJQUFJLGNBQWMsR0FBRyxVQUFVLFFBQVEsRUFBRSxZQUFZO0lBQ25ELElBQUksWUFBWSxHQUFHLENB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QUFFLFVBQVUsUUFBUTtRQUNsQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDNUIsTUFBTSxDQUFDO1FBQ1QsQ0FBQztRQUVELElBQUksVUFBVSxDQUFDO1FBQ2YsSUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztRQUN4QixJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFMUIsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDdEIsS0FBSyxTQUFTLENBQUM7WUFDZixLQUFLLFFBQVE7Z0JBQ1gsVUFBVSxHQUFHLGVBQWUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUN6RCxLQUFLLENBQUM7WUFFUjtnQkFDRSxVQUFVLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ3JELEtBQUssQ0FBQztRQUNWLENBQUM7UUFFRCxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ2YsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQztRQUM3QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDckMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDMUMsQ0FBQztBQUNILENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKTtcbnZhciBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cbi8qKlxuICogQG1peGluXG4gKiBAYWxpYXMgdXRpbC9wcm9tcHQtc3VnZ2VzdGlvblxuICovXG52YXIgcHJvbXB0U3VnZ2VzdGlvbiA9IG1vZHVsZS5leHBvcnRzO1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGRlZmF1bHQgdmFsdWUgZm9yIGEgY2hlY2tib3guXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBxdWVzdGlvbiBJbnF1aXJlciBwcm9tcHQgaXRlbVxuICogQHBhcmFtICB7Kn0gZGVmYXVsdFZhbHVlICBUaGUgc3RvcmVkIGRlZmF1bHQgdmFsdWVcbiAqIEByZXR1cm4geyp9ICAgICAgICAgICAgICAgRGVmYXVsdCB2YWx1ZSB0byBzZXRcbiAqIEBwcml2YXRlXG4gKi9cbnZhciBnZXRDaGVja2JveERlZmF1bHQgPSBmdW5jdGlvbiAocXVlc3Rpb24sIGRlZmF1bHRWYWx1ZSkge1xuICAvLyBGb3Igc2ltcGxpY2l0eSB3ZSB1bmNoZWNrIGFsbCBib3hlcyBhbmRcbiAgLy8gdXNlIC5kZWZhdWx0IHRvIHNldCB0aGUgYWN0aXZlIG9uZXMuXG4gIF8uZWFjaChxdWVzdGlvbi5jaG9pY2VzLCBmdW5jdGlvbiAoY2hvaWNlKSB7XG4gICAgaWYgKHR5cGVvZiBjaG9pY2UgPT09ICdvYmplY3QnKSB7XG4gICAgICBjaG9pY2UuY2hlY2tlZCA9IGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZGVmYXVsdCB2YWx1ZSBmb3IgYSBsaXN0LlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gcXVlc3Rpb24gICAgSW5xdWlyZXIgcHJvbXB0IGl0ZW1cbiAqIEBwYXJhbSAgeyp9IGRlZmF1bHRWYWx1ZSAgICAgVGhlIHN0b3JlZCBkZWZhdWx0IHZhbHVlXG4gKiBAcmV0dXJuIHsqfSAgICAgICAgICAgICAgICAgIERlZmF1bHQgdmFsdWUgdG8gc2V0XG4gKiBAcHJpdmF0ZVxuICovXG52YXIgZ2V0TGlzdERlZmF1bHQgPSBmdW5jdGlvbiAocXVlc3Rpb24sIGRlZmF1bHRWYWx1ZSkge1xuICB2YXIgY2hvaWNlVmFsdWVzID0gXy5tYXAocXVlc3Rpb24uY2hvaWNlcywgZnVuY3Rpb24gKGNob2ljZSkge1xuICAgIGlmICh0eXBlb2YgY2hvaWNlID09PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIGNob2ljZS52YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGNob2ljZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGNob2ljZVZhbHVlcy5pbmRleE9mKGRlZmF1bHRWYWx1ZSk7XG59O1xuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHRoZSBhbnN3ZXIgc2hvdWxkIGJlIHN0b3JlIGluXG4gKiB0aGUgZ2xvYmFsIHN0b3JlLCBvdGhlcndpc2UgZmFsc2UuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgICBxdWVzdGlvbiBJbnF1aXJlciBwcm9tcHQgaXRlbVxuICogQHBhcmFtICB7U3RyaW5nfEFycmF5fSBhbnN3ZXIgICBUaGUgaW5xdWlyZXIgYW5zd2VyXG4gKiBAcGFyYW0gIHtCb29sZWFufSAgICAgIHN0b3JlQWxsIFNob3VsZCBzdG9yZSBkZWZhdWx0IHZhbHVlc1xuICogQHJldHVybiB7Qm9vbGVhbn0gICAgICAgICAgICAgICBBbnN3ZXIgdG8gYmUgc3RvcmVkXG4gKiBAcHJpdmF0ZVxuICovXG52YXIgc3RvcmVMaXN0QW5zd2VyID0gZnVuY3Rpb24gKHF1ZXN0aW9uLCBhbnN3ZXIsIHN0b3JlQWxsKSB7XG4gIHZhciBjaG9pY2VWYWx1ZXMgPSBfLm1hcChxdWVzdGlvbi5jaG9pY2VzLCBmdW5jdGlvbiAoY2hvaWNlKSB7XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjaG9pY2UsICd2YWx1ZScpKSB7XG4gICAgICByZXR1cm4gY2hvaWNlLnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gY2hvaWNlO1xuICB9KTtcbiAgdmFyIGNob2ljZUluZGV4ID0gY2hvaWNlVmFsdWVzLmluZGV4T2YoYW5zd2VyKTtcblxuICAvLyBDaGVjayBpZiBhbnN3ZXIgaXMgbm90IGVxdWFsIHRvIGRlZmF1bHQgdmFsdWVcbiAgaWYgKHN0b3JlQWxsIHx8IHF1ZXN0aW9uLmRlZmF1bHQgIT09IGNob2ljZUluZGV4KSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHRoZSBhbnN3ZXIgc2hvdWxkIGJlIHN0b3JlIGluXG4gKiB0aGUgZ2xvYmFsIHN0b3JlLCBvdGhlcndpc2UgZmFsc2UuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgICBxdWVzdGlvbiBJbnF1aXJlciBwcm9tcHQgaXRlbVxuICogQHBhcmFtICB7U3RyaW5nfEFycmF5fSBhbnN3ZXIgICBUaGUgaW5xdWlyZXIgYW5zd2VyXG4gKiBAcGFyYW0gIHtCb29sZWFufSAgICAgIHN0b3JlQWxsIFNob3VsZCBzdG9yZSBkZWZhdWx0IHZhbHVlc1xuICogQHJldHVybiB7Qm9vbGVhbn0gICAgICAgICAgICAgICBBbnN3ZXIgdG8gYmUgc3RvcmVkXG4gKiBAcHJpdmF0ZVxuICovXG52YXIgc3RvcmVBbnN3ZXIgPSBmdW5jdGlvbiAocXVlc3Rpb24sIGFuc3dlciwgc3RvcmVBbGwpIHtcbiAgLy8gQ2hlY2sgaWYgYW5zd2VyIGlzIG5vdCBlcXVhbCB0byBkZWZhdWx0IHZhbHVlIG9yIGlzIHVuZGVmaW5lZFxuICBpZiAoYW5zd2VyICE9PSB1bmRlZmluZWQgJiYgKHN0b3JlQWxsIHx8IHF1ZXN0aW9uLmRlZmF1bHQgIT09IGFuc3dlcikpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogUHJlZmlsbCB0aGUgZGVmYXVsdHMgd2l0aCB2YWx1ZXMgZnJvbSB0aGUgZ2xvYmFsIHN0b3JlLlxuICpcbiAqIEBwYXJhbSAge1N0b3JlfSAgICAgICAgc3RvcmUgICAgIGAueW8tcmMtZ2xvYmFsYCBnbG9iYWwgY29uZmlnXG4gKiBAcGFyYW0gIHtBcnJheXxPYmplY3R9IHF1ZXN0aW9ucyBPcmlnaW5hbCBwcm9tcHQgcXVlc3Rpb25zXG4gKiBAcmV0dXJuIHtBcnJheX0gICAgICAgICAgICAgICAgICBQcm9tcHQgcXVlc3Rpb25zIGFycmF5IHdpdGggcHJlZmlsbGVkIHZhbHVlcy5cbiAqL1xucHJvbXB0U3VnZ2VzdGlvbi5wcmVmaWxsUXVlc3Rpb25zID0gZnVuY3Rpb24gKHN0b3JlLCBxdWVzdGlvbnMpIHtcbiAgYXNzZXJ0KHN0b3JlLCAnQSBzdG9yZSBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnKTtcbiAgYXNzZXJ0KHF1ZXN0aW9ucywgJ0EgcXVlc3Rpb25zIHBhcmFtZXRlciBpcyByZXF1aXJlZCcpO1xuXG4gIHZhciBwcm9tcHRWYWx1ZXMgPSBzdG9yZS5nZXQoJ3Byb21wdFZhbHVlcycpIHx8IHt9O1xuXG4gIGlmICghQXJyYXkuaXNBcnJheShxdWVzdGlvbnMpKSB7XG4gICAgcXVlc3Rpb25zID0gW3F1ZXN0aW9uc107XG4gIH1cblxuICBxdWVzdGlvbnMgPSBxdWVzdGlvbnMubWFwKF8uY2xvbmUpO1xuXG4gIC8vIFdyaXRlIHVzZXIgZGVmYXVsdHMgYmFjayB0byBwcm9tcHRcbiAgcmV0dXJuIHF1ZXN0aW9ucy5tYXAoZnVuY3Rpb24gKHF1ZXN0aW9uKSB7XG4gICAgaWYgKHF1ZXN0aW9uLnN0b3JlICE9PSB0cnVlKSB7XG4gICAgICByZXR1cm4gcXVlc3Rpb247XG4gICAgfVxuXG4gICAgdmFyIHN0b3JlZFZhbHVlID0gcHJvbXB0VmFsdWVzW3F1ZXN0aW9uLm5hbWVdO1xuXG4gICAgaWYgKHN0b3JlZFZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBxdWVzdGlvbjtcbiAgICB9XG5cbiAgICAvLyBPdmVycmlkZSBwcm9tcHQgZGVmYXVsdCB3aXRoIHRoZSB1c2VyJ3MgZGVmYXVsdFxuICAgIHN3aXRjaCAocXVlc3Rpb24udHlwZSkge1xuICAgICAgY2FzZSAncmF3bGlzdCc6XG4gICAgICBjYXNlICdleHBhbmQnOlxuICAgICAgICBxdWVzdGlvbi5kZWZhdWx0ID0gZ2V0TGlzdERlZmF1bHQocXVlc3Rpb24sIHN0b3JlZFZhbHVlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgIHF1ZXN0aW9uLmRlZmF1bHQgPSBnZXRDaGVja2JveERlZmF1bHQocXVlc3Rpb24sIHN0b3JlZFZhbHVlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBxdWVzdGlvbi5kZWZhdWx0ID0gc3RvcmVkVmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiBxdWVzdGlvbjtcbiAgfSk7XG59O1xuXG4vKipcbiAqIFN0b3JlIHRoZSBhbnN3ZXJzIGluIHRoZSBnbG9iYWwgc3RvcmUuXG4gKlxuICogQHBhcmFtICB7U3RvcmV9ICAgICAgICBzdG9yZSAgICAgYC55by1yYy1nbG9iYWxgIGdsb2JhbCBjb25maWdcbiAqIEBwYXJhbSAge0FycmF5fE9iamVjdH0gcXVlc3Rpb25zIE9yaWdpbmFsIHByb21wdCBxdWVzdGlvbnNcbiAqIEBwYXJhbSAge09iamVjdH0gICAgICAgYW5zd2VycyAgIFRoZSBpbnF1aXJlciBhbnN3ZXJzXG4gKiBAcGFyYW0gIHtCb29sZWFufSAgICAgIHN0b3JlQWxsICBTaG91bGQgc3RvcmUgZGVmYXVsdCB2YWx1ZXNcbiAqL1xucHJvbXB0U3VnZ2VzdGlvbi5zdG9yZUFuc3dlcnMgPSBmdW5jdGlvbiAoc3RvcmUsIHF1ZXN0aW9ucywgYW5zd2Vycywgc3RvcmVBbGwpIHtcbiAgYXNzZXJ0KHN0b3JlLCAnQSBzdG9yZSBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnKTtcbiAgYXNzZXJ0KGFuc3dlcnMsICdBIGFuc3dlcnMgcGFyYW1ldGVyIGlzIHJlcXVpcmVkJyk7XG4gIGFzc2VydChxdWVzdGlvbnMsICdBIHF1ZXN0aW9ucyBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnKTtcbiAgYXNzZXJ0Lm9rKF8uaXNPYmplY3QoYW5zd2VycyksICdhbnN3ZXJzIG11c3QgYmUgYSBvYmplY3QnKTtcblxuICBzdG9yZUFsbCA9IHN0b3JlQWxsIHx8IGZhbHNlO1xuICB2YXIgcHJvbXB0VmFsdWVzID0gc3RvcmUuZ2V0KCdwcm9tcHRWYWx1ZXMnKSB8fCB7fTtcblxuICBpZiAoIUFycmF5LmlzQXJyYXkocXVlc3Rpb25zKSkge1xuICAgIHF1ZXN0aW9ucyA9IFtxdWVzdGlvbnNdO1xuICB9XG5cbiAgXy5lYWNoKHF1ZXN0aW9ucywgZnVuY3Rpb24gKHF1ZXN0aW9uKSB7XG4gICAgaWYgKHF1ZXN0aW9uLnN0b3JlICE9PSB0cnVlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHNhdmVBbnN3ZXI7XG4gICAgdmFyIGtleSA9IHF1ZXN0aW9uLm5hbWU7XG4gICAgdmFyIGFuc3dlciA9IGFuc3dlcnNba2V5XTtcblxuICAgIHN3aXRjaCAocXVlc3Rpb24udHlwZSkge1xuICAgICAgY2FzZSAncmF3bGlzdCc6XG4gICAgICBjYXNlICdleHBhbmQnOlxuICAgICAgICBzYXZlQW5zd2VyID0gc3RvcmVMaXN0QW5zd2VyKHF1ZXN0aW9uLCBhbnN3ZXIsIHN0b3JlQWxsKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHNhdmVBbnN3ZXIgPSBzdG9yZUFuc3dlcihxdWVzdGlvbiwgYW5zd2VyLCBzdG9yZUFsbCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChzYXZlQW5zd2VyKSB7XG4gICAgICBwcm9tcHRWYWx1ZXNba2V5XSA9IGFuc3dlcjtcbiAgICB9XG4gIH0pO1xuXG4gIGlmIChPYmplY3Qua2V5cyhwcm9tcHRWYWx1ZXMpLmxlbmd0aCkge1xuICAgIHN0b3JlLnNldCgncHJvbXB0VmFsdWVzJywgcHJvbXB0VmFsdWVzKTtcbiAgfVxufTtcbiJdfQ==