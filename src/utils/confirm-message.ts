import { ux } from '@cto.ai/sdk'
import { CLUSTER_TOOLS } from '../constants'

const { yellow, green, bold } = ux.colors

// format selected list of tools
const formatTools = ({ selected, cloud }): string[] => {
  return selected.map(tool => ` ∙ \`${CLUSTER_TOOLS[cloud][tool]}\``)
}

export const confirmMessage = async ({ action, settings }): Promise<any> => {
  switch(action) {
    case 'install': {
      const { selected, cloud } = settings
      const tools = formatTools({ selected, cloud })

      return [
        yellow(bold('\n💻  Cluster Settings')),
        ` ∙ Cluster: \`${green(settings.cluster)}\``,
        ` ∙ Region: \`${green(settings.region)}\``,
        yellow(bold('\n🛠  The following tool(s) will be available for installation in the cluster:')),
        ...tools,
      ]
    }
    case 'uninstall': {
      const { selected, cloud } = settings
      const tools = formatTools({ selected, cloud })

      return [
        yellow(bold('\n💻  Cluster Settings')),
        ` ∙ Cluster: \`${green(settings.cluster)}\``,
        ` ∙ Region: \`${green(settings.region)}\``,
        yellow(bold('\n🛠  The following tool(s) will be removed from the cluster:')),
        ...tools,
      ]
    }
    case 'deploy': {
      let message = [
        bold('\nHere are your settings:'),
        bold(yellow('\n💻  Cluster Settings')),
        ` ∙ Cluster: \`${green(settings.cluster)}\``,
        ` ∙ Region: \`${green(settings.region)}\``,
        bold(yellow('\n🛠   Deployment Settings')),
        ` ∙ Namespace: \`${green(settings.namespace)}\``,
        ` ∙ Application name: \`${green(settings.app)}\``,
        ` ∙ Image: \`${green(settings.image)}\``,
        ` ∙ Application Port: \`${green(`${settings.targetPort}`)}\``,
        ` ∙ Service Port: \`${green(`${settings.port}`)}\``,
        ` ∙ Number of Replicas: \`${green(`${settings.replicas}`)}\``,
        ` ∙ Allow External Access: \`${green(settings.isPublic)}\``,
      ]
      if (settings.isPublic) {
        message.push(` ∙ Application URL: \`${green(settings.host)}\``)
      }
      if (settings.configureHPA) {
        const hpa = [
          bold(yellow('\n⚖️  Horizontal Pod Autoscaler Settings')),
          ` ∙ Minimum number of pods: \`${green(`${settings.hpa.minPods}`)}\``,
          ` ∙ Maximum number of pods: \`${green(`${settings.hpa.maxPods}`)}\``,
          ` ∙ Target CPU Utilization: \`${green(`${settings.hpa.targetCPU}%`)}\``,
        ]
        message = message.concat(hpa)
      }
      return message
    }
  }
}
