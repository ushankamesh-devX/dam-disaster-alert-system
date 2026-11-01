#!/usr/bin/env bash
# Deploy a new build. Usage (on EC2):  ~/k8s/deploy.sh <git-sha>
set -euo pipefail
cd "$(dirname "$0")"
exec 9>/tmp/ddas-deploy.lock
flock -n 9 || { echo "Another DDAS deployment is running" >&2; exit 1; }
TAG=${1:?usage: deploy.sh <git-sha>}
REG=ghcr.io/ushankamesh-devx

REPLICAS=$(kubectl -n ddas get deployment api -o jsonpath='{.spec.replicas}')
# A retry after a failed migration must restart the previously stopped API.
if [[ "$REPLICAS" == 0 ]]; then REPLICAS=1; fi
bash migrate.sh "$TAG"
kubectl -n ddas set image deploy/api api=$REG/ddas-api:$TAG
kubectl -n ddas scale deployment/api --replicas="$REPLICAS"
kubectl -n ddas rollout status deploy/api --timeout=8m
kubectl -n ddas set image deploy/web web=$REG/ddas-web:$TAG
kubectl -n ddas rollout status deploy/web --timeout=3m
