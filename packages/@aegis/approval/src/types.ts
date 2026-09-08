// ─── Approval State ────────────────────────────────────────────────

export type ApprovalState = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'locked' | 'expired';

// ─── Risk Level ────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ─── Exception Handler ─────────────────────────────────────────────

export interface ExceptionHandler {
  condition: string;
  action: string;
  code: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// ─── Safety Check ──────────────────────────────────────────────────

export interface SafetyCheck {
  id: string;
  name: string;
  passed: boolean;
  message: string;
}

// ─── Approval Request ──────────────────────────────────────────────

export interface ApprovalRequest {
  id: string;
  taskId: string;
  code: string;
  explanation: string;
  exceptionHandlers: ExceptionHandler[];
  safetyChecks: SafetyCheck[];
  createdAt: number;
  expiresAt?: number;
  riskLevel: RiskLevel;
  state: ApprovalState;
}

// ─── Approval Decision ─────────────────────────────────────────────

export interface ApprovalDecision {
  requestId: string;
  decision: 'approved' | 'rejected';
  reason?: string;
  modifiedCode?: string;
  decidedAt: number;
  decidedBy: string;
}

// ─── Approved Program ──────────────────────────────────────────────

export interface ApprovedProgram {
  id: string;
  requestId: string;
  code: string;
  approvedAt: number;
  version: number;
  hash: string;
  locked: true;
}

// ─── Approval Audit Log ────────────────────────────────────────────

export interface ApprovalAuditLog {
  requestId: string;
  action: string;
  timestamp: number;
  details?: string;
}

// ─── Code Display ──────────────────────────────────────────────────

export type LineType = 'normal' | 'warning' | 'danger' | 'info';

export interface CodeLine {
  number: number;
  content: string;
  type: LineType;
}

export interface CodeHighlight {
  startLine: number;
  endLine: number;
  color: string;
  label: string;
}

export interface DisplayableCode {
  lines: CodeLine[];
  highlights: CodeHighlight[];
  summary: string;
}

// ─── Flowchart ─────────────────────────────────────────────────────

export type FlowchartStepType = 'action' | 'condition' | 'error';

export interface FlowchartStep {
  order: number;
  description: string;
  type: FlowchartStepType;
  icon: string;
}
