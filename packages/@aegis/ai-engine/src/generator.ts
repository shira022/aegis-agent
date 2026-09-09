import { generateText } from 'ai';
import type { AIConfig, CodeGenerationRequest, CodeGenerationResponse, ExceptionHandler } from './types';
import type { OperationLog } from '@aegis/shared';
import { buildCodeGenerationPrompt, buildExceptionPrompt, buildHealingPrompt } from './prompt-builder';
import { validateSyntax, validateNoDangerousOps, BLOCKED_PATTERNS } from './validators';
import { createProviderModel } from './provider-adapter';

// ─── AI Engine ─────────────────────────────────────────────────────

export class AiEngine {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    const { system, user } = buildCodeGenerationPrompt(request);
    const model = this.createModel();

    const result = await generateText({
      model,
      system,
      prompt: user,
      maxTokens: this.config.maxTokens ?? 2048,
      temperature: this.config.temperature ?? 0,
    });

    return this.parseCodeResponse(result.text, {
      input_tokens: result.usage.promptTokens,
      output_tokens: result.usage.completionTokens,
    });
  }

  async generateExceptions(operationLog: OperationLog): Promise<ExceptionHandler[]> {
    const prompt = buildExceptionPrompt(operationLog);
    const model = this.createModel();

    const result = await generateText({
      model,
      prompt,
      maxTokens: this.config.maxTokens ?? 2048,
    });

    return this.parseExceptionsResponse(result.text);
  }

  async suggestHealing(error: string, currentCode: string): Promise<string> {
    const prompt = buildHealingPrompt(error, currentCode);
    const model = this.createModel();

    const result = await generateText({
      model,
      prompt,
      maxTokens: this.config.maxTokens ?? 2048,
    });

    return result.text;
  }

  validateCode(code: string) {
    const syntaxResult = validateSyntax(code);
    const dangerResult = validateNoDangerousOps(code);
    const errors = [...syntaxResult.errors, ...dangerResult.violations];
    return { valid: errors.length === 0, errors };
  }

  validateSafety(code: string) {
    return BLOCKED_PATTERNS.map((pattern) => {
      const match = code.match(pattern);
      return {
        pattern: pattern.source,
        safe: !match,
        violation: match ? `Blocked pattern: ${pattern.source}` : undefined,
      };
    });
  }

  // ─── Private ────────────────────────────────────────────────────

  private createModel() {
    return createProviderModel(this.config.providerId, {
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      region: this.config.region,
    });
  }

  private parseCodeResponse(
    response: string,
    usage?: { input_tokens?: number; output_tokens?: number },
  ): CodeGenerationResponse {
    const tokensUsed = (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0);

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
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
