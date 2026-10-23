"""Page Object for Alerts & Disaster Warnings Screen."""
from typing import Dict
from .base_page import BasePage

class AlertsPage(BasePage):
    """Page Object covering Disaster Alerts Feed and Severity Counters."""

    COUNT_CRITICAL = BasePage.by_test_id("alert-count-critical")
    COUNT_WARNING = BasePage.by_test_id("alert-count-warning")
    COUNT_UPDATES = BasePage.by_test_id("alert-count-updates")

    ALERTS_LIST = BasePage.by_test_id("alerts-list")
    ALERT_CARDS = BasePage.by_test_id("alert-card")

    def are_counters_visible(self) -> bool:
        """Verifies that all three severity counter boxes are displayed."""
        return (
            self.is_visible(self.COUNT_CRITICAL) and
            self.is_visible(self.COUNT_WARNING) and
            self.is_visible(self.COUNT_UPDATES)
        )

    def get_severity_counts(self) -> Dict[str, str]:
        """Returns a dictionary containing the counter values."""
        return {
            "critical": self.get_text(self.COUNT_CRITICAL),
            "warning": self.get_text(self.COUNT_WARNING),
            "updates": self.get_text(self.COUNT_UPDATES),
        }

    def get_alert_cards_count(self) -> int:
        """Returns the number of alert cards currently rendered."""
        cards = self.find_all(self.ALERT_CARDS)
        return len(cards)
