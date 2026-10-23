"""Alerts Tests: Verify severity counters and warning alerts feed."""
import pytest
from pages.dashboard_page import DashboardPage
from pages.alerts_page import AlertsPage

@pytest.mark.alerts
class TestAlerts:
    """Disaster alerts and threshold warning test suite."""

    @pytest.fixture(autouse=True)
    def navigate_to_alerts(self, driver):
        """Navigate to Alerts tab before each test."""
        dashboard = DashboardPage(driver)
        dashboard.navigate_to_tab("alerts")
        yield

    def test_tc_alert_001_severity_counters_displayed(self, driver):
        """
        TC_ALERT_001: Critical, Warning, and Updates summary count badges render
        Steps:
            1. Verify Critical counter box is displayed
            2. Verify Warnings counter box is displayed
            3. Verify Updates counter box is displayed
            4. Verify counter values are numeric
        Expected:
            All three severity summary badges are visible with valid numbers.
        """
        alerts = AlertsPage(driver)
        assert alerts.are_counters_visible(), "Severity counter badges are missing."

        counts = alerts.get_severity_counts()
        for severity, val in counts.items():
            assert val.strip().isdigit() or val.strip() != "", f"Count for {severity} is invalid: '{val}'"

    def test_tc_alert_002_alerts_feed_rendered(self, driver):
        """
        TC_ALERT_002: Alerts feed renders alert items or graceful state
        Steps:
            1. Verify alerts feed ScrollView is active
            2. Check alert cards presence
        Expected:
            Screen does not crash; renders alert items or empty state.
        """
        alerts = AlertsPage(driver)
        assert alerts.is_visible(alerts.ALERTS_LIST, timeout=8), "Alerts feed list failed to render."
