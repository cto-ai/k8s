import { ux, Question } from '@cto.ai/sdk'
import { DeployPromptsObj, HPAPromptsObj } from '../types'

const { secondary, green, red } = ux.colors

export const continuePrompt: Question = {
  type: 'confirm',
  name: 'continue',
  message: `Please confirm if you are ready to continue`,
}

export const confirmDeployPrompt: Question = {
  type: 'confirm',
  name: 'confirmDeploy',
  message: '\nWould you like to proceed with the deployment?',
}

export const namespacePrompt = (namespaces): Question => {
  return {
    type: 'list',
    name: 'namespace',
    message: '\nSelect the namespace you would like to deploy an application to',
    default: 'default',
    choices: namespaces,
  }
}

export const appNamePrompt: Question = {
  type: 'input',
  name: 'appName',
  message: `\nEnter the name of the application you would like to deploy`,
}

export const imagePrompt: Question = {
  type: 'input',
  name: 'image',
  message: `\nEnter the URL for the image \n(format: ${secondary('<REGISTRY-URL>/<IMAGE-NAME>:<IMAGE-TAG>')})`,
}

export const deployPrompts: DeployPromptsObj = {
  targetPort: {
    type: 'input',
    name: 'targetPort',
    message: '\nEnter the port your application will be running on (check your Dockerfile)',
  },
  port: {
    type: 'input',
    name: 'port',
    message: '\nEnter the port that the service can be accessed from',
  },
  replicas: {
    type: 'input',
    name: 'replicas',
    default: '1',
    message: '\nEnter the number of replicas you would like to create for your application',
  },
  isPublic: {
    type: 'confirm',
    name: 'isPublic',
    message: '\nWould you like your application to be accessible outside the cluster?',
  },
  hostURL: {
    type: 'input',
    name: 'hostURL',
    message: '\nEnter the URL this application should be accessed from (e.g. api.yoursite.ca)',
  },
}

export const hpaPrompt: Question = {
  type: 'confirm',
  name: 'configureHPA',
  message: '\nWould you like to configure horizontal pod autoscaling?',
}

export const hpaPrompts: HPAPromptsObj = {
  minPods: {
    type: 'input',
    name: 'minPods',
    message: '\nEnter the minimum number of replicas',
    default: '1',
  },
  maxPods: {
    type: 'input',
    name: 'maxPods',
    message: '\nEnter the maximum number of replicas',
    default: '2',
  },
  targetCPU: {
    type: 'input',
    name: 'targetCPU',
    message: '\nEnter the target CPU utilization percentage',
    default: '50',
  },
}
