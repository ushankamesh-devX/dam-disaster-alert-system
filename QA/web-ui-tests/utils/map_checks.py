"""Shared checks for the three map pages. Supports Leaflet, Mapbox/MapLibre, Google Maps, OpenLayers."""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

MAP = (By.CSS_SELECTOR, ".leaflet-container, .mapboxgl-map, .maplibregl-map, .gm-style, .ol-viewport, [data-testid='map']")
MARKER = (By.CSS_SELECTOR, ".leaflet-marker-icon, .mapboxgl-marker, .maplibregl-marker, .ol-overlay-container *[class*='marker' i], [class*='marker' i]")
POPUP = (By.CSS_SELECTOR, ".leaflet-popup, .mapboxgl-popup, .maplibregl-popup, [class*='popup' i], [class*='infowindow' i], .gm-style-iw")
ZOOM_IN = (By.CSS_SELECTOR, ".leaflet-control-zoom-in, .mapboxgl-ctrl-zoom-in, .maplibregl-ctrl-zoom-in, button[aria-label*='zoom in' i], button[title*='zoom in' i]")
ZOOM_OUT = (By.CSS_SELECTOR, ".leaflet-control-zoom-out, .mapboxgl-ctrl-zoom-out, .maplibregl-ctrl-zoom-out, button[aria-label*='zoom out' i], button[title*='zoom out' i]")


def map_visible_with_size(page):
    m = page.visible(MAP, 15)
    size = m.size
    assert size["width"] >= 200 and size["height"] >= 200, f"Map container too small: {size} (CSS height missing?)"
    return m


def tiles_loaded(page):
    d = page.driver
    if d.find_elements(By.CSS_SELECTOR, ".leaflet-container"):
        WebDriverWait(d, 15).until(lambda x: len(x.find_elements(By.CSS_SELECTOR, ".leaflet-tile-loaded")) > 0)
        gray = d.execute_script("return document.querySelectorAll('.leaflet-tile:not(.leaflet-tile-loaded)').length")
        assert gray < 10, f"{gray} map tiles failed to load"
    else:
        assert d.find_elements(By.CSS_SELECTOR, "canvas, .gm-style img"), "Map has no canvas/tiles rendered"


def markers_present(page, minimum=1):
    WebDriverWait(page.driver, 10).until(lambda d: len(page.visible_all(MARKER)) >= minimum)


def zoom_controls_work(page):
    if not page.is_present(ZOOM_IN, 2):
        pytest.skip("No zoom controls found")
    page.click(ZOOM_IN)
    page.click(ZOOM_OUT)
    assert page.is_present(MAP, 3), "Map disappeared after zoom"


def marker_click_shows_popup(page):
    markers = page.visible_all((By.CSS_SELECTOR, ".leaflet-marker-icon, .mapboxgl-marker, .maplibregl-marker"))
    if not markers:
        pytest.skip("No standard marker elements to click")
    page.driver.execute_script("arguments[0].click()", markers[0])
    WebDriverWait(page.driver, 5).until(lambda d: page.visible_all(POPUP))
    popup = page.visible_all(POPUP)[0]
    assert popup.text.strip(), "Marker popup is empty"
