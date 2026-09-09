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

export type ProviderFactory = (credentials: ProviderCredentials) => LanguageModel;

// ─── Registry ────────────────────────────────────────────────────

const SDK_FACTORIES: Partial<Record<ProviderId, ProviderFactory>> = {
  openai: (c) =>
    createOpenAI({ apiKey: c.apiKey, baseURL: c.baseUrl })(
      'gpt-4o',
    ),
  'azure-foundry': (c) =>
    createOpenAI({
      apiKey: c.apiKey,
      baseURL: c.baseUrl ?? 'https://your-resource.openai.azure.com/openai/deployments/your-deployment',
    })('gpt-4o'),
  ollama: (c) =>
    createOpenAI({
      apiKey: c.apiKey || 'ollama',
      baseURL: c.baseUrl ?? 'http://localhost:11434/v1',
    })('llama3.1'),
  'lm-studio': (c) =>
    createOpenAI({
      apiKey: c.apiKey || 'lm-studio',
      baseURL: c.baseUrl ?? 'http://localhost:1234/v1',
    })('default'),
  'openai-compatible': (c) => {
    if (!c.baseUrl) throw new Error('baseUrl is required for openai-compatible provider');
    return createOpenAI({ apiKey: c.apiKey, baseURL: c.baseUrl })('gpt-4o');
  },
  anthropic: (c) =>
    createAnthropic({ apiKey: c.apiKey })('claude-sonnet-4-20250514'),
  google: (c) =>
    createGoogleGenerativeAI({ apiKey: c.apiKey })('gemini-2.5-flash'),
  'gcp-vertexai': (c) =>
    createGoogleGenerativeAI({
      apiKey: c.apiKey,
      ...(c.region ? { baseURL: `https://${c.region}-aiplatform.googleapis.com/v1beta` } : {}),
    })('gemini-2.5-flash'),
  'aws-bedrock': (c) =>
    createAmazonBedrock({
      region: c.region ?? 'us-east-1',
    })('anthropic.claude-sonnet-4-20250514-v1:0'),
};

// ─── Main Adapter ────────────────────────────────────────────────

/**
 * Create a LanguageModel instance for the given provider.
 * Used by AiEngine to call generateText() from Vercel AI SDK.
 */
export function createProviderModel(
  providerId: ProviderId,
  credentials: ProviderCredentials,
): LanguageModel {
  const factory = SDK_FACTORIES[providerId];
  if (!factory) {
    throw new Error(`Unsupported provider: ${providerId}`);
  }
  return factory(credentials);
}

/**
 * List of providers that support direct API key authentication.
 */
export function requiresApiKey(providerId: ProviderId): boolean {
  return providerId !== 'aws-bedrock';
}
