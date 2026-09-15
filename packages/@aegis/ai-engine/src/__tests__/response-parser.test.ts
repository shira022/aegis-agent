import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractJsonPayload, stripOuterCodeFence } from '../response-parser';
import { AiEngine } from '../generator';
import { TextExtractionError } from '../text-extraction-error';
import { validateSyntax } from '../validators';
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

const sampleConfig: AIConfig = {
  providerId: 'ollama',
  apiKey: 'test-key',
  model: 'qwen3.5:9b',
  baseUrl: 'http://localhost:11434/v1',
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

const PYTHON_CODE = [
  'from selenium import webdriver',
  'from selenium.webdriver.common.by import By',
  '',
  'driver = webdriver.Chrome()',
  'driver.get("https://example.com")',
  'button = driver.find_element(By.ID, "submit")',
  'button.click()',
  'driver.quit()',
].join('\n');

const codePayload = {
  code: PYTHON_CODE,
  explanation: 'Opens example.com and clicks the submit button',
  exceptionHandlers: [
    { condition: 'TimeoutException', action: 'retry', code: 'pass', riskLevel: 'low' },
  ],
  warnings: [],
};

const fencedJsonResponse =
  '```json\n' + JSON.stringify(codePayload, null, 2) + '\n```';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── extractJsonPayload ─────────────────────────────────────────

describe('extractJsonPayload', () => {
  it('extracts JSON from a fenced response with a json language tag', () => {
    expect(extractJsonPayload(fencedJsonResponse)).toBe(JSON.stringify(codePayload, null, 2));
  });

  it('extracts JSON from a fenced response without a language tag', () => {
    expect(extractJsonPayload('```\n{"code": "x = 1"}\n```')).toBe('{"code": "x = 1"}');
  });

  it('returns plain JSON unchanged (trimmed)', () => {
    expect(extractJsonPayload('  {"code": "x = 1"}  ')).toBe('{"code": "x = 1"}');
  });

  it('slices JSON out of a prose-wrapped response', () => {
    const proseWrapped =
      'Here is the code:\n' +
      JSON.stringify(codePayload, null, 2) +
      '\nLet me know if you need changes.';
    expect(extractJsonPayload(proseWrapped)).toBe(JSON.stringify(codePayload, null, 2));
  });

  it('slices JSON out of prose wrapping around a fence', () => {
    const proseFenced =
      'Sure, here you go:\n```json\n{"code": "x = 1"}\n```\nHope that helps!';
    expect(extractJsonPayload(proseFenced)).toBe('{"code": "x = 1"}');
  });

  it('returns null for non-JSON garbage', () => {
    expect(extractJsonPayload('def hello(): print("hi")')).toBeNull();
  });

  it('returns null for garbage inside a fence', () => {
    expect(extractJsonPayload('```json\n{not valid json}\n```')).toBeNull();
  });

  it('returns null for empty or whitespace-only text', () => {
    expect(extractJsonPayload('')).toBeNull();
    expect(extractJsonPayload('   \n\t')).toBeNull();
  });
});

// ─── stripOuterCodeFence ────────────────────────────────────────

describe('stripOuterCodeFence', () => {
  it('strips the outer fence from a fenced code value', () => {
    expect(stripOuterCodeFence('```python\nprint(1)\n```')).toBe('print(1)');
  });

  it('returns unfenced code unchanged', () => {
    expect(stripOuterCodeFence('  x = 1\nprint(x)  ')).toBe('  x = 1\nprint(x)  ');
  });

  it('returns empty code unchanged', () => {
    expect(stripOuterCodeFence('')).toBe('');
  });

  it('strips only the outer fence and never rewrites inner fences', () => {
    const nested = '```python\nprint(1)\n```\n```text\nhi\n```';
    expect(stripOuterCodeFence(nested)).toBe('print(1)\n```\n```text\nhi');
  });
});

// ─── AiEngine.generateCode with fenced/prose responses ─────────

describe('AiEngine.generateCode fence-tolerant parsing', () => {
  it('extracts code from fenced JSON with a json language tag', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: fencedJsonResponse,
      usage: { inputTokens: 442, outputTokens: 1183 },
    });

    const engine = new AiEngine(sampleConfig);
    const response = await engine.generateCode({ operationLog: sampleOperationLog });

    expect(response.code).toBe(PYTHON_CODE);
    expect(response.explanation).toContain('example.com');
    expect(response.exceptionHandlers).toHaveLength(1);
    expect(response.warnings).toEqual([]);
    expect(response.warnings).not.toContain('Response was not valid JSON, returned as raw code');
    expect(validateSyntax(response.code).valid).toBe(true);
  });

  it('strips a fence nested inside the code value', async () => {
    const nestedFencedCode = '```python\n' + PYTHON_CODE + '\n```';
    mockGenerateText.mockResolvedValueOnce({
      text:
        '```json\n' +
        JSON.stringify(
          { ...codePayload, code: nestedFencedCode },
          null,
          2,
        ) +
        '\n```',
      usage: { inputTokens: 442, outputTokens: 1183 },
    });

    const engine = new AiEngine(sampleConfig);
    const response = await engine.generateCode({ operationLog: sampleOperationLog });

    expect(response.code).toBe(PYTHON_CODE);
    expect(response.code.includes('`')).toBe(false);
    expect(validateSyntax(response.code).valid).toBe(true);
  });

  it('keeps plain JSON behaviour unchanged', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify(codePayload),
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    const engine = new AiEngine(sampleConfig);
    const response = await engine.generateCode({ operationLog: sampleOperationLog });

    expect(response.code).toBe(PYTHON_CODE);
    expect(response.explanation).toContain('example.com');
    expect(response.warnings).toEqual([]);
  });

  it('parses prose-wrapped JSON', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text:
        'Here is the code:\n' +
        JSON.stringify(codePayload, null, 2) +
        '\nLet me know if you need changes.',
      usage: { inputTokens: 200, outputTokens: 100 },
    });

    const engine = new AiEngine(sampleConfig);
    const response = await engine.generateCode({ operationLog: sampleOperationLog });

    expect(response.code).toBe(PYTHON_CODE);
    expect(response.warnings).toEqual([]);
  });

  it('falls back to raw text with the existing warning for non-JSON garbage', async () => {
    const garbage = 'def hello():\n    print("hi")';
    mockGenerateText.mockResolvedValueOnce({
      text: garbage,
      usage: { inputTokens: 5, outputTokens: 5 },
    });

    const engine = new AiEngine(sampleConfig);
    const response = await engine.generateCode({ operationLog: sampleOperationLog });

    expect(response.code).toBe(garbage);
    expect(response.explanation).toBe('');
    expect(response.warnings).toContain('Response was not valid JSON, returned as raw code');
    expect(response.metadata.tokensUsed).toBe(10);
  });

  it('keeps token accounting unchanged for fenced JSON', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: fencedJsonResponse,
      usage: { inputTokens: 442, outputTokens: 1183 },
    });

    const engine = new AiEngine(sampleConfig);
    const response = await engine.generateCode({ operationLog: sampleOperationLog });

    expect(response.metadata.tokensUsed).toBe(442 + 1183);
  });

  it('still throws TextExtractionError (reasoning-only) for empty content with reasoning', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '',
      reasoningText: 'I should click the submit button first',
      usage: { inputTokens: 500, outputTokens: 0 },
    });

    const engine = new AiEngine(sampleConfig);
    const error: unknown = await engine
      .generateCode({ operationLog: sampleOperationLog })
      .then(() => undefined, (e: unknown) => e);

    expect(error).toBeInstanceOf(TextExtractionError);
    const extractionError = error as TextExtractionError;
    expect(extractionError.kind).toBe('reasoning-only');
    expect(extractionError.reasoning).toBe('I should click the submit button first');
  });
});
