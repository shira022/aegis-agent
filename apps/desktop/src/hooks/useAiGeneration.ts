import { useDesktop } from '../stores/DesktopContext';
import { useStore } from './useStore';
import type { GenerationActions, GenerationState } from '../stores/generationStore';

export interface UseAiGenerationResult {
  state: GenerationState;
  actions: GenerationActions;
}

export function useAiGeneration(): UseAiGenerationResult {
  const { stores } = useDesktop();
  const state = useStore(stores.generation.state);
  return { state, actions: stores.generation.actions };
}
