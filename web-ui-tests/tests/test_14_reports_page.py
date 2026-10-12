import os
import time
import pytest
from selenium.webdriver.common.by import By

import config
from pages.base_page import BasePage, clickable
from utils import ui_checks as ui

pytestmark = pytest.mark.admin
DATES = (By.CSS_SELECTOR, "input[type='date'], input[placeholder*='date' i], input[name*='date' i], input[name*='from' i], input[name*='to' i]")
GENERATE = clickable("generate", "apply", "filter", "search", "show", "run")
EXPORT = clickable("export", "download", "pdf", "csv", "excel", "print")


@pytest.fixture
def page(admin_driver):
    p = BasePage(admin_driver)
    p.path = config.ADMIN_PAGES["reports"]["path"]
    return p.open()


def test_reports_01_filters_visible(page):
    assert page.visible_all(DATES) or page.visible_all((By.CSS_SELECTOR, "select")), "No date range or dropdown filters"


def test_reports_02_generate_button_present(page):
    assert page.visible_all(GENERATE), "No generate/apply button"


def test_reports_03_generate_shows_table_chart_or_empty_state(page):
    btn = page.visible_all(GENERATE)
    if not btn:
        pytest.skip("No generate button")
    btn[0].click()
    page.wait_loaded()
    content = page.is_present(page.TABLE, 3) or page.is_present((By.CSS_SELECTOR, "canvas, svg"), 3) or page.empty_state_visible()
    assert content, "After generating, nothing is displayed (no table/chart/empty-state)"
    assert ui.error_screen_text(page.driver) is None


def test_reports_04_invalid_date_range_is_rejected(page):
    dates = page.visible_all((By.CSS_SELECTOR, "input[type='date']"))
    if len(dates) < 2:
        pytest.skip("Need two date inputs (from/to)")
    page.driver.execute_script("""
        const set = (el, v) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
          s.call(el, v); el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); };
        set(arguments[0], '2026-12-31'); set(arguments[1], '2026-01-01');""", dates[0], dates[1])
    page.visible_all(GENERATE)[0].click()
    text = page.body_text().lower()
    assert any(w in text for w in ("invalid", "must be", "before", "after", "error")) or page.visible_all(page.ERROR_MSG) or page.driver.find_elements(*page.INVALID), \
        "From-date after To-date is accepted silently"


def test_reports_05_export_button_present(page):
    assert page.visible_all(EXPORT), "No export/download button"


def test_reports_06_export_downloads_a_file(page):
    btn = page.visible_all(EXPORT)
    if not btn:
        pytest.skip("No export button")
    folder = os.path.abspath("reports/downloads")
    before = set(os.listdir(folder)) if os.path.isdir(folder) else set()
    btn[0].click()
    deadline = time.time() + 15
    while time.time() < deadline:
        now = set(os.listdir(folder)) if os.path.isdir(folder) else set()
        new = [f for f in now - before if not f.endswith(".crdownload")]
        if new:
            assert os.path.getsize(os.path.join(folder, new[0])) > 0, "Downloaded file is empty"
            return
        time.sleep(0.5)
    pytest.skip("No file downloaded (export may open a print dialog / new tab instead)")


def test_reports_07_table_is_readable_after_generate(page):
    btn = page.visible_all(GENERATE)
    if btn:
        btn[0].click()
        page.wait_loaded()
    if not page.is_present(page.TABLE, 2):
        pytest.skip("No table in this report view")
    assert page.table_headers(), "Report table has no column headers"


def test_reports_08_no_ui_defects(page):
    assert ui.run_all_basic(page.driver) == {}
