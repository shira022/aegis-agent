import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OperationLogger } from '../operation-logger';
import { resolveSelector, generateStableSelector, rankSelector } from '../selector-resolver';
import { ScreenshotManager } from '../screenshot-manager';
import type { RecordingSession, RecordedAction, SessionMetadata } from '../types';

describe('Recorder Integration', () => {
  let logger: OperationLogger;
  let screenshotManager: ScreenshotManager;

  beforeEach(() => {
    logger = new OperationLogger('integration-session-001');
    screenshotManager = new ScreenshotManager();
  });

  it('should record a complete click action with screenshot', async () => {
    const element = {
      tagName: 'BUTTON',
      ariaLabel: 'Submit',
      textContent: 'Submit',
      className: 'btn btn-primary',
      getAttribute: (attr: string) => attr === 'aria-label' ? 'Submit' : null,
    } as any;

    const selector = resolveSelector(element);
    const screenshot = await screenshotManager.captureScreen();

    const action: RecordedAction = {
      id: 'action-1',
      type: 'click',
      timestamp: Date.now(),
      selector,
      metadata: {},
      screenshot,
    };

    logger.logAction(action);
    const actions = logger.getActions();

    expect(actions).toHaveLength(1);
    expect(actions[0].selector.ariaLabel).toBe('Submit');
    expect(actions[0].screenshot).toBeTruthy();
  });

  it('should record a type action with value', async () => {
    const element = {
      tagName: 'INPUT',
      placeholder: 'Email',
      type: 'email',
      getAttribute: (attr: string) => attr === 'placeholder' ? 'Email' : null,
    } as any;

    const selector = resolveSelector(element);

    const action: RecordedAction = {
      id: 'action-1',
      type: 'type',
      timestamp: Date.now(),
      selector,
      metadata: { value: 'test@example.com' },
    };

    logger.logAction(action);
    const actions = logger.getActions();

    expect(actions).toHaveLength(1);
    expect(actions[0].metadata.value).toBe('test@example.com');
  });

  it('should rank selectors for stability', () => {
    const element = {
      tagName: 'BUTTON',
      ariaLabel: 'Submit',
      textContent: 'Submit',
      getAttribute: (attr: string) => attr === 'aria-label' ? 'Submit' : null,
    } as any;

    const stableSelector = generateStableSelector(element);
    const rank = rankSelector(stableSelector);

    expect(rank).toBeGreaterThan(0);
    expect(stableSelector).toHaveProperty('ariaLabel');
  });

  it('should handle full recording flow with multiple actions', async () => {
    // Action 1: Navigate
    const navAction: RecordedAction = {
      id: 'action-1',
      type: 'navigate',
      timestamp: Date.now(),
      selector: {},
      metadata: { url: 'https://example.com' },
    };

    // Action 2: Click
    const element = {
      tagName: 'BUTTON',
      ariaLabel: 'Login',
      getAttribute: (attr: string) => attr === 'aria-label' ? 'Login' : null,
    } as any;

    const clickAction: RecordedAction = {
      id: 'action-2',
      type: 'click',
      timestamp: Date.now() + 1000,
      selector: resolveSelector(element),
      metadata: {},
    };

    // Action 3: Type
    const typeAction: RecordedAction = {
      id: 'action-3',
      type: 'type',
      timestamp: Date.now() + 2000,
      selector: { placeholder: 'Username' },
      metadata: { value: 'admin' },
    };

    logger.logAction(navAction);
    logger.logAction(clickAction);
    logger.logAction(typeAction);

    const summary = logger.getSessionSummary();
    expect(summary.totalActions).toBe(3);
    expect(summary.actionTypes.navigate).toBe(1);
    expect(summary.actionTypes.click).toBe(1);
    expect(summary.actionTypes.type).toBe(1);
    expect(summary.urls).toContain('https://example.com');
  });

  it('should calculate session duration correctly', () => {
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

  it('should export log in correct format', () => {
    const action: RecordedAction = {
      id: 'action-1',
      type: 'click',
      timestamp: Date.now(),
      selector: { ariaLabel: 'Button' },
      metadata: {},
    };

    logger.logAction(action);
    const log = logger.exportLog();

    expect(log).toHaveProperty('id');
    expect(log).toHaveProperty('taskId');
    expect(log).toHaveProperty('steps');
    expect(log).toHaveProperty('recordedAt');
    expect(log).toHaveProperty('source');
    expect(log.id).toBe('integration-session-001');
  });

  it('should filter sensitive data from exported log', () => {
    const action: RecordedAction = {
      id: 'action-1',
      type: 'type',
      timestamp: Date.now(),
      selector: { placeholder: 'Email' },
      metadata: { value: 'secret-password-123' },
    };

    logger.logAction(action);
    const filtered = logger.filterSensitiveData();

    expect(filtered.steps[0].target.text).toBe('Email');
  });

  it('should capture screenshots for visual verification', async () => {
    const screenshot = await screenshotManager.captureScreen();
    expect(screenshot).toBeTruthy();
    expect(typeof screenshot).toBe('string');
  });

  it('should detect screenshot differences', () => {
    const before = 'base64-before-data';
    const after = 'base64-after-data';
    const result = screenshotManager.diffScreenshots(before, after);

    expect(result).toHaveProperty('changed');
    expect(result).toHaveProperty('regions');
    expect(typeof result.changed).toBe('boolean');
  });

  it('should compress screenshots for storage', () => {
    const original = 'aGVsbG8gd29ybGQ=';
    const compressed = screenshotManager.compressImage(original, 0.5);

    expect(compressed).toBeTruthy();
    expect(typeof compressed).toBe('string');
  });
});
