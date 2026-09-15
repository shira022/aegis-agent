"""Permissive stub of the ``selenium`` package (E2E fixture).

This scaffold exists ONLY so that a model-generated Selenium script can run
to completion on a machine that has no selenium installed.  It proves that
the generated control flow executes; it does NOT prove that a real browser
was driven, and it must never be presented as such.  Runs that use this
layer must be recorded as ``stubbed`` in artifacts.
"""

import importlib
from typing import Any


class Permissive:
    """Placeholder that tolerates any attribute access, call, or operator."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        pass

    def __getattr__(self, name: str) -> "Permissive":
        return Permissive()

    def __call__(self, *args: Any, **kwargs: Any) -> "Permissive":
        return Permissive()

    def __enter__(self) -> "Permissive":
        return self

    def __exit__(self, exc_type: Any, exc_value: Any, traceback: Any) -> bool:
        return False

    def __iter__(self) -> "Permissive":
        return self

    def __next__(self) -> Any:
        raise StopIteration

    def __len__(self) -> int:
        return 0

    def __bool__(self) -> bool:
        return True

    def __contains__(self, item: Any) -> bool:
        return True

    def __getitem__(self, key: Any) -> "Permissive":
        return Permissive()

    def __eq__(self, other: Any) -> bool:
        return True

    def __ne__(self, other: Any) -> bool:
        return False

    def __lt__(self, other: Any) -> bool:
        return True

    def __le__(self, other: Any) -> bool:
        return True

    def __gt__(self, other: Any) -> bool:
        return True

    def __ge__(self, other: Any) -> bool:
        return True

    __hash__ = object.__hash__

    def __str__(self) -> str:
        return "<selenium-stub>"

    def __repr__(self) -> str:
        return f"<selenium-stub Permissive at {id(self):#x}>"

    def __int__(self) -> int:
        return 0

    def __float__(self) -> float:
        return 0.0

    def __index__(self) -> int:
        return 0

    def __neg__(self) -> "Permissive":
        return Permissive()

    def __pos__(self) -> "Permissive":
        return Permissive()

    def __abs__(self) -> "Permissive":
        return Permissive()

    def __add__(self, other: Any) -> "Permissive":
        return Permissive()

    def __radd__(self, other: Any) -> "Permissive":
        return Permissive()

    def __sub__(self, other: Any) -> "Permissive":
        return Permissive()

    def __rsub__(self, other: Any) -> "Permissive":
        return Permissive()

    def __mul__(self, other: Any) -> "Permissive":
        return Permissive()

    def __rmul__(self, other: Any) -> "Permissive":
        return Permissive()

    def __truediv__(self, other: Any) -> "Permissive":
        return Permissive()

    def __rtruediv__(self, other: Any) -> "Permissive":
        return Permissive()

    def __floordiv__(self, other: Any) -> "Permissive":
        return Permissive()

    def __rfloordiv__(self, other: Any) -> "Permissive":
        return Permissive()

    def __mod__(self, other: Any) -> "Permissive":
        return Permissive()

    def __rmod__(self, other: Any) -> "Permissive":
        return Permissive()

    def __pow__(self, other: Any) -> "Permissive":
        return Permissive()


def __getattr__(name: str) -> Any:
    if name.startswith("_") or not name.isidentifier():
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    try:
        return importlib.import_module("." + name, __name__)
    except ImportError:
        return Permissive()
