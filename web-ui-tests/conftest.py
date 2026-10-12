import os
import re
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions

import config
from utils.auth import login_as_admin

DOWNLOAD_DIR = os.path.abspath("reports/downloads")


def _make_driver():
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    if config.BROWSER == "firefox":
        opts = FirefoxOptions()
        if config.HEADLESS:
            opts.add_argument("-headless")
        d = webdriver.Firefox(options=opts)
    else:
        opts = ChromeOptions()
        if config.HEADLESS:
            opts.add_argument("--headless=new")
        opts.add_argument("--window-size=1440,900")
        opts.add_argument("--disable-notifications")
        opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})
        opts.add_experimental_option("prefs", {
            "download.default_directory": DOWNLOAD_DIR,
            "download.prompt_for_download": False,
            "profile.default_content_setting_values.geolocation": 2,
        })
        d = webdriver.Chrome(options=opts)   # Selenium Manager downloads chromedriver
    d.set_window_size(*config.VIEWPORTS["desktop"])
    return d


@pytest.fixture
def driver():
    d = _make_driver()
    yield d
    d.quit()


@pytest.fixture
def admin_driver(driver):
    return login_as_admin(driver)


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    if rep.when == "call" and rep.failed:
        d = item.funcargs.get("driver")
        if d is None and "ctx" in item.funcargs:
            d = item.funcargs["ctx"][0]
        if d is not None:
            os.makedirs("reports/screenshots", exist_ok=True)
            name = re.sub(r"[^\w\-]+", "_", item.name)
            try:
                d.save_screenshot(f"reports/screenshots/{name}.png")
            except Exception:
                pass
