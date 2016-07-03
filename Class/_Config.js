module.exports = (config) => {
    const Yo = require('./_Yo.js')

    return class Config extends Yo {
        constructor(...args) {
            super(...args)

            this.configSet()
        }

        paths() {
            this.pathsSet()
        }

        prompting() {
            this.promptingOptions(config)
        }

        write() {
            this.writeAll(this.config.getAll())
        }

        end() {
            this.composeWith('speedseed:update')
        }
    }
}