"""News Screen Tests: Verify articles feed, category filters, and detail modal."""
import pytest
from pages.dashboard_page import DashboardPage
from pages.news_page import NewsPage

@pytest.mark.news
class TestNews:
    """News and meteorological updates feed verification."""

    @pytest.fixture(autouse=True)
    def navigate_to_news(self, driver):
        """Navigate to News tab before each test."""
        dashboard = DashboardPage(driver)
        dashboard.navigate_to_tab("news")
        yield

    def test_tc_news_001_news_feed_renders_cards(self, driver):
        """
        TC_NEWS_001: News feed renders news cards with title and category
        Steps:
            1. Verify news filter chips are present
            2. Check that at least one news card is rendered
            3. Verify the first article title is non-empty
        Expected:
            Articles load with readable titles and categories.
        """
        news = NewsPage(driver)
        assert news.is_visible(news.FILTER_ALL), "News filters missing."
        count = news.get_news_cards_count()
        assert count > 0, "No news cards found in news feed."
        title = news.get_first_news_title()
        assert len(title) > 0, "First news card has empty title."

    def test_tc_news_002_filter_chips_interaction(self, driver):
        """
        TC_NEWS_002: Switching filter categories updates the news list
        Steps:
            1. Tap 'Weather Alerts' filter chip
            2. Tap 'Emergency' filter chip
            3. Tap 'Dam Status' filter chip
            4. Tap 'All' filter chip to restore full feed
        Expected:
            App handles filter transitions smoothly without errors.
        """
        news = NewsPage(driver)
        filters = ["weather-alerts", "emergency", "dam-status", "all"]
        for f in filters:
            news.select_filter(f)
            # Verify feed remains responsive
            assert news.is_visible(news.FILTER_ALL), f"Filter {f} broke feed rendering."

    def test_tc_news_003_open_and_close_news_detail_modal(self, driver):
        """
        TC_NEWS_003: Tapping news card opens full NewsDetailModal and closes via 'x'
        Steps:
            1. Tap first news card in the feed
            2. Verify NewsDetailModal opens
            3. Tap close button 'x'
            4. Verify modal dismisses
        Expected:
            Full article modal appears with full body content and closes reliably.
        """
        news = NewsPage(driver)
        news.open_first_news_article()
        assert news.is_news_detail_modal_visible(), "News detail modal failed to open."

        news.close_news_detail_modal()
        assert not news.is_news_detail_modal_visible(), "News detail modal failed to close."

    def test_tc_news_004_pull_to_refresh_works(self, driver):
        """
        TC_NEWS_004: Pull-to-refresh executes without UI disruption
        Steps:
            1. Perform pull to refresh gesture on the news ScrollView
            2. Verify feed still displays news cards
        Expected:
            Pull-to-refresh completes and news feed remains stable.
        """
        news = NewsPage(driver)
        news.pull_to_refresh()
        assert news.get_news_cards_count() > 0, "News feed empty after pull to refresh."
