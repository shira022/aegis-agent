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
    const cases: { type: HealingEventType; className: string }[] = [
      { type: 'error', className: 'bg-danger-surface' },
      { type: 'healing', className: 'bg-warning-surface' },
      { type: 'healed', className: 'bg-success-surface' },
      { type: 'failed', className: 'bg-danger-surface' },
      { type: 'fallback', className: 'bg-surface-raised' },
    ];
    const events = cases.map(({ type }) => makeEvent(type));
    const { container } = render(<HealingNotifier events={events} onDismiss={vi.fn()} />);

    for (const { type, className } of cases) {
      const entry = container.querySelector<HTMLElement>(`[data-type="${type}"]`);
      if (entry === null) {
        throw new Error(`Missing healing entry for type "${type}"`);
      }
      expect(entry).toHaveClass(className);
      expect(entry).toHaveTextContent(`Message for ${type}`);
      const iconNode = entry.querySelector('[data-testid="healing-icon"]');
      expect(iconNode?.querySelector('svg')).not.toBeNull();
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
