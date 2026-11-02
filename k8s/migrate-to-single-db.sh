#!/usr/bin/env bash
# One-time: move from the 3-node InnoDB Cluster to one MySQL server, keeping all data.
# Run on EC2 after pulling the new k8s/ files:  cd ~/k8s && ./migrate-to-single-db.sh
# The old cluster volumes (data-ddas-db-0..2) are kept; delete them once you're happy.
set -euo pipefail
cd "$(dirname "$0")"
BACKUP=~/ddas-backup-$(date +%Y%m%d-%H%M).sql

step() { echo; echo "==> $*"; }

step "Backing up dam_disaster_db from the cluster primary to $BACKUP"
kubectl -n ddas exec ddas-db-0 -c mysql -- bash -c \
  'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers --set-gtid-purged=OFF dam_disaster_db' > "$BACKUP"
grep -q "Dump completed" "$BACKUP" || { echo "Backup looks incomplete, stopping"; exit 1; }
ls -lh "$BACKUP"

step "Removing the cluster, router and setup job (volumes are kept)"
kubectl -n ddas scale deploy/api --replicas=0
kubectl -n ddas delete deploy/ddas-db-router svc/ddas-db-router --ignore-not-found
kubectl -n ddas delete job/db-cluster-setup configmap/db-setup-script --ignore-not-found
kubectl -n ddas delete statefulset/ddas-db --wait
kubectl -n ddas wait --for=delete pod -l app=ddas-db --timeout=3m || true

step "Starting the single MySQL server"
kubectl apply -f db/
kubectl -n ddas rollout status statefulset/ddas-db --timeout=10m

step "Restoring the backup"
kubectl -n ddas exec -i ddas-db-0 -c mysql -- \
  bash -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" dam_disaster_db' < "$BACKUP"

step "Starting the API (ddl-auto=update once to add the new tables from main, then validate)"
kubectl apply -f api.yaml
kubectl -n ddas set env deploy/api SPRING_JPA_HIBERNATE_DDL_AUTO=update
kubectl -n ddas rollout status deploy/api --timeout=8m
kubectl -n ddas set env deploy/api SPRING_JPA_HIBERNATE_DDL_AUTO=validate
kubectl -n ddas rollout status deploy/api --timeout=8m

step "Done"
kubectl -n ddas get pods
curl -fsS http://localhost/api/v1/health && echo
echo "Backup: $BACKUP"
echo "Old cluster volumes (delete when happy): kubectl -n ddas delete pvc data-ddas-db-0 data-ddas-db-1 data-ddas-db-2"
