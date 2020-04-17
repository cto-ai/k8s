import { AWS } from './aws'
import { GCP } from './gcp'

export class CloudProviderFactory {
  type: string
  constructor(type) {
    this.type = type
  }

  init() {
    switch (this.type) {
      case 'AWS':
        return new AWS()
      case 'GCP':
        return new GCP()
      default:
        throw new Error('No such cloud provider')
    }
  }

  get envVars() {
    return ``
  }

  get regions() {
    return []
  }

  async authenticate() {
    throw new Error('Implementation of authenticate() is required')
  }
}
