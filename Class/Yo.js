const Config = require('./Config.js')

module.exports = (configTpl) =>
    class Yo extends Config {
        constructor(...args) {
            super(...args)

            this._setConfig(this.options)
        }

        paths() {
            this.sourceRoot(process.cwd())
        }

        prompting() {
            this._promptingOptions(configTpl)
        }

        write() {
            this._writeAllFiles(this.config.getAll(), configTpl)
        }
    }