const path = require('path')
const tsNode = require('ts-node')
const tsConfigPaths = require('tsconfig-paths')

const tsConfig = require('./tsconfig.json')

tsNode.register({
    fast: true,

    compilerOptions: {
        allowJs: true
    },

    ignore: [
        /^((?!\bspeedseed\b|\bconfig\b|\bcore\b).)*$/
    ],

    project: path.resolve(__dirname),
})

tsConfigPaths.register({
    baseUrl: './',

    paths: tsConfig.compilerOptions.paths,
})

module.exports = require('./index.ts')
