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
    this.addLog(id, 'created', `承認リクエストを作成しました (リスク: ${riskLevel})`);
    return request;
  }

  // ─── Approve ─────────────────────────────────────────────────────

  approve(requestId: string, decision: Omit<ApprovalDecision, 'requestId'> & { requestId: string }): ApprovedProgram {
    const request = this.getRequestOrThrow(requestId);

    if (request.state !== 'pending') {
      throw new Error(`リクエスト ${requestId} は pending 状態ではありません (現在: ${request.state})`);
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
    this.addLog(requestId, 'approved', `承認しました (by: ${decision.decidedBy})`);
    return program;
  }

  // ─── Reject ──────────────────────────────────────────────────────

  reject(requestId: string, reason: string, decidedBy: string): ApprovalDecision {
    const request = this.getRequestOrThrow(requestId);

    if (request.state !== 'pending') {
      throw new Error(`リクエスト ${requestId} は pending 状態ではありません (現在: ${request.state})`);
    }

    request.state = 'rejected';
    const decision: ApprovalDecision = {
      requestId,
      decision: 'rejected',
      reason,
      decidedAt: Date.now(),
      decidedBy,
    };

    this.addLog(requestId, 'rejected', `拒否しました: ${reason} (by: ${decidedBy})`);
    return decision;
  }

  // ─── Revoke ──────────────────────────────────────────────────────

  revokeApproval(requestId: string, reason: string): void {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`リクエスト ${requestId} が見つかりません`);
    }

    request.state = 'rejected';
    this.addLog(requestId, 'revoked', `承認を取り消しました: ${reason}`);
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
      throw new Error(`リクエスト ${requestId} が見つかりません`);
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
