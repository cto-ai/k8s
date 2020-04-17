import { sdk, ux } from '@cto.ai/sdk'
import { ACTION_ARGS, CLUSTER_TOOLS } from './constants'
import {
  appNamePrompt,
  appNamePromptValidator,
  confirmPrompt,
  imagePrompt,
  hpaPrompt,
  imagePromptValidator,
  isValidYaml,
  cloudProviderPrompt,
  selectToolsPrompt,
  kubeconfigContentPrompt,
  kubeconfigNamePrompt,
  kubeconfigNameRetrievePrompt,
  namespacePrompt,
  rerunPrompt,
  selectNamespace,
  selectResourceType,
  slackKubeconfigPrompt, 
  yamlPrompt,
  slackYamlPrompt,
} from './prompts'
import { HPAConfig, DeploymentConfig } from './types'
import {
  CloudProviderFactory,
  confirmMessage,
  Deployer,
  invalidParam,
  isSlack,
  kubeconfigSetup,
  Manager,
  promptActionSelect,
  Tool,
  showWelcomeMessage,
  track,
  validatePrompt,
  Yaml,
} from './utils'

const { magenta, yellow, bgRed, bold } = ux.colors

async function main() {
  const { cloud } = await ux.prompt([cloudProviderPrompt])
  track({ event: `Selected cloud provider: ${cloud}` })
  const factory = new CloudProviderFactory(cloud)
  const cloudProvider = factory.init()

  await showWelcomeMessage({ action, cloud })

  await cloudProvider.authenticate()

  await action({ cloudProvider, region: null, configSecretKey: null })
}

async function backToMenu({ cloudProvider, region, configSecretKey }) {
  const { rerun } = await ux.prompt(rerunPrompt)
  if (rerun) {
    return action({ cloudProvider, region, configSecretKey })
  }
  return
}

