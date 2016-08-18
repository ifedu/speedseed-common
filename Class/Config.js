const generators = require('yeoman-generator')

module.exports = class Config extends generators.Base {
    constructor(...args) {
        super(...args)
    }

    _create(fileTpl, fileDest) {
        try {
            this.fs.copyTpl(
                this.templatePath(fileTpl),
                this.destinationPath(fileDest),
                this.config.getAll()
            )

            if (fileTpl.indexOf('/**/*') > -1) {
                fileTpl = fileTpl.replace('/**/*', '/**/.*')

                this.fs.copyTpl(
                    this.templatePath(fileTpl),
                    this.destinationPath(fileDest),
                    this.config.getAll()
                )
            }
        } catch (e) {
            // console.log(e)
        }
    }

    _promptingOptions(tplOptions) {
        let prompting = []

        const setCompilerExt = () => {
            const ext = {
                babeljs: '.js',
                coffeescript: '.coffee',
                typescript: '.ts'
            }

            this.config.set('compilerExt', ext[this.config.get('compiler')])
        }

        const setOptionsTemplateToGenerator = (done) => {
            const props = this.config.getAll()

            for (let prop in props) {
                this.options.speedseed.config.set(prop, props[prop])
            }

            done()
        }

        const setTemplate = (choicesFramework) => {
            (choicesFramework.length > 1)
                ? prompting.push({
                    default: this.config.get('framework') || 0,
                    message: 'Library / Framework?',
                    name: 'framework',
                    type: 'list',

                    choices: choicesFramework
                })
                : this.config.set('framework', choicesFramework[0].value)
        }

        const setCompiler = (choicesCompiler) => {
            (choicesCompiler.length > 1)
                ? prompting.push({
                    default: this.config.get('compiler') || 0,
                    message: 'JavaScript Compiler?',
                    name: 'compiler',
                    type: 'list',

                    choices: choicesCompiler
                })
                : this.config.set('compiler', choicesCompiler[0].value)
        }

        const setCss = (choicesCss) => {
            (choicesCss.length > 1)
                ? prompting.push({
                    default: this.config.get('css') || 0,
                    message: 'CSS?',
                    name: 'css',
                    type: 'list',

                    choices: choicesCss
                })
                : this.config.set('css', choicesCss[0].value)
        }

        const setHtml = (choicesHtml) => {
            (choicesHtml.length > 1)
                ? prompting.push({
                    default: this.config.get('html') || 0,
                    message: 'HTML?',
                    name: 'html',
                    type: 'list',

                    choices: choicesHtml
                })
                : this.config.set('html', choicesHtml[0].value)
        }

        const setTest = (choicesTest) => {
            choicesTest.push({ name: 'No', value: 'no' });

            (choicesTest.length > 1)
                ? prompting.push({
                    default: this.config.get('test') || 0,
                    message: 'Test?',
                    name: 'test',
                    type: 'list',

                    choices: choicesTest
                })
                : this.config.set('test', 'no')
        }

        setTemplate(tplOptions.framework)
        setTest(tplOptions.test || [])

        const done = this.async()

        this._setPrompting(prompting, () => {
            prompting = []

            const framework = this.config.get('framework')

            setCompiler(tplOptions[framework].compiler)
            setCss(tplOptions[framework].css)
            setHtml(tplOptions[framework].html)

            this._setPrompting(prompting, () => {
                setCompilerExt()

                setOptionsTemplateToGenerator(done)
            })
        })
    }

    _setConfig(options) {
        const coreVersion = this.config.get('coreVersion') || options.coreVersion
        const project = this.config.get('project') || options.project
        const template = this.config.get('template') || options.template

        this.config.set('component', '')
        this.config.set('coreVersion', coreVersion)
        this.config.set('project', project)
        this.config.set('template', template)
    }

    _setPrompting(prompts, fn) {
        this
        .prompt(prompts)
        .then((answers) => {
            for (let answer in answers) {
                this.config.set(answer, answers[answer])
            }

            fn()
        })
    }

    _writeAllFiles($) {
        const checkExistFile = (file) => {
            try {
                require(file)($)
            } catch (e) {}
        }

        const updateRootModifiedByUser = (route) => {
            checkExistFile(`../../../${route}/root-modified-by-user/babelrc.js`)
            checkExistFile(`../../../${route}/root-modified-by-user/bower.js`)
            checkExistFile(`../../../${route}/root-modified-by-user/bowerrc.js`)
            checkExistFile(`../../../${route}/root-modified-by-user/core-config.js`)
            checkExistFile(`../../../${route}/root-modified-by-user/eslintrc.js`)
            checkExistFile(`../../../${route}/root-modified-by-user/package.js`)
        }

        const createRoot = (route) => {
            this._create(`${route}/root/editorconfig`, './.editorconfig')
            this._create(`${route}/root/gitignore`, './.gitignore')
            this._create(`${route}/root/gulpfile.js`, './gulpfile.js')
        }

        const createApp = (route) => {
            this._create(`${route}/app/IMPORTANT.txt`, './app/IMPORTANT.txt')
            this._create(`${route}/app/**/*.${$.html}`, './app')
            this._create(`${route}/app/**/*.jsx`, './app')
            this._create(`${route}/app/**/*${$.compilerExt}`, './app')
            this._create(`${route}/app/**/*.${$.css}`, './app')
        }

        const createServer = (route) => {
            this._create(`${route}/server/**/*.${$.css}`, './server')
        }

        const createTest = (route) => {
            this._create(`${route}/test/${$.test}/app/**/*`, './app')
            this._create(`${route}/test/${$.test}/karma.conf.js`, './.core/karma.conf.js')
        }

        const createTypeScript = (route) => {
            this._create(`${route}/tsconfig.json`, './tsconfig.json')
            this._create(`${route}/typings.json`, './typings.json')
            this._create(`${route}/typings/**/*`, './typings')
        }

        const speedseed = require('speedseed')

        const files = new speedseed.Files()

        files.del('.core', () => {
            const routeAll = 'seed/template/all'
            const routeFramework = `seed/template/${$.framework}`

            updateRootModifiedByUser(routeAll)
            updateRootModifiedByUser(routeFramework)

            createRoot(routeAll)
            createRoot(routeFramework)

            createApp(routeAll)
            createApp(routeFramework)

            createServer(routeAll)
            createServer(routeFramework)

            if ($.test !== 'no') {
                createTest(routeAll)
                createTest(routeFramework)
            }

            if ($.compiler === 'typescript') {
                createTypeScript(routeAll)
                createTypeScript(routeFramework)
            }

            this.composeWith('speedseed:postinstall', { $ })
        })
    }
}