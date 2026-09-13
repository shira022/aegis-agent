import { useState } from 'react';
import type { OperationStep, StepType } from '@aegis/shared';
import { Button } from '../Button';
import { actionIcons, Icon } from '../icons';
import { useAppTranslation } from '../i18n';
import { formatDate } from '../i18n/format';

type TranslateFn = ReturnType<typeof useAppTranslation>['t'];

export interface TimelineProps {
  steps: OperationStep[];
  mode: 'timeline' | 'flowchart';
  onToggleMode: () => void;
}

const ACTION_LABEL_KEYS = {
  click: 'actionFlow.actions.click',
  type: 'actionFlow.actions.type',
  navigate: 'actionFlow.actions.navigate',
  wait: 'actionFlow.actions.wait',
  screenshot: 'actionFlow.actions.screenshot',
} as const;

function formatDescription(step: OperationStep, t: TranslateFn): string {
  const text = step.target?.text ?? t('actionFlow.unknownAction');
  switch (step.type) {
    case 'click':
      return t('actionFlow.descriptions.click', { text });
    case 'type':
      return t('actionFlow.descriptions.type', { text });
    case 'navigate':
      return step.target?.selector
        ? t('actionFlow.descriptions.navigateWithSelector', { selector: step.target.selector })
        : t('actionFlow.descriptions.navigate');
    case 'wait':
      return t('actionFlow.descriptions.wait');
    case 'screenshot':
      return t('actionFlow.descriptions.screenshot');
    default:
      return text;
  }
}

export function Timeline({ steps, mode, onToggleMode }: TimelineProps) {
  const { t, i18n } = useAppTranslation();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3" data-mode={mode}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fg">{t('actionFlow.title')}</h2>
        <Button variant="ghost" size="sm" onClick={onToggleMode}>
          {t('actionFlow.flowchart')}
        </Button>
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-8 text-muted">{t('actionFlow.empty')}</div>
      ) : (
        <div className="relative space-y-0">
          {steps.map((step, i) => (
            <div key={i}>
              {/* Connector line */}
              {i > 0 && (
                <div data-connector className="ml-4 border-l-2 border-border h-4" />
              )}

              {/* Step */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-raised border border-border flex items-center justify-center text-sm text-muted">
                  <button
                    type="button"
                    onClick={() => toggleExpand(i)}
                    aria-label={t(ACTION_LABEL_KEYS[step.type as StepType])}
                    className="inline-flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Icon icon={actionIcons[step.type]} size={16} />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg">{formatDescription(step, t)}</p>
                  <time className="text-xs text-muted">
                    {formatDate(new Date(step.timestamp), i18n.language, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>

                  {/* Expanded details */}
                  {expanded.has(i) && step.target && (
                    <div className="mt-2 p-2 rounded bg-surface-raised text-xs text-muted space-y-1">
                      {step.target.selector && (
                        <p>
                          <span className="text-muted">{t('actionFlow.details.selector')}:</span>{' '}
                          {step.target.selector}
                        </p>
                      )}
                      {step.target.text && (
                        <p>
                          <span className="text-muted">{t('actionFlow.details.text')}:</span>{' '}
                          {step.target.text}
                        </p>
                      )}
                      <p>
                        <span className="text-muted">{t('actionFlow.details.type')}:</span>{' '}
                        {step.type}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
