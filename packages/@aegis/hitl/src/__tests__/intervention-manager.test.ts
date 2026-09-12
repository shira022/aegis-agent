import { describe, it, expect, beforeEach } from 'vitest';
import { InterventionManager } from '../intervention-manager';
import type { ErrorContext, InterventionDecision } from '../types';

describe('InterventionManager', () => {
  let manager: InterventionManager;

  beforeEach(() => {
    manager = new InterventionManager();
  });

  describe('handleInterruption', () => {
    it('should create an intervention request from error context', async () => {
      const context: ErrorContext = {
        errorType: 'element_not_found',
        error: new Error('Button not found'),
        executionLogId: 'exec-001',
      };

      const request = await manager.handleInterruption(context);

      expect(request).toBeDefined();
      expect(request.id).toBeDefined();
      expect(request.executionLogId).toBe('exec-001');
      expect(request.error.message).toBe('Button not found');
      expect(request.options.length).toBeGreaterThan(0);
      expect(request.createdAt).toBeInstanceOf(Date);
    });

    it('should generate default intervention options for unknown errors', async () => {
      const context: ErrorContext = {
        errorType: 'unknown',
        error: new Error('Something went wrong'),
        executionLogId: 'exec-002',
      };

      const request = await manager.handleInterruption(context);

      expect(request.options.length).toBeGreaterThanOrEqual(3);
      const types = request.options.map(o => o.type);
      expect(types).toContain('skip');
      expect(types).toContain('retry');
      expect(types).toContain('abort');
    });

    it('should include demonstrate option for recoverable errors', async () => {
      const context: ErrorContext = {
        errorType: 'element_not_found',
        error: new Error('Button moved'),
        executionLogId: 'exec-003',
      };

      const request = await manager.handleInterruption(context);
      const types = request.options.map(o => o.type);
      expect(types).toContain('demonstrate');
    });

    it('should set timeout if provided in context', async () => {
      const context: ErrorContext = {
        errorType: 'timeout',
        error: new Error('Timed out'),
        executionLogId: 'exec-004',
        metadata: { timeoutMs: 30000 },
      };

      const request = await manager.handleInterruption(context);

      expect(request.timeoutMs).toBe(30000);
    });

    it('should generate unique IDs for each request', async () => {
      const context1: ErrorContext = {
        errorType: 'unknown',
        error: new Error('Error 1'),
        executionLogId: 'exec-005',
      };
      const context2: ErrorContext = {
        errorType: 'unknown',
        error: new Error('Error 2'),
        executionLogId: 'exec-006',
      };

      const req1 = await manager.handleInterruption(context1);
      const req2 = await manager.handleInterruption(context2);

      expect(req1.id).not.toBe(req2.id);
    });
  });

  describe('presentOptions', () => {
    it('should return the request with formatted options', async () => {
      const context: ErrorContext = {
        errorType: 'element_not_found',
        error: new Error('Not found'),
        executionLogId: 'exec-007',
      };

      const request = await manager.handleInterruption(context);
      const presented = manager.presentOptions(request);

      expect(presented.request).toBe(request);
      expect(presented.formattedOptions).toBeDefined();
      expect(presented.formattedOptions.length).toBe(request.options.length);
    });

    it('should include label and risk level in formatted output', async () => {
      const context: ErrorContext = {
        errorType: 'unknown',
        error: new Error('Error'),
        executionLogId: 'exec-008',
      };

      const request = await manager.handleInterruption(context);
      const presented = manager.presentOptions(request);

      for (const opt of presented.formattedOptions) {
        expect(opt.label).toBeDefined();
        expect(opt.riskLevel).toBeDefined();
      }
    });
  });

  describe('recordDecision', () => {
    it('should record a human decision for a request', async () => {
      const context: ErrorContext = {
        errorType: 'element_not_found',
        error: new Error('Not found'),
        executionLogId: 'exec-009',
      };

      const request = await manager.handleInterruption(context);
      const decision: InterventionDecision = {
        requestId: request.id,
        optionId: request.options[0].id,
        decidedAt: new Date(),
        decidedBy: 'human',
      };

      const recorded = manager.recordDecision(decision);

      expect(recorded).toBe(true);
    });

    it('should reject decision for non-existent request', () => {
      const decision: InterventionDecision = {
        requestId: 'non-existent',
        optionId: 'opt-1',
        decidedAt: new Date(),
        decidedBy: 'human',
      };

      const recorded = manager.recordDecision(decision);

      expect(recorded).toBe(false);
    });

    it('should store user input when provided', async () => {
      const context: ErrorContext = {
        errorType: 'element_not_found',
        error: new Error('Not found'),
        executionLogId: 'exec-010',
      };

      const request = await manager.handleInterruption(context);
      const decision: InterventionDecision = {
        requestId: request.id,
        optionId: request.options.find(o => o.type === 'fix_code')?.id ?? request.options[0].id,
        userInput: 'Use the backup selector',
        decidedAt: new Date(),
        decidedBy: 'human',
      };

      manager.recordDecision(decision);

      const pending = manager.getPendingInterventions();
      const found = pending.find(p => p.id === request.id);
      expect(found).toBeUndefined(); // Should no longer be pending
    });
  });

  describe('getPendingInterventions', () => {
    it('should return empty array when no interventions are pending', () => {
      const pending = manager.getPendingInterventions();
      expect(pending).toEqual([]);
    });

    it('should return all pending interventions', async () => {
      const ctx1: ErrorContext = {
        errorType: 'unknown',
        error: new Error('E1'),
        executionLogId: 'exec-011',
      };
      const ctx2: ErrorContext = {
        errorType: 'unknown',
        error: new Error('E2'),
        executionLogId: 'exec-012',
      };

      await manager.handleInterruption(ctx1);
      await manager.handleInterruption(ctx2);

      const pending = manager.getPendingInterventions();
      expect(pending.length).toBe(2);
    });

    it('should remove resolved interventions from pending list', async () => {
      const context: ErrorContext = {
        errorType: 'unknown',
        error: new Error('Error'),
        executionLogId: 'exec-013',
      };

      const request = await manager.handleInterruption(context);

      manager.recordDecision({
        requestId: request.id,
        optionId: request.options[0].id,
        decidedAt: new Date(),
        decidedBy: 'human',
      });

      const pending = manager.getPendingInterventions();
      expect(pending.length).toBe(0);
    });
  });
});
