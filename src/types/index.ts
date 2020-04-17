import { Question } from '@cto.ai/sdk'

// expected output of `aws sts get-caller-identity`
export type AWSUser = {
  UserId: string
  Account: string
  Arn: string
}

export type TrackingData = {
  event: string
  error?: string
  [key: string]: any
}

export type ClusterSettings = {
  profile: string
  region: string
  kubeconfigPath: string
  component: string
  cluster: string
  cloudProvider: any
}

// has two typescript errors
// export type DeployerSettings extends ClusterSettings, DeployConfig = {}

export type DeployerSettings = {
  profile: string
  region: string
  kubeconfigPath: string
  component: string
  cluster: string
  port: number
  targetPort: number
  replicas: number
  isPublic: boolean
  host?: string
  configureHPA?: boolean
  hpa?: HPAConfig|any
  appName: string
  image: string
  cloudProvider: any
}

export type HPAConfig = {
  maxPods: number
  minPods: number
  targetCPU: number
}

export type DeployPromptsObj = {
  targetPort: Question
  port: Question
  replicas: Question
  isPublic: Question
  hostURL: Question
}

export type DeploymentConfig = {
  targetPort: number
  port: number
  replicas: number
  host?: string
  isPublic?: boolean
}

export type HPAPromptsObj = {
  minPods: Question
  maxPods: Question
  targetCPU: Question
}

export type AWSQuestionsPromptsObject = {
  accountNumber: Question
  accessKeyId: Question
  accessKeySecret: Question
}

export type GCPConfig = {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_url: string
  token_url: string
  auth_provider_x509_cert_url: string
  client_x509_cert_url: string
}

type PortInfo = {
  name: string
  containerPort: number
  protocol: string
}

type ContainerInfo = {
  image: string
  name: string
  ports: PortInfo[]
  resources: {
    limits: {
      cpu: string
      memory: string
    },
    requests: {
      cpu: string
      memory: string
    }
  }
}

export type PodInfo = {
  name: string
  namespace: string
  status: string
  age: string
  containers: Containers
  nodeName: string
  podIP: string
  readyContainersCount: string
  totalContainersCount: string
}

export type DeploymentInfo = {
  name: string
  namespace: string
  age: string
  containers: Containers
  selector: string[]
  replicas: number
  availableReplicas: number
}

export type Containers = {
  [containerName: string]: Image
}

type Image = string