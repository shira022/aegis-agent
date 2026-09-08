import type { CodeGenerationRequest } from './types';
import type { OperationLog } from '@aegis/shared';

// ─── Safety Prompt ─────────────────────────────────────────────────

export const SAFETY_PROMPT = `You are a code generation engine for robotic process automation (RPA).
CRITICAL SAFETY RULES:
1. Generate ONLY deterministic code — no random values, no timestamps, no side effects.
2. NEVER hallucinate selectors, URLs, or element IDs that are not present in the operation log. No hallucination of any kind.
3. ALL generated code must be syntactically valid and immediately runnable.
4. NEVER generate code that performs system-level operations (subprocess, os.system, eval, exec).
5. NEVER generate code that modifies files, deletes data, or accesses the network.
6. ALWAYS include proper exception handling for each operation step.
7. Output code as a JSON object with fields: code, explanation, exceptionHandlers, warnings.
8. Use ONLY the exact selectors, text, and values from the operation log.
9. Prefer explicit waits over implicit waits.
10. If uncertain about an element, add a fallback selector or explicit wait.`;

// ─── Prompt Builder ────────────────────────────────────────────────

export function buildCodeGenerationPrompt(request: CodeGenerationRequest): {
  system: string;
  user: string;
} {
  const { operationLog, context, safetyRules, platform } = request;

  const systemPrompt = [
    SAFETY_PROMPT,
    '',
    'Additional safety rules:',
    '- Generate code that can be validated deterministically.',
    '- Include error handling for every action.',
    '- Use explicit waits for dynamic elements.',
    `- Platform: ${platform || 'browser (Selenium)'}`,
  ].join('\n');

  const stepDescriptions = operationLog.steps
    .map((step, i) => {
      const parts = [`Step ${i + 1}: ${step.type}`];
      if (step.target.selector) parts.push(`Selector: ${step.target.selector}`);
      if (step.target.text) parts.push(`Text: "${step.target.text}"`);
      if (step.target.screenshot) parts.push('[Screenshot captured]');
      parts.push(`Timestamp: ${step.timestamp}`);
      return parts.join(' | ');
    })
    .join('\n');

  const userParts = [
    `Operation Log ID: ${operationLog.id}`,
    `Task ID: ${operationLog.taskId}`,
    `Source: ${operationLog.source}`,
    `Recorded at: ${operationLog.recordedAt}`,
    '',
    'Steps:',
    stepDescriptions,
  ];

  userParts.push('', `Platform: ${platform || 'browser (Selenium)'}`);

  if (context) {
    userParts.push('', `Context: ${context}`);
  }

  if (safetyRules && safetyRules.length > 0) {
    userParts.push('', 'Additional safety constraints:');
    for (const rule of safetyRules) {
      userParts.push(`- ${rule}`);
    }
  }

  userParts.push('', 'Generate the Python automation code as a JSON object.');

  return {
    system: systemPrompt,
    user: userParts.join('\n'),
  };
}

export function buildExceptionPrompt(
  operationLog: OperationLog,
  existingCode?: string,
): string {
  const parts = [
    'You are an exception handling specialist for RPA code.',
    'Given the following operation log, generate exception handlers for each step.',
    '',
    'Requirements:',
    '- Each handler must catch a specific exception type.',
    '- Include retry logic with appropriate timeouts.',
    '- Log errors with sufficient detail for debugging.',
    '- Never swallow exceptions silently.',
    '- Return handlers as a JSON array.',
    '',
    'Operation Log:',
    `ID: ${operationLog.id}`,
    `Task: ${operationLog.taskId}`,
    `Source: ${operationLog.source}`,
    '',
    'Steps:',
  ];

  for (const [i, step] of operationLog.steps.entries()) {
    const details = [`Step ${i + 1}: ${step.type}`];
    if (step.target.selector) details.push(`Selector: ${step.target.selector}`);
    if (step.target.text) details.push(`Text: "${step.target.text}"`);
    parts.push(details.join(' | '));
  }

  if (existingCode) {
    parts.push('', 'Existing code:', existingCode);
  }

  parts.push('', 'Generate exception handlers as a JSON array.');

  return parts.join('\n');
}

export function buildHealingPrompt(
  error: string,
  currentCode: string,
  screenshot?: string,
): string {
  const parts = [
    'You are a code healing specialist for RPA automation.',
    'A piece of automation code has failed. Diagnose the error and suggest a fix.',
    '',
    'Error:',
    error,
    '',
    'Current code:',
    currentCode,
  ];

  if (screenshot) {
    parts.push('', 'Screenshot of the error state (base64):', screenshot);
  }

  parts.push(
    '',
    'Requirements:',
    '- Identify the root cause of the error.',
    '- Suggest a minimal fix that preserves the original intent.',
    '- If the element is not found, suggest alternative selectors or explicit waits.',
    '- Return the fix as a clear code suggestion.',
  );

  return parts.join('\n');
}
