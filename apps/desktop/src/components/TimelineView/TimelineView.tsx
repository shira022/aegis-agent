import { useState } from 'react';
import type { OperationStep } from '@aegis/shared';
import { Button } from '../ui/Button';

interface TimelineViewProps {
  steps: OperationStep[];
  mode: 'timeline' | 'flowchart';
  onToggleMode: () => void;
}

const stepIcons: Record<string, string> = {
  click: '🖱',
  type: '⌨',
  navigate: '🌐',
  wait: '⏳',
  screenshot: '📷',
};

function formatDescription(step: OperationStep): string {
  const text = step.target?.text ?? 'action';
  switch (step.type) {
    case 'click':
      return `Click ${text}`;
    case 'type':
      return text;
    case 'navigate':
      return `Navigate${step.target?.selector ? `: ${step.target.selector}` : ''}`;
    case 'wait':
      return 'Wait';
    case 'screenshot':
      return 'Take screenshot';
    default:
      return text;
  }
}

export function TimelineView({ steps, mode: _mode, onToggleMode }: TimelineViewProps) {
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-100">Action Flow</h2>
        <Button variant="ghost" size="sm" onClick={onToggleMode}>
          Flowchart
        </Button>
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-8 text-neutral-400">
          No actions recorded
        </div>
      ) : (
        <div className="relative space-y-0">
          {steps.map((step, i) => (
            <div key={i}>
              {/* Connector line */}
              {i > 0 && (
                <div
                  data-connector
                  className="ml-4 border-l-2 border-neutral-700 h-4"
                />
              )}

              {/* Step */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-sm">
                  <button
                    onClick={() => toggleExpand(i)}
                    className="hover:scale-110 transition-transform"
                    title="Show details"
                  >
                    {stepIcons[step.type]}
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-200">
                    {formatDescription(step)}
                  </p>
                  <time className="text-xs text-neutral-500">
                    {new Date(step.timestamp).toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>

                  {/* Expanded details */}
                  {expanded.has(i) && step.target && (
                    <div className="mt-2 p-2 rounded bg-neutral-800 text-xs text-neutral-400 space-y-1">
                      {step.target.selector && (
                        <p><span className="text-neutral-500">Selector:</span> {step.target.selector}</p>
                      )}
                      {step.target.text && (
                        <p><span className="text-neutral-500">Text:</span> {step.target.text}</p>
                      )}
                      <p><span className="text-neutral-500">Type:</span> {step.type}</p>
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
