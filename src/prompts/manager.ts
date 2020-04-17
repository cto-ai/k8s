import { ux, Question } from '@cto.ai/sdk'
import { CLUSTER_TOOLS } from '../constants'

const { magenta } = ux.colors

export const selectCluster = (clusters: string[]): Question => {
  return {
    type: 'autocomplete',
    name: 'cluster',
    message: '\nPlease select the cluster you would like to work with',
    choices: clusters,
  }
}

export const selectToolsPrompt = (stage: string, cloud: string, tools: string[]) : Question => {
  return {
    type: 'checkbox',
    name: 'tools',
    message: `\nPlease select which tools you would like to ${stage} in the cluster`,
    choices: tools.map(tool => CLUSTER_TOOLS[cloud][tool]),
  }
}

export const confirmPrompt = (action: string): Question => {
  return {
    type: 'confirm',
    name: 'confirm',
    message: `\nPlease confirm if you are ready to begin ${magenta(action)}`,
  }
}
