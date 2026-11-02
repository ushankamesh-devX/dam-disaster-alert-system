# Three-dam cascade demo

Kotmale → Victoria → Randenigala on the Mahaweli. Data only: no table, column or
migration is added or changed.

| Dam | Record | Geography |
|---|---|---|
| Kotmale | `DEMO-001` | OpenStreetMap dam, reservoir and Kotmale Oya (`fixtures/mahaweli-cascade-geography.json`) |
| Victoria | `DEMO-002` | Unchanged (`fixtures/victoria-geography.json`) |
| Randenigala | `DEMO-003` | OpenStreetMap dam, reservoir and Mahaweli downstream |

The other seven demo dams become `decommissioned` (not deleted) and are hidden from
dam lists. Their alerts, reports, SOS events and news move to the three dams.
Hazard corridors, equipment, shelters, people, alerts and telemetry are fictional demo data.

## 1. Seed (once, after `seed_demo.py`)

```bash
python3 api/scripts/seed_cascade_demo.py            # ~1 minute
python3 api/scripts/seed_cascade_demo.py --skip-telemetry   # records only
```

Each dam gets 8 sensors: the original six plus two downstream river gauges
(`RIVER_LEVEL`, 2 km and 8 km). One year of hourly readings (about 200k) comes
from `cascade_model.py`: monsoon seasons, storms, inflow, spill gates and the
cascade between dams. Original rows are backed up to `api/local-data/<db>/cascade/`.
Re-running is safe; only missing hours are added.

On the k3s server add `--kubectl` (uses pod `ddas-db-0`).

## 2. Always-on feed (`ddas_feeder.py`)

k3s: see the header of `k8s/ddas-feeder.yaml`. Docker Compose: the `ddas-feeder` service.

Sends a reading from every sensor each minute through the device API (saved as
15-minute means), using keys it creates with `DDAS_ADMIN_EMAIL` / `DDAS_ADMIN_PASSWORD`.
No flood scenarios: values continue the seeded history with seasons, 3–7 day weather
spells, afternoon showers, 6-hour generation shifts and the cascade between dams.

## 3. Two-minute demo storm (`ddas_demo.py`)

```bash
kubectl -n ddas exec deploy/ddas-feeder -- python3 /app/scripts/ddas_demo.py flood --dam victoria
```

Pauses the feeder for that dam and the next one downstream, saves readings every
10 s, plays the storm (`flood` or `heavy-rain`), then restores everything.

Check without the API: `python3 api/scripts/ddas_feeder.py --dry-run --once`.

## 4. Clean down to the 3 dams (`cleanup_demo_data.py`, once)

```bash
python3 api/scripts/cleanup_demo_data.py --kubectl            # dry run: what would change
python3 api/scripts/cleanup_demo_data.py --kubectl --apply    # full backup, then apply
```

Deletes every other dam, every user except `--keep-email` (default admin and Niduk), all alerts
and their SMS queue, and demo news. Renames the codes to `KOT-01`, `VIC-01`, `RAN-01`, removes
"Demo" labels and sets up the 7 alert types from `ALERT-PLAN.md`. After this, don't re-run
`seed_demo.py` or `seed_cascade_demo.py`; they look for the old `DEMO-00x` codes.
