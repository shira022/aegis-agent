"""Permissive stub of ``selenium.webdriver.support.ui`` (E2E fixture).

``WebDriverWait`` is a placeholder: ``until`` / ``until_not`` succeed
immediately and return a permissive stub.  No real waiting or polling
happens.  Any other name in this module (e.g. ``Select``) resolves
permissively.
"""

from typing import Any

from selenium import Permissive


class WebDriverWait(Permissive):
    """Placeholder wait whose conditions succeed immediately."""

    def __init__(
        self,
        driver: Any,
        timeout: Any = None,
        poll_frequency: Any = 0.5,
        ignored_exceptions: Any = None,
    ) -> None:
        self._driver = driver
        self._timeout = timeout
        self._poll_frequency = poll_frequency
        self._ignored_exceptions = ignored_exceptions

    def until(self, method: Any, message: str = "") -> Permissive:
        return Permissive()

    def until_not(self, method: Any, message: str = "") -> Permissive:
        return Permissive()


def __getattr__(name: str) -> Any:
    if name.startswith("_") or not name.isidentifier():
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    return Permissive()
