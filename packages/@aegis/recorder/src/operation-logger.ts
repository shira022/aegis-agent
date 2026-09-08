import type { RecordedAction, ActionType, SessionSummary } from './types';
import type { OperationLog, OperationStep, StepType } from '@aegis/shared';

/**
 * OperationLogger tracks recorded actions and provides export/filtering capabilities
 */
export class OperationLogger {
  private sessionId: string;
  private actions: RecordedAction[];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.actions = [];
  }

  /**
   * Log a recorded action
   */
  logAction(action: RecordedAction): void {
    this.actions.push(action);
  }

  /**
   * Get all logged actions
   */
  getActions(): RecordedAction[] {
    return [...this.actions];
  }

  /**
   * Calculate duration between first and last action
   */
  getDuration(): number {
    if (this.actions.length < 2) {
      return 0;
    }

    const timestamps = this.actions.map(a => a.timestamp);
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    return max - min;
  }

  /**
   * Get total action count
   */
  getActionCount(): number {
    return this.actions.length;
  }

  /**
   * Get session summary with statistics
   */
  getSessionSummary(): SessionSummary {
    const actionTypes: Record<ActionType, number> = {
      click: 0,
      type: 0,
      scroll: 0,
      navigate: 0,
      wait: 0,
      screenshot: 0,
      keypress: 0,
      select: 0,
      hover: 0,
      drag: 0,
    };

    const urlsSet = new Set<string>();

    for (const action of this.actions) {
      actionTypes[action.type]++;

      if (action.metadata.url) {
        urlsSet.add(action.metadata.url);
      }
    }

    return {
      totalActions: this.actions.length,
      actionTypes,
      duration: this.getDuration(),
      urls: Array.from(urlsSet),
    };
  }

  /**
   * Export log in @aegis/shared format
   */
  exportLog(): OperationLog {
    const steps: OperationStep[] = this.actions.map(action => ({
      type: this.mapActionTypeToStepType(action.type),
      target: {
        text: action.selector.text || action.selector.ariaLabel || action.selector.placeholder,
        selector: action.selector.cssSelector || action.selector.xpath,
        screenshot: action.screenshot,
      },
      timestamp: new Date(action.timestamp).toISOString(),
    }));

    return {
      id: this.sessionId,
      taskId: this.sessionId,
      steps,
      recordedAt: new Date().toISOString(),
      source: 'browser',
    };
  }

  /**
   * Filter sensitive data from exported log
   */
  filterSensitiveData(): OperationLog {
    const log = this.exportLog();

    // Mask sensitive data in steps
    log.steps = log.steps.map(step => ({
      ...step,
      target: {
        ...step.target,
        // Remove screenshots that might contain sensitive info
        screenshot: undefined,
      },
    }));

    return log;
  }

  /**
   * Map ActionType to StepType for @aegis/shared compatibility
   */
  private mapActionTypeToStepType(type: ActionType): StepType {
    const mapping: Record<ActionType, StepType> = {
      click: 'click',
      type: 'type',
      navigate: 'navigate',
      wait: 'wait',
      screenshot: 'screenshot',
      scroll: 'click', // Map scroll to click as fallback
      keypress: 'type', // Map keypress to type as fallback
      select: 'click', // Map select to click as fallback
      hover: 'click', // Map hover to click as fallback
      drag: 'click', // Map drag to click as fallback
    };

    return mapping[type] || 'click';
  }
}
