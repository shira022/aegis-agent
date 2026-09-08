import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalManager } from '../approval-manager.js';

describe('ApprovalManager', () => {
  let manager: ApprovalManager;

  beforeEach(() => {
    manager = new ApprovalManager();
  });

  describe('createRequest', () => {
    it('should create an approval request', () => {
      const req = manager.createRequest(
        'console.log("hello")',
        'Simple log test',
        [],
      );
      expect(req.id).toBeTruthy();
      expect(req.code).toBe('console.log("hello")');
      expect(req.explanation).toBe('Simple log test');
      expect(req.state).toBe('pending');
      expect(req.safetyChecks.length).toBeGreaterThanOrEqual(1);
      expect(req.riskLevel).toBeTruthy();
      expect(req.createdAt).toBeGreaterThan(0);
    });

    it('should assign unique IDs', () => {
      const r1 = manager.createRequest('a', 'a', []);
      const r2 = manager.createRequest('b', 'b', []);
      expect(r1.id).not.toBe(r2.id);
    });

    it('should set expiration if expiresAt is provided', () => {
      const expires = Date.now() + 60000;
      const req = manager.createRequest('code', 'exp', [], expires);
      expect(req.expiresAt).toBe(expires);
    });
  });

  describe('getRequest / getPendingRequests', () => {
    it('should retrieve request by ID', () => {
      const req = manager.createRequest('code', 'test', []);
      const found = manager.getRequest(req.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(req.id);
    });

    it('should return null for unknown ID', () => {
      expect(manager.getRequest('nonexistent')).toBeNull();
    });

    it('should list pending requests', () => {
      manager.createRequest('a', 'a', []);
      manager.createRequest('b', 'b', []);
      expect(manager.getPendingRequests()).toHaveLength(2);
    });

    it('should exclude non-pending requests from pending list', () => {
      const req = manager.createRequest('a', 'a', []);
      manager.approve(req.id, { requestId: req.id, decision: 'approved', decidedAt: Date.now(), decidedBy: 'user' });
      expect(manager.getPendingRequests()).toHaveLength(0);
    });
  });

  describe('approve', () => {
    it('should approve a pending request and return ApprovedProgram', () => {
      const req = manager.createRequest('console.log("hi")', 'test', []);
      const decision = manager.approve(req.id, {
        requestId: req.id,
        decision: 'approved',
        decidedAt: Date.now(),
        decidedBy: 'reviewer',
      });
      expect(decision).not.toBeNull();
      expect(decision.id).toBeTruthy();
      expect(decision.requestId).toBe(req.id);
      expect(decision.code).toBe('console.log("hi")');
      expect(decision.locked).toBe(true);
      expect(decision.hash).toBeTruthy();
      expect(decision.version).toBe(1);
      expect(decision.approvedAt).toBeGreaterThan(0);
    });

    it('should throw if request is not pending', () => {
      const req = manager.createRequest('code', 'test', []);
      manager.approve(req.id, { requestId: req.id, decision: 'approved', decidedAt: Date.now(), decidedBy: 'u' });
      expect(() =>
        manager.approve(req.id, { requestId: req.id, decision: 'approved', decidedAt: Date.now(), decidedBy: 'u' }),
      ).toThrow();
    });

    it('should use modifiedCode when provided', () => {
      const req = manager.createRequest('bad code', 'fix', []);
      const program = manager.approve(req.id, {
        requestId: req.id,
        decision: 'approved',
        modifiedCode: 'safe code',
        decidedAt: Date.now(),
        decidedBy: 'reviewer',
      });
      expect(program.code).toBe('safe code');
    });

    it('should remove from pending after approval', () => {
      const req = manager.createRequest('code', 'test', []);
      manager.approve(req.id, { requestId: req.id, decision: 'approved', decidedAt: Date.now(), decidedBy: 'u' });
      expect(manager.getPendingRequests()).toHaveLength(0);
    });
  });

  describe('reject', () => {
    it('should reject a pending request', () => {
      const req = manager.createRequest('code', 'test', []);
      const decision = manager.reject(req.id, 'unsafe code', 'reviewer');
      expect(decision.requestId).toBe(req.id);
      expect(decision.decision).toBe('rejected');
      expect(decision.reason).toBe('unsafe code');
      expect(decision.decidedBy).toBe('reviewer');
    });

    it('should throw if request is not pending', () => {
      const req = manager.createRequest('code', 'test', []);
      manager.reject(req.id, 'no', 'u');
      expect(() => manager.reject(req.id, 'no', 'u')).toThrow();
    });
  });

  describe('revokeApproval', () => {
    it('should revoke an approved program', () => {
      const req = manager.createRequest('code', 'test', []);
      manager.approve(req.id, { requestId: req.id, decision: 'approved', decidedAt: Date.now(), decidedBy: 'u' });
      manager.revokeApproval(req.id, 'found bug');
      const found = manager.getRequest(req.id);
      expect(found).not.toBeNull();
      expect(found!.state).toBe('rejected');
    });

    it('should throw for non-existent request', () => {
      expect(() => manager.revokeApproval('nope', 'reason')).toThrow();
    });
  });

  describe('validateIntegrity', () => {
    it('should return true for an unmodified program', () => {
      const req = manager.createRequest('code', 'test', []);
      const program = manager.approve(req.id, { requestId: req.id, decision: 'approved', decidedAt: Date.now(), decidedBy: 'u' });
      expect(manager.validateIntegrity(program)).toBe(true);
    });

    it('should return false for tampered program', () => {
      const req = manager.createRequest('code', 'test', []);
      const program = manager.approve(req.id, { requestId: req.id, decision: 'approved', decidedAt: Date.now(), decidedBy: 'u' });
      const tampered = { ...program, code: 'HACKED' };
      expect(manager.validateIntegrity(tampered)).toBe(false);
    });
  });

  describe('getApprovalHistory', () => {
    it('should record audit logs', () => {
      const req = manager.createRequest('code', 'test', []);
      manager.approve(req.id, { requestId: req.id, decision: 'approved', decidedAt: Date.now(), decidedBy: 'u' });
      const logs = manager.getApprovalHistory(req.id);
      expect(logs.length).toBeGreaterThanOrEqual(2); // created + approved
      expect(logs[0].action).toBe('created');
      expect(logs.some((l) => l.action === 'approved')).toBe(true);
    });

    it('should record rejection in audit log', () => {
      const req = manager.createRequest('code', 'test', []);
      manager.reject(req.id, 'bad', 'u');
      const logs = manager.getApprovalHistory(req.id);
      expect(logs.some((l) => l.action === 'rejected')).toBe(true);
    });

    it('should record revocation in audit log', () => {
      const req = manager.createRequest('code', 'test', []);
      manager.approve(req.id, { requestId: req.id, decision: 'approved', decidedAt: Date.now(), decidedBy: 'u' });
      manager.revokeApproval(req.id, 'oops');
      const logs = manager.getApprovalHistory(req.id);
      expect(logs.some((l) => l.action === 'revoked')).toBe(true);
    });
  });
});
