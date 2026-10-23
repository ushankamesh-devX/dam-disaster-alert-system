"""test_08a_map_detailed_page.py
Tests for the dam-specific map page: /admin/dams/:id/map (MapDetailedPage).

Flow: Login → Dams list → open first dam → navigate to its /map sub-route.
Skips automatically if there are no dams in the database.
"""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

import config
from pages.base_page import BasePage, clickable
from utils import map_checks as mc
from utils import ui_checks as ui

pytestmark = pytest.mark.map

DAMS_PATH = config.ADMIN_PAGES["dams"]["path"]


@pytest.fixture
def page(admin_driver):
    """Open the Dams list, open the first dam detail, then navigate to its map."""
    p = BasePage(admin_driver).open(DAMS_PATH)
    rows = p.visible_all(p.ROWS)
    if not rows:
        pytest.skip("No dams in the database – cannot reach the detailed map")

    # Click the first row / its first action control
    ctrl = rows[0].find_elements(By.CSS_SELECTOR, "a, button")
    (ctrl[0] if ctrl else rows[0]).click()
    p.wait_loaded()

    # Try to find a "Map" link on the detail page
    map_link = clickable("map", "view map", "open map", "detailed map")
    if p.is_present(map_link, 3):
        p.click(map_link)
    else:
        # Navigate directly to the map sub-route by appending /map to current URL
        detail_url = admin_driver.current_url
        if "/dams/" in detail_url and not detail_url.rstrip("/").endswith("/map"):
            admin_driver.get(detail_url.rstrip("/") + "/map")
        p.wait_loaded()

    if "/map" not in admin_driver.current_url and "map" not in admin_driver.current_url.lower():
        pytest.skip("Could not navigate to the dam detailed map page")

    return p


# ── Map rendering ───────────────────────────────────────────────────────────

def test_mapdtl_01_map_container_visible_with_size(page):
    """The map container must be at least 200 × 200 px."""
    mc.map_visible_with_size(page)


def test_mapdtl_02_map_tiles_load(page):
    """Leaflet tiles (or canvas/image fallback) must appear within 15 s."""
    mc.tiles_loaded(page)


def test_mapdtl_03_at_least_one_marker_present(page):
    """The dam marker should be placed on the map."""
    mc.markers_present(page, minimum=1)


def test_mapdtl_04_zoom_controls_work(page):
    """Clicking zoom-in / zoom-out must not crash the map."""
    mc.zoom_controls_work(page)


def test_mapdtl_05_marker_click_shows_popup(page):
    """Clicking a map marker must open a non-empty popup."""
    mc.marker_click_shows_popup(page)


# ── Info panel / sidebar ────────────────────────────────────────────────────

def test_mapdtl_06_page_has_heading(page):
    assert page.headings(), "Detailed map page has no heading"


def test_mapdtl_07_dam_info_panel_present(page):
    """Expect an info / sidebar showing dam readings or metadata."""
    info = (By.CSS_SELECTOR,
            "[class*='info' i], [class*='panel' i], [class*='sidebar' i], "
            "[class*='detail' i], [data-testid*='info']")
    # It's acceptable to show the info inside the page body text
    has_panel = page.is_present(info, 3)
    has_data = any(w in page.body_text().lower()
                   for w in ("water level", "level", "status", "capacity", "sensor", "reading"))
    assert has_panel or has_data, "No dam info panel or sensor readings visible on the map page"


def test_mapdtl_08_sensor_readings_or_status_visible(page):
    import re
    assert re.search(r"\d", page.body_text()), "No numeric reading on detailed map page"


# ── Navigation ──────────────────────────────────────────────────────────────

def test_mapdtl_09_back_returns_to_dam_detail_or_list(page):
    back = clickable("back")
    if page.is_present(back, 1):
        page.click(back)
    else:
        page.driver.back()
    WebDriverWait(page.driver, 5).until(
        lambda d: "/dams" in d.current_url
    )


def test_mapdtl_10_refresh_keeps_map(page):
    url = page.driver.current_url
    page.driver.refresh()
    page.wait_loaded()
    assert page.driver.current_url == url
    assert ui.error_screen_text(page.driver) is None


# ── Quality ─────────────────────────────────────────────────────────────────

def test_mapdtl_11_no_ui_defects(page):
    assert ui.run_all_basic(page.driver) == {}


@pytest.mark.responsive
def test_mapdtl_12_mobile_layout(page):
    page.driver.set_window_size(*config.VIEWPORTS["mobile"])
    page.wait_loaded()
    assert ui.horizontal_overflow(page.driver) is None
    # Map must still be visible (may be smaller)
    assert page.is_present(mc.MAP, 5)
