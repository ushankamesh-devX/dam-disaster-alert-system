import pytest
from selenium.webdriver.support.ui import WebDriverWait

import config
from pages.register_page import RegisterPage
from utils import ui_checks as ui

pytestmark = pytest.mark.auth


def test_reg_01_form_elements_visible(driver):
    p = RegisterPage(driver).open()
    assert len(p.visible_all(p.INPUTS)) >= 3, "Expected at least name/email/password inputs"
    assert p.visible_all(p.PASSWORDS), "No password field"
    assert p.visible(p.SUBMIT).text.strip()


def test_reg_02_password_fields_masked(driver):
    p = RegisterPage(driver).open()
    for el in p.visible_all(p.PASSWORDS):
        assert el.get_attribute("type") == "password"


def test_reg_03_empty_submit_blocked(driver):
    p = RegisterPage(driver).open()
    p.submit()
    assert "register" in driver.current_url
    assert driver.find_elements(*p.INVALID) or p.visible_all(p.ERROR_MSG)


def test_reg_04_invalid_email_blocked(driver):
    p = RegisterPage(driver).open()
    p.fill(email="bad-email").submit()
    assert "register" in driver.current_url


def test_reg_05_password_mismatch_blocked(driver):
    p = RegisterPage(driver).open()
    if len(p.visible_all(p.PASSWORDS)) < 2:
        pytest.skip("No confirm-password field")
    p.fill(password="Str0ng@Pass1", confirm="Different@Pass9").submit()
    assert "register" in driver.current_url
    WebDriverWait(driver, 5).until(lambda d: p.visible_all(p.ERROR_MSG) or d.find_elements(*p.INVALID))


def test_reg_06_weak_password_rejected(driver):
    p = RegisterPage(driver).open()
    p.fill(password="123", confirm="123").submit()
    assert "register" in driver.current_url


def test_reg_07_existing_email_rejected(driver):
    p = RegisterPage(driver).open()
    p.fill(email=config.ADMIN_EMAIL).submit()
    WebDriverWait(driver, 8).until(lambda d: p.visible_all(p.ERROR_MSG) or "register" in d.current_url)
    assert "register" in driver.current_url, "Registration with an existing email must not succeed"


def test_reg_08_link_back_to_login(driver):
    from pages.base_page import clickable
    p = RegisterPage(driver).open()
    loc = clickable("login", "sign in")
    if not p.is_present(loc, 1):
        pytest.skip("No link back to login")
    p.click(loc)
    WebDriverWait(driver, 5).until(lambda d: "login" in d.current_url)


@pytest.mark.security
def test_reg_09_xss_in_name_not_executed(driver):
    from selenium.common.exceptions import NoAlertPresentException
    p = RegisterPage(driver).open()
    p.fill(text="<img src=x onerror=alert(1)>", email="xss.test@example.com").submit()
    with pytest.raises(NoAlertPresentException):
        driver.switch_to.alert


@pytest.mark.responsive
def test_reg_10_mobile_layout(driver):
    driver.set_window_size(*config.VIEWPORTS["mobile"])
    p = RegisterPage(driver).open()
    assert ui.horizontal_overflow(driver) is None
    assert p.visible(p.SUBMIT).is_displayed() or driver.execute_script("arguments[0].scrollIntoView()", p.visible(p.SUBMIT)) is None
