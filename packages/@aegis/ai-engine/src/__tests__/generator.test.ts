import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiEngine } from '../generator';
import type { AIConfig, CodeGenerationRequest } from '../types';
import type { OperationLog } from '@aegis/shared';

// ─── Mock fetch globally ───────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const sampleConfig: AIConfig = {
  provider: 'openai',
  apiKey: 'test-key',
  model: 'gpt-4',
  baseUrl: 'https://api.openai.com/v1',
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

describe('AiEngine constructor', () => {
  it('should create an instance with valid config', () => {
    const engine = new AiEngine(sampleConfig);
    expect(engine).toBeInstanceOf(AiEngine);
  });

  it('should accept anthropic provider config', () => {
    const config: AIConfig = {
      provider: 'anthropic',
      apiKey: 'sk-ant-test',
      model: 'claude-3-opus',
    };
    const engine = new AiEngine(config);
    expect(engine).toBeInstanceOf(AiEngine);
  });

  it('should accept custom provider with baseUrl', () => {
    const config: AIConfig = {
      provider: 'custom',
      apiKey: 'custom-key',
      model: 'my-model',
      baseUrl: 'https://my-api.com/v1',
    };
    const engine = new AiEngine(config);
    expect(engine).toBeInstanceOf(AiEngine);
  });
});

describe('AiEngine.generateCode', () => {
  it('should return a CodeGenerationResponse on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                code: 'from selenium import webdriver\ndriver = webdriver.Chrome()\ndriver.get("https://example.com")',
                explanation: 'Navigates to example.com',
                exceptionHandlers: [
                  {
                    condition: 'TimeoutException',
                    action: 'retry with longer timeout',
                    code: 'driver.set_page_load_timeout(30)',
                    riskLevel: 'low',
                  },
                ],
                warnings: [],
              }),
            },
          },
        ],
        usage: { total_tokens: 150 },
      }),
    });

    const engine = new AiEngine(sampleConfig);
    const request: CodeGenerationRequest = {
      operationLog: sampleOperationLog,
    };

    const response = await engine.generateCode(request);
    expect(response.code).toContain('selenium');
    expect(response.explanation).toContain('example.com');
    expect(response.exceptionHandlers).toHaveLength(1);
    expect(response.metadata.model).toBe('gpt-4');
    expect(response.metadata.tokensUsed).toBe(150);
    expect(response.metadata.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should throw on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: { message: 'Invalid API key' } }),
    });

    const engine = new AiEngine(sampleConfig);
    const request: CodeGenerationRequest = {
      operationLog: sampleOperationLog,
    };

    await expect(engine.generateCode(request)).rejects.toThrow();
  });

  it('should throw on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const engine = new AiEngine(sampleConfig);
    const request: CodeGenerationRequest = {
      operationLog: sampleOperationLog,
    };

    await expect(engine.generateCode(request)).rejects.toThrow('Network error');
  });

  it('should pass correct headers for OpenAI', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"code":"pass","explanation":"ok","exceptionHandlers":[],"warnings":[]}' } }],
        usage: { total_tokens: 10 },
      }),
    });

    const engine = new AiEngine(sampleConfig);
    await engine.generateCode({ operationLog: sampleOperationLog });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers).toHaveProperty('Authorization', 'Bearer test-key');
    expect(init.headers).toHaveProperty('Content-Type', 'application/json');
  });

  it('should use correct API endpoint for anthropic', async () => {
    const anthropicConfig: AIConfig = {
      provider: 'anthropic',
      apiKey: 'sk-ant-test',
      model: 'claude-3-opus',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: '{"code":"pass","explanation":"ok","exceptionHandlers":[],"warnings":[]}' }],
        usage: { input_tokens: 50, output_tokens: 50 },
      }),
    });

    const engine = new AiEngine(anthropicConfig);
    await engine.generateCode({ operationLog: sampleOperationLog });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('anthropic');
    expect(url).toContain('messages');
  });
});

describe('AiEngine.generateExceptions', () => {
  it('should return ExceptionHandler array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  condition: 'ElementNotFound',
                  action: 'retry with alternative selector',
                  code: 'try:\n    elem = driver.find_element(By.ID, "alt")\nexcept:\n    elem = driver.find_element(By.CSS_SELECTOR, ".alt")',
                  riskLevel: 'low',
                },
              ]),
            },
          },
        ],
        usage: { total_tokens: 80 },
      }),
    });

    const engine = new AiEngine(sampleConfig);
    const exceptions = await engine.generateExceptions(sampleOperationLog);
    expect(Array.isArray(exceptions)).toBe(true);
    expect(exceptions.length).toBeGreaterThan(0);
    expect(exceptions[0]).toHaveProperty('condition');
    expect(exceptions[0]).toHaveProperty('action');
    expect(exceptions[0]).toHaveProperty('code');
    expect(exceptions[0]).toHaveProperty('riskLevel');
  });
});

describe('AiEngine.suggestHealing', () => {
  it('should return a healing suggestion string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'Use WebDriverWait with explicit wait instead of implicit wait.',
            },
          },
        ],
        usage: { total_tokens: 60 },
      }),
    });

    const engine = new AiEngine(sampleConfig);
    const suggestion = await engine.suggestHealing(
      'TimeoutException',
      'driver.find_element(By.ID, "slow-elem")',
    );
    expect(typeof suggestion).toBe('string');
    expect(suggestion.length).toBeGreaterThan(0);
  });
});

describe('AiEngine.validateCode', () => {
  it('should return ValidationResult for valid code', () => {
    const engine = new AiEngine(sampleConfig);
    const result = engine.validateCode('def hello():\n    return "world"');
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(typeof result.valid).toBe('boolean');
  });

  it('should return valid: true for safe code', () => {
    const engine = new AiEngine(sampleConfig);
    const result = engine.validateCode('x = 1 + 2\nprint(x)');
    expect(result.valid).toBe(true);
  });

  it('should return valid: false for dangerous code', () => {
    const engine = new AiEngine(sampleConfig);
    const result = engine.validateCode('os.system("rm -rf /")');
    expect(result.valid).toBe(false);
  });
});

describe('AiEngine.validateSafety', () => {
  it('should return SafetyCheck array', () => {
    const engine = new AiEngine(sampleConfig);
    const checks = engine.validateSafety('x = 1 + 2');
    expect(Array.isArray(checks)).toBe(true);
    expect(checks.length).toBeGreaterThan(0);
    for (const check of checks) {
      expect(check).toHaveProperty('pattern');
      expect(check).toHaveProperty('safe');
      expect(typeof check.safe).toBe('boolean');
    }
  });

  it('should flag dangerous patterns as unsafe', () => {
    const engine = new AiEngine(sampleConfig);
    const checks = engine.validateSafety('eval("malicious")');
    const evalCheck = checks.find((c) => c.pattern.includes('eval'));
    expect(evalCheck).toBeDefined();
    expect(evalCheck!.safe).toBe(false);
  });

  it('should mark safe code as safe for all patterns', () => {
    const engine = new AiEngine(sampleConfig);
    const checks = engine.validateSafety('result = sum([1, 2, 3])');
    const allSafe = checks.every((c) => c.safe);
    expect(allSafe).toBe(true);
  });
});
