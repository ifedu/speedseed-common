module.exports = {
    getYo(options) {
        const Yo = require('./Class/Yo.js')(options)

        return Yo
    },

    Config: require('./Class/Config.js'),
    Files: require('./Class/Files.js')
}