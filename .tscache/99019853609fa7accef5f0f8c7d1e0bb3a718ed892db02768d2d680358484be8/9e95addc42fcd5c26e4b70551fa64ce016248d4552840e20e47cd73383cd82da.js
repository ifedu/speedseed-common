var Stream = require('stream').Stream;
module.exports = legacy;
function legacy(fs) {
    return {
        ReadStream: ReadStream,
        WriteStream: WriteStream
    };
    function ReadStream(path, options) {
        if (!(this instanceof ReadStream))
            return new ReadStream(path, options);
        Stream.call(this);
        var self = this;
        this.path = path;
        this.fd = null;
        this.readable = true;
        this.paused = false;
        this.flags = 'r';
        this.mode = 438; /*=0666*/
        this.bufferSize = 64 * 1024;
        options = options || {};
        // Mixin options into this
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
            var key = keys[index];
            this[key] = options[key];
        }
        if (this.encoding)
            this.setEncoding(this.encoding);
        if (this.start !== undefined) {
            if ('number' !== typeof this.start) {
                throw TypeError('start must be a Number');
            }
            if (this.end === undefined) {
                this.end = Infinity;
            }
            else if ('number' !== typeof this.end) {
                throw TypeError('end must be a Number');
            }
            if (this.start > this.end) {
                throw new Error('start must be <= end');
            }
            this.pos = this.start;
        }
        if (this.fd !== null) {
            process.nextTick(function () {
                self._read();
            });
            return;
        }
        fs.open(this.path, this.flags, this.mode, function (err, fd) {
            if (err) {
                self.emit('error', err);
                self.readable = false;
                return;
            }
            self.fd = fd;
            self.emit('open', fd);
            self._read();
        });
    }
    function WriteStream(path, options) {
        if (!(this instanceof WriteStream))
            return new WriteStream(path, options);
        Stream.call(this);
        this.path = path;
        this.fd = null;
        this.writable = true;
        this.flags = 'w';
        this.encoding = 'binary';
        this.mode = 438; /*=0666*/
        this.bytesWritten = 0;
        options = options || {};
        // Mixin options into this
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
            var key = keys[index];
            this[key] = options[key];
        }
        if (this.start !== undefined) {
            if ('number' !== typeof this.start) {
                throw TypeError('start must be a Number');
            }
            if (this.start < 0) {
                throw new Error('start must be >= zero');
            }
            this.pos = this.start;
        }
        this.busy = false;
        this._queue = [];
        if (this.fd === null) {
            this._open = fs.open;
            this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
            this.flush();
        }
    }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxncmFjZWZ1bC1mc1xcbGVnYWN5LXN0cmVhbXMuanMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaWZlZHVcXEFwcERhdGFcXFJvYW1pbmdcXG52bVxcdjguNC4wXFxub2RlX21vZHVsZXNcXGdlbmVyYXRvci1zcGVlZHNlZWRcXG5vZGVfbW9kdWxlc1xcZ3JhY2VmdWwtZnNcXGxlZ2FjeS1zdHJlYW1zLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUE7QUFFckMsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7QUFFdkIsZ0JBQWlCLEVBQUU7SUFDakIsTUFBTSxDQUFDO1FBQ0wsVUFBVSxFQUFFLFVBQVU7UUFDdEIsV0FBVyxFQUFFLFdBQVc7S0FDekIsQ0FBQTtJQUVELG9CQUFxQixJQUFJLEVBQUUsT0FBTztRQUNoQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxZQUFZLFVBQVUsQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUV4RSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztRQUVoQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUNmLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBRXBCLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDO1FBQ2pCLElBQUksQ0FBQyxJ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dUIsQ0FBQyxDQUFDO1lBQzNDLENBQUM7WUFFRCxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDeEIsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO1FBQ2xCLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBRWpCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNyQixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUM7WUFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDNUUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2YsQ0FBQztJQUNILENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsidmFyIFN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpLlN0cmVhbVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxlZ2FjeVxuXG5mdW5jdGlvbiBsZWdhY3kgKGZzKSB7XG4gIHJldHVybiB7XG4gICAgUmVhZFN0cmVhbTogUmVhZFN0cmVhbSxcbiAgICBXcml0ZVN0cmVhbTogV3JpdGVTdHJlYW1cbiAgfVxuXG4gIGZ1bmN0aW9uIFJlYWRTdHJlYW0gKHBhdGgsIG9wdGlvbnMpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmVhZFN0cmVhbSkpIHJldHVybiBuZXcgUmVhZFN0cmVhbShwYXRoLCBvcHRpb25zKTtcblxuICAgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICB0aGlzLmZkID0gbnVsbDtcbiAgICB0aGlzLnJlYWRhYmxlID0gdHJ1ZTtcbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xuXG4gICAgdGhpcy5mbGFncyA9ICdyJztcbiAgICB0aGlzLm1vZGUgPSA0Mzg7IC8qPTA2NjYqL1xuICAgIHRoaXMuYnVmZmVyU2l6ZSA9IDY0ICogMTAyNDtcblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgLy8gTWl4aW4gb3B0aW9ucyBpbnRvIHRoaXNcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9wdGlvbnMpO1xuICAgIGZvciAodmFyIGluZGV4ID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpbmRleF07XG4gICAgICB0aGlzW2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZW5jb2RpbmcpIHRoaXMuc2V0RW5jb2RpbmcodGhpcy5lbmNvZGluZyk7XG5cbiAgICBpZiAodGhpcy5zdGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoJ251bWJlcicgIT09IHR5cGVvZiB0aGlzLnN0YXJ0KSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignc3RhcnQgbXVzdCBiZSBhIE51bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuZW5kID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5lbmQgPSBJbmZpbml0eTtcbiAgICAgIH0gZWxzZSBpZiAoJ251bWJlcicgIT09IHR5cGVvZiB0aGlzLmVuZCkge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ2VuZCBtdXN0IGJlIGEgTnVtYmVyJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnN0YXJ0ID4gdGhpcy5lbmQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzdGFydCBtdXN0IGJlIDw9IGVuZCcpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnBvcyA9IHRoaXMuc3RhcnQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZmQgIT09IG51bGwpIHtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYuX3JlYWQoKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZzLm9wZW4odGhpcy5wYXRoLCB0aGlzLmZsYWdzLCB0aGlzLm1vZGUsIGZ1bmN0aW9uIChlcnIsIGZkKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgICBzZWxmLnJlYWRhYmxlID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgc2VsZi5mZCA9IGZkO1xuICAgICAgc2VsZi5lbWl0KCdvcGVuJywgZmQpO1xuICAgICAgc2VsZi5fcmVhZCgpO1xuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiBXcml0ZVN0cmVhbSAocGF0aCwgb3B0aW9ucykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXcml0ZVN0cmVhbSkpIHJldHVybiBuZXcgV3JpdGVTdHJlYW0ocGF0aCwgb3B0aW9ucyk7XG5cbiAgICBTdHJlYW0uY2FsbCh0aGlzKTtcblxuICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgdGhpcy5mZCA9IG51bGw7XG4gICAgdGhpcy53cml0YWJsZSA9IHRydWU7XG5cbiAgICB0aGlzLmZsYWdzID0gJ3cnO1xuICAgIHRoaXMuZW5jb2RpbmcgPSAnYmluYXJ5JztcbiAgICB0aGlzLm1vZGUgPSA0Mzg7IC8qPTA2NjYqL1xuICAgIHRoaXMuYnl0ZXNXcml0dGVuID0gMDtcblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgLy8gTWl4aW4gb3B0aW9ucyBpbnRvIHRoaXNcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9wdGlvbnMpO1xuICAgIGZvciAodmFyIGluZGV4ID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpbmRleF07XG4gICAgICB0aGlzW2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3RhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKCdudW1iZXInICE9PSB0eXBlb2YgdGhpcy5zdGFydCkge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ3N0YXJ0IG11c3QgYmUgYSBOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnN0YXJ0IDwgMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0YXJ0IG11c3QgYmUgPj0gemVybycpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnBvcyA9IHRoaXMuc3RhcnQ7XG4gICAgfVxuXG4gICAgdGhpcy5idXN5ID0gZmFsc2U7XG4gICAgdGhpcy5fcXVldWUgPSBbXTtcblxuICAgIGlmICh0aGlzLmZkID09PSBudWxsKSB7XG4gICAgICB0aGlzLl9vcGVuID0gZnMub3BlbjtcbiAgICAgIHRoaXMuX3F1ZXVlLnB1c2goW3RoaXMuX29wZW4sIHRoaXMucGF0aCwgdGhpcy5mbGFncywgdGhpcy5tb2RlLCB1bmRlZmluZWRdKTtcbiAgICAgIHRoaXMuZmx1c2goKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==