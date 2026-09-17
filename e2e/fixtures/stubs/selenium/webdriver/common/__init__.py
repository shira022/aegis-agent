"""Permissive stub of ``selenium.webdriver.common`` (E2E fixture)."""

import importlib
from typing import Any

from selenium import Permissive


def __getattr__(name: str) -> Any:
    if name.startswith("_") or not name.isidentifier():
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    try:
        return importlib.import_module("." + name, __name__)
    except ImportError:
        return Permissive()
