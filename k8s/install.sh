#!/usr/bin/env bash
# First-time install of DDAS on the k3s node (run on the EC2 instance).
# Usage:  cd ~/k8s && ./install.sh ~/secrets.env ~/passwd ~/ddas-dump.sql
set -euo pipefail
cd "$(dirname "$0")"

SECRETS=${1:?usage: ./install.sh <secrets.env> <passwd> <ddas-dump.sql>}
PASSWD=${2:?usage: ./install.sh <secrets.env> <passwd> <ddas-dump.sql>}
DUMP=${3:?usage: ./install.sh <secrets.env> <passwd> <ddas-dump.sql>}

step() { echo; echo "==> $*"; }

step "Namespace, secrets, MQTT config"
kubectl apply -f namespace.yaml
kubectl -n ddas create secret generic ddas-secrets --from-env-file="$SECRETS" \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl -n ddas create configmap mosquitto-config \
  --from-file=mosquitto.conf=mosquitto/mosquitto.conf --from-file=passwd="$PASSWD" \
  --dry-run=client -o yaml | kubectl apply -f -

step "MySQL"
kubectl apply -f db/
kubectl -n ddas rollout status statefulset/ddas-db --timeout=10m

step "Importing demo data"
kubectl -n ddas exec -i ddas-db-0 -c mysql -- \
  bash -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" dam_disaster_db' < "$DUMP"

step "MQTT broker, API, web"
kubectl apply -f mosquitto.yaml -f api.yaml -f web.yaml
kubectl -n ddas rollout status deploy/api --timeout=8m
kubectl -n ddas rollout status deploy/web --timeout=3m

step "Done"
kubectl -n ddas get pods -o wide
curl -fsS http://localhost/api/v1/health && echo
