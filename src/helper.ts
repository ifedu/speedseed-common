import { Base, core, files, prompter } from '../'

export default class Helper extends Base {
    static tpl: any

    update: boolean

    constructor(args: any, options: any) {
        super(args, options)

        this.update = options.update
    }

    static setOptions(name: string, value: string, extra?: string, exclude?: any) {
        return { name, value, extra, exclude }
    }

    static Yo(tpl: any) {
        Helper.tpl = tpl

        return this
    }

    paths() {
        core.setPath(core.root, './')
    }

    prompting() {
        if (this.update) return

        const { options } = Helper.tpl

        prompter.setOptions({ options }, (<any>this).async())
    }

    write() {
        core.setOptions()

        files.writeFiles()
    }
}
