import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ApprovalRequest } from '@aegis/approval';
import { CodeReviewPanel } from '../CodeReviewPanel';

const makeRequest = (overrides: Partial<ApprovalRequest> = {}): ApprovalRequest => ({
  id: 'req-1',
  taskId: 'task-1',
  code: 'def main():\n    print("hello")',
  explanation: 'Test Script',
  exceptionHandlers: [],
  safetyChecks: [],
  createdAt: Date.now(),
  riskLevel: 'low',
  state: 'reviewing',
  ...overrides,
});

describe('CodeReviewPanel', () => {
  const defaultProps = {
    onApprove: vi.fn(),
    onReject: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────
  it('renders the title', () => {
    const request = makeRequest();
    render(<CodeReviewPanel request={request} {...defaultProps} />);
    expect(screen.getByText('Code Review')).toBeInTheDocument();
  });

  it('renders the explanation', () => {
    const request = makeRequest({ explanation: 'Add login process' });
    render(<CodeReviewPanel request={request} {...defaultProps} />);
    expect(screen.getByText('Add login process')).toBeInTheDocument();
  });

  it('renders the code', () => {
    const request = makeRequest({ code: 'print("hello")' });
    render(<CodeReviewPanel request={request} {...defaultProps} />);
    expect(screen.getByText('print("hello")')).toBeInTheDocument();
  });

  // ── Risk level ─────────────────────────────────────────────────────
  it('shows low risk indicator', () => {
    const request = makeRequest({ riskLevel: 'low' });
    render(<CodeReviewPanel request={request} {...defaultProps} />);
    expect(screen.getByText('Low Risk')).toBeInTheDocument();
  });

  it('shows medium risk indicator', () => {
    const request = makeRequest({ riskLevel: 'medium' });
    render(<CodeReviewPanel request={request} {...defaultProps} />);
    expect(screen.getByText('Medium Risk')).toBeInTheDocument();
  });

  it('shows high risk indicator', () => {
    const request = makeRequest({ riskLevel: 'high' });
    render(<CodeReviewPanel request={request} {...defaultProps} />);
    expect(screen.getByText('High Risk')).toBeInTheDocument();
  });

  it('shows critical risk indicator', () => {
    const request = makeRequest({ riskLevel: 'critical' });
    render(<CodeReviewPanel request={request} {...defaultProps} />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  // ── Safety checks ──────────────────────────────────────────────────
  it('renders safety check results', () => {
    const request = makeRequest({
      safetyChecks: [
        { id: '1', name: 'File Access', passed: true, message: 'OK' },
        { id: '2', name: 'Network', passed: false, message: 'Blocked' },
      ],
    });
    render(<CodeReviewPanel request={request} {...defaultProps} />);
    expect(screen.getByText('File Access')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
  });

  it('shows pass/fail icons for safety checks', () => {
    const request = makeRequest({
      safetyChecks: [
        { id: '1', name: 'Check A', passed: true, message: 'OK' },
        { id: '2', name: 'Check B', passed: false, message: 'NG' },
      ],
    });
    render(<CodeReviewPanel request={request} {...defaultProps} />);
    expect(screen.getAllByText('✅')).toHaveLength(1);
    expect(screen.getAllByText('❌')).toHaveLength(1);
  });

  // ── Exception handlers ─────────────────────────────────────────────
  it('renders exception handler proposals', () => {
    const request = makeRequest({
      exceptionHandlers: [
        { condition: 'ElementNotFound', action: 'Retry', code: 'retry(3)', riskLevel: 'low' },
      ],
    });
    render(<CodeReviewPanel request={request} {...defaultProps} />);
    expect(screen.getByText('ElementNotFound')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  // ── Approve/Reject buttons ─────────────────────────────────────────
  it('shows approve button', () => {
    const request = makeRequest();
    render(<CodeReviewPanel request={request} {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Approve/ })).toBeInTheDocument();
  });

  it('shows reject button', () => {
    const request = makeRequest();
    render(<CodeReviewPanel request={request} {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Reject/ })).toBeInTheDocument();
  });

  it('calls onApprove with request id when approve clicked', () => {
    const onApprove = vi.fn();
    const request = makeRequest({ id: 'req-42' });
    render(<CodeReviewPanel request={request} onApprove={onApprove} onReject={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Approve/ }));
    expect(onApprove).toHaveBeenCalledWith('req-42');
  });

  it('calls onReject with request id when reject clicked', () => {
    const onReject = vi.fn();
    const request = makeRequest({ id: 'req-42' });
    render(<CodeReviewPanel request={request} onApprove={vi.fn()} onReject={onReject} />);
    fireEvent.click(screen.getByRole('button', { name: /Reject/ }));
    expect(onReject).toHaveBeenCalledWith('req-42', '');
  });

  // ── Code highlighting (line types) ─────────────────────────────────
  it('renders code with line numbers', () => {
    const request = makeRequest({ code: 'line1\nline2' });
    const { container } = render(<CodeReviewPanel request={request} {...defaultProps} />);
    const lines = container.querySelectorAll('[data-line-number]');
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });
});
