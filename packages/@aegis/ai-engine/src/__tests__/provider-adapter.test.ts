import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Vercel AI SDK ─────────────────────────────────────────

const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      code: 'print("hello")',
      explanation: 'Test output',
      exceptionHandlers: [],
      warnings: [],
    }),
    usage: { inputTokens: 10, outputTokens: 20 },
  }),
}));

vi.mock('ai', () => ({ generateText: mockGenerateText }));

// Mock SDK provider packages — each returns a factory function
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => (model: string) => ({
    modelId: model,
    provider: 'openai',
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  })),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => (model: string) => ({
    modelId: model,
    provider: 'anthropic',
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  })),
}));

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => (model: string) => ({
    modelId: model,
    provider: 'google',
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  })),
}));

vi.mock('@ai-sdk/amazon-bedrock', () => ({
  createAmazonBedrock: vi.fn(() => (model: string) => ({
    modelId: model,
    provider: 'bedrock',
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  })),
}));

// ─── Tests ───────────────────────────────────────────────────────

import { createProviderModel, requiresApiKey } from '../provider-adapter';
import { AiEngine } from '../generator';
import type { ProviderId } from '@aegis/shared';

describe('Provider Adapter — 9 providers', () => {
  const DUMMY_CREDENTIALS = {
    apiKey: 'test-api-key-xxxxx',
    baseUrl: undefined,
    region: 'us-east-1',
  };

  describe('createProviderModel', () => {
    const providers: Array<{ id: ProviderId; desc: string; credOverrides?: Record<string, string> }> = [
      { id: 'openai', desc: 'OpenAI' },
      { id: 'anthropic', desc: 'Anthropic' },
      { id: 'google', desc: 'Google' },
      { id: 'aws-bedrock', desc: 'AWS Bedrock', credOverrides: { region: 'us-west-2' } },
      { id: 'azure-foundry', desc: 'Azure Foundry', credOverrides: { baseUrl: 'https://my-resource.openai.azure.com/openai/deployments/gpt-4o' } },
      { id: 'gcp-vertexai', desc: 'GCP Vertex AI' },
      { id: 'ollama', desc: 'Ollama (Local)', credOverrides: { baseUrl: 'http://localhost:11434/v1' } },
      { id: 'lm-studio', desc: 'LM Studio (Local)', credOverrides: { baseUrl: 'http://localhost:1234/v1' } },
      { id: 'openai-compatible', desc: 'OpenAI Compatible', credOverrides: { baseUrl: 'https://my-proxy.example.com/v1' } },
    ];

    it.each(providers)('creates model for $id ($desc)', ({ id, credOverrides }) => {
      const creds = { ...DUMMY_CREDENTIALS, ...credOverrides };
      const model = createProviderModel(id, creds);
      expect(model).toBeDefined();
      expect(model).toHaveProperty('modelId');
    });

    it('throws for unknown provider', () => {
      expect(() =>
        createProviderModel('unknown' as ProviderId, DUMMY_CREDENTIALS),
      ).toThrow('Unsupported provider');
    });
  });

  describe('requiresApiKey', () => {
    it('returns true for cloud providers', () => {
      expect(requiresApiKey('openai')).toBe(true);
      expect(requiresApiKey('anthropic')).toBe(true);
      expect(requiresApiKey('google')).toBe(true);
      expect(requiresApiKey('azure-foundry')).toBe(true);
      expect(requiresApiKey('gcp-vertexai')).toBe(true);
    });

    it('returns false for AWS Bedrock (uses IAM)', () => {
      expect(requiresApiKey('aws-bedrock')).toBe(false);
    });

    it('returns true for local providers (optional but present)', () => {
      expect(requiresApiKey('ollama')).toBe(true);
      expect(requiresApiKey('lm-studio')).toBe(true);
      expect(requiresApiKey('openai-compatible')).toBe(true);
    });
  });
});

describe('AiEngine — provider integration (mocked SDK)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify({
        code: 'print("hello world")',
        explanation: 'Simple test output',
        exceptionHandlers: [],
        warnings: [],
      }),
      usage: { inputTokens: 10, outputTokens: 20 },
    });
  });

  const providers: Array<{ id: ProviderId; desc: string; baseUrl?: string }> = [
    { id: 'openai', desc: 'OpenAI' },
    { id: 'anthropic', desc: 'Anthropic' },
    { id: 'google', desc: 'Google' },
    { id: 'aws-bedrock', desc: 'AWS Bedrock' },
    { id: 'azure-foundry', desc: 'Azure Foundry', baseUrl: 'https://test.openai.azure.com/deployments/gpt-4o' },
    { id: 'gcp-vertexai', desc: 'GCP Vertex AI' },
    { id: 'ollama', desc: 'Ollama (Local)', baseUrl: 'http://localhost:11434/v1' },
    { id: 'lm-studio', desc: 'LM Studio (Local)', baseUrl: 'http://localhost:1234/v1' },
    { id: 'openai-compatible', desc: 'OpenAI Compatible', baseUrl: 'https://proxy.example.com/v1' },
  ];

  it.each(providers)('generateCode via $id ($desc)', async ({ id, baseUrl }) => {
    const engine = new AiEngine({
      providerId: id,
      apiKey: id === 'aws-bedrock' ? '' : 'test-key',
      model: 'test-model',
      baseUrl,
    });

    const result = await engine.generateCode({
      operationLog: {
        id: 'op-1',
        taskId: 'task-1',
        source: 'browser',
        steps: [],
        recordedAt: new Date().toISOString(),
      },
    });

    expect(result.code).toBe('print("hello world")');
    expect(result.metadata.tokensUsed).toBe(30);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it.each(providers)('generateExceptions via $id', async ({ id, baseUrl }) => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify([{ condition: 'error', action: 'retry', code: 'pass', riskLevel: 'low' }]),
      usage: { inputTokens: 5, outputTokens: 10 },
    });

    const engine = new AiEngine({
      providerId: id,
      apiKey: id === 'aws-bedrock' ? '' : 'test-key',
      model: 'test-model',
      baseUrl,
    });

    const exceptions = await engine.generateExceptions({
      id: 'op-1',
      taskId: 'task-1',
      source: 'browser',
      steps: [],
      recordedAt: new Date().toISOString(),
    });

    expect(exceptions).toHaveLength(1);
    expect(exceptions[0].condition).toBe('error');
  });

  it.each(providers)('suggestHealing via $id', async ({ id, baseUrl }) => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'Add try/except around the operation',
      usage: { inputTokens: 5, outputTokens: 5 },
    });

    const engine = new AiEngine({
      providerId: id,
      apiKey: id === 'aws-bedrock' ? '' : 'test-key',
      model: 'test-model',
      baseUrl,
    });

    const suggestion = await engine.suggestHealing('IndexError', 'print(arr[0])');
    expect(suggestion).toBe('Add try/except around the operation');
  });

  it('handles non-JSON AI response gracefully', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'def hello(): print("hi")',
      usage: { inputTokens: 5, outputTokens: 5 },
    });

    const engine = new AiEngine({
      providerId: 'openai',
      apiKey: 'test-key',
      model: 'test-model',
    });

    const result = await engine.generateCode({
      operationLog: {
        id: 'op-1',
        taskId: 'task-1',
        source: 'browser',
        steps: [],
        recordedAt: new Date().toISOString(),
      },
    });

    expect(result.code).toBe('def hello(): print("hi")');
    expect(result.warnings).toContain('Response was not valid JSON, returned as raw code');
  });
});
