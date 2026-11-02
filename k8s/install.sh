#!/usr/bin/env bash
# First-time install of DDAS on the k3s node (run on the EC2 instance).
# Usage: cd ~/k8s && bash install.sh ~/secrets.env ~/passwd [dump.sql|-] [image-tag]
set -euo pipefail
cd "$(dirname "$0")"
exec 9>/tmp/ddas-deploy.lock
flock -n 9 || { echo "Another DDAS deployment is running" >&2; exit 1; }

SECRETS=${1:?usage: ./install.sh <secrets.env> <passwd> <ddas-dump.sql>}
PASSWD=${2:?usage: ./install.sh <secrets.env> <passwd> <ddas-dump.sql>}
DUMP=${3:--}
TAG=${4:-latest}
[[ "$TAG" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$ ]] || { echo "Invalid image tag" >&2; exit 1; }

step() { echo; echo "==> $*"; }

step "Namespace, secrets, MQTT config"
kubectl apply -f namespace.yaml
kubectl -n ddas create secret generic ddas-secrets --from-env-file="$SECRETS" \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl -n ddas create configmap mosquitto-config \
  --from-file=mosquitto.conf=mosquitto/mosquitto.conf --from-file=passwd="$PASSWD" \
  --dry-run=client -o yaml | kubectl apply -f -

step "MySQL: starting 3 servers"
kubectl apply -f db/
kubectl -n ddas rollout status statefulset/ddas-db --timeout=15m

step "MySQL: creating the cluster (5-10 min)"
kubectl apply -f db-setup-job.yaml
kubectl -n ddas wait --for=condition=complete job/db-cluster-setup --timeout=20m
kubectl -n ddas logs job/db-cluster-setup | tail -n 40

step "MySQL Router"
kubectl apply -f db-router.yaml
kubectl -n ddas rollout status deploy/ddas-db-router --timeout=10m

if [[ "$DUMP" != - ]]; then
step "Importing supplied data through the primary"
ROOT_PW=$(kubectl -n ddas get secret ddas-secrets -o jsonpath='{.data.MYSQL_ROOT_PASSWORD}' | base64 -d)
kubectl -n ddas run sql-import --rm -i --restart=Never --image=mysql:8.4 --env="MYSQL_PWD=$ROOT_PW" -- \
  mysql -h ddas-db-router -P 6446 -uroot < "$DUMP"
fi

step "Migrating schema and initializing roles"
bash migrate.sh "$TAG"

step "MQTT broker, API, web"
kubectl apply -f mosquitto.yaml
sed "s|ddas-api:latest|ddas-api:$TAG|g" api.yaml | kubectl apply -f -
sed "s|ddas-web:latest|ddas-web:$TAG|g" web.yaml | kubectl apply -f -
kubectl -n ddas rollout status deploy/api --timeout=8m
kubectl -n ddas rollout status deploy/web --timeout=3m

step "Done"
kubectl -n ddas get pods -o wide
curl -fsS http://localhost/api/v1/health && echo
