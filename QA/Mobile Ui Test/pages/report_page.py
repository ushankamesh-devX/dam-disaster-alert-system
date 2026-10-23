"""Page Object for Report Issues Screen."""
import time
from .base_page import BasePage

class ReportPage(BasePage):
    """Page Object covering Citizen Report Issues, Search/Filters, and AddReportModal."""

    SEARCH_INPUT = BasePage.by_test_id("report-search-input")
    FILTER_ALL = BasePage.by_test_id("report-filter-all")
    FAB_ADD_BTN = BasePage.by_test_id("report-fab-add-btn")

    # Add Report Modal Locators
    MODAL_SELECT_DAM = BasePage.by_test_id("report-select-dam")
    MODAL_INPUT_DESC = BasePage.by_test_id("report-input-desc")
    MODAL_SUBMIT_BTN = BasePage.by_test_id("report-submit-btn")
    MODAL_CANCEL_BTN = BasePage.by_test_id("report-cancel-btn")

    def search_reports(self, query: str) -> None:
        """Types a search term into the search reports bar."""
        self.type_text(self.SEARCH_INPUT, query)
        time.sleep(0.4)

    def select_filter(self, issue_type: str) -> None:
        """Selects an issue type filter chip (e.g. 'all', 'leakage', 'water_level')."""
        chip_locator = self.by_test_id(f"report-filter-{issue_type.lower()}")
        self.tap(chip_locator)
        time.sleep(0.3)

    def tap_add_report_fab(self) -> None:
        """Taps the floating '+' action button to open the AddReportModal."""
        self.tap(self.FAB_ADD_BTN)
        time.sleep(0.5)

    def is_add_modal_open(self) -> bool:
        """Returns True if the AddReportModal is currently displayed."""
        return self.is_visible(self.MODAL_SUBMIT_BTN, timeout=4)

    def select_dam_option(self, dam_name: str) -> None:
        """Opens dam picker and selects a dam by name."""
        self.tap(self.MODAL_SELECT_DAM)
        time.sleep(0.4)
        # Select dam by text
        dam_option = self.by_xpath(f"//*[@text='{dam_name}' or @content-desc='{dam_name}']")
        if self.is_visible(dam_option, timeout=3):
            self.tap(dam_option)
        else:
            # Fallback tap the picker again to close
            self.tap(self.MODAL_SELECT_DAM)

    def enter_description(self, description_text: str) -> None:
        """Enters the issue description into the multiline input."""
        self.type_text(self.MODAL_INPUT_DESC, description_text)

    def submit_report(self) -> None:
        """Taps the Submit Report button."""
        self.tap(self.MODAL_SUBMIT_BTN)
        time.sleep(0.5)

    def cancel_report(self) -> None:
        """Taps the Cancel button to close AddReportModal without submitting."""
        self.tap(self.MODAL_CANCEL_BTN)
        time.sleep(0.4)
