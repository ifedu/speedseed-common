module.exports = function ($) {
    const route = 'seed/template'

    // FRAMEWORK
    this.create(`${route}/all/compiler/${$.compiler}/app`, './app', true)
    this.create(`${route}/${$.framework}/compiler/all/app`, './app', true)
    this.create(`${route}/${$.framework}/compiler/${$.compiler}/app`, './app', true)
    // CSS
    this.create(`${route}/all/css/${$.css}/app`, './app', true)
    this.create(`${route}/${$.framework}/css/${$.css}/app`, './app', true)
    // SERVER
    this.create(`${route}/all/server/**/*`, './server', true)


    // TEST
    if ($.test !== 'no') {
        this.create(`${route}/all/compiler/${$.compiler}/${$.test}`, './app', true)
        this.create(`${route}/${$.framework}/compiler/all/${$.test}`, './app', true)
        this.create(`${route}/${$.framework}/compiler/${$.compiler}/${$.test}`, './app', true)
    }

    // COMPILER
    if ($.compiler === 'typescript') {
        this.create(`${route}/all/compiler/${$.compiler}/tsconfig.json`, './tsconfig.json')
        this.create(`${route}/${$.framework}/compiler/${$.compiler}/typings`, './typings')
        this.create(`${route}/${$.framework}/compiler/${$.compiler}/typings.json`, './typings.json')
    }
}