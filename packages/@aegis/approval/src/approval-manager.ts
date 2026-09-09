import { createHash } from 'crypto';
import { randomUUID } from 'crypto';
import { analyzeCode, calculateRiskLevel } from './safety-analyzer.js';
import type {
  ApprovalRequest,
  ApprovalDecision,
  ApprovedProgram,
  ApprovalAuditLog,
  ExceptionHandler,
} from './types.js';

// ─── ApprovalManager ───────────────────────────────────────────────

export class ApprovalManager {
  private requests: Map<string, ApprovalRequest> = new Map();
  private programs: Map<string, ApprovedProgram> = new Map();
  private auditLogs: Map<string, ApprovalAuditLog[]> = new Map();

  // ─── Create ──────────────────────────────────────────────────────

  createRequest(
    code: string,
    explanation: string,
    exceptionHandlers: ExceptionHandler[],
    expiresAt?: number,
  ): ApprovalRequest {
    const id = randomUUID();
    const safetyChecks = analyzeCode(code);
    const riskLevel = calculateRiskLevel(safetyChecks);

    const request: ApprovalRequest = {
      id,
      taskId: id, // taskId is the same as request id for standalone usage
      code,
      explanation,
      exceptionHandlers,
      safetyChecks,
      createdAt: Date.now(),
      expiresAt,
      riskLevel,
      state: 'pending',
    };

    this.requests.set(id, request);
    this.addLog(id, 'created', `Approval request created (risk: ${riskLevel})`);
    return request;
  }

  // ─── Approve ─────────────────────────────────────────────────────

  approve(requestId: string, decision: Omit<ApprovalDecision, 'requestId'> & { requestId: string }): ApprovedProgram {
    const request = this.getRequestOrThrow(requestId);

    if (request.state !== 'pending') {
      throw new Error(`Request ${requestId} is not in pending state (current: ${request.state})`);
    }

    const code = decision.modifiedCode ?? request.code;
    const hash = computeHash(code);
    const program: ApprovedProgram = {
      id: randomUUID(),
      requestId,
      code,
      approvedAt: Date.now(),
      version: 1,
      hash,
      locked: true as const,
    };

    request.state = 'approved';
    this.programs.set(program.id, program);
    this.addLog(requestId, 'approved', `Approved (by: ${decision.decidedBy})`);
    return program;
  }

  // ─── Reject ──────────────────────────────────────────────────────

  reject(requestId: string, reason: string, decidedBy: string): ApprovalDecision {
    const request = this.getRequestOrThrow(requestId);

    if (request.state !== 'pending') {
      throw new Error(`Request ${requestId} is not in pending state (current: ${request.state})`);
    }

    request.state = 'rejected';
    const decision: ApprovalDecision = {
      requestId,
      decision: 'rejected',
      reason,
      decidedAt: Date.now(),
      decidedBy,
    };

    this.addLog(requestId, 'rejected', `Rejected: ${reason} (by: ${decidedBy})`);
    return decision;
  }

  // ─── Revoke ──────────────────────────────────────────────────────

  revokeApproval(requestId: string, reason: string): void {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    request.state = 'rejected';
    this.addLog(requestId, 'revoked', `Approval revoked: ${reason}`);
  }

  // ─── Query ───────────────────────────────────────────────────────

  getRequest(requestId: string): ApprovalRequest | null {
    return this.requests.get(requestId) ?? null;
  }

  getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.state === 'pending');
  }

  getApprovalHistory(taskId: string): ApprovalAuditLog[] {
    return this.auditLogs.get(taskId) ?? [];
  }

  // ─── Integrity ───────────────────────────────────────────────────

  validateIntegrity(program: ApprovedProgram): boolean {
    const expectedHash = computeHash(program.code);
    return program.hash === expectedHash;
  }

  // ─── Private ─────────────────────────────────────────────────────

  private getRequestOrThrow(requestId: string): ApprovalRequest {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }
    return request;
  }

  private addLog(requestId: string, action: string, details?: string): void {
    const logs = this.auditLogs.get(requestId) ?? [];
    logs.push({
      requestId,
      action,
      timestamp: Date.now(),
      details,
    });
    this.auditLogs.set(requestId, logs);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

function computeHash(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}
