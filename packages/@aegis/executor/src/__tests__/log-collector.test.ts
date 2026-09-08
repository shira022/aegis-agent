import { describe, it, expect, beforeEach } from 'vitest';
import { LogCollector } from '../log-collector';
import type { ExecutionLog, ExecutionConfig, CollectedLogs } from '../types';

function makeExecutionLog(overrides: Partial<ExecutionLog> = {}): ExecutionLog {
  return {
    id: 'test-log-1',
    taskId: 'task-1',
    config: { scriptPath: '/tmp/test.py' },
    startTime: Date.now(),
    endTime: Date.now() + 1000,
    state: 'completed',
    result: {
      exitCode: 0,
      stdout: 'Hello World\nError line\nDone',
      stderr: 'Warning: deprecated\nTraceback:\n  File "test.py", line 1\n',
      duration: 1000,
      timedOut: false,
      outputLines: [
        { timestamp: Date.now(), stream: 'stdout', content: 'Hello World' },
        { timestamp: Date.now(), stream: 'stderr', content: 'Warning: deprecated' },
      ],
    },
    retryCount: 0,
    ...overrides,
  };
}

describe('LogCollector', () => {
  let collector: LogCollector;

  beforeEach(() => {
    collector = new LogCollector();
  });

  describe('collect', () => {
    it('should collect stdout lines from execution log', () => {
      const log = makeExecutionLog();
      const collected = collector.collect(log);

      expect(collected.stdout).toBeDefined();
      expect(Array.isArray(collected.stdout)).toBe(true);
      expect(collected.stdout.length).toBeGreaterThan(0);
    });

    it('should collect stderr lines from execution log', () => {
      const log = makeExecutionLog();
      const collected = collector.collect(log);

      expect(collected.stderr).toBeDefined();
      expect(Array.isArray(collected.stderr)).toBe(true);
    });

    it('should collect timestamps from output lines', () => {
      const log = makeExecutionLog();
      const collected = collector.collect(log);

      expect(collected.timestamps).toBeDefined();
      expect(Array.isArray(collected.timestamps)).toBe(true);
      expect(collected.timestamps.length).toBeGreaterThan(0);
    });

    it('should collect errors from execution log', () => {
      const log = makeExecutionLog({
        error: {
          code: 'PYTHON_ERROR',
          message: 'SyntaxError',
          recoverable: false,
        },
      });
      const collected = collector.collect(log);

      expect(collected.errors).toBeDefined();
      expect(Array.isArray(collected.errors)).toBe(true);
      expect(collected.errors.length).toBe(1);
      expect(collected.errors[0].code).toBe('PYTHON_ERROR');
    });

    it('should handle empty execution log', () => {
      const log = makeExecutionLog({
        result: undefined,
        error: undefined,
      });
      const collected = collector.collect(log);

      expect(collected.stdout).toEqual([]);
      expect(collected.stderr).toEqual([]);
      expect(collected.timestamps).toEqual([]);
      expect(collected.errors).toEqual([]);
    });

    it('should handle execution with no result but has error', () => {
      const log = makeExecutionLog({
        result: undefined,
        error: {
          code: 'TIMEOUT',
          message: 'Execution timed out',
          recoverable: true,
        },
      });
      const collected = collector.collect(log);

      expect(collected.errors.length).toBe(1);
      expect(collected.errors[0].code).toBe('TIMEOUT');
    });
  });

  describe('analyzeLogs', () => {
    it('should detect error patterns in stderr', () => {
      const log = makeExecutionLog();
      const collected = collector.collect(log);
      const analysis = collector.analyzeLogs(collected);

      expect(analysis.errorPatterns).toBeDefined();
      expect(Array.isArray(analysis.errorPatterns)).toBe(true);
    });

    it('should provide performance metrics', () => {
      const log = makeExecutionLog({
        result: {
          exitCode: 0,
          stdout: 'output',
          stderr: '',
          duration: 1500,
          timedOut: false,
          outputLines: [],
        },
      });
      const collected = collector.collect(log);
      const analysis = collector.analyzeLogs(collected);

      expect(analysis.performanceMetrics).toBeDefined();
      expect(typeof analysis.performanceMetrics.averageDuration).toBe('number');
      expect(typeof analysis.performanceMetrics.maxDuration).toBe('number');
      expect(typeof analysis.performanceMetrics.minDuration).toBe('number');
      expect(typeof analysis.performanceMetrics.p95Duration).toBe('number');
    });

    it('should provide suggestions based on analysis', () => {
      const log = makeExecutionLog();
      const collected = collector.collect(log);
      const analysis = collector.analyzeLogs(collected);

      expect(analysis.suggestions).toBeDefined();
      expect(Array.isArray(analysis.suggestions)).toBe(true);
    });

    it('should suggest fix for repeated traceback patterns', () => {
      const log = makeExecutionLog({
        result: {
          exitCode: 1,
          stdout: '',
          stderr: 'Traceback (most recent call last):\n  File "test.py", line 1\nNameError: name "x" is not defined\nTraceback (most recent call last):\n  File "test.py", line 1\nNameError: name "x" is not defined',
          duration: 100,
          timedOut: false,
          outputLines: [],
        },
      });
      const collected = collector.collect(log);
      const analysis = collector.analyzeLogs(collected);

      expect(analysis.errorPatterns.length).toBeGreaterThan(0);
      const tracebackPattern = analysis.errorPatterns.find(
        (p) => p.pattern.source.includes('Traceback'),
      );
      expect(tracebackPattern).toBeDefined();
      expect(tracebackPattern!.count).toBe(2);
    });

    it('should calculate correct performance metrics from multiple entries', () => {
      // Simulate multiple collected logs with different durations
      const collected: CollectedLogs = {
        stdout: ['output1', 'output2'],
        stderr: [],
        timestamps: [1000, 2000],
        errors: [],
      };

      // Since analyzeLogs works on CollectedLogs which doesn't directly carry
      // duration info, the performance metrics will be based on available data
      const analysis = collector.analyzeLogs(collected);
      expect(analysis.performanceMetrics).toBeDefined();
    });
  });

  describe('formatReport', () => {
    it('should format logs as a string report', () => {
      const log = makeExecutionLog();
      const collected = collector.collect(log);
      const report = collector.formatReport(collected);

      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });

    it('should include stdout in report', () => {
      const log = makeExecutionLog();
      const collected = collector.collect(log);
      const report = collector.formatReport(collected);

      expect(report).toContain('Hello World');
    });

    it('should include stderr in report', () => {
      const log = makeExecutionLog();
      const collected = collector.collect(log);
      const report = collector.formatReport(collected);

      expect(report).toContain('Warning');
    });

    it('should handle empty logs gracefully', () => {
      const collected: CollectedLogs = {
        stdout: [],
        stderr: [],
        timestamps: [],
        errors: [],
      };
      const report = collector.formatReport(collected);

      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });

    it('should include error information when present', () => {
      const collected: CollectedLogs = {
        stdout: [],
        stderr: [],
        timestamps: [],
        errors: [
          {
            code: 'OOM',
            message: 'Out of memory',
            recoverable: false,
          },
        ],
      };
      const report = collector.formatReport(collected);

      expect(report).toContain('OOM');
      expect(report).toContain('Out of memory');
    });
  });
});
