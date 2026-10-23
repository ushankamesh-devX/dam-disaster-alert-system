"""Hazard Map Tests: Verify full hazard map screen and emergency alarm simulator."""
import pytest
from pages.dashboard_page import DashboardPage
from pages.hazard_map_page import HazardMapPage

@pytest.mark.hazard
class TestHazardMap:
    """Full hazard map and incoming emergency call simulation tests."""

    @pytest.fixture(autouse=True)
    def navigate_to_hazard_map(self, driver):
        """Navigate to Hazard Map from Dashboard before each test."""
        dashboard = DashboardPage(driver)
        dashboard.tap_view_full_map()
        yield
        # Teardown: Return to dashboard if still on hazard map
        hazard_map = HazardMapPage(driver)
        if hazard_map.is_visible(hazard_map.BACK_TO_DASHBOARD_BTN, timeout=2):
            hazard_map.tap_back_to_dashboard()

    def test_tc_haz_001_hazard_map_screen_elements_rendered(self, driver):
        """
        TC_HAZ_001: Full hazard map screen renders back button and dam specifications
        Steps:
            1. Verify back button is visible
            2. Verify DamDetailsCard is present
            3. Verify floating test call trigger button is visible
        Expected:
            All core hazard map screen widgets are displayed.
        """
        hazard_map = HazardMapPage(driver)
        assert hazard_map.is_visible(hazard_map.BACK_TO_DASHBOARD_BTN), "Back button missing on hazard map."
        assert hazard_map.is_visible(hazard_map.DAM_DETAILS_CARD, timeout=6), "Dam card missing on hazard map."
        assert hazard_map.is_visible(hazard_map.TEST_CALL_BTN), "Test call button missing on hazard map."

    def test_tc_haz_002_trigger_and_dismiss_fake_call_simulation(self, driver):
        """
        TC_HAZ_002: Test Call button triggers incoming emergency alarm and dismisses via Turn Off
        Steps:
            1. Tap floating 'Test Call' button
            2. Verify FakeCallScreen appears with emergency incoming alarm
            3. Tap 'Turn Off Alarm' button
            4. Verify FakeCallScreen dismisses
        Expected:
            Alarm modal opens smoothly and dismisses upon tapping Turn Off Alarm.
        """
        hazard_map = HazardMapPage(driver)
        hazard_map.trigger_test_call()
        assert hazard_map.is_fake_call_screen_visible(), "Fake call alarm screen failed to appear."

        hazard_map.dismiss_fake_call()
        assert not hazard_map.is_fake_call_screen_visible(), "Fake call screen failed to dismiss."
