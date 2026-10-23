"""Central configuration for Dam Disaster Alert System Mobile UI Tests."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from the current directory if it exists
ENV_PATH = Path(__file__).resolve().parent / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)

# Base directories
BASE_DIR = Path(__file__).resolve().parent
REPORTS_DIR = BASE_DIR / "reports"
SCREENSHOTS_DIR = REPORTS_DIR / "screenshots"

# Ensure output directories exist
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

# Appium Server
APPIUM_SERVER_URL = os.getenv("APPIUM_SERVER_URL", "http://127.0.0.1:4723")

# Android Capabilities
PLATFORM_NAME = os.getenv("PLATFORM_NAME", "Android")
PLATFORM_VERSION = os.getenv("PLATFORM_VERSION", "14.0")
DEVICE_NAME = os.getenv("ANDROID_DEVICE_NAME", "Android Emulator")
AUTOMATION_NAME = os.getenv("AUTOMATION_NAME", "UiAutomator2")

# App Identification (Supports either APK path or Package+Activity)
APP_PATH = os.getenv("APP_PATH", "")
APP_PACKAGE = os.getenv("APP_PACKAGE", "com.anonymous.app")
APP_ACTIVITY = os.getenv("APP_ACTIVITY", ".MainActivity")

# Execution Timeouts (Seconds)
EXPLICIT_WAIT = int(os.getenv("EXPLICIT_WAIT", "15"))
IMPLICIT_WAIT = int(os.getenv("IMPLICIT_WAIT", "3"))

# Backend API and Test Credentials
API_BASE_URL = os.getenv("API_BASE_URL", "http://10.0.2.2:8080/api/v1")
TEST_EMAIL = os.getenv("TEST_EMAIL", "superadmin@ddas.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "SuperAdmin@123")
VIEWER_EMAIL = os.getenv("VIEWER_EMAIL", "viewer@ddas.com")
VIEWER_PASSWORD = os.getenv("VIEWER_PASSWORD", "Viewer@123")

def get_desired_capabilities() -> dict:
    """Builds and returns the UiAutomator2 desired capabilities dictionary."""
    caps = {
        "platformName": PLATFORM_NAME,
        "appium:platformVersion": PLATFORM_VERSION,
        "appium:deviceName": DEVICE_NAME,
        "appium:automationName": AUTOMATION_NAME,
        "appium:noReset": False,
        "appium:fullReset": False,
        "appium:autoGrantPermissions": True,
        "appium:newCommandTimeout": 300,
        "appium:ensureWebviewsHavePages": True,
        "appium:nativeWebScreenshot": True,
    }

    # If an APK file is provided and exists, use app capability; otherwise use package/activity
    if APP_PATH and Path(APP_PATH).exists():
        caps["appium:app"] = str(Path(APP_PATH).resolve())
    else:
        caps["appium:appPackage"] = APP_PACKAGE
        caps["appium:appActivity"] = APP_ACTIVITY

    return caps
