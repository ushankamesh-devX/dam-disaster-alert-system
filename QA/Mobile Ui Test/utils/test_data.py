"""Test data and constants used across mobile UI test specs."""

SAMPLE_REPORTS = [
    {
        "dam_name": "Victoria Dam",
        "issue_type": "water_level",
        "description": "Rapid water level increase observed near downstream sector 3.",
    },
    {
        "dam_name": "Kotmale Dam",
        "issue_type": "leakage",
        "description": "Minor seepage detected near right spillway valve.",
    },
    {
        "dam_name": "Randenigala Dam",
        "issue_type": "structural",
        "description": "Small hairline surface fissures noted on auxiliary wall.",
    }
]

EXPECTED_TAB_TITLES = {
    "dashboard": "FloodWatch",
    "news": "News & Updates",
    "emergency": "Safe Locations & Shelters",
    "alerts": "Alerts & Warnings",
    "report": "Report Issues",
}

NEWS_FILTER_CATEGORIES = [
    "all",
    "dam-status",
    "weather-alerts",
    "emergency",
]

EMERGENCY_HOTLINE_NUMBER = "117"
