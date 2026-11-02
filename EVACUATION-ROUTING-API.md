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

## 3. Register the phone for evacuation warnings (mobile)

`POST /api/public/evacuation/devices`: no login. Call it on app start and when the person moves
about 200 m (use `expo-location` with `distanceInterval: 200`).

```json
{ "expoPushToken": "ExponentPushToken[xxxxxxxx]", "lat": 7.0512, "lng": 80.5923, "mode": "walk", "phone": "+94771234567" }
```
| Field | Required | Notes |
|---|---|---|
| `expoPushToken` | yes | From `Notifications.getExpoPushTokenAsync()` |
| `lat`, `lng` | yes | Current position |
| `mode` | no | `walk` (default) or `drive`; used for the route in the warning |
| `phone` | no | SMS fallback when SMS is enabled on the server |

Response: `{ "registered": true }`. Unregister on logout: `DELETE /api/public/evacuation/devices/{expoPushToken}`.

The server checks every 15 seconds. Phones seen in the last 6 hours get:

| When | Push title | `data` |
|---|---|---|
| Phone enters a danger zone | `EVACUATE NOW: <zone>`, body names the shelter, distance and time | `{ "type": "evacuate", "zoneId": 4, "shelterId": 12 }` |
| Zones or blocked roads change while it is in one | `Evacuation route updated` | same as above |
| The zone is no longer in danger | `All clear` | `{ "type": "all_clear" }` |

**In the app:** create an Android notification channel with id **`evacuation`** and max importance.
On `type: "evacuate"`, open the route screen and call `POST /route`.

## 4. Offline route packs (mobile)

`GET /api/public/evacuation/packs`: all zones. `GET /api/public/evacuation/packs?zoneId=4`: one zone.

```json
[
  { "zoneId": 4, "mode": "walk", "computedAt": "2026-11-01T12:15:00", "route": { "...same shape as POST /route..." } }
]
```
Each pack is the route from the zone's center to its best shelter, computed as if that zone's dam
were in danger. Rebuilt every 6 hours.

**In the app:** download all packs on start and once a day, and save them (AsyncStorage). When
`POST /route` fails (no internet), find which zone the person is in (point-in-polygon on the zone
boundaries, or the zone from the last push) and show that zone's pack.

## 5. Safety: share location, SOS, "I'm safe" (mobile, signed in)

These feed the evacuation command center. All need the normal `Authorization: Bearer <token>`.

| Method | Path | Body | Use |
|---|---|---|---|
| `GET` | `/api/v1/safety/sos-types` | | List for the SOS screen: `[{ code, name, nameSi, defaultMessage }]` |
| `POST` | `/api/v1/safety/location` | `{ lat, lng, speedMps?, battery? }` | During an alert, every ~30 s. The first call starts sharing |
| `POST` | `/api/v1/safety/location/stop` | | The person turns sharing off |
| `POST` | `/api/v1/safety/sos` | `{ type, message?, lat, lng, battery? }` | Big red SOS button. `type` is a `code` from `sos-types`, e.g. `flood_trapped`, `injured`, `medical`, `stranded_vehicle` |
| `GET` | `/api/v1/safety/sos` | | The person's own SOS calls with `status` (`triggered` → `acknowledged` → `responding` → `resolved`) and `responseNotes` (e.g. "Simulated responder team near Kandy Police"). DDAS is a demo: police, hospitals and fire stations are map locations only and are never contacted |
| `POST` | `/api/v1/safety/safe` | | "I'm safe" button: ends sharing; the command center counts them as safe |

**Privacy:** operators see people only as counts per ~450 m area. An exact position is shown only for an SOS.
Share location only while an alert is active for the person's area, and show a clear "Sharing your location
with authorities" banner with a stop button.

**Suggested app flow during an Evacuation Order:** show the route (`POST /route`) → start `safety/location`
every 30 s → on arrival show "I'm safe" → `safety/safe`. The SOS button stays visible the whole time; after
sending, poll `GET safety/sos` every 15 s and show the status.

## 6. Live dashboard feed

- `GET /api/public/evacuation/status`: snapshot of danger zones (with phones inside each), shelters with occupancy, blocked roads, phone counts.
- `GET /api/public/evacuation/stream`: Server-Sent Events. A `status` event with the same JSON is sent on connect and whenever anything changes. In a browser: `new EventSource(url).addEventListener('status', ...)`.
- `POST /api/v1/blocked-roads/rebuild-packs` (admin, `dams.edit`): rebuild offline packs now.

The web dashboard page is **Evacuation** in the admin sidebar (`/admin/evacuation`).
