"""Central settings."""
import os

BASE_URL = os.getenv("BASE_URL", "http://localhost:5173").rstrip("/")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "superadmin@ddas.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "SuperAdmin@123")
BROWSER = os.getenv("BROWSER", "chrome")
HEADLESS = os.getenv("HEADLESS", "0") == "1"
TIMEOUT = int(os.getenv("TIMEOUT", "10"))

VIEWPORTS = {
    "desktop": (1440, 900),
    "laptop": (1280, 720),
    "tablet": (768, 1024),
    "mobile": (375, 812),
}

ADMIN_PAGES = {
    "dashboard":   {"path": "/admin/dashboard",   "heading": "dashboard"},
    "reports":     {"path": "/admin/reports",     "heading": "report"},
    "dams":        {"path": "/admin/dams",        "heading": "dam"},
    "sensors":     {"path": "/admin/sensors",     "heading": "sensor"},
    "alerts":      {"path": "/admin/alerts",      "heading": "alert"},
    "device_keys": {"path": "/admin/device-keys", "heading": "key|device"},
    "users":       {"path": "/admin/users",       "heading": "user"},
    "regions":     {"path": "/admin/regions",     "heading": "region"},
    "roles":       {"path": "/admin/roles",       "heading": "role"},
    "news":        {"path": "/admin/news",        "heading": "news"},
}

PUBLIC_PAGES = {
    "home":     {"path": "/",         "heading": ""},
    "login":    {"path": "/login",    "heading": "login|sign in|welcome"},
    "register": {"path": "/register", "heading": "register|sign up|create"},
}