"""Page Object for Emergency Contact and Safe Locations Screen."""
import time
from typing import List
from .base_page import BasePage

class EmergencyPage(BasePage):
    """Page Object covering Emergency Hotline, Shelters List, and Facility Detail View."""

    HOTLINE_BANNER = BasePage.by_test_id("emergency-hotline-banner")
    SHELTER_CARDS = BasePage.by_test_id("safe-location-card")

    DETAIL_BACK_BTN = BasePage.by_test_id("safe-location-back-btn")
    DIRECTIONS_BTN = BasePage.by_test_id("safe-location-directions-btn")
    CALL_BTN = BasePage.by_test_id("safe-location-call-btn")

    def is_hotline_banner_visible(self) -> bool:
        """Returns True if the DMC 117 national hotline banner is visible."""
        return self.is_visible(self.HOTLINE_BANNER, timeout=5)

    def get_shelter_count(self) -> int:
        """Returns the count of visible safe location shelter cards."""
        self.scroll_down(times=1)
        cards = self.find_all(self.SHELTER_CARDS)
        return len(cards)

    def open_first_shelter_detail(self) -> None:
        """Taps the first available shelter card to open the detail view."""
        self.scroll_down(times=1)
        cards = self.find_all(self.SHELTER_CARDS)
        if not cards:
            raise RuntimeError("No safe location cards found on emergency page.")
        cards[0].click()
        time.sleep(0.5)

    def is_shelter_detail_visible(self) -> bool:
        """Returns True if the shelter detail view is open (shows Directions button)."""
        return self.is_visible(self.DIRECTIONS_BTN, timeout=5)

    def tap_back_to_shelters_list(self) -> None:
        """Taps the back button inside the shelter detail view to return to list."""
        self.tap(self.DETAIL_BACK_BTN)
        time.sleep(0.4)
