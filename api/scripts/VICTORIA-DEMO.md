# Victoria Dam reference geography

Demo dam `DEMO-002` (ID 2 in the original local database; IDs may differ elsewhere) represents Victoria Dam. Its original record is backed
up in ignored `local-data/<database>/victoria/before-victoria.json`. Other dams and existing
telemetry records are preserved. The original three hazard
records are backed up in `local-data/<database>/victoria/before-danger-zones.json`.

The dam point is the middle vertex of the OpenStreetMap dam crest. The map shows
the reservoir shoreline with 13 island holes and the mapped downstream Mahaweli
River section. These are geographic references, not surveyed engineering data or
current water extents. The shared web maps display them as non-editable layers,
separate from editable hazard entities. Six sensors and three gates are placed
plausibly around the dam crest, reservoir and downstream river as demo equipment.
Three mock shelters are on land outside all three illustrative danger corridors;
their names, capacities and locations are fictional and verification is disabled.
Victoria's demo reports, SOS points and location snapshots are moved into the
same area. Other dams are unchanged. The original rows are backed up in
`local-data/<database>/victoria/before-map-points.json`; reapply with
`python scripts/update_victoria_points.py` after setting up the reference and zones.
Three nested demo danger corridors follow the downstream river: Level 1 (yellow,
roughly 10 km), Level 2 (orange, roughly 5 km), and Level 3 (red, roughly 2 km nearest
the dam). They have no forecast arrival time, depth or velocity, and verification
is disabled. Reapply using `python scripts/update_victoria_zones.py`.

The mobile dashboard and full map prefer Victoria Dam, load its details, and
use the same API-backed zone levels, equipment and nearby shelters. These remain
illustrative demo areas; the web maps show the same points.

Sources downloaded 6 October 2026:

- [Dam crest, OSM way 232724598](https://www.openstreetmap.org/way/232724598)
- [Reservoir, OSM relation 3553743](https://www.openstreetmap.org/relation/3553743)
- [Downstream river, OSM way 97085307](https://www.openstreetmap.org/way/97085307)
- [Mahaweli Authority 2022 handbook, Table 2.1](https://mahaweli.gov.lk/PDF/Statistical%20Hand%20Book%202022.pdf): arch dam, 122 m high, 520 m crest, 722 MCM gross storage, 1,891 km² catchment; commissioned 1985.

OpenStreetMap geometry is © OpenStreetMap contributors, licensed under
[ODbL 1.0](https://www.openstreetmap.org/copyright). The retained GeoJSON includes
source links and attribution. Reference GeoJSON is bundled in `scripts/fixtures/victoria-geography.json`; raw snapshots are not required.

Reapply from `api` using `python scripts/update_victoria_demo.py` with the local
MySQL container running. This updates only the selected dam and assigns a Kandy
District region without inventing an administrative boundary. Unsupported demo
live/dead storage and spillway capacity facts are cleared. Flood zones and current
water levels remain unverified demo data. Running the old general geography
scatter script replaces the reference geography; reapply this script afterwards.


The complete setup now runs through `python scripts/seed_demo.py`. It uses the
bundled GeoJSON, applies reference geography, then zones and points in order.
Completed repeat runs preserve the geography. See [DEMO-DATA.md](DEMO-DATA.md)
for coverage, database manifest recovery, and verification instructions.
