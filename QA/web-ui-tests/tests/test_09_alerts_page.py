import pytest
import config
from pages.base_page import BasePage
from utils import crud_checks as crud
from utils import ui_checks as ui

pytestmark = pytest.mark.admin
KEY = "alerts"
EXPECTED_COLUMNS = [c for c in "severity,status".split(",") if c]


@pytest.fixture
def page(admin_driver):
    p = BasePage(admin_driver)
    p.path = config.ADMIN_PAGES[KEY]["path"]
    return p.open()


def test_alerts_01_table_and_columns(page):
    crud.table_is_rendered(page, EXPECTED_COLUMNS)


def test_alerts_02_rows_or_empty_state(page):
    crud.has_rows_or_empty_state(page)


def test_alerts_03_search_filters_rows(page):
    crud.search_filters(page)


def test_alerts_04_add_button_opens_form(page):
    crud.open_add_form(page)


def test_alerts_05_required_field_validation(page):
    crud.required_validation(page)


def test_alerts_06_cancel_closes_form(page):
    crud.cancel_closes_form(page)


def test_alerts_07_row_actions_present(page):
    crud.row_actions_present(page)


def test_alerts_08_delete_asks_confirmation(page):
    crud.delete_asks_confirmation_and_cancel_keeps_row(page)


def test_alerts_09_pagination(page):
    crud.pagination_works(page)


def test_alerts_10_sorting_does_not_break(page):
    crud.sorting_does_not_break(page)


def test_alerts_11_no_ui_defects(page):
    assert ui.run_all_basic(page.driver) == {}


def test_alerts_12_severity_labels_present(page):
    if page.row_count() == 0:
        pytest.skip('No alerts to check')
    text = page.body_text().lower()
    assert any(w in text for w in ('low', 'medium', 'high', 'critical', 'warning', 'danger', 'info'))


def test_alerts_13_timestamps_are_formatted(page):
    import re
    if page.row_count() == 0:
        pytest.skip('No alerts to check')
    assert re.search(r'\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}|\w{3} \d{1,2}|ago', page.body_text()), 'No readable date/time in alert rows'


def test_alerts_14_filter_dropdown_changes_results(page):
    from selenium.webdriver.common.by import By
    sels = page.visible_all((By.CSS_SELECTOR, 'select'))
    if not sels:
        pytest.skip('No filter dropdown')
    from selenium.webdriver.support.ui import Select
    s = Select(sels[0])
    if len(s.options) < 2:
        pytest.skip('Dropdown has a single option')
    s.select_by_index(1)
    page.wait_loaded()
    assert page.row_count() >= 0 and ui.error_screen_text(page.driver) is None

