import pytest
import config
from pages.base_page import BasePage
from utils import crud_checks as crud
from utils import ui_checks as ui

pytestmark = pytest.mark.admin
KEY = "dams"
EXPECTED_COLUMNS = [c for c in "name,status".split(",") if c]


@pytest.fixture
def page(admin_driver):
    p = BasePage(admin_driver)
    p.path = config.ADMIN_PAGES[KEY]["path"]
    return p.open()


def test_dams_01_table_and_columns(page):
    crud.table_is_rendered(page, EXPECTED_COLUMNS)


def test_dams_02_rows_or_empty_state(page):
    crud.has_rows_or_empty_state(page)


def test_dams_03_search_filters_rows(page):
    crud.search_filters(page)


def test_dams_04_add_button_opens_form(page):
    crud.open_add_form(page)


def test_dams_05_required_field_validation(page):
    crud.required_validation(page)


def test_dams_06_cancel_closes_form(page):
    crud.cancel_closes_form(page)


def test_dams_07_row_actions_present(page):
    crud.row_actions_present(page)


def test_dams_08_delete_asks_confirmation(page):
    crud.delete_asks_confirmation_and_cancel_keeps_row(page)


def test_dams_09_pagination(page):
    crud.pagination_works(page)


def test_dams_10_sorting_does_not_break(page):
    crud.sorting_does_not_break(page)


def test_dams_11_no_ui_defects(page):
    assert ui.run_all_basic(page.driver) == {}


def test_dams_12_row_click_opens_detail(page):
    from selenium.webdriver.common.by import By
    rows = page.visible_all(page.ROWS)
    if not rows:
        pytest.skip('No dams listed')
    link = rows[0].find_elements(By.CSS_SELECTOR, 'a, button')
    (link[0] if link else rows[0]).click()
    page.wait.until(lambda d: d.current_url.rstrip('/') != (config.BASE_URL + config.ADMIN_PAGES[KEY]['path']).rstrip('/'))
    assert ui.error_screen_text(page.driver) is None


def test_dams_13_status_values_are_readable(page):
    text = page.body_text().lower()
    assert any(w in text for w in ('safe', 'normal', 'warning', 'danger', 'critical', 'active', 'online', 'offline')) or page.row_count() == 0

