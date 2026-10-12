from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class RegisterPage(BasePage):
    path = "/register"
    INPUTS = (By.CSS_SELECTOR, "form input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='submit'])")
    PASSWORDS = (By.CSS_SELECTOR, "form input[type='password']")
    SUBMIT = (By.CSS_SELECTOR, "[data-testid='register-submit'], form button[type='submit']")

    def fill(self, email="qa.user@example.com", password="Str0ng@Pass1", confirm=None, text="QA Tester"):
        """Fill every visible input by type: email / password / confirm / everything else = text."""
        pw_seen = 0
        for el in self.visible_all(self.INPUTS):
            typ = (el.get_attribute("type") or "text").lower()
            name = ((el.get_attribute("name") or "") + (el.get_attribute("placeholder") or "")).lower()
            self.clear_input(el)
            if typ == "password":
                pw_seen += 1
                el.send_keys(password if pw_seen == 1 else (confirm if confirm is not None else password))
            elif typ == "email" or "email" in name:
                el.send_keys(email)
            elif typ == "tel" or "phone" in name:
                el.send_keys("0771234567")
            elif typ == "number":
                el.send_keys("1")
            else:
                el.send_keys(text)
        return self

    def submit(self):
        self.click(self.SUBMIT)
        return self
