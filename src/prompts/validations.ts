import fs from 'fs'
import yamlLint from 'js-yaml'
import { sdk, ux } from '@cto.ai/sdk'
import { YAML_PATH } from '../constants'
import { isSlack } from '../utils'

const { red } = ux.colors

export const appNamePromptValidator = ({ value }) => {
  return !!value && !!value.match(/^[a-z0-9\-\_]+$/i)
}

export const imagePromptValidator = ({ value }) => !!value

export const deployPromptsValidators = {
  targetPort: ({ value }) => !!value,
  port: ({ value }) => !!value,
  replicas: ({ value }) => (parseInt(value) > 0),
}

export const hpaPromptsValidators = {
  minPods: ({ value }) => (parseInt(value) >= 1),
  maxPods: ({ value, minPods }) => parseInt(value) > parseInt(minPods),
  targetCPU: ({ value }) => (parseInt(value) > 0 && parseInt(value) < 100),
}

export const isValidYaml = async ({ value }) => {
  // slack tries to prefix URLs with `http://`--but this causes issues when
  // trying to apply the configs with kubectl
  if (isSlack()) {
    value = value.replace(/(http:\/\/)/g, '')
  }
  
  try {
    fs.writeFileSync(YAML_PATH, value)
    yamlLint.safeLoad(fs.readFileSync(YAML_PATH))
    return true
  } catch (err) {
    err.message && await ux.print(err.message)
    if (err.mark) {
      const { line, buffer } = err.mark
      await ux.print(red(`Invalid YAML on line ${line} - ${err.reason}:\n`))
      await ux.print(red(buffer))
    }
    return false
  }
}
