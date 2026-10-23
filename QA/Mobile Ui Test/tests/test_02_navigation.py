"""Navigation Tests: Verify every tab and secondary screen is reachable and returns properly."""
import pytest
from pages.dashboard_page import DashboardPage
from pages.news_page import NewsPage
from pages.emergency_page import EmergencyPage
from pages.alerts_page import AlertsPage
from pages.report_page import ReportPage
from pages.settings_page import SettingsPage
from pages.hazard_map_page import HazardMapPage

@pytest.mark.nav
class TestNavigation:
    """Navigation test suite covering all routes, tabs, and back actions."""

    def test_tc_nav_001_switch_between_all_tabs(self, driver):
        """
        TC_NAV_001: Tab switching across Dashboard, News, Emergency, Alerts, Report
        Steps:
            1. Tap 'News' tab -> verify news screen loads
            2. Tap 'Emergency' tab -> verify emergency screen loads
            3. Tap 'Alerts' tab -> verify alerts screen loads
            4. Tap 'Report Issues' tab -> verify report screen loads
            5. Tap 'Dashboard' tab -> verify dashboard returns
        Expected:
            All tabs transition smoothly without crashing.
        """
        base = DashboardPage(driver)

        # 1. News
        base.navigate_to_tab("news")
        news = NewsPage(driver)
        assert news.is_visible(news.FILTER_ALL, timeout=6), "News screen failed to open."

        # 2. Emergency
        base.navigate_to_tab("emergency")
        emergency = EmergencyPage(driver)
        assert emergency.is_hotline_banner_visible(), "Emergency screen failed to open."

        # 3. Alerts
        base.navigate_to_tab("alerts")
        alerts = AlertsPage(driver)
        assert alerts.are_counters_visible(), "Alerts screen failed to open."

        # 4. Report
        base.navigate_to_tab("report")
        report = ReportPage(driver)
        assert report.is_visible(report.SEARCH_INPUT, timeout=6), "Report screen failed to open."

        # 5. Return to Dashboard
        base.navigate_to_tab("dashboard")
        assert base.is_dashboard_loaded(), "Failed to return to Dashboard."

    def test_tc_nav_002_navigate_to_settings_and_return(self, driver):
        """
        TC_NAV_002: Navigate to Settings screen via header cog and return to tabs
        Steps:
            1. From Dashboard, tap header settings cog button
            2. Verify Settings screen is loaded (shows language options)
            3. Tap bottom tab 'Dashboard' to return
        Expected:
            Settings page opens; user can navigate back to Dashboard.
        """
        dashboard = DashboardPage(driver)
        dashboard.tap_header_settings()

        settings = SettingsPage(driver)
        assert settings.is_settings_screen_loaded(), "Settings screen failed to load."

        # Navigate back to dashboard via tab
        settings.navigate_to_tab("dashboard")
        assert dashboard.is_dashboard_loaded(), "Failed to return to Dashboard from Settings."

    def test_tc_nav_003_quick_action_shelters_navigation(self, driver):
        """
        TC_NAV_003: QuickActions 'Shelter Locations' button navigates to Emergency tab
        Steps:
            1. On Dashboard, tap 'Shelter Locations' in QuickActions
            2. Verify Emergency / Safe Locations screen is loaded
        Expected:
            App switches to Emergency tab showing DMC hotline and safe shelters.
        """
        dashboard = DashboardPage(driver)
        dashboard.tap_shelter_locations()

        emergency = EmergencyPage(driver)
        assert emergency.is_hotline_banner_visible(), "Shelter Locations button failed to navigate to Emergency screen."

    def test_tc_nav_004_navigate_to_hazard_map_and_back(self, driver):
        """
        TC_NAV_004: Navigate to Full Hazard Map and return via Back arrow
        Steps:
            1. On Dashboard, scroll down and tap 'View Full Map'
            2. Verify Full Hazard Map screen opens
            3. Tap back arrow button
            4. Verify user returns to Dashboard
        Expected:
            Hazard map route opens, back navigation returns to Dashboard.
        """
        dashboard = DashboardPage(driver)
        dashboard.tap_view_full_map()

        hazard_map = HazardMapPage(driver)
        assert hazard_map.is_visible(hazard_map.BACK_TO_DASHBOARD_BTN, timeout=6), "Hazard map screen failed to open."

        hazard_map.tap_back_to_dashboard()
        assert dashboard.is_dashboard_loaded(), "Failed to return to Dashboard from Hazard Map."
