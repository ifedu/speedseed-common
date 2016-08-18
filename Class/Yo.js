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
            // this.sourceRoot(path.resolve(process.cwd(), '../../../generator-speedseed-multi-tic-tac-toe'))
            // this.sourceRoot(path.resolve(process.cwd(), '../generator-speedseed-cleanly-angular2-tour-of-heroes'))
        }

        prompting() {
            this._promptingOptions(tplOptions)
        }

        write() {
            this._writeAllFiles(this.config.getAll())
        }
    }