import { execSync } from 'child_process';
import type { SyntaxCheck, DangerCheck, DeterminismCheck } from './types';

// ─── Blocked Patterns ──────────────────────────────────────────────

export const BLOCKED_PATTERNS: RegExp[] = [
  /subprocess\.(call|run|Popen|check_output|check_call)\s*\(/,
  /os\.system\s*\(/,
  /os\.popen\s*\(/,
  /\beval\s*\(/,
  /\bexec\s*\(/,
  /__import__\s*\(/,
  /rm\s+-rf/,
  /\bos\.remove\s*\(/,
  /\bos\.unlink\s*\(/,
  /\bshutil\.rmtree\s*\(/,
  /\bos\.rename\s*\(/,
  /\bos\.chmod\s*\(/,
  /\bos\.chown\s*\(/,
  /\bos\.mkdir\s*\(/,
  /\brmdir\s*\(/,
  /\bformat\s*\([^)]*__class__/,
  /\{0\.__class__/,
  /\bcompile\s*\(\s*['"]/,
  /\bglobals\s*\(\s*\)/,
  /\blocals\s*\(\s*\)/,
  /\bgetattr\s*\(\s*__builtins__/,
];

// ─── Syntax Validation ─────────────────────────────────────────────

export function validateSyntax(code: string): SyntaxCheck {
  if (!code || code.trim().length === 0) {
    return { valid: false, errors: ['Empty code provided'] };
  }

  const errors: string[] = [];

  try {
    // Use Python's ast module via stdin to avoid shell escaping issues
    execSync('python3 -c "import ast, sys; ast.parse(sys.stdin.read())"', {
      input: code,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    });
  } catch (e) {
    const stderr = (e as { stderr?: Buffer }).stderr;
    if (stderr) {
      const msg = stderr.toString().trim();
      // Extract just the error message from Python traceback
      const match = msg.match(/SyntaxError:\s*(.+)$/m);
      if (match) {
        errors.push(match[1]);
      } else {
        errors.push(msg);
      }
    } else {
      errors.push(String(e));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─── Danger Validation ─────────────────────────────────────────────

export function validateNoDangerousOps(code: string): DangerCheck {
  const violations: string[] = [];

  for (const pattern of BLOCKED_PATTERNS) {
    const match = code.match(pattern);
    if (match) {
      violations.push(`Blocked pattern detected: ${pattern.source}`);
    }
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}

// ─── Determinism Validation ────────────────────────────────────────

const NON_DETERMINISTIC_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /\btime\.time\s*\(/, description: 'time.time() usage' },
  { pattern: /\btime\.sleep\s*\(/, description: 'time.sleep() usage' },
  { pattern: /\brandom\.\w+\s*\(/, description: 'random module usage' },
  { pattern: /\bdatetime\.now\s*\(/, description: 'datetime.now() usage' },
  { pattern: /\buuid\.uuid[0-9]\s*\(/, description: 'UUID generation' },
  { pattern: /\bprint\s*\(/, description: 'print statement (side effect)' },
  { pattern: /\brequests\.(get|post|put|delete|patch|head)\s*\(/, description: 'HTTP request' },
  { pattern: /\bhttpx\.(get|post|put|delete|patch|head)\s*\(/, description: 'HTTP request' },
  { pattern: /\bopen\s*\(/, description: 'file I/O operation' },
  { pattern: /\binput\s*\(/, description: 'input() (user interaction)' },
  { pattern: /\bos\.environ/, description: 'environment variable access' },
];

export function validateDeterministic(code: string): DeterminismCheck {
  const issues: string[] = [];

  for (const { pattern, description } of NON_DETERMINISTIC_PATTERNS) {
    if (pattern.test(code)) {
      issues.push(description);
    }
  }

  return {
    deterministic: issues.length === 0,
    issues,
  };
}
