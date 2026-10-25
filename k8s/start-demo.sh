#!/usr/bin/env bash
# Run after every EC2 start (demo day). When the whole machine stops, all 3 MySQL
# members stop together and the cluster must be restarted from the most up-to-date one.
set -euo pipefail

echo "==> Waiting for Kubernetes and MySQL pods"
kubectl wait --for=condition=Ready node --all --timeout=5m
kubectl -n ddas wait --for=condition=Ready pod -l app=ddas-db --timeout=10m

echo "==> Checking the MySQL cluster"
CA_PW=$(kubectl -n ddas get secret ddas-secrets -o jsonpath='{.data.CLUSTER_ADMIN_PASSWORD}' | base64 -d)
echo "$CA_PW" | kubectl -n ddas exec -i ddas-db-0 -- \
  mysqlsh --no-wizard --passwords-from-stdin --js clusteradmin@localhost:3306 -e "
    try { dba.getCluster(); print('Cluster is running\n'); }
    catch (e) { print('Restarting cluster after full outage...\n'); dba.rebootClusterFromCompleteOutage(); }"

echo "==> Restarting router and API"
kubectl -n ddas rollout restart deploy/ddas-db-router deploy/api
kubectl -n ddas rollout status deploy/ddas-db-router --timeout=5m
kubectl -n ddas rollout status deploy/api --timeout=8m

kubectl -n ddas get pods
curl -fsS http://localhost/api/v1/health >/dev/null && echo "DDAS is up: http://$(curl -s ifconfig.me)"
