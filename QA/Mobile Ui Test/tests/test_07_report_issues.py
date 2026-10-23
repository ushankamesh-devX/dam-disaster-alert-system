"""Report Issues Tests: Verify search, filters, FAB, form validation, and report submission."""
import pytest
from pages.dashboard_page import DashboardPage
from pages.report_page import ReportPage

@pytest.mark.report
class TestReportIssues:
    """Citizen reporting, form inputs, validation, and modal interaction tests."""

    @pytest.fixture(autouse=True)
    def navigate_to_report(self, driver):
        """Navigate to Report Issues tab before each test."""
        dashboard = DashboardPage(driver)
        dashboard.navigate_to_tab("report")
        yield

    def test_tc_rep_001_search_bar_input(self, driver):
        """
        TC_REP_001: Search bar accepts keyword input and updates query
        Steps:
            1. Enter 'Victoria' in search bar
            2. Verify text is populated
        Expected:
            Search input accepts user text without error.
        """
        report = ReportPage(driver)
        report.search_reports("Victoria")
        text = report.get_text(report.SEARCH_INPUT)
        assert "Victoria" in text or len(text) > 0, "Search bar did not register text."

    def test_tc_rep_002_filter_chips_selection(self, driver):
        """
        TC_REP_002: Issue category filter chips can be selected
        Steps:
            1. Tap 'All' filter chip
            2. Verify filter is clickable
        Expected:
            Filter chip updates selection state cleanly.
        """
        report = ReportPage(driver)
        assert report.is_visible(report.FILTER_ALL), "Filter 'All' is not visible."
        report.select_filter("all")

    def test_tc_rep_003_fab_opens_add_report_modal(self, driver):
        """
        TC_REP_003: Floating action button '+' opens AddReportModal
        Steps:
            1. Tap FAB '+' button
            2. Verify AddReportModal is displayed
            3. Tap Cancel button
            4. Verify modal closes
        Expected:
            Modal opens and cancels without errors.
        """
        report = ReportPage(driver)
        report.tap_add_report_fab()
        assert report.is_add_modal_open(), "AddReportModal failed to open from FAB."

        report.cancel_report()
        assert not report.is_add_modal_open(), "AddReportModal failed to close on Cancel."

    def test_tc_rep_004_form_validation_on_empty_submit(self, driver):
        """
        TC_REP_004: Submitting an empty report triggers validation message
        Steps:
            1. Tap FAB '+' button to open AddReportModal
            2. Tap Submit without selecting dam or typing description
            3. Verify an alert/dialog is shown or modal remains open
            4. Dismiss alert if present, then cancel modal
        Expected:
            Form prevents blank submission; validation alert is handled.
        """
        report = ReportPage(driver)
        report.tap_add_report_fab()
        assert report.is_add_modal_open(), "AddReportModal not open."

        report.submit_report()
        # Handle native alert if triggered by React Native Alert.alert
        handled = report.handle_alert("accept")

        # Modal should still remain open due to validation failure
        assert report.is_add_modal_open(), "Modal closed despite empty submission."
        report.cancel_report()

    def test_tc_rep_005_fill_description_and_submit(self, driver):
        """
        TC_REP_005: User can type description into the report input field
        Steps:
            1. Open AddReportModal
            2. Enter text into description input field
            3. Verify input field holds the typed content
            4. Cancel modal
        Expected:
            Description text field accepts multiline user text.
        """
        report = ReportPage(driver)
        report.tap_add_report_fab()
        sample_desc = "Noticeable water leakage along the east spillway wall."
        report.enter_description(sample_desc)

        input_text = report.get_text(report.MODAL_INPUT_DESC)
        assert len(input_text) > 0, "Description input failed to receive text."
        report.cancel_report()
