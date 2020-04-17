import yaml from 'yaml'
import { sdk, ux } from '@cto.ai/sdk'
import {
  deployment,
  hpa,
  service,
  ingress,
  pExec,
  track,
  validatePrompt,
  isSlack
} from '.'
import {
  continuePrompt,
  deployPrompts,
  deployPromptsValidators,
  hpaPrompts,
  hpaPromptsValidators,
} from '../prompts'
import { DeployerSettings, DeploymentConfig, HPAConfig } from '../types'

const { bold, green, magenta } = ux.colors

export class Deployer {
  app: string
  namespace: string
  constructor({ namespace, app }) {
    this.namespace = namespace
    this.app = app
  }

  static async getNamespaces() {
    const { stdout } = await pExec(`kubectl get ns -o json`)
    const namespaces = JSON.parse(stdout)

    if (!namespaces.items.length) return []

    return namespaces.items.map(namespace => namespace.metadata.name)
  }

  static async getApps(namespace: string) {
    const { stdout } = await pExec(`kubectl get deploy -n ${namespace} -o json`)
    const apps = JSON.parse(stdout)

    if (!apps.items.length) return []

    return apps.items.map(app => app.metadata.name)
  }

  async getDeployOptions(): Promise<DeploymentConfig> {

    const { targetPort } = await validatePrompt({
      prompt: deployPrompts.targetPort,
      validate: deployPromptsValidators.targetPort,
      error: 'Please enter a valid port input',
    })

    const { port } = await validatePrompt({
      prompt: deployPrompts.port,
      validate: deployPromptsValidators.port,
      error: 'Please enter a valid port input',
    })

    const { replicas } = await validatePrompt({
      prompt: deployPrompts.replicas,
      validate: deployPromptsValidators.replicas,
      error: 'Please enter a number greater than 0',
    })

    const { isPublic } = await ux.prompt(deployPrompts.isPublic)

    let host
    if (!!isPublic) {
      const { hostURL } = await ux.prompt(deployPrompts.hostURL)
      host = hostURL.split('://')[1] || hostURL.split('://')[0]
    }
    return {
      targetPort: parseInt(targetPort),
      port: parseInt(port),
      replicas: parseInt(replicas),
      isPublic,
      host,
    }
  }

  async getHPAOptions(): Promise<HPAConfig> {

    const { minPods } = await validatePrompt({
      prompt: hpaPrompts.minPods,
      validate: hpaPromptsValidators.minPods,
      error: 'The minimum number should be at least 1',
    })

    const { maxPods } = await validatePrompt({
      prompt: hpaPrompts.maxPods,
      validate: hpaPromptsValidators.maxPods,
      validateOptions: { minPods },
      error: 'The maximum number of replicas should be greater than the minimum number',
    })

    const { targetCPU } = await validatePrompt({
      prompt: hpaPrompts.targetCPU,
      validate: hpaPromptsValidators.targetCPU,
      error: 'The value must be in the interval 0-100',
    })

    return {
      minPods: parseInt(minPods),
      maxPods: parseInt(maxPods),
      targetCPU: parseInt(targetCPU),
    }
  }

  async getHistory() {
    const { namespace, app } = this
    const { stdout } = await pExec(`kubectl rollout history deploy/${app} -n ${namespace}`)

    const history = stdout.trim()
      .split('\n')
      .slice(2)
      .reverse()
      .map(line => {
        const revision: string[] = line.split(/[ ,]+/)
        return {
          number: revision[0],
          image: revision[1],
        }
      })

    return history
  }

  async getConfigs() {
    const { namespace, app } = this
    const deployment = await pExec(`kubectl get deploy ${app} -n ${namespace} -o json`)
    const { replicas } = JSON.parse(deployment.stdout).spec
    const service = await pExec(`kubectl get svc ${app} -n ${namespace} -o json`)
    const { port, targetPort } = JSON.parse(service.stdout).spec.ports[0]

    const configs: any = { port, targetPort, replicas, isPublic: false }

    // check if app has existing ingress configs
    const { stdout } = await pExec(`kubectl get ing -n ${namespace} -o json`)
    const publicApps = JSON.parse(stdout).items.map(item => item.metadata.name)

    if (publicApps.includes(app)) {
      const ingress = await pExec(`kubectl get ing ${app} -n ${namespace} -o json`)
      const { host } = JSON.parse(ingress.stdout).spec.rules[0]
      configs.host = host
      configs.isPublic = true
    }

    // check if app has existing hpa configs
    const getHPA = await pExec(`kubectl get hpa -n ${namespace} -o json`)
    const autoscalers = JSON.parse(getHPA.stdout).items.map(item => item.metadata.name)
    if (autoscalers.includes(app)) {
      const hpa = await pExec(`kubectl get hpa ${app} -n ${namespace} -o json`)
      const { maxReplicas, minReplicas, targetCPUUtilizationPercentage } = JSON.parse(hpa.stdout).spec
      configs.hpa = {
        maxPods:  maxReplicas,
        minPods: minReplicas,
        targetCPU: targetCPUUtilizationPercentage,
      }
    }

    return configs
  }

