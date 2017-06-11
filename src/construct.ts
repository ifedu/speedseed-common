import { merge, template } from 'lodash'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs'
import { basename } from 'path'

import { Helper, core, prompter } from '../'

export default class Construct {
    [key: string]: any

    private jsonConstruct: any = {}
    private jsonSeed: any = {}

    checkJson(route: any) {
        if (existsSync(route)) {
            this.readJsons(route)
        }
    }

    setJson(route: string) {
        if (existsSync(route)) {
            readdirSync(route)
            .forEach(this.jsonsEach.bind(this, route, 'jsonConstruct'))
        }
    }

    writeJsonSeed(dest: string) {
        mkdirSync(dest)
        mkdirSync(`${dest}/construct`)

        for (let prop in this.jsonSeed) {
            const routeProp = `/construct/${prop}`

            this.writeFileExportJs(`${dest}${routeProp}`, this.jsonSeed[prop], 4)
        }
    }

    writeJsonConstruct() {
        for (let prop in this.jsonConstruct) {
            const jsonStr: string = JSON.stringify(this.jsonConstruct[prop])
            const transform: any = {
                'evaluate': /<%=([\s\S]+?)%>/g,
                'interpolate': /<%=([\s\S]+?)%>/g
            }

            const data: any = template(jsonStr, transform)(core.options)

            let nameFile: string = basename(prop, '.ts')
            nameFile = `${nameFile}.json`

            console.log(`   create ${nameFile}`)

            this.writeFile(nameFile, JSON.parse(data), 4)
        }
    }

    private readJsons(route: string) {
        readdirSync(route)
        .forEach(this.jsonsEach.bind(this, route, 'jsonSeed'))
    }

    private jsonsEach(route: string, json: string, file: any) {
        this[json][file] = this[json][file] || {}

        const data = require(`${route}/${file}`).default

        merge(this[json][file], data)
    }

    private writeFileExportJs(nameFile: string, data: any, spaces: number) {
        const json = JSON.stringify(data, null, spaces)
        const content = `export default ${json}`

        writeFileSync(nameFile, content)
    }

    private writeFile(nameFile: string, data: any, spaces: number) {
        writeFileSync(nameFile, JSON.stringify(data, null, spaces))
    }
}
