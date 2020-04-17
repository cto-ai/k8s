import { ux, Question } from '@cto.ai/sdk'
import { AWS_REGIONS, CLOUD_PROVIDERS, OP_ACTIONS } from '../constants'
import { AWSQuestionsPromptsObject } from '../types'

const { secondary, white, green } = ux.colors

export const selectAction: Question = {
  type: 'autocomplete',
  name: 'action',
  message: '\nWhat would you like to do?',
  choices: Object.keys(OP_ACTIONS)
}

export const cloudProviderPrompt: Question = {
  type: 'autocomplete',
  name: 'cloud',
  message: '\nPlease select a cloud provider',
  choices: CLOUD_PROVIDERS,
}

export const reSignInQuestion: Question = {
  type: 'confirm',
  name: 'useSavedConfig',
  message:
    '🖥  Do you want to use the AWS credentials saved in your local config?',
}

export const awsProfileNameValidate = value => value.trim().length > 0

export const awsQuestionsPrompts: AWSQuestionsPromptsObject = {
  accountNumber: {
    type: 'secret',
    name: 'AWS_ACCOUNT_NUMBER',
    message: `\n Please enter your AWS Account Number`
  },
  accessKeyId: {
    type: 'secret',
    name: 'AWS_ACCESS_KEY_ID',
    message: `\nPlease enter your AWS Access Key ID ${green(
      '→',
    )}\n${secondary(
      'Access this via the AWS Management Console > Security Credentials > Access Keys',
    )}\n\n${white('🔑 Access Key ID')}`,
  },
  accessKeySecret: {
    type: 'secret',
    name: 'AWS_SECRET_ACCESS_KEY',
    message: `\nPlease enter your AWS Access Key Secret ${green(
      '→',
    )}\n\n🤫  ${white('Access Key Secret')}`,
  },
}

export const awsQuestionsPromptsValidators = {
  accountNumber: input => (input.trim().length === 12 && /^\d+$/.test(input)),
  accessKeyId: input => !!input.trim(),
  accessKeySecret: input => !!input.trim(),
}

export const regionPrompt = (regions: string[]): Question => {
  return {
    type: 'autocomplete',
    name: 'region',
    message: `\nSelect the region your cluster is deployed in ${green(
      '→',
    )}`,
    choices: regions,
  }
}

export const kubeconfigContentPrompt: Question = {
  type: 'editor',
  name: 'kubeconfig',
  message: '\nPaste the content of your kubeconfig YAML file'
}

export const slackKubeconfigPrompt: Question = {
  type: 'secret',
  name: 'kubeconfig',
  message: '\nPaste the content of your kubeconfig YAML file'
}

export const kubeconfigNamePrompt: Question = {
  type: 'input',
  name: 'cluster',
  message: '\nEnter a name for this cluster'
}

export const kubeconfigNameRetrievePrompt: Question = {
  type: 'input',
  name: 'cluster',
  message: '\nEnter the name you used to save this cluster' 
}

export const rerunPrompt: Question = {
  type: 'confirm',
  name: 'rerun',
  message: '\n🏠 Would you like to go back to the main menu?',
}
