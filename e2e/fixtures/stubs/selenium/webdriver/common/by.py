"""Permissive stub of ``selenium.webdriver.common.by`` (E2E fixture).

``By`` carries the real selenium locator-strategy values so tuples like
``(By.ID, "q")`` behave naturally.  Unknown strategy names resolve
permissively instead of crashing the script.
"""

from selenium import Permissive


class _ByMeta(type):
    def __getattr__(cls, name: str) -> "Permissive":
        return Permissive()


class By(Permissive, metaclass=_ByMeta):
    """Locator strategy constants matching real selenium values."""

    ID = "id"
    NAME = "name"
    XPATH = "xpath"
    CSS_SELECTOR = "css selector"
    CLASS_NAME = "class name"
    TAG_NAME = "tag name"
    LINK_TEXT = "link text"
    PARTIAL_LINK_TEXT = "partial link text"
