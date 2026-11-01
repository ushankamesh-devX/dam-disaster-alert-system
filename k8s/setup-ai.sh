#!/usr/bin/env bash
# One-time: add the AI stack (MinIO, Qdrant, MLflow, AI service).
# Usage (on EC2):  cd ~/k8s && ./setup-ai.sh <secrets.env>
# secrets.env must have the AI keys from secrets.env.example.
set -euo pipefail
cd "$(dirname "$0")"
SECRETS=${1:?usage: ./setup-ai.sh <secrets.env>}

step() { echo; echo "==> $*"; }

for k in DDAS_AI_INCOMING_SERVICE_TOKEN DDAS_AI_SPRING_SERVICE_TOKEN MINIO_ROOT_USER MINIO_ROOT_PASSWORD; do
  grep -q "^$k=." "$SECRETS" || { echo "Missing $k in $SECRETS"; exit 1; }
done

step "Updating secrets"
kubectl -n ddas create secret generic ddas-secrets --from-env-file="$SECRETS" \
  --dry-run=client -o yaml | kubectl apply -f -

step "Creating mlflow_db for the app user"
kubectl -n ddas exec ddas-db-0 -c mysql -- bash -c \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS mlflow_db; GRANT ALL PRIVILEGES ON mlflow_db.* TO \`$MYSQL_USER\`@\`%\`;"'

step "MinIO and Qdrant"
kubectl apply -f minio.yaml -f qdrant.yaml
kubectl -n ddas rollout status statefulset/minio --timeout=5m
kubectl -n ddas rollout status statefulset/qdrant --timeout=5m

step "MLflow and AI service"
kubectl apply -f mlflow.yaml -f ai.yaml
kubectl -n ddas rollout status deploy/mlflow --timeout=8m
kubectl -n ddas rollout status deploy/ai --timeout=8m

step "API (picks up the AI tokens)"
kubectl apply -f api.yaml
kubectl -n ddas rollout status deploy/api --timeout=8m

step "Done"
kubectl -n ddas get pods
