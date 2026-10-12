import pytest
import config
from pages.base_page import BasePage
from utils import crud_checks as crud
from utils import ui_checks as ui

pytestmark = pytest.mark.admin
KEY = "news"
EXPECTED_COLUMNS = [c for c in "title".split(",") if c]


@pytest.fixture
def page(admin_driver):
    p = BasePage(admin_driver)
    p.path = config.ADMIN_PAGES[KEY]["path"]
    return p.open()


def test_news_01_table_and_columns(page):
    crud.table_is_rendered(page, EXPECTED_COLUMNS)


def test_news_02_rows_or_empty_state(page):
    crud.has_rows_or_empty_state(page)


def test_news_03_search_filters_rows(page):
    crud.search_filters(page)


def test_news_04_add_button_opens_form(page):
    crud.open_add_form(page)


def test_news_05_required_field_validation(page):
    crud.required_validation(page)


def test_news_06_cancel_closes_form(page):
    crud.cancel_closes_form(page)


def test_news_07_row_actions_present(page):
    crud.row_actions_present(page)


def test_news_08_delete_asks_confirmation(page):
    crud.delete_asks_confirmation_and_cancel_keeps_row(page)


def test_news_09_pagination(page):
    crud.pagination_works(page)


def test_news_10_sorting_does_not_break(page):
    crud.sorting_does_not_break(page)


def test_news_11_no_ui_defects(page):
    assert ui.run_all_basic(page.driver) == {}


def test_news_12_article_images_have_alt(page):
    assert ui.images_without_alt(page.driver) == []


def test_news_13_long_titles_do_not_overflow(page):
    assert ui.horizontal_overflow(page.driver) is None

