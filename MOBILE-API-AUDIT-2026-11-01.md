# Mobile API exposure and integration audit

Checked: 1 November 2026, approximately 11:52–11:54 AM Asia/Colombo.
Target: http://13.55.238.41/
Local source revision: 48e1071. The deployed revision was not verified.

## Result

The server exposes its backend through nginx under `/api/`. The intended mobile base URL is `http://13.55.238.41/api/v1`. The mobile integration is not ready to sign off: local configuration targets other servers, the Alerts screen uses an absent source route, and the public alerts endpoint fails on the live server.

This was an inspection and read-only network audit. No deployment, application code, environment values, accounts, or server data were changed. No credentials were sent to the server. An authenticated session and a mobile device were not tested.

## Live observations

| Request | Result | Meaning |
| --- | --- | --- |
| GET `/` | 200 HTML | Web entry point responds. |
| GET `/api/v1/health` | 200 JSON, status UP | nginx forwards requests to the API. |
| GET `/api/v1/auth/test` | 200 JSON | Public auth diagnostic responds; does not verify login. |
| GET `/api/public/active-alerts` | 500 JSON on two attempts | Public alert list is broken. |
| GET `/api/public/active-alerts/summary` | 200 JSON | Summary responds; it reported 26 active alerts and highest severity emergency. These are raw server values, not independently verified real-world conditions. |
| GET `/api/v1/dams/active` | 401 JSON | Authentication required. |
| GET `/api/v1/hazard-levels/active` | 401 JSON | Authentication required. |
| GET `/api/v1/system-safe-locations/list` | 401 JSON | Authentication required. |
| GET `/api/v1/regions` | 401 JSON | Authentication required. |
| GET `/api/v1/news-articles` | 401 JSON | Authentication required. |
| GET `/api/v1/alerts/feed` | 401 JSON | Security rejects anonymous requests before route resolution; this does not prove the route exists. |
| GET `/api/v1/users/me` | 401 JSON | Authentication required. |
| OPTIONS `/api/v1/dams/active` | 200 | Preflight allows Origin `*`, GET/POST/PUT/DELETE/PATCH/OPTIONS and authorization/content-type headers. |
| HTTPS `/api/v1/health` on port 443 | Connection timed out | HTTPS was not reachable from this audit connection. |

The public-alert failure returned: `Could not initialize proxy [com.ddas.api.entity.Region#6] - no session`. The local controller loads dams using `findAllById` and later accesses `dam.getRegion().getName()` while mapping the response. This is consistent with a lazy relationship being read after its session closes. Fix the fetch/transaction boundary and verify the deployed endpoint again. The response also exposes internal exception details.

## Mobile configuration

- `app/.env`: API_BASE_URL points to `http://157.245.159.17:8080/api/v1`.
- `app/.env.local`: API_BASE_URL points to `http://localhost:8080/api/v1`, with API_USE_EXPO_PROXY=true.
- `app/services/api/axios.instance.ts`: when proxy mode is true and an Expo host exists, it replaces the base URL with the Expo host plus `/api/v1`.
- `app/metro.config.js`: that development proxy forwards to this computer's `127.0.0.1:8080`.

Neither inspected environment file directly selects the requested server. The exact values embedded in an existing installed app were not inspected. For direct testing against this server, set API_BASE_URL to `http://13.55.238.41/api/v1` and API_USE_EXPO_PROXY=false, then restart/rebuild as appropriate for the app being tested. Changing API_BASE_URL alone is insufficient when proxy mode is active.

The checked address uses plain HTTP, including for login and bearer tokens. Establish a working HTTPS address for production. iOS explicitly allows arbitrary loads in app.json; Android standalone HTTP behavior was not device-tested.

## Mobile feature coverage against source

