'use strict';
var _ = require('lodash');
var rx = require('rx');
var runAsync = require('run-async');
/**
 * Resolve a question property value if it is passed as a function.
 * This method will overwrite the property on the question object with the received value.
 * @param  {Object} question - Question object
 * @param  {String} prop     - Property to fetch name
 * @param  {Object} answers  - Answers object
 * @return {rx.Obsersable}   - Observable emitting once value is known
 */
exports.fetchAsyncQuestionProperty = function (question, prop, answers) {
    if (!_.isFunction(question[prop])) {
        return rx.Observable.return(question);
    }
    return rx.Observable.fromPromise(runAsync(question[prop])(answers)
        .then(function (value) {
        question[prop] = value;
        return question;
    }));
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxpbnF1aXJlclxcbGliXFx1dGlsc1xcdXRpbHMuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xcaW5xdWlyZXJcXGxpYlxcdXRpbHNcXHV0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQztBQUNiLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMxQixJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdkIsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRXBDOzs7Ozs7O0dBT0c7QUFFSCxPQUFPLENBQUMsMEJBQTBCLEdBQUcsVUFBVSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU87SUFDcEUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1NBQy9ELElBQUksQ0FBQyxVQUFVLEtBQUs7UUFDbkIsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUN2QixNQUFNLENBQUMsUUFBUSxDQUFDO0lBQ2xCLENBQUMsQ0FBQyxDQUNILENBQUM7QUFDSixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG52YXIgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xudmFyIHJ4ID0gcmVxdWlyZSgncngnKTtcbnZhciBydW5Bc3luYyA9IHJlcXVpcmUoJ3J1bi1hc3luYycpO1xuXG4vKipcbiAqIFJlc29sdmUgYSBxdWVzdGlvbiBwcm9wZXJ0eSB2YWx1ZSBpZiBpdCBpcyBwYXNzZWQgYXMgYSBmdW5jdGlvbi5cbiAqIFRoaXMgbWV0aG9kIHdpbGwgb3ZlcndyaXRlIHRoZSBwcm9wZXJ0eSBvbiB0aGUgcXVlc3Rpb24gb2JqZWN0IHdpdGggdGhlIHJlY2VpdmVkIHZhbHVlLlxuICogQHBhcmFtICB7T2JqZWN0fSBxdWVzdGlvbiAtIFF1ZXN0aW9uIG9iamVjdFxuICogQHBhcmFtICB7U3RyaW5nfSBwcm9wICAgICAtIFByb3BlcnR5IHRvIGZldGNoIG5hbWVcbiAqIEBwYXJhbSAge09iamVjdH0gYW5zd2VycyAgLSBBbnN3ZXJzIG9iamVjdFxuICogQHJldHVybiB7cnguT2JzZXJzYWJsZX0gICAtIE9ic2VydmFibGUgZW1pdHRpbmcgb25jZSB2YWx1ZSBpcyBrbm93blxuICovXG5cbmV4cG9ydHMuZmV0Y2hBc3luY1F1ZXN0aW9uUHJvcGVydHkgPSBmdW5jdGlvbiAocXVlc3Rpb24sIHByb3AsIGFuc3dlcnMpIHtcbiAgaWYgKCFfLmlzRnVuY3Rpb24ocXVlc3Rpb25bcHJvcF0pKSB7XG4gICAgcmV0dXJuIHJ4Lk9ic2VydmFibGUucmV0dXJuKHF1ZXN0aW9uKTtcbiAgfVxuXG4gIHJldHVybiByeC5PYnNlcnZhYmxlLmZyb21Qcm9taXNlKHJ1bkFzeW5jKHF1ZXN0aW9uW3Byb3BdKShhbnN3ZXJzKVxuICAgIC50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcXVlc3Rpb25bcHJvcF0gPSB2YWx1ZTtcbiAgICAgIHJldHVybiBxdWVzdGlvbjtcbiAgICB9KVxuICApO1xufTtcbiJdfQ==