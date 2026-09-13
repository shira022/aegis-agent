import { useEffect, useState } from 'react';
import type { ApprovalRequest } from '@aegis/approval';
import { Button, Modal, useAppTranslation } from '@aegis/ui';
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
  const { t } = useAppTranslation();
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
    <Modal open={open} onClose={handleClose} title={t('approval.title')}>
      <CodeReviewPanel request={request} />

      <div className="mt-4 space-y-3">
        <label
          htmlFor="approval-reject-reason"
          className="block text-sm font-medium text-fg"
        >
          {t('approval.rejectReason')}
        </label>
        <textarea
          id="approval-reject-reason"
          data-testid="reject-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t('approval.rejectReasonPlaceholder')}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={handleApprove}>
            {t('common.approve')}
          </Button>
          <Button variant="danger" disabled={trimmedReason.length === 0} onClick={handleReject}>
            {t('common.reject')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
