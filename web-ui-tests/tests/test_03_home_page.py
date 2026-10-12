import pytest
from selenium.webdriver.common.by import By

import config
from pages.base_page import BasePage, clickable
from utils import ui_checks as ui

HOME = (By.CSS_SELECTOR, "nav, header")


def test_home_01_loads_with_navigation(driver):
    p = BasePage(driver).open("/")
    assert p.is_present(HOME, 5), "No <nav>/<header> found"


def test_home_02_hero_section_has_text_and_cta(driver):
    p = BasePage(driver).open("/")
    assert len(p.body_text().strip()) > 30, "Home page looks empty"
    assert p.visible_all(clickable("login", "sign in", "get started", "dashboard", "view")), "No call-to-action button/link"


def test_home_03_every_internal_nav_link_works(driver):
    p = BasePage(driver).open("/")
    hrefs = driver.execute_script("""
        return [...new Set(Array.from(document.querySelectorAll('nav a[href], header a[href]'))
          .map(a => a.getAttribute('href')).filter(h => h && h.startsWith('/') && h.length > 1))];""")
    if not hrefs:
        pytest.skip("No internal nav links")
    for h in hrefs:
        p.open(h)
        assert ui.error_screen_text(driver) is None, f"Error screen at {h}"


def test_home_04_login_cta_goes_to_login(driver):
    p = BasePage(driver).open("/")
    loc = clickable("login", "sign in")
    if not p.is_present(loc, 1):
        pytest.skip("No login button on home page")
    p.click(loc)
    p.wait.until(lambda d: "login" in d.current_url)


def test_home_05_footer_visible(driver):
    p = BasePage(driver).open("/")
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight)")
    if not driver.find_elements(By.CSS_SELECTOR, "footer"):
        pytest.skip("No <footer> on home page")
    assert driver.find_element(By.CSS_SELECTOR, "footer").is_displayed()


def test_home_06_images_load(driver):
    BasePage(driver).open("/")
    assert ui.broken_images(driver) == []


@pytest.mark.responsive
def test_home_07_mobile_menu_or_nav_visible(driver):
    driver.set_window_size(*config.VIEWPORTS["mobile"])
    p = BasePage(driver).open("/")
    burger = (By.CSS_SELECTOR, "button[aria-label*='menu' i], [class*='hamburger' i], [class*='burger' i], [class*='menu-toggle' i]")
    links = p.visible_all((By.CSS_SELECTOR, "nav a"))
    assert links or p.is_present(burger, 2), "On mobile neither nav links nor a menu button are visible"
    assert ui.horizontal_overflow(driver) is None


def test_home_08_scroll_does_not_hide_header_content(driver):
    p = BasePage(driver).open("/")
    driver.execute_script("window.scrollTo(0, 600)")
    driver.execute_script("window.scrollTo(0, 0)")
    assert p.is_present(HOME, 2)
