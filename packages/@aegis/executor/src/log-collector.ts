import type {
  ExecutionLog,
  CollectedLogs,
  LogAnalysis,
  ErrorPattern,
  PerformanceMetrics,
  ExecutionError,
} from './types';

const ERROR_PATTERNS: RegExp[] = [
  /Traceback \(most recent call last\):/g,
  /Error:/g,
  /Exception:/g,
  /NameError/g,
  /TypeError/g,
  /ValueError/g,
  /ImportError/g,
  /ModuleNotFoundError/g,
  /PermissionError/g,
  /FileNotFoundError/g,
  /MemoryError/g,
  /Segmentation fault/gi,
];

export class LogCollector {
  collect(executionLog: ExecutionLog): CollectedLogs {
    const result = executionLog.result;

    const stdout: string[] = [];
    const stderr: string[] = [];
    const timestamps: number[] = [];
    const errors: ExecutionError[] = [];

    if (result) {
      // Split stdout into individual lines
      if (result.stdout) {
        const lines = result.stdout.split('\n').filter((l) => l.length > 0);
        stdout.push(...lines);
      }

      // Split stderr into individual lines
      if (result.stderr) {
        const lines = result.stderr.split('\n').filter((l) => l.length > 0);
        stderr.push(...lines);
      }

      // Collect timestamps from output lines
      for (const line of result.outputLines) {
        timestamps.push(line.timestamp);
      }
    }

    // Collect errors from the execution log
    if (executionLog.error) {
      errors.push(executionLog.error);
    }

    return { stdout, stderr, timestamps, errors };
  }

  analyzeLogs(logs: CollectedLogs): LogAnalysis {
    const errorPatterns: ErrorPattern[] = [];
    const suggestions: string[] = [];

    // Analyze stderr for error patterns
    const allStderr = logs.stderr.join('\n');

    for (const pattern of ERROR_PATTERNS) {
      // Reset lastIndex for global regex
      pattern.lastIndex = 0;
      const matches = allStderr.match(pattern);
      if (matches && matches.length > 0) {
        errorPatterns.push({
          pattern: new RegExp(pattern.source, pattern.flags),
          count: matches.length,
          firstSeen: logs.timestamps[0] || Date.now(),
          lastSeen: logs.timestamps[logs.timestamps.length - 1] || Date.now(),
        });
      }
    }

    // Generate suggestions based on patterns
    const hasTraceback = errorPatterns.some((p) =>
      p.pattern.source.includes('Traceback'),
    );
    if (hasTraceback) {
      suggestions.push('Python exception detected — check the stack trace for the root cause');
    }

    const hasOOM = errorPatterns.some((p) =>
      p.pattern.source.includes('MemoryError'),
    );
    if (hasOOM) {
      suggestions.push('Out of memory — consider reducing data size or increasing available memory');
    }

    const hasSegfault = errorPatterns.some((p) =>
      p.pattern.source.includes('Segmentation'),
    );
    if (hasSegfault) {
      suggestions.push('Segmentation fault — possible C extension issue or memory corruption');
    }

    const hasImportError = errorPatterns.some((p) =>
      p.pattern.source.includes('ImportError') ||
      p.pattern.source.includes('ModuleNotFoundError'),
    );
    if (hasImportError) {
      suggestions.push('Missing module — check requirements.txt and install dependencies');
    }

    // Performance metrics based on available data
    const performanceMetrics = this.calculatePerformanceMetrics(logs);

    return {
      errorPatterns,
      performanceMetrics,
      suggestions,
    };
  }

  formatReport(logs: CollectedLogs): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════');
    lines.push('              EXECUTION LOG REPORT');
    lines.push('═══════════════════════════════════════════════════');
    lines.push('');

    // Stdout section
    if (logs.stdout.length > 0) {
      lines.push('── STDOUT ─────────────────────────────────────────');
      for (const line of logs.stdout) {
        lines.push(`  ${line}`);
      }
      lines.push('');
    }

    // Stderr section
    if (logs.stderr.length > 0) {
      lines.push('── STDERR ─────────────────────────────────────────');
      for (const line of logs.stderr) {
        lines.push(`  ${line}`);
      }
      lines.push('');
    }

    // Errors section
    if (logs.errors.length > 0) {
      lines.push('── ERRORS ────────────────────────────────────────');
      for (const error of logs.errors) {
        lines.push(`  [${error.code}] ${error.message}`);
        if (error.suggestedFix) {
          lines.push(`    Fix: ${error.suggestedFix}`);
        }
      }
      lines.push('');
    }

    // Summary
    lines.push('── SUMMARY ────────────────────────────────────────');
    lines.push(`  Stdout lines: ${logs.stdout.length}`);
    lines.push(`  Stderr lines: ${logs.stderr.length}`);
    lines.push(`  Errors: ${logs.errors.length}`);
    lines.push(`  Timestamps: ${logs.timestamps.length}`);
    lines.push('═══════════════════════════════════════════════════');

    return lines.join('\n');
  }

  private calculatePerformanceMetrics(logs: CollectedLogs): PerformanceMetrics {
    // We derive performance from stderr timestamps (proxy for duration)
    // In a real system, we'd have duration data directly
    const timestamps = logs.timestamps;
    let durations: number[] = [];

    if (timestamps.length >= 2) {
      for (let i = 1; i < timestamps.length; i++) {
        durations.push(timestamps[i] - timestamps[i - 1]);
      }
    }

    if (durations.length === 0) {
      durations = [0];
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);

    return {
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      p95Duration: sorted[p95Index] || 0,
    };
  }
}
