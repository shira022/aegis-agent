"""Permissive stub of ``selenium.common.exceptions`` (E2E fixture).

The five exception classes listed below are real classes: they can be
constructed, raised, and caught.  Any other name dynamically becomes a
``WebDriverException`` subclass (created on first access and cached), so
``except SomeName:`` in a generated script works even for exception names
this stub never declared.
"""

from typing import Any


class WebDriverException(Exception):
    def __init__(self, message: Any = None, stacktrace: Any = None) -> None:
        self.msg = message
        self.stacktrace = stacktrace
        super().__init__(message)


class TimeoutException(WebDriverException):
    pass


class NoSuchElementException(WebDriverException):
    pass


class ElementNotInteractableException(WebDriverException):
    pass


class StaleElementReferenceException(WebDriverException):
    pass


def __getattr__(name: str) -> Any:
    if name.startswith("_") or not name.isidentifier():
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    cls = type(
        name,
        (WebDriverException,),
        {
            "__module__": __name__,
            "__qualname__": name,
            "__doc__": "Dynamically created permissive selenium exception stub.",
        },
    )
    globals()[name] = cls
    return cls
