"""Sidebar / header / logout - shared admin layout (src/layouts)."""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

import config
from pages.base_page import BasePage, clickable
from utils import ui_checks as ui

pytestmark = pytest.mark.admin
SIDEBAR_LINKS = (By.CSS_SELECTOR, "aside a[href], nav a[href], [class*='sidebar' i] a[href]")


@pytest.fixture
def page(admin_driver):
    return BasePage(admin_driver).open(config.ADMIN_PAGES["dashboard"]["path"])


def test_layout_01_sidebar_visible_with_links(page):
    assert len(page.visible_all(SIDEBAR_LINKS)) >= 5, "Sidebar should list the admin pages"


def test_layout_02_every_sidebar_link_opens_a_working_page(page):
    d = page.driver
    hrefs = d.execute_script("""
        return [...new Set(Array.from(document.querySelectorAll("aside a[href], nav a[href], [class*='sidebar' i] a[href]"))
          .map(a => a.getAttribute('href')).filter(h => h && h.startsWith('/')))];""")
    assert hrefs
    for h in hrefs:
        link = d.find_elements(By.CSS_SELECTOR, f"a[href='{h}']")
        link = [l for l in link if l.is_displayed()]
        if not link:
            continue
        link[0].click()
        page.wait_loaded()
        assert h in d.current_url, f"Clicking {h} went to {d.current_url}"
        assert ui.error_screen_text(d) is None, f"Error screen on {h}"


def test_layout_03_active_menu_item_is_highlighted(page):
    d = page.driver
    active = d.execute_script("""
        return !!document.querySelector("aside a[aria-current], aside a.active, nav a[aria-current], nav a.active, [class*='active' i] > a, a[class*='active' i]");""")
    assert active, "Current page is not highlighted in the sidebar (add .active or aria-current)"


def test_layout_04_header_shows_user_menu(page):
    loc = (By.CSS_SELECTOR, "[class*='avatar' i], [aria-label*='account' i], [aria-label*='profile' i], [class*='user' i], header button")
    assert page.is_present(loc, 3), "No user/profile control in header"


def test_layout_05_logout_returns_to_login_and_blocks_back(page):
    d = page.driver
    menu = d.find_elements(By.CSS_SELECTOR, "[class*='avatar' i], [aria-label*='account' i], [aria-label*='profile' i]")
    if menu and menu[0].is_displayed():
        menu[0].click()
    out = clickable("logout", "log out", "sign out")
    page.click(out)
    WebDriverWait(d, 8).until(lambda x: "/login" in x.current_url)
    d.back()
    page.wait_loaded()
    assert "/login" in d.current_url or d.find_elements(By.CSS_SELECTOR, "input[type='password']"), \
        "After logout the Back button re-opened a protected admin page"


@pytest.mark.responsive
@pytest.mark.parametrize("vp", ["tablet", "mobile"])
def test_layout_06_sidebar_collapses_on_small_screens(page, vp):
    d = page.driver
    d.set_window_size(*config.VIEWPORTS[vp])
    page.wait_loaded()
    toggle = (By.CSS_SELECTOR, "button[aria-label*='menu' i], [class*='hamburger' i], [class*='burger' i], [class*='toggle' i]")
    assert ui.horizontal_overflow(d) is None
    assert page.is_present(toggle, 2) or page.visible_all(SIDEBAR_LINKS), "No way to open navigation on small screen"


def test_layout_07_header_and_sidebar_stay_after_scroll(page):
    d = page.driver
    d.execute_script("window.scrollTo(0, document.body.scrollHeight)")
    assert page.visible_all(SIDEBAR_LINKS) or page.is_present((By.CSS_SELECTOR, "header"), 1)
