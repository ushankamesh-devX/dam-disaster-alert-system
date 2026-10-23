"""COPY THIS FILE for the two cut-off pages in your screenshot (the ones starting with 'Se...').
1. Add them to config.ADMIN_PAGES  -> generic tests (test_00) run on them automatically.
2. Copy this template, rename, and add page-specific checks."""
import pytest
import config
from pages.base_page import BasePage
from utils import ui_checks as ui

pytestmark = pytest.mark.admin
KEY = "dashboard"   # change to your new key, e.g. "settings"


@pytest.fixture
def page(admin_driver):
    p = BasePage(admin_driver)
    p.path = config.ADMIN_PAGES[KEY]["path"]
    return p.open()


def test_template_01_no_ui_defects(page):
    assert ui.run_all_basic(page.driver) == {}
