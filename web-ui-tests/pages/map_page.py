"""Map page object - shared locators for Leaflet / Mapbox / MapLibre / OpenLayers maps."""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from pages.admin_page import AdminPage


class MapPage(AdminPage):
    """Base for all map-based admin pages."""

    MAP = (By.CSS_SELECTOR,
           ".leaflet-container, .mapboxgl-map, .maplibregl-map, "
           ".gm-style, .ol-viewport, [data-testid='map']")
    MARKER = (By.CSS_SELECTOR,
              ".leaflet-marker-icon, .mapboxgl-marker, .maplibregl-marker, "
              ".ol-overlay-container *[class*='marker' i], [class*='marker' i]")
    POPUP = (By.CSS_SELECTOR,
             ".leaflet-popup, .mapboxgl-popup, .maplibregl-popup, "
             "[class*='popup' i], [class*='infowindow' i], .gm-style-iw")
    ZOOM_IN = (By.CSS_SELECTOR,
               ".leaflet-control-zoom-in, .mapboxgl-ctrl-zoom-in, "
               ".maplibregl-ctrl-zoom-in, button[aria-label*='zoom in' i], button[title*='zoom in' i]")
    ZOOM_OUT = (By.CSS_SELECTOR,
                ".leaflet-control-zoom-out, .mapboxgl-ctrl-zoom-out, "
                ".maplibregl-ctrl-zoom-out, button[aria-label*='zoom out' i], button[title*='zoom out' i]")
    TILES_LOADED = (By.CSS_SELECTOR, ".leaflet-tile-loaded")

    def wait_for_map(self, timeout=15):
        return WebDriverWait(self.driver, timeout).until(
            lambda d: d.find_elements(*self.MAP)
        )

    def map_element(self, timeout=15):
        return self.visible(self.MAP, timeout)

    def markers(self):
        return self.visible_all(self.MARKER)

    def popups(self):
        return self.visible_all(self.POPUP)


class MapFuncPage(MapPage):
    path = "/admin/mapFunc"


class MapDetailedPage(MapPage):
    """Opened via /admin/dams/:id/map (reached from a dam detail page)."""
    path = "/admin/dams"   # list first; navigate to detail then /map


class SafeLocationsPage(MapPage):
    path = "/admin/system-safe-locations-test"
