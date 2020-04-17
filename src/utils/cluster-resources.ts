import { sdk, ux } from '@cto.ai/sdk'
import { pExec, Tool } from '.'

const { yellow, red, green, magenta, bold } = ux.colors

export const helm = {
  addStableRepo: async () => {
    await sdk.exec(
      `helm repo add stable https://kubernetes-charts.storage.googleapis.com \
      && helm repo update`,
    )
  },
}

export const dashboard = {
  name: 'kubernetes-dashboard',
  install: async () => {
    await ux.spinner.start('Installing Kubernetes Dashboard...')
    const chart = 'kubernetes-dashboard'
    const namespace = 'kube-system'

    try {
      const tool = new Tool({ chart, name: dashboard.name, namespace })
      await tool.install('--set=rbac.create=true,rbac.clusterAdminRole=true')
      await ux.spinner.stop('Successfully installed Kubernetes Dashboard')
    } catch (error) {
      await ux.spinner.stop(`Failed to install Kubernetes Dashboard`)
      await ux.print(`Error: ${JSON.stringify(error)}`)
    }
  },
  uninstall: async () => {
    await ux.spinner.start('Uninstalling Kubernetes Dashboard...')
    try {
      await pExec(`helm delete ${dashboard.name} --namespace kube-system`)
      await ux.spinner.stop('Successfully uninstalled Kubernetes Dashboard')
    } catch (error) {
      await ux.spinner.stop(`Failed to uninstall Kubernetes Dashboard`)
      await ux.print(`Error: ${JSON.stringify(error)}`)
    }
  },
  printInstructions: async (dashboardInfo) => {
    const instructions = [
      yellow(bold('\n💻  Access the Kubernetes Dashboard')),
      '1. Start a proxy server to the Kubernetes API server: ',
      magenta('  kubectl proxy'),
      `2. In the browser, navigate to ${magenta(dashboardInfo.url)}`,
      `3. Select the ${bold(
        'Token',
      )} option and use the following token: ${magenta(dashboardInfo.token)}`
    ]
    await ux.print(instructions.join('\n'))
  }
}

export const deployments = {
  get: async (namespace = '') => {
    try {
      let command = ''
      if (namespace.length < 1) {
        command = `kubectl get deployments -A -o json`
      }
      if (namespace.length >= 1) {
        command = `kubectl get deployments -n ${namespace} -o json`
      }
      const { stdout } = await pExec(command)
      const { items } = JSON.parse(stdout)
      return items
    } catch (error) {
      await ux.print(`Error: ${JSON.stringify(error)}`)
    }
  }
}

export const pods = {
  get: async (namespace = '') => {
    try {
      let command = ''
      if (namespace.length < 1) {
        command = `kubectl get pods -A -o json`
      }
      if (namespace.length >= 1) {
        command = `kubectl get pods -n ${namespace} -o json`
      }
      const { stdout } = await pExec(command)
      const { items } = JSON.parse(stdout)
      return items
    } catch (error) {
      await ux.print(`Error: ${JSON.stringify(error)}`)
    }
  }
}

export const namespaces = {
  getAll: async () => {
    try {
      const { stdout } = await pExec(`kubectl get namespaces -o json`)
      const { items } = JSON.parse(stdout)
      return items
    } catch (error) {
      await ux.print(`Error: ${JSON.stringify(error)}`)
    }
  },
  createIfDoesntExist: async (name: string) => {
    try {
      await pExec(`kubectl create namespace ${name}`)
    } catch (error) {
      if (!error.stderr.includes('AlreadyExists')) {
        await ux.print(`Error: ${JSON.stringify(error)}`)
        throw error
      }
    }
  },
}

