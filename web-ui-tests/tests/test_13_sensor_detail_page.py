"""test_13_sensor_detail_page.py
Tests for the Sensor Detail page: /admin/sensors/:id (SensorDetailPage).

Flow: Login → Sensors list → click first sensor → assert detail page.
Skips automatically if no sensors exist in the database.
"""
import re
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

import config
from pages.base_page import BasePage, clickable
from utils import ui_checks as ui

pytestmark = pytest.mark.admin

SENSORS_PATH = config.ADMIN_PAGES["sensors"]["path"]


@pytest.fixture
def page(admin_driver):
    """Navigate to sensors list and open the first sensor's detail page."""
    p = BasePage(admin_driver).open(SENSORS_PATH)
    rows = p.visible_all(p.ROWS)
    if not rows:
        pytest.skip("No sensors in the database – cannot open sensor detail")

    ctrl = rows[0].find_elements(By.CSS_SELECTOR, "a, button")
    (ctrl[0] if ctrl else rows[0]).click()
    p.wait_loaded()

    # Make sure we actually navigated away from the list
    if p.current_path().rstrip("/") == SENSORS_PATH.rstrip("/"):
        pytest.skip("Clicking first row did not open a detail page")

    return p


# ── Page structure ──────────────────────────────────────────────────────────

def test_sensordetail_01_opens_with_heading(page):
    """The detail page must have a heading (sensor name or ID)."""
    assert page.headings(), "Sensor detail page has no heading"


def test_sensordetail_02_shows_sensor_type_or_name(page):
    """Body text must include sensor-related keywords."""
    text = page.body_text().lower()
    assert any(w in text for w in
               ("sensor", "type", "model", "dam", "location", "installed")), \
        "No sensor metadata visible on detail page"


def test_sensordetail_03_shows_numeric_reading(page):
    """At least one numeric reading value must be displayed."""
    assert re.search(r"\d", page.body_text()), "No numeric reading on sensor detail page"


def test_sensordetail_04_reading_has_unit(page):
    """Readings should include a unit (m, mm, %, m³, °C, etc.)."""
    assert re.search(
        r"\d+(\.\d+)?\s?(m|cm|mm|%|m³|m3|°C|°F|l/s|cumecs|mbar|hPa)\b",
        page.body_text(), re.I
    ), "Sensor readings have no physical unit"


def test_sensordetail_05_status_badge_visible(page):
    """A status badge (active / inactive / online / offline) should be shown."""
    text = page.body_text().lower()
    assert any(w in text for w in
               ("active", "inactive", "online", "offline", "normal", "warning", "critical", "error")), \
        "No status indicator on sensor detail page"


# ── Chart / history ─────────────────────────────────────────────────────────

def test_sensordetail_06_chart_or_history_renders(page):
    """A reading history chart or data table should be visible."""
    chart_sel = (By.CSS_SELECTOR,
                 "canvas, svg.recharts-surface, .apexcharts-canvas, "
                 "[class*='chart' i] svg, [class*='history' i], [class*='timeline' i]")
    table_sel = (By.CSS_SELECTOR, "table, [role='table'], [role='grid']")
    has_chart = page.is_present(chart_sel, 5)
    has_table = page.is_present(table_sel, 2)
    if not has_chart and not has_table:
        pytest.skip("No chart or history table on sensor detail (may be by design)")
    if has_chart:
        chart = page.visible(chart_sel)
        assert chart.size["height"] > 50, "Chart rendered with zero height"


def test_sensordetail_07_chart_has_time_axis_or_label(page):
    """Chart should show time-based or labelled data."""
    chart_sel = (By.CSS_SELECTOR,
                 "canvas, svg.recharts-surface, .apexcharts-canvas, [class*='chart' i] svg")
    if not page.is_present(chart_sel, 3):
        pytest.skip("No chart")
    text = page.body_text()
    has_time = re.search(r"\d{1,2}[:/]\d{2}|\d{4}-\d{2}-\d{2}|\w{3} \d{1,2}", text)
    assert has_time or page.headings(), "Chart has no time labels or page headings"


# ── Edit / actions ──────────────────────────────────────────────────────────

def test_sensordetail_08_edit_button_present(page):
    """An Edit button or link should be available for the sensor."""
    edit = clickable("edit", "update", "modify")
    if not page.is_present(edit, 2):
        pytest.skip("No Edit button on sensor detail (read-only view)")
    btn = page.driver.find_elements(*edit)
    assert any(b.is_displayed() for b in btn), "Edit button is not visible"


def test_sensordetail_09_edit_form_opens_and_cancels(page):
    """Opening the edit form and cancelling must return to the detail view."""
    edit = clickable("edit", "update", "modify")
    if not page.is_present(edit, 2):
        pytest.skip("No Edit button")
    url_before = page.driver.current_url
    page.click(edit)
    # Form may open as modal or new page
    modal = page.visible_modal()
    if modal:
        cancel = clickable("cancel", "close")
        if page.is_present(cancel, 2):
            page.click(cancel)
            page.wait_modal_closed()
    else:
        # Navigated to edit page – go back
        back = clickable("cancel", "back", "discard")
        if page.is_present(back, 2):
            page.click(back)
        else:
            page.driver.back()
    WebDriverWait(page.driver, 5).until(lambda d: "/sensors/" in d.current_url)
    assert ui.error_screen_text(page.driver) is None


# ── Navigation ──────────────────────────────────────────────────────────────

def test_sensordetail_10_back_returns_to_sensors_list(page):
    """Back button or browser back must return to /admin/sensors."""
    back = clickable("back", "sensors", "list")
    if page.is_present(back, 1):
        page.click(back)
    else:
        page.driver.back()
    WebDriverWait(page.driver, 5).until(
        lambda d: d.current_url.rstrip("/").endswith(SENSORS_PATH.rstrip("/"))
    )


def test_sensordetail_11_refresh_keeps_detail(page):
    """Refreshing must not crash or redirect away from the detail."""
    url = page.driver.current_url
    page.driver.refresh()
    page.wait_loaded()
    assert page.driver.current_url == url
    assert ui.error_screen_text(page.driver) is None


def test_sensordetail_12_invalid_id_handled_gracefully(admin_driver):
    """Navigating to a non-existent sensor id must not throw an error screen."""
    p = BasePage(admin_driver).open(SENSORS_PATH + "/99999999")
    assert p.body_text().strip(), "Blank white page for invalid sensor id"
    err = ui.error_screen_text(admin_driver)
    assert err in (None, "page not found", "Page not found"), f"Crash on invalid sensor id: {err}"


# ── Quality ─────────────────────────────────────────────────────────────────

def test_sensordetail_13_no_ui_defects(page):
    assert ui.run_all_basic(page.driver) == {}


@pytest.mark.responsive
def test_sensordetail_14_mobile_layout(page):
    page.driver.set_window_size(*config.VIEWPORTS["mobile"])
    page.wait_loaded()
    assert ui.horizontal_overflow(page.driver) is None


def test_sensordetail_15_tab_title_not_empty(page):
    assert page.driver.title.strip(), "Sensor detail page has an empty <title>"
    assert page.driver.title.strip().lower() not in ("react app", "vite + react"), \
        "Default template title still in use"
