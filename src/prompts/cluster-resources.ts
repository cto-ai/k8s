import { Question } from '@cto.ai/sdk'
import { RESOURCES_TYPES } from '../constants'
import { namespaces } from '../utils/cluster-resources'

export const selectNamespace = async (): Promise<Question> => {
  const items = await namespaces.getAll()
  const names = items?.map(el => el.metadata.name)
  return {
    type: 'autocomplete',
    name: 'namespace',
    message: `\nPlease select which namespace you would like to use`,
    choices: [...(names || []), 'Use all namespaces']
  }
}

export const selectResourceType = (): Question => {
  return {
    type: 'autocomplete',
    name: 'resourceType',
    message: `\nPlease select the resource type you would like to view`,
    choices: RESOURCES_TYPES
  }
}