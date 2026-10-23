from selenium.webdriver.support.ui import WebDriverWait
import config
from pages.login_page import LoginPage


def login_as_admin(driver):
    LoginPage(driver).open().login(config.ADMIN_EMAIL, config.ADMIN_PASSWORD)
    try:
        WebDriverWait(driver, config.TIMEOUT).until(lambda d: "/login" not in d.current_url)
    except Exception:
        raise AssertionError(
            "Admin login failed. Check ADMIN_EMAIL / ADMIN_PASSWORD env vars and that the backend is running.")
    return driver
