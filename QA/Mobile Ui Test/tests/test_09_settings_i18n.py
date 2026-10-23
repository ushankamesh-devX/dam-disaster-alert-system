"""Settings and Localization Tests: Verify language switching between English and Sinhala."""
import pytest
from pages.dashboard_page import DashboardPage
from pages.settings_page import SettingsPage

@pytest.mark.settings
class TestSettingsI18n:
    """Localization and settings verification suite."""

    @pytest.fixture(autouse=True)
    def navigate_to_settings(self, driver):
        """Navigate to Settings screen before each test."""
        dashboard = DashboardPage(driver)
        dashboard.tap_header_settings()
        yield
        # Teardown: Return to dashboard
        settings = SettingsPage(driver)
        settings.select_english()
        settings.navigate_to_tab("dashboard")

    def test_tc_set_001_language_options_rendered(self, driver):
        """
        TC_SET_001: Settings screen renders both English and Sinhala options
        Steps:
            1. Verify English option is visible
            2. Verify Sinhala option is visible
        Expected:
            Both language choices are available to the user.
        """
        settings = SettingsPage(driver)
        assert settings.is_settings_screen_loaded(), "Language choices not rendered."

    def test_tc_set_002_switch_language_and_restore(self, driver):
        """
        TC_SET_002: Switching to Sinhala and restoring English executes cleanly
        Steps:
            1. Tap Sinhala (සිංහල) language option
            2. Tap English language option
            3. Verify user can switch between locales without crashes
        Expected:
            Language switching functions without UI crashes or desynchronization.
        """
        settings = SettingsPage(driver)
        settings.select_sinhala()
        assert settings.is_settings_screen_loaded(), "UI broke after switching to Sinhala."

        settings.select_english()
        assert settings.is_settings_screen_loaded(), "UI broke after restoring English."
