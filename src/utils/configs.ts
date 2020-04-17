export const deployment = ({ namespace, app, replicas, image, containerPort }) => {
  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      labels: { app },
      name: app,
      namespace,
      annotations: {
        'kubernetes.io/change-cause': image,
      }
    },
    spec: {
      replicas,
      revisionHistoryLimit: 3,
      selector: {
        matchLabels: { app },
      },
      strategy: {
        type: 'RollingUpdate',
        rollingUpdate: {
          maxUnavailable: '25%',
          maxSurge: 1,
        }
      },
      template: {
        metadata: {
          labels: { app },
        },
        spec: {
          containers: [
            {
              name: app,
              image,
              imagePullPolicy: 'Always',
              ports: [
                { containerPort },
              ],
              resources: {
                requests: {
                  memory: '1024Mi',
                  cpu: '300m',
                },
                limits: {
                  memory: '1536Mi',
                  cpu: '500m',
                }
              }
            }
          ]
        }
      }
    }
  }
}


export const service = ({ namespace, app, port, targetPort }) => {
  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      labels: { app },
      name: app,
      namespace,
    },
    spec: {
      ports: [
        {
          name: 'http',
          port,
          targetPort,
          protocol: 'TCP',
        }
      ],
      selector: { app },
    }
  }
}

export const ingress = ({ namespace, app, host, servicePort }) => {
  return {
    apiVersion: 'extensions/v1beta1',
    kind: 'Ingress',
    metadata: {
      name: app,
      namespace,
      annotations: {
        'kubernetes.io/ingress.class': 'nginx',
      },
    },
    spec: {
      rules: [
        {
          host,
          http: {
            paths: [
              {
                backend: {
                  serviceName: app,
                  servicePort,
                },
              }
            ]
          },
        },
      ]
    }
  }
}

export const hpa = ({ namespace, app, maxPods, minPods, targetCPU }) => {
  return {
    apiVersion: 'autoscaling/v1',
    kind: 'HorizontalPodAutoscaler',
    metadata: {
      name: app,
      namespace,
    },
    spec: {
      maxReplicas: maxPods,
      minReplicas: minPods,
      scaleTargetRef: {
        apiVersion: 'apps/v1beta1',
        kind: 'Deployment',
        name: app,
      },
      targetCPUUtilizationPercentage: targetCPU,
    },
  }
}
