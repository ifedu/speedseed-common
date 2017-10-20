import { relative, resolve } from 'path'

export default class Core {
    options: any
    root: any = process.cwd()
    setDestinationRoot: boolean = false
    speedseedgui: any
    update: boolean
    yo: any

    callTpl(options: any) {
        const tpl: string = `speedseed-${this.options['template']}`

        options.core = this
        options.speedseedgui = this.speedseedgui
        options.update = this.update

        this.yo.composeWith(tpl, options)
    }

    getPath(dirname: any, route: any) {
        return resolve(dirname, route)
    }

    setGui(speedseedgui: any) {
        if (!speedseedgui) return

        this.speedseedgui = (typeof speedseedgui === 'string')
            ? JSON.parse(speedseedgui)
            : speedseedgui

        this.root = this.speedseedgui.route

        if (!this.setDestinationRoot) {
            this.setDestinationRoot = true

            const routeDest: string = relative(process.cwd(), this.root)

            this.yo.destinationRoot(routeDest)
        }


        for (let prop in this.speedseedgui.options) {
            const val = this.speedseedgui.options[prop]

            this.yo.config.set(prop, val)
        }
    }

    setOptions() {
        this.options = this.yo.config.getAll()
    }

    setPath(dirname: any, root: any) {
        const routeTpl: string = resolve(dirname, root)

        this.yo.sourceRoot(routeTpl)
    }

    setProject() {
        let project = this.yo.config.get('project')

        project = project.toLowerCase().replace(/[-_ ]/g, '')

        this.yo.config.set('project', project)
    }

    setUpdate(update: boolean) {
        this.update = update
    }

    setVersion(type: string, packageNpm: any) {
        const { name, version } = packageNpm
        const { config } = this.yo

        config.set(`${type}Name`, name)
        config.set(`${type}Version`, version)
    }

    setYo(yo: any) {
        this.yo = yo
    }

    viewVersion(packageNpm: any) {
        const { name, version } = packageNpm

        console.log(`${name} version ${version}`)
    }
}
