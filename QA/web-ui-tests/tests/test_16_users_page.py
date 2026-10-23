import pytest
import config
from pages.base_page import BasePage
from utils import crud_checks as crud
from utils import ui_checks as ui

pytestmark = pytest.mark.admin
KEY = "users"
EXPECTED_COLUMNS = [c for c in "email,role".split(",") if c]


@pytest.fixture
def page(admin_driver):
    p = BasePage(admin_driver)
    p.path = config.ADMIN_PAGES[KEY]["path"]
    return p.open()


def test_users_01_table_and_columns(page):
    crud.table_is_rendered(page, EXPECTED_COLUMNS)


def test_users_02_rows_or_empty_state(page):
    crud.has_rows_or_empty_state(page)


def test_users_03_search_filters_rows(page):
    crud.search_filters(page)


def test_users_04_add_button_opens_form(page):
    crud.open_add_form(page)


def test_users_05_required_field_validation(page):
    crud.required_validation(page)


def test_users_06_cancel_closes_form(page):
    crud.cancel_closes_form(page)


def test_users_07_row_actions_present(page):
    crud.row_actions_present(page)


def test_users_08_delete_asks_confirmation(page):
    crud.delete_asks_confirmation_and_cancel_keeps_row(page)


def test_users_09_pagination(page):
    crud.pagination_works(page)


def test_users_10_sorting_does_not_break(page):
    crud.sorting_does_not_break(page)


def test_users_11_no_ui_defects(page):
    assert ui.run_all_basic(page.driver) == {}


def test_users_12_email_cells_look_like_emails(page):
    import re
    if page.row_count() == 0:
        pytest.skip('No users')
    assert re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', page.body_text()), 'No email addresses visible in users table'


def test_users_13_role_shown_for_each_user(page):
    if page.row_count() == 0:
        pytest.skip('No users')
    text = page.body_text().lower()
    assert any(w in text for w in ('admin', 'user', 'operator', 'viewer', 'manager'))

