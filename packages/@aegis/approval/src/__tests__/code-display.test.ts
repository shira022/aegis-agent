import { describe, it, expect } from 'vitest';
import {
  formatCodeForDisplay,
  generateFlowchart,
} from '../code-display.js';
import type { OperationLog } from '@aegis/shared';

describe('CodeDisplay', () => {
  describe('formatCodeForDisplay', () => {
    it('should split code into lines with numbers', () => {
      const code = 'line1\nline2\nline3';
      const display = formatCodeForDisplay(code);
      expect(display.lines).toHaveLength(3);
      expect(display.lines[0].number).toBe(1);
      expect(display.lines[0].content).toBe('line1');
      expect(display.lines[2].number).toBe(3);
    });

    it('should mark lines with risk keywords as warning', () => {
      const code = 'const x = 1;\n// TODO: fix\nawait fetch(url)';
      const display = formatCodeForDisplay(code);
      const warningLines = display.lines.filter((l) => l.type === 'warning');
      expect(warningLines.length).toBeGreaterThan(0);
    });

    it('should mark dangerous code as danger', () => {
      const code = 'eval(malicious)\nconst x = 1';
      const display = formatCodeForDisplay(code);
      const dangerLines = display.lines.filter((l) => l.type === 'danger');
      expect(dangerLines.length).toBeGreaterThan(0);
    });

    it('should mark info lines', () => {
      const code = '// this is a comment\nconst x = 1';
      const display = formatCodeForDisplay(code);
      const infoLines = display.lines.filter((l) => l.type === 'info');
      expect(infoLines.length).toBeGreaterThan(0);
    });

    it('should generate highlights for dangerous sections', () => {
      const code = 'eval("hack")\nconst safe = true';
      const display = formatCodeForDisplay(code);
      expect(display.highlights.length).toBeGreaterThan(0);
      const highlight = display.highlights[0];
      expect(highlight.startLine).toBe(1);
      expect(highlight.endLine).toBeGreaterThanOrEqual(1);
      expect(highlight.color).toBeTruthy();
      expect(highlight.label).toBeTruthy();
    });

    it('should generate a summary', () => {
      const code = 'const x = 1;\neval("bad")';
      const display = formatCodeForDisplay(code);
      expect(display.summary).toBeTruthy();
      expect(typeof display.summary).toBe('string');
      expect(display.summary.length).toBeGreaterThan(0);
    });

    it('should handle empty code', () => {
      const display = formatCodeForDisplay('');
      expect(display.lines).toHaveLength(0);
      expect(display.highlights).toHaveLength(0);
      expect(display.summary).toBeTruthy();
    });
  });

  describe('generateFlowchart', () => {
    it('should generate flowchart steps from OperationLog', () => {
      const log: OperationLog = {
        id: 'log-1',
        taskId: 'task-1',
        steps: [
          { type: 'click', target: { selector: '#btn' }, timestamp: '2024-01-01' },
          { type: 'type', target: { text: 'hello' }, timestamp: '2024-01-01' },
          { type: 'navigate', target: { selector: 'url' }, timestamp: '2024-01-01' },
        ],
        recordedAt: '2024-01-01',
        source: 'browser',
      };
      const steps = generateFlowchart(log);
      expect(steps).toHaveLength(3);
      expect(steps[0].order).toBe(1);
      expect(steps[0].type).toBe('action');
      expect(steps[0].icon).toBeTruthy();
      expect(steps[0].description).toBeTruthy();
    });

    it('should handle empty steps', () => {
      const log: OperationLog = {
        id: 'log-2',
        taskId: 'task-2',
        steps: [],
        recordedAt: '2024-01-01',
        source: 'browser',
      };
      const steps = generateFlowchart(log);
      expect(steps).toHaveLength(0);
    });

    it('should assign correct order numbers', () => {
      const log: OperationLog = {
        id: 'log-3',
        taskId: 'task-3',
        steps: [
          { type: 'wait', target: {}, timestamp: '2024-01-01' },
          { type: 'screenshot', target: {}, timestamp: '2024-01-01' },
          { type: 'click', target: {}, timestamp: '2024-01-01' },
          { type: 'type', target: {}, timestamp: '2024-01-01' },
        ],
        recordedAt: '2024-01-01',
        source: 'desktop',
      };
      const steps = generateFlowchart(log);
      steps.forEach((s, i) => expect(s.order).toBe(i + 1));
    });

    it('should use Japanese descriptions', () => {
      const log: OperationLog = {
        id: 'log-4',
        taskId: 'task-4',
        steps: [
          { type: 'click', target: { text: 'ログイン' }, timestamp: '2024-01-01' },
        ],
        recordedAt: '2024-01-01',
        source: 'browser',
      };
      const steps = generateFlowchart(log);
      expect(steps[0].description).toMatch(/[\u3000-\u9FFF]/); // Contains Japanese characters
    });
  });
});
