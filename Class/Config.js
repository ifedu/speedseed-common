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
        const checkExtra = (choices, value) => {
            let choiceExtra

            choices.forEach((choice) => {
                if (choice.value === value && choice.extra) {
                    choiceExtra = choice.extra

                    return
                }
            })

            return choiceExtra
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

                // console.log(prompt.routeParent)
                const extra = (prompt.choices) ? checkExtra(prompt.choices, value) : undefined

                if (prompt.choices && extra) {
                    extend(option, {
                        [`${keyAnswer}-extra`]: extra
                    }, true)
                }

                this.config.set(keyOption, option)

                configTpl.routes = configTpl.routes || []
                const routeParent = configTpl.routes[prompt.routeParent] || keyAnswer
                configTpl.routes[keyAnswer] = `${routeParent}/${value}`

                cb()
            })
        }

        let i = 0

        const prompting = () => {
            if (!configTpl.options[i]) return cb()

            setPrompting(configTpl.options[i], configTpl, prompting)

            i++
        }

        prompting()
    }

    _writeAllFiles($, configTpl) {
        const createFiles = (route) => {
            updateRootModifiedByUser(`${route}all/root-modified-by-user`)
            this._create(`${route}/.core/**/*`, './.core')
            this._create(`${route}/root/**/*`, './')
            this._create(`${route}/app/**/*`, './app')
            this._create(`${route}/app/assets/**/*`, './app/assets', false)
        }

        const updateRootModifiedByUser = (route) => {
            const fs = require('fs')

            if (fs.existsSync(route))
                fs.readdirSync(route).forEach((file) => require(`${route}/${file}`)($))
        }

        const speedseed = require('speedseed')
        const files = new speedseed.Files()

        files.del('.core', () => {
            const path = require('path')
            const tpl = this.config.get('tpl')

            const routeTpl = `${configTpl.routeTpl}/seed/template/`

            for (let prop in configTpl.routes) {
                const route = configTpl.routes[prop]
                const alls = route.split('/')

                createFiles(`${routeTpl}${route}`)

                for (let i = 0, len = alls.length; i < len; i++) {
                    let routeAll = ''

                    alls.forEach((all, j) => {
                        routeAll += (i === j)
                            ? 'all/'
                            : `${all}/`
                    })

                    createFiles(`${routeTpl}${routeAll}`)
                    createFiles(`${routeTpl}${routeAll}all`)
                }
            }


            this.composeWith('speedseed:postinstall', { options: $ })
        })
    }
}