export const nginxIngressController = {
  name: 'nginx-ingress',
  install: async () => {
    const chart = 'nginx-ingress'
    const namespace = 'kube-system'

    try {
      await ux.spinner.start('Installing NGINX Ingress Controller...')
      const tool = new Tool({ name: nginxIngressController.name, chart, namespace })
      await tool.install('rbac.create=true,serviceAccount.create=true')
      await ux.spinner.stop('Successfully installed NGINX Ingress Controller')
    } catch (error) {
      await ux.spinner.stop(`Failed to install NGINX Ingress Controller`)
      sdk.log(`Error: ${JSON.stringify(error)}`)
    }
  },
  uninstall: async () => {
    await ux.spinner.start('Uninstalling NGINX Ingress Controller...')
    try {
      await pExec(
        `helm delete ${nginxIngressController.name} --namespace kube-system`,
      )
      await ux.spinner.stop('Successfully uninstalled NGINX Ingress Controller')
    } catch (error) {
      await ux.spinner.stop(`Failed to uninstall NGINX Ingress Controller`)
      sdk.log(`Error: ${JSON.stringify(error)}`)
    }
  },
}

export const prometheus = {
  name: 'prometheus',
  install: async () => {
    await namespaces.createIfDoesntExist('monitoring')
    await ux.spinner.start('Installing Prometheus...')

    const chart = 'prometheus'
    const namespace = 'monitoring'
    try {
      const tool = new Tool({ name: prometheus.name, chart, namespace })
      await tool.install()
      await ux.spinner.stop('Successfully installed Prometheus')
    } catch (error) {
      await ux.spinner.stop(`Failed to install Prometheus`)
      sdk.log(`Error: ${JSON.stringify(error)}`)
    }
  },
  uninstall: async () => {
    await ux.spinner.start('Uninstalling Prometheus...')
    try {
      await pExec(`helm delete ${prometheus.name} --namespace monitoring`)
      await ux.spinner.stop('Successfully uninstalled Prometheus')
    } catch (error) {
      await ux.spinner.stop(`Failed to uninstall Prometheus`)
      sdk.log(`Error: ${JSON.stringify(error)}`)
    }
  },
}

export const grafana = {
  name: 'grafana',
  install: async () => {
    await namespaces.createIfDoesntExist('monitoring')
    await ux.spinner.start('Installing Grafana...')
    const chart = 'grafana'
    const namespace = 'monitoring'

    try {
      const tool = new Tool({ name: grafana.name, chart, namespace })
      await tool.install('ingress.enabled=true,ingress.annotations."kubernetes\\.io/ingress\\.class"=nginx')
      await ux.spinner.stop('Successfully installed Grafana')
    } catch (error) {
      await ux.spinner.stop(`Failed to install Grafana`)
      sdk.log(`Error: ${JSON.stringify(error)}`)
    }
  },
  uninstall: async () => {
    await ux.spinner.start('Uninstalling Grafana...')
    try {
      await pExec(`helm delete ${grafana.name} --namespace monitoring`)
      await ux.spinner.stop('Successfully uninstalled Grafana')
    } catch (error) {
      await ux.spinner.stop(`Failed to uninstall Grafana`)
      sdk.log(`Error: ${JSON.stringify(error)}`)
    }
  },
  printInstructions: async (grafanaInfo) => {
    const instructions = [
      yellow(bold('\n📊  Access the Grafana Dashboard')),
      `1. In the browser, navigate to ${magenta(grafanaInfo.url)}`,
      `2. Use & save these default credentials for access (can also be viewed in the Secrets section of the K8s dashboard):`,
      `  username: ${green(grafanaInfo.user)}`,
      `  password: ${green(grafanaInfo.password)}`,
    ]
    await ux.print(instructions.join('\n'))
  }
}

export const metricsServer = {
  name: 'metrics-server',
  install: async () => {
    await ux.spinner.start('Installing Metrics Server...')
    const chart = 'metrics-server'
    const namespace = 'kube-system'

    try {
      const tool = new Tool({ name: metricsServer.name, chart, namespace })
      await tool.install()
      await ux.spinner.stop('Successfully installed Metrics Server')
    } catch (error) {
      await ux.spinner.stop(`Failed to install Metrics Server`)
      sdk.log(`Error: ${JSON.stringify(error)}`)
    }
  },
  uninstall: async () => {
    await ux.spinner.start('Uninstalling Metrics Server...')
    try {
      await pExec(`helm delete ${metricsServer.name} --namespace kube-system`)
      await ux.spinner.stop('Successfully uninstalled Metrics Server')
    } catch (error) {
      await ux.spinner.stop(`Failed to uninstall Metrics Server`)
      sdk.log(`Error: ${JSON.stringify(error)}`)
    }
  },
}
