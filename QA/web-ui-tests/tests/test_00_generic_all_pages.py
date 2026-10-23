"""Runs the SAME UI quality checks on EVERY page listed in config.py (admin + public).
Add a page to config.ADMIN_PAGES / PUBLIC_PAGES and it is covered automatically."""
import re
import pytest
from selenium.webdriver.support.ui import WebDriverWait

import config
from pages.base_page import BasePage
from utils import ui_checks as ui
from utils.auth import login_as_admin

PARAMS = [("admin", k) for k in config.ADMIN_PAGES] + [("public", k) for k in config.PUBLIC_PAGES]


@pytest.fixture(params=PARAMS, ids=[k for _, k in PARAMS])
def ctx(request, driver):
    kind, key = request.param
    meta = (config.ADMIN_PAGES if kind == "admin" else config.PUBLIC_PAGES)[key]
    if kind == "admin":
        login_as_admin(driver)
    page = BasePage(driver).open(meta["path"])
    ui.console_errors(driver)       # clear log buffer produced by login
    driver.refresh()
    page.wait_loaded()
    return driver, meta, key, kind


@pytest.mark.smoke
def test_gen_01_page_opens_without_error_screen(ctx):
    d, meta, *_ = ctx
    assert ui.error_screen_text(d) is None, f"Error text on page: {ui.error_screen_text(d)}"


@pytest.mark.smoke
def test_gen_02_url_stays_on_expected_route(ctx):
    d, meta, key, kind = ctx
    assert meta["path"].rstrip("/") in d.current_url or key == "home", f"Redirected away to {d.current_url}"


def test_gen_03_browser_tab_title_not_empty(ctx):
    d, *_ = ctx
    assert d.title.strip(), "Page <title> is empty"
    assert d.title.strip().lower() not in ("react app", "vite + react"), "Default template title still in use"


def test_gen_04_heading_matches_page(ctx):
    d, meta, *_ = ctx
    heads = BasePage(d).headings()
    assert heads, "No visible h1/h2/h3 heading on the page"
    if meta["heading"]:
        assert any(re.search(meta["heading"], h, re.I) for h in heads), f"Headings {heads} don't match /{meta['heading']}/"


def test_gen_05_no_console_errors(ctx):
    d, *_ = ctx
    assert ui.console_errors(d) == []


def test_gen_06_no_broken_images(ctx):
    d, *_ = ctx
    assert ui.broken_images(d) == []


def test_gen_07_images_have_alt_text(ctx):
    d, *_ = ctx
    assert ui.images_without_alt(d) == []


def test_gen_08_no_undefined_nan_object_text(ctx):
    d, *_ = ctx
    assert ui.bad_text(d) == [], "UI shows raw JS values (undefined / NaN / [object Object])"


@pytest.mark.a11y
def test_gen_09_buttons_and_links_have_names(ctx):
    d, *_ = ctx
    assert ui.unnamed_controls(d) == [], "Icon-only controls need aria-label/title"


@pytest.mark.a11y
def test_gen_10_inputs_have_labels(ctx):
    d, *_ = ctx
    assert ui.unlabeled_inputs(d, allow_placeholder=True) == []


@pytest.mark.a11y
def test_gen_11_keyboard_tab_reaches_controls(ctx):
    d, *_ = ctx
    stops = ui.tab_stops(d, 6)
    assert len(set(stops)) >= 2, f"TAB key does not move focus across controls: {stops}"


def test_gen_12_no_clipped_button_text(ctx):
    d, *_ = ctx
    assert ui.clipped_buttons(d) == []


@pytest.mark.responsive
@pytest.mark.parametrize("vp", list(config.VIEWPORTS))
def test_gen_13_no_horizontal_scroll_at_viewport(ctx, vp):
    d, *_ = ctx
    d.set_window_size(*config.VIEWPORTS[vp])
    BasePage(d).wait_loaded()
    assert ui.horizontal_overflow(d) is None, f"Page scrolls sideways at {vp} {config.VIEWPORTS[vp]}: {ui.horizontal_overflow(d)}"


def test_gen_14_refresh_keeps_page(ctx):
    d, meta, key, kind = ctx
    url = d.current_url
    d.refresh()
    BasePage(d).wait_loaded()
    assert d.current_url == url, "Refresh changed the URL (session or router problem)"
    assert ui.error_screen_text(d) is None


def test_gen_15_back_forward_navigation(ctx):
    d, meta, *_ = ctx
    start = d.current_url
    d.get(config.BASE_URL + "/login")
    d.back()
    BasePage(d).wait_loaded()
    assert d.current_url == start or "/login" in d.current_url


@pytest.mark.security
@pytest.mark.parametrize("key", list(config.ADMIN_PAGES))
def test_gen_16_admin_pages_redirect_when_logged_out(driver, key):
    BasePage(driver).open(config.ADMIN_PAGES[key]["path"])
    try:
        WebDriverWait(driver, 8).until(lambda d: "/login" in d.current_url
                                       or d.find_elements("css selector", "input[type='password']"))
    except Exception:
        pytest.fail("Admin page is reachable without logging in!")


@pytest.mark.a11y
def test_gen_17_axe_accessibility_no_serious_violations(ctx):
    axe_mod = pytest.importorskip("axe_selenium_python")
    d, *_ = ctx
    axe = axe_mod.Axe(d)
    axe.inject()
    violations = [v for v in axe.run()["violations"] if v["impact"] in ("serious", "critical")]
    assert not violations, axe.report(violations)
