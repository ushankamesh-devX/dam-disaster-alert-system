import pytest
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait

import config
from pages.login_page import LoginPage
from utils import ui_checks as ui

pytestmark = pytest.mark.auth


def test_login_01_all_elements_visible(driver):
    p = LoginPage(driver).open()
    assert p.visible(p.EMAIL).is_displayed()
    assert p.visible(p.PASSWORD).is_displayed()
    btn = p.visible(p.SUBMIT)
    assert btn.text.strip(), "Submit button has no text"
    assert btn.is_enabled()


def test_login_02_fields_have_label_or_placeholder(driver):
    p = LoginPage(driver).open()
    assert ui.unlabeled_inputs(driver, allow_placeholder=True) == []


def test_login_03_password_is_masked(driver):
    p = LoginPage(driver).open()
    assert p.visible(p.PASSWORD).get_attribute("type") == "password"


def test_login_04_show_hide_password_toggle(driver):
    p = LoginPage(driver).open()
    if not p.is_present(p.TOGGLE, 1):
        pytest.skip("No show/hide password toggle")
    p.type(p.PASSWORD, "Secret123")
    p.click(p.TOGGLE)
    assert p.visible(p.PASSWORD).get_attribute("type") == "text"
    p.click(p.TOGGLE)
    assert p.visible(p.PASSWORD).get_attribute("type") == "password"


def test_login_05_empty_submit_blocked(driver):
    p = LoginPage(driver).open()
    p.click(p.SUBMIT)
    assert "/login" in driver.current_url
    assert driver.find_elements(*p.INVALID) or p.visible_all(p.ERROR), "No validation message for empty form"


def test_login_06_invalid_email_format_blocked(driver):
    p = LoginPage(driver).open()
    p.login("not-an-email", "Whatever1")
    assert "/login" in driver.current_url


def test_login_07_wrong_password_shows_error(driver):
    p = LoginPage(driver).open()
    p.login(config.ADMIN_EMAIL, "WrongPassword!999")
    WebDriverWait(driver, 8).until(lambda d: p.visible_all(p.ERROR))
    assert "/login" in driver.current_url
    assert "password" not in driver.current_url.lower()


def test_login_08_valid_login_redirects_to_admin(driver):
    p = LoginPage(driver).open()
    p.login(config.ADMIN_EMAIL, config.ADMIN_PASSWORD)
    WebDriverWait(driver, 10).until(lambda d: "/login" not in d.current_url)
    assert ui.error_screen_text(driver) is None


def test_login_09_enter_key_submits(driver):
    p = LoginPage(driver).open()
    p.type(p.EMAIL, config.ADMIN_EMAIL)
    p.type(p.PASSWORD, config.ADMIN_PASSWORD).send_keys(Keys.ENTER)
    WebDriverWait(driver, 10).until(lambda d: "/login" not in d.current_url)


def test_login_10_tab_order_email_then_password(driver):
    p = LoginPage(driver).open()
    p.visible(p.EMAIL).click()
    p.visible(p.EMAIL).send_keys(Keys.TAB)
    active = driver.switch_to.active_element
    assert active.get_attribute("type") == "password", "TAB from email should go to password"


def test_login_11_link_to_register_works(driver):
    p = LoginPage(driver).open()
    if not p.is_present(p.REGISTER_LINK, 1):
        pytest.skip("No register link on login page")
    p.click(p.REGISTER_LINK)
    WebDriverWait(driver, 5).until(lambda d: "register" in d.current_url or "signup" in d.current_url)


@pytest.mark.security
def test_login_12_xss_and_sql_input_do_not_break_ui(driver):
    p = LoginPage(driver).open()
    p.login("<script>alert(1)</script>", "' OR '1'='1")
    assert "/login" in driver.current_url
    from selenium.common.exceptions import NoAlertPresentException
    with pytest.raises(NoAlertPresentException):
        driver.switch_to.alert
    assert ui.error_screen_text(driver) is None


@pytest.mark.security
def test_login_13_credentials_never_in_url(driver):
    p = LoginPage(driver).open()
    p.login(config.ADMIN_EMAIL, "SomePass123")
    assert "SomePass123" not in driver.current_url


@pytest.mark.responsive
@pytest.mark.parametrize("vp", ["tablet", "mobile"])
def test_login_14_form_usable_on_small_screens(driver, vp):
    driver.set_window_size(*config.VIEWPORTS[vp])
    p = LoginPage(driver).open()
    for loc in (p.EMAIL, p.PASSWORD, p.SUBMIT):
        el = p.visible(loc)
        driver.execute_script("arguments[0].scrollIntoView({block:'center'})", el)
        assert el.is_displayed()
        assert el.rect["x"] >= 0 and el.rect["x"] + el.rect["width"] <= config.VIEWPORTS[vp][0] + 1
    assert ui.horizontal_overflow(driver) is None


def test_login_15_error_message_clears_on_retry(driver):
    p = LoginPage(driver).open()
    p.login(config.ADMIN_EMAIL, "bad-pass-1")
    WebDriverWait(driver, 8).until(lambda d: p.visible_all(p.ERROR))
    p.login(config.ADMIN_EMAIL, config.ADMIN_PASSWORD)
    WebDriverWait(driver, 10).until(lambda d: "/login" not in d.current_url)
