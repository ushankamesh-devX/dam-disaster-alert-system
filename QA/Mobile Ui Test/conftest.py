"""Pytest fixtures and hooks for Appium Mobile UI Automation."""
import datetime
import pytest
from appium import webdriver
from appium.options.android import UiAutomator2Options

from config import (
    APPIUM_SERVER_URL,
    SCREENSHOTS_DIR,
    get_desired_capabilities,
    IMPLICIT_WAIT,
)

@pytest.fixture(scope="session")
def appium_options():
    """Initializes UiAutomator2Options from config capabilities."""
    caps = get_desired_capabilities()
    options = UiAutomator2Options().load_capabilities(caps)
    return options

@pytest.fixture(scope="function")
def driver(appium_options, request):
    """
    Initializes a new Appium driver session for each test function,
    enforcing clean state and isolation between tests.
    """
    driver_instance = None
    try:
        driver_instance = webdriver.Remote(
            command_executor=APPIUM_SERVER_URL,
            options=appium_options
        )
        driver_instance.implicitly_wait(IMPLICIT_WAIT)
        request.node.driver = driver_instance
        yield driver_instance
    except Exception as exc:
        pytest.fail(f"Could not connect to Appium server at {APPIUM_SERVER_URL}. "
                    f"Ensure Appium and an Android emulator are running. Error: {exc}")
    finally:
        if driver_instance:
            try:
                driver_instance.quit()
            except Exception:
                pass

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    Captures an automatic screenshot on test failure and attaches it to the HTML report.
    """
    outcome = yield
    report = outcome.get_result()

    if report.when == "call" and report.failed:
        driver = getattr(item, "driver", None)
        if driver:
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            test_name = item.name.replace("/", "_").replace("::", "_")
            screenshot_file = SCREENSHOTS_DIR / f"FAIL_{test_name}_{timestamp}.png"
            try:
                driver.save_screenshot(str(screenshot_file))
                # Attach to pytest-html if available
                pytest_html = item.config.pluginmanager.getplugin("html")
                if pytest_html:
                    extra = getattr(report, "extra", [])
                    extra.append(pytest_html.extras.image(str(screenshot_file)))
                    report.extra = extra
            except Exception as err:
                print(f"Warning: Failed to capture screenshot on failure: {err}")
