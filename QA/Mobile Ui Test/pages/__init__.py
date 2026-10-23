"""Page Object Model classes for Mobile UI Automation."""
from .base_page import BasePage
from .dashboard_page import DashboardPage
from .news_page import NewsPage
from .emergency_page import EmergencyPage
from .alerts_page import AlertsPage
from .report_page import ReportPage
from .hazard_map_page import HazardMapPage
from .settings_page import SettingsPage

__all__ = [
    "BasePage",
    "DashboardPage",
    "NewsPage",
    "EmergencyPage",
    "AlertsPage",
    "ReportPage",
    "HazardMapPage",
    "SettingsPage",
]