async function action({ cloudProvider, region, configSecretKey }) {
  const cloud = cloudProvider.name
  let action = await promptActionSelect()

  if (!region) {
    region = await cloudProvider.getRegion()
  }


  while (action === 'configure') {
    const { cluster } = await ux.prompt(kubeconfigNamePrompt)
    configSecretKey = `KUBECONFIG_${cluster.toUpperCase()}_${cloud}`
    const kubeconfigPrompt = isSlack() ? slackKubeconfigPrompt : kubeconfigContentPrompt 
    const { kubeconfig } = await ux.prompt(kubeconfigPrompt)
    
    await sdk.setSecret(configSecretKey, kubeconfig)
    await ux.print(`\nCluster config successfully saved as secret ${configSecretKey}!`)
    return backToMenu({ cloudProvider, region, configSecretKey })
  }

  if (!configSecretKey) {
    const { cluster } = await ux.prompt(kubeconfigNameRetrievePrompt)
    const clusterName = cluster.toUpperCase()
    configSecretKey = `KUBECONFIG_${clusterName}_${cloud}`
  }

  const { cluster, kubeconfigPath } = await kubeconfigSetup(cloud, configSecretKey)
  const profile = 'default' // TODO: this is used for AWS and should match what's in the kubeconfig

  switch (action) {
    case 'yaml': {
      await validatePrompt({
        prompt: isSlack() ? slackYamlPrompt : yamlPrompt,
        validate: isValidYaml,
        error: 'Please try again',
      })

      const yaml = new Yaml()
      await yaml.apply()
      return backToMenu({ cloudProvider, region, configSecretKey })
    }

    case 'list': {
      const settings = { cloudProvider, kubeconfigPath, region, cluster, component: 'manager', profile }
      const manager = new Manager({ settings })
      
      const { namespace } = await ux.prompt<{ namespace: string }>(await selectNamespace())
      const { resourceType } = await ux.prompt<{ resourceType: string }>(selectResourceType())

      await manager.listResource(namespace, resourceType)
      return backToMenu({ cloudProvider, region, configSecretKey })
    }

    case 'install': {
      const settings = { cloudProvider, kubeconfigPath, region, cluster, component: 'manager', profile }
      const manager = new Manager({ settings })

      const allTools: string[] = Object.keys(CLUSTER_TOOLS[cloud])
      const availableTools = await Tool.removeInstalled(allTools)

      if (!availableTools.length) {
        await ux.print('\nNo tools to install')
        return backToMenu({ cloudProvider, region, configSecretKey })
      }
      
      const { tools } = await ux.prompt(selectToolsPrompt('install', cloud, availableTools))
      const selectedTools = Object.keys(CLUSTER_TOOLS[cloud])
        .filter(name => tools.includes(CLUSTER_TOOLS[cloud][name]))

      if (!selectedTools.length) {
        await ux.print('\nNo tools to install')
        return backToMenu({ cloudProvider, region, configSecretKey })
      }

      const selections = await confirmMessage({ action, settings: { cluster, region, cloud, selected: selectedTools } })
      await ux.print(selections.join('\n'))
      const { confirm } = await ux.prompt(confirmPrompt('installation'))
      if (!confirm) return backToMenu({ cloudProvider, region, configSecretKey })

      await manager.install(selectedTools, cloud)
      return backToMenu({ cloudProvider, region, configSecretKey })

    }

    case 'uninstall': {
      const settings = { cloudProvider, kubeconfigPath, region, cluster, component: 'manager', profile }
      const manager = new Manager({ settings })

      await ux.print(
        bold(bgRed('\n⚠️  Uninstalling K8s tools is irreversible! Please proceed with caution'))
      )

      const allTools: string[] = Object.keys(CLUSTER_TOOLS[cloud])
      const availableTools = await Tool.removeNotInstalled(allTools)

      if (!availableTools.length) {
        await ux.print('\nNo tools to uninstall')
        return backToMenu({ cloudProvider, region, configSecretKey })
      }

      const { tools } = await ux.prompt(selectToolsPrompt('uninstall', cloud, availableTools))
      const selectedTools = Object.keys(CLUSTER_TOOLS[cloud])
        .filter(name => tools.includes(CLUSTER_TOOLS[cloud][name]))

      if (!selectedTools.length) {
        await ux.print('\nNo tools to uninstall')
        return backToMenu({ cloudProvider, region, configSecretKey })
      }

      const selections = await confirmMessage({ action, settings: { cluster, region, cloud, selected: selectedTools } })
      await ux.print(selections.join('\n'))
      const { confirm } = await ux.prompt(confirmPrompt('deletion'))
      if (!confirm) return backToMenu({ cloudProvider, region, configSecretKey })

      await manager.uninstall(selectedTools, cloud)
      return backToMenu({ cloudProvider, region, configSecretKey })
    }

    case 'deploy': {
      const namespaces = await Deployer.getNamespaces()
      const { namespace } = await ux.prompt(namespacePrompt(namespaces))

      const apps = await Deployer.getApps(namespace)
      if (apps.length) {
        await ux.print(`\n👩🏻‍💻 Here are the existing applications in the ${bold(magenta(namespace))} namespace:`)
        await ux.print(apps.map(app => ` ∙ ${app}`).join('\n'))
      }

      const { appName } = await validatePrompt({
        prompt: appNamePrompt,
        validate: appNamePromptValidator,
        error: `Invalid name; please only include letters, numbers, dashes, or underscores in your answer.`,
      })
      const app = appName.trim()
      const deployer = new Deployer({ namespace, app })

      if (apps.includes(app)) {
        await ux.print(`\n📋 Here are your most recent deployments to ${magenta(app)}`)
        const historyArr = await deployer.getHistory()
        const history = historyArr.map(line => ` ∙ ${line.number}  ${magenta(`${line.image}`)}`)
        await ux.print(history.join('\n'))
      }

      const { image } = await validatePrompt({
        prompt: imagePrompt,
        validate: imagePromptValidator,
        error: 'Please enter a valid image name/URL',
      })

      let configs
      if (apps.includes(app)) {
        configs = await deployer.getConfigs()
      }

      const deploy = await deployer.updateOrCreate({
        type: 'deploy',
        configs,
      }) as DeploymentConfig

      const { configureHPA } = await ux.prompt(hpaPrompt)
      let hpa
      if (configureHPA) {
        hpa = await deployer.updateOrCreate({ type: 'hpa', configs }) as HPAConfig
      }

      const selections = await confirmMessage({ action, settings: { namespace, cluster, region, app, image, ...deploy, configureHPA, hpa } })
      await ux.print(selections.join('\n'))

      const  { confirm } = await ux.prompt(confirmPrompt('deployment'))
      if (!confirm) return

      const settings = {
        image: image.replace(/(http:\/\/)/g, ''), // Slack adds http
        ...deploy,
        configureHPA,
        hpa,
      }
      await deployer.deploy({ settings })
      return backToMenu({ cloudProvider, region, configSecretKey })
    }
    default:
      invalidParam({ name: 'action', param: action, validOptions: ACTION_ARGS })
  }
}

main()
