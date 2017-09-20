'use strict';
var util = require('util');
var Duplex = require('readable-stream').Duplex;
function FirstChunkStream(options, cb) {
    var _this = this;
    var _state = {
        sent: false,
        chunks: [],
        size: 0
    };
    if (!(this instanceof FirstChunkStream)) {
        return new FirstChunkStream(options, cb);
    }
    options = options || {};
    if (!(cb instanceof Function)) {
        throw new Error('FirstChunkStream constructor requires a callback as its second argument.');
    }
    if (typeof options.chunkLength !== 'number') {
        throw new Error('FirstChunkStream constructor requires `options.chunkLength` to be a number.');
    }
    if (options.objectMode) {
        throw new Error('FirstChunkStream doesn\'t support `objectMode` yet.');
    }
    Duplex.call(this, options);
    // Initialize the internal state
    _state.manager = createReadStreamBackpressureManager(this);
    // Errors management
    // We need to execute the callback or emit en error dependending on the fact
    // the firstChunk is sent or not
    _state.errorHandler = function firstChunkStreamErrorHandler(err) {
        processCallback(err, Buffer.concat(_state.chunks, _state.size), _state.encoding, function () { });
    };
    this.on('error', _state.errorHandler);
    // Callback management
    function processCallback(err, buf, encoding, done) {
        // When doing sync writes + emiting an errror it can happen that
        // Remove the error listener on the next tick if an error where fired
        // to avoid unwanted error throwing
        if (err) {
            setImmediate(function () {
                _this.removeListener('error', _state.errorHandler);
            });
        }
        else {
            _this.removeListener('error', _state.errorHandler);
        }
        _state.sent = true;
        cb(err, buf, encoding, function (err, buf, encoding) {
            if (err) {
                setImmediate(function () {
                    _this.emit('error', err);
                });
                return;
            }
            if (!buf) {
                done();
                return;
            }
            _state.manager.programPush(buf, encoding, done);
        });
    }
    // Writes management
    this._write = function firstChunkStreamWrite(chunk, encoding, done) {
        _state.encoding = encoding;
        if (_state.sent) {
            _state.manager.programPush(chunk, _state.encoding, done);
        }
        else if (chunk.length < options.chunkLength - _state.size) {
            _state.chunks.push(chunk);
            _state.size += chunk.length;
            done();
        }
        else {
            _state.chunks.push(chunk.slice(0, options.chunkLength - _state.size));
            chunk = chunk.slice(options.chunkLength - _state.size);
            _state.size += _state.chunks[_state.chunks.length - 1].length;
            processCallback(null, Buffer.concat(_state.chunks, _state.size), _state.encoding, function () {
                if (!chunk.length) {
                    done();
                    return;
                }
                _state.manager.programPush(chunk, _state.encoding, done);
            });
        }
    };
    this.on('finish', function firstChunkStreamFinish() {
        if (!_state.sent) {
            return processCallback(null, Buffer.concat(_state.chunks, _state.size), _state.encoding, function () {
                _state.manager.programPush(null, _state.encoding);
            });
        }
        _state.manager.programPush(null, _state.encoding);
    });
}
util.inherits(FirstChunkStream, Duplex);
// Utils to manage readable stream backpressure
function createReadStreamBackpressureManager(readableStream) {
    var manager = {
        waitPush: true,
        programmedPushs: [],
        programPush: function programPush(chunk, encoding, done) {
            done = done || function () { };
            // Store the current write
            manager.programmedPushs.push([chunk, encoding, done]);
            // Need to be async to avoid nested push attempts
            // Programm a push attempt
            setImmediate(manager.attemptPush);
            // Let's say we're ready for a read
            readableStream.emit('readable');
            readableStream.emit('drain');
        },
        attemptPush: function () {
            var nextPush;
            if (manager.waitPush) {
                if (manager.programmedPushs.length) {
                    nextPush = manager.programmedPushs.shift();
                    manager.waitPush = readableStream.push(nextPush[0], nextPush[1]);
                    (nextPush[2])();
                }
            }
            else {
                setImmediate(function () {
                    // Need to be async to avoid nested push attempts
                    readableStream.emit('readable');
                });
            }
        }
    };
    // Patch the readable stream to manage reads
    readableStream._read = function streamFilterRestoreRead() {
        manager.waitPush = true;
        // Need to be async to avoid nested push attempts
        setImmediate(manager.attemptPush);
    };
    return manager;
}
module.exports = FirstChunkStream;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxmaXJzdC1jaHVuay1zdHJlYW1cXGluZGV4LmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGlmZWR1XFxBcHBEYXRhXFxSb2FtaW5nXFxudm1cXHY4LjQuMFxcbm9kZV9tb2R1bGVzXFxnZW5lcmF0b3Itc3BlZWRzZWVkXFxub2RlX21vZHVsZXNcXGZpcnN0LWNodW5rLXN0cmVhbVxcaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDO0FBQ2IsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNCLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUUvQywwQkFBMEIsT0FBTyxFQUFFLEVBQUU7SUFDcEMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQ2pCLElBQUksTUFBTSxHQUFHO1FBQ1osSUFBSSxFQUFFLEtBQUs7UUFDWCxNQUFNLEVBQUUsRUFBRTtRQUNWLElBQUksRUFBRSxDQUFDO0tBQ1AsQ0FBQztJQUVGLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLFlBQVksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLElBQUksZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRCxPQUFPLEdBQUcsT0FBTyxJQUFJLEVBQUUsQ0FBQztJQUV4QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLDBFQUEwRSxDQUFDLENBQUM7SUFDN0YsQ0FBQztJQUVELEVBQUUsQ0FBQyxDQUFDLE9BQU8sT0FB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QyxRQUFRLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDM0MsT0FBTyxDQUFDLFFBQVEsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDakUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNqQixDQUFDO1lBQ0YsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNQLFlBQVksQ0FBQztvQkFDWixpREFBaUQ7b0JBQ2pELGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ2pDLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUM7S0FDRCxDQUFDO0lBRUYsNENBQTRDO0lBQzVDLGNBQWMsQ0FBQyxLQUFLLEdBQUc7UUFDdEIsT0FBTyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDeEIsaURBQWlEO1FBQ2pELFlBQVksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDbkMsQ0FBQyxDQUFDO0lBRUYsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUNoQixDQUFDO0FBRUQsTUFBTSxDQUFDLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xudmFyIER1cGxleCA9IHJlcXVpcmUoJ3JlYWRhYmxlLXN0cmVhbScpLkR1cGxleDtcblxuZnVuY3Rpb24gRmlyc3RDaHVua1N0cmVhbShvcHRpb25zLCBjYikge1xuXHR2YXIgX3RoaXMgPSB0aGlzO1xuXHR2YXIgX3N0YXRlID0ge1xuXHRcdHNlbnQ6IGZhbHNlLFxuXHRcdGNodW5rczogW10sXG5cdFx0c2l6ZTogMFxuXHR9O1xuXG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBGaXJzdENodW5rU3RyZWFtKSkge1xuXHRcdHJldHVybiBuZXcgRmlyc3RDaHVua1N0cmVhbShvcHRpb25zLCBjYik7XG5cdH1cblxuXHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRpZiAoIShjYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignRmlyc3RDaHVua1N0cmVhbSBjb25zdHJ1Y3RvciByZXF1aXJlcyBhIGNhbGxiYWNrIGFzIGl0cyBzZWNvbmQgYXJndW1lbnQuJyk7XG5cdH1cblxuXHRpZiAodHlwZW9mIG9wdGlvbnMuY2h1bmtMZW5ndGggIT09ICdudW1iZXInKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdGaXJzdENodW5rU3RyZWFtIGNvbnN0cnVjdG9yIHJlcXVpcmVzIGBvcHRpb25zLmNodW5rTGVuZ3RoYCB0byBiZSBhIG51bWJlci4nKTtcblx0fVxuXG5cdGlmIChvcHRpb25zLm9iamVjdE1vZGUpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ZpcnN0Q2h1bmtTdHJlYW0gZG9lc25cXCd0IHN1cHBvcnQgYG9iamVjdE1vZGVgIHlldC4nKTtcblx0fVxuXG5cdER1cGxleC5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG5cdC8vIEluaXRpYWxpemUgdGhlIGludGVybmFsIHN0YXRlXG5cdF9zdGF0ZS5tYW5hZ2VyID0gY3JlYXRlUmVhZFN0cmVhbUJhY2twcmVzc3VyZU1hbmFnZXIodGhpcyk7XG5cblx0Ly8gRXJyb3JzIG1hbmFnZW1lbnRcblx0Ly8gV2UgbmVlZCB0byBleGVjdXRlIHRoZSBjYWxsYmFjayBvciBlbWl0IGVuIGVycm9yIGRlcGVuZGVuZGluZyBvbiB0aGUgZmFjdFxuXHQvLyB0aGUgZmlyc3RDaHVuayBpcyBzZW50IG9yIG5vdFxuXHRfc3RhdGUuZXJyb3JIYW5kbGVyID0gZnVuY3Rpb24gZmlyc3RDaHVua1N0cmVhbUVycm9ySGFuZGxlcihlcnIpIHtcblx0XHRwcm9jZXNzQ2FsbGJhY2soZXJyLCBCdWZmZXIuY29uY2F0KF9zdGF0ZS5jaHVua3MsIF9zdGF0ZS5zaXplKSwgX3N0YXRlLmVuY29kaW5nLCBmdW5jdGlvbiAoKSB7fSk7XG5cdH07XG5cblx0dGhpcy5vbignZXJyb3InLCBfc3RhdGUuZXJyb3JIYW5kbGVyKTtcblxuXHQvLyBDYWxsYmFjayBtYW5hZ2VtZW50XG5cdGZ1bmN0aW9uIHByb2Nlc3NDYWxsYmFjayhlcnIsIGJ1ZiwgZW5jb2RpbmcsIGRvbmUpIHtcblx0XHQvLyBXaGVuIGRvaW5nIHN5bmMgd3JpdGVzICsgZW1pdGluZyBhbiBlcnJyb3IgaXQgY2FuIGhhcHBlbiB0aGF0XG5cdFx0Ly8gUmVtb3ZlIHRoZSBlcnJvciBsaXN0ZW5lciBvbiB0aGUgbmV4dCB0aWNrIGlmIGFuIGVycm9yIHdoZXJlIGZpcmVkXG5cdFx0Ly8gdG8gYXZvaWQgdW53YW50ZWQgZXJyb3IgdGhyb3dpbmdcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHRzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRfdGhpcy5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCBfc3RhdGUuZXJyb3JIYW5kbGVyKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRfdGhpcy5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCBfc3RhdGUuZXJyb3JIYW5kbGVyKTtcblx0XHR9XG5cblx0XHRfc3RhdGUuc2VudCA9IHRydWU7XG5cblx0XHRjYihlcnIsIGJ1ZiwgZW5jb2RpbmcsIGZ1bmN0aW9uIChlcnIsIGJ1ZiwgZW5jb2RpbmcpIHtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0c2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRfdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmICghYnVmKSB7XG5cdFx0XHRcdGRvbmUoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRfc3RhdGUubWFuYWdlci5wcm9ncmFtUHVzaChidWYsIGVuY29kaW5nLCBkb25lKTtcblx0XHR9KTtcblx0fVxuXG5cdC8vIFdyaXRlcyBtYW5hZ2VtZW50XG5cdHRoaXMuX3dyaXRlID0gZnVuY3Rpb24gZmlyc3RDaHVua1N0cmVhbVdyaXRlKGNodW5rLCBlbmNvZGluZywgZG9uZSkge1xuXHRcdF9zdGF0ZS5lbmNvZGluZyA9IGVuY29kaW5nO1xuXG5cdFx0aWYgKF9zdGF0ZS5zZW50KSB7XG5cdFx0XHRfc3RhdGUubWFuYWdlci5wcm9ncmFtUHVzaChjaHVuaywgX3N0YXRlLmVuY29kaW5nLCBkb25lKTtcblx0XHR9IGVsc2UgaWYgKGNodW5rLmxlbmd0aCA8IG9wdGlvbnMuY2h1bmtMZW5ndGggLSBfc3RhdGUuc2l6ZSkge1xuXHRcdFx0X3N0YXRlLmNodW5rcy5wdXNoKGNodW5rKTtcblx0XHRcdF9zdGF0ZS5zaXplICs9IGNodW5rLmxlbmd0aDtcblx0XHRcdGRvbmUoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0X3N0YXRlLmNodW5rcy5wdXNoKGNodW5rLnNsaWNlKDAsIG9wdGlvbnMuY2h1bmtMZW5ndGggLSBfc3RhdGUuc2l6ZSkpO1xuXHRcdFx0Y2h1bmsgPSBjaHVuay5zbGljZShvcHRpb25zLmNodW5rTGVuZ3RoIC0gX3N0YXRlLnNpemUpO1xuXHRcdFx0X3N0YXRlLnNpemUgKz0gX3N0YXRlLmNodW5rc1tfc3RhdGUuY2h1bmtzLmxlbmd0aCAtIDFdLmxlbmd0aDtcblxuXHRcdFx0cHJvY2Vzc0NhbGxiYWNrKG51bGwsIEJ1ZmZlci5jb25jYXQoX3N0YXRlLmNodW5rcywgX3N0YXRlLnNpemUpLCBfc3RhdGUuZW5jb2RpbmcsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKCFjaHVuay5sZW5ndGgpIHtcblx0XHRcdFx0XHRkb25lKCk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0X3N0YXRlLm1hbmFnZXIucHJvZ3JhbVB1c2goY2h1bmssIF9zdGF0ZS5lbmNvZGluZywgZG9uZSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH07XG5cblx0dGhpcy5vbignZmluaXNoJywgZnVuY3Rpb24gZmlyc3RDaHVua1N0cmVhbUZpbmlzaCgpIHtcblx0XHRpZiAoIV9zdGF0ZS5zZW50KSB7XG5cdFx0XHRyZXR1cm4gcHJvY2Vzc0NhbGxiYWNrKG51bGwsIEJ1ZmZlci5jb25jYXQoX3N0YXRlLmNodW5rcywgX3N0YXRlLnNpemUpLCBfc3RhdGUuZW5jb2RpbmcsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0X3N0YXRlLm1hbmFnZXIucHJvZ3JhbVB1c2gobnVsbCwgX3N0YXRlLmVuY29kaW5nKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdF9zdGF0ZS5tYW5hZ2VyLnByb2dyYW1QdXNoKG51bGwsIF9zdGF0ZS5lbmNvZGluZyk7XG5cdH0pO1xufVxuXG51dGlsLmluaGVyaXRzKEZpcnN0Q2h1bmtTdHJlYW0sIER1cGxleCk7XG5cbi8vIFV0aWxzIHRvIG1hbmFnZSByZWFkYWJsZSBzdHJlYW0gYmFja3ByZXNzdXJlXG5mdW5jdGlvbiBjcmVhdGVSZWFkU3RyZWFtQmFja3ByZXNzdXJlTWFuYWdlcihyZWFkYWJsZVN0cmVhbSkge1xuXHR2YXIgbWFuYWdlciA9IHtcblx0XHR3YWl0UHVzaDogdHJ1ZSxcblx0XHRwcm9ncmFtbWVkUHVzaHM6IFtdLFxuXHRcdHByb2dyYW1QdXNoOiBmdW5jdGlvbiBwcm9ncmFtUHVzaChjaHVuaywgZW5jb2RpbmcsIGRvbmUpIHtcblx0XHRcdGRvbmUgPSBkb25lIHx8IGZ1bmN0aW9uICgpIHt9O1xuXHRcdFx0Ly8gU3RvcmUgdGhlIGN1cnJlbnQgd3JpdGVcblx0XHRcdG1hbmFnZXIucHJvZ3JhbW1lZFB1c2hzLnB1c2goW2NodW5rLCBlbmNvZGluZywgZG9uZV0pO1xuXHRcdFx0Ly8gTmVlZCB0byBiZSBhc3luYyB0byBhdm9pZCBuZXN0ZWQgcHVzaCBhdHRlbXB0c1xuXHRcdFx0Ly8gUHJvZ3JhbW0gYSBwdXNoIGF0dGVtcHRcblx0XHRcdHNldEltbWVkaWF0ZShtYW5hZ2VyLmF0dGVtcHRQdXNoKTtcblx0XHRcdC8vIExldCdzIHNheSB3ZSdyZSByZWFkeSBmb3IgYSByZWFkXG5cdFx0XHRyZWFkYWJsZVN0cmVhbS5lbWl0KCdyZWFkYWJsZScpO1xuXHRcdFx0cmVhZGFibGVTdHJlYW0uZW1pdCgnZHJhaW4nKTtcblx0XHR9LFxuXHRcdGF0dGVtcHRQdXNoOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgbmV4dFB1c2g7XG5cblx0XHRcdGlmIChtYW5hZ2VyLndhaXRQdXNoKSB7XG5cdFx0XHRcdGlmIChtYW5hZ2VyLnByb2dyYW1tZWRQdXNocy5sZW5ndGgpIHtcblx0XHRcdFx0XHRuZXh0UHVzaCA9IG1hbmFnZXIucHJvZ3JhbW1lZFB1c2hzLnNoaWZ0KCk7XG5cdFx0XHRcdFx0bWFuYWdlci53YWl0UHVzaCA9IHJlYWRhYmxlU3RyZWFtLnB1c2gobmV4dFB1c2hbMF0sIG5leHRQdXNoWzFdKTtcblx0XHRcdFx0XHQobmV4dFB1c2hbMl0pKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly8gTmVlZCB0byBiZSBhc3luYyB0byBhdm9pZCBuZXN0ZWQgcHVzaCBhdHRlbXB0c1xuXHRcdFx0XHRcdHJlYWRhYmxlU3RyZWFtLmVtaXQoJ3JlYWRhYmxlJyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvLyBQYXRjaCB0aGUgcmVhZGFibGUgc3RyZWFtIHRvIG1hbmFnZSByZWFkc1xuXHRyZWFkYWJsZVN0cmVhbS5fcmVhZCA9IGZ1bmN0aW9uIHN0cmVhbUZpbHRlclJlc3RvcmVSZWFkKCkge1xuXHRcdG1hbmFnZXIud2FpdFB1c2ggPSB0cnVlO1xuXHRcdC8vIE5lZWQgdG8gYmUgYXN5bmMgdG8gYXZvaWQgbmVzdGVkIHB1c2ggYXR0ZW1wdHNcblx0XHRzZXRJbW1lZGlhdGUobWFuYWdlci5hdHRlbXB0UHVzaCk7XG5cdH07XG5cblx0cmV0dXJuIG1hbmFnZXI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmlyc3RDaHVua1N0cmVhbTtcbiJdfQ==