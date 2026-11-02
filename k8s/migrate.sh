#!/usr/bin/env bash
# Called under the deployment lock by deploy.sh/install.sh. Leaves the API stopped
# on failure because MySQL DDL may already have committed; inspect before recovery.
set -euo pipefail
cd "$(dirname "$0")"
TAG=${1:?usage: migrate.sh <image-tag>}
[[ "$TAG" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$ ]] || { echo "Invalid image tag" >&2; exit 1; }
IMAGE="ghcr.io/ushankamesh-devx/ddas-migrations:$TAG"
JOB="db-migrate-$(date +%s)-$$"

kubectl apply -f db-migration-backups.yaml
if [[ -n "$(kubectl -n ddas get deployment api --ignore-not-found -o name)" ]]; then
  kubectl -n ddas scale deployment/api --replicas=0
  kubectl -n ddas wait --for=delete pod -l app=api --timeout=3m
fi
sed -e "s|MIGRATION_JOB|$JOB|g" -e "s|MIGRATION_IMAGE|$IMAGE|g" db-migrate-job.yaml | kubectl create -f -

for ((attempt=0; attempt<460; attempt++)); do
  status=$(kubectl -n ddas get job "$JOB" -o jsonpath='{.status.succeeded},{.status.failed}')
  if [[ "$status" == 1,* ]]; then
    kubectl -n ddas logs "job/$JOB"
    echo "Database migration completed: $JOB"
    exit 0
  fi
  if [[ "$status" == *,[1-9]* ]]; then break; fi
  sleep 2
done
kubectl -n ddas logs "job/$JOB" || true
echo "Migration failed or timed out ($JOB). API remains stopped; inspect the Job and persistent backups before retrying." >&2
exit 1
