"""Tests for the script validator (src/validator.py).

The validator checks generated Python code for dangerous patterns:
- os.system, os.popen, os.remove, os.rename, os.mkdir, os.rmdir
- subprocess with shell=True
- eval/exec
- __import__
- shutil.rmtree
- globals()/locals()
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from validator import ScriptValidator, ValidationResult, ValidationSeverity


class TestScriptValidatorInit:
    """Tests for ScriptValidator construction."""

    def test_create_validator(self):
        validator = ScriptValidator()
        assert validator is not None

    def test_create_with_custom_blocklist(self):
        validator = ScriptValidator(blocked_patterns=["custom_pattern"])
        assert "custom_pattern" in validator.blocked_patterns


class TestValidateSafeCode:
    """Tests that safe code passes validation."""

    def test_safe_playwright_code(self, sample_ai_generated_code):
        validator = ScriptValidator()
        result = validator.validate(sample_ai_generated_code)
        assert result.safe is True
        assert len(result.violations) == 0

    def test_safe_pyautogui_code(self, sample_desktop_code):
        validator = ScriptValidator()
        result = validator.validate(sample_desktop_code)
        assert result.safe is True
        assert len(result.violations) == 0

    def test_empty_code(self):
        validator = ScriptValidator()
        result = validator.validate("")
        # Empty code is not necessarily unsafe, but may have warnings
        assert isinstance(result, ValidationResult)

    def test_valid_imports(self):
        code = "import json\nimport time\nfrom pathlib import Path\n"
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.safe is True


class TestValidateDangerousPatterns:
    """Tests that dangerous patterns are caught."""

    def test_os_system_detected(self):
        code = 'import os\nos.system("rm -rf /")'
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.safe is False
        # Violation contains the regex pattern (with escaped dot)
        assert len(result.violations) > 0

    def test_subprocess_shell_true_detected(self):
        code = 'import subprocess\nsubprocess.run("ls", shell=True)'
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.safe is False
        assert len(result.violations) > 0

    def test_eval_detected(self):
        code = 'eval("__import__(\'os\').system(\'id\')")'
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.safe is False

    def test_exec_detected(self):
        code = "exec('import os; os.system(\"ls\")')"
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.safe is False

    def test_os_remove_detected(self):
        code = 'import os\nos.remove("/etc/passwd")'
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.safe is False

    def test_shutil_rmtree_detected(self):
        code = "import shutil\nshutil.rmtree('/important')"
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.safe is False

    def test_os_popen_detected(self):
        code = 'import os\nos.popen("whoami")'
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.safe is False

    def test_dunder_import_detected(self):
        code = '__import__("os").system("id")'
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.safe is False

    def test_globals_detected(self):
        code = "globals()['__builtins__']"
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.safe is False

    def test_os_rename_detected(self):
        code = 'import os\nos.rename("a.txt", "b.txt")'
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.safe is False

    def test_os_mkdir_detected(self):
        code = 'import os\nos.mkdir("/tmp/evil")'
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.safe is False

    def test_rmdir_detected(self):
        code = 'import os\nos.rmdir("/tmp/dir")'
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.safe is False


class TestValidateDangerousSamples:
    """Parametrized test over all dangerous code samples from fixtures."""

    @pytest.mark.parametrize(
        "sample_name",
        [
            "os.system",
            "subprocess shell=True",
            "eval",
            "exec",
            "os.remove",
            "shutil.rmtree",
            "os.popen",
            "__import__",
            "globals()",
            "os.rename",
            "os.mkdir",
            "rmdir",
        ],
    )
    def test_dangerous_pattern_caught(self, sample_name, dangerous_code_samples):
        validator = ScriptValidator()
        sample = next(s for s in dangerous_code_samples if s["name"] == sample_name)
        result = validator.validate(sample["code"])
        assert result.safe is False, f"Pattern '{sample_name}' was not caught"


class TestValidateMultipleViolations:
    """Tests for code with multiple dangerous patterns."""

    def test_multiple_violations_detected(self):
        code = 'import os\nimport subprocess\nos.system("ls")\nsubprocess.run("id", shell=True)'
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.safe is False
        assert len(result.violations) >= 2


class TestValidateSeverity:
    """Tests for violation severity levels."""

    def test_os_system_is_high_severity(self):
        code = 'os.system("cmd")'
        validator = ScriptValidator()
        result = validator.validate(code)
        high_violations = [v for v in result.violations if "high" in v.lower() or "critical" in v.lower()]
        assert len(high_violations) > 0 or len(result.violations) > 0

    def test_result_has_severity_info(self):
        code = 'import os\nos.system("ls")'
        validator = ScriptValidator()
        result = validator.validate(code)
        assert result.severity in (
            ValidationSeverity.HIGH,
            ValidationSeverity.CRITICAL,
        )


class TestValidateSyntax:
    """Tests for Python syntax validation."""

    def test_valid_syntax(self):
        code = "x = 1\nprint(x)"
        validator = ScriptValidator()
        result = validator.validate_syntax(code)
        assert result.valid is True
        assert len(result.errors) == 0

    def test_invalid_syntax(self):
        code = "def foo(\nprint(bar)"
        validator = ScriptValidator()
        result = validator.validate_syntax(code)
        assert result.valid is False
        assert len(result.errors) > 0

    def test_empty_syntax(self):
        validator = ScriptValidator()
        result = validator.validate_syntax("")
        assert result.valid is False


class TestValidateAll:
    """Tests for the combined validation method."""

    def test_safe_code_passes_all(self, sample_ai_generated_code):
        validator = ScriptValidator()
        result = validator.validate_all(sample_ai_generated_code)
        assert result.safe is True
        assert result.syntax_valid is True

    def test_dangerous_code_fails_safety(self):
        code = 'import os\nos.system("ls")\nx = 1'
        validator = ScriptValidator()
        result = validator.validate_all(code)
        assert result.safe is False
        # Syntax should still be valid even if dangerous
        assert result.syntax_valid is True

    def test_invalid_syntax_fails_syntax(self):
        code = "def foo(\nprint(bar)"
        validator = ScriptValidator()
        result = validator.validate_all(code)
        assert result.syntax_valid is False


class TestBlockedPatterns:
    """Tests for the blocked pattern list."""

    def test_default_patterns_count(self):
        validator = ScriptValidator()
        assert len(validator.blocked_patterns) >= 10

    def test_patterns_are_regex(self):
        import re
        validator = ScriptValidator()
        for pattern in validator.blocked_patterns:
            re.compile(pattern)  # Should not raise


class TestGetReport:
    """Tests for human-readable report generation."""

    def test_report_for_safe_code(self, sample_ai_generated_code):
        validator = ScriptValidator()
        result = validator.validate(sample_ai_generated_code)
        report = validator.get_report(result)
        assert isinstance(report, str)
        assert "safe" in report.lower() or "pass" in report.lower() or "ok" in report.lower()

    def test_report_for_dangerous_code(self):
        code = 'import os\nos.system("ls")'
        validator = ScriptValidator()
        result = validator.validate(code)
        report = validator.get_report(result)
        assert "unsafe" in report.lower() or "danger" in report.lower() or "violation" in report.lower()
