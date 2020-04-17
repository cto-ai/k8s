import YAML from 'yaml'
import { sdk, ux } from '@cto.ai/sdk'
import { pExec, track, isSlack } from '.'
import { YAML_PATH } from '../constants'

const { green, red, magenta } = ux.colors

export class Yaml {
  env: string
  constructor() {
    this.env = sdk.getInterfaceType()
  }

  async apply() {
    const { env } = this
    try {
      const { stdout } = await pExec(`kubectl apply -f ${YAML_PATH}`)

      const output = isSlack() ? ('```' + stdout + '```') : green(stdout)
      await ux.print(output)
      await ux.print(green('🚀 Resource(s) created/updated!'))

      track({ event: 'Resources created from YAML', env })
    } catch (err) {
      await ux.print(red(err))
      track({
        event: 'Error creating resources from YAML',
        env,
        error: JSON.stringify(err),
      })
    }
  }
}
