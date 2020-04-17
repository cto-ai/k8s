import { ux } from '@cto.ai/sdk'
import { pExec } from '.'

const { magenta } = ux.colors

export class Tool {
  chart: string
  name: string
  namespace: string
  constructor({ chart, name, namespace }) {
    this.chart = chart // name of helm chart
    this.name = name // name of helm release
    this.namespace = namespace // k8s namespace to install helm chart in
  }

  /**
   * Validation when choosing what tools to INSTALL
   * Check if selected tools has been installed in any namespace
   * Return an array of tools to install and/or re-install
   *
   * @param { Array } selected - tools the user would like to install
   * @return { Array }
   */
  static async removeInstalled(selected: string[]) {
    const { stdout } = await pExec('helm ls --all-namespaces -o json')

    const charts = {}
    JSON.parse(stdout).forEach(item => {
      const name = item.chart.split(/(\-[0-9])/)[0]
      charts[name] = item.namespace
    })

    const installed = selected.filter(tool => !!charts[tool])
    if (!installed.length) return selected

    const toolList = installed.map(tool => {
      return ` ∙ \`${magenta(tool)}\` (namespace: \`${magenta(charts[tool])}\`)`
    })
    const message = [
      '\nThe following tool(s) have already been installed:',
      ...toolList,
    ]
    await ux.print(message.join('\n'))
    const notInstalled = selected.filter(tool => !charts[tool])
    return notInstalled
  }

  /**
   * Validation when choosing what tools to UNINSTALL
   * Remove selected tools that cannot be uninstalled (because they
   * haven't been installed in the first place)
   * Return an array of tools to uninstall
   *
   * @param { Array } selected - tools the user would like to uninstall
   * @return { Array }
   */
  static async removeNotInstalled(selected: string[]) {
    const { stdout } = await pExec('helm ls --all-namespaces -o json')

    const charts = {}
    JSON.parse(stdout).forEach(item => {
      const name = item.chart.split(/(\-[0-9])/)[0]
      charts[name] = item.namespace
    })

    const notInstalled = selected.filter(tool => !charts[tool])
    if (!notInstalled.length) return selected

    const installed = selected.filter(tool => !!charts[tool])
    
    if (installed.length > 0) {
      const toolList = installed.map(tool => ` ∙ \`${magenta(tool)}\``)
      const message = [
        '\nThe following tool(s) are currently installed in the cluster:',
        ...toolList,
      ]
      await ux.print(message.join('\n'))
    }
    
    return installed
  }

  /**
   * @param { String } helmOptions - optional. use if you need to set
   *                                 certain values in helm chart
   * @return { Promise<null|object> }
   */
  async install(helmOptions = '') {
    const { chart, name, namespace } = this
    const command = `helm install ${name} stable/${chart} --namespace ${namespace} --set=${helmOptions}`
    return pExec(command)
  }
}

