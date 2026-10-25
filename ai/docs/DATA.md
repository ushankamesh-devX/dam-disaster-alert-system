# Data and features

## Inspected database: 2026-10-11

- 43,200 synthetic readings; 60 sensors; 10 dams; 30 days; hourly sampling.
- Six measurement types; 7,200 aligned dam/time rows before quality filtering and targets.
- No duplicate sensor/time pairs or missing measurement values; 2,880 suspect readings.
- Latest-only dam status; no dedicated overflow/crest threshold found.

| Raw feature | Unit |
| --- | --- |
| Water level | m |
| Rainfall rate | mm/hour |
| Inflow / outflow | m³/second |
| Soil moisture | % |
| Temperature | °C |

- Keep dam/sensor IDs, type, location/role, unit, quality, recorded time, and received time.
- Multiple sensors per type are supported; feature count depends on measurement role/location.
- Average only compatible, calibrated sensors with aligned timestamps/units/reference elevations.
- Separate reservoir/downstream levels; exclude bad/stale readings; flag suspect readings.
- Record sensor count/disagreement; missing inputs stay missing, not zero.
- Latest status/gate values cannot be copied across historical rows; collect timestamped history.

## Extra inputs

- Derived: water-level lags, rise rate, rolling averages, net inflow, integrated rainfall totals.
- Weather: catchment rainfall history; 1/3/6-hour forecast totals; temperature; humidity.
- [Open-Meteo forecast](https://open-meteo.com/en/docs): initial provider; check usage terms/attribution.
- [Historical weather](https://open-meteo.com/en/docs/historical-weather-api): reanalysis backfill; keep availability/source metadata.
- [Single model runs](https://open-meteo.com/en/docs/single-runs-api): historical forecasts by run time, where available.
- [NASA POWER](https://power.larc.nasa.gov/docs/services/api/temporal/hourly/): optional historical source; request UTC.
- Calendar: derive ISO year/week, month, weekday, hour in `Asia/Colombo`; store timestamps in UTC.
- Spring collector stores provider/location/units, valid time, fetch time, issue/run time when available.
- Keep station readings and model estimates separate; use upstream catchment locations where possible.

## Training rules

- Filter inputs by prediction cutoff and actual availability; no future observed weather or readings.
- Preserve demo/real designation; real weather + synthetic levels proves integration only.
- Level target: observed level at the requested horizon, subject to timestamp tolerance.
- Overflow target: any threshold exceedance within the horizon; require complete future coverage.
- Preserve historical threshold versions; require sufficient real events before operational probability claims.
