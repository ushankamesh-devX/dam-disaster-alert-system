#!/usr/bin/env bash
# Deploy a new build. Usage (on EC2):  ~/k8s/deploy.sh <git-sha>
set -euo pipefail
TAG=${1:?usage: deploy.sh <git-sha>}
REG=ghcr.io/ushankamesh-devx

kubectl -n ddas set image deploy/api api=$REG/ddas-api:$TAG
kubectl -n ddas set image deploy/web web=$REG/ddas-web:$TAG
kubectl -n ddas rollout status deploy/api --timeout=8m
kubectl -n ddas rollout status deploy/web --timeout=3m
