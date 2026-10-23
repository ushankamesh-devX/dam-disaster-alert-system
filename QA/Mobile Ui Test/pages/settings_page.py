"""Page Object for Settings and Language Preferences Screen."""
import time
from .base_page import BasePage

class SettingsPage(BasePage):
    """Page Object covering Language selection (English / Sinhala) and Settings."""

    LANG_ENGLISH_BTN = BasePage.by_test_id("settings-lang-en")
    LANG_SINHALA_BTN = BasePage.by_test_id("settings-lang-si")

    def select_english(self) -> None:
        """Selects English language option."""
        self.tap(self.LANG_ENGLISH_BTN)
        time.sleep(0.4)

    def select_sinhala(self) -> None:
        """Selects Sinhala (සිංහල) language option."""
        self.tap(self.LANG_SINHALA_BTN)
        time.sleep(0.4)

    def is_settings_screen_loaded(self) -> bool:
        """Verifies that English and Sinhala language options are visible."""
        return (
            self.is_visible(self.LANG_ENGLISH_BTN) and
            self.is_visible(self.LANG_SINHALA_BTN)
        )
