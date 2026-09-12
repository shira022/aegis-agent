import { useDesktop } from '../stores/DesktopContext';
import { useStore } from './useStore';
import type { RecorderActions, RecorderState } from '../stores/recorderStore';

export interface UseRecorderResult {
  state: RecorderState;
  actions: RecorderActions;
}

export function useRecorder(): UseRecorderResult {
  const { stores } = useDesktop();
  const state = useStore(stores.recorder.state);
  return { state, actions: stores.recorder.actions };
}
