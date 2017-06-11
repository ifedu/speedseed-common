import * as Base from 'yeoman-generator'

import Construct from './src/construct'
import Core from './src/core'
import Files from './src/files'
import Helper from './src/helper'
import Prompter from './src/prompter'

const construct = new Construct()
const core = new Core()
const files = new Files()
const prompter = new Prompter()

export {
    Base,
    construct,
    core,
    files,
    Helper,
    prompter
}
