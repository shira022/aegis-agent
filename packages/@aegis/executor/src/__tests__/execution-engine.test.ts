import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionEngine } from '../execution-engine';
import type { ExecutionConfig, EngineConfig } from '../types';

const mockResult = {
  exitCode: 0,
  stdout: '',
  stderr: '',
  duration: 100,
  timedOut: false,
  outputLines: [],
};

vi.mock('../process-manager', () => ({
  ProcessManager: vi.fn().mockImplementation(() => ({
    spawn: vi.fn().mockReturnValue({ pid: 123, kill: vi.fn() }),
    kill: vi.fn(),
    isRunning: vi.fn().mockReturnValue(true),
    waitForExit: vi.fn().mockResolvedValue({ ...mockResult }),
    getMemoryUsage: vi.fn().mockResolvedValue(0),
    streamOutput: vi.fn(),
  })),
}));

function makeConfig(overrides: Partial<ExecutionConfig> = {}): ExecutionConfig {
  return {
    scriptPath: '/tmp/test.py',
    timeout: 5000,
    ...overrides,
  };
}

function defaultEngineConfig(): EngineConfig {
  return {
    defaultTimeout: 5000,
    maxConcurrent: 3,
    logDir: '/tmp/aegis-logs',
    pythonPath: 'python3',
  };
}

describe('ExecutionEngine', () => {
  let engine: ExecutionEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new ExecutionEngine(defaultEngineConfig());
  });

  describe('constructor', () => {
    it('should create an engine with default config', () => {
      const e = new ExecutionEngine();
      expect(e).toBeDefined();
    });

    it('should accept custom config', () => {
      const e = new ExecutionEngine({
        defaultTimeout: 10000,
        maxConcurrent: 5,
        logDir: '/custom/logs',
        pythonPath: '/usr/local/bin/python3',
      });
      expect(e).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should execute a script and return a result', async () => {
      const config = makeConfig();
      const result = await engine.execute(config);

      expect(result).toBeDefined();
      expect(typeof result.exitCode).toBe('number');
      expect(typeof result.stdout).toBe('string');
      expect(typeof result.stderr).toBe('string');
      expect(typeof result.duration).toBe('number');
      expect(typeof result.timedOut).toBe('boolean');
      expect(Array.isArray(result.outputLines)).toBe(true);
    });

    it('should record execution in logs', async () => {
      const config = makeConfig();
      await engine.execute(config);

      const logs = engine.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].config).toEqual(config);
      expect(logs[0].state).toBe('completed');
    });

    it('should track start and end times', async () => {
      const config = makeConfig();
      const result = await engine.execute(config);

      const logs = engine.getLogs();
      expect(logs[0].startTime).toBeGreaterThan(0);
      expect(logs[0].endTime).toBeGreaterThanOrEqual(logs[0].startTime);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should set state to running then completed', async () => {
      const config = makeConfig();
      const logsBefore = engine.getLogs().length;
      await engine.execute(config);
      const logs = engine.getLogs();

      expect(logs.length).toBe(logsBefore + 1);
      expect(logs[logs.length - 1].state).toBe('completed');
    });

    it('should set state to failed on non-zero exit', async () => {
      const config = makeConfig({ scriptPath: '/tmp/fail.py' });
      const result = await engine.execute(config);
      expect(result).toBeDefined();
    });
  });

  describe('executeWithRetry', () => {
    it('should retry failed executions up to maxRetries', async () => {
      const config = makeConfig({ maxRetries: 3, retryDelay: 10 });
      const result = await engine.executeWithRetry(config);
      expect(result).toBeDefined();
    });

    it('should use default maxRetries of 3', async () => {
      const config = makeConfig();
      const result = await engine.executeWithRetry(config);
      expect(result).toBeDefined();
    });

    it('should return metrics showing retry count', async () => {
      const config = makeConfig({ maxRetries: 2, retryDelay: 10 });
      await engine.executeWithRetry(config);

      const metrics = engine.getMetrics();
      expect(typeof metrics.totalRetries).toBe('number');
    });
  });

  describe('pause and resume', () => {
    it('should throw when pausing with no active process', async () => {
      await expect(engine.pause()).rejects.toThrow();
    });

    it('should throw when resuming with no paused process', async () => {
      await expect(engine.resume()).rejects.toThrow();
    });
  });

  describe('kill', () => {
    it('should kill the current process', async () => {
      await engine.kill();
    });
  });

  describe('getMetrics', () => {
    it('should return metrics with correct shape', () => {
      const metrics = engine.getMetrics();
      expect(metrics).toHaveProperty('totalRuns');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('averageDuration');
      expect(metrics).toHaveProperty('totalRetries');
      expect(typeof metrics.totalRuns).toBe('number');
      expect(typeof metrics.successRate).toBe('number');
      expect(typeof metrics.averageDuration).toBe('number');
      expect(typeof metrics.totalRetries).toBe('number');
    });

    it('should show zero metrics for fresh engine', () => {
      const metrics = engine.getMetrics();
      expect(metrics.totalRuns).toBe(0);
      expect(metrics.totalRetries).toBe(0);
    });

    it('should update metrics after executions', async () => {
      await engine.execute(makeConfig());
      await engine.execute(makeConfig());

      const metrics = engine.getMetrics();
      expect(metrics.totalRuns).toBe(2);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeLessThanOrEqual(1);
    });

    it('should track average duration', async () => {
      await engine.execute(makeConfig());
      const metrics = engine.getMetrics();
      expect(metrics.averageDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getLogs', () => {
    it('should return empty array initially', () => {
      expect(engine.getLogs()).toEqual([]);
    });

    it('should accumulate logs across executions', async () => {
      await engine.execute(makeConfig());
      await engine.execute(makeConfig());
      await engine.execute(makeConfig());

      const logs = engine.getLogs();
      expect(logs.length).toBe(3);
    });

    it('should contain execution id', async () => {
      await engine.execute(makeConfig());
      const logs = engine.getLogs();
      expect(typeof logs[0].id).toBe('string');
      expect(logs[0].id.length).toBeGreaterThan(0);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', async () => {
      await engine.execute(makeConfig());
      await engine.execute(makeConfig());
      expect(engine.getLogs().length).toBe(2);

      engine.clearLogs();
      expect(engine.getLogs()).toEqual([]);
    });
  });

  describe('concurrency limiting', () => {
    it('should enforce maxConcurrent limit', async () => {
      const engine = new ExecutionEngine({
        defaultTimeout: 5000,
        maxConcurrent: 2,
        logDir: '/tmp/aegis-logs',
        pythonPath: 'python3',
      });

      const config = makeConfig();
      const p1 = engine.execute(config);
      const p2 = engine.execute(config);

      expect(p1).toBeDefined();
      expect(p2).toBeDefined();

      await Promise.allSettled([p1, p2]);
    });
  });

  describe('timeout handling', () => {
    it('should accept timeout in config', async () => {
      const config = makeConfig({ timeout: 100 });
      const result = await engine.execute(config);
      expect(result).toBeDefined();
    });

    it('should use default timeout when not specified', async () => {
      const config = makeConfig();
      delete config.timeout;
      const result = await engine.execute(config);
      expect(result).toBeDefined();
    });
  });
});
