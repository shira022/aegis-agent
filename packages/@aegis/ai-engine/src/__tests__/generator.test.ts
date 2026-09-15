import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiEngine } from '../generator';
import { TextExtractionError } from '../text-extraction-error';
import type { AIConfig } from '../types';
import type { OperationLog } from '@aegis/shared';

// ─── Mock Vercel AI SDK ─────────────────────────────────────────

const { mockGenerateText, mockCreateProviderModel } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
  mockCreateProviderModel: vi.fn(() => ({ modelId: 'mock', provider: 'mock' })),
}));

vi.mock('ai', () => ({ generateText: mockGenerateText }));
vi.mock('../provider-adapter', () => ({
  createProviderModel: mockCreateProviderModel,
}));

// ─── Fixtures ───────────────────────────────────────────────────

const TEST_MODEL = 'test-model';

const sampleConfig: AIConfig = {
  providerId: 'openai',
  apiKey: 'test-key',
  model: TEST_MODEL,
  maxTokens: 1000,
  temperature: 0,
};

const sampleOperationLog: OperationLog = {
  id: 'op-1',
  taskId: 'task-1',
  steps: [
    {
      type: 'click',
      target: { selector: '#submit' },
      timestamp: '2024-01-01T00:00:00Z',
    },
  ],
  recordedAt: '2024-01-01T00:00:00Z',
  source: 'browser',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Constructor ─────────────────────────────────────────────────

describe('AiEngine constructor', () => {
  it('creates instance with openai config', () => {
    expect(new AiEngine(sampleConfig)).toBeInstanceOf(AiEngine);
  });

  it('creates instance with anthropic config', () => {
    const config: AIConfig = { ...sampleConfig, providerId: 'anthropic' };
    expect(new AiEngine(config)).toBeInstanceOf(AiEngine);
  });

  it('creates instance with ollama config', () => {
    const config: AIConfig = {
      ...sampleConfig,
      providerId: 'ollama',
      baseUrl: 'http://localhost:11434/v1',
    };
    expect(new AiEngine(config)).toBeInstanceOf(AiEngine);
  });
});

// ─── generateCode ───────────────────────────────────────────────

describe('AiEngine.generateCode', () => {
  it('returns CodeGenerationResponse on success', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        code: 'from selenium import webdriver\ndriver = webdriver.Chrome()',
        explanation: 'Navigates to example.com',
        exceptionHandlers: [
          { condition: 'TimeoutException', action: 'retry', code: 'pass', riskLevel: 'low' },
        ],
        warnings: [],
      }),
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    const engine = new AiEngine(sampleConfig);
    const response = await engine.generateCode({ operationLog: sampleOperationLog });

    expect(response.code).toContain('selenium');
    expect(response.explanation).toContain('example.com');
    expect(response.exceptionHandlers).toHaveLength(1);
    expect(response.metadata.model).toBe(TEST_MODEL);
    expect(response.metadata.tokensUsed).toBe(150);
  });

  it('forwards the configured model to the provider adapter', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'print(1)',
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    const engine = new AiEngine(sampleConfig);
    await engine.generateCode({ operationLog: sampleOperationLog });

    expect(mockCreateProviderModel).toHaveBeenCalledWith(
      sampleConfig.providerId,
      {
        apiKey: sampleConfig.apiKey,
        baseUrl: sampleConfig.baseUrl,
        region: sampleConfig.region,
      },
      sampleConfig.model,
      { disableThinking: sampleConfig.disableThinking },
    );
  });

  it('forwards disableThinking to the provider adapter', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'print(1)',
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    const config: AIConfig = {
      ...sampleConfig,
      providerId: 'ollama',
      baseUrl: 'http://localhost:11434/v1',
      disableThinking: true,
    };
    const engine = new AiEngine(config);
    await engine.generateCode({ operationLog: sampleOperationLog });

    expect(mockCreateProviderModel).toHaveBeenCalledWith(
      config.providerId,
      {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        region: config.region,
      },
      config.model,
      { disableThinking: true },
    );
  });

  it('handles non-JSON response gracefully', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'def hello(): print("hi")',
      usage: { inputTokens: 5, outputTokens: 5 },
    });

    const engine = new AiEngine(sampleConfig);
    const response = await engine.generateCode({ operationLog: sampleOperationLog });

    expect(response.code).toBe('def hello(): print("hi")');
    expect(response.warnings).toContain('Response was not valid JSON, returned as raw code');
  });

  it('propagates SDK errors', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('API key invalid'));

    const engine = new AiEngine(sampleConfig);
    await expect(
      engine.generateCode({ operationLog: sampleOperationLog }),
    ).rejects.toThrow('API key invalid');
  });
});

// ─── Text extraction failures (ADR-009(d)) ─────────────────────

