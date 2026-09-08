"""Script Runner — executes generated Python scripts with timeout and output capture.

Wraps subprocess to run generated .py files, captures stdout/stderr,
enforces timeouts, and returns structured results for the TypeScript executor.
"""

import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class RunStatus(Enum):
    """Status of a script run."""

    COMPLETED = "completed"
    FAILED = "failed"
    ERROR = "error"
    TIMEOUT = "timeout"
    KILLED = "killed"


@dataclass
class RunConfig:
    """Configuration for script execution."""

    timeout: int = 30
    python_path: str = ""
    capture_output: bool = True
    working_dir: str | None = None

    def __post_init__(self):
        if not self.python_path:
            self.python_path = sys.executable


@dataclass
class RunResult:
    """Result of running a Python script."""

    status: RunStatus
    stdout: str = ""
    stderr: str = ""
    exit_code: int = -1
    duration: float = 0.0
    timed_out: bool = False
    script_path: str = ""


class ScriptRunner:
    """Executes generated Python scripts with timeout and structured output."""

    def __init__(self, config: RunConfig | None = None):
        self.config = config or RunConfig()
        self._process: subprocess.Popen | None = None

    def run(
        self,
        script_path: str,
        args: list[str] | None = None,
        env: dict[str, str] | None = None,
    ) -> RunResult:
        """Run a Python script and return the result.

        Args:
            script_path: Path to the .py script to execute.
            args: Additional arguments to pass to the script.
            env: Additional environment variables.

        Returns:
            RunResult with status, output, and timing info.
        """
        if not os.path.exists(script_path):
            return RunResult(
                status=RunStatus.ERROR,
                stderr=f"Script not found: {script_path}",
                exit_code=-1,
                script_path=script_path,
            )

        # Build command
        cmd = [self.config.python_path, script_path]
        if args:
            cmd.extend(args)

        # Build environment
        run_env = os.environ.copy()
        if env:
            run_env.update(env)

        start_time = time.monotonic()

        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE if self.config.capture_output else None,
                stderr=subprocess.PIPE if self.config.capture_output else None,
                env=run_env,
                cwd=self.config.working_dir,
                text=True,
            )
            self._process = proc

            try:
                stdout, stderr = proc.communicate(timeout=self.config.timeout)
                duration = time.monotonic() - start_time

                status = RunStatus.COMPLETED if proc.returncode == 0 else RunStatus.FAILED

                return RunResult(
                    status=status,
                    stdout=stdout or "",
                    stderr=stderr or "",
                    exit_code=proc.returncode,
                    duration=duration,
                    timed_out=False,
                    script_path=script_path,
                )

            except subprocess.TimeoutExpired:
                duration = time.monotonic() - start_time
                proc.kill()
                proc.wait()

                return RunResult(
                    status=RunStatus.TIMEOUT,
                    stdout="",
                    stderr=f"Script timed out after {self.config.timeout}s",
                    exit_code=-1,
                    duration=duration,
                    timed_out=True,
                    script_path=script_path,
                )

        except FileNotFoundError as e:
            duration = time.monotonic() - start_time
            return RunResult(
                status=RunStatus.ERROR,
                stderr=f"Python not found: {e}",
                exit_code=-1,
                duration=duration,
                script_path=script_path,
            )
        except Exception as e:
            duration = time.monotonic() - start_time
            return RunResult(
                status=RunStatus.ERROR,
                stderr=str(e),
                exit_code=-1,
                duration=duration,
                script_path=script_path,
            )
        finally:
            self._process = None

    def cancel(self) -> None:
        """Cancel a running script (if one is active)."""
        if self._process and self._process.poll() is None:
            self._process.kill()
            self._process = None

    def kill(self) -> None:
        """Forcefully kill a running script."""
        self.cancel()
