"""Sensor detail page object."""
from selenium.webdriver.common.by import By
from pages.admin_page import AdminPage


class SensorDetailPage(AdminPage):
    """Page for /admin/sensors/:id"""
    path = "/admin/sensors"

    READING_VALUE = (By.CSS_SELECTOR,
                     "[class*='reading' i], [class*='value' i], [class*='metric' i], "
                     "[data-testid*='reading'], [data-testid*='value']")
    CHART = (By.CSS_SELECTOR,
             "canvas, svg.recharts-surface, .apexcharts-canvas, [class*='chart' i] svg")
    STATUS_BADGE = (By.CSS_SELECTOR,
                    "[class*='badge' i], [class*='status' i], [class*='chip' i]")
    BACK = (By.CSS_SELECTOR,
            "a[href*='/sensors'], button[aria-label*='back' i], [data-testid='back-btn']")
