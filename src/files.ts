import * as del from 'del'
import { lstat } from 'fs'

import { construct, core, Helper, prompter } from '../'

export default class Files {
    create(fileTpl: string, fileDest: string, isTpl?: any) {
        lstat(fileTpl, (err: any, stats: any) => {
            if (stats) this.copyFiles(fileTpl, fileDest, isTpl)
        })
    }

    del(file: string, fn: any) {
        del(file, {
            force: true
        })
        .then(fn)
    }

    writeFiles() {
        console.log('deleting core...')

        this.del('core', this.createCore)
    }

    private createCore = () => {
        console.log('creating core...')

        const routeTpl = `${Helper.tpl.routeTpl}/seed/template`

        this.createFilesOfRoute(routeTpl, [], 0)

        construct.writeJsonSeed('./core')

        core.yo.composeWith('speedseed:postinstall', {})
    }

    private createFilesOfRoute(routeTpl: string, propsPrevs: any, i: number) {
        if (i > Helper.tpl.options.length) return

        this.createFiles(`${routeTpl}/all`)

        for (let prop in core.options) {
            if (
                prop.match(/\bcoreName\b|\bcoreVersion\b|\bproject\b|\btemplate\b|\btemplateFiles\b/) ||
                propsPrevs.includes(prop)
            ) continue

            const val = core.options[prop]

            this.createFiles(`${routeTpl}/${prop}/all`)
            this.createFiles(`${routeTpl}/${prop}/${val}`)

            this.createFilesOfRoute(
                `${routeTpl}/${prop}/${val}`,
                [...propsPrevs, prop],
                ++i
            )
        }
    }

    private createFiles(route: string) {
        if (core.options.templateFiles === true) {
            this.create(`${route}/copy`, './', false)
            this.create(`${route}/root`, './')
        }

        this.create(`${route}/core`, './core')
        this.create(`${route}/tpl`, './')

        construct.checkJson(`${route}/construct`)
    }

    private copyFiles(fileTpl: string, fileDest: string, isTpl?: boolean) {
        if (isTpl === false) {
            this.copy('copy', `${fileTpl}/**/*`, fileDest)
            this.copy('copy', `${fileTpl}/**/.*`, fileDest)
        }
        else {
            this.copy('copyTpl', `${fileTpl}/**/*`, fileDest)
            this.copy('copyTpl', `${fileTpl}/**/.*`, fileDest)
        }
    }

    private copy(copyTpl: string, fileTpl: string, fileDest: string) {
        try {
            core.yo.fs[copyTpl](
                core.yo.templatePath(fileTpl),
                core.yo.destinationPath(fileDest),
                core.options
            )
        } catch (e) {
            // console.log(e)
        }
    }
}
