import { merge, template } from 'lodash'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs'
import { basename, resolve } from 'path'

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
        const route = resolve(core.root, dest)

        mkdirSync(route)
        mkdirSync(`${route}/construct`)

        for (let prop in this.jsonSeed) {
            const routeProp = `/construct/${prop}`

            this.writeFileExportJs(`${route}${routeProp}`, this.jsonSeed[prop], 4)
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

            const route = resolve(core.root, nameFile)

            const dataJson = this.transformJson(data)

            this.writeFile(route, dataJson, 4)
        }
    }

    private transformJson(data: any) {
        const dataJson = JSON.parse(data)
        const dataJsonOrder = Object.assign({}, dataJson)

        this.orderJson(dataJson, dataJsonOrder, 'dependencies')
        this.orderJson(dataJson, dataJsonOrder, 'devDependencies')

        return dataJsonOrder
    }

    private orderJson(dataJson: any, dataJsonOrder: any, type: string) {
        if (dataJson[type]) {
            dataJsonOrder[type] = {}

            Object.keys(dataJson[type]).sort().forEach((val: any) => {
                dataJsonOrder[type][val] = dataJson[type][val]
            })
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
