import fs from 'fs'
import YAML from 'yaml'
import immutableObj from 'object-path-immutable'
import { ux, sdk } from '@cto.ai/sdk'
import { pExec, track } from '.'
import { KUBECONFIG_DIR } from '../constants'
import { selectCluster, kubeconfigNamePrompt } from '../prompts'

const { green, magenta } = ux.colors

const saveKubeconfigToDisk = async (content: string, cloud: string) => {
  const path = `${KUBECONFIG_DIR}/config`
  const updatedContentObj: object = await updateKubeconfig(content, cloud)
  const kubeconfigContent = YAML.stringify(updatedContentObj)
  fs.writeFileSync(path, kubeconfigContent)
  track({ event: `kubeconfig file created`, kubeconfigContent})
  return path
}

const updateKubeconfig = async (content: string, cloud: string): Promise<object> => {
  let config = YAML.parse(content)
  try {
    //Ensure the server URL is not mangled by Slack (remove < and >)
    const serverUrl = immutableObj.get(config, 'clusters.0.cluster.server').replace(/<|>/g,'')
    config = immutableObj.set(config, 'clusters.0.cluster.server', serverUrl)

    // Ensure AWS_PROFILE is set to 'default'
    if (cloud === 'AWS') {
      config = immutableObj.set(config, 'users.0.user.exec.env.0.value', 'default')
    }

    // Ensure gcloud path is set to the installation folder from Dockerfile
    if (cloud === 'GCP') {
      config = immutableObj.set(config, 'users.0.user.auth-provider.config.cmd-path', '/usr/local/bin/google-cloud-sdk/bin/gcloud')
    }
  } catch (error) {
    track({ event: `Error trying to update Kubeconfig`, content, cloud, error: JSON.stringify(error) })
    return config
  }
  return config

}

const setKubeconfig = async (cloud: string, configSecretKey: string) => {
  const result = await sdk.getSecret(configSecretKey)
  const kubeconfigPath = await saveKubeconfigToDisk(result[configSecretKey], cloud)

  /**
   * Set context based on selected kubeconfig file
   * If the file has multiple contexts, ask the user to select the correct one
   */
  let cluster
  try {
    const { stdout } = await pExec(`kubectl config view --kubeconfig=${kubeconfigPath} -o json`)
    const { contexts } = JSON.parse(stdout)
    cluster = contexts[0].name

    if (contexts.length > 1) {
      const clusters = contexts.map(context => context.name)
      const clusterPrompt: { cluster: string } = await ux.prompt([selectCluster(clusters)])
      cluster = clusterPrompt.cluster
    }
  } catch (err) {
    ux.print("Please check if selected kubeconfig file has correct format")
    return setKubeconfig(cloud, "")
  }

  return { cluster, kubeconfigPath }
}

export const kubeconfigSetup = async (cloud: string, configSecretKey: string) => {
  const { cluster, kubeconfigPath } = await setKubeconfig(cloud, configSecretKey)

  /*
    In slack, there is weird behavior where "deploy from YAML" errors out when namespace field is not present in yaml. Setting namespace to default in context solves it
  */
  await pExec(`kubectl config set-context ${cluster} --namespace=default && kubectl config use-context ${cluster} --kubeconfig=${kubeconfigPath}`)

  return { cluster, kubeconfigPath }
}
