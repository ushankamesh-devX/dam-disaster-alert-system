# Dam Disaster Alert System - Selenium UI Test Suite (Python + pytest)

## Step 1 - Install (once)
1. Install Python 3.10+ and Google Chrome.
2. `cd web-ui-tests`
3. `python -m venv venv` then activate it (`venv\Scripts\activate` on Windows)
4. `pip install -r requirements.txt`   (Selenium 4 downloads chromedriver itself via Selenium Manager)

## Step 2 - Start the system
Run MySQL + Spring Boot API + the React web app (`cd web && npm run dev`).
Create an admin user and keep its email/password.

## Step 3 - Set environment variables (Windows PowerShell)
```powershell
$env:BASE_URL      = "http://localhost:5173"
$env:ADMIN_EMAIL   = "superadmin@ddas.com"
$env:ADMIN_PASSWORD = "SuperAdmin@123"
$env:HEADLESS      = "0"   # set to "1" for headless / CI
```

## Step 4 - Run
```powershell
# All tests
pytest

# Single test file
pytest tests/test_01_login_page.py

# By marker
pytest -m smoke                     # quick: does every page open?
pytest -m "admin and not map"       # all admin pages (no map)
pytest -m map                       # all three map tests
pytest -m responsive                # all viewport tests
pytest -m auth                      # login + register
pytest -m security                  # XSS / auth-redirect checks
pytest -m a11y                      # accessibility tests

# Parallel (3 browsers at once)
pytest -n 3

# Firefox
$env:BROWSER = "firefox"
pytest
```

Report: `reports/report.html`. Failure screenshots: `reports/screenshots/`.

## Step 5 - Read the results
* **FAILED** = real UI defect OR locator does not match your JSX. Open the screenshot first.
* **SKIPPED** (`-rs` prints the reason) = the feature was not found (no search box, no pagination, no
  dams in DB for the map tests, etc.). For a critical project, review every skip.

## Step 6 - Make tests stable: add data-testid
In JSX: `<button data-testid="dam-add-btn">Add Dam</button>`, `<input data-testid="search-input" />`.
Then put `[data-testid='dam-add-btn']` first in the locator lists in `pages/base_page.py` / `utils/crud_checks.py`.

---

## Complete File Map

| File | Covers |
|---|---|
| `tests/test_00_generic_all_pages.py` | Same 17 quality checks on **every** page + 4 viewports + logged-out redirect + axe accessibility |
| `tests/test_01_login_page.py` | 15 login tests: elements, masking, toggle, empty/invalid/wrong submit, valid login, Enter key, tab order, register link, XSS, URL leak, responsive, error-clears |
| `tests/test_02_register_page.py` | 10 register tests: elements, password masking, empty/invalid/mismatch/weak/duplicate submit, back link, XSS, mobile layout |
| `tests/test_03_home_page.py` | 8 home tests: nav, hero CTA, internal nav links, login CTA, footer, images, mobile menu, scroll |
| `tests/test_04_admin_layout.py` | 7 layout tests: sidebar links, every sidebar link works, active highlight, header user menu, logout + back-blocked, sidebar collapse on small screens, sticky after scroll |
| `tests/test_05_dashboard_page.py` | 8 dashboard tests: stat cards, numbers not blank, no NaN/undefined, charts render with size, chart title/legend, cards don't overlap, mobile wrap, loads within timeout |
| `tests/test_06_dams_page.py` | 13 dams list tests: table+columns, rows/empty-state, search, add form, validation, cancel, row actions, delete-confirm, pagination, sorting, no UI defects, row-click opens detail, status values |
| `tests/test_07_dam_detail_page.py` | 10 dam detail tests: heading, sensor readings, units, chart/gauge, status badge, back, refresh, invalid id, no UI defects, mobile layout |
| `tests/test_08a_map_detailed_page.py` | 12 dam map tests: map size, tiles, marker, zoom, popup, heading, info panel, readings, back, refresh, no UI defects, mobile layout |
| `tests/test_08b_map_func_page.py` | 17 overview map tests: map size, tiles, markers, zoom, popup, heading, sidebar, search, filter, popup content/status, popup→detail link, no UI defects, no overflow, mobile, refresh |
| `tests/test_08c_safe_locations_page.py` | 18 safe locations tests: map size, tiles, zoom, markers, popup, heading, list, add form, validation, cancel, row actions, delete-confirm, names, coordinates/address, no UI defects, no overflow, mobile, refresh |
| `tests/test_09_alerts_page.py` | 14 alerts tests: table+columns, rows/empty-state, search, add form, validation, cancel, row actions, delete-confirm, pagination, sorting, no UI defects, severity labels, timestamps, filter dropdown |
| `tests/test_10_device_keys_page.py` | 13 device keys tests: table, rows/empty-state, search, add form, validation, cancel, row actions, delete-confirm, pagination, sorting, no UI defects, keys masked/copyable, generate button |
| `tests/test_11_news_page.py` | 13 news tests: table, rows/empty-state, search, add form, validation, cancel, row actions, delete-confirm, pagination, sorting, no UI defects, images have alt, no overflow |
| `tests/test_12_regions_page.py` | 11 regions tests: table, rows/empty-state, search, add form, validation, cancel, row actions, delete-confirm, pagination, sorting, no UI defects |
| `tests/test_13_sensor_detail_page.py` | 15 sensor detail tests: heading, sensor type/name, numeric reading, units, status badge, chart/history, time axis, edit button, edit+cancel, back, refresh, invalid id, no UI defects, mobile layout, tab title |
| `tests/test_14_reports_page.py` | 8 reports tests: filters visible, generate button, generate shows content, invalid date range, export button, export downloads file, table headers after generate, no UI defects |
| `tests/test_15_roles_page.py` | 12 roles tests: table, rows/empty-state, search, add form, validation, cancel, row actions, delete-confirm, pagination, sorting, no UI defects, permission checkbox toggles |
| `tests/test_16_users_page.py` | 13 users tests: table, rows/empty-state, search, add form, validation, cancel, row actions, delete-confirm, pagination, sorting, no UI defects, email cells, role shown |
| `tests/test_17_sensors_page.py` | 11 sensors list tests: table, rows/empty-state, search, add form, validation, cancel, row actions, delete-confirm, pagination, sorting, no UI defects |
| `tests/test_99_template_for_new_pages.py` | Template – copy this to add tests for a new page |

