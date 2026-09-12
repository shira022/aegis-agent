import type { ApprovalRequest } from '@aegis/approval';
import { Button, Card, Badge } from '@aegis/ui';

interface CodeReviewPanelProps {
  request: ApprovalRequest;
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string, reason: string) => void;
}

const riskLabels: Record<string, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
  critical: 'Critical',
};

const riskVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

export function CodeReviewPanel({ request, onApprove, onReject }: CodeReviewPanelProps) {
  const codeLines = request.code.split('\n');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-100">Code Review</h2>
        <Badge variant={riskVariant[request.riskLevel]}>{riskLabels[request.riskLevel]}</Badge>
      </div>

      {/* Explanation */}
      <Card>
        <p className="text-sm text-neutral-300">{request.explanation}</p>
      </Card>

      {/* Code display */}
      <Card>
        <div className="font-mono text-xs overflow-x-auto">
          {codeLines.map((line, i) => (
            <div key={i} className="flex">
              <span
                data-line-number
                className="w-8 text-right pr-3 text-neutral-600 select-none flex-shrink-0"
              >
                {i + 1}
              </span>
              <span className="text-neutral-300">{line}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Safety checks */}
      {request.safetyChecks.length > 0 && (
        <Card title="Safety Check">
          <div className="space-y-2">
            {request.safetyChecks.map((check) => (
              <div key={check.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{check.passed ? '✅' : '❌'}</span>
                  <span className="text-neutral-300">{check.name}</span>
                </div>
                <span className="text-xs text-neutral-500">{check.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Exception handlers */}
      {request.exceptionHandlers.length > 0 && (
        <Card title="Exception Handler">
          <div className="space-y-2">
            {request.exceptionHandlers.map((handler, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="info">{handler.condition}</Badge>
                  <span className="text-neutral-300">{handler.action}</span>
                </div>
                <code className="block mt-1 text-xs text-neutral-500 bg-neutral-800 rounded p-1">
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
              Approve
            </Button>
          )}
          {onReject && (
            <Button variant="danger" onClick={() => onReject(request.id, '')}>
              Reject
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
