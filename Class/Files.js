class Files {
    del(file, fn) {
        require('del')(file, {
            force: true
        })
        .then(() => fn())
    }

    readFile(fileCore, config) {
        const extend = require('extend')
        const fs = require('fs')

        let file = {}

        if (fs.existsSync(`./${fileCore}`) === true) {
            try {
                file = JSON.parse(fs.readFileSync(`./${fileCore}`, 'utf8'))
            } catch (e) {
                console.log(`ERROR in ${fileCore}`)
            }
        }

        extend(true, config, file)
    }

    updateFile(fileCore, spaces, config) {
        this.readFile(fileCore, config)

        this.writeFile(fileCore, spaces, config)
    }

    writeFile(fileCore, spaces, config) {
        const fs = require('fs')

        fs.writeFileSync(fileCore, JSON.stringify(config, null, spaces))
    }
}

module.exports = Files