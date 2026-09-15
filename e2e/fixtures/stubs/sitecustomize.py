"""Import hardening for the Selenium stub layer (E2E fixture).

Python imports this module automatically at interpreter startup when this
directory is on ``PYTHONPATH`` (the standard ``site`` mechanism).  It
installs a meta-path finder at the **end** of ``sys.meta_path`` that
resolves ``selenium`` and ANY ``selenium.*`` submodule — for example
``selenium.webdriver.chrome.service`` — which the explicit stub modules
in this package do not provide, so a different model's import surface can
never crash the run with ``ModuleNotFoundError``.

Because the finder is appended last, the explicit modules in this package
(and any real installed packages) always keep winning: the finder only
fabricates a module after every earlier finder failed to locate one.

The covered top-level module names come from ``AEGIS_E2E_STUB_MODULES``
(comma-separated, default ``selenium``); an empty value installs no
finder at all.  Like the rest of this layer, a fabricated module proves
generated control flow runs — it does NOT provide real API semantics.
"""

import importlib.abc
import importlib.machinery
import os
import sys
import types
from typing import Any

_STUB_MODULES_ENV = "AEGIS_E2E_STUB_MODULES"
_DEFAULT_STUB_MODULES = "selenium"


def _covered_top_level_modules() -> tuple[str, ...]:
    raw = os.environ.get(_STUB_MODULES_ENV)
    if raw is None:
        raw = _DEFAULT_STUB_MODULES
    return tuple(name.strip() for name in raw.split(",") if name.strip())


def _permissive() -> Any:
    """Reuse the stub package's ``Permissive`` placeholder (lazy import)."""
    from selenium import Permissive

    return Permissive()


class _PermissiveModule(types.ModuleType):
    """A fabricated module whose unknown attributes resolve permissively."""

    def __getattr__(self, name: str) -> Any:
        if name.startswith("_") or not name.isidentifier():
            raise AttributeError(
                f"module {self.__name__!r} has no attribute {name!r}"
            )
        return _permissive()


class _StubLoader(importlib.abc.Loader):
    """Loader that instantiates a permissive module and executes nothing."""

    def create_module(self, spec: importlib.machinery.ModuleSpec) -> types.ModuleType:
        module = _PermissiveModule(spec.name)
        # An (empty) ``__path__`` makes the fabricated module a package, so
        # arbitrarily deeper submodules resolve through this finder too.
        module.__path__ = []
        return module

    def exec_module(self, module: types.ModuleType) -> None:
        return None


class _StubMetaPathFinder(importlib.abc.MetaPathFinder):
    """Fabricate permissive modules for the covered roots, last resort only."""

    def __init__(self, top_level: tuple[str, ...]) -> None:
        self._top_level = top_level

    def find_spec(
        self,
        fullname: str,
        path: Any = None,
        target: Any = None,
    ) -> importlib.machinery.ModuleSpec | None:
        root = fullname.split(".", 1)[0]
        if root not in self._top_level:
            return None
        return importlib.machinery.ModuleSpec(
            fullname, _StubLoader(), is_package=True
        )


def _install_finder() -> None:
    top_level = _covered_top_level_modules()
    if not top_level:
        return
    if any(isinstance(finder, _StubMetaPathFinder) for finder in sys.meta_path):
        return
    sys.meta_path.append(_StubMetaPathFinder(top_level))


try:
    _install_finder()
except Exception:
    # Hardening must never break interpreter startup: a failed install
    # only means uncovered imports raise ModuleNotFoundError again, which
    # the surrounding E2E run reports as an ordinary execution failure.
    pass
