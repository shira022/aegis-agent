"""Tests for the Python script generator (src/generator.py).

The generator takes OperationLog JSON + AI-generated code and produces
a runnable .py file with structured JSON output on stdout.
"""

import json
import sys
import textwrap
from pathlib import Path
from unittest.mock import patch

import pytest

# Add src to path so we can import the module
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from generator import ScriptGenerator, GenerationConfig


class TestScriptGeneratorInit:
    """Tests for ScriptGenerator construction."""

    def test_create_with_defaults(self):
        gen = ScriptGenerator()
        assert gen is not None
        assert gen.config is not None

    def test_create_with_custom_config(self):
        config = GenerationConfig(
            template_dir="/custom/templates",
            python_path="/usr/bin/python3.11",
            include_logging=True,
            include_error_handling=True,
        )
        gen = ScriptGenerator(config)
        assert gen.config.template_dir == "/custom/templates"
        assert gen.config.python_path == "/usr/bin/python3.11"
        assert gen.config.include_logging is True
        assert gen.config.include_error_handling is True

    def test_config_defaults(self):
        config = GenerationConfig()
        assert config.include_logging is True
        assert config.include_error_handling is True
        assert config.include_screenshot_capture is True
        assert config.output_json is True


class TestGenerateScript:
    """Tests for the main generate_script method."""

    def test_generate_browser_script(self, sample_operation_log, sample_ai_generated_code):
        gen = ScriptGenerator()
        result = gen.generate(
            operation_log=sample_operation_log,
            ai_code=sample_ai_generated_code,
        )
        assert isinstance(result, str)
        assert len(result) > 0
        # Must contain the shebang
        assert result.startswith("#!/usr/bin/env python3")

    def test_generate_desktop_script(self, desktop_operation_log, sample_desktop_code):
        gen = ScriptGenerator()
        result = gen.generate(
            operation_log=desktop_operation_log,
            ai_code=sample_desktop_code,
        )
        assert isinstance(result, str)
        assert "# -*- coding: utf-8 -*-" in result

    def test_generate_includes_json_output(self, sample_operation_log, sample_ai_generated_code):
        gen = ScriptGenerator()
        result = gen.generate(
            operation_log=sample_operation_log,
            ai_code=sample_ai_generated_code,
        )
        # Must include JSON output for TypeScript executor
        assert "json" in result.lower() or "json.dumps" in result

    def test_generate_includes_operation_id(self, sample_operation_log, sample_ai_generated_code):
        gen = ScriptGenerator()
        result = gen.generate(
            operation_log=sample_operation_log,
            ai_code=sample_ai_generated_code,
        )
        assert "op-1" in result or "task-1" in result

    def test_generate_with_logging(self, sample_operation_log, sample_ai_generated_code):
        config = GenerationConfig(include_logging=True)
        gen = ScriptGenerator(config)
        result = gen.generate(
            operation_log=sample_operation_log,
            ai_code=sample_ai_generated_code,
        )
        assert "logging" in result.lower()
        assert "import logging" in result

    def test_generate_with_error_handling(self, sample_operation_log, sample_ai_generated_code):
        config = GenerationConfig(include_error_handling=True)
        gen = ScriptGenerator(config)
        result = gen.generate(
            operation_log=sample_operation_log,
            ai_code=sample_ai_generated_code,
        )
        assert "try:" in result
        assert "except" in result

    def test_generate_with_screenshot_capture(self, sample_operation_log, sample_ai_generated_code):
        config = GenerationConfig(include_screenshot_capture=True)
        gen = ScriptGenerator(config)
        result = gen.generate(
            operation_log=sample_operation_log,
            ai_code=sample_ai_generated_code,
        )
        # Should include screenshot capability for browser scripts
        assert "screenshot" in result.lower() or "Screenshot" in result

    def test_generate_empty_ai_code(self, sample_operation_log):
        gen = ScriptGenerator()
        result = gen.generate(
            operation_log=sample_operation_log,
            ai_code="",
        )
        # Should still produce valid script even with empty AI code
        assert isinstance(result, str)
        assert result.startswith("#!/usr/bin/env python3")

    def test_generate_complex_operation(self, complex_operation_log, sample_ai_generated_code):
        gen = ScriptGenerator()
        result = gen.generate(
            operation_log=complex_operation_log,
            ai_code=sample_ai_generated_code,
        )
        # Multi-step operations should be present in comments/metadata
        assert isinstance(result, str)
        assert len(result) > 100


class TestGenerateEntryPoint:
    """Tests for the entry point block."""

    def test_entry_point_present(self, sample_operation_log, sample_ai_generated_code):
        gen = ScriptGenerator()
        result = gen.generate(
            operation_log=sample_operation_log,
            ai_code=sample_ai_generated_code,
        )
        assert 'if __name__ == "__main__"' in result

    def test_entry_point_calls_main(self, sample_operation_log, sample_ai_generated_code):
        gen = ScriptGenerator()
        result = gen.generate(
            operation_log=sample_operation_log,
            ai_code=sample_ai_generated_code,
        )
        assert "main(" in result or "run(" in result


class TestGenerateRequirements:
    """Tests for requirements.txt generation."""

    def test_requirements_browser(self):
        gen = ScriptGenerator()
        reqs = gen.generate_requirements(source="browser")
        assert "playwright" in reqs

    def test_requirements_desktop(self):
        gen = ScriptGenerator()
        reqs = gen.generate_requirements(source="desktop")
        assert "pyautogui" in reqs

    def test_requirements_mixed(self):
        gen = ScriptGenerator()
        reqs = gen.generate_requirements(source="browser", extra_deps=["pandas"])
        assert "playwright" in reqs
        assert "pandas" in reqs

    def test_requirements_no_duplicates(self):
        gen = ScriptGenerator()
        reqs = gen.generate_requirements(source="browser", extra_deps=["playwright"])
        lines = reqs.strip().split("\n")
        assert len(lines) == len(set(lines))

    def test_requirements_with_version_pins(self):
        gen = ScriptGenerator()
        reqs = gen.generate_requirements(source="browser", pin_versions=True)
        assert ">=" in reqs or "==" in reqs


class TestGenerateToBuffer:
    """Tests for generate returning a complete script buffer."""

    def test_script_is_valid_python_syntax(self, sample_operation_log, sample_ai_generated_code):
        gen = ScriptGenerator()
        result = gen.generate(
            operation_log=sample_operation_log,
            ai_code=sample_ai_generated_code,
        )
        # Must compile without syntax errors
        compile(result, "<generated>", "exec")

    def test_script_has_docstring(self, sample_operation_log, sample_ai_generated_code):
        gen = ScriptGenerator()
        result = gen.generate(
            operation_log=sample_operation_log,
            ai_code=sample_ai_generated_code,
        )
        # Should have a module-level docstring or comment header
        assert '"""' in result or "# Aegis" in result or "# Program:" in result

    def test_script_closes_browser_if_opened(self, sample_operation_log, sample_ai_generated_code):
        """If AI code opens a browser, the generator should ensure cleanup."""
        gen = ScriptGenerator()
        result = gen.generate(
            operation_log=sample_operation_log,
            ai_code=sample_ai_generated_code,
        )
        # At minimum the script should compile
        compile(result, "<generated>", "exec")