  // handles any deployment & autoscaling configs that can be created or updated
  async updateOrCreate({ type, configs }): Promise<DeploymentConfig|HPAConfig|undefined> {
    const { app } = this

    switch (type) {
      case 'deploy': {
        if (configs) {
          const showConfigs = [
            `\n⚙️  Here are the current deployment configurations for ${magenta(app)}:`,
            ` ∙ Application Port: \`${magenta(`${configs.targetPort}`)}\``,
            ` ∙ Service Port: \`${magenta(`${configs.port}`)}\``,
            ` ∙ Replicas: \`${magenta(`${configs.replicas}`)}\``,
            ` ∙ Publicly accessible: \`${magenta(configs.isPublic)}\``,
          ]
          if (configs.isPublic) {
            showConfigs.push(` ∙ Host: \`${magenta(configs.host)}\``)
          }

          await ux.print(showConfigs.join('\n'))
          await ux.print('\nWould you like to proceed with these configurations?')
          const useCurrConfigs: { continue: boolean } = await ux.prompt([continuePrompt])

          if (useCurrConfigs.continue) return configs
        }

        return this.getDeployOptions()
      }

      case 'hpa': {
        if (configs && configs.hpa) {
          const { minPods, maxPods, targetCPU } = configs.hpa
          const showConfigs = [
            `\n⚖️  Here are the current autoscaling configurations for ${magenta(app)}`,
            ` ∙ Minimum # pods: \`${magenta(minPods)}\``,
            ` ∙ Maximum # pods: \`${magenta(maxPods)}\``,
            ` ∙ Target CPU utilization: \`${magenta(targetCPU)}\``,
            '\nWould you like to use these configurations?',
          ]
          await ux.print(showConfigs.join('\n'))
          const useHpaConfigs: { continue: boolean } = await ux.prompt([continuePrompt])

          if (useHpaConfigs.continue) {
            return configs.hpa
          }
          return this.getHPAOptions()
        }

        await ux.print("\nLet's configure horizontal pod autoscaling for your application!")
        await ux.print(`\n❗️ Please make sure you have installed the ${magenta('Metrics Server')} in your cluster! \n If not, please run ${magenta('ops run k8s install')} before continuing`)
        return this.getHPAOptions()
      }
    }
  }

  async onCreated({ settings }) {
    const { namespace, app } = this
    const { isPublic, host } = settings
    const instructions = [
      bold(green('\n🚀  Application successfully deployed!')),
      // `Run the command ${magenta(`kubectl get pods -n ${namespace}`)} to check that your application is running`,
    ]

    if (isPublic) {
      instructions.push(`\n💻 Your application can be found at ${magenta(`http://${host}`)}`)
    }

    await ux.print(instructions.join('\n'))

    track({ event: 'Application successfully deployed!', app })
  }

  async deploy({ settings }) {
    const { namespace, app } = this
    const { replicas, image, targetPort, port, isPublic, host, configureHPA } = settings

    try {
      const deployConfigs = deployment({ namespace, app, replicas, image, containerPort: targetPort })
      const serviceConfigs = service({ namespace, app, port, targetPort })
      const configs: any = [yaml.stringify(deployConfigs), yaml.stringify(serviceConfigs)]

      if (isPublic) {
        const ingressConfigs = ingress({ namespace, app, host, servicePort: port })
        configs.push(yaml.stringify(ingressConfigs))
      }

      if (configureHPA) {
        const hpaConfigs = hpa({ namespace, app, ...settings.hpa })
        configs.push(yaml.stringify(hpaConfigs))
      }

      await ux.print(bold(green('👷🏻‍♀️ Deploying application...')))

      const configFile = 'deploy.yaml'
      const { stdout } = await pExec(`
        echo '${configs.join('\n---\n')}' > ${configFile} \
        && kubectl apply -f ${configFile} -n ${namespace}
      `)

      const output = isSlack() ? ('```' + stdout + '```') : green(stdout)
      await ux.print(output)
      await this.onCreated({ settings })
    } catch (err) {
      await ux.print('Error deploying application')
      track({
        event: 'Error deploying application',
        app,
        namespace,
        error: JSON.stringify(err),
      })
    }
  }
}
