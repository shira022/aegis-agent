import type {
  AIConfig,
  CodeGenerationRequest,
  CodeGenerationResponse,
  ExceptionHandler,
  ValidationResult,
  SafetyCheck,
} from './types';
import type { OperationLog } from '@aegis/shared';
import { buildCodeGenerationPrompt, buildExceptionPrompt, buildHealingPrompt } from './prompt-builder';
import { validateSyntax, validateNoDangerousOps, BLOCKED_PATTERNS } from './validators';

// ─── AI Response ───────────────────────────────────────────────────

interface AIResponse {
  content: string;
  usage?: { total_tokens?: number; input_tokens?: number; output_tokens?: number };
}

// ─── Standalone AI Helpers ─────────────────────────────────────────

async function callAIWithUsage(
  config: AIConfig,
  messages: Array<{ role: string; content: string }>,
): Promise<AIResponse> {
  const url = getEndpoint(config);
  const headers = getHeaders(config);
  const body = formatRequest(config, messages);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = (errorData as Record<string, unknown>).error
      ? ((errorData as Record<string, unknown>).error as Record<string, string>).message
      : response.statusText;
    throw new Error(`AI API error (${response.status}): ${message}`);
  }

  const data = await response.json();
  return extractContentWithUsage(config, data);
}

async function callAIString(
  config: AIConfig,
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const { content } = await callAIWithUsage(config, messages);
  return content;
}

function getEndpoint(config: AIConfig): string {
  const base = config.baseUrl || getDefaultBaseUrl(config);
  switch (config.provider) {
    case 'openai':
      return `${base}/chat/completions`;
    case 'anthropic':
      return `${base}/v1/messages`;
    case 'custom':
      return `${base}/chat/completions`;
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

function getDefaultBaseUrl(config: AIConfig): string {
  switch (config.provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'anthropic':
      return 'https://api.anthropic.com';
    case 'custom':
      throw new Error('baseUrl is required for custom provider');
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

function getHeaders(config: AIConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  switch (config.provider) {
    case 'openai':
    case 'custom':
      headers['Authorization'] = `Bearer ${config.apiKey}`;
      break;
    case 'anthropic':
      headers['x-api-key'] = config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      break;
  }

  return headers;
}

function formatRequest(config: AIConfig, messages: Array<{ role: string; content: string }>): Record<string, unknown> {
  switch (config.provider) {
    case 'openai':
    case 'custom':
      return {
        model: config.model,
        messages,
        max_tokens: config.maxTokens || 2048,
        temperature: config.temperature ?? 0,
      };
    case 'anthropic':
      return {
        model: config.model,
        messages,
        max_tokens: config.maxTokens || 2048,
        temperature: config.temperature ?? 0,
      };
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

function extractContentWithUsage(config: AIConfig, data: Record<string, unknown>): AIResponse {
  switch (config.provider) {
    case 'openai':
    case 'custom': {
      const choices = data.choices as Array<{ message: { content: string } }>;
      const usage = data.usage as { total_tokens?: number } | undefined;
      return { content: choices[0].message.content, usage };
    }
    case 'anthropic': {
      const content = data.content as Array<{ text: string }>;
      const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined;
      return { content: content[0].text, usage };
    }
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

// ─── AI Engine ─────────────────────────────────────────────────────

export class AiEngine {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    const { system, user } = buildCodeGenerationPrompt(request);
    const { content, usage } = await callAIWithUsage(this.config, [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    return this.parseCodeResponse(content, usage);
  }

  async generateExceptions(operationLog: OperationLog): Promise<ExceptionHandler[]> {
    const prompt = buildExceptionPrompt(operationLog);
    const response = await callAIString(this.config, [{ role: 'user', content: prompt }]);
    return this.parseExceptionsResponse(response);
  }

  async suggestHealing(error: string, currentCode: string): Promise<string> {
    const prompt = buildHealingPrompt(error, currentCode);
    return callAIString(this.config, [{ role: 'user', content: prompt }]);
  }

  validateCode(code: string): ValidationResult {
    const syntaxResult = validateSyntax(code);
    const dangerResult = validateNoDangerousOps(code);

    const errors: string[] = [...syntaxResult.errors, ...dangerResult.violations];

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateSafety(code: string): SafetyCheck[] {
    return BLOCKED_PATTERNS.map((pattern) => {
      const match = code.match(pattern);
      return {
        pattern: pattern.source,
        safe: !match,
        violation: match ? `Blocked pattern: ${pattern.source}` : undefined,
      };
    });
  }

  // ─── Private Helpers ────────────────────────────────────────────

  private parseCodeResponse(
    response: string,
    usage?: { total_tokens?: number; input_tokens?: number; output_tokens?: number },
  ): CodeGenerationResponse {
    let tokensUsed = 0;
    if (usage) {
      tokensUsed = usage.total_tokens || (usage.input_tokens || 0) + (usage.output_tokens || 0);
    }

    try {
      const parsed = JSON.parse(response);
      return {
        code: parsed.code || '',
        explanation: parsed.explanation || '',
        exceptionHandlers: parsed.exceptionHandlers || [],
        warnings: parsed.warnings || [],
        metadata: {
          model: this.config.model,
          tokensUsed,
          generatedAt: Date.now(),
          latencyMs: 0,
        },
      };
    } catch {
      return {
        code: response,
        explanation: '',
        exceptionHandlers: [],
        warnings: ['Response was not valid JSON, returned as raw code'],
        metadata: {
          model: this.config.model,
          tokensUsed,
          generatedAt: Date.now(),
          latencyMs: 0,
        },
      };
    }
  }

  private parseExceptionsResponse(response: string): ExceptionHandler[] {
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }
}
