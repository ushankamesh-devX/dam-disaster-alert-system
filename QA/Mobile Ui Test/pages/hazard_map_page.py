"""Page Object for Full Hazard Map and Emergency Simulation Screen."""
import time
from .base_page import BasePage

class HazardMapPage(BasePage):
    """Page Object covering Full Hazard Map, Zones, and Incoming Fake Call Alert."""

    BACK_TO_DASHBOARD_BTN = BasePage.by_test_id("hazard-map-back-btn")
    TEST_CALL_BTN = BasePage.by_test_id("hazard-test-call-btn")

    FAKE_CALL_CONTAINER = BasePage.by_test_id("fake-call-container")
    FAKE_CALL_TURN_OFF_BTN = BasePage.by_test_id("fake-call-answer-btn")

    DAM_DETAILS_CARD = BasePage.by_test_id("dam-details-card")

    def tap_back_to_dashboard(self) -> None:
        """Taps the top back arrow to navigate back to the Dashboard."""
        self.tap(self.BACK_TO_DASHBOARD_BTN)
        time.sleep(0.5)

    def trigger_test_call(self) -> None:
        """Taps the floating Test Call button to trigger the incoming alarm simulation."""
        self.tap(self.TEST_CALL_BTN)
        time.sleep(0.6)

    def is_fake_call_screen_visible(self) -> bool:
        """Returns True if the full-screen Emergency Fake Call simulation is active."""
        return self.is_visible(self.FAKE_CALL_CONTAINER, timeout=5)

    def dismiss_fake_call(self) -> None:
        """Taps the 'Turn Off Alarm' button in the Fake Call Screen."""
        self.tap(self.FAKE_CALL_TURN_OFF_BTN)
        time.sleep(0.5)
