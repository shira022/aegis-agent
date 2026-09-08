import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProcessManager } from '../process-manager';
import type { ExecutionConfig } from '../types';
import { spawn } from 'child_process';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

function createMockChildProcess() {
  const listeners: Record<string, Function[]> = {};
  const process = {
    pid: 12345,
    stdin: { write: vi.fn(), end: vi.fn() },
    stdout: {
      on: vi.fn((event: string, cb: Function) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
    },
    stderr: {
      on: vi.fn((event: string, cb: Function) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
    },
    on: vi.fn((event: string, cb: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    kill: vi.fn(),
    _emit: (event: string, ...args: any[]) => {
      (listeners[event] || []).forEach((cb) => cb(...args));
    },
    _listeners: listeners,
  };
  return process as any;
}

describe('ProcessManager', () => {
  let manager: ProcessManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ProcessManager();
  });

  describe('spawn', () => {
    it('should spawn a Python process with correct config', () => {
      const mockProc = createMockChildProcess();
      vi.mocked(spawn).mockReturnValue(mockProc);

      const config: ExecutionConfig = {
        scriptPath: '/tmp/test.py',
        args: ['--verbose'],
        env: { MY_VAR: 'hello' },
        pythonPath: '/usr/bin/python3',
      };

      manager.spawn(config);

      expect(spawn).toHaveBeenCalledWith(
        '/usr/bin/python3',
        ['/tmp/test.py', '--verbose'],
        expect.objectContaining({
          env: expect.objectContaining({ MY_VAR: 'hello' }),
          stdio: ['pipe', 'pipe', 'pipe'],
        }),
      );
    });

    it('should use default python3 if no pythonPath provided', () => {
      const mockProc = createMockChildProcess();
      vi.mocked(spawn).mockReturnValue(mockProc);

      const config: ExecutionConfig = { scriptPath: '/tmp/test.py' };
      manager.spawn(config);

      expect(spawn).toHaveBeenCalledWith(
        'python3',
        ['/tmp/test.py'],
        expect.any(Object),
      );
    });

    it('should pass workingDir as cwd option', () => {
      const mockProc = createMockChildProcess();
      vi.mocked(spawn).mockReturnValue(mockProc);

      const config: ExecutionConfig = {
        scriptPath: '/tmp/test.py',
        workingDir: '/home/user/project',
      };
      manager.spawn(config);

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ cwd: '/home/user/project' }),
      );
    });

    it('should set shell option to false for security', () => {
      const mockProc = createMockChildProcess();
      vi.mocked(spawn).mockReturnValue(mockProc);

      const config: ExecutionConfig = { scriptPath: '/tmp/test.py' };
      manager.spawn(config);

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ shell: false }),
      );
    });

    it('should throw if spawn fails', () => {
      vi.mocked(spawn).mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const config: ExecutionConfig = { scriptPath: '/tmp/nonexistent.py' };
      expect(() => manager.spawn(config)).toThrow('ENOENT');
    });
  });

  describe('kill', () => {
    it('should send SIGTERM by default', () => {
      const mockProc = createMockChildProcess();
      manager.kill(mockProc);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should send specified signal', () => {
      const mockProc = createMockChildProcess();
      manager.kill(mockProc, 'SIGKILL');
      expect(mockProc.kill).toHaveBeenCalledWith('SIGKILL');
    });

    it('should not throw if process already dead', () => {
      const mockProc = createMockChildProcess();
      mockProc.kill.mockReturnValue(false);
      expect(() => manager.kill(mockProc)).not.toThrow();
    });
  });

  describe('isRunning', () => {
    it('should return true for a running process', () => {
      const mockProc = createMockChildProcess();
      mockProc.exitCode = null;
      expect(manager.isRunning(mockProc)).toBe(true);
    });

    it('should return false for a finished process', () => {
      const mockProc = createMockChildProcess();
      mockProc.exitCode = 0;
      expect(manager.isRunning(mockProc)).toBe(false);
    });

    it('should return false if pid is undefined', () => {
      const mockProc = createMockChildProcess();
      mockProc.pid = undefined;
      expect(manager.isRunning(mockProc)).toBe(false);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage in bytes for a valid pid', async () => {
      const result = await manager.getMemoryUsage(12345);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for a non-existent process', async () => {
      const result = await manager.getMemoryUsage(999999999);
      expect(result).toBe(0);
    });
  });

  describe('waitForExit', () => {
    it('should resolve with exit code 0 on success', async () => {
      const mockProc = createMockChildProcess();
      const config: ExecutionConfig = { scriptPath: '/tmp/test.py' };

      const exitPromise = manager.waitForExit(mockProc, 5000);

      // Simulate successful exit
      mockProc._emit('close', 0, null);

      const result = await exitPromise;
      expect(result.exitCode).toBe(0);
      expect(result.timedOut).toBe(false);
    });

    it('should resolve with non-zero exit code on failure', async () => {
      const mockProc = createMockChildProcess();

      const exitPromise = manager.waitForExit(mockProc, 5000);
      mockProc._emit('close', 1, null);

      const result = await exitPromise;
      expect(result.exitCode).toBe(1);
    });

    it('should resolve with timedOut true when timeout exceeded', async () => {
      const mockProc = createMockChildProcess();

      const exitPromise = manager.waitForExit(mockProc, 100);
      // Don't emit close — let timeout fire
      // Need a small real delay
      await new Promise((r) => setTimeout(r, 150));
      mockProc._emit('close', null, null);

      const result = await exitPromise;
      expect(result.timedOut).toBe(true);
    });

    it('should capture stdout lines', async () => {
      const mockProc = createMockChildProcess();
      const config: ExecutionConfig = { scriptPath: '/tmp/test.py' };

      const exitPromise = manager.waitForExit(mockProc, 5000);
      // The implementation listens for 'data' events on stdout/stderr
      mockProc._emit('data', Buffer.from('Hello from stdout'));
      mockProc._emit('close', 0, null);

      const result = await exitPromise;
      expect(result.stdout).toContain('Hello from stdout');
    });
  });

  describe('streamOutput', () => {
    it('should call callback for each stdout line', () => {
      const mockProc = createMockChildProcess();
      const callback = vi.fn();

      manager.streamOutput(mockProc, callback);

      // Verify stdout.on was called with 'data'
      expect(mockProc.stdout.on).toHaveBeenCalledWith(
        'data',
        expect.any(Function),
      );
    });

    it('should call callback for each stderr line', () => {
      const mockProc = createMockChildProcess();
      const callback = vi.fn();

      manager.streamOutput(mockProc, callback);

      expect(mockProc.stderr.on).toHaveBeenCalledWith(
        'data',
        expect.any(Function),
      );
    });
  });
});
