import re
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

import config
from pages.base_page import BasePage, clickable
from utils import ui_checks as ui

pytestmark = pytest.mark.admin
DAMS = config.ADMIN_PAGES["dams"]["path"]


@pytest.fixture
def page(admin_driver):
    """Open the Dams list, then open the first dam (real user flow)."""
    p = BasePage(admin_driver).open(DAMS)
    rows = p.visible_all(p.ROWS)
    if not rows:
        pytest.skip("No dams in the database to open")
    ctrl = rows[0].find_elements(By.CSS_SELECTOR, "a, button")
    (ctrl[0] if ctrl else rows[0]).click()
    p.wait_loaded()
    return p


def test_damdetail_01_opens_from_list_with_name_heading(page):
    assert page.headings(), "Detail page has no heading (dam name)"


def test_damdetail_02_shows_sensor_readings_with_units(page):
    text = page.body_text().lower()
    assert re.search(r"\d", text), "No numeric readings shown"
    assert any(w in text for w in ("water level", "level", "rainfall", "flow", "capacity", "gate", "sensor")), "No sensor/level labels"


def test_damdetail_03_values_have_units(page):
    assert re.search(r"\d+(\.\d+)?\s?(m|cm|mm|%|m³|m3|cumecs|l/s)\b", page.body_text(), re.I), "Readings have no units"


def test_damdetail_04_chart_or_gauge_renders(page):
    loc = (By.CSS_SELECTOR, "canvas, svg.recharts-surface, .apexcharts-canvas, [class*='chart' i] svg, [class*='gauge' i]")
    if not page.is_present(loc, 3):
        pytest.skip("No chart/gauge found on this page")
    assert page.visible(loc).size["height"] > 50


def test_damdetail_05_status_badge_visible(page):
    assert any(w in page.body_text().lower() for w in ("safe", "normal", "warning", "danger", "critical", "alert"))


def test_damdetail_06_back_button_returns_to_list(page):
    back = clickable("back")
    if page.is_present(back, 1):
        page.click(back)
    else:
        page.driver.back()
    WebDriverWait(page.driver, 5).until(lambda d: d.current_url.rstrip("/").endswith(DAMS.rstrip("/")))


def test_damdetail_07_refresh_keeps_detail(page):
    url = page.driver.current_url
    page.driver.refresh()
    page.wait_loaded()
    assert page.driver.current_url == url and ui.error_screen_text(page.driver) is None


def test_damdetail_08_invalid_id_handled_gracefully(admin_driver):
    p = BasePage(admin_driver).open(DAMS + "/99999999")
    assert ui.error_screen_text(admin_driver) in (None, "page not found", "Page not found"), "Crash on invalid dam id"
    assert p.body_text().strip(), "Blank white page for invalid id"


def test_damdetail_09_no_ui_defects(page):
    assert ui.run_all_basic(page.driver) == {}


@pytest.mark.responsive
def test_damdetail_10_mobile_layout(page):
    page.driver.set_window_size(*config.VIEWPORTS["mobile"])
    page.wait_loaded()
    assert ui.horizontal_overflow(page.driver) is None
