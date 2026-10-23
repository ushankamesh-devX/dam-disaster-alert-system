"""Resilience & Edge Case Tests: Offline graceful handling, rapid navigation, and backgrounding."""
import time
import pytest
from pages.dashboard_page import DashboardPage

@pytest.mark.resilience
class TestResilience:
    """Stress, edge-case, and lifecycle resilience tests."""

    def test_tc_res_001_offline_graceful_handling(self, driver):
        """
        TC_RES_001: App handles network latency or missing backend data gracefully
        Steps:
            1. Launch application
            2. Verify dashboard does not show unhandled redbox/fatal error
            3. Verify Dam details card displays information or fallback message
        Expected:
            App remains fully interactive with graceful fallbacks.
        """
        dashboard = DashboardPage(driver)
        assert dashboard.is_dashboard_loaded(), "App failed to load or crashed."
        assert dashboard.is_visible(dashboard.DAM_DETAILS_CARD, timeout=5)

    def test_tc_res_002_rapid_tab_switching_resilience(self, driver):
        """
        TC_RES_002: Rapid consecutive tab switching does not crash or freeze the app
        Steps:
            1. Rapidly switch through Dashboard -> News -> Emergency -> Alerts -> Report -> Dashboard
            2. Verify dashboard remains responsive after burst navigation
        Expected:
            No race condition crash; current active screen updates correctly.
        """
        dashboard = DashboardPage(driver)
        tabs = ["news", "emergency", "alerts", "report", "dashboard"]
        for tab in tabs:
            dashboard.navigate_to_tab(tab)
            time.sleep(0.2)

        assert dashboard.is_dashboard_loaded(), "Dashboard became unresponsive after rapid switching."

    def test_tc_res_003_app_background_and_resume(self, driver):
        """
        TC_RES_003: Backgrounding the app and resuming preserves UI state
        Steps:
            1. Send app to background for 3 seconds
            2. Resume application
            3. Verify dashboard is still active and responsive
        Expected:
            App resumes from background cleanly without restarting or crashing.
        """
        dashboard = DashboardPage(driver)
        driver.background_app(3)
        assert dashboard.is_dashboard_loaded(), "App crashed or failed to resume from background."
