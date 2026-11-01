# Database setup and upgrades

Each release publishes `ddas-api`, `ddas-web` and `ddas-migrations` images with
the same commit tag. Deploy the release from the EC2 host using:

```bash
bash ~/k8s/deploy.sh <git-sha>
```

The deployment creates the backup PVC if necessary, stops API pods, and runs a
single migration Job against the router's primary port (6446). That Job uses the
existing `DB_APP_USER` / `DB_APP_PASSWORD` secret entries, creates missing tables,
applies the versioned contract, initializes missing roles/permissions and checks
the resulting schema. Only then does deployment start the new API and web images.
The API still uses Hibernate `validate`.

The host needs Bash, `flock`, `sed` and `kubectl`. The namespace needs a default
StorageClass (k3s normally provides local-path) for the 5 GiB backup PVC. Private
GHCR packages require the existing `ghcr-pull` secret to cover the migration image
as well as API/web. The GitHub deployment workflow copies the new scripts before
calling them; manual deployments must copy this entire `k8s/` folder first.

## Fresh installation

After publishing the images, run:

```bash
cd ~/k8s
bash install.sh ~/secrets.env ~/passwd - <git-sha>
```

The third argument `-` skips dump import. Schema and initial roles are now created
by the migration Job. To import an existing database first, replace `-` with its
SQL dump path. The imported schema is migrated before API startup. Use a dump
that selects the application database, as in the existing installation flow.

`db-cluster-setup` creates both `dam_disaster_db` and `mlflow_db` and grants the
application account access. This is a one-time cluster provisioning Job; changing
its ConfigMap does not rerun an already-completed Job. Existing clusters that need
MLflow provisioning must rerun that Job after reviewing its configuration. The
current Kubernetes manifests do not deploy an MLflow server.

## Failures and backups

If migration fails, deployment exits without replacing images. The API remains
stopped to prevent writes against partially applied MySQL DDL. Inspect:

```bash
kubectl -n ddas get jobs
kubectl -n ddas logs job/<db-migrate-job-name>
kubectl -n ddas describe job/<db-migrate-job-name>
```

Resolve the reported incompatible data, missing image, permissions or storage
issue, then rerun the same release deployment. Applied migration checksums remain
enforced. Successful retries restore the API (at least one replica).

Before schema changes, dumps are saved under `/backups/dam_disaster_db/` on the
`db-migration-backups` PVC. Jobs expire after seven days; deleting a Job does not
delete the PVC. Maintain free space and copy backups off-node: k3s local-path
storage does not protect against node loss. Do not delete the PVC as a retry step.

These scripts have offline failure-path tests and a separate disposable Docker
verification harness. A live Kubernetes rollout must still be verified on the
target cluster; local MySQL checks do not exercise scheduling or storage classes.
