"""Wait and polling helpers for mobile UI automation."""
import time
from typing import Callable, Any
from selenium.common.exceptions import WebDriverException

def wait_until_true(
    predicate: Callable[[], bool],
    timeout_sec: float = 10.0,
    poll_interval_sec: float = 0.5,
    error_message: str = "Condition not met within timeout"
) -> bool:
    """
    Polls the predicate function until it returns True or timeout expires.
    """
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        try:
            if predicate():
                return True
        except WebDriverException:
            pass
        time.sleep(poll_interval_sec)
    raise TimeoutError(f"{error_message} (after {timeout_sec}s)")

def safe_execute(action: Callable[[], Any], fallback: Any = None) -> Any:
    """Safely executes a callable, returning fallback on failure."""
    try:
        return action()
    except Exception:
        return fallback
