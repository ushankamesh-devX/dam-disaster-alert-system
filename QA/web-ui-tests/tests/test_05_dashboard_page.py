import re
import pytest
from selenium.webdriver.common.by import By

import config
from pages.base_page import BasePage
from utils import ui_checks as ui

pytestmark = pytest.mark.admin
CARDS = (By.CSS_SELECTOR, "[data-testid^='stat'], [class*='stat' i], [class*='card' i], [class*='kpi' i]")
CHARTS = (By.CSS_SELECTOR, "canvas, svg.recharts-surface, .apexcharts-canvas, .highcharts-container, [class*='chart' i] svg")


@pytest.fixture
def page(admin_driver):
    return BasePage(admin_driver).open(config.ADMIN_PAGES["dashboard"]["path"])


def test_dash_01_summary_cards_visible(page):
    assert len(page.visible_all(CARDS)) >= 1, "No summary/stat cards found"


def test_dash_02_cards_show_numbers_not_blank(page):
    cards = page.visible_all(CARDS)
    with_digit = [c for c in cards if re.search(r"\d", c.text)]
    assert with_digit, "None of the summary cards show a number"


def test_dash_03_no_nan_or_undefined(page):
    assert ui.bad_text(page.driver) == []


def test_dash_04_charts_render_with_size(page):
    charts = page.visible_all(CHARTS)
    if not charts:
        pytest.skip("No charts found (update CHARTS locator if you use a different library)")
    assert any(c.size["width"] > 100 and c.size["height"] > 80 for c in charts), "Charts have zero size"


def test_dash_05_chart_has_title_or_legend(page):
    if not page.visible_all(CHARTS):
        pytest.skip("No charts")
    assert page.headings(), "Dashboard sections have no headings"


def test_dash_06_cards_do_not_overlap(page):
    cards = page.visible_all(CARDS)[:12]
    rects = [c.rect for c in cards]
    for i in range(len(rects)):
        for j in range(i + 1, len(rects)):
            a, b = rects[i], rects[j]
            inter_w = min(a["x"] + a["width"], b["x"] + b["width"]) - max(a["x"], b["x"])
            inter_h = min(a["y"] + a["height"], b["y"] + b["height"]) - max(a["y"], b["y"])
            if inter_w > 5 and inter_h > 5:
                # nested elements (card inside card) are fine; identical-size siblings are not
                if abs(a["width"] - b["width"]) < 2 and abs(a["height"] - b["height"]) < 2 and (a["x"], a["y"]) != (b["x"], b["y"]):
                    pytest.fail(f"Cards {i} and {j} overlap")


def test_dash_07_cards_wrap_on_mobile(page):
    page.driver.set_window_size(*config.VIEWPORTS["mobile"])
    page.wait_loaded()
    assert ui.horizontal_overflow(page.driver) is None


def test_dash_08_page_loads_data_within_timeout(page):
    assert page.is_present(CARDS, config.TIMEOUT)
    assert not page.visible_all((By.CSS_SELECTOR, "[class*='spinner' i], [role='progressbar']")), "Loading indicator never disappeared"
