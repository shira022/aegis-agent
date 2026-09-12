import { useEffect, useState } from 'react';
import type { ApprovalRequest } from '@aegis/approval';
import { Modal, Button } from '@aegis/ui';
import { CodeReviewPanel } from '../CodeReviewPanel/CodeReviewPanel';

export interface ApprovalDialogProps {
  request: ApprovalRequest;
  open: boolean;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string, reason: string) => void;
  onClose?: () => void;
}

export function ApprovalDialog({
  request,
  open,
  onApprove,
  onReject,
  onClose,
}: ApprovalDialogProps) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) {
      setReason('');
    }
  }, [open]);

  useEffect(() => {
    setReason('');
  }, [request.id]);

  const trimmedReason = reason.trim();

  const handleClose = (): void => {
    setReason('');
    onClose?.();
  };

  const handleApprove = (): void => {
    onApprove(request.id);
    setReason('');
  };

  const handleReject = (): void => {
    if (trimmedReason.length === 0) {
      return;
    }
    onReject(request.id, trimmedReason);
    setReason('');
  };

  return (
    <Modal open={open} onClose={handleClose} title="Approve or Reject">
      <CodeReviewPanel request={request} />

      <div className="mt-4 space-y-3">
        <label
          htmlFor="approval-reject-reason"
          className="block text-sm font-medium text-neutral-200"
        >
          Reject reason
        </label>
        <textarea
          id="approval-reject-reason"
          data-testid="reject-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain why this request should be rejected"
          rows={3}
          className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={handleApprove}>
            Approve
          </Button>
          <Button variant="danger" disabled={trimmedReason.length === 0} onClick={handleReject}>
            Reject
          </Button>
        </div>
      </div>
    </Modal>
  );
}
