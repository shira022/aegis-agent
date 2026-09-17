import type { ProviderId } from '@aegis/shared';
import { PROVIDER_REGISTRY } from '@aegis/shared';
import type { LanguageModel } from 'ai';
import { wrapLanguageModel, defaultSettingsMiddleware } from 'ai';

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

/** Per-model options resolved from user settings (ADR-009(d)). */
export interface ProviderModelOptions {
  /** Ask the provider to skip the model's reasoning/thinking phase. */
  disableThinking?: boolean;
}

/** The concrete model interface `wrapLanguageModel` accepts. The `ai`
 * package re-exports only the version union `LanguageModel`, not the V3
 * interface itself, so it is extracted from the wrapper's signature. */
type SdkLanguageModel = Parameters<typeof wrapLanguageModel>[0]['model'];

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
  // Local/compatible servers speak the Chat Completions contract
  // (`POST {base}/chat/completions`), not OpenAI's Responses API, which a
  // bare `createOpenAI(...)(model)` call defaults to in this SDK version.
  // `.chat(model)` is also what makes the verified `reasoning_effort:
  // "none"` toggle reachable for these providers (ADR-009(d)).
  ollama: (c, model) =>
    createOpenAI({
      apiKey: c.apiKey || 'ollama',
      baseURL: c.baseUrl ?? 'http://localhost:11434/v1',
    }).chat(model),
  'lm-studio': (c, model) =>
    createOpenAI({
      apiKey: c.apiKey || 'lm-studio',
      baseURL: c.baseUrl ?? 'http://localhost:1234/v1',
    }).chat(model),
  'openai-compatible': (c, model) => {
    if (!c.baseUrl) throw new Error('baseUrl is required for openai-compatible provider');
    return createOpenAI({ apiKey: c.apiKey, baseURL: c.baseUrl }).chat(model);
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
  options: ProviderModelOptions = {},
): LanguageModel {
  const factory = SDK_FACTORIES[providerId];
  if (!factory) {
    throw new Error(`Unsupported provider: ${providerId}`);
  }
  if (!model.trim()) {
    throw new Error(`model is required for ${providerId} provider`);
  }
  const languageModel = factory(credentials, model);
  if (options.disableThinking && PROVIDER_REGISTRY[providerId].supportsThinkingToggle) {
    return wrapLanguageModel({
      // The capability flag is only true for the createOpenAI-based
      // providers, whose models are LanguageModelV3 (Bedrock still
      // speaks V2 and never reaches this branch).
      model: languageModel as SdkLanguageModel,
      middleware: defaultSettingsMiddleware({
        settings: {
          // Verified against an OpenAI-compatible Ollama endpoint
          // (2026-09-15): `reasoning_effort: "none"` is the switch that
          // moves the answer into `content` instead of a reasoning field.
          providerOptions: { openai: { reasoningEffort: 'none' } },
        },
      }),
    });
  }
  return languageModel;
}

/**
 * List of providers that support direct API key authentication.
 */
export function requiresApiKey(providerId: ProviderId): boolean {
  return providerId !== 'aws-bedrock';
}
