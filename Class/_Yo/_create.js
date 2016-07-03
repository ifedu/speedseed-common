module.exports = function (fileTpl, fileDest, option) {
    try {
        const copy = (option === false) ? 'copy' : 'copyTpl'
        const options = (option === false) ? { globOptions: { dot: true } } : this.config.getAll()

        this.fs[copy](
            this.templatePath(fileTpl),
            this.destinationPath(fileDest),
            options
        )

        if (option === true) {
            this.fs[copy](
                this.templatePath(`${fileTpl}/**/.*`),
                this.destinationPath(fileDest),
                options
            )
        }
    } catch (e) {
        console.log(`${fileTpl} not exist`)
    }
}