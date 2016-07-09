module.exports = function (configTemplate) {
    const configTemplatesValues = require('../_config-values.js')

    const checkConfig = (conf) => {
        const choice = []

        for (let prop in conf) {
            if (conf[prop]) {
                choice.push({ name: prop, value: configTemplatesValues[prop] })
            }
        }

        return choice
    }

    const choicesFramework = checkConfig(configTemplate.framework)
    const choicesTest = checkConfig(configTemplate.test)

    choicesTest.push({ name: 'No', value: 'no' })

    let prompting = []

    if (choicesFramework.length > 1) {
        prompting.push({
            default: this.config.get('framework') || 0,
            message: 'Library / Framework?',
            name: 'framework',
            type: 'list',

            choices: choicesFramework
        })
    } else {
        this.config.set('framework', choicesFramework[0].value)
    }

    if (choicesTest.length > 1) {
        prompting.push({
            default: this.config.get('test') || 0,
            message: 'Test?',
            name: 'test',
            type: 'list',

            choices: choicesTest
        })
    } else {
        this.config.set('test', 'no')
    }

    const done = this.async()

    this.promptingYo(prompting, () => {
        const frameworks = {
            angularjs: 'AngularJS',
            angular2: 'Angular2',
            jquery: 'jQuery',
            polymer: 'Polymer',
            react: 'React',
            vanillajs: 'VanillaJS'
        }

        const framework = frameworks[this.config.get('framework')]

        const choicesCompiler = checkConfig(configTemplate.framework[framework].compiler)
        const choicesCss = checkConfig(configTemplate.framework[framework].css)

        prompting = []

        if (choicesCompiler.length > 1) {
            prompting.push({
                default: this.config.get('compiler') || 0,
                message: 'JavaScript Compiler?',
                name: 'compiler',
                type: 'list',

                choices: choicesCompiler
            })
        } else {
            this.config.set('compiler', choicesCompiler[0].value)
        }

        if (choicesCss.length > 1) {
            prompting.push({
                default: this.config.get('css') || 0,
                message: 'CSS?',
                name: 'css',
                type: 'list',

                choices: choicesCss
            })
        } else {
            this.config.set('css', choicesCss[0].value)
        }

        this.promptingYo(prompting, () => {
            const ext = {
                babeljs: '.js',
                coffeescript: '.coffee',
                typescript: '.ts'
            }

            const compiler = this.config.get('compiler')
            this.config.set('compilerExt', ext[compiler])

            const props = this.config.getAll()

            for (let prop in props) {
                this.options.speedseed.config.set(prop, props[prop])
            }

            done()
        })
    })
}