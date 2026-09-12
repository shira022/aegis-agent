import type { DesktopApi, HealingEvent } from '../ipc/types';
import { createStore, type Store } from './createStore';

export interface HealingState {
  events: HealingEvent[];
  unread: number;
}

export interface HealingActions {
  load(): Promise<void>;
  dismiss(id: string): void;
  dismissAll(): void;
}

export interface HealingStore {
  state: Store<HealingState>;
  actions: HealingActions;
}

function countUnread(events: HealingEvent[]): number {
  return events.filter((event) => !event.resolved).length;
}

export function createHealingStore(api: DesktopApi): HealingStore {
  const state = createStore<HealingState>({ events: [], unread: 0 });

  const load = async (): Promise<void> => {
    try {
      const events = await api.listHealingEvents();
      state.setState({ events, unread: countUnread(events) });
    } catch {
      return;
    }
  };

  const dismiss = (id: string): void => {
    state.setState((prev) => {
      const events = prev.events.map((event) =>
        event.id === id ? { ...event, resolved: true } : event,
      );
      return { events, unread: countUnread(events) };
    });
  };

  const dismissAll = (): void => {
    state.setState((prev) => {
      const events = prev.events.map((event) => ({ ...event, resolved: true }));
      return { events, unread: 0 };
    });
  };

  return { state, actions: { load, dismiss, dismissAll } };
}
