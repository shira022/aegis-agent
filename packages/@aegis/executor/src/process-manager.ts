import { spawn as cpSpawn, ChildProcess, SpawnOptions } from 'child_process';
import type { ExecutionConfig, ExecutionResult, OutputLine } from './types';

export class ProcessManager {
  spawn(config: ExecutionConfig): ChildProcess {
    const pythonPath = config.pythonPath || 'python3';
    const args = [config.scriptPath, ...(config.args || [])];

    const env = { ...process.env, ...config.env };

    const options: SpawnOptions = {
      env: env as Record<string, string>,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: config.workingDir,
      shell: false,
    };

    return cpSpawn(pythonPath, args, options);
  }

  kill(proc: ChildProcess, signal: NodeJS.Signals = 'SIGTERM'): void {
    try {
      proc.kill(signal);
    } catch {
      // Process already dead
    }
  }

  isRunning(proc: ChildProcess): boolean {
    return proc.pid !== undefined && proc.exitCode === null;
  }

  async getMemoryUsage(pid: number): Promise<number> {
    return new Promise((resolve) => {
      try {
        const { execFile } = require('child_process');
        execFile('ps', ['-o', 'rss=', '-p', String(pid)], (err: Error | null, stdout: string) => {
          if (err || !stdout.trim()) {
            resolve(0);
          } else {
            // RSS is in KB, convert to bytes
            resolve(parseInt(stdout.trim(), 10) * 1024 || 0);
          }
        });
      } catch {
        resolve(0);
      }
    });
  }

  async waitForExit(
    proc: ChildProcess,
    timeout?: number,
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      const outputLines: OutputLine[] = [];
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let resolved = false;

      const finalize = (exitCode: number | null, timedOut: boolean) => {
        if (resolved) return;
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId);

        resolve({
          exitCode: exitCode ?? 1,
          stdout: stdout.trimEnd(),
          stderr: stderr.trimEnd(),
          duration: Date.now() - startTime,
          timedOut,
          outputLines,
        });
      };

      if (proc.stdout) {
        proc.stdout.on('data', (data: Buffer) => {
          const text = data.toString();
          stdout += text;
          outputLines.push({
            timestamp: Date.now(),
            stream: 'stdout',
            content: text,
          });
        });
      }

      if (proc.stderr) {
        proc.stderr.on('data', (data: Buffer) => {
          const text = data.toString();
          stderr += text;
          outputLines.push({
            timestamp: Date.now(),
            stream: 'stderr',
            content: text,
          });
        });
      }

      proc.on('close', (code) => {
        finalize(code, false);
      });

      proc.on('error', () => {
        finalize(1, false);
      });

      if (timeout && timeout > 0) {
        timeoutId = setTimeout(() => {
          try {
            proc.kill('SIGKILL');
          } catch {
            // already dead
          }
          finalize(null, true);
        }, timeout);
      }
    });
  }

  streamOutput(
    proc: ChildProcess,
    callback: (line: OutputLine) => void,
  ): void {
    if (proc.stdout) {
      proc.stdout.on('data', (data: Buffer) => {
        callback({
          timestamp: Date.now(),
          stream: 'stdout',
          content: data.toString(),
        });
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (data: Buffer) => {
        callback({
          timestamp: Date.now(),
          stream: 'stderr',
          content: data.toString(),
        });
      });
    }
  }
}
