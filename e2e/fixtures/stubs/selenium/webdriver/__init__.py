"""Permissive stub of ``selenium.webdriver`` (E2E fixture).

``Chrome`` and ``Firefox`` are permissive placeholders: constructing them,
calling methods on them, or quitting them does nothing and launches no
browser.  Real submodules (``common``, ``support``) resolve to the stub
modules in this tree; any other attribute resolves permissively.
"""

import importlib
from typing import Any

from selenium import Permissive


class Chrome(Permissive):
    """Permissive placeholder; ``webdriver.Chrome()`` launches nothing."""


class Firefox(Permissive):
    """Permissive placeholder; ``webdriver.Firefox()`` launches nothing."""


def __getattr__(name: str) -> Any:
    if name.startswith("_") or not name.isidentifier():
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    try:
        return importlib.import_module("." + name, __name__)
    except ImportError:
        return Permissive()
