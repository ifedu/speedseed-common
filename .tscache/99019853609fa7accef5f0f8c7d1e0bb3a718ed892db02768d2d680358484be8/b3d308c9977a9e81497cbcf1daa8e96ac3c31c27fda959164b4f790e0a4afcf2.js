if (process.env.npm_package_name === 'pseudomap' &&
    process.env.npm_lifecycle_script === 'test')
    process.env.TEST_PSEUDOMAP = 'true';
if (typeof Map === 'function' && !process.env.TEST_PSEUDOMAP) {
    module.exports = Map;
}
else {
    module.exports = require('./pseudomap');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxwc2V1ZG9tYXBcXG1hcC5qcyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpZmVkdVxcQXBwRGF0YVxcUm9hbWluZ1xcbnZtXFx2OC40LjBcXG5vZGVfbW9kdWxlc1xcZ2VuZXJhdG9yLXNwZWVkc2VlZFxcbm9kZV9tb2R1bGVzXFxwc2V1ZG9tYXBcXG1hcC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixLQUFLLFdBQVc7SUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsS0FBSyxNQUFNLENBQUM7SUFDOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFBO0FBRXJDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sR0FBRyxLQUFLLFVBQVUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUM3RCxNQUFNLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQTtBQUN0QixDQUFDO0FBQUMsSUFBSSxDQUFDLENBQUM7SUFDTixNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUN6QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaWYgKHByb2Nlc3MuZW52Lm5wbV9wYWNrYWdlX25hbWUgPT09ICdwc2V1ZG9tYXAnICYmXG4gICAgcHJvY2Vzcy5lbnYubnBtX2xpZmVjeWNsZV9zY3JpcHQgPT09ICd0ZXN0JylcbiAgcHJvY2Vzcy5lbnYuVEVTVF9QU0VVRE9NQVAgPSAndHJ1ZSdcblxuaWYgKHR5cGVvZiBNYXAgPT09ICdmdW5jdGlvbicgJiYgIXByb2Nlc3MuZW52LlRFU1RfUFNFVURPTUFQKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gTWFwXG59IGVsc2Uge1xuICBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vcHNldWRvbWFwJylcbn1cbiJdfQ==