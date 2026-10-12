import pytest
import config
from pages.base_page import BasePage
from utils import crud_checks as crud
from utils import ui_checks as ui

pytestmark = pytest.mark.admin
KEY = "roles"
EXPECTED_COLUMNS = [c for c in "role".split(",") if c]


@pytest.fixture
def page(admin_driver):
    p = BasePage(admin_driver)
    p.path = config.ADMIN_PAGES[KEY]["path"]
    return p.open()


def test_roles_01_table_and_columns(page):
    crud.table_is_rendered(page, EXPECTED_COLUMNS)


def test_roles_02_rows_or_empty_state(page):
    crud.has_rows_or_empty_state(page)


def test_roles_03_search_filters_rows(page):
    crud.search_filters(page)


def test_roles_04_add_button_opens_form(page):
    crud.open_add_form(page)


def test_roles_05_required_field_validation(page):
    crud.required_validation(page)


def test_roles_06_cancel_closes_form(page):
    crud.cancel_closes_form(page)


def test_roles_07_row_actions_present(page):
    crud.row_actions_present(page)


def test_roles_08_delete_asks_confirmation(page):
    crud.delete_asks_confirmation_and_cancel_keeps_row(page)


def test_roles_09_pagination(page):
    crud.pagination_works(page)


def test_roles_10_sorting_does_not_break(page):
    crud.sorting_does_not_break(page)


def test_roles_11_no_ui_defects(page):
    assert ui.run_all_basic(page.driver) == {}


def test_roles_12_permission_checkbox_toggles_without_saving(page):
    from selenium.webdriver.common.by import By
    crud.open_add_form(page)
    boxes = page.visible_all((By.CSS_SELECTOR, "input[type='checkbox'], [role='checkbox'], [role='switch']"))
    if not boxes:
        pytest.skip('No permission checkboxes in the role form')
    before = boxes[0].is_selected() if boxes[0].tag_name == 'input' else boxes[0].get_attribute('aria-checked')
    page.driver.execute_script('arguments[0].click()', boxes[0])
    after = boxes[0].is_selected() if boxes[0].tag_name == 'input' else boxes[0].get_attribute('aria-checked')
    assert before != after, 'Permission checkbox did not change state'

