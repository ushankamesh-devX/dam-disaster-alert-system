# DDAS alert plan

Seven alert types, one per stage of a dam emergency. `api/scripts/cleanup_demo_data.py` creates them.

| # | Code | Name | Severity | When | Who | Channels |
|---|---|---|---|---|---|---|
| 1 | `RESERVOIR_WATCH` | Reservoir Watch | info | Level ≥ 90% of full supply level, or >100 mm rain forecast in 24 h | Dam operators, DMC, Divisional Secretariat officers | Dashboard |
| 2 | `SPILLWAY_RELEASE` | Spillway Release Warning | warning | Spill gates about to open, or inflow rising fast | Officers + residents of zones L1–L2 | Dashboard, public page, SMS* |
| 3 | `FLOOD_WARNING` | Flood Warning | warning | Downstream river gauges (2 km / 8 km) rising towards bank level | Residents of zones L1–L3 | Dashboard, public page, SMS* |
| 4 | `EVACUATION_ORDER` | Evacuation Order | critical | Reservoir above danger level (raised automatically from sensor readings) | Everyone in zones L1–L3; shelters open | Dashboard, public page, SMS* |
| 5 | `DAM_EMERGENCY` | Dam Emergency | emergency | Dam failure likely or under way. An admin raises it manually | All downstream zones, police, hospitals, DMC | All channels, SMS* |
| 6 | `ALL_CLEAR` | All Clear | info | Water back to normal | Everyone who received 2–5 | Dashboard, public page, SMS* |
| 7 | `DRILL` | Drill / System Test | info | Training only; always marked as a drill | Test accounts | Dashboard only |

\* **SMS is off by default.** SMS credits are limited, so an admin turns it on with the small **SMS**
switch on the Alerts page, and it goes off again whenever the API restarts. While it is on:

- critical and emergency alerts that are live (not drills) queue an SMS automatically;
- the small **SMS** link on an alert row sends that alert by hand;
- recipients are registered users with a phone number and notifications on;
- nobody receives the same alert twice.

## Rules

- **Automatic vs manual:** type 4 is raised automatically when a water-level reading passes the
  danger level. Type 5 is always raised by an admin.
- **One alert per stage:** the same dam does not get a second automatic Evacuation Order within 60 minutes.
  Moving up a stage (Warning → Evacuation Order → Dam Emergency) is always sent.
- **Short messages:** SMS text is the alert title and message, under 300 characters, always with the
  117 helpline (DMC).
- **Always close with All Clear** so people know they can return.

## Demo

```bash
# 1. Alerts page: switch SMS on (only for the demo; credits are limited)
# 2. Start the two-minute storm; Victoria passes its danger level → Evacuation Order → SMS
kubectl -n ddas exec deploy/ddas-feeder -- python3 /app/scripts/ddas_demo.py flood --dam victoria
# 3. Alerts page: switch SMS off again
```
