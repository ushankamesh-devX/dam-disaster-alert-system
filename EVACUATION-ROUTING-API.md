# Evacuation Routing API

For the mobile app and web dashboard. The API picks the nearest open shelter outside
the active flood zones and returns a road route that avoids those zones and any blocked roads.

Base URL: `https://<server>/api` (same as the rest of the API).

## 1. Get an evacuation route

`POST /api/public/evacuation/route` — **no login needed** (people in danger must not hit a login wall).

Request:
```json
{ "lat": 7.0512, "lng": 80.5923, "mode": "walk" }
```
| Field | Required | Notes |
|---|---|---|
| `lat`, `lng` | yes | The person's current GPS position |
| `mode` | no | `"walk"` (default) or `"drive"` |

Response `200`:
```json
{
  "inDangerZone": true,
  "zone": { "id": 4, "name": "Kotmale Zone 2", "nameSi": "...", "hazardLevel": 2, "damName": "Kotmale" },
  "floodEtaMin": 15,

  "shelter": {
    "id": 12, "name": "Kotmale Central School", "nameSi": "...",
    "lat": 7.0601, "lng": 80.6012, "freeCapacity": 140, "contactPhone": "0812345678"
  },
  "route": { "type": "LineString", "coordinates": [[80.5923, 7.0512], [80.5931, 7.0519]] },
  "distanceKm": 2.3,
  "etaMin": 28,
  "safe": false,
  "routingAvailable": true,
  "instructions": ["Walk north on A5.", "Turn right onto School Road.", "Your destination is on the left."],

  "alternatives": [
    { "shelter": { "id": 15, "name": "Temple Hall", "lat": 7.07, "lng": 80.58, "freeCapacity": null, "contactPhone": null },
      "distanceKm": 3.1, "etaMin": 37 }
  ]
}
```

| Field | Meaning | What the app should do |
|---|---|---|
| `inDangerZone` | The person is inside a zone that must evacuate now | If true, show a red banner: **"Evacuate now"** |
| `zone` | That zone (`null` when not in one). `hazardLevel` 1 = most dangerous | Show the zone name |
| `floodEtaMin` | Minutes until water is expected there (`null` when not in a zone) | Show a countdown |
| `shelter` | Where to go. `freeCapacity` `null` = capacity unknown | Marker on the map, call button for `contactPhone` |
| `route` | GeoJSON LineString, **`[lng, lat]` order** | Draw a polyline. react-native-maps needs `{latitude: c[1], longitude: c[0]}` |
| `etaMin`, `distanceKm` | Travel time and distance on the route | Show them |
| `safe` | `false` = the route takes longer than `floodEtaMin` | Show **"Leave immediately, the flood may arrive first"**, and suggest `drive` mode if walking |
| `routingAvailable` | `false` = routing engine down; `route` is `null` and the shelter is the nearest by straight line | Show the shelter and a straight line, and the instruction text |
| `instructions` | Turn-by-turn text | Show as a list |
| `alternatives` | Other reachable shelters, fastest first | "Other shelters" list |

Errors:
- `400`: bad `lat`/`lng`/`mode`
- `404`: no open shelter found outside the danger zones. Tell the person to move to high ground and call emergency services.

When to call it: when an alert arrives, when the app opens during an active alert, and every
2–3 minutes or 200 m of movement while the person is evacuating.

## 2. Blocked roads (admin dashboard)

Areas routes must avoid (flooded road, landslide, bridge out). Read: any logged-in user. Write: `dams.edit`.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/v1/blocked-roads` | All, newest first |
| `GET` | `/api/v1/blocked-roads/active` | Only the ones routes avoid now |
| `POST` | `/api/v1/blocked-roads` | Create |
| `PUT` | `/api/v1/blocked-roads/{id}` | Update |
| `DELETE` | `/api/v1/blocked-roads/{id}` | Remove |

Body (`boundaryGeojson` is a GeoJSON Polygon **as a string**, `[lng, lat]` order):
```json
{
  "name": "A5 bridge flooded",
  "reason": "Water over the bridge",
  "boundaryGeojson": "{\"type\":\"Polygon\",\"coordinates\":[[[80.59,7.05],[80.60,7.05],[80.60,7.06],[80.59,7.05]]]}",
  "isActive": true,
  "expiresAt": "2026-11-02T18:00:00"
}
```
`expiresAt` is optional; after it the block stops applying by itself.

## How the route is chosen

1. **Danger zones** = active hazard zones with `evacuation_required` (levels 1–3) of every dam whose status is not `safe`.
2. **Shelters** = `system_safe_locations` that are `active`, not full, and not inside a danger zone; the 5 nearest by straight line.
3. **Valhalla** (self-hosted, Sri Lanka OpenStreetMap) routes to each, avoiding the danger zones and blocked roads. The person's own zone is not avoided, since they have to get out of it.
4. The **fastest** route wins. `safe` compares its time with the zone's flood arrival time.

## Coming next

- Push notifications (Expo) when an alert changes the route: `POST /api/v1/devices { expoPushToken, lat, lng }`
- Live dashboard updates over WebSocket
- Offline route packs: `GET /api/public/evacuation/packs?zoneId=`