describe('AiEngine.generateCode text extraction failures', () => {
  it('throws TextExtractionError with kind "reasoning-only" when only reasoning text was returned', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '',
      reasoningText: 'I should click the submit button first, then type into the search box',
      usage: { inputTokens: 500, outputTokens: 0 },
    });

    const engine = new AiEngine(sampleConfig);
    const error: unknown = await engine
      .generateCode({ operationLog: sampleOperationLog })
      .then(() => undefined, (e: unknown) => e);

    expect(error).toBeInstanceOf(TextExtractionError);
    const extractionError = error as TextExtractionError;
    expect(extractionError.kind).toBe('reasoning-only');
    expect(extractionError.reasoning).toBe(
      'I should click the submit button first, then type into the search box',
    );
    expect(extractionError.message).toContain('disable thinking');
  });

  it('throws TextExtractionError with kind "missing" when no text and no reasoning were returned', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '   \n\t',
      usage: { inputTokens: 5, outputTokens: 0 },
    });

    const engine = new AiEngine(sampleConfig);
    const error: unknown = await engine
      .generateCode({ operationLog: sampleOperationLog })
      .then(() => undefined, (e: unknown) => e);

    expect(error).toBeInstanceOf(TextExtractionError);
    const extractionError = error as TextExtractionError;
    expect(extractionError.kind).toBe('missing');
    expect(extractionError.reasoning).toBeUndefined();
    expect(extractionError.message).toContain('did not contain generated text');
  });

  it('treats whitespace-only reasoning as missing, never as generated code', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '',
      reasoningText: '   ',
      usage: { inputTokens: 5, outputTokens: 0 },
    });

    const engine = new AiEngine(sampleConfig);
    const error: unknown = await engine
      .generateCode({ operationLog: sampleOperationLog })
      .then(() => undefined, (e: unknown) => e);

    expect(error).toBeInstanceOf(TextExtractionError);
    const extractionError = error as TextExtractionError;
    expect(extractionError.kind).toBe('missing');
    expect(extractionError.reasoning).toBeUndefined();
  });
});

// ─── generateExceptions ─────────────────────────────────────────

describe('AiEngine.generateExceptions', () => {
  it('returns ExceptionHandler array', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify([
        { condition: 'ElementNotFound', action: 'retry with alt selector', code: 'pass', riskLevel: 'low' },
      ]),
      usage: { inputTokens: 5, outputTokens: 10 },
    });

    const engine = new AiEngine(sampleConfig);
    const exceptions = await engine.generateExceptions(sampleOperationLog);

    expect(exceptions).toHaveLength(1);
    expect(exceptions[0]).toHaveProperty('condition');
    expect(exceptions[0]).toHaveProperty('riskLevel');
  });

  it('returns empty array on invalid JSON', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'not json at all',
      usage: { inputTokens: 5, outputTokens: 5 },
    });

    const engine = new AiEngine(sampleConfig);
    const exceptions = await engine.generateExceptions(sampleOperationLog);
    expect(exceptions).toEqual([]);
  });
});

// ─── suggestHealing ─────────────────────────────────────────────

describe('AiEngine.suggestHealing', () => {
  it('returns a healing suggestion string', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'Use WebDriverWait with explicit wait',
      usage: { inputTokens: 5, outputTokens: 5 },
    });

    const engine = new AiEngine(sampleConfig);
    const suggestion = await engine.suggestHealing('TimeoutException', 'code');
    expect(suggestion).toBe('Use WebDriverWait with explicit wait');
  });
});

// ─── validateCode (no API needed) ──────────────────────────────

describe('AiEngine.validateCode', () => {
  it('returns valid: true for safe code', () => {
    const engine = new AiEngine(sampleConfig);
    const result = engine.validateCode('x = 1 + 2\nprint(x)');
    expect(result.valid).toBe(true);
  });

  it('returns valid: false for dangerous code', () => {
    const engine = new AiEngine(sampleConfig);
    const result = engine.validateCode('os.system("rm -rf /")');
    expect(result.valid).toBe(false);
  });
});

// ─── validateSafety (no API needed) ────────────────────────────

describe('AiEngine.validateSafety', () => {
  it('returns SafetyCheck array', () => {
    const engine = new AiEngine(sampleConfig);
    const checks = engine.validateSafety('x = 1');
    expect(Array.isArray(checks)).toBe(true);
    expect(checks.length).toBeGreaterThan(0);
  });

  it('flags eval as unsafe', () => {
    const engine = new AiEngine(sampleConfig);
    const checks = engine.validateSafety('eval("malicious")');
    const evalCheck = checks.find((c) => c.pattern.includes('eval'));
    expect(evalCheck?.safe).toBe(false);
  });
});
