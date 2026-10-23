"""Dashboard page object."""
from selenium.webdriver.common.by import By
from pages.admin_page import AdminPage


class DashboardPage(AdminPage):
    path = "/admin/dashboard"

    STAT_CARDS = (By.CSS_SELECTOR,
                  "[data-testid^='stat'], [class*='stat' i], [class*='kpi' i], [class*='card' i]")
    CHARTS = (By.CSS_SELECTOR,
              "canvas, svg.recharts-surface, .apexcharts-canvas, .highcharts-container, [class*='chart' i] svg")
    RECENT_ALERTS = (By.CSS_SELECTOR, "[class*='alert' i], [class*='recent' i], [data-testid*='alert']")

    def stat_cards(self):
        return self.visible_all(self.STAT_CARDS)

    def charts(self):
        return self.visible_all(self.CHARTS)
