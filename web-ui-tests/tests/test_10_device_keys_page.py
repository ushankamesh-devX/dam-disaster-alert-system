import pytest
import config
from pages.base_page import BasePage
from utils import crud_checks as crud
from utils import ui_checks as ui

pytestmark = pytest.mark.admin
KEY = "device_keys"
EXPECTED_COLUMNS = [c for c in "".split(",") if c]


@pytest.fixture
def page(admin_driver):
    p = BasePage(admin_driver)
    p.path = config.ADMIN_PAGES[KEY]["path"]
    return p.open()


def test_device_keys_01_table_and_columns(page):
    crud.table_is_rendered(page, EXPECTED_COLUMNS)


def test_device_keys_02_rows_or_empty_state(page):
    crud.has_rows_or_empty_state(page)


def test_device_keys_03_search_filters_rows(page):
    crud.search_filters(page)


def test_device_keys_04_add_button_opens_form(page):
    crud.open_add_form(page)


def test_device_keys_05_required_field_validation(page):
    crud.required_validation(page)


def test_device_keys_06_cancel_closes_form(page):
    crud.cancel_closes_form(page)


def test_device_keys_07_row_actions_present(page):
    crud.row_actions_present(page)


def test_device_keys_08_delete_asks_confirmation(page):
    crud.delete_asks_confirmation_and_cancel_keeps_row(page)


def test_device_keys_09_pagination(page):
    crud.pagination_works(page)


def test_device_keys_10_sorting_does_not_break(page):
    crud.sorting_does_not_break(page)


def test_device_keys_11_no_ui_defects(page):
    assert ui.run_all_basic(page.driver) == {}


def test_device_keys_12_keys_are_masked_or_copyable(page):
    import re
    from pages.base_page import clickable
    if page.row_count() == 0:
        pytest.skip('No keys listed')
    masked = re.search(r'[•*]{4,}', page.body_text())
    copy = page.visible_all(clickable('copy'))
    assert masked or copy, 'Keys are shown in plain text with no copy button (security / usability issue)'


def test_device_keys_13_generate_button_present(page):
    from pages.base_page import clickable
    assert page.is_present(clickable('generate', 'new', 'add', 'create'), 3)

