import { relative, resolve } from 'path'

export default class Core {
    setDestinationRoot: boolean = false
    options: any
    root: any = process.cwd()
    speedseedgui: any
    yo: any

    callTpl(options: any) {
        const tpl: string = `speedseed-${this.options['template']}`

        options = options || {}
        options.core = this
        options.speedseedgui = this.speedseedgui

        this.yo.composeWith(tpl, options)
    }

    getPath(dirname: any, route: any) {
        return resolve(dirname, route)
    }

    setGui(speedseedgui: any) {
        if (!speedseedgui) return
        this.speedseedgui = speedseedgui
        this.root = speedseedgui.route

        if (!this.setDestinationRoot) {
            this.setDestinationRoot = true

            const routeDest: string = relative(process.cwd(), this.root)

            this.yo.destinationRoot(routeDest)
        }


        for (let prop in speedseedgui.options) {
            const val = speedseedgui.options[prop]

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
