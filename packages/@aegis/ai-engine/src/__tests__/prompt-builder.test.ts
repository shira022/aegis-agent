import { describe, it, expect } from 'vitest';
import {
  buildCodeGenerationPrompt,
  buildExceptionPrompt,
  buildHealingPrompt,
  SAFETY_PROMPT,
} from '../prompt-builder';
import type { CodeGenerationRequest } from '../types';
import type { OperationLog } from '@aegis/shared';

const sampleOperationLog: OperationLog = {
  id: 'op-1',
  taskId: 'task-1',
  steps: [
    {
      type: 'click',
      target: { selector: '#submit-button' },
      timestamp: '2024-01-01T00:00:00Z',
    },
    {
      type: 'type',
      target: { text: 'hello world' },
      timestamp: '2024-01-01T00:00:01Z',
    },
  ],
  recordedAt: '2024-01-01T00:00:00Z',
  source: 'browser',
};

describe('buildCodeGenerationPrompt', () => {
  it('should return system and user prompt strings', () => {
    const request: CodeGenerationRequest = {
      operationLog: sampleOperationLog,
    };
    const result = buildCodeGenerationPrompt(request);
    expect(typeof result.system).toBe('string');
    expect(typeof result.user).toBe('string');
    expect(result.system.length).toBeGreaterThan(0);
    expect(result.user.length).toBeGreaterThan(0);
  });

  it('should include safety instructions in system prompt', () => {
    const request: CodeGenerationRequest = {
      operationLog: sampleOperationLog,
    };
    const result = buildCodeGenerationPrompt(request);
    expect(result.system).toContain('deterministic');
    expect(result.system).toContain('safety');
  });

  it('should include operation log details in user prompt', () => {
    const request: CodeGenerationRequest = {
      operationLog: sampleOperationLog,
    };
    const result = buildCodeGenerationPrompt(request);
    expect(result.user).toContain('click');
    expect(result.user).toContain('type');
    expect(result.user).toContain('#submit-button');
  });

  it('should include context when provided', () => {
    const request: CodeGenerationRequest = {
      operationLog: sampleOperationLog,
      context: 'This is for a login form',
    };
    const result = buildCodeGenerationPrompt(request);
    expect(result.user).toContain('login form');
  });

  it('should include safety rules when provided', () => {
    const request: CodeGenerationRequest = {
      operationLog: sampleOperationLog,
      safetyRules: ['No network calls', 'No file writes'],
    };
    const result = buildCodeGenerationPrompt(request);
    expect(result.user).toContain('No network calls');
    expect(result.user).toContain('No file writes');
  });

  it('should include platform when provided', () => {
    const request: CodeGenerationRequest = {
      operationLog: sampleOperationLog,
      platform: 'windows',
    };
    const result = buildCodeGenerationPrompt(request);
    expect(result.user).toContain('windows');
  });

  it('should handle operation log with multiple step types', () => {
    const multiStepLog: OperationLog = {
      ...sampleOperationLog,
      steps: [
        { type: 'navigate', target: { text: 'https://example.com' }, timestamp: '2024-01-01T00:00:00Z' },
        { type: 'wait', target: {}, timestamp: '2024-01-01T00:00:01Z' },
        { type: 'screenshot', target: {}, timestamp: '2024-01-01T00:00:02Z' },
        { type: 'click', target: { selector: '.btn' }, timestamp: '2024-01-01T00:00:03Z' },
      ],
    };
    const request: CodeGenerationRequest = { operationLog: multiStepLog };
    const result = buildCodeGenerationPrompt(request);
    expect(result.user).toContain('navigate');
    expect(result.user).toContain('wait');
    expect(result.user).toContain('screenshot');
  });
});

describe('buildExceptionPrompt', () => {
  it('should return a string prompt', () => {
    const result = buildExceptionPrompt(sampleOperationLog);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include exception handling instructions', () => {
    const result = buildExceptionPrompt(sampleOperationLog);
    expect(result).toContain('exception');
  });

  it('should include operation log steps', () => {
    const result = buildExceptionPrompt(sampleOperationLog);
    expect(result).toContain('click');
    expect(result).toContain('type');
  });

  it('should include existing code when provided', () => {
    const existingCode = 'from selenium import webdriver\ndriver = webdriver.Chrome()';
    const result = buildExceptionPrompt(sampleOperationLog, existingCode);
    expect(result).toContain(existingCode);
  });

  it('should handle null existing code', () => {
    const result = buildExceptionPrompt(sampleOperationLog, undefined);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('buildHealingPrompt', () => {
  it('should return a string prompt', () => {
    const result = buildHealingPrompt(
      'NoSuchElementException: element not found',
      'driver.find_element(By.ID, "missing")',
    );
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include the error message', () => {
    const error = 'TimeoutException: Page did not load';
    const result = buildHealingPrompt(error, 'driver.get("https://slow.com")');
    expect(result).toContain(error);
  });

  it('should include the current code', () => {
    const code = 'driver.find_element(By.CSS_SELECTOR, ".old-selector")';
    const result = buildHealingPrompt('ElementNotFound', code);
    expect(result).toContain(code);
  });

  it('should include healing instructions', () => {
    const result = buildHealingPrompt('Error', 'code');
    expect(result).toContain('heal');
  });

  it('should include screenshot reference when provided', () => {
    const result = buildHealingPrompt(
      'Error',
      'code',
      'base64-encoded-screenshot-data',
    );
    expect(result).toContain('screenshot');
  });

  it('should handle no screenshot', () => {
    const result = buildHealingPrompt('Error', 'code');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('SAFETY_PROMPT', () => {
  it('should be a non-empty string', () => {
    expect(typeof SAFETY_PROMPT).toBe('string');
    expect(SAFETY_PROMPT.length).toBeGreaterThan(0);
  });

  it('should mention deterministic code', () => {
    expect(SAFETY_PROMPT.toLowerCase()).toContain('deterministic');
  });

  it('should mention no hallucination', () => {
    expect(SAFETY_PROMPT.toLowerCase()).toContain('hallucination');
  });
});
