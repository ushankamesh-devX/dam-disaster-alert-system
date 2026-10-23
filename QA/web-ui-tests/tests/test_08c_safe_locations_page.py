"""test_08c_safe_locations_page.py
Tests for the Safe Locations map page: /admin/system-safe-locations-test
(SystemSafeLocationsMapFuncPage).

This page shows a map of safe evacuation locations. It may include:
  - A map with safe-location markers
  - A list / table of locations
  - Add / Edit / Delete controls (delete is always CANCELLED)
"""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

import config
from pages.base_page import BasePage, clickable
from utils import map_checks as mc
from utils import crud_checks as crud
from utils import ui_checks as ui

pytestmark = pytest.mark.map

SAFE_PATH = "/admin/system-safe-locations-test"


@pytest.fixture
def page(admin_driver):
    p = BasePage(admin_driver)
    p.path = SAFE_PATH
    return p.open()


# ── Map rendering ───────────────────────────────────────────────────────────

def test_safeloc_01_map_container_visible_with_size(page):
    """The map container must be at least 200 × 200 px."""
    mc.map_visible_with_size(page)


def test_safeloc_02_tiles_load(page):
    mc.tiles_loaded(page)


def test_safeloc_03_zoom_controls_work(page):
    mc.zoom_controls_work(page)


def test_safeloc_04_markers_or_pins_visible(page):
    """Safe-location pins / markers should be present if any locations are saved."""
    markers = page.visible_all(mc.MARKER)
    if not markers:
        pytest.skip("No safe-location markers (database may be empty)")
    assert len(markers) >= 1


def test_safeloc_05_marker_click_shows_popup(page):
    mc.marker_click_shows_popup(page)


# ── List / CRUD section ─────────────────────────────────────────────────────

def test_safeloc_06_page_has_heading(page):
    assert page.headings(), "Safe locations page has no heading"


def test_safeloc_07_list_or_table_visible(page):
    """Besides the map, a list / table of locations should be shown."""
    list_sel = (By.CSS_SELECTOR,
                "table, [role='table'], [role='grid'], [role='list'], "
                "[class*='location' i], [class*='list' i], [class*='panel' i]")
    assert page.is_present(list_sel, 5), \
        "No location list / table found on safe locations page"


def test_safeloc_08_add_button_opens_form_or_map_click(page):
    """Either an Add button exists, or users add locations by clicking the map."""
    add_btn = clickable("add", "new", "create", "add location", "pin")
    if page.is_present(add_btn, 2):
        crud.open_add_form(page)
    else:
        # Accept map-click-to-add pattern
        assert page.is_present(mc.MAP, 3), "Neither an Add button nor a map is present"


def test_safeloc_09_required_field_validation(page):
    """If a form exists, submitting it empty must show validation errors."""
    add_btn = clickable("add", "new", "create", "add location")
    if not page.is_present(add_btn, 2):
        pytest.skip("No Add button – location is added by map click")
    crud.required_validation(page)


def test_safeloc_10_cancel_closes_form(page):
    """Cancel button must dismiss the form without making any change."""
    add_btn = clickable("add", "new", "create", "add location")
    if not page.is_present(add_btn, 2):
        pytest.skip("No Add button")
    crud.cancel_closes_form(page)


def test_safeloc_11_row_actions_present(page):
    """Each location row must have at least one action (view / edit / delete)."""
    rows = page.visible_all(page.ROWS)
    if not rows:
        pytest.skip("No location rows to check")
    crud.row_actions_present(page)


def test_safeloc_12_delete_asks_confirmation(page):
    """Deleting a location must show a confirmation dialog; cancel keeps the row."""
    rows = page.visible_all(page.ROWS)
    if not rows:
        pytest.skip("No location rows to test delete on")
    crud.delete_asks_confirmation_and_cancel_keeps_row(page)


# ── Location content ────────────────────────────────────────────────────────

def test_safeloc_13_location_names_visible(page):
    """Safe location names / descriptions must appear on the page."""
    rows = page.visible_all(page.ROWS)
    if not rows:
        pytest.skip("No rows to inspect")
    assert any(r.text.strip() for r in rows), "Location rows are blank"


def test_safeloc_14_coordinates_or_address_shown(page):
    """Latitude/longitude or an address should be shown for each location."""
    import re
    text = page.body_text()
    has_coords = re.search(r"-?\d{1,3}\.\d+", text)   # lat/lng pattern
    has_address = any(w in text.lower() for w in ("street", "rd", "road", "avenue", "ave", "district"))
    if page.row_count() == 0:
        pytest.skip("No rows")
    assert has_coords or has_address, "No coordinates or address found on safe locations page"


# ── Quality ─────────────────────────────────────────────────────────────────

def test_safeloc_15_no_ui_defects(page):
    assert ui.run_all_basic(page.driver) == {}


def test_safeloc_16_no_horizontal_overflow(page):
    assert ui.horizontal_overflow(page.driver) is None


@pytest.mark.responsive
def test_safeloc_17_mobile_layout(page):
    page.driver.set_window_size(*config.VIEWPORTS["mobile"])
    page.wait_loaded()
    assert ui.horizontal_overflow(page.driver) is None
    assert page.is_present(mc.MAP, 8), "Map not visible on mobile"


def test_safeloc_18_refresh_keeps_page(page):
    url = page.driver.current_url
    page.driver.refresh()
    page.wait_loaded()
    assert page.driver.current_url == url
    assert ui.error_screen_text(page.driver) is None
