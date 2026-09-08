"""Tests for the script runner (src/runner.py).

The runner executes generated Python scripts with timeout,
captures stdout/stderr, and returns structured results.
"""

import json
import os
import sys
import textwrap
from pathlib import Path
from unittest.mock import MagicMock, patch, AsyncMock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from runner import ScriptRunner, RunConfig, RunResult, RunStatus


class TestScriptRunnerInit:
    """Tests for ScriptRunner construction."""

    def test_create_runner(self):
        runner = ScriptRunner()
        assert runner is not None

    def test_create_with_config(self):
        config = RunConfig(timeout=30, python_path="/usr/bin/python3")
        runner = ScriptRunner(config)
        assert runner.config.timeout == 30
        assert runner.config.python_path == "/usr/bin/python3"

    def test_config_defaults(self):
        config = RunConfig()
        assert config.timeout > 0
        assert config.capture_output is True


class TestRunScript:
    """Tests for running actual scripts."""

    def test_run_simple_script(self, tmp_work_dir):
        script_path = tmp_work_dir / "simple.py"
        script_path.write_text('print("hello")')
        runner = ScriptRunner(RunConfig(timeout=10))
        result = runner.run(str(script_path))
        assert result.status == RunStatus.COMPLETED
        assert "hello" in result.stdout

    def test_run_script_with_json_output(self, tmp_work_dir):
        script = textwrap.dedent('''\
            import json
            result = {"status": "success", "data": {"key": "value"}}
            print(json.dumps(result))
        ''')
        script_path = tmp_work_dir / "json_out.py"
        script_path.write_text(script)
        runner = ScriptRunner(RunConfig(timeout=10))
        result = runner.run(str(script_path))
        assert result.status == RunStatus.COMPLETED
        parsed = json.loads(result.stdout)
        assert parsed["status"] == "success"
        assert parsed["data"]["key"] == "value"

    def test_run_script_with_stderr(self, tmp_work_dir):
        script = "import sys\nprint('error msg', file=sys.stderr)\n"
        script_path = tmp_work_dir / "stderr.py"
        script_path.write_text(script)
        runner = ScriptRunner(RunConfig(timeout=10))
        result = runner.run(str(script_path))
        assert "error msg" in result.stderr

    def test_run_nonexistent_script(self):
        runner = ScriptRunner(RunConfig(timeout=10))
        result = runner.run("/nonexistent/script.py")
        assert result.status in (RunStatus.ERROR, RunStatus.FAILED)

    def test_run_script_syntax_error(self, tmp_work_dir):
        script = "def foo(\nprint('bar')\n"
        script_path = tmp_work_dir / "syntax_err.py"
        script_path.write_text(script)
        runner = ScriptRunner(RunConfig(timeout=10))
        result = runner.run(str(script_path))
        assert result.status in (RunStatus.ERROR, RunStatus.FAILED)
        assert len(result.stderr) > 0


class TestRunTimeout:
    """Tests for timeout handling."""

    def test_script_exceeding_timeout_is_killed(self, tmp_work_dir):
        script = "import time\ntime.sleep(100)\n"
        script_path = tmp_work_dir / "slow.py"
        script_path.write_text(script)
        runner = ScriptRunner(RunConfig(timeout=2))
        result = runner.run(str(script_path))
        assert result.status == RunStatus.TIMEOUT
        assert result.timed_out is True

    def test_fast_script_completes_within_timeout(self, tmp_work_dir):
        script = "print('fast')\n"
        script_path = tmp_work_dir / "fast.py"
        script_path.write_text(script)
        runner = ScriptRunner(RunConfig(timeout=10))
        result = runner.run(str(script_path))
        assert result.status == RunStatus.COMPLETED
        assert result.timed_out is False

    def test_timeout_default_is_reasonable(self):
        config = RunConfig()
        assert 5 <= config.timeout <= 300


