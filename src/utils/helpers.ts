import { sdk, ux } from '@cto.ai/sdk'
import { exec } from 'child_process'
import { promisify } from 'util'
import { track } from '.'
import { PodInfo, DeploymentInfo, Containers } from '../types'

const { red, bold, magenta } = ux.colors

// pExec executes commands in the shell https://stackoverflow.com/questions/20643470/execute-a-command-line-binary-with-node-js
export const pExec = promisify(exec)

export const isSlack = () => {
  return sdk.getInterfaceType() === 'slack'
}

export const invalidParam = async ({ name, param, validOptions }) => {
  await ux.print(
    `\n${red(
      `'${param}' is an invalid ${name} name! The valid options are: ${validOptions.join(
        ', ',
      )}`,
    )}`,
  )

  await track({ event: `invalid ${name} param ${param}` })
}

export const validatePrompt = async ({
  prompt,
  error,
  validate,
  validateOptions = {},
}) => {
  let input: any = await ux.prompt(prompt)
  const value = Object.values(input)[0]
  const isInputValid = await validate({ value, ...validateOptions })

  if (!isInputValid) {
    await ux.print(red(error))
    input = await validatePrompt({ prompt, error, validate, validateOptions })
  }

  return input
}

export const pExecWithLogs = async (command: string, options = null) => {
  sdk.log(bold(`Running ${magenta(command)}`))

  const { stdout, stderr } = await pExec(command, options)
  if (stdout) sdk.log(stdout)
  if (stderr) sdk.log(stderr)

  return { stdout, stderr }
}

export const formatPodsInfo = async (items): Promise<PodInfo[]> => {
  if (items.length < 1) {
    await ux.print(`No pods available under the namespace`)
    return []
  }
  return items.map(item => {
    const {
      metadata: { name, namespace, creationTimestamp },
      spec: { containers, nodeName },
      status: { phase, podIP },
    } = item

    return {
      name,
      namespace,
      status: phase,
      age: getAge(creationTimestamp),
      containers: getContainers(containers),
      node: nodeName,
      podIP,
      ready: `${getReadyContainersCount(item.status)}/${containers.length}`
    }
  })
}

export const formatDeploymentsInfo = async (items): Promise<DeploymentInfo[]> => {
  if (items.length < 1 ) {
    await ux.print(`No deployments available under the namespace`)
    return []
  }
  return items.map(item => {
    const {
      metadata: { name, namespace, creationTimestamp },
      spec: { selector: { matchLabels }, template: { spec: { containers } }, replicas },
      status: { availableReplicas, unavailableReplicas }
    } = item

    return {
      name,
      namespace,
      age: getAge(creationTimestamp),
      containers: getContainers(containers),
      selector: getLabels(matchLabels),
      ready: `${availableReplicas ? availableReplicas : replicas - unavailableReplicas}/${replicas}`
    }
  })
}

const getReadyContainersCount = (status): number => {
  const PENDING = 'pending'
  const RUNNING = 'running'
  const STATUS = 'status'
  const READY = 'ready'

  if (status.phase.toLowerCase() === PENDING && !status.containerStatuses) {
    let count = 0
    const containerStatuses = status.conditions
    if (containerStatuses.length < 1) {
      return count
    }
    for (let i = 0; i < containerStatuses.length; i++) {
      if (containerStatuses[i][STATUS] === 'True') {
        count++
      }
    }
    return count
  }
  if (status.phase.toLowerCase() === RUNNING || status.containerStatuses) {
    let count = 0
    const containerStatuses = status.containerStatuses
    if (containerStatuses.length < 1) {
      return count
    }
    for (let i = 0; i < containerStatuses.length; i++) {
      if (containerStatuses[i][READY]) {
        count++
      }
    }
    return count
  }
  return 0
}

const getContainers = (containerList): Containers => {
  const containers: Containers = {}
  for (let i = 0; i < containerList.length; i++) {
    containers[containerList[i].name] = containerList[i].image    
  }  
  return containers
}

const getAge = (birthdate: Date): string => {
  const DAY_MILLISECONDS = 1000 * 60 * 60 * 24
  const DAY_HOURS = 24
  const today = +new Date()
  const created = +new Date(birthdate)
  const diffTime = Math.abs(today - created)
  const diffDays = diffTime / DAY_MILLISECONDS
  const diffDaysFloor = Math.floor(diffDays)
  const diffHoursFloor = Math.floor((diffDays - diffDaysFloor) * DAY_HOURS)
  const age = diffHoursFloor ? `${diffDaysFloor}d${diffHoursFloor}h` : `${diffDaysFloor}d`
  return age
}

const getLabels = (selector: Object): string[] => {
  const labels: string[] = []
  for (const key in selector) {
    labels.push(`${key}=${selector[key]}`)
  }
  return labels
}

export const displayResources = async (resources: PodInfo[] | DeploymentInfo[], type: string): Promise<void> => {
  if (resources.length < 1) {
    return
  }

  if (isSlack()) {
    const formattedResources = getFormattedResources(resources)
    for (let i = 0; i < formattedResources.length; i++) {
      if (formattedResources[i]) {
        await ux.print(`${formattedResources[i]}`)
      }
    }
    return
  }

  await getResourcesTable(resources, type)
  return
}

const getResourcesTable = async (resources, type: string) => {
  const commonColumns = {
    name: {
      minWidth: 30,
      header: 'NAME' 
    },
    namespace: {
      header: 'NAMESPACE',
      minWidth: 15,
    },
    age: {
      header: 'AGE',
      minWidth: 10
    },
    containers: {
      header: 'CONTAINERS',
      minWidth: 80,
      get: row => {
        const { containers } = row
        return Object.keys(containers)
          .map(name => `${name} (${containers[name]})`)
          .join(', ')
      }
    },
    ready: {
      header: 'READY',
      minWidth: 5
    }
  }

  const podsColumns = {
    status: {
      header: 'STATUS',
      minWidth: 10
    },
    podIP: {
      header: 'IP',
      minWidth: 15
    },
    node: {
      header: 'NODE',
      minWidth: 20,
      get: row => row.node ? row.node : '-'
    },
  }
  const deploymentsColumns = {
    selector: {
      header: 'SELECTOR',
      minWidth: 40,
      get: row => {
        const { selector } = row
        if (selector) return selector.join(', ')
      }
    }
  }

  const columns = {
    ...commonColumns,
    ...((type === 'pods') ? podsColumns : deploymentsColumns)
  }

  await ux.table(resources, columns)
  return
}

const getFormattedResources = (resources): string => {
  const CONTAINERS = 'containers'
  return resources.map(item => {
    let itemInfo = ``
    for (const key in item) {
      if (key === CONTAINERS) {
        const containerList = Object.keys(item[CONTAINERS])
          .map(name => `\`${name} (${item[CONTAINERS][name]})\``)
          .join(', ')
        itemInfo += `${key}: ${containerList}\n`
      } else {
        itemInfo += `${key}: \`${item[key]}\`\n`
      }
    }
    itemInfo += `⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽`
    return itemInfo
  })
}
