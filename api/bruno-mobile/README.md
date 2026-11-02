# DDAS mobile core collection

Open this folder in Bruno and select **Local**. This is separate from the older general collection in `api/bruno`.

1. Start the host API with `api/scripts/start-local.ps1`.
2. Enter your local test account's `email` and `password` in a private Bruno environment, or supply `DDAS_MOBILE_EMAIL` / `DDAS_MOBILE_PASSWORD` process variables to the CLI.
3. Run **Health**, **Login**, **Current User**, **Active Dams**, then the remaining reads in order. Login keeps the bearer token in memory with `bru.setVar`; it does not write tokens to tracked files.
4. Active Dams selects the first returned dam; Dam Sensors selects a sensor. Override IDs when testing another dam. Set time-range variables to dates containing your local data.

## Coverage

- Authentication and current-user details.
- Dam lists/details, status, gates, hazard zones/levels and regions.
- Sensors, latest readings, paginated history, date range and statistics.
- Latest published forecasts, cursor history, overflow configuration.
- AI assistant with optional dam context.
- Manual registration, profile/location updates and password change.

The collection excludes reports, news, notifications, routing and emergency locations. Empty forecast arrays are valid when no forecast has been published; they do not verify model generation. Forecast history can include unpublished runs. A sensor without readings can legitimately return 404 for its latest-reading request; select a populated sensor for the smoke run.

## CLI

From this folder, with credentials in process variables:

```powershell
npx --yes --package @usebruno/cli bru run --env Local --tags core --bail
npx --yes --package @usebruno/cli bru run --env Local --exclude-tags manual --bail
```

The second command includes AI and requires its Docker service. Run sequentially so login and ID selection happen before dependent requests.

Requests tagged `manual` are skipped unless `allowWrites` is set to `true` in the selected environment. Run them individually against disposable local accounts; registration requires an unused email. Password change requires `newPassword` and changes subsequent login credentials. Never run the whole write set against an important account. No credentials or access tokens are included in this collection.

Update Profile now includes `preferredDamId`. Saving an operational dam also records
the user's first onboarding completion time. Apply the V010 mobile schema before
using this field; an unknown or non-operational dam is rejected. Location is not
required for this manual onboarding flow.

API results are mixed by existing backend convention: dam/sensor lists are plain arrays or pages, user/AI/forecast responses wrap values in `data`, and forecast history wraps rows in `data.data` with `data.nextCursor`.
