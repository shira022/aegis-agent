import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApprovalRequest } from '@aegis/approval';
import { ApprovalDialog } from '../ApprovalDialog';

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

describe('ApprovalDialog', () => {
  const defaultProps = {
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the review content when open', () => {
    render(<ApprovalDialog request={makeRequest()} open {...defaultProps} />);
    expect(screen.getByText('Approve or Reject')).toBeInTheDocument();
    expect(screen.getByText('Code Review')).toBeInTheDocument();
    expect(screen.getByText('Test Script')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<ApprovalDialog request={makeRequest()} open={false} {...defaultProps} />);
    expect(screen.queryByText('Approve or Reject')).not.toBeInTheDocument();
    expect(screen.queryByText('Code Review')).not.toBeInTheDocument();
  });

  it('calls onApprove with the request id when Approve is clicked', () => {
    const onApprove = vi.fn();
    render(
      <ApprovalDialog
        request={makeRequest({ id: 'req-42' })}
        open
        onApprove={onApprove}
        onReject={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onApprove).toHaveBeenCalledWith('req-42');
  });

  it('disables Reject until a non-empty reason is typed', () => {
    render(<ApprovalDialog request={makeRequest()} open {...defaultProps} />);
    const reject = screen.getByRole('button', { name: 'Reject' });
    expect(reject).toBeDisabled();

    fireEvent.change(screen.getByTestId('reject-reason'), { target: { value: '   ' } });
    expect(reject).toBeDisabled();

    fireEvent.change(screen.getByTestId('reject-reason'), { target: { value: 'Unsafe action' } });
    expect(reject).toBeEnabled();
  });

  it('calls onReject with the trimmed reason', () => {
    const onReject = vi.fn();
    render(
      <ApprovalDialog
        request={makeRequest({ id: 'req-7' })}
        open
        onApprove={vi.fn()}
        onReject={onReject}
      />,
    );
    fireEvent.change(screen.getByTestId('reject-reason'), {
      target: { value: '  touches production data  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onReject).toHaveBeenCalledWith('req-7', 'touches production data');
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<ApprovalDialog request={makeRequest()} open onApprove={vi.fn()} onReject={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<ApprovalDialog request={makeRequest()} open onApprove={vi.fn()} onReject={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the dialog content is clicked', () => {
    const onClose = vi.fn();
    render(<ApprovalDialog request={makeRequest()} open onApprove={vi.fn()} onReject={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText('Code Review'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
