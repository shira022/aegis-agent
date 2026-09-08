import { describe, it, expectTypeOf } from 'vitest';
import type {
  Task,
  TaskStatus,
  OperationLog,
  OperationStep,
  StepType,
  OperationSource,
  ApprovalStatus,
  ApprovalStatusValue,
  DependencyCheck,
  DependencyStatus,
  StepTarget,
} from '../types';

// ─── Task ───────────────────────────────────────────────────────────

describe('Task', () => {
  it('has all required fields', () => {
    expectTypeOf<Task>().toHaveProperty('id');
    expectTypeOf<Task>().toHaveProperty('name');
    expectTypeOf<Task>().toHaveProperty('status');
    expectTypeOf<Task>().toHaveProperty('scriptPath');
    expectTypeOf<Task>().toHaveProperty('createdAt');
    expectTypeOf<Task>().toHaveProperty('updatedAt');
  });

  it('id is string', () => {
    expectTypeOf<Task['id']>().toBeString();
  });

  it('name is string', () => {
    expectTypeOf<Task['name']>().toBeString();
  });

  it('status is TaskStatus', () => {
    expectTypeOf<Task['status']>().toEqualTypeOf<TaskStatus>();
  });

  it('scriptPath is string', () => {
    expectTypeOf<Task['scriptPath']>().toBeString();
  });

  it('createdAt is string', () => {
    expectTypeOf<Task['createdAt']>().toBeString();
  });

  it('updatedAt is string', () => {
    expectTypeOf<Task['updatedAt']>().toBeString();
  });
});

describe('TaskStatus', () => {
  it('is a union of literal strings', () => {
    expectTypeOf<TaskStatus>().toEqualTypeOf<
      'idle' | 'running' | 'completed' | 'failed' | 'paused'
    >();
  });
});

// ─── OperationStep ──────────────────────────────────────────────────

describe('StepType', () => {
  it('is a union of literal strings', () => {
    expectTypeOf<StepType>().toEqualTypeOf<
      'click' | 'type' | 'navigate' | 'wait' | 'screenshot'
    >();
  });
});

describe('StepTarget', () => {
  it('has optional selector', () => {
    expectTypeOf<StepTarget>().toHaveProperty('selector');
    expectTypeOf<StepTarget['selector']>().toEqualTypeOf<string | undefined>();
  });

  it('has optional text', () => {
    expectTypeOf<StepTarget>().toHaveProperty('text');
    expectTypeOf<StepTarget['text']>().toEqualTypeOf<string | undefined>();
  });

  it('has optional screenshot', () => {
    expectTypeOf<StepTarget>().toHaveProperty('screenshot');
    expectTypeOf<StepTarget['screenshot']>().toEqualTypeOf<string | undefined>();
  });
});

describe('OperationStep', () => {
  it('has all required fields', () => {
    expectTypeOf<OperationStep>().toHaveProperty('type');
    expectTypeOf<OperationStep>().toHaveProperty('target');
    expectTypeOf<OperationStep>().toHaveProperty('timestamp');
  });

  it('type is StepType', () => {
    expectTypeOf<OperationStep['type']>().toEqualTypeOf<StepType>();
  });

  it('target is StepTarget', () => {
    expectTypeOf<OperationStep['target']>().toEqualTypeOf<StepTarget>();
  });

  it('timestamp is string', () => {
    expectTypeOf<OperationStep['timestamp']>().toBeString();
  });
});

// ─── OperationLog ───────────────────────────────────────────────────

describe('OperationSource', () => {
  it('is a union of literal strings', () => {
    expectTypeOf<OperationSource>().toEqualTypeOf<'browser' | 'desktop'>();
  });
});

describe('OperationLog', () => {
  it('has all required fields', () => {
    expectTypeOf<OperationLog>().toHaveProperty('id');
    expectTypeOf<OperationLog>().toHaveProperty('taskId');
    expectTypeOf<OperationLog>().toHaveProperty('steps');
    expectTypeOf<OperationLog>().toHaveProperty('recordedAt');
    expectTypeOf<OperationLog>().toHaveProperty('source');
  });

  it('id is string', () => {
    expectTypeOf<OperationLog['id']>().toBeString();
  });

  it('taskId is string', () => {
    expectTypeOf<OperationLog['taskId']>().toBeString();
  });

  it('steps is OperationStep array', () => {
    expectTypeOf<OperationLog['steps']>().toEqualTypeOf<OperationStep[]>();
  });

  it('recordedAt is string', () => {
    expectTypeOf<OperationLog['recordedAt']>().toBeString();
  });

  it('source is OperationSource', () => {
    expectTypeOf<OperationLog['source']>().toEqualTypeOf<OperationSource>();
  });
});

// ─── ApprovalStatus ─────────────────────────────────────────────────

describe('ApprovalStatusValue', () => {
  it('is a union of literal strings', () => {
    expectTypeOf<ApprovalStatusValue>().toEqualTypeOf<
      'pending' | 'approved' | 'rejected'
    >();
  });
});

describe('ApprovalStatus', () => {
  it('has all required fields', () => {
    expectTypeOf<ApprovalStatus>().toHaveProperty('taskId');
    expectTypeOf<ApprovalStatus>().toHaveProperty('status');
    expectTypeOf<ApprovalStatus>().toHaveProperty('scriptHash');
    expectTypeOf<ApprovalStatus>().toHaveProperty('reviewedAt');
  });

  it('taskId is string', () => {
    expectTypeOf<ApprovalStatus['taskId']>().toBeString();
  });

  it('status is ApprovalStatusValue', () => {
    expectTypeOf<ApprovalStatus['status']>().toEqualTypeOf<ApprovalStatusValue>();
  });

  it('scriptHash is string', () => {
    expectTypeOf<ApprovalStatus['scriptHash']>().toBeString();
  });

  it('reviewedAt is string', () => {
    expectTypeOf<ApprovalStatus['reviewedAt']>().toBeString();
  });
});

// ─── DependencyCheck ────────────────────────────────────────────────

describe('DependencyStatus', () => {
  it('is a union of literal strings', () => {
    expectTypeOf<DependencyStatus>().toEqualTypeOf<
      'ok' | 'missing' | 'outdated' | 'error'
    >();
  });
});

describe('DependencyCheck', () => {
  it('has all required fields', () => {
    expectTypeOf<DependencyCheck>().toHaveProperty('name');
    expectTypeOf<DependencyCheck>().toHaveProperty('installed');
    expectTypeOf<DependencyCheck>().toHaveProperty('version');
    expectTypeOf<DependencyCheck>().toHaveProperty('required');
    expectTypeOf<DependencyCheck>().toHaveProperty('status');
  });

  it('name is string', () => {
    expectTypeOf<DependencyCheck['name']>().toBeString();
  });

  it('installed is string', () => {
    expectTypeOf<DependencyCheck['installed']>().toBeString();
  });

  it('version is string', () => {
    expectTypeOf<DependencyCheck['version']>().toBeString();
  });

  it('required is string', () => {
    expectTypeOf<DependencyCheck['required']>().toBeString();
  });

  it('status is DependencyStatus', () => {
    expectTypeOf<DependencyCheck['status']>().toEqualTypeOf<DependencyStatus>();
  });
});
