"""Dams list page object."""
from selenium.webdriver.common.by import By
from pages.admin_page import AdminPage
from pages.base_page import clickable


class DamsPage(AdminPage):
    path = "/admin/dams"

    ADD_BTN = clickable("add", "new", "create")
    STATUS_BADGE = (By.CSS_SELECTOR,
                    "[class*='badge' i], [class*='status' i], [class*='chip' i], [data-testid*='status']")
    DAM_LINK = (By.CSS_SELECTOR, "table tbody tr a, .MuiDataGrid-row a")

    def open_first_dam(self):
        rows = self.visible_all(self.ROWS)
        if not rows:
            return None
        ctrl = rows[0].find_elements(By.CSS_SELECTOR, "a, button")
        (ctrl[0] if ctrl else rows[0]).click()
        self.wait_loaded()
        return self
