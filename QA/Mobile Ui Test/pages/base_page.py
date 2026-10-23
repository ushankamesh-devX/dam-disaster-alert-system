"""Base Page containing reusable UI interactions and Appium gestures."""
import time
from typing import List, Tuple
from appium.webdriver.webdriver import WebDriver
from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.remote.webelement import WebElement
from selenium.common.exceptions import TimeoutException, NoSuchElementException

from config import EXPLICIT_WAIT, SCREENSHOTS_DIR

class BasePage:
    """Base class for all Page Objects in the mobile UI test suite."""

    def __init__(self, driver: WebDriver):
        self.driver = driver
        self.wait = WebDriverWait(driver, EXPLICIT_WAIT)

    # ── Locators Helper ──────────────────────────────────────────────────────────
    @staticmethod
    def by_test_id(test_id: str) -> Tuple[str, str]:
        """Locates element by React Native testID / accessibilityLabel."""
        return (AppiumBy.ACCESSIBILITY_ID, test_id)

    @staticmethod
    def by_xpath(xpath: str) -> Tuple[str, str]:
        """Locates element by XPath."""
        return (AppiumBy.XPATH, xpath)

    @staticmethod
    def by_android_ui(ui_selector: str) -> Tuple[str, str]:
        """Locates element by Android UiSelector string."""
        return (AppiumBy.ANDROID_UIAUTOMATOR, ui_selector)

    # ── Core Wait & Element Resolution ───────────────────────────────────────────
    def wait_for_visible(self, locator: Tuple[str, str], timeout: int = None) -> WebElement:
        """Waits until an element is present and visible on screen."""
        wait = WebDriverWait(self.driver, timeout or EXPLICIT_WAIT)
        return wait.until(EC.visibility_of_element_located(locator))

    def wait_for_clickable(self, locator: Tuple[str, str], timeout: int = None) -> WebElement:
        """Waits until an element is clickable."""
        wait = WebDriverWait(self.driver, timeout or EXPLICIT_WAIT)
        return wait.until(EC.element_to_be_clickable(locator))

    def find(self, locator: Tuple[str, str], timeout: int = None) -> WebElement:
        """Finds a single element after waiting for its presence."""
        return self.wait_for_visible(locator, timeout)

    def find_all(self, locator: Tuple[str, str]) -> List[WebElement]:
        """Finds all matching elements currently present."""
        return self.driver.find_elements(*locator)

    def is_visible(self, locator: Tuple[str, str], timeout: int = 3) -> bool:
        """Returns True if the element becomes visible within timeout, False otherwise."""
        try:
            self.wait_for_visible(locator, timeout=timeout)
            return True
        except (TimeoutException, NoSuchElementException):
            return False

    # ── Touch & Input Interactions ───────────────────────────────────────────────
    def tap(self, locator: Tuple[str, str], timeout: int = None) -> None:
        """Waits for element to be clickable and taps it."""
        element = self.wait_for_clickable(locator, timeout)
        element.click()

    def type_text(self, locator: Tuple[str, str], text: str, clear_first: bool = True) -> None:
        """Types text into an input field, optionally clearing existing text."""
        element = self.wait_for_visible(locator)
        if clear_first:
            element.clear()
        element.send_keys(text)
        # Dismiss keyboard if open on Android
        try:
            self.driver.hide_keyboard()
        except Exception:
            pass

    def clear_text(self, locator: Tuple[str, str]) -> None:
        """Clears text from a text field."""
        element = self.wait_for_visible(locator)
        element.clear()

    def get_text(self, locator: Tuple[str, str], timeout: int = None) -> str:
        """Retrieves text content or text attribute from an element."""
        element = self.wait_for_visible(locator, timeout)
        return element.text or element.get_attribute("text") or element.get_attribute("content-desc") or ""

    # ── Gestures & Scrolling ─────────────────────────────────────────────────────
    def swipe(self, direction: str = "up", percent: float = 0.5) -> None:
        """
        Performs a swipe gesture in the specified direction.
        'up' scrolls down (swiping bottom to top).
        'down' scrolls up (swiping top to bottom).
        """
        size = self.driver.get_window_size()
        width = size["width"]
        height = size["height"]
        mid_x = int(width / 2)

        if direction.lower() == "up":
            start_y = int(height * (0.5 + percent / 2))
            end_y = int(height * (0.5 - percent / 2))
            self.driver.swipe(mid_x, start_y, mid_x, end_y, duration=600)
        elif direction.lower() == "down":
            start_y = int(height * (0.5 - percent / 2))
            end_y = int(height * (0.5 + percent / 2))
            self.driver.swipe(mid_x, start_y, mid_x, end_y, duration=600)
        time.sleep(0.3)

    def scroll_to_text(self, text: str) -> WebElement:
        """
        Scrolls vertically until an element with the given text is visible using UiScrollable.
        """
        selector = (
            f'new UiScrollable(new UiSelector().scrollable(true).instance(0))'
            f'.scrollIntoView(new UiSelector().textContains("{text}").instance(0))'
        )
        return self.driver.find_element(AppiumBy.ANDROID_UIAUTOMATOR, selector)

    def scroll_down(self, times: int = 1) -> None:
        """Convenience method to scroll down multiple times."""
        for _ in range(times):
            self.swipe("up", percent=0.4)

    def scroll_up(self, times: int = 1) -> None:
        """Convenience method to scroll up multiple times."""
        for _ in range(times):
            self.swipe("down", percent=0.4)

    # ── System Dialogs & Screenshots ────────────────────────────────────────────
    def handle_alert(self, action: str = "accept") -> bool:
        """Handles native alert / dialog (accept or dismiss)."""
        try:
            alert = self.driver.switch_to.alert
            if action.lower() == "accept":
                alert.accept()
            else:
                alert.dismiss()
            return True
        except Exception:
            return False

    def take_screenshot(self, name: str) -> str:
        """Saves a screenshot to the reports/screenshots directory."""
        filename = SCREENSHOTS_DIR / f"{name}_{int(time.time())}.png"
        self.driver.save_screenshot(str(filename))
        return str(filename)

    # ── Navigation Tab Bar Helpers ───────────────────────────────────────────────
    def navigate_to_tab(self, tab_name: str) -> None:
        """
        Navigates to one of the main bottom tabs:
        'dashboard', 'news', 'emergency', 'alerts', 'report'
        """
        normalized = tab_name.lower().strip()
        locator = self.by_test_id(f"tab-{normalized}")
        self.tap(locator)
        time.sleep(0.4)

    def get_header_title(self) -> str:
        """Retrieves the current screen header title."""
        return self.get_text(self.by_test_id("header-title"))

    def tap_header_settings(self) -> None:
        """Taps the settings cog button in the ScreenLayout header."""
        self.tap(self.by_test_id("header-settings-btn"))
        time.sleep(0.3)
