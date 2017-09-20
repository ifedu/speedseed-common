var Stream = require('stream');
if (process.env.READABLE_STREAM === 'disable' && Stream) {
    module.exports = Stream;
    exports = module.exports = Stream.Readable;
    exports.Readable = Stream.Readable;
    exports.Writable = Stream.Writable;
    exports.Duplex = Stream.Duplex;
    exports.Transform = Stream.Transform;
    exports.PassThrough = Stream.PassThrough;
    exports.Stream = Stream;
}
else {
    exports = module.exports = require('./lib/_stream_readable.js');
    exports.Stream = Stream || exports;
    exports.Readable = exports;
    exports.Writable = require('./lib/_stream_writable.js');
    exports.Duplex = require('./lib/_stream_duplex.js');
    exports.Transform = require('./lib/_stream_transform.js');
    exports.PassThrough = require('./lib/_stream_passthrough.js');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxyZWFkYWJsZS1zdHJlYW1cXHJlYWRhYmxlLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXHJlYWRhYmxlLXN0cmVhbVxccmVhZGFibGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9CLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxLQUFLLFNBQVMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3hELE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBQ3hCLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7SUFDM0MsT0FBTyxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDO0lBQ25DLE9BQU8sQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQztJQUNuQyxPQUFPLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDL0IsT0FBTyxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDO0lBQ3JDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQztJQUN6QyxPQUFPLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUMxQixDQUFDO0FBQUMsSUFBSSxDQUFDLENBQUM7SUFDTixPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUNoRSxPQUFPLENBQUMsTUFBTSxHQUFHLE1BQU0sSUFBSSxPQUFPLENBQUM7SUFDbkMsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7SUFDM0IsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUN4RCxPQUFPLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQ3BELE9BQU8sQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7SUFDMUQsT0FBTyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUNoRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsidmFyIFN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xuaWYgKHByb2Nlc3MuZW52LlJFQURBQkxFX1NUUkVBTSA9PT0gJ2Rpc2FibGUnICYmIFN0cmVhbSkge1xuICBtb2R1bGUuZXhwb3J0cyA9IFN0cmVhbTtcbiAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gU3RyZWFtLlJlYWRhYmxlO1xuICBleHBvcnRzLlJlYWRhYmxlID0gU3RyZWFtLlJlYWRhYmxlO1xuICBleHBvcnRzLldyaXRhYmxlID0gU3RyZWFtLldyaXRhYmxlO1xuICBleHBvcnRzLkR1cGxleCA9IFN0cmVhbS5EdXBsZXg7XG4gIGV4cG9ydHMuVHJhbnNmb3JtID0gU3RyZWFtLlRyYW5zZm9ybTtcbiAgZXhwb3J0cy5QYXNzVGhyb3VnaCA9IFN0cmVhbS5QYXNzVGhyb3VnaDtcbiAgZXhwb3J0cy5TdHJlYW0gPSBTdHJlYW07XG59IGVsc2Uge1xuICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9fc3RyZWFtX3JlYWRhYmxlLmpzJyk7XG4gIGV4cG9ydHMuU3RyZWFtID0gU3RyZWFtIHx8IGV4cG9ydHM7XG4gIGV4cG9ydHMuUmVhZGFibGUgPSBleHBvcnRzO1xuICBleHBvcnRzLldyaXRhYmxlID0gcmVxdWlyZSgnLi9saWIvX3N0cmVhbV93cml0YWJsZS5qcycpO1xuICBleHBvcnRzLkR1cGxleCA9IHJlcXVpcmUoJy4vbGliL19zdHJlYW1fZHVwbGV4LmpzJyk7XG4gIGV4cG9ydHMuVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9saWIvX3N0cmVhbV90cmFuc2Zvcm0uanMnKTtcbiAgZXhwb3J0cy5QYXNzVGhyb3VnaCA9IHJlcXVpcmUoJy4vbGliL19zdHJlYW1fcGFzc3Rocm91Z2guanMnKTtcbn1cbiJdfQ==