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

step "Importing demo data through the primary"
ROOT_PW=$(kubectl -n ddas get secret ddas-secrets -o jsonpath='{.data.MYSQL_ROOT_PASSWORD}' | base64 -d)
kubectl -n ddas run sql-import --rm -i --restart=Never --image=mysql:8.4 --env="MYSQL_PWD=$ROOT_PW" -- \
  mysql -h ddas-db-router -P 6446 -uroot < "$DUMP"

step "MQTT broker, API, web"
kubectl apply -f mosquitto.yaml -f api.yaml -f web.yaml
kubectl -n ddas rollout status deploy/api --timeout=8m
kubectl -n ddas rollout status deploy/web --timeout=3m

step "Done"
kubectl -n ddas get pods -o wide
curl -fsS http://localhost/api/v1/health && echo
