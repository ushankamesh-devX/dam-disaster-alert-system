"""Emergency Tests: Verify National Hotline 117 banner, Safe Locations, and Shelter Detail View."""
import pytest
from pages.dashboard_page import DashboardPage
from pages.emergency_page import EmergencyPage

@pytest.mark.emergency
class TestEmergency:
    """Emergency contacts, hotline, and evacuation shelters test suite."""

    @pytest.fixture(autouse=True)
    def navigate_to_emergency(self, driver):
        """Navigate to Emergency tab before each test."""
        dashboard = DashboardPage(driver)
        dashboard.navigate_to_tab("emergency")
        yield

    def test_tc_emerg_001_national_hotline_banner_visible(self, driver):
        """
        TC_EMERG_001: DMC 117 national emergency banner is visible
        Steps:
            1. Verify DMC 117 hotline banner presence
        Expected:
            Banner is displayed with title and direct Call Now action.
        """
        emergency = EmergencyPage(driver)
        assert emergency.is_hotline_banner_visible(), "National DMC 117 hotline banner is missing."

    def test_tc_emerg_002_safe_locations_list_loaded(self, driver):
        """
        TC_EMERG_002: Nearby safe locations list renders shelter cards
        Steps:
            1. Scroll down to shelter cards section
            2. Verify at least one safe location shelter card is rendered
        Expected:
            Evacuation centers list is populated.
        """
        emergency = EmergencyPage(driver)
        count = emergency.get_shelter_count()
        assert count > 0, "No safe location cards rendered in shelters list."

    def test_tc_emerg_003_open_shelter_detail_and_back(self, driver):
        """
        TC_EMERG_003: Tapping a shelter opens Detail View with Directions, and back arrow returns
        Steps:
            1. Tap first safe location card
            2. Verify Shelter Detail View opens (shows Directions button)
            3. Tap back arrow
            4. Verify user returns to the shelters list
        Expected:
            Facility detail view loads specifications and returns cleanly.
        """
        emergency = EmergencyPage(driver)
        emergency.open_first_shelter_detail()
        assert emergency.is_shelter_detail_visible(), "Shelter detail view failed to open."

        emergency.tap_back_to_shelters_list()
        assert emergency.is_hotline_banner_visible(), "Failed to return to shelters list from detail view."
