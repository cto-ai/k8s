import { sdk, ux } from '@cto.ai/sdk'
import { track, isSlack } from '.'
import { selectAction } from '../prompts'
import { OP_ACTIONS } from '../constants'

const { magenta } = ux.colors

// https://psfonttk.com/big-text-generator/
const logo_cli = `
█░█ ▄▀▀▄ █▀▀   █▀▀█ █▀▀█
█▀▄ ▄▀▀▄ ▀▀█   █░░█ █░░█
▀░▀ ▀▄▄▀ ▀▀▀   ▀▀▀▀ █▀▀▀
`

// https://nickmakes.website/slack-emoji-converter/
const logo_slack = `
:white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square:
:white_square::black_square::white_square::white_square::black_square::white_square::black_square::black_square::black_square::black_square::white_square::white_square::black_square::black_square::black_square::white_square:
:white_square::black_square::white_square::black_square::white_square::white_square::black_square::white_square::white_square::black_square::white_square::black_square::white_square::white_square::white_square::white_square:
:white_square::black_square::black_square::white_square::white_square::white_square::white_square::black_square::black_square::white_square::white_square::white_square::black_square::black_square::white_square::white_square:
:white_square::black_square::white_square::black_square::white_square::white_square::black_square::white_square::white_square::black_square::white_square::white_square::white_square::white_square::black_square::white_square:
:white_square::black_square::white_square::white_square::black_square::white_square::black_square::black_square::black_square::black_square::white_square::black_square::black_square::black_square::white_square::white_square:
:white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square::white_square:
`

export const promptActionSelect = async () => {
  const { action } = await ux.prompt(selectAction)
  const shortAction = OP_ACTIONS[action]
  await track({ event: `Op action ${shortAction} selected` })

  return shortAction
}

const instructions = (cloud: string): string[] => {
  switch (cloud) {
    case 'AWS':
      return [
        `\n➡  AWS credentials (Account Number, Access Key ID, Secret Access Key) `,
        '➡  AWS Region where your cluster is created',
        `➡  Kubeconfig for your cluster`,
      ]
    case 'GCP':
      return [
        '\n➡  GCP service account credentials (JSON)',
        '➡  GCP region where your cluster is created',
        `➡  Kubeconfig for your cluster`,
      ]
    default:
      return []
  }
}

export const showWelcomeMessage = async ({ action, cloud }) => {
  const greetingLines = [
    `\n👋  Hi there, welcome to the K8s Op! If you have any questions be sure to reach out to the CTO.ai team, we're always happy to help!\n`,
    '⚠️  This Op requires some setup. Here\'s what you\'ll need:',
    ...instructions(cloud),
    `\n🤓  Please review the README for required roles and permissions for ${cloud} credentials.\n`
  ]

  if (action === 'deploy') {
    greetingLines.push('✅ An image registry for your containerized application')
  }

  const logo = isSlack() ? logo_slack : logo_cli
  await ux.print(logo)
  await ux.print(greetingLines.join(`\n`))
  return action
}