## Page Objects

| File | Purpose |
|---|---|
| `pages/base_page.py` | Shared wait/find/click/type/modal helpers + locators used by all pages |
| `pages/login_page.py` | Login form locators + `login()` helper |
| `pages/register_page.py` | Register form locators + `fill()` / `submit()` helpers |
| `pages/admin_page.py` | Admin-wide: sidebar, header, user menu, logout helper |
| `pages/dashboard_page.py` | Stat card + chart locators |
| `pages/dams_page.py` | Dam list locators + `open_first_dam()` |
| `pages/map_page.py` | Map locators (Leaflet / Mapbox / MapLibre / OL) + MapFuncPage, MapDetailedPage, SafeLocationsPage |
| `pages/sensor_detail_page.py` | Sensor detail: readings, chart, status, back locators |

## Utility Modules

| File | Purpose |
|---|---|
| `utils/auth.py` | `login_as_admin(driver)` used by the `admin_driver` fixture |
| `utils/ui_checks.py` | Console errors, broken images, alt text, unnamed controls, bad text, error screen, overflow, clipped buttons, tab stops, `run_all_basic()` |
| `utils/crud_checks.py` | Reusable list-page checks: `table_is_rendered`, `has_rows_or_empty_state`, `search_filters`, `open_add_form`, `required_validation`, `cancel_closes_form`, `row_actions_present`, `delete_asks_confirmation_and_cancel_keeps_row`, `pagination_works`, `sorting_does_not_break` |
| `utils/map_checks.py` | Map-specific: `map_visible_with_size`, `tiles_loaded`, `markers_present`, `zoom_controls_work`, `marker_click_shows_popup` |

---

## UI QA Checklist Covered

Page loads / no error screen / correct route / tab title / heading ·
console errors · broken images / alt text · raw `undefined`/`NaN` text ·
element presence & enabled state · form validation (empty, format, mismatch,
weak password, duplicates) · error messages · password masking & toggle ·
keyboard (Tab order, Enter submit) · labels & accessible names ·
axe accessibility · search / sort / pagination · modal open / cancel / confirm ·
destructive-action confirmation · responsive (desktop, laptop, tablet, mobile) /
no horizontal scroll · clipped text · map rendering / tiles / markers / zoom /
popup content · charts / gauges / history · file download · refresh / back /
forward · auth redirect & logout · XSS/SQL input.

## NOT Covered by Selenium (Do Separately)

Visual pixel comparison (Percy/Playwright snapshots), real performance (Lighthouse),
API tests (Postman/JUnit), real-time WebSocket alert push (needs a seeded alert
or API trigger), cross-browser Safari.
