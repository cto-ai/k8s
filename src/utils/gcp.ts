import fs from 'fs'
import { sdk, ux } from '@cto.ai/sdk'
import { Storage } from '@google-cloud/storage'
import { regionPrompt } from '../prompts'
import { GCP_REGIONS, GCP_CREDS_FILE } from '../constants'
import { GCPConfig } from '../types'
import { pExec, track } from '.'

export class GCP {
  keyFile: string
  storage: any
  projectId: string
  region: string
  constructor() {
    this.keyFile = ''
    this.region = ''
    this.projectId = ''
    this.storage = null
  }

  get name() {
    return 'GCP'
  }

  get envVars() {
    return `GOOGLE_APPLICATION_CREDENTIALS=${this.keyFile}`
  }

  get regions() {
    return GCP_REGIONS
  }

  //removes sensitive information from the profile so we don't track private keys etc.
  gcpStripProfile (profile: GCPConfig) {
    let profileConfig: GCPConfig = {} as GCPConfig
    Object.assign(profileConfig, profile)
    profileConfig.private_key = ''
    profileConfig.private_key_id = ''
    profileConfig.client_email = ''
    return profileConfig
  }

  async saveCredsToDisk (credsJSON: string) {
    fs.writeFileSync(GCP_CREDS_FILE, credsJSON)
    await pExec(`gcloud --quiet auth activate-service-account --key-file ${GCP_CREDS_FILE} --project ${this.projectId}`)
    this.keyFile = GCP_CREDS_FILE
    return
  }

  async authenticate() {
    const { GOOGLE_APPLICATION_CREDENTIALS } = await sdk.getSecret('GOOGLE_APPLICATION_CREDENTIALS')

    let profileConfig: GCPConfig
    try {
      profileConfig = JSON.parse(GOOGLE_APPLICATION_CREDENTIALS)
      this.projectId = profileConfig.project_id
      profileConfig = this.gcpStripProfile(profileConfig)
    } catch (error) {
      await ux.print(ux.colors.magenta(`The credentials JSON looks incorrect. Let's try that again, shall we?`))
      track({
        event: 'Malformed GKE credentials entered',
        error: JSON.stringify(error),
      })
      process.exit(1)
    }

    await this.saveCredsToDisk(GOOGLE_APPLICATION_CREDENTIALS)

    this.storage = new Storage({ keyFilename: this.keyFile, projectId: this.projectId })

    track({
      event: 'Configure GKE',
      profile: profileConfig,
    })
    return profileConfig
  }

  async getRegion() {
    const { region } = await ux.prompt([regionPrompt(this.regions)])
    this.region = region

    return region
  }

  async remoteStateExists(name) {
    const [buckets] = await this.storage.getBuckets()
    const matchingBucket = buckets.map(bucket => bucket.name)
      .filter(bucket => bucket === name)
    return !!matchingBucket.length
  }
}
