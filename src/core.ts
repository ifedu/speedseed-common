import { resolve } from 'path'

export default class Core {
    options: any
    root: any = process.cwd()
    yo: any

    callTpl(options: any) {
        const tpl: string = `speedseed-${this.options['template']}`

        options = options || {}

        this.yo.composeWith(tpl, options)
    }

    getPath(dirname: any, route: any) {
        return resolve(dirname, route)
    }

    setCore(packageNpm: any) {
        const { name, version } = packageNpm
        const { config } = this.yo

        config.set('coreName', name)
        config.set('coreVersion', version)
    }

    setOptions() {
        this.options = this.yo.config.getAll()
    }

    setPath(dirname: any, root: any) {
        const route = resolve(dirname, root)

        this.yo.sourceRoot(route)
    }

    setProject() {
        let project = this.yo.config.get('project')

        project = project.toLowerCase().replace(/[-_ ]/g, '')

        this.yo.config.set('project', project)
    }

    setYo(yo: any) {
        this.yo = yo
    }

    viewVersion(packageNpm: any) {
        const { name, version } = packageNpm

        console.log(`${name} version ${version}`)
    }
}
