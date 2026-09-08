# ─── Aegis Python Runtime Tests ────────────────────────────────────
"""Shared test fixtures for aegis python-runtime pytest suite."""

import json
import os
import sys
import tempfile
import textwrap
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

# ─── Project root ──────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent


# ─── Sample Operation Logs ─────────────────────────────────────────

@pytest.fixture
def sample_operation_log() -> dict[str, Any]:
    """Minimal browser operation log with one click step."""
    return {
        "id": "op-1",
        "taskId": "task-1",
        "steps": [
            {
                "type": "click",
                "target": {"selector": "#submit-btn"},
                "timestamp": "2024-01-15T10:30:00Z",
            }
        ],
        "recordedAt": "2024-01-15T10:30:00Z",
        "source": "browser",
    }


@pytest.fixture
def complex_operation_log() -> dict[str, Any]:
    """Multi-step browser operation log with navigate, type, click, screenshot."""
    return {
        "id": "op-2",
        "taskId": "task-2",
        "steps": [
            {
                "type": "navigate",
                "target": {"text": "https://example.com"},
                "timestamp": "2024-01-15T10:00:00Z",
            },
            {
                "type": "type",
                "target": {"selector": "input[name='email']", "text": "user@example.com"},
                "timestamp": "2024-01-15T10:00:05Z",
            },
            {
                "type": "click",
                "target": {"selector": "button[type='submit']"},
                "timestamp": "2024-01-15T10:00:10Z",
            },
            {
                "type": "wait",
                "target": {"selector": ".result"},
                "timestamp": "2024-01-15T10:00:12Z",
            },
            {
                "type": "screenshot",
                "target": {"screenshot": "result.png"},
                "timestamp": "2024-01-15T10:00:15Z",
            },
        ],
        "recordedAt": "2024-01-15T10:00:00Z",
        "source": "browser",
    }


@pytest.fixture
def desktop_operation_log() -> dict[str, Any]:
    """Desktop automation operation log."""
    return {
        "id": "op-3",
        "taskId": "task-3",
        "steps": [
            {
                "type": "click",
                "target": {"screenshot": "/tmp/screen.png"},
                "timestamp": "2024-01-15T10:00:00Z",
            },
            {
                "type": "type",
                "target": {"text": "hello world"},
                "timestamp": "2024-01-15T10:00:05Z",
            },
        ],
        "recordedAt": "2024-01-15T10:00:00Z",
        "source": "desktop",
    }


@pytest.fixture
def sample_ai_generated_code() -> str:
    """Sample AI-generated Python code for browser automation."""
    return textwrap.dedent("""\
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto('https://example.com')
            page.click('#submit-btn')
            browser.close()
    """)


@pytest.fixture
def sample_desktop_code() -> str:
    """Sample AI-generated Python code for desktop automation."""
    return textwrap.dedent("""\
        import pyautogui
        import time

        pyautogui.click(100, 200)
        time.sleep(0.5)
        pyautogui.typewrite('hello world')
    """)


# ─── Dangerous code samples ────────────────────────────────────────

@pytest.fixture
def dangerous_code_samples() -> list[dict[str, str]]:
    """Code samples that should be caught by the validator."""
    return [
        {
            "name": "os.system",
            "code": 'import os\nos.system("rm -rf /")',
            "pattern": "os.system",
        },
        {
            "name": "subprocess shell=True",
            "code": 'import subprocess\nsubprocess.run("ls", shell=True)',
            "pattern": "subprocess",
        },
        {
            "name": "eval",
            "code": 'eval("__import__(\'os\').system(\'id\')")',
            "pattern": "eval",
        },
        {
            "name": "exec",
            "code": "exec('import os; os.system(\"ls\")')",
            "pattern": "exec",
        },
        {
            "name": "os.remove",
            "code": 'import os\nos.remove("/etc/passwd")',
            "pattern": "os.remove",
        },
        {
            "name": "shutil.rmtree",
            "code": "import shutil\nshutil.rmtree('/important')",
            "pattern": "shutil.rmtree",
        },
        {
            "name": "os.popen",
            "code": 'import os\nos.popen("whoami")',
            "pattern": "os.popen",
        },
        {
            "name": "__import__",
            "code": '__import__("os").system("id")',
            "pattern": "__import__",
        },
        {
            "name": "globals()",
            "code": "globals()['__builtins__']",
            "pattern": "globals",
        },
        {
            "name": "os.rename",
            "code": 'import os\nos.rename("a.txt", "b.txt")',
            "pattern": "os.rename",
        },
        {
            "name": "os.mkdir",
            "code": 'import os\nos.mkdir("/tmp/evil")',
            "pattern": "os.mkdir",
        },
        {
            "name": "rmdir",
            "code": 'import os\nos.rmdir("/tmp/dir")',
            "pattern": "rmdir",
        },
    ]


# ─── Temporary directory fixture ───────────────────────────────────

@pytest.fixture
def tmp_work_dir(tmp_path: Path) -> Path:
    """Shared temporary working directory for test scripts."""
    return tmp_path


@pytest.fixture
def templates_dir() -> Path:
    """Path to the templates directory."""
    return PROJECT_ROOT / "templates"
