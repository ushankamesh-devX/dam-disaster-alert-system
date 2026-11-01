# Selected dam dashboard

Implemented locally on 1 November 2026.

- Loads the account's selected operational dam directly, without a default reservoir.
- Uses the current-status API's water level, water-level percentage, inflow, outflow and current storage. Reservoir capacity comes from dam details. Missing values display as unavailable; zero remains zero. Flood-risk score is never used as water-level percentage.
- Restores the original top hazard banner and gauge layout, with a status badge (Normal, Low, Moderate, High, Severe or Critical). Measurements, assessment time and a compact forecast summary appear inside that same banner; the separate detail/status/forecast cards were removed at the user's request. Demo dams have a visible disclaimer. Missing measurements hide the gauge needle rather than implying zero.
- Shows published forecast horizons, median water level, lower/upper estimates, overflow probability, issue/target/input times and input freshness. Empty forecasts have an explicit message; no sample predictions are inserted.
- Provides pull-to-refresh, refresh and retry controls. Measurement and forecast request failures are isolated, so one does not hide the other's available data.
- Shows server-local timestamps explicitly because the API does not include timezone offsets. Users can see old recording times; no claim of live or fresh measurements is inferred from a successful request.
- Rejects responses for another dam and discards superseded dashboard requests. Existing account/dam route keys reset screens when the saved selection changes.
- Removed placeholder map legend zones when no zones are available.
- Simplified the banner for everyday users: water-level percentage on the original gauge, a clear status badge, and up to three forecast arrows with “May rise / May fall / May stay level” labels. These compare the predicted median with the recorded water level; they do not imply safety. Technical readings, probabilities and recording times are collapsed behind “View details”. Missing comparisons and older/unknown forecast inputs remain labelled.

## Verification

TypeScript and lint for changed files passed. `npm.cmd run test:dashboard` covers selected-dam identity, zero/missing values, partial failures, unavailable dams, cross-dam response rejection, published horizon ordering and timestamp display. All 16 dashboard, authentication and Metro checks passed together.

Authenticated local API checks confirmed the raw dam/detail status contracts and wrapped forecast contract for dam IDs 2 and 6. Both currently return zero published forecasts; displaying the empty state is expected. The temporary account was deactivated. The Android development bundle containing the dashboard was served successfully by Metro. No backend/native changes or new device installation were required.

## Manual checks

1. Open the dashboard and compare the dam name with Settings.
2. Pull to refresh. Check measurements, units, recording times and demo labels.
3. Change the dam in Settings; confirm its measurements and map replace the previous dam's data.
4. Disconnect the local API and refresh; check the error/retry state. Reconnect and retry.
5. With published forecasts available, check horizon order, uncertainty values, overflow probability and freshness. Until then, expect the no-published-forecast message.

AI assistance remains the next development step. Location and the previously deferred emergency/report/news/notification/routing features are unchanged.
