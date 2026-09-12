import { describe, it, expect } from 'vitest';
import {
  PROVIDER_REGISTRY,
  type ProviderId,
  type ProviderSettings,
} from '../provider';

describe('PROVIDER_REGISTRY', () => {
  const providerIds: ProviderId[] = [
    'openai', 'anthropic', 'google', 'aws-bedrock', 'azure-foundry',
    'gcp-vertexai', 'ollama', 'lm-studio', 'openai-compatible',
  ];

  it('contains all 9 providers', () => {
    const keys = Object.keys(PROVIDER_REGISTRY) as ProviderId[];
    expect(keys).toHaveLength(9);
    for (const id of providerIds) {
      expect(keys).toContain(id);
    }
  });

  it('has correct display names', () => {
    expect(PROVIDER_REGISTRY.openai.displayName).toBe('OpenAI');
    expect(PROVIDER_REGISTRY.anthropic.displayName).toBe('Anthropic');
    expect(PROVIDER_REGISTRY.google.displayName).toBe('Google');
    expect(PROVIDER_REGISTRY['aws-bedrock'].displayName).toBe('AWS Bedrock');
    expect(PROVIDER_REGISTRY['azure-foundry'].displayName).toBe('Azure Foundry');
    expect(PROVIDER_REGISTRY['gcp-vertexai'].displayName).toBe('Google Cloud (Vertex AI)');
    expect(PROVIDER_REGISTRY.ollama.displayName).toBe('Ollama (Local)');
    expect(PROVIDER_REGISTRY['lm-studio'].displayName).toBe('LM Studio (Local)');
    expect(PROVIDER_REGISTRY['openai-compatible'].displayName).toBe('Custom (OpenAI Compatible)');
  });

  it('has correct category assignments', () => {
    const cloudProviders: ProviderId[] = ['openai', 'anthropic', 'google', 'aws-bedrock', 'azure-foundry', 'gcp-vertexai'];
    const localProviders: ProviderId[] = ['ollama', 'lm-studio'];
    const compatibleProviders: ProviderId[] = ['openai-compatible'];

    for (const id of cloudProviders) {
      expect(PROVIDER_REGISTRY[id].category).toBe('cloud');
    }
    for (const id of localProviders) {
      expect(PROVIDER_REGISTRY[id].category).toBe('local');
    }
    for (const id of compatibleProviders) {
      expect(PROVIDER_REGISTRY[id].category).toBe('compatible');
    }
  });

  it('has correct region requirements', () => {
    expect(PROVIDER_REGISTRY.openai.requiresRegion).toBe(false);
    expect(PROVIDER_REGISTRY.anthropic.requiresRegion).toBe(false);
    expect(PROVIDER_REGISTRY.google.requiresRegion).toBe(false);
    expect(PROVIDER_REGISTRY['aws-bedrock'].requiresRegion).toBe(true);
    expect(PROVIDER_REGISTRY['azure-foundry'].requiresRegion).toBe(true);
    expect(PROVIDER_REGISTRY['gcp-vertexai'].requiresRegion).toBe(true);
    expect(PROVIDER_REGISTRY.ollama.requiresRegion).toBe(false);
    expect(PROVIDER_REGISTRY['lm-studio'].requiresRegion).toBe(false);
    expect(PROVIDER_REGISTRY['openai-compatible'].requiresRegion).toBe(false);
  });

  it('has correct project ID requirements', () => {
    expect(PROVIDER_REGISTRY.openai.requiresProjectId).toBe(false);
    expect(PROVIDER_REGISTRY.anthropic.requiresProjectId).toBe(false);
    expect(PROVIDER_REGISTRY.google.requiresProjectId).toBe(false);
    expect(PROVIDER_REGISTRY['aws-bedrock'].requiresProjectId).toBe(false);
    expect(PROVIDER_REGISTRY['azure-foundry'].requiresProjectId).toBe(false);
    expect(PROVIDER_REGISTRY['gcp-vertexai'].requiresProjectId).toBe(true);
    expect(PROVIDER_REGISTRY.ollama.requiresProjectId).toBe(false);
    expect(PROVIDER_REGISTRY['lm-studio'].requiresProjectId).toBe(false);
    expect(PROVIDER_REGISTRY['openai-compatible'].requiresProjectId).toBe(false);
  });

  it('has correct default models', () => {
    expect(PROVIDER_REGISTRY.openai.defaultModel).toBe('gpt-4o');
    expect(PROVIDER_REGISTRY.anthropic.defaultModel).toBe('claude-sonnet-4-20250514');
    expect(PROVIDER_REGISTRY.google.defaultModel).toBe('gemini-2.5-flash');
    expect(PROVIDER_REGISTRY['aws-bedrock'].defaultModel).toBe('anthropic.claude-sonnet-4-20250514');
    expect(PROVIDER_REGISTRY['azure-foundry'].defaultModel).toBe('gpt-4o');
    expect(PROVIDER_REGISTRY['gcp-vertexai'].defaultModel).toBe('gemini-2.5-flash');
    expect(PROVIDER_REGISTRY.ollama.defaultModel).toBe('llama3.1');
  });

  it('each provider has at least one available model', () => {
    for (const id of providerIds) {
      const config = PROVIDER_REGISTRY[id];
      expect(config.availableModels).toBeDefined();
      expect(Array.isArray(config.availableModels)).toBe(true);
      expect(config.availableModels.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('each provider config id matches its registry key', () => {
    for (const id of providerIds) {
      expect(PROVIDER_REGISTRY[id].id).toBe(id);
    }
  });
});

describe('ProviderSettings type', () => {
  it('can be constructed with required fields only', () => {
    const settings: ProviderSettings = {
      providerId: 'openai',
      apiKey: 'test-key',
    };
    expect(settings.providerId).toBe('openai');
    expect(settings.model).toBeUndefined();
    expect(settings.region).toBeUndefined();
    expect(settings.projectId).toBeUndefined();
    expect(settings.baseUrl).toBeUndefined();
  });

  it('can be constructed with all optional fields', () => {
    const settings: ProviderSettings = {
      providerId: 'gcp-vertexai',
      apiKey: 'test-key',
      model: 'gemini-2.5-pro',
      region: 'us-central1',
      projectId: 'my-project',
    };
    expect(settings.region).toBe('us-central1');
    expect(settings.projectId).toBe('my-project');
  });

  it('can include baseUrl for local/compatible providers', () => {
    const settings: ProviderSettings = {
      providerId: 'ollama',
      apiKey: '',
      baseUrl: 'http://localhost:11434/v1',
    };
    expect(settings.baseUrl).toBe('http://localhost:11434/v1');
  });
});
