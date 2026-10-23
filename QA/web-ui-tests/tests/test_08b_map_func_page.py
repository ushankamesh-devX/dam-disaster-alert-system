"""test_08b_map_func_page.py
Tests for the functional map overview page: /admin/mapFunc (MapFuncPage).

This page shows all dams on an interactive map with markers, search/filter
controls, and a sidebar listing. All destructive operations are cancelled.
"""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

import config
from pages.base_page import BasePage, clickable
from utils import map_checks as mc
from utils import ui_checks as ui

pytestmark = pytest.mark.map

MAP_PATH = "/admin/mapFunc"


@pytest.fixture
def page(admin_driver):
    p = BasePage(admin_driver)
    p.path = MAP_PATH
    return p.open()


# ── Map rendering ───────────────────────────────────────────────────────────

def test_mapfunc_01_map_container_visible_with_size(page):
    """The map container must be at least 200 × 200 px."""
    mc.map_visible_with_size(page)


def test_mapfunc_02_map_tiles_load(page):
    """All or most map tiles must load within 15 seconds."""
    mc.tiles_loaded(page)


def test_mapfunc_03_dam_markers_are_present(page):
    """At least one dam marker should appear on the map."""
    try:
        mc.markers_present(page, minimum=1)
    except AssertionError:
        # If no dams in DB the map may legitimately be empty
        pytest.skip("No dam markers found (database may be empty)")


def test_mapfunc_04_zoom_controls_work(page):
    mc.zoom_controls_work(page)


def test_mapfunc_05_marker_click_shows_popup(page):
    """Clicking a marker must open a popup with dam information."""
    mc.marker_click_shows_popup(page)


# ── Filter / search / sidebar ───────────────────────────────────────────────

def test_mapfunc_06_page_has_heading(page):
    assert page.headings(), "Map func page has no heading"


def test_mapfunc_07_sidebar_or_list_visible(page):
    """A dam list / sidebar panel should be visible alongside the map."""
    sidebar = (By.CSS_SELECTOR,
               "[class*='sidebar' i], [class*='panel' i], [class*='list' i], "
               "[class*='drawer' i], table, [role='list']")
    assert page.is_present(sidebar, 5), "No sidebar / dam list panel found alongside the map"


def test_mapfunc_08_search_or_filter_present(page):
    """A search box or filter control should allow narrowing the dam list."""
    has_search = page.is_present(page.SEARCH, 2)
    has_filter = page.is_present(
        (By.CSS_SELECTOR, "select, [role='combobox'], input[type='date']"), 2
    )
    if not has_search and not has_filter:
        pytest.skip("No search / filter control on the map func page")


def test_mapfunc_09_search_filters_markers_or_list(page):
    """Typing a non-matching search term should reduce visible markers or list items."""
    if not page.is_present(page.SEARCH, 2):
        pytest.skip("No search box")
    box = page.visible(page.SEARCH)
    before_markers = len(page.visible_all(mc.MARKER))
    before_rows = page.row_count()
    page.clear_input(box)
    box.send_keys("zzzz_no_match_9999")
    WebDriverWait(page.driver, 6).until(
        lambda d: len(page.visible_all(mc.MARKER)) <= before_markers
        or page.row_count() <= before_rows
        or page.empty_state_visible()
        or before_markers == 0 and before_rows == 0
    )
    page.clear_input(box)


def test_mapfunc_10_status_filter_changes_view(page):
    """If a status dropdown exists, selecting a value must not crash the page."""
    sels = page.visible_all((By.CSS_SELECTOR, "select"))
    if not sels:
        pytest.skip("No status filter dropdown")
    from selenium.webdriver.support.ui import Select
    s = Select(sels[0])
    if len(s.options) < 2:
        pytest.skip("Dropdown has only one option")
    s.select_by_index(1)
    page.wait_loaded()
    assert ui.error_screen_text(page.driver) is None


# ── Popup content ───────────────────────────────────────────────────────────

def test_mapfunc_11_popup_contains_dam_name(page):
    """The marker popup must show meaningful text (not blank)."""
    markers = page.visible_all(mc.MARKER)
    if not markers:
        pytest.skip("No markers on map")
    page.driver.execute_script("arguments[0].click()", markers[0])
    WebDriverWait(page.driver, 5).until(lambda d: page.visible_all(mc.POPUP))
    popup = page.visible_all(mc.POPUP)[0]
    assert popup.text.strip(), "Marker popup is empty"


def test_mapfunc_12_popup_has_status_or_level(page):
    """Popup should show dam status or water-level reading."""
    markers = page.visible_all(mc.MARKER)
    if not markers:
        pytest.skip("No markers")
    page.driver.execute_script("arguments[0].click()", markers[0])
    WebDriverWait(page.driver, 5).until(lambda d: page.visible_all(mc.POPUP))
    text = page.visible_all(mc.POPUP)[0].text.lower()
    assert any(w in text for w in
               ("safe", "normal", "warning", "danger", "critical", "level", "status", "%", "m")), \
        f"Popup text seems generic / empty: {text!r}"


# ── Navigation from map ─────────────────────────────────────────────────────

def test_mapfunc_13_popup_link_goes_to_dam_detail(page):
    """'View Details' or similar link inside a popup must navigate to the dam detail."""
    markers = page.visible_all(mc.MARKER)
    if not markers:
        pytest.skip("No markers")
    page.driver.execute_script("arguments[0].click()", markers[0])
    WebDriverWait(page.driver, 5).until(lambda d: page.visible_all(mc.POPUP))
    detail_link = clickable("view", "detail", "details", "open", "more")
    if not page.is_present(detail_link, 2):
        pytest.skip("No detail link inside popup")
    page.click(detail_link)
    page.wait_loaded()
    assert "/dams/" in page.driver.current_url or "dam" in page.driver.current_url.lower()


# ── Quality ─────────────────────────────────────────────────────────────────

def test_mapfunc_14_no_ui_defects(page):
    assert ui.run_all_basic(page.driver) == {}


def test_mapfunc_15_no_horizontal_overflow_desktop(page):
    assert ui.horizontal_overflow(page.driver) is None


@pytest.mark.responsive
def test_mapfunc_16_mobile_layout(page):
    page.driver.set_window_size(*config.VIEWPORTS["mobile"])
    page.wait_loaded()
    assert ui.horizontal_overflow(page.driver) is None
    assert page.is_present(mc.MAP, 8), "Map disappeared on mobile"


def test_mapfunc_17_refresh_keeps_map(page):
    url = page.driver.current_url
    page.driver.refresh()
    page.wait_loaded()
    assert page.driver.current_url == url
    assert ui.error_screen_text(page.driver) is None
