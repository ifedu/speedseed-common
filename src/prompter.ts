import { core } from '../'

export default class Prompter {
    answers: any = {}

    private cb: any
    private generators: any

    getProject(name: string) {
        return {
            default: core.yo.config.get(name) || 'myproject',
            message: 'Project Name?',
            name,
            type: 'input',
        }
    }

    getTemplate(name: string) {
        return {
            default: core.yo.config.get(name) || 0,
            message: 'Template?',
            name,
            type: 'list',

            choices: this.generators,
        }
    }

    getTemplateFiles(name: string) {
        return {
            default: (
                (
                    (core.yo.config.get(name) === false)
                        ? 1
                        : 0
                )
                || 0
            ),
            message: 'Template files?',
            name,
            type: 'list',

            choices: [
                {
                    name: 'yes',
                    value: true,
                }, {
                    name: 'no',
                    value: false,
                }
            ]
        }
    }

    setGenerator(generators: any) {
        this.generators = generators
    }

    setOptions(promptings: any, cb: any) {
        this.cb = cb

        this.setOption(promptings.options, 0)
    }

    setTemplateChoices(template: any) {
        if (process.argv[3] === undefined) {
            template.choices = this.generators
        } else {
            const param = process.argv[3].replace('--tpl=', '')

            template.choices = {
                choices: [{
                    name: `generator-${param}`,
                    value: param
                }]
            }
        }
    }

    private setOption(options: any, i: number) {
        const option = options[i]

        this.configOptions(option)

        if (option.choices && option.choices.length === 1) {
            const choice = option.choices[0]

            this.setOptionAnswer(options, i, {
                [option.name]: choice.value
            })
        } else {
            core.yo
            .prompt(option)
            .then(this.setOptionAnswer.bind(this, options, i))
        }
    }

    private configOptions(option: any) {
        if (!option) return

        if (!option.type) option.type = 'list'

        this.optionExclude(option)

        const name = core.yo.config.get(option.name)

        option.default = (name)
            ? name
            : option.default || 0
    }

    private optionExclude(option: any) {
        if (!option.choices) return

        let length = option.choices.length
        for (option.i = 0; option.i < length; option.i++) {
            this.optionExcludeChoice(option, option.choices[option.i])
        }
    }

    private optionExcludeChoice = (option: any, choice: any) => {
        if (!choice || !choice.exclude) return

        for (let prop in choice.exclude) {
            core.setOptions()

            const promptChoiced = core.options[prop]

            const optionExcluded = option.choices[option.i]

            choice.exclude[prop].forEach(
                this.optionExcludeChoiceExclude.bind(this, promptChoiced, option)
            )
        }
    }

    private optionExcludeChoiceExclude = (promptChoiced: any, option: any, choiceExclude: any) => {
        if (promptChoiced === choiceExclude) {
            option.choices.splice(option.i, 1)

            option.i--
        }
    }

    private setOptionAnswer(options: any, i: number, answer: any) {
        const promptKey = this.getKey(answer)
        const promptVal = answer[promptKey]

        this.answers[promptKey] = promptVal
        core.yo.config.set(promptKey, promptVal)

        this.searchInChoices(options[i].choices, promptKey, promptVal)

        ;(options[i+1])
            ? this.setOption(options, i+1)
            : this.cb()
    }

    private getKey(obj: any) {
        return Object.keys(obj)[0]
    }

    private searchInChoices(choices: any, promptKey:string, promptVal: string) {
        if (choices) {
            for (let prop in choices) {
                this.choicedHaveExtra(choices[prop], promptKey, promptVal)
            }
        }
    }

    private choicedHaveExtra(choice: any, promptKey: string, promptVal: string) {
        if (choice.value === promptVal && choice.extra) {
            core.yo.config.set(`${promptKey}Extra`, choice.extra)
        }
    }
}
