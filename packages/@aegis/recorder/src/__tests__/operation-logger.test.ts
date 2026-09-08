import { describe, it, expect, beforeEach } from 'vitest';
import { OperationLogger } from '../operation-logger';
import type { RecordedAction, ActionType } from '../types';

describe('OperationLogger', () => {
  let logger: OperationLogger;

  beforeEach(() => {
    logger = new OperationLogger('test-session-123');
  });

  describe('logAction', () => {
    it('should log a click action', () => {
      const action: RecordedAction = {
        id: 'action-1',
        type: 'click',
        timestamp: Date.now(),
        selector: { ariaLabel: 'Submit' },
        metadata: {},
      };

      logger.logAction(action);
      const actions = logger.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('click');
    });

    it('should log a type action with value', () => {
      const action: RecordedAction = {
        id: 'action-2',
        type: 'type',
        timestamp: Date.now(),
        selector: { placeholder: 'Email' },
        metadata: { value: 'test@example.com' },
      };

      logger.logAction(action);
      const actions = logger.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].metadata.value).toBe('test@example.com');
    });

    it('should maintain action order', () => {
      const action1: RecordedAction = {
        id: 'action-1',
        type: 'click',
        timestamp: 1000,
        selector: {},
        metadata: {},
      };

      const action2: RecordedAction = {
        id: 'action-2',
        type: 'type',
        timestamp: 2000,
        selector: {},
        metadata: {},
      };

      logger.logAction(action1);
      logger.logAction(action2);
      const actions = logger.getActions();
      expect(actions[0].id).toBe('action-1');
      expect(actions[1].id).toBe('action-2');
    });
  });

  describe('getActions', () => {
    it('should return empty array when no actions logged', () => {
      const actions = logger.getActions();
      expect(actions).toEqual([]);
    });

    it('should return all logged actions', () => {
      const action: RecordedAction = {
        id: 'action-1',
        type: 'navigate',
        timestamp: Date.now(),
        selector: {},
        metadata: { url: 'https://example.com' },
      };

      logger.logAction(action);
      const actions = logger.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].metadata.url).toBe('https://example.com');
    });
  });

  describe('getDuration', () => {
    it('should return 0 when no actions', () => {
      const duration = logger.getDuration();
      expect(duration).toBe(0);
    });

    it('should calculate duration between first and last action', () => {
      const action1: RecordedAction = {
        id: 'action-1',
        type: 'click',
        timestamp: 1000,
        selector: {},
        metadata: {},
      };

      const action2: RecordedAction = {
        id: 'action-2',
        type: 'click',
        timestamp: 5000,
        selector: {},
        metadata: {},
      };

      logger.logAction(action1);
      logger.logAction(action2);
      const duration = logger.getDuration();
      expect(duration).toBe(4000);
    });
  });

  describe('getActionCount', () => {
    it('should return 0 when no actions', () => {
      expect(logger.getActionCount()).toBe(0);
    });

    it('should return correct count', () => {
      const action1: RecordedAction = {
        id: 'action-1',
        type: 'click',
        timestamp: Date.now(),
        selector: {},
        metadata: {},
      };

      const action2: RecordedAction = {
        id: 'action-2',
        type: 'type',
        timestamp: Date.now(),
        selector: {},
        metadata: {},
      };

      logger.logAction(action1);
      logger.logAction(action2);
      expect(logger.getActionCount()).toBe(2);
    });
  });

  describe('getSessionSummary', () => {
    it('should return summary with correct total actions', () => {
      const action: RecordedAction = {
        id: 'action-1',
        type: 'click',
        timestamp: Date.now(),
        selector: {},
        metadata: {},
      };

      logger.logAction(action);
      const summary = logger.getSessionSummary();
      expect(summary.totalActions).toBe(1);
    });

    it('should count action types correctly', () => {
      const clickAction: RecordedAction = {
        id: 'action-1',
        type: 'click',
        timestamp: Date.now(),
        selector: {},
        metadata: {},
      };

      const typeAction: RecordedAction = {
        id: 'action-2',
        type: 'type',
        timestamp: Date.now(),
        selector: {},
        metadata: {},
      };

      logger.logAction(clickAction);
      logger.logAction(typeAction);
      const summary = logger.getSessionSummary();
      expect(summary.actionTypes.click).toBe(1);
      expect(summary.actionTypes.type).toBe(1);
    });

    it('should include unique URLs', () => {
      const nav1: RecordedAction = {
        id: 'action-1',
        type: 'navigate',
        timestamp: Date.now(),
        selector: {},
        metadata: { url: 'https://example.com' },
      };

      const nav2: RecordedAction = {
        id: 'action-2',
        type: 'navigate',
        timestamp: Date.now(),
        selector: {},
        metadata: { url: 'https://example.com' },
      };

      logger.logAction(nav1);
      logger.logAction(nav2);
      const summary = logger.getSessionSummary();
      expect(summary.urls).toHaveLength(1);
      expect(summary.urls[0]).toBe('https://example.com');
    });
  });

  describe('exportLog', () => {
    it('should export log with session id', () => {
      const action: RecordedAction = {
        id: 'action-1',
        type: 'click',
        timestamp: Date.now(),
        selector: {},
        metadata: {},
      };

      logger.logAction(action);
      const log = logger.exportLog();
      expect(log.id).toBe('test-session-123');
      expect(log.steps).toHaveLength(1);
    });
  });

  describe('filterSensitiveData', () => {
    it('should mask email addresses', () => {
      const action: RecordedAction = {
        id: 'action-1',
        type: 'type',
        timestamp: Date.now(),
        selector: { placeholder: 'Email' },
        metadata: { value: 'john@example.com' },
      };

      logger.logAction(action);
      const filtered = logger.filterSensitiveData();
      expect(filtered.steps[0].target.screenshot).toBeUndefined();
      expect(filtered.steps[0].target.text).toBe('Email');
    });

    it('should mask phone numbers', () => {
      const action: RecordedAction = {
        id: 'action-1',
        type: 'type',
        timestamp: Date.now(),
        selector: { placeholder: 'Phone' },
        metadata: { value: '555-123-4567' },
      };

      logger.logAction(action);
      const filtered = logger.filterSensitiveData();
      expect(filtered.steps[0].target.text).toBe('Phone');
    });
  });
});
