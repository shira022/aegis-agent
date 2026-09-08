import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HumanLoopEngine } from '../human-loop-engine';
import type { ErrorContext } from '../types';

describe('HumanLoopEngine', () => {
  let engine: HumanLoopEngine;

  beforeEach(() => {
    engine = new HumanLoopEngine();
  });

  describe('processError', () => {
    it('should return a handled result for skip action', async () => {
      const context: ErrorContext = {
        errorType: 'element_not_found',
        error: new Error('Button not found'),
        executionLogId: 'exec-001',
      };

      // Mock the intervention callback to skip
      engine.onIntervention(async (request) => {
        return {
          requestId: request.id,
          optionId: request.options.find(o => o.type === 'skip')!.id,
          decidedAt: new Date(),
          decidedBy: 'human',
        };
      });

      const result = await engine.processError(context);

      expect(result.handled).toBe(true);
      expect(result.action).toBe('skip');
      expect(result.learningApplied).toBe(false);
    });

    it('should return handled for retry action', async () => {
      const context: ErrorContext = {
        errorType: 'timeout',
        error: new Error('Request timed out'),
        executionLogId: 'exec-002',
      };

      engine.onIntervention(async (request) => ({
        requestId: request.id,
        optionId: request.options.find(o => o.type === 'retry')!.id,
        decidedAt: new Date(),
        decidedBy: 'human',
      }));

      const result = await engine.processError(context);

      expect(result.handled).toBe(true);
      expect(result.action).toBe('retry');
    });

    it('should return unhandled for abort action', async () => {
      const context: ErrorContext = {
        errorType: 'critical',
        error: new Error('System failure'),
        executionLogId: 'exec-003',
      };

      engine.onIntervention(async (request) => ({
        requestId: request.id,
        optionId: request.options.find(o => o.type === 'abort')!.id,
        decidedAt: new Date(),
        decidedBy: 'human',
      }));

      const result = await engine.processError(context);

      expect(result.handled).toBe(false);
      expect(result.action).toBe('abort');
    });

    it('should set learningApplied true for demonstrate action', async () => {
      const context: ErrorContext = {
        errorType: 'element_not_found',
        error: new Error('Moved element'),
        executionLogId: 'exec-004',
      };

      engine.onIntervention(async (request) => ({
        requestId: request.id,
        optionId: request.options.find(o => o.type === 'demonstrate')!.id,
        decidedAt: new Date(),
        decidedBy: 'human',
      }));

      const result = await engine.processError(context);

      expect(result.handled).toBe(true);
      expect(result.action).toBe('demonstrate');
      expect(result.learningApplied).toBe(true);
    });

    it('should handle fix_code action as learning-applied', async () => {
      const context: ErrorContext = {
        errorType: 'element_not_found',
        error: new Error('Wrong calculation'),
        executionLogId: 'exec-005',
      };

      engine.onIntervention(async (request) => ({
        requestId: request.id,
        optionId: request.options.find(o => o.type === 'fix_code')!.id,
        userInput: 'Use Math.round() instead of Math.floor()',
        decidedAt: new Date(),
        decidedBy: 'human',
      }));

      const result = await engine.processError(context);

      expect(result.handled).toBe(true);
      expect(result.action).toBe('fix_code');
      expect(result.learningApplied).toBe(true);
    });

    it('should track state transitions through the loop', async () => {
      const context: ErrorContext = {
        errorType: 'unknown',
        error: new Error('Something broke'),
        executionLogId: 'exec-006',
      };

      const stateTransitions: string[] = [];

      engine.onStateChange((state) => {
        stateTransitions.push(state);
      });

      engine.onIntervention(async (request) => ({
        requestId: request.id,
        optionId: request.options.find(o => o.type === 'skip')!.id,
        decidedAt: new Date(),
        decidedBy: 'human',
      }));

      await engine.processError(context);

      expect(stateTransitions).toContain('waiting_for_human');
      expect(stateTransitions).toContain('idle');
      expect(stateTransitions[0]).toBe('waiting_for_human');
    });
  });

  describe('getState', () => {
    it('should start in idle state', () => {
      expect(engine.getState()).toBe('idle');
    });
  });

  describe('getHistory', () => {
    it('should track processed errors', async () => {
      const context: ErrorContext = {
        errorType: 'unknown',
        error: new Error('E1'),
        executionLogId: 'exec-007',
      };

      engine.onIntervention(async (request) => ({
        requestId: request.id,
        optionId: request.options[0].id,
        decidedAt: new Date(),
        decidedBy: 'human',
      }));

      await engine.processError(context);

      const history = engine.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].executionLogId).toBe('exec-007');
    });
  });
});
