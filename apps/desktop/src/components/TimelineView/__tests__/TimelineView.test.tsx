import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { OperationStep } from '@aegis/shared';
import { TimelineView } from '../TimelineView';

const makeStep = (overrides: Partial<OperationStep> & { type: OperationStep['type'] }): OperationStep => ({
  target: {},
  timestamp: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('TimelineView', () => {
  const defaultProps = {
    onToggleMode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────
  it('renders the title', () => {
    render(<TimelineView steps={[]} mode="timeline" {...defaultProps} />);
    expect(screen.getByText('操作フロー')).toBeInTheDocument();
  });

  it('renders step descriptions', () => {
    const steps: OperationStep[] = [
      makeStep({ type: 'click', target: { text: 'ログインボタン' }, timestamp: '2025-01-01T00:00:00Z' }),
      makeStep({ type: 'type', target: { text: 'ユーザー名を入力' }, timestamp: '2025-01-01T00:00:01Z' }),
    ];
    render(<TimelineView steps={steps} mode="timeline" {...defaultProps} />);
    expect(screen.getByText('ログインボタンをクリック')).toBeInTheDocument();
    expect(screen.getByText('ユーザー名を入力')).toBeInTheDocument();
  });

  // ── Step type icons ────────────────────────────────────────────────
  it('shows click icon for click steps', () => {
    const steps = [makeStep({ type: 'click', target: { text: 'ボタン' }, timestamp: '2025-01-01T00:00:00Z' })];
    render(<TimelineView steps={steps} mode="timeline" {...defaultProps} />);
    expect(screen.getByText('🖱')).toBeInTheDocument();
  });

  it('shows type icon for type steps', () => {
    const steps = [makeStep({ type: 'type', target: { text: '入力' }, timestamp: '2025-01-01T00:00:00Z' })];
    render(<TimelineView steps={steps} mode="timeline" {...defaultProps} />);
    expect(screen.getByText('⌨')).toBeInTheDocument();
  });

  it('shows navigate icon for navigate steps', () => {
    const steps = [makeStep({ type: 'navigate', target: {}, timestamp: '2025-01-01T00:00:00Z' })];
    render(<TimelineView steps={steps} mode="timeline" {...defaultProps} />);
    expect(screen.getByText('🌐')).toBeInTheDocument();
  });

  it('shows wait icon for wait steps', () => {
    const steps = [makeStep({ type: 'wait', target: {}, timestamp: '2025-01-01T00:00:00Z' })];
    render(<TimelineView steps={steps} mode="timeline" {...defaultProps} />);
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  it('shows screenshot icon for screenshot steps', () => {
    const steps = [makeStep({ type: 'screenshot', target: {}, timestamp: '2025-01-01T00:00:00Z' })];
    render(<TimelineView steps={steps} mode="timeline" {...defaultProps} />);
    expect(screen.getByText('📷')).toBeInTheDocument();
  });

  // ── Connector lines ────────────────────────────────────────────────
  it('shows connector lines between steps', () => {
    const steps: OperationStep[] = [
      makeStep({ type: 'click', target: { text: 'A' }, timestamp: '2025-01-01T00:00:00Z' }),
      makeStep({ type: 'click', target: { text: 'B' }, timestamp: '2025-01-01T00:00:01Z' }),
    ];
    const { container } = render(<TimelineView steps={steps} mode="timeline" {...defaultProps} />);
    const connectors = container.querySelectorAll('[data-connector]');
    expect(connectors).toHaveLength(1);
  });

  // ── Timestamps ─────────────────────────────────────────────────────
  it('displays timestamps for each step', () => {
    const steps = [makeStep({ type: 'click', target: { text: 'テスト' }, timestamp: '2025-06-15T10:30:00Z' })];
    render(<TimelineView steps={steps} mode="timeline" {...defaultProps} />);
    expect(screen.getByText(/19:30/)).toBeInTheDocument();
  });

  // ── Mode toggle ────────────────────────────────────────────────────
  it('shows flowchart toggle button', () => {
    render(<TimelineView steps={[]} mode="timeline" {...defaultProps} />);
    expect(screen.getByRole('button', { name: /フローチャート/ })).toBeInTheDocument();
  });

  it('calls onToggleMode when toggle button clicked', () => {
    const onToggleMode = vi.fn();
    render(<TimelineView steps={[]} mode="timeline" onToggleMode={onToggleMode} />);
    fireEvent.click(screen.getByRole('button', { name: /フローチャート/ }));
    expect(onToggleMode).toHaveBeenCalledTimes(1);
  });

  // ── Expand/collapse ────────────────────────────────────────────────
  it('expands step details when clicked', () => {
    const steps = [makeStep({ type: 'click', target: { text: 'ボタン', selector: '#btn' }, timestamp: '2025-01-01T00:00:00Z' })];
    render(<TimelineView steps={steps} mode="timeline" {...defaultProps} />);
    fireEvent.click(screen.getByText('🖱'));
    expect(screen.getByText('#btn')).toBeInTheDocument();
  });

  it('collapses step details when clicked again', () => {
    const steps = [makeStep({ type: 'click', target: { text: 'ボタン', selector: '#btn' }, timestamp: '2025-01-01T00:00:00Z' })];
    render(<TimelineView steps={steps} mode="timeline" {...defaultProps} />);
    const icon = screen.getByText('🖱');
    fireEvent.click(icon);
    expect(screen.getByText('#btn')).toBeInTheDocument();
    fireEvent.click(icon);
    expect(screen.queryByText('#btn')).not.toBeInTheDocument();
  });

  // ── Empty state ────────────────────────────────────────────────────
  it('shows empty state when no steps', () => {
    render(<TimelineView steps={[]} mode="timeline" {...defaultProps} />);
    expect(screen.getByText('操作が記録されていません')).toBeInTheDocument();
  });
});
