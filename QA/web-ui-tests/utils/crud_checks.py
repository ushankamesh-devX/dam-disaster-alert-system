"""Shared checks for list/table pages (Dams, Users, Roles, Regions, News, Alerts, Device Keys...).
Every function takes a BasePage-like object. Destructive actions are only ever CANCELLED."""
import pytest
from selenium.common.exceptions import NoAlertPresentException, TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from pages.base_page import clickable

ADD_WORDS = ("add", "new", "create", "generate")
SAVE_WORDS = ("save", "submit", "create", "add", "update", "generate")
CANCEL_WORDS = ("cancel", "close", "back")
DELETE_WORDS = ("delete", "remove", "revoke")


def table_is_rendered(page, expected_columns=()):
    assert page.is_present(page.TABLE, 8), "No table/grid is visible on the page"
    headers = [h.lower() for h in page.table_headers()]
    missing = [c for c in expected_columns if not any(c.lower() in h for h in headers)]
    assert not missing, f"Missing table columns {missing}. Found: {headers}"


def has_rows_or_empty_state(page):
    assert page.row_count() > 0 or page.empty_state_visible(), \
        "Table has no rows and no empty-state message is shown"


def search_filters(page):
    if not page.is_present(page.SEARCH, 2):
        pytest.skip("No search box found on this page (add data-testid='search-input' or update locator)")
    box = page.visible(page.SEARCH)
    before = page.row_count()
    page.clear_input(box)
    box.send_keys("zzzz_no_match_123")
    WebDriverWait(page.driver, 5).until(lambda d: page.row_count() == 0 or page.row_count() < before
                                        or page.empty_state_visible() or before == 0)
    page.clear_input(box)
    if before:
        WebDriverWait(page.driver, 5).until(lambda d: page.row_count() == before)


def open_add_form(page, words=ADD_WORDS):
    """Click the add/new button. Returns 'modal' or 'page'."""
    loc = clickable(*words)
    if not page.is_present(loc, 3):
        pytest.skip(f"No add button found (looked for text/aria-label containing {words})")
    url = page.driver.current_url
    page.click(loc)
    try:
        page.wait_modal(4)
        return "modal"
    except TimeoutException:
        assert page.driver.current_url != url or page.is_present((By.CSS_SELECTOR, "form"), 3), \
            "Clicking the add button opened neither a dialog, a form nor a new page"
        return "page"


def required_validation(page):
    mode = open_add_form(page)
    scope = page.visible_modal() if mode == "modal" else page.driver
    submit = scope.find_elements(By.CSS_SELECTOR, "button[type='submit']") or \
        [e for e in page.driver.find_elements(*clickable(*SAVE_WORDS)) if e.is_displayed()]
    assert submit, "No Save/Submit button inside the form"
    submit[0].click()
    invalid = len(page.driver.find_elements(*page.INVALID))
    errors = len(page.visible_all(page.ERROR_MSG))
    assert invalid or errors, "Submitting an empty form showed no validation message"
    if mode == "modal":
        assert page.visible_modal() is not None, "Dialog closed even though the form was empty"


def cancel_closes_form(page):
    mode = open_add_form(page)
    cancel = [e for e in page.driver.find_elements(*clickable(*CANCEL_WORDS)) if e.is_displayed()]
    assert cancel, "No Cancel/Close control in the form"
    cancel[-1].click()
    if mode == "modal":
        page.wait_modal_closed()
    else:
        WebDriverWait(page.driver, 5).until(lambda d: page.is_present(page.TABLE, 1) or page.current_path() == page.path)


def row_actions_present(page):
    if page.row_count() == 0:
        pytest.skip("No rows to test row actions on")
    row = page.visible_all(page.ROWS)[0]
    controls = row.find_elements(By.CSS_SELECTOR, "button, a, [role='button']")
    assert controls, "First row has no action buttons/links (view/edit/delete)"


def delete_asks_confirmation_and_cancel_keeps_row(page):
    if page.row_count() == 0:
        pytest.skip("No rows to test delete on")
    loc = clickable(*DELETE_WORDS)
    btns = [e for e in page.driver.find_elements(*loc) if e.is_displayed()]
    if not btns:
        pytest.skip("No delete/remove/revoke control found")
    before = page.row_count()
    btns[0].click()
    try:                                            # native confirm()
        alert = WebDriverWait(page.driver, 2).until(lambda d: d.switch_to.alert)
        alert.dismiss()
    except (TimeoutException, NoAlertPresentException):
        page.wait_modal(4)                          # custom confirm dialog
        cancel = [e for e in page.driver.find_elements(*clickable("cancel", "no", "close")) if e.is_displayed()]
        assert cancel, "Delete confirmation dialog has no Cancel button"
        cancel[-1].click()
        page.wait_modal_closed()
    assert page.row_count() == before, "Row was removed even though delete was cancelled"


def pagination_works(page):
    pag = (By.CSS_SELECTOR, "[class*='pagination' i], nav[aria-label*='pagination' i], .MuiTablePagination-root")
    if not page.is_present(pag, 2):
        pytest.skip("No pagination control (probably fewer rows than one page)")
    nxt = [e for e in page.driver.find_elements(*clickable("next", "›", "»", ">")) if e.is_displayed() and e.is_enabled()
           and e.get_attribute("disabled") is None and e.get_attribute("aria-disabled") != "true"]
    if not nxt:
        pytest.skip("Next-page button disabled (single page of data)")
    first_before = page.visible_all(page.ROWS)[0].text
    nxt[0].click()
    WebDriverWait(page.driver, 5).until(lambda d: page.visible_all(page.ROWS)[0].text != first_before)


def sorting_does_not_break(page):
    heads = page.visible_all(page.HEADERS)
    if not heads:
        pytest.skip("No table headers")
    heads[0].click()
    assert page.is_present(page.TABLE, 3), "Table disappeared after clicking a column header"
