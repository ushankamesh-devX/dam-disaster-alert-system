"""Smoke Tests: Verify app launch, first screen render, and core layout components."""
import pytest
from pages.dashboard_page import DashboardPage

@pytest.mark.smoke
class TestSmoke:
    """Smoke test cases for immediate sanity checks on mobile app startup."""

    def test_tc_smoke_001_app_launches_and_renders_dashboard(self, driver):
        """
        TC_SMOKE_001: App launches successfully and renders dashboard
        Steps:
            1. Launch the Expo mobile application
            2. Verify header title is displayed
            3. Verify the Hazard gauge card is rendered
        Expected:
            App opens without crashing; Dashboard view is active.
        """
        dashboard = DashboardPage(driver)
        assert dashboard.is_dashboard_loaded(), "Dashboard failed to load upon app launch."

    def test_tc_smoke_002_bottom_tab_bar_rendered(self, driver):
        """
        TC_SMOKE_002: Bottom tab bar renders all primary navigation tabs
        Steps:
            1. Check presence of Dashboard tab
            2. Check presence of News tab
            3. Check presence of Emergency tab
            4. Check presence of Alerts tab
            5. Check presence of Report Issues tab
        Expected:
            All 5 navigation tabs are visible and accessible.
        """
        dashboard = DashboardPage(driver)
        tabs = ["dashboard", "news", "emergency", "alerts", "report"]
        for tab in tabs:
            locator = dashboard.by_test_id(f"tab-{tab}")
            assert dashboard.is_visible(locator, timeout=5), f"Tab 'tab-{tab}' is missing from bottom navigation."

    def test_tc_smoke_003_header_and_settings_button_rendered(self, driver):
        """
        TC_SMOKE_003: ScreenLayout header title and settings action button render
        Steps:
            1. Read title from ScreenLayout header
            2. Verify settings cog button is visible
        Expected:
            Header displays 'FloodWatch' (or translated title) and settings icon is present.
        """
        dashboard = DashboardPage(driver)
        header_title = dashboard.get_header_title()
        assert len(header_title) > 0, "Header title is empty."
        assert dashboard.is_visible(dashboard.by_test_id("header-settings-btn")), "Settings button missing in header."
