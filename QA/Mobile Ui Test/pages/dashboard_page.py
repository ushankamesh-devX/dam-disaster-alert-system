"""Page Object for Dashboard Screen."""
from typing import Optional
from .base_page import BasePage

class DashboardPage(BasePage):
    """Page Object covering the main Dashboard / HomeScreen."""

    # Locators
    DAM_DETAILS_CARD = BasePage.by_test_id("dam-details-card")
    DAM_DETAILS_NAME = BasePage.by_test_id("dam-details-name")

    HAZARD_CARD = BasePage.by_test_id("hazard-card")
    HAZARD_TITLE = BasePage.by_test_id("hazard-title")
    HAZARD_GAUGE_VALUE = BasePage.by_test_id("hazard-gauge-value")

    FLOOD_MAP_CONTAINER = BasePage.by_test_id("flood-risk-map-container")
    VIEW_FULL_MAP_BTN = BasePage.by_test_id("view-full-map-btn")

    BTN_GUIDELINES = BasePage.by_test_id("quick-guidelines-btn")
    BTN_SHELTERS = BasePage.by_test_id("quick-shelter-btn")
    BTN_SHARE_LOCATION = BasePage.by_test_id("quick-share-location-btn")
    BTN_EMERGENCY_CONTACT = BasePage.by_test_id("quick-emergency-contact-btn")

    GUIDELINES_MODAL = BasePage.by_test_id("guidelines-modal")
    GUIDELINES_CLOSE_BTN = BasePage.by_test_id("guidelines-close-btn")

    def is_dashboard_loaded(self) -> bool:
        """Returns True if the primary dashboard elements are displayed."""
        return (
            self.is_visible(self.by_test_id("header-title")) and
            self.is_visible(self.HAZARD_CARD, timeout=8)
        )

    def get_dam_name(self) -> str:
        """Returns the displayed dam name or empty string if not loaded."""
        if self.is_visible(self.DAM_DETAILS_NAME, timeout=5):
            return self.get_text(self.DAM_DETAILS_NAME)
        return ""

    def get_hazard_gauge_value(self) -> str:
        """Returns the current gauge metric value (e.g. '>1.2 m²s')."""
        return self.get_text(self.HAZARD_GAUGE_VALUE)

    def tap_view_full_map(self) -> None:
        """Taps the 'View Full Map' button to navigate to hazard map."""
        self.scroll_down(times=1)
        self.tap(self.VIEW_FULL_MAP_BTN)

    def tap_guidelines(self) -> None:
        """Taps the Guidelines quick action button."""
        self.tap(self.BTN_GUIDELINES)

    def tap_shelter_locations(self) -> None:
        """Taps the Shelter Locations quick action button."""
        self.tap(self.BTN_SHELTERS)

    def is_guidelines_modal_visible(self) -> bool:
        """Checks if the Guidelines modal popup is currently visible."""
        return self.is_visible(self.GUIDELINES_MODAL, timeout=4)

    def close_guidelines_modal(self) -> None:
        """Closes the Guidelines modal using its close button."""
        self.tap(self.GUIDELINES_CLOSE_BTN)