| Feature | Mobile calls / backend coverage | Assessment |
| --- | --- | --- |
| Dashboard and dam details | GET `/dams/active`, `/dams/{id}`, `/dams/{id}/status`, `/sensors/dam/{id}/readings/latest` | Matching backend routes exist; authenticated live response and device checks pending. |
| Hazard map | Above plus `/hazard-levels/active`, `/dams/{id}/hazard-zones/active`, `/sensors/dam/{id}`, `/dams/{id}/gates` | Matching source routes exist; protected. |
| Evacuation locations | GET `/system-safe-locations/list` | Matching source route exists; protected, so guest access needs a deliberate design. |
| Alerts screen | GET `/alerts/feed` | No matching backend route in local source. `/alerts/active` and `/api/public/active-alerts` are alternatives with different access rules. The public alternative currently fails live. |
| Alert service getAll | GET `/alerts` | No base GET mapping in local AlertController. POST at this path does exist. |
| News list | GET `/news-articles` | Source route exists and returns a paginated response. Screen handles `content`, but retains sample articles on errors and empty results. |
| Registration | POST `/auth/register` | Route exists; mobile payload uses `name`, backend requires `fullName`. Current service payload fails that requirement. |
| Login | POST `/auth/login` | Route and nested `data.token` handling match in source. Successful live login was not exercised. |
| Profile and onboarding location | GET/PUT `/users/me`, PUT `/users/me/location` | Source routes exist and require authentication. No onboarding UI currently wires them into a first-launch flow. |
| Push registration | PUT `/users/me/push-token` | Source route and service exist; actual notification permission/device token integration was not verified. |
| Region selection | GET `/regions` | Source returns a page; onboarding must read `content` or add a service method for existing `/regions/list`. |
| Issue reports | No mobile network submission | Screen initializes MOCK_REPORTS and appends submissions to React state. No report controller was found in the backend controller directory. Reports are not submitted to this server. |

## Other contract and behavior gaps

1. `newsService.saveArticle`, `markViewed`, and `shareArticle` POST without bodies. Backend DTOs require userId; save also requires hasSaved. These service methods need the required payloads before use.
2. News calls getAll without `status=published`; backend's unfiltered branch calls repository.findAll. Mobile should request published content, and backend should enforce publication visibility for ordinary users. News writes lack controller method authorization in the inspected source; SecurityConfig only requires authentication for these paths. Review permissions before using a shared viewer account.
3. Alerts maps emergency severity to the default info type. Add an explicit emergency mapping so the highest severity is displayed correctly.
4. Alerts catches failures and sets an empty array; News retains sample content. Both can conceal a broken connection. Show a clear load error and retry; only show an empty state after a successful empty response.
5. Startup and 401 recovery use configured viewer credentials. A shared viewer identity cannot safely represent each person's profile, location, saved news, and push token. Choose individual accounts or a scoped device identity for onboarding.
6. Public alert summary counts do not apply the list endpoint's simulation exclusion in local source. Align summary/list filtering before relying on the summary for public status.

## Deployment exposure

`web/nginx.conf` proxies `/api/` to `http://api:8080` without stripping the prefix. `k8s/web.yaml` exposes port 80 on the host. `k8s/api.yaml` supplies the internal api service on port 8080. This agrees with the successful external health request: mobile can use the same public host as the website; a separate publicly opened port 8080 is unnecessary for this design.

Protected endpoints should keep their authentication and authorization checks. A 401 is expected for an unsigned request, not a reason to make all API routes public.

## Recommended completion order

1. Fix and redeploy the public-alert database loading failure; confirm 200 with correctly filtered alert records.
2. Select the production server explicitly in mobile configuration and establish HTTPS.
3. Fix the missing alert route, emergency severity mapping, registration field, news payloads and publication filtering.
4. Replace hidden failures/sample fallback with clear loading, error, and empty states.
5. Complete individual/device identity and connect onboarding region/location/push settings.
6. Implement persisted issue-report APIs and connect the report screen if reporting is in release scope.
7. With an authorized test user, verify login and all protected reads, inspect response fields, and test onboarding on Android/iOS. Exercise write operations using designated test data. The current audit cannot certify those authenticated flows.
