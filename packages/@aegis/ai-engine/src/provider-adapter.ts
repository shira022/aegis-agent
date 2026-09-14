import type { ProviderId } from '@aegis/shared';
import type { LanguageModel } from 'ai';

// ─── SDK Provider Factories ──────────────────────────────────────

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';

// ─── Types ───────────────────────────────────────────────────────

export interface ProviderCredentials {
  apiKey: string;
  baseUrl?: string;
  region?: string;
}

export type ProviderFactory = (credentials: ProviderCredentials, model: string) => LanguageModel;

// ─── Registry ────────────────────────────────────────────────────

const SDK_FACTORIES: Partial<Record<ProviderId, ProviderFactory>> = {
  openai: (c, model) =>
    createOpenAI({ apiKey: c.apiKey, baseURL: c.baseUrl })(model),
  'azure-foundry': (c, model) =>
    createOpenAI({
      apiKey: c.apiKey,
      baseURL: c.baseUrl ?? 'https://your-resource.openai.azure.com/openai/deployments/your-deployment',
    })(model),
  ollama: (c, model) =>
    createOpenAI({
      apiKey: c.apiKey || 'ollama',
      baseURL: c.baseUrl ?? 'http://localhost:11434/v1',
    })(model),
  'lm-studio': (c, model) =>
    createOpenAI({
      apiKey: c.apiKey || 'lm-studio',
      baseURL: c.baseUrl ?? 'http://localhost:1234/v1',
    })(model),
  'openai-compatible': (c, model) => {
    if (!c.baseUrl) throw new Error('baseUrl is required for openai-compatible provider');
    return createOpenAI({ apiKey: c.apiKey, baseURL: c.baseUrl })(model);
  },
  anthropic: (c, model) => createAnthropic({ apiKey: c.apiKey })(model),
  google: (c, model) => createGoogleGenerativeAI({ apiKey: c.apiKey })(model),
  'gcp-vertexai': (c, model) =>
    createGoogleGenerativeAI({
      apiKey: c.apiKey,
      ...(c.region ? { baseURL: `https://${c.region}-aiplatform.googleapis.com/v1beta` } : {}),
    })(model),
  'aws-bedrock': (c, model) =>
    createAmazonBedrock({
      region: c.region ?? 'us-east-1',
    })(model),
};

// ─── Main Adapter ────────────────────────────────────────────────

/**
 * Create a LanguageModel instance for the given provider.
 * Used by AiEngine to call generateText() from Vercel AI SDK.
 */
export function createProviderModel(
  providerId: ProviderId,
  credentials: ProviderCredentials,
  model: string,
): LanguageModel {
  const factory = SDK_FACTORIES[providerId];
  if (!factory) {
    throw new Error(`Unsupported provider: ${providerId}`);
  }
  if (!model.trim()) {
    throw new Error(`model is required for ${providerId} provider`);
  }
  return factory(credentials, model);
}

/**
 * List of providers that support direct API key authentication.
 */
export function requiresApiKey(providerId: ProviderId): boolean {
  return providerId !== 'aws-bedrock';
}
