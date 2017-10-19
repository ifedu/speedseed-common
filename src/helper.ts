import { Base, core, files, prompter } from '../'

export default class Helper extends Base {
    static tpl: any

    constructor(args: any, options: any) {
        super(args, options)

        core.setYo(options.core.yo)

        core.setGui(options.speedseedgui)
        core.setUpdate(options.update)

        core.setVersion('tpl', Helper.tpl.packageNpm)
        core.viewVersion(Helper.tpl.packageNpm)
    }

    static setOptions(name: string, value: string, exclude?: any) {
        return { name, value, exclude }
    }

    static Yo(tpl: any) {
        Helper.tpl = tpl

        return this
    }

    paths() {
        core.setPath(Helper.tpl.routeTpl, './')
    }

    prompting() {
        if (core.speedseedgui || core.update) return

        const { options } = Helper.tpl

        prompter.setOptions({ options }, (<any>this).async())
    }

    write() {
        core.setOptions()

        files.writeFiles()
    }
}
