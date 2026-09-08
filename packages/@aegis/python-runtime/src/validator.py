"""Script Validator — checks generated Python code for dangerous patterns.

Mirrors the TypeScript ai-engine validators but operates on the Python side.
Blocks: os.system, os.popen, os.remove, os.rename, os.mkdir, os.rmdir,
subprocess with shell=True, eval/exec, __import__, shutil.rmtree,
globals()/locals().
"""

import ast
import re
import sys
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ValidationSeverity(Enum):
    """Severity of a validation violation."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SyntaxCheckResult:
    """Result of a syntax validation check."""

    valid: bool
    errors: list[str] = field(default_factory=list)


@dataclass
class ValidationResult:
    """Result of a safety/danger validation check."""

    safe: bool
    violations: list[str] = field(default_factory=list)
    severity: ValidationSeverity = ValidationSeverity.LOW


@dataclass
class FullValidationResult:
    """Combined syntax + safety validation result."""

    safe: bool
    syntax_valid: bool
    violations: list[str] = field(default_factory=list)
    syntax_errors: list[str] = field(default_factory=list)


# ── Default blocked patterns (mirrors @aegis/ai-engine validators.ts) ──

DEFAULT_BLOCKED_PATTERNS: list[str] = [
    r"os\.system\s*\(",
    r"os\.popen\s*\(",
    r"os\.remove\s*\(",
    r"os\.unlink\s*\(",
    r"os\.rename\s*\(",
    r"os\.chmod\s*\(",
    r"os\.chown\s*\(",
    r"os\.mkdir\s*\(",
    r"rmdir\s*\(",
    r"subprocess\.(call|run|Popen|check_output|check_call)\s*\(.*shell\s*=\s*True",
    r"subprocess\.(call|run|Popen|check_output|check_call)\s*\(",
    r"\beval\s*\(",
    r"\bexec\s*\(",
    r"__import__\s*\(",
    r"shutil\.rmtree\s*\(",
    r"\bglobals\s*\(\s*\)",
    r"\blocals\s*\(\s*\)",
    r"\bgetattr\s*\(\s*__builtins__",
    r"\bcompile\s*\(\s*['\"]",
    r"rm\s+-rf",
]

# Severity mapping: high-severity patterns
_HIGH_SEVERITY_PATTERNS = [
    "os.system",
    "os.popen",
    "subprocess",
    "eval",
    "exec",
    "__import__",
    "shutil.rmtree",
    "globals",
]


class ScriptValidator:
    """Validates generated Python scripts for safety."""

    def __init__(self, blocked_patterns: list[str] | None = None):
        self.blocked_patterns = blocked_patterns or list(DEFAULT_BLOCKED_PATTERNS)

    def validate(self, code: str) -> ValidationResult:
        """Check code for dangerous patterns.

        Args:
            code: Python source code to validate.

        Returns:
            ValidationResult with safe flag and list of violations.
        """
        violations: list[str] = []

        for pattern_str in self.blocked_patterns:
            try:
                if re.search(pattern_str, code):
                    violations.append(f"Blocked pattern detected: {pattern_str}")
            except re.error:
                # Skip invalid regex patterns
                continue

        # Determine severity by checking which patterns matched
        severity = ValidationSeverity.LOW
        if violations:
            matched_any_high = False
            for pattern_str in self.blocked_patterns:
                try:
                    if re.search(pattern_str, code):
                        # Strip regex escapes for high-severity comparison
                        plain_pattern = pattern_str.replace("\\", "")
                        for hp in _HIGH_SEVERITY_PATTERNS:
                            if hp in plain_pattern:
                                matched_any_high = True
                                break
                except re.error:
                    continue
            if matched_any_high:
                severity = ValidationSeverity.HIGH

        # Multiple violations escalate to CRITICAL
        if len(violations) >= 3:
            severity = ValidationSeverity.CRITICAL

        return ValidationResult(
            safe=len(violations) == 0,
            violations=violations,
            severity=severity,
        )

    def validate_syntax(self, code: str) -> SyntaxCheckResult:
        """Check that code is valid Python syntax.

        Args:
            code: Python source code to check.

        Returns:
            SyntaxCheckResult with valid flag and any errors.
        """
        if not code or code.strip().strip('"').strip("'").strip() == "":
            return SyntaxCheckResult(valid=False, errors=["Empty code provided"])

        try:
            ast.parse(code)
            return SyntaxCheckResult(valid=True, errors=[])
        except SyntaxError as e:
            return SyntaxCheckResult(
                valid=False,
                errors=[f"SyntaxError: {e.msg} at line {e.lineno}"],
            )
        except Exception as e:
            return SyntaxCheckResult(
                valid=False,
                errors=[f"Parse error: {e}"],
            )

    def validate_all(self, code: str) -> FullValidationResult:
        """Run both syntax and safety validation.

        Args:
            code: Python source code to validate.

        Returns:
            FullValidationResult combining syntax and safety checks.
        """
        syntax_result = self.validate_syntax(code)
        safety_result = self.validate(code)

        return FullValidationResult(
            safe=safety_result.safe,
            syntax_valid=syntax_result.valid,
            violations=safety_result.violations,
            syntax_errors=syntax_result.errors,
        )

    def get_report(self, result: ValidationResult) -> str:
        """Generate a human-readable validation report.

        Args:
            result: ValidationResult to report on.

        Returns:
            Multi-line string report.
        """
        if result.safe:
            return (
                "✅ Validation PASSED\n"
                "  No dangerous patterns detected.\n"
                f"  Violations: {len(result.violations)}"
            )

        lines = [
            "❌ Validation FAILED",
            f"  Severity: {result.severity.value.upper()}",
            f"  Violations ({len(result.violations)}):",
        ]
        for v in result.violations:
            lines.append(f"    - {v}")

        return "\n".join(lines)
