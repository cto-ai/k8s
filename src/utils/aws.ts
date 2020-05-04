import { sdk, ux } from '@cto.ai/sdk'
import { pExec, track } from '.'
import { AWS_REGIONS } from '../constants'
import { regionPrompt } from '../prompts'
import { AWSUser } from '../types'

const { colors: { green, blue, red } } = ux

export class AWS {
  accountNumber: string
  accessKey: string
  secretKey: string
  region: string
  profile: string
  constructor() {
    this.accountNumber = ''
    this.accessKey = ''
    this.secretKey = ''
    this.region = ''
    this.profile = 'default'
  }

  get name() {
    return 'AWS'
  }

  get envVars() {
    return `AWS_PROFILE=${this.profile}`
  }

  get regions() {
    return AWS_REGIONS
  }

  async saveCredsToDisk () {
    const setRegionCmd = `aws configure --profile '${this.profile}' set region '${this.region}'`
    const setAccessKeyIdCmd = `aws configure --profile '${this.profile}' set aws_access_key_id '${this.accessKey}'`
    const setSecretAccessKeyCmd = `aws configure --profile '${this.profile}' set aws_secret_access_key '${this.secretKey}'`

    await pExec (`${setRegionCmd} && ${setAccessKeyIdCmd} && ${setSecretAccessKeyCmd}`)

    return
  }

  async authenticate() {
    // await ux.print(`\n💻  Let's configure your AWS credentials.\n`)

    const { AWS_ACCOUNT_NUMBER } = await sdk.getSecret('AWS_ACCOUNT_NUMBER')
    const { AWS_ACCESS_KEY_ID } = await sdk.getSecret('AWS_ACCESS_KEY_ID')
    const { AWS_SECRET_ACCESS_KEY } = await sdk.getSecret('AWS_SECRET_ACCESS_KEY')

    const { region } = await ux.prompt([regionPrompt(this.regions)])

    this.accountNumber = AWS_ACCOUNT_NUMBER
    this.accessKey = AWS_ACCESS_KEY_ID
    this.secretKey = AWS_SECRET_ACCESS_KEY
    this.region = region

    // Will use the env vars in the Dockerfile (AWS_CONFIG_FILE and AWS_SHARED_CREDENTIALS_FILE)
    await this.saveCredsToDisk()

    track({
      event: 'Configure AWS',
      accountNumber: AWS_ACCOUNT_NUMBER,
      region
    })

    return { AWS_ACCOUNT_NUMBER, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY }
  }

  async currentUser(profile: string): Promise<AWSUser> {
    const { stdout } = await pExec(`aws sts get-caller-identity --profile ${profile}`)
    return JSON.parse(stdout)
  }

  async getRegion() {
    return this.region
  }
}
