const Config = require('./Config.js')

module.exports = (tplOptions) =>
    class Yo extends Config {
        constructor(...args) {
            super(...args)

            this._setConfig(this.options)
        }

        paths() {
            const path = require('path')

            this.sourceRoot(path.resolve(__dirname, '../../../'))
        }

        prompting() {
            this._promptingOptions(tplOptions)
        }

        write() {
            this._writeAllFiles(this.config.getAll())
        }
    }