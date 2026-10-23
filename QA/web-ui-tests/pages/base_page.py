"""Base page object: waiting, finding, and small helpers shared by all pages.

Locators use CSS lists / XPath fallbacks, so tests work even if you have not added
data-testid attributes yet. For the most stable tests, add data-testid to your JSX
(see docs/README.md) and put it first in the locator lists.
"""
import re
import sys
from urllib.parse import urlparse

from selenium.common.exceptions import StaleElementReferenceException, TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

import config

MOD = Keys.COMMAND if sys.platform == "darwin" else Keys.CONTROL
LOWER = "translate({a},'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')"
SPINNER = (By.CSS_SELECTOR, "[class*='spinner' i], [class*='loading' i], [class*='skeleton' i], [role='progressbar']")
EMPTY_RE = re.compile(r"\bno (data|results?|records?|items?|entries|\w+ found)\b|nothing to show|empty|not found", re.I)


def clickable(*words):
    """XPath for a button/link/role=button whose text, aria-label or title contains any word."""
    conds = [f"contains({LOWER.format(a=a)},'{w.lower()}')"
             for w in words for a in ("normalize-space(.)", "@aria-label", "@title")]
    return (By.XPATH, "//*[self::button or self::a or @role='button'][" + " or ".join(conds) + "]")


def _safe_displayed(el):
    try:
        return el.is_displayed()
    except StaleElementReferenceException:
        return False


class BasePage:
    path = "/"

    SEARCH = (By.CSS_SELECTOR, "input[type='search'], input[placeholder*='search' i], [data-testid='search-input']")
    TABLE = (By.CSS_SELECTOR, "table, [role='table'], [role='grid']")
    HEADERS = (By.CSS_SELECTOR, "table thead th, [role='columnheader']")
    ROWS = (By.CSS_SELECTOR, "table tbody tr, .MuiDataGrid-row")
    MODAL = (By.CSS_SELECTOR, "[role='dialog'], [role='alertdialog'], [class*='modal' i], [class*='drawer' i], [data-testid='modal']")
    INVALID = (By.CSS_SELECTOR, "input:invalid, select:invalid, textarea:invalid")
    ERROR_MSG = (By.CSS_SELECTOR, "[role='alert'], [class*='error' i], .invalid-feedback, [class*='helper' i], [data-testid$='error']")

    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, config.TIMEOUT)

    # ---------- navigation ----------
    def open(self, path=None):
        self.driver.get(config.BASE_URL + (path or self.path))
        self.wait_loaded()
        return self

    def wait_loaded(self):
        self.wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
        try:
            WebDriverWait(self.driver, 3).until_not(lambda d: any(_safe_displayed(e) for e in d.find_elements(*SPINNER)))
        except TimeoutException:
            pass

    def current_path(self):
        return urlparse(self.driver.current_url).path

    # ---------- finding ----------
    def visible(self, locator, timeout=None):
        return WebDriverWait(self.driver, timeout or config.TIMEOUT).until(EC.visibility_of_element_located(locator))

    def is_present(self, locator, timeout=2):
        try:
            self.visible(locator, timeout)
            return True
        except TimeoutException:
            return False

    def visible_all(self, locator):
        return [e for e in self.driver.find_elements(*locator) if _safe_displayed(e)]

    def click(self, locator):
        self.wait.until(EC.element_to_be_clickable(locator)).click()

    def type(self, locator, text, clear=True):
        el = self.visible(locator)
        if clear:
            self.clear_input(el)
        el.send_keys(text)
        return el

    @staticmethod
    def clear_input(el):
        el.send_keys(MOD + "a")
        el.send_keys(Keys.BACKSPACE)

    # ---------- page content ----------
    def body_text(self):
        return self.driver.find_element(By.TAG_NAME, "body").text

    def headings(self):
        els = self.driver.find_elements(By.CSS_SELECTOR, "h1, h2, h3")
        return [e.text.strip() for e in els if _safe_displayed(e) and e.text.strip()]

    def table_headers(self):
        return [h.text.strip() for h in self.visible_all(self.HEADERS) if h.text.strip()]

    def row_count(self):
        return len(self.visible_all(self.ROWS))

    def empty_state_visible(self):
        return bool(EMPTY_RE.search(self.body_text()))

    # ---------- modal / dialog ----------
    def visible_modal(self):
        for e in self.driver.find_elements(*self.MODAL):
            if _safe_displayed(e):
                return e
        return None

    def wait_modal(self, timeout=5):
        return WebDriverWait(self.driver, timeout).until(lambda d: self.visible_modal())

    def wait_modal_closed(self, timeout=5):
        WebDriverWait(self.driver, timeout).until(lambda d: self.visible_modal() is None)
