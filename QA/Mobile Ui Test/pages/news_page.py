"""Page Object for News & Updates Feed Screen."""
import time
from typing import List
from .base_page import BasePage

class NewsPage(BasePage):
    """Page Object covering the News Feed, Filters, and News Detail Modal."""

    FILTER_ALL = BasePage.by_test_id("news-filter-all")
    FILTER_DAM = BasePage.by_test_id("news-filter-dam-status")
    FILTER_WEATHER = BasePage.by_test_id("news-filter-weather-alerts")
    FILTER_EMERGENCY = BasePage.by_test_id("news-filter-emergency")

    NEWS_CARDS = BasePage.by_test_id("news-card")
    NEWS_CARD_TITLES = BasePage.by_test_id("news-card-title")

    DETAIL_MODAL = BasePage.by_test_id("news-detail-modal")
    DETAIL_CLOSE_BTN = BasePage.by_test_id("news-detail-close-btn")

    def select_filter(self, category: str) -> None:
        """Taps a news category filter chip ('all', 'dam-status', 'weather-alerts', 'emergency')."""
        chip_locator = self.by_test_id(f"news-filter-{category.lower()}")
        self.tap(chip_locator)
        time.sleep(0.4)

    def get_news_cards_count(self) -> int:
        """Returns the number of visible news cards currently rendered."""
        cards = self.find_all(self.NEWS_CARDS)
        return len(cards)

    def get_first_news_title(self) -> str:
        """Returns the title text of the first news card in the list."""
        return self.get_text(self.NEWS_CARD_TITLES, timeout=5)

    def open_first_news_article(self) -> None:
        """Taps the first available news card to open the NewsDetailModal."""
        cards = self.find_all(self.NEWS_CARDS)
        if not cards:
            raise RuntimeError("No news cards available to open.")
        cards[0].click()
        time.sleep(0.5)

    def is_news_detail_modal_visible(self) -> bool:
        """Returns True if the full news article modal is currently displayed."""
        return self.is_visible(self.DETAIL_MODAL, timeout=4)

    def close_news_detail_modal(self) -> None:
        """Closes the NewsDetailModal."""
        self.tap(self.DETAIL_CLOSE_BTN)
        time.sleep(0.4)

    def pull_to_refresh(self) -> None:
        """Performs a downward swipe gesture to trigger pull-to-refresh."""
        self.swipe("down", percent=0.6)
        time.sleep(1.0)
