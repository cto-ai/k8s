export const CLOUD_PROVIDERS = ['AWS', 'GCP']

export const OP_ACTIONS = {
  'Configure cluster [START HERE]': 'configure',
  'List resources': 'list',
  'Deploy an application': 'deploy',
  'Install K8s tools': 'install',
  'Uninstall K8s tools': 'uninstall',
  'Create resources from YAML': 'yaml',
}

export const RESOURCES_TYPES = [
  'pods',
  'deployments'
]

export const ACTION_ARGS = Object.values(OP_ACTIONS)

export const KUBECONFIG_DIR = `/ops/.kube`
export const YAML_PATH = '/ops/k8s-manager.yaml'

export const CLUSTER_TOOLS = {
  GCP: {
    'nginx-ingress': 'NGINX Ingress Controller',
    'prometheus': 'Prometheus Monitoring System',
    'grafana': 'Grafana Monitoring Dashboard',
  },
  AWS: {
    'kubernetes-dashboard': 'Kubernetes Dashboard',
    'metrics-server': 'Metrics Server',
    'nginx-ingress': 'NGINX Ingress Controller',
    'prometheus': 'Prometheus Monitoring System',
    'grafana': 'Grafana Monitoring Dashboard',
  },
}
