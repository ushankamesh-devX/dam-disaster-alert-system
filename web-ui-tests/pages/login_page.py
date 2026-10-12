from selenium.webdriver.common.by import By
from pages.base_page import BasePage, clickable


class LoginPage(BasePage):
    path = "/login"
    EMAIL = (By.CSS_SELECTOR, "[data-testid='login-email'], input[type='email'], input[name='email'], input[name='username'], input[id*='email' i]")
    PASSWORD = (By.CSS_SELECTOR, "[data-testid='login-password'], input[type='password'], input[name='password']")
    SUBMIT = (By.CSS_SELECTOR, "[data-testid='login-submit'], button[type='submit']")
    ERROR = (By.CSS_SELECTOR, "[data-testid='login-error'], [role='alert'], [class*='error' i], [class*='toast' i], .Toastify__toast")
    REGISTER_LINK = clickable("register", "sign up", "create account")
    TOGGLE = (By.CSS_SELECTOR, "[data-testid='toggle-password'], button[aria-label*='password' i], button[aria-label*='show' i], button[title*='show' i]")

    def login(self, email, password):
        self.type(self.EMAIL, email)
        self.type(self.PASSWORD, password)
        self.click(self.SUBMIT)
        return self
