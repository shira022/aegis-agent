import type { DesktopApi, RecorderSession, ScreenshotRef } from '../ipc/types';
import { createStore, toErrorMessage, type Store } from './createStore';

export interface RecorderState {
  session: RecorderSession;
  loading: boolean;
  error: string | null;
}

export interface RecorderActions {
  load(): Promise<RecorderSession | null>;
  start(): Promise<RecorderSession | null>;
  pause(): Promise<RecorderSession | null>;
  resume(): Promise<RecorderSession | null>;
  stop(): Promise<RecorderSession | null>;
  screenshot(label?: string): Promise<ScreenshotRef | null>;
}

export interface RecorderStore {
  state: Store<RecorderState>;
  actions: RecorderActions;
}

const idleSession: RecorderSession = { status: 'idle', actions: [], screenshots: [] };

export function createRecorderStore(api: DesktopApi): RecorderStore {
  const state = createStore<RecorderState>({
    session: idleSession,
    loading: false,
    error: null,
  });

  const execute = async (
    operation: () => Promise<RecorderSession>,
  ): Promise<RecorderSession | null> => {
    state.setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const session = await operation();
      state.setState({ session, loading: false, error: null });
      return session;
    } catch (error) {
      state.setState((prev) => ({ ...prev, loading: false, error: toErrorMessage(error) }));
      return null;
    }
  };

  const screenshot = async (label?: string): Promise<ScreenshotRef | null> => {
    try {
      const reference = await api.takeScreenshot(label);
      state.setState((prev) => ({
        ...prev,
        session: { ...prev.session, screenshots: [...prev.session.screenshots, reference] },
        error: null,
      }));
      return reference;
    } catch (error) {
      state.setState((prev) => ({ ...prev, error: toErrorMessage(error) }));
      return null;
    }
  };

  return {
    state,
    actions: {
      load: () => execute(() => api.getRecorder()),
      start: () => execute(() => api.startRecording()),
      pause: () => execute(() => api.pauseRecording()),
      resume: () => execute(() => api.resumeRecording()),
      stop: () => execute(() => api.stopRecording()),
      screenshot,
    },
  };
}
