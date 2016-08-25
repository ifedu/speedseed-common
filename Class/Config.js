const generators = require('yeoman-generator')

module.exports = class Config extends generators.Base {
    constructor(...args) {
        super(...args)
    }

    _create(fileTpl, fileDest, isTpl) {
        try {
            const copyTpl = (isTpl === false) ? 'copy' : 'copyTpl'

            this.fs[copyTpl](
                this.templatePath(fileTpl),
                this.destinationPath(fileDest),
                this.config.getAll()
            )

            // if (fileTpl.indexOf('/**/*') > -1) {
            //     fileTpl = fileTpl.replace('/**/*', '/**/.*')
            //
            //     this.fs[copyTpl](
            //         this.templatePath(fileTpl),
            //         this.destinationPath(fileDest),
            //         this.config.getAll()
            //     )
            // }
        } catch (e) {
            console.log(e)
        }
    }

    _promptingOptions(configTpl) {
        const tpl = this.config.get('tpl')

        configTpl.options.forEach((option) => {
            option.default = tpl[option.name] || 0
            option.option = { tpl }
            option.type = 'list'
        })

        configTpl.routeTpl = `${configTpl.routeTpl}/seed/template`

        this._setPromptings(configTpl, this.async())
    }

    _setConfig(options) {
        const core = this.config.get('core') || options.core
        const general = this.config.get('general') || options.general
        const tpl = this.config.get('tpl') || {}
        const user = this.config.get('user') || {}

        this.config.set('core', core)
        this.config.set('general', general)
        this.config.set('tpl', tpl)
        this.config.set('user', user)
    }

    _setPromptings(configTpl, cb) {
        const checkExtra = (choices, value) => {
            let choiceExtra

            choices.forEach((choice) => {
                if (choice.route) {
                    console.log(configTpl.routeTpl)
                }

                if (choice.value === value && choice.extra) {
                    choiceExtra = choice.extra

                    return
                }
            })

            return choiceExtra
        }

        const hasRoute = (prompt, value) => {
            if (prompt.route) {
                configTpl.routeTpl = `${configTpl.routeTpl}/${prompt.name}/${value}`
            }
        }

        const setPrompting = (prompt, configTpl, cb) => {
            this
            .prompt(prompt)
            .then((answer) => {
                const extend = require('extend')

                const keyOption = Object.keys(prompt.option)[0]
                const keyAnswer = Object.keys(answer)[0]

                const option = this.config.get(keyOption) || {}
                const value = answer[keyAnswer]

                extend(option, { [keyAnswer]: value }, true)

                const extra = (prompt.choices) ? checkExtra(prompt.choices, value) : undefined

                if (prompt.choices && extra) {
                    extend(option, {
                        [`${keyAnswer}-extra`]: extra
                    }, true)
                }

                this.config.set(keyOption, option)

                hasRoute(prompt, value)

                cb()
            })
        }

        let i = 0
        let len = configTpl.options.length

        const prompting = () => {
            if (!configTpl.options[i]) return cb()

            setPrompting(configTpl.options[i], configTpl, prompting)

            i++
        }

        prompting()
    }
    //
    // _setPromptingObject(prompts, done) {
    //     this
    //     .prompt(prompts)
    //     .then((answers) => {
    //         for (let answer in answers) {
    //             this.config.set(answer, answers[answer])
    //         }
    //
    //         done()
    //     })
    // }
    //
    _writeAllFiles($, configTpl) {
    //     const checkExistFile = (file) => {
    //         try {
    //             require(file)($)
    //         } catch (e) {}
    //     }
    //
    //     const updateRootModifiedByUser = (route) => {
    //         checkExistFile(`${route}/root-modified-by-user/babelrc.js`)
    //         checkExistFile(`${route}/root-modified-by-user/bower.js`)
    //         checkExistFile(`${route}/root-modified-by-user/bowerrc.js`)
    //         checkExistFile(`${route}/root-modified-by-user/core-config.js`)
    //         checkExistFile(`${route}/root-modified-by-user/eslintrc.js`)
    //         checkExistFile(`${route}/root-modified-by-user/package.js`)
    //     }
    //     //
    //     // const createRoot = (route) => {
    //     //     this._create(`${route}/root/editorconfig`, './.editorconfig')
    //     //     this._create(`${route}/root/gitignore`, './.gitignore')
    //     //     this._create(`${route}/root/gulpfile.js`, './gulpfile.js')
    //     // }
    //     //
    //     // const createApp = (route) => {
    //     //     this._create(`${route}/app/IMPORTANT.txt`, './app/IMPORTANT.txt')
    //     //     this._create(`${route}/app/assets/**/*`, './app/assets', false)
    //     //     this._create(`${route}/app/**/*.${$.html}`, './app')
    //     //     this._create(`${route}/app/**/*.jsx`, './app')
    //     //     this._create(`${route}/app/**/*${$.compilerExt}`, './app')
    //     //     this._create(`${route}/app/**/*.${$.css}`, './app')
    //     // }
    //     //
    //     // const createServer = (route) => {
    //     //     this._create(`${route}/server/**/*.${$.css}`, './server')
    //     // }
    //     //
    //     // const createTest = (route) => {
    //     //     this._create(`${route}/test/${$.test}/app/**/*`, './app')
    //     //     this._create(`${route}/test/${$.test}/karma.conf.js`, './.core/karma.conf.js')
    //     // }
    //     //
    //     // const createTypeScript = (route) => {
    //     //     this._create(`${route}/tsconfig.json`, './tsconfig.json')
    //     //     this._create(`${route}/typings.json`, './typings.json')
    //     //     this._create(`${route}/typings/**/*`, './typings')
    //     // }
    //
    //     const createFiles = (route) => {
    //         this._create(`${route}/tsconfig.json`, './tsconfig.json')
    //     }
    //
        const speedseed = require('speedseed')
        const files = new speedseed.Files()

        files.del('.core', () => {
            const tpl = this.config.get('tpl')
            const routeTpl = `${configTpl.routeTpl}`

            this._create(`${routeTpl}/${tpl.compiler}/app/**/*`, './app')
            this._create(`${routeTpl}/${tpl.html}/app/**/*`, './app')
    //
    //         // updateRootModifiedByUser(routeAll)
    //         // updateRootModifiedByUser(routeFramework)
    //         //
    //         // createRoot(routeAll)
    //         // createRoot(routeFramework)
    //         //
    //         // createApp(routeAll)
    //         // createApp(routeFramework)
    //         //
    //         // createServer(routeAll)
    //         // createServer(routeFramework)
    //         //
    //         // if ($.test !== 'no') {
    //         //     createTest(routeAll)
    //         //     createTest(routeFramework)
    //         // }
    //         //
    //         // if ($.compiler === 'typescript') {
    //         //     createTypeScript(routeAll)
    //         //     createTypeScript(routeFramework)
    //         // }
    //         //
    //         // this.composeWith('speedseed:postinstall', { $ })
        })
    }
}