import { sdk, ux } from '@cto.ai/sdk'
import { pExec, track, formatPodsInfo } from '.'
import { ClusterSettings, PodInfo, DeploymentInfo } from '../types'
import {
  dashboard,
  helm,
  nginxIngressController,
  prometheus,
  grafana,
  metricsServer,
  pods,
  deployments,
} from './cluster-resources'
import { formatDeploymentsInfo, displayResources } from './helpers'

const { red, green, bold } = ux.colors

export class Manager {
  settings: ClusterSettings
  constructor({ settings }) {
    this.settings = settings
  }

  get providerName() {
    return this.settings.cloudProvider.constructor.name
  }

  async getDashboardInfo() {
    const { cluster, kubeconfigPath } = this.settings
    const kubectl = `kubectl --kubeconfig=${kubeconfigPath}`
    try {
      const { stdout: token } = await pExec(
        `${kubectl} get secrets -n kube-system -o jsonpath=\"{.items[?(@.metadata.annotations['kubernetes\\.io/service-account\\.name']=='kubernetes-dashboard')].data.token}\" | base64 --decode`
      )
      const url = 'http://localhost:8001/api/v1/namespaces/kube-system/services/https:dashboard-kubernetes-dashboard:https/proxy'
      return {
        token,
        url
      }
    } catch (err) {
      await ux.print('Error getting K8s Dashboard info')
      sdk.log(err)
      track({
        event: 'Error getting  K8s Dashboard info',
        cluster,
        provider: this.providerName,
        error: JSON.stringify(err),
      })
    }
  }

  async getGrafanaInfo() {
    const { cluster, kubeconfigPath } = this.settings
    const kubectl = `kubectl --kubeconfig=${kubeconfigPath}`
    try {
      const loadBalancerEndpoint =
        this.providerName === 'GCP' ? 'ip' : 'hostname'
      const url = await pExec(
        `${kubectl} get svc nginx-ingress-controller -n kube-system -o jsonpath="{@.status.loadBalancer.ingress[0].${loadBalancerEndpoint}}"`,
      )
      const user = await pExec(
        `${kubectl} get secrets grafana -n monitoring -o jsonpath="{@.data.admin-user}" | base64 --decode`,
      )
      const password = await pExec(
        `${kubectl} get secrets grafana -n monitoring -o jsonpath="{@.data.admin-password}" | base64 --decode`,
      )

      return {
        url: `http://${url.stdout}`,
        user: user.stdout,
        password: password.stdout,
      }
    } catch (err) {
      await ux.print('Error getting Grafana credentials')
      sdk.log(err)
      track({
        event: 'Error getting Grafana credentials',
        cluster,
        provider: this.providerName,
        error: JSON.stringify(err),
      })
    }
  }

  async installResource(resource: string, cloud: string) {
    await helm.addStableRepo()
    switch (resource) {
      case 'kubernetes-dashboard': {
        await dashboard.install()
        // await dashboard.printInstructions(await this.getDashboardInfo()) // TODO: Re-enable when login with token works
        break
      }
      case 'nginx-ingress': {
        await nginxIngressController.install()
        break
      }
      case 'metrics-server': {
        await metricsServer.install()
        break
      }
      case 'prometheus': {
        await prometheus.install()
        break
      }
      case 'grafana': {
        await grafana.install()
        // TODO: Re-enable once we update the installation process to configure host, etc.
        // await grafana.printInstructions(await this.getGrafanaInfo())
        break
      }
    }
    const { cluster } = this.settings
    track({ event: `Successfully installed ${resource}`, cloud, cluster })
  }

  async install(selectedResources: string[], cloud: string) {
    const {
      settings: { cluster },
    } = this

    try {
      await ux.print(bold(green('👷🏻‍♀️ Installing K8s tools...')))
      return selectedResources.reduce(async (previousPromise, nextResource) => {
        await previousPromise
        return this.installResource(nextResource, cloud)
      }, Promise.resolve())
    } catch (err) {
      await ux.print('Error installing resources')
      sdk.log(err)
      track({
        event: 'Error installing resources',
        cluster,
        provider: this.providerName,
        error: JSON.stringify(err),
      })
    }

  }

  async uninstallResource(resource: string, cloud: string) {
    switch (resource) {
      case 'kubernetes-dashboard': {
        await dashboard.uninstall()
        break
      }
      case 'nginx-ingress': {
        await nginxIngressController.uninstall()
        break
      }
      case 'metrics-server': {
        await metricsServer.uninstall()
        break
      }
      case 'prometheus': {
        await prometheus.uninstall()
        break
      }
      case 'grafana': {
        await grafana.uninstall()
        break
      }
    }
    const { cluster } = this.settings
    track({ event: `Successfully uninstalled ${resource}`, cloud, cluster })
  }

  async uninstall(selectedResources: string[], cloud: string) {
    const {
      settings: { cluster },
    } = this

    try {
      await ux.print(bold(red('🔥  Uninstalling K8s tools...')))
      return selectedResources.reduce(async (previousPromise, nextResource) => {
        await previousPromise
        return this.uninstallResource(nextResource, cloud)
      }, Promise.resolve())
    } catch (err) {
      await ux.print('Error uninstalling resources')
      sdk.log(err)
      track({
        event: 'Error uninstalling resources',
        cluster,
        provider: this.providerName,
        error: JSON.stringify(err),
      })
    }
  }

  async listResource(namespace: string, resourceType: string) {
    try {
      const PODS = 'pods'
      const DEPLOYMENTS = 'deployments'
      const ALL_NAMESPACES = 'Use all namespaces'

      if (namespace === ALL_NAMESPACES) {
        namespace = ''
      }
      if (resourceType === PODS) {
        const items: JSON = await pods.get(namespace)
        const podList: PodInfo[] = await formatPodsInfo(items)
        await displayResources(podList, 'pods')
      }
      if (resourceType === DEPLOYMENTS) {
        const items: JSON = await deployments.get(namespace)
        const deploymentList: DeploymentInfo[] = await formatDeploymentsInfo(items)
        await displayResources(deploymentList, 'deployments')
      }
    } catch (err) {
      await ux.print(`Error listing resources: ${err}`)
      await track({
        event: 'Error listing resources',
        namespace,
        resourceType,
        provider: this.providerName,
        error: JSON.stringify(err)
      })
    }
  }
}
