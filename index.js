module.exports = {
    getYo(options) {
        const Yo = require('./Class/Yo.js')(options)

        return Yo
    },

    Files: require('./Class/Files.js')
}