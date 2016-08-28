class Files {
    del(file, fn) {
        require('del')(file, {
            force: true
        })
        .then(() => fn())
    }

    extendFromOptions($, optionsGeneral, optionsTpl) {
        const extend = require('extend')

        for (let prop in optionsTpl) {
            const optionTpl = optionsTpl[prop]

            extend(
                true,
                optionsGeneral,
                optionTpl[$.tpl[prop]]
            )
        }
    }

    extendFromUser(optionsGeneral, fileCore) {
        const extend = require('extend')
        const fs = require('fs')

        let optionsUser = {}

        if (fs.existsSync(`./${fileCore}`) === true) {
            try {
                optionsUser = JSON.parse(fs.readFileSync(`./${fileCore}`, 'utf8'))
            } catch (e) {
                console.log(`ERROR in ${fileCore}`)
            }
        }

        extend(true, optionsGeneral, optionsUser)
    }

    writeFile(fileCore, optionsGeneral, spaces) {
        const fs = require('fs')

        fs.writeFileSync(fileCore, JSON.stringify(optionsGeneral, null, spaces))
    }
}

module.exports = Files