import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OperationStep, OperationLog } from '@aegis/shared';
import { ActionFlowView } from '../ActionFlowView';

const step = (type: OperationStep['type'], selector: string): OperationStep => ({
  type,
  timestamp: '2025-06-15T10:30:00Z',
  target: { selector },
});

const sampleSteps: OperationStep[] = [
  step('navigate', 'https://portal.example.com'),
  { type: 'click', timestamp: '2025-06-15T10:30:04Z', target: { selector: '#reports', text: 'Reports' } },
];

const sampleLog: OperationLog = {
  id: 'log-1',
  taskId: 'task-1',
  steps: sampleSteps,
  recordedAt: '2025-06-15T10:30:18Z',
  source: 'browser',
};

const baseProps = {
  mode: 'timeline' as const,
  selectedLog: null,
  onToggleMode: vi.fn(),
  onClearSelection: vi.fn(),
  onRunIdleTasks: vi.fn(),
  onGoToTasks: vi.fn(),
};

describe('ActionFlowView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the empty-state guidance and a single heading', () => {
    render(<ActionFlowView {...baseProps} steps={[]} />);

    expect(screen.getByText('No actions recorded yet.')).toBeInTheDocument();
    expect(
      screen.getByText(/Pick a recorded run from Recent Activity/),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Action Flow' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Run idle tasks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Tasks' })).toBeInTheDocument();
  });

  it('fires both empty-state callbacks', () => {
    const onRunIdleTasks = vi.fn();
    const onGoToTasks = vi.fn();
    render(
      <ActionFlowView
        {...baseProps}
        steps={[]}
        onRunIdleTasks={onRunIdleTasks}
        onGoToTasks={onGoToTasks}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run idle tasks' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go to Tasks' }));

    expect(onRunIdleTasks).toHaveBeenCalledTimes(1);
    expect(onGoToTasks).toHaveBeenCalledTimes(1);
  });

  it('renders the timeline steps without the guidance text when non-empty', () => {
    render(<ActionFlowView {...baseProps} steps={sampleSteps} />);

    expect(screen.queryByText('No actions recorded yet.')).not.toBeInTheDocument();
    expect(screen.getByText('Navigate: https://portal.example.com')).toBeInTheDocument();
    expect(screen.getByText('Click Reports')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Action Flow' })).toHaveLength(1);
  });

  it('renders the recorded-run banner and clears the selection', () => {
    const onClearSelection = vi.fn();
    render(
      <ActionFlowView
        {...baseProps}
        steps={sampleSteps}
        selectedLog={sampleLog}
        onClearSelection={onClearSelection}
      />,
    );

    expect(
      screen.getByText('Viewing recorded run from browser · 2 step(s)'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to live run' }));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });
});
