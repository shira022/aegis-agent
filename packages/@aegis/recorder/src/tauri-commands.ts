import type { RecordingSession, RecordingState, BoundingBox } from './types';

interface TauriWindow extends Window {
  __TAURI__?: {
    invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  };
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
 * Start recording a new session
 */
export async function startRecording(name?: string): Promise<RecordingSession> {
  const invoke = getInvoke();
  const session = await invoke('start_recording', { name }) as RecordingSession;
  return session;
}

/**
 * Stop the current recording session
 */
export async function stopRecording(): Promise<RecordingSession> {
  const invoke = getInvoke();
  const session = await invoke('stop_recording') as RecordingSession;
  return session;
}

/**
 * Pause the current recording
 */
export async function pauseRecording(): Promise<void> {
  const invoke = getInvoke();
  await invoke('pause_recording');
}

/**
 * Resume a paused recording
 */
export async function resumeRecording(): Promise<void> {
  const invoke = getInvoke();
  await invoke('resume_recording');
}

/**
 * Get the current recording state
 */
export async function getRecordingState(): Promise<RecordingState> {
  const invoke = getInvoke();
  const state = await invoke('get_recording_state') as RecordingState;
  return state;
}

/**
 * Take a screenshot (full screen or region)
 */
export async function takeScreenshot(region?: BoundingBox): Promise<string> {
  const invoke = getInvoke();
  const screenshot = await invoke('take_screenshot', { region }) as string;
  return screenshot;
}
