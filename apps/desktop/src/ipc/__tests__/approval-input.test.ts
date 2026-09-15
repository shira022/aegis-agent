import { describe, it, expect } from 'vitest';
import type { ApprovalRequest } from '@aegis/approval';
import type { NewApprovalInput } from '../types';

function toNewApprovalInput(request: ApprovalRequest): NewApprovalInput {
  const input: NewApprovalInput = {
    taskId: request.taskId,
    code: request.code,
    explanation: request.explanation,
    exceptionHandlers: request.exceptionHandlers,
    safetyChecks: request.safetyChecks,
    expiresAt: request.expiresAt,
    riskLevel: request.riskLevel,
  };
  return input;
}

function toRequestFields(
  input: NewApprovalInput,
): Omit<ApprovalRequest, 'id' | 'createdAt' | 'state'> {
  return { ...input, taskId: input.taskId ?? '' };
}

describe('NewApprovalInput type contract', () => {
  it('stays in sync with ApprovalRequest minus server-owned fields', () => {
    const request: ApprovalRequest = {
      id: 'req-1',
      taskId: 'task-1',
      code: 'print("hi")',
      explanation: 'demo',
      exceptionHandlers: [],
      safetyChecks: [],
      createdAt: 1,
      riskLevel: 'low',
      state: 'pending',
    };

    const input = toNewApprovalInput(request);
    expect(input).toEqual({
      taskId: 'task-1',
      code: 'print("hi")',
      explanation: 'demo',
      exceptionHandlers: [],
      safetyChecks: [],
      riskLevel: 'low',
    });

    const fields = toRequestFields({
      code: 'x',
      explanation: 'y',
      exceptionHandlers: [],
      safetyChecks: [],
      riskLevel: 'low',
    });
    expect(fields.taskId).toBe('');
  });
});
