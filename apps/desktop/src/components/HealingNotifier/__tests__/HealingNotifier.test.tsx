import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HealingEvent, HealingEventType } from '../../../ipc';
import { HealingNotifier } from '../HealingNotifier';

const makeEvent = (
  type: HealingEventType,
  overrides: Partial<HealingEvent> = {},
): HealingEvent => ({
  id: `heal-${type}`,
  taskId: 'task-1',
  type,
  message: `Message for ${type}`,
  timestamp: Date.now(),
  resolved: false,
  ...overrides,
});

describe('HealingNotifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when there are no events', () => {
    const { container } = render(<HealingNotifier events={[]} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders the right icon, colour and message for each event type', () => {
    const cases: { type: HealingEventType; icon: string; className: string }[] = [
      { type: 'error', icon: '✕', className: 'bg-red-900' },
      { type: 'healing', icon: '🛠', className: 'bg-amber-900' },
      { type: 'healed', icon: '✓', className: 'bg-green-900' },
      { type: 'failed', icon: '✗', className: 'bg-red-950' },
      { type: 'fallback', icon: '↩', className: 'bg-neutral-800' },
    ];
    const events = cases.map(({ type }) => makeEvent(type));
    const { container } = render(<HealingNotifier events={events} onDismiss={vi.fn()} />);

    for (const { type, icon, className } of cases) {
      const entry = container.querySelector<HTMLElement>(`[data-type="${type}"]`);
      if (entry === null) {
        throw new Error(`Missing healing entry for type "${type}"`);
      }
      expect(entry).toHaveClass(className);
      expect(entry).toHaveTextContent(`Message for ${type}`);
      const iconNode = entry.querySelector('[data-testid="healing-icon"]');
      expect(iconNode).toHaveTextContent(icon);
    }
  });

  it('shows the task id for each event', () => {
    render(
      <HealingNotifier
        events={[makeEvent('error', { taskId: 'task-99' })]}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText('task-99')).toBeInTheDocument();
  });

  it('calls onDismiss with the event id', () => {
    const onDismiss = vi.fn();
    render(
      <HealingNotifier
        events={[makeEvent('error', { id: 'heal-abc', message: 'Selector changed' })]}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Selector changed' }));
    expect(onDismiss).toHaveBeenCalledWith('heal-abc');
  });

  it('does not show Dismiss all for a single event', () => {
    render(<HealingNotifier events={[makeEvent('healed')]} onDismiss={vi.fn()} onDismissAll={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Dismiss all' })).not.toBeInTheDocument();
  });

  it('shows and triggers Dismiss all when there are multiple events', () => {
    const onDismissAll = vi.fn();
    render(
      <HealingNotifier
        events={[makeEvent('error'), makeEvent('healed')]}
        onDismiss={vi.fn()}
        onDismissAll={onDismissAll}
      />,
    );
    const dismissAll = screen.getByRole('button', { name: 'Dismiss all' });
    fireEvent.click(dismissAll);
    expect(onDismissAll).toHaveBeenCalledTimes(1);
  });

  it('exposes aria-live for assistive technology', () => {
    render(<HealingNotifier events={[makeEvent('healing')]} onDismiss={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
