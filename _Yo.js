const generators = require('yeoman-generator')

module.exports = class Yo extends generators.Base {
    constructor(...args) {
        super(...args)
    }

    configGet() {
        const $ = {}

        for (let option in this.options) {
            $[option] = this.config.get(option)
        }

        return $
    }

    configSet() {
        for (let option in this.options) {
            if (
                option === 'env' ||
                option === 'resolved' ||
                option === 'argv' ||
                option === 'namespace' ||
                option === 'skip-cache' ||
                option === 'skip-install'
            ) continue

            this.config.set(option, this.options[option])
        }
    }

    create(fileTpl, fileDest, option) {
        const copy = (option === false) ? 'copy' : 'copyTpl'
        const options = (option === false) ? { globOptions: { dot: true } } : this.config.getAll()

        this.fs[copy](
            this.templatePath(fileTpl),
            this.destinationPath(fileDest),
            options
        )

        if (option === true) {
            this.fs[copy](
                this.templatePath(`${fileTpl}/**/.*`),
                this.destinationPath(fileDest),
                options
            )
        }
    }

    paths() {
        const path = require('path')

        this.sourceRoot(path.resolve(__dirname, '../../'))
    }

    prompting(done, prompts) {
        this.prompt(prompts, (answers) => {
            for (let answer in answers) {
                this.config.set(answer, answers[answer])
            }

            done()
        })
    }
}