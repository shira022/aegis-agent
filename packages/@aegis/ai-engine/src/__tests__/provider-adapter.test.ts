import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Vercel AI SDK ─────────────────────────────────────────

const { mockGenerateText, mockWrapLanguageModel, mockDefaultSettingsMiddleware } = vi.hoisted(() => ({
  mockGenerateText: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      code: 'print("hello")',
      explanation: 'Test output',
      exceptionHandlers: [],
      warnings: [],
    }),
    usage: { inputTokens: 10, outputTokens: 20 },
  }),
  // Identity pass-through: the wrapper returns the model it was given.
  mockWrapLanguageModel: vi.fn(({ model }: { model: unknown }) => model),
  mockDefaultSettingsMiddleware: vi.fn(
    ({ settings }: { settings: unknown }) => ({ settings }),
  ),
}));

vi.mock('ai', () => ({
  generateText: mockGenerateText,
  wrapLanguageModel: mockWrapLanguageModel,
  defaultSettingsMiddleware: mockDefaultSettingsMiddleware,
}));

// Mock SDK provider packages — each returns a factory function
vi.mock('@ai-sdk/openai', () => {
  type MockModel = {
    modelId: string;
    provider: string;
    doGenerate: ReturnType<typeof vi.fn>;
    doStream: ReturnType<typeof vi.fn>;
  };
  type MockOpenAIProvider = ((model: string) => MockModel) & {
    chat: (model: string) => MockModel;
  };

  // The bare call defaults to the Responses API; `.chat(model)` selects
  // the Chat Completions model the local/compatible providers use.
  const createOpenAIMock = vi.fn((): MockOpenAIProvider => {
    const responses = (model: string): MockModel => ({
      modelId: model,
      provider: 'openai.responses',
      doGenerate: vi.fn(),
      doStream: vi.fn(),
    });
    responses.chat = (model: string): MockModel => ({
      modelId: model,
      provider: 'openai.chat',
      doGenerate: vi.fn(),
      doStream: vi.fn(),
    });
    return responses;
  });

  return { createOpenAI: createOpenAIMock };
});

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
import { PROVIDER_REGISTRY } from '@aegis/shared';
import type { ProviderId } from '@aegis/shared';

const TEST_MODEL = 'test-model';

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
      { id: 'azure-foundry', desc: 'Azure Foundry', credOverrides: { baseUrl: 'https://my-resource.openai.azure.com/openai/deployments/my-deployment' } },
      { id: 'gcp-vertexai', desc: 'GCP Vertex AI' },
      { id: 'ollama', desc: 'Ollama (Local)', credOverrides: { baseUrl: 'http://localhost:11434/v1' } },
      { id: 'lm-studio', desc: 'LM Studio (Local)', credOverrides: { baseUrl: 'http://localhost:1234/v1' } },
      { id: 'openai-compatible', desc: 'OpenAI Compatible', credOverrides: { baseUrl: 'https://my-proxy.example.com/v1' } },
    ];

    it.each(providers)('creates model for $id ($desc)', ({ id, credOverrides }) => {
      const creds = { ...DUMMY_CREDENTIALS, ...credOverrides };
      const model = createProviderModel(id, creds, TEST_MODEL);
      expect(model).toBeDefined();
      expect(model).toHaveProperty('modelId', TEST_MODEL);
    });

    it('throws for unknown provider', () => {
      expect(() =>
        createProviderModel('unknown' as ProviderId, DUMMY_CREDENTIALS, TEST_MODEL),
      ).toThrow('Unsupported provider');
    });

    it('throws when the model is empty', () => {
      expect(() =>
        createProviderModel('openai', DUMMY_CREDENTIALS, ''),
      ).toThrow('model is required');
    });

    it('throws when the model is only whitespace', () => {
      expect(() =>
        createProviderModel('openai', DUMMY_CREDENTIALS, '   '),
      ).toThrow('model is required');
    });
  });

  describe('createProviderModel — disable thinking (ADR-009(d))', () => {
    const registryIds = Object.keys(PROVIDER_REGISTRY) as ProviderId[];
    const thinkingCapable = registryIds
      .filter((id) => PROVIDER_REGISTRY[id].supportsThinkingToggle)
      .map((id) => ({ id }));
    const thinkingIncapable = registryIds
      .filter((id) => !PROVIDER_REGISTRY[id].supportsThinkingToggle)
      .map((id) => ({ id }));
    const localCreds = { ...DUMMY_CREDENTIALS, baseUrl: 'http://localhost:11434/v1' };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('targets exactly the providers whose registry entry has the capability', () => {
      expect(thinkingCapable.map((entry) => entry.id)).toEqual([
        'ollama',
        'lm-studio',
        'openai-compatible',
      ]);
      expect(thinkingIncapable).toHaveLength(6);
    });

    it.each(thinkingCapable)(
      'wraps $id with a reasoningEffort none default when disableThinking is set',
      ({ id }) => {
        const model = createProviderModel(id, localCreds, TEST_MODEL, {
          disableThinking: true,
        });
        expect(mockDefaultSettingsMiddleware).toHaveBeenCalledTimes(1);
        expect(mockDefaultSettingsMiddleware).toHaveBeenCalledWith({
          settings: { providerOptions: { openai: { reasoningEffort: 'none' } } },
        });
        expect(mockWrapLanguageModel).toHaveBeenCalledTimes(1);
        expect(model).toBeDefined();
      },
    );

    it.each(thinkingIncapable)(
      'returns the raw model for $id even when disableThinking is set',
      ({ id }) => {
        const model = createProviderModel(id, localCreds, TEST_MODEL, {
          disableThinking: true,
        });
        expect(mockDefaultSettingsMiddleware).not.toHaveBeenCalled();
        expect(mockWrapLanguageModel).not.toHaveBeenCalled();
        expect(model).toHaveProperty('modelId', TEST_MODEL);
      },
    );

    it('returns the raw model when disableThinking is not set', () => {
      const model = createProviderModel('ollama', localCreds, TEST_MODEL);
      expect(mockDefaultSettingsMiddleware).not.toHaveBeenCalled();
      expect(mockWrapLanguageModel).not.toHaveBeenCalled();
      expect(model).toHaveProperty('modelId', TEST_MODEL);
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
      model: TEST_MODEL,
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
      model: TEST_MODEL,
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
      model: TEST_MODEL,
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
      model: TEST_MODEL,
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