class TestRunResult:
    """Tests for RunResult structure."""

    def test_result_has_required_fields(self, tmp_work_dir):
        script = "print('test')\n"
        script_path = tmp_work_dir / "fields.py"
        script_path.write_text(script)
        runner = ScriptRunner(RunConfig(timeout=10))
        result = runner.run(str(script_path))
        assert hasattr(result, "status")
        assert hasattr(result, "stdout")
        assert hasattr(result, "stderr")
        assert hasattr(result, "duration")
        assert hasattr(result, "exit_code")
        assert hasattr(result, "timed_out")

    def test_result_duration_is_positive(self, tmp_work_dir):
        script = "print('ok')\n"
        script_path = tmp_work_dir / "duration.py"
        script_path.write_text(script)
        runner = ScriptRunner(RunConfig(timeout=10))
        result = runner.run(str(script_path))
        assert result.duration >= 0

    def test_result_exit_code_on_success(self, tmp_work_dir):
        script = "print('ok')\n"
        script_path = tmp_work_dir / "exit0.py"
        script_path.write_text(script)
        runner = ScriptRunner(RunConfig(timeout=10))
        result = runner.run(str(script_path))
        assert result.exit_code == 0

    def test_result_exit_code_on_failure(self, tmp_work_dir):
        script = "import sys\nsys.exit(1)\n"
        script_path = tmp_work_dir / "exit1.py"
        script_path.write_text(script)
        runner = ScriptRunner(RunConfig(timeout=10))
        result = runner.run(str(script_path))
        assert result.exit_code != 0


class TestRunWithEnvironment:
    """Tests for environment variable passing."""

    def test_env_vars_passed_to_script(self, tmp_work_dir):
        script = "import os\nprint(os.environ.get('AEGIS_TEST_VAR', ''))\n"
        script_path = tmp_work_dir / "env.py"
        script_path.write_text(script)
        runner = ScriptRunner(RunConfig(timeout=10))
        result = runner.run(
            str(script_path),
            env={"AEGIS_TEST_VAR": "hello123"},
        )
        assert "hello123" in result.stdout


class TestRunJsonOutput:
    """Tests that generated scripts output structured JSON."""

    def test_structured_json_output_format(self, tmp_work_dir):
        script = textwrap.dedent('''\
            import json
            output = {
                "operation_id": "op-1",
                "status": "completed",
                "steps_completed": 3,
                "result": "success"
            }
            print(json.dumps(output))
        ''')
        script_path = tmp_work_dir / "structured.py"
        script_path.write_text(script)
        runner = ScriptRunner(RunConfig(timeout=10))
        result = runner.run(str(script_path))
        assert result.status == RunStatus.COMPLETED
        parsed = json.loads(result.stdout)
        assert "operation_id" in parsed
        assert "status" in parsed
        assert "steps_completed" in parsed


class TestRunCustomPythonPath:
    """Tests for custom Python path support."""

    def test_custom_python_path(self, tmp_work_dir):
        script = "print('custom')\n"
        script_path = tmp_work_dir / "custom.py"
        script_path.write_text(script)
        runner = ScriptRunner(RunConfig(timeout=10, python_path=sys.executable))
        result = runner.run(str(script_path))
        assert result.status == RunStatus.COMPLETED


class TestRunCancellation:
    """Tests for process cancellation support."""

    def test_can_cancel_running_script(self, tmp_work_dir):
        script = "import time\ntime.sleep(60)\n"
        script_path = tmp_work_dir / "cancel.py"
        script_path.write_text(script)
        runner = ScriptRunner(RunConfig(timeout=30))
        # Start in background would be needed for true cancel test
        # Here we verify the runner supports it
        assert hasattr(runner, "cancel") or hasattr(runner, "kill")


class TestRunMultipleScripts:
    """Tests for running multiple scripts."""

    def test_run_multiple_sequentially(self, tmp_work_dir):
        scripts = []
        for i in range(3):
            p = tmp_work_dir / f"script_{i}.py"
            p.write_text(f"print('script-{i}')\n")
            scripts.append(str(p))

        runner = ScriptRunner(RunConfig(timeout=10))
        results = [runner.run(s) for s in scripts]
        assert all(r.status == RunStatus.COMPLETED for r in results)
        for i, r in enumerate(results):
            assert f"script-{i}" in r.stdout
