"""Permissive stub of ``selenium.webdriver.support.expected_conditions`` (E2E fixture).

Every name resolves to a callable that accepts any arguments and returns a
permissive stub, so conditions like ``EC.element_to_be_clickable(locator)``
or unknown condition names never crash the script.
"""

from typing import Any

from selenium import Permissive


def __getattr__(name: str) -> Any:
    if name.startswith("_") or not name.isidentifier():
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

    def condition(*args: Any, **kwargs: Any) -> Permissive:
        return Permissive()

    condition.__name__ = name
    globals()[name] = condition
    return condition
