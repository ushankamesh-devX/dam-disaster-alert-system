# Dam Disaster Alert System - Selenium UI Test Suite (Python + pytest)

## Step 1 - Install (once)
1. Install Python 3.10+ and Google Chrome.
2. `cd web-ui-tests`
3. `python -m venv venv` then activate it (`venv\Scripts\activate` on Windows)
4. `pip install -r requirements.txt`   (Selenium 4 downloads chromedriver itself)

## Step 2 - Start the system
Run MySQL + Spring Boot API + the React web app (`cd web && npm run dev`).
Create an admin user and keep its email/password.

## Step 3 - Set environment variables (Windows PowerShell)
```
$env:BASE_URL="http://localhost:5173"
$env:ADMIN_EMAIL="your-admin@email.com"
$env:ADMIN_PASSWORD="YourPassword"
$env:HEADLESS="0"
```

## Step 4 - Fix the routes (important)
Open `config.py` and compare every `path` with your React Router file (`web/src/router`).
Add the two cut-off "Se..." pages. Use a test database - tests click Save/Delete dialogs
(delete is only ever CANCELLED, and empty forms are never saved).

## Step 5 - Run
```
pytest tests/test_01_login_page.py          # one page
pytest -m smoke                             # quick: does every page open
pytest -m "admin and not map"               # admin pages
pytest -m responsive                        # all viewport tests
pytest -n 3                                 # parallel (3 browsers)
pytest --browser firefox                    # (set $env:BROWSER="firefox")
```
Report: `reports/report.html`. Failure screenshots: `reports/screenshots/`.

## Step 6 - Read the results
* FAILED = real UI defect OR locator does not match your JSX. Open the screenshot first.
* SKIPPED (`-rs` prints the reason) = the feature was not found (no search box, no pagination...).
  For a critical project, review every skip: either the feature is missing or the locator needs updating.

## Step 7 - Make tests stable: add data-testid
In JSX: `<button data-testid="dam-add-btn">Add Dam</button>`, `<input data-testid="search-input" />`.
Then put `[data-testid='dam-add-btn']` first in the locator lists in `pages/base_page.py` / `utils/crud_checks.py`.

## File map
| File | Covers |
|---|---|
| tests/test_00_generic_all_pages.py | Same 17 quality checks on EVERY page + 4 viewports + logged-out redirect + axe accessibility |
| test_01 LoginPage, test_02 RegisterPage, test_03 HomePage | auth + public |
| test_04 admin layout | sidebar, active menu, header, logout, back-after-logout, collapse |
| test_05 DashboardPage | cards, numbers, charts, overlap, mobile |
| test_06 DamsPage, test_07 DamDetailPage | list CRUD checks, open detail, readings, units, invalid id |
| test_08a/b/c MapDetailed, MapFunc, SafeLocations | map size, tiles, markers, zoom, popup, mobile |
| test_09 Alerts, 10 DeviceKeys, 11 News, 12 Regions, 15 Roles, 16 Users | table, search, add form, validation, cancel, row actions, delete-confirm, pagination, sorting |
| test_14 ReportsPage | filters, generate, invalid date range, export download |
| test_99 template | for the 2 missing pages |

## UI QA checklist covered
Page loads / no error screen / correct route / tab title / heading - console errors - broken images / alt text -
raw `undefined`/`NaN` text - element presence & enabled state - form validation (empty, format, mismatch, weak
password, duplicates) - error messages - password masking & toggle - keyboard (Tab order, Enter submit) -
labels & accessible names - axe accessibility - search / sort / pagination - modal open / cancel / confirm -
destructive-action confirmation - responsive (desktop, laptop, tablet, mobile) / no horizontal scroll -
clipped text - map rendering - charts - file download - refresh / back / forward - auth redirect & logout - XSS/SQL input.

## NOT covered by Selenium (do separately)
Visual pixel comparison (use Percy/Playwright snapshots), real performance (Lighthouse), API tests (Postman/JUnit),
real-time WebSocket alert push (needs a seeded alert or API trigger in the test), cross-browser Safari.
