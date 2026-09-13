import type { ApprovalRequest } from '@aegis/approval';
import type { RiskLevel } from '@aegis/approval';
import {
  Badge,
  Button,
  Card,
  CheckCircle2,
  Icon,
  XCircle,
  useAppTranslation,
} from '@aegis/ui';
import type { LucideIcon } from '@aegis/ui';

interface CodeReviewPanelProps {
  request: ApprovalRequest;
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string, reason: string) => void;
}

const RISK_LABEL_KEYS = {
  low: 'review.risk.low',
  medium: 'review.risk.medium',
  high: 'review.risk.high',
  critical: 'review.risk.critical',
} as const;

const riskVariant: Record<RiskLevel, 'success' | 'warning' | 'danger' | 'info'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

const CHECK_ICONS: Record<'passed' | 'failed', LucideIcon> = {
  passed: CheckCircle2,
  failed: XCircle,
};

export function CodeReviewPanel({ request, onApprove, onReject }: CodeReviewPanelProps) {
  const { t } = useAppTranslation();
  const codeLines = request.code.split('\n');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fg">{t('review.title')}</h2>
        <Badge variant={riskVariant[request.riskLevel]}>
          {t(RISK_LABEL_KEYS[request.riskLevel])}
        </Badge>
      </div>

      {/* Explanation */}
      <Card>
        <p className="text-sm text-fg">{request.explanation}</p>
      </Card>

      {/* Code display */}
      <Card>
        <div className="font-mono text-xs overflow-x-auto">
          {codeLines.map((line, i) => (
            <div key={i} className="flex">
              <span
                data-line-number
                className="w-8 text-right pr-3 text-muted select-none flex-shrink-0"
              >
                {i + 1}
              </span>
              <span className="text-fg">{line}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Safety checks */}
      {request.safetyChecks.length > 0 && (
        <Card title={t('review.safetyCheck')}>
          <div className="space-y-2">
            {request.safetyChecks.map((check) => (
              <div key={check.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Icon
                    icon={check.passed ? CHECK_ICONS.passed : CHECK_ICONS.failed}
                    size={16}
                    label={check.passed ? t('review.passed') : t('review.failed')}
                    className={check.passed ? 'text-success' : 'text-danger'}
                  />
                  <span className="text-fg">{check.name}</span>
                </div>
                <span className="text-xs text-muted">{check.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Exception handlers */}
      {request.exceptionHandlers.length > 0 && (
        <Card title={t('review.exceptionHandler')}>
          <div className="space-y-2">
            {request.exceptionHandlers.map((handler, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="info">{handler.condition}</Badge>
                  <span className="text-fg">{handler.action}</span>
                </div>
                <code className="block mt-1 text-xs text-muted bg-surface-raised rounded p-1">
                  {handler.code}
                </code>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Action buttons */}
      {(onApprove || onReject) && (
        <div className="flex items-center gap-3">
          {onApprove && (
            <Button variant="primary" onClick={() => onApprove(request.id)}>
              {t('common.approve')}
            </Button>
          )}
          {onReject && (
            <Button variant="danger" onClick={() => onReject(request.id, '')}>
              {t('common.reject')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
