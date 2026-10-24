# DDAS on k3s

Runs the whole DDAS stack on one EC2 t3.small with k3s:
web (port 80), api, mosquitto (port 1883) and a 3-member MySQL InnoDB Cluster
(1 primary for writes, 2 replicas for reads, automatic failover) behind MySQL Router.

## Files

| File | What it creates |
|---|---|
| `namespace.yaml` | Namespace `ddas` |
| `db/` | 3 MySQL 8.4 pods (StatefulSet), their config and DNS names |
| `db-setup-job.yaml` | One-time Job that joins the 3 pods into a cluster and creates the app DB user |
| `db-router.yaml` | MySQL Router: `:6446` writes → primary, `:6447` reads → replicas |
| `mosquitto.yaml`, `mosquitto/` | MQTT broker with password login |
| `api.yaml` | Spring Boot API |
| `web.yaml` | nginx + React dashboard |
| `install.sh` | First-time install, in the right order |
| `start-demo.sh` | Run after every EC2 start |
| `deploy.sh` | Roll out a new image tag |

## 1. Prepare on your laptop

**Secrets** – copy `secrets.env.example` to `secrets.env` and change every value.

**MQTT password file** (one user for the API, one for ESP32 devices), from the `k8s` folder:

```bash
docker run --rm -v "${PWD}:/w" eclipse-mosquitto:2.0 mosquitto_passwd -c -b /w/passwd ddas-api <same as MQTT_PASSWORD>
docker run --rm -v "${PWD}:/w" eclipse-mosquitto:2.0 mosquitto_passwd -b /w/passwd ddas-device <device password>
```

**Demo database dump**, from the `api` folder (dumping inside the container avoids Windows encoding problems):

```bash
docker compose up -d mysql
python scripts/setup_demo.py --database-only
docker compose exec mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --databases dam_disaster_db --single-transaction --routines --triggers --set-gtid-purged=OFF > /tmp/ddas-dump.sql'
docker compose cp mysql:/tmp/ddas-dump.sql ../k8s/ddas-dump.sql
```

**Images** – push to `main`; GitHub Actions builds `ghcr.io/ushankamesh-devx/ddas-api` and `ddas-web`.
Make both packages public (GitHub → Packages → Package settings), or create the `ghcr-pull` secret on the server.

## 2. Install on the EC2 instance

Upload the `k8s` folder to the home folder with MobaXterm's file sidebar (it includes `secrets.env`, `passwd`, `ddas-dump.sql`), then:

```bash
cd ~/k8s
chmod +x *.sh
./install.sh secrets.env passwd ddas-dump.sql
rm secrets.env          # the values now live in the Kubernetes Secret
```

Open `http://<EC2 public IP>`.

## Daily use

```bash
kubectl -n ddas get pods                      # everything should be Running
kubectl -n ddas logs -f deploy/api            # API logs
~/k8s/start-demo.sh                           # after starting the EC2 instance
~/k8s/deploy.sh <git-sha>                     # deploy a new build
```

Cluster status (1 PRIMARY + 2 SECONDARY, all ONLINE):

```bash
kubectl -n ddas exec -it ddas-db-0 -- mysqlsh --js clusteradmin@localhost -e "print(dba.getCluster().status())"
```

Failover test: `kubectl -n ddas delete pod ddas-db-0` – a replica becomes primary in seconds, the app keeps working.
