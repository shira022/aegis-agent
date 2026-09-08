"""Dependency Checker — verifies that required Python packages are installed.

Checks for python3, playwright, and pyautogui availability and versions.
"""

import subprocess
import sys
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class DependencyStatus(Enum):
    """Status of a dependency check."""

    OK = "ok"
    MISSING = "missing"
    OUTDATED = "outdated"
    ERROR = "error"


@dataclass
class DependencyInfo:
    """Result of a single dependency check."""

    name: str
    status: DependencyStatus
    installed_version: str = ""
    required_version: str = ""
    message: str = ""


# ── Internal helpers ──────────────────────────────────────────────


def _run_cmd(cmd: list[str], timeout: int = 10) -> subprocess.CompletedProcess:
    """Run a command and return the CompletedProcess."""
    return subprocess.run(
        cmd,
        capture_output=True,
        timeout=timeout,
    )


def _parse_version(output: str) -> str:
    """Extract a version string from command output."""
    import re

    match = re.search(r"(\d+\.\d+[\.\d]*)", output)
    return match.group(1) if match else output.strip().split("\n")[0].strip()


# ── Main checker ──────────────────────────────────────────────────


class DependencyChecker:
    """Checks that required Python dependencies are installed."""

    # (name, check_function_name) pairs
    _DEPS = [
        "python3",
        "playwright",
        "pyautogui",
    ]

    def __init__(self, python_path: str | None = None):
        self._python_path = python_path or sys.executable

    # ── Individual checks ─────────────────────────────────────────

    def check_python3(self) -> DependencyInfo:
        """Check that python3 is available and report its version."""
        try:
            result = _run_cmd([self._python_path, "--version"])
            if result.returncode == 0:
                version = _parse_version(result.stdout.decode().strip())
                return DependencyInfo(
                    name="python3",
                    status=DependencyStatus.OK,
                    installed_version=version,
                )
            else:
                stderr = result.stderr.decode().strip()
                return DependencyInfo(
                    name="python3",
                    status=DependencyStatus.ERROR,
                    message=stderr,
                )
        except FileNotFoundError:
            return DependencyInfo(
                name="python3",
                status=DependencyStatus.MISSING,
                message="python3 binary not found",
            )
        except Exception as e:
            return DependencyInfo(
                name="python3",
                status=DependencyStatus.ERROR,
                message=str(e),
            )

    def check_playwright(self) -> DependencyInfo:
        """Check that playwright is importable and report its version."""
        try:
            result = _run_cmd([
                self._python_path,
                "-c",
                "import playwright; print(playwright.__version__)",
            ])
            if result.returncode == 0:
                version = _parse_version(result.stdout.decode().strip())
                return DependencyInfo(
                    name="playwright",
                    status=DependencyStatus.OK,
                    installed_version=version,
                )
            else:
                stderr = result.stderr.decode().strip()
                if "ModuleNotFoundError" in stderr or "No module" in stderr:
                    return DependencyInfo(
                        name="playwright",
                        status=DependencyStatus.MISSING,
                        message="playwright not installed",
                    )
                return DependencyInfo(
                    name="playwright",
                    status=DependencyStatus.ERROR,
                    message=stderr,
                )
        except FileNotFoundError:
            return DependencyInfo(
                name="playwright",
                status=DependencyStatus.MISSING,
                message="python3 not found to check playwright",
            )
        except Exception as e:
            return DependencyInfo(
                name="playwright",
                status=DependencyStatus.ERROR,
                message=str(e),
            )

    def check_pyautogui(self) -> DependencyInfo:
        """Check that pyautogui is importable and report its version."""
        try:
            result = _run_cmd([
                self._python_path,
                "-c",
                "import pyautogui; print(pyautogui.__version__)",
            ])
            if result.returncode == 0:
                version = _parse_version(result.stdout.decode().strip())
                return DependencyInfo(
                    name="pyautogui",
                    status=DependencyStatus.OK,
                    installed_version=version,
                )
            else:
                stderr = result.stderr.decode().strip()
                if "ModuleNotFoundError" in stderr or "No module" in stderr:
                    return DependencyInfo(
                        name="pyautogui",
                        status=DependencyStatus.MISSING,
                        message="pyautogui not installed",
                    )
                return DependencyInfo(
                    name="pyautogui",
                    status=DependencyStatus.ERROR,
                    message=stderr,
                )
        except FileNotFoundError:
            return DependencyInfo(
                name="pyautogui",
                status=DependencyStatus.MISSING,
                message="python3 not found to check pyautogui",
            )
        except Exception as e:
            return DependencyInfo(
                name="pyautogui",
                status=DependencyStatus.ERROR,
                message=str(e),
            )

    # ── Bulk check ────────────────────────────────────────────────

    def check_all(self) -> dict[str, DependencyInfo]:
        """Check all known dependencies.

        Returns:
            Dict mapping dependency name to DependencyInfo.
        """
        return {
            "python3": self.check_python3(),
            "playwright": self.check_playwright(),
            "pyautogui": self.check_pyautogui(),
        }

    def get_known_dependencies(self) -> list[DependencyInfo]:
        """Return a list of known dependency info stubs (name only)."""
        return [DependencyInfo(name=name, status=DependencyStatus.OK) for name in self._DEPS]

    # ── Convenience ───────────────────────────────────────────────

    def is_runnable(self) -> bool:
        """Return True if all critical dependencies are available."""
        results = self.check_all()
        return all(info.status == DependencyStatus.OK for info in results.values())

    def get_install_instructions(self, package: str) -> str:
        """Return pip install instructions for a package."""
        instructions = {
            "playwright": (
                "Install playwright:\n"
                "  pip install playwright\n"
                "  playwright install\n"
                "\n"
                "Or with uv:\n"
                "  uv pip install playwright\n"
                "  uv run playwright install"
            ),
            "pyautogui": (
                "Install pyautogui:\n"
                "  pip install pyautogui\n"
                "\n"
                "Or with uv:\n"
                "  uv pip install pyautogui"
            ),
            "python3": (
                "Python 3 is required but not found.\n"
                "Install Python 3.8+ from https://www.python.org/downloads/"
            ),
        }
        return instructions.get(
            package,
            f"Install {package}:\n  pip install {package}\n  # or: uv pip install {package}"
        )
