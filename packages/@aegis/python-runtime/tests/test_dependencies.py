"""Tests for the dependency checker (src/dependencies.py).

The dependency checker verifies python3, playwright, pyautogui are installed.
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch, Mock
import subprocess

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from dependencies import DependencyChecker, DependencyStatus, DependencyInfo


class TestDependencyCheckerInit:
    """Tests for DependencyChecker construction."""

    def test_create_checker(self):
        checker = DependencyChecker()
        assert checker is not None

    def test_checker_has_required_deps(self):
        checker = DependencyChecker()
        dep_names = [d.name for d in checker.get_known_dependencies()]
        assert "python3" in dep_names
        assert "playwright" in dep_names
        assert "pyautogui" in dep_names


class TestCheckPython3:
    """Tests for python3 availability check."""

    @patch("dependencies.subprocess.run")
    def test_python3_found(self, mock_run):
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=b"Python 3.13.15\n",
            stderr=b"",
        )
        checker = DependencyChecker()
        result = checker.check_python3()
        assert result.status == DependencyStatus.OK
        assert "3.13" in result.installed_version or result.installed_version != ""

    @patch("dependencies.subprocess.run")
    def test_python3_not_found(self, mock_run):
        mock_run.side_effect = FileNotFoundError("python3 not found")
        checker = DependencyChecker()
        result = checker.check_python3()
        assert result.status == DependencyStatus.MISSING

    @patch("dependencies.subprocess.run")
    def test_python3_old_version(self, mock_run):
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=b"Python 3.7.0\n",
            stderr=b"",
        )
        checker = DependencyChecker()
        result = checker.check_python3()
        # Version 3.7 should still be detected (may warn but not error)
        assert result.status in (DependencyStatus.OK, DependencyStatus.OUTDATED)

    @patch("dependencies.subprocess.run")
    def test_python3_check_returns_version(self, mock_run):
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=b"Python 3.11.5\n",
            stderr=b"",
        )
        checker = DependencyChecker()
        result = checker.check_python3()
        assert result.installed_version == "3.11.5"


class TestCheckPlaywright:
    """Tests for playwright availability check."""

    @patch("dependencies.subprocess.run")
    def test_playwright_installed(self, mock_run):
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=b"Version: 1.40.0\n",
            stderr=b"",
        )
        checker = DependencyChecker()
        result = checker.check_playwright()
        assert result.status == DependencyStatus.OK

    @patch("dependencies.subprocess.run")
    def test_playwright_not_installed(self, mock_run):
        mock_run.side_effect = FileNotFoundError("playwright not found")
        checker = DependencyChecker()
        result = checker.check_playwright()
        assert result.status == DependencyStatus.MISSING

    @patch("dependencies.subprocess.run")
    def test_playwright_import_error(self, mock_run):
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout=b"",
            stderr=b"ModuleNotFoundError: No module named 'playwright'",
        )
        checker = DependencyChecker()
        result = checker.check_playwright()
        assert result.status == DependencyStatus.MISSING


class TestCheckPyautogui:
    """Tests for pyautogui availability check."""

    @patch("dependencies.subprocess.run")
    def test_pyautogui_installed(self, mock_run):
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=b"0.9.54\n",
            stderr=b"",
        )
        checker = DependencyChecker()
        result = checker.check_pyautogui()
        assert result.status == DependencyStatus.OK

    @patch("dependencies.subprocess.run")
    def test_pyautogui_not_installed(self, mock_run):
        mock_run.side_effect = FileNotFoundError("python3 not found")
        checker = DependencyChecker()
        result = checker.check_pyautogui()
        assert result.status == DependencyStatus.MISSING


class TestCheckAll:
    """Tests for the bulk check_all method."""

    @patch("dependencies.subprocess.run")
    def test_all_ok(self, mock_run):
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=b"1.40.0\n",
            stderr=b"",
        )
        checker = DependencyChecker()
        results = checker.check_all()
        assert isinstance(results, dict)
        assert "python3" in results
        assert "playwright" in results
        assert "pyautogui" in results

    @patch("dependencies.subprocess.run")
    def test_check_all_returns_status_per_dep(self, mock_run):
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=b"ok\n",
            stderr=b"",
        )
        checker = DependencyChecker()
        results = checker.check_all()
        for name, info in results.items():
            assert isinstance(info, DependencyInfo)
            assert info.status in (
                DependencyStatus.OK,
                DependencyStatus.MISSING,
                DependencyStatus.OUTDATED,
                DependencyStatus.ERROR,
            )


class TestInstallInstructions:
    """Tests for install instruction generation."""

    def test_playwright_install_instructions(self):
        checker = DependencyChecker()
        instructions = checker.get_install_instructions("playwright")
        assert isinstance(instructions, str)
        assert len(instructions) > 0
        assert "playwright" in instructions.lower()

    def test_pyautogui_install_instructions(self):
        checker = DependencyChecker()
        instructions = checker.get_install_instructions("pyautogui")
        assert isinstance(instructions, str)
        assert "pyautogui" in instructions.lower()

    def test_unknown_dep_instructions(self):
        checker = DependencyChecker()
        instructions = checker.get_install_instructions("nonexistent-package")
        assert isinstance(instructions, str)


class TestIsRunnable:
    """Tests for the is_runnable convenience check."""

    @patch("dependencies.subprocess.run")
    def test_runnable_when_all_ok(self, mock_run):
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=b"1.0\n",
            stderr=b"",
        )
        checker = DependencyChecker()
        assert checker.is_runnable() is True

    @patch("dependencies.subprocess.run")
    def test_not_runnable_when_missing(self, mock_run):
        mock_run.side_effect = FileNotFoundError("not found")
        checker = DependencyChecker()
        assert checker.is_runnable() is False
