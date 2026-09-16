import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type { DesktopApi } from '../ipc/types';
import { getAdapter } from '../ipc';
import { createTasksStore, type TasksStore } from './tasksStore';
import { createRunStore, type RunStore } from './runStore';
import { createApprovalsStore, type ApprovalsStore } from './approvalsStore';
import { createHealingStore, type HealingStore } from './healingStore';
import { createRecorderStore, type RecorderStore } from './recorderStore';
import { createSetupStore, type SetupStore } from './setupStore';
import { createGenerationStore, type GenerationStore } from './generationStore';

export interface DesktopStores {
  tasks: TasksStore;
  run: RunStore;
  approvals: ApprovalsStore;
  healing: HealingStore;
  recorder: RecorderStore;
  setup: SetupStore;
  generation: GenerationStore;
}

export interface DesktopContextValue {
  api: DesktopApi;
  stores: DesktopStores;
}

const DesktopContext = createContext<DesktopContextValue | null>(null);

export interface DesktopProviderProps {
  api?: DesktopApi;
  children: ReactNode;
}

export function DesktopProvider({ api, children }: DesktopProviderProps) {
  const resolvedApi = api ?? getAdapter();

  const stores = useMemo<DesktopStores>(() => {
    const approvals = createApprovalsStore(resolvedApi);
    return {
      tasks: createTasksStore(resolvedApi),
      run: createRunStore(resolvedApi),
      approvals,
      healing: createHealingStore(resolvedApi),
      recorder: createRecorderStore(resolvedApi),
      setup: createSetupStore(resolvedApi),
      generation: createGenerationStore(resolvedApi, approvals),
    };
  }, [resolvedApi]);

  useEffect(() => {
    let active = true;

    void Promise.allSettled([
      stores.tasks.actions.load(),
      stores.run.actions.refresh(),
      stores.run.actions.loadActivity(),
      stores.approvals.actions.load(),
      stores.healing.actions.load(),
      stores.recorder.actions.load(),
      stores.setup.actions.load(),
    ]).then(() => {
      if (!active) {
        return;
      }
    });

    return () => {
      active = false;
    };
  }, [stores]);

  const value = useMemo<DesktopContextValue>(
    () => ({ api: resolvedApi, stores }),
    [resolvedApi, stores],
  );

  return <DesktopContext.Provider value={value}>{children}</DesktopContext.Provider>;
}

export function useDesktop(): DesktopContextValue {
  const context = useContext(DesktopContext);
  if (context === null) {
    throw new Error('useDesktop must be used within a DesktopProvider');
  }
  return context;
}
