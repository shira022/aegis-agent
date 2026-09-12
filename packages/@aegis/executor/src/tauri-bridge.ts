import type { ExecutionConfig, ExecutionResult } from './types';

interface TauriWindow extends Window {
  __TAURI__?: {
    invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  };
}

/**
 * Tauri bridge for the Python runtime (PART K).
 *
 * NOTE: we intentionally do NOT import `@tauri-apps/api` — the command is
 * reached through the global `window.__TAURI__.invoke`, exactly like the
 * recorder package. This keeps the executor dependency list untouched.
 *
 * The command argument shapes mirror the Rust signatures byte-for-byte:
 *   run_python_script(config: ExecutionConfig, state: State<...>)
 *   cancel_python_script(state: State<...>)
 *   get_python_runtime_info()
 * The `state` parameter is injected by Tauri, so only `config` is passed and
 * no argument-name translation is needed.
 */

/**
 * Runtime information reported by the Rust `get_python_runtime_info` command.
 */
export interface PythonRuntimeInfo {
  pythonPath: string | null;
  runtimeDir: string | null;
  source: string;
  available: boolean;
}

/**
 * Get Tauri invoke function
 */
function getInvoke(): (cmd: string, args?: Record<string, unknown>) => Promise<unknown> {
  // Check if we're in Tauri environment
  const tauri = typeof window !== 'undefined' ? (window as TauriWindow).__TAURI__ : undefined;
  if (tauri) {
    return tauri.invoke;
  }

  // Mock for testing/development
  return async (cmd: string, args?: Record<string, unknown>) => {
    console.log(`[Tauri Mock] ${cmd}`, args);
    return null;
  };
}

/**
 * Whether a Tauri host is available in the current environment
 */
export function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean((window as TauriWindow).__TAURI__);
}

/**
 * Run a Python script through the Rust executor command
 */
export async function runPythonScript(config: ExecutionConfig): Promise<ExecutionResult> {
  const invoke = getInvoke();
  const result = await invoke('run_python_script', { config }) as ExecutionResult;
  return result;
}

/**
 * Cancel the currently running Python script
 */
export async function cancelPythonScript(): Promise<void> {
  const invoke = getInvoke();
  await invoke('cancel_python_script');
}

/**
 * Get information about the resolved Python runtime
 */
export async function getPythonRuntimeInfo(): Promise<PythonRuntimeInfo> {
  const invoke = getInvoke();
  const info = await invoke('get_python_runtime_info') as PythonRuntimeInfo;
  return info;
}
