const generators = require('yeoman-generator')

module.exports = class Config extends generators.Base {
    constructor(...args) {
        super(...args)
    }

    _create(fileTpl, fileDest, isTpl) {
        try {
            const copyTpl = (isTpl === false) ? 'copy' : 'copyTpl'

            const copy = (fileTpl) => {
                this.fs[copyTpl](
                    this.templatePath(fileTpl),
                    this.destinationPath(fileDest),
                    this.config.getAll()
                )
            }

            const copyWithPoint = (fileTpl) => {
                if (fileTpl.indexOf('/**/*') > -1) {
                    fileTpl = fileTpl.replace('/**/*', '/**/.*')

                    copy(fileTpl)
                }
            }

            copy(fileTpl)
            copyWithPoint(fileTpl)
        } catch (e) {
            console.log(e)
        }
    }

    _promptingOptions(configTpl) {
        const tpl = this.config.get('tpl')

        const options = []

        const addOptions = (configTplOptions, routeParent) => {
            configTplOptions.forEach((option) => {
                option.default = tpl[option.name] || 0
                option.routeParent = routeParent
                option.option = { tpl }
                option.type = 'list'

                options.push(option)

                if (option.options) addOptions(option.options, option.name)
            })
        }

        addOptions(configTpl.options, '')

        configTpl.oldOptions = configTpl.options
        configTpl.options = options

        this._setPromptings(configTpl, this.async())
    }

    _setConfig(options) {
        const setProp = (prop) => options[prop] || this.config.get(prop) || {}

        this.config.set('core', setProp('core'))
        this.config.set('general', setProp('general'))
        this.config.set('tpl', setProp('tpl'))
        this.config.set('user', setProp('user'))
    }

    _setPromptings(configTpl, cb) {
        const getChoiceSelected = (choices, value) => {
            let choiceSelected = {}

            choices.forEach((choice) => {
                if (choice.value === value) return choiceSelected = choice
            })

            return choiceSelected
        }

        const hasExclude = (choice) => false

        const setRouteKey = (key, val) => {
            configTpl.routes = configTpl.routes || {}
            configTpl.routes[key] = val
        }

        const setPrompting = (prompt, configTpl, cb) => {
            this
            .prompt(prompt)
            .then((answer) => {
                const extend = require('extend')

                const objectYo = Object.keys(prompt.option)[0]
                const typePromptKey = Object.keys(answer)[0]

                const typePromptOption = this.config.get(objectYo) || {}
                const typePromptVal = answer[typePromptKey]

                extend(typePromptOption, { [typePromptKey]: typePromptVal }, true)

                const choice = getChoiceSelected(prompt.choices, typePromptVal)

                if (prompt.choices && choice.extra) {
                    extend(typePromptOption, {
                        [`${typePromptKey}-extra`]: choice.extra
                    }, true)
                }

                this.config.set(objectYo, typePromptOption)

                setRouteKey(typePromptKey, typePromptVal)

                cb()
            })
        }

        const checkExclude = (option) => {
            const excludeOption = (choices, i) => {
                const choice = choices[i]

                const all = this.config.getAll()

                for (let prop in all.tpl) {
                    if (choice.exclude
                    && choice.exclude[prop]
                    && choice.exclude[prop].indexOf(all.tpl[prop]) !== -1) {
                        const position = choices.indexOf(choice)

                        choices.splice(position, 1)
                    }
                }
            }

            for (let i = option.choices.length - 1; i >= 0; i--) {
                excludeOption(option.choices, i)
            }

            return option
        }

        (() => {
            let i = 0

            const prompting = () => {
                let option = configTpl.options[i]

                if (!option) return cb()

                option = checkExclude(option)

                setPrompting(option, configTpl, prompting)

                i++
            }

            prompting()
        })()
    }

    _writeAllFiles($, configTpl) {
        const tplRoute = `${configTpl.routeTpl}/seed/template`

        const updateRootModifiedByUser = (route) => {
            const { existsSync, readdirSync } = require('fs')

            if (existsSync(route)) {
                readdirSync(route).forEach((file) => {
                    require(`${route}/${file}`)($)
                })
            }
        }

        const createFiles = (route) => {
            updateRootModifiedByUser(`${route}/root-modified-by-user`)

            this._create(`${route}/.core/**/*`, './.core')
            this._create(`${route}/root/**/*`, './')
            this._create(`${route}/app/**/*`, './app')
            this._create(`${route}/app/assets/**/*`, './app/assets', false)
        }

        const createFilesOfRoute = (route, opts) => {
            opts && opts.forEach((obj, i) => {
                const { name, options } = obj
                const val = configTpl.routes[name]

                createFiles(`${tplRoute}/all/${name}/${val}`)
                createFiles(`${route}/${name}/all`)
                createFiles(`${route}/${name}/${val}`)

                createFilesOfRoute(`${route}/${name}/${val}`, options)
            })
        }

        const createCore = () => {
            createFiles(`${tplRoute}/all`)
            createFilesOfRoute(tplRoute, configTpl.oldOptions)

            this.composeWith('speedseed:postinstall', { options: $ })
        }

        const Files = require('./Files')

        const files = new Files()

        files.del('.core', createCore)
    }
}