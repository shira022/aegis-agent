// ─── Provider ID ────────────────────────────────────────────────────

export type ProviderCategory = 'cloud' | 'local' | 'compatible';

export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'aws-bedrock'
  | 'azure-foundry'
  | 'gcp-vertexai'
  | 'ollama'
  | 'lm-studio'
  | 'openai-compatible';

// ─── Provider Config ────────────────────────────────────────────────

export interface ProviderConfig {
  id: ProviderId;
  displayName: string;
  category: ProviderCategory;
  requiresRegion: boolean;
  requiresProjectId: boolean;
  defaultModel: string;
  availableModels: string[];
}

// ─── Provider Settings (user config) ────────────────────────────────

export interface ProviderSettings {
  providerId: ProviderId;
  apiKey: string;
  model?: string;
  region?: string;
  projectId?: string;
  baseUrl?: string; // for ollama, lm-studio, openai-compatible
}

// ─── Provider Registry ──────────────────────────────────────────────

export const PROVIDER_REGISTRY: Record<ProviderId, ProviderConfig> = {
  openai: {
    id: 'openai',
    displayName: 'OpenAI',
    category: 'cloud',
    requiresRegion: false,
    requiresProjectId: false,
    defaultModel: 'gpt-4o',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'o3', 'o4-mini'],
  },
  anthropic: {
    id: 'anthropic',
    displayName: 'Anthropic',
    category: 'cloud',
    requiresRegion: false,
    requiresProjectId: false,
    defaultModel: 'claude-sonnet-4-20250514',
    availableModels: [
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
    ],
  },
  google: {
    id: 'google',
    displayName: 'Google',
    category: 'cloud',
    requiresRegion: false,
    requiresProjectId: false,
    defaultModel: 'gemini-2.5-flash',
    availableModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  },
  'aws-bedrock': {
    id: 'aws-bedrock',
    displayName: 'AWS Bedrock',
    category: 'cloud',
    requiresRegion: true,
    requiresProjectId: false,
    defaultModel: 'anthropic.claude-sonnet-4-20250514',
    availableModels: [
      'anthropic.claude-sonnet-4-20250514',
      'anthropic.claude-3-5-sonnet-20241022',
      'meta.llama3-1-40b-instruct',
    ],
  },
  'azure-foundry': {
    id: 'azure-foundry',
    displayName: 'Azure Foundry',
    category: 'cloud',
    requiresRegion: true,
    requiresProjectId: false,
    defaultModel: 'gpt-4o',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'o3', 'o4-mini'],
  },
  'gcp-vertexai': {
    id: 'gcp-vertexai',
    displayName: 'Google Cloud (Vertex AI)',
    category: 'cloud',
    requiresRegion: true,
    requiresProjectId: true,
    defaultModel: 'gemini-2.5-flash',
    availableModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  },
  ollama: {
    id: 'ollama',
    displayName: 'Ollama (Local)',
    category: 'local',
    requiresRegion: false,
    requiresProjectId: false,
    defaultModel: 'llama3.1',
    availableModels: ['llama3.1', 'mistral', 'codellama', 'qwen2.5', 'gemma2'],
  },
  'lm-studio': {
    id: 'lm-studio',
    displayName: 'LM Studio (Local)',
    category: 'local',
    requiresRegion: false,
    requiresProjectId: false,
    defaultModel: 'local-model',
    availableModels: ['local-model'],
  },
  'openai-compatible': {
    id: 'openai-compatible',
    displayName: 'Custom (OpenAI Compatible)',
    category: 'compatible',
    requiresRegion: false,
    requiresProjectId: false,
    defaultModel: 'custom-model',
    availableModels: ['custom-model'],
  },
};
