"""Reusable UI quality checks used by many tests. Each returns a list of problems (empty = OK)."""
import re
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

IGNORED_CONSOLE = ("favicon", "React DevTools", "ResizeObserver", "tile.openstreetmap")
BAD_TEXT_RE = re.compile(r"\b(undefined|NaN)\b|\[object Object\]")
ERROR_SCREEN_RE = re.compile(
    r"something went wrong|unexpected error|cannot read propert|application error|page not found|"
    r"uncaught|is not defined|chunkloaderror", re.I)


def console_errors(driver):
    try:
        logs = driver.get_log("browser")
    except Exception:          # Firefox has no browser log
        return []
    return [l["message"] for l in logs
            if l["level"] == "SEVERE" and not any(i in l["message"] for i in IGNORED_CONSOLE)]


def broken_images(driver):
    return driver.execute_script("""
        return Array.from(document.images)
          .filter(i => i.getClientRects().length > 0 && !/\\.svg(\\?|$)/.test(i.src) && (!i.complete || i.naturalWidth === 0))
          .map(i => i.src);""")


def images_without_alt(driver):
    return driver.execute_script("""
        return Array.from(document.images).filter(i => i.getClientRects().length > 0 && !i.hasAttribute('alt')).map(i => i.src);""")


def unnamed_controls(driver):
    """Buttons / links with no text, aria-label, title or labelled image (icon-only without a label)."""
    return driver.execute_script("""
        return Array.from(document.querySelectorAll("button,[role='button'],a[href]"))
          .filter(e => e.getClientRects().length > 0)
          .filter(e => {
            const t = (e.innerText || '').trim();
            const a = (e.getAttribute('aria-label') || e.getAttribute('title') || '').trim();
            return !t && !a && !e.getAttribute('aria-labelledby') && !e.querySelector('img[alt]:not([alt=""])');
          }).map(e => e.outerHTML.slice(0, 140));""")


def unlabeled_inputs(driver, allow_placeholder=True):
    return driver.execute_script("""
        const allowPh = arguments[0];
        return Array.from(document.querySelectorAll(
            "input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea"))
          .filter(e => e.getClientRects().length > 0)
          .filter(e => {
            if (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby')) return false;
            if (e.id && document.querySelector('label[for="' + CSS.escape(e.id) + '"]')) return false;
            if (e.closest('label')) return false;
            if (allowPh && e.getAttribute('placeholder')) return false;
            return true;
          }).map(e => e.outerHTML.slice(0, 140));""", allow_placeholder)


def bad_text(driver):
    text = driver.execute_script("return document.body.innerText")
    return sorted(set(m.group(0) for m in BAD_TEXT_RE.finditer(text)))


def error_screen_text(driver):
    text = driver.execute_script("return document.body.innerText")
    m = ERROR_SCREEN_RE.search(text)
    return m.group(0) if m else None


def horizontal_overflow(driver):
    """Returns (scrollWidth, innerWidth) if the page scrolls sideways, else None."""
    sw, iw = driver.execute_script(
        "return [document.documentElement.scrollWidth, window.innerWidth]")
    return (sw, iw) if sw > iw + 1 else None


def clipped_buttons(driver):
    return driver.execute_script("""
        return Array.from(document.querySelectorAll('button'))
          .filter(b => b.getClientRects().length > 0 && b.scrollWidth > b.clientWidth + 2)
          .map(b => b.innerText.trim().slice(0, 40));""")


def tab_stops(driver, presses=8):
    """Press TAB several times; return the distinct elements that received focus."""
    driver.find_element(By.TAG_NAME, "body").click()
    seen = []
    for _ in range(presses):
        ActionChains(driver).send_keys(Keys.TAB).perform()
        seen.append(driver.execute_script(
            "const a=document.activeElement; return a.tagName + '|' + (a.innerText||a.name||a.id||'').slice(0,20);"))
    return seen


def run_all_basic(driver):
    """Used by smoke tests: returns dict of problems found on the current page."""
    problems = {}
    if (e := error_screen_text(driver)):
        problems["error_screen"] = e
    if (b := bad_text(driver)):
        problems["bad_text"] = b
    if (i := broken_images(driver)):
        problems["broken_images"] = i
    if (c := console_errors(driver)):
        problems["console_errors"] = c[:5]
    return problems
