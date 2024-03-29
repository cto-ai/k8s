############################
# Download container
############################
FROM node:10-alpine AS downloader

# helm, kubectl, AWS CLI, & AWS IAM authenticator
ENV HELM_VERSION=v3.1.1
ENV K8S_VERSION=v1.14.10
ENV AIA_VERSION=0.4.0

WORKDIR /downloads

RUN apk add --update --no-cache ca-certificates \
  && wget https://storage.googleapis.com/kubernetes-release/release/${K8S_VERSION}/bin/linux/amd64/kubectl \
  && chmod +x ./kubectl \
  && wget https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/download/v${AIA_VERSION}/aws-iam-authenticator_${AIA_VERSION}_linux_amd64 -O aws-iam-authenticator \
  && chmod +x ./aws-iam-authenticator \
  && wget https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz \
  && tar xzf helm-${HELM_VERSION}-linux-amd64.tar.gz \
  && mv linux-amd64/helm ./helm \
  && chmod +x ./helm

############################
# Build container
############################
FROM node:12-alpine AS dep

WORKDIR /ops

ADD package.json .
RUN npm install --production && npm prune --production && npx modclean -release && rm modclean*.log

ADD . .
#dockerignore sometimes still lets .git in
RUN rm -rf .git tests

############################
# Final container
############################
FROM registry.cto.ai/official_images/node:2-12.13.1-stretch-slim

ENV CLOUD_SDK_VERSION=274.0.1
ENV AWS_CLI_VERSION=1.18.52
ENV PATH /usr/local/bin/google-cloud-sdk/bin:$PATH

RUN apt-get update \
        && apt-get install -y --no-install-recommends curl python-pip python-setuptools python-wheel \
        && pip install --no-cache-dir awscli==${AWS_CLI_VERSION} \
        && apt-get purge python-pip python-setuptools python-wheel -y \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists

RUN curl -Os https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-${CLOUD_SDK_VERSION}-linux-x86_64.tar.gz \
    && tar xzf google-cloud-sdk-${CLOUD_SDK_VERSION}-linux-x86_64.tar.gz \
    && rm google-cloud-sdk-${CLOUD_SDK_VERSION}-linux-x86_64.tar.gz \
    && mv google-cloud-sdk/ /usr/local/bin \
    && gcloud components install beta --verbosity="error" \
    && cd /usr/local/bin/google-cloud-sdk/bin \
    && gcloud config set core/disable_usage_reporting true \
    && gcloud config set component_manager/disable_update_check true \
    && rm -rf /usr/local/bin/google-cloud-sdk/.install

COPY --from=downloader /downloads/ /usr/bin/

ENV AWS_CONFIG_FILE="/ops/.aws/config" AWS_SHARED_CREDENTIALS_FILE="/ops/.aws/credentials" GOOGLE_APPLICATION_CREDENTIALS="/ops/gcp.json"

WORKDIR /ops

RUN mkdir -p /ops/.kube \
    && touch /ops/.kube/config

ENV KUBECONFIG="/ops/.kube/config"

COPY --from=dep /ops .

RUN chown -R 9999 /ops && chgrp -R 9999 /ops

USER 9999:9999
