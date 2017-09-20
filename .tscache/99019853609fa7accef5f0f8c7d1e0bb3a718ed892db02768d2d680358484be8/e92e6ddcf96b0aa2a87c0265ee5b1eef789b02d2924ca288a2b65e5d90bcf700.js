// Generated by CoffeeScript 1.11.1
/*
  ExternalEditor
  Kevin Gravier <kevin@mrkmg.com>
  MIT
 */
(function () {
    var ReadFileError, extend = function (child, parent) { for (var key in parent) {
        if (hasProp.call(parent, key))
            child[key] = parent[key];
    } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; }, hasProp = {}.hasOwnProperty;
    ReadFileError = (function (superClass) {
        extend(ReadFileError, superClass);
        ReadFileError.prototype.message = 'Failed to read temporary file';
        function ReadFileError(original_error) {
            this.original_error = original_error;
        }
        return ReadFileError;
    })(Error);
    module.exports = ReadFileError;
}).call(this);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxleHRlcm5hbC1lZGl0b3JcXG1haW5cXGVycm9yc1xcUmVhZEZpbGVFcnJvci5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxleHRlcm5hbC1lZGl0b3JcXG1haW5cXGVycm9yc1xcUmVhZEZpbGVFcnJvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxtQ0FBbUM7QUFFbkM7Ozs7R0FJRztBQUVILENBQUM7SUFDQyxJQUFJLGFBQWEsRUFDZixNQUFNLEdBQUcsVUFBUyxLQUFLLEVBQUUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztZQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7SUFBQyxDQUFDLENBQUMsa0JBQWtCLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQzFSLE9BQU8sR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDO0lBRTlCLGFBQWEsR0FBRyxDQUFDLFVBQVMsVUFBVTtRQUNsQyxNQUFNLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRWxDLGFBQWEsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLCtCQUErQixDQUFDO1FBRWxFLHVCQUF1QixjQUFjO1lBQ25DLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3ZDLENBQUM7UUFFRCxNQUFNLENBQUMsYUFBYSxDQUFDO0lBRXZCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRVYsTUFBTSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUM7QUFFakMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjExLjFcblxuLypcbiAgRXh0ZXJuYWxFZGl0b3JcbiAgS2V2aW4gR3JhdmllciA8a2V2aW5AbXJrbWcuY29tPlxuICBNSVRcbiAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBSZWFkRmlsZUVycm9yLFxuICAgIGV4dGVuZCA9IGZ1bmN0aW9uKGNoaWxkLCBwYXJlbnQpIHsgZm9yICh2YXIga2V5IGluIHBhcmVudCkgeyBpZiAoaGFzUHJvcC5jYWxsKHBhcmVudCwga2V5KSkgY2hpbGRba2V5XSA9IHBhcmVudFtrZXldOyB9IGZ1bmN0aW9uIGN0b3IoKSB7IHRoaXMuY29uc3RydWN0b3IgPSBjaGlsZDsgfSBjdG9yLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7IGNoaWxkLnByb3RvdHlwZSA9IG5ldyBjdG9yKCk7IGNoaWxkLl9fc3VwZXJfXyA9IHBhcmVudC5wcm90b3R5cGU7IHJldHVybiBjaGlsZDsgfSxcbiAgICBoYXNQcm9wID0ge30uaGFzT3duUHJvcGVydHk7XG5cbiAgUmVhZEZpbGVFcnJvciA9IChmdW5jdGlvbihzdXBlckNsYXNzKSB7XG4gICAgZXh0ZW5kKFJlYWRGaWxlRXJyb3IsIHN1cGVyQ2xhc3MpO1xuXG4gICAgUmVhZEZpbGVFcnJvci5wcm90b3R5cGUubWVzc2FnZSA9ICdGYWlsZWQgdG8gcmVhZCB0ZW1wb3JhcnkgZmlsZSc7XG5cbiAgICBmdW5jdGlvbiBSZWFkRmlsZUVycm9yKG9yaWdpbmFsX2Vycm9yKSB7XG4gICAgICB0aGlzLm9yaWdpbmFsX2Vycm9yID0gb3JpZ2luYWxfZXJyb3I7XG4gICAgfVxuXG4gICAgcmV0dXJuIFJlYWRGaWxlRXJyb3I7XG5cbiAgfSkoRXJyb3IpO1xuXG4gIG1vZHVsZS5leHBvcnRzID0gUmVhZEZpbGVFcnJvcjtcblxufSkuY2FsbCh0aGlzKTtcbiJdfQ==