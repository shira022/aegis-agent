import type {
  CodeLine,
  CodeHighlight,
  DisplayableCode,
  FlowchartStep,
  LineType,
} from './types.js';
import type { OperationLog, StepType } from '@aegis/shared';

// ─── Code Display Formatter ────────────────────────────────────────

const DANGEROUS_PATTERNS = /\b(eval|exec|Function|child_process|process\.env)\b/;
const WARNING_PATTERNS = /\b(TODO|FIXME|HACK|XXX|WARN|fetch|axios|await)\b/;
const INFO_PATTERNS = /^(?:\s*\/\/|\/\*|\*)/;

const RISK_HIGHLIGHTS: Array<{ pattern: RegExp; color: string; label: string }> = [
  { pattern: /\beval\b/, color: '#ff4444', label: 'Danger: eval usage' },
  { pattern: /\bexec\b/, color: '#ff4444', label: 'Danger: exec usage' },
  { pattern: /\bFunction\b/, color: '#ff8800', label: 'Warning: Function constructor' },
  { pattern: /\bprocess\.env\b/, color: '#ff8800', label: 'Warning: env var access' },
  { pattern: /\b(fetch|axios)\b/, color: '#ffcc00', label: 'Info: network call' },
];

export function formatCodeForDisplay(code: string): DisplayableCode {
  const rawLines = code === '' ? [] : code.split('\n');
  const lines: CodeLine[] = rawLines.map((content, i) => ({
    number: i + 1,
    content,
    type: classifyLine(content),
  }));

  const highlights = generateHighlights(rawLines);

  const dangerCount = lines.filter((l) => l.type === 'danger').length;
  const warningCount = lines.filter((l) => l.type === 'warning').length;
  const infoCount = lines.filter((l) => l.type === 'info').length;

  const parts: string[] = [];
  if (dangerCount > 0) parts.push(`Danger: ${dangerCount} lines`);
  if (warningCount > 0) parts.push(`Warning: ${warningCount} lines`);
  if (infoCount > 0) parts.push(`Info: ${infoCount} lines`);
  if (parts.length === 0) parts.push('No issues');

  const summary = `${lines.length} lines | ${parts.join(', ')}`;

  return { lines, highlights, summary };
}

function classifyLine(content: string): LineType {
  if (DANGEROUS_PATTERNS.test(content)) return 'danger';
  if (WARNING_PATTERNS.test(content)) return 'warning';
  if (INFO_PATTERNS.test(content)) return 'info';
  return 'normal';
}

function generateHighlights(rawLines: string[]): CodeHighlight[] {
  const highlights: CodeHighlight[] = [];

  for (const rule of RISK_HIGHLIGHTS) {
    rawLines.forEach((line, i) => {
      if (rule.pattern.test(line)) {
        // Merge with previous highlight if adjacent
        const last = highlights[highlights.length - 1];
        if (last && last.endLine === i && last.label === rule.label) {
          last.endLine = i + 1;
        } else {
          highlights.push({
            startLine: i + 1,
            endLine: i + 1,
            color: rule.color,
            label: rule.label,
          });
        }
      }
    });
  }

  return highlights;
}

// ─── Flowchart Generator ───────────────────────────────────────────

const STEP_ICONS: Record<StepType, string> = {
  click: '🖱️',
  type: '⌨️',
  navigate: '🌐',
  wait: '⏳',
  screenshot: '📸',
};

const STEP_DESCRIPTIONS: Record<StepType, (target: { selector?: string; text?: string }) => string> = {
  click: (t) => `Click element${t.text ? ` "${t.text}"` : ''}`,
  type: (t) => `Type text${t.text ? ` "${t.text}"` : ''}`,
  navigate: (t) => `Navigate${t.selector ? ` → ${t.selector}` : ''}`,
  wait: () => 'Wait',
  screenshot: () => 'Take screenshot',
};

export function generateFlowchart(log: OperationLog): FlowchartStep[] {
  return log.steps.map((step, i) => ({
    order: i + 1,
    description: STEP_DESCRIPTIONS[step.type]?.(step.target) ?? `${step.type} execute`,
    type: 'action' as const,
    icon: STEP_ICONS[step.type] ?? '📋',
  }));
}
