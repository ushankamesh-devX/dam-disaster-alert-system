"""Dashboard Tests: Verify Dam details card, Hazard gauge, FloodRiskMap, and Guidelines modal."""
import pytest
from pages.dashboard_page import DashboardPage

@pytest.mark.dashboard
class TestDashboard:
    """Dashboard content and widget verification tests."""

    def test_tc_dash_001_dam_details_card_displayed(self, driver):
        """
        TC_DASH_001: Dam details card renders dam name and specifications
        Steps:
            1. Check if DamDetailsCard is displayed
            2. Verify dam name text is non-empty (or fallback indicator)
        Expected:
            Dam metrics card is visible and displays dam name.
        """
        dashboard = DashboardPage(driver)
        assert dashboard.is_visible(dashboard.DAM_DETAILS_CARD, timeout=6), "Dam details card not visible."
        dam_name = dashboard.get_dam_name()
        assert len(dam_name) > 0, "Dam name in details card is empty."

    def test_tc_dash_002_hazard_card_gauge_value(self, driver):
        """
        TC_DASH_002: Hazard gauge card displays severe hazard warning and metric
        Steps:
            1. Verify Hazard Card container is displayed
            2. Read gauge value label
        Expected:
            Gauge value contains numeric or threshold metric string (e.g. '>1.2 m').
        """
        dashboard = DashboardPage(driver)
        assert dashboard.is_visible(dashboard.HAZARD_CARD), "Hazard gauge card is missing."
        gauge_value = dashboard.get_hazard_gauge_value()
        assert len(gauge_value) > 0, "Hazard gauge value is empty."

    def test_tc_dash_003_flood_risk_map_preview_rendered(self, driver):
        """
        TC_DASH_003: Flood risk map container and 'View Full Map' CTA render
        Steps:
            1. Scroll down to FloodRiskMap section
            2. Verify map container is visible
            3. Verify 'View Full Map' CTA button is present
        Expected:
            Interactive map container and CTA button are both visible.
        """
        dashboard = DashboardPage(driver)
        dashboard.scroll_down(times=1)
        assert dashboard.is_visible(dashboard.FLOOD_MAP_CONTAINER, timeout=6), "Flood risk map container not visible."
        assert dashboard.is_visible(dashboard.VIEW_FULL_MAP_BTN), "View Full Map button not visible."

    def test_tc_dash_004_guidelines_modal_open_and_close(self, driver):
        """
        TC_DASH_004: Guidelines quick action opens GuidelinesModal and closes via close button
        Steps:
            1. Scroll to QuickActions
            2. Tap 'Guidelines' button
            3. Verify Guidelines modal popup is visible
            4. Tap modal close button
            5. Verify modal dismisses
        Expected:
            Modal appears with emergency guidelines and closes on button tap.
        """
        dashboard = DashboardPage(driver)
        dashboard.tap_guidelines()
        assert dashboard.is_guidelines_modal_visible(), "Guidelines modal did not appear."

        dashboard.close_guidelines_modal()
        assert not dashboard.is_guidelines_modal_visible(), "Guidelines modal failed to close."
