"""Generic admin page object - extends BasePage with common admin UI helpers."""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage, clickable


class AdminPage(BasePage):
    """Shared locators / helpers for every /admin/... page."""

    SIDEBAR = (By.CSS_SELECTOR, "aside, [class*='sidebar' i], nav[class*='side' i]")
    SIDEBAR_LINKS = (By.CSS_SELECTOR, "aside a[href], [class*='sidebar' i] a[href], nav[class*='side' i] a[href]")
    HEADER = (By.CSS_SELECTOR, "header, [class*='topbar' i], [class*='navbar' i]")
    USER_MENU = (By.CSS_SELECTOR,
                 "[class*='avatar' i], [aria-label*='account' i], "
                 "[aria-label*='profile' i], [class*='user-menu' i], header button")
    LOGOUT = clickable("logout", "log out", "sign out")
    PAGE_TITLE = (By.CSS_SELECTOR, "h1, h2, [class*='page-title' i]")

    def sidebar_link_hrefs(self):
        return self.driver.execute_script(
            """return [...new Set(Array.from(document.querySelectorAll(
               "aside a[href], [class*='sidebar' i] a[href], nav[class*='side' i] a[href]"))
              .map(a => a.getAttribute('href')).filter(h => h && h.startsWith('/'))
            )];"""
        )

    def open_user_menu(self):
        btns = [e for e in self.driver.find_elements(*self.USER_MENU) if e.is_displayed()]
        if btns:
            btns[0].click()
        return self

    def logout(self):
        self.open_user_menu()
        self.click(self.LOGOUT)
        return self
