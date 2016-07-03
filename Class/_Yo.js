const generators = require('yeoman-generator')

const methods = require('./_Yo/index.js')

module.exports = class Yo extends generators.Base {
    constructor(...args) {
        super(...args)
    }

    configGet() {
        return methods.configGet.call(this)
    }

    configSet() {
        methods.configSet.call(this)
    }

    create(...args) {
        methods.create.call(this, ...args)
    }

    pathsSet() {
        const path = require('path')

        this.sourceRoot(path.resolve(__dirname, '../../../'))
    }

    promptingOptions(...args) {
        methods.promptingOptions.call(this, ...args)
    }

    promptingYo(prompts, fn) {
        this
        .prompt(prompts)
        .then((answers) => {
            for (let answer in answers) {
                this.config.set(answer, answers[answer])
            }

            fn()
        })
    }

    writeAll(...args) {
        methods.write.call(this, ...args)
    }
}