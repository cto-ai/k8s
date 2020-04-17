import { Question } from '@cto.ai/sdk'

export const yamlPrompt: Question = {
  type: 'editor',
  name: 'yaml',
  message: '\nPlease paste the contents of the YAML file that contains your resource configurations'
}

export const slackYamlPrompt: Question = {
  type: 'secret',
  name: 'yaml',
  message: '\nPlease paste the contents of the YAML file that contains your resource configurations'
}
