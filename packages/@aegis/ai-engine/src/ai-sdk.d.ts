// Type stubs for Vercel AI SDK — actual types resolve after pnpm install
// Remove this file once `ai`, `@ai-sdk/openai`, etc. are installed

declare module 'ai' {
  export function generateText(options: {
    model: LanguageModelV1;
    system?: string;
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    abortSignal?: AbortSignal;
  }): Promise<{
    text: string;
    usage: { promptTokens: number; completionTokens: number };
  }>;

  export type LanguageModelV1 = {
    modelId: string;
    provider: string;
  };
}

declare module '@ai-sdk/openai' {
  export function createOpenAI(options?: {
    apiKey?: string;
    baseURL?: string;
  }): {
    (modelId: string): { modelId: string; provider: string };
    chat(modelId: string): { modelId: string; provider: string };
  };
}

declare module '@ai-sdk/anthropic' {
  export function createAnthropic(options?: {
    apiKey?: string;
    baseURL?: string;
  }): {
    (modelId: string): { modelId: string; provider: string };
  };
}

declare module '@ai-sdk/google' {
  export function createGoogleGenerativeAI(options?: {
    apiKey?: string;
    location?: string;
  }): {
    (modelId: string): { modelId: string; provider: string };
  };
}

declare module '@ai-sdk/amazon-bedrock' {
  export function createAmazonBedrock(options?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    region?: string;
  }): {
    (modelId: string): { modelId: string; provider: string };
  };
}
